---
phase: 03-retrieval-layer
plan: 03
subsystem: api
tags: [nestjs, pgvector, cosine-similarity, tool-use, discriminated-union, zod, prisma, mock-ops]

requires:
  - phase: 03-retrieval-layer
    provides: KnowledgeItem + IngestService + KnowledgeMetadataSchema dist (from 03-01 + 03-02)
  - phase: 02-embeddings-seeding
    provides: EmbeddingsService (embedText with inputType query) + mock_* seeded fixtures
provides:
  - "@gm-ai/types ToolResult<T> discriminated union + ok()/fail() helpers + toolResultSchema factory (dist-published)"
  - KnowledgeRetrievalService — embed → pgvector cosine → honest no-data; UUID-validated venueId; 2048-char query cap; embedding fault isolation; PII-safe retrieval.call log
  - MockOpsService — 4 tool adapters (getStockBelowPar, getStockByName, getSupplierByName, getUpcomingCutoffs) with shared guarded() exception wrapper; supplierNotes exposes real cutoff text
  - probe-retrieval script — 9 assertions incl. retrieval-hit, retrieval no-data, below-par deterministic count, tool no-data path, venueId-scoped branch, invalid-venueId fail-fast
affects: [04-01-chat-tool-use, 04-02-proactive-suggestions, 04-03-adaptation-loop, 05-01-chat-ui]

tech-stack:
  added: []
  patterns:
    - "ToolResult<T> as universal service return contract — consumers switch on ok/reason, never try/catch around a tool call"
    - "Fail-fast venueId format validation at the method boundary — prevents Postgres-level UUID parse from surfacing as a raw exception"
    - "Embedding fault isolation — Voyage outage becomes fail('error', ...) not a thrown exception"
    - "PII-safe retrieval audit log — sha256 queryHash + queryLength, never raw query content"
    - "Deterministic ordering on all retrieval + list queries — similarity ASC + id ASC, Prisma orderBy with id tiebreak"
    - "Per-module probe Nest context (createApplicationContext(RetrievalModule)) — narrower than AppModule; pattern from 03-02 probe-ingest"
    - "Mock-ops file header TEMPORARY comment + @@map('mock_*') — visibly stubbed, not hidden spoofing"

key-files:
  created:
    - packages/types/src/tool-result.ts
    - apps/api/src/modules/retrieval/retrieval.module.ts
    - apps/api/src/modules/retrieval/retrieval.service.ts
    - apps/api/src/modules/mock-ops/mock-ops.module.ts
    - apps/api/src/modules/mock-ops/mock-ops.service.ts
    - apps/api/src/scripts/probe-retrieval.ts
  modified:
    - packages/types/src/index.ts
    - apps/api/src/app.module.ts
    - apps/api/package.json

key-decisions:
  - "ToolResult<T> as a discriminated union (not Result<T, E>) so consumers can exhaustive-switch on 'ok' AND 'reason' — a functional Result with a typed error parameter would force chat orchestration to parameterize every call site"
  - "Three reasons only: 'no-data' | 'not-supported' | 'error'. More categories reify speculative failure modes; this triad covers the POC surface and Phase 4 chat handling"
  - "Uniform guarded() wrapper on every MockOps method — exceptions become fail('error', ...). Contract: tool methods never throw, period"
  - "minSimilarity default 0.3 and clamp [0,1] — empirically: real-content queries hit 0.45-0.55 on 6-doc corpus; gibberish hits 0.15-0.20. 0.3 floor comfortably separates signal from noise"
  - "PII-safe retrieval call log (queryHash + queryLength only) replaces the initial 'query slice' draft — audit-tightened before APPLY"
  - "getUpcomingCutoffs exposes supplierNotes — the real 'order by 5pm' text from seed rather than only the synthetic hour approximation"

patterns-established:
  - "Tool contract: every public service method returns ToolResult<T>; no thrown exceptions to callers; fail('error', ...) on unexpected; fail('no-data', ...) on empty; fail('not-supported', ...) reserved for capability gating"
  - "Retrieval flow: trim → cap at 2048 chars → validate venueId UUID → clamp limit/minSim → try embed (fail-soft on Voyage outage) → raw pgvector SQL with similarity + id ASC sort → filter by minSim → log retrieval.call → return"
  - "MockOps flow: assertVenueId (if accepted) → guarded(async () => { Prisma query → empty-check → map → return })"
  - "Probe 9-pattern: exercise the hit path, the no-data path, the tool-level no-data path, each tool's happy path, and at least one fail-fast validation path"

