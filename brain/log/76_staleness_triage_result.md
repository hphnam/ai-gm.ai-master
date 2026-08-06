# 76 — Artefact staleness sweep (R0), triage pass

Run 2026-08-06 under `PRJ93_RULES.md`. Approved as R0 in the figure-programme gate
(`knowledge/07_figure_programme.md` §8).

**Part 1 below is the triage pass: nothing was regenerated and nothing was modified in it.
Part 2 is the regeneration and diff that followed, approved separately.** Where Part 1
predicts an outcome and Part 2 measures it, Part 2 is authoritative.

## 1 · Why the sweep was scoped as a triage rather than a blanket regeneration

R0 was approved as "regenerate every committed eval artefact against the restored warehouse
`1641dbc` and diff". That would have been hours of Chronos compute across 22 JSON and ~10
markdown artefacts.

It is unnecessary for most of them, because the staleness mechanism identified in
`log/57_G17m_Staleness_Sweep_And_G2.md` leaves a **readable signature**. From commit
`f8bcf1f`: `warehouse.build()` rebuilds from the committed CSV seed, which ends
**2026-05-31**, silently dropping the aggregate-ingested June and 1–7 July rows. Anything
generated against a restored-but-short store therefore carries a **2026-05-31 store ceiling**
instead of the true **2026-07-07**.

Most artefacts stamp `store_ceiling`. Reading the stamp is a complete test for that mechanism
and costs seconds. Regeneration is then needed only where the stamp is wrong or absent.

## 2 · Result — three tiers

### Tier 1 · Verified fresh — 20 of 22 JSON artefacts

Every one carries `store_ceiling = 2026-07-07`. **Not stale by the log/57 mechanism.**

`chronos2_covariate_probe` · `exchangeability_diagnostic` · `fold_vectors_L1_beer_hall` ·
`fold_vectors_L1_ellel` · `fold_vectors_L1_two_river_taps` · `group_icl_L1` ·
`group_icl_calibration` · `group_icl_mcs` · `injection_realism` · `interval_calibration_L1` ·
`interval_calibration_mcs` · `interval_calibration_power` · `interval_calibration_served_check` ·
`mcs_L1_results` · `native_interval_probe` · `scale_bootstrap_L1` · `weather_basis_L1` ·
`weather_basis_coverage` · `weather_basis_mcs` · `occurrence_gate_beer_hall` (ceiling only —
see Tier 2)

Corroborating stamps where present: `exchangeability_diagnostic` and `native_interval_probe`
both carry the full `provenance` block added by report 69 §4 (`.venv-forecast`, Python
3.12.13, Darwin arm64, device `mps`). `mcs_L1_results` carries `headline_loss = rmsse`,
confirming it is post-`log/71`. The three `fold_vectors` files carry the post-migration
bases — `calendar_lag7_active`, `calendar_lag7_active`, `unscaled` — confirming they are
post-`log/70`.

**File mtimes are not evidence here and were not used.** Many artefacts share an mtime of
2026-07-30 13:16, which is a checkout timestamp rather than a generation time. The
`store_ceiling` stamp is the reliable signal.

### Tier 2 · Verified STALE — 1 artefact

| Artefact | Defect | Affects |
|---|---|---|
| `eval/occurrence_gate_beer_hall.json` | `basis = "calendar_lag7"` — the **superseded** ruler | `tab:occurrence` (absorbed into prose, Results 4.2), RQ2 |

Its store ceiling is correct, so it is not stale by the log/57 mechanism. It is stale by a
**different and later** one: the Gate A ruler migration (`Decision_and_Resolution_Log.md`
row 87, executed in `log/70`) made `config.VENUE_SCALE_BASIS` the single authority, and the
ruled basis at the Beer Hall is `calendar_lag7_active`. This artefact predates that and was
not swept up by the `log/70` regeneration, which covered `fold_vectors`, the MCS and
`tab:ladder` but not the occurrence gate.

Committed values, on the superseded ruler: `mean_mase{gated: 0.7872, ungated: 0.8032}`,
`mcs_pvalue{gated: 1.0, ungated: 0.391}`, both arms retained in the 90 per cent set,
`n_folds = 273`, `base_model = rung1_robust_dow`, `block_len = 7`, `n_boot = 1000`.

