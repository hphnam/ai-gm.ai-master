# Phase 06: Multi-Agent Chat Overhaul — Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Milestone:** v0.3 Neural Brain
**Sequencing:** Pulled forward from end-of-milestone to next-up. Executes ahead of Phase 2 (Graph), Phase 3 (Scheduler), Phase 4 (WhatsApp Runtime). No renumbering — execution order is 1 → 5 (done) → **6** → 2 → 3 → 4.

## North Star

The chat should feel **like talking to a colleague who's been running pubs for twenty years** — not a help desk, not ChatGPT-with-a-hat. It should be cut-and-dry on simple lookups, opinionated and judgement-bearing on complex situations, urgent and sequenced on incidents. It should be proactive *about the question itself* — actually reasoning about what shape of answer this person needs — not reactive (fetch keywords, return generic). Every architectural decision derives from that bar. If a decision in planning would let the chat slide back into "let me look this up… [generic shite]," it's the wrong call.

The acute pain driving this phase: today's chat (single ToolLoopAgent + 333-line god-prompt + regex tier router) hallucinates missing checklist steps, leaks meta-narration ("⚠️ I wasn't able to retrieve 3 steps"), violates its own formatting rules (section headings), and answers complex questions generically. Tactical patches (commit `90f57d2` checklist synthesis + meta-narration ban) plug symptoms; the architecture is the disease.

## Phase Boundary

**In scope:**
- Replace single ToolLoopAgent with role-based pipeline: **Triage → 5 parallel Researchers → Analyser → Writer + optional Critic**
- Slim per-role prompts (~30–50 lines each) replacing the 333-line god-prompt
- Triage-classified depth modes (`lookup | reasoning | incident`) driving pipeline shape and Writer voice
- Shaped per-domain tools replacing generic `find_knowledge` (`get_checklist`, `get_person`, `get_venue_briefing`, `search_docs`, plus existing ops + tabular tools owned by researcher specialists)
- Streaming role transitions in UI ("Triaging… Researching… Drafting…")
- "General advice" badge + inline save-CTA in UI when zero citations attached
- Per-message + per-document USD cost columns + `/debug/costs` surface
- Feature-flag cutover (`chat-v2` module behind flag, empirical quality gate before default flip)
- Retire `tier-router.ts` regex; Triage agent decides model per role per turn

