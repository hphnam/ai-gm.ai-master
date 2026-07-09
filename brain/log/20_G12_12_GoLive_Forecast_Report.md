# PRJ93 G12.12 Go-live Forecast Report

Go-live forecasting attempt (L1 served model, June horizon, L2/L3). Branch:
`brain-construction`. Intended run venv: `.venv-forecast` (Python 3.12, Chronos
present). Implements `PRJ93_Spec_G12_12_GoLive.md`. Forecast-only scope: no
deviation, change-point, briefing, or reasoning in this session.

## Outcome: clean STOP at G12.12a (June is not in the readable store, Neon is not provisioned)

The spec's first gate is a hard precondition: June must actually be in the DuckDB
the run reads, or the run STOPs and reports the blocker without fabricating or
hand-loading. That precondition is not met here, and the June data cannot be
ingested through the proper (Neon) path in this environment, so per the spec's own
stop condition the go-live June forecast is blocked. Nothing was fabricated, no
model was promoted, no forecast was persisted. This is the spec-sanctioned outcome,
not a failure of the pipeline: `A12.12a` passes as "a clean STOP with the blocker
named; no manual/hand-loaded June rows."

Gates G12.12b (serve L1 forward), G12.12c (measured A-vs-B L2/L3 split), G12.12d
(extend L2/L3 to all venues), and G12.12e (persist + report) were NOT run, because
the execution order gates every one of them behind G12.12a and the whole purpose
(a June-inclusive go-live forecast) is blocked upstream.

## G12.12a: watermark check (verified, read from the branch)

Store actually read: `brain/store/brain.duckdb` (the default; `BRAIN_STORE_DIR`
is unset, and this is the only `.duckdb` on disk in the repo). Read-only query of
`l1_daily`:

| Venue | MIN(date) | MAX(date) | Trading days |
|---|---|---|---|
| beer_hall | 2025-06-04 | **2026-05-31** | 270 |
| ellel | 2025-06-08 | 2026-05-22 | 64 |
| two_river_taps | 2025-06-12 | 2026-05-08 | 280 |

Beer Hall's ceiling is **2026-05-31**. It does not reach into June. The tournament
window (11 Jun to 19 Jul 2026) and every June exogenous factor sit entirely beyond
the ceiling, so the `wc_*` features are all-zero and June weather/calendar exist
only as un-observed known-future covariates, exactly the state the earlier probe
kept reporting (decision log Section C, rows 7 and 9).

Seed provenance (why there is no June to read): `store/manifest.json` records the
bootstrap source as `data/items-2024-01-01-2026-06-01.csv` with `date_span.max` =
**2026-05-31** and all 92329 rows ingested (0 dropped). The `2026-06-01` in the
filename is the export's exclusive upper bound, not a June row; the ingested
`l1_daily` ceiling matches the manifest exactly. The committed store is the May
seed, unchanged.

## Why Neon ingestion could not advance the watermark here

The spec's escape hatch is: if June is only in Neon, ingest it leak-free through the
`NeonAdapter` (G12.10c) via `INGEST_SOURCE=neon LIVE_INGEST=1 python -m
ingest.refresh`, provided `BRAIN_NEON_DSN` and the `brain_txn` schema are available
to the run. In this environment they are not:

- `BRAIN_NEON_DSN` is unset (`os.environ.get` returns `None`); there is no `.env`
  or dotenv loader in `config.py` or `ingest/` that would supply it.
- `LIVE_INGEST` and `INGEST_SOURCE` are unset.
- `psycopg` (the v3 driver the `NeonAdapter` imports inside `_connect`) is not
  installed in `.venv-forecast`, so even with a DSN the adapter could not open a
  connection.

This is precisely the branch the spec anticipates: "If not available, STOP and
report that June ingestion is blocked on Ryan's Neon provisioning; do not fabricate
or hand-load." June-onward transactions live in Ryan's Neon behind the (correctly)
inert adapter (FLAG-INGEST-NEON); provisioning that adapter with a real DSN, the
`brain_txn` schema, and the driver is Ryan's step and the sole unblocker for this
spec.

## Verified starting state and one incidental finding

Confirming the spec's V-table facts against the store, and noting a state
divergence found while doing so:

- **Current L1 served model (on disk):** `served_forecast` holds a single row,
  `beer_hall / L1 / rung2_ets`, `data_as_of` 2026-05-31, `promoted_ts` 2026-07-08.
  This does NOT match the spec's V1/V6 expectation that Beer Hall serves
  `rung4_chronos2_exo` (the 6-fold gate winner at rolling MASE 0.745). The on-disk
  store looks to have been rebuilt/reset since WP12 without a full Chronos ladder +
  promote pass: the latest `ladder_selection` row for Beer Hall records `new_rung=2`
  (ETS) with null MASE/`n_folds`. TRT and Ellel have no `served_forecast` row at all
  (consistent with V5).
