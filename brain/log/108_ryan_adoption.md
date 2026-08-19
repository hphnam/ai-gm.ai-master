# 108 · Adopt from Ryan, one way, without moving a single measured number

**S36.** Read-only inventory, then classification, then a bounded adoption. One
repository (`ai-gm.ai-master`); the Overleaf clone was not touched. Direction one way;
nothing of ours went to Ryan and nothing was written to his repository. No API call, no
credential, no model load, no refit, no rescore.

Predecessors: S33 (`105_ryan_repo_audit.md`), S35 (`107_rulings_applied_and_exo_drafted.md`),
and report 101 §5, which triaged nine of his findings from his account before his
repository was reachable.

---

## 0 · State, both ends

| | at start | at end |
|---|---|---|
| our head | `b64eaf8b` | `b64eaf8b` + one commit on `ryan-adoption` |
| our branch | `ryan-adoption`, cut from `brain-construction-local` | same |
| `main` (ours) | `c611d2e1` | `c611d2e1` — **not touched** |
| pushed | nothing | **nothing** |
| their head, pinned | `cc93b6fa` | `cc93b6fa` |
| their head, live | `393b52ad` | `393b52ad` |
| store ceiling | **2026-07-07** | **2026-07-07** |
| working tree | `graphify-out/cache/last_query_stamp` modified; `.claude/skills/remove-ai-marks/` untracked | plus `brain/.gitignore` and the three files this package wrote |

**Their head moved between S33 and S36** — `master` is `393b52ad`, not `cc93b6fa`. The
spec's instruction was followed: `cc93b6fa` was used anyway, because a moving target
cannot be classified, and the newer SHA is recorded.

**The Overleaf clone, observed and not touched.** Its `main` is now `e0add42` and
`origin/main` matches, so the S34/S35 work was promoted and pushed between sessions. The
20,206-word document is what Overleaf serves. Recorded because the previous package left
that decision open; nothing here acted on it.

---

## 1 · Setup

`git branch ryan-adoption b64eaf8b` off the head of `brain-construction-local`, checked
out. Nothing merged to `main`, nothing pushed. The working tree at the start carried the
two known out-of-bounds entries and nothing else.

Ryan's clone was the S33 one, re-verified in place: `cc93b6fa123791863072ec594dc3162208fa6812`,
branch `master`, remote `github.com/andpro-digital/ai-gm.ai`. A `git ls-remote --heads`
against that remote — a read, no write, no credential copied — returned
`master 393b52ad`, `develop d9eefe72`, `brain-construction 393b52ad`.

---

## 2 · The fingerprint, before anything else

Recorded in full at `brain/ledger/adoption_fingerprint.md`. Ten of the eleven values
matched the spec's expectations exactly. Two did not, and both are reported there with
their causes: **value 11 is 12 endpoints, not 8**, and **value 9 is 678 collected with one
pre-existing FAILURE**, not 676 with none.

The script, so the instrument travels with the numbers:

```python
# fingerprint.py — run from brain/ with PYTHONPATH=brain and .venv-forecast/bin/python
from store.warehouse import connect
con = connect(read_only=True)
out["1_store_ceiling"] = str(con.execute("select max(date) from l1_daily").fetchone()[0])

# 2, 3: parsed from the three committed models/ladder_results_L1_*.md, plus their sha256.
#       The ladder is NOT re-run: that would be a rescore and a model load.

corpus = agent_eval.build_scaled_corpus(con)          # 4
cache  = agent_cache.ResponseCache(allow_live=False)
for inj in corpus:                                     # 5, 6
    objs = agent_eval.surface(inj, con)
    if not objs: continue
    d   = [briefing._item_to_dict(o) for o in objs]
    ctx = {"venue": inj.venue,
           "venue_label": config.VENUE_LABELS.get(inj.venue, inj.venue),
           "as_of": inj.as_of.isoformat(),
           "event_driven": inj.venue in config.EVENT_ONLY_VENUES}
    groups[cache.key(agent.build_payload(d, ctx))] += 1
    for o in objs:
        n_records += 1
        n_pos += int(bool(any(agent_eval.item_covers(o, tr) for tr in inj.truth)))

out["7_prompt_hash"]      = agent.prompt_hash(None)[:8]        # 7
out["8_fixed_payload_key"] = cache.key(agent.build_payload(FIXED_ITEMS, FIXED_CTX))  # 8
out["10_exo_cols"]        = list(CHRONOS2_EXO_COLS)            # 10
# 11: @app.{get,post,put,patch,delete}("...") over service/*.py, as a LIST not a count.
```

