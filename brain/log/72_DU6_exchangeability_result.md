# 72 — D-U6: the exchangeability violation behind the Beer Hall under-coverage, identified

Closes **D-U6**, the last conformance row that was open on analysis rather than on a third
party. `sec:res-undercoverage` had established the shortfall, its size, its direction, its
persistence across horizon steps and its reproduction on a second point forecaster, and then
concluded only that *"exchangeability is violated in these residuals"*. Which violation was
never named. It is named here.

Runtime `.venv-forecast` (Py 3.12.13, numpy 2.5.1, pandas 3.0.3), store ceiling 2026-07-07,
`mps`. New module `eval/exchangeability_diagnostic.py`; artefact
`eval/exchangeability_diagnostic.json`. No band was re-fitted, no reported figure restated,
and the point model is `rung2_ets` at all three venues — the same `conformal.wrap.default_model`
the calibration study used.

## 1 · The hypothesis, and why the band's own construction makes it the candidate

The calibration pool is **expanding**, not a fixed split: `interval_calibration.run_online`
admits every residual whose target date the origin has already observed, so the quantile at any
origin is estimated over the venue's entire past. That construction has one specific failure
mode. If the residual scale drifts upward over time, the quantile is held down by older and
smaller residuals, and the band is systematically too narrow for the present.

The hypothesis is therefore not "something about this venue is odd". It is a named property of
the pooling rule interacting with a named property of the series, and it predicts a **sign** at
each venue rather than a shortfall at one.

## 2 · The estate supplies its own control

This is what makes the finding an identification rather than a story fitted to one venue. One
mechanism has to produce three different signs, because the three venues already disagree:
the Beer Hall under-covers, Two River Taps over-covers, Ellel sits at nominal. A drift account
predicts rising scale at the Beer Hall, **falling** scale at Two River Taps, and something
flat-tailed at Ellel. Any other outcome refutes it.

| venue | Spearman $\rho$, \|residual\| against date | $p$ | direction |
|---|---|---|---|
| beer_hall | **+0.086** | 1.45e-03 | rising |
| ellel | +0.218 | 1.80e-15 | rising in the body |
| two_river_taps | **−0.072** | 2.10e-02 | **falling** |

By time quartile, 90th percentile of \|residual\| (the part of the distribution the band
actually uses):

| venue | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|
| beer_hall | 689.75 | 906.91 | 615.71 | **1056.29** |
| ellel | 633.57 | 540.59 | 534.12 | **517.54** |
| two_river_taps | 386.55 | 350.74 | 284.10 | **221.83** |

The Beer Hall's upper tail grows by half over the year. Two River Taps' shrinks by nearly half.
Ellel's is **flat to gently falling even though its mean rises** — the drift there is in the
body of the distribution and not in the tail, which is why the one venue whose mean moves
most is the one whose coverage moves least.

## 3 · The measurement that decides it — rank uniformity

For every banded observation, the rank of its \|residual\| inside the pool that was actually
available when it was banded, within its own Mondrian state group. Mid-ranks, so the
structural-closure ties at zero bias nothing in either direction. **Under exchangeability that
rank is Uniform(0,1) by construction**, so the fraction above the 0.90 quantile is 0.10.

| venue | pairs | mean rank | fraction above $q_{0.90}$ | implied coverage | arm D at `tab:coverage` | difference |
|---|---|---|---|---|---|---|
| beer_hall | 1750 | 0.554 | **0.1297** | **0.870286** | 0.871429 | **0.001143** |
| ellel | 1659 | 0.554 | 0.0874 | 0.912598 | 0.913804 | **0.001206** |
| two_river_taps | 1274 | 0.457 | **0.0385** | **0.961538** | 0.963108 | **0.001570** |

Both columns are carried at six places on purpose, because the earlier three-place version of
this table is what let the agreement be overstated — see §7.

The pair counts are the pair counts of `tab:coverage`. The implied and published columns agree
in sign and rough size at all three venues, and that is the whole of what the agreement
establishes: this diagnostic is addressing the same object the coverage table measures rather
than a neighbouring one. **It is not an independent reproduction, and it does not narrow how
large the miscoverage is.** The two columns are the same miss event counted under two
conventions. `interval_calibration.mondrian_band` bands arm D at the 0.90 quantile of the
expanding pool within a state group; `_rank_uniformity` mid-ranks the same residual against the
same pool in the same group and counts it above the same level. They separate only in
quantile interpolation and in tie handling, which is what the 0.0011 to 0.0016 spread is. A
statistic that decomposes an indicator cannot corroborate it.

So the under-coverage is not a shortfall to be explained at one remove. It **is** the
non-uniformity of the conformity-score ranks, exhibited directly on the objects the band is
built from.

## 4 · It survives the obvious deflections

