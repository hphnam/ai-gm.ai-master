# 96 · S21, the served partition, and what report 95 §7.3 costs in the document

**Read-only on `.tex`.** No chapter file was edited. Every word figure below was taken on
a throwaway copy of the Overleaf clone under the scratchpad, and the clone itself is
untouched. Nothing here is applied, nothing is reduced, and no ruling is taken.

| | |
|---|---|
| HEAD at start | `8e772071ab6bda5b723dd1d2c52412305e9d7e19` |
| Overleaf clone | `fbf64a2bb7db3ab99c26b023d56562c34547bfac`, clean on every `.tex` |
| Store ceiling, before | `2026-07-07` (`warehouse.assert_store_ceiling()`) |
| Word-count instrument | `texcount -0 -sum -merge -total` over the six chapters plus `abstract.tex`, the scope `\bodywordcount` defines at `main.tex:255-258` |
| Baseline reproduced | **19,993**, matching `main-words.sum` and report 92 |

`texcount` is not on the default `PATH`; it lives in `~/texlive/2026/bin/universal-darwin`
alongside `latexmk`. S12 concluded it was absent and planned a correction package around a
margin it could not recompute. The export was made before any conclusion about the
instrument was drawn here.

---

## 1 · Is the Mondrian partition active in the served conformal path?

**Yes, at all three venues, and it is active in the store on disk, not merely in the code.**

### 1.1 · The configuration

`config.py:240`, the only place the days are named:

```python
STRUCTURAL_ZERO_DOW = frozenset({0, 1})
```

Monday and Tuesday. The estate is `config.py:137`:

```python
FORECAST_VENUES = ("beer_hall", "two_river_taps", "ellel")
```

The value is read per venue through `org_profile.structural_zero_dow`
(`org_profile.py:92-104`):

```python
def structural_zero_dow(venue: str) -> frozenset[int]:
    """Days this venue is closed by design (Mon=0 .. Sun=6).

    Feeds the `is_structural_zero` feature AND the Mondrian conformal grouping. The
    grouping is the load-bearing use: closed days sit deterministically near zero, so
    pooling their tiny residuals with trading days' produces a single marginal quantile
    that under-covers the days that matter. Group on the wrong days and the band is
    miscalibrated on the right ones.
    """
    v = _venue(venue)
    if v is not None:
        return frozenset(v.structural_zero_dow)
    return frozenset(config.STRUCTURAL_ZERO_DOW)
```

The served store is built on the **unbound** path (`_ACTIVE.get()` is `None`), so all
three venues resolve to the same `{0, 1}`. A bound tenant profile could supply an empty
set and switch the partition off for that tenant, which `CONTRACT.md:52` states is a real
configuration and not an unset field. **No venue in this estate is in that state.**

### 1.2 · The code that reads it

The group is stamped onto every residual at `conformal/wrap.py:139-156`:

```python
    # The Mondrian group. This read the literal (0, 1) rather than a constant, so
    # Lune's own `STRUCTURAL_ZERO_DOW` never actually reached the grouping it defines:
    # editing config would have moved the feature and left the band calibrated on
    # Mon/Tue. Per-venue now, and honest about where the days come from.
    zero_dow = org_profile.structural_zero_dow(venue)
    ...
                    "is_zero": int(r["date"].dayofweek in zero_dow)})
```

and consumed by `_mondrian_quantiles` (`conformal/wrap.py:161-167`):

```python
def _mondrian_quantiles(
    abs_res: np.ndarray, groups: np.ndarray, level: float
) -> dict[int, float]:
    return {
        g: conformal_quantile(abs_res[groups == g], level)
        for g in np.unique(groups)
    }
```

**Every writer of the `bands` table was enumerated, not sampled.** There are three outside
the tests: `conformal/wrap.py:279` (`_persist_standby_forward`), `conformal/wrap.py:322`
(`_persist_test_band`) and `hierarchy/reconcile.py:550`. The first two band through
`_mondrian_quantiles` at lines 268 and 309 respectively. The third is the L2/L3 MinT path,
whose quantile is per hierarchy node (`node_quantiles`, `hierarchy/reconcile.py:231`) and
is **not** grouped on the calendar; it is a different construction and is not a
counter-example. The compute engine's forward path bands the same way,
`compute/forward.py:203`:

```python
        by_grp = _mondrian_quantiles(abs_res, groups, level)
```

`GET /forecast` (`service/app.py:194-225`) reads `warehouse.read_band`, which applies no
model filter, so it returns whatever is persisted for the venue.

