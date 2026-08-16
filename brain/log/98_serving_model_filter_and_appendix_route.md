# 98 · S23, the serving path serves a retired model, and the appendix route costs nothing

**Record and price only.** No `.tex` file was edited, no model filter was added, no repair
was made, no reduction was made, nothing was pushed. Every word figure was taken on a
throwaway copy of the Overleaf clone under the scratchpad.

| | |
|---|---|
| HEAD at start | `30d3c133b123f5ef6025ac3c09f8b57ddd772794` |
| HEAD at end | stated in the commit that carries this file |
| Overleaf clone and `origin/main` | both `fbf64a2bb7db3ab99c26b023d56562c34547bfac`, verified live |
| Store ceiling, before and after | `2026-07-07` |
| Counted body | **19,993**, margin **+7** |
| Appendix total, measured | **9,597** |
| `.tex` files touched | **0** |

---

## 1 · The missing model filter

### 1.1 · Three parts, and only the first is what the brief described

**(1) Neither read path filters on model.** `store/warehouse.py:402-427` (`read_band`) and
its L2/L3 twin `service/app.py:229-247` (`_read_band_with_key`) both join `forecasts` to
`bands` on `f.model = b.model` and filter on venue, layer and level:

```sql
SELECT f.target_date AS date, f.yhat, b.level, b.lo, b.hi, f.model
FROM forecasts f JOIN bands b ON
  f.venue = b.venue AND f.layer = b.layer
  AND f.key IS NOT DISTINCT FROM b.key
  AND f.target_date = b.target_date AND f.model = b.model
WHERE f.venue = ? AND f.layer = ?
```

The join keeps a forecast with its own band, which is correct. **There is no model
predicate, no recency rule and no default**, so every model ever persisted for the venue
comes back.

**(2) The accumulation follows from the write key, it is not a cleanup that was skipped.**
`_BAND_COLS` (`warehouse.py:347`) makes the upsert key
`(venue, layer, key, target_date, model, level)`. Writing a new model's rows therefore
**adds** them beside the old rows; nothing displaces the old model. The docstring says so
explicitly: *"Upsert band rows keyed on (venue, layer, key, target_date, model, level)."*

**(3) There is nothing for a filter to read.** Both `served_forecast` and
`ladder_selection` are **empty in the store**. So the repair is not one predicate; it needs
a source of truth for "current model" that the store does not presently hold.

### 1.2 · What it returns today

L1 at level 0.90, measured against the store at ceiling 2026-07-07:

| venue | rows returned | distinct dates | models | dates answered by more than one model |
|---|---:|---:|---:|---:|
| ellel | **214** | 100 | 3 | **57** |
| beer_hall | **151** | 94 | 2 | **57** |
| two_river_taps | 85 | 85 | 1 | 0 |

Two of three venues return more forecasts than there are days.

### 1.3 · The worked case, which is the one that matters

**2026-04-06 at Ellel is one of the two guaranteed misses in
`FLAG-BAND-DEGENERATE-ELLEL`**: actual 230.85 ex-VAT on 47 transactions. What
`GET /forecast?venue=ellel&level=0.90` returns for that single day:

| model | yhat | lo | hi | covers 230.85 |
|---|---:|---:|---:|---|
| `conformal_rung1_robust_dow` | 0.00 | 0.00 | 0.00 | no |
| `conformal_rung2_ets` | 0.00 | 0.00 | 0.00 | no |
| `conformal_rung3_gbm` | 797.63 | 758.80 | 836.45 | no |

**Three mutually contradictory answers for one day, two missing from below and one from
above, and nothing in the response lets a caller choose.** The `model` field is returned,
so a client could discriminate; no client is told which value to prefer, and the envelope's
`n` counts all three.

### 1.4 · Which model is retired, and why the count was 12 at one scope and 72 at another

`MAX_RUNG` is `{}` (`config.py:151`) since G12.9c, so
`conformal.wrap.default_model('ellel')` resolves to `rung2_ets`.
`conformal_rung1_robust_dow` is not Ellel's selection and has not been since that change.
Its **16 zero-width rows at level 0.90 and 16 more at 0.80** are the arithmetic behind
report 97 §1.1: 12 at one model-and-level scope, 28 at level 0.90 across models, 72 across
all four combinations.

### 1.5 · The compute path does not share this

