# Report 83 — Novelty candidate feasibility audit

**Mode: read-only.** This file is the only artefact this session wrote. No instrument
was created, no frozen artefact modified, no served model changed, no decision-log row
edited, no `.tex` file touched, nothing pushed.

**What this audit decides.** Whether the inputs each of seven proposed extensions needs
are present on disk. It does not decide whether any of them is a good idea. Every
verdict in §9 is a verdict on availability.

---

## Section 0 — Session frame

| | |
|---|---|
| HEAD SHA at start | `e7fae52efe9d0aff8d4e27ad72839dbed4e02e5d` |
| HEAD SHA at end | `e7fae52efe9d0aff8d4e27ad72839dbed4e02e5d` |
| Match | **Yes** |
| Store ceiling | **2026-07-07**, confirmed — see §2.4 |

**Working-tree disclosure.** HEAD did not move, but the working tree is not byte-identical
to its start state. `graphify update .` is mandated by §0 of the audit brief and by the root
`CLAUDE.md`, and it rewrote `graphify-out/**` (`graph.json`, `graph.html`, `GRAPH_REPORT.md`,
`manifest.json`, the label files, the cache, and a dated backup directory `2026-08-13/`).
Those are the only modified paths attributable to this session. Pre-existing dirt at session
start, untouched by this session: `figures/__pycache__/_style.cpython-{312,314}.pyc` (modified)
and `brain/docs/Sample Dissertation.{md,pdf}` (untracked). No file under `brain/` other than
this report was written by this session.

Full `git status --porcelain` at end:

```
 M brain/graphify-out/cache/last_query_stamp
 M figures/__pycache__/_style.cpython-312.pyc      <- pre-existing
 M figures/__pycache__/_style.cpython-314.pyc      <- pre-existing
 M graphify-out/.graphify_labels.json
 M graphify-out/.graphify_labels.json.sig
 M graphify-out/2026-08-13/{.graphify_labels.json,GRAPH_REPORT.md,graph.json,manifest.json}
 M graphify-out/{GRAPH_REPORT.md,graph.html,graph.json,manifest.json}
 M graphify-out/cache/stat-index.json
?? brain/docs/Sample Dissertation.md               <- pre-existing
?? brain/docs/Sample Dissertation.pdf              <- pre-existing
?? graphify-out/cache/ast/v0.9.28/6041ce1e…json
```

**Orientation files read, in the order the brief specifies.**

1. `brain/CONTRACT.md` — read in full (355 lines).
2. `brain/FLAGS.md` — read lines 1–736 of 1126. The remaining 390 lines were not read;
   nothing in this audit rests on them.
3. `brain/PRJ93_RULES.md` — read lines 1–970 of 1221. The remaining 251 lines were not read.
4. `brain/ledger/BLOCKED_third_party.md` §F — read. §F line 187 reads
   *"Open rows not blocked on a third party: **2** — S-1 and S-3, both self-closable."*
   This matches the recalled state and no claim below contradicts it.
5. `brain/knowledge/06_research_questions.md` §6 — read in full. The contribution count
   is **five** (C1–C5), ruled 2026-08-09.

**graphify.** `graphify update .` ran to completion (exit 0): 14,483 nodes, 26,066 edges,
987 communities, 843/843 files extracted. Three `graphify query` calls were issued
(frame construction, chronos quantile selection, deviation detector). All three returned
inside 100 s; none hung, so no fallback was recorded on hang grounds. All three returned
**truncated** subgraphs (66 of 475, 65 of 488, 9 of 9), so `rg` and bounded `sed` reads
were used for the specific line-level answers below, as the brief permits.

---

## Section 1 — Verification posture

Every count below carries the command that produced it. Where a number was computed ad hoc
for this audit rather than read from an instrumented artefact, it is marked
**AD-HOC-UNVERIFIED** and does not carry a verdict alone.

The DuckDB store was opened `read_only=True` on every access.

---

## Section 2 — Store and target inventory

### 2.1 Every table and view in the store

Command:

```python
duckdb.connect('brain/store/brain.duckdb', read_only=True)
  .execute("select table_name, table_type from information_schema.tables")
```

**Scope: 24 objects — 21 base tables and 3 views. This is the complete object list, not a sample.**

| Object | Type | Rows | Date column | min | max |
|---|---|---|---|---|---|
| `bands` | table | 8,524 | `target_date` | 2026-03-13 | 2026-07-07 |
| `brewery_inventory` | table | 1,002 | `snapshot_date` | 2025-12-01 | 2026-05-12 |
| `briefing_runs` | table | 55 | `as_of` | 2026-07-07 | 2026-07-07 |
| `change_points` | table | 4 | `onset_date` | 2025-11-01 | 2026-05-28 |
| `data_watermark` | table | 2 | `last_txn_date` | 2026-07-04 | 2026-07-07 |
| `exog_weather_hindcast` | table | 2,170 | `date` | 2025-06-04 | 2026-07-14 |
| `exog_weather_horizon` | table | 7,854 | `date` | 2025-06-04 | 2026-07-07 |
| `exog_weather_leadmatched` | table | 2,170 | `date` | 2025-06-04 | 2026-07-14 |
| `exog_weather_observed` | table | 2,149 | `date` | 2025-06-04 | 2026-07-07 |
| `forecasts` | table | 4,262 | `target_date` | 2026-03-13 | 2026-07-07 |
| `ladder_selection` | table | **0** | `ts` | — | — |
| `line_items` | table | 93,400 | `date` | 2025-06-04 | 2026-07-07 |
| `local_events` | table | 7 | `event_date` | 2025-10-09 | 2025-11-08 |
| `promo_calendar` | table | **0** | `date` | — | — |
| `served_forecast` | table | **0** | `data_as_of` | — | — |
| `spike_days` | table | 614 | `date` | 2025-06-04 | 2026-05-31 |
| `stock_cover` | table | 14 | `as_of` | 2026-06-01 | 2026-06-01 |
| `stock_panel` | table | 1,407 | `snapshot_date` | 2025-09-01 | 2026-06-01 |
| `stock_product_master` | table | 238 | — (no date col) | — | — |
| `stock_snapshot_agg` | table | 10 | `snapshot_date` | 2025-09-01 | 2026-06-01 |
| `venue_trading_hours` | table | 22 | — (no date col) | — | — |
| `l1_daily` | view | 650 | `date` | 2025-06-04 | 2026-07-07 |
| `l2_category_daily` | view | 3,924 | `date` | 2025-06-04 | 2026-07-07 |
| `l3_item_daily` | view | 18,994 | `date` | 2025-06-04 | 2026-07-07 |

Column names and types, in ordinal position, for the objects any candidate below touches:

- `line_items` — `transaction_id:VARCHAR, category:VARCHAR, item:VARCHAR, price_point:VARCHAR,
  channel:VARCHAR, venue:VARCHAR, venue_label:VARCHAR, qty:DOUBLE, net_sales:DOUBLE,
  gross_sales:DOUBLE, discounts:DOUBLE, tax:DOUBLE, ts:TIMESTAMP WITH TIME ZONE, date:DATE,
  net_sales_exvat:DOUBLE, excluded:BOOLEAN`
- `l1_daily` — `venue:VARCHAR, date:DATE, dow:INTEGER, revenue_exvat:DOUBLE, revenue_raw:DOUBLE,
  gross_sales:DOUBLE, units:DOUBLE, n_line_items:BIGINT, n_transactions:BIGINT`
- `l3_item_daily` — `venue:VARCHAR, date:DATE, item:VARCHAR, category:VARCHAR, units:DOUBLE,
  revenue_exvat:DOUBLE`
- `forecasts` — `venue, layer, key, target_date, model, yhat:DOUBLE, created_at:TIMESTAMP`
- `bands` — `venue, layer, key, target_date, model, level:DOUBLE, lo:DOUBLE, hi:DOUBLE, created_at`

**Three tables are empty and it matters.** `ladder_selection` (0), `served_forecast` (0) and
`promo_calendar` (0). The first two are exactly what `CONTRACT.md` open decision 6 predicts
(*"`ladder_selection` comes back `[]` on every call"*); this audit confirms the same is true of
the research store, not only of the compute path.

### 2.2 The daily revenue target used by the ladder

**Resolved at the generator, not assumed.** The chain is
`models/ladder._load_feats` → `store.active_span.trim_to_active(features.build_features(venue))`
→ `features.build_features` → `store.warehouse.read_series(venue, "L1", fill_calendar=True)`.

`models/ladder.py:78-82`:

```python
def _load_feats(venue: str) -> pd.DataFrame:
    return trim_to_active(build_features(venue), venue)
```

`features/build_features.py:213` calls `read_series(venue, "L1", fill_calendar=True, con=con)`.

**The line that answers "zero row or missing row" is `store/warehouse.py:335-341`:**

```python
    if layer == "L1" and fill_calendar and not df.empty:
        full = pd.date_range(df["date"].min(), df["date"].max(), freq="D")
        df = (
            df.set_index("date")
            .reindex(full)
            .rename_axis("date")
            .reset_index()
        )
        df["value"] = df["value"].fillna(0.0)
```

