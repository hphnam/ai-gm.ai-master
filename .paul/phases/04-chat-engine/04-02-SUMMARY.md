---
phase: 04-chat-engine
plan: 02
subsystem: suggestions
tags: [proactive-suggestions, nestjs, prisma, tool-dispatcher, observability, pii-safe, timeout, cross-tenant]

requires:
  - phase: 04-chat-engine
    provides: ChatModule exports ToolDispatcher + Injectable routing with Zod validation (Plan 04-01)
  - phase: 03-retrieval-layer
    provides: MockOpsService (get_stock_below_par, get_upcoming_cutoffs) via ToolResult<T> envelope (Plan 03-03)
  - phase: 02-embeddings-seeding
    provides: @gm-ai/database prisma singleton, VENUE_CROWN/VENUE_ANCHOR seed UUIDs (Plan 02-02)
  - phase: 01-foundation
    provides: @gm-ai/types dist-emitted runtime + chat_conversations/chat_messages schema (Plan 01-02)

provides:
  - ProactiveSuggestion type in @gm-ai/types (SuggestionKind 'below-par'|'cutoff', SuggestionSeverity 'info'|'warn', ToolName-typed sourceToolCall)
  - SuggestionsModule + SuggestionsService with onConversationOpen(venueId) and onTurn(venueId, userMessage, conversationId?)
  - runDispatchWithTimeout helper (3000ms, single path for all dispatcher calls in this service)
  - sanitizeText helper (control-char strip + word-boundary truncation @ 160 chars)
  - composeSuggestions pure helper (shared between both entry points — single source of truth for sort/severity/text shape)
  - Cross-tenant conversationId preflight via prisma.chatConversation.findUnique + venueId match
  - Named observability events: suggestions.generate, suggestions.tool_timeout, suggestions.both_tools_errored, suggestions.conversation_mismatch
  - probe-suggestions script with 11 AC-4 assertions + 3 invariant checks (14/14 passing)
affects: [04-03-adaptation-loop, 05-01-web-chat-ui, 05-02-debug-panel]

tech-stack:
  added: []
  patterns:
    - Non-Claude consumer of ChatModule's ToolDispatcher — establishes template for any future internal service that composes tool outputs without the Claude loop
    - Per-dispatch timeout wrapper — DISPATCH_TIMEOUT_MS = 3000, fail('error','timeout') on race loss, suggestions.tool_timeout at error level
    - Single-call generatedAt invariant — ISO-8601 timestamp computed once at method top, shared by every suggestion in the batch (internal consistency for grouping)
    - PII-safe structured logging for user-triggered turns — messageLength + stock_matched/cutoff_matched booleans only; userMessage content never logged
    - Escalation logging — suggestions.both_tools_errored at error level distinct from normal suggestions.generate so ops can alert on total degradation independently

key-files:
  created:
    - packages/types/src/proactive-suggestion.ts
    - apps/api/src/modules/suggestions/suggestions.module.ts
    - apps/api/src/modules/suggestions/suggestions.service.ts
    - apps/api/src/scripts/probe-suggestions.ts
    - .paul/phases/04-chat-engine/04-02-AUDIT.md
  modified:
    - packages/types/src/index.ts (barrel)
    - apps/api/src/app.module.ts (register SuggestionsModule)
    - apps/api/package.json (probe:suggestions script)

key-decisions:
  - "Deterministic-only composition, no Claude round-trip — honest data surfacing, deterministically testable, no cost"
  - "Non-persistent — suggestions re-derived on each call; no schema change; chat_messages stays purely dialog"
  - "SuggestionsModule imports ChatModule (not ToolDispatcher directly) — DI graph reflects true dependency (ChatModule owns the dispatcher)"
  - "runDispatchWithTimeout is the ONLY path dispatcher is invoked — grep-verified single `toolDispatcher.dispatch` call site"
  - "Cross-tenant conversationId preflight — log integrity requires verifying conversation ownership before emitting structured logs that would correlate another venue's conversationId with this venue's output"
  - "userMessage NEVER logged — only messageLength + gate-match booleans; matches Plan 03-03 retrieval PII stance"

patterns-established:
  - "For internal services consuming ToolDispatcher: always go through a timeout wrapper; never call dispatch directly"
  - "composeSuggestions-style pure helper pattern — if a service has multiple entry points that build the same output shape, extract the shape logic into a pure function to prevent drift between entrypoints"
  - "Observability payload composition: metadata-only (tool names, counts, booleans, latency, IDs); never DB free-form text; never user input"
  - "Probe fixture lifecycle — create in setUp, assert against, delete in finally; capture baselines AFTER setUp so service-level non-persistence is provably isolated from fixture creation"
  - "Probe UUID references — import from seed-data.ts, never hardcode, so a rename in seed-data is a compile error not a runtime miss"

duration: 30min
started: 2026-04-18T20:30:00Z
completed: 2026-04-18T20:45:00Z
---

# Phase 4 Plan 02: Proactive Suggestions (onConversationOpen + onTurn) Summary

