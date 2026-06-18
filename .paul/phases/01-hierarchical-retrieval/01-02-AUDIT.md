# Enterprise Plan Audit Report

**Plan:** `.paul/phases/01-hierarchical-retrieval/01-02-PLAN.md`
**Audited:** 2026-04-28T11:50:00+01:00
**Verdict:** Conditionally acceptable pre-fix → **enterprise-ready** post-fix

---

## 1. Executive Verdict

The plan as originally drafted was structurally sound but had **six release-blocking gaps** and **nine audit-defensibility weaknesses** that a SOC-2 / ISO 27001 reviewer would flag. Most-critical gap: the backfill silently regressed extractor-emitted structure for existing rows — KnowledgeItem has no `mimeType` column, so a 10K-row inventory CSV ingested via 04-01's CSV extractor would re-detect as plain text and produce a single `truncated:true` section that hits `ingest.embed_cap_exceeded` (200 of ~1000 chunks embedded), silently degrading retrieval quality for that document. Concurrent-invocation safety, partial-state operator visibility, and deletion-race row handling were also underspecified.

**With the 6 must-have + 9 strongly-recommended findings applied**, the plan is enterprise-ready for SOC-2 CC6.6 (logical access controls — advisory-lock + per-tenant cost ceiling) + CC7.2 (system monitoring — quality-degraded telemetry, partial-state logs, latency observability) + ISO 27001 A.12.1.3 (capacity management — Voyage 429 backoff).

Would I sign my name to this system after the upgrades land? **Yes.**

---

## 2. What Is Solid

These elements correctly anticipated enterprise concerns and should NOT change:

1. **Two-phase persistence reuse via `persistSectionsAndEmbed` visibility refactor.** The plan correctly chose to expose 01-01's already-audit-strengthened pipeline rather than duplicate the worker, semaphore, retry, cap, and telemetry logic. Single source of truth survives.

2. **Per-tenant cost ceiling tied to CONTEXT D-01-B.** The `<$5/tenant` budget is concretely enforced (BACKFILL_TENANT_COST_CEILING_USD constant), not aspirational. Halt-and-skip-to-next semantic preserves multi-tenant fairness — one runaway tenant doesn't starve the others.

3. **AC-7 grep-baseline pattern continuity.** Carrying the `ac7-baseline-pre.txt` → `ac7-baseline-post-01-02.txt` discipline from 01-01's option-2 deviation gives downstream plans a deterministic regression check without needing probe-api/probe-auth resurrection.

4. **Boundaries protect 01-03's freedom.** Explicit "no prompt-cache alignment, no probe-eval recalibration, no payload-format commitment" prevents 01-02 from accidentally pre-deciding 01-03's design space. This is unusually disciplined plan-sequencing.

5. **AC-5 graceful fallback.** The cascade `r.sectionContent ?? r.kiContent ?? r.summary ?? r.embeddingText` gracefully handles partially-backfilled state and empty-content edge cases without flag-driven dual paths.

6. **CONTEXT decisions D-01-A through D-01-E carry forward unchanged.** No re-litigation of locked architecture.

---

## 3. Enterprise Gaps Identified

### Critical (Release-Blocking)

**G1 — MIME-aware dispatch lost at backfill.** KnowledgeItem table has no `mimeType` column. Backfill passes `mimeType: null` to SectionDetector → all dispatch falls through to heading regex. KIs originally ingested as PPTX/CSV/XLSX silently lose row-batch / slide-marker / sheet-marker dispatch. Regression: a 10K-row CSV produces 1 flat section with `truncated:true` → embed-cap-exceeded → 200 of 1000+ chunks embedded. Retrieval quality permanently degraded for that document.

**G2 — Concurrent invocation safety absent.** No advisory lock or running-lock check. Two `pnpm backfill:sections` processes started near-simultaneously → both see "ki has no sections" → both create sections → unique constraint violation `@@unique([knowledgeItemId, sectionIndex])` OR successful double-spend on Voyage budget. Operations runbook would have to forbid concurrent invocation; better to make it safe by construction.

**G3 — Per-tenant cost-ceiling halt leaves partial state without visibility.** When the ceiling fires, some KIs in the tenant have sections, others don't. No structured event tells ops "this org is partially backfilled — kiRemaining=42, estUsdSpend=$5.01". Aggregate `backfill.completed` log doesn't list partial-state tenants. This is a real audit failure: an incident reviewer can't reconstruct which orgs were left partial.