**Out of scope (later phases / deferred):**
- Wikilink + DocLink + graph traversal tool — **Phase 2** (lands additively into Docs researcher's tool surface)
- Scheduler + graph-aware notifications — **Phase 3**
- WhatsApp procedural runtime — **Phase 4** (uses Phase 6 pipeline as its dialog substrate)
- Mid-turn cost ceiling enforcement — **v0.4** (trigger: first runaway turn observed)
- Background link inference — **v0.4**
- Visual graph view in `/docs` — **v0.4**
- Cross-tier model auto-tuning / learning loop — out, Triage decides explicitly per turn
- Multi-language voice calibration — out, English-UK pub vernacular only

## Key Decisions (locked during /paul:discuss)

### D-06-A — Pipeline shape: full role separation, no MVP shortcut
- **Triage** (Haiku) — classifies intent + depth, drafts research brief naming which specialists to dispatch with what queries. Structured JSON output, never user-facing prose.
- **Researchers** (Haiku, parallel) — five specialists, each owns a *shaped* tool surface (see D-06-C):
  - **Docs** — section retrieval (Phase 1) today; gains `get_related_docs` when Phase 2 graph lands
  - **Ops** — stock / cutoffs / suppliers / par
  - **People** — contacts, bios, roles, mentions
  - **Tabular** — `query_document_table` (Phase 5)
  - **Venue** — profile, layout, active flags, recent incidents — *always runs* on reasoning + incident modes (this is where "proactive" comes from at the architectural level)
- **Analyser** (Sonnet) — *the soul of the system*. Prompt frames it as "20-year GM thinking about what this person actually needs to hear" — not as a deduper. Reconciles overlapping retrievals (kills dual-checklist mixup), decides answer shape (recommendation / diagnosis / sequence / branching), can trigger one bounded re-research pass. Emits `{synthesis, citations, openQuestions, suggestedShape}`.
- **Writer** (Sonnet) — only role producing user-facing prose. Mode-aware prompt (D-06-D). No tool access — physically cannot leak retrieval state.
- **Critic** (Haiku) — optional, enabled on incident mode + reasoning above confidence threshold. Verifies specifics (numbers, names, codes, contact details) against sources before send. Bounces back to Writer with specific corrections if mismatch.
- **Rationale:** MVP shape (Triage + 1-2 researchers + Writer) was offered and rejected — full shape ships once because the user pain is the *holistic* feel, not any single failure. Half-built pipelines feel half-built.

### D-06-B — Triage classifies depth, not just intent
- **Mode taxonomy:** `lookup | reasoning | incident`
  - **lookup** — single-fact retrieval; "what's below par?", "who do I call for the ice machine?", "Bibendum cutoff?"
  - **reasoning** — multi-step judgement; "complaint about flat pint", "short staffed tonight, what to prioritise?", "should I take this group booking?"
  - **incident** — urgency + safety + compliance; "cellar's flooding", "drunk customer asking for another round", "fire alarm went off mid-service"
- **Pipeline shape varies by mode:**
  - lookup → Triage → 1 Researcher (the relevant specialist) → Writer (terse mode). Skips Analyser + Critic — overhead not earned for "what's the cutoff?"
  - reasoning → Full pipeline (Triage → 5 parallel Researchers → Analyser → Writer). Critic optional based on confidence.
  - incident → Full pipeline + Critic always on. Writer outputs sequenced/urgent.
- **Edge cases for plan-time:** "complaint about flat pint" sits on the boundary — most-of-the-time reasoning, escalates to incident if the complaint mentions allergens / illness. Plan-time decision: Triage taxonomy includes a `safety_signal: bool` field that escalates anything from reasoning → incident.
- **Rationale:** Without depth classification, the system either over-pipelines simple lookups (wasteful + slow) or under-pipelines complex ones (generic + dull). Mode is the lever.

### D-06-C — Shaped tools replace generic find_knowledge
- **`get_checklist(intent, venueId)`** — returns the **full ordered list** for the matching checklist, no top-K, no fragmentation. Eliminates today's interleaving + missing-step hallucination class structurally. Owned by Docs researcher.
- **`get_person(name | role, venueId)`** — returns bio + role + contact + mentions across docs. Owned by People researcher.
- **`get_venue_briefing(venueId)`** — returns profile + layout + active flags + recent incidents (last 24h) + upcoming cutoffs (next 4h). Always called by Venue researcher on reasoning + incident modes. **This is the structural source of "proactive."**
- **`search_docs(query, filters?)`** — preserved for genuinely open queries that don't match a verb. Returns hit list with section context (Phase 1) and — when Phase 2 lands — neighbor metadata stub (D-06-H).
- **Existing tools owned by specialists:** `get_stock_below_par`, `get_stock_by_name`, `get_supplier_by_name`, `get_upcoming_cutoffs` → Ops; `query_document_table` → Tabular.
- **`find_knowledge` deprecated**, not deleted — kept callable through chat-v1 module behind the flag for rollback safety. Removed entirely after default flip + 2 weeks soak.
- **Rationale:** Generic `find_knowledge` is the architectural root cause of fragmented answers — top-K truncation + similarity-mix across docs cannot be fixed at the prompt layer. Verbs that match user intent return correctly-shaped data by construction.

### D-06-D — Writer voice: friendly GM colleague, mode-specific
- **Voice baseline:** "like a colleague helping, not a manual barking instructions." Contractions, casual connectors ("yeah", "right", "though"), human acknowledgement on heavy turns ("yeah, this one's annoying", "you've done the hard bit"), pub vernacular where it fits ("punters", "bin it"), opinionated judgement ("first thing — check the gas, that's 80% of it") — no hedging unless we genuinely don't know.
- **Mode-specific Writer prompts** (~30 lines each):
  - **lookup** — lead with the answer, no preamble, no "here's what I found", no offers to do more. One-line tail only if there's sharp time-pressure (e.g. cutoff imminent). Friendliness = one framing word + one contraction, not a sentence of warmth.
  - **reasoning** — opinionated GM voice, branches when answer has multiple paths, decision-tree structure when applicable. Confident recommendations; acknowledge the human side on staff/HR/stress turns.
  - **incident** — sequenced + urgent. **Now / Then / Don't** structure where applicable. Closing line of empathy at end ("you've done the hard bit") — never at start, urgency stays first.
- **Calibration anchor (single source of truth, baked into Writer prompts as positive examples):** the eight redrafted examples from /paul:discuss (flat pint complaint, bartender breaks, glass washer residue, group booking, short staffed, below par lookup, ice machine contact, cellar flooding, drunk customer). Plan-time deliverable: `apps/api/src/modules/chat-v2/prompts/writer-examples.ts` — versioned, grep-greppable, the SINGLE source any Writer prompt cites.
- **Rationale:** Voice rules in prose drift; voice rules anchored to concrete positive examples don't. The examples are the contract.

### D-06-E — General-advice badge + save-CTA: UI-level, not prose
- **Trigger:** Writer outputs zero `[citation]` references (i.e. nothing came back from `find_knowledge` / shaped doc tools, answer is general-knowledge).
- **UI shape:**
  - Subtle chip above message: "General advice — no venue procedure on file"
  - Action below message: "Save this as procedure" → opens editor pre-filled with the response, one click to commit to KB
- **Background:** gap auto-records to inbox at `/knowledge` regardless of whether user clicks the CTA
- **Writer prompt forbids meta-narration entirely** — the system never says "I've flagged this for you" in prose. Provenance is structural, not written.
- **Rationale:** Source transparency matters for trust (user must distinguish venue procedure from industry standard) and for capture (user sees the gap in-context, can act on it). But "I've flagged this" is exactly the meta-narration we're banning. UI-level signal threads the needle.

### D-06-F — Cost tracking: USD-only, simplified shape
- **Schema additions** (additive, no new tables):
  - `chat_messages.costUsd Decimal? @db.Decimal(10,6)` — set at end-of-turn, sum of all paid external calls inside the turn (all role models + any Voyage embeds during retrieval)
  - `knowledge_items.ingestionCostUsd Decimal? @db.Decimal(10,6)` — set at end-of-ingest, sum of extraction (Claude vision if image) + embeddings (Voyage) + classifier (Haiku)
- **Calculation:** inline using known per-MTok rates per model + per-call rates for Voyage. Most rates already constants in `@gm-ai/types` (`VOYAGE_DOC_USD_PER_CALL=0.00006`). New constants for Anthropic per-MTok rates per tier.
- **No separate cost_event table, no token-level capture, no model-breakdown analysis.** "Where did the money go?" answerable at conversation_id / message_id / doc_id granularity — that's enough.
- **Surfaced in `/debug/costs`** (new route):
  - Per-conversation drilldown (column on each message in trace)
  - Per-org daily roll-up (sum across messages + ingestions in date range)
  - Per-doc badge in `/knowledge` list view
- **Rationale:** Operator wants visibility, not analytics. Token/model breakdown is bloat. USD on the existing IDs is enough for "where did the money go?" and rolls forward into v0.4 mid-turn ceilings cleanly.

### D-06-G — ⊘ SUPERSEDED 2026-05-01 21:05 — Feature-flag cutover replaced with direct v1 deletion

**Supersession:** User decision "bin the flag, fully migrate" overrides the original flag-based cutover with two-week soak. Phase 6 re-sliced 4→5 plans: new **06-04 (Full chat-v1 deletion)** inserted between 06-03 (breadth) and prior 06-04 (UI surface, renumbered 06-05). `Organization.chatV2Enabled` column dropped in 06-04; chat-v1 module deleted entirely; image/stream/conversation-history endpoints rebuilt on chat-v2; `whatsapp.service.ts` migrated to ChatV2Service. Quality gate (probe-eval ≥80% on 12-query harness + manual UAT ≥18/20 amazing on canary venue with flag still on) becomes a **pre-deletion checkpoint** in 06-04 instead of a pre-flip checkpoint. Rollback path is git revert; user explicitly accepts no-flag-rollback risk.

**Rationale for override:** flag-flip + two-week soak creates extended dual-maintenance burden; image/stream/history paths still on v1 means v2 never gets feature-complete unless we either rebuild on v2 or delete v1 entirely. User chose the latter.

**Original D-06-G text preserved below for traceability:**

### D-06-G [original, superseded] — Feature-flag cutover with empirical quality gate
- **Module:** `apps/api/src/modules/chat-v2/` — separate NestJS module. Old `chat/` keeps running.
- **Flag:** per-org boolean (`Organization.chatV2Enabled`) — operator-flippable per tenant for early dogfood. Default `false` until empirical gate met.
- **Quality gate before default flip:**
  - **Automated:** probe-eval (existing 6-query harness from Phase 1, extended to 12 queries spanning all three modes) hits ≥80% pass rate against chat-v2
  - **Manual:** 20-question UAT against canary venue. Operator marks each "amazing / fine / shit" — gate is **≥18 amazing, zero shit**
  - Both gates pass → flip default; v1 stays callable behind flag for 2 weeks soak; then deprecate.
- **Rollback:** flag flip; no data migration risk because chat_messages schema is additive and chat-v1 ignores `costUsd`.
- **Rationale:** Probe catches regressions, manual UAT catches the "feels generic" property the eval can't measure. Both required.

### D-06-H — Phase 2 graph-readiness: tool surface designed for additive expansion
- **Docs researcher tool surface today** (Phase 1 only): `search_docs` returns `{hits: SectionHit[], neighbors: []}` — `neighbors` field present, always empty array.
- **When Phase 2 ships:** `search_docs` populates `neighbors` from DocLink graph (depth-1 by default). New tool `get_related_docs(docId, depth=1|2)` added — same return shape.
- **Writer + Analyser prompts reference `neighbors` field today** (will be empty, no-op). When graph lands, prompts gain meaning without changing.
- **Rationale:** Phase 6 lands ahead of Phase 2; the cost of designing tool surfaces graph-shaped today is zero (one optional field). The cost of NOT doing so is rewriting Writer + Analyser prompts when Phase 2 ships. Easy choice.

## Open Plan-time Questions (not blocking discussion)

These are decision points for /paul:plan to resolve, with clear options + leans:

1. **Re-research loop bounds** — Analyser detects thin researcher returns and triggers one bounded second-pass research call. Max depth = 1 (no recursive re-research). Confidence threshold for triggering: TBD at plan-time. Cost ceiling per turn: needs concrete number.
2. **Critic enablement on reasoning mode** — incident always-on is locked. Reasoning: always-on (cost) vs. confidence-threshold (faster, cheaper, occasional misses). Lean: confidence-threshold with default 0.7.
3. **Streaming UX granularity** — three options: (a) status text only ("Researching…"), (b) named role transitions ("Researching docs and contacts…"), (c) tool-call visibility (show actual tool calls firing in expandable panel, like Claude.ai's thinking trace). Lean: (b) with (c) opt-in via `/debug` mode.
4. **Triage taxonomy edge cases** — "complaint about flat pint" boundary case → `safety_signal: bool` field on Triage output that escalates reasoning → incident. Other edge cases TBD at plan-time (compliance questions, money-handling, customer disputes).
5. **Voice calibration corpus size** — 8 examples from /paul:discuss is the seed. Plan-time deliverable: extend to ~20 examples spanning all modes + all 5 researcher domains, baked into `writer-examples.ts`. Single source of truth for prompt anchoring.
6. **Probe-eval extension** — existing 6 queries → 12+ spanning all three modes. Plan-time decides exact query set + pass criteria per mode.
7. **Cost calculation precision** — Anthropic cache_read tokens cost less than fresh input; current AI SDK 6.x exposes `inputTokenDetails.cacheReadTokens` (per Phase 1 W24 evidence). Plan-time: write `calculateAnthropicUsd(usage, model)` helper with full cache-aware math. New constants for Sonnet 4.6 / Haiku 4.5 / Opus per-MTok rates.

## Success Criteria

How we know Phase 6 succeeded — operator-observable, not implementation-checkbox:

- **Today's failure modes are structurally impossible**, not just papered over:
  - Dual-checklist interleaving: cannot recur because `get_checklist` returns one full list, not chunks to recombine
  - Missing-step hallucination: cannot recur because Writer never sees a fragmented checklist
  - Meta-narration leaks: cannot recur because Writer has no tool access
  - Section-heading violations: cannot recur because Writer prompts are mode-specific and short enough to actually follow
- **The flat-pint test:** "someone's complaining about a flat pint, what do I do?" returns the redrafted reasoning-mode example (or substantively similar) with branching on single-vs-pattern, opinionated voice, no meta-narration. **This is the canary query.**
- **The lookup test:** "what's below par?" returns one-line answer + cutoff nudge. No preamble, no offer-to-do-more.
- **The incident test:** "cellar's flooding" returns Now/Then/Don't sequence within ≤2s of first token, Critic-verified specifics (phone numbers, contact names match docs).
- **Cost visibility:** `/debug/costs` answers "what did this conversation cost?" and "what did ingesting this doc cost?" with no token-counting required.
- **Quality gate cleared:** probe-eval ≥80% (12-query) + manual UAT ≥18/20 amazing on canary venue.
- **Phase 2 lands additively:** when graph ships, Writer + Analyser prompts gain `neighbors` semantics without prompt-line changes.

## Non-goals

- Solving every edge case in v1 — re-research, Critic threshold tuning, streaming richness can iterate post-flip
- Multi-language support — English-UK pub voice only
- Mobile-specific UX — web `/chat` is the surface; WhatsApp procedural runtime (Phase 4) is its own surface
- Self-improvement / learning loops — Triage decisions are explicit per turn, not learned
- A/B testing infrastructure — flag is binary per-org, not split-traffic

---

*Created: 2026-05-01 via /paul:discuss 6*
*Next: /paul:plan 06-01 (or split into multiple plans during planning if scope demands)*
