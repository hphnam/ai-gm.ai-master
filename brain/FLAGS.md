# FLAGS — standing flags, open confirmations, and data caveats

Flagged, not silently coerced (per the build contract). None of these block the
sales critical path (A0–A6); two are open confirmations off the critical path.

## ✅ Environment regression (RESOLVED — 22 Jun 2026)

Two raw source files briefly **disappeared from the repo-root working directory**
mid-session (OneDrive offload/desync; not deleted by any code change). The owner
has since **restored both** — duplicates had been left inside `brain/` and the
root copies are back in place:

- `items-2024-01-01-2026-06-01.csv` (the 77 MB Square export) ✅ present
- `Elliot's AI-GM Questions - Query result.csv` (the chat log) ✅ present

`opening_and_closing_checklist.md` had also vanished and was **restored verbatim**
during remediation (small static template). With all three files present the
full suite is green again: **69 passed** (A0 ingest + A8 chat KB-gap no longer
error). No code change was needed to recover.

## Open confirmations (off critical path)

1. **TRT VAT basis** — working assumption: Two River Taps `Net Sales` is
   VAT-inclusive, deflated by `1/1.2` into `net_sales_exvat` before any
   cross-venue/group use (`config.VAT_INCLUSIVE_VENUES`). **Owner to confirm.**
   Per-venue work is unaffected.
2. **Checklist completion capture (Ryan)** — A9 runs in **template-only mode**
   against `signals.checklist_discipline.synthetic_log()`. Ryan is building a new
   mobile-integrated capture system (not an export of the old
   `ChecklistStepCompletion` table); swap `synthetic_log()` for the real rows
   once that system starts accumulating data — the detector itself is unchanged
   either way.

## Standing flags (design decisions, not blockers)

3. **No research schema / time-series store** — by design, the brain persists
   its own history to `store/brain.duckdb` (the methodology's stated design
   contribution). Phase 2 runs off the CSV exports.
4. **Real stock data** — mock only; the ordering signal is served by the
   sales-derived **consumption proxy** (A6, L3 item units → implied kegs).
   Real-stock integration deferred.

## Data caveats

5. **BH L1 reconciliation** — ingested Beer Hall net ex-VAT = **£202,087.69**
   vs the audit's **£202,491** (Δ £403, 0.2%, within the 1% tolerance). Likely a
   minor difference in row-level filtering (voids/refunds) between this ingest
   and the audit; does not affect modelling.
6. **Chat-log** — **web** channel (not WhatsApp as the brief assumed), ~6 weeks
   / **25 active days**, single-owner (Elliot), no venue column. Treated as
   estate-wide; venue tagged from content. Failure rate **18.9%** reproduced.

## Environment / dependency notes

7. **xgboost / lightgbm** fail to load on this machine (macOS OpenMP runtime
   `libomp` absent). The Rung-3 GBM uses scikit-learn's native
   `HistGradientBoostingRegressor` instead — the ladder runs in full.
8. **Voyage** — `VOYAGE_API_KEY` unset here, so A8 uses the keyless **TF-IDF**
   fallback embedder. Semantic embeddings (Voyage) sharpen the SOP-gap clusters.
9. **Foundation models** (TimesFM / Chronos / Moirai) not installed — Rung 4 is
   **dropped per the Tan et al. ablation** (an unevaluable/unjustified backbone
   is not adopted). The global GBM remains the pooling baseline.

## Methodology results worth noting

- A4: over a static 8-week horizon the **robust DOW baseline is strongest**
  (MASE 0.704); in the operational 7-day rolling-origin regime, ETS/Prophet and
  the GBM beat both baselines — the milestone is met in the regime the brief
  actually needs.
- A7: shape-transfer beats per-venue-naïve **at cold-start (≤2 weeks)** and
  hands over to own-history as it accrues — the partial-pooling story.
- A6: item-level (L3) conformal bands under-cover (60.5% / 77.6%) — expected for
  sparse item series; the L1 band (A5) is the validated deliverable.
