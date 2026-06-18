# Enterprise Plan Audit Report

**Plan:** .paul/phases/03-retrieval-layer/03-01-PLAN.md
**Audited:** 2026-04-18 17:20 (rewrite audit — prior audit on superseded plan archived as 03-01-AUDIT_superseded.md)
**Verdict:** conditionally acceptable → enterprise-ready after applied fixes

---

## 1. Executive Verdict

As presented pre-audit: **conditionally acceptable**. The architectural direction (shapeless `KnowledgeItem` + honest `mock_*` ops tables) is correct and aligned with the Phase 3 discussion. But the plan as written had a destructive DB migration running under `autonomous: true` with no review-before-apply window, an internally contradictory seeder pattern (AC claimed upsert; pseudo-code + existing code used delete-then-create), a sweep grep that would produce false positives against the new Mock-prefixed model names, an undefined enrichment prompt shape, and fuzzy probe thresholds ("log if any missing so we notice").

None of those would fail at planning review — they would fail in execution, producing either a wedged migration, a seeder that the executor silently modifies in contradictory directions, or a sweep step that flags the refactored code as "dangling."

Post-fix: **enterprise-ready**. I would approve this plan for execution given the human-approval checkpoint on the migration SQL and the explicit probe thresholds.

Would I sign my name to this system as written post-fix? **Yes, for POC-to-investor scope.** For production hand-off later, we still need: vector index (HNSW/IVFFlat — already deferred in STATE.md with trigger), metadata validation at the ingest trust boundary (Plan 03-02 owns), retrieval latency SLOs, and a backup / point-in-time recovery story for NeonDB.

---

## 2. What Is Solid (Do Not Change)

- **`KnowledgeItem` with `metadata Json`** — correct response to the agentic-classification intent. No enum means no taxonomic lock-in, and metadata stays inside the row (not in a side table) so retrieval joins stay simple.
- **`mock_*` rename with `@@map` + TEMPORARY comments** — forces the "not-yet-integrated" state to be visible in schema, code, and logs. Exactly the "no hidden spoofing" discipline that the user called out in the rescoping discussion.
- **Re-seed instead of data migration** — fixture data, no prod data yet; RENAME TABLE / copy-data dance would be wasted complexity. The plan correctly identifies this and rejects the tempting wrong answer.
- **`embedding text = content + metadata` composition** — ensures tags/cross-refs contribute to retrieval signal, so retrieval quality tracks metadata quality. Good decision for the agentic loop.
- **Task 4 sweeps + ROADMAP + PROJECT.md updates baked in** — no orphaned planning artefacts. `/paul:unify` at the end of this plan will have everything it needs.
- **Scope limits section is honest** — explicitly defers Zod metadata validation to Plan 03-02, ops-tool adapters to Plan 03-03, vector index until triggered by real load. Avoids scope creep.

## 3. Enterprise Gaps Identified

### Gap A — Destructive migration with no human checkpoint
The plan set `autonomous: true` and used `prisma migrate dev` (which auto-applies). Review of the generated SQL was listed as a "before proceeding" step, but by the time the executor reaches that step, the migration has already run. Order of operations mismatched with the stated intent. For an operation that drops six tables, a review-before-apply window is table-stakes.

### Gap B — Seeder pattern contradiction
AC-3 claimed "upsert-based idempotency." Task 3 pseudo-code showed `prisma.knowledgeItem.upsert(...)`. But the existing `seed.command.ts` uses `deleteMany()` + `create()`/`createMany()`, and the plan did not explicitly tell the executor to remove the deleteMany block. An executor faced with "preserve the existing pattern in tasks you are editing" versus "use the upsert pseudo-code I just showed you" will pick inconsistently. This is the kind of ambiguity that silently survives through execution and breaks the idempotency claim later.

### Gap C — Sweep grep produces false positives
Task 4 grep pattern included `Supplier[^A-Z]`, `PurchaseOrder[^a-zA-Z]`, `PurchaseOrderItem`, `StockCategory`. After this refactor the codebase contains `MockSupplier`, `MockPurchaseOrder`, `MockPurchaseOrderItem`, `MockStockCategory` — all of which match those patterns because the old names are substrings of the new names. The sweep step, as written, would flag the correctly-refactored code as dangling references, triggering a spiral of "fixes" against the actually-correct code.

