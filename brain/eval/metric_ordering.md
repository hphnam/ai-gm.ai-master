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
| rung4_chronos2_exo | 0.7163 | 0.5902 | 1 | 2 |
| rung4_chronos_bolt | 0.7321 | 0.5900 | 2 | 1 |
| rung4_chronos2 | 0.7342 | 0.6077 | 3 | 4 |
| rung2_ets | 0.7524 | 0.6017 | 4 | 3 |
| rung1_robust_dow | 0.8032 | 0.6421 | 5 | 5 |
| rung3_global_gbm | 0.8647 | 0.6646 | 6 | 7 |
| rung2_stl | 0.8710 | 0.6577 | 7 | 6 |
| rung3_gbm | 0.8830 | 0.6818 | 8 | 8 |
| rung0_seasonal_naive | 0.9375 | 0.7612 | 9 | 9 |

## two_river_taps

- rungs compared: 9, folds: 205
- winner under MASE: `rung2_ets`
- winner under RMSSE: `rung4_chronos2`
- **winner changes: True**; full ordering identical: False
- rank correlation between the two orderings: Spearman rho 0.817 (p 7.22e-03), Kendall tau 0.611 (p 2.47e-02)
- 90% MCS under MASE: ['rung2_ets', 'rung4_chronos2', 'rung4_chronos2_exo', 'rung4_chronos_bolt']
- 90% MCS under RMSSE: ['rung2_ets', 'rung4_chronos2', 'rung4_chronos2_exo', 'rung4_chronos_bolt']
- **MCS sets identical: True**

| rung | mean MASE | mean RMSSE | rank MASE | rank RMSSE |
|---|---|---|---|---|
| rung2_ets | 0.6478 | 0.5139 | 1 | 4 |
| rung4_chronos_bolt | 0.6590 | 0.4860 | 2 | 3 |
| rung4_chronos2_exo | 0.6705 | 0.4832 | 3 | 2 |
| rung4_chronos2 | 0.6709 | 0.4817 | 4 | 1 |
| rung0_seasonal_naive | 0.7182 | 0.5674 | 5 | 6 |
| rung3_gbm | 0.7409 | 0.5491 | 6 | 5 |
| rung2_stl | 0.7814 | 0.5682 | 7 | 7 |
| rung1_robust_dow | 0.8351 | 0.5820 | 8 | 8 |
| rung3_global_gbm | 0.8969 | 0.7143 | 9 | 9 |
