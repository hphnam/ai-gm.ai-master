---
phase: 05-tabular-query-path
plan: 01
subsystem: api
tags: [postgres, jsonb, prisma, nestjs, agent-tools, csv, xlsx, structured-data]

requires:
  - phase: 01-hierarchical-retrieval
    provides: ToolDispatcher.applyFindKnowledgeFormat boundary, AI SDK 6.x SystemModelMessage cacheControl wiring on stable system prefix, additive-schema pattern (tabular_rows + tabular_columns land alongside knowledge_sections + knowledge_chunks, no rip-replace).

provides:
  - tabular_rows + tabular_columns DB tables (additive, cascade-delete FK to knowledge_items)
  - extractTabular() — CSV/XLSX → { columns, rows } (parallel to existing string-returning extractors)
  - inferColumnTypes() — majority-vote (≥80% threshold) number/date/string inference
  - IngestService.persistTabular — try/catch tee post-section-persistence, 50K hard cap with fail-soft
  - TabularQueryService — closed-enum SQL DSL over JSONB with org-guard JOIN + safe-identifier regex
  - query_document_table agent tool — registered alongside find_knowledge with explicit aggregate vs enumeration shape guidance
  - System-prompt nudge — append-only to stable cacheControl-marked block, covers BOTH whole-table shapes (aggregate AND enumeration)
  - probe-tabular harness — 17 W's spanning 23 sub-asserts; idempotent

affects:
  - Future Phase 5+ work on multi-sheet (D-05-01-A), backfill (D-05-01-B), multi-doc joins (D-05-01-C), date ranges (D-05-01-D), saved queries (D-05-01-E)
  - Any future agent-tool work that wires manual ToolDispatcher construction (probe-section.ts + probe-eval.ts updated to 5-arg signature)

tech-stack:
  added: [No new dependencies — reused csv-parse/sync + exceljs from Plan 04-01]
  patterns:
    - Closed-enum SQL fragment dictionary (filter ops + aggregate fns) for injection-free DSL composition
    - Defence-in-depth column validation: whitelist + safe-identifier regex (whitelist alone insufficient when attacker controls CSV header)
    - Magic sort columns (_aggregate, _row_index) for shape-specific ordering inside a structured DSL
    - SELECT alias in GROUP BY / ORDER BY to avoid Postgres parameter-slot collision when same value bound multiple times

key-files:
  created:
    - packages/database/prisma/migrations/20260428153000_phase5_tabular/migration.sql
    - packages/types/src/tabular.ts
    - apps/api/src/modules/docs/extractors/tabular-extractor.ts
    - apps/api/src/modules/tabular/infer-column-types.ts
    - apps/api/src/modules/tabular/tabular.module.ts
    - apps/api/src/modules/tabular/tabular.service.ts
    - apps/api/scripts/probe-tabular.ts
  modified:
    - packages/database/prisma/schema.prisma (TabularRow, TabularColumn models + reverse relations on KnowledgeItem)
    - packages/types/src/index.ts (re-export tabular)
    - packages/types/src/tool-result.ts (TOOL_RESULT_REASONS extended additively)
    - packages/types/src/chat-tools.ts (TOOL_NAMES + TOOL_INPUT_SCHEMAS + TOOL_DEFINITIONS)
    - apps/api/src/modules/ingest/ingest.service.ts (persistTabular method, IngestInput.tabularSourceBytes)
    - apps/api/src/modules/docs/docs.controller.ts (capture buffer for CSV/XLSX uploads)
    - apps/api/src/modules/docs/docs.service.ts (thread tabularSourceBytes through enrichInBackground)
    - apps/api/src/modules/chat/tool-dispatcher.ts (5th constructor arg, query_document_table case)
    - apps/api/src/modules/chat/chat.module.ts (TabularModule import)
    - apps/api/src/modules/chat/system-prompt.ts (append-only nudge)
    - apps/api/scripts/probe-section.ts + probe-eval.ts (5-arg ToolDispatcher construction)
    - apps/api/package.json (probe:tabular script)