**The answer is: both, in sequence.** In the store a closed day is an **absent row** —
`l1_daily` is a `GROUP BY` over `line_items`, so a day with no transactions produces no row.
In the frame the ladder scores, that absent row becomes a **zero row**, materialised by the
`reindex` + `fillna(0.0)` above onto each venue's own `min..max` calendar. Note the default is
`fill_calendar=False`; every consumer on the ladder path passes `True`.

Per-venue counts. Command:

```sql
select venue, count(*) rows_present,
       sum(case when revenue_exvat>0 then 1 else 0 end) pos_rev_days,
       sum(case when revenue_exvat=0 then 1 else 0 end) zero_rev_rows,
       min(date), max(date), date_diff('day',min(date),max(date))+1
from l1_daily group by venue
```

| Venue | Rows present in store | Trading days (`revenue_exvat > 0`) | Rows present with value exactly 0 | First | Last | Calendar span | Calendar days **absent entirely** |
|---|---|---|---|---|---|---|---|
| `beer_hall` | 302 | **301** | 1 | 2025-06-04 | 2026-07-07 | 399 | **97** |
| `ellel` | 68 | **66** | 2 | 2025-06-08 | 2026-07-04 | 392 | **324** |
| `two_river_taps` | 280 | **280** | 0 | 2025-06-12 | 2026-05-08 | 331 | **51** |

No negative-revenue rows at any venue.

**Untaken vs uncounted, stated.** The 97 / 324 / 51 absent days are **absent from the store**
(no line item was recorded), and are **counted as zeros** in the ladder's frame. The 1 / 2 / 0
zero-valued rows are days where line items exist and net to exactly zero — a different thing,
and the two must not be summed.

**Corroboration that these are the frame lengths the project already knows.** 399 / 392 / 331
are the exact frame row counts recorded in `FLAGS.md` FLAG-HASH-GATE-UNRUNNABLE
(`beer_hall` 399×40, `ellel` 392×40, `two_river_taps` 331×40). The generator and the ledger agree.

### 2.3 TRT £0 tax, and whether a VAT normalisation was applied

**Confirmed, as the store now holds it.** Command:

```sql
select venue, count(*) n_rows,
       sum(case when tax=0 then 1 else 0 end) n_tax_zero,
       sum(case when tax<>0 then 1 else 0 end) n_tax_nonzero,
       min(tax), max(tax), sum(tax)
from line_items group by venue
```

| Venue | Rows | tax = 0 | tax ≠ 0 | min tax | max tax | Σ tax |
|---|---|---|---|---|---|---|
| `beer_hall` | 48,644 | 6,304 | 42,340 | −3.67 | 33.33 | 35,936.17 |
| `ellel` | 10,560 | 960 | 9,600 | −1.83 | 32.00 | 8,077.20 |
| `events` | 203 | 4 | 199 | 0.00 | 8.00 | 287.76 |
| `two_river_taps` | 33,993 | **33,993** | **0** | 0.00 | 0.00 | **0.00** |

Two River Taps carries £0 tax on **every one of 33,993 rows**. The Beer Hall does not
(42,340 of 48,644 rows carry non-zero tax). The June 2026 audit's finding is **confirmed**
against the store as it stands at ceiling 2026-07-07.

**A VAT normalisation WAS applied, and here is the file and line.**
`ingest/normalise.py:160-161`:

```python
    deflator = kept["venue"].map(vat_deflator).astype(float)
    kept["net_sales_exvat"] = kept["net_sales"] * deflator
```

`config.py:220-231`:

```python
# Two River Taps `Net Sales` is treated as VAT-INCLUSIVE; deflate by 1/1.2
VAT_RATE = 0.20
VAT_INCLUSIVE_VENUES = frozenset({"two_river_taps"})

def vat_deflator(venue: str) -> float:
    return 1.0 / (1.0 + VAT_RATE) if venue in VAT_INCLUSIVE_VENUES else 1.0
```

Verified in the data, not only in the code:

| Venue | Σ `net_sales` | Σ `net_sales_exvat` | ratio |
|---|---|---|---|
| `beer_hall` | 233,582.08 | 233,582.080000 | **1.0** |
| `ellel` | 47,065.86 | 47,065.860000 | **1.0** |
| `two_river_taps` | 171,970.12 | 143,308.433333 | **1.2** |

The deflation is live and it is exactly 1/1.2 at TRT and identity elsewhere. Per `FLAGS.md`
open confirmation 1 this is still a **working assumption pending owner confirmation**, and
`CONTRACT.md` §2 records that the same rule is *absent* from the compute path
(`compute/loader.py` writes `net_sales_exvat` straight through). So: normalised on the CSV
bootstrap, not normalised on the tenant compute path. Both statements are true and they are
about different code paths.

### 2.4 Store ceiling

`store/warehouse.assert_store_ceiling()` returns **`2026-07-07`**, confirmed by calling it
(`store/warehouse.py:261`). It reads `config.EXPECTED_STORE_CEILING` at call time. The
independent second way: `max(l1_daily.date)` and `max(line_items.date)` are both `2026-07-07`.
Every `eval/*.json` artefact inspected in §3–§5 stamps `"store_ceiling": "2026-07-07"`.

---

## Section 3 — Persisted forecast artefacts

### 3.5 Enumeration of every persisted forecast artefact

**Scope: 70 files.** Command:

```bash
find brain -type f \( -name "*.json" -o -name "*.parquet" -o -name "*.csv" \) \
  -not -path "*/.venv*" -not -path "*__pycache__*" -not -path "*/graphify-out/*"
```

Classified by whether a point-forecast-shaped key appears anywhere in the structure
(regex `^(yhat|y_hat|pred|preds|prediction|point|forecast|y|actual|realis|realiz|target)`,
walked to depth 6). Only the files that bear on this audit are tabulated; the full 70-file
listing is reproducible with the command above.

| Path | Format | One row / record is | Per-origin point forecasts? |
|---|---|---|---|
| `eval/fold_vectors_L1_{beer_hall,ellel,two_river_taps}.json` | JSON | one **fold** × one rung → a scalar MASE and a scalar RMSSE | **No — aggregated scores only** |
| `eval/mcs_L1_results.json` | JSON | one venue → MCS sets, p-values, mean losses | No |
| `eval/functional_pair.json` | JSON | one venue → paired-functional summary | No |
| `eval/metric_ordering.json` | JSON | one venue → metric-order comparison | No |
| `eval/interval_calibration_L1.json` | JSON | one venue × level → coverage/width summaries | No |
| `eval/native_interval_probe.json` | JSON | one venue × arm × level → coverage/width summaries | No |
| `eval/weather_basis_L1.json` | JSON | one venue × basis arm → per-fold loss vectors | No |
| `eval/group_icl_L1.json` | JSON | one venue × group arm → per-fold loss vectors | No |
| `eval/scale_bootstrap_L1.json` | JSON | one venue → bootstrap summary | No |
| `eval/marginal_acf_L1.json` | JSON | one venue → ACF of loss differentials | No |
| `eval/agent_eval.json` | JSON | corpus-level detection/fatigue/cost/ranking summaries | No |
| `eval/injection_realism.json` | JSON | one **injection** → realism + refit counters | No (no forecasts) |
| `eval/spike_reachability.json` | JSON | one venue × z × onset → reachability | No |
| **`eval/exchangeability_scores.csv`** | CSV | one **(venue, origin, step)** → `y`, `yhat`, `res`, `state` | **YES — one model** |
| `sim/june2026_forecast_frozen.parquet` | Parquet | one (venue, level, key, date, model) → `yhat`, `lo`, `hi` | **YES — frozen single origin** |
| `sim/july2026_forecast_frozen.parquet` | Parquet | same | **YES — frozen single origin** |
| `sim/july2026_w2_forecast_frozen.parquet` | Parquet | same | **YES — frozen single origin** |
| `sim/july2026_w2b_forecast_frozen.parquet` | Parquet | same | **YES — frozen single origin** |
| `sim/june2026_actuals.parquet` | Parquet | one (venue, level, key, date) → `actual` | realised only |
| `sim/g15a_ellel_counterfactual.json` | JSON | one date → `actual`, `yhat_flag_0/1`, `yhat_spike` | YES — 1 venue, 1 week |
| store table `forecasts` | DuckDB | one (venue, layer, key, target_date, model) → `yhat` | **YES — conformal models only** |
| store table `bands` | DuckDB | same + `level` → `lo`, `hi` | interval, not point |

**The headline of this section.** The entire `eval/` corpus — which is where the ladder
comparison lives — holds **aggregated scores only**. Not one of the ten ladder entrants has a
persisted per-origin point-forecast vector anywhere in the tree.

### 3.6 Is there a stored (origin × venue × entrant × point forecast × realised) matrix?

**No.** The nearest three things, and why each falls short:

**(a) `eval/fold_vectors_L1_*.json` — right shape, wrong contents.** It is the ladder
comparison matrix, and it is complete on the axes it does carry:

| Venue | `n_folds` | Entrants present | Entrants available | Common origin set? |
|---|---|---|---|---|
| `beer_hall` | **273** | 10 | 9 | **Yes — all 9 carry `fold_index == range(273)`, zero NaN** |
| `ellel` | **260** | 10 | 9 | **Yes — all 9 carry `fold_index == range(260)`, zero NaN** |
| `two_river_taps` | **205** | 10 | 9 | **Yes — all 9 carry `fold_index == range(205)`, zero NaN** |

The tenth entrant, `rung2_prophet`, is `available: false` with `note: "backend not installed"`
at all three venues, so it contributes no vector at all — it is **untaken, not uncounted**.
Fold boundaries are persisted (`folds[i] = {train_end, test_start, test_end, n_train, n_test}`),
horizon 7, step 1, min_train 120. Origins overlap by construction and the file says so in an
`independence_warning` field.

But each rung entry is exactly `{available, rung, fold_index, mase[], rmsse[], summary}`.
**Per fold there is one scalar per loss and nothing else.**

**(b) The generator computes the point forecasts and throws them away.**
`models/ladder.py:489-504`, inside `evaluate_rolling`:

```python
        for name, rung, preds, note in _predict_all(
            venue, tr, te, cols, with_prophet=with_prophet
        ):
            ...
                acc.setdefault(name, []).append((
                    i,
                    _score(yte, preds, ytr, basis),
                    _score(yte, preds, ytr, basis, squared=True),
                ))
```

`preds` is the 7-element point-forecast vector for that fold and `yte` the realised vector.
Both are collapsed to two scalars on the same line. `RungResult.predictions` exists as a field
(`models/ladder.py:105`) and `evaluate_rolling` never populates it. `eval/fold_vectors.build`
(`eval/fold_vectors.py:97-109`) then copies only `fold_index`, `per_fold_mase`, `per_fold_rmsse`.

**(c) `eval/exchangeability_scores.csv` — real per-origin points, one model.** 5,166 rows,
columns `venue, origin, step, target, y, yhat, res, state`. Coverage: beer_hall 1,911 pairs /
273 origins, ellel 1,820 / 260, two_river_taps 1,435 / 205. This is a genuine (origin, step,
point forecast, realised) matrix on the same origin sets as the fold vectors — but
`eval/exchangeability_diagnostic.json` records `point_model: "rung2_ets"` at all three venues.
**One entrant. There is nothing to pair it against.**

**(d) The frozen `sim/` artefacts — points but no pairing at L1.** Filtering each to `level == 'L1'`:

| Artefact | L1 rows | venue → model |
|---|---|---|
| `sim/june2026_forecast_frozen.parquet` | 90 | beer_hall → `rung4_chronos2_exo` (30 d); ellel → `rung1_robust_dow` (30 d); two_river_taps → `rung2_ets` (30 d) |
| `sim/july2026_forecast_frozen.parquet` | 14 | beer_hall → `rung4_chronos2_exo` (7 d); ellel → `rung1_robust_dow` (7 d) |

**Exactly one model per venue at L1.** The four model names in the file
(`rung1_robust_dow`, `…+revshare`, `rung4_chronos2_exo`, `…+mint`) are the L2/L3
reconciliation arms, not competing L1 entrants.

**(e) The store `forecasts` table — paired, but not on a common origin set.**

| Venue | Layer | Model | n | distinct target_date | min | max |
|---|---|---|---|---|---|---|
| beer_hall | L1 | `conformal_rung2_ets` | 94 | 94 | 2026-04-05 | 2026-07-07 |
| beer_hall | L1 | `conformal_rung4_chronos2` | 57 | 57 | 2026-04-05 | 2026-05-31 |
| ellel | L1 | `conformal_rung1_robust_dow` | 57 | 57 | 2026-03-27 | 2026-05-22 |
| ellel | L1 | `conformal_rung2_ets` | 100 | 100 | 2026-03-27 | 2026-07-04 |
| ellel | L1 | `conformal_rung3_gbm` | 57 | 57 | 2026-03-27 | 2026-05-22 |
| two_river_taps | L1 | `conformal_rung2_ets` | 85 | 85 | 2026-03-13 | 2026-06-05 |

**How the entrants differ, since they do.** At the Beer Hall two models coexist but on
different date sets (94 vs 57), the Chronos-2 arm stopping at 2026-05-31 — five weeks before the
ETS arm. At Ellel three models coexist, two of them ending 2026-05-22 while ETS runs to
2026-07-04. Two River Taps carries one model only. The overlap is derivable by inner join, but
it is not a common origin set as persisted, and the largest paired set available is **57 dates
at one venue with two entrants**. `served_forecast` is empty, so nothing records which of these
is live.

### 3.7 Are quantile forecasts persisted for the Chronos-2 arms?

**The requested levels are persisted; the per-origin quantile values are not.**

`eval/native_interval_probe.json` records `quantile_levels: [0.05, 0.1, 0.5, 0.9, 0.95]`,
`levels: [0.8, 0.9]`, `lower_limb_clipped_at_zero: true`, and per (venue, arm) a
`native_levels` list — `[0.8]` for `rung4_chronos_bolt`, `[0.8, 0.9]` for `rung4_chronos2`.
What is stored **per level** is `{n, coverage, coverage_ci, mean_width, median_width,
interval_pinball, n_crossed_quantiles}` — summaries over 1,911 / 1,820 / 1,435 points.
No per-origin quantile vector is written to disk anywhere in the tree.

The predictor itself requests `quantile_levels=[0.1, 0.5, 0.9]`
(`models/foundation.py:263, 275, 362`) and returns a 1-D array in every branch, so the 0.1
and 0.9 limbs are discarded inside the function before any caller could persist them.

### 3.8 Confirm from code that the served Beer Hall point forecast is the median

**Confirmed.** The served Beer Hall entrant is `rung4_chronos2_exo`
(`models/foundation.chronos2_exo_predict`, defined at `models/foundation.py:312`).

Quantile selection — `models/foundation.py:362-364`:

```python
        quantile_levels=[0.1, 0.5, 0.9], id_column="id",
    ...
    col = "0.5" if "0.5" in pred_df.columns else "predictions"
```

Clipping at zero — `models/foundation.py:368`:

```python
    return np.clip(out, 0.0, None)
```

The same pair appears on the two sibling entrants: `rung4_chronos2`
(`models/foundation.py:265` select, `:270` clip; tensor fallback `:276` select, `:278` clip)
and `rung4_chronos_bolt` (`models/foundation.py:186` select, `:187` clip). The Rung-1
baseline is a median too, and says so — `models/ladder.py:188`:
*"Median day-of-week profile. 'Robust' names the median: it is the functional."*

**So the emitted functional is the median at every rung that could be served.** Hold that
against §8.25.

---

## Section 4 — Conformal and rank artefacts

### 4.9 The exchangeability diagnostic, and whether per-point ranks are persisted

**Located.** Generator `eval/exchangeability_diagnostic.py`; artefacts
`eval/exchangeability_diagnostic.json` (18,545 bytes) and `eval/exchangeability_scores.csv`
(384,868 bytes, 5,166 data rows).

**Per-test-point ranks are NOT persisted. Only summary statistics are.** The JSON's
`rank_uniformity` block, per venue, carries exactly:

| Field | beer_hall | ellel | two_river_taps |
|---|---|---|---|
| `n_banded` | 1,750 | 1,659 | 1,274 |
| `mean_rank` | 0.5544 | 0.5538 | 0.4574 |
| `frac_above_nominal_quantile` | 0.1297 | 0.0874 | 0.0385 |
| `active_only` | `{n, mean_rank, frac_above_nominal_quantile}` | ″ | ″ |
| `traded_only` | `{n, mean_rank, frac_above_nominal_quantile}` | ″ | ″ |
| `false_open_only` | `{n, mean_rank, frac_above_nominal_quantile}` | ″ | ″ |
| `per_step_frac_above` | one scalar per step 1–7 | ″ | ″ |

That is four means and a seven-element per-step fraction. **The rank sequence itself is a
local variable that never leaves the function.**

`eval/exchangeability_diagnostic.py:111-144` builds it and drops it:

```python
    ranks: list[float] = []
    states: list[int] = []
    steps: list[int] = []
    traded: list[bool] = []
    ...
            grp = pr[pst == s]
            if grp.size == 0:
                grp = pr
            below = float((grp < row["res"]).sum())
            equal = float((grp == row["res"]).sum())
            ranks.append((below + 0.5 * equal) / grp.size)
```

`ranks`, `states`, `steps` and `traded` are all four in scope, index-aligned, and all four are
reduced to scalars at `:146-176` and discarded.

**Population note, per the `active` rule.** `active_only` in this file is
`records["state"] == 0`, i.e. **calendar-open**, not traded. `traded_only` is the `y > 0` limb.
The file keeps them apart correctly; anything lifted from it must say which.

### 4.10 If ranks were persisted — are they time-ordered, and is the denominator recorded?

The ranks are **not** persisted, so the literal answer is *not applicable*. What matters for
C6 is whether both properties are **recoverable**, and both are:

- **Time order: yes, and it is the loop's own order.** `for t in sorted(by_origin)` at
  `:113` walks origins in ascending date, and within an origin `by_origin` was built as
  `g.sort_values("step")` at `:106`. `eval/exchangeability_scores.csv` carries `origin`,
  `step` and `target` on every row, so the same order is reconstructible from the CSV with a
  two-column sort — no re-run needed to establish ordering.

