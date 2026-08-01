"""S8 Part 1 - the briefing-triage agent.

The research question names an LLM agent that "decides which issues are worth raising,
when, and in what tone". This module is that agent. Given one day's ranked, de-duplicated
briefing items for one venue plus the venue context, it returns for each item a calibrated
probability `p_raise` that the item is worth raising to the manager today, a one-sentence
rationale (the tone), and the pinned model + prompt hash that produced it.

Two disciplines make the evaluation honest and replayable:

  * The prompt is a committed, pre-registered file (`signals/prompts/agent_<version>.md`),
    not an inline string. Its hash keys the response cache, so editing it invalidates every
    cached answer - a prompt cannot be tuned until it scores well and then silently reuse
    old responses.

  * The agent emits its probability ONCE per scenario. The live model call is injected as an
    `execute` closure, so the caller (the cache in `eval/agent_cache.py`) decides whether a
    scenario is answered live or replayed from disk. This module never touches the network
    itself except inside `live_execute`, and never fabricates a probability: with no key and
    no cached answer the caller gets a cache miss, not an invented number. Same honest seam
    as the judge (`eval/judge.py`), the Voyage/TF-IDF fallback, and live-ingest.

The `anthropic` SDK is imported lazily inside `live_execute` so the module loads (and the
offline evaluation runs) with the SDK absent.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Callable

import config

# BRAIN_DIR, not REPORT_ROOT: the versioned prompt is a committed INPUT that this module
# reads, not an artefact it writes. It shared the artefact idiom by accident, which made it
# follow BRAIN_REPORT_ROOT to a tmp directory and vanish (report 58). The freeze-before-
# evaluation guarantee in sec:agent rests on this file living in version control.
PROMPTS_DIR = config.BRAIN_DIR / "signals" / "prompts"

# The response schema: one verdict per input item, p_raise a probability in [0, 1].
SCORING_SCHEMA = {
    "type": "object",
    "properties": {
        "verdicts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "item_key": {"type": "string"},
                    "p_raise": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                    "rationale": {"type": "string"},
                },
                "required": ["item_key", "p_raise", "rationale"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["verdicts"],
    "additionalProperties": False,
}


@dataclass(frozen=True)
class AgentVerdict:
    """One item's triage decision, stamped with what produced it."""
    item_key: str
    p_raise: float
    rationale: str
    model: str
    prompt_hash: str


# --- Prompt (pinned, hashed) -------------------------------------------------

def prompt_path(version: str | None = None) -> Path:
    return PROMPTS_DIR / f"agent_{version or config.AGENT_PROMPT_VERSION}.md"


@lru_cache(maxsize=None)
def load_prompt(version: str | None = None) -> str:
    return prompt_path(version).read_text()


@lru_cache(maxsize=None)
def prompt_hash(version: str | None = None) -> str:
    """SHA-256 of the pinned prompt text. Keys the cache; an edit changes the key."""
    return hashlib.sha256(load_prompt(version).encode()).hexdigest()


# --- Scenario payload (canonical, deterministic) -----------------------------

def build_payload(items: list[dict], context: dict) -> dict:
    """The single JSON object the agent scores: one venue's day.

    Built only from already-serialised briefing item dicts (`briefing._item_to_dict`)
    plus a small venue context, and canonicalised (sorted keys, rounded floats) so the
    same scenario always hashes to the same cache key. Carries the day's numbers (in each
    head payload) and the attribution candidates (in each reason), which is the context
    the agent triages against.
    """
    return _canonical({
        "venue": context["venue"],
        "venue_label": context.get("venue_label", context["venue"]),
        "as_of": context["as_of"],
        "event_driven": bool(context.get("event_driven", False)),
        "items": [{
            "item_key": it["item_key"],
            "headline": it["headline"],
            "reason": it["reason"],
            "severity": it["severity"],
            "direction": it["direction"],
            "status": it["status"],
            "score": it["score"],
            "caveats": it.get("caveats", []),
            "head": it["head"],
        } for it in items],
    })


def payload_json(payload: dict) -> str:
    """Canonical serialisation used both for the cache key and the user message."""
    return json.dumps(payload, sort_keys=True, ensure_ascii=False)


# --- Scoring -----------------------------------------------------------------

def score_scenario(items: list[dict], context: dict, *,
                   execute: Callable[[dict], dict],
                   version: str | None = None) -> list[AgentVerdict]:
    """Triage one scenario. `execute(payload)` returns the raw response dict (live or
    cached); this validates it against the input items and stamps each verdict."""
    if not items:
        return []
    payload = build_payload(items, context)
    response = execute(payload)
    return parse_response(response, items, version=version)


def parse_response(response: dict, items: list[dict],
                   version: str | None = None) -> list[AgentVerdict]:
    """Validate the model's verdicts cover exactly the input items, in range."""
    model = config.AGENT_MODEL
    phash = prompt_hash(version)
    by_key = {v["item_key"]: v for v in response.get("verdicts", [])}
    want = [it["item_key"] for it in items]
    missing = [k for k in want if k not in by_key]
    if missing:
        raise ValueError(f"agent response missing verdicts for {missing}")
    out = []
    for k in want:
        v = by_key[k]
        p = float(v["p_raise"])
        if not 0.0 <= p <= 1.0:
            raise ValueError(f"p_raise {p} out of range for {k}")
        out.append(AgentVerdict(k, p, str(v.get("rationale", "")), model, phash))
    return out


# --- Live call (needs the SDK + a key; imported lazily) ----------------------

def live_execute(payload: dict, version: str | None = None) -> dict:  # pragma: no cover - needs network + key
    """Call the pinned agent model at temperature 0 with structured output.

    Mirrors the judge's live seam. Imported lazily so the module and the offline
    evaluation load with `anthropic` absent. Returns the parsed response dict.
    """
    import anthropic

    client = anthropic.Anthropic()
    resp = client.messages.create(
        model=config.AGENT_MODEL,
        max_tokens=config.AGENT_MAX_TOKENS,
        temperature=config.AGENT_TEMPERATURE,
        system=load_prompt(version),
        output_config={"format": {"type": "json_schema", "schema": SCORING_SCHEMA}},
        messages=[{"role": "user", "content": payload_json(payload)}],
    )
    text = next(b.text for b in resp.content if b.type == "text")
    return json.loads(text)


# --- Canonicalisation --------------------------------------------------------

def _canonical(obj):
    """Round floats and sort nothing here (json.dumps sort_keys does the ordering), so
    the payload is a stable function of its values across runs and machines."""
    if isinstance(obj, float):
        return round(obj, 6)
    if isinstance(obj, dict):
        return {k: _canonical(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_canonical(v) for v in obj]
    return obj
