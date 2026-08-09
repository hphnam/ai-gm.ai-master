# The reduction plan — REVISED against a hard 19,000 ceiling

**Revised 2026-08-09 under the 8C-9 brief. NOT EXECUTED.** Phuong rules section by section.
Nothing has been compressed, demoted, cut or moved.

**Supersedes the 2026-08-09 first draft of this file**, which was costed against a soft
constraint. That draft's recommendation is withdrawn — see §1. It in turn superseded
`ledger/relocation_candidates.md`.

---

## 1 · The withdrawal, recorded so it is not re-offered

> **"Execute the plan to its ceiling and accept a body near 22,000"** — first draft §6,
> 2026-08-09. **WITHDRAWN by Phuong the same day. It was wrong.**

**The ceiling is hard.** There is no acceptable overrun and no justification that covers one. A
plan landing at 22,031 does not fall short of a target; **it fails the constraint**, and offering
it as an outcome was the error. *(The ceiling was 20,000 when this was withdrawn and is now
19,000 — see the final ruling below. The withdrawal stands under either.)*

The reasoning that produced it is worth naming, because it is a general failure mode rather
than a slip. The first draft treated the protected set as fixed and the target as negotiable,
then reported the residual as a finding. **That inverts the constraint.** When a limit is hard,
the protected set is what must be re-examined, and "protected" has to be re-derived from what
each criterion actually says rather than carried forward from a pass made under a softer rule.
Doing that re-derivation is what §3 below is, and it moved material in **both** directions.

### FINAL RULING — Phuong, 2026-08-09. This does not move again.

| | governing (`texcount`) | note |
|---|---|---|
| **HARD CEILING** | **19,000** | **exceeding it is not available** |
| **Target** | **18,000** | |
| ~~20,000~~ | — | **irrelevant — the regulation, not the constraint being worked to** |
| **Body today, true** | **~28,980** | 28,750 printed + 230 the instrument cannot see (§2) |
| **This plan at ceiling** | **16,661** | |
| **This plan at EXPECTED landing** | **17,989** | **1,011 below the ceiling, 11 below target** |

**A plan whose EXPECTED landing exceeds 19,000 has not met the constraint, whatever its ceiling
says.** That is the standard this file is now written to, and §6 reports the expected landing
first and the ceiling second.

**15,000 is off the table**, which removes any reason to push compression past what it safely
gives. Under a hard ceiling the lever is **demotion**, whose limit is not budget but whether the
body still discharges its criteria.

---

## 2 · The governing instrument is under-reporting, and the defect is verified

**`texcount` silently drops the entire caption of any float whose `\caption[...]` short title
wraps a line.** Not the short title — the whole caption body.

Found by pricing each float empirically: remove the float from a scratch copy, re-run
`texcount -0 -sum -merge -total`, take the delta. Five of nineteen floats priced at **exactly
zero**, which is not a property captions can have.

| Float | Chapter | Caption words a marker reads | `texcount` counts |
|---|---|---|---|
| `fig:drift` | 4 | 52 | **0** |
| `fig:validity-efficiency` | 4 | 45 | **0** |
| `fig:pipeline` | 3 | 42 | **0** |
| `tab:bases` | 3 | 49 | **0** |
| `fig:gap-map` | 2 | 42 | **0** |
| | | **230** | **0** |

**The wrapped-short-title hypothesis predicts all five and only those five — 19 of 19 floats
classified correctly, no false positives, no false negatives.** `fig:ladder`'s short title fits
on one line and prices at 51; `fig:drift`'s wraps after *"calendar-open days that did not"* and
prices at 0.

**Three consequences, and the third is the one that binds this plan.**

1. **The compiled declaration understates the dissertation by 230 words.** It prints 28,750
   against a true ~28,980. That is a printed number that is wrong, in the file this project has
   already had to repair once for printing a false statement.
2. **The brief's premise "demoting a float moves its caption out of the count entirely" is false
   for 5 of 19 floats.** Demoting `fig:drift` saves exactly zero governing words. Any plan that
   priced the caption lever from `texcount` deltas alone would have mispriced those five.
3. **The fix is free of content and must run FIRST.** Putting each short title on one line
   changes nothing a marker reads and nothing the LoF shows; it changes only what the instrument
   sees. It will **raise** the printed count from 28,750 to ~28,980 before anything falls, which
   is the honest direction. Executing the reduction before this fix means measuring the whole
   pass with an instrument known to be blind in five places.

This is `verify the instrument, not only the artefact` at the exact point the instrument became
load-bearing. The first draft quoted 872 caption words from `texcount` and `wordcount.py`
reported 1,136; the first draft recorded the difference and did not chase it. The difference
*was* the defect.

### The caption lever, priced properly

The brief asks for this specifically, and the honest figure is lower than hoped.

