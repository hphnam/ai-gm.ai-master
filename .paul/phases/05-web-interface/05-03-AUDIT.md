# Enterprise Plan Audit Report

**Plan:** `.paul/phases/05-web-interface/05-03-PLAN.md`
**Audited:** 2026-04-18T23:05:00Z
**Verdict:** Conditionally acceptable pre-fix → **enterprise-ready post-fix**

---

## 1. Executive Verdict

**Conditionally acceptable pre-fix.** The plan was well-scoped (read-only, zero writes, zero Phase 4 code touched) and inherited audit-defensible patterns from 05-01/05-02. However, six must-have gaps would have failed a production-readiness review: a **cross-tenant leak** in the GET /debug/retag-queue endpoint (permissive `OR: [{ venueId }, { venueId: null }]` join exposing state drift from other tenants on shared global knowledge), **unbounded refetch storms** from React Query defaults (one tab-switch = 2 queries × N operators), **no defense against oversized toolCallLog JSON** crashing the UI at render time, **no noindex / X-Robots-Tag** on a pre-auth debug surface with bookmarkable conversation URLs, **an impossible status-bucket mapping** for DebugRetagQueueCounts that would silently drop unknown statuses, and **dead `tabs.tsx` code** listed in files_modified that no task action actually used.

Post-fix verdict: **enterprise-ready**. I would sign my name to this system.

## 2. What Is Solid

- **Read-only posture.** Zero writes + zero Phase 4 modifications = zero blast-radius vs existing contracts. The right safety posture for a debug surface.
- **Exposing only persisted fields.** Not re-running `KnowledgeRetrievalService.find()` — the per-call Voyage cost would be unjustifiable and introduces time-skew.
- **Inherits 05-02's apiFetch + X-Request-Id pattern.** Correlation with the existing request-ID middleware is the single most important observability win.
- **404-not-403 cross-tenant pattern** mirroring 05-01; enumeration-leak-safe.
- **XSS discipline inherited from 05-02.** Grep-enforced absence of markdown libs + `dangerouslySetInnerHTML` is the right bar.
- **No `findMany` without `take`.** Retag-queue query caps + clamps via Zod.
- **Task 1 "DO NOT invent new error codes at the controller"** — keeps the closed union intact.
- **Defense-in-depth on toolCallLog shape drift.** Plan treats persisted JSON as `unknown` at the boundary.

## 3. Enterprise Gaps Identified

