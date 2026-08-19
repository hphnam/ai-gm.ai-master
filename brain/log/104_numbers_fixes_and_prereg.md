# Report 104 · S32 · The numbers recorded, the two blockers cleared, the pre-registration drafted

**Package:** S32. **No API call was made and the credential was not used. The run was not
started.** No `.tex` file was edited; counted body words spent: **zero**.
**Predecessors:** S29 (`102_post_push_free_repairs.md`), S30 (`103_agent_eval_scope.md`).
**S31 was not run**, per this package's instruction: its V3 rested on a premise S30 §4 V3.7
measured false.

## 0 · State

| | |
|---|---|
| date | 2026-08-19 |
| ai-gm `brain-construction-local`, at open | `e9441de9`, 0 unpushed |
| ai-gm working tree, at open | 1 entry, `?? .claude/skills/remove-ai-marks/` (out of bounds) |
| prj93-overleaf `main` | `019f1354` local = remote, **untouched by this package** |
| **store ceiling, before** | `l1_daily` max date **2026-07-07**, 650 rows |
| **store ceiling, after** | `l1_daily` max date **2026-07-07**, 650 rows — **unchanged** |
| interpreter | `brain/.venv-forecast/bin/python` (3.12) and `.venv-run` (3.14) |
| store access | `read_only=True` on every open, every pass |
| prompt hash, before and after | `c1137f76a76f…` — **identical** |

---

## 1 · V1 — The numbers ledger

`brain/ledger/agent_eval_numbers.md` exists. **Every quantity was re-derived by executing the
apparatus, not transcribed from report 103's prose**: the script builds the corpus, surfaces
every injection, constructs every payload and hashes every cache key through
`build_scaled_corpus`, `surface`, `build_payload` and `ResponseCache.key`.

| quantity | re-derived | report 103 | |
|---|---|---|---|
| corpus | 644 | 644 | match |
| by venue | 356 / 252 / 36 | 356 / 252 / 36 | match |
| by kind | 288 / 252 / 84 / 20 | 288 / 252 / 84 / 20 | match |
| distinct calls | 420 | 420 | match |
| unique / shared payloads | 339 / 81 | 339 / 81 | match |
| largest shared group | 24 | 24 | match |
| injections surfacing nothing | 0 | 0 | match |
| records | 1,593 | 1,593 | match |
| positive records | 534 | 534 | match |
| base rate | 0.335 | 0.335 | match |
| items on distinct payloads | 1,102 | 1,102 | match |
| conflicting-truth payloads / slots | 3 / 4 | 3 / 4 | match |
| payload chars (median/mean/min/max/total) | 1,708 / 1,896 / 809 / 3,464 / 796,455 | same | match |
| system prompt / schema chars | 4,110 / 376 | 4,110 / 376 | match |
| **injections in shared groups** | **305** | **"224"** | **DISAGREES** |

### 1.1 The disagreement, and it makes the limitation larger

Report 103 §5.4 states, verbatim:

> If 224 injections share a cached response with another injection

**Re-measured: 305 injections sit in a shared group.** Those 305 collapse into 81 payloads,
and 305 − 81 = **224 is the number of calls avoided**, which is also 644 − 420. The two
quantities were conflated.

The consequence is not cosmetic. **The independence limitation covers 305 injections, not 224
— 47 per cent of the corpus, not 35 per cent.** Both figures are recorded in the ledger with
their distinct meanings: 305 for the independence claim, 224 for the cost saving. Report 103 is
**not edited**; the ledger supersedes it on this point and says so in the ledger, which is
where the claim will next be read.

**Fold counts re-measured** and confirming the 4 / 3 / 1 decomposition: beer_hall 4 of 4,
two_river_taps **3 of 4** (post-closure folds dropped), ellel 1 of 1 (50-day stream).

**Acceptance gate V1: met.** Every quantity re-derived; the one disagreement flagged rather
than silently resolved; the file exists; decision-log row **123** points to it.

---

## 2 · V2 — The blocker that stopped the run starting

