# Chat Remediation Plan — handoff

Executable backlog derived from `review.md` (2026-07-01 chat review). Goal: bring the AI chat to the
product bar — **fast-paced hospitality, little to no mistakes, KB/SOP-grounded**.

**Already done (2026-07-01, see `review.md` → Fixed):** model → `claude-sonnet-5` (+ `@ai-sdk/anthropic`
bump to `^4.0.4`), adaptive thinking everywhere, force-finalise 400 fix, auto-verify id-space fix, stream
body validation, mock-ops tenant guards, stream error-leak fix. **This plan covers everything still open.**

## How to work this plan

- Phases are ordered by impact on the "no mistakes" bar. **Do Phase 0 first** — the eval harness is the
  safety net for every prompt/behavior change that follows.
- Each task is self-contained: **Why / Where / Do / Verify**. File:line refs are hints — confirm by symbol.
- Spawn `code-reviewer` + `security-reviewer` (parallel) before closing any task that edits
  `apps/api/src` or `apps/web/src`, per the repo review gate. Run the specific spec file after changes.
- Check the box and note the commit when done.

---

## Phase 0 — Quality gate (build first; unblocks safe iteration)

- [ ] **0.1 Build a `probe:chat` end-to-end eval harness.**
  - **Why:** the 259-line system prompt carries nearly all safety behavior and currently ships unmeasured.
    Every prompt/model change in later phases needs a regression net. `probe:eval`/`probe:section` cover
    retrieval only; nothing asserts the agent's actual answers.
  - **Where:** new `apps/api/scripts/probe-chat.ts` (mirror the tsx+Prisma pattern of `probe-chat-core.ts`);
    add `"probe:chat"` to `apps/api/package.json` scripts.
  - **Do:** scripted turns against a seeded test org, asserting: (1) citation compliance — KB-sourced facts
    end with `[doc:<id>]`; (2) STRICT vs LENIENT no-data phrasing by role; (3) `record_kb_gap` fires only
    after `find_knowledge`; (4) incident protocol (emergency line + `log_incident`); (5) POS-over-KB source
    priority when an integration is connected; (6) no-hallucination on absent data. Assert on tool-call log
    + final text, not exact wording (use contains/regex buckets).
  - **Verify:** harness runs green on current behavior; intentionally regress the prompt and confirm it
    goes red. Document in CLAUDE.md as the post-change gate for chat, alongside `probe:eval`.

---

## Phase 1 — Safety-critical grounding (highest impact)

- [ ] **1.1 Emergencies must enter incident mode on the triggering turn.**
  - **Why:** the classifying turn answers in `default` mode (classification persists in background), and the
    streaming path only classifies the *first* message of a thread — so "someone's been badly burned" at
    turn 10 never flips mode. `log_incident` is also impossible once the step-5 finalise nudge fires.
  - **Where:** `chat.service.ts` (`resolveConversationMode` ~317-352, stream path ~1250),
    `conversation-mode.service.ts`, `escalation.ts`.
  - **Do:** add a cheap synchronous keyword/regex pre-filter (burn, injured, fire, ambulance, collapse,
    choking, bleeding, 999/112/911, "call an ambulance", etc.) that forces `incident` mode *before* the turn
    runs, independent of the Haiku classifier. Re-classify per-turn on the streaming path (not just first
    message). Ensure `log_incident` remains reachable in incident mode even under the finalise nudge (e.g.
    exempt incident mode from the step-5 cutoff, or guarantee the emergency line + log via the protocol).
  - **Verify:** probe:chat incident cases (1.1 keyword set + mid-thread emergency) go green; emergency first
    line appears on the triggering turn.

