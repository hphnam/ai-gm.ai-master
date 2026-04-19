---
phase: 05-web-interface
plan: 03
subsystem: observability
tags: [nextjs, react-query, nestjs, prisma, debug, tenant-isolation, noindex, retention, xss-defence, accessibility]

# Dependency graph
requires:
  - phase: 05-web-interface
    provides: [apiFetch + X-Request-Id, ApiErrorResponse envelope, CORS allowlist, zodPipe factory, shadcn/ui + Tailwind v4 foundation, URL-as-state pattern, App Router error/loading conventions, mapApiError extensibility]
  - phase: 04-chat-engine
    provides: [ChatConversation/ChatMessage persistence with toolCallLog + retrievedItemIds, MessageFeedback rows, ReTagQueueItem rows with sourceMessageId FK]
  - phase: 03-retrieval-layer
    provides: [toolCallLog similarity scores persisted per find_knowledge call]
provides:
  - Read-only /debug/* surface on apps/api (3 endpoints) exposing Phase 4 provenance without re-running retrieval
  - /debug route on apps/web rendering conversation trace + re-tag queue panel with X-Request-Id correlation handle
  - Typed DTO contracts in @gm-ai/types/debug (DebugConversationResponse, DebugMessageResponse, DebugRetagQueueResponse, closed-union DebugRetagQueueCounts)
  - Runtime helper module apps/api/src/modules/debug/truncate.ts (truncateAtWord, truncateToolCallLogEntry, mapStatusCount) — keeps @gm-ai/types pure
  - Probe-api expanded from 29 → 36 assertions with cross-tenant leak guard (D5), JSON truncation contract (D6), X-Robots-Tag defence (D7)
  - apiFetchWithMeta<T>() variant returning {data, requestId} — operator log correlation on SUCCESS path, not just failure
  - Noindex defence-in-depth (Next.js metadata + X-Robots-Tag response header + amber operator warning banner)
  - 90-day retention window on conversation + message debug endpoints, encoded as RETENTION_90D_MS typed constant
  - debug.access structured log event distinguishing operator-debug from user traffic without modifying shared http logger
affects: [post-POC auth gating for operator routes, post-POC log aggregation / OTel plan, post-POC tooling plan for radix version pinning]

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-collapsible (apps/web)"
  patterns:
    - "Read-only debug surface: Prisma joins over persisted state, zero writes, zero live AI calls"
    - "Tenant-strict OR clause on re-tag queue: (sourceMessage.conversation.venueId) OR (sourceMessageId null AND knowledgeItem.venueId) — NEVER the permissive {knowledgeItem: {OR: [{venueId}, {venueId:null}]}} form"
    - "Dual content caps: server 2048-char toolCallLog.result.data[].content with __truncated marker + client 64KB JSON viewer cap with omitted-byte banner"
    - "Dual noindex defence: Next.js metadata robots:{index:false,follow:false} + X-Robots-Tag response header via next.config.ts headers()"
    - "Typed RETENTION_90D_MS constant in @gm-ai/types gates both findFirst queries and retag-queue list/counts where clauses"
    - "debug.access per-call structured log event emitted by shared logAccess() helper — separates operator traffic from user traffic in grep without branching the shared http logger"
    - "Explicit refetchOnWindowFocus:false + refetchOnReconnect:false at hook layer, not trusting provider defaults — debug is a snapshot, not live"
    - "Manual Refresh button wired to queryClient.invalidateQueries({queryKey:['debug']}) + sonner toast"
    - "apiFetchWithMeta<T>() sibling to apiFetch<T>() — success-path requestId surfacing for operator correlation"
    - "Helper function mapStatusCount() initializes all 5 known buckets to 0, rolls unknown statuses into failed with debug.unknown_status warn log — closes silent-drop gap of groupBy-alone bucketing"

key-files:
  created:
    - packages/types/src/debug.ts
    - apps/api/src/modules/debug/debug.module.ts
    - apps/api/src/modules/debug/debug.service.ts
    - apps/api/src/modules/debug/debug.controller.ts
    - apps/api/src/modules/debug/truncate.ts
    - apps/web/next.config.ts
    - apps/web/src/app/debug/page.tsx
    - apps/web/src/app/debug/layout.tsx
    - apps/web/src/app/debug/error.tsx
    - apps/web/src/app/debug/loading.tsx
    - apps/web/src/components/ui/collapsible.tsx
    - apps/web/src/components/debug/debug-conversation-inspector.tsx
    - apps/web/src/components/debug/debug-tool-call-card.tsx
    - apps/web/src/components/debug/debug-retag-queue.tsx
    - apps/web/src/components/debug/debug-feedback-badge.tsx
    - apps/web/src/components/debug/debug-json-viewer.tsx
    - apps/web/src/components/debug/debug-request-id-badge.tsx
    - apps/web/src/lib/hooks/use-debug-conversation.ts
    - apps/web/src/lib/hooks/use-debug-retag-queue.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/scripts/probe-api.ts
    - packages/types/src/index.ts
    - apps/web/src/lib/api-client.ts
    - apps/web/src/components/chat/venue-selector.tsx
    - apps/web/package.json

key-decisions:
  - "debug.access emitted via shared logAccess() helper (1 literal hit) rather than 3 inline emissions — functionally stronger than grep-count heuristic"
  - "RETENTION_90D_MS centralized via retentionCutoff() helper (2 literal hits) — DRY factoring across 3 query methods"
  - "Runtime helpers (truncateAtWord, truncateToolCallLogEntry, mapStatusCount) live in apps/api/src/modules/debug/truncate.ts — @gm-ai/types stays pure type contracts"
  - "Two-pane layout via plain grid, not @radix-ui/react-tabs — audit-removed dead dep before APPLY"
  - "apiFetchWithMeta<T>() as sibling variant to apiFetch<T>() — 10-line addition; chat hooks keep using apiFetch unchanged"
  - "Error boundary (/debug/error.tsx) is static-only — grep-enforced no useSearchParams / useQuery / apiFetch"
  - "Strict tenant isolation on retag queue: explicit probe D5 guards against the permissive OR form that would leak cross-tenant state drift on shared globals"

patterns-established:
  - "Post-POC observability work inherits DebugRequestIdBadge + apiFetchWithMeta<T>() as the operational handle pattern"
  - "Any future operator route follows /debug's noindex dual-layer + amber warning banner + operator-role-guard (when auth ships)"
  - "Retention window = typed constant in @gm-ai/types, not magic number in service — post-POC config can read from env, single-source"
  - "Structured logging per-surface: debug.access distinguishes from http.request without modifying shared logger — template for future operator/admin surfaces"
  - "Helper extraction when plan grep heuristic expects N literal hits but DRY factoring yields fewer — document in SUMMARY deviations, not force-inline to match heuristic"

# Metrics
duration: ~70min (PLAN + AUDIT ~30min pre-recorded; APPLY ~40min incl. human UAT)
started: 2026-04-18T23:05:00Z
completed: 2026-04-19T09:30:00Z
---

# Phase 5 Plan 03: Debug / Observability Panel Summary

**A read-only debug surface that makes every field Phase 3/4 persists legible to an operator — conversation traces with toolCallLog similarity color bands, feedback badges, re-tag queue state, X-Request-Id log correlation — shipped with SOC-2-grade tenant isolation, 90-day retention gating, dual content caps, and dual-layer noindex defence before auth exists.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~70 min (PLAN + AUDIT ~30 min; APPLY + UAT ~40 min) |
| Started | 2026-04-18T23:05:00Z |
| Completed | 2026-04-19T09:30:00Z |
| Tasks | 3/3 completed; UAT (AC-9) approved by human verifier |
| Files created | 19 |
| Files modified | 6 |
| Total LOC (new debug surface) | ~1,336 lines across api + types + web |
| Probe regression | `pnpm --filter api probe:api` — 36/36 green (D1–D7 added) |
| Web build | `pnpm --filter web build` — clean, 5/5 static pages |
| Auto-fixes during APPLY | 0 |
| Deviations from hardened plan | 0 (two helper-factoring choices below are plan-permitted clarifications, not deviations) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: GET /debug/conversations/:id?venueId returns full provenance | Pass | 200 with shape; 90-day retention gate applied; cross-tenant → 404; toolCallLog.result.data[].content capped at 2048 with __truncated marker |
| AC-2: GET /debug/retag-queue?venueId&limit returns recent queue items | Pass | Strict OR clause (sourceMessage.conversation.venueId OR unattributed-on-venue-owned-knowledge); orphan globals excluded; groupBy counts share same where; safeLimit defense-in-depth re-clamp |
| AC-3: GET /debug/messages/:id?venueId returns per-message deep trace | Pass | 404-not-403 on cross-tenant + out-of-retention; retagQueueItems filtered by sourceMessageId; same 2048-char cap |
| AC-4: /debug/* respects 05-01 trust boundaries + noindex | Pass | zodPipe at every @Param/@Query; ApiErrorResponse envelope; debug.access per call; X-Robots-Tag via next.config.ts; robots:{index:false,follow:false} via layout metadata |
| AC-5: probe-api covers debug endpoints end-to-end | Pass | 36/36 green; D1–D7 added; D5 cross-tenant leak guard verified leaked=false; D6 truncation verified len=2048 + __truncated=true; D7 X-Robots-Tag absent from api layer (set by web layer, as designed) |
| AC-6: Debug UI renders conversation inspector + re-tag queue panel | Pass | Two-pane grid; collapsible toolCallLog; similarity color bands with text labels; feedback badges; sourceMessageId click-to-scroll; DebugRequestIdBadge in header; manual Refresh button |
| AC-7: Debug UI reuses 05-02 patterns, adds no new XSS surfaces | Pass | whitespace-pre-wrap in 3 components; zero dangerouslySetInnerHTML; zero markdown libs; DebugJsonViewer caps at 64KB with omitted-byte banner; icon + text severity everywhere |
| AC-8: X-Request-Id correlation works on debug page | Pass | apiFetchWithMeta<T>() returns {data, requestId}; DebugRequestIdBadge renders + copies to clipboard; header echo verified; toast surfaces requestId on ApiError |
| AC-9: UAT — end-to-end human verification | Pass | 19-step UAT walked against live :3000 + :3001; approved; curl-verified X-Robots-Tag: noindex, nofollow on /debug HTML response; probe regression 36/36 alongside live web |

## Accomplishments

- **Every Phase 4 provenance field is now legible without raw SQL.** Retrieval similarity scores, tool inputs/outputs, feedback kind + userFeedback, re-tag queue status + attempts + lastError — all visible in a two-pane operator surface correlated by conversationId.
- **Cross-tenant leak closed before APPLY.** The original audit-flagged permissive OR form (`{ knowledgeItem: { OR: [{ venueId }, { venueId: null }] } }`) would have exposed re-tag activity on global knowledge items triggered by OTHER tenants — SOC-2 CC6.6 failure. Replaced with strict clause; probe D5 guards against regression.
- **Dual content caps prevent UI freeze AND wire bloat.** Server caps `toolCallLog.result.data[].content` at 2048 chars with `__truncated: true` marker; `DebugJsonViewer` caps serialized payload at 64KB with truncation banner showing omitted bytes. A 100KB toolCallLog entry no longer blocks the main thread on low-end devices.
- **Noindex shipped at both layers before auth.** Next.js `metadata.robots = {index:false, follow:false}` in `app/debug/layout.tsx` + `X-Robots-Tag: noindex, nofollow` response header in `next.config.ts` `headers()`. Curl-verified during UAT: `HTTP/1.1 200 OK` with `X-Robots-Tag: noindex, nofollow`.
- **Operator log correlation handle is first-class.** `DebugRequestIdBadge` in the page header — monospace pill, copy-to-clipboard, updates on every successful fetch. The badge is why debug exists; surfacing it by default (not behind devtools) is the difference between "debug is observable" and "debug is observability".
- **Audit-trail separation without touching the shared http logger.** Every `/debug/*` handler emits a `debug.access` structured log `{ requestId, path, venueId, resource, outcome, latencyMs }` via a shared `logAccess()` helper — operator-debug grep-filterable from user traffic without branching `http-logger.middleware.ts`.
- **Retention window is typed, not magic.** `RETENTION_90D_MS = 90 * 24 * 60 * 60 * 1000` lives in `@gm-ai/types`; applied via `retentionCutoff()` helper in all three query methods. Changing the window is a one-line edit; auditors can trace the constant from contract to query.
- **Probe coverage expanded without AI spend.** 29 → 36 assertions; D5/D6 seed rows keyed to `channel='probe-api'` so the existing FK-safe cleanup chain reaps them hermetically; D6 probe optional soft-fail path documented if the oversized row isn't in top-5 retrievals.

## Task Commits

Atomic task commits deferred per repo pattern (phase-level commit at phase transition — mirrors Phase 3 `ceb81bb` and Phase 4 `3569f16`). All Phase 5 work (05-01 + 05-02 + 05-03) is on the working tree; the Phase 5 transition commit follows this UNIFY.

| Task | Description |
|------|-------------|
| Task 1: Debug API endpoints + DTOs + probe-api D1–D7 | 4 created (truncate.ts, debug.ts DTOs, debug.service.ts, debug.controller.ts) + 2 tiny (debug.module.ts, app.module.ts update) + probe-api.ts extended; swc build clean; probe 36/36 green |
| Task 2: Debug UI — /debug route + components + hooks | 13+ files created (collapsible.tsx wrapper, 6 debug components, 2 hooks, 4 debug route files, next.config.ts headers) + api-client.ts apiFetchWithMeta extension + VenueSelector targetRoute prop + package.json radix-collapsible add; Next.js build 5/5 static pages clean |
| Task 3: Human UAT (AC-9) | 19-step operator walk against live servers; X-Robots-Tag confirmed via curl + DevTools; cross-tenant 404 verified; approved |

## Files Created/Modified

### Created (19)

| File | Lines | Purpose |
|------|-------|---------|
| `packages/types/src/debug.ts` | 87 | DTO contracts + Zod input schemas + typed constants (RETENTION_90D_MS, DEBUG_CONTENT_TRUNCATE=2048, DEBUG_JSON_UI_CAP=65536); DebugRetagQueueCounts closed union of 5 known statuses |
| `apps/api/src/modules/debug/truncate.ts` | 84 | Runtime helpers: truncateAtWord, truncateToolCallLogEntry, mapStatusCount (bucketizes with all-5-keys-initialised + debug.unknown_status warn log) |
| `apps/api/src/modules/debug/debug.service.ts` | 251 | Injectable service: getConversation, getMessage, getRetagQueue; all three apply retentionCutoff() + venue-scoped WHERE; shared logAccess() helper emits debug.access per call |
| `apps/api/src/modules/debug/debug.controller.ts` | 61 | 3 GET handlers with zodPipe(IdParamSchema) on :id + zodPipe(DebugQuerySchema or DebugRetagQueueQuerySchema) on query; NotFoundException with ApiErrorResponse body on null |
| `apps/api/src/modules/debug/debug.module.ts` | 9 | Standard Nest module — no external imports (Prisma via direct import pattern) |
| `apps/web/next.config.ts` | 17 | `headers()` returning X-Robots-Tag: noindex, nofollow for /debug/:path* |
| `apps/web/src/app/debug/page.tsx` | 143 | Client orchestrator: Suspense-wrapped, reads ?venue/?conv, header (venue label + DebugRequestIdBadge + Refresh button), two-pane layout, onItemClick scroll-to-message |
| `apps/web/src/app/debug/layout.tsx` | 22 | Server component with `metadata: {robots:{index:false,follow:false}, title:'Debug'}` + amber operator warning banner |
| `apps/web/src/app/debug/error.tsx` | 22 | STATIC-ONLY App Router error boundary — grep-enforced no useSearchParams / useQuery / apiFetch |
| `apps/web/src/app/debug/loading.tsx` | 19 | Two-pane skeleton placeholder |
| `apps/web/src/components/ui/collapsible.tsx` | 9 | shadcn wrapper around @radix-ui/react-collapsible |
| `apps/web/src/components/debug/debug-conversation-inspector.tsx` | 112 | Per-message cards with role/createdAt/retrievedItemIds/toolCallLog/feedback; `id={`msg-${id}`}` for scroll targets |
| `apps/web/src/components/debug/debug-tool-call-card.tsx` | 88 | Round + tool header, input + result DebugJsonViewers, find_knowledge similarity strip with color+text band (≥0.5 green/high, 0.3–0.5 amber/med, <0.3 red/low) |
| `apps/web/src/components/debug/debug-retag-queue.tsx` | 203 | Counts strip (5 icon+text badges) + item list with contentPreview / status / attempts / lastError line-clamp-2 / sourceMessageId button |
| `apps/web/src/components/debug/debug-feedback-badge.tsx` | 57 | ThumbsUp/ThumbsDown/RotateCw icon + text label + relative createdAt; zero DOM when feedback null |
| `apps/web/src/components/debug/debug-json-viewer.tsx` | 75 | Collapsible pre/code with DEBUG_JSON_UI_CAP cap + omitted-byte banner; bytesApprox human-readable |
| `apps/web/src/components/debug/debug-request-id-badge.tsx` | 39 | Monospace pill with copy-to-clipboard + sonner toast; disabled state when requestId undefined |
| `apps/web/src/lib/hooks/use-debug-conversation.ts` | 19 | useQuery + apiFetchWithMeta; explicit refetchOnWindowFocus:false + refetchOnReconnect:false |
| `apps/web/src/lib/hooks/use-debug-retag-queue.ts` | 19 | useQuery + apiFetchWithMeta; same refetch discipline |

### Modified (6)

| File | Change |
|------|--------|
| `apps/api/src/app.module.ts` | Added DebugModule to imports |
| `apps/api/src/scripts/probe-api.ts` | D1–D7 assertions appended; probe cost banner updated ("Debug cost: +7 DB queries per run, no additional AI calls"); total 29 → 36 |
| `packages/types/src/index.ts` | Added `export * from './debug'` |
| `apps/web/src/lib/api-client.ts` | Added `apiFetchWithMeta<T>(): Promise<{data, requestId}>` variant (~10 lines); apiFetch signature unchanged — chat hooks keep using it |
| `apps/web/src/components/chat/venue-selector.tsx` | Added `targetRoute?: string` prop (defaults to `/chat`) so /debug can reuse the selector without duplication |
| `apps/web/package.json` | Added `@radix-ui/react-collapsible: "latest"` |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `debug.access` emitted via shared `logAccess()` helper (1 literal hit) rather than 3 inline calls | DRY: all three service methods build identical log payload; inlining 3× ships drift risk | Functionally stronger than plan's grep-expects-≥3 heuristic. All three endpoints still emit the event via the helper. Documented in Deviations. |
| `RETENTION_90D_MS` referenced via `retentionCutoff()` helper (2 literal hits) rather than 3 inline `new Date(Date.now() - RETENTION_90D_MS)` | Same factoring principle — one helper, three callers | Same factoring. Plan's grep-expects-≥3 reflected the pre-helper inline version; post-helper the literal count drops without losing coverage. Documented in Deviations. |
| Two-pane layout as plain grid, not `@radix-ui/react-tabs` | Audit removed Tabs pre-APPLY as dead code; a grid is simpler, no radix dep, no aria-tablist overhead | Zero UX loss; `@radix-ui/react-tabs` never entered package.json |
| `apiFetchWithMeta<T>()` as sibling to `apiFetch<T>()` | Debug hooks need requestId on success; chat hooks don't. Extending `apiFetch<T>()` return shape would force every call site to unpack `.data` | apiFetch signature is frozen — chat hooks unchanged. Future observability surfaces import `apiFetchWithMeta` when they need the requestId handle. |
| VenueSelector gains `targetRoute?: string` prop | Debug page needs the same selector but routing to `/debug?venue=` not `/chat?venue=` | 5-line prop addition; default preserves /chat behaviour; chat UI unaffected; grep-safe |
| Error boundary `/debug/error.tsx` is static-only (no useSearchParams / useQuery / apiFetch) | Audit strongly-rec #10: if error.tsx fetches and the fetch errors, the boundary enters an infinite render-error loop | Grep-enforced in verify step 13; establishes template for post-POC operator routes |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed during APPLY | 0 | Zero auto-fixes; hardened plan shipped as-written |
| Scope additions | 0 | — |
| Helper-factoring clarifications (plan grep-count reflected inline pattern; helper yields fewer literal hits) | 2 | Functionally equivalent or stronger; documented here so future audits don't flag grep-count regression |
| Deferred | 0 | All audit-level deferrals already captured in 05-03-AUDIT.md |

**Total impact:** Zero deviation on contract, behaviour, or coverage. Two helper-factoring clarifications noted so the grep-count verification steps don't get misread as regressions in later audits.

### Helper-factoring clarifications

**1. [code-organization] `debug.access` emitted via shared `logAccess()` helper**
- **Plan verify step 12:** `grep -rn 'debug.access' apps/api/src/modules/debug` returns ≥3 hits (one per endpoint)
- **Actual:** 1 literal hit in `debug.service.ts:30` inside `logAccess()` helper; all three endpoints (`getConversation`, `getMessage`, `getRetagQueue`) call `logAccess(...)` with their resource + outcome + latency
- **Rationale:** Identical log payload shape across three methods → helper is the correct factoring. Three inline `this.logger.log({ event: 'debug.access', ... })` calls would be duplicated boilerplate prone to drift (one method adds a field, the others don't)
- **Verification:** Behavioural equivalence verified by D1–D4 probe runs; each endpoint hit produces exactly one `debug.access` log line observable in the api stdout during probe execution
- **Impact:** Grep-count heuristic alone would fail; plan intent (one `debug.access` event per endpoint call) is satisfied. Future audits should grep for `logAccess(` callers instead.

**2. [code-organization] `RETENTION_90D_MS` referenced via `retentionCutoff()` helper**
- **Plan verify step 13:** `grep -rn 'RETENTION_90D_MS' apps/api/src/modules/debug` returns ≥3 hits (plan assumed 3 inline `new Date(Date.now() - RETENTION_90D_MS)` sites)
- **Actual:** 2 literal hits — one import line (`debug.service.ts:4`) + one `retentionCutoff()` helper definition (`debug.service.ts:34`). The helper is called from `getConversation`, `getMessage`, and `getRetagQueue` WHERE clauses
- **Rationale:** Same DRY factoring principle as #1 — the inline form `createdAt: { gte: new Date(Date.now() - RETENTION_90D_MS) }` is identical in all three call sites; a helper returning the Date is correct factoring
- **Verification:** Behavioural equivalence verified by assertion that conversations/messages outside the 90-day window 404; the three methods all gate on the same cutoff instant per request
- **Impact:** Same as #1 — grep-count heuristic would miss; plan intent (retention applied in all three methods) is satisfied. Future audits should grep for `retentionCutoff(` call sites instead.

### Deferred Items

None added during APPLY. Audit-level deferrals (radix `"latest"` pinning, log aggregation UI) already documented in 05-03-AUDIT.md §4 with explicit deferral triggers.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| — | Plan executed cleanly; zero auto-fixes; zero blockers; UAT approved on first walkthrough |

## Next Phase Readiness

**Phase 5 (Web Interface) complete after this UNIFY.**

All three Phase 5 plans shipped:
- 05-01 (API controllers) — committed pending Phase 5 transition
- 05-02 (Chat UI) — committed pending Phase 5 transition
- 05-03 (Debug panel) — this plan; committed pending Phase 5 transition

**Milestone v0.1 POC:** 13/13 plans complete (100%). Ready for v0.1 milestone-completion flow.

**Patterns established for post-POC work:**
- `DebugRequestIdBadge` + `apiFetchWithMeta<T>()` set the operator observability handle pattern — any future operator/admin surface inherits this
- Dual-layer noindex + amber warning banner is the defence-in-depth template before auth ships
- `RETENTION_90D_MS` typed-constant pattern is the template for any future retention-gated read surface
- `debug.access` per-call structured log event is the template for distinguishing operator surfaces from user surfaces in grep pipelines without modifying shared logger middleware
- Read-only debug surface = zero writes + zero live AI calls + Prisma joins over persisted state is the default posture for future observability panels (dashboards, admin tools, audit trails)
- Helper factoring over grep-count heuristics: when plan verify greps expect N inline literal hits but DRY factoring yields fewer, document in SUMMARY deviations and keep the helper — don't inline to match the count

**Concerns carried forward post-POC:**
- Pre-auth URL exposure — noindex is defence-in-depth, NOT auth. Operator-role guard pending auth wrap.
- `@radix-ui/react-collapsible` pinned to `"latest"` — post-POC tooling plan pins exact majors.
- No log aggregation UI — historical X-Request-Id correlation requires OTel + sink + query endpoint; cross-service infrastructure plan, not a UI plan.
- No live similarity re-run in debug — persisted scores only. If retrieval tuning needs live comparison, a separate plan lands live re-run with explicit Voyage cost budget.

**Blockers:**
- None.

---
*Phase: 05-web-interface, Plan: 03*
*Completed: 2026-04-19*
