# FLAGS — standing flags, open confirmations, and data caveats

> New to the codes here (`A6`, `FLAG-CP1`, `Rung 3`, `L1`)? See
> [`../GLOSSARY.md`](../GLOSSARY.md) for what each one means.

Flagged, not silently coerced (per the build contract). None of these block the
sales critical path (A0–A6); two are open confirmations off the critical path.

## ✅ Environment regression (RESOLVED — 22 Jun 2026)

Two raw source files briefly **disappeared from the repo-root working directory**
mid-session (OneDrive offload/desync; not deleted by any code change). The owner
has since **restored both** — duplicates had been left inside `brain/` and the
root copies are back in place:

- `items-2024-01-01-2026-06-01.csv` (the 77 MB Square export) ✅ present
- `Elliot's AI-GM Questions - Query result.csv` (the chat log) ✅ present

`opening_and_closing_checklist.md` had also vanished and was **restored verbatim**
during remediation (small static template). With all three files present the
full suite is green (**73 passed** after Patch v2; A0 ingest + A8 chat KB-gap no
longer error). No code change was needed to recover the files.

## Patch v2 correction (22 Jun 2026)

- **TRT standby band was aspirational until Patch-1.** Earlier reports claimed a
  "+28-day standby band persisted forward" for the closed venue, but
  `is_closed("two_river_taps")` was returning `False` (it compared the venue's
  last active day against its *own* reindexed calendar max, which are equal), so
  `_persist_standby_forward` never fired and no forward band existed. Patch-1
  fixed `is_closed` to judge closure against the **dataset-global** max date and
  to treat `EVENT_ONLY_VENUES` (Ellel) as never-closed (a booking lull is not a
  shutdown). TRT now persists 56 standby band rows (28 days × 2 levels) past
  2026-05-08 and its reports carry the "currently closed" banner; guard tests in
  `tests/test_a5_conformal.py` lock this in.
- **Trimming rationale corrected.** `trim_to_active` removes **post-closure
  zero-padding** added by `fill_calendar`, not a real "declining tail the models
  would win on by predicting zero" — TRT's pre-closure block is a genuine
  decline, not zeros. Wording fixed in `store/active_span.py` and the build report.

## Open confirmations (off critical path)

1. **TRT VAT basis** — working assumption: Two River Taps `Net Sales` is
   VAT-inclusive, deflated by `1/1.2` into `net_sales_exvat` before any
   cross-venue/group use (`config.VAT_INCLUSIVE_VENUES`). **Owner to confirm.**
   Per-venue work is unaffected.
2. **Checklist completion capture (Ryan)** — A9 runs in **template-only mode**
   against `signals.checklist_discipline.synthetic_log()`. Ryan is building a new
   mobile-integrated capture system (not an export of the old
   `ChecklistStepCompletion` table); swap `synthetic_log()` for the real rows
   once that system starts accumulating data — the detector itself is unchanged
   either way.

## Standing flags (design decisions, not blockers)

3. **No research schema / time-series store** — by design, the brain persists
   its own history to `store/brain.duckdb` (the methodology's stated design
   contribution). Phase 2 runs off the CSV exports.
4. **Real stock data** — ✅ **RESOLVED** (stock-integration spec). 13 Beer Hall
   monthly bar-stock sheets → `stock_panel`/master/agg (A11) joined to the A6
   forecast for a days-of-cover reorder signal (A12). The A6 consumption proxy is
   *extended*, not replaced. See the "Stock integration" section below.

## Data caveats

5. **BH L1 reconciliation** — ingested Beer Hall net ex-VAT = **£202,087.69**
   vs the audit's **£202,491** (Δ £403, 0.2%, within the 1% tolerance). Likely a
   minor difference in row-level filtering (voids/refunds) between this ingest
   and the audit; does not affect modelling.
