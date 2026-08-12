#!/usr/bin/env python3
"""Test a categorical palette for colour-vision-deficiency and greyscale separation.

Built 2026-08-12 to answer one question before the LuneBrew brand palette was allowed
near a data series: does it stay readable for a deuteranope, a protanope, and a
greyscale printer? The figures currently use Okabe-Ito, which is colourblind-safe by
construction, so replacing it is a regression unless measured otherwise.

METHOD, and why each piece was chosen:

  * Dichromat simulation is Vienot, Brettel & Mollon (1999). Their reduction is EXACT
    for protanopia and deuteranopia -- the two this check is asked about -- because
    both confusion-line bundles converge on a single copunctal point, so one linear
    projection in LMS reproduces the dichromat's percept. It is not exact for
    tritanopia, which is why no tritan verdict is issued here.
  * Distance is CIEDE2000, not Euclidean RGB. RGB distance says #E5A83D and #E18200
    are far apart; a reader says they are the same orange. Perceptual distance is the
    quantity the question is actually about.
  * Greyscale is CIE L* of the luminance, which is what a monochrome laser printer
    approximates, rather than the sRGB mean of the channels.

VERDICT RULE, stated so it cannot be tuned after the fact:

  A palette passes at series-count N when, over every unordered pair of its first N
  entries, under EACH of {normal, deuteranopia, protanopia}:
      min pairwise dE00  >=  DE_FLOOR                       (absolute)
  and under greyscale:
      min pairwise dL*   >=  DL_FLOOR                       (absolute)
  and, separately, when its minima are compared against the incumbent Okabe-Ito
  sequence at the same N -- because the incumbent is the standard the figures already
  meet, and a change that lands below it is a regression whatever the absolute floor
  says. Both numbers are reported; neither is allowed to stand alone.

  DE_FLOOR = 11.0 and DL_FLOOR = 10.0 are set BEFORE any brand colour was measured,
  from the categorical-distinguishability literature rather than from this palette's
  results, and are recorded here so a later reader can see they were not fitted.

WHAT THIS TOOL CANNOT DO. It measures pairwise separation of flat patches. It says
nothing about whether a series is legible as a thin line, whether two colours of equal
separation are equally easy to NAME, or about tritanopia (see above). Redundant
encoding -- marker shape and direct labels -- is required regardless of what this
prints, and no verdict here licenses dropping it.
"""

from __future__ import annotations

import argparse
import itertools
import sys

import numpy as np

DE_FLOOR = 11.0
DL_FLOOR = 10.0

# Okabe & Ito (2008), the incumbent and the control case. Order as figures/_style.py
# uses it, so the comparison is against the sequence actually in the document.
OKABE_ITO_SEQ = ["#56B4E9", "#000000", "#009E73", "#D55E00", "#CC79A7"]

# LuneBrew_Deck_Guide_for_Agents.md 5.1, "Categorical palette ... in order".
BRAND_SEQ = ["#E5A83D", "#2F9C96", "#C0392B", "#E18200", "#A7C520", "#3F2C1B", "#8A8A86"]

# Every colour the brand kit defines (1.1), less the two near-white backgrounds, which
# cannot be a series on a white page. --search draws from this, not from 5.1's seven,
# so the question "is the kit deep enough" is asked of the whole kit.
BRAND_ALL = {
    "ink": "#111111", "ink-2": "#1D1D1B", "gold": "#E5A83D", "grey": "#8A8A86",
    "grey-2": "#5C5C58", "choc": "#3F2C1B", "pine": "#E9B028", "mango": "#E18200",
    "teal": "#2F9C96", "lime": "#A7C520", "ruby": "#C0392B",
}

# ---------------------------------------------------------------- colour plumbing

def hex_to_rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    if len(h) != 6:
        sys.exit(f"REFUSING: {h!r} is not a six-digit hex colour.")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float) / 255.0


def srgb_to_linear(c: np.ndarray) -> np.ndarray:
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c: np.ndarray) -> np.ndarray:
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


_RGB2XYZ = np.array([[0.4124564, 0.3575761, 0.1804375],
                     [0.2126729, 0.7151522, 0.0721750],
                     [0.0193339, 0.1191920, 0.9503041]])
_XYZ2RGB = np.linalg.inv(_RGB2XYZ)

# Hunt-Pointer-Estevez, normalised to D65 -- the LMS space Vienot et al. work in.
_XYZ2LMS = np.array([[0.4002, 0.7076, -0.0808],
                     [-0.2263, 1.1653, 0.0457],
                     [0.0, 0.0, 0.9182]])
