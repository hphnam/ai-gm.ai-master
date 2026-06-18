# Enterprise Plan Audit Report

**Plan:** `.paul/phases/01-hierarchical-retrieval/01-01-PLAN.md`
**Audited:** 2026-04-28
**Verdict:** **Conditionally acceptable pre-fix → enterprise-ready post-fix.** 7 must-have + 9 strongly-recommended upgrades applied directly to PLAN.md. 6 items deferred with explicit triggers.

---

## 1. Executive Verdict

The architectural shape is correct: additive schema, two-phase persistence (after audit-M1), bounded resource consumption, zero-regression contract on v0.2 surface. The plan is **conditionally acceptable** in its initial form and **enterprise-ready post-fix** with the 7 must-have + 9 strongly-recommended changes applied below. I would sign my name to the post-fix version for production deployment.

The pre-fix gaps were not architectural — they were operational risks that any seasoned reviewer would catch on a first pass: Voyage HTTP calls inside Postgres transactions (lock contention), unbounded parallelism (rate-limit blowback), no per-doc cost cap (single malicious upload could blast Voyage), CSV-row-as-section cost explosion (10K-row inventory CSV → 10K Voyage calls), no recursion bound on heading split (stack overflow risk on pathological docs), and AC-7 "untouched" contract drift on re-ingest.

The fixes are all standard project patterns already proven in 04-01 (semaphores, magic-byte, retry), 04-03 (AbortController timeout, post-parse validation), and 03-04 (NODE_ENV-gated test affordances). No invented requirements; everything maps to existing project conventions.

## 2. What Is Solid (Do Not Change)

- **Two-table additive design (`KnowledgeSection` + `KnowledgeChunk`).** Cleanly separates structural unit (section, the injection target) from vector unit (chunk, the retrieval target). Cascade FK on both tables matches v0.2 patterns. Tenant scoping via organizationId + indexes is non-negotiable and correctly applied.
- **Zero-regression contract on probe-api 61/61 + KnowledgeItem.embedding column.** This is the right way to ship a foundational refactor — existing v0.2 retrieval continues to work for the lifetime of this plan; no flag, no parallel path. The 01-02 swap is then a single point-of-cutover.
- **Sliding-window chunking with overlap (1024/128).** Standard RAG contract; matches Voyage-recommended chunk sizes.
- **Extractor-first detection strategy.** 04-01 already produces structural markers; reusing them avoids re-paying for LLM clustering at ingest time. The deferral of LLM clustering with explicit trigger is correct discipline.
- **Migration via `prisma migrate diff → deploy` not `migrate dev`.** Correctly cites Plan 03-01 deviation; non-interactive-safe.
- **Boundaries section explicitly locking retrieval/chat/embeddings to 01-02 scope.** Prevents scope creep at APPLY time.
- **Probe-section script following project pattern.** New probe with idempotent fixtures + structured assertion logs matches probe-api / probe-auth / probe-whatsapp conventions.

## 3. Enterprise Gaps Identified

### Operational scaling risks
1. **Voyage HTTP calls inside Prisma transaction** (AC-5, Task 2). 50-page PDF with 100 chunks × ~500ms Voyage latency = DB transaction held 50+ seconds, blocking everything that touches knowledge_chunks or its FK targets. Lock contention pattern.
2. **No bounded parallelism on Voyage calls.** A 100-chunk doc would blast 100 parallel HTTP calls, hitting Voyage rate limits and inflating tail latency. Project pattern (04-01 image-extractor) uses a 3-call semaphore.
3. **No overall ingest timeout.** A hung Voyage call (slow network, partial outage) holds the ingest indefinitely. 04-03 uses AbortController with 30s timeout on extractors; this plan needs the analogous pattern on the embed phase.
4. **No per-document embed budget cap.** A 200-page PDF with 1000+ chunks would blast Voyage uncapped. Cost-defensible practice requires an explicit cap with operator-visible log on breach.