- **The denominator: recorded in-loop, absent from disk.** `grp.size` at `:136` *is* the
  calibration-set size for that test point in its own Mondrian group. It is used and dropped.
  The only cardinality that reaches disk is `n_banded` (1,750 / 1,659 / 1,274), which is the
  count of *test points*, not the per-point calibration size. The pool is expanding and warmup
  is `ic.WARMUP_POOL = 140`, both stamped in the JSON (`warmup_pool: 140`), so the sequence of
  `grp.size` values is deterministically reconstructible from the CSV — but **it is not on disk
  today**, and a rank without its denominator cannot become a p-value.

### 4.11 The Mondrian group assignment as actually computed — the misgrouping count

**Group definition.** `state` is the Mondrian group: `0` = calendar-open,
`1` = calendar-closed by the day-of-week structural-closure calendar. It rides on every row of
`eval/exchangeability_scores.csv`.

**Only one sign is persisted.** `_partition_fidelity`
(`eval/exchangeability_diagnostic.py:383-407`) computes:

```python
    closed = records[records["state"] == 1]
    traded = closed[closed["y"] > 0]
```

— days the calendar called closed that took money. The opposite error, days the calendar
called open on which the venue took nothing, is **not computed and not stored**.

**Persisted limb**, read from `eval/exchangeability_diagnostic.json`:

| Venue | `n_calendar_closed` | `n_calendar_closed_but_traded` | `rate` | mean takings on those days | mean abs residual on those days | mean abs residual on genuinely closed |
|---|---|---|---|---|---|---|
| `beer_hall` | 546 | **94** | 0.17216 | 295.77 | 238.02 | 32.21 |
| `ellel` | 520 | **21** | 0.04038 | 321.82 | 317.51 | 5.04 |
| `two_river_taps` | 410 | **65** | 0.15854 | 214.15 | 154.35 | 22.49 |

**The other limb, computed for this audit — AD-HOC-UNVERIFIED.** Command, over the persisted
CSV, no re-run of any model:

```python
df = pd.read_csv("eval/exchangeability_scores.csv")
closed = d[d.state==1]; open_ = d[d.state==0]
a = int((closed.y > 0).sum())    # grouped CLOSED, actually traded
b = int((open_.y <= 0).sum())    # grouped TRADING, actually took nothing
```

The `a` column reproduces the persisted `n_calendar_closed_but_traded` exactly at all three
venues (94 / 21 / 65), and the `n_calendar_closed` totals reproduce exactly (546 / 520 / 410),
which is the check that the ad-hoc count is reading the same population the instrument read.
The `b` column is new.

**The misgrouping count, per venue, with sign:**

| Venue | pairs | state 1 (grouped closed) | state 0 (grouped trading) | **(+) grouped closed, traded** | **(−) grouped trading, took nothing** | net | total misgrouped | share of pairs |
|---|---|---|---|---|---|---|---|---|
| `beer_hall` | 1,911 | 546 | 1,365 | **+94** (17.22 %) | **−21** (1.54 %) | **+73** | 115 | 6.02 % |
| `ellel` | 1,820 | 520 | 1,300 | **+21** (4.04 %) | **−1,037** (79.77 %) | **−1,016** | 1,058 | **58.13 %** |
| `two_river_taps` | 1,435 | 410 | 1,025 | **+65** (15.85 %) | **−7** (0.68 %) | **+58** | 72 | 5.02 % |

**This is the single most important number in this audit and it is not the number the
instrument reports.** At Ellel the persisted limb says 21 misgroupings, a 4 % rate that reads
as the venue with the *cleanest* partition of the three. The unpersisted limb says 1,037, a
79.8 % rate — **the calendar declares Ellel open on four days in five when it takes nothing.**
The instrument reports the small sign at the venue where the large sign lives, and it is
correct in what it reports; it simply does not compute the other direction.

Consistency with what the project already knows: `PRJ93_RULES.md` records Ellel's
`active_only` limb as *"1185 pairs of which 240 traded"* under one filtering, and the
1,300-open / 263-traded split here is the same story at the unfiltered row count. `FLAGS.md`
FLAG-MASE-INTERMITTENT and the 82 %-zero characterisation in
`knowledge/04_supervisor_evidence_pack.md` both describe the same venue. Nothing here
contradicts them; what is new is that the **quantity is a Mondrian grouping error**, is
signed, and is 49× the size of the one the diagnostic prints.

### 4.12 Does the attainable-size condition (k > n_cal) fire anywhere?

**No — it fires zero times, at every venue, at both levels.**

The condition is `conformal/wrap.py:74-88` (`conformal_min_n`: 4 points for 80 %, 9 for 90 %)
and the clamp is `conformal/wrap.py:105` (`k = min(int(math.ceil((n + 1) * level)), n)`). The
tally is accumulated at `conformal/wrap.py:216` and written into the report at `:234`.

Read from the persisted reports, not from an exit code:

| Venue | Report | Held-out points | Level | Min calibration n | Group bands issued | **Of which clamped** |
|---|---|---|---|---|---|---|
| `beer_hall` | `conformal/conformal_L1_beer_hall.md` | 209 | 80 % | 4 | 60 | **0** |
| | | | 90 % | 9 | 60 | **0** |
| `ellel` | `conformal/conformal_L1_ellel.md` | 196 | 80 % | 4 | 56 | **0** |
| | | | 90 % | 9 | 56 | **0** |
| `two_river_taps` | `conformal/conformal_L1_two_river_taps.md` | 141 | 80 % | 4 | 42 | **0** |
| | | | 90 % | 9 | 42 | **0** |

**Scope of that clean result.** It is a clean result over **158 group bands** issued on the
`conformal/wrap.py` serving path (209 + 196 + 141 = 546 held-out points). It is **not** a
statement about the `eval/interval_calibration` / `exchangeability_diagnostic` path, which runs
over 5,166 pairs with `WARMUP_POOL = 140` and a differently-constructed expanding pool.
`eval/interval_calibration_L1.json` contains **zero occurrences** of `undersized`,
`min_calibration`, `attainab` or `n_calib`, so on that path the condition is **uncounted**, not
confirmed absent. Two paths, one answered and one not.

---

## Section 5 — Detector output and cadence

### 5.13 What the deviation signal emits per day per venue

From `signals/deviation.check_point` (`signals/deviation.py:54-88`), one record is:

| Field | Type | Note |
|---|---|---|
| `venue` | str | |
| `layer` | str | default `"L1"` |
| `date` | str | ISO date |
| `status` | str | `"normal"` \| `"deviation"` |
| `direction` | str | `"up"` \| `"down"` — set even on a normal day |
| `severity` | str \| None | `"high"` if \|z\| > `DEV_SEVERE_K`, else `"medium"`; **None on a normal day** |
| `actual` | float | rounded 2 |
| `expected` | float | rounded 2 — the expanding DOW median |
| `band_low` | float | `expected − scale` |
| `band_high` | float | `expected + scale` |
| `z` | float | rounded 2 |
| `reason` | list | attribution list; **empty list unless `status == "deviation"`** |

Classification is `signals/deviation.py:41-50`: `|z| ≤ DEV_BAND_K` → normal, else deviation;
`|z| > DEV_SEVERE_K` → high. Measured constants: `DEV_BAND_K = 1.0`, `DEV_SEVERE_K = 2.0`.

Stored example, from `eval/deviation_eval.md` (the latest trading day per venue):

```
| The Beer Hall      | 2026-07-05 | normal | — | -0.08 | 441.53 | -77.61–1053.51 | — |
| Ellel Village Hall | 2026-07-04 | normal | — | +0.67 | 284.03 | -387.55–417.55  | — |
| Two River Taps     | 2026-07-05 | normal | — | -0.60 |   0.00 | -203.42–802.39  | — |
```

`check_point` returns **None**, not a record, when `as_of` is not a stream day.

### 5.14 How often the detector fires — AD-HOC-UNVERIFIED

**There is no persisted fire log.** `eval/deviation_eval.md` records only the latest day per
venue (3 rows); the store has no deviation table. The counts below were computed for this
audit by calling the project's own `signals.residual.build_residual_stream` and
`signals.deviation._classify` — instrumented functions, ad-hoc aggregation.

**Population, stated because it is not what the docstring says.** `build_residual_stream`
(`signals/residual.py:81-108`) admits a day when the **expanding DOW median is > 0**
(`if exp_i <= _EPS: continue`), i.e. when that day-of-week has historically taken money — not
when the venue actually traded. For a closed venue `_raw_series` (`signals/residual.py:54-79`)
deliberately zero-extends past closure to the dataset-global max, per FLAG-CP6.

| Venue | Stream days | Date span | Fires | **Fires per stream day** | high | medium | Rows with `actual == 0` |
|---|---|---|---|---|---|---|---|
| `beer_hall` | 245 | 2025-07-30 … 2026-07-05 | **31** | **0.1265** | 8 | 23 | 4 |
| `ellel` | 55 | 2025-08-09 … 2026-07-04 | **11** | **0.2000** | 6 | 5 | 31 |
| `two_river_taps` | 313 | 2025-08-07 … 2026-07-05 | **37** | **0.1182** | 1 | 36 | 89 |
| **total** | 613 | | **79** | **0.1289** | 15 | 64 | 124 |

