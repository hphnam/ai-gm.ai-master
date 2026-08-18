# S29 · Post-push verification and the free repairs

**Package:** verify, then apply. **Verdict: V1 PASSED, V2–V5 applied and verified.**
**Counted body delta: −4. Gate met exactly. No positive movement anywhere.**

---

## 0 · The table the package asks for

| | at start | at end |
|---|---|---|
| `ai-gm.ai-master` HEAD | `609badaf` | **`671772f6`** — PUSHED, see §8 |
| `prj93-overleaf` HEAD | `c34c266` | **`8e4e1a0`** — PUSHED by Nam, see §8 |
| **Overleaf remote `main`** | `c34c266d9deace708bc21d7a9bb26aee73b6178a` | **`8e4e1a06616828ed667f43a795a5fc0c3abd390e`** — moved, re-verified in §8 |
| **Counted body** | **19,989** | **19,985** (**−4**) |
| Appendix words | 10,570 | 10,631 (**+61**, V3 only) |
| **Store ceiling** | **2026-07-07** | **2026-07-07** |

Counted body is `texcount -0 -sum -merge -total` over `abstract.tex` plus the six chapters — the
exact scope `\bodywordcount` defines at `main.tex:255-258`. Store ceiling read through
`brain/.venv-forecast` (duckdb is not importable from system python3), asserted before and after.

**At the time §§1-7 were written nothing had been pushed.** Both pushes have since happened and
**§8 supersedes every SHA in this table's right-hand column.** §§1-7 are left standing as the
record of what was true when they were written, per the append-only rule — a row naming a SHA is
a measurement with a timestamp, and this file has now been on both sides of that.

---

## 1 · V1 · The push landed, and the render proves it

**All five steps returned. V1 PASSES.**

| step | result |
|---|---|
| 1 · `git ls-remote --heads origin` | `c34c266d9deace708bc21d7a9bb26aee73b6178a  refs/heads/main` |
| 2 · `git branch -r --contains c34c266` | `origin/main` **and** `origin/HEAD -> origin/main` — non-empty, where on 2026-08-18 before the push it returned nothing |
| 3 · `git rev-list --count origin/main..main` | **0**, and the listing is empty |
| 3b · reverse range `main..origin/main` | **empty** — the remote has not moved ahead by a web-UI commit, checked because it has happened before |
| 4 · compile of the remote state | PDF produced, **116 pages** |
| 5 · both literal strings | found, pages below |

`git fetch origin` ran before any range comparison.

### 1.1 · The compile was of the remote, not of a local commit that resembles it

The throwaway clone was taken **directly from the Overleaf URL**, not from the local sibling, so
the "fresh clone of a LOCAL commit" failure mode is excluded by construction. It returned
`c34c266`, tree `e6d9e2f6a535b826e9e7fda57d3337a88760d7a9`.

### 1.2 · The repository still cannot build from a clean clone — and the recorded diagnosis is wrong

A clean checkout with **no stub** fails, `latexmk` exit 12, no PDF:

```
! Package svg Error: Inkscape version not detected.
l.7 \includesvg[scale=0.6]{figures/lu-logo.svg}
!  ==> Fatal error occurred, no output PDF file produced!
```

**The handoff records this as `svg.sty` being a gitignored local stub. `svg.sty` is not missing.**
It ships with the distribution at `~/texlive/2026/texmf-dist/tex/latex/svg/svg.sty` and
`kpsewhich` resolves it. What is missing is **Inkscape**, which the real package shells out to.
The 341-byte stub at `prj93-overleaf/svg.sty` (gitignored, alongside `main-words.sum`) works by
*shadowing* a package that is present, not by supplying one that is absent — its own header says
so: *"Inkscape is not installed locally; the real svg package shells out to it."*

That distinction matters for exactly one reason: a session that goes looking for a missing
`svg.sty` will find it, conclude the obstacle is gone, and compile against the real package.

