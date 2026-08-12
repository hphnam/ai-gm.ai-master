"""`fig:ladder` -- the rolling-origin forecast ladder, three venues, three panels.

Replaces `tab:ladder` (gate 4, decision row 88). A single table cannot carry this
result honestly for two reasons, and the figure answers both:

  units     G2 ruled Ellel `unscaled`, so its losses are MAE in currency while the
            other two venues are MASE on `calendar_lag7_active`. Small multiples
            give each venue its own axis, so there is no shared scale inviting the
            cross-venue comparison the ruling forbids.

  skew      At Ellel the standard deviation exceeds the mean at every rung
            (log/70 section 5). The fold-loss distribution is right-skewed and
            zero-inflated -- the occurrence structure that motivated the hurdle
            (log/67). A mean column asserts a symmetric summary that the data does
            not have, so the box carries the median and IQR and the mean is drawn
            as a separate mark that can sit outside the box.

The bars are NOT bolded by rank. `log/70` section 3 establishes that no ranking
change between the two rulers survives its own standard error, and the retained
set, not the ordering, is the honest object -- so MCS membership at alpha=0.10 is
what the ink marks.

Reads the committed artefacts only; runs no model.

Runs in `.venv-eval`, which is the venv carrying matplotlib. That differs from the
`.venv-forecast` the vectors were measured in, and it is safe here only because
this script reads the committed artefacts and computes order statistics -- it
fits nothing and calls no model, so no figure here can depend on the resolution.

Run:  brain/.venv-eval/bin/python drafts/figures/make_ladder_figure.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

# The one style module, reached by path because this generator lives outside figures/.
# It was previously styled independently and that is exactly why it drifted: its own
# rcParams, its own four hex constants and its own 7.4 in canvas put its ticks on the
# page at 6.2 pt where fig_drift's were 7.9 pt.
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "figures"))
from _style import (AXIS, BRAND, FS_ANNOT, FS_LABEL, FS_TICK, GRID, MUTED,  # noqa: E402
                    TEXT_WIDTH, assert_no_ink_outside, assert_no_text_dropped,
                    assert_page_width, panel_label, use_style)
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.ticker import MaxNLocator  # noqa: E402

OUT = Path(__file__).parent
BRAIN = Path(__file__).resolve().parents[2]

INK = AXIS
FAINT = GRID
MARK = BRAND["ruby"]

# Estate order, and it must match figures/_style.py's: F4-F7 read left to right
# in this order, and a reader comparing panels across figures in one chapter
# will misread the comparison if one figure permutes them.
VENUES = ["beer_hall", "ellel", "two_river_taps"]
TITLES = {"beer_hall": "Beer Hall", "two_river_taps": "Two River Taps",
          "ellel": "Ellel"}

# The rung names are the code's, not the reader's.
LABELS = {
    "rung0_seasonal_naive": "seasonal naive",
    "rung1_robust_dow": "robust DOW",
    "rung2_ets": "ETS",
    "rung2_stl": "STL",
    "rung3_gbm": "GBM",
    "rung3_global_gbm": "global GBM",
    "rung4_chronos2": "Chronos-2",
    "rung4_chronos2_exo": "Chronos-2 + exo",
    "rung4_chronos_bolt": "Chronos-Bolt",
}



def _load(venue: str) -> tuple[dict, list[str], str, str]:
    """Vectors, the retained set, and the headline loss to plot.

    The headline is read from the artefact rather than named here, so a change of
    designation moves the figure with the tables instead of leaving it a run behind.
    """
    payload = json.loads(
        (BRAIN / "eval" / f"fold_vectors_L1_{venue}.json").read_text())
    mcs = json.loads((BRAIN / "eval" / "mcs_L1_results.json").read_text())
    head = mcs["headline_loss"]
    retained = mcs["venues"][venue][f"mcs_{head}"]["common_fold"]["sets"]["0.1"]
    # The vector key is `rmsse` at every venue, but at a venue ruled `unscaled` it
    # holds an RMSE in currency. The artefact records which, per venue.
    unit = mcs["venues"][venue]["headline_loss_at_venue"]
    return payload, retained, head, unit


def ladder() -> None:
    use_style()
    fig, axes = plt.subplots(1, 3, figsize=(TEXT_WIDTH, 3.05))

    for ax, venue, tag in zip(axes, VENUES, "ABC"):
        payload, retained, head, unit_key = _load(venue)
        scored = {k: v for k, v in payload["rungs"].items() if v.get("available")}
        # Worst at the top so the reader's eye falls down to the retained set.
        order = sorted(scored, key=lambda k: -np.mean(scored[k][head]))

        for y, name in enumerate(order):
            x = np.asarray(scored[name][head], dtype=float)
            lo, q1, med, q3, hi = np.percentile(x, [5, 25, 50, 75, 95])
            keep = name in retained
            colour = MARK if keep else MUTED

            ax.plot([lo, hi], [y, y], color=FAINT, linewidth=0.8, zorder=1,
                    solid_capstyle="butt")
            ax.add_patch(plt.Rectangle(
                (q1, y - 0.22), q3 - q1, 0.44, facecolor=colour, alpha=0.16,
                edgecolor=colour, linewidth=0.6, zorder=2))
            ax.plot([med, med], [y - 0.22, y + 0.22], color=colour,
                    linewidth=1.2, zorder=3)
            # The mean is a separate mark because at Ellel it lies outside the
            # box -- that displacement IS the skew finding, not a rendering flaw.
            ax.plot([float(np.mean(x))], [y], marker="D", markersize=3.2,
                    color=INK if keep else MUTED, zorder=4,
                    markeredgewidth=0)

        ax.set_yticks(range(len(order)))
        ax.set_yticklabels([LABELS[n] for n in order], fontsize=FS_TICK)
        for tick, name in zip(ax.get_yticklabels(), order):
            tick.set_color(INK if name in retained else MUTED)
        # The lower limit leaves an empty band for the provenance annotation below the
        # last rung. Widening the view changes no plotted value.
        ax.set_ylim(-1.75, len(order) - 0.3)

        # Literal U+00A3. The reason used to be that mathtext has no \pounds macro;
        # since 2026-08-12 LaTeX sets this text through the pgf backend and would accept
        # the macro, but the literal is kept because it is what the other figures carry.
        unit = "RMSSE" if unit_key == "rmsse" else "RMSE (£)"
        # The UNIT is the axis label and takes the axis-label size. The basis and the
        # fold count are provenance, so they take the annotation size -- which is what
        # they are, and which also fits: "calendar_lag7_active" is 74 pt at 9 pt and
        # overran the canvas under the rightmost panel, but 58 pt at 7 pt.
        ax.set_xlabel(unit, fontsize=FS_LABEL, color=AXIS)
        # Provenance sits INSIDE the axes, bottom right -- the idiom fig_nulls already
        # uses for its family labels. Below the axis label it needed reserved canvas that
        # tight_layout cannot measure (it is not a decoration), which produced either a
        # collision with the axis label or a band of dead space under the figure.
        ax.text(0.985, 0.015, f"{payload['basis']}\n$n={payload['n_folds']}$",
                transform=ax.transAxes, ha="right", va="bottom",
                fontsize=FS_ANNOT, color=MUTED)
        # A panel label, not a title: it identifies which panel is which, and the
        # figure's title lives in the caption where the List of Figures reaches it.
        # The SHARED helper, not a local ax.text: the local copy anchored the label to
        # the axes' LEFT edge and ran rightwards, so at 150 mm "(C) Two River Taps" left
        # the canvas and pgf dropped "Taps" without a trace. The helper anchors right and
        # runs leftwards into the margin above the y labels, which is also what the other
        # four figures do -- so this fixes an overflow and a cross-figure inconsistency
        # with one line.
        panel_label(ax, f"({tag}) {TITLES[venue]}")
        # Three ticks. At 150 mm the y-labels leave each panel about 25 mm of plot,
        # where the default five printed "0.51.01.5" with the labels touching.
        ax.xaxis.set_major_locator(MaxNLocator(nbins=3))
        ax.tick_params(axis="x", labelsize=FS_TICK, colors=AXIS, length=2.5)
        ax.tick_params(axis="y", length=0)
        for side in ("top", "right", "left"):
            ax.spines[side].set_visible(False)
        ax.spines["bottom"].set_color(FAINT)
        ax.grid(axis="x", color=FAINT, linewidth=0.5, alpha=0.6, zorder=0)
        ax.set_axisbelow(True)

    # The right inset is not cosmetic: the provenance line centred under the last
    # panel needs about 6 pt of canvas beyond the axes or pgf drops its last word.
    fig.tight_layout(w_pad=0.8, rect=(0.004, 0, 0.972, 1))
    # No bbox_inches="tight": cropping is what made this figure land on the page at
    # x0.779 and its type 21 per cent smaller than every other figure's.
    path = OUT / "ladder.pdf"
    fig.savefig(path)
    assert_page_width(path)
    assert_no_ink_outside(path)
    assert_no_text_dropped(fig, path)
    plt.close(fig)
    import pymupdf
    pymupdf.open(path)[0].get_pixmap(dpi=200).save(OUT / "ladder.png")


if __name__ == "__main__":
    ladder()
    print(f"wrote {OUT/'ladder.pdf'}")
