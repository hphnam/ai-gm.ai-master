# Roadmap: GM AI

## Overview

Build the AI/API layer for a multi-venue hospitality operations assistant. v0.1 POC is complete — the system can answer stock, SOP, equipment, and contact queries via semantic retrieval over seeded data with a Next.js chat UI and a read-only debug panel. v0.2 took that loop from dev-only → production: real users, real orgs with role-based membership, manager-uploaded documents, phone-number-to-account linking, WhatsApp via Infobip, and dynamic document intelligence (classifier + per-tenant taxonomy + procedural Checklist entity). v0.2 closed early at ~96% — Phase 4 plans 04-04 (scheduler + WhatsApp notifications) and 04-05 (WhatsApp procedural runtime) deliberately rolled forward into v0.3 so they ship on top of the new graph layer from day one.

## Current Milestone

**v0.3 Neural Brain** (v0.3.0)
Status: 🚧 In Progress (3 of 4 phases complete — Phase 1 Hierarchical Retrieval + Phase 5 Tabular Query Path closed 2026-04-28; Phase 6 Multi-Agent Chat Overhaul closed 2026-05-02 with post-fold 2026-05-03)
Phases: 4 (re-shaped 2026-05-03 — old Phase 3 Scheduler + Phase 4 Procedural Runtime deferred to v0.4; new Phase 3 WhatsApp Conversational UX added; Phase 2 Graph Layer remains queued)

**Theme:** "Per-venue neural brain — the assistant doesn't search docs, it knows the venue. Connections between docs are first-class data, and the WhatsApp channel speaks fluent venue-context."

**Vision (revised 2026-05-03):** v0.3 originally scoped a graph-first WhatsApp story (scheduled notifications + procedural walkthroughs both graph-aware from day one). Real-Anthropic UAT during Phase 6 surfaced that the multi-agent default was wrong-shaped for hospitality realtime use; the architectural pivot landed chat-v1 as default with multi-agent preserved as a `deep_research` tool. With chat now stable but still web-only, the missing primitive isn't outbound automation or graph enrichment — it's getting the existing chatbot to behave correctly inside a single WhatsApp thread (identity → venue → conversation boundaries). Outbound scheduler + procedural-runtime work moves to v0.4 where they can stack on a working WhatsApp inbound surface.

### Phase Overview

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Hierarchical Retrieval | 3/3 (01-01 schema+ingest, 01-02 backfill+retrieval, 01-03 cache+section-payload+probe-eval) | ✅ Complete | 2026-04-28 |
| 5 | Tabular Query Path | 1/1 (05-01 schema+ingest+query+tool+probe) | ✅ Complete | 2026-04-28 |
| 6 | Multi-Agent Chat Overhaul | 4/4 shipped (06-01, 06-02, 06-03, 06-04); 06-05 UI surface deferred to v0.4 | ✅ Complete (with post-fold) | 2026-05-02 (folded 2026-05-03) |
| 3 | WhatsApp Conversational UX | TBD | 🔜 Next (in /paul:discuss) | - |
| 2 | Graph Layer | TBD | Queued (after Phase 3) | - |

**Execution order (re-shaped 2026-05-03):** 1 ✅ → 5 ✅ → 6 ✅ → **3 (next — new scope)** → 2. Old Phase 3 (Scheduler + Graph-Aware Notifications) and old Phase 4 (Procedural Runtime) removed from v0.3 — both were graph-dependent outbound surfaces; v0.4 picks them up after the WhatsApp inbound primitive is proven. New Phase 3 owns the question "how does the existing chatbot work inside a WhatsApp thread?" — identity binding (phone → user → venue), venue switching when a user belongs to multiple venues, conversation boundaries inside a single infinite WhatsApp thread, onboarding flow. Existing wiring (06-04 Task 4) already routes WhatsApp inbound through ChatV2Service; pivot reverted that asymmetry — current WhatsApp consumer state is the open D-06-04-A. New Phase 3 entry-condition is /paul:discuss to lock conversational protocol decisions before /paul:plan.

### Phase 1: Hierarchical Retrieval

**Focus:** Refactor chunk storage from flat to **doc → section → chunk** hierarchy. Vector retrieval continues to hit at chunk granularity, but injection expands to the whole containing section. This is the foundation everything else stacks on — the "I clicked into the note" feel that flat RAG can't deliver. Cache-friendly so repeat queries on the same sections are cheap.

