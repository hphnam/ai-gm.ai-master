# Defensible divergences — the write-up pack

One place to write from in Phase 8. Every row below is **decided**, every quote is
**verified at source this session**, and every number **traces to a result file**. Nothing
here has been written into a chapter yet.

Sources of record: `ledger/literature_conformance.md` §9–§13; decision-log rows **77–84**;
result files `log/66`, `log/67`, `log/68`.

---

## Status at a glance

| Row | Subject | Decision | Closed by |
|---|---|---|---|
| **D-D1** | MASE elicits the median; the estand is mean-like | **RMSSE headline, MASE labelled secondary** | R9 run — `log/66` |
| **D-D2** | Ellel on unscaled MAE vs Chatfield's cost objective | **Accept — argued from the estimand** | Source verification, no run |
| **D-D3** | The "degenerate" hurdle | **Accept — and reclassify toward CONFORMS; the row's premise was false** | Numerical check — `log/67` |
| **D-D4** | Observed-state Mondrian conformal | **Accept the design; attribution re-homed across three sources** | Source + code verification. **Closes V2** |
| **D-D5** | TabPFN-TS named, never entered | **Attempted, aborted on a pre-registered condition; sentence narrowed** | R5 abort — `log/68` |

**No defensible-divergence row remains open.**

---

## The through-line, for the methodology chapter's opening

Three of the five rows were **wrong as recorded**, and in each case the correction made the
position *stronger*, not weaker:

- **D-D2** was recorded as "the cost parameters were never elicited". The real argument is
  that they are **undefined** for a revenue estimand.
- **D-D3** was recorded as "the binary part is 0/1 by construction, not estimated". It **is**
  estimated — a saturated first stage whose closed form is the MLE.
- **D-D4**'s recommended fix would itself have been a misattribution, citing a theorem about
  an algorithm the served system does not implement.

That pattern is worth one sentence in its own right: the ledger's own rows needed the same
verification discipline applied to the literature, and running the check twice is what
caught them.

---

## D-D1 · The ruler and the estimand

**Decision.** RMSSE as headline throughout Results with basis and `as_of` both stated; MASE
retained as a labelled secondary with the flatline and structural-zero caveats.

**Citations, split precisely.** `kolassa_we_2023` (which functional each measure elicits;
additivity and coherence) · `hewamalage_forecast_2023` (absolute-error measures optimise the
median; the intermittency pathology) · `makridakis_m5_2022` (M5 precedent, **73% intermittent
at product-store level**, 62.9% across all 42,840 series) · `hansen_model_2011` (MCS as the
inference layer).

**Evidence — R9, the functional minimal pair** (`log/66_R9_functional_pair_result.md`,
pre-registered row 77 at commit `c098fba`, 760.7 s, 273/205/266 folds):

| venue | median bias | mean bias | absolute metric | squared metric |
|---|---|---|---|---|
| beer_hall | **+67.67** (p 1.9e-12) | **+24.65** (p 9.0e-03) | MASE 0.6578 / 0.6670 | RMSSE 0.6189 / 0.6132 |
| two_river_taps | −29.46 (p 8.6e-09) | −41.69 (p 3.6e-16) | MASE 0.7805 / 0.7862 | RMSSE 0.5574 / 0.5560 |
| ellel | +75.09 (p 3.4e-21) | −39.83 (p 4.6e-06) | MAE 105.98 / **166.64** | RMSE 236.89 / **306.51** |

**The headline sentence.** At Beer Hall the functional swap removes two-thirds of the bias
while moving MASE by 0.009 — the ruler is nearly indifferent between two forecasters whose
bias differs threefold.

**What must be said at equal prominence.** Two of five predictions failed. Two River Taps
falsifies the right-skew mechanism (median arm biased *negative*, mean arm worse). Ellel
inverts the argument entirely — the DOW mean is decisively worse on both metrics (p 1.7e-25,
5.4e-11). All four paired intervals on the crossing **contain zero**: say *"each functional
was better on the metric that elicits it, at both scaled venues, and the per-fold differences
are not separable from zero"*. Never *"shows"*.

**Carried as a limitation.** The served foundation model cannot emit a mean —
`chronos-forecasting` **2.3.1**, `chronos/chronos2/pipeline.py`, docstring **L786–787**
documents *"mean (point) forecasts"* while **L817–818** read `# NOTE: the median is returned
as the mean here`. **Ecosystem observation, not a defect claim against the maintainers.**
Quantile integration is the available remedy and was **declined on gate grounds** — say so,
so the finding is not doing double duty as an excuse.

