"""S12 C7 - the Mondrian partition available at forecast time against the one that governs
the score distribution.

The served band groups by `org_profile.structural_zero_dow`, a day-of-week structural-closure
calendar. That calendar encodes AVAILABILITY: whether the venue is scheduled to open. The
variable that actually governs the residual distribution is OCCURRENCE: whether the venue took
money. At a booking-driven venue they are different variables, and `_partition_fidelity` in
`eval.exchangeability_diagnostic` already measures one corner of the disagreement, the days the
calendar calls closed that traded anyway.

This measures the whole contingency and what it costs, which that function cannot: it reports
one direction of the misgrouping and no coverage at all.

The asymmetry is the finding rather than the partition. Occurrence is not knowable at forecast
time; a deployment can condition on the rota and not on the till. So the occurrence-partitioned
band computed here is an ORACLE that no deployment could build, and the contrast measures what
the available partition costs against an unavailable ideal. It is a measurement, not a proposal.

Two arms, one population, one difference:

  availability   the served grouping, `records["state"]`, unchanged.
  occurrence     the same pass with `state` replaced by 1{y <= 0}.

Both go through `interval_calibration.run_online`, so the pool ordering, the point forecasts,
the residuals, the warmup and `conformal.methods.mondrian_band` are shared and the grouping is
the only difference. Nothing is reimplemented and no band on any served path is touched.

THE REPRODUCTION CHECK is the load-bearing part. The scheduled-closed-but-traded cell of this
instrument's contingency must equal the persisted `n_calendar_closed_but_traded` exactly, as an
integer, at all three venues. If it does not, the two instruments are not looking at the same
population and no coverage figure below means anything. `verify_reproduction` raises rather
than warning, and `main` exits non-zero.

Run:
    .venv-forecast/bin/python -m eval.partition_contrast
"""

from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd

import config
import provenance
from eval import interval_calibration as ic
from eval.exchangeability_diagnostic import OUT_PATH as DIAGNOSTIC_PATH
from store.warehouse import assert_store_ceiling

OUT_PATH = config.BRAIN_DIR / "eval" / "partition_contrast.json"
LEVEL = ic.PRIMARY_LEVEL
VENUES = ic.VENUES

# The Mondrian arm of `run_online`. "P" is the ungrouped band, kept as the third comparator
# so a reader can see whether either partition beats no partition at all.
MONDRIAN_ARM = "D"
PLAIN_ARM = "P"

# (availability, occurrence) -> the name the report uses. availability 1 means the calendar
# calls this weekday closed; occurrence 1 means the till took nothing.
CELLS = {
    (0, 0): "open_traded",
    (0, 1): "open_took_nothing",
    (1, 0): "closed_traded",
    (1, 1): "closed_took_nothing",
}


def occurrence_state(records: pd.DataFrame) -> np.ndarray:
    """1 where the venue took nothing, matching `_partition_fidelity`'s `y > 0` split.

    The polarity is chosen to mirror the availability coding, where 1 is the
    expected-near-zero group, so the two arms are read the same way round.
    """
    return (records["y"].to_numpy(float) <= 0).astype(int)


def contingency(records: pd.DataFrame) -> dict:
    """The four cells, counts and shares, over whatever frame it is handed.

    Handed the full record frame this reproduces `_partition_fidelity`; handed the banded
    frame it describes the population the coverage figures are computed on. Both are
    reported, because the difference between them is the warmup and a reader should see it.
    """
    avail = records["state"].to_numpy(int)
    occur = occurrence_state(records)
    n = int(len(records))
    counts = {name: int(np.sum((avail == a) & (occur == o)))
              for (a, o), name in CELLS.items()}
    return {
        "n": n,
        "counts": counts,
        "shares": {k: (v / n if n else float("nan")) for k, v in counts.items()},
        "n_calendar_closed": int(np.sum(avail == 1)),
        "n_took_nothing": int(np.sum(occur == 1)),
        "n_disagreeing": counts["closed_traded"] + counts["open_took_nothing"],
        "disagreement_rate": ((counts["closed_traded"] + counts["open_took_nothing"]) / n
                              if n else float("nan")),
    }


