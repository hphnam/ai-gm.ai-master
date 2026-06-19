"""A2 · Evaluation harness — built *before* any model (methodology §3).

Everything a rung is scored on lives here so every rung is judged identically:
time-aware splits, an expanding-window rolling-origin backtest, a leave-one-
venue-out scaffold for the transfer claim, and the metric battery (MASE,
MAE/RMSE, sMAPE, interval coverage, Winkler, mean pinball, mean width). Leakage
guards are explicit — `assert_no_leakage` raises if any train fold contains a
date at/after its test fold.

Run:
    python -m eval.harness          # end-to-end on a dummy (seasonal-naive)
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from typing import Iterator

import numpy as np
import pandas as pd

from config import SEASONAL_PERIOD, TEST_WEEKS, VAL_WEEKS


class LeakageError(AssertionError):
    """Raised when a train fold contains information from its test horizon."""


@dataclass
class TimeSplit:
    train: pd.DataFrame
    val: pd.DataFrame
    test: pd.DataFrame

    def describe(self) -> str:
        def span(d: pd.DataFrame) -> str:
            if d.empty:
                return "empty"
            return f"{d['date'].min().date()}..{d['date'].max().date()} (n={len(d)})"
        return (
            f"train {span(self.train)} | val {span(self.val)} | test {span(self.test)}"
        )


# --- Splits ------------------------------------------------------------------

def time_split(
    df: pd.DataFrame,
    *,
    date_col: str = "date",
    test_weeks: int = TEST_WEEKS,
    val_weeks: int = VAL_WEEKS,
) -> TimeSplit:
    """Hold out the last `test_weeks`; validate on the `val_weeks` before it.

    Never shuffles. Boundaries are by calendar date so a gap-free reindex is
    not assumed.
    """
    df = df.sort_values(date_col).reset_index(drop=True)
    last = df[date_col].max()
    test_start = last - pd.Timedelta(weeks=test_weeks)
    val_start = test_start - pd.Timedelta(weeks=val_weeks)

    train = df[df[date_col] <= val_start]
    val = df[(df[date_col] > val_start) & (df[date_col] <= test_start)]
    test = df[df[date_col] > test_start]
    split = TimeSplit(train.copy(), val.copy(), test.copy())
    assert_no_leakage(split.train, split.test, date_col=date_col)
    assert_no_leakage(split.train, split.val, date_col=date_col)
    return split


def rolling_origin(
    df: pd.DataFrame,
    *,
    date_col: str = "date",
    n_folds: int = 4,
    horizon_days: int = 14,
    min_train_days: int = 90,
) -> Iterator[tuple[pd.DataFrame, pd.DataFrame]]:
    """Expanding-window backtest: train grows, test is the next horizon.

    Yields (train, test) per fold, latest folds first omitted so the final
    horizon always has data. Each fold is leakage-checked before being yielded.
    """
    df = df.sort_values(date_col).reset_index(drop=True)
    last = df[date_col].max()
    for k in range(n_folds, 0, -1):
        test_end = last - pd.Timedelta(days=horizon_days * (k - 1))
        test_start = test_end - pd.Timedelta(days=horizon_days)
        train = df[df[date_col] <= test_start]
        test = df[(df[date_col] > test_start) & (df[date_col] <= test_end)]
        if len(train) < min_train_days or test.empty:
            continue
        assert_no_leakage(train, test, date_col=date_col)
        yield train.copy(), test.copy()


def leave_one_venue_out(venues: list[str]) -> Iterator[tuple[list[str], str]]:
    """LOVO scaffold for the transfer claim: yield (donor_venues, holdout)."""
    for held in venues:
        donors = [v for v in venues if v != held]
        yield donors, held


def assert_no_leakage(
    train: pd.DataFrame, test: pd.DataFrame, *, date_col: str = "date"
) -> None:
    if train.empty or test.empty:
        return
    train_max = train[date_col].max()
    test_min = test[date_col].min()
    if train_max >= test_min:
        raise LeakageError(
            f"train ends {train_max} but test starts {test_min} — future leak."
        )


# --- Point metrics -----------------------------------------------------------

def mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred)))


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def smape(
    y_true: np.ndarray, y_pred: np.ndarray, *, exclude_zeros: bool = True
) -> float:
    """Symmetric MAPE in %. Structural zeros (Mon/Tue) break percentage error,
    so by default they are excluded (methodology §3.2 caveat)."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    if exclude_zeros:
        mask = y_true != 0
        y_true, y_pred = y_true[mask], y_pred[mask]
    if y_true.size == 0:
        return float("nan")
    denom = np.abs(y_true) + np.abs(y_pred)
    denom[denom == 0] = 1e-9
    return float(200.0 * np.mean(np.abs(y_true - y_pred) / denom))


def seasonal_naive_scale(y_train: np.ndarray, season: int = SEASONAL_PERIOD) -> float:
    """MASE denominator: mean in-sample seasonal-naive absolute error."""
    y_train = np.asarray(y_train, dtype=float)
    if y_train.size <= season:
        return float("nan")
    diffs = np.abs(y_train[season:] - y_train[:-season])
    scale = float(np.mean(diffs))
    return scale if scale > 0 else float("nan")


