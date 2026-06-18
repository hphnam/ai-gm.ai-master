# Enterprise Plan Audit Report

**Plan:** .paul/phases/01-auth-organizations/01-03-PLAN.md
**Audited:** 2026-04-19 21:05
**Verdict:** **Conditionally acceptable pre-fix → enterprise-ready post-fix.** All must-have + strongly-recommended upgrades have been auto-applied to the PLAN.md.

---

## 1. Executive Verdict

**Pre-fix:** Not acceptable as-written. Three release-blocking gaps: (1) any authenticated user could claim a number another user initiated verification for (cross-session code-claim); (2) silent phone-number swap via "verify new number" UX created a phishing-viable WhatsApp-hijack vector; (3) no operator kill-switch for SMS spend abuse. Plus a wire-format bug (JSON body to Twilio's form-encoded endpoint) that would 415 on first live call.

**Post-fix:** Enterprise-ready. The plan now has three independent defence layers mirroring 01-01's trust-boundary pattern:
1. **Compile-time** — `PhoneErrorCode` union forces exhaustive handling; `maskPhone` shared helper forces single-source PII display; `URLSearchParams` type forces form-encoded Twilio bodies.
2. **Runtime** — `pendingVerifications` map blocks cross-session code-claim; `assertNoExistingPhone` blocks silent number swap; `TWILIO_DRIVER_OVERRIDE='disabled'` hard-stops SMS without redeploy; probe P28/P29/P30 regression-guard all three.
3. **Boot-time** — `assertAuthEnv` partial-config fail-fast with `AC*` + `VA*` Twilio SID format validation.

Would I approve this plan for production if accountable? **Yes, post-fix.** The phone-linking surface is the trust boundary that Phase 3 (WhatsApp Integration) rides on top of — an attacker who hijacks number→user mapping inherits all of Phase 3's conversation routing. The audit upgrades close the critical paths.

---

## 2. What Is Solid (Do Not Change)

1. **Twilio Verify over self-rolled OTP** — correctly outsources code-generation/expiry/attempt-count to Twilio, removing entire classes of cryptographic bugs. Preserves swap-out to voice/WhatsApp channels as a config change.
2. **Driver-override pattern mirroring 01-02 MAIL_DRIVER_OVERRIDE** — consistent mental model across two verification surfaces; probe runs cost zero SMS spend by design, not by discipline.
3. **Deliberate bypass of better-auth `phoneNumber` plugin** — rationale documented (conflicts with manual invitation flow from 01-02, plugin's DB OTP storage defeats the Twilio-owns-state decision). Correct architectural stance.
4. **PII-hashing everywhere** — `phoneHash = sha256(phone).slice(0,16)` matches 01-02 S7 forensic-prefix; grep-verifiable.
5. **Prisma `@unique` on `User.phoneNumber`** (from 01-01) — single-source idempotency guarantee for the link operation. No duplicate rows possible.
6. **`assertAuthEnv` extension for all-or-nothing Twilio config** — partial-config fail-fast mirrors 01-02's Resend pattern; no silent partial activation.
7. **Native `fetch` + `AbortSignal.timeout` (no Axios / Twilio SDK)** — smaller attack surface, faster cold-start, no transitive-dep risk; matches 01-02 MailService + 03-02 Claude ingest call pattern.
8. **Three-test probe isolation by email prefix (`probe-phone-*`)** — avoids cleanup-glob collision with `probe-auth-*` (01-01) and `probe-invites-*` (01-02). Mirrors 01-02 S3.

---

## 3. Enterprise Gaps Identified

Pre-fix, the following non-obvious risks were latent in the plan. All have been classified and addressed (see §4).

**Cross-session code-claim attack** — Twilio Verify's check endpoint is session-agnostic: it only verifies `(phoneNumber, code)` matches. Without binding verify to the session that called send, any authenticated user who observes/steals/guesses a 6-digit code could claim that pending verification. 1-in-1M blind-guess odds, but HIGH impact: attacker-controlled phone → Phase 3 WhatsApp conversations routed to attacker's device.

**Silent phone-swap phishing vector** — plan allowed `POST /auth/phone/send` on a user who already has a linked phone. A phishing email "we've updated our security — verify your new number here" with a pre-filled attacker-controlled number would silently redirect all future WhatsApp routing without the victim realizing they'd lost their old mapping.

**Missing operator kill-switch** — only `console` override was in the plan. If Twilio credentials are compromised OR a bot abuses the send endpoint (20k users × 5 sends/15m = 100k SMS/hour at $0.05/SMS = $5000/hour burn), operators have no way to halt spend without redeploying code.

**Twilio API wire-format bug** — plan action said "form-encoded" but did not specify `URLSearchParams`. Drift-risk: executor copies the MailService Resend pattern (`body: JSON.stringify(...)`) and Twilio returns 415 on every live call.

**Twilio error code silently dropped on service-unavailable path** — plan logged a generic `phone.service_unavailable` with no `twilioStatus` / `twilioCode` / `twilioMessage`. Post-incident reconstruction can't distinguish "Twilio down" vs "number in Twilio blocklist" vs "our config is wrong".

**No Retry-After header on 429** — standard HTTP compliance gap; external monitoring tools (UptimeRobot, Datadog synthetic) respect the header to back-off.

**E.164 whitespace intolerance** — regex `^\+[1-9]\d{7,14}$` rejects "+44 7700 900 123" (standard SMS-sharing format). UX gap: users who paste from their phone's contact share page always fail.

**`phone-not-linked` error code defined but unused** — code hygiene drift; suggests either a missing use case or an error code added "just in case". Resolved by adopting idempotent DELETE (M9).

**Per-IP rate limit absent** — per-user 5/15m can be farmed across dozens of accounts from a single compromised IP. 01-02 audit-added S2 established the per-IP precedent for unauth preview; phone send is authenticated but SMS cost makes per-IP defence more critical, not less.

**AC-10 concurrent race assertion too optimistic** — "loser receives 200 with same response" is only correct if both sessions share the same user. Plan didn't distinguish same-user-race from different-user-race; fix: M1 pending-verification + P2002 unique violation now handle both cleanly with distinct outcomes.

**Missing unauthenticated probe coverage** — AC-12 declared but no explicit probe assertion. Without P31, a future controller-retrofit that accidentally drops `@UseGuards(AuthGuard)` would regress silently.

**Body cap not tightened for phone-linking** — /auth/phone/* inherits the global 32KB body cap; phone payloads are <100 bytes; 32KB is 320× the legitimate surface.

**better-auth field-ownership ambiguity** — `User.phoneNumber` / `phoneVerifiedAt` are Prisma fields; better-auth could later enable its phoneNumber plugin and silently race our PhoneService. Comment-based ownership assertion prevents this.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Cross-session code-claim attack possible | Output, AC-13, Task 1 PhoneService, Task 3 P28 | Added `pendingVerifications: Map<userId, {phoneNumber, phoneHash, startedAt, expiresAt}>` with 10-min TTL. `recordPendingVerification` on send-success, `assertPendingVerificationMatches` on verify-entry (BEFORE Twilio check), `consumePendingVerification` on link-success. New AC-13 with `phone.cross_session_blocked` log event. New probe P28 with two-user cross-session test. |
| M2 | Silent phone-swap phishing vector | Output, AC-14, Task 1 PhoneService+Controller, Task 3 P29, API_ERROR_CODES | Added `assertNoExistingPhone(userId)` throwing `PhoneError('phone-change-requires-unlink')` at start of send flow. New error code `phone-change-requires-unlink` (409). New AC-14. New probe P29 confirming change-without-unlink returns 409 + Twilio NOT called. `mapApiError` extended with user-facing string. |
| M3 | No operator kill-switch for SMS spend | Output, AC-15, Task 1 TwilioVerifyService, Task 3 P30 | Added `'disabled'` driver mode. `TWILIO_DRIVER_OVERRIDE=disabled` takes precedence over everything else. Both `startVerification` and `checkVerification` return 503 `{reason:'disabled'}` without any HTTP call. New `phone.driver_disabled` log event. New AC-15. New probe P30. |
| M4 | Twilio API form-encoded wire format not specified | Task 1 TwilioVerifyService | Explicit pattern: `body: new URLSearchParams({To, Channel:'sms'}).toString()` + `Content-Type: application/x-www-form-urlencoded`. Grep guard added to verification: no `JSON.stringify` in twilio-verify.service.ts fetch bodies. |
| M5 | Unauth probe coverage missing (AC-12 unchecked) | Task 3 P31 | New probe P31 asserts 401 on all 4 endpoints without Cookie header. |
| M6 | E.164 whitespace normalization absent | Task 1 types layer, AC-5 extension | `PhoneNumberSchema` uses `z.string().trim().transform(s => s.replace(/\s+/g,'')).pipe(z.string().regex(E164_RE))`. AC-5 extended with spaced-format case. New probe P22b asserts whitespace-padded input succeeds. |
| M7 | Twilio error code dropped on service-unavailable | Task 1 TwilioVerifyService | Extended `phone.service_unavailable` log to include `{twilioStatus, twilioCode, twilioMessage(sliced 200), timedOut}`. Distinguishes network timeout from Twilio-side error. |
| M8 | Missing Retry-After header on 429 | Task 1 PhoneService+Controller, AC-6, Task 3 P26 | Controller sets `Retry-After: <retryAfterSeconds>` response header on 429. AC-6 + P26 extended to assert the header. |
| M9 | Unused `phone-not-linked` error code; DELETE not idempotent | Output, AC-16, API_ERROR_CODES, Task 1 PhoneService, Task 3 P27b | Removed `phone-not-linked` from API_ERROR_CODES. `unlinkNumber` short-circuits when `phoneNumber === null` + emits nothing + returns `{wasLinked:false}`. Controller always 200 `{ok:true}`. New AC-16 + new probe P27b. |
| M10 | Per-IP send rate limit absent | Task 1 PhoneService+Controller, AC-6b | Added `sendsPerIp: Map<ipHash, ...>` — 20 sends / 15-min window. `ipHash = sha256(req.ip).slice(0,16)` (raw IP never logged). New AC-6b. Controller error body includes `details.window: 'ip-send-15m'`. |

**Count: 10 must-have applied.**

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | `maskPhone` should be a shared helper, not inline | Task 1 types layer, Task 2 components, verification | Exported `maskPhone(phone): string` from `@gm-ai/types`. Both controller response serializer and `phone-status-card.tsx` import it. Grep guard verifies single source. |
| S2 | No `phone.send_attempted` log pre-Twilio-call | Task 1 TwilioVerifyService | Three log events per call: `phone.send_attempted` (before fetch), `phone.send_succeeded` / `phone.send_failed` (after). Covers "Twilio never responded at all" case. |
| S3 | `phone.already_linked_blocked` event declared in AC-4 but not in task action | Task 1 PhoneService | Made explicit in `linkVerifiedNumber`. Emitted on both the explicit findFirst match path AND the P2002 unique-violation catch path. |
| S4 | Three-layer defence documentation | Task 1 PhoneService + AC-10 context | Comment block in PhoneService documents the three layers: compile-time PhoneErrorCode union, runtime M1 pending-verification map, DB-level `@unique` index + P2002 catch. |
| S5 | No resend-code affordance in UI | Task 2 PhoneLinkForm | Added "Send code again" link on step 2 of the form; disabled for 30s after a send to prevent burst SMS. |
| S6 | `phone-rate-limited` error string loses the retryAfter detail | Task 2 mapApiError | Extended `mapApiError('phone-rate-limited')` to read `apiError.details?.retryAfterSeconds` and format "Try again in N minute(s)" when present; falls back to static string otherwise. |
| S7 | Probe banner count out of date | Task 3 verification | Banner updated: "10 probe sections (P22–P31) + audit-added cross-session/M1 + unlink/M2 + disabled/M3, zero SMS spend". |
| S10 | Body cap not tightened for phone routes | Task 1 PhoneController | Added `app.use('/auth/phone', json({limit:'2kb'}))` before global 32KB cap in main.ts. |
| S11 | Retry-After header test | Task 3 P26 | Covered by M8 above — same change. |
| S14 | better-auth field-ownership ambiguity | Task 1 PhoneService | JSDoc block atop phone.service.ts asserts exclusive ownership of `User.phoneNumber` + `User.phoneVerifiedAt`; future plugin-enablement plans must audit for drift. |
| S15 | P27 idempotent-delete coverage | Task 3 P27b | Covered by M9 above — same probe addition. |

**Count: 11 strongly-recommended applied.**

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | `libphonenumber-js` for country-specific normalization | Library is 200KB+. M6 whitespace-strip handles 80% of UX cases; defer until multi-country support becomes an explicit feature |
| D2 | Twilio Verify webhook for real-time delivery status | Requires ops tooling + Twilio console config; post-POC plan when observability matures |
| D3 | Per-day Twilio spend cap (budget guard) | Requires cost-tracking infrastructure not in scope for POC. Trigger: public-facing deployment OR first month of live SMS traffic |
| D4 | SMS consent audit log (TCPA / GDPR subject access) | Trigger: first US user OR first GDPR RtBF request. POC audience is UK hospitality — TCPA out of geographic scope |
| D5 | Redis-backed rate limiter for multi-instance | Trigger: Phase 4 Coolify scales beyond 1 container. Mirrors 01-02 D-01-02-G |
| D6 | Code expiry countdown UI | Nice-to-have UX polish; post-POC. Current UX surfaces expiresInSeconds from server; user can infer |
| D7 | Voice-call fallback for accessibility | Already in SCOPE LIMITS. Trigger: first accessibility report |
| D8 | Phone-based passwordless sign-in | Already in SCOPE LIMITS. Trigger: post-Phase-4 if product needs magic-link-via-SMS |
| D9 | Auto-replace phone without explicit unlink | M2 requires unlink. Trigger: user complaints about the two-step flow; swap to auto-replace with confirmation modal |
| D10 | WhatsApp channel for verification codes | Trigger: Phase 3 adds `Channel: 'whatsapp'` as a Twilio config flag — no schema or code change needed |

**Count: 10 deferred items recorded with explicit triggers.**

---

## 5. Audit & Compliance Readiness

### Defensible audit evidence
**Post-fix:** Yes. Every state transition emits a structured log event:
- `phone.send_attempted` / `phone.send_succeeded` / `phone.send_failed` (S2)
- `phone.console_fallback` / `phone.driver_disabled` (M3)
- `phone.service_unavailable` with full Twilio error-code detail (M7)
- `phone.cross_session_blocked` / `phone.change_without_unlink_blocked` (M1/M2 attack attempts)
- `phone.already_linked_blocked` / `phone.rate_limited` / `phone.verified` / `phone.unlinked`

All hashed-PII (phoneHash sha256-prefix-16, ipHash sha256-prefix-16). Full event stream is grep-reconstructable for post-incident forensics.

### Prevents silent failures
**Post-fix:** Yes. The audit identified three silent-failure paths and closed each:
1. Twilio-side errors silently dropped → M7 preserves code + status + message (sanitized)
2. Cross-session claims silently succeed → M1 pending-verification map blocks + logs
3. Number swaps silently succeed → M2 assertNoExistingPhone blocks + logs

### Post-incident reconstruction
**Post-fix:** Yes. Given an incident ticket "user X lost WhatsApp access on 2026-05-14", the log stream supports:
- grep `phone.verified.*userId:X` → when the original link happened
- grep `phone.unlinked.*userId:X` → when unlink happened (intentional or post-compromise)
- grep `phone.cross_session_blocked.*phoneHash:<X's hash>` → did an attacker try to claim it?
- grep `phone.change_without_unlink_blocked.*userId:X` → did a phishing attempt hit?

Without M1/M2/M7, the first two queries exist but the latter two don't — a significant forensic gap.

### Clear ownership and accountability
**Post-fix:** Yes.
- Schema fields: owned by PhoneService exclusively (S14 JSDoc)
- Rate limits: owned by PhoneService in-memory maps (single place to swap to Redis per D5)
- Twilio API shape: owned by TwilioVerifyService with explicit URLSearchParams (M4)
- Error codes: owned by `@gm-ai/types/api.ts` closed tuple (same contract as 01-01/01-02)

### Areas that would fail a real audit
**Pre-fix:** cross-session claim, silent swap, no kill-switch, Twilio error opacity, unauth-endpoint coverage gap.
**Post-fix:** None of the fixable items. Deferred items (D3 consent log, D4 TCPA) would fail if the system were audited for US or EU-regulated deployment TODAY, but all have explicit triggers that would fire before such a deployment.

---

## 6. Final Release Bar

### What must be true before this plan ships
1. Plan 01-03 APPLY executes with all 10 M-fixes + 11 S-fixes in place — verifiable via the grep guards added to `<verification>`.
2. probe-auth passes ≥40 assertions (from ≥30 pre-audit) including M1/M2/M3/M9 probes.
3. Manual UAT specifically exercises the whitespace-padded input path (M6), the "change without unlink" rejection (M2), and the unlink-then-relink flow (M9).
4. Before live deployment: `TWILIO_DRIVER_OVERRIDE` is unset in prod env (not `console`, not `disabled`) to use real Twilio Verify.
5. `.env.example` comments the `'disabled'` kill-switch option so on-call operators know it exists.

### Remaining risks if shipped as-is (post-audit plan)
- **D3 (no spend cap)**: a persistent attacker who bypasses per-user/per-number/per-IP rate limits across a 24-hour window could burn significant SMS budget. Magnitude: ~28,800 sends/day at 20/15m × 96 windows = $1440/day max per IP. Twilio Verify's own fraud guard provides an additional ceiling. Acceptable for POC; wire D3 before public deploy.
- **D4 (no consent audit log)**: if a UK user later invokes GDPR subject access, phone linking timestamp (`phoneVerifiedAt`) + log stream cover the minimum. A dedicated consent table becomes necessary at first regulated customer.
- **D5 (in-memory rate limits are single-node)**: at Phase 4 Coolify single-container deployment this is fine. Second container = rate limits become per-container, doubling effective limits. Must add Redis-backed throttler before horizontal scaling.

### Sign-off statement
Post-fix, I would sign my name to this system entering a POC production deployment with < 1000 users and a named operator on-call. I would NOT sign my name without the audit fixes applied (pre-fix M1-M4 alone are release-blocking).

---

**Summary:** Applied 10 must-have (M1–M10) + 11 strongly-recommended (S1–S15 subset) upgrades. Deferred 10 items with explicit triggers. AC count grew from 12 → 16. Probe target raised from ≥24 → ≥40 assertions. API_ERROR_CODES net +7 (added `phone-change-requires-unlink`, removed unused `phone-not-linked`).

**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
