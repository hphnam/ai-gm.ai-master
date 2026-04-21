---
phase: 03-whatsapp-integration
plan: 04
subsystem: infra
tags: [infobip, whatsapp, webhook, hmac-sha256, provider-migration]

# Dependency graph
requires:
  - phase: 03-whatsapp-integration
    provides: WhatsApp module structure + typing-indicator-timers + seen-message-sids + rate-limiters (03-01/02/03 Twilio shipped-then-superseded)
  - phase: 01-auth-organizations
    provides: PhoneNumber lookup + Twilio Verify SMS OTP (Phase 1 Plan 01-03) — explicitly preserved
provides:
  - Infobip WhatsApp webhook handler (HMAC-SHA256 over raw JSON body)
  - Infobip REST outbound adapter (POST /whatsapp/1/message/text, Authorization: App {apiKey})
  - Provider-neutral whatsapp-media-download with auth trial matrix + SSRF/MIME/magic-byte hardening
  - Infobip env validation block (infobip? in assertAuthEnv)
  - Zero automated regression harness — probes deleted per user directive
affects: [Phase 4 Coolify Deployment — will need Infobip webhook URL cutover, SECRET rotation, Meta Business verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Express raw-body middleware + JSON.parse-in-middleware for HMAC verification
    - Module augmentation pattern for req.rawBody type safety
    - Auth-trial matrix for provider-docs-ambiguous media URLs (App header → no-auth retry → halt)
    - Boot-time Express middleware-stack assertion preventing silent middleware-reorder 403s
    - Batch-deadline for Infobip webhook results[] iteration

key-files:
  created:
    - apps/api/src/types/express-augment.d.ts
    - apps/api/src/modules/whatsapp/whatsapp-media-download.ts (git mv from twilio-media-download.ts)
  modified:
    - packages/types/src/whatsapp.ts
    - apps/api/src/modules/auth/assert-auth-env.ts
    - apps/api/src/modules/whatsapp/whatsapp-signature.guard.ts
    - apps/api/src/modules/whatsapp/whatsapp.adapter.ts
    - apps/api/src/modules/whatsapp/whatsapp.controller.ts
    - apps/api/src/modules/whatsapp/whatsapp.service.ts
    - apps/api/src/main.ts
    - apps/api/package.json

key-decisions:
  - "Proceed on plan's reasonable-default Infobip API assumptions after WebFetch returned only docs hub landing page (not material drift)"
  - "Mid-APPLY scope expansion: user directed deletion of ALL probes (probe-api, probe-auth, probe-ingest, probe-embeddings, probe-whatsapp), not just probe-whatsapp"
  - "All probe:* npm scripts removed; apps/api has zero automated regression harness going forward"
  - "Dead PROBE_* env hooks in chat.service.ts / assert-auth-env.ts / whatsapp-media-download.ts left in place — harmless, removing them is scope creep"

patterns-established:
  - "Webhook signature verification: raw-body middleware preserves req.rawBody → guard HMAC-SHA256s it → M3 format regex rejects malformed encoding BEFORE Buffer.from → timingSafeEqual"
  - "Provider migration pattern: rename env vars, schema, guard, adapter, service field mapping in order; preserve ID-opaque modules (dedupe, rate-limit, timers) untouched"
  - "Scheme-discovery halt-condition: if docs reveal material drift from assumption, halt APPLY + raise checkpoint rather than guess-and-ship"

# Metrics
duration: ~40min
started: 2026-04-20T20:50:00Z
completed: 2026-04-20T21:30:00Z
---

# Phase 3 Plan 04: Twilio → Infobip WhatsApp Provider Migration

**Swapped WhatsApp provider from Twilio (HMAC-SHA1 over URL+sorted-fields + form-urlencoded + Basic Auth outbound) to Infobip (HMAC-SHA256 over raw JSON body + `{results:[]}` payload + `Authorization: App {key}` outbound). Phase 1 Twilio Verify SMS OTP ring-fenced with zero diff. User-directed mid-APPLY expansion deleted ALL probes — project now has zero automated regression harness.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~40 min |
| Started | 2026-04-20 20:50 |
| Completed | 2026-04-20 21:30 |
| Tasks | 3/3 completed + pre-flight + final-verify |
| Files modified | 8 |
| Files created | 2 |
| Files deleted | 5 (1 in plan + 4 scope-expansion) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Infobip HMAC-SHA256 verify → 200 / invalid → 403 | Structural Pass / UAT pending | Guard ships with `x-callback-signature` + hex encoding assumptions. M3 signature-malformed reject lands before Buffer.from. First live Infobip Portal UAT verifies header name + encoding. |
| AC-2: Inbound text preserves all Phase 3 behaviors | Structural Pass / UAT pending | Field remap complete (MessageSid→messageId, From→from, Body→message.text, MediaUrl0→message.url). All rate-limit / conversation / proactive-opener / typing paths preserved. |
| AC-3: Outbound via Infobip REST live/console/disabled | Structural Pass / UAT pending | `POST /whatsapp/1/message/text` with `Authorization: App ${apiKey}` and JSON body. Live/console/disabled kill-switch preserved. |
| AC-4: Typing indicator console-mode only (D-03-04-F) | Pass | Live mode logs console-equivalent event + one-time boot WARN. |
| AC-5: Image download with App apiKey header | Structural Pass / UAT pending | S3 auth trial matrix (App → no-auth retry → halt) shipped; all 4 hardening layers (SSRF / MIME / magic-byte / streaming-counter) preserved wire-agnostic. |
| AC-6: Env validator — Infobip replaces Twilio WhatsApp | Pass | `infobip?` AuthEnv block; `whatsapp?` block removed. M2 secret ≥32 chars + S5 apex+subdomain regex enforced. Twilio Verify block for SMS OTP untouched. |
| AC-7: Build clean + probe-whatsapp deleted | Pass (scope expanded) | `pnpm --filter @gm-ai/types build` ✓ + `pnpm --filter api build` ✓ (70 files SWC 40.75ms). ALL probes deleted (plan only called for probe-whatsapp). |
| AC-8: Phase 1 Twilio Verify NOT touched | Pass | `git diff --stat apps/api/src/modules/phone/` → empty. TWILIO_ACCOUNT_SID/AUTH_TOKEN/VERIFY_SERVICE_SID env reads preserved in assertAuthEnv. |
| AC-9: req.rawBody type-safe augmentation | Pass | `apps/api/src/types/express-augment.d.ts` created. Build strict-mode passes with zero `@ts-ignore` on rawBody. |
| AC-10: Contact name NEVER logged | Pass | `grep -n "contact.name\|contactName\|waIdHash\|contactNameHash" apps/api/src/modules/whatsapp/whatsapp.service.ts` → 0 hits. Previous `waIdHash` slot dropped with explicit comment. |
| AC-11: Middleware-order boot-assertion | Pass | `main.ts` ships Express `_router.stack` introspection + `process.exit(1)` + contract comment. |
| AC-12: Media URL auth trial matrix | Pass | `fetchWithAuthTrial()` helper: App apiKey → on 401/403 retry no-auth → on 401/403 again returns `auth-trial-exhausted` errorKind + friendly fallback. Deadline shared across attempts. |
| AC-13: Batch-deadline on controller for-loop | Pass | BATCH_DEADLINE_MS=12_000 exported from `@gm-ai/types`; controller emits `whatsapp.batch_deadline_reached` + per-skip debug log. |

**UAT-blocked ACs:** AC-1, AC-2, AC-3, AC-5 — structurally landed, awaiting Infobip Portal UAT (runbook in PLAN `<output>` section). Build-clean is the only automated regression signal in this APPLY (see Deviation D2).

## Accomplishments

- **WhatsApp module completely migrated to Infobip wire** with zero impact on Phase 1 Twilio Verify SMS OTP (cross-cutting integration ring-fenced).
- **All 7 enterprise-audit must-haves shipped:** rawBody type augmentation, webhook secret strength check, signature-malformed reject, halt-condition registered, contact-name log drop, middleware-order boot-assert, D-03-04-G registered.
- **All 9 enterprise-audit strongly-recommendeds shipped:** Content-Type allowlist, signatureValidated log flag, media auth trial matrix, batch deadline, BASE_URL apex regex, D-03-04-H/I registered, UAT runbook enumerated, citation discipline.
- **Provider-neutral rename** of `twilio-media-download.ts` → `whatsapp-media-download.ts` preserves git history via `git mv` and avoids future churn if Infobip is swapped for Meta Cloud API direct.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/types/src/whatsapp.ts` | Modified | `InfobipInboundWebhookSchema` + related types replaces `TwilioWebhookPayloadSchema`. `DEFAULT_WHATSAPP_MEDIA_HOST_ALLOWLIST` replaces `DEFAULT_TWILIO_MEDIA_HOST_ALLOWLIST`. New `BATCH_DEADLINE_MS = 12_000` constant (audit S4). |
| `apps/api/src/modules/auth/assert-auth-env.ts` | Modified | `infobip?` AuthEnv block replaces `whatsapp?`. Validates INFOBIP_BASE_URL (apex + subdomain), INFOBIP_API_KEY, INFOBIP_WHATSAPP_SENDER (bare E.164), INFOBIP_WEBHOOK_SECRET (≥32 chars), INFOBIP_DRIVER_OVERRIDE. `twilio?` block for SMS OTP untouched. |
| `apps/api/src/modules/whatsapp/whatsapp-signature.guard.ts` | Modified | Full rewrite: HMAC-SHA256 over `req.rawBody`, `x-callback-signature` header, hex encoding, `sha256=` prefix tolerance, M3 format regex (`HEX_RE`/`BASE64_RE`) BEFORE `Buffer.from`. Dev-bypass preserved for D-03-04-H UAT curl testing. |
| `apps/api/src/modules/whatsapp/whatsapp.adapter.ts` | Modified | Full rewrite: `baseMode` pulled from `env.infobip`, `POST ${baseUrl}/whatsapp/1/message/text` with `Authorization: App ${apiKey}` JSON body. `sendTypingIndicator` console-only (D-03-04-F) + one-time boot WARN on live-mode. `TO_RE` tightened to bare E.164. |
| `apps/api/src/modules/whatsapp/whatsapp-media-download.ts` | Renamed + Modified | `git mv` from `twilio-media-download.ts`. `downloadWhatsappMedia(url, apiKey)` replaces `downloadTwilioMedia`. Auth trial matrix via `fetchWithAuthTrial()` (App → no-auth retry → halt). Env vars swapped to `WHATSAPP_MEDIA_HOST_ALLOWLIST` + `DEFAULT_WHATSAPP_MEDIA_HOST_ALLOWLIST`. |
| `apps/api/src/modules/whatsapp/whatsapp.controller.ts` | Modified | Route `/webhooks/infobip/whatsapp`, iterates `parsed.data.results`, per-result try/catch, `BATCH_DEADLINE_MS` soft deadline, `signatureValidated:true` in payload_invalid log. |
| `apps/api/src/modules/whatsapp/whatsapp.service.ts` | Modified | `handleInbound(result: InfobipInboundResult)`. Field remap: `result.messageId`/`result.from`/`result.message.text`/`result.message.url`/`result.message.type`. `phoneNumber = '+' + result.from` for User lookup match. `waIdHash` log field DROPPED (audit M5). |
| `apps/api/src/main.ts` | Modified | `raw()` parser on `/webhooks/infobip/whatsapp` preserves `req.rawBody`; `json()` default elsewhere. Content-Type allowlist `['application/json', 'application/*+json']`. Boot-time Express `_router.stack` introspection with `process.exit(1)` on missing webhook branch. |
| `apps/api/src/types/express-augment.d.ts` | Created | `declare module 'express-serve-static-core'` adding `Request.rawBody?: Buffer` — closes implicit-any silent refactor hazard (audit M1). |
| `apps/api/package.json` | Modified | ALL `probe:*` scripts removed (scope expansion). `probe:embeddings`/`probe:ingest`/`probe:api`/`probe:auth`/`probe:whatsapp` gone. |
| `apps/api/src/scripts/probe-whatsapp.ts` | Deleted | Planned. |
| `apps/api/src/scripts/probe-api.ts` | Deleted | Scope expansion. |
| `apps/api/src/scripts/probe-auth.ts` | Deleted | Scope expansion. |
| `apps/api/src/scripts/probe-ingest.ts` | Deleted | Scope expansion. |
| `apps/api/scripts/probe-embeddings.ts` | Deleted | Scope expansion. |
| `apps/api/src/modules/whatsapp/twilio-media-download.ts` | Deleted (renamed) | `git mv` to whatsapp-media-download.ts. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Proceed on plan's assumptions after WebFetch failed to extract Infobip doc content | WebFetch returned only docs-hub landing page meta (JS-rendered content inaccessible). Not "scheme materially different" (M4 halt-condition reserved for discovered drift). UAT runbook step 8 surfaces drift on first inbound. | AC-1/2/3/5 remain UAT-gated; build-clean + type-check are the only automated signals. |
| User scope expansion mid-APPLY: delete ALL probes | User directive: "we simply don't use it" — clarified to include probe-api, probe-auth, probe-ingest, probe-embeddings, not just probe-whatsapp. | ~140 automated assertions retired. Regression coverage now = TypeScript compile + manual UAT. Acceptable at POC stage; re-add Vitest + supertest (API) / Playwright (UI) before team scale or public deploy. |
| Leave dead PROBE_* env hooks in service layer | Removing `PROBE_CHAT_SERVICE_STUB` (chat.service.ts), `PROBE_CHAT_SERVICE_DELAY_MS` (assert-auth-env.ts + chat.service.ts), `PROBE_MEDIA_HOST_ALLOWLIST` (whatsapp-media-download.ts) requires touching active service code. Out of migration scope. | Dead-code technical debt; sweep in a dedicated cleanup plan. Runtime cost is near-zero (single env.read per boot / per-request). |
| Provider-neutral rename (`whatsapp-media-download.ts`) | Future Meta Cloud API direct migration won't need another rename. | Reduces future churn if BSP changes. |
| `phoneNumber = '+' + result.from` remap | Phase 1 Plan 01-03 stores User.phoneNumber in E.164 WITH `+` prefix (E164_RE verified: `/^\+[1-9]\d{7,14}$/`). Infobip delivers bare digits. | Verified users match their Phase 1 phoneNumber row. Grounded at audit time via direct schema + regex inspection. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Scope expansion | 1 | Large — deleted 4 additional probes + npm scripts |
| UAT-gated ACs | 4 | Structural pass, awaiting Infobip Portal UAT |
| Unverified assumptions (source citations pending) | 5 | UAT runbook surfaces drift |
| Deferred (registered with trigger) | 4 | D-03-04-F/G/H/I |

**Total impact:** Migration structurally complete. Automated regression harness removed per user directive — net reduction in code-quality signals going forward. UAT before Phase 4 cutover is the critical path.

### D1 — Mid-APPLY scope expansion: delete ALL probes (not just probe-whatsapp)

- **Found during:** Task 3 verify step (probe-api boot-failed on env validation)
- **Issue:** Plan only scoped `probe-whatsapp.ts` deletion. User clarified mid-APPLY that all probes should be removed ("probe is just tests right? ... I said to remove the probes entirely").
- **Fix:** Deleted `probe-api.ts`, `probe-auth.ts`, `probe-ingest.ts`, `probe-embeddings.ts`. Removed `probe:*` entries from `apps/api/package.json` scripts. Both `apps/api/scripts/` and `apps/api/src/scripts/` directories no longer exist.
- **Verification:** `ls apps/api/scripts apps/api/src/scripts` → ENOENT. `grep -c "probe:" apps/api/package.json` → 0.
- **Consequence:** Project has zero automated regression harness. ~140 pre-existing assertions retired (probe-api 61 + probe-auth 54 + probe-ingest + probe-embeddings + probe-whatsapp 27). Future regressions surface only via TypeScript compile + manual UAT.

### D2 — AC-7 probe-api 61/61 + probe-auth 54/54 assertions no longer runnable

- **Found during:** Final verify
- **Issue:** Plan AC-7 called for `pnpm --filter api probe:api` → 61/61 and `pnpm --filter api probe:auth` → 54/54 as regression floor. D1 deleted the probes.
- **Fix:** Build-clean is the only automated check remaining. AC-7 marked Pass for the portions still verifiable (build clean, probe-whatsapp deleted, probe:whatsapp script gone, no Twilio in whatsapp module).
- **Consequence:** Pre-Phase-4 go-live gate list gains implicit regression risk. Recommend Phase 4 include a "re-add automated test layer" plan or ship alongside Coolify deploy.

### D3 — Infobip docs inaccessible via WebFetch; assumptions UAT-gated

- **Found during:** Pre-flight (before Task 1)
- **Issue:** Per audit M4, executor must WebFetch Infobip docs to confirm signature scheme + payload + outbound shape. Attempted `https://www.infobip.com/docs/api/channels/whatsapp` and related URLs — all returned only the docs hub landing page meta (dynamic JS rendering blocks WebFetch from extracting the actual API reference content).
- **Fix:** Proceeded with plan's reasonable-default assumptions. Source files carry `// UAT-VERIFY:` citations marking:
  - Signature header name: `x-callback-signature` (Infobip community pattern)
  - Signature encoding: hex (lowercase)
  - Inbound payload: `{results:[{messageId, from, to, receivedAt, integrationType, contact, message:{type, text, caption, url}}]}`
  - Outbound endpoint: `POST ${baseUrl}/whatsapp/1/message/text`, auth `App ${apiKey}`, body `{from, to, content:{text}}`
  - Outbound response: `{messages:[{messageId, status:{...}}]}`
  - Media URL auth: App apiKey header first, no-auth retry on 401/403 (trial matrix)
  - Media host allowlist: `*.infobip.com` (DEFAULT_WHATSAPP_MEDIA_HOST_ALLOWLIST)
- **Verification:** UAT step 8 (signature_rejected log count on first inbound) surfaces header/encoding drift immediately. UAT step 10 (image send) surfaces media-URL auth drift. No speculation needed — drift becomes measurable within one live message.
- **Not an M4 halt:** M4 halt-condition is reserved for *discovered material drift*, not *unverifiable assumption*. Documented as unverified with mitigation path (UAT observability).

### D4 — Dead PROBE_* env hooks remain in service code

- **Found during:** Post-APPLY grep sweep
- **Issue:** `PROBE_CHAT_SERVICE_STUB` / `PROBE_CHAT_SERVICE_DELAY_MS` / `PROBE_MEDIA_HOST_ALLOWLIST` env checks remain in `chat.service.ts`, `assert-auth-env.ts`, `whatsapp-media-download.ts`. These were 03-02/03 audit-added probe hooks — no consumer remains.
- **Fix:** Left in place. Removing them requires touching active service code outside this plan's scope.
- **Consequence:** Dead-code technical debt. Runtime cost is negligible (env read per boot / per-request). Sweep in a dedicated cleanup plan OR include in Phase 4 Coolify prep (prod deploy should validate all env vars are consumed).

### Deferred Items

Registered with explicit triggers in PLAN.md SCOPE LIMITS:

- **D-03-04-F** — Infobip WhatsApp typing-indicator live-mode. No public endpoint exists. Trigger: Meta Cloud API direct migration OR Infobip publishes typing endpoint.
- **D-03-04-G** — `INFOBIP_DRIVER_OVERRIDE=console` default in `.env.example`. **Pre-Phase-4 go-live BLOCKER** — same class as D-01-03-F for Twilio SMS OTP.
- **D-03-04-H** — Dev-bypass signature branch + `ALLOW_WEBHOOK_DEV_BYPASS` env. Retained for manual curl testing during Infobip Portal UAT. Trigger: post-UAT cleanup plan.
- **D-03-04-I** — `__resetForTest` orphan exports on rate-limit / seen-sid / typing-timer modules. Trigger: v0.3 review if still unused, OR add if focused unit tests are written.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| probe-api boot failed on env validation ("INFOBIP_WEBHOOK_SECRET required" + "INFOBIP_BASE_URL must be https://...") — .env had bare host `x114nq.api.infobip.com` without scheme and no driver override | User added `https://` prefix and `INFOBIP_DRIVER_OVERRIDE=console` to `.env`. Moot after D1 deletion of all probes. |
| Infobip WebFetch returned only docs hub landing page meta | Proceeded on plan's reasonable-default assumptions with `UAT-VERIFY:` citations. UAT runbook surfaces drift on first inbound. See D3. |

## Next Phase Readiness

**Ready:**
- Infobip wire-swap structurally complete; build clean; Phase 1 Twilio Verify SMS OTP untouched.
- UAT runbook enumerated (12 steps) in PLAN `<output>` section.
- Audit deferrals registered with triggers for Phase 4 exit-gate list.
- `apps/api/src/types/express-augment.d.ts` establishes the module-augmentation pattern for future Express request extensions.

**Concerns:**
- Zero automated regression harness going forward. A subtle Phase 1/2 regression will only surface via TypeScript compile (won't catch behavioral drift) or manual UAT.
- Infobip signature header name + encoding are unverified assumptions until UAT step 8.
- Media URL auth scheme is speculative (trial matrix is robust, but first image UAT confirms which branch actually fires).
- Dead PROBE_* env hooks in 3 service files — cleanup deferred.
- Pre-Phase-4 go-live blockers accumulating: D-01-02-F (email verification), D-01-03-F (Twilio SMS console default), D-03-01-F (probe-console dev bypass — now subsumed into D-03-04-H for Infobip), D-03-04-G (Infobip console default), D-03-04-H (dev-bypass branch).

**Blockers:** None for planning Phase 4. Infobip Portal UAT is a pre-Phase-4-go-live checkpoint, not a pre-plan one.

---
*Phase: 03-whatsapp-integration, Plan: 04*
*Completed: 2026-04-20*
