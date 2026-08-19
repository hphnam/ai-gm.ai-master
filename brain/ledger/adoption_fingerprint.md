# Adoption fingerprint — the eleven values S36 is judged on

**Instrument, not a log entry.** Any package that adopts code from a second repository
takes this fingerprint before it starts and again when it finishes. Every value must be
identical at both ends. A difference is a failure of that package, not a new baseline.

Script: `fingerprint.py`, transcribed in §4 below so it can be re-run from this file
alone. Store opened `read_only=True` throughout; no refit, no rescore, no model load, no
API call.

| | |
|---|---|
| taken for | S36 (`brain/log/108_ryan_adoption.md`) |
| our head | `b64eaf8b`, branch `ryan-adoption` off `brain-construction-local` |
| their head, pinned | `cc93b6fa` (`andpro-digital/ai-gm.ai`, branch `master`) |
| their head, live at the time | `393b52ad` — **moved since S33**; `cc93b6fa` used anyway, per spec |
| date | 2026-08-19 |
| interpreter, values 1–8 + 10–11 | `brain/.venv-forecast` (Python 3.12.13, duckdb 1.5.4) |
| interpreter, value 9 | `brain/.venv-run` (Python 3.14.0) — see the note under value 9 |

---

## 1 · The eleven values

| # | value | measured | expected by the spec |
|---|---|---|---|
| 1 | store ceiling (`max(date)` on `l1_daily`) | **2026-07-07** (650 rows) | 2026-07-07 ✓ |
| 2 | served model + MASE, Beer Hall | **`rung4_chronos2_exo` 0.745** | ✓ |
| 2 | served model + MASE, Two River Taps | **`rung2_ets` 0.597** | ✓ |
| 2 | served model + MASE, Ellel | **`rung1_robust_dow` 0.572** | ✓ |
| 3 | full ladder scoreboard, all three venues | 10 entrants each, table below | — |
| 4 | injection corpus | **644** = 356 + 252 + 36 | 644 ✓ |
| 5 | distinct calls | **420** (339 unique payloads, 81 shared, 305 injections in a shared group) | ✓ |
| 6 | calibration corpus | **1,593** records, **534** positive, base rate **0.3352** | ✓ |
| 7 | frozen prompt hash | **`c1137f76`** (4,110 chars, model pin `claude-opus-4-8`) | ✓ |
| 8 | cache key, fixed constructed payload | **`f49ca935bab6859a…`** | — |
| 9 | test suite | **1 failed, 669 passed, 8 skipped** (678 collected) | 667 + 9 = 676 ✗ |
| 10 | exogenous feature set | **15 columns**, named below | 15 ✓ |
| 11 | API endpoint count | **12** (10 in `service/app.py`, 2 in `service/compute.py`) | 8 ✗ |

**Value 3 — the rolling-regime scoreboard, from the three committed artefacts.**

| entrant | Beer Hall | Two River Taps | Ellel |
|---|---:|---:|---:|
| `rung0_seasonal_naive` | 1.006 | 0.673 | 0.924 |
| `rung1_robust_dow` | 1.029 | 0.737 | **0.572** |
| `rung2_ets` | 0.799 | **0.597** | 0.825 |
| `rung2_prophet` | – | – | – |
| `rung2_stl` | 1.125 | 0.829 | 0.629 |
| `rung3_gbm` | 0.927 | 0.602 | 0.813 |
| `rung3_global_gbm` | 0.920 | 0.728 | 0.936 |
| `rung4_chronos2` | 0.793 | 0.636 | 0.581 |
| `rung4_chronos2_exo` | **0.745** | 0.612 | 0.591 |
| `rung4_chronos_bolt` | 0.796 | 0.612 | 0.601 |

Artefact SHA-256 (first 16): Beer Hall `4639a1476b22b791`, Two River Taps
`e4b100b5c0882712`, Ellel `4ef1cd6789aefc3d`.

**Value 10 — `models.foundation.CHRONOS2_EXO_COLS`, in order.**
`is_bank_holiday`, `is_ellel_event`, `exo_is_school_term`, `exo_is_uni_term`,
`exo_fixture_nearby`, `wc_match_in_hours`, `wc_england_in_hours`,
`wc_scotland_in_hours`, `wc_home_nation_in_hours`, `wc_n_matches_in_hours`,
`wc_any_match`, `exo_temp_c`, `exo_rain_mm`, `exo_sunshine_hrs`, `exo_is_dry`.

**Value 11 — the routes, not just the count.** `GET /health`, `GET /forecast`,
`POST /deviation/check`, `POST /deviation/scan`, `GET /sop-gaps`, `GET /stock/cover`,
`POST /deviation/changepoint`, `POST /checklist/discipline`, `GET /briefing`,
`GET /freshness` (`service/app.py`); `GET /health`, `POST /compute`
(`service/compute.py`).