`FIXED_ITEMS` / `FIXED_CTX` for value 8 are literals constructed in the script — two
briefing items dated 2026-01-02 and 2026-01-03 with `item_key` `S36-FIXED-A` / `-B`. They
read nothing, so value 8 isolates the prompt, the model pin and the key function from the
store.

**Value 9 is a separate command and a different interpreter**:
`.venv-run/bin/python -m pytest` from `brain/`, with no `-q` of your own.
**Not `.venv-forecast`** — it carries `torch` and `chronos`, so a run there loads
foundation weights from a 677 MB cache. That is a model load, forbidden in this package,
and it was caught only because the first attempt sat at 24 % for twenty minutes at 937 %
CPU. It was killed and re-run in `.venv-run`.

---

## 3 · The inventory

### 3.1 · The shape of the two trees

| | ours | theirs |
|---|---:|---:|
| `brain/**/*.py` | 186 | 42 |
| top-level entries under `brain/` | 33 | 21 |
| files present on both sides | 46 | 46 |
| files present on one side only | 0 | 5 |

His `brain/` is a strict production subset, not a fork with improvements. The dominant
pattern in the seventeen shared Python files is **deletion of the research half**:
`config.py` 557 → 221, `eval/harness.py` 714 → 234, `ingest/exog_weather.py` 489 → 75,
`store/warehouse.py` 482 → 328, `conformal/wrap.py` 492 → 292. Where his files are larger
the growth is entirely in the serving path: `compute/engine.py` 219 → 501,
`features/build_features.py` 362 → 510, `compute/forward.py` 225 → 280.

His five new files: `Dockerfile`, `.dockerignore`, `DEPLOY.md`, `features/curated.py`,
`tests/test_serving_path_purity.py`, `tests/test_derived_calendar.py`.

He has no `signals/`, `sim/`, `ledger/`, `log/`, `knowledge/`, `docs/`, `drafts/`,
`hierarchy/`, `models_L2_L3/`, `scripts/`, `transfer/`, `skills/`, and his `ingest/` holds
three files against our fifteen.

### 3.2 · Reachability, computed rather than judged

Every fingerprint value was seeded into an AST import-closure walk over our tree — the
same technique his own purity guard uses, and for the same reason: the violation that
prompted it was an import inside a function body, which a scan of the top of a file cannot
see.

| seed set | modules reached |
|---|---:|
| 1 · store ceiling | 5 |
| 2, 3 · ladder | 22 |
| 4, 5 · corpus and calls | 38 |
| 6 · calibration | 39 |
| 7 · prompt hash | 3 |
| 8 · cache key | 5 |
| 10 · exogenous columns | 17 |
| **union** | **53** |

**All seventeen Python files that exist on both sides are inside that union.** Not one is
provably unreachable. Two chains are worth naming because they are not obvious from the
filenames:

- `models.ladder → org_profile → compute.contract` — so the compute contract is reachable
  from the ladder, which is why §4 refuses its three additive fields.
- `signals.briefing → signals.residual → conformal.wrap → features.build_features →
  ingest.exog_weather` — so the weather hindcast is reachable from the calibration corpus.

**One refinement, declared rather than assumed.** Fingerprint value 11 is a *list of route
decorators*, not a computed number, so its reachability is the two files it is read from
(`service/app.py`, `service/compute.py`) and not their import closure. Taking the closure
instead would pull 46 modules in and make every file in `brain/` class A by that value
alone, which would be a true statement that decided nothing. The narrow reading is used,
it is stated here, and it changed the classification of exactly one item — A15, which was
refused anyway and on other grounds.

### 3.3 · The merge, measured

The two repositories share history. `git merge-tree --write-tree` of `cc93b6fa` into
`b64eaf8b`, run in a throwaway clone:

| | |
|---|---:|
| merge base | `e79e317d`, 2026-07-16 |
| files under `brain/` at the merge base | **0** |
| conflicting paths | **44** |
| of those, under `brain/` | **34** |
| `add/add` conflicts | **40** |
| genuine three-way content conflicts | **4**, all outside `brain/` |

**`brain/` did not exist at the merge base.** Both sides created the whole directory
independently after 2026-07-16, so git has no common ancestor for any file in it and
cannot three-way merge one. Every `brain/` conflict is a whole-file choice between two
independently authored versions.

