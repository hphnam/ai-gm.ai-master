# Report 32 - G13: production integration, hardening and stateless compute

Date: 2026-07-16/17. Scope: everything since report 31 (the C2 confrontation), plus the
hardening arc that preceded it and had no report of its own. Covers commits `087d20a`,
`a4e5fa3`, `284663f`, `0f9b511`, `b5fb3a7`, `04b3bf1`.

Context: Ryan's `BRAIN_PRODUCTION_INTEGRATION_BRIEF.md` proposes running the engine as a
per-org service inside gm-ai. This report records what was verified in that brief, what
was built, what was found while building it, and what is deliberately not done.

---

## 1. The brief, verified against the source

The brief was checked claim by claim rather than accepted. It is substantially correct
and its central architectural call is right and was adopted. Three claims are not.

**Verified true:** 106 Python files / 19,031 LOC (exact); PII tracked in git (21 files,
incl. a 77MB export); no auth on any of 11 routes including a state-mutating
`POST /refresh`; two unkeyed `@lru_cache`; the Lune constants (`EXPECTED_TOTAL_ROWS`,
`BH_NET_SALES_TOTAL`, `VAT_RATE`, `PRICE_REGIME_BREAK`, `WEATHER_CELL_COORDS`);
`warehouse.check()` hard-failing off Lune's audited totals; no sales history in Prisma
(48 models, zero); `BRAIN_VENUES` hardcoded to three slugs; the client sending no auth
header; interpolated SQL in `read_series`; and a genuine latent `NameError`
(`NeonAdapter._connect` used `os.environ` with no `import os`).

**Wrong, and corrected:**

| Claim | Reality |
|---|---|
| "67 `print()` calls" | **260** total, 227 excluding `sim/` and `tests/`, as measured 2026-07-16. ~3.4x understated on a P1 item. (263 at the end of this work: `sim/restore_clock.py` and `sim/confront_july_w2.py` add three, both research scripts whose stdout is the point.) |
| "Nothing in the pipeline reads per-transaction or intraday detail" (§6.1) | False. `derive_trading_hours` reads `line_items.ts` and builds a 1st/99th-percentile time-of-day envelope; six World Cup covariates depend on it. The brief's proposed aggregate grain would have silently broken the served Beer Hall model. |
| "Weather and events are attribution-only, rejected by the A14 ablation" (§6.1) | False, and it contradicts the brief's own §9.5. A14 binds the Rung-3 GBM; the served `rung4_chronos2_exo` consumes all 15 exo columns, weather included. |

**Where the third error came from, which matters more than the error.** `7d8bfbd`
scoped the A14 verdict in `signals/feature_ablation.md`, its generator, and the README.
It never reached `FLAGS.md`, which `log/README.md` calls the live flag ledger, and which
still read "weather is **not adopted as a model feature**". Ryan did not misread the
work; he read the ledger, and the ledger was a week stale. Had it gone uncorrected, §9.5
would have changed the served model on the strength of it. Fixed in `a4e5fa3`.

The lesson generalises: a correction that lands in reports but not in the ledger is not
a correction, because the ledger is what downstream reads.

---

## 2. Hardening (`087d20a`)

The engine was localhost-bound research code. Hosting it changes the threat model.

- **Auth (H1).** Shared-secret bearer on every route, `hmac.compare_digest` over
  **bytes**: the str form raises `TypeError` on a non-ASCII token and Starlette
  latin-1-decodes headers, so a str compare turned a hostile `Authorization` value into
  a 500 plus a logged traceback on an unauthenticated path. `/health` stays exempt.
- **Posture is secure by default.** The first cut keyed on `BRAIN_ENV == "production"`,
  which **fails open**: an unset or misspelled value ("prod", "Production") booted with
  auth silently disabled and every test still green. Replaced with
  `BRAIN_ALLOW_INSECURE=1` as an explicit opt-out, so forgetting it is loud. A
  configured secret implies hardened regardless, because secret-plus-leftover-opt-out
  otherwise enforced auth while leaving the endpoint map public - which passes every
  smoke test.
- **`assert_auth_configured()`** lives in `service/auth.py`, not `config`, so the
  research CLIs and `sim/` scripts import config without needing a token; only the
  service refuses to boot. It also rejects a non-ASCII or short secret, which would
  otherwise be a silent, permanent, undiagnosable 401.
- **`/docs` (M3)** nulled when hardened. Note the app-level dependency does **not**
  cover it: FastAPI mounts those through Starlette's router, so nulling the URLs is what
  enforces this.
- **`/refresh` (M1)** deleted from the HTTP surface.

