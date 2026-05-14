-- Wave 3 — third-party integrations.
-- Adds the generic `integrations` table (one row per (org, provider)) and the
-- `squareLocationId` mapping on `Venue` so the chat agent can resolve a venue
-- to its Square location at tool-call time.

ALTER TABLE "Venue" ADD COLUMN "squareLocationId" TEXT;

CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "authMode" TEXT NOT NULL,
    "accessTokenCipher" TEXT NOT NULL,
    "refreshTokenCipher" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "externalAccountId" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "lastError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integrations_organizationId_provider_key" ON "integrations"("organizationId", "provider");
CREATE INDEX "integrations_organizationId_idx" ON "integrations"("organizationId");

ALTER TABLE "integrations"
    ADD CONSTRAINT "integrations_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
