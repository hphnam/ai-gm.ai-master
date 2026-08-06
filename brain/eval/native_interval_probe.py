"""Do this estate's Chronos arms reproduce the published overconfidence of Chronos-Bolt?

`kaas_probabilistic_2026` evaluates Chronos-Bolt, Chronos-2 and TabPFN-TS on 200 real
low-voltage feeders and reports empirical coverage beside interval width at a nominal 90
per cent. Chronos-Bolt returns the narrowest interval of every model in that study, 8.652
kW, and covers 0.6211. Chronos-2 covers 0.8975 at 16.33. That is a claim about a model
this estate also serves, made on a different domain, at a different scale, in a different
country, and it is testable here at no cost beyond inference: both arms already call
`predict_quantiles` and discard everything but the 0.5 row.

The test is a replication, so nothing about it is tuned. Same rolling origins, same
horizon, same minimum training window and same step as `eval.interval_calibration`, so
the pairs are the ones the committed conformal work is built on. The only change is that
the 0.05/0.1/0.9/0.95 rows are kept instead of thrown away.

Two levels are reported. The estate's own conformal work runs at 0.80 and 0.90
(`config.CONFORMAL_LEVELS`), and 0.90 is the like-for-like against the published figure.

NOTE the lower limb is clipped at zero, matching `conformal.methods.mondrian_band` and the
point path. Takings cannot be negative, so an unclipped limb would flatter coverage on a
metric nobody would deploy. The clip can only RAISE measured coverage, so it is
conservative with respect to the overconfidence this probe is looking for.

These are the models' NATIVE intervals. No conformal band is fitted, none is re-fitted,
and no served artefact changes.

Run:
    .venv-forecast/bin/python -m eval.native_interval_probe
"""

from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd

import config
import provenance
from conformal.methods import HORIZON, interval_pinball
from eval import harness
from eval.interval_calibration import MIN_TRAIN_DAYS, VENUES, clopper_pearson
from models.ladder import _load_feats
from store.warehouse import assert_store_ceiling

OUT_PATH = config.BRAIN_DIR / "eval" / "native_interval_probe.json"
LEVELS = tuple(config.CONFORMAL_LEVELS)
QUANTILES = [0.05, 0.1, 0.5, 0.9, 0.95]
LIMB = {0.80: (1, 3), 0.90: (0, 4)}          # index into QUANTILES per level
ARMS = ("rung4_chronos_bolt", "rung4_chronos2")

# Chronos-Bolt is trained on the deciles 0.1 ... 0.9 ONLY. Asking it for 0.05/0.95
# does not fail; the pipeline clamps to the nearest trained level and warns, so a
# nominal 90 per cent request silently returns the 80 per cent interval. Verified
# here (the two limbs come back numerically identical). Chronos-2 answers 0.05/0.95
# natively, verified the same way. So the 0.90 row is unavailable for Bolt rather
# than merely bad, and reporting it as a coverage failure would be measuring the
# clamp instead of the model.
NATIVE_LEVELS = {"rung4_chronos_bolt": (0.80,), "rung4_chronos2": (0.80, 0.90)}


def _bolt_quantiles(train: pd.DataFrame, n: int) -> np.ndarray:
    import torch
    from models.foundation import _pipeline
    series = torch.tensor(train["value"].to_numpy(), dtype=torch.float32)
    q, _mean = _pipeline().predict_quantiles(
        inputs=series, prediction_length=n, quantile_levels=QUANTILES)
    return np.asarray(q[0], dtype=float)                       # [H, n_levels]


def _chronos2_quantiles(train: pd.DataFrame, n: int) -> np.ndarray:
    import torch
    from models.foundation import _chronos2_base_pipeline
    series = torch.tensor(train["value"].to_numpy(), dtype=torch.float32)
    q, _mean = _chronos2_base_pipeline().predict_quantiles(
        inputs=[series], prediction_length=n, quantile_levels=QUANTILES)
    return np.asarray(q[0][0], dtype=float)                    # [H, n_levels]


_QUANTILE_FN = {"rung4_chronos_bolt": _bolt_quantiles,
                "rung4_chronos2": _chronos2_quantiles}


