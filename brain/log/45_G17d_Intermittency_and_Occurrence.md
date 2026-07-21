# Report 45 - S4 G17d: intermittency, the scale basis decision, and the occurrence gate

Date: 2026-07-21. Branch `brain-construction-local`, from tip `8525395`. Scope: correct the
two arithmetically-wrong intermittency constants and run the diagnostic at L1 for the first
time; settle the four-way scale basis question by bootstrap rather than argument; route the
L2 cadence denominator through the one harness ruler; build the observed-occurrence hurdle
gate and measure it; and settle whether the Two River Taps served-model selection flips on a
library bump. No served model is changed; that is out of scope by design. Store ceiling
2026-07-07 throughout; every count below is produced by the function named beside it (G1).

## Headline

**Three things the previous packages could only defer are now settled with numbers.**

1. **The scale basis question has an answer, and it differs by venue for a measured reason.**
   `calendar_lag7_active` is the cleanest basis in principle; the bootstrap shows it is
   defensible at the Beer Hall (276 pairs, 30% interval) and Two River Taps (268 pairs, 31%)
   but **not at Ellel** (28 pairs, 66% interval; the induced MASE spans 0.07 to 0.14). At 1.2
   trading days a week **no basis is defensible at Ellel** - the calendar basis is deflated,
   the trading bases give a spurious MASE near 0.09 - so scaled error is the wrong instrument
   there and the venue routes to unscaled or cost-weighted evaluation (Chatfield-Hayya). The
   pre-registered prediction is confirmed.

2. **The cutoff constants were wrong, and correcting them moves the Beer Hall L1 verdict.**
   On the Kostenko-Hyndman correction (ADI 4/3 not 1.32, CV-squared 0.5 not 0.49) the Beer
   Hall L1 series flips from **lumpy to erratic** - its ADI of 1.327 sits inside the very band
   the arithmetic error moved. No L3 node lies in that band, so the Croston trigger and every
   served model are untouched.

3. **The Finding 3 flip is refuted, and it was the external assessment's.** Under the rerun's
   own library versions (scikit-learn 1.8.0, statsmodels 0.14.6) Two River Taps ETS scores
   **0.597, not the claimed 0.617**, and still wins; the GBM does move by one thousandth
   (0.602 to 0.601, a genuine scikit-learn effect) but nowhere near enough to flip. ETS is a
   statsmodels model and statsmodels was identical in both runs, so 0.617 could not have come
   from the libraries: it was a harness artefact. There is also no forward minor to bump to -
   1.9.0 and 0.14.6 are already the latest available.

The **occurrence gate** is built and measured: at the Beer Hall the gated and ungated
forecasts both sit in the 90% Model Confidence Set, so the gate does not measurably help
where the day-of-week features already carry the closures. At Ellel the gate is scaffold
only, inert behind a flag, pending the booking diary (`FLAG-ELLEL-DIARY`).

---

## Part 1 - the cutoff constants and the first L1 diagnostic

`eval/intermittency_diagnostic.py` classified on ADI >= 1.32 and CV-squared >= 0.49, both
arithmetic errors in Syntetos-Boylan-Croston. Kostenko-Hyndman (`kostenko_note_2006`) give the
crossover as **p = 4/3 = 1.3333** and the CV-squared boundary as **0.5**. Both pairs are now
constants (`ADI_CUTOFF_SBC/KH`, `CV2_CUTOFF_SBC/KH`); the diagnostic reports under each.

**1b/1c. The L1 two-by-two (`l1_diagnose`, first L1 run; frame `_load_feats`, n = 399/331/386):**

| venue | demand day | ADI | CV2 | SBC (1.32/0.49) | KH (4/3/0.5) |
|---|---|---|---|---|---|
| Beer Hall | non-zero revenue | 1.3267 | 0.62 | lumpy | **erratic** |
| Beer Hall | any till activity | 1.3223 | 0.63 | lumpy | **erratic** |
| Two River Taps | non-zero revenue | 1.1828 | 0.61 | erratic | erratic |
| Two River Taps | any till activity | 1.1828 | 0.61 | erratic | erratic |
| Ellel | non-zero revenue | 5.9231 | 1.04 | lumpy | lumpy |
| Ellel | any till activity | 5.8333 | 1.07 | lumpy | lumpy |

