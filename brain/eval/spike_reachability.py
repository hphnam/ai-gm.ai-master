#!/usr/bin/env python3
"""Why the spike cell is the weak cell: a reachability audit of the injection grid.

`agent_eval.py` reports spike recall 0.573 against 0.996 for regime shifts, and 123
of the estate's 124 misses are spikes. Chapter 4 attributed that to the cumulative-sum
detector needing several observations. **That explanation cannot be the operative one**,
because `agent_eval.item_covers` allows a spike truth to be covered by a `deviation`
signal ONLY -- the change-point limb is excluded from spike scoring by construction, so
CUSUM's persistence gate never gets a vote on a spike either way.

The operative cause is a window. `agent_eval._signals_from_stream` classifies
`stream.tail(config.DEV_SCAN_WINDOW)` and nothing earlier, so the deviation limb examines
the last 14 TRADING days of the injected stream. A spike whose onset lies further back
than that is never looked at, and no magnitude recovers it -- which is why the sensitivity
curve plateaus instead of converging to one.

This tool computes, per venue and per fold, which of the three onset positions
(`early`, `mid`, `late`) fall inside that window, and turns the answer into a predicted
ceiling on the spike catch rate. It then reads the observed high-magnitude plateau out of
`agent_eval.json` and compares the two.

The comparison is the test, and it is a test in BOTH directions per PRJ93_RULES.md ("a
hypothesis about an instrument's defect is tested against the cases it says are CLEAN as
well as the ones it says are broken"): the hypothesis must put Ellel at a ceiling of one
and the other two below it, or it is wrong.

    ./spike_reachability.py                 # audit against the live store
    ./spike_reachability.py --self-test     # fixture, no store, both directions

Reads only. It builds fold boundaries and counts days; it fits no model, scores no
injection and writes nothing into the evaluation artefacts.
"""

import argparse
import json
import sys
from pathlib import Path

