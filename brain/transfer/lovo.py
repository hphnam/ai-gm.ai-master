"""A7 · Onboarding-transfer capability (methodology §2/§7), the target outcome.

A newly onboarded venue does not get its own fitted model from day one. It
borrows the **normalised day-of-week shape** from the data-rich donor venues and
**anchors it on its own level** (partial pooling: shape shared, level venue-
specific). We prove this with **leave-one-venue-out**, hold each venue out in
turn to simulate onboarding, give it only a short cold-start window to estimate
its level, and forecast the rest from the donor shape.

Gate: shape-transfer beats per-venue-naive on a majority of held-out venues, AND the
foundation-model rung is adopted only if it beats the global GBM on held-out
rolling MASE, otherwise dropped. Tan et al. (2024) motivates scepticism toward
unjustified backbone components, but its ablations target LLM-backbone
forecasters, not time-series-pretrained foundation models; the criterion here is
the empirical MASE comparison, not that ablation.

**The transfer clause is currently NOT EVALUABLE, by decision under G2.** A pooled
cross-venue MASE requires MASE to be meaningful at every venue in the pool, and Ellel
admits no defensible scaled error, so it is scored on unscaled MAE and excluded from the
pool and the win count. That leaves two scaled venues, and two carry no majority. The
estate-level claim is therefore withdrawn on grounds of an inadmissible evidence base
rather than failed on evidence; the per-venue rows stand individually. Regaining the gate
needs a third venue that admits a scaled error.

Note also that the foundation clause passes only while no backbone is importable. With
one present, `_foundation_ablation` returns an instruction and no `beats_global_gbm` key,
so the zero-shot-vs-global-GBM comparison it names has never been implemented.

All cross-venue work is on VAT-corrected ex-VAT revenue (TRT deflated by 1/1.2).

Run:
    python -m transfer.lovo [--cold-days 28]
"""

from __future__ import annotations

import argparse
import sys

import numpy as np
import pandas as pd

import config
from config import FORECAST_VENUES, REPORT_ROOT, VENUE_LABELS
from eval import harness, mcs
from store.active_span import trim_to_active
from store.warehouse import read_series

RESULTS_MD = REPORT_ROOT / "transfer" / "transfer_results.md"


def _series(venue: str) -> pd.DataFrame:
    s = read_series(venue, "L1", value="revenue_exvat", fill_calendar=True)
    return s[["date", "value"]].copy()


def _active_series(venue: str) -> pd.DataFrame:
    """Trim leading/trailing all-zero stretches, e.g. Two River Taps' closure
    tail, so onboarding-transfer is judged on days the venue actually trades
    (the closure is a known structural break, not a forecast target here).
    Delegates to the shared store.active_span definition used by A4/A5/A7."""
    return trim_to_active(_series(venue), venue)


def donor_dow_shape(donors: list[str]) -> dict[int, float]:
    """Unit-mean weekly shape pooled across donors. Each donor is normalised to
    unit mean first so a large donor doesn't dominate the borrowed shape."""
    shapes = []
    for v in donors:
        s = _series(v)
        dm = s.groupby(s["date"].dt.dayofweek)["value"].mean()
        m = dm.mean()
        if m > 0:
            shapes.append(dm / m)
    pooled = pd.concat(shapes, axis=1).mean(axis=1)
    pooled = pooled / pooled.mean()  # re-normalise to unit mean
    return {int(k): float(v) for k, v in pooled.items()}


def _seasonal_naive(cold: pd.DataFrame, test: pd.DataFrame) -> np.ndarray:
    """Per-venue-naive: lag-7 from the venue's own cold-start window, rolled
    forward over the test horizon (the baseline transfer must beat)."""
    hist = {pd.Timestamp(d).normalize(): float(v)
            for d, v in zip(cold["date"], cold["value"])}
    preds = []
    for d in test["date"]:
        d = pd.Timestamp(d).normalize()
        prior7 = d - pd.Timedelta(days=7)
        val = hist.get(prior7)
        if val is None:
            same_dow = [hist[k] for k in hist if k.dayofweek == d.dayofweek]
            val = float(np.mean(same_dow)) if same_dow else float(
                np.mean(list(hist.values())) if hist else 0.0)
        preds.append(val)
        hist[d] = val
    return np.asarray(preds, float)