**The Beer Hall flips lumpy to erratic across the constant correction, under both demand-day
definitions.** Its ADI (1.327) is above the wrong cutoff and below the right one, so the
arithmetic error is not cosmetic here: it is the difference between "gappy, Croston-relevant"
and "frequent but variable, not". Two River Taps is erratic (frequent, variable) under both;
Ellel is lumpy (gappy and variable) under both, unambiguously, since 5.9 is far above either
cutoff. The demand-day definition barely moves the Beer Hall ADI (the one comped open day),
which is why both rows agree.

**1d. The Kostenko-Hyndman selection rule** `CV2 < 2 - (3/2) ADI` is implemented (`select_sba`)
and reported per node at L1 and L3. **No node selects SBA at either level**: at L1 every venue's
CV-squared exceeds the threshold, and at L3 none of the 32 nodes do (21 classify intermittent at
ADI >= 4/3, but their CV-squared all exceed `2 - (3/2)ADI`). The SBA deflation is not indicated
anywhere in this estate, so the diagnostic selects Croston throughout. The L3 report `.md` is a
store-ceiling-dependent artefact - its top-k hierarchy items and n_days drift as history grows -
so it is left at its committed snapshot rather than regenerated at 0707, which would confound the
constant correction with that data drift; the corrected constants are in the code and
`intermittent_nodes` (which feeds reconcile) reflects them.

**No reclassification changes a served model (no stop).** The L3 trigger `intermittent_nodes`
now gates on 4/3; verified directly that no L3 node has an ADI in the affected [1.32, 1.3333)
band (nearest intermittent node 1.4129), so the trigger set, the Croston comparison and every
adoption are byte-identical. The Beer Hall L1 flip is diagnostic only - the venue is served by
`rung4_chronos2_exo`, chosen by the ladder and the MCS, not by an intermittency label.

## Part 2 - the scale basis decision, settled by bootstrap

`bootstrap_scale` resamples the absolute lag-difference vector with replacement, B = 10000,
95% percentile interval, ruler pinned `as_of = 2026-07-07` so the point scales reproduce the
most recent confrontation's published denominators exactly (Beer Hall `calendar_lag7` 315.7 on
276 active pairs; Ellel 180.1; the S1/S3 `(basis, as_of)` principle). Induced MASE holds the
confrontation MAE numerator fixed and inverts the scale interval.

| venue | basis | scale | 95% interval | width | n pairs | induced MASE |
|---|---|---|---|---|---|---|
| Beer Hall | calendar_lag7 | 315.7 | [270.0, 365.0] | 30.1% | 392 | 0.571 [0.494, 0.668] |
| Beer Hall | calendar_lag7_active | 386.9 | [332.1, 446.4] | 29.5% | **276** | 0.466 [0.404, 0.543] |
| Two River Taps | calendar_lag7_active | 173.2 | [148.6, 202.1] | 30.9% | 268 | n/a (dormant) |
| Ellel | calendar_lag7 | 180.1 | [135.3, 229.9] | 52.5% | 385 | 0.411 [0.322, 0.547] |
| Ellel | trading_lag7 | 770.8 | [604.3, 952.7] | 45.2% | 61 | 0.096 [0.078, 0.122] |
| Ellel | trading_same_weekday | 806.2 | [639.1, 979.2] | 42.2% | 67 | 0.092 [0.076, 0.116] |
| Ellel | calendar_lag7_active | 754.0 | [522.0, 1016.4] | **65.6%** | **28** | 0.098 [0.073, 0.142] |

(Full four-by-three table with all widths in `eval/scale_bootstrap_L1.json`.)

**Beer Hall and Two River Taps: adopt `calendar_lag7_active`.** It is both weekday-aligned and
undeflated, its sample is adequate (276, 268 pairs), and its interval (~30%) is no worse than
the deflated `calendar_lag7`. At these venues the cleanest basis is not the noisiest.

**Ellel: no scaled-error basis is defensible.** Every basis fails, in one of two ways. The
`calendar_lag7_active` basis rests on 28 pairs and its scale interval is +/- a third of the
point; the deflated `calendar_lag7` induces a MASE running 0.32 to 0.55 on scale uncertainty
alone - not a usable gate. The trading bases invert the problem: lag seven on the trading index
reaches back nearly six weeks of highly variable demand, so the denominator is ~770 to 806 and
the induced MASE falls to ~0.09, a spurious near-perfect score. **The prediction is confirmed.**
At 1.2 trading days a week the seasonal-naive concept has no purchase, so the honest conclusion
is that scaled error is the wrong instrument at Ellel; the venue should be reported on unscaled
error (MAE/RMSE) or a cost-weighted metric (`chatfield_all-zero_2007`), never a MASE gate. Basis
policy recorded in decision log row 37.