6. **Chat-log** — **web** channel (not WhatsApp as the brief assumed), ~6 weeks
   / **25 active days**, single-owner (Elliot), no venue column. Treated as
   estate-wide; venue tagged from content. Failure rate **18.9%** reproduced.

## Environment / dependency notes

7. **xgboost / lightgbm** fail to load on this machine (macOS OpenMP runtime
   `libomp` absent). The Rung-3 GBM uses scikit-learn's native
   `HistGradientBoostingRegressor` instead — the ladder runs in full.
8. **Voyage** — `VOYAGE_API_KEY` unset here, so A8 uses the keyless **TF-IDF**
   fallback embedder. Semantic embeddings (Voyage) sharpen the SOP-gap clusters.
9. **Foundation models** (TimesFM / Chronos / Moirai) not installed — Rung 4 is
   **dropped per the Tan et al. ablation** (an unevaluable/unjustified backbone
   is not adopted). The global GBM remains the pooling baseline.

## Methodology results

- A4: over a static 8-week horizon the **robust DOW baseline is strongest**
  (MASE 0.704); in the operational 7-day rolling-origin regime, ETS/Prophet and
  the GBM beat both baselines — the milestone is met in the regime the brief
  actually needs.
- A7: shape-transfer beats per-venue-naïve **at cold-start (≤2 weeks)** and
  hands over to own-history as it accrues — the partial-pooling story.
- A6: item-level (L3) conformal bands under-cover (60.5% / 77.6%) — expected for
  sparse item series; the L1 band (A5) is the validated deliverable.

## Stock integration (A11/A12 — spec FLAG register §11)

- **FLAG-1 (date conflict).** `Stock Sheet 01.03.2026.xlsx` internal title reads
  `01.02.2026` but is a distinct count (footer £6,157 vs Feb £4,773) and the
  filename says March. Dated **2026-03-01** (filename-primary); surfaced in the
  A11 run output. *Owner: Ryan/James to confirm it is the March count.*
- **FLAG-2 (levels not flows).** Monthly snapshots are on-hand *levels*;
  deliveries are unobserved, so consumption comes from the A6 sales forecast,
  never from stock differences.
- **FLAG-3 (lead/safety days).** `STOCK_LEAD_TIME_DAYS=3`, `STOCK_SAFETY_DAYS=2`
  are working assumptions. *Owner: James/Ryan to confirm supplier lead times.*
- **FLAG-4 (pints per keg).** 30 L→52.8, 50 L→88, unknown→88. Refines A6's flat 88.
- **FLAG-5 (Beer Hall only).** No TRT/Ellel bar-stock sheets supplied; stock scope
  = A6 scope. Stated, not silently omitted.
- **FLAG-6 (stale footers).** Hand-typed `TOTAL CASH` footers lag edits on **3**
  sheets — **Feb/Apr/May** (the spec assumed 2; Feb confirmed a stale footer, not
  a double-count). Line-item sums are authoritative; footer reconciliation is a
  diagnostic (7/10 within 1%), not a hard gate.
- **FLAG-7 (cost inflation confounded).** Median keg-cost rise is mix-confounded;
  reported as indicative only.
- **FLAG-8 (brewery scope).** The 5 Lune Brew Co. stocktakes are cleaned to a
  standalone `brewery_inventory` table with **no join** to the venue brain; the
  vertical-integration link (brewery finished kegs → estate draught demand) is
  logged as future work.
- **A6→stock mapping depth.** Only **1 of 14** core keg lines (`Caravan of Love`)
  maps to a forecast A6 node at the default top-k, because A6 buckets most branded
  items into OTHER and generic sales items ("Lager - BH") span several keg brands.
  Unmapped lines carry NULL demand by design (no guessed attribution). Raising A6
  `--top-k` would resolve more lines; not done to keep A6's default behaviour.

## Feature enrichment (A14 — spec FLAG register §10)

