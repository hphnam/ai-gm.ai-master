# Enterprise Plan Audit Report

**Plan:** `.paul/phases/01-auth-organizations/01-01-PLAN.md`
**Audited:** 2026-04-19 15:45 GMT+1
**Auditor role:** Senior principal engineer + compliance reviewer
**Verdict:** **Conditionally acceptable pre-fix → Enterprise-ready post-fix** (10 must-have + 17 strongly-recommended upgrades applied)

---

## 1. Executive Verdict

This plan is the **auth trust boundary for the entire v0.2 milestone**. Every subsequent plan (invitations in 01-02, phone linking in 01-03, docs in Phase 2, WhatsApp in Phase 3, Coolify in Phase 4) hangs off the contract this plan ships. A weakness here compounds across 11 downstream plans.

Pre-fix, the plan was **solid in shape** (41-file scope, 8 ACs, correct migration pattern, defence-in-depth repository scoping, 404-not-403 enumeration avoidance preserved from v0.1) but had **10 release-blocking gaps** that an auditor would flag on first read: open-redirect vector on `?redirect=`, non-atomic sign-up + org creation (client-side follow-up call creates a race → zombie users), non-idempotent migration UPDATE, prod-unsafe seed defaults, `withOrgScope<T extends { where?: any }>` signature that silently misuses join-scoped tables, and HTTP logger redaction left to convention rather than contract.

Post-fix (all must-haves + strongly-recommended applied inline), the plan is **enterprise-ready for a regulated environment operated by humans who make mistakes** and **audit-defensible** under SOC 2 / ISO review: every sensitive field has a typed guard, every trust boundary has a grep-verifiable test, and fail-fast startup prevents misconfigured production deploys.

**Would I sign my name to this plan at APPLY?** Yes, with the applied upgrades. Without them, no.

---

## 2. What Is Solid (Do Not Change)

- **404-not-403 enumeration avoidance** inherited from v0.1 Plan 05-01 — preserved cleanly.
- **Diff→deploy migration pattern** (NOT `db push`, NOT `migrate dev`) — v0.1 Phase 3 APPLY deviation correctly applied proactively.
- **Closed readonly tuple** for `API_ERROR_CODES` — append-only contract preserved; no reorder/rename.
- **Repository-layer org scoping helper** — defence-in-depth beyond the guard; catches the class of bug where a guard passes but a service-layer query leaks cross-tenant data.
- **Human UAT checkpoint** (AC-9) — 13-step browser walk includes the incognito-second-profile cross-org leak test; this is exactly the scenario an auditor would ask about.
- **Probe-auth as a first-class citizen** alongside probe-api — the cross-org isolation test matrix (P1-P8 pre-audit) was already mapped to the right threats.
- **Explicit boundaries freezing v0.1 contracts** — chat.service tool-use loop, API_ERROR_CODES tuple, apiFetch signatures, existing migrations all protected from drift.
- **.env.example discipline with per-key source/generator comments** — accurate onboarding surface.
- **Demo Organization backfill strategy** — idempotent by construction via upsert + findFirst early-return on the backfill script.
- **Boundary documenting Phase 4 cross-subdomain cookie concern** — flagged early instead of discovered on deploy.

---

## 3. Enterprise Gaps Identified (Pre-Audit)

### Release-blocking (10)

