# PRJ93 Live Probe: June 2026 Real Data and the Withheld World Cup: Report (v2, run)

**Status: RUN.** June 2026 daily net sales were pulled from the live Square account for The Beer Hall (Lune Brew Co) via the Square MCP (OAuth, read-only), landed through the existing CSV to DuckDB seam with no brain code change and `LIVE_INGEST` off, and analysed against the deliberately withheld 2026 World Cup. This replaces the earlier staged v1.

This is an experiment, not a build. The headline is the honesty result on real, out-of-sample data, plus two real-world findings the synthetic work could not have surfaced. Confounds are named throughout; nothing here is a causal claim.

---

## 0. The two hypotheses, kept separate

1. **Detection and honesty (the brain).** Fed real June sales, does the brain flag the World Cup-driven anomalies, and does it return the honest null rather than misattributing them to weather or term dates? The brain has no fixture list and no world knowledge, so naming the World Cup is impossible; refusing to invent a cause is the correct behaviour and is what this checks.
2. **Emergent reasoning by retrieval (the agent).** Meeting a flagged-but-unexplained day, does the reasoning layer auto-pull the relevant external context for that specific date and place (the World Cup one candidate among many, discovered not planted) and identify what coincides?

Both were exercised. Result in one line: **the brain passed the honesty gate cleanly, and the probe surfaced two limitations that only real data could show.**

---

## 1. Data pull (GP1)

- **Account (verified):** merchant `ML1FFAGJMQBTZ`, "The Beer Hall" / Lune Brew Co Ltd, GB, GBP, status ACTIVE. Not a sandbox.
- **Venue mapping (matched to the historical series):** `beer_hall` → Square location `LKHBB7FHE0T9T` ("The Beer Hall"); `ellel` → `L0J24BVHGQRFC` ("Ellel Village hall"). The `Brewery`, `C Hall`, and `Events` locations are not in the brain's `VENUE_MAP`, so they were excluded, exactly as the historical export treated them. Two River Taps (`LG01M6QYD7MGR`) is INACTIVE (closed) and has no June rows.
- **Metric:** net sales ex-VAT per venue per day, computed from completed order totals as `total − tax − tip − service_charge − card_surcharge`. On the test day the tax/net ratio was exactly 0.200 and tips/service/surcharge were £0, confirming this equals the historical ex-VAT "Net Sales" basis (UK menu prices VAT-inclusive; Square holds VAT separately). Beer Hall and Ellel are not VAT-inclusive venues (deflator 1.0), so the figures map straight onto the existing series.
- **One-day test pull (2026-06-15):** £1,798.44 net across 302 completed orders; positive, clean VAT structure, within the historical range (BH max seen £4,207). Passed sanity before the month pull.
- **Month pull:** 3,169 completed Beer Hall orders and 321 Ellel orders for 2026-06-01 to 2026-06-30, aggregated to daily totals by Europe/London local date. No order-level or customer-level data was persisted (daily aggregates only, no PII).
- **Landing:** one aggregate row per venue per trading day written into `line_items.parquet` (the CsvAdapter source), then `refresh()` appended them to the store, rebuilt features, and promoted the served forecast. **Watermark advanced to 2026-06-29** (see §7 note 3). No duplicate rows; BH `line_items` 47,644 → 47,669 (+25), Ellel 10,489 → 10,491 (+2).

### June daily net sales (ex-VAT), as landed

The Beer Hall, £, trading days only (Mondays and Tuesdays are structural non-trading days for BH and mostly £0):

| Date | DoW | Net £ | Date | DoW | Net £ | Date | DoW | Net £ |
|---|---|---:|---|---|---:|---|---|---:|
| 06-01 | Mon | 166.67 | 06-11 | Thu | 558.53 | 06-21 | Sun | 1030.20 |
| 06-03 | Wed | 453.32 | 06-12 | Fri | 1242.62 | 06-23 | Tue | 334.93 |
| 06-04 | Thu | 769.72 | 06-13 | Sat | **3518.50** | 06-24 | Wed | 819.92 |
| 06-05 | Fri | 1520.11 | 06-14 | Sun | 1031.94 | 06-25 | Thu | 835.41 |
| 06-06 | Sat | **3301.06** | 06-15 | Mon | **1798.44** | 06-26 | Fri | 1720.03 |
| 06-07 | Sun | 630.62 | 06-17 | Wed | 607.09 | 06-27 | Sat | **3081.50** |
| 06-08 | Mon | 41.25 | 06-18 | Thu | 863.40 | 06-28 | Sun | 338.33 |
| 06-10 | Wed | 258.74 | 06-19 | Fri | 1180.74 | 06-29 | Mon | 166.67 |
| | | | 06-20 | Sat | 801.00 | | | |

