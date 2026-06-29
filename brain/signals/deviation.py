"""Point-deviation signal — the per-day primitive (PRJ93 point-deviation spec).

Flags when a SINGLE trading day falls outside its 90% conformal band, with
direction, severity, and a coincident reason. Point deviation is the primitive;
change-point (`signals.change_point`) is the higher-order signal that accumulates
the *same* per-day evidence into a *sustained* shift. Both import the shared
foundation (`signals.residual`); neither imports the other.

    z_t = (actual_t − DOW-median_t) / conformal half-band@CP_LEVEL
    |z| ≤ DEV_BAND_K → normal ;  |z| > DEV_BAND_K → deviation (|z| > DEV_SEVERE_K → high)

The stream is leakage-free (expanding one-step-ahead), trading days only — so a
booking-driven venue's structural-zero days never raise a false deviation.

Run:
    python -m signals.deviation
"""

from __future__ import annotations

import sys

import pandas as pd

from config import (
    CP_LEVEL,
    DEV_BAND_K,
    DEV_SCAN_WINDOW,
    DEV_SEVERE_K,
    STORE_DIR,
    VENUE_LABELS,
    VENUES_FOR_DEVIATION,
)
from signals.residual import attribute, build_residual_stream

RESULTS_MD = STORE_DIR.parent / "eval" / "deviation_eval.md"


# --- Classification ----------------------------------------------------------

def _classify(z: float) -> tuple[str, str, str | None]:
    """(status, direction, severity). Band-multiple rule (FLAG-PD2): deliberately
    distinct from change-point's persistence-aware severity — a point has no run
    length. severity is None for a normal day."""
    direction = "up" if z > 0 else "down"
    if abs(z) <= DEV_BAND_K:
        return "normal", direction, None
    severity = "high" if abs(z) > DEV_SEVERE_K else "medium"
    return "deviation", direction, severity


# --- Per-day check -----------------------------------------------------------

def check_point(venue: str, layer: str = "L1", as_of=None, con=None) -> dict | None:
    """Classify one trading day against its conformal band. `as_of` (YYYY-MM-DD,
    date, or Timestamp) selects a stored trading day; omit it for the latest. The
    stream is leakage-free, so check_point(as_of=d) uses only data before d and is
    unchanged when later dates are appended. Returns None when `as_of` is not a
    trading day in the stream (closed / non-trading / beyond data) or history is
    too short."""
    stream = build_residual_stream(venue, con=con)
    if stream.empty:
        return None

    if as_of is None:
        row = stream.iloc[-1]
    else:
        target = pd.Timestamp(as_of).normalize()
        match = stream[stream["date"].dt.normalize() == target]
        if match.empty:
            return None
        row = match.iloc[-1]

    z = float(row["z"])
    status, direction, severity = _classify(z)
    date = pd.Timestamp(row["date"]).date().isoformat()
    expected, scale = float(row["expected"]), float(row["scale"])
    return {
        "venue": venue, "layer": layer, "date": date,
        "status": status, "direction": direction, "severity": severity,
        "actual": round(float(row["actual"]), 2), "expected": round(expected, 2),
        "band_low": round(expected - scale, 2), "band_high": round(expected + scale, 2),
        "z": round(z, 2),
        "reason": attribute(venue, pd.Timestamp(row["date"]), direction, layer, con=con)
        if status == "deviation" else [],
    }


# --- Recent-window feed (the bridge into change-point) -----------------------

def scan(venue: str, layer: str = "L1", window: int = DEV_SCAN_WINDOW, con=None) -> pd.DataFrame:
    """Last `window` trading days, classified. A run of `"deviation"` days here is
    exactly what the change-point persistence detector escalates."""
    stream = build_residual_stream(venue, con=con)
    if stream.empty:
        return pd.DataFrame(
            columns=["date", "actual", "expected", "z", "status", "direction", "severity"])
    tail = stream.tail(window).copy()
    cls = tail["z"].apply(_classify)
    tail["status"] = [c[0] for c in cls]
    tail["direction"] = [c[1] for c in cls]
    tail["severity"] = [c[2] for c in cls]
    tail["date"] = tail["date"].dt.date
    tail["actual"] = tail["actual"].round(2)
    tail["expected"] = tail["expected"].round(2)
    tail["z"] = tail["z"].round(2)
    return tail[["date", "actual", "expected", "z", "status", "direction",
                 "severity"]].reset_index(drop=True)


