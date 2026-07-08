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
