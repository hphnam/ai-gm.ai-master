#!/usr/bin/env python3
"""Read the RENDERED PDF for the formatting defects a compile log cannot see.

`latexcheck.py` reads what TeX *warned* about. This reads where ink actually
landed. The two disagree in both directions, which is the whole reason this
tool exists and is not a wrapper around the log:

  - a 2.54pt overfull box in a CENTRED float bleeds 1.27pt per side and puts
    no ink outside the text block at all -- a warning with no defect;
  - a line in appendix/project_specification.tex puts 3.61pt of real ink in
    the right margin and TeX reports NO overfull box against it -- a defect
    with no warning.

Three measurements, in the order the 2026-08-11 pass established:

  1 MARGIN SPILL   ink outside the text block. Information loss when a table
                   runs off the page; this is the only section that can FAIL.
  2 WHITE SPACE    vertical holes, reported as INNER (a hole BETWEEN content,
                   which is the defect) separately from BOTTOM (slack at the
                   foot, which under \\raggedbottom is where slack is SUPPOSED
                   to go). Summing the two together scores the remedy as the
                   disease -- it once reported gaps rising 22 -> 32 while the
                   real defect fell 10 -> 2.
  3 FLOAT DISTANCE how far each float sits from the nearest text that names
                   it, against "Try to position each table or figure close to
                   where it is first referenced" (Student Documentation,
                   Format and Presentation).

WHAT THIS DOES NOT REACH, stated so a clean run is not read as coverage. It
cannot tell a float exiled to its own page from a legitimately short section.
It cannot see a table whose cells are wrong, only one whose cells are off the
page. And section 3 cannot see a float that is never referred to by number at
all -- an absent \\ref has no syntax. Five Chapter 4 tables are in exactly that
state and section 3 reports them as UNREFERENCED rather than as placed.

The text block is DERIVED from the PDF, not assumed: justified body lines pile
up on the true margin, so the modal edge is the margin. Hardcoding a geometry
is how a checker ends up measuring a document that does not exist.

Usage:
    formatcheck.py <pdf> [--aux <main.aux>] [--body-from N] [--tolerance PT]
    formatcheck.py --self-test
"""

import argparse
import re
import sys
from collections import Counter, defaultdict

try:
    import pymupdf
except ImportError:                                    # pragma: no cover
    sys.exit("formatcheck needs pymupdf: python3 -m pip install pymupdf")

MM = 72.0 / 25.4
HEADFOOT_PT = 28.0        # running head and folio sit outside the measured block
GAP_PT = 60.0             # ~2.5 lines at 12pt/1.5; below this is ordinary skip
STUB_FRAC = 0.45
SPILL_TOL = 2.0           # pt of ink outside the block before it is a finding
MIN_LINES = 50            # fail closed below this: the scan examined nothing
KIND = {"tab": "Table", "fig": "Figure", "alg": "Algorithm"}


# ---------------------------------------------------------------- geometry

def body_lines(page):
    """Text lines on a page, excluding the running head and the folio."""
    top, bot = page.rect.y0, page.rect.y1
    out = []
    for blk in page.get_text("dict")["blocks"]:
        for line in blk.get("lines", []):
            x0, y0, x1, y1 = line["bbox"]
            if y1 < top + HEADFOOT_PT or y0 > bot - HEADFOOT_PT:
                continue
            out.append((x0, y0, x1, y1, "".join(s["text"] for s in line["spans"])))
    return out


def derive_block(doc, body_from):
    """Modal left and right edge of justified body text, per page parity.

    Returned per parity because a mirrored (non-`asymmetric`) geometry puts the
    binding margin on alternate sides. With `asymmetric` both parities agree,
    which is itself worth seeing in the output.
    """
    edges = defaultdict(lambda: ([], []))
    for n in range(body_from, doc.page_count + 1):
        for x0, _, x1, _, txt in body_lines(doc[n - 1]):
            if len(txt) < 40:          # short lines do not reach the margin
                continue
            lefts, rights = edges[n % 2]
            lefts.append(round(x0, 1))
            rights.append(round(x1, 1))
    block = {}
    for parity, (lefts, rights) in edges.items():
        if not rights:
            continue
        block[parity] = (Counter(lefts).most_common(1)[0][0],
                         Counter(rights).most_common(1)[0][0])
    total = sum(len(r) for _, r in edges.values())
    return block, total