1. **Cross-tenant leak in /debug/retag-queue.** The original `where: { knowledgeItem: { OR: [{ venueId }, { venueId: null }] } }` returned retag activity on global knowledge items triggered by OTHER tenants — SOC-2 Common Criteria CC6.6 (logical access) failure.
2. **Unbounded React Query refetch/focus discipline.** staleTime alone doesn't prevent refetch-on-focus; two tab-switches per minute over a 30-minute session = 120+ unnecessary Prisma + groupBy queries.
3. **Oversized toolCallLog JSON freezes the UI.** A 6-round conversation with rich retrievals easily produces 100KB+ JSON; `JSON.stringify` + `<pre>` render blocks the main thread on low-end devices.
4. **No noindex / robots defense on /debug.** URL is bookmarkable and shareable pre-auth; any Coolify-deployed staging environment would be indexable via referrer leakage or accidental screen-shares.
5. **`DebugRetagQueueCounts` bucketing is unreachable via groupBy.** The plan's "unknown statuses bucket to failed" behaviour was described as a comment, not explicit mapping code — the groupBy result would silently drop unknown-status rows with no warning.
6. **`tabs.tsx` listed in files_modified but never used.** Dead code in the plan ships as dead code in the repo + extra radix dep for zero benefit.
7. **`truncateAtWord` placement in @gm-ai/types.** Violates the "types package is pure contracts, no runtime logic" convention established for 01-02 through 05-01.
8. **No data-retention boundary.** Debug endpoints returned whatever was in the DB; older conversations + PII in user queries would need to be in scope for GDPR subject-access requests.
9. **No audit-trail separation for debug traffic.** /debug/* calls would mix into the `http.request` log alongside real user traffic, polluting post-incident reconstruction grep.
10. **Error boundary has no static-only guarantee.** If /debug/error.tsx accidentally used useSearchParams or a query, a render error would trigger an infinite error-boundary cycle.
11. **Probe reused seeded rows without `channel='probe-api'` markers** for D5/D6 — parallel probe runs would collide.
12. **Radix deps pinned to `"latest"`.** Same project convention as elsewhere; POC-acceptable but flagged for post-launch tooling plan.
13. **No defense-in-depth `limit` clamp inside the service.** zodPipe catches most cases but if a controller accidentally bypasses zodPipe in a future edit, Prisma would accept any number.
14. **No cost disclosure for the debug surface.** 05-01's probe banner advertised Claude spend; 05-03 adds DB queries without equivalent disclosure.
15. **No X-Request-Id surfacing on success.** ApiError carried requestId but successful calls left the operator without a forensic handle to grep the server logs — the primary reason the debug surface exists.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking) — 6 applied

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Cross-tenant leak on /debug/retag-queue | AC-2 + Task 1 step 5 | Replaced `{ knowledgeItem: { OR: [{ venueId }, { venueId: null }] } }` with strict `OR: [{ sourceMessage: { conversation: { venueId } } }, { sourceMessageId: null, knowledgeItem: { venueId } }]`; orphaned global rows excluded. probe-api D5 added: seed Anchor retag row → assert absent from Crown query. |
| 2 | Unbounded refetch + no manual refresh | AC-6 + Task 2 hooks + page.tsx | Explicit `refetchOnWindowFocus: false, refetchOnReconnect: false` on both debug hooks. Page header gains "Refresh" button wired to `queryClient.invalidateQueries({ queryKey: ['debug'] })` + sonner toast. Boundaries document "snapshot not live". |
| 3 | Oversized JSON crashes UI + wire payload | AC-1 + AC-3 + AC-7 + Task 1 step 4 + Task 2 step 4 | Server: `truncateToolCallLogEntry` caps `result.data[].content` at 2048 chars with `__truncated: true` marker. Client: `DebugJsonViewer` caps serialized output at 65536 chars with truncation banner. probe-api D6 added: pre-insert 4096-char knowledge row → assert 2048 cap fires + marker present. |
| 4 | No noindex / X-Robots-Tag | AC-4 + Task 2 steps 10/11 + files_modified | New `apps/web/src/app/debug/layout.tsx` with `metadata.robots = { index: false, follow: false }`. New `apps/web/next.config.ts` `headers()` returning `X-Robots-Tag: noindex, nofollow` for `/debug/:path*`. Amber warning banner in layout. probe-api D7 added: assert header present. |
| 5 | `DebugRetagQueueCounts` unknown-status mapping | Task 1 step 1 + step 4 (truncate.ts) | Extracted explicit `mapStatusCount(rows, log)` function in `apps/api/src/modules/debug/truncate.ts`: initializes all 5 known buckets to 0, iterates rows, rolls unknown statuses into `failed` with `debug.unknown_status` warn log. Typed counts contract stays closed. |
| 6 | Dead `tabs.tsx` code | Frontmatter + Task 2 step 1 + step 15 + verification | Removed `tabs.tsx` from files_modified; removed `@radix-ui/react-tabs` dep; two-pane layout uses plain grid. Grep verification added: `grep -rn '@radix-ui/react-tabs' apps/web/package.json` → zero hits. |

### Strongly Recommended — 9 applied

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 7 | `truncateAtWord` placement | Task 1 step 1 + step 4 + files_modified | Moved helpers to new `apps/api/src/modules/debug/truncate.ts`; @gm-ai/types/debug.ts keeps only types + constants (`RETENTION_90D_MS`, `DEBUG_CONTENT_TRUNCATE`, `DEBUG_JSON_UI_CAP`). |
| 8 | 90-day retention window | AC-1 + AC-3 + Task 1 step 5 + boundaries | Added `createdAt: { gte: new Date(Date.now() - RETENTION_90D_MS) }` to all three debug service queries; older data 404s; retention encoded as typed constant. |
| 9 | Debug access audit trail | AC-4 + Task 1 step 5/6 + boundaries | Every /debug/* handler emits one `debug.access` structured log event with `{ requestId, path, venueId, resource, outcome, latencyMs }`; PII-safe (no content/query values). Shared `http-logger.middleware.ts` stays untouched. |
| 10 | Error boundary static-only | Task 2 step 13 + verify grep 13 | `/debug/error.tsx` explicitly forbidden from using useSearchParams / useQuery / apiFetch — enforced by grep check. |
| 11 | Probe row markers | AC-5 + Task 1 step 9 | D5 + D6 seed rows keyed to `channel='probe-api'` conversations so the existing FK-safe cleanup chain reaps them. |
| 12 | Service-layer `limit` clamping | Task 1 step 5 | `DebugService.getRetagQueue` applies `const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)))` before passing to Prisma — defense-in-depth. |
| 13 | Probe cost banner | AC-5 + Task 1 step 9 | Probe startup line updated: "Debug cost: +7 DB queries per run, no additional AI calls". |
| 14 | X-Request-Id surfacing on success | AC-6 + AC-8 + Task 2 step 9 + files_modified | New `DebugRequestIdBadge` component rendered in the page header (monospace pill, copy-to-clipboard, updates on every fetch). New `apiFetchWithMeta<T>` variant in api-client.ts returns `{ data, requestId }` to the debug hooks. |
| 15 | Fix "≥33 assertions" count | AC-5 + verification + success_criteria | Raised to ≥36 to reflect D5 + D6 + D7 additions. |

### Deferred (Can Safely Defer) — 2 items

| # | Finding | Rationale for Deferral |
|---|---------|------------------------|
| 16 | Radix dep pinning to exact majors | POC convention is `"latest"` across the stack (see pnpm `save-prefix` issue already tracked in Deferred Issues). Post-POC tooling plan will pin radix + other UI libs. Risk is low for a 2-operator POC; high-value fix for post-auth deployment. Documented in boundaries. |
| 17 | Log aggregation UI for historical X-Request-Id correlation | Requires OTel + a log sink + a query endpoint — cross-service infrastructure plan, not a UI plan. Debug exposes the CURRENT call's requestId via the badge; correlating historical chat/retrieval requestIds back to log lines requires OTel. Named deferral in SCOPE LIMITS. |

## 5. Audit & Compliance Readiness

**Post-fix posture:**

- **Tenant isolation (SOC 2 CC6.6):** strict — probe D5 enforces. Any regression breaks CI.
- **Retention (GDPR Article 17 / subject-access scope):** 90-day window constrains debug-surface exposure. Typed constant makes the retention config auditable.
- **Audit-trail separation (SOC 2 CC7.2):** `debug.access` events distinguish operator-debug from user traffic in log grep.
- **Pre-incident defense:** noindex + X-Robots-Tag + amber warning banner make accidental exposure harder. Not a replacement for auth — documented as defense-in-depth.
- **Post-incident reconstruction:** `DebugRequestIdBadge` + `apiFetchWithMeta` give operators the exact handle for grepping api logs.
- **Defensive validation:** dual validation (zodPipe + service re-clamp), shape-drift-safe JSON rendering, server-side + client-side content caps.

**Remaining audit-relevant risks post-fix:**
- Pre-auth exposure remains. noindex is not auth.
- Radix `"latest"` pin.
- Log aggregation is deferred → forensic grep depends on stdout log retention (Coolify default).

## 6. Final Release Bar

**What must be true before shipping (all post-fix):**
- All 6 must-have fixes applied to PLAN.md ✓ (applied)
- All 9 strongly-recommended fixes applied ✓ (applied)
- probe-api asserts ≥36 including D5/D6/D7
- Boundaries document retention window, snapshot semantics, noindex rationale, cross-tenant strict scope, JSON payload caps
- Zero runtime code in @gm-ai/types
- DebugRequestIdBadge visible to operators by default

**Remaining risks if shipped as-is (with fixes):**
- Pre-auth URL exposure in shared Coolify environments (noindex is defense-in-depth)
- Radix version drift on `"latest"` pinning (POC-level)
- No live log aggregation (post-POC)

**Would I sign my name post-fix:** yes.

---

**Summary:** Applied **6 must-have** + **9 strongly-recommended** upgrades. Deferred **2** items with explicit rationale or triggers.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