**Shipped `SuggestionsService.onConversationOpen(venueId)` and `SuggestionsService.onTurn(venueId, userMessage, conversationId?)` returning `ProactiveSuggestion[]` — deterministic composition from `get_stock_below_par` + `get_upcoming_cutoffs` routed through ChatModule's `ToolDispatcher` via a 3000ms `runDispatchWithTimeout` wrapper; 14/14 probe assertions green including cross-tenant conversation preflight + WARN-severity fixture (Neck Oil IPA currentQty=0) + both-gates dedupe; zero persistence, zero Claude calls, zero new deps, userMessage content never enters any log payload.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min (APPLY only; PLAN + AUDIT in prior session block) |
| Started | 2026-04-18T20:30:00Z |
| Completed | 2026-04-18T20:45:00Z |
| Tasks | 3 completed |
| Files created | 5 (4 source + 1 audit) |
| Files modified | 3 |
| Probe assertions | 14/14 pass (11 AC-4 + 3 invariants) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: ProactiveSuggestion type published from @gm-ai/types | Pass | `dist/proactive-suggestion.{js,d.ts}` emitted; `SuggestionKind` discriminated union; `sourceToolCall.tool: ToolName` (not loose string) |
| AC-2: onConversationOpen returns deterministic suggestions | Pass | 3 below-par + 2 cutoff composed from tool outputs; single generatedAt invariant verified; fail-soft on invalid venueId; timeout wrapper + both-tools-errored escalation live |
| AC-3: onTurn gates by heuristic + preflights conversationId | Pass | STOCK_GATE + CUTOFF_GATE regexes gate tool dispatch; cross-tenant preflight via `prisma.chatConversation.findUnique` rejects ANCHOR conversationId when CROWN venueId passed; userMessage never logged |
| AC-4: probe-suggestions 11 assertions (+ invariants) | Pass | 14/14 green: AC-4 bullets 1-11 + single-timestamp invariant + non-persistence baselines on both chat_conversations and chat_messages |

## Accomplishments

- **Both entry points work end-to-end on first post-audit run.** `onConversationOpen(VENUE_CROWN)` returned 5 suggestions (3 below-par + 2 cutoff) composed from live seed data; `onTurn(…)` gated correctly across no-match / stock-only / both-gates scenarios. No retries needed.
- **Cross-tenant preflight proven at runtime.** The probe creates a real `chat_conversations` row for VENUE_ANCHOR, passes its id to `onTurn(VENUE_CROWN, …)`, asserts empty return AND logs `suggestions.conversation_mismatch` — log-integrity posture now matches Plan 03-03's retrieval PII stance.
- **WARN-severity path exercised by seed data.** Seeded `Neck Oil Session IPA` (currentQty=0) produced 1 warn suggestion out of 5 — confirms the severity rule (`currentQty === 0 ? 'warn' : 'info'`) is live, not theoretical.
- **No boundary violations.** All 8 verification greps returned empty or exactly-one-match: no Anthropic imports, no userMessage in logger calls, no direct dispatcher calls (only via `runDispatchWithTimeout`), no supplier UUID hardcoded as venueId, no chat_messages/chat_conversations writes in the module, no new npm deps. Audit's defensive posture held through execution.
- **Zero regressions on prior phases.** `probe:chat` 15/15, `probe:retrieval` 9/9, `probe:suggestions` 14/14 — the module composes cleanly without side effects.

## Task Commits

No git commits in this session (auto_commit disabled in config; manual commit pending user request). Task-level changes tracked via file state.

