# Enterprise Plan Audit Report

**Plan:** `.paul/phases/03-whatsapp-conversational-ux/03-01-PLAN.md`
**Audited:** 2026-05-03
**Verdict:** Conditionally acceptable pre-fix → **enterprise-ready post-fix** (5 must-have + 10 strongly-recommended findings auto-applied)

---

## 1. Executive Verdict

The pre-audit plan was **conditionally acceptable**. It correctly identified the architectural shape (state machine + atomic redemption + per-tenant scoping + log redaction discipline) and got the high-level acceptance criteria right. But it had several gaps that would fail a real production review:

- **Timing-attack-vulnerable** comparisons on secret material (codes, OTP hashes) using `===`
- **Race-condition** in invite redemption — concurrent inbound on the correct OTP could either lose-redemption or surface as a Prisma `P2002` error rather than a graceful "already linked"
- **Audit trail gaps** — only `whatsapp_invite.created` was specified; `redeemed`, `revoked`, `exhausted`, `expired` lifecycle events were implied but not required, leaving SOC-2 reconstruction incomplete
- **OTP delivery-failure was unhandled** — no path described for what happens when Infobip outbound throws, leading to OTP rows stuck in `pending` and users in a permanently broken state
- **Cross-org phone-hijack** — nothing prevented org A from creating an invite for a phone already linked to a user in org B, opening a social-engineering path
- **Several latent UX issues** — input not normalized (codes with spaces fail silently); out-of-state intents silently dropped; client-side role gate missing on the manager UI; in-memory rate-limit map grows unbounded

After applying 5 must-have + 10 strongly-recommended fixes inline, the plan is **enterprise-ready**. I would sign my name to this revised plan for production rollout to a small canary venue, with the manual Infobip Portal UAT as the final gate.

---

## 2. What Is Solid (Do Not Change)

- **CSPRNG-backed code generation** with DB unique-collision retry — correctly recognises that user-facing tokens need genuine entropy and that codes are the unique key (collision impossible by construction).
- **Crockford base32 alphabet (no I/L/O/U/0/1)** — sound choice for human-readable codes that won't be misread or mistyped, especially over the phone.
- **sha256 hashing of OTP at rest** — never stored plaintext. Combined with timingSafeEqual (audit-applied) this is the right shape.
- **Per-task atomic Prisma transactions** for redemption + phone-link + WhatsappSession upsert — correct boundary for cross-row invariants.
- **Cross-tenant scoping discipline** — `@RequireRole('manager')` + `organizationId` FK + 404-not-403 — matches the existing project pattern that has held up across 7 phases.
- **Log redaction discipline** — `maskPhone` + zero raw code/OTP in any log emission. Pre-existing project guardrail correctly applied here.
- **Probe idempotency contract** — second consecutive run must match first. Forces the implementation to be deterministic and isolation-safe.
- **Boundaries explicitly lock chat-v1/chat-v2/Infobip adapter/Twilio Verify SMS/Invitation model/retired probes** — protects existing well-tested surfaces from accidental regression.
- **assertAuthEnv prod-fail backstop on `INFOBIP_DRIVER_OVERRIDE=console`** — closes D-03-04-G, eliminates the most dangerous "shipped to production with console-mode driver" failure mode.
- **Vertical-slice plan structure** — schema + backend + UI in 3 tasks delivers a complete user-visible flow rather than fragmented horizontal layers.

## 3. Enterprise Gaps Identified

