-- Additive seed (Track B, edit #3): activate the always-on Proactive Brain
-- provider for every organisation so IntegrationRegistry.resolveActiveProvider
-- returns it at dispatch time. The brain is internal infrastructure, not a
-- customer SaaS, so there is no connect-UI / OAuth flow and no real credential:
-- BrainService never decrypts the token, so accessTokenCipher is a sentinel.
--
-- Idempotent via the @@unique([organizationId, provider]) constraint.
-- Run only against a local dev DB (never a remote/migrate target).
--
--   psql "$DATABASE_URL" -f apps/api/prisma/seed-brain.sql

INSERT INTO integrations (
  "id", "organizationId", "provider", "status", "authMode",
  "accessTokenCipher", "scopes", "environment", "metadata",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), o."id", 'brain', 'active', 'none',
  'v1:brain-no-credential', '{}', 'production', '{}'::jsonb,
  now(), now()
FROM organizations o
ON CONFLICT ("organizationId", "provider") DO NOTHING;
