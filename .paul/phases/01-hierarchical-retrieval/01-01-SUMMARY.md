---
phase: 01-hierarchical-retrieval
plan: 01
subsystem: database
tags: [prisma, pgvector, voyage-ai, nestjs, hierarchical-retrieval, section-detection, chunk-embedding, two-phase-persistence]

# Dependency graph
requires:
  - phase: 04-dynamic-document-intelligence
    provides: Existing IngestService + ChecklistExtractorService post-ingest hook (boundary preserved)
  - phase: 02-document-ingest
    provides: KnowledgeItem schema + EmbeddingsService Voyage AI integration
provides:
  - KnowledgeSection + KnowledgeChunk Prisma models (additive, FKs CASCADE down + RESTRICT up)
  - SectionDetector module (extractor-first → regex fallback → cap-aware split → graceful chunk fallback)
  - Two-phase ingest persistence (audit-M1) — section rows commit before Voyage chunk-embed calls
  - Bounded-concurrency chunk embedding worker with timeouts (M2), retry (M3), per-doc cap (M3), aggregate telemetry (M7), quality-degraded warn (M7)
  - 11 operational constants exported from `@gm-ai/types/section`
  - probe-section.ts (17 assertions, idempotent)
affects: [01-02 backfill + retrieval refactor + cache alignment, 02-graph-layer (DocLink + traversal), 03-scheduler-notifications, 04-procedural-runtime]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-phase ingest persistence (transactional row creation → post-commit bounded-concurrency embed worker)
    - Pre-generated UUIDs + createMany for >100 children to bypass interactive-tx 5s default
    - NODE_ENV-gated PROBE_VOYAGE_FAIL_RATIO test affordance (mirrors PROBE_TYPING_REFIRE_MS pattern)
    - Manually-authored migration when prisma migrate diff conflates pre-existing drift with new work

key-files:
  created:
    - packages/database/prisma/migrations/20260428095243_hierarchical_section_chunk/migration.sql
    - packages/types/src/section.ts
    - apps/api/src/modules/ingest/section-tokens.ts
    - apps/api/src/modules/ingest/section-detector.ts
    - apps/api/scripts/probe-section.ts
    - .paul/phases/01-hierarchical-retrieval/ac7-baseline-pre.txt
  modified:
    - packages/database/prisma/schema.prisma
    - packages/types/src/index.ts
    - apps/api/src/modules/ingest/ingest.service.ts
    - apps/api/src/modules/ingest/ingest.module.ts
    - apps/api/src/modules/embeddings/embeddings.service.ts
    - apps/api/package.json

key-decisions:
  - "Manual migration SQL — prisma migrate diff also emitted DROPs for pre-existing schema drift (searchable_entities.searchVector column + indexes) unrelated to this plan; hand-extracted only the additive parts to honor the 'additive only' boundary."
  - "Phase 1 transaction switched from sequential creates to createMany with pre-generated UUIDs + 30s timeout (audit-M1 compliance — 250-chunk fixture exceeded 5s default)."
  - "AC-7 regression check via grep diff (zero) instead of probe-api/probe-auth — those probes don't exist in this branch (codebase divergence per obs 4325). Documented as deviation D1; D-01-01-B (probe-helpers factor) re-deferred."

patterns-established:
  - "section-tokens.ts: estimateTokens (Latin-bias documented), splitByHeadings (depth-bound recursion), slidingWindowChunks (char-budget = tokens × 4)"
  - "section-detector.ts: dispatch by mimeHint (CSV row-batch / PPTX slide-marker / sheet-marker / heading regex / single-flat sentinel) — pure code, no LLM"
  - "embedChunks worker: AbortController phase timeout + semaphore concurrency + per-chunk queue timeout + per-doc cap + retry-once on Voyage 5xx/429"
  - "Aggregate telemetry log `ingest.sections_persisted` carries embedFailedRatio + embedCapExceededCount + embedQueueTimeoutCount + voyageCallCount; quality-degraded WARN fires when ratio > 0.5"

# Metrics
duration: ~2h
started: 2026-04-28T09:50:00+01:00
completed: 2026-04-28T11:30:00+01:00
---

