# Enterprise Plan Audit Report

**Plan:** .paul/phases/04-chat-engine/04-03-PLAN.md
**Audited:** 2026-04-18 21:30
**Verdict:** conditionally acceptable pre-fix → **enterprise-ready post-fix**

---

## 1. Executive Verdict

**Conditionally acceptable pre-fix; enterprise-ready after applied upgrades.**

The plan is structurally consistent with prior audit patterns (03-03 trust-boundary posture, 04-01 Zod-at-entry + cross-tenant preflight, 04-02 runDispatchWithTimeout + PII-safe logging). However, the pre-fix version has six release-blocking gaps that would fail a real audit:

1. **No cost/time ceiling on the queue drain** — a thumbs-down storm could trigger 50+ Claude re-enrichments uncapped. Today's IngestService has its own per-call token cap, but the plan lacks an aggregate ceiling.
2. **No failed-item lockout** — a KnowledgeItem whose re-enrichment consistently fails (content Claude can't parse) would be re-enqueued on every new thumbs-down, thrashing forever.
3. **Orphan FK** — `sourceMessageId` is a plain String, not a foreign key. Deleting the source ChatMessage leaves dangling references in the queue audit trail.
4. **Silent contract-drift failure** — `captureRetrievalOutcome` extracts `result.data[0].similarity` from `unknown[]` without type guards. If ChatService's toolCallLog shape ever changes, this silently stops emitting low-similarity signals; the adaptation loop goes dark with no log.
5. **Migration command is broken** — the plan's "sanity parse" step uses `--from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma` (diffing a file against itself, always empty). The real `migrate diff` command is missing `mkdir -p` for the destination directory — Prisma will fail with ENOENT.
6. **No per-feedback enqueue cap** — retrieval's limit is 20; a pathological query could pin 20 queue rows per thumbs-down click. Audit-defensible systems cap cost explicitly rather than relying on upstream limits.

All six are now applied. Strongly-recommended upgrades (7 items) add observability for chronic failures and contract drift, plus probe coverage of the concurrency dedupe path and the low-similarity wiring.

I would sign my name to this plan as revised.

## 2. What Is Solid

- **ChatService wiring is minimal and correct.** Inline-awaited post-persist call into `captureRetrievalOutcome` (not fire-and-forget) matches the determinism the probe needs, and try/catch-shielded so adaptation failures can't take down the sendMessage return path. Good.
- **Dedupe semantics on active status (queued|processing).** Correctly scoped — failed/processed rows don't block new enqueues, so a user can still signal that a *previously-failed* re-enrichment attempt is still wrong. (This conflicts with the new max-attempts gate only for chronic-failure items, which is the intended outcome.)
- **MessageFeedback is 1:1 via unique on messageId.** Upsert semantics allow kind transitions without creating duplicate rows; audit-add of `isKindTransition` log flag captures the signal without changing schema.
- **Migration is additive-only.** No existing columns altered; back-relations are the only change to ChatMessage / KnowledgeItem.
- **Human-verify checkpoint before migrate deploy.** Correctly adopts the Plan 03-01 approval-gated DDL pattern. `autonomous: false` flag set.
- **PII discipline is clear.** userFeedback stored in DB (necessary) but never logged; only lengths + booleans in observability payloads. Matches Plan 03-03 queryHash stance.
- **Probe lifecycle (setup → assert → teardown → baseline verify).** Consistent with probe-suggestions pattern; self-cleaning by design.

## 3. Enterprise Gaps Identified

### Cost & Reliability

- **G1. No drain-deadline**: processReTagQueue capped at 50 rows structurally but no wall-clock ceiling; could block for minutes on slow Claude.
- **G2. No failed-item lockout**: chronic-failure items re-enqueue indefinitely via new thumbs-down.
- **G3. No per-feedback enqueue cap**: retrieval's 20-item limit could create 20 queue rows per click.

### Data Integrity

- **G4. sourceMessageId orphan risk**: plain String, no FK. Queue rows survive ChatMessage delete with dangling references — would appear as non-null strings pointing to non-existent rows, polluting audit trail.

### Observability

- **G5. Silent contract-drift failure**: `captureRetrievalOutcome` has no type guards for toolCallLog shape; if ChatService's toolCallLog contract changes (renames, shape shift), this adaptation loop silently stops capturing low-similarity signals.
- **G6. `adaptation.capture_error` payload unspecified**: event named but shape not documented — operators won't know what keys to alert on.
- **G7. No `adaptation.drain_summary` with `remainingQueued`**: plan returns counts from processReTagQueue but doesn't log a structured summary; ops can't alert on backlog growth without this.

### Build Correctness

- **G8. Migration SQL command has a broken sanity parse** and missing `mkdir -p` — the plan-as-written would fail on first execution.
- **G9. No rollback procedure** if `migrate deploy` fails mid-way; Plan 03-01 established the `migrate resolve --rolled-back` pattern, this plan omits it.

### Test Coverage

- **G10. No concurrency dedupe test** — the "dedupe holds under race" claim is unverified; two concurrent captureFeedback calls in Promise.all could race the findFirst-then-create path.
- **G11. No low-similarity wiring test in probe-eval** — probe-eval computes retrieval_hit rates but doesn't verify the ChatService → AdaptationService wiring actually fires on low-sim queries.
- **G12. No malformed-shape defense test** — G5's defensive parsing needs a negative-path probe assertion or it's unverified.

### Schema / Prisma

- **G13. Prisma relation disambiguation**: ChatMessage has two back-relations to different models (MessageFeedback, ReTagQueueItem) — fine by itself, but the `sourceMessage` relation on ReTagQueueItem needs a named relation `@relation("sourceMessage")` to be unambiguous. Plan didn't specify this.

### Kind-Transition Behavior

- **G14. Undefined behavior on 'up' → 'down' transition**: first call kind='up' persists feedback, does NOT enqueue. Second call kind='down' upserts feedback row — but does it trigger enqueue? Plan is silent. Semantically it should (user changed their mind) but without explicit spec a future maintainer could break it.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | G2: No max-attempts cap on chronic-failure items | AC-3 + Task 2 enqueueReTag + constants | Added `MAX_RETAG_ATTEMPTS=3` to @gm-ai/types; enqueueReTag now checks last failed row's attempts count and refuses with `{exhausted:true}` + `adaptation.retag_attempts_exhausted` log |
| 2 | G4: Orphan sourceMessageId risk | AC-1 + Task 1 schema block | Added `sourceMessage ChatMessage? @relation("sourceMessage", onDelete: SetNull)` on ReTagQueueItem; back-relation on ChatMessage with named relation for disambiguation; new index `@@index([sourceMessageId])` |
| 3 | G1: No drain-deadline cost ceiling | AC-3 + Task 2 processReTagQueue + constants | Added `DRAIN_SOFT_DEADLINE_MS=60000`; processReTagQueue reverts in-flight row to 'queued' and emits `adaptation.drain_deadline_reached` when elapsed exceeds deadline |
| 4 | G5 + G12: Silent contract-drift failure | AC-3 + Task 2 captureRetrievalOutcome + AC-4 assertion 15 | Added explicit type guards (`typeof === 'object'`, `'tool' in e`, etc.); emits `adaptation.retrieval_outcome_shape_unknown` warn log when find_knowledge entries exist but none match expected shape; probe assertion 15 exercises this path |
| 5 | G8 + G9: Broken migration commands + no rollback | Task 1 migration section | Removed self-diff sanity parse; added `mkdir -p` for migration directory; added `migrate resolve --rolled-back` rollback procedure mirroring Plan 03-01 |
| 6 | G3: No per-feedback enqueue cap | AC-2 + Task 2 captureFeedback + constants | Added `MAX_ENQUEUE_PER_FEEDBACK=10` to @gm-ai/types; captureFeedback and captureRetrievalOutcome both slice retrievedItemIds to this cap; emits `adaptation.feedback_enqueue_capped` when truncated |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | G7: No drain_summary log with remainingQueued | AC-3 + Task 2 processReTagQueue | Added `adaptation.drain_summary` log with `{ processed, failed, deduped, remainingQueued, elapsedMs, limit, deadlineMs }`; count queried via `prisma.reTagQueueItem.count({where:{status:'queued'}})` |
| 2 | G6: adaptation.capture_error payload unspecified | AC-3 + Task 2 captureRetrievalOutcome | Specified payload `{ assistantMessageId, error: String(err).slice(0, 200) }` matching Plan 03-03's queryHash/length convention |
| 3 | G10: No concurrency dedupe test | AC-4 + Task 3 probe-adaptation | Added probe assertion 13 — `Promise.all([captureFeedback({kind:'down'}), captureFeedback({kind:'down'})])` on a second fixture message; asserts exactly retrievedItemIds.length queue rows (race doesn't double-insert) |
| 4 | G14: Kind-transition semantics undefined | AC-2 + Task 2 captureFeedback | Documented: 'up' → 'down'/'regenerate' on same messageId DOES enqueue (user changed their mind is a valid signal); feedback_captured log now includes `isKindTransition: boolean` |
| 5 | G11: Low-similarity wiring unverified in probe-eval | Task 3 probe-eval | Added low-similarity side-effect assertion: after all queries run, count queue rows with reason='low-similarity' sourced from capturedAssistantMessageIds; logged as soft assertion (warn if 0) |
| 6 | G13: Prisma relation name for sourceMessage | Task 1 schema block | Added `@relation("sourceMessage")` explicit name on ReTagQueueItem.sourceMessage + ChatMessage.retagQueueItems back-relation — disambiguates from the KnowledgeItem → ReTagQueueItem relation |
| 7 | Max-attempts observable + verification | AC-4 assertion 14 + Task 3 probe-adaptation + verification | Added probe assertion 14: pre-insert a status='failed' attempts=3 row, call enqueueReTag, assert `{enqueued:false,exhausted:true}` returned; added grep verification for `MAX_RETAG_ATTEMPTS`, `MAX_ENQUEUE_PER_FEEDBACK`, `DRAIN_SOFT_DEADLINE_MS` constants |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Unit tests for AdaptationService helpers | Probes are the POC test contract; dedicated test plan can come post-POC when coverage strategy is settled |
| 2 | BullMQ or @nestjs/schedule background drainer | Explicitly out of POC scope per PROJECT.md; manual drain via probe/future controller is sufficient until there's a user flow that demands background processing |
| 3 | Metadata-diff signal (did re-ingest actually change metadata?) | Defer until eval data shows whether re-tagging moves retrieval quality; adds complexity without proven signal |
| 4 | Per-venue queue partitioning | Single global queue with createdAt ordering is fine for 2-venue POC; revisit when venue count > 10 or queue backlog shows cross-venue contention |
| 5 | Soft-fail mode for eval harness (Claude flake retry) | Defer until eval is CI-gated; manual runs can be re-executed if a flake is suspected |
| 6 | OTel/Prometheus metrics emission for queue depth | Cross-service telemetry plan owns structured metrics; JSON logs with `adaptation.drain_summary` are sufficient for POC observability |
| 7 | Rate limiting on captureFeedback public surface | Plan 05-01 (controller + @nestjs/throttler guard) owns this — there's no public endpoint in this plan |

## 5. Audit & Compliance Readiness

### Defensible Audit Evidence
- **PASS**: Every state transition (queued → processing → processed/failed) emits a named structured log with consistent payload shape. `adaptation.drain_summary` gives ops a single record per drain call for SIEM ingestion.
- **PASS**: `sourceMessageId` FK with SetNull preserves queue audit history after ChatMessage deletion; forensic investigators can still correlate retag actions with the assistant turn that triggered them (pre-delete).
- **PASS**: PII-safe: userFeedback persisted (required for learning signal) but never appears in logs; log events carry only lengths + booleans + IDs.

### Silent Failure Prevention
- **PASS post-fix**: `adaptation.retrieval_outcome_shape_unknown` catches ChatService contract drift — an auditor reviewing the log stream would see the drift instead of silent signal loss.
- **PASS post-fix**: `adaptation.capture_error` payload specified — alerting rules can reference exact keys.
- **PASS**: AdaptationService never throws (fail-soft on every branch) — ChatService.sendMessage remains a clean contract even under adaptation-side failure.

### Post-Incident Reconstruction
- **PASS post-fix**: Every queue row has `sourceMessageId` (nullable after message delete), `reason` enum, `attempts`, `lastError`, `createdAt`, `updatedAt` — a full state machine visible in one SELECT.
- **PASS post-fix**: Failed-item lockout (`MAX_RETAG_ATTEMPTS=3`) prevents thrashing AND leaves the failed row in place with `lastError` — postmortem can identify chronic-failure content.
- **GAP (deferred)**: No metadata-diff signal — can't retrospectively ask "did this retag actually change anything?". Accepted risk for POC.

### Ownership & Accountability
- **PASS**: Clear module ownership (`AdaptationModule` in `apps/api/src/modules/adaptation/`), single service, DI-visible dependency on IngestModule.
- **PASS**: Scope limits explicit — what this plan owns, what's deferred to 05-01 / 05-02, what's out of scope forever.

## 6. Final Release Bar

### Must Be True Before Ship

1. All 6 must-have + 7 strongly-recommended upgrades applied. ✓ (applied in place)
2. Migration SQL reviewed at human-verify checkpoint before deploy. (Enforced by `autonomous: false` + checkpoint task.)
3. `probe:adaptation` 15/15 pass.
4. `probe:eval` exit 0 with documented threshold.
5. No regressions: `probe:chat` 15/15, `probe:suggestions` 14/14, `probe:retrieval` 9/9, `probe:ingest` clean.
6. All 8 grep-based verifications in `<verification>` green.

### Remaining Risks If Shipped As-Is

- **Observability cardinality**: `adaptation.drain_summary` + per-row `adaptation.retag_processed` logs will generate moderate volume. For POC on NeonDB logs this is fine; if log costs become an issue, move to OTel metrics (deferred item 6).
- **Claude cost drift**: drain can still cost money if processReTagQueue is called on a cron and the queue is continuously non-empty. Manual-only drain in this plan mitigates; if 04-03 gets a scheduled drainer in a later plan, add a per-day token budget.
- **Eval harness variance**: Claude responses vary day-to-day. A single 0.6 pass-rate threshold will sometimes flake. Acceptable for manual runs; revisit when CI-gated.
- **Heuristic false-positives** (inherited from Plan 04-02 deferred item): if a question contains both STOCK_GATE and CUTOFF_GATE keywords but means neither, the suggestions subsystem still fires — but this plan doesn't worsen that; 04-03's feedback loop is the explicit mitigation path.

### Sign-Off

**Yes.** I would approve this plan as revised for the POC production surface. The must-have upgrades close the release-blocking gaps (cost containment, FK integrity, silent-failure prevention, broken build commands). The strongly-recommended upgrades turn the adaptation loop into an auditor-friendly observable state machine. Risks remaining are either explicitly deferred with clear triggers or inherent to a POC that hasn't yet seen production data.

---

**Summary:** Applied 6 must-have + 7 strongly-recommended upgrades. Deferred 7 items (all with explicit scope-owners or triggers).

**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