# ------------------------------------------------------------- 1 · spill

def margin_spill(doc, block, body_from, tol):
    findings = defaultdict(list)
    for n in range(body_from, doc.page_count + 1):
        page = doc[n - 1]
        if n % 2 not in block:
            continue
        left, right = block[n % 2]
        items = []
        for blk in page.get_text("dict")["blocks"]:
            for line in blk.get("lines", []):
                for span in line["spans"]:
                    items.append((span["bbox"], span["text"][:44]))
        for drw in page.get_drawings():
            r = drw["rect"]
            if r.width < 1e4 and r.height < 1e4:
                items.append(((r.x0, r.y0, r.x1, r.y1), "<rule/graphic>"))
        for (x0, _, x1, _), txt in items:
            over = max(left - x0, x1 - right)
            if over > tol:
                findings[n].append((over, txt))
    return findings


def load_accepted(path):
    """Spills that have been RULED on, so the gate stays usable.

    Same principle as completenesscheck's `% CARRIER:` opt-out: a defect may
    only escape the gate by being DECLARED, which converts a silent failure
    into a recorded decision. A guard that fires on known-and-ruled cases is a
    guard the next person switches off.

    Keyed on the offending text, not the page, because pagination moves. Each
    entry carries a ceiling: the same defect getting WORSE is a new defect and
    still fails.
    """
    if not path:
        return []
    out = []
    for raw in open(path, errors="replace"):
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        cap, _, needle = line.partition(" ")
        out.append((float(cap), needle.strip()))
    return out


def calibration(doc, block, body_from):
    """How many body lines land ON the derived margin.

    A derived margin that few lines touch is a derived margin that is wrong,
    and every spill measured against it would be noise. This is the number
    that makes section 1 trustworthy rather than merely clean.
    """
    on, total = 0, 0
    for n in range(body_from, doc.page_count + 1):
        if n % 2 not in block:
            continue
        right = block[n % 2][1]
        for _, _, x1, _, txt in body_lines(doc[n - 1]):
            if len(txt) < 40:
                continue
            total += 1
            if abs(x1 - right) <= 0.5:
                on += 1
    return on, total


# --------------------------------------------------------- 2 · white space

def white_space(doc, lo, hi):
    rows = []
    for n in range(lo, hi + 1):
        page = doc[n - 1]
        top, bot = page.rect.y0 + HEADFOOT_PT, page.rect.y1 - HEADFOOT_PT
        ys = [(y0, y1) for _, y0, _, y1, _ in body_lines(page)]
        for drw in page.get_drawings():
            if top < drw["rect"].y0 and drw["rect"].y1 < bot:
                ys.append((drw["rect"].y0, drw["rect"].y1))
        if not ys:
            rows.append((n, 0.0, bot - top, 0.0))
            continue
        ys.sort()
        inner, reach = 0.0, ys[0][1]
        for y0, y1 in ys[1:]:
            inner = max(inner, y0 - reach)
            reach = max(reach, y1)
        low = max(y for _, y in ys)
        rows.append((n, (low - ys[0][0]) / (bot - top), inner, bot - low))
    return rows


# ------------------------------------------------------ 3 · float distance

def float_distance(aux_path, doc, body_from):
    """Distance from each float to the nearest page naming its number.

    Two traps, both of which produced confident wrong numbers before they were
    fixed, and both of which will recur in any reimplementation:

      - \\newlabel records the PRINTED folio; a PDF search returns a PHYSICAL
        index. Comparing them gave a uniform 19-20 page drift on all 37 floats,
        which was the front-matter offset. The offset is derived below.
      - excluding the float's own page reported a float sitting WITH its
        reference -- the ideal -- as maximally drifted. The caption is
        discounted instead.
    """
    labels = {}
    for m in re.finditer(r"\\newlabel\{(tab|fig|alg):([^}]+)\}\{\{([^}]*)\}\{(\d+)\}",
                         open(aux_path, errors="replace").read()):
        labels[f"{m.group(1)}:{m.group(2)}"] = (
            KIND[m.group(1)], m.group(3), int(m.group(4)))
    if not labels:
        return None, None

    probe, folio = doc.page_count // 2, None
    for blk in doc[probe].get_text("dict")["blocks"]:
        for line in blk.get("lines", []):
            txt = "".join(s["text"] for s in line["spans"]).strip()
            if txt.isdigit() and line["bbox"][1] > doc[probe].rect.y1 - 40 * MM:
                folio = int(txt)
    if folio is None:
        return None, None
    offset = (probe + 1) - folio

    rows = []
    for label, (kind, num, printed) in sorted(labels.items(), key=lambda kv: kv[1][2]):
        page, needle = printed + offset, f"{kind} {num}"
        sites = []
        for p in range(body_from - 1, doc.page_count):
            hits = len(doc[p].search_for(needle))
            if p + 1 == page:
                hits -= len(doc[p].search_for(f"{needle}:"))
            if hits > 0:
                sites.append(p + 1)
        drift = min((abs(s - page) for s in sites), default=None)
        rows.append((label, f"{kind} {num}", page, drift))
    return rows, offset


