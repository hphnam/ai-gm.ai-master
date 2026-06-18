-- Phase 03 — Share-chat visibility flag.
--
-- Adds ChatConversation.visibility ('private' | 'org'). Defaults to 'private'
-- so existing rows stay owner-only. 'org' is set by the share toggle and lets
-- any user with an active session in the conversation's organization read via
-- the link. Sends, deletes, and visibility flips remain owner-only regardless.
--
-- Hand-authored migration (skipping `migrate dev`) so the registered
-- searchable_entities.searchVector drift (D-06-01-H, see 06-01 migration
-- header) is not dragged into the generated diff. Single ADD COLUMN with a
-- constant DEFAULT — Postgres 11+ treats this as metadata-only, no row
-- rewrite, no concurrent-write block.

ALTER TABLE "ChatConversation"
  ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private';