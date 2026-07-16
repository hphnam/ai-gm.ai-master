/// Wave 3 — BullMQ plumbing for the chat-starters rotation.
/// The fanout tick fires every few days and enqueues one per-venue job for each
/// venue active in the last 30 days. Per-venue workers call Haiku and store TWO
/// role-tailored payloads (staff + manager) in Redis. The API reads the payload
/// for the caller's role — if a run fails, the last successful set keeps serving
/// until the TTL lapses.

export const CHAT_STARTERS_QUEUE_NAME = 'chat-starters'

/// Which audience a stored starter set is tailored to. Owners see the manager
/// set (they have full data access); everyone else without an explicit staff
/// role also falls to 'staff' so an unresolved role never nudges someone toward
/// commercial prompts they can't act on.
export type ChatStartersAudience = 'staff' | 'manager'

export function audienceForRole(role: string | null | undefined): ChatStartersAudience {
  return role === 'owner' || role === 'manager' ? 'manager' : 'staff'
}

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

/// 3-day fanout — a "round-up every few days" cadence. The exact phase floats
/// by whenever the API process last (re)started, which is fine for this surface.
export const CHAT_STARTERS_FANOUT_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000

/// Redis key TTL for stored starters. Comfortably more than double the fanout
/// interval so a failed run (or two) doesn't blank the UI — the last successful
/// payload remains until the next successful refresh.
export const CHAT_STARTERS_TTL_SECONDS = 8 * 24 * 60 * 60
