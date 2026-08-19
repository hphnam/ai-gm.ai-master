"""S8 Parts 3-5 - the offline evaluation of the briefing-triage agent.

Answers three questions from the agent's stored `p_raise` probabilities, with no further
model calls once the cache is built:

  * Part 3, the cost-sensitive threshold. A miss:false-alarm cost ratio r implies a Bayes
    threshold t = 1 / (1 + r) on a calibrated probability; swept over a pre-registered grid
    (`config.AGENT_COST_RATIOS`) it yields an operating CURVE of precision, recall, Ask-F1
    and expected cost. Elliot's elicited ratio, once it arrives, selects a point on that
    curve rather than forcing a re-run.

  * Part 4, calibration. Expected calibration error and Brier score on `p_raise`, with the
    binning scheme and per-bin counts, plus a reliability diagram. This measures DETECTION
    calibration (was there a real deviation), not INTERVENTION calibration (should the
    manager have been told): the injection corpus supplies the former truth, not the
    latter. That distinction is stated in the report, not buried; intervention calibration
    needs human adopt-or-dismiss judgements and is S9's work. No judge kappa is reported
    here: there is no human anchor yet.

  * Part 5, the agent versus the six constants. The agent (thresholded on `p_raise`), the
    constant `briefing._score` (thresholded at a matched raise rate), and a random baseline
    at the same base rate, compared on the same corpus and cost grid, with the pairwise
    agent-versus-constant disagreement rate and a paired bootstrap (B=10000) on Ask-F1 and
    expected cost. If the agent and the constants agree on more than 95 percent of items,
    the honest finding is that a six-constant heuristic suffices, a publishable negative
    result, and the run says so and stops there.

The evaluation unit is a SURFACED briefing item; its truth is `agent_eval.item_covers`
(does the item correspond to a real injected event). The agent triages what the detectors
surface, so detector-level misses (injected events never surfaced) are out of its scope and
are measured separately by `agent_eval`; that framing is stated in the report.
"""

from __future__ import annotations

import argparse
import sys

import numpy as np
from scipy.optimize import minimize_scalar

import config
from eval import agent_cache
from eval import agent_eval
from signals import agent
from signals import briefing
from store.warehouse import connect

REPORT_MD = config.REPORT_ROOT / "eval" / "agent_calibration.md"
METRICS_JSON = config.REPORT_ROOT / "eval" / "agent_calibration.json"
RELIABILITY_PNG = config.REPORT_ROOT / "eval" / "agent_reliability.png"

# The calibration truth is detection, not intervention. Stated in code so the report cannot
# quietly claim the stronger thing.
CALIBRATION_KIND = "detection"
CALIBRATION_CAVEAT = (
    "ECE/Brier here measure DETECTION calibration (was there a real deviation), the truth "
    "the 644-injection corpus supplies. INTERVENTION calibration (should the manager have "
    "been told) needs human adopt-or-dismiss judgements and is S9's work; it is not claimed "
    "here.")


# --- Scenario building (deterministic; the pinned corpus) --------------------

def build_scenarios(con) -> list[dict]:
    """One entry per injection: the surfaced briefing items (objects + dicts), the venue
    context the agent sees, and the injection truth records. Deterministic: the corpus
    stream is pinned at `config.AGENT_EVAL_STREAM_CEILING`, independent of the store clock.
    """
    scenarios = []
    for inj in agent_eval.build_scaled_corpus(con):
        items_obj = agent_eval.surface(inj, con)
        if not items_obj:
            continue
        items_dict = [briefing._item_to_dict(it) for it in items_obj]
        context = {
            "venue": inj.venue,
            "venue_label": config.VENUE_LABELS.get(inj.venue, inj.venue),
            "as_of": inj.as_of.isoformat(),
            "event_driven": inj.venue in config.EVENT_ONLY_VENUES,
        }
        scenarios.append({"inj": inj, "items_obj": items_obj,
                          "items_dict": items_dict, "context": context})
    return scenarios


