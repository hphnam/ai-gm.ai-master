# A8 · Chat-log KB-gap detection

## Failure-rate monitor
- assistant replies: 359, unproduceable: 68
- **failure rate: 18.9%** (baseline 18.9%)
- rolling-7-day max failure rate: 88.9%

## Standing flags
- short window: 25 active days (2026-04-29 → 2026-06-12)
- channel: {'web': 735} — **web, not WhatsApp** (brief mismatch)
- single-owner / estate-wide stream; venue tagged from content only

## Ranked SOP-gap clusters (embedding backend: tfidf)
A gap = a cluster failing **above** the 18.9% corpus baseline (≥2 failures), so the catch-all blob at the average rate is excluded.

| Rank | Gap? | Size | Failed | Density | Score | Venue tags | Example failed question |
|---|---|---|---|---|---|---|---|
| 1 | ✓ | 5 | 3 | 0.6 | 1.8 | {'estate': 5} | Why is this gas cannister not connecting and gas is coming out of the gas tap handle? |
| 2 | ✓ | 12 | 4 | 0.333 | 1.333 | {'estate': 12} | Pretend I'm a new user for the first time. "So what is ai-gm, what do you do and why are you useful?" |
| 3 | ✓ | 18 | 4 | 0.222 | 0.889 | {'brewery': 1} | No probs, can I upload documents into this chat? |
| 4 | ✓ | 6 | 2 | 0.333 | 0.667 | {'estate': 6} | How do I open up? |
| 5 |  | 206 | 37 | 0.18 | 6.646 | {'brewery': 1} | Thank you, for clarifying. |

A dense, repeatedly-failing cluster is the missing SOP to surface — the decision layer on top of the codebase's `record_kb_gap` counter. Semantic embeddings (Voyage) sharpen these clusters further; the TF-IDF fallback keeps it keyless.