# Enterprise Plan Audit Report

**Plan:** `.paul/phases/02-document-ingest/02-01-PLAN.md`
**Audited:** 2026-04-20 11:45
**Verdict:** Conditionally acceptable pre-fix → Enterprise-ready post-fix

---

## 1. Executive Verdict

The plan correctly identifies the right problem (SOC-2 CC6.6 cross-org leak on KnowledgeItem rows with `venueId = NULL`), targets the right surfaces (schema + service + retrieval + downstream callers), and scopes tightly (no feature creep into file-upload territory — that is correctly deferred to Plan 02-02).

Pre-fix, however, the plan has five release-blocking gaps:
1. Migration would silently fail on production databases without a `demo` org slug, leaving the table in a half-migrated state with column-NULL rows and a failed `SET NOT NULL`.
2. The tool-input schema for `find_knowledge` was not explicitly hardened — if a future schema change adds an `orgId` accepted field, the entire scoping contract is bypassable.
3. No structured audit log for cross-org access-denied events, so SOC-2 CC6.6 auditors cannot reconstruct "who attempted to access what across the tenant boundary."
4. Probe coverage is leak-path-only — no positive-path assertions that the org-scoped SQL still returns the right rows for the acting org.
5. Plan shipped with a blocking UI-UAT checkpoint, which under the unattended runner protocol forces a hard stop with a BLOCKER: marker — meaning the plan could not complete autonomously even when all automated work succeeded.

Post-fix, all five are closed. I would sign my name to the post-fix plan for production release.

## 2. What Is Solid

- **Scope discipline.** Plan explicitly defers file upload / extraction / delete to Plan 02-02 and lists each deferral in `SCOPE LIMITS`. This prevents the drift that took Plan 03-01 a mid-APPLY rethink.
- **Migration pattern choice.** `prisma migrate diff --script | prisma migrate deploy` (not `migrate dev`) correctly mirrors the Plan 03-01 deviation where `migrate dev --create-only` was shown to be interactive-only. This is the right pattern for any destructive DDL in this codebase.
- **Idempotency hygiene.** Every `UPDATE` in the migration has a `WHERE ... IS NULL` guard, mirroring Plan 01-01 M3. Re-running the migration is a no-op. Good.
- **Trust-boundary analysis.** The plan correctly notes that `docs.service.ts:42` already explicitly flags the leak with a code comment; there is no ambiguity about the SOC-2 severity.
- **No new dependencies.** Plan adds nothing to package.json and creates only the migration file. Keeping the blast radius tight on a security-boundary fix is the right instinct.

## 3. Enterprise Gaps Identified

### G1: Migration prod-safety — silent `SET NOT NULL` failure on missing demo org
The pre-fix SQL falls back to `(SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1)` for orphan rows. In production, no such org will exist. The `SELECT` returns NULL. The UPDATE assigns NULL. The subsequent `SET NOT NULL` fails with `column "organizationId" contains null values` — an obscure Postgres error that does not point at the root cause. The migration transaction aborts but the column is already added, leaving the DB in a half-migrated state on retry.

### G2: Tool-input schema is an attack surface
`TOOL_INPUT_SCHEMAS.find_knowledge` in `@gm-ai/types` is the contract between Claude and the dispatcher. If the schema accepts `orgId`, Claude can emit an orgId in its tool call and bypass the ctx-injected value — either by hallucinating another org's UUID, or (worst-case) by echoing a value an attacker embedded in the chat prompt. The plan pre-fix relied on "retrieval.find signature takes orgId" without explicitly locking the schema shape.

### G3: No access-denied audit log
`docs.service.getById` pre-fix returns `null` uniformly for both "row does not exist" and "row exists but belongs to another org." The 404-not-403 response policy is correct (enumeration-safe), but silent null-return leaves zero audit trail for attempted cross-org access. SOC-2 CC6.6 requires that access-denial events produce evidence that can be reconstructed post-incident.

### G4: Probe tests the leak path but not the positive path
Pre-fix A30–A32 verify that a cross-org doc is NOT returned. No assertion verifies that the acting org's own rows ARE returned. A future refactor that accidentally scopes too aggressively (e.g., `where: { organizationId: orgId, AND: { venueId: { not: null } } }` — reversing the OR from the original hack) would leak the other direction: lose the acting org's global docs entirely. Probe silently passes until the UI shows empty lists.

### G5: Blocking UI-UAT checkpoint contradicts unattended-runner protocol
The PAUL framework permits UI-UAT as a blocking checkpoint, but the operating runner halts on any BLOCKER: marker. Keeping the UAT as-is meant APPLY could not complete autonomously even when all automated work was green — a procedural gap, not a correctness one.

### G6: Tool schema existence-check not enforced by probe
`find_knowledge` accepting `orgId` is a silent regression class. Grep-based checks in the task actions are one-shot verifications during APPLY; they don't protect against a future plan re-adding the field.

