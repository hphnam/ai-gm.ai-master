# Compute contract: dataset in, bundle out

> **Status: implemented (Phase 3).** This is the brain's side of the integration —
> what stateless compute needs handed to it, and what it hands back. It does not
> specify storage: how these land in Postgres is the API's business (Prisma models,
> migrations, tenancy). Open decisions are marked **[OPEN]**.
>
> Written against the engine as it stands. Every claim here is checkable in the
> source; where a number is quoted, the file that produces it is named. Background
> on what is served and why: [`README.md`](README.md#what-is-served-and-what-it-needs).
>
> **Phase 3 changed this document as well as the code**, because building against it
> proved parts of it wrong. Three corrections, kept visible rather than quietly edited:
>
> 1. **`is_event_driven` does not cap the rung.** §1 said booking-led venues are
>    "capped at Rung 1". They are not: that was `MAX_RUNG`, which G12.9c emptied
>    (`config.py:101`), and `EVENT_ONLY_VENUES` has never gated the ladder. The
>    contract described a cap the code retired a fortnight earlier.
> 2. **VAT is closed** (§2): the API sends ex-VAT, the brain assumes nothing, and
>    `vat_inclusive` / `vat_rate` are **removed** from `VenueProfile` rather than left
>    as fields nothing reads. `timezone` and `currency` are removed for the same reason
>    — the analytics are date-grain and compute emits no formatted money, so both were
>    fields a caller could set and nothing would honour.
> 3. **Weather is supplied, not fetched** (§4): the recommendation was that compute
>    keep one outbound call. It does not. See the decision note in §4.
> 4. **`horizon_days` is capped at 7, not 30** — the horizon the band is actually
>    calibrated for. See §Bundle out.

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
| `venues[].lat` / `.lon` | presence means "this venue has a weather cell"; absent ⇒ `weather_cell` is `None` and weather must arrive via `exogenous` |
| `venues[].structural_zero_dow` | days closed by design. Feeds the `is_structural_zero` feature **and** the Mondrian conformal grouping. **Empty means none** — never "unset, use Lune's Mon/Tue" |
| `venues[].is_event_driven` | booking-led venue. Never judged "closed" on a trailing lull; its own trading nights are the spillover signal for siblings. **Does not cap the rung** |
| `country` | drives the public-holiday calendar (`holidays.country_holidays`) |
| `exo_enabled` | which covariate families are live — see §Exogenous |
| `stock_enabled` | brewpub-specific; **off by default**. Accepted and **reported as unhonoured** — the stock pipeline reads spreadsheets off disk and has no injected path |
| `expected_totals` | optional reconciliation target; `null` = skip the check |
| `price_change_dates` | **ADDED G15d, additive and optional.** Dates this org changed its prices. Feeds the `price_regime` feature, which counts how many changes precede each row. Defaults to `[]`, so **an absent value is not a behaviour change**. **Empty means "no known price changes"** and gives a flat column, never "unset, use Lune's". Bounded at `MAX_PRICE_CHANGE_DATES` (100) |

Resolution is **all-or-nothing per request**, not per field: with a profile bound the
profile wins entirely, and with none bound (the research CLIs, `sim/`, the test suite)
every value falls back to `config.py`. That fallback is what keeps report 31's
pre-registered July result reproducible from shipped code — `tests/test_org_profile.py`
pins both halves.

**`price_change_dates` is the one field added since the integration brief** (G15d,
report 39). It is deliberately **additive and optional** and needs no action from the
API: omit it and nothing changes. It closes the last hardcoded Lune date on the tenant
path: `PRICE_REGIME_BREAK = "2025-07-01"` was stamped into **every** org's feature frame
by `build_features`, which Phase 3's de-Lune table missed. Unbound it still resolves to
that single date, which is why the three training-frame hashes are byte-identical after
the change; verified, not assumed (`sim/frame_hash.py`).

**Reconciliation.** `config.EXPECTED_TOTAL_ROWS` (92329) and
`BH_NET_SALES_TOTAL` (202491.0) are hard asserts against Lune's audited figures — but
they live on the **CSV bootstrap** (`ingest/normalise.py`, `store.warehouse.check()`,
and each module's `main()`), not on the compute path, so there was nothing to remove
from it. `expected_totals` is therefore not a translation of those asserts; it is a new
check with a different job. It catches **the caller's** failure, not the brain's: a paged
sales query that silently drops rows hands compute a short series, and a short series
does not error — it forecasts low. Mismatch beyond `RECONCILE_TOL` (1%) is a diagnostic,
not a refusal, because the API is better placed than compute to decide whether its own
extract is trustworthy. `null` skips it: an org without audited totals must still build.

### 2. `sales_daily` — the aggregate

Grain: `venue × business_date × category × item`, ex-VAT.

The brain never sees line items. The API `GROUP BY`s its normalised sales store
down to this grain at assembly. `category` and `item` must be coalesced to `''`
rather than `NULL`, since grouping keys with NULLs split rows that should merge.

**VAT — decided (Phase 3): the API sends ex-VAT and the brain assumes nothing.**

`vat_inclusive` and `vat_rate` are **removed** from `VenueProfile`. Lune's rule
(`VAT_INCLUSIVE_VENUES = {two_river_taps}`, deflate by 1/1.2) lives in
`ingest/normalise.py`, which is the CSV bootstrap and is not on the compute path at
all — `compute/loader.py` writes `net_sales_exvat` straight from `revenue_exvat`.

Keeping the fields would have been worse than dropping them. Nothing read them, so a
caller setting `vat_inclusive=True` would reasonably expect deflation, receive none, and
mix bases across its venues. That is unrecoverable downstream and surfaces as a
plausible wrong number rather than an error — the precise failure `extra="forbid"`
exists to prevent, which a field that validates and does nothing reintroduces.

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

Span: training history **plus the full horizon**. Both halves are overlaid by the same
function (`ingest/exog_supplied.overlay`), used by the training frame and the horizon
frame alike — a covariate meaning one thing in training and another at serving time is
train/serve skew, and skew in a column the model was fit on is invisible until the
forecast is quietly wrong.

Precedence is one-directional: **where the request and the curated source both have a
value, the request wins**. A date the request omits keeps its derived value, so
overriding one day's weather does not mean restating the calendar.

> **`values` is a free `dict[str, float]`, and `extra="forbid"` does not reach inside
> it.** A caller sending `exo_tempc` passes validation and gets nothing — a univariate
> forecast wearing the exo model's name. Unknown keys are therefore checked against
> `ingest/exog_supplied.KNOWN_EXO_COLS` and **reported in `diagnostics`**. Names must
> match `CHRONOS2_EXO_COLS` exactly.

> The verdict in `signals/feature_ablation.md` ("no exogenous feature is adopted")
> binds the **Rung-3 GBM only**. It does not govern the served Rung-4 entrant. See
> the scope note at the top of that report.

**Who fetches weather — decided (Phase 3): (b), the API supplies it.**

The recommendation was (a), compute keeping one outbound call. Building it changed the
answer. Compute's store is a **per-request scratch database holding only what the
request carried**, so there is no weather table to read and no cache to amortise
against: option (a) is not "one outbound call", it is a synchronous Open-Meteo round
trip per venue per request, inside a route with no concurrency cap, against a
rate-limited public API — a latency and failure mode bolted onto a function whose whole
claim is that it holds no connection.

So weather arrives in `exogenous`. The cost is exactly the risk (b) was flagged for, and
it is now a **caller obligation, not a hope**: weather must be on the **hindcast**
basis. The observed/ERA5 basis is an oracle and leaks into the backtest;
`chronos2_exo_predict` asserts the basis it was trained on, and `config.WEATHER_TRAIN_BASIS`
is what `build_features` populates. An API that supplies ERA5 will not error — it will
score better than it deserves. `ingest/exog_weather.py` keeps the three-basis discipline
for the research path and is the reference implementation for the API's own ingest.

Absent weather is not silent: `compute/forward.py` names the missing dates in
`diagnostics`, because weather is the one covariate compute cannot derive and its
absence is the difference between the served exo entrant and a model that raises.

**Exo defaults — decided (Phase 3): calendar + weather on, sports + local events opt-in.**

Implemented in `org_profile.exo_families()`. `is_ellel_event`, the curated
Lancaster/Preston fixtures and the World Cup block are all Lune-shaped: a tenant that
never asked for a World Cup must not receive six columns of England's.

Default-off means **togglable, not removed**, and both halves are tested: a bound
profile with `exo_enabled=[…, "sports"]` gets the World Cup features back
(`test_the_world_cup_is_on_when_sports_are_enabled`), and the **unbound** research path
resolves to *every* family on — which is Lune's published configuration, and the reason
report 31's numbers still reproduce from shipped code.

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

**`forecasts` are forward-dated.** `target_date` runs from the day after the venue's
last observation through `horizon_days`. This is worth stating because it was not true
before Phase 3: the engine returned `conformal.wrap.evaluate`'s **backtest** — measured
at 57 rows, every one for a day already inside the supplied history, none after it. A
caller persisting those would have been storing predictions about the past.

**`horizon_days` is capped at 7** (`contract.MAX_HORIZON_DAYS`), and 7 is not a round
number — it is what the band is calibrated for. The residual stream is built from 7-day
rolling blocks, so every residual is a ≤7-step-ahead error. Measured on a drifting weekly
series, the pooled 90% band applied unchanged across steps:

| step | 1 | 7 | 14 | 21 | 30 |
|---|---|---|---|---|---|
| coverage (nominal 90%) | 100.0% | 96.2% | 84.6% | 88.5% | **80.8%** |

Note the direction. At ≤7 it **over**-covers, which is split conformal's safe failure
mode (`conformal/wrap.py` says so). Past 7 it silently **under**-covers, which is not,
and the project's gate is ±3pp. The contract previously advertised `le=30`, so an API
could have asked for a month and been given an interval whose stated confidence was
wrong by 9pp with nothing said.

Per-step calibration fixes this — the same measurement gives 96.2% at every step, with the
half-width growing 181 → 224 — but that changes the banding **method**, and this project
adopts a method only when it beats a gate on held-out folds. Inventing one inside an
integration phase is precisely the move the ladder exists to prevent, so the horizon is
capped at what is evidenced and per-step conformal is logged as a research work package
(`FLAGS.md`, FLAG-BAND-HORIZON).

| Key | Shape | Contents |
|---|---|---|
| `forecasts` | upsert | `venue, layer, key, target_date, model, yhat` — forward-dated |
| `bands` | upsert | `+ level, lo, hi` — `level` is part of the grain (0.80 and 0.90 coexist) |
| `served_forecast` | upsert | `venue, layer, model, rung, data_as_of, selected_at` |
| `watermark` | upsert | new per-venue position |
| `ladder_selection` | append | `old/new rung, old/new MASE, per-fold MASE, n_folds, reason` |
| `change_points` | append | `detected_date, metric, confidence` |
| `briefing` | items + chain | ranked feed **and** the new chain state to persist |
| `stock_cover` | upsert | only when `stock.enabled` |
| `diagnostics` | — | weather gap, refit reason, degradation notes. Never silently swallowed. |

## Decisions closed in Phase 3

1. ~~VAT basis~~ → **API sends ex-VAT**; `vat_inclusive`/`vat_rate` removed. (§2)
2. ~~Weather fetch~~ → **API supplies it**, on the hindcast basis. Building it refuted
   the "one outbound call" recommendation: there is no cache to amortise against, so it
   is one round trip per venue per request. (§4)
3. ~~Exo default set~~ → **calendar + weather on, sports + events opt-in**; unbound
   (research) resolves to all-on. (§4)

## Open decisions

4. **[OPEN]** Transport. JSON is simplest. A backfill frame for one venue over
   ~2 years of item-grain daily rows is not small; NDJSON or Arrow may be needed.
   Decide the threshold rather than discovering it. Phase 3 raises the stakes: with
   `exogenous` now genuinely consumed, a real request carries 15 covariates × (history
   + horizon) × venues **on top of** the sales rows.
5. **[OPEN]** Cold start. `transfer/lovo.py` borrows day-of-week shape from
   data-rich donor venues, but donors are cross-venue *within one estate*. A new
   single-venue org has no in-org donor. A cross-tenant shape library would have to
   be assembled and anonymised **by the API** — never by compute reaching across
   orgs — and needs privacy sign-off before it is built.
6. **[OPEN]** Who runs the ladder. Compute honours `prior_state.served_model` and
   cold-starts on `default_model` when it is absent, so promotion is continuous — but
   nothing in the compute path ever *re-runs* the gate. Verified against the engine:
   `ladder_selection` comes back `[]` on every call. A tenant's served model is therefore
   whatever it started as, for ever. The re-fit cadence (`_should_refit`,
   `RETRAIN_CADENCE_DAYS`, the event-aware tightening) is still wired to the research
   store's watermark, not to the injected `prior_state`. (`ServedRow.rung` was also always
   `None`; that half is fixed — it now reads the ladder's `PREDICTORS` registry.)
7. **[OPEN]** L2/L3. Compute emits L1 only. The measured A-vs-B split (report 23 — MinT
   for Beer Hall, revenue-share disaggregation for Ellel) lives in `sim/`, is
   `GATE_WINNER`-keyed by Lune slug, and has no per-tenant equivalent.
