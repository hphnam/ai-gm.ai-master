-- CreateTable
CREATE TABLE "notification_replies" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_replies_notificationId_createdAt_idx"
    ON "notification_replies"("notificationId", "createdAt");

-- AddForeignKey
ALTER TABLE "notification_replies" ADD CONSTRAINT "notification_replies_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_replies" ADD CONSTRAINT "notification_replies_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