`compute/engine.py:192-196` resolves exactly one served model per venue:

```python
    served = dataset.prior_state.served_model.get(venue)
    if served is None:
        served = default_model(venue)
```

and `compute/forward.py` bands only that one, in memory, never reading the table.
**The ComputeDataset path is single-model by construction. Only the DuckDB serving path is
not.** The defect is therefore in the older serving surface, not in the architecture that
replaced it.

### 1.6 · Endpoints that reach it: exactly one

`GET /forecast` (`service/app.py:193`), through lines 206 and 213. Of the ten endpoints in
`service/app.py`, no other touches the table:

- `/deviation/check` and `/deviation/scan` compute their own half-band from the residual
  stream in `signals/deviation.py` (`z = (actual - DOW-median) / conformal half-band@CP_LEVEL`).
  Neither reads `bands`.
- `/briefing` consumes the deviation feed, not the band table.
- `/health` counts `forecasts` rows only. `/sop-gaps`, `/stock/cover`,
  `/deviation/changepoint`, `/checklist/discipline` and `/freshness` do not touch it.

### 1.7 · Not repaired

Adding a model predicate changes what the service returns. That is a served-output change
three weeks before submission and outside what a recording package may do. The repair also
needs the source of truth described at 1.1(3), which does not exist yet. Same disposition
as `FLAG-BAND-DEGENERATE-ELLEL` and the unguarded deviation path at decision row 107.

**Flag:** `FLAG-SERVE-NO-MODEL-FILTER (OPEN, recorded not repaired)`, filed **separately**
from the degenerate-band flag as the package asked, because it is a different class of
defect: row 114 is a correct quantile of a degenerate group, and this is correct output
from a superseded model. **Ledger row 116.**

---

## 2 · Could any reported number reach a band through the unfiltered read?

**No. And here is the scope of the check, stated so the clean result carries it.**

### 2.1 · The readers, enumerated

**Two, outside the test suite, both inside `GET /forecast`:** `service/app.py:206`
(`warehouse.read_band`) and `service/app.py:213` (`_read_band_with_key`). The two test
readers are `tests/test_a1_warehouse.py:70` and `tests/test_a5_conformal.py:61`.

### 2.2 · Why no published figure can pass through them

**Every coverage, width, Winkler and pinball figure in the document is computed in memory
and lands in a JSON artefact; the `bands` table is a serving surface, not an evaluation
input.** Specifically:

| document figure | produced by | reads `bands` |
|---|---|---|
| `tab:coverage`, the served-band coverage table | `conformal.wrap.evaluate`, pooled in memory | no |
| `tab:coverage-traded`, decomposed by trading status | `eval/interval_calibration.py` to `interval_calibration_L1.json` | no |
| `tab:winkler` and `fig:validity-efficiency` | `eval/interval_calibration.py`, `interval_calibration_mcs.json` | no |
| §7.3 and the C7 arms | `eval/mondrian_aci.py`, `eval/partition_contrast.py` | no |
| `fig_estate` | `figures/fig_estate.py`, which reads `l1_daily` | no |
| `app:native-quantiles` (robustness) | `eval/native_interval_probe.json` | no |

`conformal.wrap.evaluate` **writes** the table at lines 279 and 322 after computing its own
pooled coverage; it never reads it back. `eval/chronos2_promotion_sensitivity.py:9` states
in its own docstring that it *"never reads `served_forecast`, `forecasts`, or `bands`"*.

### 2.3 · The scope of the check

Stated because a clean result carries the scope of the check that produced it:

- `rg` over the whole `brain/` tree, excluding `graphify-out/`, `log/`, `ledger/` and
  `docs/`, for `read_band`, `_read_band_with_key`, `FROM bands`, `from bands` and the table
  name in both quote styles, plus a Python-typed sweep for the bare token `bands`.
- A separate sweep of `figures/*.py` for `bands`, `duckdb`, `read_band` and `brain.duckdb`.
- All ten `@app` route decorators in `service/app.py` inspected individually.
- **Not checked:** whether any figure in the compiled PDF was generated by a script no
  longer in the tree. Every figure carries a `% Figure source:` trace comment and those were
  read, but a deleted generator would leave no evidence here.

---

## 3 · The appendix route, priced

### 3.1 · The exclusion, confirmed by measurement rather than by reading the macro