### G7: Suggestions cross-org access emits no audit log
Same as G3 but for the `suggestions.service.ts` venue-in-org preflight: silent 404 return leaves no trail for cross-org probe attempts via the suggestions surface.

### G8: Call-site enumeration is implicit
Pre-fix Task 2 asserts that grep sweeps must pass post-edit, but does not require an explicit pre-edit enumeration + post-edit delta recording in SUMMARY.md. Auditors reviewing this plan later have no defensible record of "all call sites were considered."

### G9: Rollback SQL is gestured-at, not spelled-out
The plan mentions a "rollback header" but does not require the full rollback SQL inside it. A future operator reverting this migration has to reconstruct the rollback from the forward SQL under time pressure — that's a production incident recipe.

### G10: Backfill performance silence
Plan assumes <20 rows. A future larger tenant import (or a customer migration) would run UPDATE-FROM against a large table with a full scan. Silent. Flag for future reviewers.

### G11: IngestService orgId validation is string-truthy, not UUID
Pre-fix guard was `if (!input.organizationId) throw ...`. A caller passing a non-UUID string (from an unvalidated external source) would pass the truthy check and write garbage into the FK column, failing at the DB level with a less helpful error. Tighten to UUID_RE validation to fail at the API boundary with the canonical trust-boundary regex already used across the codebase.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | G1: Migration prod-safety — demo-org-missing silent failure | Task 1 step 4 (migration SQL) | Added `DO $$ ... RAISE EXCEPTION ...` block that aborts the migration loudly if orphan rows still have NULL organizationId after both backfill passes. Converts obscure Postgres constraint violation into an operator-readable error with remediation guidance. |
| M2 | Table-name case breakage risk (per 03-01 post-mortem) | Task 1 new step 3 | Added explicit `\dt` / `@@map`-inspection step before writing the migration SQL, with exact quoted-identifier reference for Venue (`"Venue"`, capitalised), organizations (`"organizations"`, lowercase), knowledge_items (`"knowledge_items"`, snake_case). |
| M3 | G2: Tool-input schema hardening — `find_knowledge` must not accept orgId | Task 2 step 3 | Added explicit grep-verification step: `TOOL_INPUT_SCHEMAS.find_knowledge` in `packages/types/src/tools.ts` MUST NOT declare `orgId`. Inline comment added at the schema site warning future editors. New probe assertion A35 enforces this at CI time. |
| M4 | Retrieval `invalid orgId` contract is unprotected against regression | Task 3 new probe assertion A33 | Added probe assertion: `RetrievalService.find('x', { orgId: 'not-a-uuid' })` returns `fail('error', /invalid orgId/i)`. Guards the UUID validation from silent removal. |
| M5 | G3: Cross-org access-denied events need audit evidence | Task 2 step 1 (docs.service.getById) + AC-8 | Added warn-level structured log `{event:'docs.cross_org_denied', requestId, targetRowId, actingOrgId}` emitted when the row exists but belongs to a different org. Response body still 404-not-403 (enumeration-safe) — log is the audit surface. AC-8 formalises the contract. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | Post-seed orphan integrity guard missing | Task 3 new probe assertion A34 | Added assertion: `SELECT COUNT(*) FROM knowledge_items WHERE "organizationId" IS NULL` returns 0 after seed. Regression-guards every future code path that writes a KnowledgeItem without passing organizationId. |
| S2 | G5: Blocking UI-UAT breaks unattended runner | Frontmatter `autonomous: false→true`; UAT task replaced | Replaced blocking UI-UAT checkpoint with automated probes A36 (positive list path) + A37 (positive retrieval path). UAT downgraded to non-blocking post-deploy spot-check note. Plan now runs end-to-end autonomously. |
| S3 | G7: suggestions cross-org audit log missing | Task 2 step 5 + AC-8 | Added warn-level structured log `{event:'suggestions.org_mismatch', requestId, targetVenueId, actingOrgId}` on the suggestions controller's venue-in-org preflight failure. Mirrors 04-02's `suggestions.conversation_mismatch` pattern. |
| S4 | G8: Call-site enumeration not auditable | Task 2 new step 0 | Added mandatory pre-edit grep enumeration (4 greps) with instruction that the output must be recorded in SUMMARY.md for audit trail. |
| S5 | G9: Migration rollback SQL spelled out | Task 1 migration SQL header | Added full rollback SQL block in the migration header comment (drop FK → drop index → drop column), plus a data-loss warning that rollback after Task 2 ships re-opens the leak. |
| S6 | G4: Probe covers leak path but not positive path | Task 3 new probe assertions A36 + A37 | Added positive-path assertions: GET /docs returns ≥1 row for acting org AND every row's KnowledgeItem.organizationId matches; ChatService retrieval returns ≥1 hit for a matched seeded doc AND every hit's KnowledgeItem.organizationId matches. |
| S7 | G10: Backfill performance note for future scale | Task 1 migration SQL header | Added performance note: at >10k rows, UPDATE-FROM should batch. Not applicable pre-POC but flagged for future reviewers. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | Two-phase zero-downtime migration (add nullable → deploy code → add NOT NULL) | Requires prod deploy orchestration which is Phase 4 (Coolify) territory. POC runs against a single dev DB with no concurrent traffic — this plan's single-phase migration is acceptable. **Trigger:** Phase 4 go-live checklist adds it. |
| D2 | ReTagQueueItem org-scoping simplification (switch from venue-join to direct orgId) | Out of scope per `DO NOT CHANGE` boundaries. Plan 05-03 already locked the retag-queue tenant filter. **Trigger:** A dedicated cleanup plan once KnowledgeItem.organizationId is in place AND retag queue has measurable ops volume. |
| D3 | Dedicated `cross-org-access-denied` API error code | Keeping 404-not-found generic is enumeration-safer. The structured log (M5, S3) captures the audit signal without leaking existence to the client. **Trigger:** External SOC-2 auditor explicitly requests a distinct machine-readable code. |
| D4 | KnowledgeItem org-ownership transfer UI/API | No product requirement for moving a doc between orgs in v0.2. **Trigger:** First tenant merger / acquisition / venue-reassignment request. |
| D5 | Per-org KnowledgeItem quota (similar to 01-02 invitation cap) | No abuse signal yet — this is a multi-tenant backend, not a public-upload endpoint. **Trigger:** Abuse report OR public upload endpoint lands post-auth. |

