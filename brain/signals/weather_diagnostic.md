# A14b · Weather/calendar signal diagnostic (diagnostic only)

Does the A14 L1 null hide a real category-level signal, or is weather genuinely redundant-with-season here? Four tests; **nothing is adopted** (live ladder unchanged). Serving basis: `leadmatched`.

## Test A — L2 (+ draught L3) weather ablation
| Series | n (active days) | baseline MASE | +weather MASE | Δ | signal? |
|---|---|---|---|---|---|
| L2:Beer | 293 | 0.927 | 0.964 | -4.1% | no |
| L2:Spirits | 276 | 0.883 | 0.778 | +11.9% | **yes** |
| L2:Wine | 281 | 0.889 | 0.945 | -6.3% | no |
| L3:Cider - BH | 263 | 0.716 | 0.676 | +5.7% | **yes** |
| L3:Lager - BH | 249 | 1.279 | 1.227 | +4.0% | **yes** |

## Test B — physiology-matched features (L1)
Baseline MASE 0.977. `exo_temp_anomaly` is fragile on ~1 summer of climatology (FLAG-WD1); weight the `beer_garden_day` threshold more.

| Feature form | MASE | coverage |
|---|---|---|
| raw weather | 0.903 | 87.2% |
| beer_garden_day | 0.981 | 88.3% |
| temp_anomaly | 0.954 | 88.3% |
| garden+anomaly | 0.950 | 88.3% |

## Test C — calendar on transition-aware folds
Folds centred on school/uni term↔vacation boundaries where the flag actually varies (16 usable of 16 boundaries in span). **Fold provenance matters (FLAG-WD3):** a flat result *here* is real evidence the calendar is uninformative; a flat result on the operational folds (A14) was not.

- baseline MASE 0.963 → +calendar 0.987 (-2.6%) → signal: **False**

## Test D — residual-on-weather regression (decisive, model-independent)
OLS of the day-of-week-median-stripped residual on weather, with AR terms partialled out. Incremental R² ≈ 0 ⇒ weather is redundant-with-season here.

| Series | n | R² (AR only) | R² (AR+weather) | incremental R² | sig. weather (p<.05) |
|---|---|---|---|---|---|
| L1 | 385 | 0.012 | 0.054 | +0.042 | exo_temp_c |
| L3:Cider - BH | 385 | 0.033 | 0.056 | +0.023 | exo_temp_c |
| L3:Lager - BH | 386 | 0.028 | 0.035 | +0.007 | — |

## Verdict
- **Test A (aggregation):** weather clears the bar (MASE + coverage) in ['L2:Spirits', 'L3:Cider - BH', 'L3:Lager - BH'] — a localised, forecast-useful signal hidden at L1 by aggregation.
- **Test B (feature form):** a physiology-matched form beats baseline.
- **Test C (folds):** calendar hurts/flat even where the flag varies → genuinely uninformative on this data.
- **Test D (redundancy):** incremental R² of weather over AR/season is **> 0 and significant** in L1, L3:Cider - BH (temperature) — weather is **not** purely redundant-with-season; it carries a small real signal.

**Overall:** a real, forecast-useful signal was localised AND is statistically significant — logged as a strong CANDIDATE for a separate gated adoption decision (covariate-aware model, e.g. TFT/TabPFN-TS, not a univariate foundation model). Nothing adopted in this phase.

See FLAG-WD1..WD4.