---

## D-D2 · Ellel on unscaled MAE

**Decision.** Accept the divergence. Argue it **from the estimand**, not from missing data.

**Verified verbatim — `chatfield_all-zero_2007`:**
- `TotalCost = (ordering cost + holding cost + shortage cost)`; `C1 = TotalCost / n`,
  `C2 = TotalCost / sum(X_t)`
- *"b Shortage cost per unit per unit time"*, *"h Holding cost per unit per unit time"*,
  *"Ordering cost, A"* — **three** parameters, not two
- *"We develop a simulation study of this inventory system"*; *"The size of this replenishment
  order, Q, equals the demand forecast, y-hat_t+1, for the following period, plus any current
  backorders"*
- Forecast target is **demand in units**
- *"the lowest forecasting error does not necessarily lead to the lowest system cost"*

**The argument.** Chatfield's cost is the cost of an inventory system in which the forecast
**is** the replenishment quantity. Ellel's estimand is `revenue_exvat` — daily revenue ex-VAT
in pounds (`store/warehouse.py:293`). Revenue is not held, not backordered, not ordered.
`A`, `h` and `b` are not unelicited here; they are **undefined**, because no unit exists whose
carrying or shortage they price. The remedy is defined for a different estimand — a property
of the problem, which is the bar.

**The second support, currently unused and better than the cost limb.** Chatfield hit the zero
problem *inside the error family*: MAPE had to be *"modified, because we cannot divide by a
demand of zero"*, and GRMSE — *"touted by Syntetos and Boylan (2005: 308) as best for
intermittent demand"* — was excluded because *"that multiplicative measure breaks down with
forecast errors of zero"*. A paper whose own denominator-bearing measures degrade on zeros is
direct support for dropping the denominator at an 82%-zero venue.

**The nuance that must not be smoothed over.** A replenishment decision does exist — A12
(`signals/stock_inventory.py`) flags a reorder on `days_of_cover < lead_time + safety`. It
runs at **Beer Hall only** (`A6_FORECAST_VENUE = "beer_hall"`, L40), consumes the **A6
product-node forecast in pints/day**, and is a service-level rule with no `A`/`h`/`b` in it.
State this before an examiner finds A12.

**Do NOT cite** §2.3 or ask 6 here. That blocked elicitation is B6, the **F_β surfacing cost
ratio** (`fu_prism_2026`, `trinh_hil-bench_2026`) — a different cost.

**Further Work.** A Chatfield-style cost objective *is* definable for A12 at Beer Hall given
elicited `A`, `h`, `b`.

---

## D-D3 · The hurdle's first stage

**Decision.** Accept, and reclassify toward CONFORMS.

**Verified verbatim.** Cragg: *"All our models start from the probit analysis model where the
probability that a particular event will occur at observation t, p(E_t), is given by..."*.
Mullahy: *"the binomial probabilities (17) and (18) are identically those of a standard
binomial logit model"*. Whether either discusses a **known/observed** first stage: **NOT
SUPPORTED** — neither does.

**The correction.** `p_trade` does **not** return 0/1 by construction. It returns
`E[occurrence | day-of-week]`, a groupby mean over training labels
(`signals/occurrence.py:95-98`) — a **saturated nonparametric estimator** of `P(trade | DOW)`.
It evaluates to 0/1 at Beer Hall because that calendar is deterministic, not because the code
forces it.

**Evidence — measured, not asserted** (`log/67_DD3_hurdle_saturation_result.md`, seed 93,
n=400): with DOW dummies the saturated-logit MLE reproduces the groupby cell frequencies to
**max abs diff 7.61e-05** — BFGS tolerance. Same estimator. And the deterministic cells show
**complete separation**: |coef| = **11.46**, still diverging at 2000 iterations, so the
coefficient MLE does not exist while the fitted probability converges.

**The sentence that answers the viva question.** The closed form is the numerically stable
route to identical fitted probabilities; the probit *parameterisation*, not our design, is
what fails on a deterministic calendar.

**Both gains the sources name are structural**, and this design has them — Cragg: *"allowing
the determination of the size of the variable when it is not zero to depend on different
parameters or variables"*, motivated by *"search, information, and transactions costs"*;
Mullahy: the two processes need not be *"constrained to be identical"*. The amount model is
fit on trading days only.

**Surviving limitation.** Covariate poverty — the first stage conditions on DOW alone. The
richer covariate is Ellel's booking diary: **D-U3, blocked**, `ELLEL_DIARY_LIVE = False`, with
the circular fix foreclosed by construction. **Null-result caveat unchanged**: against a
DOW-conditioned baseline the gate is expected geometry, not a measurement.

