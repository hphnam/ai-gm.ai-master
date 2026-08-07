"""Geometry assertions every TikZ generator runs before it is allowed to write.

The boundary these enforce is stated in `brain/PRJ93_RULES.md` and is the reason this
module exists rather than a per-figure check:

    horizontal spans, overlap, origin placement  ->  asserted here, every run
    vertical extent, overfull boxes, glyph collision -> the compile, and only the compile

A generator knows the coordinates it emits, so anything computable from coordinates is
its responsibility. It does not know how many lines a label wraps to, because that is
TeX's decision from font metrics the generator never sees. Do not add a vertical check
here that guesses at line breaking; it would read as coverage and would not be.

Applied from the first draft of A-F5, A-F6 and A-F7 rather than after a defect, which is
what four revisions of F1 cost.
"""

from __future__ import annotations


class GeometryError(SystemExit):
    """Refuses the write. A figure with known-bad geometry must not reach a compile,
    because a compile that fails for a reason already known wastes the review pass."""


def assert_no_overlap(boxes: list[tuple[str, float, float]], *, what: str,
                      min_gap: float = 0.05) -> None:
    """`boxes` is [(name, lo, hi)] in cm along one axis, in drawing order.

    Checks every pair rather than only neighbours: a wide label can reach past its
    immediate neighbour into the one beyond, which a neighbours-only check misses.
    """
    ordered = sorted(boxes, key=lambda b: b[1])
    for i, (a, _, a_hi) in enumerate(ordered):
        for b, b_lo, _ in ordered[i + 1:]:
            if b_lo < a_hi - 1e-9:
                raise GeometryError(
                    f"REFUSING to write {what}: '{a}' and '{b}' overlap by "
                    f"{a_hi - b_lo:.3f} cm.")
            if b_lo - a_hi < min_gap - 1e-9:
                raise GeometryError(
                    f"REFUSING to write {what}: '{a}' and '{b}' clear by only "
                    f"{b_lo - a_hi:.3f} cm, under the {min_gap} cm minimum.")
            break  # sorted, so the next box starts later still


def assert_within(boxes: list[tuple[str, float, float]], *, what: str,
                  lo: float, hi: float) -> None:
    """Nothing may fall outside the drawing's declared horizontal extent.

    The left limb matters most: under `\\noindent` the picture origin is the text margin,
    so a node at a negative x lands in the page margin as an overfull box, and TikZ does
    not reflow to save you from it.
    """
    for name, b_lo, b_hi in boxes:
        if b_lo < lo - 1e-9 or b_hi > hi + 1e-9:
            raise GeometryError(
                f"REFUSING to write {what}: '{name}' spans [{b_lo:.3f}, {b_hi:.3f}] cm, "
                f"outside the declared [{lo}, {hi}] cm.")


def assert_no_negative_x(lines: list[str], *, what: str) -> None:
    """Belt and braces on the emitted source, catching a node the caller never modelled."""
    bad = [ln for ln in lines if " at (-" in ln]
    if bad:
        raise GeometryError(f"REFUSING to write {what}: node left of the origin:\n  "
                            + "\n  ".join(bad))


def label_box(centre: float, width: float, name: str) -> tuple[str, float, float]:
    return (name, centre - width / 2, centre + width / 2)
