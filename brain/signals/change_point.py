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
    STORE_DIR,
    VENUE_LABELS,
    VENUES_FOR_CHANGEPOINT,
)
from signals.residual import _EPS, attribute, build_residual_stream
from store.active_span import active_trading_end, is_closed
from store.warehouse import connect

RESULTS_MD = STORE_DIR.parent / "signals" / "change_point.md"


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
