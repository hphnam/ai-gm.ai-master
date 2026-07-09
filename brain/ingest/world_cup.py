"""G12.10d · World Cup 2026 fixtures as raw event data, code-derived relevance.

The raw fixture calendar lives in `brain/ingest/world_cup_schedule.md` (all 104
matches, authored by hand with NO hand-picking, NO manual rank, NO kickoff cap).
This module holds the CODE that decides relevance: whether a match falls inside a
venue's own trading hours, derived empirically from the timestamped transactions
(there are no stored venue opening hours in config). Nothing about which matches
matter is decided by hand; the model weighs the raw `wc_*` features.

Three pieces:
  * `read_world_cup_schedule()` parses the markdown to a raw match frame, tolerant
    of section headers / separators / stray whitespace; a malformed row is skipped
    with a logged reason, never a crash. Required fields (matched by meaning):
    date, kickoff, and the two team names.
  * `derive_trading_hours()` computes each venue's per-DOW trading window from real
    transaction timestamps (a robust 1st/99th-percentile envelope, so a stray
    after-midnight transaction never stretches the window) and persists it to
    `venue_trading_hours` for audit and reuse.
  * `world_cup_features(venue, dates)` returns the four raw `wc_*` covariates per
    date by overlapping each match's kickoff window (2h assumed duration, stated)
    against the venue's derived window for that date's day-of-week.

Absent schedule file -> all `wc_*` are 0 with a logged note; the pipeline runs.
Scope: Beer Hall and Ellel only (Lancaster catchment); TRT is closed.
"""

from __future__ import annotations

import logging
import re
import sys
from datetime import time

import pandas as pd

from config import BRAIN_DIR
from store.warehouse import connect

logger = logging.getLogger(__name__)

SCHEDULE_PATH = BRAIN_DIR / "ingest" / "world_cup_schedule.md"

# Assumed match duration for the trading-hours overlap (stated, not hidden): a
# match kicking off at k occupies [k, k + MATCH_DURATION_HOURS].
MATCH_DURATION_HOURS = 2.0

# The venues whose trading hours are compared against fixtures (Lancaster
# catchment). TRT is closed and out of scope (isolation rule).
WORLD_CUP_VENUES = ("beer_hall", "ellel")

# G12.15b: home-nation flags kept RAW alongside the existing england flag, so the
# model and the analysis (not a hard-coded assumption) decide which drives footfall.
# Scotland also qualified (Group C); wc_home_nation_in_hours = England OR Scotland.
WC_FEATURE_COLS = ("wc_match_in_hours", "wc_england_in_hours",
                   "wc_scotland_in_hours", "wc_home_nation_in_hours",
                   "wc_n_matches_in_hours", "wc_any_match")

_ENGLAND = "england"
_SCOTLAND = "scotland"


# --- Schedule parsing --------------------------------------------------------

