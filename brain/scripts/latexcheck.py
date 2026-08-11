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

It also runs a static scan BEFORE the build asserting that every ``\\input``,
``\\include`` and ``\\addbibresource`` target is IN GIT, not merely on disk --
see ``scan_git_presence``.
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

# Primitive TeX errors carry no " Error:" marker. Matched as an explicit list
# rather than by treating every "<file>:<line>:" line as fatal, which would
# sweep up benign informational lines.
TEX_FATAL_PHRASES = (
    "Undefined control sequence",
    "Emergency stop",
    "Missing $ inserted",
    "Missing { inserted",
    "Missing } inserted",
    "Missing \\endgroup inserted",
    "Runaway argument",
    "Runaway definition",
    "Paragraph ended before",
    "File ended while scanning",
    "Too many }'s",
    "Extra }, or forgotten",
    "Argument of",
    "TeX capacity exceeded",
    "Dimension too large",
    "Illegal unit of measure",
    "Misplaced alignment tab",
)


def _is_tex_fatal(message):
    return any(p in message for p in TEX_FATAL_PHRASES)

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
            # Under -file-line-error a fatal TeX error is "<file>:<line>: <msg>".
            # Only LaTeX/package errors carry " Error:"; the primitive TeX ones
            # do not, so matching on that substring alone missed "Undefined
            # control sequence" entirely -- found by the extended fixture, where
            # only the no-PDF check caught that case.
            if m and (" Error:" in m.group(3) or _is_tex_fatal(m.group(3))):
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


# --- Source files that are on disk but not in git -----------------------------
#
# WHY THIS EXISTS. On 2026-08-11 origin/main carried
# `\addbibresource{ref_additions.bib}` for a file an Overleaf-side commit had
# deleted from the tree. Every pre-flight passed, because the deleted file was
# still sitting in the working clone -- so biber read it, every citation
# resolved, and the check reported a document that a fresh checkout could not
# build. That is the stale `main-words.sum` failure exactly: a build that passes
# because of working-directory state rather than committed state.
#
# The build cannot catch this by construction. TeX resolves against the
# filesystem and git is not the filesystem, so the ONLY moment the two can be
# compared is before the compiler runs.
#
# Three outcomes, and the middle one is the point:
#   TRACKED  - in the index. Fine.
#   IGNORED  - matched by .gitignore. Fine, and REPORTED, because an untracked
#              target has to be a DECLARED absence rather than a silent one.
#              `main-words.sum` is the legitimate case: a build artefact written
#              by \write18 on every compile. This is the same device as
#              completenesscheck's `% CARRIER:` opt-out.
#   UNTRACKED- on disk, in no index, matched by no ignore rule. FAILS. Nobody
#              can tell an in-progress file from one git has silently lost.
#   MISSING  - not on disk at all. FAILS.
RE_TEX_INPUT = re.compile(
    r"\\(input|include|addbibresource)\s*\{([^}]*)\}"
)
# A comment kills the rest of the line, but an ESCAPED percent does not. `%.*`
# gets this wrong and has already cost this project a wrong word count.
RE_TEX_COMMENT = re.compile(r"(?<!\\)%.*$")


def _git(repo, *args):
    proc = subprocess.run(["git", "-C", str(repo), *args],
                          capture_output=True, text=True)
    return proc.returncode, proc.stdout.strip()


def _resolve_target(raw, base, kind):
    """LaTeX's own resolution rules.

    `base` is the ROOT document's directory, not the including file's. TeX
    resolves \\input against the working directory it was launched in, so
    `figures/x` inside `chapters/methodology.tex` means `figures/x` from the
    root -- NOT `chapters/figures/x`. Resolving against the including file
    invented ten missing files on the first run of this check against the real
    document, which is the "a guard that cries wolf gets switched off" case.
    """
    p = (base / raw)
    if kind == "addbibresource":
        return p
    return p if p.suffix else p.with_suffix(".tex")


