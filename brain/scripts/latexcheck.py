#!/usr/bin/env python3
"""Instrumented LaTeX build check.

Runs ``latexmk -pdf -interaction=nonstopmode -halt-on-error`` and parses the
resulting ``.log`` into a report: undefined references BY LABEL NAME, undefined
citations by key, lost floats, overfull/underfull boxes with location and
overflow in pt, missing characters, and package/LaTeX errors.

Exits non-zero on any error class and on any undefined reference, so a partial
build cannot be read as a success.

Why a committed tool and not an invocation: PRJ93_RULES.md, "A number that
enters a decision comes from an instrumented tool". Two ad-hoc measurement
scripts in this project were wrong, both in the direction of the number about
to be acted on. Verify this one against its fixture before trusting it:

    ./latexcheck.py --self-test

which builds a .tex carrying a deliberate undefined \\ref, a deliberate bad
citation key and a deliberate overfull hbox, and asserts all three are caught.

NOTE: TeX wraps log lines at 79 columns by default, which splits label names
across lines and silently truncates any parse of them. We set max_print_line
high for every run. A parser that does not do this under-reports.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import OrderedDict
from pathlib import Path

# TeX writes the log through the same line-wrapping machinery as the terminal.
# 79 columns is the default and it breaks label names in half.
TEX_ENV = {
    "max_print_line": "8192",
    "error_line": "254",
    "half_error_line": "238",
}

RE_UNDEF_REF = re.compile(
    r"LaTeX Warning: Reference [`'\"]([^']+)' on page (\S+) undefined on input line (\d+)"
)
RE_UNDEF_CITE = re.compile(
    r"LaTeX Warning: Citation [`'\"]([^']+)' on page (\S+) undefined on input line (\d+)"
)
# biblatex reports missing keys in a block rather than one warning per use.
RE_BIBLATEX_MISSING = re.compile(r"Package biblatex Warning: The following entry keys")
RE_FLOATS_LOST = re.compile(r"LaTeX Warning: Float\(s\) lost on input line (\d+)|LaTeX Warning: Float\(s\) lost")
RE_OVERFULL = re.compile(
    r"^(Overfull|Underfull) \\(hbox|vbox) \(((\d+(?:\.\d+)?)pt too (?:wide|high)|badness (\d+))\)"
    r"(?: in paragraph at lines (\d+)--(\d+)| detected at line (\d+)| in alignment at lines (\d+)--(\d+))?"
)
RE_MISSING_CHAR = re.compile(r"Missing character: There is no (.+?) in font (.+?)!")
RE_PKG_ERROR = re.compile(r"^(?:! )?(Package|Class) (\S+) Error: (.*)")
RE_LATEX_ERROR = re.compile(r"^! (?:LaTeX|Package|Class)?\s*(.*)")
RE_PAGES = re.compile(r"Output written on (\S+) \((\d+) pages?, (\d+) bytes\)")
# Three distinct ways TeX says "there is no PDF". Matching only the first one
# let a fatal svg/Inkscape failure through as VERDICT: PASS -- see the 2026-08-07
# note in the module docstring.
RE_NO_OUTPUT = re.compile(
    r"No pages of output|no output PDF file produced|Fatal error occurred"
)
# With -file-line-error, errors are emitted as "<file>:<line>: <message>" and do
# NOT begin with '!' or with 'Package'. The original parser matched only the
# bang form and therefore reported a clean table over a dead build.
RE_FILE_LINE_ERROR = re.compile(r"^(\S[^:]*):(\d+): (.+)$")

# A '(' that opens a file: followed by a path-ish token. TeX also prints bare
# '(' for grouping, so require something that looks like a filename.
RE_FILE_OPEN = re.compile(r"\((/?[^\s()\"$]*\.(?:tex|sty|cls|def|cfg|clo|ldf|fd|bbx|cbx|lbx|aux|toc|lof|lot|out|bbl))")


class FileStack:
    """Tracks which source file the log is currently inside.

    TeX marks file entry with '(name' and exit with ')'. This is a heuristic --
    unbalanced parens in package output can desync it -- so the reported file is
    best-effort and the line numbers, which come from TeX itself, are not.
    """

    def __init__(self):
        self.stack = []

    def current(self):
        return self.stack[-1] if self.stack else "<root>"

    def feed(self, line):
        i = 0
        while i < len(line):
            ch = line[i]
            if ch == "(":
                m = RE_FILE_OPEN.match(line, i)
                if m:
                    self.stack.append(m.group(1))
                    i = m.end()
                    continue
                # An unrecognised '(' still nests, or the ')' that closes it
                # would pop a real file off the stack.
                self.stack.append(None)
                i += 1
                continue
            if ch == ")":
                if self.stack:
                    self.stack.pop()
                i += 1
                continue
            i += 1

    def current_named(self):
        for entry in reversed(self.stack):
            if entry:
                return entry
        return "<root>"


class Report:
    def __init__(self):
        self.undefined_refs = OrderedDict()   # label -> (page, input line)
        self.undefined_cites = OrderedDict()  # key -> (page, input line)
        self.floats_lost = []
        self.boxes = []                       # dicts
        self.missing_chars = OrderedDict()    # (char, font) -> count
        self.errors = []                      # (kind, detail, file)
        self.pages = None
        self.output = None
        self.no_output = False

    @property
    def has_errors(self):
        return bool(self.errors) or self.no_output

    @property
    def fatal(self):
        """Exit non-zero conditions: any error class, plus undefined references."""
        return self.has_errors or bool(self.undefined_refs) or bool(self.undefined_cites)


def parse_log(log_text):
    rep = Report()
    stack = FileStack()
    lines = log_text.splitlines()

    for idx, line in enumerate(lines):
        where = stack.current_named()

        m = RE_UNDEF_REF.search(line)
        if m:
            rep.undefined_refs.setdefault(m.group(1), (m.group(2), m.group(3)))

        m = RE_UNDEF_CITE.search(line)
        if m:
            rep.undefined_cites.setdefault(m.group(1), (m.group(2), m.group(3)))

        if RE_BIBLATEX_MISSING.search(line):
            # The keys follow, one per line, until a blank-ish line.
            for follow in lines[idx + 1: idx + 40]:
                key = follow.strip()
                if not key or key.startswith("(") or "Warning" in key:
                    break
                if re.fullmatch(r"[A-Za-z0-9_:./+-]+", key):
                    rep.undefined_cites.setdefault(key, ("?", "biblatex"))

        if "Float(s) lost" in line:
            m = re.search(r"Float\(s\) lost on input line (\d+)", line)
            rep.floats_lost.append((where, m.group(1) if m else "?"))

        m = RE_OVERFULL.match(line)
        if m:
            kind, box = m.group(1), m.group(2)
            pt = m.group(4)
            badness = m.group(5)
            start = m.group(6) or m.group(8) or m.group(9)
            end = m.group(7) or m.group(10)
            rep.boxes.append({
                "kind": kind, "box": box,
                "pt": float(pt) if pt else None,
                "badness": int(badness) if badness else None,
                "file": where,
                "lines": f"{start}--{end}" if start and end else (start or "?"),
            })

        m = RE_MISSING_CHAR.search(line)
        if m:
            key = (m.group(1), m.group(2))
            rep.missing_chars[key] = rep.missing_chars.get(key, 0) + 1

        m = RE_PKG_ERROR.match(line)
        if m:
            rep.errors.append((f"{m.group(1)} {m.group(2)}", m.group(3).strip(), where))
        elif line.startswith("!"):
            detail = line[1:].strip()
            if detail and not detail.startswith("=="):
                rep.errors.append(("TeX", detail, where))
        else:
            m = RE_FILE_LINE_ERROR.match(line)
            if m and " Error:" in m.group(3):
                rep.errors.append((f"{m.group(1)}:{m.group(2)}", m.group(3).strip(), where))

        m = RE_PAGES.search(line)
        if m:
            rep.output, rep.pages = m.group(1), int(m.group(2))

        if RE_NO_OUTPUT.search(line):
            rep.no_output = True

        stack.feed(line)

    return rep


def run_latexmk(texfile, outdir, shell_escape=False, extra=None):
    cmd = [
        "latexmk", "-pdf",
        "-interaction=nonstopmode",
        "-halt-on-error",
        "-file-line-error",
        f"-outdir={outdir}",
    ]
    if shell_escape:
        cmd.append("-shell-escape")
    if extra:
        cmd.extend(extra)
    cmd.append(str(texfile))

    env = dict(os.environ)
    env.update(TEX_ENV)
    proc = subprocess.run(
        cmd, cwd=str(Path(texfile).parent), env=env,
        capture_output=True, text=True,
    )
    return proc


def fmt_table(headers, rows):
    if not rows:
        return "  (none)"
    widths = [len(h) for h in headers]
    for r in rows:
        for i, c in enumerate(r):
            widths[i] = max(widths[i], len(str(c)))
    out = ["  " + "  ".join(h.ljust(widths[i]) for i, h in enumerate(headers))]
    out.append("  " + "  ".join("-" * widths[i] for i in range(len(headers))))
    for r in rows:
        out.append("  " + "  ".join(str(c).ljust(widths[i]) for i, c in enumerate(r)))
    return "\n".join(out)


def print_report(rep, logpath, pdfpath, latexmk_rc=None):
    print("=" * 78)
    print("LATEXCHECK REPORT")
    print("=" * 78)

    print("\n[1] ERRORS (package / class / TeX)")
    print(fmt_table(["kind", "file", "detail"],
                    [(k, Path(f).name if f != "<root>" else f, d[:90]) for k, d, f in rep.errors]))

    print("\n[2] UNDEFINED REFERENCES")
    print(fmt_table(["label", "page", "input line"],
                    [(lab, p, l) for lab, (p, l) in rep.undefined_refs.items()]))

    print("\n[3] UNDEFINED CITATIONS")
    print(fmt_table(["key", "page", "input line"],
                    [(k, p, l) for k, (p, l) in rep.undefined_cites.items()]))

    print("\n[4] FLOATS LOST")
    print(fmt_table(["file", "input line"], rep.floats_lost))

    over = [b for b in rep.boxes if b["kind"] == "Overfull"]
    under = [b for b in rep.boxes if b["kind"] == "Underfull"]
    over.sort(key=lambda b: -(b["pt"] or 0))

    print(f"\n[5] OVERFULL BOXES ({len(over)})")
    print(fmt_table(["overflow pt", "box", "file", "lines"],
                    [(f"{b['pt']:.2f}" if b["pt"] else "?", b["box"],
                      Path(b["file"]).name if b["file"] != "<root>" else b["file"], b["lines"])
                     for b in over]))

    print(f"\n[6] UNDERFULL BOXES ({len(under)})")
    print(fmt_table(["badness", "box", "file", "lines"],
                    [(b["badness"] if b["badness"] is not None else "?", b["box"],
                      Path(b["file"]).name if b["file"] != "<root>" else b["file"], b["lines"])
                     for b in under]))

    print("\n[7] MISSING CHARACTERS")
    print(fmt_table(["char", "font", "count"],
                    [(c, f, n) for (c, f), n in rep.missing_chars.items()]))

    print("\n" + "-" * 78)
    print(f"  pages       : {rep.pages if rep.pages is not None else 'NO OUTPUT'}")
    print(f"  output      : {pdfpath if pdfpath and Path(pdfpath).exists() else '(not written)'}")
    print(f"  log         : {logpath}")
    print("-" * 78)

    verdict = []
    if rep.errors:
        verdict.append(f"{len(rep.errors)} error(s)")
    if rep.no_output:
        verdict.append("no PDF produced")
    # A PDF that was never written is a failed build no matter how quiet the log
    # was. Reporting PASS over a missing artefact is the exact failure this tool
    # exists to prevent.
    if pdfpath and not Path(pdfpath).exists():
        verdict.append("output PDF missing")
    if latexmk_rc not in (None, 0):
        verdict.append(f"latexmk exit {latexmk_rc}")
    if rep.undefined_refs:
        verdict.append(f"{len(rep.undefined_refs)} undefined reference(s)")
    if rep.undefined_cites:
        verdict.append(f"{len(rep.undefined_cites)} undefined citation(s)")
    print("VERDICT: " + ("FAIL - " + "; ".join(verdict) if verdict else "PASS"))
    return rep


FIXTURE = r"""
\documentclass[12pt,a4paper]{article}
\usepackage[paper=a4paper,margin=30mm]{geometry}
\begin{document}
% (1) deliberate undefined reference -- label fixture:nowhere is never defined
Cross-reference to nothing: \ref{fixture:nowhere}.