def mase(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_train: np.ndarray,
    season: int = SEASONAL_PERIOD,
) -> float:
    scale = seasonal_naive_scale(y_train, season)
    if not np.isfinite(scale):
        return float("nan")
    return mae(np.asarray(y_true, float), np.asarray(y_pred, float)) / scale


# --- Interval metrics --------------------------------------------------------

def coverage(y_true: np.ndarray, lo: np.ndarray, hi: np.ndarray) -> float:
    y_true = np.asarray(y_true, float)
    return float(np.mean((y_true >= np.asarray(lo, float)) & (y_true <= np.asarray(hi, float))))


def mean_width(lo: np.ndarray, hi: np.ndarray) -> float:
    return float(np.mean(np.asarray(hi, float) - np.asarray(lo, float)))


def winkler(y_true: np.ndarray, lo: np.ndarray, hi: np.ndarray, level: float) -> float:
    """Mean Winkler interval score for a central (level) interval. Lower is
    better — penalises width plus 2/alpha * miss distance."""
    alpha = 1.0 - level
    y_true = np.asarray(y_true, float)
    lo = np.asarray(lo, float)
    hi = np.asarray(hi, float)
    width = hi - lo
    below = y_true < lo
    above = y_true > hi
    score = width.copy()
    score[below] += (2.0 / alpha) * (lo[below] - y_true[below])
    score[above] += (2.0 / alpha) * (y_true[above] - hi[above])
    return float(np.mean(score))


def _pinball(y_true: np.ndarray, q_pred: np.ndarray, q: float) -> np.ndarray:
    diff = y_true - q_pred
    return np.maximum(q * diff, (q - 1.0) * diff)


def mean_pinball(y_true: np.ndarray, lo: np.ndarray, hi: np.ndarray, level: float) -> float:
    """Average pinball loss across the two interval quantiles."""
    alpha = 1.0 - level
    q_lo, q_hi = alpha / 2.0, 1.0 - alpha / 2.0
    y_true = np.asarray(y_true, float)
    loss = _pinball(y_true, np.asarray(lo, float), q_lo) + _pinball(
        y_true, np.asarray(hi, float), q_hi
    )
    return float(np.mean(loss / 2.0))


# --- Aggregators -------------------------------------------------------------

def point_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_train: np.ndarray,
    *,
    season: int = SEASONAL_PERIOD,
) -> dict[str, float]:
    return {
        "MASE": mase(y_true, y_pred, y_train, season),
        "MAE": mae(y_true, y_pred),
        "RMSE": rmse(y_true, y_pred),
        "sMAPE": smape(y_true, y_pred),
    }


def interval_metrics(
    y_true: np.ndarray, lo: np.ndarray, hi: np.ndarray, level: float
) -> dict[str, float]:
    return {
        "level": level,
        "coverage": coverage(y_true, lo, hi),
        "mean_width": mean_width(lo, hi),
        "winkler": winkler(y_true, lo, hi, level),
        "mean_pinball": mean_pinball(y_true, lo, hi, level),
    }


# --- Demo / self-check -------------------------------------------------------

def _dummy_seasonal_naive(train: pd.DataFrame, test: pd.DataFrame) -> np.ndarray:
    """lag-7 forecast for each test date from the most recent same-DOW value."""
    history = pd.concat([train, test]).set_index("date")["value"]
    preds = []
    for d in test["date"]:
        prior = history.loc[history.index < d]
        same_dow = prior[prior.index.dayofweek == d.dayofweek]
        preds.append(same_dow.iloc[-1] if len(same_dow) else prior.iloc[-1])
    return np.asarray(preds, dtype=float)


def main() -> int:
    from store.warehouse import read_series

    print("A2 · evaluation harness (dummy = seasonal-naive)")
    series = read_series("beer_hall", "L1", fill_calendar=True)
    split = time_split(series)
    print(f"  split             : {split.describe()}")

    y_pred = _dummy_seasonal_naive(split.train, split.test)
    y_true = split.test["value"].to_numpy()
    pm = point_metrics(y_true, y_pred, split.train["value"].to_numpy())
    print("  point metrics     : "
          + ", ".join(f"{k}={v:.3f}" for k, v in pm.items()))

    # A synthetic band around the dummy to exercise interval metrics.
    resid = y_true - y_pred
    for level in (0.80, 0.90):
        half = np.quantile(np.abs(resid), level)
        im = interval_metrics(y_true, y_pred - half, y_pred + half, level)
        print(f"  interval @{int(level * 100)}%   : "
              + ", ".join(
                  f"{k}={v:.3f}" for k, v in im.items() if k != "level"))

    folds = list(rolling_origin(series, n_folds=4, horizon_days=14))
    print(f"  rolling-origin    : {len(folds)} leakage-checked folds")

    lovo = list(leave_one_venue_out(["beer_hall", "two_river_taps", "ellel"]))
    print(f"  LOVO scaffold     : {[(d, h) for d, h in lovo]}")

    # Leakage guard must actually fire.
    leak_ok = False
    try:
        bad_train = series[series["date"] >= series["date"].max() - pd.Timedelta(days=5)]
        assert_no_leakage(bad_train, split.test)
    except LeakageError:
        leak_ok = True

    all_metrics_present = all(np.isfinite(v) for v in pm.values())
    ok = all_metrics_present and len(folds) >= 2 and leak_ok
    print(f"  leakage guard fires: {leak_ok}")
    print(f"A2 RESULT: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
