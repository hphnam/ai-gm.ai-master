/// Phase C foundation — BullMQ plumbing for the scheduled-reports cron.
/// One repeatable tick fires every minute and enqueues per-schedule "fire"
/// jobs for every active row whose nextRunAt has passed. The fire job (Phase
/// C foundation) writes a placeholder Report + a Notification — content
/// generation lands in the next phase.

export const SCHEDULED_REPORTS_QUEUE_NAME = 'scheduled-reports'

export const SCHEDULED_REPORTS_JOB_TICK = 'scheduled-reports.tick' as const
export const SCHEDULED_REPORTS_JOB_FIRE = 'scheduled-reports.fire' as const

export type ScheduledReportsTickJobData = {
  triggeredAt: string
  reason: 'cron' | 'manual'
}

export type ScheduledReportsFireJobData = {
  scheduledReportId: string
}

/// 1 minute. The fire-job side dedupes by stamping nextRunAt forward, so a
/// short tick is safe even with overlapping ticks under load.
export const SCHEDULED_REPORTS_TICK_INTERVAL_MS = 60 * 1000
