# Enterprise Plan Audit Report

**Plan:** .paul/phases/05-web-interface/05-02-PLAN.md
**Audited:** 2026-04-18 22:00
**Verdict:** Conditionally acceptable pre-fix, **enterprise-ready post-fix**.

---

## 1. Executive Verdict

Pre-audit, 05-02 was a well-scoped UI plan that correctly delegates state to URL + React Query and respects the 05-01 trust boundary. What it missed: the **browser-side** security posture that a real audit walks in expecting.

Release-blocking gaps before fix:
1. **No XSS posture for assistant content.** Claude will emit markdown, code blocks, and arbitrary strings. The plan didn't specify a rendering strategy — implementation-time drift toward `dangerouslySetInnerHTML` or an unsanitized markdown lib was the default path.
2. **No Suspense boundary around `useSearchParams`.** Next.js 16 requires this or the page bails out of static-gen with a warning; in strict mode the build can fail outright.
3. **No App Router error boundary.** Any uncaught component render error blanks the page; there's no `error.tsx` to catch and surface it.
4. **No X-Request-Id propagation from UI → API.** 05-01 shipped a request-ID middleware that echoes inbound headers, specifically so the UI could correlate log entries across the stack. Plan 05-02 didn't wire the client side — the feature would ship disabled.
5. **No accessibility baseline.** Icon-only feedback buttons, color-only severity, no screen-reader announcement on new messages. A real WCAG audit flags all three.

Post-audit, all five are closed with concrete implementation-level guidance. The plan is **enterprise-ready post-fix** and I would sign my name to it.

## 2. What Is Solid (Do Not Change)

- **URL-as-state + React Query** — correct choice. No localStorage abuse, no Redux/Zustand overhead at POC scale, no refresh-loses-state bug. Bookmark-as-resume works out of the box.
- **Single `apiFetch` trust boundary** — every network call funneled through one file; grep-verifiable. Error envelope decoding happens in exactly one place.
- **`mapApiError` + closed `API_ERROR_CODES` set** — directly consumes the contract shipped by 05-01; zero per-endpoint error-handling drift.
- **shadcn/ui hand-copied, not CLI-driven** — inherits the "interactive CLIs break in non-TTY contexts" lesson from 03-01 (Prisma migrate dev); avoids a guaranteed APPLY failure.
- **Promise.all for send + on-turn suggestions** — correct concurrency model; suggestions don't block the assistant reply but run in parallel.
- **Checkpoint:human-verify at the end** — complex user-visible work cannot be fully verified autonomously; 15-step UAT is the right closing move.
- **Scope explicitly excludes streaming, auth, debug panel** — stays inside a focused lane.

## 3. Enterprise Gaps Identified

### Release-blocking
1. **No XSS/content-safety posture.** Plan describes ChatMessage rendering but doesn't specify text vs markdown vs HTML. Default implementation could reach for `dangerouslySetInnerHTML` or an unsanitized markdown lib. Claude's outputs are untrusted-enough that a server-side prompt-injection feeding `<script>` through a docType field would reach the bubble.
2. **No Suspense boundary around `useSearchParams`.** Next.js 16 static-generation bails out with a console warning, and strict-mode + production builds may fail. Plan doesn't acknowledge.
3. **No `error.tsx` at `/chat` route scope.** An unhandled component error blanks the page with no recovery UI.
4. **No X-Request-Id header propagation in apiFetch.** 05-01 shipped the server side; 05-02 would leave the observability loop half-open. Grep debugging across UI clicks + api logs requires this correlation id.
5. **No accessibility baseline.** Icon-only feedback buttons fail AA; color-only severity signals fail 1.4.1 Use of Color; missing `aria-live` on the thread fails screen-reader announcement requirements.

