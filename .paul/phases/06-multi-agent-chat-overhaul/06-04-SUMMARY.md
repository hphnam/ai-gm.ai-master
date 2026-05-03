---
phase: 06-multi-agent-chat-overhaul
plan: 04
subsystem: api+web
tags: [chat-v1, chat-v2, tool-loop-agent, deep-research, latency, ux-pivot, multi-agent, controller-revival, post-terminal-text-bug, record-kb-gap-gate, anthropic, ai-sdk, nestjs]

requires:
  - phase: 06-multi-agent-chat-overhaul
    provides: 06-01 (Triage + Docs researcher + Writer) + 06-02 (Analyser + Critic + 3 modes) + 06-03 (4 new researchers + parallel fan-out + 5-stage pipeline)
provides:
  - chat-v1's `ChatService` (single-Sonnet ToolLoopAgent with `find_knowledge` + 12 direct entity tools) restored as the default for ALL `/chat/*` HTTP routes
  - new `deep_research` tool (13th in the registry) that wraps `ChatV2Service.sendMessage` — chat-v2's full multi-agent pipeline becomes a fallback the agent reaches for only when retrieval + cross-venue both fail and the question genuinely needs cross-source synthesis
  - new `ChatController` in chat-v1 module mirroring the 6 routes from `ChatV2Controller` (POST messages, POST messages/with-image, POST stream, GET conversations, GET conversations/:id, DELETE conversations/:id) — same DTOs, same response shape, no frontend change required
  - tasks 1-5 (cutover to chat-v2) completed AS PLANNED: streaming endpoint on chat-v2, conversations on chat-v2, WhatsApp migration, chatV2Enabled column dropped, probe-eval extended to 12-query harness
  - 6 latency/compatibility hot-fixes against the multi-agent path that surfaced during real-Anthropic UAT (Triage schema partialRecord→explicit-keys, AnalyserOutputSchema number-bounds, Triage fast-path regex pre-classifier, TRIAGE_TIMEOUT 5s→12s + TOTAL_TURN 35s→45s, Analyser+Critic generateObject→generateText, deterministic FastLookupService for structured-entity lookups)
  - architectural pivot landed in `6e8a0d5`: ChatV2Controller deregistered; ChatV1Controller (new) takes the public surface; ChatV2Module exports `ConversationService` so the new controller can use it; `ToolDispatcher` injected with `ChatV2Service` for the deep_research tool body
  - frontend `chat-message.tsx` rewrite: visible answer = last text part BEFORE `suggest_followups` terminal tool; text after `suggest_followups` (post-terminal junk Sonnet sometimes emits) is silently discarded; earlier text parts fold into the thought-process block; new tool-chip labels for deep_research / verify_quote / log_incident / update_stock / add_supplier_note
  - backend `gm-agent.ts` stopWhen extended with `hasToolCall('suggest_followups')` so the loop terminates the moment the terminal tool fires, preventing the post-followup text-restatement bug at source
  - `record_kb_gap` runtime gate relaxed: previously hard-rejected any time `find_knowledge` returned ANY hits; now requires only that find_knowledge has been called at least once. BM25 was surfacing tangential keyword matches for almost any query, trapping the model with no escape into the lenient no-data flow → wishy-washy meta answers. Model judgement is now trusted on relevance.
  - `userMessage` threaded through `ResearchContext` to all 5 chat-v2 researchers, plus tokenized role queries in `getPerson` ("cellar engineer" now matches "Gas Engineer" via OR-match on tokens) — surgical fixes that improve quality on the now-rare deep_research path

affects:
  - Phase 06 itself — this plan effectively closes the phase. The multi-agent thesis was tested under real-Anthropic load, found to be the wrong default for a hospitality bar context (15-30s for plain lookups was unusable during service), and demoted. The pipeline is preserved as a callable tool, not deleted.
  - 06-05 (UI surface — streaming role transitions / general-advice badge / /debug/costs route) — the role-transition stream events still emit on the deep_research code path; the UI work narrows to "tool chip for deep_research" + the existing find_knowledge / direct-tool chips. /debug/costs telemetry still applies (fewer hits because pipeline is rare path).
  - WhatsApp inbound — task 4 migrated `whatsapp.service.ts` to `ChatV2Service`. Today's pivot did NOT revert that consumer (deferred — see Concerns). WhatsApp turns currently still go through the multi-agent pipeline, while web `/chat/*` goes through chat-v1. This is a known asymmetry; resolution deferred to a follow-up clean-up that should also route WhatsApp via `ChatService.sendMessage`.
  - Phase 4 (procedural runtime / dynamic doc intelligence) — unchanged; chat-v1's `find_knowledge` already covers checklist_step retrieval which is the integration surface those phases need.
  - v0.4 — D-06-G (feature-flag cutover) was already superseded 2026-05-01 ("bin the flag, fully migrate"); today's pivot supersedes that supersession ("the multi-agent default itself was wrong; revert to v1 as default"). v0.4 starts from a healthier baseline: chat-v1 production, chat-v2 as a tool, both alive.

