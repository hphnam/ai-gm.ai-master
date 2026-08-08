# Role audit — Chapters 4 and 5 under `autoresearchclaw` SKILL.md §3/§4

**Run 2026-08-08.** Six independent calls, no shared context, none seeing another's findings:
Role A × Ch4, Role B × Ch4, Role A × Ch5, Role B × Ch5, Role C (remaining four bullets) × both,
and the §4 T1–T14 gate × both.

**Why this run happened.** An audit of `results_rewrite_critique.md` found that 8C-3's six rounds
contained none of SKILL.md §3's three roles. The reference had decayed across four files — path
dropped (Ch2→Ch3), name dropped (Ch3→Ch4), content replaced (Ch4) — until *"the three standing
roles"* referred only to itself. 8C-4 caught the same error itself, mid-phase, and re-ran the roles
properly; the measured cost it recorded is the headline number for this whole exercise:

> The first pass produced all five "rounds" inside one context. It found seven findings, none
> blocking. The three independent calls found **42 blocking findings**.

Chapter 4 had never had an independent pass. Chapter 5 had had one; this run is a **replication**
on it, which is why its Ch5 findings are evidence about the roles and not only about the chapter.

**Status of every finding below: REPORTED, NOT FIXED.** No chapter text was changed. Items marked
**[VERIFIED]** were re-checked against the artefact by the coordinating session, independently of
the role that raised them.

---

## Ordering is not discretionary

SKILL.md §5 names one signal with a mandated action that outranks the rest:

> **Contradiction** · Two sections state incompatible things about the same number ·
> **Blocking. Resolve before any other revision — a contradiction is worse than either version alone.**

That signal has fired. **X1 below goes first**, ahead of T1.

---

## X1 — the two chapters contradict each other on the same regeneration **[VERIFIED]**

Raised independently by Role A/Ch5 (A6) and Role B/Ch5 (B1).

| Where | Says |
|---|---|
| `results.tex:693-695` | regenerating under numpy 1.26.4 "leaves every Winkler mean, coverage figure and Clopper–Pearson limb **identical**" |
| `discussion.tex:277-280` | "coverage figures shift by at most $0.004$ and the largest movement in a Winkler mean is $25$ points on $1814$ … stable to two significant figures and **not** to three" |

`log/78` Part 2 and `interval_calibration_L1.json` (BH arm A = 1814.29) support the Discussion.
**Chapter 4 is the false one.** Remedy: correct `results.tex:693-695` to the `log/78` figures.

## X2 — an artefact schema that misled an independent reviewer **[VERIFIED]**

Role A/Ch5 (A2) and Role B/Ch5 (B2) reached **opposite** repairs for one discrepancy: A said the
Discussion's $B = 10{,}000$ is wrong; B said `tab:winkler`'s $B = 1000$ caption is wrong. Role
B/Ch4 (B27) independently reached A's answer. The evidence:

```
mcs.py:53                        N_BOOT = 1000
interval_calibration.py:275      ... n_boot=mcs.N_BOOT, seed=SEED
interval_calibration_mcs.json    n_boot = 10000      (NO disambiguating note)
weather_basis_mcs.json           n_boot = 10000      (NO note)
group_icl_mcs.json               n_boot = 10000    + bootstrap_b_note:
                                 "n_boot is the paired-CI B; the MCS uses mcs.N_BOOT at seed"
mcs_L1_results.json              n_boot_primary = 1000
```

**Resolution: Role A is right.** The MCS ran at 1000; `discussion.tex:268`'s "about $0.004$ …
forty times resampling noise" should be $0.0124$ and about **twelve** times. `tab:winkler`'s
caption is correct and must NOT be raised.

**The finding worth more than either position:** the key `n_boot` means the paired-CI B in three
artefacts and something else in a fourth, and only ONE of the three carries the note saying so —
not the one backing `tab:winkler`. An ambiguous schema demonstrably misled a careful reader into
proposing a change that would have written a false $B$ into the dissertation. Neither role's
remit covers artefact-schema hygiene; **the disagreement is what surfaced it.** Fix the schema,
not just the sentence.

---

## Chapter 4 — Role A (Methodologist)

