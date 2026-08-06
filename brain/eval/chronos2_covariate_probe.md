# WP9b · Chronos-2 covariate probe (beer_hall)

Model: **amazon/chronos-2**, zero-shot. Univariate vs a covariate variant whose future_df carries only known-future calendar covariates (is_bank_holiday, is_ellel_event, exo_is_school_term, exo_is_uni_term); weather is excluded as not known-future. Report-only: this touches no ladder rung and no gate.

Scored on the estate's ruled basis for this venue, `calendar_lag7_active` (`config.VENUE_SCALE_BASIS`). Rolling origin over the whole active span at a full-horizon step: **39 folds**, horizon 7.

Dispersion: moving-block bootstrap, block 7, B=1000, MCS seed 93, paired-bootstrap seed 94.

| Fold | train end | MASE univariate | MASE covariate |
|---|---|---|---|
| 1 | 2025-10-07 | 0.327 | 0.358 |
| 2 | 2025-10-14 | 0.357 | 0.373 |
| 3 | 2025-10-21 | 0.342 | 0.322 |
| 4 | 2025-10-28 | 0.263 | 0.306 |
| 5 | 2025-11-04 | 0.295 | 0.310 |
| 6 | 2025-11-11 | 0.286 | 0.336 |
| 7 | 2025-11-18 | 0.529 | 0.542 |
| 8 | 2025-11-25 | 0.647 | 0.629 |
| 9 | 2025-12-02 | 0.665 | 0.667 |
| 10 | 2025-12-09 | 0.391 | 0.409 |
| 11 | 2025-12-16 | 0.449 | 0.464 |
| 12 | 2025-12-23 | 1.073 | 1.119 |
| 13 | 2025-12-30 | 1.575 | 1.570 |
| 14 | 2026-01-06 | 0.868 | 0.749 |
| 15 | 2026-01-13 | 0.167 | 0.338 |
| 16 | 2026-01-20 | 0.344 | 0.312 |
| 17 | 2026-01-27 | 0.525 | 0.495 |
| 18 | 2026-02-03 | 0.216 | 0.187 |
| 19 | 2026-02-10 | 0.211 | 0.239 |
| 20 | 2026-02-17 | 0.332 | 0.440 |
| 21 | 2026-02-24 | 0.246 | 0.167 |
| 22 | 2026-03-03 | 0.445 | 0.499 |
| 23 | 2026-03-10 | 0.343 | 0.227 |
| 24 | 2026-03-17 | 0.708 | 0.672 |
| 25 | 2026-03-24 | 0.195 | 0.129 |
| 26 | 2026-03-31 | 0.942 | 1.064 |
| 27 | 2026-04-07 | 0.277 | 0.281 |
| 28 | 2026-04-14 | 0.516 | 0.538 |
| 29 | 2026-04-21 | 0.428 | 0.358 |
| 30 | 2026-04-28 | 0.712 | 0.735 |
| 31 | 2026-05-05 | 0.443 | 0.448 |
| 32 | 2026-05-12 | 0.783 | 0.816 |
| 33 | 2026-05-19 | 0.681 | 0.670 |
| 34 | 2026-05-26 | 0.839 | 0.761 |
| 35 | 2026-06-02 | 1.258 | 1.199 |
| 36 | 2026-06-09 | 2.019 | 1.985 |
| 37 | 2026-06-16 | 0.766 | 0.798 |
| 38 | 2026-06-23 | 1.380 | 1.339 |
| 39 | 2026-06-30 | 0.822 | 0.807 |
| **mean** | | **0.607** | **0.607** |

## Dispersion, and the verdict read off it

- fold-to-fold SD: univariate 0.409, covariate 0.403
- mean difference (covariate - univariate): **-0.0002**, against those SDs
- folds where the covariate arm is better: **18 of 39**
- paired moving-block bootstrap on the difference: mean +0.0002, 90% CI [-0.0102, +0.0108], excludes zero: **False**
- MCS p-values: `univariate` 0.982, `covariate` 1.000
- 90% model confidence set: **['covariate', 'univariate']**; 75% set: ['covariate', 'univariate']

**Outcome: covariates are NOT separable from the univariate arm: the 90% model confidence set retains both, and the paired bootstrap interval on the difference contains zero** (0.607 -> 0.607, delta -0.0002).

This refreshes the exogenous-null evidence: the project's logged finding that time-series foundation models ingest covariates weakly is quoted against Chronos-2's own covariate path on real Beer Hall folds. A mean difference is not evidence of direction at this fold-to-fold spread, and the artefact no longer reports one as if it were.