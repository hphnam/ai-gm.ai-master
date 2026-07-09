# PRJ93 G12.15 Report (v2): refresh cadence, MPS, home-nation fixtures, item demand

Implements `PRJ93_Spec_G12_15_v2.md`. Branch: `brain-construction`, run venv
`.venv-forecast` (Chronos-2 present, MPS host). Style: no em-dashes, plain prose,
loud failures, verify before asserting. The pre-registered frozen June forecast
(`1d966be`) is untouched; all cadence/uplift analysis is over the already-seen June
actuals (no pre-registration concern). Committed per gate: G12.15a `a9d147f`,
G12.15b `39610aa`, G12.15c `0564389`, G12.15d `b96747e`, G12.15e `ec78d4d`.

## Verified starting state

C1 (cadence already 7-day, not 30), C3 (device hard-coded CPU, host is MPS not
CUDA), C4 (only England flagged; Scotland also qualified), C5 (stock real now, not
mock; James mapping + delivery dates pending) all confirmed against the code before
any change. `torch.backends.mps.is_available()` is True, `torch.cuda.is_available()`
False.

## G12.15a: Chronos-2 on the Mac GPU (MPS)

`_resolve_device()` in `models/foundation.py`: `BRAIN_TORCH_DEVICE` overrides, else
`mps` when available, else `cpu`, never `cuda`. `PYTORCH_ENABLE_MPS_FALLBACK=1` is
set before the torch import so unsupported T5/Chronos ops fall back to CPU rather
than raising. Applied at every Chronos load site; the resolved device and the
fallback flag are recorded in `chronos2_runtime_info()`.

- **Parity (A15a):** an MPS forecast and a CPU forecast on the same Beer Hall input
  match within **GBP 0.0002** max absolute difference; both give the June L1 total
  GBP 13,917. Served numbers are unchanged beyond float-device noise.
- **Measured deviation from the spec's assumption:** the spec expected MPS to make
  daily re-forecasting cheaper. On these workloads MPS was **slower**, not faster:
  the Beer Hall single-series exo forecast took ~3.2s on MPS vs ~0.6s on CPU, and
  the cadence sweep's daily run was ~3.8s (MPS) vs ~0.9s (cold, CPU-comparable). The
  reason is transfer/fixup overhead on a small single series; MPS pays off for large
  batched work, not one short daily forecast. The operational point still holds
  (daily refresh is a few seconds, cheap), but via the model's speed, not the GPU.
  Recorded honestly rather than asserting the assumed speedup.

## G12.15b: home-nation fixture features

`wc_scotland_in_hours` and `wc_home_nation_in_hours` (England OR Scotland) added
RAW alongside `wc_england_in_hours` to `WC_FEATURE_COLS` (`ingest/world_cup.py`) and
`CHRONOS2_EXO_COLS` (`models/foundation.py`). The model weighs them; the analysis,
not a hard-coded assumption, decides which matters. The new flags fire on exactly
the expected June dates: England 17/23/27, Scotland 19/24.

**Measured June uplift (actual vs DOW-median), Beer Hall:**

| Fixture class | Mean uplift | n dates |
|---|---|---|
| England | +130% | 3 |
| Scotland | +116% | 2 |
| other in-hours match | +57% | many |
| no match | +55% | many |

Per-date (Beer Hall): 17 Jun England v Croatia +110%, 27 Jun Panama v England +150%
(23 Jun England v Ghana opened the venue on a normally-closed Tuesday, so no
percentage baseline); 19 Jun and 24 Jun Scotland dates carry the +116% mean, with
24 Jun Scotland v Brazil at +184%.

- **Finding:** both home nations drive footfall (England +130%, Scotland +116%),
  while a generic non-home-nation match barely differs from no match at all (+57% vs
  +55%). The data favours the **home-nation flag over England-only**: Scotland's
  uplift is nearly England's and both dwarf other matches. Recommendation for the
  go-live covariate set: prefer `wc_home_nation_in_hours`; keep all three raw so the
  choice stays data-driven at the next refit.
- **Power caveat (as required):** 3 England and 2 Scotland dates in one June is tiny.
  This is directional evidence with the dates named, not a significant coefficient.
- Ellel is uninformative: its one big June day (20 Jun, +657%) was a private event
  coinciding with matches, not a home-nation fixture; its England/Scotland flagged
  days had zero sales.

## G12.15c: refresh-cadence sweep over June (item-demand focus)

At each rolling origin, condition the venue's gate winner on June actuals up to that
origin (on MPS, full exo set including the home-nation flags), forecast to the next
refresh, score against actuals. Cadences: cold (one 30-day from 31 May), 7-day,
3-day, daily.

