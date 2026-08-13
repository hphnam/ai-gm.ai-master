# log/81 — Figure visual consistency pass, 2026-08-12

One palette, one font, one type scale across all 14 floats. Presentation only: the
counted body is **19,986 before and 19,986 after**, measured with the instrument the
compiled declaration itself uses (`texcount -0 -sum -merge -total` over the six chapter
files plus `abstract.tex`).

---

## 1 · The accessibility test, and what it ruled out

`brain/scripts/palettecheck.py` (new, `--self-test` clean in both directions) simulates
deuteranopia and protanopia by Viénot, Brettel & Mollon (1999) — exact for those two
dichromacies — and scores separation by CIEDE2000, with greyscale as ΔL\* of the
luminance. Floors were fixed **before** any brand colour was measured: ΔE00 ≥ 11,
ΔL\* ≥ 10.

**The kit's own categorical sequence (Deck Guide §5.1) FAILS, and not marginally.**

| condition | brand §5.1 | Okabe-Ito (incumbent) | closest brand pair |
|---|---|---|---|
| normal | 11.87 | 34.69 | gold / mango |
| deuteranopia | **3.05** | 12.22 | gold #E5A83D / lime #A7C520 |
| protanopia | **2.69** | 13.92 | gold / lime |
| greyscale ΔL\* | **2.09** | 3.31 | gold / lime |

A just-noticeable difference is about 2.3. For a deuteranope the kit's gold and lime are
**one colour**. It must not carry a data series, and it does not.

`--search` then asked whether the kit is deep enough for an accessible sequence, over
every 5-subset of all eleven kit colours: **0 of 462 clear both floors**; the best
greyscale separation available at five series is 5.96 against a floor of 10.

**Ruled by Phuong 2026-08-12: a brand-DERIVED sequence** — `ink #111111`, `gold #E5A83D`,
`grey-2 #5C5C58`, `teal #2F9C96`, `ruby #C0392B` — which is drawn entirely from the kit
and measures **better than the Okabe-Ito it replaces on every condition that matters**:

| condition | brand-derived | Okabe-Ito | delta |
|---|---|---|---|
| normal | 24.09 | 34.69 | −10.60 (both far above the floor) |
| deuteranopia | **21.36** | 12.22 | **+9.14** |
| protanopia | **25.29** | 13.92 | **+11.37** |
| greyscale ΔL\* | 5.72 | 3.31 | +2.41 |

**Neither palette clears the greyscale floor at five series.** That is a property of
five-way categorical greyscale, not of either palette, and it is why marker shapes are
unchanged and why colour still never carries meaning alone.

Structural elements — axes, gridlines, rules, arrows, diagram fills, annotation — take
kit colours unmodified. No reading there depends on separating two hues, so the finding
does not bind, and that is where most of the visual consistency is bought.

## 2 · The font, and why pgf was the right answer

Matching by naming a font file works locally and breaks in a fresh clone. Instead the
figures are typeset by LaTeX itself through matplotlib's **pgf** backend, so the figure
font *is* the document font by construction.

`main.tex` loads no font package, so the document is **OT1 Computer Modern**. An early
draft of the preamble block added `\usepackage[T1]{fontenc}` out of habit and the figures
came back set in **SFRM** — CM-super, a different font of the same design that reads as
"Computer Modern" to anyone checking by eye. Removed; the pgf preamble now mirrors
`main.tex` line for line.

**The fresh-clone risk is structurally absent.** pgf runs at *generation* time and emits
a plain PDF, which `\includegraphics` consumes exactly as before. Verified: a fresh clone
of `b8203ec`, `main-words.sum` confirmed **absent**, compiles PASS — 102 pages, 0 errors,
0 undefined references, 0 undefined citations, 0 floats lost, 0 refused `\write18`.

One residue, reported not hidden: OT1 Computer Modern has no sterling glyph, so `£` in
three axis labels falls back to CM-super's. That is exactly what `main.tex` would do with
a `£`, and the body contains none.

## 3 · The type scale, and the defect it fixes

