# Marking criteria — checkable requirements

Every line below is phrased so a later session can mark it **PASS** or **FAIL**
by inspecting the dissertation. No criteria are merged; one line, one check.

Sources: `docs/Student Documentation - MSc DS - Dissertation Submission.md`
(MSc Data Science and AI Dissertation Writing and Marking Guidelines 2025/26)
and `docs/DataSciDissWriting June2026final.md` (writing workshop).

**Module code caveat.** The guidance names module **DS591** throughout, not
PRJ93. Confirm it applies before relying on the submission mechanics (HC39–HC45).

**Rubric shape.** Appendix B ("MSc Data Science Marking Guide") is **holistic
band descriptors out of 100 with NO per-category weightings**. Bands verbatim:
0-19 Fail, 20-39 Fail, 40-49 Fail, 50-59 Pass, 60-69 Good Pass, 70-79
Distinction, 80-100 Outstanding Distinction. Closing caveat: *"It is recognised
that the balance amongst the above criteria may vary according to the nature of
each dissertation topic."*

---

# Part 1 — Hard mechanical constraints

These lose marks without any judgement involved. Check them last, before
submission, and check every one.

## 1.1 Length

- **HC1.** Total dissertation is ≤ 20,000 words ("must not exceed 20,000 words").
- **HC2.** The report is not unstructured or overly verbose — such reports "will be penalised rather than rewarded".
- **HC3.** The report is not padded with irrelevant content.

### The scope of the 20,000, and the working target — RULED 2026-08-09 by Phuong

**This resolves four of the §1.9 unknowns and supersedes every earlier statement in this
project on what the limit counts.**

| Question | Ruling |
|---|---|
| Bibliography | **EXCLUDED** |
| Appendices | **EXCLUDED** |
| Abstract | **INCLUDED** — the counted body is the abstract plus Chapters 1–6 |
| Is 20,000 a target or a cap? | **A cap, with a penalty** |

**`declaration.tex` is not evidence about any of this.** Its "including appendices and
footnotes" wording is **inherited template residue**, the same class as the issued-template
abstract and the acknowledgements placeholder, and it was carrying a false compliance claim
into the compiled PDF. It has been rewritten to the ruled terms; it is not binding and must
not be quoted back as a source.

**The working target is 15,000 body words. 18,000 is the upper bound of what reads
acceptably.** This is not a rule and it governs anyway, because a lengthy dissertation costs
marks through the marker's judgement well inside the cap.

**That judgement is documented, not merely inferred.** The submission documentation states it
directly: *"The dissertation must not exceed 20,000 words. Note that this is **an upper limit**
and that competence in producing a succinct and coherent report is essential. Reports that are
unstructured, **overly verbose** and contain irrelevant content **will be penalised rather than
rewarded**."*

**So the reduction pass is enforced by HC2 and HC3, not by HC1.** HC1 is satisfied at 19,999 and
HC2 is not. Any ruling that trades length against content must name which of the three it is
answering to, because they are not the same requirement and 20,000 discharges only the first.

**Measurement.** The counted population is `chapters/*.tex` plus `abstract.tex`. Two instruments
measure it and they disagree by ~970; see §1.1a.
- **HC4.** The abstract is a single paragraph.
- **HC5.** The abstract is approximately 300 words.

## 1.1a The two word-count instruments, reconciled — 2026-08-09

They disagree by **~970 on the same body**, and the cause is now measured rather than assumed.

| | `texcount` | `wordcount.py` |
|---|---|---|
| Chapters + abstract | **28,750** | **27,779** |
| Captions | counted | **excluded** (floats are stripped whole) |
| Heading words | all levels counted | only `\section` names subtracted, so subsection headings are counted |
| `\ref{...}` | counted as **0** | the key is left as **1 word** |
| Inline math | 1 per formula | 1 per formula (`MATHTOKEN`) |

**Decomposition, per file, texcount minus marker:** Ch1 +4 · Ch2 +73 · Ch3 +117 · Ch4 **+791** ·
Ch5 −1 · Ch6 −34 · abstract +21. **Captions are the dominant term — 872 words, of which 771 are
in Results alone.** The negative cells at Chapters 5 and 6 are the `\ref` effect running the other
way: those two carry 71 references between them and no captions.

**`texcount` is authoritative for any number that governs a decision.** Three reasons, and the
third is the deciding one:

1. It is the counter Overleaf reports and the one the submission convention assumes.
2. It counts captions, which a marker reads and which are 872 words of this document.
3. Phuong's ruling: *"the number that governs must be the one a marker's count resembles."* A
   marker reads captions and does not read `\ref` keys, so on both of the two material
   differences texcount is the closer model of the page.

**`wordcount.py` remains the working instrument** for pricing an edit and for per-section
budgets, because texcount has no section granularity, no budget column and no artefact column.
Use it to compare two revisions, where its systematic offsets cancel — which is what its own
docstring already says.

**Consequence for the target, and it is not cosmetic.** Against the 15,000 target the gap is
**13,750 on the governing instrument**, not the 12,779 the marker figure implies. Any plan costed
in marker words understates what it has to find by about a thousand. **Captions are inside the
counted population, so compressing a caption or relocating a float to an appendix reduces the
governing number — a lever the marker instrument cannot even see.**

## 1.2 Typesetting and format

- **HC6.** The report is word-processed, not handwritten.
- **HC7.** LaTeX is used, given the report contains mathematical formulae (preferred, not mandated).
- **HC8.** Body font size is 12pt.
- **HC9.** Font style and size are consistent throughout each chapter.
- **HC10.** Margins are standard.
- **HC11.** Page size is A4.
- **HC12.** Body text is justified to the left-hand margin.
- **HC13.** Headings are justified to the left-hand margin.
- **HC14.** Subsections are not indented further than their enclosing sections.
- **HC15.** Paragraph formatting is consistent throughout.
- **HC16.** Full justification (both edges) is used in preference to ragged right.
- **HC17.** If first-line indentation is used, it is used consistently.
- **HC18.** Bold and underlining are never used together on the same text.
- **HC19.** Every page is numbered.
- **HC20.** The title is large, bold and centred.
- **HC21.** Main chapter headings are large, bold and centred.
- **HC22.** First-level subsection titles are bold.
- **HC23.** First-level subsection titles are in a font size slightly larger than body text.
- **HC24.** Lower-level subsection titles are in a smaller font than first-level ones.
- **HC25.** Lower-level subsection titles are bold and/or italic.
- **HC26.** Every chapter carries a heading of the form "Chapter 1. Introduction".
- **HC27.** Each chapter starts on a new page.
- **HC28.** Sections do not start on a new page unless necessary.
- **HC29.** Subsections are numbered x.1, x.2 …
- **HC30.** Sub-subsections are numbered x.1.1, x.1.2 …
- **HC31.** Section nesting is no deeper than three levels.
- **HC32.** The report is written in the past tense throughout.
- **HC33.** Spelling has been checked; there are no spelling errors.
- **HC34.** Every cross-reference resolves (no broken refs, no "??").

## 1.3 Figures and tables

- **HC35.** Figures are numbered Figure x.1, x.2 … where x is the chapter number.
- **HC36.** Tables are numbered Table x.1, x.2 … where x is the chapter number.
- **HC37.** Table numbering runs independently of figure numbering.
- **HC38.** Every figure has a caption.
- **HC39.** Every table has a caption.
- **HC40.** Caption style is consistent throughout.
- **HC41.** Caption positioning is consistent throughout.
- **HC42.** Every figure is referred to in the body text.
- **HC43.** Every table is referred to in the body text.
- **HC44.** Each figure is positioned close to where it is first referenced.
- **HC45.** Each table is positioned close to where it is first referenced.
- **HC46.** References to figures/tables are grammatical ("as shown in Figure 3.1" / "(see Figure 3.1)"), leaving no sentence broken by the reference.
- **HC47.** Tables are created by the author, not copied from computer/software output.
- **HC48.** Items labelled as figures are predominantly pictorial or diagrammatic.
- **HC49.** Items labelled as tables are predominantly textual and/or numerical.

## 1.4 Referencing

- **HC50.** A recognised referencing format is used (Harvard or Numbering are the stated examples).
- **HC51.** The chosen referencing format is applied consistently throughout, with no mixed styles.
- **HC52.** A bibliography is present.
- **HC53.** Every method based on someone else's work is referenced.

## 1.5 Appendices and source code

- **HC54.** The project specification prepared at the start of the project period is included as an appendix.
- **HC55.** The Methods chapter contains no source code, except possibly very small portions solving a particularly interesting or difficult problem.
- **HC56.** Where algorithmic detail is needed in Methods, pseudocode is used in preference to code.
- **HC57.** Appendices are placed after the References section.
- **HC58.** References and appendices both follow the Conclusions chapter.

## 1.6 Mandatory content

