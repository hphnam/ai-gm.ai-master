# 27 - G12.17b (Pass 2 of 2): confront July reality, test in-context learning, run the brain

Spec: `PRJ93_Spec_G12_17b_July_Pass2.md`. Branch `brain-construction`, `.venv-forecast`.
Pulls the real 1 to 7 July 2026 actuals as held-out ground truth, scores the frozen
July forecast pre-registered in Pass 1, runs the in-context-learning test and the
drift-vs-model decomposition the June work set up, and runs the full brain over July.
Read-only with respect to the served store: July actuals are evaluation data only.

Committed under Nam only.

## Precondition (hard gate)

Pass-1 commit **7d103aaa** ("PRJ93 G12.17a (Pass 1): advance to end-June ...") added
`sim/july2026_forecast_frozen.*` at 2026-07-10 03:29:43 +0100, before any July actual
was pulled (the first July SalesUK pull's `lastRefreshTime` is 02:30 UTC and was
fetched in this pass, after the commit). The forecast is loaded from the committed
artefact, never regenerated. Admissible pre-registration.

## Actuals source and mode

MCP-SIM via the Square connector (Neon not provisioned): July 1 to 7 daily L1
(SalesUK, ex-VAT `net_sales_minus_auto_gratuity`), L2 category and L3 item
(ProductMix item grain), landed held-out in `sim/july2026_actuals_{l1,l2,l3}_raw.json`
and never written to the served store. Item-sum reconciles to SalesUK within GBP 0.00
(Ellel) and GBP 29 over the week (Beer Hall, the ProductMix-vs-SalesUK gap). MCP-SIM
is a labelled stand-in for Ryan's production `NeonAdapter`, not the production path.

---

## Manager's-eye narrative, 1 to 7 July

- **Beer Hall had a solid, fixture-led week.** The brain expected about GBP 3,900 and
  a mid-week lift on Wednesday 1 July for the England v DR Congo match; the week came
  in at GBP 4,394, with 1 July at GBP 747 (well above a normal Wednesday of about GBP
  300) and the Friday the strongest day (GBP 1,036). The forecast called the shape of
  the week and the fixture direction; it under-called the totals a little. Nothing was
  a crisis: no day fell outside the expected range, so the briefing stayed quiet.
- **Ellel ticked over as a booking venue**, GBP 445 across two trading days
  (2 and 4 July), against a near-zero blind expectation (the brain does not know a
  booking is coming; is_ellel_event is 0 forward).
- **Two River Taps stayed dark, and the brain now says so once, quietly.** It is
  dormant, so it was not forecast and did not raise a single closed-venue alarm, in
  contrast to the June run's six repeated downward-deviation flags. Its closure is one
  standing "continuing" line, not daily noise.

## Evaluation face

### Stage 1: accuracy vs the backtest (all levels, refreshed taxonomy)

| venue | level | July actual | July frozen | MASE | band cover | backtest MASE |
|---|---|---|---|---|---|---|
| beer_hall | L1 | GBP 4,394 | GBP 3,917 | **0.386** | 1.00 | 0.745 |
| ellel | L1 | GBP 445 | GBP 56 | 0.070 | 1.00 | 0.572 |
| beer_hall | L3 (all-node median) | | | 0.723 | | |
| ellel | L3 (all-node median) | | | 0.080 | | |

L2 category-total MAE: Beer Hall GBP 154, Ellel GBP 82. The 7-day horizon lands the
Beer Hall L1 at MASE 0.39, comfortably inside the 0.745 backtest class and far better
than June's 30-day cold 1.64: the reliable-horizon claim holds. Band coverage is 1.00
(wide bands over 7 days; not a tight-interval claim). Two River Taps produced no
positive July forecast and no July actual: the liveness gate's direct fix of June's
GBP 5,329-vs-0 miss, confirmed against reality.

### Stage 2: the in-context-learning test (1 Jul, single case)

| | date | frozen | DOW-median baseline | actual | anticipated above baseline |
|---|---|---|---|---|---|
| July first in-hours England fixture | 2026-07-01 | GBP 487 | GBP 296 | GBP 747 | **yes (+GBP 191)** |
| June first in-hours England fixture (report 22) | 2026-06-17 | GBP 300 | GBP 289 | GBP 607 | no (sat at baseline) |