- **FLAG-FE1 (weather basis).** Adopted training basis = `WEATHER_TRAIN_BASIS`
  (`hindcast`), but weather is **not adopted as a model feature** (FLAG-FE10). The
  train/serve study (signals/feature_ablation.md) shows the **lead-matched**
  forecast basis predicts best under forecast serving (MASE 0.816), the ERA5
  **observed/oracle basis is the worst** (0.969) — the train/serve shift is real.
- **FLAG-FE2 (weather horizon).** Live forecast ≤16 d; weather applies to the
  reorder horizon, not the full 8-week eval.
- **FLAG-FE3 (shared grid cell), RESOLVED (G12.9e, corrected G12.10a).** Beer
  Hall and Ellel previously shared `cell="lancaster"`. Each venue now has its
  own precise Open-Meteo cell keyed by venue name (`beer_hall`, `ellel`,
  `two_river_taps`). BH and Ellel are still only ~0.6 km apart, but the extra
  pull is cheap and cached, and per-venue precision was explicitly requested
  now that Ellel forecasts on its own rungs. Historical hindcast weather for
  all three venues therefore shifted on the per-venue basis; `build_features`/
  ladder reports were re-run so the committed numbers match. (G12.10a corrected
  the TRT cell name from the interim `preston` placeholder to `two_river_taps`
  and re-keyed it to the confirmed venue coordinate.)
- **FLAG-FE4 (calendar refresh).** Uni/school tables are static lookups in
  `ingest/calendar_sources.py`; refresh each academic year. Coverage confirmed
  from 2024-09; the data window (2025-06→2026-05) is fully covered.
- **FLAG-FE5 (PredictHQ).** Not pursued — no `PREDICTHQ_TOKEN`; the curated
  `local_events` table ships by default. Token via env only, never committed.
- **FLAG-FE6/7/8 (operational out-of-scope).** Staffing (no labour data),
  shrinkage (levels-not-flows, = stock FLAG-2), keg tap-date shelf-life (no flows).
- **FLAG-FE9 (spike flag retrospective).** `is_spike_day` (≥0.95 discount share)
  is in its own `spike_days` table, **never joined to the feature table** — it is
  not a forward regressor. Forward hook: the empty `promo_calendar` table.
- **FLAG-FE10 (no exo feature adopted — the honest result).** The A14 ablation
  rejected **every** exogenous feature for the BH GBM: against the autoregressive
  baseline (MASE 0.816) calendar flags hurt slightly (school −2%, uni −6%), weather
  overfits (−20%), events are null. Cause: the 6-week operational test folds sit
  inside one term, so calendar flags are near-constant there and add only an
  overfitting split. The seam is **populated for attribution + the weather study**,
  not adopted. Re-run the ablation on a longer horizon spanning term boundaries to
  reconsider. Curated event anchors are also limited — the two biggest recurring
  Lancaster festivals (Music Festival, Highest Point) **did not run in-window**.
- **FLAG-FE-TRTLOC, RESOLVED (G12.10a).** TRT is keyed to its own venue
  coordinate (53.8751, −2.7599), confirmed by Nam. The cell is named
  `two_river_taps` (uniform with `beer_hall` and `ellel`, one cell per venue
  name), not the earlier `preston` placeholder. The coordinate sits near
  Galgate/Forton, north of Preston, and that is the venue's real location, not
  an error. The G12.9 wording that called this "north of Preston, wrong" was
  itself mistaken; the point was right and the label was the only issue.
  `EVENT_SCOPE["two_river_taps"] = ("preston",)` is a separate mapping (events,
  not the weather cell); its naming is cosmetic while TRT is closed and is left
  as-is. The Lancaster/Preston `EVENT_SCOPE` isolation (BH/Ellel never see
  Preston anchors and vice versa) is unchanged.

## Weather/calendar diagnostic (A14b — diagnostic only, adopts nothing)

