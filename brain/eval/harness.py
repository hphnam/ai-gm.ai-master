"""A2 · Evaluation harness, built *before* any model (methodology §3).

Everything a rung is scored on lives here so every rung is judged identically:
time-aware splits, an expanding-window rolling-origin backtest, a leave-one-
venue-out scaffold for the transfer claim, and the metric battery (MASE,
MAE/RMSE, sMAPE, interval coverage, Winkler, mean pinball, mean width). Leakage
guards are explicit, `assert_no_leakage` raises if any train fold contains a
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
            f"train ends {train_max} but test starts {test_min} - future leak."
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


# --- The scale ruler ---------------------------------------------------------
#
# Every scaled accuracy figure the project reports comes through here, on one of
# four named bases. The basis is required and never defaulted: three private
# copies of this denominator previously disagreed by up to a factor of two, so
# the same forecast scored anywhere between 0.385 and 0.771 depending on which
# file computed it (report 42, FLAG-MASE-RULER).

SCALE_BASES = (
    "calendar_lag7",          # calendar-filled series, lag 7
    "trading_lag7",           # trading-days-only series, lag 7
    "trading_same_weekday",   # trading-days-only, lag = rounded trading days/week
    "calendar_lag7_active",   # calendar-filled lag 7, structural-zero pairs dropped
)


# The basis the dissertation quotes. `calendar_lag7` is not the methodologically
# best of the four (it is deflated by structural zeros, see report 42), but it is
# the only one on which BOTH the ladder backtest and every confrontation already
# exist, and S1 is forbidden from re-running the ladder. Comparability across the
# pre-registration chain beats a better ruler applied to only half of it.
# `calendar_lag7_active` is the intended successor, to be adopted in S4 when the
# ladder can be re-scored alongside it.
REPORTED_BASIS = "calendar_lag7"


class UnknownBasisError(ValueError):
    """Raised when a caller names a scale basis that does not exist."""


def same_weekday_lag(n_trading_days: int, n_calendar_days: int) -> int:
    """The lag that lands on the same weekday once closed days are compressed out.

    A trading-days-only index has no fixed period: lag 7 reaches back 1.34
    calendar weeks at Beer Hall and 5.8 at Ellel, both landing on the wrong
    weekday. The rounded mean trading days per week is the closest available
    integer. Derived from the data, never hard-coded, because it is 5 at Beer
    Hall and 1 at Ellel.
    """
    if n_calendar_days <= 0:
        raise ValueError("n_calendar_days must be positive to derive a lag")
    return max(int(round(n_trading_days / (n_calendar_days / 7.0))), 1)


def _scale_pairs(
    y_train: np.ndarray,
    *,
    basis: str,
    n_calendar_days: int | None = None,
) -> tuple[np.ndarray, np.ndarray, int]:
    """The (later, earlier) endpoint pairs a basis differences over, plus its lag.

    The caller supplies the series the basis names: calendar-filled for the
    `calendar_*` bases, trading-days-only for the `trading_*` ones.
    """
    if basis not in SCALE_BASES:
        raise UnknownBasisError(
            f"unknown scale basis {basis!r}; expected one of {SCALE_BASES}"
        )
    y = np.asarray(y_train, dtype=float)
    if basis == "trading_same_weekday":
        if n_calendar_days is None:
            raise ValueError(
                "basis 'trading_same_weekday' needs n_calendar_days to derive its lag"
            )
        lag = same_weekday_lag(y.size, n_calendar_days)
    else:
        lag = SEASONAL_PERIOD
    if y.size <= lag:
        return np.empty(0), np.empty(0), lag
    later, earlier = y[lag:], y[:-lag]
    if basis == "calendar_lag7_active":
        # A closed day is stored as a structural zero, so a difference with a
        # closed endpoint measures the closure, not the week-on-week move.
        keep = (later != 0.0) & (earlier != 0.0)
        later, earlier = later[keep], earlier[keep]
    return later, earlier, lag


def structural_zero_diffs(y_train: np.ndarray, season: int = SEASONAL_PERIOD) -> tuple[int, int]:
    """(exactly-zero lag differences, total lag differences) on a filled series.

    The deflation diagnostic: on a calendar-filled series most zero differences are
    closed-day against closed-day. NOTE this counts a DIFFERENT population from the
    one `calendar_lag7_active` keeps, and the two must not be subtracted from each
    other. A difference is zero when both endpoints are zero OR when two trading
    days happen to be equal; the active basis drops a pair when EITHER endpoint is
    zero. At Ellel that is 284 zero differences of 385 but only 28 pairs retained,
    not 101. Use `active_pair_count` for the sample size the active basis actually
    used.
    """
    y = np.asarray(y_train, dtype=float)
    if y.size <= season:
        return 0, 0
    diffs = y[season:] - y[:-season]
    return int(np.sum(diffs == 0.0)), int(diffs.size)


def active_pair_count(y_train: np.ndarray) -> int:
    """How many lag pairs `calendar_lag7_active` keeps: both endpoints trading."""
    later, _, _ = _scale_pairs(y_train, basis="calendar_lag7_active")
    return int(later.size)


def seasonal_naive_scale(
    y_train: np.ndarray,
    *,
    basis: str,
    n_calendar_days: int | None = None,
) -> float:
    """MASE denominator: mean in-sample seasonal-naive absolute error on `basis`."""
    later, earlier, _ = _scale_pairs(
        y_train, basis=basis, n_calendar_days=n_calendar_days
    )
    if later.size == 0:
        return float("nan")
    scale = float(np.mean(np.abs(later - earlier)))
    return scale if scale > 0 else float("nan")


def seasonal_naive_squared_scale(
    y_train: np.ndarray,
    *,
    basis: str,
    n_calendar_days: int | None = None,
) -> float:
    """RMSSE denominator: mean in-sample seasonal-naive SQUARED error on `basis`.

    The same pairs as `seasonal_naive_scale`, squared rather than absolute, so
    MASE and RMSSE are read off one ruler. This departs from M5's published
    RMSSE, which differences at lag 1; here the lag is the basis's own, which
    keeps the two metrics comparable at the cost of not being the M5 number
    (report 42 section 3).
    """
    later, earlier, _ = _scale_pairs(
        y_train, basis=basis, n_calendar_days=n_calendar_days
    )
    if later.size == 0:
        return float("nan")
    scale = float(np.mean((later - earlier) ** 2))
    return scale if scale > 0 else float("nan")


def mase(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_train: np.ndarray,
    *,
    basis: str,
    n_calendar_days: int | None = None,
) -> float:
    scale = seasonal_naive_scale(
        y_train, basis=basis, n_calendar_days=n_calendar_days
    )
    if not np.isfinite(scale):
        return float("nan")
    return mae(np.asarray(y_true, float), np.asarray(y_pred, float)) / scale


def rmsse(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_train: np.ndarray,
    *,
    basis: str,
    n_calendar_days: int | None = None,
) -> float:
    """Root mean squared scaled error, on the SAME ruler as the MASE beside it.

    Squared scaled errors optimise for the mean rather than the median, which is
    why M5 adopted RMSSE for a 73 percent intermittent corpus. It does not reward
    the flatline forecast that MASE rewards.

    The denominator uses the basis's own lag, not M5's lag 1, because the claim
    being made is that MASE and RMSSE differ in LOSS FUNCTION, and that only holds
    if the ruler is shared. `rmsse_m5` is the literal M5 statistic; report both,
    labelled (report 42 section 3).
    """
    denom = seasonal_naive_squared_scale(
        y_train, basis=basis, n_calendar_days=n_calendar_days
    )
    if not np.isfinite(denom):
        return float("nan")
    err = np.asarray(y_true, float) - np.asarray(y_pred, float)
    return float(np.sqrt(float(np.mean(err ** 2)) / denom))


def naive_squared_scale(y_train: np.ndarray, *, lag: int = 1) -> float:
    """M5's RMSSE denominator: mean squared lag-1 difference, no masking."""
    y = np.asarray(y_train, dtype=float)
    if y.size <= lag:
        return float("nan")
    scale = float(np.mean((y[lag:] - y[:-lag]) ** 2))
    return scale if scale > 0 else float("nan")