def _cell_stats(covered: np.ndarray, width: np.ndarray) -> dict:
    """Coverage with an exact interval, and width, for one cell.

    Clopper-Pearson because cells here are small and several sit at 0 or n successes, where a
    Wald interval is degenerate. It is conservative, which is the right direction of error on
    a cell of eight observations. An empty cell returns nulls and says so; it is never
    backfilled with a marginal.
    """
    n = int(covered.size)
    if n == 0:
        return {"n": 0, "empty": True, "coverage": None, "ci": [None, None],
                "mean_width": None, "median_width": None}
    k = int(covered.sum())
    lo, hi = ic.clopper_pearson(k, n)
    return {"n": n, "empty": False, "coverage": k / n, "ci": [lo, hi],
            "mean_width": float(np.mean(width)), "median_width": float(np.median(width))}


def _arm_stats(banded: pd.DataFrame, avail: np.ndarray, occur: np.ndarray) -> dict:
    """Overall and per-cell coverage and width for one banded arm."""
    y = banded["y"].to_numpy(float)
    lo = banded["lo"].to_numpy(float)
    hi = banded["hi"].to_numpy(float)
    covered = (y >= lo) & (y <= hi)
    width = hi - lo
    out = {"overall": _cell_stats(covered, width), "cells": {}}
    for (a, o), name in CELLS.items():
        m = (avail == a) & (occur == o)
        out["cells"][name] = _cell_stats(covered[m], width[m])
    return out


def _align(banded: pd.DataFrame) -> pd.DataFrame:
    """Sort a banded arm into one canonical order so two arms can be compared row by row."""
    return banded.sort_values(["origin", "step"]).reset_index(drop=True)


def venue_contrast(venue: str) -> dict:
    """Both partitions over one calibration population, plus the reproduction check."""
    records = ic.generate_records(venue)

    avail_records = records
    occur_records = records.assign(state=occurrence_state(records))

    banded_avail = _align(ic.run_online(avail_records, LEVEL)[MONDRIAN_ARM])
    occur_pass = ic.run_online(occur_records, LEVEL)
    banded_occur = _align(occur_pass[MONDRIAN_ARM])
    banded_plain = _align(occur_pass[PLAIN_ARM])

    # The two arms must be the same observations in the same order, or a per-cell comparison
    # is comparing different days. Checked rather than assumed.
    keys_a = list(zip(banded_avail["origin"], banded_avail["step"]))
    keys_o = list(zip(banded_occur["origin"], banded_occur["step"]))
    if keys_a != keys_o:
        raise AssertionError(
            f"{venue}: the two partition passes banded different observations "
            f"({len(keys_a)} vs {len(keys_o)}); a per-cell contrast would be meaningless")

    # Cell membership is a property of the day, not of the arm, so it is taken once from the
    # availability pass and reused. `banded_avail["state"]` IS the availability label.
    banded_avail = banded_avail.assign(
        y=banded_avail["y"].astype(float))
    avail_lab = banded_avail["state"].to_numpy(int)
    occur_lab = occurrence_state(banded_avail)

    block = {
        "venue": venue,
        "point_model": ic.default_model(venue),
        "n_origins": int(records["origin"].nunique()),
        "contingency_records": contingency(records),
        "contingency_banded": contingency(banded_avail),
        "availability": _arm_stats(banded_avail, avail_lab, occur_lab),
        "occurrence": _arm_stats(banded_occur, avail_lab, occur_lab),
        "unpartitioned": _arm_stats(banded_plain, avail_lab, occur_lab),
    }
    block["deltas"] = cell_deltas(block)
    block["derived_rates"] = derived_rates(block)
    block["shortfall_attribution"] = shortfall_attribution(block)
    return block


