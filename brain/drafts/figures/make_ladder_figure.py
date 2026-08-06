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
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).parent
BRAIN = Path(__file__).resolve().parents[2]

INK = "#1a1a1a"
MUTED = "#8a8a8a"
FAINT = "#d8d8d8"
MARK = "#b03a2e"

VENUES = ["beer_hall", "two_river_taps", "ellel"]
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

plt.rcParams.update({
    "font.family": "serif",
    "font.size": 9,
    "axes.linewidth": 0.6,
})


def _load(venue: str) -> tuple[dict, list[str]]:
    payload = json.loads(
        (BRAIN / "eval" / f"fold_vectors_L1_{venue}.json").read_text())
    mcs = json.loads((BRAIN / "eval" / "mcs_L1_results.json").read_text())
    retained = mcs["venues"][venue]["mcs_primary_mase"]["common_fold"]["sets"]["0.1"]
    return payload, retained


def ladder() -> None:
    fig, axes = plt.subplots(1, 3, figsize=(7.4, 3.9))

    for ax, venue in zip(axes, VENUES):
        payload, retained = _load(venue)
        scored = {k: v for k, v in payload["rungs"].items() if v.get("available")}
        # Worst at the top so the reader's eye falls down to the retained set.
        order = sorted(scored, key=lambda k: -np.mean(scored[k]["mase"]))

        for y, name in enumerate(order):
            x = np.asarray(scored[name]["mase"], dtype=float)
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
        ax.set_yticklabels([LABELS[n] for n in order], fontsize=8)
        for tick, name in zip(ax.get_yticklabels(), order):
            tick.set_color(INK if name in retained else MUTED)
        ax.set_ylim(-0.7, len(order) - 0.3)

        # Literal U+00A3, not a LaTeX \pounds -- mathtext has no such macro and
        # renders the control sequence verbatim into the axis label.
        unit = "MASE" if payload["loss"] == "mase" else "MAE (£)"
        ax.set_xlabel(f"{unit}\n{payload['basis']}, $n={payload['n_folds']}$",
                      fontsize=8, color=MUTED)
        ax.set_title(TITLES[venue], fontsize=9.5, color=INK, pad=7)
        ax.tick_params(axis="x", labelsize=7.5, colors=MUTED, length=2.5)
        ax.tick_params(axis="y", length=0)
        for side in ("top", "right", "left"):
            ax.spines[side].set_visible(False)
        ax.spines["bottom"].set_color(FAINT)
        ax.grid(axis="x", color=FAINT, linewidth=0.5, alpha=0.6, zorder=0)
        ax.set_axisbelow(True)

    fig.tight_layout(w_pad=1.4)
    fig.savefig(OUT / "ladder.pdf", bbox_inches="tight")
    fig.savefig(OUT / "ladder.png", dpi=200, bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    ladder()
    print(f"wrote {OUT/'ladder.pdf'}")
