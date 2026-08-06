# R9 result — the functional minimal pair

Run 2026-08-06. Pre-registered at decision-log **row 77**, commit **`c098fba`**, before
`rung1_mean_dow` existed. Scored below against the five predictions **as written**,
including the two that failed.

## Provenance

| Field | Value |
|---|---|
| Command | `.venv-forecast/bin/python -m eval.functional_pair` |
| Venv | `.venv-forecast` — Python 3.12.13, numpy 2.5.1, pandas 3.0.3, statsmodels 0.14.6 |
| Store ceiling | 2026-07-07 |
| Wall clock | **760.7 s (12.7 min)** — inside the pre-registered 30-minute abort |
| Folds | beer_hall 273, ellel 266, two_river_taps 205; horizon 7, min train 120, step 1 |
| Artefacts | `eval/functional_pair.md`, `eval/functional_pair.json` |
| New rung | `models/ladder.py::rung1_mean_dow` — reported, never served |

**Control on the manipulation.** `rung1_robust_dow` was refactored onto a shared
`_dow_profile(train, target, agg)` path so the two arms differ in exactly one argument.
Verified **bit-identical** to the pre-refactor median arm (max abs diff **0.0** across 6
Beer Hall folds). The aggregator swap is applied at all four central-tendency sites in the
rung — DOW statistic, overall, monthly index, bank-holiday ratio — because switching only
the `groupby` would leave a median/mean hybrid and the manipulation would not be clean.

## Results

Bias = mean signed residual (actual − forecast). Positive means the forecast sits **below**
the actual.

| venue | folds | arm | bias | 95% CI | p | absolute metric | squared metric |
|---|---|---|---|---|---|---|---|
| beer_hall | 273 | median | **+67.67** | [+48.9, +86.4] | 1.9e-12 | MASE 0.6578 | RMSSE 0.6189 |
| beer_hall | 273 | mean | **+24.65** | [+6.2, +43.2] | 9.0e-03 | MASE 0.6670 | RMSSE 0.6132 |
| two_river_taps | 205 | median | **−29.46** | [−39.4, −19.5] | 8.6e-09 | MASE 0.7805 | RMSSE 0.5574 |
| two_river_taps | 205 | mean | **−41.69** | [−51.6, −31.8] | 3.6e-16 | MASE 0.7862 | RMSSE 0.5560 |
| ellel | 266 | median | **+75.09** | [+59.7, +90.5] | 3.4e-21 | MAE 105.98 | RMSE 236.89 |
| ellel | 266 | mean | **−39.83** | [−56.8, −22.8] | 4.6e-06 | MAE 166.64 | RMSE 306.51 |

Paired per-fold differences (mean arm − median arm):

| venue | absolute metric | squared metric |
|---|---|---|
| beer_hall | +0.0092 [−0.0093, +0.0277], p 0.327 | −0.0056 [−0.0216, +0.0103], p 0.488 |
| two_river_taps | +0.0057 [−0.0189, +0.0303], p 0.649 | −0.0015 [−0.0166, +0.0137], p 0.850 |
| ellel | **+60.66 [+50.4, +70.9], p 1.7e-25** | **+69.62 [+49.6, +89.7], p 5.4e-11** |

## Scored against the pre-registered predictions

| # | Prediction | Verdict |
|---|---|---|
| (i) | Mean arm less biased at **every** venue; median arm's bias **positive** | **PARTIALLY FALSIFIED.** Holds at Beer Hall (+43.02) and Ellel (+35.26). **Fails at Two River Taps on both limbs**: the mean arm is MORE biased (−12.23), and the median arm's bias is **negative** (−29.46), not positive |
| (ii) | Under the absolute metric, median ≥ mean | **HOLDS at all three** — though non-significant at the two scaled venues |
| (iii) | Under the squared metric, mean better | **HOLDS at both scaled venues** (non-significant); **FAILS at Ellel**, decisively and in the opposite direction (p 5.4e-11) |
| (iv) | **The crossing — load-bearing** | **OBSERVED at both scaled venues, at neither leg significant.** Not observed at Ellel |
| (v) | Ellel shows the largest bias gap and the largest metric divergence | **SPLIT.** Largest metric divergence by two orders of magnitude — yes, overwhelmingly. Largest bias gap — **no**, Beer Hall's is larger (+43.02 against +35.26). Flagged least certain in advance |