The July forecast lifted its 1 July point GBP 191 ABOVE the Wednesday baseline in
anticipation of the fixture; June's first in-hours fixture forecast sat on the
baseline and under-shot the uplift entirely. Mechanism: the Beer Hall Chronos-exo
model carries `wc_england_in_hours` as a covariate, but in June's pre-June training
there were no prior World Cup fixtures to learn its effect from (the tournament was
novel); by the July freeze, June's fixture days are in training, so the model has
learned the in-hours-England effect and applies it forward. That is the in-context
signal: June taught the model the fixture lift, and July acted on it.

Honesty boundary (mandatory): this rests on ONE in-hours England date. It is a
single-case, directional result, not a significant effect; the forecast still
under-shot the magnitude (GBP 487 vs GBP 747). A proper in-context-learning claim
needs many fixture dates across venues and seasons. Reported as directional evidence
only.

### Stage 3: drift-vs-model decomposition (June stale taxonomy vs July refreshed)

| venue | June named share | July named share | jump | June L3 MASE median | July L3 MASE median |
|---|---|---|---|---|---|
| beer_hall | 26.4% | 30.0% | +3.6pp | 1.33 | 0.72 |
| ellel | 15.3% | 53.4% | **+38.1pp** | 0.24 | 0.08 |

Ellel's named-node revenue coverage more than tripled (15% to 53%) once the taxonomy
was refreshed, quantifying that most of its June L3 degradation was drift, not model
error. Beer Hall's jump is modest (+3.6pp): the refresh did add the branded LuneBrew
lines, but July also brought fresh sellers that fall to OTHER (the irreducible
new-item problem), and Beer Hall's menu churns faster. Caveat: the July L3 MASE
improvement over June conflates the refreshed taxonomy with the shorter 7-day horizon
(vs June's 30-day cold), so the clean drift signal is the named-coverage jump, not the
MASE drop alone. Named coverage does not reach 100% by design: new-in-July items have
no history and belong in OTHER.

### Stage 4: the full brain over July, with the persisted chain

Ran the existing detectors (deviation, change-point, `residual.attribute`) and the
briefing via the PERSISTED `briefing_runs` chain (build + persist per day), warmed up
over the last week of June so standing items are already "continuing" before July. Run
against a store COPY with July inserted; the served store was untouched (verified: its
max date stays 2026-06-29, zero July rows).

- **Real fatigue: 0 new briefing items across the whole July week**, per venue, with
  8 standing items all labelled continuing and suppressed from the new-item count.
  This is the real number the persisted chain gives, against report 22's per-day
  upper bound where every item looked new. A quiet, alarm-free week.
- **Two River Taps: no alarm spam.** Its closure is marked dormant by the briefing
  (closed-venue path) and rides as one continuing line; the raw deviation scan raised
  a single within-noise blip that never reached the feed, versus June's six repeated
  downward flags.
- **1 July did NOT surface as an anomaly**, and correctly so: at z = 0.78 the GBP 489
  lift over the Wednesday median is inside Beer Hall's normal day-to-day variability
  (its conformal scale is about GBP 630). The forecast anticipated the fixture
  (Stage 2) and the night was busy, but a busy-but-in-range night is forecastable
  structure, not a deviation worth a manager's alarm. The brain distinguishes the two:
  it planned for the fixture and did not cry wolf over a good night. Attribution for
  the fixture day names the England match in trading hours as a coincident factor
  (correlational, home-nation flag), never a cause.

## Deviations from the spec

1. **1 Jul does not surface as a briefing deviation** (the spec anticipated it might).
   Honest reason: it is within Beer Hall's high variance (z = 0.78), so the
   deviation-based briefing correctly does not raise it. This is the right behaviour,
   and it is reported plainly rather than forced.
2. **Store-durability incident (process note).** The June ingest into the served store
   is not durable across `warehouse.build()` (which rebuilds `line_items` from the
   May-only source parquet); a full `pytest` run mid-pass rebuilt the store and dropped
   June (weather tables, not rebuilt, survived). June was re-ingested and Stage 1 to 4
   were re-run June-inclusive; the numbers above are the June-inclusive results. The
   Pass-1 frozen artefact was built before the wipe and is unaffected. In production
   the `NeonAdapter` makes the advance durable; here the ingest must be re-applied
   after any store rebuild (noted for the July go-live).
3. **Report numbered 27** per the log index.

## Leak-free and provenance

July actuals live only in `sim/july2026_actuals_*.json`; the served store's max date
is 2026-06-29 with zero July rows (verified). Mode: MCP-SIM (labelled stand-in for the
production `NeonAdapter`), ex-VAT at 0.200. Pass-1 SHA 7d103aaa cited. The June frozen
artefact (`1d966be`) and `stock_inventory.py` are untouched.
