# PRJ93 — Promote-and-Serve (Live Ingest v2.1): Build & Analysis Report

**Date:** 2026-07-01
**Phase:** Live-ingest v2.1 addendum — promote-and-serve
**Branch:** `main`
**Status:** complete. **171 brain pytest** (+14) + **33 proactive-brain TS specs** (+1)
green; 0 new type errors in touched files; no new endpoints, no new tools. Inert by
default (`LIVE_INGEST=False`, `INGEST_SOURCE=csv`): the forecast only regenerates on a
real refresh with new data or a forced re-persist.

Companion to [PRJ93_Live_Ingest_Report.md](PRJ93_Live_Ingest_Report.md), which this
extends. Read that first for the three-tier model; this is the focused analysis of the
one gap it left open.

---

## 1. The gap this closes

The v2 `refresh()` kept the **signal layer** current: deviation, change-point and
briefing all recompute from the live residual stream because they read the one store,
and the store now advances. But `refresh()` did **not regenerate the served forecast**.
`/forecast` reads the persisted `forecasts` / `bands` tables and `/stock/cover` reads
the reconciled keg forecast, and nothing re-wrote those after new closed days landed.
Two consequences, both honest to state:

1. After new days arrived, `/forecast` and the keg advice kept serving the **previous**
   band until someone re-ran a forecast build by hand.
2. T3 "beat the rung" was **detect-and-audit only**. It recorded that, say, `rung2_ets`
   now wins and wrote a `ladder_selection` row, but the served forecast still used the
   old rung. The system noticed it could improve; it did not.

This was a gap in the v2 spec (which specified re-selection plus audit, not promotion),
not a defect in the build. v2.1 adds the missing promotion so the owner's forecast
actually moves with the data, and "beat the rung" means the served forecast improves.

---

## 2. What was built (reuse, not reinvention)

No new detection or band maths. Promotion **composes** the two persist paths that
already existed and were already parameterised by model:

- `conformal.wrap.evaluate(venue, model_name=<rung>)` — regenerates L1 `forecasts` /
  `bands` from current features with the chosen rung, and keeps the closed-venue
  standby-forward band through its existing path.
- `hierarchy.reconcile.reconcile(venue)` — regenerates the Beer Hall L2/L3 reconciled
  keg forecast that `/stock/cover` reads (`VENUES_WITH_STOCK` only).

New surface, all in [brain/ingest/refresh.py](brain/ingest/refresh.py):

| Element | What it does |
|---|---|
| `served_forecast(venue, layer, model, data_as_of, promoted_ts)` | one upserted row per venue/layer recording **what is live and as of when** — added to `_ensure_tables` |
| `_promote_and_serve(venue, layer, *, adopted_model)` | resolves the served model, runs the two heavy persists, upserts `served_forecast` |
| Phase-4 trigger in `_refresh_one` | fires promotion on `force or n_added or adopted`, else a logged no-op |
| `served_model` / `served_as_of` in `freshness()` | the surface distinguishes "last re-selected" (`last_refit`) from "currently served" |

### Model resolution (GP1)

The served model is, in order: the **adopted** rung's name if this cycle's T3 adopted
one; else the **incumbent** `served_forecast.model`; else the **venue default** via
`conformal.wrap.default_model`, which respects `MAX_RUNG` (so Ellel resolves to
`rung1_robust_dow`, never an ETS/GBM it is capped away from). The adopted rung's name is
threaded from the `ladder_selection` winner rather than reconstructed from the stored
integer rung, because rung 2 is ambiguous (STL / ETS / Prophet) — the integer alone
cannot name a `wrap.evaluate` model.

---

## 3. The trigger: cost-tiered, never per transaction

Promotion rides the closed-day cadence, exactly like T2:

```
promote = force or (n_added > 0) or (rung_change is not None and rung_change["adopted"])
```

So it fires when new closed days landed (the forecast must reflect them), when T3
adopted a new rung (promote it), or on an explicit `force`; and it is a quiet, logged
no-op otherwise. At most **one** `wrap.evaluate` per forecast venue (plus one
`reconcile` for the Beer Hall) per cycle that had new data. A single transaction reaches
T2 at most and never triggers promotion — the same cost guarantee as v2, preserved.

The cost ordering, for the write-up: promotion is heavier than the feature rebuild and
lighter than the full T3 backtest. It is bounded and per-venue.

---

## 4. Connection discipline (the flaky-fix lesson, applied again)

`wrap.evaluate` and `reconcile` each open their **own** DuckDB connections, and DuckDB
permits only one open configuration on the store file at a time — a read/write
interleave is the exact race that made an earlier T3 test flaky. `_promote_and_serve`
therefore holds **no** connection across the heavy calls: a short write connection reads
the incumbent model and watermark, closes; the two heavy persists run with nothing open;
a second short write connection does the `served_forecast` upsert. No interleave window
exists (G-promote-e).

---

## 5. Detect versus promote (the substance of "beat the rung")

State this plainly, because it is the point:

