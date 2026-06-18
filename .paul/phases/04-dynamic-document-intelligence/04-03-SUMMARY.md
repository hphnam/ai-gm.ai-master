---
phase: 04-dynamic-document-intelligence
plan: 03
subsystem: docs
tags: [checklist-extractor, claude-sonnet-4-6, procedural-doc-model, schedule-extraction, prisma-migration, abort-controller, semaphore]

requires:
  - phase: 04-dynamic-document-intelligence (Plan 04-02)
    provides: DocumentType model + ClassifierService + pendingTypeProposal pattern + Prisma.JsonNull sentinel + toPendingProposal safeParse pattern
  - phase: 04-dynamic-document-intelligence (Plan 04-01)
    provides: image-extractor semaphore pattern (mirror target) + sanitiseError shared util + audit-M1 log redaction boundary
  - phase: 02-document-ingest (Plan 02-01)
    provides: KnowledgeItem.organizationId trust boundary (inherits through Checklist FK cascade)
  - phase: 01-auth-organizations (Plan 01-03)
    provides: @CurrentUser decorator threaded through create/upload endpoints for audit-M8

provides:
  - DocumentType.kind column (TEXT + Zod enum) — 'reference' | 'procedural', default 'reference'
  - Checklist Prisma model (1-1 with KnowledgeItem via knowledgeItemId @unique)
  - ChecklistInstance Prisma model (empty schema this plan; 04-04 scheduler is first writer)
  - ChecklistStepCompletion Prisma model (empty schema this plan; 04-05 walkthrough is first writer)
  - ChecklistExtractorService — Claude Sonnet 4.6, strict JSON, fail-soft, runs post-ingest for procedural-kind KIs
  - DocumentTypeKindSchema + ChecklistStepSchema + ScheduleSchema + AudienceSchema Zod contracts (all .passthrough())
  - ChecklistInstanceKeySchema + CHECKLIST_INSTANCE_KEY_REGEX — audit-M4 format contract for 04-04 scheduler
  - POST /docs/:id/accept-type extended with optional body.kind override
  - docs.checklist_extract_call / docs.checklist_extract_queued / docs.checklist_extract_skipped / docs.checklist_extracted / docs.matched_type_missing structured logs (all audit-M1 boundary — metadata only)
  - docs.type_accepted log extended with `kind` + `kindOverridden` fields (audit-S5)
  - DocTypeProposalModal kind-toggle UI (reference | procedural radio group, WCAG AA icon+text)
  - ProceduralIndicator amber badge on /docs list rows
  - Checklist block in /docs/[id] detail body — schedule line, audience pills, numbered step list with kind icons + 200-step display cap + overflow banner
  - useAcceptDocType mutation signature extended to { docId, kind? }
  - API_ERROR_CODES: 'checklist-extraction-failed' (reserved for future D-04-03-F retry-extract endpoint)

affects: [Plan 04-04 scheduler — consumes Checklist.schedule cadence + Checklist.id as firing key + (checklistId, instanceKey) unique for dedup; Plan 04-05 WhatsApp runtime — consumes Checklist.steps + ChecklistInstance + ChecklistStepCompletion persistence primitives for walkthrough state machine]

tech-stack:
  added: []  # zero new runtime deps — reuses Anthropic SDK + lucide-react (CheckSquare/Camera/Hash/FileText icons already in project)
  patterns:
    - ChecklistExtractorService mirrors image-extractor.ts semaphore-with-queue pattern for concurrent-call control
    - Post-ingest hook orchestration in docs.service.create (classifier → ingest → matched-type lookup → optional extractor)
    - Post-accept-transaction extractor hook in docs.service.acceptProposedType (fire-and-return-null fail-soft)
    - safeParse defence-in-depth on persisted Json columns (toChecklistDto mirrors toPendingProposal precedent)
    - audit-M5 accountability log pattern — docs.checklist_extracted with actingUserId + kindSource distinguishing matched-path from accept-type-path extractions
    - audit-M6 race-condition surface log — docs.matched_type_missing when classifier-matched typeId disappears between classify and post-ingest hook