BRAIN_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BRAIN_ROOT.parent
# warehouse.py and its siblings import `config` as a top-level name, so brain/ has to be
# on the path as well as the repo root that carries the `brain.` package.
for _p in (str(REPO_ROOT), str(BRAIN_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import config  # noqa: E402

ARTEFACT = Path(__file__).resolve().parent / "agent_eval.json"

# inject.build_scaled_corpus iterates z-grid x onset x direction per usable fold.
ONSET_POSITIONS = config.EVAL_SCALED_ONSETS
DIRECTIONS = ("down", "up")


def onset_index(n_test: int, position: str) -> int:
    """inject._position_offset, reproduced so this audit does not depend on a private
    name. Kept in sync by test_matches_injector below, which asserts the two agree."""
    if position == "mid":
        return n_test // 2
    if position == "late":
        return max(0, n_test - 4)
    return 3    # inject._ONSET_OFFSET_DAYS


def fold_reachability(n_test: int, scan_window: int) -> dict[str, bool]:
    """Which onset positions land inside the deviation limb's scan window.

    The limb reads `stream.tail(scan_window)`, so index i of a test window of length
    n_test is examined exactly when i >= n_test - scan_window.
    """
    first_examined = max(0, n_test - scan_window)
    return {p: onset_index(n_test, p) >= first_examined for p in ONSET_POSITIONS}


def audit_venue(fold_lengths: list[int], scan_window: int) -> dict:
    """Predicted ceiling on the spike catch rate for one venue.

    Every (fold, magnitude, onset, direction) cell is one injection. A cell whose onset
    is outside the window is unreachable at every magnitude, so the ceiling is the
    reachable share -- and because magnitude cannot move it, the observed curve should
    FLATTEN there rather than approach one.
    """
    n_mag = len(config.EVAL_INJECT_Z_GRID)
    per_fold = []
    reachable = unreachable = 0
    for n_test in fold_lengths:
        reach = fold_reachability(n_test, scan_window)
        hit = sum(reach.values())
        reachable += hit * n_mag * len(DIRECTIONS)
        unreachable += (len(ONSET_POSITIONS) - hit) * n_mag * len(DIRECTIONS)
        per_fold.append({"n_test_trading_days": n_test,
                         "first_examined_index": max(0, n_test - scan_window),
                         "onset_index": {p: onset_index(n_test, p) for p in ONSET_POSITIONS},
                         "reachable": reach})
    total = reachable + unreachable
    return {"per_fold": per_fold, "n_injections": total,
            "reachable": reachable, "unreachable": unreachable,
            "predicted_ceiling": reachable / total if total else float("nan")}


def observed_plateau(artefact: dict, venue: str) -> float:
    """The spike catch rate at the largest injected magnitude, from agent_eval.json."""
    curve = artefact["detection"]["sensitivity"]["spike"][venue]
    return max(curve, key=lambda p: p["mag"])["rate"]


def measure_fold_lengths(con) -> dict[str, list[int]]:
    """Test-window lengths in TRADING days, from the same fold builder the scaled
    corpus uses. Import is local so --self-test needs neither store nor eval venv."""
    from brain.eval import inject
    from brain.eval.agent_eval import _usable_folds

    out = {}
    for venue in ("beer_hall", "two_river_taps", "ellel"):
        stream = inject.base_stream(venue, con=con)
        out[venue] = [len(test) for _train, test in _usable_folds(venue, stream, con)]
    return out


def report(fold_lengths: dict[str, list[int]], artefact: dict | None,
           scan_window: int) -> tuple[dict, bool]:
    rows = {}
    for venue, lengths in fold_lengths.items():
        row = audit_venue(lengths, scan_window)
        if artefact is not None:
            row["observed_plateau"] = observed_plateau(artefact, venue)
            row["agrees"] = abs(row["observed_plateau"] - row["predicted_ceiling"]) < 1e-9
        rows[venue] = row

    n_scanned = sum(len(v) for v in fold_lengths.values())
    print(f"scanned {n_scanned} folds across {len(fold_lengths)} venues; "
          f"DEV_SCAN_WINDOW={scan_window} trading days")
    if n_scanned == 0:
        # A check that examined nothing must not be able to report a clean result.
        print("VERDICT: FAIL - no folds examined")
        return rows, False

    print(f"{'venue':16s} {'folds':>5s} {'inj':>5s} {'unreach':>7s} "
          f"{'ceiling':>8s} {'observed':>9s}")
    ok = True
    for venue, row in rows.items():
        obs = row.get("observed_plateau")
        obs_s = f"{obs:.3f}" if obs is not None else "n/a"
        print(f"{venue:16s} {len(row['per_fold']):5d} {row['n_injections']:5d} "
              f"{row['unreachable']:7d} {row['predicted_ceiling']:8.3f} {obs_s:>9s}")
        if artefact is not None and not row["agrees"]:
            ok = False

    if artefact is not None:
        distinct = {round(r["predicted_ceiling"], 6) for r in rows.values()}
        if len(distinct) < 2:
            # A hypothesis predicting the same value everywhere has not been tested.
            print("VERDICT: FAIL - the prediction does not discriminate between venues")
            ok = False
        print(f"VERDICT: {'PASS' if ok else 'FAIL'} - predicted ceilings "
              f"{'match' if ok else 'DISAGREE WITH'} the observed plateaux")
    return rows, ok


def self_test() -> int:
    """Both directions, against hand-derived expectations. No store, no artefact."""
    failures = []

    # Direction 1, the defect: a 20-day window with a 14-day scanner examines from
    # index 6, so early (3) is outside and mid (10) and late (16) are inside.
    got = fold_reachability(20, 14)
    if got != {"early": False, "mid": True, "late": True}:
        failures.append(f"20/14 reachability {got}")
    if abs(audit_venue([20], 14)["predicted_ceiling"] - 2 / 3) > 1e-9:
        failures.append("20/14 ceiling is not 2/3")

    # Direction 2, the clean case: a window no longer than the scanner examines all of
    # itself, so every onset is reachable and the ceiling is one.
    got = fold_reachability(4, 14)
    if got != {"early": True, "mid": True, "late": True}:
        failures.append(f"4/14 reachability {got}")
    if abs(audit_venue([4], 14)["predicted_ceiling"] - 1.0) > 1e-9:
        failures.append("4/14 ceiling is not 1")

    # The empty scan must not read as a clean result.
    _rows, ok = report({}, None, 14)
    if ok:
        failures.append("empty fold set reported a clean result")

    # onset_index must agree with the injector it reproduces.
    try:
        from brain.eval.inject import _position_offset
        import pandas as pd
        for n in (4, 7, 20, 25, 28):
            test = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=n)})
            for p in ONSET_POSITIONS:
                if _position_offset(test, p) != onset_index(n, p):
                    failures.append(f"onset_index disagrees with injector at n={n}, {p}")
    except ImportError:
        print("note: inject not importable, onset_index cross-check skipped")

    for f in failures:
        print("FAIL:", f)
    print("SELF-TEST:", "PASS" if not failures else f"FAIL ({len(failures)})")
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--self-test", action="store_true", help="fixture run, no store")
    ap.add_argument("--json", metavar="PATH", help="write the audit rows here")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    from brain.store import warehouse
    con = warehouse.connect()
    fold_lengths = measure_fold_lengths(con)
    artefact = json.loads(ARTEFACT.read_text()) if ARTEFACT.exists() else None
    if artefact is None:
        print(f"note: {ARTEFACT} absent, predictions reported without comparison")
    rows, ok = report(fold_lengths, artefact, config.DEV_SCAN_WINDOW)

    if args.json:
        Path(args.json).write_text(json.dumps(
            {"artefact": "spike_reachability",
             "dev_scan_window": config.DEV_SCAN_WINDOW,
             "z_grid": list(config.EVAL_INJECT_Z_GRID),
             "onsets": list(ONSET_POSITIONS),
             "venues": rows}, indent=1))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