- **HC59.** Any significant difference between the project specification's scope and the project as performed is explained in the Discussion. (Divergence itself is explicitly NOT penalised when accounted for; failing to account for it is.)
- **HC60.** Ethics approval is included if the project needed it.
- **HC61.** Ethics considerations are discussed if the project needed them.

## 1.7 Submission mechanics

- **HC62.** The dissertation is submitted as a single PDF file.
- **HC63.** The dissertation is submitted via the DS591 Moodle.
- **HC64.** The dissertation is submitted by Friday 4 September 2026 at 16:00 (absent an approved extension).
- **HC65.** A draft was submitted to the supervisor as early as possible for feedback.

## 1.8 Associated required deliverables

- **HC66.** The dissertation viva is arranged with both markers.
- **HC67.** The viva is held, normally within 2–3 weeks of submission (may be remote).
- **HC68.** A poster is prepared.
- **HC69.** The Poster Conference on 11 September 2026 (Infolab; boards from 11:00, conference 12:30–14:30) is attended.
- **HC70.** The poster is printed in A1 Landscape format — "no other formats will be accepted".

## 1.9 NOT SPECIFIED in these documents — resolve elsewhere

Each of these is a plausible mechanical constraint that the two source
documents do **not** state. Do not invent a rule; check the module handbook,
Moodle, or the supervisor. Listed so a later session knows these are unverified
rather than absent.

- ~~Whether the 20,000-word limit includes or excludes the abstract.~~ **RESOLVED 2026-08-09: INCLUDED. See §1.1.**
- ~~Whether the limit includes or excludes references/bibliography.~~ **RESOLVED 2026-08-09: EXCLUDED. See §1.1.**
- ~~Whether the limit includes or excludes appendices.~~ **RESOLVED 2026-08-09: EXCLUDED. See §1.1.**
- Whether the limit includes or excludes figure captions and table contents. **STILL OPEN, and it is now worth 872 words** — see §1.1a. The governing instrument (`texcount`) counts them, so they are treated as **INCLUDED** by default, which is the conservative reading. If they turn out to be excluded, the body is 872 lighter than reported and Results alone drops 771.
- Whether a word-count declaration is required. **STILL OPEN.** Nothing in the issued documentation requires one. The dissertation carries one anyway, correctly scoped, because §1.1's HC2 makes length an assessed quality rather than a mere cap.
- Whether any page limit applies.
- Required contents of the title page (name, student ID, degree, department, date, supervisor).
- Whether a declaration of originality / plagiarism statement is required, and its wording.
- Whether Turnitin submission or a similarity report is required.
- Whether an AI/LLM use declaration is required.
- The required font family (only the 12pt size is specified).
- Exact margin measurements ("standard margins" only).
- Required line spacing.
- Whether a Table of Contents is mandatory.
- Whether a List of Figures / List of Tables is mandatory.
- Whether Acknowledgements are mandatory.
- Whether code or data must be submitted separately (repository, ZIP).
- The late-penalty scale and the extension procedure.
- The required format for ethics documentation (approval reference, form as appendix).
- Any cap on appendix length.
- Per-criterion marking weightings (the guide is holistic bands, not weighted components).

---

# Part 2 — Rubric decomposed

## 2.1 Structure and logic (required from the 40-49 band upward)

- **R1.** The document has an explicit chapter structure.
- **R2.** The chapter order is logical and traceable from the contents page.
- **R3.** There are no major omissions in the pipeline the project claims to follow.
- **R4.** There are no blatantly obvious major mistakes in the methodology as described.

## 2.2 MSc-level techniques

- **R5.** At least one computational or statistical technique at MSc level is applied.
- **R6.** Evidence of understanding accompanies each technique — the text explains why it is appropriate, not only how it was run.

## 2.3 Research question

- **R7.** A research question (or questions) is explicitly stated in the Introduction.
- **R8.** Each stated research question is explicitly answered by the end of the document.

## 2.4 Pass band (50-59) — "coherent and structured account"

- **R9.** The topic is clearly motivated.
- **R10.** Appropriate background material is provided.
- **R11.** The computational techniques used are appropriate to the research question.
- **R12.** The statistical techniques used are appropriate to the research question.
- **R13.** The account is largely correct — no factual errors in the technical exposition.
- **R14.** The account is largely correct — no mathematical errors in the technical exposition.
- **R15.** Relevant figures are present.
- **R16.** Relevant tables are present.
- **R17.** A bibliography is present.
- **R18.** Each figure is articulated in the text to illustrate the argument that addresses the research question, not merely displayed.
- **R19.** Each table is articulated in the text to illustrate the argument that addresses the research question, not merely displayed.
- **R20.** The bibliography is articulated to the argument (sources are used, not just listed).
- **R21.** Techniques are applied correctly.
- **R22.** Technique outputs are interpreted correctly — interpretation, not just reporting.
- **R23.** The concepts behind the techniques are demonstrably understood.

