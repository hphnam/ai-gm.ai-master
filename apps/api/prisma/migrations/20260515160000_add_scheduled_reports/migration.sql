-- Phase C foundation — recurring report schedules. A BullMQ tick worker
-- scans rows where status='active' AND nextRunAt <= now() and fires each.
-- The worker writes a placeholder Report and a Notification for the creator;
-- real content generation lands in the next phase.

CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "venueId" TEXT,
    "createdByUserId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "frequency" TEXT NOT NULL,
    "hourOfDay" INTEGER NOT NULL DEFAULT 9,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "prompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastReportId" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scheduled_reports_organizationId_status_idx" ON "scheduled_reports"("organizationId", "status");
CREATE INDEX "scheduled_reports_nextRunAt_idx" ON "scheduled_reports"("nextRunAt");

ALTER TABLE "scheduled_reports"
    ADD CONSTRAINT "scheduled_reports_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "organizations"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "scheduled_reports"
    ADD CONSTRAINT "scheduled_reports_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId")
    REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
