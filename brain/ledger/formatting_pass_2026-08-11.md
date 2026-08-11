# Formatting pass — 2026-08-11

Typesetting only, on the Overleaf clone. **No content change: nothing rewritten to
fix a page break, nothing cut, nothing added.** The counted body measures **19,961
words before and after**, by the same instrument the compiled declaration uses
(`texcount -0 -sum -merge -total` over the six chapter files plus `abstract.tex`).

Three commits on `/Users/hapuna/Downloads/prj93-overleaf`, one per item, each
separately reversible:

| | commit | item |
|---|---|---|
| 1 | `7367ea2` | tables no longer spill into the margin |
| 2 | `cd6bf2f` | floats meet the text that introduces them |
| 3 | `45e4090` | `\raggedbottom`, widow and orphan control |

`origin/main` is **`ec334a64`** and unchanged. Three commits await a push, which is
Phuong's — see the standing row in `BLOCKED_third_party.md` §F.

---

## 0 · What the submission requirements fix, and what they leave open

Read before anything was changed, from
`brain/docs/Student Documentation - MSc DS - Dissertation Submission.md` and
`brain/knowledge/00_marking_criteria.md` §1.2. **No mandated value was touched.**

**Mandated, and therefore not available as a lever:**

| | Requirement | Source | Document |
|---|---|---|---|
| HC8 | body font size is 12pt | Submission doc :21, :170, :183 | `\documentclass[twoside,12pt,a4paper]` — unchanged |
| HC11 | A4 | :169 | `a4paper` + `geometry[paper=a4paper]` — unchanged |
| HC10 | "standard margins" | :169 | `\newgeometry{left=35mm,right=25mm,top=25mm,bottom=25mm}` — unchanged |
| HC16 | full justification, both edges, in preference to ragged right | :186 | unchanged — see the note below |
| HC12/13 | text and headings justified to the left margin | :184 | unchanged |
| HC19 | every page numbered | :191 | unchanged |
| HC27/28 | each chapter starts a new page; sections do not unless necessary | :173 | unchanged |
| — | **"Try to position each table or figure close to where it is first referenced"** | :207 | **this is the criterion item 2 serves** |
| HC1 | 20,000-word limit | :16 | body 19,961, unchanged by this pass |

**`\raggedbottom` does not touch HC16.** HC16 is *horizontal* justification — text
flush to both left and right edges. `\raggedbottom` is *vertical* — it stops LaTeX
stretching inter-paragraph glue to force every page to the same depth. The two are
independent settings and the naming similarity is the only thing they share.

**Left open by the requirements** (`00_marking_criteria.md` :281–295): any page
limit, the font *family* (only the size is specified), exact margin measurements
("standard" only), and **required line spacing**. Silence is not permission to do
anything unusual, so `\linespread{1.5}` and the 35/25/25/25 mm margins were left
exactly as the Lancaster template sets them.

**Declined on those grounds:** nothing in this pass reduces line spacing, shrinks a
margin or changes a font size to gain space. No such change was needed — every
overrun was recoverable by column geometry, and every white-space defect by float
parameters. Had one been needed it would have come to Phuong as a question.

---

## 1 · Tables spilling into the margin

`latexcheck` reported 7 overfull boxes. Classified: **3 in float tables, 2 in the
bibliography, 2 sub-3pt in centred TikZ figures.**

