# A5 · Conformal band — coverage report (Ellel Village Hall L1)

Selected forecaster: **rung2_ets**. Validation: online rolling-origin split conformal (EnbPI-style), coverage pooled across 196 held-out points.

| Variant | Level | Coverage | Width | Winkler | Pinball | Within ±3pp |
|---|---|---|---|---|---|---|
| plain | 80% | 80.1% | 247 | 1193 | 60 | True |
| mondrian | 80% | 82.1% | 247 | 990 | 50 | True |
| plain | 90% | 93.9% | 1040 | 1856 | 46 | False |
| mondrian | 90% | 92.3% | 498 | 1354 | 34 | True |

**Where the guarantee lapses.** Split conformal needs at least `level/(1-level)` calibration points before the requested level is even attainable; below that the correct band is infinite and `conformal_quantile` clamps to the largest observed residual instead. The clamp keeps the band usable but it carries no coverage guarantee, and the group-conditional bands are where a sparse group can hit it, so the count is reported rather than left silent:

| Level | Min calibration n | Group bands issued | Of which clamped |
|---|---|---|---|
| 80% | 4 | 56 | 0 |
| 90% | 9 | 56 | 0 |

**Deliverable:** the Mondrian band (group-conditional on active vs structural-zero day) is persisted to DuckDB (`bands`/`forecasts`, model `conformal_rung2_ets`) and is the input to Objective 2 — *a deviation is an observation outside this band*.

## Runtime identity
- environment: `.venv-forecast` · Python 3.12.13 · Darwin arm64
- compute device: mps
- libraries: numpy 2.5.1, pandas 3.0.3, scikit-learn 1.9.0, statsmodels 0.14.6, duckdb 1.5.4, torch 2.12.1, chronos-forecasting 2.3.1
- store ceiling: 2026-07-07