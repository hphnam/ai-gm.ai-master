"""Point-deviation tests (PRJ93 point-deviation spec, gates G0–G9).

The per-day primitive classifies one trading day against its conformal band on
the SHARED residual stream. Deterministic gates monkeypatch the stream; the
attribution / robustness / scan gates run against the built store.
"""

from __future__ import annotations

import ast
import inspect

import pandas as pd
import pytest

from config import VENUE_LABELS, VENUES_FOR_DEVIATION
from signals import change_point as cp
from signals import deviation as dev
from signals import residual
from store import warehouse
from store.active_span import active_trading_end


@pytest.fixture(scope="module")
def store():
    warehouse.build()


def _stream(zs, start="2026-01-01", expected=500.0, scale=100.0):
    """A synthetic residual stream: each day's actual is expected + z·scale, so the
    classification of the selected row is fully determined by its z."""
    dates = pd.date_range(start, periods=len(zs), freq="D")
    return pd.DataFrame({
        "date": dates, "actual": [expected + z * scale for z in zs],
        "expected": expected, "scale": scale, "z": list(zs),
    })


# --- G0 foundation: change_point depends on residual -------------------------

def test_change_point_reuses_the_residual_foundation():
    assert cp.build_residual_stream is residual.build_residual_stream
    assert cp.attribute is residual.attribute


# --- G1 dependency direction: deviation ← residual, never ↔ change_point ------

def _imported_modules(module) -> set[str]:
    tree = ast.parse(inspect.getsource(module))
    mods: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            mods.add(node.module)
        elif isinstance(node, ast.Import):
            mods.update(a.name for a in node.names)
    return mods


def test_deviation_imports_foundation_not_change_point():
    assert dev.build_residual_stream is residual.build_residual_stream
    assert "signals.change_point" not in _imported_modules(dev)


# --- G2 latest day at its DOW-median is normal -------------------------------

def test_latest_day_near_median_is_normal(monkeypatch):
    monkeypatch.setattr(dev, "build_residual_stream", lambda v, con=None: _stream([0.1, -0.2, 0.0]))
    r = dev.check_point("beer_hall")
    assert r["status"] == "normal" and abs(r["z"]) <= 1.0


# --- G3 injected deviation: direction + severity -----------------------------

def test_large_positive_latest_day_is_high_up_deviation(monkeypatch):
    monkeypatch.setattr(dev, "attribute", lambda *a, **k: [])
    monkeypatch.setattr(dev, "build_residual_stream", lambda v, con=None: _stream([0.0, 0.0, 3.0]))
    r = dev.check_point("beer_hall")
    assert (r["status"], r["direction"], r["severity"]) == ("deviation", "up", "high")


def test_large_negative_latest_day_is_down(monkeypatch):
    monkeypatch.setattr(dev, "attribute", lambda *a, **k: [])
    monkeypatch.setattr(dev, "build_residual_stream", lambda v, con=None: _stream([0.0, 0.0, -3.0]))
    assert dev.check_point("beer_hall")["direction"] == "down"


# --- G4 band edge: cutoff is exactly DEV_BAND_K ------------------------------

def test_just_inside_the_band_is_normal(monkeypatch):
    monkeypatch.setattr(dev, "build_residual_stream", lambda v, con=None: _stream([0.0, 0.99]))
    assert dev.check_point("beer_hall")["status"] == "normal"


def test_just_outside_the_band_is_deviation(monkeypatch):
    monkeypatch.setattr(dev, "attribute", lambda *a, **k: [])
    monkeypatch.setattr(dev, "build_residual_stream", lambda v, con=None: _stream([0.0, 1.01]))
    assert dev.check_point("beer_hall")["status"] == "deviation"


# --- G5 leakage-free as_of: row at d is unchanged by trailing days ------------

def test_as_of_row_is_independent_of_later_days(monkeypatch):
    zs = [0.0, 0.5, -0.3, 2.0, 0.1, -0.4]
    d = _stream(zs).iloc[3]["date"].date().isoformat()
    monkeypatch.setattr(dev, "attribute", lambda *a, **k: [])
    monkeypatch.setattr(dev, "build_residual_stream", lambda v, con=None: _stream(zs[:4]))
    z_short = dev.check_point("beer_hall", as_of=d)["z"]
    monkeypatch.setattr(dev, "build_residual_stream", lambda v, con=None: _stream(zs))
    z_long = dev.check_point("beer_hall", as_of=d)["z"]
    assert z_short == z_long == 2.0


# --- G6 a flagged day in a known break window gets a coincident reason --------

def test_deviation_in_a_structural_break_window_is_attributed(store, monkeypatch):
    aend = active_trading_end("two_river_taps").date()
    s = _stream([0.0, 0.0, 0.0, -3.0], start=(aend - pd.Timedelta(days=3)).isoformat())
    monkeypatch.setattr(dev, "build_residual_stream", lambda v, con=None: s)
    r = dev.check_point("two_river_taps", as_of=aend.isoformat())
    assert r["status"] == "deviation"
    assert any("coincides with" in reason for reason in r["reason"])


# --- G7 robustness: missing / non-trading day → None, no raise ---------------

def test_non_trading_as_of_returns_none(store):
    assert dev.check_point("beer_hall", as_of="1990-01-01") is None


def test_empty_stream_returns_none(monkeypatch):
    monkeypatch.setattr(dev, "build_residual_stream", lambda v, con=None: pd.DataFrame())
    assert dev.check_point("beer_hall") is None


# --- G8 scan: last N trading days, ordered, populated ------------------------

def test_scan_returns_ordered_window(store):
    df = dev.scan("beer_hall", window=10)
    assert len(df) <= 10 and df["date"].is_monotonic_increasing
    assert list(df.columns) == ["date", "actual", "expected", "z", "status", "direction", "severity"]


# --- G9 run / CLI report covers every venue ----------------------------------

def test_run_covers_every_deviation_venue(store):
    assert set(VENUES_FOR_DEVIATION) <= set(dev.run()["latest"])


def test_main_writes_report_listing_every_venue(store):
    dev.main()
    text = dev.RESULTS_MD.read_text()
    assert all(VENUE_LABELS[v] in text for v in VENUES_FOR_DEVIATION)