| | governing words |
|---|---|
| All 19 float captions, as a marker reads them | 1,136 |
| — of which `texcount` cannot see | −230 |
| **Visible to the governing instrument** | **806** (Ch 4 806, Ch 3 102, Ch 2 0 — Ch 2's only float is a dropped one) |
| Recoverable by **demoting** floats the body does not need (`tab:intermittency` 90, `tab:weather` 109) | **199** |
| Recoverable by **compressing** the 12 retained captions from ~55 words to ~35 | **~240** |
| **Caption lever, realistic total** | **~440** |

It is real, it is cheap, and it is **not** the cheapest large reduction available — it is about
5 per cent of what has to be found. The floats the body could most afford to lose are the ones
carrying the least caption, and the two largest captions (`tab:weather` 109, `tab:winkler` 107)
sit on the C2 and D7 evidence tables respectively, only one of which can move.

---

## 3 · The protected set, re-examined against what the criteria actually say

**The brief's instruction: "If a criterion demands the material in the body specifically, quote
the criterion saying so — do not infer it."** Doing that is the largest single result of this
revision, and it moved material both ways.

### 3a · Which criteria name a location, verbatim

| Criterion | Wording, quoted from `00_marking_criteria.md` | Names a location? |
|---|---|---|
| **R7** | "A research question (or questions) is explicitly stated **in the Introduction**." | **YES — Introduction** |
| **R83** | "**Methods** justify why each decision was made." | **YES — Methods** |
| **R84** | "**Methods** justify why the alternatives considered were rejected." | **YES — Methods** |
| **R102** | "**Results** state what the findings imply for the research question(s)." | **YES — Results** |
| **R103** | "**The Discussion** answers what the results reveal in relation to the research question(s)." | **YES — Discussion** |
| **R104** | "**The Discussion** argues whether the approach is valid, and why." | **YES — Discussion** |
| **R105** | "**The Discussion** states the inherent limitations of the work." | **YES — Discussion** |
| **R106** | "**The Discussion** states the potential biases in the work." | **YES — Discussion** |
| **R107** | "**The Discussion** explains how the underpinning assumptions may have impacted the findings." | **YES — Discussion** |
| **HC59** | "Any significant difference between the project specification's scope and the project as performed is explained **in the Discussion**." | **YES — Discussion** |
| **HC54** | "…is included **as an appendix**." | YES — appendix (met) |
| **HC57** | "**Appendices are placed after** the References section." | YES (met) |
| **R8** | "Each stated research question is explicitly answered **by the end of the document**." | **NO — document-scoped** |
| **D7** | "There is an explicit discussion of why the approach taken is better than alternatives that could have been used." | **NO** |
| **R109–R116** | "**The Conclusions** revisit / state / discuss…" — eight of them | **YES — Conclusions** |
| **R69** | "Pseudocode and/or flow diagrams are **provided** where algorithms are described." | **NO** (already in App B) |
| **R65** | "A search protocol is **stated**…" | **NO** (already in App A) |

**CORRECTION to this table's first statement, appended rather than applied silently.** It
originally listed R8 as the criterion protecting §5.1 and concluded the protection was an
inference. **R8 is document-scoped, but R103 is not** — *"The Discussion answers what the results
reveal in relation to the research question(s)"* protects §5.1's **presence in the Discussion**.
The compression 1,060 → ~500 stands, because R103 requires the answers to be there rather than to
be long. **What changes is that §5.1 may be compressed and may not be demoted.** The same sweep
found R102 binding Results and **eight** criteria binding the Conclusions, which is why Chapter 6
is the wrong place to look for savings — §6f.

**Two findings, and they cut against each other.**

**R8 and D7 do not require body placement, and the first draft's largest protections rested on
inferring that they did.** R8 says *by the end of the document*. An appendix is part of the
document. So §5.1's 1,060 words are not immovable, and D7's material carries no placement
requirement at all.

**R83 and R84 DO require body placement, and the first draft was demoting material they
protect.** *"Methods justify why each decision was made"* and *"why the alternatives considered
were rejected"* bind those justifications to Chapter 3. The first draft's demote list included
*"Mondrian-as-observed-variable justification"* (163) and *"adaptive alternative"* (104) — a
decision's reason and a rejected alternative's reason. **They cannot leave Methods.** What
*can* leave is the derivation, the implementation narrative and the supporting working; the
reason must stay as a sentence. That retention costs roughly 230 words back across the nine
demoted items, and §5 now carries it.

**Where no criterion names a location, the argument for keeping something in the body is a
judgement about how a marker reads, and it is recorded as a judgement.** It is not worthless —
a rejected-alternatives discussion in an appendix is less likely to be read as D7's *"explicit
discussion"* than one in Chapter 3 — but it is not a requirement, and under a hard ceiling a
judgement yields where a quoted criterion does not.

### 3b · The five populations the brief named

**The test, per the brief: not "is this load-bearing" but "does the BODY need this inline, or
does the body need the FINDING plus a cross-reference while the working sits in an appendix?"**

---

#### (i) The four-limb reconciliation — 1,973 marker · **PARTIALLY DEMOTABLE, ~550**

No criterion places it. Taken limb by limb rather than as a block:

| Limb | Today | Body retains | Moves to | Saves |
|---|---|---|---|---|
| **4.4.1** Empirical coverage | 423 | The three coverage figures, `tab:coverage`, the verdict that the band under-covers at the Beer Hall and the dependence caveat on overlapping origins | App D: the binomial retention regions, the 80 %-level cross-check, the withheld-upper-limb continuity condition | ~200 |
| **4.4.2** Traded decomposition | 373 | **The reversal in full** — Ellel 0.692 on 240 trading pairs, ~7 SE, the largest miscalibration in the study — plus `tab:coverage-traded` | App D: ¶3, the methodological reflection on why the earlier reading was available | ~105 |
| **4.4.3** Exchangeability | 457 | Trading-day mean ranks 0.52 / 0.81 / 0.48 predicting coverage in sign and size | App C: the `active`-versus-traded correction narrative, the two checked deflections | ~80 |
| **4.4.4** Drift cause | 720 | Both mechanisms — deflation dissolves BH and TRT drift; Ellel's is composition — **and the second violation**, 94 of 546 calendar-closed days traded | App C: the false-open identity working, and the windowing-remedy paragraph whose table (`tab:window`) is **already** in App C | ~165 |

**Verdict.** The limbs are not one object and must not be ruled on as one. ~550 words of
working leave; every verdict stays where it is made. The windowing paragraph is the cleanest
single item in the chapter: ~200 words of remedy evaluation in the body pointing at a table in
Appendix C, replaceable by *"capping the calibration pool helps one venue, is neutral at a
second and harms the third, so it is not adoptable without per-venue tuning"* plus the
cross-reference, at ~35 words.

#### (ii) `sec:res-traded` — 373 marker · **PROTECT, and the earlier ruling is CORRECT for a stronger reason**

The brief reopens this. Re-examined, it should stand — but **not** on precedent, and not on a
criterion.

**§4.4.1 states a verdict that §4.4.2 reverses.** §4.4.1 reports Ellel as *"indistinguishable
from nominal"*; §4.4.2 shows Ellel covers 0.692 on the days it traded. Demote §4.4.2 and
**§4.4.1's verdict stands uncorrected in the body**, with the correction one appendix away. That
is not a body missing its working; it is a body asserting something the document elsewhere
refutes — the exact defect class this project spent 8C-7 removing from `log/72`, and
`PRJ93_RULES.md` already records that a supersession belongs *in the superseded text*.

**A correctness argument outranks a placement judgement**, and it is available here where it is
not available for the other limbs. ~105 words of meta-commentary can still leave.

#### (iii) C2 — weather and cross-series pooling — 841 marker · **DEMOTABLE, ~520**

No criterion places it. The population the document **omitted entirely** until 8C-5.

| | Today | Body retains | Moves to App D | Saves |
|---|---|---|---|---|
| 4.3.1 Cross-series ICL | 351 | The finding and `tab:group` | the per-arm walk-through | ~210 |
| 4.3.2 Weather | 490 | The controlled contrast's verdict and its headline numbers; **the null stated as a null** | the arm-by-arm working and `tab:weather` (109 governing) | ~310 + 109 |

**The directional-compression rule is satisfied and must be checked on execution.** That rule
says a length pass deletes nulls first. **Demotion is not deletion** — but the *finding* stays
in the body as a stated negative result, not as a cross-reference. The post-pass check is the
one the rule specifies: grep `weather`, `pool`, `cross-series`, `exogenous` in the body and
confirm each still returns a stated result.

#### (iv) D7 — MCS and the origin-count reversal — 553 marker · **COMPRESSIBLE, not demotable in practice**

**D7's text names no location**, so the first draft's protection was inferred rather than quoted.
But two things keep this in the body on judgement:

- `05_paper_architecture.md` §4.5 already rules that *"what must survive is the origin-count
  reversal and the confidence sets, because D7 … is the single named reason Distinction is not
  met"*. That is a project ruling, not a criterion, and it is recorded as such.
- D7 is a **holistic distinction-band** criterion assessed by a marker reading the dissertation.
  An explicit comparison against rejected alternatives sitting only in an appendix is materially
  less likely to be read as one.

**Verdict: keep in the body, compress 553 → ~400.** Saves ~150. The adjacent
`sec:res-mcs-functional` (537) is a different matter — 05 §4.5 already displaced its hypothetical,
and it demotes to App D for ~477 retaining ~60.

#### (v) RQ2's unbiasedness null — 294 marker · **DEMOTABLE, ~175**

No criterion places it; R8 is document-scoped.

**Body retains the null itself:** the condition fails, 22 of 41 nodes reject a zero mean
residual, 19 of the 22 positive, so no minimum-variance optimality may be claimed on this
estate. **Moves to App D:** the 41-node test design, the two node-level intervals, and the
three-citation theoretical chain.

**This is the limb the document was missing entirely until a critique role grepped for it, and
it left no symptom of any kind.** Demotion is safe; deletion is not, and the retained sentence
is the negative result rather than a pointer to one. Flag on execution.

#### (vi) `sec:res-traded`'s sibling risk — the appendices become load-bearing

Roughly **3,700 words** move into Appendices B, C and D under this plan. Three of the four are
currently 50–120 lines. **They stop being supplementary and become where the working lives**,
which raises the standard they have to meet: cross-references must resolve *to the material
named*, and §4 shows seven that already do not.

---

## 4 · The appendix cross-reference check — 7 FAILURES, run before any demotion

**The brief requires this before anything moves. It was run over all 21 `\ref{app:*}` sites in
the body.** The method is the one `methodology.tex`:382 was caught by: read the citing sentence,
name what it promises, open the target, look for it.

**`latexcheck` is silent on every one of these, because every `\ref` resolves.**

| # | Site | The citing sentence promises | In the target? |
|---|---|---|---|
| 1 | `methodology.tex`:82 | "Library versions, the model revision hash and the compute device … Appendix~B **records them**" | **NO.** App B has no environment record of any kind |
| 2 | `methodology.tex`:33 | "parameter grids, computational environment and robustness variants … in Appendices B and C" | **NO** for grids and environment |
| 3 | `methodology.tex`:255 | "Appendix~C reports the **classification's sensitivity to the constant pair**" | **NO.** No classification material in App C |
| 4 | `methodology.tex`:384 | "Appendix~C reports it with a **block-length sweep**" (paired-loss variance) | **NO** |
| 5 | `methodology.tex`:573 | "Appendix~C records the **stratification and the seed**" | **NO.** Neither appears |
| 6 | `results.tex`:136 | "the **sweep and the pairing variance** behind it are in Appendix~C" | **NO** |
| 7 | `introduction.tex`:305 | "Appendix~D the full ladder and **confidence-set tables**" | **Partly.** Ladder yes; the confidence-set table `tab:mcs-config` is in Appendix **B** |

**Failure 1 is the most serious and was not previously known.** It is a **reproducibility**
claim — library versions, revision hash, compute device — pointing at an appendix that records
none of them. R69 is met by the pseudocode, but a reader following that sentence for the
environment finds nothing.

**These are not random rot. Six of seven point into Appendices B and C, whose file headers both
read *"Prose for this appendix is composed by 8C-7"*, and `results.tex`:143 carries the comment
*"Block-length sweep and pairing variance displaced to Appendix C per 05 §4.5"*.** They are
**approved displacements that were ruled and never executed**. The chapters were written against
the post-move state; the appendices were never composed.

**That reframes the composition task.** Appendix C is not a blank page — **the body has already
written its specification**, in six sentences, and discharging them is what makes the existing
document honest before a single new word is demoted into it.

### Orphan floats — referenced from nowhere in the body

`ds-writing` §9: *"Reference every figure and table in the text before it appears."*

| Float | Where | Status |
|---|---|---|
| `tab:bootstrap` | App D, "Denominator uncertainty" | **never `\ref`'d from anywhere** |
| `fig:injection` | App C | **never `\ref`'d from the body** |
| `fig:deployment` | App B | `\ref`'d only from **another float's caption** (`methodology.tex`:106) |

`alg:conformal`, `alg:adoption` and `alg:detection` are not `\ref`'d by label but are named by
their citing sentences, and each **delivers what its sentence promises** — the Mondrian variant,
three fail-closed exits, both detectors. Those three pass.

### Execution order this forces

1. Fix the five wrapped caption short titles (§2). Re-baseline. The number goes **up** to ~28,980.
2. Compose Appendix C against the six promises above, and Appendix B's environment record.
3. Repair failure 7 and the three orphan floats.
4. **Only then** begin demoting, chapter by chapter, re-measuring after each.

---

## 5 · The revised plan, chapter by chapter

Costs are `wordcount.py` marker words for prose (the only instrument with subsection
granularity, all figures re-measured 2026-08-09) and empirical `texcount` deltas for floats.
Governing ≈ marker + counted caption, verified within ±75 on every chapter.

### Chapter 4, Results — 8,492 governing → **~4,300**. The restructure the brief asks for.

**Findings and headline numbers in the body; reconciliation working and secondary tables in an
appendix.** Twenty-one subsections, each priced.

| §  | Subsection | Today | Body keeps | Class |
|---|---|---|---|---|
| 4.1.1 | Ladder at the gate | 237 | 100 | COMPRESS |
| 4.1.2 | Origin-count reversal | 208 | 170 | COMPRESS (D7) |
| 4.1.3 | Model confidence sets | 345 | 230 | COMPRESS (D7) |
| 4.1.4 | Ordering under squared loss | 537 | 70 | **DEMOTE** App D |
| 4.2.1 | Unbiasedness null | 294 | 150 | DEMOTE working, **null stays** |
| 4.2.2 | Demand-pattern classification | 204 | 90 | COMPRESS + demote `tab:intermittency` |
| 4.2.3 | Adoption margin | 413 | 170 | COMPRESS |
| 4.2.4 | Occurrence gating | 269 | 110 | COMPRESS, **null stays** |
| 4.3.1 | Cross-series ICL | 351 | 170 | COMPRESS (C2) |
| 4.3.2 | Weather | 490 | 220 | DEMOTE working + `tab:weather` (C2) |
| 4.4.1 | Empirical coverage | 423 | 230 | DEMOTE working |
| 4.4.2 | Traded decomposition | 373 | 250 | **PROTECT** the reversal |
| 4.4.3 | Exchangeability | 457 | 230 | DEMOTE correction narrative |
| 4.4.4 | Drift cause | 720 | 340 | DEMOTE windowing ¶ + identity working |
| 4.4.5 | Native intervals | 421 | 140 | DEMOTE (table already in App D) |
| 4.4.6 | Winkler | 496 | 230 | COMPRESS (D7 table stays) |
| 4.5.1 | Injection validity | 194 | 100 | COMPRESS |
| 4.5.2 | VUS-PR | 359 | 230 | COMPRESS |
| 4.5.3 | Alert suppression | 197 | 50 | **DEMOTE** App C |
| 4.5.4 | Cost-ratio sweep | 350 | 170 | COMPRESS |
| 4.5.5 | Knowledge-gap signal | 223 | 100 | COMPRESS |
| | openers and §-preambles | 140 | 140 | — |
| | **prose** | **7,701** | **3,690** | |
| | **floats** (12 of 14 retained) | 806 | **607** | `tab:intermittency` + `tab:weather` demoted |
| | **governing** | **8,492** | **~4,300** | **−4,192** |

**Why this is not "compress harder".** Fourteen of the twenty-one subsections keep 40–65 per
cent of their words; the large savings come from four demotions (4.1.4, 4.3.2, 4.4.4, 4.4.5)
where a derivation or a remedy evaluation leaves and a verdict stays. **No qualification is cut
and no null is removed** — 4.2.1, 4.2.4 and 4.3.2 keep their negative results stated in the body.

### Chapter 3, Methodology — 5,686 governing → **~3,530**

The first draft's floor was 3,300. **R83/R84 raise it.** Nine demotions each leave a
reason-sentence in Methods (~230 back), because *"Methods justify why each decision was made"*
and *"why the alternatives considered were rejected"* bind the reason — not the derivation, the
implementation narrative or the apparatus — to this chapter.

Demote to App B (~1,466): the `sec:ruler-functional` derivation 214; the $k > n$ edge case and
upper coverage bound 183; the Mondrian-as-observed-variable **working, reason retained** 163;
the adaptive alternative's implementation narrative, **rejection reason retained** 104; the
detection pairing's literature inheritance 208; the chat-corpus write path 141; the
intervention-layer apparatus 229 (C5 is unmeasured). To App C (~209): the control arm and second
injection pipeline — **which is cross-reference failure 5 and is owed there already.**

Compress ~900: accuracy measures and denominator basis 707 → 250; model comparison 481 → 150;
demand-pattern classification 477 → 150; deviation detection 455 → 150; candidate models 439 →
100; occurrence + knowledge-gap 612 → 100.

**Still the largest single reduction available anywhere in the document**, and Appendix B exists
for exactly this: `ds-writing` §8's replicability test is satisfied by the **document**.

### Chapter 5, Discussion — 4,919 governing → **~2,750**

| § | Today | Keeps | Basis |
|---|---|---|---|
| 5.1 Answers to the RQs | 1,060 | **500** | **R8 is document-scoped** — "answered by the end of the document". Ch 6 §6.2 carries the detail. *This is the largest change from the criterion re-reading.* |
| 5.2 Divergences | 1,156 | 450 | COMPRESS. Each divergence declared; the full argument for each need not be |
| 5.3 Validity | 1,181 | 400 | DEMOTE the pairing bounds and the confidence-set second sense to App D |
| 5.4 Limitations, biases, assumptions | 924 | **924** | **PROTECT, location-bound.** R106 "**The Discussion** states"; R107 "**The Discussion** explains"; HC59 |
| 5.5 Scope divergence | 600 | 450 | **Location-bound** — HC59 "explained **in the Discussion**". Compress only |

### Chapter 2, Literature Review — 5,011 → **~3,500**

Not demotable: a review is the argument justifying the work, and Appendix A is a search and
screening record. That is a judgement about what a review is, **not** a criterion — no criterion
names Chapter 2's location. Compress on `ds-writing` §7's funnel: long shots take a grouped
citation, close-ups keep their detail. Synthesis and research gap (708) and conformal prediction
(351) are the close-ups and stay. Below ~3,400 the funnel loses them.

### Chapter 1 — 2,027 → **~1,320**

§1.3 Aims and research questions (360) is **PROTECT, location-bound**: R7, *"explicitly stated
**in the Introduction**"*. §1.1 354 → 200; §1.2 problem and gap 472 → 250 and it must not exceed
Chapter 2's gap section; §1.4 contributions 605 → 350, the five strings keeping their strength
qualifiers; §1.5 structure 233 → 150.

### Chapter 6, Conclusions — 2,294 → **~1,600**

§6.2 Contributions (962) is **PROTECT and may need to grow**: it carries C2 and RQ2's nulls, and
under this plan it inherits the answer detail §5.1 sheds. That is the coupling to watch —
**§5.1 and §6.2 cannot both be compressed.** §6.1 objectives 420 → 150; §6.3 further work 690 →
350; §6.4 closing 162 → 100.

### Abstract — 321. **PROTECT, fixed.** HC5 approximately 300, HC4 one paragraph.

---

## 6 · The arithmetic — expected landing first, ceiling second

### 6a · Why the old ~20,750 was wrong

The first revision applied S-4's **70 per cent** realisation rate to the whole 11,429. That rate
was measured on a **de-duplication pass executed qualifier-first**, where the binding constraint
was what a sentence could safely lose. **It does not apply uniformly, and applying it uniformly
was the error.**

| Class | Why its rate is what it is | Rate |
|---|---|---|
| **DEMOTION** | Moving 550 words to an appendix moves 550 words. The only risk — that the body needs a retained sentence — is **priced in the item**, not discovered afterwards | **~100 %** |
| **COMPRESSION** | Where 70 % came from and where it belongs. A paragraph estimated to lose 200 may lose 130 once its qualifications are protected | **70 %** |
| **CAPTION / INSTRUMENT** | Arithmetic. A short title moved onto one line either is or is not | **~100 %** |

### 6b · The re-split

| Class | Ceiling | Rate | Expected |
|---|---|---|---|
| **DEMOTION** | **7,552** | 100 % | **7,552** |
| **COMPRESSION** | **4,427** | 70 % | **3,099** |
| **CAPTION / INSTRUMENT** | **340** | 100 % | **340** |
| **Total shed** | **12,319** | | **10,991** |

| | governing |
|---|---|
| Body today, true | 28,980 |
| **At ceiling** | **16,661** |
| **EXPECTED LANDING** | **17,989** |
| Margin below the 19,000 ceiling | **1,011** |
| Against the 18,000 target | **11 under** |

**Demotion now carries 61 per cent of the ceiling reduction**, which is the right shape under a
hard ceiling: the deterministic lever does the work and the stochastic one is not asked to
stretch.

### 6c · The sensitivity that actually matters

The plan breaches 19,000 only if **compression realises below 47 per cent**. Demotion and the
instrument fixes alone shed 7,892; landing at 19,000 needs 9,980; so compression must yield
2,088 of its 4,427 ceiling — **47.2 per cent, against a measured precedent of 70**.

| If compression realises at | Expected landing | Verdict |
|---|---|---|
| 70 % (the S-4 precedent) | **17,989** | target met |
| 60 % | 18,432 | compliant, 568 of margin |
| 50 % | 18,874 | compliant, 126 of margin |
| **47 %** | **19,006** | **break-even — breach** |

**This is the number to watch during execution, and it is a rate rather than a total.** A
chapter's realised compression rate is measurable the moment that chapter is re-measured, which
is what makes the stop rule below operable rather than aspirational.

### 6d · Execution method and stop rule — adopted as ruled

Chapter by chapter against a running target, **Chapter 4 first**. Re-measure with `texcount`
after each chapter and re-forecast the remainder before starting the next.

**Chapter 4's checkpoint: ceiling 4,300, expected 4,622** (its own split is 3,120 demotion
against 1,072 compression, so it realises better than the document average). Chapter 4 carries
4,192 of the ceiling reduction, and its realised compression rate is the best available estimator
for the remaining five chapters.