def rmsse_m5(
    y_true: np.ndarray, y_pred: np.ndarray, y_train: np.ndarray
) -> float:
    """RMSSE exactly as the M5 competition defined it: lag-1 naive denominator.

    Reported alongside `rmsse` so the answer to "is this M5's RMSSE" is "both, and
    here is each". On a series with closed days the lag-1 denominator is inflated
    by every open-to-closed transition, which is why it is the secondary figure
    here and not the primary one.
    """
    denom = naive_squared_scale(y_train)
    if not np.isfinite(denom):
        return float("nan")
    err = np.asarray(y_true, float) - np.asarray(y_pred, float)
    return float(np.sqrt(float(np.mean(err ** 2)) / denom))


# --- The venue ruler ---------------------------------------------------------

@dataclass
class VenueRuler:
    """One venue's L1 scale on all four bases, plus the counts that derive them.

    Built once per venue and handed to every scorer, so a confrontation cannot
    quietly pick a different denominator from the backtest that preceded it.
    """

    venue: str
    n_trading_days: int
    n_calendar_days: int
    same_weekday_lag: int
    zero_lag7_diffs: int
    total_lag7_diffs: int
    active_lag7_pairs: int
    scales: dict[str, float]
    trading: np.ndarray
    calendar: np.ndarray

    @property
    def trading_days_per_week(self) -> float:
        return self.n_trading_days / (self.n_calendar_days / 7.0)

    def series_for(self, basis: str) -> np.ndarray:
        if basis not in SCALE_BASES:
            raise UnknownBasisError(
                f"unknown scale basis {basis!r}; expected one of {SCALE_BASES}"
            )
        return self.trading if basis.startswith("trading_") else self.calendar

    def mase(self, y_true: np.ndarray, y_pred: np.ndarray, basis: str) -> float:
        return mase(y_true, y_pred, self.series_for(basis), basis=basis,
                    n_calendar_days=self.n_calendar_days)

    def rmsse(self, y_true: np.ndarray, y_pred: np.ndarray, basis: str) -> float:
        return rmsse(y_true, y_pred, self.series_for(basis), basis=basis,
                     n_calendar_days=self.n_calendar_days)

    def rmsse_m5(self, y_true: np.ndarray, y_pred: np.ndarray, basis: str) -> float:
        return rmsse_m5(y_true, y_pred, self.series_for(basis))

    def scale_block(self) -> dict:
        """The scale half of a metric row: every basis, and the counts behind it."""
        return {
            "scales": {b: round(self.scales[b], 1) for b in SCALE_BASES},
            "same_weekday_lag": self.same_weekday_lag,
            "n_trading_days": self.n_trading_days,
            "n_calendar_days": self.n_calendar_days,
            "trading_days_per_week": round(self.trading_days_per_week, 2),
            "zero_lag7_diffs": self.zero_lag7_diffs,
            "total_lag7_diffs": self.total_lag7_diffs,
            # Not total minus zero: see `structural_zero_diffs`. This is the sample
            # size `calendar_lag7_active` was actually estimated from.
            "active_lag7_pairs": self.active_lag7_pairs,
        }


