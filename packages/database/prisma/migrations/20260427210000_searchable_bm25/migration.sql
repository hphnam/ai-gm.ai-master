-- Phase B (Task #3) — hybrid retrieval. Add a generated tsvector column over
-- embeddingText + title + summary so BM25 lexical scoring complements pgvector
-- cosine similarity. Generated columns auto-maintain on insert/update — no
-- triggers, no app-side bookkeeping.

ALTER TABLE "searchable_entities"
  ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE("title",   '')), 'A') ||
    setweight(to_tsvector('english', COALESCE("summary", '')), 'B') ||
    setweight(to_tsvector('english', COALESCE("embeddingText", '')), 'C')
  ) STORED;

CREATE INDEX "searchable_entities_searchVector_idx"
  ON "searchable_entities" USING GIN ("searchVector");
