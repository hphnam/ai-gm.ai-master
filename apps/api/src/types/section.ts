import { z } from 'zod'

// ──────────────────────────────────────────────────────────────────
// Plan 01-01 (v0.3 Hierarchical Retrieval) — section/chunk constants.
// All ingest cost/bound knobs live here so consumers grep one source.
// audit-M2/M3/M4/M5/M7 + base.
// ──────────────────────────────────────────────────────────────────

/// Soft cap. ≤ this → store as 1 section, truncated:false.
export const SECTION_SOFT_CAP_TOKENS = 4096
/// Hard cap. > this → split at sub-headings; if no sub-headings → flat-chunk fallback.
export const SECTION_HARD_CAP_TOKENS = 8192
/// Sliding-window chunk target.
export const CHUNK_TARGET_TOKENS = 1024
/// Sliding-window chunk overlap.
export const CHUNK_OVERLAP_TOKENS = 128
/// audit-M5: bound on splitByHeadings recursion (prevents stack overflow on
/// deeply-nested heading docs h1→h2→...→h8).
export const MAX_HEADING_RECURSION_DEPTH = 8
/// audit-M4: CSV row batch size — prevents 10K-row inventories blasting Voyage.
export const CSV_ROW_BATCH_SIZE = 50
/// audit-M2: parallel Voyage calls per ingest (semaphore).
export const MAX_CONCURRENT_CHUNK_EMBEDS = 3
/// audit-M2: per-chunk wait when concurrency saturated.
export const EMBED_QUEUE_TIMEOUT_MS = 15_000
/// audit-M2: hard ceiling on the entire post-commit embed phase via AbortController.
export const INGEST_EMBED_PHASE_TIMEOUT_MS = 120_000
/// audit-M3: per-document embed budget (~50K tokens at 1024 chunk target).
/// Worst-case spend ≈ 200 × $0.00006 ≈ $0.012 per doc.
export const MAX_EMBEDS_PER_DOCUMENT = 200
/// audit-M7: when embedFailedRatio crosses this, emit ingest.embed_quality_degraded WARN.
export const EMBED_QUALITY_DEGRADED_THRESHOLD = 0.5

// ──────────────────────────────────────────────────────────────────
// Plan 01-02 (v0.3 Hierarchical Retrieval — backfill + retrieval refactor).
// Backfill cost guards + heuristic-version stamp.
// ──────────────────────────────────────────────────────────────────

/// Plan 01-02 — heuristic version stamp on every KnowledgeSection row.
/// Replaces the magic-number `1` previously hardcoded inside IngestService.
/// Bumping this constant + re-running `npm run backfill:sections --workspace=api` reprocesses
/// every KI whose MAX(KnowledgeSection.sectionVersion) < CURRENT_SECTION_VERSION.
/// Manual ops procedure (audit-S9 deferred): (1) deploy, (2) backfill, (3) verify.
export const CURRENT_SECTION_VERSION = 1

/// Plan 01-02 — per-tenant cost ceiling for backfill runs (CONTEXT D-01-B target).
/// Halts processing for the offending tenant; aggregates a partial-state log.
/// Override at probe time via PROBE_BACKFILL_COST_CEILING_USD (NODE_ENV-gated;
/// assertAuthEnv prod-fail backstop).
export const BACKFILL_TENANT_COST_CEILING_USD = 5

/// Single source of truth for the Voyage embedding model. voyage-3.5 is the
/// drop-in successor to voyage-3 (same 1024-dim output, same $0.06/1M-token
/// price, retrieval-quality bump per Voyage's own benchmarks). Bumping this
/// constant and re-running the cold-cut re-embed script reprocesses every
/// embedded row in place — no schema change needed while we stay at 1024 dims.
export const VOYAGE_EMBED_MODEL = 'voyage-3.5'

/// Plan 01-02 — cost-per-Voyage-document-call for spend estimation.
/// Source: https://www.voyageai.com/pricing · verified 2026-04-28
/// voyage-3.5 document-input pricing: $0.06 / 1M tokens. At ~1024 tokens/chunk
/// the per-call cost is ≈ $0.00006. Constant kept dimensionless ($ per call)
/// so backfill spend math is `voyageCallCount × VOYAGE_DOC_USD_PER_CALL`.
export const VOYAGE_DOC_USD_PER_CALL = 0.00006

