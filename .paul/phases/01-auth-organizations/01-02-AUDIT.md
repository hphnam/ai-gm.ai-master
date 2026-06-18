# Enterprise Plan Audit Report

**Plan:** .paul/phases/01-auth-organizations/01-02-PLAN.md
**Audited:** 2026-04-19T18:00:00Z
**Verdict:** Conditionally acceptable pre-fix → enterprise-ready post-fix

---

## 1. Executive Verdict

**Conditionally acceptable pre-fix. Enterprise-ready after the 10 must-have and 8 strongly-recommended upgrades below are applied** (which this audit has now done automatically).

Would I sign off for production as-written pre-fix? **No.** The pre-fix plan ships at least one real account-hijack vector (email-not-verified + unverified-sign-up invite-accept), one email-bombing vector (no per-org invite cap), one email-header-injection surface (raw org-name interpolation into subject line), one DOS surface (unbounded Resend fetch timeout), and one race-condition double-accept window (non-optimistic-lock accept transaction). All of these are now closed.

Post-fix: the plan has **three independent trust-boundary layers** (compile-time InviteRole narrowing, runtime probe enforcement P13b/P16b/P18–P21, boot-time MAIL_FROM + MAIL_DRIVER_OVERRIDE validation) — mirrors the layered 01-01 pattern. I would sign off.

## 2. What Is Solid

**Do not change:**
- **Manual NestJS controllers over better-auth organization plugin** — Correct call. Enabling the plugin mid-stream risks regressing 01-01's atomic-org databaseHooks (AC-3). The plan's inline rationale is load-bearing; keep it.
- **fetch() over Resend SDK** — Justified for a single endpoint. Adding a dep for 8 lines of code is the wrong tradeoff.
- **Unauth preview endpoint returning masked email** — Correct minimum-disclosure posture. The preview only exists for the "here's what you're accepting" screen; no inviter PII, no org metadata. This is audit-defensible.
- **Cross-tenant 404-not-403 on DELETE /org/invitations/:id** — Mirrors v0.1 Plan 05-01 + 01-01 S15 email-enumeration pattern. Correct.
- **withOrgScope<InvitationWhere> usage** — Invitation has a direct organizationId FK, so `withOrgScope` (not `withOrgScopeVia`) is the type-correct call. Validates 01-01 M6's compile-time guard.
- **Dev-console mail fallback** — Correct posture for POC. Removes the "Resend account required to run the probe" friction, and the structured log is the dev-loop surface.
- **Idempotent reissue on duplicate pending invitation** — The plan's original intuition was right (rather than inventing an `invitation-already-exists` code, return the existing). Audit strengthened this with an explicit `reissued: true` flag (S8).

## 3. Enterprise Gaps Identified

### Account-integrity gaps
1. **Email-verified gate missing on accept.** better-auth email/password sign-up does NOT verify email ownership by default (01-01 did not enable `requireEmailVerification`). Without a gate, anyone can sign up with `target@victim.com` and claim invitations intended for the victim. Real account-hijack vector. **Must-have M2.**
2. **Owner role is invitable.** Plan's original InviteRole = ['owner', 'manager', 'staff']. Invitation-mint of owner means any compromised manager + DB-write could back-door an owner for a third party. Owners should be self-minted at sign-up or explicitly promoted via a separate 2-step consent flow. **Must-have M4.**

### Abuse-prevention gaps
3. **No per-org pending-invite cap.** Compromised owner → mass-invite 10,000 addresses → Resend quota burn + mass spam + 10,000 accept-URLs to abuse. **Must-have M7.** Plan now caps at `MAX_PENDING_INVITATIONS_PER_ORG = 50` with lazy-GC to keep the count honest.
4. **No rate limit on unauth preview endpoint.** `GET /org/invitations/:id/preview` is unauthenticated. UUID v4 IDs have 2^122 entropy — brute force infeasible — but a public endpoint with no ceiling is still a DOS/scraper footgun. **Strongly recommended S2.** Added in-memory per-IP 60/min bucket; upgrade to Redis at multi-instance trigger.
5. **Probe runs against real Resend API if RESEND_API_KEY is in operator .env.** One `pnpm probe:auth` would fire real invitation emails to synthetic addresses. **Must-have M10.** Probe now forces `MAIL_DRIVER_OVERRIDE='console'` and asserts no Resend traffic in captured logs.

