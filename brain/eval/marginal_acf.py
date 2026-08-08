"""R24 - the two marginal ACFs behind the 6.2 pairing factor.

Discussion 6.2 defends the 6.2 paired-to-unpaired standard-error ratio against
overlapping origins by asserting that a dependence correction "scales the paired and
the unpaired standard error alike and cancels in their ratio". That cancellation
requires the DIFFERENTIAL series and the two MARGINAL series to carry the same serial
dependence. `mcs_L1_results.json` reports lag-1..10 for the differential only
(0.811 at lag 1 for the leading Ellel contrast); no ACF exists for either marginal,
so the assumption has never been checked.

This script computes them. It does NOT reimplement the estimator: it imports
`mcs._autocorr` and `mcs.common_loss_matrix`, so the marginal ACFs are produced by the
same code path, on the same common-fold matrix, as the committed differential ACF. The
first thing it does is reproduce the committed pair row cell by cell; a mismatch there
means the comparison is not like-for-like and the run aborts.

Population note, per PRJ93_RULES "resolve it at the generator": the metric key is
`rmsse` but at a venue ruled `unscaled` -- which Ellel is -- that vector is an RMSE in
pounds, not a scaled error. `mcs_report.HEADLINE_LOSS` is what selects it.

Run:
    python3 -m eval.marginal_acf                # all three venues, leading contrast
    python3 -m eval.marginal_acf --self-test    # fixtures, expected values by hand
"""

from __future__ import annotations

import argparse
import json
import sys

import numpy as np

import config
from eval import mcs

MAX_LAG = 10

# `eval.fold_vectors` and `eval.mcs_report` both pull in `store.warehouse` -> duckdb at
# import time, which this read-only arithmetic does not need and which is absent from
# the plain interpreter. `fold_vectors.load` is a bare JSON read, so it is inlined; the
# metric is taken from the committed artefact's own `headline_loss` rather than from
# `mcs_report.HEADLINE_LOSS`, because what must be matched is the metric the committed
# row was actually produced under, not the constant as it stands today.
_ARTEFACT = config.BRAIN_DIR / "eval" / "mcs_L1_results.json"


def _committed() -> dict:
    return json.loads(_ARTEFACT.read_text())


def _load_vectors(venue: str) -> dict:
    path = config.BRAIN_DIR / "eval" / f"fold_vectors_L1_{venue}.json"
    return json.loads(path.read_text())


def variance_inflation(acf: list[float], n: int) -> float:
    """Bartlett/Newey-West variance inflation for the mean of a dependent series.

    VIF = 1 + 2 * sum_k (1 - k/n) * rho_k, truncated at the reported lag budget. This
    is the multiplier by which var(mean) exceeds the iid value, so an SE computed as
    if the folds were independent is understated by sqrt(VIF).

    Truncation at MAX_LAG is a floor, not the whole correction: the committed artefact
    reports ten lags and this reads what exists rather than recomputing a longer ACF
    the write-up has never seen. Where a truncated series is still strongly positive at
    lag 10, the true VIF is larger and the conclusion below only strengthens.
    """
    return 1.0 + 2.0 * sum((1.0 - k / n) * r for k, r in enumerate(acf, start=1))