> **CORRECTED 2026-08-18 (S29), decision row 122(a).** The sentence above — *"The compute engine's
> forward path bands the same way, `compute/forward.py:203`"* — is wrong about `forward.py`, and the
> quoted line 203 is the line before the difference. `compute/forward.py:204-218` carries a **per-group
> floor** that `conformal/wrap.py` does not: it drops any Mondrian group holding fewer than
> `MIN_CALIB_RESIDUALS = 30` residuals and falls back to the marginal band, its own comment reading
> *"The floor has to apply PER GROUP, not to the pool."* `conformal/wrap.py:216` only **counts** the
> lapse (`undersized[lvl] += int((ag == g).sum() < conformal_min_n(lvl))`) and issues the band anyway.
> **This report's headline measurement STANDS and is strengthened, not weakened:** the partition is
> active in the store precisely because `conformal/wrap.py` has no floor. See row 122(a) for R-4.3,
> the consequence on the compute path.

### 1.3 · The store, which is the only evidence that settles it

Code that could partition is not a partition that did. Read-only against
`store/brain.duckdb` at ceiling `2026-07-07`, half-width `hi - yhat` at level 0.90 on the
served conformal model, split by the configured days (`dayofweek` verified: Monday = 1,
Tuesday = 2):

| venue | group | n | min half-width | max half-width |
|---|---|---:|---:|---:|
| beer_hall | Mon/Tue, structural zero | 28 | 158.45 | 168.80 |
| beer_hall | other days | 66 | 728.13 | 736.34 |
| ellel | Mon/Tue, structural zero | 28 | **0.00** | 22.70 |
| ellel | other days | 72 | 545.02 | 565.51 |
| two_river_taps | Mon/Tue, structural zero | 24 | 197.11 | 219.64 |
| two_river_taps | other days | 61 | 321.28 | 358.98 |

The two groups are separated by a factor of four and a half at the Beer Hall, roughly
twenty-five at Ellel, and about one and a half at Two River Taps. **The partition is
active and load-bearing at every venue.** The A5 coverage reports agree independently:
60, 56 and 42 group bands issued per level, which is two groups times 30, 28 and 21
blocks, none of them clamped.

**An unsolicited finding while establishing this.** Ellel has **12 served band rows at
level 0.90 with `hi - lo` exactly 0.00**, all on Mondays and Tuesdays between 2026-03-30
and 2026-05-05. A zero-width band is served for those dates: any actual other than exactly
the forecast is outside it. This is the served-path instance of report 95 §4.1, which
counted the same degeneracy in the evaluated frame. It is recorded here and not repaired.

---

## 2 · What §7.3 implies for the served band

Report 95 §7.3, at the Beer Hall on the `closed_traded` cell, **n = 94**:

| arm | coverage | CI |
|---|---|---|
| A, unpartitioned fixed | **0.9255** | [0.853, 0.970] |
| C, AgACI unpartitioned | **0.9255** | [0.853, 0.970] |
| E, occurrence **ORACLE** | **0.9255** | [0.853, 0.970] |
| B, Mondrian fixed, **the served construction** | 0.4894 | [0.385, 0.595] |
| D, Mondrian x AgACI | 0.5213 | [0.416, 0.625] |

The identity is exact, not a rounding artefact: all three arms cover **87 of 94**.

**Arm B is the served construction.** Report 95 §2.1 reproduced it against C7's published
Mondrian coverage at absolute difference 0.0, and the figure `0.489` now standing in
`results.tex:609` is that same number. So the arms above and the document's own sentence
are on one frame, and a §7.3 figure spliced into that sentence would not be mixing
vintages.

**The implication for the served band, stated plainly.** On the 94 days at the Beer Hall
that the closure calendar called closed and on which the venue took money, the band the
service actually returns covers 46 of them. Dropping the partition entirely covers 87, and
that is the same 87 an oracle told the truth about occurrence covers. The repair needs no
covariate the project does not have, no booking diary, and no method that is not already
implemented and tested in this codebase.

### 2.1 · Why this is new rather than a restatement of C7

C7 §6.3 measured the same three arms **marginally** and explicitly declined a verdict:

> Recorded as measured; no verdict drawn, because the served band's justification is
> conditional coverage rather than marginal coverage and this table speaks only to the
> latter.