### Protocol-correctness gaps
6. **Email-header-injection vector.** Subject line interpolates `organizationName` unescaped. An org literally named "Evil Corp\r\nBcc: attacker@example.com" injects a Bcc header. **Must-have M3.** Added `buildSubject()` helper with `/[\r\n]/g` strip.
7. **Resend fetch has no timeout.** Hung Resend endpoint blocks the request indefinitely; ties up a Node worker per in-flight invitation. **Must-have M1.** Added `AbortSignal.timeout(MAIL_SEND_TIMEOUT_MS = 5000)`.
8. **Double-accept race.** Two Promise.all accepts on the same invitation both pass the status='pending' read, both create OrganizationMember, both flip status='accepted'. Creates two org-member rows. **Must-have M5.** Replaced sequential read-then-write with optimistic-lock `updateMany({ where: { id, status: 'pending' }, data: { status: 'accepted' } })` — if rowcount === 0, second caller gets 409.
9. **Active-org update semantic error.** Plan says "Update Session.activeOrganizationId = invitation.organizationId (for currentUser's session)" — ambiguous whether this is one session or all. User has 3 devices → accepting on device A shouldn't silently switch active-org on devices B+C. **Must-have M8.** Scope the update to the specific `sessionId` from the current request context.
10. **Response inconsistency on expired invitation.** Plan originally said: first accept returns 410 expired + flips status to expired; next accept sees status='expired' and returns 404 not-found. Same resource, two different codes across time. Client mapping breaks. **Must-have M6.** Pinned down response matrix: expired is ALWAYS 410 regardless of status flip history; revoked is ALWAYS 404 (enum-safe).
11. **Wrong error code for already-a-member.** Plan reused `email-already-registered` (sign-up context) for "this email is already a member of this org." Semantically different. **Must-have M9.** New code `already-a-member` (409).

### Audit-defensibility gaps
12. **No structured log for invitation.accepted.** Invitation acceptance is an access-grant event. Without a per-call log entry, post-incident reconstruction ("who joined this org when") has to reconstruct from implicit INSERT timestamps on OrganizationMember. **Strongly recommended S4.**
13. **No pagination on GET /org/invitations.** An org with hundreds of accepted invitations returns the full list. Response payload growth + DB load. **Strongly recommended S1.** Added limit/offset/total/hasMore contract with server-clamped limit.
14. **Probe slug prefix collision risk.** Original plan used `probe-auth-invite-` which is a superset of 01-01's `probe-auth-` — any cleanup glob like `slug LIKE 'probe-auth-%'` would wipe both. **Strongly recommended S3.** Switched to `probe-invites-` (fully isolated).
15. **Client-side auto-accept retry loop footgun.** Original plan's useEffect fires mutate on mount; on 410 expired, user sees error, reloads, infinite retry. **Strongly recommended S6.** Split error codes into terminal (no retry button) vs transient (retry button); added React 19 strict-mode effect guard.
16. **Revoke action has no structured log.** Owner revoking an invite is an access-modification action worth a grep-able log line. **Strongly recommended S5.**
17. **Duplicate-invite idempotency implicit.** Plan returned the existing pending row on duplicate create but didn't flag it. Client can't distinguish "new row" from "same row you already had." **Strongly recommended S8.** Added `reissued: true` flag in CreateInvitationResponse.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking) — 10 findings

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Resend fetch has no timeout — hangs indefinitely on API downtime | Task 1 MailService step 3 + types constant + verification grep | Added `AbortSignal.timeout(MAIL_SEND_TIMEOUT_MS = 5000)`; exported const from @gm-ai/types; grep verify |
| M2 | Email-not-verified accept allows account-hijack via unverified sign-up | AC-3 + Task 1 Service step 6 + API_ERROR_CODES + Task 3 P21 + Task 2 mapApiError + boundaries | Added `emailVerified` gate (403 email-not-verified) with dev bypass + explicit WARN log; new error code; probe P21 verifies both branches |
| M3 | Email subject CRLF → header injection via malicious org name | Task 1 MailService step 3 + verification grep | Added `buildSubject(name)` helper with `/[\r\n]/g` strip; grep verify |
| M4 | Owner role invitable → back-door owner creation via compromised manager | Task 1 types step 1 (InviteRole narrowed) + AC-2 + API_ERROR_CODES + Task 3 P13b + controller mapInvitationError | `InviteRole = z.enum(['manager','staff'])`; service boundary assert; 400 invalid-invitation-role; probe P13b |
| M5 | Double-accept race → two OrganizationMember rows | AC-3 + Task 1 Service step 6 (acceptInvitation transaction) + Task 3 P16b + verification grep | Replaced read-then-write with optimistic-lock `updateMany WHERE status='pending'`; probe P16b fires concurrent Promise.all accepts |
| M6 | Expired invitation response inconsistency (410 then 404) | AC-4 + Task 1 Service step 6 | Pinned response matrix: expired → ALWAYS 410; revoked → ALWAYS 404; idempotent across retries |
| M7 | No per-org invite cap — mass-email-bombing vector | AC-11 (new) + Task 1 types step 1 (MAX_PENDING_INVITATIONS_PER_ORG=50) + Service createInvitation pre-check + mapApiError | 429 invitation-limit-reached; lazy-GC expireStaleInvitations called before count |
| M8 | Active-org update scope ambiguous (all sessions vs one) | AC-3 + Task 1 Service step 6 | Scope Session update to the specific `sessionId` from request context; explicit AC clause |
| M9 | Wrong error code for already-a-member (reusing sign-up code) | API_ERROR_CODES + Task 1 Service step 6 + Task 3 P20 + mapInvitationError + mapApiError | New code `already-a-member` (409); probe P20 verifies |
| M10 | Probe runs against real Resend API if operator has RESEND_API_KEY | Task 1 MailService step 3 (MAIL_DRIVER_OVERRIDE) + Task 3 P18 + verification grep | MailService honors MAIL_DRIVER_OVERRIDE='console'; probe sets it unconditionally; P18 asserts no Resend traffic |