key-files:
  created:
    - apps/api/src/modules/docs/checklist-extractor.service.ts
    - packages/database/prisma/migrations/20260421180000_checklist_entity/migration.sql
    - .paul/phases/04-dynamic-document-intelligence/04-03-PLAN.md
    - .paul/phases/04-dynamic-document-intelligence/04-03-AUDIT.md
    - .paul/phases/04-dynamic-document-intelligence/04-03-SUMMARY.md (this file)
  modified:
    - packages/database/prisma/schema.prisma                             # +DocumentType.kind + Checklist + ChecklistInstance + ChecklistStepCompletion + back-relations
    - packages/types/src/docs.ts                                         # Zod contracts + DTOs
    - packages/types/src/api.ts                                          # +'checklist-extraction-failed'
    - apps/api/src/modules/docs/docs.module.ts                           # register + export ChecklistExtractorService
    - apps/api/src/modules/docs/docs.service.ts                          # post-ingest hook + acceptProposedType kind override + checklist hydration + toChecklistDto + kindSource threading
    - apps/api/src/modules/docs/docs.controller.ts                       # @CurrentUser on create/upload + body.kind on acceptType
    - apps/api/src/modules/docs/classifier.service.ts                    # prompt asks Claude for kind in proposal
    - apps/web/src/components/docs/doc-type-proposal-modal.tsx           # kind radio-group toggle + extractor-context hint
    - apps/web/src/components/docs/doc-list.tsx                          # ProceduralIndicator badge
    - apps/web/src/app/docs/[id]/doc-detail-body.tsx                     # Checklist block (schedule/audience/steps + 200-cap)
    - apps/web/src/lib/hooks/use-docs.ts                                 # useAcceptDocType signature: (docId) → ({docId, kind?})
    - apps/web/src/lib/map-api-error.ts                                  # +'checklist-extraction-failed' user string

key-decisions:
  - "DocumentType.kind as TEXT + Zod enum (not native Prisma enum) — tenant-owned taxonomy columns shouldn't carry enum-migration cost per new value"
  - "Checklist 1-1 with KnowledgeItem (knowledgeItemId @unique FK) — simplest mental model; re-extraction replaces via upsert"
  - "ChecklistInstance + ChecklistStepCompletion tables ship empty — 04-04/05 writers; lands now to avoid migration drift between plans"
  - "Extraction fires only when DocumentType.kind === 'procedural' (matched path) OR post-accept on procedural-kind promotion — proposal-pending rows never extract"
  - "Fail-soft contract: extractor failure never blocks upload response; operator-diagnostic log is the audit surface"
  - "Step-index normalization is load-bearing — 04-05 walkthrough runtime's step-pointer invariant depends on contiguous [0..N-1] indices regardless of Claude's emission"
  - "ChecklistInstanceKeySchema is the format contract between 04-03 schema and 04-04 scheduler — enforced at Zod layer, not DB CHECK"
  - "Kind-override tracked via kindOverridden boolean in docs.type_accepted — auditor can reconstruct 'did owner flip the classifier's proposal?'"
  - "Detail-view target file is apps/web/src/app/docs/[id]/doc-detail-body.tsx (NOT components/docs/doc-detail.tsx — audit-M7 corrected plan path)"

patterns-established:
  - "Semaphore-with-queue pattern for all Claude-call concurrency bounds (inFlight + waiters + queue-timeout) — mirror image-extractor.ts:41-78"
  - "AbortController-per-call for Anthropic messages.create timeouts — 30s for extractor, tuned to max_tokens budget"
  - "1-retry-on-transient via status-code check (>=500 || 429) — mirror IngestService.enrich attempt loop"
  - "Pre-flight content-length floor to skip obviously-empty extractions — emit docs.*_skipped log for operator visibility"
  - "kindSource enum ('matched' | 'accept-type') on extractor audit log — distinguishes classifier-driven vs owner-driven procedural classification"
  - "@CurrentUser decorator required on any endpoint that triggers downstream AI work with persistent side effects — for actingUserId audit trail"

duration: ~1h 10m
started: 2026-04-21T16:40:00Z
task1: 2026-04-21T17:00:00Z (commit daafb00)
task2: 2026-04-21T17:30:00Z (commit 34d033a)
task3: 2026-04-21T17:50:00Z (commit 66e437d)
completed: 2026-04-21T18:00:00Z
---

# Phase 4 Plan 04-03: Procedural doc model + schedule extraction — SUMMARY

