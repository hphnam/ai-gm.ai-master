# Enterprise Plan Audit Report

**Plan:** `.paul/phases/04-chat-engine/04-01-PLAN.md`
**Audited:** 2026-04-18 19:35
**Verdict:** Conditionally acceptable pre-fix → **enterprise-ready post-fix**

---

## 1. Executive Verdict

**Conditionally acceptable before fixes applied; enterprise-ready after.** Plan 04-01 gets the tool-use loop architecture right (round cap, Zod at the trust boundary via ToolDispatcher, ToolResult envelopes as tool_result content, parallel execution of tool_use blocks, persistence of retrievedItemIds + toolCallLog for the 04-03 adaptation loop). But the pre-fix plan had six release-blocking gaps: one that would *cause the probe to hard-fail* (no venue context injection → Claude asks "which venue?" instead of calling `get_stock_below_par`), two that would leave the audit trail incomplete (Anthropic API failure → orphan user message with no assistant reply; empty `finalText` on non-tool-use stop_reasons), one that would false-positive-fail the probe (c3 credential regex matches any 6+ char word after "password"), and two that were hygiene at the trust boundary (no Zod on SendMessageInput, no deterministic history ordering).

Would I approve this for production as-is? **No.** Post-fix? **Yes**, with the deferred items scoped appropriately.

---

## 2. What Is Solid

- **ToolDispatcher as a pure router.** Zod validation before service call, `fail('not-supported' | 'error', …)` for unknown tools and bad input, guarded try/catch so dispatcher never throws. This is the right layering — dispatcher is the trust boundary for Claude's free-form tool input.
- **Tool contract in `@gm-ai/types`.** `TOOL_DEFINITIONS` + `TOOL_INPUT_SCHEMAS` keyed by `TOOL_NAMES`, with `satisfies Record<ToolName, z.ZodTypeAny>` forcing exhaustiveness. Any future consumer (external client, Plan 05 UI type hints) imports one source of truth.
- **System prompt as a file, not an inline string.** Plan 04-02 can import `CHAT_SYSTEM_PROMPT` and extend it without re-entering ChatService. Extension seams are deliberate.
- **Parallel tool execution per round.** `Promise.all` at the ChatService layer (not the dispatcher) is correct — dispatcher stays single-call-semantics, loop handles the fan-out.
- **Persistence of retrievedItemIds + toolCallLog per assistant message.** This is the load-bearing piece for Plan 04-03's adaptation eval harness and Plan 05's debug panel.
- **Scope discipline.** No REST controller, no streaming, no multi-venue in-conversation switching, no auth — all correctly deferred with explicit seams.
- **Probe's no-mock stance.** Live Anthropic + live Voyage + live DB is the only way to prove the end-to-end claim; matches the 03-02/03-03 probe pattern.

## 3. Enterprise Gaps Identified

Pre-fix, the plan had the following non-obvious risks:

1. **Venue context never reaches Claude.** ChatService takes `venueId` as an argument but never tells Claude what it is. The system prompt says "If the venueId isn't clear from context, ask for it before calling ops tools." The probe message "at the Crown" contains a venue name, not a UUID, and there is no venue directory in the prompt that maps name→UUID. Claude would have to either (a) ask the user for the UUID (probe fails) or (b) invent one (much worse). This is a direct bug — the probe AC-4 c2 assertion cannot pass as written.

2. **Orphan user messages on Anthropic API failure.** `this.client.messages.create` is outside any try/catch. A rate-limit 429, a 500, a transient network error, or an SDK timeout propagates out of `sendMessage` AFTER the user message has been persisted. The caller sees an exception; the DB has a user row with no paired assistant row. From a compliance standpoint, every inbound prompt must have a recorded outcome — "user asked X, system failed to respond" is a valid audit entry; a user row with nothing after it is not.

3. **Empty `finalText` on non-tool-use stop_reasons.** The plan only handles `stop_reason: 'tool_use'`. If Claude returns `end_turn` with no text blocks (rare but possible), `max_tokens` (possible when a tool result is large and Claude tries to summarize it), or `refusal` (newer SDK), `finalText` becomes `''` — we persist an empty assistant message. The UI would render blank; the audit trail would show silence.

4. **Probe c3 credential-shape regex false-positives on normal replies.** `!/password.*[a-z0-9_-]{6,}/i.test(c3.reply)` requires the reply NOT to match that pattern. A perfectly honest reply like "I don't have the wifi password for your guest network" contains `password…network` where `network` matches `[a-z0-9_-]{6,}` — the assertion false-fails. "I don't have the wifi password information in my system" same problem with `information`. The probe as written would red-flag Claude doing exactly what we want.

