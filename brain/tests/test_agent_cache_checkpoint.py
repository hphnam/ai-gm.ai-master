"""S32 V3 gates: the build survives interruption without changing what it produces.

Before checkpointing, `agent_calibration.run` wrote the cache only after every call had
succeeded, so one transient failure at the last call discarded the whole funded spend. These
tests pin the three properties that make a resumed build trustworthy: it produces the same
artefact, it cannot pass itself off as an uninterrupted one, and its retries are bounded and
recorded.

Store-independent and network-independent: the live seam is a deterministic stub.
"""

from __future__ import annotations

import pytest

from eval import agent_cache

_N_PAYLOADS = 30


def _payloads(n: int = _N_PAYLOADS) -> list[dict]:
    return [{"venue": "beer_hall", "as_of": "2026-05-31", "items": [{"item_key": f"k{i}"}]}
            for i in range(n)]


def _responder(payload: dict) -> dict:
    """Deterministic stand-in for the model: same payload always yields the same answer."""
    key = payload["items"][0]["item_key"]
    return {"verdicts": [{"item_key": key, "p_raise": 0.5, "rationale": f"stub {key}"}]}


def _build(path, payloads, *, fail_at=(), checkpoint_every=7):
    """One build session. Returns the cache; raises RuntimeError at the nominated call."""
    seen = {"n": 0}

    def live(payload):
        seen["n"] += 1
        if seen["n"] in fail_at:
            raise RuntimeError(f"transient failure at call {seen['n']}")
        return _responder(payload)

    cache = agent_cache.ResponseCache(allow_live=True, live_fn=live, path=path,
                                      checkpoint_every=checkpoint_every, max_attempts=1)
    for p in payloads:
        cache.execute(p)
    cache.save()
    return cache


def _run_uninterrupted(path) -> str:
    _build(path, _payloads())
    return path.read_text()


def _run_interrupted(path) -> str:
    """Two interruptions, each followed by a fresh session resuming from disk."""
    payloads = _payloads()
    for attempt in (1, 2):
        with pytest.raises(RuntimeError):
            _build(path, payloads, fail_at=(11 * attempt,))
    _build(path, payloads)
    return path.read_text()


def test_an_interrupted_build_produces_the_same_cache_as_an_uninterrupted_one(tmp_path):
    clean = _run_uninterrupted(tmp_path / "clean.json")
    resumed = _run_interrupted(tmp_path / "resumed.json")
    assert resumed == clean


def test_an_interrupted_build_leaves_responses_bought_before_it_on_disk(tmp_path):
    path = tmp_path / "cache.json"
    with pytest.raises(RuntimeError):
        _build(path, _payloads(), fail_at=(11,))
    assert len(agent_cache.load_cache(path)) == 7


def test_a_build_stopped_mid_flight_is_identifiable_as_partial(tmp_path):
    path = tmp_path / "cache.json"
    with pytest.raises(RuntimeError):
        _build(path, _payloads(), fail_at=(11,))
    assert agent_cache.ResponseCache(allow_live=False, path=path).is_partial() is True


def test_a_completed_build_is_not_partial(tmp_path):
    path = tmp_path / "cache.json"
    _build(path, _payloads())
    assert agent_cache.ResponseCache(allow_live=False, path=path).is_partial() is False


def test_a_resumed_build_records_that_it_was_resumed(tmp_path):
    """A clean final save must not erase the interruption: the build record carries it."""
    path = tmp_path / "cache.json"
    _run_interrupted(path)
    import json
    record = json.loads(agent_cache.build_path_for(path).read_text())
    assert record["resumed_from_entries"] > 0


def test_a_failing_call_is_retried_up_to_the_bound(tmp_path):
    calls = {"n": 0}

    def flaky(_payload):
        calls["n"] += 1
        raise RuntimeError("always fails")

    cache = agent_cache.ResponseCache(allow_live=True, live_fn=flaky, path=tmp_path / "c.json",
                                      max_attempts=3, on_retry=lambda *_: None)
    with pytest.raises(RuntimeError):
        cache.execute(_payloads(1)[0])
    assert calls["n"] == 3


def test_each_retry_is_logged(tmp_path):
    logged = []

    def flaky(_payload):
        raise RuntimeError("always fails")

    cache = agent_cache.ResponseCache(allow_live=True, live_fn=flaky, path=tmp_path / "c.json",
                                      max_attempts=3, on_retry=lambda a, e: logged.append(a))
    with pytest.raises(RuntimeError):
        cache.execute(_payloads(1)[0])
    assert logged == [1, 2]


def test_a_transient_failure_is_recovered_without_losing_the_call(tmp_path):
    attempts = {"n": 0}

    def flaky_once(payload):
        attempts["n"] += 1
        if attempts["n"] == 1:
            raise RuntimeError("transient")
        return _responder(payload)

    cache = agent_cache.ResponseCache(allow_live=True, live_fn=flaky_once,
                                      path=tmp_path / "c.json", on_retry=lambda *_: None)
    assert cache.execute(_payloads(1)[0]) == _responder(_payloads(1)[0])


def test_checkpointing_does_not_change_the_cache_key(tmp_path):
    """The key is hash(model, prompt_hash, payload); nothing added here is a term in it."""
    payload = _payloads(1)[0]
    plain = agent_cache.ResponseCache(allow_live=False, path=tmp_path / "a.json",
                                      checkpoint_every=0)
    checkpointing = agent_cache.ResponseCache(allow_live=False, path=tmp_path / "b.json",
                                              checkpoint_every=5)
    assert checkpointing.key(payload) == plain.key(payload)
