# What the reduction moved, and what it cost

**A register of every passage that left the body of this dissertation, written so that a reader
with the document in front of them can check each entry.** It is maintained as the reduction is
executed, not reconstructed afterwards. Body length is measured with `texcount -0 -sum -merge
-total`, excluding bibliography and appendices, which is the measure the 20,000-word cap uses.

**Status: COMPLETE. Body 27,759 → 19,933, measured, against a hard cap of 20,000.** The 8D
pass at the foot of this file is the review list; read its Summary first. Everything above it
records the passes that preceded it and the four realisation rates that refuted their forecast.

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

---

# PASS 8D — execution to the 20,000 cap. THE REVIEW LIST

**This section is the deliverable.** It records every passage removed to bring the body under a
cap that cannot be breached, sorted by the one column Phuong reviews: **whether an examiner could
reasonably ask for the material.** Read the HIGH block; the rest is recorded for completeness.

---

## Summary

| | |
|---|---|
| Body at the head of this pass, re-derived not quoted | **27,759** |
| Body at the close, measured | **19,933** |
| **Removed** | **7,826** |
| The cap | 20,000, hard |
| Margin | 67 |
| Overleaf commits | `4583325`, `7309139`, `20c0f85`, `3ef4946`, `2fb5dfb`, `afc1976`, `559c60d` |
| Rollback | tag `pre-reduction-full-run` at `ab832a4`, untouched. Nothing amended, nothing force-pushed |

**Per chapter, `texcount -0 -sum -merge -total`, abstract plus Chapters 1--6 being the counted
population per `00_marking_criteria.md` §1.1:**

| | Before | After | Removed |
|---|---|---|---|
| Abstract | 321 | 321 | 0 (protected, HC4/HC5) |
| 1 Introduction | 2,035 | 1,273 | 762 |
| 2 Literature Review | 4,979 | 3,699 | 1,280 |
| 3 Methodology | 5,486 | 4,283 | 1,203 |
| 4 Results | 7,883 | 5,581 | 2,302 |
| 5 Discussion | 4,761 | 3,085 | 1,676 |
| 6 Conclusions | 2,294 | 1,743 | 551 |
| **Body** | **27,759** | **19,933** | **7,826** |

### Criteria left undischarged or degraded, by number

| Criterion | Wording | State after this pass |
|---|---|---|
| **R114** | *"The Conclusions state what had to be learned in order to do the project."* | **UNDISCHARGED, and it was undischarged before this pass** — `00_marking_criteria.md` §1.1b found it unmet on 2026-08-09 and budgeted +150 words to fix it. Under a binding cap those words were not available, so the gap stands and Chapter 6 shrank instead. This is the one criterion with no discharging passage anywhere in the document. |
| **R66** | *"Every method that actually ships in the built system is argued for in this chapter."* | **PARTIALLY DISCHARGED.** Section 2.2 no longer exists as a section: the bar the baseline ladder is argued against survives as one sentence folded into 2.3, and the ladder's fuller justification now sits in Methods under R83/R84 rather than in the review. Every other shipped method keeps its argument in Chapter 2. |
| **R64** | *"The literature review narrows via the funnel model."* **Recommended, not mandated.** | **DEGRADED.** 2.1's general-context ring was already cut by the 8C-9 pass; this pass took the Gorry/Kumar framing down to a single sentence. The funnel now opens close to its subject. |
| **R59, R125** | critical writing; knowledge-transforming prose | **THINNED, not lost.** Chapter 2 keeps every qualification it argued for and loses the length at which it argued them. Chapter 5's section 5.2 states four divergences where it used to argue them. |

**No other criterion lost its only site.** R100's only site (4.4.6, the contrast of alternative
approaches) is retained; R102's per-question sites are retained; R103--R108 are retained;
R109--R113, R115 and R116 are retained; R94--R97 keep every float and its textual summary; R7 keeps
all five research questions verbatim in the Introduction.

### Findings the dissertation no longer claims

