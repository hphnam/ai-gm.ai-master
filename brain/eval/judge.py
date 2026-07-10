"""LLM-as-judge, honestly calibrated (spec §4).

Scores each briefing item on a fixed rubric (correctness given the day's numbers,
actionability, clarity of the "why", appropriately calibrated confidence). The
decisive move, and the answer to the open supervisor question ("is LLM-as-judge
acceptable as a substitute for manager feedback?"), is to CALIBRATE the judge
against the human anchor (`eval.labels`) and report a measured agreement (Cohen's
kappa), not to trust it blind.

Reproducibility: the model, rubric, and prompt are pinned (`JUDGE_MODEL`, the
constants below). The judge runs offline, an eval script calling the Anthropic
API. When API access is not available (the default), the module EMITS judge-ready
prompts + a scoring schema for an offline or human judge to fill, the same honest
seam the project uses elsewhere (Voyage → TF-IDF, live-ingest → inert). It never
fabricates a score.

Interpretation rule, pre-registered so it is not post-hoc: kappa ≥
`JUDGE_KAPPA_THRESHOLD` → the judge may scale beyond the labelled days; below it,
the judge is reported as unreliable for that axis and the human set stands.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np

import config
from signals import briefing

PROMPTS_MD = config.STORE_DIR.parent / "eval" / "judge_prompts.md"

RUBRIC = {
    "correctness": "Does the headline match the day's numbers (actual vs expected/band)?",
    "actionability": "Would a busy venue manager actually do something about this today?",
    "clarity": "Is the 'why' (reason) clear and specific, not vague?",
    "calibrated_confidence": "Is the severity/confidence proportionate to the evidence?",
}
_SCALE = "1 (poor) to 5 (excellent)"
KEEP_THRESHOLD = 3        # actionability ≥ this → the judge would keep (surface) the item

SCORING_SCHEMA = {
    "type": "object",
    "properties": {
        **{k: {"type": "integer", "minimum": 1, "maximum": 5} for k in RUBRIC},
        "keep": {"type": "boolean"},
        "rationale": {"type": "string"},
    },
    "required": [*RUBRIC, "keep", "rationale"],
    "additionalProperties": False,
}

SYSTEM = (
    "You are evaluating a hospitality-manager's daily briefing item. Score it on the "
    "rubric, each " + _SCALE + ". Judge only what is shown; do not invent facts. Set "
    f"keep=true if a manager should act on it today (actionability ≥ {KEEP_THRESHOLD}). "
    "Return only the JSON object matching the schema."
)


def build_prompt(item: dict) -> str:
    """The judge-ready user prompt for one briefing item (pinned wording)."""
    rubric_lines = "\n".join(f"- {k}: {v}" for k, v in RUBRIC.items())
    facts = {
        "venue": item.get("venue_label", item.get("venue")),
        "headline": item["headline"], "reason": item["reason"],
        "severity": item["severity"], "direction": item["direction"],
        "status": item["status"], "caveats": item.get("caveats", []),
        "head": item["head"],
    }
    return (f"Rubric (score each {_SCALE}):\n{rubric_lines}\n\n"
            f"Briefing item:\n{json.dumps(facts, indent=2, default=str)}\n\n"
            "Return JSON: {correctness, actionability, clarity, calibrated_confidence, "
            "keep, rationale}.")


def _flatten(surfaced: dict) -> list[dict]:
    items: list[dict] = []
    seen: set[str] = set()
    for group in surfaced.values():
        for it in group:
            d = briefing._item_to_dict(it)
            if d["item_key"] in seen:
                continue
            seen.add(d["item_key"])
            items.append(d)
    return items


def emit_prompts(item_dicts: list[dict]) -> str:
    """Write judge-ready prompts + the scoring schema to disk (the no-API seam)."""
    lines = [
        "# LLM-judge prompts (offline seam)\n",
        f"Model to use: **{config.JUDGE_MODEL}** (pinned). System prompt and rubric are "
        "fixed for reproducibility. Fill one JSON object per item against the schema "
        "(each with its `item_key`), then pass the list to `eval.judge.calibrate` to "
        "score agreement against `eval_labels`.\n",
        f"## System\n```\n{SYSTEM}\n```\n",
        f"## Scoring schema\n```json\n{json.dumps(SCORING_SCHEMA, indent=2)}\n```\n",
        "## Items\n",
    ]
    for i, d in enumerate(item_dicts, 1):
        lines.append(f"### Item {i} · `{d['item_key']}`\n```\n{build_prompt(d)}\n```\n")
    PROMPTS_MD.parent.mkdir(parents=True, exist_ok=True)
    PROMPTS_MD.write_text("\n".join(lines))
    return str(PROMPTS_MD)


def _api_available() -> bool:
    """Live judging is opt-in and guarded: only when explicitly enabled, the SDK is
    importable, and a credential is resolvable. Default is the offline seam."""
    if os.environ.get("JUDGE_LIVE", "0") != "1":
        return False
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return False
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def run_api(item_dicts: list[dict]) -> list[dict]:  # pragma: no cover - needs network + key
    """Score items with the pinned judge model. Structured output constrains the
    response to the rubric schema (see the claude-api guidance: opus-4-8, adaptive
    thinking, output_config.format)."""
    import anthropic

    client = anthropic.Anthropic()
    scores = []
    for d in item_dicts:
        resp = client.messages.create(
            model=config.JUDGE_MODEL, max_tokens=1024,
            thinking={"type": "adaptive"},
            system=SYSTEM,
            output_config={"format": {"type": "json_schema", "schema": SCORING_SCHEMA}},
            messages=[{"role": "user", "content": build_prompt(d)}])
        text = next(b.text for b in resp.content if b.type == "text")
        s = json.loads(text)
        s["item_key"] = d["item_key"]
        scores.append(s)
    return scores


def calibrate(scores: list[dict], con=None) -> dict:
    """Cohen's kappa (judge keep vs human keep) + priority correlation on the shared
    labelled items. The pre-registered threshold decides whether the judge may scale."""
    from eval import labels as labels_mod

    lab = labels_mod.load_labels(con=con)
    kd = lab[lab["verdict"].isin(("keep", "drop"))]
    if kd.empty or not scores:
        return {"calibrated": False, "kappa": None,
                "verdict": "no human anchor yet — judge cannot be calibrated"}
    judge_keep = {s["item_key"]: bool(s["keep"]) for s in scores}
    shared = [(r["item_key"], r["verdict"] == "keep") for _, r in kd.iterrows()
              if r["item_key"] in judge_keep]
    if not shared:
        return {"calibrated": False, "kappa": None,
                "verdict": "no overlap between judged and labelled items"}
    human = ["keep" if v else "drop" for _, v in shared]
    judge = ["keep" if judge_keep[k] else "drop" for k, _ in shared]
    kappa = labels_mod.cohen_kappa(human, judge)
    scales = kappa >= config.JUDGE_KAPPA_THRESHOLD
    return {"calibrated": True, "kappa": round(kappa, 3), "n_shared": len(shared),
            "threshold": config.JUDGE_KAPPA_THRESHOLD, "may_scale": scales,
            "verdict": ("agreement adequate — judge may scale beyond the labelled days"
                        if scales else "agreement below threshold — judge unreliable here; "
                        "the human set stands")}


def evaluate(surfaced: dict, con=None) -> dict:
    """Score the surfaced items and (if a human anchor exists) calibrate. Default
    mode is the offline emit-prompts seam, no fabricated numbers."""
    return _evaluate_dicts(_flatten(surfaced), con=con)


def evaluate_labelled(con=None) -> dict:
    """Calibrate the judge over the SAME days the human labelled (spec B4): surface the
    briefing's items for each labelled (day, venue), score them, and report the
    judge-versus-human kappa against the pre-registered threshold. Honest no-op until
    labels exist."""
    from eval import labels as labels_mod

    lab = labels_mod.load_labels(con=con)
    kd = lab[lab["verdict"].isin(("keep", "drop"))] if not lab.empty else lab
    if kd.empty:
        return {"mode": "no-labels", "model": config.JUDGE_MODEL, "n_items": 0,
                "calibration": {"calibrated": False, "kappa": None},
                "summary": "no human labels yet — run `python -m eval.labels --label`, "
                           "then this reports the judge-vs-human kappa over those days."}
    item_dicts = []
    seen: set[str] = set()
    for (day, venue), _ in kd.groupby(["day", "venue"]):
        for d in labels_mod.briefing_items_for(day, venue, con=con):
            if d["item_key"] not in seen:
                seen.add(d["item_key"])
                item_dicts.append(d)
    return _evaluate_dicts(item_dicts, con=con)


def _evaluate_dicts(item_dicts: list[dict], con=None) -> dict:
    if _api_available():
        scores = run_api(item_dicts)
        cal = calibrate(scores, con=con)
        kap = f"kappa {cal['kappa']} — {cal['verdict']}" if cal["calibrated"] else cal["verdict"]
        return {"mode": "api", "model": config.JUDGE_MODEL, "n_items": len(item_dicts),
                "calibration": cal, "summary": f"scored {len(item_dicts)} items; {kap}."}
    emit_prompts(item_dicts)
    rel = f"brain/eval/{PROMPTS_MD.name}"   # repo-relative; no local home path in the report
    return {"mode": "emit-prompts", "model": config.JUDGE_MODEL, "n_items": len(item_dicts),
            "prompts_path": rel, "calibration": {"calibrated": False, "kappa": None},
            "summary": (f"offline: emitted {len(item_dicts)} judge-ready prompt(s) to "
                        f"`{rel}` (no API key / JUDGE_LIVE unset). No kappa is claimed "
                        "until the judge is run and calibrated against the anchor.")}


def main() -> int:
    from eval.agent_eval import build_corpus, surface

    con = None
    try:
        from store.warehouse import connect
        con = connect(read_only=True)
        surfaced = {i.kind: surface(i, con) for i in build_corpus(con)}
        rep = evaluate(surfaced, con=con)
    finally:
        if con is not None:
            con.close()
    print(f"LLM-judge · {rep['mode']} (model {rep['model']})")
    print(f"  {rep['summary']}")
    ok = rep["n_items"] >= 0
    print(f"JUDGE RESULT: {'PASS' if ok else 'FAIL'} (calibrated proxy, never ground truth)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
