"""WP6 · Adaptive Conformal Inference (ACI) across the TRT closure (report-only).

Evidence for the chapter's regime-change discussion: does an online, adaptive
miscoverage target hold nominal coverage through a structural break that a static
split-conformal band cannot? We walk the TRT L1 residual stream forward one day
at a time (the stream includes the post-closure zero run) and compare two banding
policies on the one-step-ahead absolute-residual scores:

  (a) static split conformal at a fixed level 0.90 (the current mechanism);
  (b) ACI (Gibbs and Candes 2021) with alpha_1 = 0.10 and the verbatim update
      alpha_{t+1} = alpha_t + gamma (alpha - err_t),
      err_t = 1{ |residual_t| > Qhat_t(1 - alpha_t) },
  where Qhat_t is the conformal quantile of the scores seen strictly before t and
  gamma is a user-chosen step size, swept over {0.005, 0.01, 0.02} (the ACI paper
  fixes no single gamma; it is a design choice).

The ACI paper's deterministic bound on the realised miscoverage:
  | (1/T) sum_t err_t - alpha | <= (max{alpha_1, 1 - alpha_1} + gamma) / (T gamma).

Report-only: no production code is touched. Writes eval/aci_closure_probe.md and
a coverage plot under eval/.

Run:
    python -m eval.aci_closure_probe
"""

from __future__ import annotations

import sys

import numpy as np
import pandas as pd

from config import STORE_DIR
from conformal.wrap import conformal_quantile
from signals.residual import build_residual_stream
from store.active_span import active_trading_end

VENUE = "two_river_taps"
ALPHA_TARGET = 0.10          # nominal miscoverage (90% band)
ALPHA_1 = 0.10               # ACI initial miscoverage
GAMMAS = (0.005, 0.01, 0.02)
WARMUP = 20                  # prior scores before the first banded day
ROLL_WINDOW = 28             # trailing days for the rolling-coverage series

RESULTS_MD = STORE_DIR.parent / "eval" / "aci_closure_probe.md"
COVERAGE_PNG = STORE_DIR.parent / "eval" / "aci_closure_coverage.png"


def _quantile_at(scores: np.ndarray, alpha: float) -> float:
    """Conformal quantile at level 1 - alpha, with the ACI level clamp: alpha < 0
    (over-cover) -> band covers everything; alpha > 1 -> band covers nothing."""
    level = 1.0 - alpha
    if level >= 1.0:
        return float("inf")
    if level <= 0.0:
        return float("-inf")
    return conformal_quantile(scores, level)


def static_policy(scores: np.ndarray) -> np.ndarray:
    """covered_t under fixed level 0.90, banded on scores strictly before t."""
    covered = np.zeros(len(scores), bool)
    for t in range(WARMUP, len(scores)):
        q = conformal_quantile(scores[:t], 1.0 - ALPHA_TARGET)
        covered[t] = scores[t] <= q
    return covered


def aci_policy(scores: np.ndarray, gamma: float) -> dict:
    """ACI walk-forward. Returns covered, err, the alpha trajectory (length T+1),
    and the deterministic miscoverage bound. err_t = 1{score_t > Qhat_t}."""
    n = len(scores)
    covered = np.zeros(n, bool)
    err = np.zeros(n, float)
    alpha = ALPHA_1
    alphas = [alpha]
    steps = 0
    for t in range(WARMUP, n):
        q = _quantile_at(scores[:t], alpha)
        e = 1.0 if scores[t] > q else 0.0
        err[t] = e
        covered[t] = e == 0.0
        alpha = alpha + gamma * (ALPHA_TARGET - e)
        alphas.append(alpha)
        steps += 1
    bound = (max(ALPHA_1, 1.0 - ALPHA_1) + gamma) / (steps * gamma) if steps else float("nan")
    return {"covered": covered, "err": err, "alphas": np.array(alphas),
            "bound": bound, "steps": steps}


def _rolling_coverage(covered: np.ndarray, evaluated: np.ndarray) -> np.ndarray:
    """Trailing ROLL_WINDOW-day coverage over the evaluated (post-warmup) days."""
    out = np.full(len(covered), np.nan)
    for t in range(len(covered)):
        lo = max(0, t - ROLL_WINDOW + 1)
        mask = evaluated[lo:t + 1]
        if mask.any():
            out[t] = covered[lo:t + 1][mask].mean()
    return out


def _phase_means(covered: np.ndarray, evaluated: np.ndarray, dates: pd.Series,
                 closure: pd.Timestamp) -> dict:
    pre = evaluated & (dates <= closure).to_numpy()
    post = evaluated & (dates > closure).to_numpy() & \
        (dates <= closure + pd.Timedelta(days=ROLL_WINDOW)).to_numpy()
    overall = evaluated
    def _mean(mask):
        return float(covered[mask].mean()) if mask.any() else float("nan")
    return {"pre": _mean(pre), "post": _mean(post), "overall": _mean(overall),
            "n_pre": int(pre.sum()), "n_post": int(post.sum()), "n_all": int(overall.sum())}


