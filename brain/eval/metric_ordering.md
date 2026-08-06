# R4 / G1 - does the headline metric change the ladder's decision?

Re-analysis only. The committed per-fold loss vectors are re-read and the SAME Model Confidence Set instrument is re-run under each loss. No refit, no new fold grid, no new model, so any difference below is attributable to the measure alone.

Scaled venues scored: **beer_hall, two_river_taps**.

Out of scope under G2, no scaled error is defined: **ellel (unscaled)**.

## Verdict

- Served/winning rung changes between MASE and RMSSE anywhere: **True**
- Full ordering identical at every scaled venue: **False**

## beer_hall

- rungs compared: 9, folds: 273
- winner under MASE: `rung4_chronos2_exo`
- winner under RMSSE: `rung4_chronos_bolt`
- **winner changes: True**; full ordering identical: False
- rank correlation between the two orderings: Spearman rho 0.950 (p 8.76e-05), Kendall tau 0.833 (p 8.54e-04)
- 90% MCS under MASE: ['rung1_robust_dow', 'rung2_ets', 'rung4_chronos2', 'rung4_chronos2_exo', 'rung4_chronos_bolt']
- 90% MCS under RMSSE: ['rung1_robust_dow', 'rung2_ets', 'rung4_chronos2', 'rung4_chronos2_exo', 'rung4_chronos_bolt']
- **MCS sets identical: True**

| rung | mean MASE | mean RMSSE | rank MASE | rank RMSSE |
|---|---|---|---|---|
| rung4_chronos2_exo | 0.5862 | 0.5681 | 1 | 2 |
| rung4_chronos_bolt | 0.5991 | 0.5680 | 2 | 1 |
| rung4_chronos2 | 0.6005 | 0.5848 | 3 | 4 |
| rung2_ets | 0.6159 | 0.5795 | 4 | 3 |
| rung1_robust_dow | 0.6578 | 0.6189 | 5 | 5 |
| rung3_global_gbm | 0.7081 | 0.6400 | 6 | 7 |
| rung2_stl | 0.7130 | 0.6333 | 7 | 6 |
| rung3_gbm | 0.7230 | 0.6563 | 8 | 8 |
| rung0_seasonal_naive | 0.7678 | 0.7329 | 9 | 9 |

## two_river_taps

- rungs compared: 9, folds: 205
- winner under MASE: `rung2_ets`
- winner under RMSSE: `rung4_chronos2`
- **winner changes: True**; full ordering identical: False
- rank correlation between the two orderings: Spearman rho 0.833 (p 5.27e-03), Kendall tau 0.667 (p 1.27e-02)
- 90% MCS under MASE: ['rung2_ets', 'rung4_chronos2', 'rung4_chronos2_exo', 'rung4_chronos_bolt']
- 90% MCS under RMSSE: ['rung2_ets', 'rung4_chronos2', 'rung4_chronos2_exo', 'rung4_chronos_bolt']
- **MCS sets identical: True**

| rung | mean MASE | mean RMSSE | rank MASE | rank RMSSE |
|---|---|---|---|---|
| rung2_ets | 0.6051 | 0.4924 | 1 | 4 |
| rung4_chronos_bolt | 0.6150 | 0.4652 | 2 | 3 |
| rung4_chronos2 | 0.6260 | 0.4614 | 3 | 1 |
| rung4_chronos2_exo | 0.6261 | 0.4630 | 4 | 2 |
| rung0_seasonal_naive | 0.6684 | 0.5423 | 5 | 6 |
| rung3_gbm | 0.6931 | 0.5258 | 6 | 5 |
| rung2_stl | 0.7285 | 0.5434 | 7 | 7 |
| rung1_robust_dow | 0.7805 | 0.5574 | 8 | 8 |
| rung3_global_gbm | 0.8338 | 0.6818 | 9 | 9 |
