# Divergence register — our `brain/` against Ryan's, pinned

**This is the handover document.** It is what makes a divergent codebase a decision
rather than an accident. Every row is a difference that is **deliberately not closed**
before submission, with what it would cost to close it and what a future integrator has
to do afterwards.

| | |
|---|---|
| ours | `b64eaf8b` — `hphnam/ai-gm.ai-master`, branch `ryan-adoption` off `brain-construction-local` |
| theirs | `cc93b6fa` — `andpro-digital/ai-gm.ai`, branch `master`, pinned |
| their live head at the time | `393b52ad` (moved since S33; the pin was used anyway, because a moving target cannot be classified) |
| merge base | `e79e317d`, 2026-07-16 |
| written | 2026-08-19, S36 (`brain/log/108_ryan_adoption.md`) |

---

## 0 · The one fact that governs every row below

**`brain/` does not exist at the merge base.** `git ls-tree e79e317d -- brain` returns
zero files. Both sides created the entire directory independently after 2026-07-16.

A `git merge-tree` dry run of `cc93b6fa` into `b64eaf8b` produces **44 conflicting paths,
34 of them under `brain/`, and 40 of the 44 are `add/add`**. An add/add conflict has no
common ancestor, so git cannot three-way merge it: every one is a whole-file choice
between two independently authored versions. The only four genuine content conflicts are
outside `brain/` — `apps/api/src/app.module.ts`,
`apps/web/src/components/chat/tool-cards/tool-card-router.tsx`, `package.json` and
`package-lock.json`.

**So "adopt his changes so a later push does not conflict" is not achievable by adopting
changes.** There are no changes to adopt; there are two trees. Taking his file makes the
conflict go away by discarding ours, which for 22 of the 34 `brain/` paths discards a
measured result.

**His own code already names the resolution, and it is not a merge.**
`org_profile.py`'s docstring at `cc93b6fa`, verbatim: *"The research path lives on its own
branch now; here, a profile is required."* `tests/test_serving_path_purity.py`, verbatim:
*"That package is gone from this branch."* `features/curated.py` is the declared seam
between them. **He has already split research from serving into two branches.** The
handover instrument is that split, plus this register, not a merge.

---

## 1 · Class A — refused. Reachable from a fingerprint value, or unproven.

Reachability was computed mechanically, not judged: an AST walk of the first-party import
closure of the modules that produce each fingerprint value, seeing function-body imports.
**All seventeen Python files that exist on both sides are in that closure.**

### A1 · `is_weekend` → `is_peak_trading_day`

`features/build_features.py:162` (ours) against `:346` (his). He replaces the fixed
`dow >= 5` indicator with a peak-trading-day flag learned from the venue's own takings.

- **Moves:** values 2 and 3 (every entrant that reads the feature frame), and 5 (the
  detectors read residuals from it). Direction unknown here; his own figures are on his
  denominators and are not comparable (report 101 R-2).
- **Why ours is correct for this work:** the document reports a gate scored on a frozen
  feature frame. A better feature is a different frame, and a different frame is a
  different set of numbers in a body of 20,206 words that cannot be re-measured before
  4 September.
- **After submission:** adopt it, re-run the ladder at all three venues, re-issue
  `models/ladder_results_L1_*.md`, and re-check the served-model selection. It is the
  single most valuable row here — it is also an **occurrence** signal, which C7 named as
  the variable the closure calendar fails to track, and it is available at forecast time,
  so it is a candidate method rather than the oracle ceiling
  (`appendix/pseudocode.tex:247-249`). That reclassification is a substantive change to
  what Further Work can claim and needs Nam's ruling, not an integrator's.

### A2 · `season = month % 12 // 3` → annual Fourier harmonics

His `_attach_annual_harmonics` gates one or two harmonics on observed span
(730 / 1095 days) and writes `doy_sin_k` / `doy_cos_k`, zero below the gate so the column
set never forks on history length.

- **Moves:** 2, 3. **Ours is correct for this work** for A1's reason. Report 101 R-7
  already established our `season` is test-only and immaterial, so this is a pure
  improvement we are declining on timing, not on merit.

