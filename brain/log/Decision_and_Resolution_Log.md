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

## Section C: Post-WP12 milestones (G12.9 to G12.11)

Continuation of the Section B numbering (rows 6 to 10), authored on
`brain-construction`. These record the fold unification, the `is_ellel_event`
leak fix, the full exo set, the Neon adapter, the World Cup fixtures, the store
flags, and the G12.11 corrections. They were first written self-contained in the
numbered reports (`17_G12_9_Report.md`, `19_G12_10_Report.md`); this section folds
them into the append-only log so it is the continuous WP1-to-present record.

6. **G12.9: rolling-fold count unified at 6, per-fold MASE audit added, Ellel
   uncapped, weather cells made per-venue precise** (`17_G12_9_Report.md`,
   `PRJ93_Spec_G12_9.md` gates a to g). Served models unchanged; no commits at
   report time.
   - **a, fold unification.** `ingest.refresh._refit_ladder` now evaluates at
     `n_folds=6` (was 4), so the real T3 re-fit and the `models.ladder` CLI
     backtest agree on fold count. This resolves the WP12 divergence flagged in
     Section B row 5 (the 4-fold T3 picked `rung4_chronos2` while the 6-fold CLI
     preview picked `rung4_chronos2_exo`); the fold-count reconciliation left open
     for Nam there is now made, on the side of 6.
   - **b, per-fold audit.** `ladder_selection` gains `per_fold_mase VARCHAR` and
     `n_folds INTEGER` (idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`),
     populated from the winner's per-fold vector, so a single-fold-dominant win is
     visible in the audit row instead of hidden behind the mean.
   - **c, Ellel uncap.** `config.MAX_RUNG = {}` (was `{"ellel": 1}`): Ellel is no
     longer capped at Rung 1. Real run: the milestone gate is met on Ellel by
     `rung3_gbm` at rolling MASE 0.533, so the cap hypothesis is falsified (a rung
     above Rung 1 IS adoptable on Ellel's ~64 trading days). NOTE that 0.533 GBM
     win was later found to be a leak artifact and retired at G12.10a2 (row 7); the
     surviving G12.9c finding is that uncapping was correct, not that GBM
     specifically won. `EVENT_ONLY_VENUES` was found never to have gated the
     ladder cap (only `MAX_RUNG` did), so no code split was needed, only a
     docstring clarification.
   - **d, self-leak (first cut).** `is_ellel_event` is a near-deterministic
     self-signal on Ellel's own frame. G12.9 added `exo_cols_for_venue(venue)` to
     drop the column from the Chronos-2-exo entrant for Ellel only, threaded
     through both the ladder backtest and the served path (`conformal.wrap`). This
     entrant-level exclusion was superseded at G12.10a2 by a source-level fix once
     Ellel's uncapping exposed the same leak in the GBM rungs too.
   - **e, weather precision.** `WEATHER_CELLS`/`WEATHER_CELL_COORDS` gave each
     venue its own cell and precise coordinate; TRT's cell was renamed `trt_south`
     to `preston` with a Preston city-centre placeholder coordinate (the exact
     street coordinate was not supplied; `FLAG-FE-TRTLOC` left resolved-pending).
     The placeholder was corrected to the real TRT coordinate at G12.10a (row 7).
   - **f/g.** Two known gaps logged in `FLAGS.md` (`FLAG-G12.9-1` Ellel-event
     dormant-forward gap; `FLAG-G12.9-2` TRT `rung3_global_gbm` serving bug, traced
     to a `ValueError` in `conformal.wrap._predictor`, not the spec's assumed
     `KeyError`); the downstream rerun matrix written to `18_DOWNSTREAM.md`, with
     V5/V6 verified by reading the code (`signals.residual` and
     `signals.stock_inventory` never read `served_forecast`, so uncapping Ellel
     cannot shift deviation or stock outputs).

7. **G12.10: TRT coordinate corrected, `is_ellel_event` leak fixed at source, full
   exo factor set fed to the Chronos-2 entrant, Neon adapter wired, World Cup 2026
   fixtures added, store persistence flags** (`19_G12_10_Report.md`,
   `PRJ93_Spec_G12_10.md`, executed a to a2 to c to d to e to b to f). Served
   models unchanged.
   - **a, TRT coordinate.** `WEATHER_CELLS["two_river_taps"]` re-keyed to the venue
     name (uniform with BH/Ellel) and `WEATHER_CELL_COORDS["two_river_taps"] =
     (53.875094..., -2.759934...)`, the Nam-confirmed venue coordinate; the G12.9
     `preston` placeholder removed and `FLAG-FE-TRTLOC` marked RESOLVED. Committed
     TRT ladder numbers are unchanged (its winner `rung2_ets` consumes no weather);
     the coordinate now feeds the fat exo entrant, where TRT's `rung4_chronos2_exo`
     moved 0.623 to 0.612.
   - **a2, leak fixed at source (material finding).** `is_ellel_event` is set to
     constant 0 on the Ellel frame in `build_features` (kept for schema stability),
     genuine spillover elsewhere. This protects EVERY Ellel rung that reads the
     frame, not just the Chronos entrant, which is why the fix had to move from the
     entrant (G12.9d) to the source once Ellel was uncapped and the GBM rungs began
     consuming the leak. Effect: Ellel's rolling `rung3_gbm` fell from the
     leak-inflated 0.533 (G12.9c) to an honest 0.813 (`rung3_global_gbm` to 0.936).
     The spurious result is the GBM win specifically; the G12.9c hypothesis that a
     foundation model competes on a sparse venue without per-venue training SURVIVES
     (`rung4_chronos2` 0.581, essentially tied with the baseline, not collapsed).
     See row 8 for the corrected milestone reading.
   - **b, full exo universe.** `CHRONOS2_EXO_COLS` is now the full known-future set
     (calendar + inert-not-excluded `is_ellel_event` + civic `exo_fixture_nearby` +
     four `wc_*` + weather `exo_temp_c`/`exo_rain_mm`/`exo_sunshine_hrs`/
     `exo_is_dry`); `chronos2_exo_cols(venue)` returns it for all venues (the G12.9d
     Ellel special-case removed, the source fix is the single point of truth).
     Weather is admitted as known-future ONLY on a forecast serving basis: the
     entrant raises if `WEATHER_TRAIN_BASIS == "observed"` (that would leak the ERA5
     upper bound) and records the basis (`hindcast`). Real rerun: the fuller set
     helps the anchor (BH 0.779 to 0.745), is neutral for TRT (0.623 to 0.612), and
     slightly worsens the sparse Ellel exo entrant (0.570 to 0.591); the gate
     decides adoption as always.
   - **c, adapter-only ingestion + Neon.** `NeonAdapter.latest_available_date` and
     `fetch_transactions(since)` implemented read-only against `brain_txn` (psycopg
     v3 imported inside the method, DSN from `BRAIN_NEON_DSN`, `since` parameterised),
     inert while `LIVE_INGEST=0`, raising loudly if live-but-unprovisioned;
     `_to_txn_schema` maps to `TXN_COLUMNS` deriving only config-known columns, never
     fabricating transaction facts. NOT integration-tested against live Neon (Ryan
     owns the DSN and schema); per the spec no June rows were simulated to pass a
     test. `FLAGS.md` records the committed-seed ceiling 2026-05-31, that June-onward
     data lives in Ryan's Neon, and that manual CSV injection is retired
     (`FLAG-INGEST-NEON`).
   - **d, World Cup fixtures, code-derived relevance.** New `ingest/world_cup.py`
     parses all 104 matches from Nam's `world_cup_schedule.md` by column meaning,
     derives each venue's per-DOW trading window as a robust 1st/99th-percentile
     envelope from real transaction timestamps (persisted to `venue_trading_hours`),
     and emits four un-ranked `wc_*` covariates per venue per date by
     kickoff-vs-trading-hours overlap (2h assumed duration), scoped to BH + Ellel
     (TRT all-zero). No hand-set rank or fixed hour cap: a 02:00 kickoff is excluded
     automatically because no venue trades then. `signals.residual.attribute` now
     names the specific coincident fixture (strict coincidence). On the committed
     store all `wc_*` are 0 (the tournament, 11 Jun to 19 Jul 2026, is entirely
     after the 2026-05-31 seed ceiling), the honest forward-looking state; they fire
     once June arrives.
   - **e, June-vs-World-Cup probe.** `eval/worldcup_fixture_probe.py` is report-only
     and precondition-checks the local watermark; on this store (`MAX(date) =
     2026-05-31`) it reports "June not present, test deferred" and fabricates
     nothing. Re-checked at G12.11 Part B: still no June in the active DuckDB (the
     only store on disk; `BRAIN_STORE_DIR` unset), so the probe did not run. The
     fixture-effect and `wc_*` retention question stays open pending a June-inclusive
     store (see row 9).
   - **f, store persistence.** `STORE_DIR` now reads a `BRAIN_STORE_DIR` env override
     (default identical to the in-repo `brain/store`) so the live service can point
     DuckDB at a mounted volume (`FLAG-STORE-ENV`); the DuckDB-derived-store vs
     Neon-SOR topology documented as a Ryan decision (`FLAG-STORE-SOR`).

8. **G12.11: Ellel milestone reading corrected; the a2 leak fix retired an
   incidental GBM artifact, not the G12.9c decision** (docs-only; recorded in
   `19_G12_10_Report.md` as row B6). After the G12.10a2 source fix neutralised the
   `is_ellel_event` self-leak, Ellel's rolling `rung3_gbm` fell from a
   leakage-inflated 0.533 (G12.9c) to an honest 0.813 (`rung3_global_gbm` to 0.936).
   Reading the corrected 6-fold milestone table: robust DOW wins at 0.572, with
   `rung4_chronos2` a near-tie at 0.581 (within 1.6%, zero-shot, on a ~64-day sparse
   venue), `rung4_chronos2_exo` 0.591, `rung4_chronos_bolt` 0.601; the classical and
   ML rungs trail (STL 0.629, GBM 0.813, ETS 0.825). Conclusion: Ellel serves Rung 1
   because the cheap baseline is marginally best here, honestly, NOT because the
   foundation models failed (Chronos ties DOW, it does not beat it). What was
   spurious is the GBM win specifically; what survives G12.9c is the core hypothesis
   that a foundation model competes on a sparse venue without per-venue training.
   Uncapping sparse venues is vindicated for foundation rungs (they stay
   competitive) but not for classical or ML rungs, and the uncap also acted as a
   leak detector by surfacing the latent GBM `is_ellel_event` dependency. Served
   models unchanged (report-only correction).

9. **G12.11: World Cup fixture probe deferred, no June in the local store**
   (recorded in `19_G12_10_Report.md` as row B7). The `wc_*` fixture-effect question
   needs a June-inclusive store (the tournament, 11 Jun to 19 Jul 2026, is entirely
   after the committed CSV seed ceiling of 2026-05-31). Re-checked in Nam's local
   checkout: the active DuckDB (the only store on disk; `BRAIN_STORE_DIR` unset)
   still ends 2026-05-31 for Beer Hall (Ellel 2026-05-22, TRT 2026-05-08).
   June-onward rows are not in the active store (they live in Ryan's Neon per
   FLAG-INGEST-NEON, or a local file not loaded into this DuckDB). Per the stop
   condition the probe did not run and nothing was fabricated; the retention decision
   for the `wc_*` features (kept in the served exo covariate set, or dropped from the
   forecast and kept only for the reasoning/attribution path) stays open pending that
   data. Served models unchanged.

10. **G12.11: PRJ93 reports plus the decision log consolidated into `brain/log/`,
    numbered by implementation order** (recorded in `19_G12_10_Report.md` as row B8).
    All 17 archival WP1 to WP12 reports and this decision log (previously at repo
    root on `feat/chronos2-promotion`) plus this branch's G12.9, G12.10, and
    DOWNSTREAM reports were gathered into `brain/log/` on `brain-construction`,
    renamed with a two-digit implementation-order prefix (traced by each report's
    first-commit date) and the `PRJ93_` prefix dropped (`01_Phase2_Build_Report`
    through `19_G12_10_Report`; this cross-cutting log left un-numbered).
    `brain/log/README.md` is the authoritative index and states the ordering caveat
    (a few late-committed docs sit by commit date, not strict work-package order,
    e.g. `12_WorldCup_LiveProbe` predates `16_Chronos2_Promotion` though it builds on
    the promotion). Rationale: the brain now carries one self-contained, up-to-date
    log folder rather than depending on a diverging archival branch. Docs-only; no
    code, served model, or gate criteria touched. Two follow-ups were recorded in the
    report: (a) appending the G12.9-onward rows to this log to make it a continuous
    record, which is now done by rows 6 to 10 of this section; (b) internal
    cross-references inside the archival reports still use the old `PRJ93_*`
    filenames (historical snapshots, left unaltered), so only the live
    `brain/FLAGS.md` link was repointed (to `log/18_DOWNSTREAM.md`).

11. **G12.12: go-live June forecast attempted, clean STOP at gate a (June absent,
    Neon not provisioned)** (`20_G12_12_GoLive_Forecast_Report.md`,
    `PRJ93_Spec_G12_12_GoLive.md`). The go-live config was to serve each venue's
    gate winner pure at L1 (BH `rung4_chronos2_exo` 0.745, TRT `rung2_ets` 0.597,
    Ellel `rung1_robust_dow` 0.572), produce a June-inclusive forward horizon with
    the full known-future exo set, and connect L2/L3 to the accurate top by a
    MEASURED choice (Candidate A MinT-with-Chronos-top vs Candidate B
    forecast-proportion disaggregation, per-venue lower held-out L3 item MASE wins;
    served venue total stays pure L1, never reconciled downward). Corrected MinT
    reasoning stands for when it runs: reconciliation (Wickramasuriya, Athanasopoulos
    & Hyndman 2019) adjusts ALL levels including the top so the reconciled top is a
    blend not the preserved Chronos number, its "no worse than base" guarantee
    assumes unbiased bases and the DOW-median L2/L3 base is biased, and top-down
    disaggregation introduces its own bias, so the A-vs-B tension is measured not
    asserted. **None of this executed:** the gate-a precondition (June in the
    readable store) failed. The only DuckDB on disk (`BRAIN_STORE_DIR` unset) tops
    out at 2026-05-31 for Beer Hall (Ellel 2026-05-22, TRT 2026-05-08); the May seed
    is unchanged. Neon could not advance the watermark here: `BRAIN_NEON_DSN` unset,
    no dotenv, and `psycopg` absent from `.venv-forecast`, so the `NeonAdapter`
    cannot connect. Per the spec's stop condition the run STOPped and fabricated
    nothing: no model promoted, no forecast persisted. Sole unblocker: Ryan
    provisioning the Neon `brain_txn` source (DSN + schema + driver) so `NeonAdapter`
    ingests June leak-free (`INGEST_SOURCE=neon LIVE_INGEST=1 python -m
    ingest.refresh`), after which the spec re-runs from gate a. Incidental finding
    recorded for that re-run: the on-disk BH `served_forecast` is currently
    `rung2_ets`, not the gate winner `rung4_chronos2_exo` (store reset since WP12);
    correcting it is the first step of the blocked gate b.

12. **G12.13a: forward June 2026 forecast frozen and pre-registered, blind to
    actuals** (`21_G12_13a_Frozen_Forecast_Report.md`, Pass 1 of the derived
    G12.13 two-pass confrontation; no standalone G12.13a spec existed, so Pass 1 was
    derived from the Pass-1 references in `PRJ93_Spec_G12_13b_Pass2_Confront.md` with
    operator authorisation). `sim/build_frozen_forecast.py` produced a genuine
    forward 1 to 30 June horizon from data on or before each venue's store ceiling
    (<= 2026-05-31), serving each gate winner PURE at L1 (beer_hall
    `rung4_chronos2_exo` June total GBP 13,917 band +/- 627; two_river_taps
    `rung2_ets` GBP 5,329; ellel `rung1_robust_dow` GBP 604) and disaggregating
    coherently to L2/L3 by recent 120-day ex-VAT revenue share (verified L2 sums to
    L1 exactly, L3 to L2). Known-future covariates are calendar + term + bank
    holiday + the four `wc_*` fixture flags (computed forward), `is_ellel_event`=0
    forward, and CLIMATOLOGY weather (prior-June mean) because there is no skilful
    weather forecast beyond ~16 days: the day-8-to-30 extrapolation caveat. The
    frozen Beer Hall rows pre-commit to three June England fixtures (17 Jun v
    Croatia, 23 Jun v Ghana, 27 Jun v Panama, all evening) flagged
    `wc_england_in_hours=1`, the dates Pass 2 tests the fixture effect on. Nothing
    was fit to June; no June actual was read; the artefact
    (`brain/sim/june2026_forecast_frozen.{parquet,json}`, 3030 rows) is committed in
    this pass so `git log` proves it predates the confrontation (A13b.0). Deviations:
    derived spec (op-authorised); climatology weather beyond horizon;
    is_ellel_event=0 forward; L2/L3 by revenue-share disaggregation not MinT (the
    G12.12c A-vs-B deferred, disaggregation preserving the pure L1 top); L3 scoped to
    top-3 items/category + OTHER; TRT INACTIVE in Square so its forecast may confront
    a closed venue (retained as honest material); two commits not one, so the frozen
    forecast provably predates Pass 2.

13. **G12.13b: frozen June forecast confronted with real held-out actuals; full
    brain run over June; leak-free** (`22_G12_13b_June_Simulation_Report.md`, Pass 2
    of 2). Mode MCP-SIM (Square Reporting API `SalesUK` view via the Claude Code
    connector, a labelled stand-in for Ryan's `NeonAdapter`, NOT that path). A13b.0
    held: the frozen commit `1d966be` (2026-07-09 22:41:58 +0100) provably predates
    the actuals refresh (22:46:48 +0100), and the forecast was loaded from the
    committed parquet, not regenerated. **Pre-registered cold 30-day L1 out-of-sample
    (MASE all-days / trading-days vs 7-day backtest):** beer_hall 1.64 / 1.95 (vs
    0.745), actual GBP 26,890 vs frozen GBP 13,917 (June ran much bigger than a
    May-trained cold horizon could see: the cold-start ceiling, not a regression);
    two_river_taps forecast GBP 5,329 vs actual GBP 0 (venue INACTIVE/closed, the
    key go-live lesson: no liveness gate); ellel 0.49 all-days but 2.91 trading (a
    GBP 2,287 private event on 20 Jun it could not know; all-days flattered by joint
    zeros). **Realistic weekly-rolling (progressive actuals, labelled separately):**
    beer_hall 1.47, TRT 0.32 (learns the closure), ellel 0.49 - better than cold,
    the honest two-sided picture. **World Cup fixture effect (BH England dates,
    directional, power caveat):** positive on all three: 17 Jun v Croatia actual GBP
    607 vs DOW-median GBP 289 (+110%), 23 Jun v Ghana opened on a normally-closed
    Tuesday (GBP 335 vs GBP 0), 27 Jun v Panama GBP 3,082 vs GBP 1,235 (+150%); the
    frozen `wc_*` flags marked the days but the cold magnitude under-shot. **Full
    brain over June (existing modules, store COPY, served store untouched):**
    deviation flagged the four World Cup Saturdays (BH) + six closed-venue days (TRT)
    + the Ellel event, no ordinary-day false positives; change-point recorded 0 new
    June onsets (the closure and the Dec cold-snap onset earlier, carried as
    continuing, correct); briefing never went silent on eventful June. Two go-live
    gaps surfaced and FLAGGED not built (simulation adds no detector): attribution
    lists every coincident fixture (needs ranking), and per-day briefing without a
    persisted `briefing_runs` chain over-counts continuing items (fatigue number is
    an upper bound). Leak-free verified: actuals only in `brain/sim/` eval files,
    never in served_forecast/forecasts/l1_daily; served `l1_daily` still ends
    2026-05-31. Deviations: MCP-SIM not LIVE-NEON; L1 via SalesUK aggregate not
    per-order; L3 not scored (item-taxonomy reconciliation deferred); briefing
    fatigue upper bound; attribution verbosity flagged; two commits not one.

14. **G12.13 reconciled against the canonical Pass-1/Pass-2 specs; measured A-vs-B
    split closed** (`23_G12_13_Canonical_Reconciliation_Report.md`). The canonical
    `PRJ93_Spec_G12_13a_Pass1_Freeze.md` and `..._G12_13b_Pass2_Confront.md` arrived
    after the passes were first run from the Pass-1 references embedded in the Pass-2
    spec. Both passes stand as committed (`1d966be`, `c1b11d6`); the frozen artefact
    was NOT re-generated (June actuals were seen in Pass 2, so a re-freeze would be
    post-hoc). Closed the one substantive gap, canonical A13a.3's MEASURED L2/L3
    split, blind on the pre-June held-out block (`sim/ab_split_measured.py`, L3 item
    revenue MASE): Candidate A MinT-with-gate-winner-top vs Candidate B disaggregation
    gave beer_hall 0.662 vs 0.734 (MinT), two_river_taps 0.810 vs 0.910 (MinT), ellel
    0.746 vs 0.730 (disaggregation). The frozen uniform disaggregation matches the
    measured winner only for Ellel; MinT would have bettered L2/L3 for BH and TRT by
    ~10% each. No effect on the served pure-L1 top (both only redistribute within the
    total); recorded as a forward recommendation for the real go-live re-freeze, not a
    retro edit. Also recorded the starting provenance the canonical A13a.1 wants
    (pre-Pass-1 HEAD `00fa5be`, store ceiling 2026-05-31, manifest sha256 5285...9026)
    and rendered the human-readable `brain/sim/june2026_forecast_frozen.md` from the
    committed artefact (canonical A13a.4). All other acceptance checks map PASS.
    Incidental: the working tree had reverted several already-committed G12.13 files
    (a sync/stash artefact); all restored from HEAD `c1b11d6`, no committed content
    lost. Reconciliation is docs + blind pre-June analysis only; no served model, gate
    criterion, or frozen number changed.

15. **G12.15: refresh cadence, MPS device, home-nation fixtures, event-aware policy**
    (`24_G12_15_Report.md`, `PRJ93_Spec_G12_15_v2.md`; committed per gate a9d147f /
    39610aa / 0564389 / b96747e / ec78d4d). **(a)** Chronos loads resolve their torch
    device via `_resolve_device()` (mps on this Mac, cpu fallback, never cuda;
    `BRAIN_TORCH_DEVICE` override; `PYTORCH_ENABLE_MPS_FALLBACK=1`). MPS-vs-CPU parity
    GBP 0.0002, served numbers unchanged. Honest deviation: MPS is SLOWER than CPU for
    these small single-series forecasts (~3.2s vs ~0.6s); daily refresh is still cheap
    but because the model is fast, not the GPU. **(b)** Added `wc_scotland_in_hours` +
    `wc_home_nation_in_hours` raw to `WC_FEATURE_COLS`/`CHRONOS2_EXO_COLS`. Measured
    June uplift (actual vs DOW-median), Beer Hall: England +130% (n=3), Scotland +116%
    (n=2), other-match +57%, no-match +55%. Both home nations drive footfall, generic
    matches do not; recommend the home-nation flag over England-only, all three kept
    raw. Power caveat: 3+2 dates, directional. **SUPERSEDED by row 21(e):** the 11 July
    England QF realised a lift BELOW its DOW baseline while the same window's generic
    Friday fixture beat its own, inverting this ordering out-of-sample. The power caveat
    was the right one; n=3 did not generalise. The covariates stay raw and unranked (that
    decision is unaffected), but "England +130%, generic within noise" must not be quoted
    as a finding. **(c)** Cadence sweep (cold/7/3/daily,
    on MPS, L1 + L2): Beer Hall best at 7-day (L1 MASE 1.45; gain is cold 1.645 ->
    weekly, sub-weekly 1.56/1.60 does NOT help, contradicting "daily is better"); Two
    River Taps monotonic to daily 0.09 but only by learning the closure faster; Ellel
    flat 0.485 (DOW model ignores recent context). First fixture unforecastable from
    cadence; L2 mirrors L1 (fixed-share disaggregation); L3 item vs actuals still the
    taxonomy gap. Daily refresh <=4s. **(d)** Event-aware refresh: T3 cadence tightens
    7d -> 2d inside a flagged window (World Cup match in-hours or curated local event
    within a 3-day lookahead), calendar-triggered not hard-coded, owner-controllable
    (`BRAIN_EVENT_REFRESH_DISABLED=1`), reason string states the override, cost
    guarantee preserved (`_in_event_window`/`_should_refit`, FLAG-EVENT-REFRESH).
    **(e)** Stock untouched (git-verified); FLAG-STOCK-STATUS records real-data-but-
    pending-James (menu-to-stock mapping + delivery dates) and the downstream link.
    Design note recorded: bespoke World Cup features -> agent-generated forward event
    covariates is the next research milestone (enrichment from explanation to
    anticipation), not built here. Frozen artefact (`1d966be`) untouched; both suites
    green (.venv-forecast 258 passed 1 skip, .venv 251 passed 8 skip).

16. **G12.16: item and category taxonomy reconciliation (Square to brain L2/L3)**
    (`25_G12_16_Report.md`, `PRJ93_Spec_G12_16_Taxonomy.md`; committed per gate
    0a21c75 / 85b209b / 1b8fb88). Builds the canonical Square-to-brain evaluation map
    (`ingest/taxonomy_map.md` + `ingest/taxonomy.py`, loud-fail on unmapped category)
    and closes the standing L3 gap from reports 22 and 24. **(a)** Category map: all 8
    June Square categories map (100 percent net-sales coverage), sole non-identity row
    `Uncategorized` to `Uncategorised`; re-scoring the June L2 confront THROUGH the map
    reproduces report 22 exactly (BH MAE 1660, Ellel 347), so names-only realignment
    moves no number. **(b)** Pulled June at ITEM grain held-out
    (`june2026_actuals_l3_raw.json`, 867 daily rows, BH+Ellel; TRT closed, Events out
    of scope), reconciling to the L2 pull exactly (max diff GBP 0.00). Item map is 41
    named nodes, all identity, zero aliases. First real L3 revenue MASE
    (`sim/score_l3.py`): Beer Hall all-node median 1.33 (mean 1.70), Ellel 0.24;
    per-venue actuals conserve to the L1 total. **Finding: taxonomy DRIFT, not name
    misalignment.** The frozen historical top-3 captured only 26 percent (BH) / 15
    percent (Ellel) of June revenue; the historical number-one node `Lager - BH` sold
    GBP 14.86 after being split into branded lines (`LuneBrew Pilsner` GBP 3,484, all
    in OTHER). The OTHER buckets are large and under-forecast. Fix is refreshing the
    top-k node selection before the next freeze (FLAG-TAXONOMY-DRIFT), not more
    aliases. **(c)** Wired the map into `confront_june` (replaces the raw-string
    `CAT_FIX`) as the single eval source of truth; `tests/test_taxonomy.py` (7 tests:
    resolution, loud-fail, OTHER routing, revenue conservation). Deviations logged in
    the report: degenerate-scale nodes excluded from MASE aggregates (median is the
    robust headline); scored the union of frozen and actual-landing nodes for exact
    conservation; TRT categories pre-mapped for July. This EVAL map (Square sales items
    to brain forecast items) is distinct from James's STOCK map (brain/menu items to
    keg lines); named separately in FLAG-TAXONOMY-MAP. Frozen artefact (`1d966be`) and
    `stock_inventory.py` untouched; both suites green (.venv-forecast 265 passed 1
    skip, .venv 258 passed 8 skip).

17. **G12.17a (Pass 1 of 2): advance to end-June, refresh, freeze the July forecast**
    (`26_G12_17a_July_Pass1_Report.md`, `PRJ93_Spec_G12_17a_July_Pass1.md`; this
    pre-registration commit adds `sim/july2026_forecast_frozen.*`). Advances the
    operational clock one period. **(0)** June ingested into the served store at
    aggregate grain (MCP-SIM, Neon not provisioned): 867 rows, ceiling 2026-06-29
    (no trade on the 30th; as-of/watermark 2026-06-30), Ellel reconciles to SalesUK to
    GBP 0.00, Beer Hall within GBP 180/month; weather tables extended over June + Jul
    1 to 7 so the training frame has no NaN exo. **(1)** Liveness gate
    `active_span.is_dormant` (zero trading for `DORMANCY_LOOKBACK_DAYS=21` to the
    as-of, generic, reactivation automatic): Two River Taps DORMANT, Beer Hall + Ellel
    live; consulted at the freeze so TRT is not forecast (fixes June's GBP 5,329-vs-0
    miss); 4 tests. **(2)** Taxonomy refresh (`build_hierarchy` `since` window): Beer
    Hall 29 to 32 nodes, `Beer::LuneBrew Pilsner` now tracked (June's GBP 3,484 item
    that was all OTHER), stale `Caravan of Love` drops; Ellel 17 to 19. Stale-node fix
    is real; the new-item residual is irreducible. **(3)** 6-fold June-inclusive refit:
    robust-DOW edges Chronos-exo at Beer Hall (1.228 vs 1.375, Chronos-exo 4th, exo
    margin turns negative) and Chronos-bolt edges robust-DOW at Ellel (0.608 vs 0.633);
    both marginal single-refit deltas over a volatile World Cup June, RECORDED
    flagged-not-adopted (a promoted model is not hot-swapped, per the ladder_selection
    adoption gate), so the standing winners are served (keeping Beer Hall fixture-aware
    for the Pass 2 test). **(4)** Frozen blind July 1 to 7 (`sim/build_july_forecast`):
    Beer Hall Chronos-exo + MinT GBP 3,917 (1 Jul GBP 487, above the Wed median GBP
    296), Ellel robust-DOW + disaggregation GBP 56, TRT dormant; real hindcast weather;
    the 1 Jul England v DR Congo (17:00) fixture flag fires for Beer Hall only and the
    6 Jul 02:00 match does not; all levels coherent; 462 rows. Deviations: ceiling is
    the 29th; refit not adopted; the agent-eval weather baseline is now seasonal
    (trailing window) and the injection oracle is pinned to its calibration ceiling
    (`AGENT_EVAL_STREAM_CEILING`) so advancing the store does not slide it into the
    live World Cup. No July sales actual read; `1d966be` and `stock_inventory.py`
    untouched; both suites green (.venv-forecast 269 passed 1 skip). Pass 2 (G12.17b)
    confronts this artefact with July reality.

18. **G12.17b (Pass 2 of 2): confront July reality, in-context test, run the brain**
    (`27_G12_17b_July_Pass2_Report.md`, `PRJ93_Spec_G12_17b_July_Pass2.md`; cites
    Pass-1 SHA 7d103aaa). Held-out July 1 to 7 actuals pulled (MCP-SIM: SalesUK L1 +
    ProductMix item L2/L3, ex-VAT, `sim/july2026_actuals_*.json`, never in the served
    store; reconciles to GBP 0.00 Ellel / GBP 29 Beer Hall). **Stage 1** the 7-day
    horizon lands Beer Hall L1 at MASE 0.386 (band cover 1.00), inside the 0.745
    backtest class and far better than June's 30-day 1.64; Ellel 0.070; L3 all-node
    MASE median Beer Hall 0.72, Ellel 0.08; TRT produced no forecast and no actual
    (liveness gate's fix of June's 5,329-vs-0, confirmed). **Stage 2 in-context test:**
    the July forecast lifted 1 Jul GBP 191 ABOVE the Wednesday baseline (frozen 487 vs
    median 296, actual 747) in anticipation of England v DR Congo, where June's first
    in-hours fixture sat at baseline (report 22) - June's fixture days, now in training,
    taught the Chronos-exo `wc_england_in_hours` effect. Single in-hours date,
    directional not significant, magnitude under-shot; caveated as such. **Stage 3
    drift decomposition:** refreshed-taxonomy named coverage jumps Ellel +38pp
    (15%->53%), Beer Hall +3.6pp; July L3 MASE far below June (confounded with the
    shorter horizon, so the clean drift signal is the coverage jump; new-July items
    still fall to OTHER). **Stage 4 brain over July** (existing detectors + PERSISTED
    briefing chain, store copy, served store untouched): real fatigue 0 new items per
    week (8 standing items all continuing, suppressed), vs report 22's per-day upper
    bound; TRT no alarm spam (one within-noise blip suppressed by the closed-venue
    path, vs June's 6); 1 Jul did NOT surface as a deviation (z=0.78, within Beer Hall
    variance) - correct: forecastable fixture structure, not an anomaly. Deviation
    logged: the June ingest is not durable across `warehouse.build()` (a mid-pass
    pytest rebuilt the store from the May parquet and dropped June; re-ingested and
    Stages 1-4 re-run June-inclusive; the Pass-1 artefact predates the wipe and is
    unaffected; production `NeonAdapter` makes it durable). Served store max stays
    2026-06-29, zero July rows; `1d966be` and `stock_inventory.py` untouched.

19. **G12.17c (Step C1 of 2): freeze a second blind July window, 8 to 14 July**
    (`28_G12_17c_July_Window2_Freeze_Report.md`, `PRJ93_Spec_G12_17c_July_Extension.md`).
    Pre-registers an 8 to 14 July 2026 forecast from the SAME June-inclusive cutoff,
    standing gate winners and config as the 1 to 7 freeze (`7d103aa`), so the two
    windows are comparable, and commits it before any 8 to 14 July actual exists. The
    window is chosen for its fixtures: the England quarter-final (Norway v England, 11
    Jul 22:00, in-hours for the Beer Hall) plus two in-hours non-home-nation matches
    (France v Morocco 9 Jul, Spain v Belgium 10 Jul), to add a second England date to
    the in-context evidence and test the home-nation-vs-generic prior forward. Because
    11 to 14 July are genuinely in the future at freeze time (today 2026-07-10), the
    pre-registration is airtight by CALENDAR, stronger than the already-elapsed 1 to 7
    run. Store precondition verified June-inclusive (`line_items` max 2026-06-29, 867
    June rows) before and after. `sim/build_july_w2_forecast.py`: Beer Hall
    Chronos-exo + MinT GBP 4,293 (11 Jul GBP 1,565), Ellel robust-DOW + disaggregation
    GBP 56, TRT dormant; real hindcast weather retrieved for 8 to 14 July; all levels
    coherent, 462 rows. Fixture flags asserted: 11 Jul fires England + home-nation
    in-hours for the Beer Hall, 9/10 Jul fire generic match-in-hours only, the 12 Jul
    02:00 match fires nothing. **Pre-registered expectation:** the Beer Hall model
    lifts every in-hours match date above its weekday baseline and lifts the England QF
    most (+GBP 312 / +25% vs the generics' +12% and +22%) - the forward home-nation
    test C2 will score. Deviations: **(1)** Ellel's 11 Jul England flag fires (the spec
    assumed it would not) because Ellel's data-derived Saturday window runs to ~23:42
    and overlaps the 22:00 match; reported not hand-forced, and inert since Ellel's
    robust-DOW model reads no `wc_*` covariate. **(2)** A 9 to 15 day-ahead horizon,
    beyond the reliable 7-day regime, taken for comparability and disclosed. No 8 to 14
    July actual read; served store max stays 2026-06-29, zero July rows; only the
    exogenous weather tables were extended (covariate input, not actuals); `1d966be`,
    `7d103aa` and `stock_inventory.py` untouched. Step C2 confronts this artefact in a
    later session strictly after 2026-07-14.

20. **G12.17c-b (Corrected C1): production-faithful 7-day-cadence freeze of 8 to 14
    July (Origin B)** (`29_G12_17cb_Corrected_Freeze_Report.md`,
    `PRJ93_Spec_G12_17cb_Corrected_Freeze.md`). Corrects the horizon inconsistency Nam
    caught in report 28: Origin A forecast 8 to 14 July from a 29-June cutoff (9 to 15
    day-ahead), but the live system refreshes every 7 days, so by 8 July it would
    forecast 8 to 14 July from a 7 July cutoff (true 7-day-ahead) with the 1 July
    England fixture observed. Advanced the clock: ingested 1 to 7 July as observed
    history (`sim/ingest_july_w1_actuals.py`, same aggregate path as June; watermark
    2026-07-07; reconcile Ellel GBP 0.00, Beer Hall +GBP 29.36; all 7 days present).
    Re-froze 8 to 14 July from the 7 July cutoff (`sim/build_july_w2b_forecast.py`,
    Origin B): same standing winners/config as Origin A, differing ONLY in cutoff.
    Beer Hall Chronos-exo + MinT GBP 4,469 (11 Jul GBP 1,558), Ellel robust-DOW GBP 56,
    TRT dormant; flags re-asserted; coherent, 462 rows. Still pre-registered (11 to 14
    July are future). **Pre-registered B-vs-A finding:** Origin B does NOT sharpen the
    11 July England anticipation (lift +GBP 309 vs A's +GBP 312, delta -GBP 3 - the
    model already had June's fixtures in context), but the extra week RAISES the generic
    match anticipation (9 Jul +GBP 32, 10 Jul +GBP 57), narrowing the home-nation
    premium at the expectation level. Honest null on sharpening, real testable shift in
    the generic-vs-home-nation gap; C2 scores both origins against the held-out actuals.
    Deviation: the spec's sharpening hypothesis is reported as an honest null, not
    forced. No 8 to 14 July actual read; store max 2026-07-07 with zero rows on/after 8
    July; Origin A (`a590f91`), `7d103aa`, `1d966be` and `stock_inventory.py` untouched;
    both suites green (store rebuilt by pytest then re-ingested to restore the advanced
    state). C2 (after 2026-07-14) scores Origin A and Origin B together.
    **Scored in row 21.**

21. **G12.17c Step C2: both 8 to 14 July origins confronted**
    (`31_G12_17c_C2_Confront_Report.md`). Discharges rows 19 and 20. Actuals pulled
    2026-07-16 (Square MCP-SIM, view SalesUK, `net_sales_minus_auto_gratuity` ex-VAT,
    `sim/july2026_w2_actuals_l1_raw.json`), strictly after the 2026-07-14 window close;
    both freezes predate every target date, so the pre-registration is airtight **by
    calendar**, not merely by commit ordering. Both frozen artefacts byte-identical;
    actuals never written to the served store (`sim/confront_july_w2.py` asserts store
    ceiling 2026-07-07 and zero held-out rows before scoring, and the assert passed).
    **(a) Accuracy holds:** Beer Hall L1 per-day MASE **0.285** (Origin A) / **0.287**
    (Origin B) on the same seasonal-naive ruler as the 1 to 7 confront, beating that
    window's 0.386 and far below the 0.745 backtest class; band coverage **1.00** for
    both - every day in-band, including the 11 July point miss of +GBP 574. The band
    held exactly where the point forecast did not. **(b) Origin B does not beat Origin
    A** (0.287 vs 0.285, and worse on the window total: +GBP 747 vs +GBP 570 over). An
    honest null that independently corroborates row 15(c): error is flat below weekly,
    so a fresher origin buys responsiveness, not accuracy. Two separate lines of
    evidence now agree. **(c) The England anticipation does NOT generalise.** Both
    origins anticipated ~+GBP 310 over the DOW baseline for the 11 July QF; the realised
    lift was **-GBP 265 to -269**, wrong in SIGN. With report 27's 1 July case (+GBP 191
    anticipated, +GBP 451 realised, right direction) the two-case record is 1 for 2. The
    in-context fixture anticipation is bounded, not established. **(d) The obvious
    explanation is refuted.** The kickoff-time story (Norway v England 22:00 leaving
    ~1.5h inside the Saturday envelope, close 23:27) is falsified by 27 June: Panama v
    England, also Saturday, also 22:00, returned the LARGEST home-nation lift on record
    (+234% over its DOW median). Day-of-week and kickoff hour are held constant and the
    outcomes invert. The 11 July shortfall is **unexplained by `CHRONOS2_EXO_COLS`**;
    named untested hypotheses, in order: 11 July weather (the one exo family not yet
    compared across the two Saturdays, absent from the feature frame because the date is
    held out), estate cannibalisation (11 July also carries an Events booking of GBP
    779.94 and an Ellel event of GBP 385.12, both absent on 27 June), tournament stage.
    **(e) Supersedes row 15(b):** the realised England-minus-generic premium is
    **negative** (-GBP 316 Origin A, -GBP 299 Origin B) against a pre-registered
    expectation of +GBP 181 / +GBP 134; on this window the generic Friday fixture beat
    its baseline (+GBP 300) while the England Saturday fell below it. Row 15(b)'s
    "England +130%, generic within noise" does not survive as stated; it was n=3 and
    labelled directional, and the fourth and fifth England dates split. Row 20's
    expectation (Origin B narrows the premium at the expectation level) is CONFIRMED
    (+181 -> +134) even though reality inverted the sign for both. **(f)** Liveness gate
    held a third time: TRT dormant, no forecast issued, no false alarm. **Honest
    caveat:** Ellel's MASE of 0.096 is a MASE ARTEFACT, not accuracy - the model
    forecast GBP 56.30 against GBP 574.63 actual (90.2% under, band breached); the
    booking-driven series has a large seasonal-naive scale that flatters small absolute
    errors. Do not quote it. Deviation from row 20's framing: C2 was expected to score
    the sharpening question; it does, but the headline result is the falsification of
    the home-nation anticipation, which was not the pre-registered focus.
22. **G13: production integration - hardening and stateless compute**
    (`32_G13_Production_Integration_Report.md`; commits `087d20a`, `a4e5fa3`, `284663f`,
    `0f9b511`, `b5fb3a7`, `04b3bf1`). Prepares the engine to run as a per-org service
    inside gm-ai per Ryan's integration brief. **(a) The brief was verified, not
    accepted.** Substantially correct and its central call - the brain stops touching a
    database and becomes pure compute, the API owns persistence - is right and adopted;
    it deletes more work than it creates (the store is retired, not ported). Three claims
    are wrong: "67 print() calls" (actual **260**, 227 excluding sim/tests); "nothing
    reads intraday detail" (false - `derive_trading_hours` reads `line_items.ts` and six
    World Cup covariates depend on it, so the proposed aggregate grain would have
    silently broken the served BH model); and "weather is attribution-only, rejected by
    A14" (false, and self-contradictory with the brief's own §9.5). **(b) The third error
    traces to this project, not the reader.** `7d8bfbd` scoped the A14 verdict in the
    report, its generator and the README but never reached `FLAGS.md`, the live ledger,
    which still asserted the corrected claim. Ryan read the ledger. Had it stood, §9.5
    would have changed the served model on the strength of it. A correction that lands in
    reports but not the ledger is not a correction. **(c) Hardening** (`087d20a`): bearer
    auth on every route, compare_digest over BYTES (the str form 500s on a non-ASCII
    token because Starlette latin-1-decodes headers); posture secure-by-default via
    `BRAIN_ALLOW_INSECURE` after the first cut keyed on `BRAIN_ENV == "production"` and
    **failed open** on a typo with every test still green; `/docs` nulled when hardened
    (the app-level dependency does not cover it - FastAPI mounts those via Starlette's
    router); `POST /refresh` deleted. Honest remainder: refresh is NOT off the HTTP
    surface - `?freshness=live` still reaches a write through `_live_topup` from an
    LLM-supplied parameter; now allowlist-validated and throttled, a bound not absence
    (FLAG-LI6). Dependency ceilings only, never floors: `.venv-eval` pins numpy<2.0 via
    TSB-AD, so raising floors would strand the venv behind the pinned VUS-PR numbers.
    **(d) Stateless compute** (`0f9b511`, `b5fb3a7`): built on a per-request scratch-store
    seam rather than rewriting ~157 call sites - `connect()` now resolves at CALL time
    (it could not: `from config import DUCKDB_PATH` binds at import), overridden by a
    **ContextVar**, which is load-bearing (mutating it to a module global makes a
    background thread read a request's scratch path). `compute/engine.run(dataset)` ->
    bundle; contract strict; Neon/Square adapters and the psycopg path **deleted, not
    disabled** (`base.py` 245 -> 109 lines), so `INGEST_SOURCE=neon` fails loudly instead
    of silently serving the CSV seed - which also retires security finding L3 by removal.
    **(e) The isolation claim survived an adversarial review** that was asked to falsify
    it: 8 concurrent requests kept distinct scratch paths across a forced overlap; a
    planted leak on a provably-reused anyio worker thread did not survive; a fabricated
    org left the served store byte-identical. **(f) Two bugs found by building, not
    planning:** an org with no sales returned 503 (empty frame carries no dtypes, DuckDB
    infers `date` as INTEGER, the L1 view fails to bind - the first thing a new tenant
    hits); and the contract accepted `exogenous`/`horizon_days`/per-venue profile and
    dropped them on the floor, so a caller could name `rung4_chronos2_exo`, send its 15
    covariates and receive a univariate forecast with nothing said - the exact failure
    `extra="forbid"` legislates against, inverted. Each unconsumed field now reports
    itself. **(g) Open questions answered wrong on file, corrected:** the glossary already
    existed (report 30 said none did; the recommendation would have created a second one
    and orphaned two links); taxonomy drift is NOT wired into the standing build (`since=`
    exists and the freezes pass it, `reconcile()` does not and no caller does - the
    standing path still drops the GBP 3,484 `LuneBrew Pilsner` into OTHER); the store
    hazard had no flag and fired twice in one session, caught only by the C2 confront's
    ceiling assert (`FLAG-STORE-DURABILITY`, `sim/restore_clock.py`). **Not done and
    stated:** Phase 3 de-Lune (the per-venue profile is accepted and reported-as-ignored,
    not honoured), the 227 prints (Phase 3 rewrites the files holding 54 of them), sim/
    relocation (it is the evidence chain, not dead code), the PII purge (Ryan's, two
    remotes). Suites 307/8 and 314/1 (+45/+45 from 262/8 and 269/1); tree ruff 72 -> 71;
    **the C2 confront reproduces bit-for-bit through every change (0.285/0.287,
    generalises False)**, tagged `prj93-research-frozen` beforehand.
23. **G14: de-Lune, and the forecast that was not there**
    (`33_G14_De_Lune_Report.md`). Phase 3, the pass report 32 §6 deferred. **(a) The
    headline is not the de-Lune.** `compute/engine._forecast_venue` called
    `conformal.wrap.evaluate`, which is a **backtest**, and drained its rows: measured on
    the Phase 2 engine, 57 forecast rows returned, 57 for dates already inside the
    supplied history, **0 after it**. The API would have persisted predictions about days
    that had already happened, banded and named with a served model, indistinguishable at
    row level from a forecast. The Phase 2 diagnostic ("horizon_days supplied but NOT
    honoured; the analytics emit their own horizon") was true and misleading - the
    analytics emitted no horizon at all - which is the very failure `_report_unconsumed`
    was written to prevent. It survived because the Phase 2 tests asserted the venue set
    and the band levels, both of which pass on a backtest; nothing asserted a target_date
    was in the future. `compute/forward.py` fixes it (7 rows for horizon 7, 14 for 14, 0
    backtest), reusing the validated residual stream, Mondrian grouping and conformal
    quantile rather than inventing a second forecaster. **(b) The seam:** `org_profile.py`,
    one ContextVar bound per request beside the scratch store. UNBOUND = `config.py`
    (Lune) so `sim/`, the CLIs and the suite reproduce; BOUND = the profile **entirely**,
    including empty values - a per-field fallback would hand Lune's Mon/Tue closure to a
    seven-day tenant and would reach the **Mondrian grouping**, surfacing as a
    miscalibrated band rather than an error. **(c) A latent bug the seam exposed:**
    `conformal/wrap.py` grouped the Mondrian band on the **literal** `(0, 1)` in two
    places, so `config.STRUCTURAL_ZERO_DOW` never reached the grouping it defines - the
    feature and the band would have diverged silently on any edit. **(d) Two Lune reads
    were silent wrongness, not crashes:** `dataset_max_date` iterated Lune's three slugs,
    so inside a tenant's store every read missed, `.max()` returned `NaT`, and `NaT`
    poisoned `max()` into an arbitrary answer - `is_closed` returned False for every
    tenant venue **by accident**; and `_ellel_event_dates` read the literal slug, so a
    tenant's spillover covariate was permanently zero. **(e) The hole under
    `extra="forbid"`:** `ExogenousRow.values` is a free `dict[str, float]`, so `exo_tempc`
    validates and does nothing - the strict contract's own failure mode, one level down.
    Unknown keys now report. The overlay is shared by the training AND horizon frames
    deliberately: a covariate meaning different things at fit and serve time is
    train/serve skew, invisible until the forecast is quietly wrong. **(f)
    `expected_totals` had nothing to translate:** Lune's asserts live on the CSV
    bootstrap, not the compute path, so the field had no job; it now catches **the
    caller's** failure (a paged sales query dropping rows forecasts low, it does not
    error). **(g) The contract was wrong in three places, corrected in the document:**
    `is_event_driven` never capped the rung (that was `MAX_RUNG`, emptied by G12.9c a
    fortnight earlier - the same species of stale-document error report 32 found in
    Ryan's brief, this time in this project's own contract); VAT closed (API sends ex-VAT,
    `vat_inclusive`/`vat_rate` **removed** rather than left as fields nothing reads);
    weather fetch decided **against** the contract's own recommendation - building it
    showed "one outbound call" is a round trip per venue per request, since a per-request
    scratch store has no cache to amortise against. **(h) Evidence, and a correction to
    report 32's gate:** C2 `confront_july_w2` **re-scores a frozen artefact**, it does not
    regenerate the forecast, so "C2 reproduces bit-for-bit" never proved forecast
    generation was unchanged - report 32 over-claimed it. The right check is the training
    frame hash (contents + column order, since tree split ties depend on order): all three
    Lune venues byte-identical pre/post (`59c83586f06c8359`, `fb388ce32d02fdab`,
    `a3c110bbc72be722`). C2 still re-scores clean (0.285/0.287, coverage 1.00,
    `generalises` False). **New open decisions, both verified not assumed:** the ladder
    never re-runs (`ladder_selection` is `[]` and `ServedRow.rung` is `None` on every
    call, so a tenant's served model is whatever it started as, for ever) and compute
    emits **L1 only**. **(i) Review found seven defects, and three were the module
    breaking its own stated rule.** `compute/forward.py`'s docstring says every covariate
    must be built by the function that builds the training column of that name; the first
    cut then hand-rolled parallel calendar/event/World-Cup/weather implementations. Both
    reviewers independently found the worst one first: **`exo_is_dry` inverted between
    train and serve** (training derived it BEFORE the supplied-covariate overlay, the
    horizon frame after, so a tenant supplying rain trained on 0.0 for every row - `NaN <
    1.0` is False - and served the real flag). It is excluded from the GBM by the A14
    verdict but IS one of the 15 `CHRONOS2_EXO_COLS`, so it fed Lune's own flagship served
    entrant and nothing failed: silent, plausible, wrong - the exact failure the strict
    contract is celebrated for preventing. Also: the band is calibrated on <=7-step errors
    and applied unchanged to day 30 (coverage 78.9% at step 30 vs nominal 90%, gate +/-3pp)
    and **`sim/build_frozen_forecast` documents that caveat in its own docstring** - the
    port copied the method and dropped the caveat; the forward frame omitted 13 training
    columns so `rung3_gbm` raised KeyError; `exo_enabled` gated the horizon frame only, so
    a tenant without `sports` trained on Lune's World Cup schedule (read off disk, 35
    flagged days) and served zeros; the calibration floor was checked on the pooled count
    then Mondrian-split, so a group of 4 silently became a "90% quantile"; a bound profile
    asked about an unknown slug fell back to Lune's Mon/Tue (fail-open on the one seam
    whose contract is "bound is total"); and (security, HIGH) `sales_daily` was unbounded
    in span, so one typo'd year in a POS export (`2202` for `2022`) densified to ~65k rows
    and **~9,272 re-fits / 17min+ from a 2-row request** - a DoS written by a fat finger.
    All fixed and RE-MEASURED against the reviewers' own numbers (train==serve==1.0 for dry;
    rung3_gbm 7 forecasts; wc 0/0; 14 predictor calls / 0.4s). Fixes 1/3/4 came from
    DELETING the parallel implementations - `calendar_features` extracted from
    `build_features`, `_attach_exog` now called by both frames - so the forward frame is
    smaller and does more. **A bug in my own fix, caught by measuring rather than
    testing:** the first `exo_is_dry` fix made train and serve agree - on 0.0 for 0.0mm
    rain, which is wrong; the pre-overlay assignment produced 0.0 not NaN, so "preserve a
    caller-supplied value" preserved a derived one. A test asserting only train==serve
    passes both times, which is why `test_dry_weather_actually_reads_as_dry` sits next to
    it. **Review cleared** the load-bearing claims empirically: no ContextVar bleed (six
    threads, alternating profiles, each saw only its own) - with the caveat that the
    invariant holds BY ABSENCE (no ThreadPoolExecutor/joblib anywhere in the analytics; a
    bare `threading.Thread` starts with an empty context and would fall back to Lune's real
    store); no reachable path from a tenant to Lune DATA (the fallbacks hand over
    constants, and the scratch store holds no Lune tables); no SQL injection in
    `exog_supplied` (column names are row data behind an allowlist, venue parameterised).
    **(j) A second pass: two of those fixes were the WRONG fix.** The security review
    framed the typo'd year as a DoS; bounding the calibration walk fixed the cost and made
    the bug MORE dangerous. `trim_to_active` trims only ZERO endpoints, so a nonzero row
    dated 2202 survives, becomes the series max and **takes the forecast origin with it** -
    measured after the DoS fix: seven banded, model-named rows for January 2202 and a
    watermark to match, in 0.4s, no error. Before the fix it hung for 17 minutes, which at
    least looks like a problem. `ComputeDataset` now rejects a span beyond
    `MAX_HISTORY_DAYS` (~20y) and NAMES BOTH DATES, because the caller has to find one bad
    row in a million. And the band caveat was a diagnostic where a refusal belonged: the
    contract still advertised `le=30`, so an API could ask for a month and get an interval
    whose stated confidence was wrong by 9pp with the correction buried in a list.
    Re-measured, pooled 90% band coverage by step: 100/96/85/88/**81**% at steps
    1/7/14/21/30; per-step calibration gives ~96% at every step (half-width 181 -> 224).
    The DIRECTION decides it: at <=7 it OVER-covers (split conformal's safe failure mode,
    which wrap.py documents), past 7 it silently UNDER-covers. Per-step conformal is NOT
    adopted - it changes the banding METHOD and this project adopts a method only when it
    beats a gate on held-out folds; inventing one inside an integration phase is exactly
    what the ladder exists to prevent. So `horizon_days` is capped at `MAX_HORIZON_DAYS=7`
    (every result in the project - reports 26/28/31, MASE 0.285 - is a 7-day horizon, so
    nothing evidenced is lost) and per-step conformal is logged as **FLAG-BAND-HORIZON**
    with the measurement, the sample-size arithmetic, and the open question of how per-step
    interacts with Mondrian (both partition the same residuals; at H=7 they are confounded,
    since disjoint 7-day blocks put every step on a fixed weekday). Also closed: `timezone`
    and `currency` removed (fields nothing reads - the same trap `vat_inclusive` was
    removed for in the first pass, left in by inconsistency); `ServedRow.rung` populated
    from the ladder's PREDICTORS registry rather than parsed off the name prefix (it was
    always None, so the API had a column it could never fill); exception text on the 200
    path redacted to the type when HARDENED (the 503 path already did, so diagnostics was
    the same leak through the door that succeeded); and every caller-controlled list
    bounded. **The fix's own hazard, found by asking what the fix made possible rather
    than by review:** capping `values` at 64 keys made a multi-GB diagnostic REACHABLE -
    the unknown-covariate report echoed every name into one string, so 500k rows x 64
    distinct keys renders tens of millions of them. Now 10 names + a marker, 642 chars,
    bounded. Suites 370/8 and 377/1 (+63/+63 from 307/8 and 314/1); tree ruff 71 -> 70; 263 prints
    unchanged. **(k) A third pass, because the round-2 guard was wrong and both reviewers
    caught it independently.** The span check (`> MAX_HISTORY_DAYS`) whose docstring said
    "this is not a size check wearing a date's clothing" was exactly that: measured, it
    ACCEPTED `2026 -> 2027` and `2026 -> 2036` (one-keystroke slips, likelier than 2202)
    and accepted a wholly mis-stamped export (every row at 2202, span a normal 199 days -
    invisible to a span check BY CONSTRUCTION), while rejecting only the one typo it had
    been measured against. Span is a relative measure of an absolute failure. The right
    invariant was in the contract all along - `sales_daily` is CLOSED HISTORY - so
    `MAX_FUTURE_DAYS` (7d slack) now rejects any row dated after today and
    `MAX_HISTORY_DAYS` is demoted to the cost knob it always was. It compounds: the API
    persists the poisoned watermark and hands it back as `prior_state` next call. Also
    round-3: `PriorState` was bounded by nothing (served_model = one INSERT per key, 20k
    keys = 4.6s; briefing_chain/change_point_state took 200k entries and are echoed
    verbatim into the bundle) and `country` was unbounded while echoed once PER VENUE;
    `MAX_SALES_ROWS=2M` was a cap ABOVE the failure point (pydantic validates every item
    then checks max_length, so 2.2M rows are fully materialised first - ~278MB RSS at
    200k) so it is now 200k, with the comment saying what a row cap can and cannot do (the
    real guard is an ingress body limit, the API's); `MAX_HORIZON_DAYS` was aliased as both
    the serving cap AND the residual block size, so raising it later would silently change
    the banding METHOD - split into `_CALIB_BLOCK_DAYS` with an assert; `event_venue_dates`
    is venue-INDEPENDENT but was recomputed per venue (~10,000 identical aggregations at
    the venue cap), now computed once per request. And the report's own SS9/SS10 still
    described the pre-fix behaviour that SS7 said was fixed - the exact stale-document
    error this project has now found three times (Ryan's brief, our own CONTRACT.md, our
    own report). FLAG-STORE-DURABILITY fired a THIRD time and nearly corrupted the
    frame-hash check built to catch this class of error; its trigger is now narrowed by
    measurement (targeted runs are free, only suites collecting `test_a10_service` /
    `test_a1_warehouse` rebuild).

24. **G15a: the 11 July shortfall diagnosed, and both testable hypotheses came back
    negative** (`36_G15a_Fixture_Shortfall_Diagnostics.md`). Report 31 falsified the
    home-nation fixture anticipation and named three untested hypotheses; chapter 4 of
    the dissertation is that falsification and could not be written honestly while the
    top-ranked ones sat untested. **Everything in this row is POST HOC AND EXPLORATORY**
    - the 11 July actual was seen before these hypotheses were specified, so they may
    explain and may not confirm, and none may be written up beside the pre-registered
    results without that label. The pre-registered numbers are untouched (0.285/0.287,
    coverage 1.00, `generalises: False`). **(a) Weather: REFUTED**, and refuted the same
    way kickoff time was, by the 27 June control. On what actually occurred, 11 July was
    **2.1 C warmer, 0.90 hrs sunnier and equally dry** than the Saturday that produced
    the largest home-nation lift on record; `exo_is_dry` was 1 on both, so that covariate
    carried no contrast at all. For weather to explain the swing it would have to act
    against its own sign on all three continuous covariates at once. Separately and
    smaller: the model's CONDITIONING weather for 11 July was **2.0 C warm and 1.05 hrs
    dull** against what occurred, a forecast-of-a-covariate error and a distinct failure
    mode, named rather than folded in - but the same 2 C gap sits on 27 June, the day the
    model got right. A revision control the spec did not ask for (the hindcast as the API
    answers it today) reproduces what was persisted, so the gap is genuinely
    forecast-versus-reanalysis and not a later data correction; limitation 9 confirmed
    with a measured size. **(b) The finding that was in no report: `is_ellel_event` is a
    train/serve asymmetry.** It is one of the 15 served `CHRONOS2_EXO_COLS`, populated
    from observed trading on the Beer Hall frame and **pinned to 0 on every forecast
    horizon** - so the served model is fit on a covariate informative on 66 of 399
    training days and constant on every day it forecasts. Same species as report 33's
    `exo_is_dry` defect, documented rather than hidden, which is better but not harmless.
    Ellel traded on 11 July (GBP 385.12) and both freezes were conditioned on 0.
    **(c) Direction is SUBSTITUTION, not spillover**, refuting Lune's own hypothesis as
    written into `features/build_features.py` ("an Ellel function night lifts the Beer
    Hall next door"). Fourth refuted belief. Two independent measurements agree on sign
    and order of magnitude: DOW-matched historical effect **GBP -23.40** (n = 66 active /
    333 quiet), served-model single-date perturbation **GBP -25 to -39 on every horizon
    day**. **(d) The estimator trap, which is dissertation material on its own:** the
    POOLED comparison reads **+GBP 500.18** against the matched **-GBP 23.40** - a GBP
    523 swing and a SIGN INVERSION from the estimator alone, because Ellel books weekends
    (45 of 66 active days Fri/Sat/Sun) and Beer Hall revenue is strongly day-of-week
    driven. The naive estimate confirms the hypothesis the matched one refutes.
    **(e) The counterfactual bounds the hypothesis rather than supporting it.** Origin B's
    configuration with the flag set on 11 July only: **1558.28 to 1530.78**, closing **GBP
    27.50 of a GBP 573.66 over-forecast, 4.8%**. Mechanism real, correctly signed,
    consumed by the served model, and an order of magnitude too small. Told the truth
    about Ellel, the model still over-forecasts by GBP 546. The useful part is the
    ceiling: it bounds how much of the miss the hypothesis could EVER have carried.
    **A deviation that changed the answer:** the spec asked for sensitivity with the flag
    forced across the horizon; Chronos-2 conditions on the whole future covariate path,
    so a constant column is a different regime, and that arm reports **+47.37** on 11 July
    where the single-date spike reports **-27.50**. Opposite signs. Running only the
    specified arm would have put a wrong-signed number in the dissertation; both are
    reported. **(f) The control arm reproduced the committed Origin B forecast to 0.00** -
    the first evidence in this project that forecast GENERATION is bit-reproducible from
    the store, which report 33 was explicit the C2 re-score never proved. **(g) Events arm
    UNTESTABLE, stated as a non-test:** confirmed independently from the seed export,
    **203 line items across 2 distinct dates** (both the last two days of the window)
    against 47,644 for the Beer Hall. n=2 does not support a comparison and the project
    does not report what n cannot carry. **(h) `EXCLUDED_VENUES` was dead and had already
    misled a committed artefact.** Exactly one occurrence in the tree, its own definition;
    the real exclusion is the `FORECAST_VENUES` allowlist. Third instance of the pattern
    after `vat_inclusive`, `timezone` and `currency`, and the first caught propagating a
    FALSE CLAIM into an artefact - `sim/july2026_w2_actuals_l1_raw.json` credits the
    exclusion to it. Deleted, not wired: a denylist fails open, the allowlist already
    there fails closed. The false claim in the actuals artefact was **deliberately left in
    place** - it is pre-registration evidence and editing its prose to make the project
    look more correct is a worse failure than the stale claim; the correction lives in the
    report, FLAGS.md and here. **(i) `DISSERTATION_NOTES.md` limitation 4 was overstated
    and is corrected.** "No cross-venue substitution term, venues are modelled
    independently" is wrong: the term exists, is served, and is consumed. Rewritten to
    what is true (presence not magnitude, pinned to 0 on the horizon, nothing at all for
    Events), with limitations 10 and 11 added and section 3.1 rewritten with the post-hoc
    status table. An overstated limitation is as much a defect as an overstated finding,
    and this one fails badly at viva: a reader greps `CHRONOS2_EXO_COLS` and finds the
    term in thirty seconds. **(j) The hash gate was never runnable.** Hard invariant 3
    pins three sha256 prefixes; `git log -S` finds them in reports 33, 34, 35 and this log
    and **in no script in any commit**. The check the project leans on for "did this move
    a Lune number" could not be run by anyone, including its author - the same
    stale-document failure mode, applied to the check built to catch it. The `ellel`
    dimensions do not reproduce either (reports 386 x 40, canonical store **392 x 40**,
    six July W1 rows), consistent with FLAG-STORE-DURABILITY firing unnoticed during
    report 33. Closed by committing `sim/frame_hash.py` with a baseline re-measured at tip
    `44a0f08`. Report 33's before/after claim is unaffected; its published VALUES are
    session-local. New flags: FLAG-CROSS-VENUE-BLIND (open, structural),
    FLAG-DEAD-CONSTANT (instance closed, pattern open), FLAG-HASH-GATE-UNRUNNABLE
    (closed). FLAG-FIXTURE-ANTICIPATION updated with the tested/refuted/untestable table
    and its own superseded cross-venue claim corrected in place.

25. **G15b: round 4 was run, and it was not clean either**
    (`37_G15b_Round4_Review.md`). Report 34 recorded the round-3 fixes as unreviewed and
    called it a real residual risk rather than a formality. It was right. **The record is
    now four rounds and four rounds with hits**, so the yield curve has still not turned
    over and this project cannot yet claim its fixes converge. **(a) The severe one, and
    the same shape as the previous three: the isolation guard did not fire on any real
    org.** Every word of the round-3 reasoning is about ONE venue's history ("it becomes
    active_trading_start and buries the real history"), and the harm really is per-venue -
    `read_series`, the calendar fill and `trim_to_active` all run per venue. But the check
    ran on `sorted({r.date for r in self.sales_daily})`, the dates of the WHOLE REQUEST
    pooled across venues, and `_segments` never reads `row.venue`. Measured with the
    identical typo row: single venue **REJECT**, plus a sibling spanning the hole
    **ACCEPT**, plus a sibling of **one row every 60 days (64 rows) ACCEPT**. On the
    helper directly: 2 segments sizes [1, 200] on the venue's own dates, **1 segment** on
    the pooled ones. So the guard built to stop a poisoned forecast was inert on every
    multi-venue org, which is every real one - Lune has three, the contract allows 25.
    Report 34 closed it as measured and tested; both were true, against the single
    configuration it was ever measured in. Fixed to segment per venue. **The fix's own
    blast radius, found by the same method and stated rather than discovered later:**
    pooling was also giving intermittent venues accidental cover, so a pop-up or a
    just-reopened venue inside a multi-venue estate now hits `MIN_SEGMENT_DAYS` where it
    was previously masked - two regressions, both instances of (c). Nothing else moved
    (clean single, clean multi, seasonal two-block, cold-start, three-venue staggered all
    still ACCEPT); cost at the full contract cap of 547,500 rows is **0.31 s and 5 MB**.
    **(b) The band-calibration guard was asymmetric, exactly as the spec predicted.** It
    read `MAX_HORIZON_DAYS > _CALIB_BLOCK_DAYS`, which fires on the path that was TESTED
    (raising the contract cap to 30) and not on the symmetric one: raising
    `_CALIB_BLOCK_DAYS` instead gives `7 > 30`, no raise, and
    `rolling_point_forecasts(horizon=30)` rebuilds the residual stream from 30-day blocks
    so every residual becomes a <=30-step error - **the banding method changes under an
    unchanged horizon**, which is the exact side effect splitting the two symbols was
    created to prevent, reached from the other symbol. It drifts toward OVER-coverage,
    split conformal's safe direction, so no test fails and nothing looks wrong. Now `!=`:
    the two are only defensible when they agree, and equality has no asymmetric case to
    miss. **(c) A defect found, measured, and deliberately LEFT OPEN.** The guard refuses
    shapes that are neither a season nor a speck: a venue reopening after 8 months is
    ACCEPTED at 21 days of trade and **REJECTED at 13**, rejected on **day 1 back**, and a
    pop-up trading four days a quarter is rejected outright - and because the validator
    raises on `ComputeDataset`, one reopening venue takes down the forecast for every
    sibling in the request. The cold-start carve-out cannot help (`len(segments) == 1`,
    and a reopening has two). Not fixed because every discriminator tried reopens a worse
    hole: the obvious trailing-segment exemption was measured and rejected, since a
    dormant venue PLUS one mistyped recent row is also a one-day trailing segment, so
    exempting it restores forecast-origin poisoning and **relights a dead venue** - the
    "GBP 5,329 for a dead venue" failure running through the front door. A day-1 reopening
    is genuinely indistinguishable from a typo inside a single request. Given three
    consecutive rounds of fixes each worse than the defect, shipping a fourth on reasoning
    alone is the failure mode, not the remedy. FLAG-SEGMENT-FALSE-REJECT, pinned by a test
    that states what a replacement must prove. **(d) The error message called legitimate
    data a typo** ("a mistyped year, not a trading period", shown to a venue that
    genuinely reopened): false and unactionable. It now names the venue it is judging -
    with 25 venues in a request, "somewhere in sales_daily" is not actionable either -
    hedges the typo claim, and states the reopening limitation as a limitation.
    **(e) `PriorState` bounds the LIST and not the CONTENT, and this one is NOT
    implemented.** Round 3's caps landed on the containers while the elements are `dict`
    with no bound: measured, `briefing_chain` at 1,000 entries x one 100 KB string is
    **accepted at 100.0 MB**, and both it and `change_point_state` are ECHOED VERBATIM
    into `ComputeBundle`, whose fields carry no `max_length` at all. Same shape as round
    3's own sharpest finding (capping `values` at 64 keys made a multi-GB diagnostic
    reachable) - bounding a list while leaving its elements free is that lesson
    half-applied. Recorded and stopped, per the G15b stop condition: `PriorState` is state
    the API round-trips from its own store, so a size rule could reject the API's own
    persisted state, and a moving contract is worse than a known defect while Ryan has not
    built yet. FLAG-PRIORSTATE-CONTENT-UNBOUNDED, for the contract sync.
    **(f) Findings that did not survive contact, recorded because a review that only
    reports hits is not a review:** the `country` per-venue amplification IS bounded by
    the venue cap (2 x 25 = 50 chars, both bounds enforced under test); `MAX_FUTURE_DAYS`
    survives a non-UK caller (7 days against a real maximum offset of about one, and the
    brain works at date grain so removing `timezone` does not interact); and
    `event_venue_dates` really is hoisted to once per request. One observation, not a
    defect: the validator calls `date.today()`, so a fixed dataset changes verdict over
    wall-clock time and there is no frozen-clock seam (FLAG-VALIDATOR-WALL-CLOCK).
    **(g) Forward pointer, correcting row 22(k) above rather than editing it:** that row
    says `MAX_SALES_ROWS` "is now 200k". It is **547,500**, re-derived at report 34's C19
    as `MAX_VENUES x 730 days x 30 rows/venue-day`; the derivation superseded the 200k
    figure and the row was never updated. Measured so the cap carries a number: `SalesRow`
    costs 1,105 B constructed, so the cap admits ~0.60 GB of models, and `contract.py`
    already names the ingress body limit as the API's obligation. Suites **385/8** and
    **392/1** (+6/+6, all six the new round-4 tests, each verified to FAIL against the
    stashed pre-fix code). Frame hashes unchanged; C2 re-scores 0.285 / 0.287, coverage
    1.00, `generalises: False`. FLAG-STORE-DURABILITY fired twice more, both times from
    the full suites, both restored and re-verified before any gate was read.

26. **G15c: taxonomy drift measured on the standing path, and the decision is NO**
    (`38_G15c_Taxonomy_Drift_Decision.md`). The previous state log carried "confirm
    `since=` is wired into the standing build" as an open question. It is not wired:
    `hierarchy.reconcile()` calls `build_hierarchy(venue, top_k)` and no caller anywhere
    passes `since=`, so the served L2/L3 node set is still ranked over the whole history.
    That much is confirmed. **The fix was then gated like a rung promotion, with a blind
    before/after, and refused. (a) It degrades the metric.** Beer Hall L3 revenue MASE,
    node selection and base forecaster both blind to anything after the 2026-05-31 cutoff
    with June held out and one ruler across both arms: **0.852 standing to 1.08-1.16
    refreshed**, at every lookback tested (56/90/120/180 days). It crosses from beating
    seasonal-naive to losing to it. **(b) The two venues move in opposite directions.**
    Beer Hall capture 19.3% to 29.0%; **Ellel 31.3% DOWN to 15.3%**. **(c) And the finding
    that actually decided it: the prescription does not fix the symptom it was prescribed
    for.** `LuneBrew Pilsner` - report 25's named smoking gun, GBP 3,484 in June dropped
    into OTHER - is **never selected at any lookback, by units or by revenue**: rank 21
    on whole history, **5 at a 56-day window, and still outside a top-3**. The item is in
    OTHER because only THREE items per category are ever named. **The binding constraint
    is `top_k`, not the ranking window**, so the open question had a false premise. Wiring
    `since=` and re-checking an aggregate would have raised capture ten points, read as
    progress, and left the named item exactly where it was - the same trap the flag
    already warned about ("node COUNTS move, so a count check reads as progress"), one
    level deeper, and findable only by testing the fix against the specific case.
    **`top_k` was not raised either**: it is the correctly identified next experiment, not
    a fix to smuggle in, and (a) predicts widening the node set would push MASE further
    up. **(d) The metric finding underneath it, which is dissertation material.**
    Refreshing swaps long-history stable lines (`Cider - BH`, `Centennial Summer Pale`)
    for recent ones (`Paulaner Helles Lager`, `Breeze Pale Ale`); a recent item has a
    short noisy pre-cutoff history, so its DOW-median base forecast is worse AND its
    seasonal-naive denominator is smaller, and **MASE is punished twice**. So **the node
    set that scores best is the node set that matters least, and MASE cannot see the
    difference.** Sibling to FLAG-MASE-INTERMITTENT: there the ruler flattered a 90%
    under-forecast, here it rewards forecasting the commercially irrelevant items well.
    Both say the gate the ladder rests on is blind to relevance, and they belong in one
    methodological subsection. This is also why the verdict is "do not wire" rather than
    "refreshing is wrong": refreshing improves what a GM cares about (capture) and
    degrades what the project gates on (MASE), and with no relevance-aware metric to
    adjudicate, adopting it would be a change the project cannot defend on its own stated
    criteria. **(e) The new-item problem kept separate throughout**, because conflating it
    inflates the drift: held-out revenue from items never sold before the cutoff is
    **12.6% (beer_hall) and 42.7% (ellel)**. Nearly half of Ellel's held-out revenue
    cannot be reached by any ranking window and is irreducible OTHER by design, so report
    25's 15% Ellel capture must be read against it. `LuneBrew Pilsner` is NOT a new item
    (first sale 2025-06-21, GBP 1,337 pre-cutoff) - it is genuine drift that `since=`
    cannot reach. **(f) Report 25's capture figures updated, not corrected:** 26% / 15%
    becomes **19.3% / 31.3%**, on a different basis - report 25 measured the FROZEN
    node set (revenue-ranked via `_revenue_hierarchy`), this measures the STANDING
    `reconcile()` set (**units**-ranked via `build_hierarchy`). Two different hierarchies
    whose numbers had never been put side by side. The units-vs-revenue difference was
    checked directly and is negligible (ranks agree within one or two places at every
    lookback), reported as checked and small rather than promoted into a finding it
    cannot carry. **(g) Lookback swept rather than assumed:** 120 days would have been the
    choice, matching `SHARE_WINDOW_DAYS` in the freeze scripts so one knob governs L2/L3
    recency instead of two that can disagree; 56 days tracks the menu hardest and is
    least stable (20 of 24 nodes change), 180 is steadiest and captures least. The sweep
    also shows the knob does not matter, since every setting lands at MASE 1.08-1.16 and
    none selects the named item. Served L1 unaffected and asserted: `reconcile._persist`
    skips the VENUE node and writes L2/L3 only, and nothing was wired in any case. Stop
    condition "do not wire on an ambiguous result" reached and honoured; the result was in
    fact worse than ambiguous. FLAG-TAXONOMY-DRIFT restated as a standing limitation and
    `DISSERTATION_NOTES.md` 4.3 rewritten to match. Artefact
    `sim/g15c_taxonomy_drift.json`; read-only, no forecast or band row written.

27. **G15d: the last hardcoded Lune date on the tenant path, closed additively**
    (`39_G15d_Price_Regime_Seam.md`). `config.PRICE_REGIME_BREAK = "2025-07-01"` is a
    Lune fact (the Q2-2025 `Lager - BH` step change) and it was REACHED on the tenant
    path: `features.build_features.calendar_features` stamped a `price_regime` column
    that flipped at that date into **every** org's feature frame. Phase 3's de-Lune table
    missed it and report 35 surfaced it to Ryan as an open item. Same species as the two
    Lune reads report 33 caught - not a crash, a **plausible wrong number**: a spurious
    regime flip is a free split point for `rung3_gbm` and a covariate for the Chronos exo
    entrant, and nothing would have said so. Closed with `OrgProfile.price_change_dates`,
    a per-org optional list, and a `org_profile.price_change_dates()` accessor following
    the seam's existing rule. The feature generalises from a binary flip to a **count of
    price changes preceding each row**, which is the smallest generalisation that can
    carry a list (two changes have three regimes; collapsing them to 0/1 would discard
    the second) and which **degenerates exactly to the old column at n=1**. Both
    constraints met and verified rather than assumed: **additive and optional**
    (`default_factory=list`, so an absent value is not a behaviour change and the API
    need do nothing), and **unbound still resolves to Lune's single date** - the three
    training-frame hashes are byte-identical AFTER the change (`8c8a8be9d8dc5791`,
    `b6339032a219213c`, `ea28bcacbf1825e4`). A bound profile with an EMPTY list produces
    a flat column, verified end to end through `calendar_features` rather than only at
    the accessor, because "empty means none, not unset" is the rule the whole seam rests
    on and getting it wrong here would hand a tenant Lune's repricing date exactly as the
    pre-G15d code did. List bounded at `MAX_PRICE_CHANGE_DATES = 100` (every
    caller-controlled list is a resource dimension, the round-3 lesson applied without
    being asked). `CONTRACT.md` updated and the field flagged as the one addition since
    the integration brief, additive and needing no action from the API. `EXCLUDED_VENUES`
    was resolved in G15a.3 (row 24), not here. One thing found while doing it: removing
    the flip left `PRICE_REGIME_BREAK` imported and used by nothing, a dead import created
    by the change that closed a dead constant; removed in the same commit. Suites
    **391/8** and **398/1** (+6/+6). C2 re-scores 0.285 / 0.287, coverage 1.00,
    `generalises: False`. **Ruff was not run**: it is not installed in either venv on this
    machine, so the ruff counts in this report's lineage are unverified here and should
    not be quoted forward without re-running them somewhere it exists.

28. **G16a: the de-Lune's safety claim is now portable, and it holds**
    (`40_G16_Portable_Baseline_and_Corrections.md`). Report 36 6(a) established that the
    three frame hashes reports 33 to 35 published exist in no script in any commit, and
    treated the pre-de-Lune comparison as permanently lost. It was not lost: the tree is
    still in git and the store is restorable. Measured via a detached worktree at
    `2cc97e7` (report 32, Phase 3 not started, no `org_profile.py`, 205 changed lines ago
    in `features/build_features.py`) against `c008651`, both reading ONE copied store at
    ceiling 2026-07-07 through ONE interpreter, by a shim
    (`sim/g16a_portable_baseline.py`) first validated to reproduce the current gate.
    **All three frames identical across the de-Lune**: `beer_hall` 399 x 40
    `8c8a8be9d8dc5791`, `two_river_taps` 331 x 40 `b6339032a219213c`, `ellel` 392 x 40
    `ea28bcacbf1825e4`. Outcome 1 of the three the spec named; the STOP outcome (a hash
    moving on identical dimensions) did not occur. This is a **stronger** statement than
    report 33 could make: not "a comparison run once in one session by an uncommitted
    script", but one anybody can re-run. Report 36's diagnosis of the `ellel` discrepancy
    is also confirmed **by arithmetic rather than assertion**: Ellel spans 2025-06-08 to
    2026-07-04 = **392** calendar days under `fill_calendar`, truncating at 2026-06-28
    gives **386**, and the six-day difference is exactly the two July W1 trading rows
    (2026-07-02, 2026-07-04) that FLAG-STORE-DURABILITY dropped from report 33's session.
    Reports 33, 34 and 35 annotated at each hash table, dated and pointing forward, with
    their original values left in place; report 35 carries the fullest annotation because
    it went to Ryan and offered those hashes as the reason to trust the de-Lune. The
    working clone's store and tree were never touched (worktree removed; `git status`
    clean on all frozen artefacts).

29. **G16b: four precision corrections, and one of them was itself wrong**
    (`40_G16_Portable_Baseline_and_Corrections.md`). **(a) "Bit-reproducible" was an
    over-claim, corrected to "to the penny".** Row 24(f), report 36 2.3, `log/README.md`
    row 36 and `FLAGS.md` all called the G15a control arm's 0.00 gap evidence that
    forecast generation is bit-reproducible. What was measured is agreement to the penny
    on ONE venue-day (`beer_hall`, 11 July). The stronger claim needs full-precision
    output over seven horizon days and three venues, which is a measurement nobody has
    run, not an edit. Same species as the over-claim report 33 corrected report 32 for,
    repeated one report later in the report that congratulates itself for catching stale
    claims. This row corrects **row 24(f)**; row 24 is not edited. **(b) The "six tests
    verified to FAIL" claim in row 25 is literally true and evidentially conflated, and
    the spec's stated proof of the opposite is falsified.** The spec asserted that
    `test_a_venue_reopening_after_a_long_closure_is_refused_a_known_limitation` "passes
    before and after and could never have failed pre-fix", since D3 was deliberately left
    open. **Measured instead of assumed**: reverting `compute/contract.py` AND
    `compute/forward.py` to `af11c81`, all **six** fail. But they fail in two different
    ways, which is the real distinction: **four fail on BEHAVIOUR** (the three D1 tests
    DID NOT RAISE at all; D2's `test_the_band_calibration_guard_is_symmetric` does not
    raise on the `MAX_HORIZON_DAYS - 1` probe, verified directly since the loop aborts on
    the wording mismatch first), and **two fail only on the ERROR STRING** (both reopening
    tests raise identically before and after; only the wording changed from "a mistyped
    year, not a trading period" to "genuinely reopened" / "known limitation"). So report
    37's scoping to "the three D1 tests and the D2 test" is **exactly right**, and row
    25's "all six" inflates the claim, though not by the mechanism the spec predicted. The
    general point stands and is sharper for being measured: **a test that fails pre-fix on
    a message string is not evidence that a defect was fixed**, and a test pinning a known
    limitation is evidence of a third kind again. This row corrects **row 25**; row 25 is
    not edited. **(c) `DISSERTATION_NOTES.md` numbers-to-quote table corrected and
    audited in full.** Line 356 still read "named nodes captured 26% / 15%" with no
    qualifier while section 4.3 already carried report 38's 19.3% / 31.3% on a different
    basis: two rows of the same document disagreeing, in the table the dissertation will
    be written from. Both now appear as separate rows with their hierarchies named, with
    an explicit warning that 26% -> 19.3% is **not** movement. The rest of the table was
    checked against reports 36 to 39: no other row moved, and three rows were ADDED that
    G15 established (the DOW-matched substitution effect, the 4.8% ceiling on the 11 July
    explanation, the irreducible new-item share). The **pooled** +GBP 500.18 spillover was
    added to the "do not quote" line, since it is the day-of-week effect wearing a
    spillover label and carries the opposite sign to the matched estimate. **(d) Ruff
    resolved by measurement, not by a marker, and report 39's deviation (b) was an
    under-investigation.** Report 39 recorded the counts as unverified because ruff is in
    neither venv. True but insufficient: `uvx` is on this machine and report 33 section 9
    states outright that `uvx ruff` was how the original counts were taken. Re-measured at
    tip `c008651`: **70 errors under ruff 0.15.22**, matching report 34's quoted 70
    exactly. Reports 33 and 34 annotated with the count and the version. The 71 start
    point is not re-measurable (pre-Phase-3 tree, unknown ruff), so the endpoint may be
    quoted with its version and the delta may not.

30. **S1 G17a: one L1 scale ruler, and the July headline restated.** Four private
    seasonal-naive denominators existed, not the three the spec named: `_seasonal_scale` in
    `sim/confront_july.py`, `sim/confront_july_w2.py` and `sim/cadence_sweep.py`, plus
    `_seasonal_naive_scale` in `sim/confront_june.py`, which the original G1 grep could not
    match. The July pair read the `l1_daily` view, which omits closed days, so a lag-7
    difference reaches back 1.34 calendar weeks at Beer Hall and lands on the wrong weekday;
    the June and cadence pair read `read_series(fill_calendar=True)`, where closed days are
    structural zeros and 21 percent of Beer Hall's and 74 percent of Ellel's lag-7 differences
    are exactly zero and deflate the denominator. Neither is a correct seasonal naive, and at
    Ellel the choice is worth a factor of **4.5** on the same forecast.
    **The correction:** `eval.harness.seasonal_naive_scale` is now the only L1 implementation,
    with a required `basis` argument over four documented values (`calendar_lag7`,
    `trading_lag7`, `trading_same_weekday`, `calendar_lag7_active`), no default, and a raise on
    anything else; RMSSE joins MASE; and all three confrontations emit MASE on every basis plus
    RMSSE, MAE, RMSE, Winkler, mean width and empirical coverage, written to new
    `*_confront_rescored.json` files so the pre-registered records stay byte-identical.
    **The basis the dissertation reports is `calendar_lag7`** - not because it is the best of
    the four (it is deflated by structural zeros) but because it is the only one on which both
    the ladder backtest and all three confrontations already exist, and S1 is forbidden from
    re-running the ladder; reporting a better ruler on half the chain would recreate the defect
    elsewhere. `calendar_lag7_active`, the only basis that is both weekday-aligned and
    undeflated, is the intended successor and is assigned to S4.
    **The substantive consequence:** the published July W1 figure of **0.386 was a
    `trading_lag7` number**, reproduced here at 0.385. On the backtest's own basis the same
    forecast scores **0.772** against a backtest MASE of 0.745. The forecast **matched** its
    backtest; it did not beat it by nearly half, and 0.386 must not be quoted as evidence of
    live outperformance.
    **The claim is scoped, deliberately.** This establishes one scale implementation **for L1
    venue-level accuracy**, with **L2 explicitly out of scope and flagged**:
    `sim/cadence_sweep.py:86` still computes a per-category denominator inline on an
    undocumented basis, so any L2 figure from that script inherits an unverified ruler
    (FLAG-L2-DENOMINATOR, assigned to S4, where category-level zeros get their proper
    treatment). It was left rather than fixed because a category denominator carries
    category-level intermittency on top of the venue's structural zeros, making its correct
    basis an open question rather than a substitution, and because changing it would move
    report 24's published cadence finding inside a measurement package. This row states the
    scoped claim; an unscoped one would repeat the overclaim that row 29 corrected row 25 for.
    **Two findings beyond the spec.** (a) A basis alone does not pin a scale: the denominator
    is also a function of the store ceiling, so June's committed figures do not reproduce from
    today's store (Beer Hall 1.643 -> 1.515 as its scale grew 291.2 -> 315.7). Two River Taps,
    closed since 2026-05-08 and therefore unchanged, reproduces exactly and is the control that
    isolates the cause to store growth rather than code. `venue_ruler` now takes an `as_of`
    argument, unused by default; pinning is S3's. (b) The 302/68 versus 301/66 trading-day gap
    is three explainable days - one fully comped Beer Hall day that was genuinely open, one
    Ellel sale reversed on the spot, and one Ellel batch of 20 voided lines. Recommended
    definition for S4's occurrence gate is **non-zero net revenue**, since `E[revenue | trade]`
    is undefined on a zero-revenue day whatever the cause; at Ellel the 2 disputed days are
    3.0 percent of a series that is only 16.8 percent dense, so S4 must decide it explicitly.
    **A sample-size caveat attaches to the S4 recommendation.** `calendar_lag7_active` keeps a
    lag pair only when both endpoints are trading days, which is 70.4 percent of pairs at Beer
    Hall but **7.3 percent at Ellel, 28 differences**. The basis that is cleanest in principle
    is the noisiest in practice at exactly the venue whose intermittency motivates it, so S4
    needs a variance argument before adopting it and the answer may be a different basis per
    venue. The count is published as `active_lag7_pairs` and is deliberately not derivable from
    the zero-difference diagnostic: a difference is zero when both endpoints are closed OR when
    two trading days are equal, while the active basis drops a pair when EITHER is closed, so
    subtracting suggests 101 pairs at Ellel where the truth is 28.
    Gates G1 to G6 all pass; suites rise 391 to 415 and 398 to 422 with skips unchanged.
    Evidence: `brain/log/42_G17a_Metric_Integrity.md`, `sim/ruler_comparison.md`,
    FLAG-MASE-RULER and FLAG-L2-DENOMINATOR in `brain/FLAGS.md`,
    `tests/test_a2_metric_ruler.py`.

31. **S2 G17b: fold count lifted from 6 to 273/260/205, dispersion attached, and the served
    winners tested for the first time.** Every served-model decision rested on six rolling
    origins over 42 days, and at six folds with a 7-day horizon the Harvey-Leybourne-Newbold
    small-sample correction is **algebraically zero** (numerator `6 + 1 - 14 + 7 = 0`), so no
    Diebold-Mariano variant was computable: selection had no available significance test, not a
    weak one. `rolling_origin` gained a `step_days` parameter (None reproduces the historical
    disjoint-window behaviour exactly); at step 1 the ladder was re-run across every rung and
    venue, lifting Beer Hall to 273 origins (HLN 0.976), Ellel to 260, TRT to 205, at which a
    test becomes computable in S3.
    **The refactor is behaviour-identical, proven three ways** (report 43 section 2): a verbatim
    copy of the pre-refactor function yields byte-identical fold boundaries across five configs;
    Two River Taps, frozen since 2026-05-08, reproduces the committed table to the digit on every
    deterministic rung at the current ceiling; and all three venues reproduce it exactly at the
    seed ceiling. The apparent G1 failure at the current ceiling is the **report 42 `as_of`
    defect on the ladder**: the committed tables were computed at the 2026-05-31 seed and a
    rolling-origin result moves with the store's last day, so "reproduce the committed tables"
    is unsatisfiable without a pinned reference. Only `rung4_chronos2_exo` fails to reproduce
    even at a fixed ceiling (<=0.010), which is pre-existing Chronos covariate-path
    non-determinism.
    **Winner outcome, controlled for ceiling** (the naive committed-vs-step1 comparison confounds
    fold count with store growth, so report 43 section 3 holds the ceiling fixed): **Beer Hall
    and TRT confirm their served models** (`chronos2_exo`, `ets`) at 273 and 205 origins; Beer
    Hall is the clean Major-4 demonstration, because at the current ceiling the 42-day six-fold
    window picks `robust_dow` and only 273 origins recover the served `chronos2_exo`. **Ellel's
    argmin changes from the served `rung1_robust_dow` to `rung4_chronos_bolt`** (0.585 -> 0.575),
    which **triggers the stop condition**: reported, served model **unchanged**. Two reasons:
    the change is a ceiling effect not a fold-count effect (the flip is already present at
    6-fold@0707, and adding folds keeps `chronos_bolt`), and the gap is **0.0084, which is 0.18
    of one standard error** against a fold sd of 0.71 - four rungs tied within noise. Prediction
    recorded before S3: the Ellel MCS will contain `chronos_bolt`, `chronos2_exo`, `robust_dow`
    and `chronos2`, so no model change is warranted and the correct outcome is a wide set.
    **Deliverables:** per-fold MASE and RMSSE vectors persisted to `eval/fold_vectors_L1_*.json`
    with each value carrying its fold **index** (a rung that skips a fold - Ellel `chronos2_exo`
    missed 14 June folds on `MissingCovariateError` - otherwise yields a silently misaligned
    vector; `aligned_pair` is the safe differencer and the file itself carries the
    overlap/independence warning for S3). Ellel is **260 origins not the spec's 266**: the frame
    is 386 rows because `trim_to_active` drops the 2025-06-08 sale-and-reversal mis-ring and its
    six dead days, the same leading span behind the S1 G2 erratum. Gates: G2 counts exact (Ellel
    on the corrected 260), G3 leakage guard fires on a constructed overlapping case and no step-1
    fold leaks, G4 round-trip and alignment tested, G5 suites 419->449 and 426->456 skips
    unchanged, G6 served models and frozen artefacts untouched and ceiling restored to
    2026-07-07. Evidence: `brain/log/43_G17b_Fold_Count.md`, `eval/fold_vectors.py`,
    `tests/test_a2_fold_count.py`.
    **Carried correction to row 30 (append-only, not an edit):** the S1 quality check noted that
    0.772 against a backtest of 0.745 is slightly **worse** than the backtest class, not equal to
    it. The defensible claim, adopted in report 42 and here, is that serving-horizon performance
    is **consistent with** the backtest; "matched" overstated it.

32. **Pre-registered: the Ellel served-model decision rule, fixed before S3's Model Confidence
    Set is computed.** S2 (row 31) found that at 260 origins the Ellel argmin moves off the served
    `rung1_robust_dow` to `rung4_chronos_bolt`, by 0.0084 MASE, which is 0.18 of one standard
    error against a fold sd of 0.71 - four rungs tied within noise. The decision on whether to
    change what is served is deferred to S3's MCS, and the rule is written down **now**, before
    that set exists, so it cannot be accused of being chosen to fit the result (the same
    pre-registration discipline the project applies to forecast freezes):
    > **If the 90% Model Confidence Set at Ellel contains `rung1_robust_dow`, it stays served**,
    > because the data cannot discriminate it from the alternatives and the incumbent is the
    > parsimonious choice. **If the set excludes `rung1_robust_dow`, the served model changes** to
    > the retained model of lowest mean MASE, and all three confrontations are re-scored against
    > the new served model.
    The prediction, also recorded in advance, is that the set will contain `robust_dow` (alongside
    `chronos_bolt`, `chronos2_exo` and `chronos2`), so the incumbent stays. This row binds the
    action to the set regardless of which way it falls.
    **Two carries into S3.** (a) `rung4_chronos2_exo` scored only 246 of Ellel's 260 folds,
    failing on the **contiguous** June block (folds 246 to 259) with `MissingCovariateError`: S3
    must establish whether the lead-matched weather exo is a genuine upstream data gap or a bug in
    the covariate join, because if it is a bug it contaminates S6's entire weather ablation. (b)
    The store-durability fix (FLAG-STORE-DURABILITY) is folded into S3 as agreed.
    **Correction to row 31 (append-only, not an edit):** row 31 describes the Ellel leading span as
    "the 2025-06-08 mis-ring and its six dead days", which reads as seven days dropped. The true
    count is **six days total** - the 2025-06-08 mis-ring plus **five** dead days (2025-06-09 to
    2025-06-13) - so `392 - 6 = 386`, first active 2025-06-14. The load-bearing numbers in row 31
    (frame 386, origins 260, HLN 0.9750) are correct; only the descriptive "six dead days" was off
    by one. Report 43 section 1 is corrected in full.

33. **Pre-registered: the Model Confidence Set procedure and its parameters, fixed before the set
    is computed (S3 G17c, Part 4a).** S2 (row 31) lifted the fold count to 273/260/205 overlapping
    origins, at which a significance test on the served-model decision becomes computable for the
    first time. The procedure is the Model Confidence Set of Hansen, Lunde and Nason (2011), and
    every choice below is written down **now**, before the set exists, so it cannot be accused of
    being tuned to the answer:
    - **Primary loss: per-fold MASE** - the loss the committed gate used, so the MCS audits the
      decision actually made. **Secondary loss: per-fold RMSSE** as a robustness check; if the two
      disagree on membership that is itself a finding.
    - **Statistic: T_R** (the range), `max_{i,j} |t_ij|`, with the matched elimination rule
      **e_R = argmax_i sup_j t_ij**. T_R answers the question being asked: is model i distinguishable
      from model j.
    - **Bootstrap: moving block.** Consecutive origins at step 1 share six of seven days, so the
      loss differentials are serially correlated by construction and are not iid draws; an iid
      resample or a plain t-test over these folds is invalid. **Block length l = 7 primary** (the
      horizon is the mechanical source of the overlap), sensitivity at l in {2, 7, 14, 21}.
      **B = 1000 primary** (Hansen-Lunde-Nason use 1000), repeated at B = 5000.
    - **Levels: alpha = 0.10 primary, 0.25 secondary.** NOT 0.05: at these sample sizes the
      procedure has no power there and the choice would read as post hoc.
    - **Alignment.** The MCS requires every model scored on identical data, so Ellel is run TWICE:
      a **common-fold restriction** to the 246 folds `rung4_chronos2_exo` scored (primary), and the
      **full 260 folds excluding `chronos2_exo`** (secondary). The 246 restriction drops a
      *contiguous* June block (the most recent period, not a random sample); if the two runs
      disagree on `rung1_robust_dow`'s membership the June block is doing the work, and that is
      reported rather than smoothed.
    - **Implementation gate (G4).** The MCS is verified on two synthetic truths before any real set
      is trusted: one uniformly dominant model must collapse the set to itself, and identically
      distributed models must all be retained. A single elimination sequence is computed and
      thresholded at each alpha, so the 0.25 set is a subset of the 0.10 set BY CONSTRUCTION - the
      stop-condition ordering "retained at 0.25 but eliminated at 0.10" is made structurally
      impossible rather than merely asserted. Bootstrap seed fixed at 93.
    **The prediction, recorded before the run** (it binds either way): at Beer Hall the top four
    rungs sit within 0.036 MASE against a marginal se near 0.029, so the 90% set retains at least
    the top three and eliminates `rung0_seasonal_naive` and `rung3_gbm`; at Ellel the set retains
    `rung1_robust_dow`; at Two River Taps it retains `rung2_ets`. The paired variance measured in
    Part 4b decides it: if the paired differences are much tighter than the marginal errors, the
    sets are narrower than predicted and the data discriminates better than the report-43 tables
    suggest. Either outcome is reportable; neither is a reason to change the procedure. The
    pre-registered Ellel *action* rule is row 32; its application is recorded in a later row.

34. **S3 G17c result: the significance test runs, and every served model is inside its 90%
    Model Confidence Set.** The test uncomputable at six folds (row 31: HLN algebraically zero)
    is now computed on 273/260/205 origins. **The pre-registered prediction (row 33) holds at all
    three venues.** Sets (MASE, common-fold, alpha 0.10 unless noted; served model in **bold**):
    - **Beer Hall (n=273):** {**rung4_chronos2_exo** (MCS-p 1.000), rung4_chronos_bolt, rung4_chronos2,
      rung2_ets, rung1_robust_dow} - 5 of 9. At alpha 0.25 it tightens to the three Chronos entrants.
      `rung0_seasonal_naive`, `rung3_gbm`, `rung3_global_gbm` and `rung2_stl` are eliminated with
      p <= 0.002 - **exactly the prediction** (retain the top three, drop naive and GBM). RMSSE
      returns the same five.
    - **Two River Taps (n=205):** {**rung2_ets** (1.000), rung4_chronos_bolt, rung4_chronos2_exo,
      rung4_chronos2} - 4 of 9; the three Chronos entrants tie the served ETS at MCS-p 0.682. The
      set is identical at alpha 0.25 and under RMSSE.
    - **Ellel (n=246 common-fold):** {rung4_chronos_bolt (1.000), **rung1_robust_dow** (0.575),
      rung4_chronos2_exo, rung4_chronos2, rung0_seasonal_naive} - 5 of 9. The full 260-fold run
      excluding `chronos2_exo` gives {rung4_chronos_bolt, **rung1_robust_dow**, rung4_chronos2}; the
      served DOW model is retained in **both** alignments and under RMSSE.
    **Paired variance (Part 4b) is why the test can discriminate at all.** The report-43 marginal
    se near 0.029 made the 0.036 top-of-ladder gaps look indistinguishable; but the rungs are
    strongly correlated across folds, so the **paired** differential sd is far smaller - the
    paired-to-independent sd ratio is 0.16-0.27 at Beer Hall, 0.15-0.45 at TRT and **0.06-0.16 at
    Ellel** - giving a paired se near 0.006-0.011. The MCS still returns wide sets among the top
    cluster because the range statistic corrects for multiplicity: the data separates the clearly
    worse rungs (naive, GBM, STL eliminated at p <= 0.005 almost everywhere) but **cannot separate
    the foundation models from the served incumbent**. The autocorrelation of the differential
    decays from acf-1 ~ 0.5-0.8 to ~ 0 by lag 7, so l = 7 is empirically justified and conservative;
    the sensitivity sweep confirms it - l = 2 understates the overlap and returns spuriously narrow
    sets (Beer Hall 3/1 vs 5/3 at l = 7), while l in {7, 14, 21} and B in {1000, 5000} are stable.
    Sets are nested (alpha 0.25 subset of 0.10) by construction, so no stop condition fired.
    Artefact `eval/mcs_L1_results.json` (carries `store_ceiling`), module `eval/mcs.py`, synthetic
    G4 gates in `tests/test_a2_mcs.py`. Evidence: `brain/log/44_G17c_Model_Confidence_Set.md`.

35. **Applying the pre-registered Ellel rule (row 32): `rung1_robust_dow` stays served; no
    confrontation is re-scored.** Row 32 bound the action before the set existed: if the 90% MCS
    contains `rung1_robust_dow` it stays served, if it excludes it the served model changes and all
    three confrontations re-score. **The set contains `rung1_robust_dow`** - in the primary 246-fold
    common run (MCS-p 0.575), in the secondary 260-fold run excluding the covariate entrant, and
    under the RMSSE loss. The two alignments do **not** disagree, so the June-block caveat
    (FLAG-ELLEL-JUNE-EXO) does not force an ambiguity halt. **Decision: the served model is
    unchanged at all three venues; no confrontation is re-scored.** This closes the S2 stop-flag
    (row 31): the six-fold argmin flip from `robust_dow` to `chronos_bolt` (gap 0.0084 = 0.18 se)
    was noise - both models sit inside the Ellel set and are statistically indistinguishable, which
    is what the pre-registration predicted. Applied as written; not reinterpreted in light of the
    result.

36. **S4 Part 1: the intermittency cutoff constants corrected, and the first L1 diagnostic.** The
    diagnostic classified on ADI >= 1.32 and CV-squared >= 0.49, both arithmetic errors in
    Syntetos-Boylan-Croston. Kostenko-Hyndman (`kostenko_note_2006`) give the crossover as
    **p = 4/3 = 1.3333** and the CV-squared boundary as **0.5**. Both pairs are now named constants
    and the diagnostic reports under each. Run at L1 for the first time, the two-by-two (two
    demand-day definitions x two cutoff sets) shows **the Beer Hall flips from lumpy to erratic**
    across the correction (ADI 1.327, inside the [1.32, 1.3333) band the error moved), under both
    demand-day definitions; Two River Taps is erratic and Ellel lumpy under both, unambiguously.
    **No stop:** the L3 Croston trigger `intermittent_nodes` now gates on 4/3, and no L3 node lies
    in the affected band (nearest intermittent 1.4129), so the trigger set, the Croston comparison
    and every adoption are byte-identical; the Beer Hall L1 flip is diagnostic only (the venue is
    served by `rung4_chronos2_exo`, not by an intermittency label). Evidence:
    `eval/intermittency_L1.md`, report 45 Part 1.

37. **S4 Part 2: the scale basis policy, settled by bootstrap and differing by venue for a measured
    reason.** For each venue and each of the four bases the absolute lag-difference vector was
    resampled with replacement (B = 10000), ruler pinned `as_of = 2026-07-07` so the point scales
    reproduce the most recent confrontation exactly. **Policy:**
    > **Beer Hall and Two River Taps adopt `calendar_lag7_active`** - the only basis that is both
    > weekday-aligned and undeflated - because its sample is adequate (276 and 268 pairs) and its
    > 95% interval (~30%) is no worse than the deflated `calendar_lag7`. **At Ellel no scaled-error
    > basis is defensible**: `calendar_lag7_active` rests on 28 pairs (66% interval), the deflated
    > `calendar_lag7` induces a MASE spanning 0.32 to 0.55 on scale uncertainty alone, and the
    > trading bases give a spurious MASE ~0.09 off a ~770-806 denominator. Ellel is reported on
    > **unscaled error (MAE/RMSE) or a cost-weighted metric** (`chatfield_all-zero_2007`), never a
    > MASE gate.
    This confirms the pre-registered prediction (no basis defensible at Ellel; scaled error is the
    wrong instrument at 1.2 trading days/week). It supersedes S1 row 30's tentative "`calendar_lag7`
    reported, `calendar_lag7_active` the intended successor": the successor is adopted at two venues
    and rejected at the third, with the reason measured. Evidence: `eval/scale_bootstrap_L1.json`,
    report 45 Part 2. FLAG-MASE-RULER updated.

38. **S4 Part 3: the L2 cadence denominator routed through the harness; report 24 survives.**
    `sim/cadence_sweep.py` now computes its per-category seasonal-naive denominator through
    `harness.seasonal_naive_scale(basis="calendar_lag7")` instead of an undocumented inline. Verified
    **byte-identical** across every L2 category of all three venues (0 mismatches vs the old formula,
    no degenerate zero-scale), so **no cadence number moves and report 24's "weekly is the sweet
    spot" conclusion survives** - and it is in any case basis-invariant, because the denominator is
    constant across cadences for a category. `FLAG-L2-DENOMINATOR` is **re-scoped, not merely
    cleared**: the basis is now explicit and single-sourced, and the deflation it inherits is the
    documented `calendar_lag7` property Part 2 characterises. Evidence: report 45 Part 3, FLAGS.

39. **S4 Part 4: the observed-occurrence hurdle gate, built and measured; Ellel scaffold only.**
    `yhat = P(trade) * E[revenue|trade]` with **P(trade) observed, not estimated** (`signals/occurrence.py`).
    The occurrence label is exogenous and never read from a venue's revenue: the known weekly
    calendar for the Beer Hall, the booking diary for Ellel. A **comped open day** is representable
    as a trading day (occurrence 1, amount 0, P=1, E=0), distinct from a scheduled closure (G4). At
    the Beer Hall, gated vs ungated `rung1_robust_dow` over 273 origins, judged by the **S3 Model
    Confidence Set** (not a mean): both sit in the 90% set (gated mean 0.787, ungated 0.803), so **the
    gate does not measurably help** where the day-of-week features already carry the closures. At
    Ellel the gate is **inert behind `ELLEL_DIARY_LIVE = False`** pending the booking diary; the
    `is_ellel_event` self-leak is impossible by construction - `ellel_diary_occurrence` takes a diary
    map, never a revenue series (G5). `FLAG-ELLEL-DIARY` opened. No served model changed. Evidence:
    `eval/occurrence_gate_beer_hall.json`, `tests/test_occurrence_gate.py`, report 45 Part 4.

40. **S4 Part 5: the Finding 3 flip is refuted, and it was the external assessment's.** There is no
    forward minor to bump to (scikit-learn 1.9.0 and statsmodels 0.14.6 are the latest available), so
    the decisive test reproduces the rerun's own versions: scikit-learn **1.8.0** (one minor below the
    pin, exactly the rerun's) with statsmodels 0.14.6, Two River Taps six folds, seed ceiling
    reproduced by the frozen frame. Result: **ETS 0.597 (not the claimed 0.617), GBM 0.601, winner
    ETS - no flip.** The rerun's GBM 0.601 reproduces (a genuine scikit-learn 1.8.0 vs 1.9.0 effect of
    one thousandth), but its ETS 0.617 is impossible: ETS is a statsmodels model and statsmodels was
    identical in both runs, so ETS is 0.597 by construction. The 0.617 was a harness artefact of the
    external reconstruction, not a library effect. **The reproducibility finding stands** (unpinned
    `>=` bounds with no lockfile were a real defect, fixed in S3); only the "flips on a library bump"
    illustration is withdrawn. This corrects the external assessment, not this work. Evidence: report
    45 Part 5.

41. **S8 Part 1: the briefing-triage agent is built and pre-registered.** `signals/agent.py` is the
    LLM agent named by the research question: given one venue's ranked, de-duplicated briefing items
    for a day, it returns per item a calibrated `p_raise` (probability the item is worth raising), a
    rationale (the tone), and the pinned model plus prompt hash. The live call is an injected
    `execute` closure and the `anthropic` import is lazy, so the module never fabricates a probability
    and loads with the SDK absent. The prompt is a committed file `signals/prompts/agent_v1.md` (hash
    `c1137f76`), model `claude-opus-4-8` and temperature 0 pinned in config and stamped into every
    verdict. **Pre-registered:** committed at `c8fa127`, strictly before any evaluation output, so
    commit order proves the prompt was not tuned against a score (G1). A second prompt could only be a
    declared `agent_v2.md` arm, never an edit to v1. Evidence: report 46 Part 1.

42. **S8 Part 2/3: the response cache and the cost-sensitive threshold.** `eval/agent_cache.py` keys
    each response on `hash(model, prompt_hash, payload)`, so editing the prompt invalidates every
    cached answer; offline replay makes zero model calls and a miss is a hard `CacheMiss` (the stop
    condition, not a fallback). The cost sweep (`eval/agent_calibration.py`) follows PRISM
    (`fu_prism_2026`): the miss:false-alarm ratio r implies the Bayes threshold `t = 1/(1+r)`, swept
    over the pre-registered grid `(0.25, 0.5, 1, 2, 4)` spanning 1:4 to 4:1 and including 1:1, so
    **Elliot's elicited ratio selects a row on the curve, not a re-run.** Machinery verified against a
    calibrated corpus with a known cost optimum. Evidence: report 46 Parts 2-3, `tests/test_agent_calibration.py`.

43. **S8 Part 4: the calibration is DETECTION calibration, and the distinction is stated not buried.**
    ECE and Brier on `p_raise` measure *was there a real deviation*, the truth the 644-injection corpus
    supplies, NOT *should the manager have been told* (intervention calibration), which needs human
    adopt-or-dismiss judgements and is S9. The code pins `CALIBRATION_KIND = "detection"` so the report
    cannot claim the stronger thing. The G3 bin floor is enforced (equal-width unless a bin is under
    ten, then equal-frequency coarsening, stated). **No judge kappa is reported:** no human anchor yet,
    and per `bavaresco_llms_2025` a judge must be validated against task-specific human annotation
    first. Evidence: report 46 Part 4.

44. **S8 Part 5: the agent-versus-constants gate, with the negative-result stop condition wired.**
    The agent (thresholded on `p_raise`), the six-constant `briefing._score`, and a random baseline at
    the matched base rate are compared on the same corpus and cost grid, with the pairwise disagreement
    rate and a paired bootstrap (B=10000) on Ask-F1 and expected cost. **If the agent agrees with the
    constants on more than 95 percent of items the run reports the LLM as decorative** and that a
    six-constant heuristic suffices, a publishable negative result; the machinery detects that case and
    genuine divergence in tests. The real verdict is S8b's headline. Evidence: report 46 Part 5.

45. **S8b deferred: the live half awaits a keyed environment.** This environment has no
    `ANTHROPIC_API_KEY` (verified absent from the process, every `.env`, and the shell profiles) and no
    `anthropic` SDK in any venv, so the 644 live calls that fill the response cache, and the empirical
    Part 3/4/5 numbers that flow from them, cannot run here. Rather than fabricate `p_raise` values or
    substitute a heuristic and call it the agent (the fraud this assessment exists to catch), S8a
    delivers the apparatus, the tests, the pre-registration, the housekeeping, and the methodology
    prose; **S8b is one command**: `ANTHROPIC_API_KEY=... python -m eval.agent_calibration --build`,
    then the offline replay reproduces every number with no key. `FLAG-S8B-LIVE-RUN` opened. Also:
    `chapters/methodology.tex` was NOT deleted (precondition 4) because the Overleaf canonical copy
    cannot be verified from here and the file carries the new S8 prose; the author's Overleaf sync
    completes it. Evidence: report 46 headline, deviations, and Gates.

46. **S5: multi-venue group in-context learning does not pay, and where it moves the number it moves
    it the wrong way. The pre-registered prediction and adoption rule, recorded before the run.**
    Prediction: group ICL most plausibly helps Ellel, the sparse series, and does little at Beer Hall.
    Adoption rule: a grouped arm is an adoption candidate only if it BOTH enters the 90 percent Model
    Confidence Set AND has the lower mean; entering the set alone is the outcome expected under no
    effect and is not sufficient. Outcome: at Beer Hall grouping is a small but significant loss (paired
    U beats G2/G3, CI excludes zero) yet all three sit in the 90 percent set; at Ellel grouping is
    directionally best in the predicted order (G3 < G2 < U in MAE) but every paired CI spans zero; at
    Two River Taps G3 is eliminated from the set and significantly worse. No arm both enters the set and
    has the lower mean at a stop-scoped venue, so no adoption and no stop. A publishable negative
    result. Evidence: report 47 Part 3, `eval/group_icl_mcs.json`.

47. **S5: the Two River Taps closure zeros are constructed, not stored, so G6 is met by a stronger
    check (flagged, not relaxed).** The `l1_daily` store holds zero Two River Taps rows after the
    2026-05-08 closure, and even within-span closed-day zeros are `fill_calendar` constructions, so
    G6's literal premise (rows present and zero in the store) is false. Rather than trust a stored zero
    that does not exist, the substitute verifies the property G3 actually needs: the closure is genuine
    (`is_closed` True, last active 2026-05-08 against dataset max 2026-07-07, no post-closure
    transactions), so zero is the factually correct revenue for every post-closure day and the
    constructed zeros are correct rather than padding of an unknown value. G3 is run with the zeros
    labelled constructed throughout; the verdict (G3 worse than U at Two River Taps) is unchanged.
    `FLAG-TRT-CONSTRUCTED-ZEROS`. Evidence: report 47 Part 2 and G6.

48. **S5: the device verdict depends on the call shape, and the package runs on CPU regardless.**
    Report 24 measured CPU faster than MPS on a univariate single-series call. Re-measured on grouped
    and batched calls (20 origins, batch 1/8/32): batching origins is a ~15x win for the independent
    univariate arm (packs forward passes) and flat for the grouped arm (cross-learning forces one
    forward pass per origin); at batch 32 CPU still wins the univariate arm (~3.7x) but MPS wins the
    grouped arm by ~1.7x. Because 1.7x is under the pre-registered 2x switch threshold, and because a
    CPU run keeps the univariate arm directly comparable to the committed ladder, the whole package runs
    on CPU with the device stamped on every artefact. Batched equals unbatched: the grouped arm exactly
    (0.0), the independent arm within 0.00092, both inside Chronos non-determinism. Evidence: report 47
    device section, `eval/group_icl_calibration.json`.

49. **S6: the Ellel June weather gap is an ingest artefact (partial fetch recorded as complete), not a
    real Open-Meteo gap, and it is repaired.** The nine-day Ellel hole (2026-06-21..06-29, present in
    all three bases, absent at Beer Hall) refetches complete now: 9 of 9 days non-null for observed,
    hindcast and leadmatched, including ERA5 reanalysis, so a genuine model-coverage gap is ruled out.
    The fetch helper raises on a total failure (a give-up is loud and self-healing), so the only path
    that lands a partial span silently is the incremental `build()` inserting a short HTTP 200 with no
    completeness check, after which the `MAX(date)` watermark steps past the interior hole. Fix: a
    `_assert_span_complete` check on every fetched span before insert (a short return raises
    `WeatherFetchIncompleteError`) plus a surgical `repair_span`; Ellel interior missing days went 9 to
    0 across all three bases. `FLAG-ELLEL-JUNE-EXO` closed. Evidence: report 48 Part 1.

50. **S6: the horizon-matched weather basis is pinned to one global model (`ecmwf_ifs025`).** The
    previous-runs API fills leads 1..7 for all cells under automatic selection, but pinning the UK
    high-resolution `ukmo_seamless` returns L5=1, L7=0, the local-model null-long-lead failure the
    package warned about. A single global model with a seven-day horizon keeps lead 1 and lead 7 the
    same model, so the basis measures forecast-skill decay with lead rather than a change of model
    between leads; the name is recorded in `config.WEATHER_HORIZON_MODEL` and stamped on every artefact.
    The fixed-lead F arm reads lead 3 from the same pinned store so F versus M isolates the lead policy;
    the stored `exog_weather_leadmatched` table and `WEATHER_LEAD_DAYS` are untouched as the stock
    reorder-lead object. `FLAG-WEATHER-PINNED-MODEL`. Evidence: report 48 Parts 2 and 3.

51. **S6: on the serving-realistic basis, weather does not distinguishably improve the forecast at any
    venue; the exogenous path is decoration at this estate.** Five arms of the same exo entrant
    differing only in the 7-day target-window weather (N none, O observed, H hindcast, F fixed lead 3,
    M horizon-matched), MCS at 90 percent plus a paired bootstrap, per venue. At every venue the
    no-weather arm N shares the 90 percent set with every weather arm including the realistic M, so the
    multiplicity-controlled test cannot separate having weather from not. Pre-registered rule: if M and
    N sit in the same set, weather adds nothing at operational lead. Outcome: it holds at all three
    venues. The covariate-quality optimism (H beats M) is real and grows with lead only at Ellel (H-M
    CI [-0.42, -0.033] excludes zero), where the exo entrant is neither served nor better than N; at
    Beer Hall, the one venue served by exo, H versus M is inseparable (CI spans zero) so there is no
    optimism in the served numbers. Evidence: report 48 Part 4, `eval/weather_basis_mcs.json`.

52. **S6: no served model is implicated and no stop condition fires.** The Beer Hall stop condition
    asked whether the served exo entrant falls out of the 90 percent set under the horizon-matched
    basis or is beaten by a lower rung. Under M the exo arm is in the set and is the nominal best, beats
    its no-weather sibling N, and is statistically inseparable from the committed hindcast H, so the
    committed selection (exo best at Beer Hall by ~5 percent over the nearest lower rung on the ladder)
    holds under realistic weather. Ellel's optimism implicates `rung4_chronos2_exo`, which Ellel does
    not serve (it serves `rung1_robust_dow`). The package runs on CPU (same reasoning as S5: the
    no-weather arm stays comparable to the committed ladder, reproduced to <= 1.4e-6). Evidence: report
    48 Part 4 and stop-conditions section.

53. **S7: the 1.00 band coverage the external assessment read as miscalibration is not evidence of
    anything.** It came from a seven-day confrontation window (the C2 confrontation, reports 31/35),
    and under perfect 90 percent calibration all seven points fall inside with probability 0.90^7 =
    0.478. The 95 percent Clopper-Pearson interval on a 1.00 estimate from seven points is [0.590,
    1.000], which contains the nominal 0.90. So the observation is consistent with correct calibration
    and does not support a miscalibration claim. A correction to the external assessment, the third
    this remediation has returned. Evidence: report 49 Part 1, `interval_calibration_power.json`.

54. **S7: pre-registered adoption rule for the banding methods, and the verdict is no adoption.** A
    method replaces the incumbent Mondrian band D only if it enters the 90 percent Winkler confidence
    set AND has the lower mean Winkler at the venue; entering the set alone is the outcome under no
    effect. The primary metric is the Winkler score (proper, in the data's units, so Ellel is scored
    on the same footing without a scaled-error basis). Outcome over five arms (P plain, D Mondrian, S
    per-step, A per-step ACI at the swept best rate, G per-step AgACI): D is the Winkler best or tied
    best at every venue; at Ellel the 90 percent set is {D} alone. No method both enters the set and
    beats D's mean anywhere, so none qualifies. The extra machinery of per-step and adaptive
    calibration widens the band more than it improves the miss penalty. Evidence: report 49 Part 4,
    `interval_calibration_mcs.json`.

55. **S7: stop condition 3 fired, and the served Beer Hall band is mildly overconfident.** The
    properly-powered coverage (1,750 pairs, not a seven-day window) shows the served Beer Hall band
    under-covers: Mondrian marginal 0.871, Clopper-Pearson [0.855, 0.887], excluding nominal 0.90 and
    below nominal at every step within the cap. It is robust across the point model: the served
    chronos2_exo forecaster gives 0.870, CP [0.853, 0.885], so it is a property of the band, not of
    ETS. Under-coverage is the unsafe direction, so the stop condition fired and is reported rather
    than patched inside an integration phase; ACI would restore coverage at a Winkler cost, making the
    fix a served-band review. `FLAG-BAND-UNDERCOVERAGE-BH`. Evidence: report 49 Part 2.

56. **S7: `FLAG-BAND-HORIZON` closed as a work package; the horizon cap stays at 7.** Per-step
    conformal is implemented and measured at power. The prediction that per-step half-width grows 181
    to 224 does not reproduce on this estate (Beer Hall's per-step half-width is flat, ~490 to 515 for
    ETS and ~466 to 483 for chronos2_exo; the 181-to-224 growth was a 26-per-step De Lune-series
    artefact). Per-step calibration equalises per-step coverage but is not a Winkler win, so under the
    adopt-only-when-it-beats-a-gate rule it is not adopted and `MAX_HORIZON_DAYS` is unchanged, now
    evidenced rather than assumed. Evidence: report 49 Part 3 and FLAGS.md.

57. **S10: the realistic injection pipeline re-runs the DOW-median detection forecaster (not the
    served ladder) under the production refit cadence, and the substitution is stated.**
    `RETRAIN_CADENCE_DAYS`/`RETRAIN_ON_CHANGEPOINT` govern the served rung0-4 ladder in production, but
    the 644-injection corpus's detection recall is scored against `signals.residual.build_residual_stream`,
    which is always the Rung-1 DOW-median baseline regardless of the served rung. Re-running the full
    ladder backtest per injected day is compute-intractable inside the package's budget and would not
    close the realism gap the spec names, since the ladder's rung selection never appears in the
    detection z-stream. `eval/inject_realistic.py` instead perturbs raw revenue and re-derives
    `expected`/`scale` under the same governing cadence (weekly plus change-point acceleration) applied
    to the model actually in the detection loop, stated and flagged per the standing rule (substitute
    stronger, never weaker). Evidence: report 50, `eval/inject_realistic.py` module docstring.

58. **S10: the propagation gate (G1) is proven discriminating, not vacuous.** A differential check
    (`expected`/`scale` at the first refit after an injection, perturbed run vs unperturbed run) fires
    on the intact realistic pipeline and is proven to stay silent on a deliberately broken constructor
    that refits from the unperturbed array while the caller believes the history was perturbed, the
    exact defect the gate exists to catch. Evidence: report 50 Part 1,
    `tests/test_inject_realistic.py::test_propagation_gate_fires_on_a_deliberately_partial_perturbation`.

59. **S10: the realism gap is real but does not inflate the published recall/latency figures; it lands
    on continuation alerting instead.** A paired subsample (n=120: 64 regime_shift, 32 spike, 24
    exo_coincident, seed 95) comparing the non-adaptive control pipeline against the realistic one shows
    recall and detection latency statistically indistinguishable for every kind (paired bootstrap
    difference 0.0, 95% CI [0.0, 0.0]). The pre-registered prediction (discount concentrated in
    regime_shift/exo_coincident, near-zero for spike) is refuted in direction, since the discount is
    zero for every kind, the spec's own stated alternative outcome ("recall stays high, the detection
    layer is more resilient than Finding 5 assumed"). The real effect is a change-point-triggered
    refit's feedback loop: it fires in 61-63 percent of sampled sustained-shift pairs and, when it
    fires, measurably suppresses further alerting on the SAME still-ongoing shift in 16 percent of
    checked pairs (comparing the production policy to a weekly-only ablation), never the original
    detection, because the refit trigger IS the change-point detector and so cannot precede the alarm
    that causes it. Stop condition 2 fires in this bounded form and is reported, not silently absorbed;
    it does not block the package because it does not touch the recall axis the committed figures are
    cited on. `FLAG-INJECTION-REALISM-DISCOUNT` closed (measured, zero); `FLAG-CONTINUATION-ALERT-SUPPRESSION`
    opened. Evidence: report 50 Parts 2-3, `eval/injection_realism.json`.

60. **S10: the control arm still reproduces the committed corpus (G4), and S8b keeps running on the
    control corpus.** A fresh `eval.agent_eval.run_scaled()` (N=644, deterministic) falls within 3
    percentage points of every by-kind recall in the committed `log/09_Agent_Eval_Report.md` snapshot
    (regime_shift 0.996 exact), consistent with store growth since the snapshot's 2026-07-06 date, not
    a regression from this package's one production change (`signals.residual._raw_series`, a pure
    extraction exercised continuously by the existing suite). Given the surfaced-item set is
    statistically the same in both arms, `eval.agent_calibration`'s ECE analysis is recommended to keep
    running on the control corpus; S8's frozen prompt and pre-registered configuration are untouched.
    Evidence: report 50 deliverable 6, `tests/test_injection_realism.py::test_control_arm_reproduces_the_committed_corpus`.

61. **S10: the review gate found three real issues, all fixed before commit.** A default-magnitude
    bug (`_build` fell back to `EVAL_INJECT_SHIFT_Z` instead of `EVAL_INJECT_SPIKE_Z` for an
    unspecified spike magnitude, silently breaking G3's identical-perturbation guarantee for that call
    path, though the sampling driver itself always passed magnitude explicitly and so was unaffected);
    a tautological G1 negative-control test (compared two snapshots both computed from unperturbed
    data, no discriminating power), rewritten so detection genuinely sees the perturbation while the
    refit's training frame is withheld from it, and the same differential check used by the positive
    control is shown to catch exactly that shape of bug; and an overstated docstring claim that
    `realistic_stream` mirrors `ingest.refresh._should_refit` "exactly", corrected to disclose the one
    real gap (no event-window cadence tightening), matching the package's own disclosure convention for
    its other scope narrowings. Suites re-verified green after all three fixes. Evidence: report 50
    "Review gate" section.

62. **S11: the chat-log KB-gap signal is wired into the briefing as a fifth source (`sop`), blocked on
    nothing, unlike its stock/checklist siblings.** `signals.chatlog_kb_gap` was tested and complete but
    imported by no briefing code (Major 8: three of four learning domains inert). `signals.briefing`
    gained `_collect_sop(venue)`, called from `collect()` on the same footing as the other four sources,
    using the `sop` weight (0.35) already declared in `BRIEFING_SOURCE_WEIGHT` but previously unused.
    The embedder is PINNED to the keyless TF-IDF path (`backend="tfidf"`, the new default for
    `embed()`/`rank_gaps()`/`gap_report()`) rather than left to the pre-existing three-tier Voyage ->
    sentence-transformers -> TF-IDF degrade, because three backends would cluster the same corpus three
    different ways, the same reproducibility defect S3 closed for the forecasting stack; the richer
    Voyage/sentence-transformers path stays reachable only via an explicit, documented, never-committed
    `backend="auto"` opt-in. Every artefact is stamped `embedder_backend` + `store_ceiling`. Verified,
    not asserted, that the pin never even attempts the network path: a test sets a fake
    `VOYAGE_API_KEY` AND blocks `voyageai` from being importable at all, and the tfidf path still
    completes. Evidence: report 51 Part 1, `signals/chatlog_kb_gap.py`.

63. **S11: venue attribution for an estate-wide chat corpus is a stated broadcast/exclude decision,
    not a guess.** A chat-log gap cluster tagged to a real venue (content named it) attaches only
    there. A cluster naming no venue at all is broadcast to every briefing venue rather than guessed at
    or silently dropped, because the corpus is single-owner, web-channel product-testing chat (Elliot's
    AI-GM Questions export) where the overwhelming majority of turns (359 of 376) name no venue at all,
    so `chatlog_kb_gap`'s "estate" fallback is mostly "unlabelled", not "genuinely cross-venue"; on the
    real corpus 3 of 4 above-baseline gaps fall into this bucket. A cluster tagged only to a name outside
    `BRIEFING_VENUES` ("brewery") is excluded, because there is no occurrence definition
    (`signals.occurrence.occurrence_label`) to gate it against and surfacing it ungated would break the
    convention every other source respects; 1 of 4 real-corpus gaps falls here. The occurrence gate
    itself mirrors S10's convention exactly: a definite structural closure (label 0.0) drops the signal,
    an inert label (NaN, Ellel's no-diary case) is left alone, never fabricated into a pass or a fail.
    The noise guard (density-above-baseline AND >=2 failures) was proven discriminating, not asserted,
    against a real clustering run over constructed "ordinary chatter" versus "repeated operational
    question" text, meeting the standard S10's G1 rewrite established. On the real 735-message corpus:
    4 of 12 clusters clear the gap threshold, comfortably under the roughly-ten-gap stop condition; the
    wiring is proven additive (a regression test compares `briefing.build()` with and against
    `_collect_sop` stubbed to `[]` and finds every non-sop item byte-identical), so **two of four
    learning domains are now live (sales, chat-log); stock remains blocked on James, checklist on
    Ryan/Neon.** Evidence: report 51 Parts 2-4, `signals/chatlog_kb_gap.json`,
    `tests/test_chatlog_briefing.py`.

64. **S11: the review gate found four issues, three fixed before commit, one recorded as a latent
    non-bug.** `write_artefact()` ignored the CLI's `--clusters`/`--backend` flags (always
    recomputed the default cached report), letting the committed JSON artefact silently disagree
    with a non-default run's own printed output; fixed by threading the caller's already-computed
    `{stats, ranked, backend}` through. `_sop_target_venues`'s majority-tag tie-break iterated a
    Python `set` (hash-randomised per process), so an exact-count tie between two real venues
    could pick a different venue across runs; fixed by tie-breaking over `sorted()` instead.
    `_sop_severity`'s thresholds were hardcoded in `briefing.py` instead of `config.py` alongside
    every other `BRIEFING_*` ranking knob; moved to `config.BRIEFING_SOP_SEVERITY_HIGH`/`_MEDIUM`.
    The fourth finding, that `checklist` and `sop` share direction `"na"` and could silently merge
    once `CHECKLIST_LIVE` flips true, is unreachable today and recorded in `briefing.py`'s module
    docstring rather than fixed pre-emptively for a path that does not exist yet. The security
    review's one Medium finding, that a chat-log gap item is the first composed signal to carry
    free-form user text into the `brain_daily_briefing` agent tool, was addressed with a one-
    sentence addition to that tool's description stating quoted text is data, not an instruction.
    Suites re-verified green after all three code fixes. Evidence: report 51 "Review gate" section.

65. **Literature-conformance gate: the review's verdicts audited against the method, six runs
    authorised and executed (2026-08-05).** The completed `literature_review.tex` was mined for
    every passage establishing a methodological requirement, identifying a limitation in prior
    work, or stating a contradiction between sources: 63 verdicts, extracted to
    `knowledge/05_litreview_verdicts.md`, classified against the implementation in
    `ledger/literature_conformance.md`. Of the 45 bearing on our method, 24 CONFORMED, 8 were
    DIVERGES--SHOULD FIX, 5 DIVERGES--DEFENSIBLE (reserved to the human), 8 DIVERGES--UNRESOLVED
    (all blocked on a third party). Six runs were authorised at the gate; all six ran the same
    day for roughly two minutes of total compute. Post-run the counts are 28 / 4 / 5 / 8, and
    the four remaining SHOULD-FIX rows are writing-only.

66. **Three chapter propositions are the chapter's own derivations attributed to sources that do
    not state them.** Neither T8 verification pass caught these, because both checked *claims
    about papers* and these are *inferences from papers* -- a distinct defect class, now named.
    (i) The p>2 condition for constant-zero optimality under absolute error: NotebookLM returns
    NOT SUPPORTED for any threshold in `hewamalage_forecast_2023`, which states the unconditional
    version. The condition is elementary and correct; it is ours. (ii) The claim that an
    *observed* regime variable removes the state-misclassification term: `sun_conformal_2025`
    defines the state as *unobserved* by construction, and the vanishing condition is
    **Corollary A.2**, not the Theorem 4.3 currently cited. Our inference holds a fortiori and is
    the strongest single argument for the Mondrian design, but it is our extension. (iii) The
    word "deflates" on the scaling denominator quantifies a direction the source does not.
    **Resolution: keep all three arguments, fix all three attributions.** Each is stronger stated
    as our own reasoning than as a borrowed result.

67. **R1 -- VUS-PR computed for the first time; W25 closed on a stale blocker.** Report 11's
    *"not computed, dependency unavailable"* is why the promise stayed open for months. The
    dependency was present all along in `.venv-eval` (`vus`, `TSB_AD`); `.venv-run` and
    `.venv-forecast` carry neither, which is why the blocker kept reading as real. No code change,
    75 seconds. VUS-PR by (kind, venue) over 624 windows: regime shift 0.934 (BH) / 0.972 (TRT),
    exogenous coincidence 0.932 / 0.996, spikes 0.760 (BH) / 0.704 (Ellel) / 0.912 (TRT). The
    detector separates on sustained structure and poorly on point events, corroborated inside the
    same run by the magnitude-1 sensitivity cells. Control: overall scaled recall came back 0.807,
    reproducing report 50 exactly. Evidence: `log/60_R1_vus_pr_result.md`.

68. **R3 -- the conformal upper bound is withheld wherever its condition fails, which is
    everywhere.** Angelopoulos & Bates Theorem D.2 holds only *"if the scores have a continuous
    joint distribution"*; their remedy of adding vanishing noise addresses incidental ties, not an
    atom. On a structurally closed day forecast and actual are both zero, so the score
    distribution carries a genuine point mass at 0. Measured: tie fraction 0.160 (BH), 0.590
    (Ellel), 0.183 (TRT), with the largest atom at score 0 in every case. The bound is now
    reported as NOT AVAILABLE at all three venues with the tie diagnostic printed beside it; the
    withheld values were 0.9005 / 0.9006 / 0.9007. **The lower bound is unaffected** -- it needs
    no continuity -- which is the limb the Beer Hall under-coverage argument rests on. Evidence:
    `log/61_R3_conformal_upper_bound_result.md`.

69. **`eval/interval_calibration` is environment-sensitive and carries no provenance stamp.**
    Found while running R3: a purely additive edit appeared to move coverage and Winkler figures.
    Diagnosed rather than assumed -- the module is deterministic *within* a venv (byte-identical
    re-run), and the delta is between venvs: `.venv-eval` runs numpy 1.26.4 / pandas 2.3.3,
    `.venv-forecast` runs numpy 2.5.1 / pandas 3.0.3 on identical statsmodels. Re-running in
    `.venv-forecast` reproduced the committed artefact exactly, and that is the run of record.
    **Recommendation on file: stamp this artefact with `provenance.py`.** A future regeneration
    from the wrong venv would silently restate every figure in `tab:winkler` with nothing on the
    artefact to show it.

70. **R6 -- the unbiasedness precondition WLS_v inherits from MinT was tested for the first time,
    and it fails.** Wickramasuriya et al. require `E[e_T(h)|I_T] = 0` and deliver the best
    minimum-variance linear *unbiased* reconciled forecasts; asked what happens when the bases are
    biased, the 2019 paper is silent. One-sample t-test per node on the held-out calibration
    block: **22 of 41 nodes reject unbiasedness, 19 of them with a positive mean residual**,
    including CAT::Beer (+25.36, p=7.7e-05) and VENUE itself (+21.09, p=0.047). The sign is what
    theory predicts -- a day-of-week *median* base is median-eliciting and sits below the mean on
    a right-skewed node -- so this is a property of the chosen base forecaster, not a defect in
    the reconciliation. **Resolution: the optimality claim is restated as conditional, with the
    condition measured and reported rather than assumed.** Evidence:
    `log/62_R6_wlsv_unbiasedness_result.md`.

71. **The measurement argument now closes empirically, and the last link is ours.** Absolute-error
    measures optimise the median (`hewamalage_forecast_2023`, verbatim); median-eliciting point
    forecasts are *"usually not"* coherent and MASE is *"just a scaled MAE"* (`kolassa_we_2023`,
    verbatim); MinT optimality requires unbiased bases (`wickramasuriya_optimal_2019`, verbatim);
    and our DOW-median bases are measurably biased on 22 of 41 nodes. This is one of the few
    places where the project's own data supplies empirical support for a theoretical objection its
    own literature review raises, and it belongs in the Discussion.

72. **R2 -- W37 closed: "covariates HELP" was a null, and the project caught it with its own
    instrument.** The committed artefact concluded covariates help from a six-fold mean delta of
    -0.014 across folds splitting three better and three worse (sign test p=1.0). Three defects
    fixed: a bare mean as verdict; six folds, at which `mcs.moving_block_indices` clamps the block
    to `n_obs` and the bootstrap is degenerate (the exact failure report 54 caught shipping a
    feature 6.5% worse than baseline); and a hard-coded `calendar_lag7` where the estate rules
    `calendar_lag7_active`. Re-run over the whole active span at a full-horizon step: **39 folds,
    delta -0.0002, covariate better on 18 of 39, paired 90% CI [-0.0102, +0.0108] containing zero,
    90% MCS retaining both arms.** Widening the grid collapsed the difference by two orders of
    magnitude, demonstrating rather than asserting that the -0.014 was noise pointing in the
    flattering direction. The exogenous null survives and is now properly evidenced, agreeing with
    S6, with Hertel's 89/3.55/2.74 attribution split and with Haben's *"often detrimental"*.
    Evidence: `log/64_R2_covariate_probe_result.md`.

73. **The hard-coded scale basis is in its third file.** G17o fixed `transfer/lovo.py`; R2 fixed
    `eval/chronos2_covariate_probe.py`; `eval/worldcup_fixture_probe.py` still scores Ellel on
    `calendar_lag7`, which under G2 is a violation twice over. It writes no artefact and appears
    in neither chapter, so nothing is retracted by leaving it, and repairing it means deciding
    what a cross-venue statistic means when one venue admits no scale -- a methodology decision,
    not a bug fix, and outside this gate. **Recorded with the standing recommendation to assume a
    fourth copy until someone greps for it.**

74. **R7 -- report 57's "blocked, no torch" row was two artefacts, and the label was imprecise.**
    `eval/chronos2_covariate_probe.md` was genuinely stale and carried a wrong conclusion (fixed
    under R2). `eval/chronos2_promotion_sensitivity.md` reproduces byte-identical and is **not
    staleness-eligible at all**: it takes two JSON snapshots as CLI arguments and never reads the
    warehouse, so it cannot drift with the store ceiling, which is the only mechanism that sweep
    tested. It belongs with `sim/*_frozen.md` under "excluded by design". Noted for the next
    sweep: an artefact that is a pure function of committed inputs needs a different staleness
    test from one generated against a moving store. Evidence:
    `log/65_R7_chronos2_staleness_result.md`.

75. **R4 -- G1 turned from a preference into a measurement, and it refuted my own recommendation.**
    Re-analysis only: committed per-fold loss vectors re-read, the same MCS instrument re-run under
    each loss, no refit. **The winning rung changes between MASE and RMSSE at BOTH scaled venues**
    -- Beer Hall `chronos2_exo` to `chronos_bolt`, Two River Taps `ets` to `chronos2` -- so the
    pre-run recommendation, which rested on an expectation of ordering invariance, does not
    survive. **But the 90% model confidence set is identical under both losses at both venues.**
    The two flips differ in size: Beer Hall is a coin-toss (0.5902 against 0.5900 under RMSSE),
    while at Two River Taps ETS falls from rank 1 to rank 4. The finding is that the only quantity
    the headline metric changes is the bare argmin -- the quantity W5 already established this
    project must not rely on -- while the inferential answer every conclusion does rest on is
    metric-invariant. **G1 remains the human's decision and is deliberately left open.** Evidence:
    `log/63_R4_metric_ordering_result.md`.

76. **The five DIVERGES--DEFENSIBLE rows are reserved to the human and none was decided by the
    agent.** D-D1 the MASE/RMSSE headline (now evidential, see 75); D-D2 Ellel scored on unscaled
    MAE where Chatfield's remedy is a *cost* objective whose two parameters were never elicited;
    D-D3 the degenerate hurdle, whose occurrence part is a deterministic calendar mask rather than
    an estimated probability; D-D4 the observed-state Mondrian design, which is stronger than the
    paper's and needs only its attribution corrected (see 66); D-D5 TabPFN-TS named as
    regime-appropriate and never entered in the ladder. Phase 8 must write the agreed
    justification for each into the methodology chapter, so each is presented separately with a
    recommendation and none is batched.

77. **PRE-REGISTRATION — the functional minimal pair (`rung1_mean_dow`), written before any code
    was touched (2026-08-05).** Append-only; corrections to this row go as new forward-pointer
    rows, never as edits to it.

    **Diagnosis being tested.** Two defects were mutually concealing. Defect A, the ruler: MASE
    elicits the median. Defect B, the estimand: the decision layer needs a mean -- deviation
    z-scores, band construction, and any revenue figure summed across days or venues are all
    mean-shaped, and expectations add where medians do not (Kolassa 2023, verbatim: *"the
    expectation is additive"*; *"the median of the density of a sum is usually not equal to the
    sum of the medians"*). A median-optimal ruler scoring a median-emitting estimator cannot see
    the mismatch. R6 measured the consequence at L3: **22 of 41 nodes reject unbiasedness
    (p = 2.3e-18 against chance), 19 of the 22 positive (sign test p = 0.0004)**.

    **Why an observational contrast alone is insufficient, recorded so the design is not read as
    over-engineering.** Contrasting `rung1_robust_dow` (median) against `rung2_ets` / `rung3_gbm`
    (both conditional means) confounds the functional with family, capacity, feature access and
    fit procedure. Any bias difference would be attributable to four things at once, and the
    design would not support the causal reading.

    **The manipulation.** `rung1_mean_dow`: identical to `rung1_robust_dow` in features, folds,
    fit span and structure, differing only in the central-tendency aggregator (median -> mean).
    Implemented by parameterising the existing rung on its aggregator so both arms share one code
    path. This is the only controlled manipulation of the functional available anywhere in the
    ladder. The observational contrast across the ladder is retained as a **generalisation
    check**, explicitly not as the load-bearing evidence.

    **Design.** Functional {median, mean} x metric {MASE, RMSSE} at the two scaled venues; at
    Ellel the metric axis is {MAE, RMSE}, since G2 rules it `unscaled` and no scaled error is
    defined there. Rolling origin at the established fold counts. Outcome measures: mean signed
    residual with a one-sample t-test (bias), and the metric pair.

    **Predictions, written before running.**
    (i) `rung1_mean_dow` shows a mean signed residual closer to zero than `rung1_robust_dow` at
    every venue; `robust_dow`'s bias is POSITIVE (forecast below actual) on right-skewed revenue.
    (ii) Under MASE, `rung1_robust_dow` scores better than or equal to `rung1_mean_dow`.
    (iii) Under RMSSE, `rung1_mean_dow` scores better than `rung1_robust_dow`.
    (iv) **The crossing in (ii)+(iii) -- each functional winning under the metric that elicits it
    -- is the load-bearing prediction. If it does not appear, the elicitation argument is not
    operative at this data scale, and that is the finding to report.**
    (v) Ellel shows the largest bias gap and the largest metric divergence, because at 82% zero
    days the DOW median is 0 on most days while the DOW mean is not. Least certain of the five.

    **Abort conditions.** Stop and fall back if: the mean arm cannot be built as a strict
    aggregator swap (the pair would no longer be minimal); the two arms do not share an identical
    fold grid (the comparison would not be paired); or the run exceeds roughly 30 minutes. The
    fallback is RMSSE-headline plus median-serving as a named limitation with the remedy, the
    cost and the reason for deferral all stated.

    **Commitments.** The median arm is reported at equal prominence whatever the outcome. Null
    and negative cells get the same prominence as positive ones. **This does not re-select the
    served model**: selection was made under MASE and is not revisited here, and the retained
    sets are reported unchanged under both rulers as the verifiable non-effect that defends
    against a charge of picking the flattering metric.

    **Quantile-integrated mean for Chronos-2: considered and declined.** It would make the full
    2x2 constructible, but it is a new estimator outside the pre-registered ladder, its
    approximation error at 3-9 quantile levels is unquantified, and siting it near a served path
    would spend the pre-registration asset. It goes to Further Work with the approximation-error
    question named as the prerequisite. **Recorded here so the Chronos-2 finding below is not
    doing double duty as an excuse for not running the arm.**

    **The Chronos-2 observation, pinned.** `chronos-forecasting` **2.3.1**,
    `chronos/chronos2/pipeline.py`: the docstring at **L786-787** documents the second return
    value as *"A list of torch tensors containing containing mean (point) forecasts"*, while
    **L817-818** read `# NOTE: the median is returned as the mean here` /
    `mean = [pred[..., training_quantile_levels.index(0.5)] for pred in predictions]`. Framed as
    an **ecosystem observation, not a defect claim against the maintainers**: a widely used
    library returns the median under the name `mean`, and a practitioner reading the signature or
    the docstring would not know. It is why the served Beer Hall model cannot supply the mean arm.

78. **R9 result — the functional minimal pair ran, and two of five pre-registered predictions
    failed (2026-08-06).** Forward-pointer row against the pre-registration at row 77; row 77 is
    not edited. Full record `log/66_R9_functional_pair_result.md`, artefacts
    `eval/functional_pair.{md,json}`. 760.7s, inside the 30-minute abort. Control:
    `rung1_robust_dow` verified **bit-identical** after the refactor onto the shared aggregator
    path (max abs diff 0.0), so the pair is genuinely minimal.

    **Prediction (iv), the load-bearing one: the crossing was OBSERVED at both scaled venues, in
    the predicted orientation, and NEITHER LEG IS SIGNIFICANT** (Beer Hall p 0.327 / 0.488; Two
    River Taps p 0.649 / 0.850; all four paired intervals contain zero). The claim the project
    may make is therefore: *on the one manipulation that isolates the functional, each functional
    was better on the metric that elicits it, at both scaled venues, and the per-fold differences
    are not separable from zero.* Direction replicated across two venues; effect not demonstrated.
    The word "shows" is not available.

    **Prediction (i) is PARTIALLY FALSIFIED and the mechanism is refuted at one venue.** Holds at
    Beer Hall (bias +67.67 -> +24.65) and Ellel (+75.09 -> -39.83). **Fails at Two River Taps on
    both limbs**: the mean arm is MORE biased (-29.46 -> -41.69) and the median arm's bias is
    NEGATIVE, where the pre-registered right-skew reasoning required positive. The mechanism does
    not hold at one of three venues and this run offers no explanation. Recorded as a failure of
    the stated mechanism. That TRT closed in May 2026 and its series is truncated is a
    hypothesis, not a finding, and nothing here tests it.

    **The bias result is stronger than the accuracy result and is the real finding.** At Beer Hall
    the functional swap removes roughly two-thirds of the bias (+67.67 -> +24.65) while moving
    MASE by 0.009. **A ruler nearly indifferent between two forecasters whose bias differs by a
    factor of three is the concealment the design was built to expose**, and it is the sentence
    the methodology needs.

    **Ellel inverts the argument, and that is the most informative cell.** At ~82% zero days the
    DOW mean is decisively WORSE on both metrics (MAE 105.98 -> 166.64, RMSE 236.89 -> 306.51,
    p 1.7e-25 and 5.4e-11), because the mean is dragged up by rare large trading days and predicts
    non-zero revenue on days that are actually zero. At extreme intermittency the elicitation
    argument is overwhelmed. This is Chatfield's all-zero result in the estate's own data and is
    independent empirical support for the G2 decision to take Ellel off scaled error.

    **The generalisation check is inconclusive, as the design anticipated.** Mean-functional
    ladder rungs do not uniformly show lower bias (`rung2_ets` +46.98 at Beer Hall, above
    `rung1_mean_dow`'s +24.65; `rung3_gbm` +28.98 at Beer Hall, -37.33 at Ellel). Family,
    capacity, feature access and fit procedure vary alongside the functional, so it licenses no
    causal reading. Retained as a generalisation check only, which is why the minimal pair was
    built.

    **A defect in the R9 report generator, found and fixed.** The first emission printed
    "positive = mean arm less biased, as predicted" unconditionally, including at Two River Taps
    where the value is negative and the prediction failed. Third instance of this class after
    report 57's crashed `weather_diagnostic` generator and R2's "covariates HELP". Fixed to branch
    on sign, to name each prediction HOLDS or FAILS, and to append the non-significance caveat
    wherever the crossing is reported. The corrected report was re-emitted **from the stored JSON
    with no re-run**, so the numbers remain the pre-registered ones.

    **Commitments discharged.** Median arm reported at equal prominence — it wins the absolute
    metric at all three venues and both metrics at Ellel. Served-model selection NOT revisited:
    `rung1_mean_dow` is reported and never served, and no retained set or served model changes.

79. **D-D1 RESOLVED — RMSSE adopted as headline, argued from the estimand.** Not framed as
    conceding to the examiner and not as buying compliance. The argument: the decision layer needs
    a mean, since deviation z-scores, band construction and any revenue summed across days or
    venues are mean-shaped and expectations add where medians do not; the serving layer emits a
    median; MASE scored that median against a median-eliciting ruler and made the mismatch
    invisible by construction; RMSSE is the instrument that surfaces it. R9 supplies the direct
    measurement — the ruler is nearly indifferent across a threefold bias difference — and R4
    supplies the reporting frame: **argmin of a fold mean is metric-dependent, valid inference is
    not.** MASE is retained as a labelled secondary with the flatline and structural-zero caveats
    and the July 0.386-versus-0.836 spread as a worked illustration of why a scaled metric needs
    two coordinates, a stated basis and a stated `as_of`. Reporting rules fixed at the same time:
    say "invariant across the two rulers tested at the pre-registered alpha, at the two scaled
    venues", never "metric-invariant"; use **Beer Hall** as the robustness example and report the
    Two River Taps counterexample (ETS rank 1 -> 4) in the same paragraph rather than leaving it
    to be found. Citations split precisely: **Kolassa (2020)** for which functional each measure
    elicits, **Kolassa (2023)** for additivity and coherence, **Hewamalage et al. (2023)** for the
    intermittency pathology, **Makridakis, Spiliotis & Assimakopoulos (2022)** for the M5
    precedent at **73% intermittent AT PRODUCT-STORE LEVEL** (62.9% across all 42,840 series; the
    figure is in the *Background, organization and implementation* paper), **Hansen, Lunde & Nason
    (2011)** for the MCS as the inference layer.

---

80. **2026-08-06 — D-D2 DECIDED: Ellel stays on unscaled MAE, and the reason is the estimand,
    not the missing cost parameters.** The §4 recommendation (accept the divergence) stands;
    the argument under it was rebuilt after source verification, and three things in the row
    as written were wrong. **Verified verbatim** in NotebookLM against `chatfield_all-zero_2007`:
    the cost is `TotalCost = (ordering cost + holding cost + shortage cost)`, scored as
    `C1 = TotalCost/n` and `C2 = TotalCost/sum(X_t)`, inside *"a simulation study of this
    inventory system"* whose replenishment quantity is the forecast itself — *"The size of
    this replenishment order, Q, equals the demand forecast, y-hat_t+1, for the following
    period, plus any current backorders"* — forecasting **demand in units**. **Correction C1:**
    the row said two parameters (`b`, `h`); there are **three** — ordering cost `A` as well.
    **Correction C2:** the row cross-referenced the §2.3 data-provision record and ask 6, but
    the elicitation blocked there is B6, the **surfacing cost ratio for `F_beta`**
    (`fu_prism_2026`, `trinh_hil-bench_2026`) — a different cost from Chatfield's inventory
    cost rates. Citing it would have imported the externally-imposed-scope argument into a
    place it does not reach; same class as V1/V2/V3, an inference *from* a source rather than
    a claim *about* one. **Correction C3, the substantive one:** the primary argument is that
    Ellel's estimand is `revenue_exvat`, **daily revenue ex-VAT in pounds**
    (`store/warehouse.py:293`), which has no stock position — nothing held, nothing
    backordered, nothing ordered — so `A`, `h` and `b` are not unelicited but **undefined**.
    The remedy is defined for a different estimand. That is a property of the problem, which
    is the bar §4 sets, and it is stronger than the missing-parameters argument it replaces.
    **Gain:** Chatfield supports the actual G2 choice twice, and the second support was unused
    — the paper's own denominator-bearing measures degrade on zeros, MAPE *"modified, because
    we cannot divide by a demand of zero"* and GRMSE excluded because *"that multiplicative
    measure breaks down with forecast errors of zero"*. That is direct support for dropping
    the denominator at an 82%-zero venue. **Nuance recorded rather than smoothed:** a
    replenishment decision does exist — A12 `signals/stock_inventory.py` flags a reorder on
    `days_of_cover < lead_time + safety` — but it runs at **Beer Hall only**
    (`A6_FORECAST_VENUE = "beer_hall"`, L40), consumes the **A6 product-node forecast in
    pints/day** rather than the venue-daily revenue series, and is a service-level rule with
    no `A`/`h`/`b` in it. The unelicited-parameter argument therefore moves to **Further
    Work**, scoped concretely to A12 at Beer Hall given an elicitation. No code changed, no
    run, no chapter text written.

---

81. **2026-08-06 — D-D3 DECIDED: accept, and reclassify — the row's premise was false.** The
    §4 row said `signals/occurrence.py::p_trade` *"returns exactly 0 or 1 by construction"*,
    putting the binary part outside Cragg/Mullahy's specification. **Reading the code, that is
    wrong.** `p_trade` returns `E[occurrence | day-of-week]`, a groupby mean over training
    labels (`signals/occurrence.py:95-98`) — a **saturated nonparametric estimator** of
    `P(trade | DOW)`. It evaluates to 0/1 at Beer Hall because that calendar is deterministic,
    not because the code forces it. **Verified verbatim** in NotebookLM that Cragg fits a
    probit (*"All our models start from the probit analysis model..."*) and Mullahy a binomial
    logit (*"...identically those of a standard binomial logit model"*), and that **neither
    discusses a known/observed first stage** — so the divergence, if real, would be genuine.
    **Verified numerically rather than asserted** (`eval/hurdle_saturation_check.py`, result
    `log/67_DD3_hurdle_saturation_result.md`, seed 93, n=400): with DOW dummies the saturated
    logit MLE reproduces the groupby cell frequencies to **max abs diff 7.61e-05**, i.e. they
    are the same estimator; and the deterministic cells show **complete separation**, |coef| =
    11.46 still diverging at 2000 iterations — the coefficient MLE does not exist while the
    fitted probability converges. So the closed form is the numerically stable route to
    identical fitted probabilities, and the probit *parameterisation*, not our design, is what
    breaks on a deterministic calendar. Both gains the sources name for a separate first stage
    are **structural** (Cragg: different variables/parameters may govern the two decisions,
    motivated by *"search, information, and transactions costs"*; Mullahy: the two processes
    need not be constrained identical) and this design has that separation — the amount model
    is fit on trading days only. **Surviving limitation is smaller than the row claimed:** the
    first stage conditions on DOW alone — covariate poverty, not absence of estimation — and
    the richer covariate is Ellel's diary, already recorded as D-U3 and blocked
    (`ELLEL_DIARY_LIVE = False`, with the circular fix foreclosed by construction). The null
    result's status is unchanged: against a DOW-conditioned baseline the gate is expected
    geometry, not a measurement. No methodology change, no experiment re-run.

---

82. **2026-08-06 — D-D4 DECIDED: accept the design, fix the attribution — but not the way the
    row proposed, because that fix was itself a misattribution.** §4 recommended *"re-cite to
    Corollary A.2 and present the observed-state case as our extension"*. **Verified verbatim**
    in NotebookLM: Cor A.2 reads *"If predicted state probabilities are accurate
    p-hat(z_t|x_{1:t-1}) = p(z_t|x_{1:t-1}), then epsilon = 0, therefore E[err_t] = alpha for
    all T"*, and Thm 4.3 bounds `|(1/T) sum E[err_t] - alpha| <= epsilon · max_z delta_{z,T}`
    with `epsilon = P(z-hat_t != z_t)` — **both stated for "the CPTC algorithm"**, whose update
    step is *"alpha_{z-hat_t,t+1} <- alpha_{z-hat_t,t} + gamma · (alpha - err_t)"*. **We do not
    run CPTC.** `conformal/wrap.py` is static split conformal in two variants, `plain` and
    `mondrian`, with no adaptive alpha and no gamma; its own docstring says *"Change-point-aware
    online conformal (Sun and Yu 2025) remains noted, not wired"* (L8-9), and the adaptive line
    (ACI/BOA in `conformal/methods.py`) was measured and NOT adopted, having performed worse
    than static at this estate's one real regime change. Citing Cor A.2 as our guarantee would
    therefore have claimed a theorem about an algorithm the served system does not implement —
    the same defect class as V1/V2/V3, caught only because the check was run twice. **Corrected
    attribution, three claims to three homes, no new paper and so no gate:** (1) what the
    procedure IS — `barber_conformal_2023`, already cited, defines it verbatim, *"Mondrian
    methods informally divide the observations into groups, and assume that the observations
    within each group are still exchangeable"*, crediting Vovk, Gammerman & Shafer (2005);
    (2) what it GUARANTEES — `stocker_gentle_2025`, already cited, *"this simple procedure
    provides the powerful guarantee of finite-sample marginal coverage: P(Y_{T+1} in
    C_{1-alpha}(X_{T+1})) >= 1 - alpha"*, applied within each group; (3) WHY an observed
    partition — `sun_conformal_2025` Thm 4.3, cited as motivation, since a latent-state method
    pays a penalty scaling with `epsilon` that a known calendar does not incur. **V2 CLOSED:**
    the paper defines the state as *"the unobserved discrete mode"* throughout, so the
    `observed`/`inferred` framing is ours and must be labelled as ours. Also flagged for the
    write-up: the ACI-measured-and-rejected result is our own evidence and is stronger here
    than any citation, and it is currently unused in this passage. No code change, no run.

---

83. **2026-08-06 — R5 PRE-REGISTRATION (D-D5), written and committed BEFORE any evaluation
    code exists.** Same discipline as row 77: this row is committed first, and the run is
    scored against the predictions **as written here**, including the ones that fail.

    **The problem.** `sec:rw-rhythm` argues that 3 venues / 1 year / few regressors sits
    inside the regime where **Chronos-2 and TabPFN-TS** are the licensed choices. One was
    tested. A named-but-untested alternative is the easiest question an examiner asks.

    **Why this is worth a late entrant, and it is not the convenience argument.** Verified
    verbatim from `hoo_tables_2026`: TabPFN-TS computes *"the mean for squared-error
    evaluations, the median for absolute-error evaluations, and arbitrary quantiles"* from a
    binned posterior predictive. It therefore **exposes a genuine predictive mean** — which
    the served foundation model does not (`chronos-forecasting` 2.3.1,
    `chronos/chronos2/pipeline.py` L817, *"the median is returned as the mean here"*). D-D1
    fixed the ruler and left median-serving as a declared limitation. TabPFN-TS is the only
    entrant available that could close it, so this run is not "another rung" — it is the R9
    minimal pair repeated on a foundation model.

    **Design.** A standalone evaluator `eval/tabpfn_entrant.py`. It scores TabPFN-TS and the
    incumbent rungs on **identical rolling-origin folds** (horizon 7, min train 120,
    **step 7**, so ~39 folds/venue — the R2 protocol, not R9's step 1, to stay inside the
    abort window), venue-appropriate metrics per G2 ({MASE, RMSSE} scaled, {MAE, RMSE} at
    Ellel), MCS (`BLOCK_LEN=7`, `N_BOOT=1000`, `SEED=93`) plus the paired bootstrap
    (`PAIRED_BOOTSTRAP_SEED=94`). It does **not** touch `models/ladder.py` and does **not**
    enter served-model selection.

    **Environment, and why a new one.** Installed into a fresh `.venv-tabpfn`
    (`tabpfn_time_series` 1.2.0, `tabpfn` 8.2.0), NOT into `.venv-forecast`. R3 established
    that `eval/interval_calibration` artefacts are environment-sensitive and unstamped, and
    `.venv-forecast` is the environment that reproduces the committed numbers. Installing a
    torch-stack dependency into it could silently restate published figures.

    **Predictions, numbered and falsifiable.**
    (i) The estate sits inside TabPFN's validated envelope — *"up to 10,000 samples and 500
    features"* (`hollmann_accurate_2025`) — with max training rows well under 500 at every
    venue, making the regime-fit claim checkable rather than rhetorical.
    (ii) At Beer Hall TabPFN-TS is **retained in the 90% MCS** alongside the incumbent best
    rung: competitive, not decisively better.
    (iii) At Ellel TabPFN-TS does **not** beat the incumbent on MAE. Neither source says
    anything about intermittent or zero-inflated series (verified: NOT SUPPORTED in both),
    and the paper calls the model *"a strong conditional interpolator"* that *"fails to
    extrapolate when forecasting requires moving beyond the observed target domain"*.
    (iv) Its mean and median arms differ measurably in bias, with the median arm biased more
    positive than the mean at Beer Hall — the R9 direction, replicated on a different model
    family.
    (v) The served model does **not** change. Reported, never served.

    **Abort conditions.** Wall clock > 60 minutes; model-weight download failure; memory
    error. On abort, fall back to the free alternative — narrow the review sentence to name
    only Chronos-2 — and record the abort.

    **Commitments.** Reported never served; model selection is not retroactively re-opened;
    null and negative cells get the same prominence as positive ones; the incumbent arms are
    re-scored on the same step-7 folds so the comparison is internally consistent rather than
    borrowed from R9's step-1 numbers.

---

84. **2026-08-06 — D-D5 DECIDED: R5 attempted and ABORTED on a pre-registered condition; the
    review sentence is narrowed and the blocker recorded.** Pre-registration row 83 (commit
    `473de1df`) was written and committed before `eval/tabpfn_entrant.py` existed; the
    evaluator, folds, MCS, paired bootstrap and mean/median pair are all written and
    committed. **The abort was not compute and not time** — wall clock under three minutes.
    `tabpfn` 8.2.0 (`tabpfn/browser_auth.py:621`) raises `TabPFNLicenseError`: *"TabPFN
    requires a one-time license acceptance to download model weights for local inference, but
    no interactive terminal is available"*, requiring a `ux.priorlabs.ai` account and an
    exported `TABPFN_TOKEN`. No account was created — the operator's call, not the agent's.
    The cloud route was never available: `TabPFNTimeSeriesPredictor.__new__` defaults to
    `TabPFNMode.CLIENT`, which posts the series to a vendor API, so the evaluator pins
    `TabPFNMode.LOCAL` explicitly rather than trusting a default that **differs between two
    entry points in the same library**. **Prediction (i) HOLDS and is salvaged**, because it
    never needed the model: max training rows **392 / 324 / 385** at beer_hall /
    two_river_taps / ellel against TabPFN's validated *"up to 10,000 samples and 500
    features"* — **3.9% of the sample limit** at the largest, so the regime-fit claim is now
    arithmetic rather than rhetoric. **Predictions (ii)–(iv) are NOT TESTED and may not be
    reported in any direction**; nothing licenses any statement about how TabPFN-TS would have
    performed. **Why this was worth a late entrant at all:** verified verbatim from
    `hoo_tables_2026`, TabPFN-TS computes *"the mean for squared-error evaluations, the median
    for absolute-error evaluations"* from a binned posterior predictive, so it exposes a
    **genuine predictive mean** — the only available candidate that could have closed D-D1's
    residual median-serving limitation, the served Chronos-2 having none. **Review sentence
    narrowed, but not as §4 proposed** (§4 said "name only Chronos-2", which would discard a
    regime claim now backed by a number): keep both models in the regime claim, state that
    only Chronos-2 was evaluated and why, and never imply TabPFN-TS was tried and found
    wanting. Environment isolated in `.venv-tabpfn` (gitignored) precisely so `.venv-forecast`
    — the environment that reproduces the committed artefacts, per the R3 hazard — was not
    disturbed; it was not. **First blocker in this project owned by a software vendor rather
    than by Elliot, Ryan or the estate's structure.**

---

85. **2026-08-06 — the `calendar_lag7` audit: the ledger's own criterion was wrong, one real
    defect fixed, and a live 24% ruler conflict found underneath it.** Full record at
    `log/69_basis_audit_and_ruler_conflict_result.md`.
    **(a) The criterion was miscopied.** The standing note said the hard-coded basis was "in
    its third file, assume a fourth". There are **~45 sites and almost all are correct**:
    `eval/harness.py:205` defines `REPORTED_BASIS = "calendar_lag7"` as *"the basis the
    dissertation quotes"*. A hard-coded `calendar_lag7` is the project standard, not a bug,
    and a future session hunting them would have "fixed" forty correct call sites. The real
    defect class is narrower — a **scaled** metric at a venue ruled `unscaled`, i.e. Ellel.
    Re-audited on that criterion: **no fourth file**. `eval/group_icl.py:274` and
    `eval/weather_basis.py:295` are reproduction limbs that MUST keep the committed basis and
    must not be changed; `occurrence_gate`, `feature_ablation`, `reconcile` and the tests are
    all single-scaled-venue or deliberate fixtures.
    **(b) The one real defect, fixed.** `eval/worldcup_fixture_probe.py` scored both venues on
    `calendar_lag7`, publishing a MASE for Ellel. `_fold_mase` is now `_fold_loss` and reads
    `config.VENUE_SCALE_BASIS`. **Nothing published depended on it** — report 19 records the
    probe deferring with *"June not present in this store, test deferred"*, so it had never
    produced a number in its life. First-ever results: beer_hall MASE (`calendar_lag7_active`)
    **1.056** with `wc_*` vs 1.127 without, tournament-only 1.152 vs 1.258, england-only
    ablation 1.080; ellel MAE (`unscaled`) 78.431 vs **76.805**, tournament-only 112.178 vs
    **109.021**, ablation 77.191. Directional only, 6 folds (4 tournament), no dispersion
    statistic — the covariates help at Beer Hall and mildly hurt at Ellel.
    **(c) A second pre-existing bug surfaced.** The tournament arms truncated `te` BEFORE
    predicting, so released chronos2 rejected the non-contiguous horizon
    (`ValueError: future_df timestamps do not match the expected prediction timestamps`) and
    those arms could not run at all. Now predicts the full horizon and masks for scoring —
    the correct semantics, recorded as a behaviour change rather than folded in silently.
    **(d) The finding underneath — two live rulers disagreeing by 24%.**
    `harness.REPORTED_BASIS = "calendar_lag7"` and
    `config.VENUE_SCALE_BASIS["beer_hall"] = "calendar_lag7_active"` are BOTH live and are not
    equivalent. Measured on the same 6 folds: mean scale 297.36 vs 369.16 at Beer Hall
    (**ratio 1.2417**) and 153.52 vs 174.39 at TRT (1.1361), so **the same forecast scores 24%
    lower at Beer Hall on the active basis**. They are unevenly distributed:
    `models/ladder.py:405` scores `tab:ladder` on `calendar_lag7` while R9, R2 and this probe
    read `config.VENUE_SCALE_BASIS`. **A MASE quoted without naming its basis is ambiguous by
    up to 24%, and MASE values from different chapters are not directly comparable.** This is
    the FLAG-MASE-RULER failure of report 42 recurring one level up: the three private copies
    were removed, the disagreement moved into two public constants. The `harness.py` comment
    defers adoption because *"S1 is forbidden from re-running the ladder"* — a constraint that
    no longer binds. **NOT RESOLVED — methodology decision, human gate.** Recommendation:
    make `config.VENUE_SCALE_BASIS` the single authority, demote `REPORTED_BASIS` to a
    fallback, re-score `tab:ladder`; costs a re-score and moves published MASE by ~20%.
    Strengthens D-D1's rule from the other side — the basis alone is worth 24%.
    **(e) Provenance stamping done (item 8).** `eval/interval_calibration.py` now writes
    `provenance.runtime_stamp()` into the vectors JSON and `stamp_lines()` into the report
    footer. Re-ran in `.venv-forecast`: the artefact diff is **purely additive — not one
    number moved**, which both verifies the stamp and re-confirms the R3 finding that this
    venv reproduces the committed figures exactly.

---

86. **2026-08-06 — the writing-only rows have their numbers assembled, and D-F5 was wrong in
    both limbs.** `ledger/transcription_pack.md` now holds every figure D-F3/D-F4/D-F5/D-F6
    need, each traced to a committed artefact, so Phase 8 is transcription rather than
    derivation. **D-F3:** all 30 `tab:winkler` cells extracted from
    `eval/interval_calibration_L1.json`; the Clopper-Pearson intervals the caption promised
    were **already stored** as `cp_lo`/`cp_hi` and simply never printed. Beer Hall at 0.9
    under-covers (0.8714, CP [0.8548, 0.8868], excludes 0.90); TRT over-covers (0.9631,
    [0.9512, 0.9728]); Ellel sits at nominal (0.9138, [0.8993, 0.9269]). **D-F4:** the sd/se/n
    for all 27 `tab:ladder` cells transcribed from `log/43` §3, plus the sentence they buy —
    Ellel's winner-to-runner-up gap is **0.0084 = 0.011 sd = 0.18 se**, so bolding a winner
    across it is exactly the W36 defect. Flagged that these are on the ladder's
    `calendar_lag7`, not `config.VENUE_SCALE_BASIS` (see row 85). **D-F5 — a correction, not a
    transcription.** The row claimed our sweep has *"zero misses and a flat cost of 8.0 at
    every ratio"*, repeating examiner charge W27, which the evidence pack had already warned
    *"do not repeat without re-checking"*. Checked against `log/PRJ93_Agent_Eval_Report.md`
    §S6 as regenerated by R1: **124 misses, 8 false alarms, cost 132.0 / 256.0 / 628.0 /
    1248.0**, misses dominant at every ratio. **Zero misses is false; flat cost is false.** The
    evidence pack's own 126-miss figures are also now stale by two after the R1 re-run — use
    the artefact, not either prose record. **The degeneracy is real but inverted**: the
    threshold is fixed, so the ordering never changes and the sweep selects no operating point,
    one-sided toward **misses**, not toward over-offering. **This propagates to D-F8**, which
    cites `lu_proactive_2024` for over-offering as the dominant proactive failure mode — this
    system does the opposite (precision 0.871, recall 0.804), so D-F8's proposed remedy
    ("demote recall, lead on precision") aims at the strong limb and must be re-derived.
    **D-F6:** threat-model paragraph drafted, bounding exposure on three concrete properties
    (single-tenant corpus, human-in-the-loop briefing rather than an actuator, and the forecast
    path never reading the retrieval store), stating that no mitigation is implemented.
    Nothing written into a chapter; nothing pushed to Overleaf.

---

87. **2026-08-06 — BOTH GATES APPROVED AND EXECUTED (in progress).**
    **Gate A — the ruler.** `config.VENUE_SCALE_BASIS` is now the single authority.
    `harness.REPORTED_BASIS` demoted to a documented FALLBACK for venues absent from the map,
    with the 1.2417x / 1.1361x divergence recorded in the comment so the next reader cannot
    repeat it. **The migration turned out to be half-done already**: `evaluate_rolling`
    (`models/ladder.py:477`) had used the ruled basis since G2, and the ladder report writer
    already carried a basis note; what had NOT migrated were `evaluate_static` (L405, fixed),
    `eval/fold_vectors.py` (hard-coded `"basis": "calendar_lag7"` — a **mislabelling bug**: it
    would have stamped a `calendar_lag7` label onto ruled-basis values, and at Ellel that
    label reads as a MASE on vectors that are MAE in currency; now writes the ruled basis plus
    explicit `loss`/`secondary_loss` fields), and the two reproduction limbs
    (`eval/group_icl.py`, `eval/weather_basis.py`) which now pair on `payload["basis"]` rather
    than a literal, so they cannot silently compare two rulers and call the difference a
    reproduction gap. **Scope correction owed to the human:** I described this as "~20%
    movement in published MASE". That understated it — Ellel is ruled `unscaled`, so its nine
    `tab:ladder` rows become **MAE in £**, a structural change to the table, not a rescale.
    Confirmed from the committed artefacts that Ellel's stored per-fold values (~0.118) are
    pre-G2 scaled figures, i.e. the discredited family the state brief forbids quoting.
    `eval/fold_vectors` regeneration launched (~1h of Chronos); **not yet complete at the time
    of writing, so `tab:ladder` is NOT yet re-scored**.
    **Gate B — Overleaf, three sections pushed.**
    (i) `sec:res-undercoverage`: **D-F3 was already done** — `tab:coverage` already carried the
    Clopper-Pearson intervals and `tab:winkler` had no dashes, so that ledger row was stale.
    But the check found a live defect: the caption still quoted the Angelopoulos-Bates
    expected-coverage bound (0.9005/0.9006/0.9007) that **R3 established is unavailable at all
    three venues**. The upper limb is now withheld with the atom masses stated (0.152 / 0.556 /
    0.173 of the mass at score 0), and the **lower** limb — which carries the under-coverage
    argument and needs no continuity — explicitly retained, so withdrawing the upper limb
    costs the finding nothing.
    (ii) New `sec:res-costsweep`: **D-F5 stated as our instance and corrected.** 124 misses,
    8 false alarms, cost 132 / 256 / 628 / 1248, misses dominant at every ratio; degeneracy
    real, direction **inverted** relative to `lu_proactive_2024`'s over-offering prediction
    (precision 0.871 vs recall 0.804).
    (iii) `sec:occurrence` retitled *"Occurrence, and the hurdle's saturated first stage"*:
    **D-D3 written in.** The old title and text asserted the first factor is "observed rather
    than estimated" — wrong about the implementation. Now states the saturated estimator, the
    7.6e-05 agreement with the saturated-logit MLE, complete separation (|beta| past 11, still
    diverging), and relocates the limitation to covariate poverty, cross-referenced to Ellel.
    **Still owed:** `tab:ladder` re-score (blocked on the running regeneration), D-F6 threat
    model, V1/V3, D-D1/D-D2/D-D4/D-D5 methodology paragraphs, and the gate-4 table-or-chart
    decision.

88. **Gate A completed — ruler migration re-scored, MCS re-run.** (`log/70`)
    The `eval.fold_vectors` regeneration finished (2511s of Chronos, exit 0). Fold counts are
    unchanged at all three venues, so the windows are the same windows and only the ruler moved.
    Basis now reads `calendar_lag7_active` at beer_hall and two_river_taps and **`unscaled`** at
    ellel, whose vectors are consequently **MAE in GBP**.
    *Verification that this is a denominator swap and not a model change:* the new/old ratio is
    uniform across all nine rungs at the two scaled venues (0.8179-0.8190 and 0.9297-0.9355). It
    is deliberately NOT the pinned-`as_of` ratios of `log/69` (1.2417, 1.1361) because
    `fold_vectors` scales per fold ex-ante rather than on one pinned ruler.
    *Rankings:* identical at beer_hall; one adjacent swap at two_river_taps (0.6260 vs 0.6261)
    and one at ellel (`rung1_robust_dow` 107.59 now ahead of `rung4_chronos2_exo` 110.78). Both
    are far inside their standard errors. **No ranking change survives its own se, and none may
    be written up as a reordering with content.**
    *MCS re-run* (deterministic, reads no store): beer_hall identical at both alphas and both
    metrics; two_river_taps reordered but membership unchanged; ellel **drops
    `rung0_seasonal_naive` from the 90% set under both MASE and RMSSE**. This STRENGTHENS the
    ladder argument -- on the discredited ruler the naive baseline could not be separated from
    the learned rungs at Ellel, and on the ruled basis it can. Report 44's ellel alpha=0.10
    membership is superseded.
    *Guard test corrected:* `test_persisted_artefact_declares_its_overlap_and_scale_policy`
    asserted the same `"calendar_lag7"` literal that permitted the mislabelling. It now pairs on
    `config.VENUE_SCALE_BASIS` and also asserts `loss`. 49 tests pass.
    The D-F4 block of `ledger/transcription_pack.md` is marked SUPERSEDED and points at `log/70`.
    **NOT pushed to Overleaf.** The re-scored `tab:ladder` push is a separate human gate and is
    entangled with gate 4: the table now mixes MASE and GBP in one float, and Ellel's sd exceeds
    its mean at every rung, so a bare mean column is not defensible presentation.
    **Still owed:** `tab:ladder` push + gate 4, D-F6 threat model, V1/V3, and the
    D-D1/D-D2/D-D4/D-D5 methodology paragraphs.

89. **Scoping correction: the regenerated vectors are `tab:mcs`, not `tab:ladder`.** (`log/70` S8-S11)
    Carried across several sessions as "re-score `tab:ladder`". Reading the live Overleaf section
    settles it: `tab:ladder` is the **historical committed gate at six origins, step 7**, and its
    own caption freezes it -- "re-running the table at the later ceiling would replace the
    decision under audit with a different decision, so it is deliberately not done". It is not
    built from the per-fold vectors. The 273/260/205 vectors feed **`tab:mcs`**. `tab:ladder`
    needs no re-score; one clause in its caption ("the implementation now follows that ruling")
    became true with the gate-A edit to `models/ladder.py:405`.
    *Second, independent change on Ellel's row:* `rung4_chronos2_exo` now scores all 260 folds
    rather than 246. This is NOT new -- `log/48` records the G4 June repair as verified
    ("246 -> 260 exo-eligible; the exact 14 gap-adjacent origins, proven analytically and in the
    run"). The MCS artefact had never been regenerated on the repaired store. Ellel's
    two-alignment complication therefore collapses to a single alignment and the caption's
    fourteen-fold caveat is retired.
    *`tab:mcs` after:* Beer Hall 5/9 and Two River Taps 4/9 unchanged; Ellel becomes a single row,
    4/9 at 260 folds, with `rung0_seasonal_naive` eliminated.
    *Argument-minimum paragraph recomputed:* the published "gap of 0.008 MASE ... 0.18 standard
    errors" becomes **1.55 GBP against a paired se of 1.67, i.e. 0.93 se**. Still inside one
    standard error, incumbent still retained, pre-registered rule still returns the incumbent --
    conclusion unchanged, margin smaller than the prose claims. The 0.18 must not survive.
    Pairing cuts the sd from 178.00 to 26.94 (6.6x), which is why a 1.55 GBP gap is measurable.
    *Gate 4 answered (operator, this session):* small multiples, three panels. Built as
    `fig:ladder` (`drafts/figures/make_ladder_figure.py`) -- own axis and unit per venue, 5-95
    whisker, IQR box, median rule, mean as a separate diamond so Ellel's mean-outside-box skew is
    visible. MCS membership at alpha=0.10 is what the ink marks; no rung is bolded by rank.
    *MCS write-up decision (operator, this session):* report both sets, foreground the caution --
    present the ruled-basis membership as primary and the superseded set alongside as sensitivity
    to the G2 scale ruling.
    **Overleaf push NOT made.** Gated.

90. **Overleaf push made (approved this session): `sec:res-mcs` rebuilt, `fig:ladder` introduced.**
    Three Overleaf commits. (a) `figures/ladder.pdf` + `.png`. (b) `sec:res-mcs` rewritten:
    `tab:mcs` reduced from four rows to three (Beer Hall 5/9 p=1.000, Two River Taps 4/9
    p=1.000, Ellel 4/9 p=0.662 at 260 origins); the Ellel two-alignment caveat retired with its
    own paragraph explaining the verified June repair; the argument-minimum figure corrected
    from "0.008 MASE ... 0.18 standard errors" to "GBP 1.55 against a paired se of GBP 1.67,
    which is 0.93 standard errors", with the pairing gain (sd 178.00 -> 26.94, 6.6x) stated;
    a sensitivity paragraph reporting BOTH readings per the operator's decision, naming the
    ruled basis as primary and the superseded `calendar_lag7` reading as the sensitivity, and
    stating the direction (the ruling sharpens Ellel's evidence rather than weakening it).
    `fig:ladder` introduced with a caption carrying the per-venue unit warning, the box/median/
    mean construction, and the reason mean and median are drawn apart. Every number carries a
    `% Trace:` comment to `log/70` or `log/48`.
    (c) A tightening pass after the `avoid-ai-writing` audit: two "worth [verb]ing" vague
    endorsements removed ("worth stating in that paired form", "worth naming plainly") and an
    em-dash pair in the figure caption split into two sentences.
    **`tab:ladder` deliberately untouched** -- row 89 establishes it is the frozen six-origin
    committed gate.
    **Still owed:** D-F6 threat model, V1/V3, D-D1/D-D2/D-D4/D-D5 methodology paragraphs.

91. **D-F6, V1, V3 and the four defensible-divergence paragraphs written into the chapters.**
    Seven further Overleaf commits.
    *V1/V3* (`sec:rw-ruler`): the `p > 2` threshold is now stated as this chapter's own
    derivation, with `hewamalage_forecast_2023`'s unconditional claim attributed to them and the
    median-is-zero step shown; "deflates the denominator" is labelled our characterisation, the
    source naming the problem without assigning a direction.
    *D-F6* (`sec:chatlog`): threat model written. The draft in `ledger/transcription_pack.md`
    said retrieval "feeds a briefing that a named human reads rather than an autonomous
    actuator" -- **too generous, and corrected before writing**: `signals/briefing.py:80`
    imports `chatlog_gap_report` and `signals/agent.py` scores briefing items with an LLM, so
    staff-authored text does reach a model's context. Written as: single-tenant corpus, the
    forecast path never reads it (**verified** -- no reference to `chatlog` anywhere in
    `models/`, `eval/` or `store/`), and the agent's verdicts are not served. Zou's ASR figures
    and verbatim wording were already confirmed in `ledger/citation_audit.md`.
    *D-D1* (new `sec:ruler-functional`): R9 minimal pair written in -- Beer Hall bias +67.67 ->
    +24.65 against a MASE move of 0.009; **both failed predictions reported at equal
    prominence** (Two River Taps' negative median-arm bias, Ellel's inversion) and the "not
    separable from zero" phrasing used rather than "shows"; the chronos median-under-a-mean's-
    name limitation carried, with the declined quantile-integration remedy named so the finding
    is not doing double duty as an excuse.
    *D-D2* (new `sec:ruler-ellel`): argued from the estimand -- Chatfield's A/h/b are
    **undefined** for a revenue target, not unelicited; the stronger second support (his own
    MAPE and GRMSE degrading on zeros) used; the A12 Beer-Hall-only replenishment rule stated
    before an examiner finds it.
    *D-D4* (`sec:conformal`): three claims homed in three places -- `barber_conformal_2023` for
    what Mondrian is, `stocker_gentle_2025` for what it guarantees, `sun_conformal_2025` as
    **motivation only**, with an explicit sentence that citing it as our guarantee would claim
    a theorem about an algorithm this system does not run. The observed/inferred framing is
    labelled as ours. Added the measured ACI rejection, which is stronger warrant than any
    citation. **Closes V2.**
    *D-D5* (`sec:ladder` + `sec:rw-rhythm`): the abort recorded with its pre-registration and
    its licence/data-privacy cause; prediction (i) salvaged (392/385/324 rows against a 10,000
    limit, ~4%); an explicit sentence that nothing licenses a statement in any direction about
    how it would have scored. The lit-review regime claim narrowed to the sample-size limb.
    **CONFLICT FLAGGED, NOT RESOLVED:** the write-up pack records D-D1's decision as "RMSSE
    headline, MASE labelled secondary", but the chapters report MASE as headline (`tab:mcs`
    primary loss) and `sec:rw-ruler` already carries the tension as a limitation. Flipping the
    headline metric is a methodology change and a human gate, so the evidence was written in
    **without** flipping it. Needs an operator decision.

92. **Headline metric flipped from MASE to RMSSE (operator-approved this session).** (`log/71`)
    Implements D-D1's recorded decision, which row 91 had flagged as unimplemented. **No model
    was re-run and no set recomputed** -- both losses have been stored on every fold since the
    first MCS run, so this is a change of designation applied to artefacts already on disk.
    *Pre-registration:* row 33 registered MASE as the reported headline. The designation is
    changed AFTER the sets were computed, so it is **declared as a deviation** in
    `sec:res-mcs` rather than absorbed. Three bounding facts written in: the argument is D-D1's,
    from the estimand, independent of any result; nothing was run to obtain the swap; and no
    served choice changes. `eval/mcs_L1_results.json` carries
    `"headline_designation_changed_post_hoc": true` so the artefact states it without the prose.
    *Code:* `eval/mcs_report.py` keys were `mcs_primary_mase` / `mcs_secondary_rmsse`, baking a
    DESIGNATION into a key a later decision can falsify -- the same defect class as the basis
    literal (`log/70`). Renamed to loss-named `mcs_rmsse` / `mcs_mase`, with `HEADLINE_LOSS` /
    `SECONDARY_LOSS` constants and a top-level `headline_loss` consumers index with; `top4` and
    the sensitivity sweep now follow `HEADLINE_LOSS`; added `headline_loss_at_venue` because at
    Ellel the `rmsse` vector is an RMSE in currency. `make_ladder_figure.py` reads
    `headline_loss` from the artefact instead of naming a metric. 49 tests pass.
    *Sets:* Beer Hall 5/9 p=0.990, Two River Taps 4/9 p=0.220, Ellel 6/9 p=0.912. **All three
    incumbents retained**, so the pre-registered rule returns the incumbent everywhere and no
    served model changes. Ellel's headline set is WIDER than its MASE set (6 vs 4).
    *The substantive finding:* the served model is the argument-minimum at **no** venue now.
    Beer Hall 0.02 se and Ellel 0.50 se are ties as before, but **Two River Taps' served ETS
    drops from FIRST under MASE to FOURTH under RMSSE, behind all three foundation arms, with a
    paired gap of 3.27 se.** Written up in new `sec:res-mcs-functional` as NOT a contradiction
    of its MCS retention: pairwise asks one question, the set controls thirty-six, and p=0.220
    is the weakest of the three retentions. This is D-D1's argument appearing in the estate's
    own data -- a squared measure separating two forecasters the absolute measure could not.
    *Chapters:* `sec:res-mcs` rebuilt with the declaration + new `sec:res-mcs-functional`;
    `sec:ruler` now leads on RMSSE with MASE as labelled secondary; `sec:ruler-ellel` reworded
    to RMSE headline / MAE secondary; `sec:rw-ruler`'s concession **resolved and relocated** --
    the chapter now adopts the measure it argued for, and what survives is that the served model
    returns a median under a mean's name, so the headline elicits a functional it cannot
    produce. `sec:ruler-functional`'s limitation **sharpened rather than softened** on the same
    point. `fig:ladder` regenerated on RMSSE with RMSSE MCS ink.
    *Untouched:* `tab:ladder` stays MASE -- the frozen six-origin committed gate (row 89).

93. **The alpha=0.25 check flips at Two River Taps, and is self-reported.** (`log/71` S7-S9)
    Checked because `p = 0.220` sits close to the secondary pre-registered level (both levels
    fixed at row 33). **At alpha=0.25 the Two River Taps set contracts to the three foundation
    arms and the served ETS is ELIMINATED** -- the only served model at any venue failing to
    survive both pre-registered levels.
    *Stated with the precision that matters:* the same rung IS retained at alpha=0.25 under the
    secondary absolute-error loss, so what removes it is the squared measure AT the stricter
    level, not the stricter level alone. That forecloses the reading that the incumbent is
    fragile across the board. Served model unchanged -- the rule is registered at the primary
    level, which retains it.
    *Three overclaims corrected in `sec:res-mcs`:* the `tab:mcs` caption, the "two readings
    follow" paragraph and the closing rule paragraph all asserted retention without naming a
    level. All three now name it and point at `sec:res-mcs-functional`.
    *The declined gap written up explicitly:* the 3.27-se pairwise contrast is reported as
    computed, large, and NOT acted on, with the governing rule named -- "a rule that binds only
    when it agrees with the pairwise contrast is not a rule". A finding declined is stronger
    evidence of method than one never mentioned.
    *The Two River Taps condition, verified not asserted:* last fold `test_end` 2026-05-08
    against `store_ceiling` 2026-07-07; the venue closed 8 May 2026 and is frozen, so no
    forecast is served, no band issued, and no operational decision sits downstream. **Cost of
    leaving a weaker model there is zero**, which makes the restraint inferential rather than a
    claim the gap is unimportant. Counterfactual for a trading venue written in and left to
    further work: revisit on OPERATIONAL grounds, since the set says the evidence does not
    license a switch and does not say a manager should be indifferent to one.
    **Structural gap flagged:** `chapters/conclusion.tex` is a 7-line stub with no Further Work
    section, so the counterfactual sits inline in `sec:res-mcs-functional` (the same convention
    as D-D2's further-work note in `sec:ruler-ellel`). It should move when the conclusion is
    written.

94. **Swept every chapter for unlevelled confidence-set claims; added the aggregate coherence
    statement.**
    *The sweep.* "Retained" without a level is the same defect class as the basis literal
    (`log/70`) and the `mcs_primary_mase` key name (`log/71` S2): a claim reading as
    unconditional while its condition lives elsewhere. Three found in `sec:res-mcs` alone (row
    93) suggested the phrasing was propagating, so all five chapter files were swept for
    `retained` / `retains` / `survives` / `in the set` with no alpha in the same sentence.
    **Seven genuine cases** fixed across `results.tex`, none in the other chapters:
    the pre-registered rule itself ("stays served if it is retained" -> "**at the primary
    level**", the canonical statement and the one that matters, since row 93 showed the
    incumbent fails at the secondary); the 273-origin five-of-nine claim; the occurrence-gate
    both-arms claim; the weather no-weather-arm claim; the Winkler G retention; the Beer Hall
    three-arms claim; and the whole-candidate-set claim. The audit script's remaining hits were
    verified as **false positives** -- a "90 per cent" spelling the pattern missed, and
    `$\alpha = 0.10$` split at its own decimal point by the sentence-splitter.
    *The aggregate.* Under the headline loss the served model is the argument-minimum at **no**
    venue. Each venue was handled correctly in isolation but the aggregate had no sentence, and
    a reader assembles it regardless -- unexplained it reads as three venues disagreeing with
    their own served models. Written into `sec:res-mcs-functional` as a **coherence property of
    the two-pass design**: the gate was taken at six origins under the absolute measure and is
    audited as that decision (`sec:res-ladder`, row 89), the headline is the squared measure at
    full fold count (`sec:ruler-functional`), so a set selected under one ruler was never chosen
    to minimise the other. The paragraph names what WOULD be incoherent -- concealing the gap
    between the passes and presenting the served set as though it had won the contest actually
    reported -- so the point reads as design rather than defence.

95. **Re-audited every conformance row against the live chapters, and rewrote the literature
    review off the result.** (`ledger/literature_conformance.md` S14)
    *Why re-audit.* S8 recorded what the six runs ESTABLISHED. That is a different question
    from what the chapters SAY, and only the second one is submitted. Each row was checked by
    reading the live Overleaf text rather than by trusting this ledger's own prior claim.
    *Verified closed in the text:* D-F1, D-F3, D-F4, D-F5, D-F6, D-D1, D-D2, D-D3, D-D4/V2,
    D-D5, V1, V3. Twelve rows, each with the section that carries it named.
    *Still open and NOT third-party blocked -- four, all writing, no runs:* **D-F8** (VUS-PR
    computed in `log/60` and present in no chapter; the detection headline is still the 0.996
    sustained-shift recall, with `sec:res-costsweep` supplying only the precision limb);
    **D-F7's writing half** (the 22-of-41-node unbiasedness failure from `log/62` appears
    nowhere, and neither chapter has a reconciliation section at all); **C11 and C12** (both
    deferred to a discussion, and `chapters/conclusion.tex` is still the unedited template
    stub); **D-U6** (the Beer Hall exchangeability violation is still unidentified -- analysis,
    never third-party blocked). D-U8 is scope, also not third-party.
    *Correctly blocked on a third party:* D-U1, D-U2, D-U3, D-U4, D-U5, D-U7, and D-D5's
    `TABPFN_TOKEN` residue.
    *Four trails removed from `literature_review.tex`.* (1) `sec:rw-synthesis` still listed
    "the headline accuracy figures are mean-absolute-scaled" as a limitation -- **false since
    row 92 and contradicted by the chapter's own `sec:rw-ruler` sixteen paragraphs earlier**.
    Replaced with the limitation that actually survives, the served model returning a median
    under a mean's name. (2) An edit-provenance comment naming this ledger and the V1/V3 rows,
    deleted; the prose already carries the attribution and a number trace it was not.
    (3) D-F1 was stated in its pre-`log/61` form, localising the tie failure to "a series of
    mostly zeros"; rewritten so the cause is **structural closure rather than sparsity**, which
    is what generalises and what `log/61` actually found. (4) A 528-character unwrapped line
    carrying the TabPFN patch, phrased as an attempt "that did not score"; rewrapped and
    narrowed to `log/68`'s three-part form.
    Also strengthened while open: the Chatfield paragraph now carries the **precondition** (the
    cost is an inventory-system cost needing a stock position) plus the second and better
    support (his own MAPE modification and GRMSE exclusion on zeros), so the methodology's
    declining of the cost objective is set up rather than looking like an oversight; and the
    observed-over-inferred regime argument is now explicitly **labelled as the chapter's own
    inference**, with a sentence saying it carries no guarantee across to the static bands.
    *Invariants held:* 90 citation keys in, 90 out, none added and none dropped, so no
    add-a-paper or drop-a-paper gate is triggered. Zero em dashes. No AI-writing flags survive
    the sweep. `sec:rw-rhythm`'s unresolved MinT precondition was left **deliberately** -- the
    R-Zero rule forbids the review reporting the D-F7 result, so it resolves when D-F7's
    writing half lands and not before.
    *Note:* `brain/drafts/literature_review.tex` was **stale** -- 67,389 bytes against
    Overleaf's 53,484, so the ledger's "byte-identical" line no longer held. The mirror is
    refreshed from the rewritten text.
    **NOT PUSHED.** Overleaf is a human gate.

96. **D-U6 extended: the drift has a cause, there is a second violation, and the remedy does
    not do what report 72 implied.** (`log/73`)
    *The cause.* Deflating each absolute residual by a trailing 28-day level of the venue's own
    takings, taken strictly before the target date, and re-running the identical drift statistic.
    Beer Hall: raw rho +0.086 -> **deflated -0.019, p 0.502**, over a window where the level rose
    702 -> 901 (trend rho +0.580). Two River Taps: level FELL 527 -> 358 as it wound down to
    closure, and its negative drift also ceases to be significant under deflation. **Ellel does
    not follow** -- flat level, strongest raw drift (+0.218), deflation barely moves it (+0.171,
    p 2.2e-09). The asymmetry is the strength: the two venues whose coverage departs are the two
    whose drift is a level effect, and the venue whose drift is not a level effect is the one
    whose coverage is fine.
    *A second violation, larger at the anchor venue.* The Mondrian partition groups by a
    day-of-week closure calendar, and **94 of 546 Beer Hall calendar-closed days actually traded
    (17.2%)**, mean |residual| 238.0 against 32.21 on genuinely closed days -- a factor of 7.4.
    Those are misses by construction, and they are why the committed artefact shows that venue's
    closure group covering 0.840 against 0.884 for its active group. Distinct from the drift:
    non-stationarity inside a correct group versus a group specified wrongly.
    *The remedy, tested.* Two River Taps 0.9631 -> **0.9089** at W=120 and mean width DROPS
    535 -> 469, better calibrated and sharper together. Beer Hall recovers only 0.007 of a 0.029
    shortfall and pays 7% width. **Ellel is made worse**, 0.9138 -> 0.9265, widening 18%.
    So the honest report is a NON-UNIFORM remedy that tracks the mechanism venue by venue, which
    is confirmation of the diagnosis and a refusal of the estate-wide fix. **`log/72` S5's
    "points at a windowed pool" is superseded**, and three of its statements are corrected in
    `log/73` S4 rather than quietly dropped.

97. **The two dangling cross-references resolved by writing the sections they named.**
    Both were content gaps rather than typos, which is why report 95 declined to guess.
    *`sec:exo`* (methodology, new): the seven exogenous features in three groups (weather,
    institutional calendar, events with per-venue anchor scoping), the discount-share feature
    **excluded from the forward path** because its value is not knowable at the origin, and the
    five weather arms N/O/H/F/M with the lead policy. States the general point the section
    exists for: scoring on recorded weather and serving on forecast weather measures a system
    that cannot be deployed. F and M drawn from ONE pinned global model so the contrast isolates
    lead policy, and the lead capped at 7 to equal the forecast horizon.
    *`sec:res-paired`* (results, new): pairing, the moving-block bootstrap, the block length.
    **The sensitivity sweep is not a null and my first draft said it was.** Verified against
    `eval/mcs_L1_results.json` before writing: replication count (1000 vs 5000) is immaterial
    everywhere, but block length moves every retained set (BH 3/5/4/4, Ellel 4/6/6/5, TRT
    3/4/4/3 across 2/7/14/21) and **at Two River Taps it moves the served decision** -- the
    incumbent is retained at 7 and 14 and ELIMINATED at 2 and 21. Written up with both
    consequences: the pre-registered 7 gives the LARGEST set at every venue, so it is the
    conservative choice and cannot be read as picked to eliminate a rival; and this is the
    **third** independent indication that Two River Taps' incumbent is the marginal one, after
    p=0.220 and the alpha=0.25 elimination (row 93). Re-selecting the block length after seeing
    which value retains the incumbent is named as the manoeuvre pre-registration prevents.
    *`sec:flip`* in methodology repointed to `sec:res-batch`. All four chapter files now have
    zero unresolved references.

98. **A trail left by my own correction, found by sweeping for it rather than by being told.**
    `log/73` S3 superseded the untested claim that a windowed pool is the indicated remedy, and
    `results.tex` `sec:res-drift-cause` reports the tested result correctly. **`conclusion.tex`
    did not.** Its Further Work item still read "the indicated remedy is a windowed or
    recency-weighted pool rather than an expanding one" -- the pre-test framing, written in the
    earlier push and never revisited when the test came back unfavourable. A results chapter
    saying a remedy is not an estate-wide fix while the conclusion recommends it estate-wide is
    the same class of self-contradiction as the mean-absolute-scaled limitation caught in
    report 95, and it was introduced by the correction itself.
    Fixed in Overleaf `8898ccb`: the item now reports what the window actually buys per venue
    (TRT 0.963 to 0.909 and narrower, a quarter of the Beer Hall shortfall at 7 per cent width,
    Ellel moved away from nominal) and asks for a per-venue length rule fixed before the
    coverage it is tuned against is seen.
    Same pass added the **seventh** Further Work item, which `log/73` S5 named and the
    conclusion had no entry for: deriving the Mondrian groups from observed trading rather than
    the weekday. Listed first of the seven because it is the cheapest and the best evidenced
    (17.2 per cent of the Beer Hall's calendar-closed days traded; residual factor 7.4).
    Verified after: zero dangling references across all four chapter files, zero em dashes in
    the added prose, braces balanced.

99. **Ellel's drift located, and the last unblocked row closed into a blocked one.**
    `log/73` S5 named this as out of reach. `log/74` tests four candidates, three of which
    had to be able to fail, and the level of trade is **rejected on the stronger denominator
    as well as the weaker** -- a trailing mean over Ellel's TRADED days only, which answers
    the objection that `log/73`'s all-active denominator was diluted by a group four-fifths
    composed of zeros. Traded-day level rises at rho +0.799 and deflation moves the drift
    only from +0.186 to +0.157.
    The answer is composition. Drift on days Ellel traded: rho +0.094, p=0.129, n=263 --
    **not significant**. Drift on days the calendar called open and it did not trade: rho
    +0.367, p=1.9e-34, n=1037, and those are 79.8 per cent of the group. On every one of
    those rows y=0 against a non-negative forecast, so |y - yhat| = yhat as an **identity**
    (verified in code, not asserted). What drifts is what the point model predicts for a day
    the venue does not open.
    The residue is therefore the missing occurrence signal, which is **D-U3** -- already
    declared, already blocked on Elliot, already a limitation. The last row that was open
    and not third-party blocked closes into one that was.
    Unification worth keeping: the Beer Hall's and Ellel's partition defects are the SAME
    defect in opposite directions (94/546 calendar-closed days traded; 1037/1300
    calendar-open days did not). The Mondrian-from-observed-trading Further Work item
    repairs both, which promotes it to first of the seven.
    Guard against overselling, written into the chapter: Ellel has the strongest raw drift
    and the coverage closest to nominal, because the drift sits in the subgroup whose
    residuals average 95.2 against 516.3 on traded days. Real, significant, **operationally
    inert** -- and the reason `log/73`'s windowed pool made Ellel worse.
    Overleaf `4cba26f`. `sec:res-drift-cause` and `sec:conclusion-limitations` updated;
    `log/73` S5's "unexplained" statement marked superseded rather than deleted.
    Also created `brain/ledger/BLOCKED_third_party.md` as the single retrieval point for the
    seven blocked rows, pointed at from the top of `PRJ93_RULES.md`, carrying per-row
    unblock instructions, the two hard constraints (TabPFN needs local weights because the
    data must not leave the machine; the two Further Work items are served-artefact changes
    needing their own gates), and a falsifiable prediction for D-U3 to be checked against
    when the diary arrives.
