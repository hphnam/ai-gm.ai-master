"""G12.16a - re-score the June L2 confront THROUGH the canonical taxonomy map.

Upgrades report 22's raw-string category comparison (which hardcoded the single
Uncategorized -> Uncategorised fix) to a mapped one: every Square category is
resolved by `ingest/taxonomy.map_category`, which fails loudly on an unmapped
category. Reports category coverage and whether the L2 numbers move once names are
aligned through the map.

Reads the held-out L2 actuals and the frozen forecast; writes nothing to the served
store. Run: .venv-forecast/bin/python -m sim.rescore_l2_mapped
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

import config
from ingest.taxonomy import map_category

SIM_DIR = config.BRAIN_DIR / "sim"


def _load_actuals_l2() -> pd.DataFrame:
    raw = json.loads((SIM_DIR / "june2026_actuals_l2_raw.json").read_text())
    return pd.DataFrame(raw["rows"])


def run() -> dict:
    fz = pd.read_parquet(SIM_DIR / "june2026_forecast_frozen.parquet")
    a2 = _load_actuals_l2()
    a2["brain_category"] = a2["category"].map(map_category)  # loud-fail on unmapped

    coverage = {
        "square_categories": sorted(a2["category"].unique()),
        "mapped_net_sales_fraction": round(
            float(a2[a2["brain_category"].notna()]["net_exvat"].sum()
                  / a2["net_exvat"].sum()), 4),
        "dropped_categories": sorted(
            a2[a2["brain_category"].isna()]["category"].unique()),
    }

    prev = json.loads((SIM_DIR / "june2026_confront_result.json").read_text())
    prev_l2 = prev["stage1"]["l2"]

    out = {"coverage": coverage, "l2": {}}
    for venue in ("beer_hall", "ellel"):
        fz_tot = fz[(fz.venue == venue) & (fz.level == "L2")].groupby("key")["yhat"].sum()
        av = a2[a2.venue == venue].groupby("brain_category")["net_exvat"].sum()
        cats = sorted(set(fz_tot.index) | set(av.index))
        table = [{"category": c, "frozen": round(float(fz_tot.get(c, 0.0)), 0),
                  "actual": round(float(av.get(c, 0.0)), 0)} for c in cats]
        mae = float(np.mean([abs(r["frozen"] - r["actual"]) for r in table]))
        raw_mae = prev_l2[venue]["mae_category_total"]
        out["l2"][venue] = {
            "mae_category_total": round(mae, 0),
            "raw_string_mae_report22": raw_mae,
            "unchanged_by_map": abs(mae - raw_mae) < 0.5,
            "table": table,
        }

    (SIM_DIR / "june2026_l2_mapped_result.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out, indent=2))
    return out


if __name__ == "__main__":
    run()
