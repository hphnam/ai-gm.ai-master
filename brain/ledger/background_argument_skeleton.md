# Chapter 2 — argument skeleton extracted from the current prose

Written under `brain/PRJ93_RULES.md` before composing Chapter 2, per
`knowledge/05_paper_architecture.md` §8.3: *"Before composing Chapter 2 or Chapter 3,
extract the argument skeleton from the current prose — claim, warrant, rejected
alternative and its reason — into a working note, and compose against that note plus the
evidence."*

**Why this file exists.** `knowledge/05_litreview_verdicts.md` holds 63 extracted verdicts
and **none of the arguments below**. They exist only in the live
`chapters/literature_review.tex`, which took five revision rounds and 27 blocking findings
to reach. Composing from the verdicts alone would rebuild the citations and lose the
reasoning — and the reasoning is what discharges **D7**, the single named Distinction
blocker.

Each row states the argument, where it survives in the approved tree, and whether it is a
derivation the chapter owns rather than a claim it inherits. A row marked **OWNED** is one
where the chapter reasons past its sources; those are the rows a careless compression
turns back into knowledge-telling.

---

## The four §8.3 names, in full

### A1 · Globality is an estimation-budget argument, not a similarity argument → **2.3**

- **Claim.** `montero-manso_principles_2021` do not assume the series resemble each other.
  Global and local methods can produce the same forecasts *without any assumptions about
  similarity*; what differs is where the estimation budget is spent, since local complexity
  grows with the size of the set while global complexity stays constant.
- **Two limits the chapter derives — OWNED.** (i) It is a claim about **estimation**,
  whereas conditioning a frozen pretrained model on sibling series at inference fits nothing
  on the target collection, so the result does not transfer to that mechanism unmodified.
  (ii) The formalism supplies **no threshold** — nothing in it says three series is small and
  forty is large. The authors' own qualifier is *"in large datasets"*.
- **Consequence.** Small-collection pooling is an extension by analogy and is stated as a
  falsifiable conjecture rather than as an inherited result. The in-context demonstrations
  (`das_-context_2025`, `zhou_context-driven_2025`, `liu_generative_2024`) cannot refute it,
  because each runs on a collection far larger than three.
- **Rejected alternative and its reason.** Reading globality as a similarity assumption,
  which would license pooling three venues on the grounds that they trade alike. Rejected
  because the source explicitly disclaims it.

### A2 · The energy-versus-hospitality weather adjudication → **2.3**

- **Claim.** The strong weather evidence is in energy, not hospitality, and the coupling
  mechanism does not transfer. Electrical load is coupled to weather physically —
  temperature drives heating and cooling, irradiance drives generation
  (`kaas_probabilistic_2026`, `haben_short_2019`). Bar revenue is coupled to weather only
  through a person's decision to go out. Nothing licenses carrying an effect size across
  that gap.
- **Second limb — OWNED.** `haben_short_2019` report temperature as unhelpful and sometimes
  detrimental at low voltage, and give the mechanism: temperature is strongly correlated
  with seasonality, so the model learns it as a surrogate for a pattern it already encodes.
  **The generalisation — a covariate correlated with a seasonal signal the model already
  captures can cost more than it contributes, and the risk grows as the unit of aggregation
  shrinks toward a single site — is the chapter's inference, not the authors'.** They report
  at the low-voltage level without generalising.
- **Third limb.** The hospitality evidence is *two recommendations, one confounded
  correlation, and no controlled test*: `schmidt_machine_2022` call weather well known to
  help and then decline to use it; `chae_value_2024` tabulate it and use none of it;
  `hossain_comparative_2025` report −0.51 and −0.43 correlations on monthly averages over
  fifteen months in a monsoon climate, which is substantially a season effect, with no
  ablation.
