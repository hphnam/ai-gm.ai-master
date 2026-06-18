# Enterprise Plan Audit Report

**Plan:** `.paul/phases/06-multi-agent-chat-overhaul/06-02-PLAN.md`
**Audited:** 2026-05-01T17:50:00Z
**Verdict:** **conditionally acceptable pre-fix → enterprise-ready post-fix**

---

## 1. Executive Verdict

The 06-02 plan as drafted is well-structured and inherits substantial discipline from 06-01 (M1-M5, AC-7, S4, S6-S10 carry-forward all explicit). The slice is correctly scoped — depth-before-breadth re-slicing is defensible and reduces context overflow risk. Voice corpus locked at 12 with import discipline is correct.

**However, the plan as drafted has 6 must-have gaps that would fail a real audit, mostly around contract clarity at module boundaries:**

1. Critic input shape is loose — operates on optional citation `content`, which means in practice Critic verification will be vacuous (every input trivially passes "approved")
2. safetySignal from Triage is not threaded into WriterInput, so Writer-incident cannot conditionally bake the 999 directive — failing the canary cellar-flooding query
3. `chat_v2.critic_unresolved` event name is semantically wrong (we don't re-verify on retry, so we can't claim "unresolved")
4. Stream phase events lack sequencing (seq + timestampMs) — frontend in 06-04 cannot reconstruct order from out-of-order Pino batched logs
5. Voice corpus authoring has no guardrail against Claude drafting examples that diverge from user voice taste (probe regex would pass; UAT would fail)
6. lowConfidence persistence shape was hand-waved as "metadata column or analogous" — schema verification at PLAN time shows NO metadata column exists; APPLY-time discovery would force a content-prefix marker that violates AC-5/AC-6 voice rules

I would not approve this plan for production as drafted.

**Post-fix verdict: enterprise-ready.** With the 6 must-have findings applied, the plan satisfies the bar. The architecture is sound; the gaps are at boundary contracts and observability — fixable through prescriptive plan edits, not redesign.

---

## 2. What Is Solid (Do Not Change)

- **AC-7 carry-forward (Writer structurally tool-less)** — preserved unconditionally. The 3-mode Writer extension does NOT introduce a tool surface. Probe grep `grep -c "tools:" writer.service.ts === 0` carries through. Architectural correctness.
- **Boundaries enumeration of 06-01 carry-forward** — every audit gate from 06-01 (M1-M5, S4, S6-S10) explicitly listed in 06-02 boundaries with grep verification. Auditor can grep-prove preservation in seconds.
- **CostBreakdown 5-stage extension** — additive, preserves 06-01 sum semantics, key order documented. Probe AC-8 enforces both shape and serialization order.
- **Re-research circuit-breaker at confidence 0.6 + cost ceiling $0.05** — defensible numbers grounded in project's stated $0.01-0.02/turn target. Cost ceiling alignment with budget is sound; threshold is retunable via single constant.
- **Critic threshold-on-reasoning at 0.7** — correctly aligned with cost discipline. Always-on is one constant flip away (D-06-02-G trigger). The decision rationale in CONTEXT.md is defensible against operator review.
- **Voice corpus locked at 12 (4+4+4)** — correctly avoids cargo-culting "more examples = better." Distribution of writing labor across plans is sane.
- **Phase 6 re-slicing 3 → 4** — depth-before-breadth is correct architectural sequencing. Risk concentrated where novel, not where mechanical.
- **Pre-registered deferred items D-06-02-G through M with concrete triggers** — auditor can reconcile each deferral against a measurable production signal. No vague "future work" hand-waves.
- **Critic correction loop bounded to 1 retry (CRITIC_MAX_WRITER_RETRIES=1)** — explicit cap prevents infinite loops. Correct.

---

## 3. Enterprise Gaps Identified

Audit performed against the role of senior principal engineer + compliance reviewer for a regulated environment, multi-year maintenance horizon, post-incident reconstruction discipline.

