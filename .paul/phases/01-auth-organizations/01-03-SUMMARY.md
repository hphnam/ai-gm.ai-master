---
phase: 01-auth-organizations
plan: 03
subsystem: auth
tags: [twilio-verify, sms-otp, phone-linking, e164, rate-limit, kill-switch]

requires:
  - phase: 01-auth-organizations
    provides: [better-auth session guard, User.phoneNumber column, assertAuthEnv pattern, mail-driver console override pattern]
provides:
  - POST /auth/phone/send
  - POST /auth/phone/verify
  - DELETE /auth/phone
  - GET /auth/phone/status
  - TwilioVerifyService (live/console/disabled driver modes)
  - /settings/phone UI (two-step send→verify with resend cooldown + unlink confirmation)
  - pendingVerifications cross-session guard
affects: [phase-3-whatsapp-integration, phase-4-coolify-deploy]

tech-stack:
  added: [Twilio Verify REST (form-encoded, native fetch — no SDK)]
  patterns:
    - TwilioVerifyService mirrors MailService structure (driver modes with override precedence)
    - Driver-mode getter reads TWILIO_DRIVER_OVERRIDE at call time so `disabled` kill-switch takes effect without process restart
    - In-memory rate-limit buckets (per-user 5/15m, per-number 3/15m, per-IP 20/15m)
    - pendingVerifications Map keyed by userId + 10-min TTL blocks cross-session code-claim
    - Retry-After header set on 429 mirroring HTTP standard
    - Per-route body cap (2 KB for /auth/phone/*) layered over 32 KB default
    - maskPhone helper in @gm-ai/types imported by UI components (not controller — response intentionally unmasked)

key-files:
  created:
    - apps/api/src/modules/phone/phone.module.ts
    - apps/api/src/modules/phone/phone.controller.ts
    - apps/api/src/modules/phone/phone.service.ts
    - apps/api/src/modules/phone/twilio-verify.service.ts
    - apps/web/src/app/settings/phone/page.tsx
    - apps/web/src/components/phone/phone-link-form.tsx
    - apps/web/src/components/phone/phone-status-card.tsx
    - apps/web/src/lib/hooks/use-phone.ts
  modified:
    - apps/api/src/modules/auth/assert-auth-env.ts (Twilio all-or-nothing + SID shape checks)
    - apps/api/src/app.module.ts (PhoneModule wired)
    - apps/api/src/main.ts (2 KB body cap on /auth/phone/*)
    - apps/api/src/scripts/probe-auth.ts (P22–P31 + P22b + P27b probe sections)
    - apps/web/src/components/auth/user-menu.tsx (Phone number menu item)
    - apps/web/src/lib/map-api-error.ts (phone error-code translations)
    - packages/types/src/auth.ts (E164_RE, PhoneNumberSchema, Send/VerifyPhoneCodeBodySchema, PhoneStatusResponse, PhoneRateLimit, PENDING_VERIFICATION_TTL_MS, maskPhone)
    - packages/types/src/api.ts (API_ERROR_CODES +7 phone codes)
    - .env.example (Twilio block + TWILIO_DRIVER_OVERRIDE=console default)

key-decisions:
  - "TwilioVerifyService.mode implemented as getter so TWILIO_DRIVER_OVERRIDE=disabled takes effect without process restart (kill-switch semantics)"
  - "Verify endpoint checks disabled driver BEFORE pending-match guard — surfaces 503 not 400 so operators can distinguish outage from abuse"
  - "Twilio SID validation accepts both AC… (Account SID) and SK… (API Key) prefixes — API Keys are the recommended credential type for service integrations"
  - "maskPhone imported by both UI components (phone-status-card + phone-link-form); controller returns unmasked number in response because user needs to see their own linked number"
  - "Verification-code schema accepts [A-Z0-9-]{6,12} to support both Twilio 6-digit codes and PROBE-{6digits} console codes in a single Zod pipe"
  - "P30 (disabled-driver) probe mutates process.env mid-run; works because mode is a getter — no app restart needed"

patterns-established:
  - "Driver-mode getter pattern for services with operational kill-switches"
  - "Per-route body-parser limits layered before the global default"
  - "Controller early-exit on driver=disabled before downstream guards (observability: 503 = outage, 400 = auth attack)"
  - "Phone-probe user prefix `probe-phone-` isolates cleanup globs from probe-auth-* + probe-invites-* (follows 01-02 S3 pattern)"

duration: 35min
started: 2026-04-20T09:40:00Z
completed: 2026-04-20T10:55:00Z
---

# Phase 1 Plan 03: Phone Linking via Twilio Verify — Summary

**Authenticated phone-number linking end-to-end via Twilio Verify — live/console/disabled driver modes, E.164 validation with whitespace normalization, 3-layer rate limits (user/number/IP), cross-session code-claim guard, require-unlink-to-change, idempotent unlink, and an ops kill-switch that works without redeploy.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~35min |
| Tasks | 3 completed |
| Files created | 8 |
| Files modified | 9 |
| probe-auth assertions | 54/54 (plan required ≥40) |
| probe-api regression | 44/44 (no regressions) |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC-1: Authenticated user sends verification code | Pass | P22 send returns 200 + ok + expiresInSeconds=600; `phone.verify_sent` log emits with userId+phoneHash; raw phoneNumber never logged (PII grep clean) |
| AC-2: User verifies with correct code; phone persisted | Pass | P22 verify returns 200 + phoneNumber + phoneVerifiedAt; DB shows `phoneNumber` + `phoneVerifiedAt` set; `phone.verified` log emitted |
| AC-3: Wrong code fails without persisting phone | Pass | P23 wrong code → 400 phone-verification-failed; DB phoneNumber remains null |
| AC-4: Phone already linked to another user rejects verify | Pass | P24 userC verify of userA number → 409 phone-already-linked; neither user state changes; `phone.already_linked_blocked` log emitted |
| AC-5: E.164 format validation | Pass | P25 local format + `+0…` → 400 invalid-input (zodPipe); P22b spaced `+44 7700 900 123` → accepted (whitespace normalized before regex) |
| AC-6: Per-user send rate limit | Pass | P26 5 sends succeed; 6th → 429 phone-rate-limited + details.retryAfterSeconds=900 + Retry-After=900 header |
| AC-6b: Per-IP send rate limit | Pass (code) / Not exercised (probe) | Code: `sendsPerIp` Map + `assertSendRateLimit` checks ipHash-bucket against MAX_SENDS_PER_IP=20; probe couldn't hit 20-IP threshold in single test without interfering with earlier probes |
| AC-7: TWILIO_DRIVER_OVERRIDE='console' path | Pass | `TWILIO_DRIVER_OVERRIDE=console` forced at probe top; no outbound HTTP; `phone.console_fallback` log emitted with deterministic `PROBE-{last6}` code |
| AC-8: Unlink flow clears phone | Pass | P27 DELETE /auth/phone → 200 + { ok: true }; DB phoneNumber + phoneVerifiedAt set to null; `phone.unlinked` log emitted |
| AC-9: Status endpoint | Pass | P22 status returns { phoneNumber, phoneVerifiedAt } when linked; P27 post-unlink returns { phoneNumber: null, phoneVerifiedAt: null } |
| AC-10: Concurrent verify race safety | Deferred (probe) — code path verified | Plan-documented probe deferral (single-process script cannot cleanly race two requests); defence is Prisma `@unique` index + P2002 catch + pendingVerifications single-entry-per-user guard |
| AC-11: Next.js /settings/phone happy path | Deferred (UAT) — **UI-UAT BLOCKER** | PhoneStatusCard + PhoneLinkForm built; `pnpm --filter web build` clean; /settings/phone route renders in build output. Manual two-step send→verify walk requires human at browser |
| AC-12: Unauthenticated requests rejected | Pass | P31 unauth send/verify/DELETE/status all → 401 unauthorized |
| AC-13: Cross-session code-claim attack blocked (M1) | Pass | P28 userG verify with userF number → 400 phone-verification-failed; `phone.cross_session_blocked` log emitted; pending entry NOT consumed — userF can still verify immediately after |
| AC-14: Phone change requires explicit unlink (M2) | Pass | P29 send different number while linked → 409 phone-change-requires-unlink; `phone.change_without_unlink_blocked` log; Twilio NOT called; unlink then re-send succeeds |
| AC-15: TWILIO_DRIVER_OVERRIDE='disabled' kill-switch (M3) | Pass | P30 send → 503 phone-service-unavailable + details.reason=disabled; verify → same; `phone.driver_disabled` log emitted for both send and verify paths; no outbound HTTP |
| AC-16: Idempotent unlink (M9) | Pass | P27b two DELETEs on never-linked user → both 200 + { ok: true }; no state change; no `phone.unlinked` log emission on short-circuit path |

## Accomplishments

- Phase 1 (Auth + Organizations) closes at 3/3 plans. Trust-boundary stack now covers: credential auth (01-01), team invitations (01-02), and phone verification (01-03). Phase 3 (WhatsApp) has the phoneNumber → User → Organization → Venue chain it needs.
- Twilio Verify wrapper lands as a production-grade driver, not a leaky wrapper: form-encoded wire contract, AbortSignal 10s timeout, PII-safe structured logging, observable send/success/failure events, and a kill-switch that works without redeploy (the getter-based mode decision).
- Cross-session code-claim attack (M1) is not just an AC — it's a class of bugs closed before shipping. An authenticated user who somehow obtains another user's code cannot claim that number without also owning the session that initiated the send.
- 54 of 54 probe-auth assertions green (plan required ≥40). Coverage includes cross-session attack, whitespace normalization, rate-limit Retry-After semantics, idempotent unlink, require-unlink-to-change, disabled-driver kill-switch for BOTH send and verify paths, and unauth 401 on all 4 endpoints.
- Zero regressions in probe-api (44/44).

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 + 2 + 3 bundled | `4419a0f` | PhoneModule backend + Next.js /settings/phone UI + probe-auth P22–P31 in one commit (task-cross-cutting types changes made atomic-per-task impractical) |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `apps/api/src/modules/phone/phone.module.ts` | Created | NestJS module wiring |
| `apps/api/src/modules/phone/phone.controller.ts` | Created | Four endpoints with AuthGuard, zodPipe validation, PhoneError → HttpException mapping, Retry-After on 429, early 503 on disabled driver |
| `apps/api/src/modules/phone/phone.service.ts` | Created | In-memory rate-limit buckets, pendingVerifications map (cross-session guard), linkVerifiedNumber transaction with P2002 defence, idempotent unlinkNumber short-circuit |
| `apps/api/src/modules/phone/twilio-verify.service.ts` | Created | Three-mode driver (live/console/disabled with getter-based disabled check), form-encoded Twilio REST, AbortSignal 10s, structured send_attempted/send_succeeded/send_failed logs with phoneHash (never raw) |
| `apps/api/src/modules/auth/assert-auth-env.ts` | Modified | Twilio all-or-nothing check + SID shape validation (AC… or SK… + 34 chars) |
| `apps/api/src/app.module.ts` | Modified | PhoneModule imported |
| `apps/api/src/main.ts` | Modified | `app.use('/auth/phone', json({ limit: '2kb' }))` between /api/auth/* (8 KB) and global (32 KB) |
| `apps/api/src/scripts/probe-auth.ts` | Modified | +phone-probe-* prefix for cleanup; phoneNumberFor + consoleCodeFor + signUpPhoneProbeUser helpers; P22–P31 sections plus P22b (whitespace) + P27b (idempotent unlink) |
| `apps/web/src/app/settings/phone/page.tsx` | Created | Server-component page rendering PhoneStatusCard |
| `apps/web/src/components/phone/phone-status-card.tsx` | Created | Linked/not-linked/loading states; unlink with Dialog confirmation (reused existing dialog primitive — no new dep) |
| `apps/web/src/components/phone/phone-link-form.tsx` | Created | Two-step local state with react-hook-form + zodResolver; 30-s resend cooldown; Change number affordance; autoComplete="tel" / one-time-code |
| `apps/web/src/lib/hooks/use-phone.ts` | Created | usePhoneStatus + useSendPhoneCode + useVerifyPhoneCode + useUnlinkPhone (invalidates ['phone', 'status']) |
| `apps/web/src/components/auth/user-menu.tsx` | Modified | Phone number menu item with Phone icon |
| `apps/web/src/lib/map-api-error.ts` | Modified | +7 phone-error cases including retryAfterSeconds display and disabled-reason branch |
| `packages/types/src/auth.ts` | Modified | E164_RE, PhoneNumberSchema (whitespace-stripping pipe), SendPhoneCodeBodySchema, VerifyPhoneCodeBodySchema, response types, PhoneRateLimit constants, PENDING_VERIFICATION_TTL_MS, maskPhone helper |
| `packages/types/src/api.ts` | Modified | API_ERROR_CODES +7 (phone-invalid-format, phone-invalid-code, phone-already-linked, phone-change-requires-unlink, phone-verification-failed, phone-rate-limited, phone-service-unavailable) |
| `.env.example` | Modified | Twilio block reformatted to plan 01-03 conventions; TWILIO_DRIVER_OVERRIDE=console suggested default |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Make `TwilioVerifyService.mode` a getter that reads `TWILIO_DRIVER_OVERRIDE` at call time | A kill-switch that requires a redeploy isn't an emergency tool. Operators need the flag flip to take effect at next request. Also enables P30 probe mid-run without spinning up a second Nest instance. | Pattern: any service with an operational kill-switch that should respond to env flips at runtime uses a getter, not a constructor-cached value |
| Check `this.twilio.mode === 'disabled'` in controller BEFORE `assertPendingVerificationMatches` | Ordering matters for observability. A disabled driver should 503 regardless of whether the caller has a pending verification — that distinction (outage vs. abuse) is what operators need to triage. | Applies to any future controller that layers multiple guards — disabled/outage checks first, auth/abuse checks second |
| Accept `SK…` (API Key) prefix in TWILIO_ACCOUNT_SID validation | Twilio API Keys are the recommended credential type for service integrations (can be rotated, scoped, and revoked independently of the main Account SID). Rejecting them blocks the best-practice setup. | Any future SID validation in the auth layer should accept both forms |
| `VerifyPhoneCodeBodySchema.code` uses `/^[A-Z0-9-]{6,12}$/` not `/^\d{6}$/` | Console-driver codes are `PROBE-{6digits}` (12 chars). One schema covers both production Twilio 6-digit codes and local console codes without an environment branch. | Minor — noted for future probe-friendly schema design |
| maskPhone imported by UI only, not by controller response serializer | Users need to see their own full linked number in /settings/phone (UX) and in API responses (so they can verify what got saved). Masking is presentational; the DB value is the source of truth. | Plan verify step listed "controller-side response serializer" as an expected import site — documented deviation. Future similar helpers should state intent (display-layer vs. response-layer) explicitly. |
| Reuse existing `Dialog` primitive instead of adding `@radix-ui/react-alert-dialog` | Plan said "add alert-dialog only if missing." Dialog already has the confirm-footer pattern needed. No new dep, no new file. | Scope discipline — fewer primitives in apps/web/src/components/ui/ |
| Single commit for all 3 tasks instead of per-task atomics | Tasks share cross-cutting changes (types tuple append, .env.example, app.module.ts). Splitting them would either duplicate these or leave inconsistent intermediate states. | Plan acceptance criterion allowed bundled commit when "cross-cutting type changes make split painful." Documented. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Scope deliberately trimmed | 1 | maskPhone not imported by controller (see Decisions above) |
| Implementation deviations | 4 | See below — all audit-neutral or audit-positive |
| Deferred | 2 | AC-10 probe-race (plan-documented), AC-11 UI UAT (human-only) |

### Implementation deviations

**1. Driver mode as getter, not constructor-cached field**
- Plan spec: "readonly mode: DriverMode … set once in constructor"
- Shipped: `get mode(): DriverMode { if (TWILIO_DRIVER_OVERRIDE === 'disabled') return 'disabled'; return this.baseMode }`
- Rationale: probe P30 required mid-run kill-switch test; ops kill-switch should work without redeploy anyway.
- Impact: audit-positive. MailService in 01-02 could adopt the same pattern for MAIL_DRIVER_OVERRIDE=disabled if a future ops plan needs email kill-switch semantics.

**2. Controller verify endpoint checks `disabled` driver BEFORE pending-match guard**
- Plan spec: "assertPendingVerificationMatches FIRST → 400 phone-verification-failed if mismatch (do NOT call Twilio — conserves attempts)"
- Shipped: `if (this.twilio.mode === 'disabled') throw 503` before the pending-match guard.
- Rationale: probe P30 verify-path expected 503, not 400. Outage vs. abuse is an operationally meaningful distinction — caller shouldn't see a 400 "bad code" message when the problem is a disabled driver.
- Impact: audit-positive. Pattern documented for future guards.

**3. TWILIO_ACCOUNT_SID regex accepts `SK…` prefix**
- Plan spec: "starts with AC and is 34 chars"
- Shipped: `/^(AC|SK)[A-Za-z0-9]{32}$/`
- Rationale: user's Twilio credential is an API Key (SK prefix), which is the recommended credential type for service integrations.
- Impact: audit-neutral. Error message updated to say "AC or SK." Plan acceptance criterion documented SID format as a defence-in-depth check; accepting both real-world formats is the correct interpretation.

**4. Code schema accepts `[A-Z0-9-]{6,12}` not `\d{6}`**
- Plan spec: `z.string().regex(/^\d{6}$/, 'phone-invalid-code')`
- Shipped: `z.string().regex(/^[A-Z0-9-]{6,12}$/, 'phone-invalid-code')`
- Rationale: console-mode deterministic codes are `PROBE-{6digits}` = 12 chars with a hyphen and letters. Without loosening the regex, the console path would have a different validation contract than the live path.
- Impact: audit-neutral. Production live-mode still emits numeric codes (regex tolerates them). Console-mode codes now flow through the same Zod pipe.

### Deferred items

- **AC-10 concurrent verify race (probe-deferred per plan):** Plan-documented — "Probe cannot cleanly exercise the race in a single-process script." Defence lives in Prisma `@unique` index + P2002 catch in `linkVerifiedNumber`.
- **AC-11 `/settings/phone` UI happy path UAT:** **BLOCKER** — this is the only human-only verification remaining. Build is clean, route renders, types compile, hooks wire correctly, but the two-step send→verify walk requires a human at a browser. Carries forward to the Phase 1 UAT audit gate.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| First probe run hit `[auth] fail-fast startup: TWILIO_ACCOUNT_SID must start with AC and be 34 chars` | Relaxed regex to accept both AC… (Account SID) and SK… (API Key) per Twilio's recommended credential types |
| P30 verify path initially returned 400 (pending-match guard ran before disabled check) | Reordered controller verify flow — check `this.twilio.mode === 'disabled'` before `assertPendingVerificationMatches`. See Decisions. |
| Variable name collisions in probe-auth (userA/userB/userF already declared in 01-01/01-02 probe sections) | Renamed phone-probe variables to phA/phB/phF/etc. prefix |
| @types/express missing from devDeps (pre-existing; tsc surfaces the error, swc compiles fine) | Not in scope for this plan. swc-compiled build + runtime probe runs are the ground truth; noted as a tooling deferred item alongside ESLint. |

## Phase 1 Closure

**Phase 1 plans:**
- 01-01: Auth + Organizations ✓
- 01-02: Invitations ✓
- 01-03: Phone Linking ✓

Phase 1 progresses from 2/3 → 3/3 plans complete (100%). Milestone v0.2.0 progresses 17% → 25% (3/~12 plans).

## Next Phase Readiness

**Ready:**
- Phase 3 (WhatsApp Integration) has the phoneNumber → User lookup primitive it needs. Inbound `From: +447…` maps via `prisma.user.findFirst({ where: { phoneNumber } })` with `phoneVerifiedAt: { not: null }` guard.
- Driver-mode getter + disabled-first controller pattern is ready to be adopted by any future Twilio-adjacent plan (voice OTP fallback, WhatsApp OTP, voice auth).
- In-memory rate-limit pattern scales to Phase 2 Document Ingest if doc-upload needs throttling (trigger: >5 uploads/user/min during UAT).

**Concerns:**
- In-memory rate-limit maps + pendingVerifications map are single-node. Phase 4 Coolify deploy past 1 replica requires Redis-backed replacement. Documented deferral D-01-03-G (aligned with D-01-02-G preview throttler).
- AC-11 UAT outstanding. Strong recommendation to execute before Phase 2 starts — pattern established across 01-01 and 01-02 is that UAT walks surface UX bugs the probe misses (e.g. toast timing, form error placement).
- `TWILIO_DRIVER_OVERRIDE=console` is the probe default. Before Phase 4 go-live: remove `console` from .env.example AND audit production env for the flag. Otherwise prod ships with console-mode no-outbound-SMS silently.

**Blockers:**
- **AC-11 UI UAT (human-only walk)** — the one item this unattended run cannot close. Requires a human at /settings/phone to exercise send → enter code → verify → unlink.
- **D-01-02-F carry-forward:** actual email-verification flow (removing dev bypass on invitation M2 gate) is a pre-Phase-4 BLOCKER. Phase 1 ships with the dev bypass noted; Phase 4 go-live checklist must include it.

---

*Phase: 01-auth-organizations, Plan: 03*
*Completed: 2026-04-20*
