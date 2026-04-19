---
phase: 05-web-interface
plan: 01
subsystem: api
tags: [nestjs, rest, zod, cors, middleware, validation, error-envelope, express, prisma]

# Dependency graph
requires:
  - phase: 04-chat-engine
    provides: [ChatService, SuggestionsService, AdaptationService, ToolDispatcher]
  - phase: 03-retrieval-layer
    provides: [KnowledgeRetrievalService, MockOpsService, ToolResult contract]
  - phase: 01-project-foundation
    provides: [Prisma Venue/ChatConversation/ChatMessage/MessageFeedback schema]
provides:
  - REST surface for chat flow (POST /chat/messages, GET /chat/conversations/:id?venueId)
  - REST surface for suggestions (POST /suggestions/on-open, POST /suggestions/on-turn)
  - REST surface for feedback (POST /feedback)
  - REST surface for venues list (GET /venues)
  - ZodValidationPipe + zodPipe(schema) factory reused at every request boundary
  - Canonical ApiErrorResponse envelope with closed API_ERROR_CODES set
  - translateChatServiceError single-source error-string translation helper
  - requestIdMiddleware + httpLoggerMiddleware (PII-safe http.request log events)
  - probe:api end-to-end harness (29 assertions, pre/post cleanup, SIGINT handlers)
affects: [05-02 chat UI, 05-03 debug panel, post-POC auth/rate-limit plans]

# Tech tracking
tech-stack:
  added: [express (direct dep of apps/api)]
  patterns:
    - "@HttpCode(200) on every POST handler to keep AC/wire-contract consistent"
    - "zodPipe(schema) factory at every @Body/@Query/@Param"
    - "Single-source error translation via translateChatServiceError"
    - "CORS allowlist via WEB_ORIGIN env (defaults http://localhost:3000)"
    - "Body parser 32kb limit before validation"
    - "GET /chat/conversations/:id?venueId=… returns 404 (not 403) on cross-tenant mismatch"
    - "probe:api cleanup keyed on channel='probe-api' marker"

key-files:
  created:
    - apps/api/src/common/zod-pipe.ts
    - apps/api/src/common/request-id.middleware.ts
    - apps/api/src/common/http-logger.middleware.ts
    - apps/api/src/common/translate-chat-error.ts
    - apps/api/src/modules/venues/venues.service.ts
    - apps/api/src/modules/venues/venues.controller.ts
    - apps/api/src/modules/venues/venues.module.ts
    - apps/api/src/modules/chat/chat.controller.ts
    - apps/api/src/modules/suggestions/suggestions.controller.ts
    - apps/api/src/modules/adaptation/feedback.controller.ts
    - apps/api/src/scripts/probe-api.ts
    - packages/types/src/api.ts
  modified:
    - apps/api/src/main.ts
    - apps/api/src/app.module.ts
    - apps/api/src/modules/chat/chat.module.ts
    - apps/api/src/modules/suggestions/suggestions.module.ts
    - apps/api/src/modules/adaptation/adaptation.module.ts
    - apps/api/package.json
    - packages/types/src/index.ts

key-decisions:
  - "POSTs pin status to 200 via @HttpCode(200) — Nest default 201 contradicts AC gherkins and the UI contract"
  - "Controllers translate ChatService Error.message via regex in ONE file only (translate-chat-error.ts); grep-verified"
  - "Cross-tenant GET responds 404 (not 403) to avoid resource-enumeration leak"
  - "CORS callback uses cb(null, false) on rejected origins — no ACAO header, no 500 for non-browser clients"
  - "Probe script tags its own conversations with channel='probe-api' so pre/post cleanup is surgical"
  - "express declared as direct dep of apps/api (pnpm isolation doesn't expose transitive @nestjs/platform-express peer)"

patterns-established:
  - "Every @Body / @Query / @Param on a new controller uses zodPipe(Schema) — no inline schemas, no Nest built-in pipes"
  - "Every 4xx response body conforms to ApiErrorResponse = { error: ApiErrorCode; details?: unknown } from @gm-ai/types"
  - "Every POST that wraps an existing service decorates with @HttpCode(200)"
  - "Main.ts middleware order: CORS → json(limit) → requestId → httpLogger → shutdownHooks"
  - "New probe scripts live in apps/api/src/scripts/ + expose probe:* via package.json + bootstrap NestFactory.create with the same main.ts config + register SIGINT/SIGTERM + try/finally app.close()"