- **Detect** — T3 `evaluate_rolling` / `select_best` picks the best rung on held-out
  MASE under the Tan adoption guard and audits it to `ladder_selection`.
- **Promote** — `_promote_and_serve` regenerates the served `forecasts` / `bands` from
  the adopted (or incumbent) rung and records `served_forecast`.

"Beat the rung" is now **detect plus promote**, so the owner-facing forecast genuinely
improves rather than the system merely noticing it could. `served_forecast` is the
dissertation's record of what was live and when.

---

## 6. Serving and freshness (the honesty loop closed)

`/forecast` and `/stock/cover` need **no code change** — they already read the persisted
tables, which are now kept current. `/freshness` and `brain_data_freshness` now report
`served_model` and `served_as_of` alongside `last_refit`, so the owner can ask "is the
forecast current?" and get a truthful, specific answer: the served rung, the data date
it reflects, and when it was promoted. The Track-B `FreshnessRow` and the freshness card
carry the two fields through unchanged in shape.

---

## 7. Verification

End-to-end (`refresh("beer_hall", force=True)`), against `main`:

```
promote model: rung2_ets | reconciled: True | data_as_of: 2026-05-31
served_forecast: rung2_ets 2026-05-31 | forecast rows: 58 (conformal_rung2_ets)
freshness served_model/served_as_of: rung2_ets / 2026-05-31
```

| Gate | Result |
|---|---|
| GP0 `served_forecast` created; `_promote_and_serve` composes `wrap.evaluate` + `reconcile` + upsert, no re-implemented maths | pass |
| GP1 model resolution: adopted → incumbent → venue default (respecting `MAX_RUNG`) | pass (4 tests) |
| GP2 trigger fires on new data / adoption / force, no-op otherwise (G-promote-c) | pass |
| GP3 served rows and `served_forecast.data_as_of` advance after data (G-promote-a) | pass (end-to-end) |
| GP4 after adoption the served model is the adopted rung; `/forecast` tagged `conformal_<rung>` (G-promote-b) | pass |
| GP5 closed-venue standby band preserved (G-promote-d); connection discipline (G-promote-e) | pass |
| GP6 `/freshness` + `brain_data_freshness` report `served_model` / `served_as_of`; `/forecast` + `/stock/cover` code unchanged | pass |
| GP7 full suite green (`test_promote_and_serve.py`, 14 tests); Track-B spec updated; report + decision-log row written | pass |

Suites: **171 brain pytest**, **33 proactive-brain TS specs**, all green. Review gate:
code-reviewer and security-reviewer run in parallel (see §9).

---

## 8. Decision-log row (paste-ready)

> Promote-and-serve added to the live-ingest cycle. `refresh()` now regenerates the
> served forecast, not just the signal layer: after new closed days land or a T3 adopts
> a rung, `_promote_and_serve` re-persists L1 `forecasts`/`bands` via
> `conformal.wrap.evaluate(venue, model_name=served_rung)` and the Beer Hall keg
> forecast via `hierarchy.reconcile.reconcile`, then upserts a `served_forecast(venue,
> layer, model, data_as_of, promoted_ts)` marker. Model served is the adopted rung, else
> the incumbent, else the venue default (respecting `MAX_RUNG`). Promotion fires only on
> new data, an adoption, or an explicit force, never per transaction, and rides the
> closed-day cadence (one fit per venue per cycle at most). This closes the v2 gap where
> `/forecast` and `/stock/cover` served stale persisted bands and "beat the rung" was
> detect-only: it is now detect (`ladder_selection`) plus promote (`served_forecast`),
> so the owner's forecast and keg advice move with new data. `/freshness` and
> `brain_data_freshness` now report `served_model` and `served_as_of`. Serving endpoints
> unchanged in code; no new detection maths.

---

## 9. Review gate

`code-reviewer` and `security-reviewer` ran in parallel over the change set (the brain
refresh core, the service freshness blocks, and the Track-B types/card/spec).

- **security-reviewer — no findings.** Verified: every new DuckDB statement is
  parameterised and `served_model` is never attacker-controlled (it is a `RungResult.name`
  from the hardcoded `PREDICTORS`, an incumbent read back, or a `default_model` literal);
  `_promote_and_serve` is reachable only through `/refresh` (localhost, operator/cron) and
  never a read endpoint or a Track-B tool; the `GET /forecast?freshness=live` top-up runs
  `refit="never"`, so it can re-persist (T2) but cannot reach T3; no secret/PII/XSS; a
  promote failure leaves the store stale-but-consistent, not corrupt.
- **code-reviewer — no HIGH/MEDIUM.** Confirmed the connection discipline (the read
  connection closes before the heavy calls, the write connection opens only after — no
  interleave window), the adopted → incumbent → default resolution, and the cadence
  gating. Two LOW observations, both **intended behaviour, no fix**: (1) the estate
  `served_model` shows `None` until all three venues have been promoted at least once (the
  conservative collapse when models differ); (2) a swallowed promote failure keeps
  reporting the prior served model, which is accurate rather than misleading. Test quality
  called out as strong (real-output assertions, not mock counts).

No blocking findings; the gate passes.