`\bodywordcount` (`main.tex:255-258`) runs `texcount` over
`chapters/{introduction,literature_review,methodology,results,discussion,conclusion}.tex`
plus `abstract.tex`. `appendix/` is not in that list. **That is the reading; here is the
measurement.** Every appendix form below was spliced into a throwaway copy and the whole
counted body re-measured:

| form | counted body | Δ counted | appendix total | Δ appendix |
|---|---:|---:|---:|---:|
| baseline | 19,993 | | 9,597 | |
| `app:conformal-bounds`, full | 19,993 | **+0** | 9,756 | +159 |
| `app:conformal-bounds`, minimal | 19,993 | **+0** | 9,659 | +62 |
| `app:mondrian`, full | 19,993 | **+0** | 9,712 | +115 |
| `app:mondrian`, minimal | 19,993 | **+0** | 9,657 | +60 |

**The counted body does not move, and this is a measurement, not an inference from the
macro's argument list.**

**The 9,597 independently reproduces report 92 §5.1's appendix exposure figure**, which was
quoted there from a different pass. Two independent measurements agreeing is worth more
than one, given this project's history with `texcount` scope.

### 3.2 · `app:conformal-bounds`, verbatim

Spliced immediately after the subsection's closing sentence, *"an atom at the foot of the
score distribution rather than a continuous tail."*

**Full form, +159 appendix words, +0 counted:**

```latex
That atom is what the group-conditional band draws from, and it has two consequences the
bound above does not reach. At Ellel $108$ of $112$ calendar-closed days took nothing, so the
ninetieth percentile of that group falls inside the atom and the band issued for those days
has width zero: correct as a quantile, and unable to cover a day the venue in fact traded.
At the Beer Hall the atom acts from the other side. The $94$ calendar-closed days on which
the venue traded are banded against it and cover $0.489$, while an unpartitioned band covers
$0.926$ on that same cell, exactly what an oracle grouped on realised occurrence achieves.
On the cell the partition breaks, not partitioning is as good as knowing the answer. That
does not settle whether the partition should go: it wins on the Winkler score at all three
venues (Table~\ref{tab:winkler}), which is the criterion the adoption rule reads, and no
method displaced it.
```

**Minimal form, +62 appendix words, +0 counted:**

```latex
The atom is what the group-conditional band draws from. At the Beer Hall the $94$
calendar-closed days that traded are banded against it and cover $0.489$, where an
unpartitioned band covers $0.926$, exactly what an oracle grouped on realised occurrence
achieves. The partition nonetheless wins on the Winkler score at all three venues
(Table~\ref{tab:winkler}), which is the criterion the adoption rule reads.
```

**Both carry the Winkler counter evidence**, as the package requires, and both name the
oracle as an oracle.

### 3.3 · `app:mondrian`, verbatim

Spliced after *"citing it as the guarantee would claim a theorem about a procedure the
served system never runs."*

**Full form, +115 appendix words, +0 counted:**

```latex
A fourth thing attaches to the construction and is measured rather than inherited: what the
partition costs where the calendar is wrong. At the Beer Hall the $94$ calendar-closed days
on which the venue traded are banded against the near-zero group and cover $0.489$ against a
nominal $0.900$. An unpartitioned band covers $0.926$ on that same cell, which is exactly
what an oracle grouped on realised occurrence achieves, so on the cell the partition breaks,
not partitioning is as good as knowing the answer. This does not settle whether the partition
should go: it wins on the Winkler score at all three venues (Table~\ref{tab:winkler}), the
criterion the adoption rule reads, and no method displaced it.
```

**Minimal form, +60 appendix words, +0 counted:**

```latex
What the partition costs where the calendar is wrong is measured rather than inherited. The
Beer Hall's $94$ calendar-closed days that traded cover $0.489$, where an unpartitioned band
covers $0.926$, exactly what an oracle grouped on realised occurrence achieves. The partition
nonetheless wins on the Winkler score at all three venues (Table~\ref{tab:winkler}), which is
the criterion the adoption rule reads.
```

**These are drafts priced for size, not finished prose.** Two things a drafting pass would
have to settle: *"the ninetieth percentile"* is loose for the
`ceil((n + 1) x 0.90)`-th smallest score, and both sites introduce an appendix-to-chapter
cross-reference to `tab:winkler`, which resolves but is a direction this document does not
currently use much.

### 3.4 · Which site is the better home

