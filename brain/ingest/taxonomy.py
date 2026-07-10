"""Loader for the Square-to-brain taxonomy map (`ingest/taxonomy_map.md`).

Single source of truth the confront/eval scripts use to align a Square pull to
brain nodes, replacing raw-string category matching. Loud-fail contract: an
unmapped Square category raises rather than silently dropping revenue.

This is the EVALUATION map (Square sales items to brain forecast items). It is
distinct from James's stock map (brain/menu items to stock keg lines). See the
header of taxonomy_map.md.

Run nothing here; import `map_category` (and, from G12.16b, `map_item`).
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

MAP_PATH = Path(__file__).with_name("taxonomy_map.md")

_DROP = "DROP"


def _norm(s: str) -> str:
    """Casefold and collapse internal whitespace for a match key."""
    return re.sub(r"\s+", " ", str(s).strip()).casefold()


def _parse_table(text: str, heading: str) -> list[list[str]]:
    """Return the data rows (cells) of the pipe table under a `## heading`."""
    lines = text.splitlines()
    rows: list[list[str]] = []
    in_section = False
    seen_header = False
    for line in lines:
        if line.startswith("## "):
            in_section = _norm(line[3:]) == _norm(heading)
            seen_header = False
            continue
        if not in_section:
            continue
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if not seen_header:
            seen_header = True  # first table row is the column header
            continue
        if set("".join(cells)) <= set("-: "):
            continue  # markdown separator row
        rows.append(cells)
    return rows


@lru_cache(maxsize=1)
def _category_map() -> dict[str, str]:
    """normalised square_category -> brain_category (or _DROP)."""
    text = MAP_PATH.read_text()
    out: dict[str, str] = {}
    for cells in _parse_table(text, "Category map"):
        if len(cells) < 2:
            continue
        square, brain = cells[0], cells[1]
        out[_norm(square)] = brain
    if not out:
        raise ValueError(f"taxonomy_map.md has no Category map rows at {MAP_PATH}")
    return out


def map_category(square_category: str) -> str | None:
    """Brain L2 category for a Square category. Returns None for a DROP row.

    Raises ValueError on a Square category with no row in taxonomy_map.md, so a
    new/renamed Square category surfaces loudly instead of dropping revenue.
    """
    key = _norm(square_category)
    cmap = _category_map()
    if key not in cmap:
        raise ValueError(
            f"unmapped Square category {square_category!r}: add a row to the "
            f"Category map in {MAP_PATH} (or map it to DROP with a reason)"
        )
    brain = cmap[key]
    return None if _norm(brain) == _norm(_DROP) else brain


@lru_cache(maxsize=1)
def _item_map() -> dict[tuple[str, str], str]:
    """(brain_category, normalised square_item) -> brain_item (a named node)."""
    text = MAP_PATH.read_text()
    out: dict[tuple[str, str], str] = {}
    for cells in _parse_table(text, "Item map"):
        if len(cells) < 3:
            continue
        square_cat, square_item, brain_item = cells[0], cells[1], cells[2]
        bcat = map_category(square_cat)  # loud-fail on an unmapped category
        if bcat is None:
            continue  # DROP category: item is not scored
        out[(bcat, _norm(square_item))] = brain_item
    return out


def map_item(square_item: str, square_category: str) -> str | None:
    """Brain L3 node (`brain_category::brain_item`) for a Square item.

    Resolves the category first (raises on an unmapped category, returns None for a
    DROP category). A Square item listed in the Item map lands on its named node;
    anything else in a mapped category falls to that category's `OTHER` node, so
    item revenue is conserved. Venue-agnostic: a caller scoring one venue keeps only
    the nodes in that venue's frozen set and folds the rest into `OTHER`.
    """
    bcat = map_category(square_category)  # loud-fail on unmapped category
    if bcat is None:
        return None
    brain_item = _item_map().get((bcat, _norm(square_item)), "OTHER")
    return f"{bcat}::{brain_item}"
