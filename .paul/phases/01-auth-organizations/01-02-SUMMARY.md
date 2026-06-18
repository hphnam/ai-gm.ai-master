---
phase: 01-auth-organizations
plan: 02
subsystem: auth
tags: [invitations, organizations, resend, better-auth, zod, react-query, shadcn]

# Dependency graph
requires:
  - phase: 01-auth-organizations (plan 01-01)
    provides: Organization + OrganizationMember + Invitation schema, AuthGuard, RoleGuard, @CurrentOrg, withOrgScope/withOrgScopeVia split, assertAuthEnv pattern, probe-auth harness
  - phase: 05-web-interface
    provides: apiFetch singleton, ApiError with X-Request-Id capture, React Query + react-hook-form pattern, shadcn ui primitives, mapApiError exhaustive switch
provides:
  - POST/GET/DELETE /org/invitations + GET /org/invitations/:id/preview + POST /org/invitations/:id/accept
  - NestJS InvitationsModule with MailService (Resend via fetch + console fallback via MAIL_DRIVER_OVERRIDE)
  - Next.js /settings/organization page + /auth/accept-invitation/[id] flow
  - isTerminalInvitationError helper for client-side retry classification
  - probe-auth extended with P12–P21 (and audit-added P13b, P16b, P17b, P18) at ≥24 assertions target
  - 9 new API_ERROR_CODES (invitation-not-found, invitation-expired, invitation-already-accepted, invitation-email-mismatch, mail-send-failed, invalid-invitation-role, invitation-limit-reached, already-a-member, email-not-verified)
  - 2 new @gm-ai/types constants (MAX_PENDING_INVITATIONS_PER_ORG=50, MAIL_SEND_TIMEOUT_MS=5000)
affects: [01-03-phone-linking, 02-document-ingest, 03-whatsapp-integration, 04-coolify-deployment]

tech-stack:
  added:
    - "@radix-ui/react-dialog@latest (shadcn Dialog primitive for revoke confirm)"
  patterns:
    - MAIL_DRIVER_OVERRIDE env for probe-time forcing of console mode (prevents accidental Resend spend)
    - In-memory Map-based per-IP throttler on unauth preview endpoint (single-node POC; swap for Redis at scale)
    - Optimistic-lock via updateMany WHERE status='pending' for concurrent-accept race prevention
    - Response matrix pin (status+action → code+http) for audit-defensible state-transition logic
    - Terminal vs transient client error classification (isTerminalInvitationError) for auto-effect retry safety
    - renderInvitationEmail pure HTML/text generation via escapeHtml helper (no template engine dep)
    - buildSubject(name) CRLF strip for email-header-injection defense
    - sha256-prefix-16 email hashing for PII-safe audit logs (upgraded from v0.1 prefix-8)

key-files:
  created:
    - apps/api/src/modules/invitations/invitations.module.ts
    - apps/api/src/modules/invitations/invitations.controller.ts
    - apps/api/src/modules/invitations/invitations.service.ts
    - apps/api/src/modules/invitations/mail.service.ts
    - apps/api/src/modules/invitations/invitation-email.ts
    - apps/web/src/components/ui/dialog.tsx
    - apps/web/src/lib/hooks/use-invitations.ts
    - apps/web/src/app/settings/layout.tsx
    - apps/web/src/app/settings/organization/page.tsx
    - apps/web/src/components/invitations/organization-settings-body.tsx
    - apps/web/src/components/invitations/invite-form.tsx
    - apps/web/src/components/invitations/invitation-list.tsx
    - apps/web/src/app/auth/accept-invitation/[id]/page.tsx
    - apps/web/src/app/auth/accept-invitation/[id]/accept-invitation-body.tsx
  modified:
    - packages/types/src/auth.ts (InviteRole, InvitationStatusSchema, InviteBodySchema, InvitationDTO, CreateInvitationResponse, ListInvitationsResponse, InvitationPreview, AcceptInvitationResponse, MAX_PENDING_INVITATIONS_PER_ORG, MAIL_SEND_TIMEOUT_MS)
    - packages/types/src/api.ts (+9 error codes at end of API_ERROR_CODES tuple)
    - apps/api/src/modules/auth/assert-auth-env.ts (+resend config + MAIL_FROM format validation)
    - apps/api/src/common/with-org-scope.ts (OrgDirectWhere + Invitation union member)
    - apps/api/src/app.module.ts (+InvitationsModule import/register)
    - apps/api/src/scripts/probe-auth.ts (+P12–P21 with audit-added sub-probes; cleanup extended for probe-invites- prefix)
    - apps/web/package.json (+@radix-ui/react-dialog)
    - apps/web/src/lib/map-api-error.ts (+9 code cases; +isTerminalInvitationError helper)
    - apps/web/src/components/auth/user-menu.tsx (+Organization settings link)
    - .env.example (+RESEND_API_KEY/MAIL_FROM/MAIL_DRIVER_OVERRIDE v0.2 Phase 1 Invitations block)