**9 pt** axis labels, legend entries and panel letters · **8 pt** tick labels · **7 pt**
in-plot annotation. Maths sub/superscripts fall where LaTeX puts them (6 pt inside an
8 pt label). TikZ floats take the same three sizes via `\lunefiglabel` / `\lunefigsecond`
/ `\lunefigannot`, written as explicit `\fontsize` because `\scriptsize` and `\tiny`
resolve against the 12 pt class to 8 pt and 6 pt — a point away from the charts.

**The scale was not consistent before, and the cause was cropping.** `savefig.bbox:
"tight"` cropped each figure to its own content, so each was rescaled by a different
factor at `width=\textwidth`:

| figure | canvas before | scale before | canvas after | scale after |
|---|---|---|---|---|
| ladder | 545.73 pt | **×0.779** | 425.20 pt | ×1.000 |
| gap_map | 526.65 pt | **×0.807** | 425.20 pt | ×1.000 |
| fig_nulls | 452.67 pt | ×0.939 | 425.20 pt | ×1.000 |
| fig_validity_efficiency | 431.99 pt | ×0.984 | 425.20 pt | ×1.000 |
| fig_sensitivity | 428.90 pt | ×0.991 | 425.20 pt | ×1.000 |
| fig_drift | 428.88 pt | ×0.991 | 425.20 pt | ×1.000 |

So a nominal 8 pt tick printed at **6.2 pt in `ladder` and 7.9 pt in `fig_drift`** — a
27 % spread, on the same page spread, and every instrument in this project passed it.
`ladder` and `gap_map` were the worst because they live in `brain/drafts/figures/` and
never used `_style.py` at all; they do now.

Every figure is drawn at exactly 150 mm and lands 1:1, so the number in `_style.py` is
the number on the paper. Measured by `brain/scripts/figurestylecheck.py` (new,
`--self-test` clean both directions): **before 27 findings across 5 distinct page scales;
after PASS, one scale, one type scale, Computer Modern throughout.**

## 4 · Three guards added, because two of these failed silently

`figures/_style.py` now refuses to write a figure that:

1. **is not the width of the text block** — the page would rescale it and its type would
   not match its neighbours;
2. **has text outside the canvas** — with cropping gone the canvas no longer grows to
   swallow an over-long label, it clips;
3. **is MISSING text the generator asked for.** This one is the reason the other two are
   not enough. Under pgf, text falling *wholly* outside the canvas is **never emitted**.
   `ladder` panel C read *"(C) Two River"* with **"Taps" simply absent** — no truncated
   ink, no span past the edge, nothing for a geometry check to see, and a clean verdict
   over a figure that had lost a word. The guard now compares what the figure was asked
   to say against what the PDF says.

All three were exercised against a violation before being relied on.

## 5 · The regeneration hazard fired, and was caught by the diff

`figures/out/` was **stale since before 2026-08-07** and would have overwritten the live
document had it been copied forward. It held:

- `fig_pipeline`'s `out`/`outb` TikZ key collision — the state that sat on Overleaf
  **not compiling**;
- `Appendix C` where the document says A;
- `\text{train}` where the live file carries the `\mathrm{train}` repair;
- the three algorithm floats without the `\SetKwInOut` removals, without which the
  document produces **no PDF at all**.

Regenerating `a_f7_origins` **did reintroduce `\text{train}`, six occurrences**, and the
diff caught it. `\mathrm` is now forward-ported into `fig_appendix_tikz.py`, and every
`figures/out/` copy has been reconciled against the live file — all eight now agree.

## 6 · Appendix letters, corrected

`main.tex` records that removing the search-and-screening appendix on 2026-08-12
relettered the appendices A–D. **Eight comments across six live figure files were still
one letter behind** (pseudocode is now A, robustness B). All comments, so no reader-facing
defect — but the next session would have read them as current. Corrected in both the
files and the generator docstrings.

## 7 · What was NOT repaired, and needs a ruling

**`fig_sensitivity` carries three unplottable data points, and formatcheck FAILs on it.**

`brain/eval/agent_eval.json` gives `stock_drawdown` at the Beer Hall magnitudes
**−2.0, −1.0 and 0.0**. The panel uses a **log** x-axis, on which those are undefined, so
matplotlib places them at about x = −16 000 pt instead of dropping them. They are
invisible on the page — the `\includegraphics` BBox clips them — but they are ink outside
the text block as far as `formatcheck` is concerned, and it fails the run on one page.

