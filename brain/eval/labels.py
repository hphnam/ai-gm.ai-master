"""Human-labelled anchor set (spec §3).

A small labelling protocol over real briefing days, so the "useful to act on" axis
rests on real judgment, not just synthetic events. For each sampled (day, venue,
item) a labeller records `keep` (worth surfacing) / `drop` (noise), a `priority_rank`,
and a free-text note; `missing` insights the briefing failed to surface are recorded
as their own rows with `verdict='missing'`.

This is an OFFLINE label store, not a live manager A/B trial — no real managers are
surveyed here; it is a small anchor a labeller fills in. Metrics against it are
reported with N and a confidence interval, and the honest caveat that N is small.

    eval_labels(day, venue, item_key, verdict, priority_rank, note, labeller)

CLI:
    python -m eval.labels --add --day 2026-05-31 --venue beer_hall \\
        --item-key "beer_hall:down:2026-05-20:change_point" --verdict keep \\
        --rank 1 --labeller nam --note "real dip, worth a look"
    python -m eval.labels --list
"""

from __future__ import annotations

import argparse
import sys

import numpy as np
import pandas as pd

import config
from store.warehouse import connect

_COLS = ["day", "venue", "item_key", "verdict", "priority_rank", "note", "labeller"]
_VERDICTS = ("keep", "drop", "missing")