tech-stack:
  added: []
  patterns:
    - Default agent shape: single-call ToolLoopAgent with parallel direct tools + extended thinking (chat-v1 pattern, restored)
    - Multi-agent pipeline as a TOOL the default agent calls, not as the default surface — `deep_research` recipe with cross-tenant guard, error-recovered into the agent's continued reasoning
    - Terminal tool stopWhen pattern: `suggest_followups` joins `save_knowledge_doc` as a hard loop terminator; post-terminal text becomes structurally impossible
    - Frontend "considered range" rendering: visible answer = last text BEFORE the terminal tool marker; earlier text → reasoning block; later text → discarded
    - Runtime gate relaxation when retrieval has hit-noise (BM25 false positives): drop the "must be no-data" check; trust the model to judge relevance
    - User-message threading through researcher context: brief is the dispatch instruction, userMessage is the disambiguation context — both passed, both sanitized at the boundary
    - Token-OR'd role matching in `getPerson`: split on whitespace, drop stop-words, OR each remaining token via Prisma `contains` with `mode: 'insensitive'` — multi-word role queries match partial stored roles

key-files:
  created:
    - apps/api/src/modules/chat/chat.controller.ts (NEW — chat-v1 controller mirroring all 6 routes from ChatV2Controller; same DTOs, same response shape)
    - apps/api/src/modules/chat-v2/fast-lookup-recipes.ts (deterministic recipe identifier — pure regex+string matching, no LLM)
    - apps/api/src/modules/chat-v2/fast-lookup.service.ts (executes recipes against getPerson / mockOps / getChecklist; returns null on miss for fall-through)
  modified:
    - apps/api/src/types/chat-tools.ts (+`deep_research` in TOOL_NAMES + TOOL_INPUT_SCHEMAS + TOOL_DEFINITIONS — venueId + question, 8-2000 chars)
    - apps/api/src/modules/chat/tool-dispatcher.ts (+ ChatV2Service injection; + `case 'deep_research'` wrapping `chatV2.sendMessage` with cross-tenant guard + structured error capture)
    - apps/api/src/modules/chat/system-prompt.ts (new rule 15 framing deep_research as last-resort; rule-0 wording softened on record_kb_gap gate to permit lenient flow when BM25 returns tangential matches)
    - apps/api/src/modules/chat/ai-sdk-tools.ts (record_kb_gap second gate dropped — only requires find_knowledge has been called this turn)
    - apps/api/src/modules/chat/gm-agent.ts (stopWhen extended with `hasToolCall('suggest_followups')`)
    - apps/api/src/modules/chat/chat.module.ts (registers `ChatController`)
    - apps/api/src/modules/chat-v2/chat-v2.module.ts (deregisters `ChatV2Controller`; exports `ConversationService` for cross-module use)
    - apps/api/src/modules/chat-v2/researchers/{docs,ops,people,tabular,venue}.researcher.ts (userMessage threaded into the user-content message; sanitized at boundary)
    - apps/api/src/modules/chat-v2/chat-v2.service.ts (3 ResearchContext callsites updated with userMessage; deterministic fast-path branch added in both sendMessage + streamMessage)
    - apps/api/src/modules/chat-v2/tools/get-person.tool.ts (tokenized role query — OR-match on whitespace-split tokens with stop-word filter)
    - apps/web/src/components/chat/chat-message.tsx (answer-selection rewrite: terminal-tool-bounded considered range; tool-chip labels for 5 new tools)
  deleted:
    - none (chat-v1 module preserved; ChatV2Controller file kept for now, just deregistered)

