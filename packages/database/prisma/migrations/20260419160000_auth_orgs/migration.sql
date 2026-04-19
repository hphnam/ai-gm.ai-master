-- ─────────────────────────────────────────────────────────────────────────
-- v0.2 Phase 1 — Auth + Organizations
-- Plan: .paul/phases/01-auth-organizations/01-01-PLAN.md
-- Audit: .paul/phases/01-auth-organizations/01-01-AUDIT.md (M3 + S14 applied)
--
-- ROLLBACK WARNING: dropping organization_id from venues + the 7 auth/org
-- tables is destructive. Any User / Session / Account / Organization /
-- OrganizationMember / Invitation / VerificationToken data created AFTER
-- this migration is applied is UNRECOVERABLE via rollback (no backup table).
-- Rollback is only safe within the deploy window, BEFORE real user data
-- is written.
-- Rollback procedure: pnpm --filter @gm-ai/database migrate:rollback-phase-1
-- (see plan 01-01 AC-1 for full procedure — run `prisma migrate resolve
-- --rolled-back 20260419160000_auth_orgs` after manually dropping the new
-- tables + Venue.organizationId column)
-- ─────────────────────────────────────────────────────────────────────────

-- CreateTable: Organizations first (FK target for venues)
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- Seed Demo Organization INLINE (audit-added M3 idempotent — ON CONFLICT DO NOTHING)
-- The demo USER + MEMBER rows are seeded separately by pnpm seed (seed-data.ts /
-- migrate-phase-1-data.ts), which also reads DEMO_USER_EMAIL + DEMO_USER_PASSWORD
-- from the env and enforces the prod-safe guard (M4).
INSERT INTO "organizations" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('b9000000-0000-4000-8000-000000000001', 'Demo Organization', 'demo', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- CreateTable: Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "phoneNumber" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateTable: Sessions
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "activeOrganizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateTable: Accounts
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "password" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateTable: Verification Tokens
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "verification_tokens_identifier_idx" ON "verification_tokens"("identifier");

-- CreateTable: Organization Members
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organization_members_organizationId_idx" ON "organization_members"("organizationId");
CREATE UNIQUE INDEX "organization_members_userId_organizationId_key" ON "organization_members"("userId", "organizationId");

-- CreateTable: Invitations
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inviterId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invitations_email_idx" ON "invitations"("email");
CREATE INDEX "invitations_organizationId_idx" ON "invitations"("organizationId");

-- ─────────────────────────────────────────────────────────────────────────
-- Venue.organizationId — TWO-STEP pattern (audit-added M3)
--   1) ADD COLUMN nullable
--   2) UPDATE existing rows (idempotent WHERE IS NULL)
--   3) ALTER COLUMN NOT NULL
--   4) ADD FK constraint
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE "Venue" ADD COLUMN "organizationId" TEXT;

-- Idempotent backfill: only touches rows where organizationId IS NULL
UPDATE "Venue"
   SET "organizationId" = 'b9000000-0000-4000-8000-000000000001'
 WHERE "organizationId" IS NULL;

ALTER TABLE "Venue" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX "Venue_organizationId_idx" ON "Venue"("organizationId");

-- ─────────────────────────────────────────────────────────────────────────
-- Foreign Keys
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE "Venue" ADD CONSTRAINT "Venue_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviterId_fkey"
  FOREIGN KEY ("inviterId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
