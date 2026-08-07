#!/usr/bin/env python3
"""Per-section word count for a PRJ93 chapter, emitted as a paste-ready markdown table.

    python3 brain/scripts/wordcount.py <file.tex> [chapter-key]

Budgets come from `brain/knowledge/05_paper_architecture.md` §2.1, which is approved
(A2/A10) and fixed. Chapter keys: intro, background, methods, results, discussion,
conclusions. Omit the key to count without a budget column.

VERIFIED 2026-08-07 against a hand-counted fixture, cell by cell rather than total against
total: escaped percents, a whole-line comment, a trailing comment, inline maths, a citation,
a displayed equation and a short-form caption. Five independently derived cells, all exact.
(The earlier "calibrated to 0.14 %" note is withdrawn — it compared one aggregate to one
aggregate, which cannot detect a defect that moves both the same way, and that is exactly how
the `%.*` defect survived.)

TWO KNOWN OVER-READS, both against a marker rather than against arithmetic. A displayed
`equation` environment contributes ~6 words of pure scaffolding (the literal word "equation"
twice, plus the label), and every `\\label{...}` contributes 1. Equation- and
subsection-dense chapters therefore read high: Methods carries 75 counted words inside its six
equation environments and 23 label words. Subtract them before quoting a marker-equivalent
figure; do NOT subtract them when comparing two revisions measured by this same tool.

WHY THIS EXISTS: a per-section figure was transcribed wrongly into a hand-off twice, while
the total was right both times. The table is emitted in final form so there is nothing left
to transcribe.
"""

import re
import sys

# brain/knowledge/05_paper_architecture.md §2.1. Section titles are the approved headings,
# so a mismatch here means the .tex heading diverged from the tree — which is a finding.
BUDGETS = {
    "intro": (1_400, [
        ("Operational forecasting in small hospitality estates", 300),
        ("Problem statement and knowledge gap", 300),
        ("Aims and research questions", 350),
        ("Contributions", 250),
        ("Structure of the dissertation", 200),
    ]),
    "background": (4_000, [
        ("Decision support and delegated autonomy", 260),
        ("Demand forecasting on short hospitality series", 220),
        ("Cross-series pooling and exogenous covariates", 700),
        ("Intermittent demand", 280),
        ("Conformal prediction intervals", 340),
        ("Error measures and model comparison", 480),
        ("Deviation detection from calibrated intervals", 370),
        ("Proactive agents and intervention policy", 400),
        ("Evaluation of agent interventions", 400),
        ("Synthesis and research gap", 550),
    ]),
    "methods": (4_200, [
        ("Study design and data sources", 320),
        ("Accuracy measures and the denominator basis", 640),
        ("Demand-pattern classification", 390),
        ("Exogenous covariates and availability lead", 380),
        ("Candidate models and the adoption gate", 380),
        ("Model comparison procedure", 390),
        ("Conformal interval construction", 440),
        ("Deviation detection", 340),
        ("Occurrence modelling", 250),
        ("Detection evaluation protocol", 260),
        ("Knowledge-gap signal", 170),
        ("Intervention layer and scoring apparatus", 200),
    ]),
    "results": (5_200, [
        ("Forecast accuracy and model selection", 1_400),
        ("Demand structure and hierarchical reconciliation", 900),
        ("Exogenous covariates and cross-series information", 700),
        ("Interval calibration and coverage", 1_400),
        ("Deviation detection and downstream signals", 800),
    ]),
    "discussion": (2_400, [
        ("Answers to the research questions", 500),
        ("Divergences from the reviewed literature", 500),
        ("Validity of the approach", 400),
        ("Limitations and threats to validity", 700),
        ("Divergence from the project specification", 300),
    ]),
    "conclusions": (1_100, [
        ("Objectives revisited", 400),
        ("Contributions", 250),
        ("Further work", 400),
        ("Closing", 50),
    ]),
}

FLOAT_RE = re.compile(
    r"\\begin\{figure\*?\}.*?\\end\{figure\*?\}|\\begin\{table\*?\}.*?\\end\{table\*?\}",
    re.S,
)
CAPTION_RE = re.compile(r"\\caption(?:\[[^\]]*\])?\{(.*?)\}\s*(?:\\label|\Z)", re.S)
DISPLAY_MATH_RE = re.compile(
    r"\\begin\{(equation|align|gather|multline)\*?\}.*?\\end\{\1\*?\}", re.S
)
LABEL_RE = re.compile(r"\\label\{[^}]*\}")