**The served configuration also surfaces a ranked list, and the count is variable.** The
briefing (`signals/briefing.py`) ranks items; there is **no top-N constant** in `config.py`
(`BRIEFING_*` covers weights, multipliers, novelty factors and a recency floor — no cap).
At the single persisted `as_of` in `briefing_runs` (2026-07-07) the list carried:

| Venue | Distinct `item_key` | Rows |
|---|---|---|
| `beer_hall` | **5** | 25 |
| `ellel` | **3** | 15 |
| `two_river_taps` | **3** | 15 |

11 items across the estate. The 55 rows are 11 items × 5 regenerations (`generated_at` spans
2026-07-24 … 2026-08-01 against one `as_of`). **The count is variable, not fixed.**

### 5.15 Chattering check — AD-HOC-UNVERIFIED

Same stream, same command. "Immediately preceded" means the previous row in the stream, which
is the previous **stream day** for that venue.

| Venue | Fires | Fires immediately preceded by a fire | Share | **Longest consecutive run** |
|---|---|---|---|---|
| `beer_hall` | 31 | **6** | 19.4 % | **4** |
| `ellel` | 11 | **3** | 27.3 % | **3** |
| `two_river_taps` | 37 | **14** | 37.8 % | **3** |
| **total** | 79 | **23** | 29.1 % | **4** |

**The KPIs bite, but read the Two River Taps column before believing them.** TRT closed
2026-05-08. Of its 37 fires, **14 fall after the closure date** — on 2026-05-09, then every
Friday and Saturday through 2026-07-03 — and **15 of its 37 fires land on `actual == 0`**.
Those are the post-closure zero run alarming against a DOW median that still remembers a
trading venue. TRT's 14 preceded-fires and much of its 37.8 % chatter rate are that artefact,
not a live alarm-management problem. On the Beer Hall, which trades throughout, the rate is
6 of 31 with a longest run of 4 — non-vacuous, and small.

### 5.16 Persisted record of the injection corpus

**Two artefacts, and neither carries an un-injected population big enough to be a prevalence.**

**`eval/agent_eval.json`** — `n_injections: 644`, with `detection.by_venue`:

| Venue | `n` (injected events) | `attributable` | `caught` | `missed` | `spurious` | recall |
|---|---|---|---|---|---|---|
| `beer_hall` | **356** | 307 | 290 | 66 | 24 | 0.8146 |
| `ellel` | **36** | 28 | 25 | 11 | 9 | 0.6944 |
| `two_river_taps` | **252** | 253 | 205 | 47 | 22 | — |
| **overall** | **644** | 588 | 520 | **124** | **75** | 0.8075 |

**`eval/injection_realism.json`** — `n_total: 120`, drawn from pools of 84 / 60 / 72:

| Kind | Records | beer_hall | ellel | two_river_taps |
|---|---|---|---|---|
| `regime_shift` | 64 | 38 | **0** | 26 |
| `spike` | 32 | 25 | **0** | 7 |
| `exo_coincident` | 24 | 8 | **0** | 16 |
| **total** | **120** | **71** | **0** | **49** |

**Ellel is entirely absent from the realism corpus** — 0 of 120 records — while carrying 36
injections in `agent_eval`. Enumeration, not inference: the `Counter` over `venue` on all three
record lists returns two keys.

**The un-injected side is one window per venue.** `eval/agent_eval.fatigue_metrics`
(`eval/agent_eval.py:318-336`) evaluates exactly one clean holdout per venue of
`inject._HORIZON_DAYS = 28` days:

| Venue | items surfaced on the un-injected window | window days |
|---|---|---|
| `beer_hall` | 3 | 28 |
| `ellel` | 3 | 28 |
| `two_river_taps` | 2 | 28 |
| **total** | **8** | 3 × 28 = 84 venue-days |

`per_week_upper_bound: 0.667`. The docstring is explicit that these *"may be genuine, so this
is an honest UPPER BOUND on the weekly false-alarm rate, not a count of known-false alerts"*.

**So: injected prevalence is recorded (644 events, 356/36/252 per venue). Un-injected
prevalence is not — there are 8 items over 84 venue-days with no labels on them.**

---

## Section 6 — The second target: transaction counts

### 6.17 Daily transaction count per venue

**Yes — it is already a column on the same view the revenue target is read from, over
identical date coverage. No new ingestion, no derivation.**

The column is `l1_daily.n_transactions:BIGINT`, defined in the view itself:

```sql
CREATE VIEW l1_daily AS SELECT venue, date, CAST(dayofweek(date) AS INTEGER) AS dow,
  sum(net_sales_exvat) AS revenue_exvat, sum(net_sales) AS revenue_raw,
  sum(gross_sales) AS gross_sales, sum(qty) AS units,
  count_star() AS n_line_items,
  count(DISTINCT transaction_id) AS n_transactions
FROM line_items WHERE (NOT excluded) GROUP BY venue, date;
```

| Venue | Rows | First | Last | Σ transactions | nulls | zeros | min | max | mean |
|---|---|---|---|---|---|---|---|---|---|
| `beer_hall` | **302** | 2025-06-04 | 2026-07-07 | 27,161 | **0** | **0** | 1 | 446 | 89.94 |
| `ellel` | **68** | 2025-06-08 | 2026-07-04 | 5,527 | **0** | **0** | 1 | 459 | 81.28 |
| `two_river_taps` | **280** | 2025-06-12 | 2026-05-08 | 19,958 | **0** | **0** | 4 | 461 | 71.28 |

**The row counts and the date bounds are identical to the revenue target's** (§2.2), because
they are the same rows of the same view. `fill_calendar` would zero-fill the count series onto
the same 399 / 392 / 331 calendar exactly as it does revenue — the reindex at
`store/warehouse.py:335` is on the frame, not on a column, so the behaviour transfers with no
new code. `read_series(venue, "L1", value="n_transactions")` already works: `value` is an
f-string parameter at `store/warehouse.py:307`.

**Integrity of the key.** `transaction_id` has **0 nulls and 0 empty strings** across all
93,400 `line_items` rows, and `count(DISTINCT transaction_id)` per venue reproduces the view's
totals exactly (27,161 / 5,527 / 19,958).

### 6.18 Mean basket value per venue per day

**Derivable with no new column: `revenue_exvat / n_transactions` on trading days.** Both
operands are on the same row of `l1_daily`, and `n_transactions` is never 0 or null on any
present row, so the quotient is defined on every one of the 302 / 68 / 280 rows. Mean of the
daily ratios:

| Venue | mean of daily `revenue_exvat / n_transactions` |
|---|---|
| `beer_hall` | £13.74 |
| `ellel` | £18.02 |
| `two_river_taps` | £6.91 |

TRT's figure sits on the ex-VAT basis after the 1/1.2 deflation of §2.3; a basket comparison
across venues inherits that working assumption.

### 6.19 Beer Hall descriptives — AD-HOC-UNVERIFIED

**Population: `l1_daily` rows for `beer_hall` with `revenue_exvat > 0` — traded days, n = 301.**
Not calendar-open. Indexed on the trading-day index (consecutive stream position), not on the
calendar. STL is `statsmodels.tsa.seasonal.STL(period=7, robust=True)`. Variance shares are
`var(component, ddof=1) / var(series, ddof=1)`.

| Quantity | mean | sd | **CV** | **DOW variance share, STL(7)** | **residual sd** | var(resid)/var(series) | acf(1) | acf(7) |
|---|---|---|---|---|---|---|---|---|
| **transaction count** | 90.229 | 61.388 | **0.6804** | **0.1762** | **52.652** | 0.7356 | 0.2439 | 0.0528 |
| **mean basket** | 13.785 | 36.394 | **2.6402** | **0.0125** | **33.056** | 0.8250 | 0.0603 | 0.2109 |

**Which series carries more day-of-week structure: the transaction count, by a factor of 14.**
Its STL seasonal component accounts for 17.62 % of series variance against mean basket's
1.25 %. The count is also the better-behaved series on every other axis measured here — a CV of
0.68 against 2.64, and a residual share of 0.74 against 0.83.

Two cautions on the basket column. Its CV above 2.6 with an sd (36.39) nearly three times its
mean (13.79) says the ratio has heavy upper tails — a low-transaction day divides a whole day's
revenue by a small integer. And its acf(7) exceeding its acf(1) is the pattern the recalled
note *variance inflation is decay, not level* warns about: do not read the lag-1 figure as
ordering these two series.

### 6.20 Does the item hierarchy have a transaction-count analogue?

**Yes for line-item frequency, and yes for a true transaction count, both by derivation. The
view does not expose either today.**

The 41 nodes are confirmed by calling the generator:
`hierarchy.reconcile.build_hierarchy("beer_hall")` returns **41 total nodes** — 1 `VENUE`,
8 `CAT::*`, **32 `ITEM::*`** bottom nodes (Ellel returns 28 / 21 for comparison). Node
selection is on **units**, `hierarchy/reconcile.py:70-80`.