# --- Agent-renderable card ---------------------------------------------------

def card(result: dict) -> dict:
    """Compact summary for the agent. A normal day is a quiet 'within normal
    range' card with no reason list."""
    venue_label = VENUE_LABELS.get(result["venue"], result["venue"])
    if result["status"] == "normal":
        return {
            "venue": result["venue"], "date": result["date"], "status": "normal",
            "headline": f"{venue_label} — within normal range",
            "z": result["z"], "band": [result["band_low"], result["band_high"]],
            "actual": result["actual"],
        }
    arrow = "above" if result["direction"] == "up" else "below"
    return {
        "venue": result["venue"], "date": result["date"], "status": "deviation",
        "severity": result["severity"], "direction": result["direction"],
        "headline": f"{venue_label} — {result['actual']} is {arrow} the band "
                    f"({result['band_low']}–{result['band_high']})",
        "z": result["z"], "band": [result["band_low"], result["band_high"]],
        "actual": result["actual"], "reason": result["reason"],
    }


# --- Report + CLI ------------------------------------------------------------

def run() -> dict:
    out = {v: check_point(v) for v in VENUES_FOR_DEVIATION}
    return {"latest": out}


def _write_report(out: dict) -> None:
    lines = [
        "# Point deviation — per-day band check\n",
        "Per-day classification on the shared standardised conformal residual "
        f"stream `z = (actual − DOW-median) / conformal half-band@{int(CP_LEVEL * 100)}%` "
        f"(`|z| > {DEV_BAND_K:g}` → deviation, `|z| > {DEV_SEVERE_K:g}` → high). The "
        "same `signals.residual` foundation that `signals.change_point` accumulates "
        "into sustained shifts — point deviation is the primitive, change-point the "
        "higher-order signal; neither imports the other.\n",
        "## Latest trading day per venue",
        "| Venue | Date | Status | Dir | z | Actual | Band | Reason (top) |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for v in VENUES_FOR_DEVIATION:
        r = out["latest"][v]
        label = VENUE_LABELS.get(v, v)
        if r is None:
            lines.append(f"| {label} | — | no trading-day data | | | | | |")
            continue
        reason = r["reason"][0] if r["reason"] else "—"
        lines.append(
            f"| {label} | {r['date']} | {r['status']} | "
            f"{r['direction'] if r['status'] == 'deviation' else '—'} | {r['z']:+.2f} | "
            f"{r['actual']} | {r['band_low']}–{r['band_high']} | {reason} |")
    lines.append(
        "\nTrading days only (the shared stream excludes structural-zero days), so "
        "Ellel fires only on genuine booking days (FLAG-PD1). Attribution is "
        "correlational ('coincides with', never 'caused by' — FLAG-PD3). Sustained "
        "shifts are reported separately by `signals.change_point`.")
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    print("Point deviation · per-day band check")
    out = run()
    for v in VENUES_FOR_DEVIATION:
        r = out["latest"][v]
        label = VENUE_LABELS.get(v, v)
        if r is None:
            print(f"  {label:18s}: no trading-day data")
            continue
        tag = r["status"] if r["status"] == "normal" else f"{r['status']} {r['direction']}/{r['severity']}"
        print(f"  {label:18s}: {r['date']} z={r['z']:+.2f} [{tag}]")
    _write_report(out)
    print(f"  report            : {RESULTS_MD}")
    ok = all(v in out["latest"] for v in VENUES_FOR_DEVIATION)
    print(f"DEVIATION RESULT: {'PASS' if ok else 'FAIL'} "
          f"(per-day primitive; nothing in the ladder changed)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
