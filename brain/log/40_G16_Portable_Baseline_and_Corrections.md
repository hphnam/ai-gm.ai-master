# Report 40 - G16a and G16b: the hash gate made portable, and four corrections

Date: 2026-07-20. Branch `brain-construction`, from tip `c008651`. Scope: close the
verification gap report 36 section 6(a) opened, then land four precision corrections in
the places downstream will actually read them.

## Headline

**The de-Lune is now verified portably, and it holds.** Both trees produce identical
training frames on all three Lune venues. Report 33's conclusion was right; only its
published prefixes were session-local, and the safety argument no longer rests on a
comparison nobody can re-run.

| | `beer_hall` | `two_river_taps` | `ellel` |
|---|---|---|---|
| `2cc97e7` (pre-de-Lune) | `8c8a8be9d8dc5791` 399 x 40 | `b6339032a219213c` 331 x 40 | `ea28bcacbf1825e4` 392 x 40 |
| `c008651` (current) | `8c8a8be9d8dc5791` 399 x 40 | `b6339032a219213c` 331 x 40 | `ea28bcacbf1825e4` 392 x 40 |

Outcome 1 of the three the spec named. The **STOP** outcome, a hash moving on a frame of
identical dimensions, did not occur, so the rest of the spec ran.

Of the four corrections, **one was itself wrong** and the measurement that found it is the
more interesting half of G16b. Details in section 3.2.

---

# 1. G16a: what "portable" required

Report 36 recorded the pre-de-Lune comparison as permanently lost. It was not. The tree is
still in git and the store is restorable, so the only real obstacle was that the current
gate cannot run on the old tree: `sim/frame_hash.py` imports `event_venue_dates`, which
Phase 3 introduced, and at `2cc97e7` the equivalent was the private `_ellel_event_dates`
with a different `build_features` signature. `org_profile.py` did not exist at all.

`sim/g16a_portable_baseline.py` carries its own copy of the hashing function (the old tree
has no `sim/frame_hash` to import from) and dispatches on the signature it finds.

**The comparability rules mattered more than the shim.** A hash comparison across two trees
is meaningless unless everything except the code is held constant:

| Rule | How it was held |
|---|---|
| Same serialisation | One hashing function, byte-identical to `frame_hash.frame_hash` |
| Same float/NaN/dtype rendering | **One interpreter**: the working clone's `.venv-forecast` ran both trees |
| Same store bytes | **One copy**, `BRAIN_STORE_DIR` pointed at it from both runs |
| Shim believable | **Validated against the current tree first** |

That last one is the gate the spec was right to insist on. Before measuring anything
unknown, the shim was run against `c008651` and reproduced `8c8a8be9d8dc5791` /
`b6339032a219213c` / `ea28bcacbf1825e4` exactly. A shim that cannot reproduce a known
answer cannot be believed about an unknown one, and a difference it reported would have
been indistinguishable from its own bug.

The third rule is not hypothetical. It is precisely the rule that was not in force when
report 33 measured `ellel` at 386 rows.

**Isolation.** A detached `git worktree` at `2cc97e7`, removed at the end. The working
clone's tree and store were never checked out, never written to, and `git status` stayed
clean on all three frozen artefacts throughout.

## 1.1 The two trees really are different

Worth stating, because "both trees agree" is also what you would see if the harness
accidentally ran the same code twice:

- `org_profile.py` does **not exist** at `2cc97e7`.
- `git diff --stat 2cc97e7 c008651` over the feature path: **1,072 insertions, 153
  deletions** across 7 files, including **205 changed lines in
  `features/build_features.py`** and the whole 199-line seam.

Two hundred lines of change to the feature builder, and not one byte of movement in any of
the three frames. That is the result.

## 1.2 The `ellel` row count, shown rather than asserted

Report 36 attributed the 386-against-392 discrepancy to FLAG-STORE-DURABILITY. The
arithmetic confirms it exactly:

| | |
|---|---|
| Ellel series span | 2025-06-08 to 2026-07-04 |
| Calendar days inclusive, under `fill_calendar=True` | **392** |
| Calendar days to a 2026-06-28 ceiling | **386** |
| Difference | 6 days |
| Ellel trading rows after 2026-06-28 | exactly **2**: 2026-07-02, 2026-07-04 |

So 386 is not a hashing convention and not a code difference: it is this store minus the
two July W1 Ellel rows, both legitimately inside the 2026-07-07 ceiling. The spec listed
this as its expected outcome 2 (`ellel` differing in row count between the runs); it did
**not** occur here, because both runs read one store by construction, which is the point.
The discrepancy is between report 33's session and the canonical store, not between the
trees.

