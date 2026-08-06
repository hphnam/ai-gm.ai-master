# 05 · Paper architecture — specification for restructuring PRJ93 into a research paper

**Status: SPECIFICATION ONLY. No prose was changed and nothing was written to Overleaf
in the session that produced this file.** Every proposal below is a gate item.

**Basis.** `PRJ93_RULES.md` (followed throughout);
`docs/Student Documentation - MSc DS - Dissertation Submission.md`;
`knowledge/00_marking_criteria.md`; `ledger/literature_conformance.md` §8–§17 and the
Phase 6 run outputs `log/60`–`log/65`; `ledger/BLOCKED_third_party.md`;
`knowledge/04_supervisor_evidence_pack.md` §6; the `ds-writing` skill in full.

**Measurement.** Every word count below was measured by reading the live Overleaf files
through the Overleaf MCP on 2026-08-06, at Overleaf head as listed in
`phase_state.md` at close of 2026-08-06. Counts are prose only: LaTeX commands, `%`
comments and the bodies of float environments are excluded; captions are counted
separately and stated separately. Inline math counts as one word per group. Counts
are integers, not ranges; where a figure is an estimate it is marked **(est.)** and
no unmarked figure is an estimate.

**Reading rule for this file.** §1 is measurement. §2–§5 are proposals; §7 records
which of them have since been approved and are therefore closed.

---

## RESOLVED SCOPE OF THE WORD LIMIT — settled 2026-08-06, do not re-litigate

The supervisor has confirmed what counts toward the 20,000 words. This is settled and
no later session should reopen it or re-derive it from `00_marking_criteria.md` §1.9,
which records the question as it stood before the answer arrived.

| Element | Counts toward 20,000? |
|---|---|
| Abstract | **Yes** |
| Body chapters 1–6 | **Yes** |
| Figure and table captions | **Yes** |
| References / bibliography | **No** |
| Appendices | **No** |

Two consequences run through the whole of this file:

1. **Appendix space is free.** A DEMOTE is a real saving, not a relocation of cost.
   The CUT/DEMOTE boundary was redrawn on this basis in §4.2 — material with no place
   in the body but genuine evidential value now goes to an appendix rather than being
   deleted.
2. **The per-section budgets in §2.1 stand as specified and are fixed.** A section that
   cannot meet its rubric criteria within budget escalates to Phuong rather than
   exceeding.

---

## 0. The finding that governs everything else

The dissertation is **37,471 words** against a **20,000-word limit**, and the two
chapters a marker looks at first — Introduction and Discussion — **do not exist**.

| | Words |
|---|---|
| Literature review (body prose) | 8,604 |
| Methodology (body prose) | 9,326 |
| Results (body prose) | 14,580 |
| Conclusions (body prose) | 2,672 |
| **Body subtotal** | **35,182** |
| Float captions, all chapters | 2,145 |
| Front-matter placeholder text | 144 |
| **Measured total** | **37,471** |
| Introduction | **0 — file is four lines, all commented out** |
| Discussion | **0 — no such file** |
| Abstract | **29 — unmodified template placeholder** |

This is not a document with a word-count problem attached. It is **187 per cent of
the limit with the argument's two load-bearing chapters missing**, and the two
missing chapters are worth about 3,800 words that must also be found. The real
reduction required is **17,471 words**, and only about 6 per cent of that can be
recovered by deleting run-log residue. The rest has to come from writing the retained
material shorter, which is a rewrite and not an edit.

HC1 is mechanical and costs marks without any judgement involved. It is treated below
as a hard constraint on the rewrite, not as something to reconcile afterwards.

### The scope dependency — RESOLVED

`00_marking_criteria.md` §1.9 recorded that the source documents do not state whether
the 20,000 words include the abstract, the references, the appendices, or captions.
**The supervisor has now settled it** and the resolution is stated at the head of this
file: abstract and captions count; references and appendices do not. The conservative
reading this file was budgeted on therefore holds, and it holds as a ruling rather
than as an assumption.

The practical effect is confined to the DEMOTE column, and it is large. Appendix space
is free, so the CUT/DEMOTE boundary drawn in §4.2 has been redrawn accordingly and the
demotion sweep extended to every table and to the procedural material in Methods.

### A note on `declaration.tex`, and what it is not

The inherited template `declaration.tex` asserts *"This thesis does not exceed the
maximum permitted word length of 80,000 words"*. **That is PhD template boilerplate and
it binds nothing here.** The only word limit in force is HC1's 20,000, from the
submission document. The 80,000 figure is not a compliance item, is not an alternative
reading of the limit, and appears nowhere else in this file. The file itself is
classified as template residue and cut (§1.0, §4.2 Tier A).

One live mechanical issue survives the file's removal. `main.tex` calls
`\quickwordcount{main}`, a `texcount -sum -merge` over the whole document, which
**prints a live word count into the compiled PDF** — today a number near 37,500. See
§6.1 for the disposition.

---

# 1. CURRENT-STATE INVENTORY

Classification codes, per the brief:

- **KEEP** — belongs in a research paper as is.
- **REFRAME** — the content belongs but is written as process narrative.
- **DEMOTE** — belongs in an appendix, not the main text.
- **CUT** — run-log residue with no place in a final paper.

Run-log residue is: chronological accounts of what was tried and when; debugging and
troubleshooting narrative; session, phase, report or audit references; tooling
commentary; provisional findings later superseded; and anything whose subject is the
conduct of the work rather than its result.

## 1.0 Front matter and template residue

| File | Words | Floats | Class | Reason |
|---|---|---|---|---|
| `abstract.tex` | 29 | 0 | **CUT** then write new | Unmodified template instruction: *"This is the beginning of the abstract that according to the regulations should not be any longer than 300 words."* Typesets in bold. |
| `chapters/introduction.tex` | 0 | 0 | **write new** | Four lines, every one a `%` comment. `main.tex` still issues `\chapter{Introduction}`, so the compiled PDF has an Introduction heading followed immediately by the Literature Review. |
| `acknowledgements.tex` | 39 | 0 | **CUT** | Template placeholder. |
| `publications.tex` | 0 | 0 | **CUT the file** | Entirely commented out; worked example from another author's thesis. Not applicable to an MSc dissertation. |
| `declaration.tex` | 76 | 0 | **CUT** | Inherited PhD template boilerplate, reclassified 2026-08-06. It asserts the 80,000-word PhD limit, which binds nothing here. Replace with whatever originality declaration the department requires; see §6.1 for the `\quickwordcount` question. |
| `appendix/introduction.tex` | 11 | 1 | **CUT** | *"Some extra tables … that should go in the appendix."* The appendix chapter is titled **Introduction** — the template default, never renamed. |
| `tables/introduction/intro_table.tex` | — | 1 | **CUT** | 2×2 grid of the digits 1–4, caption `A table`. Not compiled. |
| `tables/appendix/introduction/appendix_table.tex` | — | 1 | **CUT** | 2×2 grid of the digits 5–8, caption `Caption`. **Is compiled**, so it appears in the List of Tables. |
| `main.tex` | 0 | — | **REFRAME** | Loads `lipsum` (`% just to add random text as an example`); `inputenc` loaded twice; commented dedication retained. |

**HC54 is unmet and mandatory.** The project specification is not included as an
appendix anywhere.

## 1.1 Literature review — 8,604 words, 1 figure, 0 tables

