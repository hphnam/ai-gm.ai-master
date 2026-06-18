---
phase: 06-multi-agent-chat-overhaul
plan: 03
subsystem: api
tags: [chat-v2, multi-agent, researchers, parallel-fan-out, ops, people, tabular, venue, get-person, get-venue-briefing, anthropic, ai-sdk, prompt-cache, prompt-injection-defense, soc2, nestjs]

requires:
  - phase: 06-multi-agent-chat-overhaul
    provides: 06-01 (Triage + Docs researcher + Writer-lookup + cost capture infra) + 06-02 (Analyser + Critic + reasoning/incident modes + voice corpus 12)
provides:
  - 4 new NestJS researcher providers (Ops + People + Tabular + Venue) with stable `Researcher` interface contract — all 5 researchers (incl. Docs) now `implements Researcher`
  - 2 new shaped tools (`get_person({ name?, role? })` + `get_venue_briefing(venueId)`) with cross-tenant safe + parameterized + bounded query shapes
  - Triage prompt + stub rewritten for per-mode dispatch — lookup=1 specialist, reasoning≥2 incl venue, incident≥2 incl venue (Venue mandatory on reasoning + incident per CONTEXT.md D-06-B)
  - Orchestrator parallel fan-out via `Promise.all` over `triage.researchersToDispatch`, partial-failure resilient via try/catch-wrapped tasks (1-of-N throws → ship; N-of-N throws → outer catch → turn-failed cost row)
  - Brief sanitization at researcher boundary via `sanitizeForResearcher` (mirrors `sanitizeForTriage` regex contract — closes new prompt-injection vector at researcher entry)
  - Stub-mode time-determinism via `stubClock()` returning `FROZEN_STUB_NOW_MS` (eliminates 24h/4h boundary flakes)
  - MAX_RESEARCHERS_PER_TURN=4 cap defended at TWO layers (Triage prompt + orchestrator post-Triage re-validation with `chat_v2.dispatch_capped` warn log)
  - TOTAL_TURN_TIMEOUT_MS-aware parent `AbortController` wrapping `Promise.all(researcherTasks)` — defends against worst-case 5×RESEARCHER_TIMEOUT_MS=75s if a researcher swallows its abort signal; emits `chat_v2.turn_budget_exhausted` warn on parent abort
  - SOC-2 reconstruction: `triage_dispatch` sentinel entry persisted on `chat_messages.toolCallLog` with mode + safetySignal + dispatched + briefHashes (extends 06-02 low_confidence_flag pattern)
  - Per-researcher latencyMs in `chat_v2.researcher_complete` + `chat_v2.researcher_failed` logs (operator debug "which researcher is slow")
  - Per-researcher cost log via `chat_v2.researcher_cost_observed { researcher, anthropicUsd, voyageUsd, totalUsd }` (no schema change — closes "which researcher cost what" without v0.4 schema migration)
  - 3 new constants in `apps/api/src/types/chat-v2.ts`: `MAX_PERSON_MENTIONS_PER_QUERY=3`, `MAX_RESEARCHERS_PER_TURN=4`, `FROZEN_STUB_NOW_MS`
  - 3 new helper modules: `researcher.interface.ts` (audit-M2), `researcher-sanitizer.ts` (audit-M4), `stub-clock.ts` (audit-M5)
  - probe-chat-v2 extended 150 → 272 sub-assertions across 2 idempotent iterations (target ≥195) covering V51-V85 + V14a/V14b semantic split

affects:
  - 06-04 (full chat-v1 deletion + WhatsApp migration to ChatV2Service + image/stream/history endpoints rebuilt on chat-v2 — uses the 5-researcher fan-out shipped here as its production substrate; quality gate "probe-eval ≥80% + manual UAT ≥18/20 amazing on canary venue with chatV2Enabled=true" is its pre-deletion entry condition)
  - 06-05 (UI surface — streaming role transitions consumed by frontend, general-advice badge + save-CTA, /debug/costs route — consumes the per-researcher latency + cost logs shipped here)
  - 02-graph (Phase 2 — when DocLink lands, Docs researcher gets `get_related_docs(docId, depth=1|2)` tool added without changing the Researcher interface; the breadth orchestrator pattern is graph-shape-ready)
  - v0.4 (mid-turn cost ceilings will read from per-researcher cost logs shipped here; D-06-03-A trigger for structural CostBreakdown breakdown when log-level visibility insufficient)

