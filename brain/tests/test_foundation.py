"""WP4 · Rung-4 Chronos-Bolt wiring tests (backend-independent).

The heavy chronos/torch backend does not install on this Python 3.14 venv, so
these cover the parts that do not need it: the gate-wording helper and the
point-forecast extraction (the latter with a fake pipeline)."""

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
        RungResult("rung4_chronos_bolt", 4, metrics={"MASE": r4, "folds": 6}),
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


def test_chronos_bolt_predict_returns_clipped_median_quantile(monkeypatch):
    pytest.importorskip("torch", reason="torch does not build on this Python 3.14 venv")
    from models import foundation

    class _FakePipeline:
        def predict_quantiles(self, context, prediction_length, quantile_levels):
            q = np.array([[[-1.0, -2.0, 0.0], [4.0, 5.0, 6.0]]])  # [batch, H, levels]
            return q, np.array([[0.0, 5.0]])

    monkeypatch.setattr(foundation, "_pipeline", lambda: _FakePipeline())
    train = pd.DataFrame({"value": [1.0, 2.0, 3.0]})
    target = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=2)})
    out = foundation.chronos_bolt_predict(train, target)
    assert out.tolist() == [0.0, 5.0]  # 0.5 row [-2, 5], clipped at 0
