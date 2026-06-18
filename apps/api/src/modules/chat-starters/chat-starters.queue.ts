/// Wave 3 — BullMQ plumbing for the weekly chat-starters rotation.
/// The fanout tick fires every 7 days and enqueues one per-venue job for each
/// venue active in the last 30 days. Per-venue workers call Haiku, store the
/// result in Redis. The API reads from Redis with a 14-day TTL — if a week's
/// generation fails, last week's starters remain serving.

export const CHAT_STARTERS_QUEUE_NAME = 'chat-starters'

export const CHAT_STARTERS_JOB_FANOUT = 'chat-starters.fanout' as const
export const CHAT_STARTERS_JOB_PER_VENUE = 'chat-starters.generate' as const

export type ChatStartersFanoutJobData = {
  triggeredAt: string
  reason: 'cron' | 'manual'
}
export type ChatStartersPerVenueJobData = {
  orgId: string
  venueId: string
}

/// 7-day fanout. Lined up to roughly match the cadence the spec calls for
/// ("rotate weekly"); the exact phase floats by whenever the API process last
/// (re)started, which is fine for this surface.
export const CHAT_STARTERS_FANOUT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

/// Redis key TTL for stored starters. Double the fanout interval so a failed
/// run doesn't blank the UI — the last successful payload remains until the
/// next successful refresh.
export const CHAT_STARTERS_TTL_SECONDS = 14 * 24 * 60 * 60