## 1.3 What this licenses, and what it does not

**Licensed.** The de-Lune provably moved no Lune number, portably, by a procedure anyone
can repeat. That is a stronger claim than report 33 was ever able to make, and it is now
the load-bearing evidence for report 35's central assurance to Ryan.

**Not licensed.** This says nothing about whether the de-Lune is correct for a *tenant*.
It says the research path is unchanged. Bound-profile behaviour is covered by
`tests/test_org_profile.py` and by nothing here.

---

# 2. G16a: the reports that carried the unrunnable numbers

Reports 33, 34 and 35 each published the three old prefixes as a verification gate, none
carried a marker, and report 36's correction lived only in the newer document. That is the
exact failure this project has now been bitten by four times (`FLAGS.md` against Ryan,
`CONTRACT.md` against itself, report 33 sections 9 and 10 against its own section 7, and
this). A correction that only exists downstream of the error is not a correction.

Each hash table now carries a dated annotation pointing at report 36 section 6(a) and at
this report. **The original values are left in place** and the reports still read as dated
records of what was believed at the time.

Report 35 gets the fullest treatment, because it went to Ryan and it offered those hashes
as the reason to trust a multi-tenant engine. Its annotation says plainly that the trust
gate was not runnable when it was handed over, and then gives the result that replaces it.

---

# 3. G16b: four corrections

## 3.1 "Bit-reproducible" was an over-claim

`sim/g15a_ellel_counterfactual.json` records `control_yhat_flag_0: 1558.28` with
`reproduction_gap_vs_frozen: 0.0`. That is agreement **to the penny on one venue-day**
(`beer_hall`, 11 July), not bit-level reproduction of a generation path.

The distinction is not pedantic. Report 33 corrected report 32 for exactly this species of
over-claim, when report 32 leaned on "C2 reproduces bit-for-bit" as a gate it could not
carry. Repeating the shape one report later, **in the report that congratulates itself for
catching stale claims**, is worth fixing properly.

Reworded in all four locations to what was measured: the control arm reproduces the
committed Origin B forecast **to the penny**, the first evidence in this project that
forecast generation is reproducible from the store **at all**. Substance kept, word
dropped. The stronger claim needs full-precision output for all seven horizon days across
all three venues, and that is a measurement, not an edit.

| Location | Treatment |
|---|---|
| `log/36_G15a_Fixture_Shortfall_Diagnostics.md` 2.3 | reworded, plus a dated scope note |
| `log/README.md` row 36 | reworded |
| `log/Decision_and_Resolution_Log.md` row 24(f) | **forward-pointer row 29(a)**, row 24 not edited |
| `FLAGS.md` | reworded and scoped |

## 3.2 The verification claim, and the correction that was itself wrong

Row 25 says the six round-4 tests were "each verified to FAIL against the stashed pre-fix
code". Report 37 scopes it to four. The spec asked for a correction row, and gave a proof:
`test_a_venue_reopening_after_a_long_closure_is_refused_a_known_limitation` **pins current
behaviour**, D3 was deliberately left broken, so that test "passes before and after and
could never have failed pre-fix".

**Measured rather than assumed, and the proof is false.** Reverting both
`compute/contract.py` and `compute/forward.py` to `af11c81`, **all six fail.** Row 25's
literal claim is true.

But they fail in two different ways, and that is the real distinction:

| Test | Pre-fix failure mode | Evidence of? |
|---|---|---|
| `..._mistyped_year_is_still_refused_when_a_sibling_venue_spans_the_gap` (D1) | **DID NOT RAISE** | a fixed defect |
| `..._a_sparse_sibling_is_enough_to_have_defeated_the_pooled_guard` (D1) | **DID NOT RAISE** | a fixed defect |
| `..._the_isolation_error_names_the_venue_it_is_judging` (D1) | **DID NOT RAISE** | a fixed defect |
| `..._the_band_calibration_guard_is_symmetric` (D2) | no raise on the `-1` probe | a fixed defect |
| `..._a_venue_reopening_after_a_long_closure_is_refused_a_known_limitation` (D3) | raises identically; **wording only** | a changed message |
| `..._the_reopening_message_does_not_call_legitimate_data_a_typo` (D3) | raises identically; **wording only** | a changed message |

The D2 row needed its own probe to classify, because the test loops
`MAX_HORIZON_DAYS + 1` then `- 1` and aborts on the first. Run directly against the pre-fix
code: probe 8 raises with the old message, **probe 6 does not raise at all**. So D2 is a
genuine behavioural verification that merely trips on wording first.

