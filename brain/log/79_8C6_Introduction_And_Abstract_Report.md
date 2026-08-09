# 8C-6 — Introduction composed, abstract revised

**Session report, 2026-08-09.** Chapter 1 composed to the approved tree; `abstract.tex` revised
against the finished chapters. Commits `eebf3e9` (Overleaf clone, **unpushed**) and `4fb1327f`
(`ai-gm.ai-master`).

> **Naming note.** This file is `_Report`, not `_result`. `brain/log/*result*.md` is the glob T1
> matches on when tracing a number to its source, and a session write-up must not enter that
> namespace. The session's own worst finding is what happens when something wrong sits inside it
> (see §5, `log/72`).

**Companion records, each owning a different question:**

| Store | Holds |
|---|---|
| `ledger/introduction_rewrite_critique.md` | the five critique rounds, remits quoted, the synthesis, the T1–T14 gate, the criterion trace |
| `ledger/BLOCKED_third_party.md` §F | what is open **now** |
| `ledger/phase_state.md` | the append-only session entry |
| `knowledge/05_paper_architecture.md` §4.5 | the Chapter 1 budget row |

---

## 1. Discovery report

**§F re-derived, not read forward.** `git ls-remote --heads origin` returned `49b8f01`, which is
what §F's current row claims. That row has stopped going stale. Four other things did not survive
checking.

| Claim as recorded | What I found |
|---|---|
| §F: *"Open rows … **2** — S-1 and S-3"* | Count of 2 is right, **one identifier is wrong**. S-3 is struck below as closed on Phuong's 2026-08-08 ruling; **S-4** is its live replacement |
| §F: Ch 3 floor **5,526** | **5,569.** Stale since `12f8cc7`, the *active/traded* sweep. Measured across commits: 5,526 at `fe7bd9a`, 5,569 at `12f8cc7`, unmoved since. Three later "RE-MEASURED" rows each re-ran `wordcount.py` on Chapters 2, 4 and 5 and **copied Chapter 3's forward** |
| §F: Ch 4 floor **7,712** | **7,701.** Not staleness, a transcription error. `results.tex` measures 7,701 at `29016e7`, the commit the figure came from, and 7,712 at no commit in the range |
| Brief: *"introduction.tex is three commented template lines"* | **0 bytes** |

The two floor errors are the pointer-not-copy rule at the head of §F failing **inside the row
whose own instrument line names `wordcount.py`**. §F's *"Five chapters measured … = 25,374"* is
understated by 32; the true figure is **25,406**.

### Not anticipated by the instructions

- **`completenesscheck` was 7 findings, not 6, and the Introduction accounts for two** — a CONTENT
  finding and a SECTION finding. It now reads 5, a drop of **two** rather than the expected one.
  The remaining five are all `acknowledgements.tex` and `publications.tex` template residue.
- **Commit `4e2d209` ("Update on Overleaf.", 2026-08-08) is an Overleaf web-UI write to
  `main.tex`**, against the adopted rule that the web UI is for compiling and reading only. It
  removed the template stub from the appendix block and **re-lettered the appendices**. Nothing
  broke, because every appendix reference is a `\ref{app:…}` and the letters followed
  automatically. What is now stale is `main.tex`:257–262, which still describes an Appendix A stub
  that no longer exists and warns against a re-lettering that has already happened, and `:273`,
  which still calls the last appendix "E". §F's own references to "Appendix E" mean **D**.
- **HC54 is unmet** — no project-specification appendix exists, and it is mandatory.
  **HC57 is violated** — the build puts appendices at pages 99–115 and References at 116. Both
  verified on the build; both document-level; neither Chapter 1's.

---

## 2. §4.5 as read

Six rows: Results 4.4, Results 4.1, Methods 3.3, Background 2.3, Discussion 5.4, and the
Conclusions row added last session. **There was no Chapter 1 row.**

That absence is the finding, and it is the *second* instance. §4.5 exists so a section that cannot
meet budget names its loss rather than exceeding it quietly, and it was missing the row for the
chapter about to breach — exactly as it was for Chapter 6 until 8C-5 went looking. **A section
with no row here has not been checked.**

**§4.5 also asserts the refuted claim.** `:1109–1111` reads *"What must survive at full strength
is the rank statistic reproducing published coverage to a thousandth"* — a **binding composition
instruction** in the file that governs composition. §F's sweep scoped itself to `chapters/`,
`abstract.tex` and `appendix/` and said so in terms; `knowledge/` was never swept. See §5.

The Chapter 1 row is now written, with the excess located and each part justified.

---

## 3. The composed Introduction

Full text at `chapters/introduction.tex`. Approved headings, unchanged. Measured **2,023** marker
words against a 1,400 budget.

