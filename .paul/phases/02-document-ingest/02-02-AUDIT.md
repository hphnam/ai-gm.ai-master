# Enterprise Plan Audit Report

**Plan:** `.paul/phases/02-document-ingest/02-02-PLAN.md`
**Audited:** 2026-04-20 12:15 GMT+1
**Verdict:** Conditionally acceptable → Enterprise-ready AFTER audit-added must-haves applied (now applied).

---

## 1. Executive Verdict

As drafted, the plan was **conditionally acceptable**. The architecture is sound — multer + dynamic-imported extractors + per-route validation + explicit DELETE with cross-org audit log — and it correctly inherits Plan 02-01's org-scoping contract. However, six release-blocking gaps were identified that would have failed a SOC-2 / ISO review and produced a live vulnerability surface (silent role bypass on upload, missing CORS method for DELETE preflight, no ingestion audit trail, unsanitized filename → title, permissive empty-extraction, no extraction timeout). With the M1–M6 findings applied and S1–S6 strongly-recommended findings folded in, the plan reaches **enterprise-ready**.

Would I approve the original plan for production if I were accountable? **No.** Would I approve the audited plan? **Yes, conditionally on the verification checklist passing.**

## 2. What Is Solid (Do Not Change)

- **Inheritance of Plan 02-01's organizationId boundary.** Reusing `docsService.create(..., orgId)` + the same `row.organizationId !== orgId → 404 + warn log` pattern on DELETE is the correct architectural call. It means the cross-org probe A42 is a genuine regression test, not a contrived one.
- **Per-route multer interceptor.** Avoiding a global MulterModule in favour of `@UseInterceptors(FileInterceptor(...))` is right: the upload surface is a single endpoint, and module-level wiring would leak config to any future handler that accepted a file.
- **MAX_EXTRACT_CHARS = 1,000,000.** A post-extraction cap is the correct defense-in-depth vs. `MAX_BYTES` alone — a tiny zip-bomb-style PDF could decompress into gigabytes of extracted text. This cap bounds DB content growth independently of the 10 MB upload cap.
- **The `ExtractError` abstraction.** A dedicated typed error at the extraction boundary keeps the controller's `catch` narrow and prevents leaking third-party library error shapes into the response body.
- **unpdf over pdf-parse.** Correct call — `pdf-parse` has been unmaintained since 2020 and ships CVE-adjacent pdfjs versions.
- **DELETE semantics.** `NotFoundException → 404 + error='not-found'` for both "doesn't exist" and "exists in a different org" is the enumeration-safe response; the audit log is the defensible surface.

## 3. Enterprise Gaps / Latent Risks (Pre-Audit)

| # | Gap | Severity |
|---|-----|----------|
| G1 | Handler sketch in Task 1 step 5 omits `@RequireRole('owner','manager')` — class-level `@UseGuards(AuthGuard, RoleGuard)` does NOT enforce a role without the decorator producing the `roles` metadata. Staff-role sessions could upload. | Must-have |
| G2 | `file.originalname.replace(/\.(pdf\|docx\|md\|txt)$/i, '')` is fed directly into the KnowledgeItem title. A filename like `../../../etc/passwd.pdf` or `\x00evil.pdf` lands in the DB and the UI without sanitization. | Must-have |
| G3 | No explicit handling of empty extraction output. A blank PDF or a DOCX with no text produces an empty KnowledgeItem — the downstream Claude enrichment then invents garbage tags for empty content (fail-open behavior shipped in Plan 01-03 makes this silent). | Must-have |
| G4 | No ingestion audit-log event (`docs.uploaded`). The plan only logs the cross-org DELETE denial path. SOC-2 CC6.6 requires symmetric audit coverage: every write to protected data must produce an audit record. Without this, post-incident reconstruction of "which manager uploaded what at what time" is impossible. | Must-have |
| G5 | `apps/api/src/main.ts` line ~32: CORS `methods: ['GET','POST','OPTIONS']` — DELETE is NOT allowlisted. Browser preflight (OPTIONS) for DELETE /docs/:id will succeed (OPTIONS allows DELETE via `Access-Control-Request-Method`) but CORS response header `Access-Control-Allow-Methods` will omit DELETE, and the browser will abort the preflight → UI delete button fails silently in production. | Must-have |
| G6 | `apps/api/src/scripts/probe-api.ts` bootstrap (line ~972, ~978) is a parallel NestJS app with its own CORS + body-parser config. It must be kept symmetric with main.ts or the probes will either silently pass while production fails, or vice-versa. The plan's body-parser path-filter change in main.ts has no counterpart in probe-api.ts. | Must-have |
| G7 | Extraction has no timeout. unpdf/pdfjs-dist can CPU-spin on pathological PDF structures (see "PDF decompression bombs" / cycle references in xref tables). A single hostile 9 MB PDF can pin a worker indefinitely. | Strongly recommended |
| G8 | Probe A38 "flip the MIME to text/plain so extraction succeeds via the pass-through branch" does NOT exercise unpdf or mammoth code paths at all. The plan ships with probe coverage that looks green while the two most risky dependencies are untested. | Strongly recommended |
| G9 | No probe for the `extraction-failed` 422 code. It's a first-class error surface and would regress silently without coverage. | Strongly recommended |
| G10 | A41 "DELETE happy" asserts `findUnique` returns null but does not verify the `retag_queue_items` cascade actually fires. Cascades are an invisible contract — a future schema migration could break them without any probe noticing. | Strongly recommended |
| G11 | `app.use((req, res, next) => { return json({limit:'32kb'})(req, res, next) })` constructs a new middleware on every request (closure allocation + parser init). Hoist once at bootstrap. | Strongly recommended |
| G12 | No AC-1 acceptance criterion for the 403 staff-role reject, and no probe assertion covering it directly. RoleGuard coverage elsewhere (A7, A12) does not substitute for endpoint-specific coverage after a decorator omission was this close to shipping (see M1). | Strongly recommended |
| G13 | Multer `MulterError: LIMIT_FILE_SIZE` default surface is a NestJS 400 `Bad Request` — not the 413 + typed `error='file-too-large'` contract AC-1 promises. The plan waves at "multer may surface differently — catch both" but doesn't specify the translation. | Must-have (folded into M5) |

