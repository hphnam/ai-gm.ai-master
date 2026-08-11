# Phase 8D — adversarial final audit

**Run 2026-08-11, read-only. Nothing in the document or the ledgers was changed.**
Every repair below is proposed and costed; none is applied.

**What was audited.** The Overleaf clone at `/Users/hapuna/Downloads/prj93-overleaf`,
verified against the remote first: `git fetch origin` then `git ls-remote --heads origin`
returns **`eb83e358ed1fea34b2ec859a7642b0d7c4060b0f`** for `main`, and the working clone is
at that commit with only `.DS_Store` modified. So this audit is of the state Overleaf
holds, not of an unpushed local state.

**Scope of the check, stated because a clean verdict over an unstated scope is not a
verdict.** Source-level audit of `main.tex`, `abstract.tex`, the six chapter files, the
five appendix files and the front matter. **No compile was run**: `texcount`, `pdflatex`
and `latexmk` were not found in `/usr/local/texlive/*/bin`, `/Library/TeX/texbin`,
`~/texlive*/bin`, nor by `find` over `$HOME` to depth 6 or `/` to depth 4. Tier-2 and
tier-3 checks in `PRJ93_RULES.md`'s three-tier boundary are therefore **outside this
audit** and are listed at §0.4 rather than reported as passing.

---

# 0 · MECHANICAL — the failures that cost marks without judgement

Reported first and separately, per the brief. These are checked against
`00_marking_criteria.md` Part 1 (HC1–HC70) and the issued
`Student Documentation - MSc DS - Dissertation Submission.md`.

## 0.0 · **M0 — THE DOCUMENT ON `origin/main` DOES NOT BUILD. Fix this before anything else.**

`main.tex`:112 declares:

```
\addbibresource{ref_additions.bib}
```

**That file does not exist.** It is not in the working tree (`ls *.bib` returns `ref.bib`
only), **not tracked by git** (`git ls-files` returns `ref.bib` only), and **not covered by
`.gitignore`** (which lists only `main-words.sum` and `svg.sty`). Biber errors on a missing
resource, so **the state Overleaf holds at `eb83e35` will not produce a bibliography.**

**The consequence, and it is the second half of the same defect.** `vovk_algorithmic_2005`
is cited twice — `discussion.tex`:138 and `appendix/pseudocode.tex`:212 — and has **zero
occurrences in `ref.bib`**. It lived in the uncommitted `ref_additions.bib`;
`BLOCKED_third_party.md` §F records it being added there on 2026-08-08. It carries the
**Mondrian conformal attribution** — *"What the construction is is due to
\citet{vovk_algorithmic_2005}, who introduce Mondrian conformal prediction"* — which is the
repair for examiner Finding 16 and for critique finding H12-1. **The fix for a
misattribution is itself unreferenced**, and HC53 (*every method based on someone else's work
is referenced*) fails on the one citation that exists to discharge it.

**Why every check missed it.** 8E's pre-flight table records *"`latexcheck --shell-escape`,
working clone: **PASS**, 135 pages … **no undefined citation**"* and *"Fresh clone of
`5fc5731` … **PASS**"*. The working-clone run passed because `ref_additions.bib` was sitting
**untracked** in the working directory. This is the **stale `main-words.sum` failure exactly**,
in a new file: *a run that passes only because of working-directory state, and would fail
from a clean checkout*. The fresh-clone check that exists to catch this was recorded against
`5fc5731`, before the file was needed, or was run in a directory that still had it.

**Cost: 0 words.** Either `git add ref_additions.bib`, or move the Vovk entry into `ref.bib`
and delete line 112. **Then re-run the fresh-clone compile**, because the only check that
answers *"does the state Overleaf holds actually build"* is the one run on a clone that
never had the file.

---

## 0.1 The three that need a ruling before submission

### M1 · The document exceeds the project's own ruled hard ceiling by 961 words, and the withdrawal was written in the wrong store

The counted body is **19,961** — `main-words.sum` in the clone, written by
`\quickwordcount`'s `\write18` over the seven files `\bodywordcount` names in
`main.tex:228`. Against **HC1's 20,000 the document PASSES with a margin of 39.**

Against the project's own ruling it does not.
`00_marking_criteria.md`:45–55 carries:

> **FINAL RULING ON LENGTH — Phuong, 2026-08-09. This does not move again.**
> **HARD CEILING 19,000 — exceeding it is not available.** Target 18,000.
> ~~20,000~~ — *irrelevant. It is the regulation, not the constraint being worked to.*

The document is **961 words over that ceiling**. The withdrawal exists —
`BLOCKED_third_party.md` §F records *"19,000 as a working ceiling — **WITHDRAWN as
unreachable, not as wrong**"* — but it was written **only in `BLOCKED`**, and
`00_marking_criteria.md` §1.1, which is the store that owns the length ruling and which
this brief names as the authority, still reads *"This does not move again"*.

This is the store-ownership rule failing in the file that states it. **It is not a
document defect; it is a ledger defect with a document consequence**, and it needs
Phuong's ruling on the record before submission, because as the two stores stand the
document simultaneously complies with the regulation and breaches the ruling.

**Cost: 0 words in the document.** One struck row in `00_marking_criteria.md` §1.1.

### M2 · `00_marking_criteria.md` §1.1b still records R114 as unmet, eighteen hours after it was discharged

§1.1b reads *"R114 … has no discharging passage in `conclusion.tex`"*. **It has one.**
`conclusion.tex`:156–170, `\section{What the project required}`, four bodies of method,
each pointing at the section evidencing it. Verified in the document, not in the ledger
row that claims it — `reduction_cost_register.md` §"PASS 8E" Ruling 5 records the same.

The brief for this audit carried *"R114 undischarged"* as a known-going-in. **It is
stale and the premise is withdrawn.** Reported here because the same staleness would
have sent a repair pass at a criterion that is met.

**Cost: 0 words.** Strike §1.1b.

### M3 · HC32, past tense, is not met as the requirement is written

The issued documentation states: *"Make sure that you use past tense, as your report is
an account of work that has been performed."* The document is written predominantly in
the **academic present** — `introduction.tex`:62 *"A hospitality venue commits its
costs"*, `results.tex`:103 *"The set is also the multiple-comparison control"*,
`conclusion.tex`:35 *"The first deliverable is a working prototype"*. Past tense is used
where work is reported (`abstract.tex`:193 *"Ten forecasting approaches were fielded"*,
`conclusion.tex`:159 *"Four bodies of method had to be learned"*).

Judged as an examiner would: this is **standard scientific-writing practice and reads
well**, and no marker penalises the academic present in a methods or results chapter.
But HC32 is a mechanical line in the issued guidance and the document does not satisfy
it literally. **Recorded as a declared, deliberate divergence rather than a defect to
repair** — repairing it would mean rewriting six chapters and would breach the
formatting-pass invariant that the counted body not move.

**Cost of literal compliance: prohibitive and not recommended.** Cost of doing nothing: a
marker with a checklist may dock it. Recommendation: leave it.

## 0.2 Mechanical items that PASS, with their evidence

| HC | Requirement | Verdict | Evidence |
|---|---|---|---|
| HC1 | ≤ 20,000 words | **PASS**, margin 39 | `main-words.sum` = 19,961; scope `main.tex`:228 |
| HC4 | Abstract is a single paragraph | **PASS** | `abstract.tex`:189–210, no paragraph break. *Was four paragraphs until 2026-08-09 and no instrument in this project could see it* |
| HC5 | Abstract ~300 words | **PASS** | 304 by strip-and-count over the body paragraph |
| HC54 | Project specification included as an appendix | **PASS** | `main.tex`:414–415, Appendix E, `appendix/project_specification.tex` |
| HC57/58 | Appendices follow References; both follow Conclusions | **PASS** | `main.tex`:380 `\printbibliography` precedes `:389 \begin{appendices}`. The ordering defect is recorded as fixed at `main.tex`:384–386 |
| HC50/51/52 | Recognised referencing format, applied consistently, bibliography present | **PASS** | biblatex, single style, `\printbibliography` at `:380` |
| HC55/56 | No source code in Methods; pseudocode preferred | **PASS** | Three `algorithm2e` floats in `appendix/pseudocode.tex`; `methodology.tex` points at each (`:280`, `:352`, `:424`) |
| HC59 | Scope divergence explained in the Discussion | **PASS with a gap** — see §1.4 R108 | `discussion.tex`:288–323, §5.5 |
| HC26/27 | Chapter headings; each chapter starts a new page | **PASS** | `\chapter` issued in `main.tex` for all six |
| HC31 | Nesting no deeper than three levels | **PASS** | `\section`/`\subsection` only in chapters |
| — | Word-count declaration correctly scoped | **PASS** | `declaration.tex` names abstract + Chapters 1–6, excludes bibliography and appendices, states the 20,000 maximum |

## 0.2a The other mechanical FAILs

| HC | Requirement | Verdict | Evidence |
|---|---|---|---|
| **HC52** | A bibliography is present | **FAIL** | M0. `main.tex`:112 points at a file that does not exist |
| **HC53** | Every method based on someone else's work is referenced | **FAIL** | `vovk_algorithmic_2005`, cited twice, defined nowhere |
| ~~**HC60**~~ | ~~Ethics approval included if the project needed it~~ | **WITHDRAWN — Phuong's ruling, 2026-08-11: not compulsory, no statement required** | See the correction below. This row overstated a conditional criterion as a mechanical failure |
| ~~**HC61**~~ | ~~Ethics considerations discussed if the project needed them~~ | **WITHDRAWN — same ruling** | See the correction below |
**CORRECTION, 2026-08-11, appended rather than applied silently — HC60/HC61 withdrawn.**
Phuong asked which part of the rubric or the guidelines requires an ethics statement. Tracing
it rather than assuming it, the answer is **one bullet on one slide**, and this audit had
mis-graded it twice over.