**STOP RULE. If after any chapter the forecast landing exceeds 19,000, stop and report rather
than continuing.** A shortfall ruled on at Chapter 4 has five chapters to absorb it; one found at
Chapter 6 has only criterion-bound material left.

### 6e · The additional demotion that buys the margin

The re-split alone lands at ~19,247 — **247 over the ceiling and with no margin at all**. Closing
it with compression is forbidden by the standing rules, so it is closed with demotion. Each item
below states the criterion the **retained body sentence** discharges, quoted.

**Reclassified — the material moves whole rather than being rewritten shorter, so the same
ceiling amount realises at 100 % instead of 70 %.**

| Item | Ceiling | Retained body sentence discharges — quoted |
|---|---|---|
| Ch 2's three long-shot background sections → App A | 624 | **No criterion requires long shots in the body.** What remains is bound by **R122** / **R123**: *"Each engagement with the literature begins / ends in the author's own voice, with commentary on that writer's contribution"* |
| Ch 5 §5.2's six divergence **arguments** → App D; the declarations stay | 706 | **R103**, *"The Discussion answers what the results reveal in relation to the research question(s)"*, and **D7**, *"there is an explicit discussion of why the approach taken is better than alternatives"* |
| Ch 4 §4.4.6 Winkler's method-by-method walk-through → App D | 266 | **R97**, *"Every table in Results has a textual summary of the finding it carries"* — `tab:winkler` stays and keeps its summary |
| Ch 4 §4.2.3 adoption-margin working → App D | 243 | **R102**, *"Results state what the findings imply for the research question(s)"* |
| Ch 4 §4.5.4 cost-sweep working → App C | 180 | **R102**, as above |
| **Subtotal** | **2,019** | *gains 606 of expected shed at no change of scope* |

