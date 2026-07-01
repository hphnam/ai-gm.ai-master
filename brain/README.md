# Proactive Brain (Track A)

PRJ93 Phase-2 forecasting & signals engine. Standalone Python — **no PostgreSQL
required**. Runs entirely off the supplied CSVs and persists its own time-series
memory to a local **DuckDB + Parquet** store (the methodology's design
contribution: the system supplies the memory the architecture lacks).

Every module prints an explicit `PASS`/`FAIL` and writes a checkable artefact.

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
| POST | `/refresh?venue=&force=&refit=` | operator/cron T2 refresh (+ conditional T3) — off the model surface |

Every serving envelope also carries a `freshness` block (`source`, `is_live`,
`stale`, `staleness_days`), so no answer is returned without stating its currency.

This service is what Track B (`apps/api/.../proactive-brain`) calls over HTTP.
```
BRAIN_BASE_URL=http://127.0.0.1:8088
```

> Bind the service to localhost only. `/refresh` mutates the store and triggers
> compute; it has no auth and relies on the localhost bind as its trust boundary.
> Do not set `BRAIN_HOST=0.0.0.0` without adding auth in front.

## Live ingest / freshness (three-tier model)

Inert by default — the brain warehouses from the CSVs. Two env vars flip it on
once Ryan provisions access (the other four knobs are code constants in `config.py`):

```bash
LIVE_INGEST=1                 # master gate (default 0 = inert, CSV only)
INGEST_SOURCE=neon            # csv (default) | neon | square
python -m ingest.refresh      # nightly T2 refresh (+ conditional T3); no-op on csv
```

T1 = live facts (Square, cached ~10 min, never warehoused); T2 = append closed
days to the store (`refresh()`); T3 = ladder re-fit, only on a weekly boundary or a
confirmed change-point (a transaction never triggers a re-fit). See
`PRJ93_Live_Ingest_Report.md`.
