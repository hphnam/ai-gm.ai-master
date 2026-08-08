"""Dispersion for `tab:intermittency`'s p and v, by moving-block bootstrap.

WHY. `tab:intermittency` prints six rows of $p$ and $v$ with no uncertainty anywhere on
the table, and the Beer Hall's reclassification from lumpy to erratic turns on
$p = 1.3267$ against the corrected cutoff $4/3 = 1.3333$ -- a gap of $0.0067$. Chapter 4
already calls that "a boundary effect rather than a change in the series", which is an
uncertainty claim made without an uncertainty. Role audit B15/B16/B25/B26, synthesis R22.

THE DELIVERABLE IS ONE BIT: does the Beer Hall's interval on $p$ cross $4/3$? If it does,
the reclassification is a coin flip and the sentence has to say so.

    .venv-forecast/bin/python -m eval.intermittency_intervals
    .venv-forecast/bin/python -m eval.intermittency_intervals --self-test

MOVING-BLOCK, NOT IID. $p$ is the mean gap between demand days and is driven almost
entirely by which weekdays the venue trades; an iid resample of days destroys exactly the
structure the statistic measures and would return an interval about a different quantity.
Block length 7 matches the paired bootstraps elsewhere in this project and holds one whole
weekly cycle. B = 10,000 matches the paired-CI convention in `weather_basis_mcs.json`
(the MCS's B = 1000 is a different procedure -- see that file's `bootstrap_b_note`).

WHAT THIS DOES NOT ESTABLISH. A block bootstrap resamples the observed trading calendar;
it does not model a venue whose opening pattern could have been different. The interval is
sampling dispersion for THIS calendar, which is the right question for "is 1.3267 against
1.3333 a real distinction", and the wrong one for "would this venue always classify this
way". Percentile intervals, no bias correction: the estimator is a ratio of counts and BCa
would need a jackknife over blocks that the short frames here do not support well.
"""

from __future__ import annotations

import argparse
import json
import sys

import numpy as np

import config
import provenance
from eval.intermittency_diagnostic import (ADI_CUTOFF_KH, ADI_CUTOFF_SBC, CV2_CUTOFF_KH,
                                           CV2_CUTOFF_SBC, _EPS, _l1_frame, _pattern)
from store.warehouse import assert_store_ceiling, connect

OUT_PATH = config.BRAIN_DIR / "eval" / "intermittency_intervals.json"
VENUES = ("beer_hall", "two_river_taps", "ellel")
BLOCK_LEN = 7
N_BOOT = 10_000
SEED = 93
LEVEL = 0.90


def block_indices(n: int, block_len: int, rng: np.random.Generator) -> np.ndarray:
    """Indices for one moving-block resample of length n."""
    if n <= block_len:
        return rng.integers(0, n, size=n)
    starts = rng.integers(0, n - block_len + 1, size=int(np.ceil(n / block_len)))
    return np.concatenate([np.arange(s, s + block_len) for s in starts])[:n]


def bootstrap_pattern(occ: np.ndarray, size: np.ndarray, *, block_len: int = BLOCK_LEN,
                      n_boot: int = N_BOOT, seed: int = SEED) -> dict:
    """Percentile intervals on p (ADI) and v (CV-squared) for one occurrence series."""
    rng = np.random.default_rng(seed)
    occ = np.asarray(occ, dtype=bool)
    size = np.asarray(size, dtype=float)
    point = _pattern(occ, size)
    adis, cv2s = [], []
    for _ in range(n_boot):
        idx = block_indices(occ.size, block_len, rng)
        stat = _pattern(occ[idx], size[idx])
        if np.isfinite(stat["adi"]):
            adis.append(stat["adi"])
        if np.isfinite(stat["cv2"]):
            cv2s.append(stat["cv2"])
    lo, hi = (1 - LEVEL) / 2 * 100, (1 + LEVEL) / 2 * 100

    def interval(vals: list[float]) -> dict:
        if len(vals) < n_boot // 2:   # too many degenerate resamples to quote an interval
            return {"ci_lo": None, "ci_hi": None, "n_valid": len(vals)}
        return {"ci_lo": float(np.percentile(vals, lo)),
                "ci_hi": float(np.percentile(vals, hi)), "n_valid": len(vals)}

    return {"n_days": point["n_days"], "n_demands": point["n_demands"],
            "adi": point["adi"], "adi_ci": interval(adis),
            "cv2": point["cv2"], "cv2_ci": interval(cv2s)}


def run() -> dict:
    # Read-only, and the ceiling asserted with no connection argument: `assert_store_ceiling`
    # opens its own read-only handle regardless, and duckdb refuses two handles on one file
    # under different configurations. Same pattern as intermittency_diagnostic.main.
    ceiling = assert_store_ceiling()
    con = connect(read_only=True)
    try:
        out = {"artefact": "intermittency_intervals", "store_ceiling": str(ceiling),
               "block_len": BLOCK_LEN, "n_boot": N_BOOT, "seed": SEED, "level": LEVEL,
               "adi_cutoff_sbc": ADI_CUTOFF_SBC, "adi_cutoff_kh": ADI_CUTOFF_KH,
               "cv2_cutoff_sbc": CV2_CUTOFF_SBC, "cv2_cutoff_kh": CV2_CUTOFF_KH,
               "provenance": provenance.runtime_stamp(), "venues": {}}
        for venue in VENUES:
            frame = _l1_frame(venue, con=con)
            rev = frame["value"].to_numpy(float)
            till = frame["n_line_items"].to_numpy(float)
            out["venues"][venue] = {
                "nonzero_revenue": bootstrap_pattern(rev > _EPS, rev),
                "any_till_activity": bootstrap_pattern(till > 0, rev),
            }
        OUT_PATH.write_text(json.dumps(out, indent=2) + "\n")
        return out
    finally:
        con.close()


