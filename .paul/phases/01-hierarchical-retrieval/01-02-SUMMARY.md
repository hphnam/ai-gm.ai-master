---
phase: 01-hierarchical-retrieval
plan: 02
subsystem: retrieval
tags: [retrieval, backfill, postgres, lateral-join, advisory-lock, voyage, hybrid-search]

requires:
  - phase: 01-01
    provides: KnowledgeSection + KnowledgeChunk schema, SectionDetector, two-phase ingest persistence (persistSectionsAndEmbed)
provides:
  - Idempotent backfill of existing KnowledgeItems → sections + chunks (per-tenant cost ceiling, advisory lock, MIME content-sniff)
  - Section-level retrieval injection via LATERAL JOIN in runHybrid SQL
  - RetrievalHit content cascade (section.content → ki.content → summary → embeddingText)
  - RetrievalHit.metadata { sectionId, sectionTitle, sectionTokenCount, sectionTruncated } passthrough for chat/graph consumers
  - Row-drop guard for null-cascade entityType=knowledge_item rows (audit-M4)
  - retrieval.section_expanded log with sectionExpansionLatencyMs (audit-S3)
  - CURRENT_SECTION_VERSION constant + heuristic-version stamp lifecycle for future re-runs
  - PROBE_BACKFILL_COST_CEILING_USD env knob with assertAuthEnv prod-fail backstop
affects: [01-03 cache alignment, 02 graph layer, 03 scheduler, 04 procedural runtime]

tech-stack:
  added: []
  patterns:
    - "Per-tenant pg_try_advisory_lock pattern for cross-process safe scripts"
    - "LATERAL JOIN content expansion in retrieval SQL — single round-trip, no N+1"
    - "Content-sniff MIME inference for backfill (extractor dispatch recovery when mimeType not stored)"
    - "Probe-only env override knob with assertAuthEnv prod-fail backstop (third instance after PROBE_VOYAGE_FAIL_RATIO + PROBE_CHAT_SERVICE_DELAY_MS)"

key-files:
  created:
    - apps/api/scripts/backfill-knowledge-sections.ts
    - apps/api/scripts/detect-mime-from-content.ts
    - .paul/phases/01-hierarchical-retrieval/ac7-baseline-post-01-02.txt
    - .paul/phases/01-hierarchical-retrieval/01-02-SUMMARY.md
  modified:
    - apps/api/src/modules/retrieval/retrieval.service.ts
    - apps/api/src/modules/ingest/ingest.service.ts
    - apps/api/src/modules/auth/assert-auth-env.ts
    - apps/api/scripts/probe-section.ts
    - apps/api/package.json
    - packages/types/src/section.ts

key-decisions:
  - "Visibility refactor: persistSectionsAndEmbed private → public; return shape extended with quality fields (audit-M5)"
  - "Per-tenant advisory lock via pg_try_advisory_lock — non-blocking, session-scoped auto-release (audit-M2)"
  - "Cost ceiling halt is per-tenant (not whole-run) — partial state aggregated into backfill.completed (audit-M3)"
  - "Content-sniff MIME inference is conservative; first-match-wins; falls through to null heading-regex (audit-M1+S1)"
  - "LATERAL JOIN section expansion preserves byte-identical SearchableEntity selection logic (cross-tenant + tag/kind/recency filters untouched)"
  - "Content cascade with ki.content fallback retires naturally when retrieval.section_expanded.kiContentFallbackHits hits 0 across tenants — not a permanent dual path (CONTEXT D-01-E coherence flag accepted)"
  - "Section-injection PROMPT-PAYLOAD format (e.g. [Section X · Title]\\n…) NOT committed — reserved for 01-03 cache alignment (audit-S7 boundary)"

patterns-established:
  - "pg_try_advisory_lock per tenant in long-running backfill scripts → prevents @@unique violations on concurrent runs"
  - "EXPLAIN-uses-index probe (W21) with SET LOCAL enable_seqscan/bitmapscan = off → catches index-loss regressions on small tables"
  - "Cross-connection lock testing via prisma.$transaction tx-pinned connection + singleton pool isolation (no subprocess required)"

