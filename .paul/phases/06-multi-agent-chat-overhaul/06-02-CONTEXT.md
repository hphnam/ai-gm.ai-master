# Plan 06-02: Pipeline Depth — Analyser + Critic + reasoning/incident modes

**Discussion completed:** 2026-05-01
**Status:** Ready for /paul:plan 06-02
**Builds on:** Plan 06-01 (vertical slice for lookup mode shipped behind feature flag)
**Phase position:** 2 of 4 (re-sliced from original 3 — see ROADMAP.md update note below)

────────────────────────────────────────

## Why this plan exists (not just what)

06-01 proved the role-based pipeline shape works for lookup mode against stub-mode probes. The architectural failure modes that caused the original "feels really shit, just locked in" experience — interleaved checklists, meta-narration leaks, generic responses — are structurally impossible for lookup queries today.

But the user's pain wasn't lookups. The dual-checklist hallucination triggered on "how do I open up?" — a procedural lookup the simple pipeline catches. The deeper pain was reasoning mode: "complaint about flat pint, what do I do?" returning generic-shite when an actual GM would diagnose, branch, prioritise, and instruct in opinionated voice.

**06-02 ships the depth that makes reasoning mode and incident mode possible:** the Analyser stage (the soul of the system per CONTEXT.md D-06-A) reconciles overlapping retrievals + decides answer shape; the Critic stage verifies specifics on high-stakes turns; the reasoning + incident Writer prompts produce mode-shaped output instead of one-size-fits-all prose.

What 06-02 deliberately does NOT ship: the 4 new researchers (Ops/People/Tabular/Venue) — those are 06-03. The reasoning here is depth-before-breadth: the 3-mode Writer + Analyser + Critic stack is more architecturally novel than the researchers, which are mostly tool-wrapping over services that already exist (TabularQueryService from Phase 5; venue/contact data from Phase 1). Risk concentrated in 06-02 means earlier empirical validation of the hard part. If the Analyser → Writer reasoning pipeline produces flat output, we discover that with the Docs researcher alone before we've invested 4 more researcher-builds.

────────────────────────────────────────

## Locked Decisions (from /paul:discuss 06-02 conversation)

### D-06-02-A — Re-research loop bounds: confidence 0.6 / cost ceiling $0.05/turn

Analyser self-rates "evidence sufficiency" 0–1 on its synthesis output. Below 0.6 → triggers ONE bounded second-pass research call (max depth 1, no recursion). Above 0.6 → ships answer as-is. Cost circuit-breaker: if running turn cost ≥ $0.05 BEFORE re-research dispatch, skip the second pass and ship best-effort with low-confidence response indicator (UI surfaces this in 06-04 — for 06-02 the indicator is logged + structurally present in response shape).

**Rationale:**
- 0.7 threshold under-triggers when Analyser is overconfident (which it can be on thin retrievals that "look complete")
- 0.5 burns doubles on borderline cases that don't materially benefit
- 0.6 = "fire only when meaningfully unsure" — middle ground, retunable via one constant after first month of production data
- $0.05 ceiling: project's stated $0.01–0.02/turn target. At $0.05 we've already 2–3x the budget on first pass; second pass would push to 5x. Better best-effort + low-confidence flag than runaway burn

**One concrete number for 06-02 plan-time:** new constant `ANALYSER_RERESEARCH_CONFIDENCE_THRESHOLD = 0.6` and `RERESEARCH_COST_CEILING_USD = 0.05` in `apps/api/src/types/chat-v2.ts`.

### D-06-02-B — Critic on reasoning mode: confidence-threshold at 0.7 (not always-on)

Incident mode: Critic always-on (locked from CONTEXT.md, unchanged).
Reasoning mode: Critic fires only when Analyser confidence < 0.7. Above 0.7 → skip Critic, ship Writer output directly.

