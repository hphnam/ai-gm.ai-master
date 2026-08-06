# Blocked on a third party — the retrieval point

**Status as of 2026-08-06.** Every conformance row that this project can close on its own
is closed. What remains is listed here, one row per blocker, with what unblocks it, what
already exists, and what to run the moment it does. Nothing below needs new design.

This file is the single retrieval point. A future session should read it before planning
anything, and should not re-derive the blocked list from `literature_conformance.md`,
which records history rather than state.

Related: `brain/PRJ93_RULES.md` (invariants), `brain/log/Decision_and_Resolution_Log.md`
(rows 1–100), `brain/ledger/literature_conformance.md` §14–§17.

---

## A · Blocked on an Anthropic API key

The key gates three rows. One key unblocks all three, and they share an apparatus.

### D-U1 — expected calibration error on the agent's output

- **Blocker** `ANTHROPIC_API_KEY`, no other dependency.
- **Already exists** the ECE instrument is implemented and has never been run.
- **Why it matters** `sec:rw-evaluation` names ECE as the instrument that carries a
  coverage guarantee through from the band to what the agent says. Without it the chain
  from calibrated interval to calibrated statement is asserted rather than measured.
- **On unblock** run the ECE pass over a response cache, then write the result into the
  results chapter beside the coverage section.

### D-U4 — judge validation

- **Blocker** the key **and** Elliot. Both, not either.
- **Already exists** the judging apparatus, frozen.
- **Note** the human limb is the harder one. One rater is currently the author, which is
  disclosed in `sec:conclusion-limitations` as a threat to internal validity rather than
  mitigated. A second rater changes what can be claimed.

### D-U7 — leg two of the contribution

- **Blocker** the key.
- **Why it matters** this is the largest single gap between what the dissertation set out
  to do and what it reports, and `sec:res-agent` says so plainly. The intervention layer
  is built, frozen and unmeasured.
- **On unblock** three of the four terms of the objective compute as soon as a response
  cache exists. Only the operator-judgement term needs Elliot as well.

---

## B · Blocked on Elliot (the operator)

### D-U2 — the surfacing cost ratio

- **Blocker** one elicitation: the relative cost of a false alarm against a miss.
- **Already exists** `sec:res-costsweep` reports a sweep over $\beta$ and selects no
  operating point from it.
- **Watch for** the sweep is degenerate for a second and independent reason, and that
  reason is a result rather than a gap: the detector produces 8 false alarms against 124
  misses, which inverts the failure mode `lu_proactive_2024` documents. An elicited ratio
  would be pushed the opposite way to the one the literature guards against. Do not quietly
  drop that point when the number arrives.

### D-U3 — the Ellel booking diary  **(now the highest-value of the blocked rows)**

