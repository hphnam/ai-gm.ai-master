"""S3 G17c - the Model Confidence Set (Hansen, Lunde and Nason 2011).

The ladder selects a served model by the argmin of mean rolling MASE. At six folds
that argmin had no significance test attached at all (the Harvey-Leybourne-Newbold
correction is algebraically zero at n=6, h=7; report 43). S2 lifted the fold count to
273/260/205 overlapping origins, at which a test becomes computable. This module runs
it: it takes the per-fold loss vectors S2 persisted and returns, per venue, the set of
models the data cannot distinguish from the best at a stated confidence level.

The procedure, exactly as pre-registered in decision-log row 33:

  * statistic   T_R, the range: max over pairs of |t_ij|, t_ij = dbar_ij / sd(dbar_ij)
  * elimination e_R = argmax_i sup_j t_ij, matched to the statistic
  * bootstrap   moving block, because consecutive origins at step 1 share six of
                seven days and the loss differentials are serially correlated by
                construction, so an iid resample would understate their variance
  * block len   l = 7 primary (the horizon is the mechanical source of the overlap)
  * levels      alpha in {0.10, 0.25}; NOT 0.05, which has no power at these n

Two properties are load-bearing and are what the synthetic gates in
`tests/test_a2_mcs.py` pin:

  1  The bootstrap resamples FOLDS JOINTLY across models. One index draw per
     replication is applied to every model, so the cross-model correlation that
     shrinks the paired variance survives the resample. Resampling each model
     independently would destroy it and inflate every set.
  2  One elimination sequence is computed and then thresholded at each alpha, rather
     than re-running per alpha. The MCS p-value is monotone in the elimination order,
     so the 0.25 set is a subset of the 0.10 set BY CONSTRUCTION. A model retained at
     0.25 but eliminated at 0.10 is therefore impossible, which is exactly the S3 stop
     condition; making it structurally impossible is stronger than asserting it after.

Run:
    .venv-forecast/bin/python -m eval.mcs            # all three venues, both runs
    .venv-forecast/bin/python -m eval.mcs beer_hall  # one venue
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field

import numpy as np

import config
from eval import fold_vectors
from store.warehouse import StoreCeilingError

# Pre-registered defaults (decision-log row 33). Overridable for the sensitivity
# sweep, fixed here so a bare run reproduces the headline numbers.
BLOCK_LEN = 7
N_BOOT = 1000
ALPHAS = (0.10, 0.25)
BLOCK_LEN_SENSITIVITY = (2, 7, 14, 21)
N_BOOT_SENSITIVITY = (1000, 5000)
# A fixed seed makes the bootstrap reproducible; the report states it so an
# independent rerun lands on the same sets. Shares the project's scaled-eval seed.
SEED = config.EVAL_SCALED_SEED  # 93


# --- Loss matrix assembly ----------------------------------------------------

def available_rungs(payload: dict) -> list[str]:
    """Rung names with a scored vector, in (rung, name) order for a stable axis."""
    scored = [(r["rung"], name) for name, r in payload["rungs"].items()
              if r.get("available")]
    return [name for _, name in sorted(scored)]


def common_loss_matrix(
    payload: dict, rungs: list[str], metric: str = "mase"
) -> tuple[list[str], list[int], np.ndarray]:
    """Losses for `rungs` on the folds EVERY rung scored, as an aligned matrix.

    The MCS requires every model evaluated on identical data, so a rung that skipped
    folds (Ellel `rung4_chronos2_exo`, 246 of 260) narrows the common set for all.
    Pairing is by fold INDEX, never by list position, for the reason `aligned_pair`
    exists. Returns (rungs, common_fold_indices_sorted, L) with L shaped (T, M).
    """
    per_rung = {}
    for name in rungs:
        r = payload["rungs"][name]
        if not r.get("available"):
            raise ValueError(f"{name} has no scored vector for this venue")
        per_rung[name] = dict(zip(r["fold_index"], r[metric], strict=True))

    common = sorted(set.intersection(*(set(d) for d in per_rung.values())))
    if not common:
        raise ValueError("no fold is scored by every requested rung")

    L = np.array([[per_rung[name][i] for name in rungs] for i in common], dtype=float)
    if not np.isfinite(L).all():
        raise ValueError("non-finite loss in the common-fold matrix")
    return list(rungs), common, L


# --- Moving block bootstrap --------------------------------------------------

def moving_block_indices(
    n_obs: int, block_len: int, n_boot: int, rng: np.random.Generator
) -> np.ndarray:
    """`n_boot` resamples of `n_obs` fold indices, each built from moving blocks.

    Overlapping blocks of `block_len` consecutive positions with start drawn
    uniformly from 0..n_obs-block_len, concatenated and truncated to n_obs. The block
    carries the serial correlation of the overlapping windows through the resample.
    """
    if block_len < 1:
        raise ValueError("block_len must be >= 1")
    block_len = min(block_len, n_obs)
    n_blocks = int(np.ceil(n_obs / block_len))
    max_start = n_obs - block_len
    out = np.empty((n_boot, n_obs), dtype=int)
    for b in range(n_boot):
        starts = rng.integers(0, max_start + 1, size=n_blocks)
        idx = np.concatenate([np.arange(s, s + block_len) for s in starts])
        out[b] = idx[:n_obs]
    return out


# --- The set -----------------------------------------------------------------

@dataclass
class McsResult:
    names: list[str]
    metric: str
    block_len: int
    n_boot: int
    seed: int
    n_folds: int
    mcs_pvalue: dict[str, float]
    elimination: list[dict] = field(default_factory=list)  # oldest-eliminated first
    mean_loss: dict[str, float] = field(default_factory=dict)

    def set_at(self, alpha: float) -> list[str]:
        """Models retained at level alpha: MCS p-value >= alpha, in mean-loss order.

        Thresholding the single monotone p-value guarantees set_at(0.25) is a subset
        of set_at(0.10); the sets are never recomputed per alpha.
        """
        kept = [m for m in self.names if self.mcs_pvalue[m] >= alpha]
        return sorted(kept, key=lambda m: self.mean_loss[m])

    def eliminated_at(self, alpha: float) -> list[str]:
        return [m for m in self.names if self.mcs_pvalue[m] < alpha]


def _pvalue_and_worst(
    means: np.ndarray, boot_means: np.ndarray
) -> tuple[float, int, float]:
    """T_R p-value for equal predictive ability, and the e_R worst index.

    `means` is (m,) full-sample loss means for the active set; `boot_means` is
    (B, m). Pairwise standardised differentials use the bootstrap variance of the
    differential, and the resample is shared across models so their correlation is
    preserved.
    """
    d = means[:, None] - means[None, :]                       # (m, m) dbar_ij
    bd = boot_means[:, :, None] - boot_means[:, None, :]       # (B, m, m)
    var = bd.var(axis=0, ddof=1)                              # (m, m)
    ok = var > 0
    sd = np.where(ok, np.sqrt(var), 1.0)
    t = np.where(ok, d / sd, 0.0)                            # (m, m) signed
    t_obs = float(np.abs(t).max())
    centred = np.where(ok, (bd - d) / sd, 0.0)               # (B, m, m)
    t_boot = np.abs(centred).reshape(boot_means.shape[0], -1).max(axis=1)
    pvalue = float(np.mean(t_boot >= t_obs))
    worst = int(np.argmax(t.max(axis=1)))                    # argmax_i sup_j t_ij
    return pvalue, worst, t_obs


def model_confidence_set(
    names: list[str], L: np.ndarray, *, metric: str = "mase",
    block_len: int = BLOCK_LEN, n_boot: int = N_BOOT, seed: int = SEED,
) -> McsResult:
    """The MCS elimination sequence and per-model MCS p-values.

    Eliminates to a single survivor recording the test p-value at each step; the MCS
    p-value of a model is the running maximum up to its elimination, which is what
    makes the level-alpha sets nested. Thresholds are applied later by `set_at`.
    """
    names = list(names)
    T, m = L.shape
    if m < 2:
        raise ValueError("need at least two models")
    rng = np.random.default_rng(seed)
    resample = moving_block_indices(T, block_len, n_boot, rng)   # (B, T)
    full_means = L.mean(axis=0)                                  # (M,)
    boot_means_all = L[resample].mean(axis=1)                    # (B, M)

    active = list(range(m))
    running_max = 0.0
    elimination: list[dict] = []
    mcs_p = {name: 1.0 for name in names}

    while len(active) > 1:
        idx = np.array(active)
        p, worst_local, t_obs = _pvalue_and_worst(
            full_means[idx], boot_means_all[:, idx])
        running_max = max(running_max, p)
        worst = active[worst_local]
        mcs_p[names[worst]] = running_max
        elimination.append({
            "model": names[worst], "step_pvalue": p, "mcs_pvalue": running_max,
            "t_range": t_obs, "set_size_before": len(active),
        })
        active.remove(worst)

    # The lone survivor is in every MCS; the running max is <= its (implicit) 1.0.
    survivor = names[active[0]]
    mcs_p[survivor] = 1.0

    return McsResult(
        names=names, metric=metric, block_len=block_len, n_boot=n_boot, seed=seed,
        n_folds=T, mcs_pvalue=mcs_p, elimination=elimination,
        mean_loss={n: float(full_means[k]) for k, n in enumerate(names)},
    )


# --- Paired variance diagnostic (spec 4b) ------------------------------------

def _autocorr(x: np.ndarray, max_lag: int) -> list[float]:
    x = x - x.mean()
    denom = float(np.dot(x, x))
    if denom == 0.0:
        return [0.0] * max_lag
    return [float(np.dot(x[:-k], x[k:]) / denom) for k in range(1, max_lag + 1)]


def paired_variance(
    payload: dict, rungs: list[str], metric: str = "mase", *, max_lag: int = 10
) -> list[dict]:
    """Per-pair paired-differential diagnostics for `rungs` on their common folds.

    Reports, for every pair, the mean differential, the sd of the differential
    series, its lag-1..max_lag autocorrelation, and the ratio of the paired sd to the
    independent-model sd sqrt(var_i+var_j). A ratio below one is the correlation the
    marginal standard errors miss; the autocorrelation is what justifies the block
    length empirically.
    """
    names, _folds, L = common_loss_matrix(payload, rungs, metric)
    out = []
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            di = L[:, i] - L[:, j]
            var_i, var_j = L[:, i].var(ddof=1), L[:, j].var(ddof=1)
            sd_indep = float(np.sqrt(var_i + var_j))
            sd_paired = float(di.std(ddof=1))
            out.append({
                "pair": (names[i], names[j]),
                "mean_diff": float(di.mean()),
                "sd_paired": sd_paired,
                "sd_independent": sd_indep,
                "paired_to_independent": (sd_paired / sd_indep) if sd_indep else 0.0,
                "se_paired": sd_paired / float(np.sqrt(len(di))),
                "acf": _autocorr(di, max_lag),
            })
    return out


def top_rungs_by_mean(payload: dict, metric: str = "mase", k: int = 4) -> list[str]:
    scored = [(np.mean(r[metric]), name) for name, r in payload["rungs"].items()
              if r.get("available")]
    return [name for _, name in sorted(scored)[:k]]


# --- CLI ---------------------------------------------------------------------

def _assert_vector_provenance(payload: dict, venue: str) -> str:
    """The vectors must have been built at the pinned store ceiling (S3 Part 1).

    The MCS reads persisted per-fold vectors, not the store, so its guard is on the
    provenance of what it consumes: a rolling-origin loss is a function of the store
    ceiling, so a set computed from vectors built at the wrong ceiling is silently
    wrong even though the store this process sees is irrelevant.
    """
    ceiling = payload.get("store_ceiling")
    if ceiling != config.EXPECTED_STORE_CEILING:
        raise StoreCeilingError(
            f"{venue} fold vectors were built at store ceiling {ceiling}, expected "
            f"{config.EXPECTED_STORE_CEILING}. Rebuild: python -m eval.fold_vectors")
    return ceiling


def run_venue(venue: str, *, metric: str = "mase") -> dict:
    """Both runs (common-fold and, at Ellel, full-minus-chronos2_exo) for a venue."""
    payload = fold_vectors.load(venue)
    store_ceiling = _assert_vector_provenance(payload, venue)
    rungs = available_rungs(payload)

    fold_counts = {n: len(payload["rungs"][n]["fold_index"]) for n in rungs}
    full_count = max(fold_counts.values())
    short = [n for n in rungs if fold_counts[n] < full_count]

    runs = {}
    names, folds, L = common_loss_matrix(payload, rungs, metric)
    res = model_confidence_set(names, L, metric=metric)
    runs["common_fold"] = _summarise(res)

    if short:
        full_rungs = [n for n in rungs if n not in short]
        names2, folds2, L2 = common_loss_matrix(payload, full_rungs, metric)
        res2 = model_confidence_set(names2, L2, metric=metric)
        runs["full_excluding_short"] = _summarise(res2)
        runs["excluded_for_full"] = short

    return {
        "venue": venue, "metric": metric, "seed": SEED,
        "store_ceiling": store_ceiling,
        "block_len": BLOCK_LEN, "n_boot": N_BOOT,
        "fold_counts": fold_counts, "runs": runs,
        "sets": {
            "common_fold": {str(a): res.set_at(a) for a in ALPHAS},
        },
    }


def _summarise(res: McsResult) -> dict:
    return {
        "n_folds": res.n_folds,
        "sets": {str(a): res.set_at(a) for a in ALPHAS},
        "set_sizes": {str(a): len(res.set_at(a)) for a in ALPHAS},
        "elimination": res.elimination,
        "mcs_pvalue": res.mcs_pvalue,
        "mean_loss": res.mean_loss,
    }


def main(argv: list[str]) -> int:
    venues = argv[1:] or list(config.FORECAST_VENUES)
    for venue in venues:
        summary = run_venue(venue)
        print(json.dumps(summary, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