The evidence that a count analogue exists:

| | |
|---|---|
| Beer Hall distinct items in `line_items` (not excluded, item not null) | **291** |
| Beer Hall line rows | **48,641** over **302** days |
| `l3_item_daily` rows for beer_hall | 18,994 estate-wide; the view exposes `units` and `revenue_exvat` **only** |
| Top item by line count | `Lager - BH` — 5,581 lines, 6,771 units, £27,536.94 |

So every named node has a countable line-item frequency (`count(*)` per item per day) and a
countable transaction frequency (`count(DISTINCT transaction_id)` per item per day) sitting in
`line_items`. Both are additive, so the `OTHER` residual node — which `build_hierarchy`
constructs by subtraction so items sum to their category exactly — carries over unchanged for
a count. **The work is one column added to `l3_item_daily`, not a data acquisition.**

**One distinction that must not be collapsed.** A line-item count and a transaction count are
different quantities at item grain: one transaction may carry several lines of the same item.
Whichever is chosen must be named in the field, or this becomes the next instance of
*field name is not a definition*.

---

## Section 7 — Series-level forecastability

### 7.21 The three daily revenue series — AD-HOC-UNVERIFIED

**Population: `l1_daily` rows with `revenue_exvat > 0` — traded days.** ACF is computed on the
trading-day index (consecutive stream position after dropping non-traded days), so lag 7 means
"seven trading days back", **not** "same weekday". At Ellel, which trades about 1.2 days a
week, those two are very different things and the lag-7 figure below should not be read as a
weekly seasonality estimate.

| Venue | **Length (trading days)** | mean | sd | **CV** | **acf(1)** | **acf(7)** |
|---|---|---|---|---|---|---|
| `beer_hall` | **301** | 776.02 | 611.08 | **0.7875** | **0.1594** | **0.0162** |
| `ellel` | **66** | 713.12 | 725.98 | **1.0180** | **−0.1337** | **−0.0666** |
| `two_river_taps` | **280** | 511.82 | 401.28 | **0.7840** | **0.4935** | **0.4432** |

### 7.22 Is any forecastability or entropy measure already computed in the repo?

**No.** Search scope: `rg` over the whole `brain/` tree, all file types, excluding
`.venv*`, `__pycache__`, `graphify-out/**` and `docs/LuneBrew_Brand_Kit/**`.

| Pattern | Hits | What they are |
|---|---|---|
| `forecastability` \| `tsfeatures` \| `catch22` | **1** | `knowledge/04_supervisor_evidence_pack.md:1843` — prose, *"the honest forecastability of an 82 %-zero venue"*. Not a computation. |
| `entropy` | **3** | All in `docs/Sample Dissertation.md` (lines 1287, 1293, 4395) — a maximum-entropy NER model in someone else's dissertation. |
| `spectral entropy` \| `spectral_entropy` | **0** | — |

**Nearest relative, and it is not the same thing.** `eval/marginal_acf_L1.json` exists and is
an ACF — but of the **loss differential vectors** (`headline_loss: rmsse`, `source_vectors`,
`estimator`, `max_lag`), computed to justify the MCS block bootstrap length. It measures serial
correlation in the *scores*, not predictability in the *series*.

**Second verification of the zero**, per the rule that a negative is confirmed a second way:
`graphify-out/graph.json` (14,483 nodes) was searched for node ids/labels/names matching
`forecastab|spectral|entropy`. **Zero true hits** — the 16 apparent matches were all
`clopper_pearson` caught by an `ears` substring in the composite regex, and each was inspected.

### 7.23 MCS set size per venue, placed beside §7.21

From `eval/mcs_L1_results.json` (`headline_loss: rmsse`, `block_len_primary: 7`,
`n_boot_primary: 1000`, common-fold basis). **No interpretation offered — the columns are
placed side by side as asked.**

| Venue | MCS folds | **MCS set size, α = 0.10** | **α = 0.25** | Trading days | CV | acf(1) | acf(7) |
|---|---|---|---|---|---|---|---|
| `beer_hall` | 273 | **5** | 3 | 301 | 0.7875 | 0.1594 | 0.0162 |
| `ellel` | 260 | **6** | 4 | 66 | 1.0180 | −0.1337 | −0.0666 |
| `two_river_taps` | 205 | **4** | 3 | 280 | 0.7840 | 0.4935 | 0.4432 |

Set membership at α = 0.10, for the record:

- `beer_hall` — `rung4_chronos_bolt, rung4_chronos2_exo, rung2_ets, rung4_chronos2, rung1_robust_dow`
- `ellel` — `rung4_chronos_bolt, rung1_robust_dow, rung4_chronos2_exo, rung4_chronos2, rung2_stl, rung2_ets`
- `two_river_taps` — `rung4_chronos2, rung4_chronos2_exo, rung4_chronos_bolt, rung2_ets`

`short_rungs` is `[]` at all three venues — no entrant was dropped for a short vector.

**Two scope notes that must travel with these numbers.** Ellel's headline loss is `rmse`
(and secondary `mae`), not `rmsse`/`mase`, because `config.VENUE_SCALE_BASIS["ellel"]` is
`unscaled` — so its mean-loss column is in currency and its set size is not directly comparable
to the other two. And the MCS folds (273/260/205) count rolling origins, while the trading-day
column counts observations; they are different axes.

---

## Section 8 — Cross-cutting integrity

### 8.24 Does the repo implement, import or vendor any of the named methods?

**Search scope: `rg` over the whole `brain/` tree, all file types, excluding `.venv*`,
`__pycache__`, `graphify-out/**`, `docs/LuneBrew_Brand_Kit/**`.** Every non-zero hit was
opened and read.

| Method | Patterns searched | Hits | Verdict |
|---|---|---|---|
| Murphy diagram | `[Mm]urphy` | 14 | **ABSENT.** All 14 are the stout `Murphy's` — an L3 item name in `sim/june2026_actuals_l3_raw.json` (12), `log/25` (1), `log/10` (1). |
| Elementary / extremal scoring function | `elementary scor`, `elementary_scor`, `extremal scor`, `extremal_scor`, `elementary quantile` | **0** | **ABSENT** |
| Exchangeability martingale | `martingale`, `Martingale` | **0** | **ABSENT** |
| Power martingale | as above | **0** | **ABSENT** |
| Ville threshold | `[Vv]ille` | 1 | **ABSENT.** The single hit is `Neville, Colin. 2010` in a docs bibliography. |
| **Average run length** | `ARL`, `ARL0`, `ARL_0`, `average run length` | 91 | **PRESENT AND IMPLEMENTED** — see below |
| Net benefit / decision curve | `net benefit`, `net_benefit`, `decision curve`, `decision_curve` | **0** | **ABSENT** |
| Farrington / EARS variant | `Farrington`, `farrington`, `\bEARS\b` | **0** | **ABSENT.** The earlier 21-hit count came from `EARLIER` and from base64 image data; both excluded. |
| Spectral entropy | `spectral entropy`, `spectral_entropy`, `entropy` | 3 | **ABSENT** — see §7.22 |

**ARL is the one that exists.** `eval/change_point_eval.py:4-5` states its job:
*"ARL0 calibration, sweep CUSUM h, measure mean trading-days between false alarms on noise
matched to the BH stable span; pick h for the target ARL0."* The measured value is pinned at
`config.py:372-375` as `CP_ARL0_EMPIRICAL_LB = 400`, a **right-censored lower bound** at the
400-day simulation horizon, and `eval/change_point_eval.py:110-113` reports that ARL₀ *"exceeds
the simulation horizon at every h"*. `FLAGS.md` FLAG-CP1 says the same and adds the consequence:
the binding constraint is detection **delay**, not false-alarm rate. So an alarm-management
programme inherits an ARL₀ that is a censored bound, not a point estimate.

**Second verification of every zero.** Three independent ways, all agreeing:
(i) `graphify-out/graph.json`, 14,483 nodes, searched for
`murphy|martingal|ville|elementary|extremal|net_benefit|decision_curve|farrington|spectral|entropy|forecastab`
in node id / label / name — 16 apparent hits, **all 16 inspected and all 16 false positives
from `clopper_pEARSon`**; (ii) `pip list` in both `.venv-eval` and `.venv-forecast` filtered on
`murphy|martingal|dca|dcurves|scoring|tsfeature|catch22|entropy|surveill|farrington` — **zero
packages** in either; (iii) the five `requirements*.txt` files read — the eval spec names only
`statsforecast`, `chronos-forecasting`, `torch`, `TSB-AD`, `vus`.

### 8.25 Every place a scoring function is chosen or a loss is defined

**Scope: `eval/harness.py` (the definitions), `models/ladder.py` (the selection),
`config.py` (the per-venue ruling), and the three consuming artefacts.** Consistency column
follows Gneiting's sense: which functional the loss is minimised by.

