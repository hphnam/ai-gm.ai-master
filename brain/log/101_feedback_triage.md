# 101 · S28 · Two feedback streams, triaged. Nothing applied.

**Read-only package.** No `.tex`, no `ref.bib`, no figure body, no served path was edited.
Nothing was installed. Nothing was sent to anyone. Every measurement below was taken on the
working clone or on a throwaway worktree under the scratchpad, and both repositories are clean
on source at the end.

| | at start | at end |
|---|---|---|
| `ai-gm.ai-master` HEAD | `609badaf9236e3ab0e31cfaaca8c0459a19fc47b` | `609badaf9236e3ab0e31cfaaca8c0459a19fc47b` |
| Overleaf clone HEAD | `c34c266d9deace708bc21d7a9bb26aee73b6178a` | `c34c266d9deace708bc21d7a9bb26aee73b6178a` |
| Overleaf `origin/main` (`git ls-remote`) | `6643753702d1da625891c2826e958b4459a013c5` | `6643753702d1da625891c2826e958b4459a013c5` |
| Counted body | 19,989 | 19,989 |
| Appendix | 10,570 | 10,570 |
| Store ceiling | 2026-07-07 | 2026-07-07 |
| `latexcheck` on `c34c266` | PASS, 116 pages, 4 overfull, 0 undefined refs, 0 undefined citations | |
| `formatcheck --body-from 21` | PASS, section 1 clean, sections 2 and 3 advisory | |

**Instruments.** `texcount -0 -sum -merge -total` over `abstract.tex` plus the six chapters,
which is the scope `\bodywordcount` defines. `brain/scripts/wordcount.py` for marker words
inside a file. `brain/scripts/latexcheck.py --shell-escape` and
`brain/scripts/formatcheck.py --body-from 21 --accept brain/ledger/format_accepted.txt` on the
rendered PDF. `pymupdf` for rendered-text and ink-position measurement. Three purpose-written
scratch tools (`sent.py`, `abbr.py`, `refaudit.py`, `width.py`), each of which produced output
that was inspected rather than read off an exit code. `texcount` and `latexmk` live in
`~/texlive/2026/bin/universal-darwin` and are not on the default PATH; the export was made
before any conclusion about any instrument was drawn.

**Scope of what was NOT asserted.** The store-ceiling assertion was run through the existing
`.venv-forecast` interpreter, which already holds duckdb; nothing was installed to do it, and it
returned `2026-07-07`. No Chronos model was loaded, so the static-regime failure in section 5
is established from source and from committed artefacts, not by re-running the entrant. Ryan's
repository was not reachable from this session, so every statement about **his** codebase is
his claim as relayed in the brief, never a measurement; only the statements about **ours** are
measured.

---

# 0 · Two findings that come before the triage

## 0.1 · `c34c266` is not on `origin/main`. S27 is unpushed.

The brief states *"`origin/main` should be at or beyond `c34c266`; verify with `git ls-remote`."*
It is not. `git ls-remote` returns `6643753`, and `git branch -r --contains c34c266` returns
nothing:

```
=== origin/main..main (unpushed) ===
c34c266 Name the regime the adoption principle holds in, and place the disclosure it defers to
```

**Overleaf therefore does not hold the S27 static-regime disclosure pair.** Appendix B.13 and the
`sec:ladder` clause that defers to it exist only in the local clone. Under this project's own rule
(*"Local green plus unpushed equals a broken document, not a fixed one"*), the state a marker would
see today is `6643753`, whose body clause names no regime and whose appendix carries no B.13.

This is the same class as the memory `a-f-row-naming-a-sha-is-a-measurement` and
`remote-claims-are-verified-on-the-remote`. It is not an S28 finding about the feedback; it is a
state error the feedback triage happened to surface, and it is the one item here with a deadline.

## 0.2 · Figure 2.1 asserts the strong claim the text withdrew on 11 August

Full treatment at **H-4**. Stated here because it is the most substantive live defect in the
document and Hansi found it. The caption and the body text were repaired on 2026-08-11 to say the
top-right cell is **empty**. The figure itself still draws **"this dissertation"** inside that
cell, in a tinted highlight box, and it is the only cell drawn in ink. The graphic and its own
caption now contradict each other on the document's central positioning claim.

---

# 1 · The baseline Hansi read

## 1.1 · The boundary commit

**`b08ad72bcef8c9ae8606d4abe98e2c8222a0f7dd`**, authored **2026-08-10 00:07:47 +0100**,
*"Pre-flight repairs, and the venue triple at 4.4.4 anchored"*.

**How the boundary was chosen.** 12:21 am is 00:21. `b08ad72` is the last commit at or before it.
Author date equals commit date on every commit in the window, so no rebase displaced the ordering.

**The boundary is ambiguous, and by only minutes.** Three commits land within 31 minutes of it:

| SHA | authored | subject | minutes after 00:21 |
|---|---|---|---|
| `b08ad72` | 00:07:47 | Pre-flight repairs, and the venue triple at 4.4.4 anchored | **the boundary** |
| `0288cf6` | 00:29:08 | Ruling 1: 4.4.6's horizon sentence asserts only what survives its removal | +8 |
| `2ecc81f` | 00:31:06 | **Ruling 2: the knowledge-gap signal returns as Appendix B material with three body pointers** | +10 |
| `5fc5731` | 00:38:53 | Ruling 5: R114 discharged, funded from the LOW block; the lost Contributions heading restored | +18 |

`2ecc81f` matters for H-A2: it is the commit that moved the knowledge-gap signal **into** an
appendix with body pointers, and it landed ten minutes after the timestamp. If Hansi read after it
he read the appendix-pointer pattern he then advised against; if before, he did not.

**A second and larger ambiguity.** These are commit timestamps on the local clone, not push
timestamps. The next Overleaf web-UI commit is `70a67c0` at 2026-08-10 20:59 UTC, so the four
commits above reached Overleaf at some point before then. Whether the draft Hansi read was a
compiled PDF sent to him, or the live Overleaf project, is not recorded anywhere in this
repository. **The boundary is therefore accurate to about half an hour on the local history and
unbounded on the delivery mechanism.** Every "RESOLVED SINCE 10 AUG" verdict below is safe against
this: each rests on a change made on 11 August or later, well clear of the window.

## 1.2 · What changed between `b08ad72` and `c34c266`

42 commits. Counted body **19,941 to 19,989, +48**. Appendix **7,602 to 10,570, +2,968**.

| file | change | effect on Hansi's items |
|---|---|---|
| `acronyms.tex` | **created** (`290758c`, 10 Aug 17:01), repaired `eb0c110` | H-2: 34-row front-matter acronym table, ordered by first use |
| `notation.tex` | **created** (`93343a1`, 10 Aug 17:01), 11 symbol collisions resolved `ed58027` | supports H-2 |
| `chapters/*` | `6e52cb2` (10 Aug 22:24) **"Expand every acronym at first use"** | H-2: the bulk of it |
| `chapters/literature_review.tex` | `57e7dde` (11 Aug) Tier 0, incl. the gap-map wording | **H-4: caption and body repaired** |
| `appendix/search_screening.tex` + `_body.tex` | **deleted** (`9317b19`, 11 Aug) | **H-7: Hansi's Table A.2 no longer exists** |
| all appendices | unstarred, 27 sections + 11 subsections (11 Aug) | **H-7: "Appendix 24" eliminated** |
| `main.tex` | `\linespread{1.5}` commented out (`c000b7d`, 12 Aug, Overleaf web edit) | **H-7: the page-33 spacing** |
| `main.tex` | `\raggedbottom` + widow/orphan control (`45e4090`, 11 Aug) | H-7: stretched inter-paragraph glue |
| `chapters/*`, three tables | `7367ea2` (11 Aug) three tables no longer spill | H-7: table width |
| `chapters/discussion.tex` | `1dfb029` (12 Aug) `tab:answers` added, RQ paragraphs compressed | **H-A1 resolved; H-5 made worse** |
| `figures/*.pdf` | `b8203ec` (12 Aug) one palette, one font, one type scale | cosmetic; **gap_map content unchanged** |
| `ref_additions.bib` | folded into `ref.bib` (`a8fe565`, 11 Aug) | H-3: one bibliography resource |
| `appendix/robustness.tex` | `c34c266` (17 Aug) **B.13 added** | Part 3 item 5; **unpushed** |

## 1.3 · Counted body at each end

| | body | appendix |
|---|---|---|
| `b08ad72` (10 Aug, what Hansi read) | **19,941** | 7,602 |
| `c34c266` (now) | **19,989** | 10,570 |

The document Hansi read was **133 pages, 1.5-spaced**. It is now **116 pages, single-spaced**.
**No page number in his feedback maps to the current PDF.** This governs every reading of H-7.

---

# 2 · Hansi's feedback, item by item

## H-A1 · Does each RQ answer cite the result it rests on?

**Verdict: RESOLVED SINCE 10 AUG.** There are **five** research questions, not four (see section 7.1).

`sec:disc-answers` (`chapters/discussion.tex:23`) now opens on `tab:answers`, added `1dfb029`
(2026-08-12), whose fourth column is headed **Evidence** and names a table or a section for every
one of the five:

| Question | Evidence cell, verbatim | Strength |
|---|---|---|
| Do approaches separate, and does origin count change the selection? | `Table~\ref{tab:mcs}; Section~\ref{sec:res-demonstration}` | Established |
| Does this demand admit the estimand and a coherent reconciliation? | `Section~\ref{sec:res-reconciliation}; Table~\ref{tab:intermittency}` | Established |
| Do weather or pooling improve on a venue's own history? | `Tables~\ref{tab:group} and~\ref{tab:weather}` | Non-separation |
| Does the band hold nominal coverage, and if not, what accounts for it? | `Tables~\ref{tab:coverage-traded} and~\ref{tab:exchangeability}` | Established |
| Under a cost asymmetry, does detection justify surfacing to an operator? | `Table~\ref{tab:vuspr}; Section~\ref{sec:res-costsweep}` | Unanswered, cause declared |

The prose then repeats the pointer inline. Enumerating the five prose answers:

| RQ | cites in the answer paragraph | count |
|---|---|---|
| 1 | `tab:mcs`, `sec:res-mcs-functional`, `sec:res-demonstration` | 3 |
| 2 | `wickramasuriya_optimal_2019`, `sec:res-reconciliation`, `tab:intermittency` | 3 |
| 3 | `tab:weather`, `tab:group`, `sec:res-weather` | 3 |
| 4 | `tab:coverage`, `tab:coverage-traded`, `tab:exchangeability` | 3 |
| 5 | `tab:vuspr`, `sec:res-vuspr`, `sec:res-costsweep` | 3 |

**All five, in both the table and the prose. None is uncited.** At `b08ad72` the table did not
exist and RQ2's answer cited only `tab:intermittency` for the estimand limb, with the
reconciliation figures carried as bare numbers. That is the gap Hansi saw, and `1dfb029` closed it.

**Cost: 0.**

---

## H-A2 · Appendices are only assessed if necessary

Handled at **Part 3**. Summary verdict: **OUTSTANDING, and the largest item in the package.**

---

## H-1 · The abstract moves to results without sufficient background

**Verdict: OUTSTANDING.** He is right on the measurement, and the item is close to free.

**The 300 cap.** `brain/scripts/wordcount.py` on `abstract.tex` returns **299 marker words**, not
300. The brief says 300. There is **one word of headroom**, not zero. At `b08ad72` it was 300.

**Sentence-level allocation, current version, by `wordcount.count`:**

| move | words | share |
|---|---:|---:|
| problem (sentence 1) | 20 | 6.7% |
| gap (sentence 2) | 24 | 8.0% |
| **problem + gap subtotal** | **44** | **14.7%** |
| aim (sentence 3) | 12 | 4.0% |
| method (sentence 4) | 50 | 16.7% |
| results (sentences 5 to 9) | 148 | **49.5%** |
| limitation and disclosure (sentence 10) | 26 | 8.7% |
| conclusion (sentence 11) | 19 | 6.4% |
| **total** | **299** | |

**Half the abstract is results, and 44 words precede the aim.** His description is accurate.

**What changed since 10 August:** the closing sentence and the disclosure sentence were swapped
(`1dfb029`, so the abstract now ends on what the work establishes rather than on the absence),
`MASE` was spelled out, and three redundancies were recovered. **The allocation is materially
unchanged**: at `b08ad72` the same first three sentences carried problem, gap and aim, and the
same five sentences carried results. **The balance he describes is still present.**

**Minimum repair, and its delta.** Restructuring is word-neutral by necessity at a 300 cap, so
the repair is a reallocation, not an addition. The cheapest source of words is the method
sentence, which at **50 words is the longest sentence in the abstract** and carries three
positional frame lengths (399, 386, 331) and a trading-day range that the results sentences do
not depend on. Moving roughly 15 words from method to background lands the allocation at
background 59 / aim 12 / method 35 / results 148, which is a recognisable IMRAD shape.

**Delta: 0, with +1 of headroom available.** But note the standing constraint at
`abstract.tex:93-96`: this file carries exactly one positional venue triple per paragraph and
`venueordercheck.py` grades on two or more in one paragraph. The abstract is now **one paragraph**
(HC4, repaired 2026-08-09), so **removing the 399/386/331 triple is the only way to shorten the
method sentence without reinstating an UNANCHORED finding.** That is a content decision, not a
style one, and it is Nam's.

---

## H-2 · Introduce all abbreviations at first occurrence

**Verdict: PARTIALLY RESOLVED. The bulk landed on 10 August at 22:24, twenty-two hours after
Hansi's timestamp. Four sites remain, and the total cost is +26, not the budget-breaker the brief
anticipated.**

### H-2.1 · The brief's list of twenty: twelve do not appear in the counted body at all

Scanned `notation.tex`, `abstract.tex` and `chapters/*.tex` in document order, comments and
`\label`/`\ref`/`\cite` arguments stripped:

| brief's token | first occurrence | brief's token | first occurrence |
|---|---|---|---|
| MASE | `notation.tex:104` | ACI | **absent** |
| RMSSE | **absent** | AgACI | **absent** |
| ETS | **absent** | WLS | **absent** |
| STL | **absent** | CUSUM | `methodology.tex:549` |
| GBM | **absent** | API | **absent** |
| MCS | `notation.tex:68` | LLM | **absent** |
| VUS-PR | `literature_review.tex:207` | POS | **absent** |
| PR | **absent** | CSV | **absent** |
| ROC | **absent** | RQ | **absent** |
| MinT | **absent** | CI | `results.tex:291` |

**Twelve of twenty do not appear anywhere in the counted body.** `API`, `LLM`, `POS` and `CSV`
appear only inside `appendix/project_specification.tex`, which is a verbatim HC54 reproduction;
`acronyms.tex` expands them there deliberately, with the reason stated in the table's own preamble:
*"Twelve entries appear only inside Appendix D, which reproduces the issued project specification
verbatim; they are expanded here rather than there, so that the reproduction stays unaltered."*

### H-2.2 · The complete population is fifteen tokens, not twenty

| token | first occurrence | expanded inline there? |
|---|---|---|
| `VAT` | `notation.tex:38` (`ex-VAT`) | no; front matter, uncounted; expanded in `acronyms.tex` |
| `MCS` | `notation.tex:68` | **yes**, same row: *"The $p$-value of a model confidence set"* |
| `MASE` | `notation.tex:104` (units column) | no there; **yes** at `literature_review.tex:168` |
| `PRISM` | `introduction.tex:99` | not expandable; the source never expands it |
| `TabPFN-TS` | `literature_review.tex:53` | **no** |
| `MAE` | `literature_review.tex:168` | **yes**: *"mean absolute error (MAE)"* |
| `VUS-PR` | `literature_review.tex:207` | **no** |
| `CPTC` | `literature_review.tex:217` | **no** |
| `GPT-4o` | `literature_review.tex:238` | product name |
| `ProAgentBench` | `literature_review.tex:258` | benchmark name |
| `HiL-Bench` | `literature_review.tex:306` | benchmark name |
| `CUSUM` | `methodology.tex:549` | **yes**: *"A cumulative sum (CUSUM)"* |
| `SBC` | `results.tex:197` | **yes**: *"SBC is the Syntetos--Boylan--Croston scheme"* |
| `CI` | `results.tex:291` | **yes**: *"confidence interval (CI)"* |
| `TSB-AD` | `results.tex:783` (caption) | **no** |

### H-2.3 · What it looked like on 10 August

| token | at `b08ad72` | now |
|---|---|---|
| `MASE` | `abstract.tex:200`, bare, in the abstract | spelled out in the abstract; `(MASE)` at `literature_review.tex:168` |
| `MAE` | `literature_review.tex:142`, bare | *"mean absolute error (MAE)"* |
| `MCS` | `results.tex:96`, **in a table header**, bare | expanded at `notation.tex:68`; in `acronyms.tex` |
| `CI` | `results.tex:270`, **in a table header**, bare | *"confidence interval (CI)"* |
| `BH`, `TRT` | `results.tex:272-274`, venue abbreviations in table rows | **removed**; both venues spelled out everywhere |
| `acronyms.tex` | **did not exist** | 34 rows, ordered by first use |

Hansi's complaint is exactly right about the draft he read, and `6e52cb2` *"Expand every acronym at
first use"* answered it twenty-two hours later.

### H-2.4 · The residue, and its total texcount cost

| site | now | proposed | delta |
|---|---:|---:|---:|
| `literature_review.tex:53` TabPFN-TS | 2 | 11 | **+9** |
| `literature_review.tex:207` VUS-PR | 9 | 14 | **+5** |
| `literature_review.tex:217` CPTC | 5 | 12 | **+7** |
| `results.tex:783` TSB-AD, in a caption | 6 | 11 | **+5** |
| **total** | | | **+26** |

`VAT` and `MASE` in `notation.tex` are free: `\bodywordcount` runs texcount over seven explicitly
listed files and `notation.tex` is not one of them (verified at `main.tex`, and independently by
the 2,001-word probe recorded in `acronyms.tex`'s own header comment).

**+26 is the whole cost.** Not the budget-breaker.

---

## H-3 · Provide references for the method referred to in Figure 2.1

**Verdict: PARTIALLY RESOLVED, and the repair is word-NEGATIVE.**

**The figure, extracted from `gap_map.pdf`.** Rows, top to bottom, axis `intervention policy`:
`operator-elicited cost ratio, gate calibration measured` / `gates on a cost-asymmetric threshold`
/ `scored on accuracy or F1 alone`. Columns, left to right, axis
`what the intervention decision is scored against`: `a language model as judge` /
`simulated or scripted users` / `annotated corpora of recorded activity` /
`the operator's own accept-or-dismiss decisions`.

**Caption, verbatim, `chapters/literature_review.tex:354-357`:**

> Surveyed proactive systems by intervention policy and grounding of the score.
> Columns run left to right by how directly the grounding is a person's judgement.
> Placements follow the citations in Section~\ref{sec:rw-surfacing}. The empty top-right
> cell is the gap this work specifies an apparatus for; that apparatus is not run here.

**Cell occupants, and whether each carries a citation:**

| occupant | cell | key in `ref.bib` | cited in the preceding paragraph |
|---|---|---|---|
| PRISM | judge x cost-asymmetric | `fu_prism_2026` | yes |
| ProActor | judge x accuracy/F1 | `ding_proactor_2026` | yes |
| tau-bench | simulated x accuracy/F1 | `yao_-bench_2024` | yes |
| ProactiveEval | simulated x accuracy/F1 | `liu_proactiveeval_2025` | yes |
| Ask | simulated x accuracy/F1 | `gulati_ask_2026` | yes |
| ProactiveBench | corpora x accuracy/F1 | `lu_proactive_2024` | yes |
| ProAgentBench | corpora x accuracy/F1 | `tang_proagentbench_2026` | yes |
| ContextAgent | corpora x accuracy/F1 | `yang_contextagent_2025` | yes |
| Fingertip | corpora x accuracy/F1 | `yang_fingertip_2025` | yes |
| **this dissertation** | **elicited x operator decisions** | n/a | **see H-4** |

**All nine surveyed systems carry a key, all nine keys resolve in `ref.bib`, and all nine are
cited in the paragraph immediately above the float.** `latexcheck` reports zero undefined
citations. This was already true at `b08ad72`. Nothing is missing.

**What Hansi is asking for is that the reader not have to walk back into the prose to find them.**
The caption currently says *"Placements follow the citations in Section~\ref{sec:rw-surfacing}"*,
which is a pointer rather than a citation. Replacing the pointer with the nine `\citet` calls:

| | marker words |
|---|---:|
| caption now | 51 |
| caption with the nine keys inline | 47 |
| **delta** | **-4** |

`wordcount.count` charges nothing for a citation key, so this **frees 4 words**. Two axis labels
name concepts rather than methods (`cost-asymmetric threshold`, `F1`), and `F1` is expanded in
`acronyms.tex`; no further citation is owed.

**Cost: -4.**

---

## H-4 · Is Figure 2.1's positioning of this work correct?

**Verdict: OUTSTANDING. Hansi is right, the positioning is not correct, and it is the most
substantive defect in the document. The repair is free in words.**

### H-4.1 · Was the cost ratio ever elicited from the operator?

**No.** Three independent sites say so.

`abstract.tex`, verbatim:
> misses dominate the cost at every ratio swept

`chapters/discussion.tex`, `tab:answers` row 5, verbatim:
> Not as posed: detection measured, asymmetry never elicited.

`chapters/discussion.tex:139-142`, verbatim:
> The asymmetry itself is unaddressed rather than unresolved.
> Every ratio the sweep ran weighted a miss at least as heavily as a false alarm, so all four sat on
> the opposite side of the asymmetry the question posits, and the counts stayed fixed across them

`chapters/conclusion.tex:84-85`, verbatim:
> the cost weighting was swept rather than applied, no ratio having been elicited.

**The sweep used assumed ratios. Four of them. All on the wrong side of the asymmetry the question
posits.**

### H-4.2 · Were any accept-or-dismiss labels ever obtained?

**No.** `chapters/conclusion.tex:82-87`, verbatim:
> none of the four terms of the agent objective has been computed and no manager
> feedback was obtained at all. [...] Three of the objective's four terms would compute as soon as a response cache
> exists; the fourth requires operator judgements, of which none were recorded.

### H-4.3 · What the document says about the operator evaluation, at every site

| site | verbatim |
|---|---|
| `abstract.tex` | *"The apparatus for judging whether a departure is worth raising, scored against an operator's own accept-or-dismiss decisions, is specified and frozen and has not been run."* |
| `introduction.tex:112-115` (`sec:intro-gap`) | *"scoring an intervention layer against an operator's accept-or-dismiss judgements requires access to those judgements, and what this work offers is a specified and frozen apparatus for obtaining them rather than the measurement."* |
| `introduction.tex:156-157` | *"an apparatus for evaluating an intervention layer against an operator's own accept-or-dismiss decisions which is specified and frozen and has not been run."* |
| `literature_review.tex:341-342` (body, at the figure) | *"the empty cell is the one this work specifies an apparatus for without running it"* |
| `literature_review.tex:356-357` (caption) | *"The empty top-right cell is the gap this work specifies an apparatus for; that apparatus is not run here."* |
| `discussion.tex` `tab:answers` | *"Unanswered, cause declared"* |
| `conclusion.tex:224` | *"The empty cell of Figure~\ref{fig:gap-map} is an [...]"* (further work) |

**Seven sites. All seven agree the apparatus has not been run.**

### H-4.4 · Does the figure distinguish the cell this work occupies from the cell it aimed at?

**No. The figure asserts occupancy, in ink, and it is the only cell drawn in ink.**

The rendered `gap_map.pdf` places the text **"this dissertation"** inside the top-right cell,
inside a tinted, thicker-stroked highlight box. Every other cell is a thin faint outline. The
generator's own comment, `brain/drafts/figures/make_litreview_figures.py:112-121`, is the proof:

```python
    # The empty cell is the argument, so it is the only one drawn in ink.
    tx, ty = TARGET
    ax.add_patch(FancyBboxPatch(..., edgecolor=MARK, facecolor=MARK, alpha=0.10, zorder=2))
    ax.text(tx, ty, "this\ndissertation", ha="center", va="center", ...)
```

`TARGET = (3, 2)`, which is column 3 (`the operator's own accept-or-dismiss decisions`) and row 2
(`operator-elicited cost ratio, gate calibration measured`). **The comment calls the cell empty and
the next four lines fill it with this dissertation's name.**

The figure content is **byte-for-byte identical in placement** between `b08ad72` and `c34c266`;
`b8203ec` restyled the palette, the font and the type scale and moved no label. Both renders were
inspected.

### H-4.5 · What was repaired on 11 August, and what was not

At `b08ad72`, which is what Hansi read, the text agreed with the figure:

| | 10 August (`b08ad72`) | now (`c34c266`) |
|---|---|---|
| body | *"the empty cell is the one this work **occupies**"* | *"the empty cell is the one this work **specifies an apparatus for without running it**"* |
| caption | *"The empty top-right cell is the gap this work **occupies**."* | *"The empty top-right cell is the gap this work **specifies an apparatus for**; that apparatus is not run here."* |
| figure | **"this dissertation" in the top-right cell** | **"this dissertation" in the top-right cell** |

The repair is recorded in a source comment at `literature_review.tex:343-347`, verbatim:

> % Read "the one this work occupies" until 2026-08-11, which claimed the gap as filled. It is not:
> % the operator-grounded evaluation is the unmeasured limb, carried everywhere else at graded
> % strength ("specified and frozen and has not been run"), and conclusion.tex:194 lists this very
> % cell as further work. Chapter 2 was the only site asserting the strong form, and it is the first
> % one a marker reads.

**"Chapter 2 was the only site asserting the strong form" was wrong when it was written.** The
figure was, and is, a second site. This is the memory `a-repair-can-fix-the-verb-and-leave-the-scope`
in a new place: the verb was fixed at two text sites and the graphic, which is the thing a marker
looks at first and remembers longest, was left asserting the withdrawn claim.

### H-4.6 · The answer to his question, plainly

**The positioning is not correct.** The figure places this work in a cell defined by two properties
the work does not have: an operator-elicited cost ratio (never elicited, four assumed ratios swept)
and scoring against the operator's own accept-or-dismiss decisions (no labels obtained, the
apparatus frozen and unrun). Seven other sites in the document say so. The figure is the only site
that does not, and it is the site that says it loudest.

**Do not defend it.** He has identified the exact gap the project has been declaring for weeks, and
he found it in the one artefact the repair pass missed.

### H-4.7 · The two repairs, priced

**Option A, change the figure.** Replace the cell text with something that names it as the target
rather than an occupant, for instance `no prior work` with the highlight retained and a rule such as
a dashed edge marking it as aimed-at. **Body word cost: 0.** The figure is an `\includegraphics` of
a PDF; texcount does not read inside it. Requires regenerating `gap_map.pdf` from
`brain/drafts/figures/make_litreview_figures.py`, which carries three self-assertions
(`assert_page_width`, `assert_no_ink_outside`, `assert_no_text_dropped`) that must all be re-run;
the memory `pgf-drops-text-outside-the-canvas` records why the third one exists.

**Option B, change the caption only.** Leave the graphic and make the caption say the cell is where
the work aimed:

| | marker words |
|---|---:|
| caption now | 51 |
| caption naming the cell as aimed-at, not occupied | 62 |
| **delta** | **+11** |

**Option A is strictly better and free.** Option B costs 11 words and leaves a highlighted box
reading "this dissertation" in the cell, which no caption can fully undo; a reader who skims the
figure and not the caption still takes away the strong claim. **Recommend A. The ruling is Nam's.**

Combining A with the H-3 caption change nets **-4 words** for both.

---

## H-5 · Quote each RQ in full before answering it

**Verdict: OUTSTANDING, and the document has moved AWAY from what he asks since he read it.**

There are **five** RQs. `sec:intro-aims` (not `sec:rqs`) at `chapters/introduction.tex:131-145`
carries them as an enumerate.

### H-5.1 · The five current openings, verbatim

