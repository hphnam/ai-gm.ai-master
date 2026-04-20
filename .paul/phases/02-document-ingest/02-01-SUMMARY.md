---
phase: 02-document-ingest
plan: 01
subsystem: api
tags: [prisma, postgresql, multi-tenancy, rbac, soc2, retrieval, agentic-kb]

requires:
  - phase: 01-auth-organizations
    provides: [Organization model, OrganizationMember, better-auth session, @CurrentOrg decorator, RoleGuard]

provides:
  - KnowledgeItem.organizationId FK (NOT NULL) + two-pass backfill migration
  - docs.service direct org-scoping (list / getById / create)
  - docs.cross_org_denied + suggestions.org_mismatch structured audit logs
  - RetrievalService.find requires orgId; SQL filters knowledge_items by organizationId
  - retrieval.call log gains orgIdHash (sha256 :16)
  - TOOL_INPUT_SCHEMAS.find_knowledge shape-locked (no orgId field)
  - probe-api 44 → 52 assertions (+A30–A37 cross-org isolation + contract hardening)

affects: [02-document-ingest-02 (file upload), 03-whatsapp-integration (phone→user→org resolution), 04-coolify-deployment (prod migration story)]

tech-stack:
  added: []
  patterns:
    - "Cross-org denial pattern: row exists but belongs to different org → warn-level structured log + 404 response (enumeration-safe, audit-defensible)"
    - "Tool-input schema shape-locking via inline comment + probe assertion (defence against future regressions)"
    - "Two-pass migration backfill with DO-block guard that aborts loudly on orphan rows when no fallback is available"
    - "orgIdHash (sha256 :16) in observability logs — PII-safe tenant correlation"

key-files:
  created:
    - "packages/database/prisma/migrations/20260420120000_knowledgeitem_organization_id/migration.sql"
  modified:
    - "packages/database/prisma/schema.prisma"
    - "apps/api/src/modules/ingest/ingest.service.ts"
    - "apps/api/src/modules/docs/docs.service.ts"
    - "apps/api/src/modules/retrieval/retrieval.service.ts"
    - "apps/api/src/modules/chat/tool-dispatcher.ts"
    - "apps/api/src/modules/adaptation/adaptation.service.ts"
    - "apps/api/src/modules/suggestions/suggestions.service.ts"
    - "apps/api/src/scripts/probe-api.ts"
    - "apps/api/src/scripts/probe-ingest.ts"
    - "packages/types/src/chat-tools.ts"

key-decisions:
  - "Prisma String → TEXT (not UUID) at the DB layer — first migration attempt used UUID and failed E42804 type-mismatch against existing TEXT FKs. Corrected to TEXT throughout."
  - "Retrieval SQL retains `\"venueId\" = $N OR \"venueId\" IS NULL` INSIDE the orgId-scoped branch — this is the legitimate 'global-within-this-org' allowance, not a leak."
  - "Cross-org access on docs.getById returns 404 (not 403) + emits docs.cross_org_denied warn log. Response is enumeration-safe; log is the audit surface."
  - "Seed file (apps/api/src/scripts/seed.ts) no longer exists (prior PAUL automation cleanup per memory 3534). A34 seed-integrity check now applies to probe-fixture-written rows + any pre-existing DB state, not to a seeder."

patterns-established:
  - "Every service method that queries KnowledgeItem MUST scope by organizationId as the primary WHERE clause (direct filter, not a join-through-venue)."
  - "Claude tool-input schemas NEVER declare auth-like fields (orgId, userId, userRole) — ctx-injected only. Schema shape is part of the trust boundary."
  - "Cross-tenant access-denied events emit warn-level structured logs with actingOrgId + targetResourceId for SOC-2 CC6.6 audit defence, even when the HTTP response is 404."

duration: ~30min
started: 2026-04-20T11:30:00Z
completed: 2026-04-20T12:02:00Z
---

# Phase 2 Plan 01: KnowledgeItem organizationId — close cross-org leak on global docs