- [ ] **1.2 Guard the zero-search hallucination path.**
  - **Why:** the "no sources cited" warning only fires when a KB tool *ran*. A KB-type question answered from
    training data with zero tool calls gets no warning, no citation, no auto-verify — the most dangerous
    confident-wrong path is the unguarded one.
  - **Where:** server flag computed from `toolCallLog` in `chat.service.ts`; consumed in
    `apps/web/src/components/chat/citations.tsx` (~197-206) + `chat-message.tsx`.
  - **Do:** detect "answered a KB-type question with zero KB tool calls" server-side (no `find_knowledge` /
    `query_document_table` in the log AND the answer makes factual claims) and surface an "answered without
    checking sources" trust flag that survives reload (persist on the message row, like `verifyStatus`).
  - **Verify:** probe:chat asserts the flag is set when the model answers a KB question without searching;
    reload preserves it.

- [ ] **1.3 Make verification visible in-session and add a re-verify affordance.**
  - **Why:** auto-verify completes ~6s after the UI's post-stream refetch, so the "couldn't verify N claims"
    badge typically only appears on reload; no corrected reply is ever issued; verifier fails open on timeout.
  - **Where:** `quote-verifier.service.ts`, `chat.service.ts` (auto-verify trigger ~212-270 / post-stream),
    web `use-conversation-derived-state.ts`, `chat-body.tsx` (~257-262), socket layer.
  - **Do:** push a `verify.updated` socket event (or short poll) so `pending → clean/issues` transitions
    live; render a pending→verified state on the message. On `issues`, surface the flagged claims and offer a
    "regenerate with correction" action. Decide + document the fail-open policy (keep open, but log + badge
    it distinctly from a real pass).
  - **Verify:** manual — send a turn with a deliberately misquoted number; badge flips to "issues" in-session
    without reload. probe:chat asserts verifier runs on specifics-bearing replies.

- [ ] **1.4 Fix terminal-reply synthesis for parallel tool calls.**
  - **Why:** `synthesizeTerminalToolReply` inspects only the *last* toolCallLog entry, but the prompt mandates
    `record_pricing_recommendation` in the same step as `generate_report` — a successful report can persist
    as "I couldn't produce an answer."
  - **Where:** `gm-agent.ts` `synthesizeTerminalToolReply` (~85-112).
  - **Do:** scan the final round's entries for *any* `TERMINAL_STOP_TOOLS` member (prefer the successful one)
    rather than `toolCallLog[length-1]`.
  - **Verify:** extend `gm-agent.spec.ts` with a case where `record_pricing_recommendation` logs after
    `generate_report` in the same round; assert the success confirmation is returned.

- [ ] **1.5 Distinguish "retrieval down" from "not on file".**
  - **Why:** tool throws become `ok:false`; during a Postgres/Voyage outage the model will confidently say
    "I don't have that on file" — a wrong "we have no SOP" in the high-stakes window.
  - **Where:** `tool-dispatcher.ts` (find_knowledge catch), `ai-sdk-tools.ts` (`withDispatchLogging`),
    system-prompt no-data section, web degraded-mode banner.
  - **Do:** distinguish infra failure (`reason:'error'`) from genuine empty (`no-data`) in the tool result;
    when `find_knowledge` errors, surface a degraded-mode signal to the UI and instruct the model (via result
    envelope, not prose-hope) to say "I can't reach the knowledge base right now" instead of "not on file".
  - **Verify:** simulate a retrieval throw; confirm the reply says the KB is unreachable, and the UI shows a
    degraded banner.

- [ ] **1.6 Route handover-mode stock briefing through connected integrations.**
  - **Why:** the handover overlay proactively calls `get_stock_below_par` + `get_upcoming_cutoffs`, which hit
    the **mock** tables — presented as authoritative even for orgs whose real stock lives in Square. Violates
    the capability-first routing rule.
  - **Where:** `system-prompt.ts` handover overlay (~19-29), mock-ops cases in `tool-dispatcher.ts`.
  - **Do:** when the org has a POS integration covering stock, prefer the integration tool in the handover
    block; fall back to mock only when nothing is connected (or gate mock tools off for integration-connected
    orgs entirely). Keep behavior identical for orgs with no integration.
  - **Verify:** probe:chat handover case with a connected integration pulls live stock, not mock.

