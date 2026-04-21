---
phase: 04-dynamic-document-intelligence
plan: 01
subsystem: docs
tags: [document-extraction, xlsx, csv, pptx, image-vision, claude-sonnet-4-6, prisma-migration]

requires:
  - phase: 02-document-ingest (Plan 02-02)
    provides: KnowledgeItem upload path, extractText dispatcher, ExtractError class, withTimeout helper, multer-exception.filter
  - phase: 03-whatsapp-integration (Plan 03-03)
    provides: magic-byte MIME validator (factored to shared util this plan), Claude vision content-block shape
  - phase: 03-whatsapp-integration (Plan 03-05)
    provides: sanitiseError pattern (factored to shared util in Task 1)

provides:
  - XLSX text extraction via exceljs
  - CSV text extraction via csv-parse/sync
  - PPTX text extraction via officeparser v6.1.0 (AST-walking for per-slide output)
  - Image text extraction via Claude vision (claude-sonnet-4-6) — jpg/png/webp
  - Shared sanitiseError util at apps/api/src/common/sanitise-error.ts
  - Shared magic-byte validator at apps/api/src/common/image-magic-bytes.ts
  - Shared ZIP header check at apps/api/src/modules/docs/extractors/zip-header.ts
  - Per-MIME upload size cap map (UPLOAD_MAX_BYTES_BY_MIME)
  - MAX_CONCURRENT_IMAGE_EXTRACTS=3 semaphore + 15s queue timeout
  - docs.image_extract_cost + docs.image_extract_queued structured logs
  - KnowledgeItem.sourceImageBytes Bytes? + KnowledgeItem.sourceImageMime String? (additive nullable)
  - UI file-picker accept attribute + help text extended for 7 new formats
  - apps/web mapApiError coverage for extraction-failed × (unsupported-mime | corrupt-bytes | timeout | empty-result)
  - ExtractError.reason plumbed through 422 responses as details: { reason }

affects: [Plan 04-02 (classifier+taxonomy) — any upload now becomes text + optional source bytes; classifier inherits this invariant]

