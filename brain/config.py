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

# Raw source files. They live in brain/data/ (the canonical location); the
# repo-root fallback in _resolve is kept only for backwards compatibility with
# older checkouts that still have the files at the root.
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

# Per-venue ladder rung cap. Ellel has only ~64 booking-driven trading days —
# the Data Audit Report (§8.3) explicitly says do not attempt SARIMA/Prophet/
# neural models on it. So cap the ladder at Rung 1 (robust DOW × season), a
# deliberate scope substitution for the audit's event-characteristic regression
# (a reasonable stand-in given the data, not a bespoke event model). Default: no cap.
MAX_RUNG: dict[str, int] = {"ellel": 1}

# Booking/event-driven venues whose "structural zero" is not a fixed weekday
# (Mon/Tue) but *any* zero-revenue day — they simply have no sales most days.
# Used by store.active_span.is_closed (a trailing booking lull is sparsity, not
# a closure, so these are never flagged "closed"); the sMAPE harness also
# excludes all-zero days, which is correct for these too.
EVENT_ONLY_VENUES = frozenset({"ellel"})

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

# --- Stock / inventory (PRJ93 stock-integration spec) ------------------------
# Raw monthly bar-stock sheets live here (Beer Hall only — no TRT/Ellel sheets
# exist, FLAG-5). Brewery stocktakes share the dir but are cleaned to a separate
# out-of-scope table (FLAG-8).
STOCK_DIR = DATA_DIR / "stock"

# Days-of-cover reorder rule. Lead time + safety are working assumptions pending
# supplier confirmation (FLAG-3); reorder_cycle extends the order target ~1 week
# beyond the cover horizon.
STOCK_LEAD_TIME_DAYS = 3        # supplier lead time — CONFIRM with Ryan/James (FLAG-3)
STOCK_SAFETY_DAYS = 2          # buffer
STOCK_REORDER_CYCLE_DAYS = 7   # order to ~1 week beyond the cover horizon

# Keg-size → pints, refining A6's flat 88 (FLAG-4). 30 L kegs (most LuneBrew
# draught) yield ~52.8 pints; 50 L and unknown keep 88.
PINTS_PER_KEG = {30.0: 52.8, 50.0: 88.0}
PINTS_PER_KEG_DEFAULT = 88.0

# A product is "core" (stable range, cover-modelled) if it appears in ≥ this many
# of the 10 monthly snapshots. Guest/one-off kegs below this are flagged transient.
STOCK_CORE_MIN_SNAPSHOTS = 6

# Scope marker (mirrors EVENT_ONLY_VENUES): only these venues have stock sheets.
# Uses the canonical brain slug ('beer_hall', per VENUE_MAP) so stock joins the
# sales-side forecasts and the Track-B venue enum without a slug-translation seam.
VENUES_WITH_STOCK = ("beer_hall",)

# Map a stock keg line (product_canon, l1) to the A6 reconciliation L3 item node
# (the Square item name) that draws it down, so days-of-cover joins demand
# (forecast pints/day from A6) to on-hand (kegs from the latest stock snapshot).
# Evidence-based, clean brand matches that are actually in A6's forecast node set
# only. Generic sales items ("Lager - BH", "Cider - BH") span multiple keg brands,
# and items A6 buckets into OTHER are not forecast — both are left unmapped so the
# cover line carries NULL demand rather than a guessed attribution (spec §4.4/G5).
STOCK_A6_NODE_MAP: dict[tuple[str, str], str] = {
    ("lunebrew caravan of love", "Draught"): "Caravan of Love",
}