**Added KnowledgeItem.organizationId NOT NULL FK with idempotent two-pass backfill migration; rewrote docs.service / retrieval.service / tool-dispatcher / adaptation.service / suggestions.service to scope by organizationId directly; raised probe-api from 44 → 52 assertions with cross-org isolation (A30–A32), contract hardening (A33 invalid-orgId, A35 tool-schema-shape), seed integrity (A34), and positive-path regression (A36–A37). docs.cross_org_denied + suggestions.org_mismatch warn-level logs give SOC-2 CC6.6 audit-defensible access-denied events.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 minutes (PLAN → UNIFY) |
| Started | 2026-04-20T11:30:00Z |
| Completed | 2026-04-20T12:02:00Z |
| Tasks | 3 completed |
| Files modified | 10 (1 created migration + 9 edited) |
| Commits | 5 (PLAN + AUDIT + Task 1 + Task 2 + Task 3) |
| probe-api | 52/52 pass (+8 from 44 baseline) |
| probe-auth | 54/54 pass (no regression) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Schema + FK + index | Pass | KnowledgeItem.organizationId NOT NULL, FK to Organization, @@index, Organization inverse relation added. |
| AC-2: Idempotent backfill migration | Pass | Two-pass backfill (venue-join then demo-org fallback) + DO-block guard; IF NOT EXISTS on ADD COLUMN + CREATE INDEX; rollback SQL documented in header. First application failed E42804 (UUID vs TEXT mismatch) — recovered via `migrate resolve --rolled-back`, fixed to TEXT, re-applied clean. |
| AC-3: docs.service scoped by organizationId | Pass | list() uses `{ organizationId }`; getById() scope-checks post-fetch and emits warn log on mismatch; create() passes orgId to ingest. Venue-join OR hack removed. |
| AC-4: Retrieval scoped by orgId | Pass | RetrievalService.find takes required opts.orgId; UUID_RE-validates; both SQL branches add `"organizationId" = $N`. A33 proves invalid-orgId contract holds. |
| AC-5: Call-site propagation | Pass | tool-dispatcher injects ctx.orgId; chat.service already threaded orgId (no change needed); adaptation.service selects + forwards knowledge.organizationId on retag; suggestions.service uses existing orgId arg + emits org_mismatch log. |
| AC-6: Seed + ingest supply organizationId | Partial/Deviated | ingest.service write-path covered (fail-fast UUID_RE guard + both upsert payloads). seed.ts portion N/A (file doesn't exist per memory 3534) — substituted with A34 probe assertion enforcing `COUNT WHERE organizationId IS NULL` = 0 across the live DB. |
| AC-7: Probe cross-org + contract hardening | Pass | A30–A37 all pass: A30 list leak closed, A31 getById 404, A32 retrieval leak closed, A33 invalid-orgId contract, A34 orphan_count=0, A35 schema strips orgId, A36 positive list ≥1 row, A37 positive retrieval returns other-org doc for correct tenant. |
| AC-8: Cross-org access-denied audit log | Pass | docs.cross_org_denied emitted live during A31 (visible in probe output: `{"level":"warn","event":"docs.cross_org_denied","targetRowId":"1627d523-...","actingOrgId":"9ed83ee6-..."}`). suggestions.org_mismatch wired on both onConversationOpen and onTurn preflight failures. |
| AC-9: Build + regression | Pass | `pnpm --filter api build` clean (swc 36ms). `pnpm --filter web build` clean. `pnpm --filter @gm-ai/types build` clean. probe-api 52/52. probe-auth 54/54 (zero regression). |

## Accomplishments

- Closed a documented SOC-2 CC6.6 cross-organisation leak on KnowledgeItem rows with `venueId = NULL` (the "Global docs (venueId null) are shared across all orgs until per-org ownership lands in a later phase" comment at docs.service.ts:42 is now obsolete and has been removed).
- Established the tool-input schema shape-locking pattern (inline comment + probe A35) as defence against future regressions where a Claude tool might accept an auth-like field.
- Added audit-defensible access-denial logs at two layers (docs + suggestions) — 404 response stays enumeration-safe, the log is the audit surface.
- Raised probe-api from 44 → 52 assertions with dedicated cross-org isolation coverage at three boundaries (list / getById / retrieval).

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Plan | `ede6ee9` | docs | Initial PLAN.md |
| Audit | `a5e728f` | docs | Enterprise audit — 5 must-have + 7 strongly-recommended applied |
| Task 1 | `9eea65c` | feat | Schema + migration + ingest write-path + probe-ingest fixup |
| Task 2 | `1c175ec` | feat | Service + retrieval + call-site propagation + M3 schema comment |
| Task 3 | `13bfe74` | test | probe-api A30–A37 + cleanup extension for venueId-NULL fixtures |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/database/prisma/migrations/20260420120000_knowledgeitem_organization_id/migration.sql` | Created | Two-pass idempotent backfill + DO-block guard + NOT NULL + FK + index |
| `packages/database/prisma/schema.prisma` | Modified | KnowledgeItem.organizationId + Organization inverse relation + @@index |
| `apps/api/src/modules/ingest/ingest.service.ts` | Modified | IngestInput.organizationId required + UUID_RE fail-fast guard + both upsert payloads persist it |
| `apps/api/src/modules/docs/docs.service.ts` | Modified | list/getById/create scoped by organizationId direct; cross_org_denied warn log on getById mismatch; Logger import |
| `apps/api/src/modules/retrieval/retrieval.service.ts` | Modified | RetrievalOpts.orgId required; SQL both branches add org filter; logCall adds orgIdHash |
| `apps/api/src/modules/chat/tool-dispatcher.ts` | Modified | find_knowledge injects ctx.orgId + requires ctx; save_knowledge_doc passes ctx.orgId to ingest |
| `apps/api/src/modules/adaptation/adaptation.service.ts` | Modified | retag path selects + forwards knowledge.organizationId |
| `apps/api/src/modules/suggestions/suggestions.service.ts` | Modified | suggestions.org_mismatch warn log on both onConversationOpen + onTurn venue-in-org preflight failure |
| `apps/api/src/scripts/probe-api.ts` | Modified | +8 assertions A30–A37; imports IngestService + RetrievalService + TOOL_INPUT_SCHEMAS; cleanupProbeRows extended to delete KnowledgeItem by organizationId |
| `apps/api/src/scripts/probe-ingest.ts` | Modified | Resolves demo org id and passes organizationId to ingest call (dependent change from IngestInput shape change) |
| `packages/types/src/chat-tools.ts` | Modified | Inline comment on find_knowledge schema — orgId NEVER accepted (M3 hardening) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Prisma String maps to TEXT not UUID | Observed after first migration attempt failed with E42804 type-mismatch joining `knowledge_items.organizationId UUID` with `Venue.organizationId TEXT`. Confirmed via init migration inspection. | All future FK migrations in this codebase must use TEXT (mirrors Venue.organizationId, Session.userId, etc.). Added a code comment at the migration site. |
| `AC-6 seed portion` converted to probe A34 | apps/api/src/scripts/seed.ts no longer exists (PAUL automation cleanup, memory 3534). | Seed-path integrity is now enforced at the live DB level via probe A34 (`COUNT WHERE organizationId IS NULL = 0`), which is strictly stronger — catches any code path writing a KnowledgeItem without organizationId, not just the seed. |
| probe-ingest.ts modification | Not listed in plan files_modified. | Mandatory dependent change — IngestInput now requires organizationId, so probe-ingest's call would no longer compile. Documented as deviation. |
| Keep `"venueId" IS NULL` inside orgId-scoped branch | The plan's grep sweep expected zero matches for this pattern. | Clarified: the legitimate "global within this org" allowance still needs the IS NULL clause. Only the outer-level OR-venueId-null leak hack is gone. Audit-defensible: every SQL path now has `"organizationId" = $N` as the first AND clause. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Low — one type-mismatch recovered cleanly; one missing file converted to stronger probe check |
| Scope additions | 1 | Low — probe-ingest.ts updated as dependent change |
| Grep-sweep clarification | 1 | Documentation-only — legitimate `venueId IS NULL` remains inside org-scoped branch |
| Deferred | 0 | All new items were already pre-deferred in the audit |

**Total impact:** Essential correctness fixes, no scope creep. The three-task / one-checkpoint structure executed as designed; the checkpoint was auto-resolved (converted to probe A36/A37 per audit S2 before APPLY began).

### Auto-fixed Issues

**1. Migration column type — UUID → TEXT**
- **Found during:** Task 1 (migration apply)
- **Issue:** First migration attempt declared `organizationId UUID`. `UPDATE knowledge_items ki SET organizationId = v.organizationId FROM Venue v` failed E42804 ("column organizationId is of type uuid but expression is of type text") because Prisma's `String @id @default(uuid())` maps to TEXT in Postgres.
- **Fix:** `prisma migrate resolve --rolled-back 20260420120000_knowledgeitem_organization_id` to clear the failed state; edited migration to `ADD COLUMN ... TEXT` (matching init migration); re-applied clean.
- **Files:** `packages/database/prisma/migrations/20260420120000_knowledgeitem_organization_id/migration.sql`
- **Verification:** `pnpm --filter @gm-ai/database exec prisma migrate deploy` → "All migrations have been successfully applied". A34 `COUNT WHERE organizationId IS NULL = 0` subsequently confirmed backfill.
- **Commit:** `9eea65c` (Task 1)

**2. Missing seed.ts (plan referenced a file that no longer exists)**
- **Found during:** Task 1 (seed step)
- **Issue:** Plan explicitly listed `apps/api/src/scripts/seed.ts` in files_modified and Task 1 action step 8. The file was eliminated in the PAUL automation rework (memory 3534 — "Seed module eliminated in favor of self-serve venue creation"). The only remaining seed artefact is `seed.sql` at repo root, which is a raw-SQL historical dump, not an active script.
- **Fix:** Skipped the seed.ts edit. Compensated by A34 probe assertion enforcing live-DB integrity — strictly stronger regression guard than a seed-file code check.
- **Files:** N/A (file not created).
- **Verification:** A34 passes (orphan_count=0 on live DB post-migration).
- **Commit:** `9eea65c` (Task 1) / `13bfe74` (Task 3)

### Dependent Change Not Listed in Plan

**1. probe-ingest.ts organizationId pass-through**
- **Why:** IngestInput gained a required organizationId field. probe-ingest's existing call `ingest.ingest({ id, title, category, content, venueId: null })` would fail compile without the update. This is a mandatory dependent change, not scope creep.
- **Change:** Resolve demo org id via `prisma.organization.findUnique({ where: { slug: 'demo' } })` at probe start, then pass `organizationId: org.id` to every ingest call.
- **Commit:** `9eea65c` (Task 1)

### Grep-Sweep Clarification

The plan's Task 2 step 7 required `grep -rn "venueId.*IS NULL\|venueId.*OR.*NULL" apps/api/src/ --include="*.ts"` to return zero matches. Post-APPLY, one match remains in `apps/api/src/modules/retrieval/retrieval.service.ts:76`:

```
AND ("venueId" = $3 OR "venueId" IS NULL)
```

This is NOT the leaky pattern the sweep was hunting. It's inside the venue-scoped retrieval SQL branch where `"organizationId" = $2` appears as the first AND clause — so it's the legitimate "global-within-this-org" allowance (global docs within the acting org should still be retrievable when the caller passes a venueId). The leaky Prisma clause `{ OR: [{ venueId: null }, { venue: { organizationId } } ] }` from `docs.service.ts` is gone. Clarification documented in Task 2 commit message.

### Deferred Items

None new — all deferred items from the audit (D1 two-phase zero-downtime migration, D2 ReTagQueueItem org-scoping simplification, D3 dedicated cross-org-access-denied error code, D4 org-transfer flow, D5 per-org quota) remain deferred with their explicit triggers and carry forward.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| First migration E42804 UUID vs TEXT | `migrate resolve --rolled-back` + retyped column to TEXT (see Auto-fix #1 above). |
| Plan referenced missing seed.ts | Converted the AC-6 seed-path check to live-DB probe assertion A34 (strictly stronger). |

## Next Phase Readiness

**Ready:**
- KnowledgeItem trust boundary is now aligned with Organization (auth 01-01, invitations 01-02, phone 01-03, knowledge 02-01). Phase 2 Plan 02 (file upload) can safely land — cross-org leaks are closed before feature work ships.
- Cross-org denial log pattern established — future service plans (e.g. per-org stock dashboards, per-org billing) can reuse `docs.cross_org_denied` style event shape.
- probe-api baseline raised to 52 assertions with explicit cross-org isolation coverage at the retrieval layer. Any future plan that touches retrieval SQL has regression-safety from day one.

**Concerns:**
- `"venueId" IS NULL` inside the retrieval SQL remains a pattern that looks like a leak to a naive grep; any future reviewer should be routed to the Plan 02-01 SUMMARY clarification above.
- IngestService.ingest() now has a UUID_RE fail-fast on organizationId — any caller not updated (unlikely; all 5 compile-enforced by the type system) would throw at call time rather than silently ingest into the wrong org.

**Blockers:**
- None for Phase 2 Plan 02 (file upload / multipart endpoint / MIME validation / text extraction pipeline / DELETE + UI).
- Carry-forward blockers (unchanged): D-01-02-F email-verification dev bypass removal + D-01-03-F Twilio driver override default → both pre-Phase-4 go-live; AC-11 UAT (phone-link UI) + AC-10 UAT (01-01 cross-org + 01-02 invitation) remain outstanding.

---
*Phase: 02-document-ingest, Plan: 01*
*Completed: 2026-04-20*
