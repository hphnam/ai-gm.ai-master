-- CreateTable
CREATE TABLE "message_feedback" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retag_queue_items" (
    "id" TEXT NOT NULL,
    "knowledgeItemId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "sourceMessageId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retag_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_feedback_messageId_key" ON "message_feedback"("messageId");

-- CreateIndex
CREATE INDEX "retag_queue_items_status_createdAt_idx" ON "retag_queue_items"("status", "createdAt");

-- CreateIndex
CREATE INDEX "retag_queue_items_knowledgeItemId_status_idx" ON "retag_queue_items"("knowledgeItemId", "status");

-- CreateIndex
CREATE INDEX "retag_queue_items_sourceMessageId_idx" ON "retag_queue_items"("sourceMessageId");

-- AddForeignKey
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retag_queue_items" ADD CONSTRAINT "retag_queue_items_knowledgeItemId_fkey" FOREIGN KEY ("knowledgeItemId") REFERENCES "knowledge_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retag_queue_items" ADD CONSTRAINT "retag_queue_items_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