**G4 — Retrieval LATERAL-JOIN failure mode underspecified.** What if both `sectionContent` AND `kiContent` are NULL (deletion race between SearchableEntity SELECT and section/ki JOIN)? Cascade falls to `summary ?? embeddingText`. If those are also NULL (rare but possible), the row returns with `content === null`, which propagates into Claude tool result and crashes JSON serialization OR returns to chat as an empty hit. No defensive filter.

**G5 — Backfill embedding-failure escalation absent.** persistSectionsAndEmbed has its own fail-soft + `embed_quality_degraded` warn, but backfill marches on to the next KI. After 1000s of log lines, an operator scanning post-deploy would not notice that 30% of one tenant's docs have severely degraded embedding coverage.

**G6 — Idempotency assumption depends on `deleteMany` of pre-existing sections inside `persistSectionsAndEmbed`.** If the SQL filter "needs backfill" misses a row due to a race (another process created sections between SELECT and CALL), persistSectionsAndEmbed will DELETE those just-created sections and replace them. With G2's advisory lock this risk is bounded, but the relationship needs to be explicit.

### Strongly Recommended

**S1 — Content-sniff fallback for MIME inference.** Partial mitigation for G1: heuristic `detectMimeFromContent(content)` recovers most cases by looking at the content shape (slide markers, sheet markers, CSV column structure). Conservative — when in doubt returns null (heading-regex fallback).

**S2 — EXPLAIN-based query plan probe.** The new LATERAL JOIN should use `knowledge_chunks_sectionId_idx`. If a future migration alters indexes, query plan regresses to Seq Scan and retrieval latency balloons silently.

**S3 — Retrieval observability for query latency impact.** No signal if section expansion regresses query latency.

**S4 — Voyage 429 backoff during sustained backfill.** Per-doc concurrency cap (3) is fine for occasional ingest; sustained 3-concurrent across 1000s of docs hits Voyage account-level rate limits.

**S5 — `backfill.tenant_started` log.** Plan only emits `backfill.tenant_completed` — paired open/close events make ops dashboards much cleaner.

**S6 — W19 fixture determinism.** Voyage similarity rankings can drift slightly between runs. Strict `===` equality on which section ranks #1 will flake.

**S7 — Re-emphasize: don't commit to a section-injection prompt-payload format.** Boundaries already say it; make it more concrete in the Avoid section so executor doesn't slip in `[Section X]\n${content}\n\n` formatting that 01-03 has to undo.

**S8 — W18 cleanup ordering note.** pnpCleanup deletes children before org (RESTRICT FK). W18 creates an unsectioned KI directly; comment this so future probe-authors don't break the deletion order.