**Recorded: the repository still cannot build from a clean clone.** Copying the stub across, the
same remote state compiles clean.

### 1.3 · Both strings are in a PDF compiled from the remote state

| string | printed page |
|---|---|
| Appendix B.13 heading, *"The adoption gate's regime, and what happens outside it"* | **86** (PDF 101), plus the ToC on printed **vi** |
| the `sec:ladder` clause, *"served only where it defeats a benchmark that costs nothing to compute **on the rolling-origin protocol**"* | **21** (PDF 36) |

**The B.13 heading first read as ABSENT from the body, and it is not.** The render hyphenates it
across a line break — *"and what hap-‌pens outside it"* — so a whitespace-normalised search missed
it while the ToC entry matched. It was found by de-hyphenating and re-searching, then confirmed by
reading printed page 86. **A heading broken by a discretionary hyphen is worth someone's eye**; it
is recorded, not repaired, being outside this package.

---

## 2 · V2 · Figure 2.1 and the H-3 caption. Net −4.

### 2.1 · The generator

`brain/drafts/figures/make_litreview_figures.py`, `TARGET = (3, 2)`. The ruby **fill** and the
string `this\ndissertation` are gone; the cell is now drawn **open**, with a dashed ruby edge, and
labelled `apparatus\nspecified,\nnot run`. The comment that read
`# The empty cell is the argument, so it is the only one drawn in ink` is replaced by a WHY comment
recording that the cell is drawn open *because the chapter's claim is that it is vacant*.

### 2.2 · The render, described — because the assertions could not have caught this

`assert_page_width`, `assert_no_ink_outside` and `assert_no_text_dropped` all pass, and the
generator exits 0. **That is not the certification.** The memory `pgf-drops-text-outside-the-canvas`
records why the third exists; none of the three can see a cell that is drawn correctly and *says the
wrong thing*.

- **Text now in the top-right cell, quoted:** `apparatus specified, not run`.
- **Ink:** measured from the PDF's drawing operators, not by eye. **No cell carries a fill.**
  Filled shapes fall 3 → 2, and the two survivors are the white page and axes backgrounds; the ruby
  fill `(0.753, 0.224, 0.169)` at rect `[346, 21, 405, 65]` is **gone**. All twelve cells carry the
  faint grey outline `(0.847, 0.847, 0.831)`, solid. The top-right cell carries one additional ruby
  stroke, now **dashed** `[4.38 2.74]` where it was solid.
- **No other cell's label moved.** Text spans were extracted with coordinates from both renders and
  differenced: **58 of 60 spans identical in text *and* position**. The only changes are the two
  removed (`this`, `dissertation`) and the four added (`apparatus`, `specified,`, `not`, `run`).

Verified again inside the document at printed page 13, by rasterising and looking.

### 2.3 · The caption — and a conflict in the package that had to be resolved

The pointer sentence *"Placements follow the citations in Section~\ref{sec:rw-surfacing}."* is
replaced by:

```
By column: \citep{fu_prism_2026,ding_proactor_2026};
          \citep{yao_-bench_2024,liu_proactiveeval_2025,gulati_ask_2026};
          \citep{lu_proactive_2024,tang_proagentbench_2026,yang_contextagent_2025,yang_fingertip_2025}.
```

**The package's two requirements for this item are not jointly satisfiable, and this was measured
rather than argued.** It requires the delta be **−4 or better** and states *"Any positive delta is a
refusal condition"*; it also requires *"Each key must be placed on the system it belongs to"*. Six
forms were built and measured with the project's own instruments:

| form | `texcount` on `literature_review.tex` | delta | caption words |
|---|---:|---:|---:|
| base | 3588 | — | 51 |
| **A** one lumped `\citep`, no placement | 3584 | **−4** | 46 |
| **B** nine `\citep`, one per system, as the package asks | 3597 | **+9** | 58 |
| C `Placements by column:` | 3585 | −3 | 47 |
| E `Placements:` | 3583 | −5 | 45 |
| **H** `By column:` — **applied** | **3584** | **−4** | **46** |

