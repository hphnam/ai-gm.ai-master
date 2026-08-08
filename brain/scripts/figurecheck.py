#!/usr/bin/env python3
"""Static check: no figure paints its own title into the image body.

A figure's title belongs in the ``\\caption``, where it reaches the List of
Figures, the cross-reference and the marker's eye. A title drawn inside the
raster or vector body duplicates the caption, cannot be styled with the
document, and cannot be reached by ``\\ref``. This is a sibling of
``latexcheck.py`` rather than part of it because ``latexcheck`` reads a build
log and this reads generator SOURCE -- the defect exists before any compile.

Run over the figure source trees:

    ./figurecheck.py figures brain/drafts/figures /path/to/overleaf/figures

and verify the instrument before trusting it:

    ./figurecheck.py --self-test

which feeds it one source carrying each violation and one clean source, and
asserts it flags the first set and passes the second. PRJ93_RULES.md: an
assertion nobody has seen fail is an assertion taken on faith, and a guard that
only ever fails has not been distinguished from a working one.

WHAT THIS CATCHES, and what it does not. It catches the title APIs:
matplotlib's ``set_title`` / ``suptitle`` / ``plt.title``, and pgfplots'
``title=`` axis key. It does NOT catch a bare TikZ ``\\node`` positioned above a
picture and reading as a title -- that is a judgement about placement and
wording, not a construct, and a regex that guessed at it would flag every
label in the estate. Bare TikZ title nodes stay a reading task; this check
makes the API case impossible to forget.

Panel labels are not titles and are not flagged. ``(A) Beer Hall`` drawn with
``ax.text`` identifies which panel is which and is structural.
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from pathlib import Path

# `.set_title(` also matches `fig.axes[0].set_title(`; the receiver does not
# matter, the call is the defect.
RULES = [
    ("set_title", re.compile(r"\.set_title\s*\(")),
    ("suptitle", re.compile(r"\.suptitle\s*\(")),
    ("plt.title", re.compile(r"(?:^|[^.\w])(?:plt|pyplot)\.title\s*\(")),
    # pgfplots. `title style` alone only formats a title that some other line
    # sets, so matching it too would double-report; `title=` is the setter.
    ("pgfplots title=", re.compile(r"(?<![-\w])title\s*=")),
]

SUFFIXES = {".py": ("set_title", "suptitle", "plt.title"),
            ".tex": ("pgfplots title=",)}


def scan_text(text: str, suffix: str) -> list[tuple[int, str, str]]:
    """Return (line number, rule name, line) for every embedded title found."""
    applicable = SUFFIXES.get(suffix, ())
    hits = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        stripped = line.lstrip()
        if suffix == ".py" and stripped.startswith("#"):
            continue
        if suffix == ".tex" and stripped.startswith("%"):
            continue
        for name, pattern in RULES:
            if name in applicable and pattern.search(line):
                hits.append((lineno, name, line.strip()))
    return hits


def scan_paths(roots: list[Path]) -> tuple[list[tuple[Path, int, str, str]], int]:
    findings, scanned = [], 0
    for root in roots:
        files = [root] if root.is_file() else sorted(
            p for p in root.rglob("*") if p.suffix in SUFFIXES and "__pycache__" not in p.parts
        )
        for path in files:
            if path.suffix not in SUFFIXES:
                continue
            scanned += 1
            for lineno, name, line in scan_text(
                    path.read_text(errors="replace"), path.suffix):
                findings.append((path, lineno, name, line))
    return findings, scanned


FIXTURE_DIRTY_PY = '''
import matplotlib.pyplot as plt

def main():
    fig, axes = plt.subplots(1, 2)
    axes[0].set_title("Beer Hall")
    fig.suptitle("Forecast accuracy by venue")
    plt.title("also a title")
'''

FIXTURE_CLEAN_PY = '''
import matplotlib.pyplot as plt

def main():
    fig, axes = plt.subplots(1, 2)
    # A panel label is not a title, and a commented ax.set_title( is not a call.
    axes[0].text(0.0, 1.04, "(A) Beer Hall", transform=axes[0].transAxes)
    axes[0].set_xlabel("Conformity score")
    axes[0].set_ylabel("subtitle-ish words that are not a title call")
'''

FIXTURE_DIRTY_TEX = r"""
\begin{tikzpicture}
  \begin{axis}[title={Forecast accuracy}, xlabel={fold}]
  \end{axis}
\end{tikzpicture}
"""

FIXTURE_CLEAN_TEX = r"""
% title= appears in this comment and must not be flagged.
\begin{tikzpicture}
  \node[anchor=north] at (1,1) {\scriptsize\textbf{fit} $n{=}230$};
  \begin{axis}[xlabel={fold}, ylabel={loss}]
  \end{axis}
\end{tikzpicture}
"""

FIXTURE_CASES = [
    ("dirty-python", FIXTURE_DIRTY_PY, ".py", 3),
    ("clean-python", FIXTURE_CLEAN_PY, ".py", 0),
    ("dirty-tikz", FIXTURE_DIRTY_TEX, ".tex", 1),
    ("clean-tikz", FIXTURE_CLEAN_TEX, ".tex", 0),
]


def self_test() -> int:
    """Both directions. A guard seen only to fail has not been seen to work."""
    tmp = Path(tempfile.mkdtemp(prefix="figurecheck-fixture-"))
    failures, rows = [], []

    for name, source, suffix, want in FIXTURE_CASES:
        path = tmp / f"{name}{suffix}"
        path.write_text(source)
        got = len(scan_text(source, suffix))
        ok = got == want
        if not ok:
            failures.append(f"{name}: expected {want} finding(s), got {got}")
        rows.append(f"  {name:<14} expected {want}  got {got}  "
                    f"{'PASS' if ok else 'FAIL'}")

    print("=" * 60)
    print("FIGURECHECK SELF-TEST")
    print("=" * 60)
    print("\n".join(rows))

    if failures:
        print("\nSELF-TEST FAILED:")
        for f in failures:
            print("  - " + f)
        return 1
    print("\nSELF-TEST PASSED - flagged every planted title and passed both "
          "clean sources, including a commented-out call and a TikZ label.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Flag figure sources that paint a title into the image body.")
    ap.add_argument("paths", nargs="*", type=Path,
                    help="figure source files or directories to scan")
    ap.add_argument("--self-test", action="store_true",
                    help="verify the instrument against planted violations")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if not args.paths:
        ap.error("at least one path is required unless --self-test")

    missing = [p for p in args.paths if not p.exists()]
    if missing:
        print("no such path: " + ", ".join(str(p) for p in missing), file=sys.stderr)
        return 2

    findings, scanned = scan_paths(args.paths)
    print(f"scanned {scanned} figure source file(s)")
    # See venueordercheck's note: a PASS on an empty scan is a statement about
    # nothing. Fail closed so a caller error cannot read as a clean document.
    if not scanned:
        print("VERDICT: FAIL - scanned 0 files. This is a caller error, not a clean "
              "document: check the paths.")
        return 1
    if not findings:
        print("VERDICT: PASS - no embedded figure title found")
        return 0

    for path, lineno, name, line in findings:
        print(f"  {path}:{lineno}: {name} -- {line}")
    print(f"VERDICT: FAIL - {len(findings)} embedded title(s); "
          "move the text into the \\caption")
    return 1


if __name__ == "__main__":
    sys.exit(main())