**One correction worth recording.** An earlier version of this work claimed `/refresh`
was off the HTTP surface. It is not. `?freshness=live` still reaches
`refresh(refit="never")` through `_live_topup`, which **writes**, driven by an
LLM-supplied tool parameter. It is now validated against `FORECAST_VENUES` and throttled
per venue - it keyed on the untrusted value, so 500 unique venue strings produced 500
refresh calls and 500 dict keys, each taking the full-history branch. The throttle is a
bound, not absence, and `FLAG-LI6` says so.

**Dependency bounds gained ceilings, not floors.** Three venvs install
`requirements.txt` and resolve differently on purpose. `.venv-eval` is the binding
constraint and the easiest to forget: TSB-AD pins `numpy<2.0` and statsforecast pins
`scipy<1.16`, so raising floors to match the newest venv makes the venv behind the
pinned VUS-PR numbers unresolvable. `chronos-forecasting` is hard-pinned to 2.3.1 alone,
as the reproducibility anchor for the served model.

---

## 3. Ledger and notes (`a4e5fa3`, `284663f`)

Three open questions had wrong answers on file.

**The glossary already existed.** Report 30 drafted 16 terms and recorded "there is no
glossary file today". `GLOSSARY.md` predates that report by two days and both
`brain/FLAGS.md` and `brain/README.md` already link to it. The recommendation on record
(create `brain/GLOSSARY.md`) would have produced a second, competing glossary and
orphaned two live links. Terms merged into the existing file instead.

**Taxonomy drift is not wired into the standing build.** This was an explicit open
question and the answer is no. `build_hierarchy` takes `since=` and the freeze scripts
pass it; `reconcile()` does not, and **no caller anywhere does**. Measured with June and
July in the store: the standing path still ranks two years of `Lager - BH` above two
months of `LuneBrew Pilsner` and drops the GBP 3,484 item into `OTHER` - the exact item
report 25 named. Ingesting June did not fix it and partly masks it, because node counts
move while membership stays wrong. Not fixed: it changes the served L2/L3 node set, so
it wants its own gate and a before/after, not a drive-by edit.

**The store hazard had no flag.** `warehouse.build()` resets the clock to the May seed
and any pytest run calls it. It fired **twice in one session**, and the second time only
the C2 confront's ceiling assert caught it - without that guard C2 would have scored July
against a May store and produced plausible, wrong numbers. `sim/restore_clock.py` now
chains the two ingests, verifies the ceiling, and asserts the held-out window is empty.
`FLAG-STORE-DURABILITY` records it.

`brain/log/DISSERTATION_NOTES.md` captures the argument the reports add up to, what not
to claim, and the limitations to state outright.

---

## 4. Stateless compute (`0f9b511`, `b5fb3a7`, `04b3bf1`)

The brief's central call: the brain stops touching a database and becomes pure compute.
Adopted, and it is the right call.

### 4.1 The seam

The obvious reading is "refactor the compute functions to take injected frames" - about
**157 call sites across ~25 modules**. The brief's own §4.1 says otherwise and is right:
keep the embedded engine as ephemeral per-request scratch. Load the supplied rows,
compute, emit, discard. Then the call sites do not change at all.

That needed exactly one thing: `connect()` must resolve its database at **call** time.
It could not, because `from config import DUCKDB_PATH` binds at import - so the path was
frozen and swappable by nothing, including tests. The same class of gotcha the app's
venue-context extension documents.

The override is a **ContextVar, not a module global**. Mutating it to a module global
makes `test_a_thread_without_a_scratch_sees_the_real_store` fail with a background thread
reading a request's scratch path, which is precisely the cross-request leak. Starlette
runs sync endpoints in a threadpool, so this is not hypothetical.

### 4.2 The shape

```
API  ── dataset {org_profile, sales_daily, trading_hours, exogenous, prior_state} ──▶ compute
API  ◀─ bundle  {forecasts, bands, served, watermark, dormant, chains, diagnostics} ── compute
```

`compute/engine.run(dataset)` opens a temp DuckDB, `compute/loader` turns the daily
aggregate back into the line-grain rows the L1/L2/L3 views expect, the existing analytics
run unchanged, the bundle is drained, the store is deleted.

The contract (`compute/contract.py`) is strict: unknown fields are rejected. It carries
the pieces the brief's sketch omitted and the engine actually needs back: `served_model`
(or promotion restarts every run), `watermark` (or the refit cadence collapses), and
`briefing_chain` (or every standing item re-fires daily and the false-alarm control is
gone).

### 4.3 Deleted, not disabled

`NeonAdapter`, `SquareAdapter`, `_InertLiveAdapter`, `_to_txn_schema` and the psycopg
path are gone (`base.py` 245 -> 109 lines). The brain does not fetch its own history, so
a registry advertising a `neon` source would imply a DSN path that no longer exists.
`INGEST_SOURCE=neon` now **fails loudly** rather than silently serving the committed CSV
seed while an operator believes they are live. This also retires security finding L3 by
removing the code rather than fixing a `NameError` in a path that should not exist.
`CsvAdapter` stays as the research bootstrap.

