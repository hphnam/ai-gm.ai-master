# Report 58 - S9 G17n: the environment closed, and the artefact leak the briefing exposed

Date: 2026-08-01. Branch `brain-construction-local`. Store ceiling 2026-07-07. Style: no
em-dashes, plain prose, loud failures, verify before asserting, pre-register before running.

Five items were requested. All five are done. A sixth was found while doing the fourth,
and it turned out to be the cause of the fourth, so it is reported first among the
findings rather than as an aside.

Adds `\citet{breiman_classification_1984}` now that the key exists.

## The Breiman citation, now placed

`ref.bib` is at 114 entries and `breiman_classification_1984` resolves: Breiman, Friedman,
Olshen and Stone, *Classification and Regression Trees*. The one-standard-error rule is
cited in both chapters and no longer stands as unattributed prose.

- `sec:res-margin`: "the standard one-standard-error device of the
  classification-and-regression-tree literature \citep{breiman_classification_1984}".
- `sec:intermittency`: "a \emph{one-standard-error} margin, the device introduced for tree
  pruning by \citet{breiman_classification_1984}".

Both pushed. Section counts before and after are unchanged, 15 in methodology and 25 in
results, with downstream indices shifted by exactly the inserted length, so the
`write_section` subsection-deletion failure from report 55 did not recur.

## 1. The eight test failures were never schema or version problems

The standing description of these as "parquet and pydantic issues" was wrong, and the
wrongness matters because it implied a dependency conflict to be negotiated. There was no
conflict. `requirements.txt` declares `pyarrow`, `pydantic`, `fastapi` and `openpyxl`, and
the venv the suite was being run in had none of them installed. The venv had simply never
been provisioned from its own requirements file.

Installing `requirements.txt` into it took the suite from **8 failed plus 16 collection
errors** to **602 passed, 8 skipped, 0 failed**. No source change, no version negotiation,
no pin moved.

The reason it went unnoticed for so long is worth recording: the four venvs the
requirements files describe (`.venv`, `.venv-eval`, `.venv-forecast`, plus the runtime one)
did not exist on this machine. A single ad-hoc `.venv-run` had been created and partially
populated, and it was not in `.gitignore` either, so nothing named it as an environment.
It is ignored now.

## 2. torch, and the two venvs that were documented but absent

`.venv-forecast` is now built on Python 3.12 from `requirements-forecast.lock.txt`, the
fully-pinned resolution the lock file names as the reproducibility anchor for the six-fold
ladder tables. It installs **torch 2.12.1 and chronos-forecasting 2.3.1 exactly**, which
are the pins, and the scientific stack matches the lock line for line.

One tension in the lock's own header was checked rather than assumed. It warns that
"statsmodels 0.14.6 with scikit-learn 1.8.0 gives ETS 0.617 / GBM 0.601, which flips the
served model". The lock pins statsmodels 0.14.6 with scikit-learn **1.9.0**, and 1.9.0 is
what installed, so the resolution is not the flipping combination the header warns about.

All seven `test_foundation.py` tests that had been skipping on "torch absent in the runtime
venv" now pass. Rung 4 is runnable on this machine for the first time.

`.venv-eval` was built too, and it exposed a defect: **`requirements-eval.txt` pinned
`vus>=1.0`, and `vus` has never published a 1.0.** PyPI tops out at 0.0.6. The file has
therefore never been resolvable, and `.venv-eval` could never have been built from its own
spec by anyone. Corrected to `vus>=0.0.6`.

No reported number moves as a result. Report 14 records that WP10 computes VUS-PR from the
pinned TSB-AD 1.5; `vus` is a fallback, and an unresolvable pin means it has never once
been the thing that supplied the metric.

With `.venv-eval` built, the last skip in the suite closes. The Croston and SBA cross-check
against statsforecast, spec G2.2, **now runs in band for the first time**. It had been
carrying a code comment recording that it was "RUN AND PASSED OUT OF BAND" on a hand-built
3.12 venv. It passes in band, on statsforecast 2.1.1, which is the version that comment
names. Its skip message, which blamed Python 3.14, was also inaccurate when read from a
3.12 venv and now states the real reason, that statsforecast is an eval-only dependency.

### Where the three venvs stand

