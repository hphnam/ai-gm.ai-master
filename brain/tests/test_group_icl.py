"""S5 G17f gates: panel leakage (G1), batched==unbatched plumbing (G3b), the closure-zero
composition, per-venue scoring (G4), and the MCS-over-arms machinery.

Store- and network-independent: every test runs on synthetic panels or a fake pipeline, so
they pass in the runtime venv (no Chronos) and against the seed-ceiling test store. The real
per-fold Chronos numbers, the numeric batched==unbatched equality on the model, and the
committed-ladder reproduction are the --build/--calibrate run's job and are reported there,
not pinned here.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from eval import group_icl as gi
from models.group_forecast import (
    PanelLeakageError,
    PanelOrigin,
    PanelSeries,
    assert_panel_leak_free,
    group_predict,
)


# --- Fixtures ----------------------------------------------------------------

def _series(venue: str, last: str, n: int, *, start_value: float = 10.0) -> PanelSeries:
    dates = pd.date_range(pd.Timestamp(last) - pd.Timedelta(days=n - 1), periods=n, freq="D")
    return PanelSeries(venue=venue, dates=dates.to_numpy(),
                       values=np.full(n, start_value, float))


def _panel(origin: str, *series: PanelSeries) -> PanelOrigin:
    o = pd.Timestamp(origin)
    fut = pd.date_range(o + pd.Timedelta(days=1), periods=gi.HORIZON_DAYS, freq="D")
    return PanelOrigin(origin=o, future_dates=fut.to_numpy(), series=tuple(series))


class _FakePipe:
    """Returns a per-id median derived only from that id's own rows, so a correct driver
    yields identical output whether ids are batched together or issued separately."""

    def predict_df(self, df, *, prediction_length, quantile_levels, id_column,
                   timestamp_column, target, cross_learning, batch_size):
        self.last_batch_size = batch_size
        out = []
        for sid, g in df.groupby(id_column, sort=False):
            base = float(g[target].to_numpy()[-1]) + len(g)
            for h in range(prediction_length):
                out.append({id_column: sid,
                            timestamp_column: g[timestamp_column].max() + pd.Timedelta(days=h + 1),
                            "0.5": base + h})
        return pd.DataFrame(out)


# --- G2: the identifier refactor is a pure relabel of the univariate path -----

def test_univariate_frame_defaults_to_l1_and_is_invariant_to_the_series_id(monkeypatch):
    """The three parameterised sites default to "l1" (byte-identical univariate path) and
    a custom id changes only the label, never the timestamps or targets the model sees -
    which is why the S5 G2 run reproduces the committed vectors."""
    from models import foundation

    captured = {}

    class _CapturePipe:
        def predict_df(self, df, *, prediction_length, quantile_levels, id_column,
                       timestamp_column, target, **kw):
            captured["frame"] = df.copy()
            return pd.DataFrame({"0.5": np.zeros(prediction_length)})

    monkeypatch.setattr(foundation, "_chronos2_pipeline", lambda: _CapturePipe())
    train = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=130), "value": 5.0})
    target = pd.DataFrame({"date": pd.date_range("2026-05-11", periods=7)})

    foundation.chronos2_predict(train, target)
    assert set(captured["frame"]["id"]) == {"l1"}
    default_targets = captured["frame"]["target"].to_numpy()

    foundation.chronos2_predict(train, target, series_id="beer_hall")
    assert set(captured["frame"]["id"]) == {"beer_hall"}
    assert np.array_equal(captured["frame"]["target"].to_numpy(), default_targets)


# --- G1: panel leakage (load-bearing) ----------------------------------------

def test_clean_panel_passes_the_leakage_guard():
    panels = [_panel("2026-03-01", _series("beer_hall", "2026-03-01", 130),
                     _series("ellel", "2026-03-01", 130))]
    assert_panel_leak_free(panels)  # does not raise


def test_leakage_guard_fires_on_a_target_context_past_the_origin():
    leak = [_panel("2026-03-01", _series("beer_hall", "2026-03-05", 130))]  # 4 days past t
    with pytest.raises(PanelLeakageError):
        assert_panel_leak_free(leak)


def test_leakage_guard_fires_on_a_NON_target_venue_past_the_origin():
    """Cross-series attention makes another venue's future just as leaky as the target's."""
    leak = [_panel("2026-03-01",
                   _series("beer_hall", "2026-03-01", 130),   # clean
                   _series("ellel", "2026-03-04", 130))]      # the neighbour leaks
    with pytest.raises(PanelLeakageError):
        assert_panel_leak_free(leak)


def test_leakage_guard_fires_when_the_future_window_is_not_after_the_origin():
    o = pd.Timestamp("2026-03-01")
    bad = PanelOrigin(origin=o,
                      future_dates=pd.date_range(o, periods=gi.HORIZON_DAYS).to_numpy(),
                      series=(_series("beer_hall", "2026-03-01", 130),))
    with pytest.raises(PanelLeakageError):
        assert_panel_leak_free([bad])


def test_group_predict_runs_the_leakage_guard_before_forecasting():
    leak = [_panel("2026-03-01", _series("beer_hall", "2026-03-05", 130))]
    with pytest.raises(PanelLeakageError):
        group_predict(leak, cross_learning=False, pipe=_FakePipe())


# --- G3b plumbing: batching does not change a number --------------------------

def test_batched_equals_unbatched_for_the_univariate_arm():
    panels = [_panel(f"2026-0{m}-01", _series("beer_hall", f"2026-0{m}-01", 130 + m))
              for m in range(1, 9)]
    pipe = _FakePipe()
    one = group_predict(panels, cross_learning=False, pipe=pipe, origin_batch=1)
    eight = group_predict(panels, cross_learning=False, pipe=pipe, origin_batch=8)
    assert one.keys() == eight.keys()
    for k in one:
        assert np.array_equal(one[k]["beer_hall"], eight[k]["beer_hall"])


def test_batched_equals_unbatched_for_the_grouped_arm():
    panels = [_panel(f"2026-0{m}-01",
                     _series("beer_hall", f"2026-0{m}-01", 130 + m),
                     _series("ellel", f"2026-0{m}-01", 130 + m)) for m in range(1, 7)]
    pipe = _FakePipe()
    one = group_predict(panels, cross_learning=True, pipe=pipe, origin_batch=1)
    three = group_predict(panels, cross_learning=True, pipe=pipe, origin_batch=3)
    for k in one:
        for v in ("beer_hall", "ellel"):
            assert np.array_equal(one[k][v], three[k][v])


def test_cross_learning_pins_the_chronos_batch_to_the_group_size():
    """The group must equal the batch, so batch_size is the venue count, not the default."""
    panels = [_panel("2026-03-01",
                     _series("beer_hall", "2026-03-01", 130),
                     _series("ellel", "2026-03-01", 130))]
    pipe = _FakePipe()
    group_predict(panels, cross_learning=True, pipe=pipe)
    assert pipe.last_batch_size == 2


def test_cross_learning_rejects_a_ragged_group_size():
    panels = [_panel("2026-03-01", _series("beer_hall", "2026-03-01", 130)),
              _panel("2026-04-01",
                     _series("beer_hall", "2026-04-01", 130),
                     _series("ellel", "2026-04-01", 130))]
    with pytest.raises(ValueError):
        group_predict(panels, cross_learning=True, pipe=_FakePipe())


# --- Closure-zero composition (G6 branch) ------------------------------------

def test_closure_zeros_fill_the_gap_to_the_origin_and_stay_before_it():
    frame = pd.DataFrame({"date": pd.date_range("2025-06-12", "2026-05-08", freq="D"),
                          "value": 5.0})
    dates, values = gi._closure_zero_series(frame, pd.Timestamp("2026-06-01"))
    assert pd.Timestamp(dates.max()) == pd.Timestamp("2026-06-01")     # reaches the origin
    assert (np.diff(dates.astype("datetime64[D]").astype(int)) == 1).all()  # gap-free
    assert values[-1] == 0.0 and values[0] == 5.0                     # zero tail, real head


def test_closure_zeros_leave_the_panel_leak_free():
    frame = pd.DataFrame({"date": pd.date_range("2025-06-12", "2026-05-08", freq="D"),
                          "value": 5.0})
    dates, values = gi._closure_zero_series(frame, pd.Timestamp("2026-06-01"))
    panel = PanelOrigin(
        origin=pd.Timestamp("2026-06-01"),
        future_dates=pd.date_range("2026-06-02", periods=gi.HORIZON_DAYS).to_numpy(),
        series=(PanelSeries("two_river_taps", dates, values),))
    assert_panel_leak_free([panel])  # does not raise


# --- Per-venue scoring (G4) --------------------------------------------------

def test_beer_hall_gets_a_mase_but_ellel_does_not():
    y_true = np.array([10.0, 0.0, 12.0, 0.0, 14.0, 0.0, 8.0])
    y_pred = np.array([9.0, 1.0, 11.0, 0.0, 13.0, 1.0, 7.0])
    y_train = np.tile([10.0, 0.0, 12.0, 0.0, 14.0, 0.0, 8.0], 20)
    assert "mase" in gi._score("beer_hall", y_true, y_pred, y_train)
    assert "mase" not in gi._score("ellel", y_true, y_pred, y_train)


# --- MCS over arms -----------------------------------------------------------

def _vectors_with(losses: dict[str, list[float]], metric: str) -> dict:
    keys = [f"2026-01-{i + 1:02d}" for i in range(len(next(iter(losses.values()))))]
    arms = {a: {"origin_keys": keys, metric: v} for a, v in losses.items()}
    return {"venues": {"ellel": {"basis": "unscaled", "loss_metric": metric,
                                 "arms": arms}}}


def test_dominated_arm_is_eliminated_and_the_pair_delta_excludes_zero():
    rng = np.random.default_rng(0)
    n = 120
    good = list(rng.normal(1.0, 0.2, n))
    bad = [g + 1.5 for g in good]  # uniformly worse, strongly correlated
    vectors = _vectors_with({"U": bad, "G2": good, "G3": good}, "mae")
    out = gi.run_mcs(vectors)["venues"]["ellel"]
    assert "U" not in out["set_90"]
    ug2 = next(p for p in out["paired_bootstrap"] if p["pair"] == "U-G2")
    assert ug2["excludes_zero"] and ug2["mean_delta"] > 0


def test_indistinguishable_arms_are_all_retained():
    """A shared signal plus independent tiny per-arm noise: same mean, strongly
    correlated, no arm systematically better, so the set cannot separate them."""
    rng = np.random.default_rng(1)
    shared = rng.normal(1.0, 0.3, 150)
    arms = {a: list(shared + rng.normal(0, 0.02, 150)) for a in ("U", "G2", "G3")}
    out = gi.run_mcs(_vectors_with(arms, "mae"))["venues"]["ellel"]
    assert set(out["set_90"]) == {"U", "G2", "G3"}
