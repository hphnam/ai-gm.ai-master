-- Phase C (Task #5) — knowledge gap capture.
-- A "gap" is a question that staff asked but the KB couldn't answer. Rather
-- than spinning up a new table, a gap IS a KnowledgeItem with answerStatus
-- 'pending' — the question is the content, metadata.tentativeAnswer holds
-- the agent's best-effort answer, metadata.askedByUserId / sourceMessageId
-- preserve provenance, askCount tracks repeats.
--
-- When a GM answers, content gets updated to "Q: ...\nA: ...", answerStatus
-- flips to 'answered', and the existing enrichment pipeline runs again.

ALTER TABLE "knowledge_items"
  ADD COLUMN "answerStatus" TEXT NOT NULL DEFAULT 'answered';

CREATE INDEX "knowledge_items_answerStatus_idx"
  ON "knowledge_items"("organizationId", "answerStatus");
