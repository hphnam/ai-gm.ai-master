/// Wave 1 — BullMQ plumbing for task reminders.
/// One repeatable tick scans open tasks whose dueAt falls inside the reminder
/// window and emits a Notification to each assignee. The processor stamps
/// remindedAt so the same task is never reminded twice unless the user moves
/// the due date (which clears remindedAt — see TasksService.update).

export const TASK_REMINDER_QUEUE_NAME = 'task-reminders'

export const TASK_REMINDER_JOB_TICK = 'task-reminder.tick' as const

export type TaskReminderTickJobData = {
  triggeredAt: string
  reason: 'cron' | 'manual'
}

/// 10-minute granularity is plenty for "before Friday" semantics. Frequent
/// enough to fire within a sensible window of the due date; cheap enough that
/// a single index seek per tick stays under 5ms.
export const TASK_REMINDER_TICK_INTERVAL_MS = 10 * 60 * 1000

/// Reminder window: ping when (now >= dueAt - LEAD_MS) AND remindedAt IS NULL.
/// 18h leads to "Thursday evening for a Friday morning" semantics naturally.
/// Catch-all: an overdue task with no prior reminder still fires whenever the
/// scheduler next runs.
export const TASK_REMINDER_LEAD_MS = 18 * 60 * 60 * 1000
