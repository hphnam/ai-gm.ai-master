-- Phase A1 — universal SearchableEntity index.
-- Denormalised vector + tag index across heterogeneous entities. The source
-- table for each row remains the source of truth; this table is purely a
-- retrieval surface. Existing knowledge_items.embedding + mock_stock.embedding
-- columns stay in place during transition; backfill copies them here.

CREATE TABLE "searchable_entities" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "venueId"        TEXT,
  "entityType"     TEXT NOT NULL,
  "entityId"       TEXT NOT NULL,
  "subKey"         TEXT NOT NULL DEFAULT '',
  "embedding"      vector(1024),
  "embeddingText"  TEXT NOT NULL,
  "tags"           TEXT[] NOT NULL DEFAULT '{}',
  "kind"           TEXT,
  "title"          TEXT,
  "summary"        TEXT,
  "metadata"       JSONB NOT NULL DEFAULT '{}',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "searchable_entities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "searchable_entities_entityType_entityId_subKey_key"
  ON "searchable_entities"("entityType", "entityId", "subKey");
CREATE INDEX "searchable_entities_organizationId_entityType_idx"
  ON "searchable_entities"("organizationId", "entityType");
CREATE INDEX "searchable_entities_organizationId_venueId_idx"
  ON "searchable_entities"("organizationId", "venueId");
CREATE INDEX "searchable_entities_tags_idx"
  ON "searchable_entities" USING GIN ("tags");

ALTER TABLE "searchable_entities"
  ADD CONSTRAINT "searchable_entities_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
