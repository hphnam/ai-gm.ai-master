-- Spec metric G — audit trail of AI-surfaced pricing recommendations.
-- Status lifecycle: pending (default) → adopted | dismissed. measuredUpliftCents
-- is populated by a downstream measurement loop (out of scope here) — left null
-- at create time and only flipped once the comparison window closes.

CREATE TABLE "pricing_recommendations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "sourceItemRef" TEXT NOT NULL,
    "sourceItemLabel" TEXT NOT NULL,
    "currentPriceCents" INTEGER NOT NULL,
    "recommendedPriceCents" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adoptedAt" TIMESTAMP(3),
    "adoptedPriceCents" INTEGER,
    "dismissedAt" TIMESTAMP(3),
    "dismissedReason" TEXT,
    "upliftWindowDays" INTEGER NOT NULL DEFAULT 30,
    "measuredUpliftCents" INTEGER,
    "measuredAt" TIMESTAMP(3),

    CONSTRAINT "pricing_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pricing_recommendations_organizationId_createdAt_idx"
    ON "pricing_recommendations"("organizationId", "createdAt" DESC);

CREATE INDEX "pricing_recommendations_venueId_status_idx"
    ON "pricing_recommendations"("venueId", "status");

ALTER TABLE "pricing_recommendations"
    ADD CONSTRAINT "pricing_recommendations_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pricing_recommendations"
    ADD CONSTRAINT "pricing_recommendations_venueId_fkey"
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
