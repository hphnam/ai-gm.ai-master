import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../../database/prisma'

/// Spec metric I — time-to-competency for new staff.
///
/// "Competency" = the user stops repeating questions during the 14-day
/// onboarding window. A query is a "repeat" if its LOWER(TRIM(query)) text
/// has appeared from the same (user, org) at any earlier point in the window.
/// firstIndependentAt is the first day inside the window whose trailing
/// 7-day repeat rate drops below 10% with at least 5 queries observed.
export const ONBOARDING_WINDOW_DAYS = 14
export const COMPETENCY_TRAILING_DAYS = 7
export const COMPETENCY_MIN_QUERIES = 5
export const COMPETENCY_REPEAT_RATE_THRESHOLD = 0.1

export type CompetencyResult = {
  startedAt: Date | null
  daysSinceStart: number
  windowDays: typeof ONBOARDING_WINDOW_DAYS
  totalQueries: number
  repeatQueries: number
  repeatRate: number
  firstIndependentAt: Date | null
}

export type NormalizedQuery = {
  /// LOWER(TRIM(query)) — caller is responsible for normalization so the
  /// pure function stays testable without re-encoding the SQL convention.
  text: string
  createdAt: Date
}

@Injectable()
export class OnboardingMetricsService {
  private readonly logger = new Logger(OnboardingMetricsService.name)

  /// Fetches a user's queries within their onboarding window and computes
  /// the competency snapshot. Returns zeros (not null) for queries to keep
  /// the response shape stable for the UI.
  async getCompetency(
    orgId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<CompetencyResult> {
    const membership = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      select: { onboardingStartedAt: true },
    })

    const startedAt = membership?.onboardingStartedAt ?? null
    if (!startedAt) {
      return {
        startedAt: null,
        daysSinceStart: 0,
        windowDays: ONBOARDING_WINDOW_DAYS,
        totalQueries: 0,
        repeatQueries: 0,
        repeatRate: 0,
        firstIndependentAt: null,
      }
    }

    const windowEnd = addDays(startedAt, ONBOARDING_WINDOW_DAYS)
    const upper = now < windowEnd ? now : windowEnd

    const rows = await prisma.searchAnalytics.findMany({
      where: {
        organizationId: orgId,
        userId,
        createdAt: { gte: startedAt, lte: upper },
      },
      select: { query: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const normalized: NormalizedQuery[] = rows.map((r) => ({
      text: r.query.trim().toLowerCase(),
      createdAt: r.createdAt,
    }))

    return computeCompetency(startedAt, normalized, now)
  }
}

/// Pure helper — exported so unit tests can drive it without prisma.
export function computeCompetency(
  startedAt: Date,
  queries: NormalizedQuery[],
  now: Date,
): CompetencyResult {
  const daysSinceStart = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS))

  const seen = new Set<string>()
  let repeatQueries = 0
  for (const q of queries) {
    if (seen.has(q.text)) {
      repeatQueries += 1
    } else {
      seen.add(q.text)
    }
  }
  const totalQueries = queries.length
  const repeatRate = totalQueries === 0 ? 0 : repeatQueries / totalQueries

  return {
    startedAt,
    daysSinceStart,
    windowDays: ONBOARDING_WINDOW_DAYS,
    totalQueries,
    repeatQueries,
    repeatRate,
    firstIndependentAt: firstIndependentDay(startedAt, queries, now),
  }
}

/// Scan day-by-day inside the 14-day window. For each candidate day D, look
/// at queries in the trailing `COMPETENCY_TRAILING_DAYS` ending at D's
/// boundary (start-of-day + 1 = first instant of the next day). The first
/// day whose trailing window has at least `COMPETENCY_MIN_QUERIES` AND a
/// repeat rate below `COMPETENCY_REPEAT_RATE_THRESHOLD` wins. The returned
/// timestamp is the END of that day (start-of-next-day) so the UI can say
/// "independent by end of day D".
function firstIndependentDay(startedAt: Date, queries: NormalizedQuery[], now: Date): Date | null {
  if (queries.length === 0) return null
  const lastScanDay = Math.min(
    ONBOARDING_WINDOW_DAYS - 1,
    Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS),
  )
  for (let dayIndex = 0; dayIndex <= lastScanDay; dayIndex += 1) {
    const boundary = addDays(startedAt, dayIndex + 1)
    const trailingStart = new Date(boundary.getTime() - COMPETENCY_TRAILING_DAYS * DAY_MS)
    const lowerBound = trailingStart < startedAt ? startedAt : trailingStart

    const seenInWindow = new Set<string>()
    let inWindowTotal = 0
    let inWindowRepeats = 0
    for (const q of queries) {
      if (q.createdAt < lowerBound) continue
      if (q.createdAt >= boundary) break
      inWindowTotal += 1
      if (seenInWindow.has(q.text)) inWindowRepeats += 1
      else seenInWindow.add(q.text)
    }
    if (inWindowTotal < COMPETENCY_MIN_QUERIES) continue
    const rate = inWindowRepeats / inWindowTotal
    if (rate < COMPETENCY_REPEAT_RATE_THRESHOLD) {
      return boundary
    }
  }
  return null
}

const DAY_MS = 24 * 60 * 60 * 1000

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS)
}
