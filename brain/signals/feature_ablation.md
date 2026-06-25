# A14 · Feature-enrichment ablation

Venue: **beer_hall**. Model: Rung-3 GBM (the only ladder model that consumes engineered features), expanding-window rolling-origin, 6 folds, 7-day horizon. A column ships only if it cuts mean held-out MASE by > 1% without degrading coverage by > 3pp.

Local-event days in this venue's active window: **7** (the confirmed curated anchors are autumn/winter; the two biggest recurring Lancaster festivals did not run in-window — see local_events.py — and none fall in the recent rolling-origin test folds, so the event feature is constant-0 there and **cannot** change test MASE: an honest null result, not a bug).

**Baseline GBM** — MASE **0.8159**, 90% coverage 88.1%.

| Candidate exo feature | MASE | Δ MASE | Coverage | Ships? |
|---|---|---|---|---|
| `exo_is_school_term` | 0.8322 | -2.00% | 88.1% | no |
| `exo_is_uni_term` | 0.8657 | -6.11% | 85.7% | no |
| `calendar (school+uni)` | 0.8212 | -0.65% | 85.7% | no |
| `weather (T+rain+sun)` | 0.9801 | -20.12% | 83.3% | no |
| `exo_is_dry` | 0.8446 | -3.52% | 88.1% | no |
| `exo_fixture_nearby` | 0.8159 | +0.00% | 88.1% | no |
| `exo_event_rank` | 0.8159 | +0.00% | 88.1% | no |

## Weather train/serve consistency study (§4)
At inference only a *forecast* of the weather is known, so the headline question is which **training** basis predicts best when **serving** on a forecast basis (here `leadmatched` — the forecast as issued 3 days ahead). Observed (ERA5) is an *upper bound* only.

### Q2 — training basis (serve = forecast)
Reference **oracle** (weather perfectly known at train *and* serve): MASE **0.9270** — the upper bound, not achievable live.

| Training basis | Serve basis | Held-out MASE | Note |
|---|---|---|---|
| observed | leadmatched | 0.9690 | train/serve **mismatch** (clean reanalysis, forecast serve) |
| hindcast | leadmatched | 0.9071 |  |
| leadmatched | leadmatched | 0.8160 ⬅ best | train basis matches serve |

### Q3 — forecast skill at 3-day lead (observed vs lead-matched, n=362)
- temperature MAE: **0.89 °C** (short-lead temp is accurate — the basis barely matters for it).
- precipitation MAE: **3.48 mm** (rain is the noisier signal — where basis choice matters most).

## Verdict (honest negative — adoption gated by evidence)
**No exogenous feature is adopted as a GBM model feature.** Against the strong autoregressive baseline (lag-7/14, roll-28, DOW), every candidate *increases* held-out MASE on this operational window: the deterministic calendar flags are **near-constant within the recent rolling-origin test folds** (the test span sits inside one university/school term, so the flag only adds a spurious split → mild overfitting), weather overfits ~270 training days, and the curated events have no anchor in the test folds. This is a genuine result the ablation — not assumption — established; the value of calendar features would surface across term-boundary transitions that the 6-week operational horizon does not span (FLAG-FE10).

What the enrichment **does** deliver: (1) the whole seam is **populated** for deviation/change-point **attribution** (a flagged day can be annotated 'bank holiday / heatwave / end of term'); (2) the **weather train/serve study** — the methodological contribution. Under forecast serving the **matched** training basis (lead-matched) beats the **mismatched** clean-reanalysis basis (0.82 vs 0.97), the direction the train/serve-consistency principle predicts. But the best weather configuration only *matches* the no-weather baseline (≈0.82) and the oracle (perfect weather, both ends) is no better, so on this ~270-day single-venue sample weather carries **no net forecast signal** above the autoregressive features — the basis-level gaps are partly small-sample overfitting. The study's value is the method and the clear train/serve-shift direction, not an adopted weather feature. See FLAG-FE1..FE10.