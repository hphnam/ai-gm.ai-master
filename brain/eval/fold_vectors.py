"""S2 G17b - per-fold loss vectors from the step-1 rolling-origin ladder.

S3 needs the raw per-fold MASE and RMSSE vectors to compute a Model Confidence
Set, and they cost roughly an hour of Chronos time to regenerate, so they are
persisted rather than recomputed.

What a consumer must know before using them:

  1  **The windows overlap.** At `step_days=1` and a 7-day horizon, consecutive
     test windows share six of seven days, so loss differentials are strongly
     serially correlated. They are NOT independent draws and a naive t-test or
     an iid bootstrap over them is invalid. Use a block bootstrap, or an
     autocorrelation-robust variance, with a block length of at least the
     horizon.
  2  **Vectors are indexed, not merely ordered.** `fold_index` gives each value's
     position in `folds`. A rung that failed on some fold has a shorter vector,
     and pairing two rungs by list position alone would silently compare
     different windows. Use `aligned_pair` rather than zipping.
  3  **The scale is per fold.** Each fold's MASE and RMSSE denominator comes from
     that fold's own training slice, which is the correct ex-ante choice for a
     backtest. This is deliberately NOT the pinned `as_of` ruler the
     confrontation scripts needed (report 42 section 5, report 43).

Run:
    .venv-forecast/bin/python -m eval.fold_vectors            # all three venues
    .venv-forecast/bin/python -m eval.fold_vectors beer_hall  # one venue
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import config
from eval import harness

SCHEMA_VERSION = 1
OUT_DIR = config.BRAIN_DIR / "eval"
HORIZON_DAYS = 7
MIN_TRAIN_DAYS = 120
STEP_DAYS = 1


def path_for(venue: str) -> Path:
    return OUT_DIR / f"fold_vectors_L1_{venue}.json"


def fold_boundaries(
    venue: str,
    *,
    horizon_days: int = HORIZON_DAYS,
    min_train_days: int = MIN_TRAIN_DAYS,
    step_days: int | None = STEP_DAYS,
) -> list[dict]:
    """Train and test spans per fold, in yield order. Runs no model.

    `min_train_days` must match what `ladder.evaluate_rolling` uses internally, or
    the boundaries will not correspond to the vectors they are stored beside.
    """
    from models.ladder import _load_feats

    feats = _load_feats(venue)
    out = []
    for tr, te in harness.rolling_origin(
        feats, n_folds=None, horizon_days=horizon_days,
        min_train_days=min_train_days, step_days=step_days,
    ):
        out.append({
            "train_end": str(tr["date"].max().date()),
            "test_start": str(te["date"].min().date()),
            "test_end": str(te["date"].max().date()),
            "n_train": int(len(tr)),
            "n_test": int(len(te)),
        })
    return out


def build(venue: str, *, step_days: int | None = STEP_DAYS) -> dict:
    """Run the ladder at `step_days` and return the persistable payload."""
    from models import ladder

    started = time.time()
    results, n_folds = ladder.evaluate_rolling(
        venue, n_folds=None, horizon=HORIZON_DAYS, step_days=step_days)
    bounds = fold_boundaries(venue, step_days=step_days)
    if len(bounds) != n_folds:
        raise RuntimeError(
            f"{venue}: {len(bounds)} boundaries against {n_folds} scored folds; "
            "the boundary reconstruction does not match the evaluated folds")

    rungs = {}
    for r in results:
        if not r.metrics:
            rungs[r.name] = {"available": False, "note": r.note}
            continue
        m = r.metrics
        rungs[r.name] = {
            "available": True,
            "rung": r.rung,
            "fold_index": m["fold_index"],
            "mase": m["per_fold_mase"],
            "rmsse": m["per_fold_rmsse"],
            "summary": {k: m[k] for k in m if k.startswith(("mase_", "rmsse_"))},
        }
    return {
        "schema_version": SCHEMA_VERSION,
        "venue": venue,
        "basis": "calendar_lag7",
        "scale_policy": "per-fold training slice (ex-ante), not a pinned as_of",
        "horizon_days": HORIZON_DAYS,
        "min_train_days": MIN_TRAIN_DAYS,
        "step_days": step_days,
        "n_folds": n_folds,
        "windows_overlap": step_days is not None and step_days < HORIZON_DAYS,
        "independence_warning": (
            "Overlapping test windows: loss differentials are serially "
            "correlated. Use a block bootstrap with block length >= horizon_days; "
            "an iid bootstrap or a plain t-test over these folds is invalid."),
        "folds": bounds,
        "rungs": rungs,
        "wall_clock_s": round(time.time() - started, 1),
    }


def save(payload: dict) -> Path:
    p = path_for(payload["venue"])
    # allow_nan=False so a non-finite value in any per-fold vector fails loudly
    # here rather than serialising to the invalid-JSON token `NaN` that a strict
    # S3 parser would reject. The vectors are index-aligned by construction; this
    # guards the one way that could still put a nan into them.
    p.write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n")
    return p


def load(venue: str) -> dict:
    return json.loads(path_for(venue).read_text())


def aligned_pair(payload: dict, rung_a: str, rung_b: str,
                 metric: str = "mase") -> tuple[list[float], list[float]]:
    """The two rungs' losses on the folds BOTH scored, in fold order.

    The only safe way to difference two rungs: zipping the raw vectors pairs by
    list position, which silently compares different windows whenever one rung
    skipped a fold.
    """
    a, b = payload["rungs"][rung_a], payload["rungs"][rung_b]
    if not (a.get("available") and b.get("available")):
        raise ValueError(f"{rung_a} or {rung_b} has no vector for this venue")
    bi = dict(zip(b["fold_index"], b[metric], strict=True))
    pairs = [(va, bi[i])
             for i, va in zip(a["fold_index"], a[metric], strict=True) if i in bi]
    return [x for x, _ in pairs], [y for _, y in pairs]


def main(argv: list[str]) -> int:
    venues = argv[1:] or list(config.FORECAST_VENUES)
    for venue in venues:
        payload = build(venue)
        p = save(payload)
        scored = {k: v for k, v in payload["rungs"].items() if v.get("available")}
        print(f"{venue}: {payload['n_folds']} folds, {len(scored)} rungs scored, "
              f"{payload['wall_clock_s']}s -> {p.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