| Authority | What it says about ethics |
|---|---|
| `Student Documentation - MSc DS - Dissertation Submission.md` — **the requirements as issued, and the marking guide at its Appendix B** | **Nothing.** `grep -ci 'ethic'` over the whole file returns **0** |
| `DataSciDissWriting June2026final.md` **Slide 57**, in the *Materials and Methods* section | *"Remember to include ethics approval and considerations if this was needed for your project"* — a bullet on a reminders slide whose other bullet is *"If you have based your methods on someone else's work remember to reference them!"* |
| `00_marking_criteria.md` HC60/HC61 | **This project's own derivation from Slide 57.** Not independent authority. §1.9 already logged *"The required format for ethics documentation"* as an UNKNOWN |

**Both halves of the grading were wrong.** These rows sat in §0, whose stated test is *"these
lose marks without any judgement involved"* — and (1) the requirement is **explicitly
conditional**, *"if this was needed for your project"*, so it turns on precisely the judgement a
mechanical criterion must not need; (2) its sole source is a **writing-guide reminder slide**,
not the issued requirements and not the marking guide. A criterion derived from a teaching deck
was reported at the same severity as a missing bibliography.

**The general fault, and it is one this project already has a rule for.** `00_marking_criteria.md`
is *"the same rubric converted for working use"*, and a converted criterion carries the authority
of its source, not of the file it now lives in. HC60/HC61 read in that file exactly like HC1 or
HC52, which come from the issued document — the conversion **flattened the provenance**, and
nothing in the file records which criteria are derived from what. This is *a claim of absence
names what was searched* pointed at a claim of presence: a criterion asserted without its source
is a criterion nobody can weigh.

**RULED by Phuong, 2026-08-11: not compulsory. No ethics statement is written.** The ~45 words
are released to R101, which is sourced to the rubric proper.

**What this ruling does not touch**, recorded because it is not a marks question: the prepared
form (`brain/docs/ethics_form.md`) answers **Q14 — supervisor agreement to submit for ethical
review — as `N/A`** and carries no approval reference or decision; and its Q40 undertaking that
*"venue names will be pseudonymised where this does not undermine the analysis"* stands against
211 named-venue mentions and a partner named on the title page. Those are governance matters
between Phuong and the department, they are outside this audit's remit, and the ruling above is
about the dissertation's contents rather than about them.

| **HC21** | Main chapter headings large, bold **and centred** | **FAIL** | No `titlesec`, `sectsty`, `fncychap`, `quotchap`, or `\@makechapterhead` redefinition is loaded. `report`'s default chapter head is `\huge\bfseries` **flush left**. Large ✓ bold ✓ centred ✗ |
| **HC29** | Subsections numbered x.1, x.2 … | **FAIL, appendices only** | Chapters 1–6 number correctly. **All 38 appendix headings are `\section*`** — zero unstarred across the five appendix files — so appendices carry **no A.1/A.2 numbering and no ToC entries**, despite `main.tex`:95 `\setcounter{tocdepth}{4}` |
| **HC43** | Every table is referred to in the body text | **FAIL** | **7 tables never `\ref`-ed anywhere**: `tab:screening-criteria`, `tab:screening-boundaries`, `tab:screening-counts`, `tab:environment`, `tab:intermittency-sensitivity`, `tab:paired-variance`, `tab:native-interval`. All 23 body-chapter floats **are** referenced |
| **HC68** | A poster is prepared | **FAIL, in this repo** | No poster artefact exists here. Absence of evidence in this repository only |

**Also worth acting on:** the three `algorithm2e` floats (`alg:conformal`, `alg:adoption`,
`alg:detection`) are `\ref`-ed **only from `notation.tex`'s "Defined at" column** — never from
a body sentence. `methodology.tex`:280, :352 and :424 point at
`Appendix~\ref{app:pseudocode}` rather than at the algorithm number, so the pseudocode R69
depends on is unreachable **by number** from the text that promises it.

One spelling error found: `appendix/pseudocode.tex`:296 **"cannister"** → *canister*. Spelling
is otherwise uniformly UK (52 `-ise`, zero US variants); no `aspell`/`hunspell` available, so
this is a targeted probe, **not a dictionary pass**.

## 0.3 Mechanical items that are THIN

- **§5.5 declares "Six things" and presents four paragraphs.** `discussion.tex`:291. A
  marker asked to find six will find four blocks; the six are recoverable only by
  counting clauses (venue count · research schema · agent · manager feedback · cost ratio
  · transfer). **Cost: 0 words** (number them) **or ~15** (name each in a lead clause).
- **The Introduction's chapter overview no longer describes Chapter 6.**
  `introduction.tex`:176–177 says Chapter 6 *"revisits the deliverables, restates the five
  contributions and sets out the further work"* — three things. Chapter 6 has **five**
  sections, including §6.3 *What the project required*, which 8E added on 2026-08-10.
  This is the count-in-prose defect class: the sentence was true when written.
  **R56 is thinned by it. Cost: ~8 words.**

## 0.4 What this audit could NOT check, because no compile was available

Stated so a clean report is not read as coverage it does not have. Every item below is
tier 2 or tier 3 and needs the PDF:

HC8, HC10, HC11 (12pt, margins, A4 — *declared correct in the preamble and in
`formatting_pass_2026-08-11.md`, unverified here on the render*); HC12–HC25 (justification,
heading weights and sizes, indentation); HC19 (page numbering); HC34 (that every
cross-reference **resolves** — the *truth* of the references was checked and is at §3.4);
HC40/HC41 (caption style and position as rendered); HC44/HC45 (float proximity as
rendered — `formatcheck.py` is the instrument and it needs `main.pdf`); HC33 (spelling, as
a spell-checker pass).

**The last clean run of these is `formatting_pass_2026-08-11.md`, at body 19,961, which is
this commit.** That is evidence, and it is not a run made by this audit.

---

# 1 · PASS 1 — RUBRIC COMPLIANCE

Marked against `00_marking_criteria.md` directly. **05's derived map was not used**, and
the decision to ignore it was correct: see §1.6, where three of its enumerations are
stale.

**Totals: 136 R-criteria plus D1–D17 considered. 5 FAIL, 21 THIN, the remainder PASS.**
**Mechanically (HC1–HC70): 44 PASS, 10 FAIL, 4 THIN, 15 not checkable without a compile.**

## 1.1 The five FAILs — **THREE, as of 2026-08-12**

> **WITHDRAWN 2026-08-12 after the provenance audit, and left visible rather than deleted.**
> **F1 (R66), F3 (R96) and F5 (R65) are no longer failures.** Each was graded against a
> criterion that the derivation, not the source, put there. The blocks below stand as the
> record of what was believed when; each carries its own withdrawal note. **The surviving
> FAILs are F2 (R101, downgraded to a parenthetical mismatch) and F4 (R57, which is real
> and hedged).** Ruling: Phuong, on `knowledge/00_marking_criteria.md`'s source-precedence
> ruling of the same date. Working: `ledger/criteria_provenance_audit.md`.

### ~~F1 · R66~~ — **WITHDRAWN 2026-08-12. NOT A FAILURE.**

> **R66 is `[U]`: no sentence in either source document requires every shipped method to be
> argued in Background/Related Work.** The nearest warrants are **D7** — *"This should include
> a discussion of why the approach taken is better than alternatives that could have been
> used"*, which is approach-level, sits in the Distinction band and names no chapter — and
> **R62**, which is conditional on *contributing novel methodology*, a claim this work
> explicitly disclaims. **The ~300-word debt for arguing the Winkler score and the Breiman
> one-standard-error rule in Chapter 2 is cancelled.**
>
> **This one cost a real decision.** R66 was the largest item in the outstanding set, was
> graded an outright FAIL here, and on 2026-08-11 was recorded as *"knowingly thin"* under a
> ruling that funded R109 ahead of it. That trade was between a genuine criterion and a
> derived one — and it happened to come out right, which is luck rather than method.
>
> The block below stands as written, as the record of what was believed.

### F1 · R66 — "Every method that actually ships in the built system is argued for in this chapter" — ~~**FAIL, and not for the reason on record**~~

This is the audit's most consequential rubric finding, because **the ruling that closed
it checked the wrong method**.

`reduction_cost_register.md` §"PASS 8E" Ruling 3 read 2.3's retained sentence against
*"does it argue or merely assert"*, found that it argues, and concluded **"R66 is
therefore THIN — the argument is present at reduced length — and not ABSENT."** That
ruling is **correct about the baseline ladder** and I confirm it: `literature_review.tex`:20–21
carries premise, three citations and an inference marked by *so*, with a second route off
Tan's ablation at `:37–39`.

**But R66 is a quantifier over every shipped method, and the ruling tested one.**
Enumerating the shipped set from `methodology.tex` and checking each against Chapter 2:

| Shipped method | Argued in Ch 2? | Evidence |
|---|---|---|
| Pooling / global estimation | yes | `:26–32` |
| Foundation models zero-shot | yes | `:34–39` |
| Weather covariates + availability lead | yes, strongest | `:40–49` |
| Hierarchical reconciliation | yes | `:74–77` |
| Intermittency classification | yes | `:85–89` |
| Split conformal + tie/atom problem | yes | `:105–115` |
| Scaled-error family | yes | `:128–152` |
| Diebold–Mariano + Harvey correction | yes | `:154–158` |
| Model confidence set | yes | `:159–161` |
| CUSUM | yes | `:172–178` |
| Mondrian on a recorded partition | yes | `:187–198` |
| VUS-PR | yes | `:180–185` |
| **Winkler score** | **NO — zero occurrences in Chapter 2** | `grep -ci winkler literature_review.tex` = **0**; `methodology.tex` 2, `results.tex` 10 |
| **One-standard-error rule (Breiman)** | **NO — zero occurrences in Chapter 2** | `methodology.tex`:222–224 only |
| **Knowledge-gap signal** | **NO** | only `lewis_retrieval-augmented_2020` at `:212`, used for a different argument |
| Injection-design ground truth | partial | measure argued, design not |

