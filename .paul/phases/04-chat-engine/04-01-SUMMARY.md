---
phase: 04-chat-engine
plan: 01
subsystem: chat
tags: [claude-tool-use, nestjs, zod, anthropic-sdk, prisma, knowledge-retrieval, conversation-persistence, observability]

requires:
  - phase: 03-retrieval-layer
    provides: RetrievalService.find (ToolResult<RetrievalHit[]>), MockOpsService (4 methods), RetrievalModule re-exports MockOpsModule
  - phase: 02-embeddings-seeding
    provides: @gm-ai/database (prisma singleton), load-env bootstrap, swc compile pattern
  - phase: 01-foundation
    provides: @gm-ai/types (runtime-emitted dist with Zod schemas), ChatConversation + ChatMessage models

provides:
  - TOOL_DEFINITIONS (Anthropic-compatible 5-tool JSON) + TOOL_INPUT_SCHEMAS (Zod) + TOOL_NAMES in @gm-ai/types
  - CHAT_SYSTEM_PROMPT (single source of truth)
  - ToolDispatcher (Injectable router with Zod validation, structured error logging)
  - ChatService.sendMessage (Claude tool-use loop, 6-round cap, venue-context injection, error-fallback, per-round observability)
  - ChatModule (exports ChatService + ToolDispatcher for 04-02 composition)
  - probe-chat (3 end-to-end live conversations + DB re-read assertions)
affects: [04-02-proactive-suggestions, 04-03-adaptation-loop, 05-01-web-chat-ui, 05-02-debug-panel]

tech-stack:
  added: [zod@4 (direct dep of apps/api; was previously only reachable via @gm-ai/types)]
  patterns:
    - Contextual system prompt per call — CHAT_SYSTEM_PROMPT + <current_context>venueId, venueName</current_context>
    - Tool contract lives in @gm-ai/types; service methods stay in apps/api — cross-boundary contract vs. implementation
    - ToolResult envelopes are tool_result content for Claude — fail('no-data') / fail('error') / ok(data) serialized as-is
    - Every Claude call emits chat.claude_call metadata-only log; every error path has a named event (chat.anthropic_error, chat.empty_assistant_text, chat.tool_loop_capped, tool_dispatch.error)

key-files:
  created:
    - packages/types/src/chat-tools.ts
    - apps/api/src/modules/chat/chat.module.ts
    - apps/api/src/modules/chat/chat.service.ts
    - apps/api/src/modules/chat/tool-dispatcher.ts
    - apps/api/src/modules/chat/system-prompt.ts
    - apps/api/src/scripts/probe-chat.ts
    - .paul/phases/04-chat-engine/04-01-AUDIT.md
  modified:
    - packages/types/src/index.ts (barrel)
    - apps/api/src/app.module.ts (register ChatModule)
    - apps/api/package.json (add zod + probe:chat script)

key-decisions:
  - "Loose UUID regex (not z.string().uuid()) — Zod 4 strict-validates version bits; seed UUIDs don't conform"
  - "Zod as direct dep of apps/api — pnpm hoisting doesn't expose @gm-ai/types' transitive zod at runtime"
  - "Venue context injected into system prompt per call — Claude calls ops tools with venueId without asking the user"
  - "ChatModule exports ToolDispatcher — Plan 04-02 (proactive) reuses dispatcher, no duplicated routing"
  - "Try/catch around the entire tool-use loop — every user turn gets a paired assistant outcome, no orphan rows"

patterns-established:
  - "Per-round observability log: { event: 'chat.claude_call', conversationId, round, stop_reason, input_tokens, output_tokens, latency_ms } — metadata only, never content"
  - "sendMessage input Zod guard + venue preflight + conversation preflight run BEFORE any DB write or Anthropic call"
  - "Deterministic history ordering: orderBy [createdAt asc, id asc] — collision-safe turn order"
  - "Probe DB re-read pattern: after in-memory return assertions, fetch persisted row and verify the JSON columns match what the caller got back"

