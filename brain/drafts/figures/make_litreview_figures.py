"""Literature-review figure for PRJ93.

ONE figure, and a synthetic one: it positions the surveyed proactive-agent
systems against each other on the two dimensions this chapter argues about, and
the gap the dissertation occupies is the cell those systems leave empty.

  fig:gap-map   rows are the intervention policy a system runs; columns are what
                its decisions are finally scored against, ordered by how
                directly that grounding is a real person's judgement. Supports
                sec:rw-synthesis.

Every placement is the chapter's own claim, not a new one:

  columns   "The proactive systems surveyed in Section~\\ref{sec:rw-surfacing}
            are evaluated instead against annotated corpora of recorded
            activity [lu, tang, yang_contextagent, yang_fingertip], against
            simulated or scripted users [yao, liu_proactiveeval, gulati], or
            against a language model acting as judge [fu, ding]."
            The fourth column is the one the same paragraph says is empty:
            "None of those just enumerated is scored against the decisions of
            the operator whose work it is intervening in."

  rows      "PRISM sets its intervention threshold from an asymmetric
            miss-to-false-alarm cost ratio, and among the proactive systems
            surveyed here it is the one that gates on a calibrated acceptance
            probability rather than on accuracy alone. It reports the gate's
            effect but not the calibration of the probability the gate depends
            on." The top row is what the chapter says none of them does: fix the
            cost ratio to the operator's stated preferences AND measure the
            calibration of the probability it is applied to.

Peer-review status is deliberately NOT encoded. The chapter marks preprints
individually where it cites them, but does not mark liu_proactiveeval,
yang_contextagent or yang_fingertip either way, and a marker would assert a
status this chapter has not established for them.

The two earlier candidates (the SBC plane and the HLN correction factor) were
dropped: both illustrated a formula already given in the prose rather than
saying anything about the literature as a body.

Run:  python brain/drafts/figures/make_litreview_figures.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

OUT = Path(__file__).parent

INK = "#1a1a1a"
MUTED = "#8a8a8a"
FAINT = "#d8d8d8"
MARK = "#b03a2e"

COLUMNS = [
    "a language model\nas judge",
    "simulated or\nscripted users",
    "annotated corpora\nof recorded activity",
    "the operator's own\naccept-or-dismiss\ndecisions",
]

ROWS = [
    "scored on accuracy\nor $F_1$ alone",
    "gates on a cost-asymmetric\nthreshold",
    "operator-elicited cost ratio,\ngate calibration measured",
]

# (column index, row index, label, dy in points). dy hand-set where a cell holds
# more than one system.
SYSTEMS = [
    (0, 0, "ProActor", 0),
    (0, 1, "PRISM", 0),
    (1, 0, r"$\tau$-bench", 12),
    (1, 0, "ProactiveEval", 0),
    (1, 0, "Ask", -12),
    (2, 0, "ProactiveBench", 17),
    (2, 0, "ProAgentBench", 5.7),
    (2, 0, "ContextAgent", -5.7),
    (2, 0, "Fingertip", -17),
]

TARGET = (3, 2)

plt.rcParams.update({
    "font.family": "serif",
    "font.size": 9,
    "axes.linewidth": 0.6,
})


def gap_map() -> None:
    fig, ax = plt.subplots(figsize=(7.4, 3.5))
    ax.set_xlim(-0.62, 3.62)
    ax.set_ylim(-0.55, 2.62)

    for x in range(len(COLUMNS)):
        for y in range(len(ROWS)):
            ax.add_patch(FancyBboxPatch(
                (x - 0.44, y - 0.40), 0.88, 0.80,
                boxstyle="round,pad=0,rounding_size=0.04",
                linewidth=0.6, edgecolor=FAINT,
                facecolor="none", zorder=1))

    # The empty cell is the argument, so it is the only one drawn in ink.
    tx, ty = TARGET
    ax.add_patch(FancyBboxPatch(
        (tx - 0.44, ty - 0.40), 0.88, 0.80,
        boxstyle="round,pad=0,rounding_size=0.04",
        linewidth=1.1, edgecolor=MARK, facecolor=MARK, alpha=0.10, zorder=2))
    ax.text(tx, ty, "this\ndissertation", ha="center", va="center",
            fontsize=8.5, color=MARK, linespacing=1.5, zorder=4)

    for x, y, label, dy in SYSTEMS:
        ax.annotate(label, (x, y), textcoords="offset points", xytext=(0, dy),
                    ha="center", va="center", fontsize=7.5, color=INK, zorder=4)

    ax.set_xticks(range(len(COLUMNS)))
    ax.set_xticklabels(COLUMNS, fontsize=7.5, color=INK, linespacing=1.5)
    ax.set_yticks(range(len(ROWS)))
    ax.set_yticklabels(ROWS, fontsize=7.5, color=INK, linespacing=1.5)
    ax.tick_params(length=0, pad=7)

    ax.set_xlabel("what the intervention decision is scored against "
                  r"$\longrightarrow$", fontsize=8.5, color=MUTED, labelpad=9)
    ax.set_ylabel(r"intervention policy $\longrightarrow$",
                  fontsize=8.5, color=MUTED, labelpad=9)

    for s in ax.spines.values():
        s.set_visible(False)

    fig.tight_layout()
    fig.savefig(OUT / "gap_map.pdf", bbox_inches="tight")
    fig.savefig(OUT / "gap_map.png", dpi=200, bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    gap_map()
    print(f"wrote {OUT/'gap_map.pdf'}")
