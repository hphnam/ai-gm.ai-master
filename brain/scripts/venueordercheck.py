#!/usr/bin/env python3
r"""Static check: three-element lists that are read positionally against a venue order.

WHY THIS EXISTS. This estate has three venues, so almost every result is a list of three.
Two venue orders coexist in the document, both legitimately: section 4.1 -- tab:ladder,
tab:mcs and the gate prose -- runs Beer Hall / Two River Taps / Ellel, while 4.2 to 4.4
runs Beer Hall / Ellel / Two River Taps. Nothing is wrong with that. What is wrong is
reading one list positionally against the other, and it has now happened THREE times
independently: results.tex:46 (synthesis R5), tab:mcs's own ordering, and the composed
abstract, which reproduced the same swap while the Chapter 4 fix was being prepared. A
defect that recurs independently is a property of the material, not of the author.

    ./venueordercheck.py /path/to/prj93-overleaf/chapters /path/to/abstract.tex
    ./venueordercheck.py --advisory <paths>     # add the mapping-review class
    ./venueordercheck.py --self-test

THREE CLASSES, and they are graded because their precision differs sharply:

  ORDER       two venue-name triples in one paragraph, in different orders. Near-certain
              defect: within a single passage the reader carries one order forward.
  UNANCHORED  two or more positional triples in a paragraph that names no venue at all,
              so nothing in the text states which order they are in. This is the abstract
              defect exactly -- "over 273, 260 and 205 origins retain five, six and four"
              is two positional reads with no anchor in the passage or anywhere near it.
  POSITIONAL  a venue triple and a value triple in the same paragraph. The mapping is
              readable but has to be READ. Advisory, off by default: this is how most of
              Chapter 4 is legitimately written and it would drown the other two classes.

WHAT THIS CATCHES, and what it does not. It catches the SHAPE that permits the defect. It
cannot tell a correct mapping from a wrong one -- that needs the artefact, and checking a
mapping against the artefact is what the critique roles and the recompute set are for. So
ORDER and UNANCHORED are "this passage cannot be verified by reading it", not "this
passage is wrong". False positives are expected and were accepted when the check was
commissioned: a defect seen three times independently is worth some noise.

The cheapest remedy for anything this flags is to NAME THE VENUES INLINE rather than
reorder anything. A named list cannot be read positionally, and it survives a later
reordering of the table it was drawn from.
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from pathlib import Path

VENUES = [
    ("BH", re.compile(r"\bBeer Hall\b|\bBH\b")),
    ("TRT", re.compile(r"\bTwo River Taps\b|\bTRT\b")),
    ("ELL", re.compile(r"\bEllel\b")),
]

NUMBER_WORDS = (
    "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|"
    "fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|"
    "eighty|ninety|hundred"
)
# A value token as this document writes them: 273, 0.745, $0.572$, 1{,}814, 5.3, 90\%.
# Built by concatenation rather than %-formatting -- the token itself contains `%?`.
_VALUE = r"(?:\$?-?\d[\d,{}]*(?:\.\d+)?\\?%?\$?|(?:" + NUMBER_WORDS + r"))"
TRIPLE_RE = re.compile(
    r"(?<![\w.])" + _VALUE + r"\s*,\s*" + _VALUE + r"\s*,?\s+and\s+" + _VALUE + r"(?![\w.])",
    re.I,
)


def strip_comments(text: str) -> str:
    return "\n".join(re.sub(r"(?<!\\)%.*", "", line) for line in text.splitlines())


def paragraphs(text: str) -> list[tuple[int, str]]:
    """Split on blank lines, TeX's own paragraph unit. Returns (start line, text)."""
    out, line, buf, buf_start = [], 1, [], 1
    for raw in text.splitlines():
        if raw.strip():
            if not buf:
                buf_start = line
            buf.append(raw)
        elif buf:
            out.append((buf_start, "\n".join(buf)))
            buf = []
        line += 1
    if buf:
        out.append((buf_start, "\n".join(buf)))
    return out


def venue_orders(passage: str) -> list[tuple[str, ...]]:
    """Every run of three consecutive, distinct venue mentions, canonicalised.

    CANONICALISED BY ROTATION TO BEER HALL FIRST, and this is the whole precision of the
    check. A paragraph naming BH, TRT, ELL, BH yields the sliding windows BH/TRT/ELL and
    TRT/ELL/BH, which are one order read twice, not two orders. Ungrouped, that reported
    twelve ORDER findings against the live chapters and most were rotations. With three
    venues there are exactly two cyclic classes, and they are exactly the document's two
    legitimate orders -- 4.1's BH/TRT/ELL and 4.2-4.4's BH/ELL/TRT -- so two distinct
    canonical forms in one paragraph is a genuine clash and nothing else is.
    """
    mentions = sorted(
        (m.start(), name) for name, pattern in VENUES for m in pattern.finditer(passage)
    )
    orders = []
    for i in range(len(mentions) - 2):
        run = tuple(name for _, name in mentions[i:i + 3])
        if len(set(run)) == 3:
            pivot = run.index("BH")
            orders.append(run[pivot:] + run[:pivot])
    return orders


