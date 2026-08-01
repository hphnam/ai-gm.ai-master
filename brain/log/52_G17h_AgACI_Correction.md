# Report 52 - S7 G17h re-run: AgACI corrected to the published aggregation

Date: 2026-07-31. Branch `brain-construction-local`. Point model ETS, device CPU, store ceiling
2026-07-07 (unchanged from report 49, so the two runs are comparable). Style: no em-dashes,
plain prose, loud failures, verify before asserting, pre-register before running.

**This report supersedes the G column of report 49 and nothing else.** Report 49 is left
intact and annotated in place. Rewriting it would destroy the commit-ordering record that the
project's pre-registration discipline rests on.

## Headline

The G arm of report 49 was not AgACI. It departed from
\citet{zaffran_adaptive_2022} in three respects at once, and the departures were found by the
released-code comparison recorded in `ledger/code_vs_paper.md` (M3). The arm has been
reimplemented against the aggregation routine the paper is defined on and the study re-run at
the same ceiling.

**The corrected method scores worse, and no conclusion changes.** The departing
implementation was flattering the arm by 16, 3 and 18 Winkler points at the three venues.
G remains retained at Beer Hall and Two River Taps, remains eliminated at Ellel, and is
adopted nowhere. Report 49's headline finding, that no method beats the incumbent Mondrian
band at any venue, is unaffected and is now supported by a G arm that is actually the method
it is named for.

## What was wrong

Verified against `dralliag/opera` `R/BOA.R` and `R/loss.R`, and against Zaffran's own
`AgACI/Script/acp_gamma.R`, all read at source on 2026-07-31:

1. **EWA, not BOA.** Weights were `w proportional to exp(-eta (cumloss - min cumloss))`. The
   paper specifies Bernstein online aggregation.
2. **One weight vector, not two.** A single vector was derived and applied to both bounds.
   `acp_gamma.R` makes two `opera::mixture()` calls per dataset, one per bound.
3. **Summed interval loss, not per-bound pinball.** Weights were scored on the two-sided
   interval score. The released code uses `loss.type = list(name="pinball", tau=alpha/2)` for
   the lower bound and `tau=1-alpha/2` for the upper.

A fourth point recorded in passes 1 and 2 of the ledger was **wrong and is withdrawn here**:
the learning rate was not hard-coded at 1.0. That was the dataclass default; the driver
computed it per venue as `sqrt(8 ln K / T)` divided by the median absolute residual, giving
0.0019 (Beer Hall), 0.2225 (Ellel) and 0.0036 (Two River Taps). The real objection is
narrower: that expression is the textbook EWA rate for a loss bounded on a **known range**,
and the median residual was substituted for that range on a summed interval score. Theory
shaped, heuristic scale. An audit that overstates a defect is as damaging as one that misses
it, so the overstatement is recorded rather than quietly dropped.

## What changed in code

`conformal/methods.py` gains a `BOA` class, a port of `opera`'s `BOA()` under
`loss.gradient = TRUE`: the `eta_inv2 += 2.2 * r^2` rate calibration, the regularised regret
`r - r^2/sqrt(eta_inv2)`, the log-domain weight
`aux = -log(eta_inv2)/2 + log(w0) + R_reg/sqrt(eta_inv2)`, and the uniform-`w0` cold start.
`AgACI` now holds two aggregators per horizon step, at `tau = alpha/2` and
`tau = 1 - alpha/2`, updated independently, and carries the emitted aggregate forward with
the expert bounds because BOA linearises its regret at that aggregate and other origins
update the same step in between.

**The rate choice is removed, not relocated.** BOA calibrates `eta_i,t` per expert from
accumulated squared regret, so the arm now contains no tuned aggregation constant.
`_eta_for` is deleted, `eta` is gone from `run_online` and `AgACI`, and the artefact key
`eta_agaci` is replaced by `agaci_aggregation`.

## Results

