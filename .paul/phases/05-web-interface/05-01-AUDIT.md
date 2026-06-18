# Enterprise Plan Audit Report

**Plan:** .paul/phases/05-web-interface/05-01-PLAN.md
**Audited:** 2026-04-18 21:30
**Verdict:** Conditionally acceptable pre-fix, **enterprise-ready post-fix**.

---

## 1. Executive Verdict

Pre-audit, the plan was **conditionally acceptable** — well-structured, good task decomposition, faithful reuse of existing Phase 4 services — but it shipped three release-blocking gaps that would be embarrassing at a real audit:

1. **Open CORS on a Claude-spending endpoint.** `app.enableCors()` with no origin constraint means any third-party site could initiate chat sessions from a user's browser session and burn tokens against the account.
2. **No cross-tenant protection on `GET /chat/conversations/:id`.** Any client who guesses a conversation UUID could exfiltrate another tenant's entire chat history. Even in a POC with no auth, cross-tenant data exposure is an audit-defence failure.
3. **No body-parser size limit.** Default Express 100 KB limit gives a ~92 KB DOS window on a Claude-spending endpoint. The 8000-char Zod cap runs *after* the body is fully read.

Post-audit, all three are closed. The plan now:
- Allowlists CORS origins via `WEB_ORIGIN` env (defaults to `http://localhost:3000`).
- Scopes `GET /chat/conversations/:id?venueId=…` and returns 404 (not 403) on cross-tenant mismatch to avoid enumeration leaks.
- Enforces a 32 KB body-parser limit with a 413 assertion in the probe.

The plan is **enterprise-ready post-fix** and I would sign my name to it.

## 2. What Is Solid (Do Not Change)

- **Vertical-slice Plan 05-01 split** — isolating the HTTP surface from the UI before any UI code lands means Plan 05-02 can be probe-tested continuously without spinning up a browser. This was the right routing decision.
- **ZodValidationPipe centralisation** — reusing existing `@gm-ai/types` Zod schemas at the controller boundary rather than re-defining is exactly the right DRY call and keeps ChatService's internal trust boundary intact as belt-and-braces.
- **Non-circular module composition** — deliberately NOT calling SuggestionsService from ChatController avoids a circular DI between `ChatModule` and `SuggestionsModule`. UI parallelism (`Promise.all`) pays the roundtrip cost cheaply since suggestions are <100ms.
- **Phase 4 services under strict DO-NOT-CHANGE boundary** — controllers adapt to services, not the reverse. Phase 4 hardening survives untouched.
- **`fetch`-based probe (no supertest)** — zero new deps; matches the project's `probe:*` + `nest build && node dist/src/scripts/…` pattern from 04-01/04-02/04-03.

## 3. Enterprise Gaps Identified

### Release-blocking
1. **Open CORS** — `app.enableCors()` with no origin. Browser-side token theft / credit burn is a real risk on an unauthenticated Claude-spending API, even at POC stage.
2. **GET /chat/conversations/:id has no tenant scoping** — Cross-tenant history exfiltration via guessed UUID. Would fail a real audit's "cross-tenant data access" test.
3. **No explicit body-parser limit** — Default 100 KB vs. 8 KB schema cap leaves a DOS window.
4. **Error envelope drift risk** — Each controller free-styles its `HttpException` bodies; UI in 05-02 would end up with per-endpoint error handling. No canonical `ApiErrorResponse` type.
5. **Whitespace-only `userMessage` passes Zod `min(1)`** — `"   "` reaches ChatService, gets persisted, spends a Claude call. Cheap to fix with `.trim()`.
6. **Probe assertion gaps:** no test for valid-UUID-but-nonexistent venueId (404 path), no test for cross-tenant GET on conversations, no test for malformed GET query, no test for oversize body, no test for CORS allowlist behaviour.
7. **Probe DB bloat across runs** — no pre/post cleanup, which would accumulate hundreds of probe conversations over development. Plan 04-03 ran into exactly this after APPLY; pre-empt.
8. **Fragile service-error translation** — substring-regex matching inline in the controller means ChatService wording drift silently returns 500 instead of the expected 404/400. Should be localized to one translation helper and covered by a probe assertion.

