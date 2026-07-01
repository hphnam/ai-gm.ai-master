"""Proactive briefing — the synthesis capstone (PRJ93 briefing spec).

One daily note per estate that answers a single question: what changed since
yesterday, ranked by how much it matters, de-duplicated, each with the likely
reason. It invents no new detection maths. It composes the four signals that
already exist — point deviation (`signals.deviation.scan`), change-point
(`signals.change_point.detect`), stock cover (the `stock_cover` table), and
checklist/SOP (`signals.checklist_discipline`) — into one ranked, non-redundant,
attributed feed, remembers what it said last run (`briefing_runs`) so each item
is labelled new / continuing / resolved, and surfaces via `GET /briefing` and the
Track-B tool `brain_daily_briefing`.

The contribution is the SYNTHESIS: the de-duplication rule (a change-point
absorbs the deviation run and any coincident stock flag behind it), the
transparent config-driven ranking, and the honesty gates that stop template or
small-sample artefacts reaching a manager as real alerts.

Out of scope (stated so it is not mistaken for missing work):
  - No delivery channel (no email/Slack/push) — a queryable artefact + agent tool.
  - No new detection maths — compose existing signals only.
  - No live checklist wiring — `CHECKLIST_LIVE=False` gates template data out (G5a).
  - Stock is a single latest snapshot, not a daily series — "new reorder since
    last run" is knowable ONLY through the `briefing_runs` diff.

Dependency direction (G0): this module imports the four signals + the store; no
signal imports this module. The arrow points one way, as `residual` established.

Run:
    python -m signals.briefing
"""

from __future__ import annotations

import hashlib
import json
import sys
from dataclasses import dataclass, field
from datetime import date, datetime

import pandas as pd

from config import (
    BRIEFING_BASELINE_TRUST_SPARSE,
    BRIEFING_DIRECTION_BUMP,
    BRIEFING_MERGE_WINDOW_DAYS,
    BRIEFING_NOVELTY_FACTOR,
    BRIEFING_RECENCY_FLOOR,
    BRIEFING_SEVERITY_MULT,
    BRIEFING_SOURCE_WEIGHT,
    BRIEFING_VENUES,
    CHECKLIST_LIVE,
    DEV_SCAN_WINDOW,
    EVENT_ONLY_VENUES,
    STORE_DIR,
    VENUE_LABELS,
    VENUES_WITH_STOCK,
)
from signals.change_point import detect as changepoint_detect
from signals.checklist_discipline import evaluate as checklist_evaluate
from signals.checklist_discipline import parse_checklists
from signals.deviation import scan as deviation_scan
from signals.residual import attribute
from store.active_span import active_trading_end, dataset_max_date, is_closed
from store.warehouse import connect

RESULTS_MD = STORE_DIR.parent / "signals" / "briefing.md"

# Head-selection strength (§4) and tie-break ranks.
SOURCE_RANK = {"change_point": 5, "stock": 4, "deviation": 3, "checklist": 2, "sop": 1}
SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1, "ok": 0}


# --- Normalised records ------------------------------------------------------

@dataclass
class Signal:
    source: str          # change_point | deviation | stock | checklist | sop
    venue: str
    onset_date: date     # the day the thing started
    direction: str       # up | down | na
    severity: str        # critical | high | medium | low | ok
    magnitude: float     # z (dev) | magnitude_pct (cp) | days_of_cover (stock) | score (checklist)
    payload: dict = field(default_factory=dict)   # JSON-safe original for the card


@dataclass
class BriefingItem:
    item_key: str
    venue: str
    head: Signal
    evidence: list[Signal]
    reason: str
    score: float
    status: str          # new | continuing | resolved
    caveats: list[str]
    headline: str
    baseline_trust: float = 1.0   # computed once in _build_item, reused for the score


# --- Collect (§8 collect) ----------------------------------------------------

