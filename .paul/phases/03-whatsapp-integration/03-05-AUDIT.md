# Enterprise Plan Audit Report

**Plan:** .paul/phases/03-whatsapp-integration/03-05-PLAN.md
**Audited:** 2026-04-20 21:45
**Verdict:** **conditionally acceptable pre-fix → enterprise-ready post-fix**

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan correctly mirrors 03-04's shape (single-service provider swap with preserved public contract + console/live/disabled driver-mode pattern) and its scope is bounded. However, the wire-level and state-management details ship several silent-failure surfaces that are unacceptable for a primary auth factor (phone-number verification):

1. No runtime validation that Infobip's response actually contains the fields the service reads — a malformed 2xx (HTML 502 intercept, schema drift) writes `undefined` pinId to cache, later verify fails cryptically.
2. The pinId cache has no time-based expiry — stale pinIds will be submitted post-Infobip-expiry and produce "service unavailable" instead of the user-remediable "code expired" state.
3. Infobip `pinExpired` / `pinNotFound` responses on verify are indistinguishable from transport failure in the current action spec — misclassifies UX state as outage.
4. No explicit defense against leaking the `Authorization: App {API_KEY}` header into error logs or Infobip error-text containing the phone number verbatim.
5. HALT-condition covers the send endpoint shape but not the verify endpoint shape — a docs-drift on `/verify` would ship guessed semantics.

Each of these is reachable under normal operation (not rare edge-cases) and would be flagged by an auditor looking at SMS-OTP integrity.

Would I approve as-is? **No.** Post-fix: **yes** — the upgrades below are wire-level and state-management, not architectural rework.

---

## 2. What Is Solid (Do Not Change)

- **Public contract preserved byte-identical.** Request/response shapes (`SendPhoneCodeBody`, `VerifyPhoneCodeBody`, etc.), controller routes, error-code union, Retry-After header behaviour all frozen. This means zero client-side coordination for the rollout.
- **Provider-agnostic identifier rename.** `this.twilio` → `this.verify` on the controller is correct: the identifier no longer encodes the provider, so a future 03-06 hypothetically swapping Infobip to Meta-direct or Vonage stays a wire-layer-only change.
- **Driver-override env namespacing.** `PHONE_VERIFY_DRIVER_OVERRIDE` (concern-scoped) decoupled from `INFOBIP_DRIVER_OVERRIDE` (WhatsApp-scoped) is correct — avoids the footgun where ops flipping WhatsApp to console-mode silently disables SMS OTP too.
- **`phone.service.ts` untouched.** Rate-limit + pending-verification + link/unlink logic is provider-agnostic and already audit-defensible from 01-03. Correctly recognised as out-of-scope.
- **All-or-nothing validation on the new env block + reuse of existing INFOBIP_API_KEY/BASE_URL.** No duplicate env surface; mirrors 03-04 discipline.
- **Console-fallback PROBE-{last6digits} pattern preserved.** Deterministic dev-mode code works without the Twilio fixture — continuity for any probe/UAT harness that might return.
- **HALT pattern on wire-shape divergence (M4-echo from 03-04 audit).** Executor is forbidden from guess-and-shipping when Infobip docs contradict the plan's assumption. Correct stance for a security-touching integration.

## 3. Enterprise Gaps Identified

### Wire-level correctness

- **G1 (M1):** No shape validation on Infobip response bodies. Plan reads `json.pinId` + `json.verified` without guards. Schema drift / upstream 502 HTML / partial JSON all silently write garbage.
- **G2 (M7):** HALT condition covers send endpoint shape. Verify endpoint is equally scheme-dependent (`{pin}` field name, `{verified}` response field) and gets no HALT coverage.

### State correctness