def scan_text(text: str, advisory: bool = False) -> list[tuple[int, str, str]]:
    """Return (line, code, detail) findings for one file's text."""
    findings = []
    for start, passage in paragraphs(strip_comments(text)):
        orders = venue_orders(passage)
        distinct = list(dict.fromkeys(orders))
        triples = TRIPLE_RE.findall(passage)

        if len(distinct) > 1:
            shown = " vs ".join("/".join(o) for o in distinct)
            findings.append((start, "ORDER",
                             f"two venue orders in one paragraph: {shown}"))
        elif len(triples) >= 2 and not orders:
            # The trigger is "no venue ORDER", which is not the same as "no venue named":
            # one or two names state no order either, so detection is right to fire. The
            # message was wrong, and said "no venue named in the paragraph" of a paragraph
            # whose second sentence read "At Ellel they do not" (appendix/robustness.tex:228,
            # 2026-08-12). A finding that misdescribes what it measured gets dismissed as
            # noise or, worse, acted on -- so it names what it actually found.
            named = [code for code, pattern in VENUES if pattern.search(passage)]
            anchor = f"only {', '.join(named)} named" if named else "no venue named"
            findings.append((start, "UNANCHORED",
                             f"{len(triples)} positional triple(s), {anchor} in the "
                             "paragraph, so no order anchors them; name the venues inline"))
        elif advisory and orders and triples:
            findings.append((start, "POSITIONAL",
                             f"venue order {'/'.join(distinct[0])} with {len(triples)} "
                             "value triple(s); mapping must be read against the artefact"))
    return findings


# --------------------------------------------------------------------------- self-test

# The real defect, from abstract.tex before repair: origins in BH/ELL/TRT order paired
# with set sizes in BH/TRT/ELL order, read positionally, with no venue named anywhere.
FIXTURE_UNANCHORED = """
Confidence sets over 273, 260 and 205 origins retain five, four and six of the nine
approaches that scored, so the served model is not distinguishable from its incumbents.
"""

FIXTURE_ORDER_CLASH = """
The Beer Hall, Two River Taps and Ellel each carry a distinct trading rhythm, and the
ladder is reported for the Beer Hall, Ellel and Two River Taps in that order below.
"""

# Clean: one order, and the values are named to the venue rather than listed positionally.
FIXTURE_NAMED = """
The gate served the exogenous arm at the Beer Hall at $0.745$ MASE, exponential smoothing
at Two River Taps at $0.597$, and the day-of-week median at Ellel at $0.572$.
"""

# Clean: a single positional triple with nothing to read it against is not a mapping.
FIXTURE_SINGLE_TRIPLE = """
Daily revenue was observed over frames of 399, 386 and 331 days across the estate, which
is the whole of the trading history available to this study at the time of the freeze.
"""

# Clean: one order, named four times, so the sliding window sees BH/TRT/ELL and then
# TRT/ELL/BH. Rotations of one order, not two orders. Twelve of the fourteen findings on
# the first live run were this shape.
FIXTURE_ROTATION = """
The Beer Hall, Two River Taps and Ellel are reported in that order throughout, so the
Beer Hall's figure leads and Ellel's closes every row of the table below.
"""

# Advisory only: one order, one value triple. This is how most of Chapter 4 is written.
FIXTURE_POSITIONAL = """
At the Beer Hall, Ellel and Two River Taps the confidence set retains five, four and six
of the nine approaches that scored at the committed gate.
"""

# One venue named, two positional triples. Detection is deliberately UNCHANGED -- a single
# name states no order -- but the message must report what it found. This is the shape the
# message lied about at appendix/robustness.tex:228, which names Ellel.
FIXTURE_UNANCHORED_ONE_NAMED = """
At Ellel the sweep over lag budgets of two, seven and ten returns 6.37, 5.82 and 5.14,
so the correction's size depends on the budget it is charged against.
"""

