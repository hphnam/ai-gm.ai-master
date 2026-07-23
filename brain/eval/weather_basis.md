# S6 G17g - lead-matched weather: five-arm exogenous ablation and MCS

Store ceiling 2026-07-07; device cpu; seed 93; horizon model ecmwf_ifs025; wall-clock 136.8s.

Arms (target-window weather; training context is hindcast throughout): **N** no weather (exogenous path off); **O** observed / ERA5 reanalysis at valid time (upper bound); **H** hindcast, archived near valid time (committed default); **F** fixed lead 3 days (pinned ecmwf_ifs025); **M** horizon-matched, lead=step (pinned ecmwf_ifs025).

## Fold counts per arm (N has no weather dependency)

| venue | N | O | H | F | M |
|---|---|---|---|---|---|
| beer_hall | 273 | 273 | 273 | 273 | 273 |
| ellel | 260 | 260 | 260 | 260 | 260 |
| two_river_taps | 205 | 205 | 205 | 205 | 205 |

## Reproduction (committed basis calendar_lag7)

| venue | N vs rung4_chronos2 (max Δ) | H vs rung4_chronos2_exo (max Δ) |
|---|---|---|
| beer_hall | 0.0000 (n=273) | 0.0000 (n=273) |
| ellel | 0.0000 (n=260) | 0.0000 (n=246) |
| two_river_taps | 0.0000 (n=205) | 0.0000 (n=205) |

## The arms, by venue (90% Model Confidence Set)

### beer_hall (loss mase, basis calendar_lag7_active, n_folds 273)

| arm | mean loss | MCS p-value | in 90% set |
|---|---|---|---|
| N | 0.6005 | 0.459 | yes |
| O | 0.5865 | 0.459 | yes |
| H | 0.5862 | 0.543 | yes |
| F | 0.5860 | 0.543 | yes |
| M | 0.5842 | 1.000 | yes |

90% set: ['M', 'F', 'H', 'O', 'N']. Paired bootstrap (block 7, B 10000):
- N-O: mean delta +0.0140, 90% CI [-0.0020, +0.0319]
- N-H: mean delta +0.0144, 90% CI [-0.0026, +0.0334]
- N-F: mean delta +0.0145, 90% CI [-0.0016, +0.0316]
- N-M: mean delta +0.0163, 90% CI [+0.0004, +0.0337] (excludes 0)
- O-H: mean delta +0.0004, 90% CI [-0.0038, +0.0038]
- O-F: mean delta +0.0006, 90% CI [-0.0028, +0.0035]
- O-M: mean delta +0.0023, 90% CI [-0.0001, +0.0052]
- H-F: mean delta +0.0002, 90% CI [-0.0044, +0.0046]
- H-M: mean delta +0.0020, 90% CI [-0.0019, +0.0066]
- F-M: mean delta +0.0018, 90% CI [-0.0009, +0.0050]

Per horizon step (mean mase, 273 common origins):
| arm | h1 | h2 | h3 | h4 | h5 | h6 | h7 |
|---|---|---|---|---|---|---|---|
| N | 0.588 | 0.591 | 0.600 | 0.602 | 0.600 | 0.604 | 0.620 |
| O | 0.590 | 0.587 | 0.583 | 0.583 | 0.581 | 0.581 | 0.601 |
| H | 0.592 | 0.587 | 0.584 | 0.582 | 0.579 | 0.579 | 0.600 |
| F | 0.589 | 0.587 | 0.584 | 0.583 | 0.577 | 0.581 | 0.601 |
| M | 0.589 | 0.585 | 0.584 | 0.580 | 0.574 | 0.581 | 0.596 |

### ellel (loss mae, basis unscaled, n_folds 260)

| arm | mean loss | MCS p-value | in 90% set |
|---|---|---|---|
| N | 110.8545 | 0.949 | yes |
| O | 110.8792 | 0.474 | yes |
| H | 110.7798 | 1.000 | yes |
| F | 111.0163 | 0.208 | yes |
| M | 110.9997 | 0.221 | yes |

