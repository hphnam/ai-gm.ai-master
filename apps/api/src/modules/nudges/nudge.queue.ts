/// Phase G4 — BullMQ job + queue plumbing for proactive nudges.
/// Schedules a single repeatable job that fans out across all venues with
/// at least one reachable contact; per-venue work happens in the worker.

export const NUDGE_QUEUE_NAME = 'nudges'

/// Job kinds — one for the cron tick, one for per-venue work.
export type NudgeFanoutJobData = { triggeredAt: string; reason: 'cron' | 'manual' }
export type NudgePerVenueJobData = { orgId: string; venueId: string }

export const NUDGE_JOB_FANOUT = 'nudge.fanout' as const
export const NUDGE_JOB_PER_VENUE = 'nudge.run' as const

/// Repeatable job tick — every 30 minutes during reasonable shopping hours
/// (08:00–17:30 in the venue's timezone is enforced inside the processor;
/// BullMQ runs UTC). 30m gives the worker time to fan out without spamming.
export const NUDGE_REPEAT_EVERY_MS = 30 * 60 * 1000
