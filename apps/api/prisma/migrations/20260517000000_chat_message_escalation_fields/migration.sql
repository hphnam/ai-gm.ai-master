-- Operator-metrics instrumentation for spec metrics A ("Manager Interruptions
-- Prevented") and F ("AI Response Resolution Rate"). Tag every assistant turn
-- that escalated to a human via a tool call, so the dashboard can split
-- resolved-by-AI vs escalated and compute the headline numbers without
-- re-parsing toolCallLog JSON on every aggregation.
--
-- Table name is "ChatMessage" (PascalCase) — model has no @@map.

ALTER TABLE "ChatMessage"
    ADD COLUMN "escalatedAt" TIMESTAMP(3),
    ADD COLUMN "escalatedToUserId" TEXT,
    ADD COLUMN "escalationKind" TEXT;

-- Per-conversation index for "did this thread escalate?" and aggregation by
-- conversation. Aggregations by venue/org go through ChatConversation.venueId
-- which is already indexed.
CREATE INDEX "ChatMessage_conversationId_escalatedAt_idx"
    ON "ChatMessage"("conversationId", "escalatedAt");
