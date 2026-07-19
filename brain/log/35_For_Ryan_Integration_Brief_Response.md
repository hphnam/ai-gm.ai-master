# Report 35 — For Ryan: response to the production integration brief, point by point

Date: 2026-07-19. Author: Nam. Scope: everything the brain side did against
`BRAIN_PRODUCTION_INTEGRATION_BRIEF.md` (your four-track audit, 2026-07-16). Covers
commits `2cc97e7` (report 32, hardening + stateless compute), `52a3864` (Phase 3
de-Lune), `872eb6c` (defect closure), `d449d96` (report 34 verdict). Nothing is pushed —
this clone carries `brain/log/` that `andpro` does not, so a sync is a conversation, not a
`git push` (see §1).

This walks your brief in its own order, §1 → §11, and for every point says one of three
things:

- **Adopted** — you were right, it's built, here's the result.
- **Deviated** — we did something different, here's why and how the disagreement was
  handled.
- **Yours** — infra / NestJS / product, untouched on the brain side, flagged where our
  work changes what you should build.

The one invariant held throughout: **no dissertation number was allowed to move.** The
research path (Lune, unbound profile) reproduces report 31 bit-for-bit, proven by hashing
the full training frame — contents *and* column order — for all three Lune venues before
and after every change (§results). That gate is why the de-Lune is safe to trust.

Three things in the brief were wrong about the code. Two you'll care about most (the exo
factors and the Chronos-2 grain) are in §6.1, handled carefully because one of them was
**our** fault, not your reading. I'll be precise about which.

---

## The headline you need before anything else

Building the seam surfaced a defect that predates the brief and changes what "persist the
returned bundle" (your §3, §6.3) means: **the Phase-2 compute path returned a backtest,
not a forecast.**

`compute/engine` called `conformal.wrap.evaluate()` and drained its rows as the
deliverable. `evaluate` walks the series in 7-day blocks and persists the last few weeks
of *in-history* fitted values — it is the coverage evidence behind report 31, not a
prediction. Measured on 200 days of history ending 2026-07-19:

```
n forecast rows              : 57
rows for dates AFTER history : 0      ← none of them are about the future
```

Fifty-seven banded, `served_model`-named rows, every one for a day that already happened,
**indistinguishable at the row level from a real forecast.** Your `brain_forecasts` table
(§4.5) would have filled with predictions for the past. `compute/forward.py` is the fix;
after it, `horizon_days` drives the count and every row postdates the history. This is the
single most important reason not to wire persistence against the Phase-2 shape.

It survived because the Phase-2 tests asserted the right *venues* and *band levels* came
back — never that a `target_date` was in the future. "The forecast is about the future"
felt too obvious to test.

---

## §1 — Customer PII in git history — **Yours (P0), not done here, and a hazard to flag**

Verified true: `brain/data/` holds tracked blobs with real customer/employee/PAN/URL data,
including the 77 MB Square export. The `.gitignore` rule doesn't untrack committed files,
so it's live in history. Your remediation (`git filter-repo` + force-push) is correct.

Not done on the brain side, and it must not be done unilaterally, because of a divergence
that will bite the force-push: **this clone carries `brain/log/` (35 reports, the evidence
chain) that the `andpro` remote does not.** A `filter-repo --invert-paths` + `push --force
--all` run from the wrong clone, or without reconciling the two remotes first, either
clobbers the log history or resurrects the PII on the remote that wasn't rewritten.
Sequence it deliberately: agree which clone is canonical, rewrite there, force-push both
remotes in lockstep, everyone re-clones. It's yours to own (§11 P0), but it's a
coordinated operation, not a one-liner.

---

## §2 — Current state — **Verified, accurate**

Your scaffolding inventory checks out: `brain.client.ts` sends no auth header;
`brain.tools.ts` has `venue` as a model-supplied enum hardcoded to Lune's three slugs
(`BRAIN_VENUES`); `service/app.py` had no org param and no auth. All confirmed against
source. No corrections here.

---

## §3 — Target architecture — **Adopted, and it's the right call**

Stateless compute, push-based, the API as sole DB gateway, the brain holding no
connection: adopted wholesale. Your §4.1 insight — keep the embedded engine as *ephemeral
per-request scratch* rather than rewriting ~157 call sites — was the load-bearing call and
it **deleted more work than it created.** Details in §4.1.

Two things to record against the invariants:

- **Isolation was attacked, not asserted.** A security review was told to assume the
  isolation claim was false and falsify it — six angles including live execution against
  the real store (8 concurrent overlapping requests, a bare context-less thread on a
  provably-reused worker, a fabricated attacker org). It could not be falsified: distinct
  scratch paths, zero cross-mutation, the served store byte-identical after the run.
