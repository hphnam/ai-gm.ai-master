"""G12.15b - measured June uplift by fixture class (England / Scotland / other).

Empirical, on the already-seen June actuals (no pre-registration concern): does the
observed actual-vs-DOW-median uplift differ between England, Scotland, and other
(non-home-nation) in-trading-hours matches. Reports per-date figures and which flag
(england-only / home-nation / any-match) best explains the uplift, with the
one-June power caveat (3 England, 2 Scotland dates).

Run: .venv-forecast/bin/python -m sim.homenation_uplift
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

import config
from ingest.world_cup import world_cup_features
from store.warehouse import connect, read_series

SIM_DIR = config.BRAIN_DIR / "sim"
JUNE = pd.date_range("2026-06-01", "2026-06-30", freq="D")


def _actuals(venue: str) -> pd.Series:
    raw = json.loads((SIM_DIR / "june2026_actuals_l1_raw.json").read_text())["rows"]
    df = pd.DataFrame([r for r in raw if r["venue"] == venue])
    if df.empty:
        return pd.Series(0.0, index=JUNE)
    df["date"] = pd.to_datetime(df["date"])
    return df.set_index("date")["net_exvat"].reindex(JUNE, fill_value=0.0)


def _classify(row) -> str:
    if not row["wc_match_in_hours"]:
        return "no_match"
    if row["wc_england_in_hours"]:
        return "england"
    if row["wc_scotland_in_hours"]:
        return "scotland"
    return "other_match"


def run() -> dict:
    result = {}
    for venue in ("beer_hall", "ellel"):
        actual = _actuals(venue)
        wc = world_cup_features(venue, JUNE).set_index("date")
        con = connect(read_only=True)
        try:
            hist = read_series(venue, "L1", fill_calendar=True, con=con)
        finally:
            con.close()
        dow_med = hist.groupby(hist["date"].dt.dayofweek)["value"].median()

        rows = []
        for d in JUNE:
            a = float(actual.get(d, 0.0))
            exp = float(dow_med.get(d.dayofweek, np.nan))
            uplift = (a - exp) / exp * 100 if exp and exp > 0 else np.nan
            rows.append({"date": str(d.date()), "dow": d.day_name()[:3],
                         "klass": _classify(wc.loc[d]), "actual": round(a, 0),
                         "dow_median": round(exp, 0) if np.isfinite(exp) else None,
                         "uplift_pct": round(uplift, 0) if np.isfinite(uplift) else None})
        df = pd.DataFrame(rows)
        # Group mean uplift over trading days (exclude days with no baseline).
        valid = df[df["uplift_pct"].notna()]
        by_class = {k: round(float(g["uplift_pct"].mean()), 0)
                    for k, g in valid.groupby("klass")}
        match_days = df[df["klass"].isin(["england", "scotland", "other_match"])]
        # NaN -> None so the eval JSON is valid JSON (no bare NaN token).
        detail = match_days.astype(object).where(pd.notna(match_days), None)
        result[venue] = {
            "mean_uplift_pct_by_class": by_class,
            "n_by_class": {k: int((df["klass"] == k).sum())
                           for k in ("england", "scotland", "other_match", "no_match")},
            "match_day_detail": detail.to_dict("records"),
        }
        print(f"\n=== {venue} ===")
        print(match_days[["date", "dow", "klass", "actual", "dow_median",
                          "uplift_pct"]].to_string(index=False))
        print("mean uplift % by class:", by_class)

    (SIM_DIR / "june2026_homenation_uplift.json").write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    run()