**Every DocumentType now carries `kind` (`reference | procedural`); procedural uploads trigger a Claude-based `ChecklistExtractorService` that lands structured `{steps, schedule, audience}` into a new `Checklist` row with full runtime-safety envelope (30s abort + 3-concurrent semaphore + 15s queue timeout + step-index normalization + 1-retry + 200-char content floor) and a dual audit trail (`docs.checklist_extract_call` for mechanics, `docs.checklist_extracted` with actingUserId + kindSource for accountability). Completion-state tables ship empty; 04-04 scheduler + 04-05 walkthrough are first writers.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1h 10m |
| Started | 2026-04-21T16:40:00Z |
| Completed | 2026-04-21T18:00:00Z |
| Tasks | 3 completed · 0 failed · 0 checkpoints (autonomous) |
| Files modified | 13 (11 source, 1 migration, 1 plan/audit pair) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Schema migration additive + idempotent | ✅ Pass | `prisma migrate deploy` applied clean; `prisma migrate diff --from-config-datasource --to-schema --script` returns empty migration. DocumentType.kind DEFAULT 'reference' backfills pre-existing rows via SQL DEFAULT. tsc clean on apps/api. |
| AC-2: Classifier emits kind in proposals | ✅ Structural Pass (pending operator UAT) | `classifier.service.ts` prompt updated to require `kind: 'reference'\|'procedural'` in proposal envelope. `ProposedDocTypeSchema.kind` default 'reference' with `.passthrough()` ensures emergent keys survive. Operator upload smoke pending to confirm Claude actually emits the field. |
| AC-3: Owner can override kind at accept-time | ✅ Structural Pass (pending operator UAT) | `acceptProposedType(..., kindOverride?)` signature. Resolution: `kindOverride ?? proposal.kind ?? 'reference'`. `kindOverridden: boolean` in `docs.type_accepted` log. UI passes kind only when owner explicitly flips (keeps body minimal). |
| AC-4: Procedural upload → extraction runs + row created | ✅ Structural Pass (pending operator UAT) | `docs.service.create` — after ingest, if classifier matched a DocumentType whose kind is procedural, `ChecklistExtractorService.extract` fires with `kindSource: 'matched'`. Upsert on `knowledgeItemId @unique`. `docs.checklist_extract_call` + `docs.checklist_extracted` logs shipped with token/cadence metadata only. |
| AC-5: Extraction failure is fail-soft | ✅ Structural Pass (pending operator UAT) | Extractor `try/catch/finally` — any throw → sanitiseError log + return null + semaphore release. No exception escapes to caller. KI always persists via earlier `ingestService.ingest` call; extractor operates on an already-committed row. |
| AC-5a (audit-added): Runtime-safety bounds enforced | ✅ Structural Pass | `EXTRACTOR_CALL_TIMEOUT_MS=30_000` via AbortController on messages.create; `MAX_CONCURRENT_CHECKLIST_EXTRACTS=3` semaphore; `EXTRACTOR_QUEUE_TIMEOUT_MS=15_000`; `EXTRACTOR_MAX_RETRIES=2` with 5xx/429 predicate. All six constants + AbortController grep-verified. |
| AC-5b (audit-added): Step-index contiguity guarantee | ✅ Pass | Post-parse `.map((s, i) => ({ ...s, index: i }))` at extractor line 246. Normalization runs before upsert. 04-05 walkthrough runtime's step-pointer contract holds for any Claude emission order. |
| AC-5c (audit-added): Extraction audit trail carries actingUserId | ✅ Structural Pass (pending operator UAT) | `docs.checklist_extracted` on success carries `{orgId, actingUserId, knowledgeItemId, checklistId, stepCount, cadence, kindSource}`. `docs.matched_type_missing` warn log fires when `effectiveTypeId` truthy but `documentType.findUnique` returns null. audit-M1 boundary preserved (no step text / rawText / content body). |
| AC-5d (audit-added): Content-length floor skips empty extractions | ✅ Pass | `if (input.content.trim().length < EXTRACTOR_MIN_CONTENT_CHARS)` at extractor line 127 — emits `docs.checklist_extract_skipped` with `reason: 'content-too-short'`, returns null without Claude call. |
| AC-6: /docs list shows procedural signal; detail renders Checklist | ✅ Structural Pass (pending visual UAT) | `ProceduralIndicator` amber CheckSquare badge renders when `row.isProcedural === true`. Detail-body Checklist block renders schedule line (via `formatScheduleLine`), audience role pills (sky/violet/rose per role), numbered steps list with per-step kind icon (tick=CheckSquare / numeric=Hash / photo=Camera / text=FileText). 200-step display cap + overflow banner implemented. |
| AC-7: Existing reference uploads byte-identical | ✅ Structural Pass (pending smoke) | Reference-kind classification skips the extractor branch entirely. No Checklist row, no `docs.checklist_*` log, no extractor call. Existing Phase 3 enrichment (metadata.docType, aiSummary, tags) untouched — grep confirms no edits to IngestService beyond Task 1's Zod import update. |
| AC-8: Cross-org isolation preserved | ✅ Structural Pass (pending cross-org probe) | Checklist FK-cascades from KnowledgeItem (existing trust boundary). Extractor's single DB write is the `prisma.checklist.upsert` keyed by `knowledgeItemId`; organizationId is passed from `input.orgId` which inherits from create()'s guard path. `docs.matched_type_missing` log + 404-not-403 pattern preserved from 04-02. |