1. *"The first asked whether candidate approaches separate at these data volumes, and whether origin count changes which is selected."*
2. *"The second asked whether this demand admits the point-forecast estimand and the coherent reconciliation standard practice assumes."*
3. *"The third asked whether weather or cross-series pooling improves on a venue's own trading history."*
4. *"The fourth asked whether the conformal band holds nominal coverage everywhere and, where not, which property of the data accounts for the departure."*
5. *"The fifth asked whether, under a cost asymmetry favouring silence over noise, detection from the band justifies surfacing its output to an operator."*

**Note what these are.** They are not "restated by number only": each is a compressed paraphrase.
His phrasing is loose, but the substance stands. Each is referred to by ordinal ("The first",
"The second") and none is the question as `sec:intro-aims` states it.

### H-5.2 · The price of quoting each verbatim from `sec:intro-aims`

| RQ | `sec:intro-aims` verbatim | current 5.1 opener | **10 Aug** 5.1 opener | delta to quote |
|---|---:|---:|---:|---:|
| 1 | 29 | 19 | 34 | **+10** |
| 2 | 22 | 17 | 24 | **+5** |
| 3 | 18 | 15 | 21 | **+3** |
| 4 | 28 | 23 | 28 | **+5** |
| 5 | 26 | 23 | 29 | **+3** |
| **total** | **123** | **97** | **136** | **+26** |

**Cost: +26.** Taking the text verbatim from `sec:intro-aims` is what stops the two sites drifting,
and it is the only form that discharges what he asked for.

### H-5.3 · The interaction the brief names, stated plainly and corrected

The brief says *"S27 removed 12 words from §5.1 RQ4 as a de-duplication."* **That is wrong in three
respects, and the true figure is much larger.**

1. **S27 (`c34c266`) did not touch `chapters/discussion.tex` at all.** Its three files are
   `appendix/robustness.tex`, `chapters/conclusion.tex`, `chapters/methodology.tex`.
