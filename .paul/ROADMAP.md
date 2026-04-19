# Roadmap: GM AI

## Overview

Build the AI/API layer for a multi-venue hospitality operations assistant. v0.1 POC is complete — the system can answer stock, SOP, equipment, and contact queries via semantic retrieval over seeded data with a Next.js chat UI and a read-only debug panel. v0.2 Multi-Tenant WhatsApp takes that proven loop from dev-only → production: real users, real orgs with role-based membership, manager-uploaded documents, phone-number-to-account linking, WhatsApp as the primary channel, and a Coolify deployment.

## Current Milestone

**v0.2 Multi-Tenant WhatsApp** (v0.2.0)
Status: 🚧 In Progress (0 of 4 phases complete)
Phases: 4
Estimated plans: 10-14

**Theme:** "Managers sign up, invite their team, upload their venue docs, connect their WhatsApp number, and staff chat with the GM assistant from their phones — deployed to Coolify."

### Phase Overview

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Auth + Organizations | 3 of 3 (01-01 ✓, 01-02 ✓, 01-03 planned) | In progress | - |
| 2 | Document Ingest UI | TBD (2-3 est) | Not started | - |
| 3 | WhatsApp Integration | TBD (3-4 est) | Not started | - |
| 4 | Coolify Deployment | TBD (2-3 est) | Not started | - |

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

### Phase 4: Coolify Deployment

**Focus:** Production cutover. Dockerfiles + Coolify service config; domain + HTTPS + CORS; Neon production branch + migrations via prisma migrate deploy; Twilio webhook URL swings from ngrok → production HTTPS; end-to-end smoke test (Ryan's phone → real Coolify URL → Claude reply). Live WhatsApp sender contingent on Meta Business verification; sandbox fallback if paperwork pending.

**Scope:**
- apps/api + apps/web Dockerfiles (multi-stage, pnpm+turbo build)
- Coolify service + env/secret config
- app.gm-ai.example.com + api.gm-ai.example.com (final domain TBD)
- Let's Encrypt HTTPS via Coolify
- Production seed script (env-gated, minimal — not full dev seed)
- Webhook cutover in Twilio console
- Meta Business verification completion OR sandbox fallback path
- .paul/DEPLOY.md runbook with rollback procedure + secret rotation
- Health checks (/health endpoints)
- Smoke test acceptance: full sign-up → invite → upload → phone link → WhatsApp → AI reply flow, live

**Plans:** TBD (defined during /paul:plan)

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
*Last updated: 2026-04-19 — v0.2 Multi-Tenant WhatsApp milestone created (4 phases defined; plans TBD per phase)*
