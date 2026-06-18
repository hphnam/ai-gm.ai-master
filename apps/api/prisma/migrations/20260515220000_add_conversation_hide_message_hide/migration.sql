-- Wave 6 — WhatsApp-style delete affordances for the Conversations surface.
--
-- conversation_hidden: per-user "delete chat" hides the conversation from
-- the requesting user's list only. When a new chat message lands between
-- the same (userId, otherUserId) pair, the matching row is deleted
-- server-side so the conversation resurfaces — handled in the compose path,
-- not the migration.
--
-- hidden_messages: per-user "delete for me" on a single message. Polymorphic-
-- ish: exactly one of notificationId / replyId is set. Unique pairs prevent
-- dupes from a double-click. "Delete for everyone" doesn't write here — it
-- hard-deletes the underlying row and these rows cascade.

CREATE TABLE "conversation_hidden" (
  "userId"         TEXT NOT NULL,
  "otherUserId"    TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "hiddenAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversation_hidden_pkey"
    PRIMARY KEY ("userId", "otherUserId", "organizationId"),
  CONSTRAINT "conversation_hidden_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "conversation_hidden_otherUserId_fkey"
    FOREIGN KEY ("otherUserId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "conversation_hidden_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
);

CREATE INDEX "conversation_hidden_userId_organizationId_idx"
  ON "conversation_hidden" ("userId", "organizationId");

CREATE TABLE "hidden_messages" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "notificationId" TEXT,
  "replyId"        TEXT,
  "hiddenAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "hidden_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hidden_messages_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "hidden_messages_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE,
  CONSTRAINT "hidden_messages_replyId_fkey"
    FOREIGN KEY ("replyId") REFERENCES "notification_replies"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "hidden_messages_userId_notificationId_key"
  ON "hidden_messages" ("userId", "notificationId");
CREATE UNIQUE INDEX "hidden_messages_userId_replyId_key"
  ON "hidden_messages" ("userId", "replyId");
CREATE INDEX "hidden_messages_userId_idx"
  ON "hidden_messages" ("userId");
