"""Synthetic-injection oracle for the agent-evaluation framework (spec §2).

Plants KNOWN, controlled events into held-out copies of the standardised residual
stream, so the briefing can be scored against truth with no human labelling and
full reproducibility. Four event kinds are supported:

  * regime_shift     — a step change in z from a known onset (sustained shift)
  * spike            — a single-day |z| excursion (point anomaly, no persistence)
  * stock_drawdown   — a keg line crossing the reorder threshold (days_of_cover ≤ 0)
  * exo_coincident   — a downward shift anchored on a real weather anomaly, so the
                       attribution SHOULD name weather (a planted cause, not a null)

Leakage (G-eval-e): the injection window is a held-out fold from
`harness.rolling_origin`, so injected days are never in any training portion the
detectors standardise against; `assert_no_leakage` guards every fold. This module
reads the store read-only and INVENTS NO DETECTION MATHS — it perturbs inputs; the
real detectors and the real briefing synthesis (in `agent_eval`) do the work.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import numpy as np
import pandas as pd

import config
from eval import harness
from signals.briefing import Signal
from signals.residual import build_residual_stream
from store.warehouse import connect

# Injection window: the last held-out fold. 28 days gives a regime shift room to
# persist (CUSUM + k-of-n) while staying strictly after the training portion.
_HORIZON_DAYS = 28
_MIN_TRAIN_DAYS = 90
_ONSET_OFFSET_DAYS = 3   # onset a few days into the window, so a run can accumulate


@dataclass
class TruthRecord:
    """The known ground truth for one injected event."""
    venue: str
    kind: str                 # regime_shift | spike | stock_drawdown | exo_coincident
    onset: date
    direction: str            # up | down | na
    magnitude: float          # z-units (shift/spike) | 0 (stock drawdown)
    expected_cause: str | None  # "weather" for exo_coincident; None → honest-null case
    relevance: float = 1.0    # intended IMPORTANCE for ranking (a sustained shift > a
    #                           one-day spike), not raw z — the briefing's design intent


@dataclass
class Injection:
    """An injected scenario: the perturbed residual stream, any synthetic stock
    signals, and the truth records the briefing is scored against."""
    venue: str
    as_of: date
    kind: str
    stream: pd.DataFrame               # date, actual, expected, scale, z  (z perturbed)
    truth: list[TruthRecord]
    stock: list[Signal] = field(default_factory=list)
    train_end: date | None = None      # last training date (for the leakage assertion)


# --- Held-out window ---------------------------------------------------------

def base_stream(venue: str, con=None) -> pd.DataFrame:
    return build_residual_stream(venue, con=con)


def holdout(stream: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """The single most-recent leakage-checked (train, test) fold from the harness.
    Falls back to a plain tail split if the series is too short for a full fold."""
    folds = list(harness.rolling_origin(
        stream, n_folds=1, horizon_days=_HORIZON_DAYS, min_train_days=_MIN_TRAIN_DAYS))
    if folds:
        return folds[0]
    cut = stream["date"].max() - pd.Timedelta(days=_HORIZON_DAYS)
    train, test = stream[stream["date"] <= cut], stream[stream["date"] > cut]
    harness.assert_no_leakage(train, test)
    return train.copy(), test.copy()


def _onset(test: pd.DataFrame, offset: int = _ONSET_OFFSET_DAYS) -> pd.Timestamp:
    return pd.Timestamp(test["date"].iloc[min(offset, len(test) - 1)])


def _reassemble(stream: pd.DataFrame, test: pd.DataFrame) -> pd.DataFrame:
    """Splice the perturbed test rows back onto the untouched training rows."""
    train = stream[stream["date"] < test["date"].min()]
    out = pd.concat([train, test], ignore_index=True).sort_values("date")
    return out.reset_index(drop=True)


def _apply_z(test: pd.DataFrame, mask, dz: float) -> pd.DataFrame:
    """Add dz to z on masked rows and keep actual = expected + z*scale coherent."""
    test = test.copy()
    test.loc[mask, "z"] = test.loc[mask, "z"] + dz
    test["actual"] = test["expected"] + test["z"] * test["scale"]
    return test


# --- The four event kinds ----------------------------------------------------

def inject_regime_shift(venue: str, con=None, *, direction: str = "down",
                        magnitude_z: float | None = None) -> Injection:
    """A sustained step in z from a known onset to the end of the held-out window."""
    stream = base_stream(venue, con=con)
    train, test = holdout(stream)
    onset = _onset(test)
    dz = (magnitude_z or config.EVAL_INJECT_SHIFT_Z) * (-1 if direction == "down" else 1)
    test = _apply_z(test, test["date"] >= onset, dz)
    truth = TruthRecord(venue, "regime_shift", onset.date(), direction, abs(dz), None,
                        relevance=2.0)
    return Injection(venue, test["date"].max().date(), "regime_shift",
                     _reassemble(stream, test), [truth], train_end=train["date"].max().date())


def inject_spike(venue: str, con=None, *, direction: str = "up",
                 z: float | None = None) -> Injection:
    """A single-day |z| excursion — a point anomaly with no persistence."""
    stream = base_stream(venue, con=con)
    train, test = holdout(stream)
    onset = _onset(test, offset=len(test) // 2)   # mid-window, isolated
    dz = (z or config.EVAL_INJECT_SPIKE_Z) * (-1 if direction == "down" else 1)
    test = _apply_z(test, test["date"] == onset, dz)
    truth = TruthRecord(venue, "spike", onset.date(), direction, abs(dz), None,
                        relevance=1.0)
    return Injection(venue, test["date"].max().date(), "spike",
                     _reassemble(stream, test), [truth], train_end=train["date"].max().date())


def inject_stock_drawdown(venue: str, con=None) -> Injection:
    """A keg line crossing the reorder threshold. Stock is a snapshot, not a series,
    so this is a synthetic `stock` Signal dated at the window end (onset = as_of)."""
    stream = base_stream(venue, con=con)
    _train, test = holdout(stream)
    onset = pd.Timestamp(test["date"].max())
    sig = Signal("stock", venue, onset.date(), "down", "high", 0.0,
                 {"product": "Synthetic Keg", "days_of_cover": 0.0,
                  "suggested_order_kegs": 2.0, "as_of": onset.date().isoformat()})
    truth = TruthRecord(venue, "stock_drawdown", onset.date(), "down", 0.0, None,
                        relevance=2.0)
    return Injection(venue, onset.date(), "stock_drawdown", stream, [truth], stock=[sig],
                     train_end=_train["date"].max().date())


def inject_exo_coincident(venue: str, con=None, *, direction: str = "down") -> Injection:
    """A downward shift anchored on a REAL weather anomaly in the held-out window, so
    the correlational attribution should name weather (a planted cause). Falls back to
    a plain regime shift (expected_cause=None) if no weather anomaly is available."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        stream = base_stream(venue, con=con)
        train, test = holdout(stream)
        onset = _weather_anomaly_date(venue, test, con)
        expected_cause = "weather"
        if onset is None:                       # honest fallback: no anomaly to anchor on
            onset, expected_cause = _onset(test), None
        dz = config.EVAL_INJECT_SHIFT_Z * (-1 if direction == "down" else 1)
        test = _apply_z(test, test["date"] >= onset, dz)
        truth = TruthRecord(venue, "exo_coincident", pd.Timestamp(onset).date(),
                            direction, abs(dz), expected_cause, relevance=2.0)
        return Injection(venue, test["date"].max().date(), "exo_coincident",
                         _reassemble(stream, test), [truth],
                         train_end=train["date"].max().date())
    finally:
        if own:
            con.close()


