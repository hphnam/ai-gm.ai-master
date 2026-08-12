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

# The damage in the PDF: a full stop, then a sentence beginning in lower case. The source
# scan below can only see the swallowed clause when the resumption happens to start a line
# in lower case; this one sees the wound itself, whatever cut it.
SENTENCE_BREAK = re.compile(r"([A-Za-z0-9\)\]\}’'\"]{2,}\.)\s+([a-z]\w+)")
# Abbreviations that legitimately carry an internal stop, plus the ordinals biblatex emits.
ABBREV = re.compile(r"\b(e\.g|i\.e|cf|vs|et al|al|Fig|Sec|Eq|Ch|approx|Dr|Mr|Mrs|St|no|No"
                    r"|pp|p|vol|Vol|ed|Ed|eds|Eds|edn|collab|Inc|Ltd|Jr|resp|viz|ibid"
                    r"|op|cit)\.$")


def scan_text(text: str) -> list[tuple[int, str]]:
    """Return (line number, resuming line) for prose resuming after a comment line."""
    hits = []
    lines = text.splitlines()
    for i in range(1, len(lines)):
        prev, cur = lines[i - 1].strip(), lines[i].strip()
        if prev.startswith("%") and cur and RESUMES_LOWER.match(cur):
            hits.append((i + 1, cur))
    return hits


# A reference list is generated data, not prose: biblatex sets `doi:`, `url:`, `issn:` and
# `In:` in lower case by design, and its casing is not the author's to defect on. One of
# these markers in a block identifies it as an entry rather than a paragraph.
BIBLIOGRAPHIC = re.compile(r"\b(doi|url|issn|isbn|arXiv|In|Ed|eprint|visited on)\s*:", re.I)
# An algorithm float is generated layout too: algorithm2e sets its `input :` / `output :`
# keywords in lower case, directly after the caption's final full stop.
ALGORITHMIC = re.compile(r"\b(input|output|data|result)\s+:", re.I)


def scan_block(block: str) -> list[str]:
    """Return the lower-case sentence starts inside ONE rendered text block.

    WITHIN ONE BLOCK is the whole precision of this scan. Run over a page's flattened
    text it returns 73 hits on this document and every one is an artefact of reading
    order: a caption's last sentence butting against the body paragraph beside it, a
    sentence broken across a page (`...this work returns the largest observed` on p.50,
    `residual rather than...` on p.51), and every `doi:`/`url:`/`issn:` in the
    bibliography. A block is one typeset unit, so a stop and the word after it inside one
    block really are consecutive in the reading.
    """
    hits = []
    flat = re.sub(r"\s+", " ", block)
    if BIBLIOGRAPHIC.search(flat) or ALGORITHMIC.search(flat):
        return hits
    for m in SENTENCE_BREAK.finditer(flat):
        head = m.group(1)
        if ABBREV.search(head) or re.match(r"^\d+\.$", head):
            continue
        hits.append(flat[max(0, m.start() - 60):m.end() + 60])
    return hits


def scan_pdf(path: pathlib.Path) -> tuple[int, list[tuple[int, str]]]:
    """Return (pages scanned, [(page, context)]) for lower-case sentence starts."""
    import pymupdf

    doc = pymupdf.open(path)
    skip = reference_pages(doc)
    hits = []
    for page in doc:
        if page.number + 1 in skip:
            continue
        for block in page.get_text("blocks"):
            for ctx in scan_block(block[4]):
                hits.append((page.number + 1, ctx))
    return doc.page_count - len(skip), hits


def reference_pages(doc) -> set[int]:
    """1-based pages of the reference list, taken from the PDF outline.

    The per-block bibliographic filter is not enough on its own: an entry runs across
    several blocks, so the one holding `v4, 26 January 2026` carries no `doi:` of its own
    and reads as a lower-case sentence start. The outline gives the section's real extent,
    which is the honest scope — a reference list is biblatex's casing, not the author's.
    Returns an empty set when the PDF has no outline, so the scan degrades to noisier
    rather than to silently narrower.
    """
    toc = doc.get_toc()
    for i, (_, title, start) in enumerate(toc):
        if title.strip().lower() in ("references", "bibliography"):
            nxt = next((p for _, _, p in toc[i + 1:] if p > start), doc.page_count + 1)
            return set(range(start, nxt))
    return set()


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

# --- the rendered-text scan, in both directions ------------------------------------

# Instance 3 as it actually printed on p.113 before the repair.
BLOCK_DAMAGED = ("splitting calendar-open days from structurally closed ones, not an "
                 "inferred regime. the ordinary split-conformal property applied within "
                 "each group.")
BLOCK_REPAIRED = ("splitting calendar-open days from structurally closed ones, not an "
                  "inferred regime. What the construction guarantees is the ordinary "
                  "split-conformal property applied within each group.")
# The noise the page-level scan could not tell from a defect, and this one must.
BLOCK_BIBLIOGRAPHY = ("Bayesian Online Changepoint Detection. doi: 10.48550/arXiv.0710.3742. "
                      "arXiv: 0710.3742. url: http://arxiv.org/abs/0710.3742.")
BLOCK_ABBREVIATION = ("The set retains every arm, e.g. the adaptive one, and the incumbent "
                      "keeps its margin.")
BLOCK_ALGORITHM = ("Algorithm 1: the served band. c a running count of substitutions. "
                   "input : calibration set Dcal, test inputs x1:ntest, level α")

BLOCK_CASES = [
    ("rendered-swallowed-clause", BLOCK_DAMAGED, 1),
    ("rendered-after-repair", BLOCK_REPAIRED, 0),
    ("rendered-bibliography-noise", BLOCK_BIBLIOGRAPHY, 0),
    ("rendered-abbreviation", BLOCK_ABBREVIATION, 0),
    ("rendered-algorithm-keyword", BLOCK_ALGORITHM, 0),
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

    for name, block, want in BLOCK_CASES:
        got = scan_block(block)
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


def run_pdf(path: pathlib.Path) -> int:
    pages, hits = scan_pdf(path)
    print(f"scanned {pages} page(s) of {path.name}, block by block")
    if not pages:
        print("VERDICT: FAIL - scanned 0 pages")
        return 2
    if hits:
        print("SUSPECT - a sentence begins in lower case inside one typeset block:")
        for page, ctx in hits:
            print(f"  p{page}: ...{ctx}...")
        return 1
    print("VERDICT: PASS - no sentence begins in lower case within a block")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Flag clauses swallowed by a LaTeX comment, in source or in the render.")
    ap.add_argument("paths", nargs="*", type=pathlib.Path)
    ap.add_argument("--pdf", type=pathlib.Path,
                    help="scan the RENDERED pdf for lower-case sentence starts instead")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    return run_pdf(args.pdf) if args.pdf else run(args.paths)


if __name__ == "__main__":
    sys.exit(main())
