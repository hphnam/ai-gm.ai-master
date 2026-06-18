---
phase: 03-whatsapp-integration
plan: 05
subsystem: auth
tags: [infobip, 2fa, sms, otp, phone-verification, provider-migration]

requires:
  - phase: 01-auth-organizations (Plan 01-03)
    provides: PhoneService + PhoneController + TwilioVerifyService (now replaced)
  - phase: 03-whatsapp-integration (Plan 03-04)
    provides: Infobip env block + Authorization header pattern + HALT discipline

provides:
  - InfobipVerifyService replacing TwilioVerifyService for SMS OTP
  - Full Twilio removal from apps/api/src (runtime code only; historical comments past-tense)
  - PHONE_VERIFY_DRIVER_OVERRIDE env (scope: SMS OTP only)
  - INFOBIP_2FA_APPLICATION_ID + INFOBIP_2FA_MESSAGE_ID env
  - pinId in-memory cache with TTL + FIFO eviction
  - Shape-based pin-state classification (pin-expired / pin-blocked / pin-not-found / pin-cache-miss)
  - X-Request-Id correlation propagated through service-layer phone.* logs

affects: [Phase 4 Coolify Deployment — Infobip Portal UAT + 2FA Application setup now gate live SMS]

tech-stack:
  added: []  # no new runtime deps — replaces Twilio Verify REST with Infobip 2FA REST
  patterns:
    - Shape-based error classification (by response shape, not enumerated string sets)
    - Sanitiser helpers (sanitiseError + sanitiseInfobipText) for secret + PII redaction
    - In-memory TTL+FIFO cache with explicit constants (INFOBIP_PIN_TTL_MS, MAX_PIN_CACHE_ENTRIES)
    - requestId options-bag param threading from HTTP layer into service-layer logs

key-files:
  created:
    - apps/api/src/modules/phone/infobip-verify.service.ts
  modified:
    - apps/api/src/modules/phone/phone.module.ts
    - apps/api/src/modules/phone/phone.controller.ts
    - apps/api/src/modules/auth/assert-auth-env.ts
    - .env.example
    - apps/api/src/modules/whatsapp/whatsapp.adapter.ts (comment past-tense rewrite)
    - apps/api/src/modules/whatsapp/typing-indicator-timers.ts (comment past-tense rewrite)
    - apps/api/src/modules/chat/chat.service.ts (two comment past-tense rewrites)
  deleted:
    - apps/api/src/modules/phone/twilio-verify.service.ts

key-decisions:
  - "Shape-based pinError classification: classify by response shape (2xx+verified:false+pinError→approved:false) not by enumerating Infobip's undocumented error-code set"
  - "Rename injection identifier verify→verifier to avoid TS duplicate-identifier with controller method named verify"
  - "INFOBIP_PIN_TTL_MS=900_000 (15min) chosen as the longest documented PIN default; cache entries past this are ALWAYS stale"
  - "Driver-override env renamed TWILIO_DRIVER_OVERRIDE→PHONE_VERIFY_DRIVER_OVERRIDE — concern-scoped; decoupled from WhatsApp's INFOBIP_DRIVER_OVERRIDE"

patterns-established:
  - "Provider-agnostic identifier in HTTP controllers (this.verifier not this.twilio) — wire-layer rename of service does not propagate into controller identifier"
  - "Every wire literal (URL path, HTTP method, header, request/response field name) carries a `// Source: <URL> · verified <date>` citation inline"
  - "Fetch errors NEVER logged via String(err)/JSON.stringify(err) — always through a sanitise helper that redacts PII and truncates"

duration: ~35min
started: 2026-04-20T21:28:00Z
completed: 2026-04-20T22:05:00Z
---

# Phase 3 Plan 05: Twilio SMS OTP → Infobip 2FA Migration Summary

