# A14b · Weather/calendar signal diagnostic (diagnostic only)

Does the A14 L1 null hide a real category-level signal, or is weather genuinely redundant-with-season here? Four tests; **nothing is adopted** (live ladder unchanged). Serving basis: `leadmatched`.

## Test A — L2 (+ draught L3) weather ablation
| Series | n (active days) | baseline MASE | +weather MASE | Δ | signal? |
|---|---|---|---|---|---|
| L2:Beer | 265 | 1.008 | 0.975 | +3.3% | no |
| L2:Spirits | 248 | 0.773 | 0.867 | -12.1% | no |
| L2:Wine | 254 | 0.809 | 0.897 | -11.0% | no |
| L3:Cider - BH | 236 | 0.679 | 0.714 | -5.2% | no |
| L3:Lager - BH | 247 | 1.129 | 1.310 | -16.0% | no |

## Test B — physiology-matched features (L1)
Baseline MASE 0.844. `exo_temp_anomaly` is fragile on ~1 summer of climatology (FLAG-WD1); weight the `beer_garden_day` threshold more.

| Feature form | MASE | coverage |
|---|---|---|
| raw weather | 0.849 | 83.3% |
| beer_garden_day | 0.848 | 88.1% |
| temp_anomaly | 0.888 | 88.1% |
| garden+anomaly | 0.883 | 90.5% |

## Test C — calendar on transition-aware folds
Folds centred on school/uni term↔vacation boundaries where the flag actually varies (15 usable of 15 boundaries in span). **Fold provenance matters (FLAG-WD3):** a flat result *here* is real evidence the calendar is uninformative; a flat result on the operational folds (A14) was not.

- baseline MASE 0.903 → +calendar 0.933 (-3.3%) → signal: **False**

## Test D — residual-on-weather regression (decisive, model-independent)
OLS of the day-of-week-median-stripped residual on weather, with AR terms partialled out. Incremental R² ≈ 0 ⇒ weather is redundant-with-season here.

| Series | n | R² (AR only) | R² (AR+weather) | incremental R² | sig. weather (p<.05) |
|---|---|---|---|---|---|
| L1 | 348 | 0.009 | 0.034 | +0.025 | exo_temp_c |
| L3:Cider - BH | 348 | 0.033 | 0.057 | +0.024 | exo_temp_c |
| L3:Lager - BH | 349 | 0.006 | 0.026 | +0.020 | exo_temp_c |

## Verdict
- **Test A (aggregation):** a **MASE hint** in L2:Beer (+3.3%) (the draught-containing series) but it fails the coverage guard — consistent with a real-but-weak effect, not a clean forecast win. Non-draught categories are worse (weather is draught-specific, washed out at L1).
- **Test B (feature form):** feature form is not the blocker — still no lift.
- **Test C (folds):** calendar hurts/flat even where the flag varies → genuinely uninformative on this data.
- **Test D (redundancy):** incremental R² of weather over AR/season is **> 0 and significant** in L1, L3:Cider - BH, L3:Lager - BH (temperature) — weather is **not** purely redundant-with-season; it carries a small real signal.

**Overall:** a **weak but statistically significant** temperature signal exists (Test D, ~2% incremental R², concentrated in draught) that the GBM does **not** convert into a forecast improvement (Test A: only a coverage-failing MASE hint) and that is calendar-independent (Test C flat). So the A14 null is **not** simple redundancy — it is a real-but-too-weak-to-forecast effect on this ~1-year single-venue sample. Logged as a CANDIDATE for a covariate-aware model on more data; **nothing adopted** (the live ladder is unchanged).

See FLAG-WD1..WD4.