key-decisions:
  - "Multi-agent default was the wrong architecture for the bar context. UAT exposed 15-30s latency on plain lookups that should be 1-2s. Decision (today): revive chat-v1's single-Sonnet ToolLoopAgent as default, demote the chat-v2 multi-agent pipeline to a `deep_research` tool the default agent calls only when retrieval has truly failed AND cross-source synthesis is needed."
  - "Tasks 1-5 (chat-v1 deletion + WhatsApp migration + chatV2Enabled column drop) were completed as planned. We did NOT delete the chat-v1 module body (Task 6) at the time, which turned out to be load-bearing — the pivot today required it intact. The 'never delete the working thing until the new thing has soaked under load' instinct paid off."
  - "ChatV2Controller file kept on disk but deregistered (no @Controller binding). Cleaner than deleting because: (a) the multimodal validator + DTOs live alongside it and are reused by the new ChatController; (b) the file documents the chat-v2 surface in case we revive it later; (c) revert-by-git-revert is one commit instead of recreating files."
  - "record_kb_gap second gate (must-be-no-data) was too strict for production retrieval. BM25 returns tangential matches for almost any query — 'flat pint' surfaces the opening checklist via shared keywords. Blocking record_kb_gap on those false-positive hits trapped the model with no path to the lenient flow → wishy-washy meta answers. Trust the model on relevance now; runtime only requires find_knowledge has been called."
  - "Frontend bug had two layers: (1) the model emitted a text part AFTER `suggest_followups` (Sonnet sometimes restates after terminal tool); (2) the rendering treated the LAST text part as the answer, demoting earlier good text into the reasoning block. Fixed both: stopWhen makes post-terminal text structurally impossible going forward; rendering rewrites picks the last text BEFORE `suggest_followups` as the answer for legacy persisted messages."
  - "WhatsApp consumer NOT reverted today. WhatsApp inbound still goes through ChatV2Service (task 4 migration). Rationale: WhatsApp UX is sync-and-forget (operator sends a question, gets a reply minutes later — latency budget different); the chat-v1 default applies primarily to web `/chat/*` where realtime UX matters. Asymmetry flagged as deferred clean-up; not a blocker for closing 06."

patterns-established:
  - "Default = simple single-call agent with direct tools. Multi-agent is a TOOL, not a default surface. If a question genuinely needs cross-source synthesis, the model opts in via deep_research; the chip clearly labels it 'Running deep research'. Operators see when the slow path runs and why."
  - "Terminal tool = hard loop terminator in stopWhen. `save_knowledge_doc` (destructive write) and `suggest_followups` (turn-end signal) both end the loop. Post-terminal text is structurally impossible; UI doesn't have to defend against it for new turns."
  - "Considered-range rendering for tool-loop agents: identify the terminal tool index; the visible answer is the last text BEFORE that index; earlier text → reasoning; later text → discarded. Robust against streaming intermediates AND post-terminal junk."
  - "When a runtime gate is too strict for production retrieval noise, prefer relaxing the gate over hardening retrieval. The system prompt teaches the model the right behaviour; the gate is belt-and-braces. False-positive blocks are worse than false-positive admissions."
  - "Preserve old paths until new paths have soaked under real load. Tasks 1-5 cut over to chat-v2; we kept chat-v1 source intact; the cutover broke under UAT; revert was one controller-swap away. The 'always have a working fallback' discipline saved this phase."

duration: ~5 days (tasks 1-5: 2026-04-30 to 2026-05-01; hot-fix series: 2026-05-01 to 2026-05-02)
started: 2026-04-30
completed: 2026-05-02
---

# Phase 6 Plan 04: Full chat-v1 deletion + WhatsApp migration → architectural pivot

**Tasks 1-5 (cutover to chat-v2) shipped as planned: streaming + conversations + WhatsApp migration + chatV2Enabled column drop + probe-eval expansion. Real-Anthropic UAT then exposed the multi-agent pipeline was the wrong default for a hospitality bar — 15-30s for plain lookups that should be 1-2s, fragile streaming UX with answer-text being wiped and replaced as the model emitted multiple text parts. Series of latency/compatibility hot-fixes (Triage schema, Analyser bounds, fast-path regex pre-classifier, timeout extension, generateObject→generateText) softened it but didn't fix the architecture. Final pivot (`6e8a0d5`): chat-v1's single-Sonnet ToolLoopAgent restored as the default for all `/chat/*` routes; chat-v2's multi-agent pipeline demoted to a `deep_research` tool the default agent calls as a fallback. Frontend rewrite of answer-selection logic + backend stopWhen extension fixes the streaming wipe-and-replace bug at source. Net UX: "Who is the cellar engineer" 1-2s; "flat pint complaint" 2-5s with stable answer area; deep multi-source synthesis still 15-30s but only when explicitly opted in via a labelled tool chip.**

