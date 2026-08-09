# Appendix relocation — the candidate list

**Prepared 2026-08-09 under item 6 of the 8C-7 brief. NOT EXECUTED.** Phuong rules item by item,
as with S-4. Nothing below has been moved, cut or edited.

Ruling this list serves, quoted from the brief: *"27,729 against 20,000 is +39%, and a
justification does not cover that. Nor is the answer cutting, and S-4 established the duplication
is worth ~500. The answer is APPENDIX RELOCATION — appendices and references do not count toward
the 20,000, confirmed by my supervisor, and that lever has never been pulled at scale."*

---

## 0 · READ THIS FIRST — the lever is currently disconnected, and one line of the document is why

**`declaration.tex` states the opposite of the supervisor's ruling, in the document, above a
printed number that refutes it.** Verbatim:

> "This thesis does not exceed the maximum permitted word length of **20,000 words including
> appendices and footnotes**, but excluding the bibliography. A rough estimate of the word count
> is: `\quickwordcount{main}`"

`\quickwordcount` runs `texcount -0 -sum -merge main.tex` through `\write18` and `\input`s the
result. **It currently resolves to 32,240**, and it counts the appendices, exactly as the sentence
beside it says it does.

Two consequences, and the first is the one that decides the ruling:

1. **Under the declaration as written, relocation moves nothing.** Moving a paragraph from
   `chapters/` to `appendix/` leaves `texcount main.tex` unchanged to the word. The lever has an
   effect only if the counted population excludes appendices — which is the supervisor's ruling
   and is **not** what the document declares.
2. **As it stands the declaration is self-refuting on its own line**: it declares compliance with
   20,000 and prints 32,240 next to the claim. This is a signed statement of academic compliance,
   so it is reported here and **deliberately not edited** — amending the terms of a declaration is
   not an agent's call, and it is the one change on this page that must be made knowingly.

**Recommended precondition before any item below is executed:** confirm the supervisor's ruling in
writing and amend `declaration.tex` to state the population it actually counts, or reconfigure
`\quickwordcount` to count `chapters/` and `abstract.tex` only. Until one of those happens, every
figure below is an accounting exercise with no effect on what a marker reads.

### The two instruments disagree, and the declaration prints the one that governs

| Population | `wordcount.py` marker | `texcount` (what the declaration prints) |
|---|---|---|
| Six chapters | 27,479 | 28,429 |
| Abstract | 300 | 321 |
| Chapters + abstract | **27,779** | **28,750** |
| Appendices A–E | not measured | **3,355** |
| Whole document less bibliography | — | **32,240** |

The ~970 gap is captions, which `wordcount.py` charges to a separate all-chapter caption line
(901 words) and `texcount` charges to the body. **`texcount` is the binding number** because it is
the one printed on the declaration page. Every target below is therefore stated in both.

**Target, under the supervisor's ruling:** chapters + abstract at or under 20,000.
**Gap to close: −8,750 texcount (−7,779 marker).**

---

## 1 · Measured position, per chapter

| | Marker | Budget | Δ | texcount |
|---|---|---|---|---|
| Ch 1 Introduction | 2,023 | 1,400 | +44% | 2,027 |
| Ch 2 Literature Review | 4,938 | 4,000 | +23% | 5,011 |
| Ch 3 Methodology | 5,569 | 4,200 | +33% | 5,686 |
| Ch 4 Results | 7,701 | 5,200 | +48% | 8,492 |
| Ch 5 Discussion | 4,920 | 2,400 | +105% | 4,919 |
| Ch 6 Conclusions | 2,328 | 1,100 | +112% | 2,294 |
| Abstract | 300 | 300 | — | 321 |
| **Total** | **27,779** | | | **28,750** |

Ch 5 moved 4,870 → 4,920 this session: the `discussion.tex` "to a thousandth" repair replaced an
assertion with the independent drift evidence. **Measurement replacing assertion costing words, for
the sixth recorded time.**