# Metrics
duration: ~50min
started: 2026-04-18T21:30:00Z
completed: 2026-04-18T21:45:00Z
---

# Phase 5 Plan 01: API Controllers Summary

**Phase 4 services (chat, suggestions, adaptation) + a new venues read-model now reach the browser via a hardened REST surface — allowlist CORS, 32kb body cap, canonical `ApiErrorResponse` envelope, tenant-scoped conversation fetch, request-ID correlation — verified end-to-end by a 29-assertion probe that runs in <15s with pre/post cleanup.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~50 minutes (PLAN 10m + AUDIT 10m + APPLY 30m incl. 3 deviation fixes) |
| Started | 2026-04-18T21:30:00Z |
| Completed | 2026-04-18T21:45:00Z |
| Tasks | 3/3 completed (all PASS on first qualify after deviation fixes) |
| Files created | 12 |
| Files modified | 7 |
| Probe runs | 2 × 29/29 (pre/post cleanup verified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Venues list endpoint | Pass | probe A1–A3; DTO corrected mid-APPLY to match real Venue schema (address/type/timezone) |
| AC-2: Chat send-message persists full turn | Pass | probe A4–A6 (both returned 200 with UUID conversationId + content + DB counts of 2→4) |
| AC-3: Chat conversation fetch tenant-scoped | Pass | probe A7 (happy path) + A8/A8b/A8c/A8d (random-UUID, cross-tenant, missing query, malformed query) |
| AC-4: Input validation + cross-tenant preflight | Pass | probe A9 (malformed venueId), A9b (whitespace-only userMessage), A9c (nonexistent venueId → 404), A10 (cross-tenant conversationId) |
| AC-5: Suggestions return ProactiveSuggestion[] | Pass | probe A11 (on-open shape) + A12 (on-turn below-par severity) |
| AC-6: Feedback wraps captureFeedback | Pass | probe A13 (up:enqueuedCount=0), A14 (down:dbKind=down), A15 (not-found), A16 (invalid), A16b (not-assistant-message) |
| AC-7: probe-api asserts all endpoints end-to-end | Pass | 29/29 twice consecutively (pre/post cleanup verified); A22 assertions target from plan ≤ actual 29 |
| AC-8: CORS origin allowlist | Pass | probe A17 (localhost:3000 allowed) + A18 (attacker.example rejected, no ACAO) |
| AC-9: Body parser size limit | Pass | probe A19 (40 KB POST → 413 before Zod runs) |
| AC-10: Consistent error envelope | Pass | probe A20 (every 4xx body has error ∈ API_ERROR_CODES) |
| AC-11: Request-ID + HTTP access log | Pass | probe A21 (UUID generated when missing) + A22 (inbound value echoed) |

## Accomplishments

- **Hardened HTTP surface ships in a single PR shape** — CORS allowlist, 32kb body cap, canonical error envelope, tenant-scoped conversation read, X-Request-Id middleware, PII-safe HTTP access logs — all covered by one probe.
- **Single-source error translation** — `translateChatServiceError` centralises every regex that maps ChatService throws to HTTP status codes; grep confirms no duplicate regexes elsewhere.
- **DB-safe probe** — `channel='probe-api'` marker lets the harness run twice in a row without DB bloat; FK-safe cleanup chain (retag_queue → feedback → messages → conversations) mirrors the pattern established in Plan 04-03.
- **Contract-typed DTOs published via @gm-ai/types/api** — Plan 05-02 will import `SendChatMessageRequest`, `ConversationResponse`, `FeedbackResponse`, `ApiErrorResponse` directly; no per-endpoint UI error handling drift.

## Task Commits

Atomic commits deferred (repo auto_commit is false per config.md). All changes live on the working tree and are ready for a Phase 5 phase-transition commit.

| Task | Description |
|------|-------------|
| Task 1: ZodValidationPipe + middleware + VenuesController | 7 files created; main.ts + app.module.ts edited; build clean in 33ms |
| Task 2: ChatController + SuggestionsController + FeedbackController + shared DTOs | 7 files touched; build clean in 30ms; canonical ApiErrorResponse wired through every controller |
| Task 3: probe-api.ts + package.json script | 2 files touched; 29/29 green on two consecutive runs |

## Files Created/Modified

### Created

| File | Purpose |
|------|---------|
| `apps/api/src/common/zod-pipe.ts` | `ZodValidationPipe<T>` + `zodPipe(schema)` factory; throws `BadRequestException({ error: 'invalid-input', details })` on safeParse failure |
| `apps/api/src/common/request-id.middleware.ts` | Generates UUID v4 if X-Request-Id missing; echoes inbound header; attaches `req.requestId` for downstream consumers |
| `apps/api/src/common/http-logger.middleware.ts` | Emits `http.request` JSON log (requestId, method, path, status, latencyMs, ip) on `res.finish`; never logs body/query/param VALUES |
| `apps/api/src/common/translate-chat-error.ts` | Single-source regex translation for ChatService throws → typed HttpException with ApiErrorResponse body |
| `apps/api/src/modules/venues/venues.service.ts` | `list()` returns `VenueListItem[]` via `prisma.venue.findMany({ select: { id, name, address, type, timezone } })` |
| `apps/api/src/modules/venues/venues.controller.ts` | `GET /venues` |
| `apps/api/src/modules/venues/venues.module.ts` | Standard Nest module (controllers, providers, exports) |
| `apps/api/src/modules/chat/chat.controller.ts` | `POST /chat/messages` + `GET /chat/conversations/:id?venueId=`; translates ChatService throws; returns 404 (not 403) on cross-tenant mismatch |
| `apps/api/src/modules/suggestions/suggestions.controller.ts` | `POST /suggestions/on-open` + `POST /suggestions/on-turn`; both @HttpCode(200) |
| `apps/api/src/modules/adaptation/feedback.controller.ts` | `POST /feedback`; maps `ok:false` union variants to 404/400 with ApiErrorResponse body |
| `apps/api/src/scripts/probe-api.ts` | NestFactory on :3099; 29 HTTP assertions; pre/post cleanup; SIGINT/SIGTERM handlers; retry-once on 429/5xx |
| `packages/types/src/api.ts` | UUID_RE, API_ERROR_CODES, ApiErrorResponse, userMessageField refinement, all request Zod schemas, all response TS types |

### Modified

| File | Change |
|------|--------|
| `apps/api/src/main.ts` | Replaced `app.enableCors()` with WEB_ORIGIN-driven allowlist; added `json({ limit: '32kb' })`; wired requestIdMiddleware + httpLoggerMiddleware; `app.enableShutdownHooks()` |
| `apps/api/src/app.module.ts` | + VenuesModule import |
| `apps/api/src/modules/chat/chat.module.ts` | + ChatController in controllers |
| `apps/api/src/modules/suggestions/suggestions.module.ts` | + SuggestionsController in controllers |
| `apps/api/src/modules/adaptation/adaptation.module.ts` | + FeedbackController in controllers |
| `apps/api/package.json` | + express (direct dep) + probe:api script |
| `packages/types/src/index.ts` | + `export * from './api'` |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `@HttpCode(200)` on every POST handler | Nest default 201 Created contradicts AC gherkins' "200" contract and will confuse UI error handling in 05-02 | All 5 POSTs now return 200; established the "POST POSTs as 200 unless truly creating a resource" pattern for Phase 5 |
| `express` added as direct dep of apps/api | pnpm's strict isolation doesn't expose the transitive peer from @nestjs/platform-express at runtime — same failure shape as Plan 04-01's zod direct-dep fix | Any future apps/api code that imports from 'express' (middleware types, body parser) can do so safely; establishes the pattern |
| VenueListItem DTO uses `{address,type,timezone}` not `{city,channels}` | Planned DTO didn't match the actual Phase 1 Venue schema (seeder has no city/channels columns) — caught at first probe run | UI venue selector in 05-02 will show address instead of city; no additional schema change; audit-defensible because the deviation is documented and probe-verified |
| CORS rejection uses `cb(null, false)` not `cb(new Error(...), false)` | Erroring on rejected origins returns a 500 to non-browser clients and produces noisy logs; `cb(null, false)` omits ACAO cleanly so browsers block while non-browser agents see normal responses | Cleaner failure mode for rejected origins; probe A18 passes by checking header absence, not status |
| GET /chat/conversations/:id + ?venueId returns 404 on tenant mismatch (NOT 403) | 403 leaks resource existence across tenants; 404 is indistinguishable from "this conversation doesn't exist anywhere" | Closes cross-tenant enumeration attack; probe A8b specifically validates this |
| Probe tags conversations with `channel='probe-api'` post-create | ChatService defaults `channel='web'`; we need a cleanup marker without changing Phase 4 code | Extra UPDATE per probe conversation (~3 queries per run); zero Phase 4 code drift |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 3 | All caught on first probe run, all fixed with minimal scope changes |
| Scope additions | 0 | - |
| Deferred | 0 | Audit-level deferrals already captured in AUDIT.md |

**Total impact:** Three essential fixes, no scope creep. All three are patterns future phases will inherit.

### Auto-fixed Issues

**1. [dependencies] `express` not resolvable at runtime from apps/api**
- **Found during:** Task 3 first probe run
- **Issue:** `Error: Cannot find module 'express'` — pnpm's isolated hoisting doesn't expose @nestjs/platform-express's peer to apps/api's own node_modules
- **Fix:** Added `"express": "latest"` to apps/api/package.json dependencies; ran `pnpm install --filter api`
- **Files:** apps/api/package.json
- **Verification:** Probe re-ran; module resolved; subsequent assertions proceeded
- **Pattern established:** Any workspace app that imports from 'express' directly must declare it as a direct dep — same rule as Plan 04-01's zod fix

**2. [schema-contract] VenueListItem DTO vs actual Venue columns**
- **Found during:** Task 1 verify (probe's GET /venues)
- **Issue:** Planned DTO had `{id, name, city, channels}`; Phase 1 schema has `{id, name, address, type, timezone}`. Prisma emitted a `PrismaClientValidationError: Unknown field 'city' for select statement on model 'Venue'`
- **Fix:** Updated `VenueListItem` in `packages/types/src/api.ts` + `venues.service.ts` select + rebuilt @gm-ai/types
- **Files:** packages/types/src/api.ts, apps/api/src/modules/venues/venues.service.ts, apps/api/src/modules/venues/venues.controller.ts
- **Verification:** Probe A1/A2/A3 pass; schema + DTO + controller return type all consistent
- **Pattern established:** DTO contracts in @gm-ai/types must match Prisma select shapes 1:1; treat schema.prisma as the canonical source

**3. [http-contract] Nest POST default 201 vs AC spec 200**
- **Found during:** Task 3 first full probe run (all 5 POST assertions failed with status=201)
- **Issue:** AC-2/AC-5/AC-6 gherkins specify "200" but Nest's default for `@Post()` is 201 Created
- **Fix:** Added `@HttpCode(200)` to `sendMessage`, `onOpen`, `onTurn`, `captureFeedback` handlers
- **Files:** apps/api/src/modules/chat/chat.controller.ts, apps/api/src/modules/suggestions/suggestions.controller.ts, apps/api/src/modules/adaptation/feedback.controller.ts
- **Verification:** All 5 POSTs now return 200; probe 29/29 green
- **Pattern established:** POST handlers that wrap existing services (as opposed to creating new resources) decorate with `@HttpCode(200)` to keep the wire contract explicit

### Deferred Items

None added during APPLY. All deferrals were documented during the pre-APPLY enterprise audit (05-01-AUDIT.md — 9 items with explicit triggers).

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| First probe run: express module not found | Added express as direct dep per pnpm isolation rule |
| First probe run: Prisma validation error on `city` field | Corrected VenueListItem DTO to match actual Venue columns (address/type/timezone) |
| First full probe run: 5 POSTs returning 201 instead of 200 | Added @HttpCode(200) decorator to all POST handlers |

## Next Phase Readiness

**Ready:**
- HTTP surface fully typed + contract-enforced; 05-02 can import request Zod schemas and response TS types directly from `@gm-ai/types`
- `ApiErrorResponse` contract established — 05-02 error-state UI has one shape to handle
- `requestId` middleware wired; 05-02 can include X-Request-Id in its fetch headers for forensic correlation across browser → API → services
- probe:api enforces every endpoint's happy and unhappy path — UI refactors can't silently break the wire
- Pattern templates for Plan 05-02: zodPipe usage, @HttpCode(200) on POSTs, @gm-ai/types import path
- CORS default allows http://localhost:3000 out of the box; Next.js 05-02 dev server lands on exactly this origin

**Concerns:**
- HTTP rate limiting still deferred — public-facing deployment should NOT happen before this is added (named trigger in boundaries)
- `express` is now a direct dep; any version bump of @nestjs/platform-express should verify express compat (minor follow-up)
- `degraded` state flag in SendChatMessageResponse remains deferred — Plan 05-02 UX must decide how to distinguish a real Claude answer from ChatService's fallback text (currently indistinguishable at the HTTP layer)

**Blockers:**
- None.

---
*Phase: 05-web-interface, Plan: 01*
*Completed: 2026-04-18*
