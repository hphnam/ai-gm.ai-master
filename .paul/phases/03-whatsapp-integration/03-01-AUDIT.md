# Enterprise Plan Audit Report

**Plan:** .paul/phases/03-whatsapp-integration/03-01-PLAN.md
**Audited:** 2026-04-20 14:55
**Verdict:** conditionally acceptable pre-fix → **enterprise-ready post-fix**

---

## 1. Executive Verdict

Pre-fix, **not acceptable for production** as-specified. The plan had enterprise-grade intent (driver-mode kill-switch, PII-safe logging, fail-soft adapter boundary, no-new-deps posture) but shipped four unacknowledged architectural landmines:

1. **Host-spoofing bypass of HMAC signature validation.** Plan instructed guard to use `X-Forwarded-Host` / `X-Forwarded-Proto` / `req.get('host')` to reconstruct the signature URL. Any of those can be set by the HTTP client. An attacker computes a valid signature against `evil.com`, sends it to the real host with `X-Forwarded-Host: evil.com`, and the guard accepts it. The webhook's only authentication is defeated.
2. **Prod-leakable dev-bypass.** A hardcoded `X-Twilio-Signature: probe-console` bypass activates whenever `TWILIO_WHATSAPP_DRIVER_OVERRIDE=console` AND `TWILIO_AUTH_TOKEN` is unset. Both conditions can be reached in prod via operator misconfiguration (e.g., deploying with killswitch pending, forgetting to set AUTH_TOKEN). Merely noting `D-03-01-F: remove before cutover` is not a control — it's a promise.
3. **Unbounded Claude cost exposure.** No per-sender inbound rate limit. A compromised verified user (or adversarial employee) can trigger N × Claude spend per minute. The `ONBOARDING_COOLDOWN_MS` throttle only covers the reply for unknown senders — it does not gate the Claude call for verified senders.
4. **Schema-fabricated `channel='whatsapp'` filter on ChatConversation.** The column does not exist in schema.prisma. The plan would either fail type-check or (worse, via a loose Prisma query shape) silently filter on nothing and blur conversation reuse.