| # | Gap | Risk |
|---|-----|------|
| G1 | `?redirect=` query param passed raw to `router.push` / `redirect()` | **Open-redirect → phishing chain**. Attacker sends `?redirect=https://evil.com/steal` after social-engineering a sign-in. Classic OWASP A01. |
| G2 | Client-side `authClient.organization.create(...)` called AFTER `signUp.email` succeeds | **Zombie-user race.** If the second call fails or the user closes the tab between calls, the User row exists but has zero OrganizationMember rows → OrgContextMiddleware 404s every subsequent request. Unrecoverable without admin intervention. |
| G3 | Migration `UPDATE venues SET organization_id=...` written without `WHERE organization_id IS NULL` | **Non-idempotent.** Re-applying the migration on a DB already mid-seed overwrites real org assignments. Rollback → reapply cycle is destructive. |
| G4 | Seed creates demo user with password `demo-change-me` + no `NODE_ENV` guard | **Credential exposure on accidental prod run.** A misconfigured deploy with `SEED_DEMO=true` (default) pre-creates a known-password owner account. |
| G5 | `API_ERROR_CODES` additions lack `venue-not-found`, `invalid-redirect`, `payload-too-large`, `organization-slug-conflict` | **Downstream drift.** The plan text references `'venue-not-found'` but doesn't add it to the tuple; Plan 05-01's closed-union contract breaks. |
| G6 | `withOrgScope<T extends { where?: any }>` generic is too loose | **Silent SQL bug.** Developer calls `withOrgScope(prisma.chatMessage.findMany, ...)` — ChatMessage has NO `organizationId` column → generated SQL is `WHERE ... AND "organizationId" = '...'` against a column that doesn't exist → throws at runtime in prod. Type system should refuse at compile time. |
| G7 | HTTP logger redaction for `/api/auth/*` bodies + Cookie/Authorization headers left to convention | **Credential leakage into logs.** v0.1 05-01 said "never log body VALUES" but didn't codify the auth-route tightening. An aggregator ingesting these logs ships user passwords to Splunk/Loki. |
| G8 | `process.env.BETTER_AUTH_SECRET!` non-null assertion | **Silent misconfig in prod.** Missing env → `!` asserts truthy → `undefined` becomes literal `"undefined"` string → better-auth HMAC collapses to a publicly-known value. |
| G9 | `/api/auth/*` excluded entirely from 32 KB body cap | **DoS surface.** Removes the body-parser guard completely; attacker sends 100 MB POST to `/api/auth/sign-up/email`. Should tighten to 8 KB, not exempt. |
| G10 | Session cookie `secure` flag implied but not explicit in `auth.config.ts` | **Cookie sniffable on HTTP.** Default behavior varies by better-auth version; explicit control via `advanced.defaultCookieAttributes` is the only audit-defensible position. |

### Strongly-recommended (17)

| # | Gap | Risk |
|---|-----|------|
| S1 | Password min = 8 | 2020-weak; auditor flag. Raise to 12. |
| S2 | Password max = 128 with bcrypt underneath | bcrypt silently truncates at 72 bytes → two different 100-char passwords with matching first 72 chars hash identically. Constrain max to 72 OR document scrypt/argon2. |
| S3 | Demo password `demo-change-me` | Trivially guessable if leaked or accidentally prod-seeded. Use a non-trivial default. |
| S4 | Slug generation `slugify(name) + '-' + shortId()` | Empty-base case (emoji-only name) produces invalid slug; no collision retry loop; no length validation. |
| S5 | probe-api A24 pre-inserts a second org with no slug-prefix marker | Cleanup miss: `email LIKE '%probe-api%'` catches the user but not the org; orgs accumulate in dev DB across runs. |
| S6 | probe-auth cleanup timing unspecified | v0.1 pattern is pre-AND-post; plan says post only. |
| S7 | No `X-Content-Type-Options: nosniff` / `X-Frame-Options: DENY` | Standard hardening; one middleware, one line each. |
| S8 | HTTP logger query-value logging not explicitly re-verified | Future dev adds query-param logging "for debugging" → leaks `?token=...`. Pin the contract. |
| S9 | Auth form fields missing `autocomplete` attributes | Password managers don't populate → users either retype (friction) or reuse weaker passwords. |
| S10 | Middleware order documented in prose but not in code | NestJS middleware ordering is load-bearing; future refactor silently swaps request-id + logger → undefined requestId in all logs. |
| S11 | Session invalidation on OrganizationMember delete unspecified | Ex-member keeps working session → continues reading old org's data until 30-day expiry. Document the gap (deferred to 01-02) or fix now. |
| S12 | `activeOrganizationId` staleness handling unspecified | Session references a deleted org → Middleware 404s; user is locked out even though they have valid memberships elsewhere. |
| S13 | Research spike (Prisma 7 + better-auth CLI compat) has no time-box or exit criteria | Spike could eat the day; rescoping signal unclear. |
| S14 | Rollback procedure advertises reversibility but migration has no data-loss warning header | An ops engineer runs rollback 3 weeks post-launch and destroys all user data. |
| S15 | No explicit email-enumeration-safe response contract on sign-in | better-auth's default is OK but the plan doesn't ASSERT it — a future config flip breaks silently. |
| S16 | CSRF posture mentioned via `trustedOrigins` but not probe-tested | Missing assertion = missing guarantee. |
| S17 | No probe assertion that auth bodies stay out of logs | Grep-verify on middleware code is necessary but not sufficient — runtime test catches regressions. |