duration: 45min
started: 2026-04-18T18:55:00Z
completed: 2026-04-18T19:15:00Z
---

# Phase 3 Plan 03: Knowledge Retrieval + Mock-Ops Tool Adapters Summary

**Shipped the read-side of the Agentic Knowledge Layer: a `KnowledgeRetrievalService` that does honest pgvector cosine search (returns `{ ok: false, reason: 'no-data' }` when similarity < 0.3 rather than hallucinating the closest-but-irrelevant match), a `MockOpsService` exposing four typed tool adapters (below-par stock, stock-by-name, supplier-by-name, upcoming-cutoffs — all envelope-wrapped and fault-isolated via a shared `guarded()` pattern), and a universal `ToolResult<T>` discriminated union in `@gm-ai/types` that Phase 4 chat orchestration will consume for all tool calls.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 min (plan + audit + apply + unify) |
| Started | 2026-04-18T18:55:00Z |
| Completed | 2026-04-18T19:15:00Z |
| Tasks | 4 / 4 completed |
| Files created | 6 |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: ToolResult envelope published | Pass | `@gm-ai/types` emits dist/tool-result.{js,d.ts}; runtime parse verified on both `ok('x')` and `fail('no-data', 'missing')` branches |
| AC-2: KnowledgeRetrievalService does honest vector search | Pass | Embedding fault isolation, UUID validation, 2048-char cap, deterministic `ASC, id ASC` ordering, non-optional PII-safe `retrieval.call` log — all grep-verified. Real query "ice machine not making ice" hit topSim=0.503; gibberish query yielded max sim 0.194 → no-data |
| AC-3: MockOpsService — 4 adapters, envelope-wrapped | Pass | All 4 methods use `guarded(async () => …)`; all validate venueId format upfront; `name ASC`/`id ASC` tiebreaks applied; `supplierNotes` exposed in getUpcomingCutoffs |
| AC-4: probe-retrieval — 9 assertions | Pass | All 9 ✓. Deterministic `getStockBelowPar >= 5` passed with 11 items (fixture). Invalid-venueId returned `ok:false, reason:error` without hitting DB |

## Verification Results

```
$ pnpm --filter @gm-ai/types build
> tsc
dist/tool-result.{js,d.ts} emitted (exit 0)

$ pnpm --filter api probe:retrieval
✓ retrieval hit: "ice machine" finds Ice Machine SOP (topSim=0.503, id=e0000000-0000-4000-8000-000000000001)
✓ retrieval no-data: gibberish query returns ok:false (max similarity 0.194 below threshold 0.30)
✓ getStockBelowPar: finds >=5 below-par items (11 items; top: Neck Oil Session IPA)
✓ getStockByName("lager"): returns lager rows (1 rows)
✓ getStockByName no-data: nonsense returns ok:false
✓ getSupplierByName("Matthew"): finds Matthew Clark
✓ getUpcomingCutoffs(72h): returns suppliers within window (4 suppliers)
✓ retrieval venueId-scoped: "ice machine" for VENUE_CROWN returns hits (1 hits)
✓ retrieval invalid venueId: returns ok:false, reason:error (invalid venueId)
Retrieval probe passed

$ pnpm --filter api probe:ingest
7/7 ✓ — Ingest probe passed (no regression)

$ pnpm --filter api probe:seed
All ✓ including agentic emergence 6/6 — Seed probe passed (no regression)

$ pnpm -w build
Tasks: 4 successful, 4 total — clean
```

**Audit-applied grep evidence:**
- `embedding service unavailable` → 1 match (try/catch present)
- `guarded(async` → 4 matches (one per MockOps method)
- `invalid venueId` → both retrieval + mock-ops services have the clause
- `, id ASC` → 2 matches (both SQL variants)
- `queryHash` → 2 matches (logCall helper in retrieval)
- `supplierNotes` → 2 matches (type + response mapper)
- `TEMPORARY` → 1 match (mock-ops file header)
- `query.slice(0, 80)` → 0 matches (old unredacted pattern absent)

