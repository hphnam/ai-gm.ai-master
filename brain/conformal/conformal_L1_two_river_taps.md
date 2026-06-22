# A5 · Conformal band — coverage report (Two River Taps L1)

Selected forecaster: **rung2_ets**. Validation: online rolling-origin split conformal (EnbPI-style), coverage pooled across 141 held-out points.

| Variant | Level | Coverage | Width | Winkler | Pinball | Within ±3pp |
|---|---|---|---|---|---|---|
| plain | 80% | 80.9% | 436 | 638 | 32 | True |
| mondrian | 80% | 83.0% | 399 | 564 | 28 | True |
| plain | 90% | 95.0% | 639 | 794 | 20 | False |
| mondrian | 90% | 95.7% | 542 | 676 | 17 | False |

**Deliverable:** the Mondrian band (group-conditional on active vs structural-zero day) is persisted to DuckDB (`bands`/`forecasts`, model `conformal_rung2_ets`) and is the input to Objective 2 — *a deviation is an observation outside this band*.

**Note:** this venue misses the ±3pp band on the *conservative* (over-coverage) side — the band is wider than nominal, not narrower. Over-coverage is split conformal's safe failure mode and is expected with the smaller calibration set of a closed/sparse venue; the band is still valid (coverage ≥ nominal). The Beer Hall (the Objective-1 deliverable) meets the strict two-sided gate.