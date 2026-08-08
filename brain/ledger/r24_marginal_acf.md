# R24 — the two marginal ACFs, and what they do to the 6.2 pairing defence

**Run 2026-08-08.** Instrument: `brain/eval/marginal_acf.py` (new, self-tested, five fixtures
plus a deliberate-violation check on its own reproduction guard). Artefact:
`brain/eval/marginal_acf_L1.json`. Source vectors: `brain/eval/fold_vectors_L1_*.json`.
Numerics: numpy 2.5.1, which is the committed regime (`log/78`), not the 2.2.6 the system
interpreter carries.

## What was claimed

`chapters/discussion.tex`:273–275, before this run:

> What is unaffected by the first limit is the factor itself: a dependence correction scales the
> paired and the unpaired standard error alike and cancels in their ratio, so $6.2$ is the quantity
> this argument rests on and the one that survives it.

The role audit's finding **A3** (`role_audit_ch4_ch5.md`:125), quoted rather than named:

> The 6.2 pairing factor's defence against overlapping origins assumes a dependence correction
> "cancels in their ratio". That holds only if the differential and the marginal series carry the
> same serial dependence — generally false. Lag-1 on the differential is **0.811**; no ACF exists
> for either marginal. §5.3's whole answer rests on it.

## Method, and why it is not an ad-hoc script

Per `PRJ93_RULES.md`, *a number that enters a decision comes from an instrumented tool*. The
script does not reimplement the autocorrelation estimator: it imports `eval.mcs._autocorr`,
`eval.mcs.common_loss_matrix` and `eval.mcs.top_rungs_by_mean`, so the marginal ACFs come off the
same code path, the same common-fold matrix and the same biased-denominator definition as the
committed differential ACF. Before reporting anything new it reproduces
`mcs_L1_results.json` `venues.<v>.paired_variance_top4[0]` **cell by cell** — pair, `mean_diff`,
`sd_paired`, `sd_independent`, `se_paired` and all ten differential ACF lags — and aborts on any
mismatch. All three venues reproduce exactly. That reproduction is also what rules out the
numerics-regime question for this computation: had 2.5.1-versus-2.2.6 mattered here, the committed
row would not have come back identical.

**Population note, resolved at the generator.** The metric key is `rmsse`, but
`mcs_report.HEADLINE_LOSS` selects it and `fold_vectors_L1_ellel.json` carries `basis: unscaled`,
so at Ellel that vector is an **RMSE in pounds**, not a scaled error. `mcs_report.py`:77–79 says so
in its own comment. This is the `field name is not a definition` trap and it was checked, not
assumed.

## Prediction, recorded before the run

Lag-1 on both marginals ≈ 0.89 and 0.90, range 0.85–0.93, **both above the differential's 0.811**;
cancellation **fails**; and the correction is **larger on the marginals**, so the corrected ratio
**exceeds** 6.2 and the figure becomes a lower bound.

**The lag-1 values landed and the direction was wrong.** Both marginals came in inside the
predicted interval (0.873, 0.868) and both above 0.811, and cancellation does fail. But the
corrected ratio at Ellel *falls* to 5.14, not rises. The prediction was anchored on lag 1 and
assumed the rest of the ACF would scale with it. It does not: the variance inflation is a sum over
lags, and the two series differ in **decay**, not in level.

## Result

### Ellel, `rung4_chronos_bolt` against `rung1_robust_dow`, RMSE unscaled, n = 260 folds, h = 7 d, step 1 d

| lag | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| differential | **0.811** | 0.692 | 0.608 | 0.519 | 0.448 | 0.356 | 0.247 | 0.261 | 0.259 | **0.241** |
| marginal `chronos_bolt` | **0.873** | 0.747 | 0.624 | 0.480 | 0.339 | 0.191 | 0.039 | −0.012 | −0.070 | **−0.129** |
| marginal `robust_dow` | **0.868** | 0.731 | 0.598 | 0.441 | 0.288 | 0.130 | −0.030 | −0.084 | −0.138 | **−0.195** |

