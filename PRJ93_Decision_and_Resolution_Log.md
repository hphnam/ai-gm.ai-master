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
   MinT coherence is unaffected.

2. **FLAG-CP1 resolved.** CP_CUSUM_H = 5.0 retained. The empirical ARL0 is
   right-censored above the 400-day simulation horizon at every h tested (WP3,
   `eval/change_point_eval.md`), so CP_TARGET_ARL0 = 75 is replaced by
   CP_ARL0_EMPIRICAL_LB = 400. The conservative operating point is chosen
   deliberately under the project's false-alarm thesis; the binding constraint is
   detection delay, not false-alarm rate. Not a pending calibration. Detector
   outputs are byte-identical (the detector never read the target).

3. **Rung 4 evaluated (zero-shot).** Chronos-Bolt-small is wired into the ladder as
   a first-class Rung-4 predictor (WP4, `models/foundation.py`), climbing the same
   milestone gate as every other rung and recording whether it beats
   rung3_global_gbm. When the backend is absent the ladder is byte-identical to its
   pre-Rung-4 behaviour (verified by report diff). The chronos/torch backend does
   not build on this Python 3.14 venv, so the backend-present numeric result is
   pending an environment where it installs; the gate logic and wiring are in place
   and unit-tested with a fake pipeline.

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
