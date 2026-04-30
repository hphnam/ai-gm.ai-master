-- AlterTable
ALTER TABLE "ChatConversation" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ChatConversation_deletedAt_idx" ON "ChatConversation"("deletedAt");