- **One caveat, and it's now a caller obligation.** The isolation holds *by absence*:
  there is no `ThreadPoolExecutor` / `joblib` / `multiprocessing` anywhere in the
  analytics. A bare `threading.Thread` started inside compute begins with an empty context
  and would fall back to `config.DUCKDB_PATH` — **Lune's real store.** If any brain code
  ever threads, propagate with `contextvars.copy_context()`. This is obligation #10 in the
  handshake (bottom of this report).

---

## §4 — Layer 1: host and harden

### §4.1 Make the brain stateless — **Adopted**

Built exactly as sketched: `compute/engine.run(dataset)` opens a temp DuckDB, the loader
turns the daily aggregate back into the line-grain rows the L1/L2/L3 views expect, the
existing analytics run unchanged, the bundle is drained, the store is deleted. The one
thing it needed: `connect()` had to resolve its path at **call** time, not `import` time
(`from config import DUCKDB_PATH` froze it). The override is a **ContextVar, not a module
global** — a module global fails the "a background thread sees the real store" test, which
is precisely the cross-request leak, and Starlette runs sync endpoints in a threadpool so
that's not hypothetical. Same class of gotcha your app's venue-context extension
documents.

`NeonAdapter`, `SquareAdapter`, `_InertLiveAdapter`, `_to_txn_schema` and the psycopg path
are **deleted, not disabled** (`base.py` 245 → 109 lines). `INGEST_SOURCE=neon` now fails
loudly rather than silently serving the committed CSV seed while an operator believes
they're live. This also retires security finding L3 (the `NameError`) by removing the code
rather than fixing a path that shouldn't exist.

### §4.2 Dockerize — **Yours**, one accuracy note

