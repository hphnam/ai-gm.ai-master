/// Daily unread-notes email digest. One repeatable tick scans notifications
/// still unread that were created inside the window and emails each recipient
/// one summary per org, linking every note to its /notes/:id deep link.

export const NOTE_DIGEST_QUEUE_NAME = 'note-digest'

export const NOTE_DIGEST_JOB_TICK = 'note-digest.tick' as const

export type NoteDigestTickJobData = {
  triggeredAt: string
  reason: 'cron' | 'manual'
}

/// 07:00 UTC — early morning UK (the current customer base) so the digest
/// lands before opening prep, not mid-service. Keep the anchor hour in sync
/// with the cron pattern: the service truncates its window to this boundary.
export const NOTE_DIGEST_CRON = '0 7 * * *'
export const NOTE_DIGEST_ANCHOR_HOUR_UTC = 7

/// Window matches the daily cadence exactly, so a note appears in at most one
/// digest (stateless — no per-note "emailed" stamp needed). A note that goes
/// unread past its one window simply isn't re-nagged. The window is anchored
/// to the 07:00 boundary, not the processing wall-clock, so a late-drained
/// tick covers the same [07:00, 07:00) span an on-time one would — no gap,
/// no double-send.
export const NOTE_DIGEST_WINDOW_MS = 24 * 60 * 60 * 1000

export const NOTE_DIGEST_MAX_NOTES_PER_EMAIL = 10