### Gap 1: Critic verification is vacuous as drafted (MUST-HAVE — release-blocker)
- **Issue:** Plan specifies `Critic.verify(input: { writerDraft: string, citations: Array<{ knowledgeItemId, content?: string }> })`. The `content` field is optional. Researchers don't currently return citation content in their .summary field — the .summary is a synthesized sentence, not the raw citation text. If Critic is invoked with citations missing content, Critic prompt has nothing to verify against → trivially returns "approved" for every input.
- **Impact:** AC-3 + AC-4 pass in stub mode (stubs return canned outputs); production Critic is theatre. Auditor reviewing post-incident finds Critic emitted "approved" on a turn that surfaced a wrong phone number — Critic was structurally unable to catch it because it had no content to verify against.
- **Why must-have:** Catching this at production runtime, not PLAN time, means rebuilding the Critic input contract mid-plan with cascading test changes.

### Gap 2: safetySignal not threaded into WriterInput (MUST-HAVE — release-blocker)
- **Issue:** Triage emits `triageOutput.safetySignal: boolean`. WriterInput in 06-01 has no safetySignal field. Plan as drafted extends WriterInput for `analyserSynthesis` + `corrections` but does not thread `safetySignal`. Writer-incident prompt requires the 999 directive baked in for safety-relevant cases — but cannot conditionally emit it without the signal.
- **Impact:** AC-6 first gherkin (urgency-first regex) passes in stub mode (stub embeds 999 by default), but production Writer with the prompt instruction "include 999 when urgent" is operating on prompt-only signals, not orchestrator-passed signals. Real-Anthropic verification fails on the canary "cellar's flooding" query because Writer guesses urgency level instead of being told.
- **Why must-have:** This is the canary success criterion for Phase 6.

### Gap 3: `chat_v2.critic_unresolved` event name is semantically wrong (MUST-HAVE)
- **Issue:** Plan emits `chat_v2.critic_unresolved` warn whenever Writer retry is dispatched. But "unresolved" implies "we checked again and it's still wrong." We deliberately don't re-verify on retry per CRITIC_MAX_WRITER_RETRIES=1. So we cannot truthfully claim "unresolved" — we don't know.
- **Impact:** Operator alerts driven by this log line will misfire. Ops sees "critic_unresolved" and assumes specific-mismatch persisted; in reality Writer may have fixed it perfectly on retry.
- **Why must-have:** Operator log discipline + auditor reconciliation requires event names that describe WHAT happened, not what we hope happened. Fix via rename to `chat_v2.critic_writer_retry_dispatched`.

### Gap 4: Stream phase events lack sequencing for 06-04 frontend (MUST-HAVE)
- **Issue:** Plan's phase event payload is `{phase, mode, conversationIdHash}`. No sequence number, no timestamp at emission. Pino (NestJS Logger) batches and buffers writes. 06-04 frontend reading these events from a SSE/WebSocket channel cannot reliably reconstruct order — a 'critique' event might arrive before 'analyse' due to write-buffer interleaving.
- **Impact:** 06-04 ships with broken progress UX; partial fix requires re-emitting events with proper sequencing, breaking 06-02's contract.
- **Why must-have:** Forward-contract for 06-04 should be locked NOW, not retroactively. Adding seq + timestampMs is a 2-line change; missing them later requires UI rework.

### Gap 5: Voice corpus authoring has no quality guardrail (MUST-HAVE)
- **Issue:** Task 1 says "Claude drafts REASONING + INCIDENT examples based on /paul:discuss redrafts referenced in CONTEXT.md." But /paul:discuss conversation history may not contain verbatim 8 redrafts; phase-level CONTEXT.md mentions example titles ("flat pint complaint") but doesn't reproduce the user-authored prose.
- **Impact:** Voice corpus passes probe regex (which checks shape only — POSITIVE_REASONING_RE matches "First thing — check the gas..."). But real-Anthropic Writer using these examples produces output that doesn't sound like the user. Discovered in 06-04 UAT cycle. Cost: rewrite 8 examples + re-run UAT.
- **Why must-have:** Voice IS the differentiator per CONTEXT.md ("feels generic" = canary failure). Cheaper to gate at Task 1 with explicit user review checkpoint than discover via UAT.