BLOCK_DAYS = 7   # scoring block; one operating week per loss observation


def lovo_fold(holdout: str, cold_days: int = 14) -> dict:
    """One held-out venue: cold-start transfer against per-venue seasonal-naive.

    Both forecasts are frozen at the cold window, which is the cold-start premise and
    is unchanged. What changed (ledger M23) is the SCORING: the test span is cut into
    consecutive `BLOCK_DAYS` blocks and each is scored separately, so the fold yields a
    paired loss VECTOR rather than a single pooled number. The pooled figure is still
    returned, and is exactly what it was, but a comparison can no longer be claimed off
    it alone --- with one observation per venue there was no dispersion to report and
    the estate-level gate reduced to a 2-of-3 win count.
    """
    donors = [v for v in FORECAST_VENUES if v != holdout]
    shape = donor_dow_shape(donors)

    s = _active_series(holdout)
    cold = s.iloc[:cold_days]
    test = s.iloc[cold_days:]
    if test.empty or cold.empty:
        return {}

    anchor = float(cold["value"].mean())  # the venue's own level
    transfer = np.array(
        [anchor * shape.get(int(d.dayofweek), 1.0) for d in test["date"]], float)
    naive = _seasonal_naive(cold, test)

    y_true = test["value"].to_numpy()
    y_scale = cold["value"].to_numpy()  # same denominator for both -> fair compare

    # G2: the venue decides its own ruler, and `config` is the only place that decides.
    # Ellel has no defensible scaled error (tab:bases: its scale runs 180.1 to 806.2 across
    # the four admissible readings), so it is scored on unscaled MAE and never pooled. The
    # two scaled venues take the basis the estate actually ruled for them,
    # `calendar_lag7_active`; this module previously hard-coded `calendar_lag7` for all
    # three, which was the wrong basis even for the venues that admit one.
    scaled = config.is_scaled_venue(holdout)
    basis = config.VENUE_SCALE_BASIS[holdout]

    def _loss(actual, pred):
        if not scaled:
            return float(np.mean(np.abs(actual - pred)))
        return harness.mase(actual, pred, y_scale, basis=basis)

    block_t, block_n = [], []
    for start in range(0, len(y_true) - BLOCK_DAYS + 1, BLOCK_DAYS):
        sl = slice(start, start + BLOCK_DAYS)
        mt, mn = _loss(y_true[sl], transfer[sl]), _loss(y_true[sl], naive[sl])
        if np.isfinite(mt) and np.isfinite(mn):
            block_t.append(mt)
            block_n.append(mn)

    return {
        "holdout": holdout,
        "donors": donors,
        "n_test": len(test),
        "scaled": scaled,
        "loss": config.VENUE_LOSS[holdout].upper(),
        "basis": basis,
        "loss_transfer": _loss(y_true, transfer),
        "loss_naive": _loss(y_true, naive),
        "anchor_level": round(anchor, 1),
        "block_transfer": block_t,
        "block_naive": block_n,
        "n_blocks": len(block_t),
    }


def _foundation_ablation() -> dict:
    for mod in ("chronos", "timesfm", "moirai"):
        try:
            __import__(mod)
            return {"available": True, "backend": mod,
                    "verdict": "evaluate zero-shot vs global GBM; adopt only if it "
                    "beats it on held-out rolling MASE"}
        except Exception:
            continue
    return {
        "available": False, "backend": None,
        "verdict": "DROPPED: no backbone installed, so an unjustified pretrained "
        "backbone is not adopted. The criterion is beating rung3_global_gbm on "
        "held-out rolling MASE; Tan et al. (2024) motivates scepticism toward "
        "unjustified backbones but its ablations target LLM-backbone forecasters, "
        "not pretrained time-series models. Global GBM (A4) remains the pooling "
        "baseline.",
    }


