# Enterprise Plan Audit Report

**Plan:** .paul/phases/03-retrieval-layer/03-01-PLAN.md
**Audited:** 2026-04-18 12:58
**Verdict:** Conditionally acceptable → **Enterprise-ready after applied upgrades**

---

## 1. Executive Verdict

The plan's architectural choices are sound: direct prisma singleton (not DI), `$queryRawUnsafe` with positional `$1::vector` param (matches seeder, parameterized), explicit PascalCase/camelCase identifier correction of PAUL.md §8. The live probe anchors acceptance to real semantic relevance, not unit-test theatre.

Pre-audit, however, the plan had **five release-blocking gaps** that would have silently propagated data defects and one spurious architectural coupling. The retrieval layer is a trust boundary — every downstream AI response in Phase 4 will be built on what this service returns. After applying the must-have and strongly-recommended upgrades below, I would sign this plan for production.

Would I approve this for production as-is pre-fixes? **No.** Post-fixes? **Yes**, with the HNSW-index + statement_timeout trigger conditions recorded.

## 2. What Is Solid

- **`$queryRawUnsafe` with `$1::vector` positional param** — matches the seeder precedent (Plan 02-02). Parameterized where it matters; the vector-to-string conversion is the narrow unparameterized surface, correctly isolated in a single helper.
- **PAUL.md §8 correction flagged up front** — snake_case SQL and `this.prisma` injection would have failed silently at runtime (wrong table name → zero rows). Catching this pre-APPLY prevents an APPLY-time rework loop.
- **Scope discipline** — explicit exclusion of HNSW indexes, Redis cache, Zod schemas, Jest, always-included context. Prevents scope creep while leaving clear Phase 4 handoff.
- **Venue scoping consistent with multi-tenancy posture** — SOPs allow `venueId = $2 OR NULL` for global docs; stock is strictly `venueId = $2`. Correct for the dual model in the schema.
- **`embedding IS NOT NULL` guard** — cosine distance against NULL is undefined; filter protects against partial seeds.
- **Probe anchored on semantic relevance** — "ice" in title and "lager" in name are concrete regression signals, not cosmetic assertions.
- **Depends_on is honest** — genuine data dependency on 02-01 (embeddings service) and 02-02 (seeded corpus), not reflexive chaining.

## 3. Enterprise Gaps Identified

### Critical (release-blocking, pre-fix)

1. **Decimal precision loss** — `StockItem.currentQty`, `parLevel`, `reorderQty`, `costPerUnit`, `avgWeeklyUsage` are Prisma `Decimal` (Postgres `numeric`). Through `$queryRawUnsafe`, Prisma returns these as `Prisma.Decimal` instances or strings, NOT native `number`. The plan's TypeScript types claim `number`, so `si.currentQty * 2` in Phase 4 would silently misbehave. The `stockStatus` CASE expression already works in SQL, but callers doing arithmetic on `currentQty` post-query will hit the bug. **Fix:** Explicit `::double precision` cast on every Decimal column and every numeric computed column in the SELECT.

2. **Unvalidated vector input** — `toPgVector` builds `[${v.join(',')}]` from `number[]`. The type system says `number[]`, but at runtime (especially when Phase 4 pipes user input → embedding → retrieval), a malformed vector (wrong dim, NaN, non-numeric elements from some upstream bug) would produce invalid SQL or unparseable vector literals. Even a Voyage API misbehavior could leak non-finite values. **Fix:** Assert `length === 1024 && every(Number.isFinite)` before string construction. Throws before any DB round-trip.

3. **Unvalidated venueId** — `WHERE "venueId" = $2` trusts whatever the caller passes. A malformed venueId produces zero rows silently; worse, the error path through `findRelevantSops` for a non-existent-venue ID returns empty without distinguishing "no docs exist" from "caller sent garbage." **Fix:** UUID regex validation before the query, explicit `RetrievalError` on failure. (Use permissive regex — seed IDs like `d0000000-0000-4000-8000-...` deviate from strict v4.)

