-- Plan 04-02 Task 2 — per-tenant DocumentType taxonomy (AI-as-GM foundation).
-- Additive: new table + two nullable columns on knowledge_items + index + FKs.
-- All pre-04-02 knowledge_items rows remain valid (documentTypeId NULL =
-- "unclassified" state; pendingTypeProposal NULL = no pending owner decision).

-- CreateTable
CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL DEFAULT '{}',
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_types_organizationId_name_key" ON "document_types"("organizationId", "name");
CREATE INDEX "document_types_organizationId_idx" ON "document_types"("organizationId");

-- AddForeignKey (document_types → organizations)
ALTER TABLE "document_types"
    ADD CONSTRAINT "document_types_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (knowledge_items — additive nullable columns)
ALTER TABLE "knowledge_items"
    ADD COLUMN "documentTypeId" TEXT,
    ADD COLUMN "pendingTypeProposal" JSONB;

-- CreateIndex (knowledge_items)
CREATE INDEX "knowledge_items_documentTypeId_idx" ON "knowledge_items"("documentTypeId");

-- AddForeignKey (knowledge_items → document_types; SET NULL on type deletion)
ALTER TABLE "knowledge_items"
    ADD CONSTRAINT "knowledge_items_documentTypeId_fkey"
    FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
