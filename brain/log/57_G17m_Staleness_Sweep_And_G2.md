# Report 57 - S9 G17m: the artefact staleness sweep, and G2 closed

Date: 2026-08-01. Branch `brain-construction-local`. Store ceiling 2026-07-07. Style: no
em-dashes, plain prose, loud failures, verify before asserting, pre-register before running.

Closes **G2** (Ellel scale basis) and **M13**, which was carried into it. Adds
`hewamalage_look_2021` to the M8 paragraph now that the key exists.

## Why the sweep was needed

Report 55 found the A5 artefact carrying a stale PASS after the warehouse restore, and
found it by accident. This is the systematic version.

The mechanism, from commit `f8bcf1f`: `warehouse.build()` rebuilds from the committed CSV
seed, which ends **2026-05-31**, silently dropping the aggregate-ingested June and 1 to 7
July rows. A store restored from an old backup looks perfectly healthy and is five weeks
short. Anything generated in that window carries a 2026-05-31 ceiling.

## Result: 5 genuinely stale, 6 reproduce, 3 excluded by design, 1 false positive

| Artefact | Verdict |
|---|---|
| `conformal/conformal_L1_beer_hall.md` | STALE (report 55); Mondrian@80 gate FAIL surfaced |
| `conformal/conformal_L1_ellel.md` | **STALE** and gates flipped BOTH ways |
| `conformal/conformal_L1_two_river_taps.md` | **reproduces exactly** |
| `eval/aci_closure_probe.md` | **STALE**, sample grew 268 -> 293 |
| `eval/change_point_eval.md` | **STALE**, injection recall moved |
| `signals/change_point.md` | **STALE**, a new change point appeared |
| `signals/briefing.md` | **BADLY STALE**, see below |
| `signals/stock_inventory.md` | stale, immaterial (5.32 -> 5.22 pints/day) |
| `eval/group_icl.md` | reproduces |
| `eval/weather_basis.md` | reproduces |
| `signals/checklist_discipline.md` | reproduces |
| `signals/chatlog_kb_gap.md` | **not stale** - a CLI default, see below |
| `signals/weather_diagnostic.md` | generator **crashed**; fixed, and the artefact then reproduced exactly |
| `models/ladder_results_L1_*.md` | frozen by design, deliberately NOT re-run |
| `eval/chronos2_*.md` | blocked, no torch in this environment |
| `sim/*_frozen.md` | frozen by name |
| `eval/deviation_eval.md` | orphaned, its module no longer exists |

**No published number is affected.** Every figure that moved was checked against the live
results chapter and none of them appears there: the change-point recalls, the ACI closure
figures, the Ellel A5 pooled coverages, the briefing counts. The chapter's coverage table
comes from the larger `interval_calibration` rolling-origin instrument, not from these.

## The control that makes the diagnosis stick

**Two River Taps reproduces byte-for-byte.** The only diff is the new M7 guarantee table.
That is the design's own claim being cashed in: Two River Taps closed on 2026-05-08 and its
history cannot grow, so a measurement that moves at the Beer Hall and Ellel but is
invariant at Two River Taps is attributable to accumulated history and not to a code
change. The sweep is therefore diagnosing data recovery, not chasing a regression.

## The briefing was the worst of it

The committed briefing read `as_of 2026-05-31`, `new 0 / continuing 0 / resolved 0`, and a
single table row: *"(quiet day - nothing above threshold)"*. Regenerated at the true
ceiling it carries **11 continuing items**, including a keg at zero days of cover, two
above-band days, three sustained shifts and two missing-SOP flags.

The estate's flagship deliverable was on record showing nothing at all. Nothing in a
chapter depended on it, but it is the single most misleading artefact the sweep found.

## A real regression, found only because the artefact was regenerated

`signals/weather_diagnostic.py` **crashed**: `too many values to unpack (expected 2, got 3)`.

`_eval_cols` gained a third return value (the per-fold vector) in report 54's M24 work, and
four call sites in `weather_diagnostic.py` still unpacked two. The module has been broken
since that commit and nobody noticed, because its artefact was never regenerated. Fixed at
all four sites.

**Resolved, and the fix is verified in the strongest available way.** The run completed
(`A14b RESULT: PASS`, ~40 minutes) and `signals/weather_diagnostic.md` came back
**byte-identical to the committed file**. That is worth more than a green exit: it shows
the repair restored the previous behaviour exactly rather than merely making the module
terminate. The artefact was never stale; only its generator was broken.

An earlier draft of this report recorded this artefact as unfinished and still stale, and
that has been corrected here. A first check appeared to confirm it was unchanged, but the
shell had been reset to the repository root so the path did not exist and git dutifully
reported nothing; re-checked from `brain/`, the file is present and genuinely identical.

This is the argument for the sweep in one line: a stale artefact hides a broken generator.

## One false positive, recorded so the count stays honest

