# Conclusions rewrite — critique log, 8C-5, 2026-08-09

**Roles are the three in `brain/skills/autoresearchclaw/SKILL.md` §3**, plus the §4 T1–T14 gate as a
checklist, plus two phase-specific roles named in the 8C-5 prompt. **Five independent calls**, no
shared context, none seeing another's findings. Each role's remit is **quoted from the file that
owns it** rather than named, per `PRJ93_RULES.md`, *"Anything a critique log claims to have applied
is quoted, not named"*.

**Why independence matters here, measured:** the five calls returned findings that converge on eight
defects, and every one of the eight was found by at least two roles that could not see each other.
A single pass with five personas in one context has previously returned a small fraction of that
(memory: *three personas in one context found 7 findings; three independent calls found 42*).

**Scope of this log, stated because a clean check invites over-reading.** All five roles were
pointed at `chapters/conclusion.tex` and at the four chapter files as evidence. **None of them
audited Chapters 2–5 for their own defects**, and two findings below are defects in *those* files
that surfaced only because a role followed a cross-reference out of its target. Nothing here should
be read as a clean bill for any other chapter.

---

## Round A — Methodologist

> **Remit, quoted verbatim from `brain/skills/autoresearchclaw/SKILL.md` §3:**
>
> "### Role A — Methodologist
> Audits whether the work supports the claim, independent of how it is written.
> - Internal validity: does the design isolate what it claims to isolate?
> - External validity: what population, period or venue does the result generalise to, and does the
>   text overreach that?
> - Baseline fairness: is the comparison a real contest, or a strawman? Was the baseline tuned with
>   comparable effort?
> - Ablation completeness: is each component's contribution separable, or are several things changed
>   at once?
> - Reproducibility: could a reader reimplement this from the text alone? Hyperparameters, seeds,
>   data splits, compute, preprocessing.
> - Protocol leakage: is any tuning or selection decision made on the test set?"

**32 findings, 12 blocking.** The ones that changed the text:

| # | Finding | Disposition |
|---|---|---|
| A1 | **Pooling did not return a null.** `tab:group` retains `{U}` alone at Two River Taps, i.e. both grouped arms are *eliminated*, and the paired intervals exclude zero at two of three venues. Only Ellel is a null. The new C2's whole architecture was a matched pair of nulls | **APPLIED.** C2 now reads "neither buys accuracy", spans zero "only at Ellel", "a detected small loss at the two data-rich venues", "eliminated from the set altogether at Two River Taps" |
| A2 | The Beer Hall N–M contrast **excludes zero** at $+0.0163\,[0.0004,0.0337]$ and Chapter 4 instructs it "must be read against that conclusion rather than past it". C2 reported neither | **APPLIED.** The marginal detection and the set-governs ruling are now inside the same sentence as the null claim |
| A3 | §5.3 carries **one** half for these arms, not both: it says the validity measurements "concern the model-comparison machinery rather than the covariate studies" | **APPLIED.** The cross-reference now reads "for the model-comparison arms only" |
| A4 | §5.3's third element was dropped: the weather and pooling result files **carry no environment identity** and the source records it as an open item | **APPLIED.** Now stated in the same sentence |
| A9 | **"Selection is made by a model confidence set" misdescribes what happened.** The deployment gate was taken at six origins by a difference of means, at a fold count where the correction is identically zero; the sets are a retrospective audit | **APPLIED.** "re-adjudicated here … against a deployment gate taken at six origins by a difference of means with no significance test computable at that fold count" |
| A11 | **"The rhythm supports a calibrated band"** — Chapter 4 says "The band is miscalibrated" | **APPLIED.** "a conformal band … and it is miscalibrated" |
| A12 | **"with the power available to detect a departure"** — `results.tex`:518 says "No achieved power or minimum detectable effect is quoted anywhere in this chapter, and the omission is deliberate" | **APPLIED, clause deleted.** Replaced with the independence caveat Chapter 4 actually attaches |
| A13 | The band paragraph omitted **the trading-day decomposition**, which is Chapter 4's actual calibration finding: Ellel covers **0.692** on trading days, the largest miscalibration in the study | **APPLIED.** Named, with `tab:coverage-traded` |
| A15 | "detects sustained structure well and point events poorly" — Chapter 4 refuses the clean partition: it "holds as a statement about spikes at **two of three venues**" | **APPLIED.** Both limbs now carry their venue scope |
| A17 | 6.1 singled out the calibration term as unrun, implying the other three ran. **All four terms are unrun** | **APPLIED.** "none of the four terms … has been computed" |
| A20 | **PROTOCOL LEAKAGE.** The Mondrian repair proposed grouping on *whether the venue traded*, which is known only **after** the target date, so it conditions the calibration group on the realised outcome. It was ranked *closest to executable* | **APPLIED.** Rewritten as grouping on a *predicted* occupancy signal, with the booking diary named as its blocked input, and moved out of the unblocked group |
| A23 | The Two River Taps item waits on an input **that cannot arrive**: the venue "ceased trading on 2026-05-08 and its history cannot grow" | **APPLIED.** Reframed as a rule fixed in advance for a live venue; the unexecutability at that venue is stated |
| A24 | TabPFN: "narrower than a credential" is wrong — the local-weights path **does** require a vendor account | **APPLIED.** Both constraints named; §5.5's stronger licence wording restored |
| A30 | "under a year of untidy till data" — frame lengths are **399, 386 and 331 days** | **APPLIED.** "thirteen months or less" |
| A31 | "field instantiation rather than method" over-generalises §2.7's scoped disclaimer, and §5.4 calls rank uniformity "the instrument this work adds" | **APPLIED.** Scoped to cost-sensitive intervention; rank uniformity named as the one instrument added |
| A32 | 6.2 never names the **population** the five claims generalise to | **APPLIED.** Lede binds all five to three venues of one estate, frames no longer than thirteen months, on a self-prepared corpus |

