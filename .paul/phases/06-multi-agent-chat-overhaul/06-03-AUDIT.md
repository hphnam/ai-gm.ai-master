# Enterprise Plan Audit Report

**Plan:** `.paul/phases/06-multi-agent-chat-overhaul/06-03-PLAN.md`
**Audited:** 2026-05-01 21:30
**Verdict:** Conditionally acceptable pre-fix → enterprise-ready post-fix

---

## 1. Executive Verdict

**Conditionally acceptable** as written; **enterprise-ready** after the 6 must-have + 11 strongly-recommended findings auto-applied below. The plan correctly identifies the architectural shape (parallel fan-out, per-mode dispatch, Venue always-on) and inherits strong patterns from 06-01/06-02 audits (cross-tenant boundaries, partial-failure cost rows, PII-safe logging, deterministic stubs). The pre-fix gaps were narrow but real — concentrated around (a) a new prompt-injection vector at the researcher boundary that 06-02's sanitization didn't cover, (b) type-system happy-accident in the new orchestrator dispatch table, (c) clock non-determinism in stub-mode time-anchored data, (d) the V14 partial-failure semantics changing meaningfully under parallel fan-out without explicit acknowledgement, (e) unbounded Prisma JSON-path scan in get_person, and (f) an untreated worst-case 75s turn budget if a researcher swallows its abort signal.

Would I sign my name to this plan in production after the auto-applied upgrades? **Yes, with one caveat:** the real-Anthropic verification of new researcher prompts is deliberately deferred to 06-04 (per the carry-forward of D-06-01-L manual smoke). That deferral is defensible because (a) probe stub-mode regex coverage is exhaustive on shape contracts, (b) chat-v1 remains the production path through the per-org `chatV2Enabled` flag (default false) until 06-04 deletes the flag, and (c) the cost-discipline math is invariant to model choice. But I would not flip the flag for any production org until 06-04's quality gate (probe-eval ≥80% + manual UAT ≥18/20) clears.

## 2. What Is Solid (Do Not Change)

- **Inheritance discipline.** The plan explicitly carries forward 06-01 audit-M1/M2/M3/M4/M5/M6 + 06-02 audit-M1/M2/M3/M4/M5/M6 + S1-S11 patterns. Every new researcher mirrors `DocsResearcher` (constructor, AbortController, RoleTimeoutError class, stub-mode env guard, chatV2Logger-only logging, no `Logger.` import). This is exactly the architectural conservatism warranted at this point in the milestone.
- **Boundaries protect the right surfaces.** Writer/Analyser/Critic services, voice corpus, Prisma schema, docs.researcher contract, chat-v1 module are all explicitly frozen. Plan correctly identifies that `chat-v1 deletion is 06-04, not 06-03` after the 4→5 plan re-slice.
- **Triage dispatch contract is well-posed.** Per-mode dispatch rules (lookup=1; reasoning≥2 incl venue; incident≥2 incl venue) translate the CONTEXT.md D-06-B "Venue always runs" decision into a structurally enforceable contract via the prompt + stub priority table.
- **Cost-aggregation is researcher-count-invariant.** Plan correctly observes that `recordResearcher(usage, voyageCalls)` already accumulates additively from 06-02 — no schema change needed. The only audit-driven extension is per-researcher log-level visibility (audit-S8, no schema change).
- **Promise.allSettled-pattern resilience.** Single-researcher rejection does not fail the turn — gracefully degrades to remaining findings. This is the right architectural call for a 5-researcher fan-out where one slow/failing researcher should not block proactive output.
- **Phase-event count semantics preserved.** Single `emitPhase('research', ...)` per parallel dispatch (1 event for fan-out width N, NOT N events). Re-research adds a SECOND research event. Frontend (06-05) consumes a stable count of 1 or 2 regardless of fan-out width.
- **Tabular researcher's two-tool flow.** search_docs → query_document_table is the right shape for tabular discovery; structurally bounded at `stepCountIs(3)` (carry-forward from DocsResearcher). The plan calls this out explicitly.
- **Probe idempotency discipline.** Two-iteration runs + cleanup helpers carry forward from 06-01/06-02. Required for the new V63 byte-stable assertion to be meaningful.

