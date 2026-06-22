"""A4 · The baseline ladder (methodology §2 / step 4).

Climb one rung at a time; **adopt a rung only if it beats the rung below** on
held-out MASE. Two evaluation regimes are reported:

  * **static**  — one forecast of the last 8 weeks, multi-step from the train
    origin (the GBM feeds its own predictions back as lags). A stress test; the
    robust DOW profile is very hard to beat over such a long static horizon.
  * **rolling** — expanding-window rolling-origin, 7-day horizon (methodology
    §3.1). This is the operational regime the brief actually needs ("next
    week's keg order") and the **milestone gate**: a model is adopted only if
    it beats both seasonal-naive and robust DOW here, on strictly held-out
    folds.

    Rung 0  seasonal-naive (lag-7)             — the MASE denominator
    Rung 1  robust DOW x seasonal index        — the interpretable baseline
    Rung 2  STL / ETS / Prophet                — classical decomposition
    Rung 3  gradient boosting (+ global pool)  — non-linear, partial pooling
    Rung 4  foundation models                  — optional, Tan-ablation gated

Run:
    python -m models.ladder --layer L1
"""

from __future__ import annotations

import argparse
import sys
import warnings
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from config import (
    ANCHOR_VENUE,
    FORECAST_VENUES,
    MAX_RUNG,
    SEASONAL_PERIOD,
    STORE_DIR,
    VENUE_LABELS,
)
from eval import harness
from features.build_features import build_features, feature_columns
from store.active_span import active_trading_end, is_closed, trim_to_active

warnings.filterwarnings("ignore")

MODELS_DIR = STORE_DIR.parent / "models_L1"


def _report_path(venue: str):
    return STORE_DIR.parent / "models" / f"ladder_results_L1_{venue}.md"


def _load_feats(venue: str) -> pd.DataFrame:
    """Build features, then trim to the venue's active trading span so a closed
    venue's zero-tail (e.g. TRT after 2026-05-08) is never the held-out test
    block — otherwise every model trivially 'wins' by predicting zero."""
    return trim_to_active(build_features(venue), venue)

try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    from statsmodels.tsa.seasonal import STL

    _HAS_STATSMODELS = True
except Exception:  # pragma: no cover
    _HAS_STATSMODELS = False

try:
    import logging

    logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
    from prophet import Prophet

    _HAS_PROPHET = True
except Exception:  # pragma: no cover
    _HAS_PROPHET = False


@dataclass
class RungResult:
    name: str
    rung: int
    metrics: dict = field(default_factory=dict)
    predictions: np.ndarray | None = None
    available: bool = True
    note: str = ""


# --- Recursive lag bookkeeping ----------------------------------------------

def _history(train: pd.DataFrame) -> dict:
    return {pd.Timestamp(d).normalize(): float(v)
            for d, v in zip(train["date"], train["value"])}


def _recursive_lags(hist: dict, d: pd.Timestamp) -> dict:
    d = pd.Timestamp(d).normalize()
    lag7 = hist.get(d - pd.Timedelta(days=7))
    lag14 = hist.get(d - pd.Timedelta(days=14))
    window = [hist[d - pd.Timedelta(days=k)] for k in range(1, 29)
              if (d - pd.Timedelta(days=k)) in hist]
    roll_med = float(np.median(window)) if window else np.nan
    roll_mean = float(np.mean(window)) if window else np.nan
    fallback = roll_mean if window else 0.0
    return {
        "lag_7": lag7 if lag7 is not None else fallback,
        "lag_14": lag14 if lag14 is not None else fallback,
        "roll28_median": roll_med if window else fallback,
        "roll28_mean": roll_mean if window else fallback,
    }


# --- Rung 0 ------------------------------------------------------------------

def rung0_seasonal_naive(train: pd.DataFrame, target: pd.DataFrame, _cols=None) -> np.ndarray:
    hist = _history(train)
    preds = []
    for d in target["date"]:
        lag = _recursive_lags(hist, d)["lag_7"]
        preds.append(lag)
        hist[pd.Timestamp(d).normalize()] = lag  # repeat the weekly pattern forward
    return np.asarray(preds, float)


# --- Rung 1 ------------------------------------------------------------------