**What §4.5 already spent.** `05_paper_architecture.md` §4.5's "Displaced:" entries are **not** a
menu of remaining options — they record displacements *already executed during composition*. Every
chapter below is at a floor that has absorbed them. What remains was retained deliberately, so
every candidate here is a second-order cut against a considered decision, not a first pass.

---

## 2 · Chapter 3, Methodology — 5,569 marker

Appendix B ("Method specifications and pseudocode") is the established home, so this chapter has
the cleanest relocation path in the document. The governing constraint is `ds-writing` §8: *"The
methods section must contain sufficient detail for a reader to replicate the work and obtain
similar results. That is the whole test."* Replicability must survive **in the document**, which an
appendix satisfies; it need not survive **in the chapter**.

| # | What it is | Why the body does not need it inline | What the body retains | Cost | Status |
|---|---|---|---|---|---|
| M1 | `sec:ruler-functional` — the derivation separating which functional a measure elicits from which scale it carries | A general property of scoring rules, not a fact about this estate. It licenses the ruler choice; it does not establish it | The ruling plus one clause naming the elicited functional, cross-ref | **214** | AVAILABLE |
| M2 | The $k > n$ edge case: where $n < (1-\alpha)/\alpha$ the conformal index exceeds the pool | A closed-form condition, fully reproducible from the definition. Pure derivation | "The index can exceed the pool at small $n$; the condition and its handling are at App. B" | **102** | AVAILABLE |
| M3 | The upper coverage bound from `angelopoulos_conformal_2023` | Cited result restated. Belongs beside the construction it bounds | One sentence: coverage is bounded above as well as below, with the citation | **81** | AVAILABLE |
| M4 | Why the Mondrian partition is an observed calendar variable rather than an inferred regime | A defence against an objection, not a specification. Nothing downstream reads it | One clause fixing the partition as observed, cross-ref | **163** | AVAILABLE |
| M5 | The adaptive alternative: both methods implemented rather than argued | Implementation narrative. The *result* is in Ch 4 (`sec:res-winkler`) and in 5.2 | "Both were implemented and compared, App. B" | **104** | AVAILABLE |
| M6 | What the detection pairing does and does not inherit from its literature | An inheritance argument about cited work. Ch 5.2 makes the divergence case that matters | The inherited guarantee named in one clause | **208** | AVAILABLE |
| M7 | The unmodified control arm and the second injection pipeline | Protocol detail. The corpus size (644) and the design's measured contribution are the load-bearing facts and both are in Ch 4 | Corpus size, control-arm existence, cross-ref | **209** | AVAILABLE |
| M8 | The chat corpus's write path and how it differs from every other input | Provenance detail for a signal that is secondary throughout | One clause on provenance, cross-ref | **141** | AVAILABLE |
| M9 | Intervention-layer apparatus: the two protocol features and the two limits | **C5 is the contribution that "has not been run".** The body needs that it exists, is frozen, and is unmeasured. The apparatus specification supports a claim nobody is making yet | The three facts above, in two sentences, cross-ref | **229** | AVAILABLE |
| M10 | Estimator adoption: which estimator each node selects and how | Selection procedure. The *rule* is load-bearing; the walk-through is not | The rule plus the pre-registered margin clause | **245** | PARTIAL — the pre-registration clause is protected (`05` §4.5) |
| M11 | Availability-lead: membership governed by knowability at the origin, and the five arms | This is what makes the weather study interpretable and RQ3's null meaningful | — | **380** | **PROTECTED** — a null on a wrongly-specified basis is a different claim |
| | | | | **≈1,696 available** | |

---

## 3 · Chapter 4, Results — 7,701 marker, 8,492 texcount

The largest absolute overrun and the **hardest** chapter to relocate from, because most of it is
reconciled measurement supporting a verdict stated in the same paragraph. The brief's own guard
applies here more than anywhere: *"Protected means reconciled measurement whose absence would leave
a verdict unsupported in the body."*