def probe() -> dict:
    stream = build_residual_stream(VENUE)
    dates = stream["date"].reset_index(drop=True)
    scores = np.abs((stream["actual"] - stream["expected"]).to_numpy(float))
    evaluated = np.zeros(len(scores), bool)
    evaluated[WARMUP:] = True
    closure = pd.Timestamp(active_trading_end(VENUE))

    static_cov = static_policy(scores)
    policies = {"static_0.90": {"covered": static_cov,
                                "means": _phase_means(static_cov, evaluated, dates, closure),
                                "roll": _rolling_coverage(static_cov, evaluated)}}
    for g in GAMMAS:
        r = aci_policy(scores, g)
        policies[f"aci_gamma_{g}"] = {
            "covered": r["covered"], "bound": r["bound"], "steps": r["steps"],
            "means": _phase_means(r["covered"], evaluated, dates, closure),
            "roll": _rolling_coverage(r["covered"], evaluated)}
    return {"dates": dates, "closure": closure, "evaluated": evaluated,
            "policies": policies}


def _plot(out: dict) -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception:  # pragma: no cover
        return
    dates = out["dates"]
    fig, ax = plt.subplots(figsize=(8, 4))
    for name, p in out["policies"].items():
        ax.plot(dates, p["roll"], label=name)
    ax.axvline(out["closure"], color="k", linestyle="--", label="closure")
    ax.axhline(1 - ALPHA_TARGET, color="grey", linestyle=":", label="nominal 0.90")
    ax.set_ylabel(f"rolling {ROLL_WINDOW}-day coverage")
    ax.set_title(f"ACI vs static coverage across the {VENUE} closure")
    ax.legend(fontsize=7)
    fig.tight_layout()
    fig.savefig(COVERAGE_PNG, dpi=110)
    plt.close(fig)


def _write_report(out: dict) -> None:
    RESULTS_MD.parent.mkdir(parents=True, exist_ok=True)
    static_m = out["policies"]["static_0.90"]["means"]
    best_name, best_gap = None, -1.0
    for name, p in out["policies"].items():
        if name == "static_0.90":
            continue
        gap = 1.0 - ALPHA_TARGET - abs(p["means"]["post"] - (1 - ALPHA_TARGET))
        if p["means"]["post"] > best_gap:
            best_gap, best_name = p["means"]["post"], name
    lines = [
        f"# WP6 · ACI coverage across the {VENUE} closure\n",
        f"Closure date: **{out['closure'].date()}**. Nominal coverage 0.90 "
        f"(alpha = {ALPHA_TARGET}). Walk-forward over the L1 residual stream "
        "(post-closure zero run included); coverage is on the one-step-ahead "
        "absolute residual. Report-only, no production code touched.\n",
        "| Policy | pre-closure | post-closure (28d) | overall | ACI bound |",
        "|---|---|---|---|---|",
    ]
    lines.append(
        f"| static_0.90 | {static_m['pre']:.3f} | {static_m['post']:.3f} | "
        f"{static_m['overall']:.3f} | n/a |")
    for g in GAMMAS:
        p = out["policies"][f"aci_gamma_{g}"]
        m = p["means"]
        lines.append(
            f"| aci_gamma_{g} | {m['pre']:.3f} | {m['post']:.3f} | "
            f"{m['overall']:.3f} | {p['bound']:.3f} |")
    lines += [
        f"\nCounts: {static_m['n_pre']} pre-closure, {static_m['n_post']} in the "
        f"28 days post-closure, {static_m['n_all']} evaluated overall.\n",
    ]
    static_post = static_m["post"]
    if best_name is not None:
        best_post = out["policies"][best_name]["means"]["post"]
        verdict = (
            f"Through the closure, **{best_name}** held the highest post-closure "
            f"coverage (**{best_post:.3f}** vs static **{static_post:.3f}**), a gain "
            f"of **{(best_post - static_post) * 100:.1f} percentage points**. ACI "
            "widens the band as consecutive breaches drive alpha down, recovering "
            "coverage the static band loses to the structural break."
            if best_post > static_post + 1e-9 else
            f"Static and ACI held comparable post-closure coverage (static "
            f"**{static_post:.3f}**, best ACI **{best_post:.3f}**); on this stream "
            "the closure breach is brief enough that the static band is not "
            "materially worse over the 28-day window.")
    else:
        verdict = "No ACI policy evaluated."
    lines += [verdict, f"\nThe deterministic ACI miscoverage bound "
              "(max(alpha_1, 1 - alpha_1) + gamma) / (T gamma) is reported per gamma "
              "above; smaller gamma gives a tighter long-run bound but slower "
              "adaptation. Coverage plot: `eval/aci_closure_coverage.png`."]
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    print(f"WP6 · ACI closure probe ({VENUE})")
    out = probe()
    for name, p in out["policies"].items():
        m = p["means"]
        print(f"  {name:16s} pre={m['pre']:.3f} post28={m['post']:.3f} "
              f"overall={m['overall']:.3f}")
    _plot(out)
    _write_report(out)
    print(f"  report            : {RESULTS_MD}")
    print("WP6 RESULT: PASS (ACI vs static coverage computed across the closure)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
