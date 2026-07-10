"""G12.16c - taxonomy map loader contract (ingest/taxonomy).

Behavioural checks for the Square-to-brain evaluation map: category resolution,
loud failure on an unmapped category, item routing to OTHER, and revenue
conservation across the map (sum in equals sum out).
"""

from __future__ import annotations

import pandas as pd
import pytest

from ingest.taxonomy import map_category, map_item


def test_map_category_resolves_engb_spelling():
    assert map_category("Uncategorized") == "Uncategorised"


def test_map_category_identity_for_a_known_category():
    assert map_category("Beer") == "Beer"


def test_map_category_raises_on_unmapped_category():
    with pytest.raises(ValueError):
        map_category("Cocktails")


def test_map_item_named_item_lands_on_its_node():
    assert map_item("Postmix", "Soft Drinks") == "Soft Drinks::Postmix"


def test_map_item_unknown_item_routes_to_category_other():
    assert map_item("LuneBrew Pilsner", "Beer") == "Beer::OTHER"


def test_map_item_raises_on_unmapped_category():
    with pytest.raises(ValueError):
        map_item("Anything", "Cocktails")


def test_revenue_is_conserved_across_the_map():
    rows = pd.DataFrame([
        {"category": "Beer", "item": "Paulaner Helles Lager", "net": 100.0},
        {"category": "Beer", "item": "LuneBrew Pilsner", "net": 250.0},
        {"category": "Uncategorized", "item": "Breeze Pale Ale", "net": 40.0},
        {"category": "Soft Drinks", "item": "Postmix", "net": 10.0},
    ])
    rows["node"] = rows.apply(lambda r: map_item(r["item"], r["category"]), axis=1)
    assert rows.groupby("node")["net"].sum().sum() == rows["net"].sum()
