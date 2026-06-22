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
python -m conformal.wrap --all-venues
python -m hierarchy.reconcile
python -m transfer.lovo
python -m signals.chatlog_kb_gap
python -m signals.checklist_discipline
