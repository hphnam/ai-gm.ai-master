"""Render the committed frozen forecast to human-readable Markdown.

Reads ONLY the already-committed artefact (june2026_forecast_frozen.parquet/.json)
and writes june2026_forecast_frozen.md - the reasoned forecast the canonical
G12.13a Stage 4 names. This does NOT regenerate any forecast (that would be
post-hoc after actuals were seen); it renders exactly what was frozen at Pass 1.

Run: .venv-forecast/bin/python -m sim.render_frozen_md
"""

from __future__ import annotations

import json

import pandas as pd

import config

SIM_DIR = config.BRAIN_DIR / "sim"
VLABEL = {"beer_hall": "Beer Hall", "two_river_taps": "Two River Taps",
          "ellel": "Ellel"}


def build() -> None:
    frozen = pd.read_parquet(SIM_DIR / "june2026_forecast_frozen.parquet")
    meta = json.loads((SIM_DIR / "june2026_forecast_frozen.json").read_text())
    reasons = meta["reasons"]
    lines = [
        "# Frozen June 2026 forecast (pre-registered, reasoned)",
        "",
        "Rendered from the committed artefact `june2026_forecast_frozen.parquet`; no",
        "forecast was regenerated. This is the pre-registered prediction, blind to",
        f"June actuals. Created {meta['created_utc']}.",
        "",
        f"L2/L3 method: {meta['l2_l3_method']}.",
        "",
        "## What the brain expects for June, per venue",
        "",
    ]
    expects = {
        "beer_hall": "Beer Hall: elevated on the England fixture dates within trading "
                     "hours (17 Jun v Croatia, 23 Jun v Ghana, 27 Jun v Panama); "
                     "weekends carry the month; Mondays and Tuesdays near-zero "
                     "(structurally closed). Cold 30-day horizon, so magnitudes are "
                     "conservative.",
        "two_river_taps": "Two River Taps: ETS projects continued trade from a "
                          "2026-05-08 ceiling; NO liveness signal, so a closure would "
                          "not be reflected (flagged as the go-live risk).",
        "ellel": "Ellel: sparse event venue; robust-DOW predicts low baseline. "
                 "Private events are unknowable in advance, so any large night will "
                 "be under-forecast by design.",
    }
    for v in config.FORECAST_VENUES:
        lines.append(f"- {expects[v]}")
    lines.append("")

    for v in config.FORECAST_VENUES:
        l1 = frozen[(frozen.venue == v) & (frozen.level == "L1")].copy()
        l1["date"] = pd.to_datetime(l1["date"])
        l1 = l1.sort_values("date")
        model = meta["venues"][v]["model"]
        half = meta["venues"][v]["band_halfwidth"]
        lines += [
            f"## {VLABEL[v]} (L1, model `{model}`, band +/- {half})",
            "",
            "| date | dow | yhat | lo | hi | reason |",
            "|---|---|---|---|---|---|",
        ]
        for _, r in l1.iterrows():
            ds = str(r["date"].date())
            lines.append(
                f"| {ds} | {r['date'].day_name()[:3]} | {r['yhat']:.0f} | "
                f"{r['lo']:.0f} | {r['hi']:.0f} | {reasons[v].get(ds, '')} |")
        lines.append("")
        lines.append(f"June L1 total: GBP {l1['yhat'].sum():,.0f}. Band beyond day 8 is "
                     "extrapolated past its 7-day calibration (uncertain, wider than "
                     "shown).")
        lines.append("")

    (SIM_DIR / "june2026_forecast_frozen.md").write_text("\n".join(lines))
    print(f"wrote {SIM_DIR / 'june2026_forecast_frozen.md'} ({len(lines)} lines)")


if __name__ == "__main__":
    build()