### Strongly-recommended
9. **No request-ID correlation** — grep-debugging a single chat call across `chat.claude_call` / `adaptation.*` / `http.request` logs would require timestamp matching. One middleware fixes this.
10. **No HTTP access logging** — services log their internals, but no controller-level `{method, path, status, latencyMs}` log. Operational blind spot.
11. **No Anthropic transient-failure tolerance in probe** — a single 429 flake fails CI. Retry-once matches the 03-02 pattern.
12. **No graceful shutdown** — `app.enableShutdownHooks()` missing; probe's port can stick on CTRL-C.
13. **AC-6 "invalid-input" branch in FeedbackController is effectively unreachable** — pipe catches malformed input first. Downgraded to defence-in-depth note.
14. **No probe cost banner** — three real Claude calls per probe run at ~$0.01–0.03. Not a blocker, but should be called out so CI runs can budget.

### Can-safely-defer
15. **Rate limiting** — deferred from 04-02/04-03 audits as "Plan 05-01 throttler." Re-deferred here with explicit trigger (public-facing deployment OR probe observes >1 req/s sustained). CORS allowlist is the interim budget protection.
16. **Streaming (SSE/WebSocket)** — post-POC.
17. **OpenAPI/Swagger** — re-evaluate only if 05-02 needs live specs.
18. **Unit tests** — probe covers integration; per project pattern, unit tests are deferred.
19. **OTel metrics** — cross-service telemetry plan.
20. **Global exception filter** — 5 endpoints don't justify the ceremony; HttpException subclasses with `ApiErrorResponse` bodies are sufficient.
21. **Idempotency keys on POST /chat/messages** — UI-layer double-submit guard in 05-02 is cheaper.
22. **Degraded-state flag in SendChatMessageResponse** — requires a change to ChatService which this plan's boundary protects; raise as 05-02 scope item.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Open CORS on Claude-spending API | frontmatter + Task 1 + new AC-8 + boundaries SCOPE LIMITS | Main.ts added to files_modified; Task 1 specifies `WEB_ORIGIN`-driven allowlist with explicit `origin` callback, credentials:true, methods, allowedHeaders; new AC-8 covers allowed-origin 200 + blocked-origin 403/no-header; verify step adds `curl -H 'Origin:'` checks |
| 2 | GET /chat/conversations/:id cross-tenant exposure | AC-3 + Task 2 | AC-3 now requires `?venueId=<UUID>` query, returns 404 (NOT 403) on mismatch to avoid enumeration; Task 2 spec adds `GetConversationQuerySchema` in @gm-ai/types/api.ts and venueId match check in the controller |
| 3 | No body-parser size limit | Task 1 + new AC-9 | Task 1 specifies `app.use(json({ limit: '32kb' }))` BEFORE controllers; new AC-9 requires 413 before Zod runs on 64 KB payload; Task 3 assertion A19 covers 40 KB POST |
| 4 | Error envelope drift | Task 2 + new AC-10 + packages/types/src/api.ts | Added `ApiErrorResponse` + `API_ERROR_CODES` closed set to api.ts; AC-10 mandates every 4xx matches this shape; Task 3 assertion A20 validates every 4xx body against the closed set |
| 5 | Whitespace-only userMessage passes validation | AC-4 + Task 2 (`userMessageField`) | Zod schema centralised as `userMessageField = z.string().trim().min(1).max(8000)`; AC-4 adds `"   "` → 400 expectation; probe A9b covers |
| 6 | Probe missing valid-UUID-but-nonexistent venueId | AC-4 + Task 3 | AC-4 adds 404 expectation; probe A9c asserts `body.error === 'venue-not-found'` |
| 7 | Probe DB bloat across runs | Task 3 | Pre-test cleanup + post-test cleanup by `channel='probe-api'` marker; FK-safe delete chain; preflight aborts on missing seed data |
| 8 | Fragile inline service-error translation | Task 2 + `apps/api/src/common/translate-chat-error.ts` | New single-source-of-truth helper; all ChatService catches route through it; verification adds grep check that regex strings live only in this one file |
| 9 | Cross-tenant GET probe coverage | Task 3 | Assertions A8, A8b, A8c, A8d cover random-UUID/cross-tenant/missing-query/malformed-query paths |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Request-ID correlation | Task 1 (`request-id.middleware.ts`) + new AC-11 | X-Request-Id middleware generates UUID if missing, echoes inbound value; probe A21/A22 verifies |
| 2 | HTTP access logging | Task 1 (`http-logger.middleware.ts`) + AC-11 | `http.request` JSON log on `res.finish`; PII rule: never log body/query/param values |
| 3 | Anthropic transient-failure tolerance | Task 3 | `sendWithRetry()` retries once on 429/5xx per Plan 03-02 pattern |
| 4 | Graceful shutdown | Task 1 (main.ts) + Task 3 | `app.enableShutdownHooks()` + SIGINT/SIGTERM handlers in probe so port :3099 always frees |
| 5 | Probe cost banner | Task 3 | "probe-api issues ~3 Claude calls per run (~$0.01–0.03)" printed at start |
| 6 | AC-6 invalid-input defence-in-depth | Task 2 | Marked explicitly as defence-in-depth, not primary path; comment in controller documents that pipe catches first |
| 7 | ZodValidationPipe factory helper | Task 1 (`zod-pipe.ts`) | Added `zodPipe(schema)` factory; all Task 2 controllers use `@Body(zodPipe(Schema))` |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | HTTP rate limiting | POC scope; CORS allowlist is interim budget protection. Trigger: public-facing deployment OR probe observes >1 req/s sustained. Plan 05-01 boundaries explicitly re-defer. |
| 2 | Streaming (SSE/WebSocket) | Post-POC. PROJECT.md lists streaming as out of POC scope. |
| 3 | OpenAPI/Swagger | Re-evaluate if Plan 05-02 UI tooling benefits from live specs; 5 endpoints don't justify the ceremony. |
| 4 | Unit tests | probe-api covers integration; project pattern per STATE.md across Phases 1–4 is integration-first. |
| 5 | OTel metrics | Cross-service telemetry plan, triggered post-POC. |
| 6 | Global exception filter | HttpException subclasses with `ApiErrorResponse` bodies are sufficient for 5 endpoints. Revisit at >15 endpoints or when adding custom error paths. |
| 7 | Idempotency keys on POST /chat/messages | UI double-submit guard in 05-02 is cheaper (disabled-while-pending button). Revisit if public-facing. |
| 8 | Degraded-state flag in SendChatMessageResponse | Requires ChatService change (boundary-protected in this plan). Raise as Plan 05-02 UX signal item. |
| 9 | Statement_timeout / HNSW index | Already deferred from Phase 3 audits; unchanged. |