# (name, source, advisory, expected count, expected code, substring the message must carry)
FIXTURE_CASES = [
    ("unanchored-abstract", FIXTURE_UNANCHORED, False, 1, "UNANCHORED", "no venue named"),
    ("unanchored-one-named", FIXTURE_UNANCHORED_ONE_NAMED, False, 1, "UNANCHORED",
     "only ELL named"),
    ("order-clash", FIXTURE_ORDER_CLASH, False, 1, "ORDER", None),
    ("clean-named-inline", FIXTURE_NAMED, False, 0, None, None),
    ("clean-single-triple", FIXTURE_SINGLE_TRIPLE, False, 0, None, None),
    ("clean-rotation-of-one-order", FIXTURE_ROTATION, False, 0, None, None),
    ("positional-off-by-default", FIXTURE_POSITIONAL, False, 0, None, None),
    ("positional-with-advisory", FIXTURE_POSITIONAL, True, 1, "POSITIONAL", None),
    ("clean-named-under-advisory", FIXTURE_NAMED, True, 0, None, None),
]


def self_test() -> int:
    """Both directions on all three classes, plus the advisory switch in both states."""
    tmp = Path(tempfile.mkdtemp(prefix="venueordercheck-fixture-"))
    rows, failures = [], []
    for name, source, advisory, want, want_code, want_text in FIXTURE_CASES:
        (tmp / f"{name}.tex").write_text(source)
        got = scan_text(source, advisory=advisory)
        ok = len(got) == want and (want_code is None or
                                   all(c == want_code for _, c, _ in got))
        if ok and want_text is not None:
            ok = all(want_text in detail for _, _, detail in got)
            if not ok:
                failures.append(f"{name}: message lacks {want_text!r}: "
                                f"{[d for _, _, d in got]}")
        elif not ok:
            failures.append(f"{name}: expected {want} {want_code or ''} finding(s), "
                            f"got {[(c) for _, c, _ in got]}")
        rows.append(f"  {name:<28} expected {want} {str(want_code or '-'):<11} "
                    f"got {len(got)}  {'PASS' if ok else 'FAIL'}")

    print("=" * 68)
    print("VENUEORDERCHECK SELF-TEST")
    print("=" * 68)
    print("\n".join(rows))
    if failures:
        print("\nSELF-TEST FAILED:")
        for f in failures:
            print("  - " + f)
        return 1
    print("\nSELF-TEST PASSED - flagged the real abstract defect and a two-order "
          "paragraph; passed\nvalues named to their venue, a lone triple with nothing to "
          "map it against, and the\nadvisory class in both switch positions.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Flag three-element lists read positionally against a venue order.")
    ap.add_argument("paths", nargs="*", type=Path)
    ap.add_argument("--advisory", action="store_true",
                    help="also report the POSITIONAL mapping-review class")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if not args.paths:
        ap.error("at least one path is required unless --self-test")

    files = []
    for root in args.paths:
        if root.is_file():
            files.append(root)
        else:
            files.extend(sorted(root.rglob("*.tex")))

    findings = []
    for path in files:
        for line, code, detail in scan_text(path.read_text(errors="replace"),
                                            advisory=args.advisory):
            findings.append((path, line, code, detail))

    print(f"scanned {len(files)} file(s)")
    # A clean result on an empty scan is not a clean result. On 2026-08-09 this script
    # printed PASS having scanned ZERO files: the caller was zsh, where an unquoted
    # `$A` holding "chapters abstract.tex" does NOT word-split, so one invalid path
    # was passed and nothing matched. The verdict was true of what it examined and
    # said nothing about the document. Fail closed instead: a check that examined
    # nothing has not run.
    if not files:
        print("VERDICT: FAIL - scanned 0 files. This is a caller error, not a clean "
              "document: check the paths (and note that zsh does not word-split an "
              "unquoted variable holding several paths).")
        return 1
    if not findings:
        print("VERDICT: PASS - no unanchored or conflicting venue triple found")
        return 0

    for code in ("ORDER", "UNANCHORED", "POSITIONAL"):
        rows = [f for f in findings if f[2] == code]
        if not rows:
            continue
        print(f"\n{code} ({len(rows)}):")
        for path, line, _, detail in rows:
            print(f"  {path}:{line}: {detail}")

    hard = [f for f in findings if f[2] != "POSITIONAL"]
    print(f"\nVERDICT: {'FAIL' if hard else 'ADVISORY'} - {len(findings)} finding(s). "
          "This check reads SHAPE, not\ncorrectness: it cannot tell a right mapping from "
          "a wrong one. Remedy is to name the\nvenues inline, which makes a positional "
          "read impossible.")
    return 1 if hard else 0


if __name__ == "__main__":
    sys.exit(main())