- **FLAG-WD1 (anomaly fragility).** `exo_temp_anomaly` rests on a ~1-summer
  day-of-year climatology; treat it as indicative and weight the
  `exo_beer_garden_day` threshold result more.
- **FLAG-WD2 (L2 power).** Per-category (and draught-L3) series are lower-volume
  than L1; a lone series' apparent lift must be corroborated by the Test-D
  redundancy regression before it counts.
- **FLAG-WD3 (fold provenance).** Calendar verdicts state which fold set produced
  them — a flat result on *transition-aware* folds (flag varies) is real evidence
  of no signal; a flat result on the A14 *operational* folds (flag near-constant)
  is not.
- **FLAG-WD4 (diagnostic, non-adopting).** A14b changes no forecast and flips
  nothing into `_ADOPTED_EXO`; any positive finding is a candidate for a separate,
  gated decision (and a covariate-aware model, not a univariate foundation model).

## Change-point detection (A13)

- **FLAG-CP1 (threshold calibration).** `CP_CUSUM_H` is the conservative default;
  on the BH stable span the standardised-residual noise sits below the slack
  `CP_CUSUM_K`, so empirical ARL₀ **exceeds the simulation horizon at every h**
  (≫ target 75) — essentially no false alarms, at the cost of detection delay.
  The binding constraint is delay, not false-alarm rate (see change_point_eval.md).
  Recalibrate if the baseline model or venue set changes.
- **FLAG-CP2 (Ellel).** Persistence-only (sparse, booking-driven) — CUSUM is
  skipped for `EVENT_ONLY_VENUES`; currently yields no change points. Stated, not
  silently omitted.
- **FLAG-CP3 (recalibration is a flag).** A13 sets `recalibration_needed=TRUE` and
  surfaces a degraded-confidence note; automatic re-fit on the post-change window
  is future work (T4).
- **FLAG-CP4 (attribution is correlational).** Coincident signals are leads, not
  causes ("coincides with", never "caused by"); weather is weighted to draught
  layers per A14b; never asserted as causal.
- **FLAG-CP5 (scale source).** `z` uses the level-`CP_LEVEL` conformal half-band-
  width (same yardstick as `/deviation/check`), recomputed expanding-window.
- **FLAG-CP6 (spillover / closure).** For closed venues the post-closure zero run
  is appended so the closure is a detectable abrupt drop; `is_closed` then makes
  monitoring dormant. TRT's closure is the validated ground-truth break (delay
  reported). A BH shift coincident with the TRT closure window is documented
  spillover, surfaced via attribution — not a false alarm.

## Point deviation (the per-day primitive)

- **FLAG-PD1 (Ellel sparsity).** Point deviation fires only on genuine trading
  days — the shared residual stream excludes structural-zero days, so a
  booking-driven venue's empty days never raise a false deviation. Ellel
  therefore deviates only on real booking days.
- **FLAG-PD2 (band-multiple severity).** Point severity uses band multiples
  (`DEV_BAND_K`, `DEV_SEVERE_K`), deliberately distinct from change-point's
  persistence-aware `_severity` (a single point has no run length).
- **FLAG-PD3 (attribution is correlational).** Inherits the change-point caveats:
  coincident ≠ causal; A14b draught weighting; the seasonal-baseline limitation
  (the "cold snap" wording compares to the annual mean).
- **FLAG-PD4 (API migration).** `POST /deviation/check` was migrated from the old
  band-breach detector (`observations` → `breaches`) to the residual-stream
  `check_point`, so point-deviation and change-point share one scale. The
  caller-supplied-`observations` path was dropped (unused by any caller; reading
  stored actuals via `as_of`/latest covers the live need). Confirm with the owner.

## Proactive briefing (the synthesis capstone)

- **FLAG-BR1 (checklist not live — G5a).** `CHECKLIST_LIVE=False` gates checklist
  and SOP signals out of the ranked feed until Ryan's mobile completion export
  exists (the standing open-confirmation above). While False the feed says so in
  its `notes`; flipping to True is the single swap-in at `briefing._live_completion`.
  No synthetic miss is ever ranked as a real alert.
