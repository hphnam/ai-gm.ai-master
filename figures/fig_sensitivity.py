"""F6 `fig:sensitivity` -- detection performance is a dose-response, not a scalar.

The chapter's answer to "does detection perform well enough to justify surfacing"
currently rests on one VUS-PR figure per cell. A single scalar cannot express the
operating point an operator cares about: the deviation magnitude at which the catch
rate becomes usable. This plots catch rate against injected magnitude with Wilson
intervals as bands, one line per event kind, faceted by venue.

Rejected: a line plot of the cost sweep over the miss-to-false-alarm ratio. The sweep
is degenerate -- misses (124) and false alarms (8) are constant across all four ratios
because the detector runs at a fixed threshold, so the "curve" is a linear reweighting
of two constants. Drawing it would dress an arithmetic identity as a result.

Grounding: Bhattacharya et al. (2024) Figs. 5-6 for faceted detection performance under
sparse positives; Siffer et al. (2017) Fig. 7 for printing the swept parameter at each
point.

Source: brain/eval/agent_eval.json `detection.sensitivity` (R3, .venv-eval with TSB-AD).
"""

from __future__ import annotations

import matplotlib.pyplot as plt

from _style import (OKABE_ITO, TEXT_WIDTH, VENUE_LABEL, VENUES, assert_estate,
                    load, panel_label, save, use_style)

KIND_STYLE = {
    "spike": (OKABE_ITO["vermillion"], "o", "Spike"),
    "regime_shift": (OKABE_ITO["blue"], "s", "Regime shift"),
    "exo_coincident": (OKABE_ITO["green"], "^", "Exogenous-coincident"),
    "stock_drawdown": (OKABE_ITO["purple"], "D", "Stock drawdown"),
}


def main() -> None:
    use_style()
    data = load("eval/agent_eval.json")
    sensitivity = data["detection"]["sensitivity"]

    venues_present = {v for kind in sensitivity.values() for v in kind}
    assert_estate(venues_present)

    fig, axes = plt.subplots(1, 3, figsize=(TEXT_WIDTH, 2.6), constrained_layout=True,
                             sharey=True)

    for ax, venue, tag in zip(axes, VENUES, "ABC"):
        drawn = False
        endpoints = []  # (rate, colour, n) for the right-margin n labels, dodged below
        for kind, (colour, marker, _) in KIND_STYLE.items():
            points = sensitivity.get(kind, {}).get(venue)
            if not points:
                continue
            drawn = True
            points = sorted(points, key=lambda p: p["mag"])
            mags = [p["mag"] for p in points]
            rates = [p["rate"] for p in points]
            lo = [p["ci"][0] for p in points]
            hi = [p["ci"][1] for p in points]
            ax.fill_between(mags, lo, hi, color=colour, alpha=0.14, lw=0, zorder=1)
            ax.plot(mags, rates, color=colour, marker=marker, ms=3.4, lw=1.1, zorder=3)
            endpoints.append((rates[-1], colour, points[0]["n"]))

        if not drawn:
            ax.text(0.5, 0.5, "no injections", transform=ax.transAxes,
                    ha="center", va="center", fontsize=7, color="0.45")

        # n is constant across magnitudes within a cell by construction of the injection
        # grid, so it is printed once per series. Curves that saturate together would
        # collide at the right margin, so identical endpoints are dodged apart.
        for rank, (rate, colour, n) in enumerate(sorted(endpoints, reverse=True)):
            ax.annotate(f"n={n}", (1.0, rate), xycoords=("axes fraction", "data"),
                        textcoords="offset points", xytext=(3, 3.5 - 6.5 * rank),
                        fontsize=5.8, color=colour, va="center", annotation_clip=False)

        ax.set_ylim(-0.04, 1.12)
        # Log spacing separates 1, 1.25 and 1.5, which crowd into one tick on a linear
        # axis, and it is the natural scale for a dose-response over a multiplicative range.
        ax.set_xscale("log")
        ax.set_xlim(0.92, 4.4)
        ax.set_xticks([1, 1.25, 1.5, 2, 3, 4])
        ax.set_xticklabels(["1", "1.25", "1.5", "2", "3", "4"])
        ax.minorticks_off()
        ax.set_xlabel("Injected magnitude (z)")
        panel_label(ax, f"({tag}) {VENUE_LABEL[venue]}")

    axes[0].set_ylabel("Catch rate")

    handles = [plt.Line2D([], [], color=c, marker=m, ms=3.4, label=lab)
               for c, m, lab in KIND_STYLE.values()]
    fig.legend(handles=handles, loc="outside lower center", ncol=4,
               handletextpad=0.3, columnspacing=1.1)

    save(fig, "fig_sensitivity")


if __name__ == "__main__":
    main()