| Venue (model) | Cadence | L1 MASE | fixture-day MASE | L2 category MASE | first-fixture abs err | wall-clock |
|---|---|---|---|---|---|---|
| beer_hall (chronos2_exo) | cold_30 | 1.645 | 1.89 | 1.796 | GBP 90 | 0.9s |
| beer_hall | 7_day | **1.45** | **1.60** | 1.802 | GBP 145 | 0.7s |
| beer_hall | 3_day | 1.56 | 1.78 | 1.848 | GBP 134 | 1.3s |
| beer_hall | daily | 1.60 | 1.83 | 1.840 | GBP 121 | 3.8s |
| two_river_taps (ets) | cold_30 | 1.182 | n/a | n/a | n/a | 0.1s |
| two_river_taps | 7_day | 0.317 | n/a | n/a | n/a | 0.3s |
| two_river_taps | 3_day | 0.128 | n/a | n/a | n/a | 0.6s |
| two_river_taps | daily | **0.09** | n/a | n/a | n/a | 2.0s |
| ellel (robust_dow) | all cadences | 0.485 | 0.808 | 0.267 | GBP 0 | <2s |

**Findings, honest and model-dependent:**

- **Beer Hall (Chronos): 7-day is the sweet spot, not daily.** The gain is from cold
  (1.645) to weekly (1.45); sub-weekly does NOT help and slightly hurts (3-day 1.56,
  daily 1.60). This contradicts the intuition that tighter is always better: for a
  zero-shot model with a strong weekly rhythm, weekly context already captures the
  regime, and a 1-day horizon conditions on recent noise. The go-live default of
  7-day (C1) is vindicated for Beer Hall; sub-weekly is not worth it on accuracy.
- **Two River Taps (ETS): tighter is much better, but for the wrong reason.** MASE
  falls monotonically to 0.09 at daily, purely because tighter refresh learns the
  venue closed sooner and predicts near-zero. This is closure-tracking, not
  fixture-demand accuracy.
- **Ellel (DOW-median): cadence is irrelevant** (flat 0.485), because a fixed
  DOW-median forecaster does not condition on recent actuals. Cadence only helps
  models that use recent context (Chronos, ETS).
- **First fixture is unforecastable from cadence** (all cadences ~GBP 90 to 145 abs
  err on the first in-hours match day), as the spec anticipated: the first match has
  no prior fixture uplift in context; later fixtures benefit from in-context learning.
- **L2 category mirrors L1** (the ranking is identical) because L2/L3 are
  disaggregated from L1 by a FIXED revenue share, so cadence changes L1 and the split
  passes it through unchanged. L3 item-level was not scored against actuals: the
  Square-item to brain-item taxonomy reconciliation is the standing gap (report 22),
  flagged not built.
- **Cost:** daily refresh is <=4s per run (the model itself, not the GPU, is the
  reason), cheap enough to be the operational default during an event even where it
  does not improve accuracy.

## G12.15d: event-aware refresh policy

`_in_event_window(venue)` in `ingest/refresh.py` reads the SAME schedule the
forecast uses: a date is in a high-volatility window when a World Cup match is in
trading hours, or a curated local event falls, within `EVENT_WINDOW_LOOKAHEAD_DAYS`
(3) ahead. Inside the window, `_should_refit` tightens the T3 auto cadence from
`RETRAIN_CADENCE_DAYS` (7) to `EVENT_REFRESH_CADENCE_DAYS` (2) and states the
override in its reason string. Calendar-triggered, NOT hard-coded to the World Cup:
any future flagged event fires it identically. Owner-controllable, default ON,
disable with `BRAIN_EVENT_REFRESH_DISABLED=1`. Cost guarantee preserved: it fires
only on real new closed days and a re-fit is inference-only zero-shot, so a tighter
cadence adds fits within the event, never per-request work. Verified: during the
tournament window `_in_event_window("beer_hall")` is True with the fixture reason;
off-season it is False; out-of-scope venues return False. Tests: a new
`test_event_window_tightens_cadence` (2-day cadence fires at 3 days elapsed inside a
window, weekly holds outside) plus the change-point isolation test updated to
neutralise the new path. Documented as FLAG-EVENT-REFRESH.

## G12.15e: stock stays untouched and flagged

`signals/stock_inventory.py` and the reorder logic are deliberately UNTOUCHED (git
confirms no stock file changed across the whole of G12.15). FLAGS.md records the
honest status (FLAG-STOCK-STATUS, correcting FLAG-LI5): real stock data now exists
(no longer mock), but the item forecast is not yet wired into a stock reorder
because James's two inputs are pending (the menu-item-to-stock-name mapping and the
supplier delivery dates). Stock is a downstream fallback consumer of the sale-item
demand forecast this spec improves; connecting them is future work gated on that
data.