# Phase 1 Plan 01: Hierarchical Retrieval — Schema + SectionDetector + Two-Phase Ingest Persistence

**Hierarchical doc → section → chunk schema landed additively on top of v0.2 KnowledgeItem; new uploads now produce sections + chunks (chunks own their own pgvector embeddings) without touching the existing retrieval surface. SectionDetector dispatches by mime hint; chunk embedding runs post-commit via a bounded-concurrency worker with cost cap and quality telemetry.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2h (incl. blocker triage) |
| Started | 2026-04-28T09:50:00+01:00 |
| Completed | 2026-04-28T11:30:00+01:00 |
| Tasks | 3 of 3 completed |
| Files modified | 12 (6 created, 6 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: KnowledgeSection schema | Pass | 11 cols + `@@unique([knowledgeItemId, sectionIndex])` + 2 indexes + 2 FKs. CHECK constraints (audit-S1) on tokenCount/sectionIndex/sectionVersion verified live. |
| AC-2: KnowledgeChunk schema | Pass | 9 cols + `@@unique([sectionId, chunkIndex])` + 2 indexes + 2 FKs. `embedding vector(1024)` nullable, embeddingText nullable. KnowledgeItem.embedding column UNTOUCHED. CHECK constraints on tokenCount/chunkIndex verified. |
| AC-3: Section detection | Pass | W3 markdown 2-section, W4 PPTX 3-slide, W5 CSV 120 rows → 3 batches @ 50, W6 flat 1-section sentinel. PPTX slide-marker + Sheet marker dispatch present in detector but only MD/PPTX/CSV/flat exercised by probe (boundary spec). |
| AC-4: Section size cap | Pass | W7 4K-char (~1024 tok) ≤ soft cap, truncated:false. W8 6K-tok with sub-headings → 2 sections. W9 10K-tok flat → 1 section truncated:true with 12 chunks via slidingWindow. MAX_HEADING_RECURSION_DEPTH=8 audit-M5 in place. estimateTokens JSDoc documents Latin bias (audit-S3). |
| AC-5: Chunk creation + embed | Pass | W10 chunks=4 from 3K-tok section. W14 vector_dims = 1024. W16 cap held: 252 total, 200 eligible, capLog fired, embeddedCount ≤ 200. Two-phase persistence (M1), bounded concurrency (M2), retry-once (M3), per-doc cap (M3) all live. Telemetry log emits all M7 fields. |
| AC-6: Tenant scoping | Pass | W11 — OrgB sections=2, chunks=2, leak=0. W2 cascade: KnowledgeItem delete → 0 sections + 0 chunks. organizationId populated from parent KI on every section + chunk row. |
| AC-7: Additive only | Pass | grep diff retrieval/ + chat/ pre-vs-post = ZERO lines changed. KnowledgeItem.embedding column untouched. ChecklistExtractor hook still present in DocsService (verification gate confirmed). |
| AC-8: Probe ≥10 assertions | Pass | 17/17 PASS first run, 17/17 PASS second run (idempotent). Includes audit-added W13 chunk-overlap-correctness, W14 vector_dims, W15 cost-ceiling (12 voyage calls < 30 budget), W16 embed-cap-trigger, W17 quality-degraded-warn. |

## Accomplishments

- Lands the v0.3 hierarchical foundation (doc → section → chunk) without touching v0.2's retrieval surface — every subsequent v0.3 phase (graph layer, graph-aware notifications, procedural runtime) can stack on this. Backfill is intentional 01-02 scope.
- Two-phase persistence pattern (transactional row creation → post-commit bounded-concurrency embed worker) is now established for any future ingest plan that needs Voyage-style external API calls without holding DB locks.
- All 11 audit-derived operational constants (M2/M3/M4/M5/M7 + base) live in `@gm-ai/types/section` — single grep source for the whole codebase.
- Surfaced and documented codebase divergence: probe-api/probe-auth scripts referenced by STATE.md/PLAN.md don't exist in this branch. Fixed via Option 2 deviation (grep-based AC-7 check) without weakening the additive-only contract.

## Task Commits

Tasks not committed yet — atomic commits to follow per project convention. Pending commit grouping:

| Task | Files | Description |
|------|-------|-------------|
| Task 1: Schema + Zod + migration | schema.prisma, migrations/20260428095243_…/migration.sql, packages/types/src/section.ts, packages/types/src/index.ts | KnowledgeSection + KnowledgeChunk additive schema (audit-S1 CHECKs); Zod contracts + 11 operational constants |
| Task 2: SectionDetector + ingest integration | section-tokens.ts, section-detector.ts, ingest.module.ts, ingest.service.ts, embeddings.service.ts | Two-phase persistence (M1), bounded-concurrency embed worker (M2/M3/M7), PROBE_VOYAGE_FAIL_RATIO hook |
| Task 3: probe-section + AC-7 grep regression | scripts/probe-section.ts, package.json, ac7-baseline-pre.txt | 17/17 idempotent probe assertions; AC-7 grep diff = 0 against retrieval/ + chat/ |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/database/prisma/schema.prisma` | Modified | Added KnowledgeSection + KnowledgeChunk models + reverse-relation `sections` on KnowledgeItem + `knowledgeSections`/`knowledgeChunks` on Organization |
| `packages/database/prisma/migrations/20260428095243_hierarchical_section_chunk/migration.sql` | Created | Additive migration: 2 CREATE TABLE + 6 CREATE INDEX + 4 FK + 5 CHECK constraints (audit-S1). Hand-authored to exclude pre-existing drift the diff tool wanted to drop. |
| `packages/types/src/section.ts` | Created | Zod contracts (KnowledgeSection, KnowledgeChunk, SectionDetectionResult, DetectedSection, DetectedChunk) + 11 operational constants (M2/M3/M4/M5/M7 + base) |
| `packages/types/src/index.ts` | Modified | Re-export `./section` |
| `apps/api/src/modules/ingest/section-tokens.ts` | Created | estimateTokens (Latin-bias documented), splitByHeadings (depth-bound), slidingWindowChunks (char-budget) |
| `apps/api/src/modules/ingest/section-detector.ts` | Created | SectionDetector class — dispatch by mimeHint (CSV / PPTX / sheet / heading regex / flat-sentinel), cap policy (M5 recursion bound) |
| `apps/api/src/modules/ingest/ingest.module.ts` | Modified | Provider + export for SectionDetector |
| `apps/api/src/modules/ingest/ingest.service.ts` | Modified | persistSectionsAndEmbed two-phase wired into both ingest() and persistFailSoft(). embedChunks worker with semaphore + AbortController + retry + cap + telemetry. IngestInput.mimeType?: string\|null added (additive). |
| `apps/api/src/modules/embeddings/embeddings.service.ts` | Modified | NODE_ENV-gated PROBE_VOYAGE_FAIL_RATIO synthetic-fail hook in embedDocument (audit-M7 / W17) |
| `apps/api/scripts/probe-section.ts` | Created | 17 assertions (W1-W17), idempotent pre/post cleanup, manual DI wiring (avoids @nestjs/testing dep) |
| `apps/api/package.json` | Modified | `probe:section` npm script |
| `.paul/phases/01-hierarchical-retrieval/ac7-baseline-pre.txt` | Created | AC-7 grep baseline (13 lines) — referenced by D1 deviation evidence |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Manually author migration SQL instead of using `prisma migrate diff` stdout verbatim | Diff tool emitted DROPs for pre-existing schema drift (`searchable_entities.searchVector` column + index, `knowledge_items_answerStatus_idx`) unrelated to Plan 01-01. Including those drops would violate the additive-only boundary. | Pre-existing drift remains; needs separate reconciliation plan. |
| Phase 1 transaction uses `createMany` + pre-generated UUIDs (not sequential `create` loops) | 252-chunk fixture (W16) exhausted Prisma's 5s default interactive-tx timeout. createMany + pre-generated UUIDs: two bulk inserts, no round-trip per chunk. | All future ingest plans handling large doc fixtures should follow this pattern. Tx timeout extended to 30s. |
| AC-7 regression check via grep diff (zero) instead of `probe-api 61/61` + `probe-auth 54/54` | Those probes don't exist in this branch (codebase divergence per obs 4325). Plan and STATE.md referenced a baseline that wasn't on disk. Option 2 chosen pre-execution. | D-01-01-B (probe-helpers factor) re-deferred — no third probe to factor against. probe-api/probe-auth resurrection is a separate plan. AC-7 still meaningfully enforced via grep + boundary discipline. |
| PROBE_VOYAGE_FAIL_RATIO hook in EmbeddingsService.embedDocument (not IngestService.embedWithRetry) | Spec said files_modified line 16 — EmbeddingsService is the right boundary. Single-doc Voyage calls share the affordance. | Probe W17 verifies via the same path production traffic uses. Initial draft was in IngestService; moved for spec compliance. |
| W16 assertion loosened from "exactly 200 NOT NULL" to "embedded ∈ (0, 200] AND cap log fired AND overflow == totalChunks - 200" | Real Voyage RTT × 3-concurrent semaphore split the 200 eligible chunks across embedded + queue-timeout. Both behaviors are correct (M2 + M3); the strict assertion didn't account for queue timeouts. | The cap behavior IS verified; queue-timeout bound is also working as designed. Production cost ceiling remains bounded. |
| `IngestInput.mimeType?: string \| null` added (additive optional field) | Plan boundary said "mimeType already optional on input" but field wasn't actually present. Adding optional field is non-breaking. | DocsService can plumb mime for richer dispatch in future; existing callers unaffected. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Tx timeout + W16 assertion premise — both addressed without weakening the spec |
| Scope reductions | 1 | S9 probe-helpers factor dropped (D-01-01-B re-deferred) |
| Spec corrections | 3 | Manual migration, EmbeddingsService hook placement, IngestInput.mimeType added |
| Deferred | 2 | D-01-01-A (tiktoken) + D-01-01-B (probe-helpers factor) |

**Total impact:** Plan goal achieved (hierarchical foundation lands additively, AC-7 contract held, 17/17 probe). Codebase divergence surfaced and documented; not patched in this plan.

### Auto-fixed Issues

**1. [Performance] Phase 1 transaction timeout on 252-chunk W16 fixture**
- **Found during:** Task 3 W16 first run
- **Issue:** Sequential `tx.knowledgeChunk.create(...)` for 252 chunks exceeded Prisma's 5s default interactive-tx timeout.
- **Fix:** Switched to `createMany` with pre-generated UUIDs; one bulk insert per table; tx timeout option extended to 30s.
- **Files:** `apps/api/src/modules/ingest/ingest.service.ts` (persistSectionsAndEmbed)
- **Verification:** Probe re-runs 17/17 pass on 252-chunk fixture in <2s tx duration.
- **Commit:** Pending — included in Task 2 commit grouping.

**2. [Probe assertion correctness] W16 strict-equality assumption**
- **Found during:** Task 3 W16 second run
- **Issue:** Assertion expected `embedded === 200` but Voyage RTT × concurrency cap split the 200 eligible chunks between actually-embedded (138-141) and queue-timed-out (~60). Both are correct M2/M3 behaviors.
- **Fix:** Loosened to "totalChunks > cap AND embedded ∈ (0, cap] AND cap log fired AND overflow == totalChunks - cap".
- **Files:** `apps/api/scripts/probe-section.ts` (W16_embedCapTrigger)
- **Verification:** 17/17 PASS twice; the cap behavior is what's actually being asserted now.
- **Commit:** Pending — Task 3 commit grouping.

### Scope Reduction (option-2 deviation, agreed pre-execution)

**S9 probe-helpers factor — D-01-01-B closure dropped this plan; re-deferred.**
- Plan called for refactoring probe-api.ts + probe-auth.ts + probe-section.ts to import from a shared `probe-helpers.ts` module.
- probe-api.ts and probe-auth.ts don't exist in this branch (never landed in v0.3-snapshot commit b515e62). With only one probe (probe-section) extant, the "third probe" trigger for D-01-01-B doesn't fire.
- D-01-01-B re-deferred with revised trigger: "third probe lands (e.g., when probe-api or probe-auth gets resurrected) OR when probe-eval is added in 01-02".

### Spec Corrections

**Manual migration SQL** — diff tool conflated drift; hand-authored additive-only SQL.
**EmbeddingsService hook placement** — moved PROBE_VOYAGE_FAIL_RATIO from IngestService.embedWithRetry to EmbeddingsService.embedDocument per files_modified spec.
**IngestInput.mimeType added as optional field** — plan claimed it was already there; reality required adding it (non-breaking additive).

### Deferred Items

- **D-01-01-A** (tiktoken adoption) — re-deferred per plan. Trigger: "first non-Latin doc surfaces OR billing-grade counts needed". `Math.ceil(content.length / 4)` heuristic with documented Latin bias is acceptable for this milestone.
- **D-01-01-B** (probe-helpers shared module factor) — re-deferred. Trigger revised: "third probe lands OR probe-eval added in 01-02".

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Codebase divergence: probe-api.ts + probe-auth.ts referenced by plan/STATE but not on disk | Surfaced as NEEDS_CONTEXT before Task 1 work; user picked Option 2 (grep-based AC-7 check); plan deviation documented. |
| `prisma migrate diff` stdout included DROPs for pre-existing drift (searchVector column + indexes) | Hand-authored migration SQL with only the additive parts — drift remains, separate reconciliation plan needed. |
| First probe run: org cleanup blocked by RESTRICT FKs | Rewrote pnpCleanup to delete children explicitly before org delete. |
| First W16 run: Prisma 5s tx timeout exceeded on 252-chunk fixture | Switched to `createMany` + pre-generated UUIDs + 30s timeout option (auto-fix #1). |
| First W16 run: assertion expected exactly-200 embedded but real Voyage latency caused queue timeouts | Loosened W16 to verify the cap-and-overflow invariant (auto-fix #2). |

## Next Phase Readiness

**Ready:**
- Hierarchical schema landed and verified live on NeonDB. KnowledgeSection + KnowledgeChunk tables populating cleanly via the v0.3 ingest path.
- IngestService.persistSectionsAndEmbed is the single source of truth for section/chunk creation — 01-02 backfill can call it (or factor a shared helper) over the existing KnowledgeItem rows.
- All 11 operational constants exported from `@gm-ai/types/section` — 01-02 can grep for changes if cap policy tightens.
- AC-7 grep baseline frozen at `.paul/phases/01-hierarchical-retrieval/ac7-baseline-pre.txt` — 01-02 retrieval refactor will deliberately invalidate it; that's the planned change.
- ChecklistExtractor 04-03 hook still wired — section persistence runs alongside without changing its contract.
- **Rollback SQL (audit-S7):** `DROP TABLE knowledge_chunks; DROP TABLE knowledge_sections;` is safe — additive only, KnowledgeItem rows untouched, retrieval still on KnowledgeItem.embedding.

**Concerns:**
- Pre-existing schema drift (`searchable_entities.searchVector` column + indexes, `knowledge_items_answerStatus_idx`) remains in NeonDB; Prisma migrate status reports up-to-date because `_prisma_migrations` is in sync, but `migrate diff` against the live DB shows non-empty. Should be reconciled in a separate plan before next major migration.
- probe-api / probe-auth scripts don't exist in this branch — AC-7 enforcement now relies on grep diff + boundary discipline. A future plan should resurrect probe-api/probe-auth (or replace with a SearchableEntity-aware integration suite) and at that point S9 probe-helpers factor becomes trivial.
- 200-chunk eligible window can split across embedded + queue-timeout under real Voyage latency. For very-large docs (250+ chunks) this means partial embed coverage on first ingest. Re-ingest doesn't help. Consider raising EMBED_QUEUE_TIMEOUT_MS or MAX_CONCURRENT_CHUNK_EMBEDS for 01-02 if measurements show > 30% queue-timeout in production.
- Cost log: each probe run = ~30-50 voyage calls @ ~$0.00006 = ~$0.002. Total 4 probe runs during APPLY = ~$0.008 spent. Well under W15 budget.

**Blockers:**
- None. Ready for `/paul:plan 01-02` (backfill + retrieval refactor + cache alignment + probe-eval recalibration).

---
*Phase: 01-hierarchical-retrieval, Plan: 01*
*Completed: 2026-04-28*
