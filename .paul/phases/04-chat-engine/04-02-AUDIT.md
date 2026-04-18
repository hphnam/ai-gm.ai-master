# Enterprise Plan Audit Report

**Plan:** .paul/phases/04-chat-engine/04-02-PLAN.md
**Audited:** 2026-04-18 20:25
**Auditor role:** Senior principal engineer + compliance reviewer
**Verdict:** **Conditionally acceptable pre-fix → Enterprise-ready post-fix.**

---

## 1. Executive Verdict

Pre-fix, this plan was **not acceptable** as written and would have failed on first probe execution due to a factual UUID error. With the must-have fixes applied, the plan is **enterprise-ready**.

Would I approve this plan for production as the accountable engineer? Post-fix, **yes** — with explicit acknowledgement that rate limiting and UI-side caps are legitimately deferred to Plan 05-01 and tracked in Deferred Issues. Pre-fix, **no** — the probe would have hard-failed on assertion 1 because the hardcoded "CROWN" UUID was actually a supplier ID; the audit would have noticed on manual review, but the defect would have slipped through automated CI.

The plan's architectural spine — non-persistent, deterministic, reusing the 04-01 ToolDispatcher seam — is sound. The gaps were all in operational discipline: cross-tenant log integrity, side-effect bounds (timeouts), and PII handling in observability. All addressed inline.

## 2. What Is Solid

These elements were well-chosen and should not change:

- **Non-persistence as an explicit architectural choice.** Not persisting to `chat_messages` avoids a schema migration, avoids the "what does a proactive message mean in the audit trail" problem, and cleanly separates "things the user said/heard" from "things the system surfaced." Clear win.
- **Reuse of ChatModule's exported `ToolDispatcher`.** The 04-01 SUMMARY explicitly documents this seam; consuming it here — rather than duplicating Zod validation + routing — is the correct module-composition move.
- **Deterministic-first design.** Skipping Claude for suggestion composition is the right POC tradeoff: it's cheaper, faster, deterministically testable, and the honest-no-data ethos is preserved (no hallucinated suggestions because Claude never sees the data).
- **`ToolName`-typed `sourceToolCall.tool`** (not loose string). Means any future tool rename at the @gm-ai/types level is a compile-time failure here, not a silent drift.
- **Explicit boundaries against Claude, new deps, HTTP controllers, schema changes, and ChatService modification.** The plan correctly identifies what not to touch; this is the main defence against scope creep and is well-documented.
- **Heuristic `onTurn` gate that returns `[]` on no match.** A zero-tool-call path for non-stock/non-order user turns is the right default — prevents the service from becoming a hot-loop database tax on every turn.

## 3. Enterprise Gaps Identified

Gaps found in the pre-fix plan, in severity order:

### G1. [CRITICAL] Factually wrong CROWN_VENUE_ID in Task 3
Task 3 hardcoded `CROWN_VENUE_ID = 'b1000000-0000-0000-0000-000000000001'`. Verification against `apps/api/src/modules/seed/seed-data.ts`:
- `b1000000-…-1` = `SUPPLIER_MATTHEW_CLARK`
- `a1000000-…-1` = `VENUE_CROWN` (correct)

Every assertion in the probe would have pointed at a supplier as if it were a venue. The `get_stock_below_par({ venueId: 'b1000000-…-1' })` call would have returned `fail('no-data')` (no stock rows where `venueId = <supplier-id>`), causing assertions 1, 2, 8, and 9 to fail immediately.

### G2. [MUST-HAVE] Cross-tenant log integrity in `onTurn`
The signature `onTurn(venueId, userMessage, conversationId?)` accepts `conversationId` as arbitrary input and writes it to the `suggestions.generate` log. If a caller supplies `venueId=CROWN` but `conversationId=<anchor-venue-conv-id>`, the log correlates another venue's conversation with this venue's suggestion output. This is a log-integrity failure (SOC 2: non-repudiation + segregation-of-duties evidence), not a data leak per se, but an auditor would flag it.

