-- Wave 5 — semantic category column for the notifications sidebar (chat | report |
-- compliance | task | system). `source` still describes the delivery channel
-- (chat | whatsapp | manual); `category` describes the *content kind* the user
-- filters on. Backfill keeps existing rows visible under the default chip.
--
-- NOTE on scale: the UPDATE and CREATE INDEX below run inline. On Postgres 11+
-- the ADD COLUMN with non-volatile DEFAULT is metadata-only. The UPDATE
-- rewrites every system-authored row in a single transaction; CREATE INDEX
-- takes ACCESS EXCLUSIVE on the table for the duration of the build. Both
-- are fine at current scale (< 1M notifications). If the table grows past
-- a few million rows, split the UPDATE into batched chunks and replace the
-- CREATE INDEX with CREATE INDEX CONCURRENTLY in its own migration.

ALTER TABLE "notifications" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'chat';

-- Tag historical system-authored notifications (compliance reminders, scheduled
-- report ready alerts) as 'system' so the existing population isn't lost in the
-- 'chat' chip after deploy. The scheduled-reports and expiry-scheduler emit
-- paths will write the more-specific category for new rows.
UPDATE "notifications" SET "category" = 'system'
WHERE "authorUserId" IS NULL;

-- Composite index supports the sidebar's per-category infinite scroll. The
-- existing (orgId, recipientUserId, createdAt DESC) index still serves the
-- "all categories" path.
CREATE INDEX "notifications_org_recipient_category_createdAt_idx"
  ON "notifications" ("organizationId", "recipientUserId", "category", "createdAt" DESC);