| Section | Budget | Marker |
|---|---|---|
| 1.1 Operational forecasting in small hospitality estates | 300 | 354 |
| 1.2 Problem statement and knowledge gap | 300 | 472 |
| 1.3 Aims and research questions | 350 | 360 |
| 1.4 Contributions | 250 | 605 |
| 1.5 Structure of the dissertation | 200 | 233 |

**1.3** carries 06 §1's aim and 06 §5's five questions verbatim, plus 06 §4's narrowing sentence.
**1.4** carries all five contributions in 06 §6's fixed strings, with RQ2's reconciliation and
estimand limb inside C1 and C5's *"specified and frozen and has not been run"* in the same
sentence. **1.5** describes the tree as built, with the four appendices referenced by
`\ref{app:…}` rather than by letter — verified on the build as **A** Corpus search and screening,
**B** Method specifications and pseudocode, **C** Robustness and protocol detail, **D** Full
ladder and confidence-set tables.

### Two decisions taken under the standing authority, recorded rather than applied silently

1. **RQ4's fixed string.** 06 §5 reads *"accounts for the **shortfall**"*. The band misses nominal
   at all three venues in **both** directions, so "shortfall" presupposes an answer the evidence
   contradicts. `discussion.tex:86` already writes *"departure"*, so the amendment **serves** R8
   rather than breaking it: 1.3 and 5.1 now agree. This is the same defect the C3 amendment
   corrected in §6; the identical presupposition survived one file away, and §5's rationale note
   still reads *"the answer is that it fails at one venue"*.
2. **C3's "reproducing the measured coverage" is not written.** 06 §6's *amendment* governs over
   its own unamended fixed string. Reasoning in §5 below.

---

## 4. The abstract's revision

Two rounds. **300/300 marker words, one paragraph, `venueordercheck` still clean.**

### Confirmed unchanged — three of the four revisions the brief expected were already live

| Checked | Source (artefact, not chapter) | Verdict |
|---|---|---|
| Correct venue as calibration failure | `recompute_set.md` R30: BH 0.8918 (z −0.93), Ellel 0.6917, TRT 0.9635 | Already reordered; names **no** venue, reports 69 % |
| Detector counts 124:75, not 124:8 | `agent_eval.json` `detection.overall`; `recompute_set.md` §A | Already corrected |
| *"the only **no-weather** contrast excluding zero"* | `weather_basis_mcs.json`: **five** contrasts exclude zero estate-wide; only the Beer Hall's N–M involves the no-weather arm. The other four (Ellel O-F, H-F, H-M; TRT O-H) are basis-versus-basis | Qualifier true and **load-bearing** — dropping it makes the sentence false |
| Whether withheld numbers stay withheld | one positional triple per paragraph; `venueordercheck` grades on two or more | Stay withheld |

### Changed, with the source for each

| # | Change | Source |
|---|---|---|
| 1 | *"predicts all three"* → *"predicts each in sign and rough size"* | 06 §6 C3 as amended; B13's 0.00114 / 0.00121 / 0.00157 |
| 2 | *"at full strength"* → whole closing sentence replaced after critique | C4 is *"Full on the measurement, **qualified on the operating point**"* |
| 3 | *"a venue's own history"* → *"that history"* | repetition across adjacent sentences, `ds-writing` §7 |
| 4 | **Four paragraphs → one** | **HC4**, `00_marking_criteria.md:32`. Failing since composition. Zero word cost |
| 5 | *"Confidence sets retain five, six and four"* → *"**Ninety per cent** confidence sets retain **four to six**"* | `mcs_L1_results.json` reports both alphas; at 0.25 sizes are 3/4/3 and `log/71` §7 records TRT **does not survive** — the level's absence let the sentence's own conclusion reverse |
| 6 | *"so the served model is indistinguishable from simpler incumbents"* → *"so the **data cannot separate** the served model from simpler incumbents"* | set cardinality is evidence about separability; at Ellel and TRT the served model **is** the simple incumbent (`robust_dow`, `ets`) |
| 7 | *"the other two sitting at nominal or above"* → *"one within a standard error of it and one far above"* | Beer Hall traded limb **0.8918**, below nominal 0.90 |
| 8 | *"the literature's over-offering"* → *"the over-offering that literature reports"*; *"at that scale"* → *"at estate scale"*; method sentence fronted | stand-alone failure; ambiguous referent (nearest scale was the **large** one); passive scaffolding, `ds-writing` §5 |
| 9 | Closing sentence now **answers the aim** | `ds-writing` §5, *"from aims to conclusions"* |

### The deferral in the file was wrong and is withdrawn, not carried to 8D

The header recorded change 7 as unrepairable, *"three words dearer than this file can pay at
300/300"*, and deferred it as a word-budget decision. Three roles found the defect independently
and one **costed the repair**: cutting a sentence that ranked the dissertation's own results, and
de-tripling the set sizes, paid for it twice over.