- **Fourth limb.** `judd_forecasting_2025` run the controlled test in the closest available
  setting and find weather significant per drink category and *"not significant for total
  sales"*, the signs cancelling in aggregate; and *"hour and site are better proxies for
  footfall … than temperature and daypart"*. **The aggregation-level consequence — whether a
  weather effect can be found at all depends on the level at which it is sought — is the
  chapter's.**
- **Position reached.** Not *weather will not help*, but: a single site is not a region, a
  weather covariate competes with a strong recurring weekly pattern at venue-total
  aggregation, and it must be shown to earn its place before it is granted one.
- **Rejected alternative and its reason.** Importing the energy effect size, or the two
  hospitality recommendations, as evidence. Rejected on mechanism and on the absence of a
  controlled test respectively.
- **Also OWNED.** `hertel_explainable_2026`'s attribution shares (~9/10 on load history,
  3.6 % temperature, 2.7 % irradiance) are demoted to weak corroboration, because an
  attribution share measures how a fitted model distributes credit rather than what a
  covariate contributes out of sample.

### A3 · The median-versus-mean functional argument → **2.4 and 2.6**

- **The p > 2 derivation — OWNED, and flagged as owned in the prose.**
  `hewamalage_forecast_2023` state without condition that median-optimising measures treat
  constant zeros as the best prediction. The threshold at which that is exactly true is the
  chapter's: the median of a series is zero precisely when more than half its observations
  are zero, so the minimising constant is zero only once zero periods outnumber trading
  periods — that is *p* > 2, **stronger than the *p* > 4/3 that classifies a series as
  intermittent**. Confirmed by `literature_conformance.md` §0 **V1**: the unconditional
  version is what the source says; the condition is correct and is the chapter's own.
- **The Chatfield precondition — OWNED, and it is the estimand argument.**
  `chatfield_all-zero_2007` show the lowest forecasting error need not give the lowest
  system cost, and that all-zero forecasts are cheapest when lumpiness is high. The remedy
  that points to — change the objective from error to cost — **carries a precondition
  easily read past**: the cost is an inventory cost, priced in ordering, holding and
  shortage rates against a stock position, so it is defined only where the forecast is
  itself a replenishment quantity. Where the quantity forecast is not held, ordered or
  backordered, there is no unit for those rates to price.
- **The narrower transfer — OWNED.** A second part of the same study transfers without that
  precondition: Chatfield had to modify the percentage measure because it cannot divide by a
  demand of zero, and to drop a geometric measure recommended for intermittent demand
  because it breaks on forecast errors of zero. A study whose own denominator-bearing
  measures degrade on zero-heavy demand supports dropping the denominator where the zeros
  are thickest — **a smaller claim than changing the objective and a better-supported one**.
- **The coherence limb.** `kolassa_we_2023`: because the median of a sum is not generally the
  sum of the medians, forecasts minimising MAE — and MASE, *"just scaled MAEs"* — are
  usually not coherent, whereas coherence follows when the measure is minimised by the
  conditional mean. Bears on any estate reconciling venue forecasts to a total.
- **The wording limb — OWNED, per §0 V3.** Describing a naive benchmark's exact zeros as
  *deflating* the scaling denominator assigns a direction the source does not; the chapter
  marks it as its own characterisation.
- **Rejected alternative and its reason.** A cost objective in place of an error measure.
  Rejected because its two parameters are undefined for a quantity that is not a
  replenishment quantity — a property of the problem, not a convenience.

### A4 · The false-alarm asymmetry, at graded evidential strength → **2.9**

- **Claim.** `meyer_conceptual_2004` separates *compliance* (response to a warning) from
  *reliance* (response to its absence) and governs them by different detector properties:
  compliance by the response criterion — the cry-wolf syndrome — and reliance by
  sensitivity. `dixon_independence_2007` test the asymmetry directly and find false-alarm-
  prone automation hurt overall performance more, degrading both compliance and reliance,
  while miss-prone automation appeared to affect only reliance.