### Gap D — `toolCallLog` default shape mismatch
`toolCallLog Json @default("{}")` implies a keyed object. The stated use ("per-message record of which tools Claude called and what they returned") is actually an ordered sequence of calls — same tool can be invoked multiple times per turn, and order matters for reconstructing what Claude saw when. A list (`[]` default) fits the semantics; `{}` default would force Plan 04-01 to invent a keying scheme it doesn't need.

### Gap E — Enrichment prompt undefined
Task 3 instruction to the executor: "ask Claude 'What kind of document is this? (one or two words)' and accept whatever comes back." No JSON shape specified. Existing enrichment returns a structured object. Executor will invent a prompt, and whatever it invents will become the de facto contract. Drift risk plus ambiguity risk.

### Gap F — Probe thresholds fuzzy
"log if any missing so we notice" is not a pass/fail rule. The probe exits 0 based on strict counts + embedding non-null, but whether `metadata.docType` coverage failures count as pass, warn, or fail was unspecified. Probe outputs that are advisory-not-gating accumulate silent drift over time.

### Gap G — No rollback procedure
Destructive migration, downstream dependency chain (03-02, 03-03, 04-*, 05-*) all built on KnowledgeItem. No documented path to revert if Plan 03-01 turns out to be wrong or if Plan 03-02 discovers the shape needs adjustment. Not a release-blocker for POC, but a real gap — rollback is cheaper to document now than to invent under time pressure later.

### Gap H — Data-loss not acknowledged
`ChatMessage.retrievedSopIds`, `retrievedStockIds` column data is dropped by the migration. Empirically zero risk today (no real chat data) but the plan didn't explicitly note it. Good practice for destructive schema changes.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Destructive migration with no human checkpoint (Gap A) | Frontmatter; Task 2 action; `<operational_notes>` (new) | `autonomous: true` → `autonomous: false`. Task 2 rewritten to use `migrate dev --create-only` → review → apply; explicit human-approval checkpoint between steps 2 and 4. New `<operational_notes>` section documents the checkpoint requirement. Verify step adds "approval observed" check. |
| 2 | Seeder pattern contradiction (Gap B) | AC-3; Task 3 action | AC-3 now explicit: "uses `upsert` on every model (no delete-first wipe)." Task 3 action now includes: "Remove the `deleteMany()` wipe block at the top of `run()`" plus an audit-added preamble describing the upsert pattern and why it gives true idempotency. |
| 3 | Sweep grep false positives (Gap C) | Task 4 action | Single broken regex replaced with two-pass sweep: pass 1 = unambiguous old identifiers only; pass 2 = colliding names (`StockItem`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `StockCategory`, `stock_items`) piped through `grep -v "Mock"` to exclude `Mock*`-prefixed lines. Verification updated to require both passes zero-match. |
| 4 | `toolCallLog` default shape mismatch (Gap D) | AC-1; Task 1 action | `toolCallLog Json @default("{}")` → `@default("[]")` in both places. Comment on rationale added inline. Verification step added to grep the schema for the corrected default. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 5 | Enrichment prompt undefined (Gap E) | Task 3 action | Concrete prompt text added verbatim, with required JSON shape (`summary`, `tags`, `docType`), no-fences rule, trim+lowercase on docType, and explicit fail-soft log line shape `{ level: 'warn', event: 'enrichment.failsafe', title, reason }` so the probe can correlate with soft-threshold misses. |
| 6 | Probe thresholds fuzzy (Gap F) | AC-3; verification | AC-3 now spells out three tiers: strict (row counts + embedding non-null + `metadata.tags` array present — probe fails if missed), soft (≥5 of 6 `metadata.docType` — probe WARNs, exits 0), hard fail (>1 docType missing OR latency >5s). Verification checklist updated to the tiered thresholds. |
| 7 | Rollback procedure (Gap G) | `<operational_notes>` (new) | Four-step revert procedure added: `migrate resolve --rolled-back` → restore prior schema.prisma → reverse migration via `--create-only` → re-run prior seeder. Notes downstream plan dependency on KnowledgeItem. |
| 8 | Data-loss acknowledgement (Gap H) | `<operational_notes>` (new) | Explicit list of columns/tables destroyed, with assertion that current DB holds only fixture data. Rationale explicitly: "acknowledgement exists so the destructive behaviour is visible in the audit trail and so a future re-run against a populated DB triggers the same review." |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Unit tests for seeder / enrichment | POC scope excludes dedicated test coverage; `probe:seed` is the integration gate. Dedicated unit-test plan pre-launch. |
| 2 | Prod-DB write-protect assertion in seed | `prisma migrate dev` refuses prod URLs by default; `NODE_ENV=production` gate is already implicit. Worth tightening pre-launch but overkill for POC. |
| 3 | Zod schema for `metadata` | Explicitly owned by Plan 03-02 (agentic ingest). Adding here would duplicate work and pre-constrain the shape Plan 03-02 is supposed to discover. |
| 4 | HNSW/IVFFlat index on `knowledge_items.embedding` | Already tracked in STATE.md Deferred Issues with triggers (>1000 rows OR p95 latency >500ms). POC has 6 rows. |
| 5 | Postgres `statement_timeout` on retrieval | Already tracked in STATE.md Deferred Issues. Retrieval queries aren't even added in this plan (03-03). |

