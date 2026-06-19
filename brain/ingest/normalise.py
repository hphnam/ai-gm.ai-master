"""A0 · Ingest & normalise.

Reads the UTF-16LE / TAB-separated Square item export, produces a tidy long
table at line-item grain (one row per source line item), and writes a manifest
recording counts, span, null rates and dropped rows. Nothing is silently
coerced — anything that cannot be parsed is dropped *with a reason* and counted
in the manifest.

Run:
    python -m ingest.normalise

Artefacts:
    store/line_items.parquet   the tidy long table
    store/manifest.json        reconciliation manifest + PASS/FAIL inputs
"""

from __future__ import annotations

import csv
import json
import re
import sys
from datetime import datetime, timezone

import pandas as pd

from config import (
    DATA_DIR,
    EXPECTED_ROW_COUNTS,
    EXPECTED_TOTAL_ROWS,
    MANIFEST_PATH,
    RECONCILE_TOL,
    STORE_DIR,
    TZ,
    VAT_INCLUSIVE_VENUES,
    VAT_RATE,
    VENUE_LABELS,
    VENUE_MAP,
    items_csv,
    vat_deflator,
)

LINE_ITEMS_PARQUET = STORE_DIR / "line_items.parquet"

# Source columns we keep. Everything else in the 36-column export is dropped.
_KEEP_COLUMNS = [
    "Date",
    "Time",
    "Category",
    "Item",
    "Price Point Name",
    "Qty",
    "Net Sales",
    "Gross Sales",
    "Discounts",
    "Tax",
    "Transaction ID",
    "Location",
    "Channel",
]

_CURRENCY_RE = re.compile(r"[£$,\s]")


def canonical_venue(location: str | None) -> str | None:
    """Map a raw `Location` string to a canonical venue slug (or None)."""
    if location is None:
        return None
    key = re.sub(r"\s+", " ", str(location).strip().strip('"')).lower()
    return VENUE_MAP.get(key)


def _clean_str(series: pd.Series) -> pd.Series:
    """Strip whitespace and Square's `""` empty-field markers; '' -> NA."""
    out = series.astype("string").str.strip().str.strip('"').str.strip()
    return out.replace({"": pd.NA})


def _parse_currency(series: pd.Series) -> pd.Series:
    """Parse '£5.00' / '-£5.00' / '(£5.00)' style money strings to float."""
    s = series.astype("string").str.strip().str.strip('"').str.strip()
    neg = s.str.startswith("(") & s.str.endswith(")")
    s = s.str.replace(r"^\((.*)\)$", r"\1", regex=True)
    s = s.str.replace(_CURRENCY_RE, "", regex=True)
    vals = pd.to_numeric(s, errors="coerce")
    return vals.mask(neg.fillna(False), -vals)


def _read_raw() -> pd.DataFrame:
    path = items_csv()
    # QUOTE_NONE: the export wraps empty fields in literal `""` rather than
    # using real CSV quoting; with tab delimiters no field contains a tab, so
    # disabling quote handling is safe and avoids misparsing embedded quotes.
    df = pd.read_csv(
        path,
        sep="\t",
        encoding="utf-16",
        dtype="string",
        quoting=csv.QUOTE_NONE,
        on_bad_lines="warn",
    )
    df.columns = [c.strip().strip('"') for c in df.columns]
    return df


