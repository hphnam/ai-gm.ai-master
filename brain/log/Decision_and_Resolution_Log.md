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
    raw. Power caveat: 3+2 dates, directional. **(c)** Cadence sweep (cold/7/3/daily,
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