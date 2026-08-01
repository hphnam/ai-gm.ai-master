# Report 54 - S7 G17j: dispersion on the remaining comparisons, and Guo's calibration leg

Date: 2026-07-31. Branch `brain-construction-local`. Store ceiling 2026-07-07. Style: no
em-dashes, plain prose, loud failures, verify before asserting, pre-register before running.

Closes `ledger/code_vs_paper.md` **M11**, **M16**, **M23**, **M24**, **M26**, and the
local half of **M8**. Adding the M5 source to NotebookLM stays open by instruction.

## Headline

Two comparisons in the project claimed a result off a point estimate with no dispersion:
A7's transfer gate (a 2-of-3 win count) and A14's ablation ship rule (a 1% threshold on a
six-fold mean). Both now carry an MCS set and a paired bootstrap CI. Neither headline
verdict changes. **A7's does not survive as stated, though**: pooled across the estate the
two methods are not distinguishable, which the win count could never have shown.

## A7, M23

Each fold is scored on consecutive 7-day blocks, so a held-out venue yields a paired loss
vector instead of one pooled number. Both forecasts are still frozen at the cold window,
so the cold-start premise is untouched, and the pooled MASE per venue is unchanged to the
digit. That is the control.

| Held-out venue | blocks | MASE transfer | MASE naive | delta [90% CI] | 90% MCS set |
|---|---|---|---|---|---|
| Beer Hall      | 55 | 0.872 | 1.243 | -0.371 [-0.391, -0.348] | transfer |
| Two River Taps | 45 | 1.184 | 0.700 | +0.486 [+0.442, +0.529] | naive |
| Ellel          | 53 | 0.927 | 1.319 | -0.373 [-0.488, -0.300] | transfer |

Each per-venue verdict is now decisive: every CI excludes zero and the MCS retains a
single method per venue. **Pooled over all 153 blocks the two are not distinguishable**:
mean difference -0.119 MASE, 90% CI [-0.242, +0.036], and the 90% set retains both. The
two venues transfer wins and the one it loses very nearly cancel.

The pre-registered majority gate was **not** changed on sight of this. Rewriting a
criterion after seeing its numbers is the defect this whole audit exists to catch. The
gate still reads PASS on the majority rule; the estate-level non-separation is reported
next to it and the results chapter needs to carry that qualification.

## A14, M24, and a worse defect found underneath it

`_eval_cols` returns the per-fold vector. Ships now means "the 90% MCS set over the
baseline and all seven candidates excludes the baseline and retains this candidate", not
"beat the baseline by 1% on a mean of six numbers". `weather_study` puts its three
training bases through the MCS instead of `min(..., key=mase)`; `best` is `None` unless
the set narrows to one, and the report prints "lowest" with a note that a ranking is not
a finding.

**The first run of that change shipped a feature scoring 6.5% worse than the baseline.**
The cause was not the ship rule. `mcs.moving_block_indices` clamps `block_len` to
`n_obs`, and with `BLOCK_LEN = 7` against six folds every bootstrap resample is the sample
itself, in order. CIs came back zero-width and MCS p-values pinned to exactly 0.0 and 1.0.
Adding the right instrument to the wrong sample size would have been a worse defect than
the one it replaced, and it was caught only by reading the numbers it produced rather than
trusting that an MCS is an improvement by construction.

Fixed twice over: `_block_len` guards the clamp, and the fold grid was widened from the
6-fold cap to the whole active span at a full-horizon step, giving 39 disjoint folds. That
is the remedy `harness.rolling_origin`'s own docstring already recommends (report 43).

Verdict unchanged, and now supported: **nothing ships**. The 90% set retains the baseline
and all seven candidates, so nothing is separable from the baseline at all. The three
weather training bases are likewise not separable. Every A14 MASE moved because the fold
grid moved, baseline 1.5460 -> 0.9551, so the A14 numbers in the written path need
restating even though the conclusion does not.

## Calibration, M26 and M16

Bin membership is now Guo's `(lo, hi]` with the first bin closed at 0, and
`AGENT_ECE_BINS` is 15 to match the paper. Both were changed **before** the G3 run, as the
ledger row required, so nothing is restated and the fix cost nothing.