### Strongly-recommended
6. **No loading skeleton on conversation fetch.** 200-500ms round-trip on refresh creates a flash-of-empty before messages render.
7. **No mutation-cancel on venue switch.** If the user submits then immediately switches venues, the in-flight optimistic bubble + mutation result can leak onto the new venue's thread.
8. **No Sonner visible-toast cap.** Repeated 500s stack toasts to the point they obscure the page. `visibleToasts={3}` is a 1-line fix.
9. **No `suppressHydrationWarning` on root `<html>`.** sonner's `next-themes` peer injects a class post-hydration; without the attribute, every page load logs a React hydration warning.
10. **Tailwind v4 + shadcn CSS-vars pitfall.** Plan says "use shadcn's Tailwind v4 vars" but doesn't pin the source URL. shadcn's v3 `@layer base` block against a v4 app compiles but silently produces broken variants.
11. **No AbortSignal passthrough in apiFetch.** React Query passes a signal to queryFn for cancel-on-unmount; plan's apiFetch signature ignored it.
12. **ApiError doesn't capture `requestId`.** For user-facing "something went wrong" messages, showing the requestId turns support debugging into a 5-second grep.
13. **Composer textarea sizing unspecified.** Auto-grow vs fixed-height is an implementation choice that affects layout stability. Fixed-height is the simpler POC call.