def cell_deltas(block: dict) -> dict:
    """`coverage_under_availability - coverage_under_occurrence`, per cell and overall.

    The quantity the pre-registration (decision log row 108) predicted the sign of. Derived
    from the two arms already in `block` rather than recomputed from the store, so calling
    this on a persisted artefact gives the same answer as calling it during a build. A cell
    empty under either arm yields None rather than a zero, because "no difference" and "no
    observations" are not the same reading.
    """
    out = {}
    for name in (*CELLS.values(), "overall"):
        a = block["availability"]["cells"][name] if name != "overall" else block["availability"]["overall"]
        o = block["occurrence"]["cells"][name] if name != "overall" else block["occurrence"]["overall"]
        if a["coverage"] is None or o["coverage"] is None:
            out[name] = {"n": a["n"], "delta_coverage": None, "delta_mean_width": None}
            continue
        out[name] = {
            "n": a["n"],
            "delta_coverage": a["coverage"] - o["coverage"],
            "delta_mean_width": a["mean_width"] - o["mean_width"],
        }
    return out


def derived_rates(block: dict) -> dict:
    """Divergence expressed against each of the denominators it can be quoted against.

    The two are routinely confused and they differ by a factor of nearly two at Ellel. The
    UNCONDITIONAL rate is disagreeing cells over all calibration observations. The
    CALENDAR-OPEN rate is the share of the calendar-open group alone that took nothing, which
    is the quantity report 83 measured. Both are computed here so a claim can name which one
    it means instead of inheriting whichever was to hand.
    """
    out = {}
    for scope in ("contingency_records", "contingency_banded"):
        c = block[scope]["counts"]
        n = block[scope]["n"]
        open_group = c["open_traded"] + c["open_took_nothing"]
        closed_group = c["closed_traded"] + c["closed_took_nothing"]
        out[scope] = {
            "unconditional_divergence": (block[scope]["n_disagreeing"] / n) if n else None,
            "open_group_n": open_group,
            "open_group_took_nothing_rate": (c["open_took_nothing"] / open_group
                                             if open_group else None),
            "closed_group_n": closed_group,
            "closed_group_traded_rate": (c["closed_traded"] / closed_group
                                         if closed_group else None),
        }
    return out


def shortfall_attribution(block: dict, level: float = LEVEL) -> dict:
    """How much of a venue's coverage shortfall the misgrouped cells account for.

    Excess misses in a cell are `n * (level - coverage)` where that is positive. The share is
    the cell's excess over the arm's overall excess. Defined only where the arm under-covers
    overall: a venue that over-covers has no shortfall to attribute, and returning a ratio
    against a negative denominator would invent one. That case returns None and says why.
    """
    arm = block["availability"]
    n_total = arm["overall"]["n"]
    cov = arm["overall"]["coverage"]
    if cov is None or n_total == 0:
        return {"applicable": False, "reason": "no banded observations"}
    overall_excess = n_total * (level - cov)
    if overall_excess <= 0:
        return {"applicable": False, "overall_coverage": cov,
                "reason": "the availability arm over-covers overall, so there is no "
                          "shortfall to attribute"}
    cells = {}
    for name, c in arm["cells"].items():
        if c["coverage"] is None:
            cells[name] = {"n": 0, "excess_misses": None, "share_of_shortfall": None}
            continue
        excess = c["n"] * (level - c["coverage"])
        cells[name] = {
            "n": c["n"],
            "excess_misses": excess,
            "share_of_shortfall": excess / overall_excess,
        }
    return {"applicable": True, "level": level, "n_total": n_total,
            "overall_coverage": cov, "overall_excess_misses": overall_excess,
            "cells": cells}


def persisted_closed_but_traded() -> dict[str, int]:
    """The counts this instrument has to reproduce, read from the committed diagnostic."""
    with open(DIAGNOSTIC_PATH) as fh:
        d = json.load(fh)
    return {v: int(b["partition_fidelity"]["n_calendar_closed_but_traded"])
            for v, b in d["venues"].items()}


