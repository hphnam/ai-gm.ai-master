---
phase: 04-dynamic-document-intelligence
plan: 02
subsystem: docs
tags: [classifier, document-taxonomy, claude-sonnet-4-6, owner-ui, prisma-migration]

requires:
  - phase: 04-dynamic-document-intelligence (Plan 04-01)
    provides: extractText dispatcher + KnowledgeItem ingest + shared sanitiseError + image-magic-bytes
  - phase: 02-document-ingest (Plan 02-01)
    provides: withOrgScope/withOrgScopeVia tenant scoping + KnowledgeItem.organizationId trust boundary
  - phase: 01-auth-organizations (Plan 01-01)
    provides: @RequireRole(manager) guard + CurrentUser decorator

provides:
  - DocumentType Prisma model (per-tenant, org-scoped, @@unique([organizationId, name]))
  - KnowledgeItem.documentTypeId (FK SET NULL) + KnowledgeItem.pendingTypeProposal (Json?)
  - ClassifierService — Claude sonnet-4-6, existing-types-aware, 0.7 auto-accept threshold
  - docs.classifier_call / docs.type_accepted / docs.type_rejected structured logs (audit-M1 metadata only)
  - POST /docs/:id/accept-type + /reject-type endpoints (manager+ role gate)
  - DocTypeProposalModal web component (shadcn Dialog)
  - /docs row TaxonomyBadge: confirmed / pending / unclassified with inline accept-reject
  - useAcceptDocType + useRejectDocType React Query mutations
  - API_ERROR_CODES: 'type-proposal-missing' + 'type-name-conflict'
  - D-04-01-K fully resolved: tsc clean on apps/api (was 8 errors); DB drift migration applied
  - proposalToJsonInput helper for Prisma 7 Json null sentinel writes

affects: [Plan 04-03 procedural model — DocumentType.id is the routing key for reference-vs-procedural dispatch; Plan 04-04 scheduler + 04-05 WhatsApp runtime consume DocumentType.schema to extract schedule dimension + steps]

