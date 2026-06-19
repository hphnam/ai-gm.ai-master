"""Central configuration for the Proactive Brain (Track A).

Paths, the canonical venue map, the VAT rule, and modelling constants live here
so every module reads the same source of truth. No secrets — the Voyage key is
read from the environment at call time (signals/chatlog_kb_gap.py).
"""

from __future__ import annotations

import os
from pathlib import Path
from zoneinfo import ZoneInfo

# --- Paths -------------------------------------------------------------------

BRAIN_DIR = Path(__file__).resolve().parent
REPO_ROOT = BRAIN_DIR.parent
DATA_DIR = BRAIN_DIR / "data"
STORE_DIR = BRAIN_DIR / "store"

DUCKDB_PATH = STORE_DIR / "brain.duckdb"
MANIFEST_PATH = STORE_DIR / "manifest.json"
FLAGS_PATH = BRAIN_DIR / "FLAGS.md"

# Raw source CSVs. We read from brain/data (symlinked to repo root) if present,
# otherwise fall back to the repo root copies so the pipeline runs either way.
_ITEMS_NAME = "items-2024-01-01-2026-06-01.csv"
_CHAT_NAME = "Elliot's AI-GM Questions - Query result.csv"
_CHECKLIST_NAME = "opening_and_closing_checklist.md"


def _resolve(name: str) -> Path:
    local = DATA_DIR / name
    if local.exists():
        return local
    return REPO_ROOT / name


def items_csv() -> Path:
    return _resolve(_ITEMS_NAME)


def chat_csv() -> Path:
    return _resolve(_CHAT_NAME)


def checklist_md() -> Path:
    return _resolve(_CHECKLIST_NAME)


# --- Time --------------------------------------------------------------------

TZ = ZoneInfo("Europe/London")

# --- Venue map ---------------------------------------------------------------
# Canonical slug per raw `Location` string. Matching is done case-insensitively
# on a whitespace-collapsed key (see ingest.normalise.canonical_venue).
VENUE_MAP: dict[str, str] = {
    "the beer hall": "beer_hall",
    "two river taps": "two_river_taps",
    "ellel village hall": "ellel",
    "events": "events",
}

# Human labels for reporting / API responses.
VENUE_LABELS: dict[str, str] = {
    "beer_hall": "The Beer Hall",
    "two_river_taps": "Two River Taps",
    "ellel": "Ellel Village Hall",
    "events": "Events",
}

# The donor of rhythm shape (richest, cleanest series).
ANCHOR_VENUE = "beer_hall"

# Excluded from forecasting (too sparse, not a trading venue in the usual sense).
EXCLUDED_VENUES = frozenset({"events"})

# Forecast targets — the three real venues.
FORECAST_VENUES = ("beer_hall", "two_river_taps", "ellel")

# Expected per-venue line-item counts (the profiled audit figures). A0 asserts
# the ingest reconciles to these within a small tolerance.
EXPECTED_ROW_COUNTS: dict[str, int] = {
    "beer_hall": 47644,
    "two_river_taps": 33993,
    "ellel": 10489,
    "events": 203,
}
EXPECTED_TOTAL_ROWS = 92329

# The audit's Beer Hall L1 net-sales (ex-VAT) total — A1/A3 reconcile to this.
BH_NET_SALES_TOTAL = 202491.0
# Reconciliation tolerance as a fraction of the target (rounding + dropped rows).
RECONCILE_TOL = 0.01

# --- VAT rule (methodology §7) ----------------------------------------------
# Two River Taps `Net Sales` is treated as VAT-INCLUSIVE; deflate by 1/1.2
# before any cross-venue / group-level use. The Beer Hall and Ellel `Net Sales`
# are already ex-VAT. This is a working assumption pending owner confirmation
# (standing flag — see FLAGS.md).
VAT_RATE = 0.20
VAT_INCLUSIVE_VENUES = frozenset({"two_river_taps"})


def vat_deflator(venue: str) -> float:
    """Multiplier to convert a venue's Net Sales to a common ex-VAT basis."""
    return 1.0 / (1.0 + VAT_RATE) if venue in VAT_INCLUSIVE_VENUES else 1.0


# --- Calendar / regime flags (features) -------------------------------------
# Happy Hour: Wednesday & Friday 16:00–22:00 (methodology §2 / audit).
HAPPY_HOUR_DAYS = frozenset({2, 4})  # Mon=0 ... Sun=6
HAPPY_HOUR_START_HOUR = 16
HAPPY_HOUR_END_HOUR = 22

# Structural-zero trading days (venue typically closed Mon & Tue at L1).
STRUCTURAL_ZERO_DOW = frozenset({0, 1})

# Price-regime break for `Lager - BH` (Q2 2025 step change). Dates on/after
# this boundary are flagged regime=1 in the feature table.
PRICE_REGIME_BREAK = "2025-07-01"

# --- Evaluation defaults -----------------------------------------------------
TEST_WEEKS = 8           # held-out test horizon (last N weeks)
VAL_WEEKS = 4            # validation slice immediately before the test span
SEASONAL_PERIOD = 7      # weekly seasonality for the seasonal-naive denominator
CONFORMAL_LEVELS = (0.80, 0.90)
COVERAGE_TOL_PP = 3.0    # allowed deviation from nominal coverage, percentage pts

# --- Signals -----------------------------------------------------------------
# Observed chat-log failure-rate baseline (methodology §4.1).
CHATLOG_FAILURE_BASELINE = 0.189
VOYAGE_MODEL = "voyage-3.5"

# --- Service -----------------------------------------------------------------
BRAIN_HOST = os.environ.get("BRAIN_HOST", "127.0.0.1")
BRAIN_PORT = int(os.environ.get("BRAIN_PORT", "8088"))
