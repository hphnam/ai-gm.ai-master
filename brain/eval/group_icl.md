# S5 G17f - group in-context learning: three-arm run and MCS

Store ceiling 2026-07-07; device cpu; model chronos2 (plain, no covariates); seed 93; wall-clock 21.3s.

Group window 2025-10-11 to 2026-06-27, **260 aligned origins** (G2 and G3). Univariate origin counts: beer_hall 273, ellel 260, two_river_taps 205.

## G2 - univariate reproduces the committed ladder (basis calendar_lag7)

| venue | n | reproduced mean MASE | committed mean MASE | max abs delta |
|---|---|---|---|---|
| beer_hall | 273 | 0.7342 | 0.7342 | 0.0000 |
| ellel | 260 | 0.6023 | 0.6023 | 0.0000 |
| two_river_taps | 205 | 0.6709 | 0.6709 | 0.0000 |

## The arms, by venue (90% Model Confidence Set)

### beer_hall (loss mase, basis calendar_lag7_active, n_folds 260)

| arm | mean loss | MCS p-value | in 90% set |
|---|---|---|---|
| U | 0.6091 | 1.000 | yes |
| G2 | 0.6166 | 0.129 | yes |
| G3 | 0.6185 | 0.129 | yes |

90% set: ['U', 'G2', 'G3']. Paired bootstrap (block 7, B 10000):
- U-G2: mean delta -0.0075, 90% CI [-0.0153, -0.0009] (excludes 0)
- U-G3: mean delta -0.0094, 90% CI [-0.0183, -0.0018] (excludes 0)
- G2-G3: mean delta -0.0019, 90% CI [-0.0047, +0.0011]

### ellel (loss mae, basis unscaled, n_folds 260)

| arm | mean loss | MCS p-value | in 90% set |
|---|---|---|---|
| U | 110.8545 | 0.681 | yes |
| G2 | 110.5294 | 0.705 | yes |
| G3 | 110.2095 | 1.000 | yes |

90% set: ['G3', 'G2', 'U']. Paired bootstrap (block 7, B 10000):
- U-G2: mean delta +0.3251, 90% CI [-0.6833, +1.3942]
- U-G3: mean delta +0.6449, 90% CI [-0.7097, +1.9333]
- G2-G3: mean delta +0.3198, 90% CI [-1.2180, +1.7410]

### two_river_taps (loss mase, basis calendar_lag7_active, n_folds 203)

| arm | mean loss | MCS p-value | in 90% set |
|---|---|---|---|
| U | 0.6263 | 1.000 | yes |
| G3 | 0.6406 | 0.035 | no |

90% set: ['U']. Paired bootstrap (block 7, B 10000):
- U-G3: mean delta -0.0144, 90% CI [-0.0254, -0.0041] (excludes 0)