### 4.4 The isolation claim, attacked

A security review was asked to assume the claim was false and prove it. Six angles,
including live execution against the real store. **It could not be falsified.**

- 8 concurrent sync-endpoint requests kept distinct scratch paths across a forced 150ms
  overlap, zero cross-mutation.
- A bare `_SCRATCH_DB.set()` with no reset, on a **provably reused** anyio worker thread
  (identical `threading.get_ident()`), **did not survive** - anyio does `copy_context()`
  per submit.
- `duckdb.connect` appears exactly once outside tests. No module binds `DUCKDB_PATH` at
  import except `service/app.py` (a different Docker target, unreachable from compute).
- A fabricated `ATTACKER_ORG` run against the real store returned only its own venue;
  the served store's SHA was **byte-identical** after the run; zero scratch residue.

### 4.5 Two things found by building, not by planning

**A real cold-start bug the happy-path tests missed.** An org with no sales returned 503.
An empty `line_items` frame carries no dtypes, so DuckDB infers `date` as INTEGER and the
L1 view fails to bind `dayofweek()`. That is the **first thing a brand-new tenant would
ever hit**. Typed empty frame, plus regression tests for both the no-venues and
no-sales-yet shapes.

**The contract committed the failure it legislates against, inverted.** `extra="forbid"`
stops a caller believing it sent an *unknown* field - while `exogenous`, `horizon_days`,
`exo_enabled` and the per-venue profile all validated cleanly and were dropped on the
floor. Worse, because they passed. Sharpest case: a caller names `rung4_chronos2_exo`,
sends its 15 covariates, and receives a **univariate forecast with nothing said**. Each
unconsumed field now reports itself in the bundle, naming what it would have governed.

Also from the review: `change_point_state` had no return path (closure dormancy would
reset every run, so a closed venue re-alarms daily); `TemporaryDirectory` does not unwind
on SIGKILL and OOM is how this process realistically dies, stranding one org's sales in
TMPDIR across restarts (now swept at boot, chmod 0o700).

---

## 5. State

| | Before | After |
|---|---|---|
| `.venv` suite | 262 / 8 | **307 / 8** |
| `.venv-forecast` | 269 / 1 | **314 / 1** |
| tree-wide ruff | 72 | **71** |
| C2 numbers | 0.285 / 0.287 | **0.285 / 0.287** |

The C2 confront reproduces bit-for-bit through every change, which was the binding
constraint: the dissertation's numbers had to survive the refactor of the engine that
produced them. Tagged `prj93-research-frozen` before any of it started.

---

## 6. Not done, and why

- **Phase 3 (de-Lune).** The engine still uses Lune's globals for every tenant
  (`STRUCTURAL_ZERO_DOW`, VAT, `MAX_RUNG`, `WEATHER_CELLS` keyed by slug). The per-venue
  profile is accepted and **reported as ignored** rather than honoured. The contract
  says so out loud rather than implying otherwise.
- **The 227 `print()` calls.** Phase 3 rewrites `ingest/` and `store/`, where 54 of them
  live. Doing logging first is work that refactor deletes.
- **`sim/` -> `research/`.** The brief calls it "30 one-off scripts". It is 18 scripts
  plus ~30 frozen artefacts that are the evidence chain, and moving it breaks the
  reproduction commands in report 31 and the decision log. Excluding it from the Docker
  image is right; that is a `.dockerignore` line, not a move.
- **The PII purge.** Ryan's own message claims it. It rewrites history across two
  remotes and this clone carries `brain/log/` that `andpro` does not.
- **Taxonomy drift wiring** (§3). Forecast-affecting; wants its own gate.

## 7. Obligations handed to the caller

**`bundle.org_id` is echoed, never an authorization statement.** The API must persist
under the orgId it already authorized and assert `bundle.org_id === expectedOrgId`. This
is in the schema, not a docstring, because the reviewer's point stands that it belongs in
the caller and no caller exists yet.

**A concurrency cap on `/compute`** belongs in the deployment: anyio's default is 40
concurrent, each holding Chronos and several GB.

## 8. Verdicts

1. The brief's central call (stateless compute, API owns persistence) is right, adopted, and it deleted more work than it created.
2. Three of the brief's claims were wrong; one traced to this project's own stale ledger, not to the reader.
3. The isolation claim is structural and survived an adversarial review that could not falsify it.
4. Two real bugs were found by building rather than planning: the cold-start 503 and the silently-dropped contract fields.
5. Nothing here changed a single dissertation number.
