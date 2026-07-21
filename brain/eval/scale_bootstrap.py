"""S4 Part 2 - the scale basis decision, settled by bootstrap.

S1 established four candidate seasonal-naive scale bases; `calendar_lag7_active` is the
most defensible in principle (it drops closed-day pairs) but S2 found it rests on 276 of
392 lag pairs at Beer Hall and only 28 of 385 at Ellel. Argument cannot settle which
basis to trust at a venue whose cleanest denominator is estimated from 28 numbers. A
bootstrap can.

For each venue and each basis this resamples the absolute lag-difference vector - the
numbers averaged into the denominator - with replacement (B = 10000), and reports the
point scale, a 95% percentile interval, and the interval width as a percentage of the
point. It then propagates that denominator uncertainty into the venue's most recent
confrontation MASE, holding the MAE numerator fixed, so the MASE carries the interval its
own scale earns.

The ruler is pinned with `as_of` to the store ceiling the most recent confrontation was
scored against (2026-07-07): a backtest denominator uses the full training history in the
store, not the forecast cutoff, so this reproduces that confrontation's published
denominators and MASE exactly (the S1/S3 `(basis, as_of)` principle).

Run:
    .venv-forecast/bin/python -m eval.scale_bootstrap
"""

from __future__ import annotations

import json
import sys

import numpy as np

import config
from eval import harness

B = 10000
SEED = config.EVAL_SCALED_SEED  # 93
CI = (2.5, 97.5)
# The store ceiling the most recent confrontation (July W2, origin A) was scored against:
# the denominator uses the full training history, not the forecast cutoff, so pinning here
# reproduces that confrontation's published scales and MASE exactly.
AS_OF = "2026-07-07"
# Most recent confrontation MAE per venue (July W2 origin A, sim/july2026_w2_confront_rescored.json).
# Two River Taps is dormant there (closed 2026-05-08), so it has no recent confrontation.
CONFRONT_MAE = {"beer_hall": 180.3, "ellel": 74.0, "two_river_taps": None}


def _diffs(ruler: harness.VenueRuler, basis: str) -> np.ndarray:
    """The absolute lag-difference vector a basis averages into its scale."""
    series = ruler.series_for(basis)
    n_cal = ruler.n_calendar_days if basis == "trading_same_weekday" else None
    later, earlier, _ = harness._scale_pairs(series, basis=basis, n_calendar_days=n_cal)
    return np.abs(later - earlier)


def bootstrap_scale(diffs: np.ndarray, *, n_boot: int = B, seed: int = SEED) -> dict:
    """Point scale, 95% percentile interval, and width as a percent of the point.

    iid resample of the difference vector with replacement: the scale is the mean of
    those numbers, and this is the sampling distribution of that mean. (Unlike the S3
    MCS, there is no serial-correlation correction to make here - we are estimating one
    denominator, not comparing overlapping fold losses.)
    """
    d = np.asarray(diffs, dtype=float)
    n = d.size
    point = float(d.mean()) if n else float("nan")
    if n < 2 or not np.isfinite(point) or point == 0.0:
        return {"n_pairs": int(n), "point": point, "lo": float("nan"),
                "hi": float("nan"), "width_pct": float("nan")}
    rng = np.random.default_rng(seed)
    means = d[rng.integers(0, n, size=(n_boot, n))].mean(axis=1)
    lo, hi = (float(x) for x in np.percentile(means, CI))
    width_pct = 100.0 * (hi - lo) / point
    return {"n_pairs": int(n), "point": point, "lo": lo, "hi": hi,
            "width_pct": float(width_pct)}


def _induced_mase(mae: float, scale: dict) -> dict:
    """The MASE interval induced by scale uncertainty alone (MAE numerator fixed)."""
    if mae is None or not np.isfinite(scale["point"]) or scale["point"] == 0.0:
        return {}
    point = mae / scale["point"]
    hi_mase = mae / scale["lo"] if scale["lo"] else float("nan")  # small scale -> big MASE
    lo_mase = mae / scale["hi"] if scale["hi"] else float("nan")
    width_pct = (100.0 * (hi_mase - lo_mase) / point
                 if np.isfinite(hi_mase) and np.isfinite(lo_mase) else float("nan"))
    return {"mae": mae, "mase_point": round(point, 3),
            "mase_lo": round(lo_mase, 3), "mase_hi": round(hi_mase, 3),
            "width_pct": round(width_pct, 1)}


def run_venue(venue: str) -> dict:
    ruler = harness.venue_ruler(venue, as_of=AS_OF)
    mae = CONFRONT_MAE.get(venue)
    out = {"venue": venue, "as_of": AS_OF,
           "n_trading_days": ruler.n_trading_days,
           "n_calendar_days": ruler.n_calendar_days,
           "trading_days_per_week": round(ruler.trading_days_per_week, 2),
           "confront_mae": mae, "bases": {}}
    for basis in harness.SCALE_BASES:
        raw = bootstrap_scale(_diffs(ruler, basis))
        entry = {"scale": {**raw}}
        if mae is not None:
            entry["induced_mase"] = _induced_mase(mae, raw)
        # Round for the artefact only after the induced MASE has used full precision.
        s = entry["scale"]
        s["point"] = round(s["point"], 1) if np.isfinite(s["point"]) else s["point"]
        for k in ("lo", "hi", "width_pct"):
            s[k] = round(s[k], 1) if np.isfinite(s[k]) else s[k]
        out["bases"][basis] = entry
    return out


def main(argv: list[str]) -> int:
    from store.warehouse import assert_store_ceiling

    ceiling = assert_store_ceiling()
    venues = argv[1:] or list(config.FORECAST_VENUES)
    artefact = {"artefact": "scale_bootstrap_L1", "store_ceiling": ceiling,
                "as_of": AS_OF, "B": B, "seed": SEED,
                "resampling": "iid bootstrap of the absolute lag-difference vector",
                "venues": {}}
    for venue in venues:
        rep = run_venue(venue)
        artefact["venues"][venue] = rep
        print(f"\n=== {venue} (as_of {AS_OF}, {rep['trading_days_per_week']} trading days/week) ===")
        for basis, e in rep["bases"].items():
            s = e["scale"]
            line = (f"  {basis:22s} scale={s['point']:>8} "
                    f"95% [{s['lo']}, {s['hi']}] width={s['width_pct']}% (n={s['n_pairs']})")
            if "induced_mase" in e and e["induced_mase"]:
                m = e["induced_mase"]
                line += f"  MASE={m['mase_point']} [{m['mase_lo']}, {m['mase_hi']}] w={m['width_pct']}%"
            print(line)
    path = config.BRAIN_DIR / "eval" / "scale_bootstrap_L1.json"
    path.write_text(json.dumps(artefact, indent=2, allow_nan=False) + "\n")
    print(f"\nwrote {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
