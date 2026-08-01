# Report 49 - S7 G17h: interval calibration, per-step bands, and the adaptive methods

> **SUPERSEDED IN PART, 2026-07-31 - the G (AgACI) column only. See report 52.**
> The G arm reported here was not AgACI: it used exponentially weighted aggregation
> instead of Bernstein online aggregation, one shared weight vector across both bounds
> instead of two independent ones, and a summed interval loss instead of a per-bound
> pinball loss. Found by released-code comparison (`ledger/code_vs_paper.md`, M3).
> The arm was reimplemented and the study re-run at the same ceiling: **G becomes 1837
> (Beer Hall), 1480 (Ellel), 693 (Two River Taps)**, worse than reported below. Every
> other arm, every confidence set and every adoption decision in this report is
> unchanged and stands. Do not quote the G figures below. This report is annotated
> rather than rewritten so the commit ordering stays intact.

Date: 2026-07-23. Branch `brain-construction-local`, from tip `070f249` (S6). Point model ETS
(the band's cold-start default and `conformal.wrap`'s coverage-gate reference), device CPU; the
served-forecaster scope check uses Chronos-2 on CPU. Style: no em-dashes, plain prose, loud
failures, verify before asserting, pre-register before running.

## Headline

**The 1.00 coverage that the external assessment read as miscalibration is not evidence of
anything: it came from seven points, where a perfectly calibrated 90 percent band puts all seven
inside with probability 0.478.** Measured where there is power to measure it (the S2 rolling
origins, ~1,700 to 1,900 interval-observation pairs per venue), the band's real problem is the
opposite of over-coverage: **at Beer Hall it significantly UNDER-covers (0.87, Clopper-Pearson
[0.855, 0.887], excluding the nominal 0.90), and the under-coverage holds for the served
chronos2_exo forecaster as well as for ETS, so it is a property of the band, not the point
model.** Under-coverage is the unsafe direction, so **stop condition 3 fires and is reported
here.** Of the three methods this package implements (per-step, ACI, AgACI), none beats the
incumbent Mondrian band on the Winkler score at any venue, so **no method qualifies for adoption**
under the pre-registered rule. Per-step calibration is now implemented and measured, closing the
`FLAG-BAND-HORIZON` work package, but it is not adopted, and the horizon cap stays at seven.

| venue | incumbent D coverage @90 [CP] | D Winkler | 90% Winkler set | adoption candidate |
|---|---|---|---|---|
| Beer Hall | **0.871 [0.855, 0.887]** (under) | **1807** (best) | {D,A,G,S,P} | none |
| Ellel | 0.914 [0.899, 0.927] | **1262** (best) | {D} only | none |
| Two River Taps | 0.963 [0.951, 0.973] (over, closed) | **646** (best) | {D,P,S,A,G} | none |

Five arms, same origins, same point forecasts, differing only in how the residual pool is sliced
or adapted: **P** plain pooled, **D** Mondrian by active/zero state (the served band), **S**
per-step, **A** per-step ACI at the best sweep rate, **G** per-step AgACI. Primary metric the
Winkler score; coverage and width reported beside it.

## Preconditions (verified, not assumed)

- `070f249` pushed to `origin/brain-construction` and confirmed before starting.
- Store ceiling `2026-07-07` (`warehouse.assert_store_ceiling`); `store.build` clean.
- Suites green at the S6 counts before any change: `.venv` 534 passed 8 skipped, `.venv-forecast`
  541 passed 1 skipped.
- `compute/contract.py` `MAX_HORIZON_DAYS = 7` read first: the cap exists because the pooled band
  is calibrated for seven steps, and the contract is explicit that a method is adopted only when
  it beats a gate on held-out folds. This package honours that standard.
- Every count is derived by calling the code's own function, named beside the number.

## Part 1: the 1.00 coverage claim, restated with power (G1)

The 1.00 coverage figure is the C2 confrontation (reports 31/35): Beer Hall L1, a seven-day
held-out window (8 to 14 July), all seven points inside the 90 percent band.