- **FLAG-BR2 (stock is a snapshot, not a series).** `stock_cover` holds a single
  latest row (levels-not-flows, per the stock flags). So "new reorder since the last
  run" is knowable ONLY through the `briefing_runs` diff, not a daily stock history.
- **FLAG-BR3 (`/deviation/scan` upstream).** The briefing's deviation feed is the
  migrated `/deviation/scan` / residual stream — FLAG-PD4 is upstream of it. The
  call is stable so the briefing does not block on ratification, but the dependency
  is recorded.
- **FLAG-BR4 (sparse-baseline down-weight — G5b).** A single-day deviation on an
  event-only venue (Ellel) gets `baseline_trust=0.5` and a small-sample caveat — a
  narrow band inflates z there (the Ellel z=+6.22 reading). Fires on genuinely
  isolated bookings; clustered booking-weekends are treated as a pattern.

## Downstream rerun matrix (G12.9g)

**See [`log/18_DOWNSTREAM.md`](log/18_DOWNSTREAM.md) for the full "run live or rerun" answer.**
Headline: deviation, change-point, briefing, and reasoning all read the
DOW-median residual stream, not the served L1 forecast, so they run live with
no rerun after G12.9's promotion changes. Stock cover reads a separate
MinT-DOW-median model and is unaffected (and out of scope for Ellel). Only the
served `/forecast` band itself needed regenerating, which promotion already
does.

## WP12 follow-up (G12.9f, known gaps, not fixed now)

