import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common'
import Redis from 'ioredis'
import { prisma } from '../../database/prisma'
import { parseRedisUrl } from '../../redis-connection'
import { resolveAccessibleVenueIds, type VenueScope } from '../auth/venue-scope'
import { SquareService } from '../integrations/square/square.service'
import { SquareCogsService } from '../integrations/square/square-cogs.service'
import {
  aggregateVenueSummaries,
  buildVenueSummary,
  composeDayFigures,
  type DayFigures,
  type GroupDailySummary,
  type VenueDailySummary,
} from './daily-summary.compute'
import { venueDayWindow } from './venue-day'

const CACHE_TTL_SECONDS = 30 * 60

type VenueRow = {
  id: string
  name: string
  timezone: string
  squareLocationId: string | null
}

@Injectable()
export class DailySummaryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailySummaryService.name)
  private redis: Redis | undefined

  constructor(
    private readonly square: SquareService,
    private readonly cogs: SquareCogsService,
  ) {}

  onModuleInit(): void {
    // Dedicated cache client (same rationale as ChatStartersService): keep cache
    // GETs off BullMQ's heavily-multiplexed connection. Prod refuses to silently
    // fall back to localhost; dev defaults for ergonomics.
    const url = process.env.REDIS_URL
    if (!url && process.env.NODE_ENV === 'production') {
      throw new Error('REDIS_URL is not set — daily-summary cache cannot start')
    }
    this.redis = new Redis({
      ...parseRedisUrl(url ?? 'redis://127.0.0.1:6379'),
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })
    this.redis.on('error', (err) => {
      this.logger.warn(JSON.stringify({ event: 'daily_summary.redis_error', message: err.message }))
    })
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined)
  }

  /// Settled-day summary for one venue (default: venue-local yesterday). Throws
  /// NotFoundException for a venue outside the caller's org — the controller
  /// surfaces the 404 so a cross-org probe can't be told apart from "no data".
  async getForVenue(orgId: string, venueId: string): Promise<VenueDailySummary> {
    const venue = await prisma.venue.findFirst({
      where: { id: venueId, organizationId: orgId },
      select: { id: true, name: true, timezone: true, squareLocationId: true },
    })
    if (!venue) throw new NotFoundException('venue-not-found')
    return this.computeVenue(orgId, venue)
  }

  /// Per-venue summaries across the caller's accessible venues, plus a
  /// sales-weighted group roll-up. Owners see every venue; scoped members see
  /// only theirs.
  async getGroup(orgId: string, scope: VenueScope): Promise<GroupDailySummary> {
    const venues = await prisma.venue.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, timezone: true, squareLocationId: true },
      orderBy: { name: 'asc' },
    })
    const accessible = new Set(
      resolveAccessibleVenueIds(
        scope,
        venues.map((v) => v.id),
      ),
    )
    const scoped = venues.filter((v) => accessible.has(v.id))
    const summaries = await Promise.all(scoped.map((v) => this.computeVenue(orgId, v)))
    // Fallback date only used when there are no scoped venues to date the empty
    // group from — anchor it to any org venue's tz rather than a fixed zone.
    const fallbackTz = venues[0]?.timezone ?? 'Europe/London'
    return aggregateVenueSummaries(summaries, venueDayWindow(fallbackTz, 1).date)
  }

  private async computeVenue(orgId: string, venue: VenueRow): Promise<VenueDailySummary> {
    const today = venueDayWindow(venue.timezone, 1)
    const prior = venueDayWindow(venue.timezone, 2)
    // Both windows are settled/immutable days, so both are cacheable. Fetch them
    // together to halve latency on a cold venue.
    const [current, prev] = await Promise.all([
      this.cachedFigures(orgId, venue.id, today),
      this.cachedFigures(orgId, venue.id, prior),
    ])
    return buildVenueSummary(venue, today.date, current, prev)
  }

  private async cachedFigures(
    orgId: string,
    venueId: string,
    window: { fromIso: string; toIso: string; date: string },
  ): Promise<DayFigures> {
    const cached = await this.readCache(orgId, venueId, window.date)
    if (cached) return cached
    const fresh = await this.figures(orgId, venueId, window.fromIso, window.toIso)
    // Only persist genuine, connected figures. A non-ok COGS result also covers
    // transient Square failures (rate-limit / timeout / 5xx); caching that would
    // freeze a healthy venue into a false "Connect Square" state for the full
    // TTL. An unconnected venue re-resolves cheaply (resolveForVenue fails fast).
    if (fresh.connected) await this.writeCache(orgId, venueId, window.date, fresh)
    return fresh
  }

  /// The Square round: COGS summary (net/gross/cogs/gp% in one call) + labour
  /// cost + ticket count for one window.
  private async figures(
    orgId: string,
    venueId: string,
    fromIso: string,
    toIso: string,
  ): Promise<DayFigures> {
    const cogs = await this.cogs.getCogsSummary(orgId, { venueId, fromIso, toIso })
    if (!cogs.ok)
      return composeDayFigures(
        cogs,
        { ok: false, reason: cogs.reason },
        { ok: false, reason: cogs.reason },
      )
    const [labour, payments] = await Promise.all([
      this.square.getLaborSummary(orgId, { venueId, fromIso, toIso }),
      this.square.getPaymentBreakdown(orgId, { venueId, fromIso, toIso }),
    ])
    return composeDayFigures(cogs, labour, payments)
  }

  private keyFor(orgId: string, venueId: string, date: string): string {
    return `daily:summary:${orgId}:${venueId}:${date}`
  }

  private async readCache(
    orgId: string,
    venueId: string,
    date: string,
  ): Promise<DayFigures | null> {
    if (!this.redis) return null
    const raw = await this.redis.get(this.keyFor(orgId, venueId, date)).catch(() => null)
    if (!raw) return null
    try {
      return JSON.parse(raw) as DayFigures
    } catch {
      return null
    }
  }

  private async writeCache(
    orgId: string,
    venueId: string,
    date: string,
    figures: DayFigures,
  ): Promise<void> {
    if (!this.redis) return
    await this.redis
      .set(this.keyFor(orgId, venueId, date), JSON.stringify(figures), 'EX', CACHE_TTL_SECONDS)
      .catch(() => undefined)
  }
}
