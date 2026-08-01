# Point deviation — per-day band check

Per-day classification on the shared standardised conformal residual stream `z = (actual − DOW-median) / conformal half-band@90%` (`|z| > 1` → deviation, `|z| > 2` → high). The same `signals.residual` foundation that `signals.change_point` accumulates into sustained shifts — point deviation is the primitive, change-point the higher-order signal; neither imports the other.

## Latest trading day per venue
| Venue | Date | Status | Dir | z | Actual | Band | Reason (top) |
|---|---|---|---|---|---|---|---|
| The Beer Hall | 2026-07-05 | normal | — | -0.08 | 441.53 | -77.61–1053.51 | — |
| Ellel Village Hall | 2026-07-04 | normal | — | +0.67 | 284.03 | -387.55–417.55 | — |
| Two River Taps | 2026-07-05 | normal | — | -0.60 | 0.0 | -203.42–802.39 | — |

Trading days only (the shared stream excludes structural-zero days), so Ellel fires only on genuine booking days (FLAG-PD1). Attribution is correlational ('coincides with', never 'caused by' — FLAG-PD3). Sustained shifts are reported separately by `signals.change_point`.