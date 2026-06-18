-- Per-org tunables for derived KPIs. First consumer is the "hours recovered"
-- headline (spec metric B) — minutes saved per successful find_knowledge call
-- and the £/hr rate used to convert to operational value.
--
-- Decimal(6,2) covers 0.00 → 9999.99 minutes per query — well above any
-- realistic tuning. hoursRecoveredHourlyRateCents stays integer pennies to
-- keep £ math integer-only on the read path.

CREATE TABLE "metrics_config" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hoursRecoveredMinutesPerQuery" DECIMAL(6,2) NOT NULL DEFAULT 4.2,
    "hoursRecoveredHourlyRateCents" INTEGER NOT NULL DEFAULT 2500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metrics_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "metrics_config_organizationId_key"
    ON "metrics_config"("organizationId");

ALTER TABLE "metrics_config"
    ADD CONSTRAINT "metrics_config_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: give every existing org a default row so the service can rely on
-- a 1:1 relation without a per-request upsert. New orgs get their row from
-- application code (or a follow-up migration once we wire the OrgService).
INSERT INTO "metrics_config" ("id", "organizationId", "updatedAt")
SELECT gen_random_uuid(), "id", CURRENT_TIMESTAMP
FROM "organizations"
ON CONFLICT ("organizationId") DO NOTHING;
