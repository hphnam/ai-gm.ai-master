# Pre-registration — the agent triage evaluation (S8b)

> **DRAFT. NOT IN FORCE.**
> This document is pre-registration only once Nam has signed it and the commit that carries
> the signature is timestamped **before** the run. Drafted 2026-08-19 by S32 V6; unsigned.
> A draft committed as though pre-registered would destroy the only thing this document
> establishes. **Do not run the build against this file until it is signed.**

---

## 1 · The frozen apparatus

| | |
|---|---|
| system prompt | `brain/signals/prompts/agent_v1.md`, frozen at commit `c8fa127` before any evaluation output existed |
| prompt hash | **`c1137f76a76fff5ecbdc53c484d1964175f30e6bcb9796aca07667fd95480c66`** |
| model pin | **`claude-opus-4-8`** (`config.py:513`) |
| decode | `max_tokens` 4,096; **no sampling parameters are sent** (removed 2026-08-19: they 400 on Opus 4.7 and later) |
| corpus | `eval/agent_eval.build_scaled_corpus` — venue × kind × magnitude × onset × fold × direction |
| injection ceiling | `AGENT_EVAL_STREAM_CEILING = "2026-05-31"` |
| store ceiling at derivation | **2026-07-07** |
| cache key | `hash(model, prompt_hash, scenario_payload)` — the prompt hash and the model pin are both terms in it, so either changing invalidates every response |

The prompt file states its own amendment rule, verbatim:

> A second prompt may be introduced only as a declared `agent_v2.md` arm, never as an edit to
> this file.

No such arm exists. This registration covers one arm.

---

## 2 · Volume

**420 distinct API calls.** One call carries one scenario and all its items; the cache
deduplicates on the payload, so injections whose surfaced items are byte-identical share a
call. Derived by construction, not estimated. Full derivation and cross-checks:
`brain/ledger/agent_eval_numbers.md`.

**420 is detector-dependent and 644 is not.** It was measured against the store at ceiling
2026-07-07 with the injection stream capped at 2026-05-31. If the detectors, the grid, the
injection ceiling or the venue closure status change, **420 must be re-measured before the run
and this document amended before it is signed.** The corpus size 644 is invariant to the
detectors but not to the closure filter — see the numbers ledger §6.

---

## 3 · The construct — what will be measured

**Detection calibration, not intervention calibration.** `CALIBRATION_KIND = "detection"` is set
in code so the output cannot claim the stronger thing.
`brain/log/46_G17e_Agent_and_Calibration.md:110`, verbatim:

> The 644-injection corpus supplies truth for *was there a real deviation*, not for *should the
> manager have been told*.

Truth is `item_covers(item, injection.truth)`: whether a surfaced item corresponds to a real
injected event. It is **not** an operator's judgement that the item was worth raising. Every
statement of the result must carry the word *detection*.

### The four terms of the agent objective

| term | computed by this run? |
|---|---|
| 1. expected calibration error (ECE) | **yes** |
| 2. Brier score | **yes** |
| 3. cost-sensitive decision-quality curve | **yes** |
| 4. agreement with operator accept-or-dismiss judgements | **no — N = 0** |

Term 4 requires human labels. None were ever recorded, none is obtainable from any existing
artefact, and nothing in this run creates any. It stays unmet.

---

## 4 · The decision rule

**One decision rule exists in the frozen specification. It covers term 3 only, and the
specification states no rule for terms 1 and 2. That absence is recorded here rather than
filled.**

**The rule that exists** (`eval/agent_calibration.agent_vs_constants`), pre-specified in code
before any result:

> `decorative = disagreement_rate <= 0.05`

If the agent's raise/hold decisions at the 1:1 reference threshold agree with the six-constant
heuristic on more than 95 per cent of items, the verdict returned is that **the LLM is
decorative here and a constant-weighted heuristic suffices — a negative result.** Otherwise the
paired bootstrap (B = 10,000, seed 93) decides whether the disagreement changes Ask-F1 or
expected cost. This is a genuine pre-registered gate: the threshold, the reference operating
point, the bootstrap size and the seed are all frozen constants.

**What is NOT specified.** No threshold anywhere states what ECE or Brier value would count as
the apparatus working or failing. `AGENT_ECE_BINS = 15` and `AGENT_MIN_BIN = 10` fix how ECE is
*computed*, not how it is *judged*. A search of the apparatus and report 46 for a stated
calibration criterion returns nothing.

**No criterion is invented here.** If Nam wants terms 1 and 2 to carry a pass/fail verdict, the
threshold must be written into this document and signed **before** the run. Choosing it
afterwards, against a number already seen, is exactly what pre-registration exists to prevent.

---

## 5 · Limitations declared before the run

These are properties of the design, measured before any result exists. They are declared, not
defended.

1. **Non-independence.** 305 of the 644 injections share a cached response with at least one
   other, collapsing into 81 payloads. The same predicted probability therefore enters the
   calibration corpus more than once, and **ECE and Brier over 1,593 records treat
   non-independent observations as independent.** The collapse is correct behaviour — those are
   near-threshold injections the detectors miss, so only identical background items surface —
   but the resulting corpus is not 1,593 independent draws.
2. **Four contradictory label slots.** Of 1,593 records, **4** carry a truth label that
   contradicts another record sharing the same cached prediction, because truth is a property
   of the item–injection *pair*. 0.25 per cent. Counted, not diagnosed.
3. **N is 1,593, not 644.** The unit of the calibration corpus is a surfaced item, not an
   injection. Base rate **0.335** (534 positive).
4. **The detector's own misses are out of scope.** The agent triages what the detectors
   surface; an event the detectors never surface cannot appear in this corpus at all.
5. **One venue is thin.** Ellel contributes 36 injections from a single 50-day fold and spike
   injections only.

---

## 6 · Predicted outcome, written before execution

Recorded so that the run can surprise us, and so that it is visible afterwards whether it did.

1. **The decorative gate will not fire.** Disagreement at the 1:1 threshold is predicted
   **above** 5 per cent, so the run is expected to return the non-decorative branch. Reason:
   the prompt instructs the agent to deflate single-day excursions on sparse booking-led venues
   and to discount redundancy, neither of which the six-constant product encodes.
2. **The agent will be overconfident, and ECE will be dominated by the high-probability bins.**
   The prompt asks explicitly for calibration and reserves >0.8 for clear cases, which in
   practice tends to concentrate mass at round values under temperature-free decoding.
3. **Brier will sit near the base rate's floor.** With a base rate of 0.335, an uninformative
   constant predictor scores ≈0.223; the agent is predicted to beat that but not by a wide
   margin.
4. **The paired bootstrap on expected cost is predicted to include zero** at the 1:1 ratio —
   that is, the agent will differ from the constants without a demonstrable cost improvement at
   the reference point. If so, the honest headline is that the triage layer changes decisions
   without yet being shown to improve them.

**A prediction that turns out wrong is a result, not an error, and will be reported as one.**

---

## 7 · Signature

| | |
|---|---|
| drafted | 2026-08-19, S32 V6 |
| drafted by | Claude, at Nam's instruction, from the frozen apparatus |
| status | **UNSIGNED — NOT IN FORCE** |
| signed by | ☐ Nam …………………………… date ………………… |
| binding from | the timestamp of the commit carrying the signature |
| run permitted | only after that commit exists |