## Performance

| Metric | Value |
|--------|-------|
| Total duration | ~5 days (2026-04-30 to 2026-05-02) |
| Tasks 1-5 (cutover) | ~36 hours, atomic commits |
| Hot-fix series | 6 commits, 2026-05-01 to 2026-05-02 |
| Pivot commit | `6e8a0d5` (2026-05-02) |
| Files created | 3 (`chat.controller.ts`, `fast-lookup-recipes.ts`, `fast-lookup.service.ts`) |
| Files modified | 12 (controllers, modules, dispatcher, system prompt, gm-agent, 5 researchers, get-person tool, chat-v2 service, frontend chat-message) |
| Files deleted | 0 (chat-v1 source preserved end-to-end — load-bearing on the pivot) |
| Build | typecheck clean (api + web) at every commit; orval client + swagger.json regenerated by pre-commit on the pivot |

## Acceptance Criteria Results

The original AC table (chat-v1 fully deleted, WhatsApp migrated, column dropped, probe-eval ≥80%, manual UAT ≥18/20) was the framing for tasks 1-5. UAT under real-Anthropic load showed the cutover passed the technical gates but failed the **product** gate — the chat felt slow and unstable to use. The pivot inverts the architecture rather than chasing more hot-fixes.

| Original AC | Status | Notes |
|-------------|--------|-------|
| AC-1: chat-v2 absorbs all chat-v1 surface area (1 multimodal endpoint, 1 streaming, 3 conversation, WhatsApp) | Pass (then partially reverted) | Tasks 1-4 shipped; pivot reverts the web `/chat/*` consumer back to chat-v1; WhatsApp consumer still on chat-v2 (deferred clean-up) |
| AC-2: chatV2Enabled column dropped via Prisma migration | Pass | Task 5 (`0ff5b76`); column gone, chat-v1 / chat-v2 routing now controller-level not DB-level |
| AC-3: chat-v1 module deleted | NOT done | Task 6 was never executed — the pivot needed chat-v1 intact. Module preserved, now actively used as the default again. |
| AC-4: probe-eval extended to 12-query harness | Pass | Task 5 commit (`0ff5b76`) |
| AC-5: probe-eval pass-rate ≥80% on 12-query harness | Pass on chat-v2 | Achieved on the multi-agent path that's now demoted. The default chat-v1 path was already at parity from prior phases. |
| AC-6: Manual UAT ≥18/20 amazing + zero shit on canary venue | **Fail (chat-v2)** → **Pass (chat-v1 restored)** | Real-Anthropic UAT on chat-v2 surfaced 15-30s latency, streaming wipe-and-replace, fragile retrieval gating. User feedback "imagine I'm working in the bar, I just get stuck on thinking for 20 seconds" drove the pivot. Post-pivot UAT on the restored chat-v1 default + new fixes: passes. |

**Phase-level outcome:** technical ACs largely passed; product AC failed under real load → architecture pivoted; product AC now passes on the new shape.

## Accomplishments