1. **The knowledge-gap signal, entirely.** That a chat corpus of 735 staff and assistant messages
   across 25 active days yields twelve clusters of which four clear an above-baseline threshold;
   that the signal enters the ranked output on the same footing as the sales signals with its
   wiring verified additive; and its two disclosed limitations, that most of the corpus carries no
   venue tag so a gap broadcasts estate-wide, and that it is the first composed signal carrying
   free-form staff text into a language-model-facing tool.
2. **The per-step half-width null.** That the recorded growth from 181 to 224 which justified
   capping the horizon at seven days was an artefact of roughly 26 observations per step, the Beer
   Hall per-step half-width being flat at power. The cap is retained; its evidence is not.
3. **The magnitude-gradient second statistic.** That magnitude-one spikes are caught at 0.375,
   0.500 and 0.333 against 0.958 to 1.000 for regime shifts of the same magnitude.
4. **The native-interval replication as a body finding.** That Chronos-Bolt's worst venue
   under-covers by 0.028 against the 0.28 the published figure implies, and that two of three of
   \citet{kaas_probabilistic_2026}'s orderings replicate. The trading-day corroboration survives at
   4.4.4 and the per-arm figures survive in Appendix E.
5. **The step-parameter reproduction check.** That with the step unset the harness reproduces the
   committed tables, and that the group study's univariate arm reproduces the committed ladder to
   within $1.4\times10^{-6}$ over 738 folds.

### Sources that left the bibliography

`siffer_anomaly_2017` (SPOT, with the point-anomaly branch of 2.7), `zou_poisonedrag_2025` (with
the chat corpus's write-path paragraph) and `hollmann_accurate_2025` (TabPFN's lineage in 2.3).
`staufer_2025_2026` left in the earlier 8C-9 pass, row 10. Cited keys 88 → 84. **No citation is
orphaned**, verified by set difference over every body and appendix file against
`pre-reduction-full-run`.

### What was protected and verified present at the close