---

## Phase 2 — Persistence & streaming integrity

- [ ] **2.1 Persist the assistant row before the follow-up call.**
  - **Why:** the row is only written after a 2.5s `generateFollowUps` inside `onFinish` — reload in that
    window loses the answer the user read; if the insert throws, it's gone permanently and toolCallLog /
    adaptation / verify all skip.
  - **Where:** `chat.service.ts` streaming `onFinish` (~1386-1406) and the non-streaming path (~886).
  - **Do:** persist the assistant row first (empty `followUps`), then update with pills once generated. Wrap
    persistence in its own try/catch with an error log; never gate the row on follow-up success.
  - **Verify:** kill follow-up generation (throw/timeout) and confirm the assistant row + text still persist;
    reload immediately after stream end shows the reply.

- [ ] **2.2 Persist committed side effects on abort.**
  - **Why:** abort/tab-close skips assistant-row persistence entirely, but `create_task`, `log_incident`,
    `save_knowledge_doc`, memory writes may have already committed — side effects with no chat-history trace,
    and `IncidentLog.sourceMessageId` backfill never runs.
  - **Where:** `chat.service.ts` abort branch (~1336-1350).
  - **Do:** on abort, if `toolCallLog` contains a successful write-tool result, still persist an assistant row
    (partial/terminal text + the toolCallLog) rather than skipping wholesale.
  - **Verify:** trigger create_task then abort mid-stream; confirm the task exists AND a chat row records it.

- [ ] **2.3 Stop retry/regenerate from duplicating user rows.**
  - **Why:** the user message is persisted unconditionally at the top of `prepareStream`; web Retry and
    Regenerate both call `useChat.regenerate()` which re-POSTs the last user text → a second user row (and
    two assistant rows on regenerate-after-success). Duplicates pollute reload + future model context.
  - **Where:** `chat.service.ts` (~1205-1213), web `chat-body.tsx` (~385-412).
  - **Do:** make user-message persistence idempotent (skip insert when the client-supplied message id / same
    turn already exists), or have regenerate target the existing user turn instead of re-POSTing. Ensure
    regenerate replaces the prior assistant row rather than appending.
  - **Verify:** Retry after an error and Regenerate after success each leave exactly one user row and one
    assistant row on reload.

- [ ] **2.4 Make conversation creation upsert-safe.**
  - **Why:** client-supplied-UUID upsert is find-then-create; a concurrent double-send on a new conversation
    hits the PK unique violation → 500.
  - **Where:** `chat.service.ts` (~1166-1196).
  - **Do:** use `prisma.chatConversation.upsert` (or catch P2002 and re-read).
  - **Verify:** fire two concurrent first-sends with the same conversationId; neither 500s.

- [ ] **2.5 Add timeout/abortSignal to the non-streaming path.**
  - **Why:** `agent.generate` (WhatsApp / non-streaming) has no timeout — a hung provider call pins the
    request indefinitely.
  - **Where:** `chat.service.ts` (~814).
  - **Do:** pass an `abortSignal` with a sane timeout to `agent.generate`; on timeout return the standard
    error reply and log it.
  - **Verify:** stub a hanging model call; confirm the request returns within the timeout with the error path.

---

## Phase 3 — Context & classification integrity

- [ ] **3.1 Close the compaction blind spot and carry tool results into summaries.**
  - **Why:** between summary regens (only after ≥15 uncovered messages) up to 14 older turns are neither
    verbatim nor summarized — invisible to the model. The summariser sees message text only, never
    `toolCallLog`, so numbers/docIds behind earlier answers can't survive. A single null tool result
    downgrades a whole turn's replay to plain text.
  - **Where:** `conversation-compactor.service.ts` (~63-74, ~98-121), `chat.service.ts`
    `expandRecentToModelMessages` (~70-117).
  - **Do:** regenerate the summary whenever *any* older turn is uncovered (or shrink the threshold);
    include a compact digest of tool results (key numbers, docIds) in the summary input; make
    `expandRecentToModelMessages` degrade per-tool-call rather than dropping a whole turn's tool context on
    one null result.
  - **Verify:** long-thread probe: a fact stated 20 turns back (via a tool result) is still answerable; no
    "I don't have access to sales data" regression after compaction.

