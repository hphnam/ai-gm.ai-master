# Enterprise Plan Audit Report

**Plan:** `.paul/phases/03-whatsapp-integration/03-04-PLAN.md`
**Audited:** 2026-04-20 20:45 (by senior principal engineer + compliance reviewer role)
**Verdict:** Conditionally acceptable pre-fix → enterprise-ready post-fix

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan captures the right scope and preserves the Phase 3 hardening posture across a clean wire-level swap. User has explicitly descoped probe rewrite — I respect that directive. However the plan as-authored ships with six concrete release-blocking gaps and nine strongly-recommended tightenings. Post-fix: enterprise-ready. Pre-fix I would NOT sign off.

**Would I approve this plan for production if I were accountable? Not as authored.** The raw-body middleware contract, the APPLY-time signature-scheme discovery hatch, the PII discretion on contact names, and the missing webhook-secret strength check each create a plausible foot-gun. Each fix is small and they are all applied below.

---

## 2. What Is Solid (Do Not Change)

- **Explicit no-probe directive honored.** User instruction "we simply don't use it" is a business call, not a technical one. The plan accepts the tradeoff (delete probe-whatsapp.ts + `probe:whatsapp` script) and documents it clearly in SCOPE LIMITS. The 17 AC + 27-assertion regression floor is gone by design.
- **Phase boundary preservation.** Twilio Verify SMS OTP (Phase 1 Plan 01-03) is explicitly ring-fenced — DO NOT CHANGE lists, zero-diff gate in verification, assertAuthEnv `twilio` block untouched. This is the right call.
- **Provider-neutral naming where justified.** `whatsapp-media-download.ts` and `WHATSAPP_MEDIA_HOST_ALLOWLIST` correctly generalize; adapter + signature guard retain provider-specific naming because those ARE provider-specific. Naming discipline is correct.
- **03-03 audit hardening preserved.** All four media-download hardening layers (M1 SSRF host allowlist, M2 MIME allowlist, M3 magic-byte validator, M4 streaming byte counter) are explicitly kept through the wire swap as wire-agnostic protections. The audit trail is intact.
- **phoneNumber remap verified.** `'+' + result.from` adjustment is correct — verified against `packages/types/src/auth.ts` E164_RE `/^\+[1-9]\d{7,14}$/` + User.phoneNumber String? schema + `VerifyPhoneCodeBodySchema` usage.
- **Zero new dependencies.** Migration runs on stdlib (crypto, fetch, buffer) + existing Express/Nest/Zod — no supply-chain expansion.
- **`WHATSAPP_WEBHOOK_PUBLIC_URL` removal is correct.** Infobip HMAC doesn't include URL in the signing string, so URL-pinning adds env surface without security gain. Reducing env surface is the right move.
- **Per-result try/catch in controller.** `for (const result of parsed.data.results) { try { ... } catch { ... } }` prevents one malformed entry from starving subsequent ones.

---

## 3. Enterprise Gaps Identified

### Release-blocking

**G1. `req.rawBody` is TypeScript-invisible.** The plan's middleware assigns `req.rawBody = buf` and the guard reads `req?.rawBody`. Express's `Request` type doesn't declare `rawBody`. Result: `req.rawBody` is implicitly `any`. A future refactor that touches middleware order, OR a middleware that mutates `req.body`, could silently break HMAC verification and TypeScript will not catch it. Module augmentation declaration required.

**G2. `INFOBIP_WEBHOOK_SECRET` has no minimum-strength validation.** assertAuthEnv only checks presence. A 4-char secret would pass. For HMAC-SHA256 the industry floor is ≥32 chars; ≥64 is prudent. The same env validator already enforces 64-hex on BETTER_AUTH_SECRET — inconsistent rigor across secrets of equivalent criticality.

**G3. Signature buffer-parse is not fail-safe before `timingSafeEqual`.** The guard computes `Buffer.from(received, 'hex' | 'base64')`. For malformed hex, Node produces a buffer up to the first invalid character — possibly length 0, possibly shorter than expected. The current length-equality check catches length 0 ≠ 32, but a malformed odd-length hex string that parses to exactly the right byte count is indistinguishable from a benignly-wrong signature. Result: control flow relies on `timingSafeEqual` to fail, not on an explicit parse validation. Paranoid-correct demands an explicit `/^[0-9a-f]+$/` or `/^[A-Za-z0-9+/=]+$/` format check before the Buffer.from call.

