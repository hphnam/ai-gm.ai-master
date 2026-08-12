# 82 — D6: why the spike cell is the weak cell (a reachability audit)

**Date:** 2026-08-13
**Phase:** 8D, ledger item D6 (`brain/ledger/exemplar_gap_analysis.md`) — case-level error
analysis.
**Instrument:** `brain/eval/spike_reachability.py` (`--self-test` green in both directions
before use, per PRJ93_RULES.md "an assertion nobody has seen fail is an assertion taken on
faith").
**Artefacts read:** `brain/eval/agent_eval.json` (N=644 injections, unchanged), the live
`brain.duckdb` store at ceiling 2026-07-07. **Nothing was re-run and no evaluation artefact
was rewritten.** The audit builds fold boundaries and counts days; it fits no model and
scores no injection.
**Output:** `brain/eval/spike_reachability.json`.

---

## 1. The claim this supersedes

`chapters/results.tex` §4.5.2 read:

> That weakness follows from the detector chosen: a cumulative-sum scheme accumulates
> evidence across observations, and a spike is the case that construction is worst at,
> offering one observation of evidence against a persistence gate that delays
> confirmation.

**That explanation cannot be the operative one.** `agent_eval.item_covers` (`brain/eval/agent_eval.py`:130–137)
sets `want_sources` for a `spike` truth to `{"deviation"}` alone. The change-point limb —
CUSUM and the 4-of-7 persistence gate — is excluded from spike scoring **by construction**,
so it never gets a vote on a spike in either direction. A property of CUSUM cannot explain a
number CUSUM does not enter.

The same passage also read *"reaching one at no venue"*. Ellel's spike curve reaches
**1.000** at magnitudes 3.0 and 4.0 (`agent_eval.json` → `detection.sensitivity.spike.ellel`).
Both are corrected in the same edit.

## 2. The operative cause, read out of the code

`agent_eval._signals_from_stream` (`agent_eval.py`:87) classifies

```python
tail = stream.tail(config.DEV_SCAN_WINDOW)
```

and nothing earlier. `config.DEV_SCAN_WINDOW = 14` **trading** days. So the deviation limb —
the only limb that can cover a spike — examines the last fourteen trading days of the
injected stream. A spike whose onset lies further back **is never looked at, at any
magnitude**.

The scaled corpus places spike onsets at three positions in the held-out window
(`config.EVAL_SCALED_ONSETS = ("early", "mid", "late")`, offsets 3, `n//2`, `n-4` per
`inject._position_offset`), across a 28-**calendar**-day horizon (`inject._HORIZON_DAYS`).
Whether a position is examined therefore depends on how many trading days that calendar
window holds, which differs per venue.

## 3. Measurement

`spike_reachability.py`, live store, 2026-08-13:

```
scanned 8 folds across 3 venues; DEV_SCAN_WINDOW=14 trading days
venue            folds   inj unreach  ceiling  observed
beer_hall            4   144      48    0.667     0.667
two_river_taps       3   108      36    0.667     0.667
ellel                1    36       0    1.000     1.000
VERDICT: PASS - predicted ceilings match the observed plateaux
```

Per fold (test-window length in trading days → first examined index → onset indices):

| Venue | Folds | Test trading days | First examined | early / mid / late | Reachable |
|---|---|---|---|---|---|
| Beer Hall | 4 | 20, 20, 20, 20 | 6 | 3 / 10 / 16 | mid, late |
| Two River Taps | 3 | 28, 28, 25 | 14, 14, 11 | 3 / 14 / 24 and 3 / 12 / 21 | mid, late |
| Ellel | 1 | 4 | 0 | 3 / 2 / 0 | all three |

## 4. Both directions, which is what promotes this from a guess

The hypothesis is not merely consistent with the broken cases; it **discriminates**, and the
tool fails itself if it does not. It predicts three ceilings before looking at the
sensitivity curve — 2/3 at the Beer Hall, 2/3 at Two River Taps, **1 at Ellel** — and Ellel
is the clean case: its held-out window holds only four trading days, so the fourteen-day
scanner covers all of it and every onset is examined. All three predictions are met exactly.
A hypothesis returning the same ceiling everywhere would have been fitted to the target
rather than tested against it; `spike_reachability.py` fails the run when the predicted
ceilings do not discriminate.

## 5. The decomposition, and the arithmetic that closes it

Of 288 spike injections, **84 are unreachable** (onset `early`, at the two venues whose test
window is longer than the scanner) and 204 are reachable.

| Quantity | Value | Source |
|---|---|---|
| spike injections | 288 | `agent_eval.json` `detection.by_kind.spike.n` |
| caught | 165 | same, `.caught` |
| missed | 123 | same, `.missed` |
| unreachable at any magnitude | **84** | this audit |
| reachable but missed | **39** | 204 − 165 |
| 84 + 39 | **123** | equals the reported miss count exactly |

The decomposition closes on the reported total without slack, which is the check on it.
Spike recall over the population the detector actually examined is **165/204 = 0.809**,
against the 0.573 reported over all injections. Both are true of different populations and
the population is named in each case. Estate-wide, 84 of the 124 misses — **just over two
thirds** — are injections placed where the scanner never looks.

## 6. What this is and is not evidence for

- **It is** evidence that the spike cell's VUS-PR of 0.70–0.91 measures the evaluation
  harness's window placement as much as the detector's sensitivity, and that magnitude is
  not the binding variable for two thirds of the misses.
- **It is not** evidence that deployed recall is 0.809. In deployment the briefing runs
  daily and a spike is one day old when it is scanned; the harness surfaces the window once,
  at its end, and asks about a day up to seventeen trading days old. That is a difference
  between batch evaluation and streaming operation, and **no run has been made that measures
  the deployed case**. Reporting 0.809 as a deployed figure would be the same error as
  reporting a rate over a population the instrument did not cover.
- **It does not change any published number.** `agent_eval.json` is untouched; 0.573, 0.807,
  124 and every VUS-PR cell stand as reported. What changes is the sentence explaining them.

## 7. The remedy, for Further Work

Either scan the whole held-out window in evaluation, or set `DEV_SCAN_WINDOW` from the
evaluation horizon rather than as a constant. The second is the smaller change and the
honest one, because 14 trading days is a sensible **operational** briefing window and only a
wrong **evaluation** window. Neither is executed here: changing it re-runs the 644-injection
corpus, which is a human gate (PRJ93_RULES.md, "Stop and ask before … rerunning any
experiment").

## 8. Downstream

- `chapters/results.tex` §4.5.2 — mechanism corrected, "reaching one at no venue" corrected,
  decomposition added.
- `appendix/robustness.tex` — the per-fold table above and the reachability arithmetic.
- The worked real-day case that D6 also calls for is the Two River Taps closure and traces to
  `brain/log/04_ChangePoint_A13_Report.md` §3, §4.1–4.3, not to this file.
