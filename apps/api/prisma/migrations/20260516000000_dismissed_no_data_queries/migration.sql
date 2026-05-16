-- Per-org dismissal list for the "what staff couldn't find" panel.
-- Suppresses a no-data query from the analytics surface after the owner either
-- promotes it to a KB gap or explicitly dismisses it. Stores the lowercased
-- query so it matches the LOWER(query) grouping used by listNoDataQueries.

CREATE TABLE "dismissed_no_data_queries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "queryLower" TEXT NOT NULL,
    "dismissedByUserId" TEXT,
    "promotedGapId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dismissed_no_data_queries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dismissed_no_data_queries_org_query_unique"
    ON "dismissed_no_data_queries"("organizationId", "queryLower");

CREATE INDEX "dismissed_no_data_queries_organizationId_idx"
    ON "dismissed_no_data_queries"("organizationId");

ALTER TABLE "dismissed_no_data_queries"
    ADD CONSTRAINT "dismissed_no_data_queries_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dismissed_no_data_queries"
    ADD CONSTRAINT "dismissed_no_data_queries_dismissedByUserId_fkey"
    FOREIGN KEY ("dismissedByUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