# ------------------------------------------------------------------ report

def run(pdf, aux, body_from, tol, accept):
    doc = pymupdf.open(pdf)
    if doc.page_count == 0:
        sys.exit("FAIL - refusing to report on a PDF with zero pages")

    block, measured = derive_block(doc, body_from)
    if measured < MIN_LINES or not block:
        sys.exit(f"FAIL - only {measured} body lines found from page {body_from}; "
                 "a scan this small cannot report a clean document")

    print(f"scanned {doc.page_count - body_from + 1} pages of {doc.page_count} "
          f"(body from p.{body_from}), {measured} justified lines")
    for parity in sorted(block):
        left, right = block[parity]
        side = "odd " if parity else "even"
        print(f"  text block, {side} pages: {left:.1f}pt .. {right:.1f}pt "
              f"({(right - left) / MM:.1f}mm wide)  [derived, not assumed]")

    on, total = calibration(doc, block, body_from)
    print(f"  calibration: {on} of {total} lines land on the derived right "
          f"margin ({on / total:.0%})")

    print("\n[1] MARGIN SPILL  (ink outside the text block)")
    allowed = load_accepted(accept)
    spills, accepted = margin_spill(doc, block, body_from, tol), {}
    for pg in list(spills):
        worst, txt = max(spills[pg])
        hit = next((c for c, n in allowed if n in txt and worst <= c + 1.0), None)
        if hit is not None:
            accepted[pg] = spills.pop(pg)
    for pg in sorted(spills):
        worst, txt = max(spills[pg])
        print(f"  p{pg:>4}  {worst:7.2f}pt  x{len(spills[pg]):<3} e.g. {txt!r}")
    if not spills:
        print("  (none unaccepted)")
    for pg in sorted(accepted):
        worst, txt = max(accepted[pg])
        print(f"  ACCEPTED  p{pg:>4}  {worst:7.2f}pt  {txt!r}")

    print("\n[2] WHITE SPACE  (INNER is the defect; BOTTOM is benign under "
          "\\raggedbottom)")
    rows = white_space(doc, body_from, doc.page_count)
    inner = [r for r in rows if r[2] > GAP_PT]
    stubs = [r for r in rows if r[1] < STUB_FRAC]
    print(f"  INNER gap > {GAP_PT:.0f}pt : {len(inner):3d}   {[r[0] for r in inner]}")
    print(f"  STUB    < {STUB_FRAC:.0%}    : {len(stubs):3d}   {[r[0] for r in stubs]}")
    print(f"  total INNER {sum(r[2] for r in rows):.0f}pt   "
          f"total BOTTOM {sum(r[3] for r in rows):.0f}pt (not a defect)")

    print("\n[3] FLOAT DISTANCE  (\"close to where it is first referenced\")")
    if not aux:
        print("  skipped - no --aux given")
    else:
        frows, offset = float_distance(aux, doc, body_from)
        if frows is None:
            print("  skipped - no float labels in the aux, or no folio found")
        else:
            far = [r for r in frows if r[3] is not None and r[3] >= 2]
            none = [r for r in frows if r[3] is None]
            print(f"  folio offset derived from the PDF: +{offset}")
            print(f"  {len(frows)} floats; {len(far)} sit 2+ pages from their "
                  f"nearest reference")
            for label, printed, page, drift in far:
                print(f"    p{page:>4}  {printed:<12} drift {drift}")
            if none:
                print(f"  UNREFERENCED by number ({len(none)}) - an absent \\ref "
                      "has no syntax, so check these by hand:")
                for label, printed, page, _ in none:
                    print(f"    p{page:>4}  {printed:<12} {label}")

    print("\n" + "-" * 74)
    if spills:
        print(f"VERDICT: FAIL - {len(spills)} page(s) put ink outside the text "
              f"block ({len(accepted)} further accepted). Sections 2 and 3 are "
              "advisory and do not fail the run.")
        return 1
    print(f"VERDICT: PASS - no unaccepted ink outside the text block "
          f"({len(accepted)} accepted, each ruled and capped). This says nothing "
          "about sections 2 and 3, which are advisory.")
    return 0