**`app:conformal-bounds`, on two structural grounds, neither of them a preference.**

**1. It already owns the mechanism, so the finding is a second use rather than a new
subject.** The subsection ends by establishing the zero atom in order to withhold the
two-sided coverage bound. The addition puts the same atom to a second use, which is exactly
the shape report 97 §8 identified: *"a fact can be in a document and still be missing if it
is only ever put to one use."* `app:mondrian`'s remit is **provenance**, what the three
claims attaching to the construction inherit and from where. A measured cost is not
inherited from anywhere, and the full form has to admit as much in its own opening clause
(*"attaches to the construction and is measured rather than inherited"*), which is the
draft telling you it does not fit the section's frame.

**2. It is referenced from two lines above the passage that is false.**
`methodology.tex:508` sends the reader to `app:conformal-bounds`; `methodology.tex:511-515`
is the clause report 97 §6.2 found false as written. A reader following that reference from
the repaired sentence arrives at the evidence for why the scope matters.
`app:mondrian` is referenced from `methodology.tex:522`, after the choice-of-variable
rationale, which is a passage §7.3 does not reach.

**The minimal forms are within two words of each other (62 against 60), so size does not
discriminate between the sites.** The full forms differ by 44 because the bounds version
carries the Ellel zero-width consequence as well, which is row 114's material and which
`app:mondrian` has no reason to hold.

**No placement is recommended.** "Better home if anything is placed" and "something should
be placed" are different questions, and only the first is answered here. The second turns
on two answers no session can supply: whether the appendix exclusion from the 20,000 is
confirmed, and whether a methodological finding placed in an appendix counts as a
contribution. Both are Hansi's, and `ledger/relocation_candidates.md` already records the
standing risk that a finding in an appendix may not be read by the marker.

---

## 4 · Verification

| check | scope | result |
|---|---|---|
| Counted body | canonical `\bodywordcount` scope, `main.tex:255-258` | **19,993**, margin **+7** |
| Appendix total | `texcount` over all four `appendix/*.tex` | **9,597** |
| `origin/main` | `git ls-remote origin main`, live | **`fbf64a2`**, equal to the local clone HEAD |
| `.tex` dirty | `git status --porcelain -- '*.tex'` on the clone | **0** |
| Store ceiling | `warehouse.assert_store_ceiling()`, before and after | **2026-07-07** |
| Em and en dashes | every line added this session | **0** |
| Ledger | `git diff --numstat` | **51 insertions, 0 deletions** |

---

## 5 · Unsolicited findings

**1. The store holds no record of which model is served.** `served_forecast` and
`ladder_selection` are both empty. This is larger than the missing filter, because it means
the question *"what is this venue's current model?"* cannot be answered from the store at
all, only re-derived from `config.MAX_RUNG` through `default_model`. Recorded, not chased.

**2. Two of three venues return more forecasts than there are days.** Ellel returns 214
rows for 100 dates, the Beer Hall 151 for 94. The `n` field in the response envelope counts
all of them, so a caller reading `n` gets a row count and not a horizon.

**3. The Beer Hall case is the same defect and is not about a retired model.**
`conformal_rung4_chronos2` overlaps `conformal_rung2_ets` on 57 dates there.
`FLAGS.md` records chronos2_exo as the served forecaster, so at that venue the endpoint
returns the current model **and** an alternative, which is the same ambiguity without the
staleness. The flag is written to cover both.

**4. This package's own headline number reproduced a figure it did not set out to check.**
The appendix total measured here, 9,597, is the same figure report 92 §5.1 quotes for the
exposure the declaration's exclusion rests on. It was measured for a different reason and
agrees.

---

## 6 · What this package did not do

- **No model filter was added**, and no served output changed.
- **No `.tex` file was edited**, no appendix form applied, no reduction made.
- **No numbered ledger row was edited.** Row 116 is an append.
- **No placement was recommended**, and the two questions that gate it are Hansi's.
- **Nothing was pushed.**

**Open after this package:** `FLAG-SERVE-NO-MODEL-FILTER` (new, unowned),
`FLAG-BAND-DEGENERATE-ELLEL` and `FLAG-BAND-UNDERCOVERAGE-BH` (unchanged), the C7
displacement ruling, the `methodology.tex:511-515` repair at a measured zero words, and
`conclusion.tex:215-222`.