| overflow | where | float or prose | method | why this method |
|---|---|---|---|---|
| 182.80pt | `tab:screening-boundaries` (Table A.2) | float | first column `l` → `L{0.30\textwidth}`, second `p{0.72}` → `L{0.66}` | ran off the **page**, not merely the text block — the right third of every recorded reason was unreadable. The cells are prose, so a bounded paragraph column wraps and loses nothing; a `resizebox` would have shrunk the widest table in the document below `\small` |
| 48.05pt | `tab:bootstrap` (Table D.2) | float | `\resizebox{\textwidth}` + `@{}` | seven columns already at `\footnotesize`, so the column-padding budget (84pt total) could not recover 48pt without a further font step that would drop it below every other appendix table. Scaling keeps every column and every digit at ~90 % of `\footnotesize` |
| 42.45pt | `tab:bases` (Table 3.2) | float | `@{}` + `\tabcolsep` 6pt→5pt + body `\small`→`\footnotesize` | body chapter, so a real table (selectable text, true rule weights) is worth keeping over a scaled image. `\footnotesize` also **matches Table D.2**, which carries the identical 21-character monospaced `Basis` column — the thing that makes both overrun. Caption left at `\small` |
| 110.03pt | NeurIPS hash URL, bibliography | prose | `biburlnumpenalty` / `ucpenalty` / `lcpenalty` = 9000 | biblatex refuses to break a URL anywhere by default |
| 88.49pt | Hansen eprint string, bibliography | prose | **NOT FIXED — reported** | see below |
| 2.54pt | `pseudocode.tex` centred float | float | **not touched** | 0.9mm, centred, so it bleeds 1.27pt per side and puts **no ink outside the text block** at a 0.5pt tolerance |
| 1.97pt | `methodology.tex` centred float | float | **not touched** | as above, 0.7mm |

**No fix reduced precision.** No column was dropped, no bound truncated, no figure
rounded. Every digit in Tables 3.2, A.2 and D.2 is the digit that was there before.

### Verified by rendering, not by the absence of a warning

Measured **where ink actually landed** on every page, which is a different question
from what TeX warned about, and the two disagree in both directions. *(Run at the time
with a scratchpad script; that measurement is now section 1 of the committed
`brain/scripts/formatcheck.py` — see "Made repeatable" at the foot of this file. Do not
go looking for the scratchpad version.)*

```
                    before            after
pages with ink outside the text block   6 of 144    2 of 146
```

Calibration, because a clean result needs the scope of the check: of **4,453 body
lines measured, 2,146 land at 0.0–0.1pt** of the right margin and **only two exceed
0.5pt**. The instrument is not over-reporting.

### Not fixed, reported rather than resolved

1. **The Hansen eprint string, 88.49pt / 73.3pt of ink in the right margin.**
   `ref.bib`:652 carries
   `note = {\_eprint: https://onlinelibrary.wiley.com/doi/pdf/10.3982/{ECTA}5771}`.
   That is a **Zotero translator artefact in a free-text field**, not a URL — so
   biblatex typesets it as ordinary prose with no break points and the three
   `biburl` counters never see it. It duplicates the `doi` and `url` already
   printed in the same entry. The repair is to drop the field, which is a
   bibliography-data edit and outside a formatting pass. **Needs a ruling.**
2. **3.61pt (1.3mm) of ink in the right margin at
   `appendix/project_specification.tex`**, on the line ending "…to answer staff".
   Real, per the calibration above — and **TeX reports no overfull box for it**,
   so it is invisible to `latexcheck` in both the before and after states.
   `\emergencystretch=2em` did not clear it.

---

## 2 · Float placement

**The measurement that matters, and the one that does not.** A cross-chapter
"distance to nearest `\ref`" metric is the wrong instrument here for two reasons,
both discovered by running it:

- Appendix floats referenced from the body report drifts of 67–94 pages. That is
  inherent to having appendices, not a defect.
- Five Chapter 4 tables report drifts of 5–15 pages because **their only `\ref`
  sites are in Chapter 5** — see `five-results-tables-are-cited-only-from-discussion`.
  They are not misplaced.

The right instrument is **heading page against float page within a section.**

### Appendix B before and after — the stated priority

```
BEFORE                          AFTER
p114  Split conformal           p116  FLOAT Algorithm 1
p115  The adoption rule         p117  Split conformal        <- facing spread
p115  The deviation detector    p117  The adoption rule
p117  FLOAT Figure B.1          p118  FLOAT Algorithm 2
p117  FLOAT Figure B.2          p119  The deviation detector
p118  Deployment architecture   p120  FLOAT Algorithm 3
p118  Rolling-origin eval       p121  Deployment architecture
p118  MCS pre-registration      p121  FLOAT Figure B.1
p123  FLOAT Algorithm 1         p121  Rolling-origin eval
p124  FLOAT Algorithm 2         p122  FLOAT Figure B.2
p125  FLOAT Algorithm 3         p122  MCS pre-registration
p126  FLOAT Table B.2           p123  FLOAT Table B.2
```