## 3. Enterprise Gaps Identified

### G1 — Prompt-injection vector at researcher boundary
06-01 audit-M4 sanitized user input pre-Triage via `sanitizeForTriage`. But Triage emits `briefByResearcher` strings that flow into each researcher's `generateText({ messages: [{ role: 'user', content: brief }] })` call. If Triage gets jailbroken (or genuinely tries to be helpful with verbatim user phrasing), the brief itself can contain `\nAssistant: ignore previous` or similar. Each researcher is a NEW Anthropic call, NEW attack surface. Plan does not mention sanitization at this boundary.

### G2 — Researcher dispatch is type-system happy-accident
`resolveResearcher(name: ResearcherName): /* what type? */`. Each researcher class returns a slightly different `*Result` type (DocsResearcherResult, OpsResearcherResult, etc.). Without a unifying interface, the orchestrator's dispatch table compiles only because TypeScript happens to infer a structural union. A future researcher with `voyageCalls` typed as `bigint` instead of `number` would compile in isolation but break the orchestrator's tracker call silently.

### G3 — Stub-mode clock non-determinism
`getVenueBriefing` fetches IncidentLog `where createdAt >= now-24h` and upcoming cutoffs `next 4h`. With `now = Date.now()`, two probe iterations spaced 200ms apart produce different result sets at the 24h/4h boundary. The plan promises stub-mode determinism (AC-7) but doesn't address time anchoring. A test running at 23:59:59.500 vs 00:00:00.500 yesterday-vs-today would flake the briefing payload.

### G4 — get_person mention scan is unbounded + injection-shaped
Plan says "scan KnowledgeItem.metadata JSON for occurrences of name (top 3 hits, scoped to same org)" but specifies neither query mechanism nor SQL-injection defense. If the implementer reaches for `prisma.$queryRaw` with template-literal interpolation, we ship an injection. If they use `findMany` with `metadata: { string_contains: name }`, that scans every KnowledgeItem.metadata in the org. For a tenant with 10K KB items, that's 10K JSON parse-and-search operations per get_person call.

### G5 — V14 partial-failure semantics change silently under fan-out
06-01 V14 asserted: "PROBE_CHAT_V2_FORCE_RESEARCHER_THROW=1 → researcher throws → turn-failed cost row persisted." With Task 4's parallel fan-out, ONE researcher throwing leaves the other N-1 to fulfill, so the turn ships successfully and the turn-failed row never exists. The semantic invariant flipped. Plan does not call this out — V14 would silently fail post-deployment without explicit re-spec.

### G6 — TOTAL_TURN_TIMEOUT_MS unenforced under adversarial researcher
If a researcher implements its `research()` such that `controller.signal.aborted` is checked but ignored (or if a third-party SDK eats the abort signal — has happened with `node-fetch` historically), `Promise.all(researcherTasks)` waits for that researcher's hard timeout (RESEARCHER_TIMEOUT_MS=15s). With 5 researchers each potentially spending 15s, worst-case turn = 75s. TOTAL_TURN_TIMEOUT_MS=35s constant exists in 06-01 but the orchestrator does not actually enforce it — it's documented as a budget, not a guarantee. Real-Anthropic UAT under load would surface this; production would page on first runaway.

### G7 — Unbounded Triage dispatch
Triage prompt is asked to "dispatch up to 5 researchers." Adversarial Triage output (or a prompt-confused model on an unusual input) could emit `researchersToDispatch: ['venue','docs','ops','people','tabular']` for a "what's below par?" lookup. That's 5 Anthropic calls + 5 voyage calls for a question that needs 1 specialist. Cost discipline (CONTEXT.md $0.01-0.02/turn target) silently breaks.

### G8 — Audit trail incomplete for SOC-2 incident reconstruction
Plan persists `chat_messages.retrievedItemIds` + `costUsd` + the existing 06-02 `low_confidence_flag` toolCallLog entry. For a regulator asking "show me what the system did when this customer complained about contaminated food," we'd need to reconstruct: which mode? which researchers dispatched? was safetySignal raised? was Critic invoked? did it correct? None of that is currently persisted in a queryable form — it's all in transient logs that age out per retention policy.