def _report(out: dict) -> None:
    print(f"block_len={out['block_len']}  B={out['n_boot']}  seed={out['seed']}  "
          f"level={out['level']}")
    print(f"cutoffs: SBC p>={out['adi_cutoff_sbc']}  corrected p>={out['adi_cutoff_kh']:.4f}")
    for venue, defs in out["venues"].items():
        print(f"\n== {venue}")
        for name, c in defs.items():
            a, v = c["adi_ci"], c["cv2_ci"]
            crosses = (a["ci_lo"] is not None
                       and a["ci_lo"] <= out["adi_cutoff_kh"] <= a["ci_hi"])
            print(f"   {name:<18} p={c['adi']:.4f} [{a['ci_lo']:.4f}, {a['ci_hi']:.4f}]"
                  f"   v={c['cv2']:.3f} [{v['ci_lo']:.3f}, {v['ci_hi']:.3f}]"
                  f"   {'CROSSES 4/3' if crosses else ''}")


# --------------------------------------------------------------------------- self-test

def self_test() -> int:
    """Both directions, on series whose p and v are known by hand before running."""
    rows, failures = [], []

    def check(name: str, got, want, tol=None) -> None:
        ok = (abs(got - want) <= tol) if tol is not None else (got == want)
        if not ok:
            failures.append(f"{name}: expected {want}{f' +/-{tol}' if tol else ''}, got {got}")
        rows.append(f"  {name:<40} want {want}  got {got if isinstance(got, int) else f'{got:.4f}'}"
                    f"  {'PASS' if ok else 'FAIL'}")

    # Every other day is a demand day, constant size: p = 2 exactly, v = 0 exactly.
    n = 210
    occ = np.zeros(n, dtype=bool)
    occ[::2] = True
    size = np.where(occ, 100.0, 0.0)
    point = _pattern(occ, size)
    check("periodic p is exactly 2", point["adi"], 2.0, tol=1e-12)
    check("constant sizes give v = 0", point["cv2"], 0.0, tol=1e-12)

    # A perfectly periodic series is preserved by 7-day blocks (7 is odd against period 2,
    # so blocks do shift phase) -- the interval must still be tight and contain the point.
    tight = bootstrap_pattern(occ, size, n_boot=500, seed=1)
    check("periodic interval contains its point",
          int(tight["adi_ci"]["ci_lo"] <= 2.0 <= tight["adi_ci"]["ci_hi"]), 1)
    width_tight = tight["adi_ci"]["ci_hi"] - tight["adi_ci"]["ci_lo"]

    # An irregular series with the SAME number of demand days must give a WIDER interval.
    rng = np.random.default_rng(7)
    occ_irr = np.zeros(n, dtype=bool)
    occ_irr[rng.choice(n, size=int(occ.sum()), replace=False)] = True
    size_irr = np.where(occ_irr, rng.lognormal(4.0, 1.0, n), 0.0)
    loose = bootstrap_pattern(occ_irr, size_irr, n_boot=500, seed=1)
    width_loose = loose["adi_ci"]["ci_hi"] - loose["adi_ci"]["ci_lo"]
    check("irregular interval is wider than periodic",
          int(width_loose > width_tight), 1)
    check("dispersed sizes give v > 0", int(loose["cv2"] > 0.5), 1)

    # A series with one demand day has no interval to quote, and must say so rather than
    # returning a number. This is the degenerate limb Ellel's sparsest cells approach.
    occ_one = np.zeros(40, dtype=bool)
    occ_one[3] = True
    degenerate = bootstrap_pattern(occ_one, np.where(occ_one, 5.0, 0.0), n_boot=200, seed=1)
    check("single demand day yields no p interval",
          int(degenerate["adi_ci"]["ci_lo"] is None), 1)

    # Same seed, same answer: the interval must not move between two identical calls.
    again = bootstrap_pattern(occ_irr, size_irr, n_boot=500, seed=1)
    check("seeded run reproduces exactly",
          int(again["adi_ci"] == loose["adi_ci"]), 1)

    print("=" * 68)
    print("INTERMITTENCY-INTERVALS SELF-TEST")
    print("=" * 68)
    print("\n".join(rows))
    if failures:
        print("\nSELF-TEST FAILED:")
        for f in failures:
            print("  - " + f)
        return 1
    print("\nSELF-TEST PASSED - exact on two hand-derived series, orders the irregular "
          "interval\nabove the periodic one, refuses an interval on a degenerate series, "
          "and reproduces\nunder its seed.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    out = run()
    _report(out)
    print(f"\nwrote {OUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