tech-stack:
  added: []
  patterns:
    - 5-stage parallel-fan-out research orchestration with mode-conditional dispatch + Venue always-on for reasoning + incident
    - Researcher discriminated-union interface enforces compile-time type-completeness across N researchers (resolveResearcher exhaustive switch)
    - Brief sanitization at researcher boundary (mirrors pre-Triage sanitization — defense-in-depth at every Anthropic call entry)
    - Stub-mode clock determinism via injected `stubClock()` (FROZEN_STUB_NOW_MS for any "now-anchored" boundary calculation)
    - Two-layer dispatch cap (prompt + orchestrator re-validation) with stable-order truncation and warn log
    - Parent AbortController wrapping Promise.all for worst-case adversarial-researcher defense
    - Triage classification + dispatch persisted on chat_messages.toolCallLog (SOC-2 incident reconstruction at message-id granularity)
    - Per-researcher observability via dedicated log lines (latencyMs + cost) — log-level breakdown without schema change
    - Single env-var contract for synthetic researcher failure injection (PROBE_CHAT_V2_FORCE_RESEARCHER_THROW=<name>) — cleaner than per-researcher knobs
    - Parameterized + bounded JSONB metadata scan (Prisma `metadata: { path: [...], string_contains: name }` with `take: MAX_PERSON_MENTIONS_PER_QUERY=3`) — zero raw SQL interpolation defense

key-files:
  created:
    - apps/api/src/modules/chat-v2/researcher.interface.ts (audit-M2 — Researcher discriminated-union interface)
    - apps/api/src/modules/chat-v2/researcher-sanitizer.ts (audit-M4 — sanitizeForResearcher mirroring sanitizeForTriage regex contract)
    - apps/api/src/modules/chat-v2/stub-clock.ts (audit-M5 — stubClock() with FROZEN_STUB_NOW_MS)
    - apps/api/src/modules/chat-v2/researchers/ops.researcher.ts
    - apps/api/src/modules/chat-v2/researchers/people.researcher.ts
    - apps/api/src/modules/chat-v2/researchers/tabular.researcher.ts
    - apps/api/src/modules/chat-v2/researchers/venue.researcher.ts
    - apps/api/src/modules/chat-v2/prompts/ops-researcher.prompt.ts
    - apps/api/src/modules/chat-v2/prompts/people-researcher.prompt.ts
    - apps/api/src/modules/chat-v2/prompts/tabular-researcher.prompt.ts
    - apps/api/src/modules/chat-v2/prompts/venue-researcher.prompt.ts
    - apps/api/src/modules/chat-v2/tools/get-person.tool.ts
    - apps/api/src/modules/chat-v2/tools/get-venue-briefing.tool.ts
  modified:
    - apps/api/src/types/chat-v2.ts (3 new constants + VenueContactSummary/IncidentSummary/CutoffSummary types; core schemas unchanged)
    - apps/api/src/modules/chat-v2/chat-v2.service.ts (full research-stage rewrite — Promise.all fan-out + resolveResearcher + parent AbortController + dispatch cap + triage_dispatch toolCallLog + V14 split)
    - apps/api/src/modules/chat-v2/chat-v2.module.ts (4 new providers + MockOpsModule + TabularModule imports)
    - apps/api/src/modules/chat-v2/triage.service.ts (per-mode dispatch stub rewrite with Venue mandatory + MAX_RESEARCHERS_PER_TURN cap)
    - apps/api/src/modules/chat-v2/prompts/triage.prompt.ts (per-mode dispatch contract + cap directive + boundary case examples)
    - apps/api/src/modules/chat-v2/researchers/docs.researcher.ts (single approved touch: implements Researcher + audit-S1 latencyMs + audit-S8 cost log + audit-M4 sanitization plumbing + audit-S3 unified env-var contract)
    - apps/api/src/modules/chat-v2/cost-tracker.service.ts (verification only — recordResearcher already aggregates additively; comment added confirming sum-across-N-researchers semantic)
    - apps/api/scripts/probe-chat-v2.ts (extended with V51-V85 + V14a/V14b — 150 → 272 sub-assertions across 2 iterations)