/// Plan 01-02 audit-S4 — pause-after-3-consecutive-429s backoff window.
/// Mitigates account-level Voyage rate-limit cascades during sustained backfill.
export const BACKFILL_VOYAGE_BACKOFF_MS = 30_000

// ──────────────────────────────────────────────────────────────────
// Plan 01-03 (v0.3 Hierarchical Retrieval — cache alignment + section-payload).
// Byte-stable section-injection prefix + per-turn aggregate-token guard.
// Consumes the PROMPT-PAYLOAD format reservation from 01-02 audit-S7.
// ──────────────────────────────────────────────────────────────────

/// Plan 01-03 audit-S7 (01-02 release) — byte-stable prefix template for
/// find_knowledge tool result content. Anthropic prompt-cache requires
/// byte-identical prefix; format is locked. Single grep source: every
/// consumer references SECTION_PAYLOAD_PREFIX_TEMPLATE / formatSectionPayload.
export const SECTION_PAYLOAD_PREFIX_TEMPLATE = '[Section {sectionId} · {sectionTitle}]'

/// Plan 01-03 — formats a section-injected payload as
/// `[Section {sectionId} · {sectionTitle}]\n{content}\n\n`. Pure function;
/// no I/O. Title null-coerces to 'Untitled' so the byte format is stable
/// even for pre-01-01 KIs (audit-S7).
export function formatSectionPayload(args: {
  sectionId: string
  sectionTitle: string | null
  content: string
}): string {
  const title = args.sectionTitle ?? 'Untitled'
  return `[Section ${args.sectionId} · ${title}]\n${args.content}\n\n`
}

/// Plan 01-03 audit-M3 — per-turn ceiling on aggregate injected-section
/// tokens. CONTEXT.md success-criteria target 30K input tokens 95th-percentile;
/// 24000 leaves ~6K headroom for system prompt + tool defs + history.
/// Observability only this plan; auto-truncation deferred D-01-03-D5.
export const AGGREGATE_SECTION_TOKEN_BUDGET = 24_000

// ──────────────────────────────────────────────────────────────────
// Persisted shapes — mirror Prisma columns; passthrough for forward compat.
// ──────────────────────────────────────────────────────────────────

export const KnowledgeSectionSchema = z
  .object({
    id: z.string().uuid(),
    knowledgeItemId: z.string().uuid(),
    organizationId: z.string().uuid(),
    sectionIndex: z.number().int().min(0),
    title: z.string().nullable(),
    content: z.string(),
    tokenCount: z.number().int().min(0),
    sectionVersion: z.number().int().min(1),
    truncated: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .passthrough()
export type KnowledgeSection = z.infer<typeof KnowledgeSectionSchema>

export const KnowledgeChunkSchema = z
  .object({
    id: z.string().uuid(),
    sectionId: z.string().uuid(),
    organizationId: z.string().uuid(),
    chunkIndex: z.number().int().min(0),
    content: z.string(),
    embeddingText: z.string().nullable(),
    tokenCount: z.number().int().min(0),
    createdAt: z.date(),
  })
  .passthrough()
export type KnowledgeChunk = z.infer<typeof KnowledgeChunkSchema>

// ──────────────────────────────────────────────────────────────────
// SectionDetector output contract — pure data, no DB ids yet.
// ──────────────────────────────────────────────────────────────────

export const DetectedChunkSchema = z.object({
  content: z.string(),
  tokenCount: z.number().int().min(0),
})
export type DetectedChunk = z.infer<typeof DetectedChunkSchema>

export const DetectedSectionSchema = z.object({
  title: z.string().nullable(),
  content: z.string(),
  tokenCount: z.number().int().min(0),
  truncated: z.boolean(),
  /// AC-3: future LLM-clustering trigger when a flat-text doc collapses to a
  /// single oversized section. Marker only — clustering deferred.
  needsClustering: z.boolean().optional(),
  chunks: z.array(DetectedChunkSchema).min(1),
})
export type DetectedSection = z.infer<typeof DetectedSectionSchema>

export const SectionDetectionResultSchema = z.object({
  sections: z.array(DetectedSectionSchema),
})
export type SectionDetectionResult = z.infer<typeof SectionDetectionResultSchema>