**Rationale:**
- Always-on adds $0.005–0.01/turn (25–50% over the $0.01–0.02 target) and +600ms latency to EVERY reasoning turn
- Critic's value is concentrated in incident mode where numeric/contact mismatches have safety implications (wrong phone number on cellar flooding, wrong allergen info)
- Reasoning mode errors are mostly voice/shape (which Critic doesn't fix), not numeric/contact (which Critic does fix)
- 0.7 threshold = catch the borderline cases where Analyser is unsure; trust Analyser's high-confidence calls
- Always-on is one constant flip away if production reveals frequent specifics-mismatches in high-confidence reasoning turns. D-06-02-G registers the trigger.

**One concrete number:** new constant `CRITIC_REASONING_CONFIDENCE_THRESHOLD = 0.7` in types/chat-v2.ts.

### D-06-02-C — Streaming UX granularity: named role transitions, /debug opt-in for tool-call visibility

Default UX: named role transitions surfaced as text deltas during the stream. Examples:
- "Triaging…" (Triage running, ~150ms)
- "Researching docs and contacts…" (researchers in flight, ~600ms)
- "Drafting your answer…" (Writer running, ~2s)

`/debug` mode (operator opt-in via URL param or settings flag — TBD plan-time): expandable panel showing actual tool calls firing, like Claude.ai's thinking trace.

**Rationale:**
- (a) flat status text doesn't communicate the architectural value
- (c) always-on tool-call visibility feels noisy for casual users; colleagues don't narrate internals step-by-step
- (b) surfaces the breadth ("docs and contacts") without taxing the default UX
- /debug serves operators investigating quality issues without polluting staff-facing chat

**06-02 scope:** Backend emits structured stream events `{phase: 'triage' | 'research' | 'draft', researchersRunning?: ResearcherName[]}` — frontend consumption is 06-04 scope. New constant `STREAM_PHASE_EVENTS` enum in types/chat-v2.ts so backend + frontend agree on the contract.

### D-06-02-D — Voice corpus extension: minimum viable per mode (4+4+4=12 in 06-02)

06-02 extends `writer-examples.ts`:
- LOOKUP_EXAMPLES: 4 (unchanged from 06-01)
- REASONING_EXAMPLES: 4 NEW
- INCIDENT_EXAMPLES: 4 NEW

The 8 new examples are sourced from the original /paul:discuss 6 redrafts already cited in the phase-level CONTEXT.md (flat pint complaint, bartender breaks, glass washer residue, group booking, short staffed, cellar flooding, drunk customer — verbatim). Plus one or two additions if the user wants to dictate during APPLY.

**Rationale:**
- Pipeline shipping voice-less fails its own success criteria (the "feels generic" canary failure mode)
- Going 4 → 20 in one plan requires authoring 16 new examples — risks cargo-culting "more examples = better" without empirical signal
- 4 per mode is plenty for prompt anchoring (single-shot prompting patterns work with 3–5 high-quality examples)
- Real production usage in 06-04's cutover-gate UAT cycle will surface which SHAPES need more anchors
- Distributes writing labor across plans

**One concrete deliverable:** writer-examples.ts grows from ~25 lines to ~75 lines, with REASONING_EXAMPLES + INCIDENT_EXAMPLES populated. Existing import discipline (audit-S9) preserved — Writer prompts still cite via TS import, never inline copy. New mode-specific Writer prompts (`writer-reasoning.prompt.ts`, `writer-incident.prompt.ts`) follow the lookup prompt structure (slim, bake examples via `.map(...).join('\n')`).

### D-06-02-E — Phase 6 re-sliced from 3 → 4 plans

Original Phase 6 plan structure (per ROADMAP.md):
- 06-01: pipeline skeleton + Triage + Docs researcher + Writer (lookup mode) + cost capture
- 06-02: full researcher fan-out + Analyser + Critic + reasoning/incident modes
- 06-03: UI surface + cutover gate

NEW Phase 6 plan structure (locked 2026-05-01):
- 06-01: SHIPPED (unchanged)
- **06-02: Analyser + Critic + reasoning/incident modes + voice corpus expansion (12) + Triage prompt expansion** ← THIS PLAN
- **06-03: 4 new researchers (Ops/People/Tabular/Venue) + their shaped tools** (NEW positioning — was bundled into old 06-02)
- **06-04: UI streaming + general-advice badge + /debug/costs + flag-flip admin endpoint + cutover gate** (was 06-03)

**Rationale:**
- Original 06-02 mega-plan was 8+ tasks risking context overflow during APPLY
- Depth (Analyser + Critic + 3 modes) is the architecturally novel work; risk-concentrate it earlier
- Breadth (4 researchers) is mostly tool-wrapping over existing services (TabularQueryService from Phase 5, contact/venue data from Phase 1) — lower architectural risk, higher implementation labor
- Splitting depth from breadth means we discover Analyser/Writer voice issues with the Docs researcher alone, before investing 4 more researcher builds

**Action item:** ROADMAP.md updated alongside this CONTEXT to reflect 4-plan structure. Phase total task count shifts; phase commit still happens after 06-04.

────────────────────────────────────────

## What 06-02 ships (concrete scope)

### New stages in the orchestrator
- **Analyser service** — Sonnet 4.6, takes ResearcherFinding[] + userMessage + Triage output, emits `{synthesis, citations, openQuestions, suggestedShape, evidenceSufficiency: number}`. Decides: ship as-is (sufficiency ≥ 0.6) | trigger one re-research pass (< 0.6 AND turnCost < $0.05) | ship low-confidence (< 0.6 AND turnCost ≥ $0.05).
- **Critic service** — Haiku 4.5, takes Writer's draft text + citations + `{requireSpecificsCheck: boolean}`. Returns `{verdict: 'approved' | 'corrections-needed', corrections?: string[]}`. Bounces back to Writer with specific corrections if mismatch. Always-on for incident; threshold-on for reasoning.
- **Reasoning Writer prompt** — opinionated GM voice, branches on multi-path answers, decision-tree structure when applicable, confidence + judgement language, acknowledges human side on staff/HR/stress turns
- **Incident Writer prompt** — sequenced + urgent. Now / Then / Don't structure. Closing line of empathy at end (never at start, urgency stays first). 999-call directive for the safety-signal class

### Orchestrator changes
- 06-01's chat-v2.service.sendMessage gains the Analyser → Critic loop. Mode dispatch:
  - `lookup` → existing path (Triage → Docs researcher → Writer-lookup), no Analyser
  - `reasoning` → Triage → [Docs researcher] → Analyser → Writer-reasoning → Critic-conditional
  - `incident` → Triage → [Docs researcher] → Analyser → Writer-incident → Critic-always
- Cost tracker extends to record Analyser + Critic spend (new accumulators)
- Re-research loop respects confidence threshold + cost ceiling

### Triage prompt expansion
- 06-01's prompt classifies mode but only dispatches `['docs']`. 06-02 expands the prompt to genuinely route on mode:
  - lookup → `['docs']` (unchanged)
  - reasoning → `['docs']` (still — 06-03 wires the other 4)
  - incident → `['docs']` (still — 06-03 wires venue/safety researchers)
- Even though dispatch lists are identical for now, the brief content per mode differs (reasoning briefs ask for cause/option analysis; incident briefs ask for safety-relevant procedure + escalation paths)
- Also: Triage decides `criticForReasoning` boolean based on safety-signal proximity for reasoning-mode turns (boundary case escalation)

### Voice corpus (writer-examples.ts)
- 4 LOOKUP_EXAMPLES (unchanged)
- 4 REASONING_EXAMPLES (NEW — flat pint complaint, short staffed, group booking, glass washer residue OR similar)
- 4 INCIDENT_EXAMPLES (NEW — cellar flooding, drunk customer, allergen complaint, fire alarm OR similar)

### probe-chat-v2 extension
- New assertions for reasoning mode shape (no preamble, has decision-tree structure for branching turns, opinionated voice via positive-phrase regex)
- New assertions for incident mode shape (Now/Then/Don't structure, urgency-first, empathy-closing)
- New assertions for Analyser confidence threshold + re-research triggering (stub-injected confidence value, assert second-pass dispatch)
- New assertions for Critic threshold gating (synthetic Analyser confidence above/below 0.7, assert Critic dispatch decision)
- Cost capture extended: Analyser + Critic spend appears in CostBreakdown
- Real-Anthropic probe variant (PROBE_CHAT_V2_REAL=1) becomes meaningfully testable in 06-02 — manual checkpoint, not CI

### Constants additions to types/chat-v2.ts
- `ANALYSER_RERESEARCH_CONFIDENCE_THRESHOLD = 0.6`
- `RERESEARCH_COST_CEILING_USD = 0.05`
- `CRITIC_REASONING_CONFIDENCE_THRESHOLD = 0.7`
- `STREAM_PHASE_EVENTS` enum (`'triage' | 'research' | 'analyse' | 'draft' | 'critique' | 'complete'`)
- `ANALYSER_TIMEOUT_MS = 15_000` (Analyser is Sonnet — same budget as Researcher)
- `CRITIC_TIMEOUT_MS = 8_000` (Critic is Haiku — quick verification, tighter budget)

### CostBreakdown extension
- Current: `{triage, researchers, writer, voyage, total}`
- 06-02: `{triage, researchers, analyser, writer, critic, voyage, total}` — additive, preserves 06-01 sum semantics

────────────────────────────────────────

## What 06-02 deliberately does NOT ship

- **4 new researchers (Ops/People/Tabular/Venue)** — 06-03 scope. Triage prompt names docs only as available even for reasoning/incident.
- **UI surface changes** — 06-04 scope. Stream phase events are emitted backend-side; frontend consumption + named role transitions display + general-advice badge + /debug toggle + /debug/costs page all 06-04.
- **Critic always-on for reasoning** — locked threshold-only per D-06-02-B. Always-on is post-flip retune (D-06-02-G).
- **20-example voice corpus** — locked 12 per D-06-02-D. Extension post-flip.
- **Re-research recursion (depth > 1)** — explicitly bounded depth = 1 per CONTEXT.md D-06-A.
- **Mid-turn cost ceiling enforcement** — circuit-breaker is per-stage skip, not abort. Hard ceiling enforcement is v0.4 deferred (D-06-E carry-forward).
- **Probe-eval extension** — 06-04 scope as part of cutover gate.
- **Real-Anthropic probe in CI** — manual pre-release checkpoint only (audit-M6 from 06-01 unchanged).

────────────────────────────────────────

## Open Plan-time Questions for /paul:plan to resolve

These are 06-02-specific gray areas the plan author needs to decide:

1. **Analyser self-rating mechanics** — does Analyser emit `evidenceSufficiency` as a structured-output field (Zod-enforced 0–1), or does the orchestrator infer it from researcher hit counts + citation density? Lean: structured output, give the LLM the explicit signal.
2. **Critic correction loop bounds** — when Critic returns `corrections-needed`, does Writer get one rewrite chance (max 1 retry) or two? Lean: 1 retry, then ship Writer's second attempt regardless of Critic's verdict (avoid infinite loops).
3. **Re-research dispatch** — does the second-pass research call use a refined brief (Analyser-authored "based on first pass, look for X") or just re-run the original brief? Lean: Analyser authors a refined brief — that's the entire point of having an Analyser, otherwise it's just retry.
4. **Reasoning-mode Triage prompt branching** — does the prompt give Triage examples of edge cases (flat pint complaint with allergen mention → escalate to incident)? Lean: yes, 2-3 boundary examples in the prompt.
5. **Stub mode for Analyser + Critic in probes** — same env-var pattern as 06-01 (PROBE_CHAT_V2_STUB=1)? Lean: yes, deterministic stubs keyed by mode + finding-summary substring.
6. **Voice example sourcing** — 8 new examples authored by Claude best-judgment vs hand-curated by user? Lean: Claude drafts based on /paul:discuss redrafts; user reviews + edits during plan-creation if desired.

────────────────────────────────────────

## Success Criteria

How we know 06-02 succeeded — operator-observable, not implementation-checkbox:

- **Reasoning-mode answer shape distinct from lookup-mode.** "Complaint about flat pint, what do I do?" returns multi-step opinionated diagnosis with branches (single-vs-pattern) + opinionated voice + no meta-narration. Distinguishable from "what's below par?" (terse + cutoff nudge).
- **Incident-mode urgency-first.** "Cellar's flooding" returns Now/Then/Don't sequence within ≤2s of first token, Critic-verified specifics (phone numbers, contact names match docs), empathy line at the END.
- **Re-research triggers measurably.** Stub-injected low-confidence Analyser output triggers second-pass dispatch; cost ceiling correctly skips second pass when first-pass burn is already high.
- **Critic catches synthetic specifics-mismatch.** Stub-injected wrong phone number in Writer output → Critic returns corrections-needed → Writer rewrites with correct number.
- **probe-chat-v2 extends green.** All 06-01 assertions still pass; new reasoning + incident + Analyser + Critic assertions all pass; idempotent across 2 runs.
- **Cost capture covers all 5 stages.** chat_messages.costUsd > 0 for reasoning + incident turns; CostBreakdown shows nonzero analyser + critic on appropriate paths.
- **Voice corpus locked at 12.** writer-examples.ts has 4+4+4 = 12 examples, all imported (audit-S9), Writer prompts cite by mode.
- **Phase 6 cutover gate (06-04) is unblocked.** Pipeline depth complete = backend-ready for cutover-gate UAT once 06-03 wires researcher breadth.

────────────────────────────────────────

## Risk register

| Risk | Mitigation |
|------|------------|
| Analyser produces inconsistent confidence ratings (uncalibrated) | Structured output + Zod schema bounds 0-1; first-month telemetry collects distribution; threshold retunable via constant. Documented in plan as "review first month of analyser.confidence values, retune if heavy clustering at one end." |
| Writer-reasoning prompt produces flat output despite examples | Voice corpus is the load-bearing prompt anchor. Probe assertions check positive-phrase regex (opinionated language present) AND negative regex (preamble/meta absent). UAT in 06-04 catches subtler voice failures. |
| Critic correction loop infinite-loops | Hard cap: max 1 Writer retry. After that, ship Writer's second attempt verbatim regardless of Critic verdict. Logged as `critic.unresolved` warn for operator review. |
| Re-research dispatches when first pass was actually fine | Confidence threshold tuning. Plan registers D-06-02-G trigger: "first month of production data shows re-research dispatch rate > 20% on lookup-shaped queries → tighten threshold to 0.5." |
| Latency budget breach (real-Anthropic) | AC carries the budget forward: reasoning + incident must be < 8s p95 real-mode (relaxed from lookup's 5s — extra Analyser + optional Critic stages). Plan registers D-06-02-H trigger for `mode-fast` escalation if breached. |
| Voice corpus drift between 06-02 (12) and 06-04 (post-cutover extension) | Hard contract in writer-examples.ts: each example carries `mode` field + `addedInPlan` field. 06-04's UAT-driven extensions are atomic commits separate from Writer prompt edits (audit-S9 carry-forward). |

────────────────────────────────────────

## Carry-forward dependencies from 06-01

Plan 06-02 depends on these 06-01 artifacts being stable + unchanged:
- `apps/api/src/types/chat-v2.ts` — TriageOutputSchema (.strict()), ResearcherName + ChatMode enums, RoleTimeoutError, all timeout constants
- `apps/api/src/modules/chat-v2/triage.service.ts` — Triage Service signature (only the prompt content changes, not the API)
- `apps/api/src/modules/chat-v2/cost-tracker.service.ts` — CostTracker class (extend with recordAnalyser + recordCritic methods)
- `apps/api/src/modules/chat-v2/log-helpers.ts` — chatV2Logger PII discipline (06-02 logs go through it, no exceptions)
- `apps/api/src/modules/chat-v2/input-sanitizer.ts` — sanitizeForTriage (unchanged)
- `apps/api/src/types/cost.ts` — calculateAnthropicUsd cache-aware helper, rate cards (no changes; Analyser is Sonnet, Critic is Haiku — both already covered)
- `apps/api/src/modules/chat-v2/researchers/docs.researcher.ts` — Docs researcher signature stable (06-02 doesn't touch Docs; 06-03 adds the other 4)
- `apps/api/scripts/probe-chat-v2.ts` — extended with new assertions, but existing V1-V19 assertions unchanged

Boundary discipline carry-forward:
- M1 cross-tenant boundary (orgId positional, never from body)
- M2 partial-failure cost persistence (turn-failed rows for ALL stages, including Analyser + Critic failures)
- M3 per-role hard timeouts (06-02 adds ANALYSER_TIMEOUT_MS + CRITIC_TIMEOUT_MS)
- M4 Triage input sanitization (unchanged)
- M5 single-source PII redaction (chatV2Logger)
- AC-7 Writer structurally tool-less (unchanged)
- audit-S9 writer-examples import discipline (extended additively)

────────────────────────────────────────

## Pre-registered deferred items for 06-02 SUMMARY

These will be registered in 06-02-SUMMARY.md when UNIFY runs, with concrete triggers:

- **D-06-02-G** — Critic always-on for reasoning mode | Trigger: production-data shows specifics-mismatch rate > 5% on high-confidence (>0.7) reasoning turns
- **D-06-02-H** — `mode-fast` escalation for reasoning + incident (skip Analyser on shape-clear queries) | Trigger: first real-Anthropic latency budget breach (p95 > 8s)
- **D-06-02-I** — Voice corpus extension to 20 examples | Trigger: 06-04 UAT cycle surfaces ≥3 distinct shape-mismatch failures across modes
- **D-06-02-J** — Re-research depth > 1 (recursive) | Trigger: production-data shows ≥10% of triggered re-research returns are themselves low-confidence (< 0.6)
- **D-06-02-K** — Critic correction loop max retries > 1 | Trigger: production-data shows ≥5% of Writer retries STILL get corrections-needed verdict from Critic
- **D-06-02-L** — Stream-event consumption by frontend | Trigger: 06-04 plan
- **D-06-02-M** — Analyser confidence threshold retune from 0.6 | Trigger: first month of production telemetry shows heavy clustering at one end of the distribution

────────────────────────────────────────

*Created: 2026-05-01 via /paul:discuss 06-02*
*Next: /paul:plan 06-02 (consume this CONTEXT.md + locked decisions)*