def collect_records(con, cache: agent_cache.ResponseCache, version=None) -> list[dict]:
    """Per-item records: p_raise (live or replayed) joined to truth and the constant score.

    Truth is `item_covers` against the scenario's injected events; the constant score is the
    briefing's own `_score` (already on each item). One record per surfaced item.
    """
    records = []
    for sc in build_scenarios(con):
        verdicts = agent.score_scenario(sc["items_dict"], sc["context"],
                                        execute=cache.execute, version=version)
        p_by_key = {v.item_key: v for v in verdicts}
        for obj, d in zip(sc["items_obj"], sc["items_dict"]):
            v = p_by_key[d["item_key"]]
            covered = any(agent_eval.item_covers(obj, t) for t in sc["inj"].truth)
            records.append({
                "item_key": d["item_key"], "venue": sc["inj"].venue,
                "kind": sc["inj"].kind, "severity": d["severity"],
                "status": d["status"], "constant_score": float(d["score"]),
                "p_raise": float(v.p_raise), "truth": bool(covered),
                "rationale": v.rationale})
    return records


# --- Part 3: cost-sensitive threshold sweep ----------------------------------

def implied_threshold(ratio: float) -> float:
    """Bayes threshold on a calibrated probability for a miss:false-alarm ratio r: the
    point where the expected cost of raising equals that of staying quiet, t = 1/(1+r)."""
    return 1.0 / (1.0 + ratio)


def _decision_metrics(raised: np.ndarray, truth: np.ndarray, ratio: float) -> dict:
    tp = int(np.sum(raised & truth))
    fp = int(np.sum(raised & ~truth))
    fn = int(np.sum(~raised & truth))
    precision = tp / (tp + fp) if (tp + fp) else float("nan")
    recall = tp / (tp + fn) if (tp + fn) else float("nan")
    f1 = (2 * precision * recall / (precision + recall)
          if np.isfinite(precision) and np.isfinite(recall) and (precision + recall) > 0
          else float("nan"))
    return {"precision": precision, "recall": recall, "ask_f1": f1,
            "misses": fn, "false_alarms": fp, "raised": int(np.sum(raised)),
            "expected_cost": ratio * fn + fp}


def cost_sweep(records: list[dict], ratios=config.AGENT_COST_RATIOS) -> list[dict]:
    """The operating curve: for each cost ratio, the implied threshold and the decision's
    precision/recall/Ask-F1/expected cost. Elliot's ratio selects one of these rows."""
    p = np.array([r["p_raise"] for r in records], float)
    y = np.array([r["truth"] for r in records], bool)
    rows = []
    for r in ratios:
        t = implied_threshold(r)
        m = _decision_metrics(p >= t, y, r)
        rows.append({"ratio": r, "threshold": round(t, 4), **m})
    return rows


# --- Part 4: calibration (ECE, Brier, reliability) ---------------------------

def brier_score(records: list[dict]) -> float:
    p = np.array([r["p_raise"] for r in records], float)
    y = np.array([r["truth"] for r in records], float)
    return float(np.mean((p - y) ** 2)) if len(p) else float("nan")


def _bin_edges(p: np.ndarray, n_bins: int, min_bin: int) -> tuple[np.ndarray, str]:
    """Equal-width edges when every occupied bin already clears `min_bin`; otherwise coarsen
    by greedily merging adjacent equal-width bins until each occupied bin holds at least
    `min_bin` (G3). The floor is enforced by construction, not assumed: quantile edges alone
    do NOT guarantee it on tie-heavy data, and temperature-0 probabilities cluster on round
    numbers (0.0, 0.5, 0.9, 1.0), exactly that regime. When the whole sample is smaller than
    the floor a single bin is returned and the scheme says so, rather than emitting zero bins
    (which would read as a falsely perfect ECE). Returns (edges, scheme)."""
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    counts, _ = np.histogram(p, bins=edges)
    if len(p) == 0 or np.all((counts == 0) | (counts >= min_bin)):
        return edges, f"equal-width x{n_bins}"
    if len(p) < min_bin:
        return np.array([0.0, 1.0]), f"single bin (N={len(p)} below the {min_bin}/bin floor)"
    # Greedy left-to-right merge: close a bin only once it clears the floor AND what remains
    # can still host a full bin (or is empty). A sub-floor tail is folded into the last bin.
    merged = [0.0]
    acc = 0
    for i in range(n_bins):
        acc += int(counts[i])
        remaining = int(counts[i + 1:].sum())
        if acc >= min_bin and (remaining == 0 or remaining >= min_bin):
            merged.append(float(edges[i + 1]))
            acc = 0
    if merged[-1] != 1.0:
        if len(merged) > 1:
            merged[-1] = 1.0            # fold the sub-floor tail into the last closed bin
        else:
            merged.append(1.0)          # unreachable once len(p) >= min_bin; safe fallback
    return np.array(merged), (f"coarsened to {len(merged) - 1} bin(s), each >= {min_bin} "
                              f"(merged from {n_bins} equal-width)")