### Can-safely-defer
14. CSP headers on apps/web (hosted-deployment prerequisite; Coolify plan territory).
15. Sanitized markdown renderer (`react-markdown` + `rehype-sanitize`) — needs its own plan with allowlist design.
16. Virtualization for long threads (<100 messages is fine as plain DOM).
17. Playwright/Vitest (already deferred; matches project pattern).
18. Dark mode, i18n, Sentry/PostHog, service worker (all already deferred).
19. refetchOnWindowFocus for conversations (single-tab POC; accept default OFF).
20. Idempotency keys on POST /chat/messages (UI disable-while-pending already covers).
21. Server-response Zod validation (apiFetch trusts server shapes for POC).

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | No XSS posture for assistant content | AC-8 (new) + Task 2 step 6 + boundaries SCOPE LIMITS | Added AC-8: plain text only, `whitespace-pre-wrap`, never `dangerouslySetInnerHTML`, no markdown libs; Task 2 ChatMessage explicitly renders plain text; boundary limit explicitly calls out the markdown deferral with threat-model rationale |
| 2 | No Suspense boundary around useSearchParams | Task 2 step 11 | Page body MUST wrap in `<Suspense fallback={<ChatSkeleton />}>`; prevents Next 16 static-gen bailout warning |
| 3 | No error.tsx at /chat route | frontmatter files_modified + Task 2 step 12 (new) + verification | Added apps/web/src/app/chat/error.tsx as a release-blocking file; client component with reset button; never shows raw stack to user |
| 4 | No X-Request-Id propagation from UI | AC-10 (new) + Task 1 step 5 (apiFetch) + verification | apiFetch generates UUID per call, attaches as header, reads server echo, exposes via `ApiError.requestId`; browser devtools spot-check added to verification |
| 5 | No accessibility baseline | AC-9 (new) + Task 2 steps 6/7/8/9/10 + verification | Added AC-9 with concrete WCAG requirements; ChatMessage wraps in `<article aria-label>`; feedback buttons get `aria-label` + `aria-pressed`; suggestions use icon + text (not color-only); thread uses `role="log"` + `aria-live="polite"`; composer has `<label>` + `aria-describedby` |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | No loading skeleton on conversation fetch | Task 2 step 10 + frontmatter | ChatThread renders 3 animate-pulse skeleton bubbles during `isLoadingHistory`; added apps/web/src/app/chat/loading.tsx as App Router loading UI |
| 2 | No mutation-cancel on venue switch | Task 2 step 11 | On `venueId` change, call `queryClient.cancelQueries` for both conversation and suggestions queries + reset local `pendingMessage` state |
| 3 | No Sonner visible-toast cap | Task 1 step 9 | `<Toaster visibleToasts={3} />` + position/richColors/closeButton flags |
| 4 | No suppressHydrationWarning on root html | Task 1 step 9 | `<html lang="en" suppressHydrationWarning>` documented in plan |
| 5 | Tailwind v4 + shadcn CSS-vars pitfall | Task 1 step 2 | Source URL pinned (https://ui.shadcn.com/docs/tailwind-v4); explicit list of required vars in light + dark; explicit requirement for `@theme inline` block that remaps to `--color-*` tokens |
| 6 | No AbortSignal passthrough in apiFetch | Task 1 step 5 | apiFetch accepts `{ signal?: AbortSignal }`; apiPost forwards signal; React Query cancel-on-unmount works |
| 7 | ApiError doesn't capture requestId | Task 1 step 5 | `ApiError.requestId` added as optional field; populated from response X-Request-Id header |
| 8 | Composer textarea sizing unspecified | Task 2 step 9 | Fixed height (`rows={3}` or `min-h-[80px]`); no auto-grow in this plan |
| 9 | Rollback optimistic bubble on send error | Task 2 step 11 | `onSubmit` error branch: clear optimistic bubble, restore text in composer so user can retry without retyping |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | CSP headers via next.config.ts | Hosted-deployment concern; add when Coolify target lands. Dev `localhost:*` CSP is fiddly and mostly meaningless. |
| 2 | Sanitized markdown renderer | Needs its own plan with tag allowlist + test cases. Shipping plain text is honest about what we actually know the Claude output contains; "fix it later" is better than "ship it half-baked now." |
| 3 | Virtualization for long threads | POC conversations are <20 turns. Revisit at 100+. |
| 4 | Playwright/Vitest | Matches project-wide deferral pattern; human-verify checkpoint is the integration gate. |
| 5 | Dark mode, i18n, Sentry/PostHog, service worker | Already deferred at the plan level. |
| 6 | refetchOnWindowFocus for conversations | Single-tab POC; default OFF is fine. Re-enable when multi-tab becomes a real use case. |
| 7 | Idempotency keys on POST /chat/messages | UI disable-while-pending is sufficient. Real idempotency (survives page refresh mid-send) needs auth first. |
| 8 | Server-response Zod validation | apiFetch trusts server shapes; cost of full response validation outweighs benefit at POC scope with @gm-ai/types as the shared contract. |

## 5. Audit & Compliance Readiness

**Post-fix posture:**
- **XSS defence:** plain-text rendering + grep-enforced absence of `dangerouslySetInnerHTML` + no markdown libs in deps. Auditor can run one grep and close the finding.
- **Observability correlation:** every UI action has a requestId threaded through browser devtools → server `http.request` log → service-level logs. Incident reconstruction is one `grep requestId=<uuid>` away.
- **Accessibility:** WCAG AA baseline met — screen-reader announcements on new messages, aria-labels on icon-only controls, severity signalled by icon + text (not color alone), focus rings visible, semantic HTML (`article` / `section` / `label`).
- **Error resilience:** App Router error boundary prevents uncaught crashes from blanking the page; mutation errors rollback optimistic UI instead of leaving stale state; toast stack is capped so a downed API doesn't obscure the page.
- **Security posture inherited from 05-01:** CORS allowlist, 32kb body limit, canonical ApiErrorResponse, cross-tenant 404-not-403 — all consumed correctly by the UI (apiFetch respects codes; mapApiError covers every code in the closed set).

**Remaining risks if shipped as-is (all explicitly documented):**
- **URL-as-state leaks conversation access.** Anyone with URL history has read access to the conversation. Acceptable at POC (no auth); named deferral for post-auth migration.
- **No rate limiting.** Inherited from 05-01; UI amplifies the risk (user can spam the submit button; disable-while-pending helps but not from a bot).
- **Plain-text assistant rendering displays raw markdown tokens.** UX regression from markdown-rendering apps; accepted consciously.

**Would fail a real audit on:** HTTP rate limiting + auth. Both are accepted risks at POC scope with named deferral triggers.

## 6. Final Release Bar

**Must be true before this plan ships (post-fix):**
- All 3 tasks complete; UAT (checkpoint Task 3) approved by a human.
- Grep: zero `dangerouslySetInnerHTML` hits; zero markdown-library deps; `whitespace-pre-wrap` present in chat-message.tsx.
- Grep: `aria-label` on icon-only feedback buttons; `role="log"` + `aria-live="polite"` on thread.
- `app/chat/error.tsx` + `app/chat/loading.tsx` both exist.
- Browser devtools Network tab: every request carries a unique X-Request-Id; server logs contain matching entries.
- Sonner visibleToasts={3} verified by manual toast-storm test.
- Next.js build passes with no hydration warnings on `/chat` route transitions.
- `pnpm --filter api probe:api` still exits 29/29 while web app is running on :3000.

**Remaining risks if shipped as-is:**
- URL-as-state conversation leakage (named deferral).
- No rate limiting (named deferral; inherited from 05-01).
- Plain-text rendering shows raw markdown (UX tradeoff documented).

**Would I sign my name to this system post-fix:** Yes.

---

**Summary:** Applied 5 must-have + 9 strongly-recommended upgrades. Deferred 8 items (all with explicit triggers or scope-owners).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
