# A4 · L1 ladder results (The Beer Hall)

## Operational regime — rolling-origin, 7-day horizon (the milestone gate)
Expanding-window backtest, 6 held-out folds. MASE per fold vs in-sample seasonal-naive (m=7), averaged.

| Rung | Model | MASE | folds | Note |
|---|---|---|---|---|
| 0 | rung0_seasonal_naive | 1.006 | 6 |  |
| 1 | rung1_robust_dow | 1.029 | 6 |  |
| 2 | rung2_ets | 0.799 | 6 |  |
| 2 | rung2_prophet | – | – | backend not installed |
| 2 | rung2_stl | 1.125 | 6 |  |
| 3 | rung3_gbm | 0.927 | 6 |  |
| 3 | rung3_global_gbm | 0.905 | 6 |  |
| 4 | rung4_chronos2 | 0.793 | 6 |  |
| 4 | rung4_chronos2_exo | 0.779 | 6 |  |
| 4 | rung4_chronos_bolt | 0.796 | 6 |  |

## Static regime — single 8-week held-out block (multi-step from origin)
Test 2026-04-06 → 2026-05-31 (n=56). A stress test over a long static horizon.

| Rung | Model | MASE | MAE | RMSE | sMAPE | Note |
|---|---|---|---|---|---|---|
| 0 | rung0_seasonal_naive | 1.944 | 576.559 | 792.607 | 200.000 |  |
| 1 | rung1_robust_dow | 0.704 | 208.964 | 371.010 | 40.932 |  |
| 2 | rung2_ets | 0.806 | 239.042 | 405.487 | 50.039 |  |
| 2 | rung2_prophet | – | – | – | – | backend not installed |
| 2 | rung2_stl | 0.847 | 251.178 | 375.093 | 34.539 |  |
| 3 | rung3_gbm | 0.852 | 252.862 | 425.985 | 46.050 |  |
| 3 | rung3_global_gbm | 0.979 | 290.443 | 410.921 | 42.130 |  |
| 4 | rung4_chronos2 | 0.721 | 213.783 | 376.492 | 39.426 |  |
| 4 | rung4_chronos2_exo | – | – | – | – | error: ValueError |
| 4 | rung4_chronos_bolt | 0.731 | 216.823 | 367.376 | 34.855 |  |

## Milestone (rolling regime)
- gate: *beats seasonal-naive AND robust DOW*
- best model: **rung4_chronos2_exo** (MASE 0.779)
- seasonal-naive MASE: 1.006
- robust-DOW MASE: 1.029
- **gate met: True**

## Spillover-hypothesis check — is_ellel_event (FIX-8)
Permutation importance of `is_ellel_event` in the Rung-3 Beer Hall GBM (held-out fold, 10 repeats): **-0.0459** (rank 22/22 of features).
This **does not support** the audit's hypothesis that Ellel event nights spill over into Beer Hall demand.


## Rung 4: foundation models zero-shot (Chronos-2, Chronos-2 + covariates, Chronos-Bolt)
chronos-forecasting 2.3.1, model loaded amazon/chronos-2, API path predict_df.

| Entrant | model id | rolling MASE |
|---|---|---|
| rung4_chronos2 | amazon/chronos-2 | 0.793 |
| rung4_chronos2_exo | amazon/chronos-2 | 0.779 |
| rung4_chronos_bolt | amazon/chronos-bolt-small | 0.796 |

Best Rung-4 entrant: **rung4_chronos2_exo** (rolling MASE 0.779). Rung 4 evaluated zero-shot (amazon/chronos-2, pinned); adopted because it beats seasonal-naive (1.006) and robust DOW (1.029) on held-out rolling MASE. It beats rung3_global_gbm (0.905), the Rung-4 adoption criterion.