# A5 · Conformal band — coverage report (The Beer Hall L1)

Selected forecaster: **rung2_ets**. Validation: online rolling-origin split conformal (EnbPI-style), coverage pooled across 209 held-out points.

| Variant | Level | Coverage | Width | Winkler | Pinball | Within ±3pp |
|---|---|---|---|---|---|---|
| plain | 80% | 78.0% | 672 | 1687 | 84 | True |
| mondrian | 80% | 75.1% | 660 | 1538 | 77 | False |
| plain | 90% | 88.5% | 1315 | 2332 | 58 | True |
| mondrian | 90% | 87.6% | 1018 | 1950 | 49 | True |

**Where the guarantee lapses.** Split conformal needs at least `level/(1-level)` calibration points before the requested level is even attainable; below that the correct band is infinite and `conformal_quantile` clamps to the largest observed residual instead. The clamp keeps the band usable but it carries no coverage guarantee, and the group-conditional bands are where a sparse group can hit it, so the count is reported rather than left silent:

| Level | Min calibration n | Group bands issued | Of which clamped |
|---|---|---|---|
| 80% | 4 | 60 | 0 |
| 90% | 9 | 60 | 0 |

**Deliverable:** the Mondrian band (group-conditional on active vs structural-zero day) is persisted to DuckDB (`bands`/`forecasts`, model `conformal_rung2_ets`) and is the input to Objective 2 — *a deviation is an observation outside this band*.

Gate (±3.0pp at 80% and 90% on the Mondrian band): **FAIL**.