-- ═══════════════════════════════════════════════════════════════════════
-- v0.2 Phase 2 — Plan 02-01 — KnowledgeItem.organizationId
-- Plan:  .paul/phases/02-document-ingest/02-01-PLAN.md
-- Audit: .paul/phases/02-document-ingest/02-01-AUDIT.md
--
-- Closes the SOC-2 CC6.6 cross-org leak on KnowledgeItem rows with
-- venueId = NULL. Adds organizationId FK (NOT NULL) with a two-pass
-- backfill and a fail-loud guard if orphan rows remain.
--
-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK SQL (operator reference — do not execute unless reverting)
-- ═══════════════════════════════════════════════════════════════════════
--   ALTER TABLE "knowledge_items" DROP CONSTRAINT IF EXISTS
--     "knowledge_items_organizationId_fkey";
--   DROP INDEX IF EXISTS "knowledge_items_organizationId_idx";
--   ALTER TABLE "knowledge_items" DROP COLUMN IF EXISTS "organizationId";
-- ═══════════════════════════════════════════════════════════════════════
--
-- DATA-LOSS WARNING: rolling back after the Plan 02-01 service-layer
-- changes ship will re-introduce the cross-org leak. Rollback is only
-- safe BEFORE the service code is deployed.
--
-- PERFORMANCE NOTE: the UPDATE-FROM below does a full scan of
-- knowledge_items. POC corpus is <20 rows. At >10k rows this should be
-- batched (server-side LOOP + LIMIT/OFFSET) or run as an interruptible
-- job. Not applicable pre-POC.
--
-- TABLE-NAME REFERENCE (M2):
--   "Venue"          — capitalised, quoted (model Venue has no @@map)
--   "organizations"  — lowercase     (@@map("organizations"))
--   "knowledge_items"— snake_case    (@@map("knowledge_items"))
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Add nullable column first (additive, reversible).
-- NOTE: Prisma's `String @id @default(uuid())` maps to TEXT in Postgres,
-- so every id / FK column in this codebase is TEXT (not UUID). See the
-- init migration 20260418103508_init for confirmation.
ALTER TABLE "knowledge_items"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- 2. Backfill pass 1: copy from venue.organizationId for venue-scoped rows.
UPDATE "knowledge_items" ki
  SET "organizationId" = v."organizationId"
  FROM "Venue" v
  WHERE ki."venueId" = v.id
    AND ki."organizationId" IS NULL;

-- 3. Backfill pass 2: orphan (venueId NULL) rows fall back to the demo
-- organization. This path exists for dev DBs where global fixtures were
-- seeded before organizations existed. In production, the demo org will
-- not exist and this UPDATE sets NULL (which is then caught by step 4).
UPDATE "knowledge_items"
  SET "organizationId" = (
    SELECT id FROM "organizations" WHERE slug = 'demo' LIMIT 1
  )
  WHERE "organizationId" IS NULL;

-- 4. Pre-flight guard (M1): if any orphan rows remain, ABORT the
-- migration with an operator-readable message instead of silently
-- failing at SET NOT NULL.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "knowledge_items" WHERE "organizationId" IS NULL) > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORT: knowledge_items contains rows with NULL organizationId and no demo-org fallback is available. Resolution options: (a) ensure the ''demo'' organization exists before re-running, (b) manually UPDATE orphan rows to the correct organizationId, or (c) DELETE the orphan rows. See Plan 02-01 AUDIT M1.';
  END IF;
END $$;

-- 5. Make the column NOT NULL (safe now — every row has a value).
ALTER TABLE "knowledge_items"
  ALTER COLUMN "organizationId" SET NOT NULL;

-- 6. Index on the new FK column.
CREATE INDEX IF NOT EXISTS "knowledge_items_organizationId_idx"
  ON "knowledge_items" ("organizationId");

-- 7. Add the FK constraint. RESTRICT on delete matches Venue -> Organization
-- (so deleting an org with existing knowledge items is an explicit choice,
-- not a silent cascade).
ALTER TABLE "knowledge_items"
  ADD CONSTRAINT "knowledge_items_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
