-- Plan 04-02 Task 1 — reconcile pre-existing drift between live DB and schema.prisma.
-- Source of drift: ChatConversation FK+index declared in schema.prisma but never written to
-- the DB during Phase 3 (likely a migrate-diff that dropped the statements; D-04-01-K).
-- organizations.updatedAt DEFAULT is the inverse: DB has one, schema doesn't declare it.
--
-- Safety posture:
--   (a) IF NOT EXISTS on the index — additive no-op if already present.
--   (b) FK add — additive; rollback on orphan row violation (Prisma wraps in a tx). Phase
--       3+4 runtime has exercised ChatConversation→Venue reads end-to-end, so orphans are
--       exceedingly unlikely. If violation surfaces, investigate which rows dangled.
--   (c) DROP DEFAULT on organizations.updatedAt — no-op behaviorally: Prisma's @updatedAt
--       decorator always sends an explicit value on write, so the DB default is never consulted.

-- AlterTable (remove stale DEFAULT)
ALTER TABLE "organizations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex (additive, idempotent)
CREATE INDEX IF NOT EXISTS "ChatConversation_venueId_idx" ON "ChatConversation"("venueId");

-- AddForeignKey (additive; Prisma tx rollback on orphan violation)
ALTER TABLE "ChatConversation"
  ADD CONSTRAINT "ChatConversation_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