def _ensure_table(con) -> None:
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS eval_labels (
            day DATE NOT NULL, venue VARCHAR NOT NULL, item_key VARCHAR NOT NULL,
            verdict VARCHAR NOT NULL, priority_rank INTEGER, note VARCHAR,
            labeller VARCHAR NOT NULL, created_at TIMESTAMP DEFAULT now()
        )
        """)


def _has_table(con, name: str) -> bool:
    return con.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_name=?", [name]).fetchone() is not None


def add_label(day, venue, item_key, verdict, *, priority_rank=None, note=None,
              labeller="anon", con=None) -> None:
    if verdict not in _VERDICTS:
        raise ValueError(f"verdict must be one of {_VERDICTS}, got {verdict!r}")
    own = con is None
    con = con or connect()
    try:
        _ensure_table(con)
        con.execute(
            "INSERT INTO eval_labels (day, venue, item_key, verdict, priority_rank, "
            "note, labeller) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [str(day), venue, item_key, verdict,
             int(priority_rank) if priority_rank is not None else None, note, labeller])
    finally:
        if own:
            con.close()


def load_labels(con=None) -> pd.DataFrame:
    own = con is None
    con = con or connect(read_only=True)
    try:
        if not _has_table(con, "eval_labels"):
            return pd.DataFrame(columns=_COLS)
        return con.execute(
            "SELECT day, venue, item_key, verdict, priority_rank, note, labeller "
            "FROM eval_labels").df()
    finally:
        if own:
            con.close()


# --- Metrics against the anchor ----------------------------------------------

def cohen_kappa(a: list[str], b: list[str]) -> float:
    """Cohen's kappa on two labellers' aligned keep/drop verdicts."""
    a, b = list(a), list(b)
    n = len(a)
    if n == 0:
        return float("nan")
    cats = sorted(set(a) | set(b))
    po = sum(1 for x, y in zip(a, b) if x == y) / n
    pe = sum((a.count(c) / n) * (b.count(c) / n) for c in cats)
    return float((po - pe) / (1 - pe)) if pe < 1 else 1.0


def inter_rater(labels: pd.DataFrame) -> dict:
    """Kappa between the first two labellers on the items both judged keep/drop."""
    kd = labels[labels["verdict"].isin(("keep", "drop"))]
    labellers = list(dict.fromkeys(kd["labeller"].tolist()))
    if len(labellers) < 2:
        return {"available": False, "kappa": None, "n_shared": 0}
    l1, l2 = labellers[:2]
    m1 = kd[kd["labeller"] == l1].set_index(["day", "venue", "item_key"])["verdict"]
    m2 = kd[kd["labeller"] == l2].set_index(["day", "venue", "item_key"])["verdict"]
    shared = m1.index.intersection(m2.index)
    if len(shared) == 0:
        return {"available": False, "kappa": None, "n_shared": 0}
    k = cohen_kappa(m1.loc[shared].tolist(), m2.loc[shared].tolist())
    return {"available": True, "kappa": round(k, 3), "n_shared": int(len(shared)),
            "labellers": [l1, l2]}


def score_against(labels: pd.DataFrame, surfaced_keys: set[str]) -> dict:
    """Precision/recall/F1 of the briefing's surfaced set vs the human keep/drop
    anchor. keep = the item should be surfaced (positive)."""
    from eval.agent_eval import prf, wilson
    kd = labels[labels["verdict"].isin(("keep", "drop"))]
    tp = sum(1 for _, r in kd.iterrows() if r["verdict"] == "keep" and r["item_key"] in surfaced_keys)
    fn = sum(1 for _, r in kd.iterrows() if r["verdict"] == "keep" and r["item_key"] not in surfaced_keys)
    fp = sum(1 for _, r in kd.iterrows() if r["verdict"] == "drop" and r["item_key"] in surfaced_keys)
    missing = int((labels["verdict"] == "missing").sum())
    m = prf(tp, fp, fn)
    m["f1_ci"] = wilson(tp, tp + fp + fn)     # rough CI on the positive-agreement rate
    m["missing_insights"] = missing
    return m


def score_report(con=None) -> dict:
    """Summary consumed by the report. Honest zero-state when no labels exist yet."""
    labels = load_labels(con=con)
    n = int(len(labels))
    if n == 0:
        return {"status": "no labels yet", "n": 0, "summary": "",
                "inter_rater": {"available": False}}
    irr = inter_rater(labels)
    keep = int((labels["verdict"] == "keep").sum())
    drop = int((labels["verdict"] == "drop").sum())
    missing = int((labels["verdict"] == "missing").sum())
    kappa = f", inter-rater kappa {irr['kappa']} (n={irr['n_shared']})" if irr["available"] else ""
    return {"status": "labelled", "n": n, "inter_rater": irr,
            "summary": f"{keep} keep / {drop} drop / {missing} missing{kappa}. "
                       "Small N — read the CI, not the point estimate."}


# --- B1: stratified day sampler ----------------------------------------------

_STRATA = ("quiet", "deviation", "change_point", "stock")


def _day_strata(venue: str, con) -> dict:
    """Assign each of the venue's trading days to ONE stratum (change-point > stock >
    deviation > quiet), plus any stock-reorder snapshot day. Read-only over the signals."""
    from signals import change_point as cp
    from signals.deviation import _classify
    from signals.residual import build_residual_stream

    strata: dict = {}
    for _, r in build_residual_stream(venue, con=con).iterrows():
        d = pd.Timestamp(r["date"]).date()
        strata[d] = "deviation" if _classify(float(r["z"]))[0] == "deviation" else "quiet"
    try:
        cpdf = cp.detect(venue, con=con)
        for _, r in cpdf.iterrows():
            d = r["onset_date"] if hasattr(r["onset_date"], "isoformat") else pd.Timestamp(r["onset_date"]).date()
            strata[d] = "change_point"
    except Exception:      # pragma: no cover - detector unavailable for a venue
        pass
    if venue in config.VENUES_WITH_STOCK and _has_table(con, "stock_cover"):
        for (as_of,) in con.execute(
                "SELECT DISTINCT as_of FROM stock_cover WHERE venue=? AND reorder_flag=TRUE",
                [venue]).fetchall():
            strata[pd.Timestamp(as_of).date()] = "stock"
    return strata


def sample_days(n_per_stratum: int = 5, seed: int | None = None, con=None) -> pd.DataFrame:
    """A deterministic stratified sample of (day, venue) across quiet / deviation /
    change-point / stock strata, so the labelled set is neither all quiet nor all noise.
    Sparse strata return fewer than requested — the achieved N is reported, not padded."""
    seed = seed if seed is not None else config.EVAL_SCALED_SEED
    rng = np.random.default_rng(seed)
    own = con is None
    con = con or connect(read_only=True)
    try:
        rows = []
        for venue in config.FORECAST_VENUES:
            by: dict = {}
            for d, st in _day_strata(venue, con).items():
                by.setdefault(st, []).append(d)
            for st, days in by.items():
                days = sorted(days)
                if len(days) > n_per_stratum:
                    idx = sorted(rng.choice(len(days), n_per_stratum, replace=False))
                    days = [days[i] for i in idx]
                for d in days:
                    rows.append({"day": d.isoformat(), "venue": venue, "stratum": st})
        return pd.DataFrame(rows, columns=["day", "venue", "stratum"])
    finally:
        if own:
            con.close()


def sample_report(sample: pd.DataFrame) -> dict:
    """Achieved N per stratum (sparse venues will be small — say so)."""
    if sample.empty:
        return {"total": 0, "per_stratum": {}, "per_venue": {}}
    return {"total": int(len(sample)),
            "per_stratum": sample.groupby("stratum").size().to_dict(),
            "per_venue": sample.groupby("venue").size().to_dict()}


# --- B2: two-pass labelling instrument ---------------------------------------

def render_raw_day(day, venue: str, con=None) -> str:
    """The raw numbers a labeller forms an independent view from BEFORE seeing the
    briefing (pass 1) — the anti-anchoring half of the instrument."""
    from signals.residual import build_residual_stream
    own = con is None
    con = con or connect(read_only=True)
    try:
        stream = build_residual_stream(venue, con=con)
        target = pd.Timestamp(day).normalize()
        row = stream[stream["date"].dt.normalize() == target]
        head = f"{venue} · {pd.Timestamp(day).date()}"
        if row.empty:
            return f"{head}: no trading-day record (closed / non-trading)."
        r = row.iloc[-1]
        return (f"{head}: actual £{float(r['actual']):,.0f} vs expected "
                f"£{float(r['expected']):,.0f} (band ±£{float(r['scale']):,.0f}, "
                f"z={float(r['z']):+.2f}).")
    finally:
        if own:
            con.close()


def briefing_items_for(day, venue: str, con=None) -> list[dict]:
    """The briefing's items for (day, venue), revealed in pass 2 for keep/drop/rank."""
    from signals.briefing import build
    own = con is None
    con = con or connect(read_only=True)
    try:
        env = build(as_of=pd.Timestamp(day).date(), venues=[venue], con=con)
        return env["items"]
    finally:
        if own:
            con.close()


