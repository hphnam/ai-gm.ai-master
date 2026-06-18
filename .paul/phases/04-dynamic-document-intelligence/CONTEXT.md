---
phase: 04-dynamic-document-intelligence
created: 2026-04-21
status: discuss-complete
pivot_from: 04-coolify-deployment (removed from roadmap 2026-04-21 — user self-managing deployment)
---

# Phase 4: Dynamic Document Intelligence — Discussion Context

## Vision

**AI as literal general manager.** Not a reactive Q&A assistant — an operations brain that knows what kind of documents a venue runs on (checklists, SOPs, rotas, incident reports, policies), when each should fire, who's responsible, and whether it got done. Proactive is the whole point, not a nice-to-have.

Concrete headline use case from user: *"Remind all staff of the weekly checklist"* triggers WhatsApp notifications on the right schedule to the right audience — without us writing a line of code specific to "weekly checklist" as a doc type.

## Goals

1. **Ingest any doc, figure out what KIND it is** — reference / procedure / form / schedule / policy / anything else. Taxonomy evolves from the docs themselves, not from our release cycle. Every company is different; the system must learn each tenant's vocabulary from their own uploads.
2. **Procedural docs become first-class.** Checklist / Procedure entities with persisted state, not just retrieval. State tracking and execution, not just "find and surface".
3. **Proactive scheduled behavior.** Scheduler + notifications layer fires WhatsApp reminders on the schedule extracted from the doc — not just when someone asks.
4. **Owner stays in the loop.** Auto-accept high-confidence classifications, owner confirms ambiguous ones. No silent taxonomy drift. No hardcoded types.
5. **Concrete target canaries:** three XLSX checklists in `docs/` (`OPENING / CLOSING / WEEKLY JOBS CHECKLIST BEERHALL.xlsx`) ingest and work end-to-end via the WhatsApp assistant, with **zero code in the pipeline specific to beerhalls or to these files' shape**. If we can ship that on these three, we can ship it on any tenant's docs.

## Approach

### Ingest-time intelligence