**Per-system placement costs +9 against a margin of +11, and is refused by the package's own budget
gate.** S28's −4 was measured on the *lumped* form; the package inherited that figure and then added
a placement requirement H-3 never priced. This is the compression-widens-claims failure the S27
amendment records, one hand-off later.

**Form H is what the −4 buys:** it places every key on its **column**, labelled explicitly, at the
required price. The three groups map to columns 1–3 in the figure's own left-to-right order; the
fourth column is empty and the next sentence of the caption says so.

**One correction to my own reasoning.** I rejected the lumped form partly on the ground that
`sorting=nyt` (`main.tex:127`) would re-sort a multi-key `\citep` and destroy the order. **The render
shows citation order is preserved** — `(Fu et al., 2026; Ding et al., 2026)` etc., exactly as
written. That premise was wrong. Form H still stands, on the explicit column labelling rather than
on ordering.

**The sentence about the empty cell was not touched**, as instructed.

### 2.4 · V2 acceptance gate

| requirement, quoted from the package | result |
|---|---|
| *"`brain/scripts/wordcount.py` on `literature_review.tex` shows a delta of -4 or better"* | **−4** (3588 → 3584; caption 51 → 46) |
| *"`texcount -0 -sum -merge -total` over `abstract.tex` plus the six chapters shows a counted body of **19,985 or lower**"* | **19,985** — met exactly |
| *"`latexcheck` reports zero undefined citations"* | **0 undefined citations** |
| *"the render has been described in words in the report"* | §2.2 above |

---

## 3 · V3 · The B.13 qualification

**No Chronos model was run.** No measurement is claimed. The three limbs of S28 7.10 were verified
**at the generator**, not taken from the report's prose, per the rule that a result file's paragraphs
are a claim like any other:

- `models/foundation.py:244-276` — `chronos2_predict` wraps `predict_df` in `except Exception` and
  falls back to `predict_quantiles(inputs=[...])`, built from `train["value"]` alone and therefore
  **timestamp-free**.
- `models/foundation.py:312-368` — `chronos2_exo_predict` carries **no fallback**, and says so in its
  own docstring: *"No fallback to the univariate tensor path: if the covariate call fails for any
  reason (missing/NaN covariate, a predict_df error), this raises."*
- `_CHRONOS2` is module-level (`:146`) and `_CHRONOS2["api"]` is reassigned on every successful
  univariate call (`:269`, `:277`) — **last-write-wins**. Sharper than the package states: the exo
  arm never writes `api` at all, so the record cannot settle the question from either direction.
- `models/ladder.py:792-803` — `_run_one` calls `evaluate_static` then `evaluate_rolling` **in one
  process**, writing one report with both regime tables. The package's premise holds.

The sentence added to B.13, verbatim:

> Both regimes are scored in one process, and the runtime record of which Chronos-2 call path served
> a forecast is overwritten by each successful call, so the committed reports do not establish
> whether the univariate arm's static figure was produced by the same dataframe call as its rolling
> figures or by the timestamp-free fallback the exogenous arm deliberately does not carry.

A LaTeX trace comment beneath it names all four code sites and states that no Chronos run was made.

### 3.1 · V3 acceptance gate

| requirement, quoted | result |
|---|---|
| *"counted body unchanged by V3"* | **unchanged** — V3 is appendix-only; the body's −4 is entirely V2.3 |
| *"the sentence is present in a PDF compiled after the edit"* | printed page **87** |
| *"the appendix delta is reported as a number"* | **+61** (`robustness.tex` 3,348 → 3,409; appendix total 10,570 → 10,631) |

---

## 4 · V4 · The record

**Decision row 122**, six parts, appended to `brain/log/Decision_and_Resolution_Log.md`. Each part
quotes verbatim the finding it records, per rule S27. Nothing in the document was edited for any of
them. Summary only — the row is the record:

- **(a)** Report 96's `forward.py` limb corrected; **its headline measurement stands and is
  strengthened**. The per-group floor is at `forward.py:204-218`, not the quoted `:203`;
  `conformal/wrap.py:216` only *counts* the lapse and bands anyway. **R-4.3** recorded: a 91-day walk
  (`BAND_CALIB_DAYS = 90`, inclusive) is 13 weeks, so a Monday/Tuesday closure yields **26** rows
  against a floor of **30** — the closed group is dropped every run at every venue, and this is
  **immaterial to every reported number**. The S19 forward-pointer was appended **at the deferral
  site in `log/96` itself**, in this session.
- **(b)** The R-8 convergence recorded, with the tension quoted from `appendix/pseudocode.tex:247-249`.
  **Not measured here, so ledger and handoff only, not the dissertation.** Nam's ruling.
- **(c)** R-9.1/R-9.2 present verbatim at `conformal/wrap.py:253-257` and a **different defect**.
  **Correction to the package:** the discriminator is not `KeyError` vs `ValueError` —
  `MissingCovariateError` *subclasses* `ValueError` (`foundation.py:279-290`). The discriminator is
  the cause: absent covariate columns, not a timestamp gap. **S27's attribution is correct; B.13
  needs no change on that point.**
- **(d)** The Q1 closure reopened **as an enquiry, not as a derivation**, with
  `00_marking_criteria.md:65-84` quoted. What it closed was the derivation from the issued
  documentation, which is silent; the supervisor is not that document. S28 7.5's finding recorded:
  the exclusion is **Phuong's ruling, not a supervisor ruling**. 10,570 words rest on it.
- **(e)** Both gate blind spots, measured — see §5.
- **(f)** `app:derivations` (prints **A.9**, `main.aux:925`) referenced by nothing. **Scope of the
  negative:** `grep -rn "ref{app:derivations}" --include='*.tex'` over the whole clone. **Not
  removed**, per the package.

---

## 5 · V5 · The formatcheck constant

`--body-from` now **defaults to `None` and is derived from the PDF's own `/PageLabels` tree** (new
`first_arabic_page`), rather than from a hardcoded 21 or a replacement constant that would drift the
same way. An explicit `--body-from N` still overrides. If a document carries no arabic run the gate
**fails closed** rather than guessing its own scope.

**The gate's printed scope line, verbatim, and it names its own derivation:**

```
scanned 101 pages of 116 (body from p.16, printed p.1; derived from /PageLabels,
front matter 15 pages), 2783 justified lines
```

against the canonical invocation's:

```
scanned 96 pages of 116 (body from p.21, printed p.6; passed on the command line), 2665 justified lines
```

**`--self-test` PASS in both directions**, re-run after the change and before relying on it — including
*"empty scan measures zero, so run() fails closed on it"*.

### 5.1 · What the wider scope sees for the first time — and it is not a spill

| | old scope (`--body-from 21`) | new scope (derived, 16) |
|---|---|---|
| pages scanned | 96 of 116, from printed 6 | **101 of 116, from printed 1** |
| justified lines | 2,665 | 2,783 |
| **§1 margin spill** | none unaccepted | **none unaccepted** |
| §2 INNER gaps (advisory) | 21 pages, 7,496 pt | 23 pages, 8,228 pt — newly visible: printed **1** and **4** |
| verdict | PASS | **PASS** |

**V5's stop condition did not trigger: no spill was surfaced that the gate previously could not
reach.** Measured directly rather than inferred from the verdict, the maximum right-margin overshoot
across the five newly-reachable pages is **+0.12 pt** (printed page 1, the word *"hospitality"*),
against a 2.0 pt tolerance. The only new findings are two advisory white-space pages.

