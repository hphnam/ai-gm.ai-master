# PRJ93 — Part 2 pre-fill for James (Beer Hall keg → till-item mapping)

Extraction output for the left columns of Part 2 in
`PRJ93_Stock_Data_Request_for_James.md`. Read-only pull from the brain's DuckDB store
(`brain/store/brain.duckdb`) and the raw bar-stock sheets (`brain/data/stock/*.xlsx`).
No code or data was modified.

## Count check

`stock_cover` holds **14** core Beer Hall rows; **1** is mapped
(`lunebrew caravan of love` → `Caravan of Love`), leaving exactly **13** unmapped
(`a6_node IS NULL`). Matches the spec. All 14 are core (`is_core = true`,
`n_snapshots` 6–10 ≥ `STOCK_CORE_MIN_SNAPSHOTS = 6`), and the single mapping is the sole
entry in `config.STOCK_A6_NODE_MAP`. No discrepancy.

## Keg-size source

Taken from the A11 `keg_litres` column (`stock_product_master`, corroborated by
`stock_panel`). Only 4 lines carry a recorded volume; the other 9 are null in both
tables (their `stock_cover.pints_per_keg` is the 88 default =
`config.PINTS_PER_KEG_DEFAULT`), so they are marked **unknown**.

The raw `.xlsx` sheets have **no supplier / brewery column** (headers are Product /
Quantity / Price / Total on hand only), so the Supplier column is left blank — that is
what we are asking James for.

---

## (a) Part 2 table — pre-filled left columns

| Keg line (from stock sheet) | Keg size (L) | Supplier | Sold on the till as (button / item name) | If pooled: other kegs under that button, or rough share | Notes |
|---|---|---|---|---|---|
| Accidental Guest (Draught) | 30 |  |  |  |  |
| Alcohol Free (Draught) | unknown |  |  |  |  |
| Becks Vier Keg (Draught) | unknown |  |  |  |  |
| Bud Light Keg (Draught) | unknown |  |  |  |  |
| Delerium Red (Draught) | unknown |  |  |  |  |
| LuneBrew Guest (Draught) | 30 |  |  |  |  |
| LuneBrew Lune Valley Gold (Cask) | unknown |  |  |  |  |
| LuneBrew Pale (Draught) | 30 |  |  |  |  |
| LuneBrew Pale Ale (Cask) | unknown |  |  |  |  |
| LuneBrew Session IPA (Draught) | unknown |  |  |  |  |
| LuneBrew Session IPA (Cask) | unknown |  |  |  |  |
| Murphys Stout (Draught) | unknown |  |  |  |  |
| Paulaner Lager (Draught) | 50 |  |  |  |  |

`LuneBrew Session IPA` appears twice because the stock sheets count it as **two physical
lines** — a keg (Draught) and a cask — which draw down separately. Keep both rows so
James can attribute each.

---

## (b) Pick-list — valid till-item names James maps TO

Beer Hall L3 forecast nodes
(`SELECT DISTINCT key FROM forecasts WHERE venue='beer_hall' AND layer='L3'`), i.e. the
known till-item menu:

```
Alpino Pinot Grigio        Aperol Spritz             Caravan of Love
Centennial Summer Pale     Cider - BH                Cordial & Soda
Crisps                     Discovery Beach Zinfandel Fruit Shoot
Hire Fee                   Lager - BH                Lancashire  crisps
Lunebrew T Shirt           Nuts                      OTHER
Pool Table deposit         Postmix                   SMIRNOFF
SPLASH                     Seabrook Crisps           Whitley Neil
£15 FIZZ                   £3.50 Cask                £4 Lager/Cider
```

**Generic buttons the draught / cask kegs most likely pool into** (call these out for
James — this is where the 13 lines will mostly land):

- **`Lager - BH`** — generic lager button (spans Becks Vier, Bud Light, Paulaner,
  Alcohol Free, etc.)
- **`Cider - BH`** — generic cider button
- **`£4 Lager/Cider`** — happy-hour lager/cider button
- **`£3.50 Cask`** — happy-hour cask button (Lune Valley Gold, Pale Ale, Session IPA cask)
- **`Centennial Summer Pale`** — the one clean-ish pale-ale node besides Caravan of Love

Everything else is spirits / wine / food / merch, not a keg target. The parent L2
category these sit under is **`Beer`** (L2 nodes: Beer, Food, Happy Hour, Merchandise,
Soft Drinks, Spirits, Uncategorised, Wine).