- **Current persisted forecasts (backtest-shaped, not a go-live forward serve):**
  `forecasts` holds `conformal_rung*` rows at L1 (target dates up to 2026-06-05 for
  ETS, the TEST_WEEKS block projecting just past the ceiling, not a true June
  horizon) and `mint_dowmedian` at L2 (464 rows) and L3 (1740 rows) up to
  2026-06-01. These are the existing reconciliation-backtest outputs (V2, V3), the
  incoherent double-forecast of the venue total the spec set out to fix. They were
  left untouched.

Re-serving Beer Hall on `rung4_chronos2_exo` is the first action of G12.12b, so this
divergence is exactly what the blocked gate would correct; it is recorded here for
the human who provisions Neon, not acted on now (acting on it would mean serving a
model whose forward horizon has no June exo, defeating the spec's purpose).

The gate-selected L1 winners themselves (V1) are unchanged and stand from the
committed ladder reports: Beer Hall `rung4_chronos2_exo` 0.745, Two River Taps
`rung2_ets` 0.597, Ellel `rung1_robust_dow` 0.572 (rolling MASE, 6 folds, data to
2026-05-31, hence provisional until a June backtest exists).

## What unblocks this spec (exact procedure, for the human with Neon access)

1. Provision the forecast venv/run with Ryan's Neon: export a valid
   `BRAIN_NEON_DSN`, confirm the `brain_txn` schema is reachable, and
   `pip install "psycopg[binary]"` (v3) into `.venv-forecast`.
2. Advance the watermark leak-free: `INGEST_SOURCE=neon LIVE_INGEST=1
   .venv-forecast/bin/python -m ingest.refresh`. Re-run the watermark check and
   confirm Beer Hall's `MAX(date)` now reaches into June (ideally early July).
3. Re-run this spec from G12.12a. With June observed, `wc_*` will carry real signal
   (assert 2026-06-17 England vs Croatia in-hours for Beer Hall), June weather is
   available on the forecast basis, and gates b through e proceed as written.

Until step 1 is done by Ryan, there is no leak-free path to a June forecast, and the
spec forbids the alternatives (manual CSV, hand-loading, fabricating June rows).

## Deviations from the spec

1. **Stopped at G12.12a; gates b to e not executed.** This is not a deviation from
   the spec's intent but the exercise of its explicit stop condition ("June is not
   in the readable store and Neon is not provisioned ... say so, do not fabricate").
   Recorded here for completeness so the unrun gates are unambiguous.
2. **Report filename follows the `brain/log/` numbering convention, not the spec's
   literal name.** The spec names the report `PRJ93_G12_12_GoLive_Forecast_Report.md`.
   Per the G12.11 log-consolidation convention (decision log Section C row 10), the
   `PRJ93_` prefix is dropped and a two-digit implementation-order prefix added, so
   this file is `20_G12_12_GoLive_Forecast_Report.md` and is indexed as such in
   `brain/log/README.md`.
3. **Incidental state finding, not requested by the spec:** the on-disk Beer Hall
   served model is `rung2_ets`, not the `rung4_chronos2_exo` the spec's V-table
   assumes. Documented above and left unchanged (correcting it is G12.12b, blocked).

## Acceptance mapping

| Check | Status |
|---|---|
| A12.12a | **PASS as a clean STOP.** Store ceiling checked and reported (BH 2026-05-31); June absent; Neon not provisioned (no DSN, no `brain_txn` access, no driver); blocker named (Ryan's Neon provisioning); no manual/hand-loaded June rows. |
| A12.12b | Not reached (blocked by A12.12a). No model promoted, no forward horizon produced. |
| A12.12c | Not reached. No A-vs-B run; no reconciled top served or drifted. |
| A12.12d | Not reached. L2/L3 not built or extended. |
| A12.12e | Not reached as a full go-live persist. This report is the required write-up of the blocked attempt with the store ceiling, the blocker, the verified state, and the unblock procedure; forecast-only scope stated; nothing persisted. |

## Test suite state

No code was changed in this session (the gate stopped before any implementation
work), so both suites are unchanged from the G12.10 close (decision log Section C
row 7): `.venv-eval` 258 passed; `.venv` 250 passed, 8 chronos-gated skips. No new
tests were added because there was no new behaviour to cover; the gates that would
add tests (b to e) did not run.

## Bottom line

The go-live June forecast is blocked on one external dependency: Ryan provisioning
the Neon `brain_txn` source (DSN + schema + driver) so `NeonAdapter` can advance the
store watermark into June leak-free. Every downstream design decision in this spec
(pure-L1 served top, measured A-vs-B L2/L3 split, all-venue L2/L3 with sparsity
guards, June exo) is ready to execute the moment June is in the readable store. This
session honoured the stop condition: verified before asserting, reported the
blocker, fabricated nothing.