def normalise() -> tuple[pd.DataFrame, dict]:
    """Return (tidy_long_table, manifest_dict). Pure — does not write files."""
    raw = _read_raw()
    total_source_rows = len(raw)

    missing = [c for c in _KEEP_COLUMNS if c not in raw.columns]
    if missing:
        raise ValueError(f"source missing expected columns: {missing}")

    df = pd.DataFrame(index=raw.index)
    df["transaction_id"] = _clean_str(raw["Transaction ID"])
    df["category"] = _clean_str(raw["Category"])
    df["item"] = _clean_str(raw["Item"])
    df["price_point"] = _clean_str(raw["Price Point Name"])
    df["channel"] = _clean_str(raw["Channel"])

    raw_location = _clean_str(raw["Location"])
    df["venue"] = raw_location.map(canonical_venue)
    df["venue_label"] = df["venue"].map(VENUE_LABELS)

    df["qty"] = _parse_currency(raw["Qty"])
    df["net_sales"] = _parse_currency(raw["Net Sales"])
    df["gross_sales"] = _parse_currency(raw["Gross Sales"])
    df["discounts"] = _parse_currency(raw["Discounts"])
    df["tax"] = _parse_currency(raw["Tax"])

    # Date + Time -> tz-aware Europe/London timestamp.
    date_s = _clean_str(raw["Date"])
    time_s = _clean_str(raw["Time"]).fillna("00:00:00")
    ts_naive = pd.to_datetime(
        date_s + " " + time_s, format="%Y-%m-%d %H:%M:%S", errors="coerce"
    )
    df["ts"] = ts_naive.dt.tz_localize(
        TZ, ambiguous="NaT", nonexistent="shift_forward"
    )
    df["date"] = pd.to_datetime(date_s, format="%Y-%m-%d", errors="coerce").dt.date

    # --- Drop tracking (flag, do not coerce) --------------------------------
    dropped_reasons: dict[str, int] = {}
    drop_mask = pd.Series(False, index=df.index)

    no_venue = df["venue"].isna()
    if no_venue.any():
        dropped_reasons["unknown_or_missing_venue"] = int(no_venue.sum())
        drop_mask |= no_venue

    no_date = df["date"].isna()
    if no_date.any():
        dropped_reasons["unparseable_date"] = int(no_date.sum())
        drop_mask |= no_date

    kept = df.loc[~drop_mask].copy()

    # VAT basis: a common ex-VAT net-sales column for cross-venue use (§7).
    deflator = kept["venue"].map(vat_deflator).astype(float)
    kept["net_sales_exvat"] = kept["net_sales"] * deflator
    kept["excluded"] = kept["venue"].isin(["events"])

    # --- Manifest -----------------------------------------------------------
    per_venue = kept["venue"].value_counts().to_dict()
    venue_count_match = all(
        int(per_venue.get(slug, 0)) == expected
        for slug, expected in EXPECTED_ROW_COUNTS.items()
    )

    null_cols = ["qty", "net_sales", "gross_sales", "discounts", "tax", "ts"]
    null_rates = {
        c: round(float(kept[c].isna().mean()), 6) for c in null_cols
    }

    net_by_venue = (
        kept.groupby("venue")["net_sales"].sum().round(2).to_dict()
    )
    net_exvat_by_venue = (
        kept.groupby("venue")["net_sales_exvat"].sum().round(2).to_dict()
    )

    total_kept = len(kept)
    reconciles = (
        abs(total_source_rows - EXPECTED_TOTAL_ROWS) <= EXPECTED_TOTAL_ROWS * RECONCILE_TOL
        and venue_count_match
    )

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_file": str(items_csv()),
        "total_source_rows": total_source_rows,
        "expected_total_rows": EXPECTED_TOTAL_ROWS,
        "total_kept_rows": total_kept,
        "total_dropped_rows": int(drop_mask.sum()),
        "dropped_reasons": dropped_reasons,
        "per_venue_counts": {k: int(v) for k, v in per_venue.items()},
        "expected_per_venue": EXPECTED_ROW_COUNTS,
        "venue_count_match": venue_count_match,
        "date_span": {
            "min": str(kept["date"].min()),
            "max": str(kept["date"].max()),
        },
        "null_rates": null_rates,
        "net_sales_total_by_venue": {k: float(v) for k, v in net_by_venue.items()},
        "net_sales_exvat_total_by_venue": {
            k: float(v) for k, v in net_exvat_by_venue.items()
        },
        "vat_rule": {
            "rate": VAT_RATE,
            "inclusive_venues": sorted(VAT_INCLUSIVE_VENUES),
            "note": "TRT Net Sales treated as VAT-inclusive; deflated by 1/1.2 "
            "into net_sales_exvat (working assumption — owner to confirm).",
        },
        "reconciles": reconciles,
    }
    return kept, manifest


def main() -> int:
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    df, manifest = normalise()
    df.to_parquet(LINE_ITEMS_PARQUET, index=False)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))

    print("A0 · ingest & normalise")
    print(f"  source rows         : {manifest['total_source_rows']}")
    print(f"  kept rows           : {manifest['total_kept_rows']}")
    print(f"  dropped rows        : {manifest['total_dropped_rows']} "
          f"{manifest['dropped_reasons'] or ''}")
    print(f"  date span           : {manifest['date_span']['min']} -> "
          f"{manifest['date_span']['max']}")
    print(f"  per-venue counts    : {manifest['per_venue_counts']}")
    print(f"  venue counts match  : {manifest['venue_count_match']}")
    print(f"  null rates          : {manifest['null_rates']}")
    print(f"  net £ by venue      : {manifest['net_sales_total_by_venue']}")
    print(f"  parquet             : {LINE_ITEMS_PARQUET}")
    print(f"  manifest            : {MANIFEST_PATH}")

    ok = bool(manifest["reconciles"])
    print(f"A0 RESULT: {'PASS' if ok else 'FAIL'} "
          f"(reconciles={manifest['reconciles']})")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