def verify_reproduction(venues: dict[str, dict]) -> dict:
    """The scheduled-closed-but-traded cell against the persisted count, per venue.

    Compared as integers with no tolerance. A mismatch means the two instruments are not
    reading the same population, so it raises instead of being recorded and stepped over.
    """
    persisted = persisted_closed_but_traded()
    rows = {}
    failures = []
    for venue, block in venues.items():
        want = persisted.get(venue)
        got = block["contingency_records"]["counts"]["closed_traded"]
        ok = want is not None and int(got) == int(want)
        rows[venue] = {"persisted": want, "measured": int(got), "match": bool(ok)}
        if not ok:
            failures.append(f"{venue}: persisted {want}, measured {got}")
    out = {"per_venue": rows, "all_match": not failures}
    if failures:
        raise AssertionError(
            "partition contrast does not reproduce the persisted "
            "n_calendar_closed_but_traded, so the two instruments are not reading the same "
            "population and nothing downstream is trustworthy: " + "; ".join(failures))
    return out


def build() -> dict:
    ceiling = assert_store_ceiling()
    venues = {v: venue_contrast(v) for v in VENUES}
    return {
        "artefact": "partition_contrast",
        "store_ceiling": ceiling,
        "level": LEVEL,
        "warmup_pool": ic.WARMUP_POOL,
        "mondrian_arm": MONDRIAN_ARM,
        "reproduction_check": verify_reproduction(venues),
        "provenance": provenance.runtime_stamp(),
        "venues": venues,
    }


def _fmt(v) -> str:
    return "-" if v is None else f"{v:.3f}"


def backfill_deltas() -> dict:
    """Add `deltas` to an artefact written before `cell_deltas` existed, without refitting.

    `cell_deltas` reads only the two arms' persisted coverage and width, so this yields the
    same numbers a fresh build would. It exists so a derived quantity can be added to a
    committed artefact without re-running a rolling-origin ETS pass over three venues, which
    would produce a byte-different file for no measurement reason.
    """
    out = json.loads(OUT_PATH.read_text())
    for block in out["venues"].values():
        block["deltas"] = cell_deltas(block)
        block["derived_rates"] = derived_rates(block)
        block["shortfall_attribution"] = shortfall_attribution(block)
    OUT_PATH.write_text(json.dumps(out, indent=2, default=str))
    return out


def main(argv: list[str]) -> int:
    if "--backfill-deltas" in argv:
        out = backfill_deltas()
        print(f"backfilled deltas into {OUT_PATH}")
    else:
        out = build()
        OUT_PATH.write_text(json.dumps(out, indent=2, default=str))
    print(f"store ceiling {out['store_ceiling']}  level {out['level']}  "
          f"warmup {out['warmup_pool']}")
    print("reproduction check:")
    for v, r in out["reproduction_check"]["per_venue"].items():
        print(f"  {v:<16} persisted {r['persisted']}  measured {r['measured']}  "
              f"{'MATCH' if r['match'] else 'MISMATCH'}")
    for v, b in out["venues"].items():
        c = b["contingency_records"]
        print(f"\n{v}  n={c['n']}  disagreement {c['n_disagreeing']} "
              f"({c['disagreement_rate']:.3f})")
        print(f"  {'cell':<20}{'n':>6}{'avail cov':>11}{'occur cov':>11}"
              f"{'avail w':>10}{'occur w':>10}")
        for name in CELLS.values():
            a = b["availability"]["cells"][name]
            o = b["occurrence"]["cells"][name]
            print(f"  {name:<20}{a['n']:>6}{_fmt(a['coverage']):>11}"
                  f"{_fmt(o['coverage']):>11}{_fmt(a['mean_width']):>10}"
                  f"{_fmt(o['mean_width']):>10}")
        a, o, p = b["availability"], b["occurrence"], b["unpartitioned"]
        print(f"  {'OVERALL':<20}{a['overall']['n']:>6}"
              f"{_fmt(a['overall']['coverage']):>11}{_fmt(o['overall']['coverage']):>11}"
              f"{_fmt(a['overall']['mean_width']):>10}"
              f"{_fmt(o['overall']['mean_width']):>10}")
        print(f"  unpartitioned overall coverage {_fmt(p['overall']['coverage'])} "
              f"width {_fmt(p['overall']['mean_width'])}")
    print(f"\nwrote {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