| # | Level | Heading (verbatim) | Words | Class | Reason |
|---|---|---|---|---|---|
| 0 | — | *(untitled chapter opener)* | 343 | **REFRAME** | Roadmap plus an epistemic disclaimer that belongs in the Discussion: *"this review was written after the experimental work it introduces"*. Also carries the preprint census, which is review-conduct commentary. |
| 1 | § | Decision support and the arrival of delegated autonomy | 347 | **KEEP** | No residue. Establishes the premise the whole chapter serves. |
| 2 | § | Learning a venue's rhythm when the history is short | 285 | **KEEP** | No residue. Sets the baseline-is-hard-to-beat discipline. |
| 3 | §§ | When does borrowing across series pay? | **1,781** | **REFRAME** | Four distinct sub-arguments under one heading — globality theory, the foundation-model landscape, the weather-covariate adjudication, and inference-time adaptation with reconciliation. At 21 per cent of the chapter it is larger than every top-level section. Carries a withdrawal chronology: *"TabPFN-TS was entered as a rung of this study's ladder and withdrawn before it scored"*. |
| 4 | §§ | Intermittent trade is a different object | 379 | **KEEP** | Effectively clean. The correction narrative it carries is about the published record (Kostenko's arithmetic), not about this project. |
| 5 | §§ | Weather, and the temptation of exogenous data | 358 | **CUT as a section** | Substantially duplicates the weather adjudication already given at length inside item 3. Two forward-pointers to `sec:res-weather` appear in two different subsections restating the same test. Merge the non-duplicated remnant into item 3. |
| 6 | §§ | From a point to a band | 473 | **KEEP** | No residue. |
| 7 | § | Error measures and model selection on intermittent data | **1,302** | **REFRAME** | Load-bearing, but leaks results forward — *"the reversal this dissertation reports on increasing its evaluation origins moved in the direction that favoured the model already in production"* — and narrates a decision chronology: *"the remedy was declined on the grounds that it would change the served model after the evaluation was frozen"*. |
| 8 | § | From a calibrated band to a deviation signal | 985 | **REFRAME** | Same defect, sharper: *"at the one genuine regime change in this estate's data adaptive calibration performed worse than leaving the band alone"* is a result of this dissertation, reported in the review of prior work. |
| 9 | § | Agents that act without being asked | 728 | **KEEP** | The cleanest section in the chapter. |
| 10 | § | Judging the agent's judgement | 893 | **KEEP** | One admitted-omission clause to move to Limitations. |
| 11 | § | What the literature leaves open | 730 | **KEEP** | The gap statement. Load-bearing and must survive; needs the forward-leaked results removed. |

**Float.** `fig:gap-map` — the only float. Short caption 15 words; **full caption 147
words**, which is a paragraph doing the prose's job.

**Structural defect.** All four subsections are **unlabelled**; only the seven
`\section`s carry labels. Nothing can cross-reference them.

## 1.2 Methodology — 9,326 words, 3 tables, 0 figures, 6 numbered equations

| # | Level | Label | Heading (verbatim) | Words | Class | Reason |
|---|---|---|---|---|---|---|
| 1 | § | `sec:design` | Design of the study | 207 | **KEEP** | Clean. Under-length for what R72–R76 require of it. |
| 2 | §§ | `sec:repro` | Reproducibility as a design constraint | 232 | **DEMOTE** | Lockfiles, library resolution, compute device. Also carries a withdrawal: *"An earlier version of this work reported a case in which a minor library upgrade appeared to reverse a model-selection outcome … it is withdrawn"*. |
| 3 | § | `sec:ruler` | Measuring accuracy on a series with closed days | 757 | **REFRAME** | Core measurement argument, wrapped in repair narrative: *"Earlier implementations of this project held four separate private copies of the denominator"*; *"the audit's claim of an $n$ against $n-1$ error was itself wrong and is withdrawn"*. |
| 4 | §§ | `sec:ruler-functional` | What the median-eliciting ruler costs | 440 | **REFRAME** | Contains an empirical two-arm paired run with pre-registered predictions and their outcomes — **a result, sitting in the methods chapter**. Definitional half stays; the measurement moves to Results. |
| 5 | §§ | `sec:ruler-ellel` | Why Ellel is scored unscaled | 360 | **KEEP** | Clean methodological argument. |
| 6 | § | `sec:intermittency` | Classifying the demand pattern | **1,368** | **REFRAME** | Largest section; densest residue. *"The implementation of Equation~\ref{eq:sba} in this project was specified with the inequality reversed"*; *"An earlier internal figure for the Beer Hall used the ratio of series length to demand count"*; *"Two of those jobs were previously done on data the forecaster had already seen"*; *"The margin was specified after observing that the unmargined rule adopted a node on a margin of two parts in a thousand"*. |
| 7 | § | `sec:exo` | The exogenous set, and the lead at which it is available | 777 | **KEEP** | Genuine design specification. Strip the config traces. |
| 8 | § | `sec:ladder` | The forecasting ladder and its gate | 960 | **REFRAME** | Roughly half its length is an entrant that never scored: *"An eleventh entrant was attempted late and did not score"*; *"Two things about that abort have changed since it was recorded"*; vendor-licence and runtime commentary. |
| 9 | § | `sec:selection` | Selecting among models when the series is short | 248 | **REFRAME** | The arithmetic is a real result. The frame is an audit of the project's own prior procedure: *"The original gate did not have a weak test; it had no test"*. |
| 10 | §§ | `sec:mcs` | The model confidence set | 267 | **KEEP** | Publication-ready. |
| 11 | § | `sec:conformal` | Interval forecasts | **1,035** | **REFRAME** | *"an earlier implementation here did not honour it"*; *"the departure, the re-run that corrected it and its effect on the reported figures"*; an internal-ledger pointer. |
| 12 | § | `sec:detection` | Detection | 531 | **KEEP** | Effectively no residue. The constants-transplant argument is the strongest passage in the chapter. |
| 13 | §§ | `sec:occurrence` | Occurrence, and the hurdle's saturated first stage | 705 | **REFRAME** | *"An earlier version of this section claimed that the first factor of Equation~\ref{eq:hurdle} is observed rather than estimated. That claim was wrong."* Plus test-suite apparatus. |
| 14 | § | `sec:injection` | Evaluating detection: the injection protocol | 427 | **KEEP** | Genuine protocol design. Build chronology to strip. |
| 15 | § | `sec:chatlog` | The knowledge-gap signal | 498 | **REFRAME** | Backend-pinning commentary, an internal-ledger reference, and test apparatus. |
| 16 | § | `sec:agent` | The intervention layer and its evaluation | 514 | **REFRAME** | Version-control commentary and a status declaration. |

**Floats.** `tab:venues` (caption 24 w), `tab:bases` (36 w), `tab:mcs-config` (23 w) —
**83 caption words total, the best-proportioned captions in the document.**
**Zero figures in the methodology chapter**, against R69 (pseudocode and/or flow
diagrams where algorithms are described) and the submission guidance's *"Use figures,
as appropriate, to support your textual communication of methods"*.

**Header comment block, lines 1–24**, is pure project conduct: *"Written from the
verified state record (Master State Log, Addendum 2026-07-21 … and from build reports
42 to 51)"*.

## 1.3 Results — 14,580 words body, 1,915 words of captions, 16 tables, 1 figure

Thirty headings. A research paper's results chapter does not have thirty headings.

| # | Level | Label | Heading (verbatim) | Words | Class | Role / reason |
|---|---|---|---|---|---|---|
| 0 | — | `chap:results` | *(front matter)* | 118 | **REFRAME** | *"grouped by the question each addresses rather than by the order in which the work was done"* — announces its own conduct. |
| 1 | § | `sec:res-ladder` | The ladder, and what the original gate could not establish | 196 | **KEEP** | Supporting. The object under audit. |
| 2 | §§ | `sec:res-demonstration` | A case where the small sample selected the wrong model | 288 | **KEEP** | **Headline.** |
| 3 | § | `sec:res-mcs` | Which models the data cannot separate | 470 | **KEEP** | **Headline**, and the chapter's central negative. |
| 4 | §§ | `sec:res-paired` | What pairing buys, and why the block length is seven | 770 | **DEMOTE** | Robustness: variance reduction plus a block-length sensitivity sweep. |
| 5 | §§ | `sec:res-mcs-functional` | Where the squared loss separates what the absolute loss could not | **1,010** | **REFRAME** | Supporting result buried in rule-narration and a hypothetical: *"Had it been trading, the same evidence would warrant a different response"*. |
| 6 | §§ | *(unlabelled)* | What the fold count did and did not cause | 212 | **DEMOTE** | Robustness check isolating a store-ceiling effect. |
| 7 | § | `sec:res-basis` | The denominator, and where the scaled error fails | 288 | **KEEP → move to Methods** | No residue, but it is a **methodological ruling**, not a result. See §2.6, entailment break 3. |
| 8 | §§ | `sec:res-headline` | Restating the headline out-of-sample figure | 198 | **CUT** | Withdraws a figure this project previously published. *"An earlier version of this work reported a Beer Hall July out-of-sample MASE of $0.386$ … is withdrawn."* A paper does not withdraw its own drafts. |
| 9 | § | `sec:res-reconciliation` | A reconciliation precondition, tested rather than assumed | 545 | **KEEP** | **Headline negative.** 22 of 41 nodes reject unbiasedness. |
| 10 | § | `sec:res-intermittency` | Demand classification under corrected constants | **1,115** | **REFRAME** | Real result inside a defect log: *"Two defects were found there and both are now closed"*; *"An earlier version of this section withheld every node-level reconciliation figure"*. |
| 11 | §§ | `sec:res-margin` | A selection rule with no margin, and what replaced it | 860 | **REFRAME** | The result is one adoption failing by 96 per cent. The rest is the chronology of when the margin was specified. |
| 12 | § | `sec:res-occurrence` | The occurrence gate | 484 | **KEEP** | Null result, honestly bounded. |
| 13 | § | `sec:res-group` | Cross-series in-context learning does not pay at this estate | 378 | **KEEP** | Null result. |
| 14 | §§ | `sec:res-batch` | A library property that would have inverted this result | 168 | **DEMOTE** | Inference-library batch-leak guard and its tests. |
| 15 | § | `sec:res-weather` | Weather, and the lead at which it is available | 545 | **KEEP** | Headline-grade ablation. |
| 16 | §§ | `sec:res-gap` | A covariate gap that was an ingest defect | 212 | **CUT** | Pure debugging narrative: a watermark advanced past an interior hole, and the repair. One clause survives as a data-quality sentence in Methods. |
| 17 | § | `sec:res-coverage` | Interval calibration | 0 | **KEEP** | Container heading, zero prose. |
| 18 | §§ | `sec:res-power` | A seven-point window cannot support a miscalibration claim | 122 | **CUT** | Withdraws an earlier claim of this project's own. *"It was computed on seven observations … the finding is withdrawn."* |
| 19 | §§ | `sec:res-undercoverage` | Measured with power, one venue under-covers | 650 | **KEEP** | **Headline.** |
| 20 | §§ | `sec:res-exchangeability` | Naming the exchangeability violation | 605 | **KEEP** | **Headline.** Reproduces measured coverage to a thousandth at all three venues. |
| 21 | §§ | `sec:res-drift-cause` | What moves the scale, and what a shorter memory would buy | **1,310** | **REFRAME + DEMOTE** | Headline cause-identification, with an embedded counterfactual sweep that is an appendix item. Carries an explicit ledger supersession: *"Supersedes log/72 section 5's untested remedy pointer and log/73 section 5's statement that Ellel's drift is unexplained"*. |
| 22 | §§ | `sec:res-native-interval` | A published interval finding, replicated on this estate | 740 | **KEEP** | Partial replication of `kaas_probabilistic_2026`. Ordering transfers, magnitude does not. |
| 23 | §§ | `sec:res-winkler` | No interval method displaces the incumbent on the Winkler score | 770 | **REFRAME** | Null result wrapped in an implementation-correction narrative: *"The aggregated arm was first implemented with three departures from the method it is named for"*. |
| 24 | § | `sec:res-injection` | Detection performance is not an artefact of the injection design | 364 | **KEEP** | Strong null: the injection-design discount is exactly zero. |
| 25 | §§ | `sec:res-vuspr` | The detection headline, on the measure the review committed to | 484 | **KEEP** | **Headline** for detection. |
| 26 | §§ | `sec:res-suppression` | The realism gap is real and lies elsewhere | 288 | **KEEP** | Supporting: a design defect, 16 per cent of non-spike pairs. |
| 27 | §§ | `sec:res-costsweep` | The cost sweep is degenerate, and not in the direction the literature predicts | 334 | **KEEP** | Null with a substantive inversion: 8 false alarms against 124 misses. |
| 28 | § | `sec:res-chatlog` | A second learning domain reaches the output | 348 | **KEEP** | Supporting. |
| 29 | § | `sec:res-agent` | The intervention layer: apparatus complete, measurement pending | 318 | **REFRAME** | Not a result — a status report. Most of it belongs in Limitations. |
| 30 | § | `sec:res-pattern` | A common pattern across the studies | 394 | **DEMOTE to Discussion** | Interpretation and a self-audit, doing the Discussion's job at the end of Results. |

**Captions: 1,915 words across 17 floats.** `tab:ladder`'s caption alone is **525
words** — longer than nine of the chapter's thirty sections. `fig:ladder` is 240,
`tab:coverage` 160, `tab:mcs` 135. These are not captions; they are paragraphs that
have been evicted from the body.

## 1.4 Conclusions — 2,672 words, 0 floats

| Level | Label | Heading (verbatim) | Words | Class | Reason |
|---|---|---|---|---|---|
| — | `chap:conclusion` | *(lede)* | 76 | **KEEP** | Roadmap. |
| § | `sec:conclusion-claims` | What the work establishes | 300 | **KEEP** | Four contributions at graded strength. The only place contributions are stated. |
| § | `sec:conclusion-divergences` | Where the literature and this estate disagree | 42 | **DEMOTE to Discussion** | Signposting for two subsections that are interpretation. |
| §§ | `sec:conclusion-reversal` | The ranking reversal moved in a direction no cited work predicts | 272 | **DEMOTE to Discussion** | Adjudication against Brigato and Hewamalage — textbook Discussion material. |
| §§ | `sec:conclusion-adaptive` | Adaptive calibration performed worse than leaving the band alone | 344 | **DEMOTE to Discussion** | Resolves an apparent contradiction with the adaptive-conformal literature. Genuinely critical argumentation, in the wrong chapter. |
| § | `sec:conclusion-limitations` | Limitations | 543 | **DEMOTE to Discussion** | R105–R107 place limitations in the Discussion. Six limitations in two declared kinds, plus two internal-validity threats. Substantively strong. |
| § | `sec:further-work` | Further work | **904** | **REFRAME** | 34 per cent of the chapter and 1.66× Limitations. **Internally inconsistent:** the lede says *"Eight extensions follow"*, eight are listed, and the body later says *"the cheapest of the seven"* and *"the smallest of the six extensions"*. |
| § | `sec:conclusion-closing` | Closing | 156 | **REFRAME** | Generalises a methodological lesson. **Does not revisit the aims or the objectives** — R109, R110, R111 all unmet. |

**Nineteen cross-references** in this chapter point into the other three chapter files.
They resolve today; they are the reason no section here can be moved without a
reference sweep.

---

# 2. TARGET ARCHITECTURE

## 2.1 The tree, with word budgets

Budget totals **20,000**, inclusive of the abstract and all float captions, exclusive
of the bibliography and appendices. See §0 for why that inclusion rule is itself a
question for the supervisor.

| # | Section | Purpose (one line) | Budget |
|---|---|---|---|
| — | **Abstract** | Standalone account: problem, aim, method, findings with numbers, conclusion. | **300** |
| **1** | **Introduction** | | **1,400** |
| 1.1 | Operational forecasting in small hospitality estates | Establish the domain and why a wrong forecast costs something. | 300 |
| 1.2 | Problem statement and knowledge gap | Name the gap: proactive intervention grounded on a calibrated model of normality, evaluated against an operator. | 300 |
| 1.3 | Aims and research questions | State the aim and the research questions, numbered. | 350 |
| 1.4 | Contributions | **Five** contributions at graded strength — see `06_research_questions.md` §6 for the exact strings. Amended from four by explicit unlock, §7 U1. | 250 |
| 1.5 | Structure of the dissertation | Chapter-by-chapter overview. | 200 |
| **2** | **Background and related work** | | **4,000** |
| 2.1 | Decision support and delegated autonomy | Why an unprompted agent is a different actor and needs a model of normality. | 260 |
| 2.2 | Demand forecasting on short hospitality series | Simple baselines set the bar; scarcity is the binding constraint. | 220 |
| 2.3 | Cross-series pooling and exogenous covariates | Globality is an estimation-budget argument; weather competes with an encoded weekly pattern. Absorbs the deleted weather section. | 700 |
| 2.4 | Intermittent demand | Intermittency changes the model, the metric and the meaning of a good forecast. | 280 |
| 2.5 | Conformal prediction intervals | Point to band; the upper-bound condition and where it fails. | 340 |
| 2.6 | Error measures and model comparison | Which measure, and by what procedure. | 480 |
| 2.7 | Deviation detection from calibrated intervals | Detector families and the evaluation critique. | 370 |
| 2.8 | Proactive agents and intervention policy | Plumbing is solved; over-offering is the binding failure. | 400 |
| 2.9 | Evaluation of agent interventions | The false-alarm/miss asymmetry and what metric it implies. | 400 |
| 2.10 | Synthesis and research gap | The four results exist in isolation; the gap is field instantiation plus operator-grounded evaluation. | 550 |
| **3** | **Methods** | | **4,200** |
| 3.1 | Study design and data sources | Three venues, per-venue regimes, the closed venue as control, provenance of every source. | 320 |
| 3.2 | Accuracy measures and the denominator basis | The scaled error, the four bases, the ruling, and the unscaled exception. **Absorbs `sec:res-basis` from Results.** | 640 |
| 3.3 | Demand-pattern classification | Classification constants and the selection rule. | 390 |
| 3.4 | Exogenous covariates and availability lead | The covariate set and the five weather arms. | 380 |
| 3.5 | Candidate models and the adoption gate | Nine scored entrants and the beat-both-baselines gate. | 380 |
| 3.6 | Model comparison procedure | Rolling origins, the small-sample correction, and the model confidence set. | 390 |
| 3.7 | Conformal interval construction | Split conformal, the four-block split, and the three refinements. | 440 |
| 3.8 | Deviation detection | Band breach, the standardised residual, CUSUM against BOCPD. | 340 |
| 3.9 | Occurrence modelling | The hurdle's saturated first stage. | 250 |
| 3.10 | Detection evaluation protocol | Control and realistic injection arms. | 260 |
| 3.11 | Knowledge-gap signal | Corpus, clustering, threshold. | 170 |
| 3.12 | Intervention layer and scoring apparatus | The frozen apparatus and what it can establish. | 200 |
| **4** | **Results** | | **5,200** |
| 4.1 | Forecast accuracy and model selection | The ladder, the origin-count reversal, and the confidence sets. | 1,400 |
| 4.2 | Demand structure and hierarchical reconciliation | Classification, the adoption margin, the occurrence gate, and the failed unbiasedness precondition. | 900 |
| 4.3 | Exogenous covariates and cross-series information | The weather ablation and the pooling null. | 700 |
| 4.4 | Interval calibration and coverage | Coverage at power, the exchangeability violation, its cause, and the interval-method comparison. | 1,400 |
| 4.5 | Deviation detection and downstream signals | Injection validity, VUS-PR, suppression, the cost sweep, the gap signal. | 800 |
| **5** | **Discussion** | | **2,400** |
| 5.1 | Answers to the research questions | Each RQ, answered against the evidence. | 500 |
| 5.2 | Divergences from the reviewed literature | The ranking-reversal direction and the adaptive-versus-static result. | 500 |
| 5.3 | Validity of the approach | Why the design supports the claims, and the pattern behind four withdrawn claims. | 400 |
| 5.4 | Limitations and threats to validity | Properties of the problem against properties of the circumstances; biases; assumptions. | 700 |
| 5.5 | Divergence from the project specification | **Mandatory, HC59.** No live agent, N=0 operator labels, transfer unadopted, TabPFN refused on licence, **three venues against the specification's four**, **NeonDB research schema not provided**. Full list and the open question at `06_research_questions.md` §9. | 300 |
| **6** | **Conclusions** | | **1,100** |
| 6.1 | Objectives revisited | Each objective, achieved or not, stated plainly. | 400 |
| 6.2 | Contributions | Restated at final strength. | 250 |
| 6.3 | Further work | Eight extensions, count reconciled, ordered by executability. | 400 |
| 6.4 | Closing | The methodological lesson. | 50 |
| — | **Float captions**, all chapters | 20 floats at a 15-word title plus a ≤45-word body. | **1,200** |
| — | **Reserve** | Absorbs the abstract and caption overrun that always happens. | **200** |
| | **TOTAL** | | **20,000** |

**Appendices** (assumed uncounted — see §0): A Project specification (**mandatory,
HC54**); B Search and screening protocol (**R65, currently unmet, half a page of free
marks**); C Computational environment and reproducibility; D Robustness checks —
pairing variance, block-length sweep, fold-count isolation, batch-leak guard, windowed
calibration counterfactual; E Full ladder and confidence-set tables.

## 2.2 Where current material maps

| Target | Current material |
|---|---|
| Abstract | **New.** Nothing exists. |
| 1.1–1.5 | **New.** Nothing exists. Contributions are drafted only in `sec:conclusion-claims`; the gap is stated only in `sec:rw-synthesis`. |
| 2.1 | `sec:rw-framing` |
| 2.2 | `sec:rw-rhythm` |
| 2.3 | "When does borrowing across series pay?" + "Weather, and the temptation of exogenous data" (merged) |
| 2.4 | "Intermittent trade is a different object" |
| 2.5 | "From a point to a band" |
| 2.6 | `sec:rw-ruler` |
| 2.7 | `sec:rw-deviation` |
| 2.8 | `sec:rw-surfacing` |
| 2.9 | `sec:rw-evaluation` |
| 2.10 | `sec:rw-synthesis` + chapter opener remnant |
| 3.1 | `sec:design` + the data-quality clause salvaged from `sec:res-gap` |
| 3.2 | `sec:ruler` + `sec:ruler-functional` (definitional half) + `sec:ruler-ellel` + **`sec:res-basis`** |
| 3.3 | `sec:intermittency` |
| 3.4 | `sec:exo` |
| 3.5 | `sec:ladder` |
| 3.6 | `sec:selection` + `sec:mcs` |
| 3.7 | `sec:conformal` |
| 3.8 | `sec:detection` |
| 3.9 | `sec:occurrence` |
| 3.10 | `sec:injection` |
| 3.11 | `sec:chatlog` |
| 3.12 | `sec:agent` |
| 4.1 | `sec:res-ladder`, `sec:res-demonstration`, `sec:res-mcs`, `sec:res-mcs-functional` + the empirical half of `sec:ruler-functional` |
| 4.2 | `sec:res-intermittency`, `sec:res-margin`, `sec:res-occurrence`, `sec:res-reconciliation` |
| 4.3 | `sec:res-group`, `sec:res-weather` |
| 4.4 | `sec:res-coverage`, `sec:res-undercoverage`, `sec:res-exchangeability`, `sec:res-drift-cause`, `sec:res-native-interval`, `sec:res-winkler` |
| 4.5 | `sec:res-injection`, `sec:res-vuspr`, `sec:res-suppression`, `sec:res-costsweep`, `sec:res-chatlog` |
| 5.1 | **New**, drawing on `sec:conclusion-claims` |
| 5.2 | `sec:conclusion-divergences` + `sec:conclusion-reversal` + `sec:conclusion-adaptive` |
| 5.3 | `sec:res-pattern` + **new** |
| 5.4 | `sec:conclusion-limitations` + the status half of `sec:res-agent` + the review's admitted-omission clauses |
| 5.5 | **New.** `04_supervisor_evidence_pack.md` §1 and §2.1 hold the substance. |
| 6.1 | **New.** No objective is currently revisited anywhere. |
| 6.2 | `sec:conclusion-claims` |
| 6.3 | `sec:further-work` |
| 6.4 | `sec:conclusion-closing` |

## 2.3 Required sections that do not currently exist

1. **Abstract** — 300 words. Placeholder today.
2. **Introduction, entire** — 1,400 words. R7, R50–R56, D11, D12 all rest on it.
3. **Discussion, entire** — 2,400 words. R103–R108 and mandatory HC59.
4. **Objectives revisited** (6.1) — R109, R110, R111.
5. **Search and screening protocol** (Appendix B) — R65. `04_supervisor_evidence_pack.md`
   §3.1 already holds it; it has never been written into the dissertation.
6. **Project specification appendix** — HC54, mandatory.
7. **At least one methods figure** — R69 and the submission guidance. The methodology
   chapter currently has none.

## 2.4 Current sections with no home in the target

**Revised 2026-08-06 under the resolved scope rule.** Appendix space is free, so
anything with evidential value is demoted rather than deleted. Only three things are
now cut: template residue, and the two sections in which this dissertation withdraws
its own earlier claims.

| Section | Words | Verdict |
|---|---|---|
| `sec:res-headline` | 198 | **CUT** — withdraws this project's own earlier figure (0.386 MASE). Belongs nowhere in a final paper. |
| `sec:res-power` | 122 | **CUT** — withdraws this project's own earlier claim of 100 per cent coverage. Belongs nowhere in a final paper. |
| All template files, `declaration.tex` included (§1.0) | 158 | **CUT** — template residue. |
| Literature review, "Weather, and the temptation of exogenous data" | 358 | **MERGE**, not cut and not demoted. It is a duplicate of material retained in 2.3, so there is no surviving content to place in an appendix; the union of the two treatments is written once, inside 2.3's budget. Recorded as a third disposition because calling it a CUT would imply evidence was discarded and calling it a DEMOTE would imply an appendix gains something. |
| `sec:res-gap` | 212 | **DEMOTE** — Appendix C. Reclassified from CUT: the ingest-watermark defect and its repair are a genuine data-quality record and a reader auditing the covariate coverage will want it. One clause still surfaces in Methods 3.1. |
| `sec:repro` | 232 | **DEMOTE** — Appendix C. |
| `sec:res-paired` | 770 | **DEMOTE** — Appendix D. Two sentences of the variance-reduction result stay in 4.1. |
| `sec:res-batch` | 168 | **DEMOTE** — Appendix D. |
| Results, "What the fold count did and did not cause" | 212 | **DEMOTE** — Appendix D. One sentence stays in 4.1. |
| `sec:res-drift-cause`, windowed-pool counterfactual | ~400 (est.) | **DEMOTE** — Appendix D. The cause-identification half stays in 4.4. |
| `sec:res-pattern` | 394 | **DEMOTE to Discussion 5.3** — interpretation, not result. Inside the budget, so it displaces rather than saves. |

The wider table and procedural demotions decided under the same rule are specified in
§2.7 and costed in §4.2.

## 2.5 Sequencing

The target order is: problem → prior work and the gap → method justified by that gap →
evaluation design → results → interpretation → limitations → conclusion. Chapters 1
through 6 above follow it.

## 2.6 Where the current order breaks entailment

Seven breaks, in descending severity.

1. **There is no premise.** The Introduction is empty, so the problem, the aim and the
   research questions are never stated. Every later chapter is entailed by something
   the document does not contain. The gap appears for the first time in the literature
   review's final section; the contributions appear for the first time in the
   Conclusions. **R7 and R8 both fail on this alone**, and R8 is a threshold
   discriminator (T2).

2. **There is no interpretation.** No Discussion chapter, so results are reported and
   never read back against the research questions or the reviewed literature. The
   limitations that should qualify the results sit *after* the conclusions have been
   drawn. Mandatory HC59 has no home.

3. **A methodological ruling is reported as a result, after the results it governs.**
   `sec:res-basis` establishes that no scaled basis is defensible at Ellel and that
   `calendar_lag7_active` is adopted elsewhere. `tab:ladder`, four sections earlier,
   is on the superseded basis and its 525-word caption exists largely to say so. The
   ruling belongs in Methods (target 3.2), after which the caption is unnecessary.

4. **The literature review reports this dissertation's own findings.** Two instances:
   *"at the one genuine regime change in this estate's data adaptive calibration
   performed worse than leaving the band alone"* (`sec:rw-deviation`) and *"a
   split-conformal band on this estate's anchor venue covers below its nominal level"*.
   A review of prior work that already contains the results has no gap left to
   motivate the method.

5. **A result sits in the methods chapter.** `sec:ruler-functional` runs a two-arm
   paired experiment with pre-registered predictions and reports that two of five
   failed. That is Results.

6. **Interpretation sits at the end of Results.** `sec:res-pattern` generalises four
   withdrawn claims into a methodological rule and audits the project's own records.
   That is Discussion.

7. **Further work outweighs the conclusion.** `sec:further-work` is 904 words, 34 per
   cent of the Conclusions chapter and 1.66× Limitations, and it arrives before the
   aims have been revisited — because they never are.

## 2.7 Float placement — every table assessed

**Test, applied uniformly under the resolved scope rule:** a table earns body space
only if a reader must look up **exact values** to follow the argument. A table that
demonstrates a pattern, records a sweep, or documents a configuration does not — it
goes to an appendix, and the body carries a figure or a stated result in its place.
Three small tables are absorbed into prose outright, because two or three rows read
faster as a sentence than as a float.

### Results — sixteen tables and one figure

| Float | Size | Placement | Reason |
|---|---|---|---|
| `fig:ladder` | figure | **Body 4.1** | The chapter's only figure. Carries per-fold dispersion and confidence-set retention at once, and replaces `tab:ladder` in the body. |
| `tab:mcs` | 5×3 | **Body 4.1** | Which models are retained is the headline, and **D7 rests on it**. Exact retention per venue must be legible. |
| `tab:intermittency` | 6×6 | **Body 4.2** | The reader must read $p$ and $v$ against the two constant sets to see the reclassification. Small and load-bearing. |
| `tab:group` | 7×3 | **Body 4.3** | A null result needs its paired intervals visible or it reads as an absence of effort. |
| `tab:weather` | 7×3 | **Body 4.3** | Five arms across three venues; the mutual indistinguishability is the finding and it is only visible as a table. |
| `tab:coverage` | 6×3 | **Body 4.4** | Headline. Coverage, Clopper–Pearson interval, power and MDE per venue are all looked up. |
| `tab:exchangeability` | 6×3 | **Body 4.4** | The check that makes the finding: implied coverage against published coverage, agreeing to a thousandth. The agreement is the argument. **Two binding reporting conditions — see §2.7a.** |
| `tab:winkler` | 7×3 | **Body 4.4** | Five interval methods against the incumbent — this is the comparison-against-rejected-alternatives evidence **D7** requires. |
| `tab:vuspr` | 4×7 | **Body 4.5** | Detection headline, by event kind and venue. |
| `tab:ladder` | 4×9 | **Appendix E** | The historical committed gate on a superseded basis. See §2.8a — this is what dissolves the 525-word caption. |
| `tab:bootstrap` | 6×7 | **Appendix E** | Denominator bootstrap across four bases and two venues. It *justifies* the ruling; the ruling itself moves to Methods 3.2 and the body needs only the two interval widths that decide it. |
| `tab:recon-decomp` | 6×4 | **Appendix E** | A decomposition of two corrections against a pre-correction control run. The net coverage figures belong in 4.2; the decomposition is audit evidence. |
| `tab:native-interval` | 7×6 | **Appendix E** | Six rows of replication detail. The body needs "ordering transfers, magnitude does not" plus the Chronos-Bolt decile finding, both of which are sentences. |
| `tab:window` | 7×3 | **Appendix D** | The windowed-pool counterfactual, already demoted with its prose. |
| `tab:folds` | 4×3 | **Absorbed into prose** | Three rows whose content is one sentence: at six folds the correction factor is identically zero, so no corrected statistic exists. |
| `tab:occurrence` | 4×2 | **Absorbed into prose** | Two rows. Both arms retained in the 90 per cent set — a clause. |
| `tab:injection` | 5×3 | **Absorbed into prose** | The result is that the paired difference is exactly zero with interval $[0.0, 0.0]$ for every event kind. A table of zeros is weaker than the sentence. |

**Body floats in Results after this: one figure and eight tables**, down from one figure
and sixteen tables.

### 2.7a Binding reporting conditions on `tab:exchangeability` and Results 4.4

**Added 2026-08-06 from the audit of the two floats the numbers audit never covered
(`numbers_audit.md`, Addendum). These are binding on 8C, not advisory.** They are recorded
here rather than only in the audit ledger because both are qualifications of exactly the kind
a 2.8:1 compression flattens — each survives as a clause or not at all, and the finding is
wrong without it.

**E1 — Ellel's traded-only limb is NOT significant, and that null carries the argument.**
The exchangeability finding at Ellel is a **decomposition**, not a trend: the drift sits on
calendar-open days that did not trade (n = 1037, ρ = +0.367, p = 1.9×10⁻³⁴) and **not** on
the days it traded (n = 263, ρ = 0.094, **p = 0.129**). Report the traded-only p-value
explicitly. Dropping it leaves "Ellel's residual scale drifts", which is true, uninformative,
and not what was established. The whole of `log/74` §5 rests on the contrast.

**E2 — the two false-open limbs are not a matched pair and must not be presented as one.**
Ellel's false-open limb has **n = 1037**; the Beer Hall's has **n = 21** (ρ = −0.472,
p = 0.031). They point in opposite directions, which is tempting to write as a symmetry. It
is not one: the n differ by a factor of about fifty. State both n wherever both limbs appear,
or report only Ellel's.

### Methodology — three tables

| Float | Size | Placement | Reason |
|---|---|---|---|
| `tab:venues` | 3×4 | **Body 3.1** | R72 data description. Frame lengths and trading intensity are looked up throughout. |
| `tab:bases` | 4×6 | **Body 3.2** | The reader cannot follow the basis ruling without seeing the four candidates side by side. Moves with the ruling from Results. |
| `tab:mcs-config` | 8×2 | **Appendix C** | A pre-registered configuration record. The five values that matter — range statistic, block length 7, $B = 1000$, seed 93, $\alpha = 0.10$ — are one sentence in 3.6; the rest is provenance. |

**Methods needs at least one figure it does not have** (R69, and the submission
guidance on figures supporting the communication of method). Candidates, in preference
order: a flow diagram of the four-block fit/validation/calibration/test split, which is
the single hardest thing in the chapter to follow in prose; or a schematic of the
rolling-origin grid at a one-day step. One of these is required, not optional.

### Methods — procedural material against Appendices C and D

Demoted under the same test. All figures below are estimates **(est.)** derived from
the flagged passages in §1.2, not measured spans.

| Material | Source section | Words (est.) | Destination |
|---|---|---|---|
| TabPFN-TS attempt, abort, vendor licence and runtime cost | `sec:ladder` | 400 | **Discussion 5.5** (scope divergence) with the apparatus detail in **Appendix C** |
| Conformal refinement implementation detail and the correction record | `sec:conformal` | 250 | **Appendix C** |
| Four-block split mechanics and leakage post-mortem | `sec:intermittency` | 200 | **Appendix C** |
| Embedding-backend pinning and test apparatus | `sec:chatlog` | 120 | **Appendix C** |
| Injection seed, subsample size and event stratification | `sec:injection` | 90 | **Appendix D** |
| Occurrence test-pinning apparatus | `sec:occurrence` | 80 | **Appendix C** |
| MCS configuration prose displaced by `tab:mcs-config` | `sec:mcs` | 80 | **Appendix C** |
| **Total** | | **1,220** | |

## 2.8 Binding structural instructions

These are approved and are instructions to 8B and 8C, not observations.

### 2.8a The `sec:res-basis` relocation

**The ruling moves to Methods 3.2 in full, with its justification.** It is a
methodological decision about the instrument, taken before any accuracy figure can be
read, and reporting it in Results as though it were a finding is what forces every
downstream table to explain which ruler it is on.

**Methods 3.2, "Accuracy measures and the denominator basis", must contain, in order:**

1. The scaled-error definition, numbered — `eq:mase` and `eq:rmsse-m5` (R70, R71).
2. The four candidate denominator bases and what distinguishes them, with `tab:bases`.
3. The evidence that adjudicates between them: the denominator bootstrap, cited to
   Appendix E, with only the interval widths that decide the ruling stated in the body.
4. **The ruling.** `calendar_lag7_active` at the Beer Hall and Two River Taps; **no
   defensible scaled basis at Ellel**, which is therefore scored on unscaled mean
   absolute error. The justification is the estimand argument already written in
   `sec:ruler-ellel` — revenue in pounds is not a replenishment quantity, so
   Chatfield's cost remedy is undefined here rather than declined.
5. The functional-form decision: **RMSSE headline, MASE secondary** (D-D1, decided
   2026-08-06, `literature_conformance.md` §9), with the served model's
   median-under-a-mean's-name booked as a limitation and cross-referenced forward to
   Discussion 5.4.
6. The requirement that every scaled figure in the document carries a named basis and
   an as-of date.

**What remains in Results: nothing of the ruling.** Results 4.1 reports measured
accuracy on the ruled basis and does not re-argue the ruler. The one Results-side fact
that survives relocation is the invariance check — that recomputing the committed six
folds on the ruled basis moves magnitudes but leaves the ordering of all nine entrants
and the served model unchanged at every venue — and it goes to **Appendix E beside
`tab:ladder`**, which is the only place it is needed.

**`tab:ladder` disposition: moved to Appendix E, unregenerated.** Not replaced by a
figure and not recomputed. The present caption's own reasoning is correct and is
adopted: re-running the table at the current ceiling would replace the decision under
audit with a different decision. What was wrong was spending 525 body words saying so.
In the body, `fig:ladder` carries the per-fold loss on the ruled basis and `tab:mcs`
carries the separation; neither needs the historical gate in front of it.

**The caption problem dissolves, and this is the check that it has.** The 525-word
caption was doing four jobs. After relocation: the store-ceiling exception is one
Appendix E sentence; the basis supersession is stated once in Methods 3.2 and never
again; the recomputation-on-the-ruled-basis check is the Appendix E invariance
sentence; and "no conclusion drawn from this table depends on which basis is used"
becomes unnecessary, because the body no longer draws a conclusion from that table.
Target Appendix E caption: **one 15-word title and a body under 45 words**, and
appendix captions do not count toward HC1 in any case.

### 2.8b Removing this dissertation's own findings from Chapter 2

Specified in §2.9, which lists all thirty-eight passages individually.

## 2.9 Every literature-review passage reporting a PRJ93 result

Full sweep of `chapters/literature_review.tex`, 2026-08-06. Quotations verified verbatim
against the live file. Word counts are of the quoted span.

**Thirty-eight passages, 1,513 words** — 17.6 per cent of the chapter.

Three dispositions:

- **REMOVE** — signposting or writing-order disclosure. Deleted; nothing relocates.
- **EXCISE** — a mixed sentence in which a prior-work claim and a PRJ93 result share a
  span. The PRJ93 clause is deleted and **the prior-work claim is kept**. These are the
  dangerous ones, because a careless deletion takes a cited claim with it.
- **RELOCATE** — a whole PRJ93 report, moved to the chapter that owns it.

| # | Section | Words | Type | What it reports | Disposition |
|---|---|---|---|---|---|
| 1 | preamble | 60 | pure | The review was written after the experimental work; two divergences are marked | **REMOVE**; the writing-order disclosure relocates to Discussion 5.4 as a threat to validity |
| 2 | `sec:rw-rhythm` | 13 | pure | Chronos-2 is the model this work serves | **RELOCATE** → Methods 3.5 |
| 3 | `sec:rw-rhythm` | 20 | pure | Whether three venues suffice is "the open question this dissertation tests" | **REMOVE**; becomes a numbered research question in 1.3 |
| 4 | `sec:rw-rhythm` | 31 | mixed | This estate's size against the models' design regime | **EXCISE** — keep the design-regime claim |
| 5 | `sec:rw-rhythm` | 48 | mixed | PRJ93's weather lead policy, and that it independently agrees with a TabPFN constraint | **EXCISE** — lead policy → Methods 3.4 |
| 6 | `sec:rw-rhythm` | 27 | mixed | PRJ93's experimental-arm design | **EXCISE** — arm design → Methods 3.4 |
| 7 | `sec:rw-rhythm` | 37 | mixed | That this study forecasts venue totals | **EXCISE** — aggregation level → Methods 3.1 |
| 8 | `sec:rw-rhythm` | 16 | pure | Forward pointer: §exo measures, §res-weather reports | **REMOVE** |
| 9 | `sec:rw-rhythm` | 52 | pure | TabPFN-TS entered the ladder and was withdrawn before scoring | **RELOCATE** → Discussion 5.5 (scope divergence); apparatus to Appendix C |
| 10 | `sec:rw-rhythm` | 39 | mixed | This estate's scale against Ye et al.'s target regimes | **EXCISE** — keep the target-regime claim |
| 11 | `sec:rw-rhythm` | 20 | pure | Sampling uncertainty on this estate's $p$ is not quantified | **RELOCATE** → Discussion 5.4 |
| 12 | `sec:rw-rhythm` | 17 | pure | Forward pointer to the weather experiment and its result | **REMOVE** |
| 13 | `sec:rw-rhythm` | 19 | mixed | The distinct-scores condition fails on this data | **EXCISE** — data property → Methods 3.7 |
| 14 | `sec:rw-rhythm` | 30 | mixed | Trading-calendar holes are universal on this estate | **EXCISE** — the observation → Results 4.4 |
| 15 | `sec:rw-rhythm` | 36 | pure | The calibrated band is the adopted design | **RELOCATE** → Methods 3.7 |
| 16 | `sec:rw-ruler` | 32 | mixed | Where this estate's low-trading venue sits against $p > 2$ | **EXCISE** — keep the threshold derivation |
| 17 | `sec:rw-ruler` | 22 | mixed | A venue whose median trading day takes nothing | **EXCISE** — venue property → Methods 3.1 |
| 18 | `sec:rw-ruler` | 71 | pure | The adopted metric suite, and that one venue admits no defensible scale basis | **RELOCATE** → Methods 3.2 (this is the §2.8a ruling) |
| 19 | `sec:rw-ruler` | 89 | pure | The selection-loss decision and its rationale | **RELOCATE** → Methods 3.6 |
| 20 | `sec:rw-ruler` | 78 | pure | Median-under-a-mean's-name, and the declined remedy | **RELOCATE** → Methods 3.2 (fact) + Discussion 5.4 (limitation) |
| 21 | `sec:rw-ruler` | 47 | pure | **The ranking reversal favoured the incumbent, in a direction no cited work predicts** | **RELOCATE** → Discussion 5.2 |
| 22 | `sec:rw-deviation` | 33 | pure | CUSUM in production, BOCPD as offline benchmark | **RELOCATE** → Methods 3.8 |
| 23 | `sec:rw-deviation` | 44 | mixed | VUS-PR adopted as the best available default | **EXCISE** — adoption → Methods 3.10 |
| 24 | `sec:rw-deviation` | 36 | pure | **Adaptive calibration performed worse than the static band at the one regime change** | **RELOCATE** → Discussion 5.2 |
| 25 | `sec:rw-deviation` | 65 | pure | **The anchor venue's band covers below nominal**, with magnitude, horizon persistence and replication | **RELOCATE** → Results 4.4 |
| 26 | `sec:rw-deviation` | 34 | mixed | This work uses static bands, not the online construction | **EXCISE** — construction → Methods 3.7 |
| 27 | `sec:rw-surfacing` | 33 | mixed | The tool-use primitives are present in the existing product | **EXCISE** — keep the three cited primitives |
| 28 | `sec:rw-surfacing` | 88 | mixed | What this work's learned rhythm implements and omits | **EXCISE** — implementation → Methods 3.11/3.12 |
| 29 | `sec:rw-evaluation` | 29 | pure | The judge is used only as a bias-audited proxy | **RELOCATE** → Methods 3.12 |
| 30 | `sec:rw-evaluation` | 23 | mixed | That the loss function encodes the asymmetry | **EXCISE** — encoding → Methods 3.10 |
| 31 | `sec:rw-evaluation` | 48 | pure | The $F_\beta$ design with $\beta$ from an elicited cost ratio | **RELOCATE** → Methods 3.10 |
| 32 | `sec:rw-evaluation` | 21 | pure | ECE is not computed in this dissertation | **RELOCATE** → Discussion 5.4 |
| 33 | `sec:rw-synthesis` | 18 | pure | No methodological-novelty claim is made | **RELOCATE** → Introduction 1.4 |
| 34 | `sec:rw-synthesis` | 40 | pure | **Cross-venue pooling is tested and not adopted** | **RELOCATE** → Results 4.3 |
| 35 | `sec:rw-synthesis` | 82 | pure | Restates the functional mismatch and the declined remedy as a limitation | **RELOCATE** → Discussion 5.4 |
| 36 | `sec:rw-synthesis` | 28 | pure | Restates that ECE is not computed | **RELOCATE** → Discussion 5.4 |
| 37 | `sec:rw-synthesis` | 14 | pure | Restates the unquantified sampling uncertainty | **RELOCATE** → Discussion 5.4 |
| 38 | `sec:rw-synthesis` | 73 | mixed | Restates both contradicting observations against three cited directions | **EXCISE** — keep the three cited directions; the observations → Discussion 5.2 |

### Totals

| Disposition | Passages | Words |
|---|---|---|
| REMOVE | 4 | 113 |
| EXCISE (PRJ93 clause only; cited claim retained) | 15 | 580 |
| RELOCATE | 19 | 820 |
| **Total** | **38** | **1,513** |

By section: `sec:rw-rhythm` 14 passages / 405 words — by far the worst, and it is
already the chapter's overweight subsection; `sec:rw-ruler` 6 / 339; `sec:rw-synthesis`
6 / 255; `sec:rw-deviation` 5 / 212; `sec:rw-surfacing` 2 / 121; `sec:rw-evaluation`
4 / 121; preamble 1 / 60. **`sec:rw-framing` is clean — zero passages.**

### Three instructions this list carries

1. **The 1,513 words are not an additional saving.** They sit inside the 4,604-word
   reduction Chapter 2 already owes under §4.4. Do not add them to the §4.2 totals.
2. **Relocation is mostly deletion with a check.** Most relocated passages restate
   something the destination chapter already says — #18 against `sec:ruler`, #21
   against `sec:res-demonstration`, #24 against `sec:conclusion-adaptive`, #25 against
   `sec:res-undercoverage`, #34 against `sec:res-group`, #32 and #36 against
   `sec:conclusion-limitations`. 8C checks each against its destination and **deletes
   rather than transfers wherever the destination already carries it**. Transferring a
   duplicate spends budget twice.
3. **The fifteen EXCISE items are the ones to be careful with.** Each is a single
   sentence in which a cited claim and a PRJ93 observation are welded together. Deleting
   the sentence takes the citation with it, and the citation is load-bearing in most
   cases — #4 and #10 carry the sample-size-regime argument, #16 carries the $p > 2$
   derivation, #27 carries the three tool-use primitives, #38 carries the three
   literature directions the synthesis is built on. Split the sentence; do not delete it.

## 2.10 The gap Chapter 2 must establish from prior work alone

**Confirmed derivable.** With all thirty-eight passages removed, the gap still follows
from cited work, on seven prior-work claims:

1. `montero-manso_principles_2021` state the globality benefit as a property of *large*
   collections and give no threshold, so small-estate transfer is unevidenced on their
   own terms.
2. `das_-context_2025`, `zhou_context-driven_2025`, `liu_generative_2024` demonstrate
   in-context borrowing only on large multi-series corpora; `ansari_chronos-2_2025`
   names short histories as the condition where group attention pays and leaves group
   size open.
3. `judd_forecasting_2025` find weather insignificant for total sales with category
   effects cancelling; `schmidt_machine_2022` and `chae_value_2024` recommend weather
   without testing it; `hossain_comparative_2025` offer a season-confounded correlation.
   **Hospitality has no controlled weather test at venue-total aggregation.**
4. `angelopoulos_conformal_2023`'s two-sided bound requires almost surely distinct
   scores, which a closing-day calendar violates; `sun_conformal_2025` and
   `barber_conformal_2023` bound rather than eliminate coverage loss under regime
   change; `zaffran_adaptive_2022` show adaptivity costs efficiency when no shift comes.
5. `hewamalage_forecast_2023`, `kolassa_evaluating_2016`, `kolassa_we_2023` and
   `chatfield_all-zero_2007` establish that absolute-error measures degenerate toward
   zero forecasts on intermittent data; `harvey_testing_1997`, `hansen_model_2011`,
   `brigato_there_2025` and `hewamalage_look_2021` establish rank instability on few
   origins.
6. `lu_proactive_2024` document over-offering above 50 per cent false alarms;
   `tang_proagentbench_2026` names alert fatigue; `fu_prism_2026` gates on a calibrated
   acceptance probability and never reports that probability's calibration;
   `dixon_independence_2007`, `ancker_effects_2017` and `meyer_conceptual_2004`
   establish the asymmetric cost; `trinh_hil-bench_2026` supplies only a symmetric
   Ask-F1.
7. `fig:gap-map`: every surveyed proactive system is scored against annotated corpora,
   scripted users or an LLM judge — **none against an operator's own accept-or-dismiss
   decisions, and none in a multi-venue operational setting.**

**The gap statement Chapter 2 must reach, on those claims alone:** no prior work
evaluates a proactive intervention layer whose decisions are grounded on a calibrated
model of normality, under an asymmetric cost, in a small multi-venue operational
setting, against the operator's own decisions.

### Entailment check against Chapter 3 — holds, with one honest limit

| Gap limb | Addressed by |
|---|---|
| 1, 2 — pooling unevidenced at small $n$ | 3.5 candidate models, including the grouped in-context arms |
| 3 — no controlled hospitality weather test | 3.4, the five weather arms separated by availability lead |
| 4 — bound conditions and regime change | 3.7 conformal construction, with the distinct-scores condition tested rather than assumed |
| 5 — measure degeneracy and rank instability | 3.2 the RMSSE ruling; 3.6 the model confidence set over 273/260/205 origins |
| 6, 7 — asymmetric cost, no operator grounding | 3.10 detection protocol with $F_\beta$; 3.12 the intervention layer |

**Limbs 1–5 are closed by method and answered by result. Limb 7 is not, and Chapter 2
must not write a promise Chapter 5 cannot keep.** The operator-grounded evaluation is
built, frozen and unmeasured — D-U1, D-U4 and D-U7 in `BLOCKED_third_party.md`, blocked
on an Anthropic API key and, for the human limb, on Elliot. This is the D12 cap
identified in §5.1.

The instruction to 8B and 8C is therefore specific: **§2.10 states the gap in full,
including limb 7, and §1.4 states the contributions at graded strength so that the
unmeasured limb is visible as unmeasured from the first page.** The current
`sec:conclusion-claims` already does this correctly and is the model to follow. What
must not happen is a Chapter 2 that promises operator-grounded evaluation flatly and a
Chapter 5 that reports it as pending — that is a broken entailment a marker will find,
and it is avoidable by wording alone.

## 2.11 `declaration.tex` and the printed word count

`declaration.tex` is inherited PhD template boilerplate and is cut (§1.0, §4.2). **Its
80,000-word assertion is not a compliance item and must not be carried forward in any
form, anywhere in this spec or in the document.** The only binding word limit is HC1's
20,000, from the submission document, as decomposed in `00_marking_criteria.md`.

The one live item is `\quickwordcount{main}` in `main.tex`, which prints a
`texcount -sum -merge` figure into the compiled PDF. **Nothing on file requires a word
count to be displayed.** The submission document does not mention one, and
`00_marking_criteria.md` §1.9 lists "Whether a word-count declaration is required" among
the unverified items. The instruction is therefore: **remove `\quickwordcount{main}` and
the macro's definition**, and if the department turns out to require a declared count,
add it back as a plain number checked against `texcount` rather than as a live macro
inside inherited PhD boilerplate. Recorded in the mechanical-compliance list at §6.1.

---

# 3. NAMING

## 3.1 The rule

A heading is a **nominal phrase naming subject matter**. It is not a claim, a verdict,
a question, or a position in a narrative. Applied as eight tests:

| | Test | Rejects |
|---|---|---|
| N1 | Nominal phrase, not a clause | *"Intermittent trade is a different object"* |
| N2 | Names the subject, not the finding | *"Cross-series in-context learning does not pay at this estate"* |
| N3 | Parallel in construction with its siblings | mixed clause/phrase sets |
| N4 | No questions | *"When does borrowing across series pay?"* |
| N5 | No colon-and-flourish | *"The intervention layer: apparatus complete, measurement pending"* |
| N6 | No first person and no self-reference | *"What the work establishes"* |
| N7 | No chronology or narrative position | *"Restating the headline out-of-sample figure"*, *"what replaced it"*, *"the original gate"* |
| N8 | No evaluative or rhetorical adjectives | *"degenerate"*, *"real and lies elsewhere"*, *"cannot support"* |

The finding goes in the first sentence under the heading, where a reader can weigh it
against the evidence. A heading that states the finding asks the reader to accept it
before seeing any.

## 3.2 Rename table — literature review

| Current | Proposed | Rule |
|---|---|---|
| Decision support and the arrival of delegated autonomy | Decision support and delegated autonomy | N7 — "the arrival of" is chronology |
| Learning a venue's rhythm when the history is short | Demand periodicity under short histories | N1 — gerund clause to nominal phrase |
| When does borrowing across series pay? | Cross-series pooling and global models | N4, N2 |
| Intermittent trade is a different object | Intermittent demand | N1, N2 — a full clause asserting a verdict |
| Weather, and the temptation of exogenous data | *(merged into "Cross-series pooling and exogenous covariates")* | N8 — "temptation"; section CUT as duplicate |
| From a point to a band | Conformal prediction intervals | N2 — metaphor replaced by subject |
| Error measures and model selection on intermittent data | Error measures and model comparison | N3 — parallel with siblings |
| From a calibrated band to a deviation signal | Deviation detection from calibrated intervals | N1, N3 |
| Agents that act without being asked | Proactive agents and intervention policy | N1 — relative clause to nominal phrase |
| Judging the agent's judgement | Evaluation of agent interventions | N5, N1 — wordplay is a flourish |
| What the literature leaves open | Synthesis and research gap | N1, N6 |

## 3.3 Rename table — methodology

| Current | Proposed | Rule |
|---|---|---|
| Design of the study | Study design and data sources | N3; widened to carry R72–R76 |
| Reproducibility as a design constraint | *(Appendix C)* Computational environment | DEMOTE; N2 |
| Measuring accuracy on a series with closed days | Accuracy measures and the denominator basis | N1 — gerund to nominal |
| What the median-eliciting ruler costs | Functional form of the scaled error | N1, N2, N8 — "costs" is a verdict; "ruler" is house metaphor |
| Why Ellel is scored unscaled | Unscaled error at the sparse venue | N1 — "Why" openers are clauses |
| Classifying the demand pattern | Demand-pattern classification | N1 |
| The exogenous set, and the lead at which it is available | Exogenous covariates and availability lead | N1 — relative clause removed |
| The forecasting ladder and its gate | Candidate models and the adoption gate | N2 — "ladder" is internal vocabulary |
| Selecting among models when the series is short | Model comparison procedure | N1, N3 |
| The model confidence set | *(merged into "Model comparison procedure")* | N3 |
| Interval forecasts | Conformal interval construction | N2 — more specific |
| Detection | Deviation detection | N3 — parallel with §2.7 |
| Occurrence, and the hurdle's saturated first stage | Occurrence modelling | N1, N5 |
| Evaluating detection: the injection protocol | Detection evaluation protocol | N5, N1 |
| The knowledge-gap signal | Knowledge-gap signal | N3 |
| The intervention layer and its evaluation | Intervention layer and scoring apparatus | N3 |

## 3.4 Rename table — results

The thirty current headings consolidate into five sections. Every current heading
either becomes a subsection under the rule, folds into a sibling, or leaves the
chapter.

| Current | Proposed | Rule / disposition |
|---|---|---|
| The ladder, and what the original gate could not establish | **4.1 Forecast accuracy and model selection** → Ladder results at the committed gate | N7 — "the original gate" is chronology |
| A case where the small sample selected the wrong model | → Model ordering under increased origin counts | N2, N8 — "wrong" is a verdict |
| Which models the data cannot separate | → Model confidence sets | N1, N2 |
| What pairing buys, and why the block length is seven | *(Appendix D)* Variance reduction and block-length sensitivity | DEMOTE; N4-adjacent, N2 |
| Where the squared loss separates what the absolute loss could not | → Model ordering under squared loss | N1, N2 |
| What the fold count did and did not cause | *(Appendix D)* Fold count and store ceiling | DEMOTE; N1, N7 |
| The denominator, and where the scaled error fails | *(Methods 3.2)* Denominator basis selection | Relocated; N2 |
| Restating the headline out-of-sample figure | **CUT** | N7 |
| A reconciliation precondition, tested rather than assumed | **4.2** → Unbiasedness of the base forecasts | N7 — "rather than assumed" narrates the project |
| Demand classification under corrected constants | → Demand-pattern classification | N7 — "corrected" is repair chronology |
| A selection rule with no margin, and what replaced it | → Adoption margin | N7, N1 |
| The occurrence gate | → Occurrence gating | N3 |
| Cross-series in-context learning does not pay at this estate | **4.3** → Cross-series in-context learning | N1, N2 |
| A library property that would have inverted this result | *(Appendix D)* Batch-independence verification | DEMOTE; N2, N8 |
| Weather, and the lead at which it is available | → Weather covariates and availability lead | N1, N3 |
| A covariate gap that was an ingest defect | **CUT** | N7 |
| Interval calibration | **4.4 Interval calibration and coverage** | N3 |
| A seven-point window cannot support a miscalibration claim | **CUT** | N7, N8 |
| Measured with power, one venue under-covers | → Empirical coverage of the served band | N2, N7 |
| Naming the exchangeability violation | → Exchangeability of the conformity scores | N1, N6 |
| What moves the scale, and what a shorter memory would buy | → Sources of residual-scale drift | N1, N4-adjacent, N2 |
| A published interval finding, replicated on this estate | → Native model intervals | N7, N2 |
| No interval method displaces the incumbent on the Winkler score | → Interval methods on the Winkler score | N1, N2 |
| Detection performance is not an artefact of the injection design | **4.5** → Injection-design validity | N1, N2 |
| The detection headline, on the measure the review committed to | → Detection accuracy under VUS-PR | N7, N2 |
| The realism gap is real and lies elsewhere | → Alert suppression after refit | N1, N8 |
| The cost sweep is degenerate, and not in the direction the literature predicts | → Cost-ratio sweep | N1, N2, N8 |
| A second learning domain reaches the output | → Knowledge-gap signal | N2 |
| The intervention layer: apparatus complete, measurement pending | *(Discussion 5.4)* | N5; relocated |
| A common pattern across the studies | *(Discussion 5.3)* Validity of the approach | N2; relocated |

## 3.5 Rename table — conclusions

| Current | Proposed | Rule / disposition |
|---|---|---|
| What the work establishes | **6.2** Contributions | N1, N6 |
| Where the literature and this estate disagree | **5.2** Divergences from the reviewed literature | N1; relocated to Discussion |
| The ranking reversal moved in a direction no cited work predicts | → Directionality of the ranking reversal | N1, N2 |
| Adaptive calibration performed worse than leaving the band alone | → Adaptive against static calibration | N1, N2, N8 |
| Limitations | **5.4** Limitations and threats to validity | Relocated; name widened for R106, R107 |
| Further work | **6.3** Further work | Unchanged — already compliant |
| Closing | **6.4** Closing | Unchanged; **6.1 Objectives revisited** added before it |

## 3.6 Captions

**Rule, per the `ds-writing` §9 requirement that a caption let the float be understood
on its own.** Every caption is a **concise title of at most 15 words** identifying the
content, followed by a **caption body of at most 45 words** carrying the explanatory
material: units, basis, sample size, what is emboldened, and what must not be inferred.
Anything longer than that is prose and belongs in the body or in a footnote. Use
LaTeX's short-caption form, `\caption[<title>]{<title>. <body>}`, so the List of
Tables and List of Figures carry only the title.

Current captions total **2,145 words across 20 floats — an average of 107 words each**,
and they read as sentences. Target is **1,200 words**, an average of 60.

Four worked examples:

**`tab:ladder`** — currently **525 words**.
> **Title:** Ladder MASE by rung and venue at the committed adoption gate.
> **Body:** Six rolling origins, seven-day horizon, `calendar_lag7` denominator. Bold marks the served model; below one beats seasonal-naive. Fold means only — no dispersion is available at these settings, and the margins are not separations. Table 4.3 is the instrument for separation.

Everything else in the present caption — the store-ceiling exception, the basis
supersession, the recomputation on the ruled basis — moves to Methods 3.2, where the
ruling now lives, or to Appendix E.

**`fig:ladder`** — currently **240 words**.
> **Title:** Per-fold loss distribution by rung and venue.
> **Body:** One-day origin step, seven-day horizon. Panels carry independent axes and units and are not comparable across venues. Box is the interquartile range, rule the median, whisker the 5th–95th percentile, diamond the mean. Colour marks retention in the 90 per cent confidence set.

**`tab:coverage`** — currently **160 words**.
> **Title:** Empirical coverage of the served Mondrian band at nominal 90 per cent.
> **Body:** Clopper–Pearson 95 per cent intervals. The two-sided expected-coverage upper limb is withheld at all three venues: structural closure places an atom at score zero. Power is for an exact two-sided binomial test at $\alpha = 0.05$.

**`fig:gap-map`** — currently **147 words**.
> **Title:** Surveyed proactive systems by intervention policy and grounding of the score.
> **Body:** Columns run left to right by how directly the grounding is a person's judgement. Placements follow the citations in Section 2.8. The empty top-right cell is the gap this work occupies.

---

# 4. WORD BUDGET RECONCILIATION

## 4.1 Current against the limit

| | Words |
|---|---|
| Measured current total (body + captions + front-matter placeholder) | **37,471** |
| Limit (HC1) | 20,000 |
| **Overrun** | **17,471 (187 per cent of the limit)** |

## 4.2 Savings from CUT, MERGE and DEMOTE — recomputed 2026-08-06

Recomputed from scratch under the resolved scope rule, not adjusted from the earlier
figure. Items marked **(est.)** are estimates from flagged passages; everything else is
measured.

### Tier A — CUT, belongs nowhere in a final paper

| Item | Words |
|---|---|
| `sec:res-headline` — withdraws this project's own earlier figure | 198 |
| `sec:res-power` — withdraws this project's own earlier claim | 122 |
| Template residue: abstract placeholder 29, acknowledgements 39, appendix stub 11, two dummy table captions 3, `declaration.tex` 76 | 158 |
| **Tier A total** | **478** |

### MERGE — duplicate prose, no appendix destination

| Item | Words |
|---|---|
| Literature review, "Weather, and the temptation of exogenous data" — union written once inside 2.3 | 358 |

### Tier B — DEMOTE to appendices

| Item | Destination | Words |
|---|---|---|
| **Methods sections** | | |
| `sec:repro` | C | 232 |
| Procedural block: TabPFN apparatus, conformal refinement detail, four-block mechanics, backend pinning, injection seed and stratification, occurrence test apparatus, MCS configuration prose (§2.7) | C, D | 1,220 **(est.)** |
| **Results sections** | | |
| `sec:res-paired` | D | 770 |
| "What the fold count did and did not cause" | D | 212 |
| `sec:res-batch` | D | 168 |
| `sec:res-drift-cause`, windowed-pool counterfactual | D | 400 **(est.)** |
| `sec:res-gap` | C | 212 |
| **Results prose tied to demoted tables** | | |
| Bootstrap justification detail (`tab:bootstrap`) | E | 150 **(est.)** |
| Correction decomposition prose (`tab:recon-decomp`) | E | 250 **(est.)** |
| Per-venue replication detail (`tab:native-interval`) | E | 300 **(est.)** |
| **Captions leaving the counted total** | | |
| To appendices: `tab:ladder` 525, `tab:bootstrap` 60, `tab:recon-decomp` 55, `tab:native-interval` 50, `tab:window` 40, `tab:mcs-config` 23 | C, D, E | 753 |
| Absorbed into prose: `tab:folds` 45, `tab:occurrence` 24, `tab:injection` 70 | — | 139 |
| **Tier B total** | | **4,806** |

### Total

| | Words |
|---|---|
| CUT | 478 |
| MERGE | 358 |
| DEMOTE | 4,806 |
| **Combined savings** | **5,642** |

Against the earlier figure of 2,754, the wider demotion sweep has **roughly doubled the
savings**. `tab:ladder`'s caption alone accounts for 525 of the increase, which is the
clearest single sign that the earlier boundary was drawn in the wrong place.

`sec:res-pattern` (394) is not counted: it moves to Discussion 5.3, which is inside the
budget, so it displaces rather than saves.

## 4.3 The deficit that remains — recomputed

| | Words |
|---|---|
| Reduction required (37,471 − 20,000) | 17,471 |
| Less combined savings | −5,642 |
| Deficit after CUT, MERGE and DEMOTE | 11,829 |
| Plus new material required (Introduction 1,400, Discussion 2,400, Abstract 271) | +4,071 |
| **Deficit that must close by composition** | **15,900** |

Read the same figure the other way, as a check:

| | Words |
|---|---|
| Current body prose | 35,182 |
| Less body prose cut, merged or demoted | −4,747 |
| **Retained body prose** | **30,435** |
| Target body prose (chapters 1–6, captions and reserve excluded) | 18,600 |
| Compression of retained material | 11,835 |
| New material written from nothing | 4,071 |
| **Total composition** | **15,906** |

**The retained chapters must be written at about 61 per cent of their current length.**
That is materially better than the 45 per cent the earlier boundary implied, and the
improvement came entirely from treating appendix space as free.

**It still cannot be reached by editing.** The embedded run-log residue — the correction
narratives in `sec:intermittency`, `sec:ruler`, `sec:conformal`, `sec:res-intermittency`,
`sec:res-margin` and `sec:res-winkler`, and the ledger and trace pointers throughout —
is on the order of **4,000 words (est.)**, and it is an estimate because it was
identified from flagged passages rather than measured. Taking it in full still leaves
about 12,000 words to find. §8 specifies the method.

### Caption headroom, and what it is for

Captions were budgeted at 1,200. After the demotions, **892 caption words leave the
counted total** and about **1,250 remain to be rewritten** across thirteen body floats
— one figure and eight tables in Results, two tables plus at least one new figure in
Methods, and `fig:gap-map`. At the 15-word title plus 45-word body rule that is roughly
**780 words against a 1,200 line**.

The resulting headroom is **not to be redistributed to prose**. It exists so that Methods
can gain the figure R69 requires (§2.7) and so that Results can convert a demoted table
into a figure where a pattern reads better than values. The budget line stays at 1,200.

## 4.4 Per-chapter reconciliation

| Chapter | Current | Target | Delta |
|---|---|---|---|
| Front matter / Abstract | 144 | 300 | +156 |
| 1 Introduction | 0 | 1,400 | +1,400 |
| 2 Background and related work | 8,604 | 4,000 | −4,604 |
| 3 Methods | 9,326 | 4,200 | −5,126 |
| 4 Results | 14,580 | 5,200 | −9,380 |
| 5 Discussion | 0 | 2,400 | +2,400 |
| 6 Conclusions | 2,672 | 1,100 | −1,572 |
| Captions | 2,145 | 1,200 | −945 |
| Reserve | 0 | 200 | +200 |
| **Total** | **37,471** | **20,000** | **−17,471** |

## 4.5 Sections over budget whose content is load-bearing, and what is displaced

Where a section cannot be written to its budget without loss, the loss is named here
rather than the budget being exceeded.

**Results 4.4, Interval calibration — 1,400 against 4,275 current.** This holds three
headline findings (coverage at power, the exchangeability violation, the drift cause)
plus a replication and a five-method comparison. **Displaced:** the windowed-pool
counterfactual sweep in full (Appendix D); the implementation-correction narrative in
`sec:res-winkler`; the per-venue detail of `sec:res-native-interval`, which reduces to
the ordering-transfers/magnitude-does-not result plus the Chronos-Bolt decile finding.
What must survive at full strength is the rank statistic reproducing published coverage
to a thousandth, because that is the check that the diagnostic measures the coverage
table's own object.

**Results 4.1, Forecast accuracy and model selection — 1,400 against 3,244 current.**
**Displaced:** the whole of the pairing and block-length material to Appendix D, and
the hypothetical in `sec:res-mcs-functional` about how a trading Two River Taps would
have been handled. What must survive is the origin-count reversal and the confidence
sets, because **D7 — the explicit comparison against rejected alternatives — is the
single named reason Distinction is not met**, and these two sections are what discharge
it.

**Methods 3.3, Demand-pattern classification — 390 against 1,368 current.**
**Displaced:** the reversed-inequality defect and its repair; the superseded internal
ADI figure; the leakage post-mortem; the chronology of when the one-standard-error
margin was specified. The *fact* that the margin was pre-registered survives in one
clause, because it is what licenses the adoption rule; the *narrative* of its
specification does not.

**Background 2.3, Cross-series pooling and exogenous covariates — 700 against 2,139
current** (the borrowing subsection plus the cut weather section). **Displaced:** the
foundation-model landscape reduces to one grouped citation and the two models actually
entered; the energy-versus-hospitality weather adjudication reduces from two
overlapping treatments to one; the TabPFN withdrawal leaves the review entirely and
appears once, in Discussion 5.5, as a scope divergence.

**Discussion 5.4, Limitations — 700 against 543 current.** The one section that
**grows**. It absorbs the status half of `sec:res-agent`, the review's admitted
omissions, and R106 (biases) and R107 (assumptions), neither of which is currently
addressed as such.

---

# 5. RUBRIC MAP

The checklist 8C traces against. Criteria are from `00_marking_criteria.md`. A target
section is finished when every criterion named against it can be traced to a passage.

| Target section | Criteria it must satisfy |
|---|---|
| **Abstract** | HC4 (single paragraph), HC5 (~300 w), R41–R49. Especially **R47** (specific statistical detail) and **R49** (not an introduction). |
| **1.1** Operational forecasting in small hospitality estates | R9, R50, R51. |
| **1.2** Problem statement and knowledge gap | R52, R53, R62 (gap elicited), R63 (the gap elicited is the gap filled). |
| **1.3** Aims and research questions | **R7**, R54, R55. R7 is a threshold item — T2 makes an unanswered research question a Fail trigger. |
| **1.4** Contributions | R24, R25 (techniques and issues beyond the taught modules), D3, D8. |
| **1.5** Structure of the dissertation | **R56**. |
| **2.1–2.9** Background sections | R10, R57 (systematic review), R58 (concept-centric), R59 (critical, limitations of existing approaches), R64 (funnel), R66 (every shipped method argued for here), R67 (preprint reliance flagged), R117–R124 (source integration, no patchwork), R125 (knowledge-transforming). |
| **2.10** Synthesis and research gap | R60, R61, R62, R63, **D7** (the comparison against alternatives begins here). |
| **3.1** Study design and data sources | R72, R73, R74, R75, R85, R86, R29, R120. |
| **3.2** Accuracy measures and denominator basis | R70, R71 (numbered, unambiguous definitions), R83, R84 (alternatives rejected with reasons), R92, R93. |
| **3.3** Demand-pattern classification | R70, R71, R83, R84, R5, R6. |
| **3.4** Exogenous covariates and availability lead | R76 (feature engineering), R82 (bias introduced by the approach), R83. |
| **3.5** Candidate models and the adoption gate | R32 (models formulated), R79, R83, R84, **D7**. |
| **3.6** Model comparison procedure | R33 (hypotheses formulated), R80 (validation), R99, R100, R101, R34, R35, D3–D5. |
| **3.7** Conformal interval construction | R5, R6, R69 (pseudocode or flow diagram), R70, R71, D3, D6. |
| **3.8** Deviation detection | R69, R70, R81 (noise introduced by the approach), R83. |
| **3.9** Occurrence modelling | R70, R71, R83. |
| **3.10** Detection evaluation protocol | R34, R35, R81, R88, R89. |
| **3.11** Knowledge-gap signal | R76, R77, R78 (software and library versions), R82. |
| **3.12** Intervention layer and scoring apparatus | R80, R82, R92, R93. |
| **Methods, chapter-level** | **R68** (replicable), R77, R78, R85, R86, **HC55** (no source code), **HC56** (pseudocode preferred). |
| **4.1** Forecast accuracy and model selection | R87, R88, R89, R90, R91, R94, R95, R96, R97, R98, R99, R100, R101, R102, R36, R37, **D7**. |
| **4.2** Demand structure and reconciliation | R21, R22, R98, R102, R30, R31. |
| **4.3** Exogenous covariates and cross-series information | R98, R100, R102, R37. |
| **4.4** Interval calibration and coverage | R21, R22, R23, R99, R102, D3, D4, D5, D8. |
| **4.5** Deviation detection and downstream signals | R92, R93, R98, R102. |
| **Results, chapter-level** | R15, R16, R18, R19, R94, R95, R134, R135, R136, HC35–HC49. |
| **5.1** Answers to the research questions | **R8**, **R103**, R38, R39, R40, **D11**, **D12**. |
| **5.2** Divergences from the reviewed literature | R103, R121, R125, D8, D9. The Discussion is where the literature returns. |
| **5.3** Validity of the approach | **R104**, R23, R34, R35, D8. |
| **5.4** Limitations and threats to validity | **R105** (limitations), **R106** (biases), **R107** (assumptions and their impact), R82. |
| **5.5** Divergence from the project specification | **HC59 / R108 — mandatory.** Also HC60, HC61 if ethics applied. |
| **6.1** Objectives revisited | **R109, R110, R111**, R38, R39, R40. |
| **6.2** Contributions | R112, D12. |
| **6.3** Further work | R113, R116. |
| **6.4** Closing | R114, R115. |
| **Appendix A** Project specification | **HC54 — mandatory.** |
| **Appendix B** Search and screening protocol | **R65 — currently unmet.** |
| **Appendix C** Computational environment | R77, R78. |
| **Appendix D** Robustness checks | R34, R35, R100. |
| **Whole document** | HC1–HC3 (length), HC6–HC34 (typesetting, past tense, cross-references), HC50–HC53 (referencing), HC57, HC58 (appendix placement), R1–R4, R13, R14, R126–R133, D10, D14–D16. |

## 5.1 What this restructure does and does not move

**Moves.** R7, R8, R50–R56 (the whole Introduction group) go from unmet to reachable.
R103–R108 (the whole Discussion group) likewise, including mandatory HC59. R109–R111
become satisfiable. R65 and HC54 close with two appendices that already have their
content written elsewhere. **HC1** closes if the budget is held. **D7**, the single
named Distinction blocker, closes when Results 4.1 and 4.4 are written to carry the
confidence-set comparison, which is transcription from `log/62`, `log/63`, `log/64`
and `ledger/transcription_pack.md` rather than new work.

**Does not move.** **D12** — the research question answered *completely* — remains
capped while the intervention layer is unmeasured. That is D-U1, D-U4 and D-U7 in
`BLOCKED_third_party.md`, all blocked on an Anthropic API key, and one of them on
Elliot as well. No restructuring reaches it. The honest handling is the one the current
Conclusions already adopt: state it as a property of the circumstances, in Discussion
5.4 and 5.5, and do not let the Results chapter imply otherwise.

---

---

# 6. MECHANICAL COMPLIANCE — items this restructure creates or clears

Not the full HC1–HC70 sweep, which is still owed. These are the mechanical items that
this restructure either fixes or newly creates, and they are listed so 8C can check
them rather than rediscover them.

## 6.1 Actions

| Item | Action | Criterion |
|---|---|---|
| `\quickwordcount{main}` in `main.tex` | **Remove**, with the macro definition. Nothing on file requires a printed word count; `00_marking_criteria.md` §1.9 lists the question as unverified, and the submission document does not mention one. If the department does require a declared figure, add it as a plain number checked against `texcount`. | — |
| `declaration.tex` | **Cut.** Inherited PhD boilerplate. Replace with the department's originality declaration if one is required. **The 80,000-word assertion is not carried forward in any form.** | — |
| `lipsum` package in `main.tex` | Remove. Loaded with the comment *"just to add random text as an example"*. | HC3 |
| `inputenc` loaded twice in `main.tex` | Remove the duplicate. | — |
| Appendix chapter titled **Introduction** | Rename. It is the template default and it collides with Chapter 1 in the contents page. | R2 |
| `tables/appendix/introduction/appendix_table.tex` | Delete. Currently **compiled**, so a 2×2 grid of the digits 5–8 captioned `Caption` appears in the List of Tables. | HC38–HC40 |
| `tables/introduction/intro_table.tex` | Delete. Not compiled, and its only reference site is the empty introduction. | — |
| Project specification | **Add as Appendix A.** Mandatory and currently absent. | **HC54** |
| Search and screening protocol | **Add as Appendix B.** Content already written in `04_supervisor_evidence_pack.md` §3.1 and never transferred. | **R65** |
| Four unlabelled literature-review subsections | Add `\label`s. Nothing can currently cross-reference them. | HC34 |
| Appendix ordering | Appendices follow the References section. | HC57, HC58 |
| Methods figure | At least one required; none exists. | **R69** |
| Cross-reference sweep | Nineteen references run from Conclusions into the other three chapter files. Every relocation in §2.2 and §2.8 breaks some of them. Run a full `\ref` resolution check after each move, not once at the end. | **HC34** |
| Float renumbering | Demoting eight floats to appendices renumbers every table and figure in the body. | HC35–HC37 |

## 6.2 Word-count verification

The declared basis for HC1 is: abstract **in**, captions **in**, references **out**,
appendices **out** (see the head of this file). `texcount` does not make that split
natively, so verification is per-file: `texcount -sum -merge` over the abstract and
chapters 1–6 only, with the appendix and bibliography inputs excluded. Record the
command and its output beside the number, per the numbers-tracing rule in
`PRJ93_RULES.md`.

---

# 7. APPROVED — closed to later sessions

Approved by Phuong on **2026-08-06**. A later session may implement these but may not
reopen them. Where a later session believes an approved item is wrong, it raises the
conflict rather than revising the item silently — the corrections-are-appended rule in
`PRJ93_RULES.md` applies.

| # | Approved | Where |
|---|---|---|
| A1 | Scope of the word limit: abstract and captions count; references and appendices do not | head of file, §0 |
| A2 | The target architecture and the six-chapter section tree | §2.1 |
| A3 | The mapping of current material into the target tree | §2.2 |
| A4 | The heading naming convention N1–N8 | §3.1 |
| A5 | All four rename tables — literature review, methodology, results, conclusions | §3.2–§3.5 |
| A6 | The caption convention: 15-word title, ≤45-word body, `\caption[title]{title. body}` | §3.6 |
| A7 | The Tier A CUTs **as revised** — the two self-withdrawal sections and template residue only | §4.2 |
| A8 | The MERGE disposition of the duplicate weather section | §2.4, §4.2 |
| A9 | Every DEMOTE, including the float placements and the Methods procedural block | §2.7, §4.2 |
| A10 | The per-section word budgets | §2.1 |
| A11 | The `sec:res-basis` relocation into Methods 3.2, and `tab:ladder` to Appendix E unregenerated | §2.8a |
| A12 | Removal of all 38 PRJ93 results from Chapter 2, and the gap Chapter 2 must reach from prior work alone | §2.8b, §2.9, §2.10 |
| A13 | `declaration.tex` cut as template residue; the 80,000-word figure carried nowhere | §2.11, §6.1 |
| A14 | The composition method and the per-chapter evidence base | §8 |
| A15 | The five research questions, the aim, and the one-to-one RQ↔Results mapping | `06_research_questions.md` §1–§3 |
| A16 | Gap limb 7 scoped out of the research questions and carried as contribution C5 at graded strength | `06_research_questions.md` §4 |
| A17 | `sec:res-chatlog` reported as a specification-level deliverable, with no research question and no contribution line | `06_research_questions.md` §7.2 |

### Items reopened after approval

A closed-approvals section edited without a trail stops being useful, so a reopening is
recorded here with its authority and its reason. This is the corrections-are-appended
rule in `PRJ93_RULES.md` applied to approvals rather than to findings.

| # | Item | Was | Now | Authority | Reason |
|---|---|---|---|---|---|
| **U1** | A2 / §2.1, the purpose cell for Introduction 1.4 | "Four contributions at graded strength" | "**Five** contributions at graded strength" | Phuong, explicit unlock, 2026-08-06 | The RQ mapping yields five. C5 is gap limb 7's frozen apparatus, and folding it into another claim would conceal the thing graded strength exists to disclose. See `06_research_questions.md` §6. |
| **U2** | A2 / §2.1, the purpose cell for Discussion 5.5 | Four declared divergences | **Six**, adding the three-venue estate against the specification's four, and the NeonDB research schema not provided | Phuong, confirmed at the same gate, 2026-08-06 | 5.5 is mandatory under HC59 and its defect mode is incompleteness. Both were confirmed while verifying the estate size in the aim. The budget is unchanged at 300. See `06_research_questions.md` §9. |
| **U3** | `07_figure_programme.md` §3, float **A-F1** (Appendix B, R65) | A TikZ **PRISMA-style screening flow diagram** — records identified → screened → excluded with reasons → included | A **criteria table plus prose**. **No flow diagram is drawn.** | Phuong, explicit approval, 2026-08-06 | **Three of the four PRISMA boxes have no number and none is recoverable.** `04_supervisor_evidence_pack.md` §3.1 states it directly: *"No screened-versus-retained count exists at any stage, and it is not recoverable now"*, and *"the search was not pre-registered, and no protocol document exists"*. A flow diagram's rhetorical function is to assert that a systematic process occurred; drawing it with invented counts would place a claim the project's own evidence pack contradicts into the document's most legible form. Independently, the cited corpus contains **no PRISMA diagram either** (`07_figure_programme.md` §6), so the convention had no precedent to appeal to. R65 asks for the protocol to be *recorded*, which the table does. See `log/77`. **Two binding conditions attach — see below.** |

**Conditions on U3, binding on whoever writes Appendix B.**

1. **The non-pre-registration is declared in Appendix B itself**, not only in Discussion 5.5.
   A reader who arrives at the search protocol learns its status there. Deferring it to
   another chapter makes the appendix read as an ordinary protocol until contradicted
   elsewhere, which is the defect U3 exists to avoid rather than relocate.
2. **Terminal counts are labelled as terminal.** A bare "N sources included" beside a criteria
   table reads as the bottom of a funnel. Wherever a count appears it says that it is a
   terminal count and that no stage counts exist — otherwise the table recreates the
   implication the flow diagram was refused for.

**The budgets in A10 are fixed.** A section that cannot satisfy the rubric criteria
named against it in §5 within its budget **escalates to Phuong**. It does not exceed
the budget, and it does not quietly drop a criterion. HC1 is mechanical and costs marks
without any judgement involved; a criterion missed is a judgement call that can be
argued. The escalation exists because those two failures are not interchangeable.

---

# 8. COMPOSITION METHOD, AND THE EVIDENCE BASE PER CHAPTER

## 8.1 The method

**The remaining 15,900 words close by composing each target section to its budget from
the evidence base, not by editing the current prose down.** This is the instruction, not
a preference.

The reason is arithmetic. Retained material must reach 61 per cent of its current
length while simultaneously changing what it argues — Chapter 2 loses its own results,
Methods gains the basis ruling, Results loses eight tables and two-thirds of its
headings. Editing preserves the sentence structure of a draft written to a different
plan, and a sentence written to carry three clauses does not become a sentence carrying
one by deletion. Composition from the evidence produces prose sized to the budget from
the start.

The current chapters remain useful throughout, and not as a source to trim. They are
the record of the reasoning — which alternatives were rejected and why, which
objections were anticipated. **Read them for the argument, compose from the evidence
for the words.** Where a justification exists only in the current prose and nowhere in
the evidence base, it must be carried across deliberately; §8.3 flags where that risk
is concentrated.

## 8.2 Evidence base per chapter

| Target | Primary evidence | Secondary |
|---|---|---|
| **Abstract** | Composed last, from the finished chapters | — |
| **Ch 1 Introduction** | `docs/PRJ93.md` (project specification: aims and objectives); `04_supervisor_evidence_pack.md` §1 | `sec:rw-synthesis` for the gap; `sec:conclusion-claims` for the contributions |
| **Ch 2 Background** | `knowledge/05_litreview_verdicts.md` (63 extracted verdicts, 12-row contradictions register); `ledger/litreview_critique.md` (36 findings, 27 blocking, five revisions); `ledger/litreview_corpus_judgement.md` | `ledger/citation_audit.md`, `ledger/citation_fixes.md`, `04_supervisor_evidence_pack.md` §3 |
| **Ch 3 Methods** | Current `methodology.tex` (the reasoning record); `ledger/code_vs_paper.md`; `ledger/literature_conformance.md` §9–§13 (all five defensible divergences decided) | `ledger/prereg_adoption_margin_2026-08-01.md`; `log/53`, `log/55`, `log/56`, `log/66`, `log/67`, `log/69`, `log/70` |
| **Ch 4 Results** | `log/60`–`log/75` (sixteen paired result files); `ledger/transcription_pack.md` (the writing-only rows with their numbers already in them) | `ledger/numbers_audit.md`, `ledger/numbers_audit_resolutions.md`, and the ~30 per-script `.md`/`.json` artefacts beside the code — **primary over the `log/NN_*.md` syntheses on any disagreement** |
| **Ch 5 Discussion** | `ledger/literature_conformance.md` §8 (the four-link empirical chain R6 completed, which that file explicitly says belongs in the Discussion), §14–§17; `ledger/defensible_divergences_writeup_pack.md` | `ledger/BLOCKED_third_party.md` for what is blocked and on whom; `04_supervisor_evidence_pack.md` §1 and §2.1 for HC59 |
| **Ch 6 Conclusions** | Current `conclusion.tex`; `docs/PRJ93.md` for the objectives to be revisited | `ledger/BLOCKED_third_party.md` §E for Further Work |

## 8.3 Chapters flagged thin, or at risk of losing reasoning

Three flags. The first two are thin evidence; the third is the opposite problem and is
the more dangerous of the two kinds.

**Chapter 1, Introduction — THIN. 1,400 words with almost no evidence base.**
Nothing anywhere in `brain/` drafts an introduction. The aims and objectives exist only
in `docs/PRJ93.md`; the gap exists only as `sec:rw-synthesis`, which is a synthesis of
the review rather than a statement of the problem; the contributions exist only as
`sec:conclusion-claims`, written to close the document rather than open it. **The
research questions are not stated in numbered form anywhere in the project.** 8C should
expect to derive them, put them to Phuong, and only then write §1.3 — because R8
requires that the questions stated here are the ones answered in Chapter 5, and that
entailment cannot be checked against questions that do not yet exist in a fixed form.

**Chapter 6 §6.1, Objectives revisited — THIN.** No objective is revisited anywhere in
the repository. The objectives are in `docs/PRJ93.md` and the achieved/not-achieved
judgement has to be composed against `BLOCKED_third_party.md`, which is the only file
that states plainly what was not reached and why. R109–R111 rest entirely on this.

**Chapters 2 and 3 — REASONING LOSS RISK, not thinness.** Their evidence bases are
rich, but the evidence records *verdicts and numbers*, not *argument*. Two specific
concentrations:

- `05_litreview_verdicts.md` holds 63 extracted verdicts. It does not hold the four
  load-bearing arguments Chapter 2 makes — the globality-as-estimation-budget reading,
  the energy-versus-hospitality weather adjudication, the median-versus-mean functional
  argument, and the false-alarm asymmetry. Those exist **only in the current
  `literature_review.tex` prose**, which took five revision rounds and 27 blocking
  findings to reach. Composing Chapter 2 from the verdicts alone would rebuild the
  citations and lose the reasoning.
- The same holds for Methods' rejected alternatives. **R83 and R84 require that every
  decision be justified and every rejected alternative be given its reason**, and D7 —
  the single named Distinction blocker — is precisely the discussion of why the
  approach beats the alternatives. Several of those reasons appear nowhere but in the
  current `methodology.tex`: the estimand argument for scoring Ellel unscaled, the
  reason the SBA rule is vacuous over this trigger set, the reason CUSUM's textbook
  constants are not transplantable into a conformal-half-width unit.

**Instruction for 8C on both.** Before composing Chapter 2 or Chapter 3, extract the
argument skeleton from the current prose — claim, warrant, rejected alternative and its
reason — into a working note, and compose against that note plus the evidence. Do not
compose against the evidence alone. This is the one place where the current draft is
irreplaceable, and it is irreplaceable precisely in the material that carries D7.

**Chapter 5 §5.5, scope divergence — MODERATE.** Mandatory under HC59, and its substance
exists only in `04_supervisor_evidence_pack.md` §1 and §2.1. That is enough to write
300 words, but it is a single source and it was written for a supervisor briefing
rather than for a dissertation, so it needs checking against `docs/PRJ93.md` before it
is used.
