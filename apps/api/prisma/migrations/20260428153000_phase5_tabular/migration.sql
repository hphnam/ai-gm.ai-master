-- Plan 05-01 (v0.3 Phase 5 Tabular Query Path) — additive structured-data path
-- alongside the embedded-text path. CSV/XLSX rows tee'd to tabular_rows at ingest;
-- query_document_table tool runs deterministic aggregates / enumerations over JSONB.
--
-- Hand-written (NOT `prisma migrate dev`) to avoid bleeding pre-existing schema drift
-- on searchable_entities.searchVector — same precedent as Plan 01-01 deviation D2.
-- KnowledgeItem.embedding column is byte-identical to baseline (Phase 1 AC-7 carry-forward).
--
-- audit-S1 carry-forward: CHECK constraint on tabular_columns.inferredType
-- (Prisma does not emit CHECK constraints natively).

-- CreateTable
CREATE TABLE "tabular_rows" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tabular_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabular_columns" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "inferredType" TEXT NOT NULL,

    CONSTRAINT "tabular_columns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tabular_rows_docId_idx" ON "tabular_rows"("docId");

-- CreateIndex
CREATE UNIQUE INDEX "tabular_rows_docId_rowIndex_key" ON "tabular_rows"("docId", "rowIndex");

-- CreateIndex
CREATE INDEX "tabular_columns_docId_idx" ON "tabular_columns"("docId");

-- CreateIndex
CREATE UNIQUE INDEX "tabular_columns_docId_name_key" ON "tabular_columns"("docId", "name");

-- AddForeignKey
ALTER TABLE "tabular_rows" ADD CONSTRAINT "tabular_rows_docId_fkey" FOREIGN KEY ("docId") REFERENCES "knowledge_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabular_columns" ADD CONSTRAINT "tabular_columns_docId_fkey" FOREIGN KEY ("docId") REFERENCES "knowledge_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- audit-S1 — DB-level invariant on inferredType (Prisma cannot emit this natively)
ALTER TABLE "tabular_columns" ADD CONSTRAINT "tabular_columns_inferredType_check"
    CHECK ("inferredType" IN ('number', 'date', 'string'));