### Cost-explosion risks
5. **CSV "row-as-section" without batching** (AC-3). A 10,000-row inventory CSV produces 10,000 sections × 1 chunk each = 10,000 Voyage calls. At $0.00006/call that's ~$0.60 per CSV upload — but for a customer with weekly inventory uploads, $30/month JUST FOR EMBEDDING per venue. With grouping by 50 rows, drops to ~$0.012/upload.
6. **Flat-text fallback with no cap on embed calls.** A single 100K-token PDF with no structural markers becomes 1 section + 100 chunks; without per-doc cap (audit-M3), this is uncapped Voyage spend.

### Correctness risks
7. **Heading split recursion has no depth bound** (AC-4). Pathological doc with deeply-nested headings (h1→h2→h3→...→h8→h9) hits JS stack on naive recursion. Bound at 8 (typical h1-h6 + 2 ALL-CAPS layers).
8. **AC-7 "untouched" contract violated by re-ingest.** Task 2 deletes pre-existing sections per knowledgeItemId on every ingest call — but AC-7 says pre-existing rows have zero corresponding sections. Re-ingest is a deliberate operator action, not state drift, but the contract needs explicit reconciliation.
9. **Token estimator non-Latin-aware silent error.** `Math.ceil(content.length / 4)` over-counts CJK by ~4x and under-counts emoji-dense content. A first non-Latin upload would hit cap-policy paths silently — no log, no warning.

### Audit-defensibility gaps
10. **Embed-fail aggregate telemetry missing.** Per-chunk fail logs exist, but no aggregate ratio (`embedFailedRatio`) or operator-actionable warn log when a doc's embedding is mostly broken. SOC-2-defensible audit trail requires the operator to know when an ingest landed in degraded state.
11. **No CHECK constraints on numeric columns.** App-level invariants (sectionIndex ≥ 0, etc.) should also be DB-level invariants. Prevents bad rows from latent app bugs.
12. **No SQL rollback procedure documented.** Audit-defensible practice requires every additive migration to ship with documented rollback SQL, even when trivially safe.

