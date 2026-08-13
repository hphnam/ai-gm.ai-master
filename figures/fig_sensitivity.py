"""F6 `fig:sensitivity` -- detection performance is a dose-response, not a scalar.

The chapter's answer to "does detection perform well enough to justify surfacing"
currently rests on one VUS-PR figure per cell. A single scalar cannot express the
operating point an operator cares about: the deviation magnitude at which the catch
rate becomes usable. This plots catch rate against injected magnitude with Wilson
intervals as bands, one line per event kind swept over the z grid, faceted by venue.
See EXCLUDED_KINDS below for the one kind that is swept over something else.

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

from _style import (BRAND, FS_ANNOT, MUTED, TEXT_WIDTH, VENUE_LABEL, VENUES,
                    assert_estate, load, panel_label, save, use_style)

KIND_STYLE = {
    "spike": (BRAND["ruby"], "o", "Spike"),
    "regime_shift": (BRAND["teal"], "s", "Regime shift"),
    "exo_coincident": (BRAND["gold"], "^", "Exogenous-coincident"),
}

# `stock_drawdown` is absent from KIND_STYLE and therefore from this figure. Its `mag`
# field is not a magnitude: `agent_eval._SCALED_VENUE_KINDS` sweeps that kind over
# `config.EVAL_STOCK_COVER_GRID`, which is DAYS OF COVER (2, 1, 0, -1, -2, commented
# "mildly low -> clearly out"), while every other kind sweeps `EVAL_INJECT_Z_GRID`.
# Three consequences, any one of which disqualifies the series from this axis: the units
# are days rather than standardised residuals; severity DECREASES with x where the z
# kinds increase; and three of the five points are non-positive and undefined on the log
# scale, which is how they reached the PDF at x ~ -16000 pt and failed the formatting
# gate on 2026-08-12. The two survivors at x = 1 and 2 were the worse defect, being
# legible and reading as z. `agent_eval._magbin` keeps the two parameterisations apart
# ("in-cover (doc>0)" against the |z| bins); this figure did not. The result itself --
# caught at every level of cover -- is reported in the text, in days.
EXCLUDED_KINDS = ("stock_drawdown",)


def main() -> None:
    use_style()
    data = load("eval/agent_eval.json")
    sensitivity = data["detection"]["sensitivity"]

    venues_present = {v for kind in sensitivity.values() for v in kind}
    assert_estate(venues_present)

    fig, axes = plt.subplots(1, 3, figsize=(TEXT_WIDTH, 2.95), constrained_layout=True,
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
            # A non-positive x is undefined on the log scale set below, and matplotlib
            # parks it at about x = -16000 pt rather than dropping it -- ink far outside
            # the canvas, invisible behind the \includegraphics BBox and fatal to the
            # formatting gate. It is arithmetic, so it is asserted here per the rule that
            # geometry a generator can check is not left to a render.
            assert min(mags) > 0, f"{kind}/{venue}: x<=0 is undefined on a log axis"
            ax.fill_between(mags, lo, hi, color=colour, alpha=0.14, lw=0, zorder=1)
            ax.plot(mags, rates, color=colour, marker=marker, ms=3.4, lw=1.1, zorder=3)
            endpoints.append((rates[-1], colour, points[0]["n"]))

        if not drawn:
            ax.text(0.5, 0.5, "no injections", transform=ax.transAxes,
                    ha="center", va="center", fontsize=FS_ANNOT, color=MUTED)

        # n is constant across magnitudes within a cell by construction of the injection
        # grid, so it is printed once per series. Curves that saturate together would
        # collide at the right margin, so identical endpoints are dodged apart.
        for rank, (rate, colour, n) in enumerate(sorted(endpoints, reverse=True)):
            ax.annotate(f"n={n}", (1.0, rate), xycoords=("axes fraction", "data"),
                        textcoords="offset points", xytext=(3, 3.5 - 6.5 * rank),
                        fontsize=FS_ANNOT, color=colour, va="center", annotation_clip=False)

        ax.set_ylim(-0.04, 1.12)
        # Log spacing separates 1, 1.25 and 1.5, which crowd into one tick on a linear
        # axis, and it is the natural scale for a dose-response over a multiplicative range.
        ax.set_xscale("log")
        ax.set_xlim(0.92, 4.4)
        ax.set_xticks([1, 1.25, 1.5, 2, 3, 4])
        # Rotated rather than thinned. The magnitudes are unevenly spaced on a linear
        # axis, so 1 / 1.25 / 1.5 crowd the left fifth and printed as "11.2555 2";
        # dropping labels would hide which magnitudes were actually sampled.
        ax.set_xticklabels(["1", "1.25", "1.5", "2", "3", "4"],
                           rotation=45, ha="right", rotation_mode="anchor")
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