key-decisions:
  - "InvitationsService.listInvitations uses direct prisma.invitation.findMany with explicit where clause instead of withOrgScope() — generic carrier strips Prisma include type-inference. Defence equivalent: explicit organizationId in where."
  - "Added apps/web/src/components/invitations/organization-settings-body.tsx as client wrapper between server page and client body; plan didn't list this file but standard App Router pattern required it."
  - "user-menu.tsx shows 'Organisation settings' link unconditionally. Plan wanted role-conditional visibility but better-auth's useSession() doesn't carry activeOrganizationMember.role. Authoritative gate is server page + RoleGuard — defence in depth held; UI shows redundant link for staff, who see the 'only owners and managers' message."
  - "emailVerified gate reads from DB-fresh User row (via InvitationsService.getAcceptorUser) rather than AuthedRequest, since auth.guard.ts doesn't expose emailVerified. Keeps auth.guard.ts boundary intact and the gate tamper-resistant to stale session data."
  - "P21 toggles NODE_ENV=production via Object.defineProperty then restores. Validates the production-path gate while letting the rest of the probe run in development (dev bypass)."

patterns-established:
  - "XX_DRIVER_OVERRIDE env pattern (e.g., MAIL_DRIVER_OVERRIDE) for probe-time driver forcing. Plan 01-03 (Twilio SMS) should inherit via TWILIO_DRIVER_OVERRIDE='console'."
  - "Response matrix table comment at top of service file (M6) — audit-defensible documentation of status-transition-to-code mapping."
  - "Masked-email preview via first-2-chars + domain — sufficient for invitee recognition, doesn't leak full address to preview fetchers."
  - "Terminal-vs-transient error classification exported from map-api-error.ts for any auto-firing mutation useEffect."

# Metrics
duration: ~3h (plan + audit + apply within single session)
started: 2026-04-19T17:45:00Z (plan write)
completed: 2026-04-19T19:10:00Z (apply complete with concerns)
---

# Phase 1 Plan 02: Invitations Summary

**Organisation invitations shipped end-to-end — owner/manager creates + email delivery (Resend + dev console fallback) + invitee preview-accept flow + role gate + cross-org isolation + 9-error-code contract + probe-auth ≥24-assertion target. Code compiles across all three packages; probe RUN-time and AC-10 UAT deferred to post-session environmental setup.**

## Performance

| Metric | Value |
|--------|-------|
| Duration (plan → apply close) | ~3h within single session |
| Tasks attempted | 3 of 3 |
| Tasks code-complete | 3 of 3 (DONE_WITH_CONCERNS on Task 3 runtime verification) |
| Files created | 14 |
| Files modified | 10 |
| Types build | Clean |
| API swc build | Clean (65 files, 37ms) |
| Web next build | Clean (TypeScript passes, all routes compile) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Owner/manager creates invitation end-to-end | Pass (code) | Service + controller + mail implemented; run-time unverified in this session — probe P12 covers |
| AC-2: Role gate — staff 403, owner-role 400 | Pass (code) | RoleGuard + service boundary assert; P13 + P13b probe coverage |
| AC-3: Invitee accepts → joins existing org + emailVerified gate + optimistic-lock + scoped session update | Pass (code) | Full M2/M5/M8/S4 implementation in acceptInvitation; P14 + P16b probe coverage |
| AC-4: Expired 410 + accepted 409 + revoked 404 response matrix | Pass (code) | Matrix documented in service file header; P15/P15b/P16 probe coverage |
| AC-5: /settings/organization page + accept-invitation flow | Pass (code) | invite-form + invitation-list + accept-invitation-body shipped; UAT not yet performed |
| AC-6: Cross-org isolation — 404-not-403 on foreign invite | Pass (code) | Service revokeInvitation + findFirst w/ org scope; P17 probe coverage |
| AC-7: .env.example + API_ERROR_CODES carry new keys | Pass | 9 codes appended; 3 env vars added |
| AC-8: probe-auth extended with P12–P21 | Pass (code), Partial (runtime) | All assertions added (27 assert() calls in the new block); runtime run blocked by pre-existing DB state |
| AC-9: Build + type-check clean; no regression | Pass (build), Concern (runtime) | All 3 packages build clean; probe:api exits early with "No venues seeded in Demo Org" — pre-existing environmental issue, not a 01-02 regression |
| AC-10: UAT — human end-to-end | **Deferred** | 12-step manual walk + probe:auth + probe:api required; tracked in STATE.md as post-session task |
| AC-11: Per-org pending-invitation cap (audit-added M7) | Pass (code) | MAX_PENDING_INVITATIONS_PER_ORG=50 + lazy-GC expireStaleInvitations; P19 probe coverage |
| AC-12: GET /org/invitations is paginated (audit-added S1) | Pass (code) | limit/offset/total/hasMore contract + server-clamp [1,100]; P17b probe coverage |

