# A13 · Change-point / regime-shift detection

Sustained shifts on the standardised conformal residual stream `z = (actual − DOW-median) / conformal half-band@90%`. Two production detectors — two-sided **CUSUM** (drift) + **k-of-n persistence** (4/7, abrupt) — with **BOCPD** as a benchmark. Each shift is **attributed** against the A14 exogenous seam (correlational — 'coincides with', never 'caused by'; weather weighted to draught layers per A14b).

## Recalibration loop (T4)
A confirmed shift sets `recalibration_needed=TRUE`: the learned 'normal' (DOW baseline + conformal calibration set) is stale from the onset. The minimum behaviour shipped here is the flag + a degraded-confidence note until 28 post-change days accrue; automatic re-fit on the post-change window is future work (FLAG-CP3).

## Detected change points
| Venue | Onset | Detected | Δdays | Dir | Mag (band/%) | Detector | Sev | Attribution (top) |
|---|---|---|---|---|---|---|---|---|
| The Beer Hall | 2025-12-27 | 2026-01-03 | 7 | down | -0.68 / -29% | persistence | medium | coincides with a cold snap (~6°C vs 13°C avg) |
| Two River Taps | 2025-11-01 | 2026-01-03 | 63 | down | -0.58 / -26% | cusum | low | coincides with a school term↔holiday transition |
| Two River Taps | 2026-05-08 | 2026-05-16 | 8 | down | -1.12 / -71% | both | medium | coincides with Two River Taps's closure (structural break) |

Detection is leakage-free (expanding one-step-ahead) and runs on trading days only. Scope: Beer Hall + Two River Taps (CUSUM+persistence); Ellel is persistence-only (sparse, booking-driven — FLAG-CP2). TRT's closure is the ground-truth structural break (see change_point_eval.md). Point anomalies remain served by `/deviation/check`; this is the complementary sustained-shift layer.