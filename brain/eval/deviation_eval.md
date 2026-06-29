# Point deviation — per-day band check

Per-day classification on the shared standardised conformal residual stream `z = (actual − DOW-median) / conformal half-band@90%` (`|z| > 1` → deviation, `|z| > 2` → high). The same `signals.residual` foundation that `signals.change_point` accumulates into sustained shifts — point deviation is the primitive, change-point the higher-order signal; neither imports the other.

## Latest trading day per venue
| Venue | Date | Status | Dir | z | Actual | Band | Reason (top) |
|---|---|---|---|---|---|---|---|
| The Beer Hall | 2026-05-31 | normal | — | -0.25 | 342.25 | -71.16–1038.46 | — |
| Ellel Village Hall | 2026-05-16 | deviation | up | +6.22 | 2017.96 | -27.06–539.35 | no coincident calendar/weather/event/promo signal — likely an operational or competitive change worth investigating |
| Two River Taps | 2026-05-31 | normal | — | -0.66 | 0.0 | -162.06–798.61 | — |

Trading days only (the shared stream excludes structural-zero days), so Ellel fires only on genuine booking days (FLAG-PD1). Attribution is correlational ('coincides with', never 'caused by' — FLAG-PD3). Sustained shifts are reported separately by `signals.change_point`.