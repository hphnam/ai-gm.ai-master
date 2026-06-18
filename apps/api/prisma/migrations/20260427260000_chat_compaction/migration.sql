-- Phase F (Task #15) — long-thread summarisation cache.
-- compactionSummary holds a Haiku-generated synthesis of older turns; the
-- summary is emitted as a synthetic system message so the agent retains
-- context without paying for the full history every turn.
-- compactionUpToMessageId is the last user/assistant message id covered by
-- the current summary; once enough new messages accumulate past it, the
-- summary is regenerated.

ALTER TABLE "ChatConversation"
  ADD COLUMN "compactionSummary"       TEXT,
  ADD COLUMN "compactionUpToMessageId" TEXT;
