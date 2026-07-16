-- Per-member venue scope. Empty array = access to every venue in the org.
ALTER TABLE "organization_members" ADD COLUMN "venueIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "invitations" ADD COLUMN "venueIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "whatsapp_invites" ADD COLUMN "venueIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
