# Roadmap: GM AI

## Overview

Build the AI/API layer for a multi-venue hospitality operations assistant. v0.1 POC is complete — the system can answer stock, SOP, equipment, and contact queries via semantic retrieval over seeded data with a Next.js chat UI and a read-only debug panel. v0.2 Multi-Tenant WhatsApp takes that proven loop from dev-only → production: real users, real orgs with role-based membership, manager-uploaded documents, phone-number-to-account linking, WhatsApp as the primary channel, and a Coolify deployment.

## Current Milestone

**v0.2 Multi-Tenant WhatsApp** (v0.2.0)
Status: 🚧 In Progress (3 of 4 phases complete; Phase 4 pivoted 2026-04-21 to Dynamic Document Intelligence)
Phases: 4
Estimated plans: 15 (Phase 3: 5 shipped / 3 superseded; Phase 4: 5 finalized during /paul:plan 04-01)

**Theme:** "Managers sign up, invite their team, upload their venue docs, connect their WhatsApp number, and staff chat with the GM assistant from their phones — with the assistant understanding what KIND of document each upload is (reference vs procedural) and executing procedural docs as stateful checklists."

### Phase Overview

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Auth + Organizations | 3 of 3 (01-01 ✓, 01-02 ✓, 01-03 ✓) | Complete | 2026-04-20 |
| 2 | Document Ingest UI | 2 of 2 (02-01 ✓, 02-02 ✓) | Complete | 2026-04-20 |
| 3 | WhatsApp Integration | 3 superseded (Twilio: 03-01 ⊘, 03-02 ⊘, 03-03 ⊘) + 03-04 ✓ (Infobip WhatsApp) + 03-05 ✓ (Infobip 2FA SMS OTP) | Complete | 2026-04-21 |
| 4 | Dynamic Document Intelligence | 5 plans (04-01 in PLAN; 04-02 taxonomy / 04-03 procedural model / 04-04 scheduler+notifications / 04-05 WhatsApp runtime) | 🚧 In Progress | - |

### Phase 1: Auth + Organizations

**Focus:** Multi-tenant foundation with better-auth `organization` + `phoneNumber` plugins; roles (owner/manager/staff); schema migration so Venue → Organization; every existing endpoint gets auth-guarded; phone verification via Twilio Verify SMS OTP; seeded Crown + Anchor migrate into a Demo Organization.