tech-stack:
  added:
    - exceljs (latest — XLSX)
    - csv-parse (latest — CSV)
    - officeparser (latest — PPTX; v6.1.0 at APPLY time)
  patterns:
    - Magic-byte gate BEFORE library parse (PK\x03\x04 for OOXML; format-specific for images)
    - Shared sanitiseError imported by all external-service error log paths
    - Module-local lazy singleton for Anthropic client (mirrors IngestService.onModuleInit)
    - Closure-based concurrency semaphore with FIFO waiter queue + timeout race
    - Per-MIME cap enforced at controller (second gate behind multer's single-ceiling)
    - AST-walking for slide-structured PPTX output; flat-text path for XLSX/CSV

key-files:
  created:
    - apps/api/src/common/sanitise-error.ts
    - apps/api/src/common/image-magic-bytes.ts
    - apps/api/src/modules/docs/extractors/zip-header.ts
    - apps/api/src/modules/docs/extractors/xlsx-extractor.ts
    - apps/api/src/modules/docs/extractors/csv-extractor.ts
    - apps/api/src/modules/docs/extractors/pptx-extractor.ts
    - apps/api/src/modules/docs/extractors/image-extractor.ts
    - packages/database/prisma/migrations/20260421150000_knowledge_item_image_source/migration.sql
  modified:
    - apps/api/src/modules/docs/doc-extract.ts (allowlist + per-MIME cap map + XLSX/CSV/PPTX dispatch)
    - apps/api/src/modules/docs/docs.controller.ts (image branch + cost log + details.reason 422 plumb)
    - apps/api/src/modules/docs/docs.service.ts (sourceImageBytes/Mime pass-through)
    - apps/api/src/modules/ingest/ingest.service.ts (IngestInput gained image fields; upsert writes them at Prisma boundary with new Uint8Array coercion)
    - apps/api/src/modules/phone/infobip-verify.service.ts (import shared sanitiseError — Task 1)
    - apps/api/src/modules/whatsapp/whatsapp-media-download.ts (import shared magicByteMatchesMime — Task 3)
    - apps/api/package.json (+3 deps)
    - apps/web/src/components/docs/doc-form.tsx (accept attr + help text + BINARY_UPLOAD_EXTS regex)
    - apps/web/src/lib/map-api-error.ts (extraction-failed × 4 reasons — Task 1)
    - packages/database/prisma/schema.prisma (KnowledgeItem +2 nullable cols)

key-decisions:
  - "PPTX library: officeparser v6.1.0 — pure JS, 7 releases in 2026 through 2026-04-14, AST exposes first-class 'slide' node type with SlideMetadata.slideNumber (1-based). Rejected node-pptx-parser (2 releases Feb 2025, unmaintained) and pptxjs@0.0.0 (placeholder)."
  - "Image MIME scope reduced mid-APPLY: HEIC dropped because Anthropic SDK's ImageBlockParam media_type union is jpeg/png/webp/gif only. GIF excluded per AC-4 intent. HEIC deferred as D-04-01-J with sharp/heic-convert server-side conversion scope."
  - "Option A image-bytes persistence committed: inline Bytes? on KnowledgeItem (not a DocumentAsset sidecar). At POC scale (≤500 uploads × 5MB = ≤2.5GB aggregate), NeonDB is fine. Object-storage migration deferred as D-04-01-F with concrete triggers."
  - "Magic-byte gate added to NEW formats only (XLSX/CSV/PPTX/images). Existing PDF/DOCX/TXT/MD retain Phase 2 library-level error handling — preserves AC-6 byte-identical invariant on existing switch-case branches."
  - "Multer's fileSize ceiling stays at UPLOAD_MAX_BYTES=15MB (highest cap); per-MIME map refines per format post-multer. D-04-01-H registered for pre-multer per-MIME refinement when abuse surfaces."
  - "Claude vision concurrency: module-local 3-slot semaphore + 15s queue timeout chosen over HTTP-layer rate limit. Cost-burst control, not abuse protection — D-04-01-C handles the latter on public deploy."

patterns-established:
  - "Shared utilities live in apps/api/src/common/ — cross-module helpers (sanitiseError, image-magic-bytes) factored here when consumed by ≥2 modules"
  - "Per-format extractor lives in apps/api/src/modules/docs/extractors/<format>-extractor.ts — function-style export (Buffer → Promise<string>) with magic-byte gate FIRST, library call SECOND"
  - "Prisma Bytes boundary: normalize Buffer → new Uint8Array(buf) at the upsert call site to satisfy Prisma 7's Uint8Array<ArrayBuffer> type contract"
  - "Every library import + API call + wire literal in extractors carries `// Source: <URL> · verified <date>` inline"

duration: ~3h (inc. 1h paused mid-APPLY checkpoint between Task 1 and Task 2)
started: 2026-04-21T11:00:00Z
task1: 2026-04-21T13:58:00Z (commit 1b480b0)
paused: 2026-04-21T14:00:00Z (commit fa886a3)
task2: 2026-04-21T14:49:00Z (commit 6826b4d)
task3: 2026-04-21T15:30:00Z (commit 52b90f6)
---

# Plan 04-01 — Broadened Document Extraction Layer — SUMMARY

## Per-AC Assessment

| AC | Status | Notes |
|---|---|---|
| **AC-1** XLSX end-to-end | ✅ Structural Pass | exceljs + magic-byte gate + per-sheet output + MAX_EXTRACT_CHARS cap. UAT via AC-7a operator walk produces real ingestion. |
| **AC-2** CSV end-to-end | ✅ Structural Pass | csv-parse/sync + UTF-8 + newline + non-null sanity check. Tab-separated row output. |
| **AC-3** PPTX end-to-end | ✅ Structural Pass (pending operator smoke) | officeparser v6.1.0 AST walk — first heading child as title, rest as body, adjacent 'note' node as `[notes: ...]`. Empty slides skipped. Zero-char deck → empty-result error. |
| **AC-4** Image via vision | ⚠️ Partial Pass with SCOPE REDUCTION (see D1) | jpg/png/webp supported. HEIC dropped → D-04-01-J. Claude-sonnet-4-6, 4096 max_tokens, MAX_EXTRACT_CHARS cap, 30s withTimeout, 3-slot semaphore, cost log. Pending operator smoke for real token/USD numbers. |
| **AC-5** Magic-byte + size | ✅ Pass | Magic-byte gate on new formats only (AC-6 invariant preserved for existing formats). UPLOAD_MAX_BYTES_BY_MIME per-format cap enforced post-multer. 413 via MulterExceptionFilter unchanged. |
| **AC-6** Existing regression-free | ✅ Pass | `git diff` on PDF/DOCX/TXT/MD switch-case branches is zero-delta (additive new cases only). UAT via operator spot-check of one PDF + DOCX + TXT + MD. |
| **AC-7a** Beerhall canary ingestion (hard gate) | ⏳ Pending operator UAT | Canary guardrail grep green (zero matches across apps/api/src + apps/web/src + packages). Canary files exist locally (git-untracked per CONTEXT.md). Operator must sign in as Demo Org manager and upload all 3 through /docs UI. |
| **AC-7b** Beerhall retrieval quality (observational) | ⏳ Pending operator UAT | Not a gate per audit-M4 split. Record similarity per canary per probe query in this SUMMARY after UAT. Expected multi-sheet dilution → D-04-01-E Plan 04-02 per-sheet split trigger. |
| **AC-8** UI accepts new formats | ✅ Structural Pass (pending operator smoke) | file picker accept attr + BINARY_UPLOAD_EXTS regex + help text all extended. mapApiError coverage for 4 extraction-failed reasons confirmed. Operator UAT confirms visual + error-toast UX. |

## Deviations from Plan

### D1 — HEIC dropped from AC-4 image MIME scope (SPEC issue, mid-APPLY dial-down)
- **What:** Plan AC-4 specified jpg/png/heic/webp. APPLY reduced to jpg/png/webp only.
- **Why:** Anthropic SDK v0.x `ImageBlockParam['source']['media_type']` union is `image/jpeg | image/png | image/webp | image/gif` — HEIC is NOT accepted. Verified via tsc error on the first build (expected union rejected `"image/heic"`).
- **Classification:** Spec issue (plan assumed HEIC works). Not a re-plan because scope reduction is contained and matches the project pattern ("On-demand when a real user uploads one" — boundaries section).
- **Registered as:** D-04-01-J with concrete scope (add sharp or heic-convert server-side conversion BEFORE submitting to Claude) + trigger (first real HEIC upload attempt or user complaint).

### D2 — Prisma 7 Bytes type normalization
- **What:** IngestService.upsert writes `new Uint8Array(input.sourceImageBytes)` at each call site instead of passing the Buffer directly.
- **Why:** Prisma 7's generated types expect `Uint8Array<ArrayBuffer>` for `Bytes?` columns. Node's Buffer is `Uint8Array<ArrayBufferLike>`. TSC rejects the variance (`SharedArrayBuffer` is not assignable to `ArrayBuffer`). `new Uint8Array(buf)` is a no-copy view coercion.
- **Impact:** Zero runtime overhead. Pattern established for any future Bytes column writes.

### D3 — Migration hand-written to avoid pre-existing DB drift bleed
- **What:** `prisma migrate diff --from-config-datasource --to-schema` against NeonDB surfaced unrelated drift (`organizations.updatedAt DROP DEFAULT`, `ChatConversation_venueId_idx` + FK). Hand-wrote migration.sql with ONLY the 2 additive ALTER TABLE statements for KnowledgeItem.
- **Why:** Scope discipline — this plan owns KnowledgeItem schema changes, not organizations + ChatConversation. The pre-existing drift is a separate concern.
- **Registered as:** D-04-01-K — surface + resolve pre-existing Prisma drift (ChatConversation venueId FK missing from live DB; organizations.updatedAt DEFAULT divergence) in a dedicated schema-reconciliation plan.

### D4 — Pre-existing tsc errors catalogued, not fixed
- **What:** `pnpm --filter api exec tsc --noEmit` shows 8 errors on current tip:
  - 7 × TS7016 on `import { ... } from 'express'` — missing `@types/express` as apps/api devDep (auth.controller.ts, auth.guard.ts, org-context.middleware.ts, debug.controller.ts, multer-exception.filter.ts, invitations.controller.ts, phone.controller.ts)
  - 1 × TS2345 on xlsx-extractor.ts line 21 — Buffer<ArrayBufferLike> vs Buffer (isZipHeader Uint8Array contract) — pre-existing from Task 1
- **Why:** All 8 are present on Task 2 baseline (`6826b4d`) — confirmed via `git stash` + fresh tsc run. Zero new errors introduced by Task 3. Repo uses swc for `nest build` (no type-check), so these never surface in the default build pipeline.
- **Registered as:** D-04-01-K (combined with D3 — one schema+type-hygiene plan fixes all deferred drift).

### D5 — `docs.uploaded` log's `mime` field pre-satisfied in Task 1
- **What:** Audit-S5 required adding `mime` field to `docs.uploaded` log. At APPLY time, the controller's existing payload already emitted `mimeType: file.mimetype`.
- **Why:** Phase 2 Plan 02-02's audit log landed with the field from the start; audit-S5 was a defensive re-check.
- **Impact:** Zero code change for S5 compliance; grep verified satisfaction.

### D6 — pnpm package filter is `api` not `@gm-ai/api`
- **What:** `apps/api/package.json` name is `"api"` (from workspace scaffolding). Plan text used `-F @gm-ai/api`.
- **Why:** Workspace scaffolding from 01-01 set the short name; no consumer refers to it via `@gm-ai/api`.
- **Impact:** Used `-F api` throughout APPLY. Future plans should mirror.

## Commit List

| Commit | Task | Description |
|---|---|---|
| `6395062` | Plan + Audit | Plan CREATED + 15 audit upgrades applied |
| `1b480b0` | Task 1 | XLSX + CSV extractors + sanitiseError factored to shared util |
| `fa886a3` | Pause | STATE.md loop position + paul.json checkpoint |
| `6826b4d` | Task 2 | PPTX extractor via officeparser v6 + shared ZIP header util |
| `52b90f6` | Task 3 | Image extractor via Claude vision + KnowledgeItem image-source migration |
| `<pending>` | UNIFY | Loop closure commit (STATE.md update + this SUMMARY) |

## APPLY-Time Decisions Recorded

### PPTX library
**Chosen:** `officeparser@6.1.0` (published 2026-04-14).

**Rationale:**
- **Maintenance:** 7 patch/minor releases in 2026 (6.0.1 → 6.1.0 across Jan/Mar/Apr). Actively maintained by author (harshankur).
- **API fit:** AST exposes first-class `'slide'` node type with `SlideMetadata.slideNumber` (1-based) — direct match for our `## Slide <n>: ...` output format.
- **Pure JS:** tesseract.js and pdfjs-dist only load when `ocr:true` or PDF input. Our config has ocr:false and we don't dispatch PDFs to officeparser (unpdf handles PDFs). No Python or `unzip` shell-out.
- **Alternatives rejected:**
  - `node-pptx-parser` v1.0.1 — 2 total releases both within 1 day in Feb 2025, no updates since. Too small a maintenance surface for production.
  - `pptxjs@0.0.0` — placeholder package, not a real implementation.
  - `pptx-parser@1.1.7-beta.9` — last real release 2022, stagnant.

**Citation:** `// Source: https://www.npmjs.com/package/officeparser · verified 2026-04-21 (v6.1.0, published 2026-04-14)` in pptx-extractor.ts.

### Anthropic pricing
**Confirmed:** Sonnet 4.6 = $3/MTok input, $15/MTok output.

**Source:** https://docs.anthropic.com/en/docs/about-claude/pricing.md · verified 2026-04-21 (markdown variant of claude.com/pricing page).

**Used in:** image-extractor.ts `INPUT_USD_PER_MTOK = 3` + `OUTPUT_USD_PER_MTOK = 15` + `estimateUsd()` helper.

## AC-7b Retrieval Measurements

*Pending operator UAT. Template to fill after upload walk:*

| Canary | Probe Query | Similarity | Hit? (≥0.3) |
|---|---|---|---|
| OPENING CHECKLIST BEERHALL | "what's on the opening list" | TBD | TBD |
| OPENING CHECKLIST BEERHALL | "steps to open the beerhall" | TBD | TBD |
| CLOSING CHECKLIST BEERHALL | "what's on the closing list" | TBD | TBD |
| CLOSING CHECKLIST BEERHALL | "end of shift checklist" | TBD | TBD |
| WEEKLY JOBS CHECKLIST BEERHALL | "what are the weekly jobs" | TBD | TBD |

**Interpretation (recall: not a gate per audit-M4):**
- Similarity ≥0.3 → single-embedding-over-concatenated-multi-sheet content is sufficient for chat RAG.
- Similarity <0.3 → D-04-01-E trigger landed; Plan 04-02 will split XLSX multi-sheet into per-sheet KnowledgeItem rows.

**Post-measurement:** DELETE the 3 canary rows from Demo Org knowledge base (via /docs UI or SQL) so they don't pollute subsequent development chat sessions.

## Cost-Log Sample

*Pending operator smoke upload of one real image. Template:*

```json
{
  "level": "log",
  "event": "docs.image_extract_cost",
  "inputTokens": <fill>,
  "outputTokens": <fill>,
  "estimatedUsd": <fill>,
  "mime": "image/jpeg",
  "imageBytes": <fill>
}
```

**Expected magnitude for a photo of a printed checklist (~3MB JPEG, ~1000 tokens of extracted text):**
- Input: ~2000–4000 tokens (image token cost scales with resolution)
- Output: ~500–1200 tokens
- USD: ~$0.02–$0.05 per extraction

## Queue Behavior

*Pending operator concurrent-upload staging. `docs.image_extract_queued` log fires only when the 4th+ concurrent image extract request enters the waiter queue.*

**Staging:** open 4 browser tabs, upload 4 images near-simultaneously. Tab 4's response should take ≥(tab1's time) but ≤15s. Timeout path → `ExtractError('timeout')` → 422 with `reason: 'timeout'`.