BH June total £27,070.74. Ellel: booking-driven, two days only, 06-18 £51.36 and 06-20 £2,286.82 (total £2,338.18).

---

## 2. Blinding (GP2)

Verified before the run and again after the pull: `local_events` holds 7 rows, all October to November 2025 (Love Lancaster Live, Light Up Lancaster); no football, "cup", "world", or June 2026 rows in `local_events`, `promo_calendar`, or `spike_days`. The auto-exogenous step pulls weather only (no event semantics) and in this session added no June weather (see §7 note 5). The brain was blind to the tournament throughout. Gate held.

---

## 3. The blind run (GP3)

Run over June with the World Cup withheld. The primary evidence is the **leakage-free per-day deviation check** (`check_point`, which uses only data before each date); the briefing is the month-end synthesis.

**Deviation classifications (Beer Hall, evaluated trading days).** `|z| > 1` is outside the 90% conformal band; `|z| > 2` is high severity.

| Date | z | Status | Attribution reason |
|---|---:|---|---|
| 06-05 Fri | 1.31 | deviation (med) | coincides with a school term↔holiday transition |
| 06-06 Sat | 3.72 | deviation (high) | **no coincident calendar/weather/event/promo signal — likely an operational or competitive change worth investigating** |
| 06-13 Sat | 4.06 | deviation (high) | **no coincident calendar/weather/event/promo signal (honest null)** |
| 06-26 Fri | 1.61 | deviation (med) | coincides with a university term↔vacation transition |
| 06-27 Sat | 3.25 | deviation (high) | coincides with a university term↔vacation transition |

All other evaluated days were within band. **Served-band breaches:** 06-06, 06-13, 06-27 all breached the served upper band; 06-20 (£801) sat inside it (a Saturday dip, z = −0.79).

**Change-point.** One onset in the recent window, 2026-05-28 (up, CUSUM, medium), before the tournament. **No change-point inside June.** This confirms the pre-registered hypothesis: a Lancaster pub shows clustered match-adjacent deviations, not a single sustained level shift. The effect is spiky, and the detector saw it as spikes.

**Ellel.** Only 06-20 flagged (£2,287, z = 5.64, "coincides with a university term↔vacation transition"). This is a private booking at a booking-driven venue, not a World Cup effect; the calendar attribution is a genuine coincidence, not a causal claim.

---

## 4. Ground-truth overlay (GP4), assembled after the run

2026 World Cup, first hosted by three nations, 48 teams. Group stage **11 to 27 June**; opener 11 June (Mexico vs South Africa, 20:00 BST). England (Group L) fixtures, UK time:

| Fixture | Date | UK kick-off | BH that day | Detector |
|---|---|---|---:|---|
| England vs Croatia (won 4–2) | Wed 17 Jun | 21:00 BST | £607 (z 0.56) | not flagged (in band) |
| England vs Ghana (0–0) | Tue 23 Jun | evening | £335 | **structurally unobservable (Tue)** |
| England vs Panama (won 2–0) | Sat 27 Jun | 22:00 BST | £3,082 (z 3.25) | flagged (high) |

Because the tournament is US-hosted, UK kick-offs are late evening (21:00 to 22:00 BST), near or past a pub's closing, so the in-venue England-match effect is muted, and it shows up mainly on weekend early-kick days. **Weather** for June 2026 in Lancaster was typical, with no heatwave (the hot spell arrived in July), so weather is a weak confound for June, which mildly strengthens the non-weather reading of the Saturday spikes. Daily weather was not available for a per-day separation (§7 note 5).