Mean Winkler interval score at nominal 90 percent, lower is better. Fold counts 250, 237 and
182 origins (1750, 1659 and 1274 interval-observation pairs), unchanged.

| Venue | P | D | S | A | G (report 49) | G (corrected) | delta |
|---|---|---|---|---|---|---|---|
| Beer Hall      | 1940 | **1807** | 1928 | 1814 | 1820 | 1837 | +16.3 |
| Ellel          | 1435 | **1263** | 1367 | 1422 | 1477 | 1480 | +3.1  |
| Two River Taps | 654  | **646**  | 670  | 671  | 675  | 693  | +17.7 |

**P, D, S and A are unchanged to the digit.** That is the control: the reimplementation
touched only the arm it was meant to touch, and the harness is deterministic across the two
runs.

Model confidence set at alpha = 0.10, and the MCS p-values:

| Venue | 90% set | p (report 49) | p (corrected) |
|---|---|---|---|
| Beer Hall      | {D,A,G,S,P} unchanged | G 0.941 | G 0.725 |
| Ellel          | {D} alone, unchanged  | G 0.002 | G 0.001 |
| Two River Taps | {D,P,S,A,G} unchanged | G 0.211 | G 0.191 |

Ellel still eliminates every alternative at `p <= 0.016` (the maximum over eliminated arms is
S at 0.016, unchanged). Adoption remains empty at all three venues.

Secondary quantities for G: Beer Hall mean width 1067.9 -> 1025.6 with marginal coverage
0.8931 -> 0.8914; Ellel 561.2 -> 564.4, coverage 0.8825 -> 0.8813; Two River Taps
506.3 -> 502.7, coverage 0.9301 -> 0.9176. The Beer Hall arm is narrower and scores worse,
which is the expected shape: the corrected aggregation buys less width and pays for it in
misses.

## Verification

| Check | Status | Evidence |
|---|---|---|
| BOA matches the released opera implementation | PASS | `test_boa_reproduces_the_opera_weight_update_after_one_round` and `..._over_three_rounds`, expected vectors `[0.79386788, 0.20613212]` and `[0.92384867, 0.07615133]` derived by transcribing `R/BOA.R` and `R/loss.R` independently of our port |
| Cold start is the uniform w0 branch | PASS | `test_boa_weights_are_uniform_before_any_expert_accrues_regret` |
| The two bounds aggregate independently | PASS | `test_agaci_aggregates_the_two_bounds_with_independent_weights` |
| G4 AgACI reduces to ACI on a degenerate grid | PASS (unchanged) | `test_agaci_single_gamma_reduces_to_aci`, bands identical to 0.0, carried over from report 49 without modification |
| Store ceiling gate | PASS | `assert_store_ceiling()` returns 2026-07-07, same as report 49 |

15 of 15 in `tests/test_interval_calibration.py`. Three failures elsewhere in the suite
(`test_briefing`, `test_ingest_refresh`, `test_promote_and_serve`) were confirmed identical
with these edits stashed and are the `.venv-run` environment missing `pyarrow` and
`pydantic`, not regressions.

## Defect found and not fixed

`python -m eval.interval_calibration` **without** `--build` cannot run. `render()` re-reads
its own persisted JSON and indexes `per_step` with integer keys, which JSON has turned into
strings, raising `KeyError: 1` at `interval_calibration.py:429`. This predates the present
work and is unrelated to it. Only the `--build` path is exercised, which is why it went
unnoticed. One-line fix (`str(h)`), not taken here because it is outside this change.

## Files touched

- `conformal/methods.py` (new `BOA` class, `AgACI` rewritten to two per-bound aggregators)
- `eval/interval_calibration.py` (`_eta_for` deleted, `eta` removed from the call chain,
  memo widened to carry the emitted aggregate, artefact key renamed)
- `tests/test_interval_calibration.py` (four new tests, two call sites updated)
- `eval/interval_calibration_L1.json`, `_mcs.json`, `.md` (regenerated)
- `ledger/code_vs_paper.md` (M3 resolution)