4. **No limit bounds** — `limit = 10` default is fine, but a caller passing `limit = 1_000_000` blows Postgres memory + API process. At 1024-dim embeddings, a million rows = ~8 GB in memory. **Fix:** Cap per-method (SOP: 50, stock: 100). Throw on overflow.

5. **Non-deterministic tie-breaking** — Two rows with identical cosine distance (possible with duplicate embeddings or boundary floats) produce nondeterministic order. This breaks reproducibility for debugging and for any eval framework that compares retrieval outputs across runs. **Fix:** `ORDER BY <dist> ASC, id ASC`.

### Architectural coupling

6. **Spurious `imports: [EmbeddingsModule]`** — The plan acknowledged RetrievalService doesn't use EmbeddingsService and justified the import as "consumer convenience." That justification is incorrect: an import only makes a module's exports visible to the *importing* module, not to *consumers* of that module. Consumers must import EmbeddingsModule themselves regardless. The line adds coupling without benefit. **Fix:** Remove the imports array entirely.

### Strong gaps (high-value, not strictly release-blocking)

7. **Unstructured error surface** — Raw `$queryRawUnsafe` exceptions propagate as pg-originated error strings. Callers can't programmatically distinguish "DB unreachable" from "validation failed" from "query returned empty." **Fix:** `RetrievalError` wrapper with machine-readable `kind` + `reason`, `cause` chain preserved for logs only.

8. **PII/privacy in logs** — Default NestJS patterns log query parameters. User queries can contain PII ("contact John Smith at Tesco"). **Fix:** Structured debug log that captures `{ kind, venueId, count, topSim, elapsedMs }` — NEVER the raw query text or embedding vector.

9. **No latency gate in probe** — The probe asserts correctness but not performance. A regression from 50ms to 5000ms passes the probe silently. **Fix:** `< 2000ms` per-call assertion.

10. **No explicit trigger for HNSW-index deferral** — "Defer until slow" is too vague to act on. **Fix:** Record explicit trigger in STATE.md Deferred Issues: "Create HNSW index when corpus > 1,000 rows OR p95 > 500ms."

### Compliance / audit evidence gaps

11. **Post-incident reconstruction is partial** — Without per-call structured logging, there's no way to answer "what did we retrieve for user X's query at time T?" post-hoc. Phase 4's `ChatMessage.retrievedSopIds/retrievedStockIds` covers persistence but only at ChatService wiring time. **Mitigation:** Debug-level logging added now creates the observability hook; ChatMessage persistence is tracked as a Phase 4 concern.

12. **No Postgres `statement_timeout`** — A runaway query hangs the NestJS request indefinitely. Acceptable at POC corpus size (<100 rows per table), but needs an explicit follow-up trigger. **Mitigation:** Documented in SCOPE LIMITS + STATE.md Deferred Issues.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Decimal precision loss on StockItem numeric columns | Task 1 action (Stock SELECT) | Added `::double precision` cast on currentQty, parLevel, reorderQty, costPerUnit, avgWeeklyUsage, weeksRemaining, similarity |
| 2 | Unvalidated vector input enables runtime surprises | Task 1 action (toPgVector) + types | `toPgVector` now asserts `length === 1024` and `every(Number.isFinite)`; throws RetrievalError |
| 3 | Unvalidated venueId returns silent empty | Task 1 action (helpers) + types | Added `assertVenueId` + `UUID_V4_REGEX` (permissive to match seed IDs); throws RetrievalError on fail |
| 4 | No upper bound on limit | Task 1 action (helpers) + types | Added `clampLimit` with MAX_SOP_LIMIT=50, MAX_STOCK_LIMIT=100; throws RetrievalError |
| 5 | Non-deterministic tie-breaking in ORDER BY | Task 1 action (SOP + Stock SQL) | Added `, id ASC` secondary sort to both ORDER BY clauses |
| 6 | Spurious `imports: [EmbeddingsModule]` | Task 2 action (retrieval.module.ts) | Removed — RetrievalModule has no imports array |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Raw pg exceptions leak; no machine-readable error surface | Task 1 action (types + service) | Added `RetrievalError` class with `kind` + `reason` + `cause`; try/catch wraps DB calls; safe error message (no pg internals) |
| 2 | No observability hook for retrieval quality or performance | Task 1 action (service) | Added debug-level structured log `{ kind, venueId, count, topSim, elapsedMs }`; warn on zero rows; no PII in logs |
| 3 | Probe doesn't catch performance regressions | Task 3 action + AC-3 | Added `< 2000ms` latency assertions per call |
| 4 | Probe doesn't verify the new validation surface | Task 3 action | Added three failure-path checks (invalid venueId, wrong-dim vector, out-of-bounds limit) asserting `RetrievalError` with expected `reason` |
| 5 | Decimal round-trip not verified end-to-end | Task 3 action | Added `typeof === 'number'` check for Decimal-backed fields |
| 6 | HNSW index deferral lacks trigger condition | Boundaries + SCOPE LIMITS | Explicit trigger: corpus > 1,000 rows OR p95 > 500ms; recorded in STATE.md Deferred Issues (post-apply) |