def rung1_robust_dow(train: pd.DataFrame, target: pd.DataFrame, _cols=None) -> np.ndarray:
    dow_median = train.groupby("dow")["value"].median()
    overall = train["value"].median()
    month_index = (
        train.groupby(train["date"].dt.month)["value"].median() / max(overall, 1e-9)
    ).clip(0.5, 2.0)
    bh_train = train[train["is_bank_holiday"] == 1]
    if len(bh_train) >= 3:
        ratio = (bh_train["value"] / bh_train["dow"].map(dow_median)).replace(
            [np.inf, -np.inf], np.nan
        ).dropna()
        bh_factor = float(ratio.median()) if len(ratio) else 1.0
    else:
        bh_factor = 1.0

    preds = []
    for _, row in target.iterrows():
        base = dow_median.get(row["dow"], overall)
        base *= month_index.get(row["date"].month, 1.0)
        if row["is_bank_holiday"] == 1:
            base *= bh_factor
        preds.append(base)
    return np.asarray(preds, float)


# --- Rung 2 ------------------------------------------------------------------

def rung2_stl(train: pd.DataFrame, target: pd.DataFrame, _cols=None) -> np.ndarray:
    s = train.set_index("date")["value"].asfreq("D").fillna(0.0)
    res = STL(s, period=SEASONAL_PERIOD, robust=True).fit()
    seasonal_by_dow = (
        pd.Series(res.seasonal.values, index=s.index).groupby(s.index.dayofweek).mean()
    )
    trend_level = float(res.trend.iloc[-1])
    return np.asarray(
        [max(trend_level + seasonal_by_dow.get(d.dayofweek, 0.0), 0.0)
         for d in target["date"]],
        float,
    )


def rung2_ets(train: pd.DataFrame, target: pd.DataFrame, _cols=None) -> np.ndarray:
    s = train.set_index("date")["value"].asfreq("D").fillna(0.0)
    model = ExponentialSmoothing(
        s, trend="add", seasonal="add", seasonal_periods=SEASONAL_PERIOD,
        initialization_method="estimated",
    ).fit()
    return np.clip(model.forecast(len(target)).to_numpy(), 0, None)


def rung2_prophet(train: pd.DataFrame, target: pd.DataFrame, _cols=None) -> np.ndarray:
    dfp = train[["date", "value"]].rename(columns={"date": "ds", "value": "y"})
    m = Prophet(weekly_seasonality=True, yearly_seasonality=False,
                daily_seasonality=False)
    m.add_country_holidays(country_name="UK")
    m.fit(dfp)
    future = pd.DataFrame({"ds": target["date"].to_numpy()})
    return np.clip(m.predict(future)["yhat"].to_numpy(), 0, None)


# --- Rung 3 ------------------------------------------------------------------

def _fit_gbm(X: pd.DataFrame, y: np.ndarray) -> HistGradientBoostingRegressor:
    # HistGradientBoosting is a native (libomp-free) GBM — the same family as
    # XGBoost/LightGBM, used here so the rung runs without an OpenMP runtime.
    model = HistGradientBoostingRegressor(
        max_iter=400, learning_rate=0.05, max_leaf_nodes=31,
        min_samples_leaf=10, l2_regularization=1.0, random_state=0,
    )
    model.fit(X, y)
    return model


def _recursive_gbm_predict(
    model, train: pd.DataFrame, target: pd.DataFrame, cols: list[str],
    extra: dict | None = None,
) -> np.ndarray:
    hist = _history(train)
    preds = []
    for _, row in target.iterrows():
        feat = row.copy()
        for k, v in _recursive_lags(hist, row["date"]).items():
            feat[k] = v
        if extra:
            for k, v in extra.items():
                feat[k] = v
        x = pd.DataFrame([feat[cols].to_dict()])
        yhat = max(float(model.predict(x)[0]), 0.0)
        preds.append(yhat)
        hist[pd.Timestamp(row["date"]).normalize()] = yhat
    return np.asarray(preds, float)


def rung3_gbm(train: pd.DataFrame, target: pd.DataFrame, cols: list[str]) -> np.ndarray:
    fit = train.dropna(subset=["lag_14", "roll28_median"])
    model = _fit_gbm(fit[cols], fit["value"].to_numpy())
    return _recursive_gbm_predict(model, train, target, cols)