### A3 · The curated-covariate seam: `features/curated.py` + the `research/` split

His `features/curated.py` (his side only, 123 lines) is a provider registry: curated data
declares its own columns and attach slots, `_PROVIDERS` is empty on the serving path, and
`compute/` cannot import the data at all. Three curated modules move to `research/`.

- **Moves:** 2, 3, 10, and the frame width (43 columns to 32 for a tenant).
- **It is inert only in isolation.** Adopted alone, nothing imports it and it is dead
  code; wiring it means editing `features/build_features._attach_exog`, which is A1's
  file. **His own docstring says the placement is load-bearing**: *"a column that moves
  changes a forecast while every value stays identical"*, because tree split ties break
  on feature index.
- **Measured here:** his guard `tests/test_serving_path_purity.py`, run unmodified
  against our tree, **fails with two violations** — `ingest.normalise` (`read_csv` at
  line 94, via `compute.loader → store.warehouse`) and `ingest.world_cup` (`read_text` at
  line 134, via `compute.forward → features.build_features`) — and all three curated
  modules are reachable from our serving path. His positive control passes, so the walk
  resolved. This is report 101 R-6 confirmed by a second, independent instrument.
- **Why ours is correct for this work:** the reachability is disclosed, by column name,
  in `appendix/pseudocode.tex:88-101`, and the curated columns are held constant across
  both limbs of the weather contrast, so they cannot manufacture the null.
- **After submission:** adopt the registry, then A1 and A2 with it, then re-run.

### A4 · `is_ellel_event` → `is_sibling_event_venue_trading`

`ingest/exog_supplied.KNOWN_EXO_COLS` and `models/foundation._CALENDAR_EXO`.

- **Moves value 10 directly and provably.** Value 10 is
  `models.foundation.CHRONOS2_EXO_COLS`, and it lists `is_ellel_event` by name. This is
  the one row where the fingerprint would move on a rename alone, with no numeric change
  at all.
- **Why ours is correct for this work:** the column name appears in the document
  (`methodology.tex`, `appendix/pseudocode.tex`) and in three committed artefacts.
- **After submission:** a rename plus a re-issue of the appendix column list. Cheap, and
  his name is better — it says what the column measures instead of which venue produced it.

### A5 · `models/foundation.py` — the pinned weight revisions are gone

He removes `CHRONOS2_REVISION`, `CHRONOS_REVISION` and `_revision_for`, and drops
`revision=` from every `from_pretrained` call. He also removes `DEFAULT_SERIES_ID` and the
`series_id` parameter (our grouped multi-venue path).

- **Moves:** 2 and 3, silently and at an unknown future moment. Our own comment states the
  hazard: *"A model id alone lets the weights move under a re-tag or re-upload, which
  would silently change zero-shot output and invalidate the frozen pre-registration
  artefacts in `sim/`."*
- **Why ours is correct for this work:** it is the difference between a reproducible
  result and a result that happened once.
- **After submission:** his choice is defensible for a container that must take security
  updates. Keep the pins on the research branch regardless; they cost nothing there.

### A6 · `requirements-forecast.txt` — `torch==2.12.1` → `torch>=2.12,<3`

Same class as A5 and the same verdict. Our comment names the exact stake: *"selection is
version-dependent (Two River Taps ETS 0.597 vs GBM 0.602)"* — a 0.005 gap that a torch
build can invert. **Moves 2 and 3.**

### A7 · `org_profile.py` — unbound raises instead of resolving to the estate constants

His `_require()` raises on every accessor when no profile is bound; there is no
`import config` in the file at all.

- **Moves every value.** The research path binds nothing, so on his `org_profile.py`
  nothing in `brain/` runs.
- **Why ours is correct for this work:** the unbound path is *how* report 31's numbers
  reproduce from shipped code.