def label_day(day, venue: str, labeller: str, con=None) -> None:  # pragma: no cover - interactive
    """Two-pass interactive labelling for one (day, venue): pass 1 shows the raw day and
    captures any MISSING insight (finds false negatives before anchoring); pass 2 reveals
    the briefing's items and captures keep/drop + priority. Writes to `eval_labels`."""
    print("\n" + "=" * 70)
    print("PASS 1 — raw day (form your own view before seeing the briefing)")
    print("  " + render_raw_day(day, venue, con=con))
    missing = input("  Anything worth surfacing the briefing might miss? (blank = no): ").strip()
    if missing:
        add_label(day, venue, f"missing::{missing[:40]}", "missing", note=missing,
                  labeller=labeller, con=con)

    print("PASS 2 — the briefing's items (keep = a duty manager would want to know)")
    items = briefing_items_for(day, venue, con=con)
    if not items:
        print("  (quiet day — no items)")
        return
    for i, it in enumerate(items, 1):
        print(f"  [{i}] {it['headline']}")
        verdict = ""
        while verdict not in ("keep", "drop", "k", "d"):
            verdict = input("      keep/drop (k/d): ").strip().lower()
        rank = input("      priority rank (int, blank = none): ").strip()
        add_label(day, venue, it["item_key"], "keep" if verdict[0] == "k" else "drop",
                  priority_rank=int(rank) if rank.isdigit() else None, labeller=labeller, con=con)


def _label_session(seed: int, n_per_stratum: int, labeller: str) -> None:  # pragma: no cover - interactive
    con = connect()
    try:
        sample = sample_days(n_per_stratum=n_per_stratum, seed=seed, con=con)
        rep = sample_report(sample)
        print(f"sampled {rep['total']} (day, venue) pairs — per stratum {rep['per_stratum']}")
        for _, s in sample.iterrows():
            label_day(s["day"], s["venue"], labeller, con=con)
    finally:
        con.close()


def main() -> int:
    ap = argparse.ArgumentParser(description="Human-anchor labelling for the agent eval")
    ap.add_argument("--add", action="store_true")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--sample", action="store_true", help="print the stratified day sample")
    ap.add_argument("--label", action="store_true", help="run the two-pass labelling session")
    ap.add_argument("--n-per-stratum", type=int, default=5)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--day"); ap.add_argument("--venue"); ap.add_argument("--item-key")
    ap.add_argument("--verdict", choices=_VERDICTS)
    ap.add_argument("--rank", type=int); ap.add_argument("--note")
    ap.add_argument("--labeller", default="anon")
    args = ap.parse_args()

    if args.add:
        add_label(args.day, args.venue, args.item_key, args.verdict,
                  priority_rank=args.rank, note=args.note, labeller=args.labeller)
        print(f"labelled {args.item_key} = {args.verdict}")
    if args.sample:
        sample = sample_days(n_per_stratum=args.n_per_stratum, seed=args.seed)
        print(sample.to_string(index=False) if not sample.empty else "(no days sampled)")
        print(f"  achieved: {sample_report(sample)}")
    if args.label:
        _label_session(args.seed or config.EVAL_SCALED_SEED, args.n_per_stratum, args.labeller)
    rep = score_report()
    print(f"eval_labels: {rep['n']} row(s) — {rep['status']}")
    if args.list:
        df = load_labels()
        print(df.to_string(index=False) if not df.empty else "  (empty)")
    if rep["n"]:
        print(f"  {rep['summary']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