**G4. APPLY-time signature scheme discovery has no halt-condition.** The plan instructs the executor to WebFetch Infobip docs and "adjust the `SIGNATURE_HEADER` / `ENCODING` constants" based on findings. If the executor discovers Infobip uses a materially different scheme (custom challenge-response, JWT-signed payloads, non-HMAC), the plan has no "stop, re-plan, check with user" escape hatch. The executor would either (a) muddle through with a guess, (b) stall silently, or (c) ship broken code. Explicit halt-condition required.

**G5. Contact name PII handling is discretionary.** Plan says "adjust the `waIdHash` log field to `contactNameHash` OR drop the field if cleanest — the log is internal only". Leaving the choice to the executor risks the "hash it for privacy" decision that still exposes PII correlation risk (contact names are low-entropy; hashed names rainbow-attack more easily than phone numbers). Hard rule: contact name MUST NOT be logged in any form. Drop the field entirely.

**G6. Raw-body middleware ORDER is an implicit contract.** Guard rejects with `'no-raw-body'` if `req.rawBody` is undefined. This produces a permanent 403 on every inbound if (a) someone moves the global `jsonDefault` middleware ahead of the webhook-path branch, or (b) someone adds a new global body parser during a future Phase 4 deploy task. There is no boot-time assertion and no build-time grep check that would catch this. Silent-mode failure. Need explicit verification-step grep AND boot-time assertion.

### Strongly recommended

**G7. INFOBIP_DRIVER_OVERRIDE=console default in .env.example is prod-unsafe.** Exactly the D-01-03-F carry-forward issue the project already registered for Twilio. Infobip path inherits the same shape (probe-safe default, prod-unsafe if shipped). Should register D-03-04-G alongside D-01-03-F as pre-Phase-4 go-live blocker.

**G8. Express `raw()` parser `type: 'application/json'` may miss non-matching Content-Type.** Some webhook providers send `application/json; charset=utf-8` or `text/plain` — the former works (parameter tolerance), but the latter silently bypasses. Infobip's Content-Type isn't documented in the plan. Safer: `type: '*/*'` or enumerated array. Confirm at APPLY.

**G9. `whatsapp.payload_invalid` log lacks audit-trail signal.** If JSON parse fails after signature validation succeeded, the log doesn't record `signatureValidated: true`. For compliance reconstruction — "did someone with our secret send malformed JSON, or was this an external spoofing attempt" — that distinction matters. Add the flag.

**G10. Infobip media URL auth scheme is an assumption.** Plan assumes `Authorization: App ${apiKey}` on the media URL matching the outbound pattern. Reality varies across BSPs: Infobip media URLs might be pre-signed (no auth required), require Basic auth, or use a separate scoped token. If the guess is wrong, every image inbound fails. Plan should document a trial-matrix at APPLY: try `App` header → if 401, try bare (no auth) → if 401, halt + ask.

**G11. Batch-processing has no deadline.** `for (const result of parsed.data.results)` runs sequentially. With ChatService's 12s timeout per result, a 5-result batch could consume 60s of wall-clock — well past Infobip's typical webhook retry window. No existing mechanism to bound total batch time. Add a `BATCH_DEADLINE_MS = 12_000` soft deadline with log-and-continue behavior.

**G12. `INFOBIP_BASE_URL` regex may be over-strict.** `/^https:\/\/[a-z0-9.-]+\.infobip\.com(\/.*)?$/` requires a subdomain. Infobip's documented public API base is `https://api.infobip.com` for some account tiers — the apex form would fail validation. Relax to accept both.

**G13. `ALLOW_WEBHOOK_DEV_BYPASS=true` + dev-bypass signature branch is orphan code post-probe-deletion.** The probe was the only consumer. Plan preserves the branch "just in case for manual curl testing" implicitly, but that's undocumented. Either commit to keeping it (document curl-testing as the justification in a boundaries note) or register D-03-04-H for removal. Currently it's dead attack surface.

**G14. `__resetForTest` exports in rate-limit / seen-sid / typing-timer modules are orphan code post-probe-deletion.** Plan explicitly says "leave alone — harmless". Acceptable, but should register as D-03-04-I with trigger "add if focused unit tests written; remove if still unused by v0.3".

**G15. SUMMARY output UAT runbook lacks concrete steps.** Plan's `<output>` says "Infobip Portal UAT instructions: webhook URL to set + trial-sender join-code Ryan's phone must send to the sandbox" — but the runbook needs enumerated steps (1. Set webhook URL to X. 2. Send `join <keyword>` to Y from Ryan's phone. 3. Send test message. 4. Observe log pattern Z). Otherwise first-run friction.