### Strongly Recommended — 8 findings

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | No pagination on list endpoint → payload growth | AC-12 (new) + Task 1 types ListInvitationsResponse + Service listInvitations + Task 3 P17b | Added limit/offset/total/hasMore contract; server-clamp [1,100]; probe P17b |
| S2 | Unauth preview endpoint has no rate limit | Task 1 Controller step 7 | In-memory per-IP 60/min throttler; upgrade to Redis at multi-instance trigger (D-01-02-G) |
| S3 | Probe slug prefix `probe-auth-invite-` collides with 01-01's `probe-auth-` | Task 3 step 1 + cleanup + verification grep | Switched to `probe-invites-`; grep verifies both positive and negative (original prefix absent) |
| S4 | Missing audit-defensible log for invitation.accepted | AC-3 + Task 1 Service step 6 + verification grep | Added structured `invitation.accepted { invitationId, acceptorUserId, organizationId, role, acceptorEmailHash }` at info level post-transaction |
| S5 | Revoke action has no structured log | Task 1 Service step 6 (revokeInvitation) | Added `invitation.revoked` structured log |
| S6 | Client auto-accept infinite retry footgun on 410 | Task 2 accept-invitation-body.tsx step 8 | Split terminal vs transient error codes; React 19 strict-mode effect guard; no retry button on terminal codes |
| S7 | sha256-prefix-8 email hash collision space too small for audit forensics | Task 1 MailService step 3 | Upgraded to sha256-prefix-16 across invitation-related logs |
| S8 | Duplicate-invite reissue wasn't explicit in response | Task 1 types CreateInvitationResponse + Service createInvitation | Added `reissued: true` optional flag |

### Deferred (Can Safely Defer) — 7 findings

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D-01-02-A | Per-email-target rate limit (targeted spam against one address across many orgs) | Low-probability at POC; per-org cap (M7) is the primary abuse control. Trigger: abuse report OR >5 orgs invite same email in <1h |
| D-01-02-B | Orphan invitation GC job | POC DB tolerates stale rows. Trigger: >1,000 stale rows OR GDPR RtBF request |
| D-01-02-C | Email delivery retry with DLQ | One-shot + `warning: 'mail-send-failed'` is adequate for POC. Trigger: Resend p95 success <95% over 7 days |
| D-01-02-D | Bounce webhook handling | Currently no bounce visibility. Trigger: Resend integration deepens OR list-hygiene matters |
| D-01-02-E | Invitation resend / reminder UI | Revoke + reissue is manual-enough. Trigger: post-POC UX review |
| D-01-02-F | Actual email-verification flow (magic-link or OTP verify endpoint, removing the dev bypass) | **Critical trigger: pre-public-deploy.** The dev bypass on M2 MUST not survive a production deploy. Carry as a blocker on Phase 4 (Coolify) go-live checklist. |
| D-01-02-G | Redis-backed preview-endpoint throttler | In-memory Map is fine for single-node POC. Trigger: public deploy OR multi-instance scale |

