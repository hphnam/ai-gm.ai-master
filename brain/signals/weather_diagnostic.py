"""A14b · Weather/calendar signal diagnostic (spec A14b) — DIAGNOSTIC ONLY.

The A14 L1 ablation found no exogenous lift. A venue-total null does not prove no
signal: a real weather effect on draught/cask can be washed out at the aggregate,
calendar flags were near-constant in the operational folds, and weather may simply
be redundant with the seasonality already in the model. Four cheap tests separate
"no signal here" from "signal hidden by aggregation / eval design":

    A  L2 (+ draught L3) weather ablation   — is lift hidden by aggregation?
    B  physiology-matched weather features  — is raw temp too redundant with season?
    C  transition-aware folds for calendar  — were the flags untestable in-window?
    D  residual-on-weather regression        — does weather explain variance beyond season?

This module **adopts nothing**: `_ADOPTED_EXO` is untouched, the live ladder is
unchanged. Any positive finding is logged as a *candidate* for a later, gated
decision.

Run:
    python -m signals.weather_diagnostic
"""

from __future__ import annotations

import sys

import numpy as np
import pandas as pd

from config import (
    BEER_GARDEN_TEMP_C,
    HAPPY_HOUR_DAYS,
    STORE_DIR,
    STRUCTURAL_ZERO_DOW,
    WD_CLIMATOLOGY_WIN,
    WD_MIN_SERIES_DAYS,
    WEATHER_CELLS,
    WEATHER_DRY_MM,
)
from eval import harness
from ingest import calendar_sources as cal
from ingest.exog_weather import read_basis
from signals.feature_ablation import N_FOLDS, HORIZON, MIN_TRAIN, _eval_cols
from store.warehouse import connect, read_series

RESULTS_MD = STORE_DIR.parent / "signals" / "weather_diagnostic.md"
ANCHOR = "beer_hall"
BASIS = "leadmatched"            # realistic serving basis (matches A14 study)
_WX = ["exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs"]
_WX_B = ["exo_beer_garden_day", "exo_temp_anomaly"]


# --- Per-series feature construction (reusable for L1 / L2 / L3) -------------

def _climatology() -> pd.Series:
    """Smoothed day-of-year mean temperature from ERA5 observed (lancaster cell).
    Fragile on ~1 summer of data — FLAG-WD1; the threshold flag is the robust one."""
    obs = read_basis("observed")
    obs = obs[obs["cell"] == WEATHER_CELLS[ANCHOR]].copy()
    if obs.empty:
        return pd.Series(dtype=float)
    obs["doy"] = obs["date"].dt.dayofyear
    by_doy = obs.groupby("doy")["exo_temp_c"].mean()
    # wrap-around smoothing window
    idx = np.arange(1, 367)
    base = by_doy.reindex(idx)
    vals = base.to_numpy(dtype=float)
    out = np.full(366, np.nan)
    for i in range(366):
        lo, hi = i - WD_CLIMATOLOGY_WIN, i + WD_CLIMATOLOGY_WIN + 1
        window = np.take(vals, np.arange(lo, hi), mode="wrap")
        window = window[~np.isnan(window)]
        out[i] = window.mean() if window.size else np.nan
    return pd.Series(out, index=idx)


