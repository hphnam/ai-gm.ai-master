---
phase: 03-retrieval-layer
plan: 01
subsystem: database
tags: [prisma, pgvector, postgres, claude, enrichment, migration, agentic-kb]

requires:
  - phase: 02-embeddings-seeding
    provides: EmbeddingsService + Claude-enrichment pattern + deterministic fixture UUIDs
provides:
  - KnowledgeItem model (shapeless, metadata Json, vector(1024))
  - mock_* ops tables (mock_stock, mock_suppliers, mock_stock_categories, mock_purchase_orders, mock_purchase_order_items) with TEMPORARY comments
  - ChatMessage.retrievedItemIds + toolCallLog (generic, tool-agnostic)
  - Seeder rewritten with pure upsert pattern (no wipe); idempotent across runs
  - EnrichmentService renamed to enrichKnowledgeDoc() — freeform docType, fence-stripped JSON with fail-soft
affects: [03-02-agentic-ingest, 03-03-retrieval-ops-tools, 04-01-chat-tool-use, 04-03-adaptation-loop]

tech-stack:
  added: []
  patterns:
    - Two-step destructive migration — prisma migrate diff → review → prisma migrate deploy (non-interactive, approval-gated)
    - Pure-upsert seeder (no deleteMany wipe) keyed by stable fixture UUIDs
    - Freeform agentic metadata — JSON blob on knowledge_items, tags/docType/category live inside; no enum columns

key-files:
  created:
    - packages/database/prisma/migrations/20260418173000_agentic_kb_reshape/migration.sql
  modified:
    - packages/database/prisma/schema.prisma
    - apps/api/src/modules/seed/seed-data.ts
    - apps/api/src/modules/seed/seed.command.ts
    - apps/api/src/modules/seed/enrichment.service.ts
    - apps/api/scripts/probe-seed.ts
    - .paul/ROADMAP.md
    - .paul/PROJECT.md

key-decisions:
  - "Destructive migration applied via migrate diff + migrate deploy (not migrate dev) — Prisma 7 migrate dev is interactive-only; diff gives us reviewable SQL for the approval checkpoint"
  - "Pure upsert seeder replaces deleteMany+create — true idempotency; matches audited AC-3 claim"
  - "metadata Json default is {} (object); toolCallLog default is [] (ordered list of tool calls)"
  - "Prisma migrate dev --create-only in non-interactive shells is blocked by TTY check — use migrate diff --from-config-datasource --to-schema --script as the offline equivalent"

patterns-established:
  - "Prisma destructive migration in non-interactive env: migrate diff → write to migrations/{ts}_name/migration.sql → surface to human → migrate deploy"
  - "Enrichment prompt contract: strict JSON object, no fences, validated keys; on validation failure emit { event: enrichment.failsafe, title, reason } log line for probe correlation"
  - "Probe thresholds: strict (hard fail) / soft (WARN only) / hard-fail-above-threshold — tiered, not binary"

duration: 40min
started: 2026-04-18T17:00:00Z
completed: 2026-04-18T17:40:00Z
---

# Phase 3 Plan 01: Agentic Knowledge Layer — Schema Reshape Summary

**Database reshaped from `SopDocument`/`StockItem` enum-typed split to a shapeless `KnowledgeItem` + honest `mock_*` ops tables; seeder rewritten to pure upsert; all 6 knowledge docs enriched with freeform Claude-authored docTypes and re-embedded.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~40 min (APPLY); ~90 min including PLAN rewrite + enterprise audit |
| Started | 2026-04-18T17:00:00Z |
| Completed | 2026-04-18T17:40:00Z |
| Tasks | 4 of 4 completed |
| Files modified | 7 (1 created migration, 6 edited) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Schema shape-free on knowledge, honest-mock on ops | PASS | `prisma validate` clean; grep for SopDocument/StockItem/aiTags/retrievedSopIds returns empty; all 5 Mock* models have `@@map` + TEMPORARY comment; KnowledgeItem has Json metadata + embedding + no enum |
| AC-2: Migration applies cleanly + Prisma client regenerates | PASS | Migration `20260418173000_agentic_kb_reshape` applied; `migrate status` = in sync; `pnpm -w build` exits 0 across all 4 packages; `CREATE EXTENSION vector` preserved from init migration |
| AC-3: Seeder rewritten and verified against new schema | PASS | `pnpm seed` runs end-to-end with Claude enrichment; all 6 knowledge_items have embedding + metadata.tags array + docType; all 24 mock_stock embedded; 2 consecutive runs idempotent (row counts stable, embeddings refreshed) |
| AC-4: No references to old shape remain | PASS | Pass-1 grep: zero matches. Pass-2 grep (\b(StockItem\|Supplier\|...)\b \| grep -v Mock): 1 match in markdown fixture prose inside Weekly Ordering Guide SOP — business content, not a code identifier. `pnpm -w build` exits 0. |

