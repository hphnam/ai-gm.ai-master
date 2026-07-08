# PRJ93 Decision and Resolution Log

Append-only record of methodology decisions and resolved flags. Each row cites the
work-package evidence that justifies it.

## Section A: Fidelity corrections (fix/fidelity-corrections)

1. **Croston/SBA at L3: not adopted.** The intermittency diagnostic (WP2,
   `eval/intermittency_diagnostic.md`) classifies 17 of 30 non-OTHER Beer Hall item
   nodes as intermittent (ADI >= 1.32), including the keg/consumption-proxy line
   (Lager - BH, ADI 1.55), so the conditional path was triggered. On the held-out
   TEST_WEEKS block, croston_sba lost to the existing DOW-median base forecaster on
   MASE for every one of the 17 nodes (per-node table in
   `hierarchy/reconciliation_forecast.md`), so DOW-median is retained everywhere.
   The reason: these series are intermittent on the trading-day grid but still carry
   weekday structure that a flat Croston rate discards. No base forecast changed;
   MinT coherence is unaffected. (Addendum WP8: with the statsforecast cross-check
   now runnable, the Croston initialisation was corrected to phat0 = first observed
   interval, matching the oracle; the per-node comparison was re-run and no node
   verdict flipped, so this conclusion stands.) ADI blind spot (noted): ADI measures
   the spacing between successive demands, so an item that sold densely for a short
   season and then went dead (for example Lancashire crisps, zero_fraction 0.88 with
   ADI 1.00) classifies as non-intermittent; such obsolescence patterns are the
   Teunter-Syntetos-Babai case, out of scope here, and do not affect the WP2 outcome
   because Croston lost on every node that did classify as intermittent.

2. **FLAG-CP1 resolved.** CP_CUSUM_H = 5.0 retained. The empirical ARL0 is
   right-censored above the 400-day simulation horizon at every h tested (WP3,
   `eval/change_point_eval.md`), so CP_TARGET_ARL0 = 75 is replaced by
   CP_ARL0_EMPIRICAL_LB = 400. The conservative operating point is chosen
   deliberately under the project's false-alarm thesis; the binding constraint is
   detection delay, not false-alarm rate. Not a pending calibration. Detector
   outputs are byte-identical (the detector never read the target).

3. **Rung 4 evaluated (zero-shot).** [Superseded by Section B row 1, which carries
   the actual Chronos-2 run.] Chronos-Bolt-small is wired into the ladder as a
   first-class Rung-4 predictor (WP4, `models/foundation.py`), climbing the same
   milestone gate as every other rung and recording whether it beats
   rung3_global_gbm. When the backend is absent the ladder is byte-identical to its
   pre-Rung-4 behaviour (verified by report diff). The chronos/torch backend did not
   build on the Python 3.14 runtime venv, so at the time of WP4 the backend-present
   numeric result was pending; the addendum stands up a Python 3.12 eval venv and
   runs it.

4. **VUS-PR supplement computed via the pinned library / not computed with reason.**
   The scaled run gains a detector-level VUS-PR supplement on the continuous z score
   (WP5, section S6b of `PRJ93_Agent_Eval_Report.md`), computed by the pinned TSB-AD
   library with the VUS fallback, never reimplemented by hand. Neither library
   builds on the Python 3.14 venv, so the table records "not computed, dependency
   unavailable"; the system-level battery remains the headline.

5. **ACI closure probe result.** Across the Two River Taps closure (WP6,
   `eval/aci_closure_probe.md`), neither static split conformal nor ACI (gamma in
   {0.005, 0.01, 0.02}) recovers nominal coverage post-closure; both fall to ~0.5
   over the 28-day post-closure window. The break is in the mean (a permanent zero
   run), not the spread, so spread-adaptation cannot restore coverage. This is the
   evidence for the operational answer to regime change: detect, go dormant, flag
   recalibration, with per-regime online conformal as future work.

6. **Citation corrections applied (WP1).** The conformal band is described as split
   conformal recalibrated per 7-day block in the temporally robust spirit of EnbPI
   (Xu and Xie 2021); SPCI (Xu and Xie 2023) is stated as not implemented. The "Tan
   ablation" gate is renamed to its real criterion (beats rung3_global_gbm on
   held-out rolling MASE), noting Tan et al. (2024) targets LLM-backbone forecasters.
   The linear weighted miss-to-false-alarm cost sweep is no longer labelled an
   Ask-F1; the detection F1 is the Ask-F1 analogue.

## Section B: Addendum, Chronos-2 and closeout (WP8 to WP11)

Run in a Python 3.12 evaluation venv (`brain/.venv-eval`, uv-provisioned;
chronos-forecasting 2.3.1, torch 2.12.1, statsforecast 2.0.3, TSB-AD 1.5). The
runtime venv and its dependencies are untouched.

1. **Rung 4 evaluated and run: Chronos-2 zero-shot (supersedes Section A row 3).**
   The Rung-4 entrant was upgraded to Chronos-2 (`amazon/chronos-2`, the
   maintainers' current model; Chronos-Bolt kept as a same-family comparison row)
   and actually run through the existing gate (WP9, `models/foundation.py`,
   `models/ladder_results_L1_*.md`). Result, zero-shot, held-out rolling MASE:
   Beer Hall rung4_chronos2 0.793, the milestone winner, beating robust DOW (1.029),
   seasonal-naive (1.006), prophet (0.799) and rung3_global_gbm (0.905), so Rung 4
   is adopted by the gate on Beer Hall. On Two River Taps the best Rung-4 entrant is
   rung4_chronos_bolt (rolling MASE 0.612), with rung4_chronos2 at 0.636; both beat
   naive/DOW/GBM but neither beats rung2_ets (0.584), which stays selected. (All
   figures here are rolling MASE, the milestone-gate metric; the static-regime
   figures differ, e.g. TRT Bolt is 0.556 static. Quote dissertation figures from
   the report tables in `models/ladder_results_L1_*.md`, not this prose.) Ellel stays
   capped at Rung 1. Report-only: promotion (`_promote_and_serve`)
   is a separate deliberate step awaiting Nam's sign-off; no persisted band or
   forecast was changed. Backend-absent behaviour remains byte-identical.

2. **statsforecast cross-check executed and passed (closes D5).** In the eval venv
   the WP2 cross-check runs and, after the phat0 initialisation was aligned to the
   oracle (Section A row 1), matches `statsforecast.CrostonClassic`/`CrostonSBA`
   within rtol 1e-6. The WP2 adoption outcome is unchanged (DOW-median still wins).

3. **VUS-PR computed (closes D14).** With TSB-AD importable in the eval venv, the
   S6b supplement in `PRJ93_Agent_Eval_Report.md` is a populated (kind, venue, N,
   VUS-PR) table via the pinned `TSB_AD.evaluation.metrics.get_metrics` (TSB-AD 1.5).
   Sustained events score high (regime/exo 0.90 to 0.99), single-day spikes lower
   (0.76 to 0.91); the system-level battery remains the headline. All other scaled
   numbers unchanged.

4. **Chronos-2 covariate probe (WP9b), refreshing the exogenous null.** On the Beer
   Hall rolling folds (`eval/chronos2_covariate_probe.md`), Chronos-2 with only
   known-future calendar covariates (bank holiday, Ellel event, school/university
   term; weather deliberately excluded) gives a small mean MASE improvement over
   univariate (0.793 to 0.779). This nuances the logged "foundation models ingest
   covariates poorly" null: on real folds Chronos-2's covariate path helps modestly
   rather than not at all. Report-only, no ladder or gate impact.