def count(s):
    """Words as a marker counts them: math is one token, citation keys are not prose."""
    s = re.sub(r"(?<!\\)%.*", "", s)
    s = re.sub(r"\$[^$]*\$", "MATHTOKEN", s)
    s = re.sub(r"\\cite[a-zA-Z]*(\[[^\]]*\])?\{[^}]*\}", " ", s)
    s = re.sub(r"\\[a-zA-Z]+\*?", " ", s)
    s = re.sub(r"[{}\\~]", " ", s)
    return len([w for w in s.split() if re.search(r"[A-Za-z0-9]", w)])


def artefact(s):
    """Words `count` charges to prose that a marker would not.

    Two mechanisms, both systematic and both scaling with the chapter:
      - a displayed math environment leaves the literal token of its own name twice
        plus its label, and its mathematics is a display rather than prose;
      - every \\label{...} leaves its own key as a word.
    Subtract for a marker-equivalent figure. Do NOT subtract when comparing two
    revisions measured by this same tool, where the artefact cancels.
    """
    display = sum(count(m.group(0)) for m in DISPLAY_MATH_RE.finditer(s))
    # Labels inside a display are already charged above; strip before counting the rest.
    rest = DISPLAY_MATH_RE.sub("", s)
    return display + sum(count(m.group(0)) for m in LABEL_RE.finditer(rest))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    key = sys.argv[2].lower() if len(sys.argv) > 2 else None
    if key and key not in BUDGETS:
        sys.exit(f"unknown chapter key {key!r}; expected one of {', '.join(BUDGETS)}")

    text = open(path).read()
    floats = FLOAT_RE.findall(text)
    body = FLOAT_RE.sub("", text)

    parts = re.split(r"\\section\*?\{", body)
    preamble = (count(parts[0]), artefact(parts[0]))
    sections = []
    for p in parts[1:]:
        name = p.split("}")[0]
        sections.append((name, count(p) - count(name), artefact(p)))

    budgeted = dict(BUDGETS[key][1]) if key else {}
    total_budget = BUDGETS[key][0] if key else None

    print(f"| Section | {'Budget | ' if key else ''}Raw | Artefact | Marker |")
    print(f"|---|{'---|' if key else ''}---|---|---|")
    if preamble[0]:
        pad = "— | " if key else ""
        print(
            f"| *(opener, before first heading)* | {pad}{preamble[0]} | "
            f"{preamble[1]} | {preamble[0] - preamble[1]} |"
        )
    raw_total, art_total = preamble
    for name, n, a in sections:
        raw_total += n
        art_total += a
        b = f"{budgeted.get(name)} | " if key else ""
        if key and budgeted.get(name) is None:
            b = "**not in tree** | "
        print(f"| {name} | {b}{n} | {a} | {n - a} |")
    marker_total = raw_total - art_total
    if key:
        delta = marker_total - total_budget
        sign = f"+{delta}" if delta > 0 else str(delta)
        pct = f" ({delta / total_budget:+.0%})" if total_budget else ""
        print(
            f"| **Body total** | **{total_budget:,}** | **{raw_total:,}** | "
            f"**{art_total}** | **{marker_total:,}** |"
        )
        print(f"\n**Δ {sign}{pct} against budget, on the marker-equivalent count.**")
        print(
            f"Artefact is {art_total} words of displayed math and label keys that this "
            "counter charges to prose and a marker does not. Compare two revisions on "
            "**Raw**, where it cancels; quote **Marker** against a budget."
        )
    else:
        print(
            f"| **Body total** | **{raw_total:,}** | **{art_total}** | "
            f"**{marker_total:,}** |"
        )

    caption_words = 0
    for f in floats:
        m = CAPTION_RE.search(f)
        if m:
            caption_words += count(m.group(1))
    if floats:
        print(
            f"\nFloats: {len(floats)}, caption words {caption_words} "
            f"(charged to the 1,200 all-chapter caption line, not to the body)."
        )

    # A heading in the .tex that is not in the approved tree is a divergence, not a typo.
    if key:
        stray = [n for n, _, _ in sections if n not in budgeted]
        missing = [n for n in budgeted if n not in {s for s, _, _ in sections}]
        for n in stray:
            print(f"\n⚠ heading not in §2.1 tree: {n!r}")
        for n in missing:
            print(f"\n⚠ §2.1 section absent from the file: {n!r}")


if __name__ == "__main__":
    main()
