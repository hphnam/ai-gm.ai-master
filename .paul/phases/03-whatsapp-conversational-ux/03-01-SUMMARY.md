---
phase: 03-whatsapp-conversational-ux
plan: 01
subsystem: identity-binding
tags: [whatsapp, otp, invite, onboarding, infobip, prisma, nestjs, react, shadcn, react-query]

# Dependency graph
requires:
  - phase: 03-whatsapp-integration (v0.2)
    provides: Infobip adapter (HMAC-SHA256 sig guard, outbound REST sendText, console-mode driver override) + assertAuthEnv WhatsApp env block
  - phase: 06-multi-agent-chat-overhaul (v0.3 Phase 6)
    provides: ChatV2Service.sendMessage signature + ConversationService for the linked-state passthrough (kept on chat-v2 — D-06-04-A asymmetry closes in 03-02)
  - phase: 01-auth-organizations (v0.2)
    provides: User.phoneNumber unique + phoneVerifiedAt + OrganizationMember + maskPhone PII helper
provides:
  - WhatsappInvite + WhatsappOtpAttempt + WhatsappSession Prisma models (additive)
  - InviteService (CSPRNG Crockford codes, manager rate-limit, phone-cross-org guard, atomic redemption, lazy expiry, lifecycle audit logs)
  - WhatsappOtpService (sha256-hashed OTP, timing-safe verify, 3-attempt limit, 10-min TTL, 30s re-issuance debounce, in-memory rate-limit map with TTL sweep, send-failure observability)
  - WhatsappOnboardingService + pure state machine (unknown / otp_pending / linked_no_venue / linked transitions, audit-S1 input normalization, audit-S2 state-aware out-of-state replies)
  - REST surface POST/GET/DELETE /whatsapp/invites (manager+owner role-gated)
  - Manager UI on /settings/team — InviteWhatsappDialog (form → cross-org confirm → one-time code display) + WhatsappInviteList (pending + recently-transitioned + revoke)
  - probe-whatsapp-onboarding (65 sub-assertions, idempotent two-run, in-memory adapter capture + Logger spy)
affects: [03-02 conversation protocol, 03-03 recall tool, scheduler/notifications v0.4]

# Tech tracking
tech-stack:
  added: []  # No new runtime deps — leveraged existing Anthropic SDK / Prisma / NestJS / shadcn-ui
  patterns:
    - "Pure state machine + DB wrapper split: pure synchronous transition() + classifyInbound() in whatsapp-onboarding-state.ts; DB I/O isolated to whatsapp-onboarding.service.ts. Probe asserts the pure module directly without DB."
    - "Atomic linkage: markRedeemed conditional UPDATE + user upsert + organizationMember upsert + WhatsappSession create all inside a single Prisma $transaction. Race-loser graceful via redeem-count gate + P2002 catch on session create."
    - "Audit-added pre-switch error-code dispatch in mapApiError to handle codes added after orval regen without breaking type-narrowing on the existing typed switch."
    - "Three-stage Dialog flow (form → cross-org-confirm → code-display) via discriminated-union React state; one-time code display gated by aria-live polite + cleared on Dialog close."

key-files:
  created:
    - apps/api/prisma/migrations/20260503154500_whatsapp_invite_otp_session/migration.sql
    - apps/api/src/types/whatsapp-invite.ts
    - apps/api/src/modules/whatsapp/safe-equal.ts
    - apps/api/src/modules/whatsapp/invite.service.ts
    - apps/api/src/modules/whatsapp/whatsapp-otp.service.ts
    - apps/api/src/modules/whatsapp/invite.controller.ts
    - apps/api/src/modules/whatsapp/whatsapp-onboarding-state.ts
    - apps/api/src/modules/whatsapp/whatsapp-onboarding.service.ts
    - apps/api/scripts/probe-whatsapp-onboarding.ts
    - apps/web/src/app/settings/team/page.tsx
    - apps/web/src/components/whatsapp-invitations/whatsapp-invitations-body.tsx
    - apps/web/src/components/whatsapp-invitations/invite-whatsapp-dialog.tsx
    - apps/web/src/components/whatsapp-invitations/whatsapp-invite-list.tsx
    - apps/web/src/lib/hooks/use-whatsapp-invites.ts
  modified:
    - apps/api/prisma/schema.prisma (3 new models, FK relations on User + Organization)
    - apps/api/src/modules/whatsapp/whatsapp.service.ts (handleInbound onboarding gate + WhatsappSession-driven org binding)
    - apps/api/src/modules/whatsapp/whatsapp.module.ts (3 new providers + exports)
    - apps/api/src/modules/auth/assert-auth-env.ts (Infobip console-mode prod-fail backstop)
    - apps/api/package.json (probe:whatsapp-onboarding script)
    - apps/web/src/lib/map-api-error.ts (3 new audit-added error codes)

