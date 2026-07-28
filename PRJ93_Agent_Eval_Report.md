
## S1. Scaled injection run (dissertation-grade)

The N=4 smoke run above is a plumbing self-test; **this** is the citable run. The injection oracle is expanded to a **venue × kind × magnitude × onset × fold × direction grid** (**N=644** injections), exhaustive and deterministic (no RNG → no seed needed for Part A). Precision is judged on injection-attributable items; real-window background feeds the fatigue rate.

### S2. Detection (Wilson 95% CIs)

**Overall** (N=644): recall **0.804** [0.77, 0.83], precision 0.871, F1 0.836.

| By kind | N | Recall | 95% CI | Precision | F1 |
|---|---|---|---|---|---|
| exo_coincident | 84 | 1.000 | [0.96, 1.00] | 0.833 | 0.909 |
| regime_shift | 252 | 0.996 | [0.98, 1.00] | 0.877 | 0.933 |
| spike | 288 | 0.566 | [0.51, 0.62] | 0.869 | 0.685 |
| stock_drawdown | 20 | 1.000 | [0.84, 1.00] | 1.000 | 1.000 |

| By venue | N | Recall | 95% CI | Precision | F1 |
|---|---|---|---|---|---|
| beer_hall | 356 | 0.815 | [0.77, 0.85] | 0.922 | 0.865 |
| ellel | 36 | 0.639 | [0.48, 0.78] | 0.550 | 0.591 |
| two_river_taps | 252 | 0.813 | [0.76, 0.86] | 0.834 | 0.824 |

### S3. Sensitivity curve — catch rate vs event magnitude (the headline)

How subtle an event the brain catches before it misses. The **near-threshold** row (smallest magnitude) is the honest hard case; a large-only detector would still score 1.0 on easy injections.

**exo_coincident · beer_hall**

| magnitude | catch rate | N | 95% CI |
|---|---|---|---|
| z=1 | 1.000 | 8 | [0.68, 1.00] |
| z=1.25 | 1.000 | 8 | [0.68, 1.00] |
| z=1.5 | 1.000 | 8 | [0.68, 1.00] |
| z=2 | 1.000 | 8 | [0.68, 1.00] |
| z=3 | 1.000 | 8 | [0.68, 1.00] |
| z=4 | 1.000 | 8 | [0.68, 1.00] |

**exo_coincident · two_river_taps**

| magnitude | catch rate | N | 95% CI |
|---|---|---|---|
| z=1 | 1.000 | 6 | [0.61, 1.00] |
| z=1.25 | 1.000 | 6 | [0.61, 1.00] |
| z=1.5 | 1.000 | 6 | [0.61, 1.00] |
| z=2 | 1.000 | 6 | [0.61, 1.00] |
| z=3 | 1.000 | 6 | [0.61, 1.00] |
| z=4 | 1.000 | 6 | [0.61, 1.00] |

**regime_shift · beer_hall**

| magnitude | catch rate | N | 95% CI |
|---|---|---|---|
| z=1 | 0.958 | 24 | [0.80, 0.99] |
| z=1.25 | 1.000 | 24 | [0.86, 1.00] |
| z=1.5 | 1.000 | 24 | [0.86, 1.00] |
| z=2 | 1.000 | 24 | [0.86, 1.00] |
| z=3 | 1.000 | 24 | [0.86, 1.00] |
| z=4 | 1.000 | 24 | [0.86, 1.00] |

**regime_shift · two_river_taps**

| magnitude | catch rate | N | 95% CI |
|---|---|---|---|
| z=1 | 1.000 | 18 | [0.82, 1.00] |
| z=1.25 | 1.000 | 18 | [0.82, 1.00] |
| z=1.5 | 1.000 | 18 | [0.82, 1.00] |
| z=2 | 1.000 | 18 | [0.82, 1.00] |
| z=3 | 1.000 | 18 | [0.82, 1.00] |
| z=4 | 1.000 | 18 | [0.82, 1.00] |

**spike · beer_hall**

| magnitude | catch rate | N | 95% CI |
|---|---|---|---|
| z=1 | 0.375 | 24 | [0.21, 0.57] |
| z=1.25 | 0.458 | 24 | [0.28, 0.65] |
| z=1.5 | 0.542 | 24 | [0.35, 0.72] |
| z=2 | 0.583 | 24 | [0.39, 0.76] |
| z=3 | 0.667 | 24 | [0.47, 0.82] |
| z=4 | 0.667 | 24 | [0.47, 0.82] |

**spike · ellel**

