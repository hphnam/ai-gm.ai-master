# Enterprise Plan Audit Report

**Plan:** `.paul/phases/04-dynamic-document-intelligence/04-03-PLAN.md`
**Audited:** 2026-04-21 16:55
**Verdict:** conditionally acceptable pre-fix → **enterprise-ready post-fix**

---

## 1. Executive Verdict

Pre-fix: **conditionally acceptable**. Solid architectural framing and faithful inheritance of 04-01 / 04-02 audit boundaries (M1 log redaction, M2 sanitiseError, cross-org isolation, fail-soft contracts), but eight release-blocking gaps in runtime safety, data-integrity guarantees, and audit-trail completeness.

Post-fix: **enterprise-ready**. All eight must-have upgrades applied directly to PLAN.md with verification grep checks, and all seven strongly-recommended upgrades incorporated. Would sign off on APPLY under a regulated-environment accountability posture.

Critical pre-fix gaps, in descending risk order:
1. **No timeout on the extractor's Claude call** — a hung Anthropic call holds the upload request thread indefinitely under real-world network conditions.
2. **No concurrency limit on the extractor** — a burst of N procedural uploads hammers Anthropic with N parallel calls and wedges the API process under load.
3. **Step-index integrity is not guaranteed** — Claude can emit non-contiguous indices; 04-05 walkthrough runtime's step-pointer invariant breaks silently.
4. **ChecklistInstanceKey format is prose-documented only** — no schema contract between 04-03 (writes the unique constraint) and 04-04 (writes the rows). Format drift waiting to happen.
5. **No actingUserId on extraction audit trail** — post-incident reconstruction ("who uploaded this Checklist?") hits a dead end.
6. **Silent race on deleted DocumentType** — classifier's matched typeId can dangle between classify and post-ingest hook if owner deletes the type concurrently; no log surface.
7. **Detail-view target file doesn't exist** — plan pointed at `apps/web/src/components/docs/doc-detail.tsx`; actual file is `apps/web/src/app/docs/[id]/doc-detail-body.tsx`. APPLY would bounce on path resolution.
8. **Kind-override is not auditable** — owner can flip classifier's proposed kind without the log surface distinguishing "accepted as-is" from "explicitly overridden".

All eight fixed pre-APPLY. See Section 4 for applied changes.

## 2. What Is Solid

- **audit-M1 + audit-M2 boundaries** — explicit, grep-verified, and faithful to 04-02's pattern. Extractor logs carry metadata only; `sanitiseError` is the single error→log path. No regression in the log-redaction surface.
- **Fail-soft extractor contract** — extraction failure produces no Checklist row but does NOT roll back the KnowledgeItem. Correct separation of extraction outcome from ingest outcome; ingest is the primary trust anchor.
- **Cross-org isolation (AC-8)** — preserved through FK inheritance (Checklist.organizationId + knowledgeItemId FK cascade) + 04-02's 404-not-403 enumeration-safe pattern on detail/accept-type routes.
- **Completion-state schema ships empty, wired by 04-04/05** — avoids migration drift between plans and gives the scheduler (04-04) a `@@unique([checklistId, instanceKey])` target on day one.
- **Kind-column as TEXT + Zod enum** — chosen deliberately over native Prisma enum. Correct trade-off: tenant-owned taxonomy columns should not be backed by native enums (schema-migration cost on every enum value add).
- **`.passthrough()` agentic pattern** — consistent with PROJECT.md Key Decision 2026-04-18; preserved across ChecklistStepSchema, ScheduleSchema, AudienceSchema, and extended ProposedDocTypeSchema.
- **Canary guardrail grep** — prevents beerhall-specific code leaking into runtime; inherited from 04-02.
- **Migration is additive** — DEFAULT 'reference' on `DocumentType.kind` backfills pre-existing rows without data touch; three new tables are independent of existing surfaces.

## 3. Enterprise Gaps Identified

### Must-Have (Release-Blocking)

**M1 — No extractor call timeout.**
`ChecklistExtractorService.extract` originally called `client.messages.create` with no `signal` and no timeout. Anthropic's SDK does not enforce a default timeout; a hung call blocks the upload request thread indefinitely under network partition or rate-limit tarpit conditions. Image extractor already uses a semaphore+timeout pattern (`image-extractor.ts:35-72`); extractor should mirror.

**M2 — No concurrent extractor limit.**
Under a burst of procedural uploads (realistic: manager batch-uploads 5 weekly procedures in a minute), the original plan fires all 5 Anthropic calls in parallel. At scale this wedges the Node event loop and burns Anthropic rate-limit headroom. `MAX_CONCURRENT_IMAGE_EXTRACTS=3` is the project's established pattern; extractor needs the same.

