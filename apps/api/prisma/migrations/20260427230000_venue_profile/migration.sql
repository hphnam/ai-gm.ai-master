-- Phase D (Task #8) — Venue.profile holds structured operational context
-- (layout, fire escapes, first-aid points, hours, alarm policy, what3words,
-- floor plan ref). Indexed via SearchableEntity (entityType='venue_profile')
-- so the agent can find "where's the fire exit at the Crown" by name.

ALTER TABLE "Venue"
  ADD COLUMN "profile" JSONB NOT NULL DEFAULT '{}';
