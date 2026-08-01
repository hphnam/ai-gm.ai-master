# Pre-registration: a one-standard-error margin on the A6 adoption rule

Date written: **2026-08-01**. Author: PRJ93 build. Store ceiling 2026-07-07.
Status at time of writing: **rule specified, NOT implemented, NOT run.**

This file is committed before any implementing code exists, so that commit order
establishes the specification preceded the result. That is the same device the frozen
agent prompt uses (methodology, intervention layer) and the same discipline the model
confidence set configuration was recorded under.

## Provenance, stated first because it is the weakest point

**This rule is being written AFTER observing a failure of the rule it replaces.** On
2026-08-01 the bare inequality adopted `ITEM::Beer::Lager - BH` on a validation margin of
0.21 per cent (1.418 against 1.421), and that node then scored 96 per cent worse on the
test block (1.749 against 0.891). Report 55 records this.

No framing makes that ordering disappear, and this document does not attempt one. What
pre-registration can still buy is narrower and worth having: the rule, its estimator, its
tie-breaking and its failure mode are fixed HERE, in advance of running it, so that the
specification cannot be adjusted once its consequences are visible. A reader may discount
the rule as motivated; they should not have to wonder whether it was tuned.

Any report of this rule must state the ordering in the same terms.

## The rule

Let the validation block be partitioned into consecutive **disjoint 7-day sub-blocks**,
earliest first, discarding any trailing partial sub-block. Let `B` be the number of whole
sub-blocks obtained.

