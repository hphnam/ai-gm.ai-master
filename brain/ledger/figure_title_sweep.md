# Embedded figure titles — estate-wide sweep, 2026-08-07 (8C-3 STEP 1)

**Scope of the check.** Every figure source in the project, not only Results': the four
`figures/*.py` generators built through `figures/_style.py`, the two older generators under
`brain/drafts/figures/`, and every TikZ body under `figures/out/` and the Overleaf clone's
`figures/` and `appendix/`. 33 source files scanned.

**What was looked for.** `ax.set_title()`, `fig.suptitle()`, `plt.title()`, pgfplots'
`title=` axis key, and hand-authored TikZ title nodes. Rendered PDFs were also read back —
literal show-strings pulled out of the content streams — so the finding is about the
artefact and not only about the source.

## The sweep

| Figure | Generator | Title text found in the image body | Duplicates the caption? |
|---|---|---|---|
| **F4 `fig:drift`** | `figures/fig_drift.py:79` | `Beer Hall — 21 of 1,365 calendar-open days did not trade (2%)`, and the same sentence per panel for Ellel (1,037 of 1,300, 80 %) and Two River Taps (7 of 1,025, 1 %) | **Yes, and worse than duplication** — it is a *finding* painted into the raster. Three numbers with no caption, no LoF entry and no traceable comment |
| **F5 `fig:validity-efficiency`** | `figures/fig_validity_efficiency.py:52` | `Beer Hall` / `Ellel` / `Two River Taps` | Panel identity only. Not a duplicate today because no caption exists yet; it would become one the moment the caption named the panels |
| **F6 `fig:sensitivity`** | `figures/fig_sensitivity.py:85` | same three venue names | as F5 |
| **F7 `fig:nulls`** | `figures/fig_nulls.py:74` | `Beer Hall  (MASE)`, `Ellel  (£)`, `Two River Taps  (MASE)` | **Yes, and duplicated inside the figure too** — the unit already sits on the x-axis label of the same panel |
| **`fig:ladder`** | `brain/drafts/figures/make_ladder_figure.py:129` | `Beer Hall` / `Two River Taps` / `Ellel` | Panel identity only, and it was the panel's *only* identifier — this figure carried no (A)/(B)/(C) labels at all |
| `fig:gap-map` (Ch 2) | `brain/drafts/figures/make_litreview_figures.py` | none | — clean |
| A-F1…A-F7, `fig:blocks`, `fig:pipeline` | `figures/fig_appendix_tikz.py`, `fig_blocks.py`, hand-authored | none — no `title=` key, no title node | — clean |

## The fix, at the generator

The finding sentence and the unit move to the caption. The venue name moves into the panel
label, which is where it belongs: `panel_label(ax, "(A) Beer Hall")`. That keeps the panel
identified inside the figure — three unlabelled panels and a caption mapping (a)/(b)/(c) to
venues is a worse read — while leaving `set_title` free to be asserted against, which it
could not be if four generators kept a legitimate call.

`fig_drift.py` now **prints** the three false-open counts instead of drawing them, so the
caption quotes them from the run rather than from memory.

`fig:ladder` gains (A)/(B)/(C) labels it never had.

No PDF was hand-edited. All five regenerated and re-read.

## The instrument — `brain/scripts/figurecheck.py`

A sibling of `latexcheck.py`, not part of it: `latexcheck` parses a build log, and this
defect exists in generator source before any compile.

Verified in **both** directions before being relied on, and then against the real defect:

| | Result |
|---|---|
| `--self-test`, 4 fixtures | dirty-python 3/3 · clean-python 0/0 · dirty-tikz 1/1 · clean-tikz 0/0 — **PASSED** |
| against the five **pre-fix** sources (`git show HEAD:`) | **FAIL, 5 findings** — every one of the real titles, at the right line |
| against the fixed tree, 33 files | **PASS, exit 0** |

The clean fixtures carry the cases that would make a naive regex useless: a commented-out
`ax.set_title(`, a `title=` inside a TeX comment, and a TikZ `\node` label.

**Stated scope.** It catches the title *APIs*. It does not catch a bare TikZ `\node` placed
above a picture and reading as a title — that is a judgement about placement and wording,
not a construct, and a regex guessing at it would flag every label in the estate. Bare TikZ
title nodes remain a reading task; the API case is now impossible to forget.

## Found by the sweep, and not an embedded-title defect — `ladder.pdf` on Overleaf is stale

The rendered `figures/ladder.pdf` in the Overleaf clone is the **pre-`b1faf683` build**. It
disagrees with the repo's copy of the same file, and with the chapter that cites it:

| | Overleaf `figures/ladder.pdf` | repo `brain/drafts/figures/ladder.pdf` | `results.tex` body text |
|---|---|---|---|
| headline loss | **MASE**, and **MAE (£)** at Ellel | **RMSSE**, and **RMSE (£)** at Ellel | "root mean squared scaled error, and at Ellel on unscaled root mean squared error" (line 156) |
| rung ordering | differs — e.g. Beer Hall places STL above global GBM | the RMSSE ordering | — |

`b1faf683` ("make RMSSE the headline loss") updated the generator **and** the repo's PDF; the
Overleaf copy was never re-pushed. So the live document's Figure 4.1 currently contradicts
the paragraph that introduces it and the metric flip recorded at `log/71`. The regeneration
done here brings it up to the committed build. The other four PDFs were byte-identical
across the two trees before this session.

**Also noted, not fixed:** the ladder orders its panels Beer Hall · Two River Taps · Ellel,
while F4–F7 order them Beer Hall · Ellel · Two River Taps. A cross-figure inconsistency that
predates this session and is a change to a committed figure's structure, so it is reported
rather than taken.