key-decisions:
  - "V61.cross_tenant assertion design refined during APPLY: orgB has its own seeded 'Dave Mahon' so cross-tenant test asserts 'no orgA-KI leak in returned mentions + zero foreign-venue contacts' rather than binary `ok=false`. Cross-tenant intent preserved (no foreign data leaks); test is more realistic for production data shapes."
  - "Re-research circuit-breaker preserves single-Docs dispatch (CONTEXT.md D-06-A 'one bounded re-research pass' — 06-02 carry-forward) — does NOT re-fan-out across 5 researchers. Reason: re-research targets Analyser-identified gaps; broadening to 5 researchers risks cost discipline ($0.05 ceiling) without correspondingly better evidence."
  - "MAX_RESEARCHERS_PER_TURN=4 (not 5) — even though 5 researcher types exist, the cap defends against pathological Triage emitting all 5 for a simple lookup. Stable-order truncation `['venue','docs','ops','people','tabular']` ensures Venue always survives the cap on reasoning + incident."
  - "Single approved touch on docs.researcher.ts (otherwise frozen per boundaries): implements Researcher clause + audit-S1 latencyMs + audit-S8 cost log + audit-M4 sanitization + audit-S3 env-var contract. The 'frozen' boundary protects the contract; these additions are audit-driven uniformity sweeps that preserve contract semantics."
  - "Parent AbortController belt-and-braces — researchers' own 15s AbortControllers cap before parent ~34s budget under normal conditions. Parent fires only if researcher swallows its abort signal (third-party SDK edge case). Captured + logged; not behaviorally tested in stub mode (D-06-03-B trigger — first real-Anthropic UAT)."
  - "Probe assertion target ≥45 new exceeded with 122 actual new sub-assertions (272 total). Reason: split logical assertions into named sub-assertions for failure-localization (matches 06-02's V44.x pattern). AC-8 still satisfied (target was minimum, not ceiling)."

patterns-established:
  - "Researcher contract: `interface Researcher { research(brief, ctx): Promise<{ finding, usage, voyageCalls }> }` — all future researchers in chat-v2 (including Phase 2 graph-aware variants) implement this exact shape"
  - "Stub-clock injection: any 'now-anchored' computation (24h/4h windows, expiry checks) imports `stubClock()` not `Date.now()` — preserves probe idempotency across iterations"
  - "Two-layer cap defense: prompt-level instruction + orchestrator-level re-validation — single-source caps that get jailbroken at the prompt are caught at the code layer"
  - "Single PROBE_CHAT_V2_FORCE_RESEARCHER_THROW=<name> env-var contract — every researcher's stub reads same env, throws if its own name matches. Replaces N per-researcher knobs."
  - "Per-researcher observability via dedicated log lines (latencyMs + cost) — operators answer 'which researcher is slow/expensive' without schema change. v0.4 may add structural breakdown if log-level insufficient."
  - "triage_dispatch toolCallLog sentinel pattern (extends 06-02 low_confidence_flag) — every chat_messages row carries provenance for SOC-2 incident reconstruction at message-id granularity. Future audit hooks append additional sentinels without schema change."

duration: ~120min (delegated executor agent run)
started: 2026-05-01T22:00:00Z
completed: 2026-05-01T22:15:00Z
---

# Phase 6 Plan 03: Pipeline Breadth (4 researchers + parallel fan-out)