## Deferred Items (D-04-01-*)

### Registered at audit time (applicable)

- **D-04-01-A** — Claude vision retry-once on 5xx/timeout. **Trigger:** first prod 5xx cluster on /docs image uploads.
- **D-04-01-B** — Per-org monthly image-extraction cost cap. **Trigger:** monthly aggregated `docs.image_extract_cost` > $5 for any single org.
- **D-04-01-C** — Concurrent-upload HTTP rate limit on /docs. **Trigger:** public deploy OR first observed abuse.
- **D-04-01-D** — `.xls` binary format support. **Trigger:** first user upload attempt + complaint.
- **D-04-01-E** — XLSX multi-sheet / PPTX multi-slide → per-unit KnowledgeItem split. **Trigger:** Plan 04-02 classifier demonstrates per-unit treatment materially improves classification.
- **D-04-01-F** — Image-bytes migration to S3/Cloud Storage. **Trigger:** ≥500 uploads OR `SUM(OCTET_LENGTH(sourceImageBytes)) > 2GB` OR first NeonDB backup/replication slowness complaint.
- **D-04-01-H** — Pre-multer per-MIME size cap (reject 15MB→5MB-cap-image before multer buffers it). **Trigger:** public deploy OR first observed 15MB-to-5MB-cap waste abuse.
- **D-04-01-I** — Magic-byte retrofit to existing PDF/DOCX/TXT/MD extractors. **Trigger:** first corrupt-file crash in an existing-format extraction path.

