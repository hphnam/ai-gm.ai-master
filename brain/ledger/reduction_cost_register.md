# What the reduction moved, and what it cost

**A register of every passage that left the body of this dissertation, written so that a reader
with the document in front of them can check each entry.** It is maintained as the reduction is
executed, not reconstructed afterwards. Body length is measured with `texcount -0 -sum -merge
-total`, excluding bibliography and appendices, which is the measure the 20,000-word cap uses.

**Status: Chapter 3 demotions executed. Body 28,332 → 27,990, measured.**

**Rollback baseline.** Both repositories are tagged `pre-reduction-full-run`. Overleaf
`ab832a44a8f96fa6910efff5ae79e177727f8694`, confirmed on the remote with `git ls-remote` before
any further edit. Every chapter is committed separately, so any single chapter's changes can be
inspected or reverted on its own. Nothing is amended and nothing is force-pushed.

---

## Two judgements taken without asking, and they are the two to check first

Both were forced by the standing rule that a chapter's location-bound criteria are enumerated
*before* anything is demoted from it. Both overturn an item the plan had already priced and
approved, and both reduce the saving available. They are stated before the dependencies because
they are decisions rather than assumptions.

### J1 · Lever 1 is not a relocation lever. All six subsections reclassify to compression

**The plan priced six Results subsections for whole-subsection relocation — 2,032 words moved out
of the body for roughly 30 words of pointer each.** Counting the criteria each subsection actually
discharges, that pointer is not available anywhere.

| § | Subsection | Words | Location-bound criteria it discharges | Verdict |
|---|---|---|---|---|
| 4.1.1 | Ladder at the committed gate | 237 | **8** — R87 procedures, R88 settings, R89 data items, R92/R93 measures and why, R98, R99/R101, R102 | compression, ~10 available |
| 4.2.3 | Adoption margin | 413 | **5**, plus two protected qualifications | compression, ~190 |
| 4.2.4 | Occurrence gating | 269 | **declined** — the result is RQ2's null | not touched |
| 4.4.1 | Empirical coverage of the served band | 423 | **6**, plus three qualifications and the premise 4.4.3 and 4.4.4 both rest on | compression, ~100 |
| 4.4.6 | Interval methods on the Winkler score | 496 | **7** — and it is **R100's only site in the chapter** | compression, ~120 |
| 4.5.1 | Injection-design validity | 194 | **4**, plus a null and its strong-null qualification | compression, ~60 |

**Three of these are not secondary findings at all, which is what the lever required them to be.**

- **4.1.1 is the settings-and-procedures anchor for the whole of §4.1.** The entrant count, the
  origin count, the horizon and the denominator are stated nowhere else in Results, and the fact
  that the Harvey--Leybourne--Newbold factor is identically zero at six folds is what makes §4.1.2
  exist. Relocating it moves R87 to R89 and R92 out of the Results chapter entirely.
- **4.4.1 is RQ4's primary finding, not one of its secondaries.** Its closing inference —
  *"Split conformal cannot under-cover under exchangeability, so exchangeability is violated in
  these residuals"* — is the premise 4.4.3 and 4.4.4 are both built on.
- **4.4.6 is the only place in Results where alternative approaches are contrasted**, which is
  R100 — *"Suitable statistical methods are applied to contrast the different approaches tried."*
  Relocating it discharges R100 nowhere.

**Why the plan got this wrong, stated plainly.** It read R102 as the criterion governing Chapter 4
and priced every subsection against that one reading. R102 is one of **fifteen** criteria naming
Results (R87--R101 plus R102), and the others are the ones that bind here: they ask for
procedures, settings, data counts, measures, and a statistical contrast, and none of those is
discharged by a cross-reference. This is the same failure that cost Chapter 3 its forecast, where
the plan cited two criteria naming Methods and seven do.

**Effect: Lever 1 falls from 2,032 to roughly 480 of compression.**

### J2 · C-6 cannot be executed on §2.8 and §2.9. They are close-ups, not the long-shot band

**C-6 was approved to cut three sections of surveyed literature — §2.1, §2.8 and §2.9 — on the
stated basis that the review would lose "its long-shot band".** Read against the criteria, that
description is right about §2.1 and wrong about the other two.