def venue_ruler(venue: str, con=None, as_of: str | None = None) -> VenueRuler:
    """Build a venue's ruler from the served store.

    `as_of` truncates the history to a stated date. It defaults to None, meaning
    the whole store, which is what S1's gates are defined on. Be aware that this
    makes an unpinned scale a function of the store ceiling: the June
    confrontation's published denominator was computed against a 2026-05-31
    ceiling and is not reproducible from today's store without pinning here
    (report 42 section 5). Pinning the confrontations is S3's environment work,
    not S1's.

    The store import is function-local, as in `main()`: this module is the metric
    definition and is imported by code that has no warehouse, so the dependency
    is paid only by callers that actually want a venue's scale.
    """
    from store.warehouse import connect, read_series

    own = con is None
    con = con or connect(read_only=True)
    try:
        sql = "SELECT revenue_exvat AS v FROM l1_daily WHERE venue = ?"
        params: list = [venue]
        if as_of is not None:
            sql += " AND date <= ?"
            params.append(as_of)
        trading = con.execute(sql + " ORDER BY date", params).df()["v"].to_numpy(float)
        cal_df = read_series(venue, "L1", fill_calendar=True, con=con)
        if as_of is not None:
            cal_df = cal_df[cal_df["date"] <= pd.Timestamp(as_of)]
            # `fill_calendar` spans the venue's own first to last row, so filtering
            # a venue that stopped trading before `as_of` leaves a tail of
            # structural zeros the original run never saw. Trim back to the last
            # trading day so the pin reproduces the ruler as it stood that day.
            nonzero = cal_df.index[cal_df["value"] != 0.0]
            if len(nonzero):
                cal_df = cal_df.loc[:nonzero[-1]]
        calendar = cal_df["value"].to_numpy(float)
    finally:
        if own:
            con.close()

    n_calendar = int(calendar.size)
    lag_sw = same_weekday_lag(int(trading.size), n_calendar)
    zero_diffs, total_diffs = structural_zero_diffs(calendar)
    scales = {
        "calendar_lag7": seasonal_naive_scale(calendar, basis="calendar_lag7"),
        "trading_lag7": seasonal_naive_scale(trading, basis="trading_lag7"),
        "trading_same_weekday": seasonal_naive_scale(
            trading, basis="trading_same_weekday", n_calendar_days=n_calendar),
        "calendar_lag7_active": seasonal_naive_scale(
            calendar, basis="calendar_lag7_active"),
    }
    return VenueRuler(
        venue=venue,
        n_trading_days=int(trading.size),
        n_calendar_days=n_calendar,
        same_weekday_lag=lag_sw,
        zero_lag7_diffs=zero_diffs,
        total_lag7_diffs=total_diffs,
        active_lag7_pairs=active_pair_count(calendar),
        scales=scales,
        trading=trading,
        calendar=calendar,
    )