_LMS2XYZ = np.linalg.inv(_XYZ2LMS)

# Vienot, Brettel & Mollon (1999), Table 1: the two dichromat projections in LMS.
_SIM = {
    "protanopia": np.array([[0.0, 2.02344, -2.52581],
                            [0.0, 1.0, 0.0],
                            [0.0, 0.0, 1.0]]),
    "deuteranopia": np.array([[1.0, 0.0, 0.0],
                              [0.494207, 0.0, 1.24827],
                              [0.0, 0.0, 1.0]]),
}

_WHITE = _RGB2XYZ @ np.array([1.0, 1.0, 1.0])


def simulate(rgb: np.ndarray, kind: str) -> np.ndarray:
    """Return the sRGB a dichromat of `kind` perceives for this colour."""
    if kind == "normal":
        return rgb
    lin = srgb_to_linear(rgb)
    lms = _XYZ2LMS @ (_RGB2XYZ @ lin)
    return linear_to_srgb(_XYZ2RGB @ (_LMS2XYZ @ (_SIM[kind] @ lms)))


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    xyz = (_RGB2XYZ @ srgb_to_linear(rgb)) / _WHITE
    f = np.where(xyz > (6 / 29) ** 3, np.cbrt(xyz), xyz / (3 * (6 / 29) ** 2) + 4 / 29)
    return np.array([116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])])


def ciede2000(lab1: np.ndarray, lab2: np.ndarray) -> float:
    """CIEDE2000, Sharma, Wu & Dalal (2005) formulation."""
    l1, a1, b1 = lab1
    l2, a2, b2 = lab2
    c1, c2 = np.hypot(a1, b1), np.hypot(a2, b2)
    cbar = (c1 + c2) / 2
    g = 0.5 * (1 - np.sqrt(cbar ** 7 / (cbar ** 7 + 25.0 ** 7))) if cbar > 0 else 0.5
    a1p, a2p = (1 + g) * a1, (1 + g) * a2
    c1p, c2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360 if (a1p or b1) else 0.0
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360 if (a2p or b2) else 0.0

    dlp = l2 - l1
    dcp = c2p - c1p
    if c1p * c2p == 0:
        dhp = 0.0
    elif abs(h2p - h1p) <= 180:
        dhp = h2p - h1p
    else:
        dhp = h2p - h1p - 360 if h2p > h1p else h2p - h1p + 360
    dHp = 2 * np.sqrt(c1p * c2p) * np.sin(np.radians(dhp) / 2)

    lbar = (l1 + l2) / 2
    cbarp = (c1p + c2p) / 2
    if c1p * c2p == 0:
        hbarp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hbarp = (h1p + h2p) / 2
    elif h1p + h2p < 360:
        hbarp = (h1p + h2p + 360) / 2
    else:
        hbarp = (h1p + h2p - 360) / 2

    t = (1 - 0.17 * np.cos(np.radians(hbarp - 30))
         + 0.24 * np.cos(np.radians(2 * hbarp))
         + 0.32 * np.cos(np.radians(3 * hbarp + 6))
         - 0.20 * np.cos(np.radians(4 * hbarp - 63)))
    dtheta = 30 * np.exp(-(((hbarp - 275) / 25) ** 2))
    rc = 2 * np.sqrt(cbarp ** 7 / (cbarp ** 7 + 25.0 ** 7)) if cbarp > 0 else 0.0
    sl = 1 + (0.015 * (lbar - 50) ** 2) / np.sqrt(20 + (lbar - 50) ** 2)
    sc = 1 + 0.045 * cbarp
    sh = 1 + 0.015 * cbarp * t
    rt = -np.sin(np.radians(2 * dtheta)) * rc

    return float(np.sqrt((dlp / sl) ** 2 + (dcp / sc) ** 2 + (dHp / sh) ** 2
                         + rt * (dcp / sc) * (dHp / sh)))


def grey_lstar(rgb: np.ndarray) -> float:
    """L* of the luminance -- what a monochrome printer renders the patch as."""
    y = float(_RGB2XYZ[1] @ srgb_to_linear(rgb))
    return float(116 * (np.cbrt(y) if y > (6 / 29) ** 3
                        else y / (3 * (6 / 29) ** 2) + 4 / 29) - 16)


# ---------------------------------------------------------------- the measurement