| Site | Loss | Consistent for |
|---|---|---|
| `eval/harness.py:157` | `mae` | **median** |
| `eval/harness.py:161` | `rmse` | **mean** |
| `eval/harness.py:165` | `smape` (zeros excluded by default) | **neither** — not consistent for any functional |
| `eval/harness.py:330` | `mase` = `mae` / seasonal-naive scale | **median** (a positive rescaling of MAE) |
| `eval/harness.py:346` | `rmsse` | **mean** — and the docstring says so: *"Squared scaled errors optimise for the mean rather than the median"* |
| `eval/harness.py:383` | `rmsse_m5` | **mean** |
| `eval/harness.py:589` | `winkler` (interval score at `level`) | the **interval / quantile pair** at α/2 and 1−α/2 |
| `eval/harness.py:605` | `_pinball(y, q_pred, q)` | the **q-quantile** |
| `eval/harness.py:610` | `mean_pinball` over the two interval quantiles | the **α/2 and 1−α/2 quantiles** |
| `eval/harness.py:445` | `VenueRuler.mase` | median |
| `eval/harness.py:449` | `VenueRuler.rmsse` | mean |
| `eval/harness.py:453` | `VenueRuler.rmsse_m5` | mean |
| **`models/ladder.py:436`** | `_score(...)` — **the choice point**: `basis == "unscaled"` → RMSE if `squared` else MAE; otherwise `harness.rmsse` if `squared` else `harness.mase` | **mean if `squared`, median otherwise** |
| `models/ladder.py:447` | `loss_names(venue)` → `("MAE","RMSE")` or `("MASE","RMSSE")` | naming only |
| `config.py` `VENUE_SCALE_BASIS` | selects `unscaled` (Ellel) vs `calendar_lag7_active` | selects the ruler, not the functional |
| `eval/fold_vectors.py:119-120` | primary `mase` / `mae`, secondary `rmsse` / `rmse` | median primary, mean secondary |
| `eval/mcs_L1_results.json` `headline_loss` | **`rmsse`** (`rmse` at Ellel) | **mean** |
| `eval/marginal_acf_L1.json` `headline_loss` | `rmsse` | mean |

**The finding this table produces, and it is the one that governs C1.** Every predictor that
could be served emits a **median** — Chronos-2-exo at `models/foundation.py:364`, Chronos-2 at
`:265`/`:276`, Chronos-Bolt at `:186`, and Rung-1 by definition at `models/ladder.py:188`. The
**headline loss the model confidence set is decided on is RMSSE, which is consistent for the
mean.** MASE, consistent for the median, is carried as the secondary. So the project's
principal model-selection instrument scores a median-emitting forecaster with a
mean-consistent loss.

That is not a defect this audit is asked to rule on, and it is not new information about
either loss — `eval/harness.py:356-358` states the RMSSE/mean relationship explicitly and gives
M5's reason for it. It is recorded here because a dominance study across consistent scoring
functions has to declare a functional before it can draw anything, and on the evidence above
the functional is the median while the incumbent headline loss is not consistent for it.

### 8.26 Is the test block untouched by anything other than final reporting?

**Two different "test blocks" exist under one name, and the question has a different answer
for each. Enumerated, not inferred.**

**Test block A — the four-block reconciliation split.** Defined at
`hierarchy/reconcile.py:279-281`:

```python
    test_start = calendar.max() - pd.Timedelta(weeks=TEST_WEEKS)
    cal_start  = test_start - pd.Timedelta(weeks=TEST_WEEKS)
    val_start  = cal_start - pd.Timedelta(weeks=TEST_WEEKS)
```

`config.py:247` — `TEST_WEEKS = 8`. `hierarchy/block_spans.py:52` labels the fourth block
*"test — reported; touched by nothing else"*, and `hierarchy/reconcile.py:407` states
*"No decision touches the test block, and no block does two jobs"*, with `:417` recording that
adoption **used to** run the contest on the test block and no longer does.

**Every file that computes or reads test block A** (`rg -e "TEST_WEEKS"`, all `.py`):

| File | Line(s) | What it does |
|---|---|---|
| `config.py` | 247 | defines `TEST_WEEKS = 8` |
| `hierarchy/reconcile.py` | 38, 272, 279–281, 306, 373, 407, 417, 577 | computes the split; predicts the test block; docstrings assert non-contamination |
| `hierarchy/block_spans.py` | 31, 43–45, 74, 88 | **recomputes** the boundaries with the same expression and writes `hierarchy/block_spans.json` for a figure. Fits nothing, calls no model. |
| `conformal/wrap.py` | 46, 291, 293 | `_persist_test_band` — persists the deployable band for the last `TEST_WEEKS` |
| `eval/harness.py` | 23, 52 | imports it as the default for `time_split` — that is block B |
| `sim/ab_split_measured.py` | 113 | recomputes `test_start` for the A/B split measurement |
| `compute/forward.py` | 5 | docstring only; persists the last `TEST_WEEKS` as its deliverable |
| `tests/test_a6_reconcile.py` | 11, 87, 259–260 | test fixture recomputing the same boundaries |

**Test block B — `harness.time_split`.** `eval/harness.py:48-72` holds out the last
`test_weeks` and validates on the `val_weeks` before it, asserting no leakage at `:69-70`.
Readers: `models/ladder.py:394-395` and `:768-770` (the static-horizon stress test),
`eval/harness.py:673-677` (its own `main`), `tests/test_a2_harness.py:47`.

**Verdict on the question as asked.** For block A, the enumeration supports the claim: the
readers are one computation site, one recomputation-for-a-figure site, one band-persistence
site, one measurement script, one docstring and one test. Nothing fits an estimator on it.
**Two caveats stated rather than smoothed over.** `hierarchy/block_spans.py` and
`sim/ab_split_measured.py` each **reimplement** the boundary arithmetic rather than importing
it — three independent copies of the same three lines, which is a drift surface, and
`block_spans.py`'s own docstring says it kept them as three lines deliberately. And
`conformal/wrap.py:291-293` writes a persisted artefact **over** the test block; that is
reporting under a reasonable reading, but it is a write, and any new candidate that consumes
`bands` or `forecasts` inherits it.

---

## Section 9 — Verdict table

| ID | Candidate | **Verdict** | The single fact that drove it | Effort |
|---|---|---|---|---|
| **C1** | Murphy diagram / forecast dominance across consistent scoring functions | **FEASIBLE-WITH-WORK** | **No per-origin point forecasts are persisted for any ladder entrant.** `models/ladder.py:498-504` computes `preds` and collapses it to two scalars on the same line; `eval/fold_vectors.py:97-109` persists only `fold_index`, `mase[]`, `rmsse[]`. Everything else the diagram needs is in place: the common origin set is confirmed (273/260/205, all 9 available rungs carry the full `fold_index`, zero NaN), the fold boundaries are persisted, and the functional is known and uniform (median — `models/foundation.py:364`, `:265`, `:186`; `models/ladder.py:188`). | **8–12 h.** ~2 h to emit `preds`/`yte` alongside the scores and bump `SCHEMA_VERSION`; **38 min of measured compute** to re-run (`wall_clock_s` 895.9 + 707.0 + 693.0 = 2,296 s); 5–8 h for the diagram, the elementary-score sweep and a declared functional. Add ~2 h if the mean/median mismatch in §8.25 has to be resolved rather than declared. |
| **C2** | Forecastability ceiling to explain flat MCS sets | **FEASIBLE** | The three series exist, complete and enumerated (§2.2, §7.21), and **no forecastability or entropy measure exists anywhere in the repo** — verified three ways (`rg`, the 14,483-node graph, `pip list` in both venvs). Nothing to reconcile against, nothing to acquire. | **4–6 h.** The MCS sets are already persisted (§7.23) so the comparison needs no re-run. Budget the time in the instrument, not the compute: this must be a committed tool with a fixture, and the trading-day-index vs same-weekday ambiguity in §7.21's acf(7) has to be settled explicitly at Ellel before any number is quoted. |
| **C3** | Alarm-management KPIs (EEMUA 191 / ISA-18.2) on the surfacing layer | **FEASIBLE-WITH-WORK** | **No fire log is persisted** — `eval/deviation_eval.md` holds 3 rows, the latest day per venue, and no store table carries deviations. But the stream regenerates in seconds from `signals.residual.build_residual_stream`, and the numbers are already in hand: 79 fires over 613 stream days (0.129/day), 23 preceded by a fire (29.1 %), longest run 4. | **5–8 h.** ~3 h for a persisted fire-log instrument with a scope line and an empty-scan guard; 2–5 h for the KPI mapping. **Price the Two River Taps problem in first:** 14 of its 37 fires and 15 of 37 zero-actual fires are the post-closure zero run alarming against a stale DOW median, so a chattering KPI computed estate-wide is measuring an artefact. ARL₀ already exists but is a **censored lower bound** (`config.py:375`, `CP_ARL0_EMPIRICAL_LB = 400`), not a point estimate. |
| **C5** | Transaction count as second target; footfall vs basket decomposition | **FEASIBLE** | `l1_daily.n_transactions` is **already a column on the same view, over identical date coverage** (302/68/280 rows, same min/max as the revenue target), with 0 nulls, 0 zeros, and a `transaction_id` key that has 0 nulls across all 93,400 line rows. `read_series(..., value="n_transactions")` works today. | **12–18 h.** The inputs cost nothing; the second target through the ladder is the work. Two facts to build against: the count carries **14× the day-of-week structure of mean basket** (STL(7) share 0.1762 vs 0.0125) and is far better behaved (CV 0.68 vs 2.64), so the decomposition is likely to be a count story; and the basket's acf(7) exceeding its acf(1) means lag-1 will mis-order the two series. |
| **C6** | Conformal test martingale on the existing rank stream | **FEASIBLE-WITH-WORK** | **Per-point ranks are not persisted — only `mean_rank`, three limb means and a 7-element per-step fraction.** But `eval/exchangeability_diagnostic.py:111-144` builds `ranks`, `states`, `steps`, `traded` index-aligned in one loop and holds the denominator `grp.size` at `:136`; all five are dropped at `:146-176`. Time order is the loop's own (`sorted(by_origin)` at `:113`, `sort_values("step")` at `:106`) and is independently reconstructible from `eval/exchangeability_scores.csv` (5,166 rows carrying `origin`, `step`, `target`). | **6–9 h.** The emission is a ~10-line change plus a re-run; `WARMUP_POOL = 140` and the expanding-pool rule are both already stamped in the artefact. **`grp.size` must be emitted, not just the rank** — a rank without its denominator is not a p-value, and it is the field most likely to be forgotten because the current output has no place for it. |
| **C7** | Mondrian group misspecification as a claimed finding | **FEASIBLE** | The signed counts are in hand from the **persisted** `eval/exchangeability_scores.csv`, and the sign the instrument does not compute is the large one. Beer Hall **+94 / −21**, Ellel **+21 / −1,037**, Two River Taps **+65 / −7**. The persisted limb (`n_calendar_closed_but_traded`) reproduced exactly at all three venues, which is the check that the ad-hoc count read the same population. | **4–6 h.** The measurement is done; the effort is the instrument and the write-up. **Ellel is the finding and it is not the number the diagnostic prints:** the persisted 4.04 % rate makes Ellel look like the cleanest partition of the three, while the unreported direction is 79.77 %. Both signs go in the instrument, or this recurs. |
| **C8** | Decision curve analysis / net benefit | **BLOCKED** | **The missing thing is a labelled un-injected event population with dates.** The only un-injected evaluation in the repo is `eval/agent_eval.fatigue_metrics` (`:318-336`): **one 28-day window per venue, 8 surfaced items over 84 venue-days, explicitly documented as an upper bound and not a count of known-false alerts.** Every labelled event in the corpus is injected by construction (644 in `agent_eval.json`; 120 in `injection_realism.json`, of which **0 are Ellel**), so any prevalence is an injection artefact — which is the precondition the candidate itself names. The probability limb is separately unmet: `eval/agent_calibration.py` operates on the agent's `p_raise`, not the detector's `z`, and **no `agent_calibration*` artefact exists on disk** (checked against the full 70-file enumeration). | **n/a — blocked.** Unblocking needs operator adopt-or-dismiss labels over a real un-injected window, which is `FLAG-BR1`-adjacent and is a third-party dependency, not a build task. |

