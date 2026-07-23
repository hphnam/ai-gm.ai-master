"""S6 G17g - weather-basis ablation: the lead gate (G1), completeness assertion, batching,
and per-arm target construction. Store/network/Chronos independent (fake pipe, synthetic
frames), so it runs in CI where the real model never does."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from config import WEATHER_DRY_MM
from ingest.exog_weather import WeatherFetchIncompleteError, _assert_span_complete
from models.foundation import CHRONOS2_EXO_COLS
from models.weather_basis import (
    ExoFold,
    LeadMismatchError,
    assert_lead_matched,
    exo_predict,
    fixed_lead_target,
    horizon_matched_target,
    observed_target,
)

CELL = "beer_hall"
FUT = pd.date_range("2026-03-02", periods=7, freq="D")


def _horizon_store(cell: str = CELL) -> pd.DataFrame:
    """A per-lead store where the weather value encodes its (date, lead) so any lead
    mix-up is detectable: temp = day-of-month + lead/100, rain = lead, sunshine = lead*2."""
    rows = []
    for d in pd.date_range("2026-02-20", "2026-03-15", freq="D"):
        for lead in range(1, 8):
            rows.append({"date": d, "cell": cell, "lead": lead,
                         "exo_temp_c": d.day + lead / 100.0,
                         "exo_rain_mm": float(lead),
                         "exo_sunshine_hrs": float(lead * 2)})
    return pd.DataFrame(rows)


def _base_target() -> pd.DataFrame:
    """A 7-row target frame carrying every exo column (weather placeholders overwritten)."""
    df = pd.DataFrame({"date": FUT})
    for c in CHRONOS2_EXO_COLS:
        df[c] = 0.0
    df["exo_fixture_nearby"] = 1  # a non-weather covariate that must survive substitution
    return df


# --- G1: the lead gate (load-bearing) ----------------------------------------

def test_horizon_matched_assigns_lead_equal_to_step():
    target = horizon_matched_target(_base_target(), CELL, _horizon_store())
    assert list(target["_weather_lead"]) == [1, 2, 3, 4, 5, 6, 7]


def test_horizon_matched_step_h_takes_lead_h_rain_value():
    target = horizon_matched_target(_base_target(), CELL, _horizon_store())
    # rain encodes the lead in the synthetic store, so step h must read rain == h.
    assert list(target["exo_rain_mm"]) == [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0]


def test_lead_gate_passes_on_correct_horizon_matched_target():
    target = horizon_matched_target(_base_target(), CELL, _horizon_store())
    assert_lead_matched(target, CELL, _horizon_store())  # must not raise


def test_lead_gate_fires_on_planted_short_lead_at_step_7():
    store = _horizon_store()
    target = horizon_matched_target(_base_target(), CELL, store).reset_index(drop=True)
    # Plant the lead-1 value at horizon step 7 (a shorter, easier forecast than serving has).
    lead1 = store[store["lead"] == 1].set_index("date")
    d7 = pd.Timestamp(target.iloc[-1]["date"])
    for c in ("exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs"):
        target.loc[target.index[-1], c] = float(lead1.loc[d7, c])
    with pytest.raises(LeadMismatchError):
        assert_lead_matched(target, CELL, store)


def test_lead_gate_fires_when_store_lacks_a_lead():
    store = _horizon_store()
    target = horizon_matched_target(_base_target(), CELL, store)
    short = store[store["lead"] <= 5]  # no lead 6 or 7
    with pytest.raises(LeadMismatchError):
        assert_lead_matched(target, CELL, short)


# --- Per-arm target construction ---------------------------------------------

def test_fixed_lead_uses_one_lead_for_every_step():
    target = fixed_lead_target(_base_target(), CELL, _horizon_store(), lead=3)
    # rain encodes the lead, so every step reads the same lead-3 value.
    assert list(target["exo_rain_mm"]) == [3.0] * 7


def test_observed_target_substitutes_and_preserves_non_weather_covariate():
    observed = pd.DataFrame({"date": FUT, "cell": CELL,
                             "exo_temp_c": np.arange(7.0), "exo_rain_mm": np.zeros(7),
                             "exo_sunshine_hrs": np.arange(7.0)})
    target = observed_target(_base_target(), CELL, observed)
    assert list(target["exo_temp_c"]) == list(np.arange(7.0))
    assert list(target["exo_fixture_nearby"]) == [1] * 7  # non-weather covariate untouched


def test_is_dry_rederived_from_substituted_rain():
    store = _horizon_store()
    target = fixed_lead_target(_base_target(), CELL, store, lead=3)  # rain == 3.0 (> dry mm)
    assert list(target["exo_is_dry"]) == [0.0] * 7
    dry_store = store.copy()
    dry_store["exo_rain_mm"] = 0.0  # below the dry threshold everywhere
    target_dry = fixed_lead_target(_base_target(), CELL, dry_store, lead=3)
    assert WEATHER_DRY_MM > 0.0
    assert list(target_dry["exo_is_dry"]) == [1.0] * 7


# --- Ingest completeness assertion (S6 Part 1) -------------------------------

def _daily(start: str, end: str) -> pd.DataFrame:
    dates = pd.date_range(start, end, freq="D")
    return pd.DataFrame({"date": dates, "cell": CELL, "exo_temp_c": np.arange(len(dates)),
                         "exo_rain_mm": 0.0, "exo_sunshine_hrs": 0.0})


def test_span_complete_passes_on_full_span():
    df = _daily("2026-06-18", "2026-06-30")
    _assert_span_complete(df, "2026-06-18", "2026-06-30", CELL, "hindcast")  # no raise


def test_span_complete_fires_on_missing_interior_day():
    df = _daily("2026-06-18", "2026-06-30")
    holed = df[~df["date"].isin(pd.date_range("2026-06-21", "2026-06-29"))]
    with pytest.raises(WeatherFetchIncompleteError):
        _assert_span_complete(holed, "2026-06-18", "2026-06-30", CELL, "hindcast")


def test_span_complete_fires_on_truncated_tail():
    df = _daily("2026-06-18", "2026-06-25")  # asked for -30, returns only -25
    with pytest.raises(WeatherFetchIncompleteError):
        _assert_span_complete(df, "2026-06-18", "2026-06-30", CELL, "observed")


def test_span_complete_fires_on_null_value_day():
    df = _daily("2026-06-18", "2026-06-30")
    df.loc[df["date"] == pd.Timestamp("2026-06-24"), "exo_temp_c"] = np.nan
    with pytest.raises(WeatherFetchIncompleteError):
        _assert_span_complete(df, "2026-06-18", "2026-06-30", CELL, "leadmatched")


def test_build_rebuild_branch_asserts_completeness(monkeypatch, tmp_path):
    """The rebuild (initial/force) branch of build() must refuse a holed fetch too, not only
    the incremental branch. Regression for the branch the completeness guard first missed."""
    import ingest.exog_weather as w

    monkeypatch.setattr(w, "WEATHER_CELLS", {"beer_hall": CELL})
    monkeypatch.setattr(w, "_cell_span", lambda cell: ("2026-06-18", "2026-06-30"))

    def _holed(cell, start, end, **kw):
        df = _daily(start, end)
        return df[~df["date"].isin(pd.date_range("2026-06-21", "2026-06-29"))]

    monkeypatch.setattr(w, "_FETCH", {b: _holed for b in w.BASES})
    monkeypatch.setenv("BRAIN_DUCKDB_PATH", str(tmp_path / "t.duckdb"))
    with pytest.raises(WeatherFetchIncompleteError):
        w.build(force=True)


# --- Batched == unbatched exo prediction (fake pipe) -------------------------

class _FakePipe:
    """predict_df stub: per id, median = the id's last context target, repeated over the
    horizon. Deterministic per id, so batching several ids must equal per-id calls."""

    def __init__(self):
        self.seen_future_cols: list[str] = []

    def predict_df(self, ctx, *, future_df, prediction_length, id_column, timestamp_column,
                   target, cross_learning, batch_size, quantile_levels):
        self.seen_future_cols = list(future_df.columns)
        out = []
        for sid, g in ctx.groupby(id_column, sort=False):
            last = float(g[target].to_numpy()[-1])
            fut = future_df[future_df[id_column] == sid]
            out.append(pd.DataFrame({id_column: sid, "0.5": [last] * len(fut)}))
        return pd.concat(out, ignore_index=True)


def _exo_folds(n: int) -> list[ExoFold]:
    folds = []
    for i in range(n):
        train = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=30, freq="D"),
                              "value": np.arange(30.0) + i})
        for c in CHRONOS2_EXO_COLS:
            train[c] = 0.0
        target = _base_target()
        folds.append(ExoFold(key=f"2026-02-{i + 1:02d}", venue=CELL,
                             train=train, target=target))
    return folds


def test_exo_predict_batched_equals_unbatched():
    folds = _exo_folds(5)
    batched = exo_predict(folds, pipe=_FakePipe(), exo_cols=list(CHRONOS2_EXO_COLS),
                          origin_batch=8)
    unbatched = exo_predict(folds, pipe=_FakePipe(), exo_cols=list(CHRONOS2_EXO_COLS),
                            origin_batch=1)
    assert set(batched) == set(unbatched)
    for k in batched:
        assert np.array_equal(batched[k], unbatched[k])


def test_exo_predict_demuxes_each_origin_to_its_own_context():
    folds = _exo_folds(3)  # fold i has last context value 29+i
    out = exo_predict(folds, pipe=_FakePipe(), exo_cols=list(CHRONOS2_EXO_COLS),
                      origin_batch=8)
    assert out["2026-02-01"][0] == 29.0
    assert out["2026-02-03"][0] == 31.0


def test_exo_predict_passes_covariates_into_future_frame():
    pipe = _FakePipe()
    exo_predict(_exo_folds(2), pipe=pipe, exo_cols=list(CHRONOS2_EXO_COLS), origin_batch=8)
    for c in CHRONOS2_EXO_COLS:
        assert c in pipe.seen_future_cols
