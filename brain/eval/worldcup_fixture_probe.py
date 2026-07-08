"""G12.10e · Does the World Cup move sales? A report-only local validation.

Compares the Chronos-2 exo entrant WITH the four `wc_*` fixture covariates against
the same entrant WITHOUT them (all other covariates held equal), on a
June-inclusive backtest for Beer Hall and Ellel. Reports per-fold and mean MASE
(overall and restricted to the tournament window), a small per-feature ablation,
and a descriptive per-match-date table naming the England fixtures.

This touches no production path and no gate criteria; it is evidence for the
decision log and the Discussion. One June yields only a handful of England-match
dates, so any effect is LOW-POWERED and reported as directional evidence with the
dates named, never as a significant estimate.

Precondition: the local store's watermark must reach into June. If it does not
(the committed CSV seed ends 2026-05-31), the probe reports "June not present,
test deferred" and does NOT fabricate June rows.

Run (needs the forecast/eval venv with chronos):
    python -m eval.worldcup_fixture_probe
"""

from __future__ import annotations

import sys
from datetime import date

import numpy as np
import pandas as pd

import config
from eval import harness
from features.build_features import build_features
from ingest.world_cup import WC_FEATURE_COLS, read_world_cup_schedule
from models.foundation import CHRONOS2_EXO_COLS, HAS_CHRONOS, chronos2_exo_predict
from store.active_span import trim_to_active
from store.warehouse import connect

PROBE_VENUES = ("beer_hall", "ellel")
TOURNAMENT_START = pd.Timestamp("2026-06-11")
TOURNAMENT_END = pd.Timestamp("2026-07-19")
_JUNE = date(2026, 6, 1)

_BASE_COLS = [c for c in CHRONOS2_EXO_COLS if c not in WC_FEATURE_COLS]


def _store_reaches_june(con) -> date | None:
    row = con.execute(
        "SELECT MAX(date) FROM line_items WHERE venue='beer_hall'").fetchone()
    return row[0] if row and row[0] is not None else None


def _fold_mase(venue: str, feats: pd.DataFrame, exo_cols: list[str],
               restrict: tuple[pd.Timestamp, pd.Timestamp] | None = None) -> list[float]:
    out: list[float] = []
    for tr, te in harness.rolling_origin(feats, n_folds=6, horizon_days=7,
                                         min_train_days=120):
        if restrict is not None:
            te = te[(te["date"] >= restrict[0]) & (te["date"] <= restrict[1])]
            if te.empty:
                continue
        pred = chronos2_exo_predict(tr, te, venue=venue, exo_cols=exo_cols)
        out.append(harness.mase(te["value"].to_numpy(), pred,
                                tr["value"].to_numpy(), config.SEASONAL_PERIOD))
    return [v for v in out if np.isfinite(v)]


def _mean(vals: list[float]) -> float:
    return float(np.mean(vals)) if vals else float("nan")


def _descriptive_match_days(venue: str, feats: pd.DataFrame,
                            schedule: pd.DataFrame) -> list[str]:
    """For each in-store date with a match in trading hours, actual vs DOW-median
    vs (naively) the recent level, with the specific fixture named."""
    lines = ["", f"### {venue}: match-day descriptive (actual vs DOW-median)"]
    dow_median = feats.groupby(feats["date"].dt.dayofweek)["value"].median()
    match_days = feats[feats["wc_match_in_hours"] == 1]
    if match_days.empty:
        lines.append("_no in-store dates had a World Cup match within trading hours_")
        return lines
    sched = schedule.copy()
    sched["date"] = pd.to_datetime(sched["date"]).dt.normalize()
    lines += ["", "| date | dow | actual | DOW-median | Δ% | fixtures (in hours) |",
              "|---|---|---|---|---|---|"]
    for _, r in match_days.iterrows():
        d = pd.Timestamp(r["date"]).normalize()
        exp = float(dow_median.get(d.dayofweek, np.nan))
        delta = (r["value"] - exp) / exp * 100 if exp else float("nan")
        day_fx = sched[sched["date"] == d]
        names = "; ".join(f"{m['home']} v {m['away']} {m['kickoff_london'].strftime('%H:%M')}"
                          for _, m in day_fx.iterrows())
        lines.append(f"| {d.date()} | {d.day_name()[:3]} | {r['value']:.0f} | "
                     f"{exp:.0f} | {delta:+.0f}% | {names} |")
    return lines


def run() -> list[str]:
    out = ["# G12.10e · World Cup fixture probe (report-only)\n"]
    if not HAS_CHRONOS:
        out.append("Chronos backend absent; run from the forecast/eval venv. Deferred.")
        return out

    con = connect(read_only=True)
    try:
        latest = _store_reaches_june(con)
    finally:
        con.close()
    out.append(f"Local store watermark (beer_hall): {latest}.")
    if latest is None or latest < _JUNE:
        out.append("\n**June not present in this store, test deferred.** The committed "
                    "CSV seed ends 2026-05-31; June-onward data enters via the Neon "
                    "adapter (FLAG-INGEST-NEON). No June rows fabricated.")
        return out

    schedule = read_world_cup_schedule()
    for venue in PROBE_VENUES:
        feats = trim_to_active(build_features(venue), venue)
        with_wc = _fold_mase(venue, feats, list(CHRONOS2_EXO_COLS))
        without_wc = _fold_mase(venue, feats, _BASE_COLS)
        with_t = _fold_mase(venue, feats, list(CHRONOS2_EXO_COLS),
                            restrict=(TOURNAMENT_START, TOURNAMENT_END))
        without_t = _fold_mase(venue, feats, _BASE_COLS,
                              restrict=(TOURNAMENT_START, TOURNAMENT_END))
        out += [
            f"\n## {venue}",
            f"- with wc_*   : mean MASE {_mean(with_wc):.3f} (folds {len(with_wc)})",
            f"- without wc_*: mean MASE {_mean(without_wc):.3f} (folds {len(without_wc)})",
            f"- tournament-only with wc_*   : mean MASE {_mean(with_t):.3f} "
            f"(folds {len(with_t)})",
            f"- tournament-only without wc_*: mean MASE {_mean(without_t):.3f} "
            f"(folds {len(without_t)})",
        ]
        # Per-feature ablation: base + england-only vs base + full wc set.
        eng_only = _BASE_COLS + ["wc_england_in_hours"]
        with_eng = _fold_mase(venue, feats, eng_only)
        out.append(f"- ablation, base + wc_england_in_hours only: mean MASE "
                   f"{_mean(with_eng):.3f}")
        out += _descriptive_match_days(venue, feats, schedule)

    out += ["", "## Power caveat",
            "One June yields only a handful of England-match dates in trading hours, "
            "so this is DIRECTIONAL evidence, not a significant estimate. A fixture "
            "covariate that does not improve MASE is a valid outcome; the flag is "
            "retained as a candidate (consistent with the local_events stance)."]
    return out


def main() -> int:
    lines = run()
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
