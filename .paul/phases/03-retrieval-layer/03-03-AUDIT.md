# Enterprise Plan Audit Report

**Plan:** `.paul/phases/03-retrieval-layer/03-03-PLAN.md`
**Audited:** 2026-04-18T19:00:00Z
**Verdict:** conditionally acceptable pre-fix → **enterprise-ready post-fix**

---

## 1. Executive Verdict

Pre-audit: **conditionally acceptable.** The plan's architecture (discriminated-union ToolResult, honest no-data, narrow per-module probes, boundaries explicitly protecting schema + embeddings) is sound. The gaps are implementation-sharpness issues: the contract promise that services "never throw on empty" was stated but not enforced against the adjacent failure modes (Voyage outage, Prisma connection loss, malformed venueId from Phase 4 callers). A plan that promises a uniform envelope but lets exceptions leak defeats the entire point of the envelope.

Post-audit: **enterprise-ready.** All 3 must-have gaps closed; 7 strongly-recommended hardenings applied. The `ToolResult<T>` contract now actually holds under fault conditions, not just on the happy path.

Would I approve for production — if this were a production system (it's a POC, but the question stands): **yes, post-fix**, with the caveat that the deferred items (unit tests, rate limiting, HNSW) have explicit triggers in the deferred list and will be addressed before scale.

## 2. What Is Solid

- **`ToolResult<T>` discriminated union with Zod schema.** Exactly the right contract for AI tool returns — TypeScript exhaustive handling on consumer side, runtime validation via Zod if needed. The `ok()` / `fail()` helpers prevent hand-rolled shape drift.
- **Narrow probe bootstrap (`RetrievalModule`, not `AppModule`).** Inherited pattern from 03-02; correctly scoped. No unrelated modules pollute probe startup.
- **Honest no-data as a first-class state, not a thrown exception.** Architectural decision, not a detail — consumers switch on `ok ? ... : reason`, no try/catch required.
- **Boundaries section.** Explicit protection of `schema.prisma`, embeddings service, seed data, neighbouring probe scripts. Prevents scope creep into Phase 2 outputs.
- **Scope limits are principled, not cosmetic.** HNSW deferral is tied to a trigger (1,000+ rows OR p95 > 500ms), not hand-waved as "post-POC." Same for `statement_timeout`.
- **MockOpsService file header explicitly marks TEMPORARY with the Xero/Square migration note.** Anyone reading `mock-ops.service.ts` in 6 months knows it's not load-bearing.
- **limit + minSimilarity clamping** (1..20, 0..1) — bounded inputs prevent abusive calls or DoS-by-limit-9999.
- **Vector parameterization via `$queryRawUnsafe` with bound parameters + cast.** Correct pattern — the vector is bound as a string literal parameter, not concatenated into SQL. Safe.
- **Explicit `WHERE embedding IS NOT NULL` clause.** Prevents fail-soft-ingest rows (NULL embedding) from consuming limit slots.

## 3. Enterprise Gaps Identified

### Must-Have Gaps (release-blocking)

**G-1: Embeddings call failure leaks as thrown exception.**
The plan has RetrievalService call `this.embeddings.embedText(query)` with no try/catch. Voyage API can 429, 500, timeout, or go down entirely. Current behaviour: exception propagates up to the chat engine, forcing every caller into try/catch — which breaks the ToolResult contract. Chat orchestration in Plan 04-01 should be able to write `const result = await retrieval.find(q)` and switch on `result.ok` without wrapping try/catch.

**G-2: MockOpsService methods don't catch exceptions.**
Same shape as G-1 but across four methods. If Prisma connection is lost, or a constraint violation surfaces, the tool call throws. AC-3 says "they NEVER throw on empty" — but empty-result is only one of many failure modes. The AC needs to extend to "they NEVER throw, period." Any exception becomes `fail('error', msg)`.

**G-3: Non-deterministic retrieval ordering on similarity ties.**
The SQL uses `ORDER BY embedding <=> $1::vector ASC` — no secondary sort. With 1024-dim cosine on small corpora, similarity collisions are rare but possible (near-duplicate docs, identical content across venues). Re-runs could return different row orders, which trips downstream determinism assumptions in chat response construction and test flakiness. Plan 03-01 audit flagged the same issue for SopDocument retrieval and added a secondary sort; 03-03 must follow.

### Strongly Recommended

**G-4: No venueId format validation.**
Caller passes `venueId: 'some-free-text-from-user'`. Postgres UUID parse throws. That exception now propagates because of G-1/G-2. Even once those are guarded, a DB-level parse error turns into a generic `fail('error', 'invalid input syntax for type uuid: ...')` — useful for debugging, but a controlled `fail('error', 'invalid venueId')` with format validation prevents the DB hit entirely and gives consumers a clean error reason.

**G-5: No query length cap on retrieval.**
Voyage's `embed()` has documented input limits per chunk (32k tokens for voyage-3). Long chat context accidentally passed in as `query` gets 400'd by Voyage, which with G-1 unfixed surfaces as a generic retrieval failure. Truncate at 2048 chars with a warn log — retrieval queries should be user-intent summaries, not full conversation blocks.

**G-6: Structured logging marked "optional" with raw query content.**
Two problems: (a) optional means inconsistent production evidence; (b) `query.slice(0, 80)` logs user query content — fine for hospitality operations but wrong on principle for an audit trail. A SOC-2-style review would flag this as "logs potentially sensitive user input." Fix: non-optional, log `queryLength + sha256-prefix + outcome + count + topSimilarity`. Every retrieval call leaves one structured line; forensic reconstruction works without PII exposure.

**G-7: `getStockBelowPar` has no tiebreak sort after in-JS filter.**
Sorting by depletion ratio alone means items with identical ratios shuffle across re-runs. Same determinism issue as G-3 but at the JS layer. Add `name ASC` secondary sort.

**G-8: `getUpcomingCutoffs` drops the real cutoff text.**
The seed `mock_suppliers.notes` field contains real ordering constraints like "Order by 5pm for next-day delivery. Main drinks distributor." The plan's synthetic `estimatedDeliveryHours = leadTimeDays * 24` throws this signal away. Chat engine then has to say "order arrives in ~48h" when the real, demo-worthy answer is "order by 5pm for next-day delivery" — directly from the supplier note. Zero implementation cost (one field add on the response payload); large demo-quality gain.

**G-9: probe-retrieval `getStockBelowPar` check is squishy.**
The plan accepts both `ok + length>=1` OR `ok: false, reason: 'no-data'` as pass. That's shape-only. Fixture inspection: Crown has 11 below-par items (Carlsberg Lager 3<4, Guinness 2<3, Doom Bar 1<2, Neck Oil 0<1, Hendricks 3<4, and 6 more). The assertion should be deterministic: `ok && data.length >= 5`. A squishy assertion hides regressions — if tomorrow a bug swaps the `<` to `<=`, both branches still pass the squishy check.

**G-10: probe-retrieval doesn't exercise venueId branch of SQL.**
Retrieval has two SQL variants (with/without venueId). Probe only runs the unfiltered variant. The venueId branch could silently break without probe detection. Add one check that calls `find(q, { venueId: VENUE_CROWN })` and asserts hits.

### Deferred (Can Safely Defer)

**D-1: Unit tests (Jest/Vitest).** Integration via probe-retrieval + probe-ingest + probe-seed is POC contract-level verification. Unit test coverage is a post-POC testing-infra plan, consistent with the pattern set in prior phases.

**D-2: Zod runtime validation of ToolResult in probe.** Probe asserts TypeScript types + structural properties. Adding `toolResultSchema(z.any()).parse(result)` would catch a service-to-type-drift, but the probe's structural checks (`!r.ok && r.reason === 'no-data'`) already enforce the discriminated union in practice. Defer until a chat-engine consumer legitimately needs runtime validation.

**D-3: pgvector HNSW/IVFFlat index.** Corpus is 6 knowledge_items + 24 mock_stock rows. Sequential scan on 6 rows is ~5ms. Trigger documented in 03-01 deferred-issues: 1,000+ rows OR p95 > 500ms. Not triggered; don't pre-optimize.

**D-4: Postgres `statement_timeout`.** Same corpus-size rationale. Trigger: corpus approaches 1,000 rows OR p95 > 3,000ms. Wire via connection-acquire hook or NestJS interceptor when triggered.

**D-5: Rate limiting on embedding calls.** Retrieval is not user-facing yet; rate limiting belongs at the Phase 5 API controller layer when chat is exposed over HTTP.

**D-6: Real cutoff-time parsing from `mock_suppliers.notes`.** G-8 exposes the notes field so the chat engine can surface them verbatim. Actually parsing "Order by 5pm" into a structured timestamp (timezone-aware, day-of-week-aware) is real-integration work — belongs in the Xero/Square integration milestone, not POC.

**D-7: Similarity range documentation.** pgvector cosine distance is [0, 2]; `1 - distance` gives [-1, 1]. minSim=0 filter lets through near-orthogonal results. A consumer-facing doc comment explaining this range is a documentation-hygiene task; the practical default (0.3) is fine.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | G-1: Embeddings exception leaks | AC-2 + Task 2 action | Wrapped `embedText` call in try/catch; returns `fail('error', 'embedding service unavailable: ...')` on any exception; AC-2 now explicitly requires the service never throw |
| 2 | G-2: MockOps methods throw on Prisma errors | AC-3 + Task 3 action | Added shared `guarded<T>(fn)` wrapper at module scope; every public method wraps its body in `guarded(...)`; AC-3 extended to require catching unexpected exceptions |
| 3 | G-3: Non-deterministic retrieval ordering on ties | AC-2 + Task 2 SQL | Added `, id ASC` secondary sort to both retrieval SQL variants (venueId-scoped and unfiltered) |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | G-4: No venueId format validation | AC-2 + AC-3 + Tasks 2+3 | Shared `UUID_RE` + `assertVenueId` helper; fail-fast `fail('error', 'invalid venueId')` before embedding or DB hit |
| 2 | G-5: No query length cap | AC-2 + Task 2 | Cap query at 2048 chars with `retrieval.query_truncated` WARN log event |
| 3 | G-6: Logging optional + content-leaking | AC-2 + Task 2 | Non-optional `logCall()` helper logging `queryLength + queryHash + outcome + count + topSimilarity`; old `query.slice(0, 80)` pattern replaced; redaction verified via grep in verification checklist |
| 4 | G-7: getStockBelowPar tiebreak missing | Task 3 | Added `name.localeCompare(b.name)` tiebreak after depletion-ratio sort; `id ASC` tiebreaks added to the other three Prisma `orderBy` clauses |
| 5 | G-8: getUpcomingCutoffs drops supplier notes | AC-3 + Task 3 | Added `supplierNotes: string \| null` to `MockUpcomingCutoff` type + response mapper; comment explains this exposes real cutoff text from seed |
| 6 | G-9: probe-retrieval getStockBelowPar squishy | AC-4 + Task 4 | Assertion tightened to `ok && data.length >= 5` (fixture has 11 below-par Crown items) |
| 7 | G-10: probe-retrieval misses venueId branch | AC-4 + Task 4 | Added check 8 (venueId-scoped retrieval hits) and check 9 (invalid-venueId fail-fast); probe now has 9 assertions instead of 7 |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | D-1 Unit tests | Probe scripts are POC contract-level verification; dedicated test-infra plan is post-POC |
| 2 | D-2 Zod runtime validation in probe | Structural checks already enforce discriminated union; re-add when chat engine consumer needs it |
| 3 | D-3 pgvector HNSW/IVFFlat index | Trigger: 1,000+ rows OR p95 > 500ms — not hit with 30 rows total |
| 4 | D-4 Postgres statement_timeout | Same corpus-size rationale; trigger: p95 > 3,000ms |
| 5 | D-5 Rate limiting on embedding calls | Retrieval not user-facing; belongs in Phase 5 controller layer |
| 6 | D-6 Real cutoff-time parsing from supplier notes | G-8 exposes notes; structured parsing is Xero/Square integration scope |
| 7 | D-7 Similarity range doc comment | Documentation hygiene; minSim default of 0.3 is fine in practice |

## 5. Audit & Compliance Readiness

**Evidence:** Every retrieval call now emits one structured log line (`retrieval.call` event) with outcome, count, topSimilarity, queryLength, queryHash. Post-fix, a forensic reconstruction of "what retrievals ran during the incident window" is possible from logs alone. Pre-fix, retrieval calls were optionally logged with raw query slices — both audit-inadequate (optional = inconsistent) and potentially PII-leaking.

**Silent-failure prevention:** Pre-fix, an exception in embed or Prisma became an unhandled promise rejection propagating up through chat orchestration — a silent failure from the chat user's perspective, with an ungrounded "something went wrong" response. Post-fix, every such case surfaces as `{ ok: false, reason: 'error', detail: '<specific>' }` and the chat engine can say "I hit a retrieval error — try again" rather than hallucinate.

**Post-incident reconstruction:** queryHash + outcome is enough to correlate a user complaint ("your answer was wrong at 2pm Tuesday") with a specific retrieval call, its outcome, and similarity distribution. Raw query content stays out of logs — reconstruction works on hash + nearby chat message IDs.

**Ownership:** IngestService owns knowledge-doc persistence (03-02). RetrievalService owns read-side knowledge access (03-03). MockOpsService owns mock-ops tool access (03-03). ChatOrchestration (04-01) will own tool routing. Clean seam.

**Would fail a real audit pre-fix?** Yes — on logging optionality, PII-in-logs, and exception-leak from a service whose contract promises never to throw. All three are closed post-fix.

## 6. Final Release Bar

**Must be true before ship:**
- All 3 must-have fixes applied (G-1, G-2, G-3) — ✅ applied
- All 7 strongly-recommended fixes applied — ✅ applied
- Verification checklist reflects audit additions (grep-based evidence lines for guarded/audit-added patterns) — ✅ updated
- probe-retrieval exercises 9 assertions including venueId-scoped + invalid-venueId fail-fast — ✅ updated

**Remaining risk if shipped as-is (post-fix):**
- No statement_timeout (Trigger: 1k-row corpus). Acceptable for POC corpus of 30 rows.
- No HNSW index (same trigger). Same acceptability.
- No rate limiting on Voyage calls (not user-facing yet; user-gated by Phase 5 controller when added).
- Unit test coverage deferred — relies on probe scripts + manual QA until post-POC testing plan.

**Sign-off:** Post-fix, I would sign my name to this plan for the defined POC scope. The contract (`ToolResult<T>` never throws; honest `no-data` where ambiguous; audit-defensible call log; deterministic ordering) actually holds under the failure modes it was designed for.

---

**Summary:** Applied 3 must-have + 7 strongly-recommended upgrades. Deferred 7 items (all with explicit triggers or scope-owners).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