**Scope (pre-discuss sketch):**
- Chunk schema reshape: parent `Section` row carrying heading/title + `[Section.id]` FK on chunks
- Section-boundary detection at ingest (markdown headings as primary signal; semantic clustering as fallback for unstructured docs)
- Retrieval path refactor: vector hit → expand to section → inject section content (capped) into Claude context
- One-time backfill migration to re-derive section boundaries on existing `KnowledgeItem` rows
- Prompt-cache alignment: section payloads structured for stable cache keys
- Probe assertions raised to cover boundary detection, section expansion, and cache-hit behavior

**Plans:** TBD (defined during /paul:plan)

### Phase 2: Graph Layer

**Focus:** The headline feature. **Wikilinks parsed at ingest**, **`DocLink` schema**, **graph traversal tool** exposed to the agent, **wikilink autocomplete in `/docs` editor**. Vector finds the entry node; the graph tool walks its neighborhood. Connections are pre-baked at ingest, so retrieval stays cheap — the model isn't paying tokens to re-derive relationships every turn.

**Scope (pre-discuss sketch):**
- Wikilink parser detecting `[[Doc Title]]` and `[[Doc Title|alias]]` syntax at ingest + edit time
- `DocLink(fromDocId, toDocId, anchor, orgId)` table — separate from `Doc` for indexability, tenant-scoped via FK + index
- Resolution policy for unresolved targets (silently store as unresolved, prompt user, or auto-create stub — to be decided in /paul:discuss)
- Graph traversal tool `get_related_docs(docId, depth=1|2)` registered alongside existing `find_knowledge` vector tool; returns ~100–200 tokens of edge metadata
- Backlinks via reverse query on `DocLink` — no separate table
- Wikilink autocomplete in `/docs` editor: typing `[[` opens tenant-scoped doc picker with fuzzy match
- Tenant boundary discipline: `[[X]]` only ever resolves to a Doc with the same `organizationId`, no cross-tenant link leakage
- Composition with existing `SearchableEntity` heterogeneous index — to be decided in /paul:discuss (extend it, or keep `DocLink` strictly separate)

**Plans:** TBD (defined during /paul:plan)

### Phase 3: WhatsApp Conversational UX (re-scoped 2026-05-03)

**Focus:** Get the existing chatbot — chat-v1's `ChatService` ToolLoopAgent (post-Phase-6) — working *correctly* inside a single WhatsApp thread. The plumbing is shipped (Infobip inbound webhook + signature guard + outbound REST + media download from v0.2 Phase 3, ChatV2Service consumer wiring from 06-04 Task 4 — currently asymmetric per D-06-04-A). The missing layer is the **conversational protocol** on top: how does a regional manager who works at three venues say "ask Beerhall Brixton about ice machine engineer"? When does a long-running thread become a fresh conversation? Who is this WhatsApp number bound to, and how do they prove it?

**Replaces:** old Phase 3 (Scheduler + Graph-Aware Notifications) and old Phase 4 (Procedural Runtime), both deferred to v0.4. Both were graph-dependent outbound surfaces; v0.4 picks them up after the inbound primitive is proven.

**Scope (pre-discuss sketch — to be locked in /paul:discuss):**
- **Identity binding** — phone number ↔ user account ↔ organization membership. Phone OTP infrastructure already exists (v0.2 Plan 01-03). Open question: how does a fresh phone number bootstrap (admin-issued invite link with token? Self-DM the bot for OTP? First-message captures phone → asks for org code?)
- **Venue context resolution** — when a user belongs to multiple venues, how does each turn know which venue to scope retrieval against? Candidates: explicit command (`/venue beerhall`); auto-infer from question content; sticky-per-conversation with confirmation on switch; per-thread default with override; pinned-venue per user. Single-venue users should never see this surface.
- **Conversation boundaries** — WhatsApp is a single infinite thread per contact, but chat-v2 has discrete `Conversation` rows with their own message history scoped to LLM context windows. Mapping options: idle-timeout boundary (e.g. >30min silence → new conversation); explicit `/new` slash command; topic-shift heuristic (LLM judges); fixed-window-of-N-messages. History injection question: per-turn LLM context = current conversation only, or last conversation as warm priors, or sliding window across boundaries.
- **Slash-command surface** — minimal command vocabulary inside WhatsApp (`/venue`, `/new`, `/help`, possibly `/whoami`). Decide what's a command vs. a natural-language intent the bot should detect.
- **Message routing on the chat-v1 default path** — currently WhatsApp inbound goes through ChatV2Service (per 06-04 Task 4), but the architectural pivot reverted web /chat to chat-v1. Phase 3 must resolve this asymmetry: route WhatsApp through `ChatService.sendMessage` to match web behavior. D-06-04-A closes here.
- **Onboarding flow** — first-message-from-unknown-number behavior. Options: silent reject; reply with onboarding prompt; gated by allowlist; admin-issued invite token verification.
- **Probe coverage** — identity-binding flows, venue-switch correctness across turns, conversation-boundary behavior under various timing/topic patterns, asymmetry-revert verification (WhatsApp ↔ web parity on the default path).

