"""S8 Part 2 - the response cache that makes the agent evaluation replayable.

Every agent response is stored on disk keyed on the hash of (model, prompt hash, scenario
payload), and committed. The offline evaluation replays end to end from this cache with
ZERO API calls: an examiner with no key can rerun every number. S3 closed the
reproducibility hole for the forecasting stack; an evaluation that depended on a live,
non-deterministic service would reopen it, so the live call is confined to a `--build` pass
whose only job is to fill this cache.

The key folds in the model string AND the prompt hash, so bumping the model or editing the
pinned prompt changes the key and every prior answer misses - a stale response can never be
silently reused under a changed prompt. In offline mode a missing key is a hard
`CacheMiss`, not a fallback: the stop condition "the cache cannot reproduce a stored
response" fires loudly rather than papering over a key that failed to capture everything
that varies.
"""

from __future__ import annotations

import hashlib
import json

import config
from signals import agent

CACHE_PATH = config.REPORT_ROOT / "eval" / "agent_cache.json"


def build_path_for(path):
    """The build-history sidecar beside a cache file. Kept OUT of the cache so the cache
    stays a pure key -> response map and its bytes do not depend on how it was built."""
    return path.with_name(path.stem + ".build.json")


BUILD_PATH = build_path_for(CACHE_PATH)


class CacheMiss(KeyError):
    """Raised in offline mode when a scenario has no stored response."""


def load_cache(path=CACHE_PATH) -> dict:
    """The committed key -> entry map, or {} when it has not been built yet."""
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def save_cache(store: dict, path=CACHE_PATH) -> None:
    """Write the cache as sorted, indented JSON so its diff is stable and reviewable."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(store, indent=2, sort_keys=True, ensure_ascii=False) + "\n")


class ResponseCache:
    """Wraps the injected `execute` seam with a disk cache.

    Pass `.execute` to `agent.score_scenario`. In offline mode (`allow_live=False`, the
    default) a cache miss raises; in build mode a miss calls `live_fn`, stores the answer,
    counts the call, and checkpoints to disk every `checkpoint_every` live calls.

    Checkpointing exists because the build is a funded, non-repeatable spend: before it, the
    cache reached disk only after ALL calls had succeeded, so one transient failure at the
    last call discarded every response bought before it. A resumed run replays what is
    already on disk as hits and buys only the remainder.

    The cache file itself is unchanged by any of this — `save_cache` sorts keys, so an
    interrupted-and-resumed build writes the same bytes as an uninterrupted one. The build
    history lives in a SIDECAR (`BUILD_PATH`) so that byte-identity holds AND an interrupted
    build stays visible afterwards: a resumed run is never reportable as a clean one.
    """

    def __init__(self, *, version: str | None = None, allow_live: bool = False,
                 live_fn=None, path=CACHE_PATH, checkpoint_every: int = 25,
                 max_attempts: int = 3, on_retry=None):
        self.version = version
        self.model = config.AGENT_MODEL
        self.prompt_hash = agent.prompt_hash(version)
        self.allow_live = allow_live
        self.live_fn = live_fn or (lambda payload: agent.live_execute(payload, version))
        self.path = path
        self.build_path = build_path_for(path)
        self.store = load_cache(path)
        self.hits = 0
        self.calls = 0
        self.retries = 0
        self.checkpoints = 0
        self.checkpoint_every = checkpoint_every
        self.max_attempts = max_attempts
        self.on_retry = on_retry or (lambda attempt, exc: print(
            f"  agent_cache: call failed ({type(exc).__name__}: {exc}); "
            f"retry {attempt} of {max_attempts - 1}", flush=True))
        self._since_checkpoint = 0
        self.resumed_entries = len(self.store) if allow_live else 0

    def key(self, payload: dict) -> str:
        material = json.dumps(
            {"model": self.model, "prompt_hash": self.prompt_hash,
             "payload": agent.payload_json(payload)},
            sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(material.encode()).hexdigest()

    def execute(self, payload: dict) -> dict:
        k = self.key(payload)
        entry = self.store.get(k)
        if entry is not None:
            self.hits += 1
            return entry["response"]
        if not self.allow_live:
            raise CacheMiss(
                f"no cached agent response for scenario {k[:12]}... "
                "(run `python -m eval.agent_calibration --build` with a key to populate)")
        resp = self._call_with_retry(payload)
        self.store[k] = {"model": self.model, "prompt_hash": self.prompt_hash,
                         "response": resp}
        self.calls += 1
        self._since_checkpoint += 1
        if self.checkpoint_every and self._since_checkpoint >= self.checkpoint_every:
            self.checkpoint()
        return resp

    def _call_with_retry(self, payload: dict) -> dict:
        """Bounded, LOGGED retry. Silent retry would turn a transient failure into an
        unrecorded one, and the retry count is part of what the build artefact reports."""
        for attempt in range(1, self.max_attempts + 1):
            try:
                return self.live_fn(payload)
            except Exception as exc:
                if attempt == self.max_attempts:
                    raise
                self.retries += 1
                self.on_retry(attempt, exc)

    def checkpoint(self) -> None:
        """Flush responses bought so far, and mark the build INCOMPLETE on disk."""
        self.checkpoints += 1
        self._since_checkpoint = 0
        save_cache(self.store, self.path)
        self._write_build(complete=False)

    def save(self, *, complete: bool = True) -> None:
        """Write the cache. `complete=True` closes the build record; the record still
        carries the checkpoint and retry counts, so an interrupted build that later
        finished cannot present itself as an uninterrupted one."""
        save_cache(self.store, self.path)
        self._write_build(complete=complete)

    def _write_build(self, *, complete: bool) -> None:
        self.build_path.parent.mkdir(parents=True, exist_ok=True)
        self.build_path.write_text(json.dumps({
            "complete": complete,
            "model": self.model,
            "prompt_hash": self.prompt_hash,
            "entries": len(self.store),
            "live_calls_this_session": self.calls,
            "replayed_this_session": self.hits,
            "resumed_from_entries": self.resumed_entries,
            "checkpoints": self.checkpoints,
            "retries": self.retries,
        }, indent=2, sort_keys=True) + "\n")

    def is_partial(self) -> bool:
        """True when a build was interrupted and never closed."""
        if not self.build_path.exists():
            return False
        return not json.loads(self.build_path.read_text()).get("complete", False)
