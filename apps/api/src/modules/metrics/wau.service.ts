import { ForbiddenException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'

export type WauBucket = {
  weekStart: string
  weekEnd: string
  activeUsers: number
  messageCount: number
}

type RawRow = {
  week_start: Date
  active_users: bigint
  message_count: bigint
}

@Injectable()
export class WauService {
  /// Distinct ChatConversation.userId per venue per ISO week (Monday-anchored,
  /// in the venue's local timezone). Returns `weeks` buckets ending at the
  /// current ISO week, ascending oldest-first, with zero-filled gaps so charts
  /// aren't sparse. Excludes legacy WhatsApp threads where userId IS NULL and
  /// soft-deleted conversations.
  async getVenueWau(
    orgId: string,
    venueId: string,
    opts: { weeks?: number } = {},
  ): Promise<WauBucket[]> {
    const weeks = opts.weeks ?? 12

    // Org-scope check: a venueId from another org must not leak metrics. The
    // raw SQL below joins on venueId only — without this guard a caller could
    // probe any venue's activity by id.
    const venue = await prisma.venue.findFirst({
      where: { id: venueId, organizationId: orgId },
      select: { id: true, timezone: true },
    })
    if (!venue) {
      throw new ForbiddenException('venue-not-in-org')
    }

    // Lower bound: `weeks` ISO weeks back from "now" anchored in the venue tz.
    // We pad by one extra week on the SQL side so an edge-of-week boundary
    // doesn't drop the current week's partial data from the result set.
    const sinceUtc = isoWeekStartUtc(new Date(), venue.timezone, weeks - 1)

    const rows = await prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT
        date_trunc('week', m."createdAt" AT TIME ZONE ${venue.timezone}) AS week_start,
        COUNT(DISTINCT c."userId") AS active_users,
        COUNT(m.id) AS message_count
      FROM "ChatMessage" m
      JOIN "ChatConversation" c ON c.id = m."conversationId"
      WHERE c."venueId" = ${venueId}
        AND c."userId" IS NOT NULL
        AND c."deletedAt" IS NULL
        AND m."createdAt" >= ${sinceUtc}
      GROUP BY 1
      ORDER BY 1 ASC
    `)

    const observed = new Map<string, { activeUsers: number; messageCount: number }>()
    for (const row of rows) {
      // date_trunc with AT TIME ZONE returns a timestamp without timezone
      // representing the local week-start. Format as a plain ISO date so the
      // key is stable regardless of the driver's UTC normalization.
      const key = row.week_start.toISOString().slice(0, 10)
      observed.set(key, {
        activeUsers: Number(row.active_users),
        messageCount: Number(row.message_count),
      })
    }

    const buckets = buildWeekBuckets(new Date(), venue.timezone, weeks)
    return fillBuckets(buckets, observed)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers — exported for unit tests.
// ─────────────────────────────────────────────────────────────────────────────

export type WeekBucket = {
  /// ISO date (YYYY-MM-DD) of the Monday that starts the week, in venue tz.
  weekStart: string
  /// ISO date (YYYY-MM-DD) of the Sunday that ends the week, in venue tz.
  weekEnd: string
}

/// Build N consecutive Monday-anchored week buckets ending at the current
/// ISO week, in `timezone`. Returns ascending oldest-first.
export function buildWeekBuckets(now: Date, timezone: string, weeks: number): WeekBucket[] {
  const currentMonday = localIsoMonday(now, timezone)
  const out: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDaysUtc(currentMonday, -i * 7)
    const end = addDaysUtc(start, 6)
    out.push({
      weekStart: ymd(start),
      weekEnd: ymd(end),
    })
  }
  return out
}

/// Zero-fill buckets from the observed map keyed by weekStart YYYY-MM-DD.
export function fillBuckets(
  buckets: WeekBucket[],
  observed: Map<string, { activeUsers: number; messageCount: number }>,
): WauBucket[] {
  return buckets.map((b) => {
    const hit = observed.get(b.weekStart)
    return {
      weekStart: b.weekStart,
      weekEnd: b.weekEnd,
      activeUsers: hit?.activeUsers ?? 0,
      messageCount: hit?.messageCount ?? 0,
    }
  })
}

/// UTC instant of the Monday 00:00:00 in `timezone` for the week that
/// contains `now`, then shifted `weeksBack` weeks earlier. Used as the SQL
/// lower bound so the query window matches the bucket window.
export function isoWeekStartUtc(now: Date, timezone: string, weeksBack: number): Date {
  const monday = localIsoMonday(now, timezone)
  const shifted = addDaysUtc(monday, -weeksBack * 7)
  // monday is already a UTC Date representing 00:00 local — return as-is.
  // (Re-anchored from the same wall clock; the timezone offset wash is the
  // caller's problem, not ours, because Postgres compares createdAt UTC ↔ UTC.)
  return shifted
}

/// Returns a UTC Date whose Y-M-D matches the Monday of the ISO week that
/// contains `now` in `timezone`. The time component is 00:00:00Z — the caller
/// treats this as a local-week-start key, not a UTC instant.
function localIsoMonday(now: Date, timezone: string): Date {
  const parts = wallClockParts(now, timezone)
  // 1 = Mon … 7 = Sun (ISO weekday). Intl 'short' weekday → JS getUTCDay() of
  // the synthesized UTC date is the simplest stable mapping.
  const local = Date.UTC(parts.year, parts.month - 1, parts.day)
  const localDate = new Date(local)
  const jsDow = localDate.getUTCDay() // 0=Sun … 6=Sat
  const isoDow = jsDow === 0 ? 7 : jsDow
  return addDaysUtc(localDate, -(isoDow - 1))
}

function wallClockParts(d: Date, timezone: string): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '0'
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
  }
}

function addDaysUtc(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000)
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}