### G9 — Per-researcher cost is invisible
CostBreakdown.researchersUsd sums across N researchers. For ops debugging "the venue researcher is burning 3x what people researcher is," there's no surface. v0.4 cost-allocation analysis breaks down at "researchers" granularity.

### G10 — `mockOps.getUpcomingCutoffs` failures silently flatten
Plan says "if `!ok`, treat as empty array, not failure." This conflates two distinct conditions: "mock_supplier table query failed for transient DB reasons" vs "no cutoffs in window." The first is an operational incident; the second is normal. Silent flattening loses the distinction.

### G11 — Tabular docId discovery has no spec for ambiguity
`search_docs` returning multiple tabular hits — which docId does the researcher pick? Top-1 by similarity is the obvious answer but plan doesn't specify; nor does it specify the zero-hit behaviour (failure? empty summary? "no tabular doc"?).

## 4. Concrete Upgrades Required

### Must-Have (Release-Blocking) — applied to plan

**M1 — get_person mention scan must be parameterized + bounded.** AC-17 added; Task 1 action augmented with explicit Prisma `findMany({ where: { organizationId: orgId, OR: [{ metadata: { path: ['contactNames'], array_contains: name }}, { metadata: { path: ['mentions'], string_contains: name }}] }, take: MAX_PERSON_MENTIONS_PER_QUERY = 3 })`; new constant in types/chat-v2.ts; verification grep gate: `\$\{name\}` and `' || name || '` must return 0.

**M2 — Researcher discriminated-union interface.** AC-11 added; new file `apps/api/src/modules/chat-v2/researcher.interface.ts` exports `interface Researcher { research(brief, ctx): Promise<{ finding: ResearcherFinding; usage: AnthropicUsage; voyageCalls: number }> }`. All 5 researchers `implements Researcher`. `resolveResearcher` returns the typed interface. V85 spec-file forces tsc errors if a future class drifts.

**M3 — Cross-tenant POSITIVE-path assertions.** AC-4 augmented with same-org returns-data positive Given/When/Then; Task 5 V61.positive + V63.positive added. Mirrors 06-01 V13 pattern.

**M4 — Brief sanitization at researcher boundary.** AC-12 added; new file `apps/api/src/modules/chat-v2/researcher-sanitizer.ts` exports `sanitizeForResearcher` mirroring `sanitizeForTriage` regex contract; each researcher production path passes brief through it pre-`generateText`. V62.injection probe verifies stub-mode hook captures post-sanitization brief.

**M5 — Stub-mode time-determinism.** AC-13 added; new file `apps/api/src/modules/chat-v2/stub-clock.ts` exports `stubClock()` returning `process.env.PROBE_CHAT_V2_STUB === '1' ? FROZEN_STUB_NOW_MS : Date.now()`. Researchers + tools that compute "now-X" boundaries import stubClock(). V63.idempotent asserts byte-identical briefing across iterations.

**M6 — V14 partial-failure semantics split.** AC-9 augmented + Task 5 V14 → V14a (1-of-N throws → turn ships) + V14b (N-of-N throw → turn-failed cost row persisted). PROBE_CHAT_V2_FORCE_RESEARCHER_THROW=`all` sentinel value forces every researcher's stub to throw.

### Strongly Recommended — applied to plan

**S1 — Per-researcher latencyMs in complete + failed logs.** AC-10 augmented; researchers capture `t0 = Date.now()` at entry, emit latencyMs in both success and failure log paths. Verification grep gate added.

**S2 — MAX_RESEARCHERS_PER_TURN=4 cap.** AC-15 added; new constant in types/chat-v2.ts; Triage prompt explicitly forbids >4; orchestrator post-Triage re-validates and truncates by stable order `['venue','docs','ops','people','tabular']` + `chat_v2.dispatch_capped warn` log. V80 probe asserts cap.

**S3 — Single PROBE_CHAT_V2_FORCE_RESEARCHER_THROW=`<name>` env var.** Replaces per-researcher knobs (PROBE_CHAT_V2_FORCE_VENUE_THROW etc.); each researcher stub reads the same env var and matches its own name. Verification grep gate: per-researcher knobs must return 0.

