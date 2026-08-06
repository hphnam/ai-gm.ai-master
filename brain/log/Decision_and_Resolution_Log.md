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