### Gap 6: lowConfidence persistence shape is hand-waved (MUST-HAVE)
- **Issue:** Plan says "set on chat_messages.metadata (which is a Json? column already on the model — additive, no schema change)." Verification at PLAN time against `apps/api/prisma/schema.prisma` shows ChatMessage has NO metadata column. Plan acknowledges this with fallback "if not, defer to chat_messages.parts (also Json?). If neither exists, register a deferred item D-06-02-O for adding a dedicated column and use a `[LOW-CONFIDENCE]` content prefix as a temporary marker."
- **Impact:** APPLY-time discovery would force the content-prefix path because `parts` is reserved for AI SDK message parts (mixing low-confidence flag with part objects breaks downstream consumers). Content prefix violates AC-5/AC-6 voice rules (no preamble) — the marker would either:
  - Show in user-facing content (voice violation), OR
  - Require runtime stripping (bug surface, fragile)
- **Why must-have:** Pre-decide the persistence target NOW. The existing `toolCallLog` Json column (already JSON-array-shaped per 06-01) can carry a `{tool: 'low_confidence_flag'}` synthetic entry without schema change and without polluting content.

### Gap 7-11 (STRONGLY-RECOMMENDED): observability + tightening
- **S1 Analyser confidence telemetry** — `chat_v2.analyser_confidence_observed` log per turn. Without it, D-06-02-M (threshold retune) is blind.
- **S2 lowConfidence persistence shape lock** (related to Gap 6) — use `toolCallLog`, register D-06-02-N for dedicated column.
- **S3 Critic timeout tightening** — 8s for Haiku no-tool verification is permissive; 4s tracks real-world budget.
- **S4 Writer no raw citation IDs** — Writer receives `citationCount: number`, not citation arrays. Prevents Writer leaking IDs in prose.
- **S5 Re-research empty-questions handling** — composeRefinedBrief must augment when openQuestions empty; otherwise it's just retry, not refined.
- **S6 Stub V21 caveat** — assertion validates stub Writer, not prompt. Document inline; real-Anthropic mode is the actual prompt gate.
- **S7 Triage stub priority order** — safety patterns must check FIRST; without explicit priority, generic 'flat pint' regex catches "pint tasted off and they feel sick" first.
- **S8 probe wall-clock budget** — bump from 120s to 180s (~99 assertions × 2 iterations + retry paths + latency runs).
- **S9 cost-rate citation re-verify** — Anthropic prices may have shifted since 2026-04-28 stamp. Re-verify before APPLY.
- **S10 Critic warn level explicit** — already in plan implicitly; make it explicit boundary.
- **S11 CostTracker unit tests** — adds test coverage for 5-stage shape regression-protection independent of probe.

### Gap 12 (DEFER): real-Anthropic in CI
- D1: real-Anthropic CI integration deferred per audit-M6 06-01 carry-forward. Manual checkpoint sufficient for v0.3.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking) — 6 applied

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Critic verification is vacuous on bare citation IDs | AC-12 (NEW) + Task 2 critic.service.ts spec + Task 4 V49 | Critic input contract changed: `{writerDraft, findings: ResearcherFinding[]}` (NOT bare citations); operates on `.summary` of each finding for verification |
| M2 | safetySignal not threaded into WriterInput; incident 999 directive cannot conditionally fire | AC-6 second gherkin + Task 2 WriterInput type extension + Task 3 orchestrator threading + Task 4 V48 | WriterInput gains `safetySignal?: boolean` field; orchestrator threads from Triage; Writer-incident bakes 999 directive when present |
| M3 | `critic_unresolved` event name semantically wrong | AC-4 + Task 3 orchestrator log line + Task 4 V37 | Renamed to `chat_v2.critic_writer_retry_dispatched` — describes WHAT happened, not "unresolved" claim we can't make |
| M4 | Stream phase events lack sequencing for 06-04 frontend | AC-9 + Task 3 emitPhase helper | Phase event payload extended with `seq: number` (per-turn monotonic from 0) + `timestampMs: number` (Date.now() at emission); 06-04 contract locked NOW |
| M5 | Voice corpus authoring has no quality guardrail | Task 1 voice authoring discipline section | Primary: verbatim quotes from CONTEXT.md /paul:discuss redrafts. Secondary: explicit user-review checkpoint if quotes < 6. Default fallback if quotes adequate: proceed with verbatim, document in commit message |
| M6 | lowConfidence persistence hand-waved; metadata column doesn't exist | Task 3 lowConfidence persistence section | Use existing `chat_messages.toolCallLog` Json column with sentinel entry `{tool: 'low_confidence_flag', value: true}`. Register D-06-02-N for dedicated column migration in v0.4 |