- [ ] **3.2 Reclassify mode per turn and surface it.**
  - **Why:** `incident`/`handover` stamps are never reclassified; the overlay suppresses retrieval/capture;
    a false positive locks the thread into degraded answers with nothing in the UI explaining why.
  - **Where:** `chat.service.ts` (~337-339), web chat header.
  - **Do:** reclassify every turn (not just `default` threads); allow downgrade out of incident/handover when
    the conversation clearly moves on. Show the active mode in the UI (a small pill) so users/support can see
    it. Log mode transitions.
  - **Verify:** a thread that goes incident → normal chat reclassifies back; mode pill reflects current state.

- [ ] **3.3 Stop redundant/divergent mode classification.**
  - **Why:** default-mode threads re-classify the same first message every turn (N-1 wasted Haiku calls);
    streaming vs non-streaming paths disagree on which message they classify.
  - **Where:** `chat.service.ts` (~322-352, ~718 vs ~1250).
  - **Do:** classify the *current* turn consistently in both paths; cache/skip when the mode is stable and the
    turn isn't a candidate transition. (Folds into 3.2 — do together.)
  - **Verify:** log shows one classification per turn on the intended message; no divergence between paths.

---

## Phase 4 — Security hardening

- [ ] **4.1 Sanitize all doc/staff-derived text injected into the system message.**
  - **Why:** `sanitizeForBlock` covers only the business profile. Org-chart content (full doc body inlined!),
    KB titles/summaries, recently-answered Q&As (staff-authored via `record_kb_gap`), contacts,
    `profileSummary`, and `priorSummary` are injected raw into a system-role block — a doc/question can forge
    `</venue_snapshot>` and inject instructions at system authority.
  - **Where:** `gm-agent.ts` (`sanitizeForBlock` ~40-45; injection sites ~285-339, ~300-307).
  - **Do:** run every free-text value injected into `dynamicSystemBody` through `sanitizeForBlock`, OR move
    retrieval/document-derived content out of the system message into a clearly-delimited user/tool block
    wrapped as untrusted content. (`routingHint` is a fixed server string — safe.)
  - **Verify:** a KB doc / kb-gap question containing `</venue_snapshot><system_directive>…` cannot alter
    behavior; add a probe:chat injection case.