---

## Round B — Statistician

> **Remit, quoted verbatim from `brain/skills/autoresearchclaw/SKILL.md` §3:**
>
> "### Role B — Statistician
> Audits whether the numbers mean what the sentences say.
> - Are 95% confidence intervals or error bars reported on every result table?
> - Is n > 1? How many seeds, folds or splits, and is the count stated?
> - Are significance tests appropriate to the design — paired where the data are paired, corrected
>   where comparisons are multiple?
> - Is an effect size reported, not just a p-value? Is a significant-but-tiny effect being sold as
>   important?
> - Survivorship: if any run failed or diverged, are both conditional (successful runs only) and
>   unconditional (failures as worst case) metrics reported? Without both, every comparative claim is
>   biased.
> - Is variance across conditions non-zero? Identical metrics across conditions means the
>   manipulation did not take, not that it had no effect.
> - Are denominators, baselines and scaling stated for every ratio metric?"

**Verified as MATCHING against source:** the 273/260/205 origin counts against `tab:mcs`; the
six-origins-second-of-nine reversal against `results.tex`:58–62 and `numbers_audit.md` MISMATCH 1;
five weather arms retained against the `tab:weather` caption; the four cost ratios against
`results.tex`:996–1001; the eight further-work items and their 3+4+1 partition.

**KNOWN TRAP CLEARED.** The withdrawn *"8 false alarms against 124 misses"* form — where the 8 is a
fatigue count on un-injected windows belonging to neither denominator (`discussion.tex`:124–127) —
**has not been reintroduced in any form.** No numeral 8, 124, 644 or 75 appears in the chapter. A
LaTeX comment now records the trap beside the cost-sweep sentence so it cannot be reintroduced by a
later editor.

| # | Finding | Disposition |
|---|---|---|
| B1 | The power clause (same as A12) | **APPLIED** |
| B2 | **"in three of the four cases the sample size … was not recorded next to it" has no result file.** Searched `numbers_audit.md`, `numbers_audit_resolutions.md` and `brain/log/` | **APPLIED, struck.** See the ledger cross-check below, which is the stronger form of this finding |
| B3 | Pooling reported as a null (same as A1) | **APPLIED** |
| B4 | The origin-count reversal belongs to the **absolute-error** measure; the surrounding confidence sets are squared loss | **APPLIED.** The measure is named in the sentence |
| B5 | "calibrated band" (same as A11) | **APPLIED** |
| A1 (adv) | "every ratio the sweep runs" without stating there are four | **APPLIED.** "all four ratios" |
| A4 (adv) | "Four claims this work withdrew" collides with a second, different four | **APPLIED.** The closing now uses the audit's own quantity and states the denominator |
| A5 (adv) | "read and cited more than once" is unsourced | **APPLIED, cut** |