### Strongly Recommended — 11 applied

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | Analyser confidence telemetry | Task 3 orchestrator + AC-13 (NEW) + Task 4 V47 | `chat_v2.analyser_confidence_observed` log per turn — calibration enabler for D-06-02-M |
| S2 | lowConfidence persistence shape lock | Task 3 (related to M6) | Locked to toolCallLog; D-06-02-N registered |
| S3 | Critic timeout tightening | Task 1 constants | CRITIC_TIMEOUT_MS reduced 8s → 4s |
| S4 | Writer no raw citation IDs | Task 2 WriterInput type | WriterInput.citationCount: number (count only); Writer never sees citation arrays |
| S5 | Re-research empty-questions handling | Task 3 composeRefinedBrief | If openQuestions empty: augment brief with "broaden search to neighboring topics" directive |
| S6 | Stub V21 caveat documented | Task 4 V21 inline comment | Note that stub-mode validates stub, not prompt; real-Anthropic mode is the actual gate |
| S7 | Triage stub priority order | Task 3 triage.service.ts modify section | Explicit Priority 1 (safety) → 2 (reasoning) → 3 (lookup) ordering documented; first match wins |
| S8 | probe wall-clock budget | Task 4 verify line | Bumped 120s → 180s |
| S9 | cost-rate citation re-verify | (boundary note) | Re-verify before APPLY (D-06-01-C carry-forward) |
| S10 | Critic warn level explicit | Boundaries new audit discipline section | Documented as warn-level for operator alerting |
| S11 | CostTracker unit tests | Task 5 (NEW) | 5+ unit tests covering empty/single/full-pipeline/key-order/multi-record contract |

### Deferred (Can Safely Defer) — 3 items

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | Real-Anthropic CI integration | Manual pre-release checkpoint sufficient for v0.3 (audit-M6 06-01 carry-forward). Cost discipline + flake-rate uncertainty makes CI integration premature. |
| D2 | Streaming response channel (SSE/WebSocket) | 06-04 scope. 06-02 emits log events with sequencing-ready shape; 06-04 wires the actual channel. |
| D3 | Analyser confidence threshold auto-tuning | D-06-02-M trigger after first month of production data. Calibration corpus needs to exist before retune is defensible. |

---

## 5. Audit & Compliance Readiness

**Defensible audit evidence:**
- ✓ Atomic per-task commits create reviewable history
- ✓ probe-chat-v2 ≥99 assertions across 2 idempotent runs is cited as the regression contract
- ✓ Cost capture mandatory for ALL turns (success + failure) via existing audit-M2 carry-forward — auditor reconciliation against Anthropic invoices works
- ✓ Stream phase events with seq + timestampMs (post-fix) enables post-incident pipeline reconstruction
- ✓ chatV2Logger PII redaction via stamp; no raw user content or PII fields in logs
- ✓ orgId positional non-optional; cross-tenant boundary preserved (audit-M1 carry-forward)

**Silent failure prevention:**
- ✓ All AI SDK calls wrapped in AbortController + setTimeout; on timeout throw RoleTimeoutError
- ✓ Orchestrator catch block persists turn-failed row with partial cost (audit-M2)
- ✓ Critic correction loop bounded (max 1 retry) — no infinite loops
- ✓ Re-research circuit-breaker (cost ceiling) prevents runaway turn cost
- ⚠ Pre-fix: Critic was structurally unable to catch specifics-mismatch (Gap 1). Post-fix: Critic operates on findings.summary, can verify.
- ⚠ Pre-fix: incident 999 directive was prompt-only. Post-fix: orchestrator-threaded safetySignal makes the directive deterministic on safety-relevant turns.