**TwilioVerifyService replaced by InfobipVerifyService on POST /2fa/2/pin + POST /2fa/2/pin/{pinId}/verify with `Authorization: App {API_KEY}` auth — project runtime is now 100% Twilio-free.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~35min |
| Started | 2026-04-20T21:28:00Z (user flagged "I got rid of Twilio entirely") |
| Completed | 2026-04-20T22:05:00Z (build clean + DI smoke + grep-audit pass) |
| Tasks | 3 of 3 completed |
| Files modified | 8 modified + 1 created + 1 deleted |
| AC assessed | 11 of 11 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Live send via POST /2fa/2/pin | Structural-Pass | UAT (AC-8) is wire-level proof; code path verified via grep + citations |
| AC-2: Live verify via POST /2fa/2/pin/{pinId}/verify | Structural-Pass | UAT (AC-8) is wire-level proof; 2xx + pin-state branches both exist |
| AC-3: Console fallback preserved | Pass | PHONE_VERIFY_DRIVER_OVERRIDE=console branch + !env.infobip2fa branch both present; deterministic PROBE-{last6} |
| AC-4: Disabled kill-switch at runtime | Pass | `get mode()` reads env per-call; 'disabled' precedence verified |
| AC-5: assertAuthEnv all-or-nothing on Infobip 2FA | Pass | ib2faPresentCount gate + length floor + API_KEY/BASE_URL covariance check |
| AC-6: Controller contract byte-identical | Pass (+ 1 deviation) | Injection renamed verify→verifier (internal-only, TS duplicate-identifier fix); external route/body/response contracts unchanged |
| AC-7: Runtime Twilio references zero in phone module | Pass | `rg twilio apps/api/src/modules/phone` returns zero; 5 past-tense historical mentions remain in whatsapp/* + chat/* per plan spec |
| AC-8: UAT live SMS end-to-end | Deferred | Requires Infobip Portal 2FA Application + Message Template setup — pre-go-live checkpoint, UAT runbook in PLAN |
| AC-9: Rate-limit + cross-session guards unchanged | Pass | phone.service.ts zero diff |
| AC-10: Shape + pin-state + cache-miss classification | Pass | INFOBIP_PIN_TTL_MS=900_000 + classifyPinError + cache-miss returns approved:false |
| AC-11: requestId propagation through service logs | Pass | Controller derives `req.header('x-request-id')`; 18 requestId references across 15 log emission sites |

## Accomplishments

- **Full Twilio shed.** D-01-03-F closed. `env.twilio` removed from AuthEnv type (compile-time proof). `TWILIO_*` removed from `.env.example`. Zero Twilio references in phone module (runtime code); historical comments in whatsapp/* and chat/* rewritten past-tense per plan spec.
- **Wire-layer verified against Infobip Java SDK (authoritative source).** Endpoint paths (`/2fa/2/pin` + `/2fa/2/pin/{pinId}/verify`), request fields (`applicationId`, `messageId`, `to`, `pin`), and response fields (`pinId`, `verified`, `attemptsRemaining`, `pinError`) all confirmed verbatim against `TfaApi.java` + model classes on GitHub. Every wire literal carries a `// Source: <URL> · verified <date>` citation.
- **Silent-failure surfaces closed.** Shape validation on 2xx responses (`typeof json.pinId === 'string'` / `typeof json.verified === 'boolean'`) prevents garbage cache writes. TTL (15min) + FIFO eviction (1024) bound the pinId cache memory + staleness. Pin-state error classification distinguishes user-remediable states (expired/blocked/not-found) from transport failure.
- **Secret + PII hygiene hardened.** `sanitiseError` redacts E.164 phone patterns from error messages before log capture. `sanitiseInfobipText` does the same on Infobip's verbose error text (which regularly echoes the submitted phone number). Grep-verified: `String(err)` / `JSON.stringify(err)` appear only in a "never do this" comment, not in code.
- **Audit trail continuity.** X-Request-Id flows from HTTP middleware → controller → service-layer structured logs, enabling send→verify trace reconstruction for compliance.

## Task Commits

Each task committed atomically:

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Create InfobipVerifyService + delete Twilio | pending | feat | New wire-layer service with TTL cache, shape validation, pin-state classification, sanitiser helpers |
| Task 2: Swap module + controller wiring + requestId | pending | feat | phone.module provider swap + controller injection rename (verify→verifier) + X-Request-Id propagation |
| Task 3: assertAuthEnv + .env.example + comments | pending | feat | Twilio block removed, Infobip 2FA block added, historical comments past-tense |

**Commit strategy:** Single-atomic commit per task at UNIFY close. Plan + audit metadata pending parent commit.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `apps/api/src/modules/phone/infobip-verify.service.ts` | Created (284 lines) | Infobip 2FA wire service — replaces Twilio Verify |
| `apps/api/src/modules/phone/twilio-verify.service.ts` | Deleted | Removed via `git rm` |
| `apps/api/src/modules/phone/phone.module.ts` | Modified | Provider swap (InfobipVerifyService) |
| `apps/api/src/modules/phone/phone.controller.ts` | Modified | Injection rename + requestId propagation in both endpoints |
| `apps/api/src/modules/auth/assert-auth-env.ts` | Modified | Twilio block removed, infobip2fa block added with all-or-nothing + length floor + API_KEY/BASE_URL covariance |
| `.env.example` | Modified | Dropped 4 TWILIO_* entries; added INFOBIP_2FA_APPLICATION_ID + INFOBIP_2FA_MESSAGE_ID + PHONE_VERIFY_DRIVER_OVERRIDE |
| `apps/api/src/modules/whatsapp/whatsapp.adapter.ts` | Modified | Line 23 comment rewrite (past-tense) |
| `apps/api/src/modules/whatsapp/typing-indicator-timers.ts` | Modified | Line 59 comment rewrite (past-tense + D-03-03-F/D-03-04-F link) |
| `apps/api/src/modules/chat/chat.service.ts` | Modified | Lines 25 + 164 comment rewrites (past-tense) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Injection identifier `verify` → `verifier` | TS duplicate-identifier conflict with controller method name `verify` (plan did not catch this) | Internal-only; controller.verify the HTTP method unchanged; `this.verifier` is the service reference |
| Shape-based pin-state classification (not enumerated code set) | Infobip does not publish pinError string enumeration in machine-readable form; SDK source documents only the field name | `classifyPinError` inspects substrings (EXPIRED / BLOCKED / NOT_FOUND / ATTEMPTS_EXCEEDED). Tolerates Infobip adding new error codes without silent misclassification to service-unavailable |
| 4xx `phone-invalid-format` classification by error-text substring (not code) | Infobip does not publish a messageId enum for format errors; falls back on `serviceException.text` containing "invalid" / "format" / "msisdn" | Conservative classification: only maps to `phone-invalid-format` when text strongly suggests it; all other 4xx → `phone-service-unavailable` (visible to ops in logs) |
| INFOBIP_PIN_TTL_MS = 900_000 (15 min) | Longest documented PIN expiry default in Infobip Application config; cache past this is GUARANTEED stale regardless of customer-specific Application config | Bounds cache-miss UX: user resubmits a 14-min-old code will still attempt verify; a 16-min-old attempt returns approved:false + user re-requests |
| No automated tests added | Respects 03-04 APPLY scope-expansion directive (user deleted all probes); project has zero probes by intent | UAT runbook + type-check + build + DI-smoke + grep-audit are the only verification signals |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential — TS duplicate-identifier would not compile |
| Scope additions | 0 | — |
| Deferred | 7 | Documented with explicit triggers in plan `<output>` |

**Total impact:** One internal-only identifier rename. External surface byte-identical.

### Auto-fixed Issues

**1. [TS] Duplicate identifier `verify` — injection name collided with controller method**
- **Found during:** Task 2 (tsc check after module + controller swap)
- **Issue:** Plan specified `this.verify: InfobipVerifyService` but the controller already has an `@Post('verify')` handler named `verify()`. TypeScript rejects: `TS2300: Duplicate identifier 'verify'` at both line 68 (field) and line 129 (method).
- **Fix:** Renamed injection to `this.verifier` (noun form, provider-agnostic). External route name unchanged (HTTP route defined by `@Post('verify')` decorator, not method name). Four in-file references updated via `replace_all`.
- **Files:** `apps/api/src/modules/phone/phone.controller.ts`
- **Verification:** `pnpm build` passes; `npx tsc --noEmit 2>&1 | grep -iE 'duplicate|TS2300'` returns empty.
- **Classification:** Code-layer (plan intent was correct, plan spec had a latent conflict).

### Deferred Items

Seven deferred with explicit triggers (registered in PLAN.md `<output>`):

- **D-03-05-A:** /auth/phone/verify HTTP rate-limiting → public-deploy or first abuse incident
- **D-03-05-B:** Infobip 5xx retry-once → first prod 5xx cluster on /auth/phone/*
- **D-03-05-C:** Cross-process pinId persistence (Redis) → horizontal-scale deploy
- **D-03-05-D:** Persistent phone-verification audit table → SOC 2 Type II prep
- **D-03-05-E:** OpenTelemetry metrics on /auth/phone/* → org-wide OTel rollout
- **D-03-05-F:** Boot-time Infobip reachability smoke → Infobip ships 2FA health endpoint OR third outage traced to API-key config
- **D-03-05-G:** `INFOBIP_HTTP_TIMEOUT_MS` consolidation to `@gm-ai/types` → third Infobip wire timeout

**D-01-03-F (from Phase 1):** **CLOSED BY 03-05.** Twilio Verify fully removed; TwilioVerifyService deleted; assertAuthEnv Twilio SMS block removed; .env.example TWILIO_* entries removed.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| WebFetch returned unusable content from www.infobip.com (JS-rendered docs hub, no spec content) | Fell back to Infobip Java SDK source on GitHub (`infobip-api-java-client/blob/master/src/main/java/com/infobip/api/TfaApi.java` + model classes). All endpoint paths, request field names, response field names confirmed verbatim. Documented via `// Source: <GitHub URL> · verified 2026-04-20` citations. Plan's HALT-condition was specifically about *docs-divergence* — we had wire-shape verification via authoritative source, not guess-and-ship. |
| tsc standalone run shows express type errors in multiple files | Pre-existing monorepo pnpm hoisting quirk — same errors appear in `request-id.middleware.ts`, `security-headers.middleware.ts`, `main.ts`, etc. Actual project build path (`nest build` via swc) passes clean. Not a Plan 03-05 regression. |

## Verification Results

```bash
# Task-level
pnpm build                                      # → Successfully compiled: 70 files with swc
pnpm start (short boot)                         # → PhoneModule dependencies initialized + all 4 /auth/phone/* routes mapped

# Audit-added structural checks
rg twilio apps/api/src/modules/phone            # → (no matches)  AC-7 phone-module zero
rg TWILIO .env.example                          # → (no matches)  AC-7 env hygiene
grep -c '// Source:' infobip-verify.service.ts  # → 9            audit-S9 ≥6 required
grep -c 'requestId' infobip-verify.service.ts   # → 18           audit-S4 propagation
grep -c 'pin-(expired|blocked|not-found|cache-miss)' infobip-verify.service.ts  # → 6  audit-M3 branches
grep -c 'JSON.stringify(err|String(err)' infobip-verify.service.ts   # → 1 (comment only, not code)  audit-M4 containment
```

## Next Phase Readiness

**Ready:**
- Phase 3 (WhatsApp Integration) engineering complete: 03-04 (Infobip WhatsApp) + 03-05 (Infobip 2FA SMS OTP) both closed. Plans 03-01/02/03 remain SUPERSEDED historical record.
- Zero Twilio dependency anywhere in runtime code. Single-vendor footprint for messaging/OTP.
- Phase 4 (Coolify Deployment) unblocked pending TWO UAT checkpoints:
  1. 03-04 UAT: Infobip WhatsApp sandbox walkthrough (still pending)
  2. 03-05 UAT: Infobip 2FA SMS send + verify via real phone (new, pending)

**Concerns:**
- Infobip Portal setup required before either UAT can run: 2FA Application + SMS Message Template must be created. Customer-side operation, documented in PLAN `<output>`.
- In-memory pinId cache = single-process POC constraint. If Phase 4 deploys horizontally (multi-replica), pinId verifications will fall through → approved:false → user re-requests. Acceptable POC tradeoff; D-03-05-C triggered on scale decision.

**Blockers:**
- None for engineering; Infobip Portal walkthrough is a pre-go-live checkpoint, not a blocker on code changes.

---
*Phase: 03-whatsapp-integration, Plan: 05*
*Completed: 2026-04-20*