Your two-target split (serve / compute) is right and the CPU-only call is confirmed by our
own measurement (FLAG-DEVICE-MPS: GPU slower than CPU for these small single-series
forecasts). One thing the Dockerfile sketch hides: there are **three** venvs, not one, and
they resolve deliberately differently. `.venv-eval` is the binding constraint —
`numpy<2.0` and `scipy<1.16` (TSB-AD, statsforecast) — and `chronos-forecasting` is
hard-pinned to `2.3.1` as the reproducibility anchor for the served model. The prod
compute image only needs `requirements.txt -r requirements-forecast.txt` (the eval venv is
research-only and shouldn't ship), but do **not** "modernise" the pins to make one venv's
resolver happy — it makes the pinned VUS-PR eval numbers unresolvable.

### §4.3 Coolify services — **Yours**, but the "always learning" assumption needs §6.4

Your infra design is sound. The one thing that isn't true yet is the sentence *"The
cadence decision (`_should_refit`, event-aware guards) runs inside `brain-compute` on the
state the API supplies."* It doesn't. See §6.4 — this is the most important gap for your
nightly-refit orchestration.

### §4.4 Migrations — **Yours**. No brain-side involvement; we touch no Prisma migration.

### §4.5 Prisma models — **Yours**, with contract feedback that changes three columns

The dataset/bundle contract lives in `brain/compute/contract.py` and `brain/CONTRACT.md`
(the joint item, §11). Points that affect your models:

- **The bundle carries fields your sketch omitted** and the engine genuinely needs back on
  the next call: `served_model` (or promotion restarts every run), `watermark` (or the
  refit cadence collapses), and `briefing_chain` (or every standing item re-fires daily
  and the false-alarm control is gone). Your `BrainServedForecast` / `BrainDataWatermark`
  cover the first two; the briefing chain needs a home if you wire the briefing signal.
- **`BrainServedForecast.rung`** — your sketch has `rung Int?`. Good instinct: it *was*
  always `None` on the brain side (a contract field nothing populated). Now read from the
  ladder's `PREDICTORS` registry, so an unknown model returns `None` instead of a wrong
  guess parsed off the `rungN_` prefix. It'll be populated correctly.
- **`BrainForecast.level`** — your example says `0.80, 0.95`. The brain emits **`0.80` and
  `0.90`** (`CONFORMAL_LEVELS`). Size/populate the column for those two, or you'll store a
  level that never arrives and miss one that does.
- **`BrainForecast.horizonDate`** — expect **at most 7 rows** per `(venue, layer, model,
  level)`. `horizon_days` is capped at 7 and a longer ask is a 422, not a wide band (§6.1
  reasoning, and FLAG-BAND-HORIZON for lifting it). Don't build UI that promises a month.
- **`expected_totals`** is not what CONTRACT.md originally implied. Your §7.2 says "delete
  the reconciliation asserts, reconcile to each org's own totals." We found the Lune
  asserts (`BH_NET_SALES_TOTAL` etc.) live on the **CSV bootstrap**, not the compute path —
  so there was nothing to delete from compute. `expected_totals` was repurposed to catch
  **your** failure, not Lune's: a paged Square query that silently drops rows hands compute
  a short series, and a short series doesn't error, it forecasts low. Supply per-venue
  expected totals and a >1% mismatch comes back as a diagnostic. `None` skips it. This
  directly de-risks your §6.3 backfill/sync.

### §4.6 Security hardening — **Adopted**

- **Auth (H1):** shared-secret bearer on every route, `hmac.compare_digest` over **bytes**
  (the str form raises `TypeError` on a non-ASCII token and Starlette latin-1-decodes
  headers, turning a hostile `Authorization` value into a 500 + logged traceback on an
  unauthenticated path). `/health` exempt.
- **Secure by default.** The first cut keyed on `BRAIN_ENV == "production"`, which **fails
  open** — an unset or misspelled value booted with auth silently off and every test green.
  Replaced with `BRAIN_ALLOW_INSECURE=1` as an explicit opt-out; a configured secret
  implies hardened regardless. Forgetting it is now loud.
- **`/docs` (M3)** nulled when hardened — and note the app-level auth dependency does *not*
  cover it, because FastAPI mounts those through Starlette's router; nulling the URLs is
  what enforces it.
- **`/refresh` (M1)** deleted from the HTTP surface. Correction worth recording: an earlier
  claim that `/refresh` was fully gone was wrong — `?freshness=live` still reached a
  writing path (`_live_topup → refresh(refit="never")`) driven by an LLM-supplied
  parameter, so 500 unique venue strings meant 500 refresh calls. Now validated against the
  venue allowlist and throttled per venue (FLAG-LI6).
- **Error leakage (L4):** `_redact` returns the exception *type* alone when hardened, full
  detail when not — and the same withholding now covers the `diagnostics` on the **200**
  path, which had been handing scratch tempdir paths and library internals back through the
  door that succeeded.

### §4.7 checklist — **Correction on a P1 item**

"67 `print()` calls" is **260 total, 227 excluding `sim/` and `tests/`** (263 now). ~3.4×
understated on a P1. Still deferred, deliberately: Phase 3's territory (`ingest/`, `store/`)
holds 54 of them, so structured logging done first is work the refactor deletes. It's real
and it's outstanding — just sequenced after the parts that move the files.

---

## §5 — Tenant isolation and security

### §5.1 Isolation layer by layer — **Adopted** (see §3 for the adversarial result)

Your framing — isolation is the app boundary and the brain's lack of a connection, not
per-brain RLS — is exactly right and is what we built to. The `_venue` accessor raises
`KeyError` for an unknown slug under a bound profile (closes a fail-open), so even a
jailbroken model asking about a venue outside the injected profile gets an error, not
another tenant's shape.

### §5.2 Findings table

| # | Brief | Status |
|---|---|---|
| H1 | No auth | **Fixed** — bearer, constant-time over bytes (§4.6). |
| H2 | No tenant isolation, `venue` model-supplied | **Brain side fixed** (ContextVar seam + `org_profile.venues`, unknown-slug raises); the venue→org gate at the Nest boundary is **yours**. |
| H3 | PII in git | **Yours** (§1). |
| M1 | `/refresh` unbounded | **Fixed** — off HTTP; residual live-topup write throttled (FLAG-LI6). |
| M2 | Unbounded read ranges | **Fixed + hardened beyond the brief** — you cap the range API-side, and compute now also refuses any `sales_daily` row dated after today (see the date-guard finding below). |
| M3 | `/docs` enabled | **Fixed** — nulled when hardened. |
| L1 | Interpolated SQL in `read_series` | **Retired with the store**; verified no interpolated SQL survives — `exog_supplied` writes covariate names as row **data** behind an allowlist, `venue` is parameterised (tested adversarially). |
| L2 | `SELECT *` no org filter | **Moot** — DSN path deleted. |
| L3 | `NameError` in `NeonAdapter._connect` | **Fixed by deletion** — the whole psycopg path is gone. |
| L4 | Verbose errors leak | **Fixed** — `_redact` + diagnostics withholding (§4.6). |

**The two unkeyed `@lru_cache`es (§5.1.7 / §7.3) are NOT fixed, deliberately.** They live
on the *serve* path (`service/app.py` `_checklists`, `_sop_gaps_cached`), not the compute
path — the forecast surface is already org-isolated by the ContextVar. The honest position
(and the code comment says so): the leak "arrives with the org dimension, not before it,"
because there's only one org today; dropping the cache now buys zero isolation and costs a
lot — `_sop_gaps_cached` reaches `embed()`, a Voyage call or a ~90 MB SentenceTransformer
load, per request against your 4 s client timeout, and uncached a transient Voyage failure
silently swaps the embedding backend between two calls on the same corpus. The fix is the
*same edit* as threading `org_id` through the serve surface: `maxsize=1` → keyed on org.
`TODO(nam)` is in place. Flagging it plainly so it isn't mistaken for done.

---

## §6 — Layer 2: data pipeline

### §6.1 What the brain consumes — **the two disagreements you asked me to be explicit about**

Your §6.1 makes two claims about the code that are wrong. They matter because both would
have quietly degraded **the served Beer Hall model** (`rung4_chronos2_exo` — Chronos-2 with
15 exogenous covariates), and neither would have thrown an error while doing it.

**Disagreement 1 — "Nothing in the pipeline reads per-transaction or intraday detail." —
False (the Chronos-2 grain).**

`derive_trading_hours` reads `line_items.ts` and builds a 1st/99th-percentile time-of-day
trading envelope per venue, and **six World Cup covariates depend on that envelope** (a
match "in hours" is defined relative to it). The aggregate-only grain your §6.3 proposes
would have handed compute daily totals with no `ts`, silently zeroing those covariates and
serving a degraded Chronos-2 model under its full name — the exact "plausible wrong number"
class this whole integration is trying to avoid.

*How the disagreement was handled — we agreed with the conclusion and fixed the premise.*
The daily aggregate grain is right; you shouldn't ship intraday transactions. So the API
supplies **`trading_hours` directly** as a first-class contract field (CONTRACT.md §3), and
the loader writes `venue_trading_hours` from it rather than letting `derive_trading_hours`
invent a window from synthetic timestamps. The loader stamps synthetic `ts` at midday
purely so the column is well-typed; nothing reads it for a window. Net: you keep the clean
aggregate grain **and** the intraday-derived features survive. The one obligation this
creates is that your Square adapter must compute the trading envelope (it already reads
line-level orders in §6.3) and send it — it's cheap where you already are, impossible where
the brain now is.

**Disagreement 2 — "weather and events are attribution-only (rejected as forecast features
by the A14 ablation)." — False (the exo factors) — and this one was our fault, not your
reading.**