**A word cap constrains the total, not any particular sentence.** *"I cannot afford the true
statement"* really meant *"I have not looked for what to spend"*. Deferring an accuracy repair on
budget grounds launders a known-false statement into a later phase's backlog. The withdrawal sits
in the file beside the reasoning it replaces.

---

## 5. Critique loop — five independent calls

Logged to `ledger/introduction_rewrite_critique.md`, each round carrying its remit **quoted from
the owning file**. **22 blocking and 45 advisory findings; 18 blocking applied.**

| Round | Remit, quoted | Returned |
|---|---|---|
| **A · Methodologist** | *"Audits whether the work supports the claim, independent of how it is written… External validity: what population, period or venue does the result generalise to, and does the text overreach that?"* | 6 blocking, 12 advisory |
| **B · Statistician** | *"Audits whether the numbers mean what the sentences say… Are denominators, baselines and scaling stated for every ratio metric?"* | 22 numbers MATCHES, 3 blocking, 12 advisory |
| **C · Claim auditor** | *"Audits the join between text and evidence, sentence by sentence… Does any number in the prose fail to appear in a result file? → blocking"* | 4 blocking, 7 advisory |
| **D · knowledge-telling** (`ds-writing` §1) | *"A section that is more than roughly half descriptive is not yet at Masters level."* | ratios per section, 8 blocking, 12 advisory |
| **E · process-in-place-of-result** | *"A dissertation section must report results and claims, not the conduct of the work that produced them."* | 4 blocking, 9 advisory |

### The two findings that matter most

**1. 1.2's gap was one strand short of its own count.** It named four prior-work strands and then
asserted *"Five of them"*. The missing one was **limb 5** — measure degeneracy on intermittent
demand and rank instability at few origins. **RQ1, RQ2 and C1's negative limb all rest on it, and
none had motivating prior work in the Introduction.** Found by a grep per item, not by reading.
The omitted limb is the one carrying the failed precondition: the deletion-of-a-null shape again.

**2. "Reproducing the measured coverage" names a validation that does not exist.** Re-derived
before acting on it: on the traded limb `1 − frac_above_nominal_quantile` =
**0.891780 / 0.691670 / 0.963455** against R30's measured **0.8918 / 0.6917 / 0.9635**. The
implied and measured columns are **the same indicator vector counted twice**. This is stronger
than B13's refutation — not an over-precise claim but an empty one.

Roles B and C both graded that clause *"inherited, authorised, do not repair"*; Role A graded it
blocking. Nothing in the three reports settles it; only the artefact does. That is why the
synthesis ran in the main session rather than as SKILL.md §2's fourth call, and the deviation is
declared in the log.

### Found and repaired in my own draft

- The chapter called the estate *"operating"* three times while **Two River Taps ceased trading
  two months before the data ceiling** and is a frozen control series. That venue carries the
  largest over-coverage and one of the two measured pooling losses, so it is load-bearing for
  external validity.
- The cost sweep's limitation was **misattributed to the ratio grid** when it is a property of a
  fixed-threshold detector; and the 1:1 rung weights the two failures equally, so it sits on the
  line rather than the far side.
- 1.3 gave **no reason for the five questions or their order**. It is a dependency chain, and one
  sentence converts the section from knowledge telling to knowledge transforming.

### Inherited defects reported, not repaired

- **"to a thousandth" reaches five further sites**, including
  **`log/72_DU6_exchangeability_result.md:69` — a result file**, which is T1's terminal node and
  the trace target both `discussion.tex` and `conclusion.tex` cite. **The claim traced correctly
  to a file that asserts it**, which is why T1 passed every time. The others are
  `05_paper_architecture.md`:220, :470, :1110 and `ledger/literature_conformance.md`:922.
- **Why the numbers audit passed it too.** `numbers_audit.md` X1 grades it MATCHES on *"implied
  0.8703 against published 0.871"*. The published figure is **rounded** and the implied one is
  not. The exact Beer Hall coverage is 1525/1750 = **0.8714286**, difference **0.0011428** — B13's
  0.00114. **The audit compared full precision against three decimals, and the rounding hid the
  defect it existed to catch.** Three audit paths failed on one claim in three different ways.
- **`log/PRJ93_Agent_Eval_Report.md` §3 contradicts S6**: 0 misses, 0 spurious, *"dominant:
  false-alarms"* at all four ratios, the pre-fix `cost_curve` output under near-identical header
  text. Anyone verifying C4 there refutes it. Verified independently.
- Three stale cells in `06_research_questions.md`: §5's RQ4 string, §5's rationale note, and §6's
  C4 cell still reading the withdrawn *"8 false alarms against 124 misses"*.
