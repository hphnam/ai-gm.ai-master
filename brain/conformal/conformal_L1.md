# A5 · Conformal band — coverage report (Beer Hall L1)

Selected forecaster: **rung2_ets**. Validation: online rolling-origin split conformal (EnbPI-style), coverage pooled across 172 held-out points.

| Variant | Level | Coverage | Width | Winkler | Pinball | Within ±3pp |
|---|---|---|---|---|---|---|
| plain | 80% | 81.4% | 675 | 1431 | 72 | True |
| mondrian | 80% | 78.5% | 661 | 1255 | 63 | True |
| plain | 90% | 89.5% | 1315 | 1920 | 48 | True |
| mondrian | 90% | 90.7% | 1012 | 1436 | 36 | True |

**Deliverable:** the Mondrian band (group-conditional on active vs structural-zero day) is persisted to DuckDB (`bands`/`forecasts`, model `conformal_rung2_ets`) and is the input to Objective 2 — *a deviation is an observation outside this band*.

Gate (±3.0pp at 80% and 90% on the Mondrian band): **PASS**.