**S9 — Manual ops procedure for CURRENT_SECTION_VERSION bumps.** AC-6 covers re-runs but doesn't document the deploy procedure.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | MIME dispatch lost at backfill | AC-8 (new), Task 1 Step 3 (new), files_modified | Added AC-8 requiring `detectMimeFromContent` content-sniff before invoking persistSectionsAndEmbed; added Task 1 Step 3 specifying the heuristic (PPTX slide markers, sheet markers, conservative CSV detection); added new file `apps/api/scripts/detect-mime-from-content.ts`; backfill log includes `inferredMime` field |
| M2 | Concurrent invocation safety absent | AC-9 (new), Task 1 Step 4 (advisory lock block), Task 3 W22 (new), Verification | Added AC-9 requiring `pg_try_advisory_lock(hashtext('backfill:org:' || orgId))` per tenant; advisory-lock acquisition + try/finally release in Task 1 Step 4; new probe W22 verifies cross-session blocking via subprocess; verification check confirms no leaked locks |
| M3 | Cost-ceiling halt leaves partial state without log | AC-3 strengthened, AC-9 (lock+partial), Task 1 Step 4 (partial log), Task 3 W23 (new), Task 1 Step 7 (assertAuthEnv backstop) | Strengthened AC-3 to require `backfill.tenant_partial` event with `{orgId, kiProcessed, kiRemaining, estUsdSpend}`; aggregate `backfill.completed` log includes `partialTenantList`; new probe W23 + new `PROBE_BACKFILL_COST_CEILING_USD` env knob with assertAuthEnv prod-fail backstop |
| M4 | Retrieval LATERAL-JOIN failure mode underspecified | AC-10 (new), Task 2 Step 3 (defensive filter) | Added AC-10 requiring row-drop when entityType='knowledge_item' AND content cascade fully resolves to null; Task 2 Step 3 adds the defensive filter with `retrieval.row_dropped_null_content` warn log emission |
| M5 | Backfill embedding-failure escalation absent | Task 1 Step 2 (return-shape extension), Task 1 Step 4 (aggregate fields) | persistSectionsAndEmbed return shape extended with `{sectionCount, chunkCount, embeddedCount, embedFailedCount, embedQualityDegraded}`; backfill aggregates `docsWithDegradedEmbedQuality` + `docsWithNoEmbeddings` into `backfill.completed` log so ops can decide manual re-run scope |
| M6 | Idempotency depends on persistSectionsAndEmbed's deleteMany — race window | Boundaries (advisory lock relationship), AC-9, W22 | M2's advisory lock is the proper fix for this — documented as the load-bearing protection. AC-9 + W22 verify the lock is actually acquired and prevents collision. No additional change beyond M2 needed. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | Content-sniff for MIME | AC-8, Task 1 Step 3, files_modified | New `detect-mime-from-content.ts` helper with conservative heuristic — slide markers, sheet markers, CSV column-structure detection. Returns null when in doubt. |
| S2 | EXPLAIN-based query plan probe | Task 3 W21 (new) | Probe W21 runs EXPLAIN ANALYZE on the LATERAL JOIN and asserts `Index Scan using knowledge_chunks_sectionId_idx`. Catches index-loss regressions. |
| S3 | Retrieval latency observability | Task 2 Step 4 (sectionExpansionLatencyMs field) | `retrieval.section_expanded` log gains `sectionExpansionLatencyMs` measuring SQL+coerce window. Verification updated to confirm the field is populated. |
| S4 | Voyage 429 backoff during sustained backfill | Task 1 Step 4 (Voyage 429 backoff block), constants | New `BACKFILL_VOYAGE_BACKOFF_MS = 30_000` constant; backfill tracks consecutive 429s and pauses 30s after 3 in a row to avoid account-level rate-limit cascades. |
| S5 | `backfill.tenant_started` log | Task 1 Step 4 (tenant lifecycle logs) | Paired `backfill.tenant_started` { orgId, kiCount } + `backfill.tenant_completed` OR `backfill.tenant_partial` for ops dashboards. |
| S6 | W19 fixture determinism | AC-7 W19 line, Task 3 W19 (assertContains) | Use `assertContains(sectionTitle, 'Slide')` rather than strict equality — absorbs Voyage similarity drift between runs. |
| S7 | Don't commit to section-injection prompt-payload format | Boundaries (new bullet), Task 2 Avoid section | Boundary explicitly bans `[Section X · Title]\n${content}\n\n`-style formatting commitment; reserves that for 01-03 cache alignment plan. |
| S8 | W18 cleanup ordering note | Task 3 W18 inline comment | Comment in W18 documenting that pnpCleanup deletes children before org; prevents future probe-authors from changing deletion order and breaking RESTRICT FK. |
| S9 | Manual ops procedure for CURRENT_SECTION_VERSION bumps | Boundaries SCOPE LIMITS new bullet | Documented manual procedure: deploy → backfill:sections → telemetry-verify zero rows at old version. Auto-detection deferred. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | pgvector HNSW/IVFFlat index | Already deferred from 01-01; trigger unchanged ("p99 retrieval latency > 200ms OR corpus > 100K chunks") |
| D2 | Per-section embedding (in addition to chunk-level) | CONTEXT D-01-D explicitly defers; trigger: "Phase 2 graph traversal wants similarity-by-section, not chunk" |
| D3 | Cross-doc section deduplication | CONTEXT explicit deferral; trigger: "first customer reports duplicate retrieval results" |
| D4 | Section-level cache_control on Anthropic blocks | 01-03 scope (split chosen by user during /paul:plan) |
| D5 | probe-eval recalibration | 01-03 scope |
| D6 | Resume-from-checkpoint after process death | Current SQL filter (sectionVersion check + ORDER BY id ASC) naturally provides resumability; explicit checkpoint not needed |
| D7 | Soft-delete of KnowledgeSection during heuristic re-run | Cascade hard-delete-and-replace is fine for v0.3; soft-delete adds complexity without observable benefit yet |
| D8 | Auto-detection of CURRENT_SECTION_VERSION bump triggering re-run | Manual ops step (S9) is acceptable for this milestone; auto-detection adds CI complexity |

---

## 5. Audit & Compliance Readiness