`signals/agent.py` sent `temperature=config.AGENT_TEMPERATURE` (0.0) to `claude-opus-4-8`.
Sampling parameters were removed on Opus 4.7 and later and now return 400, so the build failed
on call one even with a valid credential. **The argument is removed**, with a comment recording
why so it cannot be reinstated as a tidy-up.

**The freeze survived, demonstrated rather than asserted.** The same fixed constructed payload
was hashed through the same code path before and after the edit:

| | before | after |
|---|---|---|
| prompt hash | `c1137f76a76fff5ecbdc53c484d1964175f30e6bcb9796aca07667fd95480c66` | **identical** |
| cache key | `298f48e09b68ab3f5bf1fde238bbe9d6ca6565a2a91042e361e7bcf140e4c350` | **identical** |

A byte-level `diff` of the two probe outputs is empty. Temperature was never a term in
`hash(model, prompt_hash, payload)`, and that is now shown, not claimed.

`config.AGENT_TEMPERATURE` is **left in place**. It is quoted by
`ledger/numbers_audit.md:187` as the evidence for a methodology sentence
(*"Temperature is zero and the model identifier is pinned"*), and removing the constant would
silently falsify a traced claim in the document. **That sentence is now stale and is flagged
for Nam** — see §7. Correcting it is a `.tex` edit and out of scope here.

**Diff: one argument removed, one docstring paragraph added.** Model pin, prompt file, schema
and message construction all untouched.

**Acceptance gate V2: met**, subject to the suite result in §4.

---

## 3 · V3 — The blocker that made a failure destroy the run

Before this package: `agent_calibration.run` called `cache.save()` only after
`collect_records` returned; `ResponseCache` held every response in memory; `live_execute` had
no retry, no backoff and no exception handling. **A single transient failure at call 419 of 420
discarded 419 bought responses and the entire funded spend.**

### 3.1 What was added

- `ResponseCache` checkpoints to disk every **25** live calls (`checkpoint_every`, 0 disables).
- A restart **resumes**: entries already on disk replay as hits and only the remainder is
  bought.
- Bounded, **logged** retry — 3 attempts, each retry passed to an injectable `on_retry`. A
  silent retry would convert a transient failure into an unrecorded one.
- Build history in a **sidecar**, `agent_cache.build.json`, carrying `complete`,
  `resumed_from_entries`, `checkpoints`, `retries`, `entries`.

### 3.2 Why the sidecar and not a field in the cache

The cache had to stay **byte-identical** between an interrupted and an uninterrupted build, and
the interruption had to remain **visible afterwards**. Those two requirements are
incompatible if the marker lives inside the cache file. Putting the history in a sidecar
satisfies both: the cache is a pure key → response map whose bytes do not depend on how it was
built, and the build record is permanent.

### 3.3 The demonstration

`brain/tests/test_agent_cache_checkpoint.py`, 9 tests, all passing. The central one runs a
**30-call** stub build twice: once clean, once **interrupted twice** (at live call 11 of the
first session and call 22 of the second), each interruption followed by a fresh `ResponseCache`
resuming from disk. **The two cache files are compared as text and are identical.**

| gate | result |
|---|---|
| interrupted and uninterrupted caches identical | **pass** — byte-for-byte |
| responses bought before an interruption survive on disk | **pass** — 7 of 7 checkpointed entries |
| partial state distinguishable | **pass** — `is_partial()` true after interruption, false after clean close |
| a resumed run cannot report as clean | **pass** — `resumed_from_entries` > 0 in the build record |
| retry bounded | **pass** — exactly 3 attempts at `max_attempts=3` |
| each retry logged | **pass** — `[1, 2]` |
| a transient failure is recovered without losing the call | **pass** |
| cache key unchanged by checkpointing | **pass** |

**Acceptance gate V3: met.**

---

## 4 · The suite, and a wrong number in the recorded baseline

**Result, `.venv-forecast` (3.12), the venv the baseline was set in:**

> **676 passed, 1 skipped, 1 deselected, 1 warning in 569.55s. Zero failures.**

The skip and the deselect are reported, not folded into the pass count: the skip is
`test_intermittent.py:37` (`statsforecast` is eval-only), the deselect is the network-dependent
`test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`, excluded
by node id because it is still unmarked. Both match the baseline entry exactly.