**The two that matter are the Winkler score and the one-standard-error rule, and both are
decision instruments.** Winkler is the *primary* arbiter among interval methods
(`methodology.tex`:394, and §4.4.5 is built on it); the one-standard-error rule is the device
the entire adoption gate turns on (`methodology.tex`:222–226). Chapter 2 argues at length
about point-forecast error measures and never reaches proper scoring rules for intervals at
all.

**Why the earlier ruling missed it.** It was scoped to row 20 of the HIGH block, which is
about §2.2's removal and the baseline ladder. **Scope a check narrowly and it will be
clean narrowly** — the ruling answered the question it was asked, and R66 quantifies over a
set nobody enumerated. This is the enumeration rule: *reading finds what is there; only
enumeration finds what is not.*

**Cost to discharge: ~180 words for Winkler in §2.5, ~120 for the one-standard-error rule,
~200 for the knowledge-gap signal (or drop that signal from the contribution claims).
Minimum defensible repair: ~300 words for the two decision instruments.** Not affordable
in a 39-word margin; see §4 for funding.

### F2 · R101 — **DOWNGRADED 2026-08-12: a parenthetical mismatch, not a FAIL**

> The issued sentence is *"**Ensure that you apply** suitable statistical methods **(as detailed
> in the methods section)** to compare model performance and to contrast different approaches."*
> The imperative is **R99/R100**, and both **PASS**. The correspondence rides in a
> **parenthetical**, which R101 promoted to a standalone *bidirectional completeness* rule the
> source does not assert. **Discharge by naming each method and pointing at where it is defined
> — not by writing a Methods specification of the whole battery.** Revised cost **~40–60**, from
> ~80–120. And the population is **four** methods, not nine: five of the original nine were grep
> artefacts (`methodology.tex`:331 writes *"moving block bootstrap"* unhyphenated; `sec:mcs` is a
> full section the exact phrase never appears in).

### F2 · R101 — "The statistical methods used for comparison are the ones detailed in Methods" — ~~**FAIL**~~

Nine statistical procedures are used in Results and specified nowhere in Methods:
an uncorrected one-sample *t*-test (`results.tex`:146); an exact two-sided binomial test
(`:396`); Clopper–Pearson intervals (`:378`); Pearson correlation of |residual| on date with
*p*-values (`:474–475`); the rank-uniformity statistic (`:484–487`) — which the Discussion
itself calls *"the instrument this work adds"*; moving-block bootstrap intervals on *p* and
*v* (`:177–179`); percentile bootstrap over per-injection values (`:701–703`); the
Bartlett/dependence correction (`:126–127`); and **VUS-PR itself** (`:700`), where
`methodology.tex`:476 specifies only *"Recall and latency are scored against known onsets"*.

Running the other way, four Methods commitments are never used: the Diebold–Mariano/HLN
test is specified and never computed; BOCPD (`methodology.tex`:421); per-horizon-step weather
reporting (`:257`); and the below-attainable-size band tally (`:371–373`).

**Cost: ~180 words of Methods specification, ~40 to withdraw or discharge the four unmet
promises.**

### F3 · R96 — "Every figure in Results has a textual summary of the finding it carries" — **FAIL on one figure, thin on a second**

`fig:ladder` is introduced at `results.tex`:64 as *"shows the per-fold loss distribution the
selection question is asked of"* — that is a statement of **content**, not of **finding**.
The findings in the vicinity belong to `tab:mcs`. `fig:validity-efficiency` (`:639–640`) is a
pointer to *"the plane the adoption rule is defined on"*; the trade-off finding at `:637–638`
is stated of ACI rather than read off the figure. The other three figures pass.

**Cost: ~50 words.** ~~This is the cheapest FAIL in the document and should be taken first.~~

> **WITHDRAWN 2026-08-12 — the quantifier is not the source's.** The issued requirement is
> *"You should include both graphical and tabular information, **supported by textual
> summaries of your findings**."* The summaries attach to **your findings**, at chapter
> level. **There is no per-figure rule in either document** — `each figure` occurs once in
> the issued file and it is about **captions**. Results is plainly supported by textual
> summaries of its findings, so **R96 is met and this FAIL does not stand.**
>
> `fig:ladder` and `fig:validity-efficiency` having content-style introductions rather than
> finding-style ones remains a **style observation** worth taking if words are free. It is
> not a debt, and it should no longer be described as *"the cheapest FAIL"* or funded first
> — which is precisely what it was, at the head of the 8G funding order.

### F4 · R57 — "The chapter is structured as a systematic review" — **FAIL, declared**

The chapter is thematic and retrospectively auditable, not systematic. It says so and
points at the appendix (`literature_review.tex`:14), and the appendix disowns systematicity
in terms: `appendix/search_screening_body.tex`:35 *"The search was not pre-registered and no
protocol document was written in advance."*

**Not repairable by writing.** The counts were not logged at the time.

### F5 · R65 — "A search protocol is stated (databases, query strings, inclusion/exclusion criteria, screened-vs-retained counts)" — **FAIL, two of four sub-parts unrecoverable**

Databases: reconstructed, offered as a reconstruction. Inclusion/exclusion: present but
retrofitted. **Query strings: absent** (`search_screening_body.tex`:66). **Screened-versus-retained
counts: absent** (`:45`).

**Note for the viva, and it is a credit rather than a defect:** the candidate refused to
draw a PRISMA flow diagram from reconstructed numbers, on the stated ground that *"an
estimate rendered as a flow diagram would be indistinguishable from a contemporaneous
record"*. That is the right call and should be said aloud.

**Not repairable.** ~150 words would improve the signposting so a reader does not assume
the appendix contains a protocol.

