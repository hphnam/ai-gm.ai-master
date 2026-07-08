# WP9b · Chronos-2 covariate probe (beer_hall)

Model: **amazon/chronos-2**, zero-shot. Univariate vs a covariate variant whose future_df carries only known-future calendar covariates (is_bank_holiday, is_ellel_event, exo_is_school_term, exo_is_uni_term); weather is excluded as not known-future. Report-only: this touches no ladder rung and no gate.

| Fold | MASE univariate | MASE covariate |
|---|---|---|
| 1 | 0.641 | 0.485 |
| 2 | 0.825 | 0.855 |
| 3 | 0.490 | 0.526 |
| 4 | 1.015 | 1.049 |
| 5 | 0.785 | 0.777 |
| 6 | 1.001 | 0.984 |
| **mean** | **0.793** | **0.779** |

Outcome: covariates HELP: the covariate variant lowers mean rolling MASE (0.793 -> 0.779, delta -0.014). This refreshes the exogenous-null evidence: the project's logged finding that time-series foundation models ingest covariates weakly can now be quoted against Chronos-2's own covariate path on real Beer Hall folds.