key-decisions:
  - "Plan-time probe path correction: scripts/ not probes/ (project convention)"
  - "Plan-time types path correction: apps/api/src/types/ not packages/types/src/ (single-package project)"
  - "Re-issuance guard + setInterval TTL sweep + send_failed handling co-located with OtpService in Task 1, not split into Task 2 (kept service self-contained — purely a structural simplification)"
  - "Web component dir: components/whatsapp-invitations/ mirroring existing components/invitations/ structure rather than plan's components/settings/"
  - "Skipped lib/api/whatsapp-invites.ts wrapper — apiFetch called directly from hooks file, matching existing use-invitations.ts convention"
  - "Substituted Dialog for AlertDialog in revoke-confirm (project's shadcn install lacks AlertDialog primitive)"
  - "Race-test assertion (V31) widened: assert exactly one User row created instead of asserting both runners report 'linked' — race-loser's nextStateKind varies (race_lost vs no_active_attempt) depending on whether their verifyOtp executed before or after the winner consumed the OTP attempt"

patterns-established:
  - "Audit-added PAUL discipline carried forward: pre-implementation greps for OrganizationMember + maskPhone shape (audit-S9); single-source PII redaction via maskPhone(); single-source timing-safe compare via safe-equal.ts"
  - "Console-mode adapter as the sole probe boundary — probe monkey-patches adapter.sendText for outbound capture + forced-failure injection; no probe-only env knobs leaked into production code paths"
  - "Lifecycle audit-trail discipline: 5 distinct events (created/redeemed/revoked/exhausted/expired_lazy) so SOC-2 reconstruction is grep-answerable per orgId"

# Metrics
duration: ~90min (Task 2 + Task 3 in this session; Task 1 shipped 4d211a5 prior session)
started: 2026-05-03T16:42:00Z (this session resume)
completed: 2026-05-03T17:30:00Z
---

# Phase 3 Plan 01: WhatsApp Identity Binding + Onboarding Flow Summary

**Manager-issued 24h codes + WhatsApp OTP verification + hybrid auto-pick welcome — closes the "stranger sends a message" story so 03-02 can layer conversation protocol on top of an authenticated session.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~90min APPLY (this session) + earlier Task 1 session |
| Tasks | 3 of 3 completed with atomic per-task commits |
| Files created | 14 |
| Files modified | 6 |
| Probe assertions | 65/65 first run, 65/65 second run (target ≥35) |
| Build | apps/api 173 files (was 171 baseline), apps/web Next.js 16 turbopack clean |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Manager generates invite from /settings/team | Pass | InviteService.create + InviteController POST /whatsapp/invites + InviteWhatsappDialog form. UI manual smoke deferred. |
| AC-2: Manager UI shows code once + supports copy + revoke | Pass | code-display Dialog stage with aria-live polite + Copy button (clipboard fallback) + Done clears. Revoke via WhatsappInviteList confirmation Dialog. UI manual smoke deferred. |
| AC-3: Unknown number first-message replies with invite-code prompt | Pass | Probe W8 + W9 confirm loadState=unknown + REPLIES.unknown_prompt outbound. Existing recordAndCheckOnboardingReply rate-limit preserved. |
| AC-4: Valid invite code submission triggers WhatsApp OTP | Pass | Probe W10 (state→otp_pending) + W11 (verification-code outbound) + W12 (OTP plaintext extractable from outbound) + V40 (Infobip bare-digits format). |
| AC-5: Correct OTP entry links phone + welcomes user | Pass | Probe W18 (invite redeemed) + W19 (User created + verified) + W20 (membership) + W21 (session.org set) + W22 (welcome mentions venue). |
| AC-6: Hybrid welcome — single-venue auto, multi-venue picker | Structural Pass | composeWelcomeText pure-fn coverage V42 (single mentions name + org; multi numbered list with "2 venues"). Multi-venue runtime not exercised end-to-end via probe (single org per phone in seed); code path symmetric. |
| AC-7: Expired or revoked codes rejected with clear message | Pass | W25 revoked → "didn't match"; W27 expired-pending lazy-flipped to expired status + expired_lazy log emitted. |
| AC-8: OTP attempts limited + replays rejected | Pass | W14 exhausted reply ("Too many") after 3 wrongs; W15 invite status flipped to exhausted; W16 + W17 lifecycle logs. |
| AC-9: Cross-tenant safety — invite codes scoped to issuing org | Pass | InviteService cross-tenant boundary preserved (V33 cross-org create blocked unless force=true with audit log); InviteController revoke uses 404-not-403 on wrong org. |
| AC-10: Probe state-machine end-to-end + idempotent | Pass | 65/65 idempotent across two consecutive runs (target raised by audit ≥35; overshot for finer failure-localization, matching 06-02/06-03 precedent). |
| AC-11: Build clean + no cross-tenant scoping regressions | Pass | apps/api 173 files clean; apps/web Next.js 16 turbopack clean; tsc --noEmit clean. |
| AC-12: Timing-safe equality on code + OTP comparison | Pass | safe-equal.ts is single import surface; V39 grep asserts `from './safe-equal'` import in invite.service + otp.service + zero raw `===` on hashedOtp. |
| AC-13: Idempotent invite redemption under concurrent inbound | Pass | V31 race: invite redeemed exactly once + exactly one User created across two concurrent runTransition calls. |
| AC-14: OTP outbound delivery failure is observable + recoverable | Pass | V32: probe-forced sendText throw → otp.status='failed_send' + whatsapp_otp.send_failed log + fallback reply sent + rate-limit accounted. |
| AC-15: Cross-tenant phone-hijack guard + manager invite-spam rate-limit | Pass | V33 cross-org create returns 409 phone_linked_other_org; force=true emits cross_org_create audit log. V34 51st create in 24h returns 429 manager_invite_rate_limit. |
| AC-16: Invite lifecycle audit trail captured for SOC-2 | Pass | V38 grep-asserts emission of all 5 events: whatsapp_invite.created/redeemed/revoked/exhausted/expired_lazy. |