- **His CONTRACT.md contradicts his own code on exactly this point.** `CONTRACT.md` §4 at
  `cc93b6fa` says verbatim: *"The unbound research path is untouched: every family on,
  resolving to Lune's constants, which is its published configuration and the reason
  report 31's numbers still reproduce from shipped code."* At the same commit
  `org_profile.py` raises when unbound. **The interface document and the code disagree on
  the one question that decides whether the two trees can ever be one.** An integrator
  must read the code, not the contract, and should raise it with Ryan.
- **After submission:** this is the row that makes the split permanent. It is correct on
  both sides for their own purpose and neither should adopt the other.

### A8 · `config.py` — roughly 200 lines of estate constants deleted

Ours 557 lines, his 221. **Moves every value.** Same verdict and mechanism as A7.

### A9 · `eval/harness.py` — the four-basis MASE ruler removed

Ours 714 lines, his 234. His `mase` takes `season=7`; ours takes
`basis ∈ SCALE_BASES`. The four bases are a methodological contribution of this project —
the finding that at Ellel the denominator basis moves the same forecast between 0.411 and
0.092 (`methodology.tex:218`). **Moves 2 and 3, and deletes a result.** His
`tests/test_a2_harness.py` tracks it (`harness.mase(y, y, train, season=7)`).

### A10 · `conformal/wrap.py`, `ingest/exog_weather.py`, `store/warehouse.py`

The same shape: 492→292, 489→75, 482→328 lines. Each is our file with the research half
removed — the Mondrian research paths, the three-basis weather hindcast, the DuckDB build
path. `wrap.py` is reachable from value 6 via `signals.briefing → signals.residual`;
`exog_weather` from values 2, 3 and 10; `warehouse` from value 1. **All refused.**
`store/warehouse.py` additionally gains `BRAIN_DUCKDB_MEMORY_LIMIT` and
`BRAIN_DUCKDB_THREADS`, which our tree does not read at all — see C-refused-1.

### A11 · `models/ladder.py` — the per-tenant re-selection

His `compute/engine.py:403` calls
`ladder.evaluate_rolling(venue, feats=feats, horizon=7, with_prophet=False, pooled=False, deadline=budget.deadline)`.
Ours is called once, from `models/ladder.py:803`, as
`evaluate_rolling(venue, n_folds=6, horizon=7)`.

- The new call site is additive, but the parameters are not: `feats=`, `deadline=` and the
  two `False`s change `evaluate_rolling`'s signature and its entrant set. **Moves 2 and 3.**
- `with_prophet=False, pooled=False` removes two entrants; our tables score
  `rung2_prophet` as unavailable and `rung3_global_gbm` as present, and the document
  reports nine entrants scored at each venue.
- **After submission:** this is the fix to report 101 R-1 — the defect both codebases
  found independently, that the ladder never re-runs and every tenant serves from cold
  start. Adopt it with A12.

### A12 · `compute/engine.py`, `compute/forward.py`, `compute/contract.py` — the refit ration

`max_refits` (default 0), `PriorState.last_refit_by_venue`, `REFIT_BUDGET_SECONDS`,
`MAX_SELECTION_FOLDS = 156`, and a serving-specific selection gate that deliberately does
**not** reuse `ladder.milestone` (his reasoning: the milestone asks "has any model beaten
the baselines", which is correctly false when a baseline wins, so the re-fit would spend
its budget and refuse its own answer).

`compute/contract.py` is reachable from values 2, 3, 6 and 10 via
`models.ladder → org_profile → compute.contract`. Additive-with-defaults is not the test
this package applies; reachable is.

**See §3 for what this costs us at the API boundary today.**

### A13 · `compute/loader.py` — `RECONCILE_TOL` relocated

Identical value (0.01) moved from `config.py:217` into `loader.py`. Refused not because it
is dangerous but because it is a **consequence** of A8: he moved it because his `config.py`
no longer holds it. Adopting the consequence without the cause defines the constant twice.

### A14 · `service/auth.py` — the crash message drops the `BRAIN_ALLOW_INSECURE` hint

A string change with a good production reason (do not offer an operator staring at a
crash-looping deploy the fix that turns authentication off). **Refused: we have no
production.** It costs a research developer the one line that tells them how to run the
service locally, and buys a protection against an outage that cannot happen here.