Three facts that decide the handling:

- **It is pre-existing.** The committed original carries the same artefact at
  x = −81 267 pt. This pass changed the figure's geometry, which is what surfaced it.
- **The real defect is not formatting.** Three measured data points have never been
  visible in this figure.
- **Every repair changes what the figure shows.** Filtering the points was measured to
  move 651 subpixels; a symlog axis changes the chart. Both are outside a presentation
  pass and both are Phuong's call.

Left standing, reported, and NOT added to `format_accepted.txt` — an accept line needs a
ruling, and this one has not had one.

### SUPERSEDED 2026-08-13 — see `log/83`

The section above is right that the real defect is not formatting and wrong about what it
is. **`mag` is one field name over two quantities**: `agent_eval` sweeps `stock_drawdown`
over `config.EVAL_STOCK_COVER_GRID`, which is *days of cover* running 2 to −2 with severity
**decreasing** in x, while every other kind sweeps `EVAL_INJECT_Z_GRID`. The series never
belonged on an axis reading "Injected magnitude (z)" at all, so the three unplottable points
are a symptom rather than the finding, and **the two plottable ones — at x = 1 and 2, legible
and reading as z — were the worse half.** Both repairs this section proposed, filtering and
symlog, would have kept them.

The third bullet above is therefore withdrawn: this was not a choice between two lossy
presentations. `tab:vuspr` already excluded the kind for the same underlying reason, so the
document was excluding it in one float and mis-plotting it in the next. The kind is now
dropped from the figure and its result reported in the text in days. `formatcheck` PASSES.

`log/83` also records why §4's `assert_no_ink_outside` did not catch this: it read `get_text`
only, so it checked text while its name promised ink.

## 8 · Verification, with populations

| instrument | population | result |
|---|---|---|
| `latexcheck --shell-escape` | 28 targets | **PASS**, 102 pages, 0 errors / undefined refs / undefined citations / floats lost / refused `\write18` |
| overfull boxes | — | **3, all pre-existing** (5.72 / 5.47 / 2.81 pt). The pass added one at `fig_pipeline` and it was cleared by narrowing node spacing 5 mm → 4 mm |
| underfull boxes | — | 9, was 8; the new one is `fig_injection`'s note at badness 1092 |
| `figurecheck` | **29 sources** (tree, not the 18 a narrow path reads) | PASS |
| `completenesscheck` | 27 files | PASS |
| `venueordercheck` | 27 files | PASS |
| `commentsweep` | 27 files | 2 SUSPECT, both pre-existing and previously reviewed, both in `results.tex`, untouched by this pass |
| `formatcheck` | 102 pages | **FAIL — 1 page**, §7 above. Sections 2 and 3 advisory and unchanged |
| `palettecheck --self-test` | 5 assertions | PASS |
| `figurestylecheck --self-test` | 4 assertions | PASS |
| `figurestylecheck` over the figures | 6 PDFs | PASS (before: 27 findings) |
| fresh clone of `b8203ec` | `main-words.sum` **absent** | **PASS**, 102 pages, tree clean after build |
| counted body | 6 chapters + abstract | **19,986 → 19,986** |

**Tier 2 only:** TeX Live 2026 locally, which is not Overleaf's until T3-1 closes.

## 9 · Instruments' own defects, found by their self-tests

Both new self-tests failed on first run and both failures were in the **fixture**, not the
instrument — worth recording because the pattern recurs:

- `palettecheck`'s confusion fixture was `#009E73` against `#B85C00`, which differ mostly
  in **lightness**, and a dichromat keeps lightness. Their separation *rises* under
  simulation. Replaced with pure red against pure green, which collapses 86.61 → 19.03.
- `figurestylecheck`'s clean fixture set only the xlabel and left ticks at matplotlib's
  default 10 pt, then dropped the xlabel off a short canvas — reproducing assertion 4's
  own phenomenon inside assertion 2's test.

A third defect was in an instrument: `palettecheck --search` originally tested only the
best-by-ΔE subset and reported that as a verdict about the whole kit. It now asks the
question of all 462.