The two reopening tests raise before and after. Only the string changed, from "a mistyped
year, not a trading period" to "genuinely reopened" / "known limitation".

**So report 37 is exactly right at four, row 25 inflates at six, and the spec's stated
mechanism is wrong.** The correction it asked for is still warranted, for a better reason
than the one given: **a test that fails pre-fix on an error string is not evidence that a
defect was fixed.** Counting it alongside one that fails because the code did the wrong
thing conflates two kinds of evidence, and a test pinning a known limitation is a third
kind again. Recorded as forward-pointer row 29(b); row 25 not edited.

There is a small irony worth keeping: this is a correction package, and one of its four
corrections had to be corrected during the run. That is the fourth-round lesson arriving
one layer up, in prose rather than in code.

## 3.3 The stale row in the numbers-to-quote table

`DISSERTATION_NOTES.md` line 273 recorded report 38's update from 26% / 15% to 19.3% /
31.3% and explained that the bases differ. Line 356, in the **numbers to quote** table,
still read "named nodes captured 26% / 15% of June revenue" with no qualifier. Two rows of
the same document disagreeing, in the table the dissertation will be written from.

Fixed as **two rows with their hierarchies named** rather than one row with a pointer,
because the figures are not a before-and-after and a single row invites exactly that
reading. An explicit warning follows the table: never present 26% to 19.3% as movement.

The rest of the table was audited against reports 36 to 39, as the spec required rather
than fixing only the flagged row. **No other row had moved.** Three rows were added that
G15 established (the DOW-matched substitution effect, the 4.8% ceiling on the 11 July
explanation, the irreducible new-item share), and one entry was added to the **do not
quote** line: the **pooled** Ellel spillover of +GBP 500.18, which is the day-of-week
effect wearing a spillover label and carries the opposite sign to the matched estimate.
That number is the single most quotable wrong figure this project has produced, and it
belongs on the do-not-quote line beside Ellel MASE 0.096.

## 3.4 Ruff, resolved by measurement

Report 39 deviation (b) recorded the ruff counts as unverified because ruff is in neither
venv. True, and **insufficient**: `uvx` is on this machine, and report 33 section 9 says
outright that `uvx ruff` was how the original counts were taken. The deviation reported an
environment gap that was not actually blocking.

Re-measured at tip `c008651`, `uvx ruff check .` from `brain/`:

**70 errors, ruff 0.15.22.** Exactly report 34's quoted figure.

Reports 33 and 34 annotated with the count and the version. The count is version-sensitive
so it must be quoted as "70 under ruff 0.15.22"; the **71** start point is not
re-measurable (a pre-Phase-3 tree under whichever ruff `uvx` fetched in July), so the
endpoint may be quoted and the **delta may not**.

---

# 4. G16c: the obligations moved to the document Ryan reads

The numbered caller obligations lived in reports 33 and 35 and **nowhere else**;
`CONTRACT.md` had one prose mention of the weather obligation and no list. Reports are
dated snapshots by this project's own convention, so the obligations the caller is
responsible for lived in two documents that are explicitly not the joint item.

`CONTRACT.md` now carries the canonical list, with report 35's eleven (the superset) plus:

**12. A reopening venue fails the whole request.** A venue resuming trade after a long
closure is refused for its first `MIN_SEGMENT_DAYS`, and because the validator raises on
`ComputeDataset`, **one reopening venue takes down the forecast for every sibling in the
call**. Named flag, open by design, with the caller's options stated (per-venue requests,
retry-minus-the-offender, or surfacing the refusal) and the decision left where it belongs.

The list says explicitly that **D1's fix made this more likely, not less**: a sibling
trading through the gap used to mask the refusal accidentally, removing the mask was
correct because it was hiding true positives too, and legitimate reopenings now fail where
they previously slipped through. A caller who is not told that will read the new behaviour
as a regression, and in availability terms it is one.

Reports 33 and 35 keep their lists and gain dated pointers. Nothing was deleted: a report
that loses its content stops being a record.

Two items recorded under open decisions as **contract-sync inputs, not decisions taken**:
`PriorState` content-unboundedness (8) and the validator's wall-clock dependency (9). Both
are shape changes and both belong in the sync conversation.

**No wire shape changed.** The G16c stop condition (any of this touching a validator, a
field or a default) was not reached.

---

# 5. Acceptance gates

