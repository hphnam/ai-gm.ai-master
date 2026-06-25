# A12 · Stock inventory — days-of-cover reorder signal

Latest snapshot **2026-06-01**, Beer Hall only (spec scope; no TRT/Ellel sheets exist — FLAG-5). Cover joins physical on-hand (kegs) to the A6 reconciled demand forecast (pints/day). Stock is a monthly *level*, not a flow, so consumption is taken from the sales-side A6 forecast, never from stock differences (FLAG-2).

Reorder rule: `days_of_cover < lead(3) + safety(2)` days (FLAG-3); order target extends 7 days beyond cover. Keg→pints uses size-aware 52.8 (30 L) / 88 (50 L, default) — refines A6's flat 88 (FLAG-4).

## Days-of-cover (core keg/cask lines mapped to a forecast A6 node)
| Product | L1 | On-hand kegs | On-hand pints | Forecast pints/day | Days cover | Reorder | Suggest kegs | A6 node |
|---|---|---|---|---|---|---|---|---|
| lunebrew caravan of love | Draught | 0.0 | 0 | 5.32 | **0.0** | ⚠ YES | 1 | Caravan of Love |

1 of 14 core keg/cask lines map to a forecast A6 node; the other 13 carry **NULL demand** (no single sales item maps to that brand, or it is not in A6's top-k node set) — surfaced as on-hand only, never a guessed cover. This is the honest scope: the cover signal is exact where demand is known and silent where it is not.

## Working capital (the inefficiency the signal targets)
Mean inventory **£6803** (min £4524 2026-01, max £11457 2026-06; CV 0.34). Draught (£2089 avg) + Cask (£807) is the largest block — bigger than Spirits (£1503) and Wine (£737). Total kegs on hand swing **11 → 66** across months with no smooth trend: reactive bulk-ordering. The cover signal converts 'order when the cellar looks empty' into 'order N kegs of X by <date>'.

## Dead-stock / dead-listing candidates
| Product | L1 | Snapshots | Core | Mean qty | Last price |
|---|---|---|---|---|---|
| t shirts merchandise | Snacks | 1 | False | 1.0 | £840.00 |
| 2 rivers spirits nominal value | Spirits | 1 | False | 1.0 | £400.00 |
| delerium red | Draught | 8 | True | 0.28 | £174.50 |
| apple cider | Draught | 8 | True | 0.26 | £150.00 |
| lunebrew broken footbridge | Draught | 1 | False | 0.0 | £150.00 |
| accidental guest | Draught | 10 | True | 0.21 | £140.00 |
| lunebrew peaches | Draught | 4 | False | 0.0 | £139.20 |
| lunebrew dew cask | Cask | 2 | False | 0.0 | £138.00 |

## Honesty flags
- **FLAG-2** Stock is a level, not a flow — consumption from A6, not stock differences.
- **FLAG-3** Lead/safety days are working assumptions — owner to confirm per beer.
- **FLAG-4** Keg→pints: 30 L→52.8, 50 L/unknown→88.
- **FLAG-5** Beer Hall only; no TRT/Ellel stock sheets exist.
- **FLAG-6** Hand-typed footers occasionally stale (Feb/Apr/May); line-item sums are authoritative.
- **FLAG-7** Median keg-cost rise is mix-confounded — indicative only.