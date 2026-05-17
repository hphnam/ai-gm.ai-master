-- Spec metric I — time-to-competency.
-- Anchors the 14-day onboarding window per (user, org) so we can score how
-- often new staff still repeat questions during the window. Set on member
-- create; bumped forward when a WhatsApp invite is redeemed for the same
-- (user, org) pair after the membership row already exists.

ALTER TABLE "organization_members"
    ADD COLUMN "onboardingStartedAt" TIMESTAMP(3);

-- One-time backfill: anchor every existing row to the later of its
-- membership createdAt and the most recent WhatsApp invite redemption
-- targeting the same user + org. Run inside the migration so the new
-- column is immediately useful for historical members; no separate seed
-- step required and the update is idempotent on the NULL column.
UPDATE "organization_members" om
SET "onboardingStartedAt" = GREATEST(
    om."createdAt",
    COALESCE(
        (
            SELECT MAX(wi."redeemedAt")
            FROM "whatsapp_invites" wi
            WHERE wi."organizationId" = om."organizationId"
              AND wi."targetUserId" = om."userId"
              AND wi."redeemedAt" IS NOT NULL
        ),
        om."createdAt"
    )
)
WHERE om."onboardingStartedAt" IS NULL;
