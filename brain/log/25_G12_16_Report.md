# 25 - G12.16: Item and category taxonomy reconciliation (Square to brain L2/L3)

Spec: `PRJ93_Spec_G12_16_Taxonomy.md`. Branch `brain-construction`. Committed per
gate under Nam only: `0a21c75` (16a), `85b209b` (16b), `1b8fb88` (16c), and this
report (16d). No forecast changed; this is evaluation plumbing and mapping. The
frozen artefact (`1d966be`) and the served store are untouched.

## What this closes

Reports 22 and 24 could score L1 and L2 against the held-out June actuals but not
L3, because June had only been pulled at category grain and there was no canonical
map from Square's live item and category names to the brain's node taxonomy. G12.16
builds that map, pulls June at item grain, and produces the first real L3 item
accuracy number. It is the EVALUATION alignment (Square sales items to brain forecast
items). It is NOT James's stock map (brain/menu items to stock keg lines); the two
are named and kept separate (see Flags).

## G12.16a - canonical category map and mapped L2 re-score

- `ingest/taxonomy_map.md` (human-editable, like the World Cup schedule) holds the
  Category map; `ingest/taxonomy.py:map_category` parses it and FAILS LOUDLY on a
  Square category with no row, rather than silently dropping revenue.
- Vocabularies. Brain L2 (distinct `category` in `l3_item_daily`): Beer, Spirits,
  Soft Drinks, Wine, Uncategorised, Happy Hour, Food, Merchandise (Beer Hall);
  Ellel is a subset; Two River Taps adds Coffee & Tea, Coffee/Hot Chocolate & Tea,
  Beverage. Square June categories (BH + Ellel pull): Beer, Spirits, Soft Drinks,
  Happy Hour, Uncategorized, Wine, Merchandise, Food.
- The map is almost entirely identity; the SOLE non-identity row is the en-GB
  spelling `Uncategorized` to `Uncategorised`. Coverage: all 8 June Square categories
  map, so 100 percent of Square category net sales lands on a brain L2 node; nothing
  is dropped. The three Two River Taps categories are pre-mapped for the July run.
- Mapped L2 re-score (`sim/rescore_l2_mapped.py`, `june2026_l2_mapped_result.json`):
  routing the June L2 confront THROUGH the map reproduces report 22 exactly (Beer
  Hall category-total MAE 1660, Ellel 347). The map formalises the single spelling
  delta the confront had hardcoded; the numbers do not move, which is the correct
  outcome for a name-only realignment.

## G12.16b - item-grain June pull, item map, first L3 MASE

- Item-grain pull. The Square ProductMix report was pulled at item grain for June per
  venue (`location_name`, `category_name`, `item_name`, `local_date`, `net_sales`,
  `items_sold_quantity`) and landed held-out as `sim/june2026_actuals_l3_raw.json`
  (867 daily rows: Beer Hall 823, Ellel 44). Two River Taps returned no June rows
  (closed all month) and Events is out of brain scope. The item-sum reconciles to the
  L2 category pull EXACTLY (max absolute difference GBP 0.00 across every venue and
  category). Never written to the served store.
- Item map. The Item map section of `taxonomy_map.md` lists the 41 brain named nodes
  (union across the three venues) with their Square source; `map_item` routes any
  Square item not in the brain top-3 to that category's `OTHER`, conserving revenue,
  and fails loudly on an unmapped category. Every June item matched by IDENTITY once
  case and whitespace are normalised: there are zero aliases to hand-author.
- First L3 score (`sim/score_l3.py`, `june2026_l3_result.json`), per-node revenue
  MASE against the frozen L3 forecast, scale = seasonal-naive MAE of each node's
  pre-June training series from the served store (blind; store ceiling 2026-05-31):

  | venue | frozen nodes | named | scored | degenerate excl. | named-MASE mean / median | all-node MASE mean / median | named share of June revenue | conserves |
  |---|---|---|---|---|---|---|---|---|
  | beer_hall | 29 | 23 | 23 | 8 | 1.61 / 1.25 | 1.70 / 1.33 | 26 percent | yes |
  | ellel | 17 | 13 | 18 | 0 | 0.28 / 0.18 | 0.41 / 0.24 | 15 percent | yes |

  Context: Beer Hall L1 June MASE was 1.64 and its backtest 0.745, so the item-level
  median around 1.3 is worse than L1 but not catastrophic; Ellel's low numbers are a
  small, OTHER-dominated, low-variance series.

### The real finding: taxonomy drift, not name misalignment

Names align by identity everywhere they exist. The gap is that the frozen node set is
the brain's HISTORICAL top-3 per category, and June's menu had moved:

- The frozen named nodes captured only 26 percent (Beer Hall) and 15 percent (Ellel)
  of June revenue; the rest fell to `OTHER`, which is large and materially
  under-forecast (Beer Hall `Beer::OTHER` actual GBP 11,512 vs frozen GBP 5,742).
- The brain's historical number-one node `Beer::Lager - BH` sold just GBP 14.86 in
  June after being split into branded lines: `LuneBrew Pilsner` (GBP 3,484, entirely
  in OTHER), `Session IPA`, `Lune Valley Gold`, `Murphy's`.
- Two Beer Hall categories (Merchandise, Happy Hour) had no `OTHER` node in the
  frozen set at all, so June residual there was a node the forecast never modelled.

The fix is not more aliases; it is refreshing the brain's top-k node selection from
recent sales before the next freeze. Tracked as a flag, not patched into the eval
map (which must stay a faithful mirror of the frozen taxonomy for scoring).

## G12.16c - wire the map into the eval path, with tests

- `confront_june._load_actuals_l2` now aligns Square categories through
  `map_category` instead of the inline raw-string `CAT_FIX` dict. The mapped category
  set is unchanged, so the L2 confront numbers are identical; the map is now the
  single source of truth for both the L2 confront and the L3 score.
- `tests/test_taxonomy.py` (7 tests, all green): category resolves to the right brain
  category; the en-GB spelling resolves; an unmapped category raises; a named item
  lands on its node; an unknown item routes to `OTHER`; an unmapped category raises
  through `map_item`; revenue is conserved across the map (sum in equals sum out).

## Acceptance

| Check | Status |
|---|---|
| A16a category map committed, both vocabularies listed, loud-fail on unmapped, L2 re-scored through the map with coverage | PASS (100 percent coverage; L2 unchanged, correctly) |
| A16b item-grain June pulled held-out, item section built, unmatched routed to OTHER with revenue conserved, residuals reported | PASS (867 rows, reconciles GBP 0.00; 41 identity nodes; residual is the drift finding) |
| A16c first real L3 item MASE per node per venue; `taxonomy.py` helper with loud-fail and conservation tests green | PASS (BH all-MASE median 1.33, Ellel 0.24; 7 tests green) |
| A16d report + decision-log row; L3-taxonomy flag resolved/downgraded; eval-map vs James-stock-map distinction stated; store + forecast untouched; both suites green | PASS (this report; FLAG-TAXONOMY-MAP resolves the plumbing, FLAG-TAXONOMY-DRIFT carries the remainder) |

## Deviations from the spec

1. **map_item landed in gate b, not gate c.** The L3 score needs it, so it was added
   to `taxonomy.py` in 16b; gate 16c wired it into `confront_june` and added the
   formal test suite. The helper reaches its full `map_category` + `map_item` +
   loud-fail + tested state by 16c as specified.
2. **Degenerate-scale nodes excluded from the MASE aggregates.** Nodes whose pre-June
   seasonal-naive scale is below GBP 1 per day (a near-dormant historical item) make
   MASE explode on a near-zero denominator. They are excluded from the mean and
   median and counted as `n_unscoreable_degenerate` (Beer Hall 8, Ellel 0). Both mean
   and median are reported; the median is the robust headline.
3. **Scored the union of frozen nodes and actual-landing nodes.** Two Beer Hall
   categories had no frozen `OTHER` node, so June residual there had nowhere coherent
   to land. The score adds those `OTHER` nodes with frozen 0 (a node the forecast
   entirely missed) so per-venue revenue conserves exactly. Counted as
   `n_missed_other_nodes` (Beer Hall 2, Ellel 1).
4. **Two River Taps categories pre-mapped without June data.** TRT was closed all
   June, so its three extra categories carry no June rows, but they are added to the
   Category map (identity) so the map is complete for the July run and the item map's
   union of frozen named nodes resolves without a loud failure.
5. **L3 scored in the revenue (ex-VAT) domain.** The frozen L3 forecast and the A-vs-B
   split (report 23) are in revenue, so per-node MASE is revenue MASE. The item pull
   also carries units (T5), so a units-basis consumption proxy remains available for
   the stock link without a re-pull.
6. **Report numbered 25** per the log index convention (spec said "next number").

## Provenance and non-leak

Held-out actuals: Square Reporting API (MCP-SIM), ProductMix view,
`last_refresh_time` 2026-07-10. They live only in `brain/sim/june2026_actuals_l3_raw.json`
and are never written to `served_forecast` / `forecasts` / `l1_daily` /
`l3_item_daily`. The frozen forecast (`1d966be`) is unchanged; `stock_inventory.py`
is untouched. Both suites green: `.venv-forecast` 265 passed 1 skipped, `.venv` 258
passed 8 skipped.
