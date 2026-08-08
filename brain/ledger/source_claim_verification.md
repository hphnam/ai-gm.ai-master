# Source-claim verification — T8 discharged for Chapter 5

**Run 2026-08-08.** The check `autoresearchclaw/SKILL.md` §4 names as **T8**, which
`role_audit_ch4_ch5.md` records as *"Not runnable — T8 (no NotebookLM this pass)"* for both
chapters, and which 8C-4 closed by reporting as **failed** rather than as passed-with-a-caveat.

**Instrument.** `mcp__notebooklm__notebook_query` against the `Dissertation` notebook
(`d565d5f0-9ad6-446f-9573-2316a2f8c0ca`, 118 sources). Four independent queries, each in its own
conversation, each asking what the source *claims* and demanding a verbatim sentence — not asking
whether a proposition is true, which invites agreement.

**Scope, stated with the result.** This covers **every claim Chapter 5 makes about a cited source**:
21 keys across 28 citation commands. It does **not** cover Chapters 2, 3 or 4, except where a
Chapter 5 finding traced upstream. Two propositions could not be checked because the source text is
absent from the notebook, which is a coverage gap in the instrument and not a verdict.

---

## Every claim quoted, not named

**This file quotes what it verified.** `PRJ93_RULES.md` § "Anything a critique log claims to have
applied is quoted, not named" is the rule this obeys, and the rule exists because a *named* check
decayed across four critique logs without any artefact revealing it.

| # | Chapter 5's claim about the source | Verdict |
|---|---|---|
| 1 | `zaffran_adaptive_2022` — on exchangeable scores the adaptive update degrades efficiency with its step size | **SUPPORTED** |
| 2 | `gibbs_adaptive_2021` — adapts the level to realised coverage | **SUPPORTED** |
| 3 | `sun_conformal_2025` — penalty scales with state-prediction error, so an observed calendar does not incur it | **SUPPORTED** |
| 4 | `barber_conformal_2023` — "supply what the construction is, a grouped method assuming within-group exchangeability" | **NOT SUPPORTED** |
| 5 | `stocker_gentle_2025` — "finite-sample marginal coverage **inside each group**" | **NOT SUPPORTED** |
| 6 | `hewamalage_forecast_2023` — absolute-error measures elicit the median | **SUPPORTED** |
| 7 | `kolassa_we_2023` — median-eliciting point forecasts are usually not coherent | **SUPPORTED** |
| 8 | `wickramasuriya_optimal_2019` — reconciliation optimality requires unbiased bases | **SUPPORTED** |
| 9 | `hansen_model_2011` — a wide set is a statement about the data, not a defect of the procedure | **SUPPORTED** |
| 10 | `chatfield_all-zero_2007` — licenses a cost objective; the cost is an inventory cost of ordering, holding and shortage | **SUPPORTED** |
| 11 | `cragg_statistical_1971` + `mullahy_specification_1986` — a fitted parametric binary first stage | **SUPPORTED** |
| 12 | `hewamalage_look_2021` + `brigato_there_2025` — rankings shift, direction not predicted | **SUPPORTED** |
| 13 | `montero-manso_principles_2021` — large collections, no stated threshold | **SUPPORTED** |
| 14 | `kaas_probabilistic_2026` — Chronos-Bolt coverage ≈0.62 against nominal 0.90 | **SUPPORTED** (62.11 %) |
| 15 | `zheng_judging_2023` + `bavaresco_llms_2025` — agreement must be measured, not assumed | **SUPPORTED**, with a wording note below |
| 16 | `fu_prism_2026` — weights false-alarm against missed-opportunity cost | **SUPPORTED** |
| 17 | `hollmann_accurate_2025` — small-data regime | **SUPPORTED** |
| 18 | `guo_calibration_2017` — ECE as the instrument | **NOT IN NOTEBOOK** — cannot be checked here |
| 19 | TabPFN licence prohibits outputs in internal commercial decision-making | **NOT IN NOTEBOOK** — verified elsewhere, see below |

**Nineteen propositions, sixteen supported, two refuted, two unavailable** (one key appears in both
an unavailable and a supported row).

---

## H12-1 — the Mondrian construction is attributed to a paper that disclaims it

**Verified twice, independently, and the second check is the one that binds.** NotebookLM returned
NOT SUPPORTED. Because that tool's returned citation indices were demonstrably unreliable in an
adjacent query (Hansen's quote came back tagged to Hewamalage's source id), the finding was then
checked at the artefact: the Barber et al. (2023) PDF from Zotero (`SBHY4DRN`).

**What the paper contains.** The string `Mondrian` appears **once** in the whole article, and
`group` **four** times. The single occurrence is in Related Work:

> "Finally, we return full circle to the book of Vovk, Gammerman and Shafer (2005), which has
> chapters that discuss moving beyond exchangeability, for example using Mondrian conformal
> prediction (and its generalization, online compression models). Mondrian methods informally
> divide the observations into groups, and assume that the observations within each group are
> still exchangeable (e.g., class-conditional conformal classification). … **These works involve
> very different ideas from those presented in the current paper.**"

