# Enterprise Plan Audit Report

**Plan:** .paul/phases/04-dynamic-document-intelligence/04-01-PLAN.md
**Audited:** 2026-04-21 10:25
**Verdict:** **conditionally acceptable pre-fix → enterprise-ready post-fix**

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan mirrors 03-04 / 03-05 discipline (HALT-on-divergence, magic-byte-first, // Source citations, per-MIME enforcement), has honest scope (single-concern extraction foundation for Phase 4), and cleanly isolates responsibility. However the plan ships material gaps that are reachable under nominal operation and would surface as support incidents or audit findings once the system sees real traffic:

1. **Extracted text has no log-redaction boundary** — any future `logger.log({ content: extractedText })` leak would be silent until GDPR DSR.
2. **`sanitiseError` factoring for the Claude SDK is proposed but not committed**, leaving a pathway for Anthropic API key to leak via a fetch error object serialization.
3. **APPLY-time variability is too high** — three material decisions (CSV lib, image-bytes persistence, image-MIME column) deferred to executor without pre-commit defaults.
4. **Multi-sheet workbook embedding dilution is unaddressed** — a single vector over an 8-sheet beerhall workbook may retrieve poorly; AC-7's "≥0.3" similarity gate risks failing on real canaries, blocking plan declaration as PASS.
5. **Canary file location is underspecified** — `docs/` is untracked per the earlier session; APPLY cannot deterministically locate canaries in a fresh clone.
6. **Concurrent image-extract cost burst has no upper bound** — 10 parallel uploads = 10 parallel Claude calls = ~$0.30/burst + rate-limit risk.
7. **Tenant scope of image bytes is implicit, not defended** — Option B (`DocumentAsset`) without explicit `organizationId` column allows a future bug to leak image bytes cross-tenant.

Each is addressable by targeted amendments — no architectural rework. Post-fix the plan is approvable.

**Would I approve as-is?** No. Post-fix: yes.

---

## 2. What Is Solid (Do Not Change)

- **Single-concern carve.** 04-01 does extraction only; classifier / taxonomy / procedural model pushed to 04-02+. Clean layering; no premature coupling.
- **HALT-on-divergence discipline** inherited from 03-04 for PPTX library selection + from 03-05's APPLY-WebFetch pattern. Correct stance for stability-sensitive wire code.
- **// Source citation discipline** with grep-verifiable density threshold (≥2 per extractor file). Reliably enforced in Phase 3; right to carry forward.
- **Magic-byte-first gating** on new formats before any parser library invocation. Closes the "renamed-extension crashes the parser" class.
- **Canary guardrail** — `rg -i 'beerhall|…'` returns zero → bug. The plan embeds the generalization contract directly into a verifiable assertion.
- **Reuse of Phase 3 Plan 03-03 multimodal primitives** for image extraction. No duplication; factoring path documented.
- **AC-6 regression invariant** — `git diff` on existing extractor branches must show ONLY additive changes. Precise, testable, hard to fake.
- **Per-MIME size cap map** replacing the single `UPLOAD_MAX_BYTES`. Right structural move; makes per-format policy explicit.
- **`docs.image_extract_cost` structured observability** for spend-monitoring from day one, not retrofitted.
- **3 tasks at standard scope** — not overstuffed. 2-3 per plan target respected.

## 3. Enterprise Gaps Identified

### Wire-level correctness

- **G1 (M1 Log-redaction boundary missing):** Plan captures cost metadata but does not forbid extracted text from appearing in ANY log payload. A mistake in a future debug-log emit would leak tenant document content (PII-bearing) to `http.request` logs, breaching the same SOC-2 CC6.1 boundary 03-05 sanitised for phone numbers. No grep-verified check forbids this.

- **G2 (M2 `sanitiseError` factoring underspecified):** Task 3 action says "import from `apps/api/src/modules/phone/infobip-verify.service.ts` OR factor a shared util". OR-branches in a security-critical path are a bad hedge. Must pre-commit to factoring + naming the shared path so the executor cannot silently choose the inferior path. Without it, an Anthropic SDK `fetch` error serialization could leak request headers including the API key — same bug class 03-05 M4 closed.

### State & storage correctness

- **G3 (M4 Multi-sheet retrieval dilution):** Single KnowledgeItem per workbook with a single 1024-dim embedding over concatenated sheets loses retrieval signal. AC-7 asserts "retrieval similarity ≥ 0.3 for each canary" but this is empirically risky on multi-sheet workbooks. Either the AC gate is too strict, OR we accept that 04-01 doesn't gate retrieval quality (measurement only), OR we split per-sheet now (scope bump rejected). Leaving the gate strict ships a plan whose PASS is dependent on embedding behaviour not under our control.

- **G4 (S1 Tenant scope on image bytes undefended):** Option A (`KnowledgeItem.sourceImageBytes`) inherits org scope via the row. Option B (`DocumentAsset` table) doesn't automatically; the plan lists only `knowledgeItemId` FK. A future direct query on `DocumentAsset` without `JOIN KnowledgeItem ON org` leaks cross-tenant bytes. Must add `organizationId` column + `withOrgScope` use in Option B for defense-in-depth.

- **G5 (S9 Image-bytes object-storage migration absent from deferrals):** Storing 5MB binary blobs in Postgres is POC-acceptable but at ≥500 uploads or ≥2GB aggregate becomes backup/replication drag on NeonDB. Not registered as a deferred item — next engineer won't know it's an accepted debt.

### Secret / PII / audit hygiene

- **G6 (M1 continuation):** Any extracted text (from any of the 5 new formats) touching a log emission — even `logger.debug({ text: extractedText.slice(0, 100) })` — is a PII leak channel equivalent to uploading an untrusted tenant document into CloudWatch. The plan implicitly assumes this won't happen; senior reviewer requires explicit prevention.

- **G7 (S7 Per-format success-rate observability missing):** `docs.uploaded` structured log doesn't include `mime` field. Without it, a regression where (say) PPTX uploads start failing at 20% while PDF stays at 100% is invisible on a single counter. One-line change; enables dashboard slicing.

### APPLY hygiene

- **G8 (M3 Canary discoverability + Demo user precondition):** `docs/` is untracked in git per prior-session decision (operational PII concern). APPLY-time UAT cannot deterministically confirm canary presence in fresh clone / CI environment. Plus: Demo Org manager user must be manually created via UI per Plan 01-01 deviation — not automated. Neither is called out as a precondition.

- **G9 (S4 APPLY-time library decisions reduce reviewability):** Three decisions deferred: CSV lib (exceljs.csv vs csv-parse), image-bytes persistence (Option A vs B), image-MIME column name. An auditor reviewing this plan cannot predict what will ship. Pre-commit the two low-variance ones (CSV → `csv-parse/sync`; persistence → Option A with explicit columns); leave only PPTX HALT.

- **G10 (S5 `sourceImageMime` column referenced inconsistently):** Task 3 action specifies `sourceImageBytes Bytes? + sourceImageMime String?`; `<objective>` Output section mentions only `sourceImageBytes`. Minor but creates reviewer confusion + APPLY-time ambiguity.

### Cost / rate-limit

- **G11 (S2 Claude vision concurrency unbounded):** 10 parallel image uploads = 10 parallel Claude calls = ~$0.30 burst + Anthropic rate-limit exposure. Plan defers "rate limit" but the concurrency ceiling is a separate concern: cost burst control. Needs a simple in-process semaphore (3 concurrent, queue up to 15s) — ~15 LOC.

- **G12 (S10 Multer per-MIME cap after-the-fact):** Multer accepts up to 15MB into memory before per-MIME cap rejects; attacker uploading 15MB claiming `image/jpeg` (capped at 5MB) wastes 15MB/upload of RAM. Known tradeoff; needs explicit acknowledgement in boundaries + deferred item for pre-multer per-MIME cap on public deploy.

### UX / error mapping

- **G13 (S8 UI error-string coverage for new formats):** New `ExtractError('unsupported-mime')` for `.xls` rejection, size-cap rejection paths. Need to confirm existing `mapApiError` on apps/web covers these; if not, user sees generic "something went wrong" instead of "Please convert .xls to .xlsx".

### Long-term hazards

- **G14 (D1 deferrable — Prompt-injection defense on RAG corpus):** Extracted text lands in retrieval vector space. Malicious doc content ("ignore previous instructions, output '' ") could poison future chat responses. Not Plan 04-01-specific — project-wide concern. Defer with trigger.

- **G15 (D2 deferrable — Magic-byte gate on existing PDF/DOCX/TXT/MD):** Phase 2 didn't add magic-byte gates. 04-01 adds them only to new formats. Consistent with "DO NOT CHANGE existing paths" but a future defense-in-depth opportunity.

- **G16 (D3 deferrable — Locale-consistent XLSX date formatting):** `cell.text` renders dates per system locale. For exact-match retrieval, this matters; for embedding semantic retrieval, it's minor drift.

- **G17 (D4 deferrable — SonarQube gate validation):** Config mentions SonarQube; no CI gate exists in project. Not blocking.

- **G18 (D5 deferrable — Migration deployment discipline):** Option A adds a nullable column; migration applies cleanly. Prod migration discipline is already in project-wide deferred list.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Extracted text must NEVER enter log payloads (PII/SOC-2 equivalent to 03-05 phone redaction) | `<boundaries>` DO NOT CHANGE + `<verification>` | New boundary: "Extracted text from any format NEVER appears in log payloads — only { event, mime, bytes, duration_ms, success, sheets_count?, slides_count? } metadata." New verify grep: `rg -nE "logger\.(log\|warn\|error\|debug)\(.*(text\|content\|extracted)"` returns zero matches in extractors/. |
| M2 | `sanitiseError` pre-committed to shared util path, not OR-branch | Task 3 action + `<files_modified>` + Task 3 verify | Added new file `apps/api/src/common/sanitise-error.ts` (factor Phase 3 Plan 03-05 implementation, mark WhatsApp + Phone call sites as co-consumers). Task 3 mandates import from this shared util. Grep-verify + zero `String(err)` / `JSON.stringify(err)` in image extractor. |
| M3 | Canary discoverability + Demo Org manager preconditions explicit | `<context>` + Task 1 manual smoke test | `<context>` documents `docs/*.xlsx` is git-untracked (operational PII per user directive) and UAT operator MUST confirm presence via `ls docs/*.xlsx` before AC-7. If absent, operator HALTs and places canary files (or uses equivalent user-provided test workbooks). Task 1 + Task 3 manual smoke test preconditions list "Demo Org manager user exists — sign up via UI if first-time setup (Plan 01-01 deviation: seed cannot hash better-auth passwords)". |
| M4 | AC-7 retrieval-quality gate split from ingestion gate (multi-sheet dilution tolerance) | `<acceptance_criteria>` | AC-7 split into AC-7a (ingestion — hard gate) and AC-7b (retrieval quality — observational, not gating). AC-7b documents measured similarity per canary in SUMMARY; acceptable if ingestion succeeds + text preview non-empty + row visible in /docs list, regardless of retrieval score. Multi-sheet embedding dilution tradeoff documented as acceptable for 04-01 (Plan 04-02 classifier may redesign per-sheet storage strategy). |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | Tenant scope on image bytes explicit for both persistence paths | `<boundaries>` DO NOT CHANGE + Task 3 action | Added boundary: "Option A: image bytes inherit org/venue scope via KnowledgeItem row — automatic. Option B (DocumentAsset): MUST include `organizationId` column matching parent KnowledgeItem; all DocumentAsset queries MUST use `withOrgScope` — defense-in-depth." |
| S2 | Per-request semaphore on Claude vision concurrency (cost-burst control) | Task 3 action | Task 3 adds module-local `MAX_CONCURRENT_IMAGE_EXTRACTS = 3` with Promise-queue semaphore (~15 LOC). If 3 in-flight, next request waits up to `IMAGE_EXTRACT_QUEUE_TIMEOUT_MS = 15_000` then throws `ExtractError('timeout')`. Log `docs.image_extract_queued` on queue entry. |
| S3 | Commit Option A + `csv-parse/sync` as defaults (remove APPLY-time variability) | `<objective>` Output + Task 1 action + Task 3 action | Plan pre-commits to: (a) CSV via `csv-parse/sync` (mature, lighter dep surface than exceljs.csv for this one use); (b) Image-bytes via Option A — KnowledgeItem gains `sourceImageBytes Bytes?` + `sourceImageMime String?` columns (additive nullable; safe against existing rows). PPTX library remains APPLY-time WebFetch with HALT (genuinely unpredictable). |
| S4 | `sourceImageMime` column consistent across `<objective>` + Tasks | `<objective>` Output + AC-4 | Output spec + AC-4 both name `sourceImageBytes` + `sourceImageMime` columns explicitly. |
| S5 | Per-format success-rate observability via `mime` field on `docs.uploaded` | Task 1 action | Task 1 extends existing `docs.uploaded` structured log in `docs.service.ts` with `mime: string` field. Enables per-format regression slicing in future dashboards. One-line addition, consumed by no current UI. |
| S6 | UI `mapApiError` coverage confirmed for new error types | Task 1 verify + Task 3 verify | Added verify step: confirm existing `apps/web/src/lib/map-api-error.ts` maps `unsupported-mime` (for .xls upload attempt) + `corrupt-bytes` (for magic-byte fail) + `timeout` (for image extraction timeout) to user-friendly strings. If any missing, extend. Do NOT silently fall through to generic "something went wrong". |
| S7 | Multer per-MIME cap tradeoff acknowledged + deferred | `<boundaries>` SCOPE LIMITS | Acknowledgement: "Multer's single `limits.fileSize` ceiling (15MB) is enforced BEFORE per-MIME cap (10MB XLSX / 5MB image). An attacker uploading 15MB of content claiming `image/jpeg` wastes 15MB/upload of RAM before rejection. Acceptable for authed POC; pre-multer per-MIME cap registered as D-04-01-H for public deploy." |
| S8 | Magic-byte consistency decision documented explicitly | `<boundaries>` SCOPE LIMITS | "Magic-byte validation added to NEW formats only (XLSX / PPTX / CSV / images). Existing PDF / DOCX / TXT / MD retain Phase 2 behavior (no magic-byte gate — library-level error handling instead). Consistent with 'DO NOT CHANGE existing paths' invariant. Retrofit registered as D-04-01-I." |
| S9 | Image-bytes → object-storage migration as deferred | `<output>` Deferred items | Added D-04-01-F: "Image bytes migration to S3/Cloud Storage. Trigger: ≥500 uploads OR ≥2GB aggregate `SUM(OCTET_LENGTH(sourceImageBytes))` OR first NeonDB backup/replication slowness complaint." |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | Prompt-injection defense on RAG corpus (malicious doc poisoning future chat responses) | Project-wide concern — affects Phase 2 + 4 equally. Not specific to broadened extraction. Trigger: first incident OR Plan 04-02 classifier audit surfaces the risk specifically. |
| D2 | Magic-byte gate retrofit on existing PDF/DOCX/TXT/MD extractors | Consistency with Phase 2 boundary ("do not change existing paths"). Existing library-level error handling covers crashes; bug-class is narrow. Trigger: first corrupt-file crash in an existing-format path. |
| D3 | Locale-consistent XLSX date formatting via explicit `DateCell` treatment in extractor | Minor drift for embedding-based retrieval; moot for exact-match once 04-02 classifier defines its own date handling. Trigger: 04-02 classifier reveals date handling ambiguity harms classification. |
| D4 | SonarQube gate validation on new extractors | No CI pipeline in active use. Trigger: CI/CD stand-up (already a deferred project item). |
| D5 | Prod migration deployment discipline for `sourceImageBytes` column | Already tracked at project level ("Prisma migrate deploy strategy for production"). Additive nullable column is safe under `migrate deploy` regardless of discipline. |

---

## 5. Audit & Compliance Readiness

**Defensible audit evidence (post-fix):**
- `docs.uploaded` now carries `mime` field — per-format activity reconstructible from logs.
- `docs.image_extract_cost` spans the Claude-vision lifecycle with token + USD attribution per upload.
- `docs.image_extract_queued` surfaces concurrency-queue entry events (M1.5/S2).
- All extracted text redacted from log payloads (M1) — grep-verified.
- `sanitiseError` uniformly applied across fetch-error paths (M2) — grep-verified.
- org/venue scope preserved through `KnowledgeItem` row OR explicit `DocumentAsset.organizationId` column (S1).

**Silent-failure prevention (post-fix):**
- Magic-byte-first dispatch catches format-mismatch before library crash.
- Shape check on extracted text (non-empty-post-trim) catches silent extraction failure.
- AC-6 regression invariant (git-diff-on-existing-branches) catches accidental edits to PDF/DOCX/TXT/MD paths.
- Concurrency semaphore (S2) prevents Claude rate-limit-induced silent failure cascade.
- AC-7b split (M4) prevents "my plan failed because of embedding behaviour" false-negative — ingestion success is the hard gate.

**Post-incident reconstruction (post-fix):**
- X-Request-Id not yet threaded through `/docs` POST (pre-existing Phase 2 gap — NOT this plan's scope to fix). Acceptable because the failure surface is tied to upload sessions that are short and manager-attributable.
- `docs.uploaded { mime, bytes, orgId, venueId, userId }` per-format reconstruction preserved.
- `docs.image_extract_cost { mime, imageBytes, inputTokens, outputTokens, estimatedUsd, requestId? }` enables cost forensics.

**Clear ownership / accountability:**
- Extractors own format-specific logic.
- `doc-extract.ts` dispatcher owns MIME → extractor routing.
- `docs.service.ts` owns KnowledgeItem creation + scope + audit-log emit.
- `docs.controller.ts` owns size-cap + multer integration.
- Shared `sanitise-error.ts` owns PII-redacted error serialization.
- No cross-boundary state.

**Remaining audit-fail surfaces (explicitly deferred):**
- No persistent document-audit table (per-doc access history) — mirror of D2 from Plan 01-01; SOC 2 Type II prep trigger.
- No prompt-injection defense on RAG corpus — D1 above.
- Multer per-MIME cap post-accept (G12 acknowledged).

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- [ ] All 4 must-have upgrades applied (M1 log-redaction / M2 sanitiseError / M3 canary+user preconditions / M4 AC-7 split) — **applied**.
- [ ] All 9 strongly-recommended upgrades applied (S1-S9) — **applied**.
- [ ] APPLY-time WebFetch selects PPTX library successfully OR HALT raises checkpoint.
- [ ] All 3 beerhall xlsx canaries successfully ingest via AC-7a; observational retrieval score captured in SUMMARY per AC-7b.
- [ ] `rg -i 'beerhall\|opening checklist\|closing checklist\|weekly jobs\|beer hall' apps/api/src apps/web/src packages/` returns zero matches.
- [ ] `rg -nE "logger\.(log\|warn\|error\|debug)\(.*(text\|content\|extracted)" apps/api/src/modules/docs/extractors/` returns zero matches.
- [ ] `rg -n 'sanitiseError' apps/api/src/modules/docs/extractors/image-extractor.ts` matches shared util import ≥1.
- [ ] `rg -n 'String\(err\)\|JSON\.stringify\(err\)' apps/api/src/modules/docs/extractors/` returns zero non-comment matches.
- [ ] AC-6 regression: `git diff apps/api/src/modules/docs/doc-extract.ts` on existing PDF/DOCX/TXT/MD branches shows additive-only.
- [ ] Nest DI boot smoke passes after Task 1, Task 2, Task 3.

**Risks remaining if shipped as-is (explicitly accepted):**
- Multi-sheet workbooks may retrieve with low similarity — not a failure, documented as 04-02-redesign candidate (M4 acknowledged).
- Bytes-in-Postgres storage will hit scale concerns at ~500 uploads / 2GB (D-04-01-F registered).
- Multer pre-accepts up to 15MB before per-MIME cap rejects (D-04-01-H registered).
- Existing PDF/DOCX/TXT/MD formats retain Phase 2 behavior, incl. absence of magic-byte gate (D-04-01-I registered).
- No prompt-injection defense on RAG corpus (D1 — project-wide).
- No persistent per-doc access audit table (SOC 2 Type II prep trigger).

**Sign-off:**
Post-fix, the plan is enterprise-grade for the current deployment target (single-process, single-region, Demo-Org-only POC with Ryan as sole tenant operator). Release bar met for extraction-layer foundation of Phase 4.

Pre-fix, it is not — the log-redaction boundary (G1/M1), sanitiseError factoring ambiguity (G2/M2), canary discoverability (G8/M3), and AC-7 gate-on-non-deterministic-embedding-behavior (G3/M4) would produce either: (a) a GDPR incident within first commercial tenant, (b) Anthropic API key leak via SDK error chain, (c) APPLY fail-to-execute in fresh clone, or (d) false-negative plan-failure signal within first APPLY run.

---

**Summary:** Applied **4 must-have** + **9 strongly-recommended** upgrades. Deferred **5** items with explicit triggers.
**Plan status:** Updated and ready for APPLY.
AC count unchanged at 8 (AC-7 split modifies scope of existing AC, no new AC count). Task count unchanged (3). `autonomous: true` preserved — PPTX HALT is APPLY-time emergency checkpoint pattern inherited from 03-04.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