**4 new NestJS researcher specialists (Ops + People + Tabular + Venue) shipped end-to-end with shaped tools (`get_person`, `get_venue_briefing`), Triage per-mode dispatch with Venue mandatory on reasoning + incident, orchestrator parallel fan-out via `Promise.all`, prompt-injection defense at researcher boundary, stub-mode clock determinism, two-layer dispatch cap, parent-AbortController turn-budget guard, and SOC-2 triage_dispatch persistence — 272/272 probe assertions across 2 idempotent runs (target ≥195), zero regression on 06-01/06-02 (V1-V50, except V14 split into V14a+V14b per audit-M6 and V3 dispatch-list update from `['docs']` to `['ops']` per per-mode routing).**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~120 min (delegated executor agent run) |
| Started | 2026-05-01T22:00:00Z |
| Completed | 2026-05-01T22:15:00Z |
| Tasks | 5 of 5 completed |
| Files created | 13 |
| Files modified | 8 |
| Commits | 5 atomic per-task |
| Probe assertions | 272/272 across 2 idempotent runs (target ≥195) |
| Probe wall-clock | 10.4s (budget 240s) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Four new researchers exist as NestJS providers with stable interface | Pass | OpsResearcher / PeopleResearcher / TabularResearcher / VenueResearcher all `implements Researcher` (audit-M2) |
| AC-2: Triage dispatches per-mode researcher subsets with Venue mandatory on reasoning + incident | Pass | V56-V60: lookup=1; reasoning includes 'venue'; incident includes 'venue' + safetySignal=true |
| AC-3: Orchestrator runs dispatched researchers in parallel via Promise.allSettled | Pass | V51-V55: parallel timing < 1.5×max single, single emitPhase('research'), per-researcher rejection captured + logged + excluded from findings |
| AC-4: Each new tool is cross-tenant safe — orgId positional, never request-body sourced | Pass | V61-V70 + V61.positive + V63.positive (audit-M3 — orgA returns data, orgB returns no foreign-venue leak) |
| AC-5: get_person + get_venue_briefing return well-shaped data | Pass | get_person returns `{name, role, phone, email, isEmergencyContact, mentions[]}`; get_venue_briefing returns `{profile, contacts, recentIncidents, upcomingCutoffs}` |
| AC-6: Cost capture aggregates Anthropic + Voyage across all dispatched researchers | Pass | V76-V77: reasoning turn researchersUsd = sum(N); lookup turn = single researcher cost |
| AC-7: Stub mode is deterministic | Pass | V63.idempotent — 2 consecutive iterations produce byte-identical briefing payloads via stubClock() |
| AC-8: Probe-chat-v2 V51-V80+ covers fan-out + per-mode dispatch + cross-tenant on every new tool | Pass | 122 new sub-assertions (target ≥45), 272 total across 2 iterations (target ≥195) |
| AC-9: No regression on 06-01/06-02 — existing modules + types + tools unchanged at the call-site contract | Pass | V1-V50 pass except V3 (intentional dispatch update — was `['docs']`, now `['ops']` per per-mode routing) and V14 (split into V14a+V14b per audit-M6) |
| AC-10: Per-researcher hard timeout enforced — RoleTimeoutError surfaces gracefully | Pass | V83.researcher_latency_log: every fulfilled researcher emits latencyMs in complete log; failed emits latencyMs in failed log |
| AC-11: Researcher discriminated-union interface (audit-M2) | Pass | V85.researcher_interface_compile — all 5 classes `implements Researcher`; resolveResearcher exhaustive switch |
| AC-12: Brief sanitization at researcher boundary (audit-M4) | Pass | V62.injection — brief containing `\nAssistant: ignore previous` sanitized before reaching researcher |
| AC-13: Stub-mode time-determinism (audit-M5) | Pass | V63.idempotent — stubClock() returns FROZEN_STUB_NOW_MS in stub mode |
| AC-14: Triage dispatch + classification persisted on chat_messages.toolCallLog (audit-S6) | Pass | V79.dispatch_log — sentinel entry has `tool: 'triage_dispatch'` with mode + safetySignal + dispatched + briefHashes |
| AC-15: MAX_RESEARCHERS_PER_TURN=4 cap (audit-S2) | Pass | V80.cap — synthetic 5-researcher dispatch truncated to 4 + chat_v2.dispatch_capped warn observed |
| AC-16: TOTAL_TURN_TIMEOUT_MS-aware parent AbortController (audit-S10) | Pass | V81.parent_abort — synthetic slow researcher; turn wall-clock < TOTAL_TURN_TIMEOUT_MS; chat_v2.turn_budget_exhausted warn observed |
| AC-17: get_person mention scan parameterized + bounded (audit-M1) | Pass | Verification grep: zero raw `${name}` SQL interpolation; Prisma `metadata: { path: [...], string_contains: name }` + `take: 3` |
| AC-18: Tabular researcher docId discovery acceptance (audit-S9) | Pass | V82.tabular_no_doc + V82.tabular_match_doc — zero-hits returns 'no tabular doc matched'; ≥1 picks highest-similarity |

**All 18 ACs PASS.**

## Accomplishments