## 5. Audit & Compliance Readiness

**Evidence produced by this plan (post-fix):**
- Per-request structured logs with PII-safe email hashing: `invitation.accepted`, `invitation.revoked`, `invitation.limit_reached`, `invitation.expired_batch`, `invitation.blocked_unverified`, `mail.console_fallback`, `mail.send_failed`, `invitation.reissued`
- Response matrix in AC-4 is pinned so client ↔ server contract is reconstructable from this document during audit
- probe-auth ≥24 assertions covering every trust-boundary transition (compile-time InviteRole, runtime P13b/P16b/P18–P21, boot-time MAIL_FROM format + MAIL_DRIVER_OVERRIDE)

**Silent-failure prevention:**
- Optimistic-lock on accept (M5) eliminates the "two members silently created" class of race
- MAIL_DRIVER_OVERRIDE forced-to-console in probes (M10) eliminates "probe silently sends real emails"
- Subject CRLF strip (M3) eliminates "attacker silently gains Bcc on outbound mail"
- AbortSignal timeout (M1) eliminates "request silently hangs waiting for Resend"

**Post-incident reconstruction:**
- Every invitation state transition has a structured log event with organizationId + invitationId
- `invitation.accepted` contains acceptorEmailHash (sha256-prefix-16) → re-derivable from known-email input during forensic response
- probe-invites-{ts} slug prefix (S3) isolates probe test data → hermetic + audit-visible

**Ownership & accountability:**
- All deferred items (D-01-02-A through G) have explicit triggers. D-01-02-F is tagged as a **pre-public-deploy blocker** — must not survive to Phase 4 go-live.

**Would-fail-real-audit areas (all now closed by applied findings):**
- ❌ → ✅ No rate limit on invitation create (compromised-owner mass-mail vector) — M7
- ❌ → ✅ No email-verified gate on accept (identity-hijack vector) — M2
- ❌ → ✅ No header-injection sanitization (email-protocol exploit) — M3
- ❌ → ✅ Unbounded external-service fetch (resource-exhaustion DOS) — M1
- ❌ → ✅ Double-accept race (privilege assignment under concurrent load) — M5

## 6. Final Release Bar

**Must be true before this plan ships:**
1. All 10 must-have and 8 strongly-recommended upgrades applied (done by this audit).
2. `pnpm --filter api probe:auth` passes ≥24 assertions.
3. `pnpm --filter api probe:api` passes ≥42 assertions (no regression).
4. AC-10 UAT signed off by user.
5. Outstanding 01-01 prerequisites (uncommitted Tasks 2+3 + Phase 2 docs work splitting + 01-01 UAT) addressed before 01-02 APPLY — otherwise commit archaeology becomes untenable.

**Remaining risks if shipped as-is (post-fix):**
- **D-01-02-F is a time bomb.** The email-verified gate has a dev bypass. If Phase 4 (Coolify) ships to a real domain without wiring the actual verify-email flow, the gate is cosmetic. This MUST be tracked as a go-live blocker.
- **Single-node in-memory preview throttler (S2).** If the API horizontally scales (multi-instance), the rate limit is per-instance not per-service. Trigger D-01-02-G.
- **No bounce webhook handling (D-01-02-D).** Invalid email → Resend accepts → invite URL sits unused forever → no visibility. Acceptable for POC.

**Would I sign my name to this system post-fix?**
Yes — with the explicit caveat that D-01-02-F (real email-verification flow) is a Phase-4-blocker and must not be forgotten. Tagged accordingly in boundaries.

---

**Summary:** Applied **10 must-have** + **8 strongly-recommended** upgrades. Deferred **7 items** with explicit triggers (one tagged pre-public-deploy blocker).
**Plan status:** Updated. probe-auth target raised ≥11 → ≥24 assertions. API_ERROR_CODES tuple grew by 9 entries. 2 new AC (AC-11 cap + AC-12 pagination). Ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