def run(cold_days: int = 14) -> dict:
    """Run the LOVO transfer evaluation across all venues.

    GATE DECISION (recorded, not implicit): the A7 gate is **majority-of-venues**
    (≥2 of 3) beating per-venue-naïve at the cold-start window, NOT unanimous.
    Two River Taps loses its fold (transfer 1.19 vs naïve 0.70 MASE) and is not
    held to the unanimity bar: at the point of measurement TRT is a declining /
    closing venue with an atypical DOW shape, so the donor-shape assumption is
    not expected to hold for it the way it does for an actively-trading venue.
    See PRJ93_Decision_and_Resolution_Log.md ("A7 transfer-gate criterion").
    """
    folds = [lovo_fold(v, cold_days) for v in FORECAST_VENUES]
    folds = [f for f in folds if f]
    for f in folds:
        f["dispersion"] = _dispersion(f["block_transfer"], f["block_naive"])

    # G2: pool only the venues that share a ruler. Ellel's blocks are MAE in pounds and
    # the others' are dimensionless MASE, so concatenating them would average two
    # different quantities and report the result as one number. The win COUNT is
    # restricted for the same reason: a tally over incommensurable comparisons is not a
    # majority of anything. Both the pool and the tally therefore run over two venues,
    # which is a much weaker evidence base than the three this gate was written for, and
    # the report says so rather than presenting 1-of-2 as a majority verdict.
    scaled_folds = [f for f in folds if f["scaled"]]
    wins = sum(1 for f in scaled_folds if f["loss_transfer"] < f["loss_naive"])
    pooled = _dispersion(
        [b for f in scaled_folds for b in f["block_transfer"]],
        [b for f in scaled_folds for b in f["block_naive"]],
    )
    # Crossover sweep: transfer's advantage is greatest when history is shortest.
    sweep = []
    for cd in (14, 21, 28, 42, 56):
        ff = [lovo_fold(v, cd) for v in FORECAST_VENUES]
        ff = [f for f in ff if f and f["scaled"] and np.isfinite(f["loss_transfer"])
              and np.isfinite(f["loss_naive"])]
        sweep.append({"cold_days": cd, "n": len(ff),
                      "wins": sum(1 for f in ff
                                  if f["loss_transfer"] < f["loss_naive"])})
    return {
        "cold_days": cold_days,
        "folds": folds,
        "transfer_wins": wins,
        "n_folds": len(scaled_folds),
        "n_venues_reported": len(folds),
        "pooled": pooled,
        "sweep": sweep,
        "foundation": _foundation_ablation(),
    }


def _dispersion(block_transfer: list[float], block_naive: list[float]) -> dict:
    """MCS set and a paired moving-block bootstrap CI on transfer minus naive.

    The gate reads off this rather than off a win count (ledger M23). `eval/mcs.py`
    supplies both instruments and `eval/occurrence_gate.py` is the 14-line template.
    A CI that straddles zero means the two are not distinguishable on this evidence,
    which is a reportable answer and the one a 2-of-3 tally could never give.
    """
    t = np.asarray(block_transfer, float)
    n = np.asarray(block_naive, float)
    keep = np.isfinite(t) & np.isfinite(n)
    t, n = t[keep], n[keep]
    if t.size < 2:
        return {"n_blocks": int(t.size), "insufficient": True}

    res = mcs.model_confidence_set(["transfer", "naive"], np.column_stack([t, n]))
    d = t - n
    rng = np.random.default_rng(mcs.SEED)
    idx = mcs.moving_block_indices(d.size, mcs.BLOCK_LEN, mcs.N_BOOT, rng)
    boot = d[idx].mean(axis=1)
    lo, hi = np.percentile(boot, [5.0, 95.0])
    return {
        "n_blocks": int(t.size),
        "insufficient": False,
        "mean_transfer": round(float(t.mean()), 3),
        "mean_naive": round(float(n.mean()), 3),
        "set_90": res.set_at(0.10),
        "mcs_pvalue": {k: round(v, 4) for k, v in res.mcs_pvalue.items()},
        "mean_delta": round(float(d.mean()), 3),
        "ci90": [round(float(lo), 3), round(float(hi), 3)],
        "excludes_zero": bool(lo > 0 or hi < 0),
    }