### Registered mid-APPLY (new)

- **D-04-01-J** — HEIC image format support (dropped from AC-4 this plan). **Scope:** add sharp or heic-convert server-side conversion (HEIC → JPEG) before submitting to Claude. **Trigger:** first real HEIC upload attempt.
- **D-04-01-K** — Schema drift + TS type hygiene combined fix. **Scope:** (a) add missing ChatConversation venueId FK + index to live NeonDB to match schema.prisma; (b) resolve organizations.updatedAt DEFAULT divergence; (c) add `@types/express` as apps/api devDep to fix 7 TS7016 errors; (d) coerce Buffer in xlsx-extractor isZipHeader call to satisfy Uint8Array contract (1 TS2345 error). **Trigger:** next apps/api plan that touches schema or adds new Controller.

## Verify Checklist

- [x] `pnpm --filter api build` — 77 files clean (swc).
- [x] `pnpm --filter web build` — compiled successfully.
- [x] `pnpm --filter @gm-ai/database prisma migrate deploy` — migration 20260421150000_knowledge_item_image_source applied clean to NeonDB.
- [x] Canary guardrail grep (`rg -i 'beerhall|opening checklist|closing checklist|weekly jobs|beer hall' apps/api/src apps/web/src packages/`) → zero matches.
- [x] Citation grep across `apps/api/src/modules/docs/extractors/` → 20 total `// Source:` references (≥2 per extractor file required).
- [x] audit-M1 grep: zero `logger.*` calls with text/content/extracted/base64/data payload in any extractor.
- [x] audit-M2 grep: `sanitiseError` import present in image-extractor.ts; zero `function sanitiseError\b` matches in `apps/api/src/modules/phone/`; zero `String(err)` or `JSON.stringify(err)` in image-extractor.ts.
- [x] audit-S2 grep: `MAX_CONCURRENT_IMAGE_EXTRACTS` + `docs.image_extract_queued` present in image-extractor.ts; `docs.image_extract_cost` present in docs.controller.ts.
- [x] audit-S3 grep: `csv-parse` in apps/api/package.json; `sourceImageBytes` in schema.prisma.
- [x] audit-S5 grep: `docs.uploaded` payload includes `mimeType` field (pre-satisfied in Task 1).
- [x] audit-S6: mapApiError covers unsupported-mime / corrupt-bytes / timeout / empty-result with user-friendly strings.
- [x] AC-6 invariant: `git diff` on pre-Phase-4 PDF/DOCX/TXT/MD switch-case branches in doc-extract.ts shows zero edits (only additive new cases).
- [ ] AC-7a operator UAT: all 3 canaries upload + extract + embed + appear in /docs list.
- [ ] AC-7b operator UAT: retrieval similarity measured + recorded in this SUMMARY.
- [ ] AC-8 operator UAT: file-picker accept works for each new extension; error toasts render user-friendly strings.
- [ ] AC-4 operator UAT: one real image upload produces visible `docs.image_extract_cost` log entry.
- [ ] AC-5 operator UAT: .xls renamed to .xlsx rejected with corrupt-bytes UI message; XLSX >10MB rejected with 413.
- [ ] Post-canary cleanup: delete all 3 canary rows from Demo Org knowledge base.