## Accomplishments

- **Honest no-data proven end-to-end.** The gibberish query "zzzzz quantum dolphin polka prognostication" returned `ok: false, reason: 'no-data', detail: 'max similarity 0.194 below threshold 0.30'` instead of surfacing the closest-but-unrelated doc. The demo promise ("If retrieval has no answer it says so, or else you're hallucinating") holds under adversarial input.
- **Vector search returns semantically strong hits on real content.** "Ice machine not making ice" → topSim 0.503 → Ice Machine Troubleshooting SOP. The 03-02 agentic enrichment (emergent `errorCodes`, `makeModel`, `supplier` fields etc.) is reachable at query time, not trapped in the metadata JSON.
- **Mock-ops hands back real cutoff text, not only synthetic hours.** `getUpcomingCutoffs(VENUE_CROWN, 72)` returned 4 suppliers each with `supplierNotes` populated from seed — "Main drinks distributor. Order by 5pm for next-day delivery." Phase 4 chat can verbalize the actual constraint rather than a generic approximation.
- **Every fault mode is a discriminated-union value, not an exception.** Voyage API down → `fail('error', 'embedding service unavailable: …')`. Prisma connection lost → `fail('error', '<exception message>')`. Bad venueId → `fail('error', 'invalid venueId')` without hitting DB. Empty name on getStockByName → `fail('error', 'empty name')`. Phase 4 chat orchestration never has to try/catch around a tool call.
- **Audit-defensible retrieval call log.** Every `find()` call — hit, no-data, or error — emits `{ event: 'retrieval.call', queryLength, queryHash, outcome, count, topSimilarity }`. No raw query content in logs; forensic reconstruction via queryHash + nearby chat messages is sufficient.

## Task Commits

Project is not under version control — commits deferred. Phase boundary notionally aligns with what would have been a `feat(03): agentic knowledge layer` commit spanning all three plans.

