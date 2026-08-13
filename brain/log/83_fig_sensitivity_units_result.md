# log/83 — `fig_sensitivity` plots two different quantities on one axis, 2026-08-13

Closes the `BLOCKED_third_party.md` row *"`fig_sensitivity` plots three points a log axis
cannot place — OPEN, needs Phuong's ruling"*, and reports that the question the row asked
was the wrong one.

## 1 · The claim being superseded

Recorded verbatim from `figures/fig_sensitivity.py` as it stood at `7c518dd3`:

> NOTE: the Beer Hall's stock_drawdown points at mag -2.0, -1.0 and 0.0 are undefined on
> the log x-axis set below, so matplotlib places them at about x=-16000pt instead of
> dropping them. [...] Reported 2026-08-12 and NOT repaired here: every available repair
> -- filtering them, or moving to a symlog axis -- changes what this figure shows, which
> is Phuong's ruling and not a formatting pass's. Filtering was measured to move 651
> subpixels.

The ledger row carried the same framing: two lossy repairs, pick one, and the pick is a
human's. **Both candidate repairs would have left the real defect in place**, because both
treat the three parked points as a rendering problem and the other two as data.

## 2 · The code evidence

`brain/eval/agent_eval.py`, the scaled-run corpus builder:

```python
for kind in kinds:
    if kind == "stock_drawdown":
        for doc in config.EVAL_STOCK_COVER_GRID:
            corpus.append(inject.inject_stock_drawdown(
                venue, con, days_of_cover=doc, stream=stream, window=window))
    ...
    else:   # regime_shift | spike
        for z in config.EVAL_INJECT_Z_GRID:
```

`brain/config.py`:

```python
EVAL_INJECT_Z_GRID = (1.0, 1.25, 1.5, 2.0, 3.0, 4.0)
EVAL_STOCK_COVER_GRID = (2.0, 1.0, 0.0, -1.0, -2.0)   # days-of-cover: mildly low → clearly out
```

The `mag` field written into `agent_eval.json` is therefore **days of cover** for one kind
and a **standardised residual magnitude** for the other three. `agent_eval._magbin` already
knows this and branches on it:

```python
def _magbin(kind: str, mag: float) -> str:
    if kind == "stock_drawdown":
        return "in-cover (doc>0)" if mag > 0 else "out-of-cover (doc≤0)"
    if mag <= 1.25:
        return "near-threshold (|z|≤1.25)"
```

The evaluation harness keeps the two parameterisations apart. The figure did not.

## 3 · Three independent disqualifications, not one

| # | Property | Consequence on this axis |
|---|---|---|
| 1 | units are days of cover, not standardised residuals | the axis label `Injected magnitude (z)` is false for that series |
| 2 | severity **decreases** with x (2 days of cover is mild, −2 is clearly out) | the series runs backwards relative to the three z series beside it |
| 3 | three of five points are non-positive | undefined on the log scale; matplotlib parks them at x ≈ −16,324 pt rather than dropping them |

Only (3) has a symptom. (1) and (2) are silent, and they are the ones that reach a reader.

## 4 · The half that was legible was the worse half

`stock_drawdown` at the Beer Hall, read from `agent_eval.json`:

| `mag` (days of cover) | catch rate | n |
|---|---|---|
| −2.0 | 1.0 | 4 |
| −1.0 | 1.0 | 4 |
| 0.0 | 1.0 | 4 |
| 1.0 | 1.0 | 4 |
| 2.0 | 1.0 | 4 |

Two points survive the log filter — cover of 1 and 2 days — and land at x = 1 and x = 2 on
an axis labelled z. They are unremarkable, they sit on the grid the other kinds use, and
nothing about them looks wrong. **A repair that filtered the non-positive points would have
passed `formatcheck`, satisfied the ledger row, and shipped a series still claiming a
z-magnitude it does not have.** The defect with a symptom was hiding the defect without one.

## 5 · The repair, and why it is not a new judgement

`tab:vuspr` in `chapters/results.tex` already excludes this kind, and states why:

> The stock-drawdown kind is excluded, having no signature in the standardised residual
> stream.

So the document was **excluding stock drawdown from one float and mis-plotting it in the
next**, on the same underlying fact. Dropping it from `fig_sensitivity` makes the two floats
agree rather than introducing a new position. The result itself is not lost: it moves into
the text, in its own units — caught at all five levels of cover, on four windows each.

Body prose and the caption were both amended; the caption now points at `tab:vuspr` for the
exclusion rather than restating it.

## 6 · The guards that should have caught it, and had stopped working

Two defects in `figures/_style.py`, both found while repairing the above.

1. **`assert_no_ink_outside` read text only.** Its body was `page.get_text("dict")` filtered
   to `b["type"] == 0`. A parked marker is a *drawing*, so the guard passed a figure with ink
   16,324 pt off-canvas — while its name, and every caller reading that name, promised ink.
   Widened to `get_drawings()` on both axes. Measured across the committed estate before
   relying on it:

   | figure | worst drawing overshoot |
   |---|---|
   | `fig_drift`, `fig_estate`, `fig_nulls`, `fig_validity_efficiency`, `gap_map`, `ladder` | **0.00 pt** each |
   | `fig_sensitivity` (pre-repair) | **16324.44 pt** |

   Six clean and one dirty, separated by five orders of magnitude, so the 0.1 pt tolerance is
   not tuned to the case it was built for. This is the both-directions requirement met
   against real artefacts rather than fixtures.

2. **Both geometry guards were silent no-ops without pymupdf.** Each opened with
   `try: import pymupdf / except ImportError: return`. `brain/.venv-eval` carries duckdb,
   pandas and matplotlib and **not** pymupdf, so it is an interpreter a figure can plausibly
   be built in and in which neither guard runs. A guard that is off prints exactly what a
   guard that passed prints. Both now route through `_require_pymupdf`, which exits.

   This is the standing rule — *a check that examined nothing must not be able to report a
   clean result* — found inside the figure toolchain rather than in a checker, which is a
   fourth site for it after the scratchpad word counter, `latexcheck` and `venueordercheck`.

A tier-1 assertion was also added in `fig_sensitivity.py` itself: `min(mags) > 0`, since a
non-positive value on a log axis is arithmetic and belongs in the generator.

## 7 · What this is NOT evidence for

- **It is not a correction to any measured quantity.** `agent_eval.json` is untouched; no
  detection number in the document moves. The stock-drawdown catch rate was 1.0 at every
  level of cover before this and is 1.0 after.
- **It is not evidence that the other three series are correctly parameterised.** They were
  checked — all three sweep `EVAL_INJECT_Z_GRID` — but that check was three lookups, not an
  audit of every `mag` field in the artefact.
- **It says nothing about the Overleaf render.** Every verdict here is tier 2, TeX Live 2026
  locally.

## 8 · Verified end state

| Check | Result |
|---|---|
| `latexcheck` | PASS — 115 pages, 0 undefined refs, 0 undefined citations, 0 floats lost |
| `formatcheck` | **PASS** — 1 accepted spill (`and answers staff`, 3.51 pt), 0 unaccepted |
| counted body | **19,994**, and the compiled declaration page prints 19,994 |
| `completenesscheck` / `venueordercheck` / `figurecheck` | PASS |
| `dupcheck` | 51 spans; the weather-glossary span at `results.tex` 326/333 is gone |
| figure artefact | worst drawing overshoot **0.00 pt**; legend carries three kinds |

Page 58 was rendered and read, per the gate's own requirement that a clean verdict from the
tool is where a visual defect class starts rather than where it ends.
