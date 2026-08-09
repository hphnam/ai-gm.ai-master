# The reduction plan — PROTECT, COMPRESS, DEMOTE

**Prepared 2026-08-09 under item 2 of the 8C-8 brief. NOT EXECUTED.** Phuong rules section by
section. Nothing has been compressed, demoted, cut or moved.

Supersedes `ledger/relocation_candidates.md`, which was costed against a 20,000 cap and a
relocation-only lever. Its protected set carries forward unchanged; its available column is now
one of three classes rather than the whole plan.

---

## 0 · The governing arithmetic, and a correction to the brief's

The brief states *"Body 27,779 against a 15,000 target: ~12,800 to shed."* That is the
`wordcount.py` marker figure. **The governing instrument is `texcount`** — Phuong's own criterion,
*"the number that governs must be the one a marker's count resembles"*, and the reconciliation at
`00_marking_criteria.md` §1.1a settles it: texcount counts captions (872 words here, which a
marker reads) and does not count `\ref` keys (which render as "4.4", not as prose).

| | marker | **texcount, governing** |
|---|---|---|
| Body today (abstract + Ch 1–6) | 27,779 | **28,750** |
| Working target | 15,000 | **15,000** |
| **Gap** | 12,779 | **13,750** |

**Any plan costed in marker words understates what it must find by about a thousand.** All costs
below are marker, because that is the only instrument with section granularity; add ~3.5 per cent
when converting a chapter total to the governing number.

**One lever the marker instrument cannot see.** Captions are inside the counted population.
Compressing a caption, or demoting a float to an appendix, reduces the governing number and shows
as **zero** in `wordcount.py`. Results carries **771 caption words** and Methods 101.