key-decisions:
  - "Manual migration SQL hand-written instead of prisma migrate dev — avoids bleeding pre-existing searchable_entities.searchVector drift (same precedent as Plan 01-01 deviation D2)"
  - "Whitelist alone insufficient against CSV-header injection — added SAFE_COLUMN_NAME_RE regex gate at Prisma.raw sites"
  - "GROUP BY references SELECT alias (not repeated `data->>$N`) — Postgres treats repeated parameter slots as distinct expressions even with identical bound values"
  - "AC-6 broadened mid-plan to include enumeration shape ('list all opening steps') — original plan was aggregate-only; the failure mode that motivated Phase 5 was enumeration-shaped"
  - "TOOL_RESULT_REASONS extended additively with 'not-found' and 'invalid-input' rather than reusing 'no-data' / 'error' — distinct semantics warrant distinct reasons"

patterns-established:
  - "Defence-in-depth structured DSL: Zod input → tenant guard JOIN → whitelist → safe-identifier regex → closed-enum SQL fragments → parameterized binds"
  - "Magic-column convention (_aggregate, _row_index) for sort affordances inside a JSONB query DSL"
  - "Append-only system-prompt edits (verified via `git diff | grep '^-'` returning zero) preserve cacheControl prefix bytes"

duration: ~50min
started: 2026-04-28T15:30:00+01:00
completed: 2026-04-28T16:15:00+01:00
---

# Phase 5 Plan 01: Tabular Query Path Summary

**`query_document_table` agent tool over JSONB row store closes the aggregate AND enumeration gap on CSV/XLSX docs that motivated this plan ("what do we need to follow to open?" → DSL returns all 25 rows, not a similarity-ranked slice).**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~50 minutes (16:30–16:15 BST) |
| Started | 2026-04-28T15:30:00+01:00 |
| Completed | 2026-04-28T16:15:00+01:00 |
| Tasks | 5 of 5 completed |
| Files created | 7 |
| Files modified | 12 |
| Probe assertions | 23 PASS (plan required ≥17) |
| Build | 100 files SWC ~45ms clean |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Tabular schema additive + tenant-scoped via FK | PASS | All 10 cols present, FK cascade verified, CHECK constraint on inferredType, both unique constraints (`@@unique([docId, rowIndex])` + `@@unique([docId, name])`) live in pg_indexes. KnowledgeItem.embedding byte-identical (whitespace-only diff from `prisma format` — see D1) |
| AC-2: Ingest tee fidelity | PASS | W1-W3 verify 100-row count + 4-column count + row_index 0..99 sequence. W16 verifies idempotent re-ingest (no duplicates). The `persistTabular` try/catch isolates failures from Phase 1 retrieval per spec |
| AC-3: Naive column-type inference | PASS | W4-W6 + extractor smoke (11/11) cover sku=string, price=number, ordered_at=date, notes=string, empty column → string default, year integers → number (NOT date — guard against Date.parse on bare integers) |
| AC-4: query_document_table — structured DSL, deterministic aggregates | PASS | W7 top-N group aggregate (Pinot Noir 25, Sauvignon 17, Cabernet 15). W8 sum=67. W9 count + avg + min + max. W10 contains filter. W11 numeric gt filter. W12 invalid input (unknown column + aggregate-on-non-numeric). All deterministic, all parameterized |
| AC-5: Cross-tenant isolation — doc_id query enforces organizationId match | PASS | W13 cross-org docId returns ok:false reason='not-found' + tabular.cross_org_denied warn log fires. JOIN-through-knowledge_items guard non-bypassable per defence-in-depth |
| AC-6: System-prompt nudge — agent reaches for tool on whole-table questions | STRUCTURAL PASS / RUNTIME PARTIAL | Nudge appended to stable cacheControl-marked block (`git diff \| grep '^-'` returned zero — append-only verified). W17a/b prove the DSL serves enumeration ("list all opening steps" with `_row_index` sort returns all 25 in source order; truncated flag wires correctly at limit:10). RUNTIME tool-selection UAT against `docs/OPENING CHECKLIST BEERHALL.xlsx` and W24 cache-prefix preservation deferred — needs Anthropic credit top-up, same posture as Phase 1 Plan 01-03 PARTIAL ACs |
| AC-7: Large-doc behaviour — hard cap + latency budget | PASS | W14 5000-row ingest under 10s (generous ceiling vs spec 2s p95 to absorb NeonDB cold-pool jitter; observed ~1s in probe). W14 query under 2.5s (observed 63ms). W15 50001-row → first 50000 persisted + KnowledgeItem.metadata.tabularRowCapExceeded=true |

