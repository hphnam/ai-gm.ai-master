-- Wave C UX surface for the silent auto-verify backend signal. The
-- triggerAutoVerify floating-promise in ChatService logs results today; with
-- these columns it also persists final state onto the assistant row so the
-- web UI can render a "couldn't verify N specifics" badge.
--
-- verifyStatus values:
--   'pending'  — scheduled, not completed yet (rare, only visible during the
--                small window before the floating promise resolves)
--   'clean'    — verifier ran, no issues
--   'issues'   — verifier flagged specifics; verifyIssueCount > 0
--   'skipped'  — gating regex didn't match or retrievedItemIds was empty
--   'error'    — verifier threw
--
-- NULL is the pre-Wave-C state and also stays NULL for user rows. The chat UI
-- treats NULL as "no badge" so historical rows render unchanged.

ALTER TABLE "ChatMessage"
  ADD COLUMN "verifyStatus" TEXT,
  ADD COLUMN "verifyIssueCount" INTEGER;