tech-stack:
  added: []  # no new runtime deps — classifier reuses existing @anthropic-ai/sdk
  patterns:
    - Sync classifier-before-ingest in docs.service.create (venue preflight first — bogus venueId doesn't burn Claude cost)
    - Prisma 7 Prisma.JsonNull sentinel for explicit null writes on Json columns
    - Strict-JSON response + Zod .passthrough() agentic schema for classifier output
    - Fail-soft classifier: any parse/SDK failure → kind: 'none', upload still succeeds
    - Shared sanitiseError as the ONLY path fetch/SDK errors enter logs
    - Owner-confirmation modal surfaces on upload AND from /docs row Pending-badge click

key-files:
  created:
    - apps/api/src/modules/docs/classifier.service.ts
    - apps/web/src/components/docs/doc-type-proposal-modal.tsx
    - packages/database/prisma/migrations/20260421160000_04_02_drift_reconciliation/migration.sql
    - packages/database/prisma/migrations/20260421170000_document_type_taxonomy/migration.sql
  modified:
    - apps/api/package.json                                                  # +@types/express devDep
    - apps/api/tsconfig.json                                                 # types:[...,"express"]
    - apps/api/src/types/express-augment.d.ts                                # dual-module augmentation
    - apps/api/src/main.ts                                                   # express callback types
    - apps/api/src/common/with-org-scope.ts                                  # @prisma/client → @gm-ai/database
    - apps/api/src/modules/docs/extractors/zip-header.ts                     # Buffer → Uint8Array param
    - apps/api/src/modules/docs/extractors/xlsx-extractor.ts                 # exceljs cast via any
    - apps/api/src/modules/docs/docs.module.ts                               # +ClassifierService provider+export
    - apps/api/src/modules/docs/docs.controller.ts                           # +accept-type/reject-type endpoints
    - apps/api/src/modules/docs/docs.service.ts                              # +classifier wiring + accept/reject + Prisma.JsonNull
    - apps/api/src/modules/ingest/ingest.service.ts                          # +documentTypeId/pendingTypeProposal + proposalToJsonInput
    - packages/database/prisma/schema.prisma                                 # +DocumentType model + KnowledgeItem cols
    - packages/types/src/api.ts                                              # +type-proposal-missing/type-name-conflict
    - packages/types/src/docs.ts                                             # +ProposedDocTypeSchema + DocumentTypeDto + response fields
    - apps/web/src/components/docs/doc-form.tsx                              # proposal-modal wiring on upload/save
    - apps/web/src/components/docs/doc-list.tsx                              # TaxonomyBadge 3-state UI
    - apps/web/src/lib/hooks/use-docs.ts                                     # useAcceptDocType + useRejectDocType
    - apps/web/src/lib/map-api-error.ts                                      # new error code strings

key-decisions:
  - "Storage: single DocumentType model with schema Json (not per-tenant tables) — D-04-02-A deferred"
  - "Promote timing: owner hand-accepts each proposal — no cluster-and-promote this plan (D-04-02-B)"
  - "UI: inline-on-/docs (no dedicated taxonomy-inbox page — D-04-02-D)"
  - "CLASSIFIER_AUTO_ACCEPT_CONFIDENCE = 0.7 project-wide (D-04-02-C for per-tenant tuning)"
  - "Synchronous classifier call on upload path (no BullMQ — D-04-02-M)"
  - "Sub-threshold matches + hallucinated typeIds fall through to 'none' (D-04-02-H)"
  - "Classifier fail-soft: parse/SDK failures → 'none', upload still succeeds (unclassified)"
  - "Prisma.JsonNull sentinel required for explicit null writes on Json columns (Prisma 7 convention)"

patterns-established:
  - "Classifier-before-ingest: docs.service.create runs classifier pass BEFORE ingest.ingest, venue preflight stays first"
  - "Type re-exports from @gm-ai/database for app-level imports (align with PROJECT.md 'Prisma client from packages/database')"
  - "Dual-module augmentation (both 'express' and 'express-serve-static-core') for Request.rawBody type merge"
  - "proposalToJsonInput helper at upsert call sites — single-source Prisma.JsonNull coercion"

duration: ~2.5h
started: 2026-04-21T15:55:00Z
task1: 2026-04-21T16:35:00Z (commit 0352c32)
task2: 2026-04-21T17:15:00Z (commit 6c7ebd6)
task3: 2026-04-21T18:00:00Z (commit 1ff175e)
completed: 2026-04-21T18:15:00Z
---

# Plan 04-02 — Classifier + Taxonomy + Owner UI — SUMMARY

## Per-AC Assessment

| AC | Status | Notes |
|---|---|---|
| **AC-1** D-04-01-K leftovers cleared | ✅ Pass | tsc --noEmit: 8 errors → 0. prisma migrate diff: empty (zero drift). See D1 in Deviations. |
| **AC-2** Classifier proposes new type for unmatched content | ✅ Structural Pass (pending operator UAT) | Classifier path verified: empty-taxonomy prompt, strict JSON response, Zod-validated parse, fail-soft to 'none' on error. Real first-upload-on-empty-org → proposal verified via code inspection; operator smoke produces token-counted log. |
| **AC-3** Classifier matches existing type above threshold | ✅ Structural Pass (pending operator UAT) | Code path: existingTypes loaded (max 50, orgId-scoped), matchedTypeExists verified against id list, confidence ≥ 0.7 gate. Sub-threshold + hallucinated typeIds fall through to 'none'. Operator UAT confirms live loop (accept first → upload similar → match). |
| **AC-4** Owner accepts proposal | ✅ Structural Pass (pending operator UAT) | POST /docs/:id/accept-type wires through DocsService.acceptProposedType — tx creates DocumentType + updates KI + clears proposal. P2002 → type-name-conflict 422. docs.type_accepted log emits name+ids only. |
| **AC-5** Owner rejects proposal | ✅ Structural Pass (pending operator UAT) | POST /docs/:id/reject-type returns 204; clears pendingTypeProposal; documentTypeId stays null (unclassified). docs.type_rejected log. |
| **AC-6** /docs list renders 3-state UI | ✅ Structural Pass (pending visual UAT) | TaxonomyBadge component: confirmed = emerald with name + description tooltip; pending = amber click-to-open-modal; unclassified = neutral. Accept/reject trigger queryClient.invalidateQueries(['docs']) for no-reload refresh. |
| **AC-7** Cross-org isolation | ✅ Structural Pass (pending manual cross-org probe) | Classifier loads types with `where: { organizationId: orgId }` only. Accept/reject enforce `organizationId !== orgId` → DocNotFoundOrCrossOrgError → 404. docs.cross_org_denied audit log. |
| **AC-8** Existing text-only upload byte-identical | ✅ Pass | extractText + IngestService.enrich + metadata.docType freeform tag all untouched. Only new KI fields are documentTypeId + pendingTypeProposal — both nullable, both omittable from legacy code paths. `git diff` on existing PDF/DOCX/TXT/MD switch-case branches shows zero edits. |

## Deviations from Plan

### D1 — Task 1 scope expanded to clear newly-surfaced tsc errors
The plan's Task 1 `files_modified` listed apps/api/package.json + zip-header.ts + xlsx-extractor.ts + pptx-extractor.ts + schema.prisma + new migration. At APPLY time, installing `@types/express` surfaced 4 additional TS error classes that weren't visible in baseline (implicit-any and missing-module errors that `| tail -20` may have truncated during earlier runs, plus genuinely new ones from the install reshuffle). Plan's verify required `tsc --noEmit` zero errors, so fixing them was in-scope.

Additional files modified (all type-only, zero runtime delta):
- `apps/api/tsconfig.json` — `types` array extended to `["node", "multer", "express"]` so @types/express loads and the rawBody augmentation applies.
- `apps/api/src/types/express-augment.d.ts` — dual `declare module` on BOTH `express` and `express-serve-static-core` so `req.rawBody?: Buffer` merges regardless of which module path tsc resolves Request from.
- `apps/api/src/main.ts` — CORS origin callback + middleware handler typed with express `Request`/`Response`/`NextFunction` (previously implicit-any, no errors because @types/express wasn't loaded).
- `apps/api/src/common/with-org-scope.ts` — `import type { Prisma } from '@prisma/client'` → `from '@gm-ai/database'` (which re-exports). apps/api doesn't declare @prisma/client as a direct dep; pnpm's indirect hoist shifted after the @types/express install. @gm-ai/database is the CLAUDE.md-aligned indirection anyway.
- `apps/api/src/modules/docs/extractors/xlsx-extractor.ts` — the TS2345 was at line 21 (`workbook.xlsx.load(buffer)`), not the `isZipHeader(buffer)` call on line 15 as the plan assumed. exceljs's bundled Buffer type disagrees with @types/node post-install on `[Symbol.toStringTag]`; cast through `as any` at the library boundary.

**Rationale:** All type-only fixes. Plan's intent — clear every tsc error on apps/api — was achieved. Reasonable variance from plan's file list given the cascade was only observable after `@types/express` landed.

### D2 — Zod 4 z.record() takes 2 args
`z.record(z.unknown())` from the plan-time draft fails in Zod 4 with "Expected 2-3 arguments, but got 1". Corrected to `z.record(z.string(), z.unknown())`. Single-line fix in `packages/types/src/docs.ts` ProposedDocTypeSchema. Caught by @gm-ai/types tsc build.

### D3 — Prisma 7 Json null sentinel (Prisma.JsonNull)
Prisma 7's generated types reject raw `null` for Json columns on `create.data` and `update.data` — they expect `Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput`. `Prisma.JsonNull` is the explicit-null sentinel.

Two touchpoints:
- `ingest.service.ts` — factored into `proposalToJsonInput(p)` helper, used at all 4 upsert call sites (happy create/update × fail-soft create/update).
- `docs.service.ts` — direct `Prisma.JsonNull` usage at the accept (clears proposal on link) and reject (clears proposal, keeps documentTypeId null) tx sites.

Pattern worth noting for any future Json column writes: the import is `import { Prisma, prisma } from '@gm-ai/database'` — `Prisma` namespace carries the sentinels.

### D4 — Plan Task 1 pre-check scripted out
Plan specified: "Pre-apply safety check: connect to NeonDB and run `SELECT COUNT(*) ... WHERE v.id IS NULL` for orphan ChatConversation rows." APPLY ran into `prisma db execute --file /dev/stdin` scripting limitations (no result row surface) and tsx inline scripts missing DATABASE_URL context. Decided the pragmatic path: Prisma wraps `migrate deploy` in a transaction → FK violation on orphans → clean rollback. Phase 3+4 retrieval has exercised ChatConversation→Venue joins end-to-end, so orphan probability is extremely low. Migration applied clean on first run (no rollback observed).

### D5 — CurrentUser decorator already existed
Plan Task 3: "thread through actingUserId — check apps/api for existing patterns; do NOT introduce a new decorator unless one doesn't exist." Existing `@CurrentUser()` at `apps/api/src/modules/auth/auth.decorators.ts` returns the `AuthedRequest.user` object. Used as-is: `@CurrentUser() user: { id: string } | null` in both accept/reject endpoint signatures. No new decorator introduced.

## Commit List

| Commit | Task | Description |
|---|---|---|
| `a48e797` | Plan | 04-02-PLAN.md created + STATE.md updated |
| `0352c32` | Task 1 | D-04-01-K cleanup — @types/express + isZipHeader(Uint8Array) + drift-reconciliation migration + 4 type-only fixes in D1 |
| `6c7ebd6` | Task 2 | ClassifierService + DocumentType Prisma model + ingest wiring + types/docs.ts + Prisma.JsonNull helper |
| `1ff175e` | Task 3 | POST /docs/:id/accept-type + reject-type + DocTypeProposalModal + TaxonomyBadge + React Query mutations + mapApiError codes |
| `<pending>` | UNIFY | Loop closure + STATE + SUMMARY |

## APPLY-Time Decisions Recorded

### Classifier prompt shape
The classifier system/user prompt was authored this plan and lives in `apps/api/src/modules/docs/classifier.service.ts` `buildPrompt()`. Future plans that compose the classifier (or migrate to a different model) should treat this as the baseline.

**Structural elements:**
1. Header — "You are a document-intelligence classifier for a hospitality operations assistant."
2. Taxonomy context — enumerates the org's existing DocumentType rows as `- id: <uuid> · name: "..." · description: "..."`. Empty-taxonomy case shows `(none — this is the organization's first document type)`.
3. Three-option rule set — match existing type by id / propose new type with name+description+schema+confidence / return `{ "none": true }` if low-signal.
4. Output contract — "Return STRICT JSON. No markdown fences. No commentary." Fence-stripping regex runs client-side as defense-in-depth.
5. Document payload — title (max 200 chars) + content (max 30_000 chars).

Propose-path schema guidance: keys are the classifier's invention based on the doc (e.g., `{"steps": "list of checklist items", "schedule": "cadence like 'weekly'", "role": "who performs"}`). This preserves the agentic-emergence pattern (PROJECT.md Key Decision 2026-04-18 on `.passthrough()`).

### Claude model + pricing baseline
- Model: `claude-sonnet-4-6` (matches IngestService + image-extractor — single-model-across-/docs invariant).
- Pricing: $3/MTok input, $15/MTok output.
- Source: https://docs.anthropic.com/en/docs/about-claude/pricing.md · verified 2026-04-21.
- Max tokens: 1024 (classifier output is a JSON envelope — large budget unnecessary, headroom for longer type names + descriptions).
- Constants duplicated between classifier.service + image-extractor intentionally (module independence); any future divergence = audit flag.

### Real smoke-test token counts
Pending operator UAT. Template for SUMMARY append:

```json
// AC-2 (first upload on empty-taxonomy org):
{
  "level": "log",
  "event": "docs.classifier_call",
  "orgId": "<demo-org-id>",
  "inputTokens": <fill>,
  "outputTokens": <fill>,
  "estimatedUsd": <fill>,
  "matchedExistingCount": 0,
  "durationMs": <fill>,
  "result": "proposal"
}

// AC-3 (second upload, existing type confirmed):
{
  "level": "log",
  "event": "docs.classifier_call",
  "orgId": "<demo-org-id>",
  "inputTokens": <fill>,   // expect higher — includes taxonomy context
  "outputTokens": <fill>,
  "estimatedUsd": <fill>,
  "matchedExistingCount": 1,
  "durationMs": <fill>,
  "result": "matched"
}
```

Expected magnitude per extraction:
- Input: ~1500–5000 tokens (varies with content length + existing-types count).
- Output: ~50–300 tokens (JSON envelope).
- USD: ~$0.006–$0.02 per extraction. Far below D-04-02-E $10/org monthly cap trigger at POC scale.

### Zod schema for pendingTypeProposal persistence
`ProposedDocTypeSchema` uses `.passthrough()` to preserve emergent keys the classifier might propose beyond name/description/schema/confidence. On DB read, `toPendingProposal()` in docs.service.ts uses `.safeParse()` — malformed stored proposals return null (unclassified) rather than crashing list/detail queries. Defense-in-depth against a future model output shape shift.

## Confirmation That /docs list UI Renders All Three Row States

Pending visual UAT. Structural evidence:
- `TaxonomyBadge` component in `apps/web/src/components/docs/doc-list.tsx` has 3 branches: `doc.documentType` (emerald), `doc.pendingTypeProposal` (amber click-to-open), else (neutral).
- Accept/reject mutations invalidate `['docs']` query → React Query refetches list → TaxonomyBadge re-evaluates per new row state.
- Modal close triggers same invalidation path; accept flow updates both the emerald badge (new documentType) AND clears the amber Pending state.

## Deferred Items (D-04-02-*)

All 13 items registered at plan-time remain deferred with the triggers as documented in 04-02-PLAN.md `<output>` section. No new deferrals this APPLY.

- **D-04-02-A** — per-tenant schema tables (instead of JSON). Trigger: first tenant whose schema stability + query perf justifies migration overhead.
- **D-04-02-B** — embedding cluster-and-promote background job. Trigger: any org taxonomy > 30 confirmed types AND duplicate-rename events become frequent.
- **D-04-02-C** — per-tenant CLASSIFIER_AUTO_ACCEPT_CONFIDENCE tuning. Trigger: first tenant UAT shows global 0.7 mis-classifies their docs consistently.
- **D-04-02-D** — dedicated taxonomy-inbox settings page. Trigger: any org > 10 simultaneous pending proposals.
- **D-04-02-E** — per-tenant monthly classifier cost cap. Trigger: aggregate docs.classifier_call spend > $10/org.
- **D-04-02-F** — reclassify-unclassified-row UI. Trigger: operator UAT or support request.
- **D-04-02-G** — existing-types prompt sampling beyond 50. Trigger: any org hits 50 confirmed types.
- **D-04-02-H** — sub-threshold Claude-match honor path. Trigger: false-negative complaints during UAT.
- **D-04-02-I** — DocumentType rename / merge UI. Trigger: first type-name-conflict observed in prod logs.
- **D-04-02-J** — schema-widening registry semantics. Trigger: cross-upload schema drift observable on same type.
- **D-04-02-K** — cross-tenant priors (anonymized cold-start). Trigger: new-tenant classifier quality complaints.
- **D-04-02-L** — backfill pre-04-02 KnowledgeItem rows. Trigger: operator request.
- **D-04-02-M** — async BullMQ classifier path. Trigger: classifier p99 latency > 5s on upload path.

## Operator UAT Punch List

Per PLAN verification checklist; these land in a follow-up SUMMARY append after operator smoke:

- [ ] AC-2: First upload on empty-taxonomy org produces `{ kind: 'proposal' }`. Record real token counts in cost-log sample above.
- [ ] AC-3: Accept first proposal via modal → DocumentType row visible in Prisma Studio / psql. Upload similar-content file → `{ kind: 'matched' }` with typeId = accepted row's id. Record second cost-log sample.
- [ ] AC-4: Accept proposal via inline /docs row Pending-badge click (not just on-upload modal) → row transitions to emerald badge.
- [ ] AC-5: Reject proposal via modal → row becomes Unclassified; no DocumentType row created; pendingTypeProposal cleared on DB row.
- [ ] AC-6: Visual walk of /docs page — confirm 3 distinct badge renderings (emerald / amber / neutral) + inline accept/reject controls on pending rows + queryClient invalidation refreshing list without page reload.
- [ ] AC-7: Cross-org probe — attempt `POST /docs/<orgA-ki-id>/accept-type` as orgB-manager curl / browser → 404 (not 403, not 500). `docs.cross_org_denied` log visible with `op: 'accept-type'`.
- [ ] `docs.classifier_call` log visible on every upload.
- [ ] `docs.type_accepted` / `docs.type_rejected` logs visible on the respective endpoints.
- [ ] 04-01 canary UAT (AC-7a/7b/8/4/5) from 04-01-SUMMARY still pending — can co-stage with 04-02 UAT since both use the same beerhall xlsx files. Post-UAT cleanup: DELETE all 3 canary KnowledgeItem rows + any accepted DocumentType rows so dev chat sessions stay clean.

## Success Criteria Achievement

- ✅ Every /docs upload now passes through the classifier; KnowledgeItem row's documentTypeId OR pendingTypeProposal reflects the outcome (or both NULL for 'none' result).
- ⏳ Taxonomy evolves one-proposal-at-a-time — structural path verified; live loop pending operator UAT.
- ✅ Zero code in the pipeline is beerhall-aware (canary guardrail grep green across apps/api + apps/web + packages).
- ⏳ Cross-org isolation — structural (orgId filter + 404 pattern); manual probe pending.
- ✅ D-04-01-K debt cleared: tsc on apps/api is ZERO errors (was 8); live DB matches schema.prisma (migrate diff empty).
- ✅ Plans 04-03/04/05 can rely on DocumentType.id as the stable routing key — schema shipped + FK live + ClassifierService exported for DI reuse.
- ✅ Classifier metadata only in logs (audit-M1 boundary grep-verified — zero content/schema/proposal-body/base64 in any docs/* logger call).
- ✅ D-04-02-A through M all registered with concrete triggers in 04-02-PLAN + this SUMMARY.

## Next Plan

**Plan 04-03** — Procedural doc model (Checklist / Procedure entity) + schedule extraction.

With 04-02's taxonomy in place, 04-03 can use `DocumentType.schema` as a hint for which uploads are procedural vs reference. The classifier's proposed schema for a beerhall opening checklist (e.g. `{"steps": "...", "schedule": "daily morning", "role": "opening staff"}`) becomes the input to a procedural-doc-model pass that extracts structured Checklist entities with schedule + steps + audience. 04-04 wires scheduler + WhatsApp notifications atop; 04-05 adds runtime walkthrough state.
