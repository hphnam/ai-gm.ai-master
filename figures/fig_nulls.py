"""F7 `fig:nulls` -- the weather and pooling nulls, measured rather than merely unfound.

RQ3's answer is no on both limbs. A forest plot of paired differences with their
bootstrap intervals shows the nulls as measurements: each interval straddles zero, and
the reader can see how much room there was to find an effect. That is the reading a
table of near-identical means cannot give.

Rejected: two grouped bar charts of mean loss. Bars of near-identical means invite a
ranking by eye, which is precisely the inference the null asserts cannot be drawn.

Grounding: Ansari et al. (2025) Figs. 12-19 print an interval against every pairwise
estimate and mark cells straddling no-difference neutrally; Brigato et al. (2025) 4.4
warns against the shared absolute scale that motivates faceting by venue here.

NOTE: the x-axis is NOT shared. Beer Hall and Two River Taps are scored in MASE, Ellel
in pounds (Section sec:res-basis), so a common axis would print two units as one.

Sources: brain/eval/weather_basis_mcs.json, brain/eval/group_icl_mcs.json.
"""

from __future__ import annotations

import matplotlib.pyplot as plt

from _style import (OKABE_ITO, TEXT_WIDTH, VENUE_LABEL, VENUES, assert_estate,
                    load, panel_label, save, use_style)

FAMILIES = (("Weather", "eval/weather_basis_mcs.json"),
            ("Pooling", "eval/group_icl_mcs.json"))


def main() -> None:
    use_style()
    loaded = [(name, load(rel)) for name, rel in FAMILIES]
    for _, data in loaded:
        assert_estate(data["venues"].keys())

    fig, axes = plt.subplots(1, 3, figsize=(TEXT_WIDTH, 3.1), constrained_layout=True)

    for ax, venue, tag in zip(axes, VENUES, "ABC"):
        rows, boundaries = [], []
        for fam, data in loaded:
            block = data["venues"][venue]
            for entry in block["paired_bootstrap"]:
                rows.append((fam, entry, block["loss_metric"]))
            boundaries.append(len(rows))

        ax.axvline(0.0, color="0.55", lw=0.7, ls=(0, (4, 2)), zorder=1)

        ypos = range(len(rows) - 1, -1, -1)
        for y, (fam, e, _) in zip(ypos, rows):
            # Colour marks the verdict, but the filled/open marker carries it too, so the
            # figure survives greyscale printing and colour vision deficiency alike.
            excl = e["excludes_zero"]
            colour = OKABE_ITO["vermillion"] if excl else OKABE_ITO["blue"]
            ax.plot([e["ci_lo"], e["ci_hi"]], [y, y], color=colour, lw=1.0,
                    solid_capstyle="butt", zorder=2)
            ax.plot(e["mean_delta"], y, marker="o", ms=3.8, color=colour,
                    mfc=colour if excl else "white", mew=0.9, ls="none", zorder=3)

        ax.set_yticks(list(ypos))
        ax.set_yticklabels([e["pair"] for _, e, _ in rows], fontsize=6.5)
        ax.set_ylim(-0.8, len(rows) - 0.2)

        # The family separator: which pairs belong to which experiment, without a legend.
        split = len(rows) - boundaries[0]
        ax.axhline(split - 0.5, color="0.8", lw=0.6, zorder=0)
        ax.text(0.985, 0.985, "weather", transform=ax.transAxes, ha="right", va="top",
                fontsize=6, color="0.35", style="italic")
        ax.text(0.985, 0.015, "pooling", transform=ax.transAxes, ha="right", va="bottom",
                fontsize=6, color="0.35", style="italic")

        # The unit rides the x-axis label alone. Repeating it in a panel title
        # duplicated it inside the figure as well as against the caption.
        unit = "MASE" if rows[0][2].lower().startswith("mase") else "£"
        ax.set_xlabel(f"Paired mean difference ({unit})")
        ax.margins(x=0.14)
        ax.tick_params(axis="x", labelrotation=0)
        panel_label(ax, f"({tag}) {VENUE_LABEL[venue]}")

    handles = [
        plt.Line2D([], [], color=OKABE_ITO["blue"], marker="o", mfc="white", mew=0.9,
                   ms=3.8, label="interval includes zero"),
        plt.Line2D([], [], color=OKABE_ITO["vermillion"], marker="o", ms=3.8,
                   label="interval excludes zero"),
    ]
    fig.legend(handles=handles, loc="outside lower center", ncol=2,
               handletextpad=0.3, columnspacing=1.4)

    save(fig, "fig_nulls")


if __name__ == "__main__":
    main()