---

## 2 · Two values that did not match the spec's expectation, and why

**Value 11 is 12, not 8.** The spec's 8 matches nothing measurable here. `service/app.py`
carries ten route decorators and `service/compute.py` two. `README.md:186` still lists an
eleventh, `POST /refresh`, which was deleted under M1 — `service/app.py:510` says so
verbatim: *"The POST /refresh route is gone (M1): it was unauthenticated, unbounded"*.
So the README is one route stale, in the safe direction. **The route list, not the count,
is what this fingerprint compares**; a count can stay at 12 while a path changes.

**Value 9 is 678 collected with one FAILURE, not 676 with none.** Two parts:

1. **678, not 676.** S32 added `tests/test_agent_cache_checkpoint.py`; its two tests are
   the difference. Expected.
2. **`tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`
   FAILS, and it fails at the S36 baseline, before anything in this package ran.** It is
   recorded here as part of the baseline, not repaired — repairing it means editing
   `models/ladder.py`, which is exactly what this package refuses to touch.

   The failure, verbatim:

   > `eval.harness.UnknownBasisError: unknown scale basis 'unscaled'; expected one of
   > ('calendar_lag7', 'trading_lag7', 'trading_same_weekday', 'calendar_lag7_active')`

   Mechanism, traced: `config.VENUE_SCALE_BASIS["ellel"] == "unscaled"` (`config.py:190`)
   is the estate's ruling that no scaled error is defensible at Ellel.
   `models/ladder.py` honours it in two places — `_score` branches on it at `:440` and
   `loss_names` at `:449` — but `evaluate_static` reaches
   `harness.point_metrics(..., basis=config.VENUE_SCALE_BASIS.get(venue, ...))` at `:405`
   **before either**, and `harness._scale_pairs` raises on a basis outside `SCALE_BASES`.
   So `evaluate_static("ellel")` cannot complete.

   **Consequence, stated plainly: the Ellel static-regime table in
   `models/ladder_results_L1_ellel.md` is not currently reproducible from this code**, and
   it prints a MASE column for a venue this project has ruled cannot support a MASE.
   Checked against the document: no Ellel static-regime MASE is quoted in any chapter or
   appendix, so nothing in the dissertation rests on it. The rolling-regime figure the
   document does use (0.572) comes from `evaluate_rolling`, a different path, and it is
   unaffected.

   **Whoever runs this fingerprint next must expect one failure, and must check it is
   still this one.** A green suite here would itself be a change.

   **And the earlier belief about this test was wrong.** Past runs (S27, S32) deselected it
   by node id on the record that it *"falls back to downloading Chronos weights from Hugging
   Face unauthenticated"*, which is why the counts those packages quote do not reproduce
   here. The failure measured above is **not** a network failure: it was taken in
   `.venv-run`, which has no `torch` and no `chronos`, so no download is reachable, and the
   exception is raised in `harness._scale_pairs` after prediction. **The deselection was
   masking a real defect, not skipping a flaky one.** The same test also failed at the same
   position in the `.venv-forecast` attempt, but that run was killed for loading model
   weights before its traceback was written, so the mechanism *there* is not established
   here.

---

## 3 · What each value is invariant to

- **644 is invariant to the detectors; 420 is not.** 420 is a function of what the
  detectors surface, so any change to the detectors, the grid, the injection ceiling or
  the store changes it (`ledger/agent_eval_numbers.md` §6).
- **644 is invariant to store growth through the stream and NOT through the closure
  filter.** `_usable_folds` reads `store.active_span` uncapped; if Two River Taps ever
  showed trade after 2026-05-08 the corpus would grow from 644 to 728.
- **2 and 3 are pinned by more than the code**: `requirements-forecast.txt` pins
  `torch==2.12.1` and `models/foundation.py` pins the two Hugging Face weight revisions.
  Either unpinned, the ladder tables stop being reproducible even from identical source.
- **8 depends on 7 and on the model pin.** The key is `hash(model, prompt_hash, payload)`;
  the payload used here is constructed literally in the script and reads nothing.

---

## 4 · Re-running it

`fingerprint.py` is **not committed**. It was written to the session scratchpad, and its
working is reproduced in `brain/log/108_ryan_adoption.md` §2, which is where a future
package should copy it from. It needs `PYTHONPATH` set to `brain/` and is run with
`.venv-forecast/bin/python`. Value 9 is a separate command:
`.venv-run/bin/python -m pytest` from `brain/`, with **no `-q` of your own** — the
project's `addopts` already sets one, and a second suppresses the summary line the count
is read from.

**`.venv-run` is the correct interpreter for value 9 and `.venv-forecast` is not.**
`.venv-forecast` carries `torch` and `chronos`, so a run there loads foundation-model
weights from the 677 MB Hugging Face cache — which is both a model load, forbidden inside
an adoption package, and twenty times slower.