duration: 16min
started: 2026-04-28T13:13:00+0100
completed: 2026-04-28T13:29:00+0100
---

# Phase 1 Plan 02: Hierarchical Retrieval — Backfill + Retrieval Refactor Summary

**Existing KnowledgeItem rows can now be backfilled to KnowledgeSection + KnowledgeChunk idempotently with per-tenant cost ceilings + advisory locks; retrieval.runHybrid now injects best-matching section via LATERAL JOIN with graceful ki.content fallback for un-migrated rows.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~16min (APPLY) |
| Started | 2026-04-28T13:13:00+0100 |
| Completed | 2026-04-28T13:29:00+0100 |
| Tasks | 3/3 completed |
| Files modified | 6 modified + 4 created |
| Probe runs (cost) | 2 × ~$0.003 ≈ $0.006 Voyage spend |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Backfill processes every KI lacking sections | Pass | W18 verified first-pass coverage on synthetic unsectioned KI; backfill.tenant_started/ki_processed/tenant_completed/completed events all emit |
| AC-2: Backfill idempotent on already-sectioned KIs | Pass | W18 second consecutive run: kiProcessed=0, sections+chunks unchanged |
| AC-3: Per-tenant cost ceiling enforced (<$5) | Pass | W23 with PROBE_BACKFILL_COST_CEILING_USD=0.0001: ceiling-reached + tenant_partial logs fire; partialTenantList aggregated; per-doc embed cap (200) preserved |
| AC-4: Retrieval injects best-matching section for backfilled KIs | Pass | W19 with assertContains 'Slide' on title (audit-S6); single LATERAL JOIN preserves single round-trip; metadata.sectionId/sectionTitle populated |
| AC-5: Pre-backfill KIs gracefully fall back to ki.content | Pass | W20 verifies content === ki.content + metadata.sectionId is undefined; no warn log emitted; retrieval.section_expanded reports kiContentFallbackHits |
| AC-6: Section-version stamp enables future heuristic re-runs | Pass | CURRENT_SECTION_VERSION=1 exported from @gm-ai/types/section; ingest.service writes via the constant (no magic 1); backfill SQL filter uses MAX(sectionVersion) < CURRENT_SECTION_VERSION |
| AC-7: Probe coverage 17 → ≥23 assertions | Pass | 23/23 first run + 23/23 second consecutive run; ac7-baseline-post-01-02.txt frozen with planned diff vs pre-baseline |
| AC-8: Backfill MIME-aware dispatch (audit-M1+S1) | Pass | W18 PPTX fixture: backfill.ki_processed log shows inferredMime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' + sectionCount=3 (slide-marker dispatch fired) |
| AC-9: Backfill safe under concurrent invocation (audit-M2) | Pass | W22 cross-connection test: holder tx pins connection + lock; runBackfill on singleton pool reports tenantsLockedOut=1, kiProcessed=0, sectionsAfter=0 |
| AC-10: Retrieval drops null-cascade rows (audit-M4) | Pass | Defensive filter in coercion drops entityType='knowledge_item' rows where sectionContent ?? kiContent ?? summary ?? embeddingText all resolve to null/''; warn log retrieval.row_dropped_null_content emitted; never fired during probe (rare-by-design — ops-trace only) |

## Accomplishments

- Existing KnowledgeItems can be migrated to hierarchical schema without re-ingest, fully idempotently, with per-tenant cost ceilings ($5 production / overridable via PROBE_BACKFILL_COST_CEILING_USD for W23)
- Retrieval now returns the best-matching section per knowledge_item hit via single LATERAL JOIN — no N+1, byte-identical SearchableEntity selection logic preserved
- AC-5 graceful fallback path means rollout is safe: pre-backfill KIs continue to work via ki.content; retrieval.section_expanded.kiContentFallbackHits gives ops a deterministic signal for "fully-migrated" status
- Cross-process advisory-lock safety closes the @@unique([knowledgeItemId, sectionIndex]) collision risk on concurrent backfill invocations
- New EXPLAIN-uses-index probe (W21) catches future index-regression migrations early — uses SET LOCAL enable_seqscan/bitmapscan=off to force consideration on small probe tables
- assertAuthEnv prod-fail backstop pattern extended to PROBE_BACKFILL_COST_CEILING_USD (mirrors PROBE_VOYAGE_FAIL_RATIO + PROBE_CHAT_SERVICE_DELAY_MS) — third instance, pattern is now project convention