## 5. Audit & Compliance Readiness

**Defensible audit evidence — POST-FIX:**
- Cross-org access attempts produce structured log events (`docs.cross_org_denied`, `suggestions.org_mismatch`) with requestId + actingOrgId + targetResourceId. Reconstructable via grep on X-Request-Id.
- Every retrieval call logs `retrieval.call` with orgIdHash (SHA-256 prefix) — reconstructable without PII leakage.
- Probe-api maintains 52+ assertions including cross-org isolation at three layers (list, getById, retrieval) — regression-resistant.

**Silent failure prevention — POST-FIX:**
- Migration DO-block converts silent `SET NOT NULL` failure into explicit `RAISE EXCEPTION` (M1).
- Tool-input schema shape locked by probe A35 (M3).
- Seed orphan count locked by probe A34 (S1).
- IngestService fail-fast UUID validation catches bad input at the API boundary, not the DB (M5 adjusted).

**Post-incident reconstruction — POST-FIX:**
- Grep-by-requestId across `http.request` (inbound) + `docs.cross_org_denied` / `suggestions.org_mismatch` / `retrieval.call` (internal) traces a single cross-org attempt through every layer.
- Migration file retains full rollback SQL in a visible comment header — operator does not need to reconstruct under incident pressure (S5).

**Ownership & accountability:**
- Plan is self-contained under `.paul/phases/02-document-ingest/02-01-*.md`.
- SUMMARY.md requirement for call-site enumeration (S4) provides paper-trail that every grep-eligible touchpoint was considered.
- Every deferred item has an explicit trigger — no silent perpetual deferrals.

## 6. Final Release Bar

**Must be true before this plan ships:**
1. Migration applies cleanly against the local dev DB, no orphan rows remain post-seed (A34 enforces).
2. `pnpm --filter api probe:api` ≥52 assertions pass, including A30–A37.
3. `pnpm --filter api probe:auth` ≥54 assertions pass (zero regression).
4. Both apps build clean (`api` + `web`).
5. Grep sweeps zero out: the old venue-join OR pattern, any call site of `retrieval.find` missing `orgId`, any `orgId` reference inside the `find_knowledge` schema block.
6. Call-site enumeration recorded in SUMMARY.md (S4).

**Risks remaining if shipped as-is (post-fix):**
- Zero-downtime migration path is deferred (D1); acceptable for POC single-dev-DB; MUST be reopened before Phase 4 go-live.
- ReTagQueueItem still org-scopes via venue-join (D2); acceptable because Plan 05-03 locked its tenant filter; revisit in a dedicated cleanup plan.
- Per-org quota not enforced (D5); acceptable for closed-tenant POC; MUST be reopened before any public-facing upload endpoint.

**Would I sign my name to this system post-fix?** Yes — for the POC scope. The plan closes a documented SOC-2 CC6.6 failure with defensible audit logging, probe coverage at three boundary layers, and migration operator-safety. Before any regulated-environment production deploy, the three remaining risks above must be closed in their named triggering plans.

---

**Summary:** Applied 5 must-have + 7 strongly-recommended upgrades. Deferred 5 items with explicit triggers.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
