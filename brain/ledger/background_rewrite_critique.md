# Chapter 2 rewrite — critique record

Five rounds run against the composed draft under `brain/PRJ93_RULES.md`: the three
`brain/skills/autoresearchclaw/SKILL.md` §3 roles, plus two required for this phase — one
checking descriptive knowledge-telling against critical writing per `ds-writing` §1, one
checking that nothing reports the process rather than the result.

Subject: the composed Chapter 2 (ten sections, approved tree at
`knowledge/05_paper_architecture.md` §2.1). Findings are tagged `blocking` or `advisory`
and attached to the passage they concern. Every blocking finding was fixed before the
Overleaf push; advisory findings are recorded with their disposition.

---

## Round 1 — Role A, Methodologist

Chapter 2 makes no experimental claim, so the role was applied to the entailment the chapter
has to support: gap → research questions → Chapter 3.

| # | Finding | Tag | Disposition |
|---|---|---|---|
| A1 | §2.10's limb list stated the measure-and-origins limb as a cross-reference (*"follows from Section 2.6"*) rather than as a claim. A limb the reader has to reconstruct is not a limb. | **blocking** | **Fixed.** Rewritten as a claim: *"is undetermined where the measure degenerates on intermittent data and the ranking is unstable at few origins."* |
| A2 | The gap proposition says *"small multi-venue operational setting"* and the chapter never defines *small*. | advisory | **Accepted as stated.** The following paragraph fixes it at *"an estate of three venues"*, and §2.3 establishes that the pooling literature supplies no threshold — the indefiniteness is the finding, not a slip. |
| A3 | §2.3 asserts that in-context conditioning *"fits nothing at all"* two paragraphs before Chronos-2's group attention is described, so the reader meets the consequence before the mechanism. | advisory | **Not changed.** Reordering costs more words than the confusion does; the globality limb has to precede the models it constrains. |
| A4 | **R66 gap.** Every shipped method is argued for here except the knowledge-gap signal (Methods 3.11). | advisory | **Correct by approved decision, not an omission.** `06_research_questions.md` §7.2 and §10 rule that 3.11 serves no research question and that constructing one would need an eighth gap limb built from literature this chapter does not survey. Recorded here so a later reader does not "fix" it. |
| A5 | §2.5 reduces the online-conformal family to a bare citation list, so a reader cannot tell what adaptive conformal inference, EnbPI and PID control each do. | advisory | **Accepted at budget.** R59 is discharged for that family by `zaffran_adaptive_2022`'s efficiency penalty, which is the limitation that bears on the design. |

## Round 2 — Role B, Statistician

The chapter reports no PRJ93 numbers by construction (§2.9 of the architecture). The role
was therefore applied to every number quoted from a source.

| # | Finding | Tag | Disposition |
|---|---|---|---|
| B1 | *"135 of 240 safety and evaluation fields"* — the source's denominator is **safety** fields. Compression had silently widened it. | **blocking** | **Fixed.** Restored to *"no public information for 135 of 240 safety fields"*. |
| B2 | *"raising F1 from about 66\% to about 87\%"* — the 66\% baseline lost its referent when the sentence naming `lu_proactive_2024`'s fine-tuned agent was cut, leaving a comparison with no comparator. | **blocking** | **Fixed.** Referent restored inside the PRISM sentence. |
| B3 | τ-bench 35.2\%, ProactiveBench 51.85/64.73\%, TSB-AD 1070 series, Ancker's ~30\% adjusted IRR — each traced. | — | Verified against `ledger/citation_audit.md` (revised pass) and `ledger/literature_conformance.md` §0. |
| B4 | Ancker's second limb (~10\% per five-point rise in the repeat proportion) was dropped for space. | advisory | **Accepted.** One IRR carries the mechanism; both were carrying the same claim. |
| B5 | `schmidt_machine_2022` is criticised for reporting no dispersion, which is a statistical criticism of a source rather than a claim of this chapter. | — | Correct as written, and it is the kind of criticism R59 asks for. |

## Round 3 — Role C, Claim auditor

| # | Finding | Tag | Disposition |
|---|---|---|---|
| C1 | *"then concede that on win rates it falls to fourth"* — **concede** imputes reluctance the technical report does not display. The argument needs only that the report states it. | **blocking** | **Fixed.** Both instances changed to *report* / *stating*. The argument is unweakened: it turns on who published the fact, not on how willingly. |
| C2 | `\citeauthor{paleyes_challenges_2022}` in §2.10 sits nine sections after the work was last cited, so the bare surname has no live referent. | **blocking** | **Fixed.** Changed to `\citet`. |
| C3 | Verb strength audited sentence by sentence. *"SPOT answers it with an extreme-value tail fit"*, *"bound error as an instrument at all"*, *"is available at that strength and no higher"* — each matches its evidence. | — | Pass. |
| C4 | Limitations are stated once each, in the passage that owns them, rather than hedged throughout. | — | Pass. This is a change from the current chapter, which hedged its own limitations in four places. |
| C5 | Citation placement: all ten sections cite; none is a bare assertion. | — | Pass. |
| C6 | Dangling cross-reference: `\ref{app:search}` pointed at a label Appendix B does not yet define, and would have compiled to `??`. | **blocking** | **Fixed.** Written as plain `Appendix~B`. **Carry-forward:** convert to `\ref{app:search}` when Appendix B lands. |

## Round 4 — descriptive knowledge-telling against critical writing (`ds-writing` §1)

Sentences labelled descriptive or critical per the §1 diagnostic, section by section.

