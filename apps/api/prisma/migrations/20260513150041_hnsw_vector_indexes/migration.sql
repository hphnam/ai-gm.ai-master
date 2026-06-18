-- HNSW indexes for pgvector cosine similarity searches. Prior state used
-- sequential scans on both embedding columns; with the chunk-level retrieval
-- path added in the chat-overhaul work, scan cost grows ~10× as the chunk
-- table is roughly that much larger than searchable_entities. These indexes
-- keep retrieval sub-second as the corpus grows.
--
-- m=16, ef_construction=64 are pgvector defaults — good recall vs build-time
-- tradeoff. ef_search defaults to 40 at query time which is fine for our
-- top-200 chunk pool.
--
-- ──────────────────────────────────────────────────────────────────────
-- PROD ROLLOUT WARNING — read before running `prisma migrate deploy` on
-- a populated production DB.
-- ──────────────────────────────────────────────────────────────────────
-- CREATE INDEX (the form below) runs inside Prisma's migration transaction
-- and acquires SHARE on the table, blocking writes for the duration of the
-- build. HNSW build is O(N · log N) and on a chunk table with hundreds of
-- thousands of rows can take many minutes — that's a write-lock window.
--
-- For dev / small tenants (≤ a few thousand rows) this completes in
-- seconds and is safe. For prod rollout against a populated DB:
--   1. SKIP this migration via `prisma migrate resolve --applied`.
--   2. Run the indexes manually with `CREATE INDEX CONCURRENTLY ...`
--      (does not block writes, cannot run inside a transaction).
--   3. Verify with `SELECT indexname FROM pg_indexes WHERE tablename IN
--      ('knowledge_chunks','searchable_entities');`.
--
-- `IF NOT EXISTS` makes both variants idempotent so a manual-build prod
-- env stays in sync with the recorded migration state.
-- ──────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_hnsw_idx"
  ON "knowledge_chunks"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS "searchable_entities_embedding_hnsw_idx"
  ON "searchable_entities"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