**But the recorded pass count did not reconcile, and it turned out the record is wrong.**
`ledger/phase_state.md:5314-5315` records, verbatim:

> | pytest `--collect-only` | 642 of 643 collected, 1 deselected |
> | pytest full run | exit 0, **641 passed, 1 skipped, 1 deselected**, 1 warning, 600.23 s |

676 − 641 = 35, and this package added **9** tests. The other 26 needed explaining before the
gate could be called met.

Isolated in three steps:

1. Collection with the new file: **678**. Collection with the new file temporarily moved
   aside: **669**. So this package contributes **exactly 9**, as intended.
2. The last commit to touch `brain/tests/` is `f0c3d5bc`, **2026-08-15** — three days *before*
   the baseline was recorded on 2026-08-18. So no test landed between the record and now.
3. Checked out **`0db56339`, the S29 commit itself**, in a throwaway worktree and collected
   there: **669 tests.**

**The tree at S29 collected 669, and S29 recorded 643. The recorded baseline understates the
suite by 26 tests**, and its pass count of 641 is therefore not comparable with anything. The
suite did not grow; the record was wrong when it was written. Since 669 − 1 skipped − 1
deselected = **667**, and 667 + 9 = **676**, the measured result reconciles exactly and
**nothing regressed**.

**The true baseline is 667 passed, 1 skipped, 1 deselected**, and it is recorded here so the
next package does not re-derive it. This is the same failure mode as the 644 call count: a
number written once, carried forward, and never re-measured.

`ruff` is **not installed in any of the four venvs**, so no lint gate was run. Stated rather
than skipped silently.

---

## 5 · V4 — The POS reconciliation. Stopped at step 1, as instructed.

**V4.1 says: if direct read access is unavailable, request an export and stop rather than
substituting an assumption. Access is unavailable, and I stopped.**

Access was established negative on four independent checks, each a measured empty result:

| check | result |
|---|---|
| Neon DSN in the environment | **absent** — no `BRAIN_NEON_DSN`, no `NEON*`, no `DATABASE_URL` |
| `.env` anywhere in the tree | **absent** — only `.env.example` files |
| `VenueSalesDaily` anywhere in the repository | **zero hits** across `.ts`, `.py`, `.prisma`, `.md` |
| `NeonAdapter` in the codebase | **zero hits**, case-insensitive, across every `.py` and `.ts` |

The last one is worth stating on its own, because a stale document points the other way.
`brain/FLAGS.md:331` says, verbatim:

> **FLAG-LI2 (Neon system-of-record — Ryan-gated).** `NeonAdapter` + DDL sketch ship

**The symbol does not exist in the tree today.** `config.py:445` reads
`INGEST_SOURCE = os.environ.get("INGEST_SOURCE", "csv")` with the comment `# csv`, while
`README.md:216` still documents `csv | neon | square`. Whether the adapter was removed or never
landed is not established here; what is established is that there is no code path to Neon in
this repository. **No reconciliation was attempted and no assumption was substituted for one.**

### 5.1 What Ryan needs to send

One CSV or Parquet export of `VenueSalesDaily`, **restricted to business dates 2025-06-04 to
2026-07-07 inclusive**, carrying at minimum: venue identifier, business date, category, item,
net amount, and **an explicit statement of whether the net amount is inclusive or exclusive of
VAT**. The last item is not optional — see §5.3.

### 5.2 The local side is already measured, so only the Neon side is outstanding

| venue | rows | first | last | net ex-VAT |
|---|---|---|---|---|
| beer_hall | 302 | 2025-06-04 | 2026-07-07 | £233,582.08 |
| two_river_taps | 280 | 2025-06-12 | **2026-05-08** | £143,308.43 |
| ellel | 68 | 2025-06-08 | 2026-07-04 | £47,065.86 |

346 distinct dates across the window. Two River Taps ends at its closure, 2026-05-08, so **any
Neon rows for it after that date are a genuine one-sided difference, not a gap to be explained
away.**