---

## Section 10 — Unsolicited findings

Negative findings sit at the same prominence as positive ones.

**10.1 — The Mondrian partition-fidelity instrument reports one sign, and at Ellel it is the
small one.** Stated in §4.11 and repeated here because it is the finding a person planning two
weeks would most want. `_partition_fidelity` computes calendar-closed-but-traded (21 at Ellel,
4.04 %) and not calendar-open-but-took-nothing (**1,037 at Ellel, 79.77 %**). The instrument is
correct in what it reports and silent on a quantity 49× larger. This is the *field name is not
a definition* pattern one level out: the field is named for the whole property (`partition_fidelity`)
and computes half of it.

**10.2 — The residual stream's "trading days only" is a fourth population of `active`, and it
is not `y > 0`.** `signals/residual.py:83-85` docstrings promise *"trading days only (DOW-median
> 0), so structural-zero closed days don't distort the stream"*, and the admission test at `:100`
is `if exp_i <= _EPS: continue` — the **expanding DOW median**, not the day's takings. Measured
consequence: the stream carries **89 zero-actual rows at Two River Taps** and **31 of 55 at
Ellel**. `PRJ93_RULES.md` already records three live meanings of `active` across
`store/active_span.py`, `eval/exchangeability_diagnostic.py` and `eval/native_interval_probe.py`.
This is a fourth, in a fourth file, and it is the one the deviation and change-point detectors
both read.

**10.3 — Two River Taps is still generating deviations two months after it closed.** The venue's
last trading day is 2026-05-08. The detector fires on **2026-05-09 and then every Friday and
Saturday through 2026-07-03** — 14 fires, all on `actual == 0`, against a DOW median that still
remembers a trading venue. `eval/deviation_eval.md` reports TRT's latest day as 2026-07-05,
`actual 0.0`, `status normal`, band `−203.42 … 802.39`. This is FLAG-CP6 behaving as designed
(the zero run is appended so the closure is detectable) interacting with `is_closed` dormancy in
a way that leaves a closed venue producing 38 % of the estate's chatter. Any alarm-management
KPI computed estate-wide will be measuring this.

**10.4 — Ellel is entirely absent from the injection realism corpus.** `eval/injection_realism.json`
has `n_total: 120` across `regime_shift` (64), `spike` (32) and `exo_coincident` (24), and a
`Counter` over `venue` on all three record lists returns **two keys: `beer_hall` and
`two_river_taps`**. Ellel carries 36 injections in `agent_eval.json` but zero realism records.
The realism check therefore has nothing to say about the venue whose series is hardest, and any
claim of the form "injections were checked for realism" is true over two venues of three.

**10.5 — Three tables in the store are empty, and two of them are the promotion record.**
`served_forecast` (0 rows) and `ladder_selection` (0 rows). `CONTRACT.md` open decision 6
predicts exactly this for the **compute** path (*"`ladder_selection` comes back `[]` on every
call"*); this audit finds the same is true of the **research** store. Consequence for C1: there
is no persisted statement of which entrant is served at which venue, so a dominance study has to
derive the incumbent from `forecasts.model` (which names `conformal_rung2_ets` at all three
venues) rather than read it. `promo_calendar` is also empty, consistent with FLAG-FE9.

**10.6 — The Beer Hall's ingested net ex-VAT total has moved well past the figure `FLAGS.md`
records, and the ledger has not been updated.** `FLAGS.md` data caveat 5 records
*"ingested Beer Hall net ex-VAT = £202,087.69 vs the audit's £202,491 (Δ £403, 0.2 %)"*. The
store now sums to **£233,582.08** for `beer_hall` over non-excluded rows. This is almost
certainly not a defect — the store ceiling has advanced from the 2026-05-31 CSV seed to
2026-07-07, adding five weeks — but the ledger row carries no ceiling and reads as current. It
is the *ledger carrying a stale claim* pattern FLAG-FE1 was corrected for. Recorded, not fixed:
this session writes no ledger.

**10.7 — The ladder's headline model-selection loss is not consistent for the functional every
served entrant emits.** §8.25. RMSSE decides the model confidence set
(`eval/mcs_L1_results.json` `headline_loss: rmsse`); RMSSE is consistent for the mean and
`eval/harness.py:356-358` says so in terms; every servable predictor returns the 0.5 quantile.
MASE, which is consistent for the median, is the secondary. This is not new information about
either loss and no artefact misstates it — but a dominance study across *consistent* scoring
functions cannot proceed without declaring which functional is being evaluated, and the two
available answers point at different halves of the existing evidence.

**10.8 — Three independent copies of the four-block boundary arithmetic.**
`hierarchy/reconcile.py:279-281`, `hierarchy/block_spans.py:43-45` and
`sim/ab_split_measured.py:113` each recompute `test_start` from `config.TEST_WEEKS` rather than
importing one function. `block_spans.py`'s docstring records the choice as deliberate
(*"Kept as three lines rather than imported"*). It is a drift surface of exactly the shape
`PRJ93_RULES.md` warns about for facts duplicated across stores, and `tests/test_a6_reconcile.py:259-260`
is a fourth copy in the test that would have to catch the drift.

**10.9 — The attainable-size condition is confirmed clean on one path and uncounted on the
other.** §4.12. `conformal/wrap.py` tallies and reports it: 0 of 158 group bands clamped across
546 held-out points. The `eval/interval_calibration` / `exchangeability_diagnostic` path runs
over 5,166 pairs with a differently-constructed expanding pool and its artefact contains **zero
occurrences** of `undersized`, `min_calibration`, `attainab` or `n_calib`. C6 runs on that second
path. Untaken and uncounted are different things, and this one is uncounted.

**10.10 — `eval/exchangeability_scores.csv` is the only per-origin point-forecast-and-realised
matrix in `eval/`, and nothing in the audit brief's candidate list currently uses it as one.**
5,166 rows of `(venue, origin, step, target, y, yhat, res, state)` on the same origin sets as
the fold vectors, for `rung2_ets`. It is one model, so it cannot serve C1 — but it is a complete
single-entrant forecast record and it is what makes C6 and C7 cheap rather than expensive. It is
worth knowing it exists before anyone plans a re-run to produce something it already holds.

---

*End of report 83.*