| venv | Python | result | skips |
|---|---|---|---|
| `.venv-run` (runtime) | 3.14 | 606 passed, 8 skipped | torch/chronos x7, statsforecast x1 |
| `.venv-forecast` | 3.12 | 613 passed, 1 skipped | statsforecast x1 |
| `.venv-eval` | 3.12 | 614 passed, 0 skipped | none |

614 tests in every column. Each venv now skips exactly what its own requirements file says
it excludes, and nothing else. Zero failures and zero collection errors in all three.

## 3. `warehouse.build()` now says when it lands short

The parquet is written from seed CSVs that end at 2026-05-31 while the operational ceiling
is 2026-07-07, so a build does not merely *sometimes* land five weeks short. It lands short
**every time**, and `sim.restore_clock` is the only thing that closes the gap.

`build()` now returns the ceiling it reached and warns to stderr when that is below
`config.EXPECTED_STORE_CEILING`, naming the command that fixes it.

Three judgements inside that, each stated because each could reasonably have gone the other
way.

**A warning rather than an exception.** `store.build` calls `warehouse.build()` and restores
the clock on the very next line, and the same sequence run by hand is legitimate. Raising
would break the sanctioned repair path. The fail-loud guard for reported numbers already
exists at read time in `assert_store_ceiling`; what was missing was any signal at all at
write time, and that is what this adds.

**Quiet on non-working stores.** The warning is suppressed when the target is a scratch
store or a `BRAIN_DUCKDB_PATH` override, which is what all seventeen test call sites use. A
tmp store is *supposed* to sit at the seed and carries none of the risk, so warning there
would fire several times per suite run and train the reader to ignore it.

**`config.SEED_CEILING` added.** The date 2026-05-31 was living only in prose comments in
four modules. That is the same duplication G2 removed for the scale basis, and the number
that decides whether a store is short should be readable from one place.

Four tests pin the behaviour, including one that the warning names the fix and one that an
isolated store stays silent. The working-store branch is reached by pointing
`config.DUCKDB_PATH` at the tmp database the suite already uses, so no test writes to a
developer's real store, which the existing G1 test forbids.

## 4. The briefing was not stale. It was a test artefact.

Two corrections belong here, and the second supersedes report 57's diagnosis entirely.

**First, report 57 claimed this artefact had been regenerated. It had not.** Its last commit
was `dbcc525`, several commits before the sweep, and the working tree matched it exactly.
The regeneration was run and observed during the sweep but never written or committed, and
listing it under "regenerated" was an overstatement.

**Second, and this is the real finding: a `pytest` run overwrites committed artefacts in the
working tree.** `conftest.py` isolates the database by pointing `BRAIN_DUCKDB_PATH` at a
throwaway path, and its docstring states that this "isolates every store write in the
suite". That is true of DuckDB writes and false of artefact writes. Twenty-three modules
resolved their output paths from `STORE_DIR.parent`, which is the checkout no matter what
`BRAIN_DUCKDB_PATH` says.

Demonstrated rather than argued:

```
after regen: as_of 2026-07-07 - new 0 / continuing 11 / resolved 0
after test : as_of 2026-05-31 - new 0 / continuing 0  / resolved 0
```

That is `pytest tests/test_briefing.py` alone. The committed briefing reading "quiet day,
nothing above threshold" at the seed ceiling was **produced by the test suite**, not by a
briefing run against a five-week-short store. Report 57 had the mechanism wrong, and its
proposed fix, regenerating the artefact, would have been silently undone by the next
`pytest` invocation.

An mtime sweep over the 32 tracked artefacts identifies exactly three that a suite run
rewrote: `signals/briefing.md`, `eval/deviation_eval.md` and `eval/judge_prompts.md`.

**The fix separates the two roots.** `config.REPORT_ROOT` is where artefacts are WRITTEN,
overridable by `BRAIN_REPORT_ROOT`, and distinct from `STORE_DIR`, which is where the store
is READ. The one-line alternative, pointing `BRAIN_STORE_DIR` at a tmp directory, does not
work: `line_items.parquet` and the parquet fixtures live under `STORE_DIR` too, so
redirecting it breaks every read. The conflation of input and output in a single constant
was the defect.

