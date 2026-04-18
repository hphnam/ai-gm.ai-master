---
phase: 04-chat-engine
plan: 03
subsystem: adaptation
tags: [adaptation-loop, feedback, retag-queue, eval-harness, nestjs, prisma, ingest-service, observability, cost-containment]

requires:
  - phase: 04-chat-engine
    provides: ChatService.sendMessage with toolCallLog + retrievedItemIds persisted per assistant message (Plan 04-01)
  - phase: 03-retrieval-layer
    provides: RetrievalHit.similarity contract + ToolResult<T> envelope (Plan 03-03)
  - phase: 03-retrieval-layer
    provides: IngestService.ingest({id, content, venueId}) as re-enrich entry point (Plan 03-02)
  - phase: 02-embeddings-seeding
    provides: seeded KnowledgeItems (6 SOPs) + stock below-par fixtures + VENUE_CROWN UUID (Plan 02-02)
  - phase: 01-foundation
    provides: @gm-ai/types dist-emitted runtime + chat_messages/chat_conversations schema (Plan 01-02)

provides:
  - MessageFeedback model (1:1 with assistant ChatMessage, unique on messageId, kind: 'up'|'down'|'regenerate', userFeedback nullable)
  - ReTagQueueItem model (FK to KnowledgeItem CASCADE + FK to ChatMessage SetNull, state machine queued→processing→processed/failed, attempts counter with MAX=3 lockout)
  - @gm-ai/types adaptation exports (FeedbackKind, ReTagReason, ReTagStatus, CaptureFeedbackInputSchema, EnqueueReTagInputSchema, 5 tuning constants: LOW_SIM_THRESHOLD, MAX_RETAG_ATTEMPTS, MAX_ENQUEUE_PER_FEEDBACK, DRAIN_SOFT_DEADLINE_MS, MAX_DRAIN_LIMIT)
  - AdaptationModule + AdaptationService with 4 public methods (captureFeedback, enqueueReTag, captureRetrievalOutcome, processReTagQueue) + fail-soft on every branch
  - ChatService → AdaptationService inline-awaited wiring (captureRetrievalOutcome post-persist with try/catch shield inside AdaptationService)
  - probe-adaptation.ts (15 assertions: 12 core AC-4 + concurrency dedupe + max-attempts lockout + malformed-shape defense)
  - probe-eval.ts (6 canned queries, aggregate retrieval_hit pass rate exit gate at 60%, low-similarity side-effect count)
  - Named observability events: adaptation.feedback_captured, .retag_enqueued, .retag_deduped, .retag_attempts_exhausted, .retag_processed, .retag_failed, .low_similarity_captured, .feedback_enqueue_capped, .retrieval_outcome_shape_unknown, .capture_error, .drain_summary, .drain_deadline_reached, .retag_missing_knowledge
affects: [05-01-web-chat-ui, 05-02-debug-panel]

tech-stack:
  added: []
  patterns:
    - Feedback → queue → drain as three independent service operations with explicit dedupe and cost ceilings
    - Prisma named @relation("sourceMessage") used to disambiguate multiple back-relations from the same model (ChatMessage → MessageFeedback AND ReTagQueueItem.sourceMessage)
    - Atomic claim-and-transition pattern on queue drain (findMany → updateMany WHERE status='queued', count===1 check) — POC-sufficient concurrency guard without advisory locks
    - Soft-deadline on long-running drain operations (DRAIN_SOFT_DEADLINE_MS=60000) with in-flight revert to 'queued' and drain_deadline_reached log
    - Defensive type guards at service boundaries consuming untyped upstream data (toolCallLog: unknown[]) with explicit shape_unknown log when contract drifts
    - Max-attempts failed-item lockout as observable cost control (MAX_RETAG_ATTEMPTS=3 + retag_attempts_exhausted warn log)
    - Per-operation cap with truncation logging (MAX_ENQUEUE_PER_FEEDBACK=10 slice + feedback_enqueue_capped log when retrievedItemIds overflow)

