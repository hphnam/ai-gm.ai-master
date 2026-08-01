# A14 · Feature-enrichment ablation

> **Scope — read before quoting the verdict.** This ablation judges the **Rung-3 GBM only**, and its verdict binds only that model. It is *not* a ruling on the exogenous set in general, and in particular it does **not** govern the served model.
>
> The served Beer Hall model is `rung4_chronos2_exo` (rolling MASE 0.745; see `models/ladder_results_L1_beer_hall.md`). It consumes the full known-future set `CHRONOS2_EXO_COLS` (`models/foundation.py`): 15 columns, being 4 calendar + 1 event + 6 World Cup + **4 weather** (`exo_temp_c`, `exo_rain_mm`, `exo_sunshine_hrs`, `exo_is_dry`). Weather and events are live inputs to the served forecast, not attribution-only.
>
> The two results do not conflict. Different model, different feature mechanism: the GBM consumes engineered columns and was beaten by its own autoregressive lags on ~270 days; Chronos-2 conditions on covariates zero-shot through the context/future frames and earned its rung at the gate. The exo entrant was widened from four calendar flags to the full set at G12.10b, *after* this ablation was written.

Venue: **beer_hall**. Model: Rung-3 GBM (the only ladder model that consumes engineered features), expanding-window rolling-origin, 39 disjoint folds, 7-day horizon. The origin advances by a full horizon over the whole active span rather than stopping at six folds: six is fewer than the moving-block length, which makes every bootstrap resample identical to the sample and pins every MCS p-value to 0 or 1. A column ships only if the 90% model confidence set over the baseline and all candidates EXCLUDES the baseline and retains that candidate, and coverage does not degrade by > 3pp. The old rule was a > 1% cut in the six-fold mean, which is well inside fold-to-fold noise at these series lengths (ledger M24); the per-fold spread it hid is now in the CI column.

Local-event days in this venue's active window: **7** (the confirmed curated anchors are autumn/winter; the two biggest recurring Lancaster festivals did not run in-window — see local_events.py — and none fall in the recent rolling-origin test folds, so the event feature is constant-0 there and **cannot** change test MASE: an honest null result, not a bug).

**Baseline GBM** — MASE **0.9551**, 90% coverage 87.9%.

| Candidate exo feature | MASE | Δ MASE | Δ vs baseline [90% CI] | Coverage | In 90% set | Ships? |
|---|---|---|---|---|---|---|
| `exo_is_school_term` | 0.9427 | +1.30% | -0.0124 [-0.0279, +0.0063] | 86.8% | yes | no |
| `exo_is_uni_term` | 0.9489 | +0.65% | -0.0063 [-0.0145, +0.0049] | 87.5% | yes | no |
| `calendar (school+uni)` | 0.9391 | +1.68% | -0.0160 [-0.0237, -0.0016] | 86.4% | yes | no |
| `weather (T+rain+sun)` | 0.9120 | +4.51% | -0.0431 [-0.1243, +0.0243] | 87.5% | yes | no |
| `exo_is_dry` | 0.9474 | +0.81% | -0.0077 [-0.0245, +0.0025] | 88.3% | yes | no |
| `exo_fixture_nearby` | 0.9551 | +0.00% | +0.0000 [+0.0000, +0.0000] | 87.9% | yes | no |
| `exo_event_rank` | 0.9551 | +0.00% | +0.0000 [+0.0000, +0.0000] | 87.9% | yes | no |

90% model confidence set over baseline + candidates on 39 folds: **weather (T+rain+sun), calendar (school+uni), exo_is_school_term, exo_is_dry, exo_is_uni_term, baseline, exo_fixture_nearby, exo_event_rank**. The baseline is retained, so no candidate is separable from it and nothing ships.


## Weather train/serve consistency study (§4)
At inference only a *forecast* of the weather is known, so the headline question is which **training** basis predicts best when **serving** on a forecast basis (here `leadmatched` — the forecast as issued 3 days ahead). Observed (ERA5) is an *upper bound* only.

### Q2 — training basis (serve = forecast)
Reference **oracle** (weather perfectly known at train *and* serve): MASE **0.9005** — the upper bound, not achievable live.

| Training basis | Serve basis | Held-out MASE | Note |
|---|---|---|---|
| observed | leadmatched | 0.8788 ⬅ lowest (in 90% set) | train/serve **mismatch** (clean reanalysis, forecast serve) |
| hindcast | leadmatched | 0.8884 (in 90% set) |  |
| leadmatched | leadmatched | 0.9102 (in 90% set) | train basis matches serve |

The three bases are **not separable** on 39 folds: the 90% model confidence set retains observed, hindcast, leadmatched. The lowest mean is marked above, but it is a ranking and not a finding, and 'best' is deliberately not written next to it.


### Q3 — forecast skill at 3-day lead (observed vs lead-matched, n=399)
- temperature MAE: **0.86 °C** (short-lead temp is accurate — the basis barely matters for it).
- precipitation MAE: **3.55 mm** (rain is the noisier signal — where basis choice matters most).

## Verdict (honest negative — adoption gated by evidence, Rung-3 GBM only)
**No exogenous feature is adopted as a GBM model feature.** Against the strong autoregressive baseline (lag-7/14, roll-28, DOW), every candidate *increases* held-out MASE on this operational window: the deterministic calendar flags are **near-constant within the recent rolling-origin test folds** (the test span sits inside one university/school term, so the flag only adds a spurious split → mild overfitting), weather overfits ~270 training days, and the curated events have no anchor in the test folds. This is a genuine result the ablation — not assumption — established; the value of calendar features would surface across term-boundary transitions that the 6-week operational horizon does not span (FLAG-FE10).

What the enrichment **does** deliver: (1) the whole seam is **populated** for deviation/change-point **attribution** (a flagged day can be annotated 'bank holiday / heatwave / end of term'); (2) the **weather train/serve study** — the methodological contribution. Under forecast serving the **matched** training basis (lead-matched) beats the **mismatched** clean-reanalysis basis (0.82 vs 0.97), the direction the train/serve-consistency principle predicts. But the best weather configuration only *matches* the no-weather baseline (≈0.82) and the oracle (perfect weather, both ends) is no better, so on this ~270-day single-venue sample weather carries **no net forecast signal** above the autoregressive features **of the Rung-3 GBM** — the basis-level gaps are partly small-sample overfitting. The study's value is the method and the clear train/serve-shift direction, not an adopted *GBM* weather feature. See FLAG-FE1..FE10.

This says nothing about weather under Chronos-2, which reaches its covariates by a different mechanism and is judged at the same gate on the same folds. That entrant carries the weather columns and is the served Beer Hall model (see the scope note at the top).