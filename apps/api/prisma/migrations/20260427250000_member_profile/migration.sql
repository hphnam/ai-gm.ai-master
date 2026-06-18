-- Phase F (Task #14) — per-user GM profile cache.
-- metadata.gmProfile = {
--   summary: string  (1-2 sentences derived from chat history),
--   likelyShiftRole: string | null  (e.g. 'glass collector', 'duty manager'),
--   commonTopics: string[]  (e.g. ['stock', 'closing', 'troubleshooting']),
--   languageHints: string | null  (e.g. 'prefers very brief answers'),
--   refreshedAt: ISO8601,
--   sourceMessageCount: number
-- }
-- Lazily refreshed during chat.sendMessage when stale (>7d) and user has
-- ≥ 5 messages of history. Manual refresh / weekly cron deferred.

ALTER TABLE "organization_members"
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
