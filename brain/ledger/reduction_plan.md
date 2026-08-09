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