**What enforces this.** Not HC1 — HC1 is satisfied at 19,999. **HC2** (*"not unstructured or
overly verbose — such reports will be penalised rather than rewarded"*) and **HC3** (*"not padded
with irrelevant content"*), both quoting the issued documentation directly. Every COMPRESS item
below answers to HC2.

---

## 1 · Method, and the honesty constraint on it

**Assignment rule.** Every paragraph in all six chapters was priced with `wordcount.py`'s own
`count`/`artefact` primitives and classified:

- **PROTECT** — a rubric criterion names it, or its absence leaves a verdict in the body
  unsupported. The criterion is named per item. *Not costed for saving.*
- **COMPRESS** — supportive prose arguing something at greater length than the rubric requires.
  A supporting argument in three sentences instead of eight is not a lost finding.
- **DEMOTE** — full derivations, procedural detail, secondary tables, reconciliation working.
  Body keeps the finding plus a cross-reference; the detail goes to an appendix and leaves the
  counted population entirely.

**The estimate warning, and it is not boilerplate.** This project has costed a length pass once
before. **S-4 estimated 370–470 words from eight approved de-duplication items and delivered net
−105.** The lesson recorded then was that de-duplication was not the instrument. Compression is a
different operation with a better ratio, but the direction of the error is established: **estimates
here run optimistic.** Every COMPRESS figure below is a *ceiling*, not a forecast, and the plan is
scored twice — once at the ceiling and once at a 70 per cent realisation.

**Three standing rules bind the execution and are stated here so a later session cannot mislay
them.** Compression may not touch a qualification (it widens the claim rather than shortening the
sentence). Compression removes negative results first, so every section's nulls are enumerated and
grepped after any pass. And a cap constrains the total, not any particular sentence — no item is
deferred as "unaffordable" without a costed alternative.

---

## 2 · Chapter 4, Results — 7,701 marker / 8,492 texcount

The largest volume and the **least compressible**, because most paragraphs state a measurement and
its verdict in the same breath. Budget 5,200; the protected core alone is 4,745.

### PROTECT — 4,745 marker

| Item | Cost | Criterion |
|---|---|---|
| Four-limb reconciliation: `sec:res-coverage` 423, `sec:res-traded` 373, `sec:res-exchangeability` 457, `sec:res-drift` 720 | **1,973** | RQ4 / C3. `sec:res-traded` is Phuong's standing precedent, relocation already ruled against |
| Weather + cross-series pooling | **841** | C2. The pair the document **omitted entirely** until 8C-5; `PRJ93_RULES.md` directional-bias rule |
| Detection: VUS-PR 359, injection validity 194, cost sweep 350 | **903** | C4, whose fixed string requires the injection design's contribution *measured rather than assumed* |
| MCS 345 + origin-count reversal 208 | **553** | **D7**, `05` §5.1: *"the single named Distinction blocker"* |
| Unbiasedness of base forecasts | **294** | RQ2's negative limb. Found *missing* once already |
| Occurrence gating degeneracy | **181** | Negative result |

### COMPRESS — ceiling 720

| Item | Cost | Ceiling | Reason | Body retains |
|---|---|---|---|---|
| Winkler comparison (`sec:res-winkler`) 496 | 496 | **200** | Four paragraphs to say no method both enters the set and beats the incumbent. The qualification and the numerics-sensitivity note are separable | The verdict, the qualification, table cross-ref |
| Ladder results at the gate 237 | 237 | **80** | ¶2's two bounding properties restate Methods | The nine-entrant result |
| Adoption margin 413 | 413 | **150** | ¶1 argues the bare-inequality problem at length; the *rule* is the finding | Criterion, its value, the refusal |
| Demand-pattern classification 204 | 204 | **70** | A table read-out in prose | The classification and its consequence |
| Knowledge-gap signal 223 | 223 | **70** | Secondary signal, twice-stated footing | That it enters on the same footing |
| Empirical coverage ¶2 (binomial retention) 157 | 157 | **50** | The caveat is restated in 5.3 | The interval and the caveat once |
| **Captions** | 771 | **250** | 14 floats averaging 55 caption words; the 15/45 short-title rule is met, the bodies are long | Caption bodies at ~35 words |

### DEMOTE — 926

| Item | Cost | Destination | Body retains |
|---|---|---|---|
| `sec:res-mcs-squared`, secondary-loss ordering, entire | **537** | App. D | "Ordering unchanged under squared loss at two venues, ties at the third" + cross-ref |
| Native-interval per-venue detail (Ellel's zeros artefact) | **192** | App. D | Ordering-transfers/magnitude-does-not + the Chronos-Bolt decile |
| Adoption-margin correction narrative | **137** | App. C | Corrected figures, that they were controlled |
| `sec:res-refit` alert suppression | **197** | App. C | That suppression never costs the original detection |

**Chapter 4 reachable floor: ~7,701 − 720 − 926 = 6,055 marker**, plus caption saving 250, so
**~7,300 texcount** against 8,492 today. It cannot go below **~6,900 texcount** without cutting
protected measurement.

---

## 3 · Chapter 3, Methodology — 5,569 marker / 5,686 texcount

**The best DEMOTE chapter in the document**, because Appendix B ("Method specifications and
pseudocode") already exists for exactly this, and `ds-writing` §8's test — *"sufficient detail for
a reader to replicate the work"* — is satisfied by the **document**, not by the chapter.

### PROTECT — ~1,150 marker

| Item | Cost | Criterion |
|---|---|---|
| Availability-lead basis and the five arms | **380** | Makes RQ3's null interpretable. A null on a wrongly specified basis is a different claim |
| Study design, estate, unit of analysis | **428** | R69/D3 replicability; also the three-venue scope RQ-wide |
| The pre-registered one-standard-error margin (clause only) | **~80** | `05` §4.5 ruling: the *fact* survives, it licenses the adoption rule |
| Conformal construction, the band definition itself | **~260** | RQ4 depends on it |

### COMPRESS — ceiling 900

| Item | Cost | Ceiling | Reason |
|---|---|---|---|
| Accuracy measures / denominator basis 707 | 707 | **250** | `sec:ruler-ellel` 254 + `sec:ruler-functional` 214 argue a general property of scoring rules. The *ruling* is 3 sentences |
| Model comparison procedure 481 | 481 | **150** | ¶1/¶2 argue origin advancement; the conservatism note is one clause |
| Demand-pattern classification 477 | 477 | **150** | The estimator-adoption walk-through at 245 is procedure |
| Deviation detection 455 | 455 | **150** | The literature-inheritance argument at 208 belongs in 5.2 or an appendix |
| Candidate models / adoption gate 439 | 439 | **100** | ¶3 and ¶4 specify entrants scored at no venue |
| Occurrence modelling 342, knowledge-gap 270 | 612 | **100** | Both secondary to every RQ |

### DEMOTE — 1,466

| Item | Cost | Destination |
|---|---|---|
| `sec:ruler-functional` derivation | **214** | App. B |
| $k > n$ edge case; upper coverage bound | **183** | App. B |
| Mondrian-as-observed-variable justification | **163** | App. B |
| Adaptive alternative, implementation narrative | **104** | App. B |
| Detection pairing's literature inheritance | **208** | App. B |
| Control arm + second injection pipeline | **209** | App. C — **and Appendix C currently promises this and does not deliver it, see §7** |
| Chat-corpus write path | **141** | App. B |
| Intervention-layer apparatus (C5 is unmeasured) | **229** | App. B |
| Estimator-adoption walk-through | **~15** | folded into the compress line above |

**Chapter 3 reachable floor: ~5,569 − 900 − 1,466 = 3,203 marker ≈ 3,300 texcount** against 5,686
today. This is the single largest reduction available anywhere in the document.

---

## 4 · Chapter 2, Literature Review — 4,938 marker / 5,011 texcount

Genuinely compressible and **not** demotable: a review is the argument justifying the work, and an
appendix cannot carry it. Appendix A is a *search and screening record*, not a home for synthesis.
The lever is `ds-writing` §7's funnel — long shots take a grouped citation, close-ups keep their
detail.

| Section | Cost | Class | Ceiling | Reason / criterion |
|---|---|---|---|---|
| Synthesis and research gap | 708 | **PROTECT** | — | R7/R50–R56. It *is* the gap Chapter 1 §1.2 must not exceed |
| Conformal prediction intervals | 351 | PROTECT | — | Close-up for RQ4 |
| Error measures and model comparison | 685 | COMPRESS | **250** | Two 200-word paragraphs summarising three papers each. Medium shot |
| Cross-series pooling and exogenous covariates | 836 | COMPRESS | **300** | Six paragraphs; the foundation-model landscape is a long shot at 72+162 |
| Evaluation of agent interventions | 569 | COMPRESS | **200** | Four paragraphs, one conclusion |
| Deviation detection from calibrated intervals | 499 | COMPRESS | **150** | ¶3 at 228 is a single-paper close-up on CPTC |
| Proactive agents and intervention policy | 456 | COMPRESS | **150** | Two preprints argued at 170 and 64 |
| Intermittent demand | 323 | COMPRESS | **80** | Medium shot |
| Decision support and delegated autonomy | 283 | COMPRESS | **80** | Long shot; opens the funnel |
| Demand forecasting on short series | 228 | COMPRESS | **50** | Long shot |

**Chapter 2 reachable floor: ~4,938 − 1,260 = 3,678 marker ≈ 3,730 texcount.** Below ~3,400 the
funnel loses its close-ups and R7 is at risk.

---

## 5 · Chapters 5, 1 and 6

### Chapter 5, Discussion — 4,920 marker

| Item | Cost | Class | Ceiling | Criterion / reason |
|---|---|---|---|---|
| 5.1 Answers to the research questions | 1,060 | **PROTECT** | — | **R8** — 1.3's questions must be 5.1's answered questions |
| 5.4 Limitations, biases, assumptions | 924 | **PROTECT** | — | **HC59** mandatory; R106/R107; `05` §4.5 rules it the one section that *grows* |
| 5.3 ¶2 pairing bounds the non-separations | 394 | **DEMOTE** | 394 | Restates Ch 4's paired standard errors. **Highest single yield in the document** |
| 5.3 ¶3 confidence sets, second sense | 373 | **DEMOTE** | 373 | Same duplication S-3 named; pairs with Ch 4's numerics-sensitivity line |
| 5.2 six divergences | 1,156 | COMPRESS | **450** | Each divergence must be *declared*; the full argument for each need not be. D7-adjacent, so the declaration is protected and the argument is not |
| 5.5 specification divergence | 600 | COMPRESS | **200** | ¶6 vendor constraint at 165 is a transferable lesson, not a divergence of this work |
| 5.3 ¶4 "a second sighting" | 93 | DEMOTE | 93 | Says in its own first clause that it is a second sighting |
| 5.3 ¶5 neither measurement reaches the nulls | 86 | **PROTECT** | — | A stated limit on a negative result |

**Floor: ~4,920 − 860 (demote) − 650 (compress) = 3,410 marker.**

### Chapter 1, Introduction — 2,023 marker

1.3 (360) and 1.4 (605) are **PROTECT** — the RQ strings are fixed verbatim by `06` §5 and R8, and
1.4's excess is the five contribution strings *with their strength qualifiers*, which the
compression rule forbids touching. 1.2 at 472 against a 300 budget is the only real COMPRESS
(**ceiling 150**), and it must not exceed Chapter 2's gap. **Floor ~1,870.**

### Chapter 6, Conclusions — 2,328 marker

6.2 at 962 is **PROTECT** — it carries C2 and RQ2's nulls, both of which the document omitted
entirely until 8C-5 found them by enumeration, plus ~180 words of critique-added qualifiers.
6.3 Further work at 690 is eight extensions already compressed 926 → 690; **ceiling 150**.
6.1 objectives 429, **ceiling 80**. **Floor ~2,100.**

### Abstract — 300 marker / 321 texcount

**PROTECT, fixed.** HC5 requires approximately 300 words; HC4 one paragraph. No change.

---

## 6 · The arithmetic, honestly

| Chapter | Today (texcount) | Ceiling floor | At 70 % realisation |
|---|---|---|---|
| Ch 1 Introduction | 2,027 | 1,870 | 1,920 |
| Ch 2 Literature Review | 5,011 | 3,730 | 4,130 |
| Ch 3 Methodology | 5,686 | 3,300 | 4,010 |
| Ch 4 Results | 8,492 | 7,300 | 7,650 |
| Ch 5 Discussion | 4,919 | 3,410 | 3,860 |
| Ch 6 Conclusions | 2,294 | 2,100 | 2,160 |
| Abstract | 321 | 321 | 321 |
| **Total** | **28,750** | **22,031** | **24,051** |

**The plan does not reach 15,000. It does not reach 18,000 either.**

- At every ceiling met in full: **22,031**. Over the 15,000 target by **7,031**; over the 18,000
  acceptability bound by **4,031**.
- At the 70 per cent realisation the S-4 precedent argues for: **24,051**.

**PROTECT plus the irreducible core is roughly 22,000, and that is the number.** It is stated
rather than engineered downward, per the brief's own instruction not to pad a list to a target.

### What reaching 15,000 would actually cost

Only three populations are large enough to close a 7,000-word gap, and each is currently protected
for a stated reason:

1. **The four-limb reconciliation (1,973) plus the rest of Chapter 4's protected core (2,772).**
   Demoting the whole of Chapter 4's measurement to an appendix and leaving verdicts with
   cross-references would yield ~3,500. **It would leave every headline verdict in the body
   unsupported at the point it is made** — the definition of PROTECT in the brief.
2. **Chapter 2 below its funnel (~1,300 more).** Costs R7 and the gap argument that Chapter 1 §1.2
   and Chapter 6 both depend on.
3. **Chapter 6's 6.2 (962) and Chapter 5's 5.1 (1,060).** Breaks R8 and re-opens the exact
   omission — C2 and RQ2's nulls — that `PRJ93_RULES.md`'s directional-compression rule exists to
   prevent, and that cost a dedicated session to find last time.

**Recommendation, for Phuong to rule on.** Execute the plan to its ceiling and accept a body near
**22,000**, which is 10 per cent over the cap rather than 44 per cent, and pair it with the
strongest available HC2 answer: a body of 22,000 whose appendices carry the derivations, the
secondary analyses and the reconciliation working is *structurally* succinct even where it is
numerically over. If the cap must be met absolutely, the 2,031 beyond 20,000 comes from item 1
above and nowhere cheaper, and that is a decision to leave verdicts cross-referenced rather than
supported in place.

---

## 7 · Two findings the plan depends on, found while pricing it

**Appendix C is an empty shell, and `completenesscheck` cannot see it.** `appendix/robustness.tex`
carries **8 words of body prose**. It passes the 40-word content floor because the floor tests
`count(raw)`, which includes caption and table text, and the file's two figure/table captions total
177. Its own header says *"Prose for this appendix is composed by 8C-7"* — a TODO that no
instrument reads. **This is the defect class the tool was built for**, in the tool's own blind
spot: a file consisting entirely of floats passes a prose floor designed to catch a section nobody
wrote. Reported, not fixed — fixing it mid-plan would move the pre-flight baseline.

**`methodology.tex`:382–384 promises content Appendix C does not contain.** It states the paired
loss differential's variance *"is measured rather than assumed, and Appendix~\ref{app:robustness}
reports it with a block-length sweep."* Appendix C contains no paired-variance material and no
block-length sweep. The `\ref` resolves, so `latexcheck` is silent. **This is good news for the
plan:** Appendix C is the prepared destination for Chapter 3's 1,466 words of DEMOTE, and it
already has a promise waiting to be discharged.

---

## 8 · Carry-forwards

**Row 62 is not repairable, because the claim is no longer in the document.** Searched
`chapters/*.tex`, `appendix/*.tex` and `abstract.tex` for the phrasing and for both endpoints:
zero occurrences of "paired to independent", "0.162" or "0.274". `methodology.tex`:382 now reads
*"that quantity is measured rather than assumed, and Appendix~\ref{app:robustness} reports it with
a block-length sweep"* — no numeric range at all. **The audit row is stale, not the document
wrong**; it was composed out during 8C-3. Row 62 is annotated accordingly rather than "repaired",
and the real defect it surfaced is the dangling promise above.

**`venueordercheck` — 1 of the 5 sits in text the reduction pass rewrites anyway.**

| Finding | Section | Plan class | Rewritten by the pass? |
|---|---|---|---|
| `results.tex`:782 UNANCHORED | 4.4.5 Native model intervals | **DEMOTE** | **Yes** — the per-venue detail carrying the triple is the demoted material |
| `results.tex`:513 ORDER | 4.4.1 Empirical coverage | COMPRESS ¶2 | Partly — the binomial paragraph is a compress target |
| `results.tex`:352 ORDER | 4.3 Cross-series ICL | PROTECT, and it is **inside a table float** | No |
| `results.tex`:406 ORDER | 4.3 Weather | PROTECT, **inside a table float** | No |
| `discussion.tex`:29 ORDER | 5.1 Answers | **PROTECT under R8** | No |

**So three need their own repair regardless, and two of those are in table floats** — where the
remedy (name the venues inline) edits caption and table text, which is *inside* the governing
count. Naming venues inline costs words. It is the correct fix anyway and the cost is ~20 words.

**`acknowledgements.tex` left commented**, content is Phuong's.
