# The brain — forecasting & signals engine

## What this is

The brain is a standalone Python service that forecasts each venue's daily sales
and raises operational signals from the result: unusual trading days, sustained
regime shifts, low stock, and gaps in the staff SOPs. The main product (the
NestJS API under `apps/api`, referred to as "Track B" in older notes) calls it
over HTTP; the brain itself is "Track A."

It runs on its own today: no PostgreSQL dependency, reading the supplied Square
CSV exports and keeping its own time-series memory in a local **DuckDB + Parquet**
store next to the code.

Be precise about what is the contribution here, because the two get conflated and
it matters for anyone integrating this. The contribution is that **the system has
historical memory at all** — the rest of the architecture is stateless and
request-scoped, so nothing else can say what Tuesday usually looks like. The
DuckDB store is the *current implementation* of that memory, chosen so the engine
runs standalone. It is not itself the point, and it is replaceable: moving the
memory into Postgres, or having it handed in per request, leaves the contribution
intact. See [What is served, and what it needs](#what-is-served-and-what-it-needs)
before changing where the memory lives — some of it is not sales history.

Every step prints an explicit `PASS`/`FAIL` and writes a file you can check.

> **New to the short codes?** `A6`, `Rung 3`, `L1`, `T2`, `WP12`, `FLAG-CP1` and
> friends are all decoded in [`../GLOSSARY.md`](../GLOSSARY.md). The one-line
> version: `A<n>` = a pipeline step (below), `Rung <n>` = a model tier,
> `L1/L2/L3` = venue/category/item, `T1–T4` = how live a number is.

## How it fits together

The pipeline is a chain of steps (`A0` through `A14`), each gating the next: ingest
the CSVs, build a local warehouse, engineer features, fit a ladder of forecasting
models, wrap the winner in a calibrated uncertainty band, then run the signal
detectors on top. The last step is an HTTP service (`A10`) that serves forecasts
and signals to the main API. Full step-by-step is under
[Pipeline](#pipeline-each-step-gates-the-next); the name and owning module of
every `A<n>` step is in the glossary.

## What is served, and what it needs

This section exists because the answer is distributed across ~106 files and is
easy to get wrong by reading any one of them. If you are moving the store,
defining a data contract, or deciding what to hand the engine, start here.

**Served model per venue** (gate-selected on 6-fold rolling MASE; a rung is
adopted only if it beats *both* seasonal-naïve and robust-DOW):

| Venue | Served model | MASE |
|---|---|---|
| Beer Hall | `rung4_chronos2_exo` | 0.745 |
| Two River Taps | `rung2_ets` | 0.597 (dormant via the liveness gate) |
| Ellel | `rung1_robust_dow` | 0.572 |

**Daily sales alone will not reproduce these forecasts.** The served Beer Hall
model consumes `CHRONOS2_EXO_COLS` (`models/foundation.py`) — 15 known-future
columns: 4 calendar, 1 event, 6 World Cup, 4 weather. Three consequences:

- **Weather is a forecast input, not attribution.** It is warehoused in three
  bases (`exog_weather_observed` / `_hindcast` / `_leadmatched`) and served on
  the hindcast basis. The `signals/feature_ablation.md` verdict ("no exogenous
  feature adopted") binds the **Rung-3 GBM only** and does not govern the served
  model — see the scope note at the top of that report.
- **Some inputs are intraday.** `ingest.world_cup.derive_trading_hours` takes a
  1st/99th-percentile envelope of transaction *time-of-day* per (venue, DOW) and
  persists it to `venue_trading_hours`. That envelope is what makes the World Cup
  columns code-derived by kickoff overlap rather than hardcoded. A daily rollup
  (`venue × date × category × item`) discards the timestamps it needs.
- **Some inputs arrive over the network.** `ingest/exog_weather.py` calls
  Open-Meteo; the A8 SOP-gap signal calls Voyage. Neither is tenant data, but
  neither is free either.

**State held that is not sales history.** Retiring the store means these have to
live somewhere, or the behaviour they gate is lost:

| Table | Gates |
|---|---|
| `briefing_runs` | the new/continuing/resolved novelty chain — the false-alarm control. Without it every standing item re-fires daily. |
| `change_points` | closure dormancy, so a closed venue stops re-alarming |
| `forecasts` / `bands` | conformal calibration reads residuals from prior blocks |
| `served_forecast` | which model is live per series |
| `data_watermark` | per-venue ingest progress; drives the refit cadence |
| `ladder_selection` | per-fold MASE audit trail for adoption decisions |
| `venue_trading_hours`, `spike_days`, `local_events`, `exog_weather_*` | the exogenous frame above |

## Setup

```bash
cd brain
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt              # core: A0–A6, A8–A10
pip install -r requirements-optional.txt     # optional: Prophet, GBM, Voyage, foundation
```

The three source CSVs are read from `brain/data/` (symlinked to the repo root)
or the repo root directly.

> Python 3.14 note: `xgboost`/`lightgbm` need an OpenMP runtime (`brew install
> libomp`); without it the Rung-3 GBM uses scikit-learn's native
> `HistGradientBoostingRegressor` instead, so the ladder still runs in full.
> Voyage falls back to a keyless TF-IDF embedder when `VOYAGE_API_KEY` is unset.

## Pipeline (each step gates the next)

```bash
python -m ingest.normalise              # A0  UTF-16 TSV -> tidy long table + manifest
python -m store.warehouse --build       # A1  DuckDB L1/L2/L3 views + helpers
python -m eval.harness                  # A2  splits, MASE/coverage/Winkler, rolling-origin, LOVO
python -m features.build_features       # A3  leak-free L1 feature table
python -m models.ladder --all-venues    # A4  ladder rungs 0–4 for all 3 venues  (canonical; milestone gate = Beer Hall)
python -m conformal.wrap --all-venues   # A5  conformal band + per-venue standby band  (Objective 1 deliverable)
python -m hierarchy.reconcile           # A6  MinT reconciliation + keg consumption proxy (Beer Hall)
python -m transfer.lovo                 # A7  leave-one-venue-out onboarding transfer
python -m signals.chatlog_kb_gap        # A8  failure-rate + ranked SOP gaps
python -m signals.checklist_discipline  # A9  weighted missed-step detector
python -m ingest.stock_normalise        # A11 bar-stock panel + master + agg (Beer Hall)
python -m signals.stock_inventory       # A12 days-of-cover reorder signal (reads A6)
python -m ingest.exog_weather           # A14 weather (3 bases, Open-Meteo; needs network)
python -m ingest.local_events           # A14 curated local-event anchors
python -m ingest.spike_days             # A14 retrospective discount-spike flag
python -m signals.feature_ablation      # A14 enrichment ablation + weather train/serve study
uvicorn service.app:app --port 8088     # A10 http://127.0.0.1:8088/docs
python -m eval.agent_eval               # agent-eval: injection oracle + human anchor + LLM-judge (offline)
pytest                                  # all module tests, printed PASS/FAIL
```

> **Canonical run:** A4/A5 use `--all-venues` so `/forecast` is served for all
> three venues (a single-venue run leaves TRT/Ellel 404-ing). `scripts/run_all_venues.sh`
> wraps the full pipeline so it can't silently revert to Beer-Hall-only.

### Multi-venue

The ladder and conformal wrapper run for all three forecast venues; each writes a
per-venue report (`ladder_results_L1_<venue>.md`, `conformal_L1_<venue>.md`):

- **The Beer Hall** is the milestone gate — the strict ±3pp two-sided conformal
  gate and the rolling-origin ladder gate are judged on it.
- **Two River Taps** is evaluated on its **pre-closure active span** (the closure
  is a known structural break, not a forecast target); a **+28-day standby band**
  is persisted forward so the band is queryable on reopening. It is detected as
  closed against the dataset-global max date (`store.active_span.is_closed`).
- **Ellel** is **capped at Rung 1** (robust DOW × season) per the Data Audit
  Report §8.3 — it is booking/event-driven (`EVENT_ONLY_VENUES`) so a trailing
  booking lull is sparsity, not closure.

A6 hierarchy reconciliation is intentionally Beer-Hall-only (see its report).

## What each step proves (Phase-2 gates)

| Step | Gate met |
|---|---|
| A0/A1 | counts reconcile (47,644 / 33,993 / 10,489 / 203); BH L1 = £202k ± rounding |
| A2 | runs on a dummy forecast, prints all metrics, leakage guard fires |
| A3 | series reconciles; leak-free; exogenous join seam present-but-empty |
| A4 | a rung beats seasonal-naïve **and** robust DOW on rolling-origin MASE |
| A5 | conformal coverage within ±3pp at 80% & 90% (pooled), sharpness reported |
| A6 | Σ(item) = category = venue exactly; keg consumption proxy computed |
| A7 | shape-transfer beats per-venue-naïve at cold-start; foundation dropped (Tan) |
| A8 | 18.9% failure baseline reproduced; ≥1 ranked above-baseline SOP gap |
| A9 | weighted miss detector; conditionals never raise; Sunday-only #31 correct |
| A11 | 13 bar sheets → 10 snapshots; 238 products (129 core); date conflict flagged |
| A12 | days-of-cover for mapped core kegs; unmapped lines NULL (not guessed) |
| A14 | exo seam populated (calendar/weather/events); ablation gates adoption — honest null on BH + weather train/serve study |
| A14b | diagnostic-only: is the A14 null hidden by aggregation/eval, or genuinely redundant-with-season? L2/L3 ablation + residual regression; adopts nothing |
| A13 | sustained regime-shift detection (CUSUM + persistence + BOCPD) on the conformal residual stream; TRT closure recovered as ground truth; attribution against the A14 seam |
| briefing | capstone synthesis: composes the four signals into one ranked, de-duplicated, attributed daily feed with new/continuing/resolved status; honesty gates (template checklist excluded, sparse baseline down-weighted, closed venue quiet); no new detection maths |
| agent-eval | briefing USEFULNESS (not accuracy): a synthetic-injection oracle (detection P/R/F1, ranking NDCG/Spearman, attribution top-1 + honest-null, latency), a human-labelled anchor (`eval_labels`), and an LLM-judge calibrated to it (kappa, pre-registered threshold); Ask-F1 cost sweep + two named probes; leakage-guarded, small-N with CIs; read-only, offline (`PRJ93_Agent_Eval_Report.md`) |
| agent-eval (scaled) | `--scaled`: a venue×kind×magnitude×onset×fold×direction injection grid (N=644) → the **sensitivity curve** (catch rate vs event size, near-threshold operating point) with Wilson CIs, a latency-vs-magnitude distribution, and ranking over many multi-event days; plus a stratified day sampler + two-pass labelling instrument (`eval.labels --sample/--label`) and judge calibration over labelled days (`PRJ93_Scaled_Eval_Report.md`) |
| A10 | every endpoint returns JSON; `/docs` served; warm latency < 500ms |

## Store layout

- `store/brain.duckdb` — line items, L1/L2/L3 views, `forecasts` + `bands` tables.
- `store/*.parquet` — tidy line items, BH daily features.
- `store/manifest.json`, `store/conformal_coverage.png` — artefacts.
- `FLAGS.md` — standing flags and open confirmations (do not silently coerce).

## Service endpoints (A10)

| Method | Path | Source |
|---|---|---|
| GET | `/health` | store status |
| GET | `/forecast?venue=&layer=&level=&date_from=&date_to=&key=&freshness=` | A5/A6 bands (`freshness=live` → capped top-up) |
| POST | `/deviation/check` | per-day band check on the residual stream (point primitive) |
| POST | `/deviation/scan` | last N trading days, classified (briefing feed) |
| POST | `/deviation/changepoint` | A13 sustained regime shifts + attribution |
| GET | `/sop-gaps` | A8 |
| POST | `/checklist/discipline` | A9 |
| GET | `/stock/cover?venue=` | A12 (Beer Hall; empty envelope for other venues) |
| GET | `/briefing?venue=&as_of=&layer=&freshness=` | capstone: ranked, de-duplicated, attributed daily feed |
| GET | `/freshness?venue=` | per-venue currency (source, staleness, last re-fit) |

> **There is no `POST /refresh` route.** It was removed under M1 — unauthenticated,
> unbounded and able to force a T3 re-fit; `service/app.py` says so at the foot of the
> file. A full refresh runs only via `python -m ingest.refresh`. The table above listed
> it until 2026-08-19; the surface is **twelve** endpoints, ten here and two in
> `service/compute.py`.

Every serving envelope also carries a `freshness` block (`source`, `is_live`,
`stale`, `staleness_days`), so no answer is returned without stating its currency.

The main API calls this service over HTTP from
`apps/api/src/modules/proactive-brain/brain.client.ts`.
```
BRAIN_BASE_URL=http://127.0.0.1:8088
```

> Bind the service to localhost only. `GET /forecast?freshness=live` reaches a bounded
> write on the store (`service/app.py:17`), and none of these ten routes carries auth —
> the localhost bind IS the trust boundary. Do not set `BRAIN_HOST=0.0.0.0` without
> putting auth in front. The route that made this note urgent, `POST /refresh`, is gone
> (M1); the throttled live top-up is what remains.

## Live ingest / freshness (three-tier model)

Inert by default — the brain warehouses from the CSVs. Two env vars flip it on
once Ryan provisions access (the other four knobs are code constants in `config.py`):

```bash
LIVE_INGEST=1                 # master gate (default 0 = inert, CSV only)
INGEST_SOURCE=neon            # csv (default) | neon | square
python -m ingest.refresh      # nightly T2 refresh (+ conditional T3); no-op on csv
```

**Nightly job (WP12):** the Beer Hall served model is a Rung-4 Chronos-2 entrant,
so the nightly refresh needs the chronos backend. Run it from the forecast venv,
not the API's runtime venv (which serves `/forecast` from persisted DuckDB tables
only and needs no chronos dependency):

```bash
nightly: .venv-forecast/bin/python -m ingest.refresh
```

See `requirements-forecast.txt` for the venv build (Python 3.12, uv-provisioned,
gitignored). A chronos-less environment (the runtime venv, or any Python 3.13+
venv) never re-fits or re-promotes a Rung-4 served model as a side effect; see
the environment guards in `ingest/refresh.py` (`_should_refit`,
`_promote_and_serve`).

T1 = live facts (Square, cached ~10 min, never warehoused); T2 = append closed
days to the store (`refresh()`); T3 = ladder re-fit, only on a weekly boundary or a
confirmed change-point (a transaction never triggers a re-fit). See
`PRJ93_Live_Ingest_Report.md`.

After T2/T3, `refresh()` **promotes**: it regenerates the served forecast (L1
`forecasts`/`bands` via the conformal wrapper, plus the Beer Hall keg via the MinT
reconciler) and records `served_forecast(venue, layer, model, data_as_of,
promoted_ts)`, so `/forecast` and `/stock/cover` move with the data instead of serving
a stale band. "Beat the rung" is detect (`ladder_selection`) plus promote
(`served_forecast`). Promotion fires only on new data, an adoption, or a forced refresh,
never per transaction. `/freshness` and `brain_data_freshness` report `served_model` and
`served_as_of`. See `PRJ93_Promote_And_Serve_Report.md`.