**Expected effect of a re-run:** the Beer Hall ratio `calendar_lag7_active / calendar_lag7`
is 1.2417 on a pinned ruler (report 69 §3), so both means should fall by roughly 19 per cent
(0.805×) with the *ordering* preserved, since a denominator swap is rung-independent
(`log/70` §2). **The reported finding — both arms retained, so the gate does not separate
them — is not expected to move.** That must be verified, not assumed.

### Tier 3 · UNSTAMPED and therefore unverifiable — 8 artefacts

These carry **no `store_ceiling`, no `as_of`, and no generation stamp of any kind**. They
cannot be triaged. The only way to establish whether they are stale is to regenerate and diff.

| Artefact | Feeds | Float |
|---|---|---|
| `hierarchy/reconciliation_forecast.md` | 41-node unbiasedness, reconciled-band coverage, 16-node Croston/SBA contest | **`tab:recon-decomp`** (App E), Results 4.2 |
| `log/PRJ93_Agent_Eval_Report.md` | VUS-PR by kind × venue, cost sweep, sensitivity, latency, ranking | **`tab:vuspr`** (body 4.5), F6 |
| `conformal/conformal_L1_beer_hall.md` | Split-conformal coverage, width, Winkler, pinball; clamp counts | Results 4.4 |
| `conformal/conformal_L1_ellel.md` | as above | Results 4.4 |
| `conformal/conformal_L1_two_river_taps.md` | as above | Results 4.4 |
| `eval/functional_pair.json` | R9 minimal pair, paired absolute vs squared | Results 4.1 |
| `eval/metric_ordering.json` | Kendall/Spearman metric ordering, MCS set identity | Results 4.1 |
| `signals/chatlog_kb_gap.md` | 12 clusters by density | Results 4.5 (A17 deliverable) |

**This is the significant finding of the pass.** Report 69 §4 added provenance stamping to
`eval/interval_calibration.py` after report 3 found that artefact restating coverages under a
different library resolution while the code was untouched. That fix was never extended, and
the eight artefacts above are the ones it did not reach — including **the two sources behind
`tab:vuspr` and `tab:recon-decomp`**, one of which is a body float carrying a headline
detection result.

`log/57` reported that the three `conformal/conformal_L1_*.md` files were swept on 2026-08-01
(Beer Hall and Ellel stale, Two River Taps reproducing byte-for-byte). That sweep predates
the Gate A ruler migration, so its verdicts do not carry forward.

## 3 · One constraint from log/57 that no longer binds

`log/57` excluded `eval/chronos2_*.md` from its sweep as "blocked, no torch in this
environment". **That is no longer true.** Verified this pass:

| venv | Python | torch | chronos | matplotlib |
|---|---|---|---|---|
| `.venv-eval` | 3.12.13 | yes | yes | yes |
| `.venv-forecast` | 3.12.13 | yes | yes | no |
| `.venv-run` | 3.14.0 | no | no | no |
| `.venv-tabpfn` | 3.12.13 | yes | no | no |

`.venv-forecast` is the measurement venv used by `log/70`; `.venv-eval` is the figure venv.
The Chronos-dependent regenerations are runnable.

## 4 · What R0 actually costs, now that it is scoped

| Work | Artefacts | Cost | Model calls |
|---|---|---|---|
| Tier 2 re-run | `occurrence_gate_beer_hall` | Minutes | Chronos, small (single venue, 273 folds, one base model) |
| Tier 3 regenerate + diff | 8 artefacts | Hours, dominated by the conformal and agent-eval paths | Chronos for the conformal trio; **none** for the agent eval |
| Extend provenance stamping to all 8 | code change in 5 generators | Under an hour | none |

The blanket regeneration originally approved is **not** required: 20 of 22 JSON artefacts are
verified fresh against the mechanism R0 exists to catch, and re-running them would spend hours
to reproduce values whose freshness is already established by stamp.

## 5 · Verified end state of this pass

- Nothing regenerated, nothing modified, no artefact written.
- 22 JSON artefacts read; 20 verified at `store_ceiling = 2026-07-07`.
- 1 confirmed stale on a superseded basis (Tier 2).
- 8 artefacts confirmed to carry no provenance stamp (Tier 3).
- 4 virtual environments probed for regeneration capability.
- Store ceiling of record throughout: **2026-07-07**.

---

# PART 2 — Regeneration and diff, 2026-08-06