def _collect(venue: str, arm: str) -> pd.DataFrame:
    """One row per (origin, step) carrying the actual and every requested quantile."""
    feats = _load_feats(venue)
    fn = _QUANTILE_FN[arm]
    rows = []
    for tr, te in harness.rolling_origin(
            feats, n_folds=None, horizon_days=HORIZON,
            min_train_days=MIN_TRAIN_DAYS, step_days=1):
        te = te.reset_index(drop=True)
        qs = fn(tr, len(te))
        for h, (_, r) in enumerate(te.iterrows()):
            row = {"origin": tr["date"].max(), "step": h + 1,
                   "target": r["date"], "y": float(r["value"])}
            for j, lvl in enumerate(QUANTILES):
                row[f"q{lvl}"] = float(qs[h, j])
            rows.append(row)
    return pd.DataFrame(rows)


def _score(df: pd.DataFrame, level: float) -> dict:
    lo_i, hi_i = LIMB[level]
    lo = np.clip(df[f"q{QUANTILES[lo_i]}"].to_numpy(float), 0.0, None)
    hi = df[f"q{QUANTILES[hi_i]}"].to_numpy(float)
    # A crossed pair would make width meaningless; order them rather than hide it.
    crossed = int((hi < lo).sum())
    hi = np.maximum(hi, lo)
    y = df["y"].to_numpy(float)
    inside = (y >= lo) & (y <= hi)
    n = int(len(df))
    k = int(inside.sum())
    cp_lo, cp_hi = clopper_pearson(k, n)
    return {
        "n": n,
        "coverage": k / n if n else float("nan"),
        "coverage_ci": [cp_lo, cp_hi],
        "mean_width": float((hi - lo).mean()),
        "median_width": float(np.median(hi - lo)),
        "interval_pinball": float(np.mean(
            [interval_pinball(yi, li, hi_, level) for yi, li, hi_ in zip(y, lo, hi)])),
        "n_crossed_quantiles": crossed,
    }


def venue_report(venue: str) -> dict:
    out = {"venue": venue, "arms": {}}
    for arm in ARMS:
        df = _collect(venue, arm)
        active = df[df["y"] > 0]
        native = NATIVE_LEVELS[arm]
        out["arms"][arm] = {
            "n_origins": int(df["origin"].nunique()),
            "native_levels": list(native),
            "levels": {str(l): _score(df, l) for l in native},
            "active_only": {str(l): _score(active, l) for l in native},
        }
    return out


def main(argv: list[str]) -> int:
    ceiling = assert_store_ceiling()
    artefact = {
        "artefact": "native_interval_probe",
        "store_ceiling": str(ceiling),
        "quantile_levels": QUANTILES,
        "levels": list(LEVELS),
        "lower_limb_clipped_at_zero": True,
        "provenance": provenance.runtime_stamp(),
        "venues": {},
    }
    for venue in (argv[1:] or list(VENUES)):
        rep = venue_report(venue)
        artefact["venues"][venue] = rep
        print(f"\n=== {venue} ===")
        for arm, a in rep["arms"].items():
            print(f"  {arm}  ({a['n_origins']} origins)")
            for lvl in a["native_levels"]:
                s = a["levels"][str(lvl)]
                act = a["active_only"][str(lvl)]
                print(f"    nominal {lvl:.2f}  cov={s['coverage']:.4f} "
                      f"[{s['coverage_ci'][0]:.3f}, {s['coverage_ci'][1]:.3f}]  "
                      f"width={s['mean_width']:8.1f}  pinball={s['interval_pinball']:7.2f}  "
                      f"n={s['n']}   active cov={act['coverage']:.4f} "
                      f"width={act['mean_width']:.1f}")
            if 0.90 not in a["native_levels"]:
                print("    nominal 0.90  UNAVAILABLE - model trained on deciles only, "
                      "0.05/0.95 clamps to 0.1/0.9")
            if any(a["levels"][str(l)]["n_crossed_quantiles"] for l in a["native_levels"]):
                print("    NOTE crossed quantile pairs present, see artefact")

    OUT_PATH.write_text(json.dumps(artefact, indent=2, allow_nan=False) + "\n")
    print(f"\nwrote {OUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