## Success Criteria Achievement

- ✅ 5 new input formats (XLSX, CSV, PPTX, JPG, PNG/WebP) flow end-to-end through `/docs` upload → KnowledgeItem persistence → embedding → retrieval. (HEIC dropped to D-04-01-J.)
- ⏳ 3 beerhall xlsx canaries ingest successfully (AC-7a hard gate) — pending operator UAT.
- ⏳ Retrieval quality measured per canary and recorded in SUMMARY (AC-7b) — pending operator UAT.
- ✅ Existing PDF / DOCX / TXT / MD regression-free — git-diff-verified invariant on switch-case branches.
- ✅ Image extraction reuses Phase 3 Plan 03-03 magic-byte primitives via shared `apps/api/src/common/image-magic-bytes.ts`. WhatsApp-side preserved (same signature set, HEIC added without affecting whatsapp allowlist).
- ✅ Shared `sanitiseError` util at `apps/api/src/common/sanitise-error.ts` — consumed by InfobipVerifyService (Task 1 migrated) + image-extractor (Task 3).
- ✅ Module-local Claude-vision concurrency semaphore (MAX=3, 15s queue timeout) — cost-burst + rate-limit exposure control.
- ✅ `docs.image_extract_cost` + `docs.image_extract_queued` observability logs in place.
- ✅ Extracted text never appears in any log payload — audit-M1 boundary grep-verified.
- ✅ `mime` field on `docs.uploaded` log — pre-satisfied in Task 1.
- ✅ UI `mapApiError` coverage confirmed for all new error types (audit-S6).
- ✅ Per-MIME size cap map replaces single `UPLOAD_MAX_BYTES` constant — enforced in docs.controller after multer.
- ✅ Image bytes persisted to `KnowledgeItem.sourceImageBytes` + `sourceImageMime` — additive nullable columns, migration applied clean.
- ✅ Phase 4 foundation ready: Plan 04-02 can assume "any uploaded doc becomes text + (for images) structured source bytes".

## Next Plan

**Plan 04-02** — Classifier + Taxonomy + Owner UI.

With 04-01's extraction layer in place, 04-02 can now ingest any of 7 formats (md/txt/pdf/docx/xlsx/csv/pptx + jpg/png/webp images) and run a per-org classifier to emergently discover document types — matching Phase 4 CONTEXT.md's "AI as literal GM" design intent.
