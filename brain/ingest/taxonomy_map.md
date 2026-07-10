# Taxonomy map: Square sales names to brain forecast nodes

Human-editable canonical map that aligns Square's live item and category names to
the brain's L2 category and L3 item taxonomy, so a Square pull can be scored against
the frozen forecast without matching raw strings. Authored like the World Cup
schedule: a committed table Nam (and later James) can correct by hand. The loader is
`ingest/taxonomy.py`; it fails loudly on a Square category that has no row here.

This is the EVALUATION alignment (Square sales items to brain forecast items). It is
NOT James's stock map (brain/menu items to stock keg lines, `STOCK_A6_NODE_MAP` in
`config.py`). Keep the two separate: this one conserves sales revenue across nodes;
his joins demand to kegs.

Scope note: the forecast venues are `beer_hall`, `two_river_taps`, `ellel`. The map
is venue-agnostic (a Square category or item maps the same way at any venue); the
brain node it lands on is `brain_category` or `brain_category::brain_item`.

## Category map

Every distinct Square category must appear here. `brain_category` is the L2 node it
scores against. Use `DROP` to exclude a Square category from scoring (none today).
The only non-identity row is the en-GB spelling of Uncategorised.

| square_category | brain_category | note |
|---|---|---|
| Beer | Beer | identity |
| Spirits | Spirits | identity |
| Soft Drinks | Soft Drinks | identity |
| Wine | Wine | identity |
| Happy Hour | Happy Hour | identity; the brain keeps Happy Hour as its own L2 node |
| Food | Food | identity |
| Merchandise | Merchandise | identity |
| Uncategorized | Uncategorised | en-GB spelling; the sole non-identity category row |

Coverage (June 2026 held-out pull): all 8 Square categories map, so 100 percent of
Square category net sales lands on a brain L2 node. No category is dropped.