## 2.5 Good Pass band (60-69) — additive to the Pass band

- **R24.** Some use of techniques beyond those covered in the MSc modules studied by the student is evident.
- **R25.** Some understanding of issues beyond those covered in the MSc modules studied is evident.
- **R26.** Good conceptual understanding is demonstrated.
- **R27.** Good mathematical understanding is demonstrated.
- **R28.** The account flows logically — each chapter connects to the next.
- **R29.** Data collection / sourcing / integration is described.
- **R30.** Exploratory data analysis is present.
- **R31.** The exploratory data analysis leads to the formulation of models or hypotheses.
- **R32.** Models for testing are explicitly formulated.
- **R33.** Hypotheses for testing are explicitly formulated.
- **R34.** The experimental setup is defended, not merely described.
- **R35.** The procedures followed are defended.
- **R36.** Model fit is assessed.
- **R37.** Predictive capacity is assessed.
- **R38.** The Conclusion demonstrates that the methodology addressed the research question.
- **R39.** The Conclusion demonstrates that the methodology answered the research question.
- **R40.** That demonstration is competent, convincing and well-reasoned.

## 2.6 Title and abstract

- **R41.** The title succinctly describes the subject matter.
- **R42.** The title uses descriptive words strongly associated with the content.
- **R43.** The abstract states the research question(s) / aims.
- **R44.** The abstract states the design and analytical methods used.
- **R45.** The abstract states the major findings in the context of the aims.
- **R46.** The abstract states the conclusions.
- **R47.** The abstract's results sentences carry specific statistical detail, not vague claims.
- **R48.** The abstract stands alone — comprehensible without reading the report.
- **R49.** The abstract does not act as an introduction ("common mistake!").

## 2.7 Introduction

- **R50.** The Introduction gives a contextual overview.
- **R51.** That contextual overview is supported with references.
- **R52.** The Introduction states why the project is worthwhile / names the current knowledge gap.
- **R53.** The Introduction states how the project may be beneficial to others.
- **R54.** The Introduction clearly states the aims of the project.
- **R55.** Those aims are informed by the project proposal.
- **R56.** The Introduction ends with a brief chapter-by-chapter overview of the report's structure.

## 2.8 Background / Related Work

- **R57.** The chapter is structured as a systematic review.
- **R58.** The chapter uses a concept-centric structure (not chronological or author-by-author).
- **R59.** The writing is critical — it highlights limitations of existing approaches.
- **R60.** The chapter details how this work differs from those existing approaches.
- **R61.** The chapter details how this work overcomes the limitations it identifies.
- **R62.** The chapter elicits the gap that the method fills.
- **R63.** The gap elicited is the same gap the method actually fills.
- **R64.** The literature review narrows via the funnel model — general context, then summarised relevant work, then critically examined directly relevant work. (Recommended, not mandated.)
- **R65.** A search protocol is stated (databases, query strings, inclusion/exclusion criteria, screened-vs-retained counts).
- **R66.** Every method that actually ships in the built system is argued for in this chapter.
- **R67.** Reliance on unrefereed preprints is flagged where load-bearing claims rest on them.

## 2.9 Methods

- **R68.** Methods contain sufficient detail for a reader to replicate the work.
- **R69.** Pseudocode and/or flow diagrams are provided where algorithms are described.
- **R70.** Model definitions are unambiguous.
- **R71.** Model definitions are numbered.
- **R72.** Methods detail data sourcing.
- **R73.** Methods detail data cleaning.
- **R74.** Methods detail outlier removal.
- **R75.** Methods detail data integration.
- **R76.** Methods detail feature engineering.
- **R77.** Methods state the precise software used.
- **R78.** Methods state the precise libraries and versions used.
- **R79.** Methods state how models were applied/fitted.
- **R80.** Methods state how models were validated.
- **R81.** Methods reflect on whether noise could have been introduced by the approach.
- **R82.** Methods reflect on whether bias could have been introduced by the approach (e.g. third-party tool accuracy, inherent data limitations).
- **R83.** Methods justify why each decision was made.
- **R84.** Methods justify why the alternatives considered were rejected.
- **R85.** Methods components are clearly separated (data/source, EDA, theory/notation, models, estimation framework, validation).
- **R86.** Methods opens with a brief introduction restating purpose, materials background, and the aim/problem.