### A15 · `service/compute.py` — the redacted 422 handler

His new `RequestValidationError` handler returns type, loc and msg and drops `input` and
`ctx`. The defect it fixes is real and specific: pydantic's `too_long` error carries the
whole rejected list, so a dataset one row over `MAX_SALES_ROWS` came back as a 68 MB body
containing every one of that tenant's sales rows, which the caller logs.

**Refused, and this is the closest call in the register.** Three reasons, in order:

1. **The leak's precondition does not exist on this side.** `POST /compute` here is
   exercised only by the test suite, with synthetic data. No tenant's rows are ever in a
   request to this engine.
2. **It arrives with his side.** `service/compute.py` is an add/add path; on a handover
   his file is taken whole, fix included. Re-deriving it here creates a second version of
   a file that already conflicts, which is the opposite of the stated aim.
3. It touches one of the two files fingerprint value 11 is measured from, and V5's own
   rule for a class B adoption is a flag defaulting to current behaviour plus a test — and
   a new test moves value 9. Paying that for a fix to a leak we cannot have is the wrong
   trade.

**An integrator must not read this row as a judgement that the fix is unnecessary.** It is
necessary, on his side, today.

### A16 · `CONTRACT.md` and `README.md`

Both describe a tree we do not have (`research/`, the 32-column tenant frame, the tenant
column table). Two specific defects found while checking them:

- **`CONTRACT.md` §4 contradicts his `org_profile.py`** — see A7.
- **`README.md` and `CONTRACT.md` both name `ingest.trading_hours.derive_trading_hours`.
  No such module exists at `cc93b6fa` on either side.** Ours is
  `ingest/world_cup.py:202`; his `ingest/` holds three files and none is
  `trading_hours.py`. The rename is described in his prose and absent from his tree.

### A17 · `pyproject.toml`

His mypy `files` and a ruff comment name `research`, a package absent here. Adopting it
makes mypy fail on a missing path. **Not applicable rather than hazardous.**

### A18 · The twelve shared test files

`conftest.py`, `test_a1_warehouse.py`, `test_a2_harness.py`, `test_a3_features.py`,
`test_a4_ladder.py`, `test_a5_conformal.py`, `test_compute_engine.py`,
`test_exog_supplied.py`, `test_foundation.py`, `test_liveness_gate.py`,
`test_org_profile.py`, `test_scratch_store.py`. Every one tracks a class A source change.
Refused with the source they test.

### A19 · His two new tests

`tests/test_serving_path_purity.py` — **measured to fail here**, see A3.
`tests/test_derived_calendar.py` — tests `is_peak_trading_day` and the harmonics, which
this tree does not have. Both refused with A1–A3.

### A20 · `Dockerfile`, `.dockerignore`, `DEPLOY.md`

His three deployment artefacts. **Refused, and the reason is not caution.** Three of the
four environment knobs they declare name variables **our code does not read**:

| knob | his tree | ours |
|---|---|---|
| `BRAIN_SHARED_SECRET` | required, refuses to boot | ✓ same (`config.py:557`, `service/auth.py`) |
| `BRAIN_DUCKDB_MEMORY_LIMIT` | read by `store/warehouse.py` | **absent** — we read only `BRAIN_DUCKDB_PATH` |
| `BRAIN_DUCKDB_THREADS` | read by `store/warehouse.py` | **absent** |
| `BRAIN_REFIT_BUDGET_SECONDS` | bounds the refit ration | **absent** — the ration is A12 |

A deployment document that names an environment variable the code ignores is worse than no
document, because an operator sets it and believes it took effect. Adopting them with those
lines removed would not be adopting his artefact; it would be authoring a new one from his,
which is beyond what an adoption package licenses.

**After submission:** take all three verbatim, together with A10 and A12, which is what
makes them true.

### A21 · `requirements-eval.txt` — the one row where his side is behind