- **The grading — OWNED, and it is the chapter's strongest single piece of self-discipline.**
  Dixon is a laboratory study of thirty-two participants reported as a direction without an
  effect size, **so the asymmetry is asserted at that strength and no higher**.
  `ancker_effects_2017` put a magnitude on the same mechanism from 112 clinicians over three
  and a half years — acceptance falling about 30 % per additional reminder per encounter,
  about 10 % per five-point rise in the repeat proportion, both adjusted incident rate
  ratios — but the setting is clinical and **the numbers do not transfer; the mechanism
  does**.
- **The synthesis move — OWNED.** *The cost of an unnecessary alert is not paid by that
  alert; it is paid by the next one.* And the structure is not new: Page's average run
  length already traded the expense of false alarms under stable conditions against the
  delay before a real change is acted on, seventy years before it was restated for
  conversational agents. What the human-factors work adds is that in a managerial setting
  one of those two costs is borne by a person whose willingness to keep reading is itself
  consumed by the false alarms.
- **The measurement consequence — OWNED.** `trinh_hil-bench_2026`'s Ask-F1 is an
  **unweighted** harmonic mean of question precision and blocker recall (verified verbatim,
  NotebookLM, this session), i.e. it weights the two failure modes equally — the symmetry
  the section has just rejected. An adapted measure must therefore be an $F_\beta$ whose
  $\beta$ comes from an elicited cost ratio; and such a measure is informative only where the
  evaluation contains both failure modes, since a sweep in which one side never occurs is
  degenerate by construction.
- **Rejected alternative and its reason.** An undifferentiated F1 on adopt-or-dismiss
  outcomes. Rejected because it encodes a symmetry the human-factors evidence contradicts.

---

## Further owned derivations the verdicts do not hold