- **FLAG-G12.9-1 (Ellel-event dormant gap).** `is_ellel_event` (`build_features.
  _ellel_event_dates`) is derived from Ellel's own OBSERVED L1 revenue, not a
  forward bookings feed, so it returns 0 for genuinely future dates. Harmless
  today: every path that calls the Chronos-2-exo entrant only ever forecasts
  already-observed held-out dates for an open venue (ladder backtest, `wrap.
  evaluate`'s rolling-origin persistence), where the flag is fully populated.
  The gap would only bite a genuinely future, unobserved date. In this
  codebase that only arises via `conformal.wrap._persist_standby_forward`,
  which fires solely for a CLOSED venue, and Ellel is never flagged closed
  (`EVENT_ONLY_VENUES`, see above). The real fix is a forward Ellel bookings
  feed (the standing James/Ryan dependency, same as FLAG-5/FLAG-1 stock items).
  Related, but distinct: the SELF-leak decision in G12.9d (`exo_cols_for_venue`
  excludes `is_ellel_event` when forecasting Ellel itself, because on Ellel's
  own frame the flag is a near-perfect proxy for Ellel's own sparse target).
  That fix is already shipped; this dormant-gap flag is about forecasting
  *other* venues (Beer Hall) from Ellel's event flag, which still has no
  forward-looking source.
- **FLAG-G12.9-2 (TRT `rung3_global_gbm` serving bug).** `conformal.wrap.
  _predictor` resolves model names against `models.ladder.PREDICTORS`, which
  registers the per-venue GBM as `rung3_gbm` but never registers the pooled
  `rung3_global_gbm` variant (`global_gbm_predict`): it is added only inside
  `_predict_all`'s per-call `out` list, not the static registry. If a rolling
  backtest ever selects `rung3_global_gbm` as the MASE winner for a venue and
  something then tries to serve/force-refit it via `wrap.evaluate`, `_predictor`
  raises (`unknown model 'rung3_global_gbm'`) instead of resolving a predictor.
  Observed on TRT. Pre-existing, unrelated to Chronos/G12.9, and TRT is closed
  (out of scope for this pass). Recorded here per the spec's instruction to log
  it, not fix it now; fix if TRT ever reopens or `rung3_global_gbm` is ever
  adopted for a served venue. The fix is registering the pooled GBM under its
  own name in `PREDICTORS` (or teaching `_predictor` to special-case it).

## Live ingest / freshness / conditional retrain (three-tier model)

- **FLAG-LI1 (inert default).** `LIVE_INGEST=False` / `INGEST_SOURCE=csv` ship on:
  the brain warehouses from the CSVs, `live_facts` returns an inert envelope, and
  `refresh()` is a genuine no-op (the CSV adapter's latest date is the warehouse
  ceiling). Going live is a two-env-var swap once access is provisioned.
- **FLAG-LI2 (Neon system-of-record — Ryan-gated).** `NeonAdapter` + DDL sketch ship
  inert; the intended primary T2 history source. Standing it up is Ryan's task
  (`INGEST_SOURCE=neon`, `LIVE_INGEST=1`). See FLAG-INGEST-NEON for the G12.10c
  wiring and the committed-seed ceiling.
- **FLAG-INGEST-NEON (G12.10c, adapter wired, provisioning-gated).** The committed
  CSV seed ends **2026-05-31** (`items-2024-01-01-2026-06-01.csv` is UTF-16
  tab-delimited; its filename overstates its span, with no June rows). June-onward
  (and early-July) transactions were pulled via the Square MCP and live in Ryan's
  **Neon** system of record, NOT the CSV. The CSV is bootstrap-only; **manual
  injection is retired**: the brain refreshes exclusively through its configured
  `SourceAdapter`, never by hand-dropping a newer CSV into `data/`.
  `NeonAdapter.latest_available_date`/`fetch_transactions(since)` are now
  implemented against `brain_txn` over a read-only connection whose `psycopg` (v3)
  driver is imported inside the method (brain stays DB-free at import); DSN via
  `BRAIN_NEON_DSN`. Going live is then a pure config swap (`INGEST_SOURCE=neon`,
  `LIVE_INGEST=1`, `BRAIN_NEON_DSN=…`) and `python -m ingest.refresh` runs the
  existing Phase 1–4 machinery (append → leak-free feature rebuild → conditional
  T3 → promote). NOT yet integration-tested against live Neon: this build has no
  Neon DSN or `brain_txn` schema access (Ryan owns them), and per the spec **no
  June rows were simulated to pass a test**. Remaining step is Ryan provisioning
  the DSN + schema. Interaction with the World Cup (FLAG-WC): the group stage
  (11–27 Jun 2026) is after the committed-seed ceiling, so on the CSV-seeded store
  the `wc_*` fixtures are a forward-looking covariate with no measurable sales
  effect yet; once Neon brings June-onward rows in, the tournament window becomes
  observed and the effect becomes estimable.
- **FLAG-LI3 (Square brain access — Ryan-gated).** T1 live facts + the `SquareAdapter`
  fallback need Square access provisioned to the BRAIN env, separate from Track-B's
  credential store. Until then T1 is inert and the agent uses its own Square tools.
  `live_facts._fetch_metric` is the single swap-in point.
- **FLAG-LI4 (net profit / labour are Square-sourced).** The brain owns rhythm, not
  P&L. Live COGS, labour, and net profit come from the existing Track-B Square tools;
  the brain supplies "is that normal, what's the forecast, and why". No P&L is
  re-warehoused.
- **FLAG-LI5 (deferred).** Stock is mock (live stock needs Square inventory via the
  adapter). The intraday-expectation curve for "is tonight-so-far unusual" is a
  bounded next step — end-of-day snapshots of Square's hourly profile per closed day
  (still closed-day history, never a live moving figure), not built here.
- **FLAG-LI6 (localhost trust boundary).** `/refresh` mutates the store and has no
  auth; it relies on the localhost bind. Keep `BRAIN_HOST` off `0.0.0.0` in deploy.
- **FLAG-LI7 (promote-and-serve, v2.1).** `refresh()` now regenerates the SERVED
  forecast, not just the signal layer: after new closed days land or a T3 adopts a rung,
  `_promote_and_serve` re-persists L1 `forecasts`/`bands` (via `conformal.wrap.evaluate`)
  and the Beer Hall keg (via `hierarchy.reconcile.reconcile`), then upserts
  `served_forecast(venue, layer, model, data_as_of, promoted_ts)`. "Beat the rung" is now
  detect (`ladder_selection`) **plus** promote (`served_forecast`). Fires only on new
  data, an adoption, or an explicit force — never per transaction. `/freshness` and
  `brain_data_freshness` report `served_model`/`served_as_of`.

## Production persistence (G12.10f)

- **FLAG-STORE-ENV (RESOLVED, G12.10f).** `DUCKDB_PATH`/`STORE_DIR` were hard-coded
  to `brain/store/`, unlike `LIVE_INGEST`/`INGEST_SOURCE`/`BRAIN_HOST` which read
  env vars. In production the brain runs as a service and its DuckDB is a live
  database (correctly gitignored) that must persist across redeploys. `STORE_DIR`
  now reads a `BRAIN_STORE_DIR` env override (default unchanged: the in-repo
  `brain/store`), so the store can sit on a mounted persistent volume separate from
  the code checkout, preventing a redeploy from orphaning or wiping it. One small
  `config.py` change; nothing else moves.
- **FLAG-STORE-SOR (document only, Ryan decision).** Two stores now coexist: the
  brain's local/served DuckDB (its derived analytical memory: `line_items`,
  `forecasts`, `bands`, `served_forecast`, `data_watermark`, `venue_trading_hours`)
  and Ryan's Neon transaction system of record (where the Square MCP pull lands
  June-onward rows). The clean topology is **Neon as the transaction SOR and the
  brain DuckDB as the derived store seeded from Neon via `NeonAdapter`** (lightweight,
  preferred), NOT a heavier "brain maintains its own warehoused Neon copy" plan.
  This is a Ryan conversation, named here so it is a recorded decision, not an
  accident. No code beyond this note (the `NeonAdapter` read path is FLAG-INGEST-NEON).

