# PRJ93 G12.13 Canonical Reconciliation Report

Reconcile the delivered G12.13 two-pass June confrontation against the canonical
specs (`PRJ93_Spec_G12_13a_Pass1_Freeze.md` and
`PRJ93_Spec_G12_13b_Pass2_Confront.md`), provided AFTER the work was first run from
the Pass-1 references embedded in the Pass-2 spec. Both passes are already conducted
and committed:

- **Pass 1 (G12.13a):** commit `1d966be`, report `21_G12_13a_Frozen_Forecast_Report.md`.
- **Pass 2 (G12.13b):** commit `c1b11d6`, report `22_G12_13b_June_Simulation_Report.md`.

This report maps both to the canonical acceptance criteria, CLOSES the one genuine
gap (the measured A-vs-B L2/L3 split, A13a.3), records the provenance the canonical
Stage 1 asks for, adds the human-readable frozen artefact, and logs every deviation.

## Pre-registration integrity constraint (why nothing was re-frozen)

June actuals were seen in Pass 2. Re-freezing a "blind" Pass-1 forecast now would be
post-hoc and inadmissible. The frozen artefact committed at `1d966be` is the valid
pre-registration and STANDS unchanged. Everything added here is either a blind
pre-June analysis (the A-vs-B measurement uses only data `< test_start`, all before
2026-05-31) or a rendering of the already-committed forecast (`.md`). No forecast
was regenerated.

## Starting-state provenance (canonical A13a.1)

Recorded now, pinned from history:

