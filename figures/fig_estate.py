"""F0 `fig:estate` -- what the three series actually look like, before any method touches them.

Added 2026-08-12 against the exemplar gap analysis (ledger/exemplar_gap_analysis.md, D2).
The manuscript characterised all three venues as erratic or lumpy, reported a coverage
decomposition turning on calendar-open days that took nothing, and built a Mondrian
partition on a closure calendar -- and a reader never saw a single day of any series.
The DS591 marking guide names exploratory analysis leading to model formulation in its
60-69 band; nothing in this document served it.

WHAT EACH COLUMN IS FOR, because two panels per venue is a cost that has to be paid for:

  left  -- daily revenue against calendar time, non-trading days drawn ON the axis as
           ticks rather than omitted. Omitting them is what makes an intermittent series
           look continuous, and the whole of Section 4.4 turns on their number. This is
           also where the reader meets Two River Taps' closure and Ellel's sparsity as
           facts about the data rather than as sentences in a table.
  right -- median takings by weekday over trading days, with the trading RATE printed
           above each bar. The right column is the closure calendar the Mondrian
           partition is specified on, so a reader reaching Section 4.4's misgrouping
           result has already seen the structure that fails.

Rejected: a histogram of daily revenue per venue. It shows the skew the conformal band's
motivation rests on and hides the two properties that decide the findings -- when the
venue is shut, and how the level moves through the frame.

The trading rate is annotated as TEXT rather than encoded in bar colour, because colour
carries no meaning alone anywhere in this figure programme and a two-quantity panel is
the exact place that rule gets quietly broken.

Source: brain/store/brain.duckdb, table l1_daily, at store ceiling 2026-07-07. The table
holds trading rows only, so the calendar is rebuilt over each venue's own frame and the
absent dates ARE the non-trading days -- that reconstruction is the one inference this
figure makes and it is asserted against tab:venues below.
"""

from __future__ import annotations

import sys

import duckdb
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from _style import (AXIS, BRAND, BRAIN, FS_ANNOT, GRID, MUTED, TEXT_WIDTH,
                    VENUE_LABEL, VENUES, assert_estate, panel_label, save, use_style)

CEILING = pd.Timestamp("2026-07-07")
# Single letters, not "Mon"/"Tue". The right column is a third of a 150 mm text block
# wide and seven three-letter labels at 7 pt collide into one word there -- measured,
# not assumed. Ambiguity between Tuesday and Thursday is carried by position, which is
# the convention every calendar uses.
DOW = ("M", "T", "W", "T", "F", "S", "S")

# tab:venues, which this figure must agree with or one of the two is wrong.
FRAME_DAYS = {"beer_hall": 399, "ellel": 386, "two_river_taps": 331}


def load_daily() -> pd.DataFrame:
    path = BRAIN / "store" / "brain.duckdb"
    if not path.exists():
        sys.exit(f"REFUSING to draw: {path} does not exist.")
    con = duckdb.connect(str(path), read_only=True)
    df = con.execute(
        "select venue, date, revenue_exvat from l1_daily "
        "where date <= ? order by venue, date", [CEILING.date()]
    ).fetchdf()
    con.close()
    df["date"] = pd.to_datetime(df["date"])
    assert_estate(df["venue"].unique())
    return df


def frame_for(v: pd.DataFrame) -> pd.DataFrame:
    """Reindex a venue onto its own calendar frame, so absent rows become zero days.

    The frame is first to last TRADING day, which is tab:venues' definition. Days
    outside it are not non-trading days, they are days before the venue existed in this
    corpus, and counting them would inflate every closure figure below.
    """
    traded = v[v["revenue_exvat"] > 0]
    span = pd.date_range(traded["date"].min(), traded["date"].max(), freq="D")
    s = v.set_index("date")["revenue_exvat"].reindex(span).fillna(0.0)
    return pd.DataFrame({"date": span, "revenue": s.to_numpy(), "dow": span.dayofweek})