% (2) deliberate undefined citation -- key is not in any .bib
Citation to nothing: \cite{fixture:nosuchkey2026}.

% (3) deliberate overfull hbox -- an unbreakable box wider than the text block
\noindent\hbox to 0pt{\rule{200mm}{4pt}}

\end{document}
"""


def self_test():
    """Feed the guard the violations it exists to catch and watch it raise.

    PRJ93_RULES.md: an assertion nobody has seen fail is an assertion taken on
    faith. This builds a fixture carrying one undefined ref, one bad citation
    key and one overfull hbox, then asserts the parser reports all three AND
    that the tool exits non-zero.
    """
    tmp = Path(tempfile.mkdtemp(prefix="latexcheck-fixture-"))
    tex = tmp / "fixture.tex"
    tex.write_text(FIXTURE)
    outdir = tmp / "out"
    outdir.mkdir()

    print(f"[self-test] fixture at {tex}")
    proc = run_latexmk(tex, outdir)
    logpath = outdir / "fixture.log"
    if not logpath.exists():
        print("[self-test] FAIL: no log produced")
        print(proc.stdout[-3000:])
        print(proc.stderr[-2000:])
        return 1

    rep = parse_log(logpath.read_text(errors="replace"))
    print_report(rep, logpath, outdir / "fixture.pdf")

    failures = []
    if "fixture:nowhere" not in rep.undefined_refs:
        failures.append("did NOT report the undefined reference 'fixture:nowhere'")
    if "fixture:nosuchkey2026" not in rep.undefined_cites:
        failures.append("did NOT report the undefined citation 'fixture:nosuchkey2026'")
    over = [b for b in rep.boxes if b["kind"] == "Overfull" and b["box"] == "hbox"]
    if not over:
        failures.append("did NOT report an overfull hbox")
    if not rep.fatal:
        failures.append("would have EXITED ZERO on a document with all three defects")

    print("\n" + "=" * 78)
    print("SELF-TEST")
    print("=" * 78)
    checks = [
        ("undefined \\ref reported by label name",
         "fixture:nowhere" in rep.undefined_refs,
         f"fixture:nowhere -> {rep.undefined_refs.get('fixture:nowhere')}"),
        ("undefined citation reported by key",
         "fixture:nosuchkey2026" in rep.undefined_cites,
         f"fixture:nosuchkey2026 -> {rep.undefined_cites.get('fixture:nosuchkey2026')}"),
        ("overfull hbox reported with overflow in pt",
         bool(over),
         f"{over[0]['pt']}pt at {over[0]['lines']}" if over else "-"),
        ("exit code would be non-zero", rep.fatal, f"fatal={rep.fatal}"),
    ]
    for name, ok, detail in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {detail}")

    if failures:
        print("\nSELF-TEST FAILED:")
        for f in failures:
            print("  - " + f)
        return 1
    print("\nSELF-TEST PASSED - the guard has now been seen to fail on purpose.")
    shutil.rmtree(tmp, ignore_errors=True)
    return 0


def main():
    ap = argparse.ArgumentParser(description="Instrumented latexmk build check.")
    ap.add_argument("texfile", nargs="?", help="root .tex to build")
    ap.add_argument("--outdir", default=None, help="build directory (default <texdir>/build)")
    ap.add_argument("--shell-escape", action="store_true",
                    help="pass -shell-escape (needed by the svg package)")
    ap.add_argument("--self-test", action="store_true",
                    help="verify the instrument against a deliberately broken fixture")
    ap.add_argument("--allow-undefined", action="store_true",
                    help="do not fail on undefined references/citations (reporting only)")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    if not args.texfile:
        ap.error("texfile is required unless --self-test")

    tex = Path(args.texfile).resolve()
    if not tex.exists():
        print(f"no such file: {tex}", file=sys.stderr)
        return 2

    outdir = Path(args.outdir).resolve() if args.outdir else tex.parent / "build"
    outdir.mkdir(parents=True, exist_ok=True)

    proc = run_latexmk(tex, outdir, shell_escape=args.shell_escape)
    logpath = outdir / (tex.stem + ".log")
    pdfpath = outdir / (tex.stem + ".pdf")

    if not logpath.exists():
        print("BUILD PRODUCED NO LOG - latexmk itself failed:")
        print(proc.stdout[-4000:])
        print(proc.stderr[-3000:])
        return 2

    rep = parse_log(logpath.read_text(errors="replace"))
    print_report(rep, logpath, pdfpath, latexmk_rc=proc.returncode)

    if not pdfpath.exists():
        rep.no_output = True

    if proc.returncode != 0 and not rep.errors:
        # latexmk failed for a reason the log parse did not surface -- say so
        # rather than reporting a clean table over a failed build.
        print(f"\nNOTE: latexmk exited {proc.returncode} with no parsed error class.")
        print("Last stdout:")
        print(proc.stdout[-2500:])
        return 1

    fatal = rep.has_errors or (not args.allow_undefined and (rep.undefined_refs or rep.undefined_cites))
    return 1 if fatal else 0


if __name__ == "__main__":
    sys.exit(main())