| # | Gap | Why it matters |
|---|-----|----------------|
| G1 | `===` comparison of code + OTP hashes is timing-attack vulnerable | Side-channel discovery of OTP via response-time correlation; small attack surface but trivially fixed |
| G2 | Concurrent inbound on correct OTP would race the redemption transaction | Either silently loses one update OR surfaces Prisma P2002 to the user as a 500; both are bad |
| G3 | Lifecycle audit trail incomplete — only `created` specified | Auditor question "who revoked invite X and when" not answerable from logs |
| G4 | OTP outbound delivery failure left WhatsappOtpAttempt in `pending` with no recovery path | User silently stuck; no observability on Infobip outbound failures |
| G5 | Phone-cross-org hijack — org A can invite a phone already in org B | Social-engineering path: persuade org-B user to enter org-A code → cross-org membership leak |
| G6 | Inbound text not normalized (spaces, hyphens, case) | Users typing "ABCD-EFGH" or "abcd efgh" hit silent failures; first-impression UX disaster |
| G7 | Out-of-state intents silently dropped | OTP submitted in `unknown` state returns nothing; user's frustration discoverability is zero |
| G8 | OTP re-issuance not specified — second code submission could spam OTPs | Rate limit catches gross abuse but not within-30-second double-tap |
| G9 | Lookup methods don't include `expiresAt > now` predicate | Stale `pending` invites past expiresAt could be matched if status="expired" lazy-flip not enforced |
| G10 | Client-side UI shows "Invite via WhatsApp" button to non-managers | Server gates it but UX is poor (button → 403 toast); avoid the round-trip |
| G11 | In-memory rate-limit map grows unbounded | Memory leak over weeks of operation in a long-running NestJS process |
| G12 | Migration path not locked (diff vs migrate dev) | Project precedent is `migrate diff` per Phase 3; ambiguity invites the wrong tool at execution time |
| G13 | No background cleanup of expired invites + OTP attempts | Storage growth unbounded; not blocking for v1 but needs registered deferral |
| G14 | Manager invite-rate-limit absent | Compromised manager account could spam unlimited invites; no daily ceiling |
| G15 | OTP-shaped probe doesn't cover E.164 normalization | Inbound from Infobip might arrive as `447xxx` (no `+`); unverified at probe layer |
| G16 | Schema-agreement assumptions on `OrganizationMember` shape unverified | Pre-implementation grep would catch mismatch fast; silent assumption is fragile |
| G17 | mapApiError missing strings for new audit-added error codes | Without UI strings, server 409/429 responses surface as raw error codes to user |
| G18 | `WhatsappSession.phoneNumber` PK is plaintext PII | Pre-existing project pattern (User.phoneNumber also plaintext); flag for future GDPR pass, not blocking |
| G19 | Per-phone concurrent-inbound mutex absent | WhatsApp delivery is generally serial per number; race window narrow; same deferral pattern as v0.2 D-03-03-G |
| G20 | Hardcoded English in WhatsApp outbound | Project-wide pattern; defer to i18n initiative |

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Timing-safe equality on code + OTP comparison | acceptance_criteria, Task 1 action, verification | New AC-12. New `safe-equal.ts` helper module added to `files_modified`. Task 1 specifies `crypto.timingSafeEqual` for both code and hashed-OTP comparison with length-fast-fail. Grep gate added to verify zero `===` on `hashedOtp` or invite codes. |
| M2 | Idempotent redemption under concurrent inbound | acceptance_criteria, Task 1 action, verification | New AC-13. Task 1 specifies conditional `updateMany WHERE status='pending'` with `count===1` gate inside the redemption transaction. WhatsappSession.phoneNumber unique-violation (P2002) caught and treated as success. Probe V31 (race scenario) added. |
| M3 | Invite lifecycle audit trail complete | acceptance_criteria, Task 1 action, verification | New AC-16. Task 1 specifies `whatsapp_invite.created/redeemed/revoked/exhausted/expired_lazy` log emissions with structured fields (inviteId, organizationId, fromStatus, toStatus, byUserId?, reason?). Grep verify on all four lifecycle events. |
| M4 | OTP delivery-failure handling | acceptance_criteria, Task 1 action, verification, Task 2 probe | New AC-14. Task 1 introduces `failed_send` status + `whatsapp_otp.send_failed` log + fallback reply orchestration. Rate-limit increments on failure (prevents bypass). Probe V32 covers the failure path. |
| M5 | Phone-cross-org hijack guard + manager invite-spam rate-limit | acceptance_criteria, Task 1 action, Task 3 mapApiError, verification | New AC-15. Task 1 specifies pre-create lookup of `User.phoneNumber`; 409 `phone_linked_other_org` if cross-org without `?force=true` override; 429 `manager_invite_rate_limit` after MAX_INVITES_PER_MANAGER_PER_DAY=50. Task 3 adds mapApiError strings. Probe V33 + V34. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | Inbound text normalization (trim/upper/strip whitespace+hyphens) | Task 2 action | classifyInbound normalizes raw text before regex matching. Codes with spaces or hyphens match correctly. OTP submissions tolerant of "123 456" / "123-456". Probe V35. |
| S2 | State-aware out-of-state messages | Task 2 action, Task 3 mapApiError | Explicit corrective replies for OTP-in-unknown-state, code-in-otp_pending, code-in-linked_no_venue. No silent drops. Probe V36. |
| S3 | OTP re-issuance guard (30-second debounce) | Task 2 action, verification | Within-30-second second invite-code submission returns "I just sent you a code" without re-sending. Older active attempts get `expired_replaced` status + new attempt issued. Probe V37. |
| S4 | Migration path locked to `prisma migrate diff → deploy` | Task 1 action | Explicit instruction to use `prisma migrate diff` per project precedent (Phase 3 Plan 03-01 SUMMARY); rules out `migrate dev`. |
| S5 | Probe coverage extended for new audit-added invariants | Task 2 action, verification | Probe target raised 30 → 35+ with V31-V40 explicitly enumerated covering race + delivery-failure + cross-org + rate-limit + normalization + out-of-state + re-issuance + lifecycle-logs + timing-safe + E.164 normalization. |
| S6 | Lookup-time `expiresAt > now` predicate + lazy expired-flip | Task 1 action | Every invite-lookup method MUST include `expiresAt: { gt: now }`. `findActiveByCodeAndPhone` lazily flips expired status + emits `whatsapp_invite.expired_lazy` log on touch. Eliminates need for cleanup cron for correctness (storage cleanup is still deferred per D-03-01-G). |
| S7 | Client-side role gate on manager UI | Task 3 action, verification | UI hides Invite-via-WhatsApp button + list for non-managers via existing role hook (or fall-through with comment justifying server-only). Avoids 403-on-click UX. |
| S8 | TTL cleanup on in-memory rate-limit map | Task 2 action, verification | `setInterval` sweep every 60s drops timestamps older than 1 hour. Module-init/destroy lifecycle hooks for clean shutdown. Probe assertion (V41 if added). |
| S9 | Pre-implementation schema-agreement greps | Task 1 action | Task 1 begins with greps confirming `OrganizationMember` shape, `maskPhone` export location, `User.phoneNumber @unique` — fast-fail before code is written. |
| S10 | Explicit deferred-item registry with concrete triggers | New `<deferred_items>` section | Registry of D-03-01-A through D-03-01-J covering items audit-classified as "can safely defer". Each has a concrete revisit trigger (rate-limit Redis migration, GDPR pass, etc.). |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|------------------------|
| D1 | GDPR phone-as-PK hashing on WhatsappSession | Pre-existing project pattern (`User.phoneNumber` also plaintext); not regression-introduced by this plan. Project-wide privacy-hardening pass is the right scope for this — registered as D-03-01-E. |
| D2 | Per-phone concurrent-inbound mutex (full serialization) | WhatsApp delivery is generally serial per number; race window narrow. Same deferral pattern as v0.2 D-03-03-G. The audit-applied idempotent-redemption path (M2) handles the race that does occur correctly. Registered as D-03-01-F. |
| D3 | Background cleanup cron for expired invites + verified/exhausted OTP rows | Lazy expiry flip (S6) handles correctness; storage growth is real but slow at v1 scale. Registered as D-03-01-G with row-count trigger. |
| D4 | Message i18n | Project-wide English-only currently. Triggered by first non-English customer or project-level i18n initiative. Registered as D-03-01-H. |

