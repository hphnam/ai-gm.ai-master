# Report 53 - S7 G17i re-run: A6 selection moved off the test block, MinT weight corrected

Date: 2026-07-31. Branch `brain-construction-local`. Store ceiling 2026-07-07. Style: no
em-dashes, plain prose, loud failures, verify before asserting, pre-register before running.

Closes `ledger/code_vs_paper.md` **M1** (test-block selection) and **M4** (MinT weight on
`Var(|e|)`), both carried as HIGH since the released-code audit. Also closes the
`render()` defect that report 52 recorded as found-and-not-fixed.

## Headline

A6's intermittent-demand path chose its per-node forecaster by scoring two candidates on
the held-out test block and keeping the winner, then reported that same block's MASE. The
published figure was therefore a minimum over two forecasters and not an out-of-sample
score for any single rule. Selection has been moved to a validation block inside training.

**The corrected path adopts 1 of 16 nodes where the old one adopted 0 of 17, and reconciled
band coverage falls.** The direction is the expected one: removing the peek removes the
flattery.

## What changed

Two decisions, previously entangled in one outcome-based test, are now separate and both
blind to the test block.

1. **Which intermittent estimator.** `select_sba(adi, cv2)` (Kostenko-Hyndman
   `cv2 > 2 - (3/2) adi`), read off the training window. Previously SBA was hard-wired and
   `select_sba` was computed for the report but never consulted.
2. **Whether it displaces the DOW-median.** A MASE contest on the **validation block**, the
   last `TEST_WEEKS` (8 weeks) of the training span, with both forecasters fitted strictly
   before it. The winner is then refitted on the whole training span for the test forecast.

The MinT trust weight now takes the variance of the **signed** residual,
`ytr - croston_fitted(...)`, with absolute values taken only for the conformal scores. The
DOW-median path always did this; the Croston path did not, so the two were estimating
different quantities and their relative weights were not comparable.

Adopting on the ADI classification alone was considered and rejected. It would have forced
an intermittent estimator onto all 16 nodes, and the artefact shows it loses to the
DOW-median on the test block at every one of them. A rule is not made honest by making it
blind; it is made honest by selecting on data the result is not reported from.

## Results

Control: the pre-change code re-run against the SAME store (the node set moved 39 -> 41
between report 45 and now for reasons unrelated to this work, so the pre-change artefact on
disk was not a valid comparator and was regenerated).

| Quantity | Before (control) | After | Delta |
|---|---|---|---|
| Intermittent nodes adopting | 0 of 16 | 1 of 16 | +1 |
| L2 band coverage @80 | 64.0% | 61.4% | -2.6 |
| L2 band coverage @90 | 77.6% | 74.3% | -3.3 |
| L3 band coverage @80 | 60.4% | 54.1% | -6.3 |
| L3 band coverage @90 | 77.6% | 72.3% | -5.3 |
| Keg consumption proxy | 96.1 pints/7d | 96.0 pints/7d | -0.1 |

Coherence is exact either way (venue and category discrepancy 0.00e+00), which is the
control on the reconciliation itself: the change moved the weights, not the algebra.

Coverage was already well below nominal before this change and is further below it now.
That is a real degradation and it is not attributable to the correction being wrong. One
node's base forecast and trust weight changed, and because the MinT normal equations couple
every bottom node through the venue row, that propagates to all of them.

## Two findings worth stating

**The Kostenko-Hyndman rule is degenerate over this trigger set.** At the intermittency gate
ADI >= 4/3 the cutoff `2 - (3/2) ADI` is already at or below zero, and CV-squared cannot be
negative, so SBA is selected for every node A6 ever asks about. The rule is applied because
it is the published rule, not because it discriminates on this hierarchy. Pinned by
`test_the_selection_rule_is_degenerate_over_the_intermittency_trigger_set`.

**Validation selection at this series length is visibly noisy.** The single adoption,
`ITEM::Wine::Sauvignon Blanc`, wins the validation contest 7.043 against 7.071, a margin of
0.4% at a node where both forecasters score around seven times seasonal-naive. It then
loses on test, 3.993 against 3.136. The honest artefact shows this; the old one could not,
because a node that lost on test was never adopted in the first place.

## The render defect, closed

`python -m eval.interval_calibration` without `--build` raised `KeyError: 1` because
`render()` runs both on the in-process payload (integer `per_step` keys) and on its JSON
round-trip (string keys). Fixed at source: `arm_metrics` now emits string keys, so both
paths index alike. The on-disk JSON is unchanged, since JSON already stringified them.

Verified by running the render-only path and diffing: `interval_calibration.md` is
reproduced **byte-identical** to the committed copy. That is the strongest available check,
and it confirms the fix is presentational and the report 52 numbers stand untouched.

## Verification

| Check | Status | Evidence |
|---|---|---|
| Estimator follows the Kostenko-Hyndman rule | PASS | `test_estimator_is_sba_when_the_kostenko_hyndman_rule_selects_it`, `test_estimator_is_classic_croston_when_the_rule_selects_it` |
| Adoption is decided on the validation block | PASS | `test_adoption_is_decided_on_the_validation_block_not_the_test_block` |
| An adopted node refits on the whole training span | PASS | `test_an_adopted_node_forecasts_the_estimator_refit_on_the_whole_training_span` |
| A node losing the contest keeps the DOW-median | PASS | `test_a_node_losing_the_validation_contest_keeps_the_dow_median` |
| MinT weight is the signed residual variance | PASS | `test_mint_weight_is_the_variance_of_the_signed_residual` |
| Selection rule degenerate over the trigger set | PASS | `test_the_selection_rule_is_degenerate_over_the_intermittency_trigger_set` |
| Reconciliation still exactly coherent | PASS | venue and category discrepancy 0.00e+00 |
| Render-only path reproduces report 52 | PASS | byte-identical diff |

14 of 14 in `tests/test_a6_reconcile.py` and `tests/test_intermittent.py` (1 skip).

A draft test asserting `Var(e) > Var(|e|)` was **withdrawn rather than made to pass**: the
inequality holds only where residuals change sign, and a monotone node has `|e| = e`
exactly. The M4 defect is the inconsistency between the two MinT paths, which holds
regardless, and M4 in the ledger is corrected accordingly.

## Files touched

- `hierarchy/reconcile.py` (`_croston_comparison` rewritten, report table, CLI summary)
- `eval/intermittency_diagnostic.py` (`intermittent_node_stats`, `select_sba` docstring)
- `eval/interval_calibration.py` (`per_step` string keys, three call sites)
- `tests/test_a6_reconcile.py` (six new tests)
- `hierarchy/reconciliation_forecast.md` (regenerated)
- `ledger/code_vs_paper.md` (M1 and M4 resolutions)
