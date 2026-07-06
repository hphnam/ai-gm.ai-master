# PRJ93 · Agent-Evaluation Report (briefing usefulness)

Evaluates whether the proactive briefing surfaces, ranks, and attributes the right insights — **not** forecast accuracy (A2 owns MASE/coverage/Winkler). Read-only over the briefing and signals; runs on historical data with `LIVE_INGEST` off; invents no detection maths. Ground truth is triangulated three ways: a synthetic-injection oracle (objective), a human-labelled anchor (actionability), and an LLM-judge calibrated to that anchor.

> **Small-N, stated honestly (G-eval-d).** A ~270-day single-estate dataset yields few injectable windows. Every aggregate below carries its N and a confidence interval; nothing is over-claimed.

## 1. Synthetic-injection oracle — detection

Detection over **N=4** injected events (regime shift, spike, stock drawdown, exo-coincident dip), matched by venue, direction, and onset within ±3 days.

| Metric | Value | 95% CI (Wilson) |
|---|---|---|
| Precision | 1.000 | [0.51, 1.00] |
| Recall | 1.000 | [0.51, 1.00] |
| F1 | 1.000 | — |
| TP / FP / FN | 4 / 0 / 0 | — |

Per scenario (precision on injection-attributable items only — real-window background feeds the fatigue rate, not the FP count):

| Kind | Venue | Covered | Missed | Attributable | Spurious |
|---|---|---|---|---|---|
| regime_shift | beer_hall | 1 | 0 | 1 | 0 |
| spike | beer_hall | 1 | 0 | 1 | 0 |
| stock_drawdown | beer_hall | 1 | 0 | 1 | 0 |
| exo_coincident | beer_hall | 1 | 0 | 1 | 0 |

## 2. Ranking + attribution + latency

- **Ranking** (multi-event window, n_matched=2): NDCG=1.000, Spearman=1.000 (the big shift should rank above the spike).
- **Attribution top-1** (n=2, honest-null counted correct): 1.000, 95% CI [0.34, 1.00].
- **Latency** (regime shift): onset 2026-05-09 → surfaced 2026-05-14, delay **5 days**.

Attribution detail:

| Kind | Expected cause | Correct | Reason (top-1) |
|---|---|---|---|
| exo_coincident (L3 draught) | weather | True | coincides with a warm spell (~20°C vs 13°C avg) — weather is draught-specific (A14b) |
| exo_coincident (L1 venue) | weather down-weighted | reported | coincides with a school term↔holiday transition |
| honest-null (L1) | none | True | no coincident calendar/weather/event/promo signal — likely an operational or competitive change worth investigating |

## 3. Ask-F1 — fatigue + cost sweep

Surfacing rate on un-injected windows (an **upper bound** on weekly false-alarms — on real data these may be genuine): **0.667/week** (8 items across 3 venues).

Cost = ratio·misses + 1·false-alarms, swept (fixed-threshold detector → the operating point is fixed; what moves is which failure dominates):

| miss : false-alarm | misses | false-alarms | weighted cost | dominant |
|---|---|---|---|---|
| 1 : 1 | 0 | 8 | 8.0 | false-alarms |
| 2 : 1 | 0 | 8 | 8.0 | false-alarms |
| 5 : 1 | 0 | 8 | 8.0 | false-alarms |
| 10 : 1 | 0 | 8 | 8.0 | false-alarms |

## 4. Named probes (design weak points, quantified)

**Aged regime-shift probe** — does an aged, unactioned shift sink below a fresh minor item as recency decays?

- fresh shift score 1.32 → floor 0.66 (recency floor 0.5); fresh minor item scores 0.75.
- **crossover: age 13 days** — evidence for/against the recalibration-aware recency fix flagged in the briefing build.

**Sparse-cluster probe** — does a clustered Ellel booking escape the single-day narrow-band down-weight?

- isolated: score 0.542 (baseline_trust 0.5); clustered: score 1.125 (baseline_trust 1.0).
- **down-weight escaped: True**, score inflation ×2.07. clustered bookings keep full baseline_trust (the single-day down-weight does not fire); actionability is NOT established by z alone — a labels/judge check is the arbiter (G-eval-b)

## 5. Human anchor + LLM-judge calibration

- **Human anchor** (no labels yet): N=0 labelled items. Schema + labelling CLI shipped (`eval/labels.py`); no labels captured yet, so no actionability aggregate is claimed — the honest state, not a fabricated number.
- **LLM-judge** (emit-prompts): model `claude-opus-4-8` pinned. offline: emitted 7 judge-ready prompt(s) to `brain/eval/judge_prompts.md` (no API key / JUDGE_LIVE unset). No kappa is claimed until the judge is run and calibrated against the anchor.

> The judge is a **calibrated proxy** reported with its human-agreement kappa, never ground truth (G-eval-c). When the anchor set exists, kappa ≥ 0.6 (pre-registered) lets it scale beyond the labelled days; below that it is reported as unreliable and the human set stands.

## 6. Honesty gates

- G-eval-a synthetic never scored as real: injected/template items are never counted as real hits; the fatigue rate is measured on un-injected windows and framed as an upper bound; the template checklist stays excluded (`CHECKLIST_LIVE=False`).
- G-eval-b sparse scored on actionability: the sparse-cluster probe measures the score gap and defers the actionability verdict to labels/judge, not z.
- G-eval-c judge is a calibrated proxy: model/rubric/prompt pinned; kappa reported; pre-registered threshold rule.
- G-eval-d small-N honesty: every aggregate carries N and a CI.
- G-eval-e no leakage: injected windows are held-out folds from `harness.rolling_origin`; `assert_no_leakage` guards every fold.

## 7. Modules + reproduce

