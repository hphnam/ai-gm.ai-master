# Enterprise Plan Audit Report

**Plan:** `.paul/phases/01-hierarchical-retrieval/01-03-PLAN.md`
**Audited:** 2026-04-28T13:42:00+0100
**Verdict:** Conditionally acceptable pre-fix → enterprise-ready post-fix

---

## 1. Executive Verdict

The plan is well-scoped with traceable AC↔task↔boundary linkage and explicit consumption of the 01-02 audit-S7 reservation. APPLY-time ambiguity is appropriately deferred to WebFetch (the @ai-sdk/anthropic surface has historically moved between major versions). However, five non-obvious risks surface under hard review that would not be caught by tests-as-written:

1. **Cross-tier silent assumption** — AC-3 claims "any tier (sonnet/haiku/opus)" while W24 has no tier handling. Haiku 4.5's `usage` shape variance is undocumented in the plan; W24 will be flaky on first haiku-tier production turn.
2. **AC-5/Step-3 cost-banner contradiction** — banner sums Voyage + 6 Sonnet chat turns ($0.032), Step 3 says retrieval-only ($0.001). Internal contradiction; ambiguous execution intent.
3. **No aggregate token-budget enforcement** — CONTEXT.md success-criteria explicitly target 30K input tokens per-turn 95th-percentile; the plan ships section-injection but never asserts the aggregate. 5 sections × 4K-token soft cap = 20K, plus system+tools+history easily blows 30K. No observability, no warn signal.
4. **No wire-level cache_control verification** — AC-3 + AC-4 rely solely on `cache_read_input_tokens > 0` as the wired-correctly signal. That signal is confounded with TTL expiry, identical-prefix accidents, and provider-side caching policy changes. Cannot distinguish "not wired" from "TTL expired" → ops debugging blind spot.
5. **Silent regression risk on system-prompt reorder** — instruction order affects Claude behavior. Reorder is a cache optimization; a quality regression hidden in a cost optimization is the worst-case outcome (degrades silently, attributed to other causes for weeks).

Would I sign my name to this plan as-is? **No.** With the M1-M3 + S1-S7 fixes applied below, **yes.** None of the fixes redesign the architecture; all are localized strengthens within the plan's existing scope.

## 2. What Is Solid (Do Not Change)

- **AC-1 byte-stability requirement** — explicit, testable, traceable. The `formatSectionPayload()` helper in @gm-ai/types/section as single source of truth is exactly the right boundary; prevents prefix-format drift across consumers.
- **AC-5 fallback preservation in Task 1** — "When sectionId is absent, DO NOT inject prefix — pass hit.content through unchanged" — preserves the 01-02 AC-5 graceful-fallback path without dual-coding.
- **CONTEXT D-01-C → audit-S7 of 01-02 → AC-1 of 01-03** — the multi-loop traceability is exemplary. PAUL-framework alignment is real, not ceremonial.
- **APPLY-time WebFetch on AI SDK 6.x cache_control surface** — correct deferral; pinning at plan-time would lock to potentially-stale training-data API knowledge.
- **PII boundary on `chat.cache_observed`** — counts + hashed conversationId only; matches existing `queryHash` pattern from retrieval.service.ts. Internally consistent.
- **Boundaries section** — comprehensive lock on retrieval.service.ts + RetrievalHit shape + ingest.service.ts persistence contract from 01-01/02. Rollback-friendly.
- **Probe-eval as separate harness file** — correctly separated from probe-section (different concerns: structural integrity vs retrieval-quality eval). Prevents future probe-section bloat.
- **Threshold_candidate as observability not auto-flip** — operator decision retained; correct given no consensus on multi-tenant similarity floor.

## 3. Enterprise Gaps Identified

### Cross-tier cache assumption (Must-have)