Thirty call sites across 23 modules were rewritten mechanically and every one of the 24
affected modules was import-checked. `signals/agent.py` was then corrected back: its
`PROMPTS_DIR` is a committed INPUT, the frozen agent prompt, and it had shared the artefact
idiom by accident. Under the new root it followed `BRAIN_REPORT_ROOT` into a tmp directory
and vanished, which would have broken the freeze-before-evaluation guarantee `sec:agent`
rests on. It reads from `BRAIN_DIR` now.

Verification, in the order it was run:

| Check | Status | Evidence |
|---|---|---|
| Refactor changes no behaviour | PASS | `chatlog_kb_gap.md` regenerates byte-identical after it |
| Suite no longer writes the working tree | PASS | mtime sweep over 32 tracked artefacts, zero touched |
| Suite still green | PASS | 606 passed, 8 skipped, 0 failed |
| Briefing survives a suite run | PASS | still `as_of 2026-07-07`, 11 items, after a full run |

The briefing now reads **as_of 2026-07-07, 11 continuing items**: a keg at zero days of
cover, two above-band days, three sustained shifts and two missing-SOP flags. It is
committed, and it now stays committed.

One latent bug is recorded rather than fixed: the artefact writers assume their output
directory already exists, which held only because it always did in the checkout. Under an
isolated root the write raises `FileNotFoundError`. The suite mirrors the checkout's
directory names into its tmp root, which is test scaffolding and not a fix. A fresh
deployment writing to an empty report root would still fail.

## 5. The truncating default is gone

`--top` defaulted to 5 while `--clusters` defaulted to 12, so the bare command documented in
the module docstring and in `README.md` line 116 truncated the artefact table. This is the
default that made the sweep in report 57 read seven lost clusters and nearly "fix" a correct
artefact by regenerating it at the default.

There is no Makefile in this project, so the standardisation is in code and in the two
places the command is documented. `DEFAULT_CLUSTERS = 12` and `DEFAULT_TOP =
DEFAULT_CLUSTERS` are now tied rather than stated twice, so they cannot drift apart, and the
docstring is corrected.

**Verified in the strongest available form: the bare `python -m signals.chatlog_kb_gap` now
reproduces the committed `.md` and `.json` byte-identically.** A truncating default on a
committed artefact is a trap, not a preference.

## What is not done

- **`eval/deviation_eval.md` and `eval/judge_prompts.md`** are the other two artefacts the
  suite was overwriting, so both committed copies are test output rather than real runs.
  They are now isolated and cannot be clobbered again, but neither has been regenerated
  from its real entrypoint and neither is verified. Report 57 separately recorded
  `deviation_eval.md` as orphaned, which is inconsistent with the suite writing it, and
  that inconsistency is unresolved.
- The methodology chapter's header comment still lists cite keys against "the live ref.bib
  (111 entries)" and names neither `hewamalage_look_2021` nor `breiman_classification_1984`.
  It sits outside any section, so `write_section` cannot reach it and correcting it needs a
  whole-file push.
- **Gate: `lovo.py`'s pooled statistic** under G2, unchanged from report 57, recommendation
  on file.
- `eval/chronos2_*` are now runnable, since `.venv-forecast` has torch, but have not been
  re-run against the restored warehouse.
- G3's ECE run, parked by instruction.

## Files touched

- `config.py`: `SEED_CEILING`, `REPORT_ROOT`
- `store/warehouse.py`: `build()` returns its ceiling and warns when short
- `store/build.py`: opts out of the warning it immediately resolves
- `tests/conftest.py`: `BRAIN_REPORT_ROOT` isolation plus directory mirroring
- `tests/test_store_durability.py`: four new tests; three literals replaced by `SEED_CEILING`
- `tests/test_intermittent.py`: accurate skip reason
- `signals/chatlog_kb_gap.py`: tied defaults
- `signals/agent.py`: `PROMPTS_DIR` reads from `BRAIN_DIR`, not the report root
- `requirements-eval.txt`: the unresolvable `vus` pin
- `.gitignore`: `.venv-run/`
- 23 modules: `STORE_DIR.parent` to `REPORT_ROOT`
- regenerated: `signals/briefing.md`
- Overleaf: `sec:res-margin` and `sec:intermittency` cite Breiman