Before: **a run of six headings across three pages, then a run of four floats
across four pages.** Algorithm 1 sat **nine pages** after the section that
introduces it; Table B.2 **eight**. After: nothing is more than one page from its
heading. Algorithm 1 lands on the **facing verso** (printed 96) of its section
(printed 97), so both are in view in the same spread.

### The three changes

1. **Every float specifier normalised to `[htbp]`.** Was 18 `[tbp]` tables, 10
   `[tbp]` figures, 3 `[t]` algorithms, 2 `[t]` tables, 3 `[h]` tables. `[t]` and
   `[h]` alone are what let the algorithms defer past their own sections.
   **`[H]` appears nowhere, before or after** — it defeats the algorithm and
   produces exactly the white space item 3 is about.
2. **`\FloatBarrier` before all 25 `\section*` headings** in the four appendix
   files carrying floats. Called explicitly rather than via placeins' `[section]`
   option: the appendices head with `\section*`, and an explicit barrier is visible
   in the diff and cannot silently stop applying to a starred heading.
3. **Float parameters relaxed**, because at their defaults a float of any size is
   pushed to a page of its own — which produces both the near-empty float page and
   the gap on the page the float left:

   | | default | now | effect |
   |---|---|---|---|
   | `\topfraction` | 0.70 | 0.85 | most of a page may be float, at the top |
   | `\bottomfraction` | 0.30 | 0.65 | a bottom float may exceed a third of the page |
   | `\textfraction` | 0.20 | 0.10 | less text needed for a page to stay a text page |
   | `\floatpagefraction` | 0.50 | 0.75 | a float page must be three-quarters full, so a lone medium table can no longer claim one. Kept **below** `\topfraction`, or a float qualifying for neither destination loops |
   | `topnumber`/`bottomnumber`/`totalnumber` | 2/1/3 | 3/2/5 | the counters, not the fractions, bound several appendix sections |

### Known cost, tested rather than assumed

**Table A.3 now sits alone on the last page of Appendix A.** Removing Appendix A's
`\FloatBarrier`s and recompiling leaves it on the same page, so the barriers are
**not** the cause — the taller wrapped Table A.2 from item 1 and the float
parameters are.

---

## 3 · White space and orphaned pages

Re-measured on item 2's output, per the brief, rather than on the state before it.

**The cause was `\flushbottom`**, which `report` sets under `twoside`: every page is
forced to the same depth by stretching glue between paragraphs, headings and floats,
so a page a float has left short puts all that stretch into a few gaps. The log
carried **34 underfull `\vbox` warnings, 22 at badness 10000** — each one a page TeX
could not fill without stretching past tolerance. That is the inconsistent
inter-paragraph spacing, and it is a side effect rather than a setting anyone chose.

```
\raggedbottom                slack collects at the bottom margin instead
\widowpenalty=10000          a single line may not be stranded at a page top
\clubpenalty=10000           ... nor at a page bottom
\displaywidowpenalty=10000
\emergencystretch=2em        a final pass to find breaks \hyphenpenalty=5000 blocks
```

Widow control at 10000 is safe **because** `\raggedbottom` is set: the usual
objection is that forbidding widows leaves pages underfull, and underfull pages are
now allowed to be underfull rather than stretched.

### The metric had to be corrected before it could be read

The first version summed the widest white run per page **including the bottom gap**,
and reported gaps rising 22 → 32 after `\raggedbottom`. Moving slack to the bottom
margin is that setting's entire purpose, so the metric was scoring the remedy as the
disease. Separating **INNER** gap (a hole *between* content — the defect) from
**BOTTOM** gap gives the real movement:

| | before | after item 2 | after item 3 |
|---|---|---|---|
| body inner gaps > 60pt | 10 | 12 | **2** |
| appendix inner gaps > 60pt | 5 | 1 | **0** |
| body inner white | 2833pt | 2915pt | **2101pt** |
| appendix inner white | 1461pt | 1285pt | **1151pt** |
| underfull `\vbox` | 34 | 34 | **7** |
| pages | 144 | 145 | **146** |