**Scope:**
- better-auth integration with Prisma 7 adapter
- Schema: Organization + OrganizationMember + User.phoneNumber; Venue gains organizationId FK
- NestJS AuthGuard + role guards wrapping existing controllers
- Sign-up / sign-in / invite flows (email-only; no SMS invites)
- Tenant scoping at service layer (orgId + venueId in WHERE clauses; probe extends cross-org isolation tests)
- Next.js /auth/* routes + org switcher + /settings/organization UI
- Phone-linking flow via Twilio Verify
- Kick off Meta Business verification paperwork (calendar-time parallel track; blocks Phase 4 live cutover)

**Plans:** TBD (defined during /paul:plan)

### Phase 2: Document Ingest UI

**Focus:** Manager self-service document upload. Extends existing IngestService (v0.1 Phase 3) with HTTP upload endpoint + multi-format text extraction (.txt, .md, .pdf via pdf-parse/unpdf, .docx via mammoth, plain-text paste). Org-scoped at the repository layer. Manager-only via role guard.

**Scope:**
- POST /ingest/documents endpoint with multipart upload + MIME validation + size cap
- Text extraction pipeline per file type; plain-text pass-through
- KnowledgeItem gains organizationId; retrieval filters on org AND venue (null venueId = org-wide doc)
- Next.js /docs route: list, upload, view metadata, delete
- Manager-only role gate via NestJS guard + UI hide for staff role
- Reuse 05-03 debug-panel JSON viewer pattern for agentic-metadata inspection

**Plans:** TBD (defined during /paul:plan)

### Phase 3: WhatsApp Integration

**Focus:** The payoff — Twilio WhatsApp inbound webhook routed through existing ChatService; typing-indicator UX (free, mandatory); image support via Claude multimodal; session mapping to ChatConversation with 2-hour idle heuristic; adapter pattern preserves Meta-direct swap for v0.3+. Voice notes out of scope (reply-with-friendly-rejection).

**Scope:**
- WhatsAppAdapter wrapping Twilio REST API (mirror of EmbeddingsService → Voyage pattern)
- POST /webhooks/twilio/whatsapp with signature validation (HMAC-SHA1)
- Phone-number lookup: From → User → Org → default Venue
- Unknown-number handling (rate-limited onboarding reply)
- Typing indicator + read receipt on inbound (free; ~30 lines; re-fire every 20s if Claude takes > 20s)
- Inbound text → ChatService.sendMessage (reuses v0.1 Phase 4 loop)
- Inbound image → Twilio media download → Claude multimodal content block
- Inbound audio → friendly rejection message
- Outbound via Twilio messages endpoint
- Proactive suggestions from onConversationOpen sent as opening message within 24h session
- probe-whatsapp.ts exercising webhook end-to-end against Twilio sandbox
- Observability: whatsapp.inbound / whatsapp.outbound / whatsapp.typing_indicator_refired structured logs; phone hashed for PII safety

**Plans:** TBD (defined during /paul:plan)

### Phase 4: Dynamic Document Intelligence

**Pivot 2026-04-21:** Original Phase 4 (Coolify Deployment) removed from roadmap — user self-managing deployment. Replaced with a document-intelligence layer that handles what RAG alone can't: procedural artifacts (checklists, SOPs, daily-routine docs) that require state tracking and execution, not just retrieval.

**Focus:** Ingest-time document classification + per-tenant taxonomy + schema extraction + runtime routing. Every tenant's taxonomy evolves as they upload docs — no hardcoded document types, no releases required to support new doc shapes. Procedural docs become first-class Checklist/Procedure entities the WhatsApp assistant can present interactively and track completion on.

**Scope (pre-discuss sketch — concrete shape to come from /paul:discuss):**
- Ingest-time classifier: on upload, LLM tags the doc against tenant's current taxonomy with an explicit escape hatch ("if none fit, propose a new type + schema")
- Per-tenant taxonomy + schema stored as DB entities (not code). Starts empty; grows with uploads.
- Cluster-and-promote loop: pending type proposals cluster via embeddings (duplicates collapse); promotion to active after N examples with stable schema. Schema widening is additive-only (registry semantics).
- Owner-facing confirmation UI in the web app: auto-accept above confidence threshold; surface "new doc type detected — keep / rename / merge" for ambiguous cases. No silent taxonomy drift.
- Runtime routing: reference docs → existing RAG path (unchanged); procedural docs → Checklist/Procedure entities with persisted completion state that the assistant can query, present, and tick off interactively.
- Optional cross-tenant priors (new-tenant cold-start): seed a new org's classifier with anonymized shapes of doc types seen across existing orgs. Privacy-gated; behind a feature flag.

**Plans (5, finalized 2026-04-21 during /paul:plan 04-01 scope-split):**
- `04-01` — Broadened extraction layer (XLSX/CSV/PPTX/image-via-Claude-vision; 3 tasks; standard track; IN PLAN)
- `04-02` — Classifier + per-tenant taxonomy + owner confirmation UI
- `04-03` — Procedural doc model (Checklist entity) + schedule extraction
- `04-04` — Scheduler + WhatsApp notifications
- `04-05` — WhatsApp runtime for procedural docs (walkthrough + ad-hoc + completion tracking)

**Deployment:** Out of roadmap scope — user self-managing production deploy, Infobip Portal UAT, domain/HTTPS/DB migrations.

---

## Completed Milestones

<details>
<summary><strong>v0.1 POC</strong> (v0.1.0) — Completed 2026-04-19 · 5 phases · 13 plans</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 1 | Project Foundation | 2/2 | 2026-04-18 |
| 2 | Embeddings & Seeding | 2/2 | 2026-04-18 |
| 3 | Agentic Knowledge Layer | 3/3 | 2026-04-18 |
| 4 | Chat Engine | 3/3 | 2026-04-18 |
| 5 | Web Interface | 3/3 | 2026-04-19 |

**Commits on main:** 51af306 → 88ab109 → 11e6049 → 1abd945 → ceb81bb → 3569f16 → 9efb5a5 → fe88a8a → a12c78a → 7aba52d (milestone completion)
**Tag:** v0.1.0

**Archive:** `.paul/milestones/0.1.0-ROADMAP.md` (full phase details preserved at milestone-completion snapshot)
**Entry:** `.paul/MILESTONES.md`

</details>

---
*Roadmap created: 2026-04-13*
*Last updated: 2026-04-21 — v0.2 Phase 3 closed (Twilio fully removed via Plans 03-04 + 03-05 Infobip migration); Phase 4 pivoted from Coolify Deployment to Dynamic Document Intelligence*