`vus>=0.0.6` here against `vus>=1.0` there. **Ours is the fix and his is the defect.**
`vus` has never published a 1.0 — PyPI tops out at 0.0.6 — so his `requirements-eval.txt`
cannot be resolved and `.venv-eval` cannot be built from its own spec (report 58).
Nothing to adopt. Direction is one way into this repo, so nothing is sent; it is recorded
here so an integrator does not "fix" our file to match his.

---

## 2 · Class C — adopted. One item.

### C1 · `brain/.gitignore`: `data/*.csv` → `data/`

```diff
-# Raw data is symlinked from the repo root, never committed here
-data/*.csv
+# Raw data lives here at runtime, never committed (real venue trade and PII).
+# Broadened from `data/*.csv` to the whole directory: the extension list was
+# never the boundary, and `data/stock/*.xlsx` walked straight through it.
+data/
```

His own line reads *"Purged from history on brain-construction 2026-07-20; keep it out for
good."* No code path imports a `.gitignore`; pytest's `testpaths` does not read it; no
fingerprint value is derived from it. It newly hides nothing — `git status
--untracked-files=all -- brain/data` was already empty.

**Two of his three hunks in this file were refused**: he also deletes `.venv-run/` and
`.venv-tabpfn/`, which are venvs we have and he does not.

**This does not remediate anything already tracked. See §4.**

---

## 3 · The `ComputeDataset` contract — measured, not assumed

S33 established that the API aggregates `venueSalesDaily` to venue-by-date and hands the
brain a dataset, so `NeonAdapter` was a superseded plan and no ingest work is owed. The
open question was whether our side already satisfies that contract.

**It does not.** The payload his `brain-dataset.service.ts:102-172` assembles was
transcribed field for field and validated against our `compute.contract.ComputeDataset`:

```
=== FULL payload as his API sends it ===
REJECTED
  extra_forbidden        loc=prior_state.last_refit_by_venue
  extra_forbidden        loc=max_refits
=== same payload with the two new fields removed ===
ACCEPTED
```

Exactly two fields, both `_Strict` extra-field rejections, and both belong to A12's refit
ration. Everything else — `org_profile`, `sales_daily`, `trading_hours`, `exogenous`,
`prior_state`, `horizon_days` — validates unchanged.

**The correct action is to document this, not to write code, and specifically not to add
the two fields as ignored optionals.** A contract that accepts `max_refits: 4` and then
re-selects nothing is a silent lie to a caller that asked for four re-selections and
budgeted a timeout for them. The 422 is the honest answer until A12 is adopted.

His `VenueProfile` also gains `subdivision` and a `max_length=128` on `slug`. **Neither is
a break today** — his API sends no `subdivision` at `cc93b6fa`, and our `slug` is
unbounded, so a bounded value passes.

---

## 4 · Not a divergence, and more urgent than any of them

**Twenty-one files of real venue trade and PII are tracked in this repository and are on
the remote.**

```
brain/data/items-2024-01-01-2026-06-01.csv          77,045,466 bytes
brain/data/Elliot's AI-GM Questions - Query result.csv   299,353 bytes
brain/data/opening_and_closing_checklist.md
brain/data/stock/*.xlsx                                  18 files
```

Present in `origin/brain-construction-local` and in `origin/main` at
`github.com/hphnam/ai-gm.ai-master`. Added in commit `58e9b792` *"data enrichment"*,
before the `data/*.csv` ignore rule existed — and `.gitignore` never untracks.

**C1 does not fix this.** It stops the next one. Removing these needs a history rewrite and
a force push, which is a decision for Nam and not one an adoption package takes. Ryan's
side did exactly that on 2026-07-20 and says so in the line C1 adopts.

---

## 5 · Summary

| class | count | items |
|---|---:|---|
| **A · refused** | **21** | A1–A21 |
| **B · adopted, gated** | **0** | — |
| **C · adopted, inert** | **1** | C1 |

**No measured value moved.** The eleven-value fingerprint is byte-identical before and
after; see `brain/ledger/adoption_fingerprint.md` and `brain/log/108_ryan_adoption.md` §5.
