# A5 · Conformal band — coverage report (Ellel Village Hall L1)

Selected forecaster: **rung1_robust_dow**. Validation: online rolling-origin split conformal (EnbPI-style), coverage pooled across 153 held-out points.

| Variant | Level | Coverage | Width | Winkler | Pinball | Within ±3pp |
|---|---|---|---|---|---|---|
| plain | 80% | 85.0% | 293 | 1126 | 56 | False |
| mondrian | 80% | 87.6% | 173 | 957 | 48 | False |
| plain | 90% | 91.5% | 739 | 2000 | 50 | True |
| mondrian | 90% | 92.8% | 377 | 1505 | 38 | True |

**Deliverable:** the Mondrian band (group-conditional on active vs structural-zero day) is persisted to DuckDB (`bands`/`forecasts`, model `conformal_rung1_robust_dow`) and is the input to Objective 2 — *a deviation is an observation outside this band*.

**Note:** this venue misses the ±3pp band on the *conservative* (over-coverage) side — the band is wider than nominal, not narrower. Over-coverage is split conformal's safe failure mode and is expected with the smaller calibration set of a closed/sparse venue; the band is still valid (coverage ≥ nominal). The Beer Hall (the Objective-1 deliverable) meets the strict two-sided gate.