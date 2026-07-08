# A4 · L1 ladder results (Ellel Village Hall)

## Operational regime — rolling-origin, 7-day horizon (the milestone gate)
Expanding-window backtest, 6 held-out folds. MASE per fold vs in-sample seasonal-naive (m=7), averaged.

| Rung | Model | MASE | folds | Note |
|---|---|---|---|---|
| 0 | rung0_seasonal_naive | 0.924 | 6 |  |
| 1 | rung1_robust_dow | 0.572 | 6 |  |
| 2 | rung2_ets | 0.825 | 6 |  |
| 2 | rung2_prophet | – | – | backend not installed |
| 2 | rung2_stl | 0.629 | 6 |  |
| 3 | rung3_gbm | 0.813 | 6 |  |
| 3 | rung3_global_gbm | 0.936 | 6 |  |
| 4 | rung4_chronos2 | 0.581 | 6 |  |
| 4 | rung4_chronos2_exo | 0.591 | 6 |  |
| 4 | rung4_chronos_bolt | 0.601 | 6 |  |

## Static regime — single 8-week held-out block (multi-step from origin)
Test 2026-03-28 → 2026-05-22 (n=56). A stress test over a long static horizon.

| Rung | Model | MASE | MAE | RMSE | sMAPE | Note |
|---|---|---|---|---|---|---|
| 0 | rung0_seasonal_naive | 1.095 | 184.200 | 535.893 | 200.000 |  |
| 1 | rung1_robust_dow | 1.050 | 176.692 | 508.474 | 166.091 |  |
| 2 | rung2_ets | 1.100 | 185.070 | 518.900 | 152.263 |  |
| 2 | rung2_prophet | – | – | – | – | backend not installed |
| 2 | rung2_stl | 1.039 | 174.861 | 503.465 | 160.209 |  |
| 3 | rung3_gbm | 1.335 | 224.604 | 518.963 | 133.392 |  |
| 3 | rung3_global_gbm | 2.340 | 393.790 | 537.027 | 82.491 |  |
| 4 | rung4_chronos2 | 1.100 | 185.071 | 532.386 | 187.063 |  |
| 4 | rung4_chronos2_exo | – | – | – | – | error: ValueError |
| 4 | rung4_chronos_bolt | 1.095 | 184.323 | 534.913 | 193.684 |  |

## Milestone (rolling regime)
- gate: *beats seasonal-naive AND robust DOW*
- best model: **rung1_robust_dow** (MASE 0.572)
- seasonal-naive MASE: 0.924
- robust-DOW MASE: 0.572
- **gate met: False**


## Rung 4: foundation models zero-shot (Chronos-2, Chronos-2 + covariates, Chronos-Bolt)
chronos-forecasting 2.3.1, model loaded amazon/chronos-2, API path predict_df, exo weather basis hindcast.

| Entrant | model id | rolling MASE |
|---|---|---|
| rung4_chronos2 | amazon/chronos-2 | 0.581 |
| rung4_chronos2_exo | amazon/chronos-2 | 0.591 |
| rung4_chronos_bolt | amazon/chronos-bolt-small | 0.601 |

Best Rung-4 entrant: **rung4_chronos2** (rolling MASE 0.581). Rung 4 evaluated zero-shot (amazon/chronos-2, pinned); not adopted because it does not beat both seasonal-naive and robust DOW on held-out rolling MASE. It beats rung3_global_gbm (0.936), the Rung-4 adoption criterion.