def scan_git_presence(texfile):
    """Walk \\input from the root and classify every target against the index.

    Returns (rows, scanned, errors). `rows` is every target found; `errors` is
    the subset that fails. Follows \\input recursively so a target named three
    files deep is checked too.
    """
    root = Path(texfile).resolve()
    repo_dir = root.parent
    rc, toplevel = _git(repo_dir, "rev-parse", "--show-toplevel")
    if rc != 0:
        return [], 0, ["not a git work tree - presence check SKIPPED, not passed"]
    repo = Path(toplevel)

    rc, tracked_out = _git(repo, "ls-files")
    tracked = {(repo / line).resolve() for line in tracked_out.splitlines() if line}

    rows, seen, queue = [], {root}, [root]
    while queue:
        current = queue.pop(0)
        try:
            text = current.read_text(errors="replace")
        except OSError:
            continue
        for line in text.splitlines():
            line = RE_TEX_COMMENT.sub("", line)
            for kind, raw in RE_TEX_INPUT.findall(line):
                raw = raw.strip()
                if not raw:
                    continue
                target = _resolve_target(raw, root.parent, kind)
                resolved = target.resolve()
                # Ignore-status is checked FIRST and on the PATH, because a
                # declared build artefact is legitimately absent before the
                # build that writes it -- `main-words.sum` is written by
                # \write18 during the very run this scan precedes.
                if _git(repo, "check-ignore", "-q", str(target))[0] == 0:
                    status = "IGNORED"
                elif resolved in tracked:
                    status = "TRACKED"
                elif not target.exists():
                    status = "MISSING"
                else:
                    status = "UNTRACKED"
                rows.append((status, kind, str(target.relative_to(repo))
                             if repo in target.parents else str(target),
                             current.name))
                if status != "MISSING" and kind in ("input", "include") \
                        and resolved not in seen:
                    seen.add(resolved)
                    queue.append(target)

    errors = [r for r in rows if r[0] in ("MISSING", "UNTRACKED")]
    return rows, len(rows), errors


def print_git_presence(rows, scanned, errors):
    print("\n[0] SOURCE FILES vs GIT")
    if scanned == 0 and errors:
        # A check that examined nothing must not be able to report clean.
        print("  " + errors[0])
        return
    shown = [r for r in rows if r[0] != "TRACKED"]
    print(fmt_table(["status", "directive", "target", "named in"], shown)
          if shown else "  (all targets tracked)")
    print(f"  scanned {scanned} target(s); "
          f"{sum(1 for r in rows if r[0]=='TRACKED')} tracked, "
          f"{sum(1 for r in rows if r[0]=='IGNORED')} declared-ignored, "
          f"{len(errors)} failing")


def print_report(rep, logpath, pdfpath, latexmk_rc=None, git_presence=None):
    print("=" * 78)
    print("LATEXCHECK REPORT")
    print("=" * 78)

    git_errors = []
    if git_presence is not None:
        rows, scanned, git_errors = git_presence
        print_git_presence(rows, scanned, git_errors)
        if scanned == 0 and git_errors:   # skipped, not failed
            git_errors = []

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
    if git_errors:
        verdict.append(f"{len(git_errors)} source file(s) not in git")
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

# A clean control. Without it the suite cannot distinguish "the guard works"
# from "the guard fails on everything", which are indistinguishable from a
# table of red rows.
FIXTURE_CLEAN = r"""
\documentclass[12pt,a4paper]{article}
\begin{document}
A clean page with nothing wrong in it.
\end{document}
"""

# --- Builds that DIE rather than warn -----------------------------------------
#
# WHY THESE EXIST. The original fixture tested only the three warning classes the
# parser was written to find, and the tool then reported "VERDICT: PASS" over a
# real build that produced no PDF at all (svg/Inkscape, 2026-08-07). A fixture
# containing only anticipated failures tests the author's imagination, not the
# instrument. These cases make the compiler die in ways the parser was NOT
# designed around, and assert the tool still exits non-zero and still refuses to
# say PASS.

FIXTURE_NO_END = r"""
\documentclass[12pt,a4paper]{article}
\begin{document}
This document never closes -- there is no \string\end{document} below.
"""

FIXTURE_UNDEFINED_CS = r"""
\documentclass[12pt,a4paper]{article}
\begin{document}
Text, then an undefined control sequence: \thisControlSequenceIsNotDefined
\end{document}
"""

FIXTURE_MISSING_ENV = r"""
\documentclass[12pt,a4paper]{article}
% amsmath is deliberately NOT loaded, so `align' is undefined.
\begin{document}
\begin{align}
  x &= y \\
  a &= b
\end{align}
\end{document}
"""

FIXTURE_MISSING_PACKAGE = r"""
\documentclass[12pt,a4paper]{article}
\usepackage{thispackagedoesnotexist2026}
\begin{document}
Text.
\end{document}
"""

FIXTURE_RUNAWAY_BRACE = r"""
\documentclass[12pt,a4paper]{article}
\begin{document}
\textbf{This brace is never closed and the file ends inside the group.
\end{document}
"""