# --- Feature enrichment (A14) -----------------------------------------------
# Venue -> shared weather grid cell. Beer Hall and Ellel are ~0.6 km apart, so
# one Open-Meteo pull (cell="lancaster") serves both; TRT (closed, Preston-ish)
# is a separate cell. NB FLAG-FE-TRTLOC: the supplied TRT coordinate sits ~13 km
# north of Preston — confirm before trusting TRT weather/event attribution.
WEATHER_CELLS = {
    "beer_hall": "lancaster", "ellel": "lancaster", "two_river_taps": "trt_south",
}
WEATHER_CELL_COORDS = {
    "lancaster": (53.9955, -2.7867), "trt_south": (53.8751, -2.7599),
}
WEATHER_DAILY_VARS = ("temperature_2m_max", "precipitation_sum", "sunshine_duration")
# Training basis for the weather feature. The ablation sweeps all three; serving
# is always on a forecast basis (reality). "observed" = ERA5 reanalysis (clean,
# an upper bound only); "hindcast" = historical-forecast (matches serving);
# "leadmatched" = forecast as issued WEATHER_LEAD_DAYS ahead.
WEATHER_TRAIN_BASIS = "hindcast"          # {"observed","hindcast","leadmatched"}
WEATHER_LEAD_DAYS = 3                      # operational reorder lead for leadmatched
WEATHER_FORECAST_MAX_DAYS = 16            # live forecast horizon ceiling
WEATHER_DRY_MM = 1.0                      # exo_is_dry threshold

# Venue -> the event scope(s) it inherits. Lancaster anchors must never touch
# TRT; Preston anchors must never touch BH/Ellel.
EVENT_SCOPE = {
    "beer_hall": ("lancaster",), "ellel": ("lancaster",), "two_river_taps": ("preston",),
}
# PredictHQ token is read from os.environ["PREDICTHQ_TOKEN"] at call time — never
# stored or committed here. Absent -> the curated local_events table is used.

PROPHET_USE_REGRESSORS = False
# Columns the GBM rung may use once populated (the activated exogenous features).
ENRICH_FEATURES = (
    "exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs", "exo_is_dry",
    "exo_is_school_term", "exo_is_uni_term", "exo_fixture_nearby",
)
# is_spike_day threshold (Σdiscounts / Σgross_sales). Retrospective only — never
# a forward regressor (FLAG-FE9).
SPIKE_DISCOUNT_SHARE = 0.95

# --- Weather/calendar diagnostic (A14b) — diagnostic only, adopts nothing ----
BEER_GARDEN_TEMP_C = 20.0     # exo_beer_garden_day threshold (with WEATHER_DRY_MM)
WD_CLIMATOLOGY_WIN = 15       # ± days for the day-of-year temperature climatology
WD_L2_CATEGORIES = ()         # () = auto-pick top-volume beer_hall L2 categories
WD_MIN_SERIES_DAYS = 120      # skip series with fewer trading days (reported)

# --- Change-point / regime-shift detection (A13) ----------------------------
# Detect sustained shifts on the standardised conformal residual stream z_t.
CP_CUSUM_K = 0.5              # CUSUM slack (band-half units; min shift of interest)
CP_TARGET_ARL0 = 75          # target mean trading-days between false alarms
CP_CUSUM_H = 5.0             # CUSUM decision threshold — CALIBRATE to ARL0 (FLAG-CP1)
CP_RUN_M = 4                 # persistence: same-direction breaches required …
CP_RUN_N = 7                 # … within this trailing window of trading days
CP_BOCPD_HAZARD = 1 / 60.0   # BOCPD constant hazard (benchmark detector)
CP_MIN_SPAN_DAYS = 90        # min active trading days before A13 runs (else "insufficient")
CP_RELEARN_MIN_DAYS = 28     # post-change days before recalibration is attempted (T4 loop)
CP_LEVEL = 0.90              # conformal level whose half-band-width defines the z-scale
CP_ATTRIB_WINDOW_DAYS = 7    # ± days around an onset to scan the A14 seam for coincidences
CP_WARMUP_DAYS = 56          # expanding-window warmup before the residual stream starts
VENUES_FOR_CHANGEPOINT = ("beer_hall", "two_river_taps")  # Ellel persistence-only/excluded