90% set: ['H', 'N', 'O', 'M', 'F']. Paired bootstrap (block 7, B 10000):
- N-O: mean delta -0.0248, 90% CI [-2.0245, +2.0453]
- N-H: mean delta +0.0746, 90% CI [-1.9458, +2.1754]
- N-F: mean delta -0.1618, 90% CI [-2.1627, +1.8786]
- N-M: mean delta -0.1452, 90% CI [-2.1246, +1.8772]
- O-H: mean delta +0.0994, 90% CI [-0.0421, +0.2494]
- O-F: mean delta -0.1370, 90% CI [-0.2704, -0.0057] (excludes 0)
- O-M: mean delta -0.1205, 90% CI [-0.2654, +0.0147]
- H-F: mean delta -0.2365, 90% CI [-0.4315, -0.0457] (excludes 0)
- H-M: mean delta -0.2199, 90% CI [-0.4223, -0.0325] (excludes 0)
- F-M: mean delta +0.0166, 90% CI [-0.1076, +0.1345]

Per horizon step (mean mae, 260 common origins):
| arm | h1 | h2 | h3 | h4 | h5 | h6 | h7 |
|---|---|---|---|---|---|---|---|
| N | 111.164 | 110.237 | 110.422 | 109.923 | 111.137 | 110.058 | 113.040 |
| O | 111.596 | 110.942 | 110.655 | 109.870 | 111.783 | 109.854 | 111.455 |
| H | 111.488 | 110.916 | 110.570 | 109.806 | 111.619 | 109.700 | 111.359 |
| F | 111.607 | 111.175 | 110.915 | 109.984 | 111.904 | 109.871 | 111.658 |
| M | 111.612 | 111.122 | 110.973 | 109.868 | 111.885 | 109.823 | 111.715 |

### two_river_taps (loss mase, basis calendar_lag7_active, n_folds 205)

| arm | mean loss | MCS p-value | in 90% set |
|---|---|---|---|
| N | 0.6260 | 0.928 | yes |
| O | 0.6233 | 0.993 | yes |
| H | 0.6261 | 0.221 | yes |
| F | 0.6246 | 0.522 | yes |
| M | 0.6232 | 1.000 | yes |

90% set: ['M', 'O', 'F', 'N', 'H']. Paired bootstrap (block 7, B 10000):
- N-O: mean delta +0.0027, 90% CI [-0.0116, +0.0163]
- N-H: mean delta -0.0001, 90% CI [-0.0140, +0.0128]
- N-F: mean delta +0.0013, 90% CI [-0.0131, +0.0145]
- N-M: mean delta +0.0027, 90% CI [-0.0111, +0.0152]
- O-H: mean delta -0.0028, 90% CI [-0.0051, -0.0006] (excludes 0)
- O-F: mean delta -0.0014, 90% CI [-0.0048, +0.0016]
- O-M: mean delta +0.0000, 90% CI [-0.0035, +0.0027]
- H-F: mean delta +0.0014, 90% CI [-0.0024, +0.0047]
- H-M: mean delta +0.0028, 90% CI [-0.0005, +0.0054]
- F-M: mean delta +0.0014, 90% CI [-0.0007, +0.0031]

Per horizon step (mean mase, 205 common origins):
| arm | h1 | h2 | h3 | h4 | h5 | h6 | h7 |
|---|---|---|---|---|---|---|---|
| N | 0.626 | 0.643 | 0.636 | 0.623 | 0.623 | 0.611 | 0.621 |
| O | 0.615 | 0.637 | 0.638 | 0.624 | 0.623 | 0.611 | 0.615 |
| H | 0.617 | 0.638 | 0.640 | 0.627 | 0.627 | 0.614 | 0.619 |
| F | 0.615 | 0.636 | 0.638 | 0.626 | 0.625 | 0.614 | 0.617 |
| M | 0.614 | 0.636 | 0.637 | 0.625 | 0.624 | 0.613 | 0.614 |

## Weather coverage (S6 G2)

Horizon model ecmwf_ifs025, leads 1..7. Per-cell per-lead non-null coverage:

- beer_hall span ['2025-06-04', '2026-07-07']: L1=399/399 L2=399/399 L3=399/399 L4=399/399 L5=399/399 L6=399/399 L7=399/399
- ellel span ['2025-06-08', '2026-07-04']: L1=392/392 L2=392/392 L3=392/392 L4=392/392 L5=392/392 L6=392/392 L7=392/392
- two_river_taps span ['2025-06-12', '2026-05-08']: L1=331/331 L2=331/331 L3=331/331 L4=331/331 L5=331/331 L6=331/331 L7=331/331