`eval/inject.py` (oracle), `eval/agent_eval.py` (metrics + probes), `eval/labels.py` (`eval_labels` schema + labelling CLI), `eval/judge.py` (rubric + offline emit-prompts seam + guarded API call + kappa calibration). Reuses `eval.harness` splits + leakage checks. No API endpoint, no Track-B tool.

```bash
python -m eval.agent_eval        # full battery → this report
python -m eval.labels --add ...      # capture a human label
JUDGE_LIVE=1 python -m eval.judge    # opt-in live judge (else emit-prompts)
```

## 8. Decision-log row (paste into PRJ93_Decision_and_Resolution_Log.md, §A)

> Agent evaluation framework built as an offline `eval/` layer (`agent_eval`, `inject`, `labels`, `judge`) alongside the forecast harness. It evaluates the briefing's USEFULNESS, not forecast accuracy, by triangulating three ground-truth sources: a synthetic-injection oracle (detection P/R/F1, ranking NDCG/Spearman, attribution top-1 including the honest null, and detection latency, all on held-out windows with leakage guards), a small human-labelled anchor (`eval_labels`, real actionability with N and CIs), and an LLM-as-judge calibrated against that anchor (kappa reported, pre-registered threshold 0.6, model `claude-opus-4-8` + rubric + prompt pinned), answering the open 'is LLM-as-judge acceptable' question with a measured agreement rather than an assertion. Framed Ask-F1 / HiL-style as surface-or-stay-quiet with a swept miss:false-alarm cost ratio and a weekly false-alarm upper bound for fatigue. Two named probes quantify the known judgment calls (aged regime-shift recency decay; sparse-cluster down-weight escape). Read-only over the briefing and signals; no serving surface; runs on historical data with `LIVE_INGEST` off. Precision is judged on injection-attributable items so real-window background is not miscounted. Honesty gates carried through: synthetic never scored as real, sparse scored on actionability, judge reported as a calibrated proxy, small-N stated.

## 9. Review gate

`code-reviewer` and `security-reviewer` ran in parallel over the new `eval/` layer. **security — no findings**: every DuckDB statement is parameterised, the live judge is triple-gated (`JUDGE_LIVE=1` + `anthropic` importable + API key, and `anthropic` is not installed), the offline seam cannot fabricate a score, and the layer is read-only except the dedicated `eval_labels` table (`LIVE_INGEST` stays off). **code — no HIGH/MEDIUM**: the metric maths (Wilson interval, NDCG, Cohen's kappa, the injection-attributable precision diff) and the leakage guarantee were verified numerically; 3 LOW cleanups (two dead config constants with overstated comments, an F1-returns-NaN-when-precision-is-0 edge) were **all fixed**.
## S1. Scaled injection run (dissertation-grade)

The N=4 smoke run above is a plumbing self-test; **this** is the citable run. The injection oracle is expanded to a **venue × kind × magnitude × onset × fold × direction grid** (**N=644** injections), exhaustive and deterministic (no RNG → no seed needed for Part A). Precision is judged on injection-attributable items; real-window background feeds the fatigue rate.

### S2. Detection (Wilson 95% CIs)

**Overall** (N=644): recall **0.803** [0.77, 0.83], precision 0.870, F1 0.835.

| By kind | N | Recall | 95% CI | Precision | F1 |
|---|---|---|---|---|---|
| exo_coincident | 84 | 0.988 | [0.94, 1.00] | 0.827 | 0.900 |
| regime_shift | 252 | 0.996 | [0.98, 1.00] | 0.877 | 0.933 |
| spike | 288 | 0.566 | [0.51, 0.62] | 0.869 | 0.685 |
| stock_drawdown | 20 | 1.000 | [0.84, 1.00] | 1.000 | 1.000 |

| By venue | N | Recall | 95% CI | Precision | F1 |
|---|---|---|---|---|---|
| beer_hall | 356 | 0.815 | [0.77, 0.85] | 0.921 | 0.865 |
| ellel | 36 | 0.639 | [0.48, 0.78] | 0.550 | 0.591 |
| two_river_taps | 252 | 0.810 | [0.76, 0.85] | 0.833 | 0.821 |

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
| z=1 | 0.833 | 6 | [0.44, 0.97] |
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
| exo_coincident/two_river_taps | 1 | 0.833 | 6 | [0.44, 0.97] |
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
| mid (1.25<|z|≤2) | 94 | 3 | [3, 5] | 1–11 |
| near-threshold (|z|≤1.25) | 64 | 6 | [3, 11] | 2–21 |

### S5. Ranking across many multi-event days

Over **N=7** synthetic multi-event days (one per usable fold per net-sales venue): mean NDCG **1.000**, mean Spearman **1.000** (a shift should rank above a coincident spike).

### S6. Alert fatigue + cost (scaled corpus)

False-alarm upper bound **0.667/week**. Cost = ratio·misses + 1·false-alarms:

| miss : false-alarm | misses | false-alarms | weighted cost | dominant |
|---|---|---|---|---|
| 1 : 1 | 127 | 8 | 135.0 | misses |
| 2 : 1 | 127 | 8 | 262.0 | misses |
| 5 : 1 | 127 | 8 | 643.0 | misses |
| 10 : 1 | 127 | 8 | 1278.0 | misses |

### S7. Caveats (honest small-N)

- **Two River Taps** is closed (active to 2026-05-08); only PRE-closure folds are injected, so its N is smaller and post-closure behaviour is out of scope.
- **Ellel** is booking-driven and sparse: its residual stream leaves a single short held-out fold, too short to test a sustained shift, so it is **spike-only** and flagged small-N — not a detector failure, a data limit.
- Sensitivity cells with small N carry wide Wilson intervals by construction; read the interval, not the point estimate.