**New demotion.**

| Item | Ceiling | Retained body sentence discharges — quoted |
|---|---|---|
| Ch 6 §6.3's eight extensions' detail → App D; body keeps eight one-liners **plus the two "were it repeated" sentences** | 490 | **R113**, *"The Conclusions state what would be done differently if the project were repeated"*, and **R116**, *"…how the methodology would be modified if the project were repeated"*. **Both currently live INSIDE §6.3** — *"the first change this work would make to its own method were it repeated"* and *"the second change…"* — so a wholesale demotion would carry two criteria out of the body with it. This is the one item where the retention is not optional |
| Ch 5 §5.3 validity working → App D, beyond the 767 already planned | +250 | **R104**, *"The Discussion argues whether the approach is valid, and why"* — the argument stays, the working moves |
| Ch 3 §3.7 conformal-construction derivation → App B, beyond the plan | +150 | **R83**, *"Methods justify why each decision was made"* — the reason stays; `alg:conformal` already carries the construction and its Mondrian variant |
| **Subtotal** | **550** | |

**No compression was increased to close the gap**, and no qualification is touched. The standing
rules on qualifications and on the withdrawn deferral both bind, and with 15,000 off the table
there is no reason to push compression past what it safely gives.

### 6f · Chapter 6 is the wrong place to look for savings, and it may need to grow