AC-3 claims neutrality across sonnet/haiku/opus. W24 in Task 3 implicitly assumes Sonnet `usage` shape. Haiku 4.5 has documented response-shape variance from Sonnet (already encountered in this codebase per gm-agent.ts comment on `thinking: 'adaptive'` Haiku 400 rejection). Without tier-conditional assertion handling, W24 is flaky on first haiku-tier production turn. Plan must either:
- Pin W24 assertion to Sonnet tier explicitly (recommended; single-tier production bar)
- OR provide tier-conditional usage-shape adapter (over-engineered for this plan's scope)

### AC-5/Step-3 cost-banner internal contradiction (Must-have)

AC-5 acceptance text: "≤30 Voyage calls × $0.00006 + 6 Sonnet 4.6 chat turns × ~$0.005 = ~$0.032 cap"
Task 3 Step 3 implementation: "Each query runs through ToolDispatcher.dispatch('find_knowledge', ...)" + "probe-eval does NOT call ChatService — retrieval-only"

This contradiction creates execution ambiguity. APPLY agent could reasonably interpret either way — adding chat-path smoke (over-budget per plan) or omitting it (under-spec per AC). Plan must reconcile.

### No aggregate-token-budget enforcement on injected sections (Must-have)

Mathematical risk: 5 hits × 4K-token soft cap = 20K injected-section tokens. With system prompt (~2K), tool defs (~1K), conversation history (~5K typical), and assistant generation overhead, easy to push past 30K input target. CONTEXT.md success-criteria explicitly call out 30K 95th-percentile. The plan ships section-injection but neither observes nor enforces the aggregate.

Required: minimum observability via `aggregateSectionTokens` field in the new `tool_dispatcher.find_knowledge_formatted` log + warn-level event when above a budget threshold. Auto-truncation can defer; visibility cannot.

### No wire-level cache_control verification (Strongly recommended)

AC-3 + AC-4 rely on `cache_read_input_tokens > 0` as the cache-wired-correctly signal. This is necessary but not sufficient:
- First turn always shows 0 (cache creation)
- Inter-turn TTL expiry shows 0 (legitimate — but distinguishable from misconfiguration)
- AI SDK silently dropping cache_control on version mismatch shows 0 — INDISTINGUISHABLE from TTL expiry without a wire-level inspector

Operations runbook will be impossible to write: "if cache_read_input_tokens is 0, check ... [silence]". Must distinguish wiring presence from TTL state.

### System-prompt reorder regression risk (Strongly recommended)

Task 2 Step 2 reorders contextualInstructions from `STATIC + dynamic` to `dynamic + STATIC`. Anthropic + every major LLM provider has documented behavioral sensitivity to instruction position (later-positioned instructions sometimes carry more weight in tool-choice and refusal patterns). Reordering for cache optimization without behavior smoke is the textbook "silent quality regression hidden in cost optimization" anti-pattern.

Mitigation is cheap: 3-query before/after smoke captured in SUMMARY. If quality holds, ship. If degrades, escalate (split system into AI SDK message-parts each marked separately).

### Probe-eval cost banner range error (Strongly recommended)

Plan claims "~$0.001 per run". Actual: 6 fixture KIs × 1-3 sections × 1-3 chunks ≈ 6-54 Voyage embed calls (ingest-time) + 6 query-side embed calls = $0.0004-$0.003. Order-of-magnitude variance. Operator cost dashboards will mis-budget if banner stays at $0.001.

### W26 within-run vs cross-run determinism unclear (Strongly recommended)

`metadata.sectionId` is a random UUID. W26 asserts deterministic ordering across two consecutive dispatches (same probe run, same persisted KIs → same UUIDs). This works within-run. Across DIFFERENT probe runs (fresh fixtures, fresh UUIDs) the IDs differ — but the SORT LOGIC is still deterministic by code. Plan does not clarify this scope, risking future probe-author confusion that "W26 is broken" when fresh runs produce different UUIDs.

### No rollback procedure documented (Strongly recommended)

Plan modifies prompt assembly, tool-result formatting, and provider wiring. Most likely-to-regress change: cache_control wiring in Task 2. Per-task atomic commits ARE the rollback contract — but the plan must explicitly document this so operators reading the SUMMARY know `git revert <task-2-commit>` disables cache wiring without losing Tasks 1+3.

### TTL semantics not documented (Strongly recommended)

Anthropic ephemeral cache is 5-min default. Multi-hour gaps = first turn after gap pays cache_creation. This is expected behavior, NOT a regression. Without documentation, future dev reading "cache_read_input_tokens went to 0 overnight" will assume bug, waste investigation time. One-line boundary mention prevents this.

### Tier observability classification (Strongly recommended)

`chat.cache_observed.tier` field is operator-internal observability. Compliance-adjacent classification matters for SOC-2: tier could be misread as user-facing data. Classify explicitly in JSDoc.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Cross-tier silent assumption — W24 must be tier-explicit | AC-4 + Task 3 W24 | Added: "W24 is **pinned to the Sonnet tier** for assertion stability — Haiku/Opus tiers may differ in `usage` field shape; cross-tier verification is deferred D-01-03-D3 (trigger: first multi-tier dogfood week)". Done line of Task 3 updated to cite Sonnet pin. |
| M2 | AC-5/Step-3 cost-banner internal contradiction | AC-5 + Task 3 Step 3 + verification checklist | Reconciled: AC-5 banner now reads "retrieval-only — 6-54 Voyage embed calls (ingest-time, ~$0.0004-$0.003) + 6 Voyage query calls (~$0.00036) → ~$0.0008-$0.0034 total". Chat-path smoke explicitly OUT of probe-eval scope; deferred D-01-03-D4. Verification cost-log line updated to range. |
| M3 | No aggregate-token-budget enforcement on injected sections | NEW AC-8 + Task 1 Step 4 + Task 3 W27 + verification + types/section.ts | Added: AC-8 enforces aggregateSectionTokens telemetry + warn at 24K threshold. Task 1 Step 4 wires the budget guard via new `AGGREGATE_SECTION_TOKEN_BUDGET = 24_000` constant in types/section.ts. Task 3 adds W27 probe with synthetic budget breach test. Auto-truncation deferred D-01-03-D5. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | No wire-level cache_control verification | AC-3 + Task 2 Step 5 + verify | Added: AC-3 final clause requires verifiability via "typed inspector helper or message-construction snapshot". Task 2 Step 5 wires `inspectAgentProviderOptions(agent): { systemCacheControl, toolsCacheControl }` exported from gm-agent.ts. Verify checklist asserts the helper returns both = 'ephemeral'. |
| S2 | TTL semantics undocumented | AC-4 last clause | Added: "cache TTL semantics are documented: ephemeral 5-min default — multi-hour gaps fall outside the TTL window and the first turn after gap pays cache_creation_input_tokens cost; this is expected behavior and not a regression". |
| S3 | System-prompt reorder silent regression risk | NEW Task 2 Step 6 + verify checklist | Added: 3-query before/after smoke gate (Q-stock, Q-procedure, Q-emergency from probe-eval canned set). If material regression → STOP and revisit ordering. SUMMARY captures comparison text. Verify checklist asserts smoke documented. |
| S4 | Tier observability classification | AC-4 PII clause | Added: "`tier` is operator-only observability and never user-visible". |
| S5 | No rollback procedure documented | success_criteria + verify checklist | Added: per-task atomic commits enable `git revert <task-2-commit> && redeploy` to disable cache_control wiring without losing Tasks 1+3. SUMMARY documents path. |
| S6 | Probe-eval cost banner range error | AC-5 (with M2) + verify checklist | Updated to range: "~$0.0008-$0.0034 (audit-M2 corrected range)". |
| S7 | W26 within-run vs cross-run determinism unclear | Task 3 W26 description | Added: "**Determinism scope (audit-S7):** sectionIds are random UUIDs, so cross-run stability is impossible by design. W26 asserts WITHIN-RUN stability... Cross-run stability is irrelevant: each probe run creates fresh fixtures, sectionIds differ, but the SORT ORDER LOGIC is deterministic by code." |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | Multi-turn message-history cache extension | Already deferred in plan as D-01-03-D1. Trigger: 2 weeks of dogfood after 01-03 lands; revisit if per-turn cost stays >$0.01 target. |
| D2 | Auto-flip default minSimilarity threshold from 0.3 → measured floor | Already deferred D-01-03-D2. Trigger: 3+ tenants observe consistent floor above 0.3. Premature without multi-tenant signal. |
| D3 | Cross-tier (haiku/opus) cache-hit verification — fold from M1 | New deferred D-01-03-D3. Trigger: first multi-tier dogfood week. Sonnet-only pin adequate for v0.3 launch. |
| D4 | Probe-eval chat-path smoke (was in original AC-5 banner) | New deferred D-01-03-D4. Trigger: probe-eval graduates to nightly CI gate (currently on-demand). Adds $0.030 per run; not justified at current cadence. |
| D5 | Auto-truncation when aggregateSectionTokens > budget | New deferred D-01-03-D5. Trigger: first warn fires in production. Today: visibility-only is adequate; auto-truncate-on-budget is its own design decision (which sections to drop?). |
| D6 | Probe-helpers factor (D-01-01-B continued) | Trigger from 01-01 still pending. Plan 01-03 conditionally factors if probe-eval makes the third probe scaffold land. APPLY agent decides at runtime. |
| D7 | Outgoing-request middleware/interceptor for forensic audit logs | New deferred. Trigger: SOC-2 Type II audit requires per-turn input-token forensic reconstruction. v0.3 launch does not need this. |

## 5. Audit & Compliance Readiness

**Audit evidence quality (post-fix):**
- ✅ AC↔task↔probe traceability is end-to-end. `<done>` lines cite specific ACs; probe assertion names cite audit findings.
- ✅ Per-turn cache observability (`chat.cache_observed`) emits structured fields suitable for SIEM ingestion.
- ✅ Aggregate-token observability (`tool_dispatcher.find_knowledge_formatted` + `section_budget_exceeded`) closes the silent-budget-blow-out vector.
- ✅ Wire-level cache_control verification (`inspectAgentProviderOptions`) enables ops runbook: "if cache_read_input_tokens is 0, first call inspector to confirm wiring; if wired, infer TTL expiry."
- ✅ PII boundaries respected: counts + hashes only; `tier` classified explicitly as operator-only.

**Failure-prevention coverage:**
- ✅ Cross-tier silent failure (M1) addressed via Sonnet pin + deferred multi-tier follow-up.
- ✅ Cost-banner ambiguity (M2) reconciled.
- ✅ Token-budget silent overflow (M3) addressed via observability.
- ✅ Cache-wiring silent breakage (S1) addressed via wire-level inspector.
- ✅ System-prompt reorder silent quality regression (S3) addressed via behavior smoke.

**Post-incident reconstruction:**
- ✅ Per-task atomic commits + rollback procedure documented (S5) — `git revert <task-2-commit>` is the documented disable path.
- ✅ AC-7 baseline freeze per plan iteration enables forensic before/after for each Phase 1 plan.
- ✅ Backfill carry-forward UAT noted (production NeonDB validation still pending — operator action, NOT this plan's scope).

**Ownership:**
- ✅ Rollback owner = whoever ships the per-task commits (single ownership per Task 2 commit).
- ✅ Observability owner = ops, with documented log line shapes.
- ⚠️ Threshold-candidate flip (D-01-03-D2) lacks named owner — operator must claim before flipping default minSimilarity. SUMMARY should request explicit confirmation.

**Would fail a real audit?** No (post-fix). The plan defends against silent-failure modes that auditors specifically target: undocumented behavior changes, cost-budget ambiguity, multi-tier provider variance, observability blind spots.

## 6. Final Release Bar

**Must be true before this plan ships:**
- M1 + M2 + M3 applied (above) — DONE
- S1 + S3 applied — DONE (S1 wire-level inspector + S3 reorder smoke)
- Per-task atomic commits delivered (project convention; rollback contract)
- AI SDK 6.x cache_control API surface verified at APPLY time (not plan time) and citation captured in gm-agent.ts JSDoc
- `chat.cache_observed` log emits with non-zero `cache_read_input_tokens` on a 2-turn manual smoke against Sonnet tier
- W27 demonstrates synthetic budget-breach warn fires (avoids "untested observability" tech debt)
- System-prompt reorder smoke captured in SUMMARY with no material regression

**Risks that remain if shipped as-is post-fix:**
- Multi-tier (haiku/opus) cache-hit verification deferred (D-01-03-D3). First non-Sonnet production turn could surface a usage-shape variance — mitigation is the chat.cache_observed defensive null-check from Task 2 Step 4 ("if usage shape doesn't include cache fields, skip the log silently"). Acceptable risk for v0.3 launch where Sonnet is the documented default.
- Auto-truncation on token-budget overflow deferred (D-01-03-D5). Visibility-only this plan; first warn in production = trigger to design auto-truncation. Acceptable; budget threshold (24K) leaves 6K headroom under the 30K target.
- Production backfill UAT against NeonDB still pending (carry-forward from 01-02). Real-prod cache hit demonstration depends on backfilled corpus. Recommend: run `pnpm --filter api backfill:sections` against staging before deploying 01-03.

**Sign-off:** Yes — post-fix this plan is enterprise-grade, audit-defensible, and production-safe for the documented scope (Sonnet-tier chat path, ephemeral 5-min cache TTL, retrieval-only probe-eval). Multi-tier and auto-truncation are explicitly time-boxed deferred items with named triggers.

---

**Summary:** Applied 3 must-have + 7 strongly-recommended upgrades. Deferred 7 items with concrete triggers. AC count raised 7 → 8 (AC-8 aggregate-token budget). Probe assertion target raised 26 → 27 (W27 budget breach). New constants in @gm-ai/types/section: AGGREGATE_SECTION_TOKEN_BUDGET=24000.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