So the construction is described in Barber et al. only as another author's prior work, in a sentence
whose next clause disclaims the connection. The paper's own contribution is a weighted-quantile
coverage bound under arbitrary departures from exchangeability.

**This originates upstream, and Chapter 5 inherited it.**

| Where | Text | Status |
|---|---|---|
| `methodology.tex`:442 | "What the construction \emph{is} is **described by** \citet{barber_conformal_2023}" | Literally true of a related-work paragraph, materially misleading |
| `discussion.tex`:214 | "\citet{barber_conformal_2023} **supply** what the construction is" | Stronger verb, plainly wrong |

**The originating source is absent from the bibliography.** `vovk` appears **zero** times in both
`ref.bib` and `ref_additions.bib`. So the honest repair needs a new entry (Vovk, Gammerman &
Shafer, *Algorithmic Learning in a Random World*, 2005) — a reference-list change, not a wording
change, which is why it is not applied here.

**Chapter 2's two uses of the same key are CORRECT and must not be touched.**
`literature_review.tex`:298 ("give the general form of the same trade under arbitrary departures
from exchangeability") and :424 ("bounded rather than eliminated") both describe the paper's actual
theorem. The defect is confined to two lines in two other chapters.

## H12-2 — the group-conditional guarantee is over-attributed, and only in Chapter 5

Stocker et al. state the split-conformal guarantee as **marginal**:

> "If the data in \(I_{cal}\) and the new test point are exchangeable, this simple procedure
> provides the powerful guarantee of finite-sample **marginal** coverage."

**Chapter 3 is careful and Chapter 5 is not.** `methodology.tex`:443 attributes to Stocker only the
marginal property and keeps "applied within each group" as this work's own composition:

> "What it \emph{guarantees} is the split-conformal property applied within each group, which
> \citet{stocker_gentle_2025} state as finite-sample marginal coverage at the nominal level."

`discussion.tex`:215 compresses those two moves into one clause and pulls the grouping **inside**
the citation:

> "\citet{stocker_gentle_2025} supply what it guarantees, finite-sample marginal coverage
> **inside each group**, conditional on that exchangeability holding"

This is a compression error introduced by Chapter 5, not an inherited one. It is the same failure
mode as the `6.6`/`6.2` basis slip: a careful two-part sentence upstream becomes a single
over-claiming clause downstream.

## A wording note, below blocking

Row 15 is supported for what the sentence needs — Bavaresco: *"we recommend validating LLM judges
against task-specific human annotations before deploying them"* — but `zheng_judging_2023`'s
headline is that GPT-4 reaches *"over 80 % agreement, the same level of agreement between humans"*.
Citing it for "**uncalibrated** proxy" reads as a claim that judges are inherently uncalibrated,
which that paper contradicts. **"unvalidated"** is the word the sources support: agreement is
achievable and must be measured, and here it was not measured. One word, no word-count effect.

## The two the instrument could not reach

Neither is a defect in the chapter, and neither is a pass.

- **`guo_calibration_2017`** — the paper's text is not a source in the notebook; it appears only in
  other sources' reference lists. The claim (ECE as the instrument relating predicted confidence to
  observed accuracy) is what that paper is canonically cited for, but **this check did not verify
  it** and says so.
- **The TabPFN licence** — the licence text is not in the notebook. `BLOCKED_third_party.md` §C
  records it re-verified 2026-08-06 against `grinsztajn_tabpfn-3_2026` and the two PriorLabs
  repositories, quoting the prohibited use as *"using model outputs as inputs to internal
  commercial decision-making"*. That is a documentary verification at source, which is what the
  claim rests on; it is not a NotebookLM verification.

---

## What this run establishes, and what it does not

**Establishes.** Sixteen of Chapter 5's nineteen source propositions hold against the sources, with
a verbatim sentence behind each. The chapter's load-bearing citation arguments survive: Zaffran's
efficiency result (the whole adaptive divergence in 5.2), Hansen's reading of a wide set (the whole
of 5.3), and the three-link measure chain (Hewamalage, Kolassa, Wickramasuriya).

**Does not establish.** Nothing about Chapters 2 or 4, whose source claims were not swept — and
`role_audit_ch4_ch5.md` V4 records a `lu_proactive_2024` over-claim in that untouched set
(*"establish that the characteristic failure"* against the same source reported correctly 46 lines
later as *"find … at false-alarm rates above half"*). **T8 remains open for Chapter 4.** Two
propositions here are unchecked for lack of a source in the notebook.

**The result is not cheap.** 8C-4 reported T8 as failed and expected a null return. It found one
misattribution old enough to sit in an approved, pushed Chapter 3, whose correct source is not in
the bibliography at all, and one over-attribution introduced by compression. Both are claims about
what prior work supports, in the chapter whose function is arguing exactly that.