duration: 60min
started: 2026-04-18T18:55:00Z
completed: 2026-04-18T19:55:00Z
---

# Phase 4 Plan 01: Chat Engine Core (Claude Tool-Use Loop + Conversation Persistence) Summary

**Shipped the `ChatService.sendMessage(conversationId?, venueId, userMessage) → { conversationId, assistantMessage, toolCallLog, retrievedItemIds }` pipeline: a Claude `messages.create` loop that executes the 5 Phase-3 tools (find_knowledge, get_stock_below_par, get_stock_by_name, get_supplier_by_name, get_upcoming_cutoffs) with parallel tool_use blocks per round, a 6-round audit cap, venue context injected into the system prompt per call, and every turn persisted to chat_conversations + chat_messages with retrievedItemIds + toolCallLog as first-class provenance columns.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~60 min (APPLY only; audit + hardening in prior session) |
| Started | 2026-04-18T18:55:00Z |
| Completed | 2026-04-18T19:55:00Z |
| Tasks | 4 completed |
| Files created | 7 (6 source + 1 audit) |
| Files modified | 3 |
| Probe checks | 15 new + 26 regression (all pass) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Tool definitions published from @gm-ai/types | Pass | `dist/chat-tools.{js,d.ts}` emitted; TOOL_DEFINITIONS.length=5, TOOL_INPUT_SCHEMAS keys=5 verified via node require |
| AC-2: ToolDispatcher validates and routes tool calls | Pass | safeParse before service call; unknown tool → fail('not-supported'); bad input → fail('error', zod message); exception → fail('error', message) + structured `tool_dispatch.error` log |
| AC-3: ChatService runs the tool-use loop and persists conversations | Pass | Venue-context injection confirmed live (c2 called `get_stock_below_par` without asking for venueId); Zod guard + venue + conversation preflights all active; try/catch wraps loop; deterministic history order; `chat.claude_call` / `chat.anthropic_error` / `chat.empty_assistant_text` / `chat.tool_loop_capped` events all emittable |
| AC-4: probe-chat verifies 3 end-to-end conversations with persistence | Pass | 15/15 checks: c1 SOP content cited verbatim ("Error code E2 means the ice full sensor is stuck"), c2 11 below-par products returned, c3 honest no-data phrasing; all 3 DB re-reads (toolCallLog length + retrievedItemIds equality) match returned values; cleanup verified: chat_conversations = 0 after probe |

## Accomplishments

- **Agentic chat loop live end-to-end.** Claude received the 5 tools, chose `find_knowledge` for knowledge questions and `get_stock_below_par` for ops questions, and declined honestly on the no-data case — all in one probe run, first post-fix attempt.
- **Venue-context injection proved at runtime.** Without it, probe c2 would hard-fail because Claude has no way to map "the Crown" → VENUE_CROWN UUID. With it, zero "which venue?" clarifications in 15/15 probe checks.
- **Audit trail is load-bearing, not cosmetic.** Every turn persists (user + assistant rows), assistant row carries `retrievedItemIds` + `toolCallLog` JSON, and the probe re-reads from Postgres to prove the write landed — not just that the return value looked right. Plan 04-03's adaptation loop now has the exact input signal it needs.
- **Observability scaffolding in place from day one.** `chat.claude_call` (per round, metadata-only), `chat.anthropic_error`, `chat.empty_assistant_text`, `chat.tool_loop_capped`, `tool_dispatch.error` — five named events with structured payloads, zero PII leakage.

## Task Commits

No git commits in this session (auto_commit disabled in config; manual commit pending user request). Task-level changes tracked via file state.