| # | Argument | → | Owned? |
|---|---|---|---|
| **A5** | **Structural closure, not sparsity, breaks the distinct-scores condition.** `angelopoulos_conformal_2023`'s two-sided bound needs almost surely distinct conformity scores. A mostly-zero series ties as a matter of course, but so does *any* venue with a closing day: doors shut ⇒ actual and forecast both zero ⇒ absolute residual exactly zero ⇒ an atom at zero. The upper bound is therefore unavailable wherever a trading calendar has holes in it. | 2.5 | **OWNED** — the generalisation from sparsity to closure is the chapter's |
| **A6** | **The recorded-regime extension of CPTC.** `sun_conformal_2025` treat the regime as latent by construction; their coverage loss is bounded by a term growing with the state-misclassification rate. If misclassification is the currency the bound is paid in, a regime variable that is simply *recorded* costs nothing. Stated with its limit: it carries no guarantee the paper proves about its own online procedure across to a static band. | 2.7 | **OWNED** — §0 **V2** confirms the source says the opposite of the framing an earlier draft attributed; the inference is valid *a fortiori* from Corollary A.2 and is the chapter's |
| **A7** | **Kostenko's correction moves the label, not the estimator choice.** `kostenko_note_2006` contribute two separable things: an arithmetic correction to `syntetos_categorization_2005`'s cutoffs (4/3, 0.5 for 1.32, 0.49), and a different selection rule, a diagonal $v > 2 - \tfrac32 p$. Because the rule is a diagonal rather than a threshold on $p$, for $p > 4/3$ the quantity $2 - \tfrac32 p$ is negative and the bias-corrected estimator is preferred at every $v$. **Geometry, not evidence.** | 2.4 | **OWNED** |
| **A8** | **The hurdle's limitation is a data property, not a modelling one.** `cragg_statistical_1971` / `mullahy_specification_1986`: whether a booking-led venue trades tomorrow is a different question, answerable from different information, from how much it takes if it does. But a hurdle is only as good as the occurrence signal available to it, and where that signal lives outside the dataset the two-part structure buys nothing. | 2.4 | **OWNED** |
| **A9** | **What transfers is pretraining on time series, not on language.** `tan_are_2024` remove the language model from three methods, or replace it with a basic attention layer, and accuracy is unchanged or better while training and inference fall by up to three orders of magnitude; `das_decoder-only_2024` reach it from the other side. Consequence: a disciplined baseline ladder and scepticism toward any component justified by language-model provenance alone. | 2.3 | inherited claim, **owned consequence** |
| **A10** | **A vendor report volunteering its own instability is the sharpest available evidence for it.** `grinsztajn_tabpfn-3_2026` report a checkpoint ranking second on skill scores and fourth on win rates, and say the win rates are *"very sensitive to tiny differences on a few datasets"*. That is a sharper instance of the rank instability `brigato_there_2025` and `hewamalage_look_2021` argue for than either supplies, **because it arrives from a party with an interest in the ordering being stable**. | 2.6 | **OWNED** |
| **A11** | **A near-complete confidence set is a statement about evidence, not a finding of equivalence.** `hansen_model_2011`'s own formulation: uninformative data yield a set with many models. And `harvey_testing_1997`'s correction factor vanishes when the evaluation window is as short as the horizon, leaving a statistic that is computable and carries no information whatever — which is why the number of evaluation origins is not a free parameter. | 2.6 | inherited claim, **owned reading** |
| **A12** | **The negative result is firm and the positive one is not, and the asymmetry is what makes the choice defensible.** `kim_towards_2022` show point-adjusted F1 is so generous that random scores reach adjusted F1 near one — firm, and disqualifying. What the literature offers instead, a lag-tolerant random-robust measure in the spirit of VUS-PR (`liu_elephant_2024`), rests on a benchmark whose series are not hospitality series, so it is the best available default rather than a settled requirement. | 2.7 | **OWNED** |
| **A13** | **The memory claim is narrowed on purpose.** A learned rhythm does the work of the *retrieval half* of a memory stream (`park_generative_2023`, `hu_memory_2026`) and supplies no reflection step abstracting episodes into higher-level inferences and no store of the agent's own past actions. The claim is therefore that the rhythm is a model of normality, not a memory architecture. | 2.8 | **OWNED** — a deliberate retreat that protects a claim from overstatement |
| **A14** | **The construction of the gap from PRISM.** `fu_prism_2026` gates on a calibrated acceptance probability set from an asymmetric cost ratio — so no claim of methodological novelty in cost-sensitive intervention is available, and none is made. What it leaves undone is threefold: fix the cost ratio to the stated preferences of the person who bears the cost; measure the calibration of the acceptance probability the ratio is applied to; and score the resulting decisions against that same person's accept-or-dismiss judgements. | 2.10 | **OWNED** — this is the gap |
| **A15** | **Field instantiation is a contribution of the kind this body of knowledge is made of.** `paleyes_challenges_2022`'s catalogue is assembled from reports of systems in deployment — it exists because deployments were written up, not because benchmarks were run. | 2.10 | **OWNED** |
| **A16** | **The gap's own conditional.** The positioning rests on a 2026 preprint: if PRISM's results do not survive review the gap is differently shaped, though the absence of an operator-grounded evaluation would remain. | 2.10 | **OWNED**, and it is R67 discharged at the point it bites |

---

## Deliberate cuts — brought to the author rather than made silently