The plan's boundary section read "No cross-tenant check" which propagated MockOpsService's trust-boundary posture. But MockOpsService doesn't accept conversationIds — the threat surface here is structurally different.

### G3. [MUST-HAVE] No timeout on tool dispatches
`Promise.all([dispatcher.dispatch(...), dispatcher.dispatch(...)])` with no per-call timeout means a stuck Prisma connection hangs the conversation-open event forever. `onConversationOpen` is intended to run at session load — a hung call blocks the entire UI. No fallback, no observability signal, silent failure to the user.

### G4. [MUST-HAVE] Silent double-failure
Both tools returning `fail('error')` (e.g., DB down) yields an empty array with NO elevated log — just a normal `suggestions.generate` with `suggestionCount: 0`. Ops cannot distinguish "no below-par items + no upcoming cutoffs" (legitimate empty state) from "service is degraded and returned no data." Audit-trail wise, this is indistinguishable silent failure.

### G5. [MUST-HAVE] PII-handling under-specified
The plan mentions `suggestions.generate` is "metadata-only" but does not explicitly forbid logging `userMessage` in any form. Phase 3 Plan 03-03 established a hard PII rule for retrieval (`queryHash` + `queryLength` only, no raw text). The same rule must apply here or the service drifts from the established PII posture — an auditor comparing the two would flag the inconsistency.

### G6. [MUST-HAVE] Suggestion text sanitization missing
Template string `\`${name}...${supplierNotes}\`` interpolates DB free-form columns. Seed data is clean, but the public shape of this service must survive future Xero/Square data which may contain newlines, tabs, or even control characters. Naïve 160-char truncation can also mid-word-cut producing display junk. Not critical today; critical when the mock_* tables are swapped for live integrations in a later milestone. Cheap to fix now, expensive to retrofit then.

### G7. [STRONGLY-RECOMMENDED] `generatedAt` drift within a single call
`new Date().toISOString()` evaluated per-suggestion means 3 below-par + 2 cutoff = 5 suggestions emitted at 5 slightly different timestamps. Not wrong, but `generatedAt` loses its utility as a grouping key — you can't filter "all suggestions from the same onConversationOpen call" by timestamp equality. Single-invocation timestamp is the correct invariant.

### G8. [STRONGLY-RECOMMENDED] Missing WARN-severity probe assertion
AC-2 defines a `severity = 'warn'` path (currentQty === 0 OR cutoff < 6h). The probe verifies no path exercises it. Seed data DOES have a fixture (`Neck Oil Session IPA`, currentQty=0), so the assertion is free to add. Without it, the warn code path goes untested end-to-end.

### G9. [STRONGLY-RECOMMENDED] Missing dedupe probe assertion
AC-3 defines the dedupe rule `(kind, itemIds[0] ?? tool)`. The probe never calls a message that fires both gates. The dedupe logic is entirely untested — a regression in either the stock gate, the cutoff gate, or the dedupe key function would go undetected until a user happens to type a both-gate message in production.