The two added pages are the taller wrapped Table A.2 (item 1) and the widow control
(item 3).

### `\looseness` was tried and refused

`\looseness=-2` on the final Results paragraph left p.77 at 27 words and Discussion
still opening at p.78 — TeX cannot set that paragraph shorter. **Reverted rather
than left in place doing nothing.** Recorded because a lever with no recorded
failure is unvalidated rather than unusually good.

### What remains, and why it is not worth fixing

Three stub pages: end of Results, end of Appendix A, end of Appendix B. All three
are **chapter tails** — the next chapter opens on a fresh page in every case, so
none costs a page. Their two-line length **is `\widowpenalty` working**: one line
would be worse, not better.

---

## Verification

- **Fresh clone of the committed state**, cloned from the working clone at
  `45e4090`, with **`main-words.sum` confirmed ABSENT** and the `svg.sty` stub
  supplied through `TEXINPUTS` from scratch so the clone itself stays clean.
  `git status` on the clone after the build: empty.
- `latexcheck main.tex --shell-escape --outdir <scratch>`: **PASS**, 146 pages,
  **0 errors, 0 undefined references, 0 undefined citations, 0 floats lost**,
  3 overfull (from 7), 7 underfull (from 34).
- `completenesscheck`: **PASS**, walked 28 files.
- `figurecheck`: **PASS**, 20 figure sources in the clone, 8 generators in the repo.
- `venueordercheck`: **FAIL, 4 findings, all pre-existing and unchanged** —
  verified by running it on `ec334a64` and getting the identical three ORDER
  findings at identical lines plus the same UNANCHORED finding
  (`robustness.tex`:221 → :228, shifted only by inserted `\FloatBarrier` lines).
  Scanned 13 files both times.

**Tier 2 only.** All of the above is TeX Live 2026 locally, which is not Overleaf's
until T3-1 closes. None of it is a claim about the target render.

---

## Made repeatable — the gate, added the same day

This pass was run with four throwaway scratchpad scripts. That is exactly the shape
the rules warn about twice over: *a number that enters a decision comes from an
instrumented tool, never an ad-hoc script*, and the `svg.sty` stub that has been
re-created under a different directory name in each of the last three sessions. A
process nobody can re-run is a process that will be re-invented differently.

So the measurements are now one committed instrument, **`brain/scripts/formatcheck.py`**,
and the requirement to run it is one rule, `PRJ93_RULES.md` →
**Overleaf pre-flight → The formatting gate**, with a pointer from the compile-and-push
lifecycle. Specified once, pointed at once.

**Verified in both directions before being relied on**, per the assertion rule.
`--self-test` plants a known spill and asserts it is found on every page, plants none
and asserts none is found, feeds an empty scan and confirms the tool refuses rather
than passing, and checks that bottom slack is not counted as an inner gap.

**The self-test failed on its first two runs and both failures were real.** The first
fixture shifted a long line leftwards so its right edge would overshoot by a chosen
amount — which pushed its *left* edge 30pt into the left margin, and the tool correctly
reported that instead of the planted defect. The second fixture ran off the physical
page, so the span bbox was clipped and a 269pt overshoot measured as 173pt. A fixture
assertion now refuses a fixture that does not fit on the page.

**Validated against the real document, not only the fixture.** Run on the pre-pass
build it reports the same six spilling pages the hand-rolled scripts found, to within
0.1pt. Run on the post-pass build it reports two, both of them the ones raised for a
ruling. The derived text block comes out at 99.2–524.5pt, **150.0 mm** — independently
reproducing `\newgeometry{left=35mm, right=25mm}` without being told it, which is the
cross-check that the geometry is measured rather than assumed. Calibration: 84 per cent
of justified body lines land on the derived right margin.

**`brain/ledger/format_accepted.txt`** carries the two ruled exceptions so the gate
stays usable — the Hansen `note` artefact and the 3.5pt `project_specification` line.
Each is keyed on text rather than page, and capped, so the same defect getting worse
still fails. **Both lines are deleted the moment their defects are repaired.**