# --------------------------------------------------------------- self-test

def self_test():
    """Exercised in BOTH directions before the tool is trusted.

    A guard nobody has seen fail is a guard taken on faith, so this plants a
    known spill and asserts it is found, plants none and asserts none is
    found, and feeds an empty scan to confirm it refuses rather than passing.
    """
    font, size, LEFT = "helv", 11.0, 99.2
    line = "the quick brown fox jumps over the lazy dog and keeps running on"
    over = line + " and over"
    width = pymupdf.get_text_length(line, font, size)
    # The planted overshoot is whatever the longer line is wider by. An earlier
    # fixture shifted the long line LEFT so its right edge overshot by a chosen
    # amount -- which pushed its left edge 30pt into the left margin, and the
    # tool correctly reported that instead. Both lines now start on the margin.
    planted = pymupdf.get_text_length(over, font, size) - width
    # A fixture that runs off the physical page has its bbox CLIPPED, and the
    # tool then measures the page edge rather than the planted overshoot. That
    # happened; this keeps a future edit from re-introducing it silently.
    assert LEFT + width + planted < 590, \
        "self-test fixture runs off the page; its bbox would be clipped"

    def build(dirty):
        doc = pymupdf.open()
        for _ in range(3):
            page = doc.new_page(width=595, height=842)
            for i in range(24):
                page.insert_text((LEFT, 120 + i * 22), line,
                                 fontname=font, fontsize=size)
            if dirty:
                page.insert_text((LEFT, 100), over, fontname=font, fontsize=size)
        return pymupdf.open("pdf", doc.tobytes())

    dirty = build(True)
    block, measured = derive_block(dirty, 1)
    assert measured >= MIN_LINES, f"self-test built too few lines: {measured}"
    hits = margin_spill(dirty, block, 1, SPILL_TOL)
    assert len(hits) == 3, f"planted spill not found on every page: {sorted(hits)}"
    worst = max(v[0] for page in hits.values() for v in page)
    assert abs(worst - planted) < 1.0, \
        f"planted {planted:.2f}pt spill measured as {worst:.2f}pt"
    print(f"  [ok] planted {planted:.1f}pt spill found on 3 of 3 pages "
          f"(measured {worst:.2f}pt)")

    clean = build(0.0)
    block, _ = derive_block(clean, 1)
    hits = margin_spill(clean, block, 1, SPILL_TOL)
    assert not hits, f"clean fixture reported a spill: {sorted(hits)}"
    print("  [ok] clean fixture reports no spill")

    empty = pymupdf.open()
    empty.new_page(width=595, height=842)
    block, measured = derive_block(empty, 1)
    assert measured == 0 and not block, "empty scan did not measure zero"
    print("  [ok] empty scan measures zero, so run() fails closed on it")

    rows = white_space(dirty, 1, 3)
    assert all(r[3] > GAP_PT for r in rows), "bottom slack not detected"
    assert all(r[2] < GAP_PT for r in rows), "phantom inner gap in a solid block"
    print("  [ok] white space separates bottom slack from inner gap")
    print("VERDICT: PASS - self-test clean in both directions")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", nargs="?")
    ap.add_argument("--aux", help="main.aux, for section 3")
    ap.add_argument("--body-from", type=int, default=1,
                    help="first arabic-numbered page, to skip the front matter")
    ap.add_argument("--tolerance", type=float, default=SPILL_TOL)
    ap.add_argument("--accept", help="file of RULED spills; see brain/ledger/format_accepted.txt")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not a.pdf:
        ap.error("a pdf is required unless --self-test")
    return run(a.pdf, a.aux, a.body_from, a.tolerance, a.accept)


if __name__ == "__main__":
    sys.exit(main())
