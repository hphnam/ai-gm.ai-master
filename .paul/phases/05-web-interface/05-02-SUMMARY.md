---
phase: 05-web-interface
plan: 02
subsystem: ui
tags: [nextjs, react, react-query, react-hook-form, shadcn-ui, tailwind-v4, sonner, zod, accessibility, xss-defence]

# Dependency graph
requires:
  - phase: 05-web-interface
    provides: [apiFetch contract via @gm-ai/types/api, ApiErrorResponse envelope, X-Request-Id middleware, CORS allowlist for http://localhost:3000]
  - phase: 04-chat-engine
    provides: [ChatService, SuggestionsService, AdaptationService — reached via 05-01 REST surface]
provides:
  - Working Next.js chat UI on :3000 consuming every endpoint shipped by 05-01
  - URL-as-state pattern (?venue= / ?conv=) for conversation persistence without auth/storage
  - Single-source apiFetch client with per-call X-Request-Id + ApiError with requestId capture
  - shadcn/ui (new-york, Tailwind v4 CSS-vars, neutral base) foundation — Button, Card, Select, Sonner, Input, Textarea in place
  - mapApiError() helper translating every API_ERROR_CODES value → user-facing toast string
  - Accessibility baseline (WCAG AA): role="log" + aria-live="polite" on thread; aria-label on icon-only buttons; text+icon severity on suggestions
  - XSS defence: plain-text rendering with `whitespace-pre-wrap`; zero dangerouslySetInnerHTML; zero markdown libs
affects: [05-03 debug panel, post-POC auth wrap, post-POC streaming/SSE, post-POC tests]

# Tech tracking
tech-stack:
  added:
    - "@tanstack/react-query + devtools"
    - "react-hook-form + @hookform/resolvers"
    - "zod (direct dep — mirrors 04-01 pnpm isolation rule)"
    - "clsx, tailwind-merge, class-variance-authority, lucide-react"
    - "@radix-ui/react-select, @radix-ui/react-slot"
    - "sonner + next-themes (toast peer)"
  patterns:
    - "apiFetch() is the only fetch call site in apps/web — single trust boundary"
    - "Every API call carries a fresh UUID v4 X-Request-Id; ApiError captures server-echoed id for support/debug"
    - "URL search params (?venue=, ?conv=) are the persistence surface — no localStorage / IndexedDB"
    - "React Query for all server state; no useEffect + fetch"
    - "react-hook-form + zodResolver for client-side validation before network call"
    - "Assistant content renders as plain text with whitespace-pre-wrap — NEVER dangerouslySetInnerHTML, NEVER markdown parser"
    - "App Router conventions: error.tsx + loading.tsx per route segment; <Suspense> wrapping any useSearchParams consumer"
    - "Empty state = zero DOM (no 'no suggestions' placeholder)"

key-files:
  created:
    - apps/web/components.json
    - apps/web/.env.example
    - apps/web/src/lib/api-client.ts
    - apps/web/src/lib/map-api-error.ts
    - apps/web/src/lib/utils.ts
    - apps/web/src/lib/hooks/use-venues.ts
    - apps/web/src/lib/hooks/use-conversation.ts
    - apps/web/src/lib/hooks/use-send-message.ts
    - apps/web/src/lib/hooks/use-suggestions.ts
    - apps/web/src/lib/hooks/use-feedback.ts
    - apps/web/src/components/providers/query-provider.tsx
    - apps/web/src/components/ui/button.tsx
    - apps/web/src/components/ui/card.tsx
    - apps/web/src/components/ui/select.tsx
    - apps/web/src/components/ui/sonner.tsx
    - apps/web/src/components/ui/input.tsx
    - apps/web/src/components/ui/textarea.tsx
    - apps/web/src/components/chat/venue-selector.tsx
    - apps/web/src/components/chat/chat-thread.tsx
    - apps/web/src/components/chat/chat-message.tsx
    - apps/web/src/components/chat/chat-composer.tsx
    - apps/web/src/components/chat/suggestions-surface.tsx
    - apps/web/src/components/chat/feedback-buttons.tsx
    - apps/web/src/app/chat/page.tsx
    - apps/web/src/app/chat/error.tsx
    - apps/web/src/app/chat/loading.tsx
  modified:
    - apps/web/package.json
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/page.tsx
    - apps/web/src/app/globals.css

key-decisions:
  - "mapApiError hoisted to its own file apps/web/src/lib/map-api-error.ts (plan allowed inline-in-page OR lib; chose lib so feedback hook + chat page share one source)"
  - "apiFetch generates UUID v4 X-Request-Id per call and captures server-echoed id on ApiError — closes 05-01 observability loop browser-side"
  - "Assistant bubble uses whitespace-pre-wrap — verbatim Claude output; no markdown renderer until a sanitization plan ships"
  - "URL is the only persistence surface (?venue=, ?conv=); no localStorage / IndexedDB"
  - "Toaster capped at visibleToasts={3} so a downed API doesn't stack toasts off-screen"
  - "<html suppressHydrationWarning> in layout.tsx — next-themes / sonner inject classes after hydration"

patterns-established:
  - "Every fetch in apps/web goes through apps/web/src/lib/api-client.ts (grep-verified — zero other fetch() sites)"
  - "Every @Body-shape Zod schema imported from @gm-ai/types/api; UI never redefines request shapes"
  - "Icon-only buttons carry aria-label + aria-pressed (feedback thumbs) — baseline for any future icon button in Plan 05-03"
  - "Severity on cards: icon + text label, never color-only (WCAG AA)"
  - "App Router error.tsx + loading.tsx per new route segment"
  - "On venue change: queryClient.cancelQueries(['conversation']/['suggestions']) + local pendingMessage reset so in-flight state doesn't leak across tenants"
  - "Composer: react-hook-form + zodResolver — whitespace-only blocked client-side before network"

# Metrics
duration: ~45min
started: 2026-04-18T22:00:00Z
completed: 2026-04-18T22:20:00Z
---

# Phase 5 Plan 02: Chat UI Summary

**A working Next.js chat UI on :3000 consuming every endpoint 05-01 published — venue selector, multi-turn thread with optimistic render, proactive suggestions, thumbs feedback, URL-persisted conversations, ApiErrorResponse-aware toasts — with WCAG AA accessibility, XSS-safe plain-text rendering, and browser-side X-Request-Id correlation back to the api's `http.request` logs.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 minutes (PLAN + AUDIT pre-recorded; APPLY ~30 min incl. human UAT) |
| Started | 2026-04-18T22:00:00Z |
| Completed | 2026-04-18T22:20:00Z |
| Tasks | 3/3 completed; UAT (AC-7) approved by human verifier |
| Files created | 26 |
| Files modified | 4 |
| Regression check | `pnpm --filter api probe:api` — 29/29 still green alongside running web app |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Venue selector renders + persists to URL | Pass | GET /venues populates dropdown; select navigates to /chat?venue=<uuid>; label persists across refresh |
| AC-2: New conversation empty state | Pass | Composer auto-focused; zero-DOM on empty suggestions (no placeholder); on-open suggestions render above composer |
| AC-3: Send message + optimistic render + persistence | Pass | Optimistic user bubble; submit disabled while pending; URL gains ?conv=; on-turn + send fire in Promise.all |
| AC-4: Thumbs feedback on assistant messages | Pass | Optimistic highlight; state swaps up↔down without reload; success/error toasts; rollback on 500 |
| AC-5: Error rendering via ApiErrorResponse | Pass | mapApiError() covers every API_ERROR_CODES value; whitespace-only blocked client-side by zod resolver |
| AC-6: Refresh preserves state via URL | Pass | GET /chat/conversations/:id?venueId=… on mount; full thread re-renders; bookmark reopens identical state |
| AC-7: UAT — end-to-end human verification | Pass | Human tester walked 14-step script; all steps green; approved |
| AC-8: Assistant content as plain text (XSS defence) | Pass | `whitespace-pre-wrap` in chat-message.tsx; grep: zero `dangerouslySetInnerHTML`; zero markdown libs in package.json |
| AC-9: Accessibility baseline (WCAG AA) | Pass | `role="log"` + `aria-live="polite"` on thread; aria-label on feedback buttons; icon+text severity on suggestions; composer label + aria-describedby |
| AC-10: X-Request-Id passthrough | Pass | apiFetch generates UUID v4 per call; server echoes; ApiError captures requestId; Network tab + api http.request logs correlate |

## Accomplishments

- **Every endpoint from 05-01 has a UI trigger** — GET /venues, POST /chat/messages, GET /chat/conversations/:id, POST /suggestions/on-open, POST /suggestions/on-turn, POST /feedback all exercised through normal user flows.
- **Observability loop closes browser-side** — apiFetch generates a fresh UUID X-Request-Id per call; api echoes it in both header and `http.request` log; ApiError carries requestId for support/debug display. A developer can now grep api logs by the requestId shown on any failure toast.
- **XSS posture explicit and grep-enforced** — assistant content renders as plain text with `whitespace-pre-wrap`; zero `dangerouslySetInnerHTML` usages; zero markdown libs in dependency tree. If Claude later needs rich rendering, a separate plan must land sanitization first — the boundary is documented.
- **Accessibility baseline shipped pre-emptively** — `role="log"` + `aria-live="polite"` thread container; aria-labels on every icon-only button; severity conveyed by text+icon (never color alone); composer has label + aria-describedby. WCAG AA minimums met before any accessibility audit could flag them.
- **Pattern templates for 05-03** — apiFetch singleton, URL-as-state, zero-DOM empty states, toast-as-error-surface, App Router error.tsx/loading.tsx per segment, mapApiError extensibility point.

## Task Commits

Atomic commits deferred (repo pattern — phase-level commit at phase transition, mirrors Phase 3 `ceb81bb` + Phase 4 `3569f16`). All Phase 5 work (05-01 + 05-02) is on the working tree and will be committed in the Phase 5 transition commit after 05-03 completes.

| Task | Description |
|------|-------------|
| Task 1: Web foundation (shadcn/ui init, React Query provider, api-client, venue selector) | 16 files created + package.json updated; build clean |
| Task 2: Chat page (thread, composer, suggestions surface, feedback buttons, hooks) | 10 files created; 3 app/* files edited; build clean; full Playground flow works |
| Task 3: Human-verify checkpoint (AC-7) | 14-step UAT walked live; approved; probe:api regression 29/29 green alongside running web app |

## Files Created/Modified

### Created (26)

| File | Purpose |
|------|---------|
| `apps/web/components.json` | shadcn/ui config — new-york style, neutral base, CSS vars, Tailwind v4 |
| `apps/web/.env.example` | `NEXT_PUBLIC_API_URL=http://localhost:3001` + CORS allowlist comment |
| `apps/web/src/lib/api-client.ts` | `apiFetch<T>()` + `apiPost<T>()` + `ApiError` class; UUID X-Request-Id per call; safe JSON parse; AbortSignal passthrough |
| `apps/web/src/lib/map-api-error.ts` | Single-source translation from ApiErrorCode → user-facing toast string (deviation: hoisted to own file — see below) |
| `apps/web/src/lib/utils.ts` | `cn()` — clsx + tailwind-merge |
| `apps/web/src/lib/hooks/use-venues.ts` | `useVenues()` — GET /venues |
| `apps/web/src/lib/hooks/use-conversation.ts` | `useConversation(conversationId, venueId)` — GET /chat/conversations/:id?venueId |
| `apps/web/src/lib/hooks/use-send-message.ts` | `useSendMessage()` — POST /chat/messages + invalidate conversation on success |
| `apps/web/src/lib/hooks/use-suggestions.ts` | `useOnOpenSuggestions(venueId)` + `useOnTurnSuggestions()` |
| `apps/web/src/lib/hooks/use-feedback.ts` | `useFeedback()` — POST /feedback + success/error toast wiring |
| `apps/web/src/components/providers/query-provider.tsx` | `<QueryProvider>` — retry:1, refetchOnWindowFocus:false, staleTime:30s; devtools in dev only |
| `apps/web/src/components/ui/button.tsx` | shadcn button with cva variants |
| `apps/web/src/components/ui/card.tsx` | shadcn card |
| `apps/web/src/components/ui/select.tsx` | shadcn select (radix-backed) |
| `apps/web/src/components/ui/sonner.tsx` | shadcn Toaster wrapper — next-themes aware |
| `apps/web/src/components/ui/input.tsx` | shadcn input |
| `apps/web/src/components/ui/textarea.tsx` | shadcn textarea |
| `apps/web/src/components/chat/venue-selector.tsx` | Dropdown bound to ?venue= URL param |
| `apps/web/src/components/chat/chat-thread.tsx` | `role="log" aria-live="polite"` list; optimistic bubble; auto-scroll; history skeleton |
| `apps/web/src/components/chat/chat-message.tsx` | Role-based bubble; `whitespace-pre-wrap`; article aria-label; pending/aria-busy |
| `apps/web/src/components/chat/chat-composer.tsx` | react-hook-form + zodResolver; Enter submits / Shift+Enter newline; sr-only label + aria-describedby |
| `apps/web/src/components/chat/suggestions-surface.tsx` | Zero-DOM on empty; icon+text severity (AlertTriangle/Info); `section aria-label` |
| `apps/web/src/components/chat/feedback-buttons.tsx` | Thumbs up/down with aria-label + aria-pressed; optimistic state + rollback |
| `apps/web/src/app/chat/page.tsx` | Orchestrator — Suspense-wrapped; reads ?venue/?conv; Promise.all send + on-turn; cancelQueries on venue change |
| `apps/web/src/app/chat/error.tsx` | App Router error boundary — reset button, no stack trace |
| `apps/web/src/app/chat/loading.tsx` | App Router loading skeleton |

### Modified (4)

| File | Change |
|------|--------|
| `apps/web/package.json` | + @tanstack/react-query (+ devtools), react-hook-form + @hookform/resolvers, zod, clsx/tailwind-merge/class-variance-authority/lucide-react, @radix-ui/react-select + @radix-ui/react-slot, sonner, next-themes |
| `apps/web/src/app/layout.tsx` | `<html lang="en" suppressHydrationWarning>`; `<QueryProvider>` wrap; `<Toaster position="top-right" richColors closeButton visibleToasts={3} />` |
| `apps/web/src/app/page.tsx` | Server component: `redirect('/chat')` |
| `apps/web/src/app/globals.css` | Tailwind v4 `@theme` CSS-vars block (shadcn new-york, neutral, light + dark) + `@theme inline --color-*` re-declaration |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `mapApiError` in its own file (`apps/web/src/lib/map-api-error.ts`) | Plan said "inline in page or in lib". Both `useFeedback` hook and chat page need the translation; sharing a module avoids drift (two inline copies could disagree on which code → which string) | Establishes the "client-side single-source error translation" pattern mirroring 05-01's `translateChatServiceError` |
| Assistant content as plain text with `whitespace-pre-wrap` | Claude outputs are untrusted enough that unsanitized rendering ships prompt-injection XSS. A sanitized markdown renderer is a separate scope item with an explicit threat model | Users see `**bold**` and `# heading` as verbatim characters; newlines preserved via CSS; when rich rendering lands, sanitization plan lands with it |
| URL-as-state (?venue=, ?conv=) | No auth yet; URL is the only persistence surface a refresh / bookmark / tab share can rely on without localStorage privacy edge cases | URL-leak caveat documented in boundaries; post-auth, conversation IDs move off URL |
| `visibleToasts={3}` on Sonner | Without a cap, a downed API produces N toasts per retry and stacks off-screen | UX degrades gracefully under failure; proved by simulating 5 rapid error toasts |
| `<html suppressHydrationWarning>` | next-themes / sonner inject a class on the html element after hydration; without the attribute React logs a hydration warning | Zero console warnings in browser devtools during normal flows |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | Plan executed exactly as specified on first build |
| Scope additions | 0 | — |
| Placement choice within plan-allowed options | 1 | `mapApiError` helper landed in its own file rather than inline — plan text allowed both; chose lib so hook + page share |
| Deferred | 0 | All deferrals already captured in 05-02-AUDIT.md (8 items — CSP headers, sanitized markdown, virtualization, tests, dark mode, i18n, Sentry, service-worker) |

**Total impact:** Effectively zero deviation. One placement choice within plan-permitted options, documented for consistency.

### Placement Choice

**1. [code-organization] `mapApiError` hoisted to its own file**
- **Plan text:** Task 2 step 12 — "Error mapping helper (inline in page or in lib)"
- **Choice made:** `apps/web/src/lib/map-api-error.ts` (the "in lib" option)
- **Rationale:** `useFeedback` hook invokes `mapApiError` for its error toast, and `apps/web/src/app/chat/page.tsx` invokes it for the composer's send-error toast. A shared module keeps the API-code → user-string mapping in exactly one place — same rule as 05-01's `translateChatServiceError` server-side
- **Files:** apps/web/src/lib/map-api-error.ts (23 lines)
- **Verification:** Imported from both `apps/web/src/lib/hooks/use-feedback.ts` and `apps/web/src/app/chat/page.tsx`; grep confirms no duplicate error-code switch statements elsewhere in apps/web/src
- **Pattern established:** Any client-side translation of server error codes → user strings belongs in `apps/web/src/lib/map-*-error.ts` — not duplicated at call sites

### Deferred Items

None added during APPLY. Audit-level deferrals already documented in 05-02-AUDIT.md with explicit triggers.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| — | Plan executed cleanly; no blockers; no auto-fix required |

## Next Phase Readiness

**Ready for Plan 05-03 (Debug / Observability Panel):**
- apiFetch singleton with X-Request-Id capture — panel can render requestId per network call and deep-link to api `http.request` logs
- React Query cache is the natural surface for "most recent retrieval scores / toolCallLog" — invalidation patterns established
- mapApiError extensibility point — new error codes (debug-panel-specific) land in one place
- App Router conventions (error.tsx / loading.tsx per segment) — 05-03 route can mirror `/chat/debug` or `/debug` consistently
- shadcn/ui foundation (Button, Card, Select, Input, Textarea, Sonner) + Tailwind v4 CSS-vars — 05-03 adds only what it needs (likely Table, Tabs, Collapsible) without re-configuring theme
- Zero-DOM empty state pattern + icon+text severity pattern for WCAG AA compliance

**Concerns:**
- `degraded` state flag in SendChatMessageResponse — still unresolved from 05-01; 05-03 may want to surface "this was the fallback text, not a real Claude answer" on the debug panel
- No virtualization on long threads — revisit if 05-03 debug panel exposes historical conversations
- No streaming — 05-03 is pre-deployment so still non-streaming; post-POC plan covers SSE
- No HTTP rate limiting — still deferred; the CORS allowlist is the only browser-side budget protection until auth ships

**Blockers:**
- None.

---
*Phase: 05-web-interface, Plan: 02*
*Completed: 2026-04-18*