**Post-incident reconstruction:**
- ✓ chat_messages.costUsd persists per turn (success + turn-failed)
- ✓ chat_v2.phase_event log with seq + timestampMs (post-fix) reconstructs role-by-role timeline
- ✓ chat_v2.analyser_confidence_observed (post-fix) provides Analyser self-rating distribution
- ✓ chat_v2.reresearch_dispatched | reresearch_skipped_cost_ceiling | critic_writer_retry_dispatched logs cover all branching paths
- ✓ chat_v2.turn_failed payload carries failureContent + breakdown + mode + latencyMs

**Clear ownership and accountability:**
- ✓ chat-v2 module is the responsibility boundary; chat-v1 untouched
- ✓ Atomic commits per task land changes incrementally — git blame surfaces author per concern
- ⚠ Voice corpus authoring (Gap 5) — pre-fix had no checkpoint; post-fix has explicit user review or verbatim sourcing.

**Areas that would fail real audit pre-fix:**
- Critic verification (Gap 1) — auditor reviewing post-incident finds Critic emitted "approved" on a turn that surfaced wrong specifics. Conclusion: Critic was theatre. Post-fix: closes the gap.
- Voice quality drift (Gap 5) — auditor compares production output to /paul:discuss redrafts; finds divergence. Pre-fix: no traceability. Post-fix: commit message enumerates verbatim vs Claude-drafted, traceable.
- Stream event reconstruction (Gap 4) — incident timeline construction from logs fails because phase order is unreliable. Post-fix: seq enables reconstruction.

---

## 6. Final Release Bar

**What must be true before this plan ships (post-fix all true):**
1. Critic operates on ResearcherFinding[] with .summary access, not bare citation IDs (M1)
2. WriterInput threads safetySignal from Triage (M2)
3. Stream phase events carry seq + timestampMs (M4)
4. Voice corpus sourcing has guardrail — verbatim from CONTEXT.md OR explicit user review (M5)
5. lowConfidence persistence locked to toolCallLog (M6)
6. Event name `critic_writer_retry_dispatched` (M3 — semantic correctness)
7. Analyser confidence telemetry emitted (S1 — calibration substrate)
8. CostTracker unit tests cover 5-stage shape (S11 — contract regression-protection)
9. probe-chat-v2 ≥99 assertions × 2 idempotent iterations + V47-V50 audit-driven checks all green
10. Zero regression on probe-section + probe-tabular
11. AC-7 06-01 carry-forward: `grep -c "tools:" writer.service.ts` = 0
12. All 06-01 V1-V19 assertions still green (chat-v2 lookup mode byte-stable)

**Remaining risks if shipped post-fix:**
- Voice corpus quality is "good enough" not "objectively right" — UAT in 06-04 catches drift; if first month of production shows ≥3 distinct shape-mismatch failures, D-06-02-I triggers corpus extension
- Analyser confidence calibration is unverified — first month of production telemetry is the calibration corpus; D-06-02-M triggers retune
- Critic at threshold-on for reasoning may miss specifics-mismatches on high-confidence turns — D-06-02-G triggers always-on flip if production shows >5% specifics-mismatch on confidence ≥ 0.7 turns
- Re-research dispatch rate is unmeasured — first month of telemetry should show distribution; D-06-02-J triggers depth > 1 if ≥10% of triggered re-research returns are themselves low-confidence

**Sign-off statement:**
With the 6 must-have findings applied, I would sign my name to this plan as enterprise-ready for production deployment. The architectural decisions are sound (depth-before-breadth, threshold-driven Critic, additive cost shape extension), the carry-forward audit discipline is rigorous, and the post-incident reconstruction path is concrete via chat_v2.* event family with sequencing. The deferred items have measurable triggers, not vague hand-waves. The plan does not invent phantom requirements; it executes 06-02-CONTEXT.md decisions with prescriptive task-level instructions.

Without the 6 must-have fixes, I would not approve. The gaps are not "future polish" — they are boundary-contract drift that mid-implementation discovery would force expensive rework.

---

**Summary:** Applied **6 must-have** + **11 strongly-recommended** upgrades. Deferred **3** items.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
*Auditor role: senior principal engineer + compliance reviewer*