**The two series are not the same at lag 1 and are opposite by lag 10.** The marginals start
*higher* (0.873, 0.868 against 0.811) and then decay through zero at the seventh or eighth fold and
turn negative; the differential is still at 0.241 ten folds out. The marginals carry the venue's
weekly cycle and lose it at the week; the differential has that cycle removed by the subtraction and
retains a slowly-decaying level component.

Bartlett variance inflation, `VIF = 1 + 2 Σ_k (1 − k/n) ρ_k`, at the committed ten-lag budget:

| series | VIF |
|---|---|
| differential | **9.74** |
| marginal `chronos_bolt` | 7.11 |
| marginal `robust_dow` | 6.19 |

### Verdict — the cancellation assumption FAILS, and adversely at Ellel

Corrected ratio `sqrt(VIF_a·var_a + VIF_b·var_b) / (sd_paired·sqrt(VIF_d))`, swept over
`mcs.BLOCK_LEN_SENSITIVITY` (2, 7, 14, 21) plus the artefact's own 10 and a 28:

| lag budget | 2 | **7 (pre-registered `BLOCK_LEN`)** | 10 | 14 | 21 | 28 |
|---|---|---|---|---|---|---|
| Ellel corrected ratio | 6.37 | **5.82** | 5.14 | 4.10 | 2.53 | 2.63 |
| Beer Hall | 7.17 | 9.11 | 9.71 | 11.23 | 16.33 | 29.83 |
| Two River Taps | 10.40 | 10.34 | 10.36 | 11.36 | 12.35 | 11.44 |

**At Ellel the corrected ratio is below the uncorrected 6.205 at every budget of seven or more.**
The uncorrected 6.2 is therefore an **upper bound on the pairing gain**, not a quantity that
survives the correction.

### The sign is venue-dependent, which is the stronger finding

At Beer Hall and Two River Taps the correction runs the **other** way, and hard. The reason is
structural rather than incidental: those two venues' leading contrasts are between **near-identical
models** (`chronos_bolt` against `chronos2_exo`; `chronos2` against `chronos2_exo`), so the
differential is small and close to white (ρ₁ 0.574 and 0.556) while both marginals stay strongly
persistent out past lag 10 (0.916/0.906 at lag 1, still 0.47/0.46 and 0.09/0.13 at lag 10). Ellel's
contrast is between a foundation model and a **robust day-of-week baseline**, two very differently
shaped error series, so the subtraction removes the shared weekly cycle and leaves the persistent
part behind.

So *"a dependence correction cancels in their ratio"* is not merely unverified. It is **false, with a
sign that depends on how similar the two models being compared are.** That cannot be asserted at any
venue, and it is the part worth keeping in the write-up.

## Consequence for the surrounding numbers

At the pre-registered block length the paired standard error inflates by `sqrt(9.74)` = 3.12, so
£3.81 becomes about £11.9 and the £1.91 difference sits at 0.16 of a corrected paired standard error
rather than 0.50. A 95 % interval on the difference widens from about ±£7.5 to ±£23, against a mean
loss near £238 — roughly 3 % of the loss becoming roughly 10 %. **The qualitative claim survives and
the quantitative bound loosens by about a factor of three.** The unpaired arm loosens further, so
the contrast the section is built on is unharmed.

## What was changed in the document

`chapters/discussion.tex`, the closing sentences of the pairing paragraph. **Reworded, not
renumbered and not deleted**: 6.2 stays as the uncorrected ratio and is relabelled as a bound, the
false "cancels" assertion is withdrawn, the corrected figure at the pre-registered block length is
given, and the venue-dependence of the sign is stated as the reason the correction cannot be assumed
away. `Section~\ref{sec:disc-limitations}`'s "an amount this work did not quantify" is now quantified
and that clause goes.

## Scope of this check — what it does not establish

It covers the **leading contrast only** at each venue, which is the pair the 6.2 sentence is about;
the other five pairs per venue in `paired_variance_top4` are not examined. It uses a **Bartlett
kernel truncated at a fixed lag budget**, not an automatic-bandwidth or prewhitened long-run
variance, so the corrected ratios are budget-conditional and are reported as a sweep rather than as
one number. It says nothing about whether the MCS sets themselves move: those are computed by a
moving-block bootstrap at `BLOCK_LEN = 7`, which already carries a dependence correction of its own,
and this run did not re-open them.

