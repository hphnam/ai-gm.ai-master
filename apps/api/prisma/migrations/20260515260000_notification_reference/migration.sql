-- Add loose entity references on Notification so the alerts UI can offer
-- "Open task" / "Mark complete" / "Open report" without parsing entity ids
-- out of the body text. Both columns are nullable — chat-category and
-- ad-hoc notes don't point at anything.

ALTER TABLE "notifications" ADD COLUMN "referenceKind" TEXT;
ALTER TABLE "notifications" ADD COLUMN "referenceId" TEXT;