Sources: [Sky Sports UK kick-off times](https://www.skysports.com/football/news/11095/13481245/world-cup-2026-fixture-schedule-and-uk-kick-off-times-day-by-day-breakdown-of-all-104-matches-including-england-scotland), [England Football schedule](https://www.englandfootball.com/articles/2026/May/21/england-fifa-world-cup-26-match-schedule), [2026 FIFA World Cup (Wikipedia)](https://en.wikipedia.org/wiki/2026_FIFA_World_Cup), [Al Jazeera schedule](https://www.aljazeera.com/sports/2026/6/11/world-cup-2026-full-match-schedule-groups-teams-and-start-times), [Lancaster June weather (Weather Spark)](https://weatherspark.com/m/40015/6/Average-Weather-in-June-in-Lancaster-United-Kingdom).

---

## 5. Detection and honesty analysis (GP5)

### 5.1 Attribution honesty: PASS

This is the key check, and the brain passed cleanly.

- The **two largest, cleanest spikes** (06-06 z 3.72, 06-13 z 4.06) received the **honest null**: "no coincident calendar/weather/event/promo signal — likely an operational or competitive change worth investigating." 06-13 is the World Cup opening Saturday. The brain, holding no fixture data, correctly refused to invent a cause.
- The calendar attributions on 06-05, 06-26, and 06-27 are **genuine coincidences**, not wrong causes. The attribution scans a ±7-day window and reports "coincides with" (never "caused by"). UK schools return from May half-term around 1 June (within 06-05's window) and Lancaster University's summer term ends in late June (within 06-26/06-27's window), so both boundaries are real. The language is coincidence, and the coincidence is factual.
- **The brain never named a confident wrong cause.** It never attributed a spike to weather (correctly: no June weather was in its seam, and there was no heatwave to point at) and never invented an event. It never named the World Cup, which is the correct behaviour for a blind detector.

No misattribution occurred, so there is no GP5 gate failure to report.

### 5.2 Two limitations only real data could show

**(a) Structural blindness on non-trading weekdays.** The single largest June anomaly, **£1,798 on Monday 15 June (roughly ten times a normal open Monday)**, was **not evaluated at all**. The residual stream drops any day whose day-of-week has a historical median of ~0, and The Beer Hall is normally closed Mondays and Tuesdays, so those days carry a zero DOW baseline and are treated as non-trading. England vs Ghana (Tue 23 June, £335) is invisible for the same reason. If a match drives custom on a normally-closed day, the detector cannot see it, not because it missed a signal but because that day is not in the model's trading calendar. This is a real, reportable gap.

**(b) A US-hosted World Cup gives a muted UK pub signal.** England's own matches kicked off at 21:00 to 22:00 BST. The midweek Croatia match (17 June, 21:00) lifted BH to only £607 (about twice the Wednesday median) and stayed inside the band, unflagged. The in-venue effect concentrates on weekend days with earlier UK kick-offs, not on the England games themselves. A European or UK-timed tournament would likely produce a stronger, more flaggable weekday signal.

### 5.3 Alignment (counts, not rates dressed as precise)

Among the six **evaluable** high-relevance World Cup days (13, 14, 17, 20, 21, 27 June; 15 and 23 are structurally unobservable), the detector flagged **two: 13 and 27 June** (the two biggest). The four unflagged were genuinely within band: 14 (z 0.97), 17 (z 0.56), 20 (z −0.79, a dip), 21 (z 0.96). Of the five June flags overall, two are high-relevance WC days; the others are 06-06 (pre-tournament Saturday) and 06-05/06-26 (Fridays).

Rendered as rates with the strong caveat that N is tiny and confounds dominate: recall 2/6 = 0.33 (Wilson 95% ≈ [0.10, 0.70]), precision 2/5 = 0.40 (≈ [0.12, 0.77]). These intervals are essentially uninformative. **The honest reading is that the detector flags large days by magnitude, and World Cup Saturdays are a subset of large Saturdays.** Saturday, university term-end, and the tournament are collinear in late June, so "flagged" tracks size, not World-Cup-ness. This is alignment, not causation, exactly as pre-registered.

---

## 6. The reasoning test (GP6): on-demand exogenous retrieval

For each flagged honest-null day, the reasoning layer (here, live web retrieval) auto-pulled candidate external factors for that specific date and place, nothing hard-coded.

- **13 June (honest null):** retrieval discovers the World Cup opening weekend (tournament began 11 June; 13 June is the first Saturday, a full match card) as a coincident factor. Discovered, not planted, and cited.
- **06 June (honest null):** retrieval finds the World Cup does **not** coincide, because the tournament had not started (opener 11 June). The reasoning layer therefore correctly declines to attribute 06-06 to the World Cup. Two spikes that look identical to the detector are separated by retrieval: one coincides with the tournament, one cannot.
- **27 June (flagged):** retrieval surfaces both England vs Panama (22:00 BST) and the Lancaster term-end as coincident factors, an over-determined day. The brain's own term-vacation attribution is one genuine coincidence; retrieval adds the match as another.

This is the intended architecture working: an honest, blind detector plus a reasoning layer that enriches the "why" on demand, with coincidence kept separate from causation and grounded in cited evidence for the actual flagged dates.

**Honest caveat (a real limitation this session).** The available web-search tool is US-biased and, for "Lancaster events June 2026", returned **Lancaster, Pennsylvania** results (VegFest, a Strawberry Festival, Lancaster PA Pride), not Lancaster, Lancashire. So UK-local festival, transport, and news confounds for 06-06 and 06-13 could not be reliably retrieved here. The World Cup fixtures (the decisive retrieval) were obtained reliably. A production enrichment step would need a UK-scoped retrieval source.

---

## 7. Deviations from the spec

Per the standing instruction to record every departure.

1. **Pull granularity.** The spec asks for daily aggregates and forbids customer-level data. Daily net sales were therefore synthesised as **one aggregate line-item row per venue per trading day**, not itemised line items. Consequence: June's L2/L3 (category/item) layers are a single synthetic item, so item-level attribution is not meaningful for June. L1 (the probe's surface for deviation, change-point, and the served band) is exact.
2. **Net-sales definition.** Computed from order-level totals (`total − tax − tip − service − card_surcharge`) rather than the historical Items-export "Net Sales" column, because the Orders API is the available seam. Verified equivalent: VAT ratio exactly 0.200, and the month pull reproduced the independent one-day test figure for 15 June to the penny.
3. **Watermark reached 2026-06-29, not 06-30.** 30 June is a Tuesday, a non-trading day for BH with £0, so no row exists for it and the watermark honestly sits at the last day with sales. The full June window was pulled; June 30 simply had no completed trading.
4. **Landing lever.** `refresh._append_transactions` does not filter by venue, and on a fresh store (no watermark) each venue's `as_of` is its own data max, which would make a venue with an older ceiling re-fetch and duplicate late-May rows. To land cleanly with no brain-code change, the append was driven through `refresh(venue="beer_hall")`, whose `as_of` equals the global ceiling (2026-05-31), so `fetch(since=…)` returns only June rows. Ellel's served forecast was then promoted explicitly. Both venues verified duplicate-free. (This is also a latent multi-venue bug in `refresh()` worth a separate fix, noted here, not fixed as part of this read-only probe.)
5. **Weather seam empty for June.** The auto-exogenous Open-Meteo build added no June rows in this session (network/coverage), so the brain held no June weather. This means the honesty test on the weather dimension is by construction (the brain could not attribute to weather it does not hold); June weather context for the confound discussion came from web retrieval instead.
6. **Reasoning-retrieval tool limitation.** As in §6, the web-search tool surfaced Lancaster, Pennsylvania events, so UK-local confounds were not fully retrievable. Not an architecture limitation; a tool-scope one.
7. **Ellel promotion.** Ellel's June rows landed via the BH-driven append (§7.4); its served forecast was regenerated with `_promote_and_serve("ellel")` directly rather than a second full `refresh()` call, to avoid the cross-venue re-fetch.
8. **Sensitivity delivered as tables/prose**, consistent with the earlier scaled-eval report; no new plots were produced.

---

## 8. Corroboration with the synthetic (scaled) results

- **Large spikes are caught, near-certain and same-day.** The z > 3 Saturdays (06-06, 06-13, 06-27) were all flagged high on the day, with the served band breached. This matches the injected large-spike and regime-shift behaviour (near-certain, low latency).
- **Near-threshold days are missed.** The z ≈ 0.5 to 1.0 World Cup-adjacent days (14, 17, 21 June) were not flagged, consistent with the synthetic spike sensitivity floor (near-threshold catch ~0.33 to 0.50). Real data sat exactly where the oracle predicted.
- **No sustained shift, so nothing to catch on that axis.** June contained clustered spikes, not a level shift, and the change-point detector correctly raised none inside June. The synthetic regime-shift sensitivity is not contradicted; it simply did not apply.
- **Spike-recency confirmed on real data.** The scan window is 14 trading days. 06-06 sits at the edge of that window from month-end and drops out of the later briefings while 06-13 remains, reproducing the earlier spike-recency finding on live data.

---

## 9. Confounds and honest caveats

- June sales move with weather, weekends, term dates, and local events as well as any World Cup effect. Saturday, Lancaster term-end, and the tournament are collinear in late June, so a flagged Saturday is over-determined. Weather was typical (no June heatwave), which weakens but does not eliminate the weather confound; without daily weather a specific warm Saturday cannot be fully ruled out.
- N is tiny: a two-and-a-half week window, six evaluable high-relevance days, five flags. Counts are reported; the rate intervals are uninformative.
- Ellel is booking-driven; its one June flag is a private booking, not a World Cup effect. Two River Taps is closed and absent.
- This is a one-off real-data probe. The June rows are retained in the store as legitimate closed-day history; a full backup was taken and rollback is available if Nam prefers to revert.

---

## 10. Gates and acceptance

| Gate | Pass condition | State |
|---|---|---|
| GP1 pull | June net sales pulled, VAT and venue mapping correct, sanity-checked, landed via CSV seam; watermark advances. | **PASS** (watermark 2026-06-29; see §7.3). |
| GP2 blinding | no World Cup fixtures in any exogenous feed at run time. | **PASS** (verified before and after). |
| GP3 blind run | deviation, change-point, briefing over June with the served forecast; flags, onsets, attributions, breaches recorded. | **PASS**. |
| GP4 overlay | fixtures assembled after the run, UK time, tagged by relevance; weather/calendar for confounds. | **PASS**. |
| GP5 honesty | attribution is the honest null or a genuine coincidence, never a confident wrong cause. | **PASS** (honest null on the two cleanest spikes; genuine calendar coincidences elsewhere). |
| GP6 reasoning | reasoning layer auto-pulls external factors (World Cup discovered not planted), identifies coincidences with cited evidence. | **PASS with a tool caveat** (WC discovered and cited; UK-local retrieval limited by a US-biased search tool). |
| GP7 report | this report with alignment (N and CIs), the honesty finding, synthetic corroboration, confounds, two-hypothesis framing. | **PASS**. |

---

## 11. Decision-log row (paste into section A)

> Live real-data probe run: June 2026 daily net sales for The Beer Hall and Ellel were pulled from the live Square account via the Square MCP (OAuth, read-only, no keys handled in-chat, daily aggregates only, no PII) and landed through the existing CSV to DuckDB seam (no brain change, `LIVE_INGEST` off, watermark to 2026-06-29), with the 2026 World Cup deliberately withheld from every brain input (blinding verified before and after). The brain flagged the large weekend spikes and, on the two cleanest ones (13 June, the World Cup opening Saturday, and 6 June), returned the honest null rather than inventing a cause; its calendar attributions elsewhere were genuine term-boundary coincidences, never a confident wrong cause, so the honesty gate passed. Two real-data findings emerged that synthetic work could not: the single largest anomaly (a ~10x Monday spike on 15 June) was structurally invisible because Mondays are non-trading for the venue, and a US-hosted World Cup gives a muted UK pub signal because kick-offs fall at 21:00 to 22:00 BST near closing. The reasoning layer, meeting a flagged null, auto-pulled external factors for the specific date and discovered the World Cup for 13 June while correctly excluding it for pre-tournament 6 June, grounded in cited evidence, though UK-local confound retrieval was limited by a US-biased search tool. Alignment reported as counts with tiny-N caveats (Saturday, term-end, and tournament are collinear), not causation. Corroborated the synthetic sensitivity curve on real data: large spikes caught same-day, near-threshold days missed, no sustained shift so none raised, and the 14-day spike-recency window reproduced. Also exercised the T2 refresh and promote machinery on real new data and surfaced a latent cross-venue append bug in `refresh()` to fix separately.

---

## 12. Rollback

The store and parquet were backed up before landing (in the session scratchpad, `backup/brain.duckdb.bak` and `line_items.parquet.bak`). To revert June, restore those two files. Otherwise the 27 June rows remain as legitimate closed-day history; nothing about the brain's code changed either way.