**Audit evidence post-upgrades:**
- ✅ Per-row processing trail: `backfill.ki_processed` { knowledgeItemId, organizationId, sectionCount, chunkCount, embeddedCount, inferredMime, embedQualityDegraded }
- ✅ Per-tenant lifecycle: paired `backfill.tenant_started` + `backfill.tenant_completed` OR `backfill.tenant_partial`
- ✅ Run-level aggregate: `backfill.completed` with full quality + cost telemetry, partial-tenant list
- ✅ Cost ceiling defensibility: `backfill.tenant_cost_ceiling_reached` warn with concrete numbers (estUsdSpend, ceiling, kiRemaining)
- ✅ Concurrent-invocation defense: `backfill.tenant_lock_unavailable` warn proves operator can't double-process
- ✅ Retrieval row-drop trail: `retrieval.row_dropped_null_content` warn distinguishes deletion-race from data-integrity issues

**Silent-failure prevention:**
- ✅ `embed_quality_degraded` aggregated into run-level summary (M5)
- ✅ Cost ceiling explicitly halts (not silently truncates)
- ✅ MIME-sniff explicit — old extractor structure recovered, not silently lost (M1+S1)
- ✅ Defensive null-content filter in retrieval prevents empty-hit leak to Claude (M4)

**Post-incident reconstruction:**
- ✅ Advisory lock leaves audit trail of "process B was blocked here at this time"
- ✅ Partial-state log + run-level aggregate identifies exactly which tenants need re-run
- ✅ Latency telemetry (`sectionExpansionLatencyMs`) enables p50/p95/p99 reconstruction per query

**Ownership and accountability:**
- ✅ Files_modified explicit; every audit-applied change cites the finding ID inline (`<!-- audit-added M1 -->`)
- ✅ All new env knobs registered with assertAuthEnv prod-fail backstop (M3 — PROBE_BACKFILL_COST_CEILING_USD mirrors 01-01's PROBE_VOYAGE_FAIL_RATIO + 03-02's PROBE_CHAT_SERVICE_DELAY_MS)

**Areas that still need monitoring (acceptable but worth flagging):**
- Voyage 429 backoff is a 30s pause — for huge tenants this could extend backfill duration significantly. If sustained backfill operations grow common, S4 may need to evolve into per-tenant exponential backoff or queueing.
- The defensive null-content filter in M4 will fire VERY rarely; the warn log is the only signal an operator gets. Monitoring should alert on any non-zero rate of `retrieval.row_dropped_null_content` (suggests data-integrity issue, not just race).
- AC-5 fallback path (ki.content for unsectioned KIs) is a safety net; the coherence-flag noted that it should retire when `kiContentFallbackHits` hits 0 across all tenants. That cleanup is a future plan, not 01-02 — make sure it actually gets created (suggest adding to a cleanup-backlog file).

---

## 6. Final Release Bar

**Must be true before this plan ships:**
1. All 6 must-have findings applied to PLAN.md ✅
2. All 9 strongly-recommended findings applied to PLAN.md ✅
3. AC count raised from 7 → 10 (3 new) ✅
4. Probe count raised from 20 → 23 (3 new) ✅
5. New env knob (PROBE_BACKFILL_COST_CEILING_USD) registered with assertAuthEnv prod-fail backstop ✅
6. New file (detect-mime-from-content.ts) added to files_modified ✅

**Risks remaining if shipped post-upgrades:**
- **Voyage account-level rate limits** during very large backfills (>10K KIs) could compound despite S4 backoff. Acceptable for v0.3 canary corpora; revisit if multi-tenant production ingest requires sustained throughput.
- **AC-5 fallback path persists in code** even when no KI needs it (after 100% backfill). Cleanup is a future-plan concern — flagged in coherence check at plan-creation.
- **Pre-existing schema drift** (searchable_entities.searchVector + answerStatus_idx) remains in NeonDB; this plan doesn't touch it. The new LATERAL JOIN doesn't depend on those drifted artifacts, so no functional risk for 01-02; reconciliation is still a separate-plan concern.

**Would I sign my name to this system after the upgrades land?** Yes. The plan post-upgrade is enterprise-ready for a regulated multi-tenant SaaS context. Audit trail is defensible, silent-failure modes are closed, concurrent invocation is safe, and cost ceilings are programmatically enforced with operator visibility into partial states.

---

**Summary:** Applied 6 must-have + 9 strongly-recommended upgrades. Deferred 8 items (D1-D8) with explicit triggers.
**Plan status:** Updated and ready for APPLY. Probe target raised 20 → 23. AC count raised 7 → 10. New file added: `apps/api/scripts/detect-mime-from-content.ts`. New env knob: `PROBE_BACKFILL_COST_CEILING_USD` (assertAuthEnv prod-fail backstop).

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
*Audited: 2026-04-28T11:50:00+01:00*
