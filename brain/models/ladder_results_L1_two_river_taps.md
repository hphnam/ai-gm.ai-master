# A4 · L1 ladder results (Two River Taps)

> **Two River Taps is currently closed** (last active day 2026-05-08). This evaluation uses the pre-closure active span only — the closure is modelled as a known structural break, not a forecast target. The persisted band reflects pre-closure rhythm and has **not** been validated against any post-reopening data.

## Operational regime — rolling-origin, 7-day horizon (the milestone gate)
Expanding-window backtest, 6 held-out folds. MASE per fold vs in-sample seasonal-naive (m=7), averaged.

| Rung | Model | MASE | folds | Note |
|---|---|---|---|---|
| 0 | rung0_seasonal_naive | 0.673 | 6 |  |
| 1 | rung1_robust_dow | 0.737 | 6 |  |
| 2 | rung2_ets | 0.597 | 6 |  |
| 2 | rung2_prophet | 0.709 | 6 |  |
| 2 | rung2_stl | 0.829 | 6 |  |
| 3 | rung3_gbm | 0.602 | 6 |  |
| 3 | rung3_global_gbm | 0.792 | 6 |  |
| 4 | rung4_foundation | – | – | no foundation backend installed; Tan ablation: adopt only if it beats rung3_global_gbm — not evaluated. |

## Static regime — single 8-week held-out block (multi-step from origin)
Test 2026-03-14 → 2026-05-08 (n=56). A stress test over a long static horizon.

| Rung | Model | MASE | MAE | RMSE | sMAPE | Note |
|---|---|---|---|---|---|---|
| 0 | rung0_seasonal_naive | 1.525 | 257.100 | 334.315 | 200.000 |  |
| 1 | rung1_robust_dow | 1.094 | 184.461 | 223.476 | 42.918 |  |
| 2 | rung2_ets | 0.897 | 151.217 | 214.960 | 95.834 |  |
| 2 | rung2_prophet | 0.823 | 138.742 | 191.510 | 92.725 |  |
| 2 | rung2_stl | 0.676 | 113.900 | 164.213 | 47.562 |  |
| 3 | rung3_gbm | 0.766 | 129.039 | 164.384 | 44.329 |  |
| 3 | rung3_global_gbm | 1.242 | 209.371 | 267.800 | 139.282 |  |
| 4 | rung4_foundation | – | – | – | – | no foundation backend installed; Tan ablation: adopt only if it beats rung3_global_gbm — not evaluated. |

## Milestone (rolling regime)
- gate: *beats seasonal-naive AND robust DOW*
- best model: **rung2_ets** (MASE 0.597)
- seasonal-naive MASE: 0.673
- robust-DOW MASE: 0.737
- **gate met: True**
