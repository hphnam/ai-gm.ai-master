"""PRJ93 · A14 calendar sources — Lancashire school terms + Lancaster Uni terms.

Drop-in module for `brain/ingest/calendar_sources.py`. Pure-stdlib (no deps).
Feeds the exogenous calendar features in `features/build_features.py`:

    exo_is_school_term      = 1 on days Lancashire schools are in session
    exo_is_school_holiday   = 1 during holidays (incl. half-terms, May Day)
    exo_is_uni_term         = 1 during Lancaster Uni term (incl. Welcome Week)
    exo_uni_phase           = 'michaelmas' | 'lent' | 'summer' | 'vacation'

All dates are deterministic and known in advance, so these are leakage-free
regressors at any horizon (unlike weather).

SOURCES (verified 2026-06-25):
  • Lancashire County Council school term dates 2024/25–2027/28 (operator-supplied,
    matches LCC published calendar). CONFIRMED.
  • Lancaster University term dates 2024-25–2027-28. 2025-26–2027-28 from
    https://www.lancaster.ac.uk/about-us/term-dates/ ; 2024-25 operator-supplied
    (the official page has retired the past year). ALL CONFIRMED.

REFRESH: update each academic year; re-pull the official pages.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Union

DateLike = Union[date, datetime, str]


# ---------------------------------------------------------------------------
# Lancashire school HOLIDAYS — closed intervals [start, end] inclusive.
# Derived from the published term boundaries (holiday = day after a term ends
# through the day before the next term starts), plus half-terms and May Day.
# CONFIRMED for 2024/25 .. 2027/28.
# ---------------------------------------------------------------------------
SCHOOL_HOLIDAYS: list[tuple[date, date, str]] = [
    # ---- 2024/25 ----
    (date(2024, 10, 21), date(2024, 10, 25), "autumn_half_term"),
    (date(2024, 12, 21), date(2025, 1, 5),   "christmas"),
    (date(2025, 2, 17),  date(2025, 2, 21),  "spring_half_term"),
    (date(2025, 4, 5),   date(2025, 4, 21),  "easter"),
    (date(2025, 5, 5),   date(2025, 5, 5),   "may_day"),
    (date(2025, 5, 26),  date(2025, 5, 30),  "summer_half_term"),
    (date(2025, 7, 23),  date(2025, 8, 31),  "summer"),
    # ---- 2025/26 ----
    (date(2025, 10, 27), date(2025, 10, 31), "autumn_half_term"),
    (date(2025, 12, 20), date(2026, 1, 4),   "christmas"),
    (date(2026, 2, 16),  date(2026, 2, 20),  "spring_half_term"),
    (date(2026, 3, 28),  date(2026, 4, 12),  "easter"),
    (date(2026, 5, 4),   date(2026, 5, 4),   "may_day"),
    (date(2026, 5, 25),  date(2026, 5, 29),  "summer_half_term"),
    (date(2026, 7, 21),  date(2026, 8, 31),  "summer"),
    # ---- 2026/27 ----
    (date(2026, 10, 26), date(2026, 10, 30), "autumn_half_term"),
    (date(2026, 12, 19), date(2027, 1, 3),   "christmas"),
    (date(2027, 2, 15),  date(2027, 2, 19),  "spring_half_term"),
    (date(2027, 3, 26),  date(2027, 4, 11),  "easter"),
    (date(2027, 5, 3),   date(2027, 5, 3),   "may_day"),
    (date(2027, 5, 31),  date(2027, 6, 4),   "summer_half_term"),
    (date(2027, 7, 22),  date(2027, 8, 31),  "summer"),
    # ---- 2027/28 ----
    (date(2027, 10, 25), date(2027, 10, 29), "autumn_half_term"),
    (date(2027, 12, 18), date(2028, 1, 3),   "christmas"),
    (date(2028, 2, 14),  date(2028, 2, 18),  "spring_half_term"),
    (date(2028, 4, 1),   date(2028, 4, 17),  "easter"),
    (date(2028, 5, 1),   date(2028, 5, 1),   "may_day"),
    (date(2028, 5, 29),  date(2028, 6, 2),   "summer_half_term"),
    (date(2028, 7, 22),  date(2028, 8, 31),  "summer"),
]

# School data is authoritative from the first term start of 2024/25:
SCHOOL_COVERAGE_FROM = date(2024, 9, 2)
SCHOOL_COVERAGE_TO = date(2028, 7, 21)  # last confirmed term end


# ---------------------------------------------------------------------------
# Lancaster University TERM intervals — open intervals [start, end] inclusive,
# phase-labelled. is_uni_term = date in any interval. Welcome Week is folded
# into Michaelmas (students present).
# ---------------------------------------------------------------------------
UNI_TERMS: list[tuple[date, date, str]] = [
    # ---- 2024-25  CONFIRMED (operator-supplied; Summer split around Easter) ----
    (date(2024, 9, 30),  date(2024, 12, 13), "michaelmas"),   # incl. Welcome Week (30 Sep–4 Oct)
    (date(2025, 1, 10),  date(2025, 3, 21),  "lent"),
    (date(2025, 3, 24),  date(2025, 3, 28),  "summer"),       # week-1 teaching
    (date(2025, 4, 28),  date(2025, 6, 27),  "summer"),       # week-2 onwards
    # ---- 2025-26  CONFIRMED ----
    (date(2025, 9, 29),  date(2025, 12, 12), "michaelmas"),   # incl. Welcome Week (29 Sep)
    (date(2026, 1, 9),   date(2026, 3, 20),  "lent"),
    (date(2026, 4, 17),  date(2026, 6, 26),  "summer"),
    # ---- 2026-27  CONFIRMED ----
    (date(2026, 9, 28),  date(2026, 12, 11), "michaelmas"),   # incl. Welcome Week (28 Sep)
    (date(2027, 1, 11),  date(2027, 3, 19),  "lent"),
    (date(2027, 4, 19),  date(2027, 6, 25),  "summer"),
    # ---- 2027-28  CONFIRMED (Summer split around Easter) ----
    (date(2027, 9, 27),  date(2027, 12, 12), "michaelmas"),   # incl. Welcome Week (27 Sep–3 Oct)
    (date(2028, 1, 10),  date(2028, 3, 19),  "lent"),
    (date(2028, 3, 20),  date(2028, 3, 26),  "summer"),       # week-1 teaching
    (date(2028, 4, 24),  date(2028, 6, 25),  "summer"),       # week-2 onwards
]

# Uni data is CONFIRMED from 2024-09-30 (2024-25 academic year onward).
UNI_COVERAGE_CONFIRMED_FROM = date(2024, 9, 30)
UNI_COVERAGE_TO = date(2028, 6, 25)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _as_date(d: DateLike) -> date:
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    return datetime.fromisoformat(str(d)[:10]).date()


def is_school_holiday(d: DateLike) -> bool:
    dd = _as_date(d)
    return any(lo <= dd <= hi for lo, hi, _ in SCHOOL_HOLIDAYS)


def is_school_term(d: DateLike) -> bool:
    """True on days schools are in session (i.e. not a holiday). Weekends in
    term are still term — the DOW features carry the weekend effect."""
    return not is_school_holiday(d)


def is_uni_term(d: DateLike) -> bool:
    dd = _as_date(d)
    return any(lo <= dd <= hi for lo, hi, _ in UNI_TERMS)


def uni_phase(d: DateLike) -> str:
    dd = _as_date(d)
    for lo, hi, phase in UNI_TERMS:
        if lo <= dd <= hi:
            return phase
    return "vacation"


def coverage_gaps(min_date: DateLike, max_date: DateLike) -> dict:
    """Report where the requested span exceeds confirmed coverage, so the
    feature build can FAIL LOUD rather than silently default to 0.
    Call this in build_features and raise/log if gaps are non-empty."""
    lo, hi = _as_date(min_date), _as_date(max_date)
    gaps = {}
    if lo < SCHOOL_COVERAGE_FROM:
        gaps["school_before"] = (lo.isoformat(), SCHOOL_COVERAGE_FROM.isoformat())
    if hi > SCHOOL_COVERAGE_TO:
        gaps["school_after"] = (SCHOOL_COVERAGE_TO.isoformat(), hi.isoformat())
    if lo < UNI_COVERAGE_CONFIRMED_FROM:
        gaps["uni_before"] = (
            lo.isoformat(), UNI_COVERAGE_CONFIRMED_FROM.isoformat(),
            "No Lancaster Uni term data before 2024-09-30 (2023/24 year not loaded); "
            "supply it if training data extends earlier.",
        )
    if hi > UNI_COVERAGE_TO:
        gaps["uni_after"] = (UNI_COVERAGE_TO.isoformat(), hi.isoformat())
    return gaps


if __name__ == "__main__":
    # Smoke check
    samples = [
        ("2025-12-25", "Christmas Day"),
        ("2026-02-18", "spring half-term"),
        ("2026-05-20", "term-time Wed"),
        ("2025-10-15", "uni Michaelmas"),
        ("2026-07-15", "uni summer vacation? (term ends 26 Jun)"),
    ]
    for s, label in samples:
        print(f"{s} {label:30s} school_term={is_school_term(s)!s:5} "
              f"uni_term={is_uni_term(s)!s:5} phase={uni_phase(s)}")
    print("coverage gaps 2024-01-01..2026-06-01:",
          coverage_gaps("2024-01-01", "2026-06-01"))