## Task Commits

⚠️ **Atomic per-task commits NOT YET CREATED.** Working tree currently has Plan 01-01 + 01-02 changes interleaved (per STATE.md note: 01-01 was committed as snapshot `b515e62` while still in working state). User to confirm commit strategy:
- **Option A** (per-plan): single commit `feat(retrieval): hierarchical-retrieval Plan 01-02 — backfill + section injection` covering all 3 tasks atomically.
- **Option B** (per-task): three commits (Task 1 backfill / Task 2 retrieval / Task 3 probes) — preferred per project convention.

Pending commit assignment table (will be filled post-commit):

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Backfill script + cost ceiling + sectionVersion stamp | _pending_ | feat | Adds CURRENT_SECTION_VERSION + 3 cost constants; refactors persistSectionsAndEmbed visibility + return shape; adds detect-mime-from-content.ts; authors backfill-knowledge-sections.ts with advisory lock + ceiling + S4 backoff + S5 lifecycle logs; adds backfill:sections npm script; extends assertAuthEnv with PROBE_BACKFILL_COST_CEILING_USD |
| Task 2: Retrieval refactor — section-level injection | _pending_ | feat | Augments runHybrid SQL with LATERAL section-expansion JOIN; extends FusedRow + coercion with content cascade; merges section metadata into RetrievalHit.metadata; drops null-cascade rows (audit-M4); emits retrieval.section_expanded with sectionExpansionLatencyMs |
| Task 3: Probe extension W18-W23 + AC-7 baseline freeze | _pending_ | test | Adds 6 new probe assertions (idempotency / section injection / fallback / EXPLAIN-uses-index / advisory-lock cross-connection / cost-ceiling halt); imports runBackfill; updates cost banner to 23 |