## 5. Audit & Compliance Readiness

**Post-fix posture:**
- **Defensible evidence:** `http.request` log + service-level logs correlated via `requestId` support full post-incident reconstruction. Every 4xx has a closed-set error code. Every chat call has per-round `chat.claude_call` cost/latency signal (inherited from Phase 4).
- **Silent-failure prevention:** probe-api asserts the failure paths (cross-tenant, malformed, nonexistent) that real auditors test. Service-error translation regex lives in one file with a grep-check verification step; wording drift triggers A9c/A10 failure.
- **Post-incident reconstruction:** `requestId` propagates from browser → controller → services. Supports "show me everything that happened during this conversation" forensic queries.
- **PII / tenant stance:** Matches Plan 03-03 + 04-02 — no userMessage, messageId, or venueId values in logs. Controllers + middleware grep-enforced. CORS allowlist is the only browser-side budget protection pre-auth.
- **Ownership:** Plan authorship clear (PAUL project state); Phase 4 boundaries explicit; changes to Phase 4 are flagged via the translate-chat-error helper's regex coverage.

**Remaining risks if shipped as-is:**
- No rate limiting — explicitly deferred with named trigger.
- No auth — POC scope; CORS allowlist is the interim control.
- Per-request ZodValidationPipe instances are wasteful (`new` per call), but this is negligible at POC scale and easy to optimize later.

**Would fail a real audit on:** rate limiting + auth. Both are accepted risks at POC scope with named deferral triggers and change-management paths.

## 6. Final Release Bar

**Must be true before this plan ships (post-fix):**
- All 22 probe-api assertions pass twice in a row on a seeded DB (pre/post-cleanup verified).
- CORS allowlist reads `WEB_ORIGIN` env; defaults to `http://localhost:3000` only; grep confirms no `origin: '*'` or `origin: true` anywhere.
- Every 4xx response body conforms to `ApiErrorResponse`; closed-set `API_ERROR_CODES` enforced via probe A20.
- `http.request` logs emit with `requestId` field; grep confirms zero userMessage/messageId/venueId values in logs.
- SIGINT frees the probe port within 2 seconds.
- `translateChatServiceError` is the ONLY file in `apps/api/src` matching the ChatService error regex strings (grep-verified).

**Remaining risks if shipped as-is:**
- Rate limiting deferred — one compromised developer laptop with the `WEB_ORIGIN` set to their dev server could burn Claude credit. Mitigated by per-account Anthropic spend caps (out-of-band).
- Per-request pipe instantiation is wasteful — negligible at POC load, revisit if throughput grows.

**Would I sign my name to this system post-fix:** Yes.

---

**Summary:** Applied 9 must-have + 7 strongly-recommended upgrades. Deferred 9 items (all with explicit triggers or scope-owners).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