**§2.8 and §2.9 are where the shipped system is argued for.** R66 requires that *"every method
that actually ships in the built system is argued for in this chapter"*, and these two sections
are the only place three shipped things are argued:

- **The intervention policy itself.** PRISM \citep{fu_prism_2026} is cited in §2.8 as formulating
  intervention as a cost-sensitive decision gated on a calibrated acceptance probability against
  asymmetric costs. That is the precedent for the cost-ratio sweep at §4.5.4.
- **The evaluation measure.** §2.9 derives, from Meyer's compliance/reliance distinction and
  Dixon's asymmetry, that the measure must be an $F_\beta$ whose $\beta$ comes from an elicited
  miss-to-false-alarm cost ratio. **R93 requires Results to state why its evaluation measures were
  chosen, and this is where that reason lives.**
- **The calibration instrument**, \citet{guo_calibration_2017} and expected calibration error.

**And §2.9's closing sentence is the research gap.** *"That measurement would carry the coverage
guarantee of Section~\ref{sec:rw-conformal} through to an agent's own output, and no surveyed
system reports it."* R62 and R63 require the gap to be elicited and to be the gap the method
fills. Cutting §2.9 deletes the sentence that elicits it.

**Two honesty bounds and one qualification would also have gone**, and each is the kind of
sentence the standing rules protect: the reading that an LLM judge's 85 per cent against humans'
81 is computed over *different pairings* and so supports "about as well as" and not "better";
Dixon's asymmetry being *"a laboratory study of thirty-two participants reported as a direction
without an effect size … available at that strength and no higher"*; and §2.8's argument that the
shipped learned rhythm does the retrieval half of agent memory but supplies no reflection step,
so it *"can serve as a model of normality without constituting a memory architecture"*.

**What is executed instead.** §2.1's first two paragraphs are the genuine general-context ring and
go; §2.1's third paragraph is the chapter's roadmap and stays. §2.8 loses its adjacent-systems
citation ring — five sources named only to establish that they supply no precedent in a
multi-venue operational setting — and is compressed. **§2.9 is retained in full.**

**Effect: C-6 falls from 1,403 cut to roughly 260.**

---

## Two dependencies, stated first

Both are assumptions the reduction rests on. Neither has been confirmed, and each would change
what has to happen if it is wrong.

### D1 · The R102-minimum reading

**R102** reads *"Results state what the findings imply for the research question(s)."* **This
reduction assumes it is satisfied once per research question, not once per finding.** A question
supported by four results has its implication stated once, in the body, with the supporting
measurements in an appendix and the body naming each finding and pointing at it.

The reading was tested per question rather than applied wholesale, **and it does not hold
everywhere**: for RQ3 it fails, because that question names two limbs (weather, and cross-series
pooling), the limbs measure differently, and neither is secondary to the other. Both stay in the
body.

**Material affected — 2,032 words, all of it planned rather than executed:**

| § | Subsection | Words | Research question |
|---|---|---|---|
| 4.1.1 | Ladder results at the committed gate | 237 | RQ1 |
| 4.2.3 | Adoption margin | 413 | RQ1 |
| 4.2.4 | Occurrence gating | 269 | RQ2 |
| 4.4.1 | Empirical coverage of the served band | 423 | RQ4 |
| 4.5.1 | Injection-design validity | 194 | RQ5 (via contribution C4) |
| 4.4.6 | Interval methods on the Winkler score | 496 | none — answers D7 |

Plus roughly **568 words** of consequence clauses in Results that Section 5.1 already states with
the same numbers.

**If the stronger reading governs — that each finding needs its implication in the body — all of
this returns**, and the body cannot reach 20,000 without removing findings from the dissertation
altogether.

### D2 · The appendices assumption

**Roughly 4,900 words have been relocated to Appendices A–E on the premise that appendices are
read and assessed.** Every derivation, every reconciliation working and every rejected
alternative now sits there, with the body carrying the finding and a cross-reference.

