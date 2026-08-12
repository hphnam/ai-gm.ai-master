#!/usr/bin/env python3
"""Assert that every matplotlib figure shares one type scale and lands on the page 1:1.

Built 2026-08-12. The defect it exists to catch is invisible in every other instrument
here: `latexcheck` reads the log, `figurecheck` reads the source, `formatcheck` reads
where ink landed. None of them asks whether a 9 pt axis label in one figure is a 9 pt
axis label in the next -- and before this pass it was not. The six charts were drawn on
canvases between 5.96 in and 7.58 in and then scaled to a 150 mm text block by factors
from x0.779 to x0.991, so a nominal 8 pt tick printed at 6.2 pt in `ladder` and 7.9 pt
in `fig_drift`. Every figure passed every check while doing it.

WHAT IT ASSERTS, and each is arithmetic rather than judgement:

  1. PAGE WIDTH. The PDF is the width of the text block, so `\\includegraphics` at
     `width=\\textwidth` neither enlarges nor shrinks it. This is the one that matters:
     get it wrong and every size below is multiplied by a number that differs per figure.
  2. TYPE SCALE. Every text size in the figure is one of the declared set, and the set is
     the same for all figures. Sizes are read from the PDF, so this measures what was
     produced rather than what the generator meant.
  3. FONT. Every embedded face is a Computer Modern face, which is what the document
     typesets in. A DejaVu or Helvetica here means the figure was not set by LaTeX.
  4. NO SPILL. No text lies outside the canvas, because under pgf a partly-outside label
     is clipped and a wholly-outside one is DROPPED -- silently, leaving no ink to find.

WHAT IT DOES NOT REACH. It reads text and geometry, not meaning: it cannot tell a
sensible axis label from a wrong one, cannot see a TikZ float (those carry no PDF of
their own -- the type scale there is enforced by \\lunefiglabel and friends in
figures/lunebrew_colours.tex), and says nothing about colour. Colour accessibility is
brain/scripts/palettecheck.py's question, not this one's.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# 150 mm text block: A4 less main.tex's left=35mm and right=25mm.
TEXT_WIDTH_PT = 150.0 / 25.4 * 72.0
WIDTH_TOL_PT = 1.0

# The scale figures/_style.py declares. Kept here as literals ON PURPOSE: an instrument
# that imports its expectation from the thing it checks cannot detect a change to it.
ALLOWED_SIZES = (7.0, 8.0, 9.0)
SIZE_TOL = 0.15

# pdflatex rounds a requested size to the nearest available design size, so a 9.0 pt
# request is embedded as CMR9 and reported as 8.9664. Faces are matched by family.
#
# SFRM is CM-super, a Type1 extension of the SAME Computer Modern design, and it is here
# because OT1 Computer Modern has no sterling glyph: the "Conformity score (\pounds)"
# labels fall back to it for that one character. Accepting it is not a silencer -- a
# DejaVu or Helvetica face still fails, which is the substitution this rule exists to
# catch.
CM_FAMILIES = ("CMR", "CMBX", "CMTI", "CMMI", "CMSY", "CMEX", "CMSL", "CMTT", "CMB",
               "SFRM", "SFBX", "SFTI")

# Maths sub- and superscripts are set at LaTeX's script sizes, which are a CONSEQUENCE of
# the text scale rather than a departure from it: $F_1$ inside an 8 pt label is 6 pt by
# construction. Accepting them keeps the check pointed at text the generator chose the
# size of. LaTeX's defaults for these bases are 9->7->5, 8->6->5, 7->5->5.
SCRIPT_SIZES = (5.0, 6.0)


def inspect(path: Path) -> dict:
    import pymupdf
    page = pymupdf.open(path)[0]
    sizes, fonts, spills = set(), set(), []
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                sizes.add(round(span["size"], 2))
                fonts.add(span["font"].split("+")[-1])
                if span["bbox"][0] < -0.1 or span["bbox"][2] > page.rect.width + 0.1:
                    spills.append(span["text"])
    return {"width": page.rect.width, "height": page.rect.height,
            "sizes": sorted(sizes), "fonts": sorted(fonts), "spills": spills}


def nearest_allowed(size: float) -> float | None:
    for a in ALLOWED_SIZES + SCRIPT_SIZES:
        if abs(size - a) <= SIZE_TOL + 0.05 * a:
            return a
    return None


def check(paths: list[Path]) -> int:
    if not paths:
        sys.exit("REFUSING: no figure PDFs given. A check that examined nothing must not "
                 "report a clean result.")
    failures = 0
    print(f"{'figure':<28}{'width pt':>9}{'scale':>8}  {'sizes pt':<22}fonts")
    scale_set, size_union = set(), set()
    for p in paths:
        r = inspect(p)
        scale = TEXT_WIDTH_PT / r["width"]
        bad = []
        if abs(r["width"] - TEXT_WIDTH_PT) > WIDTH_TOL_PT:
            bad.append(f"width {r['width']:.2f}pt != {TEXT_WIDTH_PT:.2f}pt (page would "
                       f"rescale it x{scale:.3f})")
        for s in r["sizes"]:
            if nearest_allowed(s) is None:
                bad.append(f"type size {s}pt is not in {ALLOWED_SIZES}")
            else:
                size_union.add(nearest_allowed(s))
        for f in r["fonts"]:
            if not any(f.upper().startswith(fam) for fam in CM_FAMILIES):
                bad.append(f"font {f} is not a Computer Modern face")
        if r["spills"]:
            bad.append(f"text outside the canvas: {r['spills'][:3]}")
        scale_set.add(round(scale, 3))
        print(f"{p.stem:<28}{r['width']:9.2f}{scale:8.3f}  "
              f"{str(r['sizes']):<22}{','.join(r['fonts'])[:38]}")
        for b in bad:
            failures += 1
            print(f"    FAIL  {b}")
    print(f"\nexamined {len(paths)} figure PDF(s)")
    print(f"distinct page scales : {sorted(scale_set)}")
    print(f"type scale in use    : {sorted(size_union)} pt")
    if len(scale_set) > 1:
        failures += 1
        print("    FAIL  figures land on the page at different scales, so equal nominal "
              "sizes print unequal")
    print(f"VERDICT: {'PASS' if not failures else f'FAIL - {failures} finding(s)'}")
    return 1 if failures else 0


def self_test() -> int:
    """Both directions, per the assertion rule: a guard seen only to pass is taken on faith."""
    import matplotlib
    matplotlib.use("pgf")
    import matplotlib.pyplot as plt
    import tempfile

    fails = []
    # The fixture must set the WHOLE scale, not just the label it is about. The first
    # version of this self-test set only the xlabel and left the ticks at matplotlib's
    # default 10 pt, so the "clean" case failed for a correct reason -- the instrument was
    # right and the fixture was not. Mirrors figures/_style.py.
    rc = {"pgf.texsystem": "pdflatex", "pgf.rcfonts": False, "font.family": "serif",
          "pgf.preamble": r"\usepackage[utf8]{inputenc}",
          "font.size": 8.0, "axes.labelsize": 9.0, "axes.titlesize": 9.0,
          "xtick.labelsize": 8.0, "ytick.labelsize": 8.0, "legend.fontsize": 9.0,
          "savefig.pad_inches": 0.0}
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        # CLEAN: right width, a declared size.
        plt.rcParams.update(rc)
        fig, ax = plt.subplots(figsize=(TEXT_WIDTH_PT / 72.0, 1.4),
                               constrained_layout=True)
        ax.set_xlabel("clean", fontsize=9.0)
        fig.savefig(td / "clean.pdf"); plt.close(fig)
        if check([td / "clean.pdf"]) != 0:
            fails.append("a correctly sized figure was reported as failing")

        # DIRTY 1: wrong canvas width -> the page would rescale it.
        fig, ax = plt.subplots(figsize=(7.4, 1.4), constrained_layout=True)
        ax.set_xlabel("wide", fontsize=9.0)
        fig.savefig(td / "wide.pdf"); plt.close(fig)
        if check([td / "wide.pdf"]) == 0:
            fails.append("an over-wide canvas was not caught")

        # DIRTY 2: a type size outside the declared scale.
        fig, ax = plt.subplots(figsize=(TEXT_WIDTH_PT / 72.0, 1.4),
                               constrained_layout=True)
        ax.set_xlabel("odd size", fontsize=11.0)
        fig.savefig(td / "odd.pdf"); plt.close(fig)
        if check([td / "odd.pdf"]) == 0:
            fails.append("an 11 pt label was not caught")

        # DIRTY 3: the empty input must fail closed.
        try:
            check([])
            fails.append("an empty file list did not raise")
        except SystemExit:
            pass

    for f in fails:
        print(f"SELF-TEST FAIL: {f}")
    print(f"\nSELF-TEST: 4 assertions, {len(fails)} failed")
    return 1 if fails else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("paths", nargs="*", type=Path)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    files = []
    for p in args.paths:
        files.extend(sorted(p.glob("*.pdf")) if p.is_dir() else [p])
    return check(files)


if __name__ == "__main__":
    sys.exit(main())