5. **No input validation at `sendMessage`.** A caller could pass an arbitrarily long `userMessage` (Claude's input-token limit bites, but only after spend), a non-UUID venueId (Prisma catches at the FK write, but we've already wasted a create call), or an empty string (we persist empty user content + send empty content to Claude). This is trust-boundary hygiene.

6. **History load order is not deterministic.** `orderBy: { createdAt: 'asc' }` with Postgres `now()` has microsecond precision; collisions are rare but real (two fast turns in the same tick). On collision, turn order is undefined, which means Claude sees a scrambled history and either hallucinates or refuses.

7. **No conversationId existence/ownership check.** A caller passing `conversationId: <some-other-venue's-uuid>` would silently append to another tenant's conversation (Prisma allows it — there's no scoping enforcement). This is a multi-tenancy footgun even for POC.

8. **No per-round observability.** No way to measure Claude latency, token spend, or stop_reason distribution without parsing runtime logs by hand. Plan 04-03's adaptation loop needs this to score conversations; post-incident debugging needs it to answer "why did this conversation use 6 rounds?".

9. **ToolDispatcher swallows exceptions silently.** `catch (err) { return fail('error', (err as Error).message) }` — the fail envelope lands in toolCallLog, but no structured error log fires. Post-incident forensics can't find the tool failure without grepping toolCallLog JSON blobs.

10. **Probe returns in-memory state only.** The plan's stated purpose is that 04-03 consumes the DB-persisted trail. But the probe asserts only on `SendMessageResult` return shape — it doesn't re-read the assistant message row to verify `toolCallLog` + `retrievedItemIds` actually made it to Postgres. If the Prisma `create` silently dropped the JSON column (a real class of bug with Json columns), the probe would still pass.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Venue context never reaches Claude → probe c2 hard-fails | AC-3, Task 3 action (ChatService) | Added `venue = prisma.venue.findUnique(...)` preflight; throw on missing venue; build `contextualSystemPrompt = CHAT_SYSTEM_PROMPT + '\n\n<current_context>venueId, venueName</current_context>'` per call; pass contextualSystemPrompt to `messages.create`. AC-3 Given/When/Then added. |
| 2 | Orphan user message on Anthropic API failure | AC-3, Task 3 action | Wrapped the entire tool-use loop in try/catch; on Anthropic exception, set `finalText = 'I hit an error calling the model — please retry.'`, emit structured `chat.anthropic_error` log with `rounds_completed` + message, fall through to persist the assistant row with whatever partial `toolCallLog` accumulated. AC-3 Given/When/Then added. |
| 3 | Empty `finalText` on non-tool-use stop_reason | AC-3, Task 3 action | When text blocks produce empty string, log `chat.empty_assistant_text` and default to `"I couldn't produce an answer — please retry or rephrase."`. AC-3 Given/When/Then added. |
| 4 | Probe c3 credential regex false-positives on normal replies | AC-4, Task 4 action | Removed the negative credential check entirely; widened the positive no-data regex to also match "unable to" and "contact.*(manager\|admin\|IT)". Claude is highly unlikely to invent a plausible password; positive no-data phrase is sufficient signal. |
| 5 | No input validation on `sendMessage` | AC-3, Task 3 action | Added `SendMessageInputSchema = z.object({ conversationId?.uuid, venueId.uuid, userMessage.min(1).max(8000) })`; `safeParse` at entry; throw on invalid before any DB write. AC-3 Given/When/Then added. |
| 6 | Non-deterministic history ordering | AC-3, Task 3 action | Changed `orderBy: { createdAt: 'asc' }` → `orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]` as a tiebreak. AC-3 updated, verification checkbox added. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | No conversationId existence / venueId ownership check | AC-3, Task 3 action | Added conversation preflight: when `conversationId` passed, `findUnique` and throw on missing OR if `existing.venueId !== input.venueId`. Prevents cross-tenant message injection. AC-3 Given/When/Then added. |
| 2 | No per-round Claude call observability | AC-3, Task 3 action | Added `logger.log({ event: 'chat.claude_call', conversationId, round, stop_reason, input_tokens, output_tokens, latency_ms })` per round. Metadata-only, no PII. Gives Plan 04-03's eval harness the raw signal it needs. |
| 3 | ToolDispatcher swallows exceptions silently | Task 2 action | Added `logger.error({ event: 'tool_dispatch.error', tool, message })` inside the catch block; dispatcher now has a `Logger` instance. Structured metadata, not tool input/output (those stay on toolCallLog). |
| 4 | Probe only asserts on in-memory return, not DB persistence | AC-4, Task 4 action | Added DB re-read for all three conversations after the probe runs: `prisma.chatMessage.findFirst({ role: 'assistant' })` per conversation; assert persisted `toolCallLog.length === returned.toolCallLog.length` and `retrievedItemIds` exact match. Verifies the audit trail Plan 04-03 actually consumes. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Idempotency key on `sendMessage` | Belongs at the Phase 5 controller layer (HTTP-level retry-safety). No callers today except probe, which runs serially. |
| 2 | Rate limiting + abuse controls | Post-POC, Phase 5 controller concern. No authenticated user plane yet. |
| 3 | Prompt-injection hardening (adversarial user input) | Post-POC. POC threat model is internal/trusted users; production launch will need a separate hardening plan. |
| 4 | Conversation summarization / context compression for long histories | Triggers when a single conversation approaches Claude's context window (~180k tokens). POC corpus + 6-round cap stays well under; add a dedicated plan when telemetry shows any conversation > 100 turns or > 100k tokens in history. |
| 5 | Streaming responses | Plan 05-01 UX concern. Tool-use loop on non-streaming is simpler to reason about. |
| 6 | Per-turn cost budget (auto-abort if Claude spend exceeds $X on one conversation) | Observability-driven; add once `chat.claude_call` logs accumulate enough data to set a sane threshold. |
| 7 | Probe per-conversation timeout | Live Anthropic calls rarely hang > 60s; CI timeout (e.g. 5min job cap) backs this up. Add if we ever see a hung probe in practice. |