## Design note (not a build gate): in-context learning and generalising beyond the World Cup

Recorded so the dissertation can discuss it, and NOT built here (per the spec):

- **What exists now (bespoke).** The World Cup path is hand-curated: a schedule file
  plus code-derived in-trading-hours overlap features. Chronos-2 learns the
  covariate-to-uplift association IN CONTEXT: once the refreshed context window holds
  a fixture day whose `wc_*` flag was set and whose sales were high, the zero-shot
  model can project the next flagged day up. This is why refresh cadence matters for
  the World Cup even though it does not for Ellel's fixed-DOW model, and why the
  cadence sweep found the benefit sits at the cold-to-weekly step (getting the first
  observed fixture uplift into context), not below weekly.
- **The generalisation (research frontier, partially present).** The brain's
  enrichment/attribution layer already discovers candidate factors for a flagged
  date and cites coincidences, but BACKWARD (to explain a deviation after it
  happened). The generalisation is to run the same discovery FORWARD: an agent, given
  only general information about a coming event, would retrieve the structured facts
  (dates, times, who plays, where), decide demand-relevance for this venue's
  demographic (an England evening kickoff is high-draw, a 03:00 group game is not),
  and emit a generic forward covariate (a general `high_footfall_event` flag with an
  importance score) the forecast conditions on, instead of a hand-coded `wc_*`.
- **The honest gap.** Forward covariate generation from general information is an
  agentic reasoning task and is NOT built today; only the backward attribution is.
  G12.15b begins abstracting the World Cup features (home-nation, any-match) toward a
  general event schema, but the full "agent decides the covariate from general
  information" mechanism is its own significant future-work milestone, best scoped
  as the generalisation of the enrichment principle from explanation to
  anticipation, not folded into this cadence experiment. A small proof-of-concept
  (agent reads a schedule it was not hand-given, proposes an event covariate, the
  forecast conditions on it) is the natural next step.

## Deviations from the spec

1. **MPS is slower than CPU for these forecasts** (not the assumed speedup); daily
   refresh is still cheap, but because the model is fast, not the GPU. Measured and
   reported honestly rather than asserting the spec's expectation.
2. **Cadence finding nuances the "daily is better" framing.** Beer Hall's sweet spot
   is 7-day; sub-weekly does not help. Two River Taps' daily gain is closure-tracking,
   not fixture demand. Ellel is cadence-insensitive by model design. The honest
   result is model-dependent, not a blanket "refresh more".
3. **L3 item-level not scored against actuals** (Square-to-brain item taxonomy
   reconciliation is the standing gap); L2 category reported, L3 flagged, as the spec
   permits.
4. **Report filename** follows the `brain/log/` two-digit convention
   (`24_G12_15_Report.md`), not a literal spec name.

## Acceptance

| Check | Status |
|---|---|
| A15a | PASS. MPS when available, `BRAIN_TORCH_DEVICE` override, `PYTORCH_ENABLE_MPS_FALLBACK=1` set, device + fallback recorded; parity GBP 0.0002; served numbers unchanged. |
| A15b | PASS. Scotland + home-nation flags added raw; June uplift compared England/Scotland/other with per-date figures + power caveat; home-nation recommended, all three kept. |
| A15c | PASS. Cadence sweep cold/7/3/daily at L1 + L2 (L3 flagged gap); fixture-day and first-fixture errors separated; per-cadence MPS wall-clock reported. |
| A15d | PASS. Event-aware policy added, calendar-triggered, cadence override in-window, owner-controllable, audit reason, cost guarantee preserved, documented (FLAG-EVENT-REFRESH). |
| A15e | PASS. Stock untouched (git-verified); FLAGS.md records real-data-but-pending-James + the item-forecast-to-stock future link. |
| A15f | PASS. This report + decision-log row; device, home-nation, cadence, event policy, and the design note all covered; frozen artefact untouched; both suites green (.venv-forecast 258 passed 1 skip, .venv 251 passed 8 skip). |

## Bottom line

Chronos-2 now resolves to the Mac GPU with a CPU fallback and verified parity
(though CPU is faster for these small forecasts, reported honestly). Home-nation
fixture features are in raw, and the June data hints that Scotland matters nearly as
much as England, favouring the home-nation flag over England-only. The cadence sweep
gives a nuanced, honest answer: weekly is the Beer Hall sweet spot, tighter helps
only where it tracks a closure, and a fixed-DOW model ignores cadence entirely. The
event-aware policy tightens refresh to 2 days inside any flagged event window,
calendar-triggered and owner-controllable. Stock stays out of scope and honestly
flagged. The generalisation from bespoke World Cup features to agent-generated
forward event covariates is named as the next research milestone. The pre-registered
frozen forecast was never touched.
