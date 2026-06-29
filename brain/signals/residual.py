"""Shared foundation for the deviation signals (point + change-point).

The standardised conformal residual stream, the conformal band scale, and the
A14-seam attribution are common to BOTH the per-day point-deviation primitive
(`signals.deviation`) and the sustained change-point detector
(`signals.change_point`). They live here so neither signal imports the other —
the dependency flows residual ← {deviation, change_point}, never deviation ↔
change_point.

    expected_t = DOW-median baseline (Rung-1)         residual_t = actual_t − expected_t
    scale_t    = conformal half-band at CP_LEVEL      z_t = residual_t / max(scale_t, eps)

The stream is leakage-free (expanding one-step-ahead) over each venue's active
span, trading days only. The per-day point check and the sustained change-point
detector both read this same yardstick, so point-anomaly severity and
change-point evidence share a scale.

This module changes no forecast — it reads existing store data only.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from config import (
    CP_ATTRIB_WINDOW_DAYS,
    CP_LEVEL,
    CP_WARMUP_DAYS,
    EVENT_SCOPE,
    PRICE_REGIME_BREAK,
    VENUE_LABELS,
    WEATHER_CELLS,
)
from conformal.wrap import conformal_quantile
from ingest import calendar_sources as cal
from store.active_span import (
    active_trading_end,
    active_trading_start,
    dataset_max_date,
    is_closed,
    trim_to_active,
)
from store.warehouse import connect, read_series

_EPS = 1e-6


# --- Residual stream ---------------------------------------------------------

def build_residual_stream(venue: str, con=None) -> pd.DataFrame:
    """Leakage-free one-step-ahead standardised residual stream over the active
    span. expected = expanding DOW-median (Rung-1 baseline); scale = conformal
    half-band-width (level CP_LEVEL) of the training residuals — the shared scale
    the point-deviation and change-point detectors both read. Detection runs on
    trading days only (DOW-median > 0), so structural-zero closed days don't
    distort the stream."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        s = read_series(venue, "L1", fill_calendar=True, con=con)
        if is_closed(venue, con=con):
            # Include the post-closure zero run so the closure is an abrupt,
            # detectable drop (the trimmed active span would hide it). Reindex
            # from the venue's open day to the dataset-global max, zero-filling.
            start = active_trading_start(venue, con=con)
            end = dataset_max_date(con=con)
            full = pd.date_range(start, end, freq="D")
            s = (s.set_index("date").reindex(full).rename_axis("date").reset_index())
            s["value"] = s["value"].fillna(0.0)
        else:
            s = trim_to_active(s, venue, con=con)
    finally:
        if own:
            con.close()
    s = s[["date", "value"]].reset_index(drop=True)
    vals = s["value"].to_numpy(float)
    dows = s["date"].dt.dayofweek.to_numpy()

    rows = []
    for i in range(CP_WARMUP_DAYS, len(s)):
        tr_v, tr_d = vals[:i], dows[:i]
        med = pd.Series(tr_v).groupby(tr_d).median()
        overall = float(np.median(tr_v))
        exp_i = float(med.get(dows[i], overall))
        if exp_i <= _EPS:                       # not a trading day for this venue
            continue
        tr_exp = np.array([med.get(d, overall) for d in tr_d], float)
        scale = conformal_quantile(np.abs(tr_v - tr_exp), CP_LEVEL)
        scale = max(float(scale), _EPS)
        z = (vals[i] - exp_i) / scale
        rows.append({"date": s["date"].iloc[i], "actual": vals[i],
                     "expected": exp_i, "scale": scale, "z": z})
    return pd.DataFrame(rows)


# --- Attribution (the A14-seam payoff) ---------------------------------------

