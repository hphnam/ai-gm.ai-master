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

CACHE_PATH = config.STORE_DIR.parent / "eval" / "agent_cache.json"


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
    and counts the call. Nothing is written to disk until `save()`.
    """

    def __init__(self, *, version: str | None = None, allow_live: bool = False,
                 live_fn=None, path=CACHE_PATH):
        self.version = version
        self.model = config.AGENT_MODEL
        self.prompt_hash = agent.prompt_hash(version)
        self.allow_live = allow_live
        self.live_fn = live_fn or (lambda payload: agent.live_execute(payload, version))
        self.path = path
        self.store = load_cache(path)
        self.hits = 0
        self.calls = 0

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
        resp = self.live_fn(payload)
        self.store[k] = {"model": self.model, "prompt_hash": self.prompt_hash,
                         "response": resp}
        self.calls += 1
        return resp

    def save(self) -> None:
        save_cache(self.store, self.path)