## Accomplishments

- **Closed the gap that originally motivated Phase 5.** The "what do we need to follow to open?" failure mode (6+ similarity searches reconstructing 25 steps with 2 still missing) is structurally fixed: `query_document_table` with `_row_index` sort returns all 25 in source order in a single deterministic call.
- **AC-6 broadened mid-plan to cover enumeration AND aggregate shapes.** Original plan targeted aggregate questions only; the actual failure mode was enumeration-shaped. Adding the magic `_row_index` sort column + `truncated:boolean` flag + system-prompt nudge wording covering both shapes lifted the plan from "addresses ranking/totals" to "addresses every whole-table question shape."
- **Defence-in-depth security model held up under self-review.** Discovered mid-implementation that whitelist alone wasn't sufficient — an attacker controlling a CSV header could persist a malicious column name to `tabular_columns.name` then reference it in a query. Added `SAFE_COLUMN_NAME_RE` regex gate at all `Prisma.raw` sites; whitelist-validated names that don't pass the regex now reject with `invalid-input`.
- **Phase 1 zero-regression confirmed.** `probe:section` first run returned 27/27 PASS after the dispatcher signature change; the second-consecutive flake was pre-existing W22 advisory-lock orchestration jitter unrelated to Phase 5.

## Task Commits

Each task committed atomically:

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Schema migration | `80b649a` | feat | TabularRow + TabularColumn Prisma models + hand-written migration SQL with CHECK constraint, applied to NeonDB |
| Task 2: Extractor + tee | `fec2bb8` | feat | extractTabular for CSV/XLSX + inferColumnTypes majority-vote + IngestService.persistTabular tee with 50K cap + tabularSourceBytes threading controller→service→ingest |
| Task 3: Service DSL | `332c877` | feat | TabularModule + TabularQueryService with closed-enum SQL fragments, safe-identifier regex, tenant-guard JOIN, three execution branches (group-aggregate / aggregate-only / enumeration), default ORDER BY rowIndex ASC, truncated flag |
| Task 4: Agent tool + prompt | `c2c0f43` | feat | query_document_table registered in TOOL_NAMES/SCHEMAS/DEFINITIONS, dispatcher case, ChatModule import, append-only system-prompt nudge covering both whole-table shapes |
| Task 5: Probe + hotfixes | `bd75c83` | test | probe-tabular.ts (23 sub-asserts across W1-W17) + GROUP BY alias hotfix in tabular.service.ts + probe-section/probe-eval 5-arg ToolDispatcher construction |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/database/prisma/schema.prisma` | Modified | Added TabularRow + TabularColumn models, reverse relations on KnowledgeItem |
| `packages/database/prisma/migrations/20260428153000_phase5_tabular/migration.sql` | Created | Hand-written additive DDL with CHECK constraint, applied via `prisma migrate deploy` |
| `packages/types/src/tabular.ts` | Created | MAX_TABULAR_ROWS_PER_DOC, TABULAR_MIMES, InferredColumnType, TabularQueryInputSchema (closed enums for op/fn), TabularQueryResult schema |
| `packages/types/src/index.ts` | Modified | Re-export tabular |
| `packages/types/src/tool-result.ts` | Modified | TOOL_RESULT_REASONS additively extended with 'not-found' + 'invalid-input' |
| `packages/types/src/chat-tools.ts` | Modified | query_document_table added to TOOL_NAMES, Zod input schema, JSON Schema tool definition |
| `apps/api/src/modules/docs/extractors/tabular-extractor.ts` | Created | extractTabular(buffer, mime) returning {columns, rows} for CSV/XLSX, header dedup |
| `apps/api/src/modules/tabular/infer-column-types.ts` | Created | Majority-vote (≥80%) inference with year-not-date guard |
| `apps/api/src/modules/tabular/tabular.module.ts` | Created | NestJS module exposing TabularQueryService |
| `apps/api/src/modules/tabular/tabular.service.ts` | Created | Structured DSL with closed-enum SQL fragments, safe-identifier regex, three branches |
| `apps/api/src/modules/ingest/ingest.service.ts` | Modified | persistTabular method + IngestInput.tabularSourceBytes field |
| `apps/api/src/modules/docs/docs.controller.ts` | Modified | Capture file.buffer for CSV/XLSX, pass through enrichInput |
| `apps/api/src/modules/docs/docs.service.ts` | Modified | enrichInBackground accepts and forwards tabularSourceBytes + mimeType |
| `apps/api/src/modules/chat/tool-dispatcher.ts` | Modified | TabularQueryService 5th constructor arg, query_document_table dispatch case |
| `apps/api/src/modules/chat/chat.module.ts` | Modified | Import TabularModule |
| `apps/api/src/modules/chat/system-prompt.ts` | Modified | Append-only nudge covering aggregate + enumeration shapes |
| `apps/api/scripts/probe-tabular.ts` | Created | 23 assertions covering ingest fidelity, type inference, query correctness, tenant isolation, large-doc, hard cap, idempotency, enumeration shape |
| `apps/api/scripts/probe-section.ts` | Modified | 5-arg ToolDispatcher construction |
| `apps/api/scripts/probe-eval.ts` | Modified | 5-arg ToolDispatcher construction |
| `apps/api/package.json` | Modified | probe:tabular script |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Hand-written migration SQL (not `prisma migrate dev`) | Pre-existing `searchable_entities.searchVector` drift (68 non-null values) would have been auto-included in any `prisma migrate dev` output, contaminating the additive Phase 5 migration. Plan 01-01 D2 set this precedent. | Migration is purely additive; future `prisma migrate dev` calls will continue to surface the searchVector drift until a separate cleanup plan addresses it (still tracked under STATE.md drift note). |
| AC-6 broadened from aggregate-only to aggregate + enumeration mid-plan | The originally-described failure mode ("what do we need to follow to open?") is enumeration-shaped, not aggregate-shaped. Aggregate-only nudge would have left the regression case unfixed. | Plan acceptance + W17 + system-prompt wording grew to cover both shapes. Magic sort column `_row_index` introduced. `truncated:boolean` added to result type so the agent communicates "showing first N of M" rather than presenting capped results as exhaustive. |
| Whitelist + safe-identifier regex (not whitelist alone) | Discovered during self-review that an attacker can persist arbitrary column names via CSV header injection (`data); DROP TABLE--`); whitelist matches what's persisted, so it doesn't catch that case. Regex rejects unsafe names at SQL composition time. | All `Prisma.raw` sites for column-name interpolation now go through `safeRawColumnName()`. Names not matching `/^[A-Za-z0-9_ \-.]+$/` reject with `invalid-input` — defence-in-depth even if Zod or whitelist somehow miss. |
| GROUP BY references SELECT alias (not repeated `data->>$N` parameter slots) | Postgres parameter-slot semantics: repeated `${col}` template tags become distinct `$N` slots even when the bound value is identical, which makes `GROUP BY (data->>$3)` look syntactically different from `SELECT (data->>$1)` and triggers 42803. Discovered via W7 first-run failure. | Group-aggregate branch now uses `${groupColAlias}` (a `Prisma.raw` of the safe-validated column name) in GROUP BY + ORDER BY. Single source of truth, no parameter-slot drift. |
| TabularQueryService.query() re-validates input via TabularQueryInputSchema (defence-in-depth despite chat-tools.ts pre-validating) | If a future caller bypasses chat-tools.ts (direct service call from a different surface), the canonical schema in `@gm-ai/types/tabular` still gates input. | Two layers of validation; the service contract holds independent of who calls it. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 4 | Three caught pre-commit, one mid-probe — all essential, no scope creep |
| Scope additions | 1 | AC-6 broadening + W17 + magic _row_index column + truncated flag — discussed and approved before APPLY |
| Deferred | 1 | AC-6 runtime UAT pending Anthropic credit top-up |

**Total impact:** Plan executed cleanly with one in-flight scope expansion (AC-6 enumeration coverage, agreed before APPLY) and three small auto-fixes that hardened the security model and fixed a real Postgres semantic gotcha.

### Auto-fixed Issues

**1. Schema-prisma `embedding` field whitespace-only diff (D-05-01-D1)**
- **Found during:** Task 1 verify
- **Issue:** Plan's literal verify step `git diff schema.prisma | grep -c "embedding"` returned 4, not 0
- **Fix:** Confirmed semantic equivalence via `git diff -w` (whitespace-ignored) returning 0. The 4-line diff was purely from `prisma format` re-aligning columns due to the longer `tabularRows TabularRow[]` and `tabularColumns TabularColumn[]` reverse-relation field names pushing the formatter to add column padding.
- **Files:** `packages/database/prisma/schema.prisma`
- **Verification:** `git diff -w packages/database/prisma/schema.prisma | grep -cE "^[+-].*embedding"` returns 0
- **Commit:** Documented inline in `80b649a` commit message; AC-7 carry-forward intent intact.

**2. ToolDispatcher manual construction in probes (D-05-01-D2)**
- **Found during:** Task 5 grep pre-commit
- **Issue:** Task 4 added a 5th constructor arg (`tabular: TabularQueryService`) to `ToolDispatcher`. `probe-section.ts:1074` and `probe-eval.ts:155` construct dispatchers manually with 4 args — both probes would have crashed at startup after Task 4's commit.
- **Fix:** Added `import { TabularQueryService }` and `new TabularQueryService()` instantiation; passed as 5th arg in both probes.
- **Files:** `apps/api/scripts/probe-section.ts`, `apps/api/scripts/probe-eval.ts`
- **Verification:** `pnpm --filter api probe:section` returned 27/27 PASS post-fix. `probe:eval` typechecks (not run; needs Anthropic credits per Phase 1 deferred posture).
- **Commit:** Rolled into `bd75c83` (Task 5).

**3. Postgres GROUP BY parameter-slot collision (D-05-01-D3)**
- **Found during:** Task 5 W7 probe first-run
- **Issue:** Group-aggregate branch wrote `GROUP BY (data->>${groupCol})` and `SELECT (data->>${groupCol})` — Prisma binds each `${...}` as a separate `$N` parameter slot even when the value is identical. Postgres parser treats `(data->>$1)` and `(data->>$3)` as distinct expressions, triggering 42803 ("column tr.data must appear in GROUP BY").
- **Fix:** GROUP BY + ORDER BY now reference the SELECT alias (`${groupColAlias}`) — a `Prisma.raw` of the safe-validated column name. Single source of truth, no parameter-slot drift.
- **Files:** `apps/api/src/modules/tabular/tabular.service.ts:225-243`
- **Verification:** W7 PASS post-fix (Pinot Noir 25 / Sauvignon 17 / Cabernet 15 deterministic). All other branches unaffected.
- **Commit:** Rolled into `bd75c83` (Task 5).

**4. CSV-header injection vector (in-flight hardening, not a deviation per se)**
- **Found during:** Task 3 self-review while writing the SQL composer
- **Issue:** Whitelist alone insufficient — attacker uploads CSV with header like `data); DELETE FROM knowledge_items;--`, persists it to `tabular_columns.name`, then references it in `query_document_table.groupBy`. Whitelist matches because the malicious string IS a real column name.
- **Fix:** `SAFE_COLUMN_NAME_RE = /^[A-Za-z0-9_ \-.]+$/` regex gate at all `Prisma.raw` sites + early validator over `referencedColumns` set.
- **Files:** `apps/api/src/modules/tabular/tabular.service.ts:67-82, 122-153`
- **Verification:** `grep -E "Prisma\.raw" tabular.service.ts` shows every call goes through `safeRawColumnName()`. Whitelist + regex layered as defence-in-depth.
- **Commit:** Landed in `332c877` (Task 3).

### Scope Additions

**1. AC-6 enumeration shape coverage**
- **Found during:** Pre-APPLY plan review (user-facing follow-up to the original failure-mode investigation)
- **Original plan:** AC-6 only covered aggregate questions ("top 3", "total", "highest priced")
- **Added:** Enumeration shape ("list all opening steps", "what do we need to follow to open?", "walk me through the closing checklist") + magic `_row_index` sort column + `truncated:boolean` result flag + system-prompt nudge wording covering both shapes + W17a/b probe assertions
- **Rationale:** The motivating failure mode (`docs/OPENING CHECKLIST BEERHALL.xlsx` — 6+ similarity searches to piece together 25 steps with 2 missing) is enumeration-shaped, not aggregate-shaped. Aggregate-only nudge would have left the regression case unfixed.
- **User-approved:** Yes — discussed and confirmed before APPLY started.

### Deferred Items

| ID | Description | Trigger |
|----|-------------|---------|
| D-05-01-A | Multi-sheet XLSX support (currently sheet 1 only) | First customer with multi-sheet upload that breaks the assumption |
| D-05-01-B | Backfill of pre-Phase-5 CSV/XLSX docs (Phase 5 only persists tabular_rows for new uploads) | First customer with existing tabular docs requests aggregate queries |
| D-05-01-C | Multi-doc joins (currently single-doc queries only) | First customer asks "compare wines.csv with sales.csv" |
| D-05-01-D | Date range / timezone-aware comparisons (currently string-equality on date columns) | First customer asks "wines sold in March" |
| D-05-01-E | Saved / reusable queries (currently one-shot tool calls) | When same query repeats >5x per session per agent |
| D-05-01-D4 | AC-6 runtime UAT — manual operator walk against `docs/OPENING CHECKLIST BEERHALL.xlsx` confirming agent calls `query_document_table` with `_row_index` sort on "what do we need to follow to open?" | Anthropic credit top-up + manual operator session. Same deferred posture as Phase 1 Plan 01-03 PARTIAL ACs (4/5/7) |
| D-05-01-D5 | W24-equivalent cache-prefix runtime verification (turn1.cacheWrite > 0 + turn2.cacheRead > 0 with the new system-prompt nudge appended) | Anthropic credit top-up. Append-only diff structurally verified pre-deploy. |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `prisma migrate dev` non-interactive failure + drift detection | Hand-wrote migration SQL per Plan 01-01 D2 precedent. Applied via `prisma migrate deploy` (which doesn't reconcile drift). |
| `psql` not on PATH for verify commands | Used `prisma db execute` and a one-shot `tsx` verification script via Prisma client `$queryRawUnsafe` to inspect `information_schema.columns`, `pg_constraint`, `pg_indexes`. |
| `console.table` on `pg_constraint.contype` (`char` type) failed deserialization | Cast `contype::text` in verify query. |
| W7 group-aggregate first-run crash on Postgres 42803 | See deviation D-05-01-D3 — alias-based GROUP BY. |
| `probe:section` second-consecutive run W22 advisory-lock contention | Pre-existing flake (Plan 01-02 STATE notes lock needs cooldown between back-to-back runs). First-run was 27/27 PASS — Phase 5 zero-regression confirmed. |

## Skill Audit

`.paul/SPECIAL-FLOWS.md` does not exist — skill audit step skipped per workflow.

## Next Phase Readiness

**Ready:**
- DB schema additive — no Phase 1/2/3/4 paths affected.
- `query_document_table` agent tool live; system-prompt nudge appended to stable cacheControl-marked block (W24 cache prefix preserved structurally).
- `probe:tabular` 23/23 idempotent — regression net for any future Phase 5+ work.
- Five concrete deferred-item triggers registered for natural Phase 5+ follow-on plans.

**Concerns:**
- **AC-6 runtime tool-selection UAT pending Anthropic credit top-up.** The agent *can* now call `query_document_table` with `_row_index` sort to enumerate `OPENING CHECKLIST BEERHALL.xlsx`, but until credits are restored we can't observe whether the system-prompt nudge wording reliably steers the model to that branch on the originally-failing question phrasing. Same deferred posture as Phase 1 Plan 01-03 PARTIAL ACs.
- **Pre-existing `searchable_entities.searchVector` drift remains.** Hand-written migration sidesteps it; future `prisma migrate dev` will keep surfacing it until a dedicated cleanup plan addresses the column drop separately.
- **`probe:section` second-consecutive-run W22 lock contention is a probe orchestration flake** — not Phase 5 induced, but the lock cooldown gap means a single CI re-run can falsely indicate a Phase 1 regression. Worth tightening in a probe-helpers refactor (D-01-01-B trigger getting closer).

**Blockers:**
- None for next phase planning. Phase 5 closes at 1/1 plans.

---
*Phase: 05-tabular-query-path, Plan: 01*
*Completed: 2026-04-28*