**M3 — Step-index contiguity not enforced.**
`ChecklistStepSchema.index: z.number().int().min(0)` validates per-element but does not constrain the array's index distribution. Claude may emit `[{index:2},{index:0},{index:5}]` or duplicates. 04-05 walkthrough runtime's "step N of Checklist.steps.length" pointer assumes `[0..N-1]` — silent break if 04-03 doesn't normalize.

**M4 — ChecklistInstanceKey format contract missing.**
The `@@unique([checklistId, instanceKey])` constraint guarantees uniqueness but nothing about format. Plan had prose comment "`2026-04-22` daily / `2026-W17` weekly / ..." but no Zod schema, no regex, no DB CHECK. 04-04 scheduler is a separate plan; without a contract shipped in @gm-ai/types, 04-04 can invent its own format and `findUnique` lookups silently miss.

**M5 — No success audit log with actingUserId.**
`docs.checklist_extract_call` tracks the call mechanics (tokens/USD/duration/result) but has no accountability field. For SOC-2 CC6.6 reconstruction ("who's responsible for this Checklist being persisted?"), the audit trail needs an explicit `docs.checklist_extracted` SUCCESS event carrying `actingUserId`. Pattern already established by 04-02's `docs.type_accepted`.

**M6 — Race-condition silent miss.**
If classifier returns `{ kind: 'matched', typeId }` and owner deletes the DocumentType row between classify and post-ingest hook (small window but possible via manual Prisma Studio operation or future rename/merge UI from D-04-02-I), the `findUnique` at line equivalent returns null, extraction silently skips, KI persists as if classification simply didn't apply. No log surface → no operator visibility into data-integrity event.

**M7 — Detail-view target file doesn't exist.**
Plan Task 3 `files_modified` listed `apps/web/src/components/docs/doc-detail.tsx` as the Checklist-block rendering target. Live filesystem check: `apps/web/src/app/docs/[id]/doc-detail-body.tsx` exists; the former does NOT. APPLY would bounce at first edit attempt. Path correction required.

**M8 — actingUserId not threaded to extractor on upload path.**
`docs.service.create` signature + `docs.controller` upload/create endpoints do NOT currently accept user context. 04-02's accept-type/reject-type gained `@CurrentUser` but upload/create did not. Required for M5's accountability log.

### Strongly Recommended

**S1 — Prisma migrate-apply pattern implicit.**
04-01 and 04-02 SUMMARY entries document that `prisma migrate dev --create-only` is interactive-TTY-only under Prisma 7 and fails silently in non-interactive APPLY. Plan inherited the `prisma migrate diff → deploy` pattern implicitly but did not state it. New engineer reading plan could waste cycles.

**S2 — No content-length floor.**
Extractor fires Claude on every procedural upload including 50-character test uploads, burning ~$0.006/call on garbage inputs. A 200-char floor skips obviously-empty content before semaphore acquire.

**S3 — D-04-02-E cost-cap trigger stale.**
04-02 registered the $10/org/month cost-cap trigger against classifier spend alone. 04-03 introduces a SECOND Claude call per procedural upload. Trigger definition needs updating or cost-cap implementation mismeasures.

**S4 — No retry on transient.**
IngestService.enrich retries once on Claude flakes (04-02 audit-S4 precedent). ClassifierService does NOT. Extractor SHOULD — single retry on 5xx/429 absorbs burst Anthropic degradation without losing extraction.

**S5 — Kind-override not logged with `kindOverridden` flag.**
`docs.type_accepted` log only carries `name`. With 04-03's owner-override capability, auditors can't reconstruct "did owner explicitly flip kind or accept classifier's proposal as-is?" Accountability ambiguity.

**S6 — No display cap on step list.**
Pathological extractor output (Claude emits 500 steps from an edge-case doc) would render a 500-item `<ol>` on low-end devices. Follows 05-03's 64KB JSON viewer precedent in principle — bound the DOM.

**S7 — No rollback SQL documented.**
Migration is additive so rollback is theoretically straightforward, but SUMMARY should document the DROP sequence explicitly + flag the data-loss boundary (dropping `checklists` discards extraction output; operator must accept this or wait for D-04-03-I version history).

### Can Safely Defer