- Pre-Pass-1 HEAD (the commit the freeze built on): `00fa5be` ("docs(brain):
  reconcile decision log ... + G12.12 go-live STOP report").
- Store ceiling at freeze time: Beer Hall 2026-05-31, Ellel 2026-05-22, Two River
  Taps 2026-05-08 (no June in any venue).
- Seed manifest `brain/store/manifest.json` sha256:
  `52856a7f63036eb8838e079a11f7ec76f0dd3457cdc99e6af31313001ed79026`.

## The measured A-vs-B L2/L3 split (canonical A13a.3, now closed)

The canonical Stage 3 requires the L2/L3 method to be MEASURED (Candidate A
MinT-with-gate-winner-top vs Candidate B forecast-proportion disaggregation), not
assumed. Pass 1 froze disaggregation uniformly and DEFERRED the measurement. It is
now run (`sim/ab_split_measured.py`), blind on the pre-June held-out block
(2026-04-05 to 2026-05-31), scoring held-out L3 item revenue MASE:

| Venue | A (MinT) L3 MASE | B (disaggregation) L3 MASE | Measured winner | Frozen used | Match |
|---|---|---|---|---|---|
| beer_hall | 0.662 | 0.734 | A (MinT) | B (disaggregation) | NO |
| two_river_taps | 0.810 | 0.910 | A (MinT) | B (disaggregation) | NO |
| ellel | 0.746 | 0.730 | B (disaggregation) | B (disaggregation) | YES |

Finding: uniform disaggregation was the measured winner only for Ellel; MinT (with
the gate-winner L1 top and DOW-median L2/L3 bases) would have given a lower held-out
L3 item MASE for Beer Hall and Two River Taps (about 10% lower each). The frozen
artefact therefore used a sub-optimal L2/L3 method for two of three venues by the
measured criterion. This does NOT touch the served number: the venue total stays
pure L1 either way (both candidates only redistribute within the total, and the
served top is never reconciled downward). Because the artefact cannot be re-frozen
after actuals, the correction is a forward recommendation, not a retro edit: the
real go-live re-freeze (once Neon supplies June) should serve MinT for Beer Hall and
Two River Taps and disaggregation for Ellel, per this measurement. Result persisted
to `sim/june2026_ab_split_result.json`.

## Added artefact: human-readable reasoned forecast (canonical A13a.4 / Stage 4)

The canonical Stage 4 names `brain/sim/june2026_forecast_frozen.md`. Pass 1 wrote
the `.parquet` + `.json` (with per-day reasons and per-venue expectation notes in
JSON) but not the `.md`. It is now rendered from the committed artefact
(`sim/render_frozen_md.py`, no regeneration): per venue, the 30 June L1 rows with
point, band, and reason, plus the plain-language "what the brain expects for June
and why" note. This is a rendering of what was already frozen, so pre-registration
is preserved.

## Acceptance mapping against the canonical specs

### Pass 1 (G12.13a)

| Check | Status |
|---|---|
| A13a.1 | PASS (now complete). Ceiling <= 2026-05-31 confirmed, no June in any venue; starting SHA `00fa5be` and manifest sha256 recorded here (was missing from report 21). |
| A13a.2 | PASS. L1 served pure per venue; native 30-day horizon (`prediction_length=30` for Chronos-2); horizon and band-extrapolation caveats stated; June `wc_*` fire on the real fixture dates (17/23/27 Jun); raise-never-impute holds (`chronos2_exo_predict` raises on any NaN). |
| A13a.3 | PARTIAL (measured, not re-frozen). The A-vs-B split is now MEASURED (above); the frozen artefact used disaggregation uniformly, which matches the measured winner only for Ellel. Coherence held at freeze (L2 sums to L1 exactly, L3 to L2). Cannot re-freeze post-actuals; forward recommendation recorded. |
| A13a.4 | PASS (now complete). Per-day reasons + per-venue expectation notes existed in the `.json`; the named `.md` is now rendered. |
| A13a.5 | PASS. Frozen forecast committed non-gitignored (`1d966be`); SHA recorded; no actuals/MCP/Neon/watermark-advance in Pass 1. |

### Pass 2 (G12.13b)

| Check | Status |
|---|---|
| A13b.0 | PASS. Pass-1 commit `1d966be` (2026-07-09 22:41:58 +0100) proven via `git log` to predate the actuals refresh (22:46:48 +0100); frozen forecast loaded from the committed parquet. |
| A13b.1 | PASS. June actuals pulled held-out, ex-VAT, into eval files only; mode named (MCP-SIM); served store confirmed unmodified. |
| A13b.2 | PASS (L1 + L2). Frozen forecast scored vs actuals at L1 and L2; MASE compared to backtest with the horizon caveat; World Cup fixture effect measured on the three real England dates with the power caveat. L3-vs-actual not scored (item-taxonomy reconciliation deferred). |
| A13b.3 | PASS. Weekly-rolling view produced and labelled as using progressive actuals. |
| A13b.4 | PASS. Deviation, change-point, attribution, briefing, and stock all run via existing modules over June; nothing reimplemented. |
| A13b.5 | PASS. Both faces present; leak-free held; Pass-1 SHA cited; decision-log row 13 added. |

## Full deviation ledger (delivered vs canonical)

1. **Specs were provided after the fact.** Pass 1 first ran from the Pass-1
   references inside the G12.13b spec (operator-authorised); the standalone G12.13a
   spec arrived later. This reconciliation closes the resulting gaps.
2. **A-vs-B was deferred at freeze, measured retrospectively.** MinT would have won
   L2/L3 for Beer Hall and Two River Taps; the frozen disaggregation matches only
   Ellel. Forward recommendation recorded; artefact not re-frozen (post-actuals).
3. **Starting SHA + manifest hash were missing from report 21**, recorded here.
4. **The human-readable `.md` was missing at Pass 1**, rendered here from the
   committed artefact.
5. **Report filenames differ from the canonical literal names** (`21_G12_13a_Frozen_Forecast_Report.md`
   vs the spec's `21_G12_13a_June_Forecast_Frozen_Report.md`); the two-digit
   implementation-order convention (decision log Section C row 10) governs, and the
   committed history is left unrenamed.
6. **Mode MCP-SIM, not LIVE-NEON**; L1 actuals via the Square `SalesUK` aggregate,
   not per-order; L3-vs-actual not scored; briefing fatigue an upper bound;
   attribution over-verbosity flagged not fixed (all from report 22, restated).
7. **Weather beyond ~16 days is climatology; `is_ellel_event`=0 forward; L3 scoped
   to top-3 items/category + OTHER** (from report 21, restated).
8. **Two commits for the two passes, not one**, required by A13b.0 (the frozen
   forecast must provably predate the confrontation). This reconciliation is a third
   commit.

## Working-tree note

During this reconciliation the working tree had reverted several already-committed
G12.13 files (the 21/22 reports, three `sim/*.py`, one eval JSON, and the decision
log rows 12/13 plus README index 21/22), a sync/stash artefact. All were restored
from the committed HEAD `c1b11d6` before proceeding; no committed content was lost.

## Bottom line

Both passes were conducted and stand as committed. Against the canonical specs, the
substantive open item was the measured A-vs-B L2/L3 split: now run, it shows MinT
would have bettered the frozen disaggregation for Beer Hall and Two River Taps
(Ellel already matched), a forward fix for the real go-live re-freeze, with no
effect on the served pure-L1 top. Provenance and the human-readable reasoned
forecast are added. The pre-registration is intact: the frozen forecast was never
re-generated after reality was seen.