**One Role B verdict was itself wrong, and catching it is the reason subagent findings get verified.**
Role B recorded *"reproduces the measured coverage at all three venues to a thousandth"* as
**MATCHES**, against `results.tex`:650, which carries that phrase. The phrase is **refuted**:
`discussion_rewrite_critique.md` **B13** measures the implied-versus-measured agreement at
**0.00114 / 0.00121 / 0.00157**, so a thousandth is not met at any venue, and that entry records
`results.tex`:526 as carrying the same unrepaired phrase. Role B matched a sentence against another
sentence rather than against the measurement. **The clause was cut from the Conclusions** and a
comment records why. This is `PRJ93_RULES.md`'s *"a value match is not an identity match"* in a new
place: the match was to *prose*, not to a number.

---

## Round C — Claim auditor

> **Remit, quoted verbatim from `brain/skills/autoresearchclaw/SKILL.md` §3:**
>
> "### Role C — Claim auditor
> Audits the join between text and evidence, sentence by sentence.
> - For every claim in a title, abstract or conclusion: name the specific metric, table or figure
>   that supports it. Unnamed → blocking.
> - Does any number in the prose fail to appear in a result file? → blocking.
> - Topic drift: does a section argue something the chapter is not about?
> - Does the strength of the verb match the strength of the evidence? 'demonstrates' vs 'suggests'
>   vs 'is consistent with'.
> - Are limitations stated once, in the limitations section, rather than hedged throughout?
>   Scattered hedging reads as evasion and costs marks.
> - Citation placement: do Method, Results and Discussion cite anything, or do all citations sit in
>   the introduction and related work?"

**17 findings, 15 blocking.** The distinctive ones, all applied:

| # | Finding | Disposition |
|---|---|---|
| C4 | **C1 named no table, figure or section at all**, and it is the contribution carrying the most numbers | **APPLIED.** `tab:mcs`, `sec:res-mcs`, `sec:res-demonstration` added |
| C6 | 6.1 said detection is "scored under an asymmetric cost", which §5.1 declares **unaddressed**; and the ref pointed at `sec:res-vuspr`, which contains no cost weighting. **6.1 and 6.2 contradicted each other** | **APPLIED.** Split into the pre-committed measure and the swept-not-applied cost weighting, with `sec:res-costsweep` |
| C7 | The shortfall was stated **twice** in 6.1.2, the second time as a free-standing hedge, which is exactly what U6 condition 1 forbids | **APPLIED.** Folded into the delivery sentence |
| C8 | 6.1's opener promises the cause is "cited here rather than argued again" and then **no subsection cited `sec:disc-specification`** | **APPLIED.** Cited at both points |
| C9 | `sec:ruler-ellel` is the **Ellel-only** unscaled-error exception, not the general ruler | **APPLIED.** Now `sec:ruler` |
| C10 | "the one candidate surveyed exposing a genuine predictive mean" — **no chapter supports it** | **APPLIED, cut.** Confirmed independently: `grep "predictive mean"` returns **one** hit across all chapters, in the Conclusions itself |
| C11 | **"urgency" occurs exactly once in the whole document** — here. The extension was motivated against a design element the dissertation never documents | **APPLIED.** Renamed *Differentiated surfacing thresholds* and tied to what `sec:agent` actually specifies, "a product of six constants with no model participating" |
| C13 | "both returned nulls" without the contrast that excludes zero (same as A2) | **APPLIED** |
| C15 | The opener disclaimed material the chapter **contains** — C5 is a required gap statement, and 6.1 is substantially shortfalls | **APPLIED.** Opener now says what the work does not reach is named here where it qualifies a deliverable or a claim, and argued in Chapter 5 |
| C17 (adv) | A **stale trace comment in `results.tex`**:771 asserts "The 0.9178 quoted in the conclusion…" — the recomposed conclusion quotes no such figure | **APPLIED as an appended supersession**, not a deletion, per the corrections rule |