Found while pricing §6.3: **the Conclusions are governed by eight location-bound criteria,
R109–R116**, more than any other chapter. Three are discharged (**R113** and **R116** inside
§6.3, **R115** arguably by §6.4's transferable lesson). **R114 — *"The Conclusions state what had
to be learned in order to do the project"* — has no discharging passage anywhere in
`conclusion.tex`.**

That is an open coverage gap, and it points the opposite way from this plan: Chapter 6's floor is
held at 1,600 and R114 may require words rather than release them. **Absence has no syntax**, so
no instrument here would have found it — it surfaced only because a demotion candidate forced the
criteria to be enumerated one at a time.
## 7 · Carry-forwards

**Appendix C is an empty shell and `completenesscheck` cannot see it.** `appendix/robustness.tex`
carries **8 words of body prose**. It clears the 40-word floor because the floor tests
`count(raw)`, which includes caption and table text, and its two float captions total 177. **A
file consisting entirely of floats passes a prose floor built to catch a section nobody wrote** —
the tool's own defect class in the tool's blind spot. It is now the destination for Chapter 3's
209, Chapter 4's ~450 and six owed cross-references, and §4 requires it be composed **first**.

**Row 62 is not repairable, because the claim is no longer in the document.** Searched
`chapters/*.tex`, `appendix/*.tex` and `abstract.tex` for the phrasing and both endpoints: zero
occurrences of "paired to independent", "0.162" or "0.274". Composed out during 8C-3. **The
audit row is stale, not the document wrong** — annotated, not "repaired". The real defect it
surfaced is cross-reference failure 4.

**`venueordercheck` — 4 of 5 now sit in text this plan rewrites**, up from 1 under the first
draft, because Chapter 4's restructure reaches further.

| Finding | Section | Class now | Rewritten? |
|---|---|---|---|
| `results.tex`:782 UNANCHORED | 4.4.5 Native intervals | DEMOTE | **Yes** |
| `results.tex`:513 ORDER | 4.4.1 Empirical coverage | DEMOTE working | **Yes** |
| `results.tex`:406 ORDER | 4.3.2 Weather, in `tab:weather` | **DEMOTE the float** | **Yes** — the float leaves the body |
| `results.tex`:352 ORDER | 4.3.1, inside `tab:group` | float retained | No — needs its own repair |
| `discussion.tex`:29 ORDER | 5.1 Answers | COMPRESS to 500 | Likely, but not guaranteed |

One repair (`tab:group`) is certainly still owed; `discussion.tex`:29 should be checked after
§5.1 is rewritten rather than repaired twice. The remedy in both cases is to name the venues
inline, which costs ~20 words and is correct regardless.

**`acknowledgements.tex` left commented** — content is Phuong's.

---

## 8 · RE-PRICED at the measured retention rate — 2026-08-09, authorised by Phuong

**The model, derived from measurement rather than estimated.** Three fully-executed demotions
priced retentions of 70, 140 and 50 and delivered **145, 272 and 106 — 207 %, 194 %, 212 %**.
Three items inside 18 points is a bias, so:

> **actual retention $= 2.0 \times$ priced retention**, and therefore
> **realised save fraction $= 1 - 2\times(\text{priced retention} / \text{original})$.**

**One consequence falls straight out of the algebra and it is the important one.** Where priced
retention was already $\geq 50\,\%$ of a section, doubling it exceeds the section. **Those items
were never demotions.** They were compressions wearing a demotion's label, and they are
reclassified and re-costed at the compression rate. Five of Chapter 4's nine remaining demotions
fall into that category.

### 8a · Every remaining candidate, ranked by efficiency

| Eff. | Chapter | Item | Original | Expected save | Location-bound criteria |
|---|---|---|---|---|---|
| **100 %** | Ch 4 | Float demotions (`tab:intermittency`, `tab:weather`) | 199 | **199** | R97 — the textual summary stays in the body |
| **84 %** | **Ch 3** | **Nine derivations / apparatus → App B and C** | **1,675** | **1,215** | R83/R84 — the *reason* is retained, the derivation moves |
| 70 % | Ch 4 | 4.4.4 drift-cause remainder — *reclassified* | 645 | 214 | R102 |
| 70 % | Ch 4 | 4.4.3 exchangeability narrative — *reclassified* | 457 | 159 | R102 |
| 70 % | Ch 4 | 4.4.1 empirical-coverage working — *reclassified* | 423 | 135 | R102 |
| 70 % | Ch 4 | 4.2.1 unbiasedness working — *reclassified* | 294 | 101 | R102 |
| 70 % | Ch 4 | 4.4.2 traded meta-paragraph — *reclassified* | 373 | 86 | R102 |
| 70 % | — | All planned compressions (nine chapters' worth) | 4,449 | 3,114 | various |
| **66 %** | Ch 2 | Three long-shot sections → App A | 834 | **414** | **none** (R122/R123 bind the remainder) |
| 59 % | Ch 6 | 6.3 extension detail → App D | 690 | 290 | R113, R116 retained explicitly |
| 49 % | Ch 5 | 5.3 validity working → App D | 1,181 | 381 | R104 |
| 46 % | Ch 2 | Agent-interventions survey → App A | 569 | 169 | **none** (R122/R123) |
| 36 % | Ch 5 | 5.2 divergence arguments → App D | 1,156 | 256 | R103, D7 |
| 30 % | Ch 4 | 4.2.3 adoption-margin working | 413 | 73 | R102 |
| 19 % | Ch 4 | 4.3.2 weather working | 490 | 50 | R102 |
| 14 % | Ch 4 | 4.4.6 Winkler walk-through | 496 | 36 | R97, R102, D7 |
| **6 %** | Ch 4 | 4.5.4 cost-sweep working | 350 | **10** | R102 |
| | | **TOTAL EXPECTED SHED** | | **6,902** | |

### 8b · The ranking confirms the criterion-load hypothesis, and it indicts the execution order

**Efficiency tracks criterion load, exactly as predicted.** The two items with **no location-bound
criterion** (Chapter 2's surveyed literature) sit at 66 % and 46 %. Chapter 3's derivations sit at
84 %, because R83/R84 want *a reason*, which is one sentence. **Every remaining Chapter 4
candidate sits between 6 % and 30 %, and every one of them is under R102** — *"Results state what
the findings imply for the research question(s)"* — which does not accept a cross-reference. It
demands the finding, its number and its consequence, and that is a summary rather than a sentence.

**So Chapter 4 was the wrong chapter to execute first.** It was chosen because it carried the
largest priced reduction, 4,192, and the largest priced reduction was the most optimistic number
in the plan for precisely the reason that made it large: a chapter dense with measurement is a
chapter where the body must keep the measurement. **Chapter 3 is the efficient chapter — 1,215
words at 84 %, the single best item in the document — and it is 84 % efficient because Appendix B
already exists and R83/R84 ask for a reason rather than a result.**

### 8c · The arithmetic, and it does not reach

| | governing |
|---|---|
| Body now (four demotions executed) | 28,332 |
| R114, budgeted | +150 |
| Total expected shed, re-priced | −6,902 |
| **EXPECTED LANDING** | **21,580** |
| **Against the 19,000 ceiling** | **+2,580** |
| Against the 18,000 target | +3,580 |

**The re-priced plan does not reach 19,000, and no reordering of it does.** Executing every
remaining item in the table, in the most efficient order, at the measured rates, leaves the body
2,580 words above a ceiling that is not available. Reordering changes when the shortfall is
visible, not whether it exists.

**What is left is not an editorial question.** Every item in the table is already taken; the
protected set has been re-derived twice against quoted criteria; compression is at the rate its
own precedent supports and the standing rules forbid pushing it further; and the demotion lever
has been extended to every passage no criterion pins in place. The remaining 2,580 can only come
from material leaving the document, or from the constraint moving. **Both are Phuong's, and
neither is pre-empted here.**

---

## 9 · Two selection rules the plan had not applied — 2026-08-09

### 9a · R102 protects results that bear on a research question. Three bear on none.

**The prior enumeration was stale.** `06_research_questions.md` §7.2 ran this against the
*planned* §1.3 inventory and found one homeless result. **Five of Chapter 4's subsections were
composed after that**, and nobody re-ran it. Run fresh against the composed chapter, mapping every
subsection to the five RQ strings verbatim:

| Subsection | Words | Maps to |
|---|---|---|
| 4.1.1 Ladder at the gate · 4.1.2 Origin counts · 4.1.3 Confidence sets · 4.2.3 Adoption margin | 1,203 | **RQ1** — separation, and whether origin count changes selection |
| 4.1.4 Squared-loss ordering · 4.2.1 Unbiasedness · 4.2.2 Classification · 4.2.4 Occurrence gating | 912 | **RQ2** — estimand and coherent reconciliation |
| 4.3.1 Cross-series ICL · 4.3.2 Weather | 841 | **RQ3** |
| 4.4.1–4.4.5 coverage, traded, exchangeability, drift, native intervals | 2,170 | **RQ4** — coverage, and which property accounts for departure |
| 4.5.2 VUS-PR · 4.5.3 Suppression · 4.5.4 Cost sweep | 815 | **RQ5** |
| **4.4.6 Interval methods on the Winkler score** | **496** | **NONE.** RQ4 asks whether split conformal holds coverage and what accounts for departure. A comparison of five *alternative methods* answers **D7**, which names no location |
| **4.5.1 Injection-design validity** | **194** | **NONE.** It establishes the instrument, not a finding. A precondition for RQ5's answer rather than part of it |
| **4.5.5 Knowledge-gap signal** | **223** | **NONE** — already established by A17 and `06` §7.2: *"something the project built and demonstrated, not something the project established"* |

**913 words sit outside R102's protection**, and they were priced in §8 at 14 %, and not priced at
all for the other two. Re-priced with the measured retention multiplier applied to the new
estimates as well:

| Item | Original | Priced retention | ×2.0 | Expected save | Efficiency |
|---|---|---|---|---|---|
| 4.4.6 Winkler → App D | 496 | 60 | 120 | **376** | **76 %** |
| 4.5.1 Injection validity → App C | 194 | 35 | 70 | **124** | **64 %** |
| 4.5.5 Knowledge-gap → App D | 223 | 40 | 80 | **143** | **64 %** |
| | | | | **643** | |

**Winkler moves from the worst band to nearly the best** — 14 % to 76 % — on nothing but a correct
reading of which criterion protects it. **One ruling needed:** A17 directed the knowledge-gap
signal to *stay* in Results 4.5 as a specification-level deliverable. That disposition was taken
under no length pressure and this pass reopens it; it is Phuong's, not assumed here.

### 9b · The R102/R103 overlap is real, and it is demonstrated rather than argued

R102 wants **Results** to state what findings imply for the research questions. R103 wants **the
Discussion** to answer what the results reveal in relation to them. Read side by side, §5.1
already carries the Results numbers:

| §5.1 says | Restating |
|---|---|
| "retain five of those nine at the Beer Hall, four at Two River Taps and six at Ellel" | §4.1.3 |
| "six origins placed the served Beer Hall model second of nine and $273$ origins return it to first with the day-of-week baseline falling to fifth" | §4.1.2 |
| "$3.27$ paired standard errors behind the argument-minimum, or between $1.8$ and $2.3$ once that standard error carries the differential's own serial dependence" | §4.1.4 |
| "fails at $22$ of the Beer Hall hierarchy's $41$ nodes, on uncorrected one-sample $t$-tests over $56$ held-out residuals apiece" | §4.2.1 |

**So the same measurement is stated with its numbers at both sites, and both sites are
criterion-protected.** S-4 found this and could not act on it, because neither criterion yields to
the other.

**What breaks the deadlock is that the two criteria ask for different things.** R103 asks what the
results *reveal* — interpretation. R102 asks what the findings *imply* — and the implication for
a research question is exactly what §5.1 is mandated to argue. **The minimum R102 accepts is
therefore the finding and its number; the consequence clause is R103's job.**

Measured on the one retained section available: of §4.1.4's retained 145 words, **40 (28 %) are
consequence** — *"the pre-registered rule holds the incumbent … so no served model changes; Two
River Taps closed … so the restraint costs nothing there"* — and §5.1 states the same conclusion.

| | words |
|---|---|
| Chapter 4's remaining R102-bound retained prose (post-plan, excluding floats, the three executed retentions and the unmapped sections) | ~4,657 |
| Consequence share at the measured 28 % | 1,304 |
| At 70 % realisation | 913 |
| Less growth in §5.1 to absorb consequences it does not already carry | −150 |
| **Net** | **~763** |

**This is a real saving the plan has never costed**, and unlike everything else in §8 it takes
nothing out of the document: the consequence is stated once instead of twice.

### 9c · The arithmetic with both rules applied

| | governing |
|---|---|
| Body now | 28,332 |
| R114 | +150 |
| §8 re-priced plan | −6,902 |
| §9a unmapped results | −643 |
| §9b R102/R103 de-duplication | −763 |
| **EXPECTED LANDING** | **~20,174** |
| Range on the two new estimates | **19,700 – 20,550** |
| Against the 19,000 ceiling | **+1,174** |
| Against the 20,000 regulation | **+174, and the range straddles it** |

**Both new rules together find ~1,406 and the gap does not close.** The estimates in §9 are
**unmeasured** — no item in either has been executed — and are stated with the measured retention
multiplier already applied, because presenting an unmeasured estimate with the confidence of a
measured one is the error this pass has now made twice.

**The conclusion is that this is no longer an editorial question.** At ~20,174 the body breaches
the 20,000 regulation, not merely the working ceiling, and every remaining lever has been taken:
the protected set re-derived twice against quoted criteria, demotion extended to every passage no
criterion pins in place, compression at the rate its own precedent supports, the duplication
between two mandated sites removed, and the results that answer no question moved out. What is
left is material that survived five audit passes and that a criterion requires in the body.

---

## 10 · THE CUT LIST — authorised to prepare, not to execute. 2026-08-09

**Standing constraint.** Material leaving the document entirely is deletion of evidence. Phuong
rules item by item. Nothing below is executed. **A17 is ruled and stands** — `sec:res-chatlog`
(223) is protected as the evidence that a specified deliverable was built, revisited by §6.1 under
U6, and is priced **unavailable**. It is struck from §9a.

### 10a · The screen that decided most of it

Before pricing anything, every candidate was checked for **inbound cross-references from other
chapters**, because Phuong's rule is that a cut orphaning a citation or leaving a verdict
unsupported is not a cut. Measured with `grep -rn "ref{<label>}"` across `chapters/`, `appendix/`
and `main.tex`:

| Candidate | Inbound refs from outside Results |
|---|---|
| `sec:res-winkler` + `tab:winkler` | **5** — `methodology.tex`:460 (the served-model justification), `discussion.tex`:178, 298, 316, `appendix/robustness.tex`:141 |
| `sec:res-injection` | **2** — `conclusion.tex`:169, `appendix/robustness.tex`:37 |
| `sec:res-costsweep` | **2** — `conclusion.tex`:65, `discussion.tex`:130 |
| `sec:res-chatlog` | **2** — `conclusion.tex`:49, `methodology.tex`:602 |
| `sec:res-traded` / `tab:coverage-traded` | **3** — `discussion.tex`:101, `conclusion.tex`:154, `appendix/tables.tex`:200 |
| `sec:res-exchangeability` / `tab:exchangeability` | **3** — `discussion.tex`:95, `conclusion.tex`:85, 154 |

**Every whole-subsection candidate in Chapter 4 is cited from at least two other chapters.** By
Phuong's own rule none of them is a cut. They remain demotions, where the cross-reference still
resolves because the material is in an appendix rather than gone. **The cut list is therefore a
paragraph-level list, not a section-level one**, and that is a finding about the document rather
than a limitation of the search.

### 10b · A correction to §9a, found by this screen

**`sec:res-injection` is not outside R102 after all, and §9a was wrong to say so.** Contribution
**C4** (`06_research_questions.md` §3) states the contribution as *"An evaluation of deviation
detection under an asymmetric cost, on a measure committed to before the results were seen, **with
the injection design's contribution to the score measured rather than assumed**."* C4 maps to
**RQ5**. So the injection-validity result is not a precondition sitting outside the question — it
is a named limb of the contribution the question's answer claims, and `conclusion.tex`:169 cites
it for exactly that. It is R102-protected and re-prices from the 64 % band to the 30 % band.

| §9a as corrected | Original | Expected save |
|---|---|---|
| 4.4.6 Winkler → App D (unmapped, answers D7 which names no location) | 496 | **376** |
| 4.5.1 Injection validity → App C — **reclassified R102-bound** | 194 | **58** |
| 4.5.5 Knowledge-gap — **A17 stands, unavailable** | 223 | **0** |
| **§9a total** | | **434** (was 643) |

**The generalisable point:** the RQ table is not the only map of what a result bears on. The
**contribution** table names limbs the RQ strings do not, and a result named in a contribution
string bears on that contribution's question by construction.

### 10c · The cut list proper, ranked by words gained per unit of evidence lost

**Tier 1 — orphans nothing, loses no measurement. Recommended.**

**C-1 · §4.4.2's second-demonstration paragraph — 111 words. Rule (b), self-declared.**
The paragraph opens *"That the earlier reading was available is itself a result, and it is the
**second demonstration** in this section that calendar state and trading state are different
objects. **The first** is the partition-fidelity check of Section~\ref{sec:res-drift-cause}."*
*Survivor:* the partition-fidelity check in 4.4.4 — 94 of the Beer Hall's 546 calendar-closed days
traded, residuals 238.0 against 32.21. *Redundancy:* the same claim, second instance.
*Claim it supports:* that a marginal coverage figure is a claim about a mixture.
*Downstream:* nothing cites it; `discussion.tex`:99–101 makes the mixture point in its own words
against `tab:coverage-traded`, which stays.
*What the document loses:* the explicit statement that the correction is to report both figures
rather than replace one with the other. *What a reader could no longer check:* nothing — every
number is in the table.
**Ratio: 111 words for zero evidence. The best item on this list and the only one I would take
without a second thought.**

**C-2 · §4.4.3's two-deflections paragraph — 102 words. Rule (b), but it is a demotion.**
Two rival explanations for the rank non-uniformity are tested and neither holds: the Beer Hall
exceeds 0.100 at all seven horizon steps, and independence from the point forecaster follows from
the served model's 0.870. *Survivor:* `tab:exchangeability`'s rank columns, which exhibit the
violation directly. *Downstream:* nothing cites it.
*What the document loses on a full cut:* the record that the account was tested against
alternatives. **That is a robustness claim, and a reader would be unable to check that the
explanation was contested.** So it is not a cut — **it is a demotion to Appendix C at ~40
retained, saving ~62**, and the corrected 0.108 it also carries already appears in the paragraph
above it.
**Ratio: 62 words for zero evidence, once correctly classified as a demotion.**

**Tier 1 subtotal: 173 words.**

---

**Tier 2 — where the ratio goes bad, stated so the boundary is visible.**

**C-3 · §4.4.6's horizon-cap paragraph — 76 words. Rule (c) admits it. I recommend against.**
*"A second prediction is not supported. The rationale for capping the horizon at seven days
recorded per-step half-widths growing from 181 to 224... the recorded growth was an artefact of
roughly 26 observations per step."* It is a null, and no RQ asks about horizon length.
*Downstream:* nothing. `methodology.tex`:291 caps the lead at seven days on **availability**
grounds, not on this rationale, so no argument in the document rests on the refuted claim.
**Why it fails anyway.** Its entire content is *the project checked its own stated reason and the
reason did not hold*. Removing it removes an admission, not a measurement, and the standing rule
that compression must not delete negative results non-randomly exists for exactly this shape.
**76 words to make the document less honest is the worst ratio on the list, and it is the point at
which the list stops being cheap.** Rule (c) admits it on the letter and the standing rule
refuses it. **The standing rule wins.**

**C-4 · §4.5.4's three-bounds paragraph — 47 words. Refused under rule (d).**
It is qualification — the misses are synthetic, the two ratios have different denominators, the
8 fatigue items belong to neither. **No qualification, ever.** Recorded as refused so it is not
re-offered. Note that its first bound is *already duplicated* at `discussion.tex`:420, so the
overlap is 9b's business, not this list's.

**C-5 · §4.2.4 occurrence gating — 269 words. Not eligible.**
Tempting under rule (c): its own text says *"a null is the expected geometry rather than a
measurement about the venue"*. But `06` §7.2 maps **RQ2's Results column to "classification,
adoption margin, occurrence gate, failed unbiasedness precondition"** by name. RQ2 asked for it.
Ineligible, and the temptation is worth recording.

---

**Tier 3 — the one place where cutting costs no measurement at all.**

**C-6 · Chapter 2's long-shot sections and the agent-interventions survey — 1,403 words.
Currently planned as demotions worth 583. Cut outright: 1,403. Delta +820.**

*Why this is different in kind from everything above.* **It is other people's work, not this
project's evidence.** Cutting a surveyed study removes no measurement, orphans no verdict and
leaves no figure uncheckable. And no criterion names Chapter 2's location: **R122** and **R123**
bind only the *form* of each engagement — *"begins in the author's own voice"*, *"ends in the
author's own voice, with commentary on that writer's contribution"* — and say nothing about how
many engagements there are.

*Measured citation exclusivity* (keys cited in the range and nowhere else in `chapters/` or
`appendix/`):

| Section | Keys | Also cited elsewhere | **Would leave the document** |
|---|---|---|---|
| 2.1 Decision support and delegated autonomy | 4 | 1 | **3** |
| 2.8 Proactive agents and intervention policy | 15 | 11 | **4** |
| 2.9 Evaluation of agent interventions | 10 | 7 | **3** |

**Ten sources leave the bibliography; nothing is orphaned**, because every key still cited
elsewhere survives on that other citation.

*What the document loses.* The review's **long-shot band** — `ds-writing` §7's funnel narrows
from general context through medium shots to close-ups, and this removes the widest ring. A
reader arrives at the gap with less context for why it is a gap. §2.10 Synthesis and research gap
(708) and §2.5 Conformal prediction (351) are the close-ups and are untouched.
*Second cost, and it is real:* **Appendix A records the corpus search and screening.** A review
discussing ten fewer sources than the screening record admits needs Appendix A's narrative
reconciled, or the two stores disagree. That is a ~40-word repair, not a blocker, but it must be
budgeted with the cut rather than after it.

**Ratio: 820 words for zero measurements and ten citations. On evidence terms this is the
cheapest 820 in the document. On argument terms it is the most expensive thing here, because a
review is the argument that justifies the work.** That trade is a supervisory judgement about what
the dissertation claims, which is precisely why it is listed and not taken.

### 10d · Where the ratio gets bad, stated plainly

| | Words | Evidence lost |
|---|---|---|
| C-1 | 111 | none |
| C-2 (as demotion) | 62 | none |
| **— boundary of the free lunch —** | **173** | **none** |
| C-6 Chapter 2 | 820 | no measurements; 10 sources; the review's long-shot band |
| **— boundary of "costs argument, not evidence" —** | **993** | |
| C-3 | 76 | an admission the project made against itself |
| Whole-subsection Results cuts | ~1,100 | measurements, and 15 orphaned cross-references needing repair |

**The list stops being cheap at 173 words and stops being defensible at 993.**

---

## 11 · THE HONEST FLOOR

### 11a · With everything applied

| | governing |
|---|---|
| Body now | 28,332 |
| R114 | +150 |
| §8 re-priced plan | −6,902 |
| §9a **corrected** (Winkler 376 + injection 58; A17 struck) | −434 |
| §9b R102/R103 de-duplication | −763 |
| §10 Tier 1 cut list | −173 |
| **DEFENSIBLE FLOOR** | **~20,210** |

**Stated as a range, because every forecast in this project has been optimistic in the same
direction.** §9a and §9b are **unmeasured** — 1,197 words of expected saving with no executed
item behind either. The measured precedent is that unmeasured estimates here realise at about
70 %. §10's items are measured word counts of specific paragraphs and are deterministic.

| Scenario | Floor |
|---|---|
| §9 realises in full | 20,210 |
| §9 realises at 70 % | 20,569 |
| **Defensible floor** | **20,210 – 20,570** |

### 11b · What it looks like below that, and what each step costs

| Take also | Floor | What it costs |
|---|---|---|
| **+ C-6, Chapter 2's long shots cut** | **19,390 – 19,750** | The review's long-shot band; 10 sources; Appendix A reconciled |
| + C-3, the horizon-cap admission | 19,314 – 19,674 | An honest self-refutation |
| + whole-subsection Results cuts | ~19,100 – 19,470 | Measurements, and 15 cross-references repaired in three other chapters |

### 11c · The answer to the question asked

**The floor is above 19,000 in every scenario, including the one where evidence is deleted.**

- **Nothing survives at 18,000.** The target is unreachable by any combination of levers on this
  list.
- **19,000 is unreachable.** The most aggressive scenario — deleting Results evidence, cutting the
  review's long-shot band, and removing an admission the project made against itself — lands at
  **~19,100 at its most optimistic**, and its own range tops out at 19,470.
- **20,000 is reachable only by cutting Chapter 2's surveyed literature**, and only if §9 realises
  in full. If §9 realises at the historical 70 %, that scenario lands at **19,750** and clears the
  regulation with 250 words of margin against a forecast whose error band is ±360.

**So the conversation is about scope, not editing, and it needs to happen before more work goes
in.** The reduction plan can deliver ~8,100 words. It cannot deliver 9,300 without a supervisory
ruling on what the dissertation claims — and the single most consequential unknown is not any item
on this list. **It is question 4: whether the appendices are read.** If they are not, the ~4,900
words already relocated there have been moved out of the marker's view, and the whole strategy
needs rethinking rather than extending.

---

## 12 · THE CONSTRAINT RESTATED, AND THREE DOUBLE-COUNTS FOUND — 2026-08-09

### 12a · The constraint, corrected

**19,000 was never the supervisor's number.** It was Phuong's margin against forecast error, and
it has been treated in §1 and §8–§11 as though it were a hard line. **The supervisor's confirmed
position is: 20,000 hard cap excluding bibliography and appendices, serious penalty for breach,
18,000 acceptable though not welcome.** Every figure below is stated against **20,000 with a
declared margin**, which is the correct shape for a constraint with a forecast either side of it.

**C-3 is DECLINED, ruled.** Seventy-six words to make the document less honest is the worst trade
on the list. **And rule (c) admitting it was a defect in how the rule was written**, not a
judgement the rule should have produced: a null nobody asked for is still a null the project
recorded against itself. §10c's C-3 entry stands as the reasoning; the disposition is now closed.

### 12b · Chapter 3's 1,215 is NOT missing. It is inside the 6,902, and always was

Summed from §8a's rows: 199 + **1,215** + 214 + 159 + 135 + 101 + 86 + 3,114 + 414 + 290 + 381 +
169 + 256 + 73 + 50 + 36 + 10 = **6,902**. Chapter 3's nine derivations at 84 % are the second row
of the table and the single largest item in it.

**Adding it again would have produced a landing of ~19,031 and a false compliance verdict.** The
item is untaken — no derivation has moved yet — but *untaken* and *uncounted* are different
things, and the plan counts it.

### 12c · Two more double-counts, found by checking Tier 1 against §5's per-subsection table

**§10's Tier 1 is not additive to §8. Both its items sit inside §8 rows.**

| Tier 1 item | The §8 row it sits inside | §8 already claims | Tier 1 claims | **Incremental** |
|---|---|---|---|---|
| **C-1** §4.4.2's second-demonstration ¶ (111) | *"4.4.2 traded **meta-paragraph** — 373 → 86"* | **86** from that same paragraph | 111 by cutting it | **+25** |
| **C-2** §4.4.3's two-deflections ¶ (62 as a demotion) | *"4.4.3 exchangeability **narrative** — 457 → 159"*, and §5 reads *"DEMOTE correction narrative"* | **159**, and the correction narrative **is** the two-deflections ¶ | 62 | **0 — already counted, at a higher price** |

**So Tier 1 contributes +25, not +173.** C-2 does not merely fail to add: pricing the same
paragraph at 62 where §8 claims 159 is evidence that **§8's 159 is optimistic**, and it is
recorded here as a risk rather than folded into the forecast.

**And §9a's injection line is worse than what was already planned.** §5 prices 4.5.1 as
`COMPRESS 194 → keeps 100`, a saving of **94**, inside §8a's 4,449-word compression block.
§9a's reclassification prices it at **58**. The planned compression is the better instrument and
the §9a line is **withdrawn**; incremental **0**. The 30 %-band demotion was never an improvement
on a compression already budgeted.

**§9a's true incremental is Winkler alone, and net of the 36 already in §8a: 376 − 36 = +340.**
§9c added the full 643 to the full 6,902 and double-counted that 36.

**The pattern in all three.** Every one is a lever counted in two places under two names — *"the
traded meta-paragraph"* and *"§4.4.2's second demonstration"*, *"the exchangeability narrative"*
and *"the two-deflections paragraph"*, *"Winkler at 14 %"* and *"Winkler at 76 %"*. **A re-pricing
pass that names its items differently from the pass it re-prices cannot see its own overlaps.**

### 12d · The landing, restated against 20,000

| | governing |
|---|---|
| Body now | 28,332 |
| R114 | +150 |
| §8 re-priced plan — **includes Chapter 3's 1,215** | −6,902 |
| §9a Winkler re-price, **incremental** (376 − 36) | −340 |
| §9a injection — **withdrawn**, planned compression is better | 0 |
| §9b R102/R103 de-duplication | −763 |
| §10 Tier 1: C-1 **incremental**; C-2 already counted; C-3 declined | −25 |
| **EXPECTED LANDING** | **20,452** |

**The range.** Unmeasured components carry the risk; counted paragraphs do not.

| Component | Optimistic | Pessimistic | Basis |
|---|---|---|---|
| §9b de-duplication (763) | full | +229 | unmeasured, no executed item; 70 % is this project's measured rate for unmeasured estimates |
| §9a Winkler (340) | full | +102 | same |
| Demotion retention across §8 | at 204 % | +252 | the multiplier is calibrated on three points spanning **194–212 %**; the pessimistic end is 212 % |
| §8 compression block (3,114) | — | — | 70 % is already the **measured** S-4 rate; no further haircut, that would double-discount |
| C-1, floats | — | — | counted words, deterministic |
| **Landing** | **20,452** | **21,035** | |

**Margin below 20,000: −452 optimistic, −1,035 pessimistic. Breach at both ends.**

### 12e · Is C-6 still required? Yes, and it is not sufficient at the pessimistic end

C-6 is Chapter 2's three long-shot sections cut rather than demoted: **+820**, deterministic
(counted words of existing sections), costing no measurement and orphaning no citation.

| | Optimistic | Pessimistic |
|---|---|---|
| Without C-6 | 20,452 (**−452**) | 21,035 (**−1,035**) |
| **With C-6** | **19,632 (+368)** | **20,215 (−215)** |

**20,000 is not reachable without C-6.** With it, the plan complies at the optimistic end with
**368 words of margin** and breaches by **215** at the pessimistic end.

**So the decision about what the literature review argues stays on the critical path.** It cannot
be removed from it by arithmetic, and saying otherwise would be the third time this pass reported
a number more confident than its evidence.

**What closes the remaining 215 if the pessimistic end obtains** is the R102-minimum answer. If
the supervisor confirms the reading, §9b applies across **all five** research questions rather
than the four sites measured, and the de-duplication is larger than 763 by an amount nobody can
price until the reading is confirmed. **That is the whole reason execution is held.**

### 12f · The supervisor query narrows to two questions

Q1 (**the R102 minimum**) and Q4 (**are the appendices read and assessed?**) are load-bearing and
stay. Q2 and Q3 were framed for a 19,000 working ceiling and a document that could not comply;
with C-6 the document can comply at the expected landing, so they are **context, not asks**.
**Q4 is now the most consequential item in the project**: ~4,900 words have been relocated to
appendices across four sessions on an assumption that has never been checked, and if it is wrong
the strategy needs replacing rather than extending.

---

## 13 · LEVER 1 — WHOLE-SECTION RELOCATION, TESTED PER RESEARCH QUESTION. 2026-08-09

**The question, asked for the first time:** does R102 accept a *pointer* for a **secondary**
finding? R102 reads *"Results state what the findings imply for the research question(s)."*
**It quantifies over questions, not over findings.** A question with four supporting results needs
its implication stated — not stated four times. Every demotion so far has assumed the stronger
reading without testing it, which is why R102-bound material returns 6–30 %.

**What relocation means here:** the subsection leaves whole, **its float leaves with it** — R97
(*"Every table in Results has a textual summary of the finding it carries"*) makes that mandatory,
not optional — and the body retains **one sentence** naming the finding and pointing at the
appendix. Not a summary. The measured 2× retention bias is a bias on *summaries*; a single
sentence has a natural ceiling a summary does not.

### 13a · The test, question by question

**RQ1** — *can approaches be separated, and does origin count change the selection?* Two limbs,
so two implications.
| § | Words | Verdict |
|---|---|---|
| 4.1.3 Model confidence sets | 345 | **BODY** — carries limb 1: 5/4/6 of nine retained *is* the non-separation |
| 4.1.2 Origin-count reversal | 208 | **BODY** — carries limb 2 |
| 4.1.1 Ladder at the gate | 237 | **RELOCATE.** The ladder is the input measurement; the confidence set is the implication. **Confidence: high** |
| 4.2.3 Adoption margin | 413 | **RELOCATE.** Its own text: *"What the margin refuses is a win small relative to its own variability"* — the same implication 4.1.3 delivers, by a second route. **Confidence: medium.** It is also a pre-registered methodological device, and a reader might expect it stated rather than pointed at |

**RQ2** — *do intermittency and hierarchy admit the estimand and the reconciliation?* Two limbs.
4.2.2 classification holds the estimand limb, 4.2.1's null holds the reconciliation limb; both
stay. 4.1.4 is already executed and is **excluded** — the three done are not reopened.
**RELOCATE: 4.2.4 occurrence gating (269).** Its own text says the null is *"the expected geometry
rather than a measurement about the venue"*, and its implication for RQ2 duplicates 4.2.2's.
**Confidence: medium-high.**

**RQ3** — *does weather, or cross-series pooling, improve accuracy?* **THE LEVER IS DEAD HERE, and
this is the clearest result of the test.** The question **names both limbs**, and C2's amended cell
is explicit that they measure differently — weather a set-level null with one pairwise exception,
pooling *not* a null but a detected small loss — and that *"writing this limb as a clean matched
pair of nulls would be the mirror image of the over-claiming C2 exists to correct."* Neither is
secondary to the other. **RELOCATE: nothing. Confidence: high.**

**RQ4** — *does the interval hold coverage, and which property accounts for the departure?* The
largest block, 2,170 across five.
| § | Words | Verdict |
|---|---|---|
| 4.4.2 Traded decomposition | 373 | **BODY** — C3: the venue failing in the unsafe direction is Ellel at 0.692, *"which is invisible in the marginals"*. This carries limb 1 |
| 4.4.3 Exchangeability | 457 | **BODY** — the property itself. This *is* limb 2, and C3 calls it the strongest contribution |
| 4.4.1 Empirical coverage | 423 | **RELOCATE.** The marginals are the input, and they survive in the body anyway: `tab:coverage-traded`'s caption states its all-pairs column *"is an independent estimate of Table~\ref{tab:coverage} and reproduces it to 0.002"*. **Confidence: high** |
| 4.4.4 Drift cause | 645 | **RELOCATE.** Limb 2 asks which *property* accounts for the departure; the property is the exchangeability violation, and the drift cause is a level below it. **Confidence: medium, and this is the riskiest item on the list** — it is the mechanism behind the dissertation's strongest result, and three cross-references from Chapters 5 and 6 point at it. They resolve, but a reader following them leaves the body |

**RQ5** — *does detection perform well enough to justify surfacing?* 4.5.2 (VUS-PR) and 4.5.4 (the
cost sweep's degeneracy, which is the answer) both stay. 4.5.5 is **A17-protected**.
**RELOCATE: 4.5.1 injection validity (194).** C4 claims the injection design's contribution was
*"measured rather than assumed"*, and a one-sentence pointer to a measured appendix result still
supports that claim. **Confidence: medium.**

**Unmapped:** 4.4.6 Winkler (496) answers D7, which names no location. Relocation supersedes §9a's
demotion.

### 13b · The costing, incremental over what §8 and §9a already claim

| § | Words | §8/§9a claims | Relocate whole (w − 30) | **Incremental** |
|---|---|---|---|---|
| 4.1.1 Ladder | 237 | 96 | 207 | **+111** |
| 4.2.3 Adoption margin | 413 | 73 | 383 | **+310** |
| 4.2.4 Occurrence gating | 269 | 111 | 239 | **+128** |
| 4.4.1 Empirical coverage | 423 | 135 | 393 | **+258** |
| 4.4.4 Drift cause | 645 | 214 | 615 | **+401** |
| 4.5.1 Injection validity | 194 | 66 | 164 | **+98** |
| 4.4.6 Winkler | 496 | 376 | 466 | **+90** |
| **TOTAL** | **2,677** | **1,071** | **2,467** | **+1,396** |

**Pessimistic end: +1,186**, applying the measured 2× bias to the 30-word retentions (60 actual,
30 lost × 7).

**Unclaimed upside, deliberately.** R97 forces five floats to move with their subsections
(`tab:ladder`, `tab:coverage`, `fig:drift`, `tab:winkler`, `fig:validity-efficiency`). The Winkler
block alone measures 652 against 496 of prose, so its floats are ~156. **This is worth roughly
250–400 more and it is excluded from every figure below**, because it is the least-constrained
estimate in the costing and this project's own rule says such an item must not lead.

**One overlap netted out.** §9b's de-duplication was computed on ~4,657 words of R102-bound
*retained* prose. Relocation shrinks that base by ~1,396, so §9b re-prices from **763 to 489**.
Lever 1's net contribution is therefore **+1,122 optimistic**, not +1,396 — recorded here rather
than discovered later, which is the failure §12 documented three times.

## 14 · LEVER 2 — THE SPLIT-CHAPTER OPTION. Priced as an option, not recommended

Chapter 4 measures **7,883** today. Under a structural split — a short Results chapter reporting
findings, a full appendix carrying the measurement — a ~3,000-word chapter contains:

| | words |
|---|---|
| 21 subsections × ~95, each a finding, its number and its consequence | 1,995 |
| Chapter opener and five section preambles | 140 |
| Three to five headline floats retained in the body | ~300 |
| An explicit synthesis section, which R98 requires (*"key features of the results are brought out explicitly"*) and which the current chapter discharges implicitly | ~400 |
| **Total** | **~2,835** |

**Criterion check.** **R97** survives and is in fact easier: it governs tables *in* Results, so a
chapter with four tables needs four summaries rather than fourteen. **D7** names no location and is
already discharged by Winkler wherever it sits. **R102 is the exposure**, and it is the same
question Lever 1 asks — at 95 words per subsection the body states each finding, its number and
its implication, which is R102's minimum on the §9b reading. **If the supervisor rejects that
reading, the split fails for exactly the reason Lever 1 fails, and they are not independent bets.**

**Saving: ~4,883 from Chapter 4, about 1,000 beyond what the compliant plan below already takes
from it.** That estimate is soft.

**The risk, stated plainly.** It changes what the dissertation looks like. A Results chapter of
3,000 against a Methodology of 5,828 inverts the weighting `ds-writing` §4 warns about — the
weight should sit where the contribution sits, and the contribution is the measurement. A marker
who does not read appendices closely sees a thin Results chapter. **That is the same exposure as
Q4 in the supervisor query, concentrated into one structural decision instead of spread over
forty demotions.** It is Phuong's ruling and is not recommended here.

## 15 · THE COMPLIANT PLAN

| | Optimistic | Pessimistic |
|---|---|---|
| Body now + R114 | 28,482 | 28,482 |
| §8 re-priced plan (includes Ch 3's 1,215) | −6,902 | −6,902 |
| §9a Winkler — **superseded by Lever 1** | −340 | −238 |
| C-1 | −25 | −25 |
| **Lever 1, whole-section relocation** | **−1,396** | **−1,186** |
| §9b, re-based after relocation | −489 | −297 |
| Demotion-retention band (multiplier at 212 % not 204 %) | — | +252 |
| **Landing** | **19,330** | **20,086** |
| Margin below 20,000 | +670 | **−86** |

**Lever 1 alone does not reach it.** It closes 1,122 of a 1,035-word pessimistic gap and lands
86 over.

| **Add C-6** (Chapter 2's long shots cut, 820, deterministic) | **18,510** | **19,266** |
|---|---|---|
| **Margin below 20,000** | **+1,490** | **+734** |

**This is the compliant plan: the re-priced §8 plan, C-1, whole-section relocation of seven
subsections, the re-based §9b de-duplication, and C-6.** It clears 20,000 by **734 at the
pessimistic end**, against the 300 required.

**It requires C-6. It does not require the split chapter, and it does not require C-3.** The
~250–400 of float relocation R97 forces is unclaimed on top.

**The one thing that can still break it** is the R102-minimum reading. Lever 1 and §9b both rest
on it, and together they are 1,611 of the 1,819-word improvement. **If the supervisor rules that
R102 needs each finding stated in the body, both die together and the compliant plan dies with
them** — which is why execution stays held on Q1, and why the split chapter is not an independent
fallback.