def calibration(records: list[dict], n_bins=config.AGENT_ECE_BINS,
                min_bin=config.AGENT_MIN_BIN) -> dict:
    """ECE + Brier + per-bin reliability. Coarsens the binning if any bin is under the
    floor, and reports the scheme and the per-bin counts (G3)."""
    p = np.array([r["p_raise"] for r in records], float)
    y = np.array([r["truth"] for r in records], float)
    n = len(p)
    if n == 0:
        return {"n": 0, "ece": float("nan"), "brier": float("nan"),
                "scheme": "none", "bins": [], "kind": CALIBRATION_KIND,
                "caveat": CALIBRATION_CAVEAT}
    edges, scheme = _bin_edges(p, n_bins, min_bin)
    bins = []
    ece = 0.0
    # Guo et al. (2017) bin membership: `(lo, hi]`, left-open and right-closed, with the
    # FIRST bin closed at 0 so p = 0 has a home. Their released `_ECELoss` is
    # `gt(bin_lower) & le(bin_upper)`. The convention is not cosmetic here: with
    # equal-width bins the edges fall on round decimals, which is exactly what a
    # temperature-0 model emits, so a mass of probabilities sits ON the boundaries and
    # regroups wholesale between the two conventions.
    for lo, hi, first in [(edges[i], edges[i + 1], i == 0)
                          for i in range(len(edges) - 1)]:
        mask = (p >= lo) & (p <= hi) if first else (p > lo) & (p <= hi)
        cnt = int(np.sum(mask))
        if cnt == 0:
            bins.append({"lo": round(float(lo), 3), "hi": round(float(hi), 3),
                         "n": 0, "conf": None, "acc": None})
            continue
        conf = float(np.mean(p[mask]))
        acc = float(np.mean(y[mask]))
        ece += (cnt / n) * abs(acc - conf)
        bins.append({"lo": round(float(lo), 3), "hi": round(float(hi), 3), "n": cnt,
                     "conf": round(conf, 4), "acc": round(acc, 4)})
    return {"n": n, "ece": round(ece, 4), "brier": round(brier_score(records), 4),
            "scheme": scheme, "bins": bins, "kind": CALIBRATION_KIND,
            "caveat": CALIBRATION_CAVEAT}


def fit_temperature(records: list[dict], *, holdout: float = 0.5) -> dict:
    """Temperature scaling (Guo et al. 2017 §4.2), the third leg of pipeline stage 10.

    Guo fit a single scalar T on a VALIDATION split by minimising negative log
    likelihood, then divide the logits by it. The agent emits a probability rather than
    a logit, so the probability is mapped back through `logit`, divided by T, and pushed
    through the sigmoid: `p' = sigmoid(logit(p) / T)`. T > 1 softens an overconfident
    model, T < 1 sharpens an underconfident one.

    Two properties worth stating because they bound what this can be claimed to do.
    The transform is strictly monotone in p, so it CANNOT change any ranking, any
    threshold sweep's achievable operating points, or the AUC --- it moves calibration
    only. And T is fit on a split of an already-small corpus, so `n_fit` and `n_eval`
    are returned with it; at these n the fitted T is itself an estimate with real
    variance, and a T near 1 should not be read as evidence of calibration.
    """
    p = np.array([r["p_raise"] for r in records], float)
    y = np.array([r["truth"] for r in records], float)
    n = len(p)
    if n < 4 or len(np.unique(y)) < 2:
        return {"fitted": False, "reason": "need >= 4 records and both outcomes",
                "n": int(n), "temperature": None}

    cut = max(2, int(round(n * holdout)))
    z_fit, y_fit = _logit(p[:cut]), y[:cut]
    if len(np.unique(y_fit)) < 2:
        return {"fitted": False, "reason": "fit split is single-outcome",
                "n": int(n), "temperature": None}

    def nll(log_t: float) -> float:
        q = _sigmoid(z_fit / np.exp(log_t))
        q = np.clip(q, 1e-12, 1 - 1e-12)
        return float(-np.mean(y_fit * np.log(q) + (1 - y_fit) * np.log1p(-q)))

    res = minimize_scalar(nll, bounds=(-3.0, 3.0), method="bounded")
    temperature = float(np.exp(res.x))

    scaled = [{**r, "p_raise": float(_sigmoid(_logit(np.array([r["p_raise"]],
                                                             float))[0] / temperature))}
              for r in records[cut:]]
    before = calibration(records[cut:])
    after = calibration(scaled)
    return {
        "fitted": True, "temperature": round(temperature, 4),
        "n": int(n), "n_fit": int(cut), "n_eval": int(n - cut),
        "ece_before": before["ece"], "ece_after": after["ece"],
        "brier_before": before["brier"], "brier_after": after["brier"],
        "monotone": True,
    }