Additional material gaps: no MessageSid idempotency (Twilio retries duplicate Claude spend), no ChatService hard-timeout (Twilio's 15s budget will be exceeded), no constructor-time creds check on adapter 'live' mode (silent 3am NPE), no rejection of malformed/duplicate form keys in signature computation.

**Post-fix verdict:** enterprise-ready. All seven must-haves applied to the plan, nine strongly-recommended upgrades applied, six items deferred with explicit triggers. I would sign my name to it for POC/internal rollout. I would NOT sign for external-facing production until D-03-01-F (dev-bypass removal) and D-01-02-F/D-01-03-F pre-Phase-4 blockers are closed.

## 2. What Is Solid (Do Not Change)

* **Driver-mode getter pattern with `disabled` precedence read per-request.** Kill-switch without redeploy is genuinely correct. Copied straight from 01-03 and appropriate to reuse.
* **No-new-dependencies boundary.** fetch + crypto cover both signature validation and outbound. Avoiding the `twilio` SDK reduces attack surface and deprecation churn.
* **PII-safe log intent.** Plan correctly identifies phones, Body, and assistant text as PII. Audit tightened the implementation (WaId hashing, signature header suppression, error-message suppression), but the framing was right.
* **Path-filtered body parser reuse.** Extending the existing `/docs/upload` exemption middleware (02-02 pattern) rather than adding a new global parser is the right architectural move.
* **Fail-soft adapter contract.** `WhatsAppOutboundResult` discriminated union (no throws from sendText) matches the `ToolResult<T>` pattern established in Phase 3 v0.1. Constructor-time fail-fast (added) is the correct single exception.
* **Autonomous flag.** `autonomous: true` is correct — no visual UI checkpoints, real-sandbox UAT explicitly deferred to a later plan.
* **Narrow scope choice.** User-chosen option (a) — probe split to 03-02 — is the right call. Tight plan boundary makes the audit actually tractable.

## 3. Enterprise Gaps Identified

### Authentication / Trust Boundary
* **G1: Host-spoof defeats signature.** Forwarded-header trust with no proxy allowlist. **Must-have.**
* **G2: Dev-bypass prod-reachable.** `TWILIO_AUTH_TOKEN` unset + console mode → any attacker knowing the path bypasses. **Must-have.**
* **G3: No rejection of malformed form payloads.** Express `urlencoded` default parser MAY produce arrays on duplicate keys; Twilio sends scalars only. Signature computation over arrays is non-deterministic. **Must-have.**

### State / Idempotency
* **G4: MessageSid replay window unguarded.** Twilio retries on slow handlers → duplicate Claude spend + double assistant reply. Attacker replays captured signed requests. **Must-have.**
* **G5: ChatConversation `channel='whatsapp'` column fabricated.** Schema has no such column. **Must-have.**
* **G6: No hard timeout on ChatService.sendMessage.** Plan says "10s Twilio budget"; actual budget is 15s; sendMessage has observed p95 > 20s on v0.1 probe-eval. **Must-have.**

### Cost / Abuse
* **G7: No verified-sender rate limit.** Claude cost is unbounded per verified phone. **Must-have.**

### Runtime Correctness
* **G8: Adapter 'live' mode with missing creds = NPE.** Constructor does not fail-fast. **Must-have.**
* **G9: Underspecified ChatConversation filter (even after G5 fix).** Plan says "findFirst with filter … orderBy updatedAt desc; if none or >2h, create" but never writes the exact filter. Risk of drift during implementation. **Strongly recommended.**
* **G10: Orphan ChatService promise on timeout.** No AbortController threading in v0.1 sendMessage; timing out the outer race leaves an in-flight Claude call. Acceptable for POC but needs explicit documentation. **Strongly recommended.**
* **G11: Multi-org user routing silently picks oldest OrganizationMember.** No WARN log; wrong-tenant routing is invisible. **Strongly recommended.**

### Observability / Compliance
* **G12: WaId is a phone-number-equivalent and was not hashed.** PII leak via structured logs. **Strongly recommended.**
* **G13: Signature header value could be log-captured via `err.message` or debug mode.** Plan did not explicitly ban it. **Strongly recommended.**
* **G14: `err.message` can carry PII in chained exceptions.** Plan's try/catch logs the error; if error originates in prisma with a phone value in the query, `err.message` will include it. **Strongly recommended.**
* **G15: AC-3 rate-limit second-hit path had no explicit verify step** — one curl path only. **Strongly recommended.**
* **G16: Env validation did not handle `disabled` mode without creds.** Plan rejected boot when FROM set + driverOverride !== 'console' + no creds; but disabled mode should also be creds-optional. **Strongly recommended.**
* **G17: No persistent audit-event table.** SOC2 Type II would require reconstruction from logs only. Acceptable for POC, but flag. **Can defer.**
* **G18: No per-IP rate limit on signature failures.** CPU/log abuse vector. **Can defer.**
* **G19: `URL` limit + Body size validation not enforced at Zod layer.** Added `max(8000)` via audit. **Strongly recommended.**

### Maintenance
* **G20: "10s Twilio budget" is factually wrong in plan narrative (actually 15s).** Non-blocking but corrected. **Strongly recommended.**
* **G21: ChatConversation `create` shape unspecified.** `{ venueId, organizationId, userId }` — confirm by reading schema before coding.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | G1 Host-spoof defeats signature | frontmatter + Task 1 (env spec) + Task 2 (guard spec) + AC-11 + .env.example + boundaries | Introduced `WHATSAPP_WEBHOOK_PUBLIC_URL` env (https-only, fixed path regex); signature guard pins against it; explicit grep-verify that `x-forwarded` / `req.get('host')` appear zero times in module; AC-11 added with boot-fail contract. |
| M2 | G2 Dev-bypass prod-reachable | Task 1 (env spec) + Task 2 (guard) + AC-12 + .env.example + boundaries | Added `ALLOW_WEBHOOK_DEV_BYPASS` env; assertAuthEnv fails fast if `NODE_ENV=production` + var set to `"true"`; guard reads `allowDevBypass` from env object (precomputed at boot); AC-12 added with three-case coverage. |
| M3 | G4 MessageSid replay + G6 ChatService timeout | new file `seen-message-sids.ts` + Task 2 service spec + AC-8 + AC-10 + @gm-ai/types constants `SEEN_SID_TTL_MS`, `CHAT_TIMEOUT_MS` | In-memory dedupe at step 0 of handleInbound; `Promise.race` with 12s timer; ack-reply on timeout; `whatsapp.replay_dedupe` + `whatsapp.chat_timeout` logs. |
| M4 | G7 Claude cost exposure | new file `verified-sender-rate-limit.ts` + Task 2 step 3 + AC-9 + @gm-ai/types constants `VERIFIED_SENDER_LIMIT_PER_HOUR=30`, `VERIFIED_SENDER_WINDOW_MS` | Sliding-window counter per phone-hash; throttle-reply at most once per 30min; `whatsapp.verified_sender_throttled` log. |
| M5 | G5 Fabricated ChatConversation.channel column | Task 2 step 7 | Removed invented `channel='whatsapp'` filter; strict filter on `{ venueId, updatedAt >= 2h-ago }`; explicit note that schema has NO channel column; SCOPE LIMIT documents cross-channel conversation merge as accepted POC limitation; D-03-01-G registered for schema follow-up. |
| M6 | G8 Adapter 'live' with missing creds NPE | Task 1 adapter spec | Constructor fails fast with descriptive Error if `baseMode='live'` + any cred blank; ONLY permitted throw-site in adapter. |
| M7 | G3 Malformed / duplicate form keys | Task 2 guard spec | Guard rejects as `signature-invalid` if any `req.body[k]` is an array / non-string; `bodyKeyCount` logged (not values). |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | G9 Underspecified ChatConversation filter | Task 2 step 7 | Exact Prisma where/orderBy shape specified inline; `organizationId` + `venueId` + `updatedAt` gte-2h. |
| S2 | G10 Orphan ChatService promise | Task 2 step 8 + boundaries + deferred | Documented `whatsapp.chat_timeout_orphan_completion_expected` comment requirement; SCOPE LIMIT + D-03-01-I (AbortController threading) with explicit trigger. |
| S3 | G16 Disabled mode boot without creds | Task 1 env spec | Env rule relaxed: `driverOverride in {console, disabled}` both bypass cred requirement. |
| S4 | G12 WaId hashing | AC-1 + AC-6 + Task 1 adapter spec + Task 2 service spec | `waIdHash` added to `whatsapp.inbound` log; sha256Prefix applied to WaId same as From/To; AC-6 extended to cover WaId. |
| S5 | G15 AC-3 second-hit verify step | <verification> | Added explicit two-request sequential curl with distinct log-line assertions for both `replied: true` and `replied: false`. |
| S6 | G14 err.message PII leak | Task 2 step 9 | Error logging restricted to `err.constructor?.name` only; explicit ban on `err.message` in guidance + grep verify. |
| S7 | G13 Signature header leak via logs | Task 2 guard + verification | Explicit "NEVER log signature string OR raw URL query string" in action + grep step in verification. |
| S8 | G11 Multi-org user routing opacity | Task 2 step 5 | WARN log `whatsapp.multi_org_user` when OrganizationMember.count > 1; deterministic fallback documented; D-03-01-K registered. |
| S9 | G19 Zod body size | Task 1 schema spec | `Body: z.string().max(8000)`; MessageSid + AccountSid capped at 64 chars. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | G17 Persistent WebhookEvent audit table | Log-based reconstruction is sufficient for POC. Needed only if SOC2 Type II scope declared. Registered as D-03-01-H with trigger. |
| D2 | G18 Per-IP rate limit on signature failures | Twilio signature is the only auth surface; DDoS / abuse signal must be observed before adding. Registered as D-03-01-J with `>10k bad-sig/day` trigger. |
| D3 | Per-IP rate limit on webhook endpoint (general) | Redundant with G7 (verified-sender) + onboarding cooldown + signature guard. Add post-abuse signal. |
| D4 | AbortController threading through ChatService | Requires Claude SDK contract change that ripples through v0.1 phase 4 code. Not scope-fit for this plan. Registered as D-03-01-I. |
| D5 | `User.defaultOrganizationId` schema column | Requires UX + auth-flow integration for "which org am I texting from?". Registered as D-03-01-K. |
| D6 | TWILIO_AUTH_TOKEN rotation procedure | Post-POC ops concern. Pairs with existing D5 (BETTER_AUTH_SECRET rotation) from 01-01 audit. |

## 5. Audit & Compliance Readiness

**Post-fix evaluation:**
* **Defensible audit evidence:** Every inbound is persisted to `ChatMessage` via ChatService (verified sender path); transient events (unknown-number, unsupported-media, dev-bypass, signature-reject, throttle) emit structured log lines with sha256-prefixed phone hashes + requestId correlation (via existing X-Request-Id middleware). Sufficient for post-incident reconstruction at POC scale.
* **Silent-failure prevention:** Constructor fail-fast (M6) catches misconfigured 'live' mode at boot, not at 3am request time. URL-pin (M1) converts a silent signature-validation bypass into an explicit boot failure. Dev-bypass guard (M2) converts a prod-leakage risk into a deterministic boot-refusal. Idempotency (M3) converts silent duplicate-Claude-spend into an observable `replay_dedupe` log.
* **Ownership / accountability:** Plan owner is Ryan (solo POC). Go-live blocker list (D-01-02-F + D-01-03-F + D-03-01-F) is the accountability mechanism. For team scale-up, add a CODEOWNERS entry mapping `apps/api/src/modules/whatsapp/**` to a specific person or rota.
* **Real-audit failure risk:** Two remaining concerns for external audit — (a) D-03-01-H absence of DB-backed webhook-event log; (b) D-03-01-J no rate limit on invalid-signature requests. Both acceptable for POC pre-public deploy; both would be findings in a SOC2 Type II review. Neither is release-blocking for internal use.

## 6. Final Release Bar

**Must be true before ship (internal POC):**
- All 12 AC verified via the listed <verification> checklist, including the two new boot-failure checks (AC-11, AC-12).
- `pnpm --filter api probe:api` + `probe:auth` still green.
- `.env.example` documents all 4 WhatsApp env keys with correct guardrail comments.
- Grep verification: zero `x-forwarded` / `req.get('host')` references in whatsapp module; zero `err.message` in logger calls; zero raw `payload.From` / `payload.To` / `payload.WaId` / `payload.Body` outside of sha256Prefix-wrapped or `.length` usage.

**Remaining risks if shipped as-is (internal POC):**
- Single-process rate-limit state — horizontal scaling breaks unknown-number cooldown, verified-sender cap, and MessageSid dedupe. Acceptable on POC Coolify single-node deployment.
- Orphan Claude promise on chat-timeout (D-03-01-I) — no cost attribution on these timed-out calls.
- No DB-persisted webhook event log (D-03-01-H) — audit reconstruction depends on structured-log retention.

**Pre-Phase-4 production blockers (carry forward to STATE.md):**
- D-03-01-F: remove dev-bypass signature + `ALLOW_WEBHOOK_DEV_BYPASS` env var (MUST — alongside existing D-01-02-F email-verification + D-01-03-F TWILIO_DRIVER_OVERRIDE console-default strip).

**Sign-off:** Yes for internal POC / staging. No for external production until D-03-01-F is closed and D-03-01-H/J are risk-accepted in writing by an owner.

---

**Summary:** Applied **7** must-have + **9** strongly-recommended upgrades. Deferred **6** items with explicit triggers.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
*Auditor role: senior principal engineer + compliance reviewer*