2. The §5.1 compression happened in `f34a486` (11 Aug, *"De-duplication harvest: 109 words of
   repetition"*) and `1dfb029` (12 Aug, *"answer the questions in one table"*).
3. **The measured loss is 142 words across the five paragraphs, not 12:**

| paragraph | 10 Aug | now | delta |
|---|---:|---:|---:|
| RQ1 | 136 | 98 | -38 |
| RQ2 | 101 | 82 | -19 |
| RQ3 | 107 | 94 | -13 |
| **RQ4** | **171** | **129** | **-42** |
| RQ5 | 153 | 123 | -30 |
| **total** | **668** | **526** | **-142** |

**The openers alone lost 39 words (136 to 97).** So the document Hansi read was **closer** to what
he now asks for than the document is today, and RQ4 lost more than any other. Quoting the five in
full buys back 26 of the 39. This does interact, and it interacts against the compression pass, not
merely alongside it: a later editor reading only the ledger would see the de-duplication recorded
as a win and would not see that it traded against a supervisor requirement that had not yet
arrived.

---

## H-6 · "Objectives revisited" is confusing; the introduction states no objectives

**Verdict: OUTSTANDING. He is right.**

**The heading, verbatim, `chapters/conclusion.tex:36-37`:**
```
\section{Objectives revisited}
\label{sec:conclusion-objectives}
```

**The section's own second paragraph already concedes the point**, `conclusion.tex:44-46`:
> The specification decomposes its aim into five objectives and commits to three deliverables, each
> objective discharged through the deliverable that carries it; those are what this section revisits.

**Does the introduction state objectives anywhere, under any name?** `grep -ci objective
chapters/introduction.tex` returns **0**. Chapter 1's sections are `Operational forecasting in
small hospitality estates`, `Problem statement and knowledge gap`, **`Aims and research
questions`**, `Contributions`, `Structure of the dissertation`. It states one **aim**, five
**research questions** and five **contributions**. It never states objectives.

**The objectives are the project specification's**, `appendix/project_specification.tex:149-169`,
Appendix D: rhythm modelling; deviation detection; reasoning and surfacing; evaluation;
documentation and handover. A source comment at `conclusion.tex:52-54` records the mapping as
one-to-many and checked.

**So a marker reading Chapter 6's heading is sent back to Chapter 1 for something that is only in
Appendix D**, which is precisely the H-A2 exposure in miniature.

### The two options, priced

| option | now | proposed | delta |
|---|---:|---:|---:|
| **(a)** rename to *"The specification's objectives revisited"* | 2 | 4 | **+2** |
| **(a')** rename to *"Deliverables and objectives revisited"* | 2 | 4 | **+2** |
| **(b)** add an objectives statement to `sec:intro-aims` | 0 | 29 | **+29** |

**(b), minimum form, one sentence:**
> The project specification decomposes that aim into five objectives, discharged through three
> deliverables: rhythm modelling, deviation detection, reasoning and surfacing, evaluation, and
> documentation and handover. Section~\ref{sec:conclusion-objectives} revisits each.

**(a) and (b) are not exclusive.** (a) alone answers the confusion at +2. (b) alone answers it at
+29 and additionally makes the Introduction self-contained against H-A2, since the objectives would
then be in the body rather than only in Appendix D. **(a)+(b) = +31.**

---

## H-7 · Formatting

**Verdict: RESOLVED SINCE 10 AUG on all three, and Hansi was right about all three. Two findings
about the gate remain.**

### H-7.1 · "Appendix 24" is the most serious, and it is gone

**It was there, six times, and the first was on page 33.** Compiling `b08ad72` and searching the
rendered text with `pymupdf`:

```
=== 10 AUG BASELINE (133 pages) ===
matches for 'Appendix~?\s*[0-9]+': 6
  p33: ...Section 5.4 carries the consequence. Appendix 24 carries the elicitation argument...
  p39: ...that condition is tested rather than assumed. Appendix 24 derives the attainable size...
  p40: ...the second removing the learning-rate choice the first exposes (Appendix 24)...
  p40: ...the served system never runs. Appendix 24 separates what the construction is...
  p42: ...the closed form is the numerically stable one; Appendix 24 shows the equivalence...
  p43: ...The apparatus that addresses it is specified in Appendix 24: the agent returns...

=== CURRENT (116 pages) ===
matches: 0
```

**PDF page 33 carries the first one, and printed page 33 (PDF page 43) carries the last one.
Both readings of "page 33" land on it.**

**What it was.** Not a hard-coded number and not a stale label: **a `\label` under a starred
heading**. `\label` after `\section*` captures whatever counter was last stepped, so three labels
resolved to the arabic `24` and `\ref` printed "Appendix 24" in a document whose appendices are
lettered. Fixed 2026-08-11 by unstarring 27 sections and 11 subsections.

**Every appendix reference in the document, audited against `main.aux`.** 22 distinct `app:` labels,
each checked for whether it prints a letter:

| label | prints | anchor | uses |
|---|---|---|---:|
| `app:pseudocode` | A | `appendix.1.A` | 9 |
| `app:exo-cols` | A.2 | `section.1.A.2` | 3 |
| `app:elicitation` | A.9.1 | `subsection.1.A.9.1` | 1 |
| `app:conformal-bounds` | A.9.2 | `subsection.1.A.9.2` | 2 |
| `app:mondrian` | A.9.3 | `subsection.1.A.9.3` | 1 |
| `app:adaptive-impl` | A.9.4 | `subsection.1.A.9.4` | 1 |
| `app:hurdle-saturation` | A.9.5 | `subsection.1.A.9.5` | 1 |
| `app:agent-apparatus` | A.9.6 | `subsection.1.A.9.6` | 1 |
| `app:gap-signal` | A.9.7 | `subsection.1.A.9.7` | 2 |
| `app:robustness` | B | `appendix.1.B` | 8 |
| `app:injection-pipelines` | B.1.1 | `subsection.1.B.1.1` | 2 |
| `app:pairing-correction` | B.5 | `section.1.B.5` | 1 |
| `app:rank-deflections` | B.6 | `section.1.B.6` | 1 |
| `app:divergence-catalogue` | B.7 | `section.1.B.7` | 1 |
| `app:mcs-numerics` | B.8 | `section.1.B.8` | 2 |
| `app:spike-reachability` | B.10 | `section.1.B.10` | 1 |
| `app:native-quantiles` | B.11 | `section.1.B.11` | 1 |
| `app:squared-loss` | B.12 | `section.1.B.12` | 1 |
| `app:static-regime` | B.13 | `section.1.B.13` | 1 |
| `app:closure-case` | B.14 | `section.1.B.14` | 1 |
| `app:tables` | C | `appendix.1.C` | 5 |
| `app:specification` | D | `appendix.1.D` | 2 |

**All 22 resolve to a letter. Zero labels are anchored to a `section*` or `chapter*`. Zero
undefined references in the whole build.** The class is closed.

*One small residue, not Hansi's:* `app:derivations` (prints `A.9`) is defined and referenced by
nothing. An orphan label, harmless, and it is the class the memory
`a-removal-can-strand-the-label-it-left-behind` warns about.

### H-7.2 · The page 33 line spacing

**Cause: the document was `\linespread{1.5}` throughout on 10 August, and it is single-spaced now.**

Measured. Modal baseline-to-baseline leading, over every body page:

| build | modal leading | gaps measured | pages |
|---|---:|---:|---:|
| `b08ad72` (10 Aug) | **21.67 pt** | 3,516 | 133 |
| `c34c266` (now) | **14.45 pt** | 4,280 | 116 |

21.67 / 14.45 = 1.50 exactly. `main.tex:39` reads `\linespread{1.5}` at `b08ad72` and
`% \linespread{1.5}` now, commented out in `c000b7d` (2026-08-12, Phuong's Overleaf edit, ruled
deliberate and recorded CLOSED at `00_marking_criteria.md:417`).

**No LOCAL anomaly on either candidate page 33.** Ranking every page of the 10 August build by
excess inter-paragraph glue:

| rank | pdf page | printed page | excess |
|---|---:|---:|---:|
| 1 | 108 | 98 | 182.2 pt |
| 2 | 99 | 89 | 174.2 pt |
| 3 | 31 | 21 | 147.5 pt |
| ... | | | |
| (not ranked) | **33** | 23 | 84.0 pt |
| (not ranked) | **43** | **33** | 85.3 pt |

Neither is in the top eight. **The spacing he saw is the global 1.5, not a defect on that page.**
A secondary contributor was removed the same week: `\raggedbottom` (`45e4090`, 11 Aug) stopped
LaTeX stretching inter-paragraph glue to fill a short page, which is what puts extra space between
paragraphs rather than between lines.

**This item carries a live risk and belongs on the question list.** `00_marking_criteria.md:414-419`
records the residual explicitly: `main.tex`'s own template comment attributes 1.5 spacing to
*"the MARP regulations (Appendix 2) ... for the purpose of examiner annotation"*, no copy of MARP
is held in this project, and the claim is **UNVERIFIED in both directions**. Hansi's note is the
closest thing this project has to a source-side answer, and it is ambiguous: he could be flagging
extra spacing as unwanted (which the removal answers) or noting it in passing. **Ask him.**

### H-7.3 · Table A.2 is too wide

**He was right, and it was far worse than "too wide". Part of the table was not printed at all.**

His Table A.2 was **"Search boundaries and their recorded reasons"** on printed page 91 of the
10 August build, inside `appendix/search_screening.tex`. Measured against the derived text block
(99.2 pt to 524.5 pt, 150.0 mm, derived by `formatcheck` rather than assumed):

```
p101 (printed 91): ink 99.21 .. 706.52   block 99.2 .. 524.5
                   right overflow +182.02 pt   width 607.31 pt vs 425.30 pt
```

**182.02 pt past the right edge of the text block, on a 595.28 pt page.** The table ran off the
paper. The rendered page shows the entire "Reason recorded" column truncated mid-word: `stadiu`,
`enoug`, `not al`, `fixture, a`, `preferred t`, `the best`, `criterion`, `were`, `those tw`,
`undertak`. **Hansi was reading a table whose right half did not exist on the page.**

**That appendix was deleted in its entirety on 2026-08-11** (`9317b19`, *"Remove the
search-and-screening appendix: R65 has no warrant in either source"*), for an unrelated reason. The
appendices reordered from A=search_screening, B=pseudocode, C=robustness, D=tables,
E=specification to A=pseudocode, B=robustness, C=tables, D=specification.

**Today's Table A.2 is a different table**, "Pre-registered model confidence set configuration",
on page 75. It does not spill.

**Is anything too wide now?** Global ink scan of all 116 pages against the same block:

| page | right edge | over block | content |
|---:|---:|---:|---|
| 89 | 526.20 | **+1.70 pt** | `= 256` |
| 38 | 525.98 | **+1.48 pt** | `2026-07-07` |
| 72 to 82 | 524.67 to 524.73 | +0.17 to +0.23 | bibliography URLs, justified |

**Two real spills, both under `formatcheck`'s 2.0 pt tolerance.** Nothing approaches 182 pt.
`formatcheck` section 3 also flags today's `Table A.2` for **float distance 47 pages** from its
nearest reference, which is a different complaint from width and is advisory.

### H-7.4 · Why `formatcheck` passes while these existed. Two findings about the gate.

**What the gate checks, at the canonical `--body-from 21`:**

| section | what it measures | fails the run? |
|---|---|---|
| 1 MARGIN SPILL | ink outside the derived text block, `SPILL_TOL = 2.0` pt | **yes** |
| 2 WHITE SPACE | INNER gaps over 60 pt, stub pages under 45% | no, advisory |
| 3 FLOAT DISTANCE | pages between a float and its nearest `\ref` | no, advisory |

**Against Hansi's three items:**

- **"Appendix 24": outside the remit of BOTH gates, by construction.** `latexcheck` reports
  *undefined* references; this one was **defined**, and resolved cleanly to a number that does not
  exist in the document. `formatcheck` reads where ink landed and has no notion of whether a
  resolved string is sensible. **No source-level check in this project could have caught it.**
  The check that does is the one the memory records: read the `.aux` for a `\newlabel` anchored to
  `section*.NN`, then search the rendered PDF for the literal string a reader sees.
  Both were run here; both are clean.
- **Line spacing: outside the remit.** Section 2 measures gaps *between* blocks. Baseline-to-baseline
  leading *within* a paragraph is never measured. A `\linespread` change is invisible to the gate.
- **Table width: INSIDE the remit, and the gate would have caught it.** A 182 pt spill is 91 times
  the 2.0 pt tolerance. It passed on 10 August because **the gate had not been run on that build**:
  `formatcheck` was adopted 2026-08-11 (`prj93-formatting-gate`), the day after.

**Finding 1: `--body-from 21` now skips five pages of body.** The gate reports
*"scanned 96 pages of 116 (body from p.21)"* and derives *"folio offset +15"*. So PDF page 21 is
printed page 6. **Chapter 1 begins on PDF page 16 (printed page 1).** The canonical invocation
therefore never reads printed pages 1 to 5: the whole of Chapter 1 and the opening of Chapter 2.
The constant was set when the front matter was longer; `acronyms.tex` and `notation.tex` were
added on 10 August and the 1.5 spacing was removed on 12 August, and the front matter is now
15 pages. **Measured consequence today: none.** Scanning pages 1 to 20 by hand gives a maximum
overshoot of +0.12 pt. But the gate's scope claim is wrong, and it is one front-matter edit away
from mattering. This is the memory `a-narrow-pass-is-not-a-pass` in a new place.

**Finding 2: `latexcheck` reports an overfull box the gate cannot see.**
`notation.tex:109-110`, 2.81 pt. That is front matter, above page 21. The gate is structurally
unable to reach it. It happens not to put ink outside the block (measured: page 15 reaches
519.64 pt against a block ending at 524.5), so nothing is wrong today; the point is that the two
instruments have a blind region between them and it is exactly where two new longtables now live.

**Cost of H-7: 0. All three are resolved.**

---

## H-8 · The writing is dense and repetitive

**Verdict: PARTIALLY RESOLVED, and PUSH BACK on the specific remedy, with evidence. The
observation is correct and the number is worse than he suggests.**

### H-8.1 · "rather than", counted

Comments stripped, marker words by `wordcount.count`:

| file | marker words | "rather than" | per 1,000 |
|---|---:|---:|---:|
| `chapters/introduction.tex` | 1,196 | 4 | 3.34 |
| `chapters/literature_review.tex` | 3,600 | 20 | 5.56 |
| `chapters/methodology.tex` | 5,297 | **36** | 6.80 |
| `chapters/results.tex` | 6,251 | **33** | 5.28 |
| `chapters/discussion.tex` | 2,782 | 16 | 5.75 |
| `chapters/conclusion.tex` | 1,878 | **17** | **9.05** |
| `abstract.tex` | 322 | 0 | 0.00 |
| **body subtotal** | **21,326** | **126** | **5.91** |
| `appendix/pseudocode.tex` | 2,583 | 17 | 6.58 |
| `appendix/robustness.tex` | 3,665 | 20 | 5.46 |
| `appendix/tables.tex` | 1,747 | 7 | 4.01 |
| `appendix/project_specification.tex` | 2,378 | 4 | 1.68 |
| **TOTAL** | **31,699** | **174** | **5.49** |

**174 occurrences. One every 182 words. Conclusions is worst at 9.05 per thousand.** Note that
`project_specification.tex`, which is a verbatim reproduction of someone else's writing, sits at
1.68, roughly a third of the composed rate. **That is the control, and it is in the same document.**

### H-8.2 · Other repeated constructions at the same rate

| construction | total | per 1,000 |
|---|---:|---:|
| colon-led apposition | **159** | **5.02** |
| parenthetical over 12 chars | 82 | 2.59 |
| `which is` / `which are` | 59 | 1.86 |
| `---` (em-dash substitute) | 41 | 1.29 |
| `rather than a/an <noun>` | 26 | 0.82 |
| `not X but Y` | 6 | 0.19 |
| `What X is, is Y` | 4 | 0.13 |
| `so that` | 2 | 0.06 |
| `instead of` | 1 | 0.03 |
| `A is not B, it is C` | **0** | 0.00 |

**The second finding is the colon.** 159 colon-led appositions, essentially the same rate as
"rather than", and Hansi did not name it. 34 of the 41 `---` are inside
`project_specification.tex`, a verbatim reproduction, so the composed chapters carry 7.

### H-8.3 · Sentence-length distribution per chapter

| file | sentences | words | mean | median | >40w | >40w % | <15w | <15w % | longest |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `abstract.tex` | 16 | 322 | 20.1 | 19.5 | 1 | 6.2 | 7 | 43.8 | 50 |
| `introduction.tex` | 43 | 1,194 | 27.8 | 25 | 8 | **18.6** | 11 | 25.6 | **102** |
| `literature_review.tex` | 127 | 3,532 | 27.8 | 26 | 27 | **21.3** | 31 | 24.4 | **113** |
| `methodology.tex` | 179 | 4,761 | 26.6 | 26 | 29 | 16.2 | 42 | 23.5 | 72 |
| `results.tex` | 204 | 4,829 | 23.7 | 21.5 | 32 | 15.7 | 75 | 36.8 | 66 |
| `discussion.tex` | 102 | 2,597 | 25.5 | 26.0 | 17 | 16.7 | 28 | 27.5 | 63 |
| `conclusion.tex` | 68 | 1,878 | 27.6 | 25.0 | 11 | 16.2 | 15 | 22.1 | 74 |
| **ALL** | **739** | **19,113** | **25.9** | **25** | **125** | **16.9** | **209** | **28.3** | **113** |

**Mean 25.9, median 25.** The mean sitting one word above the median in every chapter is the
signature Hansi describes: a narrow, uniform rhythm with a long right tail rather than a mix.
**One sentence in six exceeds 40 words.** Literature Review is worst at 21.3%.

### H-8.4 · The twenty worst offenders, for a human editing pass

| # | location | words | current sentence, opening |
|---:|---|---:|---|
| 1 | `literature_review.tex` sec:rw-synthesis | **113** | *"Four results stand established above, each with a qualification argued for in this chapter rather than inherited: rhythm can be borrowed across series despite scarce data but only on collections far larger than a three-venue estate; ..."* |
| 2 | `introduction.tex` sec:intro-gap | **102** | *"Each of those three requirements has been met somewhere in the literature, in isolation and in domains distant from hospitality operations, and each carries a qualification Chapter 2 argues rather than inherits: pooling pays on collections far larger than three venues, ..."* |
| 3 | `conclusion.tex` 6.2 | 74 | *"At every venue the data could not separate a substantial fraction of the ladder, which on Hansen's own reading is a statement about the evidence available rather than a finding of equivalence; and the ordering was unstable ..."* |
| 4 | `methodology.tex` sec:intermittency | 72 | *"The same authors give a selection rule between Croston's method and the Syntetos-Boylan approximation by dividing the classification plane diagonally, preferring the approximation when ..."* |
| 5 | `introduction.tex` sec:intro-contributions | 71 | *"Five contributions follow, all claims about three venues of one estate over frames of at most 399 days: a model-selection study; a controlled test of weather and of cross-series pooling; ..."* |
| 6 | `literature_review.tex` sec:rw-exog | 71 | *"Energy load is coupled to weather physically and withholding it raises error in every case, whereas revenue in a bar is coupled to it only through a person's decision to go out; and the same literature supplies a mechanism running the other way, ..."* |
| 7 | `methodology.tex` sec:ladder | 69 | *"Adoption is therefore decided on a validation block disjoint from the block the result is reported on, in the partition of Figure 3.2, and carries a one-standard-error margin, the device introduced for tree pruning by Breiman ..."* |
| 8 | `methodology.tex` sec:ladder | 67 | *"The exponential-smoothing rung is one fixed specification, not a member selected from the family by an automatic procedure: the information-criterion search standard implementations run by default is deliberately not performed, ..."* |
| 9 | `conclusion.tex` 6.2 | 67 | *"The served band missed nominal at all three venues on exact intervals declared optimistic, and which venue fails in the unsafe direction is not visible in those marginals: ..."* |
| 10 | `results.tex` sec:res-costsweep | 66 | *"The misses are counted against synthetic injections rather than events an operator confirmed, and 84 of the 124 are injections the detector never examined, so the margin by which misses dominate ..."* |
| 11 | `introduction.tex` sec:intro-aims | 65 | *"The aim is to determine whether an operational estate of three hospitality venues holds enough data to support a proactive intervention layer: that is, whether venue demand can be forecast well enough ..."* |
| 12 | `conclusion.tex` 6.2 | 65 | *"The unbiasedness precondition an optimal reconciliation requires failed at 22 of the Beer Hall hierarchy's 41 nodes where about two rejections would be expected by chance, ..."* |
| 13 | `literature_review.tex` sec:rw-intermittent | 63 | *"The attraction for a booking-led venue is that whether it trades tomorrow is answerable from different information than how much it takes if it does; the limitation is of data rather than of method, ..."* |
| 14 | `literature_review.tex` sec:rw-ruler | 63 | *"Kolassa shows that because the median of a sum is not generally the sum of the medians, forecasts minimising mean absolute error (MAE), or mean absolute scaled error (MASE), which is a scaled MAE, ..."* |
| 15 | `results.tex` sec:res-coverage | 63 | *"The within-group exchangeability the Mondrian partition buys holds only so far as its closure calendar is right, and at the Beer Hall 94 of 546 calendar-closed days, or 17.2 per cent, actually traded: ..."* |
| 16 | `discussion.tex` sec:disc-answers RQ1 | 63 | *"The ninety per cent confidence sets retain five of nine scored entrants at the Beer Hall, four at Two River Taps and six at Ellel, separating the clearly inferior rungs from the rest ..."* |
| 17 | `conclusion.tex` 6.2 | 63 | *"Four weather bases separated by the lead at which each would have been available to a deployed model were compared against a no-weather control, and all five arms were retained ..."* |
| 18 | `conclusion.tex` sec:further-work | 62 | *"The repair is not to group on whether the venue traded, which is known only after the target date and would condition the calibration group on the realised outcome; it is to group on an occupancy signal available before it, ..."* |
| 19 | `literature_review.tex` sec:rw-intermittent | 60 | *"The classification deciding when these apply partitions series by average inter-demand interval p and squared coefficient of variation of demand sizes v, on cutoffs Kostenko and Hyndman correct to ..."* |
| 20 | `literature_review.tex` sec:rw-intermittent | 60 | *"Their statement carries no condition, and the threshold at which it becomes exactly true is derived here rather than taken from them: a median is zero precisely once zero periods outnumber trading periods, ..."* |

*(Two more at 60 words: `literature_review.tex` on ProAgentBench and PRISM; `methodology.tex:516`
on the Mondrian variant, which is a three-limb semicolon list.)*

**Nothing was rewritten.** This is a target list.

### H-8.5 · Has `avoid-ai-writing` been run, and when?

**Yes, repeatedly, and most recently 2026-08-13.** Records:

- **Per chapter at composition** (`ledger/litreview_critique.md:401`,
  `ledger/methodology_rewrite_critique.md:60`, `ledger/background_rewrite_critique.md:80`).
- **Introduction and abstract, 2026-08-09** (`log/79`): *"clean, zero em/en dashes, zero curly
  quotes, zero AI-vocabulary hits."*
- **Document-wide, 21,463 words with comments stripped** (`ledger/phase_state.md:4703`): three
  genuine hits.
- **2026-08-13, commit `99ee32b`** *"Clear the AI-writing pre-flight on this session's prose"*, over
  the 4,009 words added since `1dfb029`.

### H-8.6 · The push back, with its evidence

`99ee32b`'s own commit message records a ruling on **precisely** the construction Hansi names,
verbatim:

> "rather than" runs 102 times document-wide and 23 times in the new prose,
> which makes "rather" the sixth most frequent content word, above Hall,
> Ellel and Section. Read one by one, nearly every instance names a real
> ruled-out alternative and is the qualification the claim depends on, so
> deleting them would widen claims -- the failure the compression rule in
> PRJ93_RULES.md exists to stop. Only the clusters are fixed.

`log/79` records the same for the abstract, verbatim: *"'rather than' density 5.4 per 1,000 words
against 4.7 to 7.7 across the composed chapters, so it is a house construction rather than a tell."*

**The push back is narrow and it does not deny his observation.** The rate is real, it is high, and
it is worse than the 102 that pass recorded, because the current count is 174. What is refused is a
**blanket** reduction: this project has already examined the instances one by one and found that
deleting the construction widens claims, which is the failure the memory `compression-widens-claims`
records and which no instrument here can detect afterwards. **The remedy that survives both is
recasting, not deleting** (the pass at `99ee32b` did exactly this for a "which is the <noun>" cluster
at `robustness.tex` 380, 411 and 440), plus fixing clusters where two instances sit in consecutive
sentences.

**Does this meet the warrant for a push back to a supervisor?** See section 6.2. Partly.

### H-8.7 · The risk, stated plainly

**A rhythm pass will ADD words, and the margin is +11.**

**Direction: upward, with high confidence.** Splitting a long sentence requires a new subject and
usually a connective; the typical cost is +2 to +5 marker words per split. There are **125 sentences
over 40 words**. Adding short sentences for rhythm is additive by definition.

**Magnitude.** Splitting one third of the over-40 sentences (42 splits) at +3 each is **+126**.
Splitting all 125 at +3 is **+375**. Recasting a colon-led apposition into two clauses typically
costs +1 to +3; there are 159. **A full style pass across the body plausibly lands between +150 and
+450, against a margin of +11 and a reserve floor of 250 that the document is already 239 below.**

**A style pass is not affordable at the current margin.** That is a statement about arithmetic, not
about whether Hansi is right.

---

# 3 · The appendix strategy, re-examined against H-A2

## 3.1 · The four items placed in S25 to S27

### (a) Appendix B.13, the static-regime disclosure

**What it is.** `appendix/robustness.tex:432-459`, added `c34c266` (S27, 2026-08-17, **unpushed**).
Discloses that the adoption gate reads one regime only (rolling-origin, 6 folds, 7-day horizon);
that on a second regime (a single 8-week static block) the served exogenous foundation arm
**produces no forecast at all at any venue**, raising a `ValueError`; and that at the Beer Hall the
static ordering puts the robust day-of-week baseline first at 0.704 MASE ahead of the univariate
foundation arm at 0.721, **so the benchmark that costs nothing to compute is not defeated at all**.

**Essential by Hansi's test? YES.** The body clause it discharges is at `methodology.tex:375-377`:

> The ladder exists to
> make rejecting the null expensive: a foundation model is served only where it defeats a benchmark
> that costs nothing to compute on the rolling-origin protocol
> (Appendix~\ref{app:static-regime}).

The body states an adoption **principle** with a scope qualifier ("on the rolling-origin protocol")
and puts the fact that the principle **fails outside that scope** entirely in the appendix. **A
marker who does not read Appendix B reads an unqualified-looking adoption principle with a
parenthetical they will not follow.**

### (b) The §7.3 partition finding at `app:conformal-bounds` (A.9.2)

**What it is.** `appendix/pseudocode.tex:226-253`. Derives the attainable conformal index, states
the Angelopoulos upper bound, then carries the C7/S20 finding: at Ellel 108 of 112 calendar-closed
days took nothing so the ninetieth percentile falls inside the zero atom and **the band has width
zero**; at the Beer Hall the 94 calendar-closed days on which the venue traded **cover 0.489, while
an unpartitioned band covers 0.926 on that cell, exactly what an occurrence oracle achieves**.

**Essential? PARTIALLY.** The *bound* limb is referenced from `methodology.tex:509` and is
corroborating. The *0.489 vs 0.926* limb is the sharpest negative result in the project and it is
**only in the appendix**. `results.tex:578` carries the 0.489 and the 77% shortfall in the body;
the 0.926 unpartitioned comparison and the oracle tie are appendix-only. `conclusion.tex:219`
depends on it: *"it is to group on an occupancy signal available before it, whose ceiling
Appendix~\ref{app:conformal-bounds} measures"*. **That is a load-bearing reference: the Further
Work proposal's ceiling exists nowhere else.**

### (c) The L2/L3 scope reasoning at the reconciliation section

**What it is.** `appendix/tables.tex:109-120`. Two scope decisions: the L2/L3 base forecast is the
robust day-of-week median throughout (rung-climbing deliberately not repeated below L1), and the
reconciliation is fitted and measured **at the Beer Hall alone**, so the figures *"carry none of the
estate-level force the ladder and the interval comparisons carry."*

**Essential? NO. Corroborating.** Both facts are already in the body:
`results.tex:162` (*"The Beer Hall hierarchy carries 41 nodes"*) and `results.tex:168`
(*"The base forecaster is a day-of-week median"*). The appendix carries the *reasoning*, not the
*fact*. A marker who skips it loses the justification and keeps the scope.

### (d) The Prophet note

**What it is.** `appendix/tables.tex:47-63`. A tenth entrant sat at Rung 2 and is absent because its
backend was not present when the reports were last regenerated; it had scored 0.799 at the Beer
Hall and 0.709 at Two River Taps, never scored at Ellel, and *"No adopted model moves on its
absence."* Also disposes of an apparent row-shift artefact as a coincidence.

**Essential? NO. Corroborating.** The body already states it at `results.tex:38-40`:
*"Two further entrants scored at no venue, one for want of its backend, so the nine that scored are
the nine the confidence sets below range over."* A marker who skips the appendix keeps the fact and
loses the audit trail.

## 3.2 · B.13, examined hardest

**Does the F0-plus-B.13 pair survive Hansi's answer? NO.**

The pair is exactly the shape his answer condemns. The body sentence at `methodology.tex:375-377`
reads, to a marker who does not open Appendix B, as an adoption principle with a technical
parenthetical. **What the parenthetical actually points at is the disclosure that the principle
fails outside the one regime it was measured in, and that at the anchor venue the free benchmark
wins.** That is not procedural detail. It is a limit on the document's own adoption argument.

**And the pair is currently worse than that**, because of finding 0.1: **B.13 is not on
`origin/main`.** The state Overleaf holds today has neither the B.13 section nor, at `6643753`, the
regime clause. A marker reading Overleaf today reads the unqualified principle with nothing behind
it at all.

**The body forms, re-priced against the current +11 margin.** These are the forms S27 considered and
withdrew (form (a), V0, and the +20 divergence form). Re-priced from the current text:

| form | what it does | delta |
|---|---|---:|
| **F0 (current)** | scope clause plus a pointer to B.13 | 0 (in place) |
| **F1, minimal** | append one clause naming the outcome: *"; on a single static block the day-of-week baseline is not defeated at the Beer Hall"* | **+15** |
| **F2, the withdrawn +20 divergence form** | a full sentence naming both the no-forecast failure and the reordering | **+20 to +24** |
| **F3, caption-free** | move the scope clause into `tab:ladder`'s caption in Appendix C | **0 in body, but the caption is also in an appendix, so it does not answer H-A2** |

**F1 at +15 is the cheapest form that survives Hansi's test.** It puts the *outcome* in the body and
leaves the *mechanism and the figures* in B.13, which is exactly the split his answer permits:
essential material in the body, supporting detail in the appendix. **This is a live cost against a
+11 margin and it is Nam's ruling.**

## 3.3 · Every reference from `chapters/` into `appendix/`, classified

47 references across 22 distinct labels. **Load-bearing** means the body claim is incomplete without
the appendix; **corroborating** means the body claim stands alone.

### Load-bearing (the exposure): 6

| site | target | why load-bearing |
|---|---|---|
| `methodology.tex:377` | `app:static-regime` (B.13) | **the adoption principle's scope failure exists nowhere else** (section 3.2) |
| `conclusion.tex:219` | `app:conformal-bounds` (A.9.2) | *"whose ceiling Appendix A.9.2 measures"* -- the Further Work proposal's ceiling exists nowhere else |
| `methodology.tex:637` | `app:agent-apparatus` (A.9.6) | *"The apparatus that addresses it is specified in Appendix A.9.6"* -- the entire specification of the frozen apparatus, which is contribution 5 |
| `methodology.tex:86` | `app:gap-signal` (A.9.7) | *"the knowledge-gap signal specified in Appendix A.9.7"* -- the specification is only there (this is Ruling 2's `2ecc81f`, ten minutes after the boundary) |
| `methodology.tex:275` | `app:elicitation` (A.9.1) | *"carries the elicitation argument and the basis-and-as-of stamping convention the in-sample denominator forces"* -- the argument for the ruler basis |
| `methodology.tex:523` | `app:mondrian` (A.9.3) | *"separates what the construction is, what it guarantees and what merely motivates it"* -- the body asserts a guarantee is NOT claimed and defers the separation |

### Corroborating: 41

`app:pseudocode` x 9 (pseudocode, environment, figures, MCS config), `app:robustness` x 8
(sensitivity, block-length sweep, stratification, seeds, mechanism breakdowns), `app:tables` x 5
(full ladder, bootstrap, reconciliation decomposition), `app:specification` x 2,
`app:exo-cols` x 3, `app:injection-pipelines` x 2, `app:mcs-numerics` x 2,
`app:conformal-bounds` (`methodology.tex:509`, the bound limb only),
`app:gap-signal` (`results.tex:933`, the result rather than the specification),
`app:adaptive-impl`, `app:hurdle-saturation`, `app:pairing-correction`, `app:rank-deflections`,
`app:divergence-catalogue`, `app:native-quantiles`, `app:spike-reachability`, `app:squared-loss`,
`app:closure-case`.

**Six load-bearing references are the exposure.** Four of the six are in Methods, which is the
chapter a marker is most likely to read closely, and all four defer a *specification* rather than a
*result*. That is the more defensible half of the exposure: HC72/HC73 ask that Methods flow
logically, not that it reproduce every parameter. **The two that are not specifications are the two
that hurt:** `app:static-regime` defers an adverse result, and `conclusion.tex:219` defers a
measurement that a Further Work claim rests on.

## 3.4 · The word-count question, which is NOT answered

**The 8C-7 ruling, verbatim, `brain/knowledge/00_marking_criteria.md:402`:**

> - ~~Whether the limit includes or excludes appendices.~~ **RESOLVED 2026-08-09: EXCLUDED. See §1.1.**

**What §1.1 claims, and on whose authority.** `00_marking_criteria.md:65-84`, verbatim:

> ### The scope of the 20,000, and the working target -- RULED 2026-08-09 by Phuong.
> ### CONFIRMED 2026-08-12 AGAINST THE ISSUED SOURCE. CLOSED -- DO NOT ASK AGAIN.
>
> **Confirmation, 2026-08-12.** The issued requirements were read end to end for this. They say
> **only** *"The dissertation must not exceed 20,000 words"* (:16) -- **the source is silent on what
> the 20,000 counts.** There is no sentence about the bibliography, the appendices, the abstract,
> captions or footnotes anywhere in the document. So the scope is **not derivable and never will
> be**: it is Phuong's ruling, it is the only answer this project has or can have, and **a later
> session that re-opens it is re-opening a question with no source-side answer.**

| Question | Ruling |
|---|---|
| Bibliography | EXCLUDED |
| **Appendices** | **EXCLUDED** |
| Abstract | INCLUDED |
| Target or cap | A HARD CEILING |

**This corrects the brief.** The brief states the exclusion sits *"on a supervisor ruling recorded
at `knowledge/00_marking_criteria.md:402`"*. **It is not a supervisor ruling.** The file says in
terms that it is **Phuong's** ruling and that **the issued documentation is silent**. The
supervisor has never been asked. `00_marking_criteria.md:427` separately records
*"Any cap on appendix length"* as NOT SPECIFIED.

**The totals:**

| population | marker words (`texcount -0 -sum -merge -total`) |
|---|---:|
| counted body (`abstract.tex` + six chapters) | **19,989** |
| appendices (four files) | **10,570** |
| **body + appendices** | **30,559** |
| appendix growth since 10 Aug | **+2,968 (+39%)** |

**If the exclusion is wrong, the document is 30,559 against a 20,000 cap.** That is not a margin
problem; it is a different document. **The exclusion is load-bearing for the entire reduction
strategy of the last fifteen packages, it rests on no source, and the one person who could settle it
has just written about appendices without mentioning the word count.**

**The question to put to him, drafted. NOT SENT:**

> Does the 20,000-word limit include the appendices? The submission documentation states only that
> the dissertation must not exceed 20,000 words and says nothing about what that counts, so I have
> been working to a body of 19,989 with 10,570 words of appendices excluded; if they are included I
> need to know now rather than after the reduction is finished.

**A second question, on H-A2 itself, drafted. NOT SENT:**

> You mentioned appendices are only assessed if necessary and that not all markers read them. Four
> pieces of supporting detail currently sit in appendices with a body pointer, including the scope
> limit on the model-adoption argument. Would you rather I bring the limits themselves into the
> body and leave only the derivations in the appendix, given that doing so costs body words against
> the 20,000?

---

# 4 · The budget under Hansi's requirements

## 4.1 · The sum of every OUTSTANDING item that needs body words

| item | minimum repair | delta |
|---|---|---:|
| **H-2** | expand TabPFN-TS, VUS-PR, CPTC, TSB-AD at first use | **+26** |
| **H-5** | quote all five RQs verbatim from `sec:intro-aims` at 5.1 | **+26** |
| **H-6 (a)** | rename the Chapter 6 heading | **+2** |
| **H-3** | nine `\citet` keys replace the pointer in the `fig:gap-map` caption | **-4** |
| **H-4 (option A)** | regenerate `gap_map.pdf` so the cell is not occupied | **0** |
| **H-A1** | resolved | 0 |
| **H-1** | reallocation inside a 300 cap | 0 |
| **H-7** | resolved | 0 |
| **Part 3, F1** | put the static-regime outcome in the body clause | **+15** |
| **SUBTOTAL, minimum** | | **+65** |

**Variants, not additive with the above:**

| variant | instead of | delta |
|---|---|---:|
| H-6 (b), objectives statement in the Introduction | in addition to (a) | +29 |
| H-4 option B, caption only | instead of option A | +11 (and the figure still asserts occupancy) |
| Part 3, F2, the withdrawn divergence form | instead of F1 | +20 to +24 |

## 4.2 · The resulting position

| | words |
|---|---:|
| counted body now | **19,989** |
| minimum outstanding total | **+65** |
| **landing** | **20,054** |
| cap | 20,000 |
| **overrun** | **54** |

Current margin is **+11**. **The minimum set does not fit. The shortfall is 54 words.**

With H-6(b) as well: 20,083, **shortfall 83**.
With H-4 option B instead of A: 20,065, **shortfall 65**.
Worst combination priced here (H-6 a+b, H-4 B, Part 3 F2): 20,107, **shortfall 107**.

**Note the reserve floor.** `ledger/reduction_cost_register.md` sets a reserve floor of 250 and the
document sits **239 below it** at +11. The register refuses items at margin 112. So the shortfall
is 54 against the cap and **304 against the project's own floor.**

## 4.3 · The levers that exist. Listed, not recommended.

**No reduction is proposed here.** The number comes first and the ruling is Nam's.

1. **The relocation lever.** Moving body material into an appendix. **Currently reversed:** the
   memory `prj93-declaration-counts-appendices` records this lever as re-established on 2026-08-14,
   and H-A2 is a supervisor's statement against using it. **It is available only if question 1 of
   section 3.4 comes back "excluded" AND question 2 comes back permissive.** It is the lever H-A2
   most directly attacks.
2. **The reduction register's refused items**, with their original grounds. Held at
   `ledger/reduction_cost_register.md`. Each was refused for a reason; the grounds would have to be
   re-read against the fact that a supervisor requirement now competes with them. The register's own
   realisation-rate history is against it: the memory `retention-scales-with-criterion-count`
   records three items priced at 70 to 84% landing at 19 to 28%, and
   `compression-returns-a-tenth-not-a-quarter` records a full rewrite of a 4,979-word chapter moving
   it 189 words. **A 54-word shortfall is inside the noise of this lever's own forecast error.**
3. **The appendix exclusion, if confirmed.** If question 1 returns "excluded" the cap stands at
   20,000 on the body and nothing changes; the lever is that relocation becomes usable again. **If
   it returns "included" the whole calculation above is void** and the document is 30,559.
4. **The abstract's 1 word of headroom.** Real, measured, and trivial against 54.
5. **Declining an item.** H-2's +26 could be answered by the acronym table alone, which already
   expands all four residues, on the argument that a front-matter table ordered by first use is
   a stronger answer to "introduce all abbreviations" than four inline expansions. **That is a push
   back, and section 6.2 assesses whether it meets the warrant.** It is the single largest
   discretionary saving available and it would close half the shortfall.

---

# 5 · Ryan's changes, checked against our codebase

**Governing constraint, restated.** Nothing in this stream may change a served model, a frozen
artefact, an evaluated path, or any reported number before submission. Where a defect he found
exists here and affects a reported number, the handling is **disclosure, not repair**.

**Scope.** His repository was not reachable from this session. Every claim about **his** codebase is
his, relayed. Every claim about **ours** is measured from our source or our store.

## R-1 · Ladder never re-runs; every venue serves from cold start; `ladder_selection` empty

**Verdict: ALREADY RESOLVED HERE, in the sense that it is already found, recorded and flagged. This
is corroboration from a second codebase and is recorded as such.**

**Our record, verbatim, `brain/CONTRACT.md:328-333`:**

> 6. **[OPEN]** Who runs the ladder. Compute honours `prior_state.served_model` and
>    cold-starts on `default_model` when it is absent, so promotion is continuous -- but
>    nothing in the compute path ever *re-runs* the gate. Verified against the engine:
>    `ladder_selection` comes back `[]` on every call. A tenant's served model is therefore
>    whatever it started as, for ever.

**And `brain/FLAGS.md:860`, verbatim:**

> (3) `served_forecast` and `ladder_selection` are **both empty in the store**, so there is no
> persisted record of the current model that a filter could read even if one were added.

**Are his diagnosis and ours the same defect?** Yes, and at three levels:

| limb | his claim | ours, measured |
|---|---|---|
| ladder never re-runs | yes | `CONTRACT.md:330` *"nothing in the compute path ever re-runs the gate"* |
| serves from cold start | yes | `ingest/refresh.py:253-255`: `_should_refit` reads `_last_refit`, which reads `ladder_selection`; empty means `last_refit is None`, which returns `False, "no prior fit on record; auto defers to the weekly force cron"`. **The auto path can never fire.** |
| `ladder_selection` empty | yes | `FLAGS.md:860`, `log/98` |
| every venue serves `rung2_ets` | yes | ours: `conformal.wrap.default_model('ellel')` resolves to `rung2_ets` because `MAX_RUNG` is `{}` post-G12.9c (`config.py:151`), recorded at `log/98` |

**Two independent codebases, two independent diagnoses, same three limbs.** Recorded.

## R-2 · His measured improvements

**Verdict: NOT COMPARABLE. Reported side by side, not reconciled.**

**Our committed gate, `models/ladder_results_L1_beer_hall.md` and siblings:**

| venue | served | MASE |
|---|---|---:|
| Beer Hall | `rung4_chronos2_exo` | 0.745 |
| Ellel | `rung1_robust_dow` | 0.572 |
| Two River Taps | `rung2_ets` | 0.597 |

**His:** Ellel 0.6857 to 0.5956; Beer Hall 0.7667 to 0.7350; Two River Taps stays on ETS.

**Does his ladder contain the Chronos arms? UNVERIFIED, and this is the material question.** His
repository is not reachable from this session. **Our entrant set, in full:**

| rung | entrant | BH rolling MASE |
|---|---|---:|
| 0 | `rung0_seasonal_naive` | 1.006 |
| 1 | `rung1_robust_dow` | 1.029 |
| 2 | `rung2_stl` | 1.125 |
| 2 | `rung2_ets` | 0.799 |
| 2 | `rung2_prophet` | not scored, backend absent |
| 3 | `rung3_gbm` | 0.927 |
| 3 | `rung3_global_gbm` | 0.920 |
| **4** | **`rung4_chronos_bolt`** | **0.796** |
| **4** | **`rung4_chronos2`** | **0.793** |
| **4** | **`rung4_chronos2_exo`** | **0.745** |

**Three foundation-model arms, all zero-shot, pinned by revision hash
(`chronos-forecasting 2.3.1`, `amazon/chronos-2`, `amazon/chronos-bolt-small`).**

**Why the numbers are not comparable, regardless of his entrant set.** His BH "before" of 0.7667
matches nothing in our column, and his "after" of 0.7350 matches nothing either; our nearest values
are 0.799 (`rung2_ets`) and 0.745 (`rung4_chronos2_exo`). **A MASE is a ratio to a denominator, and
this project spent a whole phase establishing that at Ellel the denominator basis moves the same
forecast between 0.411 and 0.092** (`methodology.tex:218`). Two MASE figures from two codebases with
unstated denominators, unstated bases and unstated data spans are two different quantities wearing
one name. **This is the memory `two-correct-numbers-can-be-an-incomparable-pair` exactly.**

**What would settle the entrant question:** his `PREDICTORS` registry, or the rung column of his
ladder report. One file.

## R-3 · The backtest window: six folds over the last 42 days

**Verdict: PRESENT AND MATERIAL. Our six folds are the same six folds, and the document does not say
so.**

**Our source says it in terms.** `brain/eval/harness.py:88-95`, `rolling_origin`, verbatim:

> `step_days` is how far the origin advances between folds. When it is None the
> origin advances by `horizon_days`, which is the historical behaviour and is
> preserved exactly: **six folds at a seven-day horizon gives six disjoint test
> windows over 42 days.** That cap is severe. At six folds the
> Harvey-Leybourne-Newbold small-sample correction is exactly zero, so no
> Diebold-Mariano variant is computable at all, and selection had no available
> test rather than a weak one (report 43).

`models/ladder.py:803` calls `evaluate_rolling(venue, n_folds=6, horizon=7)` with `step_days`
unset, so the default applies. `harness.py:124-131` builds the folds as
`test_end = last - step * (k - 1)` for `k` from 6 down to 1, so **the six test windows are the
last 42 calendar days of the frame, contiguous and disjoint, ending at the store ceiling.**

**By span, by dates, by contiguity:**

| property | ours |
|---|---|
| folds | 6 |
| horizon | 7 days |
| step | 7 days (default, `step_days` unset) |
| test windows | 6, disjoint, contiguous |
| **total evaluation span** | **42 days** |
| position | the last 42 days before the ceiling |
| training window | expanding: everything strictly before each test window |

**This is a material finding about our committed result.** The three figures the document reports as
the gate's selections (0.745, 0.572, 0.597) are means over **six weeks of test data**, one week per
fold, at each venue. The frames themselves are 399, 386 and 331 days; **the gate evaluates on the
last 11%, 11% and 13% of them.**

**What the document says.** `results.tex:32-33`, verbatim:

> The adoption gate of Section~\ref{sec:ladder} scored nine entrants at each venue over six rolling
> origins at a seven-day horizon

and `results.tex:41-44`, verbatim:

> One property of that gate bounds what it can establish: the Harvey--Leybourne--Newbold correction
> factor of Equation~\ref{eq:hln} is identically zero at six folds, so the selection carried no
> significance test rather than a weak one. A one-day origin step raises fold counts to $273$, $260$
> and $205$, which is what makes a test computable at all.

**The document never states that the six folds span only the last 42 days.** A careful reader can
derive it, from "six rolling origins at a seven-day horizon" plus the fact that a one-day step gives
273. **It is derivable and it is not stated**, and it is the more damaging of the two properties:
the missing significance test IS disclosed, and the 42-day evaluation span is not.

**Correspondence with his finding.** He reports that at the Beer Hall his six-fold configuration
picked rung1 and failed its own gate. **Ours does the same at the current ceiling**, and the
document says so at `results.tex:51-53`, verbatim:

> Evaluated at the
> current ceiling on the original six folds, the gate selected the robust day-of-week baseline and
> placed the served foundation model second of nine, $0.045$ behind it.

**Two codebases, six folds each, both selecting rung1 at the anchor venue.** His MASE of 1.2674 is
not ours (ours is 1.029 for `rung1_robust_dow`), for the denominator reasons in R-2.

**Handling: DISCLOSURE, not repair.** Changing the gate changes three reported numbers. The
disclosure would be a body clause naming the 42-day span. **Not priced here and not proposed**; it is
a fifth candidate for section 4's budget and it is Nam's ruling whether it joins the list.

## R-4 · The Mondrian per-group floor. Report 96, corrected.

**Verdict: PRESENT AND IMMATERIAL to any reported number, BUT report 96 carries a wrong adjacent
claim and this goes first.**

### R-4.1 · Report 96's core measurement stands

The partition **is** active in the store. The measurement at `log/96` section 1.3 is right, and the
reason it is right is that the path which wrote the store applies **no per-group floor at all**:

`conformal/wrap.py:161-167`, the whole function, verbatim:

```python
def _mondrian_quantiles(
    abs_res: np.ndarray, groups: np.ndarray, level: float
) -> dict[int, float]:
    return {
        g: conformal_quantile(abs_res[groups == g], level)
        for g in np.unique(groups)
    }
```

Every group present gets its own quantile, however small. `_persist_standby_forward`
(`wrap.py:268`) and `_persist_test_band` (`wrap.py:309`) both call it directly and neither filters.
**Ryan's defect cannot exist on this path, because the floor he describes is not here.**

### R-4.2 · Report 96 is WRONG that the compute path bands the same way

`log/96` section 1.2, verbatim:

> The compute engine's forward path bands the same way,
> `compute/forward.py:203`:
>
> ```python
>         by_grp = _mondrian_quantiles(abs_res, groups, level)
> ```

**It quoted line 203 and stopped seven lines short.** `compute/forward.py:203-219`, verbatim:

```python
        by_grp = _mondrian_quantiles(abs_res, groups, level)
        # The floor has to apply PER GROUP, not to the pool. Mondrian splits the
        # residuals after the pooled check, so a venue closed one day a week can clear 30
        # pooled and leave 4 in the closed group - and `conformal_quantile` clamps k to n
        # rather than failing, so that group's "90% quantile" is silently the max of 4
        # errors. Falling back to the marginal quantile is a real quantile of a real
        # sample; it is less conditional, and it is reported.
        thin = {g for g, n in zip(*np.unique(groups, return_counts=True), strict=True)
                if n < MIN_CALIB_RESIDUALS}
        for g in sorted(thin):
            by_grp.pop(g, None)
        ...
        q = np.array([by_grp.get(g, marginal) for g in target_grp])
```

**The compute path does NOT band the same way. It applies a per-group floor of
`MIN_CALIB_RESIDUALS = 30` (`compute/forward.py:42`) and pops any thin group.**

### R-4.3 · And on the compute path the closed group is dropped on every run

Arithmetic from two constants in our own source, both quoted above:

- `config.BAND_CALIB_DAYS = 90` (`config.py:263`), and `compute/forward.py:111` sets
  `first_target = last - pd.Timedelta(days=BAND_CALIB_DAYS)`.
- The calibration walk therefore covers **91 consecutive calendar days**, one residual row per day.
- **91 = 13 x 7 exactly**, so it contains exactly 13 Mondays and 13 Tuesdays.
- `STRUCTURAL_ZERO_DOW = frozenset({0, 1})` (`config.py:240`), Monday and Tuesday.
- **Closed-group size = 26. `MIN_CALIB_RESIDUALS` = 30. 26 < 30.**

**On the compute path, at every venue, on every run, the structural-zero group is popped and closed
days fall back to the marginal band. The Mondrian partition never activates.** That is exactly the
outcome Ryan reports, arrived at through the correct per-group floor rather than through his
mis-scoped one. The code even emits a note saying it happened
(`compute/forward.py:216-218`), so it is loud rather than silent.

### R-4.4 · Reconciling it against report 96

**Both are true, of different paths in the same repository.**

| path | writes | per-group floor | partition active? |
|---|---|---|---|
| `conformal/wrap.py` (research, store-writing) | `store/brain.duckdb`, which report 96 measured | **none** | **YES**, measured: BH half-widths 158 vs 728, Ellel 0 vs 545, TRT 197 vs 321 |
| `compute/forward.py` (tenant compute, stateless) | nothing persisted; in-memory bundle | **30, per group** | **NO**, 26 < 30 every run |

**Is report 96 wrong? On its headline, no. On one adjacent sentence, yes, and it goes here at full
prominence rather than in a footnote.** Report 96's claim that the compute path *"bands the same
way"* is false, and it is false because the report quoted the line it expected and did not read the
seven lines under it. **This is the memory `a-narrow-pass-is-not-a-pass` and
`field-name-is-not-a-definition` in one place: the quoted line said what the report predicted, and
the check stopped there.**

**Does it touch a reported number? No.** No dissertation figure comes from `compute/forward.py`.
Every reported band figure comes from the research path or from the store, both of which are
floor-free. **PRESENT AND IMMATERIAL** to the document, and **material to the handoff**, because the
Methods chapter describes a Mondrian construction that the tenant-facing compute path does not
perform.

## R-5 · His level-aware floor of 9 at 80% and 19 at 90%

**Verdict: ALREADY RESOLVED HERE, and his constants are shifted by one level.**

**It is the same quantity under a different name.** Ours, `conformal/wrap.py:73-88`, verbatim:

```python
def conformal_min_n(level: float, *, cap: int = 100_000) -> int:
    """Smallest calibration set at which `level` is actually attainable: 4 points
    for 80%, 9 for 90%.

    Split conformal takes the `ceil((n+1)(1-alpha))`-th smallest score; that index
    exceeds `n` for small n, where the correct prediction set is INFINITE and the
    guarantee is simply unavailable. Searched with the SAME expression
    `conformal_quantile` clamps on rather than the closed form `level/(1-level)`,
    which is not exact in binary --- `0.8/(1-0.8)` is 4.000000000000001, and
    rounding that up reports the boundary one point too high.
    """
```

Evaluated:

| level | `conformal_min_n` |
|---:|---:|
| 0.80 | **4** |
| 0.90 | **9** |
| 0.95 | **19** |

**His "9 at 80 per cent and 19 at 90 per cent" are our values for 90 per cent and 95 per cent.**
His constants are correct numbers assigned one level too low. The direction is **conservative**:
applying the 90% floor at 80% and the 95% floor at 90% withholds more bands than necessary and never
issues one below attainability. **No under-covered band results; more groups fall back than need to.**

**Does our implementation apply it?** Yes, and it also **counts** every time the guarantee lapses:
`conformal/wrap.py:216` tallies `undersized[lvl] += int((ag == g).sum() < conformal_min_n(lvl))`,
and `wrap.py:236` writes `min_calibration_n` into the reported metrics. `conformal_quantile`'s own
docstring states the position, verbatim: *"below that n the band is finite and carries NO coverage
guarantee. Callers that can hit small groups must count how often it fires ... A guarantee that
lapses silently on exactly the sparsest groups is the worst case."*

Our methodology states the same rule in the document, `appendix/pseudocode.tex:228-231`, verbatim:
*"The conformal index $k = \lceil (n_{\mathrm{cal}}+1)(1-\alpha) \rceil$ exceeds $n_{\mathrm{cal}}$
whenever $n_{\mathrm{cal}} < (1-\alpha)/\alpha$, which at $\alpha = 0.10$ is fewer than nine
calibration points."*

**Record this for the handoff.** The research specification carried the correct treatment, derived
by searching the same expression the quantile clamps on **specifically to avoid a floating-point
off-by-one that the closed form produces**, and it tallies its own lapses. His production carried
the right idea with constants shifted one level. **That is evidence about the value of the research
path and it belongs in the handoff, not in the dissertation.**

## R-6 · Curated data reachable from the serving path

**Verdict: PRESENT, REACHABLE, AND FULLY DISCLOSED. Not behind a flag here.**

**The import closure, measured:**

| module | imported by | on the scored path? |
|---|---|---|
| `ingest/calendar_sources.py` (Lancashire school and university terms) | `features/build_features.py:34`, `signals/residual.py:36`, `sim/build_frozen_forecast.py:36` | **YES** |
| `ingest/local_events.py` (Lancaster and Preston events) | `features/build_features.py:37`, `ingest/refresh.py:223` | **YES** |
| `ingest/world_cup.py` (2026 World Cup) | `features/build_features.py:38-39`, `signals/residual.py:180`, `ingest/refresh.py:224` | **YES** |
| `signals/weather_diagnostic.py` | **`tests/test_a14b_diagnostic.py` only** | **NO** |

**And it is named in the document, by column, in Appendix A.2**
(`appendix/pseudocode.tex:88-101`), verbatim:

> The gradient-boosting rung
> receives seven columns: \texttt{exo\_temp\_c}, \texttt{exo\_rain\_mm},
> \texttt{exo\_sunshine\_hrs}, \texttt{exo\_is\_dry}, \texttt{exo\_is\_school\_term},
> \texttt{exo\_is\_uni\_term}, \texttt{exo\_fixture\_nearby}.
>
> The foundation model's exogenous arm --- which is every arm of Table~\ref{tab:weather} ---
> receives fifteen, in four groups. Calendar: \texttt{is\_bank\_holiday},
> \texttt{is\_ellel\_event}, \texttt{exo\_is\_school\_term}, \texttt{exo\_is\_uni\_term}. Event:
> \texttt{exo\_fixture\_nearby}. World Cup: \texttt{wc\_match\_in\_hours}, ...

and in the body at `methodology.tex:316-318`, verbatim: *"is given fifteen in four groups: those
seven, a bank-holiday and an Ellel-event indicator, and six covariates describing a football World
Cup."*

**Do the weather and pooling nulls need re-examining? NO, and here is why.**

The weather result is a **contrast between five arms of one entrant**, and
`appendix/pseudocode.tex:103-104` states the design verbatim: *"The five weather arms of
Table~\ref{tab:weather} differ in nothing but the weather handed to the same entrant for the
seven-day window."* **The curated calendar, event and World Cup columns are held constant across all
five arms.** A covariate common to both sides of a contrast cannot manufacture or mask the contrast.
What it could do is raise or lower the **absolute** MASE of every arm together, and the document
reports the contrast rather than the level.

**Scope of this check, stated.** I traced the import closure and read the declared column sets; I did
not re-run the weather sweep with the curated columns removed. **A cleaner statement would need an
ablation arm, which would be a new measurement and is outside a read-only package.** What is
established is that the curated data is (i) reachable, (ii) declared by column name in the appendix
and summarised in the body, and (iii) common to both limbs of the contrast that carries the null.

**One genuine leak control is already in place and disclosed**, `appendix/pseudocode.tex:109-111`,
verbatim: *"a discount-share indicator is used retrospectively to flag anomalous days and is never
offered as a forward regressor, since admitting it would make the exogenous path a leak."*

## R-7 · `season = month % 12 // 3`

**Verdict: PRESENT AND IMMATERIAL.**

`signals/weather_diagnostic.py:89`: `df["season"] = (d.dt.month % 12 // 3).astype(int)`.

**The module is imported by exactly one file: `tests/test_a14b_diagnostic.py:10`.** It is not on the
scored path, not on the served path, and produces no reported number.

**And even if it were:** all three venues are in Lancashire. Northern hemisphere. The
southern-hemisphere mislabelling this expression produces cannot affect any number in this project.

## R-8 · `is_weekend = dow >= 5`

**Verdict: PRESENT, on a scored arm.**

`features/build_features.py:162`: `df["is_weekend"] = (df["dow"] >= 5).astype(int)`. That is the
feature frame every rung reads. A second copy sits at `signals/weather_diagnostic.py:85`, which is
test-only.

**A fixed weekend indicator is in the scored feature set.** Whether it *binds* is a different
question: `models/ladder.py:187` `rung1_robust_dow` takes a per-weekday statistic and never reads
`is_weekend`; the GBM and the foundation arms do. The document does not claim the indicator is
learned.

### The convergence, recorded

**Ryan replaced the fixed indicator with `is_peak_trading_day`, learned from the venue's own takings,
leak-free through the calibration walk.**

**That is an occurrence signal.** C7 identified **occurrence** as the variable the closure calendar
fails to track, and S20 established that adaptive calibration cannot repair the misspecified
partition. `log/96` measured the consequence: at the Beer Hall the 94 closed-but-traded days cover
**0.489**, while an unpartitioned band covers **0.9255**, which is exactly what an **occurrence
oracle** achieves (87 of 94, identical to three decimal places across arms A, C and E).

**Two codebases arrived at the same variable from opposite directions**: ours from a conformal
coverage failure, his from a feature-engineering improvement to the point forecast. **That is
evidence and it is recorded here**, and it belongs in the ledger and in the handoff.

**It does NOT go in the dissertation without a ruling.** `appendix/pseudocode.tex:247-249` states the
current position verbatim: *"That oracle is a ceiling and not a candidate method: whether the venue
traded is not known when the band is issued, so grouping on it is unavailable at forecast time."*
**A peak-trading-day feature learned from history is available at forecast time and is therefore not
the oracle**, which means it is a candidate method rather than a ceiling. **That is a substantive
change to what the Further Work section can claim, it is unmeasured here, and it is Nam's ruling.**

## R-9 · The list

| his item | present here? | touches a reported number? | verdict |
|---|---|---|---|
| **public holiday subdivision** | **no** | no | **ALREADY RESOLVED HERE**. `features/build_features.py:84-97` handles it and explains it: *"Lune is England, and `subdiv="England"` matters there (Scotland and Northern Ireland keep different days). Outside GB the subdivision is meaningless, so it is only applied where it means something"* |
| **unsupported country reporting** | **no** | no | **ALREADY RESOLVED HERE**. Same docstring: *"an unsupported country degrades to no holidays rather than raising, and `build_features` reports it"*, implemented at `build_features.py:94-97` as `except (NotImplementedError, KeyError): return set()` |
| **fold cap at 156** | **no** | n/a | **NOT APPLICABLE**. No `156` anywhere in `config.py`, `eval/` or `models/`. Our cap is `n_folds=6` (R-3) |
| **GBM thread pinning** | **no** | n/a | **NOT APPLICABLE**. No `n_jobs`, `OMP_NUM_THREADS`, `nthread` or `num_threads` in the tree. The research path is single-process |
| **org chunking** | **no** | n/a | **NOT APPLICABLE**. A production multi-tenant concern; the brain is one-org-one-call by contract |
| **`BrainOrgState.lastRefitAt` read but never written** | **YES, in shape** | no | **PRESENT AND IMMATERIAL**. `ingest/refresh.py:103` `_last_refit` reads `ladder_selection`, which is empty (R-1), so `last_refit` is always `None` and `_should_refit` returns `False, "no prior fit on record"` at line 254. **Read but never written, so the gate never fires.** Same class as his, composes with R-1 |
| **`_persist_standby_forward` hands predictors a date-only frame** | **YES, verbatim** | no | **PRESENT AND IMMATERIAL**, see below |

### R-9.1 · `_persist_standby_forward`, and whether it is the static-regime mechanism

**The defect is here, verbatim, `conformal/wrap.py:253-257`:**

```python
    last = pd.Timestamp(feats["date"].max())
    future = pd.DataFrame({
        "date": pd.date_range(last + pd.Timedelta(days=1), periods=STANDBY_DAYS, freq="D")
    })
    yhat = fn(feats, future, feature_columns(feats))
```

**`future` carries exactly one column, `date`, and is handed straight to a predictor along with the
full training column list.** Any covariate-reading entrant raises on it. The contrast is that
`compute/forward.py` **fixed this** and its own docstring says why, verbatim:

> Every column is built by the SAME function that builds the training column of that
> name - `calendar_features` then `_attach_exog`, exactly as `build_features` does.
> This module used to hand-roll its own versions, which is train/serve skew by
> construction, and it also silently omitted 13 columns so `rung3_gbm` raised KeyError

**Reachability: latent.** `_persist_standby_forward` fires only when `is_closed(venue)`, and
`evaluate`'s default `model_name` is `rung2_ets`, whose signature is
`rung2_ets(train, target, _cols=None)` and which never touches `cols`. **With ETS it never raises.**
It would raise with `rung3_gbm` or `rung4_chronos2_exo` on a closed venue, which is a configuration
this study never ran. `FLAGS.md` already scopes a neighbouring flag the same way
(`log/17` G12.9f: *"only fires via `_persist_standby_forward`"*).

### R-9.2 · Is S27's static-regime attribution wrong? NO. It is right, and now doubly verified.

**This is the question the brief asked to be answered at full prominence, and the answer is that
Appendix B.13 states the correct mechanism.**

**They are different defects.**

| | B.13's mechanism | Ryan's `_persist_standby_forward` |
|---|---|---|
| function | the static-regime ladder run | `conformal/wrap.py:248` |
| frame fault | a **gap** between train end and target start | **missing columns** in the target |
| exception | `ValueError` | `KeyError` |
| entrant affected | `rung4_chronos2_exo` only | any covariate-reading entrant |

**The evidence for B.13, from the prior record.** `log/16_Chronos2_Promotion_Report.md:78`, verbatim:

> Chronos-2's `predict_df` requires `future_df` to be a gap-free continuation

and at :231-232, verbatim:

> Chronos-2's `predict_df` gap-strictness versus
> `harness.time_split`'s validation-buffer gap. Loud failure, not worked [around]

**And the code explains why only the exogenous arm fails, which is the part that makes the
attribution checkable rather than merely plausible.** `config.py:247-248` sets `TEST_WEEKS = 8` and
`VAL_WEEKS = 4`, so the static split puts a **four-week validation slice between the training span
and the test block**. Then:

- `chronos2_predict` (`models/foundation.py:256-278`) wraps its `predict_df` call in
  `try: ... except Exception:` and **falls back to the tensor path**, `predict_quantiles(inputs=[...])`,
  **which carries no timestamps at all**. A gap cannot reach it.
- `chronos2_exo_predict` (`models/foundation.py:328-331`) has **no fallback**, and its docstring says
  so verbatim: *"No fallback to the univariate tensor path: if the covariate call fails for any
  reason (missing/NaN covariate, a predict_df error), this raises so the ladder harness reports it as
  a distinct failed entrant, never a silent degrade to the univariate row."*

**That predicts the exact pattern in the committed artefact**, `models/ladder_results_L1_beer_hall.md`
static-regime table: `rung4_chronos2` scores 0.721, `rung4_chronos2_exo` shows `error: ValueError`,
and the identical marker appears at both other venues.

**Appendix B.13's sentence is correct**, verbatim: *"the covariate path requires the frame it
forecasts into to be a gap-free continuation of the frame it conditions on, and the validation slice
between them is exactly such a gap, so the entrant refuses loudly rather than degrading to the
univariate path in silence."*

**Nothing in Appendix B.13 needs to change.**

## R-10 · His open items

| item | can it touch anything reported here? |
|---|---|
| production still serving `rung2_ets` | **No.** Our reported figures come from the committed gate and the research store, not from production. Independently, it is the same fact as R-1, already flagged |
| **sales feed stalled at business date 2026-08-09 against a cursor at 08-11** | **No.** `warehouse.assert_store_ceiling()` returns **`2026-07-07`**, run through the existing `.venv-forecast` interpreter with nothing installed. **His stall begins 33 days after our ceiling.** Every reported number is computed on data ending 2026-07-07 and no row after that date exists in our store to be affected |
| `posLocationId` never validated | **No.** A production ingest concern; our corpus is a CSV bootstrap reconciled against audited totals (`config.EXPECTED_TOTAL_ROWS = 92329`, `BH_NET_SALES_TOTAL = 202491.0`) |
| no operator UI | **No.** And it is the same absence the dissertation already declares: no accept-or-dismiss labels were obtained (H-4.2) |
| no alerting | **No.** Out of scope for the measured work |

**Report only. Nothing here reaches the dissertation.**

---

# 6 · Synthesis

## 6.1 · Every item, its verdict, its cost, its owner

| item | verdict | word cost | owner |
|---|---|---:|---|
| **H-A1** RQ answers cite results | RESOLVED SINCE 10 AUG | 0 | -- |
| **H-A2** appendix assessment | OUTSTANDING (Part 3) | see Part 3 | **Hansi** (question), Nam (ruling) |
| **H-1** abstract balance | OUTSTANDING | 0 (reallocation; +1 headroom) | Nam |
| **H-2** abbreviations | PARTIALLY RESOLVED, 4 residues | **+26** | Nam |
| **H-3** references in Figure 2.1 | PARTIALLY RESOLVED | **-4** | Nam |
| **H-4** Figure 2.1 positioning | **OUTSTANDING, he is right** | **0** (option A) | Nam |
| **H-5** quote each RQ in full | OUTSTANDING, and worse since 10 Aug | **+26** | Nam |
| **H-6** "Objectives revisited" | OUTSTANDING, he is right | **+2** (a) or **+29** (b) | Nam |
| **H-7a** "Appendix 24" | RESOLVED SINCE 10 AUG | 0 | -- |
| **H-7b** page 33 spacing | RESOLVED SINCE 10 AUG (globally, 12 Aug) | 0 | **Hansi** (question) |
| **H-7c** Table A.2 width | RESOLVED SINCE 10 AUG (by deletion) | 0 | -- |
| **H-7d** `formatcheck` remit | **two gate findings** | 0 | Nam |
| **H-8** density and repetition | PARTIALLY RESOLVED; **PUSH BACK** on blanket deletion | **+150 to +450 if done** | Nam |
| **Part 3** B.13 body form F1 | OUTSTANDING | **+15** | Nam |
| **Part 3** word-count scope | **UNRESOLVED, must be asked** | 0 to catastrophic | **Hansi** |
| **0.1** `c34c266` unpushed | **OUTSTANDING, has a deadline** | 0 | Nam |
| **R-1** ladder never re-runs | ALREADY RESOLVED HERE (corroboration) | 0 | Ryan (record) |
| **R-2** his measured improvements | **NOT COMPARABLE** | 0 | Ryan (one file would settle it) |
| **R-3** six folds over 42 days | **PRESENT AND MATERIAL** | disclosure, unpriced | Nam |
| **R-4** Mondrian per-group floor | PRESENT AND IMMATERIAL; **report 96 corrected** | 0 | Nam |
| **R-5** attainability floors | ALREADY RESOLVED HERE; his constants shifted one level | 0 | Ryan (handoff) |
| **R-6** curated regional data | PRESENT, REACHABLE, **fully disclosed** | 0 | -- |
| **R-7** `month % 12 // 3` | PRESENT AND IMMATERIAL (test-only, and GB anyway) | 0 | -- |
| **R-8** `is_weekend = dow >= 5` | PRESENT on a scored arm; **convergence recorded** | 0 | Nam (ruling on Further Work) |
| **R-9** the list | 5 NOT APPLICABLE / RESOLVED, 2 PRESENT AND IMMATERIAL | 0 | -- |
| **R-9.2** S27 attribution | **CORRECT. B.13 stands.** | 0 | -- |
| **R-10** his open items | NOT APPLICABLE (ceiling 2026-07-07) | 0 | -- |

## 6.2 · The push-back list

### Against Hansi. A push back to a supervisor needs a stronger warrant.

**PB-H1 · H-8, blanket reduction of "rather than". MEETS the warrant, narrowly, and only as a
qualification rather than a refusal.**

*Evidence:* commit `99ee32b` (2026-08-13) records that the instances were read one by one and that
*"nearly every instance names a real ruled-out alternative and is the qualification the claim depends
on, so deleting them would widen claims."* `log/79` records the density measured against the
composed chapters. The memory `compression-widens-claims` records that cutting a qualifier does not
shorten the sentence and that no instrument here can detect the damage afterwards.

*Why it meets the warrant:* it is a documented prior examination of the exact construction, not a
preference, and the failure mode it prevents (a widened claim) is more serious in a dissertation
than the stylistic cost it accepts.

*What it does NOT license:* denying the rate. 174 occurrences at 5.49 per thousand is high, and the
verbatim-reproduced appendix in the same document sits at 1.68. **The honest response is
"recasting, not deleting, and the clusters go first", not "no".**

**PB-H2 · H-2, that the acronym table already discharges the four residues. DOES NOT MEET the
warrant.**

*Evidence available:* `acronyms.tex` is 34 rows, ordered by first use, with a stated rationale, and
it explicitly says *"This table SUPPLEMENTS inline first-use definitions and does not replace them."*

*Why it fails:* the table's own header concedes the point. Arguing that a front-matter table
replaces inline expansion contradicts the project's own written position, and it would be arguing to
save 26 words. **This is a budget argument wearing a scholarship argument's clothes. Do not make it.**

**PB-H3 · H-7, that the three formatting items are resolved. MEETS the warrant, easily, and is not
really a push back.**

*Evidence:* six occurrences of "Appendix 24" in the 10 August build against zero now, with the audit
of all 22 appendix references; a measured 182.02 pt spill on a table whose appendix no longer
exists; a measured modal leading of 21.67 pt then against 14.45 pt now. **This is a report of work
already done, delivered with its measurements. It should be sent as such.**

**PB-H4 · H-5, that §5.1's openers are paraphrases rather than "numbers only". DOES NOT MEET the
warrant, and should not be raised at all.**

His phrasing is loose; his substance is right; and the measurement shows the document moved 39 words
**away** from what he asks after he read it. **Correcting his wording while conceding his point
gains nothing and costs credibility.**

### Against Ryan. A collaborator, and the bar is lower.

**PB-R1 · R-2, the improvement figures are not comparable.** *Evidence:* our three foundation arms,
listed in full; the fact that neither his 0.7667 nor his 0.7350 matches any value in our column; and
`methodology.tex:218`, that at Ellel the denominator basis moves the same forecast between 0.411 and
0.092. **Ask for his `PREDICTORS` registry. One file settles it.**

**PB-R2 · R-4, the per-group floor defect does not exist on our store-writing path.** *Evidence:*
`conformal/wrap.py:161-167` quoted in full, which applies no floor at all. **But concede immediately
and fully that it DOES exist on `compute/forward.py`, that the arithmetic (26 vs 30) makes it fire
on every run at every venue, and that his finding corrected an error in our own report 96.** A push
back that omitted the concession would be false.

**PB-R3 · R-5, his floors are shifted one level.** *Evidence:* `conformal_min_n` evaluated at 0.80,
0.90 and 0.95 returns 4, 9 and 19. His 9-at-80 and 19-at-90 are our 90 and 95 values. **Conservative
in direction, so nothing under-covers; more groups fall back than need to.**

**PB-R4 · R-9.2, `_persist_standby_forward` is not our static-regime failure.** *Evidence:* the
KeyError-vs-ValueError distinction, the tensor fallback in `chronos2_predict` against the explicit
no-fallback in `chronos2_exo_predict`, and `log/16:78`. **His defect is nonetheless real and present
in our tree at `conformal/wrap.py:253-257`, and that is worth thanking him for.**

## 6.3 · The question list. Nothing sent.

**Q1 · To Hansi. The word-count scope. This blocks everything in section 4.**

> Does the 20,000-word limit include the appendices? The submission documentation states only that
> the dissertation must not exceed 20,000 words and says nothing about what that counts, so I have
> been working to a body of 19,989 with 10,570 words of appendices excluded; if they are included I
> need to know now rather than after the reduction is finished.

**Q2 · To Hansi. What H-A2 actually asks for.**

> You mentioned appendices are only assessed if necessary and that not all markers read them. Four
> pieces of supporting detail currently sit in appendices with a body pointer, including the scope
> limit on the model-adoption argument. Would you rather I bring the limits themselves into the body
> and leave only the derivations in the appendix, given that doing so costs body words against the
> 20,000?

**Q3 · To Hansi. Line spacing, which this project's own criteria file records as unresolved in both
directions.**

> On the line spacing you noted: the draft you read was set at 1.5 and it is now single-spaced. The
> submission documentation specifies A4, 12pt, standard margins and justification and says nothing
> about spacing, though the template comment attributes 1.5 to MARP Appendix 2 for examiner
> annotation. Which do you want?

**Q4 · To Nam. Figure 2.1.**

> Option A regenerates `gap_map.pdf` so the top-right cell is not occupied, at zero body words but
> requiring the figure toolchain and its three self-assertions to be re-run. Option B changes the
> caption for +11 and leaves a highlighted box reading "this dissertation" in the cell. Which?

**Q5 · To Nam. The B.13 body form, at +15 against a +11 margin.**

**Q6 · To Ryan. His entrant set.**

> Does your ladder include the Chronos-2 arms? Ours fields `rung4_chronos2`, `rung4_chronos2_exo`
> and `rung4_chronos_bolt` alongside a global GBM, and at the Beer Hall the exogenous Chronos arm is
> what the gate selects at 0.745. If yours does not, your best is best of a smaller field and the
> two sets of figures are not comparable. Your `PREDICTORS` registry would settle it.

**Q7 · To Ryan. His denominator.**

> What denominator and basis do your MASE figures use? At Ellel the same forecast reads as 0.411 or
> 0.092 across four admissible bases here, so I cannot place your numbers against ours without it.

## 6.4 · The ordering. No sequence recommended; Nam rules.

**Free, and already done. Report and close:**
H-A1, H-7a, H-7b, H-7c. Nothing to apply; these are measurements to send.

**Free to apply, no words:**
H-4 option A (figure regeneration, 0 words). H-7d (the two `formatcheck` gate findings, a tooling
change). R-4's correction to report 96 (a log entry). The R-8 convergence record (ledger plus
handoff). The R-5 handoff note.