That is the correct refusal, and §7.3 removes its stated ground. The served band's
justification is conditional coverage; §7.3 is a conditional-coverage measurement, on the
one cell the partition is charged with getting wrong; and on it the unpartitioned band
does not merely beat the partition, it ties the oracle. **The reason C7 gave for not
drawing a verdict at the Beer Hall no longer holds.**

### 2.2 · The flag

This bears directly on **FLAG-BAND-UNDERCOVERAGE-BH (OPEN, served-band decision)**, whose
current evidence is a marginal shortfall (0.871, CP [0.855, 0.887]) and whose recorded
candidate repair is ACI, refused because it is not a Winkler win. §7.3 adds two things
that entry does not carry:

1. **Where the shortfall lives.** Site 8's applied text already says the cell carries 77
   per cent of the venue's coverage shortfall. §7.3 says what closes it.
2. **A candidate that is cheaper than ACI**, namely serving the pooled band at this venue,
   which the codebase already computes (`conformal_quantile` on the ungrouped pool) and
   which report 95 measures at 0.9255 on the cell and 0.8800 marginally against the served
   0.8714.

**It is not a recommendation, and there is a live counter-argument in the document itself.**
`results.tex:682-712` compares plain pooled split conformal (P) against the incumbent
Mondrian band (D) on the Winkler score, and D wins at all three venues (1807 against 1940
at the Beer Hall, 1263 against 1435 at Ellel, 646 against 654 at Two River Taps), with the
confidence set retaining all five methods at the Beer Hall. Winkler penalises width;
coverage on a cell does not. **Both statements are true and they are answers to different
questions**, which is exactly the tension a served-band review would have to arbitrate. It
is not arbitrated here. Flagged for that review, with this report as the evidence pointer.

---

## 3 · Pricing a C7 statement that carries §7.3

### 3.1 · The instrument was checked against known answers first

All measurements are marginal over **site 8's applied replacement**, which is live at
`results.tex:607-610` and was verified present before pricing. The harness splices at the
same anchor report 92 used, immediately after `shortfall.`, and re-measures the whole
counted body rather than counting the fragment alone, because `texcount` is
context-sensitive and has already been caught dropping text on this document.

Report 92's three forms, re-priced here:

| Form | counted body | Δ | report 92 | agrees |
|---|---:|---:|---:|---|
| (a) bare foreclosure, **withdrawn** | 20,002 | **+9** | +9 | yes |
| (b) both counterweights, no numbers | 20,016 | **+23** | +23 | yes |
| (c) full, both numbered | 20,016 | **+23** | +23 | yes |

**A correction to the framing of the request.** The package asks for a comparison against
"the withdrawn +23 form". **No +23 form was withdrawn.** Report 92 §4.2 withdrew **(a) at
+9**, on the ground that a bare negative sets a reader up to dismiss the Further Work item
at `conclusion.tex:215-222`, and closed with *"(a) is withdrawn. The choice is (c) at +23,
or nothing."* Reports 93 and 94 both carry the C7 displacement forward as an open ruling at
+23, form (c). The comparison below is therefore against **(c), the live proposal**, and
(b) is shown because it shares the price.

### 3.2 · The §7.3 forms

Each replaces the two occurrence-oracle counterweights with the cell-level equivalence.

| Form | text after `shortfall.` | Δ |
|---|---|---:|
| **(d1)** | `Dropping the partition covers the same cell at $0.926$.` | **+9** |
| **(d5)** | `Grouping on occupancy cannot beat $0.926$ here, which dropping the partition already reaches.` | **+13** |
| **(d2)** | `Dropping the partition covers the same cell at $0.926$, so the partition is the defect.` | **+15** |
| **(d3)** | `An oracle grouped on realised occurrence reaches $0.926$ here, and so does dropping the partition.` | **+15** |
| **(d4)** | (d3) plus `; the partition is the defect.` | **+20** |
| **(d)** | `Dropping the partition covers the same cell at $0.926$, so the partition is the defect rather than the variable it is drawn on.` | **+23** |
| **(f)** | `An oracle grouped on realised occurrence lifts them to $0.926$, and dropping the partition covers the same $87$ of $94$; the partition is the defect.` | **+25** |
| **(e)** | (d) with the oracle named and labelled | **+29** |
| **(g)** | §7.3 **plus** the Ellel counterweight retained | **+23** |

### 3.3 · What the pricing says

**Report 92's "no cheap defensible middle" no longer holds.** Its finding was that the
choice is *"+9 without evidence or +23 with it"*, because naming both counterweights
qualitatively costs as many words as the numbers they replace. §7.3 breaks that, because
it replaces two counterweights with one measurement:

- **(d3) at +15 carries the whole of §7.3** and is 8 words cheaper than (c). It names the
  oracle, labels it an oracle, and states the equivalence.
- **(d1) at +9 ties the withdrawn (a) exactly**, and unlike (a) it is a positive
  evidenced statement rather than a bare negative. The specific defect report 92 withdrew
  (a) for, that a reader would dismiss the Further Work item, does not arise: (d1) makes
  no claim about occurrence grouping at all.

**Three things (d3) buys that (c) does not.**

1. **It answers the question the sentence raises.** Site 8's text says the cell is "banded
   against a group of near-zero residuals", which invites "so band it against the right
   group". (c) answers by pricing the right group and finding it costs Ellel. (d3) answers
   that there is no right group to find, on this cell, at this venue.
2. **It is conditional evidence for a conditional claim.** (c)'s second counterweight,
   `an unpartitioned band covers $0.880$, above either`, is a **marginal** figure offered
   against a **cell-level** defect, which is the scope mismatch C7 §6.3 flagged in itself.
   (d3)'s 0.926 is the same cell as the 0.489 four words earlier.
3. **It costs 8 fewer words**, which at a standing margin of +7 is the difference between
   a position 16 over the cap and one 8 over it.

**What (d3) loses.** It drops Ellel entirely. (c) tells a reader that the occurrence
partition costs Ellel 0.914 against 0.843; (d3) does not. That matters because report 95
§7.2 measures the limit case there: at Ellel the same cell is 0.0000 under the served
partition on n = 21, and arm D covers none of the 21 either. A reader of (d3) alone would
have Beer Hall evidence and no reason to doubt it generalises. **(g) at +23 keeps both and
costs exactly what (c) costs**, so if the Ellel counterweight is judged necessary there is
no saving to be had from §7.3 and (c) and (g) are a straight choice on content.

**One risk (d3) shares with (c), which neither introduces.** Neither form mentions
`tab:winkler` forty lines later, where the Mondrian band wins on Winkler at all three
venues. A reader who takes either sentence estate-wide is reading past a table in the same
chapter. This is a property of the site, not of §7.3, and it is not costed here because
costing a fix would be proposing one.

### 3.4 · The budget, for reference only

Baseline margin **+7** against the 20,000 cap; the project's own reserve floor is **>= 250**
(`ledger/reduction_cost_register.md:810`), which no position below reaches.

| Position | counted body | margin |
|---|---:|---:|
| Baseline, site 8 applied | 19,993 | **+7** |
| plus (d1) | 20,002 | −2 |
| plus (d5) | 20,006 | −6 |
| plus (d3) | 20,008 | −8 |
| plus (c), the standing proposal | 20,016 | −16 |
| plus (g) | 20,016 | −16 |

Every one is over the cap. **No de-duplication is proposed, no menu is compared, and no
funding is recommended.** The ruling remains Phuong's.

---

## 4 · `conclusion.tex:215-222`

### 4.1 · Verbatim

```latex
\textbf{Mondrian groups drawn from predicted occupancy.} A partition specified on the closure
calendar misgroups observations at all three venues and in opposite directions
(Section~\ref{sec:res-drift-cause}). The repair is not to group on whether the venue traded, which
is known only after the target date and would condition the calibration group on the realised
outcome; it is to group on an occupancy signal available before it, and the covariate that would
supply one is the booking diary Section~\ref{sec:disc-limitations} records as never received. That
is the second change this work would make to its own method, and it is blocked rather than
mechanical.
```

**texcount: 100 governing words.** Measured by deleting lines 215 to 222 and re-running
the whole-body instrument: 19,993 becomes 19,893. The passage is the complete
"predicted occupancy" Further Work item, one of five in that list; the bounds were checked
at 213 and 224 and cut on paragraph boundaries.

`sec:res-drift-cause` is `results.tex:581`, and the subsection runs to line 678, the next
`\subsection` opening at 679. **The
passage's cross-reference lands on exactly the sentence site 8 replaced**, which is where a
C7 statement would go.

### 4.2 · Does §7.3 make the proposal redundant, narrower, or unchanged?

**Narrower.**

The reasoning, in one step, and its limit stated with it. The passage proposes grouping on
**predicted** occupancy, and it is careful to reject grouping on **realised** occurrence as
conditioning on the outcome. Arm E is that rejected partition, built with perfect
information. A predicted-occupancy partition that predicted perfectly **is** arm E, so arm
E is the perfect-information limit of the proposal's variable.

