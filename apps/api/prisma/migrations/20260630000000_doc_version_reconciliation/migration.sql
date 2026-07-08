-- Document version reconciliation: archive a superseded doc in place.
ALTER TABLE "knowledge_items"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "supersededAt" TIMESTAMP(3),
  ADD COLUMN "supersededById" TEXT;

ALTER TABLE "knowledge_items"
  ADD CONSTRAINT "knowledge_items_supersededById_fkey"
  FOREIGN KEY ("supersededById") REFERENCES "knowledge_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "knowledge_items_supersededById_idx" ON "knowledge_items"("supersededById");
