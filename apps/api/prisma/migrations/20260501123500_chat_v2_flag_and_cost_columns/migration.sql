-- Plan 06-01 — chat-v2 feature flag + cost-capture columns.
--
-- Hand-authored to exclude pre-existing schema drift (searchable_entities.searchVector +
-- knowledge_items_answerStatus_idx noted at top of Plan 01-01 SUMMARY, registered D-06-01-H,
-- explicitly out of 06-01 scope).
--
-- All three statements are ADD COLUMN with no row-rewriting DEFAULT (Boolean DEFAULT false on
-- Postgres 11+ is metadata-only; nullable Decimal columns have no DEFAULT). Per audit-S3 these
-- are instant operations with no concurrent-write block.
--
-- Audit-trail discipline (audit-S5): chatV2Enabled flips happen via direct SQL only in 06-01;
-- each UPDATE must include comment header
--   `UPDATE organizations SET "chatV2Enabled" = true WHERE id = '<id>';
--    -- chat_v2_flag_flip orgId=<id> by=<operator> reason=<text>`
-- Admin endpoint with structured `org.chat_v2_flag_flipped` audit log deferred to 06-03 (D-06-01-B).

-- AddColumn: Organization.chatV2Enabled — per-org chat-v2 dispatch flag.
ALTER TABLE "organizations" ADD COLUMN "chatV2Enabled" BOOLEAN NOT NULL DEFAULT false;

-- AddColumn: ChatMessage.costUsd — per-turn USD cost (null until end-of-turn aggregation).
-- Table name is "ChatMessage" (PascalCase) — model has no @@map, so Prisma uses the model name verbatim.
ALTER TABLE "ChatMessage" ADD COLUMN "costUsd" DECIMAL(10, 6);

-- AddColumn: KnowledgeItem.ingestionCostUsd — per-document ingestion USD cost (null until end-of-ingest).
ALTER TABLE "knowledge_items" ADD COLUMN "ingestionCostUsd" DECIMAL(10, 6);