The A14 ablation binds **only the Rung-3 GBM.** The served entrant is
`rung4_chronos2_exo`, which consumes **all 15 exo columns, weather included.** So weather
is not attribution-only — it feeds the flagship served model. Acting on the brief's framing
(strip weather/events to a "weather+calendar-only, attribution-only" posture) would have
changed the served model.

But you didn't misread the code here. You read our ledger, and **the ledger was a week
stale.** Commit `7d8bfbd` scoped the A14 verdict to the GBM in `signals/feature_ablation.md`
and its generator, but it never reached `FLAGS.md` — which `log/README.md` calls the *live*
flag ledger — and `FLAGS.md` still read "weather is not adopted as a model feature." You
read the authoritative-by-convention document and it lied. Fixed in `a4e5fa3`. The lesson
is ours: a correction that lands in a report but not in the ledger is not a correction,
because the ledger is what downstream reads. (Symmetrically, we later found the *same*
species of error in our own `CONTRACT.md` — a stale `is_event_driven` "capped at Rung 1"
claim describing a cap the code retired a fortnight earlier. Documents outlive the code
they describe; both were caught and corrected in place.)

*How it was handled:* refuted with the A14 scope, ledger fixed, and the served model **left
alone** — no dissertation number moved. Crucially, your downstream instinct in §7.2 / §9.5
(*gate the exo layer, default new tenants to weather + calendar, sports/events opt-in*) is
still exactly right and is implemented — but for the right reason. It's not that weather is
attribution-only; it's that a brand-new tenant has no curated Lancaster football fixtures
or World Cup schedule, so those covariates should be *off until opted in*, while weather
(which the served model genuinely uses) stays available. The gate is about
tenant-appropriateness, not about demoting weather.

