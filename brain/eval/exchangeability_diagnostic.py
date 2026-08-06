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
from conformal.methods import HORIZON, mondrian_band
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


def _level_coupling(records: pd.DataFrame) -> dict:
    """Is the drift a scale effect riding on the level of trade?

    The first pass established that the residual scale moves. It did not say why, and
    growth in trade was named as the obvious untested candidate. The test is a
    comparison rather than an assertion: deflate each absolute residual by a trailing
    level of the series and re-run the identical drift statistic on the result. If the
    absolute residual drifts and the DEFLATED one does not, the drift is a scale effect
    riding on the level. If both drift, something else is moving as well.

    The trailing level is a 28-day mean of the actual over active days, taken strictly
    BEFORE the target date, so nothing here uses information the band would not have had.
    """
    active = records[records["state"] == 0].sort_values("target").copy()
    daily = (active.groupby("target")["y"].mean().sort_index())
    level = daily.rolling(28, min_periods=14).mean().shift(1)
    active["level"] = active["target"].map(level)
    active = active[active["level"].notna() & (active["level"] > 0)]
    t = active["target"].map(pd.Timestamp.toordinal).to_numpy(float)
    raw = active["res"].to_numpy(float)
    rel = raw / active["level"].to_numpy(float)

    rho_raw, p_raw = stats.spearmanr(t, raw)
    rho_rel, p_rel = stats.spearmanr(t, rel)
    rho_lvl, p_lvl = stats.spearmanr(t, active["level"].to_numpy(float))
    rho_couple, p_couple = stats.spearmanr(active["level"].to_numpy(float), raw)
    return {
        "n": int(len(active)),
        "level_trend": {"spearman_rho": float(rho_lvl), "spearman_p": float(p_lvl)},
        "level_to_residual": {"spearman_rho": float(rho_couple),
                              "spearman_p": float(p_couple)},
        "absolute_residual_drift": {"spearman_rho": float(rho_raw),
                                    "spearman_p": float(p_raw)},
        "deflated_residual_drift": {"spearman_rho": float(rho_rel),
                                    "spearman_p": float(p_rel)},
        "mean_level_first_quarter": float(
            active["level"].iloc[: len(active) // 4].mean()),
        "mean_level_last_quarter": float(
            active["level"].iloc[-(len(active) // 4):].mean()),
    }


def _windowed_remedy(records: pd.DataFrame, windows=(120, 180, 240)) -> dict:
    """Does a recency-limited calibration pool restore coverage?

    The diagnostic's account says the expanding pool is the mechanism that converts a
    drifting residual scale into a coverage error. If that is right, capping the pool to
    the most recent residuals should move coverage toward nominal at a venue whose scale
    rises AND at one whose scale falls, in opposite directions, without being tuned to
    either. A remedy that only helps the venue it was designed on would not distinguish
    the account from a coincidence.

    This is a counterfactual measurement, NOT a change to the served band. Adopting a
    window is a decision about a served artefact and carries its own gate.
    """
    res_by_target: dict = {}
    for _, r in records.iterrows():
        res_by_target.setdefault(r["target"], []).append(
            (float(r["res"]), int(r["state"])))
    by_origin = {o: g.sort_values("step") for o, g in records.groupby("origin")}
    sorted_targets = sorted(res_by_target)

    out = {}
    for w in (None, *windows):
        pool_res: list[float] = []
        pool_state: list[int] = []
        tptr = 0
        covered = 0
        total = 0
        width_sum = 0.0
        for t in sorted(by_origin):
            while tptr < len(sorted_targets) and sorted_targets[tptr] <= t:
                for rs, stt in res_by_target[sorted_targets[tptr]]:
                    pool_res.append(rs)
                    pool_state.append(stt)
                tptr += 1
            if len(pool_res) < ic.WARMUP_POOL:
                continue
            # The window is applied at banding time, so the warm-up rule and the
            # admission rule are untouched; only how far back the quantile looks changes.
            pr = np.asarray(pool_res if w is None else pool_res[-w:])
            pst = np.asarray(pool_state if w is None else pool_state[-w:])
            g = by_origin[t]
            yhat = g["yhat"].to_numpy(float)
            states = g["state"].to_numpy(int)
            lo, hi = mondrian_band(LEVEL, pr, pst, yhat, states)
            y = g["y"].to_numpy(float)
            covered += int(((y >= lo) & (y <= hi)).sum())
            width_sum += float((hi - lo).sum())
            total += len(g)
        key = "expanding" if w is None else f"window_{w}"
        out[key] = {"n": total, "coverage": covered / total if total else float("nan"),
                    "mean_width": width_sum / total if total else float("nan")}
    return out


def _partition_fidelity(records: pd.DataFrame) -> dict:
    """Is the Mondrian partition telling the truth about which days are closed?

    The band groups by a day-of-week structural-closure calendar, and the guarantee it
    buys is within-group exchangeability. A group defined by a calendar is exchangeable
    only to the extent the calendar is right. Where a day the calendar calls closed
    actually traded, that observation is drawn from the trading distribution and banded
    against a group of near-zero residuals, which is a miss by construction rather than
    by bad luck.

    Reported as a rate, because the rate is what determines how much of a venue's
    shortfall this can account for.
    """
    closed = records[records["state"] == 1]
    traded = closed[closed["y"] > 0]
    return {
        "n_calendar_closed": int(len(closed)),
        "n_calendar_closed_but_traded": int(len(traded)),
        "rate": float(len(traded) / len(closed)) if len(closed) else float("nan"),
        "mean_takings_on_those_days": float(traded["y"].mean()) if len(traded) else 0.0,
        "mean_abs_residual_on_those_days": (
            float(traded["res"].mean()) if len(traded) else 0.0),
        "mean_abs_residual_on_genuinely_closed": float(
            closed[closed["y"] <= 0]["res"].mean()) if len(closed) else float("nan"),
    }


def venue_report(venue: str) -> dict:
    records = ic.generate_records(venue)
    return {
        "venue": venue,
        "point_model": ic.default_model(venue),
        "n_origins": int(records["origin"].nunique()),
        "scale_drift": _scale_drift(records),
        "rank_uniformity": _rank_uniformity(records),
        "level_coupling": _level_coupling(records),
        "partition_fidelity": _partition_fidelity(records),
        "windowed_remedy": _windowed_remedy(records),
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
        c = rep["level_coupling"]
        print(f"  level         trend rho={c['level_trend']['spearman_rho']:+.3f} "
              f"p={c['level_trend']['spearman_p']:.2e}   "
              f"{c['mean_level_first_quarter']:.1f} -> {c['mean_level_last_quarter']:.1f}")
        print(f"    |res| drift  raw rho={c['absolute_residual_drift']['spearman_rho']:+.3f} "
              f"p={c['absolute_residual_drift']['spearman_p']:.2e}")
        print(f"    deflated     rho={c['deflated_residual_drift']['spearman_rho']:+.3f} "
              f"p={c['deflated_residual_drift']['spearman_p']:.2e}")
        f = rep["partition_fidelity"]
        print(f"    partition    {f['n_calendar_closed_but_traded']}/{f['n_calendar_closed']} "
              f"= {f['rate']:.3f} calendar-closed days actually traded "
              f"(mean take {f['mean_takings_on_those_days']:.1f})")
        for k, v in rep["windowed_remedy"].items():
            print(f"    {k:<12} cov={v['coverage']:.4f}  width={v['mean_width']:.1f}  n={v['n']}")

    OUT_PATH.write_text(json.dumps(artefact, indent=2, allow_nan=False) + "\n")
    print(f"\nwrote {OUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