## What this licenses, stated at the strength the data supports

**The crossing is a direction, not a demonstrated effect.** It appears at both venues where
the pre-registered metric axis applies, in the predicted orientation, on a controlled
manipulation — and all four paired intervals contain zero. The honest statement is: *on the
one manipulation that isolates the functional, each functional was better on the metric
that elicits it, at both scaled venues, and the per-fold differences are not separable from
zero.* Replication of direction across two independent venues is worth something; it is not
worth the word "shows".

**The bias result is much stronger than the accuracy result, and it is the real finding.**
At Beer Hall the median arm is biased +67.67 and the mean arm +24.65 — the functional swap
removes roughly two-thirds of the bias while moving MASE by 0.009. That is the mismatch
made visible: the ruler is nearly indifferent between two forecasters whose bias differs by
a factor of three. **That is precisely the concealment the design was built to expose**, and
it is the sentence the methodology needs.

**Two River Taps falsifies the right-skew mechanism, and this must not be smoothed over.**
The pre-registered reasoning was that a median sits below the mean on right-skewed revenue,
so the median arm should be biased positive. At TRT it is biased **negative**, and the mean
arm is worse still. The mechanism does not hold at one of three venues and the run offers no
explanation for it. Reported as a failure of the stated mechanism, not re-described as a
success. TRT is the venue that closed in May 2026, so its series is truncated — that is a
hypothesis, not a finding, and nothing here tests it.

**Ellel is the most informative cell and it inverts the whole argument.** At roughly 82%
zero days the DOW mean is dramatically worse on **both** metrics (MAE 105.98 → 166.64,
RMSE 236.89 → 306.51, both overwhelmingly significant). The mean is dragged up by rare large
trading days and predicts non-zero revenue on days that are actually £0. So at extreme
intermittency the elicitation argument is **overwhelmed**: the mean is simply a bad
forecaster there whatever the ruler. This is Chatfield's all-zero result appearing in this
estate's own data, and it is independent empirical support for the G2 decision to take Ellel
off scaled error entirely.

**The generalisation check behaves as the design predicted it would — inconclusively.**
Across the confounded ladder arms the mean-functional rungs do not uniformly show lower
bias: `rung2_ets` (mean) is biased +46.98 at Beer Hall, *more* than `rung1_mean_dow`'s
+24.65 and less than `rung1_robust_dow`'s +67.67; `rung3_gbm` (mean) is +28.98 at Beer Hall
but −37.33 at Ellel. Family, capacity, feature access and fit procedure vary alongside the
functional, so no causal reading is available from it. That is why the minimal pair exists,
and running both was the right call.

## A defect in this report's own generator, found and fixed

The first emission printed *"positive = mean arm less biased, as predicted"* unconditionally
— including at Two River Taps, where the value is **negative** and the prediction failed. A
generator asserting a conclusion its own number contradicts is the exact defect class this
project has now caught three times (report 57's `weather_diagnostic`, R2's "covariates
HELP", and this). Fixed to branch on the sign and to name the prediction as HOLDS or FAILS,
and to append the non-significance caveat wherever the crossing is reported. The corrected
report was re-emitted **from the stored JSON, with no re-run**, so the numbers are the
pre-registered ones.

## Commitments discharged

- The median arm is reported at equal prominence. It wins the absolute metric at all three
  venues and wins **both** metrics at Ellel.
- Null and negative cells carry the same prominence as positive ones: two of five
  predictions failed in part, and the load-bearing one is non-significant. All stated above
  before any interpretation.
- **Served-model selection is not revisited.** `rung1_mean_dow` is reported and never
  served; no retained set and no served model changes on account of this run.
