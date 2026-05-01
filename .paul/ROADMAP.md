# Roadmap: GM AI

## Overview

Build the AI/API layer for a multi-venue hospitality operations assistant. v0.1 POC is complete — the system can answer stock, SOP, equipment, and contact queries via semantic retrieval over seeded data with a Next.js chat UI and a read-only debug panel. v0.2 took that loop from dev-only → production: real users, real orgs with role-based membership, manager-uploaded documents, phone-number-to-account linking, WhatsApp via Infobip, and dynamic document intelligence (classifier + per-tenant taxonomy + procedural Checklist entity). v0.2 closed early at ~96% — Phase 4 plans 04-04 (scheduler + WhatsApp notifications) and 04-05 (WhatsApp procedural runtime) deliberately rolled forward into v0.3 so they ship on top of the new graph layer from day one.

## Current Milestone

**v0.3 Neural Brain** (v0.3.0)
Status: 🚧 In Progress (2 of 6 phases complete — Phase 1 Hierarchical Retrieval + Phase 5 Tabular Query Path closed 2026-04-28)
Phases: 6

**Theme:** "Per-venue neural brain — the assistant doesn't search docs, it knows the venue. Connections between docs are first-class data, and the WhatsApp channel speaks fluent venue-context."

**Vision:** Pivot from flat RAG to a per-tenant **Obsidian-style knowledge graph**. Every doc is a node, every `[[wikilink]]` is a synapse, the agent walks associations the way a real GM does. Builds on the Phase 4 foundation (DocumentType taxonomy, Checklist entity, broadened extraction) and absorbs the unshipped 04-04/05 scope so notifications + procedural walkthroughs are graph-aware from launch.

### Phase Overview

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Hierarchical Retrieval | 3/3 (01-01 schema+ingest, 01-02 backfill+retrieval, 01-03 cache+section-payload+probe-eval) | ✅ Complete | 2026-04-28 |
| 5 | Tabular Query Path | 1/1 (05-01 schema+ingest+query+tool+probe) | ✅ Complete | 2026-04-28 |
| 6 | Multi-Agent Chat Overhaul | 4 | 🟡 In progress (06-01 SHIPPED 2026-05-01; 06-02 in planning) | 06-01 ✅ |
| 2 | Graph Layer | TBD | Queued (after Phase 6) | - |
| 3 | Scheduler + Graph-Aware WhatsApp Notifications | TBD | Queued (after Phase 2) | - |
| 4 | WhatsApp Procedural Runtime | TBD | Queued (after Phase 3) | - |

**Execution order (resequenced 2026-05-01):** 1 ✅ → 5 ✅ → **6 (next)** → 2 → 3 → 4. Phase 6 pulled forward from end-of-milestone after /paul:discuss surfaced that today's chat failure modes (dual-checklist interleaving, hallucinated steps, meta-narration leakage, generic voice on complex queries) are architectural and need the role-based pipeline to fix structurally — not patchable at the prompt layer. Phases 2/3/4 land additively into the new pipeline (graph traversal as a new Docs-researcher tool; scheduler reuses Researcher pattern; procedural runtime uses chat-v2 as its dialog substrate). No renumbering — phase numbers stay stable, only execution sequence changed. CONTEXT.md decisions D-06-A through D-06-H locked at `.paul/phases/06-multi-agent-chat-overhaul/CONTEXT.md`.

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

### Phase 3: Scheduler + Graph-Aware WhatsApp Notifications

**Focus:** Absorbed from v0.2's unshipped 04-04. Cron-ish firing layer over `Checklist.schedule` cadence + `@@unique([checklistId, instanceKey])` dedup surface (already shipped in 04-03). Outbound via the existing Infobip WhatsApp adapter. **Notifications are graph-aware** — a delivery reminder can pull adjacent context (related supplier docs, recent issues with this vendor) without a separate retrieval call.

**Scope (pre-discuss sketch):**
- Scheduler service consuming `Checklist.schedule` + dedup on `@@unique([checklistId, instanceKey])`
- Notification composer that walks the graph from the firing checklist (1-hop neighbors) to enrich the WhatsApp message with relevant adjacent context
- Outbound via existing Infobip adapter (no new provider work)
- Idempotency on retries (notification fired exactly once per `instanceKey`)
- Operator visibility: scheduled-fire log + delivery audit
- Probe assertions covering schedule firing, dedup, graph-context enrichment, and Infobip outbound

**Plans:** TBD (defined during /paul:plan)

### Phase 4: WhatsApp Procedural Runtime

**Focus:** Absorbed from v0.2's unshipped 04-05. Closes the original v0.2 milestone theme — staff can run procedural docs (opening checklist, closing routine, weekly stocktake) interactively over WhatsApp with completion tracking. **Walkthrough mode** steps users through Checklist entities; **ad-hoc mode** answers spontaneous questions; **completion** persists across sessions. All retrieval flows through the graph layer from Phase 2.