# name -> (source, must_exit_nonzero, expect_no_pdf)
FIXTURE_CASES = [
    ("clean-control",          FIXTURE_CLEAN,           False, False),
    ("warnings-ref-cite-box",  FIXTURE,                 True,  False),
    ("missing-end-document",   FIXTURE_NO_END,          True,  None),
    ("undefined-control-seq",  FIXTURE_UNDEFINED_CS,    True,  True),
    ("missing-environment",    FIXTURE_MISSING_ENV,     True,  True),
    ("missing-package-file",   FIXTURE_MISSING_PACKAGE, True,  True),
    ("runaway-open-brace",     FIXTURE_RUNAWAY_BRACE,   True,  None),
]


# name -> (helper on disk?, helper tracked?, gitignored?, declare a missing bib?,
#          want non-zero exit)
GIT_PRESENCE_CASES = [
    # The 2026-08-11 defect itself: on disk, in no index, matched by no ignore
    # rule. The build is green and a fresh checkout cannot reproduce it.
    ("untracked-input",    True,  False, False, False, True),
    # The bib resource declared for a file the tree does not carry at all.
    ("missing-bibresource", True, True,  False, True,  True),
    # Control 1: everything tracked. Distinguishes a working guard from one that
    # fails on everything.
    ("all-tracked",        True,  True,  False, False, False),
    # Control 2: untracked BUT declared in .gitignore -- `main-words.sum`, which
    # is written by \write18 on every compile and must stay untracked. A guard
    # that failed this would be switched off within a week.
    ("declared-ignored",   True,  False, True,  False, False),
]


def git_presence_self_test():
    """Both directions, in a real git repo, per the assertion rule."""
    tmp = Path(tempfile.mkdtemp(prefix="latexcheck-gitfixture-"))
    rows, failures = [], []

    for name, on_disk, track, ignore, missing_bib, want_nonzero in GIT_PRESENCE_CASES:
        repo = tmp / name
        repo.mkdir(parents=True)
        subprocess.run(["git", "-C", str(repo), "init", "-q"], check=True)
        subprocess.run(["git", "-C", str(repo), "config", "user.email", "t@t"], check=True)
        subprocess.run(["git", "-C", str(repo), "config", "user.name", "t"], check=True)

        bib = "\\addbibresource{gone.bib}" if missing_bib else ""
        (repo / "main.tex").write_text(
            "\\documentclass[12pt,a4paper]{article}\n"
            f"{bib}\n"
            "\\begin{document}\n\\input{helper}\n\\end{document}\n"
        )
        if on_disk:
            (repo / "helper.tex").write_text("Helper text.\n")
        if ignore:
            (repo / ".gitignore").write_text("helper.tex\n")

        subprocess.run(["git", "-C", str(repo), "add", "main.tex"], check=True)
        if ignore:
            subprocess.run(["git", "-C", str(repo), "add", ".gitignore"], check=True)
        if track:
            subprocess.run(["git", "-C", str(repo), "add", "helper.tex"], check=True)
        subprocess.run(["git", "-C", str(repo), "commit", "-q", "-m", "f"], check=True)

        outdir = repo / "out"
        outdir.mkdir()
        proc = subprocess.run(
            [sys.executable, str(Path(__file__).resolve()), str(repo / "main.tex"),
             "--outdir", str(outdir), "--allow-undefined"],
            capture_output=True, text=True,
        )
        verdict_line = next(
            (l for l in proc.stdout.splitlines() if l.startswith("VERDICT:")),
            "(no VERDICT line)",
        )
        ok = (proc.returncode != 0) if want_nonzero else (proc.returncode == 0)
        if not ok:
            failures.append(f"{name}: expected "
                            f"{'non-zero' if want_nonzero else 'zero'} exit, "
                            f"got {proc.returncode}")
        if want_nonzero and "PASS" in verdict_line:
            failures.append(f"{name}: reported PASS over a target that is not in git")
            ok = False
        # The scan must say what it covered. A verdict over an unstated scope is
        # the empty-scan failure wearing a clean result.
        if "scanned " not in proc.stdout:
            failures.append(f"{name}: no scanned-count line - scope unstated")
            ok = False

        rows.append((name, proc.returncode,
                     verdict_line.replace("VERDICT: ", "")[:46],
                     "PASS" if ok else "FAIL"))

    print("\n" + "=" * 78)
    print("GIT-PRESENCE SELF-TEST")
    print("=" * 78)
    print(fmt_table(["case", "exit", "verdict", "result"], rows))
    if failures:
        print("\nGIT-PRESENCE SELF-TEST FAILED:")
        for f in failures:
            print("  - " + f)
        return 1, failures
    shutil.rmtree(tmp, ignore_errors=True)
    return 0, []