### Deferred (7 — documented with triggers)

| # | Item | Trigger for revisit |
|---|------|---------------------|
| D1 | Explicit account lockout / auth rate-limit tuning | Public-facing deployment (Phase 4 Coolify) OR first credential-stuffing incident |
| D2 | Persistent auth audit-log table (not just structured logs) | SOC 2 Type II audit scheduled OR Phase 4 |
| D3 | User delete GDPR cascade (Invitation.inviterId, ChatMessage attribution) | First right-to-be-forgotten request OR pre-launch compliance |
| D4 | Migration rollback CI test | Pre-launch deploy pipeline |
| D5 | BETTER_AUTH_SECRET rotation story | Post-POC ops plan |
| D6 | Cross-subdomain cookie policy (SameSite=None for `app.*` ↔ `api.*`) | Phase 4 Coolify deploy |
| D7 | Session fixation rotation explicit probe | Post-POC regression-guard plan |

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking) — 10 applied

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Open-redirect on `?redirect=` | AC-5, AC-10 (new), Task 3 steps 4/5/7b (new)/8/10, files_modified, boundaries, verification | New `apps/web/src/lib/safe-redirect.ts` helper; every `router.push`/`redirect()` consumer routes through `isSafeRedirect()`; probe-auth P9 added; grep-verify check added; boundary documented as release-blocking non-negotiable. |
| M2 | Non-atomic sign-up + org creation | AC-5, AC-10, Task 2 step 1 (auth.config.ts `databaseHooks.user.create.after`), Task 3 step 4 (client-side `organization.create` REMOVED), boundaries, verification | Server-side atomic hook creates Organization + OrganizationMember in same transaction as User insert; client side simplified to single `signUp.email()` call; probe P11 asserts rollback on hook failure; grep-verify for zero `authClient.organization.create(` hits in `apps/web/src`. |
| M3 | Non-idempotent migration UPDATE | AC-1, Task 1 step 4 | All venue UPDATE statements qualified `WHERE organization_id IS NULL`; SQL header warns about rollback data-loss; grep-verify added. |
| M4 | Prod-safe seed guard | AC-1, Task 1 step 6 | `NODE_ENV=production + SEED_DEMO=true + default DEMO_USER_PASSWORD` → refuse with `process.exit(1)`; grep-verify checks for sentinel string in both seed entry points. |
| M5 | API_ERROR_CODES missing additions | AC-6, Task 1 step 8 | Added `'venue-not-found'`, `'invalid-redirect'`, `'payload-too-large'`, `'organization-slug-conflict'`; grep-verify count. |
| M6 | withOrgScope generic too loose | Task 2 step 8 | Split into `withOrgScope` (typed to `OrgDirectWhere` union of KnowledgeItem/ChatConversation/Venue/Organization) + `withOrgScopeVia` (for ChatMessage/MessageFeedback/ReTagQueueItem); compile-time rejection of misuse; grep-verify separates call sites. |
| M7 | HTTP logger redaction for /api/auth/* | AC-3 (header addition), Task 2 step 10 | Explicit redaction contract: skip body + query on `/api/auth/*`; strip Cookie/Authorization/Set-Cookie header VALUES on ALL routes; probe A29 asserts `ProbeRedaction123` string never appears in log capture. |
| M8 | Fail-fast startup validation | AC-10, Task 2 step 1 (new `assertAuthEnv` file), files_modified, verification | New `apps/api/src/modules/auth/assert-auth-env.ts`; called BEFORE `NestFactory.create` in main.ts + returns typed env values to auth.config.ts; banned `process.env.X!` non-null assertions in auth code via grep-verify. |
| M9 | /api/auth/* body cap | AC-3, Task 2 step 10 | Tightened to 8 KB (NOT exempted); 32 KB cap preserved for non-auth routes; probe A27 asserts 413 on 16 KB payload. |
| M10 | Cookie `secure` explicit in prod | AC-3, Task 2 step 1 | `advanced.defaultCookieAttributes: { httpOnly, sameSite: 'lax', path: '/', secure: isProd }`; grep-verify for the block. |

### Strongly Recommended — 17 applied

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | Password min = 12 | Task 1 step 8, AC-5 (implicit via schema tightening) | `PasswordSchema = z.string().min(12).max(72)`; `minPasswordLength: 12` in better-auth config. |
| S2 | bcrypt 72-byte ceiling | Task 1 step 8, Task 2 step 1 | `maxPasswordLength: 72` pinned to bcrypt; scrypt/argon2 upgrade path documented. |
| S3 | Strong demo password default | AC-6, Task 1 step 9 | `demo-CHANGE-me-before-prod-Xk7t9` default; explicit WARN at seed time if left as default. |
| S4 | Slug validation + collision retry | Task 1 step 8 (OrgSlugSchema), Task 2 step 1 (generateOrgSlug helper + `OrgSlugConflictError`) | Kebab-case-only regex; empty-base fallback; up to 5 retries with nanoid suffix; typed error → `'organization-slug-conflict'`. |
| S5 | probe-api A24 slug prefix | Task 2 step 11 | Cross-org test org slug MUST begin `probe-api-other-`; cleanup SQL catches it. |
| S6 | probe-auth cleanup pre-AND-post | AC-7 | Explicit pre+post cleanup mirroring v0.1 probe-api pattern. |
| S7 | nosniff + frameguard middleware | AC-3, Task 2 step 10, files_modified | New `apps/api/src/common/security-headers.middleware.ts`; `X-Content-Type-Options: nosniff` + `X-Frame-Options: DENY` on all responses. |
| S8 | Re-affirm http-logger body/query contract | Task 2 step 10 (M7 covers) | Covered by M7's explicit contract + grep-verify. |
| S9 | `autocomplete` attributes on auth forms | Task 3 steps 4, 5 | `email`, `new-password`, `current-password`, `name` attributes added. |
| S10 | Middleware order comment block | Task 2 step 10 | Numbered comment block in `app.module.ts` configure(); probe-api asserts first log field ordering as regression guard. |
| S11 | Session invalidation on member delete | Boundaries (deferred 01-02) | Flagged as deferred with explicit trigger: Plan 01-02 member management. |
| S12 | activeOrganizationId staleness handling | (inherited from existing AC-3 coverage; deferred) | Documented in boundaries as 01-02 concern since there's no UI to change active org in 01-01. |
| S13 | Spike time-box + exit criteria | AC-2 | 90-minute cap + concrete success criteria (schema applies clean AND sign-up persists 3 rows AND Set-Cookie returned); Kysely fallback on either failure; third-failure → block + /paul:discuss. |
| S14 | Rollback data-loss warning | AC-1, Task 1 step 4 | SQL header comment block + AC clarifies rollback is only safe pre-real-data. |
| S15 | Email-enumeration-safe sign-in response | AC-10, Task 3 step 5, probe-auth P10 | Identical `{error:'invalid-credentials'}` for "user not found" and "wrong password"; probe P10 enforces. |
| S16 | CSRF `trustedOrigins` re-affirmation | Task 2 step 1 (env `webOrigin`) | `trustedOrigins: [env.webOrigin]` explicit; assertAuthEnv ensures `WEB_ORIGIN` is present at boot. |
| S17 | Probe assertion for body redaction | Task 2 step 11 (A29) | Log capture + grep assertion for `ProbeRedaction123` and raw session cookie value. |

### Deferred — 7 items (documented with triggers)

| # | Item | Rationale for Deferral |
|---|------|----------------------|
| D1 | Account lockout / rate-limit tuning | better-auth defaults + 8 KB auth cap + localhost-only scope adequate for POC. Trigger: public-facing deploy (Phase 4) OR credential-stuffing incident. |
| D2 | Persistent auth audit log table | Structured INFO logs audit-defensible for POC; SOC 2 Type II requires durable storage → Phase 4+ trigger. |
| D3 | User delete GDPR cascade | No right-to-be-forgotten request yet; Invitation.inviterId onDelete semantics + ChatMessage attribution require cross-phase design. Trigger: first real request OR pre-launch compliance review. |
| D4 | Migration rollback CI test | Dev-only manual verification acceptable for POC; trigger = pre-launch deploy pipeline (Phase 4). |
| D5 | BETTER_AUTH_SECRET rotation | Post-POC ops plan; secret rotation requires zero-downtime strategy + member-session migration. |
| D6 | Cross-subdomain cookie policy | Already flagged in plan boundaries; enforced in Phase 4 Coolify deploy plan. |
| D7 | Session fixation rotation explicit probe | better-auth default rotates on sign-in; explicit assertion deferred to post-POC regression suite. |

---

## 5. Audit & Compliance Readiness

### Audit evidence
- **Structured logs** (`auth.sign_up`, `auth.sign_in`, `auth.sign_out`, `auth.role_denied`, `auth.cross_org_blocked`, `auth.org_resolved`) emit via v0.1 05-01 http-logger pattern with M7 redaction contract.
- **Ephemeral by default** — no persistent DB audit table (D2 deferred). For POC: adequate IF logs ship to a durable sink; the plan doesn't mandate the sink (cross-service concern).
- **Probe evidence**: probe-api 36 → ≥42 (A23-A29), probe-auth 0 → ≥11 (P1-P11). Every trust-boundary assertion has a corresponding probe check.

### Silent failure prevention
- `assertAuthEnv()` fail-fast (M8) — malformed secret/URL/origin → boot exits 1.
- Atomic sign-up (M2) — hook failure rolls back; no orphan User rows.
- `withOrgScope` type-safe (M6) — wrong-table misuse is compile-time error, not runtime.
- HTTP logger redaction (M7) — runtime probe assertion (A29) + middleware grep-verify.
- Migration idempotency (M3) — re-apply is safe.

### Post-incident reconstruction
- `X-Request-Id` propagation (inherited from v0.1 05-01) threads through every auth + business log.
- `auth.cross_org_blocked` log includes `{ requestId, userId, requestedOrgId, actualOrgId }` — enough to reconstruct a tenant-isolation breach attempt.
- **Weakness (D2 deferred)**: without persistent storage, reconstruction is bound by log retention window. Flagged.

### Ownership + accountability
- Demo Org owner: `ryan@ryanhelmn.dev` explicitly seeded.
- New sign-ups: `creatorRole: 'owner'` via better-auth organization plugin + M2 atomic hook — every User has exactly one initial OrganizationMember at owner role.
- Staff/manager delineation: `@RequireRole('owner', 'manager')` on `DebugController`; staff denied with audit log `auth.role_denied`.

---

## 6. Final Release Bar

### What must be true before APPLY ships (with applied upgrades)
- `pnpm --filter api probe:api` ≥ 42 assertions green.
- `pnpm --filter api probe:auth` ≥ 11 assertions green, including P9 (redirect guard), P10 (email-enum silence), P11 (hook rollback).
- All 16 audit-derived grep-verifications pass (M1-M10 + S1-S7 + S10 + S15).
- `assertAuthEnv()` refuses to boot the api with missing/malformed secret/URL/origin.
- Generated migration SQL reviewed: idempotent UPDATE, rollback-warning header, no destructive changes to existing tables beyond `ALTER TABLE venues ADD COLUMN organization_id`.
- Human UAT (AC-9) approves the 13-step walk including the incognito cross-org leak test.
- Zero regressions on v0.1 probe-api A1..A22 + D1..D7 alongside the new A23..A29.

### Remaining risks if shipped as-is (post-audit)
- **No persistent audit log table (D2)** — acceptable for local POC; Phase 4 Coolify deploy must add durable log storage before real users.
- **No explicit account lockout (D1)** — better-auth defaults + 8 KB auth cap provide basic protection; public launch must add explicit lockout policy.
- **Rollback is destructive post-real-data (S14 warned, D4 deferred)** — acceptable as documented; CI-tested rollback deferred to pre-launch.
- **Session continues valid after OrganizationMember delete (S11 deferred)** — acceptable in 01-01 (no UI to remove members); MUST be addressed in Plan 01-02 alongside invitations.
- **No cross-subdomain cookie strategy for prod (existing boundary)** — enforced by Phase 4 Coolify deploy plan.

### Sign-off
Would I approve this plan for APPLY? **Yes, with the 27 applied upgrades.** Without them, I would return it for rework.

---

**Summary:** Applied 10 must-have + 17 strongly-recommended upgrades to PLAN.md. Deferred 7 items with explicit triggers.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
*Auditor: Senior principal engineer + compliance reviewer (simulated role)*
