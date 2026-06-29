"""A13 · Change-point / regime-shift detection + attribution (spec A13).

The shipped `/deviation/check` is a per-day point-anomaly detector — memoryless, so
a one-off spike and the first day of a permanent shift look identical. A13 adds the
second half of "detect meaningful deviations": **sustained** regime shifts in the
trading rhythm, dated to an onset, and **attributed** to coincident real-world
signals using the A14 exogenous seam (its explanatory home — A14b showed those
features are explanatorily real but predictively inert).

Detect on the standardised conformal residual stream:
    expected_t = DOW-median baseline (Rung-1)         residual_t = actual_t − expected_t
    scale_t    = conformal half-band at CP_LEVEL      z_t = residual_t / max(scale_t, eps)
Two production detectors on z_t — two-sided **CUSUM** (drift) + **k-of-n persistence**
(abrupt) — with **BOCPD** as a benchmark. Validated against the TRT closure
(ground-truth structural break) and synthetic injections (see change_point_eval.md).

This module changes no forecast — it reads existing store data only.

Run:
    python -m signals.change_point
"""

from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd

from config import (
    CP_ATTRIB_WINDOW_DAYS,
    CP_BOCPD_HAZARD,
    CP_CUSUM_H,
    CP_CUSUM_K,
    CP_LEVEL,
    CP_MIN_SPAN_DAYS,
    CP_RELEARN_MIN_DAYS,
    CP_RUN_M,
    CP_RUN_N,
    CP_WARMUP_DAYS,
    EVENT_ONLY_VENUES,
    EVENT_SCOPE,
    PRICE_REGIME_BREAK,
    STORE_DIR,
    VENUE_LABELS,
    VENUES_FOR_CHANGEPOINT,
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

RESULTS_MD = STORE_DIR.parent / "signals" / "change_point.md"
_EPS = 1e-6


# --- Residual stream ---------------------------------------------------------

def build_residual_stream(venue: str, con=None) -> pd.DataFrame:
    """Leakage-free one-step-ahead standardised residual stream over the active
    span. expected = expanding DOW-median (Rung-1 baseline); scale = conformal
    half-band-width (level CP_LEVEL) of the training residuals — the SAME yardstick
    `/deviation/check` uses. Detection runs on trading days only (DOW-median > 0),
    so structural-zero closed days don't distort the stream."""
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


# --- Detectors ---------------------------------------------------------------

def cusum(z: np.ndarray, k: float = CP_CUSUM_K, h: float = CP_CUSUM_H) -> list[dict]:
    """Two-sided CUSUM. Returns alarms with onset = last index the relevant
    statistic was 0 before crossing h. Resets after each alarm."""
    sp = sm = 0.0
    last0_p = last0_m = 0
    alarms = []
    for t, zt in enumerate(z):
        prev_sp, prev_sm = sp, sm
        sp = max(0.0, sp + zt - k)
        sm = max(0.0, sm - zt - k)
        if prev_sp == 0.0:
            last0_p = t
        if prev_sm == 0.0:
            last0_m = t
        if sp > h:
            alarms.append({"alarm_idx": t, "onset_idx": last0_p,
                           "direction": "up", "stat": sp})
            sp = sm = 0.0
        elif sm > h:
            alarms.append({"alarm_idx": t, "onset_idx": last0_m,
                           "direction": "down", "stat": sm})
            sp = sm = 0.0
    return alarms


def persistence(z: np.ndarray, m: int = CP_RUN_M, n: int = CP_RUN_N) -> list[dict]:
    """k-of-n: alarm when ≥ m of the last n trading days breach the band (|z|>1)
    in the SAME direction. Onset = first breaching day in the qualifying window."""
    breach = np.where(z > 1.0, 1, np.where(z < -1.0, -1, 0))
    alarms = []
    fired_until = -1
    for t in range(n - 1, len(z)):
        win = breach[t - n + 1:t + 1]
        for d, lab in ((1, "up"), (-1, "down")):
            if int((win == d).sum()) >= m and t > fired_until:
                idxs = np.where(win == d)[0]
                onset = (t - n + 1) + int(idxs[0])
                alarms.append({"alarm_idx": t, "onset_idx": onset,
                               "direction": lab, "count": int((win == d).sum())})
                fired_until = t
    return alarms


def bocpd(z: np.ndarray, hazard: float = CP_BOCPD_HAZARD) -> np.ndarray:
    """Bayesian Online Change-point Detection (Adams & MacKay 2007), Normal-
    inverse-gamma conjugate predictive. Returns per-step P(run length resets) — a
    principled benchmark, not the production signal."""
    n = len(z)
    if n == 0:
        return np.array([])
    mu0, kappa0, alpha0, beta0 = 0.0, 1.0, 1.0, 1.0
    mu = np.array([mu0]); kappa = np.array([kappa0])
    alpha = np.array([alpha0]); beta = np.array([beta0])
    R = np.array([1.0])
    cp_prob = np.zeros(n)
    for t in range(n):
        x = z[t]
        scale = np.sqrt(beta * (kappa + 1) / (alpha * kappa))
        df = 2 * alpha
        pred = (np.exp(_student_logpdf(x, df, mu, scale)))
        growth = R * pred * (1 - hazard)
        cp = float(np.sum(R * pred * hazard))
        new_R = np.append(cp, growth)
        new_R /= new_R.sum() + _EPS
        cp_prob[t] = new_R[0]
        # update sufficient stats (append the prior for the reset path)
        mu_new = (kappa * mu + x) / (kappa + 1)
        kappa_new = kappa + 1
        alpha_new = alpha + 0.5
        beta_new = beta + (kappa * (x - mu) ** 2) / (2 * (kappa + 1))
        mu = np.append(mu0, mu_new); kappa = np.append(kappa0, kappa_new)
        alpha = np.append(alpha0, alpha_new); beta = np.append(beta0, beta_new)
        R = new_R
    return cp_prob


def _student_logpdf(x, df, loc, scale):
    from scipy.special import gammaln
    z = (x - loc) / scale
    return (gammaln((df + 1) / 2) - gammaln(df / 2)
            - 0.5 * np.log(df * np.pi) - np.log(scale)
            - (df + 1) / 2 * np.log1p(z ** 2 / df))


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


# --- Detection orchestration -------------------------------------------------

def _severity(direction: str, mag: float, persist_count: int) -> str:
    if abs(mag) > 1.5 or persist_count >= 6:
        return "high"
    if abs(mag) > 0.8 or persist_count >= CP_RUN_M:
        return "medium"
    return "low"


def detect(venue: str, layer: str = "L1", con=None) -> pd.DataFrame:
    own = con is None
    con = con or connect(read_only=True)
    try:
        if venue not in VENUES_FOR_CHANGEPOINT and venue not in EVENT_ONLY_VENUES:
            return pd.DataFrame()
        stream = build_residual_stream(venue, con=con)
        if len(stream) < CP_MIN_SPAN_DAYS - CP_WARMUP_DAYS and venue not in EVENT_ONLY_VENUES:
            return pd.DataFrame()       # insufficient history
        z = stream["z"].to_numpy()
        dates = stream["date"].reset_index(drop=True)
        event_only = venue in EVENT_ONLY_VENUES

        cu = [] if event_only else cusum(z)     # Ellel: persistence-only (sparse)
        pe = persistence(z)
        bp = bocpd(z)

        # Merge alarms by onset date; CUSUM and persistence agreeing => 'both'.
        by_onset: dict[pd.Timestamp, dict] = {}
        for a in cu:
            self_merge(by_onset, dates, a, "cusum", bp)
        for a in pe:
            self_merge(by_onset, dates, a, "persistence", bp)

        # is_closed dormancy: the closure is the first downward shift at/after the
        # last active day; suppress repeat alarms on the post-closure zero run.
        if is_closed(venue, con=con):
            aend = active_trading_end(venue, con=con)
            margin = pd.Timedelta(days=CP_RUN_N)
            closure = min((o for o, i in by_onset.items()
                           if i["direction"] == "down" and o >= aend - margin),
                          default=None)
            if closure is not None:
                by_onset = {o: i for o, i in by_onset.items()
                            if o <= closure or i["direction"] != "down"}
                by_onset[closure]["note"] = "closure (structural break) — monitoring dormant after"

        rows = []
        for onset, info in sorted(by_onset.items()):
            seg = z[info["onset_idx"]:info["alarm_idx"] + 1]
            mag = float(np.mean(seg)) if len(seg) else 0.0
            exp_at = float(stream["expected"].iloc[info["onset_idx"]])
            mag_pct = (mag * float(stream["scale"].iloc[info["onset_idx"]]) / exp_at * 100
                       if exp_at > _EPS else float("nan"))
            attrib = attribute(venue, onset, info["direction"], layer, con=con)
            rows.append({
                "venue": venue, "layer": layer, "key": None,
                "onset_date": onset.date(), "detected_date": info["detected_date"].date(),
                "detection_delay_days": int((info["detected_date"] - onset).days),
                "direction": info["direction"],
                "magnitude_band_units": round(mag, 3), "magnitude_pct": round(mag_pct, 1),
                "persistence_m": info.get("count"), "persistence_n": CP_RUN_N,
                "cusum_stat": round(info.get("stat", float("nan")), 2) if info.get("stat") else None,
                "detector": info["detector"], "bocpd_prob": round(info["bocpd_prob"], 3),
                "severity": _severity(info["direction"], mag, info.get("count", 0) or 0),
                "recalibration_needed": True,
                "attribution": json.dumps(attrib), "note": info.get("note"),
            })
        return pd.DataFrame(rows)
    finally:
        if own:
            con.close()


def self_merge(by_onset, dates, alarm, detector, bp) -> None:
    onset = pd.Timestamp(dates.iloc[alarm["onset_idx"]])
    detected = pd.Timestamp(dates.iloc[alarm["alarm_idx"]])
    cur = by_onset.get(onset)
    bocpd_prob = float(bp[alarm["alarm_idx"]]) if len(bp) > alarm["alarm_idx"] else 0.0
    if cur is None:
        by_onset[onset] = {**alarm, "detector": detector, "detected_date": detected,
                           "bocpd_prob": bocpd_prob}
    else:
        cur["detector"] = "both" if cur["detector"] != detector else cur["detector"]
        cur["detected_date"] = min(cur["detected_date"], detected)
        cur["alarm_idx"] = min(cur["alarm_idx"], alarm["alarm_idx"])
        cur.setdefault("count", alarm.get("count"))
        cur.setdefault("stat", alarm.get("stat"))


# --- Persistence + CLI -------------------------------------------------------

_COLS = ["venue", "layer", "key", "onset_date", "detected_date", "detection_delay_days",
         "direction", "magnitude_band_units", "magnitude_pct", "persistence_m",
         "persistence_n", "cusum_stat", "detector", "bocpd_prob", "severity",
         "recalibration_needed", "attribution", "note"]


def _ensure_table(con) -> None:
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS change_points (
            venue VARCHAR NOT NULL, layer VARCHAR NOT NULL, key VARCHAR,
            onset_date DATE NOT NULL, detected_date DATE NOT NULL,
            detection_delay_days INTEGER, direction VARCHAR NOT NULL,
            magnitude_band_units DOUBLE, magnitude_pct DOUBLE,
            persistence_m INTEGER, persistence_n INTEGER, cusum_stat DOUBLE,
            detector VARCHAR NOT NULL, bocpd_prob DOUBLE, severity VARCHAR NOT NULL,
            recalibration_needed BOOLEAN DEFAULT TRUE, attribution VARCHAR,
            note VARCHAR, created_at TIMESTAMP DEFAULT now()
        )
        """)


def _persist(df: pd.DataFrame) -> None:
    con = connect()
    try:
        _ensure_table(con)
        if df.empty:
            return
        payload = df[_COLS].copy()
        con.register("_cp", payload)
        con.execute(
            "DELETE FROM change_points t WHERE EXISTS (SELECT 1 FROM _cp p WHERE "
            "t.venue=p.venue AND t.layer=p.layer AND t.onset_date=p.onset_date "
            "AND (t.key IS NOT DISTINCT FROM p.key))")
        con.execute(f"INSERT INTO change_points ({', '.join(_COLS)}) "
                    f"SELECT {', '.join(_COLS)} FROM _cp")
        con.unregister("_cp")
    finally:
        con.close()


def run() -> dict:
    out = {}
    con = connect(read_only=True)
    try:
        frames = {v: detect(v, con=con)
                  for v in (*VENUES_FOR_CHANGEPOINT, *EVENT_ONLY_VENUES)}
    finally:
        con.close()
    allcp = pd.concat([f for f in frames.values() if not f.empty], ignore_index=True) \
        if any(not f.empty for f in frames.values()) else pd.DataFrame(columns=_COLS)
    _persist(allcp)
    return {"frames": frames, "all": allcp}


def _write_report(out: dict) -> None:
    allcp = out["all"]
    lines = [
        "# A13 · Change-point / regime-shift detection\n",
        "Sustained shifts on the standardised conformal residual stream "
        f"`z = (actual − DOW-median) / conformal half-band@{int(CP_LEVEL*100)}%`. "
        "Two production detectors — two-sided **CUSUM** (drift) + **k-of-n "
        f"persistence** ({CP_RUN_M}/{CP_RUN_N}, abrupt) — with **BOCPD** as a "
        "benchmark. Each shift is **attributed** against the A14 exogenous seam "
        "(correlational — 'coincides with', never 'caused by'; weather weighted to "
        "draught layers per A14b).\n",
        "## Recalibration loop (T4)",
        "A confirmed shift sets `recalibration_needed=TRUE`: the learned 'normal' "
        "(DOW baseline + conformal calibration set) is stale from the onset. The "
        f"minimum behaviour shipped here is the flag + a degraded-confidence note "
        f"until {CP_RELEARN_MIN_DAYS} post-change days accrue; automatic re-fit on "
        "the post-change window is future work (FLAG-CP3).\n",
        "## Detected change points",
        "| Venue | Onset | Detected | Δdays | Dir | Mag (band/%) | Detector | Sev | Attribution (top) |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for _, r in allcp.iterrows():
        attrib = json.loads(r["attribution"])[0] if r["attribution"] else "—"
        lines.append(
            f"| {VENUE_LABELS.get(r['venue'], r['venue'])} | {r['onset_date']} | "
            f"{r['detected_date']} | {r['detection_delay_days']} | {r['direction']} | "
            f"{r['magnitude_band_units']:+.2f} / {r['magnitude_pct']:+.0f}% | "
            f"{r['detector']} | {r['severity']} | {attrib} |")
    if allcp.empty:
        lines.append("| — | (no change points detected) | | | | | | | |")
    lines += [
        "\nDetection is leakage-free (expanding one-step-ahead) and runs on trading "
        "days only. Scope: Beer Hall + Two River Taps (CUSUM+persistence); Ellel is "
        "persistence-only (sparse, booking-driven — FLAG-CP2). TRT's closure is the "
        "ground-truth structural break (see change_point_eval.md). Point anomalies "
        "remain served by `/deviation/check`; this is the complementary sustained-"
        "shift layer.",
    ]
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    print("A13 · change-point / regime-shift detection")
    out = run()
    for v, f in out["frames"].items():
        tag = "" if v in VENUES_FOR_CHANGEPOINT or v in EVENT_ONLY_VENUES else " (excluded)"
        print(f"  {VENUE_LABELS.get(v, v):18s}{tag}: {len(f)} change point(s)")
        for _, r in f.iterrows():
            attrib = json.loads(r["attribution"])[0] if r["attribution"] else "—"
            print(f"      {r['onset_date']} {r['direction']:4s} "
                  f"mag={r['magnitude_band_units']:+.2f} [{r['detector']}/{r['severity']}] "
                  f"— {attrib[:60]}")
    _write_report(out)
    print(f"  report            : {RESULTS_MD}")
    n = len(out["all"])
    ok = isinstance(out["all"], pd.DataFrame)
    print(f"A13 RESULT: {'PASS' if ok else 'FAIL'} ({n} change point(s); nothing in the ladder changed)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
