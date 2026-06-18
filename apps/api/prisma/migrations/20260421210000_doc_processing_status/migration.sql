-- Async upload pipeline — rows land 'processing' while classifier /
-- embeddings / checklist extraction run in the background, then flip to
-- 'ready' (or 'failed' with an error string). Existing rows default to
-- 'ready' so the retroactive state stays visible + retrievable.

ALTER TABLE "knowledge_items"
  ADD COLUMN "processingStatus" TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN "processingError" TEXT;

-- Partial index — polling queries only care about rows still in flight.
-- Full index wasted since 99% of rows are 'ready'.
CREATE INDEX "knowledge_items_processingStatus_idx"
  ON "knowledge_items" ("processingStatus")
  WHERE "processingStatus" <> 'ready';