**If appendices are excluded from the word count and are also not read closely, this reduction
has been moving evidence out of the reader's view rather than out of the count** — a worse
outcome than being over length. Nothing in the register below is safe from that objection; it
applies to every row at once.

---

## Chapter 3, Methodology — executed

**5,828 → 5,486.** Seven passages moved. Two further passages were planned for demotion and
**withdrawn** on a criterion check, recorded at the foot of this section.

| # | What it was | Where it went | Criterion it discharged in the body | Still discharged? | What the body can no longer show inline |
|---|---|---|---|---|---|
| 1 | The elicitation argument: why an absolute measure elicits a median and a squared measure a mean, and the basis-and-as-of stamping convention the in-sample denominator forces | App B, *Elicitation, and the stamping convention it forces* | **R83** — justify why each decision was made | **Yes.** The body retains the decision (squared carries the headline), its reason (the decision layer acts on expected takings), and **R82's** bias reflection in full: the served model returns a median under a mean's name | The derivation connecting loss function to elicited functional, and the rule that no scaled figure is compared across as-of dates |
| 2 | The derivation of the attainable interval size ($n < (1-\alpha)/\alpha$) and the Angelopoulos two-sided coverage bound $1-\alpha+1/(n+1)$ | App B, *The attainable interval size, and the two-sided coverage bound* | **R83** | **Yes.** The body retains the substitution actually made (largest observed residual), its reason, the tally that keeps it honest, and the statement that both directions are tested | Why nine calibration points is the threshold, and the algebraic form of the upper bound |
| 3 | The Mondrian construction's three claims separated by source — Vovk for what it is, Stocker for what it guarantees, Sun for what merely motivates it | App B, *What the Mondrian partition inherits, from where* | **R84** — justify why alternatives were rejected | **Yes.** The body retains the rejection of an inferred regime, its reason, and the honesty note that Sun's result does not certify the choice | The separation of the three sources, which is what shows the guarantee is narrower than the citation list suggests |
| 4 | The adaptive methods as implemented, including the Bernstein aggregation and the per-bound pinball loss | App B, *The adaptive methods as implemented* | **R84** | **Yes.** The body retains that both were implemented and measured, that the served band is the one that outscored them, and why measurement beat citation | What was actually run, at the level a reimplementer would need |
| 5 | The saturated first stage: probit/logit equivalence to within-cell frequency, agreement to $7.6\times10^{-5}$, and the complete-separation diagnostic | App B, *The saturated first stage* | **R83** | **Yes.** The body retains the estimator, why zero-or-one at the Beer Hall is a property of the venue rather than of the code, and why the closed form was chosen | The numerical evidence that the two estimators agree, and the divergence check behind "numerically stable" |
| 6 | The two injection pipelines and the feedback loop the design makes observable | App C, *The two injection pipelines* | **R83** | **Yes.** The body retains the control/realistic distinction, why fixing magnitude in revenue makes the arms comparable, the $n=120$ subsample and Ellel's exclusion with its reason | The mechanics of the realistic pipeline, and the refit-suppression loop stated as a design property |
| 7 | The intervention-layer apparatus: caching and replay, temperature and pinning, the baselines and the paired bootstrap | App B, *The intervention-layer apparatus* | **R83** | **Yes.** The body retains that the served artefact does not use a model, the two pre-registration features that foreclose specific criticisms, and the advance declaration that agreement is a negative result | How a reader without a credential would reproduce the numbers |

**Two withdrawals, and the reason matters.** The plan listed nine demotions. Two are **not
available**, and the check that found this was the enumeration of every criterion naming Methods
rather than only the two the plan cited:

- **The detection pairing's literature inheritance (208 words).** The passage states that the
  CUSUM constants $k=0.5$, $h=5$ are derived for a statistic standardised by a standard deviation,
  that Equation~\ref{eq:z} divides by a conformal half-width instead, and that their published
  false-alarm properties are therefore undefined here. **That is R81 and R82** — *"Methods reflect
  on whether noise / bias could have been introduced by the approach"* — **and both name Methods.**
- **The chat corpus's write path (141 words).** The passage states that staff compose the messages
  the signal reads, so material reaching the briefing is supplied by the people the briefing
  describes. **R82** names *"inherent data limitations"* explicitly.