## Device + event-aware refresh (G12.15)

- **FLAG-DEVICE-MPS (G12.15a).** Chronos loads resolve their torch device via
  `_resolve_device()` in `models/foundation.py`: `BRAIN_TORCH_DEVICE` overrides,
  else Apple-GPU `mps` when available, else `cpu` (never `cuda` on this Mac).
  `PYTORCH_ENABLE_MPS_FALLBACK=1` is set before the torch import so unsupported ops
  fall back to CPU. MPS-vs-CPU parity verified (max abs diff GBP 0.0002, served
  numbers unchanged beyond float noise). Measured caveat: for the small single-series
  forecasts here MPS is SLOWER than CPU (transfer/fixup overhead ~3s vs ~0.6s); MPS
  pays off for larger batched work, not these. The device is recorded in
  `chronos2_runtime_info()`.
- **FLAG-EVENT-REFRESH (G12.15d).** The T3 auto cadence tightens from
  `RETRAIN_CADENCE_DAYS` (7) to `EVENT_REFRESH_CADENCE_DAYS` (2) inside a flagged
  high-volatility window: a World Cup match in trading hours, or a curated local
  event, within `EVENT_WINDOW_LOOKAHEAD_DAYS` (3) ahead (`_in_event_window` in
  `ingest/refresh.py`, reading the SAME schedule the forecast uses). Calendar-triggered,
  NOT hard-coded to the World Cup: any future flagged event fires it identically. The
  `_should_refit` reason string states the override. Owner-controllable, default ON;
  disable with `BRAIN_EVENT_REFRESH_DISABLED=1`. Cost guarantee preserved: it still
  fires only on real new closed days and a re-fit is inference-only zero-shot, so a
  tighter cadence adds fits within the event, never per-request work.
