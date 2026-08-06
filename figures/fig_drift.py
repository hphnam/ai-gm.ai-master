"""F4 `fig:drift` -- the conformity scores are not exchangeable, and why differs by venue.

Split conformal cannot under-cover under exchangeability, so the under-coverage reported
in `tab:coverage` localises the violation rather than merely noting it. Plotting the
conformity score against time, with a rolling median and the calibration quantile
overlaid, shows what a quartile-mean bar chart cannot: whether the drift is a change of
level or a change of composition. At Ellel it is composition -- the drift sits on
calendar-open days that did not trade, where the residual equals the forecast by
identity -- so that panel separates the two populations by marker.

Rejected: a bar chart of four time-quartile means. Four bars per venue cannot separate a
level shift from a composition shift, and composition is the finding.

Grounding: Zaffran et al. (2022) A.5 and Fig. 11 prescribe plotting around the
CONFORMITY SCORES rather than the observed values, "the scores are what truly determine
the conformal behaviour".

Source: brain/eval/exchangeability_scores.csv (R2).
"""

from __future__ import annotations

import sys

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import pandas as pd

from _style import (BRAIN, OKABE_ITO, TEXT_WIDTH, VENUE_LABEL, VENUES,
                    assert_estate, panel_label, save, use_style)

ROLL_DAYS = 28
QUANTILE = 0.90


def main() -> None:
    use_style()
    path = BRAIN / "eval" / "exchangeability_scores.csv"
    if not path.exists():
        sys.exit(f"REFUSING to draw: {path} does not exist. Run exchangeability_diagnostic.")
    df = pd.read_csv(path, parse_dates=["target"])
    assert_estate(df["venue"].unique())

    # The conformity score is the absolute residual: the quantity the band is a quantile of.
    df["score"] = df["res"].abs()

    fig, axes = plt.subplots(3, 1, figsize=(TEXT_WIDTH, 5.4), constrained_layout=True,
                             sharex=False)

    for ax, venue, tag in zip(axes, VENUES, "ABC"):
        v = df[df["venue"] == venue].sort_values("target")
        # `state` 0 is the calendar-open Mondrian group. Within it, a zero actual is a
        # day the calendar called open and the venue did not trade -- the population the
        # decomposition turns on.
        open_days = v[v["state"] == 0]
        traded = open_days[open_days["y"] > 0]
        false_open = open_days[open_days["y"] <= 0]
        closed = v[v["state"] == 1]

        ax.scatter(closed["target"], closed["score"], s=1.6, marker=".",
                   color="0.72", alpha=0.55, lw=0, label="structural closure", zorder=1)
        ax.scatter(false_open["target"], false_open["score"], s=5.5, marker="x",
                   color=OKABE_ITO["vermillion"], alpha=0.75, lw=0.55,
                   label="calendar-open, did not trade", zorder=3)
        ax.scatter(traded["target"], traded["score"], s=3.0, marker="o",
                   color=OKABE_ITO["blue"], alpha=0.55, lw=0,
                   label="traded", zorder=2)

        daily = v.groupby("target")["score"].median()
        roll = daily.rolling(f"{ROLL_DAYS}D").median()
        ax.plot(roll.index, roll.values, color="black", lw=1.2,
                label=f"{ROLL_DAYS}-day rolling median", zorder=4)

        q = v["score"].quantile(QUANTILE)
        ax.axhline(q, color=OKABE_ITO["green"], lw=1.0, ls=(0, (5, 2)), zorder=4,
                   label=f"{QUANTILE:.0%} calibration quantile")

        share = len(false_open) / len(open_days) if len(open_days) else 0.0
        ax.set_title(
            f"{VENUE_LABEL[venue]} — {len(false_open):,} of {len(open_days):,} "
            f"calendar-open days did not trade ({share:.0%})", pad=6, loc="left")
        ax.set_ylabel("Conformity score (£)")
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
        ax.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
        panel_label(ax, f"({tag})")

    axes[-1].set_xlabel("Forecast target date")
    handles, labels = axes[0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="outside lower center", ncol=3,
               handletextpad=0.3, columnspacing=1.2, markerscale=2.4)

    save(fig, "fig_drift")


if __name__ == "__main__":
    main()