## 4. Concrete Upgrades Required (Applied to Plan)

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | `@RequireRole('owner','manager')` missing on upload handler | AC-1 Gherkin, Task 1 step 5, Task 3 (new A44), Boundaries Scope Limits, Verification, Success Criteria | Added explicit decorator in the handler signature block; added A44 probe for staff-role 403; added boundary statement calling out that class-level guard does NOT enforce role |
| M2 | Title sanitization | AC-1 Gherkin, Task 1 step 2 (doc-extract.ts), Task 1 step 5, Boundaries Scope Limits | Added `sanitizeUploadTitle(originalname)` helper in doc-extract.ts (strip path separators, control chars, ≤200 char cap, fallback "Untitled upload"); routed controller through helper |
| M3 | Empty/whitespace-only extraction rejection | AC-1 Gherkin, Task 1 step 2 (doc-extract.ts), Verification | Added `text.trim().length === 0 → throw ExtractError('empty-result')` at the end of extractText; verification item for unit sanity check |
| M4 | `docs.uploaded` ingestion audit log (SOC-2 CC6.6) | AC-1 Gherkin, Task 1 step 5, Boundaries Scope Limits, Verification, Success Criteria | Added structured JSON warn log with {actingOrgId, originalFilename, mimeType, byteSize, knowledgeItemId, extractionMs} on every successful upload; verification grep for event in probe stdout |
| M5 | CORS `methods` missing DELETE + probe-runner symmetry + MulterError → 413 translation | Task 1 step 4, step 4b, step 5, Verification | Added DELETE to CORS methods in both main.ts and probe-api.ts; mirrored body-parser path filter in probe-api.ts; added explicit MulterError translation requirement |
| M6 | Extraction timeout (30s) | AC-1 Gherkin, Task 1 step 2 (doc-extract.ts), Boundaries Scope Limits, Verification | Added `withTimeout` helper using Promise.race + clearTimeout; wraps both unpdf and mammoth calls; boundary statement; verification item for constant presence |

