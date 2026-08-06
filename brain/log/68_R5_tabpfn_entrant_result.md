# R5 result — ABORTED on a pre-registered condition, with one prediction salvaged

Run 2026-08-06. Pre-registered at decision-log **row 83**, commit **`473de1df`**, before
`eval/tabpfn_entrant.py` existed. The abort fired on a condition written in that row, and is
reported as an abort rather than re-described as a finding about forecasting.

## Outcome

**ABORTED.** Pre-registered abort condition *"model-weight download failure"* fired. Not a
timeout — wall clock at abort was under three minutes.

## The blocker, exactly

`tabpfn` **8.2.0**, `tabpfn/browser_auth.py:621`, raises `TabPFNLicenseError`:

> *"TabPFN requires a one-time license acceptance to download model weights for local
> inference, but no interactive terminal is available."*

The documented remedy is to register at `ux.priorlabs.ai`, accept the licence, and export a
`TABPFN_TOKEN`. So local inference is gated behind **third-party account provisioning**, not
behind compute. No account was created: that is the operator's decision to make, not the
agent's.

The other route is worse. `TabPFNTSPipeline` defaults to `TabPFNMode.LOCAL`, but the older
`TabPFNTimeSeriesPredictor.__new__` defaults to **`TabPFNMode.CLIENT`**, which posts the
series to a vendor API. This estate's daily revenue must not leave the machine, so CLIENT was
never an option — the evaluator pins `TabPFNMode.LOCAL` explicitly for exactly this reason
(`eval/tabpfn_entrant.py::_build_pipeline`), rather than trusting a default that differs
between two entry points in the same library.

## Prediction (i) — salvaged, because it never needed the model

The regime-fit claim in `sec:rw-rhythm` is checkable arithmetic, and it checks out.

| venue | folds (step 7) | min train rows | max train rows | inside 10,000-sample limit |
|---|---|---|---|---|
| beer_hall | 39 | 126 | **392** | yes |
| two_river_taps | 30 | 121 | **324** | yes |
| ellel | 38 | 126 | **385** | yes |

TabPFN's validated envelope is *"up to 10,000 samples and 500 features"*
(`hollmann_accurate_2025`). The estate's largest training window is **392 rows — 3.9% of the
sample limit**. TabPFN-TS's own feature width is `18 + 2k` (running index 1, calendar 17,
auto-seasonal 2k), far inside 500.

**Prediction (i) HOLDS.** The regime-fit argument is quantified rather than rhetorical: this
estate sits deep inside the envelope, not near its edge.

## Predictions (ii)–(v) — NOT TESTED

| # | Prediction | Status |
|---|---|---|
| (ii) | TabPFN-TS retained in the 90% MCS at Beer Hall | **NOT TESTED** — no model weights |
| (iii) | TabPFN-TS does not beat the incumbent at Ellel | **NOT TESTED** |
| (iv) | Mean and median arms differ measurably in bias | **NOT TESTED** |
| (v) | The served model does not change | **HOLDS trivially** — nothing ran, nothing changed |

None of (ii)–(iv) may be reported in any direction. An untested prediction is not a weak
result; it is an absent one.

## What the abort is actually worth, stated carefully

The honest framing is **not** "TabPFN-TS is unsuitable". Nothing here measures its accuracy.
What the attempt establishes is a **provisioning fact about the tool**, and it is checkable:

- Local inference on `tabpfn` 8.2.0 requires a vendor account and an exported token.
- The library's two entry points disagree on whether inference defaults to local or to a
  cloud API, and the cloud default transmits the series.

For a dissertation whose subject is a small-business system with no ML staff, that is a
relevant deployment observation and it belongs in the Discussion — framed as an **ecosystem
observation**, the same framing agreed for the Chronos-2 finding, not as a criticism of Prior
Labs. It should **not** be used to imply the model would have performed badly. Those are
different claims and only one of them has evidence.

## What would unblock it

One environment variable. If the operator accepts the licence at `ux.priorlabs.ai` and
provides `TABPFN_TOKEN`, `eval/tabpfn_entrant.py` runs unchanged — the evaluator, the folds,
the MCS, the paired bootstrap and the mean/median pair are all written and committed. The
pre-registration in row 83 stands and would be scored as written.

## Artefacts

| Item | State |
|---|---|
| `eval/tabpfn_entrant.py` | Written, committed, **unrun past fold 0** |
| `eval/tabpfn_entrant.json` / `.md` | **Not produced** — no run completed |
| `.venv-tabpfn` | Created and gitignored; `tabpfn_time_series` 1.2.0, `tabpfn` 8.2.0, plus `holidays` 0.100 / `duckdb` 1.5.4 pinned to match `.venv-forecast` |
| `.venv-forecast` | **Untouched.** The isolation was the point — R3 established these artefacts are environment-sensitive and unstamped |