**Word-negative:**
H-3, at -4.

**Costs words, and the total does not fit:**
H-2 (+26), H-5 (+26), H-6a (+2) or H-6b (+29), Part 3 F1 (+15). Minimum +65 against a margin of +11.
**Shortfall 54.**

**Costs words and is not priced:**
H-8 (+150 to +450 for a style pass). R-3's 42-day disclosure.

**Blocked on an answer:**
Q1 gates the entire section 4 calculation and the relocation lever. Q2 gates whether Part 3's F1 is
required at all. Q3 gates whether a spacing change is owed. **Nothing in the word-costing set should
be applied before Q1 returns.**

**Has a deadline independent of all of the above:**
Finding 0.1. `c34c266` is not on `origin/main`, so B.13 and its body clause are not on Overleaf.

---

# 7 · Unsolicited findings, including where this brief is wrong

**This brief's characterisation of both feedback streams was treated as a claim to be checked. Six
of its statements do not survive.**

**7.1 · There are FIVE research questions, not four.** The brief says *"Enumerate all four"* (H-A1)
and *"Quote all four current openings"* (H-5). `chapters/introduction.tex:131-145` carries five, and
`sec:disc-answers` answers five. Every count in this report is over five.

**7.2 · The labels the brief names do not exist.** It cites `sec:disc-rq`, `sec:rqs` and `sec:gap`.
The document's labels are `sec:disc-answers`, `sec:intro-aims` and `sec:intro-gap`. `latexcheck`
reports zero undefined references, so the brief's names are not stale labels in the document; they
are approximations.