Both were reclassified to the compression block rather than deleted. **Nothing was lost; the plan
was wrong about what was movable.**

---

## Planned and not yet executed

Nothing below has happened. Each will get a full row when it does.

| Item | Words | Status |
|---|---|---|
| Chapter 3 compression block, now carrying the two withdrawn demotions | ~900 priced | not started |
| Lever 1, six whole-subsection relocations in Results | 2,032 | not started — **depends on D1** |
| The Results/Discussion de-duplication | ~568 | not started — **depends on D1** |
| C-1, Section 4.4.2's second-demonstration paragraph | 111 | not started |
| **C-6, three sections of surveyed literature** | **1,403** | **not started — see below** |
| Chapters 1, 2, 5, 6 compression | ~3,500 priced | not started |

### C-6 · Three sections of surveyed literature, cut rather than relocated

**This is the only item in the whole reduction that removes material from the dissertation
entirely rather than moving it to an appendix**, and it is listed separately for that reason.

| Section | Sources cited there | Sources cited nowhere else |
|---|---|---|
| 2.1 Decision support and delegated autonomy | 4 | **3** |
| 2.8 Proactive agents and intervention policy | 15 | **4** |
| 2.9 Evaluation of agent interventions | 10 | **3** |

**Ten sources leave the bibliography. No citation is orphaned**, because every key still cited
elsewhere survives on that other citation, and no measurement or result is affected: this is
surveyed literature, not this project's evidence.

**What the review loses is its long-shot band.** The chapter is built on a funnel that narrows
from general context, through work with a bearing on the research, to work under direct
examination. This removes the widest ring. A reader arrives at the research gap with less context
for why it is a gap. The synthesis and research-gap section and the conformal-prediction section
are the close-ups and are untouched.

**A second cost, budgeted with it rather than after it:** Appendix A records the corpus search and
screening. A review discussing ten fewer sources than the screening record admits needs Appendix
A's narrative reconciled, or the two disagree.

**R122 and R123 do not bind it**, since they govern the *form* of each engagement with the
literature and say nothing about how many engagements there are. **R66, R62 and R63 do bind it**,
which is J2 above, and they are why only §2.1 was taken.

---

## Chapter 5 and Chapter 2 — executed

**Body 27,990 → 27,759.** Three passages moved or compressed. Every retained sentence is quoted
against the criterion it discharges.

| # | What it was | Where it went | Criterion it discharged | Still discharged? | What the body can no longer show inline |
|---|---|---|---|---|---|
| 8 | The Bartlett serial-dependence correction to Ellel's pairing gain: the lag-budget sweep $6.37/5.82/5.14/4.10/2.53$, the differential's $0.24$ autocorrelation at ten folds against marginals decaying by the seventh, and the two venues where the correction reverses ($5.46 \to 9.71$, $8.33 \to 10.36$) | App C, *The serial-dependence correction to the pairing gain* | **R104** — the Discussion argues whether the approach is valid, and why | **Yes.** The body retains the factor of $6.2$, the bound it buys ($\pounds 1.91$ at $0.50$ of a paired standard error against $0.08$ unpaired), **both limits verbatim** — folds treated as independent, and no pre-registered minimum detectable effect — the reading that $6.2$ is *"an uncorrected figure and, at Ellel, an upper bound on the pairing gain"*, and that the correction *"cannot be signed in advance"* | The arithmetic of the correction, and which lag budget produces which ratio |
| 9 | The numerics-regime detail in §5.3: the per-step and pooled $p$-values, the $25$-points-on-$1814$ movement, the $0.0006$ coverage movement, and the two-significant-figure stability statement | Deleted from §5.3 — **all of it already stands in §4.4.6** | **R103** — the Discussion answers what the results reveal | **Yes.** The body retains the answer: a recommendation to change the served band exists under one numerical library and not the other, the Monte Carlo bound showing the move is twelve times resampling noise, the reading that it is *"not noise in the bootstrap, and neither is it evidence that the arms differ"*, and why Two River Taps is where it surfaces | Nothing. This is the R102/R103 duplication removed at R103's end, which is the end §9b identified |
| 10 | §2.1's general-context ring: the Gorry framing at length, the thirty-product safety index, and the deployment-workflow survey | Cut. **`staufer_2025_2026` leaves the bibliography; `paleyes_challenges_2022` survives at its second site** | **R64** — the funnel's widest ring (*recommended, not mandated*) | **Partly.** The funnel loses depth at its widest point. The framing claim itself is retained in one sentence with both load-bearing citations, and the roadmap paragraph is untouched | The evidence that agentic products disclose almost nothing about safety and evaluation |

