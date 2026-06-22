# A4 · L1 ladder results (Ellel Village Hall)

> **Ladder capped at Rung 1** for this venue (Data Audit Report §8.3 — insufficient training signal for classical/ML rungs). Rungs above the cap are listed as 'capped', not silently omitted.

## Operational regime — rolling-origin, 7-day horizon (the milestone gate)
Expanding-window backtest, 6 held-out folds. MASE per fold vs in-sample seasonal-naive (m=7), averaged.

| Rung | Model | MASE | folds | Note |
|---|---|---|---|---|
| 0 | rung0_seasonal_naive | 0.924 | 6 |  |
| 1 | rung1_robust_dow | 0.572 | 6 |  |
| 2 | rung2_ets | – | – | capped at Rung 1 per Data Audit Report §8.3 — insufficient training signal for classical/ML rungs |
| 2 | rung2_prophet | – | – | capped at Rung 1 per Data Audit Report §8.3 — insufficient training signal for classical/ML rungs |
| 2 | rung2_stl | – | – | capped at Rung 1 per Data Audit Report §8.3 — insufficient training signal for classical/ML rungs |
| 3 | rung3_gbm | – | – | capped at Rung 1 per Data Audit Report §8.3 — insufficient training signal for classical/ML rungs |
| 3 | rung3_global_gbm | – | – | capped at Rung 1 per Data Audit Report §8.3 — insufficient training signal for classical/ML rungs |
| 4 | rung4_foundation | – | – | no foundation backend installed; Tan ablation: adopt only if it beats rung3_global_gbm — not evaluated. |

## Static regime — single 8-week held-out block (multi-step from origin)
Test 2026-03-28 → 2026-05-22 (n=56). A stress test over a long static horizon.

| Rung | Model | MASE | MAE | RMSE | sMAPE | Note |
|---|---|---|---|---|---|---|
| 0 | rung0_seasonal_naive | 1.095 | 184.200 | 535.893 | 200.000 |  |
| 1 | rung1_robust_dow | 1.050 | 176.692 | 508.474 | 166.091 |  |
| 2 | rung2_ets | – | – | – | – | capped at Rung 1 per Data Audit Report §8.3 — insufficient training signal for classical/ML rungs |
| 2 | rung2_prophet | – | – | – | – | capped at Rung 1 per Data Audit Report §8.3 — insufficient training signal for classical/ML rungs |
| 2 | rung2_stl | – | – | – | – | capped at Rung 1 per Data Audit Report §8.3 — insufficient training signal for classical/ML rungs |
| 3 | rung3_gbm | – | – | – | – | capped at Rung 1 per Data Audit Report §8.3 — insufficient training signal for classical/ML rungs |
| 3 | rung3_global_gbm | – | – | – | – | capped at Rung 1 per Data Audit Report §8.3 — insufficient training signal for classical/ML rungs |
| 4 | rung4_foundation | – | – | – | – | no foundation backend installed; Tan ablation: adopt only if it beats rung3_global_gbm — not evaluated. |

## Milestone (rolling regime)
- gate: *Rung 1 (robust DOW) beats seasonal-naive*
- best model: **rung1_robust_dow** (MASE 0.572)
- seasonal-naive MASE: 0.924
- robust-DOW MASE: 0.572
- **gate met: True**
