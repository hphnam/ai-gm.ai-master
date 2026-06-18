import { Injectable, Logger } from '@nestjs/common'
import type { ExpiryRecord } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { TasksService } from '../tasks/tasks.service'
import { EXPIRY_REMINDER_WINDOWS, type ExpiryReminderWindow } from './expiry-scheduler.queue'

const DAY_MS = 24 * 60 * 60 * 1000

/// Wave 2 — turn upcoming expiry records into Wave 1 Tasks at the 30 / 7 / 1
/// day windows and one final overdue ping. Idempotent: the CAS update on each
/// per-window remindedAt stamp prevents double-firing.
@Injectable()
export class ExpirySchedulerService {
  private readonly logger = new Logger(ExpirySchedulerService.name)

  constructor(private readonly tasks: TasksService) {}

  async runOnce(now: Date = new Date()): Promise<{ scanned: number; tasksCreated: number }> {
    // We scan all active records with an expiry in the future + a small past
    // buffer (so freshly-overdue records still get the overdue ping). The
    // (status, expiresAt) index covers this range query.
    const earliest = new Date(now.getTime() - 30 * DAY_MS)
    const latest = new Date(now.getTime() + 31 * DAY_MS)
    const records = await prisma.expiryRecord.findMany({
      where: {
        status: 'active',
        expiresAt: { gte: earliest, lte: latest },
      },
      orderBy: { expiresAt: 'asc' },
      take: 500,
    })

    let tasksCreated = 0
    for (const r of records) {
      try {
        const created = await this.processRecord(r, now)
        tasksCreated += created
      } catch (err) {
        this.logger.warn(
          JSON.stringify({
            event: 'expiry_scheduler.record_failed',
            recordId: r.id,
            message: (err as Error)?.message ?? 'unknown',
          }),
        )
      }
    }

    if (records.length > 0 || tasksCreated > 0) {
      this.logger.log(
        JSON.stringify({
          event: 'expiry_scheduler.tick',
          scanned: records.length,
          tasksCreated,
        }),
      )
    }
    return { scanned: records.length, tasksCreated }
  }

  private async processRecord(record: ExpiryRecord, now: Date): Promise<number> {
    // Find every reminder window the record is currently inside. The 30d
    // window stays "active" all the way through expiry, so a record added
    // tomorrow-expiring is inside ALL FOUR windows on its first tick. We
    // pick the TIGHTEST eligible window (smallest leadDays whose stamp is
    // null and whose threshold has passed), fire ONE task using that
    // window's tone, and stamp every wider window in the same transaction
    // so they don't fire on a later tick. Result: one task per record per
    // tick — no stampede on freshly-added near-expiry certs.
    const eligible = EXPIRY_REMINDER_WINDOWS.filter(
      (w) => !record[w.stamp] && this.isWindowActive(record.expiresAt, now, w),
    )
    if (eligible.length === 0) return 0

    // Sort by ascending lead time so the tightest window (leadDays=0 overdue,
    // then 1d, 7d, 30d) is first. The tightest determines the task copy +
    // dueAt; all eligible stamps get set so wider windows are also "done".
    const ordered = [...eligible].sort((a, b) => a.leadDays - b.leadDays)
    const tightest = ordered[0]

    // CAS — claim the tightest window first. If another worker beat us we
    // skip the entire record. Stamp every eligible window in the same update
    // so wider windows don't fire on a later tick.
    const stampUpdate: Record<string, Date> = {}
    for (const w of eligible) stampUpdate[w.stamp] = now
    const claimed = await prisma.expiryRecord.updateMany({
      where: { id: record.id, [tightest.stamp]: null, status: 'active' },
      data: stampUpdate,
    })
    if (claimed.count === 0) return 0

    // Resolve assignee: prefer the linked person (staff cert), otherwise
    // fall back to the org's owner — they're the buck-stops-here on
    // compliance. Multiple owners → pick the earliest-joined.
    const assigneeUserId = await this.resolveAssignee(record)
    if (!assigneeUserId) {
      this.logger.warn(
        JSON.stringify({
          event: 'expiry_scheduler.no_assignee',
          recordId: record.id,
          orgId: record.organizationId,
        }),
      )
      return 0
    }

    const body = formatTaskBody(record, tightest, now)
    const dueAt = pickTaskDueAt(record.expiresAt, tightest, now)
    await this.tasks.create(record.organizationId, null, {
      body,
      assigneeUserId,
      dueAt: dueAt.toISOString(),
      venueId: record.venueId,
      category: 'compliance',
    })
    this.logger.log(
      JSON.stringify({
        event: 'expiry_scheduler.task_created',
        recordId: record.id,
        window: tightest.label,
        collapsedWindows: eligible.map((w) => w.label),
        assigneeUserId,
      }),
    )
    return 1
  }

  private isWindowActive(expiresAt: Date, now: Date, w: ExpiryReminderWindow): boolean {
    if (w.leadDays === 0) {
      // Overdue window — fire once when expiresAt has passed.
      return expiresAt.getTime() <= now.getTime()
    }
    const target = new Date(expiresAt.getTime() - w.leadDays * DAY_MS)
    return now.getTime() >= target.getTime()
  }

  private async resolveAssignee(record: ExpiryRecord): Promise<string | null> {
    if (record.personUserId) return record.personUserId
    const owner = await prisma.organizationMember.findFirst({
      where: { organizationId: record.organizationId, role: 'owner' },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    })
    if (owner) return owner.userId
    // No owner — fall back to any manager.
    const manager = await prisma.organizationMember.findFirst({
      where: { organizationId: record.organizationId, role: 'manager' },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    })
    return manager?.userId ?? null
  }
}

function formatTaskBody(record: ExpiryRecord, w: ExpiryReminderWindow, now: Date): string {
  const who = record.personName ? ` (${record.personName})` : ''
  const what = record.title
  if (w.leadDays === 0) {
    const daysOver = Math.max(1, Math.round((now.getTime() - record.expiresAt.getTime()) / DAY_MS))
    return `OVERDUE: ${what}${who} expired ${daysOver}d ago — renew now before it puts the venue at risk.`
  }
  if (w.leadDays === 30) {
    return `Renew ${what}${who} — expires in 30 days. Book the renewal this week.`
  }
  if (w.leadDays === 7) {
    return `Renew ${what}${who} — expires in 7 days. Don't let this lapse.`
  }
  if (w.leadDays === 1) {
    return `URGENT: ${what}${who} expires tomorrow — sort the renewal today.`
  }
  return `Renew ${what}${who} — expires soon.`
}

function pickTaskDueAt(expiresAt: Date, w: ExpiryReminderWindow, now: Date): Date {
  if (w.leadDays === 0) return now
  // Due date for the task is the expiry itself (or sooner) — the Wave 1
  // task surface groups by due window, so this keeps it visible without
  // pushing it past the actual deadline.
  const target = new Date(expiresAt.getTime() - Math.max(0, w.leadDays - 1) * DAY_MS)
  return target.getTime() < now.getTime() ? now : target
}
