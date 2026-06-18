# Phase 01: Hierarchical Retrieval — Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Milestone:** v0.3 Neural Brain

## North Star

This phase is foundational, not a feature. It exists to make the v0.3 graph layer (Phase 2) feel like a **secondary brain for the company** — connected, associative, "the assistant *knows* the venue" — rather than flat chunk-RAG dressed up. Every decision below derives from that goal: section-level injection is what makes a vector hit feel like clicking into a note instead of reading a fragment. If a decision in planning would compromise that feel, it's the wrong call.

## Phase Boundary

**In scope:**
- Refactor chunk storage to **doc → section → chunk** hierarchy
- Vector retrieval continues to hit at chunk granularity; injection expands to whole containing section
- One-time backfill of existing `KnowledgeItem` rows into the new shape
- Replace flat-chunk injection in the chat retrieval path entirely

**Out of scope (Phase 2+):**
- Wikilinks / `DocLink` / graph traversal tool — Phase 2
- Graph-aware notifications — Phase 3
- Procedural runtime — Phase 4
- LLM-driven semantic clustering for unstructured docs — deferred (trigger: real PDF surfaces that breaks heading/regex fallback)

## Key Decisions (locked during /paul:discuss)

### D-01-A — Section-boundary detection: extractor-first, regex fallback, no LLM clustering yet
- **Primary signal:** structural markers already emitted by 04-01 extractors:
  - PPTX → `## Slide N: ...` per-slide markers (officeparser AST)
  - DOCX → mammoth heading-level hints
  - MD/TXT → markdown `##/###` heading regex
  - XLSX → sheet boundaries + row-group inference
  - CSV → row-as-section
  - PDF → fall through to plain-text heading regex
- **Fallback:** heading regex (`^#{1,3} `, `^[A-Z][A-Z\s]{4,}$` for ALL-CAPS section labels) on plain text
- **Deferred:** LLM-driven semantic clustering for truly flat unstructured PDFs. Registered with trigger: "first real-customer PDF arrives where extractor-first + regex fallback produces 1 single section spanning >8K tokens."
- **Rationale:** 04-01 already emits rich structural markers; LLM clustering at ingest is Haiku-expensive, unreliable, and the failure mode hasn't surfaced yet. Ship without; revisit on real signal.

### D-01-B — Backfill migration: one-time job at deploy, idempotent, no re-embedding
- **Shape:** background job runs once at deploy, walks every `KnowledgeItem` (org-scoped, batched), re-derives sections from `KnowledgeItem.content` + cached source bytes (`sourceImageBytes`, etc. — already stored from 04-01).
- **Idempotency:** `KnowledgeItem.sectionVersion` integer stamp; job skips rows already at current version. Allows rerun if heuristic changes.
- **Embeddings stay chunk-level** — vector index doesn't change. Chunks still own embeddings; section is a containment relationship via FK. **No re-embedding required at backfill** (huge cost saver — Voyage cost would otherwise dominate).
- **Cost:** Haiku-cheap because mostly heading detection in code, no LLM in the loop unless clustering activates later.
- **Rationale:** lazy on-read pollutes the retrieval path forever; one-time pain pays itself back. Section-version stamp lets us iterate on the heuristic without a destructive remigration.

### D-01-C — Prompt-cache alignment: stable section IDs + deterministic payload format
- **Section ID:** `hash(orgId, docId, sectionIndex)` — stable across queries, byte-for-byte identical for repeat hits.
- **Injection payload format:** `[Section {id} · {title}]\n{content}\n\n` — fixed prefix, deterministic ordering when multiple sections in one turn (sort by similarity score, then by section ID for stability on ties).
- **Anthropic cache_control:** on system prompt block, tool defs block, and the last-N section blocks (where N = whatever fits inside cache TTL — start with all retrieved sections per turn).
- **Rationale:** cache reuse only works if the byte-for-byte prefix is identical across calls. Stable IDs + fixed format is the contract; anything else burns the cache.

### D-01-D — Section-size cap: soft 4K / hard 8K, sub-heading split, graceful degrade
- **Soft cap 4K tokens** per section. Over soft → split at sub-heading boundaries; each split becomes its own section sharing parent docId.
- **Hard cap 8K tokens.** No sub-headings to split on → fall back to flat chunks for *that section only* (graceful degrade). Section marked `truncated:true` in metadata so retrieval knows it's not the full picture.
- **Rationale:** 4K keeps typical retrieval turn (1–3 sections expanded) well under the 30K context target. 8K hard cap protects against a single 50-page PDF section blowing the per-turn budget. Graceful degrade means we never refuse to retrieve — we just retrieve in chunk mode for pathological cases.