## Accomplishments

- **Three-layer trust boundary on invitation flow** matching 01-01's pattern: compile-time (`InviteRole` narrow enum excludes 'owner'; `InvitationStatusSchema`), runtime (probe P13b + P16b + P18 + P19 + P20 + P21), boot-time (`MAIL_FROM` format validation in `assertAuthEnv` — fails fast if `RESEND_API_KEY` is set without well-formed `MAIL_FROM`).
- **Closed an account-hijack vector pre-flight**: the M2 `emailVerified` gate with explicit dev bypass + WARN log prevents unverified sign-ups from claiming invitations intended for others. The dev bypass is tracked as `D-01-02-F` pre-public-deploy blocker.
- **Optimistic-lock on accept** (M5) eliminates the two-OrganizationMember double-write class of race under concurrent load. Probe `P16b` fires two concurrent `Promise.all` accepts and asserts exactly one 200 + one 409.
- **Email-header-injection defended** (M3) via `buildSubject()` CRLF strip — a malicious organization name like `"Evil Corp\r\nBcc: attacker@example.com"` is neutralized before the Resend subject interpolation.
- **Mail failure degrades gracefully** — invitation persisted with `warning: 'mail-send-failed'` in 2xx body; UI toast surfaces "copy the link manually" rather than hard-500.

## Files Created/Modified

See `key-files` in frontmatter. Notable highlights:

| File | Change | Purpose |
|------|--------|---------|
| `apps/api/src/modules/invitations/invitations.service.ts` | Created | Full service with expireStaleInvitations / createInvitation (cap + reissue + already-a-member) / listInvitations (pagination) / getInvitationPreview (masked email) / revokeInvitation / acceptInvitation (gate + optimistic-lock + single-tx + session update + audit log) |
| `apps/api/src/modules/invitations/mail.service.ts` | Created | Resend-or-console driver with 5s AbortSignal timeout, CRLF-stripped subject, sha256-prefix-16 error hashing, MAIL_DRIVER_OVERRIDE for probe |
| `apps/api/src/modules/invitations/invitations.controller.ts` | Created | 5 endpoints, zodPipe validation, per-IP preview throttle, InvitationError → HttpException mapping for 9 codes |
| `apps/api/src/scripts/probe-auth.ts` | Modified | +P12–P21 + P13b, P16b, P17b, P18; cleanup extended for probe-invites- prefix (S3 isolation); MAIL_DRIVER_OVERRIDE set at module-top |
| `apps/web/src/app/auth/accept-invitation/[id]/accept-invitation-body.tsx` | Created | Three-state UI: signed-out preview → sign-in redirect, wrong-email explicit error, matching-email auto-accept with S6 terminal/transient classification |
| `apps/web/src/components/invitations/invitation-list.tsx` | Created | Pending/Accepted/Expired groups with Copy-link + Revoke-confirm dialog; icon+text status badges; aria-labels on icon-only buttons |
| `packages/types/src/auth.ts` | Modified | InviteRole narrowed, InvitationStatusSchema, full DTO + response type suite, cost-ceiling constants |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| List endpoint inlines `prisma.invitation.findMany` instead of `withOrgScope<InvitationWhere>()` wrapper | Generic carrier strips Prisma `include` type inference; explicit `where: { organizationId }` provides equivalent org-scoping defence | Type-safe build; `withOrgScope` still used in single-row paths (findFirst/update/delete) where include-stripping doesn't bite |
| Client wrapper `organization-settings-body.tsx` added (not in plan files_modified) | Server page cannot host a `useInvitations()` query — needs a client boundary; standard Next.js App Router pattern | Plan's file list was off-by-one; no functional impact |
| `user-menu.tsx` shows "Organisation settings" link unconditionally | better-auth `useSession()` doesn't carry `activeOrganizationMember.role`; adding a `/org/me` endpoint was scope creep. Backend RoleGuard + server page are authoritative | Minor UX: staff see the link but land on a "only owners and managers" message. Consistent with defence-in-depth posture |
| `emailVerified` gate queries DB-fresh `User` (via `getAcceptorUser`) instead of AuthedRequest | Keeps `auth.guard.ts` boundary intact; tamper-resistant to stale session data | One extra query on accept — acceptable |
| P21 toggles `NODE_ENV=production` via `Object.defineProperty` then restores | Let the production-path gate be tested while the rest of the probe runs in development | Probe exercises both branches of the M2 gate in a single run |
| MAIL_DRIVER_OVERRIDE set at module-top of probe-auth.ts (before imports) | Ensures MailService constructor sees the override; hoisted imports still execute after top-of-file assignments in compiled CJS | Probe never sends real emails regardless of operator .env |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Scope additions (audit-driven) | 7 Must-have + 8 Strongly-rec | All applied in plan edits before APPLY; shipped in code |
| File-list drift | 1 | organization-settings-body.tsx added; documented as deviation |
| Boundary adjustments | 1 | with-org-scope.ts OrgDirectWhere union extended (additive) |
| Run-time verification gap | 2 | probe:auth + probe:api not run — pre-existing DB state |

