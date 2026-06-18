import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'

/// Per-org hard cap on live (active or paused) schedules. Cancelled rows
/// don't count. Sized so a small operations team has plenty of headroom but
/// a runaway agent / scripted abuse can't fan out forever.
export const MAX_LIVE_SCHEDULES_PER_ORG = 50

export type Frequency = 'daily' | 'weekly' | 'monthly'
export type ScheduledReportStatus = 'active' | 'paused' | 'cancelled'

export type ScheduledReportRow = {
  id: string
  organizationId: string
  venueId: string | null
  createdByUserId: string | null
  createdByName: string | null
  title: string
  summary: string | null
  frequency: Frequency
  hourOfDay: number
  dayOfWeek: number | null
  dayOfMonth: number | null
  timezone: string
  prompt: string | null
  status: ScheduledReportStatus
  nextRunAt: string
  lastRunAt: string | null
  lastReportId: string | null
  runCount: number
  createdAt: string
  updatedAt: string
}

export type CreateScheduledReportInput = {
  orgId: string
  userId: string
  venueId?: string | null
  title: string
  summary?: string | null
  frequency: Frequency
  hourOfDay?: number
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  timezone?: string
  prompt?: string | null
}

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name)

  async create(input: CreateScheduledReportInput): Promise<ScheduledReportRow> {
    // Per-org hard cap on live (active+paused) schedules. Caps fan-out from
    // either a careless user or a jailbroken agent looping schedule_report.
    const live = await this.countLive(input.orgId)
    if (live >= MAX_LIVE_SCHEDULES_PER_ORG) {
      throw new Error('schedule-cap-reached')
    }
    if (input.venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: input.venueId, organizationId: input.orgId },
        select: { id: true },
      })
      if (!venue) throw new Error('venue-not-in-org')
    }
    const tz = input.timezone ?? 'UTC'
    const hour = clampHour(input.hourOfDay ?? 9)
    const dow = input.frequency === 'weekly' ? clampDow(input.dayOfWeek ?? 1) : null
    const dom = input.frequency === 'monthly' ? clampDom(input.dayOfMonth ?? 1) : null
    if (!isValidTimezone(tz)) throw new Error('invalid-timezone')
    const nextRunAt = computeNextRunAt({
      from: new Date(),
      frequency: input.frequency,
      hour,
      dayOfWeek: dow,
      dayOfMonth: dom,
      timezone: tz,
    })
    const row = await prisma.scheduledReport.create({
      data: {
        organizationId: input.orgId,
        venueId: input.venueId ?? null,
        createdByUserId: input.userId,
        title: input.title,
        summary: input.summary ?? null,
        frequency: input.frequency,
        hourOfDay: hour,
        dayOfWeek: dow,
        dayOfMonth: dom,
        timezone: tz,
        prompt: input.prompt ?? null,
        nextRunAt,
      },
      ...this.fullSelect(),
    })
    return this.toRow(row)
  }

  async list(
    orgId: string,
    opts: { status?: ScheduledReportStatus | 'all'; limit?: number; offset?: number },
  ): Promise<{ items: ScheduledReportRow[]; total: number }> {
    const status = opts.status ?? 'active'
    const limit = Math.min(opts.limit ?? 20, 200)
    const offset = Math.max(opts.offset ?? 0, 0)
    const where = {
      organizationId: orgId,
      ...(status !== 'all' ? { status } : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.scheduledReport.findMany({
        where,
        orderBy: [{ nextRunAt: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
        ...this.fullSelect(),
      }),
      prisma.scheduledReport.count({ where }),
    ])
    return { items: rows.map((r) => this.toRow(r)), total }
  }

  async get(orgId: string, id: string): Promise<ScheduledReportRow | null> {
    const row = await prisma.scheduledReport.findFirst({
      where: { id, organizationId: orgId },
      ...this.fullSelect(),
    })
    return row ? this.toRow(row) : null
  }

  async pause(orgId: string, id: string): Promise<ScheduledReportRow> {
    return this.transition(orgId, id, 'paused')
  }

  async resume(orgId: string, id: string): Promise<ScheduledReportRow> {
    // Resuming from paused recomputes nextRunAt so it doesn't fire instantly
    // with a stale (in-the-past) timestamp.
    const existing = await prisma.scheduledReport.findFirst({
      where: { id, organizationId: orgId },
      select: {
        frequency: true,
        hourOfDay: true,
        dayOfWeek: true,
        dayOfMonth: true,
        timezone: true,
      },
    })
    if (!existing) throw new Error('not-found')
    const nextRunAt = computeNextRunAt({
      from: new Date(),
      frequency: existing.frequency as Frequency,
      hour: existing.hourOfDay,
      dayOfWeek: existing.dayOfWeek,
      dayOfMonth: existing.dayOfMonth,
      timezone: existing.timezone,
    })
    const updated = await prisma.scheduledReport.update({
      where: { id },
      data: { status: 'active', nextRunAt },
      ...this.fullSelect(),
    })
    return this.toRow(updated)
  }

  async cancel(orgId: string, id: string): Promise<ScheduledReportRow> {
    return this.transition(orgId, id, 'cancelled')
  }

  async remove(orgId: string, id: string): Promise<void> {
    const existing = await prisma.scheduledReport.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })
    if (!existing) throw new Error('not-found')
    await prisma.scheduledReport.delete({ where: { id } })
    this.logger.log(JSON.stringify({ event: 'scheduled-reports.deleted', orgId, id }))
  }

  /// Worker-only: atomically claim every active row whose nextRunAt is in the
  /// past. Inside a single transaction we read the due batch AND advance each
  /// row's nextRunAt to its next computed slot. After this returns the rows
  /// are no longer "due" — a subsequent tick that overlaps with a slow fire
  /// will not re-pick them. recordFire then only stamps lastRunAt + runCount +
  /// lastReportId, never re-advances nextRunAt.
  async claimDue(now: Date, batchSize = 50): Promise<ScheduledReportRow[]> {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.scheduledReport.findMany({
        where: {
          status: 'active',
          nextRunAt: { lte: now },
        },
        orderBy: { nextRunAt: 'asc' },
        take: batchSize,
        ...this.fullSelect(),
      })
      if (rows.length === 0) return []
      // Advance each claimed row's nextRunAt forward by a full slot so the
      // next tick (60s later) doesn't see it again while this fire is still
      // in flight. computeNextRunAt skips the slot we're firing on because
      // it filters `snapped <= fromMs`; pass `firedAt + slot-floor` to be
      // extra defensive against DST fall-back duplicates.
      await Promise.all(
        rows.map((r) => {
          const advanceFloor = slotFloorAheadOf(now, r.frequency as Frequency)
          const nextRunAt = computeNextRunAt({
            from: advanceFloor,
            frequency: r.frequency as Frequency,
            hour: r.hourOfDay,
            dayOfWeek: r.dayOfWeek,
            dayOfMonth: r.dayOfMonth,
            timezone: r.timezone,
          })
          return tx.scheduledReport.update({
            where: { id: r.id },
            data: { nextRunAt },
          })
        }),
      )
      return rows.map((r) => this.toRow(r))
    })
  }

  /// Worker-only: stamp a successful fire. Org-scoped so a future caller that
  /// passes an arbitrary id cannot mutate another tenant's row (claimDue
  /// already advanced nextRunAt — this only records what happened).
  async recordFire(input: {
    id: string
    organizationId: string
    reportId: string | null
    firedAt: Date
  }): Promise<void> {
    const updated = await prisma.scheduledReport.updateMany({
      where: { id: input.id, organizationId: input.organizationId },
      data: {
        lastRunAt: input.firedAt,
        runCount: { increment: 1 },
        ...(input.reportId ? { lastReportId: input.reportId } : {}),
      },
    })
    if (updated.count === 0) {
      this.logger.warn(
        JSON.stringify({
          event: 'scheduled-reports.recordFire.missed',
          id: input.id,
          organizationId: input.organizationId,
        }),
      )
    }
  }

  /// Count active+paused schedules so the create path can enforce a per-org
  /// cap. cancelled rows don't count — they are tombstones for history.
  async countLive(orgId: string): Promise<number> {
    return prisma.scheduledReport.count({
      where: { organizationId: orgId, status: { in: ['active', 'paused'] } },
    })
  }

  private async transition(
    orgId: string,
    id: string,
    status: ScheduledReportStatus,
  ): Promise<ScheduledReportRow> {
    const existing = await prisma.scheduledReport.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    })
    if (!existing) throw new Error('not-found')
    const updated = await prisma.scheduledReport.update({
      where: { id },
      data: { status },
      ...this.fullSelect(),
    })
    return this.toRow(updated)
  }

  private fullSelect() {
    return {
      select: {
        id: true,
        organizationId: true,
        venueId: true,
        createdByUserId: true,
        title: true,
        summary: true,
        frequency: true,
        hourOfDay: true,
        dayOfWeek: true,
        dayOfMonth: true,
        timezone: true,
        prompt: true,
        status: true,
        nextRunAt: true,
        lastRunAt: true,
        lastReportId: true,
        runCount: true,
        createdAt: true,
        updatedAt: true,
        creator: { select: { name: true } },
      },
    } as const
  }

  private toRow(raw: {
    id: string
    organizationId: string
    venueId: string | null
    createdByUserId: string | null
    title: string
    summary: string | null
    frequency: string
    hourOfDay: number
    dayOfWeek: number | null
    dayOfMonth: number | null
    timezone: string
    prompt: string | null
    status: string
    nextRunAt: Date
    lastRunAt: Date | null
    lastReportId: string | null
    runCount: number
    createdAt: Date
    updatedAt: Date
    creator: { name: string | null } | null
  }): ScheduledReportRow {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      venueId: raw.venueId,
      createdByUserId: raw.createdByUserId,
      createdByName: raw.creator?.name ?? null,
      title: raw.title,
      summary: raw.summary,
      frequency: raw.frequency as Frequency,
      hourOfDay: raw.hourOfDay,
      dayOfWeek: raw.dayOfWeek,
      dayOfMonth: raw.dayOfMonth,
      timezone: raw.timezone,
      prompt: raw.prompt,
      status: raw.status as ScheduledReportStatus,
      nextRunAt: raw.nextRunAt.toISOString(),
      lastRunAt: raw.lastRunAt?.toISOString() ?? null,
      lastReportId: raw.lastReportId,
      runCount: raw.runCount,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const clampHour = (h: number) => Math.max(0, Math.min(23, Math.round(h)))
const clampDow = (d: number) => Math.max(1, Math.min(7, Math.round(d)))
// Cap day-of-month at 28 so February is always safe (we never have to skip a
// month or fire on the wrong day).
const clampDom = (d: number) => Math.max(1, Math.min(28, Math.round(d)))

/// Push `from` forward by one full slot before searching for the next match
/// in computeNextRunAt. Without this, a fall-back DST day's duplicated local
/// hour can make the loop return the same wall-clock slot twice.
function slotFloorAheadOf(from: Date, frequency: Frequency): Date {
  const ms = from.getTime()
  if (frequency === 'daily') return new Date(ms + 24 * 60 * 60 * 1000)
  if (frequency === 'weekly') return new Date(ms + 7 * 24 * 60 * 60 * 1000)
  // monthly — 27 days ahead so dayOfMonth=28 is reachable next month while
  // still skipping the current slot. computeNextRunAt walks forward and lands
  // on the right day-of-month within the loop bound.
  return new Date(ms + 27 * 24 * 60 * 60 * 1000)
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/// Compute the next UTC instant matching the schedule's local-time spec. We
/// step forward from `from` and find the first matching slot:
///   - daily: every day at hourOfDay local
///   - weekly: each `dayOfWeek` (1=Mon...7=Sun) at hourOfDay local
///   - monthly: each `dayOfMonth` (1-28) at hourOfDay local
///
/// Implementation: walk forward in 1-hour increments up to ~31 days. Cheap
/// (max ~744 iterations) and avoids the timezone math gymnastics of
/// computing offsets manually. The agent's tick fires every minute so
/// schedules land within a minute of their slot.
export function computeNextRunAt(input: {
  from: Date
  frequency: Frequency
  hour: number
  dayOfWeek: number | null
  dayOfMonth: number | null
  timezone: string
}): Date {
  const fromMs = input.from.getTime()
  const stepMs = 60 * 60 * 1000
  // Cap at 32 days = 768 iterations. monthly with dayOfMonth=28 falls within.
  const maxIters = 24 * 32
  for (let i = 0; i < maxIters; i++) {
    const candidate = new Date(fromMs + i * stepMs)
    const parts = inZone(candidate, input.timezone)
    if (parts.hour !== input.hour) continue
    if (
      input.frequency === 'weekly' &&
      input.dayOfWeek !== null &&
      parts.dayOfWeek !== input.dayOfWeek
    ) {
      continue
    }
    if (
      input.frequency === 'monthly' &&
      input.dayOfMonth !== null &&
      parts.dayOfMonth !== input.dayOfMonth
    ) {
      continue
    }
    // Snap to the top of the hour in UTC — the worker tick is minute-level
    // and we want predictable timestamps in the DB regardless of when this
    // function ran.
    const snapped = new Date(candidate)
    snapped.setUTCMinutes(0, 0, 0)
    if (snapped.getTime() <= fromMs) {
      // Snapping backward could push the timestamp into the past; nudge
      // forward an hour so the next tick still picks it up.
      snapped.setUTCHours(snapped.getUTCHours() + 1)
    }
    return snapped
  }
  // Fallback — should never hit. 24h ahead, top of hour.
  const fallback = new Date(fromMs + 24 * stepMs)
  fallback.setUTCMinutes(0, 0, 0)
  return fallback
}

function inZone(date: Date, zone: string): { hour: number; dayOfWeek: number; dayOfMonth: number } {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
      day: 'numeric',
    })
    const parts = fmt.formatToParts(date)
    const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0'
    const dayStr = parts.find((p) => p.type === 'day')?.value ?? '1'
    const wkStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon'
    return {
      hour: Number.parseInt(hourStr, 10) % 24,
      dayOfWeek: weekdayToIso(wkStr),
      dayOfMonth: Number.parseInt(dayStr, 10),
    }
  } catch {
    return {
      hour: date.getUTCHours(),
      dayOfWeek: ((date.getUTCDay() + 6) % 7) + 1,
      dayOfMonth: date.getUTCDate(),
    }
  }
}

function weekdayToIso(short: string): number {
  switch (short.slice(0, 3)) {
    case 'Mon':
      return 1
    case 'Tue':
      return 2
    case 'Wed':
      return 3
    case 'Thu':
      return 4
    case 'Fri':
      return 5
    case 'Sat':
      return 6
    case 'Sun':
      return 7
    default:
      return 1
  }
}