def global_gbm_predict(
    venue: str, train: pd.DataFrame, target: pd.DataFrame, cols: list[str]
) -> np.ndarray:
    """One global GBM across all venues with a venue indicator (partial pooling).

    Trained only on rows up to the fold's train end, so it is leakage-safe when
    reused inside the rolling backtest and in A7's LOVO transfer.
    """
    cutoff = train["date"].max()
    frames = []
    for v in FORECAST_VENUES:
        vf = build_features(v)
        vf = vf[vf["date"] <= cutoff].dropna(subset=["lag_14", "roll28_median"])
        frames.append(vf)
    pooled = pd.concat(frames, ignore_index=True)
    venue_dummies = pd.get_dummies(pooled["venue"], prefix="ven")
    pooled = pd.concat([pooled, venue_dummies], axis=1)
    ven_cols = list(venue_dummies.columns)
    feat_cols = cols + ven_cols

    model = _fit_gbm(pooled[feat_cols], pooled["value"].to_numpy())
    extra = {c: (1 if c == f"ven_{venue}" else 0) for c in ven_cols}
    return _recursive_gbm_predict(model, train, target, feat_cols, extra=extra)


# --- Predictor registry ------------------------------------------------------

PREDICTORS: list[tuple[str, int, object, bool]] = [
    ("rung0_seasonal_naive", 0, rung0_seasonal_naive, True),
    ("rung1_robust_dow", 1, rung1_robust_dow, True),
    ("rung2_stl", 2, rung2_stl, _HAS_STATSMODELS),
    ("rung2_ets", 2, rung2_ets, _HAS_STATSMODELS),
    ("rung2_prophet", 2, rung2_prophet, _HAS_PROPHET),
    ("rung3_gbm", 3, rung3_gbm, True),
]


def _predict_all(
    venue: str, train: pd.DataFrame, target: pd.DataFrame, cols: list[str],
    *, with_prophet: bool = True,
) -> list[tuple[str, int, np.ndarray | None, str]]:
    cap = MAX_RUNG.get(venue, 99)
    cap_note = (f"capped at Rung {cap} per Data Audit Report §8.3 — insufficient "
                "training signal for classical/ML rungs")
    out: list[tuple[str, int, np.ndarray | None, str]] = []
    for name, rung, fn, avail in PREDICTORS:
        if rung > cap:
            out.append((name, rung, None, cap_note))
            continue
        if name == "rung2_prophet" and not with_prophet:
            out.append((name, rung, None, "skipped (rolling)"))
            continue
        if not avail:
            out.append((name, rung, None, "backend not installed"))
            continue
        try:
            out.append((name, rung, fn(train, target, cols), ""))
        except Exception as exc:  # pragma: no cover - defensive
            out.append((name, rung, None, f"error: {type(exc).__name__}"))
    if 3 > cap:
        out.append(("rung3_global_gbm", 3, None, cap_note))
    else:
        try:
            out.append(("rung3_global_gbm", 3,
                        global_gbm_predict(venue, train, target, cols), ""))
        except Exception as exc:  # pragma: no cover
            out.append(("rung3_global_gbm", 3, None, f"error: {type(exc).__name__}"))
    return out


def _rung4_foundation() -> RungResult:
    for mod in ("chronos", "timesfm", "moirai"):
        try:
            __import__(mod)
            return RungResult("rung4_foundation", 4, available=False,
                              note=f"{mod} present — wire zero-shot eval + Tan ablation")
        except Exception:
            continue
    return RungResult(
        "rung4_foundation", 4, available=False,
        note="no foundation backend installed; Tan ablation: adopt only if it "
        "beats rung3_global_gbm — not evaluated.",
    )


# --- Evaluation regimes ------------------------------------------------------

def evaluate_static(venue: str = ANCHOR_VENUE):
    feats = _load_feats(venue)
    cols = feature_columns(feats)
    split = harness.time_split(feats)
    train, test = split.train, split.test
    ytr, yte = train["value"].to_numpy(), test["value"].to_numpy()

    results = []
    for name, rung, preds, note in _predict_all(venue, train, test, cols, with_prophet=True):
        if preds is None:
            results.append(RungResult(name, rung, available=False, note=note))
        else:
            results.append(RungResult(
                name, rung,
                metrics=harness.point_metrics(yte, preds, ytr, season=SEASONAL_PERIOD),
                predictions=preds))
    results.append(_rung4_foundation())
    return results, split, cols