| Gate | Status |
|---|---|
| Shim validated against the current tree, reproducing `8c8a8be9d8dc5791` | **PASS** (section 1) |
| Both runs read a store at ceiling 2026-07-07, verified either side | **PASS**, one copied store, both runs |
| Worktree used; working clone's store and tree untouched | **PASS**, worktree removed, `git status` clean throughout |
| Three outcomes distinguished; `ellel` arithmetic shown not asserted | **PASS** (1.2) |
| Reports 33, 34, 35 annotated at each hash table, dated, forward-pointing | **PASS** |
| `sim/frame_hash.py` records that a portable baseline exists and where | **PASS** |
| Four corrections landed in every location carrying the claim | **PASS** (3.1 to 3.4) |
| Zero edits to any numbered decision-log row; forward-pointer rows only | **PASS**, rows 28 and 29 appended |
| Numbers-to-quote table checked in full, not only the flagged row | **PASS** (3.3), no other row moved |
| Ruff resolved by measurement or explicit marker | **PASS**, measured: 70 under ruff 0.15.22 |
| `CONTRACT.md` canonical, reopening obligation added, no wire change | **PASS** (section 4) |
| Frame hashes match the `44a0f08` baseline at the close | **PASS** |
| Frozen artefacts byte-identical | **PASS** |
| No dissertation number moved | **PASS**, C2 re-scored at the close |

---

# 6. Deviations

**(a) The spec's proof for G16b.2 is false, and it was falsified by running it.** The spec
stated that the reopening pinning test "could never have failed pre-fix". It does fail
pre-fix, on the error string. All six fail, not four and not five. The correction the spec
asked for is still correct and is landed; its stated mechanism is replaced with the
measured one (behaviour-failure against wording-failure), which is a sharper distinction
than the original. Section 3.2. Had this been written from the spec's reasoning rather than
measured, the correction row would itself have contained a false claim about which tests
fail, inside a package whose subject is over-claiming.

**(b) Report numbering departs from the spec's filename.** The spec names the addendum
`40_For_Ryan_Addendum_Post_G15.md`, while also saying G16b may share a report with G16a and
that reports are numbered from 40. Since G16a produced a finding, it takes 40 and the
addendum is `41_For_Ryan_Addendum_Post_G15.md`. Numbering it the other way would place the
addendum before the measurement it cites.

**(c) Ruff was measured rather than marked unverified, which required contradicting report
39.** Section 3.4. The deviation being corrected was a report-39 under-investigation, not
an environment gap.

**(d) Three rows were added to the numbers-to-quote table and one to the do-not-quote
line.** The spec asked for the table to be *checked*. Nothing was found stale beyond the
flagged row, but G15 established figures the dissertation will want and the pooled +GBP 500
is actively dangerous. Additions, not corrections; recorded because they exceed the literal
ask.

**(e) `sim/g16a_portable_baseline.py` was committed rather than left as a throwaway.** The
spec described a shim. Leaving the measurement in an uncommitted script is the exact defect
this package exists to close, so it is committed with the comparability rules in its
docstring. `sim/` is in ruff's `extend-exclude`, so it does not move the tree count.

**(f) The store was copied to a scratch directory rather than read in place.** The spec
required the working clone's store to be untouched. Pointing both runs at one copy via
`BRAIN_STORE_DIR` is stronger than reading the live store read-only: it also guarantees the
two runs saw identical bytes, which is the rule report 33 broke.

---

# 7. Reproduction

```
# invariants
.venv-forecast/bin/python -m sim.restore_clock            # ceiling must be 2026-07-07
.venv-forecast/bin/python -m sim.frame_hash               # the standing gate

# the portable comparison (G16a)
cp -R brain/store "$S/store-canonical"
BRAIN_STORE_DIR=$S/store-canonical PYTHONPATH=. \
  .venv-forecast/bin/python sim/g16a_portable_baseline.py         # validate: must match

git worktree add --detach "$S/wt-2cc97e7" 2cc97e7
cp brain/sim/g16a_portable_baseline.py "$S/wt-2cc97e7/brain/"
cd "$S/wt-2cc97e7/brain" && BRAIN_STORE_DIR=$S/store-canonical PYTHONPATH=. \
  <working-clone>/brain/.venv-forecast/bin/python g16a_portable_baseline.py
git worktree remove --force "$S/wt-2cc97e7"

# the six-test classification (G16b.2)
git show af11c81:brain/compute/contract.py > brain/compute/contract.py
git show af11c81:brain/compute/forward.py  > brain/compute/forward.py
.venv/bin/python -m pytest tests/test_compute_engine.py -k "sibling or reopening or judging or symmetric" -q
git checkout brain/compute/contract.py brain/compute/forward.py

# lint (G16b.4)
uvx ruff check .        # 70, ruff 0.15.22
```

Store ceiling verified 2026-07-07 with 0 rows in 2026-07-08 to 2026-07-14 at the start,
between packages, and at the close.
