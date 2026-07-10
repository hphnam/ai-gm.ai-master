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
| Coffee & Tea | Coffee & Tea | identity; Two River Taps category, no rows in the June BH/Ellel pull |
| Coffee, Hot Chocolate & Tea | Coffee, Hot Chocolate & Tea | identity; Two River Taps category, no June rows |
| Beverage | Beverage | identity; Two River Taps category, no June rows |

Coverage (June 2026 held-out pull): all 8 Square categories seen in the BH/Ellel
pull map, so 100 percent of Square category net sales lands on a brain L2 node. No
category is dropped. The three Two River Taps categories above are pre-mapped for the
July run (TRT was closed all June, so it contributes no rows here).

## Item map

Aligns a Square `item_name` to a brain L3 node. The brain keeps only the top-3
items per category plus an `OTHER` residual, so this table lists the brain NAMED
nodes (union across the three forecast venues) and the Square item that feeds each.
Any Square item not listed here falls to its category `OTHER` node, so item revenue
is conserved and the hierarchy stays coherent. A row's `square_category` is resolved
through the Category map first; an unmapped category still fails loudly (that is a
Category-map gap, not an item-map one).

Every June row matched by IDENTITY once whitespace and case are normalised: there
are no aliases to hand-author yet. When the business renames an item (see the drift
note below), add an alias row here mapping the new Square name to the existing brain
node, or leave it to fall to `OTHER`.

| square_category | square_item | brain_item | note |
|---|---|---|---|
| Beer | Caravan of Love | Caravan of Love | identity |
| Beer | Guinness Can | Guinness Can | identity |
| Beer | Lager - BH | Lager - BH | identity |
| Beer | Paulaner Helles Lager | Paulaner Helles Lager | identity |
| Beer | Poretti | Poretti | identity |
| Coffee, Hot Chocolate & Tea | Americano | Americano | identity |
| Coffee, Hot Chocolate & Tea | Cappuccino | Cappuccino | identity |
| Coffee, Hot Chocolate & Tea | Latte | Latte | identity |
| Food | Kettle Chips | Kettle Chips | identity |
| Food | Nobby's Nuts | Nobby's Nuts | identity |
| Food | Pork Scratchings | Pork Scratchings | identity |
| Food | Seabrook Crisps | Seabrook Crisps | identity |
| Happy Hour | £15 FIZZ | £15 FIZZ | identity |
| Happy Hour | £3.50 Cask | £3.50 Cask | identity |
| Happy Hour | £4 Lager/Cider | £4 Lager/Cider | identity |
| Merchandise | Hire Fee | Hire Fee | identity |
| Merchandise | Pool Table deposit | Pool Table deposit | identity |
| Soft Drinks | Cordial & Soda | Cordial & Soda | identity |
| Soft Drinks | Fruit Shoot | Fruit Shoot | identity |
| Soft Drinks | J20 | J20 | identity |
| Soft Drinks | Pop Can | Pop Can | identity |
| Soft Drinks | Postmix | Postmix | identity |
| Spirits | Baby Guinness | Baby Guinness | identity |
| Spirits | Gordon's Pink | Gordon's Pink | identity |
| Spirits | Gordons | Gordons | identity |
| Spirits | SMIRNOFF | SMIRNOFF | identity |
| Spirits | Whitley Neil | Whitley Neil | identity |
| Spirits | Whitley Neill | Whitley Neill | identity |
| Uncategorized | Ascension Cider | Ascension Cider | identity |
| Uncategorized | Breeze Pale Ale | Breeze Pale Ale | identity |
| Uncategorized | Chenin Blanc | Chenin Blanc | identity |
| Uncategorized | Custom Amount | Custom Amount | identity |
| Uncategorized | Lancashire  crisps | Lancashire  crisps | identity |
| Uncategorized | Seabrook Crisps | Seabrook Crisps | identity |
| Uncategorized | Vodka Cans | Vodka Cans | identity |
| Wine | Chardonnay | Chardonnay | identity |
| Wine | Malbec | Malbec | identity |
| Wine | Pinot Grigio | Pinot Grigio | identity |
| Wine | Prosecco | Prosecco | identity |
| Wine | Sauvignon Blanc | Sauvignon Blanc | identity |
| Wine | Serena Spumante (Fizz) | Serena Spumante (Fizz) | identity |

### Drift note (why so much lands on OTHER)

The frozen node set is the brain's HISTORICAL top-3 per category. In June the named
nodes captured only 26 percent of Beer Hall net sales and 15 percent of Ellel; the
rest fell to `OTHER`. This is taxonomy DRIFT, not a name-matching failure: June's
top sellers are different products (LuneBrew Pilsner GBP 3484, Cider - BH, Session
IPA, Lune Valley Gold), and the brain's historical number-one Beer node `Lager - BH`
sold only GBP 14.86 in June after being split into branded lines. The fix is not
more aliases; it is refreshing the brain's top-k node selection from recent sales
before the next freeze. Tracked as a flag, not patched in the eval map.