def leading_contrast(venue: str, max_lag: int = MAX_LAG,
                     pair: tuple[str, str] | None = None) -> dict:
    """Dependence diagnostics for one contrast at one venue.

    With `pair` unset this is the LEADING contrast: the first pair
    `mcs.paired_variance` emits, i.e. the two lowest mean-loss rungs of the top four.
    That is the pair the committed artefact reports and the one the reproduction guard
    below can check.

    `pair` names an explicit contrast instead. It exists because the write-up scales
    three gaps by a paired standard error and only two of them are their venue's
    leading contrast: Two River Taps' served-versus-argument-minimum gap is
    `rung2_ets` against `rung4_chronos2`, which has its own differential and therefore
    its own serial dependence. Propagating the leading contrast's inflation factor to
    it would be a value match standing in for an identity match.
    """
    payload = _load_vectors(venue)
    metric = _committed()["headline_loss"]
    if pair is None:
        rungs = mcs.top_rungs_by_mean(payload, metric, 4)
        i, j = 0, 1
    else:
        rungs = list(pair)
        i, j = 0, 1
    names, folds, L = mcs.common_loss_matrix(payload, rungs, metric)
    a, b = L[:, i], L[:, j]
    d = a - b
    n = len(d)

    acf_d = mcs._autocorr(d, max_lag)
    acf_a = mcs._autocorr(a, max_lag)
    acf_b = mcs._autocorr(b, max_lag)

    var_a, var_b = a.var(ddof=1), b.var(ddof=1)
    sd_indep = float(np.sqrt(var_a + var_b))
    sd_paired = float(d.std(ddof=1))

    vif_d = variance_inflation(acf_d, n)
    vif_a = variance_inflation(acf_a, n)
    vif_b = variance_inflation(acf_b, n)

    # Corrected ratio: the paired SE picks up sqrt(vif_d); the unpaired SE is built
    # from two marginal variances, each inflated by its own factor.
    sd_indep_corr = float(np.sqrt(vif_a * var_a + vif_b * var_b))
    sd_paired_corr = sd_paired * float(np.sqrt(vif_d))

    # Truncation sensitivity. The committed artefact reports ten lags; whether that
    # budget is enough is not a matter of taste when the VIF is a sum over lags. A
    # series still strongly positive at the truncation point has a VIF that is a
    # FLOOR, and the ratio built from it is correspondingly a bound rather than a
    # value. Reported so the write-up can say which.
    # The grid is `mcs.BLOCK_LEN_SENSITIVITY` (2, 7, 14, 21) plus 10, the budget the
    # committed artefact reports, plus 28. Reusing the pre-registered grid is
    # deliberate: the block bootstrap already commits this project to a view about how
    # far dependence runs, and a correction swept over a different grid would be
    # arguing with an argument nobody made.
    trunc = {}
    for m in (2, 7, 10, 14, 21, 28):
        if m >= n:
            continue
        fa, fb, fd = (mcs._autocorr(s_, m) for s_ in (a, b, d))
        va, vb, vd = (variance_inflation(f, n) for f in (fa, fb, fd))
        trunc[str(m)] = {
            "vif_differential": round(vd, 3),
            "vif_marginal_a": round(va, 3),
            "vif_marginal_b": round(vb, 3),
            "ratio_corrected": round(
                float(np.sqrt(va * var_a + vb * var_b)) / (sd_paired * float(np.sqrt(vd))), 3),
        }

    return {
        "venue": venue,
        "metric_key": metric,
        "metric_meaning_at_venue": payload["secondary_loss"],
        "basis": payload["basis"],
        "n_folds": n,
        "horizon_days": payload["horizon_days"],
        "step_days": payload["step_days"],
        "pair": [names[i], names[j]],
        "is_leading_contrast": pair is None,
        "mean_diff": float(d.mean()),
        "sd_paired": sd_paired,
        "sd_independent": sd_indep,
        "se_paired": sd_paired / float(np.sqrt(n)),
        "ratio_uncorrected": sd_indep / sd_paired,
        "max_lag": max_lag,
        "acf_differential": [round(x, 4) for x in acf_d],
        "acf_marginal_a": [round(x, 4) for x in acf_a],
        "acf_marginal_b": [round(x, 4) for x in acf_b],
        "vif_differential": vif_d,
        "vif_marginal_a": vif_a,
        "vif_marginal_b": vif_b,
        "ratio_corrected": sd_indep_corr / sd_paired_corr,
        "truncation_sensitivity": trunc,
    }


def _reproduce_committed(venue: str, computed: dict) -> list[str]:
    """Cell-by-cell against `mcs_L1_results.json`, not aggregate against aggregate."""
    row = _committed()["venues"][venue]["paired_variance_top4"][0]
    checks = [
        ("pair", row["pair"], computed["pair"]),
        ("mean_diff", row["mean_diff"], round(computed["mean_diff"], 4)),
        ("sd_paired", row["sd_paired"], round(computed["sd_paired"], 4)),
        ("sd_independent", row["sd_independent"],
         round(computed["sd_independent"], 4)),
        ("se_paired", row["se_paired"], round(computed["se_paired"], 4)),
        ("acf_lag1_10", row["acf_lag1_10"],
         [round(x, 3) for x in computed["acf_differential"]]),
    ]
    return [f"{name}: committed {want!r} != recomputed {got!r}"
            for name, want, got in checks if want != got]