## Part 3 - the L2 denominator, deferred from S1

`sim/cadence_sweep.py` computed a per-category seasonal-naive denominator inline on an
undocumented basis. It now goes through `harness.seasonal_naive_scale(s, basis="calendar_lag7")`.
Verified byte-identical: across every L2 category of all three venues the harness scale equals
the old inline `mean|lag-7 diff|` to within 1e-9, with zero mismatches and no degenerate
all-zero category, so **no cadence number moves and report 24's "weekly is the sweet spot"
conclusion survives**. The conclusion is in any case basis-invariant: the denominator is
constant across cadences for a category, so the winning cadence is independent of the basis
entirely. `FLAG-L2-DENOMINATOR` is re-scoped, not left open (see FLAGS): the basis is now
explicit and single-sourced, and the deflation it inherits is the documented `calendar_lag7`
property Part 2 characterises, not an unnamed one. A ceiling guard and `store_ceiling` stamp
were added to the entrypoint.

## Part 4 - the occurrence gate

`yhat = P(trade) * E[revenue | trade]` (Cragg 1971, Mullahy 1986), with the project's twist
that **P(trade) is observed, not estimated** (`signals/occurrence.py`).

**4a. The trading definition.** The occurrence label is exogenous and never read from a
venue's own revenue: for a calendar-driven venue it is the known weekly schedule (open iff the
weekday is not a structural-zero weekday), for Ellel it is the booking diary. A **comped open
day** - serving but zero revenue - is therefore a trading day: occurrence 1, amount 0,
P(trade)=1 and E[revenue|trade]=0, representable and distinct from a scheduled closure
(occurrence 0). The two reversal/void artefact days are not trading days. Proven by G4.

**4b. Beer Hall, measured against the S3 Model Confidence Set, not a mean.** Over the 273
step-1 origins, gated vs ungated `rung1_robust_dow`:

| | mean MASE | MCS p-value | in 90% set |
|---|---|---|---|
| gated (hurdle) | 0.787 | 1.000 | yes |
| ungated | 0.803 | 0.391 | yes |

The gate lowers the mean by 0.016 but **both models sit in the 90% set: the gate does not
measurably help at the Beer Hall**, exactly the plausible outcome the spec named - the venue
trades ~75% of days and its Mon/Tue closures are already implicit in the day-of-week features.
(`eval/occurrence_gate_beer_hall.json`; the ungated 0.803 reproduces the S2 `rung1_robust_dow`
Beer Hall mean, a consistency check.)

**4c. Ellel, scaffold only. The diary has not arrived.** `ELLEL_DIARY_LIVE = False` (the
`CHECKLIST_LIVE` pattern). The occurrence covariate is inert - `occurrence_label("ellel", ...)`
returns all-NaN, the gate degrades to the ungated forecast, and `ellel_diary_occurrence` takes
a diary map and **never** a revenue series, so the `is_ellel_event` self-leak is impossible by
construction, not by convention. Proven by G5 (signature has no revenue parameter; inert even
when handed a diary while the flag is off). The gate is **untestable at Ellel pending the
diary** (`FLAG-ELLEL-DIARY`).

**4d.** No served model changed.

## Part 5 - the Finding 3 flip, settled

There is **no forward minor to bump to**: scikit-learn 1.9.0 and statsmodels 0.14.6 are already
the latest available (`uv` resolves `>1.9` and `>0.14.6` as unsatisfiable). The decisive test is
therefore the one that reproduces the rerun's own versions - scikit-learn **1.8.0** (one minor
below the pin, and exactly what the rerun used) with statsmodels 0.14.6 - in a throwaway venv,
Two River Taps six folds, seed ceiling reproduced by the frozen frame (closed 2026-05-08):

| | ETS | GBM | winner |
|---|---|---|---|
| committed (sklearn 1.9.0) | 0.597 | 0.602 | ETS |
| rerun claim (sklearn 1.8.0) | 0.617 | 0.601 | GBM |
| **this test (sklearn 1.8.0)** | **0.597** | **0.601** | **ETS** |