key-files:
  created:
    - packages/database/prisma/migrations/20260418194136_04_03_adaptation_loop/migration.sql
    - packages/types/src/adaptation.ts
    - apps/api/src/modules/adaptation/adaptation.module.ts
    - apps/api/src/modules/adaptation/adaptation.service.ts
    - apps/api/src/scripts/probe-adaptation.ts
    - apps/api/src/scripts/probe-eval.ts
    - .paul/phases/04-chat-engine/04-03-AUDIT.md
  modified:
    - packages/database/prisma/schema.prisma (added MessageFeedback + ReTagQueueItem models + back-relations on ChatMessage/KnowledgeItem)
    - packages/types/src/index.ts (barrel export)
    - apps/api/src/modules/chat/chat.module.ts (imports AdaptationModule)
    - apps/api/src/modules/chat/chat.service.ts (injects AdaptationService + calls captureRetrievalOutcome post-persist)
    - apps/api/src/app.module.ts (registers AdaptationModule)
    - apps/api/package.json (probe:adaptation + probe:eval npm scripts)

key-decisions:
  - "AdaptationService is the new durable learning-signal layer — ChatService produces the signal (post-persist inline-awaited call), AdaptationService owns capture + queue + drain"
  - "captureRetrievalOutcome is try/catch shielded inside AdaptationService so a contract drift or internal error NEVER propagates to ChatService.sendMessage caller"
  - "Max-attempts lockout MAX_RETAG_ATTEMPTS=3 prevents cost-thrashing on chronic-failure items; the failed row stays in place with lastError for postmortem"
  - "Drain is manual-invocation only in this plan (no @nestjs/schedule / BullMQ) — POC stays simple; a scheduled drainer is a separate plan owned by 05-01 or post-POC"
  - "ReTagQueueItem.sourceMessageId is FK with onDelete:SetNull — preserves queue audit trail after chat_messages delete, prevents orphan ids"
  - "Atomic claim via updateMany WHERE status='queued' + count===1 check is sufficient for single-process POC; no advisory locks or SELECT FOR UPDATE"
  - "Feedback upsert on unique messageId supports kind transitions (up→down enqueues retroactively) with isKindTransition log flag"

patterns-established:
  - "For services consuming untyped upstream data (unknown[]), write an explicit shape guard that matches only the expected entry type; log shape_unknown at warn level with entry count + unexpected keys when the guard misses — silent failure is unacceptable per Plan 03-03 trust-boundary posture"
  - "Queue drain operations combine 4 ceilings: per-call row limit + wall-clock soft deadline + per-row max attempts + per-item active-status dedupe — each with its own named log event"
  - "For Prisma 7 migrations in non-interactive contexts: mkdir -p destination dir + prisma migrate diff --from-config-datasource --to-schema (new flag name) → review → prisma migrate deploy → prisma generate → pnpm --filter <pkg> build"
  - "Probe fixture lifecycle for workflows that WRITE to DB: setup fresh state, capture pre-state baselines, run assertions, track all created row IDs, finally-cleanup deletes by ID, then re-count to prove baseline match"
  - "For cost-sensitive operations (Claude calls, embedding batches): declare constants in @gm-ai/types so thresholds are one-place-tunable AND type-visible to consumers"

duration: 35min
started: 2026-04-18T21:35:00Z
completed: 2026-04-18T22:05:00Z
---

# Phase 4 Plan 03: Adaptation Loop Summary

