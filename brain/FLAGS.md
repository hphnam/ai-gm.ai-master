# FLAGS — standing flags, open confirmations, and data caveats

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

## Methodology results worth noting

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
- **FLAG-FE3 (shared grid cell).** Beer Hall and Ellel share `cell="lancaster"`
  (one Open-Meteo pull serves both).
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
- **FLAG-FE-TRTLOC.** TRT stated to be in Preston but the supplied coordinate
  (53.8751, −2.7599) sits ~13 km north (Galgate/Forton). TRT is closed, so this
  affects historical weather/event attribution only — confirm before any live use.

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