**D1** — No probe test. Per project convention (zero probes post-03-04); manual smoke + grep-audit is the established acceptance path.
**D2** — Per-tenant extraction cost cap implementation. Covered by D-04-02-E trigger (updated by S3 above); implementation waits for trigger fire.
**D3** — Mid-extraction cost budget early-abort. POC scale; D-04-03-H (async + cost ceiling) covers this scope if telemetry ever demands it.
**D4** — Multi-tenant timezone handling on schedule. Already D-04-03-D.
**D5** — Version history on Checklist re-extraction. Already D-04-03-I.
**D6** — Analytics dashboard. Already D-04-03-J.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | No extractor call timeout (hang risk) | `<objective>` Runtime-safety constants · `<context>` Enterprise-audit runtime safety decisions · Task 2 action step d · `<acceptance_criteria>` new AC-5a | Added `EXTRACTOR_CALL_TIMEOUT_MS = 30_000` + AbortController wiring into `messages.create({ signal })` + timeout fallback path. Verify grep added. |
| M2 | No concurrent extractor limit (thundering-herd risk) | Same as M1 | Added `MAX_CONCURRENT_CHECKLIST_EXTRACTS = 3` + `EXTRACTOR_QUEUE_TIMEOUT_MS = 15_000` semaphore + `docs.checklist_extract_queued` log. Mirror of `image-extractor.ts` pattern cited inline. |
| M3 | Step-index contiguity not enforced (04-05 runtime breakage) | Task 2 action step h · new AC-5b | Added post-parse normalization `.map((s, i) => ({ ...s, index: i }))` + new AC enforcing invariant. Verify grep added. |
| M4 | ChecklistInstanceKey format prose-only (04-04 contract drift) | Task 1 action step 5 · `<objective>` output list · `<verification>` grep check | Added `ChecklistInstanceKeySchema` + `CHECKLIST_INSTANCE_KEY_REGEX` exports in `packages/types/src/docs.ts` with regex per cadence. Prisma model gets `/// @see` comment. |
| M5 | No success audit log with actingUserId | Task 2 action step l · new AC-5c · `<boundaries>` new audit-M5 section | Added `docs.checklist_extracted` SUCCESS event `{ orgId, actingUserId, knowledgeItemId, checklistId, stepCount, cadence, kindSource }` with audit-M1 redaction boundary extended. |
| M6 | Race on deleted DocumentType silent miss | Task 2 step 4 (docs.service.create code block) · new AC-5c addendum · `<boundaries>` new audit-M6 section | Added explicit `docs.matched_type_missing` warn log when effectiveTypeId is truthy but findUnique returns null. Extraction skips silently; log is the audit surface. |
| M7 | Detail-view target file doesn't exist | Frontmatter `files_modified` · Task 3 `<files>` list · Task 3 step 6 | Corrected path to `apps/web/src/app/docs/[id]/doc-detail-body.tsx`. Added `<!-- audit-M7 corrected -->` markers. |
| M8 | actingUserId not threaded to upload/create endpoints | Task 3 step 1 · docs.service.create signature in Task 2 step 4 · extractor signature in Task 2 step 1 final bullet | Added `@CurrentUser()` to both upload + create endpoints. `docs.service.create` gains `userId: string | null` arg. `ChecklistExtractorService.extract` accepts `{ userId, kindSource }`. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | Prisma migrate-dev pattern trap | `<context>` Enterprise-audit runtime safety decisions | Added explicit note: `migrate diff → deploy` is the only supported path; `migrate dev --create-only` is interactive-TTY-only under Prisma 7 and will hang in non-interactive APPLY. |
| S2 | No content-length floor (unnecessary cost) | `<objective>` Runtime-safety constants · Task 2 action step a · new AC-5d | Added `EXTRACTOR_MIN_CONTENT_CHARS = 200` + pre-flight guard + `docs.checklist_extract_skipped` log. |
| S3 | D-04-02-E trigger stale | `<output>` SUMMARY requirements | Added explicit note that D-04-02-E's trigger now covers SUM of `docs.classifier_call.estimatedUsd` + `docs.checklist_extract_call.estimatedUsd`. |
| S4 | No retry on transient Claude errors | `<objective>` Runtime-safety constants · Task 2 action step d · AC-5a + new verify step | Added `EXTRACTOR_MAX_RETRIES = 2` + retry-only-on-5xx/429 + mirror IngestService.enrich pattern. |
| S5 | Kind-override unaudited | Task 3 step 2 · `<objective>` Kind-override accountability line | Added `kindOverridden: boolean` + `kind: resolvedKind` fields to `docs.type_accepted` log. Smoke step validates `kindOverridden: true` on explicit flip. |
| S6 | No display cap on step list | Task 3 step 6 (detail-view code block) · new verify step | Added `.slice(0, 200)` + overflow banner "Showing first 200 of N steps." |
| S7 | No documented rollback SQL | `<output>` SUMMARY requirements | Added explicit rollback SQL block + data-loss boundary documentation for audit-defensibility. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | No automated probe tests | Project convention since 03-04 — zero probes; manual smoke + grep-audit is the established acceptance path. Ship-blocker at milestone close, not per-plan. |
| D2 | Per-tenant extraction cost cap implementation | Covered by D-04-02-E (trigger updated by S3). Hard-cap code waits for the cost-trigger fire; premature implementation = dead abstraction. |
| D3 | Mid-extraction cost budget early-abort | POC scale; no evidence of individual-call cost runaway. D-04-03-H (async extractor) carries this scope if latency tail demands it. |
| D4 | Timezone handling on Schedule.timeOfDay | Already D-04-03-D. Single-tz POC acceptable until first non-UK tenant. |
| D5 | Version history on Checklist re-extraction | Already D-04-03-I. POC accepts destructive upsert; trigger is operator complaint. |
| D6 | Completion analytics dashboard | Already D-04-03-J. Depends on 04-05 runtime shipping + 4 weeks of completion data; no baseline to analyze yet. |