## 5. Audit & Compliance Readiness

**Audit evidence:** Post-fix, yes. Migration SQL file is persisted in version control; human approval of destructive SQL is explicitly required between generation and apply; probe output has tiered pass/fail/warn thresholds that produce clear evidence of what was verified.

**Silent-failure prevention:** Enrichment fallback now emits a structured `enrichment.failsafe` log line that the probe can correlate against soft-threshold misses. Probe hard-fails on any strict-threshold miss (not just "log if any missing"). `pnpm -w build` + `prisma migrate status` are explicit gates.

**Post-incident reconstruction:** Rollback procedure documented. Migration history preserved in `packages/database/prisma/migrations/`. Seed re-run is deterministic (stable fixture IDs).

**Ownership & accountability:** Plan scopes to a single executor (Task 1 → 4 sequential). Human approval checkpoint attaches the destructive-DDL decision to a named person in the conversation record. Downstream plan dependencies are called out in the rollback section so a revert's blast radius is visible.

**Would it fail a real audit?** The `autonomous: true` version would have — destructive DDL with no approval evidence is the canonical finding SOC 2 / ISO reviewers look for. The fixed version meets the change-management bar for a POC handled by a single developer with documented checkpoints.

## 6. Final Release Bar

**What must be true before this plan ships (post-fix all satisfied in PLAN.md):**
- `autonomous: false` with human checkpoint between SQL generation and application
- Seeder pattern unambiguously specified (upsert, no wipe)
- Sweep grep cannot produce false positives against new Mock-prefixed names
- `toolCallLog` default matches its ordered-list semantics
- Enrichment prompt is fully specified (no executor invention)
- Probe thresholds define pass / warn / fail explicitly
- Rollback procedure exists
- Data-loss is acknowledged in-plan

**Remaining risks if shipped as-is (post-fix):**
- Enrichment fail-soft can produce up to 1 knowledge_item with no `docType` per run — acceptable under the soft threshold, but if Claude degrades we could see silent drift. Mitigation: the `enrichment.failsafe` log line + soft-threshold WARN in probe surfaces this immediately. Re-check after Plan 03-02 adds proper metadata validation.
- No vector index yet — at 6 rows, retrieval is a sequential scan. Deferred per STATE.md. Triggers documented.
- Rollback procedure is documented but not rehearsed. If exercised, it will cost 15-30 minutes of manual work.

**Sign-off:** I would sign my name to this plan post-fix for investor-POC scope. The schema reshape is the right call, the operational guardrails are appropriate to the destructive operation, and the scope limits keep Plan 03-01 honest about what it owns versus what belongs downstream.

---

**Summary:** Applied **4** must-have + **4** strongly-recommended upgrades. Deferred **5** items (all with explicit triggers or scope-owners).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