---

## D-D4 · Observed-state Mondrian conformal

**Decision.** Accept the design; fix the attribution — **not** as §4 proposed. **Closes V2.**

**Verified verbatim — `sun_conformal_2025`:**
- **Thm 4.3**: *"For any sample size T >= 1, the CPTC algorithm ensures that |(1/T) sum
  E[err_t] − alpha| <= epsilon · max_z delta_{z,T}, where epsilon = P(z-hat_t != z_t) is the
  error rate of the state predictions"*
- **Cor A.2**: *"If predicted state probabilities are accurate p-hat(z_t|x_{1:t−1}) =
  p(z_t|x_{1:t−1}), then epsilon = 0, therefore E[err_t] = alpha for all T"*
- The state: *"the **latent** state z_t indicates which dynamical regime ... is currently
  active"*; *"z_t ... denote the **unobserved** discrete mode"*

**Why §4's fix was wrong.** Both results are stated **for the CPTC algorithm**, whose update
is *"alpha_{z-hat_t,t+1} <- alpha_{z-hat_t,t} + gamma · (alpha − err_t)"*. **We do not run
CPTC.** `conformal/wrap.py` is static split conformal in two variants with no adaptive alpha;
its own docstring says *"Change-point-aware online conformal (Sun and Yu 2025) remains noted,
not wired"* (L8–9). Citing Cor A.2 as our guarantee would claim a theorem about an algorithm
the served system does not implement.

**Three claims, three homes — no new paper, so no add-a-paper gate:**

1. **What it is** — `barber_conformal_2023` (already cited): *"Mondrian methods informally
   divide the observations into groups, and assume that the observations within each group
   are still exchangeable (e.g., class-conditional conformal classification)"*, crediting
   Vovk, Gammerman & Shafer (2005).
2. **What it guarantees** — `stocker_gentle_2025` (already cited): *"this simple procedure
   provides the powerful guarantee of finite-sample marginal coverage: P(Y_{T+1} in
   C_{1−alpha}(X_{T+1})) >= 1 − alpha"*, applied within each group.
3. **Why an observed partition** — `sun_conformal_2025` Thm 4.3, as **motivation**: a
   latent-state method pays a penalty scaling with `epsilon`; a known calendar does not incur
   it.

**Must not say**: that a Sun & Yu theorem bounds *our* coverage; that they frame the choice as
`observed` vs `inferred` (they define the state as unobserved throughout — that framing is
ours and must be labelled as ours).

**Should say, and currently does not**: the adaptive alternative was **measured and rejected**
— ACI performed worse than static at this estate's one real regime change. Our own evidence,
stronger here than any citation.

---

## D-D5 · TabPFN-TS

**Decision.** Attempted, **aborted on a pre-registered condition**; review sentence narrowed.

**Verified verbatim.** `hollmann_accurate_2025`: *"up to 10,000 samples and 500 features"*;
*"a strong conditional interpolator but lacks a mechanism for systematic trend
extrapolation"*. `hoo_tables_2026`: *"the mean for squared-error evaluations, the median for
absolute-error evaluations, and arbitrary quantiles"*. Intermittent / zero-inflated series:
**NOT SUPPORTED in either source**.

**Why it was worth a late entrant.** TabPFN-TS exposes a **genuine predictive mean** — the
only available candidate that could have closed D-D1's residual median-serving limitation.

**The abort** (`log/68_R5_tabpfn_entrant_result.md`). `tabpfn` **8.2.0**,
`tabpfn/browser_auth.py:621`: *"TabPFN requires a one-time license acceptance to download
model weights for local inference, but no interactive terminal is available."* Local weights
need a `ux.priorlabs.ai` account and `TABPFN_TOKEN`. The cloud route was never available —
`TabPFNTimeSeriesPredictor.__new__` defaults to `TabPFNMode.CLIENT`, which posts the series to
a vendor API. Under three minutes; not a timeout.

**Prediction (i) HOLDS — salvaged, and it is the one the review sentence needs:**

| venue | folds (step 7) | max train rows | validated limit | inside |
|---|---|---|---|---|
| beer_hall | 39 | **392** | 10,000 | yes |
| two_river_taps | 30 | **324** | 10,000 | yes |
| ellel | 38 | **385** | 10,000 | yes |

**3.9% of the sample limit** at the largest. The regime-fit claim is arithmetic, not rhetoric.