Approved tranching: body-float artefacts first, then the conformal trio, then the rest.
Provenance stamping applied **before** regeneration so new artefacts carry identity on their
first write, per the gate condition.

## 6 · Instrumentation — seven generators stamped

`provenance.py` already had both entry points (`runtime_stamp()` for JSON,
`stamp_lines()` for markdown); the generators simply never called them.

| Generator | Artefact | Stamp |
|---|---|---|
| `hierarchy/reconcile.py` | `reconciliation_forecast.md` | `stamp_lines()` |
| `conformal/wrap.py` | `conformal_L1_{venue}.md` ×3 | `stamp_lines()` |
| `eval/functional_pair.py` | `functional_pair.json` | `runtime_stamp()` |
| `eval/metric_ordering.py` | `metric_ordering.json` | `runtime_stamp()` |
| `signals/chatlog_kb_gap.py` | `chatlog_kb_gap.{md,json}` | both |
| `eval/agent_eval.py` | `PRJ93_Agent_Eval_Report.md` + **new** `agent_eval.json` | both |
| `eval/occurrence_gate.py` | `occurrence_gate_beer_hall.json` | `runtime_stamp()` |

**Value-neutrality, established two ways as required:**

1. **Determinism.** Two consecutive stamped runs of `metric_ordering` are identical on every
   computed value (provenance excluded). Instrumentation adds a key and changes nothing else.
2. **Exact reproduction.** Six of the eight regenerated artefacts reproduce their committed
   content byte-for-byte apart from the appended stamp. A stamp that altered a computed value
   could not produce that.

## 7 · Diff results

| Artefact | Verdict |
|---|---|
| `hierarchy/reconciliation_forecast.md` | **Reproduces exactly.** Not stale |
| `log/PRJ93_Agent_Eval_Report.md` | **Reproduces exactly.** Not stale |
| `conformal/conformal_L1_beer_hall.md` | **Reproduces exactly.** Not stale |
| `conformal/conformal_L1_ellel.md` | **Reproduces exactly.** Not stale |
| `conformal/conformal_L1_two_river_taps.md` | **Reproduces exactly.** Not stale |
| `signals/chatlog_kb_gap.{md,json}` | **Reproduces exactly.** Not stale |
| `eval/metric_ordering.json` | **STALE — every value moved.** See §8 |
| `eval/occurrence_gate_beer_hall.json` | **STALE — confirmed and corrected.** See §9 |
| `eval/functional_pair.json` | In flight at time of writing (~13 min run) |

`tab:recon-decomp` is additionally confirmed to be the **post-M2** artefact: the regenerated
run prints L2 @90% = **85.1%** and L3 @90% = **72.1%**, which are the post-correction figures
(`code_vs_paper` M2: category 77.6 → 85.1, item 77.6 → 72.1). **Blocker B6 is cleared.**

## 8 · `metric_ordering.json` — the second Gate A casualty

Same mechanism as the occurrence gate, and a second artefact `log/70` did not sweep: a
downstream consumer of the fold vectors, committed on the pre-Gate-A ruler.

**Attribution is exact.** New/old ratio ranges:

| venue | measure | ratio range |
|---|---|---|
| beer_hall | MASE | **0.8179–0.8190** |
| beer_hall | RMSSE | 0.9623–0.9638 |
| two_river_taps | MASE | **0.9297–0.9355** |
| two_river_taps | RMSSE | 0.9545–0.9583 |

The two MASE ranges are **identical to the figures `log/70` §2 published** for the ruler
migration. A rung-independent ratio is the signature of a denominator swap, not of changed
predictions.

**Every conclusion in `log/63` survives; every magnitude in it was wrong.** The correction is
appended to `log/63_R4_metric_ordering_result.md` rather than edited in. Summary: the winner
still changes under the two measures at both venues, the ordering is still not identical, both
90 per cent confidence sets are still identical under both losses, the Beer Hall flip is still
a coin-toss (gap 0.0001, was 0.0002), and Two River Taps' `rung2_ets` still falls from rank 1
under MASE to rank 4 under RMSSE. Two River Taps' rank correlations move to ρ = 0.833
(p = 5.27e-03) and τ = 0.667 (p = 1.27e-02); the Beer Hall's are unchanged.

## 9 · Tier 2 resolved — the occurrence gate, measured rather than predicted