**7.3 · "S27 removed 12 words from §5.1 RQ4" is wrong three ways.** S27 (`c34c266`) did not touch
`chapters/discussion.tex`. The compression was `f34a486` (11 Aug) and `1dfb029` (12 Aug). And the
measured loss is **142 words across the five paragraphs, of which RQ4 alone lost 42**, not 12.

**7.4 · The abstract is 299 marker words, not 300.** There is one word of headroom.

**7.5 · The appendix exclusion is not "a supervisor ruling".** The brief says it is. `00_marking_criteria.md:65-77`
says in terms that it is **Phuong's** ruling and that the issued documentation is silent. The
supervisor has never been asked. **This is the single most consequential correction in the report**,
because it means the +11 margin the whole package is priced against rests on an unasked question,
and the person who could answer it has just sent feedback about appendices.

**7.6 · `origin/main` is NOT at or beyond `c34c266`.** The brief asserts it should be. It is at
`6643753`; `c34c266` is unpushed. Section 0.1.

**Findings not asked for:**

**7.7 · `formatcheck --body-from 21` skips printed pages 1 to 5.** Chapter 1 begins at PDF page 16
and the gate starts at 21. Measured consequence today is nil (max overshoot +0.12 pt in that range),
but the gate's scope claim is false and the constant has not tracked the front matter's length.
Section H-7.4.