**The limit is not a theorem and is not asserted as one.** Coverage is not monotone in
group purity, so a noisier occupancy partition could in principle cover a cell better than
the exact one. Arm E is the proposal's variable measured with no prediction error, not a
proved upper bound on what any occupancy partition can achieve.

With that caveat, the Beer Hall reading is unambiguous. Report 95 §3.1, cell sizes carried:

| venue | cell | n | A, no partition | E, ORACLE | headroom for the proposal |
|---|---|---:|---:|---:|---|
| beer_hall | closed_traded | **94** | 0.9255 | 0.9255 | **none, exactly** |
| ellel | closed_traded | **21** | 0.6667 | 1.0000 | large |
| two_river_taps | closed_traded | **38** | 0.8158 | 1.0000 | large |

**At the Beer Hall the proposal's ceiling on that cell is already reached by dropping the
partition**, which is not blocked, needs no booking diary, and is implemented. At Ellel and
Two River Taps the ceiling is strictly higher than dropping the partition, so the proposal
retains real headroom there.

- **Not redundant**: it survives at two of three venues on the cell.
- **Not unchanged**: the venue whose evidence the passage cites through
  `sec:res-drift-cause`, and whose 94 days site 8's sentence is about, is the one venue
  where the proposal's ceiling buys nothing over a cheaper alternative it does not mention.
- **Narrower** is the accurate word.

**A second narrowing, on the marginal figure.** Arm E is worse than arm A marginally at two
of three venues (Beer Hall 0.8640 against 0.8800; Ellel 0.8427 against 0.9102), and better
only at Two River Taps (0.9639 against 0.9458). So even where the proposal's ceiling
repairs the cell, it is not established that it improves the venue.

### 4.3 · The amendment, priced and not applied

Three forms, spliced after `mechanical.` at line 222.

| Form | text | Δ |
|---|---|---:|
| **(h3)** | ` At the Beer Hall it has no headroom against no partition at all.` | **+13** |
| **(h2)** | ` At the Beer Hall it has no headroom, an occupancy partition at its perfect-information limit covering that cell no better than no partition at all.` | **+25** |
| **(h1)** | ` At the Beer Hall that repair has no headroom: an oracle grouped on realised occurrence, the perfect-information limit of any occupancy partition, covers the misgrouped cell no better than dropping the partition does.` | **+33** |

**A dependency that governs all three, and it is not a word cost.** None of the numbers
behind these sentences is in the document. The 0.926 unpartitioned cell figure appears
nowhere in `chapters/`; the closest thing is the 0.489 site 8 put there. **An amendment at
`conclusion.tex:215-222` applied alone would assert an unsupported result in a chapter
whose job is to point back at Chapter 4.** (h3) in particular reads as a bare assertion
with nothing to reference.

So the honest ordering is: **a §7.3 form in Results is a precondition for any amendment in
the Conclusion, not an alternative to it.** If (d3) lands at +15, (h3) at +13 becomes a
back-reference to a stated number rather than a new claim, and the pair costs +28. If no
C7 form lands, the correct amendment cost is **not** +13; it is +13 plus whatever it costs
to state the evidence, which is (d3) at +15.

**No form is recommended and none is applied.** The word "amendment" is used because the
package used it; whether the passage should say anything at all is a ruling.

---

## 5 · Other passages in `chapters/` on group-conditional calibration

The sweep covered all six chapter files for `mondrian`, `group-conditional`, `groupwise`,
`per-group`, `partition`, `unpartitioned`, `pooled split conformal` and `incumbent`, case
insensitive. Nine passages touch the subject. Classified by whether they **recommend**,
**assume**, or merely **describe or diagnose**:

### Recommends

| Location | What it says | Note |
|---|---|---|
| `conclusion.tex:215-222` | Further Work: Mondrian groups drawn from predicted occupancy | The only forward recommendation in `chapters/`. Section 4 above. |

### Assumes