def _logit(p: np.ndarray) -> np.ndarray:
    q = np.clip(np.asarray(p, float), 1e-6, 1 - 1e-6)
    return np.log(q / (1.0 - q))


def _sigmoid(z: np.ndarray | float):
    return 1.0 / (1.0 + np.exp(-z))


def reliability_diagram(records: list[dict], path=RELIABILITY_PNG) -> str:
    """Reliability diagram (mean predicted vs observed frequency) with the diagonal."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    cal = calibration(records)
    conf = [b["conf"] for b in cal["bins"] if b["n"]]
    acc = [b["acc"] for b in cal["bins"] if b["n"]]
    fig, ax = plt.subplots(figsize=(4.5, 4.5))
    ax.plot([0, 1], [0, 1], "--", color="grey", label="perfect")
    ax.plot(conf, acc, "o-", color="C0", label="agent")
    ax.set_xlabel("mean predicted p_raise")
    ax.set_ylabel("observed fraction real")
    ax.set_title(f"Reliability (detection) - ECE {cal['ece']}, Brier {cal['brier']}")
    ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)
    return str(path)


# --- Part 5: the agent versus the six constants ------------------------------

def _matched_top_k(scores: np.ndarray, k: int) -> np.ndarray:
    """Raise the k highest-scoring items (matched raise rate). Ties broken by index for
    determinism."""
    raised = np.zeros(len(scores), bool)
    if k > 0:
        order = np.argsort(-scores, kind="stable")[:k]
        raised[order] = True
    return raised


def agent_vs_constants(records: list[dict], ratios=config.AGENT_COST_RATIOS,
                       seed=config.AGENT_BOOTSTRAP_SEED, b=config.AGENT_BOOTSTRAP_B) -> dict:
    """The decision that says whether the agent is a contribution or a decoration."""
    p = np.array([r["p_raise"] for r in records], float)
    s = np.array([r["constant_score"] for r in records], float)
    y = np.array([r["truth"] for r in records], bool)
    n = len(records)
    rng = np.random.default_rng(seed)

    grid = []
    for r in ratios:
        t = implied_threshold(r)
        agent_raised = p >= t
        k = int(np.sum(agent_raised))
        const_raised = _matched_top_k(s, k)
        rand_raised = np.zeros(n, bool)
        if k > 0:
            rand_raised[rng.choice(n, size=k, replace=False)] = True
        grid.append({
            "ratio": r, "threshold": round(t, 4), "raised": k,
            "agent": _decision_metrics(agent_raised, y, r),
            "constant": _decision_metrics(const_raised, y, r),
            "random": _decision_metrics(rand_raised, y, r),
        })

    # Reference operating point (1:1) for disagreement + the paired bootstrap.
    t_ref = implied_threshold(1.0)
    agent_ref = p >= t_ref
    k_ref = int(np.sum(agent_ref))
    const_ref = _matched_top_k(s, k_ref)
    disagreement = float(np.mean(agent_ref != const_ref)) if n else float("nan")

    boot = _paired_bootstrap(p, s, y, t_ref, k_ref, ratio=1.0, seed=seed, b=b)
    decorative = np.isfinite(disagreement) and disagreement <= 0.05
    return {"n": n, "disagreement_rate": round(disagreement, 4),
            "reference_threshold": round(t_ref, 4), "grid": grid, "bootstrap": boot,
            "decorative": bool(decorative),
            "verdict": ("agent agrees with the six constants on >95% of items: the LLM is "
                        "decorative here and a constant-weighted heuristic suffices (a "
                        "negative result)" if decorative else
                        "agent and constants disagree on a non-trivial share of items; the "
                        "paired bootstrap says whether that changes Ask-F1 or expected cost")}


def _paired_bootstrap(p, s, y, t_ref, k_ref, ratio, seed, b) -> dict:
    """Paired bootstrap of (agent - constant) on Ask-F1 and expected cost. Paired because
    both deciders score the SAME resampled items, so the difference has far smaller variance
    than the marginal errors (the S3 argument)."""
    n = len(p)
    if n == 0:
        return {"b": b, "delta_ask_f1": None, "delta_expected_cost": None}
    rng = np.random.default_rng(seed + 1)
    d_f1 = np.empty(b)
    d_cost = np.empty(b)
    for i in range(b):
        idx = rng.integers(0, n, size=n)
        pi, si, yi = p[idx], s[idx], y[idx]
        a = _decision_metrics(pi >= t_ref, yi, ratio)
        c = _decision_metrics(_matched_top_k(si, int(np.sum(pi >= t_ref))), yi, ratio)
        d_f1[i] = (0.0 if not np.isfinite(a["ask_f1"]) else a["ask_f1"]) - \
                  (0.0 if not np.isfinite(c["ask_f1"]) else c["ask_f1"])
        d_cost[i] = a["expected_cost"] - c["expected_cost"]
    return {"b": b, "ratio": ratio,
            "delta_ask_f1": _ci(d_f1), "delta_expected_cost": _ci(d_cost)}


def _ci(v: np.ndarray) -> dict:
    return {"mean": round(float(np.mean(v)), 4),
            "lo": round(float(np.percentile(v, 2.5)), 4),
            "hi": round(float(np.percentile(v, 97.5)), 4)}


# --- Orchestration + report --------------------------------------------------

def run(con=None, *, allow_live=False, version=None) -> dict:
    """Build (or replay) the cache, collect records, and compute all three parts."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        cache = agent_cache.ResponseCache(version=version, allow_live=allow_live)
        records = collect_records(con, cache, version=version)
        if allow_live:
            cache.save()
        out = {
            "n_items": len(records), "n_positive": int(sum(r["truth"] for r in records)),
            "model": config.AGENT_MODEL, "prompt_version": version or config.AGENT_PROMPT_VERSION,
            "prompt_hash": agent.prompt_hash(version),
            "cache": {"hits": cache.hits, "calls": cache.calls,
                      "retries": cache.retries, "checkpoints": cache.checkpoints,
                      "resumed_from_entries": cache.resumed_entries},
            "cost_sweep": cost_sweep(records),
            "calibration": calibration(records),
            "temperature_scaling": fit_temperature(records),
            "agent_vs_constants": agent_vs_constants(records),
        }
        try:
            out["reliability_png"] = reliability_diagram(records)
        except Exception as exc:  # pragma: no cover - plotting is best-effort
            out["reliability_png"] = f"not rendered: {exc}"
        _write_report(out)
        _write_metrics(out)
        return out
    finally:
        if own:
            con.close()


