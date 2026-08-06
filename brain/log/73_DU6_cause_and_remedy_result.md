# 73 — D-U6 continued: the cause of the drift, and what a windowed pool actually buys

Extends `log/72`, which identified the violation as non-stationarity of the residual scale and
then bounded itself twice: it did not say **why** the scale moves, and it pointed at a windowed
calibration pool as the indicated remedy **without testing it**. Both bounds are now measured.
One of the two results goes against the earlier framing and is reported at the same length.

Runtime `.venv-forecast`, store ceiling 2026-07-07, point model `rung2_ets` at all three
venues. `eval/exchangeability_diagnostic.py` extended with `_level_coupling`,
`_partition_fidelity` and `_windowed_remedy`; artefact `eval/exchangeability_diagnostic.json`
regenerated. No served band changed.

## 1 · The cause, at two of three venues: it is the level of trade

The test is a comparison, not an assertion. Deflate each absolute residual by a trailing
28-day mean of the venue's own takings, taken strictly before the target date so nothing uses
information the band would not have had, then re-run the identical drift statistic. If the raw
residual drifts and the deflated one does not, the drift is a scale effect riding on the level.

| venue | level trend | level $\to$ residual | raw \|res\| drift | **deflated drift** | level Q1 $\to$ Q4 |
|---|---|---|---|---|---|
| beer_hall | +0.580 (1.7e-116) | +0.126 (6.4e-06) | +0.064 (0.021) | **−0.019 (0.502)** | 702.2 → 900.7 |
| two_river_taps | −0.817 (3.4e-227) | +0.075 (0.022) | −0.071 (0.030) | **+0.061 (0.061)** | 526.6 → 358.2 |
| ellel | +0.067 (0.020) | +0.083 (0.004) | +0.182 (1.7e-10) | **+0.171 (2.2e-09)** | 173.4 → 147.5 |

Spearman $\rho$ with $p$ in brackets.

**Beer Hall and Two River Taps: the drift dissolves under deflation.** At the Beer Hall a raw
drift significant at 0.021 becomes $\rho = -0.019$, $p = 0.502$ — not merely weaker but gone,
and the level rose 28 per cent across the window. At Two River Taps the level **fell** by a
third as the venue wound down toward its May closure, and the deflated drift is no longer
significant at the conventional level. Same mechanism, opposite signs, produced by the same
deflation.

**Ellel: not a level effect.** Its level is flat to slightly falling while its raw drift is the
strongest of the three, and deflation barely moves it ($+0.182 \to +0.171$). Whatever moves at
Ellel is not the level of trade, and this diagnostic does not identify it.

That asymmetry is the useful part rather than a gap. The two venues whose coverage departs from
nominal are the two whose drift is a level effect. The venue whose drift is **not** a level
effect is the venue whose coverage is fine. The explanation covers exactly the cases that need
explaining, which is a stronger position than one that covers all three.

## 2 · A second mechanism, and at the Beer Hall it is the larger one

The Mondrian partition groups by a **day-of-week structural-closure calendar**. The guarantee it
buys is within-group exchangeability, and a group defined by a calendar is exchangeable only so
far as the calendar is right.

| venue | calendar-closed days | of those, actually traded | rate | mean take | mean \|res\| there | mean \|res\| genuinely closed |
|---|---|---|---|---|---|---|
| beer_hall | 546 | **94** | **0.172** | 295.8 | **238.0** | 32.21 |
| two_river_taps | 410 | 65 | 0.159 | 214.1 | 154.3 | 22.49 |
| ellel | 520 | 21 | 0.040 | 321.8 | 317.5 | 5.04 |

At the Beer Hall, **17.2 per cent of the days the calendar calls closed actually traded**, and
the absolute residual on those days averages 238.0 against 32.21 on genuinely closed days — a
factor of 7.4. Those observations are drawn from the trading distribution and banded against a
group of near-zero residuals, so they are misses by construction rather than by bad luck. The
committed artefact records the consequence directly: the Beer Hall's structural-zero group
covers **0.840** on 500 banded pairs against 0.884 for the active group.

This is a distinct violation from the drift. The drift is non-stationarity within a correctly
specified group; this is a **misspecified group**, and no amount of recency weighting repairs it.

## 3 · The remedy, tested, and it does not do what `log/72` implied