**Predictions (ii)–(iv): NOT TESTED.** May not be reported in any direction. Nothing licenses
any statement about how TabPFN-TS would have performed.

**The narrowed sentence, in three parts.** Keep the regime claim naming both models, now
quantified · state that only Chronos-2 was evaluated and why · never imply TabPFN-TS was tried
and found wanting.

**Discussion note.** Local weights behind a vendor account, and two entry points in one
library disagreeing on whether inference is local or cloud. **Ecosystem observation**, same
framing as Chronos-2 — not a criticism of Prior Labs. Relevant because the subject is a
small-business system with no ML staff.

---

## Everything still owed to the writing

Nothing below was written this session — *"do not start rewriting chapters this session"*.

**From the defensible rows**
1. D-D1: the RMSSE-headline paragraph, the R9 concealment sentence, the two failed predictions
   at equal prominence, the Chronos-2 limitation with its declined remedy.
2. D-D2: the estimand paragraph; the modified-MAPE / GRMSE support; the A12 nuance; correct
   "two parameters" to three; do **not** cite §2.3.
3. D-D3: replace "observed, not estimated" with the saturated-first-stage framing; add
   complete separation; keep the null-result caveat; state covariate poverty, → D-U3.
4. D-D4: split into three citations; delete any implication Sun & Yu bounds our coverage;
   label the observed-partition argument as ours; add ACI-measured-and-rejected.
5. D-D5: the three-part narrowed sentence; the provisioning note in Discussion; Further Work.

**Carried from earlier in the session**
6. **V1** — state the p>2 condition as the chapter's own derivation. **V3** — soften
   "deflates". (**V2 is now closed** by D-D4.)
7. **D-F3** — `tab:winkler` dashes, coverage Clopper–Pearson intervals, `tab:bases` bootstrap
   intervals. **D-F4** — `tab:ladder` dispersion (**W36**, the named reason Distinction is
   "Not met"). **D-F5** — state the Ask-F1 degeneracy as our instance. **D-F6** —
   retrieval-store threat model.

**Standing hazards — both CLOSED 2026-08-06, and one of them opened something bigger**
8. ~~Stamp `eval/interval_calibration` artefacts with `provenance.py`.~~ **DONE.**
   `runtime_stamp()` into the vectors JSON, `stamp_lines()` into the report footer. Re-run in
   `.venv-forecast`: diff purely additive, **no number moved**.
9. ~~`eval/worldcup_fixture_probe.py` is the third file to hard-code `calendar_lag7`; assume a
   fourth.~~ **DONE, and the note was wrong.** `harness.REPORTED_BASIS = "calendar_lag7"` is
   the documented project standard across ~45 sites; the real defect class is a *scaled*
   metric at Ellel, and there is **no fourth file**. The one instance is fixed and re-run, and
   had never published a number (report 19: *"June not present in this store, test
   deferred"*). Two reproduction limbs (`group_icl:274`, `weather_basis:295`) must **keep**
   the committed basis — do not "fix" them. Full record: `log/69`.

**NEW — open, and it is a methodology gate**
9b. **Two live rulers disagree by 24%.** `harness.REPORTED_BASIS = "calendar_lag7"` and
   `config.VENUE_SCALE_BASIS = "calendar_lag7_active"` are both live and not equivalent: mean
   scale 297.36 vs 369.16 at Beer Hall (**ratio 1.2417**), 153.52 vs 174.39 at TRT (1.1361).
   `tab:ladder` uses the first (`models/ladder.py:405`); R9, R2 and the world-cup probe use
   the second. **A MASE quoted without its basis is ambiguous by up to 24%, and MASE from
   different chapters is not directly comparable.** This is FLAG-MASE-RULER recurring one
   level up — report 42 removed three private copies of the denominator; the disagreement
   moved into two public constants. `harness.py` defers adoption because *"S1 is forbidden
   from re-running the ladder"*, which no longer binds. **Recommendation**: make
   `config.VENUE_SCALE_BASIS` the single authority, demote `REPORTED_BASIS` to a fallback,
   re-score `tab:ladder`. Costs a re-score, moves published MASE ~20%. Human call.

**Blocked on a third party**
10. R8 → S8b cache build → S8c / ECE / temperature scaling / agent-vs-constants. One command,
    blocked on Ryan's Anthropic key. Still the critical path.
11. D-U2 / D-U3 / D-U4 — Elliot: cost-ratio elicitation, booking diary, operator labels.
12. R5 — one env var (`TABPFN_TOKEN`) plus a licence acceptance. Evaluator committed.