**Existing wiring to leverage:**
- Infobip adapter + HMAC-SHA256 signature guard + outbound REST + 5MB media download w/ magic-byte validation (v0.2 Plan 03-04)
- Phone OTP via Twilio Verify (v0.2 Plan 01-03) — re-usable for WhatsApp identity binding
- `ChatService.sendMessage` (chat-v1 default, post-Phase-6) — accepts `(orgId, userId, conversationId, text, attachments?)`; returns `{ assistantMessage, conversationId }`
- `ConversationService` exported from chat-v2 module per 06-04 — handles list/fetch/delete; conversation row creation; history truncation

**Plans:** TBD (defined during /paul:plan after /paul:discuss locks the protocol decisions)

### Phase 5: Tabular Query Path

**Focus:** Close the aggregate-query gap on tabular documents. Current ingest preserves every row at section/chunk level (Phase 1), but aggregate questions ("top 3 selling wines", "total revenue", "highest priced item") fail because retrieval surfaces a slice of rows and Claude can only eyeball — there's no compute layer over the full table. This phase adds a **structured-data path** alongside the embedded-text path: at ingest, CSV/XLSX rows are tee'd into a JSONB row store; the agent gets a `query_document_table` tool with structured filter/group_by/aggregate/sort/limit params; Postgres does the math.

**Scope (pre-discuss sketch):**
- `tabular_rows(doc_id, row_index, data JSONB)` + `tabular_columns(doc_id, name, inferred_type)` schema, tenant-scoped via `KnowledgeItem.organizationId` FK
- Ingest tee: extend the existing CSV/XLSX path (`csv-extractor.ts` + XLSX equivalent) to persist rows alongside section creation — parsing already happens, this is a second sink
- Naive column-type inference at ingest (try number → try date → fall back to string) stored on `tabular_columns`
- Structured agent tool `query_document_table(doc_id, filters[], group_by?, aggregate?, sort?, limit?)` — typed params not raw SQL, Postgres JSONB operators do the work, no injection surface
- Prompt nudge: when retrieval surfaces a tabular doc and the question is aggregate-shaped, agent uses the tool instead of approximating from sections
- Tenant boundary: `doc_id` always validated against caller's `organizationId` — same SOC-2 CC6.6 discipline as Phase 1
- Probe coverage: ingest tee fidelity (every row persisted), tool query correctness (top-N / sum / count / filter), cross-tenant isolation, large-doc behaviour (>1000 rows)

**Plans:** TBD (defined during /paul:plan)

### Phase 6: Multi-Agent Chat Overhaul

**Focus:** Replace the single ToolLoopAgent + 333-line god-prompt + regex tier router with a **role-based multi-agent pipeline** that thinks like a human ops team. Today's chat is one Sonnet model following a script; the result is rigid behaviour, mixed-up retrievals, leaked internal reasoning ("⚠️ I wasn't able to retrieve 3 steps"), and headings that violate its own formatting rules. This phase rebuilds the chat surface around discrete cognitive roles — **Triage → Researchers (parallel) → Analyser → Writer → optional Critic** — each with a slim role-specific prompt and shaped tool surface. Built on top of Phases 1-5 (hierarchical retrieval, graph traversal, tabular query, procedural runtime) so each researcher specialist uses the right primitive natively.

