-- Plan 06-04 Task 5 — drop the per-org chat-v2 feature flag column.
--
-- CONTEXT.md D-06-G ("Feature-flag cutover with empirical quality gate") was
-- SUPERSEDED 2026-05-01 by the user decision "bin the flag, fully migrate".
-- After Tasks 1-4 the controller no longer reads this column on any request,
-- so dropping it is safe. Rollback path is git revert (re-adds column with
-- DEFAULT false; no data lost because column is unread).
--
-- The column was added by 20260501123500_chat_v2_flag_and_cost_columns. The
-- two cost columns from that migration (chat_messages.costUsd,
-- knowledge_items.ingestionCostUsd) STAY — they remain load-bearing for the
-- 06-02 cost-capture pipeline and the future /debug/costs surface (06-05).

-- DropColumn: Organization.chatV2Enabled — flag-based dispatch retired.
ALTER TABLE "organizations" DROP COLUMN "chatV2Enabled";
