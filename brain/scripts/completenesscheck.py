#!/usr/bin/env python3
r"""Static check: no \input in the document is unwritten, thin, or still template.

WHY THIS EXISTS. Every other instrument in this project checks a document's FORM.
``latexcheck.py`` proves it builds, ``wordcount.py`` proves it is the right length,
``figurecheck.py`` proves no title is painted into an image. On 2026-08-08 the issued
template abstract -- boilerplate with a bit.ly link in it -- was found live on
``origin/main``, having passed all three for the life of the project, because none of
them asks whether a section says anything. It was caught by a critique role that looked
outside its remit, which is not a mechanism. This is the mechanism.

    ./completenesscheck.py /path/to/prj93-overleaf/main.tex

and verify the instrument before trusting it:

    ./completenesscheck.py --self-test

which builds a small document tree carrying one of each violation plus a clean twin of
each, and asserts it flags the first and passes the second. PRJ93_RULES.md: an assertion
nobody has seen fail is an assertion taken on faith, and a guard that only ever fails has
not been distinguished from a working one.

FOUR ASSERTIONS, and they are separate because they fail separately:

  RESOLVE   every \input target from main.tex resolves to a file on disk, followed
            recursively. An \input naming nothing is not a compile error the log makes
            obvious -- TeX reports it and carries on.
  CONTENT   every resolved file carries prose above a floor, counted by wordcount.count.
            A file may opt out only by SAYING SO, with a `% CARRIER:` line (structure and
            floats only, no prose by design) or `% INTENTIONALLY EMPTY:` line. The reason
            is required. This converts a silent absence into a declared one.
  SECTION   every LEAF heading -- one with no deeper heading before the next same-or-
            shallower heading -- carries prose above a floor. Non-leaf headings are
            skipped: a \section whose body is entirely \subsections is structural, and
            requiring lead-in prose from it would be an editorial opinion, not a check.
            A file reproducing an external document verbatim may opt out of THIS floor
            only, with a `% REPRODUCED: <why>` line: its section lengths are the source's
            and padding them would destroy the reproduction. CONTENT still applies.
  TEMPLATE  no issued-template phrase survives in text that reaches the reader.

WHAT THIS CATCHES, and what it does not. It catches a file nobody wrote, a heading with
nothing under it, and template text left in place. It CANNOT catch prose that is present,
fluent and wrong, or prose that is present and says nothing -- word count is not meaning.
The critique roles in ``autoresearchclaw/SKILL.md`` remain the only instrument that reads
for content, and this check does not reduce their scope by one line. What it does is make
the specific failure it was built for -- a section that exists, compiles, and was never
written -- impossible to reach the PDF unnoticed.

TEMPLATE matching is deliberately scoped to NON-COMMENT text. A phrase quoted in a LaTeX
comment is documentation, not output; ``abstract.tex``'s header comment records the
placeholder it replaced, and flagging that would train the reader to ignore the tool.
The cost is real and stated: a phrase parked in a comment and later uncommented is not
caught until it is uncommented, which is exactly when it starts to matter.
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wordcount import count  # noqa: E402  one counter for the project, not a second one

# Floors. Both are "did anybody write this", not "is this long enough" -- a real but
# short section must pass. The abstract stub that prompted the tool carried 34 prose
# words, so a floor under that would not have caught the thing it was built for.
FILE_FLOOR = 40
SECTION_FLOOR = 40

# Seeded with the phrases ACTUALLY FOUND in this document, not with a generic list.
# Provenance for each is the third column; `git log -S` locates the ones now removed.
#
# A literal space in a source below compiles to `\s+`, and matching runs over the whole
# file rather than line by line. LaTeX prose wraps at whatever column the author was
# typing to, so a template phrase straddles a newline as often as not -- the self-test
# caught exactly that, with the regulations boilerplate broken across two lines.
_PHRASE_SOURCES = [
    ("bit.ly link", r"bit\.ly/",
     "issued abstract stub; removed by 732f3e3, kept as a regression guard"),
    ("regulations boilerplate", r"according to the regulations should not be any longer",
     "issued abstract stub, bold text"),
    ("regulations pointer", r"See point \d+ in appendix \d+ of the regulations",
     "issued abstract stub"),
    ("Some extra tables", r"Some extra tables",
     "appendix/introduction.tex, issued template"),
    ("that should go in the appendix", r"that should go in the appendix",
     "appendix/introduction.tex, issued template"),
    # The PhD word-limit entry is RETIRED, not forgotten: Phuong ruled on it 2026-08-08 and
    # declaration.tex now reads 20,000, the MSc figure. Left here as a comment so the next
    # reader does not re-raise a closed question.
    ("viva boilerplate", r"not required when submitting your thesis before your viva",
     "acknowledgements.tex, issued template"),
    ("addressed to the writer",
     r"you may want to|adapt this to suit your own|This is an example taken from",
     "template instructions to the author, several files"),
    ("dedication stub", r"I dedicate this thesis to someone",
     "main.tex, issued template"),
    ("lipsum filler", r"\\lipsum\b",
     "main.tex loads the package as an example; an actual call emits filler prose"),
]

TEMPLATE_PHRASES = [
    (name, re.compile(source.replace(" ", r"\s+"), re.I), why)
    for name, source, why in _PHRASE_SOURCES
]

CARRIER_RE = re.compile(r"^\s*%\s*CARRIER:\s*\S", re.M)
EMPTY_RE = re.compile(r"^\s*%\s*INTENTIONALLY EMPTY:\s*\S", re.M)
# A verbatim reproduction of an external document. Its section lengths belong to the
# SOURCE and are not this work's to lengthen: HC54's specification appendix carries a
# 29-word "Research Question" subsection because that is what the specification says,
# and padding it would destroy the property the criterion asks for. The SECTION floor is
# therefore lifted for such a file -- and only when it SAYS SO with a reason, which is the
# same declared-not-silent principle as CARRIER above. The CONTENT floor still applies,
# so a reproduction that reproduces nothing is still caught.
REPRODUCED_RE = re.compile(r"^\s*%\s*REPRODUCED:\s*\S", re.M)

# `(?<!\\)` keeps \% out of it. An \input inside a macro body carries `#1` and is a
# definition, not a target; main.tex:122 is exactly that.
INPUT_RE = re.compile(r"(?<!\\)(?:\\input|\\include)\s*\{([^}]*)\}")
HEADING_RE = re.compile(r"\\(chapter|section|subsection|subsubsection)\*?\s*\{")
LEVELS = {"chapter": 1, "section": 2, "subsection": 3, "subsubsection": 4}


def strip_comments(text: str) -> str:
    """Drop LaTeX comments, preserving line structure so line numbers survive."""
    return "\n".join(re.sub(r"(?<!\\)%.*", "", line) for line in text.splitlines())


def read_braced(text: str, open_index: int) -> tuple[str, int]:
    """Return the balanced-brace group starting at `open_index`, and the index after it."""
    depth, i = 0, open_index
    while i < len(text):
        if text[i] == "{" and (i == 0 or text[i - 1] != "\\"):
            depth += 1
        elif text[i] == "}" and text[i - 1] != "\\":
            depth -= 1
            if depth == 0:
                return text[open_index + 1:i], i + 1
        i += 1
    return text[open_index + 1:], len(text)


def resolve(target: str, root: Path) -> Path | None:
    """TeX appends .tex when the name has no extension; a .sum or .bib is taken as given."""
    candidate = root / target
    if candidate.suffix and candidate.exists():
        return candidate
    for path in (root / f"{target}.tex", candidate):
        if path.exists():
            return path
    return None


def collect_inputs(main: Path) -> tuple[list[Path], list[tuple[Path, int, str]]]:
    """Walk \\input from main.tex. Returns (resolved files, unresolved (src, line, target))."""
    root = main.parent
    seen: list[Path] = []
    unresolved: list[tuple[Path, int, str]] = []
    queue = [main]
    while queue:
        current = queue.pop(0)
        if current in seen:
            continue
        seen.append(current)
        if current.suffix not in ("", ".tex"):
            continue
        body = strip_comments(current.read_text(errors="replace"))
        for lineno, line in enumerate(body.splitlines(), start=1):
            for match in INPUT_RE.finditer(line):
                target = match.group(1).strip()
                if "#" in target:  # a macro definition, not a target
                    continue
                found = resolve(target, root)
                if found is None:
                    unresolved.append((current, lineno, target))
                else:
                    queue.append(found)
    return [p for p in seen if p != main and p.suffix in ("", ".tex")], unresolved


def expand_inputs(text: str, root: Path | None, depth: int = 4) -> str:
    """Inline every resolvable \\input, recursively, for counting purposes only.

    A section is a DOCUMENT-level construct, not a file-level one: ``main.tex`` issues
    ``\\chapter{Introduction}`` and the body arrives from ``\\input{chapters/introduction}``.
    Counted per file, every chapter heading in this document read as one word and eleven
    false findings came back on the first live run. Offsets from this expansion are never
    reported -- line numbers stay in the file that carries the heading.
    """
    if root is None or depth <= 0:
        return text

    def replace(match: re.Match[str]) -> str:
        target = match.group(1).strip()
        if "#" in target:
            return " "
        found = resolve(target, root)
        if found is None or found.suffix not in ("", ".tex"):
            return " "
        return expand_inputs(strip_comments(found.read_text(errors="replace")),
                             root, depth - 1)

    return INPUT_RE.sub(replace, text)


def leaf_sections(text: str, root: Path | None = None) -> list[tuple[int, str, str]]:
    """Return (line number, title, expanded body) for every LEAF heading in `text`."""
    heads = []
    for match in HEADING_RE.finditer(text):
        brace = text.index("{", match.end() - 1)
        title, after = read_braced(text, brace)
        heads.append({"level": LEVELS[match.group(1)], "title": title.strip(),
                      "start": match.start(), "body_from": after})
    out = []
    for i, head in enumerate(heads):
        nxt = heads[i + 1] if i + 1 < len(heads) else None
        end = nxt["start"] if nxt else len(text)
        body = expand_inputs(text[head["body_from"]:end], root)
        # Leaf-ness has two sources and needs both. `nxt` is the deeper heading that sits
        # in THIS file, immediately after -- excluded from `body` by construction, so a
        # body-only test never sees it. The scan of `body` is for the other case, a
        # chapter whose subsections arrive through an \input.
        deeper_next = nxt is not None and nxt["level"] > head["level"]
        deeper_inside = any(LEVELS[m.group(1)] > head["level"]
                            for m in HEADING_RE.finditer(body))
        if deeper_next or deeper_inside:
            continue
        out.append((text.count("\n", 0, head["start"]) + 1, head["title"], body))
    return out


def scan_file(path: Path, file_floor: int, section_floor: int,
              root: Path | None = None) -> list[tuple[int, str, str]]:
    """Return (line, code, detail) findings for one file."""
    raw = path.read_text(errors="replace")
    body = strip_comments(raw)
    findings: list[tuple[int, str, str]] = []

    declared_carrier = bool(CARRIER_RE.search(raw))
    declared_empty = bool(EMPTY_RE.search(raw))
    # Counted through \input, so a file that delivers its body from elsewhere passes.
    # THE TRADE-OFF, stated because it is a real hole: a parent that says nothing of its
    # own is covered by its child's words. CONTENT therefore answers "does this \input
    # deliver anything", not "did someone write prose in this file" -- the second question
    # belongs to SECTION, which cannot be satisfied by a child's words in the same way.
    words = count(expand_inputs(body, root))

    if declared_empty:
        pass  # the author has claimed the emptiness in writing; that is the whole ask
    elif words < file_floor and not declared_carrier:
        findings.append((1, "CONTENT",
                         f"{words} prose words, floor {file_floor}; declare "
                         "'% CARRIER: <why>' or '% INTENTIONALLY EMPTY: <why>' if deliberate"))

    if not declared_empty and not REPRODUCED_RE.search(raw):
        for line, title, section_body in leaf_sections(body, root):
            got = count(section_body)
            if got < section_floor:
                findings.append((line, "SECTION",
                                 f"'{title}' carries {got} prose words, floor {section_floor}"))

    for name, pattern, why in TEMPLATE_PHRASES:
        for match in pattern.finditer(body):
            findings.append((body.count("\n", 0, match.start()) + 1,
                             "TEMPLATE", f"{name} -- {why}"))

    return findings


# --------------------------------------------------------------------------- self-test

FIXTURE_MAIN = r"""
\documentclass{report}
\newcommand{\wc}[1]{\input{#1-words.sum}}   % a definition, not a target
\begin{document}
\input{written}
\input{unwritten}
\input{stilltemplate}
\input{declared_carrier}
\input{declared_empty}
\input{nosuchfile}
% \input{commented_out}
\end{document}
"""

FIXTURE_WRITTEN = r"""
\section*{A section that was actually written}
The confidence set over 273 origins retains five of the nine approaches that scored, so
the served model is not distinguishable from the simpler incumbents it was meant to beat.
That is a finding about the corpus rather than about the model, and it is the reason the
adoption gate is reported at all. The same comparison at 205 origins reverses the
selection, which is the strongest single caution this chapter carries about its own
conclusions and about anything read off a single evaluation window here.
"""

FIXTURE_UNWRITTEN = r"""
\section{Additional Tables}
A heading, a cross-reference and nothing else.
"""

FIXTURE_TEMPLATE = r"""
\section*{Abstract}
\textbf{This is the beginning of the abstract that according to the regulations should not
be any longer than 300 words. See point 9 in appendix 2 of the regulations
\url{https://bit.ly/2Q4H43I}.} Padding follows so the floors are not what fires here, and
only the template assertion is under test: the venue frames run 399, 386 and 331 days at
weekly trading rates of 5.3, 1.2 and 5.9 days, which is enough prose to clear both floors
comfortably and leave the template phrases as the sole cause of any finding reported.
"""

FIXTURE_CARRIER = r"""
% CARRIER: float placement only; Appendix E's prose is composed by 8C-7.
\label{app:tables}
\input{tables/ladder}
"""

FIXTURE_EMPTY = r"""
% INTENTIONALLY EMPTY: no publications arise from this dissertation.
"""

# A chapter heading whose body arrives through \input, in both states. This is the pair
# that caught the file-local first draft: counted per file, BOTH of these read as a
# one-word chapter, and the real document produced eleven such false findings.
FIXTURE_CROSSFILE_OK = "\\chapter{Results}\n\\input{written}\n"
FIXTURE_CROSSFILE_EMPTY = "\\chapter{Introduction}\n\\input{allcomments}\n"
FIXTURE_ALL_COMMENTS = "% \\section{Section Name}\n% Start of your introduction here.\n"

# A \section carrying only a \label before its first \subsection. This is how every
# section in Chapter 4 is written, and a leaf test that looked only INSIDE the body --
# which by construction stops at that subsection -- reported five of them as empty.
FIXTURE_SECTION_THEN_SUB = r"""
\section{Forecast accuracy and model selection}
\label{sec:res-accuracy}

\subsection{Ladder results at the committed gate}
The adoption gate scored nine entrants at each venue over six rolling origins at a
seven-day horizon, on the calendar denominator that predates the ruler migration, so one
venue's figure is scaled on a basis the methodology now rules out and is reported here
only as the gate's own record rather than as a current measurement of anything.
"""

FIXTURE_COMMENT_ONLY_TEMPLATE = r"""
% This file's header records that it replaced the issued template placeholder, which
% carried a bit.ly link and said the abstract should not be any longer than 300 words.
\section*{Abstract}
The evidence separates less than assumed, and the calibration audit is the strongest
result in the study: the interval under-covers at one venue and the exchangeability
violation responsible reproduces the measured coverage to a thousandth at all three of
them, which is the one place where a mechanism and a measurement agree this closely.
"""


# A verbatim reproduction: a short leaf section is the SOURCE's length, not a gap in this
# work's prose, but only because the file says so. The undeclared twin below is the same
# text with the declaration removed, and it must still fire -- otherwise the exemption is
# a hole rather than a declaration.
FIXTURE_REPRODUCED = r"""
% REPRODUCED: the Week 1 project specification, verbatim for HC54.
\section{Project Background and Motivation}
The company frames the product as a role rather than a tool, reads every standard operating
procedure, runs the opening and closing checklists, monitors stock, drafts supplier purchase
orders and answers staff questions throughout each shift across four venues, with external
operators onboarding next and a proactive layer still to be built on top of all of it.

\subsection{Research Question}
How can an agent given a venue's operational data and tools learn that venue's rhythm?
"""

FIXTURE_REPRODUCED_UNDECLARED = FIXTURE_REPRODUCED.replace(
    "% REPRODUCED: the Week 1 project specification, verbatim for HC54.\n", "")


def self_test() -> int:
    """Both directions on all four assertions. Expected counts derived by hand first."""
    tmp = Path(tempfile.mkdtemp(prefix="completenesscheck-fixture-"))
    (tmp / "tables").mkdir()
    (tmp / "tables" / "ladder.tex").write_text("% CARRIER: a table body.\n\\begin{tabular}{ll}a&b\\end{tabular}\n")
    files = {
        "main.tex": FIXTURE_MAIN,
        "written.tex": FIXTURE_WRITTEN,
        "unwritten.tex": FIXTURE_UNWRITTEN,
        "stilltemplate.tex": FIXTURE_TEMPLATE,
        "declared_carrier.tex": FIXTURE_CARRIER,
        "declared_empty.tex": FIXTURE_EMPTY,
        "commentonly.tex": FIXTURE_COMMENT_ONLY_TEMPLATE,
        "crossfile_ok.tex": FIXTURE_CROSSFILE_OK,
        "crossfile_empty.tex": FIXTURE_CROSSFILE_EMPTY,
        "allcomments.tex": FIXTURE_ALL_COMMENTS,
        "section_then_sub.tex": FIXTURE_SECTION_THEN_SUB,
        "undeclared_carrier.tex": "\\label{app:search}\n\\input{written}\n",
        "reproduced.tex": FIXTURE_REPRODUCED,
        "reproduced_undeclared.tex": FIXTURE_REPRODUCED_UNDECLARED,
    }
    for name, text in files.items():
        (tmp / name).write_text(text)

    rows, failures = [], []

    def check(name: str, got: int, want: int) -> None:
        ok = got == want
        if not ok:
            failures.append(f"{name}: expected {want}, got {got}")
        rows.append(f"  {name:<34} expected {want}  got {got}  {'PASS' if ok else 'FAIL'}")

    resolved, unresolved = collect_inputs(tmp / "main.tex")
    # RESOLVE: `nosuchfile` only. The commented \input and the `#1` macro must not count.
    check("RESOLVE dirty (1 missing)", len(unresolved), 1)
    # Six: the five \input targets that exist, plus tables/ladder reached recursively
    # THROUGH declared_carrier. The first hand-derived expectation here was 5 and the
    # self-test caught it -- the recursive hop is the whole reason the walk is a queue.
    check("RESOLVE recurses, skips comment+macro", len(resolved), 6)

    def codes(fname: str, code: str) -> int:
        return sum(1 for _, c, _ in scan_file(tmp / fname, FILE_FLOOR, SECTION_FLOOR, tmp)
                   if c == code)

    check("CONTENT dirty (unwritten)", codes("unwritten.tex", "CONTENT"), 1)
    check("CONTENT clean (written)", codes("written.tex", "CONTENT"), 0)
    check("CONTENT clean (declared carrier)", codes("declared_carrier.tex", "CONTENT"), 0)
    check("CONTENT clean (declared empty)", codes("declared_empty.tex", "CONTENT"), 0)
    check("CONTENT counts through \\input", codes("undeclared_carrier.tex", "CONTENT"), 0)

    check("SECTION dirty (heading only)", codes("unwritten.tex", "SECTION"), 1)
    check("SECTION clean (written)", codes("written.tex", "SECTION"), 0)
    check("SECTION skipped when declared empty", codes("declared_empty.tex", "SECTION"), 0)
    check("SECTION follows \\input (clean)", codes("crossfile_ok.tex", "SECTION"), 0)
    check("SECTION follows \\input (empty ch)", codes("crossfile_empty.tex", "SECTION"), 1)
    check("SECTION skips a label-only parent", codes("section_then_sub.tex", "SECTION"), 0)
    # Both directions on the REPRODUCED declaration: the 15-word "Research Question"
    # subsection is exempt when the file declares itself a reproduction and is a finding
    # when it does not. The CONTENT floor is unaffected either way.
    check("SECTION exempt when declared reproduced", codes("reproduced.tex", "SECTION"), 0)
    check("SECTION fires without the declaration", codes("reproduced_undeclared.tex", "SECTION"), 1)
    check("CONTENT still applies to a reproduction", codes("reproduced.tex", "CONTENT"), 0)

    # TEMPLATE dirty: bit.ly, the regulations pointer, and the regulations boilerplate --
    # the last of which is deliberately WRAPPED across a newline in the fixture, because
    # the line-by-line first draft of this check missed it.
    check("TEMPLATE dirty (3, one wrapped)", codes("stilltemplate.tex", "TEMPLATE"), 3)
    check("TEMPLATE clean (phrases in a comment)", codes("commentonly.tex", "TEMPLATE"), 0)
    check("TEMPLATE clean (written prose)", codes("written.tex", "TEMPLATE"), 0)

    # A file that is thin AND template must report both, not stop at the first.
    check("findings do not mask each other",
          len(scan_file(tmp / "unwritten.tex", FILE_FLOOR, SECTION_FLOOR)), 2)

    print("=" * 68)
    print("COMPLETENESSCHECK SELF-TEST")
    print("=" * 68)
    print("\n".join(rows))
    if failures:
        print("\nSELF-TEST FAILED:")
        for f in failures:
            print("  - " + f)
        return 1
    print("\nSELF-TEST PASSED - flagged the missing \\input, the unwritten file, the "
          "heading with\nnothing under it and every planted template phrase; passed written "
          "prose, a declared\ncarrier, a declared-empty file, and template phrases quoted "
          "inside a comment.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Flag \\input files that are unwritten, thin, or still template.")
    ap.add_argument("main", nargs="?", type=Path, help="path to main.tex")
    ap.add_argument("--file-floor", type=int, default=FILE_FLOOR)
    ap.add_argument("--section-floor", type=int, default=SECTION_FLOOR)
    ap.add_argument("--self-test", action="store_true",
                    help="verify the instrument against planted violations")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if args.main is None:
        ap.error("main.tex is required unless --self-test")
    if not args.main.exists():
        print(f"no such file: {args.main}", file=sys.stderr)
        return 2

    resolved, unresolved = collect_inputs(args.main)
    findings: list[tuple[str, int, str, str]] = [
        (str(src), line, "RESOLVE", f"\\input{{{target}}} resolves to nothing")
        for src, line, target in unresolved
    ]
    for path in [args.main] + resolved:
        for line, code, detail in scan_file(path, args.file_floor, args.section_floor,
                                            args.main.parent):
            findings.append((str(path), line, code, detail))

    print(f"walked {len(resolved) + 1} file(s) from {args.main}")
    if not findings:
        print("VERDICT: PASS - every \\input resolves, carries prose, and is free of "
              "template text")
        return 0

    for code in ("RESOLVE", "CONTENT", "SECTION", "TEMPLATE"):
        rows = [f for f in findings if f[2] == code]
        if not rows:
            continue
        print(f"\n{code} ({len(rows)}):")
        for path, line, _, detail in rows:
            print(f"  {path}:{line}: {detail}")

    print(f"\nVERDICT: FAIL - {len(findings)} finding(s). This check reads for PRESENCE "
          "only;\nprose that exists and is wrong is out of its scope and stays with the "
          "critique roles.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