**Scope (pre-discuss sketch):**
- **Triage agent** (Haiku) — classifies intent, drafts a research brief naming which specialists to dispatch with what queries; structured JSON output, not prose
- **Researcher specialists** (Haiku, parallel) — Docs (graph + section retrieval), Ops (stock/cutoffs/suppliers), People (contacts), Tabular (CSV/XLSX queries via Phase 5 tool), Venue (profile/layout/contacts/policies); each owns a *shaped* tool surface, not the generic `find_knowledge` flat-chunk-search
- **Shaped tool redesign** — replace the all-purpose `find_knowledge` with verbs that match user intent: `get_checklist(intent)` returns full ordered list (no top-K truncation), `get_person(name)` returns bio+role+contact+mentions, `get_venue_briefing(venueId)` returns profile+contacts+active issues, `search_docs(query, filters)` for genuine open queries
- **Analyser agent** (Sonnet) — reconciles overlapping retrievals (kills the dual-checklist mixup), dedupes across researcher outputs, decides if one bounded re-research pass is needed, emits `{synthesis, citations, openQuestions}`
- **Writer agent** (Sonnet) — only role producing user-facing prose; strict format/voice rules in a focused 30-50 line prompt (no headings, no retrieval narration, no "missing 3 steps" disclaimers)
- **Optional Critic agent** (Haiku) — verifies specifics (numbers, names, codes) against sources before send; bounces back if mismatch; opt-in for high-stakes turns (incidents, compliance, captures)
- **Parallel tool use enabled** for researchers (drop `disableParallelToolUse: true` for that role)
- **Streaming role transitions in UI** — "Triaging… Researching docs + contacts… Drafting…" so users feel the research happening (no more silent dead-air → wall of text)
- **Slim per-role prompts** — each role gets ~30-50 lines focused on its job; replaces the current 333-line `system-prompt.ts` god-prompt; per-role prompt caching stays viable
- **Feature-flag cutover** — new `chat-v2` module behind a flag, old `chat/` keeps running for safety; flip default + retire v1 after empirical quality verification
- **Tier routing deleted** — Triage agent decides which model per role per turn; regex `tier-router.ts` removed
- **Probe coverage** — role pipeline orchestration, parallel researcher fan-out, dedup correctness, streaming transition events, feature-flag cutover

**Plans (re-sliced 2026-05-01 from 4 → 5 — full v1 deletion absorbed as 06-04, prior 06-04 renumbered to 06-05):**
- **06-01 ✅ SHIPPED 2026-05-01** — pipeline skeleton + Triage + Docs researcher + Writer-lookup + cost capture infra (vertical slice for lookup mode behind default-off per-org feature flag). 9/9 ACs PASS, 74/74 probe assertions across 2 idempotent runs. SUMMARY: `.paul/phases/06-multi-agent-chat-overhaul/06-01-SUMMARY.md`.
- **06-02 ✅ SHIPPED 2026-05-01** — Pipeline depth: Analyser + Critic + reasoning/incident Writer modes + Triage prompt expansion + voice corpus to 12 (4 lookup unchanged + 4 reasoning + 4 incident). 13/13 ACs PASS, 150/150 probe assertions across 2 idempotent runs. CONTEXT: `.paul/phases/06-multi-agent-chat-overhaul/06-02-CONTEXT.md`. SUMMARY: `.paul/phases/06-multi-agent-chat-overhaul/06-02-SUMMARY.md`.
- **06-03** (PLAN created 2026-05-01) — Pipeline breadth: 4 new researchers (Ops + People + Tabular + Venue) with shaped tools (`get_person`, `get_venue_briefing`; Ops/Tabular reuse existing services via DI). Triage prompt dispatches per-mode researcher subsets with Venue mandatory on reasoning + incident. Orchestrator parallel fan-out via Promise.all over `triage.researchersToDispatch`. Boundaries STILL freeze chat-v1 (deletion is 06-04). PLAN: `.paul/phases/06-multi-agent-chat-overhaul/06-03-PLAN.md`.
- **06-04 NEW (added 2026-05-01) — Full chat-v1 deletion + WhatsApp + image/stream/history migrated to chat-v2.** Supersedes CONTEXT.md D-06-G ("Feature-flag cutover with empirical quality gate") — flag-based cutover replaced with direct deletion. Scope: (1) Drop `Organization.chatV2Enabled` Prisma column; (2) Build image-upload endpoint on chat-v2 (Anthropic vision + magic-byte hardening, mirrors Phase 4 04-01 contract); (3) Build streaming endpoint on chat-v2; (4) Build conversation list/fetch/delete on chat-v2; (5) Migrate `whatsapp.service.ts` to consume ChatV2Service; (6) Move `SendMessageInput` / `SendMessageResult` types from chat-v1 → chat-v2; (7) Delete `apps/api/src/modules/chat/` entirely; (8) Quality gate as **pre-deletion checkpoint** (probe-eval ≥80% on extended 12-query harness + manual UAT ≥18/20 amazing on canary org with flag flipped). No 2-week soak. Rollback path: git revert. User accepts no-flag-rollback risk explicitly.
- **06-05 (was 06-04)** — UI surface: streaming role transitions consumed by frontend, general-advice badge + save-CTA, `/debug/costs` route. Pure frontend work over already-deleted v1 — no backend cutover concerns remain.

