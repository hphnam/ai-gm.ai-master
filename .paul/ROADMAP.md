# Roadmap: GM AI

## Overview

Build the AI/API layer for a multi-venue hospitality operations assistant. v0.1 POC is complete — the system can answer stock, SOP, equipment, and contact queries via semantic retrieval over seeded data with a Next.js chat UI and a read-only debug panel. v0.2 took that loop from dev-only → production: real users, real orgs with role-based membership, manager-uploaded documents, phone-number-to-account linking, WhatsApp via Infobip, and dynamic document intelligence (classifier + per-tenant taxonomy + procedural Checklist entity). v0.2 closed early at ~96% — Phase 4 plans 04-04 (scheduler + WhatsApp notifications) and 04-05 (WhatsApp procedural runtime) deliberately rolled forward into v0.3 so they ship on top of the new graph layer from day one.

## Current Milestone

**v0.3 Neural Brain** (v0.3.0)
Status: 🚧 In Progress (1 of 4 phases complete — Phase 1 Hierarchical Retrieval closed 2026-04-28)
Phases: 4

**Theme:** "Per-venue neural brain — the assistant doesn't search docs, it knows the venue. Connections between docs are first-class data, and the WhatsApp channel speaks fluent venue-context."

**Vision:** Pivot from flat RAG to a per-tenant **Obsidian-style knowledge graph**. Every doc is a node, every `[[wikilink]]` is a synapse, the agent walks associations the way a real GM does. Builds on the Phase 4 foundation (DocumentType taxonomy, Checklist entity, broadened extraction) and absorbs the unshipped 04-04/05 scope so notifications + procedural walkthroughs are graph-aware from launch.

### Phase Overview

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Hierarchical Retrieval | 3/3 (01-01 schema+ingest, 01-02 backfill+retrieval, 01-03 cache+section-payload+probe-eval) | ✅ Complete | 2026-04-28 |
| 2 | Graph Layer | TBD | 🔵 Ready to plan | - |
| 3 | Scheduler + Graph-Aware WhatsApp Notifications | TBD | Not started | - |
| 4 | WhatsApp Procedural Runtime | TBD | Not started | - |

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
*Last updated: 2026-04-28 — v0.3 Phase 1 (Hierarchical Retrieval) CLOSED at 3/3 plans; Phase 2 (Graph Layer) ready to plan. CONTEXT.md decisions D-01-A through D-01-E all shipped end-to-end.*