**The exogenous contract hole, which your Square adapter will hit.** `extra="forbid"` on
the contract stops a caller inventing a top-level field — but `ExogenousRow.values` is a
free `dict[str, float]`, so it doesn't reach *inside* the dict. A caller sending `exo_tempc`
(typo) or any name outside `KNOWN_EXO_COLS` passed validation cleanly and got **nothing — a
univariate forecast wearing the exo model's name.** Unknown covariate names are now checked
against `KNOWN_EXO_COLS` and reported in `diagnostics` (capped at 10 names + a "more"
marker, so a hostile caller can't amplify it into a multi-GB string). When you map Square's
fields into covariates, a name that doesn't match is now *loud*, not silent.

### §6.2 The gap — **Verified, yours**

Confirmed: no sales history anywhere in Prisma (48 models, zero rows of sales). `sales_events`
and the sync that fills it are net-new, and yours.

### §6.3 Ingestion — **Yours**, with two brain-side contributions that de-risk it

The `PosSalesSource` / `CanonicalSaleLine` design is yours and it's good. Two things the
brain side now does that your adapter should lean on:

1. **`expected_totals`** catches a paged query that drops rows (§4.5) — the single most
   likely silent failure of a backfill.
2. **The exogenous overlay** (`ingest/exog_supplied.py`) is used by **both** the training
   frame and the horizon frame *through the same function*, on purpose: a covariate that
   means one thing in training and another at serving time is train/serve skew, and skew in
   a column the model was fit on is invisible until the forecast is quietly wrong.
   Precedence is one-directional — where your request and Lune's curated calendar both have
   a value, the request wins, because the derived value is a guess about a tenant compute
   knows nothing about. (This was the source of the worst review finding — see the flags
   section.)

### §6.4 How "always learning" works — **the gap that matters most for your orchestration**

Your §6.4 and §4.3 assume the re-fit cadence and ladder re-selection run inside
`brain-compute` on the state the API supplies. **They don't, yet** (open decision 6,
verified against the engine, not assumed):

- `bundle.ladder_selection` comes back **`[]` on every call.** The ladder never re-runs in
  compute. A tenant's served model is whatever it started as, for ever.
- `_should_refit` / `RETRAIN_CADENCE_DAYS` / the event-aware tightening are still wired to
  the **research store's watermark**, not to the injected `prior_state.watermark`.

What *does* work: promotion is **continuous** (compute honours
`prior_state.served_model` and cold-starts on `default_model`), so you won't get re-picking
from scratch every run. But the T3 "re-learn on a weekly boundary or a confirmed
change-point" behaviour your brief describes is not there. Two options for you: (a) treat
the served model as fixed-after-cold-start for v1 and defer re-fit, or (b) we wire
`_should_refit` to the injected `prior_state` and surface `ladder_selection` in the bundle
before you build the nightly cron. Either is fine — but building the cron against the
assumption that re-fit already happens would produce a cron that loops, calls compute, and
persists an unchanged selection every night. Flag this before §4.3 lands.

### §6.5 checklist — **Yours.** (The "never simulate rows to pass a test" discipline,
FLAG-INGEST-NEON, is ours and still holds — the refresh loop must be proven on real data.)

---

## §7 — Layer 3: multi-tenancy — **Adopted (Phase 3)**, with three deliberate deviations

### §7.1 Verdict: re-architect — done

`config.py` globals replaced by an injected per-org profile resolved through a ContextVar
seam. Unbound → Lune (the research path, bit-for-bit); **bound → the profile, entirely.**
That second half is load-bearing: a bound profile with `structural_zero_dow=[]` means
*this venue has no closed days*, not "unset, use Lune's Mon/Tue" — and that value reaches
the **Mondrian conformal grouping**, so a per-field fallback would surface as a quietly
miscalibrated band, not an error.

### §7.2 Hardcoded-to-Lune inventory — what was de-Luned, and three we handled differently

De-Luned to the per-org profile (all reach compute, verified):

| Constant | Now |
|---|---|
| `STRUCTURAL_ZERO_DOW` | per-venue `structural_zero_dow` (feature **and** Mondrian grouping) |
| `EVENT_ONLY_VENUES` | per-venue `is_event_driven` (liveness, spillover) |
| `FORECAST_VENUES` (3 slugs) | `org_profile.venues()` |
| `WEATHER_CELL_COORDS` | `lat`/`lon` presence on the profile |
| `EVENT_SCOPE` (Lancaster/Preston) | `{"all"}` for tenants |
| bank holidays (UK/England) | `country_holidays(profile.country)` |
| `_ellel_event_dates` (literal `"ellel"`) | `event_venue_dates()`, any event-driven venue |

