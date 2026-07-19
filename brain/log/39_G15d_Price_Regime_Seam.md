# Report 39 - G15d: the last hardcoded Lune date on the tenant path

Date: 2026-07-19. Scope: the two de-Lune residuals G15d names. Low priority, run after
G15a to G15c came back clean.

## What was wrong

`config.PRICE_REGIME_BREAK = "2025-07-01"` is a Lune-specific fact: the Q2-2025 step
change in `Lager - BH` pricing. It was **reached on the tenant path**.
`features.build_features.calendar_features` stamped

```python
df["price_regime"] = (d >= pd.Timestamp(PRICE_REGIME_BREAK)).astype(int)
```

into **every** org's feature frame, so an unrelated tenant trained on a covariate that
flips on the date a Lancaster brewpub changed its beer prices. Phase 3's de-Lune table
missed it; report 35 surfaced it to Ryan as an open item.

It is the same species as the two Lune reads report 33 caught (`NaT` poisoning `is_closed`
and the hardcoded `"ellel"` slug): not a crash, a **plausible wrong number**. A spurious
regime flip is a free split point for `rung3_gbm` and a covariate for the Chronos exo
entrant, and nothing anywhere would say so.

## The change

`price_change_dates`, a per-org optional list, on `OrgProfile`. The feature becomes a
**count of price changes preceding each row** rather than a single binary flip:

```python
breaks = [pd.Timestamp(b) for b in org_profile.price_change_dates()]
df["price_regime"] = sum((d >= b).astype(int) for b in breaks) if breaks else 0
```

Resolution follows the seam's existing rule exactly, via a new
`org_profile.price_change_dates()` accessor:

| | resolves to | `price_regime` |
|---|---|---|
| **UNBOUND** (research path: `sim/`, CLIs, suite) | `(config.PRICE_REGIME_BREAK,)` | 0/1, flipping at 2025-07-01 |
| **BOUND, empty list** | `()` | flat 0, **no flip** |
| **BOUND, one date** | that date | 0/1 at the tenant's date |
| **BOUND, two dates** | both | 0/1/2 |

## Both constraints met

**Additive and optional.** `default_factory=list`, so an absent value is not a behaviour
change and the API needs to do nothing. Ryan has not built against the contract yet,
which makes this cheaper now than later, and it costs him nothing either way.

**Unbound resolves to Lune's single date.** This is the whole point of the seam and it is
the gate. With one date the counter takes values 0 and 1 only, which is byte-identical to
the flip it replaced. **Verified after the change, not before:**

| Venue | rows x cols | sha256[:16] | |
|---|---|---|---|
| `beer_hall` | 399 x 40 | `8c8a8be9d8dc5791` | unchanged |
| `two_river_taps` | 331 x 40 | `b6339032a219213c` | unchanged |
| `ellel` | 392 x 40 | `ea28bcacbf1825e4` | unchanged |

**A bound profile with an empty list produces no flip**, verified end to end through
`calendar_features` rather than only at the accessor
(`test_a_bound_profile_with_no_price_changes_gets_a_flat_regime`). This is the case that
matters: "empty means none, not unset" is the rule the whole seam rests on, and getting
it wrong here would hand a tenant Lune's repricing date exactly as the pre-G15d code did.

The list is bounded at `MAX_PRICE_CHANGE_DATES = 100` - every caller-controlled list is a
resource dimension, the round-3 lesson, applied without being asked. Price changes are a
business event, not a data stream; two years of monthly repricing is 24.

## `EXCLUDED_VENUES`

Resolved in G15a.3, not here. Deleted (exactly one occurrence in the tree, its own
definition), with the real mechanism documented at `FORECAST_VENUES`. Report 36 §3 and
FLAG-DEAD-CONSTANT carry it, including the part that made it worse than dormant: a
committed artefact credits the exclusion to it.

## One thing found while doing it

Removing the flip left `PRICE_REGIME_BREAK` imported into `build_features` and used by
nothing - a dead import created by the very change that closed a dead constant. Removed
in the same commit. Worth a line only because G15a.3 had just finished arguing that a
constant nothing reads is a defect, and the next edit produced one.

## Acceptance gates

| Gate | Status |
|---|---|
| Frame hashes unchanged: unbound still resolves to Lune's `2025-07-01` | **PASS**, verified after |
| A bound profile with an empty list produces no `price_regime` flip | **PASS**, verified through `calendar_features` |
| `CONTRACT.md` updated, addition flagged as additive and optional | **PASS** |
| Both suites green | **PASS**: `.venv` **391 / 8**, `.venv-forecast` **398 / 1** (+6/+6, the six new seam tests) |
| C2 re-scores | **PASS**: 0.285 / 0.287, coverage 1.00, `generalises: False` |

## Stop conditions

"The change cannot be made additive. Stop." - not reached. It is additive: a new field
with an empty default, no existing field changed, no existing behaviour changed when the
field is absent.

## Deviations

**(a) The feature generalised from a flag to a counter.** The spec asked for "a per-org
optional list of known price-change dates". A list of dates and a binary column cannot
both be honoured - two changes have three regimes, and collapsing them to 0/1 would
discard the second. The counter is the smallest generalisation that carries a list, and
it degenerates exactly to the old column at n=1, which is why the hashes hold. The column
name and dtype are unchanged.

**(b) Ruff was not run.** Reports 33 and 34 quote tree ruff counts, but ruff is not
installed in either venv on this machine (`No module named ruff` in both). Not treated as
a gate failure since it is an environment gap rather than a code one, but the ruff figure
in this report's lineage is unverified here and should not be quoted forward without
re-running it somewhere it exists.

## Reproduction

```
.venv-forecast/bin/python -m sim.frame_hash                # the gate
.venv/bin/python -m pytest tests/test_org_profile.py       # 30 passed
```
