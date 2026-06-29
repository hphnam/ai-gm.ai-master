"""A13 tests — change-point detectors fire on real shifts, stay quiet on noise,
recover the TRT closure ground truth, respect closure dormancy, and attribute
against the A14 seam (spec gates G2/G3/G4/G8/G9/G11)."""

from __future__ import annotations

import numpy as np
import pytest

from signals import change_point as cp
from store.active_span import active_trading_end
from store import warehouse


@pytest.fixture(scope="module")
def store():
    warehouse.build()


# --- G2 CUSUM ----------------------------------------------------------------

def test_cusum_fires_on_a_sustained_step():
    z = np.concatenate([np.zeros(40), np.full(30, 1.5)])
    alarms = cp.cusum(z, k=0.5, h=5.0)
    assert any(a["direction"] == "up" for a in alarms)


def test_cusum_stays_quiet_on_small_noise():
    rng = np.random.default_rng(0)
    z = rng.normal(0, 0.3, 300)
    assert cp.cusum(z, k=0.5, h=5.0) == []


# --- G3 persistence ----------------------------------------------------------

def test_persistence_fires_on_a_one_directional_run():
    z = np.concatenate([np.zeros(20), np.full(10, 2.0)])
    assert any(a["direction"] == "up" for a in cp.persistence(z, m=4, n=7))


def test_persistence_ignores_an_isolated_breach():
    z = np.zeros(40)
    z[20] = 3.0
    assert cp.persistence(z, m=4, n=7) == []


# --- G4 / G11 TRT closure ground truth + dormancy ----------------------------

def test_trt_closure_is_detected_as_a_downward_change_point(store):
    df = cp.detect("two_river_taps")
    closure = df[df["note"].astype(str).str.contains("closure", na=False)]
    assert not closure.empty and closure.iloc[0]["direction"] == "down"


def test_closed_venue_has_no_alarms_after_the_closure_onset(store):
    df = cp.detect("two_river_taps")
    aend = active_trading_end("two_river_taps").date()
    downs = df[df["direction"] == "down"]
    assert (downs["onset_date"] <= aend).all()


# --- G8 attribution ----------------------------------------------------------

def test_attribution_returns_a_nonempty_ranked_list(store):
    import pandas as pd
    out = cp.attribute("beer_hall", pd.Timestamp("2025-12-27"), "down", "L1")
    assert isinstance(out, list) and len(out) >= 1


# --- G9 / G12 recalibration flag + persistence -------------------------------

def test_detected_change_points_flag_recalibration(store):
    df = cp.detect("beer_hall")
    assert df.empty or bool(df["recalibration_needed"].all())


def test_run_persists_change_points_table(store):
    cp.run()
    con = warehouse.connect(read_only=True)
    try:
        n = con.execute("SELECT COUNT(*) FROM change_points").fetchone()[0]
    finally:
        con.close()
    assert n >= 1
