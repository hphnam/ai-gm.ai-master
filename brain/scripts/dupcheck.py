#!/usr/bin/env python3
"""Locate repeated word n-grams across the counted-body files.

Orientation only: it proposes candidate sites, and every candidate is then read
in both copies before anything is cut. Prints the size of what it examined, and
exits non-zero on an empty scan, per the empty-scan rule.
"""
import re
import sys
from collections import defaultdict
from pathlib import Path

N = 8  # shortest span worth calling a repetition

RE_COMMENT = re.compile(r"(?<!\\)%.*$")
RE_CMD = re.compile(r"\\[a-zA-Z]+\*?")
RE_MATH = re.compile(r"\$[^$]*\$")


def sentences(path):
    """(line_no, normalised_words) per source line, comments and markup stripped."""
    out = []
    for i, raw in enumerate(path.read_text().splitlines(), 1):
        line = RE_COMMENT.sub("", raw)
        line = RE_MATH.sub(" NUM ", line)
        line = RE_CMD.sub(" ", line)
        line = re.sub(r"[{}\[\]~\\&]", " ", line)
        words = re.findall(r"[a-z0-9']+", line.lower())
        out.append((i, words))
    return out


def main(paths):
    files = [Path(p) for p in paths]
    if not files:
        print("FAIL - nothing to scan")
        return 2

    # Flatten each file into one word stream, keeping a line number per word.
    grams = defaultdict(list)
    total_words = 0
    for f in files:
        stream, lines = [], []
        for lineno, words in sentences(f):
            for w in words:
                stream.append(w)
                lines.append(lineno)
        total_words += len(stream)
        for i in range(len(stream) - N + 1):
            key = " ".join(stream[i:i + N])
            grams[key].append((f.name, lines[i]))

    if total_words == 0:
        print("FAIL - scanned 0 words")
        return 2

    hits = {k: v for k, v in grams.items() if len({s for s, _ in v}) > 1 or len(v) > 1}

    # Collapse overlapping n-grams into maximal runs by reporting only those
    # whose left-extension is not itself repeated.
    reported = []
    for key, sites in sorted(hits.items()):
        first_words = key.split()
        # keep the longest form: skip if a superset gram covering it also repeats
        reported.append((key, sites))

    # Merge adjacent: sort by first site, drop grams whose site set is a shift of a kept one
    kept, seen_sites = [], set()
    for key, sites in sorted(reported, key=lambda kv: (kv[1][0][0], kv[1][0][1])):
        sig = tuple(sorted(sites))
        neighbour = any(
            all(abs(a[1] - b[1]) <= 2 and a[0] == b[0] for a, b in zip(sorted(sites), sorted(prev)))
            for prev in seen_sites
            if len(prev) == len(sites)
        )
        if neighbour:
            continue
        seen_sites.add(sig)
        kept.append((key, sites))

    print(f"scanned {len(files)} files, {total_words} words, n-gram length {N}")
    print(f"repeated spans: {len(kept)}")
    for key, sites in kept:
        loc = "  ".join(f"{s}:{l}" for s, l in sites)
        print(f"\n  [{loc}]\n    ...{key}...")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