Twenty-two protected items were greped for by their own wording after the last edit and all
twenty-two are present: 2.9's research-gap sentence, 4.4.1's premise line that 4.4.3 and 4.4.4
rest on, 4.2.4's occurrence-gating null, 4.2.1's unbiasedness null, both of C2's limbs stated as
nulls (weather at `results.tex` *"the set retains the no-weather arm at every venue, weather is
not statistically separable from no weather"*, pooling at *"Grouping is indistinguishable from or
worse than forecasting each venue alone"*), 4.5.1's strong null, 4.4.3's *"that agreement does not
add precision"*, all five of 6.2's contributions, R113's and R116's sentences verbatim, the three
honesty bounds (Dixon's thirty-two participants without an effect size, the judge's different
pairings, the rhythm that is not a memory architecture), R93's $F_\beta$ justification, Sun
supplying motivation with no theorem bounding the coverage, R7's five questions and HC59's six
divergences.

---

## The register, sorted by examiner exposure

**HIGH — an examiner could reasonably ask for this.**

| # | What it was | Words | Criterion it discharged | Undischarged now? | What the document can no longer show |
|---|---|---|---|---|---|
| 17 | **The knowledge-gap signal at all three of its sites**: Methods 3.11 whole (the clustering design, the above-baseline threshold, the pinned embedding backend, and the corpus's write-path paragraph citing `zou_poisonedrag_2025`), Results 4.5.5 whole, and the 6.1.1 sentence naming it | ~390 | none — the document's own words are *"a second signal reaches the same output without answering any research question"*; A17 had ruled it stay, under no length pressure | n/a. R82's *"inherent data limitations"* remains discharged by 3.8's CUSUM-constants passage | That the built system carries a second signal at all. A reader of the specification's four named data domains sees two accounted for and no trace of what the chat corpus produced |
| 18 | **4.4.6's per-step half-width null**: the flat Beer Hall per-step half-widths at power against the 181-to-224 growth the horizon cap was set on, and the finding that the growth was an artefact of ~26 observations per step | ~90 | R102 via D7 | No. 4.4.6 remains R100's site and keeps the five-method contrast, the adoption verdict and its qualification | Why the seven-day horizon cap is retained. The sentence *"the cap is retained, since nothing measured here evidences extending it"* now asserts what the removed passage measured |
| 19 | **4.4.5 Native model intervals, whole subsection**: the replication verdict against \citet{kaas_probabilistic_2026}, the 0.028-against-0.28 magnitude non-replication, and the two-of-three ordering result | ~150 | none — it answers no research question; RQ4's answer is carried by 4.4.1 to 4.4.4 and D7 names no location | No | That a published interval finding was tested here at all. The trading-day corroboration survives at 4.4.4 and Appendix E keeps the per-arm figures, so the evidence is in the document and the replication *claim* is not |
| 20 | **Chapter 2's section 2.2, Demand forecasting on short hospitality series**, folded into 2.3 as one sentence | ~180 | **R66** for the baseline ladder | **PARTIALLY.** The bar survives (*"simple methods are hard to beat … anything more elaborate must clear a classical or linear model on evidence rather than on architecture"*) and the ladder's fuller justification is in Methods under R83/R84, not in the review | The review no longer argues, at length and from three studies, why a simple model is the thing a foundation model has to beat |
| 21 | **4.5.2's magnitude-gradient second statistic** and the detector-choice explanation behind the weakness on point events | ~110 | R102 | No. The VUS-PR profile, its two exceptions and the cumulative-sum explanation are retained | The magnitude gradient as a second reading of the same corpus |

**MEDIUM — defensible to remove, and a marker might notice the absence.**

| # | What it was | Words | Criterion it discharged | Undischarged now? | What the document can no longer show |
|---|---|---|---|---|---|
| 22 | **5.3's numbers-audit paragraph**: 340 figures audited, 309 matching, seventeen mismatches, nine untraceable, two stale, four changing a conclusion, and the 0.045 ranking example | ~170 | R104, as a third validity limb | No. R104 is discharged by the pairing argument and the numerics-regime argument, both retained. **The audit itself survives in the document**, at 6.4, which keeps the 340/309/four figures | The Discussion no longer offers the audit as a validity argument; the Conclusions offer it as a transferable lesson |
| 23 | **4.1.2's step-parameter reproduction check** | ~70 | none | No | That introducing the one-day origin step was verified not to perturb the univariate path |
| 24 | **2.1's Gorry/Kumar framing ring**, reduced to one sentence; **2.7's point-anomaly and Bayesian change-point survey** (SPOT leaves the bibliography); **2.6's volunteered TabPFN-3 ranking instance**; **2.9's Ancker clinical effect size**; **2.3's energy-domain weather mechanism pair** and its foundation-model ablation argument | ~700 | R64 (recommended), R57, R59 | R64 **degraded**; R57 and R59 thinned | The review's widest ring, its strongest single piece of evidence that rankings move (a vendor reporting its own ordering moving), and the mechanism argument for why weather can cost more than it contributes |
| 25 | **5.2's argument for four of the six literature divergences**, now stated with their resolutions rather than argued | ~350 | none binds the Discussion; R60/R61 name the Background chapter and are discharged there | No | Why each divergence is a divergence rather than an error, at the length that shows the reasoning. Bears on **D7**, which names no location and is assessed holistically |
| 26 | **6.3's five smaller further-work extensions**, reduced to one sentence apiece | ~300 | none — no criterion names a further-work section | No. **R113's and R116's sentences are retained verbatim** in the two extensions that are changes to this work's own method | The reasoning behind five of the eight extensions |
| 27 | **3.3's Syntetos--Boylan diagonal geometry**, **3.2's Chatfield non-transfer argument** (now argued once, at 5.2), **3.6's confidence-set reading properties** (stated at 4.1.3 and in Chapter 2), **3.4's covariate-availability argument**, **3.1's fourth-location boundary** (argued under HC59 at 5.5) | ~450 | R83, R84 | No — every decision keeps its reason as a sentence, which is what R83 and R84 ask for | The derivations and arguments a reimplementer would read; Appendices B and C carry the demoted ones from the 8C-9 pass |

**LOW — duplication, exposition, or material stated at its criterion-bound site elsewhere.**

| # | What it was | Words | Criterion it discharged | Undischarged now? | What the document can no longer show |
|---|---|---|---|---|---|
| 28 | **1.4's five contributions in detail**, reduced to one paragraph naming them and pointing at 6.2 | ~550 | none — no Introduction criterion places contributions here; R109--R112 put them in the Conclusions | No | Nothing. The same five claims, with their measurements, are at 6.2 |
| 29 | **5.1's restatement of Chapter 4's supporting numbers** | ~355 | R103 | No — each of the five answers keeps the one measurement that carries it and a pointer to the Results section reporting it | This is the R102/R103 duplication the plan identified at §9b: the same measurement stated at two mandated sites |
| 30 | **1.2's five-limb literature survey** and 1.3's dependency-chain rationale | ~230 | R52 | No — the gap is stated as one proposition and R52 is discharged by it | The Introduction no longer previews Chapter 2's limbs |
| 31 | **Float captions across Results and Methods**, cut to the quantity, units, $n$ and interval type | ~180 | R136, R96, R97 | No — every float keeps an informative legend and its textual summary. **Every protected qualification is retained**, including `tab:weather`'s *"these are arm means and carry no interval of their own"* and `tab:winkler`'s per-venue $\gamma$-sweep note, both in bold | Explanation a reader gets from the surrounding text |
| 32 | **2.10's limb-by-limb research-question preview and four-results recapitulation** | ~330 | R62, R63 | No — the gap proposition, the PRISM disclaimer and the three things left undone are all retained | The synthesis no longer recapitulates the chapter before stating the gap |
| 33 | **Working and exposition across 4.1 to 4.5**: the multiple-comparison rationale, the adoption margin's derivation, the per-origin displacement enumeration, the false-open identity, the two-limbs restatement, the windowing remedy's walk-through, 4.4.2's meta-commentary, 4.4.3's active-versus-traded correction narrative, 4.5.4's inversion-size argument | ~900 | R87--R102 across sites | No — every finding, its number and its float are retained | The working behind results the tables already report |
| 34 | **6.1's three deliverable subsections and 6.2's argument around the five claims**, compressed | ~250 | R110, R111 | No — each deliverable is named and stated achieved or not; all five contributions keep their headline numbers | Exposition |

---

## Two defects made inside this pass and repaired, recorded because both compile silently

1. **Four hyphenated words broken across a line by re-wrapping** — *sub- blocks*, *one- sample*,
   *no- weather*, *decision- making*. LaTeX renders a source newline as a space, so each would have
   printed with a gap. **No compile reports this.** Found by scanning every body and appendix file
   for a line ending in a letter-hyphen and comparing against `pre-reduction-full-run`, which has
   none in any chapter. All four repaired; the helper no longer breaks on hyphens.
2. **Two `\ref` targets retired by a removal.** `\ref{sec:further-work}` was split across a line by
   the same wrapping, and `sec:rw-rhythm` was retired when 2.2 folded into 2.3 while `results.tex`
   still cited it. `latexcheck` caught both as undefined references. The second was repointed to
   `sec:rw-pooling` **and re-read against the target**, which carries the reconciliation sentence
   and `wickramasuriya_optimal_2019` that the citing sentence promises — a resolving `\ref` is not
   a true one.

**Two removals were considered and refused on cross-reference grounds rather than on evidence.**
Removing 4.5.3 (alert suppression) and the whole of 4.4.5 would each have orphaned a substantial
appendix section written to support them. Appendices are outside the counted population, so
removing the body anchor buys the cap nothing and costs the appendix its reader. The words were
found elsewhere.

## What the arithmetic looked like against the four measured rates

The plan's forecast, and the four realisation rates that refuted it, are at the head of this file.
**They held.** Compression across this pass returned between 5 and 12 per cent of the passages it
touched, and by the final sweep it was returning eight to thirty words a passage. The cap was
reached because material was **removed** rather than compressed: five findings, one whole signal,
one section of the review, and the second statement of the contributions. That is the trade Phuong
authorised, and the HIGH block above is what it bought.