### Strongly Recommended (Applied)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | See M6 above (promoted to must-have due to clear DoS exposure) | — | (Covered by M6) |
| S2 | Probe the corrupt-file / extraction-failed path | AC-5 Gherkin, Task 3 action (new A43) | Added A43: POST with random bytes + application/pdf MIME → 422 error='extraction-failed' |
| S3 | Real PDF/DOCX probe coverage via base64-embedded literals | AC-5 Gherkin, Task 3 action (new A38b, A38c) | Added A38b (unpdf path) and A38c (mammoth path); if either cannot be made green within plan scope, BLOCKER rule applies (no silent skip) |
| S4 | Hoist jsonDefault middleware instance | Task 1 step 4 | Changed to `const jsonDefault = json({limit:'32kb'})` above the `app.use` call; closure reuses the hoisted instance |
| S5 | Add `op` field distinguishing read vs delete on cross_org_denied event | Task 2 step 1 (already in plan; confirmed) | No change needed — plan already specified `op: 'delete'` |
| S6 | Verify retag_queue_items cascade in A41, not assume it | AC-5 Gherkin, Task 3 A41 action | A41 now inserts a reTagQueueItem row before delete and asserts `count({where:{knowledgeItemId:id}}) === 0` after |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | Magic-byte / file signature validation before extraction | unpdf/mammoth error on malformed bytes → caught by ExtractError → 422 extraction-failed. The failure mode is correct; magic-byte pre-check is belt on suspenders. |
| D2 | Per-org rate limiting on upload | No rate limiting exists elsewhere in the API surface. Adding it here creates an inconsistent security posture. Belongs in a future "rate limiting" plan covering the full surface. |
| D3 | Multer disk storage for large files | 10 MB in-memory cap × reasonable concurrency on a single Digital Ocean droplet is acceptable. Disk spooling adds cleanup/temp-file-lifecycle complexity. Revisit at Phase 5 (production deployment) if observed memory pressure appears. |
| D4 | FK survey beyond ReTagQueueItem | Confirmed during audit: only `retag_queue_items.knowledgeItemId` references KnowledgeItem (onDelete: Cascade). Chat citations are denormalized JSON in messages (no FK). No other FKs exist. Closed in audit, not deferred — no code change needed. |
| D5 | Dependency pinning via `.npmrc save-prefix=""` | Already tracked as a STATE.md carry-forward item post-02-01 and 02-02. A follow-up tooling plan is the right place. |

## 5. Audit & Compliance Readiness

**Does the plan (post-audit) produce defensible audit evidence?**
Yes. Every successful upload now emits a `docs.uploaded` structured log with the 6 fields required for post-incident reconstruction (actingOrgId, originalFilename, mimeType, byteSize, knowledgeItemId, extractionMs). Every cross-org DELETE attempt emits a `docs.cross_org_denied` log with an `op` discriminator. Combined with Plan 01-03's phone-verification audit log and 02-01's cross-org READ denial log, the ingestion + access surface has symmetric audit coverage.

**Does it prevent silent failures?**
Yes, post-audit. Pre-audit, two silent-failure modes existed: (1) a staff-role session could upload without any guard firing a log, and (2) an empty-extraction would create a blank KnowledgeItem that Claude enrichment would fail-open on, producing silent garbage data. Both are now rejected at the extraction/role boundary.

**Does it support post-incident reconstruction?**
Yes. `docs.uploaded` → forensic question "who uploaded X" answerable. `docs.cross_org_denied` → "was there an attempted cross-org access" answerable. DELETE cascade verification (A41) → "did the cascade ever fire" answerable from probe history.

**Clear ownership and accountability?**
Plan scope (single developer, atomic per-task commits, explicit files_modified) satisfies this. SUMMARY.md output step records AC verdicts + deviations with rationale.

**Area that would fail a real audit (post-audit):** None identified at current scope. The deferred items (D2 rate limiting, D3 disk spooling) are legitimate post-POC concerns; no auditor would flag them as release-blockers for a multi-tenant SaaS with a 10 MB cap and memory-bounded extraction.

## 6. Final Release Bar

**What must be true before this plan ships:**
1. All 6 must-have findings (M1–M6) applied — DONE (in plan).
2. All verification checklist items pass, including the new audit-added ones (role decorator grep, docs.uploaded log observed, CORS methods include DELETE in both main and probe, extraction timeout constant present, empty-extraction sanity).
3. Probe count reaches ≥61 and all 9 new assertions (including real-binary A38b/A38c and corrupt-file A43 and staff-role A44) pass.
4. Zero regression on `probe:auth` (≥54).
5. A manual cURL of upload + DELETE executed end-to-end (covered in Task 1 verify).

**Remaining risks if shipped as-is (post-audit):**
- Memory pressure from concurrent 10 MB uploads on a constrained droplet — D3 deferred; monitoring for RSS growth is the mitigation.
- Rate abuse from a legitimate manager account — D2 deferred; legal mitigation is T&Cs + retroactive audit log review.
- Hostile PDF structures that pass the 30s timeout but produce 1 MB of garbage-encoded text post-extraction — bounded by MAX_EXTRACT_CHARS at 1 MB; Claude enrichment fail-open absorbs the downstream garbage.

**Would I sign my name to this system (post-audit)?**
Yes, for a POC / alpha tenancy (≤100 venues, ≤10 concurrent uploads/venue/hour). For scale beyond that, D2 (rate limiting) and D3 (disk spooling) would become release-blockers in their own plans.

---

**Summary:** Applied 6 must-have + 6 strongly-recommended upgrades. Deferred 5 items (D4 closed in audit; D1, D2, D3, D5 legitimately deferred).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
*Auditor role: senior principal engineer + compliance reviewer (SOC-2 CC6.6 focus)*