That answers the package's aim directly and not in the direction it was posed:
**"adopt his changes so a later push does not conflict" cannot be done by adopting
changes, because there are none — there are two trees.** The four real content conflicts
are `apps/api/src/app.module.ts`,
`apps/web/src/components/chat/tool-cards/tool-card-router.tsx`, `package.json` and
`package-lock.json`.

---

## 4 · Classification

The full register, one row per divergence with what it would move and what an integrator
must do afterwards, is `brain/ledger/ryan_divergence.md`. What follows is the reasoning
that produced it, and the four items the spec asked to be answered explicitly.

### 4.1 · The four the spec named up front

The spec named four items it expected to be class A, so a wrong call would be visible.
All four are class A, and three of them are class A for a reason the spec did not have.

| item | verdict | the reason, corrected where the spec's premise was wrong |
|---|---|---|
| `is_peak_trading_day` | **A** | As expected. It replaces `is_weekend` at a fixed position in `calendar_features`, and his own docstring says the position is load-bearing because tree split ties break on feature index. Moves values 2, 3 and 5. |
| `WITH_FOUNDATION=0` | **A, but it is not a Python constant** | It exists nowhere in Python on either side. It is a **Dockerfile build ARG** (`brain/Dockerfile:19`) that decides whether `torch` and `chronos` are pip-installed into the deployed image. It cannot register or de-register an entrant in this tree, because nothing here reads it. It is refused as part of A20, with the deployment artefacts, and for a different reason: three of the four environment knobs those artefacts declare name variables our code does not read. |
| `evaluate_rolling(..., with_prophet=False, pooled=False)` | **A** | As expected, and it is a **new call site** in `compute/engine.py:403`, not an edit to ours. But it also passes `feats=` and `deadline=`, which change `evaluate_rolling`'s signature in `models/ladder.py`. Moves values 2 and 3, and drops two of the nine entrants the document reports. |
| `EXO_ENABLED = []` | **A, and it is not in `brain/` at all** | It is a TypeScript constant in `apps/api/src/modules/proactive-brain/brain-dataset.service.ts:23`, on the API side. His `brain/` has no `EXO_ENABLED`; the brain-side equivalent is `org_profile.exo_families()`, which on his tree raises when unbound (A7). The fifteen columns S35 measured are unaffected by anything named `EXO_ENABLED`. |

**Two of the four premises the spec was built on were wrong, and both were wrong in the
same direction**: they attributed to `brain/` a change that lives somewhere else. Neither
error changes the verdict.

### 4.2 · The class A finding that matters most

**`org_profile.py`: his unbound accessors raise; ours resolve to the estate constants.**
That single difference makes every other row permanent, because on his `org_profile.py`
nothing in `brain/` runs outside a bound request — no CLI, no `sim/`, no test suite, no
ladder, no fingerprint value.

And his own `CONTRACT.md` §4 still says the opposite, verbatim at `cc93b6fa`:

> The **unbound** research path is untouched: every family on, resolving to Lune's
> constants, which is its published configuration and the reason report 31's numbers still
> reproduce from shipped code.

At the same commit, `org_profile.py` has no `import config` and every accessor calls
`_require()`, which raises. **The interface document and the code disagree on the one
question that decides whether the two trees can ever be one.** An integrator must read the
code. This is worth taking back to Ryan; it was not, because nothing goes to him from this
package.

### 4.3 · The one row where his side is behind ours

`requirements-eval.txt`: he has `vus>=1.0`, we have `vus>=0.0.6`. `vus` has never
published a 1.0 — PyPI tops out at 0.0.6 — so his file cannot be resolved and `.venv-eval`
cannot be built from its own spec (report 58 measured this). Recorded so that an
integrator reconciling the two files does not "fix" ours to match his.

### 4.4 · His purity guard, run against our tree

`tests/test_serving_path_purity.py` was executed unmodified from the scratchpad, with only
its `BRAIN` root rebound to our `brain/`. It **fails**, with two violations:

```
ingest.normalise   read_csv()  at line 94   via compute.loader  -> store.warehouse -> ingest.normalise
ingest.world_cup   read_text() at line 134  via compute.forward -> features.build_features -> ingest.world_cup
```

and all three curated modules are reachable from our serving path:

```
ingest.calendar_sources  via compute.forward -> features.build_features -> ingest.calendar_sources
ingest.local_events      via compute.forward -> features.build_features -> ingest.local_events
ingest.world_cup         via compute.forward -> features.build_features -> ingest.world_cup
```

His own positive control passes (`{features.build_features, models.ladder, conformal.wrap}`
are all inside the closure), so the walk resolved rather than passing on an empty set.

This is report 101 R-6 confirmed by a second instrument, written independently, on the
other side. **It also settles `test_serving_path_purity.py`'s own classification**: it
cannot be adopted, because adopting a test that fails is not an adoption, and making it
pass requires `features/curated.py` plus the `research/` split, which is class A.

### 4.5 · `ComputeDataset` — measured, and the answer is "document it"

The spec asked whether our side already satisfies the contract his API calls, and to say
which. **It does not.** The payload his `brain-dataset.service.ts:102-172` assembles was
transcribed field for field and validated against our `compute.contract.ComputeDataset`:

```
=== FULL payload as his API sends it ===
REJECTED
  extra_forbidden        loc=prior_state.last_refit_by_venue
  extra_forbidden        loc=max_refits
=== same payload with the two new fields removed ===
ACCEPTED
```

Exactly two fields, both `_Strict` extra-field rejections, both belonging to the refit
ration. Everything else validates unchanged.

**And the correct action is still to write no code.** Adding the two as ignored optionals
would make our engine accept `max_refits: 4`, re-select nothing, and say nothing — a
caller that asked for four re-selections and budgeted a timeout for them would get a
silent zero. The 422 is the honest answer until the ration itself is adopted. So the
conformance is documented, in `brain/ledger/ryan_divergence.md` §3, and the two fields stay
out.

---

## 5 · What was applied, and the fingerprint at the other end

### 5.1 · Applied

**Class B: nothing. Class C: one item.**

`brain/.gitignore`, one hunk of three:

```diff
-# Raw data is symlinked from the repo root, never committed here
-data/*.csv
+# Raw data lives here at runtime, never committed (real venue trade and PII).
+# Broadened from `data/*.csv` to the whole directory: the extension list was
+# never the boundary, and `data/stock/*.xlsx` walked straight through it.
+data/
```

**Confirmation that no code path imports it**: a `.gitignore` is read by git alone;
pytest's `testpaths = ["tests"]` does not reach it; it is not among the files the
fingerprint hashes; and `git status --untracked-files=all -- brain/data` was empty both
before and after, so it newly hides nothing that was visible.

**His other two hunks in the same file were refused**: he also deletes `.venv-run/` and
`.venv-tabpfn/`, which are venvs this tree has and his does not — and `.venv-run` is the
interpreter value 9 is measured in.

### 5.2 · Why class B came out empty

The closest call was his redacted 422 handler in `service/compute.py`, which stops
pydantic echoing a whole rejected sales list — 68 MB of one tenant's rows — into the
caller's logs. It is a real fix and it is refused, on three grounds in this order:

1. **The leak's precondition does not exist here.** `POST /compute` in this tree is
   exercised only by the test suite, with synthetic data. No tenant's rows are ever in a
   request to this engine.
2. **It arrives with his side.** `service/compute.py` is an `add/add` path: on a handover
   his file is taken whole, fix included. Re-deriving it here creates a second version of a
   file that already conflicts, which is the opposite of the stated aim.
3. V5's rule for a class B adoption is a flag defaulting to current behaviour **plus a
   test**, and a new test moves value 9. That is the wrong price for a fix to a leak this
   side cannot have.

**This is recorded so it reads as a timing decision and not as a verdict on the fix.** It
is necessary on his side, today.

### 5.3 · The fingerprint at the other end

Same script, same interpreters, same commands.

| # | value | V2 (before) | V6 (after) | |
|---|---|---|---|---|
| 1 | store ceiling | 2026-07-07 (650 rows) | 2026-07-07 (650 rows) | = |
| 2 | served, Beer Hall | `rung4_chronos2_exo` 0.745 | `rung4_chronos2_exo` 0.745 | = |
| 2 | served, Two River Taps | `rung2_ets` 0.597 | `rung2_ets` 0.597 | = |
| 2 | served, Ellel | `rung1_robust_dow` 0.572 | `rung1_robust_dow` 0.572 | = |
| 3 | ladder scoreboard, 30 cells | artefact sha `4639a147…` / `e4b100b5…` / `4ef1cd67…` | identical | = |
| 4 | injection corpus | 644 (356 / 252 / 36) | 644 (356 / 252 / 36) | = |
| 5 | distinct calls | 420 (339 / 81 / 305) | 420 (339 / 81 / 305) | = |
| 6 | calibration corpus | 1,593 / 534 / 0.3352 | 1,593 / 534 / 0.3352 | = |
| 7 | prompt hash | `c1137f76` | `c1137f76` | = |
| 8 | fixed-payload cache key | `f49ca935bab6859a…` | `f49ca935bab6859a…` | = |
| 9 | test suite | 1 failed, 669 passed, 8 skipped | 1 failed, 669 passed, 8 skipped | = |
| 10 | exogenous columns | 15, `is_bank_holiday` … `exo_is_dry` | identical, same order | = |
| 11 | endpoints | 12, the same 12 paths and verbs | identical | = |

The two JSON captures are **byte-identical**, SHA-256
`2c0533c4b700ca51fa69ccefec6fd0e3a516b4c09b73b5c8fe1134bdd511f681` at both ends. Value 9
is the same three counts and the same single failing test,
`test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted` — which fails at the
baseline too and is diagnosed in `brain/ledger/adoption_fingerprint.md` §2.

Also confirmed: no served model changed, no frozen artefact was modified (the fourteen
source and artefact hashes in `x_frozen_sha256_16` are unchanged), no store row was
written, the ceiling is still 2026-07-07, and the suite was not reduced — 678 collected
both times.

**One caveat stated rather than buried.** The V6 capture was taken after the class C edit
and after `brain/ledger/adoption_fingerprint.md` and `brain/ledger/ryan_divergence.md` were
written, but before this report and the decision-log row. Those two remaining writes are
markdown under `brain/log/`, which pytest does not collect and no module imports, so no
value can move on them.

---

## 6 · The register

`brain/ledger/ryan_divergence.md`, pinned to both SHAs. Twenty-one class A rows, each with
what differs, which fingerprint value it would move, why our side is correct **for this
work** rather than in general, and what a future integrator has to do to close it after
submission.

Its §4 is not a divergence and is the most urgent thing in this package. It is repeated
here because a register nobody opens is not a disclosure:

**Twenty-one files of real venue trade and PII are tracked in this repository and are on
the remote** — `brain/data/items-2024-01-01-2026-06-01.csv` at 77 MB of item-grain sales,
`brain/data/Elliot's AI-GM Questions - Query result.csv`, and eighteen `.xlsx` stock sheets
under `brain/data/stock/`. They are in `origin/brain-construction-local` and in
`origin/main` at `github.com/hphnam/ai-gm.ai-master`, added by commit `58e9b792`
*"data enrichment"* before any ignore rule existed, and `.gitignore` does not untrack.

Found here because Ryan's `.gitignore` line — the one item this package adopted — reads
*"Purged from history on brain-construction 2026-07-20; keep it out for good."* His side
did the purge. Ours did not. **The class C adoption stops the next one and remediates
none of these**; removal needs a history rewrite and a force push, which is Nam's decision
and not an adoption package's.

---

## 7 · Close

| class | count | |
|---|---:|---|
| **A · refused** — reachable from a fingerprint value, or reachability unproven | **21** | A1–A21 |
| **B · adopted, gated** | **0** | — |
| **C · adopted, inert** | **1** | C1, `brain/.gitignore` |

**Verdict: no measured value moved.** All eleven fingerprint values are identical at both
ends, the two JSON captures share a SHA-256, and value 9 reproduces the same three counts
and the same single pre-existing failure.

Three things this package established that were not in the brief:

1. **`brain/` does not exist at the merge base.** All 34 `brain/` merge conflicts are
   `add/add`; git cannot three-way merge one of them. The handover is a branch split, which
   his own code already declares, not a merge.
2. **Our contract rejects his API's current payload**, on exactly two extra fields, both
   belonging to the refit ration. Documented, not coded around.
3. **`evaluate_static("ellel")` cannot complete on this tree**, and has not been able to
   for some time — `config.VENUE_SCALE_BASIS["ellel"] == "unscaled"` reaches
   `harness._scale_pairs` before the two places `models/ladder.py` handles it. No figure in
   the dissertation rests on it; the Ellel static table in the committed artefact is not
   currently reproducible. Recorded, not repaired.