## Accomplishments

- Schema is now agentic-ready: `KnowledgeItem.metadata Json` + `embedding vector(1024)` + `aiSummary` with zero enum constraints. Claude inferred 6 distinct docTypes freely during seed: `troubleshooting guide`, `best practice guide`, `checklist`, `closing checklist`, `emergency procedure`, `ordering guide` — exactly the "no predefined taxonomy" behaviour the phase rescoping required.
- Ops data honestly labelled: 5 `mock_*` tables with `/// TEMPORARY — replaced by Xero/Square in a later milestone` schema comments. Future integrations swap in via adapter replacement, not schema change.
- `ChatMessage` now tool-agnostic: `retrievedItemIds String[]` + `toolCallLog Json @default("[]")` — shape won't need changing when Plan 04-01 adds Claude tool use.
- Seeder truly idempotent via pure upsert (no more deleteMany wipe). Re-running `pnpm seed` refreshes embeddings + metadata without disturbing row identity.

## Task Commits

Plan work is uncommitted at the end of APPLY — will be committed as a single `feat(03): agentic KB schema reshape` atomic commit during transition (phase 3 is still in progress, no phase-commit yet).

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Rewrite schema.prisma | pending | feat | KnowledgeItem + Mock* rename + ChatMessage reshape |
| Task 2: Generate + apply migration | pending | feat | 20260418173000_agentic_kb_reshape applied to NeonDB |
| Task 3: Rewrite seeder for new schema | pending | feat | Upsert pattern + enrichKnowledgeDoc + tiered probe |
| Task 4: Sweep + ROADMAP + PROJECT | pending | docs | ROADMAP + PROJECT.md updated to agentic-KB phase shape |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/database/prisma/schema.prisma` | Modified | KnowledgeItem replaces SopDocument; 5 Mock* models with @@map + TEMPORARY; ChatMessage retrievedItemIds + toolCallLog |
| `packages/database/prisma/migrations/20260418173000_agentic_kb_reshape/migration.sql` | Created | DROPs 6 tables, CREATEs 6 tables, ALTERs ChatMessage — applied to NeonDB |
| `apps/api/src/modules/seed/seed-data.ts` | Modified | Renamed exports: `mockSupplierSeeds`, `mockStockCategorySeeds`, `mockStockSeeds`, `knowledgeSeeds`; types `MockStockSeed`, `KnowledgeSeed`. Fixture content preserved verbatim. |
| `apps/api/src/modules/seed/seed.command.ts` | Modified | Removed deleteMany wipe; pure upsert in FK order; raw-SQL vector refresh post-upsert |
| `apps/api/src/modules/seed/enrichment.service.ts` | Modified | `enrichKnowledgeDoc()` returns `{ aiSummary, metadata: { docType, tags, category } }`; freeform docType prompt; structured `enrichment.failsafe` log on fallback |
| `apps/api/scripts/probe-seed.ts` | Modified | New table names; tiered thresholds (strict/soft/hard-fail); latency assertion; docType coverage check |
| `.paul/ROADMAP.md` | Modified | Phase 3 renamed "Agentic Knowledge Layer"; plan counts updated (3/3/2); phase descriptions rewritten |
| `.paul/PROJECT.md` | Modified | Current State = Phase 3 in progress; Active/Planned/Out of Scope updated; Key Decisions row added |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Use `prisma migrate diff --from-config-datasource --to-schema --script` instead of `prisma migrate dev --create-only` | Prisma 7 `migrate dev` enforces TTY and blocks in non-interactive shells; `migrate diff` is the non-interactive equivalent and produces the same SQL | All future destructive-DDL plans in non-interactive contexts follow this pattern |
| Apply migration via `prisma migrate deploy` after manually writing the diff output to a timestamped migrations folder | `migrate deploy` is non-interactive, applies pending migrations, and records them in `_prisma_migrations` — correct for both the approval-gated APPLY flow and future prod deploys | Consistent "generate → review → deploy" workflow |
| `VenueContact` upserted by `findFirst` + conditional create/update (no unique key on venue/name/role) | `VenueContact` has no natural unique key in the schema; preserving that rather than adding one keeps this plan scoped | Future plan may add a composite unique if venue contacts become first-class entities |
| `metadata` default `{}` vs `toolCallLog` default `[]` | Metadata is a keyed object (docType, tags, category). Tool call log is an ordered list — same tool can be called twice per turn. | Matches audit finding #4; Plan 04-01 consumes both with correct type expectations out of the box |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Minor — non-interactive migrate dev workaround + VenueContact upsert via findFirst |
| Scope additions | 0 | None |
| Deferred | 0 | Audit-deferred items already logged pre-APPLY |

**Total impact:** Essential workarounds for Prisma's interactive-only migrate dev; both produce the same DB state as the plan intended.

### Auto-fixed Issues

**1. [Migration] Prisma `migrate dev --create-only` refuses non-interactive terminal**
- **Found during:** Task 2 (migration generation)
- **Issue:** `prisma migrate dev --create-only --name agentic_kb_reshape` errored with `Error: Prisma Migrate has detected that the environment is non-interactive`. Piping `y` to stdin did not help — Prisma checks `isatty`, not stdin content.
- **Fix:** Used `pnpm exec prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script -o migrations/20260418173000_agentic_kb_reshape/migration.sql` to generate the SQL offline; surfaced to user via checkpoint; applied with `pnpm exec prisma migrate deploy`.
- **Files:** `packages/database/prisma/migrations/20260418173000_agentic_kb_reshape/migration.sql`
- **Verification:** `prisma migrate status` reports "in sync"; SQL inspection matches the audit's review checklist (a)–(e).
- **Commit:** pending (Task 2 scope)

**2. [Seeder] `VenueContact.upsert` has no natural unique key to target in `where`**
- **Found during:** Task 3 (seeder rewrite)
- **Issue:** `VenueContactSeed` has no `id` field in the fixture — the contact fixture only specifies `{ venueId, name, role, phone, email, isEmergencyContact, notes }`. Prisma `upsert` requires a unique `where` target.
- **Fix:** Replaced `upsert` with `findFirst({ where: { venueId, name, role } }) → update or create` pattern for this one model only. All other upserts use stable fixture `id`s.
- **Files:** `apps/api/src/modules/seed/seed.command.ts`
- **Verification:** Idempotency test (2 consecutive `pnpm seed` runs) shows `venue_contacts` count stable at 4.
- **Commit:** pending (Task 3 scope)

### Deferred Items

None new from APPLY. All five audit-deferred items (unit tests, prod-DB write-protect, metadata Zod schema, vector index, statement_timeout) remain tracked in STATE.md with explicit scope-owners or triggers.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `migrate dev --create-only` interactive-only in Prisma 7 | Switched to `migrate diff --script` + manual folder scaffold + `migrate deploy` |
| Markdown-table false positive in AC-4 sweep (line 339 of seed-data.ts contains literal `| Supplier |` inside fixture prose) | Not a code reference — prose inside a markdown table within the Weekly Ordering Guide SOP content. Accepted as a known fixture-content hit. |

## Next Phase Readiness

**Ready:**
- `KnowledgeItem` schema stands ready for Plan 03-02 (agentic ingest pipeline — Claude-authored freeform metadata beyond the current `{ docType, tags, category }` starter shape).
- `MockStock` + `MockSupplier` + `MockPurchaseOrder*` stand ready for Plan 03-03 (knowledge retrieval + mock-ops tool adapters).
- `ChatMessage.retrievedItemIds` + `toolCallLog` columns stand ready for Plan 04-01 (Claude tool-use chat orchestration) with zero additional schema change required.
- `enrichKnowledgeDoc()` is a working Claude-enrichment pathway; Plan 03-02 extends the prompt to include cross-references, emergent keys, and richer metadata without changing the DB side.
- Stable fixture IDs (`d0000000-*` for mock stock, `e0000000-*` for knowledge items) can be hardcoded in Plan 03-03 retrieval tests.

**Concerns:**
- `enrichment.failsafe` log event emits structured JSON inside a `logger.warn()` string — if Plan 04-03 (adaptation loop) needs to consume this signal programmatically, it will need a log-line extractor or a dedicated sink. Not blocking, but worth noting when designing the re-tag queue.
- `VenueContact` has no composite unique key — if Plan 03-02 or 04-01 extends venue-contact retrieval and contacts multiply, revisit to add `@@unique([venueId, name, role])`.
- No vector index yet — fine at 30 total embedded rows; triggers documented in STATE.md Deferred Issues (1000 rows or p95 >500ms).

**Blockers:**
- None. Plan 03-02 can start immediately.

---
*Phase: 03-retrieval-layer (renamed: Agentic Knowledge Layer), Plan: 01*
*Completed: 2026-04-18*