### 5.3 A VAT trap, found on the local side, that would have produced a false verdict

`l1_daily` carries `revenue_exvat`, `revenue_raw` and `gross_sales`. Measured ratios over the
overlap window, median with 5th and 95th percentiles:

| venue | `revenue_raw` / `revenue_exvat` | `gross_sales` / `revenue_exvat` |
|---|---|---|
| beer_hall | **1.000** (1.000 – 1.000) | 1.200 |
| ellel | **1.000** (1.000 – 1.000) | 1.200 |
| two_river_taps | **1.200** (1.200 – 1.200) | 1.200 |

**`revenue_raw` does not mean the same thing at every venue.** At the Beer Hall and Ellel it is
already ex-VAT; at Two River Taps it is VAT-inclusive and `revenue_exvat` is derived from it by
dividing by 1.2. The store normalises the difference away; the column name does not.

So a reconciliation that joined Ryan's ex-VAT figures to `revenue_raw` would return **clean
agreement at two venues and a clean 1.20 offset at the third**, and the obvious reading of that
— that Two River Taps diverges — would be **exactly wrong**. `revenue_exvat` is the only
like-for-like column. This is precisely the error V4.3 warns about, and it is present in the
data before the comparison is even attempted.

**Verdict per venue: not given.** No verdict is possible without the Neon side, and the
standing ruling that training need not be re-run is therefore **neither supported nor refuted**
by this package. It returns to Nam unchanged.

---

## 6 · V5 — The post-ceiling window

**Ceiling asserted at 2026-07-07 before and after this section** (state table, §0). Nothing was
moved.

### 6.1 Would the corpus still be 644? No. Measured: it becomes 476.

This did not need speculation. The injection stream is capped by
`config.AGENT_EVAL_STREAM_CEILING`, which is env-overridable, so the question was answered by
re-running `build_scaled_corpus` **read-only** with the cap moved to 2026-07-07 — five weeks
later, using data **already in the store**. The store itself was untouched and opened read-only.

| | ceiling 2026-05-31 (registered) | ceiling 2026-07-07 |
|---|---|---|
| **corpus** | **644** | **476** |
| beer_hall | 356 | 356 |
| two_river_taps | **252** | **84** |
| ellel | 36 | 36 |
| regime_shift / spike / exo / stock | 252 / 288 / 84 / 20 | 180 / 216 / 60 / 20 |
| TRT usable folds | 3 | **1** |

**The corpus loses 168 injections, 26 per cent.** The cause is Two River Taps: its folds shift
later, and all but one fall past its closure on 2026-05-08, so `_usable_folds` drops them.

Two mechanisms, and only one of them was obvious:

1. **The stream cap.** Moving it lengthens every stream and re-cuts every fold. This is the
   mechanism above.
2. **The closure filter, which reads the store UNCAPPED.** `_usable_folds` calls
   `is_closed`/`active_trading_end` on the full store. Measured today: `dataset_max_date`
   2026-07-07; beer_hall active to 2026-07-07 and not closed; two_river_taps active to
   **2026-05-08 and closed**; ellel active to 2026-07-04 and not closed. **If post-ceiling rows
   showed Two River Taps trading again, `is_closed` would flip and its fourth fold would become
   usable — taking the registered corpus from 644 to 728 without the eval ceiling moving at
   all.**

So the corpus is invariant to store growth through the stream, and **not** invariant through
the closure filter. Both routes change 420 by an amount only re-measurement can give.

### 6.2 Is it the pre-registered experiment or a different one?

**It is a different experiment.** The corpus changes from 644 to 476 under the proposed window,
so the population being scored is not the population the apparatus was frozen against, and one
pre-registration cannot cover both.

### 6.3 Characterising the window itself — not done, same blocker

V5.4 asks for rows per venue, dates covered, dates missing, whether Two River Taps appears, and
any schema change on 11 August, **read from Ryan's store**. That is the same Neon store as §5
and the same negative access result applies. **Not attempted.** The questions are worth keeping
exactly as posed; the Two River Taps one is now sharper, because §6.1 shows its post-closure
status is load-bearing on the corpus size and not merely descriptive.

