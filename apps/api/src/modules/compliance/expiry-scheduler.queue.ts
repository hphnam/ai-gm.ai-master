/// Wave 2 — BullMQ plumbing for the compliance / expiry scheduler. One
/// repeatable tick fires at most every 6 hours; the scan picks up records
/// crossing into the 30 / 7 / 1-day windows or freshly overdue and emits a
/// Wave 1 Task to the assignee. Reminders are per-window stamped on the
/// record so re-firing the tick never duplicates a task.

export const EXPIRY_SCHEDULER_QUEUE_NAME = 'expiry-scheduler'

export const EXPIRY_SCHEDULER_JOB_TICK = 'expiry-scheduler.tick' as const

export type ExpirySchedulerTickJobData = {
  triggeredAt: string
  reason: 'cron' | 'manual'
}

/// 6 hours — granular enough that "30 days before expiry" lands on the same
/// calendar day as the cert expires, frequent enough to catch a manually-added
/// record that's already inside a window without waiting 24h.
export const EXPIRY_SCHEDULER_TICK_INTERVAL_MS = 6 * 60 * 60 * 1000

/// Reminder windows. Each entry is a (label, leadDays, stampField) triple.
/// `leadDays = 0` is the "overdue" pass — fires once when expiresAt has passed.
export const EXPIRY_REMINDER_WINDOWS = [
  { label: '30d', leadDays: 30, stamp: 'reminded30At' as const },
  { label: '7d', leadDays: 7, stamp: 'reminded7At' as const },
  { label: '1d', leadDays: 1, stamp: 'reminded1At' as const },
  { label: 'overdue', leadDays: 0, stamp: 'remindedOverdueAt' as const },
] as const

export type ExpiryReminderWindow = (typeof EXPIRY_REMINDER_WINDOWS)[number]