`eval/occurrence_gate.py` carried a hard-coded `BASIS = "calendar_lag7"`. Now reads
`config.VENUE_SCALE_BASIS.get(VENUE, harness.REPORTED_BASIS)`, matching `models/ladder.py`.

| | committed (`calendar_lag7`) | re-run (`calendar_lag7_active`) | ratio |
|---|---|---|---|
| mean MASE, gated | 0.7872 | **0.6448** | 0.8191 |
| mean MASE, ungated | 0.8032 | **0.6578** | 0.8189 |
| MCS p, gated | 1.0 | 1.0 | — |
| MCS p, ungated | 0.391 | **0.394** | — |
| 90% MCS set | {gated, ungated} | **{gated, ungated}** | unchanged |

Both ratios fall inside `log/70` §2's 0.8179–0.8190 band, confirming the denominator swap.
**The reported finding does not move: both arms remain in the 90 per cent set, so the gate
still does not measurably help.** The prediction that it would not move was correct, and it
is now measured. Cross-check: the re-run's ungated mean (0.6578) equals
`metric_ordering`'s independently regenerated `beer_hall.mase.means.rung1_robust_dow`
(0.657805) — two separate paths agreeing on the ruled basis.

## 10 · A defect found by regenerating, not by auditing

The first agent-eval regeneration was run in `.venv-forecast`, which does **not** carry
TSB-AD. The script degraded gracefully instead of failing: it wrote *"VUS-PR: not computed,
dependency unavailable"* and **silently replaced the entire seven-cell `tab:vuspr` table**.
Every other number in the 272-line report was unaffected, so a diff that skimmed totals would
have passed it. Re-run in `.venv-eval` (TSB-AD 1.5) the table returns identical.

**The venv is part of an artefact's identity.** This is what the runtime stamp exists to make
visible, and it is the argument for stamping before regenerating rather than after.

A second, self-inflicted defect was caught and fixed in the same pass: with both the base and
the scaled report writers stamping, the scaled writer inherited the base's stamp through its
`split(_SCALED_MARKER)[0]` and stranded a second identity block mid-document at line 100.
`_write_scaled_report` now strips an inherited stamp. Verified: one stamp block, at the foot.

## 11 · Verified end state

- 7 generators stamped; all compile and import; determinism confirmed.
- 8 artefacts regenerated; **6 reproduce exactly**, **2 confirmed stale and corrected**.
- `eval/agent_eval.json` created — the detection family now has a machine-readable artefact.
- `agent_eval` output path corrected from the repo root to `brain/log/`.
- `eval/occurrence_gate.py` migrated off the hard-coded superseded ruler.
- Correction appended to `log/63`; addendum appended to `numbers_audit.md` covering
  `tab:exchangeability` and `tab:vuspr`.
- Blocker **B6 cleared** (`tab:recon-decomp` confirmed post-M2).
- Store ceiling throughout: **2026-07-07**. Runtime: `.venv-forecast` and `.venv-eval`,
  Python 3.12.13, Darwin arm64, device mps.

## 12 · `functional_pair.json` — reproduces exactly, but carries an unrelated inconsistency

Regenerated (760 s, `.venv-forecast`). **Identical to the committed artefact on every value**
apart from the new `provenance` block and `wall_clock_s`. Not stale. Its bases are already
the post-Gate-A ones (`calendar_lag7_active` / `unscaled` / `calendar_lag7_active`), which is
why it escaped the fate of `metric_ordering` and the occurrence gate.

**Separate finding, not staleness, flagged rather than chased.** It scores Ellel on
**266 origins**, where the ladder and the MCS use **260**. The figure reproduces across runs,
so it is a design difference rather than drift: `log/43_G17b_Fold_Count.md:55-59` establishes
that 266 is the origin count implied by Ellel's **untrimmed 392-row** calendar frame and 260
the count implied by the **386-row frame after `trim_to_active`**, the latter being what
`_load_feats` returns and what every other L1 package scores on. The six extra origins are
therefore built over the leading dead span (the 2025-06-08 mis-ring plus 2025-06-09 to
2025-06-13) that `trim_to_active` discards.

Whether that matters to the R9 minimal pair has not been established here. It bears on a
prose result in Results 4.1, not on any float in the figure programme, and it is recorded so
that a later session does not rediscover it as a staleness question. It is **not** the same
issue as the `tab:bases` frame annotation (`numbers_audit.md:108`, row 21), though both trace
to the same 392-against-386 distinction.