### 6.4 The ledger row that would authorise a post-ceiling read — DRAFTED, NOT APPLIED

> **DRAFT — not applied, not in force. For Nam's decision.**
>
> **Post-ceiling read authorisation (2026-07-08 to 2026-08-15).**
> The **2026-07-07 store ceiling governs training and model selection and is unchanged by this
> row.** No model is refitted, no selection is re-run, no served artefact is rescored, and no
> row is written to the store. Any read of data after 2026-07-07 is a **holdout by design**:
> it may be used to describe or to evaluate, never to fit, tune or select.
> Because the injection corpus is a function of the stream ceiling and of venue closure status,
> **any evaluation over the post-ceiling window is a different experiment from the registered
> one** (644 injections becomes 476 at a 2026-07-07 cap, measured). It therefore requires its
> own pre-registration and may not be reported under
> `brain/ledger/prereg_agent_eval.md`.

---

## 7 · V6 — The pre-registration, drafted and unsigned

`brain/ledger/prereg_agent_eval.md` exists, headed **DRAFT — NOT IN FORCE**, with an unsigned
signature block. It carries the frozen apparatus and hash, the derived 420 with its
detector-dependence, the construct as **detection** calibration, the three computed terms and
the fourth at N = 0, the declared limitations, and the predicted outcome. It contains nothing
beyond that list.

**On the decision rule, it reports what exists rather than inventing one.** The specification
*does* contain one pre-registered rule, and it would have been wrong to say it contains none:
`agent_vs_constants` freezes `decorative = disagreement_rate <= 0.05`, with the reference
operating point, bootstrap size (B = 10,000) and seed (93) all fixed constants. That rule
covers term 3.

**For ECE and Brier the specification states no criterion at all.** `AGENT_ECE_BINS = 15` and
`AGENT_MIN_BIN = 10` fix how ECE is computed, not how it is judged, and a search of the
apparatus and report 46 for a stated calibration threshold returns nothing. The draft says so
and leaves the threshold blank for Nam to write **before** signing. Choosing it after seeing a
number is the failure pre-registration exists to prevent.

**It is deliberately not committed as active.** The git timestamp is the proof, so a draft
committed as pre-registered would destroy what it establishes.

### 7.1 One stale document sentence, flagged not fixed

Removing the `temperature` argument makes a traced methodology claim stale.
`ledger/numbers_audit.md:187` records the document sentence *"Temperature is zero and the model
identifier is pinned"* as MATCHING `config.py` and report 46. The model pin still holds; the
temperature half no longer describes the call, because no temperature is sent.

`config.AGENT_TEMPERATURE` is therefore **left in the config rather than deleted** — deleting it
would silently falsify the trace behind a sentence in the document. Correcting the sentence is a
`.tex` edit and out of scope. **It is Nam's, and it is small.**

---

## 8 · What now stands between the apparatus and an authorised run

Every item below is one this package could **not** have cleared. The two that were clearable
were cleared.

1. **DSAIL authorisation and a credential.** External. The ask is $150 (`simon_status_report.md`);
   it is a request, not a grant. Nothing technical depends on it any longer.
2. **Nam's signature on the pre-registration**, and — before signing — a decision on whether
   ECE and Brier carry a pass/fail threshold or are reported without one. The draft cannot make
   that choice.
3. **The `anthropic` SDK is not installed** in any of the four venvs. One `pip install`, but it
   is not done and the run cannot start without it.
4. **A construct-wording ruling.** The run measures **detection** calibration; the document says
   "three of the four terms compute" at several sites without that word. Fixing it is a `.tex`
   edit against a word budget, and was explicitly out of scope here.
5. **The stale temperature sentence** (§7.1). Small, and Nam's.

**Cleared by this package, and no longer on the list:** the 400 on call one (V2), and the
all-or-nothing spend that made any transient failure cost the entire allocation (V3).

**Not on the list, and deliberately so:** the POS reconciliation (§5) and the post-ceiling
window (§6). Neither blocks the registered run. Both block a *different* run, and §6.4 records
the authorisation that different run would need.