| Task | Status | Description |
|------|--------|-------------|
| Task 1: ToolResult envelope in @gm-ai/types | Pass | `ToolResult<T>` discriminated union, `ok`/`fail` helpers, `toolResultSchema` factory; dist build verified |
| Task 2: KnowledgeRetrievalService + Module | Pass | Full flow: trim + cap + UUID + clamp → try-embed → raw pgvector SQL with id ASC sort → minSim filter → logCall |
| Task 3: MockOpsService + Module + AppModule wiring | Pass | 4 methods all guarded; UUID validation; supplierNotes + tiebreak sorts; MockOps + Retrieval both wired in AppModule |
| Task 4: probe-retrieval script | Pass | 9/9 ✓ with deterministic below-par count and invalid-venueId assertion |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/types/src/tool-result.ts` | Created | `ToolResult<T>`, `ok()`, `fail()`, `toolResultSchema` — universal service return contract |
| `packages/types/src/index.ts` | Modified | Barrel export for `./tool-result` |
| `apps/api/src/modules/retrieval/retrieval.module.ts` | Created | NestJS module: imports EmbeddingsModule + MockOpsModule; re-exports MockOpsModule so Phase 4 chat imports RetrievalModule alone |
| `apps/api/src/modules/retrieval/retrieval.service.ts` | Created | `find()` — embed + pgvector cosine + honest no-data + PII-safe logging |
| `apps/api/src/modules/mock-ops/mock-ops.module.ts` | Created | NestJS module: provides + exports MockOpsService |
| `apps/api/src/modules/mock-ops/mock-ops.service.ts` | Created | 4 guarded tool adapters with UUID validation and envelope returns |
| `apps/api/src/app.module.ts` | Modified | Registered RetrievalModule + MockOpsModule alongside EmbeddingsModule + IngestModule |
| `apps/api/src/scripts/probe-retrieval.ts` | Created | 9-assertion read-side probe, no DB writes, try/finally disconnect |
| `apps/api/package.json` | Modified | Added `probe:retrieval` script (nest build + node dist/src/scripts/probe-retrieval.js) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Discriminated-union ToolResult (not Result<T, E> generic error) | Consumers need exhaustive-switch on reason, not a generic typed error; triad (no-data/not-supported/error) covers the POC surface | Phase 4 chat wiring can pattern-match on `result.reason` without parameterizing every call site |
| Shared module-scope `guarded()` + `assertVenueId` helpers (not decorators or pipes) | NestJS DI overhead for helpers that run per-call is unjustified; function-level composition is clearer and testable without the framework | All 4 MockOps methods are 8-12 lines; adding a 5th tool later follows the same 2-line preamble pattern |
| minSimilarity default 0.3, clamp [0, 1] | Empirical on seeded corpus: hits are 0.45-0.55, gibberish is 0.15-0.20; 0.3 cleanly separates | Consumers can pass opts.minSimilarity to tune per-query; default is safe for agentic chat use |
| PII-safe retrieval log (queryHash + queryLength) replaces raw-content slice | Audit defensibility: free-form user input should not enter persistent logs; sha256-prefix + length is sufficient for forensic correlation | Compliant with SOC-2-style review; Phase 4 chat can add its own user-message log if needed, at its layer |
| getUpcomingCutoffs returns `supplierNotes` verbatim | Seed `notes` field has real cutoff text ("Order by 5pm for next-day delivery"); synthetic `estimatedDeliveryHours` alone loses signal | Phase 4 chat can quote the supplier directly instead of computed approximation |
| probe-retrieval asserts `getStockBelowPar >= 5` (not "either ok or no-data") | Fixture deterministically has 11 Crown below-par items — shape-only assertions hide regressions | Regression catch-surface is meaningful; a future bug that swaps `<` for `<=` will fail the probe |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 0 | — |
| Deferred | 0 new | — |

**Total impact:** Zero deviations. Plan executed exactly as audit-hardened.

### Auto-fixed Issues

None.

### Deferred Items

None new this plan. Carried forward from 03-03 audit:
- Unit tests (post-POC test-infra plan)
- Zod runtime validation in probes (integration structure-check sufficient)
- HNSW/IVFFlat index (trigger: 1,000+ rows OR p95 > 500ms)
- `statement_timeout` on retrieval queries (same corpus-size trigger)
- Rate limiting on Voyage calls (Phase 5 controller layer)
- Real cutoff-time parsing from supplier.notes (Xero/Square integration scope)
- Similarity-range doc comment (documentation hygiene)

## Issues Encountered

None. Single-shot apply; all grep-verifications passed first try; all 9 probe checks green on first run.

## Next Phase Readiness

**Ready:**
- RetrievalModule re-exports MockOpsModule, so Phase 4 chat wiring imports exactly one module (`RetrievalModule`) and gets both `RetrievalService` + `MockOpsService` via `app.get()`.
- `ToolResult<T>` is the contract Phase 4's tool-use orchestration maps onto Claude's tool-return shape. Chat engine can serialize `result` directly to Claude as a tool result, or branch on `result.reason` for proactive suggestion triggers.
- `KnowledgeRetrievalService.find()` returns rich hits including `metadata` (all the 03-02 emergent keys: `errorCodes`, `contactNames`, `timeOfDay`, `supplier`, etc.) — chat can do metadata-driven prompt construction without a second query.
- `MockOpsService` methods compose directly into Claude tool definitions (input types match what a tool schema would declare: `venueId: uuid`, `name: string`, `withinHours: number`).

**Concerns:**
- MockOps methods have zero auth. Adding a `user` or `session` parameter is out of POC scope; Phase 5 controller can gate HTTP access without touching the service layer.
- Retrieval does not yet record provenance into `ChatMessage.retrievedItemIds` or `toolCallLog` — those get wired in Plan 04-01 as the chat orchestration integrates retrieval calls with persisted conversation turns.
- `similarity` is a floating-point value whose absolute scale depends on the Voyage model. A future Voyage model bump would shift the 0.3 threshold default; document when that happens.

**Blockers:**
- None. Phase 4 Plan 04-01 (chat orchestration with Claude tool use) can start immediately against the 03-03 surface.

---
*Phase: 03-retrieval-layer, Plan: 03*
*Completed: 2026-04-18*