def measure(seq: list[str]) -> dict:
    """Minimum pairwise separation per condition, plus the pair that attains it."""
    if len(seq) < 2:
        sys.exit(f"REFUSING: a palette of {len(seq)} colour(s) has no pairs to compare. "
                 "A check that examined nothing must not report a clean result.")
    rgbs = [hex_to_rgb(h) for h in seq]
    report = {}
    for kind in ("normal", "deuteranopia", "protanopia"):
        labs = [rgb_to_lab(simulate(c, kind)) for c in rgbs]
        pairs = [(ciede2000(labs[i], labs[j]), seq[i], seq[j])
                 for i, j in itertools.combinations(range(len(seq)), 2)]
        report[kind] = min(pairs)
    ls = [grey_lstar(c) for c in rgbs]
    gpairs = [(abs(ls[i] - ls[j]), seq[i], seq[j])
              for i, j in itertools.combinations(range(len(seq)), 2)]
    report["greyscale"] = min(gpairs)
    report["_pairs"] = len(list(itertools.combinations(range(len(seq)), 2)))
    return report


def render(name: str, seq: list[str], rep: dict) -> bool:
    ok = True
    print(f"\n{name}  ({len(seq)} series, {rep['_pairs']} pairs examined)")
    print("  " + "  ".join(seq))
    for kind in ("normal", "deuteranopia", "protanopia"):
        val, a, b = rep[kind]
        floor_ok = val >= DE_FLOOR
        ok &= floor_ok
        print(f"    {kind:<14} min dE00 = {val:6.2f}   {'PASS' if floor_ok else 'FAIL'}"
              f"   (closest pair {a} / {b})")
    val, a, b = rep["greyscale"]
    floor_ok = val >= DL_FLOOR
    ok &= floor_ok
    print(f"    {'greyscale':<14} min dL*  = {val:6.2f}   {'PASS' if floor_ok else 'FAIL'}"
          f"   (closest pair {a} / {b})")
    return ok


def self_test() -> int:
    """Both directions. A guard seen only to pass has not been seen to work."""
    fails = []

    # 1. A pair nobody could confuse must pass every condition.
    rep = measure(["#000000", "#FFFFFF"])
    if not all(rep[k][0] >= DE_FLOOR for k in ("normal", "deuteranopia", "protanopia")):
        fails.append("black/white did not clear the dE floor")
    if rep["greyscale"][0] < DL_FLOOR:
        fails.append("black/white did not clear the greyscale floor")

    # 2. A pair a deuteranope genuinely confuses must collapse, and collapse hard --
    #    otherwise the simulation is not doing anything. The first fixture tried here
    #    was #009E73 against #B85C00, and it FAILED this assertion for a correct
    #    reason: those two differ mostly in LIGHTNESS, which a dichromat keeps, so
    #    their separation rises under simulation rather than falling. A confusion
    #    fixture has to vary along the red-green axis at comparable luminance.
    red_green = measure(["#FF0000", "#00FF00"])
    for kind in ("deuteranopia", "protanopia"):
        if red_green[kind][0] > red_green["normal"][0] / 2:
            fails.append(f"{kind} simulation did not collapse pure red against pure green "
                         f"({red_green['normal'][0]:.1f} -> {red_green[kind][0]:.1f})")

    # 3. Two colours differing only in hue at equal luminance must fail greyscale.
    iso = measure(["#0072B2", "#9C6F00"])
    if iso["greyscale"][0] >= DL_FLOOR:
        fails.append(f"iso-luminant pair passed greyscale at dL*={iso['greyscale'][0]:.2f}")

    # 4. Fail-closed on an input with no pairs.
    try:
        measure(["#E5A83D"])
        fails.append("a one-colour palette did not raise")
    except SystemExit:
        pass

    # 5. CIEDE2000 against a published reference pair (Sharma et al. Table 1, #1).
    got = ciede2000(np.array([50.0, 2.6772, -79.7751]),
                    np.array([50.0, 0.0, -82.7485]))
    if abs(got - 2.0425) > 0.001:
        fails.append(f"CIEDE2000 reference pair returned {got:.4f}, expected 2.0425")

    for f in fails:
        print(f"SELF-TEST FAIL: {f}")
    print(f"SELF-TEST: 5 assertions, {len(fails)} failed")
    return 1 if fails else 0