## Accomplishments

- **Identity-binding vertical slice live end-to-end**: a manager can issue a WhatsApp invite from `/settings/team`, a staff member from any phone can submit the code on WhatsApp, receive an OTP, verify, and land in a `WhatsappSession` row with `currentOrganizationId` populated — ready for 03-02 to read sticky venue + close D-06-04-A.
- **Audit-grade compliance built in from day one**: timing-safe equality on every secret comparison, lifecycle audit trail for SOC-2 reconstruction, atomic redemption proven race-safe (V31), cross-org phone hijack blocked at API surface (V33 + audit log on force override), manager invite-spam rate-limited per-actor not per-org (V34), in-memory rate-limit map TTL-swept on a 60s timer.
- **Probe overshoot from ≥35 → 65 assertions**: extra V31-V42 sub-splits give failure-localization signal (matches 06-02/06-03 pattern) — when this layer breaks in the future, the test diff will point at the specific contract that drifted.
- **Production safety backstop landed**: `INFOBIP_DRIVER_OVERRIDE=console` in production now fails the assertAuthEnv boot check (closes D-03-04-G; prevents silent OTP loss + locked-out staff).

## Task Commits

Each task committed atomically per project convention (Phase 6 + 5 + 1 precedent):

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Schema + invite/OTP services + manager API | `4d211a5` | feat | 3 Prisma models + safe-equal helper + InviteService (rate-limit, cross-org guard, lazy expiry, lifecycle logs) + WhatsappOtpService (timing-safe verify, debounce, TTL sweep, send-failure handling) + InviteController (manager+owner role-gated) + assertAuthEnv prod-fail backstop. 13 files, +1359 LoC. |
| Task 2: Onboarding state machine + handleInbound integration + probe | `73c690a` | feat | Pure state machine + DB-wrapper service + handleInbound onboarding gate + WhatsappSession-driven org binding + probe-whatsapp-onboarding (65 assertions). 6 files, +1376 LoC. |
| Task 3: Manager UI for WhatsApp invite issuance + revoke | `c581cd1` | feat | /settings/team page + WhatsappInvitationsBody + three-stage InviteWhatsappDialog + WhatsappInviteList with revoke confirmation + use-whatsapp-invites hooks + map-api-error extension. 6 files, +700 LoC. |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `apps/api/prisma/schema.prisma` | Modified | 3 new models (WhatsappInvite + WhatsappOtpAttempt + WhatsappSession), FK relations on User + Organization |
| `apps/api/prisma/migrations/20260503154500_whatsapp_invite_otp_session/migration.sql` | Created | Hand-authored additive migration; deployed to NeonDB this session |
| `apps/api/src/types/whatsapp-invite.ts` | Created | Constants (lengths, TTLs, regex), zod schemas, InvitePublic / CreateInviteInput / Response shapes, error code map |
| `apps/api/src/modules/whatsapp/safe-equal.ts` | Created | safeStringEqual + safeBufferEqual via crypto.timingSafeEqual — single import surface for secret comparison |
| `apps/api/src/modules/whatsapp/invite.service.ts` | Created | Code generation, atomic create with cross-org guard + manager rate-limit, lookup, atomic redemption, revoke, lazy expiry, list-for-org |
| `apps/api/src/modules/whatsapp/whatsapp-otp.service.ts` | Created | OTP generation + delivery + timing-safe verification + per-phone rate-limit + 30s debounce + TTL sweep + send-failure path |
| `apps/api/src/modules/whatsapp/invite.controller.ts` | Created | POST/GET/DELETE /whatsapp/invites — owner+manager role-gated |
| `apps/api/src/modules/whatsapp/whatsapp-onboarding-state.ts` | Created | Pure synchronous state machine (no DB) — OnboardingState union, classifyInbound with normalization, transition() with audit-S2 out-of-state messages, REPLIES single-source, composeWelcomeText pure-fn |
| `apps/api/src/modules/whatsapp/whatsapp-onboarding.service.ts` | Created | DB wrapper — loadState resolves linked / linked_no_venue / otp_pending / unknown; runTransition dispatches lookup_invite / verify_otp / select_venue side-effects; linkUserAndWelcome runs atomic Prisma transaction |
| `apps/api/src/modules/whatsapp/whatsapp.service.ts` | Modified | handleInbound calls onboarding.loadState before chat dispatch; non-linked phones run through state machine + return early; linked phones bind to WhatsappSession.currentOrganizationId (sticky venue) instead of picking oldest membership |
| `apps/api/src/modules/whatsapp/whatsapp.module.ts` | Modified | Registered InviteService + WhatsappOtpService + WhatsappOnboardingService as providers + exports |
| `apps/api/src/modules/auth/assert-auth-env.ts` | Modified | Production environment check rejects INFOBIP_DRIVER_OVERRIDE=console (closes D-03-04-G) |
| `apps/api/scripts/probe-whatsapp-onboarding.ts` | Created | 65 sub-assertions covering W1-W27 + V31-V42; in-memory adapter capture + Logger spy; idempotent two-run |
| `apps/api/package.json` | Modified | probe:whatsapp-onboarding script (PROBE_INFOBIP_STUB=1) |
| `apps/web/src/app/settings/team/page.tsx` | Created | Page entry + WhatsappInvitationsBody container |
| `apps/web/src/components/whatsapp-invitations/whatsapp-invitations-body.tsx` | Created | Loading skeleton, error gating (403 → friendly notice), dialog trigger + list |
| `apps/web/src/components/whatsapp-invitations/invite-whatsapp-dialog.tsx` | Created | Three-stage Dialog (form → cross-org-confirm → code-display) with shadcn primitives + react-hook-form + zodResolver + clipboard fallback |
| `apps/web/src/components/whatsapp-invitations/whatsapp-invite-list.tsx` | Created | Pending list + recently-transitioned details group + revoke confirmation Dialog |
| `apps/web/src/lib/hooks/use-whatsapp-invites.ts` | Created | useWhatsappInvites + useCreateWhatsappInvite + useRevokeWhatsappInvite hooks over apiFetch |
| `apps/web/src/lib/map-api-error.ts` | Modified | Pre-switch string match for phone_linked_other_org + manager_invite_rate_limit + invite_not_found |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Probe path: `apps/api/scripts/` not `apps/api/probes/` | Existing project convention (probe-section.ts, probe-tabular.ts, probe-chat-v2.ts all in scripts/) | Matches existing tooling; no new directory introduced |
| Types path: `apps/api/src/types/` not `packages/types/src/` | Single-package monorepo, not workspace-package | Co-located with consumers; no new package boundary needed |
| Re-issuance guard + TTL sweep + send_failed in Task 1 (not Task 2) | Service-self-contained — these belong with the OtpService, not split across tasks | Cleaner module boundary; Task 2 became purely state-machine + integration + probe |
| Web component dir: `components/whatsapp-invitations/` not `components/settings/` | Mirror of existing `components/invitations/` structure | Discoverability — sibling features grouped together |
| Skipped `lib/api/whatsapp-invites.ts` wrapper | apiFetch called directly from hooks (matches use-invitations.ts) | Less indirection; one file fewer to maintain |
| Substituted Dialog for AlertDialog in revoke-confirm | Project's shadcn install lacks AlertDialog primitive | Matches existing invitation-list.tsx revoke pattern |
| Pre-switch string check in mapApiError for new error codes | Orval-generated ApiErrorCode union is stale; preserves type-narrowing on the rest of the switch | Keeps existing typed switch intact while supporting Task 1's new codes |
| V31 race assertion: assert "exactly 1 user created" instead of "both runners report linked" | Race-loser's nextStateKind varies (race_lost vs no_active_attempt) depending on whether verifyOtp executed before or after the winner consumed the OTP attempt | Stable assertion that captures the actual race-safety property (atomic linkage) without coupling to internal control-flow timing |
| V32 sendText monkey-patch matches `/code is \d{6}/` not just "verification code" | The "Couldn't send the verification code" fallback reply also contains "verification code" — without the digit pattern, the fallback would also throw and crash the probe | Isolates forced-failure to the actual OTP send; failure-handling path completes its user-facing reply |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Path corrections | 2 | Probe + types both moved to project convention before any code written |
| Component-tree placement | 1 | components/whatsapp-invitations/ mirrors components/invitations/ |
| Wrapper-file skipped | 1 | lib/api/whatsapp-invites.ts unwritten — apiFetch called inline |
| UI-primitive substitution | 1 | Dialog for AlertDialog (primitive not installed) |
| Probe assertion shape correction | 2 | V31 race shape + V32 sendText regex (during APPLY iteration) |
| Type-system glue | 1 | Pre-switch string match in mapApiError for stale orval union |