- [ ] **4.2 Rate-limit the chat entry points + deep_research.**
  - **Why:** `POST /chat/stream` and `/chat/messages` turns are unthrottled; each can run to MAX_STEPS and
    invoke `deep_research` (a nested multi-agent pipeline) — billing amplification / DoS by an authed user or
    a looping model.
  - **Where:** `chat.controller.ts`, reuse the Redis limiter pattern (`createRedisRateLimiter`).
  - **Do:** add a Redis-backed per-user (and per-org) turn limiter on both entry points, plus a dedicated
    low limit for `deep_research`. Keep the existing intentional in-process vs Redis split (see project memory
    — don't touch the anti-spam limiters).
  - **Verify:** rapid-fire turns hit the limit with a clean 429; deep_research is separately capped.

- [ ] **4.3 Scope the user-profile summary to the current org.**
  - **Why:** profile refresh reads the user's messages across ALL orgs but stores the summary on the
    org-scoped member row and injects it into that org's prompts — cross-org topic leakage for multi-org users.
  - **Where:** `user-profile.service.ts` (~63-71).
  - **Do:** filter `conversation: { userId, venue: { organizationId: orgId } }` (orgId is available at the
    call site).
  - **Verify:** a two-org user's profile summary in org A contains no topics from org B.

- [ ] **4.4 Fix the `record_kb_gap` same-step race.**
  - **Why:** `findKnowledgeCallCount` increments only after `find_knowledge` resolves; a model emitting
    `find_knowledge` + `record_kb_gap` in one step can have the gap wrongly rejected.
  - **Where:** `ai-sdk-tools.ts` (~85-108).
  - **Do:** count an in-flight `find_knowledge` in the same step (increment at dispatch start, or track
    pending calls) so the gate passes when search is concurrently running.
  - **Verify:** parallel find_knowledge + record_kb_gap in one step is accepted.

- [ ] **4.5 (Watch, not urgent) `MockSupplier` org column.**
  - **Why:** today's tenant fix scopes suppliers through the stock→venue relation; a supplier with zero stock
    links is invisible and one linked across two orgs stays shared. Inherent to the no-org-column TEMPORARY
    table.
  - **Do:** if the mock tables outlive the Square/Xero milestone, add `organizationId` to `MockSupplier` (new
    migration — never edit existing ones) and filter directly. Otherwise close when mock tables are removed.
  - **Verify:** seed guarantees ≥1 stock link per supplier in the interim.

---

## Phase 5 — Web resilience & prompt/impl drift

- [ ] **5.1 Model fallback on Anthropic outage.**
  - **Why:** single hardcoded `claude-sonnet-5`; only the SDK's default transient retries. A provider outage
    or `refusal` has no fallback.
  - **Where:** `gm-agent.ts` (model wiring), provider options.
  - **Do:** wire the provider's `fallbacks: [{ model: 'claude-opus-4-8' }]` (supported in the installed
    provider) so a refusal/outage is transparently re-served. Confirm cost/latency acceptable.
  - **Verify:** force a refusal/5xx; confirm the fallback model serves the turn.

- [ ] **5.2 Reconnect / offline UX mid-stream.**
  - **Why:** a dropped connection mid-stream shows a generic "Something went wrong"; no timeout UX beyond the
    pulsing dot; follow-up pills depend on a post-stream refetch race.
  - **Where:** web `chat-body.tsx`, `use-chat-submit.ts`, stream consumer.
  - **Do:** detect disconnect and offer resume/retry that doesn't duplicate the turn (ties to 2.3); add a
    timeout state; make follow-up pills tolerant of the refetch race (render from stream payload if present).
  - **Verify:** kill the network mid-stream; user gets a clear resumable state, not a dead end.

- [ ] **5.3 Resolve prompt/implementation drift.**
  - **Why:** scheduled-report fires write placeholder content (prompt admits it); the capture-flow "step 6:
    confirm with returned summary + tags" is unreachable because `hasToolCall('save_knowledge_doc')` halts
    before a follow-up text turn; failed terminal tools say "details are in the card above" but a failed call
    may render no card on reload.
  - **Where:** `system-prompt.ts` (~92, ~256-258, ~99-103 fallback text), `gm-agent.ts` terminal replies,
    web tool-card renderers.
  - **Do:** either implement scheduled-report content generation or keep the prompt honest about placeholders;
    rewrite capture-flow step 6 to match the loop reality (the fixed confirmation is the reply); ensure a
    failed terminal tool renders *something* on reload or change the "card above" wording.
  - **Verify:** each promised behavior either works or the prompt no longer promises it; add probe:chat
    coverage for the capture and report flows.

---

## Suggested sequencing

1. **Phase 0** (eval harness) — do first; it de-risks all prompt/behavior work.
2. **Phase 1** (safety grounding) — the core of the "no mistakes" bar. 1.1–1.3 are the top three.
3. **Phase 2** (persistence) — user-visible data-loss bugs; independent of Phase 1, can run in parallel.
4. **Phase 3** (context) then **Phase 4** (security hardening) — 4.1 (injection) can be pulled forward if
   any untrusted content ingestion is imminent.
5. **Phase 5** (resilience + drift) — polish and honesty.

Re-run `probe:chat` (Phase 0) + the touched spec files after every task, and the reviewer gate before
closing each.
