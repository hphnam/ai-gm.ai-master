# Enterprise Plan Audit Report

**Plan:** .paul/phases/03-retrieval-layer/03-02-PLAN.md
**Audited:** 2026-04-18 17:50
**Verdict:** conditionally acceptable → enterprise-ready after applied fixes

---

## 1. Executive Verdict

As presented pre-audit: **conditionally acceptable**. The architecture is right — Zod passthrough schema in `@gm-ai/types`, real NestJS IngestService owning the full Claude→validate→resolve→embed→persist flow, seeder reduced to a caller, probe-ingest to prove agentic emergence on a fresh doc. The boundaries correctly prevent ops-data from routing through the ingest path.

The pre-audit issues were all implementation-sharpness problems, not architectural ones: an unspecified `max_tokens` that invites fail-soft flakes when emergent keys inflate the response, a contingent cross-ref resolution path that forces the executor to reason about Prisma 7 JSON-filter compatibility mid-task, a probe cleanup that was marked "either pattern is fine" (it's not — guaranteed cleanup is table-stakes), a sweep for deleted code that existed in prose but not as a verify gate, and an agentic-emergence claim in AC-3 that nothing actually enforced.

Post-fix: **enterprise-ready**. Would I sign off for APPLY? **Yes.** The pipeline is small enough to reason about end-to-end, the probe is focused, and the emergent-keys check in probe-seed turns the "Claude must keep being agentic" claim from aspiration into a regression gate.

## 2. What Is Solid (Do Not Change)

- **`passthrough()` with known optional fields + emergent keys** — the exact shape the agentic vision demands. Zod validates known fields' types without rejecting unknown keys. No enum, no rigid taxonomy.
- **Embedding text composition excludes emergent keys** — smart call. Keeps retrieval signal focused on known axes (title, summary, tags, crossRefs, content) while letting metadata get as noisy as Claude wants.
- **Fail-soft still embeds on content alone** — row remains searchable even when enrichment fails. Matches the "no hidden spoofing / no hallucination cover" guardrail from CONTEXT.md.
- **`$transaction` wrapping upsert + raw-SQL vector write** — atomicity between row persistence and embedding, so a probe that checks "embedding IS NOT NULL" can trust its result.
- **Scope limits on mock_stock** — stock items explicitly stay OUT of IngestService. Correct: they're structured data, not documents; routing them through Claude would waste tokens and muddy the contract.
- **Probe UUID `f0000000-*`** — follows the established fixture-UUID convention (d- mockStock, e- knowledge, f- probe) with no collision risk.
- **Task 3.3 deletes `enrichment.service.ts` outright** — no "thin wrapper" dead code left behind. Right call.

## 3. Enterprise Gaps Identified

### Gap A — Claude `max_tokens` not specified
Task 2's Claude call inherits the SDK default or the pattern from EnrichmentService (1024). Agentic ingest asks for summary (1-2 sentences, ~100 tokens), tags (3-8 strings, ~50 tokens), docType (~10 tokens), crossRefs (each ~30-50 tokens), AND emergent keys. On a long SOP (ice machine troubleshooting is ~500 words), the prompt context is already ~800 tokens; the response can easily hit 1000+ when Claude is doing its job. Truncated JSON = parse failure = fail-soft = silent quality loss.

### Gap B — probe-ingest cleanup is "either pattern is fine"
The plan's Task 4 `Avoid` block allowed a try/finally OR an inline cleanup. Not acceptable: if ingest throws (Claude 503, network blip, Zod validation crash), the probe row persists in the DB until the next probe-ingest run's pre-clean. That's a small but real trust leak on an integration probe.

### Gap C — EnrichmentService removal swept in prose only
Task 3.3 says "delete enrichment.service.ts" but the Task 3 verify block didn't grep for dangling references. If seed.module.ts barrel-exports it, or if a future import survives elsewhere (test file, script, etc.), the executor discovers it at build time but then has to diagnose from a compile error instead of seeing the sweep upfront.

### Gap D — Cross-ref resolution has a conditional path
Task 2 step 4 presented an `OR` branch with `metadata.path.string_contains` and explicit language "If Prisma's JSON `string_contains` filter path is not available on the current Prisma 7 version, fall back to just the `content` contains check." Prisma 7's JSON filter API on Postgres is version-sensitive; asking the executor to discover compatibility mid-task is friction. Plus: no `orderBy` — non-deterministic first match across re-seeds.

### Gap E — Agentic-emergence claim unenforced
AC-3 reads "at least 3 of 6 rows have a non-empty `crossRefs` array OR a non-starter emergent key (proving emergence isn't theoretical)." But Task 3's verify step only says "check seed log output." A claim that depends on log-scraping is one Slack message away from being forgotten. As Claude's training evolves, it may get more conservative on emergent keys; without a hard gate, that regression is silent.

### Gap F — probe-ingest has no retry on fail-soft
One-shot Claude flake (rate limit, network reset, malformed JSON that fence-stripping + one retry couldn't recover) triggers fail-soft, which produces `{ tags: [], summary: null }`. probe-ingest's assertion `metadata.tags length >= 3` then hard-fails. That red-flags a transient issue as a regression.

### Gap G — probe-ingest bootstraps AppModule
`NestFactory.createApplicationContext(AppModule, ...)` pulls in every module: embeddings, ingest, seed, plus any future controllers/modules. For a focused probe, that's broader than needed — any failure in an unrelated module's OnModuleInit (e.g. a Claude-API-key check for a future module) would break probe-ingest. IngestModule is the exact scope.

### Gap H — `findFirst` on cross-refs is non-deterministic
Without `orderBy`, the same ref text matching multiple docs can return different ids across re-seeds. The seed output becomes a function of DB index layout — which shifts. Makes debug/repro harder.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Claude `max_tokens` unspecified (Gap A) | Task 2 step 1 | Explicit `max_tokens: 2048` inline with rationale on why 1024 is too low for agentic ingest. Verification grep added. |
| 2 | probe-ingest cleanup was optional (Gap B) | Task 4 script body; Task 4 Avoid block; AC-4 | Rewrote Task 4.1 with mandatory try/finally around cleanup in main(); tightened the Avoid to say cleanup is REQUIRED; AC-4 updated to require the try/finally shape. Verification grep added. |
| 3 | EnrichmentService removal not swept (Gap C) | Task 3 verify; overall verification | Task 3 verify now includes `grep -rnE "EnrichmentService\|enrichKnowledgeDoc\|enrichSop"` expecting zero matches. Also added to top-level verification checklist. |
| 4 | Cross-ref resolution conditional + non-deterministic (Gap D + partial Gap H) | Task 2 step 4 | Removed the OR branch with `metadata.path.string_contains`. Kept the single `content: { contains, mode: 'insensitive' }` strategy plus `orderBy: { createdAt: 'asc' }` for determinism. Removed the "fallback if Prisma version" prose. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 5 | Agentic-emergence unenforced (Gap E) | New Task 3.4; Task 3 files list; frontmatter files_modified; boundaries | Added Task 3.4 — update probe-seed.ts with tiered agentic-emergence threshold (hard-fail <2 of 6; WARN <3 of 6; PASS ≥3 of 6). Added probe-seed.ts to Task 3 files list and frontmatter files_modified. Boundary on probe-seed relaxed to allow this specific addition only. |
| 6 | probe-ingest no retry-on-failsoft (Gap F) | Task 4 script body; AC-4 | Added a one-shot retry when the first ingest hits fail-soft (empty tags + null aiSummary). Only genuine regressions fail both. AC-4 updated. |
| 7 | probe-ingest bootstraps AppModule (Gap G) | Task 4 script body; Task 4 Avoid; AC-4; verification | Changed `createApplicationContext(AppModule, ...)` → `createApplicationContext(IngestModule, ...)`. Avoid block tightened. AC-4 + verification updated with grep check. |
| 8 | Non-deterministic findFirst (Gap H) | Task 2 step 4 | Added `orderBy: { createdAt: 'asc' }` to the cross-ref resolution query. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Unit tests for IngestService (prompt validation, Zod validation path, cross-ref resolution) | POC scope excludes dedicated test coverage; probe-seed + probe-ingest cover integration happy-path + emergence threshold. Dedicated unit-test plan pre-launch if needed. |
| 2 | Rate limiting / retry backoff on Claude | 6 sequential calls at seed + 1 at probe = trivial scale. Adds complexity without payoff at this stage. |
| 3 | Cross-ref resolution performance (O(N) queries per doc) | Corpus is 6 docs. Re-evaluate if corpus crosses ~100 docs — batch the findFirst via `in` clause on a candidate list, or move to a sweep job. |
| 4 | Negative-path test for Zod validation failure | The fail-soft branch itself is integration-tested implicitly when Claude returns malformed JSON. Unit-testing the branch adds test infra for POC — not worth it yet. |
| 5 | Cross-reference consistency sweep (re-resolving crossRefs when docs mutate) | Plan 04-03's adaptation-loop scope will re-ingest docs when they get flagged; cross-refs get refreshed there. No separate sweep needed pre-04-03. |

## 5. Audit & Compliance Readiness

**Audit evidence (post-fix):** The plan now produces defensible artefacts at every gate: Zod parse is deterministic, the Claude contract is documented in Task 2 step 1 verbatim, `max_tokens` is verifiable by grep, cross-ref resolution is deterministic via `orderBy`, probe-seed has a numerical emergent-keys threshold, probe-ingest has guaranteed cleanup + retry. A reviewer can trace each AC to a grep-able or SQL-verifiable assertion.

**Silent-failure prevention:** Fail-soft persists an `ingest.failsafe` log event (inherited from Plan 03-01's pattern). probe-seed now hard-fails on <2 of 6 rows with emergence — not just tags/docType. probe-ingest retries on fail-soft so a single Claude blip doesn't red a CI run that should be green.

**Post-incident reconstruction:** The Claude prompt is in-plan and in-code (Task 2 step 1); metadata Json in knowledge_items preserves the exact Zod-parsed output; `retrievedItemIds` + `toolCallLog` on ChatMessage (from Plan 03-01) will later record what retrieval + tools saw for any given chat turn. Plan 04-03's adaptation loop consumes this trail. Everything needed to answer "why did the AI say that about this doc" is persisted.

**Ownership & accountability:** Plan scopes to one service (IngestService) owned by the seed + (future) chat paths. Task 3.3 eliminates the duplication risk of having both EnrichmentService and IngestService coexist. The emergent-keys threshold in probe-seed attaches a named gate to the "agentic" claim.

**Would it fail a real audit?** Pre-fix: the unenforced emergence claim + the conditional cross-ref path would get flagged ("contracts must be verifiable, not aspirational"). Post-fix: the pipeline stands up to review.

## 6. Final Release Bar

**What must be true before this plan ships (post-fix all satisfied in PLAN.md):**
- Zod schema in `@gm-ai/types` with `passthrough()`; known fields documented; dist build works
- IngestService owns the full ingest flow with `max_tokens: 2048`, fence-strip + 1-retry, Zod validation, deterministic cross-ref resolution, $transaction-wrapped persistence
- EnrichmentService deleted; sweep grep verifies no dangling references
- Seeder delegates 100% of knowledge-doc persistence to IngestService
- probe-seed hard-fails on <2 of 6 rows with emergent keys/crossRefs (regression canary)
- probe-ingest bootstraps IngestModule (not AppModule), retries on fail-soft, guarantees cleanup via try/finally
- All four ACs have hard gates (grep, count, latency, row-presence)

**Remaining risks if shipped as-is (post-fix):**
- Claude's training evolves and emergent-keys output diminishes — the probe-seed threshold catches it, but only when someone runs seed + probe. If the seed fixture rarely changes, drift could go unnoticed for months. Mitigation: run probe-seed as part of every deploy or as a scheduled check. Deferred to CI/CD plan (post-POC).
- Cross-ref resolution via content-contains is English-only and phrase-sensitive. "Ice machine" matches; "the ice machine, specifically the EC 106 model" may not match cleanly. Acceptable for POC; revisit via embedding-based resolution in Plan 03-03 if retrieval quality suffers.
- `$transaction` around upsert + raw SQL vector write: Prisma's `tx.$executeRawUnsafe` pattern works in 7.x but has been known to deadlock on concurrent vector writes. Scale is 1 probe + 6 seed = 7 sequential writes. Acceptable.

**Sign-off:** I would sign my name to this plan post-fix. IngestService is the right abstraction, the scope is tight, the emergent-keys gate turns an architectural claim into a CI gate, and the probe + seed both operate under guaranteed cleanup + retry semantics.

---

**Summary:** Applied **4** must-have + **4** strongly-recommended upgrades. Deferred **5** items (all with explicit scope-owners or triggers).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
