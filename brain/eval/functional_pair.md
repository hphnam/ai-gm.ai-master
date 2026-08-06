# R9 - the functional minimal pair

Pre-registered at decision-log row 77, commit c098fba, before `rung1_mean_dow` existed. Rolling origin, horizon 7, min train 120, step 1. Wall clock 760.7s.

`rung1_robust_dow` and `rung1_mean_dow` share one code path and differ only in the central-tendency aggregator, so a difference between them is attributable to the forecast functional alone. The ladder arms below are a generalisation check, not the load-bearing evidence: they confound the functional with family, capacity, feature access and fit procedure.

## beer_hall

- metric axis **MASE / RMSSE**, basis `calendar_lag7_active`
- folds: 273, points: 1911

### Bias (mean signed residual, actual - forecast)

| arm | mean signed resid | 95% CI | p | biased |
|---|---|---|---|---|
| `rung1_robust_dow` (median) | +67.672 | [+48.945, +86.400] | 1.922e-12 | True |
| `rung1_mean_dow` (mean) | +24.653 | [+6.157, +43.150] | 9.019e-03 | True |

Bias magnitude closer to zero for the mean arm by **+43.019** (mean arm less biased -- prediction (i) HOLDS here).

### The 2x2

| arm | MASE | RMSSE |
|---|---|---|
| `rung1_robust_dow` (median) | 0.6578 | 0.6189 |
| `rung1_mean_dow` (mean) | 0.6670 | 0.6132 |

Paired per-fold difference (mean arm - median arm): **MASE +0.0092** [-0.0093, +0.0277], p 3.270e-01; **RMSSE -0.0056** [-0.0216, +0.0103], p 4.881e-01.

**Crossing observed (median wins on MASE, mean wins on RMSSE): True**  However BOTH legs are non-significant (p 0.327 and 0.488), so this is a consistent DIRECTION, not a demonstrated effect.

### Generalisation check (confounded; not load-bearing)

| rung | functional | MASE | RMSSE | mean signed resid | p |
|---|---|---|---|---|---|
| `rung2_ets` | mean | 0.6159 | 0.5795 | +46.983 | 2.830e-07 |
| `rung3_gbm` | mean | 0.7230 | 0.6563 | +28.983 | 5.306e-03 |

## ellel

- metric axis **MAE / RMSE** (G2: unscaled venue)
- folds: 266, points: 1862

### Bias (mean signed residual, actual - forecast)

| arm | mean signed resid | 95% CI | p | biased |
|---|---|---|---|---|
| `rung1_robust_dow` (median) | +75.090 | [+59.692, +90.488] | 3.433e-21 | True |
| `rung1_mean_dow` (mean) | -39.831 | [-56.832, -22.831] | 4.616e-06 | True |

Bias magnitude closer to zero for the mean arm by **+35.259** (mean arm less biased -- prediction (i) HOLDS here).

### The 2x2

| arm | MAE | RMSE |
|---|---|---|
| `rung1_robust_dow` (median) | 105.9785 | 236.8921 |
| `rung1_mean_dow` (mean) | 166.6424 | 306.5116 |

Paired per-fold difference (mean arm - median arm): **MAE +60.6639** [+50.3836, +70.9442], p 1.700e-25; **RMSE +69.6194** [+49.5838, +89.6551], p 5.405e-11.

**Crossing observed (median wins on MAE, mean wins on RMSE): False**

### Generalisation check (confounded; not load-bearing)

| rung | functional | MAE | RMSE | mean signed resid | p |
|---|---|---|---|---|---|
| `rung2_ets` | mean | 133.2345 | 273.9306 | +9.219 | 2.448e-01 |
| `rung3_gbm` | mean | 168.0388 | 297.7018 | -37.333 | 6.958e-06 |

## two_river_taps

- metric axis **MASE / RMSSE**, basis `calendar_lag7_active`
- folds: 205, points: 1435

### Bias (mean signed residual, actual - forecast)

| arm | mean signed resid | 95% CI | p | biased |
|---|---|---|---|---|
| `rung1_robust_dow` (median) | -29.460 | [-39.437, -19.482] | 8.550e-09 | True |
| `rung1_mean_dow` (mean) | -41.685 | [-51.599, -31.771] | 3.611e-16 | True |

Bias magnitude closer to zero for the mean arm by **-12.225** (NEGATIVE: the mean arm is MORE biased -- prediction (i) FAILS here).

### The 2x2

| arm | MASE | RMSSE |
|---|---|---|
| `rung1_robust_dow` (median) | 0.7805 | 0.5574 |
| `rung1_mean_dow` (mean) | 0.7862 | 0.5560 |

Paired per-fold difference (mean arm - median arm): **MASE +0.0057** [-0.0189, +0.0303], p 6.486e-01; **RMSSE -0.0015** [-0.0166, +0.0137], p 8.500e-01.

**Crossing observed (median wins on MASE, mean wins on RMSSE): True**  However BOTH legs are non-significant (p 0.649 and 0.850), so this is a consistent DIRECTION, not a demonstrated effect.

### Generalisation check (confounded; not load-bearing)

| rung | functional | MASE | RMSSE | mean signed resid | p |
|---|---|---|---|---|---|
| `rung2_ets` | mean | 0.6051 | 0.4924 | +28.434 | 1.557e-09 |
| `rung3_gbm` | mean | 0.6931 | 0.5258 | -21.937 | 9.022e-06 |

## Crossing summary

Venues showing the predicted crossing: **['beer_hall', 'two_river_taps']**