def evaluate_rolling(
    venue: str = ANCHOR_VENUE, *, n_folds: int = 6, horizon: int = 7,
    with_prophet: bool = True,
):
    feats = _load_feats(venue)
    cols = feature_columns(feats)
    folds = list(harness.rolling_origin(
        feats, n_folds=n_folds, horizon_days=horizon, min_train_days=120))

    acc: dict[str, list[float]] = {}
    rungs: dict[str, int] = {}
    notes: dict[str, str] = {}
    for tr, te in folds:
        ytr, yte = tr["value"].to_numpy(), te["value"].to_numpy()
        for name, rung, preds, note in _predict_all(
            venue, tr, te, cols, with_prophet=with_prophet
        ):
            rungs[name] = rung
            if preds is None:
                notes[name] = note
            else:
                acc.setdefault(name, []).append(
                    harness.mase(yte, preds, ytr, SEASONAL_PERIOD))

    results = []
    for name, rung in sorted(rungs.items(), key=lambda x: (x[1], x[0])):
        vals = [v for v in acc.get(name, []) if np.isfinite(v)]
        if vals:
            results.append(RungResult(
                name, rung,
                metrics={"MASE": float(np.mean(vals)), "folds": len(vals)}))
        else:
            results.append(RungResult(name, rung, available=False,
                                      note=notes.get(name, "")))
    results.append(_rung4_foundation())
    return results, len(folds)


# --- Selection / milestone ---------------------------------------------------

def _finite(results: list[RungResult]) -> list[RungResult]:
    return [r for r in results if r.available and r.metrics
            and np.isfinite(r.metrics.get("MASE", np.nan))]


def select_best(results: list[RungResult]) -> RungResult | None:
    finite = _finite(results)
    return min(finite, key=lambda r: r.metrics["MASE"]) if finite else None


def milestone(results: list[RungResult], cap: int = 99) -> tuple[bool, dict]:
    by_name = {r.name: r for r in results if r.metrics}
    naive = by_name.get("rung0_seasonal_naive")
    dow = by_name.get("rung1_robust_dow")
    best = select_best(results)
    if not (naive and dow and best):
        return False, {}
    if cap <= 1:
        # Capped venue (e.g. Ellel): the ladder stops at Rung 1, so the
        # adoption criterion is "robust DOW (Rung 1) beats seasonal-naive (Rung
        # 0)" — there is no higher rung that could beat Rung 1.
        passed = dow.metrics["MASE"] < naive.metrics["MASE"]
        gate = "Rung 1 (robust DOW) beats seasonal-naive"
        best = dow
    else:
        passed = (best.metrics["MASE"] < naive.metrics["MASE"]
                  and best.metrics["MASE"] < dow.metrics["MASE"])
        gate = "beats seasonal-naive AND robust DOW"
    return passed, {
        "best": best.name,
        "best_mase": best.metrics["MASE"],
        "naive_mase": naive.metrics["MASE"],
        "dow_mase": dow.metrics["MASE"],
        "gate": gate,
    }


def _table(results: list[RungResult], cols: tuple[str, ...]) -> list[str]:
    header = "| Rung | Model | " + " | ".join(cols) + " | Note |"
    sep = "|" + "---|" * (len(cols) + 3)
    rows = [header, sep]
    for r in sorted(results, key=lambda x: (x.rung, x.name)):
        if r.metrics:
            cells = " | ".join(
                f"{r.metrics[c]:.3f}" if isinstance(r.metrics.get(c), float)
                else str(r.metrics.get(c, "")) for c in cols)
            rows.append(f"| {r.rung} | {r.name} | {cells} | {r.note} |")
        else:
            rows.append(f"| {r.rung} | {r.name} | " + " | ".join("–" for _ in cols)
                        + f" | {r.note} |")
    return rows