def self_test():
    """Feed the guard the violations it exists to catch and watch it raise.

    PRJ93_RULES.md: an assertion nobody has seen fail is an assertion taken on
    faith. Two things this suite does deliberately:

    1. It runs the REAL CLI as a subprocess and checks the ACTUAL process exit
       code. An earlier version asserted the internal `rep.fatal` flag instead,
       which is one step removed from the guarantee callers depend on -- and the
       tool did in fact once print PASS while the build produced no PDF.
    2. It includes builds that DIE, not only builds that warn, plus a clean
       control. Anticipated failures alone test the author's imagination; the
       clean control is what distinguishes a working guard from one that simply
       fails on everything.
    """
    tmp = Path(tempfile.mkdtemp(prefix="latexcheck-fixture-"))
    rows = []
    failures = []

    for name, source, want_nonzero, expect_no_pdf in FIXTURE_CASES:
        case_dir = tmp / name
        case_dir.mkdir(parents=True)
        tex = case_dir / "fixture.tex"
        tex.write_text(source)
        outdir = case_dir / "out"
        outdir.mkdir()

        proc = subprocess.run(
            [sys.executable, str(Path(__file__).resolve()), str(tex),
             "--outdir", str(outdir)],
            capture_output=True, text=True,
        )
        rc = proc.returncode
        pdf = outdir / "fixture.pdf"
        pdf_written = pdf.exists()
        verdict_line = next(
            (l for l in proc.stdout.splitlines() if l.startswith("VERDICT:")),
            "(no VERDICT line)",
        )

        ok = (rc != 0) if want_nonzero else (rc == 0)
        if not ok:
            failures.append(
                f"{name}: expected {'non-zero' if want_nonzero else 'zero'} exit, got {rc}"
            )
        # Where the build is expected to produce nothing, a PASS verdict would be
        # the exact regression this suite exists to prevent.
        if expect_no_pdf is True:
            if pdf_written:
                failures.append(f"{name}: expected NO pdf, but one was written")
                ok = False
            if "PASS" in verdict_line:
                failures.append(f"{name}: reported PASS over a build with no PDF")
                ok = False

        rows.append((name, rc, "yes" if pdf_written else "no",
                     verdict_line.replace("VERDICT: ", "")[:46],
                     "PASS" if ok else "FAIL"))

    print("=" * 78)
    print("LATEXCHECK SELF-TEST")
    print("=" * 78)
    print(fmt_table(["case", "exit", "pdf", "verdict", "result"], rows))

    git_rc, git_failures = git_presence_self_test()
    failures.extend(git_failures)

    if failures:
        print("\nSELF-TEST FAILED:")
        for f in failures:
            print("  - " + f)
        return 1
    print("\nSELF-TEST PASSED - the guard has been seen to fail on purpose on "
          f"{sum(1 for c in FIXTURE_CASES if c[2])} broken builds and "
          f"{sum(1 for c in GIT_PRESENCE_CASES if c[5])} git-absent targets, "
          "and to pass a clean build, a tracked tree and a declared-ignored file.")
    shutil.rmtree(tmp, ignore_errors=True)
    return git_rc


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

    # Before the compiler runs: TeX resolves against the filesystem, so this is
    # the only moment the filesystem and the index can be compared.
    git_presence = scan_git_presence(tex)

    proc = run_latexmk(tex, outdir, shell_escape=args.shell_escape)
    logpath = outdir / (tex.stem + ".log")
    pdfpath = outdir / (tex.stem + ".pdf")

    if not logpath.exists():
        print("BUILD PRODUCED NO LOG - latexmk itself failed:")
        print_git_presence(*git_presence)
        print(proc.stdout[-4000:])
        print(proc.stderr[-3000:])
        return 2

    rep = parse_log(logpath.read_text(errors="replace"))
    print_report(rep, logpath, pdfpath, latexmk_rc=proc.returncode,
                 git_presence=git_presence)

    if not pdfpath.exists():
        rep.no_output = True

    if proc.returncode != 0 and not rep.errors:
        # latexmk failed for a reason the log parse did not surface -- say so
        # rather than reporting a clean table over a failed build.
        print(f"\nNOTE: latexmk exited {proc.returncode} with no parsed error class.")
        print("Last stdout:")
        print(proc.stdout[-2500:])
        return 1

    _, git_scanned, git_errors = git_presence
    fatal = (rep.has_errors
             or (not args.allow_undefined and (rep.undefined_refs or rep.undefined_cites))
             or (git_scanned > 0 and git_errors))
    return 1 if fatal else 0


if __name__ == "__main__":
    sys.exit(main())