- n = **7** interval-observation pairs (`power_analysis`).
- P(all 7 inside | perfectly calibrated at 90%) = 0.90^7 = **0.478**. A single 1.00 on seven
  points is a coin-flip-scale event under correct calibration, not a signal.
- 95% Clopper-Pearson interval on the 1.00 estimate: **[0.590, 1.000]** (`clopper_pearson`). It
  contains the nominal 0.90 and a great deal else; seven points cannot resolve coverage to better
  than a 40-point-wide interval.
- **Supports miscalibration: false.** The observation is consistent with perfect calibration.

Angelopoulos-Bates bound the expected coverage of split conformal at most nominal + 1/(n_calib+1).
The calibration pool reaches n_calib 1883 (Beer Hall), 1792 (Ellel), 1407 (Two River Taps), so the
upper bound is 0.9005 to 0.9007: expected coverage should sit in a sliver just above 0.90. The
properly-powered Beer Hall coverage (0.87) falls BELOW that band, which is only possible when the
exchangeability the bound assumes is violated. That is the finding of Part 2, and it is the reason
the adaptive methods of Part 3 are worth measuring at all.

This is the third correction this remediation has returned to the external assessment (after S5's
group-ICL restatement and S6's covariate-quality reframing), and it is a legitimate deliverable.

## Part 2: coverage where there is power to measure it (G2)

Split conformal on the S2 step-1 rolling origins, leak-free (the pool at an origin holds only
residuals whose target date it has observed) and pooled to 250, 237 and 182 origins at seven steps
each. Marginal coverage with a Clopper-Pearson interval, per horizon step, and per state:

- **Beer Hall UNDER-covers.** D marginal 0.871, CP [0.855, 0.887], and the CP interval excludes
  the nominal 0.90, so the shortfall is statistically real rather than sampling noise. Per step the
  Mondrian band covers 0.85, 0.86, 0.88, 0.88, 0.88, 0.88, 0.87 (steps 1 to 7): below nominal at
  every step, and 5pp below at step 1, outside the project's own +/-3pp tolerance. This is the
  decline the seven-day window and the pooled figure hid. It matches `conformal.wrap.evaluate`'s
  own Beer Hall Mondrian coverage (87.6%), so it is not an artefact of the stricter leak-free pool.
- **The under-coverage is not an ETS artefact.** The served forecaster (chronos2_exo, which unlike
  ETS degrades with horizon) gives the SAME Beer Hall shortfall: D marginal 0.870, CP [0.853,
  0.885] (`--served-check`, `interval_calibration_served_check.json`). So the served band, not just
  the cold-start band, is mildly overconfident at Beer Hall.
- **Ellel sits at nominal.** D marginal 0.914, CP [0.899, 0.927], containing 0.90; per step 0.90
  to 0.92. Scored on the Winkler score, which is proper and in the units of the data, Ellel is on
  the same footing as the other venues for the first time (the S4 bootstrap ruled out scaled error
  there; Winkler needs no scale).
- **Two River Taps over-covers** (D 0.963), the conservative direction, expected for a closed venue
  with a smaller and older calibration set.

**Stop condition 3 fires.** Coverage falls below nominal within the cap at Beer Hall, on both the
cold-start and the served forecaster, so the served band is overconfident there. Reported here and
not adopted around: the honest response is to surface it, not to silently widen the band inside an
integration phase. The natural fix (ACI, Part 3) restores coverage but costs Winkler (Part 4), so
the remedy is a served-band decision with its own review, exactly the kind the cap's rationale
protects.

## Part 3: the three methods (G3, G4)

**3a. Per-step calibration is implemented and refutes the contract's specific prediction, at
power.** `contract.py` predicted per-step calibration would give 96.2 percent at every step with
half-width growing 181 to 224. That prediction came from a **26-point-per-step De Lune measurement**
(report 33) on a different, smaller-scale, horizon-degrading series. Measured properly at Beer
Hall, the per-step half-width is **flat** (505, 515, 498, 486, 482, 482, 504 at steps 1 to 7), and
it is flat for the served chronos2_exo too (466 to 483). The 181-to-224 growth is not a property of
this estate's forecasters; Beer Hall's residuals do not grow appreciably over seven days. Per-step
calibration DOES equalise coverage across steps (0.88 to 0.90 vs the pooled 0.85 to 0.88), so its
qualitative claim holds; its width benefit does not, because there is no per-step width gradient to
exploit here.

**3b. ACI (Gibbs-Candes 2021) with a reported learning-rate sweep, level constrained loudly.** The
effective miscoverage is nudged by (target - 1{miss}) per step and the band uses 1 - eff; the
effective alpha is clamped to [0, 1] and every clamp is COUNTED, never clipped silently (arm A
clamps 46 at Beer Hall, 0 at Ellel and Two River Taps; the aggregate G clamps 339/127/124 because
its fastest expert, gamma 0.1, overshoots). Sweep (mean Winkler at Beer Hall): gamma 0.005 = 1929,
0.01 = 1921, 0.02 = 1903, 0.05 = 1814 (best), 0.1 = 1822. Faster adaptation helps at drifting Beer
Hall; the stable venues prefer the slowest rate (best gamma 0.005 at Ellel and Two River Taps).

**3c. AgACI (Zaffran et al. 2022) aggregates ACI experts over the rate grid** with online
exponentially-weighted bounds, removing the single-rate choice. It reduces EXACTLY to a single ACI
when the grid is degenerate: `test_agaci_single_gamma_reduces_to_aci` proves the bands are
identical to 0.0 over a 30-origin sequence (G4).

## Part 4: the comparison, and adoption (G5)

Primary metric the Winkler score at the 90 percent level; the S3 Model Confidence Set at 90 percent
over the five arms per venue on the per-origin Winkler vectors, with the moving-block paired
bootstrap (block 7, B 10000, seed 94). Pre-registered adoption rule: a method replaces the
incumbent Mondrian band **D** only if it enters the 90 percent Winkler set AND has the lower mean
Winkler at that venue.

- **Beer Hall**: mean Winkler D 1807 (best), A 1814, G 1820, S 1928, P 1940; all five in the 90%
  set. D beats S and P (paired CIs exclude zero); D versus A and D versus G span zero. **No
  candidate**: A and G are inseparable from D, not lower.
- **Ellel**: mean Winkler D 1262, and the 90% set is **{D} alone** (P, S, A, G eliminated). D beats
  every other arm with a paired CI excluding zero. **No candidate.**
- **Two River Taps**: mean Winkler D 646 (best); all five in the set; D beats S, A, G (CIs exclude
  zero), D versus P spans zero. **No candidate.**

**No method both enters the Winkler set and beats the incumbent mean at any venue, so no method
qualifies for adoption.** The result is sharper than "the methods are indistinguishable": at Ellel
the incumbent DOMINATES, and everywhere the pattern is the same, that the extra machinery of
per-step and adaptive calibration widens the band more than it improves the miss penalty, and the
Winkler score, which trades the two off, prefers the tighter incumbent. The tension worth naming:
at Beer Hall ACI (arm A) is the one method that restores coverage to nominal (0.895), but it is
still not a Winkler win, because the width it adds costs more than the misses it saves. Coverage
and Winkler disagree at Beer Hall, and the pre-registered primary metric is Winkler.

## The pre-registered prediction, scored

Predicted D and S beat P (both remove a contamination). **Half-confirmed**: D beats P everywhere
(the Mondrian state grouping is a real gain, paired CIs exclude zero at Beer Hall and Ellel), but S
does NOT beat P, because with flat per-step widths there is no pooling contamination for S to
remove. Predicted A and G help least at Beer Hall (stable) and most at Ellel: **refuted in
direction**; the adaptive methods help LEAST at Ellel (where the incumbent dominates) and are only
competitive at drifting Beer Hall. Predicted the powered coverage sits above nominal but below
1.00, and flagged that below-nominal at any step is the more serious finding: **that more serious
finding is what occurred at Beer Hall**, and it is reported as such.

## Stop conditions

- **Stop 3 (coverage below nominal within the cap): FIRED at Beer Hall.** Reported above; the
  served band is mildly overconfident there, robust across ETS and chronos2_exo.
- Stop 1 (per-step evidences a horizon beyond seven): not triggered. The measurement stays within
  the seven-day cap by design; raising `MAX_HORIZON_DAYS` is a contract change with downstream
  consumers and is explicitly out of scope, so no evidence for a longer horizon was manufactured.
- Stop 2 (a method beats the incumbent at a served venue): not triggered. No method both enters the
  Winkler set and beats D's mean anywhere.
- Stop 4 (the degenerate-grid test does not reduce to ACI): not triggered. G4 holds exactly.

## Acceptance gates

| gate | verdict | evidence |
|---|---|---|
| G1 1.00 claim restated with power | PASS | n=7, P 0.478, CP [0.590,1.000], verdict: no miscalibration |
| G2 coverage on >=1000 pairs, per step + per state, CP | PASS | 1750/1659/1274 pairs (BH/Ellel/TRT); per-step + per-state CP in `interval_calibration_L1.json` |
| G3 ACI level constrained loudly + sweep reported | PASS | clamps counted (never silent), excursions recorded; gamma sweep in the report and artefact |
| G4 AgACI reduces to ACI on a degenerate grid | PASS | `test_agaci_single_gamma_reduces_to_aci`, bands identical to 0.0 |
| G5 Winkler primary for all five arms at all venues | PASS | Winkler + coverage + width per arm per venue; MCS on Winkler |
| G6 suites green, no served band changed, artefacts stamped | PASS | `.venv`/`.venv-forecast` counts below; `conformal.wrap` untouched; artefacts carry ceiling, device, method |

## Deviations and flags

- **`FLAG-BAND-HORIZON` closed as a work package, cap unchanged.** Per-step conformal is now
  implemented (`conformal.methods.perstep_band`) and measured at power. It is NOT adopted (it does
  not beat the incumbent on Winkler), so `MAX_HORIZON_DAYS` stays at 7. The flag moves from "research
  work package, unrun" to "measured, not adopted"; see FLAGS.md.
- **`FLAG-BAND-UNDERCOVERAGE-BH` opened.** The powered measurement shows the served Beer Hall band
  significantly under-covers (0.87, CP excludes 0.90), on both ETS and chronos2_exo. This is a
  served-band decision with its own review (ACI would fix coverage at a Winkler cost); recorded so it
  is not lost.
- **Point model ETS for the five-arm comparison.** The band's cold-start default and the wrap.py
  coverage-gate reference, held fixed across arms so the comparison is of the banding method. The
  served-forecaster scope check (chronos2_exo at Beer Hall) confirms the coverage story is the same,
  so the ETS comparison is representative rather than a special case.

## Artefacts

- `conformal/methods.py` (the five methods, ACI, AgACI, the loud level clamp), `eval/interval_calibration.py`
  (the powered driver, power analysis, MCS, served-model scope check).
- `eval/interval_calibration_L1.json` (per-arm per-level coverage/CP/per-step/per-state/Winkler,
  gamma sweep, clamps), `interval_calibration_mcs.json` (Winkler MCS + paired bootstrap + adoption),
  `interval_calibration_power.json` (Part 1), `interval_calibration_served_check.json` (the served
  forecaster scope check). All `allow_nan=False` and stamped with ceiling, device, method.
- `tests/test_interval_calibration.py` (11 tests: the power calculation, G4 degenerate-grid, G3 loud
  clamp, method correctness, near-nominal coverage on exchangeable residuals), Chronos/network free.
- Decision log rows 53-56; `chapters/results.tex` (new results chapter, S5 and S6 ablations moved in).