## 2.10 Results

- **R87.** Results explain the procedures followed.
- **R88.** Results state the experimental settings.
- **R89.** Results state how many data items were used.
- **R90.** Results state the model properties.
- **R91.** Results state how those properties were set (e.g. hyper-parameter tuning).
- **R92.** Results state which evaluation measures were used.
- **R93.** Results state why those evaluation measures were chosen.
- **R94.** Results include graphical information.
- **R95.** Results include tabular information.
- **R96.** Every figure in Results has a textual summary of the finding it carries.
- **R97.** Every table in Results has a textual summary of the finding it carries.
- **R98.** The key features of the results are brought out explicitly.
- **R99.** Suitable statistical methods are applied to compare model performance.
- **R100.** Suitable statistical methods are applied to contrast the different approaches tried.
- **R101.** The statistical methods used for comparison are the ones detailed in Methods.
- **R102.** Results state what the findings imply for the research question(s).

## 2.11 Discussion

- **R103.** The Discussion answers what the results reveal in relation to the research question(s).
- **R104.** The Discussion argues whether the approach is valid, and why.
- **R105.** The Discussion states the inherent limitations of the work.
- **R106.** The Discussion states the potential biases in the work.
- **R107.** The Discussion explains how the underpinning assumptions may have impacted the findings.
- **R108.** The Discussion explains any significant scope divergence from the project specification. (Also HC59.)

## 2.12 Conclusions

- **R109.** The Conclusions revisit the general aim.
- **R110.** The Conclusions revisit each individual objective.
- **R111.** The Conclusions state whether each objective was achieved.
- **R112.** The Conclusions discuss the project as a whole.
- **R113.** The Conclusions state what would be done differently if the project were repeated.
- **R114.** The Conclusions state what had to be learned in order to do the project.
- **R115.** The Conclusions state what was learned from doing the project.
- **R116.** The Conclusions state how the methodology would be modified if the project were repeated.

## 2.13 Source integration and criticality

- **R117.** Sources are used concisely; the student's own thinking is not crowded out by presentation of others'.
- **R118.** Paraphrase and summary dominate over direct quotation.
- **R119.** The reader is never in doubt as to when the author is speaking and when source material is being used.
- **R120.** Every data source is identified clearly enough to be verified.
- **R121.** Every source introduced is explicitly related to the argument — no quotation or paraphrase is inserted without stating its use.
- **R122.** Each engagement with the literature begins in the author's own voice.
- **R123.** Each engagement with the literature ends in the author's own voice, with commentary on that writer's contribution.
- **R124.** There is no patchwork writing (strings of disconnected paraphrases).
- **R125.** The writing is knowledge-transforming, not knowledge-telling — it states why and how each point is or is not relevant to the research question.
- **R126.** Higher-order concerns are addressed: the argument is coherent.
- **R127.** Higher-order concerns are addressed: hypotheses are clear.
- **R128.** Higher-order concerns are addressed: sections connect, with transitions.
- **R129.** Lower-order concerns are clean: grammar and sentence structure.
- **R130.** Lower-order concerns are clean: citation rules and punctuation.
- **R131.** Lower-order concerns are clean: word choice and technical style.
- **R132.** There is no repetitive writing.
- **R133.** There are no repeated structural or sentence stems.
- **R134.** Every figure is integrated into the text with an explanation of how it relates to the research aims.
- **R135.** Every figure is integrated into the text with an explanation of why it relates to the research aims.
- **R136.** Every figure has a good, informative legend.

---

# Part 3 — Distinction and Outstanding Distinction

## 3.1 Distinction (70-79)

Band descriptor verbatim: *"As for a Good Pass. In addition, the student should
demonstrate a conceptual understanding and proficiency computationally or
statistically of either: a) An appropriate substantial body of methodology
beyond that of the MSc modules studied, or b) An appropriate methodology for
the problem from the MSc modules studied, but in addition demonstrating deep
understanding of the relationship between the methods used and the subject
matter. This should include a discussion of why the approach taken is better
than alternatives that could have been used. A distinction would normally
demonstrate a high level of insight, understanding and clarity, and the
research question should be answered logically and completely."*

