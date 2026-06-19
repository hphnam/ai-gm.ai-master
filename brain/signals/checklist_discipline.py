"""A9 · Checklist completion-discipline baseline (methodology §4.2 / step 8).

Parses the opening (27) / closing (32) templates into an expected step-set with
**criticality weights** and **conditional-step exclusions**, encodes the
**Sunday-only** close #31 rule, and scores a completion log for deviations:
missed mandatory step, skipped/unsigned checklist, abnormally late completion.

Runs in **template-only mode** against a synthetic completion log until Ryan
exports the real `ChecklistStepCompletion` rows (standing dependency — see
FLAGS.md). Swapping in the real log means replacing `synthetic_log()`.

Run:
    python -m signals.checklist_discipline
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass

from config import checklist_md, STORE_DIR

RESULTS_MD = STORE_DIR.parent / "signals" / "checklist_discipline.md"

# Criticality weights — high-consequence steps must outweigh "refill straws".
W_CRITICAL, W_HIGH, W_NORMAL, W_CONDITIONAL = 5, 3, 1, 0

_CONDITIONAL_RE = re.compile(
    r"\b(if required|if needed|if low|where needed|as much as possible)\b", re.I)
_STEP_RE = re.compile(r"^\s*(\d+)\.\s+(.*\S)\s*$")


@dataclass(frozen=True)
class Step:
    number: int
    text: str
    weight: int
    sunday_only: bool
    is_signoff: bool

    @property
    def mandatory(self) -> bool:
        return self.weight > 0


def _classify_weight(text: str) -> int:
    low = text.lower()
    if _CONDITIONAL_RE.search(low):
        return W_CONDITIONAL
    if "cash up" in low or "take cash" in low or "safe" in low or "gas" in low \
            or ("lock" in low and ("office" in low or "door" in low)):
        return W_CRITICAL
    if "float" in low or "cellar" in low or "ullage" in low or "wastage" in low:
        return W_HIGH
    return W_NORMAL


def parse_checklists(path=None) -> dict[str, list[Step]]:
    text = (path or checklist_md()).read_text() if path else checklist_md().read_text()
    checklists: dict[str, list[Step]] = {}
    current = None
    for line in text.splitlines():
        upper = line.upper()
        if "OPENING CHECKLIST" in upper:
            current = "opening"; checklists[current] = []
            continue
        if "CLOSING CHECKLIST" in upper:
            current = "closing"; checklists[current] = []
            continue
        m = _STEP_RE.match(line)
        if not m or current is None:
            continue
        num, body = int(m.group(1)), m.group(2)
        sunday_only = "sunday only" in body.lower()
        is_signoff = "initial" in body.lower() and "complet" in body.lower()
        weight = _classify_weight(body)
        # The sign-off step is mandatory (normal weight) even if otherwise plain.
        if is_signoff and weight == W_CONDITIONAL:
            weight = W_NORMAL
        checklists[current].append(Step(num, body, weight, sunday_only, is_signoff))
    return checklists


# --- Scoring -----------------------------------------------------------------

def expected_mandatory(steps: list[Step], is_sunday: bool) -> list[Step]:
    return [s for s in steps
            if s.mandatory and (not s.sunday_only or is_sunday)]


def evaluate(
    steps: list[Step], completed: set[int], dow: int,
    *, completion_minutes: int | None = None, expected_max_minutes: int = 90,
) -> dict:
    """Score one completion against the template. dow: Mon=0 … Sun=6."""
    is_sunday = dow == 6
    expected = expected_mandatory(steps, is_sunday)
    missed = [s for s in expected if s.number not in completed]
    weighted = sum(s.weight for s in missed)
    critical_missed = [s.number for s in missed if s.weight >= W_CRITICAL]

    signoff = next((s for s in steps if s.is_signoff), None)
    unsigned = bool(signoff and signoff.number not in completed)
    skipped = len(completed) == 0 or len(completed) < 0.2 * max(len(expected), 1)
    late = completion_minutes is not None and completion_minutes > expected_max_minutes

    if skipped:
        severity = "critical"
    elif critical_missed:
        severity = "high"
    elif weighted >= W_HIGH:
        severity = "medium"
    elif weighted > 0 or unsigned or late:
        severity = "low"
    else:
        severity = "ok"

    return {
        "dow": dow, "is_sunday": is_sunday,
        "n_expected": len(expected),
        "missed": [(s.number, s.text[:48], s.weight) for s in missed],
        "weighted_score": weighted,
        "critical_missed": critical_missed,
        "unsigned": unsigned, "skipped": skipped, "late": late,
        "severity": severity,
    }


# --- Synthetic completion log (template-only mode) ---------------------------

def synthetic_log(checklists: dict[str, list[Step]]) -> list[dict]:
    """A small hand-built completion log to exercise the detector now. Each
    scenario names the checklist, the day, the completed step numbers, and an
    optional completion time. Replace with real ChecklistStepCompletion rows."""
    op = checklists["opening"]
    cl = checklists["closing"]
    op_mand_mon = {s.number for s in expected_mandatory(op, is_sunday=False)}
    cl_mand_wed = {s.number for s in expected_mandatory(cl, is_sunday=False)}
    cl_mand_sun = {s.number for s in expected_mandatory(cl, is_sunday=True)}

    return [
        # 1) Clean open: all mandatory done, all conditionals skipped.
        {"name": "Mon open — all mandatory, conditionals skipped",
         "checklist": "opening", "dow": 0, "completed": set(op_mand_mon),
         "minutes": 45},
        # 2) Close missing the gas-off (critical).
        {"name": "Wed close — gas-off missed",
         "checklist": "closing", "dow": 2,
         "completed": cl_mand_wed - {8}, "minutes": 70},
        # 3) Non-Sunday close without step 31 — must NOT flag (Sunday rule).
        {"name": "Thu close — chairs-up (#31) absent on a weekday",
         "checklist": "closing", "dow": 3, "completed": set(cl_mand_wed),
         "minutes": 80},
        # 4) Sunday close without step 31 — must flag.
        {"name": "Sun close — chairs-up (#31) missed on Sunday",
         "checklist": "closing", "dow": 6, "completed": cl_mand_sun - {31},
         "minutes": 85},
        # 5) Skipped checklist (barely touched) + late.
        {"name": "Fri close — skipped / abandoned",
         "checklist": "closing", "dow": 4, "completed": {1, 2}, "minutes": 140},
    ]


def run() -> list[dict]:
    checklists = parse_checklists()
    out = []
    for scn in synthetic_log(checklists):
        steps = checklists[scn["checklist"]]
        res = evaluate(steps, scn["completed"], scn["dow"],
                       completion_minutes=scn.get("minutes"))
        out.append({"scenario": scn["name"], "checklist": scn["checklist"], **res})
    return out


def _write_report(checklists, results) -> None:
    op, cl = checklists["opening"], checklists["closing"]
    lines = [
        "# A9 · Checklist completion-discipline (template-only mode)\n",
        f"Parsed: opening {len(op)} steps, closing {len(cl)} steps. "
        "Mode: **template-only** against a synthetic completion log — replace "
        "`synthetic_log()` with `ChecklistStepCompletion` rows when exported "
        "(standing dependency on Ryan).\n",
        "## Criticality weighting",
        "| Weight | Meaning | Example steps |",
        "|---|---|---|",
        f"| {W_CRITICAL} | critical | close cash-up/safe (#1–2), gas off (#8), "
        "lock-up (#30) |",
        f"| {W_HIGH} | high | open float (#7–8), cellar (#4), close ullage (#3) |",
        f"| {W_NORMAL} | normal | most steps + the sign-off |",
        f"| {W_CONDITIONAL} | conditional (never a miss) | heating/soap/straws/"
        "fridge \"if needed\" |\n",
        "## Detected deviations (synthetic log)",
        "| Scenario | Severity | Weighted | Critical missed | Skipped | Unsigned | Late |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in results:
        lines.append(
            f"| {r['scenario']} | **{r['severity']}** | {r['weighted_score']} | "
            f"{r['critical_missed'] or '–'} | {r['skipped']} | {r['unsigned']} | "
            f"{r['late']} |")
    lines.append("\nConditional steps never raise a miss; the Sunday-only close "
                 "#31 is expected only on Sundays — mirroring the sales model's "
                 "day-of-week structure.")
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    print("A9 · checklist completion-discipline (template-only mode)")
    checklists = parse_checklists()
    op, cl = checklists["opening"], checklists["closing"]
    print(f"  parsed            : opening {len(op)} steps, closing {len(cl)} steps")
    n_cond = sum(1 for s in op + cl if not s.mandatory)
    n_crit = sum(1 for s in op + cl if s.weight >= W_CRITICAL)
    print(f"  conditional steps : {n_cond} (excluded from miss-scoring)")
    print(f"  critical steps    : {n_crit}")

    results = run()
    for r in results:
        print(f"  [{r['severity']:8s}] {r['scenario']}")
        if r["missed"]:
            print(f"      missed: {[m[0] for m in r['missed']]} "
                  f"(weighted {r['weighted_score']})")

    _write_report(checklists, results)
    print(f"  report            : {RESULTS_MD}")

    # Gate checks.
    clean = next(r for r in results if r["scenario"].startswith("Mon open"))
    weekday31 = next(r for r in results if "weekday" in r["scenario"])
    sunday31 = next(r for r in results if "on Sunday" in r["scenario"])
    gas = next(r for r in results if "gas-off" in r["scenario"])

    conditionals_never_raise = clean["severity"] == "ok" and not clean["missed"]
    sunday_rule = (31 not in [m[0] for m in weekday31["missed"]]
                   and 31 in [m[0] for m in sunday31["missed"]])
    weighted_detector = gas["weighted_score"] >= W_CRITICAL and 8 in gas["critical_missed"]

    print(f"  conditionals never raise: {conditionals_never_raise}")
    print(f"  Sunday-only rule correct: {sunday_rule}")
    print(f"  weighted miss detector  : {weighted_detector}")
    ok = conditionals_never_raise and sunday_rule and weighted_detector
    print(f"A9 RESULT: {'PASS' if ok else 'FAIL'} "
          f"(weighted detector + conditionals never raise + Sunday rule)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