`log/72` §5 pointed at a windowed or weighted calibration pool as what the finding "points at".
Capping the pool to the most recent $W$ residuals, changing nothing else:

| venue | expanding | $W=120$ | $W=180$ | $W=240$ | mean width, expanding → best |
|---|---|---|---|---|---|
| beer_hall | 0.8714 | 0.8760 | **0.8783** | 0.8783 | 960.6 → 1029.0 |
| two_river_taps | 0.9631 | **0.9089** | 0.9113 | 0.9176 | 535.0 → **468.6** |
| ellel | 0.9138 | 0.9234 | 0.9265 | 0.9192 | 513.4 → 608.1 |

**Two River Taps is a clean win and the only one.** Coverage moves from 0.963 to 0.909, which is
nominal, and the mean width *falls* from 535.0 to 468.6. Better calibrated and sharper at once,
which is the outcome a correct diagnosis should produce.

**The Beer Hall barely moves.** The window recovers 0.007 of a 0.029 shortfall, about a quarter,
and buys it with a 7 per cent wider band. The reason is visible in §1: the Beer Hall's *level*
trend is enormous ($\rho = +0.580$) but its *residual* drift is weak ($\rho = +0.064$), because
the level-to-residual coupling is only $+0.126$. Drift is a real contributor at the Beer Hall
and it is a minor one, and §2 is where the rest of that venue's shortfall lives.

**Ellel is made worse.** It starts nearest nominal, the window pushes it from 0.9138 to 0.9265
and widens the band by 18 per cent. A venue whose drift is not a level effect is a venue the
remedy has no purchase on, and forcing it there costs sharpness for a coverage move in the
wrong direction.

So the honest statement is not "a windowed pool fixes this". It is that a windowed pool fixes
the venue whose drift mechanism is strongest and cleanest, does little for the venue whose
shortfall is mostly a different mechanism, and harms the venue that had no problem. That the
remedy tracks the mechanism venue by venue is itself confirmation of the diagnosis; that it is
not a uniform improvement means it cannot be adopted estate-wide without per-venue tuning, and
per-venue tuning of a served band needs its own pre-registered gate.

## 4 · Corrections to `log/72`

| `log/72` said | Now |
|---|---|
| §5 "the finding does point at a **windowed or weighted** calibration pool" | Tested. It helps one venue, barely helps a second and harms the third. The pointer was too confident and is replaced by the table above |
| §5 "Nothing here identifies *why* the Beer Hall's error scale grows. Growth in trade is the obvious candidate and is not tested" | Tested and **supported**: deflating by the trailing level removes the drift entirely ($p = 0.502$). But the same test shows the drift explains only a quarter of that venue's shortfall |
| §4 "the pooled figure exceeds the active-only one, which says the closure group contributes exceedances of its own \dots but the finding does not depend on that" | It does now, and quantifiably. At the Beer Hall the closure group is the **larger** of the two mechanisms |

Nothing in `log/72` §3 changes. The rank-uniformity result and its agreement with the published
coverage at all three venues stand exactly as written.

## 5 · What may and may not be claimed

**May.** Two exchangeability violations are identified and separately measured. One is
non-stationarity of the residual scale, driven at two of three venues by the level of trade,
with the sign at each venue predicted and confirmed. The other is a misspecified Mondrian
partition, at a rate of 17.2 per cent of calendar-closed days at the Beer Hall.

**May not.** Ellel's drift is unexplained. The diagnostic rules out the level of trade there and
offers no substitute.

**May not.** No claim that either violation has been repaired. The window is a counterfactual
measurement on a diagnostic path, and the served band is untouched.

**Worth naming for the write-up.** The second mechanism has a cheaper remedy than the first: the
partition is derived from a day-of-week calendar, and 17 per cent of it is wrong at the anchor
venue. Deriving the group from observed trading rather than from the weekday would move those 94
observations into the group they belong to. That is a change to a served artefact and is
Further Work, not a result.

## 6 · Row status

| Item | Status |
|---|---|
| **D-U6** | **CLOSED, and now with a cause at two venues and a second mechanism at the third** |
| `log/72` §5 remedy pointer | **Superseded** by §3 above |
| New Further Work item | Partition the Mondrian groups by observed trading rather than by weekday |