### Can safely defer

**G16. No HTTP rate limiting on webhook path.** Same deferral as 03-01. Re-affirm trigger: public-facing deploy.

**G17. No Infobip outbound retry semantics mapping.** Twilio had `sendWithRetry()` for 429/5xx; Infobip's retry envelope is different. Defer to first 5xx cluster observation.

**G18. No idempotency keys on outbound.** Defer to first duplicate-message incident.

**G19. No unit tests for guard + adapter.** Project pattern deferral; the plan already documented this stance in 03-01 and carries forward.

**G20. No parallel batch processing.** Defer until Infobip batching behavior is empirically known.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | G1 — req.rawBody type invisible | Frontmatter + Task 3 + new AC-9 | Added `apps/api/src/types/express-augment.d.ts` to files_modified; task 3 creates module augmentation; AC-9 enforces type-safety grep |
| M2 | G2 — webhook secret strength unchecked | Task 1 action + AC-6 | assertAuthEnv adds `if (ibSecret && ibSecret.length < 32) errs.push(...)`; AC-6 tightened to include min-length rule |
| M3 | G3 — signature buffer parse unsafe | Task 2 action + AC-1 | Guard validates hex/base64 format before Buffer.from; rejects with `reason: 'signature-malformed'` on unparseable shape |
| M4 | G4 — APPLY-time scheme discovery has no halt | Task 1 + Task 2 action heads | Added explicit halt-and-ask policy: if Infobip scheme differs materially from HMAC-SHA256-over-raw-body, STOP APPLY and raise checkpoint:decision |
| M5 | G5 — contact name PII discretionary | Task 3 action + new AC-10 | Hard rule: contact name NEVER logged (hashed or raw). `payload.WaId` field is DROPPED from logs, not remapped. AC-10 grep-enforces |
| M6 | G6 — middleware order implicit contract | Task 3 action + new AC-11 + verification | Task 3 adds explicit verification grep for middleware order; AC-11 requires a boot-time runtime check that fails fast if req.rawBody contract drifts |
| M7 | G7 — INFOBIP_DRIVER_OVERRIDE=console prod-unsafe | SCOPE LIMITS | Registered D-03-04-G alongside D-01-03-F as pre-Phase-4 go-live blocker |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | G8 — raw() parser Content-Type too narrow | Task 3 action | Parser `type: ['application/json', 'application/*+json']` and executor-confirms actual Infobip Content-Type header at APPLY |
| S2 | G9 — payload_invalid lacks audit signal | Task 3 action + AC-1 | Log includes `signatureValidated: true` when signature passed but Zod parse failed |
| S3 | G10 — media URL auth is an assumption | Task 2 action + new AC-12 | Trial matrix documented: `App ${apiKey}` header first; 401 → retry without auth; 401 again → halt + log `whatsapp.media_url_auth_unknown` + friendly fallback + checkpoint raise |
| S4 | G11 — batch no deadline | Task 3 action + new AC-13 | BATCH_DEADLINE_MS=12_000 soft deadline; remaining results log-skipped with `whatsapp.batch_deadline_reached` |
| S5 | G12 — BASE_URL regex over-strict | Task 1 action + AC-6 | Regex relaxed to accept both subdomained + apex forms (`https://api.infobip.com` and `https://<sub>.infobip.com`) |
| S6 | G13 — dev-bypass orphan | SCOPE LIMITS | Explicit justification noted: retained for manual curl testing during UAT; registered D-03-04-H for removal post-UAT |
| S7 | G14 — __resetForTest orphan | SCOPE LIMITS | Registered D-03-04-I with trigger for v0.3 review |
| S8 | G15 — UAT runbook lacks enumerated steps | `<output>` section | SUMMARY output specification expanded with concrete step enumeration |
| S9 | Documentation — INFOBIP doc citations must be captured | Task 1 + Task 2 action | Every WebFetch finding must land as `// Source: <URL> · verified YYYY-MM-DD` citation in source files, searchable via grep |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | G16 — webhook path rate limiting | Same deferral as 03-01; trigger: public-facing deploy. Infobip signs inbound so abuse surface is bounded to leaked-secret scenarios. |
| D2 | G17 — Infobip outbound retry mapping | POC volume; revisit when first 5xx cluster observed post-Coolify deploy. |
| D3 | G18 — outbound idempotency keys | Single-process POC; revisit on first duplicate-message incident. |
| D4 | G19 — unit tests for guard + adapter | Project-pattern deferral; test strategy deferred to a dedicated testing plan. |
| D5 | G20 — parallel batch processing | Infobip batching behavior not empirically known yet; sequential+deadline is safer default. |