**Total impact:** Project-convention alignment + APPLY-time iteration on probe assertions. No scope creep. No security/correctness compromises.

### Auto-fixed Issues

**1. [Probe] V27 invalid Crockford code**
- **Found during:** Task 2.7 first probe run
- **Issue:** Probe seeded an expired invite with code `EXPIR4DD` (contains 'I'), which classifyInbound rejects as ambiguous_text — never reaches the lazy-expiry path
- **Fix:** Code changed to `EXPR234D` (Crockford-base32-valid: no I/L/O/U/0/1)
- **Files:** apps/api/scripts/probe-whatsapp-onboarding.ts
- **Verification:** W27 expired_invite_lazy_flipped + lifecycle_log_expired_lazy both pass on re-run
- **Commit:** `73c690a` (Task 2)

**2. [Probe] V31 race assertion overspecified**
- **Found during:** Task 2.7 first probe run
- **Issue:** Asserted both Promise.all runners returned `linked` or `linked_no_venue`. Race-loser's verifyOtp can hit `no_active_attempt` (winner consumed the OTP attempt before loser's findFirst executed), yielding nextStateKind='unknown'
- **Fix:** Replaced with stable race-safety assertion — exactly one User row exists for the racing phone. Also kept the existing "invite redeemed once" assertion. The actual race-safety property is atomic linkage, which this captures cleanly
- **Files:** apps/api/scripts/probe-whatsapp-onboarding.ts
- **Verification:** V31.race_only_one_redeemed + V31.race_one_user_created both pass
- **Commit:** `73c690a` (Task 2)