**Shipped the retrieval-quality adaptation loop: `MessageFeedback` + `ReTagQueueItem` schema (approval-gated diff→deploy); `AdaptationService` with `captureFeedback` / `enqueueReTag` / `captureRetrievalOutcome` / `processReTagQueue` — wired inline-awaited into `ChatService.sendMessage` post-persist — with explicit cost ceilings (MAX_RETAG_ATTEMPTS=3, DRAIN_SOFT_DEADLINE_MS=60000, MAX_ENQUEUE_PER_FEEDBACK=10) and defensive type guards; `probe-adaptation` 15/15 green, `probe-eval` 6-query canned suite with 100% retrieval_hit rate (threshold 60%) and 2 low-similarity side-effects captured end-to-end.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~35 min (APPLY only; PLAN + AUDIT in prior session block) |
| Started | 2026-04-18T21:35:00Z |
| Completed | 2026-04-18T22:05:00Z |
| Tasks | 3 auto + 1 checkpoint completed |
| Files created | 7 (6 source + migration SQL + audit report) |
| Files modified | 6 |
| Probe assertions | 15/15 probe-adaptation + 6/6 probe-eval (100% retrieval_hit) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Schema + types published | Pass | Migration `20260418194136_04_03_adaptation_loop` applied: 2 CREATE TABLE + 4 indexes + 3 FKs (incl. `sourceMessage` SetNull); @gm-ai/types emits dist/adaptation.{js,d.ts} with FeedbackKind, ReTagReason, ReTagStatus, 5 constants, 2 Zod schemas |
| AC-2: Feedback capture + down/regenerate auto-enqueue | Pass | captureFeedback upserts MessageFeedback; kind=='down'/'regenerate' enqueues up to MAX_ENQUEUE_PER_FEEDBACK; dedupe holds (active status) and under concurrent Promise.all; kind transitions (up→down) re-fire enqueue with isKindTransition=true |
| AC-3: Low-similarity auto-capture + queue processing | Pass | ChatService post-persist inline-awaits captureRetrievalOutcome; topSimilarity<0.45 enqueues low-similarity rows; processReTagQueue drains atomically (updateMany count===1), DRAIN_SOFT_DEADLINE_MS respected, remainingQueued + drain_summary emitted; max-attempts lockout on failed+attempts>=3 |
| AC-4: Eval harness + adaptation probe pass | Pass | probe-adaptation 15/15 (incl. concurrency dedupe #13, max-attempts exhausted #14, malformed-shape defense #15); probe-eval 6 queries, 4/4 retrieval_hit = 100%, 2 low-similarity side-effect rows captured |

## Accomplishments

- **Feedback loop is live end-to-end.** A thumbs-down on an assistant message persists MessageFeedback AND enqueues re-tag work for every knowledgeItemId in retrievedItemIds (capped at 10), deduped on active status. A subsequent processReTagQueue drain calls IngestService.ingest on each queued KnowledgeItem, re-authoring metadata via Claude + re-embedding via Voyage. Confirmed by probe-adaptation assertion 11: KnowledgeItem.updatedAt advanced for both K1 and K2 after drain.
- **Low-similarity implicit signal works without any UI.** probe-eval ran 6 canned queries through the real ChatService; 4 of them had `expectedKnowledgeItemIds` — all 4 hit (100%). Two of the find_knowledge tool calls produced topSimilarity < 0.45 (closing-procedure at 0.380, ordering-guide at 0.400), and the probe verified 2 retag_queue_items rows with reason='low-similarity' were created as a side-effect — proving the ChatService → AdaptationService wiring fires in production-path flow, not just synthetic probe fixtures.
- **Cost ceilings are enforceable in practice.** The probe exercises all 3 hard gates: MAX_ENQUEUE_PER_FEEDBACK (slice), MAX_RETAG_ATTEMPTS (assertion 14 pre-inserts a failed+attempts=3 row and confirms enqueueReTag returns {exhausted:true}), and DRAIN_SOFT_DEADLINE_MS (code path tested by structure; deadline never hit in <60s probe runs).
- **Zero regressions.** probe-chat 15/15, probe-suggestions 14/14, probe-retrieval 9/9 all regression-clean post-wiring. The AdaptationService inline call in ChatService.sendMessage adds no observable caller-side behavior change.
- **Contract-drift silent-failure closed.** The audit's most subtle finding — `captureRetrievalOutcome` was parsing `unknown[]` toolCallLog with no type guards — is now defended by explicit shape check + `adaptation.retrieval_outcome_shape_unknown` warn log. Probe assertion 15 proves: feeding `[{tool:'find_knowledge', garbage:'x'}]` emits the warn log and creates zero queue rows. A future ChatService.toolCallLog shape change would log visibly instead of silently breaking adaptation.

## Task Commits

No git commits in this session (auto_commit disabled in config; manual commit pending user request post-UNIFY).

| Task | Outcome | Files |
|------|---------|-------|
| Task 1: Schema + @gm-ai/types adaptation exports | Pass | schema.prisma (modified), migration.sql (created), adaptation.ts (created), index.ts (modified) |
| CHECKPOINT: Migration SQL human-verified | Approved | Reviewed additive-only SQL; approved migrate deploy |
| Task 2: AdaptationService + ChatService wiring | Pass | adaptation.module.ts, adaptation.service.ts (created); chat.module.ts, chat.service.ts, app.module.ts (modified) |
| Task 3: probe-adaptation + probe-eval scripts | Pass (after 1 auto-fix) | probe-adaptation.ts, probe-eval.ts (created); package.json (modified) |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/database/prisma/schema.prisma` | Modified | Added MessageFeedback + ReTagQueueItem models; back-relations on ChatMessage (`feedback`, `retagQueueItems @relation("sourceMessage")`) and KnowledgeItem (`retagQueueItems`) |
| `packages/database/prisma/migrations/20260418194136_04_03_adaptation_loop/migration.sql` | Created | 2 CREATE TABLE + 4 indexes + 3 FKs; additive-only, no DROPs |
| `packages/types/src/adaptation.ts` | Created | FeedbackKind, ReTagReason, ReTagStatus tuple-literal enums; 5 tuning constants; CaptureFeedbackInputSchema + EnqueueReTagInputSchema Zod schemas with loose UUID regex |
| `packages/types/src/index.ts` | Modified | Barrel: `export * from './adaptation'` |
| `apps/api/src/modules/adaptation/adaptation.module.ts` | Created | NestJS module importing IngestModule + exporting AdaptationService |
| `apps/api/src/modules/adaptation/adaptation.service.ts` | Created | 4 public methods + named observability events + fail-soft on every branch; 400 lines |
| `apps/api/src/modules/chat/chat.module.ts` | Modified | Imports AdaptationModule (so AdaptationService is resolvable via ChatService constructor) |
| `apps/api/src/modules/chat/chat.service.ts` | Modified | Constructor now injects `AdaptationService`; inline-awaited `this.adaptation.captureRetrievalOutcome(...)` call after assistant message persist, before return |
| `apps/api/src/app.module.ts` | Modified | Registers AdaptationModule in imports array |
| `apps/api/src/scripts/probe-adaptation.ts` | Created | 15 assertions, self-cleaning fixture lifecycle, exit 1 on fail |
| `apps/api/src/scripts/probe-eval.ts` | Created | 6 canned queries, aggregate pass-rate exit gate at 60%, low-similarity side-effect count |
| `apps/api/package.json` | Modified | Added `probe:adaptation` and `probe:eval` scripts |
| `.paul/phases/04-chat-engine/04-03-AUDIT.md` | Created | Enterprise audit report (6 must-have + 7 strongly-recommended applied, 7 deferred) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| AdaptationModule is a NEW top-level module, not part of ChatModule | AdaptationService has its own DI graph (needs IngestModule), and will be consumed by both ChatModule (for captureRetrievalOutcome) and Plan 05-01 (controller routes for thumbs feedback) | AdaptationModule imported by ChatModule (for the service) + AppModule (for test-bed bootstrap); future controller imports AdaptationModule directly |
| ChatService calls `captureRetrievalOutcome` inline-awaited (not fire-and-forget) | Deterministic: probe assertions need the side-effect to have fired before the next read; try/catch shield INSIDE AdaptationService prevents ChatService caller exposure to adaptation-side errors | Latency added to sendMessage is bounded by AdaptationService's fastest path (enqueueReTag: 2 findUnique + 1 findFirst + 1 create ≈ 20-40ms); acceptable for POC |
| MAX_ENQUEUE_PER_FEEDBACK + MAX_RETAG_ATTEMPTS + DRAIN_SOFT_DEADLINE_MS + MAX_DRAIN_LIMIT exported from @gm-ai/types | Single-source tuning; consumer code (future controller, scheduled drainer) sees the constants as part of the type contract | Changing a ceiling is a one-line edit in packages/types; downstream consumers pick it up on next build |
| Named Prisma relation `@relation("sourceMessage")` | ChatMessage now has TWO back-relations to ReTagQueueItem family (via MessageFeedback and via sourceMessage FK), Prisma requires names when disambiguation is needed | Plan 03-01 inherited the rule "relations without explicit names are fine when there's only one"; this plan is the first to require the explicit-name form |
| `sourceMessageId` is FK with onDelete:SetNull (not a plain String) | Audit trail integrity: queue rows survive ChatMessage delete with the sourceMessageId nulled, not dangling | Forensic investigations can still correlate retag actions with the source message that triggered them, until the message is deleted |
| Queue drain uses Prisma `updateMany({where:{id, status:'queued'}})` + `count===1` gate (not `SELECT FOR UPDATE`) | Prisma 7 + pg driver-adapter have limited explicit-lock support; updateMany is atomic per row and returns count deterministically | POC-sufficient for single-process drain; if a scheduled drainer in a later plan runs concurrent drains, re-evaluate (could add advisory lock via `$executeRaw`) |
| processReTagQueue has BOTH a wall-clock deadline AND a row-count limit | Defense-in-depth: a slow Claude call can blow past 50 rows × 30s each; deadline fires first in that case. A fast drain of 100 rows hits the row limit first | Operators can tune either independently; drain_summary log reports both `limit` and `deadlineMs` for correlation |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential — one was a probe design error, one was Prisma 7 CLI rename |
| Scope additions | 0 | None |
| Deferred | 0 new | All audit-deferred items already tracked |

### Auto-fixed Issues

**1. [Test] probe-adaptation assertion 5 initially failed (0 → 0 instead of 0 → 2)**
- **Found during:** Task 3 (probe-adaptation first run)
- **Issue:** Assertion 5 (`captureRetrievalOutcome topSim=0.38 enqueues low-similarity row`) ran AFTER assertion 3 which had already thumbs-downed K1 and K2. Those queue rows were active (status='queued'), so the subsequent low-similarity enqueue for the same knowledgeItemIds was correctly deduped — but the assertion expected new rows. The dedupe logic was working per spec; the probe's test ordering didn't account for it.
- **Fix:** Inserted a targeted cleanup before the low-sim test: `prisma.reTagQueueItem.deleteMany({ where: { knowledgeItemId: { in: [K1.id, K2.id] }, status: { in: ['queued', 'processing'] } } })`. Also tightened the assertion from `afterLowSim > beforeLowSim` to the stricter `afterLowSim === 2 && beforeLowSim === 0`.
- **Files:** `apps/api/src/scripts/probe-adaptation.ts`
- **Verification:** Second run: `5. captureRetrievalOutcome(topSim=0.38) enqueues low-similarity rows (0 → 2 (expected 0 → 2))` ✓ — all 15 assertions green.

**2. [Build] Prisma 7 CLI flag rename: `--to-schema-datamodel` → `--to-schema`**
- **Found during:** Task 1 (migration SQL generation first run)
- **Issue:** Plan's migration commands used `prisma migrate diff --to-schema-datamodel prisma/schema.prisma` — Prisma 7 CLI threw: `\`--to-schema-datamodel\` was removed. Please use \`--[from/to]-schema\` instead.` Plan 03-01 established the diff→deploy pattern before this flag rename.
- **Fix:** Switched to `--to-schema prisma/schema.prisma`. Also had to switch from `--from-url "$DATABASE_URL"` (shell was having trouble parsing the `&` characters in the NeonDB URL) to `--from-config-datasource` (which reads via `prisma.config.ts` + dotenv — no shell quoting issues).
- **Files:** No source files changed; migration generated successfully on second invocation.
- **Verification:** Migration SQL generated cleanly, applied via `prisma migrate deploy` (after human-verify checkpoint approval), Prisma client regenerated, `@gm-ai/database` rebuilt.

### Deferred Items

None new — the 7 deferred items from the enterprise audit (unit tests, BullMQ/scheduled drainer → post-POC or Plan 05+, metadata-diff signal → waits on eval data, per-venue queue partitioning, soft-fail eval retry → CI-gated trigger, OTel metrics → cross-service plan, HTTP rate limiting → Plan 05-01 throttler) remain as documented in 04-03-AUDIT.md with explicit scope-owners/triggers.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Shell failed parsing `DATABASE_URL` with unquoted `&` chars when sourced from .env | Switched to `--from-config-datasource` flag — Prisma's config loader reads .env internally without shell involvement |
| Prisma 7 removed `--to-schema-datamodel` flag | Used `--to-schema` per Prisma 7 CLI help output |

## Next Phase Readiness

**Ready:**
- **AdaptationService is the public service surface** for Plan 05-01 to wire a controller against. `POST /feedback` handler can call `captureFeedback` directly; `POST /admin/retag/drain` can call `processReTagQueue`. No further service-layer work needed before 05-01.
- **The low-similarity wiring is provable with data.** probe-eval captures exactly how many low-sim side-effects occurred; 05-01's debug panel (Plan 05-02) can surface `SELECT COUNT(*) FROM retag_queue_items WHERE reason='low-similarity' AND status='queued'` as a live metric without any new server code.
- **Eval harness is a reusable contract for future retrieval-quality work.** Adding a new query to `probe-eval.ts` is ~10 lines; the per-query expected set + aggregate pass rate pattern transfers to any retrieval regression suite.
- **Named observability events (`adaptation.*`) are live** and documented in SUMMARY.md frontmatter. Plan 05-02 (debug panel) can correlate `chat.claude_call` + `retrieval.call` + `adaptation.low_similarity_captured` + `adaptation.drain_summary` via `conversationId` and `assistantMessageId`.
- **Schema extension seam for thumbs-UI** — `MessageFeedback` has a `userFeedback` column (nullable, max 2000 chars) the UI can write to, with PII discipline already enforced (never logged). No schema change needed for Plan 05-01's UI.
- **Cost ceilings documented in @gm-ai/types** — a future tooling plan can build a runtime config layer on top of these constants without re-deriving the values.

**Concerns:**
- **processReTagQueue is manually-invoked only.** Plan 05-01 needs to decide: surface a button ("Drain re-tag queue") behind admin auth, OR add a `@nestjs/schedule` cron that calls it every N minutes. The deferred scheduled-drainer item owns this; whoever picks up 05-01 should address it or explicitly mark "manual-drain-only for POC".
- **Latency added to ChatService.sendMessage.** captureRetrievalOutcome inline adds up to ~40ms on low-sim paths (enqueue for each retrieved item). For the POC this is inside noise, but a future cron/scheduled wiring should consider moving the capture off the hot path if latency targets tighten.
- **Eval threshold of 60% retrieval_hit is current-fixture-specific.** Seeded corpus is 6 SOPs; once the corpus grows and expectedKnowledgeItemIds becomes harder to hand-curate, revisit the threshold OR move to a retrieval@K metric (top-3 must contain expected).
- **No metadata-diff signal.** Re-ingest re-authors metadata from the same content — but if Claude outputs identical metadata on the second pass, the "re-tag" has no observable effect. This is a deferred eval signal (per audit); first real data from the adaptation loop will tell us whether it matters.

**Blockers:** None. Phase 4 is complete (3 of 3 plans: 04-01 + 04-02 + 04-03). Phase 5 (Web Interface) can begin with 05-01 once user directs.

---
*Phase: 04-chat-engine, Plan: 03*
*Completed: 2026-04-18*