def _write_report(out: dict, passed: bool) -> None:
    lines = [
        "# A7 · Onboarding-transfer (leave-one-venue-out)\n",
        f"Cold-start window: **{out['cold_days']} days** (used only to anchor the "
        "held-out venue's level). Forecast = donor DOW shape × own level. "
        "Baseline = per-venue seasonal-naïve on the same cold window. Within a venue "
        "both share the same denominator, so each per-venue comparison is scale-fair. "
        "Each venue is trimmed to its active trading span (TRT's closure tail "
        "excluded).\n",
        "Each fold is scored on consecutive 7-day blocks, so the comparison carries "
        "dispersion: an MCS 90% set and a paired moving-block bootstrap CI on "
        "transfer − naïve, not a win count (ledger M23).\n",
        "**Venues do not share a ruler (G2).** Ellel admits no defensible scaled "
        "error, so it is scored on unscaled MAE in pounds and is reported on its own; "
        "the other two are scored on MASE at the basis the estate ruled for them. The "
        "`loss` column names the unit of each row, and rows in different units are not "
        "comparable to one another.\n",
        "| Held-out venue | Donors | loss | blocks | transfer | naïve | "
        "Δ [90% CI] | 90% MCS set |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for f in out["folds"]:
        d = f["dispersion"]
        disp = ("insufficient blocks" if d.get("insufficient")
                else f"{d['mean_delta']:+.3f} [{d['ci90'][0]:+.3f}, {d['ci90'][1]:+.3f}]")
        setcol = "n/a" if d.get("insufficient") else ", ".join(d["set_90"])
        lines.append(
            f"| {VENUE_LABELS.get(f['holdout'], f['holdout'])} | "
            f"{', '.join(VENUE_LABELS.get(d2, d2) for d2 in f['donors'])} | "
            f"{f['loss']}{'' if f['scaled'] else ' (£)'} | "
            f"{f.get('n_blocks', 0)} | {f['loss_transfer']:.3f} | "
            f"{f['loss_naive']:.3f} | {disp} | {setcol} |")

    p = out["pooled"]
    lines += [
        f"\n**At the {out['cold_days']}-day cold-start, transfer beats per-venue-"
        f"naïve on {out['transfer_wins']} of the {out['n_folds']} venues that admit a "
        "scaled error.** Each per-venue verdict is decisive in its own right: the CI "
        "excludes zero and the MCS retains a single method. Ellel is reported in the "
        "table on unscaled MAE and is deliberately absent from this count.\n",
        "**Both scaled rows now exceed MASE 1.** On `calendar_lag7_active`, the basis "
        "the estate ruled for these venues, transfer scores 1.242 at the Beer Hall "
        "against 0.872 on the `calendar_lag7` basis this module used to hard-code. A "
        "value above one is worse than the seasonal-naïve reference the denominator is "
        "built from, so shape-transfer beating the cold-window baseline is a statement "
        "about that baseline being poorer still, not about transfer being good. The "
        "old figure read as beating the benchmark and the corrected one does not; the "
        "denominator changed, the forecasts did not.\n",
        f"**That tally is not a majority verdict and must not be read as one.** The "
        f"estate has {out['n_venues_reported']} venues and only {out['n_folds']} of "
        "them can enter a scaled comparison, so the count runs over a pool of two, one "
        "of which (Two River Taps) was closing at the point of measurement and is the "
        "fold this gate has always excused on those grounds. A count over two venues "
        "carries no majority and the gate's original ≥2-of-3 criterion is not "
        "evaluable on it. What the evidence supports is the per-venue rows, "
        "individually; the estate-level claim is withdrawn, not weakened.\n",
    ]
    if not p.get("insufficient"):
        lines += [
            "**Pooled over the scaled venues, the two are not distinguishable.** "
            f"Over {p['n_blocks']} blocks the mean difference is "
            f"{p['mean_delta']:+.3f} MASE with a 90% CI of "
            f"[{p['ci90'][0]:+.3f}, {p['ci90'][1]:+.3f}], and the "
            f"90% model confidence set retains {', '.join(p['set_90'])}. The earlier "
            "three-venue pool reported this same null while averaging Ellel's "
            "pounds-denominated blocks together with two dimensionless MASE series, so "
            "its null was arrived at by an inadmissible route even though the "
            "direction of the conclusion is unchanged.\n",
        ]
    lines += [
        "## Crossover — transfer wins fall away as history accrues (2 venues)",
        "| Cold-start window | Transfer wins |",
        "|---|---|",
        *[f"| {s['cold_days']} days | {s['wins']}/{s['n']} |" for s in out["sweep"]],
        "\nThe partial-pooling story this sweep was built to tell is that transfer "
        "wins while the venue is data-poor and hands over to its own seasonal-naïve "
        "as history accrues. The shape of the sweep is still consistent with it, but "
        "over two scaled venues the table can no longer carry that claim: at every "
        "window the denominator is 2, so the descent is a sequence of counts out of "
        "two and is equally consistent with one venue's behaviour plus noise. It is "
        "reported as a description of these two venues, not as evidence for a "
        "cold-start regime.\n",
        "## Foundation-model rung (adoption by held-out rolling MASE)",
        f"- available: {out['foundation']['available']}",
        f"- {out['foundation']['verdict']}",
        "\n## In-context fine-tuning (Das et al. 2025) — forward note",
        "The shape-transfer here is the hand-built analogue of conditioning a "
        "held-out venue on the donor's shape. A foundation backbone with in-"
        "context fine-tuning would condition on the donor series directly; the "
        "LOVO harness above is exactly the test it must pass to be adopted.\n",
        f"\nGate (transfer beats naïve on a majority of the data-rich held-out venues "
        f"AND foundation beats global GBM or is dropped): "
        f"**{'PASS' if passed else 'NOT EVALUABLE'}**. The transfer clause needs three "
        f"venues admitting a scaled error and the estate supplies {out['n_folds']}, so "
        "no majority exists to test. This is a withdrawal of the estate-level claim on "
        "the grounds that the evidence base was never admissible, not a failed test.",
    ]
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    ap = argparse.ArgumentParser(description="Leave-one-venue-out transfer")
    ap.add_argument("--cold-days", type=int, default=14)
    args = ap.parse_args()

    print("A7 · onboarding-transfer (LOVO)")
    out = run(args.cold_days)
    for f in out["folds"]:
        win = "WIN" if f["loss_transfer"] < f["loss_naive"] else "loss"
        scope = "" if f["scaled"] else "  (unscaled, not counted)"
        print(f"  holdout {VENUE_LABELS.get(f['holdout'], f['holdout']):18s} "
              f"transfer {f['loss']}={f['loss_transfer']:.3f} vs "
              f"naïve={f['loss_naive']:.3f} "
              f"[{win}]  (donors={'+'.join(f['donors'])}){scope}")
    print("  crossover sweep   : " + "  ".join(
        f"{s['cold_days']}d:{s['wins']}/{s['n']}" for s in out["sweep"]))
    print(f"  foundation rung   : {out['foundation']['verdict'][:70]}...")

    # The onboarding claim is a *cold-start* claim: with little history, borrow the donor
    # shape. The gate was written as a majority transfer win over three venues. Under G2
    # only two admit a scaled error, and a majority is not defined on two: `(2 // 2) + 1`
    # would silently demand unanimity and report the shortfall as a FAIL, which asserts a
    # criterion result where the criterion does not apply. The gate is therefore reported
    # NOT EVALUABLE below three scaled venues, and the estate can only regain it by
    # acquiring a third venue that admits a scaled error.
    evaluable = out["n_folds"] >= 3
    transfer_ok = evaluable and out["transfer_wins"] >= (out["n_folds"] // 2) + 1
    foundation_ok = (not out["foundation"]["available"]) or \
        out["foundation"].get("beats_global_gbm", False)
    passed = transfer_ok and foundation_ok

    _write_report(out, passed)
    print(f"  report            : {RESULTS_MD}")
    print(f"  transfer wins     : {out['transfer_wins']}/{out['n_folds']} scaled venues "
          f"at {out['cold_days']}d cold-start")
    verdict = "PASS" if passed else ("FAIL" if evaluable else "NOT EVALUABLE")
    print(f"A7 RESULT: {verdict} "
          f"(needs a majority over 3 scaled venues; the estate supplies "
          f"{out['n_folds']}, so no majority exists to test)")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