- **Not the closure group.** Restricted to active trading days alone, the Beer Hall fraction
  above the nominal quantile is **0.1168** against 0.100 expected, and Two River Taps is 0.0396.
  The effect is present inside the active group, so it is not an artefact of the
  structural-zero partition. The pooled Beer Hall figure (0.1297) exceeds the active-only one,
  which says the closure group contributes exceedances of its own — a calendar that is
  occasionally wrong about a day — but the finding does not depend on that.
- **Not a horizon artefact.** The Beer Hall exceeds 0.100 at **every** one of the seven steps
  (0.148, 0.136, 0.128, 0.116, 0.124, 0.124, 0.132) and Two River Taps falls below it at every
  step. This is the per-step persistence `sec:res-undercoverage` already reported, now expressed
  in the statistic that explains it.
- **Not the point forecaster.** Already settled upstream: the served exogenous model
  under-covers at 0.870 against the illustrative model's 0.871.

## 5 · What may and may not be claimed

**May.** The violation is non-stationarity of the residual scale, and the mechanism by which it
becomes a coverage error is the expanding calibration pool: a quantile estimated over the whole
past is too narrow for a present whose errors have grown, and too wide for one whose errors have
shrunk. One mechanism, three venues, three signs, each matching its measured coverage.

**May not.** Nothing here identifies *why* the Beer Hall's error scale grows. Growth in trade is
the obvious candidate and is not tested; a residual scale rising with the level of the series
would produce exactly this, but so would several other things, and the diagnostic does not
separate them. The claim is about the form of the violation, not about its cause.

**May not.** This does not license the third remedy `sec:res-winkler` lists — inflating the
nominal level until achieved coverage reaches 90 per cent. If the scale is drifting, a
constant inflation calibrated on today's drift is a fixed correction to a moving target. What
the finding does point at is a **windowed or weighted** calibration pool rather than an
expanding one, which is a change to the served band and therefore out of scope here.

## 6 · Row status

| Item | Status |
|---|---|
| **D-U6** | **CLOSED.** The violation is identified and measured, and the rank decomposition predicts each venue's published coverage in sign and rough size. **Not "cross-checked" — see §7**; the decomposition and the coverage table share an indicator, so the agreement is arithmetic rather than corroborative |
| R36 (`barber_conformal_2023`) | **CONFORMS.** The chapter no longer declares a violation it cannot name; the departure from exchangeability is exhibited and its direction predicted per venue |
| Blocker class | D-U6 was the only UNRESOLVED row never blocked on Ryan, Elliot or a vendor. It is now the only one closed |

## 7 · Correction, 2026-08-09 — "to within a thousandth" was false, and this file is where it started

**Appended, not substituted.** §3 as first written read:

> the implied coverage reproduces the published coverage at all three venues to within a
> thousandth. That agreement is the check that this diagnostic is measuring the same object the
> coverage table measures

Both sentences are wrong, in two different ways, and they were wrong from the day this file was
written.

**The precision claim.** Differencing the two artefacts directly — arm D's `marginal.coverage`
in `eval/interval_calibration_L1.json` against `1 - rank_uniformity.frac_above_nominal_quantile`
in `eval/exchangeability_diagnostic.json` — gives **0.001143 / 0.001206 / 0.001570**. A
thousandth is not met at any venue. `ledger/discussion_rewrite_critique.md` **B13** reached the
same three figures independently, and they reproduce to five places.

**The stronger error, and the one that survives fixing the digits.** Agreement here is not
evidence of anything. The two columns are the same miss event under two conventions, as §3 now
records. `ledger/introduction_rewrite_critique.md` **A2** found the extreme form of this on the
traded limb, where `1 - frac_above_nominal_quantile` equals R30's measured coverage to six
places — the same indicator vector counted twice, with nothing left to reproduce.

**Why this correction is worth more than the sentence it fixes.** This file is a
`brain/log/*result*.md`, which `PRJ93_RULES.md` T1 names as a valid terminal node for a numeric
trace, and `chapters/discussion.tex` and `chapters/conclusion.tex` both cite it as their trace
for this claim. **So the claim traced correctly, every time, to a result file that asserts it.**
It also passed `numbers_audit.md` **X1** as MATCHES, by comparing full-precision implied
0.870286 against the *rounded* published 0.871 — a difference of 0.0007, under the thousandth
the audit was testing. The exact published value is $1525/1750 = 0.871429$ and the true
difference is 0.001143. Three independent audit paths passed a false claim, each for a different
reason. Both mechanisms are now written into `PRJ93_RULES.md`.

**Downstream sites repaired in the same pass, 2026-08-09:** `chapters/results.tex`:650,
`chapters/discussion.tex`:93, `knowledge/05_paper_architecture.md`:220/:470/:1110,
`ledger/literature_conformance.md`:922. §4.5's copy at :1110 was a binding composition
instruction, so it governed sessions that had not run yet.
