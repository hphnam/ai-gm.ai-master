-- CreateTable
CREATE TABLE "expiry_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "venueId" TEXT,
    "knowledgeItemId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "personUserId" TEXT,
    "personName" TEXT,
    "assetName" TEXT,
    "renewalCostGbp" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'active',
    "reminded30At" TIMESTAMP(3),
    "reminded7At" TIMESTAMP(3),
    "reminded1At" TIMESTAMP(3),
    "remindedOverdueAt" TIMESTAMP(3),
    "extractionConfidence" DECIMAL(3,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expiry_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expiry_records_organizationId_status_expiresAt_idx"
    ON "expiry_records"("organizationId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "expiry_records_status_expiresAt_idx"
    ON "expiry_records"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "expiry_records_knowledgeItemId_idx"
    ON "expiry_records"("knowledgeItemId");

-- AddForeignKey
ALTER TABLE "expiry_records" ADD CONSTRAINT "expiry_records_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expiry_records" ADD CONSTRAINT "expiry_records_venueId_fkey"
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expiry_records" ADD CONSTRAINT "expiry_records_knowledgeItemId_fkey"
    FOREIGN KEY ("knowledgeItemId") REFERENCES "knowledge_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expiry_records" ADD CONSTRAINT "expiry_records_personUserId_fkey"
    FOREIGN KEY ("personUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
