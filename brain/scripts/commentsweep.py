#!/usr/bin/env python3
r"""Static check: prose that resumes in lower case immediately after a comment line.

WHY THIS EXISTS. A ``%`` block opened INSIDE a paragraph swallows whatever sits on its last
line. It has happened three times in this project, all three from explanatory comments the
agent added beside its own repairs:

  1. ``discussion.tex`` (f34a486)  ate "The estimand survives, qualified by a" -- RQ2's
     second answer limb, printed as "...may be claimed for them here. served forecaster".
  2. ``discussion.tex``, same day, from the D7 comment.
  3. ``figures/alg_conformal.tex`` (69292e2) ate "What the construction guarantees is",
     printed on p.113 as "...not an inferred regime. the ordinary split-conformal property".

NONE of it is visible to the other checkers. ``latexcheck`` sees a clean build,
``completenesscheck`` sees prose above the floor, ``figurecheck`` sees a titled float. All
three read FORM, and a comment that eats a clause leaves the form intact -- the surrounding
paragraph still looks complete. Only the rendered text is evidence.

    ./commentsweep.py <files>          # e.g. git ls-files '*.tex' | xargs ./commentsweep.py
    ./commentsweep.py --self-test

THE POPULATION IS PART OF THE RESULT. Instance 3 survived a day because the sweep written
for instances 1 and 2 covered 13 files and the defect was in the other 13. So the file count
is printed on every run and **an empty scan exits 2**, never 0: a check that examined nothing
must not read as clean.

FALSE POSITIVES ARE EXPECTED AND ARE THE POINT. A comment placed correctly -- after a
paragraph's final line -- can still be followed by prose that joins grammatically, and this
check cannot tell that from a swallowed clause. ``results.tex``:120 and :620 are both
grammatical joins, re-read in the rendered PDF. Read every hit; confirm each verdict in the
PDF, not in the source.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

RESUMES_LOWER = re.compile(r"^[a-z]")


def scan_text(text: str) -> list[tuple[int, str]]:
    """Return (line number, resuming line) for prose resuming after a comment line."""
    hits = []
    lines = text.splitlines()
    for i in range(1, len(lines)):
        prev, cur = lines[i - 1].strip(), lines[i].strip()
        if prev.startswith("%") and cur and RESUMES_LOWER.match(cur):
            hits.append((i + 1, cur))
    return hits


# --------------------------------------------------------------------------- self-test

# Instance 3, reduced: the clause "What the construction guarantees is" sits on the comment's
# last line and the paragraph resumes in lower case.
FIXTURE_SWALLOWED = """The Mondrian partition here is an observed calendar variable,
% state == 0, i.e. calendar-open. What the construction guarantees is
the ordinary split-conformal property applied within each group.
"""

# The same comment placed correctly: after the paragraph's final line.
FIXTURE_COMMENT_AFTER = """The Mondrian partition here is an observed calendar variable.
What the construction guarantees is the ordinary split-conformal property.
% state == 0, i.e. calendar-open, which INCLUDES non-trading open days.
"""

# A comment inside a paragraph whose resumption joins grammatically -- results.tex:620's
# shape. Flagged, and correctly so: the check cannot tell this from the fixture above.
FIXTURE_GRAMMATICAL_JOIN = """Two constructions sharing
% The pointer to the appendix was withdrawn: it carries a different nominal level.
no point model, no calibration layer and no partition fail at Ellel by the same margin.
"""

FIXTURE_CASES = [
    ("swallowed-clause", FIXTURE_SWALLOWED, 1),
    ("comment-after-paragraph", FIXTURE_COMMENT_AFTER, 0),
    ("grammatical-join-still-flagged", FIXTURE_GRAMMATICAL_JOIN, 1),
]


def self_test() -> int:
    """Both directions, plus the empty-scan guard that the file-count rule turns on."""
    rows, failures = [], []
    for name, source, want in FIXTURE_CASES:
        got = scan_text(source)
        ok = len(got) == want
        if not ok:
            failures.append(f"{name}: expected {want} hit(s), got {len(got)}: {got}")
        rows.append(f"  {name:<32} expected {want}  got {len(got)}  "
                    f"{'PASS' if ok else 'FAIL'}")

    # Once, not once per read: run() prints, and a self-test that prints its own FAIL
    # banner twice reads as a failure to whoever scrolls past it.
    empty_code = run([])
    rows.append(f"  {'empty-scan-exits-2':<32} expected 2  got {empty_code}  "
                f"{'PASS' if empty_code == 2 else 'FAIL'}")
    if empty_code != 2:
        failures.append("empty scan did not exit 2")

    print("=" * 68)
    print("COMMENTSWEEP SELF-TEST")
    print("=" * 68)
    print("\n".join(rows))
    if failures:
        print("\nSELF-TEST FAILED:")
        for f in failures:
            print("  - " + f)
        return 1
    print("\nSELF-TEST PASSED - caught a clause on a comment's last line, passed the same "
          "comment\nplaced after the paragraph, kept flagging a grammatical join (which is "
          "the check's\nknown noise), and refused to pass an empty scan.")
    return 0


def run(paths: list[pathlib.Path]) -> int:
    print(f"scanned {len(paths)} file(s)")
    if not paths:
        print("VERDICT: FAIL - scanned 0 files. This is a caller error, not a clean "
              "document:\ncheck the paths (zsh does not word-split an unquoted variable "
              "holding several).")
        return 2

    hits = [(p, line, text) for p in paths for line, text in scan_text(p.read_text())]
    if hits:
        print("SUSPECT - read each one in the RENDERED PDF; a grammatical join is a "
              "false positive:")
        for p, line, text in hits:
            print(f"  {p}:{line}: {text[:78]}")
        return 1
    print("VERDICT: PASS - no prose resumes in lower case after a comment line")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Flag prose resuming in lower case after a LaTeX comment line.")
    ap.add_argument("paths", nargs="*", type=pathlib.Path)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    return self_test() if args.self_test else run(args.paths)


if __name__ == "__main__":
    sys.exit(main())