**3. [Probe] V32 forced-failure regex too broad**
- **Found during:** Task 2.7 second probe run
- **Issue:** `forceSendThrow && body.includes('verification code')` also matched the user-facing fallback reply `"Couldn't send the verification code right now…"` — the failure-handling reply re-threw and crashed the probe
- **Fix:** Tightened to `/code is \d{6}/` regex which only matches the actual OTP delivery body
- **Files:** apps/api/scripts/probe-whatsapp-onboarding.ts
- **Verification:** V32.otp_attempt_failed_send_status + V32.send_failed_log both pass
- **Commit:** `73c690a` (Task 2)

**4. [Web TypeCheck] Stale orval ApiErrorCode union**
- **Found during:** Task 3.7 first web build
- **Issue:** Orval-generated ApiErrorResponseDtoError union doesn't include phone_linked_other_org / manager_invite_rate_limit (Task 1's controller landed after the last orval regen). switch-case on err.code rejected the new strings
- **Fix:** Pre-switch string-cast match in mapApiError (and in the dialog's cross-org branch) lets new codes route to user-friendly text without breaking the existing typed switch
- **Files:** apps/web/src/lib/map-api-error.ts; apps/web/src/components/whatsapp-invitations/invite-whatsapp-dialog.tsx
- **Verification:** Next.js 16 turbopack build clean
- **Commit:** `c581cd1` (Task 3)

### Deferred Items

All registered with concrete revisit triggers (audit-S10 carry-forward):

| ID | Item | Trigger |
|----|------|---------|
| D-03-01-A | Cluster-aware OTP + manager-invite rate-limit (Redis-backed) | First multi-instance API deployment OR observed bypass via instance-affinity |
| D-03-01-B | Email/SMS delivery of invite codes (replace operator copy-paste) | Operator copy-paste friction feedback OR partner integration requirement |
| D-03-01-C | libphonenumber-js validation (replace E164_PHONE_REGEX) | First user-reported phone-format-rejection on a valid international number |
| D-03-01-D | Tap-to-WhatsApp deep-link with embedded code | Mobile-onboarding UX project OR 10+ "easier link" requests |
| D-03-01-E | GDPR phone-hashing — replace WhatsappSession.phoneNumber plaintext PK with hashed PK + encrypted E.164 column | Project-wide privacy hardening OR customer compliance review |
| D-03-01-F | Per-phone concurrent-inbound mutex (true serialization) | First production race-induced data inconsistency in WhatsApp inbound (also closes D-03-03-G from v0.2) |
| D-03-01-G | Background cleanup cron for expired invites + verified/exhausted/failed_send OTPs | Row count > 10K in WhatsappOtpAttempt or WhatsappInvite OR weekly cron added |
| D-03-01-H | Message i18n for WhatsApp outbound copy | First non-English customer onboarding OR project-wide i18n |
| D-03-01-I | OTP fallback to SMS via Infobip 2FA on WhatsApp delivery failure | UAT shows ≥10% of users fail to receive WhatsApp OTP within 60s |
| D-03-01-J | Invite reusability for revoked-then-reissued staff | Operator feedback shows clunky "issue → revoke → re-issue" pattern |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Migration not yet deployed to NeonDB at start of session (carry-forward checkpoint from Task 1) | User-authorised `prisma migrate deploy` against NeonDB during APPLY checkpoint; migration applied clean before probe execution |
| Probe stalls on first run with three failures (W27 / V31 / V32) | Diagnosed in-place: code char excluded by Crockford regex, race assertion overspecified, sendText regex too broad. All three patched in the same task; second run + final run both 65/65 |
| Web build fails type-check on stale orval ApiErrorCode union | Pre-switch string match in mapApiError + cast in dialog. No regen of orval needed — stale union is a wider concern (already noted in cmem 5226 from earlier session) |

## Next Phase Readiness

**Ready:**
- `WhatsappSession` row with `userId + currentOrganizationId` is the bridge Plan 03-02 needs to layer the conversation protocol on top — sticky venue is already populated by single-venue auto-pick + multi-venue picker.
- The handleInbound integration moves linked phones into the existing ChatV2Service path bound by `WhatsappSession.currentOrganizationId` (not the historical "oldest membership" pick) — the routing flip in 03-02 just needs to swap the consumer to chat-v1 ChatService (closes D-06-04-A asymmetry).
- Probe coverage establishes the regression net for any 03-02 / 03-03 changes — adding slash-commands won't regress the unverified-state replies.
- All audit-added compliance work (timing-safe equality, lifecycle audit, cross-org guard, manager rate-limit, TTL sweep) is grep-verifiable for the next audit pass.

**Concerns:**
- D-06-04-A (WhatsApp consumer asymmetry) still open for one more plan — linked phones still hit ChatV2Service. This is intentional per plan's scope-limit but should not extend further. 03-02 must close it.
- Manual UAT against the Infobip Portal trial sender is outstanding — the probe operates entirely in console-mode; real-world OTP delivery (and the SOC-2-relevant claim that staff actually receive verification codes) is unverified until the operator UAT runs.
- Manager UI manual smoke is outstanding — dialog flow is type-correct + builds clean, but interactive verification (form errors, copy-button toast, revoke confirmation) hasn't been run in the dev server.
- Synthetic User email pattern `wa+<digits>@whatsapp.local` is permanent for invite-issued users — they can edit it later in the team page (not yet shipped). For now, those users may not be able to log in via email/password until they update it.

**Blockers:** None for Plan 03-02. Manual UATs (Infobip + UI smoke) are non-blocking for plan-completion but should run before phase-transition.

---
*Phase: 03-whatsapp-conversational-ux, Plan: 01*
*Completed: 2026-05-03*
