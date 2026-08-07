# Methods argument skeleton — extracted 2026-08-07, before composition (8C-2)

The `05_paper_architecture.md` §8.3 instruction applied to Chapter 3: the evidence base
records verdicts and numbers, not argument. Several rejected-alternative justifications
exist **only** in the live `chapters/methodology.tex` prose. This file extracts them —
claim, warrant, rejected alternative, its reason — so composition runs against the
argument rather than against the sentences.

**This is the material carrying D7**, the single named Distinction blocker: *"an explicit
discussion of why the approach taken is better than alternatives that could have been
used"*. R83 (justify each decision) and R84 (justify why alternatives were rejected) are
the section-level form of the same requirement.

Numbering is `M1…M14`, deliberately distinct from `background_argument_skeleton.md`'s
`B1…B16` and from `05_paper_architecture.md` §7's approval rows `A1…A17`. **Four live
`A`-namespaces collided in this project until 2026-08-07** — see the discovery note at the foot.

---

## The eleven load-bearing derivations

| # | Claim | Rejected alternative, and its reason | Home | Exists elsewhere? |
|---|---|---|---|---|
| **M1** | Ellel is scored on unscaled error because no denominator basis is defensible there. | **A cost objective in place of an error measure** (`chatfield_all-zero_2007`). Rejected because its three parameters — ordering, holding, shortage, each priced *per unit* — are **undefined** for an estimand of daily revenue in pounds. Revenue is not ordered, held or backordered, so no unit exists whose carrying or shortage they would price. A property of the problem, not a gap in the preparation. | **3.2** | `defensible_divergences` D-D2 holds the verdict + verbatim quotes; the *estimand* form of the argument is prose-only |
| **M2** | The same paper's narrower transfer supports dropping the denominator. | — (support, not a rejection) Chatfield had to modify a percentage measure because one cannot divide by a demand of zero, and dropped a geometric measure *recommended for intermittent demand* because it breaks on forecast errors of zero. A study whose own denominator-bearing measures degrade on zeros supports dropping the denominator where zeros are thickest. | **3.2** (one clause; derivation is Ch 2's B3 limb 3) | D-D2 calls this "currently unused and better than the cost limb" |
| **M3** | A replenishment decision *does* exist in this system, and saying so is part of the argument rather than a caveat against it. | Suppressing it. Rejected: an examiner finding the stock signal unaided reads M1 as special pleading. It runs at the Beer Hall only, consumes a product-level forecast in pints/day rather than the revenue series, and is a service-level rule carrying no ordering, holding or shortage cost. | **3.2** | D-D2 "state this before an examiner finds A12" |
| **M4** | The SBA selection rule is **vacuous over the trigger set it governs**. | Reporting "no node selects SBA" as an empirical finding. Rejected because it is geometry: the intermittency cutoff is $p \ge 4/3$, and $2-\tfrac32\cdot\tfrac43 = 0$ exactly, so the selection threshold is non-positive for any series at or above the cutoff while $v \ge 0$ always. **Classification as intermittent entails selection of the approximation.** The rule discriminates only in the region where it is not consulted. | **3.3** | **Prose only.** Nothing in the evidence base states the vacuity; `log/45` records the counts, not the entailment |
| **M5** | Adoption is decided on a **disjoint** block with a one-standard-error margin. | (a) **Adopting on the classification alone** — the more literal ex-ante reading. Rejected on evidence: the intermittent estimator loses to the day-of-week median at every intermittent node where both scores are defined, so the rule would install a uniformly worse forecaster. (b) **Adopting on any margin at all.** Rejected because a validation score is itself an estimate with a standard error, and a zero-margin rule adopts partly on noise. Margin device from `breiman_classification_1984`. Sub-blocks rather than days (daily errors serially correlated ⇒ downward-biased SE); disjoint rather than overlapping (no bootstrap needed to undo the correlation); seven days because that unit is already used for dispersion elsewhere. | **3.3** | Pre-registration doc holds the *rule*; the three "why sub-blocks / disjoint / seven" reasons are prose-only |
| **M6** | The exogenous set is fixed by **what is knowable at the origin**, not by what is in the store. | **A discount-share indicator.** Computed and used retrospectively to flag anomalous days; never offered as a forward regressor, because its value on a future day is not knowable at the origin. Admitting it would make the exogenous path a leak rather than a covariate. Also: scoring on *recorded* weather and serving on *forecast* weather measures a system that cannot be deployed. | **3.4** | Partially in `config.py`; the leak/covariate framing is prose-only |
| **M7** | The ETS rung is one fixed specification, not the family's best member. | **The information-criterion search over trend/seasonal/damping that standard implementations run by default.** Rejected because at 399 days it selects among specifications on a sample that cannot separate them, and introduces a second selection step whose uncertainty the rolling-origin comparison does not carry. Consequence stated so the rung's poor showing is not read as evidence against exponential smoothing as a class. | **3.5** | **Prose only** |
| **M8** | The original selection gate **had no test**, not a weak one. | The original procedure: six origins over 42 days, adopt the argument-minimum. Rejected because at $n=6$, $h=7$ the `harvey_testing_1997` correction's numerator is $6+1-14+7 = 0$ exactly, so the factor is zero and no corrected statistic is computable **on any data whatsoever**. A one-day origin step lifts the Beer Hall to 273 origins and the factor to 0.976, at the cost of overlapping windows that must be handled rather than ignored. | **3.6** | Arithmetic in `log/63`; the "no test, not a weak test" reading is prose-only |
| **M9** | The conformal substitution below the attainable sample size is **counted, not silent**. | **Returning an unbounded interval**, which is what reference implementations do when $k > n$. Rejected because an unbounded interval is useless to an operator deciding whether a day is normal. The largest observed residual is substituted instead, and every band issued below the attainable size is tallied and reported beside the coverage it qualifies — because a guarantee that lapsed silently would lapse first on exactly the thinnest groups. | **3.7** | **Prose only** |
| **M10** | The Mondrian partition is an **observed** calendar variable, and the three claims about it come from three places. | **An inferred/latent regime.** `sun_conformal_2025` bound state-conditional coverage error by a term scaling with the rate at which state predictions are wrong; a method that must infer its regime pays a penalty a known calendar does not incur. **Stated with its limit:** that result is proved for an algorithm carrying an adaptive miscoverage update which this work does not implement, so it *motivates* the design and does not certify it. Attribution split: `barber_conformal_2023` = what the construction is; `stocker_gentle_2025` = what it guarantees; `sun_conformal_2025` = why observed beats inferred. Also rejected: leaving the adaptive alternative as an argument — both adaptive methods were implemented and measured, and ACI performed **worse** at this estate's one genuine regime change. | **3.7** | D-D4 holds the attribution split and the non-implementation; the *a fortiori* inference is Ch 2's B6 (see boundary check) |
| **M11** | CUSUM's textbook constants **do not transplant** into a conformal-half-width unit. | Claiming an average-run-length property for the detector. Rejected because $k=0.5$, $h=5$ and the ARL tables behind them are derived for a statistic accumulating deviations standardised by a **standard deviation**; Eq.~`eq:z` divides by a conformal half-width, a *quantile of the absolute residual*, and the ratio between the two depends on the shape of the residual distribution rather than being a fixed constant. No ARL claim is made on their authority. **Counter-alternative also rejected:** restandardising $z_t$ by a robust scale to recover the tables, because it decouples the detector from the interval whose coverage 3.7 establishes — that coupling is worth more than the tables, since a deviation that is not a band breach would be a second and separately calibrated notion of normal. | **3.8** | **Prose only. `05` §1.2 calls this "the strongest passage in the chapter."** |
| **M12** | The hurdle's saturated first stage **is an estimator**, and taking its closed form is a numerical decision rather than a statistical departure. | **Literally fitting a probit/logit first stage.** Rejected because for a design matrix of day-of-week indicators the MLE *is* the within-cell empirical frequency (agreeing here to $7.6\times10^{-5}$, optimiser tolerance), while in deterministic cells the fitted probability converges and the coefficient does not — $\lvert\hat\beta\rvert$ past 11 and still diverging at two thousand iterations, the signature of complete separation. The closed form reaches the same fitted probabilities by a route that exists. What is forgone is **covariates, not estimation**. | **3.9** | D-D3 holds the numerical check; the "complete separation" reading is prose-only |
| **M13** | Ellel's occurrence gate is reported **untestable**, not approximated. | **Deriving Ellel's occurrence from Ellel's own trading days.** Rejected as circular — it uses the target to build the covariate. Made *impossible* rather than discouraged: the diary function takes no revenue parameter and a test asserts no such argument or branch exists. | **3.9** | Guard is in code; the circularity argument is prose-only |
| **M14** | Detection recall measured on the original corpus is an **upper bound**, and the gap is measured rather than asserted. | Reporting the control-arm figures as performance. Rejected because that corpus perturbs the standardised residual stream and splices perturbed test rows onto unperturbed training rows, so the forecaster never sees the perturbation — while production refits weekly, refits again on a confirmed change point, and recalibrates on rolling seven-day blocks, all three absorbing a sustained shift. The realistic arm fixes the perturbation **in revenue units** so the same money moves in both and the pipeline is the only difference. | **3.10** | `log/50` holds the arms; the "upper bound" framing is prose-only |