**Deferred items registered in plan SCOPE LIMITS with explicit triggers:**
- D-03-04-F — Infobip WhatsApp typing-indicator (no public endpoint; revisit on Meta Cloud API direct migration)
- D-03-04-G — INFOBIP_DRIVER_OVERRIDE=console default in .env.example (pre-Phase-4 go-live blocker, same class as D-01-03-F)
- D-03-04-H — dev-bypass signature branch + ALLOW_WEBHOOK_DEV_BYPASS env (post-UAT cleanup; retain for curl testing during UAT phase)
- D-03-04-I — `__resetForTest` export cleanup across rate-limit / seen-sid / typing-timer modules (v0.3 review trigger)

---

## 5. Audit & Compliance Readiness

**Defensible evidence, post-fix:**
- Signature verification path produces structured `whatsapp.signature_rejected { reason, signaturePresent, bodyLen }` logs for every rejection outcome (forensic reconstruction possible).
- Payload-invalid path now distinguishes "signed but malformed" vs "unsigned garbage" via `signatureValidated` flag (S2).
- Contact name is NEVER in logs (M5); phone is only sha256Prefix'd (16-char); image bytes never in logs (carry-over 03-03 pattern).
- Signature-scheme discovery is halt-gated (M4) — no silent guess-and-ship.
- Raw-body contract is type-checked (M1) + boot-asserted (M6) — no silent drift.

**Silent-failure prevention:**
- M1 closes the "req.rawBody is `any` and refactor breaks HMAC" silent mode.
- M3 closes the "malformed signature parses to correct-length garbage buffer" silent mode.
- M6 closes the "middleware reorder breaks all inbounds" silent mode.
- M4 closes the "executor guesses scheme wrong and ships broken" silent mode.

**Post-incident reconstruction:**
- Every inbound path has a paired observable outcome (typing_sent → inbound → outbound OR rejection log).
- D-03-04-* items have explicit triggers so deferral-decay is visible at the next milestone boundary.
- phoneNumber storage format verified against schema + E164_RE, documented in AUDIT section 2.

**Ownership + accountability:**
- Every audit-added item traceable via `audit-added M1..M7 / S1..S9` markers in source comments.
- SUMMARY output (S8) now enumerates manual UAT steps — not just "run through it" hand-wave.
- Deferred items cite the specific trigger event that re-opens the decision.

**Gaps that WOULD fail a real audit, post-fix: none that the plan materially owns.** Residual risks (rate limiting, retry semantics, idempotency) are all deferred-with-trigger per 03-01 precedent; those deferrals themselves are compliance-defensible because they're written down with owners.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
1. All 7 must-have fixes (M1–M7) applied to PLAN.md — DONE (see section 4).
2. All 9 strongly-recommended fixes (S1–S9) applied — DONE.
3. Executor respects the M4 halt-condition at APPLY time if WebFetch reveals scheme drift.
4. Executor captures WebFetch findings as `// Source: <URL>` citations in source (S9).
5. Manual UAT runbook (S8) executed end-to-end before Phase 4 Coolify cutover.
6. Pre-Phase-4 go-live blockers accumulated: D-01-02-F (email verification), D-01-03-F (Twilio SMS console default), D-03-01-F (probe-console dev bypass — now also D-03-04-H for Infobip side), D-03-04-G (Infobip console default).

**Risks that remain if shipped as-is (post-fix):**
- Infobip rate limiting defended only by secret-not-leaked assumption (D1). Acceptable at POC.
- Outbound idempotency not guaranteed (D3). User-visible duplicate under extreme retry conditions. Acceptable at POC.
- No automated regression harness replacing probe-whatsapp — Phase 3 behaviors are only verified by (a) the type system, (b) the 13 verification grep checks, (c) manual Infobip UAT. A subtle regression in behavior that compiles + passes grep could escape. This is a user-accepted tradeoff captured in SCOPE LIMITS.

**Would I sign my name to this system post-fix? Yes, conditional on:**
- M4 halt-condition actually honored (easy to skip under APPLY pressure — written but executor must respect it).
- Infobip Portal UAT walkthrough completed before Phase 4 deploy.
- D-03-04-G / D-03-04-H / D-03-04-I tracked as exit-gates on the Phase 4 go-live checklist.

---

**Summary:** Applied 7 must-have + 9 strongly-recommended upgrades. Deferred 5 with explicit triggers. Registered 4 new deferred items (D-03-04-F/G/H/I).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