Two of these were **silent wrongness, not crashes** — which is why nothing had caught them:
`dataset_max_date` iterated Lune's three slugs, so inside a tenant store every read missed,
`.max()` returned `NaT`, and `NaT` poisoned `max()` into an arbitrary "today" rather than an
error (it now filters `NaT` and raises when no venue has data); and `_ellel_event_dates`
read the literal `"ellel"` slug, so a tenant's event-spillover covariate was permanently
zero. A third was a disarmed landmine: `global_gbm_predict` pooled `FORECAST_VENUES` — inert
today (`rung3_global_gbm` isn't in `PREDICTORS`) but the tripwire under your §6.4 re-fit
work, so it's on `org_profile.venues()` now while it's a one-line change.

**Three deliberate deviations from your §7.2 list:**

1. **VAT — you wanted per-org VAT metadata; we made the brain VAT-agnostic instead.**
   `VAT_INCLUSIVE_VENUES` + `VAT_RATE=0.20` are gone, and so are `vat_inclusive` / `vat_rate`
   from the contract. The brain applies **no** VAT rule: the API sends ex-VAT, the brain
   assumes nothing. Reason: a `vat_inclusive=True` field that validates but isn't honoured
   reintroduces exactly what `extra="forbid"` prevents — a caller would expect deflation,
   get none, and mix bases across venues (unrecoverable downstream). It's now caller
   obligation #3: `sales_daily` must be ex-VAT.

2. **`timezone` — you wanted it threaded from `Venue.timezone`; we removed it.** The
   analytics are date-grain and would not honour a 2am-trade-lands-on-previous-day rule, so
   a `timezone` field would validate and do nothing — the same trap as VAT. Business-date
   assignment is yours to do at ingest (it's in `CanonicalSaleLine.businessDate` in your
   own §4.5 schema, correctly). Same reasoning retired `currency` from the profile (money
   is ex-VAT numeric; per-row `currency` lives on your `SalesEvent`, which is right).

3. **`sim/` → `research/` — deviated to a `.dockerignore` line, not a move.** Your §8 calls
   it "30 one-off scripts." It's **18 scripts plus ~30 frozen artefacts that are the
   dissertation's evidence chain** — the reproduction commands in report 31 and the decision
   log point at those paths. Moving it breaks reproduction for zero prod benefit. Excluding
   it from the image is the correct goal; that's a `.dockerignore` entry. Same outcome you
   wanted (not in the image), without breaking the evidence chain.

**One residual you flagged that we did NOT close — surfacing it honestly.**
`PRICE_REGIME_BREAK = "2025-07-01"` is still a hardcoded Lune date in `config.py`, and it's
**still reached on the tenant path**: `build_features.py:190` stamps a `price_regime`
column that flips at that date for *every* org's feature frame. It's not catastrophic (a
GBM/Chronos just finds a step-function on an irrelevant date uninformative), but it's a Lune
constant bleeding into tenant features, exactly as your §7.2 warned. Phase 3's de-Lune table
missed it. It should become a per-org optional list of known price-change dates (empty for
most tenants). Logged as an open de-Lune item; not yet done.

**The exo set (`CHRONOS2_EXO_COLS`)** — your call to make it per-org with a weather+calendar
default and sports/events opt-in is implemented via `_attach_exog` family gating +
`KNOWN_EXO_COLS` + per-org event scopes. `is_ellel_event` generalised to any event-driven
venue; the World Cup block is gated by an exo family, off unless the profile opts in. See
§6.1 for why the *framing* ("weather is attribution-only") was wrong even though the *gate*
is right.

### §7.3 Process-level changes

- `config.py` globals → injected profile: **done**.
- Chronos pipelines org-agnostic, shared across orgs: **confirmed and kept** — loaded once,
  reused, memory is one model not one per org, exactly as your §3 wants.
- The two `@lru_cache`es: **not keyed yet** — see §5.2 for the full reasoning.

### §7.4 Cold-start for new orgs — **partly done, partly yours**

Two different cold-starts:

- **The empty-store cold-start** (a brand-new tenant with no sales) was a real 503 bug the
  happy-path tests missed — an empty `line_items` frame carries no dtypes, DuckDB infers
  `date` as INTEGER, and the L1 view fails to bind `dayofweek()`. That's the *first* thing a
  new tenant hits. Fixed: typed empty frame + regression tests for the no-venues and
  no-sales shapes. **Done.**
- **The cross-tenant shape library** (`transfer/lovo.py` is intra-estate only) is **not
  built** and is genuinely yours to gate: it needs an API-assembled, anonymised donor set
  and privacy sign-off, because it's the one place cross-org behavioural shape would meet.
  The brain must never assemble that itself — it has no cross-tenant reach, by design.

### §7.5 checklist — brain-side items done except the two noted (lru_cache keying,
price-regime); `brain.tools.ts` venue enum wiring is yours.

---

## §8 — Production-readiness and code quality

