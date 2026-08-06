"""D-U6 - identify the exchangeability violation behind the Beer Hall under-coverage.

`sec:res-undercoverage` establishes that the served Mondrian band covers 0.871 against a
nominal 0.900 at the Beer Hall, that the shortfall is about 3.6 standard errors, that it
holds at every horizon step, and that it reproduces on a second point forecaster. Split
conformal cannot under-cover under exchangeability, so exchangeability is violated. Which
violation was never identified, and that is the whole of D-U6.

The band's calibration pool is EXPANDING (`interval_calibration.run_online` admits every
residual whose target date the origin has already observed), so the quantile at any origin is
estimated over the venue's whole past. That construction has one specific failure mode: if the
residual scale drifts upward with time, the quantile is held down by older and smaller
residuals and the band is systematically too narrow for the present.

Two measurements, and the second is the one that decides it.

  scale drift   Spearman correlation of |residual| against target date, plus the mean and the
                90th percentile by time quartile. Establishes whether the scale moves and in
                which direction.

  rank uniformity  For every banded observation, the rank of its |residual| inside the pool
                that was actually available when it was banded, within its own Mondrian state
                group. Under exchangeability that rank is Uniform(0,1) by construction, so the
                fraction exceeding the 0.90 quantile is 0.10 and the mean rank is 0.5.
                Departures here ARE the miscoverage, measured on the same objects the band is
                built from rather than inferred from the coverage number.

Run at all three venues rather than at the Beer Hall alone. The estate supplies its own
control: Two River Taps OVER-covers and Ellel sits at nominal, so a drift mechanism has to
predict three different signs from one story or it is a story fitted to one venue.

Reads the committed store through the same loader the calibration study uses and fits the same
point model; no band is re-fitted and no reported figure is restated.

Run:
    .venv-forecast/bin/python -m eval.exchangeability_diagnostic
"""

from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd
from scipy import stats

import config
import provenance
from conformal.methods import HORIZON
from eval import interval_calibration as ic
from store.warehouse import assert_store_ceiling

OUT_PATH = config.BRAIN_DIR / "eval" / "exchangeability_diagnostic.json"
LEVEL = ic.PRIMARY_LEVEL
VENUES = ic.VENUES


def _scale_drift(records: pd.DataFrame) -> dict:
    """Does the residual scale move with time, and which way."""
    active = records[records["state"] == 0].sort_values("target")
    t = active["target"].map(pd.Timestamp.toordinal).to_numpy(float)
    r = active["res"].to_numpy(float)
    rho, p = stats.spearmanr(t, r)
    q = pd.qcut(active["target"].rank(method="first"), 4, labels=False)
    return {
        "n_active_pairs": int(len(active)),
        "spearman_rho": float(rho),
        "spearman_p": float(p),
        "by_time_quartile": [
            {"quartile": int(i) + 1,
             "first_target": str(active["target"][q == i].min().date()),
             "last_target": str(active["target"][q == i].max().date()),
             "mean_abs_residual": float(r[q.to_numpy() == i].mean()),
             "p90_abs_residual": float(np.percentile(r[q.to_numpy() == i], 90))}
            for i in range(4)
        ],
    }


def _rank_uniformity(records: pd.DataFrame) -> dict:
    """Rank of each banded residual inside the pool that banded it.

    Reproduces the pool admission rule of `interval_calibration.run_online` exactly: a
    residual joins once its target date is observed by the origin, and the Mondrian band
    takes its quantile within the state group. Uniform under exchangeability.
    """
    res_by_target: dict = {}
    for _, r in records.iterrows():
        res_by_target.setdefault(r["target"], []).append(
            (float(r["res"]), int(r["state"])))
    by_origin = {o: g.sort_values("step") for o, g in records.groupby("origin")}

    pool_res: list[float] = []
    pool_state: list[int] = []
    sorted_targets = sorted(res_by_target)
    tptr = 0
    ranks: list[float] = []
    states: list[int] = []
    steps: list[int] = []

    for t in sorted(by_origin):
        while tptr < len(sorted_targets) and sorted_targets[tptr] <= t:
            for rs, stt in res_by_target[sorted_targets[tptr]]:
                pool_res.append(rs)
                pool_state.append(stt)
            tptr += 1
        if len(pool_res) < ic.WARMUP_POOL:
            continue
        pr = np.asarray(pool_res)
        pst = np.asarray(pool_state)
        g = by_origin[t]
        for _, row in g.iterrows():
            s = int(row["state"])
            grp = pr[pst == s]
            if grp.size == 0:
                grp = pr
            # Mid-rank, so exact ties (structural-closure zeros) do not bias the fraction
            # in either direction.
            below = float((grp < row["res"]).sum())
            equal = float((grp == row["res"]).sum())
            ranks.append((below + 0.5 * equal) / grp.size)
            states.append(s)
            steps.append(int(row["step"]))

    a = np.asarray(ranks)
    st = np.asarray(states)
    active = a[st == 0]
    return {
        "n_banded": int(a.size),
        "mean_rank": float(a.mean()),
        "frac_above_nominal_quantile": float((a > LEVEL).mean()),
        "active_only": {
            "n": int(active.size),
            "mean_rank": float(active.mean()),
            "frac_above_nominal_quantile": float((active > LEVEL).mean()),
        },
        "per_step_frac_above": {
            str(h): float((a[np.asarray(steps) == h] > LEVEL).mean())
            for h in range(1, HORIZON + 1)
        },
    }


def venue_report(venue: str) -> dict:
    records = ic.generate_records(venue)
    return {
        "venue": venue,
        "point_model": ic.default_model(venue),
        "n_origins": int(records["origin"].nunique()),
        "scale_drift": _scale_drift(records),
        "rank_uniformity": _rank_uniformity(records),
    }


def main(argv: list[str]) -> int:
    ceiling = assert_store_ceiling()
    artefact = {
        "artefact": "exchangeability_diagnostic",
        "store_ceiling": str(ceiling),
        "level": LEVEL,
        "warmup_pool": ic.WARMUP_POOL,
        "provenance": provenance.runtime_stamp(),
        "venues": {},
    }
    for venue in (argv[1:] or list(VENUES)):
        rep = venue_report(venue)
        artefact["venues"][venue] = rep
        d = rep["scale_drift"]
        u = rep["rank_uniformity"]
        print(f"\n=== {venue} ===")
        print(f"  scale drift   rho={d['spearman_rho']:+.3f} p={d['spearman_p']:.2e}")
        for q in d["by_time_quartile"]:
            print(f"    Q{q['quartile']} {q['first_target']}..{q['last_target']}  "
                  f"mean={q['mean_abs_residual']:8.2f}  p90={q['p90_abs_residual']:8.2f}")
        print(f"  rank uniform  mean={u['mean_rank']:.3f} (0.500 under exchangeability)  "
              f"frac>q90={u['frac_above_nominal_quantile']:.3f} (0.100 expected)")

    OUT_PATH.write_text(json.dumps(artefact, indent=2, allow_nan=False) + "\n")
    print(f"\nwrote {OUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
