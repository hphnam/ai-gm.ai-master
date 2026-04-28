-- Phase H (Task #22) — search analytics. One row per find_knowledge call so
-- we can surface the top no-data queries to the GM ("staff are asking X but
-- you haven't documented it"). Query text is stored verbatim (org-scoped);
-- for chat history, this is fine — the staff already see their own queries.

CREATE TABLE "search_analytics" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "venueId"        TEXT,
  "userId"         TEXT,
  "query"          TEXT NOT NULL,
  "outcome"        TEXT NOT NULL,
  "hitCount"       INTEGER NOT NULL DEFAULT 0,
  "topSimilarity"  DOUBLE PRECISION,
  "reformulated"   BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "search_analytics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "search_analytics_organizationId_outcome_createdAt_idx"
  ON "search_analytics"("organizationId", "outcome", "createdAt" DESC);

ALTER TABLE "search_analytics"
  ADD CONSTRAINT "search_analytics_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