`fit_temperature` implements Guo section 4.2, the third leg of pipeline stage 10 and the
one that was never built: a single scalar fit by NLL on a validation split, applied as
`p' = sigmoid(logit(p) / T)`. Wired into the G3 payload and report. Two properties are
stated with it rather than left for a reader to assume: the map is strictly monotone, so
it cannot move any ranking, the cost sweep's operating points, or the AUC; and at this N
the fitted T is an estimate with real variance, so a T near 1 is not evidence of
calibration.

## M11, and a limit on what it proves

Run out of band on CPython 3.12.13 with statsforecast 2.1.1, 200 Bernoulli-gap series.
Max absolute difference **1.3e-15** for both CrostonClassic and CrostonSBA. The
leading-zero edge cases agree exactly, which is the specific thing the audit wanted: our
`phat = i0 + 1` against their `np.diff(nonzero_idxs + 1, prepend=0)`.

The limit, recorded in the test rather than left implicit: at the default alpha = 0.1 our
parameterised `1 - alpha/2` equals their hard-coded `0.95`, so this run cannot
discriminate the two implementations. It confirms the recursion, not the parameterisation.

## M8, and a defect found while closing it

The `rmsse_m5` docstring no longer claims "exactly as the M5 competition defined it".
Nothing this project holds evidences M5's leading-zero convention; what is verified is the
general scaled-error form of Hewamalage et al. eq. 11.

Checking the callers turned up a real defect. `Ruler.rmsse_m5` took the reported basis and
passed `series_for(basis)`, so on a trading basis the M5 figure was computed on the
closed-days-removed series --- removing exactly the open-to-closed transitions the lag-1
denominator exists to expose. A figure labelled M5 has to mean one thing regardless of
what sits beside it, so it now always uses the calendar series.

## The render defect from report 53

Also closed there and re-verified here: the render-only path reproduces
`interval_calibration.md` byte-identical.

## Verification

| Check | Status | Evidence |
|---|---|---|
| A7 pooled MASE unchanged by the rescoring | PASS | 0.872 / 1.184 / 0.927, identical to report 45 |
| A14 verdict unchanged after the grid widened | PASS | nothing ships, baseline retained in the 90% set |
| Bootstrap is non-degenerate at the new n | PASS | CIs have non-zero width; MCS p-values off the 0/1 rails |
| ECE edge convention is Guo's | PASS | `test_a_probability_on_a_bin_edge_falls_in_the_lower_bin` |
| p = 0 still has a bin | PASS | `test_zero_is_kept_by_the_first_bin_which_stays_closed_at_the_left` |
| Temperature scaling softens overconfidence | PASS | `test_temperature_scaling_softens_an_overconfident_agent` |
| Temperature scaling improves ECE | PASS | `test_temperature_scaling_improves_ece_on_an_overconfident_agent` |
| Temperature scaling preserves ranking | PASS | `test_temperature_scaling_preserves_the_ranking` |
| Croston/SBA match the released library | PASS | statsforecast 2.1.1 on 3.12, 1.3e-15 |
| No new suite failures | PASS | 8 failures, byte-identical to the pre-change set (`.venv-run` lacks pyarrow/pydantic) |

## Files touched

- `transfer/lovo.py` (block scoring, `_dispersion`, report)
- `signals/feature_ablation.py` (per-fold vectors, MCS ship rule, `_block_len`, widened
  grid, weather-basis MCS, report)
- `eval/agent_calibration.py` (Guo bin edges, `fit_temperature`, report)
- `eval/harness.py` (`rmsse_m5` docstring and basis-independence)
- `eval/intermittency_diagnostic.py` (stale adoption sentence in the generator)
- `config.py` (`AGENT_ECE_BINS` 10 -> 15)
- `tests/test_agent_calibration.py`, `tests/test_intermittent.py`
- `transfer/transfer_results.md`, `signals/feature_ablation.md`,
  `eval/intermittency_diagnostic.md` (regenerated)
- `ledger/code_vs_paper.md` (M8, M11, M16, M23, M24, M26)
