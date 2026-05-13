-- 03-06 — Twilio Conversations API mapping.
-- One Conversation resource per phone number; SID required for every outbound
-- send + typing indicator. Adapter does find-or-create against this table.

CREATE TABLE "whatsapp_conversations" (
  "id" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "conversationSid" TEXT NOT NULL,
  "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_conversations_phoneNumber_key" ON "whatsapp_conversations"("phoneNumber");
CREATE UNIQUE INDEX "whatsapp_conversations_conversationSid_key" ON "whatsapp_conversations"("conversationSid");