Plan metadata commit (for plan + audit + summary): _pending_

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/types/src/section.ts` | Modified | Adds CURRENT_SECTION_VERSION, BACKFILL_TENANT_COST_CEILING_USD, VOYAGE_DOC_USD_PER_CALL, BACKFILL_VOYAGE_BACKOFF_MS constants |
| `apps/api/src/modules/ingest/ingest.service.ts` | Modified | persistSectionsAndEmbed visibility private → public; return shape adds {sectionCount, chunkCount, embeddedCount, embedFailedCount, embedQualityDegraded}; sectionVersion=CURRENT_SECTION_VERSION (replaces magic 1) |
| `apps/api/scripts/detect-mime-from-content.ts` | Created | Pure-function content sniffer — PPTX slide marker / XLSX sheet marker / CSV shape detection (≥2 commas + 80%/±1 match on next 20 lines); conservative null-fallthrough |
| `apps/api/scripts/backfill-knowledge-sections.ts` | Created | runBackfill(orgIds, opts) export; per-tenant pg_try_advisory_lock; cost ceiling halt with partialTenantList aggregate; Voyage 429-after-3-failures backoff (30s); tenant_started/completed/partial paired logs; aggregate quality fields in backfill.completed; auto-runs main() when invoked directly |
| `apps/api/package.json` | Modified | Adds `backfill:sections` npm script |
| `apps/api/src/modules/auth/assert-auth-env.ts` | Modified | PROBE_BACKFILL_COST_CEILING_USD validation (must be non-negative number; production-forbidden); non-prod stderr warn |
| `apps/api/src/modules/retrieval/retrieval.service.ts` | Modified | FusedRow extended with 5 section fields; SQL adds LATERAL knowledge_sections+knowledge_chunks JOIN ordered by `c.embedding <=> $1::vector ASC LIMIT 1`; content cascade `r.sectionContent ?? r.kiContent ?? r.summary ?? r.embeddingText`; section metadata merged into RetrievalHit.metadata; row-drop guard for null cascade (audit-M4 / AC-10); retrieval.section_expanded log with totalHits/sectionExpandedHits/kiContentFallbackHits/droppedNullContent/sectionExpansionLatencyMs |
| `apps/api/scripts/probe-section.ts` | Modified | Imports RetrievalService + runBackfill; adds W18-W23 (6 new assertion functions); cost banner updated to 23 assertions; new RetrievalService instantiation in main() |
| `.paul/phases/01-hierarchical-retrieval/ac7-baseline-post-01-02.txt` | Created | Post-plan grep baseline (16 lines vs 11-line pre-baseline); intentionally non-zero diff documents the planned retrieval.service.ts changes |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| W22 cross-connection test via tx-pinned connection (not subprocess) | Prisma's interactive $transaction pins one pool connection; the singleton's other pool connections see the lock as held by another session. Equivalent semantic to subprocess, no node -e overhead, no helper-script file to maintain | Cleaner W22 implementation; same assertion outcome (tenantsLockedOut=1, kiProcessed=0, sectionsAfter=0) |
| W19 hit selection strict to ingested kiId | "cellar temperature" query also matches W17 fixture (oversized "cellar temperature" repetition) which dominates rerank. Filter to `find(h => h.entityId === kiId)` after disabling rerank+reformulation isolates the test target | Test deterministic across runs; assertContains S6 verifies title-pattern not strict equality |
| Aggregate `tenant_completed.totalChunks` reports running-aggregate (not per-tenant slice) | Simpler implementation; the per-tenant slice is in tenantSpend + kiProcessedThisTenant. Aggregates reset to per-tenant slice would require parallel counter pairs and multiply log fields | Per-tenant detail captured in tenant_started.kiCount + tenant_completed.kiProcessed + tenant_partial.kiRemaining; cumulative totals stay in backfill.completed |
| Backfill auto-run heuristic uses argv[1] suffix check | tsx invocation of the script lands `process.argv[1]` ending in the .ts filename; when imported by probe, argv[1] is probe-section.ts. Avoids needing import.meta.url ESM gymnastics | Both `pnpm backfill:sections` and `import { runBackfill }` work without env flags |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Probe-only minor adjustments; no production code changes |
| Scope additions | 0 | Followed audit-extended plan as specified |
| Deferred | 0 | All 8 audit-deferred (D1-D8) items already registered in 01-02-AUDIT.md with concrete triggers |

**Total impact:** Plan executed substantively as specified; only probe-side wiring required minor tweaks to align with actual codebase shapes.

### Auto-fixed Issues

**1. Probe — ToolResult discriminator shape mismatch**
- **Found during:** Task 3 — first probe run
- **Issue:** W19/W20 assertions checked `result.outcome !== 'ok'`. Project's ToolResult union uses `ok: true/false` discriminator (per packages/types/src/tool-result.ts), not `outcome`.
- **Fix:** Changed checks to `if (!result.ok)`.
- **Files:** apps/api/scripts/probe-section.ts (W19, W20)
- **Verification:** Re-run probe — W20 went from FAIL to PASS immediately; W19 surfaced the next issue (below).
- **Commit:** to be included in Task 3 commit.

**2. Probe — W19 hit picker drowns in earlier-fixture noise**
- **Found during:** Task 3 — second probe run (after auto-fix #1)
- **Issue:** "cellar temperature" query in W19 returned 10 hits, top-ranked from W17's oversized fixture (252 chunks of "cellar temperature must remain between four and six degrees"). Original `result.data.find(h => h.entityId === kiId) ?? result.data[0]` fell back to the wrong KI on rerank — title was "Section 1" (W17 large doc), not "Slide 2: Cellar Setup" (W19 fixture).
- **Fix:** Raised retrieval limit to 20, disabled rerank + reformulation in the W19 call, and made the kiId filter strict (no fallback to result.data[0] — fail fast if our KI isn't in hits).
- **Files:** apps/api/scripts/probe-section.ts (W19)
- **Verification:** W19 now passes — `sectionId=51d87d30-... title=Slide 2: Cellar Setup contentLen=42 fullLen=155`. Section content (42 chars = "Body explaining cellar temperature ranges.") is correctly the slide body, not the full 155-char fixture.
- **Commit:** to be included in Task 3 commit.

### Deferred Items

None new this plan. All deferrals (D1-D8) were registered at AUDIT time and remain unchanged:
- D-01-02-D1 pgvector HNSW/IVFFlat index — when corpus crosses 100K SearchableEntity rows OR p95 retrieval latency > 250ms.
- D-01-02-D2 per-section embeddings (currently chunk-only) — Phase 2 graph traversal needs.
- D-01-02-D3 cross-doc section dedup — first customer report of duplicated sections in answers.
- D-01-02-D4 cache_control on Anthropic system prompt blocks — 01-03 cache alignment scope.
- D-01-02-D5 probe-eval recalibration — 01-03 scope.
- D-01-02-D6 explicit checkpoint resumability — naturally provided by sectionVersion + ORDER BY id ASC; revisit if backfill spans cross >100K KIs.
- D-01-02-D7 soft-delete sections vs cascade hard-delete-and-replace — first audit-trail requirement.
- D-01-02-D8 auto-detect CURRENT_SECTION_VERSION bump — manual ops procedure (deploy → backfill → verify telemetry) accepted for v0.3.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Voyage rate-limit pressure during W17 (PROBE_VOYAGE_FAIL_RATIO=0.7) created kiContentFallbackHits=1-2 in subsequent W19 retrievals | Expected — the W17 fixture has chunks where ALL embeddings failed (synthetic). LATERAL JOIN with `c.embedding IS NOT NULL` returns no rows for those sections, so retrieval correctly cascades to ki.content. Behavior is documented; AC-5 fallback handling is exactly the right path. |
| Backfill auto-run when imported by probe — naive top-level `await main()` would re-run on every probe import | Guarded with `argv[1] suffix` heuristic so probe-import is import-only; direct tsx invocation runs main(). |
| Cross-connection lock test wanted subprocess but Prisma proxy makes loading two PrismaClient instances awkward | Used `prisma.$transaction` interactive callback instead — pins one connection, runs runBackfill from the singleton's other pool connections, validates lock prevents collision. Same semantic, simpler code. |

## Next Phase Readiness

**Ready:**
- Backfill is operationally safe and ready to run against production NeonDB once the canary corpus is loaded (W23 was the only test that exercised tenants with KIs; running `pnpm backfill:sections` against the real DB during a maintenance window is the recommended next operator action — but is NOT a blocker for 01-03 since 01-03's scope is cache alignment + probe-eval recalibration, both of which can use freshly-ingested KIs from new uploads).
- 01-03 cache alignment can now design its prompt-payload format (`[Section X · Title]\n${content}\n\n` or similar) against `RetrievalHit.metadata.sectionId/sectionTitle/sectionTokenCount/sectionTruncated` — section-injection PROMPT-PAYLOAD format was deliberately reserved per audit-S7 boundary.
- 01-03 probe-eval recalibration can use the new section-injection path with confidence — W19/W21 prove the path works end-to-end.
- Phase 2 graph layer (DocLink) can resolve to section IDs since RetrievalHit.metadata now carries them.

**Concerns:**
- The `kiContentFallbackHits` counter in retrieval.section_expanded log will be non-zero for any KI whose ALL section.chunks have null embeddings (W17 quality-degraded class). Operators should monitor this — the cleanup of fully-migrated tenants (where this counter hits 0) is the natural retire signal for the AC-5 fallback path per CONTEXT D-01-E.
- W22's cross-connection test assumes the singleton prisma pool has > 1 connection. PgBouncer-style serverless pooling could change this. Documented in W22 comment but may need revisit if connection-pool topology changes (e.g., Neon pooled-mode endpoint switch).
- The BACKFILL_VOYAGE_BACKOFF_MS path (audit-S4) relies on `embedFailedCount > 0` as a 429 proxy. The actual Voyage error stream isn't surfaced to the backfill loop today (errors are sanitised inside IngestService); revisit if true 429-rate observability is needed.

**Blockers:**
- None for 01-03 planning.
- ⚠️ Production backfill operator UAT against NeonDB still pending — recommend running `pnpm --filter api backfill:sections` against staging DB before production rollout to validate per-tenant ceiling math + advisory-lock behavior under real corpus shapes.

---
*Phase: 01-hierarchical-retrieval, Plan: 02*
*Completed: 2026-04-28*