### Self-canceling deferral
13. **D-01-01-B trigger fires with this plan.** "Third probe copies the helpers" — probe-api + probe-auth + probe-section = 3. Deferring "until next time" while the trigger condition is met *right now* is a code smell.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Voyage HTTP calls inside Prisma transaction = lock contention on large docs | AC-5, Task 2 step 3 | Restructured to two-phase persistence: phase 1 commits rows with embedding=null inside transaction; phase 2 (post-commit) embeds via bounded-concurrency worker and writes via `$executeRaw` UPDATE |
| M2 | No concurrency limit + no overall ingest timeout = unbounded parallel calls + hung ingests | AC-5, Task 2 step 3 | Added `MAX_CONCURRENT_CHUNK_EMBEDS=3` semaphore + `EMBED_QUEUE_TIMEOUT_MS=15_000` queue timeout + `INGEST_EMBED_PHASE_TIMEOUT_MS=120_000` AbortController on phase 2 |
| M3 | No retry policy + no per-doc embed budget cap = malicious/large upload blasts Voyage uncapped | AC-3, AC-5, AC-8 (W16), Task 2 | Voyage 5xx/429 retry once with 1s backoff; `MAX_EMBEDS_PER_DOCUMENT=200` cap with `ingest.embed_cap_exceeded` warn log; W16 probe assertion verifies cap fires on 250-chunk synthetic fixture |
| M4 | CSV row-as-section cost explosion (10K rows → 10K Voyage calls) | AC-3, packages/types constants | `CSV_ROW_BATCH_SIZE=50` row-grouping policy in CSV detector strategy; section title `Rows {start}-{end}` |
| M5 | Heading split recursion has no depth bound = stack overflow risk | AC-4, Task 2 step 1 | `MAX_HEADING_RECURSION_DEPTH=8` bound on `splitByHeadings(content, depth)`; past depth, force flat-chunk fallback |
| M6 | AC-7 "untouched" contract violated by re-ingest path | AC-7 | Reconciled wording: "Pre-existing rows that are NOT re-ingested via the v0.3 ingest path remain untouched"; documented async-enrichment lifecycle preservation |
| M7 | Embed-fail aggregate telemetry missing — SOC-2 audit-defensibility gap | AC-5, Task 2 step 3 telemetry, AC-8 (W17), files_modified | Aggregate counts in `ingest.sections_persisted` log (embedFailedRatio, voyageCallCount, embedCapExceededCount, embedQueueTimeoutCount, embedPhaseTimeoutCount); `ingest.embed_quality_degraded` warn log when ratio > 0.5; `EMBED_QUALITY_DEGRADED_THRESHOLD=0.5` constant; W17 probe assertion verifies via NODE_ENV-gated PROBE_VOYAGE_FAIL_RATIO=0.5 hook on EmbeddingsService |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | No DB-level CHECK constraints on numeric columns | Task 1 step 4 | Added 5 CHECK constraints to migration SQL: tokenCount ≥ 0, sectionIndex ≥ 0, sectionVersion ≥ 1, chunkIndex ≥ 0 |
| S2 | Titleless section fallback unspecified — retrieval payload would show "null" | Task 2 step 3 | `title = title ?? "Section ${sectionIndex+1}"` at write time |
| S3 | Token estimator silently wrong for non-Latin content | AC-4, Task 2 step 1 | JSDoc on `estimateTokens()` documents Latin-script bias explicitly; D-01-01-A trigger revised to "first non-Latin doc surfaces OR billing-grade counts needed" |
| S4 | W10 verifies "multiple chunks" but not that overlap content actually overlaps | AC-8 | Added W13: assert last 128 chars of chunk[0] match first 128 chars of chunk[1] (±32-char drift tolerance for word-boundary back-up) |
| S5 | No assertion that embeddings are 1024-dim (project constraint per PROJECT.md) | AC-8 | Added W14: `SELECT vector_dims(embedding) FROM knowledge_chunks` returns 1024 |
| S6 | Cost ceiling aspirational not testable — no probe assertion verifies | AC-8, Task 2 telemetry | Added W15: assert `ingest.voyage_call_count` log emits, sum across canary fixture < 30 calls |
| S7 | No SQL rollback procedure documented (audit-defensible practice) | Verification | Documented rollback SQL in verification checklist; safe because additive |
| S8 | Boundaries missing protections for ChecklistExtractor hook + processingStatus + prisma.config | Boundaries | Added 04-03 ChecklistExtractor coexistence guard, processingStatus lifecycle preservation, prisma.config.ts driver-adapter pattern lock |
| S9 | D-01-01-B "factor probe-helpers" trigger fires with this plan (third probe) — self-canceling deferral | Task 3 step 2 | Factored `probe-helpers.ts` NOW; refactored probe-api + probe-auth to import; verified 61/61 + 54/54 still pass; D-01-01-B closed in this plan's SUMMARY |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | tiktoken adoption for exact token counts | `Math.ceil(len/4)` approximation acceptable for soft/hard cap heuristics; D-01-01-A registered with revised trigger ("first non-Latin doc surfaces OR billing-grade counts needed") |
| D2 | EXPLAIN-based index-usage probe | pgvector + btree picks should work on small corpus; revisit when query plan regressions surface or corpus exceeds 10K rows |
| D3 | pgvector HNSW/IVFFlat index on knowledge_chunks.embedding | Corpus is small for v0.3 launch; v0.1 deferred similar with same trigger ("corpus exceeds 1,000 embedded rows OR p95 retrieval > 500ms") |
| D4 | Chunk-level embeddings replacing KnowledgeItem.embedding | Explicitly 01-02 scope (retrieval-path swap + KnowledgeItem.embedding column drop) |
| D5 | CSV "smart" sectionizing (semantic clustering of similar rows) | Header-aware row batching at CSV_ROW_BATCH_SIZE=50 sufficient for v0.3 launch; revisit if a customer's CSV shape produces poor retrieval |
| D6 | Section-version bump policy on backfill heuristic changes | 01-02 owns this — when backfill heuristic changes between 01-01 deploy and 01-02 ship, sectionVersion is incremented and stale sections re-derived |

## 5. Audit & Compliance Readiness