- **Tasks 1-5 cutover shipped end-to-end** — multimodal endpoint, streaming endpoint, conversations endpoints, WhatsApp consumer, column drop, probe-eval extension. Each commit atomic, each task independently revertable. The cutover technical work was correct; the architectural premise it served (multi-agent as default) was wrong.
- **Six latency/compatibility hot-fixes against the multi-agent path** — Triage schema partialRecord→explicit-keys for Anthropic compat, AnalyserOutputSchema number-bounds, Triage fast-path regex pre-classifier (skip Anthropic on known patterns), TRIAGE_TIMEOUT_MS 5s→12s + TOTAL_TURN_TIMEOUT_MS 35s→45s, Analyser+Critic generateObject→generateText (latency), deterministic FastLookupService for structured-entity lookups (residual optimisation on the now-rare deep_research path).
- **Architectural pivot landed in one commit** — `6e8a0d5`. Single commit reroutes the entire web `/chat/*` surface from ChatV2Controller back to a new ChatController that delegates to chat-v1's ChatService. Reversible by `git revert` if the pivot itself proves wrong. Reuses chat-v2's ConversationService (now exported), DTOs, multimodal validator — no duplication.
- **Frontend wipe-and-replace bug fixed at TWO layers** — backend `stopWhen` extension makes post-terminal text impossible going forward; frontend rendering picks the last text BEFORE the terminal tool as the answer (legacy persisted messages render correctly without DB cleanup).
- **`deep_research` tool plumbing** — registered in TOOL_NAMES / TOOL_INPUT_SCHEMAS / TOOL_DEFINITIONS; ToolDispatcher case wraps `ChatV2Service.sendMessage` with cross-tenant guard mirroring `find_knowledge`; system-prompt rule 15 frames it as last-resort with concrete eligibility criteria (find_knowledge + rephrase + crossVenue all returned no-data AND the question genuinely needs cross-source synthesis). Sonnet's mental model now: simple agent first, deep pipeline only when retrieval has truly failed.
- **`record_kb_gap` runtime gate softened** — second gate (must-be-no-data) dropped because BM25 false positives were trapping the model with no escape into the lenient flow. Now requires only that find_knowledge has been called this turn. The "flat pint complaint" answer that drove the user's most pointed UX complaint now lands as a clean general-industry response with the gap flagged for the GM to fill in — exactly the lenient-bucket flow the prompt has always described.
- **Surgical fixes on the deep_research path** — `userMessage` threaded through ResearchContext to all 5 researchers (the LLM-researcher now sees the user's actual phrasing, not just the generic Triage brief); `getPerson` tokenizes role queries so "cellar engineer" matches "Gas Engineer". These improvements still benefit the rare deep_research invocations.
- **Phase-level pivot validated by user feedback** — "Commit everything, seems so much better at last." End of session UAT confirms the new shape feels right for the bar context.

## Hot-fix Commit Trail

| Commit | Type | Description |
|--------|------|-------------|
| `7ea77bf` | task 2 | streaming endpoint on chat-v2 (audit-AC2, D-06-04-A) |
| `27b5256` | task 3 | conversations on chat-v2 (audit-AC3) |
| `313831a` | task 4 | WhatsApp migration + chat-v1 controller cutover (audit-AC4) |
| `0ff5b76` | task 5 | drop chatV2Enabled column + extend probe-eval to 12 (audit-AC6, AC9) |
| `3aaf2c7` | hot-fix | Triage schema partialRecord→explicit-keys (Anthropic compat) |
| `4c09293` | hot-fix | TRIAGE_TIMEOUT_MS 5s→12s, TOTAL_TURN_TIMEOUT_MS 35s→45s |
| `fe582b4` | hot-fix | AnalyserOutputSchema number-bounds (Anthropic compat) |
| `ec9617e` | hot-fix | Triage fast-path regex pre-classifier (skip Anthropic on known patterns) |
| `4876a51` | hot-fix | Analyser+Critic switch generateObject→generateText (latency) |
| `6e8a0d5` | hot-fix (PIVOT) | revive chat-v1 ToolLoopAgent as default; chat-v2 demoted to deep_research tool; stopWhen + answer-selection rewrites |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Pivot architecture: chat-v1 ToolLoopAgent default; chat-v2 → `deep_research` tool | Real-Anthropic UAT exposed 15-30s latency on plain lookups, fragile streaming UX. The multi-agent default treats every turn as a multi-source synthesis problem when 90%+ are simple lookups. Single-call agent + direct tools is the right shape; multi-agent is the right escalation. | Web /chat/* latency drops to 1-5s for the common case; deep_research preserves the multi-agent capability for the rare hard case |
| Keep chat-v1 module intact rather than deleting (Task 6 not executed) | Original plan called for `rm -rf apps/api/src/modules/chat/` after the gate. The gate technically passed; the product gate didn't. Without chat-v1's source, the pivot would have required a from-scratch rewrite — instead it's a controller-swap. | "Always have a working fallback" pays for itself when the new path fails under load |
| Defer WhatsApp consumer reversion | Tasks 4 migrated `whatsapp.service.ts` to ChatV2Service. WhatsApp UX is sync-and-forget — operator sends a message, gets a reply later. Latency budget is different from realtime web chat. Asymmetry is acceptable in the short term. | Logged as deferred clean-up; resolution should also flip WhatsApp back to ChatService for symmetry. Not a blocker. |
| Keep `ChatV2Controller` file on disk, just deregister | The DTOs + multimodal validator + image upload handler are reused by the new ChatController. Deleting the file forks duplicate code; deregistering keeps the imports working. Also documents the chat-v2 surface for any future revival. | One commit to revive (re-add @Controller registration); cleaner than recreate-from-deletion |
| Drop `record_kb_gap` second runtime gate (must-be-no-data) | BM25 surfaces tangential keyword matches for almost any query. Blocking record_kb_gap on false-positive hits traps the model in a meta answer. Trust the model's judgement on relevance; the system prompt already teaches the right behaviour. | Lenient no-data flow now reachable in production; "flat pint complaint" answer lands cleanly |
| Frontend renders considered-range from terminal tool, not from "last tool call" | Sonnet sometimes emits text AFTER `suggest_followups` (turn-terminal). Initial fix used "last tool call" as the boundary — but that meant suggest_followups itself created the boundary, putting the structured answer BEFORE it (correctly) and the post-terminal junk AFTER it (and rendered as the answer — wrong). Correct boundary is the terminal-tool index specifically. | Visible answer is always the last text before turn-end; post-terminal junk silently discarded |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Tasks completed as planned | 5 of 6 | Tasks 1-5 shipped; Task 6 (rm chat-v1 module) intentionally not executed |
| Architecture pivots | 1 (major) | Multi-agent demoted from default to a tool; chat-v1 restored as default |
| Hot-fixes | 6 | Compat fixes for real-Anthropic + the architectural pivot itself |
| New deferred items | 2 | WhatsApp consumer reversion; chat-v2 dead-code cleanup (FastLookupService is now on a near-dead path) |

### Architectural pivot

**Origin:** Real-Anthropic UAT after task-5 completion exposed end-to-end latency that didn't exist in stub-mode probe runs. Even after 5 latency-targeted hot-fixes (timeout extension, fast-path regex, generateObject→generateText, schema compat), the floor was 15-20s for any reasoning/incident turn — the model genuinely needs Triage + Researchers + Analyser + Writer LLM round-trips. User feedback "imagine I'm working in the bar, I just get stuck on thinking for 20 seconds" made it clear no amount of pipeline tuning would close the UX gap.

**Resolution:** Restore chat-v1's single-call ToolLoopAgent shape as the default; preserve the chat-v2 pipeline as a `deep_research` tool. The multi-agent work from 06-01/02/03 isn't wasted — it's now a callable specialty service that the default agent reaches for when retrieval truly fails. Phase-level outcome: the multi-agent thesis is partially-validated (works for genuinely-deep questions) but rejected as a default surface.

### Deferred Items

| ID | Description | Concrete Trigger |
|----|-------------|------------------|
| D-06-04-A (NEW) | WhatsApp consumer still on ChatV2Service; web /chat is on chat-v1 | Either WhatsApp turns start showing the same UX issues OR consistency review tightens the asymmetry |
| D-06-04-B (NEW) | chat-v2 fast-path service / fast-lookup-recipes — built earlier in the session as a band-aid for the multi-agent default; harmless dead code on the now-rare deep_research path | Cleanup PR after a soak period confirms deep_research is genuinely rare. Could simply delete the FastLookupService + recipes file. |
| D-06-04-C (NEW) | ChatV2Controller file kept on disk but deregistered | Either revive (re-add @Controller binding) if pivot proves wrong, or delete after 30-day soak |

Carry-forward from 06-01 / 06-02 / 06-03: D-06-01-A through N (excl. closed); D-06-02-G through N; D-06-03-A through D — all unchanged. D-06-G ("Feature-flag cutover with empirical quality gate + 2-week soak") was superseded twice — first by "bin the flag, fully migrate" (2026-05-01), then by the architectural pivot (2026-05-02). Closed.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Real-Anthropic UAT exposed 15-30s latency on multi-agent default that didn't show in stub-mode probes | 5 latency hot-fixes softened it; final architectural pivot eliminated the latency floor for the common case |
| Sonnet emits text AFTER `suggest_followups` (turn-terminal tool) — UI rendered post-terminal junk as the answer | Backend stopWhen + frontend considered-range rendering both fix it; the two layers cover legacy persisted messages too |
| `record_kb_gap` runtime gate too strict — BM25 surfaces tangential matches for almost any query, trapping the model in a meta-answer fallback | Drop the second gate; trust model judgement on relevance |
| `getPerson` exact role match misses obvious near-matches ("cellar engineer" → "Gas Engineer") | Tokenize role queries; OR-match each token via Prisma `contains insensitive` |
| Researchers receive a generic Triage brief without the user's actual phrasing — `findPerson({ role: "engineer" })` runs even when the user said "ice machine engineer" | Thread `userMessage` through `ResearchContext` to all 5 researchers; the LLM sees both brief AND user message in its prompt |
| The user's repeated frustration cycle — "still seems shit" → "purely the best?" → multiple re-architecture attempts in one session | The session itself was the diagnosis loop. Final pivot landed only after building 3 different fast-path strategies that each addressed a symptom. The architectural answer (chat-v1 default) was visible only after the cumulative evidence. Lesson: when symptoms keep returning under different fixes, the architecture is wrong, not the implementation. |

## Next Phase Readiness

**Phase 06 closes here.** The multi-agent overhaul thesis was tested under real-Anthropic load and partially-rejected. The pipeline is preserved as a tool. Web /chat is on the v1 default. WhatsApp asymmetry deferred. Deep cleanup deferred.

**Ready for 06-05 (UI surface — streaming role transitions / general-advice badge / /debug/costs):**
- Streaming role transition events still emit on the deep_research code path; the UI work narrows to "tool chip for deep_research" + the existing find_knowledge / direct-tool chips (the chat-message.tsx tool-chip mapping is already updated in this commit)
- /debug/costs telemetry still applies; fewer hits because the multi-agent path is rare. Per-researcher cost logs from 06-03 (D-06-03-A) still relevant for the deep_research path; structural breakdown deferral is still appropriate.
- General-advice badge logic from 06-04 plan was tied to the Analyser confidence threshold; on the chat-v1 default path there's no Analyser. Either retire the badge or move the trigger logic to chat-v1's own confidence heuristic (system-prompt rule 1 + record_kb_gap). Recommend retiring; the lenient-flow prose ("Check with another team member to confirm") already conveys the same caveat.

**Concerns:**
- WhatsApp consumer asymmetry — D-06-04-A. Should be cleaned up but not phase-blocking.
- chat-v2 dead-code accumulation — D-06-04-B. The FastLookupService + recipes I built earlier in the session are now on a near-dead path. Harmless but adds maintenance surface. Cleanup PR after soak.
- WhatsApp inbound on chat-v2 hasn't been UAT'd against real customer messages on the multi-agent path. If WhatsApp UX surfaces the same latency issues web did, will need a similar pivot.
- The `deep_research` tool's eligibility prompt (rule 15) is the load-bearing instruction that prevents the model from over-using it. Worth telemetry checking the first month: count of deep_research invocations vs total turns. Target: <5%. If it's higher, either the model is over-eager or the eligibility prompt needs tightening.

**Blockers:** None for closing 06.

**Skill audit:** No `.paul/SPECIAL-FLOWS.md` present — skill audit not applicable.

---

## Post-summary fold (2026-05-03)

Two follow-on commits landed after this SUMMARY was written. Folded into Phase 6 closure rather than spawning new plans, per user direction "fold it, call any of the chat stuff done too":

- **f124697** — chat agent: rebuild loop for snap-answer agentic behaviour. Tightened ToolLoopAgent stop conditions and tool-pick heuristics on the now-default chat-v1 path. Behavioural tuning, no architectural change.
- **d752a0b** — multi-file upload with venue auto-detection + paginated library with URL-state filters. Adds batch upload UI, ClassifierService venue auto-detection (≥0.75 confidence), cursor-based pagination on `/documents` API with server-side filtering, JSONB `pendingTypeProposal` null-handling fix via `jsonb_typeof`, nuqs URL-state filters in LibraryTab. Adjacent to chat work; v0.2 Phase 4 (Dynamic Document Intelligence) is already closed so this rolls into Phase 6 close rather than retroactively re-opening it.

**Phase 6 status: CLOSED.** 06-05 (UI surface — streaming role transitions / general-advice badge / /debug/costs) deferred to v0.4 with trigger: "deep_research path graduates from rare-fallback to common-path, OR operator demand for cost telemetry surfaces." Role-transition events still emit on the deep_research code path but the UI for them is not load-bearing on the chat-v1 default surface.

---
*Phase: 06-multi-agent-chat-overhaul, Plan: 04*
*Closed: 2026-05-02 — phase ends with architectural pivot; multi-agent preserved as `deep_research` tool, chat-v1 ToolLoopAgent restored as default*
*Folded: 2026-05-03 — f124697 + d752a0b absorbed; 06-05 deferred to v0.4*
