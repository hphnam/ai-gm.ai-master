"""Shared publication style for every figure in the dissertation.

One module rather than per-script rcParams so that a reader flipping between
Chapter 4's floats sees one typographic voice. `scientific-visualization` sets the
constraints this encodes: colourblind-safe, vector output, no chartjunk, units on
every axis, and text legible at the size the page actually prints.

`VENUES` is the estate. It is three, it is ordered, and it is defined here once so
that no figure can silently draw a fourth or drop one.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib as mpl

mpl.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

BRAIN = Path(__file__).resolve().parent.parent / "brain"
OUT = Path(__file__).resolve().parent / "out"

# The estate. Order is fixed: two data-rich venues then the sparse one, which is the
# order every table in Chapter 4 already uses.
VENUES = ("beer_hall", "ellel", "two_river_taps")
VENUE_LABEL = {"beer_hall": "Beer Hall", "ellel": "Ellel",
               "two_river_taps": "Two River Taps"}

# Okabe-Ito. Distinguishable under all three common forms of colour vision deficiency
# and in greyscale, which matters because the dissertation may be printed.
OKABE_ITO = {
    "black": "#000000", "orange": "#E69F00", "sky": "#56B4E9", "green": "#009E73",
    "yellow": "#F0E442", "blue": "#0072B2", "vermillion": "#D55E00", "purple": "#CC79A7",
}

# Colour NEVER carries meaning alone -- every series that is coloured is also marked.
ARM_STYLE = {
    "P": (OKABE_ITO["sky"], "o", "Pooled split"),
    "D": (OKABE_ITO["black"], "s", "Mondrian (incumbent)"),
    "S": (OKABE_ITO["green"], "^", "Per-step"),
    "A": (OKABE_ITO["vermillion"], "D", "ACI"),
    "G": (OKABE_ITO["purple"], "v", "AgACI"),
}

# Text width of the dissertation body in inches, measured from the class's \textwidth.
# Figures are drawn at final size so nothing is rescaled and no font is left too small.
TEXT_WIDTH = 6.0

_RC = {
    "figure.dpi": 150, "savefig.dpi": 300,
    "savefig.bbox": "tight", "savefig.pad_inches": 0.02,
    "font.family": "serif",
    "font.serif": ["DejaVu Serif"],
    "font.size": 8, "axes.titlesize": 8.5, "axes.labelsize": 8,
    "xtick.labelsize": 7, "ytick.labelsize": 7, "legend.fontsize": 7,
    "axes.spines.top": False, "axes.spines.right": False,
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
            fontsize=8.5, ha="right", va="bottom")


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


def save(fig, name: str) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.pdf"
    fig.savefig(path)
    fig.savefig(OUT / f"{name}.png")  # for on-screen review only; the PDF is the artefact
    plt.close(fig)
    print(f"wrote {path}")
    return path
