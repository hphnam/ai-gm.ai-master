-- Enforce the polymorphic XOR invariant on hidden_messages at the DB level.
-- The service layer always sets exactly one of (notificationId, replyId),
-- but the schema permits both NULL or both non-null. A direct DB write or
-- a future code path could violate the invariant and produce orphan rows
-- that match neither query branch. CHECK constraint keeps the invariant
-- enforced even when the application layer misbehaves.

ALTER TABLE "hidden_messages"
  ADD CONSTRAINT "hidden_messages_xor"
  CHECK (("notificationId" IS NULL) <> ("replyId" IS NULL));
