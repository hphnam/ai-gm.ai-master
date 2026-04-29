-- Phase G (Task #18) — IncidentLog. Captures agent-driven incident records
-- (called via the log_incident tool from incident-mode conversations) plus
-- manual filings later. Indexed by venue + recency for the GM dashboard.

CREATE TABLE "incident_logs" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "venueId"        TEXT NOT NULL,
  "loggedByUserId" TEXT,
  "sourceMessageId" TEXT,
  "severity"       TEXT NOT NULL DEFAULT 'minor',
  "summary"        TEXT NOT NULL,
  "details"        JSONB NOT NULL DEFAULT '{}',
  "status"         TEXT NOT NULL DEFAULT 'open',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incident_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "incident_logs_organizationId_createdAt_idx"
  ON "incident_logs"("organizationId", "createdAt" DESC);
CREATE INDEX "incident_logs_venueId_createdAt_idx"
  ON "incident_logs"("venueId", "createdAt" DESC);

ALTER TABLE "incident_logs"
  ADD CONSTRAINT "incident_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "incident_logs"
  ADD CONSTRAINT "incident_logs_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