**One error made and corrected inside this pass, recorded because it is the kind that compiles.**
Compressing §2.8's adjacent-systems sentence, the five citation keys were dropped along with the
words, leaving *"Adjacent systems pursue proactivity across dialogue, wearables and mobile
interfaces without supplying a precedent"* as an **uncited claim about the literature** — R120 and
R121. It would have compiled cleanly and read fluently. The citation was restored and the sentence
now saves only the words it can afford to.

---

## What this pass declined, and why

Each of these is a saving the plan had priced and this pass did not take. **Every one of them
removes a finding**, which is the one thing ruled out.

| Candidate | Words | What leaves the dissertation with it |
|---|---|---|
| §4.4.6 Winkler, whole | 496 | **R100's only site** — the sole contrast of alternative approaches in Results; the numerics-regime sensitivity finding; and the null that the recorded per-step half-width growth was an artefact of ~26 observations per step |
| §4.2.4 Occurrence gating | 269 | **RQ2's null**, and the degeneracy analysis conceding the null *"is the expected geometry rather than a measurement about the venue"* — a self-refutation the chapter volunteers |
| §4.5.1 Injection-design validity | 194 | RQ5's **validity precondition**, and a strong null distinguished from an underpowered one by a numerically identical perturbation |
| §2.9, whole (C-6 as approved) | ~570 | The **R62/R63 gap sentence**; **R93**'s justification for the evaluation measure; two honesty bounds and Dixon's effect-size caveat |
| §6.2 Contributions, compressed | ~400 | **This is where C2 went missing once already**, to a compression of exactly this kind. The standing rule *"compression removes negative results first"* was written from that incident |
| §4.5.5 Knowledge-gap signal | 223 | Ruled unavailable under A17 |
| C-3 | 76 | Declined by Phuong: *"the worst trade on the list"* |

---

## The arithmetic, stated against the cap

**Four realisation rates are now measured rather than estimated, and they agree.**

| Item | Priced | Realised or re-priced | Rate |
|---|---|---|---|
| Chapter 3's nine derivations | 1,675 → save 1,215 | **342** | **28 %** |
| Lever 1, six Results subsections | 2,032 | ~480 | **24 %** |
| C-6, three review sections | 1,403 | ~260 | **19 %** |
| This pass, Chapter 5 + Chapter 2 | — | **231** | — |

**Every rate the plan used was set by reading one criterion per chapter. Every rate measured
since has come in between a fifth and a third of it, and the cause is the same each time: the
chapter is governed by more criteria than the plan counted, and each one demands a retained
sentence.**

| | |
|---|---|
| Body now, measured | **27,759** |
| The cap | 20,000 |
| **Gap** | **7,759** |
| Everything still priced and unexecuted, at the plan's own rates | ~7,000 |
| The same, at the measured 24--28 % | **~1,900** |
| The same, at a generous 50 % | ~3,500 |

**The cap is not reachable by editing.** Executing every remaining item in the plan, at prices the
plan's own measurements have now refuted three times, would land above 20,000. At the rates
actually observed it lands near 25,800. **The shortfall is between roughly 4,300 and 5,800
words, and there is no editorial lever left that does not take a finding with it.**

That is the halt condition as Phuong wrote it: *"If reaching 18,000 would require removing a
finding, DO NOT. Stop at whatever compliant number you reach, and report the gap with the
candidates you would have had to take."* The candidates are the table above. **The document is
not yet compliant, and closing the gap is a decision about scope rather than about length.**