def venue_metric_row(
    ruler: VenueRuler,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    lo: np.ndarray | None = None,
    hi: np.ndarray | None = None,
    *,
    reported_basis: str,
    level: float = 0.90,
) -> dict:
    """The full metric set S1 requires: MASE on all four bases, RMSSE, MAE, RMSE,
    the interval trio, n_days, and the scale that produced the reported figure."""
    row: dict = {
        "mase": {b: round(ruler.mase(y_true, y_pred, b), 3) for b in SCALE_BASES},
        "rmsse": round(ruler.rmsse(y_true, y_pred, reported_basis), 3),
        "rmsse_m5": round(ruler.rmsse_m5(y_true, y_pred, reported_basis), 3),
        "mae": round(mae(y_true, y_pred), 1),
        "rmse": round(rmse(y_true, y_pred), 1),
        "n_days": int(np.asarray(y_true).size),
        "reported_basis": reported_basis,
        "scale": round(ruler.scales[reported_basis], 1),
        **ruler.scale_block(),
    }
    if lo is not None and hi is not None:
        row.update({
            "winkler": round(winkler(y_true, lo, hi, level), 1),
            "mean_width": round(mean_width(lo, hi), 1),
            "empirical_coverage": round(coverage(y_true, lo, hi), 3),
            "level": level,
        })
    return row


# --- Interval metrics --------------------------------------------------------

def coverage(y_true: np.ndarray, lo: np.ndarray, hi: np.ndarray) -> float:
    y_true = np.asarray(y_true, float)
    return float(np.mean((y_true >= np.asarray(lo, float)) & (y_true <= np.asarray(hi, float))))


def mean_width(lo: np.ndarray, hi: np.ndarray) -> float:
    return float(np.mean(np.asarray(hi, float) - np.asarray(lo, float)))


def winkler(y_true: np.ndarray, lo: np.ndarray, hi: np.ndarray, level: float) -> float:
    """Mean Winkler interval score for a central (level) interval. Lower is
    better, penalises width plus 2/alpha * miss distance."""
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
    basis: str,
    n_calendar_days: int | None = None,
) -> dict[str, float]:
    return {
        "MASE": mase(y_true, y_pred, y_train, basis=basis,
                     n_calendar_days=n_calendar_days),
        "RMSSE": rmsse(y_true, y_pred, y_train, basis=basis,
                       n_calendar_days=n_calendar_days),
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
    pm = point_metrics(y_true, y_pred, split.train["value"].to_numpy(),
                       basis="calendar_lag7")
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