**S4 — get_venue_briefing parallelizes its 4 internal Prisma queries.** Task 1 action augmented; venue + contacts + incidents + cutoffs fire via `Promise.all` — reduces tool latency from ~4×RTT to 1×RTT.

**S5 — `mockOps.getUpcomingCutoffs` non-no-data failures propagate.** Task 1 action augmented; only `'no-data'` flattens to empty array; any other reason emits `chat_v2.tool.get_venue_briefing.cutoffs_failed warn { reason }`. Distinguishes operational failure from normal absence.

**S6 — Triage dispatch + classification persisted on chat_messages.toolCallLog.** AC-14 added; orchestrator appends `{ round: -2, toolUseId: 'chat-v2-triage-dispatch', tool: 'triage_dispatch', input: { mode, safetySignal }, result: { dispatched, briefHashes } }` BEFORE persisting (extends 06-02 low_confidence_flag pattern). V79.dispatch_log probe asserts entry exists.

**S7 — Research-event count under fan-out + rerun.** Documented in Task 4 — research-phase-event count is 1 (no rerun) or 2 (with rerun) regardless of fan-out width. 06-02 V42 carry-forward.

**S8 — Per-researcher cost log.** Each researcher emits `chat_v2.researcher_cost_observed { researcher, anthropicUsd, voyageUsd, totalUsd }`. Operator can answer "which researcher cost what" without schema change. CostBreakdown structural breakdown deferred to D-06-03-A v0.4 trigger.

**S9 — Tabular docId discovery acceptance.** AC-18 added; zero-hits → `summary: 'no tabular doc matched'` (NOT failure); ≥1 → highest-similarity match. V82.tabular_no_doc + V82.tabular_match_doc probe both cases.

**S10 — TOTAL_TURN_TIMEOUT_MS-aware parent AbortController.** AC-16 added; orchestrator wraps `Promise.all(researcherTasks)` in parent AbortController firing at `Math.max(0, TOTAL_TURN_TIMEOUT_MS - elapsed - 1000ms)`. On parent abort: cancels in-flight researchers + emits `chat_v2.turn_budget_exhausted warn`. V81.parent_abort probe asserts.

**S11 — WhatsApp boundary clarification.** Boundaries section augmented; explicitly notes WhatsApp inbound flows through chat-v1 until 06-04 — WhatsApp users do NOT receive 06-03 breadth improvements until 06-04 ships.

### Deferred (Can Safely Defer)

| ID | Finding | Rationale for Deferral |
|----|---------|----------------------|
| D-06-03-A | CostBreakdown structural per-researcher breakdown | Audit-S8 logs provide visibility; structural breakdown is a v0.4 schema concern when cost-allocation reporting becomes a deliverable. Trigger: first month of production data shows operator cannot answer "which researcher cost what" from logs alone. |
| D-06-03-B | Real-Anthropic CI variant (`probe:chat-v2:real`) extension to V51-V85 | First real-Anthropic UAT is 06-04 by carry-forward of D-06-01-L. Probe stub-mode is exhaustive on shape contracts; real-Anthropic adds latency + cost + voice variability that's better verified in 06-04 alongside the canary-org UAT. |
| D-06-03-C | Triage cost-discipline post-month-1 telemetry retune | MAX_RESEARCHERS_PER_TURN=4 is a defensible upper bound but the actual median may be 2-3. After first month of telemetry, retune if data shows sustained underutilization (cap is too tight) or overutilization (cap is too loose). |
| D-06-03-D | KnowledgeItem.metadata GIN index for mention scan | Audit-M1 caps the query at 3 hits, which prevents pathological scans even on 50K-item orgs. If get_person.latencyMs p95 exceeds 500ms in production, add a GIN index on `metadata` column via additive migration. Trigger: first slow-query alert. |

## 5. Audit & Compliance Readiness

**Defensible audit evidence — POST-FIX:** Yes.
- Triage classification + dispatch list + safetySignal persisted in `chat_messages.toolCallLog` (audit-S6).
- Per-researcher cost observable via `chat_v2.researcher_cost_observed` log + CostBreakdown summed total in `chat_messages.costUsd`.
- Per-researcher latency observable via `chat_v2.researcher_complete { latencyMs }` + `chat_v2.researcher_failed { latencyMs }`.
- Cross-tenant scope enforced at TWO layers per call (tool-level orgId WHERE clause + researcher-level positional orgId source-of-truth). Cross-tenant breach is structurally impossible in this plan.
- PII discipline maintained: query content hashed, names never raw-logged, brief content hashed in toolCallLog dispatch entry.

