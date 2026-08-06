"""A8 · Chat-log KB-gap detection (methodology §4.1 / step 8).

The chat stream is too short and sparse for volume forecasting; its value is a
**failure-rate + topic-clustering → "flag a missing SOP"** signal. We:

  1. monitor the share of unproduceable answers (baseline ≈ 18.9%);
  2. embed user turns (Voyage → sentence-transformers → TF-IDF fallback),
     cluster them, and rank clusters by *failure density × repeat-ask count*
     a dense, repeatedly-failing cluster is the SOP gap to surface.

The stream is estate-wide / single-owner (web channel, ~6 weeks). Venue is
tagged from content where named (Beer-Hall-dominant). The short window and the
WhatsApp/web channel mismatch are recorded as standing flags.

Run:
    python -m signals.chatlog_kb_gap [--clusters 12] [--top 12]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

import numpy as np
import pandas as pd

import provenance
from config import (
    CHATLOG_FAILURE_BASELINE,
    EXPECTED_STORE_CEILING,
    REPORT_ROOT,
    VOYAGE_MODEL,
    chat_csv,
)

RESULTS_MD = REPORT_ROOT / "signals" / "chatlog_kb_gap.md"
RESULTS_JSON = REPORT_ROOT / "signals" / "chatlog_kb_gap.json"

# The committed artefact tabulates every cluster formed, so the two defaults are tied
# rather than stated twice. They used to differ (12 clusters, top 5), which meant the
# documented bare command truncated the table to five rows: the staleness sweep in
# report 57 read that as seven lost clusters and nearly "fixed" a correct artefact by
# regenerating it at the default. A truncating default on a committed artefact is a
# trap, not a preference.
DEFAULT_CLUSTERS = 12
DEFAULT_TOP = DEFAULT_CLUSTERS

FAILURE_MARKERS = ("couldn't produce an answer", "please retry or rephrase")
_VENUE_KEYWORDS = {
    "beer_hall": ("beer hall", "beerhall"),
    "two_river_taps": ("two river", "two rivers"),
    "ellel": ("ellel",),
    "brewery": ("brewery", "taproom"),
    "estate": ("all venues", "every venue", "across venues", "group"),
}


# --- Load + label ------------------------------------------------------------

def _is_failure(text: str) -> bool:
    low = str(text).lower()
    return any(m in low for m in FAILURE_MARKERS)


def _venue_tag(text: str) -> str:
    low = str(text).lower()
    for venue, kws in _VENUE_KEYWORDS.items():
        if any(k in low for k in kws):
            return venue
    return "estate"


def load_turns() -> tuple[pd.DataFrame, dict]:
    """Return (user_turns, stats). Each user turn is labelled with whether the
    *next* assistant reply in its conversation was a failure."""
    df = pd.read_csv(chat_csv())
    df["ts"] = pd.to_datetime(df["messageCreatedAt"], errors="coerce")
    df = df.sort_values(["conversationId", "ts"]).reset_index(drop=True)

    assistant = df[df["role"].str.lower() == "assistant"]
    n_assistant = len(assistant)
    n_failed = int(assistant["content"].map(_is_failure).sum())
    failure_rate = n_failed / max(n_assistant, 1)

    rows = []
    for _, conv in df.groupby("conversationId"):
        msgs = conv.to_dict("records")
        for i, m in enumerate(msgs):
            if str(m["role"]).lower() != "user":
                continue
            nxt = next((x for x in msgs[i + 1:]
                        if str(x["role"]).lower() == "assistant"), None)
            failed = bool(nxt and _is_failure(nxt["content"]))
            rows.append({
                "conversationId": m["conversationId"],
                "content": str(m["content"]),
                "ts": m["ts"],
                "failed": failed,
                "venue": _venue_tag(m["content"]),
            })
    turns = pd.DataFrame(rows)

    daily = (
        df[df["role"].str.lower() == "assistant"]
        .assign(day=lambda x: x["ts"].dt.date, fail=lambda x: x["content"].map(_is_failure))
        .groupby("day")["fail"].mean()
    )
    stats = {
        "n_assistant": n_assistant,
        "n_failed": n_failed,
        "failure_rate": failure_rate,
        "active_days": int(df["ts"].dt.date.nunique()),
        "channels": df["channel"].value_counts().to_dict(),
        "span": (str(df["ts"].min()), str(df["ts"].max())),
        "rolling7_max": float(daily.rolling(7, min_periods=1).mean().max()),
    }
    return turns, stats


# --- Embedding (with graceful fallback) -------------------------------------

def _embed_tfidf(texts: list[str]) -> tuple[np.ndarray, str]:
    """Keyless offline path: TF-IDF -> SVD -> unit norm. No key read, no network
    call attempted (not merely absent-key fallback), so this is exact and
    reproducible from a clean checkout regardless of what is in the environment."""
    from sklearn.decomposition import TruncatedSVD
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.preprocessing import normalize

    tfidf = TfidfVectorizer(stop_words="english", min_df=2, ngram_range=(1, 2))
    X = tfidf.fit_transform(texts)
    k = min(50, X.shape[1] - 1, max(2, X.shape[0] - 1))
    svd = TruncatedSVD(n_components=k, random_state=0)
    return normalize(svd.fit_transform(X)), "tfidf"


def embed(texts: list[str], backend: str = "auto") -> tuple[np.ndarray, str]:
    """backend="tfidf" pins the keyless offline path directly (S11's canonical,
    committed path: three backends would cluster differently, so which one ran
    cannot be left to whatever happened to be in the environment). backend="auto"
    is the original explore-only degrade (Voyage -> sentence-transformers ->
    TF-IDF), kept for a Ryan-side richer-embedder comparison, never the wired or
    committed path."""
    if backend == "tfidf":
        return _embed_tfidf(texts)
    if backend != "auto":
        raise ValueError(f"unknown embed backend: {backend!r}")

    key = os.environ.get("VOYAGE_API_KEY")
    if key:
        try:
            import voyageai

            client = voyageai.Client(api_key=key)
            emb = client.embed(texts, model=VOYAGE_MODEL, input_type="document")
            return np.asarray(emb.embeddings, float), "voyage"
        except Exception:
            pass
    try:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer("all-MiniLM-L6-v2")
        return np.asarray(model.encode(texts), float), "sentence-transformers"
    except Exception:
        pass
    return _embed_tfidf(texts)


# --- Cluster + rank ----------------------------------------------------------

def _is_substantive(text: str) -> bool:
    """A real question/request, not a one-word affirmation ('Perfect,', 'Yes')."""
    t = str(text).strip()
    return len(t.split()) >= 4 or t.endswith("?")


def rank_gaps(turns: pd.DataFrame, n_clusters: int = 12,
              backend: str = "tfidf") -> tuple[pd.DataFrame, str]:
    """backend defaults to "tfidf", the pinned canonical path (S11 Part 1); pass
    backend="auto" only for an explicit, noted exploratory comparison."""
    from sklearn.cluster import KMeans

    # Cluster substantive turns only, trivial confirmations are a different
    # failure mode (the assistant choking on an ack), not a missing SOP.
    turns = turns[turns["content"].map(_is_substantive)].reset_index(drop=True)
    texts = turns["content"].tolist()
    emb, backend = embed(texts, backend=backend)
    k = min(n_clusters, max(2, len(texts) // 6))
    labels = KMeans(n_clusters=k, random_state=0, n_init=10).fit_predict(emb)
    turns = turns.assign(cluster=labels)

    records = []
    for cid, grp in turns.groupby("cluster"):
        n = len(grp)
        n_failed = int(grp["failed"].sum())
        density = n_failed / n
        failed_grp = grp[grp["failed"]]
        examples = failed_grp["content"].head(3).tolist() or \
            grp["content"].head(2).tolist()
        venues = grp[grp["venue"] != "estate"]["venue"].value_counts().to_dict()
        # onset = first time this gap showed up as a failure (or first turn at
        # all, for a non-gap cluster with no failures), never the last - the
        # briefing reads onset_date as when a thing started, not last recurred.
        onset_ts = failed_grp["ts"].min() if len(failed_grp) else grp["ts"].min()
        records.append({
            "cluster": cid, "size": n, "n_failed": n_failed,
            "failure_density": round(density, 3),
            # score rewards clusters that are both densely-failing and repeatedly-asked
            "score": round(density * n_failed, 3),
            # a real SOP gap fails ABOVE the corpus baseline (not the catch-all
            # blob that merely sits at the average failure rate)
            "is_gap": bool(density > CHATLOG_FAILURE_BASELINE and n_failed >= 2),
            "venue_tags": venues or {"estate": n},
            "examples": [e[:140] for e in examples],
            "onset_date": onset_ts,
        })
    ranked = pd.DataFrame(records).sort_values(
        ["is_gap", "score", "n_failed"], ascending=False).reset_index(drop=True)
    return ranked, backend


# --- Cached, stamped access for downstream callers (briefing) ----------------

_CACHE: dict | None = None


def gap_report(n_clusters: int = 12, backend: str = "tfidf") -> dict:
    """Process-cached {stats, ranked, backend}. The chat corpus is a static
    historical export, so memoising the (deterministic, random_state=0)
    clustering is safe and avoids re-running KMeans once per briefing venue."""
    global _CACHE
    if _CACHE is None:
        turns, stats = load_turns()
        ranked, resolved_backend = rank_gaps(turns, n_clusters, backend=backend)
        _CACHE = {"stats": stats, "ranked": ranked, "backend": resolved_backend}
    return _CACHE


def write_artefact(top: int = 20, report: dict | None = None) -> dict:
    """Stamp the real-corpus gap list to JSON: store_ceiling + embedder backend
    on every artefact (S11 G2/G6), so a reader can tell which pipeline produced
    it without re-running anything. `report` defaults to the cached canonical
    `gap_report()`; pass the caller's own {stats, ranked, backend} (as `main()`
    does) so a non-default `--clusters`/`--backend` CLI run stamps the artefact
    it actually printed, rather than silently recomputing the cached default."""
    report = report or gap_report()
    ranked = report["ranked"]
    gaps = ranked[ranked["is_gap"]]
    payload = {
        "store_ceiling": EXPECTED_STORE_CEILING,
        "embedder_backend": report["backend"],
        "n_assistant_replies": report["stats"]["n_assistant"],
        "failure_rate": report["stats"]["failure_rate"],
        "failure_baseline": CHATLOG_FAILURE_BASELINE,
        "span": report["stats"]["span"],
        "n_clusters": int(len(ranked)),
        "n_gaps": int(len(gaps)),
        "gaps": [
            {
                "cluster": int(r["cluster"]), "size": int(r["size"]),
                "n_failed": int(r["n_failed"]),
                "failure_density": float(r["failure_density"]),
                "score": float(r["score"]),
                "venue_tags": r["venue_tags"],
                "onset_date": pd.Timestamp(r["onset_date"]).date().isoformat(),
                "examples": r["examples"],
            }
            for _, r in gaps.head(top).iterrows()
        ],
    }
    payload["provenance"] = provenance.runtime_stamp()
    RESULTS_JSON.write_text(json.dumps(payload, indent=2))
    return payload


def _write_report(stats: dict, ranked: pd.DataFrame, backend: str, top: int) -> None:
    lines = [
        "# A8 · Chat-log KB-gap detection\n",
        "## Failure-rate monitor",
        f"- assistant replies: {stats['n_assistant']}, unproduceable: "
        f"{stats['n_failed']}",
        f"- **failure rate: {stats['failure_rate']*100:.1f}%** "
        f"(baseline {CHATLOG_FAILURE_BASELINE*100:.1f}%)",
        f"- rolling-7-day max failure rate: {stats['rolling7_max']*100:.1f}%\n",
        "## Standing flags",
        f"- short window: {stats['active_days']} active days "
        f"({stats['span'][0][:10]} → {stats['span'][1][:10]})",
        f"- channel: {stats['channels']} — **web, not WhatsApp** (brief mismatch)",
        "- single-owner / estate-wide stream; venue tagged from content only\n",
        f"## Ranked SOP-gap clusters (embedding backend: {backend})",
        f"A gap = a cluster failing **above** the {CHATLOG_FAILURE_BASELINE*100:.1f}% "
        "corpus baseline (≥2 failures), so the catch-all blob at the average rate "
        "is excluded.\n",
        "| Rank | Gap? | Size | Failed | Density | Score | Venue tags | Example failed question |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for i, r in ranked.head(max(top, len(ranked[ranked['is_gap']]))).iterrows():
        ex = r["examples"][0].replace("|", "/") if r["examples"] else ""
        lines.append(
            f"| {i+1} | {'✓' if r['is_gap'] else ''} | {r['size']} | {r['n_failed']} | "
            f"{r['failure_density']} | {r['score']} | {r['venue_tags']} | {ex} |")
    lines.append("\nA dense, repeatedly-failing cluster is the missing SOP to "
                 "surface — the decision layer on top of the codebase's "
                 "`record_kb_gap` counter. Semantic embeddings (Voyage) sharpen "
                 "these clusters further; the TF-IDF fallback keeps it keyless.")
    lines += provenance.stamp_lines()
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    ap = argparse.ArgumentParser(description="Chat-log KB-gap detection")
    ap.add_argument("--clusters", type=int, default=DEFAULT_CLUSTERS)
    ap.add_argument("--top", type=int, default=DEFAULT_TOP,
                    help="rows tabulated in the artefact; defaults to every cluster "
                         "formed, which is what the committed artefact contains")
    ap.add_argument("--backend", default="tfidf", choices=["tfidf", "auto"],
                     help="tfidf (default) is the pinned, committed path; auto is "
                          "an explicit, noted Ryan-side richer-embedder comparison "
                          "only, never the wired or committed path")
    args = ap.parse_args()

    print("A8 · chat-log KB-gap detection")
    turns, stats = load_turns()
    print(f"  assistant replies : {stats['n_assistant']} "
          f"(failed {stats['n_failed']})")
    print(f"  failure rate      : {stats['failure_rate']*100:.1f}% "
          f"(baseline {CHATLOG_FAILURE_BASELINE*100:.1f}%)")
    print(f"  window            : {stats['active_days']} active days, "
          f"channels={stats['channels']}")

    ranked, backend = rank_gaps(turns, args.clusters, backend=args.backend)
    gaps = ranked[ranked["is_gap"]]
    print(f"  embedding backend : {backend}")
    print(f"  above-baseline SOP gaps: {len(gaps)} of {len(ranked)} clusters "
          f"(top {args.top}):")
    for i, r in gaps.head(args.top).iterrows():
        print(f"    size={r['size']:3d} failed={r['n_failed']:2d} "
              f"density={r['failure_density']:.2f} score={r['score']:.2f} "
              f"venues={r['venue_tags']}")
        if r["examples"]:
            print(f"        e.g. {r['examples'][0][:90]!r}")

    _write_report(stats, ranked, backend, args.top)
    print(f"  report            : {RESULTS_MD}")
    if args.backend == "tfidf":
        artefact = write_artefact(top=args.top,
                                  report={"stats": stats, "ranked": ranked, "backend": backend})
        print(f"  artefact          : {RESULTS_JSON} "
              f"(store_ceiling={artefact['store_ceiling']}, backend={artefact['embedder_backend']})")

    baseline_ok = abs(stats["failure_rate"] - CHATLOG_FAILURE_BASELINE) <= 0.01
    has_gap = len(gaps) >= 1 and bool(gaps.iloc[0]["examples"])
    ok = baseline_ok and has_gap
    print(f"A8 RESULT: {'PASS' if ok else 'FAIL'} "
          f"(failure baseline reproduced + ≥1 ranked SOP-gap cluster)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