- **G3 (M2):** In-memory pinId cache has no TTL. Infobip PINs expire (typically 5-15 min, application-configurable). A stale pinId submitted post-expiry hits Infobip with a dead pinId → arbitrary 4xx → currently classified as `phone-service-unavailable`. User cannot distinguish "my code expired, request again" from "the service is down, wait".
- **G4 (M3):** Infobip's `pinExpired` / `pinNotFound` / `pinBlocked` error codes on verify are user-remediable states, not transport failures. Plan's current spec maps all verify-side 4xx to `phone-service-unavailable`. Must surface these as `approved: false` so the controller maps them to `phone-verification-failed` (user retries via /auth/phone/send).
- **G5 (S6):** On live-mode verify cache-miss (process restart mid-flow), plan returns `phone-service-unavailable`. Better UX is `approved: false` with reason `pin-cache-miss` so the user's next step is "request a new code", not "contact support".

### Secret / PII hygiene

- **G6 (M4):** Plan says "don't log raw API key" but any generic `catch (err) { log(String(err)) }` can serialize request headers via the fetch error object. No explicit sanitisation boundary specified.
- **G7 (M5):** Plan captures `json.requestError.serviceException.text` verbatim. Infobip error text regularly contains the submitted phone number (`"Number +447... is invalid"`). This is PII leakage into persistent logs; SOC 2 CC6.1 / GDPR violation under nominal operation.

### Audit trail

- **G8 (S4):** Service-layer logs (`phone.send_attempted` etc.) don't inherit the HTTP request's X-Request-Id. Send-to-verify trace reconstruction requires manual phoneHash correlation — fragile and slow under incident response.
- **G9 (S1):** Infobip verify response contains `attemptsRemaining` — not logged internally. Brute-force patterns invisible to ops.

### Env / config hygiene

- **G10 (S5):** No format validation on the two new ID env vars. `assertAuthEnv` accepts any non-empty string. Typos ship to production.
- **G11 (M6, demoted → strongly-recommended):** `TWILIO_DRIVER_OVERRIDE` may be referenced in runbooks / SUMMARY files / other docs. Plan sweeps code but not docs.

### APPLY hygiene

- **G12 (S3):** Task 1 verify step proves type-check and build pass. Does not prove DI wires (Nest can resolve InfobipVerifyService at runtime). A faulty provider registration would pass tsc but crash at runtime with "Nest can't resolve dependencies".
- **G13 (S9):** Plan mentions APPLY-time citation discipline in `<context>` but no grep-verifiable check.

### Deferred (below) but noted:

- **G14:** No cross-process pinId persistence. Single-process POC is explicit; flagged as SCOPE LIMIT in plan.
- **G15:** No retry on Infobip 5xx — one attempt + timeout. Mirrors 03-04 D2.
- **G16:** No boot-time Infobip reachability smoke — uncovered bad API keys only surface on first user hit.
- **G17:** `INFOBIP_TIMEOUT_MS` is a service-local const; 03-04 may have its own copy. Consolidation to `@gm-ai/types` defers to a later YAGNI trigger.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Shape-validate Infobip response before use (pinId on send, verified on verify) | Task 1 action + AC-10 | Added `typeof` guard with fail-fast log `phone.send_unexpected_response` / `phone.check_unexpected_response`; AC-10 asserts the negative-path contract |
| M2 | Time-based TTL on pinId cache | Task 1 action + new INFOBIP_PIN_TTL_MS const | Cache stores `{ pinId, issuedAt }`; verify-side treats entries older than `INFOBIP_PIN_TTL_MS` (default 900_000ms = 15 min, Infobip-doc-cited at APPLY) as cache miss |
| M3 | Map Infobip pin-expired/not-found/blocked verify errors to `approved: false` not `phone-service-unavailable` | Task 1 action + AC-10 | At APPLY-time WebFetch, enumerate Infobip's pin-state error codes; map to `{ ok: true, approved: false, mode: 'live', details: { reason: 'pin-expired'\|'pin-not-found'\|'pin-blocked' } }` so controller surfaces `phone-verification-failed` |
| M4 | Sanitise `err` before log to prevent Authorization-header leak | Task 1 action + verify | Use `err instanceof Error ? err.message : String(err)` — never `JSON.stringify(err)` or `String(err)` on raw fetch errors; grep-verify no `App \${` outside the single outbound fetch line |
| M5 | Redact E.164-ish phone patterns in Infobip error text before log capture | Task 1 action | `text.replace(/\+?\d{10,15}/g, '[PHONE]')` applied to every Infobip error-text capture before it enters any log payload |
| M7 | HALT-condition extended to verify endpoint shape, not just send | Task 1 action | Executor must WebFetch + confirm BOTH `POST /2fa/2/pin` (send) AND `POST /2fa/2/pin/{pinId}/verify` (check) request/response field names before writing code |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | Log `attemptsRemaining` on verify | Task 1 action | `phone.check_result` log payload adds `attemptsRemaining: json.attemptsRemaining ?? null` — ops can spot brute-force patterns without UI surfacing |
| S3 | Task 1 verify step adds nest boot smoke | Task 1 verify | Added: `pnpm --filter @gm-ai/api start` — confirm no `Nest can't resolve dependencies` log; DI check, not just compile check |
| S4 | Propagate HTTP X-Request-Id into service-layer logs | Task 1 action + Task 2 action + AC-11 | `startVerification` / `checkVerification` gain optional `requestId?: string` param; controller passes `req.header('x-request-id')`; all structured logs include `requestId` field for send→verify correlation |
| S5 | APPLY-time ID-format regex in assertAuthEnv | Task 3 action | WebFetch Infobip docs for documented Application-ID / Message-ID shape (UUID / hex / alphanumeric). If documented, add regex. If not, document the absence with source-cited comment |
| S6 | Live-mode verify cache miss → `approved: false` not `service-unavailable` | Task 1 action + AC-10 | Reworked live-mode verify action so cache-miss produces `{ ok: true, approved: false, mode: 'live', details: { reason: 'pin-cache-miss' } }` — controller naturally maps to `phone-verification-failed`, user re-requests code |
| S8 | Explicit D-01-03-F closure in SUMMARY | `<output>` | Added to output spec: SUMMARY must explicitly close D-01-03-F (Twilio Verify deferred item from Phase 1 Plan 01-03) with commit link |
| S9 | Citation discipline is an APPLY-verification step, not just context note | `<verification>` | Added grep-verifiable check: every fetch URL / header literal / body field in `infobip-verify.service.ts` has a `// Source: <URL> · verified <date>` citation; APPLY fails if any wire line lacks one |
| S11 | Doc-sweep for `TWILIO_DRIVER_OVERRIDE` references | Task 3 action | Added `rg -n 'TWILIO_DRIVER_OVERRIDE' .paul apps` — any match that is not a historical SUMMARY gets a one-line superseded-by footnote; historical SUMMARY files are not rewritten (they're historical record) |
| S12 | Deterministic pinId cache-eviction ordering documented + capped | Task 1 action | Cache is `Map<string, { pinId: string; issuedAt: number }>` with MAX_ENTRIES=1024; on insert past cap, drop `map.keys().next().value` (insertion-order = FIFO-ish on Map). Documented and bounded — memory ceiling known |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|------------------------|
| D1 | HTTP rate limiting on /auth/phone/verify endpoint | 01-03 ships /send-side rate limit via `phone.service.assertSendRateLimit`; verify-side brute-force is capped by Infobip's own `attemptsRemaining`. Trigger: first abuse incident OR public-deploy. Mirror of 03-04 D1. |
| D2 | Infobip 5xx retry-once pattern | Single attempt + timeout is sufficient for POC. Trigger: first prod 5xx cluster, mirror 03-04 D2 approach. |
| D3 | Cross-process pinId persistence (Redis-backed cache) | Single-process API in POC. Phase 4 Coolify deploy is single-instance per 03-04 SUMMARY. Trigger: first horizontal-scale config change. |
| D4 | Replay prevention on /verify | `phone.service.assertPendingVerificationMatches` already gates user-scope replay; Infobip gates PIN-scope replay via `attemptsRemaining`. Two layers sufficient for POC. Trigger: UAT surfaces gap. |
| D5 | OpenTelemetry metrics on /auth/phone/* | Cross-service observability, not single-plan scope. Trigger: org-wide OTel rollout. |
| D6 | Boot-time Infobip reachability smoke | Infobip does not publicly document a cheap health endpoint for 2FA API; adding one means burning an actual PIN send. Deferred with trigger: "Infobip adds health endpoint" OR "third outage traced to wrong API-key config". |
| D7 | `INFOBIP_TIMEOUT_MS` consolidation to `@gm-ai/types` | YAGNI at two call sites (03-04 adapter + this service). Trigger: third Infobip wire timeout (would make it load-bearing). |

---

## 5. Audit & Compliance Readiness

**Defensible audit evidence (post-fix):**
- `phone.send_attempted` + `phone.send_succeeded` / `phone.send_failed` / `phone.send_unexpected_response` spans the send lifecycle.
- `phone.check_attempted` + `phone.check_result` / `phone.check_unexpected_response` spans the verify lifecycle.
- X-Request-Id on every log entry enables send→verify correlation across requests (S4).
- `phoneHash` (not raw phone) on every entry enables forensic correlation without PII.
- Infobip error text is phone-redacted before capture (M5) — passes a PII-scan audit.
- Authorization header never serialized (M4) — passes a secret-scan audit.
- `pinId` is not logged (never was; reinforced by grep-verify).

**Silent-failure prevention (post-fix):**
- Runtime shape validation (M1) catches Infobip schema drift before garbage writes the cache.
- TTL expiry (M2) catches stale pinIds before they produce misleading error classes.
- Pin-state error mapping (M3) distinguishes user-remediable from transport failure.
- Nest DI boot smoke (S3) catches provider-registration errors at deploy-time not first-user-hit.

**Post-incident reconstruction (post-fix):**
- X-Request-Id correlation (S4) lets an auditor walk `UI-click → HTTP-req → phone.send_attempted → phone.send_succeeded → SMS-receive → UI-submit → HTTP-req → phone.check_attempted → phone.check_result` as a single trace.
- `attemptsRemaining` logging (S1) reconstructs brute-force attempts forensically.

**Clear ownership / accountability:**
- InfobipVerifyService owns the wire layer and cache.
- phone.service.ts owns the domain layer (rate limits, pending state).
- phone.controller.ts owns HTTP mapping only.
- No cross-boundary state. Pass.

**Remaining audit-fail surfaces:**
- No persistent audit table for phone-verification events (ephemeral logs only). Mirror of deferred D2 from Plan 01-01 audit. Trigger: SOC 2 Type II prep. Unchanged from 01-03.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- [ ] All 6 must-have upgrades applied (M1/M2/M3/M4/M5/M7) — now in the plan.
- [ ] All 9 strongly-recommended upgrades applied (S1/S3/S4/S5/S6/S8/S9/S11/S12) — now in the plan.
- [ ] APPLY-time WebFetch against Infobip docs completes successfully; any scheme divergence triggers HALT (M7).
- [ ] AC-10 (pin-state error mapping) + AC-11 (requestId in logs) pass structurally.
- [ ] UAT runbook (AC-8) executed once against a real phone.
- [ ] `rg -i 'twilio'` across `apps/api/src` returns zero matches.
- [ ] Nest DI boot smoke passes with live config and console-fallback config.

**Risks remaining if shipped as-is (deferred items — explicitly accepted):**
- Verify-side abuse possible at very high QPS (D1); Infobip's own throttle partially compensates.
- Single Infobip 5xx = user sees "service unavailable" (D2); no silent degradation or data loss.
- Horizontal scale-out would silently break PIN verification (D3); SCOPE LIMIT flags this.
- No persistent audit table (unchanged from 01-03) — ephemeral logs only.

**Sign-off:**
Post-fix, the plan is enterprise-grade for the current deployment target (single-process, single-region, POC with Ryan as sole operator). Release bar met.

Pre-fix, it is not — the silent-failure surfaces on wire correctness (G1, G2), cache TTL (G3), and user-remediable error misclassification (G4) would produce support incidents within the first week of real usage.

---

**Summary:** Applied **6 must-have** + **9 strongly-recommended** upgrades. Deferred **7** items with explicit triggers.
**Plan status:** Updated and ready for APPLY.
AC count raised 9 → 11 (AC-10 pin-state error mapping + shape validation, AC-11 requestId correlation).
Task count unchanged (3). `autonomous: true` preserved (no new checkpoints introduced).

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