**Re-slicing rationale:** original 4-plan structure had 06-04 absorb both UI work AND the cutover gate. User decision 2026-05-01 to "bin the flag, fully migrate" surfaced parity gaps not previously scoped: image upload, streaming, conversation history, WhatsApp consumer all still flow through chat-v1. Splitting v1 deletion (backend, high blast radius) from UI surface (frontend, low blast radius) means each plan is independently auditable, independently reversible. 06-03 is unchanged — boundaries still freeze v1 because deletion is sequenced AFTER breadth ships and stabilizes under real-Anthropic load.

**Quality gate moved from "before flag flip" to "before v1 deletion" (06-04 entry condition):** probe-eval ≥80% pass rate on 12-query harness + manual UAT on canary venue ≥18/20 amazing. With flag-flip removed, the gate is the only safety check before production-wide cutover. Failure path: don't run 06-04 deletion; debug under flag with canary org `chatV2Enabled=true` until gate passes.

---

## Explicitly Deferred to v0.4 (with triggers)

These came up during v0.3 discussion and have specific revisit conditions, not abandonment:

| Item | Trigger |
|------|---------|
| Scheduler + Graph-Aware WhatsApp Notifications (was v0.3 Phase 3, removed 2026-05-03) | v0.3 Phase 3 (WhatsApp Conversational UX) ships and operates without UX regressions for 2+ weeks. Outbound automation needs a working inbound surface as its substrate — schedulers that fire into a broken thread protocol just amplify the breakage. |
| WhatsApp Procedural Runtime — walkthrough mode + completion tracking (was v0.3 Phase 4, removed 2026-05-03) | Same trigger as Scheduler above. Procedural walkthrough is a multi-turn pattern; it depends on conversation-boundary semantics being settled by Phase 3 first. |
| 06-05 UI surface — streaming role transitions / general-advice badge / `/debug/costs` (deferred from v0.3 Phase 6 close) | `deep_research` tool path graduates from rare-fallback to common path, OR operator demand for cost telemetry surfaces. Role-transition stream events still emit on the deep_research code path; UI is not load-bearing on the chat-v1 default. |
| Write-back proposals from chat (agent extracts new facts → review queue in /docs) | v0.3 graph proves stable + trusted; operator demand surfaces. Live mutation is too risky before the graph itself is reliable — proposal-queue-first when we get there. |
| Obsidian vault zip import/export | Customer asks for it, or graph stabilizes enough that interop becomes a sales/migration argument. Nice-to-have, not load-bearing. |
| Visual graph view in /docs (force-directed graph visualization) | Wikilink autocomplete shipped + used; customer feedback indicates spatial overview helps. Autocomplete is what makes authoring work; the visual is eye-candy. |
| Background link inference (auto-detect entity mentions across vault, propose wikilinks) | Vault sizes grow past where manual linking scales (~100+ docs/tenant). |
| Usage-signal retrieval tuning (feedback re-ranks chunks; gap detection) | Enough feedback volume to learn from. |

## Cost Discipline (cross-cutting, applies to all v0.3 phases)

- **Sonnet 4.6 default**, no Opus default ever. Aggressive prompt caching on system prompt + tool defs + recent retrieved sections.
- Background jobs (any cross-doc scanning, classification, future link inference) run on **Haiku 4.5** — never Sonnet, never Opus.
- Per-turn target: $0.01–0.02 average; deep-research turn (rare, opt-in) capped at ~$0.10.
- Per-venue monthly target: $30–100 moderate use, ~$200 max heavy. Worst-case fits inside a $200–500/mo SaaS tier with healthy margin.

---

## Completed Milestones