### G10. [STRONGLY-RECOMMENDED] Probe UUID hardcoding pattern
Even with the correct Crown UUID, hardcoding it in the probe creates the same class of factual-drift risk as G1. The seed-data file exports `VENUE_CROWN` as a const; importing it from there is one line and makes UUID changes in seed-data compile-time visible.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | G1: Wrong CROWN UUID in Task 3 | Task 3 action, AC-4 | Removed hardcoded `b1000000-…` supplier UUID. Plan now mandates `import { VENUE_CROWN, VENUE_ANCHOR } from 'apps/api/src/modules/seed/seed-data'`. Documented the root cause in-line so future readers understand the failure mode. |
| 2 | G2: Cross-tenant conversation preflight | AC-3, Task 2 action, Boundaries | Added explicit preflight rule: if `conversationId` provided, `prisma.chatConversation.findUnique` must verify `venueId` match BEFORE any heuristic or dispatch. Mismatch → `[]` + `suggestions.conversation_mismatch` warn log. Added probe assertion 11 that creates a VENUE_ANCHOR fixture conversation and verifies it's rejected when passed with VENUE_CROWN. Reframed the "no cross-tenant check" boundary to reflect the actual threat model. |
| 3 | G3: 3000ms per-dispatch timeout | AC-2, AC-3, Task 2 action, Boundaries | Introduced `runDispatchWithTimeout(tool, input)` helper wrapping every dispatch in `Promise.race` with 3000ms cap. Timeout → `suggestions.tool_timeout` error log + synthesised `fail('error', 'timeout')`. Added boundary: "do NOT call `toolDispatcher.dispatch` directly — always via the wrapper." |
| 4 | G4: Both-tools-errored escalation | AC-2, AC-3, Task 2 action | Added `suggestions.both_tools_errored` error-level log when every invoked branch returns `fail('error')`. Emitted BEFORE the normal `suggestions.generate` log so ops dashboards can alert on it independently. |
| 5 | G5: Explicit PII rule for `userMessage` | AC-3, Task 2 action, Boundaries | Hard rule: `userMessage` content is NEVER logged in any form — not raw, not hashed, not sliced. Only `messageLength` (integer) + `stock_matched: boolean` + `cutoff_matched: boolean` are logged. Added grep-based verification check. |
| 6 | G6: Text sanitization + word-boundary truncation | AC-2, Task 2 action | Added `sanitizeText(raw)` helper: strips `[\r\n\t]+` → single space, trims, truncates at last word boundary ≤159 chars + `…`. All `text` fields go through this helper before return. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | G7: Single-call `generatedAt` invariant | AC-2, Task 2 action, Task 3 | `generatedAt` computed once at top of each entry-point method, passed down to `composeSuggestions` helper. Probe asserts `new Set(suggestions.map(s => s.generatedAt)).size === 1` for a single-call batch. |
| 2 | G8: WARN-severity probe assertion | AC-4 (new assertion 9), Task 3 action | New probe assertion: filter returned suggestions where `severity === 'warn'` and assert `>= 1`. Seeded `Neck Oil Session IPA` (currentQty=0) guarantees the path fires. |
| 3 | G9: Dedupe probe assertion | AC-4 (new assertion 10), Task 3 action | New probe assertion: call `onTurn` with a both-gates message, build Set of `${kind}|${itemIds[0] ?? tool}` keys, assert `set.size === returned.length`. |
| 4 | G10: Probe imports seed constants | Task 3 action, AC-4 | Probe now imports `VENUE_CROWN`/`VENUE_ANCHOR` from `seed-data.ts`. Added grep-based verification that no `b1000000`-prefixed UUID is hardcoded as a venueId. |
| 5 | Also: `composeSuggestions` extraction | Task 2 action | Factored the below-par + cutoff composition into a single pure helper so `onConversationOpen` and `onTurn` share exactly one implementation. Prevents drift between the two entry points. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Rate limiting on the public surface | No public surface yet in this plan (service-only). Plan 05-01 owns the HTTP controller and MUST add `@nestjs/throttler` guard at that boundary. Now explicitly tracked in Deferred Issues with that trigger. |
| 2 | Suggestion-count cap (user-facing pagination) | Service already caps at 3 below-par + 2 cutoff internally. UI-level pagination concerns belong to Plan 05-01. |
| 3 | Heuristic false-positive tuning in `onTurn` | Plan 04-03's adaptation loop is the explicit owner of heuristic quality via the thumbs/regeneration signal. Pre-tuning before data exists would be speculative. |
| 4 | Prometheus/OTel counter emission | `suggestions.generate` structured log is sufficient for POC. Metric emission is a cross-cutting concern that should be added uniformly across all services (chat, retrieval, mock-ops, suggestions) in a single telemetry-consolidation plan. |
| 5 | Unit tests for the composer / sanitizer helpers | Probe covers the integration path. Unit tests for pure helpers are a good hygiene investment but not release-blocking when probe assertions cover the observable behavior. Add when the composer gains complexity beyond the current two-kind shape. |
| 6 | Idempotency on `onConversationOpen` | Deterministic + non-persistent = idempotent by construction. No mutations. Re-invocation produces the same output given the same DB state. |
| 7 | Cost budget per suggestion-call | No Claude call = no cost signal to budget. Revisit if/when a Claude-adjudicated suggestion path is added in a future plan. |