def _write_report(
    venue, static_res, split, rolling_res, n_folds, passed, info,
    extra_sections=None,
) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    label = VENUE_LABELS.get(venue, venue)
    cap = MAX_RUNG.get(venue)
    out = [
        f"# A4 · L1 ladder results ({label})\n",
    ]
    if is_closed(venue):
        out.append(
            f"> **{label} is currently closed** (last active day "
            f"{active_trading_end(venue).date()}). This evaluation uses the "
            "pre-closure active span only — the closure is modelled as a known "
            "structural break, not a forecast target. The persisted band reflects "
            "pre-closure rhythm and has **not** been validated against any "
            "post-reopening data.\n")
    if cap is not None:
        out.append(
            f"> **Ladder capped at Rung {cap}** for this venue (Data Audit Report "
            "§8.3 — insufficient training signal for classical/ML rungs). Rungs "
            "above the cap are listed as 'capped', not silently omitted.\n")
    out += [
        "## Operational regime — rolling-origin, 7-day horizon (the milestone gate)",
        f"Expanding-window backtest, {n_folds} held-out folds. MASE per fold vs "
        "in-sample seasonal-naive (m=7), averaged.\n",
        *_table(rolling_res, ("MASE", "folds")),
        "\n## Static regime — single 8-week held-out block (multi-step from origin)",
        f"Test {split.test['date'].min().date()} → {split.test['date'].max().date()} "
        f"(n={len(split.test)}). A stress test over a long static horizon.\n",
        *_table(static_res, ("MASE", "MAE", "RMSE", "sMAPE")),
        "\n## Milestone (rolling regime)",
        f"- gate: *{info.get('gate', 'beats seasonal-naive AND robust DOW')}*",
        f"- best model: **{info.get('best')}** (MASE {info.get('best_mase', float('nan')):.3f})",
        f"- seasonal-naive MASE: {info.get('naive_mase', float('nan')):.3f}",
        f"- robust-DOW MASE: {info.get('dow_mase', float('nan')):.3f}",
        f"- **gate met: {passed}**\n",
    ]
    out.extend(extra_sections or [])
    RESULTS_MD = _report_path(venue)
    RESULTS_MD.write_text("\n".join(out))
    return RESULTS_MD


def ets_prophet_diagnostic(venue: str) -> list[str]:
    """FIX-7: are ETS and Prophet's identical MASE a genuine convergence (they
    differ per-day but tie on average) or pointwise-identical (Prophet reduced
    to the same fit)? Recorded so the dissertation cites it honestly."""
    if not (_HAS_STATSMODELS and _HAS_PROPHET):
        return []
    feats = _load_feats(venue)
    cols = feature_columns(feats)
    lines = ["## Diagnostic — ETS vs Prophet (FIX-7)",
             "Per rolling-origin fold: max pointwise |ETS − Prophet| and their "
             "correlation.\n",
             "| Fold | max&#124;Δ&#124; | corr |", "|---|---|---|"]
    diffs = []
    for k, (tr, te) in enumerate(
        harness.rolling_origin(feats, n_folds=6, horizon_days=7, min_train_days=120), 1
    ):
        e, p = rung2_ets(tr, te, cols), rung2_prophet(tr, te, cols)
        md = float(np.max(np.abs(e - p)))
        corr = (float(np.corrcoef(e, p)[0, 1])
                if len(e) > 1 and np.std(e) > 0 and np.std(p) > 0 else float("nan"))
        diffs.append(md)
        lines.append(f"| {k} | {md:.1f} | {corr:.3f} |")
    verdict = (
        f"ETS and Prophet differ per-day (max |Δ| up to £{max(diffs):.0f}) yet "
        "land on the same average MASE — genuinely independent forecasts that "
        "happen to tie, not a computation bug."
        if max(diffs) > 1.0 else
        "ETS and Prophet are near-identical pointwise — on this strongly "
        "DOW-dominated series Prophet's additive weekly+holiday decomposition "
        "reduces to essentially the same fit as additive Holt-Winters; the equal "
        "MASE is expected, not an unexplained coincidence.")
    lines.append("\n" + verdict + "\n")
    return lines