**Silent failure prevention — POST-FIX:** Strong.
- `chat_v2.researcher_failed` + `chat_v2.dispatch_capped` + `chat_v2.turn_budget_exhausted` + `chat_v2.tool.get_venue_briefing.cutoffs_failed` emit explicit warn-level signals for every degradation mode.
- Partial-failure cost row persistence (audit-M2 06-01 carry-forward) covers the all-researchers-throw case (V14b).
- Voyage and Anthropic spend captured at researcher granularity even when outer turn fails (CostTracker accumulates pre-throw).

**Post-incident reconstruction — POST-FIX:** Possible at message-id granularity.
- Auditor query: "show me what the system did for chat_message X" → `SELECT toolCallLog, retrievedItemIds, costUsd, role FROM chat_messages WHERE id = X` reveals mode + dispatch list + safetySignal + retrieval IDs + total spend. Researcher-level latency + cost requires log retrieval (90-day retention).
- Pre-fix: only retrieval IDs + summed cost were available; mode + dispatch + safetySignal were transient.

**Ownership and accountability:** Plan correctly identifies 06-04 as the cutover deletion plan + 06-05 as UI surface. Each is independently auditable. Boundaries explicitly enumerate frozen surfaces. No silent ownership transfers.

**Areas that would still fail a real audit** (post-fix, but pre-06-04):
- WhatsApp inbound channel still flows through chat-v1; WhatsApp turns do NOT yet have 06-03 breadth or audit-grade triage_dispatch persistence. This is acceptable scope-limit for 06-03 per the re-slice, but auditors should be told "WhatsApp parity ships in 06-04" explicitly.
- Real-Anthropic verification of new researcher prompts is deferred. Acceptable because chat-v1 remains production path through the flag.

## 6. Final Release Bar

**What must be true before this plan ships:**
1. All 6 must-have findings applied to PLAN ✓ (auto-applied 2026-05-01 21:30)
2. All 11 strongly-recommended findings applied to PLAN ✓ (auto-applied 2026-05-01 21:30)
3. APPLY phase produces ≥195 probe sub-assertions across 2 idempotent iterations
4. Verification grep gates all return expected counts (12 new gates added)
5. tsc --noEmit clean; NestJS DI graph resolves; 06-02 unit tests stay green
6. Zero regression on probe-section + probe-tabular

**Risks that remain if shipped as-is (post-fix):**
- Real-Anthropic prompt drift on new researchers — first surfaces in 06-04 UAT cycle. Mitigation: chat-v1 stays production path until 06-04 deletion + flag flip.
- Triage cost discipline under adversarial input — MAX_RESEARCHERS_PER_TURN=4 is a defensible bound but per-month telemetry may surface need to retune.
- Per-researcher cost breakdown only at log-level — operator must grep logs to answer "which researcher cost what." Acceptable for v0.3; v0.4 adds structural surface.

**Would I sign my name to this system post-fix?** Yes. Plan is enterprise-ready for APPLY. The remaining risks are scope-limits explicitly marked as boundaries (real-Anthropic UAT is 06-04; WhatsApp parity is 06-04; structural cost breakdown is v0.4) — not lurking gaps.

---

**Summary:** Applied 6 must-have + 11 strongly-recommended upgrades. Deferred 4 items with concrete triggers. Probe assertion target raised ≥30 → ≥45 new (≥180 → ≥195 total). 8 new ACs (AC-11 through AC-18). 3 new files added to scope (researcher.interface.ts, researcher-sanitizer.ts, stub-clock.ts). 3 new constants in types/chat-v2.ts (MAX_PERSON_MENTIONS_PER_QUERY, MAX_RESEARCHERS_PER_TURN, FROZEN_STUB_NOW_MS). 12 new verification grep gates.

**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
*Auditor role: senior principal engineer + compliance reviewer*