**Nine of the fourteen exist nowhere but the current prose** (M4, M5's three reasons, M6's
framing, M7, M8's reading, M9, M11, M12's separation reading, M13, M14's framing). That is
the concentration §8.3 warned about, and it is why this file exists before composition.

---

## Confirmation after composition

Every one of M1–M14 survives into the composed chapter. **No derivation was dropped for
space.** Two were compressed to a single sentence each and are named here so the
compression is visible rather than silent:

| # | Live prose | Composed | What was lost |
|---|---|---|---|
| **M3** | 106 words | 34 words | The pints-per-day unit and the `days_of_cover < lead_time + safety` form. Retained: the decision exists, runs at one venue, consumes a product-level forecast, carries no ordering/holding/shortage cost. The *function* — foreclosing the "you just didn't elicit the parameters" reading — is intact. |
| **M7** | 138 words | 46 words | The "where these results say ETS, they mean that one specification" gloss. Retained: the fixed specification, the reason the IC search is not run, and that a poor showing is evidence against the specification and not the class. |

Nothing else fell below its live word count by more than a third.

---

## Discovery note — the colliding `A`-namespaces, and the fix applied

Recorded because the 8C-2 prompt itself crossed two of them, and a later session would too.
**Four** readings were live, not three; the fourth surfaced only while applying the fix.

| Namespace | Owner | `A3` meant | `A6` meant |
|---|---|---|---|
| Approval rows | `05_paper_architecture.md` §7 | mapping of current material into the target tree | the caption convention |
| Background arguments | `background_argument_skeleton.md` | the median-versus-mean functional argument | the recorded-regime extension of CPTC |
| Appendix floats | `07_figure_programme.md` §3 | (`A-F3`) deployment schematic | (`A-F6`) injection schematic |
| **Citation-audit exceptions** | `phase_state.md`, July entries | *"exception A3, class gap"* — no resampling citation behind the moving-block bootstrap | the six hard-coded surfacing constants |

The 8C-2 prompt used **background** `A3`/`A6` and **approvals** `A17` in one paragraph. Both
readings were correct in their own file; the hazard is a session resolving one in the wrong
table, which silently swaps one derivation for another.

**Fixed structurally on 2026-08-07, not by convention.** Background arguments renamed
**A1–A16 → B1–B16** throughout their own file, with the downstream references in
`BLOCKED_third_party.md` §F updated to match. Approvals keep `A`, appendix floats keep `A-F`,
and Methods keeps the `M` prefix this file was written with. `phase_state.md` is append-only,
so its July `A`-ids stand and a correction entry there points at
`05_paper_architecture.md` §7 for the map.