**Checks Role C recorded as passing:** the count is five and five are present in C1–C5 order with no stale
"four"; the count is eight with a 3+4+1 partition summing to eight and no "seven" or "six"; C5's unrun
status is inside the same sentence as the apparatus claim; 6.1.1 names the unmet component in the same
sentence as the two delivered ones; citations are not confined to the introduction.

---

## Round D — knowledge-telling against critical writing

> **Remit, quoted verbatim from the `ds-writing` skill §1, the file that owns it:**
>
> "This is the single largest separator between a pass and a distinction. Knowledge telling states
> what is known. Knowledge transforming tells the reader why and how the stated material bears on the
> research question."
>
> and its diagnostic, quoted verbatim:
>
> "When auditing a paragraph, label each sentence. Descriptive moves state what happened, what
> something is like, the order events occurred, how something works, what method was used, what the
> options were, and what the components are. Critical moves identify significance, judge strengths and
> weaknesses, weigh one piece of evidence against another, argue a case from evidence, show why
> something is relevant or suitable, indicate why an approach will work best, explain why timing or
> ordering matters, give reasons for selecting each option, rank details by importance, show the
> relevance of links between findings, and draw conclusions.
> A section that is more than roughly half descriptive is not yet at Masters level."

**Measured ratios on the pre-revision draft**, as the skill requires ("report the ratio rather than
asserting the writing lacks criticality"):

| Section | Sentences | Descriptive | Critical | % descriptive |
|---|---|---|---|---|
| 6.1 Objectives revisited | 15 | 8 | 7 | **53 %** |
| 6.2 Contributions | 17 | 4 | 13 | 24 % |
| 6.3 Further work | 21 | 7 | 14 | 33 % |
| 6.4 Closing | 8 | 2 | 6 | 25 % |
| **Chapter** | **63** | **23** | **40** | **37 %** |

Only 6.1 was over the half-line, and the excess was concentrated in structural announcements rather
than in the deliverable statements the section exists for.

| # | Finding | Disposition |
|---|---|---|
| D1 | **RQ2 has no contribution claim anywhere in the chapter.** `grep` for `reconcil`, `hierarch`, `coherent`, `median` returned zero hits. The unbiasedness precondition failing at 22 of 41 nodes is the most decisive negative result in the dissertation and the conclusion silently dropped it | **APPLIED.** Verified against the owning file: `06_research_questions.md` §6 maps **C1 to "RQ1, RQ2"**, so the fix is to carry RQ2's limb inside C1 rather than to add a sixth claim against a count Phuong fixed at five. A paragraph now states the reconciliation and estimand result |
| D2 | The ordering sentence claimed executability order and then placed the only unblocked item eighth | **APPLIED.** The frame now states the real grouping and the items were reordered so the unblocked ones come first |
| D3 | Item 8 followed from a citation, not from a finding, while the lede said all eight "follow from findings above" | **APPLIED.** "seven from findings above and one from a limit of the reviewed literature this work did not close" |
| D4 | The chapter's own "largest single gap" sat seventh under an ordering the chapter chose | **APPLIED.** The lede now states that the two orderings disagree and which one is being used |
| D5 | 6.1's 53 % is fixable by cutting four structural-announcement passages | **APPLIED.** The colon-clause template announcement and the prose contents page are gone |

**D1 is the finding of this round and it is the same shape as C2.** Two negative results — the
weather and pooling pair, and the reconciliation failure — were both absent from a Conclusions
chapter that stated four positive-sounding claims. Neither was found by any instrument in this
project; both were found by reading for what a section does not contain.

---

## Round E — process reported in place of result

> **Remit, stated in full in the 8C-5 prompt and reproduced here so the check can be reread rather
> than re-derived:**
>
> "A Conclusions chapter must report what is KNOWN, not what was DONE to find out. A sentence whose
> grammatical subject is the conduct of the work ('this project ran', 'the analysis was performed',
> 'an audit examined', 'the apparatus was built', 'the study set out to') reports process. A sentence
> whose subject is the object of study ('coverage misses nominal at all three venues', 'the ordering
> reverses with origin count') reports result. Process sentences are legitimate ONLY where the process
> itself is the finding — for instance where the point is that something was pre-registered before the
> outcome was seen, or that a component was specified and deliberately not run."
>
> The governing instruction it applies, quoted from the 8C-5 composition brief: headings and content
> must contain **"Nothing whose subject is the conduct of the work."**
>
> and the two heading tests it checks against, quoted verbatim from `05_paper_architecture.md` §3.1:
>
> "| N6 | No first person and no self-reference | *\"What the work establishes\"* |"
> "| N7 | No chronology or narrative position | *\"Restating the headline out-of-sample figure\"*,
> *\"what replaced it\"*, *\"the original gate\"* |"

**Measured on the pre-revision draft:** 63 sentences, 29 RESULT, 11 PROCESS-legitimate, 23
PROCESS-illegitimate. Seven of the 23 were one systemic pattern, a numbered section as grammatical
subject ("Section X finds / reports / records").

| # | Finding | Disposition |
|---|---|---|
| E1 | The opener was a four-verb account of what the chapter would do. "A Conclusions chapter is the one chapter that needs no roadmap — the reader has arrived, not embarked" | **APPLIED.** The chapter now opens on state: "Two of the three deliverables … are measured; the third is built and unrun" |
| E2 | 6.1's opener described its own composition template | **APPLIED, cut from the colon** |
| E4 | **"It is met."** — an unfalsifiable self-assessment that every submitted dissertation passes at the moment of submission | **APPLIED.** Replaced by the state claim about what the report's account actually contains |
| E5 | 6.1.3 was a prose contents page duplicating the table of contents | **APPLIED.** Compressed to one clause |
| E9 | "the recall figure this project had been leading with" is **narrative position**, the content-level analogue of N7's *"what replaced it"* | **APPLIED.** Now names the measure's property: "a lag-intolerant recall figure that scores a late detection as a miss" |
| E10 | "what this dissertation set out to do" is the remit's canonical process construction, attached to the chapter's most important admission | **APPLIED.** "the largest gap between the architecture and the evidence for it" |
| E11 | The further-work frame was a counterfactual about the project's hypothetical second run | **APPLIED.** Recast onto the properties of the extensions |
| E12 | The closing announced its own ending, with a section as subject and an editorial decision as predicate | **APPLIED.** "One pattern in this work's own evidence transfers past hospitality" |
| H1 | **`\subsection{The dissertation}` fails N6 outright** — a subsection of a dissertation headed "The dissertation" is self-reference at maximum strength, and no synonym repairs it | **APPLIED by renaming, not by deletion.** Renamed **"The technical report"**, which is the project specification's own term for the deliverable. Deletion was rejected: U6 binds "one subsection each" for three deliverables, and dropping one would defeat the unlock |
| E-§6.4 | The closing's evidence had **no denominator**, so a reader could not distinguish "recomputation is productive" from "this project's documentation was loose" | **APPLIED.** "Of 340 numerical claims audited … 309 resolved exactly and four changed a conclusion", and the rule now ends on the estate's lesson rather than on the project's virtue |

---

## The §4 gate, T1–T14

> **Quoted verbatim from `brain/skills/autoresearchclaw/SKILL.md` §4:** "Run every test. Each is
> pass/fail — no partial credit, no judgement call. Any `blocking` failure means revise."
> and: "**T1 is the load-bearing test.** A number without a traceable source is the failure mode that
> destroys a dissertation's credibility."

| # | Test, quoted | Verdict |
|---|---|---|
| T1 | "Every number in the text traces to a `brain/log/*result*.md` file, with the path in a LaTeX comment beside it" | **FAILED on first pass, now PASSES.** The composed draft carried no trace comments at all. Six trace blocks added, covering the origin counts and the reversal, the reconciliation result, the weather and pooling contrasts, the coverage and rank-uniformity figures, the detection figures, and the audit counts |
| T2 | "Every comparison claim carries a p-value, or an explicit sentence that the difference is not significant" | **PASS.** Every non-separation is stated as one; the one interval excluding zero is quoted with its bounds |
| T3 | "Every result table reports 95% CIs" | **NOT EXERCISED — scope stated.** This chapter carries **zero floats**. T3 is discharged against Chapter 4, where the floats live, and this chapter cannot pass or fail it |
| T4 | "Every title, abstract and conclusion claim names the metric supporting it" | **FAILED on first pass (Role C, C4), now PASSES** |
| T5 | "Seed/fold count is stated and n > 1, or the single-run limitation is stated explicitly" | **PASS.** 273 / 260 / 205 origins named to their venues |
| T6 | "Where any run failed, both conditional and unconditional metrics are reported" | **PASS by disclosure.** The unrun agent evaluation and the unscored ladder entrant are reported as unrun rather than as results |
| T7 | "No placeholder text, no `TODO`, no `[PLACEHOLDER]`, no `---` standing in for a value" | **PASS.** Zero occurrences, confirmed by grep |
| T8 | "Every factual claim about a cited paper was checked against NotebookLM this session" | **PASS, with the scope named.** Four keys are cited. `hansen_model_2011` and `grinsztajn_tabpfn-3_2026` carry claims already discharged by the Chapter 5 T8 run. `gulati_ask_2026` was **queried this session** and the paper's own abstract confirms the differing decay rates ("goal clarification loses nearly all value after 10% of execution … while input clarification retains value through roughly 50%"). `chatfield_all-zero_2007`'s claim is Chapter 3's, restated here by cross-reference, and was **not independently re-queried** |
| T9 | "Every citation key used exists in Zotero" | **PASS.** All four confirmed by **title lookup**, not by citation-key lookup, per the standing rule that a null from `zotero_search_by_citation_key` is not evidence of absence. Keys `EJGM45JU`, `ZRUYM5AH`, `RVENL3UP`, `4XF9367R`; none returned a trashed status |
| T10 | "Method, Results and Discussion each cite at least one source" (advisory) | **N/A to this chapter.** The Conclusions cites four sources |
| T11 | "Bullets appear only in the contributions paragraph and the limitations section" (advisory) | **PASS.** No bullets; the eight extensions use run-in bold headings, the pattern inherited from the approved composition |
| T12 | "At least two figures, each referenced by `\ref{}`" (advisory) | **Document-level, not chapter-level.** This chapter references `fig:gap-map` and `fig:nulls` |
| T13 | "Limitations stated once, in one section, 200–400 words" (advisory) | **PASS after repair.** Role C found four limitation restatements inside 6.2 and one in 6.3; the chapter now carries limitations only where they qualify a specific claim, with Discussion 5.4 owning the section |
| T14 | "No table a chart would show better" (advisory) | **NOT EXERCISED.** Zero tables in this chapter |

---

## What the roles did NOT reach

Stated because a five-role sweep invites over-reading, and because `PRJ93_RULES.md` requires a clean
check to name its own scope.

- **No role audited Chapters 2–5 on their own terms.** Two defects in those files surfaced only
  incidentally: the stale `results.tex` trace comment, and the unrepaired "to a thousandth" phrase at
  `results.tex`:650 which `discussion_rewrite_critique.md` B13 had already recorded for 8D and which is
  **still live in Chapter 4**. That one is **not fixed here** and is carried forward.
- **No role could check whether a number is correct in the artefact**, only whether the prose matches
  what another file says. The `active`/`traded` population hazard and the environment-stamp gap remain
  properties of the underlying result files.
- **Word count is not meaning.** `completenesscheck` and `venueordercheck` read presence and shape.
  The roles above are the only instrument here that reads content, and they read one chapter.

---

## Criterion trace — each criterion to the passage that meets it

The rubric map at `05_paper_architecture.md` §5 names these against Chapter 6. Criteria are quoted
from `knowledge/00_marking_criteria.md`. A section that cannot be traced is not finished.

| Criterion, quoted | Section | The passage that meets it |
|---|---|---|
| **R109.** "The Conclusions revisit the general aim." | 6.1 | The aim (`06` §1) is whether a three-venue estate holds enough data to support a proactive intervention layer, in three parts: forecast well enough to establish normal, calibrate the uncertainty per venue, detect departures under a cost asymmetry. 6.1.1 answers all three in one sentence: the rhythm is learned and scored, departure is detected and evaluated, and the agent is "built, frozen by commit ordering and never run". The aim's narrowing against the specification's research question is cross-referenced to `sec:disc-specification` rather than re-argued |
| **R110.** "The Conclusions revisit each individual objective." | 6.1 | One subsection per student deliverable, per **U6**: `sec:conclusion-brain`, `sec:conclusion-evaluation`, `sec:conclusion-report`. Each opens by restating what was committed, in the specification's own terms |
| **R111.** "The Conclusions state whether each objective was achieved." | 6.1 | Stated for each, and **in the same sentence as the delivered part**, which is U6's binding condition. (i) "Two of its three components are delivered and measured and the third is delivered and unmeasured". (ii) "delivered against the deviation signals rather than against an agent's prompts, while none of the four terms of the agent objective has been computed and no qualitative manager feedback was obtained at all". (iii) "every element is present", qualified in the same paragraph by what the account contains |
| **R112.** "The Conclusions discuss the project as a whole." | 6.2 | Five contributions spanning all five research questions, bound in the lede to the population they generalise to: "three venues of one estate over frames no longer than thirteen months, on a corpus this work prepared and then evaluated on" |
| **D12.** "The research question is answered completely (stronger than 40-49's 'sufficiently well' and 60-69's 'addressed and answered')." | 6.2 | **This is the criterion the chapter failed before the critique and now meets.** RQ1 → C1 paragraph 1. **RQ2 → the reconciliation paragraph, which did not exist**; a role grepped `reconcil`/`hierarch`/`coherent`/`median` and found zero hits, so one of five questions had no contribution statement. RQ3 → C2, **which also did not exist**. RQ4 → the coverage paragraph. RQ5 → the detection paragraph. Limb 7 → C5, with "has not been run" inside the sentence. **Five for five, where the pre-8C-5 chapter was three for five** |
| **R113.** "The Conclusions state what would be done differently if the project were repeated." | 6.3 | Two items are marked as such in the lede ("what this work would do differently were it repeated") and each says so in its own body: the windowed pool's "pre-registration is the first change this work would make to its own method were it repeated", and the Mondrian regrouping's "second change this work would make to its own method, and it is blocked rather than mechanical" |
| **R116.** "The Conclusions state how the methodology would be modified if the project were repeated." | 6.3 | The same two, and they are **methodological** rather than scope changes, which the lede states: "they change a specification rather than add a study". One fixes a pre-registration procedure; the other fixes a partition specification |
| **R114.** "The Conclusions state what had to be learned in order to do the project." | 6.4 | Discharged **in the register of the method, not of the author's experience**, per the composition brief's "Nothing whose subject is the conduct of the work": what had to be learned is that a documented, reviewed, repeatedly-read figure carries no information about its own correctness |
| **R115.** "The Conclusions state what was learned from doing the project." | 6.4 | The transferable rule, with its denominator: "Of 340 numerical claims audited … 309 resolved exactly and four changed a conclusion when they were recomputed", and the rule that follows is addressed to a reader holding a specification, not to the examiner |

**A tension in the rubric map, resolved and recorded.** R114 and R115 ask what the author learned,
which is by construction a claim about the conduct of the work, while the composition brief forbids
any sentence whose subject is that conduct. They are reconciled by putting the lesson in the third
person as a property of documented figures rather than as a narrative of the project, which is also
what §2.1's purpose cell for 6.4 asks for ("The methodological lesson"). Round E judged the result
legitimate in form and under-supported in evidence; the denominator was added in response.

**What this trace does not establish.** It shows each criterion has a passage. It does not show the
passage is *good*, and no instrument in this project does. The five role calls are the only thing
here that reads for content, and their scope is stated above.
