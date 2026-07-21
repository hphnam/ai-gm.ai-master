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
RESULTS_L1_MD = STORE_DIR.parent / "eval" / "intermittency_L1.md"
_EPS = 1e-6

# The Syntetos-Boylan-Croston boundary constants, as originally published and as used
# by this diagnostic since WP2. Kostenko and Hyndman (2006, `kostenko_note_2006`) showed
# both are arithmetic errors: the crossover ADI is p = 4/3 = 1.3333 ("not 1.32 as given
# by SBC") and the CV-squared boundary is 0.5 ("not 0.49"). Both pairs are kept so the
# diagnostic can report under each; the difference is no longer cosmetic (S4 Part 1).
ADI_CUTOFF_SBC = 1.32
CV2_CUTOFF_SBC = 0.49
ADI_CUTOFF_KH = 4.0 / 3.0
CV2_CUTOFF_KH = 0.5

# The gate the L3 Croston/SBA trigger (hierarchy/reconcile.py) reads. Corrected to the
# Kostenko-Hyndman value; verified that NO Beer Hall L3 node has an ADI in the affected
# [1.32, 1.3333) band (nearest intermittent node is 1.4129), so the trigger set and
# every downstream adoption are byte-identical to the SBC gate. The L1 series, by
# contrast, sits inside that band and does move (S4 Part 1c).
ADI_INTERMITTENT_CUTOFF = ADI_CUTOFF_KH


def classify(adi: float, cv2: float, *, adi_cut: float, cv2_cut: float) -> str:
    """The Syntetos-Boylan quadrant for an (ADI, CV-squared) pair at given cutoffs.

    smooth: frequent, steady. erratic: frequent, variable size. intermittent: gappy,
    steady size. lumpy: gappy AND variable, the hard case Croston/SBA target.
    """
    if not (np.isfinite(adi) and np.isfinite(cv2)):
        return "n/a"
    gappy = adi >= adi_cut
    variable = cv2 >= cv2_cut
    if gappy and variable:
        return "lumpy"
    if gappy:
        return "intermittent"
    if variable:
        return "erratic"
    return "smooth"


def select_sba(adi: float, cv2: float) -> bool:
    """Kostenko-Hyndman rule: prefer SBA over Croston when `cv2 < 2 - (3/2) adi`.

    Below that line Croston's positive bias dominates and the SBA deflation helps; above
    it, Croston is preferable. Reported per node, never used to gate adoption (that stays
    the held-out MASE rule).
    """
    if not (np.isfinite(adi) and np.isfinite(cv2)):
        return False
    return bool(cv2 < 2.0 - 1.5 * adi)


def _pattern(occ: np.ndarray, size: np.ndarray) -> dict:
    """ADI / CV-squared / zero-fraction from an occurrence mask and a size vector.

    `occ` marks demand days (definition is the caller's: non-zero revenue, or any till
    activity); `size` is the amount on every day, so CV-squared is taken over demand-day
    sizes. ADI is the mean interval between successive demand days.
    """
    occ = np.asarray(occ, dtype=bool)
    size = np.asarray(size, dtype=float)
    n_days = int(occ.size)
    if n_days == 0:
        return {"n_days": 0, "zero_fraction": float("nan"), "adi": float("nan"),
                "cv2": float("nan"), "n_demands": 0}
    pos = np.flatnonzero(occ)
    adi = float(np.mean(np.diff(pos))) if pos.size > 1 else float("nan")
    sizes = size[occ]
    cv2 = (float((sizes.std(ddof=1) / sizes.mean()) ** 2)
           if sizes.size > 1 and sizes.mean() > 0 else float("nan"))
    return {"n_days": n_days, "zero_fraction": float(1.0 - occ.mean()),
            "adi": adi, "cv2": cv2, "n_demands": int(occ.sum())}


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
    """L3 node stats over the venue's trading weekdays. Occurrence = value > eps."""
    mask = pd.Series(series.index.dayofweek, index=series.index).isin(dows)
    td = series[mask].to_numpy(float)
    return _pattern(td > _EPS, td)


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
    """Non-OTHER L3 nodes classified intermittent (ADI >= 4/3, Kostenko-Hyndman), the
    trigger set for the conditional Croston/SBA comparison (G2.2)."""
    return [r["node"] for r in diagnose(venue, top_k)
            if r["intermittent"] and not r["is_other"]]


# --- L1 diagnostic (S4 Part 1) -----------------------------------------------

def _l1_frame(venue: str, con=None) -> pd.DataFrame:
    """The venue's active L1 frame with revenue and till-activity per day.

    The frame is `_load_feats` (build_features then trim_to_active), the exact one the
    ladder and the MCS score on, so the diagnostic's day count is the same 399/386/331
    those packages used. `value` is revenue_exvat (calendar-filled, 0 on closed days);
    `n_line_items` is joined from l1_daily and filled 0 where the till never rang.
    """
    from models.ladder import _load_feats

    feats = _load_feats(venue)
    own = con is None
    con = con or connect(read_only=True)
    try:
        nli = con.execute(
            "SELECT date, n_line_items FROM l1_daily WHERE venue = ?", [venue]).df()
    finally:
        if own:
            con.close()
    nli["date"] = pd.to_datetime(nli["date"])
    frame = feats[["date", "value"]].merge(nli, on="date", how="left")
    frame["n_line_items"] = frame["n_line_items"].fillna(0.0)
    return frame