def attribute(venue: str, onset: pd.Timestamp, direction: str, layer: str,
              con=None) -> list[str]:
    """Scan the A14 exogenous seam around the onset and return a ranked list of
    COINCIDENT signals ("coincides with …", never "caused by"). Weather is weighted
    higher for draught layers (A14b: the weather signal is draught-specific)."""
    own = con is None
    con = con or connect(read_only=True)
    onset = pd.Timestamp(onset)
    w = pd.Timedelta(days=CP_ATTRIB_WINDOW_DAYS)
    lo, hi = onset - w, onset + w
    is_draught = layer in ("L2", "L3")
    hits: list[tuple[float, str]] = []
    try:
        # Known structural breaks first (highest confidence).
        if is_closed(venue, con=con) and abs((active_trading_end(venue, con=con) - onset).days) <= CP_ATTRIB_WINDOW_DAYS:
            hits.append((100, f"coincides with {VENUE_LABELS.get(venue, venue)}'s closure (structural break)"))
        if lo <= pd.Timestamp(PRICE_REGIME_BREAK) <= hi:
            hits.append((90, f"coincides with the price-regime change ({PRICE_REGIME_BREAK})"))

        # Calendar term↔vacation transition near the onset.
        for d in pd.date_range(lo, hi):
            if cal.is_school_term(d) != cal.is_school_term(d + pd.Timedelta(days=1)):
                hits.append((60, "coincides with a school term↔holiday transition"))
                break
        for d in pd.date_range(lo, hi):
            if cal.is_uni_term(d) != cal.is_uni_term(d + pd.Timedelta(days=1)):
                hits.append((65, "coincides with a university term↔vacation transition"))
                break

        # Weather anomaly (draught-weighted).
        cell = WEATHER_CELLS.get(venue)
        wx = _table(con, "exog_weather_leadmatched")
        if wx is not None and cell:
            wx = wx[wx["cell"] == cell]
            win = wx[(wx["date"] >= lo) & (wx["date"] <= hi)]
            if not win.empty and len(wx) > 30:
                t_mean, t_win = wx["exo_temp_c"].mean(), win["exo_temp_c"].mean()
                t_sd = wx["exo_temp_c"].std() or 1.0
                if abs(t_win - t_mean) > t_sd:
                    word = "warm spell" if t_win > t_mean else "cold snap"
                    weight = (70 if is_draught else 40) + (direction == "up" and t_win > t_mean) * 5
                    hits.append((weight, f"coincides with a {word} "
                                 f"(~{t_win:.0f}°C vs {t_mean:.0f}°C avg){' — weather is draught-specific (A14b)' if is_draught else ''}"))

        # Events / bank holiday / Ellel event.
        ev = _table(con, "local_events")
        if ev is not None:
            scopes = set(EVENT_SCOPE.get(venue, ())) | {"all"}
            ew = ev[(ev["venue_scope"].isin(scopes)) &
                    (ev["event_date"] >= lo) & (ev["event_date"] <= hi)]
            for _, r in ew.iterrows():
                hits.append((55, f"coincides with a local event ({r['event_name']})"))

        # Promo / discount day.
        sp = _table(con, "spike_days")
        if sp is not None:
            sw = sp[(sp["venue"] == venue) & (sp["is_spike_day"] == 1) &
                    (sp["date"] >= lo) & (sp["date"] <= hi)]
            if not sw.empty:
                hits.append((50, "coincides with a discount/promo day (not necessarily a true demand shift)"))

        # Stock-out on a downward shift (BH) — only if the snapshot is near the
        # onset (stock_cover holds a single latest snapshot, not a daily series).
        sc = _table(con, "stock_cover")
        if sc is not None and direction == "down":
            scw = sc[(sc["venue"] == venue) & (sc["reorder_flag"] == True)]  # noqa: E712
            if not scw.empty and "as_of" in scw.columns:
                as_of = pd.to_datetime(scw["as_of"]).max()
                if lo <= as_of <= hi:
                    hits.append((45, "coincides with a stock-out / reorder flag (A12)"))
    finally:
        if own:
            con.close()

    ranked = [s for _, s in sorted(hits, key=lambda x: -x[0])]
    if not ranked:
        return ["no coincident calendar/weather/event/promo signal — likely an "
                "operational or competitive change worth investigating"]
    return ranked


def _table(con, name: str):
    exists = con.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_name=?", [name]).fetchone()
    if not exists:
        return None
    df = con.execute(f"SELECT * FROM {name}").df()
    for c in ("date", "event_date"):
        if c in df.columns:
            df[c] = pd.to_datetime(df[c])
    return df
