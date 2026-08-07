"""F5 `fig:validity-efficiency` -- why no interval method displaces the incumbent.

Table `tab:winkler` gives the verdict. The Winkler score compounds coverage and width
into one scalar, so it conceals the trade the five methods are actually making. This
plots the two components against each other, which is the chart Zaffran et al. (2022,
Figs. 6, 15, 16) prescribe for exactly this comparison: "in order to simultaneously
assess validity and efficiency, we represent on the same graph the empirical coverage
and average median length", with a rule at the target level.

Rejected: a grouped bar chart of Winkler scores. It redraws `tab:winkler`'s scalars
without adding a reading.

Source: brain/eval/interval_calibration_L1.json (.venv-forecast, stamped).
"""

from __future__ import annotations

import matplotlib.pyplot as plt

from _style import (ARM_STYLE, TEXT_WIDTH, VENUE_LABEL, VENUES, assert_estate,
                    load, panel_label, save, use_style)

LEVEL = "0.9"
NOMINAL = 0.90


def main() -> None:
    use_style()
    data = load("eval/interval_calibration_L1.json")
    assert_estate(data["venues"].keys())

    fig, axes = plt.subplots(1, 3, figsize=(TEXT_WIDTH, 2.35), constrained_layout=True)

    for ax, venue, tag in zip(axes, VENUES, "ABC"):
        metrics = data["venues"][venue]["per_level"][LEVEL]["metrics"]
        ax.axvline(NOMINAL, color="0.55", lw=0.7, ls=(0, (4, 2)), zorder=1)

        for arm, (colour, marker, _) in ARM_STYLE.items():
            m = metrics[arm]
            cov = m["marginal"]["coverage"]
            width = m["mean_width"]
            # The Clopper-Pearson limbs are the honest horizontal extent of each point:
            # a coverage estimate on ~1700 pairs is not a number without an interval.
            ax.plot([m["marginal"]["cp_lo"], m["marginal"]["cp_hi"]], [width, width],
                    color=colour, lw=0.8, alpha=0.55, solid_capstyle="butt", zorder=2)
            ax.plot(cov, width, marker=marker, color=colour, ms=4.5,
                    mec="white" if arm == "D" else colour, mew=0.7 if arm == "D" else 0.0,
                    ls="none", zorder=3)
            ax.annotate(arm, (cov, width), textcoords="offset points", xytext=(0, 5),
                        ha="center", fontsize=6.5, color=colour, zorder=4)

        ax.set_xlabel("Empirical coverage")
        panel_label(ax, f"({tag}) {VENUE_LABEL[venue]}")
        ax.margins(x=0.18, y=0.22)

    axes[0].set_ylabel("Mean interval width (£)")
    # Nominal is annotated once. Repeating it in all three panels is ink for no reading.
    axes[0].annotate("nominal 0.90", xy=(NOMINAL, axes[0].get_ylim()[0]),
                     xytext=(-3, 6), textcoords="offset points", rotation=90,
                     fontsize=6, color="0.4", ha="right", va="bottom")

    handles = [plt.Line2D([], [], color=c, marker=m, ls="none", ms=4.5, label=f"{k} — {lab}")
               for k, (c, m, lab) in ARM_STYLE.items()]
    fig.legend(handles=handles, loc="outside lower center", ncol=5,
               handletextpad=0.3, columnspacing=1.1)

    save(fig, "fig_validity_efficiency")


if __name__ == "__main__":
    main()