| Cut | Words (current) | Reason |
|---|---|---|
| The chapter-opener roadmap and the four-argument manifesto | ~200 of the 343-word opener | §2.1 budgets ten sections summing to exactly 4,000 and gives the opener no line; §2.2 sends the opener's remnant to 2.10. Chapter-by-chapter signposting is R56's job in Introduction 1.5. |
| The preprint census (*"eighteen works … had not completed peer review"*) | ~55 | Review-conduct commentary (§1.1 item 0). R67 is discharged by the per-citation markers, which are retained in full, and by A16. |
| `ye_closer_2025` — why TabPFN v2 works given randomised attribute tokens | ~90 | The passage exists to license TabPFN-TS, and §4.5 removes the TabPFN withdrawal from the review entirely. `hoo_tables_2026` is retained for the known-future-covariate constraint, which is load-bearing for the availability-lead argument; `grinsztajn_tabpfn-3_2026` is retained for A10. |
| The wide foundation-model roster (`woo_unified_2024`, `liu_moirai_2026`, `goswami_moment_2024`, `rasul_lag-llama_2024`, `garza_timegpt-1_2024`) shown as a design space | ~40 | §4.5: *"the foundation-model landscape reduces to one grouped citation and the two models actually entered."* Retained as one grouped citation. |
| `xu_sequential_2023`, `angelopoulos_conformal_2023-1`, `stocker_gentle_2025` given individually | ~45 | 2.5 holds 340 words. Grouped with `gibbs_adaptive_2021` and `xu_conformal_2021` as the online-conformal family; `zaffran_adaptive_2022`'s efficiency penalty is the load-bearing member and is kept at full strength. |
| `parasuraman_complacency_2010` and `hancock_meta-analysis_2011`'s $\bar r$ figures | ~55 | 2.9 holds 400 words across two literatures. The trust-calibration frame is kept in one sentence; the meta-analytic effect sizes bear on robot trust rather than on the alert asymmetry that carries the argument. |
| Every forward reference to a Methods or Results section | ~70 across 8 sites | §2.10 requires the gap to follow from prior work alone, and passages #8 and #12 are REMOVE. A forward pointer also breaks under renumbering. |

**Nothing in the A-list above is cut.** Every row survives into the draft; the trace is in
`background_rewrite_critique.md` and in the criterion trace reported at hand-off.

---

## Ruling of 2026-08-07 — none of the four costed cuts is made

The hand-off carried a costed cut-list for the 893-word overrun: **A3 limb 3** (the Chatfield
"narrower part transfers" passage, ~90), **A6** (the recorded-regime extension, ~110), **A4's
foundation** (Meyer's compliance/reliance distinction, ~95) and the **limb-by-limb
decomposition** in 2.10 (~145). Phuong's ruling: **make none of them, and do not accept 4,893
as final either.** Two are rejected outright and two are deferred to a check that has not
been run.

**A4 and the limb decomposition are not cuttable.** A4's Meyer distinction is a claim about
prior work, so Chapter 2 is its home; removing it leaves the loss function without a warrant.
The limb-by-limb decomposition discharges **R63** — gap elicited equals gap filled — which is
a marking criterion, and the decomposition is what discharges it.

### The Chapter 2 / Chapter 3 boundary check — first step of 8C-2, not yet run

**A3 and A6 are not cut. They are tested for relocation.** The observation behind this is that
neither is only a Chapter 2 argument:

| | What it is | Whose ruling it underwrites |
|---|---|---|
| **A3** | The argument licensing one venue being scored unscaled | **Methods 3.2** — the ruling relocated there from Results in 8A.1 |
| **A6** | The strongest argument for the Mondrian design | **Methods 3.7** |

Both are derivations whose *conclusion* Chapter 3 has to state and justify anyway. If
Chapter 2 derives them in full **and** Chapter 3 restates the justification, that is
cross-chapter redundancy — the word-budget leak 8D is instructed to sweep for. The boundary
that resolves it: **Chapter 2 establishes what the literature supports and where it stops;
Chapter 3 applies it to this estate's design.** The derivation lives in one place and is
cited from the other.

**This is a relocation test, not a deletion test.** If Methods can carry A3 and A6, roughly
200 words leave Chapter 2 without a single argumentative move being lost, and the chapter
comes back close to budget for free. If Methods cannot carry them, the residue is genuinely
irreducible and the decision moves to **budget reallocation** — at which point Methods' real
floor is known, which it is not today. Deciding the reallocation now, on one chapter with the
other five unmeasured, is deciding blind.

**Until that check runs, 4,893 is provisional.** It is not an accepted overrun and it is not
a precedent. See `phase_state.md`.