| Item | Status |
|---|---|
| Dataset-in / bundle-out, no raw SQL in the brain | **Done** (the one raw-SQL path left, vector retrieval, is org-scoped by design and gated at chat entry). |
| ruff | **Adopted**, tree count tracked (70; version-sensitive, so only comparable within a session). |
| mypy / pyright, pydantic-settings, uv lockfile | **Not done.** The dataset/bundle *is* pydantic (strict), but env-var config isn't migrated to `BaseSettings`, and there's no type-check CI gate yet. |
| pin `requirements*.txt` | **Ceilings added, not a lockfile** — the three-venv constraint (§4.2) is the reason a naïve pin-to-latest breaks the eval numbers. |
| structured logging (the "67" prints) | **Not done** — 263 calls, deferred behind the `ingest/`/`store/` refactor (§4.7). |
| typed exceptions on non-read paths | **Partial** — the `_redact` hardening; the fail-soft read-path `except`s kept, as you recommended. |
| A8 embeddings → shared Voyage/pgvector | **Not done** — low priority, and it's genuinely cross-cutting (yours to expose the vectors). |
| `sim/` → `research/` | **Deviated** to `.dockerignore` (§7.2). |
| tenant-isolation tests | **Done** — `test_org_profile.py` pins both halves of the seam, plus the adversarial isolation review. |

---

## §9 — Open questions

Most are your product/infra calls (backfill window, retention/partitioning, PK-at-scale,
dataset transport, which normalised dimensions to populate, materialise-the-aggregate,
cold-start privacy). Two the brain side can answer now:

- **Q5 (exo default = weather + calendar, sports/events opt-in):** confirmed and
  implemented — with the §6.1 correction that weather is a *served-model feature*, not
  attribution-only. A new tenant defaults to weather + calendar; Lancaster fixtures and the
  World Cup block are opt-in per profile.
- **Q1 (brain slug):** your resolution (key on `venueId`, map slug at assembly, no
  `Venue.brainSlug` column) is compatible with the seam — `org_profile.venues()` carries
  whatever slug the profile supplies, and nothing persists it.

---

## §10 — Sequencing — where we are

- **Phase 0 (PII):** yours, not started (§1).
- **Phase 1 (host + harden, stateless):** **brain side complete** — hardened, stateless, no
  DB connection, adversarially reviewed. Your Docker/Coolify/Prisma/endpoints remain.
- **Phase 2 (data pipeline):** yours; the brain-side contract that de-risks it is in place
  (`expected_totals`, exog overlay, the date guard).
- **Phase 3 (multi-tenancy):** **brain side complete** — de-Luned, per-org profile, isolation
  proven — except the three deferred residuals (lru_cache keying, price-regime, cross-tenant
  cold-start) and the §6.4 re-fit wiring.

---

## Results (as last verified, report 34)

- **Research path byte-identical** — the gate that lets you trust all of the above. Full
  training frame hashes, contents + column order, before vs after Phase 3:

  | Venue | rows × cols | sha256[:16] |
  |---|---|---|
  | `beer_hall` | 399 × 40 | `59c83586f06c8359` (unchanged) |
  | `two_river_taps` | 331 × 40 | `fb388ce32d02fdab` (unchanged) |
  | `ellel` | 386 × 40 | `a3c110bbc72be722` (unchanged) |

- **C2 confrontation reproduces** — BH L1 MASE **0.285 / 0.287**, band coverage @90 **1.00**,
  England-QF `generalises: False`. (Honest caveat: C2 *re-scores a frozen artefact*, so it
  validates the store and scoring, not forecast generation — the frame hashes are what cover
  generation. Report 32 over-claimed C2 as the gate; corrected in report 33.)
- **Suites:** `.venv` (3.14) **379 / 8 skipped**, `.venv-forecast` (3.12) **386 / 1**.
  `.venv-eval` still imports the seam and resolves to Lune's venues (checked — a prior pass
  once broke it by moving dependency floors).