> **WITHDRAWN 2026-08-12 — R65 IS `[U]`, AND THE APPENDIX IS GONE.** Grep over **both**
> source documents: `protocol` 0/0, `databases` 0/0, `query string` 0/0, `inclusion` 0/0,
> `exclusion` 0/0, `PRISMA` 0/0; the two `screen` hits in the workshop deck are image
> alt-text. **The four sub-parts this row grades against appear in no issued requirement**
> — they are the derivation's gloss on "systematic review", which the source states and
> never elaborates. There were no "two of four sub-parts" to recover, because there were
> never four sub-parts.
>
> Phuong ruled the appendix removed on 2026-08-12 (`prj93-overleaf` `9317b19`), with the
> `discussion.tex` paragraph that confessed against these sub-parts and the four acronym
> rows that served only it. **The viva note above still holds and is still a credit** —
> refusing to draw a PRISMA diagram from reconstructed numbers was right — but it is now a
> point about judgement rather than a mitigation of a failure.
>
> **What R65 leaves behind is F4, not itself.** R57 (*"it should be structured as a
> systematic review"*) is a real hedged requirement and its declared FAIL stands;
> `literature_review.tex` still declares the corpus was assembled thematically rather than
> through a pre-registered protocol.

## 1.2 R114, R66, R64 — the three the brief named, adjudicated

| | Brief said | Audit finds |
|---|---|---|
| **R114** | undischarged | **DISCHARGED.** `conclusion.tex`:156–170. Premise withdrawn — see M2 |
| **R66** | thin after §2.2's removal | **FAIL, on different methods.** The ladder is thin as ruled; Winkler and the one-standard-error rule are absent. See F1 |
| **R64** | degraded | **THIN, not degraded.** A funnel mouth survives at `literature_review.tex`:9–15 with an explicit narrowing sentence at `:12–14`. It asserts the general context rather than surveying it — a narrow mouth, not an absent one. **Recommended, not mandated.** Widening: ~200–250 words |

## 1.3 The criterion nobody has been tracking — **R109**

### R109 · "The Conclusions revisit the general aim" — **UNDISCHARGED**

`conclusion.tex` contains **zero occurrences** of *aim*, *aims*, *enough data*, or
*proactive intervention layer*. Chapter 6 revisits the three **deliverables** (§6.1) and the
five **contributions** (§6.2). It never revisits the general aim as §1.3 states it —
*"whether an operational estate of three hospitality venues holds enough data to support a
proactive intervention layer"* — and never delivers the verdict on it.

The issued guidance is explicit: *"revisit the general aim of your research and each of
your objectives, **reflecting on whether you have achieved your general aim, or not**."*

**This directly contradicts 8E's closing claim, "No criterion in this document is now
undischarged."** That claim was made after discharging R114 and was not re-derived over the
other seven Conclusions criteria. It is an enumeration quoted forward across a phase that
composed new material — the exact failure `PRJ93_RULES.md` names.

**The sentence already exists elsewhere.** `abstract.tex`:207–210 answers the aim:
*"An estate this size can establish what is normal and how far a day departs from it, but
not that the departure is worth raising."* Chapter 6 is the location-bound site and does not
have it.

**Cost: ~35–45 words**, at the head of §6.1 or as the close of §6.2. Affordable inside the
39-word margin at the low end; comfortably affordable with any of §4's funding.

## 1.4 The remaining THIN criteria, with word cost

> **RE-WEIGHED 2026-08-12 against the provenance audit. Read this before pricing anything below.**
>
> | Row | Now | Why |
> |---|---|---|
> | **R30 / R31** | **NOT A REQUIREMENT** | The issued source: *"you **may elect to have** sections describing the data and data source and the exploratory data analyses."* Its only other appearance is inside a *"for example"* in the 60–69 band. **~300 words and one figure cancelled.** The remark at :640 that the band *"names EDA explicitly"* is true and incomplete — it names it inside an illustration |
> | **R36** | advisory | Same *"for example … e.g."* bracket. ~25 optional |
> | **R71** | advisory | Source: *"(**typically** numbered)"*. Already discharged at ~0 cost in 8F |
> | **R75 / R76** | advisory | Source: *"This chapter should, **as appropriate**, detail … (**e.g.** cleaning, removing outliers, integrating data, engineering of features etc.)"* — an "e.g." list inside an "as appropriate". **~380 no longer owed** |
> | **R77** | advisory | *"(including precise details of the software and libraries used, **if appropriate**)"*. Note R78's *"and versions"* appears in **neither** document |
> | **R85** | advisory | The six-part split comes from *"you **may elect to have** …"* |
> | **R63** | `[I]` | No source sentence. Sound practice, not a debt |
> | **R108** | stands, ~35 | Hedged *"should"*, but a genuine significant difference |
> | **R68** | stands | The one Methods criterion both documents state plainly. But the reconciliation gap is **location, not absence** — `results.tex`:148–152 gives the test, α, node count and 56 held-out observations — so a pointer may discharge it far below ~350 |
> | **D7** | **stands, and rises to first** | **EXACT and verbatim.** With R66 and R84 withdrawn it is the only Distinction-band item in the set with a real warrant |
>
> R56, R89/R90/R91 and R102 are unaffected. Working: `ledger/criteria_provenance_audit.md`.

| Criterion | Verdict | Where | Cost to discharge |
|---|---|---|---|
| **R30 / R31** exploratory data analysis present, leading to model/hypothesis formulation | **THIN** | Zero occurrences of *exploratory*, *data exploration*, *descriptive statistic*, *summary statistic* in any chapter. **No figure in the document shows the raw demand series** — 11 figures, none of the data. §3.3's demand-pattern classification and `tab:venues` do EDA work but are never presented as such | ~300 words + one figure (caption counts). The marking guide's data-analytic route names *"data exploration and visualisation"* by name |
| **R36** model fit assessed | **THIN** | No residual diagnostics, goodness-of-fit or Ljung-Box language anywhere. Discharged obliquely by §4.2.1's unbiasedness test and the rank-uniformity diagnostic | ~25 words framing those two as the fit assessment |
| **R68** replication sufficiency | **THIN** | **Hierarchical reconciliation has no Methods section at all** — it ships, is measured over 41 nodes, is tabulated in an appendix, and survives in Chapter 3 only inside a figure caption (`:360`). Also: VUS-PR absent from Ch 3; the intervention layer's language model is named nowhere in the document | ~350 + ~120 + ~30 |
| **R71** model definitions numbered | **THIN** | Six numbered. Three central ones inline and uncitable: the split-conformal half-width (`methodology.tex`:348–350) — the definition the whole deviation layer rests on — the CUSUM recursion (`:415–416`), the persistence rule (`:419–420`) | **~0 words.** Three `\begin{equation}` promotions |
| **R75 / R76** data integration, feature engineering | **THIN** | No join keys, timezone alignment, venue-to-weather-station matching, or missing-value policy; lag set never specified (*"its own lag features"*) | ~200 + ~180 |
| **R77** precise software | **THIN** | Body names no software, defers to Appendix B, **and the appendix delivers** (Python 3.12.13, device, platform). Two survivors: the agent's language model is unnamed; TSB-AD 1.5 appears only in a trace comment | ~40 |
| **R85** components separated | **THIN** | Five of six clean; **no EDA component**; reconciliation has none | folded into R30/R68 |
| **R89 / R90 / R91** data items, model properties, how set | **THIN** | Derived populations sized everywhere; **the series itself is never sized in Results** (399/386/331 sit only in `methodology.tex`:56–58). Nine ladder rungs named by label, not property. One tuning disclosure exists and it is in a caption (`:616–617`) | ~25 + ~40 + ~45 |
| **R102** Results state what findings imply for the RQs | **THIN** | Four of five pass. **RQ5 thin** — §4.5 reports the degeneracy but never states the implication for whether the output justifies surfacing; that verdict appears only at `discussion.tex`:84–85. §4.5.5 states no implication at all. No Results section names its RQ | ~30–45 |
| **R108** scope divergence explained | **THIN** | §5.5's six are traceable, but the **four-domains-to-two divergence is declared only in `methodology.tex`:83–85 and never in §5.5** | ~35 |
| **R61** how this work overcomes the limitations it identifies | **THIN** | Two of four overcome; the headline limb is instrumented, not overcome, and honestly so | ~120 to make the per-limb split explicit at §2.8's head rather than its tail |
| **R63** the gap elicited is the gap the method fills | **THIN** | Two of four limbs narrower in delivery than statement. Ch 2 demands *"an $F_\beta$ whose $\beta$ is fixed from an operator's elicited ratio"*; Ch 3 ships a **sweep** and defines no $F_\beta$ anywhere | ~90 to scope the proposition, ~130 to relate the demanded measure to the shipped grid |
| **R56** chapter-by-chapter overview | **THIN** | Describes Chapter 6 as three sections; it has five | ~8 |
| **D7** explicit discussion of why the approach is better than alternatives | **THIN — and this is the Distinction-band exposure** | `discussion.tex`:131: *"Five smaller divergences are **stated without further argument**."* The document declares the shortfall in its own words. Mitigated by R83/R84, which are **PASS (strong)** in Methods — rejections are named, costed and refused with reasons | ~150–200 to argue two or three of the five. **The most expensive item in this audit** |

## 1.5 What is strong, said plainly because an audit that only lists faults miscalibrates the reader

**R83/R84 (justify each decision; justify why alternatives were rejected) are PASS-strong**,
including several refusals that cost the work its own headline: *"Integrating over the
emitted quantiles was declined because it would change the served model after the evaluation
was frozen"* (`methodology.tex`:194–195). **R82 (bias reflection) is PASS-strong** — the
detection numbers are declared upper bounds at `:478–483`, against the candidate's interest.
**R78 is PASS with a distinction-level treatment**: versions are not merely promised, and the
pinning is justified by a measured rerun that *reverses which model is served*
(`appendix/pseudocode.tex`:34–37). **R67 (preprint flagging) is PASS** with nine inline flags,
and the flag is carried into the gap claim that depends on it (`literature_review.tex`:303–305).
**R59 (critical writing) is PASS-strong.** **R103–R107 are all PASS**, with the
problem-versus-circumstance split in §5.4 an unusually disciplined piece of limitation
writing.

## 1.6 Three enumerations in the ledgers are stale, and one points at a section that does not exist

Recorded because the brief asked me not to trace against 05's derived map, and this is what
that derivation dropped.

1. **"R100's only site is §4.4.6."** Carried in `reduction_cost_register.md` and
   `BLOCKED_third_party.md`. **There is no §4.4.6.** §4.4 has five subsections; the Winkler
   section is §4.4.5. R100 is **PASS** with at least seven sites (§4.1.3, §4.1.4, §4.2.3,
   §4.2.4, §4.3.1, §4.3.2, §4.4.5).
2. **"R114 undischarged"** — §1.1b of the authority file. Stale (M2).
3. **"19,000 hard ceiling, this does not move again"** — §1.1. Withdrawn in a different
   store (M1).

---

# 2 · PASS 2 — SIMULATED VIVA

Ten questions the document cannot currently answer well, **ranked by how likely an
examiner is to ask**, not by severity. Each says whether the fix is a text change, a
restored passage, or no longer available, and whether the appendices answer it.

---

**Q1. "Your Chapter 2 says the empty cell of the gap map is the one this work occupies.
Which of your results occupies it?"**

*Likelihood: highest.* The examiner's own prior report says it: *"An examiner reads the
synthesis first and checks it last."*

`literature_review.tex`:303 — *"the empty cell is **the one this work occupies**"* — and the
caption at `:312–313`, *"The empty top-right cell is **the gap this work occupies**."*
`conclusion.tex`:194 says that same empty cell is **further work**: *"The empty cell of
Figure~\ref{fig:gap-map} is an evaluation against the accept-or-dismiss judgements … the
apparatus exists and needs a credential and a period of the operator's attention."*

**The document contradicts itself about its own central claim, and the caption is the worse
of the two sites because it reaches the List of Figures and is read standalone.** The
graded-strength qualification does sit twenty lines later at `:321–325`, which is the
supersession-in-the-wrong-place pattern: no reader of the caption meets it.

**Fix: text change, ~6 words.** *"the one this work's apparatus targets"* / *"the gap this
work specifies apparatus for and does not close"*. **Take this first.**

---

**Q2. "Your aim was to determine whether a three-venue estate holds enough data to support a
proactive intervention layer. Did it?"**

*Likelihood: very high — it is the standard closing question, and R109 is the criterion
behind it.*

Chapter 6 never answers it (§1.3 above). The candidate can answer from the abstract, but the
examiner is reading Chapter 6.

**Fix: text change, ~35–45 words.** Not in the appendices.

---

**Q3. "You disclose that your headline confidence sets inherit a numerics sensitivity you did
not test. Why didn't you test it?"**

*Likelihood: high.* `results.tex`:113–115 says it outright: *"these sets inherit the numerics
sensitivity Section~\ref{sec:res-winkler} demonstrates for the interval methods, which has
been shown for the conformal arms and **not tested here**."* Where it *was* tested it moved
two verdicts at Two River Taps (`discussion.tex`:182–199).

**What the document can still say, and it is a good answer:** the sensitivity is bounded and
diagnosed — a *p*-value near 0.19 carries a Monte Carlo standard error of ~0.0124, so the
0.155 move is ~12× resampling noise and what moves the verdict is a third-significant-figure
perturbation crossing a fixed threshold; under a true null a confidence-set *p*-value is
near-uniform, so a move of that size is unremarkable. And the disclosure is voluntary.

**Fix: no longer available — it is a rerun, and rerunning an experiment is a human gate.**
Answerable in speech only. **This is the question with the largest gap between what is
disclosed and what is settled.**

---

**Q4. "The research schema was never provisioned, so you assembled the corpus and then
evaluated on it. What external validity does any number in this document have?"**

*Likelihood: high.* The document answers this **well and first**: `discussion.tex`:307–312
calls it *"the divergence with the widest consequence: the external validity of every figure
is untested, because the data was prepared by the same work that evaluated on it and no
independently provisioned copy exists against which the preparation could be checked."*
Repeated as an internal-validity threat at `:257–260`.

**Fix: none needed.** The follow-up to prepare for is *"then what generalises?"* — and the
honest answer is in `conclusion.tex`:225–229, the audit-rate lesson, which is explicitly
narrow.

---

**Q5. "Which venue fails calibration, and why did an earlier version of this work name a
different one?"**

*Likelihood: high, and answering it well is a credit.*

**Answerable, and the answer is a genuine finding.** The marginal coverages
(`tab:coverage`: 0.871 / 0.914 / 0.963) make the Beer Hall look like the under-coverer.
Breaking the mixture open by whether the venue traded inverts it: Ellel covers **0.692** on
its 240 trading pairs — about seven standard errors, the largest miscalibration in the study
— while the Beer Hall's trading days sit within a standard error of nominal
(`tab:coverage-traded`, `results.tex`:451–465). The earlier draft named the Beer Hall because
it read the marginals, which average 945 non-trading days into Ellel's figure.

**But see Q6 — one sentence in Chapter 5 still speaks in the superseded frame.**

---

**Q6. "Your own rank-uniformity instrument — does it separate the venues or not?"**

*Likelihood: high if the examiner reads §5.4 against §4.4.3, which is what a careful one
does.*

`discussion.tex`:263–265: *"Exchangeability … **fails the coverage test at two of three
venues** … on rank uniformity, the instrument this work adds, **the departure at Ellel equals
the Beer Hall's rather than separating the venues**."*

`tab:exchangeability` and `results.tex`:517–521 say the opposite on the population the
chapter's conclusion rests on: trading-day mean ranks **0.5199 (Beer Hall) vs 0.8127
(Ellel)**, and *"The mechanism then predicts each venue's trading-day coverage in both sign
and rough size."*

**The Discussion sentence preserves the marginal reading that §4.4.2 explicitly supersedes,
and it asserts that the work's own added instrument fails to do the thing the work claims for
it.** Read literally, *"two of three venues"* names the Beer Hall and Two River Taps — the
pre-decomposition verdict.

**Fix: text change, ~30 words.** **The most damaging single sentence in the document**,
because it is self-undermining and sits in the limitations section where an examiner looks
for candour.

---

**Q7. "Five of your six divergences from the literature are stated without argument — your
words. On what basis should I accept them?"**

*Likelihood: moderate-high.* `discussion.tex`:131. This is D7, the named and separable
Distinction requirement.

**What the document can still say:** R83/R84 are discharged strongly in Methods, so the
*decisions* are argued even where the *divergences* are only stated; and two of the six —
the ranking reversal and adaptive calibration — **are** argued at `:108–129`, the latter
with Zaffran's licensing condition.

**Fix: restored passage, ~150–200 words.** The material was removed by 8D row 25 (~350
words). **Partly answerable from the appendices** — Appendix D carries the demoted divergence
arguments per the 8E reclassification.

---

**Q8. "Your specification promised an agent and manager feedback. Both are unmeasured. What
in this dissertation is evidence that the intervention layer would work?"**

*Likelihood: moderate-high, and the honest answer is the strength.*

**Nothing, and the document says so at every site** — `abstract.tex`:207–210,
`introduction.tex`:155, `discussion.tex`:236, `:314–317`, `conclusion.tex`:152.
`conclusion.tex`:22–23 opens the chapter with it.

**Fix: none.** One wording inconsistency at §3.3 below.

---

**Q9. "Show me your exploratory data analysis. Where is the plot of the raw series?"**

*Likelihood: moderate — higher with a marker following the data-science-pipeline text of the
60–69 band, which names EDA explicitly.*

There is none (§1.4, R30/R31). Eleven figures and not one shows the data.

**Fix: text change plus a figure, ~300 words + caption.** **Not answerable from the
appendices** — `tab:venues` and `tab:bases` do EDA work but are embedded in other arguments.

---

**Q10. "You analysed 735 chat messages written by named employees of a named company. Where is
your ethics approval, and what did you tell those staff?"**

*Likelihood: moderate, and rising the moment a marker notices the corpus is human-authored
workplace text.*

**The document says nothing either way.** Zero occurrences of *ethic*, *consent*, *GDPR*,
*anonymis*, *data protection* or *confidential* in any `.tex` file (§0.2a, HC60/HC61). The
partner is named on the title page.

**What the document can still say:** `appendix/pseudocode.tex`:281–302 does treat the corpus's
provenance carefully — *"the write path does not belong to the author. Staff compose the
messages the signal reads"* — and bounds the exposure with three stated properties. That is a
security argument, not an ethics one.

**RULED 2026-08-11: no statement is written. The question stays on this list anyway, and that
is the point of separating a viva risk from a rubric item.** The rubric does not compel an
ethics statement — HC60/HC61 are withdrawn, see the correction in §0 — so nothing is owed to a
marker. An examiner in a viva is not marking against HC60; they are asking a person about
people. The honest answer is available and does not need to be in the document: an application
was prepared covering this corpus, the analysis is aggregate, no individual is identified, and
the one quoted example is paraphrased — all of which the document already demonstrates even
though it never says so.

**Fix: none in the text.** The exposure that remains is conversational, and the material to
answer it is `brain/docs/ethics_form.md` rather than any chapter. **Not answerable from the
appendices**, and after this ruling it does not need to be.

---

*Two questions that were on the list and are now answered, recorded so the work is visible:*
**the seven-day horizon cap** (HIGH row 18) — 8E reworded 4.4.6 to *"the cap stands as a design
parameter of this evaluation rather than as one of its findings"* and verified the 181-to-224
growth is asserted nowhere else; and **"where is the LLM?"** — the questions were rewritten to
what the artefact answers.

**Two more the examiner will reach if they open the appendices, both from §4.0:** *"Your
Appendix B justifies running both detectors on 8 false alarms against 124 misses — is that not
the figure you withdrew?"* (I1), and *"Section 3.10 says a reader can reproduce every number.
Which numbers?"* (I3). Both are text changes and both are cheap.

---

### The HIGH-block removals, one line each, since the brief asked for them by row

| Row | An examiner would ask | What the document can still say |
|---|---|---|
| **17** knowledge-gap signal | *"Your spec names four data domains. Where are the other two?"* | **Reversed by 8E.** Specification and measurement in Appendix B `app:gap-signal`, three body pointers (§3.1, §4.5.5, §6.1.1). Answerable |
| **18** per-step half-width null | Q10 | Repaired by 8E ruling 1 |
| **19** native model intervals | *"You tested a published interval finding and it is not in the document."* | Trading-day corroboration survives at §4.4.4; per-arm figures in Appendix D. The **evidence** is present, the **replication claim** is not. Answerable from the appendix |
| **20** §2.2 removal | *"Why must a foundation model beat a simple one?"* | Argues twice — `literature_review.tex`:20–21 and `:37–39`. Thin, not absent. **But see F1: this is not where R66 actually fails** |
| **21** magnitude gradient | *"How does detection vary with event magnitude?"* | `fig:sensitivity` shows catch rate rising with magnitude (`results.tex`:726). The **second statistic** (0.375/0.500/0.333 against 0.958–1.000) is gone. Partly answerable |

---

# 3 · PASS 3 — CLOSING THE ORIGINAL EXAMINER REPORT

`Prj93_external_examiner_assessment.md` predates the entire rewrite and evaluates an
earlier `Related_Work_Chapter.tex` plus the code at `d40dea7`. Nothing has checked it end to
end since. **19 findings, 7 viva questions, and the §7 chapter critique, all adjudicated.**

## 3.1 The nineteen findings

| # | Severity | Weakness | State | Closing passage |
|---|---|---|---|---|
| 1 | Fatal | Two MASE denominators; MASE wrong for intermittent series | **CLOSED** | Headline moved to a squared scaled measure eliciting the mean (`results.tex`:65–67); all four denominator readings computed and tabulated (`tab:bases`, `methodology.tex`:135) |
| 2 | Fatal | RQ names an LLM agent; no LLM in the system | **CLOSED** | The research questions were rewritten to what the artefact answers (`introduction.tex`:129–143); the agent is declared built-and-unrun at five sites; HC59 divergence at `discussion.tex`:314–317 |
| 3 | Major | Bare argmin, no dispersion, no test | **CLOSED** | Model confidence set over 273/260/205 origins (`tab:mcs`); `results.tex`:39–41 states the HLN factor is identically zero at six folds |
| 4 | Major | 42 consecutive days, six adjacent folds | **CLOSED** | 273/260/205 rolling origins (`methodology.tex`:316–317) |
| 5 | Major | Injection perturbs the residual stream; recall is an upper bound and is not declared | **CLOSED** | Declared in terms: `methodology.tex`:478–483 *"Recall and latency measured on that corpus are therefore upper bounds"* |
| 6 | Major | N=0 labels, no ECE, state-log-versus-code conflict | **CLOSED as disclosure** | `discussion.tex`:235–244; ECE *"implemented and never run"* |
| 7 | Major | Weather trained on hindcast, asserted to match serving | **CLOSED** | Four weather bases separated by availability lead (`tab:weather`, `methodology.tex`:229–258) |
| 8 | Major | Rhythm from sales only; four domains promised | **PARTLY CLOSED** | `methodology.tex`:83–85 declares two of four and names the knowledge-gap signal. **Open: §5.5 never declares this divergence** — see R108 |
| 9 | Major | Coverage 1.00 reported as success; violates the two-sided bound | **CLOSED** | Full per-venue calibration audit with Clopper–Pearson, Winkler and width (`tab:coverage`, `tab:winkler`) |
| 10 | Major | Transfer heuristic; gate wording excludes the venue where it lost | **CLOSED** | Declared **not evaluable** with the reason, `discussion.tex`:321–323 |
| 11 | Minor | £403.31 reconciliation delta unexplained | **OPEN, and invisible** | Zero occurrences of `403` in any chapter or appendix. Never surfaces in the document |
| 12 | Minor | TRT VAT assumption right, method wrong; left "owner to confirm" for months | **CLOSED** | VAT treatment stated in Methods (six sites) |
| 13 | Major | L1 series intermittent; whole stack assumes continuous demand | **CLOSED** | `tab:intermittency`, *"All three are erratic or lumpy and none is smooth"* (`results.tex`:163–164) |
| 14 | Major | Chronos-2 called with a group of size one | **CLOSED** | Cross-series in-context learning arms U/G2/G3 measured (§4.3.1, `tab:group`) |
| 15 | Major | Ellel has no occurrence information; booking diary not in the dataset | **CLOSED as disclosure** | `discussion.tex`:223–227; further work at `conclusion.tex`:185–192 |
| 16 | Major | Related Work misstates Sun & Yu's theorem | **CLOSED** | `literature_review.tex`:187–192 states the guarantee correctly; `discussion.tex`:139 *"\citet{sun_conformal_2025} supplies motivation alone, so no theorem of theirs bounds the coverage reported here"* |
| 17 | Major | Synthesis claims an intersection PRISM already occupies | **CLOSED** | PRISM named and positioned (`literature_review.tex`:292–296): *"No claim of methodological novelty in cost-sensitive intervention is therefore available, and none is made"* |
| 18 | Minor | Citation key `faw_-context_2025` — wrong first author and year | **CLOSED** | Zero occurrences. The key is now `das_-context_2025` (`literature_review.tex`:32) |
| 19 | Minor | Intermittency constants 1.32/0.49 rather than 4/3 and 0.5 | **CLOSED** | Kostenko cited in Ch 2, Ch 3 and Ch 4; `4/3` used across chapters and appendices |

**Sixteen closed, two closed-as-disclosure, one partly closed, one open and invisible.**

## 3.2 The seven viva questions the report said the work could not answer

| # | Question | State |
|---|---|---|
| 1 | Show me the denominator in each; what is July on the backtest's ruler? | **ANSWERABLE.** `tab:bases` computes all four readings; the July confrontation is no longer a headline |
| 2 | SD of ETS across folds; can you reject equality at n=6? HLN factor? | **ANSWERABLE, and the document volunteers it** — `results.tex`:39–41, HLN identically zero at six folds |
| 3 | Point me at the LLM. What happens to your research question? | **ANSWERABLE.** The questions were rewritten; the agent is declared unrun |
| 4 | What happens to recall when the forecaster can chase the shift? | **ANSWERABLE.** Declared an upper bound, `methodology.tex`:478–483 |
| 5 | How many manager judgements, and what is your ECE? | **ANSWERABLE.** Zero and not computed, stated at five sites |
| 6 | Read me Sun & Yu Prop 4.1 and Thm 4.2 | **ANSWERABLE.** `literature_review.tex`:187–198 |
| 7 | How many series are in the Chronos-2 group? | **ANSWERABLE.** §4.3.1 measures group arms |

**All seven are now answerable.** That is the clearest measure of what the rewrite bought.

## 3.3 §7's chapter critique

| Item | State |
|---|---|
| 7.1 synthesis over-claims three legs + PRISM | **CLOSED** on all four legs — **except the residue at Q1**, `literature_review.tex`:303 and the caption, which still say the work *occupies* the cell |
| 7.2.1 VUS-PR promised, never computed | **CLOSED.** `tab:vuspr`, §4.4/§4.5 |
| 7.2.2 ECE promised, absent | **CLOSED as disclosure** |
| 7.2.3 Ask-F1 sweep degenerate | **CLOSED, and reported as the finding** — `results.tex`:772 *"The apparatus is sound and the measurement is degenerate"* |
| 7.2.4 memory architecture promised, absent | **CLOSED.** `literature_review.tex`:215–217 narrows the claim: *"a rhythm can serve as a model of normality without constituting a memory architecture in the sense these authors describe"* |
| 7.3 conformal arc argues against the candidate's own data | **CLOSED.** `discussion.tex`:119–125 reports adaptive calibration underperforming and reads Zaffran's licensing condition |
| 7.4 Chronos-2 cited once in a parenthetical pile | **CLOSED.** `literature_review.tex`:41–43 gives it a real treatment |
| 7.4 **CUSUM absent from the chapter entirely** | **CLOSED.** `literature_review.tex`:172–178 — the acronym never appears in Ch 2, but the method is named as *"the cumulative-sum scheme of \citet{page_continuous_1954}"* and Page's average run length is used as the judging criterion at `:261`. **An acronym-only grep returns a false absence here; this was checked under both namings** |
| 7.4 Croston set up for adoption, result is non-adoption | **CLOSED.** `literature_review.tex`:90–95 forward-references the limitation |
| 7.4 no search protocol | **OPEN, declared** — F5 |
| 7.4 verification-log header asserts an artefact that may not exist | **CLOSED.** No such header survives |
| 7.4 preprint density unflagged in the synthesis | **CLOSED.** Nine inline flags; the gap claim carries its own preprint caveat at `:303–305` |

---

# 4 · THE WHOLE-DOCUMENT CHECKS

## 4.0 Three integrity defects that only a whole-document pass reaches

### I1 · A **withdrawn** claim is live in an appendix float, and it is load-bearing there

`figures/alg_detection.tex`:98–99:

> *"Running both and reporting either is a deliberate bias towards recall, **which the estate's
> measured error profile supports: 8 false alarms against 124 misses**."*

That file is `\input` at `appendix/pseudocode.tex`:96, so **it renders in Appendix B**.

**The 8:124 pairing was withdrawn on 2026-08-08** as a confusion matrix over two populations:
the 8 is a fatigue count on **un-injected** windows; the 124 misses come from the
644-injection corpus. The corpus-internal figure is **75**. The retraction is documented four
times — `abstract.tex`:39–52, `results.tex`:789–795, `discussion.tex`:97–99,
`conclusion.tex`:148–149 — and the claim was repaired in **every chapter**.

**It survives verbatim in a live float, where it is used to justify a design decision.** This
is the withdrawal rule failing on its own stated ground: *retract everywhere the claim was
**asserted**, not only where it was recorded* — and *grep for the claim, not for the file you
wrote it in*. The sweep covered `chapters/`, `abstract.tex` and `appendix/`. **`figures/` was
never scanned**, which is the same scope defect as `venueordercheck` never having read the
appendices.

**Cost: ~6 words**, or delete the clause. **Highest priority after M0**, because an examiner
who finds a retracted statistic still doing work reads it as an integrity question rather than
a tidiness one.

### I2 · Two appendix cross-references resolve and are **false**, and one target pre-emptively denies its own claim

Checked target-side by naming the promised noun and grepping the target, per the
resolving-versus-true rule. **38 body `\ref{app:*}` sites examined; 35 discharge correctly,
including nine repaired since the 2026-08-09 sweep. Two are false.**

**I2a — `results.tex`:600.** Promises Appendix D holds native-band **ninety per cent**
trading-day coverages of **0.904 / 0.651 / 0.935**, offered as corroboration *"from outside the
construction"*. `tab:native-interval` (`appendix/tables.tex`:117–129) is at nominal **eighty**
per cent, and its trading-day column reads **0.779 / 0.447 / 0.815**. The promised triple
appears **nowhere in the document**. Appendix D concedes the gap without filling it
(`:200–202`): the comparison *"is therefore made at nominal eighty per cent where both models
are evaluable, and only Chronos-2 is read at ninety."*

**I2b — `results.tex`:113.** Promises Appendix C shows *"the Two River Taps incumbent does not
survive every length swept"*. `appendix/robustness.tex`:212–218 says the opposite in terms:
*"the per-length set memberships **at the other two venues** … **are not preserved in a
committed artefact, so they are not reported here**"*, and explicitly disclaims *"the stronger
claim that every venue's set has been characterised at every length."* The same unsupported
claim is restated at `appendix/tables.tex`:170–171.

**Both sit on qualifications that exist to bound a headline result**, so the failure direction
is against the candidate: the document qualifies itself using evidence it does not have.

**Cost: ~30 words**, or withdraw the two claims — which is cheaper and is what the appendices
support.

### I3 · The unmeasured apparatus reads as measured in the two places that specify it

Check 1 below found the canonical qualifier at nine of eleven sites. **The two that carry none
are the two that describe the apparatus in full**, and both were outside every prior sweep,
which scoped itself to the chapters carrying the contribution strings.

- **`appendix/pseudocode.tex`:255 — the worst single sentence on this limb.**
  *"Every response is cached on disk … so **a reader without a credential can reproduce every
  number**."* There are no numbers. N = 0, the apparatus has never run, and nothing in that
  subsection says so.
- **`methodology.tex`:498–516 (§3.10).** Wholly present indicative — *"the agent returns a
  probability"*, *"the decision threshold is swept over a pre-registered cost-ratio grid"*.
  The nearest thing to a qualifier is *"Two limits bound what the apparatus **can
  establish**"*, which bounds a future measurement rather than reporting an absent one. **A
  reader meeting Chapter 3 alone concludes the sweep was run.**

**Cost: ~20 words across the two sites.**

## 4.1 Graded-strength wording for the unmeasured limb — **one site of five is weaker**

`introduction.tex`:160–162 asserts the canonical form *"specified and frozen and has not been
run"* is *"deliberately identical at all five sites"*. **It is not.**

| Site | Wording | Carries the qualifier? |
|---|---|---|
| `abstract.tex`:210 | *"specified and frozen and has not been run"* | yes |
| `introduction.tex`:155 | *"which is specified and frozen and has not been run"* | yes |
| `discussion.tex`:236 | *"complete, tested and frozen by commit ordering, and has not been run"* | yes |
| `discussion.tex`:314–315 | *"built, frozen and unmeasured"* | yes |
| `conclusion.tex`:152 | *"is specified and frozen and has not been run"* | yes |
| `introduction.tex`:111–113 | *"a specified and frozen apparatus for obtaining them rather than the measurement itself"* | **no** |
| **`literature_review.tex`:324** | *"a specified and frozen apparatus for obtaining them **rather than the measurement itself**"* | **no — implies it, never states it** |
| **`methodology.tex`:498–516** | present indicative throughout | **NONE — see I3** |
| **`appendix/pseudocode.tex`:248–265** | *"a reader without a credential can reproduce every number"* | **NONE — see I3** |

**Eleven sites, not five. Nine carry the qualifier; two carry none.** Chapter 2's site does not
say *has not been run*, and it sits twenty lines below the *"this work occupies"* claim of Q1 —
**the two defects compound at the same location.**

One site claims **more** than the others: `discussion.tex`:236 says the apparatus is
*"**complete, tested** and frozen"*. No other site claims it was tested, and *tested* sits
oddly beside *never run*. ~2 words.

**Cost: ~5 words.** Also strike the false identity claim in the comment at
`introduction.tex`:160–162, whose line references (`literature_review.tex:479–483`,
`discussion.tex:371`, `:456`) are all **stale** — those files are now 328 and 323 lines.

## 4.2 The questions in 1.3 are the questions answered in 5.1 — **PASS**

Five for five, each answer opening with a verdict, in the order 1.3 states them.

| RQ | 1.3 | 5.1 opens |
|---|---|---|
| 1 | separability, and origin count | *"Mostly they cannot, and it does."* |
| 2 | estimand and reconciliation | *"The reconciliation is not admitted"* |
| 3 | weather or pooling | *"Neither is separable from the venue's own history."* |
| 4 | coverage, and the property behind the departure | *"It does not, and the property is exchangeability."* |
| 5 | detection under asymmetric cost | *"Not as the question poses it."* |

R7 and R8 are **PASS**, and D11 with them. The RQ4 *shortfall→departure* amendment holds at
both `introduction.tex`:139 and `discussion.tex`:64.

**One structural thinness:** no Results section names its research question, so the
one-to-one mapping the design rests on is asserted once in the chapter preamble
(`results.tex`:21) and never marked at the sections. ~15 words of section-head tagging.

## 4.3 Numeric consistency across chapters — **one hard contradiction, one rounding split**

- **`results.tex`:573 says the two Mondrian limbs "differ by about a factor of fifty in
  their counts"; `discussion.tex`:268–269 says "a factor of eleven".** Same two limbs, same
  phrasing. The stated counts support **eleven** (Ellel's 1,037 untraded calendar-open days
  ÷ the Beer Hall's 94 traded calendar-closed days = 11.0); *fifty* matches 1,037 ÷ the 21
  false-open **evaluation pairs**, a different population. **One is wrong. ~2 words.**
- `tab:coverage` gives 0.871 / 0.914 / 0.963; `tab:coverage-traded` "All pairs" gives 0.870 /
  0.913 / 0.962, and the prose at `:452` quotes 0.913 against its own table's 0.914. Same
  quantity, two roundings in adjacent floats. **~0 words**, one figure reconciled.
- `discussion.tex`:91 *"all four sit on the opposite side of the asymmetry"* — Results gives
  the range 1:1 to 10:1 and never a count of four.

## 4.4 Over-claims and dropped nulls

**Over-claims** (Discussion stronger than Results supports), beyond Q6:

- `discussion.tex`:270 *"a shorter calibration memory brings one venue **to nominal**"*
  against `results.tex`:576–577, which says it *"**helps** one venue, is neutral at a second
  and harms the third"*.
- `discussion.tex`:64–65 *"misses nominal at all three venues"* — on the marginal limb the
  binomial test reports Ellel **indistinguishable** from nominal (`results.tex`:396–398).
  Defensible via the traded limb, which the sentence has not yet introduced.

**Nulls reported in Results and absent from the Discussion** — this is the
compression-removes-negative-results pattern, and it was found by enumerating rather than by
reading:

1. **The strong null with a failed pre-registered prediction.** `results.tex`:684–688: the
   injection-realism discount is *"zero for every event kind, at a paired interval of
   $[0.0,0.0]$, and the pre-registered prediction … is not supported. The null is of the
   strong kind rather than the underpowered kind."* **Zero occurrences of *discount* in
   `discussion.tex`.** The cleanest strong null in the document, and a failed
   pre-registration, reaches no interpretive chapter.
2. Alert suppression after refit (`:751–760`) — no Discussion trace.
3. The occurrence-gate null at the Beer Hall (`:227–236`) — §5.1's RQ2 answer omits it.
4. The knowledge-gap signal (`:797–803`) — no Discussion counterpart.
5. The adoption-margin failure (`:206–208`) — not carried forward.

**Item 1 is worth ~25 words in §5.3 and is the highest-value of the five**, because a
failed pre-registered prediction reported by the candidate is evidence of exactly the
discipline the Distinction band rewards.

## 4.5 Notation, terminology, floats, citations

**Scope: 59 notation rows, 33 acronym rows, 37 floats, 301 reference sites over 135 labels,
86 distinct citation keys against 121 `.bib` entries.**

### Cross-references — clean at the *resolution* level

**301 `\ref` sites, 135 labels, zero unresolved and zero duplicate labels.** The scan must
include `figures/`: `alg:conformal`, `alg:adoption` and `alg:detection` are defined there and
referenced 21 times from `notation.tex`, so a scan omitting that directory reports **21 false
breaks**. Truth-level failures are at I2.

**The known-bad reproducibility reference is repaired.** `methodology.tex`:74–75 promises
*"Library versions, the model revision hash and the compute device"* in Appendix B;
`appendix/pseudocode.tex`:50–61 delivers Python 3.12.13, platform, device and nine pinned
versions. Verified target-side.

### The `active` hazard is **not** contained — it reaches the reader with four meanings

The project's own rule, quoted at `results.tex`:588–590, is that the word must not reach the
reader. **It was enforced in Chapter 4 only.**

| Site | Text | Population |
|---|---|---|
| `methodology.tex`:71 and `tab:venues` caption `:49` | *"trimmed to each venue's **active span**"* | first-to-last trading day — a **span**, a third meaning |
| `appendix/pseudocode.tex`:292 | *"across 25 **active days**"* | chat-corpus days carrying messages — a **fourth** meaning |
| `figures/alg_conformal.tex`:85 | *"splitting **active days** from structurally closed ones"* | **calendar-open** — and this directly contradicts Chapter 4's `active_only` = **traded** |
| `methodology.tex`:164–178, `appendix/tables.tex`:70–75 | `\texttt{calendar\_lag7\_active}` | opaque identifier; the reader cannot resolve which |

**Cost: ~10 words.** Rename in prose to *trading span*, *days with messages*, *calendar-open*.

### Symbol collisions — the repair recorded at `notation.tex`:8–13 is incomplete

Both survivors are in the same float, `figures/alg_detection.tex`, which is why the
chapter-scoped notation pass missed them:

- **`$h$`** — `notation.tex`:43 declares it *"the forecast horizon, **and only that**"*, and
  `:89` introduces `$h_{\mathrm{cs}}$` precisely so `$h$` can stay the horizon.
  `alg_detection.tex`:88 then uses bare `$h$` for the **CUSUM threshold**.
- **`$k$`** — `notation.tex`:74 = rank index of the conformal quantile.
  `alg_detection.tex`:97 uses bare `$k$` for **CUSUM's slack**.

Lesser: `$p$` is the average inter-demand interval in the table and a bare *p*-value at six
sites; `G` carries three referents in Chapter 4 (group count, the aggregated-ACI arm, the
grouping arms G2/G3); `$x_i$` is used in `alg_conformal.tex` and **defined nowhere**.

**Terminology drift:** the served interval carries six names across the chapters, and RQ4 and
RQ5 in §1.3 use two of them (*"a split-conformal interval"*, *"a calibrated interval"*),
neither of which is the name Chapter 4 uses (*"the served band"*). *"Average inter-demand
interval"* becomes *"mean inter-demand interval"* in `tab:intermittency` and *"average demand
interval"* in Appendix C — the last drops *inter-* and changes the meaning.

**Acronyms:** `CV` is listed and **never used anywhere**; `ADI`'s and `AI`'s first-use pointers
are wrong. 29 of 33 rows verified correct.

### Citations

**86 distinct keys cited; 121 entries in `ref.bib`; 36 never cited** (~30 %, harmless under
`biblatex` but `noauthor_full_nodate` is a malformed import that should not ship). One key
cited and undefined — M0.

**Preprint flagging is uneven where it matters most.** Nine inline flags in Chapter 2, and the
gap claim carries its own caveat. But **`stocker_gentle_2025` and `sun_conformal_2025` are both
preprints and are cited unflagged at `discussion.tex`:138–139** — the sentence carrying the
band's guarantee, where `stocker_gentle_2025` is named as the source of *"the finite-sample
marginal coverage within each group"*. That is the one place preprint status is load-bearing.
R67 is PASS in Chapter 2 and thin here. **~10 words.**

**One probable unmarked lift.** `literature_review.tex`:243–244 — *"judges must be validated
against human **judgments** before being used as evaluators"* — carries **US spelling in a
uniformly UK document**, and `methodology.tex`:514 paraphrases the same Bavaresco conclusion
with the UK spelling. The orthographic slip is the signature. Two further sites
(`:210–212`, `:226–228`) use *"argued to be"* / *"states plainly"* framings that promise the
source's words and then supply them unquoted. **Quote or re-voice: ~5 words.** Four genuine
quotations elsewhere are correctly marked.

### Floats

**37 floats: 11 figures, 23 tables, 3 algorithms. All 37 carry a caption and a label.** Caption
placement is perfectly consistent per type — **before** content in 23/23 tables, **after** in
11/11 figures. All 40 body float references are preceded by `Table~` or `Figure~`; **zero bare
`\ref`**, so HC46 is clean. **No figure shows the raw demand series** (§1.4, R30). Ten floats
are never referenced from body prose (HC43, §0.2a).

---

# 5 · RECOMMENDED ORDER OF REPAIR

Ordered by **marks per word**, which under a 39-word margin is the only sensible ordering.
**Nothing here has been applied.**

### Tier −1 — **the build. Nothing else matters until this is done**

| # | Repair | Words | Closes |
|---|---|---|---|
| **0** | **Commit `ref_additions.bib`, or move `vovk_algorithmic_2005` into `ref.bib` and delete `main.tex`:112. Then compile a FRESH clone that never held the file** | **0** | **M0** — HC52, HC53. The document on `origin/main` does not build |

### Tier 0 — free or nearly, and each closes a real defect (net ≈ +70 words)

| # | Repair | Words | Closes |
|---|---|---|---|
| 1 | `figures/alg_detection.tex`:98–99 — delete or replace the withdrawn *"8 false alarms against 124 misses"* | ~6 | **I1.** An integrity finding, not a tidiness one |
| 2 | `literature_review.tex`:303 and the `fig:gap-map` caption — the work **targets** the empty cell, it does not occupy it | ~+6 | **Q1**, examiner §7.1 residue |
| 3 | `discussion.tex`:263–265 — rewrite to the traded-limb reading; the instrument **does** separate the venues | ~+0/30 | **Q6**, the self-undermining sentence |
| 4 | `results.tex`:600 and `:113` — withdraw the two claims the appendices do not support | ~−30 | **I2**, and it *frees* words |
| 5 | `appendix/pseudocode.tex`:255 and `methodology.tex`:§3.10 — say the apparatus has not been run | ~20 | **I3** |
| 6 | `results.tex`:573 or `discussion.tex`:268 — reconcile *fifty* against *eleven* | ~2 | numeric contradiction |
| 7 | `literature_review.tex`:324 — add *and has not been run*; strike the false identity claim at `introduction.tex`:160–162 | ~+5 | graded-strength |
| 8 | Promote three inline formulas to numbered equations | 0 | **R71** |
| 9 | Unstar the 38 appendix headings; number the six divergences in §5.5; reconcile the 0.871/0.870 split; *cannister* → *canister*; `$h$`/`$k$` in `alg_detection.tex`; the four *active* sites | 0 | HC29, HC59, HC33, notation, the `active` rule |

### Tier 1 — cheap and criterion-bound (≈ +130 words, needs funding)

| # | Repair | Words | Closes |
|---|---|---|---|
| 8 | **Chapter 6 answers the general aim** | ~40 | **R109 — the undischarged criterion** |
| ~~9~~ | ~~One finding sentence each for `fig:ladder` and `fig:validity-efficiency`~~ **Optional style item — R96's per-figure quantifier is not the source's (2026-08-12)** | ~50 | ~~R96 FAIL~~ |
| 10 | Add the four-domains divergence to §5.5 | ~35 | **R108**, examiner F8 |
| 11 | Fix the Introduction's Chapter 6 overview | ~8 | R56 |
| ~~12~~ | ~~Ethics: cite the approval if it exists~~ | **0 — struck** | **RULED not compulsory, Phuong 2026-08-11.** HC60/HC61 withdrawn; the ~25 words go to R101 |
| 13 | Reference the three algorithm floats by number from Methods; `\ref` the seven orphan appendix tables | ~20 | HC43, R69 reachability |
| 14 | Flag `stocker_gentle_2025` and `sun_conformal_2025` as preprints at `discussion.tex`:138–139 | ~10 | R67 at its load-bearing site |
| 15 | Quote or re-voice the three unmarked-lift sites in Chapter 2 | ~5 | R118, R119 |

### Tier 2 — carry the failed pre-registration and the Results implications (≈ +100)

| # | Repair | Words | Closes |
|---|---|---|---|
| 12 | Carry the zero-discount strong null into §5.3 | ~25 | dropped-null bias, D8/D9 |
| 13 | §4.5 states its implication for RQ5; tag sections with their RQ | ~45 | **R102** |
| 14 | Frame §4.2.1 and rank uniformity as the fit assessment | ~25 | **R36** |

### Tier 3 — the expensive ones, in priority order, and each needs a funding decision

> **RE-PRICED 2026-08-12. Three of the five rows below are cancelled, and the priority order
> inverts.**
>
> | # | Row | Now |
> |---|---|---|
> | 15 | R66, Winkler and the one-standard-error rule argued in Ch 2 | **CANCELLED — R66 is `[U]`.** ~300 released |
> | 16 | R101, Methods specification of the calibration battery | **~40–60**, not ~180. Name each method and point at its definition |
> | 17 | D7, argue two or three of the five bare divergences | **~150–200, and now FIRST.** The only row here with a verbatim warrant |
> | 18 | R68, a Methods section for hierarchical reconciliation | stands; possibly far below ~350, the gap being location rather than absence |
> | 19 | EDA subsection plus a figure of the raw series | **CANCELLED — the source says "may elect to have".** ~300 and a figure released |
>
> **Tier 3 was ~1,280 words. It is now ~340–610, and its head is D7 rather than R66.** The
> paragraph below — *"Tier 3 is not affordable against the cap without a ruling"* — was written
> when R66 and the EDA row were in it. **Tier 3 is now affordable**: the document sits at 19,818
> against 20,000 after the appendix removal of the same date.

| # | Repair | Words | Closes |
|---|---|---|---|
| 15 | **Winkler score and the one-standard-error rule argued in Chapter 2** | ~300 | **R66 FAIL** — the two decision instruments |
| 16 | Methods specification of the calibration-diagnostic battery incl. VUS-PR | ~180 | **R101 FAIL** |
| 17 | Argue two or three of the five bare divergences | ~150–200 | **D7**, Distinction band |
| 18 | A Methods section for hierarchical reconciliation | ~350 | R68, R85 |
| 19 | An EDA subsection plus a figure of the raw series | ~300 + caption | R30, R31, R85 |

**Where the words come from.** The margin is 39 and Tiers 0–2 need about 275. Per the rule
that a deferral without a costed alternative is not a decision, the fundable candidates are:
§5.3's numbers-audit material already duplicated at §6.4; §5.1's remaining restatements of
Chapter 4 measurements (R103 requires the answers to be **there**, not to be long); and the
LOW-block exposition at §4.1–§4.5 that 8D priced but did not exhaust. **Appendix relocation
does not help** — appendices are outside the counted population, so moving body text there
buys the cap words but costs the marker's view, which is the D2 assumption still recorded as
unconfirmed.

**Tier 3 is not affordable against the cap without a ruling.** R66 and R101 are the two
outright FAILs among them; D7 is the Distinction-band item. That is a decision for Phuong,
and this audit does not take it.

**CORRECTION, 2026-08-12, appended rather than applied silently.** The paragraph above was used
as the plan for a de-duplication pass, and **two of its three funding candidates do not exist**.

- ~~*"§5.3's numbers-audit material already duplicated at §6.4"*~~ — **there is no such
  duplication.** Section numbering from `main.toc`: §5.3 is *Validity of the approach*, §6.4 is
  *Further work*. The numbers-audit passage occurs **once in the document**, at §6.5 *Closing*
  (`conclusion.tex:226-240`). What §5.3 has is a *trace comment* citing `numbers_audit.md` for a
  different quantity — the numpy-regime verdict flip — which is most likely what was seen.
- ~~*"the LOW-block exposition at §4.1–§4.5 that 8D priced but did not exhaust"*~~ — **exhausted
  before this audit was written.** `reduction_cost_register.md:599` records 8D taking ~900 words
  and states that what remains is *"findings, nulls, qualifications and traces"*.
- The third candidate, §5.1's restatements, is **real** and yielded ~64 of the 109 words the pass
  found. §5.1 is now 598 against the ruled ~500, and the remainder is not repetition.

**Two general faults, both already named in `PRJ93_RULES.md`.** First, the estimate *"~250–300
words of cross-chapter redundancy"* was quoted forward as though it were a count; **no passage
was ever enumerated**, which is why it could not be reconciled against the document. Second, the
brief that consumed this paragraph cited it as **§4.6** — *there is no §4.6 in this file*; it runs
§4.0–§4.5 and then the tier tables. A section number invented in transit is the *name degrades
where a path does not* failure, one file further on.

**The one it got right, and the one it got wrong, have the same cause.** An audit that names a
candidate without quoting it cannot be checked, so a real candidate and an imagined one are
indistinguishable to the next reader. Every row in the 8G harvest quotes both copies for exactly
this reason.

---

# 6 · WHAT THIS AUDIT DID NOT COVER

- **No compile**, so no tier-2 or tier-3 verification (§0.4). Every rendered-page criterion —
  float proximity, heading geometry, margin spill, page numbering, the List of Figures — rests
  on `formatting_pass_2026-08-11.md`, which is a different run from this one.
- **HC33 is a targeted probe, not a dictionary pass** — no `aspell`/`hunspell` available.
- **HC47** (tables authored rather than pasted) is inferred from `booktabs` markup.
- **HC62–HC70** (submission mechanics, viva, poster) are process items outside the document.
- **Appendix prose** was read where a body cross-reference pointed into it and where a check
  required the target; it was not read end to end.
- **Ethics: ruled out of scope by Phuong on 2026-08-11 and no statement is written.** The audit
  originally graded HC60/HC61 as mechanical failures; it should not have, and the correction in
  §0 traces the criterion to its single source and says why. What this audit never established
  — and still has not — is whether approval was *granted*, as distinct from applied for.

---

# 7 · THE ONE METHODOLOGICAL LESSON WORTH KEEPING

Four of this audit's most serious findings — M0, I1, the `$h$`/`$k$` collisions, and the
`active` breaches — share a single cause: **every prior sweep scoped itself to `chapters/`,
`abstract.tex` and `appendix/`, and `figures/` was never scanned.** The withdrawn statistic,
the two symbol collisions the notation table declares repaired, and one of the four `active`
breaches all live in `figures/`. M0's sibling failure is the same shape one level up: the
compile passed because an **untracked** file was in the working directory.

Both are the project's own recorded failure mode — *a check that examined nothing must not be
able to report a clean result* — and in both cases the check reported cleanly over a
**silently reduced population**. The remedy is the one already written down: **print the size
of what was examined.** A sweep that says *"scanned 18 files"* when the project has 24 is
legible; one that says *"PASS"* is not.