## 5. Audit & Compliance Readiness

**Defensible audit evidence:**
- Pre-fix: partial. `docs.classifier_call` + `docs.checklist_extract_call` capture mechanics but not the actor; race-conditions on matched-type invisible; kind-override decisions indistinguishable from accept-as-proposed.
- Post-fix: **yes**. `docs.checklist_extracted` + `docs.matched_type_missing` + `docs.type_accepted{kind,kindOverridden}` + `docs.checklist_extract_skipped` close the four accountability gaps. Every extraction outcome has a log surface; every silent-miss condition has a warn-level alert.

**Silent-failure prevention:**
- Pre-fix: two silent modes — hung Anthropic call + deleted-DocumentType race. Both blocked an auditor from reconstructing "why is this Checklist missing?"
- Post-fix: timeout converts hung call to explicit failure log; race converts silent miss to warn log.

**Post-incident reconstruction:**
- Pre-fix: could tell that extraction happened (log present) but not WHO triggered it or whether the kind assignment reflects owner intent vs classifier default.
- Post-fix: `actingUserId` + `kindSource` + `kindOverridden` triangulate the actor, classification source, and owner decision delta.

**Ownership & accountability:**
- Extraction audit trail: docs.service + ChecklistExtractorService (data-plane); docs.controller (actor-capture layer via @CurrentUser).
- Runtime-safety bounds: ChecklistExtractorService constants + semaphore — single file ownership.
- All changes in-module; no cross-module ownership drift.

**Would fail a real audit pre-fix:** Yes — M1 (hung-call hang), M5 (no actor on extraction), M7 (broken file reference would surface as post-merge bug) are concrete red flags.

**Would survive a real audit post-fix:** Yes — audit boundaries symmetric across create/accept paths, log redaction grep-verified, runtime bounds grep-verified, rollback SQL documented.

## 6. Final Release Bar

**What must be true before APPLY (all applied to plan):**
- Extractor has a 30s call timeout + 3-concurrent semaphore + 15s queue timeout — applied.
- Step-index normalization runs post-parse — applied.
- ChecklistInstanceKeySchema shipped in @gm-ai/types — applied.
- `docs.checklist_extracted` + `docs.matched_type_missing` + `docs.checklist_extract_skipped` log events specified — applied.
- Detail-view target path corrected to `apps/web/src/app/docs/[id]/doc-detail-body.tsx` — applied.
- `@CurrentUser` threaded to create + upload endpoints; `userId` flows through docs.service + extractor signature — applied.

**Remaining risks if shipped as-is (post-fix):**
- Single-timezone Schedule (D-04-03-D) — will become technical debt once non-UK tenants onboard; trigger documented.
- No version history on re-extraction (D-04-03-I) — operator surprise if extractor output changes between uploads; trigger is operator complaint.
- No retry-extract UI (D-04-03-F) — failed extractions silently persist as unclassified-procedural state; operators must delete + re-upload.

**Sign-off statement:** Post-fix, this plan is enterprise-ready and I would approve it for APPLY under a regulated-environment accountability posture. All runtime-safety bounds have grep-verifiable enforcement; all audit-trail gaps are closed with log events carrying actor + outcome; all cross-plan contracts (04-04 scheduler's instance-key format, 04-05 runtime's step-index contiguity) are enforced at the 04-03 trust boundary rather than delegated to future plans.

---

**Summary:** Applied 8 must-have + 7 strongly-recommended upgrades. Deferred 6 items.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