def _norm_header(cell: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", cell.strip().lower()).strip()


def _match_columns(headers: list[str]) -> dict[str, int]:
    """Map required/optional fields to column indices by MEANING, not exact text,
    so a slightly different committed header still parses. date, kickoff, home,
    away are required; the rest are optional provenance."""
    idx: dict[str, int] = {}
    for i, h in enumerate(headers):
        n = _norm_header(h)
        if "date" in n and "date" not in idx:
            idx["date"] = i
        elif ("time" in n or "kickoff" in n) and "kickoff" not in idx:
            idx["kickoff"] = i
        elif "home" in n and "home" not in idx:
            idx["home"] = i
        elif "away" in n and "away" not in idx:
            idx["away"] = i
        elif ("match" in n or n == "no") and "match_no" not in idx:
            idx["match_no"] = i
        elif "venue" in n and "venue" not in idx:
            idx["venue"] = i
        elif ("result" in n or "score" in n) and "result" not in idx:
            idx["result"] = i
        elif ("stage" in n or "group" in n or "round" in n) and "stage" not in idx:
            idx["stage"] = i
    return idx


def _split_row(line: str) -> list[str]:
    """Split a markdown table row into trimmed cells, dropping the leading/trailing
    empty cells the outer pipes create."""
    parts = [c.strip() for c in line.strip().strip("|").split("|")]
    return parts


def _is_separator(line: str) -> bool:
    return bool(re.fullmatch(r"\|?[\s:|-]*\|?", line)) and "-" in line


def _parse_date(raw: str) -> str | None:
    dt = pd.to_datetime(raw.strip(), errors="coerce")
    return None if pd.isna(dt) else dt.strftime("%Y-%m-%d")


def _parse_kickoff(raw: str) -> time | None:
    m = re.match(r"^\s*(\d{1,2}):(\d{2})", raw.strip())
    if not m:
        return None
    hh, mm = int(m.group(1)), int(m.group(2))
    if not (0 <= hh <= 23 and 0 <= mm <= 59):
        return None
    return time(hh, mm)


def read_world_cup_schedule(path=None) -> pd.DataFrame:
    """Parse the raw fixture markdown to a match frame with columns
    [match_no, stage, date (ISO), kickoff_london (time), home, away, venue,
    result]. Tolerant of blank lines, `|---|` separators, stray pipes, and
    section headers (`## Round of 32` becomes the stage of the rows beneath it).
    A row missing any required field (date, kickoff, home, away) is skipped with a
    logged reason. Returns an empty frame if the file is absent."""
    path = path or SCHEDULE_PATH
    if not path.exists():
        logger.warning("world_cup_schedule.md not found at %s; "
                       "World Cup features inert", path)
        return pd.DataFrame(columns=["match_no", "stage", "date", "kickoff_london",
                                     "home", "away", "venue", "result"])

    lines = path.read_text(encoding="utf-8").splitlines()
    section_stage: str | None = None
    col_idx: dict[str, int] | None = None
    rows: list[dict] = []
    for lineno, raw_line in enumerate(lines, 1):
        line = raw_line.rstrip()
        if not line.strip():
            continue
        if line.lstrip().startswith("#"):
            heading = line.lstrip("#").strip()
            # A `##`/`###` section heading names the stage for the rows beneath it.
            if line.lstrip().startswith("##"):
                section_stage = heading
            continue
        if "|" not in line:
            continue
        if _is_separator(line):
            continue
        cells = _split_row(line)
        # First pipe-row with recognisable headers defines the column mapping.
        if col_idx is None:
            candidate = _match_columns(cells)
            missing = [f for f in ("date", "kickoff", "home", "away")
                       if f not in candidate]
            if missing:
                # Not the header row (or a data row before any header); skip.
                continue
            col_idx = candidate
            continue

        # Each section repeats the column header; recognise and skip it quietly
        # (it is not a malformed data row).
        if _match_columns(cells).keys() >= {"date", "kickoff", "home", "away"} \
                and _parse_date(cells[col_idx["date"]] if col_idx["date"] < len(cells)
                                else "") is None:
            continue

        def _cell(field: str) -> str:
            i = col_idx.get(field)
            return cells[i] if i is not None and i < len(cells) else ""

        iso = _parse_date(_cell("date"))
        kickoff = _parse_kickoff(_cell("kickoff"))
        home, away = _cell("home"), _cell("away")
        if iso is None or kickoff is None or not home or not away:
            logger.warning("world_cup_schedule row %d skipped (missing/invalid "
                           "date/kickoff/home/away): %r", lineno, line)
            continue
        rows.append({
            "match_no": _cell("match_no"),
            "stage": _cell("stage") or section_stage or "",
            "date": iso,
            "kickoff_london": kickoff,
            "home": home,
            "away": away,
            "venue": _cell("venue"),
            "result": _cell("result"),
        })

    df = pd.DataFrame(rows, columns=["match_no", "stage", "date", "kickoff_london",
                                     "home", "away", "venue", "result"])
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
    return df


# --- Trading-hours envelope (derived from real transactions) -----------------

def derive_trading_hours(con=None) -> pd.DataFrame:
    """Per (venue, day-of-week) trading window from the timestamped transactions.

    Uses a robust 1st/99th-percentile envelope of transaction time-of-day (in
    decimal hours, Europe/London) rather than raw min/max, so a stray
    after-midnight refund does not stretch the window (this matches the spec's own
    example: BH Saturday roughly 12:00 to 23:30). DOW is Monday=0 (aligned with
    pandas `.dt.dayofweek`, via DuckDB `isodow() - 1`). Persisted to
    `venue_trading_hours` for audit and reuse."""
    own = con is None
    con = con or connect()
    try:
        df = con.execute(
            """
            SELECT venue,
                   (isodow(ts) - 1) AS dow,
                   quantile_cont(hour(ts) + minute(ts) / 60.0, 0.01) AS open_hour,
                   quantile_cont(hour(ts) + minute(ts) / 60.0, 0.99) AS close_hour,
                   COUNT(*) AS n
            FROM line_items
            WHERE ts IS NOT NULL
            GROUP BY venue, dow
            """).df()
        if not own:
            _persist_trading_hours(con, df)
    finally:
        if own:
            _persist_trading_hours(con, df)
            con.close()
    return df


def _persist_trading_hours(con, df: pd.DataFrame) -> None:
    con.execute("DROP TABLE IF EXISTS venue_trading_hours")
    con.register("_th", df)
    con.execute("CREATE TABLE venue_trading_hours AS SELECT * FROM _th")
    con.unregister("_th")


def _trading_windows(venue: str, con=None) -> dict[int, tuple[float, float]]:
    """{dow -> (open_hour, close_hour)} for a venue, from `venue_trading_hours`
    (derived on demand if the table is absent)."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        exists = con.execute(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name='venue_trading_hours'").fetchone()
        if not exists:
            # Derive with a writable connection, then re-read.
            if own:
                con.close()
                w = connect()
                try:
                    derive_trading_hours(w)
                finally:
                    w.close()
                con = connect(read_only=True)
            else:
                derive_trading_hours(con)
        rows = con.execute(
            "SELECT dow, open_hour, close_hour FROM venue_trading_hours "
            "WHERE venue=?", [venue]).fetchall()
    finally:
        if own:
            con.close()
    return {int(d): (float(o), float(c)) for d, o, c in rows
            if o is not None and c is not None}


# --- Feature derivation ------------------------------------------------------

def _kickoff_hours(t: time) -> float:
    return t.hour + t.minute / 60.0


def _overlaps(kickoff: time, window: tuple[float, float]) -> bool:
    """Does [kickoff, kickoff + MATCH_DURATION_HOURS] overlap the venue window
    [open, close]? A 02:00 kickoff never overlaps a daytime/evening window, so it
    is excluded automatically (no hand-set cap)."""
    k = _kickoff_hours(kickoff)
    match_end = k + MATCH_DURATION_HOURS
    open_h, close_h = window
    return k < close_h and match_end > open_h


def world_cup_features(venue: str, dates, con=None,
                       schedule: pd.DataFrame | None = None) -> pd.DataFrame:
    """Return a frame [date, *WC_FEATURE_COLS] for the given dates and venue
    (wc_match_in_hours, wc_england_in_hours, wc_scotland_in_hours,
    wc_home_nation_in_hours, wc_n_matches_in_hours, wc_any_match).

    Relevance is code-derived: a match counts as "in hours" when its kickoff
    window overlaps the venue's derived trading window for that date's DOW. No
    hand-set rank, no fixed hour cap. Out-of-scope venues (not in
    WORLD_CUP_VENUES) and an absent schedule both yield all-zero features."""
    idx = pd.to_datetime(pd.Index(dates)).normalize()
    zero = pd.DataFrame({"date": idx, **{c: 0 for c in WC_FEATURE_COLS}})
    if venue not in WORLD_CUP_VENUES:
        return zero

    sched = schedule if schedule is not None else read_world_cup_schedule()
    if sched.empty:
        return zero

    windows = _trading_windows(venue, con=con)
    sched = sched.copy()
    sched["date"] = pd.to_datetime(sched["date"]).dt.normalize()
    by_date = {d: g for d, g in sched.groupby("date")}

    recs = []
    for d in idx:
        day = by_date.get(d)
        if day is None or day.empty:
            recs.append((d, 0, 0, 0, 0, 0, 0))
            continue
        any_match = 1
        window = windows.get(int(d.dayofweek))
        n_in, eng_in, scot_in = 0, 0, 0
        if window is not None:
            for _, m in day.iterrows():
                if _overlaps(m["kickoff_london"], window):
                    n_in += 1
                    teams = (str(m["home"]).lower(), str(m["away"]).lower())
                    if _ENGLAND in teams:
                        eng_in = 1
                    if _SCOTLAND in teams:
                        scot_in = 1
        home_in = int(bool(eng_in or scot_in))
        recs.append((d, int(n_in > 0), eng_in, scot_in, home_in, n_in, any_match))
    return pd.DataFrame(recs, columns=["date", *WC_FEATURE_COLS])


def coincident_fixtures(venue: str, lo: pd.Timestamp, hi: pd.Timestamp,
                        con=None, schedule: pd.DataFrame | None = None) -> list[dict]:
    """World Cup matches overlapping `venue`'s trading hours within [lo, hi],
    the coincident-factor source `signals.residual.attribute` names. Returns
    [{date, home, away, kickoff, is_england}], empty for out-of-scope venues or
    an absent schedule."""
    if venue not in WORLD_CUP_VENUES:
        return []
    sched = schedule if schedule is not None else read_world_cup_schedule()
    if sched.empty:
        return []
    windows = _trading_windows(venue, con=con)
    sched = sched.copy()
    sched["date"] = pd.to_datetime(sched["date"]).dt.normalize()
    win = sched[(sched["date"] >= pd.Timestamp(lo).normalize()) &
                (sched["date"] <= pd.Timestamp(hi).normalize())]
    out = []
    for _, m in win.iterrows():
        window = windows.get(int(m["date"].dayofweek))
        if window is None or not _overlaps(m["kickoff_london"], window):
            continue
        out.append({
            "date": m["date"], "home": m["home"], "away": m["away"],
            "kickoff": m["kickoff_london"].strftime("%H:%M"),
            "is_england": _ENGLAND in (str(m["home"]).lower(), str(m["away"]).lower()),
        })
    return out


def main() -> int:
    print("G12.10d · World Cup fixtures loader")
    sched = read_world_cup_schedule()
    print(f"  schedule rows     : {len(sched)}")
    if sched.empty:
        print("  world_cup_schedule.md absent; wc_* features inert")
        return 0
    th = derive_trading_hours()
    print(f"  trading-hours rows: {len(th)} (venue x dow)")
    for v in WORLD_CUP_VENUES:
        span = pd.date_range("2026-06-11", "2026-07-19")
        f = world_cup_features(v, span)
        print(f"  {v:12s}: {int(f['wc_match_in_hours'].sum())} match-in-hours days, "
              f"{int(f['wc_england_in_hours'].sum())} England-in-hours days "
              f"(of {int(f['wc_any_match'].sum())} match days in the window)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
