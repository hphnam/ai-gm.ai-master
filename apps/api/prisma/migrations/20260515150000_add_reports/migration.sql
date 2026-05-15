-- Phase B reports — agent-generated, persisted so the chat turn's findings
-- can be re-opened and shared. The full ReportSpec lives in `spec` JSON; a
-- shared Zod schema validates on read.
--
-- createdByUserId is nullable so a leaver's account deletion SetNulls the
-- attribution column instead of cascading the row away — reports are
-- org-owned content.

CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "venueId" TEXT,
    "createdByUserId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "spec" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reports_organizationId_createdAt_idx" ON "reports"("organizationId", "createdAt" DESC);
CREATE INDEX "reports_venueId_idx" ON "reports"("venueId");

ALTER TABLE "reports"
    ADD CONSTRAINT "reports_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "organizations"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "reports"
    ADD CONSTRAINT "reports_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId")
    REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