**The flip is refuted.** ETS is 0.597, not 0.617, so the winner does not change. The rerun got
the GBM right - 0.601 is a genuine scikit-learn 1.8.0 vs 1.9.0 effect of one thousandth - but
its ETS 0.617 is impossible: ETS is a statsmodels model and statsmodels was 0.14.6 in both, so
ETS is identical by construction. The 0.617 was a harness artefact of the external
reconstruction, not a library effect. The reproducibility finding stands regardless - unpinned
`>=` bounds with no lockfile were a real defect, which S3 fixed - but the vivid "selection flips
on a library bump" illustration is not real, and this corrects the external assessment.

---

## Acceptance gates

| Gate | Verdict | Evidence |
|---|---|---|
| **G1** every count from the code's own function, named | **PASS** | `l1_diagnose`, `bootstrap_scale`, `venue_ruler`, `_load_feats`, `evaluate_rolling` named beside each number |
| **G2** diagnostic at L1, full two-by-two, all three venues | **PASS** | Part 1 table; `eval/intermittency_L1.md` (carries `store_ceiling`) |
| **G3** bootstrap intervals, all four bases x three venues, + induced MASE | **PASS** | `eval/scale_bootstrap_L1.json`; B = 10000, iid resample of the difference vector, stated |
| **G4** P(trade)=1, E=0 representable, not a structural zero | **PASS** | `test_occurrence_gate.py` (comped day occurrence 1, hurdle 0, distinct from closure) |
| **G5** Ellel covariate inert; self-leak impossible by construction | **PASS** | `test_occurrence_gate.py` (inert without diary; signature carries no revenue; inert even given a diary while off) |
| **G6** suites green no reduction; no served model changed; no frozen artefact; new artefacts carry `store_ceiling` | **PASS** | `.venv` 474 -> 483 passed, 8 skipped unchanged; `.venv-forecast` 481 -> 490 passed, 1 skipped unchanged (both +9, the occurrence-gate tests); served models untouched; frozen `sim/*_confront_result.json` and `june2026_cadence_sweep.json` and the L3 diagnostic `.md` untouched; `intermittency_L1.md`, `scale_bootstrap_L1.json`, `occurrence_gate_beer_hall.json` carry `store_ceiling` |

## Stop conditions - none fired

No L3 node reclassifies, so no served model is implied to change (the Beer Hall L1 flip is
diagnostic). The cadence re-score is byte-identical, so report 24's conclusion is unmoved. No
bootstrap interval is zero-width (the narrowest, Beer Hall `trading_lag7`, is 20.7%). Ellel's
occurrence signal is never derived from Ellel's revenue.

## Deviations

1. **No forward library bump was possible (stronger substitution, flagged).** The spec's Part 5
   asks to bump scikit-learn and statsmodels one minor version each. Both are already the latest
   available, so there is no forward minor. The stronger, decisive substitution is the rerun's
   own versions (scikit-learn 1.8.0), which reproduces the rerun's conditions exactly and
   settles the claim directly rather than testing an arbitrary future version. Stated, not done
   silently.

2. **The cadence result was not re-run at 0707, deliberately.** Re-running `cadence_sweep`
   against the current store would confound the basis refactor with a ceiling change (the
   committed numbers were scored at a ~291 scale, today's is 315.7), so the finding was verified
   by proving the refactor byte-identical instead. The committed `june2026_cadence_sweep.json` is
   left unchanged (it is the report-24 record at its own ceiling).

3. **`chatfield_all-zero_2007` is a stub in `chapters/ref.bib`.** The prose cites the reference
   the spec supplies for cost-versus-error on lumpy demand; the full citation is marked TODO for
   the author to confirm rather than fabricated.

## Deliverables

`eval/intermittency_diagnostic.py` (constants, L1, SBA rule) + `eval/intermittency_L1.md`;
`eval/scale_bootstrap.py` + `eval/scale_bootstrap_L1.json`; `sim/cadence_sweep.py` (harness
routed); `signals/occurrence.py` + `eval/occurrence_gate.py` + `eval/occurrence_gate_beer_hall.json`;
`tests/test_occurrence_gate.py` (G4/G5); `chapters/methodology.tex` + `chapters/ref.bib`;
decision log rows 36-40; `FLAG-ELLEL-DIARY` opened and `FLAG-L2-DENOMINATOR` re-scoped in `FLAGS.md`.