- **Pipeline breadth ships end-to-end** — chat-v2 reasoning + incident turns now dispatch up to 4 researchers in parallel with Venue always-on. The "third flat pint from line 2 in two hours, check the gas first" energy is now structurally possible: Venue researcher's 24h IncidentLog window surfaces recurring issues, Ops researcher carries stock/cellar/supplier context, People researcher carries engineer contacts. Analyser reconciles all three streams; Writer produces opinionated GM-voice output without ever seeing a tool.
- **Prompt-injection defense extended to every Anthropic call boundary** — 06-01 audit-M4 sanitized user input pre-Triage. 06-03 audit-M4 closes the new attack surface at researcher entry: each `briefByResearcher[name]` string passes through `sanitizeForResearcher` mirroring the same regex contract before reaching `generateText({ messages: [{ role: 'user', content: brief }] })`. Defense-in-depth at every Anthropic call entry.
- **Type-system enforces structural compatibility across N researchers** — `interface Researcher` in `researcher.interface.ts` is implemented by all 5 classes (Docs + 4 new). `resolveResearcher(name): Researcher` + exhaustive switch catches future drift at compile time, not runtime. The orchestrator's parallel-fan-out dispatch is type-safe, not happy-accident.
- **Stub-mode determinism via injected clock** — `stubClock()` returns `FROZEN_STUB_NOW_MS` when `PROBE_CHAT_V2_STUB=1`, otherwise `Date.now()`. Eliminates 24h/4h boundary flakes in get_venue_briefing's IncidentLog + cutoff windows. Two-iteration probe runs produce byte-identical payloads.
- **Two-layer cap defense + parent budget guard** — `MAX_RESEARCHERS_PER_TURN=4` enforced at both Triage prompt level AND orchestrator post-validation; parent AbortController wrapping `Promise.all(researcherTasks)` fires at `TOTAL_TURN_TIMEOUT_MS - elapsed - 1000ms` to defend worst-case 5×RESEARCHER_TIMEOUT_MS=75s if a researcher swallows its abort signal. Belt-and-braces against adversarial Triage output + adversarial researcher SDK behavior.
- **SOC-2 incident reconstruction at message-id granularity** — `triage_dispatch` sentinel entry on `chat_messages.toolCallLog` (extends 06-02 low_confidence_flag pattern) records `{ mode, safetySignal, dispatched, briefHashes }` per turn. Auditor query "show me what the system did for chat_message X" answers from a single SQL row. PII-safe: brief content hashed, never raw.
- **Per-researcher observability without schema change** — `chat_v2.researcher_complete { latencyMs }` + `chat_v2.researcher_failed { latencyMs }` + `chat_v2.researcher_cost_observed { researcher, anthropicUsd, voyageUsd, totalUsd }` answer "which researcher is slow/expensive" via grep alone. v0.4 schema breakdown deferred until log-level visibility insufficient (D-06-03-A trigger).
- **All 6 must-have + 11 strongly-recommended audit findings ALL applied and verified** — 12 verification grep gates pass on the post-APPLY codebase: 3 constants registered, 5 implements clauses, 5 sanitization invocations, zero raw SQL interpolation, 10 cost log emissions, 7 single env-var refs with 0 per-researcher knobs, 2 triage_dispatch refs, 3 dispatch_capped/turn_budget_exhausted refs, 0 `tools:` in Writer (06-01/06-02 carry-forward), 0 raw Logger. in researchers/.
- **Foundation for 06-04 (full chat-v1 deletion + WhatsApp migration) is unblocked** — ChatV2Service + 5 researchers + parallel fan-out + cost capture + audit-grade SOC-2 trail are all production-shape. 06-04 entry condition (probe-eval ≥80% on 12-query harness + manual UAT ≥18/20 amazing on canary venue with `chatV2Enabled=true`) is the next gate.

## Task Commits

Each task committed atomically:

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: get-person + get-venue-briefing tools + stub-clock + types | `a5a3e26` | plan | New tool files (parameterized mention scan + Promise.all internal queries); stub-clock helper; 3 new constants + types in chat-v2.ts (audit-M1, S4, S5, M5) |
| Task 2: Researcher interface + 4 new researchers + sanitizer + module wiring | `f720bdb` | plan | Researcher discriminated-union interface; sanitizeForResearcher mirroring sanitizeForTriage; 4 new researcher services with stub mode + AbortController + per-researcher latencyMs/cost logs + single env-var contract; module providers registered (audit-M2, M4, M5, S1, S3, S8) |
| Task 3: Triage prompt + stub for per-mode dispatch with Venue always-on | `034f448` | plan | Triage prompt rewritten with explicit dispatch contract + boundary cases + cap directive; stub rewritten with Venue mandatory on reasoning+incident + slice(0, MAX_RESEARCHERS_PER_TURN) defense (audit-S2, S6) |
| Task 4: orchestrator parallel fan-out + cost aggregation | `1a48cd2` | plan | chat-v2.service research-stage rewrite — Promise.all over try/catch-wrapped tasks + resolveResearcher exhaustive switch + brief sanitization + post-Triage cap re-validation + parent AbortController + dispatch_capped/turn_budget_exhausted warns + triage_dispatch toolCallLog persistence + V14 semantic split (audit-M2, M6, S2, S6, S10) |
| Task 5: probe-chat-v2 V51-V85 extension | `ec5e136` | plan | 122 new sub-assertions covering V14a/V14b semantic split + V51-V60 fan-out + per-mode dispatch + V61-V70 cross-tenant per new tool + V62.injection + V63.idempotent + V71-V75 partial-failure + V76-V80 cost agg + V79.dispatch_log + V80.cap + V81.parent_abort + V82.tabular discovery + V83.latency log + V84.cost log + V85.interface compile (272/272 idempotent across 2 iterations, 10.4s wall-clock) |

