# WP6 · ACI coverage across the two_river_taps closure

Closure date: **2026-05-08**. Nominal coverage 0.90 (alpha = 0.1). Walk-forward over the L1 residual stream (post-closure zero run included); coverage is on the one-step-ahead absolute residual. Report-only, no production code touched.

| Policy | pre-closure | post-closure (28d) | overall | ACI bound |
|---|---|---|---|---|
| static_0.90 | 0.944 | 0.550 | 0.891 | n/a |
| aci_gamma_0.005 | 0.932 | 0.500 | 0.881 | 0.618 |
| aci_gamma_0.01 | 0.928 | 0.450 | 0.881 | 0.311 |
| aci_gamma_0.02 | 0.920 | 0.500 | 0.887 | 0.157 |

Counts: 251 pre-closure, 20 in the 28 days post-closure, 293 evaluated overall.

Static and ACI held comparable post-closure coverage (static **0.550**, best ACI **0.500**); on this stream the closure breach is brief enough that the static band is not materially worse over the 28-day window.

The deterministic ACI miscoverage bound (max(alpha_1, 1 - alpha_1) + gamma) / (T gamma) is reported per gamma above; smaller gamma gives a tighter long-run bound but slower adaptation. Coverage plot: `eval/aci_closure_coverage.png`.