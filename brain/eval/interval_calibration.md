# S7 G17h - interval calibration: powered coverage, per-step bands, adaptive methods

Store ceiling 2026-07-07; device cpu; seed 93; primary level 0.9; wall-clock 31.0s.

## Part 1: the 1.00 coverage claim, restated with power

C2 confrontation (reports 31/35): BH L1 7-day held-out window, 8-14 July, all 7 points in the 90% band -> coverage 1.00.

- n = 7 interval-observation pairs.
- P(all 7 inside | perfectly calibrated at 90%) = 0.478.
- 95% Clopper-Pearson interval on the 1.00 estimate: [0.590, 1.000].
- Supports miscalibration: **False**. 1.00 on 7 points does NOT support a miscalibration claim: under perfect 90% calibration all 7 fall inside with probability 0.478, and the 95% Clopper-Pearson interval on the estimate is [0.590, 1.000], which contains the nominal 0.90.

Angelopoulos-Bates upper bound on expected coverage (nominal + 1/(n_calib+1)):
- beer_hall: n_calib 1883, bound 0.9005
- ellel: n_calib 1792, bound 0.9006
- two_river_taps: n_calib 1407, bound 0.9007

## Part 2 and 4: five-arm comparison at the primary level

### beer_hall (point model rung2_ets, n_origins 273, n_folds 250)

| arm | marginal cov [CP] | mean width | Winkler | in 90% set |
|---|---|---|---|---|
| P | 0.880 [0.864,0.895] | 948 | 1939.7 | yes |
| D | 0.871 [0.855,0.887] | 961 | 1807.0 | yes |
| S | 0.890 [0.874,0.904] | 992 | 1928.1 | yes |
| A | 0.895 [0.880,0.909] | 1041 | 1814.3 | yes |
| G | 0.893 [0.878,0.907] | 1068 | 1820.3 | yes |

90% Winkler set: ['D', 'A', 'G', 'S', 'P']. Incumbent D; adoption candidates (in set AND lower mean than incumbent): none.
Per-step coverage (arm S per-step vs D pooled), primary level:
| step | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| D | 0.85 | 0.86 | 0.88 | 0.88 | 0.88 | 0.88 | 0.87 |
| S | 0.90 | 0.90 | 0.89 | 0.88 | 0.89 | 0.89 | 0.88 |
| A | 0.89 | 0.90 | 0.90 | 0.90 | 0.90 | 0.90 | 0.90 |
| G | 0.89 | 0.90 | 0.90 | 0.89 | 0.89 | 0.90 | 0.90 |

S per-step half-width: h1=505, h2=515, h3=498, h4=486, h5=482, h6=482, h7=504.
ACI gamma sweep (mean Winkler): 0.005=1929.5, 0.01=1920.7, 0.02=1902.9, 0.05=1814.3, 0.1=1822.1; best 0.05. Clamps A=46, G=339.
Paired bootstrap vs incumbent:
- P-D: mean delta +132.7, 90% CI [+30.3, +241.9] (excludes 0)
- D-S: mean delta -121.1, 90% CI [-216.1, -28.9] (excludes 0)
- D-A: mean delta -7.3, 90% CI [-153.1, +136.6]
- D-G: mean delta -13.4, 90% CI [-159.5, +138.7]

### ellel (point model rung2_ets, n_origins 260, n_folds 237)

| arm | marginal cov [CP] | mean width | Winkler | in 90% set |
|---|---|---|---|---|
| P | 0.910 [0.895,0.924] | 575 | 1435.3 | no |
| D | 0.914 [0.899,0.927] | 513 | 1262.5 | yes |
| S | 0.923 [0.910,0.936] | 630 | 1367.2 | no |
| A | 0.911 [0.897,0.925] | 588 | 1422.4 | no |
| G | 0.882 [0.866,0.898] | 561 | 1476.6 | no |

90% Winkler set: ['D']. Incumbent D; adoption candidates (in set AND lower mean than incumbent): none.
Per-step coverage (arm S per-step vs D pooled), primary level:
| step | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| D | 0.92 | 0.91 | 0.92 | 0.92 | 0.91 | 0.90 | 0.92 |
| S | 0.92 | 0.92 | 0.92 | 0.93 | 0.92 | 0.92 | 0.93 |
| A | 0.91 | 0.91 | 0.91 | 0.92 | 0.91 | 0.92 | 0.92 |
| G | 0.88 | 0.87 | 0.88 | 0.89 | 0.89 | 0.86 | 0.90 |

S per-step half-width: h1=309, h2=313, h3=315, h4=323, h5=308, h6=323, h7=316.
ACI gamma sweep (mean Winkler): 0.005=1422.4, 0.01=1438.2, 0.02=1485.3, 0.05=1541.8, 0.1=1687.2; best 0.005. Clamps A=0, G=127.
Paired bootstrap vs incumbent:
- P-D: mean delta +172.8, 90% CI [+86.4, +260.8] (excludes 0)
- D-S: mean delta -104.7, 90% CI [-163.6, -29.5] (excludes 0)
- D-A: mean delta -159.9, 90% CI [-220.0, -88.6] (excludes 0)
- D-G: mean delta -214.0, 90% CI [-289.0, -135.8] (excludes 0)

### two_river_taps (point model rung2_ets, n_origins 205, n_folds 182)

| arm | marginal cov [CP] | mean width | Winkler | in 90% set |
|---|---|---|---|---|
| P | 0.946 [0.932,0.958] | 522 | 654.2 | yes |
| D | 0.963 [0.951,0.973] | 535 | 646.4 | yes |
| S | 0.955 [0.942,0.966] | 556 | 670.3 | yes |
| A | 0.940 [0.926,0.953] | 522 | 671.2 | yes |
| G | 0.930 [0.915,0.944] | 506 | 675.0 | yes |

90% Winkler set: ['D', 'P', 'S', 'A', 'G']. Incumbent D; adoption candidates (in set AND lower mean than incumbent): none.
Per-step coverage (arm S per-step vs D pooled), primary level:
| step | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| D | 0.97 | 0.97 | 0.97 | 0.97 | 0.96 | 0.97 | 0.93 |
| S | 0.96 | 0.96 | 0.96 | 0.95 | 0.96 | 0.96 | 0.94 |
| A | 0.95 | 0.95 | 0.95 | 0.95 | 0.93 | 0.94 | 0.92 |
| G | 0.92 | 0.92 | 0.94 | 0.93 | 0.93 | 0.93 | 0.93 |

S per-step half-width: h1=271, h2=278, h3=275, h4=266, h5=284, h6=275, h7=296.
ACI gamma sweep (mean Winkler): 0.005=671.2, 0.01=676.5, 0.02=681.5, 0.05=720.3, 0.1=761.3; best 0.005. Clamps A=0, G=124.
Paired bootstrap vs incumbent:
- P-D: mean delta +7.8, 90% CI [-4.0, +14.6]
- D-S: mean delta -23.9, 90% CI [-40.7, -3.5] (excludes 0)
- D-A: mean delta -24.9, 90% CI [-43.5, -5.1] (excludes 0)
- D-G: mean delta -28.6, 90% CI [-56.1, -1.4] (excludes 0)