**Scope of that clean result, stated because a clean verdict invites over-reading.** The verdict
covers §1 only; §§2–3 are advisory and both still report findings. And the band is **narrowed, not
closed**: `notation.tex:109-110`'s 2.81 pt overfull box renders on printed **xii–xv**, in the roman
front matter, which **no `--body-from` value can reach** — the option marks where the arabic body
begins and the gate scans forward. Measured directly, those 15 roman pages carry at most **+0.01 pt**
of ink outside the block, so that overfull box puts essentially nothing in the margin: a warning with
no defect, the case the rules already name for centred material.

No formatting defect was repaired in this pass, per the package.

---

## 6 · Instruments, with the scope of each clean result

| instrument | scope | result |
|---|---|---|
| `latexcheck.py main.tex --shell-escape` | 28 targets; 27 tracked, 1 declared-ignored | **PASS** — 116 pages, **0** errors, **0** undefined references, **0** undefined citations, **0** floats lost; 4 overfull, 14 underfull |
| `formatcheck.py` (derived scope) | 101 of 116 pages, 2,783 lines | **PASS** §1; §§2–3 advisory, findings stand |
| `formatcheck.py --self-test` | both directions | **PASS** |
| `figurecheck.py` | **27** figure sources | **PASS** — no embedded figure title |
| generator assertions | `gap_map.pdf` | all three pass — **and are not the certification**, see §2.2 |
| store ceiling | `.venv-forecast`, before and after | **2026-07-07** both times |

**Where a command produced no output, it is said so rather than read as a verdict.**
`git branch -r --contains c34c266` and `git rev-list origin/main..main` were both wrapped so that an
empty result printed an explicit marker instead of a blank line; step 2 printed two branches, step 3
printed `(EMPTY — range is empty)`. `grep -rn "ref{app:derivations}"` returned nothing and is reported
with the scope it searched. Tier 2 only throughout: TeX Live 2026 locally, which is **not** Overleaf's
until T3-1 closes.

**One exit code was read and discarded correctly.** The first generator run printed `exit: 0` while
having raised `RuntimeError: 'pdflatex' not found` — the 0 was `tail`'s. The PATH export was missing.
The artefact, not the exit code, is what reported it.

---

## 7 · State at close, and what is NOT done

**`prj93-overleaf` `8e4e1a0`** — `chapters/literature_review.tex`, `appendix/robustness.tex`,
`figures/gap_map.pdf`. **Committed locally and UNPUSHED: `origin/main..HEAD` is 1.** Not to be
pushed by me; the PreToolUse guard stands and Nam pushes. Working tree carries only a modified
`.DS_Store`, which is pre-existing and not this session's.

**`ai-gm.ai-master` `50486a55`** — `brain/drafts/figures/make_litreview_figures.py` (+ the
regenerated `gap_map.pdf`/`.png`), `brain/scripts/formatcheck.py`, `brain/ledger/phase_state.md`,
`brain/log/Decision_and_Resolution_Log.md`, `brain/log/96_...md`, and this report.

**Pre-flight is done and reported, per the lifecycle rule: a clean `latexcheck` is the precondition
for the push, and §6 carries what it said.** What has NOT happened is the push itself, so Overleaf
still renders `c34c266` — the state V1 verified, without any of this session's four repairs.

**Out of scope and untouched, as instructed:** H-2, H-5, H-6a, H-6b, Part 3 F1, H-8, H-4 option B,
any body→appendix relocation, any instrumented Chronos re-run, any change to a served model, a frozen
artefact or the store.

### 7.1 · Two things needing Nam

1. **The caption placement conflict (§2.3).** Applied at −4 with column-level placement.
   Full per-system placement is available and costs **+9**, taking the body to 19,998 — still under
   the 20,000 cap, but against the package's own refusal condition. Your call.
2. **Row 122(b), the R-8 convergence**, is explicitly your ruling and is recorded unapplied.

### 7.2 · A scope limit on this session's recall

`agentmemory` was **down** at session start — the first `memory_recall` returned empty, which is a
worker artefact and not absence, per `.claude/rules/memory.md`. It was started and is live (30
sessions, 1,155 observations). **Its newest observation is 2026-08-11**, so sessions S19–S28 captured
nothing and recall has no coverage of the material this package builds on. The repo stores carried it
instead.


