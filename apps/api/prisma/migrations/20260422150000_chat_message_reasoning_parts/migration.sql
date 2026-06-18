-- Chat agentic upgrade (docs/chat-agentic-upgrade.md #10):
--   - `reasoning` stores extended-thinking text from Claude adaptive thinking.
--   - `parts` stores the UIMessage content-parts snapshot for faithful replay
--     of the assistant turn (text + reasoning + tool-call + tool-result blocks
--     in order). Both nullable — purely additive, no data migration needed.
ALTER TABLE "ChatMessage"
  ADD COLUMN "reasoning" TEXT,
  ADD COLUMN "parts" JSONB;
