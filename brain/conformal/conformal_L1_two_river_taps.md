# A5 · Conformal band — coverage report (Two River Taps L1)

Selected forecaster: **rung2_ets**. Validation: online rolling-origin split conformal (EnbPI-style), coverage pooled across 141 held-out points.

> **Two River Taps is currently closed** (last active 2026-05-08). Coverage is validated on the pre-closure active span; a +28-day **standby band** is persisted past the last active day so the band is queryable on reopening. It reflects pre-closure rhythm and is **not** validated against any post-reopening data.

| Variant | Level | Coverage | Width | Winkler | Pinball | Within ±3pp |
|---|---|---|---|---|---|---|
| plain | 80% | 80.9% | 436 | 638 | 32 | True |
| mondrian | 80% | 83.0% | 399 | 564 | 28 | True |
| plain | 90% | 95.0% | 639 | 794 | 20 | False |
| mondrian | 90% | 95.7% | 542 | 676 | 17 | False |

**Where the guarantee lapses.** Split conformal needs at least `level/(1-level)` calibration points before the requested level is even attainable; below that the correct band is infinite and `conformal_quantile` clamps to the largest observed residual instead. The clamp keeps the band usable but it carries no coverage guarantee, and the group-conditional bands are where a sparse group can hit it, so the count is reported rather than left silent:

| Level | Min calibration n | Group bands issued | Of which clamped |
|---|---|---|---|
| 80% | 4 | 42 | 0 |
| 90% | 9 | 42 | 0 |

**Deliverable:** the Mondrian band (group-conditional on active vs structural-zero day) is persisted to DuckDB (`bands`/`forecasts`, model `conformal_rung2_ets`) and is the input to Objective 2 — *a deviation is an observation outside this band*.

**Note:** this venue misses the ±3pp band on the *conservative* (over-coverage) side — the band is wider than nominal, not narrower. Over-coverage is split conformal's safe failure mode and is expected with the smaller calibration set of a closed/sparse venue; the band is still valid (coverage ≥ nominal). The Beer Hall (the Objective-1 deliverable) meets the strict two-sided gate.

## Runtime identity
- environment: `.venv-forecast` · Python 3.12.13 · Darwin arm64
- compute device: mps
- libraries: numpy 2.5.1, pandas 3.0.3, scikit-learn 1.9.0, statsmodels 0.14.6, duckdb 1.5.4, torch 2.12.1, chronos-forecasting 2.3.1
- store ceiling: 2026-07-07