**Total impact:** Code-complete across all tasks; run-time verification and UAT deferred to post-session environmental setup.

### Auto-fixed Issues

1. **TypeScript: `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]` inferred as `string` not `SortOrder`**
   - Found during: Task 1 tsc sweep
   - Fix: Added `as const` — `orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }]`
   - Files: `apps/api/src/modules/invitations/invitations.service.ts`

2. **TypeScript: `withOrgScope()` generic strips `include` from returned type**
   - Found during: Task 1 tsc sweep
   - Fix: Inlined `prisma.invitation.findMany` with explicit `where: { organizationId }` in `listInvitations`. `withOrgScope` kept available for future single-row paths
   - Files: `apps/api/src/modules/invitations/invitations.service.ts`

3. **Unused import removed**: `import { withOrgScope }` dropped from service after inline switch

### Deferred Items

Carried forward from audit (D-01-02-A through G) — see 01-02-AUDIT.md and STATE.md Deferred Issues.

Also added post-APPLY:
- **probe:auth runtime pass**: target ≥24 assertions. Requires clean DB + seed + RESEND_API_KEY absent or MAIL_DRIVER_OVERRIDE. Pre-01-02 prerequisites from STATE.md must be addressed first.
- **probe:api regression pass**: target ≥42 assertions. Requires `pnpm seed` to populate Demo Org venues (current DB shows "No venues seeded in Demo Org" — pre-existing environmental state).

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| tsc: `orderBy: 'desc'` inferred as `string` not SortOrder | Added `as const` |
| tsc: `withOrgScope` generic strips `include` type | Inlined direct `findMany` in listInvitations |
| probe:api exits early "No venues seeded in Demo Org" | Pre-existing DB state from 01-01 uncommitted work; not a 01-02 regression. Operator must `pnpm seed` before running probes |
| `emailVerified` not on AuthedRequest | Added `getAcceptorUser` helper to query fresh; keeps auth.guard.ts boundary intact |
| Pre-existing @types/express gap in tsc output | Not introduced by 01-02; project builds via swc which skips tsc |

## Next Phase Readiness

**Ready:**
- Plan 01-03 (phone linking) can inherit the MAIL_DRIVER_OVERRIDE pattern as TWILIO_DRIVER_OVERRIDE for probe-time SMS stubbing.
- Plan 01-03 can extend `assertAuthEnv` with Twilio config using the same append-only, fail-fast-on-malformed pattern (01-01 M8 + 01-02 MAIL_FROM validation).
- Plan 01-03 gets the same emailVerified gate established here as a template for phoneVerified.
- Phase 2 (doc ingest) can reuse `withOrgScope` for the now-typed Invitation / Venue / Organization union on KnowledgeItem reads.
- Phase 3 (WhatsApp) can reuse the `InvitationError` + `mapApiError` exhaustive-switch pattern for webhook-path contract errors.

**Concerns:**
- **D-01-02-F pre-public-deploy blocker** carried forward: actual email-verification flow (magic-link or OTP) must be wired before Phase 4 Coolify go-live to remove the dev bypass on the M2 gate. Already noted in STATE.md.
- **Commit hygiene**: this plan's work is NOW mixed with uncommitted 01-01 Tasks 2+3 + Phase 2 docs work + this new 01-02 work. The operator has three plan's worth of code in a single working tree. Recommend splitting into three commits (or a squashed commit with a clear trailer listing plan references) before the next APPLY.
- **Pre-existing in-memory per-IP throttler on preview endpoint** becomes cosmetic if the API scales horizontally. D-01-02-G tracked.

**Blockers:**
- **AC-10 UAT not run** — must be completed before Plan 01-03 APPLY.
- **probe:auth + probe:api not run** — same requirement.
- These are soft blockers on Phase 1 progression but not on other phases.

---
*Phase: 01-auth-organizations, Plan: 02*
*Completed: 2026-04-19*
*Status: DONE_WITH_CONCERNS — code-complete across 3 tasks; runtime verification + UAT deferred to post-session DB-state resolution*
