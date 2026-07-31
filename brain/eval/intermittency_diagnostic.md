# WP2 · L3 intermittency diagnostic (beer_hall)

Demand-pattern characterisation for every L3 item node the Beer Hall hierarchy builds, over the venue's trading days only. Diagnostic only: it informs the conditional Croston/SBA evaluation (G2.2), it cannot fail.

Trading days: **Wed, Thu, Fri, Sat, Sun** (L1 units DOW-median > eps). Intermittency cutoff: **ADI >= 1.3333** (Kostenko-Hyndman corrected p = 4/3; the old SBC 1.32 gate classifies the same nodes here, no node lies in the affected 1.32 to 1.3333 band). The SBA column is the KH selection rule CV2 > 2 - (3/2)ADI.

| Node | n_days | zero_fraction | ADI | CV2 | Intermittent | KH selects |
|---|---|---|---|---|---|---|
| ITEM::Beer::Lager - BH | 285 | 0.41 | 1.59 | 0.84 | yes | SBA |
| ITEM::Beer::Cider - BH | 285 | 0.10 | 1.11 | 0.87 | no | SBA |
| ITEM::Beer::Lune Valley Gold | 285 | 0.36 | 1.56 | 0.70 | yes | SBA |
| ITEM::Beer::OTHER | 285 | 0.02 | 1.02 | 0.55 | no | SBA |
| ITEM::Spirits::SPLASH | 285 | 0.13 | 1.14 | 1.96 | no | SBA |
| ITEM::Spirits::SMIRNOFF | 285 | 0.42 | 1.71 | 2.24 | yes | SBA |
| ITEM::Spirits::Gordons | 285 | 0.56 | 2.24 | 1.99 | yes | SBA |
| ITEM::Spirits::OTHER | 285 | 0.08 | 1.09 | 1.87 | no | SBA |
| ITEM::Soft Drinks::Postmix | 285 | 0.01 | 1.01 | 0.49 | no | SBA |
| ITEM::Soft Drinks::Cordial & Soda | 285 | 0.42 | 1.74 | 0.60 | yes | SBA |
| ITEM::Soft Drinks::Fruit Shoot | 285 | 0.60 | 2.49 | 0.76 | yes | SBA |
| ITEM::Soft Drinks::OTHER | 285 | 0.29 | 1.41 | 1.32 | yes | SBA |
| ITEM::Wine::Discovery Beach Zinfandel | 285 | 0.53 | 2.10 | 0.72 | yes | SBA |
| ITEM::Wine::Aperol Spritz | 285 | 0.70 | 2.69 | 2.00 | yes | SBA |
| ITEM::Wine::Sauvignon Blanc | 285 | 0.74 | 1.50 | 0.61 | yes | SBA |
| ITEM::Wine::OTHER | 285 | 0.08 | 1.09 | 0.84 | no | SBA |
| ITEM::Uncategorised::Lager - BH | 285 | 0.75 | 1.07 | 0.68 | no | SBA |
| ITEM::Uncategorised::Centennial Summer Pale | 285 | 0.86 | 3.72 | 0.88 | yes | SBA |
| ITEM::Uncategorised::Breeze Pale Ale | 285 | 0.90 | 1.00 | 0.54 | no | SBA |
| ITEM::Uncategorised::OTHER | 285 | 0.49 | 1.97 | 2.57 | yes | SBA |
| ITEM::Happy Hour::£4 Lager/Cider | 285 | 0.64 | 2.76 | 0.63 | yes | SBA |
| ITEM::Happy Hour::£3.50 Cask | 285 | 0.66 | 2.94 | 0.55 | yes | SBA |
| ITEM::Happy Hour::£1 SHOTS ( Antica Sambuca / Jägermeíster / Blue Agave ) | 285 | 1.00 | n/a | n/a | no | Croston |
| ITEM::Happy Hour::OTHER | 285 | 0.92 | 12.27 | 0.62 | yes | SBA |
| ITEM::Food::Crisps | 285 | 0.45 | 1.12 | 0.55 | no | SBA |
| ITEM::Food::Nuts | 285 | 0.62 | 1.49 | 0.65 | yes | SBA |
| ITEM::Food::Seabrook Crisps | 285 | 0.88 | 1.09 | 0.73 | no | SBA |
| ITEM::Food::OTHER | 285 | 0.47 | 1.87 | 0.43 | yes | SBA |
| ITEM::Merchandise::Lunebrew T Shirt | 285 | 0.96 | 23.73 | 0.24 | yes | SBA |
| ITEM::Merchandise::Hire Fee | 285 | 0.96 | 23.90 | 0.12 | yes | SBA |
| ITEM::Merchandise::Caravan T-shirt | 285 | 0.98 | 4.20 | 0.15 | yes | SBA |
| ITEM::Merchandise::OTHER | 285 | 0.94 | 11.93 | 0.37 | yes | SBA |

**21 of 32** item nodes classify as intermittent (ADI >= 1.3333); **16** of those are non-OTHER nodes. Per G2.2, a non-zero non-OTHER count triggers the conditional Croston/SBA comparison in hierarchy/reconcile.py; adoption stays strictly by the held-out MASE rule, per node.

**Selection is unanimous by construction (31 of 32 nodes select SBA).** This is a property of the scheme, not of the estate, and should not be read as a finding: the intermittency cutoff is ADI >= 4/3 and 2 - (3/2)(4/3) = 0 exactly, so the selection threshold is non-positive for every node at or above the cutoff while CV2 >= 0 always. Classified intermittent therefore entails selects-SBA. Any node reported as Croston here is one the rule does not govern - a node below the cutoff, or one whose ADI/CV2 are undefined because it never sold.

**ADI blind spot (noted):** ADI measures the spacing between successive demands, so an item that sold densely for a short season and then went dead (for example ITEM::Uncategorised::Breeze Pale Ale, zero_fraction 0.90 with ADI 1.00) classifies as non-intermittent. Such obsolescence patterns are the Teunter-Syntetos-Babai case, out of scope here, and they do not affect the WP2 outcome because Croston lost on every node that did classify as intermittent.