def _write_metrics(out: dict) -> None:
    import json
    dump = {k: v for k, v in out.items() if k != "reliability_png"}
    METRICS_JSON.write_text(json.dumps(dump, indent=2, sort_keys=True) + "\n")


def _write_report(out: dict) -> None:
    c = out["calibration"]
    avc = out["agent_vs_constants"]
    lines = [
        "# Agent triage - cost-sensitive threshold + calibration (S8)\n",
        f"Model **{out['model']}** (prompt {out['prompt_version']}, hash "
        f"`{out['prompt_hash'][:12]}`). **N={out['n_items']}** surfaced items "
        f"({out['n_positive']} real). Cache: {out['cache']['hits']} replayed, "
        f"{out['cache']['calls']} live calls.\n",
        "The unit is a surfaced briefing item; truth is `item_covers` (does it correspond "
        "to a real injected event). The agent triages what the detectors surface, so "
        "detector-level misses are out of scope here and are measured by `agent_eval`.\n",
        "## Part 3 - cost-sensitive threshold sweep\n",
        "Ratio r is miss:false-alarm; the implied threshold is t = 1/(1+r). Elliot's "
        "elicited ratio selects one row, no re-run.\n",
        "| miss:false-alarm | threshold | precision | recall | Ask-F1 | misses | false alarms | expected cost |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for row in out["cost_sweep"]:
        lines.append(
            f"| {row['ratio']:g} : 1 | {row['threshold']:.3f} | {_f(row['precision'])} | "
            f"{_f(row['recall'])} | {_f(row['ask_f1'])} | {row['misses']} | "
            f"{row['false_alarms']} | {row['expected_cost']:g} |")
    lines += [
        "\n## Part 4 - calibration (detection)\n",
        f"**ECE {c['ece']}**, **Brier {c['brier']}** over N={c['n']} ({c['scheme']}). "
        f"{c['caveat']}\n",
        "| bin | n | mean p_raise | observed fraction real |",
        "|---|---|---|---|",
    ]
    for bn in c["bins"]:
        conf = "-" if bn["conf"] is None else f"{bn['conf']:.3f}"
        acc = "-" if bn["acc"] is None else f"{bn['acc']:.3f}"
        lines.append(f"| ({bn['lo']:.2f}, {bn['hi']:.2f}] | {bn['n']} | {conf} | {acc} |")
    ts = out.get("temperature_scaling", {})
    if ts.get("fitted"):
        lines += [
            f"\n**Temperature scaling** (Guo et al. 2017 §4.2): T = "
            f"**{ts['temperature']}** fit by NLL on {ts['n_fit']} records, evaluated on "
            f"the held-out {ts['n_eval']}. ECE {ts['ece_before']} -> "
            f"**{ts['ece_after']}**, Brier {ts['brier_before']} -> {ts['brier_after']}. "
            "The map is strictly monotone, so it changes calibration only and cannot "
            "move any ranking, the cost sweep's achievable operating points, or the "
            "AUC. At this N the fitted T carries real variance of its own, so a value "
            "near 1 is not evidence of calibration.\n",
        ]
    elif ts:
        lines.append(f"\n**Temperature scaling** not fitted: {ts.get('reason')}.\n")
    lines += [
        f"\nBins follow Guo's `(lo, hi]` convention, first bin closed at 0.\n"
        f"Reliability diagram: `{RELIABILITY_PNG.name}`. No judge kappa is reported: "
        "there is no human anchor yet (S9).\n",
        "## Part 5 - agent versus the six constants\n",
        f"Pairwise disagreement at the 1:1 operating point: **{avc['disagreement_rate']}** "
        f"(threshold {avc['reference_threshold']:.3f}). {avc['verdict']}.\n",
        "Paired bootstrap (agent - constant), B="
        f"{avc['bootstrap']['b']}, at ratio 1:1:\n",
        f"- Ask-F1 delta: {_delta(avc['bootstrap']['delta_ask_f1'])}",
        f"- expected-cost delta: {_delta(avc['bootstrap']['delta_expected_cost'])}\n",
        "| miss:false-alarm | raised | agent Ask-F1 | constant Ask-F1 | random Ask-F1 | "
        "agent cost | constant cost | random cost |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for g in avc["grid"]:
        lines.append(
            f"| {g['ratio']:g} : 1 | {g['raised']} | {_f(g['agent']['ask_f1'])} | "
            f"{_f(g['constant']['ask_f1'])} | {_f(g['random']['ask_f1'])} | "
            f"{g['agent']['expected_cost']:g} | {g['constant']['expected_cost']:g} | "
            f"{g['random']['expected_cost']:g} |")
    REPORT_MD.write_text("\n".join(lines))


def _f(v) -> str:
    return "-" if v is None or (isinstance(v, float) and not np.isfinite(v)) else f"{v:.3f}"


def _delta(ci: dict) -> str:
    if not ci:
        return "not computed"
    return f"mean {ci['mean']}, 95% CI [{ci['lo']}, {ci['hi']}]"


def main() -> int:
    ap = argparse.ArgumentParser(description="Agent triage evaluation (cost threshold + calibration)")
    ap.add_argument("--build", action="store_true",
                    help="live pass: call the pinned model once per scenario and fill the "
                         "cache (needs anthropic + ANTHROPIC_API_KEY). Default replays the "
                         "committed cache with zero API calls.")
    args = ap.parse_args()
    try:
        out = run(allow_live=args.build)
    except agent_cache.CacheMiss as exc:
        print("Agent evaluation is PENDING the live build (S8b).")
        print(f"  {exc}")
        print("  Build it with: ANTHROPIC_API_KEY=... python -m eval.agent_calibration --build")
        return 0
    avc = out["agent_vs_constants"]
    print(f"Agent triage eval - N={out['n_items']} items, "
          f"{out['cache']['calls']} live calls, {out['cache']['hits']} replayed")
    print(f"  calibration : ECE {out['calibration']['ece']} Brier {out['calibration']['brier']}")
    print(f"  disagreement: {avc['disagreement_rate']} - {avc['verdict']}")
    print(f"  report      : {REPORT_MD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