**Defensible audit evidence:**
- All ingest operations emit PII-safe structured logs (`ingest.sections_persisted`, `ingest.embed_failed`, `ingest.embed_cap_exceeded`, `ingest.embed_queue_timeout`, `ingest.embed_phase_timeout`, `ingest.embed_quality_degraded`). Every log carries knowledgeItemId + organizationId for forensic correlation. None carry content fields.
- Voyage call count logged per ingest enables per-tenant cost audit reconstruction.
- Two-phase persistence is observable: transaction-commit log (existing) + post-commit embedding log (new) bracket the operation.
- Tenant scoping enforced on every new row at schema (FK + index) and probe-section W11/W12 explicitly tests cross-org isolation.

**Silent failure prevention:**
- Voyage failures emit per-chunk logs PLUS aggregate quality-degraded warn when ratio > 50%.
- Embed-cap-exceeded emits warn log (operator-actionable).
- Queue-timeout and phase-timeout emit distinct logs to differentiate cause-of-degradation.
- `truncated:true` field on KnowledgeSection makes fall-back-to-flat-chunks observable in retrieval payload.

**Post-incident reconstruction:**
- Per-tenant ingest history reconstructable from `ingest.sections_persisted` log stream.
- knowledgeItemId in every log enables drilling from a specific upload to all derived sections + chunks + embed outcomes.
- sectionVersion stamp allows distinguishing pre-deploy vs post-deploy ingests if backfill heuristic shifts.

**Ownership and accountability:**
- All new files have clear single ownership (ingest module owns section detection + persistence; types package owns constants; database package owns schema + migration).
- Deferred items have explicit triggers, not vague "later" — D-01-01-A (trigger condition specified), D-01-01-B (closed in this plan).

**Areas that would PASS a real audit (post-fix):**
- SOC-2 CC6.6 (logical access — tenant isolation enforced + probe-tested)
- SOC-2 CC7.2 (system monitoring — operational telemetry on ingest health)
- ISO 27001 A.12.1.3 (capacity management — explicit caps on concurrency, per-doc embed budget, ingest timeout)

**Areas still flagged for ongoing watch:**
- Embedding budget caps (`MAX_EMBEDS_PER_DOCUMENT=200`) chosen without a customer corpus to validate. Track `ingest.embed_cap_exceeded` log frequency post-deploy; if firing more than ~1% of uploads, raise cap or reshape detection.
- Quality-degraded threshold (`0.5`) chosen heuristically. Revisit if real Voyage failure rate makes 50% threshold either too noisy or too quiet.

## 6. Final Release Bar

**Must be true before this plan ships:**
- All 7 must-have + 9 strongly-recommended changes applied (✓ done — applied to PLAN.md inline with `<!-- audit-added -->` markers)
- probe-section 17/17 idempotent on first AND second consecutive run
- probe-api 61/61 + probe-auth 54/54 pass post-S9 refactor (zero regressions)
- CHECK constraints visible in `\d+ knowledge_sections` and `\d+ knowledge_chunks`
- Canary fixture ingest verified to emit all new aggregate telemetry fields with expected values
- ChecklistExtractor 04-03 hook continues firing on procedural-kind uploads (verified at APPLY)
- SQL rollback procedure (DROP knowledge_chunks; DROP knowledge_sections) documented in 01-01-SUMMARY

**Risks remaining if shipped as-is (post-fix):**
- Embedding budget caps are guesses pending real-corpus telemetry — mitigated by operator-actionable warn logs that surface breach immediately
- Token approximation is Latin-script-biased — mitigated by explicit JSDoc + trigger; first non-Latin doc forces revisit
- Two-phase persistence creates a small window where chunks exist without embeddings (between phase 1 commit and phase 2 completion) — mitigated by 01-02 retrieval-side null-handling fallback (documented as 01-02 scope, not a leak)

**Would I sign my name to this system?**
**Yes, post-fix.** The architectural choices are correct, the operational risks are now bounded, the failure modes are observable, and the deferred items have explicit triggers rather than vague intent. The plan ships an additive foundation that can be cleanly extended in 01-02 without rework. Production-ready for the GM-AI v0.3 audience and risk profile.

---

**Summary:** Applied 7 must-have + 9 strongly-recommended upgrades. Deferred 6 items with explicit triggers.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
*Reviewer: senior principal engineer + compliance reviewer (Claude, acting role)*