| Section | Critical / total | Verdict |
|---|---|---|
| 2.1 Decision support | 6 / 12 | Pass |
| 2.2 Short hospitality series | 6 / 10 | Pass |
| 2.3 Pooling and covariates | 17 / 33 | Pass |
| 2.4 Intermittent demand | 7 / 13 | Pass |
| 2.5 Conformal intervals | 9 / 15 | Pass |
| 2.6 Error measures | 15 / 24 | Pass |
| 2.7 Deviation detection | 10 / 18 | Pass |
| **2.8 Proactive agents** | **5 / 14 (36 %)** | **Advisory — below half** |
| 2.9 Evaluation of interventions | 12 / 20 | Pass |
| 2.10 Synthesis and gap | 18 / 25 | Pass |

**2.8, and why it is left as it is.** The section is the most descriptive in the chapter
because its critical load is deliberately deferred: the criticism of PRISM — that it reports
the gate's effect and not the calibration of the probability the gate depends on — is the
hinge of §2.10's gap, and stating it twice would spend the gap's budget on a preview. The
critical moves 2.8 does make are the ones it owns: that reliability rather than capability
binds, that a learned rhythm meets only the retrieval half of the memory description, and
that the body converges on the false alarm as the binding failure. Recorded rather than
padded.

**One pattern found by this round that the mechanical pre-flight missed.** *"The finding is
not that proactivity is hard to produce but that it is hard to restrain"* is a negative
parallelism, which `avoid-ai-writing` flags; the regex sweep looked for *not just / not only
/ not merely* and did not catch the bare *not X but Y*. **Fixed** without losing the content:
*"Proactivity is cheap to produce and expensive to restrain, and restraint is what the
subsequent work attacks."*

## Round 5 — process reported in place of result

Swept for anything whose subject is the conduct of the work.

| Check | Result |
|---|---|
| Session, phase, report or audit references | **None.** |
| Chronology of attempts, or a withdrawal of this project's own earlier claims | **None.** The writing-order disclosure (passage #1) and the preprint census are gone. |
| Tooling commentary | **None.** |
| Forward pointers into Methods or Results | **None.** All six in the current chapter are removed; every surviving `\ref` resolves inside Chapter 2. |
| PRJ93 results reported as prior work | **None.** All 38 passages in `05_paper_architecture.md` §2.9 are dispositioned — 4 removed, 15 excised with the cited claim kept, 19 relocated. |
| First-person authorial narration | **None.** |

**Four phrases were examined and kept**, because each attributes a derivation rather than
narrating the work: *"derived here rather than taken from them"* (the $p>2$ threshold),
*"a characterisation added here"* (the denominator-deflation wording), *"the inference drawn
here is"* (the Haben generalisation), and *"an inference from those results rather than
anything their authors argue"* (the recorded-regime step). All four are required by
`literature_conformance.md` §0 V1–V3, which found the chapter had previously attributed its
own derivations to sources. Removing them would reintroduce the defect that section exists to
record.

The one passage about the conduct of the **review** rather than of the work — the pointer to
Appendix B and its shortfall against a pre-registered protocol — is kept deliberately, under
binding condition 1 on unlock U3 (`05_paper_architecture.md` §7): the non-pre-registration is
declared where a reader meets the protocol, not only in Chapter 5.

---

## Verdict after round 5

Six blocking findings, all fixed. Nine advisory findings, each with a stated disposition.
No blocking finding remains open.

**One item is not a critique finding and is carried to the author instead:** the composed
chapter measures **4,856 words against the 4,000 budget**, and the residue cannot be removed
without deleting arguments the argument-skeleton step was run to protect. The costed cut-list
is in the hand-off, not here.

---

## Correction — 2026-08-07, the word count above is stale

**The figure in the verdict is 4,856. The live chapter is 4,893.** The 4,856 was measured
before the last three edits of the session and was not re-measured after them: the round-3
R66 restoration of `makridakis_m5_2022`, `kolassa_why_2020` and `hollmann_accurate_2025`
(+53), the round-4 negative-parallelism rewrite, and the read-back fix for the repetition
that rewrite introduced. Recorded here rather than overwritten, per the corrections-are-
appended rule.

**Verified on the artefact, not on the local draft.** `chapters/literature_review.tex` was
re-read from Overleaf on 2026-08-07 and fingerprinted paragraph by paragraph against the
local copy — 10 sections, 40 body paragraphs, one figure environment, identical openers and
closers in identical order. The counter is the one calibrated at 0.14 % against the
architecture's measured 8,604 for the pre-rewrite chapter.

| Section | Budget | Live |
|---|---|---|
| 2.1 Decision support and delegated autonomy | 260 | 284 |
| 2.2 Demand forecasting on short hospitality series | 220 | 229 |
| 2.3 Cross-series pooling and exogenous covariates | 700 | 837 |
| 2.4 Intermittent demand | 280 | 324 |
| 2.5 Conformal prediction intervals | 340 | 345 |
| 2.6 Error measures and model comparison | 480 | 686 |
| 2.7 Deviation detection from calibrated intervals | 370 | 500 |
| 2.8 Proactive agents and intervention policy | 400 | 421 |
| 2.9 Evaluation of agent interventions | 400 | 558 |
| 2.10 Synthesis and research gap | 550 | 709 |
| **Body total** | **4,000** | **4,893** |
| `fig:gap-map` caption | *(caption line)* | 42 |

A **433** for 2.8 was quoted in the 8C-1 hand-off. It is wrong — the sections sum to 4,893
only with 421, which is what the counter returns. The total was right in that hand-off; the
one section figure was not.

**Status of the 893-word overrun: provisional, not accepted.** Phuong's ruling of 2026-08-07
is that none of the four costed cuts is made, and that the residue is re-tested by a
**Chapter 2 / Chapter 3 boundary check** run as the first step of 8C-2 — see
`phase_state.md` and `background_argument_skeleton.md`. This figure is not a precedent for
a 22 % chapter overrun and must not be cited as one.