def main() -> None:
    use_style()
    daily = load_daily()

    fig, axes = plt.subplots(
        3, 2, figsize=(TEXT_WIDTH, 5.9), constrained_layout=True,
        gridspec_kw={"width_ratios": [2.15, 1.0]},
    )

    for row, venue in enumerate(VENUES):
        f = frame_for(daily[daily["venue"] == venue])
        traded = f[f["revenue"] > 0]
        shut = f[f["revenue"] <= 0]

        # The frame is arithmetic and tab:venues states it, so disagreeing with the
        # table is a defect in one of them rather than a matter of rounding.
        if len(f) != FRAME_DAYS[venue]:
            sys.exit(f"STOP: {venue} frame is {len(f)} days against tab:venues' "
                     f"{FRAME_DAYS[venue]}. Reconcile before drawing.")

        # ---------------------------------------------------------------- left panel
        ax = axes[row, 0]
        ax.grid(axis="y", lw=0.4, color=GRID)
        ax.vlines(traded["date"], 0, traded["revenue"], color=BRAND["grey2"], lw=0.55,
                  zorder=2, label="Trading day")
        # Non-trading days go in a rug BELOW the axis rather than as points on it.
        # Drawn at zero they were invisible against the trading spikes' own baseline,
        # which defeats the panel's purpose: the count of these days is what Section
        # 4.4's coverage decomposition turns on, so they have to read as a density.
        top = traded["revenue"].max()
        rug_hi, rug_lo = -0.035 * top, -0.105 * top
        ax.vlines(shut["date"], rug_lo, rug_hi, color=BRAND["ruby"], lw=0.5,
                  zorder=3, label="No takings")

        roll = (pd.Series(f["revenue"].to_numpy(), index=f["date"])
                .rolling("28D").mean())
        ax.plot(roll.index, roll.to_numpy(), color=AXIS, lw=1.15, zorder=4,
                label="28-day mean, all days")

        # The spine stays at the axes edge so the date labels sit BELOW the rug rather
        # than through it; zero is marked by a rule instead. Moving the spine onto the
        # data put the tick labels inside the rug band and made both unreadable.
        ax.set_ylim(bottom=rug_lo * 1.32)
        ax.axhline(0.0, color=GRID, lw=0.5, zorder=1)
        ax.set_ylabel("Daily revenue (£)")
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %y"))
        ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
        panel_label(ax, f"({'ACE'[row]}) {VENUE_LABEL[venue]}")

        # --------------------------------------------------------------- right panel
        ax = axes[row, 1]
        ax.grid(axis="y", lw=0.4, color=GRID)
        med = [traded.loc[traded["dow"] == d, "revenue"].median() for d in range(7)]
        rate = [
            (traded["dow"] == d).sum() / max((f["dow"] == d).sum(), 1)
            for d in range(7)
        ]
        med = [0.0 if pd.isna(m) else m for m in med]
        ax.bar(range(7), med, width=0.68, color=BRAND["grey2"], zorder=2)

        headroom = max(med) if max(med) > 0 else 1.0
        for d, (m, r) in enumerate(zip(med, rate)):
            ax.text(d, m + 0.045 * headroom, f"{r:.0%}", ha="center", va="bottom",
                    fontsize=FS_ANNOT, color=MUTED)
        ax.set_ylim(0, headroom * 1.34)
        ax.set_xticks(range(7))
        ax.set_xticklabels(DOW)
        ax.set_ylabel("Median (£)")
        panel_label(ax, f"({'BDF'[row]})")

        # Quoted by Section 3.2, so it is emitted from the run rather than recalled.
        print(f"{VENUE_LABEL[venue]}: frame {len(f)} d, traded {len(traded)} "
              f"({len(traded) / len(f):.1%}), shut {len(shut)}, "
              f"median trading day £{traded['revenue'].median():,.0f}, "
              f"mean £{traded['revenue'].mean():,.0f}, "
              f"max £{traded['revenue'].max():,.0f}, "
              f"IQR £{traded['revenue'].quantile(.25):,.0f}-"
              f"£{traded['revenue'].quantile(.75):,.0f}, "
              f"skew {traded['revenue'].skew():.2f}")

    axes[-1, 0].set_xlabel("Business date")
    axes[-1, 1].set_xlabel("Day of week")
    handles, labels = axes[0, 0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="outside lower center", ncol=3,
               handletextpad=0.4, columnspacing=1.4, markerscale=2.2)

    save(fig, "fig_estate")


if __name__ == "__main__":
    main()
