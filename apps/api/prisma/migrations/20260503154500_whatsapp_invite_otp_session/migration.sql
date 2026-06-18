-- Phase 03-01 — WhatsApp Conversational UX
-- Identity binding + onboarding flow.
--
-- Adds three additive tables (no destructive change to existing schema):
--   whatsapp_invites       — manager-issued 24h codes (CSPRNG 8-char Crockford base32)
--   whatsapp_otp_attempts  — sha256-hashed 6-digit OTPs, 3 attempts, 10min TTL
--   whatsapp_sessions      — per-phone session state (sticky venue, last activity)
--
-- Boundaries:
--   - User.phoneNumber column unchanged — already @unique String? from 01-03
--   - Existing Invitation table (better-auth email-invite) unchanged — separate concern
--
-- Migration is reversible: DROP TABLE in reverse order (sessions → otp_attempts → invites)
-- and remove the @relation entries from User + Organization in schema.prisma.

-- CreateTable: whatsapp_invites
CREATE TABLE "whatsapp_invites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "issuedByUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "role" TEXT NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "whatsapp_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_invites_code_key" ON "whatsapp_invites"("code");
CREATE INDEX "whatsapp_invites_organizationId_status_idx" ON "whatsapp_invites"("organizationId", "status");
CREATE INDEX "whatsapp_invites_phoneNumber_status_idx" ON "whatsapp_invites"("phoneNumber", "status");
CREATE INDEX "whatsapp_invites_expiresAt_idx" ON "whatsapp_invites"("expiresAt");
CREATE INDEX "whatsapp_invites_issuedByUserId_createdAt_idx" ON "whatsapp_invites"("issuedByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "whatsapp_invites" ADD CONSTRAINT "whatsapp_invites_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_invites" ADD CONSTRAINT "whatsapp_invites_issuedByUserId_fkey"
    FOREIGN KEY ("issuedByUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "whatsapp_invites" ADD CONSTRAINT "whatsapp_invites_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- CreateTable: whatsapp_otp_attempts
CREATE TABLE "whatsapp_otp_attempts" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "hashedOtp" TEXT NOT NULL,
    "attemptsRemaining" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "whatsapp_otp_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_otp_attempts_inviteId_status_idx" ON "whatsapp_otp_attempts"("inviteId", "status");
CREATE INDEX "whatsapp_otp_attempts_expiresAt_idx" ON "whatsapp_otp_attempts"("expiresAt");

-- AddForeignKey
ALTER TABLE "whatsapp_otp_attempts" ADD CONSTRAINT "whatsapp_otp_attempts_inviteId_fkey"
    FOREIGN KEY ("inviteId") REFERENCES "whatsapp_invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: whatsapp_sessions
CREATE TABLE "whatsapp_sessions" (
    "phoneNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentOrganizationId" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("phoneNumber")
);

-- CreateIndex
CREATE INDEX "whatsapp_sessions_userId_idx" ON "whatsapp_sessions"("userId");

-- AddForeignKey
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_currentOrganizationId_fkey"
    FOREIGN KEY ("currentOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