### D-01-E — Composition: replace flat-chunk injection entirely (no dual path, no flag)
- The existing flat-chunk path **goes away.** `find_knowledge` tool signature stays unchanged externally; internals expand chunk hit → containing section before returning.
- Backfill migration ensures all existing `KnowledgeItem` data lands in the new shape before the new code path goes live.
- No feature flag, no `useHierarchical = true` config knob. We're committed.
- **Rationale:** two paths = tech debt + double probe surface + ongoing decision burden. Better to commit and own the migration than hedge with a flag that never gets removed.

## Secondary Concerns (flag during planning, may shift task shape)

- **`KnowledgeItem.metadata Json` (.passthrough) may already carry section-like hints** from agentic enrichment in 03-02. Plan task 1 should grep existing metadata to see what's already there before designing the new `Section` schema — we might be able to reuse fields rather than re-derive.
- **probe-eval canned 6-query harness from v0.1 needs recalibration.** Section expansion changes retrieval-hit characteristics (more context per hit, possibly higher similarity scores). Plan must include a "rerun probe-eval, document new threshold" task before APPLY signs off. The 0.3-similarity no-data threshold may shift.
- **Cache TTL alignment with Anthropic.** Section block ordering must match how cache_control matches blocks. Plan should call out the exact block layout (which blocks get `cache_control: {type: 'ephemeral'}`) — wrong layout = no cache hit = costs balloon silently.

## Cost Targets (cross-cutting)

- Per-turn budget: $0.01–0.02 average; deep-research turn capped at ~$0.10. Section expansion **must not** balloon context past ~30K tokens for typical retrieval turns.
- Backfill migration: **<$5 per tenant** for the one-time run (Haiku for any LLM step; mostly code-side heading detection). Logged + capped per-org.
- Embeddings: **zero new cost** (chunks keep existing embeddings; section is FK relationship).
- Sonnet 4.6 stays the chat default. No Opus default.

## Open Questions for Plan-Time Research

1. **Section schema shape:** separate `Section` table with FK from chunks, or `sectionId` column on existing chunk table + parent metadata stored on `KnowledgeItem`? Tradeoff = query simplicity vs. duplication. Planner picks.
2. **Backfill batching strategy:** per-org, per-doc, or per-1000-rows? Affects how we recover from a partial failure.
3. **Where the section-expansion logic lives:** in `KnowledgeRetrievalService.find()`, or a new `SectionExpansionService` composed on top? Tradeoff = single-responsibility vs. extra hop.
4. **Cache_control granularity:** mark each section block individually, or one cache marker on the concatenated retrieval payload? Anthropic cache semantics determines this — needs WebFetch verification at plan time.

## Constraints (carried from milestone-level)

- Builds additively on existing `KnowledgeItem` schema. No rip-and-replace.
- Tenant-scoped via `organizationId` FK + index on every new table. SOC-2 CC6.6 symmetry on read + write + delete.
- PAUL conventions: probe-X.ts assertion gates, enterprise audit before APPLY, deferred-items registry with concrete triggers.
- Sonnet 4.6 default; Haiku 4.5 only for background jobs.

## Deferred Ideas (not v0.3 Phase 1)

- LLM-driven semantic clustering for flat PDFs — trigger above
- Section-level embeddings (in addition to chunk-level) — trigger: "graph traversal in Phase 2 wants to retrieve by section similarity, not chunk similarity"
- Section-level summaries (Claude-authored, cached) — trigger: "retrieval payload still feels too dense after section injection lands"
- Cross-doc section deduplication (same SOP appears in 3 docs) — trigger: "first customer reports duplicate retrieval results"

## Success Criteria (for /paul:verify after APPLY)

- All existing `KnowledgeItem` rows backfilled with sections; `sectionVersion` stamped on every row.
- Vector retrieval still returns at chunk granularity (no behavior change for the vector index).
- Chat path injects section-level content; existing chat probe-api assertions pass with adjusted similarity thresholds documented.
- Repeat queries on the same sections demonstrate prompt-cache hits (verified via Anthropic response usage `cache_read_input_tokens` > 0).
- Per-turn token budget stays under 30K input for 95th-percentile retrieval turns.
- Backfill migration cost logged per-tenant; total <$5/tenant for the canary corpus.

---

*Phase: 01-hierarchical-retrieval*
*Context gathered: 2026-04-28*
*Next: /paul:plan 01-01*