- The median-estimand generalisation at `discussion.tex:62`, `:352`, `conclusion.tex:116`; R30's
  Wald z convention (score-form values are −0.96 / −10.76 / +6.36, every sign and verdict
  surviving); `interval_calibration_L1.json`'s `cpu`/`mps` disagreement.

---

## 6. Criterion trace

Every criterion §5's rubric map names against Chapter 1 and the abstract traces to a passage; the
full table is in the critique log. **R8 was traced against `discussion.tex` directly**, not
assumed: 5.1 answers the five in the order 1.3 states them, four match essentially verbatim, and
**RQ4 was the one drift**, resolved in 1.3's favour.

**Stated so the trace is not read as complete:** R65 and **HC54** are named in §5 against the
document and neither is discharged. HC54 is mandatory and absent.

**T1–T14 run as a checklist.** T1 PASS, T2 PASS, T4 PASS (after repair), T5–T7 PASS, T9 PASS,
T11 PASS, T13 PASS. T3, T10, T12, T14 N/A to a chapter with no floats.

**T8 is a declared advisory FAIL.** Nine keys are cited in 1.1–1.2 and none was re-checked against
NotebookLM this session. All nine restate Chapter 2's claims, whose T8 is discharged, and the two
carrying most weight were confirmed at Zotero source metadata. **A restatement inheriting a
discharged check is not a check**, so it is recorded as failed rather than mitigated into a pass.

**T9 passes**, and by the right instrument: all nine keys confirmed by **title lookup**, not by
`zotero_search_by_citation_key`. `montero-manso_principles_2021` returned a null from the key tool
and was then found at item `257UK8GY` — the fifth recorded instance of that tool's null being
meaningless.

---

## 7. Six-chapter measured total

All six re-derived with `wordcount.py` on the committed state. None quoted forward.

| | Raw | Artefact | **Marker** | Budget |
|---|---|---|---|---|
| Ch 1 Introduction | 2,030 | 7 | **2,023** | 1,400 |
| Ch 2 Background | 4,949 | 11 | **4,938** | 4,000 |
| Ch 3 Methods | 5,661 | 92 | **5,569** | 4,200 |
| Ch 4 Results | 7,729 | 28 | **7,701** | 5,200 |
| Ch 5 Discussion | 4,877 | 7 | **4,870** | 2,400 |
| Ch 6 Conclusions | 2,337 | 9 | **2,328** | 1,100 |
| Abstract | 300 | 0 | **300** | 300 |
| **Document** | | | **27,729** | **20,000** |

**Over by 7,729, or +39 %.** §F's projection of ~27,100 was low, partly because it carried two
wrong floors and partly because Chapter 1 measures 2,023 against the 1,400 assumed.

**The reallocation precondition is discharged. The ruling is 8D's and was not taken here.**

---

## 8. Pre-flight and push status

| Check | Size examined | Verdict |
|---|---|---|
| `humanizer` / `avoid-ai-writing` | both files, rendered text only | **clean** — zero em/en dashes, zero curly quotes, zero AI-vocabulary hits. *"rather than"* density 5.4 per 1,000 words against 4.7–7.7 across the composed chapters, so it is a house construction rather than a tell |
| `figurecheck` | **19 figure sources** | **PASS** |
| `completenesscheck` | **25 files walked** | **FAIL 5** — was 7; the Introduction cleared **two** |
| `venueordercheck` | **12 files** | **FAIL 5** — unchanged; none in `introduction.tex` or `abstract.tex` |
| `latexcheck --shell-escape`, working clone | 141 pages | **PASS** |
| **Fresh-clone compile** | `eebf3e9`, `main-words.sum` **confirmed ABSENT** before the run | **PASS** — and the run **generated** `main-words.sum` (30866), so it passed for the right reason rather than off a stale file |

Fresh-clone result: **141 pages, 0 errors, 0 undefined references, 0 undefined citations, 0 floats
lost**, 7 overfull boxes (largest 182.80 pt, `search_screening_body.tex`, pre-existing), 37
underfull.

**Tier 2 only.** Compiles under TeX Live 2026 locally, which is not a claim about the Overleaf
render until T3-1 closes. The title page routes through the scratch `svg.sty` stub and is **not**
locally verified (T3-2).

**Scope of that clean result, stated because it matters.** This is a fresh clone of a **local**
commit, not of the remote. `git ls-remote --heads origin` returns **`49b8f01`**;
`origin/main..HEAD` is **1**.

### Handed over

**The push of `eebf3e9` is Phuong's.** Not attempted — the protected-branch hook refuses it and
routing around the guard is not authorised. **Until it lands, Overleaf holds a document with no
Introduction and a four-paragraph abstract.**

Both repos are committed and clean. **8D and the reallocation were not begun**, per instruction.
**No graphify refresh, update or re-extraction was run**; the hook demanded one on effectively
every read and grep, including inside all five critique subagents, and was declined every time.
Nothing was unfindable.