- **Blocker** the diary itself. `ELLEL_DIARY_LIVE = False`.
- **Already exists** the module, written so the circular substitute (deriving occurrence
  from Ellel's own trading history) is unreachable by any code path. A test asserts it.
- **Why it is now the highest value** `log/74` measured its cost. 1037 of Ellel's 1300
  calendar-open days did not trade; that venue's entire residual drift sits on those days
  and none of it on the 263 days it traded; and on them the residual equals the forecast by
  identity. The missing diary is not a gap in a covariate. It is the whole of one venue's
  exchangeability violation, and it is the Ellel half of the partition defect that the Beer
  Hall shows in the opposite direction.
- **On unblock** re-run `eval/exchangeability_diagnostic.py` with the diary live. The
  prediction is specific and falsifiable: the false-open rate collapses, and with it the
  `drift_false_open_only` statistic (currently $\rho = +0.367$, $p = 1.9\times10^{-34}$ on
  $n = 1037$). If it does not, the account in `log/74` §5 is wrong.

### D-U5 — compliance and reliance

- **Blocker** Elliot.
- **Note** an observational limb, not a run.

---

## C · Blocked on a vendor account

### D-D5 residue — TabPFN-TS as a ladder rung

- **Blocker** two of them, and the second does not yield to a credential. Re-verified
  2026-08-06 against `grinsztajn_tabpfn-3_2026` and the two PriorLabs repositories.
- **Hard constraint 1, do not work around** the library's default entry point still
  transmits the series to a hosted service ("uses the cloud client by default"). The
  estate's revenue data must not leave the machine, which is why `CLIENT` mode was
  refused outright. A token is only useful with a local-weights path.
- **Hard constraint 2, NEW and larger** the current weights carry a licence permitting
  "testing, evaluation, and internal benchmarking" and prohibiting commercial or
  production use, naming **"using model outputs as inputs to internal commercial
  decision-making"** among the prohibitions. This estate is a trading business with an
  operating decision layer. So **evaluating the rung is licensed and serving it is not**,
  on terms no credential or compute changes. Do not let a future session record this row
  as "unblocked by an env var" again.
- **Which backend to pin, if it is ever run** the version `hoo_tables_2026` describes and
  benchmarks is the earlier one, distributed permissively. The library's current default
  is a later checkpoint requiring an account. Running the later one and citing that paper
  would be citing a paper for a model it does not evaluate.
- **Not the blocker** compute. `kaas_probabilistic_2026` measures 1607.9 ms per forecast,
  which at this estate's 738 origins is tens of minutes. `log/75` ran a probe of
  comparable cost to completion. Do not let the write-up leave that explanation open.
- **Already exists** the evaluator is committed, pre-registered, and runs unchanged.
- **Why it matters twice** it is the one candidate surveyed that exposes a genuine
  predictive mean, so it bears directly on the median-under-a-mean's-name limitation as
  well as on the ladder.
- **Adding it now is not free** a new entrant after the fact re-opens model selection and
  needs its own pre-registered gate under the commit-ordering discipline.

---

## D · Not blocked, and deliberately not done

### D-U8 — clarification urgency by what is missing

Declared out of scope at five weeks. That declaration stands and is recorded in
`sec:further-work` as the smallest of the seven extensions. It is a scope decision, not a
blocked row, and a future session should not treat it as work waiting to be picked up
unless Phuong reopens it.

---

## E · Three Further Work items that are gated rather than blocked

All three are changes to a **served artefact**, so none can be executed inside this
dissertation without its own pre-registered gate. None is waiting on a person.

1. **Mondrian groups from observed trading rather than the weekday.** Repairs both
   directions of the partition defect: the Beer Hall's 94 of 546 calendar-closed days that
   traded, and Ellel's 1037 of 1300 calendar-open days that did not. Cheapest and best
   evidenced of the eight extensions.
2. **A per-venue windowed calibration pool.** Measured, not assumed. It brings Two River
   Taps from 0.963 to 0.909 while narrowing the band, recovers about a quarter of the Beer
   Hall shortfall at 7 per cent width, and moves Ellel away from nominal. What it needs is a
   rule for setting the length fixed before the coverage it is tuned against is seen.
3. **A native model interval against a conformal one** (`log/75` §5). Chronos-2's own 90
   per cent interval covers 0.9178 at the Beer Hall where the served band covers 0.871.
   That identifies NOTHING as it stands, because point model, band construction and the
   presence of a calibration layer all differ at once. Holding the point model fixed and
   varying only the interval source would identify it.

---

## F · State to carry forward

| Quantity | Value |
|---|---|
| SHOULD-FIX conformance rows | 0 |
| Unadjudicated contradictions | 0 |
| Open rows not blocked on a third party | **0** |
| DIVERGES — UNRESOLVED rows | 7, every one listed above |
| Dangling cross-references across the four chapter files | 0 |
| Latest Overleaf commit at time of writing | `9174a2d` |

---

## G · Manual step the agent cannot do — Zotero is local-only

`zotero_update_item` fails with "Cannot perform write operations in local-only mode."
Two records are wrong at source and were fixed in `ref.bib` only, so **a re-export from
Zotero will clobber both fixes**:

| Item | What is wrong | Correct value |
|---|---|---|
| `K73XDLEQ` (Ye et al.) | title truncated to "…Its Strengths and…", **no date** → renders "Ye et al., n.d." | Title ends "…and Extending Its Capabilities"; arXiv 2502.17361; v2 dated 2025-06-11; BBT key `ye_closer_2025` |
| Hoo et al. | arXiv id 2501.02945 is the Jan-2025 first posting; cited content is v4 | Keep the id, keep the 2026-01-26 date; the `note` field in ref.bib records the version |
| `judd_forecasting_2025` | **Not in Zotero at all.** Added to ref.bib and NotebookLM only | Judd, Mylona, Liu, Hogg, Butler, *J. Applied Statistics* 53(2) 372–390, doi 10.1080/02664763.2025.2519136, CC BY 4.0 |

To enable agent writes later, set `ZOTERO_API_KEY` and `ZOTERO_LIBRARY_ID` for hybrid mode.

### Two papers deliberately NOT cited, so they are not rediscovered

Both are on-topic for the weather channel and both are **closed access with no repository
full text** (OpenAlex `any_repository_has_fulltext: false`), so neither can enter NotebookLM
and the no-claim-without-a-NotebookLM-query rule forbids citing them from an abstract:

- Bujisic, Bogicevic, Parsa, *The effect of weather factors on restaurant sales*,
  J. Foodservice Business Research 20(3) 350–370, doi `10.1080/15378020.2016.1209723`.
- Badorf and Hoberg, *The impact of daily weather on retail sales*,
  J. Retailing and Consumer Services 52:101921, doi `10.1016/j.jretconser.2019.101921`.

If institutional access appears, these are worth adding: they are the two daily-resolution
weather-and-sales studies the hospitality argument currently lacks.