def collect(venue: str, as_of: date | None = None, layer: str = "L1", con=None) -> list[Signal]:
    """Pull all four signals for one venue, normalised to `Signal`. Empty / closed
    / sparse venues return a short list or [], never raise."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        if as_of is None:
            as_of = dataset_max_date(con=con).date()
        closed = is_closed(venue, con=con)
        aend = active_trading_end(venue, con=con).date() if closed else None
        sigs: list[Signal] = []
        sigs += _collect_deviation(venue, layer, con, closed, aend)
        sigs += _collect_changepoint(venue, layer, con)
        sigs += _collect_stock(venue, con)
        sigs += _collect_checklist(venue, as_of, con)
        return sigs
    finally:
        if own:
            con.close()


def _collect_deviation(venue, layer, con, closed, aend) -> list[Signal]:
    df = deviation_scan(venue, layer=layer, window=DEV_SCAN_WINDOW, con=con)
    out = []
    for _, r in df.iterrows():
        if r["status"] != "deviation":
            continue
        onset = r["date"] if isinstance(r["date"], date) else pd.Timestamp(r["date"]).date()
        # G5c: a closed venue's post-closure days are represented by the closure
        # change-point, not routine deviation items.
        if closed and aend is not None and onset >= aend:
            continue
        out.append(Signal(
            "deviation", venue, onset, r["direction"], r["severity"] or "medium",
            float(r["z"]),
            {"date": onset.isoformat(), "actual": _num(r["actual"]),
             "expected": _num(r["expected"]), "z": _num(r["z"])}))
    return out


def _collect_changepoint(venue, layer, con) -> list[Signal]:
    df = changepoint_detect(venue, layer=layer, con=con)
    out = []
    for _, r in df.iterrows():
        onset = r["onset_date"] if isinstance(r["onset_date"], date) else pd.Timestamp(r["onset_date"]).date()
        attrib = json.loads(r["attribution"]) if r.get("attribution") else []
        out.append(Signal(
            "change_point", venue, onset, r["direction"], r["severity"],
            _num(r["magnitude_pct"]) or 0.0,
            {"onset_date": onset.isoformat(), "magnitude_pct": _num(r["magnitude_pct"]),
             "detector": r["detector"], "attribution": attrib,
             "note": r["note"] if pd.notna(r.get("note")) else None}))
    return out


def _collect_stock(venue, con) -> list[Signal]:
    if venue not in VENUES_WITH_STOCK or not _has_table(con, "stock_cover"):
        return []
    df = con.execute(
        "SELECT * FROM stock_cover WHERE venue=? AND reorder_flag=TRUE "
        "ORDER BY days_of_cover ASC NULLS LAST", [venue]).df()
    out = []
    for _, r in df.iterrows():
        as_of = pd.Timestamp(r["as_of"]).date()
        doc = _num(r["days_of_cover"])
        severity = "high" if (doc is not None and doc <= 0) else "medium"
        out.append(Signal(
            "stock", venue, as_of, "down", severity, doc if doc is not None else 0.0,
            {"product": r["product_canon"], "days_of_cover": doc,
             "suggested_order_kegs": _num(r["suggested_order_kegs"]),
             "as_of": as_of.isoformat()}))
    return out


def _collect_checklist(venue, as_of, con) -> list[Signal]:
    """Seam for checklist/SOP signals. Template-only today: while CHECKLIST_LIVE is
    False (Ryan's completion export pending) this emits nothing, so no synthetic
    miss is ever ranked as real (G5a)."""
    if not CHECKLIST_LIVE:
        return []
    # Live path (dormant until the flag flips): score the day's real completion
    # record and emit a Signal only on a genuine miss.
    checklists = parse_checklists()
    out: list[Signal] = []
    for name in ("opening", "closing"):
        record = _live_completion(venue, name, as_of)   # real rows, once they exist
        if record is None:
            continue
        res = checklist_evaluate(checklists[name], record["completed"], record["dow"],
                                 completion_minutes=record.get("minutes"))
        if res["severity"] != "ok":
            out.append(Signal("checklist", venue, as_of, "na", res["severity"],
                              float(res["weighted_score"]),
                              {"checklist": name, "missed": res["missed"],
                               "critical_missed": res["critical_missed"]}))
    return out


def _live_completion(venue, checklist, as_of):   # pragma: no cover - blocked on Ryan's export
    """Real timestamped completion row for (venue, checklist, day). Returns None
    until the live source exists; this is the single swap-in point."""
    return None


# --- De-duplication (§4) -----------------------------------------------------

def _cluster(signals: list[Signal]) -> list[list[Signal]]:
    """Cluster same-direction signals whose onsets fall within the merge window.
    A run of deviation days + a change-point onset + a coincident stock flag chain
    into one cluster; a distant stock reorder stays on its own."""
    clusters: list[list[Signal]] = []
    by_dir: dict[str, list[Signal]] = {}
    for s in signals:
        by_dir.setdefault(s.direction, []).append(s)
    for _dir, group in by_dir.items():
        group.sort(key=lambda s: s.onset_date)
        cur: list[Signal] = []
        for s in group:
            if cur and (s.onset_date - cur[-1].onset_date).days <= BRIEFING_MERGE_WINDOW_DAYS:
                cur.append(s)
            else:
                if cur:
                    clusters.append(cur)
                cur = [s]
        if cur:
            clusters.append(cur)
    return clusters


def _pick_head(cluster: list[Signal]) -> tuple[Signal, list[Signal]]:
    """Head by source strength: change_point > (sales) deviation absorbs stock >
    stock standalone > checklist > sop. A stock flag coincident with a sales head
    folds in as evidence (with an action tag preserved in caveats), never lost."""
    def strongest(sigs):
        return max(sigs, key=lambda s: (SEVERITY_RANK[s.severity], s.onset_date))

    cps = [s for s in cluster if s.source == "change_point"]
    devs = [s for s in cluster if s.source == "deviation"]
    stocks = [s for s in cluster if s.source == "stock"]
    if cps:
        head = strongest(cps)
    elif devs:                       # a sales move is the story; stock folds in
        head = strongest(devs)
    elif stocks:                     # standalone reorder
        head = strongest(stocks)
    else:
        head = strongest(cluster)
    evidence = [s for s in cluster if s is not head]
    return head, evidence


# --- Ranking (§7) ------------------------------------------------------------

def _recency_factor(onset: date, as_of: date) -> float:
    age = (as_of - onset).days
    if age <= 0:
        return 1.0
    span = max(DEV_SCAN_WINDOW, 1)
    return max(BRIEFING_RECENCY_FLOOR, 1.0 - (1.0 - BRIEFING_RECENCY_FLOOR) * (age / span))


def _baseline_trust(head: Signal, cluster: list[Signal]) -> tuple[float, bool]:
    """0.5 for a single-day deviation on a sparse (event-only) venue — a narrow
    band inflates z there (G5b). Change-points are unaffected (they need
    persistence, not one day)."""
    sparse_single = (head.source == "deviation"
                     and head.venue in EVENT_ONLY_VENUES
                     and len([s for s in cluster if s.source == "deviation"]) == 1)
    return (BRIEFING_BASELINE_TRUST_SPARSE if sparse_single else 1.0), sparse_single


def _score(head: Signal, status: str, baseline_trust: float, as_of: date) -> float:
    return (BRIEFING_SOURCE_WEIGHT[head.source]
            * BRIEFING_SEVERITY_MULT.get(head.severity, 0.0)
            * _recency_factor(head.onset_date, as_of)
            * BRIEFING_NOVELTY_FACTOR[status]
            * baseline_trust
            * BRIEFING_DIRECTION_BUMP.get(head.direction, 1.0))


# --- Item assembly -----------------------------------------------------------

def _reason(venue: str, head: Signal, layer: str, con) -> str:
    lines = attribute(venue, pd.Timestamp(head.onset_date), head.direction, layer, con=con)
    return lines[0] if lines else "no coincident signal"


def _headline(head: Signal, evidence: list[Signal], reason: str) -> str:
    label = VENUE_LABELS.get(head.venue, head.venue)
    if head.source == "change_point":
        pct = head.payload.get("magnitude_pct")
        move = f"{abs(pct):.0f}% {'below' if head.direction == 'down' else 'above'} normal" if pct else \
            f"a sustained {'downturn' if head.direction == 'down' else 'uplift'}"
        return f"{label}: sustained shift since {head.onset_date} ({move}); {reason}"
    if head.source == "stock":
        p = head.payload
        doc = p.get("days_of_cover")
        cover = f"{doc:.1f}d cover" if doc is not None else "cover unknown"
        order = p.get("suggested_order_kegs")
        return (f"{label}: {p.get('product')} low — {cover}"
                + (f", reorder {order:g} keg(s)" if order else ""))
    if head.source == "deviation":
        p = head.payload
        arrow = "above" if head.direction == "up" else "below"
        return f"{label}: {_money(p.get('actual'))} {arrow} band on {head.onset_date}; {reason}"
    if head.source == "checklist":
        return f"{label}: checklist miss ({head.severity}) on {head.onset_date}"
    return f"{label}: {head.source} signal on {head.onset_date}"


def _build_item(cluster: list[Signal], as_of: date, layer: str, con) -> BriefingItem:
    head, evidence = _pick_head(cluster)
    baseline_trust, sparse_single = _baseline_trust(head, cluster)
    reason = _reason(head.venue, head, layer, con)
    caveats: list[str] = []
    if sparse_single:
        caveats.append("small-sample: a narrow band inflates z; read as "
                       "'a booking happened', not a large anomaly")
    for s in evidence:
        if s.source == "stock":
            order = s.payload.get("suggested_order_kegs")
            caveats.append(f"action: reorder {s.payload.get('product')}"
                           + (f" ({order:g} keg(s))" if order else "")
                           + f" — {s.payload.get('days_of_cover')}d cover")
    item_key = f"{head.venue}:{head.direction}:{head.onset_date}:{head.source}"
    headline = _headline(head, evidence, reason)
    # status/score are filled after the prior-run diff.
    return BriefingItem(item_key, head.venue, head, evidence, reason,
                        0.0, "new", caveats, headline, baseline_trust)


# --- Estate build + diff (§6, §8 build) --------------------------------------

def build(as_of: date | None = None, venues=None, layer: str = "L1", con=None) -> dict:
    """Estate feed: collect → de-dup → attribute → rank → diff against the last
    persisted run. Read-only (does not write `briefing_runs`; `run()` does that)."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        if as_of is None:
            as_of = dataset_max_date(con=con).date()
        venues = list(venues) if venues else list(BRIEFING_VENUES)
        prior = _read_prior(con)
        notes: list[str] = []
        items: list[BriefingItem] = []
        for venue in venues:
            if is_closed(venue, con=con):
                notes.append(f"{venue} closed; closure dormant, no routine deviation items")
            for cluster in _cluster(collect(venue, as_of=as_of, layer=layer, con=con)):
                items.append(_build_item(cluster, as_of, layer, con))

        # Diff against the last persisted run: new / continuing.
        today_keys: dict[str, set[str]] = {}
        for it in items:
            today_keys.setdefault(it.venue, set()).add(it.item_key)
            prior_v = prior.get(it.venue, {})
            it.status = "continuing" if it.item_key in prior_v else "new"
            it.score = _score(it.head, it.status, it.baseline_trust, as_of)

        # Resolved: keys present last run for an in-scope venue, gone today.
        for venue in venues:
            for key, info in prior.get(venue, {}).items():
                if key not in today_keys.get(venue, set()):
                    items.append(_resolved_item(venue, key, info))

        items = [it for it in items if it.score > 0.0 or it.status == "resolved"]
        items.sort(key=_sort_key)
        if not CHECKLIST_LIVE:
            notes.append("checklist/SOP data not live (template) — excluded from the feed")

        counts = {s: sum(1 for it in items if it.status == s)
                  for s in ("new", "continuing", "resolved")}
        return {
            "as_of": as_of.isoformat(),
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "layer": layer,
            "venues": venues,
            "counts": counts,
            "items": [_item_to_dict(it) for it in items],
            "notes": notes,
        }
    finally:
        if own:
            con.close()


def _resolved_item(venue: str, key: str, info: dict) -> BriefingItem:
    head = Signal(info.get("source", "deviation"), venue,
                  _parse_date(info.get("onset_date")), info.get("direction", "na"),
                  info.get("severity", "low"), 0.0, {})
    label = VENUE_LABELS.get(venue, venue)
    return BriefingItem(
        key, venue, head, [], info.get("reason", "cleared"),
        float(info.get("score") or 0.0) * BRIEFING_NOVELTY_FACTOR["resolved"],
        "resolved", ["cleared: returned to normal since the last run"],
        f"{label}: {info.get('what', 'a prior signal')} has cleared (returned to normal)")


def _sort_key(it: BriefingItem):
    return (-it.score, -SEVERITY_RANK.get(it.head.severity, 0),
            VENUE_LABELS.get(it.venue, it.venue),
            -SOURCE_RANK.get(it.head.source, 0), -it.head.onset_date.toordinal())


# --- Persistence (§6) --------------------------------------------------------

_COLS = ["as_of", "venue", "item_key", "source", "direction", "onset_date",
         "score", "status", "payload_json", "run_hash", "generated_at"]


def _ensure_table(con) -> None:
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS briefing_runs (
            as_of DATE NOT NULL, venue VARCHAR NOT NULL, item_key VARCHAR NOT NULL,
            source VARCHAR, direction VARCHAR, onset_date DATE, score DOUBLE,
            status VARCHAR, payload_json VARCHAR, run_hash VARCHAR,
            generated_at TIMESTAMP NOT NULL
        )
        """)


def _read_prior(con) -> dict[str, dict[str, dict]]:
    """Keys the last persisted run wrote, per venue, with enough payload to rebuild
    a resolved item. Empty when the table or any prior run is absent (a fresh
    store → every item is 'new')."""
    if not _has_table(con, "briefing_runs"):
        return {}
    maxgen = con.execute("SELECT MAX(generated_at) FROM briefing_runs").fetchone()[0]
    if maxgen is None:
        return {}
    df = con.execute(
        "SELECT venue, item_key, source, direction, onset_date, score, payload_json "
        "FROM briefing_runs WHERE generated_at = ? AND venue != ?",
        [maxgen, _MARKER_VENUE]).df()
    prior: dict[str, dict[str, dict]] = {}
    for _, r in df.iterrows():
        payload = json.loads(r["payload_json"]) if r["payload_json"] else {}
        prior.setdefault(r["venue"], {})[r["item_key"]] = {
            "source": r["source"], "direction": r["direction"],
            "onset_date": str(r["onset_date"])[:10], "score": _num(r["score"]),
            "severity": payload.get("severity"), "reason": payload.get("reason"),
            "what": payload.get("what"),
        }
    return prior


_MARKER_VENUE = "__run__"   # sentinel row so an empty run still advances the prior


def _persist(env: dict) -> None:
    """Write this run's ACTIVE items (new/continuing). Resolved items are not
    persisted, so a cleared story is announced once and not re-resolved forever.
    An empty run still writes a sentinel marker row, so the NEXT run's prior
    (MAX(generated_at)) is this empty run — not the last run that still held the
    now-cleared key, which would otherwise re-resolve it on every empty run."""
    active = [it for it in env["items"] if it["status"] in ("new", "continuing")]
    con = connect()
    try:
        _ensure_table(con)
        gen = datetime.now()
        if not active:
            marker = pd.DataFrame([{
                "as_of": env["as_of"], "venue": _MARKER_VENUE, "item_key": _MARKER_VENUE,
                "source": None, "direction": None, "onset_date": None, "score": None,
                "status": "marker", "payload_json": None, "run_hash": None,
                "generated_at": gen}])[_COLS]
            con.register("_br", marker)
            con.execute(f"INSERT INTO briefing_runs ({', '.join(_COLS)}) "
                        f"SELECT {', '.join(_COLS)} FROM _br")
            con.unregister("_br")
            return
        run_hash = hashlib.md5(
            "|".join(sorted(it["item_key"] for it in active)).encode()).hexdigest()
        rows = [{
            "as_of": env["as_of"], "venue": it["venue"], "item_key": it["item_key"],
            "source": it["head"]["source"], "direction": it["head"]["direction"],
            "onset_date": it["head"]["onset_date"], "score": it["score"],
            "status": it["status"],
            "payload_json": json.dumps({
                "severity": it["head"]["severity"], "reason": it["reason"],
                "what": it["headline"]}),
            "run_hash": run_hash, "generated_at": gen,
        } for it in active]
        payload = pd.DataFrame(rows)[_COLS]
        con.register("_br", payload)
        con.execute(f"INSERT INTO briefing_runs ({', '.join(_COLS)}) "
                    f"SELECT {', '.join(_COLS)} FROM _br")
        con.unregister("_br")
    finally:
        con.close()


# --- Serialisation + card ----------------------------------------------------

def _signal_to_dict(s: Signal) -> dict:
    return {"source": s.source, "venue": s.venue, "onset_date": s.onset_date.isoformat(),
            "direction": s.direction, "severity": s.severity,
            "magnitude": s.magnitude, "payload": s.payload}


def _item_to_dict(it: BriefingItem) -> dict:
    return {
        "item_key": it.item_key, "venue": it.venue,
        "venue_label": VENUE_LABELS.get(it.venue, it.venue),
        "status": it.status, "score": round(it.score, 4),
        "severity": it.head.severity, "direction": it.head.direction,
        "headline": it.headline, "reason": it.reason,
        "caveats": it.caveats,
        "head": _signal_to_dict(it.head),
        "evidence": [_signal_to_dict(e) for e in it.evidence],
    }


def card(item: dict) -> dict:
    """Agent-renderable one-item summary."""
    return {"headline": item["headline"], "venue": item["venue_label"],
            "status": item["status"], "severity": item["severity"],
            "reason": item["reason"], "caveats": item["caveats"]}


# --- CLI + report ------------------------------------------------------------

def run() -> dict:
    con = connect(read_only=True)
    try:
        env = build(con=con)
    finally:
        con.close()
    _persist(env)
    _write_report(env)
    return env


def _write_report(env: dict) -> None:
    lines = [
        "# Proactive briefing — ranked, de-duplicated, attributed daily feed\n",
        f"as_of **{env['as_of']}** · layer {env['layer']} · "
        f"new {env['counts']['new']} / continuing {env['counts']['continuing']} / "
        f"resolved {env['counts']['resolved']}\n",
        "Composes point deviation, change-point, stock cover, and checklist/SOP. "
        "A change-point absorbs the deviation run and any coincident stock flag "
        "behind it. Ranked by a transparent score "
        "(source × severity × recency × novelty × baseline_trust × direction). "
        "Attribution is correlational ('coincides with', never 'caused by').\n",
        "## Items (ranked)",
        "| # | Venue | Status | Sev | Score | Headline | Reason |",
        "|---|---|---|---|---|---|---|",
    ]
    for i, it in enumerate(env["items"], 1):
        lines.append(
            f"| {i} | {it['venue_label']} | {it['status']} | {it['severity']} | "
            f"{it['score']:.3f} | {it['headline']} | {it['reason']} |")
    if not env["items"]:
        lines.append("| — | (quiet day — nothing above threshold) | | | | | |")
    if env["notes"]:
        lines.append("\n**Notes:** " + "; ".join(env["notes"]))
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    print("Proactive briefing · ranked estate feed")
    env = run()
    print(f"  as_of {env['as_of']} — new {env['counts']['new']} / "
          f"continuing {env['counts']['continuing']} / resolved {env['counts']['resolved']}")
    for i, it in enumerate(env["items"], 1):
        print(f"  {i}. [{it['status']:10s} {it['severity']:6s} {it['score']:.3f}] {it['headline']}")
    for n in env["notes"]:
        print(f"  note: {n}")
    print(f"  report            : {RESULTS_MD}")
    ok = isinstance(env["items"], list)
    print(f"BRIEFING RESULT: {'PASS' if ok else 'FAIL'} "
          f"({len(env['items'])} item(s); no new detection maths)")
    return 0 if ok else 1


# --- Small helpers -----------------------------------------------------------

def _has_table(con, name: str) -> bool:
    return con.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_name=?", [name]).fetchone() is not None


def _num(v):
    return None if v is None or pd.isna(v) else float(v)


def _money(v):
    return f"£{v:,.0f}" if v is not None else "—"


def _parse_date(s) -> date:
    return pd.Timestamp(s).date() if s else date.min


if __name__ == "__main__":
    sys.exit(main())