## 5. Audit & Compliance Readiness

**Defensible audit evidence:** Post-fix, YES. Every suggestion carries `sourceToolCall.tool` + `input` — the chain "user opened conversation → service called tool X with input Y → these 3 suggestions were composed" is reconstructable from the log stream + the seeded DB state at the time.

**Silent-failure prevention:** Post-fix, YES. Three distinct failure modes now have distinct observable signals:
- Single branch errors → `toolsFailed` entry in normal `suggestions.generate`.
- Both branches error → `suggestions.both_tools_errored` error-level log.
- Dispatch timeout → `suggestions.tool_timeout` error-level log (and feeds into the above if both timeout).

**Post-incident reconstruction:** Strong. Given a timestamped log stream and a DB snapshot, you can answer: "At 2026-05-10T09:13:42Z, what did SuggestionsService return for venue X, and why?" The `toolsInvoked` + `toolsFailed` arrays plus the DB state reconstruct the deterministic output.

**Ownership + accountability:** Clear. SuggestionsService is the sole owner of the `suggestions.*` log namespace. No other service emits suggestions-prefixed events. Plan 04-03's adaptation loop and Plan 05-01's controller are separately scoped and won't pollute this namespace.

**What would fail a real audit pre-fix:**
- The G1 factual error (not a compliance issue but catastrophic for acceptance testing).
- G2's log correlation of another tenant's conversationId. An auditor reviewing "how do you ensure logs for tenant A don't reference tenant B" would get a "we don't check" answer pre-fix. Post-fix, the preflight is the answer.
- G5's lack of explicit PII posture. Auditors asking "can userMessage ever appear in logs?" would get "we think no but haven't forbidden it." Post-fix: "forbidden, grep-verified."

**What would fail a real audit post-fix:**
- Still no rate limiting (but explicitly deferred to 05-01 with a visible ticket — acceptable if the trigger is honored).
- Still no cost budget (deferred; only applies if Claude is added).
- No formal unit tests on helpers (deferred; probe provides integration coverage).

## 6. Final Release Bar

**Must be true before this plan ships (APPLY):**
- Task 1 types build to dist and are importable.
- Task 2 service compiles + loads in DI graph without errors.
- Task 3 probe exits 0 with 11/11 passing assertions.
- `probe:chat` (15/15) and `probe:retrieval` (9/9) regress clean.
- Zero `userMessage` appearances in any logger call inside `apps/api/src/modules/suggestions/`.
- Zero direct `toolDispatcher.dispatch` calls outside `runDispatchWithTimeout`.
- Zero `b1000000-…` UUIDs hardcoded as venueIds in probe.

**Residual risks if shipped as-is (post-fix):**
- Heuristic regex gates will false-positive in natural language (e.g., "the order of operations for closing"). Low impact: worst case is one extra DB query per false-positive turn. Plan 04-03 is the owner of this.
- Without 05-01's throttler, an aggressive polling client could issue 100s of onConversationOpen calls/min per venue. Mitigation: Plan 05-01 MUST ship the throttler guard concurrently with the controller.
- Suggestion text, while sanitized, may still display awkwardly with very long product names. Acceptable for POC.

**Would I sign my name to this system post-fix?** Yes. The factual error (G1) is the one that would have embarrassed me on first run — catching that alone justifies the audit. The PII + log-integrity hardening (G2, G5) lifts the service to the same posture as Plan 03-03's retrieval layer. The operational gaps (G3, G4) now have observable signals. The remaining deferrals are legitimate phase-scope boundaries, not hidden risks.

---

**Summary:** Applied **6 must-have** + **5 strongly-recommended** upgrades. Deferred **7** items with explicit triggers or phase-owners.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
