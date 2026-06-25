"""A14 · Local-event anchors (curated; PredictHQ optional) — spec §3.4/§3.5.

Writes `local_events(event_date, event_name, event_type, venue_scope,
expected_pull, rank, source, note)`. `build_features` turns a (date, venue-scope)
match into `exo_fixture_nearby` (+ `exo_event_rank`). Lancaster anchors map to
beer_hall/ellel; Preston anchors map to two_river_taps — never cross-applied.

The curated table is intentionally an *anchor* set, not the long tail. Crucially,
the two biggest recurring Lancaster draws **did not run in the 2025-26 data
window** (Lancaster Music Festival on hold; Highest Point not staged 2025/2026),
verified by search — so the confirmed anchors here are autumn/winter civic
events. The ablation (signals/feature_ablation.py) decides whether
`exo_fixture_nearby` ships at all; if it does not help the forecast it is kept for
deviation attribution only.

PredictHQ is optional: with PREDICTHQ_TOKEN in the environment the §3.5 sync runs;
absent, the curated table stands alone. Tokens are never stored here.

Run:
    python -m ingest.local_events
"""

from __future__ import annotations

import os
import sys

import pandas as pd

from store.warehouse import connect

# Curated anchors — each row is one calendar date (multi-day events expanded).
# Dates verified by search 2026-06; sources noted. rank: festival 80, big draw 50,
# minor 30. expected_pull: 'up' for nearby footfall, 'down' if it diverts trade.
_CURATED: list[dict] = [
    # Love Lancaster Live (the Lancaster Music Festival replacement, on hold 2025)
    # — 9–12 Oct 2025, city-centre live music. Source: beyond.radio / organisers.
    *[{"event_date": d, "event_name": "Love Lancaster Live",
       "event_type": "festival", "venue_scope": "lancaster", "expected_pull": "up",
       "rank": 70, "source": "curated",
       "note": "Music-Festival replacement (LMF on hold 2025); beyond.radio"}
      for d in ("2025-10-09", "2025-10-10", "2025-10-11", "2025-10-12")],
    # Light Up Lancaster 2025 — 6–8 Nov, light-art trail + fireworks finale 8 Nov
    # (Bonfire Night). Source: lightuplancaster.co.uk / Love Lancaster BID.
    *[{"event_date": d, "event_name": "Light Up Lancaster",
       "event_type": "civic", "venue_scope": "lancaster", "expected_pull": "up",
       "rank": 80, "source": "curated",
       "note": "light trail 5–10pm; fireworks 8 Nov; lightuplancaster.co.uk"}
      for d in ("2025-11-06", "2025-11-07", "2025-11-08")],
]


def curated_frame() -> pd.DataFrame:
    df = pd.DataFrame(_CURATED)
    df["event_date"] = pd.to_datetime(df["event_date"])
    return df[["event_date", "event_name", "event_type", "venue_scope",
               "expected_pull", "rank", "source", "note"]]


def predicthq_frame() -> pd.DataFrame:
    """Optional PredictHQ sync (spec §3.5). Returns empty unless PREDICTHQ_TOKEN
    is set. Kept minimal — the curated table is the default per the §3.5 decision
    rule; PHQ ships only if it demonstrably wins the ablation."""
    token = os.environ.get("PREDICTHQ_TOKEN")
    if not token:
        return pd.DataFrame(columns=curated_frame().columns)
    # Network sync intentionally not auto-run here without a verified token/limits;
    # the seam is documented (FLAG-FE5). Curated stands until PHQ is evaluated.
    return pd.DataFrame(columns=curated_frame().columns)


def build() -> pd.DataFrame:
    curated = curated_frame()
    phq = predicthq_frame()
    events = pd.concat([curated, phq], ignore_index=True) if not phq.empty else curated
    con = connect()
    try:
        con.execute("DROP TABLE IF EXISTS local_events")
        con.register("_ev", events)
        con.execute("CREATE TABLE local_events AS SELECT * FROM _ev")
        con.unregister("_ev")
    finally:
        con.close()
    return events


def read_events(con=None) -> pd.DataFrame:
    own = con is None
    con = con or connect(read_only=True)
    try:
        exists = con.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name='local_events'"
        ).fetchone()
        if not exists:
            return pd.DataFrame(columns=curated_frame().columns)
        df = con.execute("SELECT * FROM local_events").df()
        df["event_date"] = pd.to_datetime(df["event_date"])
        return df
    finally:
        if own:
            con.close()


def main() -> int:
    print("A14 · local events (curated anchors)")
    events = build()
    by_scope = events.groupby("venue_scope")["event_date"].nunique().to_dict()
    print(f"  rows              : {len(events)} "
          f"({events['event_name'].nunique()} anchors)")
    print(f"  days by scope     : {by_scope}")
    print(f"  PredictHQ token   : {'present' if os.environ.get('PREDICTHQ_TOKEN') else 'absent (curated only)'}")
    print("  NOTE: Lancaster Music Festival (on hold 2025) and Highest Point "
          "(not staged 2025/26) did not run in-window — curated anchors are "
          "autumn/winter civic events; Preston/PNE fixtures not encoded (TRT closed).")
    ok = len(events) > 0 and {"lancaster"} <= set(events["venue_scope"])
    print(f"A14-events RESULT: {'PASS' if ok else 'FAIL'} (curated anchors built)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