### Acceptance Criteria Added

- **AC-4** — Malformed inputs rejected before DB call (covers findings 2, 3, 4)
- **AC-5** — Numeric types coerced; ordering deterministic (covers findings 1, 5)

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Postgres `statement_timeout` on retrieval queries | Acceptable at POC corpus size (<100 rows per table). Documented trigger: add when corpus approaches 1,000+ rows. |
| 2 | Persistent per-call audit log | Phase 4's `ChatMessage.retrievedSopIds` / `retrievedStockIds` fields (already in schema) cover reconstruction when ChatService wires them. Debug logs from this plan provide interim observability. |
| 3 | Unit tests for RetrievalService | Project decision: probe is the verification path. Jest setup is a separate tooling plan. |
| 4 | Zod schemas in `packages/types` for retrieval results | Types are internal-only until Phase 4 surfaces them through an API boundary. |

## 5. Audit & Compliance Readiness

**Post-upgrade posture:**

- **Defensible audit evidence** — Structured debug logs on every retrieval establish the observability hook; venueId-scoped queries mean tenant isolation is enforceable and inspectable. The Phase 4 ChatMessage schema persists retrieved IDs, closing the evidence loop for end-to-end reconstruction.
- **Silent failure prevention** — Four validation paths (vector, venueId, limit, db-error) fail loudly with machine-readable reasons. Decimal cast to `double precision` eliminates the silent type-drift class of bugs.
- **Post-incident reconstruction** — Probe script + seeded deterministic UUIDs mean any retrieval bug can be reproduced locally. Structured logs (no PII) give traceable timelines.
- **Ownership** — RetrievalService is a single-module concern with a clear contract (two methods, two error types, one module). No shared state outside the prisma singleton.
- **Tenant isolation** — Venue filtering enforced at SQL level, not application level. UUID validation prevents id-confusion attacks.

**Remaining compliance gaps (documented, not release-blocking at POC):**
- No statement_timeout → runaway query could hang a request. Trigger documented.
- No persistent audit log of retrieval calls → Phase 4 ChatMessage wiring closes this.

## 6. Final Release Bar

**Must be true before ship (all applied to plan):**
- Input validation with typed error surface ✓
- Decimal → number coercion in SQL ✓
- Deterministic ordering ✓
- Clean module boundaries ✓
- Latency regression gate in probe ✓
- Structured logs without PII ✓

**Risks if shipped as-is (post-fixes):**
- Unbounded query time on large corpus (trigger documented)
- No persistent audit log of retrievals at the service level (Phase 4 closes this via ChatMessage)

**Would I sign?** Yes, post-fixes. The plan is now defensible against a real audit at POC scope, with explicit, actionable triggers for the two remaining scaling gaps.

---

**Summary:** Applied 6 must-have + 6 strongly-recommended upgrades. Added 2 acceptance criteria (AC-4, AC-5). Deferred 4 items (all documented with triggers or rationale).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