def spillover_importance(venue: str) -> list[str]:
    """FIX-8: permutation importance of is_ellel_event in the Beer Hall GBM —
    does an Ellel event night spill over into Beer Hall demand?"""
    from sklearn.inspection import permutation_importance

    feats = _load_feats(venue)
    cols = feature_columns(feats)
    if "is_ellel_event" not in cols:
        return []
    split = harness.time_split(feats)
    fit = split.train.dropna(subset=["lag_14", "roll28_median"])
    test = split.test.dropna(subset=["lag_14", "roll28_median"])
    if test.empty:
        return []
    model = _fit_gbm(fit[cols], fit["value"].to_numpy())
    r = permutation_importance(
        model, test[cols], test["value"].to_numpy(), n_repeats=10, random_state=0)
    imp = float(r.importances_mean[cols.index("is_ellel_event")])
    ranked = sorted(zip(cols, r.importances_mean, strict=True), key=lambda x: -x[1])
    rank = [c for c, _ in ranked].index("is_ellel_event") + 1
    verdict = ("supports" if imp > 0 and rank <= len(cols) / 2
               else "does not support" if imp <= 0
               else "is weak / inconclusive for")
    return [
        "## Spillover-hypothesis check — is_ellel_event (FIX-8)",
        f"Permutation importance of `is_ellel_event` in the Rung-3 Beer Hall GBM "
        f"(held-out fold, 10 repeats): **{imp:.4f}** (rank {rank}/{len(cols)} of "
        "features).",
        f"This **{verdict}** the audit's hypothesis that Ellel event nights spill "
        "over into Beer Hall demand.\n",
    ]


def _run_one(venue: str, layer: str) -> bool:
    print(f"A4 · baseline ladder ({layer}, {venue})")
    static_res, split, _ = evaluate_static(venue)
    print("  -- static (8-week block) --")
    for r in sorted(static_res, key=lambda x: (x.rung, x.name)):
        if r.metrics:
            print(f"    [{r.rung}] {r.name:22s} MASE={r.metrics['MASE']:.3f}")
        else:
            print(f"    [{r.rung}] {r.name:22s} skipped — {r.note}")

    rolling_res, n_folds = evaluate_rolling(venue, n_folds=6, horizon=7)
    print(f"  -- rolling (7-day, {n_folds} folds) [milestone gate] --")
    for r in sorted(rolling_res, key=lambda x: (x.rung, x.name)):
        if r.metrics:
            print(f"    [{r.rung}] {r.name:22s} MASE={r.metrics['MASE']:.3f} "
                  f"(folds={r.metrics.get('folds')})")
        else:
            print(f"    [{r.rung}] {r.name:22s} skipped — {r.note}")

    passed, info = milestone(rolling_res, cap=MAX_RUNG.get(venue, 99))
    extra = (ets_prophet_diagnostic(venue) + spillover_importance(venue)
             if venue == ANCHOR_VENUE else [])
    report_path = _write_report(
        venue, static_res, split, rolling_res, n_folds, passed, info, extra)
    if info:
        print(f"  best={info['best']} (MASE {info['best_mase']:.3f}) vs "
              f"naive {info['naive_mase']:.3f} / DOW {info['dow_mase']:.3f}")
    print(f"  report            : {report_path}")
    print(f"A4 RESULT ({venue}): {'PASS' if passed else 'FAIL'} "
          f"(rolling: {info.get('gate', '—')})")
    return passed


def main() -> int:
    ap = argparse.ArgumentParser(description="Proactive Brain baseline ladder")
    ap.add_argument("--layer", default="L1")
    ap.add_argument("--venue", default=ANCHOR_VENUE)
    ap.add_argument("--all-venues", action="store_true",
                    help="run every FORECAST_VENUES venue (the canonical pipeline)")
    args = ap.parse_args()

    venues = list(FORECAST_VENUES) if args.all_venues else [args.venue]
    # The anchor (Beer Hall) is the milestone gate; closed/capped venues report
    # their own status but don't fail the run (they are coverage targets, not
    # the milestone). Exit nonzero only if the anchor's milestone fails.
    anchor_ok = True
    for v in venues:
        ok = _run_one(v, args.layer)
        if v == ANCHOR_VENUE:
            anchor_ok = ok
    return 0 if anchor_ok else 1


if __name__ == "__main__":
    sys.exit(main())