# --- Point deviation (PRJ93 point-deviation spec) ---------------------------
# The per-day primitive: is a single trading day outside its 90% conformal band?
# Reuses CP_LEVEL (one confidence level) and the shared residual stream, so point
# severity and change-point evidence are on the same z-scale. Band-multiple rule
# (distinct from change-point's persistence-aware severity — FLAG-PD2).
DEV_BAND_K = 1.0        # |z| > 1 → outside the 90% conformal band
DEV_SEVERE_K = 2.0      # |z| > 2 → high severity
DEV_SCAN_WINDOW = 14    # trading days returned by scan()
# Ellel included: the shared stream excludes non-trading days, so deviation fires
# only on genuine trading days (FLAG-PD1).
VENUES_FOR_DEVIATION = ("beer_hall", "ellel", "two_river_taps")

# --- Proactive briefing (capstone) ------------------------------------------
# The synthesis layer: composes the four signals (point deviation, change-point,
# stock cover, checklist/SOP) into one ranked, de-duplicated, attributed daily
# feed. No new detection maths — every constant below is a knob on the synthesis
# (de-dup window, ranking weights, honesty gates), printed in the report so a
# reviewer can reproduce the ordering.
BRIEFING_VENUES = FORECAST_VENUES            # the three real venues
BRIEFING_MERGE_WINDOW_DAYS = CP_RUN_N        # cluster same-direction onsets within 7 days

# G5a — checklist/SOP data is template-only until Ryan's completion export lands.
# While False, checklist and SOP signals are excluded from the ranked feed and
# from scoring (never counted as a real miss). Flipping to True is a one-liner.
CHECKLIST_LIVE = False

# Ranking (§7). score = SOURCE_WEIGHT · SEVERITY_MULT · recency · novelty ·
# baseline_trust · direction_bump. Deterministic tie-break in briefing.py.
BRIEFING_SOURCE_WEIGHT = {
    "change_point": 1.00, "stock": 0.85, "deviation": 0.60,
    "checklist": 0.40, "sop": 0.35,
}
BRIEFING_SEVERITY_MULT = {
    "critical": 1.5, "high": 1.5, "medium": 1.0, "low": 0.6, "ok": 0.0,
}
BRIEFING_NOVELTY_FACTOR = {"new": 1.25, "continuing": 0.80, "resolved": 0.50}
BRIEFING_DIRECTION_BUMP = {"down": 1.10, "up": 1.00, "na": 1.00}
# G5b — a single-day deviation on a sparse (event-only) venue gets a narrow band
# that inflates z; down-weight and caveat it (the Ellel z=+6.22 reading).
BRIEFING_BASELINE_TRUST_SPARSE = 0.5
BRIEFING_RECENCY_FLOOR = 0.5                 # recency_factor floor at the window edge

# --- Live ingest / freshness / conditional retrain (three-tier model) --------
# T1 live facts (read now), T2 incremental store (append closed days), T3
# re-learn (ladder re-fit). A transaction only ever reaches T2; T3 fires on a
# weekly boundary or a confirmed change-point, never per transaction. All of this
# is INERT by default: the brain warehouses from the CSVs, not Square/Neon, until
# Ryan provisions access and LIVE_INGEST flips.
LIVE_INGEST = os.environ.get("LIVE_INGEST", "0") == "1"   # master gate; False today
INGEST_SOURCE = os.environ.get("INGEST_SOURCE", "csv")    # csv | neon | square
LIVE_CACHE_TTL_MIN = 10          # T1 per-(venue,metric,window) cache TTL (minutes)
INGEST_STALENESS_DAYS = 1        # source ahead of the watermark by > this → stale
RETRAIN_CADENCE_DAYS = 7         # T3 weekly boundary since the last fit
RETRAIN_ON_CHANGEPOINT = True    # T3 also fires on a confirmed change-point onset

# --- Service -----------------------------------------------------------------
BRAIN_HOST = os.environ.get("BRAIN_HOST", "127.0.0.1")
BRAIN_PORT = int(os.environ.get("BRAIN_PORT", "8088"))
