-- Plan 01-01 (v0.3 Hierarchical Retrieval) — additive doc → section → chunk schema.
-- Existing knowledge_items.embedding remains source-of-truth until 01-02 backfill swap.
-- audit-S1 CHECK constraints added for DB-level invariants on numeric columns.

-- CreateTable
CREATE TABLE "knowledge_sections" (
    "id" TEXT NOT NULL,
    "knowledgeItemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sectionIndex" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "sectionVersion" INTEGER NOT NULL DEFAULT 1,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1024),
    "embeddingText" TEXT,
    "tokenCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_sections_organizationId_idx" ON "knowledge_sections"("organizationId");

-- CreateIndex
CREATE INDEX "knowledge_sections_knowledgeItemId_idx" ON "knowledge_sections"("knowledgeItemId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_sections_knowledgeItemId_sectionIndex_key" ON "knowledge_sections"("knowledgeItemId", "sectionIndex");

-- CreateIndex
CREATE INDEX "knowledge_chunks_organizationId_idx" ON "knowledge_chunks"("organizationId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_sectionId_idx" ON "knowledge_chunks"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_chunks_sectionId_chunkIndex_key" ON "knowledge_chunks"("sectionId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "knowledge_sections" ADD CONSTRAINT "knowledge_sections_knowledgeItemId_fkey" FOREIGN KEY ("knowledgeItemId") REFERENCES "knowledge_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sections" ADD CONSTRAINT "knowledge_sections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "knowledge_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- audit-S1: DB-level CHECK constraints on numeric columns (prevents latent insert bugs).
ALTER TABLE "knowledge_sections" ADD CONSTRAINT "knowledge_sections_token_count_nonneg" CHECK ("tokenCount" >= 0);
ALTER TABLE "knowledge_sections" ADD CONSTRAINT "knowledge_sections_section_index_nonneg" CHECK ("sectionIndex" >= 0);
ALTER TABLE "knowledge_sections" ADD CONSTRAINT "knowledge_sections_section_version_pos" CHECK ("sectionVersion" >= 1);
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_token_count_nonneg" CHECK ("tokenCount" >= 0);
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_chunk_index_nonneg" CHECK ("chunkIndex" >= 0);