def _weather_anomaly_date(venue: str, test: pd.DataFrame, con) -> pd.Timestamp | None:
    """The held-out-window date whose temperature most exceeds the series mean by
    more than one SD — the same anomaly the attribution scans for."""
    cell = config.WEATHER_CELLS.get(venue)
    if not cell or not _has_table(con, "exog_weather_leadmatched"):
        return None
    wx = con.execute(
        "SELECT date, exo_temp_c FROM exog_weather_leadmatched WHERE cell=?", [cell]).df()
    if len(wx) <= 30:
        return None
    wx["date"] = pd.to_datetime(wx["date"])
    mean, sd = wx["exo_temp_c"].mean(), (wx["exo_temp_c"].std() or 1.0)
    win = wx[(wx["date"] >= test["date"].min()) & (wx["date"] <= test["date"].max())].copy()
    win["dev"] = (win["exo_temp_c"] - mean).abs()
    win = win[win["dev"] > sd]
    if win.empty:
        return None
    return pd.Timestamp(win.sort_values("dev").iloc[-1]["date"]).normalize()


def multi_event(venue: str, con=None) -> Injection:
    """A single window carrying a HIGH-magnitude regime shift and a lower spike, for
    the ranking axis: the briefing should rank the shift above the spike."""
    big = inject_regime_shift(venue, con=con, direction="down",
                              magnitude_z=config.EVAL_INJECT_SHIFT_Z * 1.6)
    stream = big.stream.copy()
    test = stream[stream["date"] > pd.Timestamp(big.train_end)]
    spike_day = pd.Timestamp(test["date"].iloc[len(test) - 2])   # late, isolated up-spike
    stream.loc[stream["date"] == spike_day, "z"] = config.EVAL_INJECT_SPIKE_Z
    stream["actual"] = stream["expected"] + stream["z"] * stream["scale"]
    truth = big.truth + [TruthRecord(venue, "spike", spike_day.date(), "up",
                                     config.EVAL_INJECT_SPIKE_Z, None)]
    return Injection(venue, big.as_of, "multi_event", stream, truth, train_end=big.train_end)


def quiet_onset(venue: str, con=None, direction: str = "down") -> date | None:
    """A held-out-window date the attribution finds NO coincident signal for — the
    honest-null control for the attribution axis. None if the estate has no such date
    (a real finding on a calendar-dense estate, not an error)."""
    from signals.residual import attribute
    own = con is None
    con = con or connect(read_only=True)
    try:
        stream = base_stream(venue, con=con)
        _train, test = holdout(stream)
        for d in test["date"]:
            reason = attribute(venue, pd.Timestamp(d), direction, "L1", con=con)
            if reason and "no coincident" in reason[0].lower():
                return pd.Timestamp(d).date()
        return None
    finally:
        if own:
            con.close()


def _has_table(con, name: str) -> bool:
    return con.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_name=?", [name]).fetchone() is not None
