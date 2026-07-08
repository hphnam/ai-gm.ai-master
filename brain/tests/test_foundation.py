"""WP4 / WP9 · Rung-4 foundation wiring tests.

The gate-wording helper is backend-independent and always runs. The point-forecast
extraction and the Chronos-2 primary / fallback / resource-guard paths use fake
pipelines (torch-guarded), so they run in the eval venv and skip in the runtime
venv where torch is absent."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from models.ladder import RungResult, _rung4_report_lines


def _rolling(naive, dow, gbm, r4):
    return [
        RungResult("rung0_seasonal_naive", 0, metrics={"MASE": naive, "folds": 6}),
        RungResult("rung1_robust_dow", 1, metrics={"MASE": dow, "folds": 6}),
        RungResult("rung3_global_gbm", 3, metrics={"MASE": gbm, "folds": 6}),
        RungResult("rung4_chronos2", 4, metrics={"MASE": r4, "folds": 6}),
    ]


def test_no_rung4_result_yields_empty_section():
    rolling = [RungResult("rung1_robust_dow", 1, metrics={"MASE": 0.5, "folds": 6})]
    assert _rung4_report_lines(rolling) == []


def test_rung4_adopted_when_it_beats_naive_and_dow():
    section = "\n".join(_rung4_report_lines(_rolling(0.9, 0.7, 0.6, 0.5)))
    assert "adopted because it beats seasonal-naive" in section


def test_rung4_not_adopted_when_it_loses_to_dow():
    section = "\n".join(_rung4_report_lines(_rolling(0.9, 0.4, 0.6, 0.5)))
    assert "not adopted" in section


def test_best_entrant_is_the_lower_mase_of_two_entrants():
    rolling = _rolling(0.9, 0.7, 0.6, 0.5)
    rolling.append(RungResult("rung4_chronos_bolt", 4, metrics={"MASE": 0.8, "folds": 6}))
    section = "\n".join(_rung4_report_lines(rolling))
    assert "Best Rung-4 entrant: **rung4_chronos2**" in section


def test_chronos_bolt_predict_returns_clipped_median_quantile(monkeypatch):
    pytest.importorskip("torch", reason="torch absent in the runtime venv")
    from models import foundation

    class _FakeBolt:
        def predict_quantiles(self, inputs, prediction_length, quantile_levels):
            q = np.array([[[-1.0, -2.0, 0.0], [4.0, 5.0, 6.0]]])  # [batch, H, levels]
            return q, np.array([[0.0, 5.0]])

    monkeypatch.setattr(foundation, "_pipeline", lambda: _FakeBolt())
    train = pd.DataFrame({"value": [1.0, 2.0, 3.0]})
    target = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=2)})
    assert foundation.chronos_bolt_predict(train, target).tolist() == [0.0, 5.0]


def test_chronos2_predict_primary_uses_predict_df_median(monkeypatch):
    pytest.importorskip("torch", reason="torch absent in the runtime venv")
    from models import foundation

    class _FakeC2:
        def predict_df(self, df, prediction_length, quantile_levels,
                       id_column, timestamp_column, target):
            return pd.DataFrame({"0.1": [-5.0, 1.0], "0.5": [-3.0, 4.0],
                                 "predictions": [-3.0, 4.0]})

    monkeypatch.setattr(foundation, "_chronos2_pipeline", lambda: _FakeC2())
    train = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=3),
                          "value": [1.0, 2.0, 3.0]})
    target = pd.DataFrame({"date": pd.date_range("2026-02-01", periods=2)})
    assert foundation.chronos2_predict(train, target).tolist() == [0.0, 4.0]


def test_chronos2_predict_falls_back_to_tensor_api(monkeypatch):
    torch = pytest.importorskip("torch", reason="torch absent in the runtime venv")
    from models import foundation

    class _BadC2:
        def predict_df(self, *a, **k):
            raise RuntimeError("malformed frame")

    class _FakeBase:
        def predict_quantiles(self, inputs, prediction_length, quantile_levels):
            q = torch.tensor([[[-1.0, -2.0, 0.0], [4.0, 5.0, 6.0]]])  # (1, H, levels)
            return [q], [torch.zeros(2)]

    monkeypatch.setattr(foundation, "_chronos2_pipeline", lambda: _BadC2())
    monkeypatch.setattr(foundation, "_chronos2_base_pipeline", lambda: _FakeBase())
    train = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=3),
                          "value": [1.0, 2.0, 3.0]})
    target = pd.DataFrame({"date": pd.date_range("2026-02-01", periods=2)})
    assert foundation.chronos2_predict(train, target).tolist() == [0.0, 5.0]


def test_chronos2_resource_guard_substitutes_small_model(monkeypatch):
    pytest.importorskip("chronos", reason="chronos absent in the runtime venv")
    from models import foundation

    for key, val in (("pipe", None), ("base", None), ("model_id", None),
                     ("substituted", False)):
        monkeypatch.setitem(foundation._CHRONOS2, key, val)

    class _Pipe:
        pass

    def _from_pretrained(model_id, device_map=None):
        if model_id == foundation.CHRONOS2_MODEL_ID:
            raise RuntimeError("out of memory")
        return _Pipe()

    monkeypatch.setattr(foundation.Chronos2Pipeline, "from_pretrained",
                        staticmethod(_from_pretrained))
    foundation._chronos2_pipeline()
    assert foundation._CHRONOS2["substituted"] is True


# --- WP12: chronos2_exo_predict (known-future covariates) --------------------
# The covariate presence/NaN check runs before any pipeline call, so these
# raise-on-missing tests need neither torch nor chronos importable and always
# run (G12.5's assertion-test requirement).

def _exo_frame(n: int, start: str) -> pd.DataFrame:
    from models.foundation import CHRONOS2_EXO_COLS
    df = pd.DataFrame({"date": pd.date_range(start, periods=n), "value": range(n)})
    for c in CHRONOS2_EXO_COLS:
        df[c] = 0.0
    return df


def test_exo_predict_raises_on_missing_covariate_column():
    from models.foundation import MissingCovariateError, chronos2_exo_predict

    train = _exo_frame(10, "2026-01-01")
    target = _exo_frame(3, "2026-01-11").drop(columns=["is_ellel_event"])
    with pytest.raises(MissingCovariateError, match="is_ellel_event"):
        chronos2_exo_predict(train, target)


def test_exo_predict_raises_on_nan_covariate_value():
    from models.foundation import MissingCovariateError, chronos2_exo_predict

    train = _exo_frame(10, "2026-01-01")
    target = _exo_frame(3, "2026-01-11")
    target.loc[1, "exo_is_uni_term"] = float("nan")
    with pytest.raises(MissingCovariateError, match="exo_is_uni_term"):
        chronos2_exo_predict(train, target)


def test_exo_universe_includes_weather_calendar_events_and_world_cup():
    # G12.10b: the entrant now consumes the full known-future set, not just
    # calendar. Weather is in it (known-future via the forecast serving basis).
    from models.foundation import CHRONOS2_EXO_COLS
    for c in ("exo_temp_c", "exo_is_school_term", "exo_fixture_nearby",
              "wc_england_in_hours"):
        assert c in CHRONOS2_EXO_COLS


def test_exo_predict_raises_on_observed_weather_basis(monkeypatch):
    # Weather is known-future ONLY on a forecast basis; the ERA5 observed/oracle
    # basis would leak into the backtest, so the entrant refuses it.
    import config
    from models.foundation import MissingCovariateError, chronos2_exo_predict

    monkeypatch.setattr(config, "WEATHER_TRAIN_BASIS", "observed")
    train = _exo_frame(10, "2026-01-01")
    target = _exo_frame(3, "2026-01-11")
    with pytest.raises(MissingCovariateError, match="FORECAST serving basis"):
        chronos2_exo_predict(train, target)


def test_exo_predict_happy_path_uses_future_df_and_median(monkeypatch):
    pytest.importorskip("torch", reason="torch absent in the runtime venv")
    from models import foundation

    seen = {}

    class _FakeC2:
        def predict_df(self, df, future_df, prediction_length, quantile_levels,
                       id_column, timestamp_column, target):
            seen["future_cols"] = set(future_df.columns)
            return pd.DataFrame({"0.5": [7.0, 8.0]})

    monkeypatch.setattr(foundation, "_chronos2_pipeline", lambda: _FakeC2())
    train = _exo_frame(10, "2026-01-01")
    target = _exo_frame(2, "2026-01-11")
    out = foundation.chronos2_exo_predict(train, target)
    assert out.tolist() == [7.0, 8.0]
    assert set(foundation.CHRONOS2_EXO_COLS) <= seen["future_cols"]


# --- G12.10b: full exo universe, resolver, is_ellel_event inert-not-excluded --

def test_chronos2_exo_cols_returns_full_universe_for_all_venues():
    from models.foundation import CHRONOS2_EXO_COLS, chronos2_exo_cols, exo_cols_for_venue

    # No per-venue special-case now: the resolver returns the full universe for
    # every venue (Ellel's is_ellel_event is inert-not-excluded via the source fix).
    assert chronos2_exo_cols("ellel") == list(CHRONOS2_EXO_COLS)
    assert chronos2_exo_cols("beer_hall") == list(CHRONOS2_EXO_COLS)
    assert chronos2_exo_cols(None) == list(CHRONOS2_EXO_COLS)
    assert exo_cols_for_venue is chronos2_exo_cols   # alias retained


def test_exo_predict_accepts_constant_is_ellel_event(monkeypatch):
    # A constant covariate (Ellel's inert is_ellel_event) must not make the
    # entrant raise: the guard checks missing/NaN, never zero variance.
    pytest.importorskip("torch", reason="torch absent in the runtime venv")
    from models import foundation

    class _FakeC2:
        def predict_df(self, df, future_df, prediction_length, quantile_levels,
                       id_column, timestamp_column, target):
            return pd.DataFrame({"0.5": [1.0, 2.0, 3.0]})

    monkeypatch.setattr(foundation, "_chronos2_pipeline", lambda: _FakeC2())
    train = _exo_frame(10, "2026-01-01")   # is_ellel_event all-zero (constant)
    target = _exo_frame(3, "2026-01-11")
    out = foundation.chronos2_exo_predict(train, target, venue="ellel")
    assert out.tolist() == [1.0, 2.0, 3.0]


def test_exo_predict_still_requires_is_ellel_event_column_present():
    # Inert-not-excluded: the column must still be PRESENT (constant 0 on the Ellel
    # frame from the source fix); a genuinely missing column raises for any venue.
    from models.foundation import MissingCovariateError, chronos2_exo_predict

    train = _exo_frame(10, "2026-01-01").drop(columns=["is_ellel_event"])
    target = _exo_frame(3, "2026-01-11")
    with pytest.raises(MissingCovariateError, match="is_ellel_event"):
        chronos2_exo_predict(train, target, venue="beer_hall")


def test_exo_predict_sends_full_set_including_weather_and_world_cup(monkeypatch):
    pytest.importorskip("torch", reason="torch absent in the runtime venv")
    from models import foundation

    seen = {}

    class _FakeC2:
        def predict_df(self, df, future_df, prediction_length, quantile_levels,
                       id_column, timestamp_column, target):
            seen["future_cols"] = set(future_df.columns)
            return pd.DataFrame({"0.5": [7.0, 8.0]})

    monkeypatch.setattr(foundation, "_chronos2_pipeline", lambda: _FakeC2())
    train = _exo_frame(10, "2026-01-01")
    target = _exo_frame(2, "2026-01-11")
    foundation.chronos2_exo_predict(train, target, venue="ellel")
    assert set(foundation.CHRONOS2_EXO_COLS) <= seen["future_cols"]
    assert {"exo_temp_c", "wc_england_in_hours", "is_ellel_event"} <= seen["future_cols"]