| # | What it is | Why the body does not need it inline | What the body retains | Cost | Status |
|---|---|---|---|---|---|
| R1 | `sec:res-mcs-squared` — the entire secondary-loss ordering analysis | A robustness check on the headline selection, not the selection. Its finding is one sentence | "The ordering is unchanged under squared loss at two venues and ties at the third; App. D" | **537** | AVAILABLE |
| R2 | Ellel's pooled coverage as an artefact of its zeros, in `sec:res-native-interval` | §4.5 already ruled the per-venue detail of this section displaceable and it is still here | The ordering-transfers/magnitude-does-not result plus the Chronos-Bolt decile finding | **192** | AVAILABLE |
| R3 | The two corrections behind the adoption-margin figures, measured against a pre-correction control | Implementation-correction narrative — the same class §4.5 displaced for `sec:res-winkler` | The corrected figures and that they were controlled, cross-ref | **137** | AVAILABLE |
| R4 | The set column's numerics-regime sensitivity | **Stated in Ch 4 and again in Ch 5.3.** S-3 named this exact duplication | One statement, in whichever chapter Phuong rules owns it | **135** | AVAILABLE (pairs with D2) |
| R5 | The unsupported second prediction on capping the horizon | A negative on a secondary prediction, argued at length | The null in one sentence | **76** | PARTIAL — negative result; the *claim* is protected, the argument is not |
| R6 | `sec:res-refit` — alert suppression after refit | Deployment-gap material, secondary to every research question | The finding that suppression never costs the original detection | **197** | AVAILABLE |
| R7 | The windowed-pool counterfactual summary | §4.5 displaced this "in full (Appendix D)" and a 177-word summary remains | The one clean result and its cross-ref | **~100** | AVAILABLE |
| R8 | `sec:res-traded` — coverage on the days a venue traded | — | — | 373 | **PROTECTED — PRECEDENT.** Relocation already ruled against |
| R9 | The four-limb reconciliation (`sec:res-coverage`, `sec:res-traded`, `sec:res-exchangeability`, `sec:res-drift`) | — | — | ~1,973 | **PROTECTED.** Named in the brief as the kind of thing that may have to stay |
| R10 | Unbiasedness of the base forecasts (22 of 41 nodes) | — | — | 294 | **PROTECTED.** RQ2's negative limb; was found *missing* once already |
| R11 | Occurrence gating's degenerate factor | — | — | 181 | **PROTECTED.** Negative result |
| R12 | Weather and cross-series pooling | — | — | 841 | **PROTECTED.** C2's evidence; the pair the document omitted entirely until 8C-5 |
| R13 | Model confidence sets + origin-count reversal | — | — | 553 | **PROTECTED.** §4.5: *"D7 is the single named reason Distinction is not met, and these two sections are what discharge it"* |
| R14 | VUS-PR detection, injection-design validity, cost-ratio sweep | — | — | 903 | **PROTECTED.** C4, including the "measured rather than assumed" clause inside C4's own fixed string |
| | | | | **≈1,374 available** | |

---

## 4 · Chapter 5, Discussion — 4,920 marker, +105%

The largest *relative* overrun and, after Methods, the best yield — because S-3 already identified
its excess as **duplicated statistical disclosure rather than padding**, and duplication relocates
without loss by construction.