- Broaden extraction layer to handle the formats hospitality SMBs actually use (see Supported Formats below).
- **Classifier pass** (LLM-based) on every upload: given the tenant's current taxonomy + extracted content, the model either (a) classifies against an existing type with a confidence score, or (b) proposes a new type with a schema. Escape hatch is explicit — "if nothing fits, invent one".
- New-type proposals enter `pending` state — not live.
- Background clustering via embeddings merges similar proposals ("Opening Checklist" and "Morning Open Procedure" collapse).
- Promotion to `active` after N examples with stable schema. Schema widening is **additive-only** (registry semantics — new fields ok, existing fields can't break).
- Per-tenant taxonomy stored as DB entities, not code. Starts empty; grows with uploads. Ships with zero seed types.

### Supported formats (Plan 04-01 extraction layer)

**Already shipped (Phase 2):** `.txt`, `.md`, `.pdf` (via `unpdf`), `.docx` (via `mammoth`), paste.

**New in 04-01:**
- `.xlsx` / `.xls` via `exceljs` — multi-sheet, cell-level extraction. Spreadsheet structure (rows/cols/tabs) carries classification signal.
- `.csv` — lightweight addition once XLSX is in.
- `.pptx` via `pptx2md` or equivalent — slide decks are common for training material.
- Images (`.jpg` / `.png` / `.heic`) via Claude vision — reuses Phase 3 Plan 03-03's multimodal infra (magic-byte guard, SSRF-safe download, Claude image content blocks). Unlocks "photo of the laminated closing list" — a very hospitality-native pattern.

**Deferred:** Google Drive live sync → v0.3+; HTML / RTF / ODS → on demand; audio/voice → separate thread (Claude has no native audio).

### Procedural doc model

`Checklist` / `Procedure` entity carrying at minimum:
- **Schedule dimension** extracted at ingest: "every Monday morning", "daily 9am", "first of month", "on shift end". Drives the scheduler layer.
- **Steps[]** as structured array (not prose) — lets the WhatsApp assistant walk through them item-by-item.
- **Role / audience** — all staff, managers only, specific roles.
- **Completion criteria** — what "done" looks like per step (tick, numeric reading, photo).

**Completion state:**
- Tracked per-instance (today's opening vs yesterday's) and per-staff member.
- Daily / weekly auto-reset driven by the extracted schedule.
- History retained for audit — manager can ask "did opening get done Tuesday? who did it?"

### Scheduler + notifications layer

- Cron-ish firing driven by extracted schedules.
- Audience resolution via existing `OrganizationMember` rows (all staff / role-scoped / specific users).
- WhatsApp outbound via existing Infobip adapter (Plan 03-04).
- Delivery + acknowledgment tracking.
- Dedup: don't spam if an active reminder thread already exists for the same instance.

### Owner confirmation UI

- **Inline modal on upload** for clear-cut high-confidence promotions: "we think this is a new 'Incident Report' type — here's the structure — keep / rename / merge with X?"
- **Dedicated "taxonomy inbox"** settings page for ambiguous / below-threshold items. Accumulates for review. Never silently promoted.
- Confidence threshold tunable per-tenant (sensible default at plan time).

### Runtime routing (WhatsApp)

- **Reference docs** → existing RAG path (unchanged, zero regression risk).
- **Procedural docs** → three interaction modes, all supported:
  - **Walkthrough:** assistant presents steps one at a time, ticks off as user confirms. Default execution mode when a scheduled reminder fires.
  - **Ad-hoc:** staff/manager asks "has closing been done?" → assistant queries completion state, answers.
  - **Proactive:** schedule fires → assistant opens a WhatsApp thread with the reminder + optional walkthrough.

## Design decisions (defaults — some revisitable during planning)

| Decision | Choice | Notes |
|----------|--------|-------|
| Runtime interaction modes | All three (walkthrough + ad-hoc + proactive) | Proactive is load-bearing per "literal GM" framing |
| Completion attribution | Per-staff member | Enables "who did closing?" queries |
| History retention | Forever / audit-grade | Revisit if storage becomes a concern |
| Classifier model | Claude (Anthropic SDK already wired) | Reconsider embedding+LLM hybrid if cost spikes |
| Taxonomy promotion | Auto-accept above confidence threshold; owner-confirm below | Threshold tunable per-tenant |
| Cross-tenant priors | Deferred, feature-flagged off | Cold-start worth revisiting in v0.3 |
| Existing docs backfill | Not auto-backfilled; only new uploads classify | Explicit `/paul:backfill` command ships if needed |
| Google Drive live sync | Deferred to v0.3+ | CSV/XLSX upload via existing `/docs` flow for v1 |
| Storage shape | Single flexible Prisma model (JSON per-tenant schemas) or per-tenant tables? | **Open — resolve in plan 04-01** |
| XLSX multi-sheet handling | Each sheet = separate doc, or one doc with multiple tab sections? | **Open — resolve in plan 04-01** |

## Proposed plan breakdown (5 plans — split revised 2026-04-21 during /paul:plan 04-01)

1. **04-01 — Broadened extraction layer** (this plan — standard track, 3 tasks)
   - XLSX / XLS-drop / CSV / PPTX / image-via-Claude-vision wired into existing `/docs` upload pipeline
   - Per-MIME size cap map + magic-byte validation reusing Phase 3 Plan 03-03 primitives
   - Immediate value: beerhall xlsx canaries ingest end-to-end before classifier lands
   - NO classifier logic; NO taxonomy schema; NO procedural model — this is pure extraction foundation

2. **04-02 — Classifier + per-tenant taxonomy + owner UI**
   - Classifier pass on every upload (Claude) — LLM tag + confidence + escape hatch
   - Per-tenant `DocumentType` + `DocumentTypeSchema` Prisma models
   - Pending → embedding-cluster → promote lifecycle
   - Additive-only schema widening (registry semantics)
   - Owner confirmation UI: inline upload modal (high-confidence) + taxonomy-inbox settings page (ambiguous)

3. **04-03 — Procedural doc model + schedule extraction**
   - `Checklist` / `Procedure` entity schema with schedule dimension
   - Schedule extraction pass (LLM-parses "every Monday morning" → structured cron-equivalent)
   - Completion state model (per-instance + per-staff-member, with auto-reset driven by schedule)

4. **04-04 — Scheduler + WhatsApp notifications**
   - Cron-ish firing layer driven by extracted schedules
   - Audience resolution via OrganizationMember (all-staff / role-scoped / specific users)
   - WhatsApp outbound via existing Infobip adapter (Plan 03-04)
   - Delivery + ack tracking
   - Dedup + rate-limit

5. **04-05 — WhatsApp runtime for procedural docs**
   - Interactive walkthrough state machine (current-step persistence per conversation)
   - Ad-hoc completion queries ("has closing been done?")
   - Completion tracking persistence
   - Manager "who did what" queries via existing chat surface

## Test canaries

Three real-world XLSX checklists have been placed in `docs/`:
- `OPENING CHECKLIST BEERHALL.xlsx`
- `CLOSING CHECKLIST BEERHALL.xlsx`
- `WEEKLY JOBS CHECKLIST BEERHALL.xlsx`

**These are test inputs for the classifier, NOT seed data and NOT a schema to hardcode.** Plan 04-01 APPLY runs them through the classifier end-to-end to validate the emergent taxonomy + schemas look reasonable. If any code in the pipeline references "beerhall" or matches on these files' specific column layout, that's a bug — the whole point is the system generalizes to any tenant's docs without us pre-seeing them.

## Open for planning

- **Storage shape** — single Prisma model with JSON per-tenant schemas, or per-tenant schema tables? (Probably JSON for v1 — flexible, one-tenant = one row.)
- **Notification dedup + rate-limit semantics** — how do we avoid spamming if a manager re-triggers a reminder manually?
- **Walkthrough state machine** — where is "current position in checklist" stored between turns? ChatConversation metadata? Dedicated table?
- **XLSX multi-sheet handling** — each tab a separate doc, or one doc with sections?
- **Mixed-format docs** — a PDF that's 50% prose + 50% tables: how does the classifier prioritize signal?
- **Schedule extraction** — LLM-based parse of free-form cadence ("every Monday") into a structured schedule (cron / enum)?
- **Classifier cost envelope** — per-upload Claude call is ~$0.01-0.05; at scale worth a per-tenant monthly cap + fallback to embedding-only if exceeded?

## Prerequisites satisfied

- Phase 1 auth + organization scoping — procedural docs scope per-org naturally
- Phase 2 ingest pipeline + `KnowledgeItem` model — extend, don't rebuild
- Phase 3 Infobip WhatsApp adapter (03-04) — outbound notification path is ready
- Phase 3 Plan 03-03 multimodal infra — image-via-vision extraction reuses it
- Phase 3 Plan 03-05 single-vendor Infobip (WhatsApp + SMS OTP) — no Twilio cleanup blocking Phase 4

## Next

`/paul:plan 04-01` — create the first plan from this context.