For each sub-block `b`, compute the scaled error of each candidate over that sub-block's
days, `MASE_dow(b)` and `MASE_est(b)`, both against the `calendar_lag7` denominator
computed once on the fitting span (fixed across sub-blocks, so it is a common scale and
cancels from the comparison's sign).

Define the paired differential

    d_b = MASE_est(b) - MASE_dow(b)          (negative favours the intermittent estimator)

and adopt the intermittent estimator if and only if

    mean(d) + sd(d, ddof=1) / sqrt(B)  <  0

that is, only if the estimator's mean advantage exceeds one standard error of that
advantage.

### Fail-closed conditions

Do not adopt if any of the following holds. Each keeps the incumbent, which is the
conservative direction.

1. `B < 2` (no dispersion is estimable from fewer than two sub-blocks).
2. Any `d_b` is non-finite, which occurs when a scaled-error denominator is zero because
   the node has no sales in the fitting span.
3. `sd(d) == 0`, which would make the criterion collapse to the bare inequality it
   replaces.

## Why this estimator and not another

**Why a one-standard-error rule at all.** Breiman, Friedman, Olshen and Stone (1984)
introduce it for exactly this situation: a model selected by the minimum of a noisy
validation statistic is selected partly on the noise, and the remedy is to prefer the
simpler or incumbent option unless the challenger's advantage exceeds the uncertainty in
the estimate of that advantage. It is a standard device with a standard citation, not an
invention of this project, and it introduces no tunable constant.

**Why 7-day sub-blocks rather than per-day errors.** Daily errors on this estate are
serially correlated, so a standard error over daily differentials would be biased downward
and the margin would be too easy to clear. Disjoint 7-day sub-blocks match the venue's
weekly rhythm, align with the forecast horizon, and are the same unit the LOVO transfer
comparison already uses for dispersion (report 54, closing M23). Choosing a unit the
project already uses elsewhere is deliberate: a bespoke unit chosen here would be one more
degree of freedom.

**Why disjoint rather than overlapping.** Overlapping windows would require a moving-block
bootstrap to avoid treating correlated draws as independent. Disjoint sub-blocks make the
standard error a plain one at the cost of a smaller `B`, and at this window length that
trade is worth taking because the alternative adds a bootstrap configuration that would
itself need pre-registering.

**Why paired.** Both candidates are scored on identical days, so the differential removes
the sub-block's own difficulty and estimates only the contrast.

## Known limitation, recorded now rather than when it is inconvenient

At `TEST_WEEKS = 8` the validation block is 56 days and `B = 8`. A standard error on eight
paired differences is itself a noisy quantity, and the rule is therefore a coarse
instrument. It is not claimed to be a significance test and no p-value is computed from it.
The claim is only that it is a stated, fixed threshold that is harder to clear than
"wins by any amount at all".

## Prediction, recorded before the run

Stated separately by how much is genuinely unknown, because two of these are already
measured and it would be dishonest to present them as predictions.

**Genuinely unknown at time of writing.** Whether the rule rejects the Lager - BH
adoption. The sub-block differentials have NOT been computed; only the pooled validation
MASEs (1.418 and 1.421) are known, and a 0.21 per cent pooled margin does not by itself
determine the sign of `mean(d) + sd(d)/sqrt(B)`. **Prediction: it rejects.** If it does
not, that is the reportable outcome and the adoption stands.

**Already measured, NOT a prediction.** If the rule rejects that adoption and adopts
nothing else, A6 reduces to the day-of-week path, whose coverage is already recorded as
run D of report 55: L2 65.8 / 85.1 and L3 60.0 / 72.1 at nominal eighty and ninety, with
the keg order at 1.09. These figures are stated here so that they cannot later be
presented as a confirmation.

**Also unknown.** Whether the rule changes the adoption decision at any of the other
fifteen intermittent nodes. All fifteen currently decline under the bare inequality, and a
stricter rule cannot cause a decline to become an adoption, so the count of adoptions can
only fall or stay. That much is arithmetic, not prediction.

## How this will be reported

Report 56 will state: the ordering above; the rule as specified here; whether the
prediction held; the resulting adoption count; and the coverage figures. If the rule
rejects the adoption, the chapters' figures move to run D and the text must say that the
margin was added after observing the failure, not that the corrected pipeline happened to
produce better coverage.

---

# OUTCOME, appended 2026-08-01 after the run

## The prediction held

`ITEM::Beer::Lager - BH`: `mean(d) + sd(d)/sqrt(8) = +0.026`. Positive, so the rule
rejects the adoption, as predicted. **0 of 16 nodes now adopt** (was 1 of 16).

The pooled validation margin was 0.21 per cent in the estimator's favour; the sub-block
standard error is an order of magnitude larger than that advantage. The adoption was
inside the noise, which is what the rule exists to detect and what could not be seen from
a pooled point estimate.

No other node's decision changed, consistent with the arithmetic noted above: a stricter
rule can only reduce the adoption count.

Four nodes return `n/a` for the criterion where they returned a finite bare-inequality
comparison (`Centennial Summer Pale`, `Nuts`, `Lunebrew T Shirt`, `Hire Fee`). This is the
fail-closed path firing on zero dispersion or a non-finite sub-block differential, and in
every case the bare rule had already declined, so no decision changed.

## An error in this document's own "already measured" block

**The keg figure quoted above was wrong and is corrected here.**

This document stated that if the rule rejected the adoption, the keg order would be
**1.09**. It is **0.72** (63.7 pints per week). The error was a misattribution: 1.09 comes
from the PRE-M2 artefact, run under the old fitting span and the in-sample band. Run D of
report 55 was a coverage-only control harness and never computed the consumption proxy at
all, so there was no measured run-D keg figure to quote.

The coverage figures quoted in the same block were correct and reproduce exactly: L2 65.8
and 85.1, L3 60.0 and 72.1 at nominal eighty and ninety.

The error is recorded here rather than silently corrected because this file's whole
purpose is to be checkable against what followed. It also propagated: report 55 and the
results chapter both said the adoption moved the keg order "from 1.09 to 1.39", where the
correct like-for-like comparison under the corrected pipeline is **0.72 to 1.39**. Both
are being corrected.

## Net effect on the served figures

| | before the margin | after the margin |
|---|---|---|
| adoptions | 1 of 16 | 0 of 16 |
| L2 coverage @80 / @90 | 63.4 / 84.9 | 65.8 / 85.1 |
| L3 coverage @80 / @90 | 50.4 / 64.0 | 60.0 / 72.1 |
| keg order | 1.39 | 0.72 |
| coherence | exact | exact |

## What must be said when this is reported

The ordering stands and is not softened: the margin was specified after observing the
failure of the rule it replaces. The coverage improvement is therefore NOT evidence that
the margin is correct. It is the arithmetic consequence of removing a forecaster that was
already measured to be worse on the test block. The argument for the rule is the Breiman
one-standard-error argument and the demonstration that a 0.21 per cent pooled margin sits
inside the sub-block noise, not the coverage number that follows from applying it.
