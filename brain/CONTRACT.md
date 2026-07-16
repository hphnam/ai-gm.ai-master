# Compute contract: dataset in, bundle out

> **Status: draft for agreement.** This is the brain's side of the integration —
> what stateless compute needs handed to it, and what it hands back. It does not
> specify storage: how these land in Postgres is the API's business (Prisma models,
> migrations, tenancy). Open decisions are marked **[OPEN]**.
>
> Written against the engine as it stands. Every claim here is checkable in the
> source; where a number is quoted, the file that produces it is named. Background
> on what is served and why: [`README.md`](README.md#what-is-served-and-what-it-needs).

## The shape

```
API  ──── dataset {org profile, sales, trading hours, exogenous, prior state} ───▶  compute
API  ◀─── bundle  {forecasts, bands, served, watermark, audit, signals}  ─────────  compute
```

One org, one venue, one call. Compute holds no connection and chooses no org: it
sees exactly what the request carries. `org_id` is supplied by the API and trusted
as given; compute never resolves or widens it.

## Dataset in

### 1. `org_profile`

Replaces the Lune constants currently frozen in `config.py`. Per org, with a
per-venue block:

| Field | Notes |
|---|---|
| `org_id` | server-set by the API, never model-supplied |
| `venues[].venue_id` / `.slug` | the brain works in slugs; the API maps `venueId ↔ slug` at assembly. No persisted slug column needed. |
| `venues[].timezone` | today hardcoded `Europe/London` (`config.TZ`) |
| `venues[].lat` / `.lon` | weather cell; today `WEATHER_CELL_COORDS` |
| `venues[].vat_inclusive` / `vat_rate` | today `VAT_INCLUSIVE_VENUES` + `VAT_RATE=0.20`. **[OPEN]** see §VAT below. |
| `venues[].structural_zero_dow` | days the venue is closed by design, so the band is not dragged down |
| `venues[].is_event_driven` | booking-led venues (today `EVENT_ONLY_VENUES`) are capped at Rung 1 |
| `currency`, `country` | today implicit GBP/GB |
| `exo.enabled` | which covariate families are live — see §Exogenous |
| `stock.enabled` | brewpub-specific; **off by default** for other verticals |
| `expected_totals` | optional reconciliation target; `null` = skip the check |

**Reconciliation.** `config.EXPECTED_TOTAL_ROWS` (92329) and
`BH_NET_SALES_TOTAL` (202491.0) are hard asserts against Lune's audited figures;
`store.warehouse.check()` fails unless Beer Hall reconciles to £202,491 within 1%.
These become `expected_totals`, defaulting to `null` (skip). Any org without
audited totals must still build.

### 2. `sales_daily` — the aggregate

Grain: `venue × business_date × category × item`, ex-VAT.

The brain never sees line items. The API `GROUP BY`s its normalised sales store
down to this grain at assembly. `category` and `item` must be coalesced to `''`
rather than `NULL`, since grouping keys with NULLs split rows that should merge.

**[OPEN] VAT.** The brain's series is `revenue_exvat` and today it applies the
ex-VAT rule itself at ingest, per venue. If the API's store carries net/gross/tax
per row, the cleaner split is: **API sends ex-VAT, brain assumes nothing**. Needs
one decision, because silently mixing bases across venues is unrecoverable
downstream.

### 3. `trading_hours` — the time-of-day envelope

Grain: `venue × dow → {open_hour, close_hour, n}`, decimal hours, venue-local.

**This is not derivable from `sales_daily`, and it is not optional.**
`ingest.world_cup.derive_trading_hours` builds it from a 1st/99th-percentile
envelope of transaction *time-of-day* (a robust envelope, not min/max, so a stray
after-midnight refund does not stretch the window). It is what makes the six World
Cup covariates code-derived by kickoff overlap instead of hardcoded — the
methodological claim, not a convenience.

The daily rollup discards the timestamps this needs. Since the API's sales store
holds an event timestamp at line grain, this is a second small `GROUP BY`
(percentile of time-of-day per venue/DOW), not a re-pull. Roughly 7 rows per venue.

### 4. `exogenous` — known-future covariates

Required for the served Beer Hall model. `CHRONOS2_EXO_COLS`
(`models/foundation.py`) is **15 columns**: 4 calendar, 1 event, 6 World Cup,
4 weather. Every value must exist across the forecast horizon, or the entrant
raises rather than silently degrading to univariate.

| Family | Columns | Source today |
|---|---|---|
| calendar | `is_bank_holiday`, `is_ellel_event`, `exo_is_school_term`, `exo_is_uni_term` | pure date functions + curated term dates |
| event | `exo_fixture_nearby` | `ingest/local_events.py`, hand-curated Lancaster/Preston |
| World Cup | `wc_match_in_hours`, `wc_england_in_hours`, `wc_scotland_in_hours`, `wc_home_nation_in_hours`, `wc_n_matches_in_hours`, `wc_any_match` | `ingest/world_cup_schedule.md` (raw) × `trading_hours` |
| weather | `exo_temp_c`, `exo_rain_mm`, `exo_sunshine_hrs`, `exo_is_dry` | Open-Meteo, three bases, served on **hindcast** |

Span: training history **plus the full horizon** (7 days). Weather must be on the
hindcast basis — `chronos2_exo_predict` asserts this, because the observed/ERA5
basis is an oracle and leaks into the backtest.

> The verdict in `signals/feature_ablation.md` ("no exogenous feature is adopted")
> binds the **Rung-3 GBM only**. It does not govern the served Rung-4 entrant. See
> the scope note at the top of that report.

**[OPEN] Who fetches weather.** `ingest/exog_weather.py` calls Open-Meteo over
HTTP. A pure function with no network cannot. Two options, both defensible:
> (a) compute keeps one outbound call to a public, non-tenant API. Isolation is
> untouched — no tenant data leaves, and the call is keyed by lat/lon from the
> profile. Cheapest, and keeps the three-basis train/serve discipline in one place.
> (b) the API owns weather ingest and supplies the frame. Cleaner purity, but it
> has to reproduce the basis discipline exactly or the backtest silently leaks.
>
> Recommendation: **(a)**, and revisit only if outbound egress is a problem.

**[OPEN] Exo defaults for a new org.** Proposed: weather + calendar **on**,
sports + local events **opt-in**. Note `is_ellel_event`, the curated Lancaster
fixtures and the World Cup block are all Lune-shaped and must be per-org gated.
Default-off must mean *togglable*, not removed — Lune's own profile has to be able
to switch them back on, or the published result stops being reproducible from
shipped code.

### 5. `prior_state`

What the engine currently reads back from its own store. Retiring the store means
the API round-trips these, or the behaviour they gate is lost:

| Field | Gates | Lost if dropped |
|---|---|---|
| `watermark` | ingest progress per venue | refit cadence |
| `served_model` | which model is live per series | promotion continuity |
| `last_refit_ts` | `_should_refit` weekly boundary | cadence collapses to every-run |
| `prior_forecasts` / `prior_bands` | conformal calibrates on residuals from strictly-prior blocks | band coverage |
| `briefing_chain` | new/continuing/resolved novelty | **the false-alarm control.** Without it every standing item re-fires daily. The July result (0 new items, 8 correctly suppressed) depends on this. |
| `change_point_state` | closure dormancy | a closed venue re-alarms every day |

The cadence *decision* stays in compute (`_should_refit` and the event-aware
guards run on the state supplied, and may answer "no refit needed"). The
*schedule* and the org loop belong to the API.

## Bundle out

Written by the API in one transaction. Two shapes: upsert-latest on a grain key,
or append-only audit.

| Key | Shape | Contents |
|---|---|---|
| `forecasts` | upsert | `venue, layer, key, target_date, model, yhat` |
| `bands` | upsert | `+ level, lo, hi` — `level` is part of the grain (0.80 and 0.90 coexist) |
| `served_forecast` | upsert | `venue, layer, model, rung, data_as_of, selected_at` |
| `watermark` | upsert | new per-venue position |
| `ladder_selection` | append | `old/new rung, old/new MASE, per-fold MASE, n_folds, reason` |
| `change_points` | append | `detected_date, metric, confidence` |
| `briefing` | items + chain | ranked feed **and** the new chain state to persist |
| `stock_cover` | upsert | only when `stock.enabled` |
| `diagnostics` | — | weather gap, refit reason, degradation notes. Never silently swallowed. |

## Open decisions

1. **[OPEN]** VAT basis — API sends ex-VAT, or brain derives? (§2)
2. **[OPEN]** Weather fetch — compute keeps the outbound call, or API supplies? (§4)
3. **[OPEN]** Exo default set per vertical, and the toggle mechanism. (§4)
4. **[OPEN]** Transport. JSON is simplest. A backfill frame for one venue over
   ~2 years of item-grain daily rows is not small; NDJSON or Arrow may be needed.
   Decide the threshold rather than discovering it.
5. **[OPEN]** Cold start. `transfer/lovo.py` borrows day-of-week shape from
   data-rich donor venues, but donors are cross-venue *within one estate*. A new
   single-venue org has no in-org donor. A cross-tenant shape library would have to
   be assembled and anonymised **by the API** — never by compute reaching across
   orgs — and needs privacy sign-off before it is built.