- **D1.** All Good Pass requirements (R24–R40) are met.
- **D2.** Route (a) OR route (b) below is satisfied.
- **D3.** Route (a): a substantial body of methodology beyond the MSc modules studied is used.
- **D4.** Route (a): conceptual understanding of that methodology is demonstrated.
- **D5.** Route (a): computational or statistical proficiency in that methodology is demonstrated.
- **D6.** Route (b): an appropriate in-module methodology is used, with deep understanding of the relationship between the methods used and the subject matter.
- **D7.** There is an explicit discussion of why the approach taken is better than alternatives that could have been used. *(Named and separable — a dissertation with no stated comparison against rejected alternatives cannot reach this band, whichever route is taken.)*
- **D8.** The document demonstrates a high level of insight.
- **D9.** The document demonstrates a high level of understanding.
- **D10.** The document demonstrates a high level of clarity.
- **D11.** The research question is answered logically.
- **D12.** The research question is answered completely (stronger than 40-49's "sufficiently well" and 60-69's "addressed and answered").

## 3.2 Outstanding Distinction (80-100)

Band descriptor verbatim: *"As for a Distinction. However, the writing in the
report must be of publishable quality (i.e. clear, unambiguous and with good
style) and the work itself should be publishable, with little modification
other than making it more concise, in a reputable journal."*

- **D13.** All Distinction requirements (D1–D12) are met.
- **D14.** The writing is clear.
- **D15.** The writing is unambiguous.
- **D16.** The writing has good style.
- **D17.** The work would be publishable in a reputable journal with little modification other than making it more concise.

## 3.3 Threshold discriminators (for calibration, not checklist items)

- **T1.** 40-49 (Fail) is triggered when no MSc-level techniques have been used, or they are used with little evidence of understanding.
- **T2.** 40-49 (Fail) is also triggered when the research question has not been answered sufficiently well.
- **T3.** 50-59 rather than 60-69 results when the work lacks techniques/issues beyond the modules studied, good conceptual or mathematical understanding, full pipeline completeness, or a competent well-reasoned conclusion tying methodology to the research question.

---

# Part 4 — Structure template

Appendix A is explicitly a **"Suggested Report Structure"** — *"the structure
may vary depending on the specific project type and aims… You should discuss a
suitable report structure for your specific project with your supervisor."*
The chapter set is therefore RECOMMENDED; the formatting rules (Part 1) and the
project-specification appendix (HC54) are MANDATORY.

1. **Title** — recommended as a named element, mandatory in practice.
2. **Abstract** — recommended. One paragraph: aims → design/methods → major findings in context → conclusions. Workshop feature list: background 1–2 sentences, aim 1, method/design 2–3, results 2–4 with specific statistical detail, conclusion 1–2. Order and length may be rearranged to suit the study.
3. **Chapter 1. Introduction** — recommended.
4. **Chapter 2. Background / Related Work** — recommended.
5. **Chapter 3. Methods** — recommended; may be split across several chapters or sections. Suggested internal split for data-analytic projects: data & data source → exploratory data analysis → theory/notation → models investigated → estimation framework → validation.
6. **Chapter 4. Results** — recommended.
7. **Chapter 5. Discussion** — recommended as a chapter; its scope-divergence content (HC59) is mandatory wherever it sits.
8. **Chapter 6. Conclusions** — recommended. *"This will be your final chapter (references and appendices will follow this)."*
9. **References / Bibliography** — mandatory (named in the 50-59 Pass descriptor). Follows Conclusions.
10. **Appendices** — follow References. The project-specification appendix is mandatory; others optional.

**Alternative structures the guidance names.** System-design/computing projects
"should explain the construct of the system and its components". Data-analytic
projects "should focus upon the data sourcing, the inherent data structure,
data exploration and visualisation, the model formulation and model evaluation;
in line with the phases shaping the data science pipeline". The workshop's
SciTech narrative arc, applicable across variants: **Situation** (introduction /
background / context) → **Problem** (gap in knowledge; the DS/AI research
question) → **Solution(s)** (modelling and analyses, design and/or experimental
studies) → **Evaluation** (how well the solution addresses the research
question; comparison with existing solutions; next steps).

**Observed, NOT prescribed.** A worked example in the workshop showed
Introduction 4–5pp, Related work 2–4pp, Methods 5pp, Results 2pp, Conclusion
1pp, References 1–2pp, Appendix 10pp. This is an observed example only — the
guidance states explicitly that "there is no word count for each section", and
section balance should be agreed with the supervisor.