---

## 5. Audit & Compliance Readiness

**Defensible audit evidence (post-fix):**
- Every invite lifecycle event captured in structured logs with stable schema (M3) — auditor can answer "show me every invite for org X with full status timeline" via grep + jq
- Cross-tenant guard documented + tested (AC-9 + AC-15) — SOC-2 CC6.6 evidence
- Manager invite-rate-limit prevents one compromised account from cascade-spamming (M5)
- OTP delivery-failure observable in logs (M4) — incident reconstruction for "why did Sarah never receive her code?" answerable

**Silent failure prevention (post-fix):**
- Out-of-state intents now produce corrective replies, not drops (S2)
- OTP delivery failure sets explicit `failed_send` status + fallback reply (M4)
- Idempotent redemption ensures races don't surface as 500s (M2)
- Lookup methods filter by `expiresAt > now` so stale rows can't accidentally match (S6)

**Post-incident reconstruction (post-fix):**
- 5 lifecycle log events + structured fields make timeline reconstruction routine
- Cross-org override path (`?force=true` in M5) emits dedicated `whatsapp_invite.cross_org_create` audit log including both organizationIds — covers the "operator chose to override the safety guard" trace
- OTP send failure log includes errorCode + latencyMs for correlation with Infobip ops

**Ownership and accountability:**
- All log events include `byUserId` where the action is attributable (revoke, redeem, cross-org-create override)
- assertAuthEnv prod-fail on console-mode driver makes it impossible to ship to prod with mock OTP delivery (closes D-03-04-G)