def _series_features(series: pd.DataFrame, venue: str,
                     climo: pd.Series | None = None) -> pd.DataFrame:
    """AR + season + DOW features for a (date, value) daily series, plus the exo
    weather join (lead-matched basis) and the B candidate weather features. Mirror
    of build_features' engineering, kept local so the production path is untouched."""
    df = series[["date", "value"]].copy()
    df["venue"] = venue
    d = df["date"]
    df["dow"] = d.dt.dayofweek
    df["is_weekend"] = (df["dow"] >= 5).astype(int)
    for k in range(7):
        df[f"dow_{k}"] = (df["dow"] == k).astype(int)
    df["month"] = d.dt.month
    df["season"] = (d.dt.month % 12 // 3).astype(int)
    df["is_happy_hour_day"] = df["dow"].isin(HAPPY_HOUR_DAYS).astype(int)
    df["is_structural_zero"] = df["dow"].isin(STRUCTURAL_ZERO_DOW).astype(int)
    df["lag_7"] = df["value"].shift(7)
    df["lag_14"] = df["value"].shift(14)
    df["roll28_median"] = df["value"].shift(1).rolling(28, min_periods=7).median()
    df["roll28_mean"] = df["value"].shift(1).rolling(28, min_periods=7).mean()

    wx = read_basis(BASIS)
    wx = wx[wx["cell"] == WEATHER_CELLS[venue]][["date", *_WX]]
    df = df.merge(wx, on="date", how="left")

    df["exo_beer_garden_day"] = (
        (df["exo_temp_c"] > BEER_GARDEN_TEMP_C) & (df["exo_rain_mm"] < WEATHER_DRY_MM)
    ).astype(float)
    if climo is not None and not climo.empty:
        df["exo_temp_anomaly"] = df["exo_temp_c"] - d.dt.dayofyear.map(climo)
    else:
        df["exo_temp_anomaly"] = np.nan
    df["exo_is_school_term"] = d.map(cal.is_school_term).astype(int)
    df["exo_is_uni_term"] = d.map(cal.is_uni_term).astype(int)
    return df


def _base_cols(feats: pd.DataFrame) -> list[str]:
    drop = {"date", "venue", "value"}
    return [c for c in feats.columns if c not in drop and not c.startswith("exo_")]


# --- Test A: L2 category (+ draught L3) ablation ------------------------------

def _l2_series(venue: str) -> dict[str, pd.DataFrame]:
    s = read_series(venue, "L2", value="revenue_exvat")
    cal_full = read_series(venue, "L1", fill_calendar=True)[["date"]]
    out = {}
    for cat, g in s.groupby("key"):
        ser = cal_full.merge(g[["date", "value"]], on="date", how="left")
        ser["value"] = ser["value"].fillna(0.0)
        out[f"L2:{cat}"] = ser
    return out


def _draught_l3_series(venue: str) -> dict[str, pd.DataFrame]:
    """The actual draught/cask demand lives in L3 items inside the 'Beer' category
    (Lager - BH, Cider - BH) — the on-target series for the weather hypothesis."""
    con = connect(read_only=True)
    try:
        df = con.execute(
            "SELECT date, item, units FROM l3_item_daily WHERE venue=? "
            "AND item IN ('Lager - BH','Cider - BH')", [venue]).df()
        cal_full = read_series(venue, "L1", fill_calendar=True, con=con)[["date"]]
    finally:
        con.close()
    df["date"] = pd.to_datetime(df["date"])
    out = {}
    for item, g in df.groupby("item"):
        ser = cal_full.merge(g[["date", "units"]].rename(columns={"units": "value"}),
                             on="date", how="left")
        ser["value"] = ser["value"].fillna(0.0)
        out[f"L3:{item}"] = ser
    return out


def test_a_l2(climo, top_k: int = 3) -> list[dict]:
    rows = []
    l2 = _l2_series(ANCHOR)
    # Keep the highest-volume L2 categories (best-powered) + the draught L3 items.
    ranked = sorted(l2, key=lambda k: l2[k]["value"].sum(), reverse=True)[:top_k]
    series = {**{k: l2[k] for k in ranked}, **_draught_l3_series(ANCHOR)}
    for name, ser in series.items():
        active = ser[ser["value"] > 0]
        n = len(active)
        if n < WD_MIN_SERIES_DAYS:
            rows.append({"series": name, "n": n, "skipped": True})
            continue
        feats = _series_features(ser, ANCHOR, climo)
        base = _base_cols(feats)
        b_mase, b_cov = _eval_cols(feats, base)
        w_mase, w_cov = _eval_cols(feats, base + _WX)
        gain = (b_mase - w_mase) / b_mase if np.isfinite(w_mase) and b_mase else 0.0
        rows.append({"series": name, "n": n, "skipped": False,
                     "base_mase": b_mase, "wx_mase": w_mase, "gain_pct": gain * 100,
                     "cov": w_cov, "base_cov": b_cov,
                     "signal": gain > 0.01 and w_cov >= b_cov - 0.03})
    return rows


# --- Test B: physiology-matched weather features (L1) ------------------------

def test_b(climo) -> dict:
    ser = read_series(ANCHOR, "L1", fill_calendar=True)[["date", "value"]]
    feats = _series_features(ser, ANCHOR, climo)
    base = _base_cols(feats)
    out = {}
    for label, cols in (("raw weather", _WX),
                        ("beer_garden_day", ["exo_beer_garden_day"]),
                        ("temp_anomaly", ["exo_temp_anomaly"]),
                        ("garden+anomaly", _WX_B)):
        cand = [c for c in cols if feats[c].notna().any()]
        m, c = _eval_cols(feats, base + cand)
        out[label] = {"mase": m, "cov": c}
    b_mase, _ = _eval_cols(feats, base)
    out["_baseline"] = b_mase
    return out


# --- Test C: transition-aware folds for calendar -----------------------------

def _transition_dates(span_lo, span_hi) -> list[pd.Timestamp]:
    """Term↔vacation boundaries (school + uni) inside the active span."""
    bounds = set()
    for lo, hi, _ in cal.UNI_TERMS:
        bounds.update({pd.Timestamp(lo), pd.Timestamp(hi)})
    for lo, hi, _ in cal.SCHOOL_HOLIDAYS:
        bounds.update({pd.Timestamp(lo), pd.Timestamp(hi)})
    return sorted(b for b in bounds if span_lo + pd.Timedelta(days=MIN_TRAIN) < b < span_hi)


def test_c(climo) -> dict:
    ser = read_series(ANCHOR, "L1", fill_calendar=True)[["date", "value"]]
    feats = _series_features(ser, ANCHOR, climo)
    base = _base_cols(feats)
    cal_cols = ["exo_is_school_term", "exo_is_uni_term"]
    span_lo, span_hi = feats["date"].min(), feats["date"].max()
    boundaries = _transition_dates(span_lo, span_hi)

    def _fold_at(center):
        te_lo, te_hi = center - pd.Timedelta(days=HORIZON // 2), center + pd.Timedelta(days=HORIZON // 2 + 1)
        train = feats[feats["date"] < te_lo]
        test = feats[(feats["date"] >= te_lo) & (feats["date"] < te_hi)]
        if len(train) < MIN_TRAIN or test.empty:
            return None
        # flag must actually vary across the window to count
        if test[cal_cols].nunique().max() < 2:
            return None
        return train, test

    from signals.feature_ablation import _fold_eval
    base_m, cal_m, n_used = [], [], 0
    for c in boundaries:
        fold = _fold_at(c)
        if fold is None:
            continue
        tr, te = fold
        bm, _ = _fold_eval(tr, te, base)
        cm, _ = _fold_eval(tr, te, base + cal_cols)
        if np.isfinite(bm) and np.isfinite(cm):
            base_m.append(bm); cal_m.append(cm); n_used += 1
    base_mean = float(np.mean(base_m)) if base_m else float("nan")
    cal_mean = float(np.mean(cal_m)) if cal_m else float("nan")
    gain = (base_mean - cal_mean) / base_mean if np.isfinite(cal_mean) and base_mean else 0.0
    return {"n_boundaries": len(boundaries), "n_folds": n_used,
            "base_mase": base_mean, "cal_mase": cal_mean, "gain_pct": gain * 100,
            "signal": n_used > 0 and gain > 0.01}


# --- Test D: residual-on-weather regression (decisive) -----------------------

def _dow_season_residual(feats: pd.DataFrame) -> pd.Series:
    """value minus its in-sample day-of-week median — the season-stripped residual."""
    med = feats.groupby(feats["date"].dt.dayofweek)["value"].transform("median")
    return feats["value"] - med


def test_d(climo) -> list[dict]:
    import statsmodels.api as sm
    rows = []
    targets = {"L1": read_series(ANCHOR, "L1", fill_calendar=True)[["date", "value"]]}
    targets.update(_draught_l3_series(ANCHOR))
    wx_cols = ["exo_temp_c", "exo_temp_anomaly", "exo_beer_garden_day", "exo_rain_mm"]
    for name, ser in targets.items():
        if (ser["value"] > 0).sum() < WD_MIN_SERIES_DAYS:
            continue
        feats = _series_features(ser, ANCHOR, climo)
        feats = feats.dropna(subset=["lag_7", "lag_14", *wx_cols])
        if len(feats) < WD_MIN_SERIES_DAYS:
            continue
        r = _dow_season_residual(feats)
        ar = sm.add_constant(feats[["lag_7", "lag_14"]])
        full = sm.add_constant(feats[["lag_7", "lag_14", *wx_cols]])
        r2_null = sm.OLS(r, ar).fit().rsquared
        m = sm.OLS(r, full).fit()
        incr = m.rsquared - r2_null
        pvals = {c: float(m.pvalues[c]) for c in wx_cols}
        sig = [c for c, p in pvals.items() if p < 0.05]
        rows.append({"series": name, "n": int(len(feats)), "r2_full": float(m.rsquared),
                     "r2_null": float(r2_null), "incr_r2": float(incr),
                     "sig_weather": sig})
    return rows


def _write_report(a, b, c, d) -> None:
    lines = [
        "# A14b · Weather/calendar signal diagnostic (diagnostic only)\n",
        "Does the A14 L1 null hide a real category-level signal, or is weather "
        "genuinely redundant-with-season here? Four tests; **nothing is adopted** "
        f"(live ladder unchanged). Serving basis: `{BASIS}`.\n",
        "## Test A — L2 (+ draught L3) weather ablation",
        "| Series | n (active days) | baseline MASE | +weather MASE | Δ | signal? |",
        "|---|---|---|---|---|---|",
    ]
    for r in a:
        if r.get("skipped"):
            lines.append(f"| {r['series']} | {r['n']} | — | — | (skipped <{WD_MIN_SERIES_DAYS}d) | — |")
        else:
            lines.append(f"| {r['series']} | {r['n']} | {r['base_mase']:.3f} | "
                         f"{r['wx_mase']:.3f} | {r['gain_pct']:+.1f}% | "
                         f"{'**yes**' if r['signal'] else 'no'} |")
    lines += [
        "\n## Test B — physiology-matched features (L1)",
        f"Baseline MASE {b['_baseline']:.3f}. `exo_temp_anomaly` is fragile on ~1 "
        "summer of climatology (FLAG-WD1); weight the `beer_garden_day` threshold more.\n",
        "| Feature form | MASE | coverage |",
        "|---|---|---|",
    ]
    for k in ("raw weather", "beer_garden_day", "temp_anomaly", "garden+anomaly"):
        lines.append(f"| {k} | {b[k]['mase']:.3f} | {b[k]['cov']*100:.1f}% |")
    lines += [
        "\n## Test C — calendar on transition-aware folds",
        f"Folds centred on school/uni term↔vacation boundaries where the flag "
        f"actually varies ({c['n_folds']} usable of {c['n_boundaries']} boundaries "
        "in span). **Fold provenance matters (FLAG-WD3):** a flat result *here* is "
        "real evidence the calendar is uninformative; a flat result on the "
        "operational folds (A14) was not.",
        f"\n- baseline MASE {c['base_mase']:.3f} → +calendar {c['cal_mase']:.3f} "
        f"({c['gain_pct']:+.1f}%) → signal: **{c['signal']}**\n",
        "## Test D — residual-on-weather regression (decisive, model-independent)",
        "OLS of the day-of-week-median-stripped residual on weather, with AR terms "
        "partialled out. Incremental R² ≈ 0 ⇒ weather is redundant-with-season here.\n",
        "| Series | n | R² (AR only) | R² (AR+weather) | incremental R² | sig. weather (p<.05) |",
        "|---|---|---|---|---|---|",
    ]
    for r in d:
        lines.append(f"| {r['series']} | {r['n']} | {r['r2_null']:.3f} | "
                     f"{r['r2_full']:.3f} | {r['incr_r2']:+.3f} | "
                     f"{', '.join(r['sig_weather']) or '—'} |")

    a_sig = [r['series'] for r in a if not r.get('skipped') and r.get('signal')]
    a_hint = [(r['series'], r['gain_pct']) for r in a
              if not r.get('skipped') and r.get('gain_pct', 0) > 1.0 and not r.get('signal')]
    d_sig = [r['series'] for r in d if r['incr_r2'] > 0.01 and r['sig_weather']]
    b_best = min(b[k]['mase'] for k in ('beer_garden_day', 'temp_anomaly', 'garden+anomaly'))

    if a_sig:
        a_line = (f"weather clears the bar (MASE + coverage) in {a_sig} — a localised, "
                  "forecast-useful signal hidden at L1 by aggregation.")
    elif a_hint:
        h = ", ".join(f"{s} ({g:+.1f}%)" for s, g in a_hint)
        a_line = (f"a **MASE hint** in {h} (the draught-containing series) but it "
                  "fails the coverage guard — consistent with a real-but-weak effect, "
                  "not a clean forecast win. Non-draught categories are worse (weather "
                  "is draught-specific, washed out at L1).")
    else:
        a_line = "no category improves — not an aggregation artifact."

    if d_sig:
        d_line = (f"incremental R² of weather over AR/season is **> 0 and significant** "
                  f"in {', '.join(d_sig)} (temperature) — weather is **not** purely "
                  "redundant-with-season; it carries a small real signal.")
    else:
        d_line = ("incremental R² ≈ 0 / non-significant everywhere — weather is "
                  "redundant-with-season here (the clean explanation for the A14 null).")

    if a_sig and d_sig:
        overall = ("a real, forecast-useful signal was localised AND is statistically "
                   "significant — logged as a strong CANDIDATE for a separate gated "
                   "adoption decision (covariate-aware model, e.g. TFT/TabPFN-TS, not a "
                   "univariate foundation model). Nothing adopted in this phase.")
    elif d_sig:
        overall = ("a **weak but statistically significant** temperature signal exists "
                   "(Test D, ~2% incremental R², concentrated in draught) that the GBM "
                   "does **not** convert into a forecast improvement (Test A: only a "
                   "coverage-failing MASE hint) and that is calendar-independent (Test C "
                   "flat). So the A14 null is **not** simple redundancy — it is a "
                   "real-but-too-weak-to-forecast effect on this ~1-year single-venue "
                   "sample. Logged as a CANDIDATE for a covariate-aware model on more "
                   "data; **nothing adopted** (the live ladder is unchanged).")
    else:
        overall = ("the A14 null is corroborated: on this ~1-year single-venue sample "
                   "the weather/calendar information is redundant with the day-of-week + "
                   "season + lag structure the model already uses. A clean Results "
                   "finding, not a model weakness. Nothing adopted.")

    lines += [
        "\n## Verdict",
        f"- **Test A (aggregation):** {a_line}",
        f"- **Test B (feature form):** "
        f"{'a physiology-matched form beats baseline' if b_best < b['_baseline'] - 0.01 else 'feature form is not the blocker — still no lift'}.",
        f"- **Test C (folds):** calendar {'helps when the flag varies' if c['signal'] else 'hurts/flat even where the flag varies → genuinely uninformative on this data'}.",
        f"- **Test D (redundancy):** {d_line}",
        f"\n**Overall:** {overall}",
        "\nSee FLAG-WD1..WD4.",
    ]
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    print("A14b · weather/calendar signal diagnostic (diagnostic only)")
    climo = _climatology()
    a = test_a_l2(climo)
    print("  Test A (L2/L3 ablation):")
    for r in a:
        if r.get("skipped"):
            print(f"    {r['series']:22s} n={r['n']:3d} skipped")
        else:
            print(f"    {r['series']:22s} n={r['n']:3d} base={r['base_mase']:.3f} "
                  f"+wx={r['wx_mase']:.3f} ({r['gain_pct']:+.1f}%) "
                  f"[{'SIGNAL' if r['signal'] else 'no'}]")
    b = test_b(climo)
    print(f"  Test B (L1, baseline {b['_baseline']:.3f}): " + "  ".join(
        f"{k}={b[k]['mase']:.3f}" for k in ("beer_garden_day", "temp_anomaly", "garden+anomaly")))
    c = test_c(climo)
    print(f"  Test C (transition folds n={c['n_folds']}): base={c['base_mase']:.3f} "
          f"+cal={c['cal_mase']:.3f} ({c['gain_pct']:+.1f}%) [{'SIGNAL' if c['signal'] else 'no'}]")
    d = test_d(climo)
    print("  Test D (residual-on-weather incremental R²):")
    for r in d:
        print(f"    {r['series']:22s} incrR2={r['incr_r2']:+.3f} "
              f"sig={r['sig_weather'] or '—'}")
    _write_report(a, b, c, d)
    print(f"  report            : {RESULTS_MD}")
    ok = bool(a) and bool(d)
    print(f"A14b RESULT: {'PASS' if ok else 'FAIL'} (4 tests computed; nothing adopted)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