| id | dimension | sev | finding |
|---|---|---|---|
| A1 | protocol leakage | **blocking** | **[VERIFIED]** `tab:winkler`'s A column is per-venue oracle-tuned. `aci_best_gamma` = 0.05 / 0.005 / 0.005 (BH/Ellel/TRT), each the argmin of its own five-point sweep; the printed 1814 / 1422 / 671 ARE those minima (BH range 1814.3–1929.5). γ is never stated, never disclosed as swept, and differs per venue. The A-vs-G contrast is load-bearing — G exists to "remove the learning-rate choice the former exposes" — so an oracle-tuned A against an untuned G inverts exactly that comparison. |
| A2 | internal validity | **blocking** | **[VERIFIED]** `results.tex:626` calls Ellel's 0.896 "the closest to nominal of any cell". Its nominal is **0.80**, not 0.90: deviation 0.0956, the **furthest** of six cells (BH-Bolt 0.0158, BH-C2 0.0226, TRT-C2 0.0237, TRT-Bolt 0.0279, Ellel-Bolt 0.0615). Right finding, false premise. |
| A3 | internal validity | **blocking** | **[VERIFIED]** "Chronos-2 is better calibrated at all three venues" is true at **one** of three on |coverage − nominal|. §4.4.1 commits the chapter to treating over-coverage as failure, which makes "higher = better" unavailable. "Three agreements from three" is two. |
| A4 | internal validity | **blocking** | `results.tex:823-825` builds one confusion matrix from two denominators. 644 events, 124 misses, 8 FP ⇒ precision 520/528 = **0.985**, not 0.871; 0.872 implies ≈76 FP. The conclusion rests on the 8, which is not the figure paired with the precision. |
| A5 | protocol leakage | **blocking** | **[VERIFIED]** The window remedy quotes three venues at three different $W$ and states $W$ nowhere. Sweep at nominal 0.90: BH 0.8760/**0.8783**/0.8783, TRT **0.9089**/0.9113/0.9176, Ellel 0.9234/**0.9265**/0.9192. BH and TRT are quoted at their best cell; **Ellel at its worst** (0.9192 at W=240 is nearer nominal). |
| A6 | internal validity | **blocking** | Ellel's `tab:coverage` row (0.914, "indistinguishable from nominal") is never audited for the zero-mass artefact the chapter itself discovers 100 lines later (1037 of 1300 calendar-open days did not trade; native intervals read 0.8956 pooled against **0.4472** traded-only). The needed number does not exist in any artefact — **check could not be completed**. |
| A8 | external validity | **blocking** | "Inseparable … so the lead optimism is **absent** … and no published exogenous figure carries a covariate-quality discount" converts a non-rejection into an affirmed null, at the one point carrying a deployment claim. The chapter refuses this exact inference 80 lines later for Ellel. Applying the strict standard to an unwelcome null and the loose one to a convenient null is the asymmetry an internal-validity audit exists to catch. |
| A9 | reproducibility | **blocking** | The gate's denominator and loss contradict Methods; Results is the accurate chapter but reports a scaled Ellel figure on a basis §3.2 rules indefensible, without a word. Methods 310-312 also mis-describes the gate as RMSSE. |
| A7, A10–A15 | mixed | advisory | ρ statistics paired across different samples (n=1365 vs 1285); ES rung convicted at 3.27 SE without Methods' "deliberately not tuned" caveat; a sub-attainable-band tally Methods promises and §4.4 never reports; ACI clamp asymmetry A 46 / G 339 unmentioned; §4.1 and §4.2.3 not reimplementable in-chapter; the margin motivated by a test-block observation; population never named. |

## Chapter 4 — Role B (Statistician)

**17 blocking, 14 advisory.** Selected:

| id | sev | finding |
|---|---|---|
| B11 | **blocking** | **`results.tex:46` maps fold counts to the wrong venues.** Venue order at L35-36 is BH, TRT, Ellel; "273, 260 and 205" therefore assigns TRT 260 and Ellel 205, while `tab:mcs` says TRT 205, Ellel 260. The HLN factors confirm the counts are right and only the mapping is wrong. **This is the `tab:mcs` ordering defect materialising as an actual error in prose.** |
| B1 | **blocking** | "The gate lowers the mean by $0.016$" — artefact gives 0.6578 − 0.6448 = **0.0130**. The stated figure is 23% high and coincides with the unrelated weather gap 0.0163. |
| B2 | **blocking** | The occurrence gate rides on `rung1_robust_dow` (0.6578), not the venue's served `chronos2_exo` (0.5862). A null against a base 12% worse than the served model is a weaker claim than the text implies; the base model is never named. |
| B5 | **blocking** | "all thirty-one paired differences" — the generator emits **37**. |
| B7 | **blocking** | No single denominator produces the quoted (8 FP, 124 FN, precision 0.871) triple. Corroborates A4. |
| B10 | **blocking** | "each venue's direction of miscalibration is a property of the construction rather than of the level chosen" is refuted by its own sentence: Ellel is under at 0.80 (0.791) and over at 0.90 (0.914). |
| B12 | **blocking** | Ellel's gate winner "0.572" carries a MASE label; no MASE exists for Ellel in any artefact (`basis: unscaled`, `loss: mae`). Every other Ellel figure in the chapter is in pounds. |
| B13 | **blocking** | "The remaining exclusions are between weather arms at Ellel" — TRT O−H also excludes zero, −0.0028 [−0.00508, −0.00061]. Four exclusions, not three, one at an unnamed venue. |
| B14 | **blocking** | "all four beat the no-weather arm in the same direction" / "consistently signed" are **Beer-Hall-only**. Ellel N = 110.85 beats O, F and M. |
| B15, B16, B25, B26 | **blocking** | Four floats carry no uncertainty at all: `tab:weather` (15 point estimates, no interval AND no n), `tab:exchangeability` (the entire exchangeability verdict rests on 0.554 vs 0.500 with no test), `tab:vuspr` (7 cells, three on 36 windows), `tab:intermittency` (the BH reclassification turns on 1.3267 against a 1.3333 boundary — a 0.0067 gap with no dispersion). |
| B17 | **blocking** | The venue-total $p = 0.047$ is 1 of **41 uncorrected** one-sample $t$-tests. BH critical value ≤ 0.0268, Bonferroni 0.00122 — it survives no correction, and "The venue total is among them" is uncorrected-only. |
| B9 | **blocking** | "pays with a band seven per cent wider" is the most expensive point in the sweep reaching that coverage; W=240 reaches identical coverage at **+0.5%**. |
| B22 | advisory | "$1.8$ paired standard errors" against an interval implying **1.61**. The two figures are 100 lines apart and disagree. |
| B27 | advisory | Independently reaches X2's correct resolution. |

**Uncertainty by float:** `tab:coverage` **passes** (Clopper–Pearson, 95%, all six limbs reproduce,
and it correctly flags overlapping origins as making the limbs optimistic — rare and exemplary).
`tab:mcs` and `tab:group` adequate. `tab:weather`, `tab:exchangeability`, `tab:vuspr`,
`tab:intermittency` **fail**. `tab:winkler` partial (paired CIs exist in the artefact, unused).

## Chapter 5 — Role A (Methodologist), a REPLICATION

**Seven blocking findings on a chapter that had already passed a proper independent three-role
loop with two iterations.** Beyond X1 and X2:

| id | sev | finding |
|---|---|---|
| A1 | **blocking** | "the weather effect is consistently signed" is stated of the estate; it is a Beer Hall property. N−arm is +0.0140/+0.0144/+0.0145/+0.0163 at BH but −0.0248/+0.0746/−0.1618/−0.1452 at Ellel. Converges with Role B/Ch4 B14 from a different chapter. |
| A3 | **blocking** | The 6.2 pairing factor's defence against overlapping origins assumes a dependence correction "cancels in their ratio". That holds only if the differential and the marginal series carry the same serial dependence — generally false. Lag-1 on the differential is **0.811**; no ACF exists for either marginal. §5.3's whole answer rests on it. |
| A4 | **blocking** | The functional-pair ablation WAS run (`log/66`, `functional_pair.json`) and is cited in Ch5 only for its two failed predictions. Its supporting half (the swap removes ~2/3 of the BH bias, +67.67 → +24.65) reaches neither chapter. |
| A5 | **blocking** | "exchangeability measured to fail at two venues" — the named instrument is rank uniformity, where Ellel's 0.554 equals the Beer Hall's 0.554 (active-only: Ellel 0.5567 vs BH 0.5263). "Two venues" is inherited from a different instrument. |
| A7 | **blocking** | Post-hoc headline designation (`headline_designation_changed_post_hoc = true`) is defended by an argument the same chapter reports as two-of-five falsified. Changes Ellel's set size by two entrants. |
| A8–A20 | advisory | Thirteen more, incl. two mutually exclusive statements about rater counts (A18) and a "one contrast excludes zero" that understates the pooling result (A20). |

