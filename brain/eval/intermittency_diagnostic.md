# WP2 · L3 intermittency diagnostic (beer_hall)

Demand-pattern characterisation for every L3 item node the Beer Hall hierarchy builds, over the venue's trading days only. Diagnostic only: it informs the conditional Croston/SBA evaluation (G2.2), it cannot fail.

Trading days: **Wed, Thu, Fri, Sat, Sun** (L1 units DOW-median > eps). Intermittency cutoff: **ADI >= 1.32** (Syntetos-Boylan-Croston).

| Node | n_days | zero_fraction | ADI | CV2 | Intermittent |
|---|---|---|---|---|---|
| ITEM::Beer::Lager - BH | 260 | 0.36 | 1.55 | 0.82 | yes |
| ITEM::Beer::Cider - BH | 260 | 0.11 | 1.13 | 0.87 | no |
| ITEM::Beer::Caravan of Love | 260 | 0.36 | 1.40 | 0.69 | yes |
| ITEM::Beer::OTHER | 260 | 0.02 | 1.02 | 0.52 | no |
| ITEM::Spirits::SPLASH | 260 | 0.13 | 1.15 | 2.04 | no |
| ITEM::Spirits::SMIRNOFF | 260 | 0.43 | 1.75 | 2.33 | yes |
| ITEM::Spirits::Whitley Neil | 260 | 0.60 | 1.77 | 0.91 | yes |
| ITEM::Spirits::OTHER | 260 | 0.08 | 1.09 | 1.80 | no |
| ITEM::Soft Drinks::Postmix | 260 | 0.02 | 1.02 | 0.49 | no |
| ITEM::Soft Drinks::Cordial & Soda | 260 | 0.44 | 1.79 | 0.60 | yes |
| ITEM::Soft Drinks::Fruit Shoot | 260 | 0.61 | 2.56 | 0.76 | yes |
| ITEM::Soft Drinks::OTHER | 260 | 0.32 | 1.47 | 1.06 | yes |
| ITEM::Wine::Discovery Beach Zinfandel | 260 | 0.54 | 2.11 | 0.75 | yes |
| ITEM::Wine::Alpino Pinot Grigio | 260 | 0.73 | 1.64 | 0.99 | yes |
| ITEM::Wine::Aperol Spritz | 260 | 0.70 | 2.68 | 1.13 | yes |
| ITEM::Wine::OTHER | 260 | 0.09 | 1.10 | 0.68 | no |
| ITEM::Uncategorised::Lager - BH | 260 | 0.72 | 1.07 | 0.68 | no |
| ITEM::Uncategorised::Centennial Summer Pale | 260 | 0.85 | 3.72 | 0.88 | yes |
| ITEM::Uncategorised::Lancashire  crisps | 260 | 0.88 | 1.00 | 0.30 | no |
| ITEM::Uncategorised::OTHER | 260 | 0.57 | 2.31 | 1.27 | yes |
| ITEM::Happy Hour::£4 Lager/Cider | 260 | 0.64 | 2.79 | 0.62 | yes |
| ITEM::Happy Hour::£3.50 Cask | 260 | 0.66 | 2.95 | 0.56 | yes |
| ITEM::Happy Hour::£15 FIZZ | 260 | 0.93 | 14.17 | 0.60 | yes |
| ITEM::Food::Crisps | 260 | 0.40 | 1.12 | 0.55 | no |
| ITEM::Food::Nuts | 260 | 0.58 | 1.49 | 0.65 | yes |
| ITEM::Food::Seabrook Crisps | 260 | 0.87 | 1.09 | 0.73 | no |
| ITEM::Food::OTHER | 260 | 0.46 | 1.82 | 0.45 | yes |
| ITEM::Merchandise::Lunebrew T Shirt | 260 | 0.96 | 5.30 | 0.24 | yes |
| ITEM::Merchandise::Hire Fee | 260 | 0.96 | 26.11 | 0.08 | yes |
| ITEM::Merchandise::Pool Table deposit | 260 | 0.96 | 16.22 | 0.08 | yes |

**20 of 30** item nodes classify as intermittent (ADI >= 1.32); **17** of those are non-OTHER nodes. Per G2.2, a non-zero non-OTHER count triggers the conditional Croston/SBA comparison in hierarchy/reconcile.py; adoption stays strictly by the held-out MASE rule, per node.