**Areas that would still fail a strict audit (acknowledged as deferred):**
- Phone numbers as plaintext in WhatsappSession.phoneNumber primary key (D-03-01-E) — mitigated by being pre-existing project shape, not this plan's regression
- No background cleanup of expired/exhausted rows means "data retention policy" question won't be cleanly answered (D-03-01-G) — lazy-flip handles correctness, storage retention is operational policy

## 6. Final Release Bar

**What must be true before this plan ships:**
1. All 5 must-have findings (M1-M5) auto-applied to PLAN.md and the corresponding code lands in APPLY ✅ APPLIED
2. All 10 strongly-recommended findings (S1-S10) auto-applied ✅ APPLIED
3. Probe `probe-whatsapp-onboarding.ts` passes ≥35/35 idempotently
4. Manual UAT on Infobip Portal trial sender — full happy path + at least 3 sad paths (expired invite, exhausted OTP, cross-org collision attempt)
5. assertAuthEnv prod-fail backstop verified active before production deploy

**Risks remaining if shipped as-is (with audit applied):**
- Pre-existing patterns flagged but deferred: phone-as-PK plaintext (D1/D-03-01-E); per-phone serialization mutex (D2/D-03-01-F); message i18n (D4/D-03-01-H). None regression-introduced; all have concrete revisit triggers registered.
- Storage growth on `WhatsappOtpAttempt` + `WhatsappInvite` tables is bounded by lazy-expire correctness but unbounded by sheer row count. Production-scale cleanup cron registered as D-03-01-G.
- In-memory rate-limit map (post-S8 TTL cleanup) is correct on a single instance. Multi-instance rollout requires Redis migration (D-03-01-A).

**Would I sign my name to this system (post-fix)?**
Yes, for a canary deployment to a single venue with operator-monitored UAT. Before broader rollout I'd want: real-Infobip OTP delivery measured (≥95% within 10s), the manual sad-path UATs run, and one external pen-test pass focused on the OTP/invite surface. Those are operational gates, not plan-level concerns.

---

**Summary:** Applied 5 must-have + 10 strongly-recommended upgrades. Deferred 4 items with concrete triggers (registered as D-03-01-A through J). AC count raised 11 → 16. Probe assertion target raised ≥30 → ≥35. New `files_modified` entries: `safe-equal.ts` + `map-api-error.ts`.

**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
*Auditor role: senior principal engineer + compliance reviewer*
*Audit date: 2026-05-03*
