import { Injectable, Logger } from '@nestjs/common'
import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '../../database/prisma'

/// Subset of PrismaClient the service touches — declared as a type so the unit
/// test can pass an in-memory fake without dragging in `pg` or a live DB.
export type MetricsPrisma = Pick<PrismaClient, 'searchAnalytics' | 'metricsConfig'>

/// Hard-coded fallbacks used when an org has no metrics_config row (should
/// only happen for orgs created in the gap between this migration shipping
/// and the OrgService gaining a "create default row" hook). Keep these in
/// sync with the prisma schema defaults — they encode the same spec baseline
/// of 4.2 minutes / £25 per hour.
export const DEFAULT_MINUTES_PER_QUERY = 4.2
export const DEFAULT_HOURLY_RATE_CENTS = 2500

/// SearchAnalytics outcomes that count as "AI saved the manager time". A
/// `no-data` row means we didn't actually answer them; an `error` row means
/// the call faulted before producing anything. Both are surfaced as gaps in
/// other dashboards — counting them as "hours recovered" would inflate the
/// headline.
const COUNTABLE_OUTCOMES = ['hit'] as const

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export type HoursRecoveredOpts = {
  venueId?: string
  from: Date
  to: Date
}

export type HoursRecoveredResult = {
  queriesCount: number
  minutesSaved: number
  hoursSaved: number
  valueGbpCents: number
  range: { from: Date; to: Date }
  scope: { organizationId: string; venueId: string | null }
  baseline: { minutesPerQuery: number; hourlyRateCents: number }
}

@Injectable()
export class HoursRecoveredService {
  private readonly logger = new Logger(HoursRecoveredService.name)
  // Nest DI: no constructor args — Prisma is a module-level singleton, not a
  // Nest provider, and `MetricsPrisma` is a TS-only type the container can't
  // resolve. Tests inject a fake via `withPrismaForTest`.
  private db: MetricsPrisma = defaultPrisma

  static withPrismaForTest(db: MetricsPrisma): HoursRecoveredService {
    const svc = new HoursRecoveredService()
    svc.db = db
    return svc
  }

  /// Convert successful find_knowledge query volume into management hours
  /// saved and £ value. Always returns numbers (zeros for empty ranges) —
  /// callers shouldn't have to special-case "no data yet".
  async compute(orgId: string, opts: HoursRecoveredOpts): Promise<HoursRecoveredResult> {
    const { minutesPerQuery, hourlyRateCents } = await this.loadBaseline(orgId)

    const where: Prisma.SearchAnalyticsWhereInput = {
      organizationId: orgId,
      outcome: { in: [...COUNTABLE_OUTCOMES] },
      createdAt: { gte: opts.from, lt: opts.to },
    }
    if (opts.venueId) where.venueId = opts.venueId

    const queriesCount = await this.db.searchAnalytics.count({ where })

    // Integer math on the £ side: minutes × rate is float (rate-per-minute is
    // fractional), but rounding cents at the end avoids fractional pennies
    // bleeding into clients that store this as an integer.
    const minutesSaved = queriesCount * minutesPerQuery
    const hoursSaved = minutesSaved / 60
    const valueGbpCents = Math.round((minutesSaved / 60) * hourlyRateCents)

    return {
      queriesCount,
      minutesSaved,
      hoursSaved,
      valueGbpCents,
      range: { from: opts.from, to: opts.to },
      scope: { organizationId: orgId, venueId: opts.venueId ?? null },
      baseline: { minutesPerQuery, hourlyRateCents },
    }
  }

  /// Default range when the controller didn't get explicit from/to — the
  /// "this week" headline copy in the spec.
  static defaultRange(now: Date = new Date()): { from: Date; to: Date } {
    return { from: new Date(now.getTime() - SEVEN_DAYS_MS), to: now }
  }

  private async loadBaseline(
    orgId: string,
  ): Promise<{ minutesPerQuery: number; hourlyRateCents: number }> {
    const config = await this.db.metricsConfig.findUnique({
      where: { organizationId: orgId },
      select: { hoursRecoveredMinutesPerQuery: true, hoursRecoveredHourlyRateCents: true },
    })
    if (!config) {
      // Backfill migration creates rows for every existing org. A missing row
      // means the org was created after the migration ran but before we wired
      // OrgService to seed defaults — log once so we notice the gap, but keep
      // serving the spec defaults rather than 500ing the dashboard.
      this.logger.warn(
        JSON.stringify({
          event: 'metrics.missing_config',
          orgId,
        }),
      )
      return {
        minutesPerQuery: DEFAULT_MINUTES_PER_QUERY,
        hourlyRateCents: DEFAULT_HOURLY_RATE_CENTS,
      }
    }
    return {
      // Prisma Decimal → number. Decimal(6,2) maxes at 9999.99 so float is
      // lossless within the supported range.
      minutesPerQuery: Number(config.hoursRecoveredMinutesPerQuery),
      hourlyRateCents: config.hoursRecoveredHourlyRateCents,
    }
  }
}