| # | What it is | Why the body does not need it inline | What the body retains | Cost | Status |
|---|---|---|---|---|---|
| D1 | 5.3 ¶2 — pairing as what bounds the non-separations, with every standard error | The paired standard errors are reported in Ch 4 where the differences are. This restates them to make a validity argument | The validity claim plus a cross-reference to Ch 4's numbers | **394** | AVAILABLE — highest single yield in the document |
| D2 | 5.3 ¶3 — the confidence sets non-separable in a second, independent sense, regenerating the interval-calibration numerics | Same mechanism as R4 and the same duplication S-3 named | The second sense stated once, cross-ref | **373** | AVAILABLE (pairs with R4) |
| D3 | 5.3 ¶4 — "a second sighting of a mechanism already reported" | Says in its own first clause that it is a second sighting | One clause | **93** | AVAILABLE |
| D4 | 5.5 ¶6 — the vendor constraint, recorded for comparable projects | Transferable-lesson material, not a divergence of this work | The constraint named in one sentence | **165** | AVAILABLE |
| D5 | 5.2 — per-divergence argument detail across six divergences | Each divergence must be *declared* in the body; the full argument for each need not be | Each divergence, its direction and its one-line justification | **~300** | PARTIAL — declaration protected, argument available |
| D6 | 5.3 ¶5 — neither measurement reaches the weather and pooling nulls | — | — | 86 | **PROTECTED.** A stated limit on a negative result |
| D7 | 5.1 — answers to the research questions | — | — | 1,060 | **PROTECTED.** R8 requires 1.3's questions to be 5.1's answered questions |
| D8 | 5.4 — limitations, biases, assumptions | — | — | 924 | **PROTECTED.** §4.5 rules 5.4 the one section that *grows*; carries R106/R107 |
| | | | | **≈1,325 available** | |

---

## 5 · Chapters 1, 2 and 6 — low yield, and why

- **Ch 1 (2,023).** 1.4 Contributions is the overrun at 605. The Introduction is where a marker
  forms their reading of the work, and 1.4's excess is the five contribution strings *with their
  strength qualifiers* — which `PRJ93_RULES.md` forbids a length pass from touching. **Nothing
  offered. ~0.**
- **Ch 2 (4,938, +23%).** The smallest relative overrun. A literature review is an argument a
  marker reads as the justification for the work; relocating it to an appendix damages the thing it
  exists to do, and Appendix A is a *search and screening* record, not a home for synthesis.
  Perhaps **~300** from the foundation-model landscape in 2.3, at real cost. **Not recommended.**
- **Ch 6 (2,328, +112%).** 6.2 at 962 carries **C2 and RQ2's nulls, both of which the document
  omitted entirely** until 8C-5 found them by enumeration, plus ~180 words of critique-added
  qualifiers. §4.5 rules these unavailable. **PROTECTED. 0.**

---

## 6 · The arithmetic, and the finding

| Source | Available (marker) |
|---|---|
| Ch 3 Methodology | ~1,696 |
| Ch 4 Results | ~1,374 |
| Ch 5 Discussion | ~1,325 |
| Ch 2 Literature Review (not recommended) | ~300 |
| **Total defensible** | **~4,695** |
| Gap to 20,000 (marker) | **7,779** |
| **Shortfall** | **~3,084** |

**A maximal defensible relocation does not reach 20,000.** It closes roughly 60 per cent of the
gap. This is reported rather than padded: the list could be made to sum to 7,779 only by moving
reconciled measurement, and the brief rules that out in the same sentence that authorises the
lever.

**Three things follow, all of them Phuong's to rule on.**

1. **Section 0 is the precondition.** Until `declaration.tex` and `\quickwordcount` agree with the
   supervisor's ruling, executing every item above changes the declared count by **zero**.
2. **Even granted the ruling, a second lever is needed for the last ~3,100.** The candidates are
   the ones this list rules out on its own authority and Phuong may not: the four-limb
   reconciliation (~1,973), `sec:res-traded` (373), and Ch 2 synthesis. Each is protected here
   because losing it leaves a body verdict unsupported — which is a judgement, not a measurement.
3. **The alternative the brief already rejected may have to return in a smaller form.** Not "accept
   +39% with a justification", but "accept +8% with a justification, having relocated 4,700 words
   and having the appendix structure to show for it". That is a materially different sentence to
   write in a declaration, and it is reachable.