| Task | Outcome | Files |
|------|---------|-------|
| Task 1: Tool definitions + Zod input schemas in @gm-ai/types | Pass | `packages/types/src/chat-tools.ts` (created), `packages/types/src/index.ts` (barrel) |
| Task 2: ToolDispatcher + ChatModule + system prompt | Pass | `apps/api/src/modules/chat/{chat.module,tool-dispatcher,system-prompt}.ts` (created) |
| Task 3: ChatService with tool-use loop + conversation persistence | Pass | `apps/api/src/modules/chat/chat.service.ts` (created), `apps/api/src/app.module.ts` (wired), `apps/api/package.json` (zod dep) |
| Task 4: probe-chat script | Pass | `apps/api/src/scripts/probe-chat.ts` (created), `apps/api/package.json` (probe:chat script) |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/types/src/chat-tools.ts` | Created | 5 TOOL_DEFINITIONS (Anthropic JSON) + 5 TOOL_INPUT_SCHEMAS (Zod) + TOOL_NAMES union |
| `packages/types/src/index.ts` | Modified | Barrel — `export * from './chat-tools'` |
| `apps/api/src/modules/chat/chat.module.ts` | Created | Wires RetrievalModule (re-exports MockOpsModule); exports ChatService + ToolDispatcher |
| `apps/api/src/modules/chat/system-prompt.ts` | Created | CHAT_SYSTEM_PROMPT with 6 hard rules (no-data honesty, tool discipline, venueId-from-context) |
| `apps/api/src/modules/chat/tool-dispatcher.ts` | Created | Zod-validates + routes to RetrievalService/MockOpsService; logs `tool_dispatch.error` on exception |
| `apps/api/src/modules/chat/chat.service.ts` | Created | Claude tool-use loop with venue context, Zod input guard, try/catch fallback, per-round observability |
| `apps/api/src/app.module.ts` | Modified | Registered ChatModule |
| `apps/api/src/scripts/probe-chat.ts` | Created | 3 live conversations + 15 assertions including DB re-read verification |
| `apps/api/package.json` | Modified | Added `zod` dep + `probe:chat` script |
| `.paul/phases/04-chat-engine/04-01-AUDIT.md` | Created | Enterprise audit report (6 must-have + 4 strongly-recommended applied, 7 deferred) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Loose UUID regex (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) instead of `z.string().uuid()` | Zod 4 strict-validates UUID version nibble; seed UUIDs (`a1000000-…`, `d0000000-…`) have `0` in the version field and are rejected. Matches existing retrieval + mock-ops regex pattern. | Any future @gm-ai/types schema consuming a seed UUID must use the same loose regex; never use `z.string().uuid()` on seed data |
| Zod as direct dep of `apps/api` (not relying on @gm-ai/types transitive) | pnpm's hoisting rules don't expose a workspace package's deps in sibling packages at runtime without explicit declaration. @gm-ai/types exports Zod schemas; apps/api imports `z` directly to declare SendMessageInputSchema. | Any future workspace package importing `z` directly must also declare zod as a direct dep |
| ChatModule exports `ToolDispatcher` in addition to `ChatService` | Plan 04-02 (proactive suggestions) needs to fire tool calls on non-user events; reusing dispatcher avoids duplicating the Zod+routing layer | 04-02 composes by importing ChatModule + injecting ToolDispatcher |
| Contextual system prompt built per call, not stored | `venueId` + `venueName` change per request; baking them into the static CHAT_SYSTEM_PROMPT would couple it to request lifecycle | CHAT_SYSTEM_PROMPT stays a plain exported string that 04-02 can import and extend without per-call state |
| Try/catch wraps entire tool-use loop, not individual Claude calls | Partial `toolCallLog` on error is more useful than nothing; single fallback path is simpler than per-round recovery | On Anthropic 5xx/rate-limit, assistant message persists with whatever tool trail accumulated + fallback text |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential — probe would not run without them |
| Scope additions | 1 | ChatModule exports ToolDispatcher (explicit seam for 04-02, matches plan intent) |
| Deferred | 0 new | All audit-deferred items already tracked |

### Auto-fixed Issues

**1. [Validation] Zod 4 strict `.uuid()` rejects seed UUIDs**
- **Found during:** Task 4 (probe-chat runtime)
- **Issue:** First probe run threw `invalid sendMessage input: Invalid UUID` at ChatService entry before any Anthropic call. Seed UUIDs have `0` in the version nibble (e.g. `a1000000-0000-0000-0000-000000000001`) and don't match any UUID v1-v5 spec.
- **Fix:** Replaced `z.string().uuid()` in both `packages/types/src/chat-tools.ts` (TOOL_INPUT_SCHEMAS UUID helper) and `apps/api/src/modules/chat/chat.service.ts` (SendMessageInputSchema) with `z.string().regex(UUID_RE, 'invalid uuid')` using the same regex as retrieval + mock-ops.
- **Files:** `packages/types/src/chat-tools.ts`, `apps/api/src/modules/chat/chat.service.ts`
- **Verification:** Re-ran `pnpm --filter api probe:chat` → 15/15 pass; `pnpm --filter api probe:retrieval` still 9/9 (same regex so no regression).

**2. [Dependency] Zod not directly resolvable from apps/api at runtime**
- **Found during:** Task 3 (chat.service.ts import `from 'zod'`)
- **Issue:** Pre-installation `ls apps/api/node_modules/zod` returned "No such file". pnpm's strict hoisting model does not expose a workspace package's deps in sibling packages unless they're declared directly.
- **Fix:** Added `"zod": "latest"` to `apps/api/package.json` dependencies; ran `pnpm install --filter api`; confirmed `apps/api/node_modules/zod/index.cjs` now exists.
- **Files:** `apps/api/package.json`
- **Verification:** `pnpm --filter api build` passes; probe-chat runs without module-not-found error.

### Deferred Items

None new — the 7 deferred items from the enterprise audit (idempotency key, rate limiting, prompt-injection hardening, conversation summarization, streaming, per-turn cost budget, probe per-conversation timeout) remain as documented in 04-01-AUDIT.md with explicit triggers/owners.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `z.string().uuid()` rejected seed UUIDs at runtime | Switched to loose regex (see Auto-fixed #1) |
| `apps/api` could not resolve `zod` at runtime | Added as direct dep (see Auto-fixed #2) |

## Next Phase Readiness

**Ready:**
- `ChatService.sendMessage` is a stable entrypoint; Plan 05-01 can wire it to a REST controller without touching the service.
- `ChatModule` exports both `ChatService` and `ToolDispatcher` — Plan 04-02 (proactive suggestions) can import and fire tool calls on non-user events without re-entering ChatService's conversation-persistence path.
- `CHAT_SYSTEM_PROMPT` + `<current_context>` pattern is extensible — Plan 04-02 can append additional directives (e.g., suggestion-mode instructions) without forking the prompt.
- `chat_messages.retrievedItemIds` + `chat_messages.toolCallLog` are live columns with real data; Plan 04-03 (adaptation loop) has the exact input signal its eval harness needs, probe-chat proves DB writes land.
- Observability hooks (`chat.claude_call` + 4 named error events) are in place — no retrofitting needed when Plan 04-03 adds cost/latency monitoring.

**Concerns:**
- No REST controller yet — chat is service-only. Plan 04-02 runs through the same service path; Plan 05-01 adds the HTTP layer. No conflict, just a sequencing note.
- No streaming — Plan 05-01 UI phase will need to decide whether streaming matters enough to refactor ChatService to `messages.stream()` or whether non-streaming UX is good enough for the POC.
- Cost per conversation is untracked (`chat.claude_call` logs tokens but nothing aggregates). Fine for POC demo; add a budget cap before any public exposure.

**Blockers:** None.

---
*Phase: 04-chat-engine, Plan: 01*
*Completed: 2026-04-18*