def search(n: int) -> int:
    """Exhaust every n-subset of the brand kit and rank by worst-case separation.

    Reported so the answer to "brand-derived or not" is a measurement rather than a
    preference. The score is the MINIMUM over the three colour-vision conditions of the
    minimum pairwise dE00 -- the worst pair a reader could meet, under the worst
    condition -- with the greyscale minimum carried alongside rather than folded in,
    because the two are traded against each other and averaging them hides that.
    """
    names = list(BRAND_ALL)
    subsets = list(itertools.combinations(names, n))
    scored = []
    for sub in subsets:
        seq = [BRAND_ALL[k] for k in sub]
        rep = measure(seq)
        cvd = min(rep[k][0] for k in ("normal", "deuteranopia", "protanopia"))
        scored.append((cvd, rep["greyscale"][0], sub))
    scored.sort(reverse=True)
    print(f"Searched {len(subsets)} subsets of size {n} over {len(names)} brand colours; "
          f"floors dE00 >= {DE_FLOOR}, dL* >= {DL_FLOOR}")
    print(f"\n  {'worst dE00':>10}  {'min dL*':>8}   subset")
    for cvd, dl, sub in scored[:8]:
        print(f"  {cvd:10.2f}  {dl:8.2f}   {', '.join(sub)}")
    # Ranking by dE00 alone answers "which subset separates best under CVD", which is
    # NOT the question "does any subset clear both floors". Asked of the whole set, or
    # the verdict is a claim about one row.
    both = [s for s in scored if s[0] >= DE_FLOOR and s[1] >= DL_FLOOR]
    print(f"\n  best by greyscale among those clearing the dE00 floor:")
    for cvd, dl, sub in sorted((s for s in scored if s[0] >= DE_FLOOR),
                               key=lambda s: -s[1])[:5]:
        print(f"  {cvd:10.2f}  {dl:8.2f}   {', '.join(sub)}")
    best_cvd, best_dl, best = scored[0]
    print(f"\nBest by CVD separation: {', '.join(best)} "
          f"(worst dE00 {best_cvd:.2f}, dL* {best_dl:.2f})")
    print(f"VERDICT: {len(both)} of {len(subsets)} subsets clear BOTH floors; the brand "
          f"kit {'CAN' if both else 'CANNOT'} supply {n} series clearing both")
    return 0 if both else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--series", type=int, default=5,
                    help="how many categorical series the figures actually need")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--seq", nargs="+", metavar="HEX",
                    help="measure this explicit sequence against the incumbent instead "
                         "of the kit's prescribed 5.1 order")
    ap.add_argument("--matrix", action="store_true",
                    help="print every pair, not only the closest one")
    ap.add_argument("--search", action="store_true",
                    help="ask whether ANY N-subset of the whole brand kit clears the "
                         "floors, rather than only the sequence 5.1 prescribes")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if args.search:
        return search(args.series)

    n = args.series
    if n > len(BRAND_SEQ):
        sys.exit(f"REFUSING: the brand kit lists {len(BRAND_SEQ)} categorical colours; "
                 f"{n} were asked for.")
    brand = [c if c.startswith("#") else BRAND_ALL[c] for c in args.seq] if args.seq \
        else BRAND_SEQ[:n]
    n = len(brand)
    okabe = OKABE_ITO_SEQ[:n]
    print(f"Floors set before measurement: dE00 >= {DE_FLOOR}, dL* >= {DL_FLOOR}")
    if args.matrix:
        labs = {k: [rgb_to_lab(simulate(hex_to_rgb(c), k)) for c in brand]
                for k in ("normal", "deuteranopia", "protanopia")}
        ls = [grey_lstar(hex_to_rgb(c)) for c in brand]
        print("\n  every pair of the candidate sequence")
        for i, j in itertools.combinations(range(n), 2):
            print(f"    {brand[i]} / {brand[j]}   "
                  + "  ".join(f"{k[:4]} {ciede2000(labs[k][i], labs[k][j]):6.2f}"
                              for k in labs)
                  + f"   grey dL* {abs(ls[i] - ls[j]):6.2f}")
    ctrl = measure(okabe)
    ok_ctrl = render("Okabe-Ito (incumbent, control case)", okabe, ctrl)
    test = measure(brand)
    ok_test = render("LuneBrew brand categorical (5.1)", brand, test)

    print("\nAgainst the incumbent, per condition:")
    regress = False
    for kind in ("normal", "deuteranopia", "protanopia", "greyscale"):
        d = test[kind][0] - ctrl[kind][0]
        if d < 0:
            regress = True
        print(f"    {kind:<14} {test[kind][0]:6.2f} vs {ctrl[kind][0]:6.2f}   "
              f"{d:+6.2f}  {'REGRESSION' if d < 0 else 'no regression'}")

    print(f"\nVERDICT: brand palette absolute floors {'PASS' if ok_test else 'FAIL'}; "
          f"against incumbent {'REGRESSION' if regress else 'no regression'}; "
          f"control palette floors {'PASS' if ok_ctrl else 'FAIL'}")
    return 0 if (ok_test and not regress) else 1


if __name__ == "__main__":
    sys.exit(main())