`signals/chatlog_kb_gap.md` appeared to lose seven cluster rows. It is **not stale**. The
`--top` argument defaults to 5 and the committed artefact was produced with 12; the header
statistics (359 assistant replies, 735 messages, 18.9 per cent failure rate) and clusters 1
to 5 are byte-identical. Regenerated at `--top 12` it matches the committed file exactly.
Regenerating at the default would have silently truncated a committed artefact under the
banner of fixing staleness.

## The ladder is frozen on purpose, and now says so

The three `models/ladder_results_L1_*.md` evaluate to 2026-05-31 (Beer Hall), 2026-05-22
(Ellel) and 2026-05-08 (Two River Taps, which is its closure and correct at any ceiling).
They were NOT re-run, for two reasons.

First, `tab:ladder` is explicitly the **committed** gate, the decision this chapter audits:
"retained for continuity with the original gate", "the committed run recorded fold means
only". Re-running it would replace the decision under audit with a different decision. The
re-evaluation at the current ceiling already exists separately, in
`sec:res-demonstration`.

Second, this environment has no `torch`, so rung 4 cannot run; a re-run would replace three
real foundation-model rows with "backend not installed" and destroy the table.

What WAS wrong is that the chapter header claims ceiling 2026-07-07 "unless stated", and
that table did not state otherwise. The caption now names its own ceiling per venue and
says why it is not re-run. That is the honest fix and it costs nothing.

## G2, closed

**The decision was already made, written and evidenced.** `sec:res-basis` states it:
"The consequence is a change of instrument rather than a change of basis. Ellel is reported
on unscaled error and on the Winkler score for the remainder of this work", supported by
the bootstrap table (Ellel's four bases give interval widths of 52.5, 45.2, 42.2 and 65.6
per cent, and the two trading bases induce a spurious MASE of about 0.09) and by
`chatfield_all-zero_2007`. Like M22, the gate was open in the ledger only because nobody
closed the row.

**What was actually still open was enforcement.** The decision lived as a private dict
repeated verbatim in TWO modules, `eval/group_icl.py` and `eval/weather_basis.py`. That is
precisely the defect the MASE denominator itself had before it was consolidated, and the
methodology chapter already condemns it: "four separate private copies of the denominator,
none of which recorded which reading it used".

`config.VENUE_SCALE_BASIS`, `config.VENUE_LOSS` and `config.is_scaled_venue` are now the
single source of truth, with the reasoning stated where the constant lives. Both modules
read it. **Verified as a pure refactor: both artefacts regenerate byte-identical.**

### Two modules violate the decision, and both are unpublished

- `transfer/lovo.py` scores every venue on `calendar_lag7` MASE, Ellel included, and pools
  all three into one statistic. Under G2 that is two faults: Ellel has no defensible scaled
  error, and a pooled MASE across venues is only meaningful if MASE is meaningful at each.
- `eval/worldcup_fixture_probe.py` likewise scores Ellel on `calendar_lag7`. It writes no
  artefact and appears nowhere in either chapter.

Neither is written up, so nothing is retracted. Both are left as they stand rather than
quietly rewritten, because fixing `lovo.py` properly means deciding what a pooled
cross-venue statistic should be when one venue admits no scale, and that is a methodology
decision rather than a bug fix. Recommendation: report Ellel separately on unscaled MAE
and pool only the two scaled venues, stating the reduced pool.

## Verification

| Check | Status | Evidence |
|---|---|---|
| Frozen control reproduces | PASS | Two River Taps byte-identical but for the M7 table |
| No published number affected | PASS | every moved figure absent from results.tex |
| G2 refactor changes no behaviour | PASS | both artefacts byte-identical after it |
| chatlog is a CLI default, not staleness | PASS | `--top 12` reproduces the committed file |
| weather_diagnostic crash fixed | PASS | run completes; artefact byte-identical to committed |
| Ladder correctly excluded | PASS | chapter frames it as the committed gate under audit |
| Every cite key resolves | PASS | `hewamalage_look_2021` present, 113 entries |
| No dangling cross-references | PASS | mechanical label/ref diff over both chapters |

## Files touched

- `config.py` (`VENUE_SCALE_BASIS`, `VENUE_LOSS`, `is_scaled_venue`)
- `eval/group_icl.py`, `eval/weather_basis.py` (read the config constant)
- `signals/weather_diagnostic.py` (four `_eval_cols` unpack sites)
- regenerated: `conformal/conformal_L1_{ellel,two_river_taps}.md`,
  `eval/{aci_closure_probe,change_point_eval}.md`,
  `signals/{briefing,change_point,stock_inventory}.md`
- Overleaf: `tab:ladder` caption, M8 paragraph now cites `hewamalage_look_2021`

## Open

- **Gate: the Breiman citation.** `breiman_classification_1984` is NOT in `ref.bib`. The
  file has 113 entries and contains no Breiman, Olshen, Stone or CART entry; only
  `hewamalage_look_2021` was added. The one-standard-error rule is therefore still
  described in prose without a `\cite`.
- **Gate: `lovo.py`'s pooled statistic** under G2, per the recommendation above.
- `eval/chronos2_*` remain unverified against the restored warehouse: no `torch` here.
- G3's ECE run, parked by instruction.