| Location | What it says | Note |
|---|---|---|
| `methodology.tex:511-514` | "A Mondrian variant computes group-conditional quantiles separating calendar-open from structural-zero days, so a closed venue's near-zero residuals cannot shrink a trading day's interval" | The specification. States the rationale as fact, and the rationale is the one §7.3 measures against on one cell at one venue. |
| `methodology.tex:517-522` | "The Mondrian partition is an observed calendar variable rather than an inferred regime, and that is the decision needing a reason" | Defends the **choice of variable**, citing `sun_conformal_2025` on the coverage penalty an inferred regime pays. Careful to say this "motivates the choice and does not certify it". `relocation_candidates.md` M4 prices this clause at 163 words as AVAILABLE. |
| `methodology.tex:452-454` | Appendix `app:pseudocode` "states the construction and its group-conditional variant as pseudocode" | Pointer. |
| `results.tex:428-429` | Table caption: "Empirical coverage of the **served** Mondrian band" | Assumes the served band is Mondrian, which section 1 above confirms independently against the store. |
| `results.tex:682-712` | Winkler comparison, D "the incumbent Mondrian band", none adopted under the pre-registered rule | Assumes D is incumbent. The live counter-argument in section 2.2. |
| `conclusion.tex:190-194` | Method learned: "the Mondrian partition that makes it usable on a series with closed days" | Retrospective, and immediately qualified by "which Section~\ref{sec:res-exchangeability} then had to diagnose rather than assume". |

### Describes or diagnoses, recommends nothing

| Location | What it says |
|---|---|
| `results.tex:475-478` | "The Mondrian partition splits on calendar state, and a calendar is not a trading record", with Ellel's 1037 of 1300 |
| `results.tex:607-610` | Site 8's applied replacement, the 94 days and 0.489 |
| `discussion.tex:365-370` | "Day of week stands in for occurrence, and its cost is that the Mondrian partition can be wrong in either direction", with 17.2 per cent against 79.8 per cent |

**Two observations from the sweep.**

1. **Nothing in `chapters/` recommends dropping the partition, and nothing reports the
   unpartitioned arm's coverage.** The only unpartitioned figure anywhere in the document
   is P's Winkler column in `tab:winkler`, where it loses. A reader of the finished
   document cannot learn that the ungrouped band covers 0.880 marginally at the Beer Hall,
   above the served band, let alone 0.9255 on the cell. **That absence is what both the C7
   form and the conclusion amendment are proposals to fix**, and it is stated here as the
   shape of the gap, not as an argument for filling it.
2. **`methodology.tex:511-514` is the passage §7.3 bears on that nobody has costed.** It
   asserts the partition's rationale in the present tense as a property of the method. The
   assertion is true as a statement about what the construction does, and §7.3 measures
   one cell where doing it buys nothing over not doing it. Whether that warrants any change
   is outside this package. **It is recorded because no prior report names this passage**;
   every C7 costing to date has been about the site reports 90 and 92 call
   `results.tex:606-609`, which the applied edit moved to 607 to 610, and
   `conclusion.tex:215-222`.

`appendix/` was **not** swept: the package asked about `chapters/`. Three appendices are
referenced from the passages above (`app:mondrian`, `app:pseudocode`, `app:adaptive-impl`)
and none has been read here. Stated so the scope of this section is not read wider than
what was examined.

---

## 6 · What this package did not do

- **No `.tex` file was edited.** The clone is clean on every `.tex` at `fbf64a2`.
- **No reduction was made**, no menu compared, no de-duplication priced, and
  `reduction_cost_register.md` was read for the reserve floor only.
- **Nothing was applied.** Every form above is a measurement of a hypothetical.
- **No ruling was taken** on C7, on the conclusion amendment, on the served band, or on
  `methodology.tex:511-514`.
- **No numbered ledger row was edited.** No served path, evaluated path or frozen artefact
  was changed. No test was removed.
- **Report 95 was not revised.** §7.3 is quoted, not restated.

## 7 · End state

| | |
|---|---|
| HEAD at end | stated in the commit that carries this file; a commit cannot state its own SHA |
| Overleaf clone | `fbf64a2`, clean on `.tex` |
| Store ceiling, after | `2026-07-07` |
| `.tex` files touched | **0** |
| Baseline reproduced, start and end | 19,993 |

**Open, and not settled here:**

1. **The C7 displacement ruling**, now with a §7.3 option at +15 alongside the standing
   (c) at +23. Phuong's, per report 94 section 5.
2. **Whether `conclusion.tex:215-222` is amended**, which section 4.3 shows cannot be
   ruled on independently of item 1.
3. **FLAG-BAND-UNDERCOVERAGE-BH**, to which section 2.2 adds a located cause and a second
   candidate repair, and against which section 2.2 also records the Winkler
   counter-argument. Owner remains a served-band review.
4. **Ellel's 12 zero-width served band rows**, section 1.3, newly observed and unowned.