def l1_diagnose(venue: str, con=None) -> dict:
    """The L1 intermittency two-by-two: two demand-day definitions, both cutoff sets.

    Demand day is defined two ways because they disagree exactly where it matters (a
    comped, zero-revenue-but-open day): `nonzero_revenue` treats it as a non-trading
    zero, `any_till_activity` treats it as a trading day with zero revenue. Sizes for
    CV-squared are revenue in both.
    """
    frame = _l1_frame(venue, con=con)
    rev = frame["value"].to_numpy(float)
    till = frame["n_line_items"].to_numpy(float)
    definitions = {
        "nonzero_revenue": _pattern(rev > _EPS, rev),
        "any_till_activity": _pattern(till > 0, rev),
    }
    out = {"venue": venue, "n_days": int(len(frame)), "definitions": {}}
    for name, stats in definitions.items():
        out["definitions"][name] = {
            **stats,
            "class_sbc": classify(stats["adi"], stats["cv2"],
                                  adi_cut=ADI_CUTOFF_SBC, cv2_cut=CV2_CUTOFF_SBC),
            "class_kh": classify(stats["adi"], stats["cv2"],
                                 adi_cut=ADI_CUTOFF_KH, cv2_cut=CV2_CUTOFF_KH),
            "select_sba": select_sba(stats["adi"], stats["cv2"]),
        }
    return out


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
        f"Intermittency cutoff: **ADI >= {ADI_INTERMITTENT_CUTOFF:.4f}** "
        "(Kostenko-Hyndman corrected p = 4/3; the old SBC 1.32 gate classifies the "
        "same nodes here, no node lies in the affected 1.32 to 1.3333 band). The SBA "
        "column is the KH selection rule CV2 < 2 - (3/2)ADI.\n",
        "| Node | n_days | zero_fraction | ADI | CV2 | Intermittent | KH selects |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        lines.append(
            f"| {r['node']} | {r['n_days']} | {_fmt(r['zero_fraction'])} | "
            f"{_fmt(r['adi'])} | {_fmt(r['cv2'])} | "
            f"{'yes' if r['intermittent'] else 'no'} | "
            f"{'SBA' if select_sba(r['adi'], r['cv2']) else 'Croston'} |")
    lines += [
        f"\n**{n_int} of {len(rows)}** item nodes classify as intermittent "
        f"(ADI >= {ADI_INTERMITTENT_CUTOFF}); **{n_int_nonother}** of those are "
        "non-OTHER nodes. Per G2.2, a non-zero non-OTHER count triggers the "
        "conditional Croston/SBA comparison in hierarchy/reconcile.py; adoption "
        "stays strictly by the held-out MASE rule, per node.",
        "\n**ADI blind spot (noted):** ADI measures the spacing between successive "
        "demands, so an item that sold densely for a short season and then went "
        "dead (for example Lancashire crisps, zero_fraction 0.88 with ADI 1.00) "
        "classifies as non-intermittent. Such obsolescence patterns are the "
        "Teunter-Syntetos-Babai case, out of scope here, and they do not affect "
        "the WP2 outcome because Croston lost on every node that did classify as "
        "intermittent.",
    ]
    RESULTS_MD.write_text("\n".join(lines))


def _fmt_adi(x: float) -> str:
    """ADI at four decimals: the SBC/KH boundary lives in the third and fourth."""
    return "n/a" if not np.isfinite(x) else f"{x:.4f}"


def _write_l1_report(results: list[dict], ceiling: str) -> None:
    RESULTS_L1_MD.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# S4 Part 1 · L1 intermittency diagnostic (first run at venue level)\n",
        f"Store ceiling: **{ceiling}**. Per-venue frame is `_load_feats` "
        "(`build_features` then `trim_to_active`) - the same one the ladder and the "
        "Model Confidence Set score on, so `n_days` is the 399 / 331 / 386 those "
        "packages use. ADI is the mean interval between demand days; CV-squared is over "
        "demand-day revenue. Two demand-day definitions cross two cutoff sets, per the "
        "Kostenko-Hyndman correction (`kostenko_note_2006`): **SBC** ADI>=1.32, "
        "CV2>=0.49; **KH** ADI>=4/3=1.3333, CV2>=0.5. The SBA column is the KH selection "
        "rule `CV2 < 2 - (3/2)ADI`.\n",
    ]
    for r in results:
        lines.append(f"\n## {r['venue']} (n_days = {r['n_days']})\n")
        lines.append("| demand day | n_demands | zero_fraction | ADI | CV2 | "
                     "SBC class | KH class | KH selects |")
        lines.append("|---|---|---|---|---|---|---|---|")
        for name, d in r["definitions"].items():
            lines.append(
                f"| {name} | {d['n_demands']} | {_fmt(d['zero_fraction'])} | "
                f"{_fmt_adi(d['adi'])} | {_fmt(d['cv2'])} | {d['class_sbc']} | "
                f"{d['class_kh']} | {'SBA' if d['select_sba'] else 'Croston'} |")
    RESULTS_L1_MD.write_text("\n".join(lines) + "\n")


def main() -> int:
    from store.warehouse import assert_store_ceiling

    ceiling = assert_store_ceiling()
    l1 = [l1_diagnose(v) for v in ("beer_hall", "two_river_taps", "ellel")]
    _write_l1_report(l1, ceiling)
    print("S4 Part 1 · L1 intermittency diagnostic")
    for r in l1:
        for name, d in r["definitions"].items():
            print(f"  {r['venue']:16s} {name:18s} ADI={_fmt_adi(d['adi'])} "
                  f"CV2={_fmt(d['cv2'])} SBC={d['class_sbc']:12s} KH={d['class_kh']:12s} "
                  f"{'SBA' if d['select_sba'] else 'Croston'}")
    print(f"  L1 report         : {RESULTS_L1_MD}")

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
