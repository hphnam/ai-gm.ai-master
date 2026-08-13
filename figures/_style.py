"""Shared publication style for every figure in the dissertation.

One module rather than per-script rcParams so that a reader flipping between
Chapter 4's floats sees one typographic voice. `scientific-visualization` sets the
constraints this encodes: colourblind-safe, vector output, no chartjunk, units on
every axis, and text legible at the size the page actually prints.

`VENUES` is the estate. It is three, it is ordered, and it is defined here once so
that no figure can silently draw a fourth or drop one.

TYPESETTING, changed 2026-08-12. Text is set by LaTeX through matplotlib's `pgf`
backend, not by matplotlib's own font machinery. The figure font is therefore the
document font BY CONSTRUCTION rather than by naming a font file that happens to sit
on this machine -- the failure mode this project has been caught by repeatedly, where
a local render and a fresh clone disagree. Nothing downstream changes: `pgf` runs
here, at generation time, and still emits a plain PDF that `\\includegraphics` consumes
exactly as before, so a fresh clone needs no TeX-in-Python and no pgf at all.

SIZE, and why it is not 6.0 inches. The body text block is 150 mm (A4 less the 35/25 mm
margins `main.tex` sets), which is 5.9055 in. Drawing at exactly that width and
including at `width=\\textwidth` puts every figure on the page at 1:1, so a 9 pt label
in this file is 9 pt on the paper. Drawing at 6.0 in and cropping with
`savefig.bbox='tight'` -- what this module did until 2026-08-12 -- made each figure a
different width and therefore rescaled each by a different factor: the six charts were
measured landing between x0.779 and x0.991, so a nominal 8 pt tick set at 6.2 pt in
`ladder` and 7.9 pt in `fig_drift`. That spread is why `bbox='tight'` is gone and must
not come back; `constrained_layout` does the same job without changing the canvas.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import matplotlib as mpl

mpl.use("pgf")
import matplotlib.pyplot as plt  # noqa: E402

BRAIN = Path(__file__).resolve().parent.parent / "brain"
OUT = Path(__file__).resolve().parent / "out"

# The estate. Order is fixed: two data-rich venues then the sparse one, which is the
# order every table in Chapter 4 already uses.
VENUES = ("beer_hall", "ellel", "two_river_taps")
VENUE_LABEL = {"beer_hall": "Beer Hall", "ellel": "Ellel",
               "two_river_taps": "Two River Taps"}

# ---------------------------------------------------------------------- colour
#
# The LuneBrew kit's own categorical sequence (Deck Guide 5.1) was MEASURED and
# REFUSED for data on 2026-08-12: its gold #E5A83D against its lime #A7C520 separates
# by dE00 3.05 under deuteranopia and 2.69 under protanopia, against a just-noticeable
# difference of about 2.3 -- for a deuteranope those are one colour. The run is
# `brain/scripts/palettecheck.py --series 5`, and `--search` then established that
# 0 of 462 five-subsets of the whole kit clear both the dE00 and greyscale floors.
#
# What IS used below is a brand-DERIVED sequence, ruled by Phuong 2026-08-12, drawn
# entirely from the kit and measured better than the Okabe-Ito it replaces on every
# condition that matters: deuteranopia 21.36 against 12.22, protanopia 25.29 against
# 13.92, greyscale dL* 5.72 against 3.31. It is worse only under normal vision
# (24.09 against 34.69), where both sit far above any threshold.
#
# Reproduce with:  python3 brain/scripts/palettecheck.py --seq ink gold grey-2 teal ruby --matrix
BRAND = {
    "ink": "#111111", "ink2": "#1D1D1B", "paper": "#EFF0EB",
    "gold": "#E5A83D", "grey": "#8A8A86", "grey2": "#5C5C58",
    "choc": "#3F2C1B", "pine": "#E9B028", "mango": "#E18200",
    "teal": "#2F9C96", "lime": "#A7C520", "ruby": "#C0392B",
}

# The ruled data sequence, in order. Five is the most any figure here needs.
SERIES = (BRAND["ink"], BRAND["gold"], BRAND["grey2"], BRAND["teal"], BRAND["ruby"])

# Structural roles. These carry no data, so the kit's own colours apply unmodified --
# this is where brand consistency is bought at zero cost in legibility.
AXIS = BRAND["ink"]
GRID = "#D8D8D4"      # the kit's --line-l, rgba(17,17,17,.12), flattened onto white
MUTED = BRAND["grey"]  # de-emphasised scatter, reference rules, secondary annotation

# NEITHER palette clears a greyscale floor at five series -- Okabe-Ito reaches only
# dL* 3.31 and the best brand-derived set 5.72, against a floor of 10. That is a
# property of five-way categorical greyscale rather than of either palette, and it is
# why the rule below is not negotiable.
#
# Colour NEVER carries meaning alone -- every series that is coloured is also marked.
# Marker shapes are UNCHANGED from the Okabe-Ito era on purpose: the hue mapping moved,
# the identity of each series did not.
ARM_STYLE = {
    "P": (BRAND["teal"], "o", "Pooled split"),
    "D": (BRAND["ink"], "s", "Mondrian (incumbent)"),
    "S": (BRAND["gold"], "^", "Per-step"),
    "A": (BRAND["ruby"], "D", "ACI"),
    "G": (BRAND["grey2"], "v", "AgACI"),
}

# ------------------------------------------------------------------ typography
#
# THREE SIZES, and the same three in every figure and every TikZ float. A 9 pt axis
# label in one figure and an 11 pt one in another is the most visible inconsistency a
# document can carry and the easiest to miss, so the sizes live here as names and no
# generator writes a bare number. Against a 12 pt body these sit clearly subordinate
# while staying above the legibility floor; because figures now land at 1:1 (see the
# module docstring), the number below is the number on the paper.
FS_LABEL = 9.0   # axis labels, legend entries, panel letters
FS_TICK = 8.0    # tick labels
FS_ANNOT = 7.0   # in-plot annotation, endpoint labels, secondary notes

# Text width of the dissertation body in inches: 150 mm, from main.tex's \newgeometry
# (A4 210 mm less left=35 mm and right=25 mm). Figures are drawn at final size so
# nothing is rescaled and no font is left too small.
TEXT_WIDTH = 150.0 / 25.4

_RC = {
    "figure.dpi": 150, "savefig.dpi": 300,
    "savefig.pad_inches": 0.0,
    # pgf: LaTeX sets the type, so matplotlib's font lookup is switched off entirely.
    # The preamble mirrors main.tex, which loads no font package -- hence Computer
    # Modern, the document face, with no file named anywhere.
    "pgf.texsystem": "pdflatex",
    "pgf.rcfonts": False,
    # Mirrors main.tex line for line. It loads inputenc and amsmath and NO fontenc,
    # so the document runs OT1 and gets real CMR. An earlier draft of this block added
    # \usepackage[T1]{fontenc} out of habit and the figures came back set in SFRM --
    # CM-super, which is a different font of the same design and reads as "Computer
    # Modern" to anyone checking by eye. Do not add a package main.tex does not load.
    "pgf.preamble": "\n".join([
        r"\usepackage[utf8]{inputenc}",
        r"\usepackage{amsmath}",
    ]),
    "font.family": "serif",
    "font.size": FS_TICK,
    "axes.titlesize": FS_LABEL, "axes.labelsize": FS_LABEL,
    "xtick.labelsize": FS_TICK, "ytick.labelsize": FS_TICK,
    "legend.fontsize": FS_LABEL,
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": AXIS, "axes.labelcolor": AXIS,
    "text.color": AXIS, "xtick.color": AXIS, "ytick.color": AXIS,
    "grid.color": GRID,
    "axes.linewidth": 0.6, "grid.linewidth": 0.4, "lines.linewidth": 1.1,
    "xtick.major.width": 0.6, "ytick.major.width": 0.6,
    "xtick.major.size": 2.5, "ytick.major.size": 2.5,
    "legend.frameon": False, "axes.axisbelow": True,
    "pdf.fonttype": 42, "ps.fonttype": 42,  # embed as TrueType, not Type 3
}


def use_style() -> None:
    plt.rcParams.update(_RC)


def panel_label(ax, text: str) -> None:
    """(A), (B), (C) in the top-left, per the multi-panel convention."""
    ax.text(-0.02, 1.06, text, transform=ax.transAxes, fontweight="bold",
            fontsize=FS_LABEL, ha="right", va="bottom")


def load(rel: str):
    """Read an artefact under `brain/`, refusing to invent one that is absent.

    A figure built from a missing file would be a figure built from a default, and
    a default rendered at publication quality is indistinguishable from a measurement.
    """
    p = BRAIN / rel
    if not p.exists():
        sys.exit(f"REFUSING to draw: {p} does not exist. Run its generator first.")
    return json.loads(p.read_text())


def assert_estate(names) -> None:
    """Stop on a fourth venue rather than filtering it away.

    A silent filter here would answer an open exclusion question by side effect.
    """
    extra = set(names) - set(VENUES)
    if extra:
        sys.exit(f"STOP: result file contains venues outside the estate: {sorted(extra)}. "
                 "Report this rather than filtering it.")


def assert_page_width(path: Path) -> None:
    """Refuse a figure that will not land at 1:1, rather than let the page rescale it.

    This is the geometry-a-generator-can-check rule: the width is arithmetic, so it is
    asserted here rather than left to somebody noticing that one figure's ticks look
    smaller than another's. Half a point of tolerance covers PDF rounding.
    """
    import re
    data = path.read_bytes()
    m = re.search(rb"/MediaBox\s*\[\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)", data)
    if not m:
        return  # object-stream PDF; figurestylecheck.py reads these properly
    width = float(m.group(3)) - float(m.group(1))
    target = TEXT_WIDTH * 72.0
    if abs(width - target) > 0.5:
        sys.exit(f"STOP: {path.name} is {width:.2f} pt wide against a {target:.2f} pt text "
                 f"block, so the page would rescale it by x{target / width:.3f} and its "
                 "type would not match the other figures.")


def _require_pymupdf(guard: str):
    """Fail the build rather than let a geometry guard quietly examine nothing.

    Both guards below used to swallow the ImportError and `return`, which made them
    no-ops in `brain/.venv-eval` -- the venv that carries duckdb and pandas and does
    NOT carry pymupdf, and is therefore a venv a figure can plausibly be built in.
    A guard that is off prints exactly what a guard that passed prints, which is the
    project's standing rule that a check examining nothing must not be able to report
    a clean result. There is no fallback here: the whole point of these two is that
    they read the written artefact.
    """
    try:
        import pymupdf
    except ImportError:
        sys.exit(f"STOP: {guard} needs pymupdf and this interpreter has none, so the "
                 "figure would be written unchecked. Build figures with an interpreter "
                 "that has it (pip install pymupdf) rather than skipping the guard.")
    return pymupdf


def assert_no_ink_outside(path: Path) -> None:
    """Refuse a figure whose text OR drawn ink runs off its own canvas.

    Removing `savefig.bbox='tight'` (see the module docstring) means the canvas no
    longer grows to swallow an over-long label -- it clips instead, and a clipped axis
    label is a defect the compile log cannot see and the eye nearly misses: the case
    that prompted this cost 0.7 pt on `fig_nulls`, which looks like a rendering artefact
    rather than a truncated word. Horizontal overflow is arithmetic, so it is asserted
    here rather than left to a render. `constrained_layout` manages a label's HEIGHT but
    not the horizontal reach of one centred under an edge panel, which is why this is
    needed at all.

    The drawings half was added 2026-08-13, because for its first life this function
    read `get_text` only and so checked TEXT while its name, and every caller reading
    that name, promised INK. `fig_sensitivity` put a marker at x = -16324 pt -- a
    non-positive value on a log axis, which matplotlib parks rather than drops -- and
    this guard passed it, the \\includegraphics BBox hid it, and it was caught two tiers
    downstream by `formatcheck` on the rendered page. A check whose scope is narrower
    than its verdict is this project's recurring defect; the repair is to widen the
    scope, since the name was the honest half.

    Both directions, against the real estate rather than fixtures: at the time of
    writing the six other committed figures measure a worst overshoot of exactly
    0.00 pt and `fig_sensitivity` measured 16324.44, so the 0.1 pt tolerance separates
    them by five orders of magnitude and is not a tuned threshold.
    """
    pymupdf = _require_pymupdf("assert_no_ink_outside")
    page = pymupdf.open(path)[0]
    width, height = page.rect.width, page.rect.height
    spilled = [(s["text"], s["bbox"][0], s["bbox"][2])
               for b in page.get_text("dict")["blocks"] if b["type"] == 0
               for line in b["lines"] for s in line["spans"]
               if s["bbox"][0] < -0.1 or s["bbox"][2] > width + 0.1]
    if spilled:
        detail = "; ".join(f"{t!r} spans {x0:.1f}..{x1:.1f}" for t, x0, x1 in spilled)
        sys.exit(f"STOP: {path.name} has text outside its {width:.1f} pt canvas and will "
                 f"print clipped: {detail}")
    # Vertical is checked here and not for text, because a parked point escapes on
    # whichever axis carries the undefined value and there is no reason to guess which.
    drawn = [d["rect"] for d in page.get_drawings()
             if d["rect"].x0 < -0.1 or d["rect"].x1 > width + 0.1
             or d["rect"].y0 < -0.1 or d["rect"].y1 > height + 0.1]
    if drawn:
        r = max(drawn, key=lambda q: max(-q.x0, q.x1 - width, -q.y0, q.y1 - height))
        sys.exit(f"STOP: {path.name} draws ink outside its {width:.1f}x{height:.1f} pt "
                 f"canvas -- worst path spans x {r.x0:.1f}..{r.x1:.1f}, y {r.y0:.1f}.."
                 f"{r.y1:.1f}, over {len(drawn)} path(s). A point undefined on a log "
                 "axis is the usual cause: matplotlib parks it, it does not drop it.")


def assert_no_text_dropped(fig, path: Path) -> None:
    """Refuse a figure that is MISSING a word the generator asked for.

    This exists because `assert_no_ink_outside` was not enough, and the way it failed is
    worth keeping. Under the pgf backend, text that falls PARTLY outside the canvas is
    emitted and clipped -- which that guard catches -- but text falling WHOLLY outside is
    never written into the PDF at all. `ladder`'s panel C read "(C) Two River" with
    "Taps" simply absent: not truncated ink, no span past the edge, nothing for a
    geometry check to see, and a clean verdict over a figure that had lost a word.

    So this compares what the figure was ASKED to say against what the PDF actually
    says. Only plain alphabetic words of three or more characters are checked, because
    LaTeX legitimately rewrites maths, macros and punctuation on its way to the page and
    a guard that fires on those would be switched off within a week.
    """
    pymupdf = _require_pymupdf("assert_no_text_dropped")
    from matplotlib.text import Text

    rendered = "".join(pymupdf.open(path)[0].get_text().split()).lower()
    missing = []
    for artist in fig.findobj(Text):
        raw = artist.get_text()
        if not raw or "$" in raw or "\\" in raw:
            continue
        for word in re.findall(r"[A-Za-z]{3,}", raw):
            if word.lower() not in rendered:
                missing.append(word)
    if missing:
        sys.exit(f"STOP: {path.name} is missing text the generator set: "
                 f"{sorted(set(missing))}. Under pgf, text wholly outside the canvas is "
                 "dropped rather than clipped, so this is a layout overflow that leaves "
                 "no ink to detect. Widen the layout or wrap the label.")


def save(fig, name: str) -> Path:
    """Write the PDF the document includes, plus a PNG for on-screen review.

    `bbox_inches` is deliberately NOT passed: cropping is what desynchronised the type
    sizes across figures (see the module docstring). The PNG is rendered FROM the PDF
    so that what is reviewed is what the document gets, rather than a second draw that
    could differ; under the pgf backend matplotlib cannot write PNG directly anyway.
    """
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.pdf"
    fig.savefig(path)
    assert_page_width(path)
    assert_no_ink_outside(path)
    assert_no_text_dropped(fig, path)
    plt.close(fig)
    try:
        import pymupdf
        page = pymupdf.open(path)[0]
        page.get_pixmap(dpi=200).save(OUT / f"{name}.png")
    except ImportError:
        subprocess.run(["pdftoppm", "-png", "-r", "200", str(path),
                        str(OUT / name)], check=False)
    print(f"wrote {path}")
    return path
