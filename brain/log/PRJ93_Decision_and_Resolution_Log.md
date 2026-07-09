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

5. **Beer Hall served forecaster promoted to Chronos-2 (WP12); the covariate
   variant was gated but NOT the model actually adopted, and this is the finding
   to read carefully.** Decision framing: promote the best-business-forecast
   Rung-4 entrant, live-serving-ready (nightly refresh, Square-threshold, and
   exogenous path all handled explicitly).
   - `rung4_chronos2_exo` was added as a third first-class Rung-4 entrant
     (`models/foundation.py`, `CHRONOS2_EXO_COLS` = is_bank_holiday,
     is_ellel_event, exo_is_school_term, exo_is_uni_term; never weather) and
     wired into the same milestone gate as every other rung.
   - The preview ladder CLI check (6 folds, `models/ladder_results_L1_*.md`)
     showed `rung4_chronos2_exo` winning Beer Hall at rolling MASE **0.779**,
     matching F1 exactly.
   - The REAL promotion mechanism (`ingest.refresh`'s T3 re-fit, which uses
     4 folds and no prophet - settings that predate WP12 and were not changed)
     produces a DIFFERENT winner: plain **`rung4_chronos2`** at rolling MASE
     **0.823**, beating `rung4_chronos2_exo` (0.834) and `rung4_chronos_bolt`
     (0.845) at that fold count. This is deterministic and reproducible (no
     RNG), not a fluke; the root cause is fold-count sensitivity - the
     covariate variant's win in the 6-fold check is driven by one large gain
     in an early fold that the smaller 4-fold window does not include the
     same way. Per this project's standing "the gate decides, formally; do not
     hand-pick" principle, the actually-promoted model is `rung4_chronos2`,
     not the covariate variant the spec's opening framing named. **This is a
     genuine divergence from the spec's stated decision, surfaced, not
     hidden**; reconciling T3's fold count with the ladder CLI's (so future
     refits and the documented preview agree) is a call for Nam, not made
     unilaterally here.
   - Promotion executed from a new `.venv-forecast` (Python 3.12, uv-
     provisioned; `requirements-forecast.txt`: chronos-forecasting + torch
     only, no eval-only deps). `served_forecast(beer_hall) = rung4_chronos2`,
     fresh `promoted_ts`; `/forecast?venue=beer_hall` serves
     `conformal_rung4_chronos2` exclusively, verified against a clean store.
   - Environment guards added to `ingest/refresh.py`: a chronos-less venv
     (the runtime venv, or the API's serving environment) never re-fits or
     re-promotes a Rung-4 served model as a side effect - it skips loudly with
     a named note, writes no audit row, and leaves the band untouched. The
     only path back to `rung2_ets` from such a venv is the explicit
     `refresh(..., allow_fallback=True)` (also on `POST /refresh`), which
     writes an audited `ladder_selection` row saying so. Cadence
     (`INGEST_STALENESS_DAYS`, the T3 triggers, Phase 4 fire conditions) is
     untouched.
   - TRT and Ellel come out unchanged: neither had a `served_forecast` row
     before this work and neither has one after (only Beer Hall was
     force-promoted, per the spec's literal scope). Force-refitting TRT as a
     trial surfaced a SEPARATE, pre-existing, unrelated bug - `rung3_gbm`
     (T3's 4-fold winner there) cannot actually be served via
     `wrap.evaluate` (KeyError on missing feature columns; `rung3_gbm` was
     never previously exercised through the promotion path). Left untouched,
     out of scope for WP12, flagged for a separate fix.
   - Deviation-sensitivity check (G12.7,
     `eval/chronos2_promotion_sensitivity.md`): 0 of 28 `signals.deviation.scan`
     rows differ before vs after promotion, byte-identical. This is not
     incidental - `signals.residual.build_residual_stream` (shared by
     deviation and change-point) always recomputes its own DOW-median baseline
     from `store.warehouse.read_series` and never reads `served_forecast`,
     `forecasts`, or `bands`. The spec's F6 premise ("the deviation z
     denominator is the conformal half-band of the served band") does not
     hold for this codebase; promoting any model, including Chronos-2, cannot
     change alert sensitivity through this path.