**Scope (pre-discuss sketch):**
- Walkthrough flow: present step → wait for user reply → record completion → next step; resumable across WhatsApp turns
- Ad-hoc retrieval interleaved with walkthroughs (user can ask a side question mid-checklist, then resume)
- Completion persistence on `ChecklistInstance` + per-step completion state
- WhatsApp UX: numbered steps, clear progress indicators, graceful re-prompt on ambiguous reply
- Operator dashboard surface (read-only): which checklists ran today, which are stuck, which completed
- Probe assertions covering walkthrough state machine, mid-flow ad-hoc retrieval, completion persistence, and re-prompt behavior

**Plans:** TBD (defined during /paul:plan)

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

**Plans (re-sliced 2026-05-01 from 3 → 4 during /paul:discuss 06-02):**
- **06-01 ✅ SHIPPED 2026-05-01** — pipeline skeleton + Triage + Docs researcher + Writer-lookup + cost capture infra (vertical slice for lookup mode behind default-off per-org feature flag). 9/9 ACs PASS, 74/74 probe assertions across 2 idempotent runs. SUMMARY: `.paul/phases/06-multi-agent-chat-overhaul/06-01-SUMMARY.md`.
- **06-02** — Pipeline depth: Analyser + Critic + reasoning/incident Writer modes + Triage prompt expansion + voice corpus to 12 (4 lookup unchanged + 4 reasoning + 4 incident). Locks decisions D-06-02-A through E during /paul:discuss 06-02 (re-research bounds 0.6 confidence + $0.05/turn cost ceiling; Critic threshold-on-reasoning at 0.7; named role transitions for streaming with /debug tool-call panel; minimum-viable voice corpus). CONTEXT: `.paul/phases/06-multi-agent-chat-overhaul/06-02-CONTEXT.md`.
- **06-03** — Pipeline breadth: 4 new researchers (Ops + People + Tabular + Venue) with shaped tools (`get_person`, `get_venue_briefing`, existing ops/tabular tools wrapped). Triage prompt dispatches per-mode researchers.
- **06-04** — UI surface + cutover gate: streaming role transitions consumed by frontend, general-advice badge + save-CTA, `/debug/costs` route, flag-flip admin endpoint, cutover gate (probe-eval ≥80% + manual UAT ≥18/20 amazing on canary venue), v1 deprecation 2-week soak.

**Re-slicing rationale:** original 3-plan structure had 06-02 as a mega-plan covering Analyser + Critic + reasoning/incident + 4 researchers — 8+ tasks risking context overflow during APPLY. New 4-plan structure ships **depth before breadth**: the 3-mode Writer + Analyser + Critic stack is more architecturally novel than the 4 researchers (which are mostly tool-wrapping over services that already exist — TabularQueryService from Phase 5, contact/venue data from Phase 1). Risk concentrated in 06-02 means earlier empirical validation of the hard part. If the Analyser → Writer reasoning pipeline produces flat output, we discover that with the Docs researcher alone before we've invested 4 more researcher builds.

---

## Explicitly Deferred to v0.4 (with triggers)

These came up during v0.3 discussion and have specific revisit conditions, not abandonment:

| Item | Trigger |
|------|---------|
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
*Last updated: 2026-05-01 17:25 — Plan 06-01 SHIPPED 2026-05-01. Phase 6 re-sliced from 3 → 4 plans via /paul:discuss 06-02 (CONTEXT.md at `.paul/phases/06-multi-agent-chat-overhaul/06-02-CONTEXT.md` locks D-06-02-A through E: re-research confidence threshold 0.6 + cost ceiling $0.05/turn; Critic threshold-on-reasoning at 0.7; streaming named role transitions with /debug tool-call panel opt-in; minimum-viable 12-example voice corpus 4+4+4 for lookup/reasoning/incident; depth-before-breadth re-slicing — 06-02 ships Analyser+Critic+reasoning/incident, 06-03 ships 4 new researchers, 06-04 ships UI surface + cutover gate). PRIOR: 2026-05-01 — Phase 6 resequenced to next-up via /paul:discuss 6. Pulled forward from end-of-milestone after recognising today's chat failure modes are architectural (single agent + 333-line god-prompt + sequential tool use), not patchable at the prompt layer. New execution order: 1 ✅ → 5 ✅ → **6** → 2 → 3 → 4. Phase numbers preserved; only sequence changed. CONTEXT.md locked at `.paul/phases/06-multi-agent-chat-overhaul/CONTEXT.md` with 8 decisions D-06-A through D-06-H covering pipeline shape, mode-classified Triage, shaped tools (`get_checklist` returns full ordered list — eliminates today's interleaving + missing-step class structurally), friendly-GM Writer voice with mode-specific prompts + 8-example calibration anchor, UI-level "general advice" badge + save-CTA (no prose meta-narration), simplified USD-only cost tracking on `chat_messages.costUsd` + `knowledge_items.ingestionCostUsd`, feature-flag cutover with empirical quality gate (probe-eval ≥80% + manual UAT ≥18/20 amazing), and Phase 2 graph-readiness via additive `neighbors` field on `search_docs`.*