## Chapter 5 — Role B (Statistician), a REPLICATION

**52 restated quantities traced cell by cell: 44 match, 6 fail, 2 partial.** Beyond X1/X2:

| id | sev | finding |
|---|---|---|
| B7 | **blocking** | Ch5 reports a **second** regime-dependent verdict Ch4 omits entirely: pooled split conformal 0.209 → 1.000, "displacing the incumbent as the surviving arm and appearing as an adoption candidate". `log/78:118` calls it the most consequential thing in that session. A Discussion may not be the first place a reader learns a served-band change is recommended under one library. |
| B4 | **blocking** | The BH baseline's retention is printed as $p = 0.10$; the artefact says **0.103**. Rounded, it sits ON α = 0.10 and no longer supports the sentence's own retention claim. Appears nowhere in Ch4. |
| B6 | **blocking** | The 340-figure audit's parts sum to **337**. `numbers_audit.md` has a fifth category (3 split verdicts) the sentence drops — in the paragraph whose subject is numerical rigour. |
| B3 | **blocking** | The 0.004 coverage movement is attributed to `tab:coverage` and `tab:winkler`; it is an arm-A, level-0.80 figure, and `tab:coverage` reports arm D at 0.90 with no movement. |
| B5 | **blocking** | Ch5's recall 0.807 is correct; Ch4 carries both 0.807 and 0.804. |
| A1–A14 | advisory | incl. the 6.2 factor generalised from one venue when the artefact carries 5.5 and 8.3 for the others; "two failed" where `log/66` says "failed **in part**" — self-criticism overstated, which is still drift. |

**Clean and worth recording:** every interval-bearing quantity is carried across with its interval
save two; the paired design is correctly used and its optimism disclosed twice; multiplicity is
handled; no significant-but-tiny effect is oversold — `:70` and `:274` actively refuse to promote
a marginal exclusion.

## Both chapters — Role C (four remaining bullets)

Verb strength had **never** been run on either chapter. Twelve findings; five blocking:

| id | sev | finding |
|---|---|---|
| V4 | **blocking** | "\citet{lu_proactive_2024} **establish that the characteristic failure** of a proactive agent is over-offering" — the same source is reported correctly 46 lines later as "**find** … at false-alarm rates above half". Promotes a measured rate in one study into a class property, and it is the sole warrant for rejecting recall as a selection criterion. **This is the "concede"-calibre case.** |
| V2 | **blocking** | **[VERIFIED]** "What the comparison **establishes** is … that fitting the amount model on trading days only **does not pay** here". Both arms retained (p = 1.0 / 0.394) AND the point estimate runs the other way — gated 0.6448 beats ungated 0.6578. A direction asserted against the artefact. |
| V1 | **blocking** | "the one the larger sample **vindicates**" — the set retains 5 of 9 with the baseline still inside. A set that does not separate cannot exonerate. |
| V3 | **blocking** | "**removed** by the same correction at both" — at TRT the drift merely ceases to be significant. Reads a non-rejection as a positive result, which the chapter forbids at L465-466. |
| V5 | **blocking** | "**would have inflated** the grouped arms into an apparent win" — no arm was ever run with an oversized batch. The counterfactual is asserted, and the guard's justification rests on it. |
| V10 | advisory | The one finding in the **opposite** direction: `discussion.tex:108` is *too weak*, discarding a corroborated ordering (7 of 7 cells, near-threshold cells reproducing it) for want of an interval. |

