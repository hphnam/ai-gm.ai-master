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
| GET | `/forecast?venue=&layer=&level=&date_from=&date_to=&key=` | A5/A6 bands |
| POST | `/deviation/check` | §6 breach rule |
| GET | `/sop-gaps` | A8 |
| POST | `/checklist/discipline` | A9 |

This service is what Track B (`apps/api/.../proactive-brain`) calls over HTTP.
```
BRAIN_BASE_URL=http://127.0.0.1:8088
```