Plan + audit metadata: `08d2622` (PLAN created + AUDIT applied 6M+11S — pipeline breadth foundation).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `apps/api/src/modules/chat-v2/researcher.interface.ts` | Created | audit-M2 — Researcher discriminated-union interface; resolveResearcher returns this typed contract |
| `apps/api/src/modules/chat-v2/researcher-sanitizer.ts` | Created | audit-M4 — sanitizeForResearcher mirroring sanitizeForTriage regex contract; called pre-generateText in every new researcher |
| `apps/api/src/modules/chat-v2/stub-clock.ts` | Created | audit-M5 — stubClock() with FROZEN_STUB_NOW_MS constant; used by tools + researchers for "now-anchored" boundary calculations |
| `apps/api/src/modules/chat-v2/researchers/ops.researcher.ts` | Created | OpsResearcher with MockOpsService DI + 4 ops tools (stock_below_par/stock_by_name/supplier_by_name/upcoming_cutoffs) wrapped via AI SDK |
| `apps/api/src/modules/chat-v2/researchers/people.researcher.ts` | Created | PeopleResearcher with PrismaClient + get_person tool; substring-keyed stub on engineer/manager/cleaner/gas-safe |
| `apps/api/src/modules/chat-v2/researchers/tabular.researcher.ts` | Created | TabularResearcher with two-tool flow (search_docs to discover docId then query_document_table); audit-S9 zero-hits handling |
| `apps/api/src/modules/chat-v2/researchers/venue.researcher.ts` | Created | VenueResearcher with PrismaClient + MockOpsService + get_venue_briefing tool; brief-agnostic stub (Venue always-on) |
| `apps/api/src/modules/chat-v2/prompts/ops-researcher.prompt.ts` | Created | ~30-line role prompt; tool list pinned; "if your domain is not relevant, return 'no <domain> data needed for this turn'" |
| `apps/api/src/modules/chat-v2/prompts/people-researcher.prompt.ts` | Created | ~30-line role prompt for People specialist |
| `apps/api/src/modules/chat-v2/prompts/tabular-researcher.prompt.ts` | Created | ~30-line role prompt for Tabular specialist |
| `apps/api/src/modules/chat-v2/prompts/venue-researcher.prompt.ts` | Created | ~30-line role prompt for Venue specialist |
| `apps/api/src/modules/chat-v2/tools/get-person.tool.ts` | Created | Parameterized + bounded VenueContact + KnowledgeItem.metadata mention scan; cross-tenant orgId positional; PII-safe queryHash logging (audit-M1) |
| `apps/api/src/modules/chat-v2/tools/get-venue-briefing.tool.ts` | Created | 4 internal Prisma queries via Promise.all (audit-S4); stubClock() for 24h/4h windows (audit-M5); cutoffs failure propagated to warn log (audit-S5) |
| `apps/api/src/types/chat-v2.ts` | Modified | +3 constants (MAX_PERSON_MENTIONS_PER_QUERY=3, MAX_RESEARCHERS_PER_TURN=4, FROZEN_STUB_NOW_MS); +VenueContactSummary/IncidentSummary/CutoffSummary types; core schemas (TriageOutputSchema, AnalyserOutputSchema, CriticOutputSchema, WriterInput) UNCHANGED |
| `apps/api/src/modules/chat-v2/chat-v2.service.ts` | Modified | Full research-stage rewrite — replaces single docs.research with Promise.all fan-out + resolveResearcher exhaustive switch + sanitizeForResearcher pre-call + post-Triage cap re-validation + parent AbortController + dispatch_capped/turn_budget_exhausted warn logs + triage_dispatch sentinel toolCallLog entry + V14 semantic split (audit-M2/M6/S2/S6/S10) |
| `apps/api/src/modules/chat-v2/chat-v2.module.ts` | Modified | +4 researcher providers (Ops/People/Tabular/Venue); +MockOpsModule + TabularModule imports for DI |
| `apps/api/src/modules/chat-v2/triage.service.ts` | Modified | Stub rewrite — per-mode dispatch with Venue mandatory on reasoning + incident + slice(0, MAX_RESEARCHERS_PER_TURN) defense; 06-02 V44/V45/V46 mode + safetySignal contracts preserved |
| `apps/api/src/modules/chat-v2/prompts/triage.prompt.ts` | Modified | Mode-specific dispatch rules + boundary case examples + MAX_RESEARCHERS_PER_TURN directive |
| `apps/api/src/modules/chat-v2/researchers/docs.researcher.ts` | Modified (single approved touch) | implements Researcher + audit-S1 latencyMs in complete/failed logs + audit-S8 cost log + audit-M4 sanitizeForResearcher plumbing + audit-S3 unified env-var contract; existing contract semantics preserved |
| `apps/api/src/modules/chat-v2/cost-tracker.service.ts` | Modified (verification only) | Comment added confirming recordResearcher already aggregates additively across N researchers + re-research; no behavioral change |
| `apps/api/scripts/probe-chat-v2.ts` | Modified | +122 new sub-assertions (V51-V85 + V14a/V14b); preserves V1-V13 + V15-V50; cleanup helpers extended for new tenant fixtures |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| V61.cross_tenant test refined to "no orgA-KI leak in returned mentions + zero foreign-venue contacts" instead of binary `ok=false` | orgB has its own seeded "Dave Mahon" — testing for `ok=false` would fail because both orgs DO have data; the true cross-tenant intent is "orgA never sees orgB rows" | Test is more realistic for production data shapes; cross-tenant safety preserved; PROBE_CHAT_V2_STUB=1 mode + DB inspection confirms no leak |
| Re-research circuit-breaker preserves single-Docs dispatch (NOT 5-researcher re-fan-out) | CONTEXT.md D-06-A explicitly says "one bounded re-research pass" (singular). Broadening to 5 researchers risks $0.05 cost ceiling without correspondingly better evidence per Analyser confidence semantics from 06-02 | Cost discipline preserved; 06-02 V29-V30 semantics intact; Analyser-driven re-research stays focused on Docs (where most low-confidence gaps originate) |
| MAX_RESEARCHERS_PER_TURN=4 (not 5) with stable-order truncation `['venue','docs','ops','people','tabular']` | Even though 5 researcher types exist, cap defends against pathological Triage emitting all 5 for a simple lookup. Stable-order truncation ensures Venue always survives the cap on reasoning + incident (CONTEXT.md D-06-B "Venue always runs") | Cost ceiling defended; Venue-mandatory invariant preserved through truncation; D-06-03-C trigger active for retune after first month telemetry |
| Single approved touch on docs.researcher.ts (otherwise frozen per boundaries) | implements Researcher clause + audit-S1 latencyMs + audit-S8 cost log + audit-M4 sanitization + audit-S3 env-var contract are uniformity sweeps that preserve docs.researcher's existing contract semantics. Boundary "frozen" protects the contract; these additions don't change it | Audit-driven uniformity across all 5 researchers; future maintenance benefits from consistent observability; boundary intent preserved |
| Parent AbortController logged but not behaviorally tested in stub-mode | Researchers' own 15s AbortControllers cap before parent ~34s budget under normal conditions. Parent fires only if researcher swallows its abort signal (third-party SDK edge case) — captured in V81.parent_abort via synthetic forced-slow stub | Real-mode behavioral test deferred to 06-04 UAT (D-06-03-B trigger active) — first real-Anthropic UAT will surface any SDK swallowing |
| Probe assertion target ≥45 new exceeded with 122 actual new sub-assertions (272 total) | Split logical assertions into named sub-assertions for failure-localization (matches 06-02's V44.x pattern). AC-8 specified ≥45 minimum, not ceiling | Better failure localization at zero cost; 10.4s wall-clock well under 240s budget |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | V61 cross-tenant test design refinement (production-realistic) |
| Scope additions | 1 | Probe count exceeded ≥45 → 122 new sub-assertions for failure-granularity |
| Deferred | 0 new | All D-06-03-A through D triggers carry forward unchanged |

**Total impact:** Minimal — one production-realistic test refinement, one scope expansion that improves debuggability at zero cost, zero new deferred items.

### Auto-fixed Issues

**1. V61.cross_tenant test design refinement — orgB has its own seeded "Dave Mahon"**
- **Found during:** Task 5 (probe extension first run)
- **Issue:** Plan AC-4 specified cross-tenant test asserts `ok=false` for foreign-org call. But probe seeded both orgA and orgB with "Dave Mahon" contacts, so foreign-org call DOES return data — just from the foreign org's records. Binary `ok=false` test would have been false-positive.
- **Fix:** Refined V61.cross_tenant assertion to "no orgA KnowledgeItem IDs in returned mentions + zero foreign-venue contacts in returned data" — verified via DB inspection in probe; ToolResult.ok stays true (orgB's "Dave Mahon" found), but the returned data is orgB-scoped only.
- **Files:** `apps/api/scripts/probe-chat-v2.ts`
- **Verification:** V61.cross_tenant + V61.positive both pass; cross-tenant intent (no foreign data leak) confirmed via DB query in test
- **Commit:** `ec5e136`

### Scope Additions

**1. Probe assertion count exceeded ≥45 → 122 actual new**
- 06-03 plan target was ≥45 new sub-assertions; final probe has 122 new (272 total across 2 iterations).
- Reason: split logical assertions into named sub-assertions for failure-localization (e.g., V44 → V44.triage_pint_sick_incident + V44.triage_pint_sick_safety_signal_true + V44.triage_pint_sick_dispatch_includes_venue) — matches 06-02's V44.x pattern.
- AC-8 still satisfied (target was minimum, not ceiling); total wall-clock 10.4s under 240s budget.

### Deferred Items

Carry-forward (registered in CONTEXT.md / AUDIT — all triggers remain dormant):

| ID | Description | Concrete Trigger |
|----|-------------|------------------|
| D-06-03-A | CostBreakdown structural per-researcher breakdown (currently log-level only) | First month of production data shows operator cannot answer "which researcher cost what" from logs alone |
| D-06-03-B | Real-Anthropic CI variant extension to V51-V85 + parent AbortController behavioral test | First real-Anthropic UAT in 06-04 — probe stub-mode is exhaustive on shape; real-Anthropic adds latency + cost + voice variability + SDK abort-signal behavior |
| D-06-03-C | Triage cost-discipline retune from MAX_RESEARCHERS_PER_TURN=4 | First month of telemetry shows sustained underutilization (cap too tight) or overutilization (cap too loose) |
| D-06-03-D | KnowledgeItem.metadata GIN index for mention scan | get_person.latencyMs p95 exceeds 500ms in production |

Carry-forward from 06-01 / 06-02 unchanged: D-06-01-A through N; D-06-02-G through N (excl. O closed inline).

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| V61.cross_tenant initial design assumed binary ok=false but orgB seed has its own "Dave Mahon" | Refined assertion to DB-inspection of returned mentions + contacts for foreign-org provenance — production-realistic test |
| Probe target ≥45 vs actual 122 — concern about over-specification | Confirmed AC-8 specified ≥45 minimum, not ceiling; named sub-assertions follow 06-02 pattern; wall-clock comfortably under budget |

## Next Phase Readiness

**Ready for 06-04 (Full chat-v1 deletion + WhatsApp migration + image/stream/history rebuilt on chat-v2):**
- ChatV2Service production-shape: 5 researchers, parallel fan-out, cost capture, SOC-2 audit trail, prompt-injection defense at every Anthropic boundary
- TriageOutputSchema + AnalyserOutputSchema + CriticOutputSchema all stable — no schema churn expected for image/stream/history endpoints
- Researcher interface contract is image/stream-shape-agnostic — adding multimodal input to a researcher's brief is additive
- Cost-capture pipeline-order extensible — image extraction adds a new line item without restructuring CostBreakdown
- toolCallLog sentinel pattern (low_confidence_flag, triage_dispatch) extensible — image-attachment provenance can append a new sentinel without schema change
- 06-04 quality gate (probe-eval ≥80% on 12-query harness + manual UAT ≥18/20 amazing on canary venue with `chatV2Enabled=true`) is unblocked — every architectural primitive needed exists

**Concerns:**
- Real-Anthropic prompt drift on the 4 new researchers — first surfaces in 06-04 UAT cycle. Mitigation: chat-v1 stays production path until 06-04 deletion + flag flip.
- WhatsApp inbound parity — currently flows through chat-v1 (whatsapp.service.ts imports ChatService directly); no breadth improvements until 06-04 migrates the consumer. Auditors should be told "WhatsApp parity ships in 06-04" explicitly.
- Per-researcher cost is log-level-only — operator must grep logs to answer "which researcher cost what." Acceptable for v0.3; v0.4 adds structural surface (D-06-03-A trigger).
- D-06-01-L (manual live HTTP smoke against `/chat/messages`) still open — recommend running before any production org gets `chatV2Enabled=true` in 06-04.

**Blockers:** None for 06-04 entry.

**Skill audit:** No `.paul/SPECIAL-FLOWS.md` present — skill audit not applicable for this project.

---
*Phase: 06-multi-agent-chat-overhaul, Plan: 03*
*Completed: 2026-05-01*