**Clean:** the chapters get several hard cases right, and these set the internal standard the
failures are measured against — refusing to call Ellel "calibrated" on a non-rejection; letting
the set govern over a marginal pairwise exclusion; reading a wide set as a statement about the
data. Citation placement is broadly clean (13 citations across four of five sections in Ch4);
gaps are §4.3 and §5.3.

## Both chapters — §4 gate, T1–T14

| | Ch4 | Ch5 |
|---|---|---|
| **Blocking failures** | **T1, T2, T3** | none |
| Advisory failures | T12 (n/a), T13, T14 | T12, T13 |
| Not runnable | T8 (no NotebookLM this pass) | T8 |

- **T1 — the load-bearing test — FAILS on Ch4. [VERIFIED]** `results.tex:825` gives recall 0.804 /
  precision 0.871; the file its own `% Trace:` names records **0.807 / 0.872**; and
  `results.tex:774` says 0.807. Six untraced numeric regions besides.
- **T2** fails on five comparison claims. Notably the VUS-PR ordering, where Ch5 already carries
  the correct non-separation sentence and Ch4 asserts the ordering without it.
- **T3** fails: of eight floats only `tab:coverage` carries a 95% interval; `tab:group` carries
  **90%**. The document mixes two nominal levels without stating why.
- **T7 PASSES.** The `---` in `tab:group` is structurally undefined, not a placeholder — the
  caption says so ("Two River Taps has no G2 cell"). A pre-audit suspicion, correctly dismissed.
- **T9 passes**, but `montero-manso_principles_2021` is defined **twice** (`ref.bib:105`,
  `ref_additions.bib:18`). **[VERIFIED]**

### Outside the two chapters, and outranking most of what is inside them

**`abstract.tex` is unfilled template text, in bold, on `origin/main`: [VERIFIED]**

> **This is the beginning of the abstract that according to the regulations should not be any
> longer than 300 words. See point 9 in appendix 2 of the regulations \url{https://bit.ly/2Q4H43I}.**

`ds-writing` §5: *"The most important section, alongside the discussion."* It has survived every
push and two verified fresh-clone compiles, because a compile checks that a document builds and
not that a section was written. No instrument in this project asks the latter.

---

## What this run establishes about the roles themselves — for SKILL.md §8

§8 requires the first use to be treated as a trial with what the roles missed recorded. That debt
has stood through three uses (`phase_state.md:173-175`, still "Unstarted"). This run discharges it,
and the evidence is unusually clean.

**1. The roles find what the invented rounds could not, and it is not a matter of diligence.**
Chapter 4's six rounds were thorough and did real work. They did not find a number contradicting
its own trace file, a per-venue oracle-tuned column, a sweep quoted at three different settings, a
41-way uncorrected multiplicity, or four floats with no uncertainty. Those are Role A's and Role
B's dimensions, and nothing else in the loop looks along them.

**2. The cause was the reference, not reluctance — and the control case is clean.** In the same
8C-3 session, the two roles specified *inline* in the prompt were run correctly while the three
referenced by name were not. That isolates the failure to the reference. It is why the remedy is a
path in `PRJ93_RULES.md` and `05_paper_architecture.md` §8.1a rather than an exhortation.

**3. Independence is worth more than the roles' content.** 8C-4 measured it directly: seven
findings and zero blocking in one shared context, against 42 blocking across three independent
calls, on the same chapter and the same day.

**4. The roles are NOT idempotent, which was not predicted.** A second independent Role A returned
seven blocking findings on Chapter 5 *after* a correct three-role loop with two iterations had
already run on it. A completed critique loop is not a certificate; it lowers the yield of the next
pass without emptying it.

**5. Genuine disagreement is diagnostic, not noise.** X2 is the case: two roles proposed opposite
repairs, and adjudicating them located an ambiguity in the artefact schema that neither role's
remit covers and neither would have found alone. Had the synthesiser "compromised", the finding
would have vanished. §2's instruction to preserve disagreements earned its place here.

**6. What the roles did NOT catch — recorded so the next reader does not over-trust them.** Six
role calls and a fourteen-test gate, all pointed at two chapters, and the unwritten abstract was
found only because one call looked outside its remit. Scope a check narrowly and it will be clean
narrowly. The corollary is the standing rule: report what a check establishes **and what it does
not**, in the same breath.