---

## 8 · Post-push re-verification — 2026-08-18, after §§1-7

**§§1-7 above were written against `origin/main = c34c266`. That is now stale.** Nam pushed
`8e4e1a0` to Overleaf and asked for V1 to be re-run, on the stated ground that a clean local tree
proves nothing. It was, and it passes.

### 8.1 · The ai-gm push

`git push origin brain-construction-local` reported `31691e2d..671772f6`. **Its exit code was not
read as evidence** — the `PIPESTATUS` trap swallowed it again, which is the second time this session.
Verified against the remote instead:

| check | result |
|---|---|
| `git ls-remote --heads origin brain-construction-local` | `671772f6090bff9e93f4c7e4ca00bcc4d934bcb0` |
| local `HEAD` | `671772f6090bff9e93f4c7e4ca00bcc4d934bcb0` — equal |
| `origin/brain-construction-local..HEAD` | **empty**, count 0 |
| `git branch -r --contains 50486a55` | `origin/brain-construction-local` |

**Scope worth stating: this pushed 35 commits, not one.** `50486a55` carried 33 unpushed ancestors
reaching back to `53ad273d`; git cannot push a commit without them. The branch running far ahead of
`origin` is recorded in `PRJ93_RULES.md` as intent rather than backlog, and the remote was not ahead,
so nothing was clobbered. The tip `671772f6` went too, deliberately — leaving it behind would have
stranded this report's own state table.

### 8.2 · V1 steps 1-3, re-run against the new remote SHA

`git fetch origin` first, then:

| step | result |
|---|---|
| 1 · `git ls-remote --heads origin` | **`8e4e1a06616828ed667f43a795a5fc0c3abd390e`  refs/heads/main** |
| 2 · `git branch -r --contains 8e4e1a0` | `origin/main` **and** `origin/HEAD -> origin/main` |
| 3 · `git rev-list --count origin/main..main` | **0**; listing prints `(EMPTY — range is empty)` |
| 3b · reverse `main..origin/main` | **empty** — the remote has not moved ahead |

**Extra check, and it is the one that matters after a push:** `git branch -r --contains c34c266`
still returns `origin/main`. **The previously verified state is still an ancestor**, so history was
*extended*, not rewritten — a force-push would have detached everything §1 certified.

### 8.3 · Steps 4-5 re-run too, which is more than was asked

`PRJ93_RULES.md` requires the stronger form *"after any change that touched a float body or the
preamble"*, and this push moved `figures/gap_map.pdf` and its caption. So the pushed state was
cloned **directly from the Overleaf URL** and compiled: HEAD `8e4e1a0`, tree
`678c6394740207e7e1d67fd92f2b001cb9cf7059`.

**`latexcheck` PASS** — 116 pages, 28 targets scanned, **0** errors, **0** undefined references,
**0** undefined citations, **0** floats lost; 4 overfull, 14 underfull, unchanged populations.

All four repairs are in the render Overleaf now holds:

| | printed page |
|---|---|
| B.13 heading | **86** (+ ToC on **vi**) |
| `sec:ladder` regime clause | **21** |
| caption `By column:` with the grouped citations | **13** |
| V3's B.13 qualification | **87** |
| the old pointer sentence *"Placements follow the citations in Section…"* | **absent** |

**One check of mine scanned nothing and is not reported as a pass.** Probing the compiled page for
the figure's ruby fill returned "0 fills", which looked like confirmation and was not: the figure is
an embedded form XObject and `get_drawings()` does not descend into it, so the probe measured an
empty set. Re-done the way that reads the figure — text extraction (`apparatus`, `specified,`,
`not run` present; `dissertation` absent) and rasterising printed page 13 and looking at it. The
top-right cell is open, dashed and unfilled.

**Still tier 2.** This is TeX Live 2026 locally against the pushed state; it is not Overleaf's own
compile, and does not become one until T3-1 closes.