| magnitude | catch rate | N | 95% CI |
|---|---|---|---|
| z=1 | 0.500 | 6 | [0.19, 0.81] |
| z=1.25 | 0.500 | 6 | [0.19, 0.81] |
| z=1.5 | 0.500 | 6 | [0.19, 0.81] |
| z=2 | 0.667 | 6 | [0.30, 0.90] |
| z=3 | 0.833 | 6 | [0.44, 0.97] |
| z=4 | 0.833 | 6 | [0.44, 0.97] |

**spike · two_river_taps**

| magnitude | catch rate | N | 95% CI |
|---|---|---|---|
| z=1 | 0.333 | 18 | [0.16, 0.56] |
| z=1.25 | 0.444 | 18 | [0.25, 0.66] |
| z=1.5 | 0.611 | 18 | [0.39, 0.80] |
| z=2 | 0.667 | 18 | [0.44, 0.84] |
| z=3 | 0.667 | 18 | [0.44, 0.84] |
| z=4 | 0.667 | 18 | [0.44, 0.84] |

**stock_drawdown · beer_hall**

| magnitude | catch rate | N | 95% CI |
|---|---|---|---|
| doc=-2 | 1.000 | 4 | [0.51, 1.00] |
| doc=-1 | 1.000 | 4 | [0.51, 1.00] |
| doc=0 | 1.000 | 4 | [0.51, 1.00] |
| doc=1 | 1.000 | 4 | [0.51, 1.00] |
| doc=2 | 1.000 | 4 | [0.51, 1.00] |

**Near-threshold operating points** (the hard case):

| kind / venue | magnitude | catch rate | N | 95% CI |
|---|---|---|---|---|
| exo_coincident/beer_hall | 1 | 1.000 | 8 | [0.68, 1.00] |
| exo_coincident/two_river_taps | 1 | 1.000 | 6 | [0.61, 1.00] |
| regime_shift/beer_hall | 1 | 0.958 | 24 | [0.80, 0.99] |
| regime_shift/two_river_taps | 1 | 1.000 | 18 | [0.82, 1.00] |
| spike/beer_hall | 1 | 0.375 | 24 | [0.21, 0.57] |
| spike/ellel | 1 | 0.500 | 6 | [0.19, 0.81] |
| spike/two_river_taps | 1 | 0.333 | 18 | [0.16, 0.56] |
| stock_drawdown/beer_hall | 2 | 1.000 | 4 | [0.51, 1.00] |

### S4. Regime/exo detection latency by magnitude bin

| magnitude bin | N | median delay (d) | IQR | min–max |
|---|---|---|---|---|
| large (|z|>2) | 112 | 2 | [1, 3] | 1–7 |
| mid (1.25<|z|≤2) | 100 | 3 | [3, 5] | 1–11 |
| near-threshold (|z|≤1.25) | 71 | 6 | [3, 11] | 2–21 |

### S5. Ranking across many multi-event days

Over **N=7** synthetic multi-event days (one per usable fold per net-sales venue): mean NDCG **1.000**, mean Spearman **1.000** (a shift should rank above a coincident spike).

### S6. Alert fatigue + cost (scaled corpus)

False-alarm upper bound **0.667/week**. Cost = ratio·misses + 1·false-alarms:

| miss : false-alarm | misses | false-alarms | weighted cost | dominant |
|---|---|---|---|---|
| 1 : 1 | 126 | 8 | 134.0 | misses |
| 2 : 1 | 126 | 8 | 260.0 | misses |
| 5 : 1 | 126 | 8 | 638.0 | misses |
| 10 : 1 | 126 | 8 | 1268.0 | misses |

### S6b. VUS-PR (detector-level supplement, continuous z score)

The system-level battery above remains the headline (fixed-threshold detectors, discrete surfaced events). VUS-PR is a lag-tolerant, random-robust supplement on the continuous z score, computed by the pinned TSB-AD library (VUS fallback), never reimplemented here.

**VUS-PR: not computed, dependency unavailable.** Install `TSB-AD` (or the pinned `vus` fallback) from requirements-eval.txt to populate this table; the metric is deliberately not approximated by hand.

### S7. Caveats (honest small-N)

- **Two River Taps** is closed (active to 2026-05-08); only PRE-closure folds are injected, so its N is smaller and post-closure behaviour is out of scope.
- **Ellel** is booking-driven and sparse: its residual stream leaves a single short held-out fold, too short to test a sustained shift, so it is **spike-only** and flagged small-N — not a detector failure, a data limit.
- Sensitivity cells with small N carry wide Wilson intervals by construction; read the interval, not the point estimate.
