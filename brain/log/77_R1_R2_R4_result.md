# 77 — R1, R2 and R4, and what R4 found instead

Run 2026-08-06 under `PRJ93_RULES.md`. Approved in the figure-programme gate
(`knowledge/07_figure_programme.md` §8) to run in parallel with the B1–B5 blocker clearance,
on the grounds that none of the three touches a blocked float.

Runtime: `.venv-forecast` (Python 3.12.13, numpy 2.5.1, pandas 3.0.3, Darwin arm64, mps).
Store ceiling **2026-07-07** throughout.

---

## R1 · Four-block split boundaries — DONE, feeds `fig:blocks` (F1)

New module `hierarchy/block_spans.py`. It recomputes the boundaries with the **same
expression** as `reconcile.reconcile` (`hierarchy/reconcile.py:277-280`) rather than a
paraphrase, fits nothing and calls no model. Output `hierarchy/block_spans.json`.

**Beer Hall, `TEST_WEEKS = 8`, calendar 2025-06-04 → 2026-07-07, 399 days:**

| Block | Start | End | n | Job |
|---|---|---|---|---|
| fit | 2025-06-04 | 2026-01-19 | **230** | estimators for the adoption contest |
| validation | 2026-01-20 | 2026-03-16 | **56** | Croston/DOW adoption contest |
| calibration | 2026-03-17 | 2026-05-11 | **56** | conformal scores + reconciliation weights |
| test | 2026-05-12 | 2026-07-07 | **57** | reported; touched by nothing else |

**Two independent checks that these are the real boundaries, not a schematic.**

1. 230 + 56 + 56 + 57 = **399**, the Beer Hall frame length published in `tab:venues`.
2. The test span **2026-05-12 → 2026-07-07** is exactly what `reconcile` prints for itself
   on the same run ("test span : 2026-05-12 -> 2026-07-07").

**One correction to the record.** The figure programme and `log/76` both described the split
as "four spans of eight weeks each". It is three blocks of eight weeks plus a fit span that
takes everything earlier — and the fit span is **230 days, four times the length of any
other block.** A figure drawn to scale will show that asymmetry, and it should: the reader's
likely misreading is that the four blocks are comparable in size. The test block is 57 days
rather than 56 because the boundary is inclusive at both ends.

`n = 56` — the number printed in every row of the unbiasedness table — is the **calibration**
block, not the test block. Worth stating in Methods 3.7, because the two are adjacent, equal
in nominal length, and easy to confuse.

## R2 · Per-day conformity scores — DONE, feeds `fig:drift` (F4)

`eval/exchangeability_diagnostic.py` now persists the per-observation frame it already
computed. **A persistence change, not a recompute:** `venue_report` gained an optional
`collect` list and `main` writes the concatenation. Verified — the `venues` block of
`exchangeability_diagnostic.json` is **byte-identical** to the committed one.

Output `eval/exchangeability_scores.csv`, **5,166 rows**, columns
`venue, origin, step, target, y, yhat, res, state`, where `res` is the conformity score and
`state` is the Mondrian group (0 active / 1 structural-zero).

| venue | rows | first target | last target |
|---|---|---|---|
| beer_hall | 1,911 | 2025-10-02 | 2026-07-07 |
| ellel | 1,820 | 2025-10-12 | 2026-07-04 |
| two_river_taps | 1,435 | 2025-10-10 | **2026-05-08** |

Three venues, no fourth. Two River Taps terminates at **2026-05-08**, its closure date, which
is the correct behaviour and a useful check that the frame is the real one.

**This is not the D-U3 run.** `ELLEL_DIARY_LIVE` is still `False`; no statistic moved and no
blocked row is answered.

## R4 · Corpus screening counts — STOPPED. The counts do not exist and cannot be recovered

**R4 cannot be completed as specified, and the reason is on file rather than a gap in the
search for it.** `knowledge/04_supervisor_evidence_pack.md` §3.1 states it directly:

> **Stage counts.** No screened-versus-retained count exists at any stage, and it is not
> recoverable now. The only defensible counts are terminal.

and, of the search itself:

> the search was not pre-registered, and no protocol document exists … it was thematically
> organised and retrospectively auditable, but it was not conducted under a protocol written
> in advance, and the screening counts a PRISMA-style account would require were never
> recorded at the time.

**Consequence for A-F1, the Appendix B screening flow.** A PRISMA flow diagram requires
records identified → screened → excluded with reasons → included. Three of those four boxes
have no number and no way to obtain one. **Drawing the diagram would require inventing them,
and the diagram's whole rhetorical function is to assert that a systematic process happened.**
Producing it would be the most damaging single item in the figure programme: it would claim,
in the most legible form the document has, a process the project's own evidence pack says did
not occur.

Note this compounds a finding already recorded in `07_figure_programme.md` §6 — **the cited
corpus contains no PRISMA diagram either**, so the convention had no precedent to appeal to
even before the counts turned out to be missing.

### What R65 can be met with instead

R65 asks for the search and screening protocol to be recorded. It does not require a flow
diagram, and the honest artefact is available in full:

| Appendix B carries | Source |
|---|---|
| A plain statement that the search was **not** pre-registered and no protocol predates it | `04_supervisor_evidence_pack.md` §3.1 |
| The eight thematic areas the search was organised around | §3.1 |
| **Inclusion criteria as practised** — bears on a thematic area; claim verifiable against retrievable full text or quotable abstract; governs a decision the project actually makes | §3.1 |
| **Exclusion criteria as practised** — unverifiable claims excluded, the negative confirmed two independent ways (the Wickens & Dixon case); acquisition without a job excluded | §3.1, `citation_audit.md:238` |
| **Search boundaries deliberately not crossed**, four of them with reasons on file | `litreview_corpus_judgement.md:348-371` |
| **Terminal counts**, which are defensible | §3.2; Zotero 121 live top-level items |
| The two closed-access weather papers deliberately not cited, with the reason | `BLOCKED_third_party.md` §G |

**Recommendation: A-F1 becomes a criteria table plus prose, and no flow diagram is drawn.**
A declared-limitations appendix that states plainly what was not done is worth more than a
diagram that implies otherwise, and it costs nothing against HC1 either way. **This needs
Phuong's decision** — it changes an approved item in the figure programme.

---

## Blocker B3 — CLEARED as a side effect, and more strongly than required

B3 asked that `tab:weather` source the **post-M24** fold grid rather than the degenerate
six-fold one. Verified against `eval/weather_basis_L1.json` and `eval/weather_basis_mcs.json`:

- Origins are **273 / 260 / 205** — the current ladder counts, not 6 and not the 39 the M24
  fix widened to. Five arms (N, O, H, F, M) at all three venues.
- Block length 7, **B = 10,000**, seed 93, ceiling 2026-07-07.
- **The values are on the ruled basis.** The Beer Hall no-weather arm N = **0.6005**, which
  equals `metric_ordering`'s independently regenerated `rung4_chronos2` mean
  (0.60052838…) to four decimals. Two River Taps N = 0.6260 against 0.62598…. Ellel is in
  £ (110.85), consistent with `unscaled`.

That last point is the strong form: `tab:weather` is not merely post-M24, it is post-Gate-A,
and it agrees with a separately regenerated artefact. **B3 cleared. F7 is buildable on it.**

---

## Verified end state

- `hierarchy/block_spans.py` added; `hierarchy/block_spans.json` written.
- `eval/exchangeability_scores.csv` written, 5,166 rows, 3 venues; statistics unchanged.
- R4 stopped with cause; A-F1 needs a decision.
- B3 cleared with an independent cross-check.
- F1 and F4 both now have their data. F7's source verified.

---

## The `functional_pair` origin count — decided, and it is a defect rather than a design choice

`log/76` §12 recorded that `eval/functional_pair.py` scores Ellel on **266** origins where
the ladder, the MCS and every other L1 package use **260**, and left it as a design
difference to be adjudicated. Adjudicated here: **it is a bug, and the code says so itself.**

The two paths are identical in every parameter — `HORIZON = 7`, `MIN_TRAIN = 120`,
`STEP = 1`. They differ in one call:

| Module | Frame call | Trimmed? |
|---|---|---|
| `eval/fold_vectors.py:65` | `ladder._load_feats(venue)` | **yes** — `_load_feats` is documented as "build features, then trim to the venue's active trading span" (`models/ladder.py:76-80`) |
| `eval/functional_pair.py:60` | `build_features(venue)` | **no** |

**What settles it is `functional_pair`'s own comment.** Line 47 reads:

```python
STEP = 1                       # the established one-day step (273/260/205 origins)
```

The module states that it is producing **273/260/205** and then produces **273/266/205**. The
intent is recorded in the source and the code does not implement it. That is not a deliberate
divergence needing a stated reason; it is an untrimmed frame.

Only Ellel is affected, because only Ellel has a leading dead span for `trim_to_active` to
remove — the 2025-06-08 sale-and-reversal mis-ring plus five dead days to 2025-06-13
(`log/43:55-59`). Beer Hall (273) and Two River Taps (205) match the ladder exactly, which is
why it went unnoticed.

**Why it is not cosmetic.** The six extra origins are built over a span whose first active day
has not yet occurred, so their training windows are padded with structural zeros that
`trim_to_active` exists to exclude. `_load_feats`'s docstring gives the reason in the closed-
venue case: *"otherwise every model trivially 'wins' by predicting zero."* The same hazard
applies at the head of a series as at the tail.

**Recommendation: one-line fix, `build_features(venue)` → `ladder._load_feats(venue)`, then
re-run.** Cost ~13 minutes, no gate beyond the standing rerun approval. It changes an R9
minimal-pair result reported as prose in Results 4.1 and touches **no float** in the figure
programme.

**Not executed here.** It re-runs an experiment and moves a reported number, so it goes to
Phuong with the rest. If declined, Methods must state the two frames and why they differ —
but the honest statement would have to be that they differ by oversight, which is a worse
sentence than the fix is a cost.

**This is the third artefact in two sessions to turn on the 392-against-386 distinction**,
after the `tab:venues` frame length (resolved: both correct, different objects) and the
`tab:bases` "180.1 & 385" cell (`numbers_audit.md:108`, open under B4). The distinction is
real and load-bearing, and the standing instruction stands: **every table states which frame
it is on.**