## 5. Audit & Compliance Readiness

**Before fixes:** Would fail a real audit on three counts — (a) orphan user messages mean "complete audit trail per turn" is not truthful; (b) empty assistant content on non-tool-use stop_reasons means silent failures slip through; (c) cross-tenant conversation injection is possible via caller-supplied conversationId without ownership check.

**After fixes:**
- **Defensible evidence:** every user message has a paired assistant outcome (content + toolCallLog + retrievedItemIds + createdAt) in `chat_messages`. Every Claude call has a `chat.claude_call` log entry (round, stop_reason, tokens, latency). Every tool dispatch error has a `tool_dispatch.error` entry. Every Anthropic failure has a `chat.anthropic_error` entry with rounds_completed.
- **Silent-failure prevention:** non-tool-use empty-text paths emit `chat.empty_assistant_text`; round cap emits `chat.tool_loop_capped`; loop cap + API error paths always persist a readable fallback message (never an empty-string assistant row).
- **Post-incident reconstruction:** toolCallLog is the replayable tool-call trace; conversation history is the replayable message trace; structured logs are the latency/cost/error trace. Given a `conversationId`, the full incident can be reconstructed from three data sources.
- **Ownership:** ChatService owns the tool-use loop, toolCallLog accumulation, and assistant persistence. ToolDispatcher owns dispatch validation + routing. `@gm-ai/types` owns the tool contract. Clean domain separation; no ambiguity about where to fix what.

Remaining audit gaps (post-fix, deferred): no user-action trail (which staff member sent a message), no conversation-level retention policy, no rate limit per user. These all sit at the Phase 5 controller + auth layer.

## 6. Final Release Bar

**What must be true before this plan ships:**
1. All six must-have fixes applied to PLAN.md (✓ applied).
2. All four strongly-recommended fixes applied to PLAN.md (✓ applied).
3. `pnpm --filter api probe:chat` passes all 17 checks (original 8 + new 6 DB re-read + implicit 3 via c2 proving venue context injection works). (Verified by executor in APPLY.)
4. `pnpm --filter api probe:retrieval`, `probe:ingest`, `probe:seed` all still pass (no regression). (Verified in APPLY.)
5. Executor confirms `chat.claude_call`, `chat.anthropic_error`, `chat.empty_assistant_text`, `tool_dispatch.error` are all greppable in `chat.service.ts` / `tool-dispatcher.ts` (not just in AC text). (Verification checklist.)

**Remaining risks if shipped as-is (post-fix):**
- Prompt-injection via user message content (deferred — POC threat model).
- Cost runaway on a pathological conversation (deferred — no budget cap; rely on MAX_ROUNDS=6 + MAX_TOKENS=2048 as soft bounds).
- No retention policy on `chat_messages` — conversations persist indefinitely (intentional for 04-03 adaptation; add GDPR delete endpoint in a dedicated plan pre-launch).

**Would I sign my name to this system?** Post-fix, yes — for the stated POC scope. The deferred items are explicitly scoped with triggers or owners; they are not "we'll fix it later" hand-waves. The core audit-trail claim (every user turn has a recorded outcome with tool-call provenance) is enforced by code paths AND verified by probe DB re-reads.

---

**Summary:** Applied 6 must-have + 4 strongly-recommended upgrades. Deferred 7 items with explicit triggers.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