| Task | Outcome | Files |
|------|---------|-------|
| Task 1: ProactiveSuggestion type in @gm-ai/types | Pass | `packages/types/src/proactive-suggestion.ts` (created), `packages/types/src/index.ts` (barrel) |
| Task 2: SuggestionsModule + SuggestionsService | Pass | `apps/api/src/modules/suggestions/{suggestions.module,suggestions.service}.ts` (created), `apps/api/src/app.module.ts` (wired) |
| Task 3: probe-suggestions live probe | Pass | `apps/api/src/scripts/probe-suggestions.ts` (created), `apps/api/package.json` (probe:suggestions script) |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/types/src/proactive-suggestion.ts` | Created | ProactiveSuggestion type + SuggestionKind + SuggestionSeverity; ToolName-typed sourceToolCall |
| `packages/types/src/index.ts` | Modified | Barrel — `export * from './proactive-suggestion'` |
| `apps/api/src/modules/suggestions/suggestions.module.ts` | Created | Imports ChatModule, provides+exports SuggestionsService |
| `apps/api/src/modules/suggestions/suggestions.service.ts` | Created | Two entry points, runDispatchWithTimeout + sanitizeText + composeSuggestions helpers; 4 named observability events |
| `apps/api/src/app.module.ts` | Modified | Registered SuggestionsModule in imports array |
| `apps/api/src/scripts/probe-suggestions.ts` | Created | 14 live assertions against seeded DB; anchor fixture lifecycle (create/assert/delete) |
| `apps/api/package.json` | Modified | Added `probe:suggestions` script |
| `.paul/phases/04-chat-engine/04-02-AUDIT.md` | Created | Enterprise audit report (6 must-have + 5 strongly-recommended applied, 7 deferred) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| SuggestionsModule imports `ChatModule`, not `ToolDispatcher` directly | DI graph reflects true ownership — ChatModule provides the dispatcher (04-01 SUMMARY). Importing ChatModule is the NestJS-canonical way to consume an exported provider. | Any future module composing ToolDispatcher should import ChatModule; avoids the anti-pattern of provider-level imports |
| `runDispatchWithTimeout` is the ONLY call path to `toolDispatcher.dispatch` | Uniform timeout + error-log behavior across both entry points. Grep-verified exactly one dispatch call site in the service. | Future non-Claude consumers of ToolDispatcher should follow this pattern; direct calls bypass the observability + resilience layer |
| Non-persistence enforced at the module boundary | grep verification lists `chatMessage.create/update` and `chatConversation.create/update` — returns empty for suggestions/. Only `findUnique` (read-only) is allowed. | `chat_messages` table semantics stay pure (user + assistant turns only); suggestions are re-derivable from DB state + call time |
| `composeSuggestions` extracted as pure helper shared by both entry points | Single source of truth for sort/severity/text shape — prevents the two entry points drifting apart as the service evolves. Matches the helper-extraction pattern from Plan 03-03 (`guarded<T>()`). | Future suggestion kinds or severity rules are changed in exactly one place |
| `generatedAt` computed once per method invocation | Internal consistency — all 5 suggestions from one onConversationOpen call share one ISO timestamp; callers can group-by timestamp if needed. | Probe explicitly asserts `new Set(s.generatedAt).size === 1` for a batch |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential — probe setUp would have thrown without it |
| Scope additions | 0 | None |
| Deferred | 0 new | All audit-deferred items already tracked |

### Auto-fixed Issues

**1. [Schema] `ChatConversation` has no `title` column**
- **Found during:** Task 3 (probe-suggestions first run)
- **Issue:** Plan's Task 3 action directed the probe to create the VENUE_ANCHOR fixture with `data: { venueId, title: '[probe-suggestions] anchor fixture' }`. Prisma 7 threw `PrismaClientValidationError: Unknown argument 'title'`. Inspecting the schema confirms `ChatConversation { id, venueId, userId?, channel, createdAt, updatedAt, messages[] }` — no title field.
- **Fix:** Dropped the `title` field from the fixture creation. The row is identifiable by its returned `id` + its VENUE_ANCHOR venueId — no need for a descriptive label in a probe fixture.
- **Files:** `apps/api/src/scripts/probe-suggestions.ts`
- **Verification:** Second run of `pnpm --filter api probe:suggestions` → 14/14 pass; fixture row created + deleted cleanly; chat_conversations count unchanged before/after suggestion calls.

### Deferred Items

None new — the 7 deferred items from the enterprise audit (rate limiting → 05-01 throttler, UI pagination → 05-01, heuristic tuning → 04-03, OTel/metrics → cross-service plan, unit tests, idempotency [deterministic by construction], cost budget [N/A without Claude]) remain as documented in 04-02-AUDIT.md with explicit triggers/owners.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `title` column does not exist on ChatConversation | Dropped from fixture creation (see Auto-fixed #1) |

## Next Phase Readiness

**Ready:**
- `SuggestionsService` is injectable from any future module — Plan 05-01's web layer can wire `onConversationOpen` to a GET endpoint and `onTurn` to the chat POST handler's response without touching the service.
- `runDispatchWithTimeout` pattern is documented and grep-verified — Plan 04-03 (adaptation loop) and Plan 05-01 (controller) should adopt it for any non-Claude consumer of ToolDispatcher.
- The cross-tenant preflight pattern (`prisma.chatConversation.findUnique` with venueId check) can be reused by any service that takes `conversationId` as input — documented as a pattern in this summary's frontmatter.
- Named observability events (`suggestions.*`) are live; Plan 04-03's adaptation eval can correlate `suggestions.generate` logs with `chat.claude_call` logs via `conversationId`.
- Seed-data fixture `Neck Oil Session IPA` (currentQty=0) is a permanent WARN-severity test fixture — do not change without updating probe assertion 9.

**Concerns:**
- No HTTP surface yet. Plan 05-01 must add a controller AND a `@nestjs/throttler` guard concurrently — the audit flagged rate limiting as deferred *because* there's no public endpoint yet. If 05-01 adds a route without a throttler, that's a compliance regression.
- `onTurn` runs synchronously in the user's request path but does its own (up to 2) tool dispatches + optional DB lookup. Latency budget per turn is now `ChatService.sendMessage` + `SuggestionsService.onTurn` — if the web controller calls both sequentially, latency adds. Plan 05-01 or 04-03 should decide whether onTurn runs in parallel with the chat response or as a post-response fire-and-forget.
- Heuristic gates in onTurn may false-positive on natural language (e.g., "order of operations"). Plan 04-03's adaptation loop is the explicit owner of heuristic quality — the thumbs/regeneration signal can re-tag suggestions over time.

**Blockers:** None.

---
*Phase: 04-chat-engine, Plan: 02*
*Completed: 2026-04-18*
