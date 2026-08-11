# Criteria provenance audit — `00_marking_criteria.md` against its own source

**Run 2026-08-12. READ-ONLY: nothing in `00_marking_criteria.md`, no ledger row and no document
file was changed by this pass. Every correction below is a PROPOSAL for Phuong to rule on.**

**Scope of the check, stated so a clean result is not read wider than it is.** Two sources were
read **end to end**: `docs/Student Documentation - MSc DS - Dissertation Submission.md` (305 lines,
the **issued requirements**) and `docs/DataSciDissWriting June2026final.md` (the **writing
workshop deck**, which `00_marking_criteria.md`'s header names as a second source). No third
source was consulted; where neither document warrants a criterion it is recorded UNSOURCED, and
"absent" here means **absent from those two files**, not absent from the module.

## Classification key

| | Meaning |
|---|---|
| **EXACT** | the criterion restates a source sentence |
| **EXACT-h** | restates it, but the source hedges (`should`, `try to`, `as appropriate`) and the criterion drops the hedge without widening scope |
| **TIGHTENED** | the source says something weaker — a hedge read as a mandate, an example read as a requirement, or a quantifier the source does not have |
| **INFERRED** | no source sentence supports it; it comes from the workshop, from convention, or from the derivation |
| **UNSOURCED** | no warrant in either document |
| **WS** | warrant is the **workshop deck only** — not the issued requirements |
| **RULING** | Phuong's instruction, not a derivation |

**The single most consequential structural finding:** `00_marking_criteria.md` records **no
provenance per criterion**. HC1 (issued, "must") and HC5 (workshop, "typically") sit in the same
list in the same voice. That is the fault that produced the withdrawn ethics grading, and it is
not confined to ethics.

---

## Part 1 — Hard mechanical constraints

Part 1 opens *"These lose marks without any judgement involved."* **Nineteen of its seventy
criteria rest on a hedge** (`should`, `try to`, `not advisable`, `is best`), so the frame itself
is a tightening applied to the whole part.

| # | Class | Source quote (verbatim) | Warrant |
|---|---|---|---|
| HC1 | **EXACT** | "The dissertation must not exceed 20,000 words." | Submission :16 |
| HC1 scope | **RULING** | *none* — the source never says what the 20,000 counts | Phuong 2026-08-09; §1.1 records it as ruled |
| §1.1 cap | **RULING** | *none* | Phuong 2026-08-11, and §1.1 states so |
| HC2 | **TIGHTENED** | "Reports that are unstructured, overly verbose **and** contain irrelevant content will be penalised rather than rewarded." / "competence in producing a succinct and coherent report is **essential**" | Submission :17–18. The source conjoins three faults with **and**; HC2/HC3 split them into independently-failing criteria |
| HC3 | **TIGHTENED** | as HC2 | Submission :17–18 |
| HC4 | **EXACT-h** | "The `abstract' **should** summarize, **in one paragraph**, the major aspects" | Submission :75 |
| HC5 | **TIGHTENED · WS** | "**Typically** 300 words" | **Workshop slide 25 only.** The issued requirements state **no abstract word count** |
| HC6 | **EXACT** | "Your work **must** be word processed." | Submission :166 |
| HC7 | **EXACT** | "The preferred package … is Latex" | Submission :166–167; criterion self-hedges correctly |
| HC8 | **EXACT-h** | "a 12pt font and standard margins **should** be used" | Submission :21, :170 |
| HC9 | **EXACT** | "Use the same style and size font of size 12 font for the actual text throughout each chapter." | Submission :183–184 |
| HC10 | **EXACT-h** | as HC8 | Submission :21 |
| HC11 | **EXACT-h** | "It **should** be printed on A4 white paper" | Submission :169–170 |
| HC12–HC15 | **EXACT-h** | "All of the text and headings **should** be justified to the left hand margin, i.e. do not left indent the text of subsections any further than that of enclosing sections. Use consistently formatted paragraphs." | Submission :184–186 |
| HC16 | **TIGHTENED** | "Justified on both left and right edges, rather than ragged right edge, **is best**." | Submission :186–187. A preference stated as a constraint |
| HC17 | **EXACT-h** | "You can also use first line indent if you wish (but make sure it is used consistently)." | Submission :190 |
| HC18 | **EXACT** | "Do not use bold and underlining together." | Submission :183 |
| HC19 | **EXACT** | "Use page numbering." | Submission :191 |
| HC20 | **EXACT** | "Use a large and bold font for the main chapter headings and the title (centred)." | Submission :178 |
| HC21 | **TIGHTENED** | as HC20 | The "(centred)" plausibly attaches to **the title** alone; HC21 distributes it to every chapter heading |
| HC22–HC25 | **EXACT** | "For first level subsection titles: use bold and a font size slightly larger than the text. For lower-level subsection titles, use smaller font (and bold and/or italic)." | Submission :178–180 |
| HC26 | **EXACT-h** | "Chapters **should** have a heading, e.g. Chapter 1. Introduction." | Submission :173 |
| HC27 | **EXACT** | "Each chapter **must** start on a new page" | Submission :173–174 |
| HC28 | **EXACT** | "(but sections should not, unless necessary)" | Submission :174 |
| HC29–HC30 | **EXACT-h** | "Chapters **should** have subsections numbered x.1, x.2., etc. Subsections can have subsections x.1.1, x.1.2 etc." | Submission :174–175 |
| HC31 | **TIGHTENED** | "It is **not advisable** to have a subsection structure deeper than this." | Submission :175–176. Advice recorded as a hard mechanical constraint |
| HC32 | **EXACT** | "Make sure that you use past tense, as your report is an account of work that has been performed." | Submission :170–171 |
| HC33 | **TIGHTENED** | "**Check** your spelling and cross references **very carefully**." | Submission :191. An instruction to check became a guarantee of zero errors |
| HC34 | **TIGHTENED** | as HC33 | Submission :191, :217 |
| HC35–HC37 | **EXACT** | "Within a chapter, number figures Figure x.1 … (note: figures and tables are numbered independently of each other …)" | Submission :194, :199–201 |
| HC38–HC41 | **EXACT-h** | "Each figure **should** have a caption … Be consistent with caption style and positioning throughout the report." | Submission :195–196, :202–204 |
| HC42–HC43 | **EXACT** | "Any figures and tables used **must** be referred to in the text." | Submission :207 |
| HC44–HC45 | **TIGHTENED** | "**Try to** position each table or figure close to where it is first referenced." | Submission :207–208. `formatcheck` §3 already treats this as advisory — the tool is better calibrated than the criterion |
| HC46 | **EXACT** | "the way the figure or table is referenced should not make the sentence ungrammatical" | Submission :209–210 |
| HC47 | **EXACT-h** | "Tables **should** be created and not copied from computer output." | Submission :133–134 |
| HC48–HC49 | **EXACT** | "Figures are predominantly pictorial or diagrammatical." / "Tables are predominantly tabular in form and contain mainly textual and/or numerical data." | Submission :195, :201–202 |
| HC50–HC51 | **EXACT** | "You are free to use any referencing format at your discretion, (Harvard, Numbering) … ensure that you apply this format consistently throughout." | Submission :162–163 |
| HC52 | **INFERRED** | "accompanied by relevant figures, tables and a bibliography" | Submission :266 — a **band descriptor**, not a stated requirement |
| HC53 | **EXACT · WS** | "If you have based your methods on someone else's work remember to reference them!" | **Workshop slide 57 only** |
| HC54 | **TIGHTENED** | "The project specification that you prepared at the start of your project period **should** be included as an appendix." | Submission :25–26. Part 4 :576 calls it **"MANDATORY"** |
| HC55 | **EXACT** | "You should not include any source code here (except for perhaps very small portions of code that represent a solution to a particularly interesting or difficult problem)" | Submission :108–109 |
| HC56 | **EXACT-h** | "pseudocode is better" | Submission :109–110 |
| HC57 | **INFERRED** | "(references and appendices will follow this)" | Submission :155. **The source states no order between references and appendices** — HC57 reads it off the parenthetical's word order |
| HC58 | **EXACT** | as HC57 | Submission :155 |
| HC59 | **TIGHTENED** | "An explanation of any significant differences … **should** be given in the Discussion section." | Submission :28–29. Placed in Part 1 as judgement-free |
| HC60 | **WS · conditional** | "Remember to include ethics approval and considerations **if this was needed for your project**" | **Workshop slide 57 only.** Zero occurrences of *ethic* in the issued requirements. **Already struck 2026-08-11 — this audit confirms the strike was correct** |
| HC61 | **WS · conditional** | as HC60 | as HC60 |
| HC62–HC64 | **EXACT** | "The final dissertation report should be submitted, as a single PDF file, via the DS591 Moodle by Friday 4th September 2026 at 16:00" | Submission :36–38 |
| HC65 | **EXACT-h** | "You **should** submit a draft (as early as possible) to your supervisor" | Submission :36 |
| HC66–HC67 | **EXACT** | "You **must** attend your dissertation viva … normally within 2-3 weeks of the submission date and can be attended remotely" | Submission :41–44 |
| HC68–HC69 | **EXACT** | "You are **required** to prepare a poster … and present your work at the poster session on 11th September 2026" | Submission :46–50 |
| HC70 | **EXACT** | "All posters **must** be printed in A1 Landscape format – no other formats will be accepted." | Submission :52 |

---

## Part 2 — Rubric decomposed

| # | Class | Source quote (verbatim) | Warrant |
|---|---|---|---|
| R1–R4 | **EXACT** | "There is a clear and discernible structure and logic to the document … no blatantly obvious major mistakes or major omissions" | Submission :256–258, band 40–49 |
| R5–R6 | **EXACT** | "including one or more at MSc level … there should be some demonstration that the concepts behind the techniques have been understood" | Submission :264, :268–269 |
| R7 | **EXACT** | "you should clearly state the aims … and you should follow this up by explaining the research question(s) that are to be investigated" | Submission :85–87 |
| R8 | **EXACT** | "the research question should be answered logically and completely" | Submission :292–293 |
| R9–R23 | **EXACT** | "The topic should be clearly motivated with appropriate background material … The techniques **must** have been applied and interpreted correctly" | Submission :262–269 |
| R24–R28 | **EXACT** | "with some use of techniques or understanding of issues beyond those covered in the MSc modules … The account should flow logically" | Submission :272–274 |
| R29 | **TIGHTENED** | "largely complete (**for example**, following the data science pipeline, including: data- collection/sourcing/integration etc." | Submission :274–275. An illustrative list read as a checklist |
| **R30** | **TIGHTENED** | "if your project is more data analytical in nature, then you **may elect to have** sections describing the data and data source and the exploratory data analyses" · and "(**for example** … exploratory data analysis leading to …)" | Submission :123–125 and :275–276. **Explicitly optional in one place and an example in the other** |
| **R31** | **TIGHTENED** | as R30 | as R30 |
| R32–R37 | **TIGHTENED** | "(for example … hypotheses for testing, validating of results (e.g. by defending the experimental setup and procedures followed; by assessing model fit and predictive capacity))" | Submission :275–278. Two nested hedges, "for example" then "e.g." |
| R38–R40 | **EXACT** | "The conclusion should demonstrate that the methodology has addressed and answered the research question. This should be done in a competent, convincing and well-reasoned manner." | Submission :278–280 |
| R41–R42 | **EXACT** | "Your report should begin with a `title' that succinctly describes the subject matter. Use descriptive words that you would associate strongly with the content" | Submission :71–72 |
| R43–R46 | **TIGHTENED** | "The paragraph should have a logical structure, **for example**, the question(s) you investigated (or aims), the design/analytical methods used, the major findings … and conclusions" | Submission :76–78. **"for example"** — the four elements are an illustration |
| R47 | **WS** | abstract features table, "Results 2-4 sentences" | Workshop :338–342 |
| R48–R49 | **EXACT · WS** | "Needs to stand alone i.e., be complete in itself" / "Does not act as an introduction (common mistake!)" | Workshop slide 25 |
| R50–R56 | **EXACT-h** | "You should provide a contextual overview (with references) … why the project is worthwhile (e.g. what is the current knowledge gap) and how the project may be beneficial to others … The chapter should conclude with a brief chapter by chapter overview" | Submission :82–88 |
| R57 | **EXACT-h** | "It **should** be structured as a systematic review using a concept-centric structure." | Submission :92 |
| R58 | **EXACT** | as R57 | Submission :92 |
| R59–R61 | **EXACT-h** | "your writing **should** be critical: highlighting any limitations of existing approaches and detailing how your work differs and overcomes such limitations" | Submission :93–95 |
| R62 | **EXACT · conditional** | "**In the latter case**, the Background/Related Work section … should have clearly elicited the gap that your novel method fills" | Submission :99–103. Conditional on **contributing new methodology** |
| R63 | **INFERRED** | *none* | derivation |
| R64 | **WS** | "You **can** organise this section using the funnel method … **as well as** chronologically, by themes and by methods." | Workshop :467, :484. Criterion self-hedges correctly |
| **R65** | **UNSOURCED** | *none.* The string "protocol" occurs **zero times in both documents**; "databases", "query strings", "inclusion/exclusion" and "screened" occur **nowhere** | The four named sub-parts are the derivation's own gloss on "systematic review" |
| **R66** | **UNSOURCED** | *none.* No sentence in either document requires **every shipped method** to be argued in Background/Related Work | Nearest warrants are **D7** (approach-level, Distinction band, no chapter named) and **R62** (conditional on novel methodology) |
| R67 | **UNSOURCED** | *none* | derivation |
| R68 | **EXACT-h** | "This chapter **should** be sufficiently detailed … so that the reader would be able to replicate your work" · "The methods section should contain sufficient detail for readers to replicate the work done" | Submission :106–108; Workshop :584 |
| R69 | **TIGHTENED** | "(**for example**, with pseudocode diagrams, flow diagrams of processes, unambiguous model definitions (typically numbered))" | Submission :106–107 |
| R70 | **EXACT-h** | as R69 | Submission :107 |
| R71 | **TIGHTENED** | "(**typically** numbered)" | Submission :107 |
| R72–R76 | **TIGHTENED** | "This chapter should, **as appropriate**, detail methods of data sourcing, data preparation (e.g. cleaning, removing outliers, integrating data, engineering of features etc.)" | Submission :113–114 |
| R77 | **TIGHTENED** | "(including precise details of the software and libraries used, **if appropriate**)" | Submission :115 |
| R78 | **TIGHTENED** | as R77 | The source says **software and libraries**; R78 adds **"and versions"**, which appears nowhere |
| R79–R80 | **EXACT-h** | "and how the models were applied / fitted and validated" | Submission :116 |
| R81–R82 | **EXACT-h** | "You should also consider, and reflect upon, whether any noise or bias could have been introduced into your approach." | Submission :118–119 |
| R83 | **EXACT · WS** | "Remember to justify your decisions – why did you decide to do what you did in your research?" | Workshop slide 56 |
| **R84** | **TIGHTENED · WS** | "**We often see** justification of significant choices and the reason for rejecting alternative options given in full" | Workshop slide 56. **An observation of what good dissertations do, read as a requirement.** A genuine warrant exists at **D7**, but at approach level and only in the Distinction band |
| R85 | **TIGHTENED** | "you **may elect to have** sections describing the data and data source and the exploratory data analyses. **This may then be followed by** a theory section…" | Submission :123–127 |
| R86 | **TIGHTENED · WS** | "**It is more reader-friendly to** start with an introduction for your methods section" | Workshop slide 55. A readability preference stated as a requirement |
| R87–R93 | **EXACT-h** | "you should begin by explaining the procedures that you followed and include as much details as possible about what your experimental settings were, how many data items you were dealing with, what properties you set for your model and how (e.g. hyper-parameter tuning), and what evaluation measures you used and why" | Submission :137–140 |
| R94–R95 | **EXACT-h** | "You should include both graphical and tabular information" | Submission :132 |
| **R96** | **TIGHTENED** | "supported by **textual summaries of your findings**" | Submission :132–133. The source attaches summaries to **your findings**, at chapter level. **"Every figure … has a textual summary" is a quantifier the source does not have** |
| **R97** | **TIGHTENED** | as R96 | as R96 |
| R98 | **EXACT** | "You need to bring out the key features of your results." | Submission :133 |
| R99–R100 | **EXACT** | "**Ensure that you apply** suitable statistical methods … to compare model performance and to contrast different approaches." | Submission :134–135 |
| **R101** | **TIGHTENED** | "Ensure that you apply suitable statistical methods **(as detailed in the methods section)** to compare model performance" | Submission :134. The imperative is *apply suitable methods*; the correspondence is a **parenthetical**. R101 promotes it to a standalone, **bidirectional completeness** criterion — every method used must be detailed in Methods — which the parenthetical does not assert |
| R102 | **EXACT** | "what they imply (i.e. what do the results reveal in terms of your research question(s)?)" | Submission :141–142 |
| R103 | **EXACT** | "What do the results reveal in relation to your research question(s)?" | Submission :149 |
| R104 | **EXACT** | "Is your approach valid, and how can you argue this?" | Submission :150 |
| R105–R106 | **EXACT (one bullet, split)** | "Are there inherent limitations, **including potential biases**, in your work?" | Submission :151. One source bullet became two criteria; defensible, but two independent FAILs can now be recorded where the source poses one question |
| R107 | **EXACT** | "How may any underpinning assumptions have impacted your findings?" | Submission :152 |
| R108 | **TIGHTENED** | "An explanation of any significant differences … **should** be given in the Discussion section." **plus** "differences … **will not be seen as a disadvantage** where an account is given of how the project evolved" | Submission :28–31. The second sentence is an **exculpation** and appears in HC59's parenthetical but not in R108 |
| R109 | **EXACT** | "you will revisit the general aim of your research" | Submission :155–156 |
| R110 | **EXACT** | "and each of your objectives" | Submission :156 |
| **R111** | **TIGHTENED** | "reflecting on whether you have achieved **your general aim**, or not" | Submission :156–157. The source attaches the achieved/not judgement to the **general aim**; R111 distributes it across **each objective** |
| R112 | **EXACT** | "You should discuss the project as a whole" | Submission :157 |
| R113 | **EXACT** | "if you did it again would you do it differently?" | Submission :157–158 |
| R114 | **EXACT** | "What did you have to learn to do the project" | Submission :158 |
| R115 | **EXACT** | "what did you learn from doing it?" | Submission :158–159 |
| R116 | **EXACT** | "How would you modify your methodology if you were to do the project again?" | Submission :159 |
| R117–R119 | **WS** | source-integration slides | Workshop :120–130 |
| R120–R133 | **WS / INFERRED** | workshop guidance and checklists | Workshop |
| **R134–R136** | **TIGHTENED · WS** | "Integrates figure 4.1 into the text and explains how and why that figure is related to the overall objectives/research aims/research questions" · "Has a good figure legend" | Workshop slide 62 — **commentary on ONE figure in ONE worked example**. R134/R135/R136 quantify it over **every** figure |

## Part 3 — Distinction bands

| # | Class | Source quote (verbatim) | Warrant |
|---|---|---|---|
| D1–D6 | **EXACT** | band descriptor quoted verbatim in the file | Submission :283–293 |
| **D7** | **EXACT** | "**This should include a discussion of why the approach taken is better than alternatives that could have been used.**" | Submission :290–291. **Verbatim, and the strongest warrant in the whole outstanding set** |
| D7 gloss | **TIGHTENED** | *none* | "cannot reach this band" is an inference against the closing caveat *"the balance amongst the above criteria may vary"* (:300–301) |
| D8–D12 | **EXACT** | "A distinction would normally demonstrate a high level of insight, understanding and clarity, and the research question should be answered logically and completely." | Submission :291–293 |
| D13–D17 | **EXACT** | "the writing in the report **must** be of publishable quality … and the work itself should be publishable, with little modification other than making it more concise" | Submission :296–298 |
| T1–T3 | **EXACT** | band 40–49 and 50–59 text | Submission :256–260, :271–280 |

---

## MISSING — source requirements with no criterion

Swept separately by walking the source top to bottom. Six, none catastrophic, two worth a ruling.

| Source quote (verbatim) | Location | Why it matters |
|---|---|---|
| "It is important that your report has **a clear and attractive layout**." | :169 | **No criterion anywhere.** An assessed presentation property with no check. The formatting gate now covers part of it by accident |
| "**Use figures, as appropriate, to support your textual communication of methods and procedures used.**" | :110–111 | R69 covers pseudocode/flow diagrams only. No criterion for figures in Methods generally |
| "You **should discuss the length and content of your report with your supervisor**." | :18–19 | No criterion. Process, but it is the source's own remedy for HC1/HC2 |
| "You should discuss a suitable report structure for your specific project with your supervisor." / "The structure of this chapter(s) should be discussed with your supervisor" | :68, :127–128 | No criterion |
| "You should ensure that **your methods section flows logically**." | :122 | R28 is document-level; nothing is Methods-specific |
| "printed on A4 **white** paper" | :169–170 | HC11 covers A4 only. Immaterial for a PDF |

## One internal contradiction, unrelated to provenance

**§1.1 :84** — *"**Superseded and struck:** 15,000 as a working aim — **15,000 is off the table**"*.
**§1.1 :147** — *"**The working target is 15,000 body words.** 18,000 is the upper bound of what
reads acceptably."* — **not struck.** Two live sentences in the authority file, 63 lines apart,
saying opposite things about the same number. Proposed: strike :147–149 with the same
visible-strike convention used at :67.

---

## Re-weighing the outstanding set

Recorded costs are from `reduction_cost_register.md` §8F/§8G.

| Item | Class | Recorded | Revised | Why |
|---|---|---|---|---|
| **R66** | **UNSOURCED** | ~300 | **0** | No source requires every shipped method to be argued in Chapter 2. Winkler and the Breiman rule fold into D7's approach-level requirement |
| **R30/R31** (EDA) | **TIGHTENED** | ~300 + a figure | **0** | "you **may elect to have** … the exploratory data analyses" — optional at the author's election, and the band mention is inside a "for example" |
| **R96** | **TIGHTENED** | ~50 | **0 as a failure** | Source wants findings supported by textual summaries, at chapter level. Two thin figure introductions remain a quality observation, not a FAIL |
| **R65** | **UNSOURCED** | recorded FAIL, "not repairable" | **not a failure** | "protocol", "databases", "query strings", "screened" appear in neither document |
| **R101** | **TIGHTENED** | ~80–120 | **~40–60** | Priced against a bidirectional completeness rule. The source's parenthetical is discharged by naming each method and pointing at its definition |
| **R68** | **EXACT-h** | ~350 | **~100–350** | Criterion stands. But reconciliation **is** specified at `results.tex`:148–152; the defect is location, not absence, and a Methods pointer may discharge it |
| **D7** | **EXACT** | ~150–200 | **~150–200, priority RISES** | The only item here with a verbatim warrant, and it was ranked below R66, which has none |
| **R108** | **TIGHTENED** | ~35 | **~35** | Hedge only; the four-domains divergence is a genuine significant difference |
| **Tier 2** | mixed | ~100 | **~75** | Item 14's R36 framing rests on a nested "for example" |
| **R57** | **EXACT-h** | recorded FAIL, declared | **FAIL stands** | "It **should** be structured as a systematic review" is a real, if hedged, requirement |

**Recorded total: ~1,365–1,455 words plus one figure.**
**Revised total: ~400–720 words, no figure.**
**Released: ~650 words and one figure that need not be written at all.**