## Accomplishments

- Procedural doc model is schema-complete + runtime-active. Claude extracts structured `{steps, schedule, audience}` from procedural uploads on both the matched path (classifier ≥0.7 confidence) and the accept-type path (owner promotes to procedural kind), persists to a 1-1 Checklist row, and emits dual-log accountability trail (mechanics log + acting-user success log) that the next two plans consume via DI.
- Full audit-applied runtime-safety envelope shipped on day one — 30s AbortController timeout, 3-concurrent semaphore with queue-timeout, 1-retry on transient 5xx/429, pre-flight content floor, post-parse step-index normalization. Mirrors the established image-extractor.ts pattern so 04-04/05 (and any future procedural-layer extenders) inherit the posture.
- Cross-plan contract explicitly shipped: `ChecklistInstanceKeySchema` + `CHECKLIST_INSTANCE_KEY_REGEX` in @gm-ai/types define the format 04-04 scheduler MUST use when writing `instanceKey` values. The `@@unique([checklistId, instanceKey])` DB constraint only guarantees uniqueness; this Zod schema guarantees format so lookups are deterministic.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| (Plan + Audit) | `a227111` .. `5f23bdc` (prior plans) | plan | (Plan + Audit files created during the PLAN/AUDIT phases before APPLY) |
| Task 1: Schema + Zod contracts | `daafb00` | feat | DocumentType.kind, Checklist, ChecklistInstance, ChecklistStepCompletion, Zod schemas, ChecklistInstanceKeySchema, hydrator updates for new DTO fields |
| Task 2: ChecklistExtractorService + classifier + docs.service hook | `34d033a` | feat | New extractor service with full runtime-safety envelope, classifier prompt kind-awareness, docs.module export, docs.service post-ingest hook + matched_type_missing race log |
| Task 3: Accept-type kind override + /docs UI | `66e437d` | feat | @CurrentUser on 4 endpoints, acceptType body.kind, modal radio toggle, ProceduralIndicator, Checklist block in detail-body, useAcceptDocType signature change, map-api-error entry |
| Plan metadata | `a227111` (ancestor) + STATE updates | docs | Plan file + audit report committed alongside Task 1 (daafb00) |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/database/prisma/schema.prisma` | Modified | +DocumentType.kind column + Checklist + ChecklistInstance + ChecklistStepCompletion models + back-relations on Organization + KnowledgeItem |
| `packages/database/prisma/migrations/20260421180000_checklist_entity/migration.sql` | Created | Hand-authored additive migration (kind DEFAULT 'reference' backfill + 3 new tables with FKs + unique indices) |
| `packages/types/src/docs.ts` | Modified | +DocumentTypeKindSchema + ChecklistStepSchema + ScheduleSchema + AudienceSchema + ChecklistInstanceKeySchema + ChecklistDto + DocumentTypeDto.kind + DocListItem.isProcedural + DocDetail.checklist + CreateDocResponse.checklist + AcceptTypeRequestSchema.kind |
| `packages/types/src/api.ts` | Modified | +'checklist-extraction-failed' in API_ERROR_CODES (reserved for D-04-03-F) |
| `apps/api/src/modules/docs/checklist-extractor.service.ts` | Created | Claude-based procedural extractor with 30s timeout + 3-concurrent semaphore + 15s queue timeout + 1-retry on 5xx/429 + 200-char content floor + post-parse step-index normalization + fail-soft + audit-M1 log redaction |
| `apps/api/src/modules/docs/classifier.service.ts` | Modified | Prompt asks Claude for kind in proposal envelope (rule 2 extended) |
| `apps/api/src/modules/docs/docs.module.ts` | Modified | Register + export ChecklistExtractorService |
| `apps/api/src/modules/docs/docs.service.ts` | Modified | Constructor injects extractor · create(..., userId) gains post-ingest hook with kindSource='matched' + matched_type_missing warn log · acceptProposedType(..., kindOverride?) resolves kind, logs kindOverridden, fires post-accept extraction with kindSource='accept-type' · toDocumentTypeDto threads kind · toChecklistDto safeParse defence-in-depth · list() returns isProcedural · getById() returns checklist |
| `apps/api/src/modules/docs/docs.controller.ts` | Modified | @CurrentUser added to @Post() create + @Post('upload') · userId threaded through docsService.create · @Post(':id/accept-type') forwards body.kind to acceptProposedType |
| `apps/web/src/components/docs/doc-type-proposal-modal.tsx` | Modified | Radio-group kind toggle (reference | procedural) with extractor-context hint; accept passes kind only when owner overrode |
| `apps/web/src/components/docs/doc-list.tsx` | Modified | ProceduralIndicator amber CheckSquare badge rendered when row.isProcedural === true |
| `apps/web/src/app/docs/[id]/doc-detail-body.tsx` | Modified | Checklist block: schedule line via formatScheduleLine, RolePill audience pills, numbered steps list with StepKindIcon, 200-step display cap + overflow banner |
| `apps/web/src/lib/hooks/use-docs.ts` | Modified | useAcceptDocType signature: (docId: string) → ({docId, kind?: DocumentTypeKind}) |
| `apps/web/src/lib/map-api-error.ts` | Modified | +'checklist-extraction-failed' user-facing string (reserved for D-04-03-F) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| kind as TEXT + Zod enum (not native Prisma enum) | Tenant-owned taxonomy columns shouldn't carry enum-migration cost per new value | Future `kind` values (e.g. 'form', 'policy') land without schema migration — Zod schema + one-line Prisma column update suffice |
| Checklist 1-1 with KnowledgeItem (`knowledgeItemId @unique`) | Simplest mental model; re-extraction upserts in place | 04-04/05 can locate a Checklist by KI id directly; no intermediary join |
| Completion tables (Instance + StepCompletion) ship empty | Splitting migrations across plans invites drift; pure-schema additions are zero-risk | 04-04 scheduler has a dedup surface (`@@unique([checklistId, instanceKey])`) ready day one; 04-05 walkthrough has a completion-persistence target |
| Extraction fires ONLY when `DocumentType.kind === 'procedural'` | Proposal-pending rows have unconfirmed kind — extractor call would burn Claude cost on kind that may get owner-flipped to reference | Matched-path + accept-type path are the only trigger points; proposal-pending never extracts |
| Step-index normalization via `.map((s, i) => ({...s, index: i}))` | Claude may emit non-contiguous indices or duplicates; 04-05 walkthrough's step-pointer contract requires `[0..N-1]` by array order | Runtime walkthrough guaranteed deterministic regardless of Claude emission behavior |
| kindOverridden boolean in docs.type_accepted log | Auditor reconstruction needs to distinguish "owner accepted classifier's kind" from "owner explicitly flipped it" | Accountability trail for SOC-2 CC6.6 is complete; UI modal-flip events are post-hoc-auditable |
| Detail-view target path `apps/web/src/app/docs/[id]/doc-detail-body.tsx` (not `components/docs/doc-detail.tsx`) | Plan's original path referenced a file that doesn't exist — App Router structure has the detail body under the [id] route, not a shared component | audit-M7 corrected at plan time; APPLY did not bounce |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Scope-consistent (per plan's own contract) | 2 | None — plan allowed for it |
| Pre-existing grandfathered false-positive | 1 | None — not this plan's introduction |
| **Total impact** | — | Zero scope creep, zero re-planning, zero concern status |

### Scope-consistent deviations

**D1 — docs.service.ts hydrators updated inside Task 1 (not deferred to Task 2)**
- **Found during:** Task 1 tsc verification
- **Issue:** Adding `kind` to `DocumentTypeDto`, `isProcedural` to `DocListItem`, `checklist` to `DocDetail` + `CreateDocResponse` created 4 tsc errors in `docs.service.ts` that Task 1's "tsc clean" verify couldn't leave behind.
- **Fix:** Updated `toDocumentTypeDto` to thread `kind` through; `list()` adds `isProcedural` derivation; `getById()` includes `checklist` via new `toChecklistDto` helper; `create()` returns `checklist: null` placeholder (Task 2 later replaced with real extractor output).
- **Scope authority:** Plan explicitly said "any kind-property access on pre-existing DocumentTypeDto consumers must compile after the field addition; check classifier.service.ts + docs.service.ts hydrators." Within Task 1 scope by construction.
- **Verification:** Task 1 tsc exit 0 before commit.

**D2 — `toChecklistDto` helper authored in Task 1 (not Task 2)**
- **Found during:** Task 1 hydrator update (part of D1)
- **Issue:** `getById()` returns `DocDetail.checklist: ChecklistDto | null` which Task 1 added to the Zod contract. The safeParse defence-in-depth helper needed to exist for Task 1's tsc verify to pass, not Task 2's.
- **Fix:** Authored `toChecklistDto` in docs.service.ts alongside `toDocumentTypeDto` and `toPendingProposal` — same safeParse-on-read pattern. Task 2's extractor later became a consumer of the inverse (it writes the raw shape; this helper reads it back defensively).
- **Verification:** Task 1 tsc exit 0; Task 2 consumed the helper without signature changes.

### Pre-existing grandfathered

**D3 — Canary-guardrail grep hit on "Opening Checklist" in `classifier.service.ts`**
- **Found during:** Task 2 verification
- **Issue:** `rg -i 'beerhall|opening checklist|closing checklist|weekly jobs|beer hall' apps/api/src apps/web/src packages/` matched a prompt example string at `classifier.service.ts` (Claude prompt line listing hospitality type-name examples).
- **Fix:** None — pre-existing from Plan 04-02 (commit `6c7ebd6`, verified via `git show 6c7ebd6:apps/api/src/modules/docs/classifier.service.ts`). Not introduced by this plan. The string is a Claude prompt example, not beerhall-specific processing logic.
- **Guardrail intent preserved:** The canary guardrail protects against code that keys off canary file shapes (e.g. `if doc.name.includes('BEERHALL')`). A prompt example of a generic hospitality type name is not that.
- **Verification:** `git show 6c7ebd6` shows the string introduced by 04-02.

### Deferred Items

All 10 items registered at plan-time remain deferred with the triggers as documented in 04-03-PLAN.md `<output>` section. No new deferrals this APPLY.

- **D-04-03-A** — manual step editing UI · Trigger: first operator UAT reports bad auto-extracted steps.
- **D-04-03-B** — photo-step ref → S3 storage migration · Trigger: first tenant uploads photo-required checklist + 04-05 completion runtime lands.
- **D-04-03-C** — reclassify-reference-to-procedural retroactive extract · Trigger: owner changes a DocumentType kind after rows exist.
- **D-04-03-D** — per-org timezone handling for Schedule.timeOfDay · Trigger: first non-UK tenant onboarded.
- **D-04-03-E** — multi-venue procedural docs (org-wide) + user-level audience targeting · Trigger: tenant ask or OrganizationMember role-gating complaint.
- **D-04-03-F** — owner-triggered retry-extract endpoint + UI button · Trigger: operator reports N consecutive extraction failures on similar docs. (`'checklist-extraction-failed'` API error code + user string already shipped.)
- **D-04-03-G** — mixed-format signal weighting · Trigger: classifier kind accuracy drops below usable threshold on mixed content.
- **D-04-03-H** — async extractor via BullMQ · Trigger: classifier+extractor p99 latency > 5s on upload path (combines with D-04-02-M scope).
- **D-04-03-I** — Checklist version history on re-extraction · Trigger: operator UAT asks why step list changed.
- **D-04-03-J** — completion analytics dashboard · Trigger: 04-05 runtime ships + 4 weeks of completion data accumulated.

Also updated:
- **D-04-02-E** (per-tenant monthly classifier cost cap — from 04-02) · Trigger extended to cover SUM of `docs.classifier_call.estimatedUsd` + `docs.checklist_extract_call.estimatedUsd` (audit-S3). Implementation still deferred; trigger now measures combined spend.

### Rollback SQL (audit-S7, deferred-to-SUMMARY)

If rollback becomes necessary (not anticipated — migration is strictly additive):

```sql
-- rollback, additive-only migration; data loss limited to extraction outputs:
DROP TABLE IF EXISTS "checklist_step_completions";
DROP TABLE IF EXISTS "checklist_instances";
DROP TABLE IF EXISTS "checklists";
ALTER TABLE "document_types" DROP COLUMN IF EXISTS "kind";
```

Pre-condition before rollback: `SELECT COUNT(*) FROM document_types WHERE kind='procedural';` — if > 0, operator accepts that procedural classifications lose their kind assignment (all rows would revert to implicit 'reference' semantics post-drop). If `checklists` has rows, those are discarded. POC-acceptable; v0.3+ snapshot gate = D-04-03-I version history trigger.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Prisma CLI flag `--to-schema` vs `--to-schema-datamodel` confusion on drift verify | First two attempts used wrong flag combinations. Correct form: `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`. Documented in-line for Task 1's verify step; inherited from 04-01/02 pattern as audit-S1 note. |
| `apps/web/next-env.d.ts` drifted from a Next.js CLI run | Auto-managed file (`"This file should not be edited"` per file header) — unstaged from each task commit; not part of plan scope. |
| `apps/web/tsconfig.tsbuildinfo` auto-regenerated during web tsc | Build artifact — unstaged before commit. Should be added to `.gitignore` at a future cleanup plan (low priority). |

## APPLY-Time Decisions Recorded

### ChecklistExtractorService prompt shape

Authored this plan; lives at `apps/api/src/modules/docs/checklist-extractor.service.ts` `buildPrompt()`. Future 04-04/05 consumers that compose the extractor (or migrate to a different model) should treat this as baseline.

Structural elements:
1. **Header:** "You are a procedural-document extractor for a hospitality operations assistant."
2. **Output contract:** strict JSON with fixed keys — `title`, `steps[]`, `schedule{}`, `audience{}`. Rule explicitly permits additional keys for `.passthrough()` agentic preservation.
3. **Cadence enum:** `daily | weekly | monthly | shift-start | shift-end | ad-hoc | unknown`.
4. **Step kind enum:** `tick | numeric | photo | text` with per-kind guidance.
5. **Empty-steps rule:** "If the doc describes NO procedural steps, return `steps: []`" — lets Claude honestly report prose-heavy uploads without hallucinating steps.
6. **Document payload:** title (max 200 chars) + content (max 30_000 chars).
7. **Strict-JSON + no-fences + no-commentary** suffix.

### Claude model + pricing baseline

- Model: `claude-sonnet-4-6` (matches ClassifierService + IngestService + image-extractor — single-model-across-/docs invariant).
- Pricing: $3/MTok input, $15/MTok output. Source: https://docs.anthropic.com/en/docs/about-claude/pricing.md · verified 2026-04-21.
- `EXTRACTOR_MAX_TOKENS = 2048` (larger than classifier's 1024 — steps array can be long).
- Constants duplicated from classifier + image-extractor (module independence); diverging numbers = audit flag.

### Real smoke-test token counts

Pending operator UAT. Template for SUMMARY append:

```json
// Expected per-extraction magnitude (POC scale):
{
  "level": "log",
  "event": "docs.checklist_extract_call",
  "orgId": "<demo-org-id>",
  "knowledgeItemId": "<ki-id>",
  "inputTokens": 1500_6000,
  "outputTokens": 300_1500,
  "estimatedUsd": 0.01_0.05,
  "durationMs": "<fill>",
  "stepCount": ">=1",
  "result": "ok"
}
```

### Cost envelope

Per-procedural-upload cost ≈ (classifier ~$0.006-0.02) + (extractor ~$0.01-0.05) = $0.02-0.07. Far below D-04-02-E $10/org monthly cap trigger at POC scale. D-04-02-E trigger now monitors the SUM of both call types (audit-S3 update).

## Confirmation That /docs List + Detail UI Renders Correctly

Pending visual UAT. Structural evidence:
- `ProceduralIndicator` component in `doc-list.tsx` renders conditional on `row.isProcedural === true` (server-derived from `documentType.kind === 'procedural'` in `docs.service.list()`).
- Detail-body Checklist block renders conditional on `doc.checklist != null` (populated only for procedural KIs post-extraction).
- Schedule line via `formatScheduleLine(s)` pure helper — falls back to `rawText` when cadence is unknown.
- Audience roles rendered as colored pills (sky = staff, violet = manager, rose = rose); empty roles array falls back to rawText display.
- Steps rendered as numbered `<ol>` with per-step `StepKindIcon` (tick=CheckSquare, numeric=Hash, photo=Camera, text=FileText), optional hint, required-false marker.
- Display cap: `slice(0, 200)` + overflow banner when `steps.length > 200`.

## Operator UAT Punch List

Per PLAN verification checklist; these land in a follow-up SUMMARY append after operator smoke:

- [ ] AC-2: First upload with procedural content (e.g. `OPENING CHECKLIST BEERHALL.xlsx` canary) on empty-taxonomy org → classifier proposal carries `kind: 'procedural'`.
- [ ] AC-3: Accept the proposal unchanged → DocumentType row created with `kind='procedural'`. Subsequent upload of similar content → classifier `{ kind: 'matched' }`. `docs.checklist_extract_call` log + `docs.checklist_extracted` log both visible with token counts.
- [ ] AC-3 override smoke: Upload procedural → modal shows kind=procedural preselected → flip to 'reference' → accept → DocumentType.kind='reference', NO Checklist row, `docs.type_accepted` log has `kindOverridden: true`.
- [ ] AC-4: Inspect DB: `SELECT id, title, jsonb_array_length(steps), schedule->>'cadence' FROM checklists ORDER BY "createdAt" DESC LIMIT 1;` returns expected shape.
- [ ] AC-5 fail-soft smoke: Temporarily break ANTHROPIC_API_KEY → upload procedural → KI exists, `docs.checklist_extract_call` log with `result: 'error'`, no Checklist row. Restore key.
- [ ] AC-5d floor smoke: Upload content <200 chars and classify as procedural → `docs.checklist_extract_skipped` log, NO extractor Claude call.
- [ ] AC-6 visual walk of `/docs` → procedural rows show emerald DocumentType badge + amber "Procedural" indicator; reference rows show emerald only. Click through → detail-body Checklist block renders for procedural; absent for reference.
- [ ] AC-8: Cross-org 404 probe — attempt POST /docs/:id/accept-type as orgB-manager curl against orgA-KI → 404, not 403. 04-02 regression guard still holds.
- [ ] Post-UAT cleanup: DELETE canary KnowledgeItem + DocumentType + Checklist rows (cascade handles checklists on KI delete) so dev chat stays clean.

Findings append to this SUMMARY (no loop reopen per plan verification section).

## Next Phase Readiness

**Ready:**
- `Checklist.id` is the stable routing key for Plan 04-04 scheduler — extractor guarantees 1-1 with KI, schedule cadence is a typed enum (`ScheduleCadence`), `@@unique([checklistId, instanceKey])` is the dedup surface.
- `ChecklistInstanceKeySchema` enforces format contract between 04-03 schema and 04-04 scheduler writes — scheduler MUST parse through this schema.
- `ChecklistExtractorService` exported from DocsModule for 04-04 scheduler reuse (e.g. re-extract-on-schedule-change if that pattern emerges).
- `Checklist.steps[]` with contiguous indices `[0..N-1]` is load-bearing for Plan 04-05 walkthrough runtime's current-step pointer.
- `ChecklistStepCompletion` table ready for 04-05 per-step write pattern (`value` Json polymorphic: `{ticked:true}` | `{value:N}` | `{ref:"..."}` | `{text:"..."}`).
- Full audit-defensible log surface (call mechanics + accountability + race + skip) — 04-04 scheduler writes inherit the same redaction boundary via existing `sanitiseError` + `audit-M1` pattern.

**Concerns:**
- Operator UAT pending — structural pass alone doesn't prove Claude reliably emits procedural-kind + structured steps on the canary files. If UAT finds systematic kind misclassification or bad step structure, iteration on the classifier prompt vs extractor prompt would be needed before 04-04/05 can build on top.
- Schedule timezone handling is implicit (UK) — `timeOfDay` is just HH:MM, no TZ carrier. 04-04 scheduler will inherit this constraint; D-04-03-D trigger fires on first non-UK tenant.
- Extractor cost is additive to classifier cost — every procedural upload now costs 2 Claude calls. POC scale is fine; D-04-02-E trigger is updated to monitor combined spend.
- `next-env.d.ts` + `tsconfig.tsbuildinfo` drift from Next.js/tsc CLI runs is recurring across plans. A cleanup plan should `.gitignore` the tsbuildinfo and investigate the next-env path drift (likely Next.js version-related).

**Blockers:** None. 04-04 and 04-05 can proceed on the schema + contracts delivered by this plan.

---
*Phase: 04-dynamic-document-intelligence, Plan: 03*
*Completed: 2026-04-21T18:00:00Z*
