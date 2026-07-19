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