**7.8 · `latexcheck` reports a 2.81 pt overfull box at `notation.tex:109-110`, in the exact region
`formatcheck` cannot reach.** The two instruments have a blind band between page 1 and page 20, and
two large longtables moved into it on 10 August.

**7.9 · Report 96's claim that `compute/forward.py` "bands the same way" as `conformal/wrap.py` is
false.** It quoted line 203 and the per-group floor is at lines 210 to 217. Section R-4.2. Report
96's headline measurement is unaffected and stands.

**7.10 · The two Chronos arms may not have been scored by the same API on the static block.**
`chronos2_predict` falls back from `predict_df` to the timestamp-free tensor path on any exception;
`chronos2_exo_predict` does not. If the four-week validation gap broke `predict_df` for the exo arm,
it broke it for the univariate arm too, which then **silently succeeded by a different code path**.
**Appendix B.13 now prints 0.704 and 0.721 as a comparison**, and 0.721 may be a tensor-path number
while the rolling 0.793 is a `predict_df` number. **The runtime-info line in the ladder report cannot
settle it**: `_CHRONOS2["api"]` is a module-level dict written on every call and both regimes run in
one process, so the recorded *"API path predict_df"* is last-write-wins across the whole run. What
would settle it is one instrumented re-run recording the API per regime. **No reported result depends
on it** (B.13 itself says *"No figure reported in Section~\ref{sec:res-ladder} is disturbed by any of
this"*), but a comparison now printed in the appendix rests on it.

**7.11 · `app:derivations` (prints A.9) is defined and referenced by nothing.** An orphan label, of
the class the memory `a-removal-can-strand-the-label-it-left-behind` records. Harmless today.

**7.12 · The colon-led apposition runs at essentially the same rate as "rather than" (159 against
174) and Hansi did not name it.** If a style pass happens, it is the second target and nobody has
asked for it.

**7.13 · `project_specification.tex` is a control for the H-8 finding, inside the same document.**
It is a verbatim reproduction of writing this project did not compose, and its "rather than" rate is
1.68 per thousand against 5.91 in the composed body. **That is a three-and-a-half-fold difference
measured on one instrument within one file set, and it is the strongest available evidence that
Hansi's observation is about this project's prose rather than about academic prose in general.**

