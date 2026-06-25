#!/usr/bin/env bash
# Canonical full-pipeline run for the Proactive Brain, all three forecast venues.
# Keeps A4/A5 on --all-venues so /forecast is served for every venue and can't
# silently revert to Beer-Hall-only. Run from the brain/ directory.
set -euo pipefail
cd "$(dirname "$0")/.."

python -m ingest.normalise
python -m store.warehouse --build
python -m features.build_features
python -m models.ladder --all-venues
python -m ingest.stock_normalise        # A11 stock panel + master + agg (Beer Hall)
python -m conformal.wrap --all-venues
python -m hierarchy.reconcile           # A6 (headless first pass — no stock_cover yet)
python -m transfer.lovo
python -m signals.chatlog_kb_gap
python -m signals.checklist_discipline
python -m signals.stock_inventory       # A12 days-of-cover reorder (reads A6 forecasts)
python -m hierarchy.reconcile           # A6 re-run enriches its report with the stock-cover join
python -m ingest.exog_weather           # A14 weather (3 bases, Open-Meteo) — needs network
python -m ingest.local_events           # A14 curated local-event anchors
python -m ingest.spike_days             # A14 retrospective discount-spike flag
python -m signals.feature_ablation      # A14 ablation + weather train/serve study
python -m signals.weather_diagnostic    # A14b weather/calendar signal diagnostic (slow; diagnostic only)