<details>
<summary><strong>v0.2 Multi-Tenant WhatsApp</strong> (v0.2.0) — Closed early ~96% on 2026-04-27 · 4 phases · 12 plans (3 superseded mid-milestone) · Phase 4 partial — 04-04/05 rolled forward into v0.3</summary>

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 1 | Auth + Organizations | 3/3 (01-01, 01-02, 01-03) | Complete 2026-04-20 |
| 2 | Document Ingest UI | 2/2 (02-01, 02-02) | Complete 2026-04-20 |
| 3 | WhatsApp Integration | 03-04 + 03-05 (Infobip); 03-01/02/03 superseded (Twilio) | Complete 2026-04-21 |
| 4 | Dynamic Document Intelligence | 04-01 + 04-02 + 04-03 shipped; **04-04 + 04-05 rolled forward into v0.3** | Partial — 3/5 |

**Closure rationale:** Phases 1–3 + 04-01/02/03 fully shipped (extraction, classifier, taxonomy, procedural Checklist model). 04-04 (scheduler + WhatsApp notifications) and 04-05 (WhatsApp procedural runtime) intentionally **not shipped under v0.2** — pivoting to a knowledge-graph architecture in v0.3 means they're better delivered on top of the graph from day one, rather than rebuilt later. v0.2 marked partial-superseded; remaining theme delivery now belongs to v0.3 Phases 3 + 4.

**Carried forward into v0.3 from v0.2 deferred-items:**
- D-04-01-J HEIC image-extraction (sharp/heic-convert server-side)
- D-04-02-A through M (13 items from 04-02 classifier+taxonomy plan)
- D-04-03-* deferred items from 04-03 (probes, extraction cost-cap impl, mid-call budget, tz, version history, analytics)
- Phase 1 carry-forward UATs (AC-11 phone walk, AC-10 cross-org walk, AC-10 invitation walk, D-01-02-F email verification)

**Archive:** Full v0.2 details preserved in this file's git history; SUMMARY files remain at `.paul/phases/0[1-4]-*/[plan]-SUMMARY.md`.

</details>

<details>
<summary><strong>v0.1 POC</strong> (v0.1.0) — Completed 2026-04-19 · 5 phases · 13 plans</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 1 | Project Foundation | 2/2 | 2026-04-18 |
| 2 | Embeddings & Seeding | 2/2 | 2026-04-18 |
| 3 | Agentic Knowledge Layer | 3/3 | 2026-04-18 |
| 4 | Chat Engine | 3/3 | 2026-04-18 |
| 5 | Web Interface | 3/3 | 2026-04-19 |

**Tag:** v0.1.0
**Archive:** `.paul/milestones/0.1.0-ROADMAP.md` · **Entry:** `.paul/MILESTONES.md`

</details>

---
*Roadmap created: 2026-04-13*
*Last updated: 2026-05-03 — Phase 6 CLOSED with post-fold (f124697 chat-loop tuning + d752a0b multi-file upload + paginated library folded into 06-04 SUMMARY). Old Phase 3 (Scheduler + Graph-Aware Notifications) and old Phase 4 (Procedural Runtime) REMOVED from v0.3 — both deferred to v0.4 with explicit triggers. New Phase 3 (WhatsApp Conversational UX) added — re-thinks the WhatsApp integration around inbound conversational protocol (identity binding, venue switching, conversation boundaries) before any outbound automation. Execution order: 1 ✅ → 5 ✅ → 6 ✅ → **3 NEW (next — /paul:discuss)** → 2. PRIOR: 2026-05-01 17:25 — Plan 06-01 SHIPPED 2026-05-01. Phase 6 re-sliced from 3 → 4 plans via /paul:discuss 06-02 (CONTEXT.md at `.paul/phases/06-multi-agent-chat-overhaul/06-02-CONTEXT.md` locks D-06-02-A through E: re-research confidence threshold 0.6 + cost ceiling $0.05/turn; Critic threshold-on-reasoning at 0.7; streaming named role transitions with /debug tool-call panel opt-in; minimum-viable 12-example voice corpus 4+4+4 for lookup/reasoning/incident; depth-before-breadth re-slicing — 06-02 ships Analyser+Critic+reasoning/incident, 06-03 ships 4 new researchers, 06-04 ships UI surface + cutover gate). PRIOR: 2026-05-01 — Phase 6 resequenced to next-up via /paul:discuss 6. Pulled forward from end-of-milestone after recognising today's chat failure modes are architectural (single agent + 333-line god-prompt + sequential tool use), not patchable at the prompt layer.*
