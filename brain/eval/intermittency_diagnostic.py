"""WP2 · L3 intermittency diagnostic (fidelity corrections G2.1).

For every L3 item node the Beer Hall hierarchy builds, characterise the demand
pattern over the venue's TRADING days only, then classify each node as
intermittent or not. This is a diagnostic: it never fails. It informs whether
Croston / SBA is worth evaluating as a base forecaster (G2.2).

Trading days reuse the rule from signals.residual: a day counts only if the L1
units DOW-median for that weekday exceeds eps, so structurally-closed weekdays
(the Beer Hall's Mon/Tue) do not inflate the zero fraction.

Four statistics per node, over trading days:
  * n_days       number of trading days on the node's calendar
  * zero_fraction share of trading days with units = 0
  * ADI          average demand interval, the mean gap between successive
                 non-zero trading days
  * CV2          squared coefficient of variation of non-zero demand sizes

Classification: a node is intermittent when ADI >= 1.32, the Syntetos-Boylan-
Croston cutoff used throughout the intermittent-demand literature. (The full SBC
scheme also splits on CV2 = 0.49; we report CV2 but gate adoption on ADI alone,
as the spec directs.)

Run:
    python -m eval.intermittency_diagnostic
"""

from __future__ import annotations

import sys

import numpy as np
import pandas as pd

from config import ANCHOR_VENUE, STORE_DIR
from hierarchy.reconcile import build_hierarchy
from store.warehouse import connect, read_series

RESULTS_MD = STORE_DIR.parent / "eval" / "intermittency_diagnostic.md"
ADI_INTERMITTENT_CUTOFF = 1.32
_EPS = 1e-6


def trading_dows(venue: str, con=None) -> set[int]:
    """Weekdays the venue trades: those whose L1 units DOW-median exceeds eps
    (the signals.residual trading-day rule, evaluated on the whole series)."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        l1 = read_series(venue, "L1", value="units", fill_calendar=True, con=con)
    finally:
        if own:
            con.close()
    l1["date"] = pd.to_datetime(l1["date"])
    med = l1.groupby(l1["date"].dt.dayofweek)["value"].median()
    return {int(d) for d, m in med.items() if m > _EPS}


def _node_stats(series: pd.Series, dows: set[int]) -> dict:
    mask = pd.Series(series.index.dayofweek, index=series.index).isin(dows)
    td = series[mask].to_numpy(float)
    n_days = int(len(td))
    if n_days == 0:
        return {"n_days": 0, "zero_fraction": float("nan"),
                "adi": float("nan"), "cv2": float("nan")}
    nonzero = td > _EPS
    zero_fraction = float(1.0 - nonzero.mean())
    pos = np.flatnonzero(nonzero)
    adi = float(np.mean(np.diff(pos))) if pos.size > 1 else float("nan")
    sizes = td[nonzero]
    cv2 = (float((sizes.std(ddof=1) / sizes.mean()) ** 2)
           if sizes.size > 1 and sizes.mean() > 0 else float("nan"))
    return {"n_days": n_days, "zero_fraction": zero_fraction, "adi": adi, "cv2": cv2}


def diagnose(venue: str = ANCHOR_VENUE, top_k: int = 3) -> list[dict]:
    """One classified row per L3 item node in the venue's hierarchy."""
    con = connect(read_only=True)
    try:
        dows = trading_dows(venue, con=con)
    finally:
        con.close()
    node_series, _S, _nodes, bottom_nodes, _cat = build_hierarchy(venue, top_k)

    rows = []
    for node in bottom_nodes:
        stats = _node_stats(node_series[node], dows)
        adi = stats["adi"]
        intermittent = bool(np.isfinite(adi) and adi >= ADI_INTERMITTENT_CUTOFF)
        rows.append({"node": node, "is_other": node.endswith("::OTHER"),
                     "intermittent": intermittent, **stats})
    return rows


def intermittent_nodes(venue: str = ANCHOR_VENUE, top_k: int = 3) -> list[str]:
    """Non-OTHER L3 nodes classified intermittent (ADI >= 1.32) — the trigger
    set for the conditional Croston/SBA comparison (G2.2)."""
    return [r["node"] for r in diagnose(venue, top_k)
            if r["intermittent"] and not r["is_other"]]


def _fmt(x: float) -> str:
    return "n/a" if not np.isfinite(x) else f"{x:.2f}"


def _write_report(venue: str, rows: list[dict], dows: set[int]) -> None:
    RESULTS_MD.parent.mkdir(parents=True, exist_ok=True)
    dow_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    trading = ", ".join(dow_names[d] for d in sorted(dows))
    n_int = sum(1 for r in rows if r["intermittent"])
    n_int_nonother = sum(1 for r in rows if r["intermittent"] and not r["is_other"])
    lines = [
        f"# WP2 · L3 intermittency diagnostic ({venue})\n",
        "Demand-pattern characterisation for every L3 item node the Beer Hall "
        "hierarchy builds, over the venue's trading days only. Diagnostic only: "
        "it informs the conditional Croston/SBA evaluation (G2.2), it cannot fail.\n",
        f"Trading days: **{trading}** (L1 units DOW-median > eps). "
        f"Intermittency cutoff: **ADI >= {ADI_INTERMITTENT_CUTOFF}** "
        "(Syntetos-Boylan-Croston).\n",
        "| Node | n_days | zero_fraction | ADI | CV2 | Intermittent |",
        "|---|---|---|---|---|---|",
    ]
    for r in rows:
        lines.append(
            f"| {r['node']} | {r['n_days']} | {_fmt(r['zero_fraction'])} | "
            f"{_fmt(r['adi'])} | {_fmt(r['cv2'])} | "
            f"{'yes' if r['intermittent'] else 'no'} |")
    lines += [
        f"\n**{n_int} of {len(rows)}** item nodes classify as intermittent "
        f"(ADI >= {ADI_INTERMITTENT_CUTOFF}); **{n_int_nonother}** of those are "
        "non-OTHER nodes. Per G2.2, a non-zero non-OTHER count triggers the "
        "conditional Croston/SBA comparison in hierarchy/reconcile.py; adoption "
        "stays strictly by the held-out MASE rule, per node.",
    ]
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    venue = ANCHOR_VENUE
    print(f"WP2 · intermittency diagnostic ({venue})")
    con = connect(read_only=True)
    try:
        dows = trading_dows(venue, con=con)
    finally:
        con.close()
    rows = diagnose(venue)
    n_int_nonother = sum(1 for r in rows if r["intermittent"] and not r["is_other"])
    for r in rows:
        print(f"  {r['node'][:44]:44s} ADI={_fmt(r['adi'])} "
              f"zf={_fmt(r['zero_fraction'])} "
              f"{'INTERMITTENT' if r['intermittent'] else ''}")
    _write_report(venue, rows, dows)
    print(f"  report            : {RESULTS_MD}")
    print(f"  non-OTHER intermittent nodes: {n_int_nonother} "
          f"(triggers G2.2 Croston/SBA comparison)" if n_int_nonother
          else "  no non-OTHER intermittent nodes (DOW-median stands, G2.2 skipped)")
    print("WP2-diagnostic RESULT: PASS (diagnostic computed for all L3 nodes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