- **ruff:** tree **70** (not the flattering 67 a stray `ruff --fix` briefly produced by
  touching three files Phase 3 doesn't own — reverted).
- **`print()`:** 263, unchanged; Phase 3 added none.
- **Store** restored to 2026-07-07, held-out window intact (0 rows). **Nothing pushed.**

---

## Flags and interesting findings

- **FLAG-STORE-DURABILITY** — `warehouse.build()` resets the store clock to the May seed,
  and *any* pytest run can trigger it. It nearly corrupted the frame-hash verification
  mid-pass (hashing two different datasets). `sim/restore_clock.py` re-chains the ingests and
  asserts the held-out window is empty; run it after any full-suite run. Narrowed to its
  measured trigger.
- **FLAG-BAND-HORIZON** — the conformal band is calibrated on ≤7-step blocks. Applied
  unchanged to day 30 it under-covers (measured 80.8% vs 90% nominal). Per-step calibration
  demonstrably fixes it (96.2% at every step) but *changes the banding method*, and this
  project adopts a method only when it beats a gate on held-out folds — inventing one inside
  an integration phase is the move the ladder exists to prevent. So `horizon_days` is capped
  at 7 and a month is a 422. This is the work package that would lift it, with the
  measurement and the sample-size arithmetic logged.
- **FLAG-DEVICE-MPS / FLAG-INGEST-NEON** — your own citations; both still hold (CPU beats
  GPU at this scale; never simulate rows to pass a test).
- **The most instructive finding: three consecutive rounds of my own fixes each shipped a
  defect as bad as the one being fixed, and review caught all three.** Worth your awareness
  because it's the pattern to watch in this codebase, not a one-off:
  1. The `exo_is_dry` train/serve-skew fix made train and serve *agree — on the wrong value*
     (`0.0` for dry weather). Fixed with a `np.nan` placeholder + a test that asserts dry
     reads as dry, not merely that train == serve.
  2. The typo'd-year fix turned a 17-minute hang into a **0.4-second wrong answer** — a POS
     export with one row dated `2202` became the forecast origin and the returned watermark,
     which then poisons the *next* call via `prior_state`. The DoS framing hid a correctness
     bug.
  3. The guard for *that* was one-sided: it rejected `2202` but accepted `2016` (`2026→2016`
     is an equally likely one-keystroke slip and produces seven £0.00 forecast rows for
     `rung1_robust_dow`, Ellel's served model, with no error). Fixed with an isolation-based
     segmentation guard (`MAX_FUTURE_DAYS` + gap segmentation), verified across ±1/5/10/176
     years and three legitimate patterns (seasonal venue, cold-start tenant, refurb gap).

  Each wrong fix was plausible, documented, tested, and measured *only against the case that
  motivated it*. The systemic countermeasure — running review against the fixes and
  measuring each fix's own blast radius — is what caught rounds 2 and 3. Round 4 (the
  one-sided-guard fix) is itself unreviewed; given three-for-three, treat that as a real
  residual risk, not a formality.

---

## The handshake — caller obligations you now own

These are in the contract schema, not just docstrings, because they belong in the caller
and no caller exists yet:

1. **`bundle.org_id` is echoed, never an authorization statement.** Assert
   `bundle.org_id === expectedOrgId`; persist under the orgId you already authorized.
2. **Weather must be hindcast-basis.** ERA5/observed won't error — it'll flatter the
   backtest by leaking the future into it.
3. **`sales_daily` must be ex-VAT.** The brain applies no VAT rule.
4. **`exogenous` must span training history AND the full horizon**, or the exo entrant
   raises rather than degrading to univariate.
5. **`structural_zero_dow=[]` means no closed days.** There is no "unset."
6. **Supply `trading_hours`** (§6.1) — the intraday envelope the served Chronos-2 model's
   World Cup covariates depend on; compute can't derive it from a daily aggregate.
7. **`sales_daily` dates are closed history.** A row after today is refused (it would become
   the forecast origin and the watermark). Only the API can tell a typo from history — and
   the poisoned watermark compounds via `prior_state`.
8. **`horizon_days` ≤ 7.** A longer ask is a 422, not a wide band (FLAG-BAND-HORIZON).
9. **Set a request-size limit at the ingress.** Compute's row caps fire only *after*
   pydantic materialises every row (`max_length` is checked last), so they bound absurdity,
   not memory. This is genuinely yours to set.
10. **Do not start a bare thread inside compute.** The per-request store and profile are
    ContextVars; a `threading.Thread` starts empty and falls back to Lune's real store.
    Propagate with `contextvars.copy_context()` or don't thread.
11. **Read `diagnostics`.** Absent weather, unknown covariates, a dataset that doesn't
    reconcile to `expected_totals`, a cold-started model, a thin Mondrian group, and an
    unhonoured `stock_enabled` are all reported there and nowhere else.

---

## Bottom line

Your central architectural call — stateless compute, the API owns persistence and tenancy —
was right, is adopted, and deleted more work than it created. The brain side of Phases 1 and
3 is done and the research numbers survived intact. Three of your claims about the code were
wrong: the intraday-grain one you'd have caught by reading `derive_trading_hours`; the
weather/A14 one you couldn't have, because our own ledger told you the wrong thing (fixed).
Before you build the persistence and the nightly cron, the two things to internalise are the
**headline** (Phase-2 returned a backtest, not a forecast — don't wire persistence against
that shape) and **§6.4** (the re-fit cadence isn't wired to `prior_state` yet, so a nightly
cron built on the "always learning" assumption would loop and persist an unchanged selection).
Everything else is in the handshake and the flags above.
