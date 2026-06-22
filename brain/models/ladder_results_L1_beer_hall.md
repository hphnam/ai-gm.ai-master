# A4 · L1 ladder results (The Beer Hall)

## Operational regime — rolling-origin, 7-day horizon (the milestone gate)
Expanding-window backtest, 6 held-out folds. MASE per fold vs in-sample seasonal-naive (m=7), averaged.

| Rung | Model | MASE | folds | Note |
|---|---|---|---|---|
| 0 | rung0_seasonal_naive | 1.006 | 6 |  |
| 1 | rung1_robust_dow | 1.029 | 6 |  |
| 2 | rung2_ets | 0.799 | 6 |  |
| 2 | rung2_prophet | 0.799 | 6 |  |
| 2 | rung2_stl | 1.125 | 6 |  |
| 3 | rung3_gbm | 0.927 | 6 |  |
| 3 | rung3_global_gbm | 0.905 | 6 |  |
| 4 | rung4_foundation | – | – | no foundation backend installed; Tan ablation: adopt only if it beats rung3_global_gbm — not evaluated. |

## Static regime — single 8-week held-out block (multi-step from origin)
Test 2026-04-06 → 2026-05-31 (n=56). A stress test over a long static horizon.

| Rung | Model | MASE | MAE | RMSE | sMAPE | Note |
|---|---|---|---|---|---|---|
| 0 | rung0_seasonal_naive | 1.944 | 576.559 | 792.607 | 200.000 |  |
| 1 | rung1_robust_dow | 0.704 | 208.964 | 371.010 | 40.932 |  |
| 2 | rung2_ets | 0.806 | 239.042 | 405.487 | 50.039 |  |
| 2 | rung2_prophet | 0.824 | 244.575 | 408.390 | 52.599 |  |
| 2 | rung2_stl | 0.847 | 251.178 | 375.093 | 34.539 |  |
| 3 | rung3_gbm | 0.852 | 252.862 | 425.985 | 46.050 |  |
| 3 | rung3_global_gbm | 0.979 | 290.443 | 410.921 | 42.130 |  |
| 4 | rung4_foundation | – | – | – | – | no foundation backend installed; Tan ablation: adopt only if it beats rung3_global_gbm — not evaluated. |

## Milestone (rolling regime)
- best model: **rung2_prophet** (MASE 0.799)
- seasonal-naive MASE: 1.006
- robust-DOW MASE: 1.029
- **beats seasonal-naive AND robust DOW: True**

## Diagnostic — ETS vs Prophet (FIX-7)
Per rolling-origin fold: max pointwise |ETS − Prophet| and their correlation.

| Fold | max&#124;Δ&#124; | corr |
|---|---|---|
| 1 | 40.1 | 1.000 |
| 2 | 69.1 | 0.999 |
| 3 | 81.7 | 1.000 |
| 4 | 91.9 | 0.994 |
| 5 | 132.4 | 0.987 |
| 6 | 184.1 | 0.977 |

ETS and Prophet differ per-day (max |Δ| up to £184) yet land on the same average MASE — genuinely independent forecasts that happen to tie, not a computation bug.

## Spillover-hypothesis check — is_ellel_event (FIX-8)
Permutation importance of `is_ellel_event` in the Rung-3 Beer Hall GBM (held-out fold, 10 repeats): **-0.0459** (rank 22/22 of features).
This **does not support** the audit's hypothesis that Ellel event nights spill over into Beer Hall demand.