---

## Addendum, same day — R24 reaches further than 5.3, and one SEPARATION claim was exposed

Raised by Phuong: does 5.3's pairing argument need updating too? Checking that found the exposure
is wider than 5.3 and wider than the 6.2 sentence.

**First, two corrections to how the original run was reported.** The repaired passage **is** 5.3
(`\section{Validity of the approach}`, `sec:disc-validity`, `discussion.tex`:249), not a separate
section from it. And the **6.6** figure appears nowhere in reader-facing prose: its single
occurrence in the whole document is the LaTeX trace comment at `discussion.tex`:286. There is no
6.6-based argument to update.

**What is actually exposed.** The document scales **three** gaps by a paired standard error, as a
matched set stated once in Chapter 4 (`results.tex`:158–163) and once in Chapter 5
(`discussion.tex`:36–38). Every one of those standard errors is computed over folds treated as
independent, so every one is optimistic by that contrast's own `sqrt(VIF_d)`.

**Only two of the three are their venue's leading contrast**, so the factor is not transferable:

| Venue | Contrast | Leading? | VIF@7 | VIF@10 |
|---|---|---|---|---|
| Beer Hall | `chronos2_exo` vs `chronos_bolt` | yes | 3.73 | 4.15 |
| Ellel | `robust_dow` vs `chronos_bolt` | yes | 8.27 | 9.74 |
| **Two River Taps** | **`rung2_ets` vs `rung4_chronos2`** | **NO** | **3.31** | **2.06** |

Two River Taps' served-versus-argument-minimum gap is **not** the pair `paired_variance_top4[0]`
carries (that is `chronos2` vs `chronos2_exo`). Its differential decays fast and turns **negative**
by lag 6 (−0.094, −0.230, −0.179, −0.230, −0.248), so its VIF is **2.06 at ten lags against Ellel's
9.74**. Assuming Ellel's factor here would have been a value match standing in for an identity
match, and would have overstated the correction by more than double.

**Result. All three printed multiples reproduce exactly from the vectors, and all three verdicts
hold, but not equally comfortably.**

| Venue | printed | corrected @7 (pre-registered) | @10 | verdict |
|---|---|---|---|---|
| Beer Hall | 0.02 | 0.01 | 0.01 | tie, **strengthens** |
| Ellel | 0.50 | **0.17** | 0.16 | tie, **strengthens** |
| Two River Taps | **3.27** | **1.80** | **2.28** | separation, **straddles 1.96** |

**The two ties strengthen**, which is the direction that helps: a smaller pairing gain means the
non-separation is less likely to be an artefact of insufficient precision, and that is the argument
5.3 already makes.

**The separation is the finding.** At the project's own pre-registered block length of seven, Two
River Taps' 3.27 standard errors becomes **1.80**, which is **below 1.96**; at ten lags it is 2.28,
above it. The claim straddles the conventional threshold depending on a truncation budget nobody
pre-registered for this purpose.

**What this does NOT overturn, and the distinction matters.** The *elimination* of that rung at
`\alpha = 0.25` comes from the **MCS, which uses a moving-block bootstrap at `BLOCK_LEN = 7`** and
is therefore **already dependence-aware**. The `p = 0.220` is not affected by anything here. What is
affected is the **narrative gloss** "3.27 paired standard errors", which is computed the naive way
and was carrying rhetorical weight the dependence-aware instrument had already earned properly.

**Repair applied, to the gloss and not the verdict.** Chapter 4 keeps the measurement and now
discloses the correction and its budget dependence; Chapter 5 carries the short form and attributes
the elimination to the block bootstrap rather than to the ratio. Beer Hall's 0.02 and Ellel's 0.50
in `results.tex` are **left alone**: both are ties under either reading, so the correction changes
nothing they support, and Chapter 5's 5.3 already carries the Ellel correction. Repairing them in
both chapters would manufacture exactly the duplication S-4 exists to remove.