def self_test() -> int:
    """Fixtures whose ACF is derivable by hand, both directions.

    `_autocorr` uses the biased denominator (full sum of squares at every lag), so the
    expected values below are derived against that definition, not against a
    lag-varying denominator. Getting this wrong is the whole reason the fixture exists.
    """
    failures = []

    # 1. Alternating +-1, n=8, mean 0, denom = 8.
    #    lag 1: sum over 7 products, each -1  -> -7/8 = -0.875
    #    lag 2: sum over 6 products, each +1  -> +6/8 = +0.750
    x = np.array([1.0, -1.0] * 4)
    got = mcs._autocorr(x, 2)
    if [round(v, 6) for v in got] != [-0.875, 0.75]:
        failures.append(f"alternating fixture: {got}")

    # 2. Constant series -> zero variance -> defined as all-zero, not a divide error.
    if mcs._autocorr(np.full(6, 3.0), 3) != [0.0, 0.0, 0.0]:
        failures.append("constant fixture did not return zeros")

    # 3. Ramp 1..5, mean 3, deviations [-2,-1,0,1,2], denom = 10.
    #    lag 1: (-2)(-1)+(-1)(0)+(0)(1)+(1)(2) = 2+0+0+2 = 4 -> 0.4
    #    lag 2: (-2)(0)+(-1)(1)+(0)(2) = 0-1+0 = -1 -> -0.1
    got = mcs._autocorr(np.arange(1.0, 6.0), 2)
    if [round(v, 6) for v in got] != [0.4, -0.1]:
        failures.append(f"ramp fixture: {got}")

    # 4. VIF on a hand case: n=5, acf [0.5, 0.25]
    #    1 + 2*((1-1/5)*0.5 + (1-2/5)*0.25) = 1 + 2*(0.4 + 0.15) = 2.1
    if round(variance_inflation([0.5, 0.25], 5), 10) != 2.1:
        failures.append("VIF fixture")

    # 5. The guard must FAIL when fed a violation -- an assertion nobody has seen
    #    fail is an assertion taken on faith.
    bad = dict(pair=["x", "y"], mean_diff=0.0, sd_paired=0.0, sd_independent=0.0,
               se_paired=0.0, acf_differential=[0.0] * MAX_LAG)
    if not _reproduce_committed("ellel", bad):
        failures.append("_reproduce_committed passed a deliberately wrong row")

    for f in failures:
        print(f"FAIL {f}")
    print("self-test: " + ("PASS" if not failures else f"{len(failures)} FAILURES"))
    return 1 if failures else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--max-lag", type=int, default=MAX_LAG)
    ap.add_argument("--pair", nargs=2, metavar=("RUNG_A", "RUNG_B"), default=None,
                    help="explicit contrast; skips the committed-row reproduction "
                         "guard, which only covers the leading contrast")
    ap.add_argument("venues", nargs="*")
    args = ap.parse_args(argv[1:])

    if args.self_test:
        return self_test()

    venues = args.venues or list(config.FORECAST_VENUES)
    out = []
    for venue in venues:
        rep = leading_contrast(venue, args.max_lag,
                               tuple(args.pair) if args.pair else None)
        # The guard compares against paired_variance_top4[0], which IS the leading
        # contrast. For an explicit pair there is no committed row to check against,
        # and saying so is the honest report rather than skipping quietly.
        mismatches = [] if args.pair else _reproduce_committed(venue, rep)
        rep["reproduces_committed_row"] = not mismatches
        rep["mismatches"] = mismatches
        out.append(rep)

        print(f"\n=== {venue} · {rep['pair'][0]} vs {rep['pair'][1]} "
              f"· {rep['metric_meaning_at_venue']} ({rep['basis']}), "
              f"n={rep['n_folds']} folds, h={rep['horizon_days']}d step "
              f"{rep['step_days']}d ===")
        if mismatches:
            print("  ABORT — does not reproduce the committed row:")
            for m in mismatches:
                print(f"    {m}")
            return 2
        if args.pair:
            print("  EXPLICIT PAIR - no committed row exists for this contrast, so the "
                  "reproduction guard did not run")
        else:
            print("  reproduces mcs_L1_results.json paired_variance_top4[0] cell by cell")
        print(f"  lag:            {'  '.join(f'{k:>7d}' for k in range(1, args.max_lag+1))}")
        for label, key in (("differential", "acf_differential"),
                           (f"marginal {rep['pair'][0]}", "acf_marginal_a"),
                           (f"marginal {rep['pair'][1]}", "acf_marginal_b")):
            vals = "  ".join(f"{v:>7.3f}" for v in rep[key])
            print(f"  {label:<28s}{vals}")
        print(f"  VIF  differential {rep['vif_differential']:.2f} · "
              f"marginal A {rep['vif_marginal_a']:.2f} · "
              f"marginal B {rep['vif_marginal_b']:.2f}")
        print(f"  ratio uncorrected {rep['ratio_uncorrected']:.3f} -> "
              f"corrected {rep['ratio_corrected']:.3f}")
        print("  truncation sensitivity (lag budget -> corrected ratio): " + " · ".join(
            f"{k}:{v['ratio_corrected']}" for k, v in rep["truncation_sensitivity"].items()))

    path = config.BRAIN_DIR / "eval" / "marginal_acf_L1.json"
    path.write_text(json.dumps(
        {"artefact": "marginal_acf_L1",
         "headline_loss": _committed()["headline_loss"],
         "max_lag": args.max_lag,
         "source_vectors": "brain/eval/fold_vectors_L1_<venue>.json",
         "estimator": "eval.mcs._autocorr, biased denominator, mean-subtracted",
         "venues": out}, indent=2, allow_nan=False) + "\n")
    print(f"\nwrote {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
