import { createHash } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { fail, ok, type ToolResult } from '../../types'
import { EmbeddingsService } from '../embeddings/embeddings.service'

export type EntityType =
  | 'knowledge_item'
  | 'checklist_step'
  | 'venue_contact'
  | 'mock_supplier'
  | 'venue_profile'
  | 'chat_message'

export type RetrievalHit = {
  id: string
  entityType: EntityType
  entityId: string
  subKey: string
  content: string
  title: string | null
  summary: string | null
  tags: string[]
  kind: string | null
  metadata: Record<string, unknown>
  aiSummary: string | null
  /// Pure cosine similarity, kept for back-compat. Use `score` for ranking.
  similarity: number
  /// Reciprocal-rank-fusion score combining vector + BM25. Higher = better.
  /// Roughly bounded by 0–0.034 for the top hit (1/60 + 1/60 ≈ 0.0333).
  score: number
  /// Voyage rerank-2 relevance score, when rerank=true. 0–1ish.
  relevanceScore?: number
  /// Match channels that produced this hit. For UI / debugging.
  matchedBy: ('vector' | 'lexical')[]
  /// If this hit came from a reformulated query, the variant that surfaced it.
  matchedQuery?: string
}

export type RetrievalOpts = {
  orgId: string
  /// Author of the find_knowledge call. Threaded into SearchAnalytics.userId so
  /// the onboarding-competency metric (spec I) can count per-user repeats.
  /// Optional: WhatsApp legacy paths and the schema/probe harnesses don't have
  /// one and shouldn't fail the call.
  userId?: string
  venueId?: string
  limit?: number
  minSimilarity?: number
  /// Restrict to entity types. Defaults to all.
  entityTypes?: EntityType[]
  /// Restrict to entities tagged with at least one of these tags (array overlap).
  tags?: string[]
  /// Restrict to entities updated within the last N days.
  recencyDays?: number
  /// Restrict to a specific kind (e.g. docType slug, contact role).
  kinds?: string[]
  /// Default: true. Set false to skip Voyage rerank-2 pass on the candidate set.
  rerank?: boolean
  /// Default: true. Set false to skip Claude reformulation when initial query returns empty.
  reformulateOnEmpty?: boolean
  /// Default: false. Set true to surface KnowledgeItems with answerStatus='pending'
  /// (questions captured by record_kb_gap but not yet answered by a GM). Useful
  /// when the agent wants to tell staff "this has been asked but not yet answered".
  includePending?: boolean
  /// Default: false. Set true to drop the venue filter and search the entire
  /// organisation (sibling-venue knowledge). Useful when a venue's docs are
  /// thin and a sibling venue likely has the answer (multi-venue groups).
  crossVenue?: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const QUERY_MAX = 2048
const RRF_K = 60
const CANDIDATE_POOL = 50
/// Top-N chunks scanned in the chunk-level recall path. Sized so a single
/// MAX_EMBEDS_PER_DOCUMENT=200 doc can't crowd out others, while staying
/// cheap enough for brute-force cosine without a vector index.
const CHUNK_VEC_POOL = 200
/// Per-KI cap on sections that survive into the fused pool. Lets a multi-
/// section doc surface 2 distinct passages when both rank well, without
/// letting one doc monopolise the top-K.
const TOP_SECTIONS_PER_KI = 2
/// Rerank fires when there are >1 hits; if the post-rerank top relevance
/// score is below this floor, we treat the candidate set as weak and
/// retry retrieval with reformulated query variants.
const WEAK_RERANK_FLOOR = 0.35
const REFORMULATION_MAX_VARIANTS = 2
const REFORMULATION_TIMEOUT_MS = 5000

type FusedRow = {
  id: string
  entityType: string
  entityId: string
  subKey: string
  embeddingText: string
  title: string | null
  summary: string | null
  tags: string[]
  kind: string | null
  metadata: unknown
  kiContent: string | null
  kiAiSummary: string | null
  // Plan 01-02 — section-expansion LATERAL JOIN columns. Populated only for
  // entityType='knowledge_item' rows whose KI has been backfilled.
  sectionId: string | null
  sectionTitle: string | null
  sectionContent: string | null
  sectionTokenCount: number | null
  sectionTruncated: boolean | null
  cosine: number | string | null
  bm25: number | string | null
  vec_rank: number | string | null
  bm25_rank: number | string | null
  rrf_score: number | string
}

@Injectable()
export class RetrievalService implements OnModuleInit {
  private readonly logger = new Logger(RetrievalService.name)
  private anthropic!: Anthropic

  constructor(private readonly embeddings: EmbeddingsService) {}

  onModuleInit(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set — required for query reformulation')
    this.anthropic = new Anthropic({ apiKey })
  }

  async find(query: string, opts: RetrievalOpts): Promise<ToolResult<RetrievalHit[]>> {
    const trimmed = (query ?? '').trim()
    if (trimmed.length === 0) return fail('error', 'empty query')

    const capped = trimmed.length > QUERY_MAX ? trimmed.slice(0, QUERY_MAX) : trimmed
    if (trimmed.length > QUERY_MAX) {
      this.logger.warn(
        JSON.stringify({ event: 'retrieval.query_truncated', originalLength: trimmed.length }),
      )
    }

    if (!opts.orgId || !UUID_RE.test(opts.orgId)) {
      return fail('error', 'invalid orgId')
    }
    if (opts.venueId !== undefined && !UUID_RE.test(opts.venueId)) {
      return fail('error', 'invalid venueId')
    }

    const limit = Math.max(1, Math.min(20, opts.limit ?? 5))
    const minSim = Math.max(0, Math.min(1, opts.minSimilarity ?? 0.3))
    const rerank = opts.rerank ?? true
    const reformulate = opts.reformulateOnEmpty ?? true

    let hits = await this.runHybrid(capped, opts, limit * 2, minSim)
    let usedQuery = capped
    let reformulated = false

    // First-pass rerank so we can judge whether the top hit is strong enough
    // to skip reformulation. Without it, BM25 false-positives (which surface
    // for almost any keyword query) would suppress reformulation and the
    // model would answer from marginal-relevance hits.
    if (rerank && hits.length > 1) {
      hits = await this.applyRerank(capped, hits)
    }

    const topRelevance = hits[0]?.relevanceScore ?? null
    const weakTop = topRelevance !== null && topRelevance < WEAK_RERANK_FLOOR
    const shouldReformulate = reformulate && (hits.length === 0 || weakTop)

    if (shouldReformulate) {
      const variants = await this.reformulate(capped)
      const baseTopSim = hits[0]?.similarity ?? 0
      const baseTopScore = topRelevance ?? hits[0]?.similarity ?? 0
      for (const variant of variants) {
        // HyDE: `variant` is a hypothetical-answer paragraph used as the vec
        // input; `capped` (the user's original question) is passed as the
        // BM25 input so we keep the lexical leg meaningful.
        let altHits = await this.runHybrid(variant, opts, limit * 2, minSim, capped)
        if (altHits.length === 0) continue
        // Cheap triage — only spend a rerank call on variants whose
        // pre-rerank top similarity actually beats the initial path. Caps
        // worst-case Voyage rerank spend at 2 calls per find() (initial +
        // one promising variant) instead of 1 + N.
        const altPreRerankSim = altHits[0]?.similarity ?? 0
        if (altPreRerankSim <= baseTopSim && hits.length > 0) continue
        if (rerank && altHits.length > 1) {
          altHits = await this.applyRerank(variant, altHits)
        }
        // Fall back to similarity when rerank silently failed (no
        // relevanceScore on the variant hits). Without this, a variant
        // rerank failure would always lose the comparison and we'd
        // discard the variant even if its hybrid match was stronger.
        const altTop = altHits[0]?.relevanceScore ?? altHits[0]?.similarity ?? 0
        const altIsBetter = hits.length === 0 || altTop > baseTopScore
        if (altIsBetter) {
          hits = altHits.map((h) => ({ ...h, matchedQuery: variant }))
          usedQuery = variant
          reformulated = true
          break
        }
      }
    }

    if (hits.length === 0) {
      this.logCall(capped, opts.orgId, 'no-data', 0, null, { reformulated })
      void this.persistAnalytics(capped, opts, 'no-data', 0, null, reformulated)
      return fail(
        'no-data',
        'no relevant entities — searched semantically and lexically across knowledge, checklists, contacts, suppliers',
      )
    }

    const final = hits.slice(0, limit)
    this.logCall(usedQuery, opts.orgId, 'hit', final.length, final[0].similarity, {
      reformulated,
      reranked: rerank && hits.length > 1,
      topRelevance: final[0].relevanceScore ?? null,
    })
    void this.persistAnalytics(
      usedQuery,
      opts,
      'hit',
      final.length,
      final[0].similarity,
      reformulated,
    )
    return ok(final)
  }

  private async persistAnalytics(
    query: string,
    opts: RetrievalOpts,
    outcome: 'hit' | 'no-data' | 'error',
    hitCount: number,
    topSimilarity: number | null,
    reformulated: boolean,
  ): Promise<void> {
    try {
      await prisma.searchAnalytics.create({
        data: {
          organizationId: opts.orgId,
          userId: opts.userId ?? null,
          venueId: opts.venueId ?? null,
          query: query.slice(0, 500),
          outcome,
          hitCount,
          topSimilarity,
          reformulated,
        },
      })
    } catch (err) {
      // Analytics is best-effort; never fail the user's retrieval over a write.
      this.logger.warn(
        JSON.stringify({
          event: 'retrieval.analytics_persist_failed',
          message: (err as Error).message,
        }),
      )
    }
  }

  private async runHybrid(
    query: string,
    opts: RetrievalOpts,
    candidateLimit: number,
    minSim: number,
    /// Optional separate query for the BM25 leg. When omitted, the same string
    /// drives both vec and BM25. HyDE variants supply the hypothetical-answer
    /// paragraph as `query` (good vec signal) but pass the original user
    /// question as `bm25Query` (so plainto_tsquery doesn't AND 30+ paragraph
    /// lexemes and zero-out the BM25 leg).
    bm25Query?: string,
  ): Promise<RetrievalHit[]> {
    const entityTypes = opts.entityTypes && opts.entityTypes.length > 0 ? opts.entityTypes : null
    const tagFilter = opts.tags && opts.tags.length > 0 ? opts.tags : null
    const kindFilter = opts.kinds && opts.kinds.length > 0 ? opts.kinds : null
    const recencyDays =
      typeof opts.recencyDays === 'number' && opts.recencyDays > 0
        ? Math.min(3650, Math.floor(opts.recencyDays))
        : null

    let vec: number[]
    try {
      vec = await this.embeddings.embedText(query)
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'retrieval.embed_error',
          message: (err as Error).message,
        }),
      )
      return []
    }
    const vectorLiteral = `[${vec.join(',')}]`

    const effectiveBm25Query = bm25Query ?? query
    const params: unknown[] = [vectorLiteral, effectiveBm25Query, opts.orgId]
    let whereExtra = ''
    // Cross-venue mode drops the venue filter entirely; default keeps it
    // scoped to the user's venue (with global org-level rows still visible).
    if (opts.venueId && !opts.crossVenue) {
      params.push(opts.venueId)
      whereExtra += ` AND (se."venueId" = $${params.length} OR se."venueId" IS NULL)`
    }
    if (entityTypes) {
      params.push(entityTypes)
      whereExtra += ` AND se."entityType" = ANY($${params.length}::text[])`
    }
    if (tagFilter) {
      params.push(tagFilter)
      whereExtra += ` AND se."tags" && $${params.length}::text[]`
    }
    if (kindFilter) {
      params.push(kindFilter)
      whereExtra += ` AND se."kind" = ANY($${params.length}::text[])`
    }
    if (recencyDays !== null) {
      params.push(recencyDays)
      whereExtra += ` AND se."updatedAt" > NOW() - ($${params.length} || ' days')::interval`
    }
    // Pending knowledge gaps (records created by record_kb_gap, not yet
    // GM-answered) are tagged 'pending-answer' at index time. Filtered out
    // by default so the agent never quotes a question-as-answer.
    if (!opts.includePending) {
      whereExtra += ` AND NOT ('pending-answer' = ANY(se."tags"))`
    }
    params.push(candidateLimit)
    const limitParam = `$${params.length}`

    // Two-path vector recall:
    //   (1) KI chunk path — rank candidate sections by their best chunk's
    //       cosine distance. Catches narrow questions whose target sentence
    //       sits inside a section whose KI-level embedding is too diluted to
    //       surface. Yields one row per (KI, section) so a multi-section doc
    //       can contribute up to TOP_SECTIONS_PER_KI distinct passages.
    //   (2) SE-level fallback — for non-KI entities (contacts, checklist
    //       steps, etc.) AND for pre-backfill KIs that have no chunks yet.
    //       Section_id is NULL on those rows; coercion falls back to ki.content.
    // BM25 stays at the SE level (one tsvector per KI captures the whole doc).
    // BM25 hits for KIs are mapped to their best-matching vec section when a
    // chunk-level vec match exists; otherwise section_id is NULL.
    const sql = `
      WITH ki_chunk_pool AS (
        SELECT
          se.id         AS se_id,
          s.id          AS section_id,
          c.embedding <=> $1::vector AS dist
        FROM "knowledge_chunks" c
        JOIN "knowledge_sections" s ON c."sectionId" = s.id
        JOIN "searchable_entities" se
          ON se."entityType" = 'knowledge_item'
         AND se."entityId"   = s."knowledgeItemId"
         AND se."subKey"     = ''
        WHERE c.embedding IS NOT NULL
          AND se."organizationId" = $3
          ${whereExtra}
        ORDER BY c.embedding <=> $1::vector ASC
        LIMIT ${CHUNK_VEC_POOL}
      ),
      ki_section_best AS (
        SELECT se_id, section_id, MIN(dist) AS dist
        FROM ki_chunk_pool
        GROUP BY se_id, section_id
      ),
      ki_section_ranked AS (
        SELECT
          se_id, section_id, dist,
          ROW_NUMBER() OVER (PARTITION BY se_id ORDER BY dist ASC, section_id ASC) AS section_rank
        FROM ki_section_best
      ),
      ki_vec_hits AS (
        SELECT
          se_id,
          section_id,
          1 - dist AS cosine
        FROM ki_section_ranked
        WHERE section_rank <= ${TOP_SECTIONS_PER_KI}
      ),
      other_vec_hits AS (
        SELECT
          se.id AS se_id,
          NULL::text AS section_id,
          1 - (se.embedding <=> $1::vector) AS cosine,
          se.embedding <=> $1::vector AS dist
        FROM "searchable_entities" se
        WHERE se.embedding IS NOT NULL
          AND se."organizationId" = $3
          AND se."entityType" != 'knowledge_item'
          ${whereExtra}
        ORDER BY se.embedding <=> $1::vector ASC, se.id ASC
        LIMIT ${CANDIDATE_POOL}
      ),
      ki_se_fallback_hits AS (
        -- Two cases land here:
        --   1. Pre-backfill KIs that have no chunks at all — without this
        --      path they'd lose all vector recall.
        --   2. Backfilled KIs whose chunks all fell outside the top
        --      CHUNK_VEC_POOL by cosine distance. Treats SE-level embedding
        --      as a recall safety net so a chatty doc dominating the chunk
        --      pool can't suppress other docs whose KI-level embedding still
        --      matches well. Post-fuse this never produces duplicate rows
        --      since case (2) only fires when the KI is absent from
        --      ki_vec_hits.
        SELECT
          se.id AS se_id,
          NULL::text AS section_id,
          1 - (se.embedding <=> $1::vector) AS cosine,
          se.embedding <=> $1::vector AS dist
        FROM "searchable_entities" se
        WHERE se.embedding IS NOT NULL
          AND se."organizationId" = $3
          AND se."entityType" = 'knowledge_item'
          AND NOT EXISTS (SELECT 1 FROM ki_vec_hits k WHERE k.se_id = se.id)
          ${whereExtra}
        ORDER BY se.embedding <=> $1::vector ASC, se.id ASC
        LIMIT ${CANDIDATE_POOL}
      ),
      vec_combined AS (
        SELECT se_id, section_id, cosine, 1 - cosine AS dist FROM ki_vec_hits
        UNION ALL
        SELECT se_id, section_id, cosine, dist FROM other_vec_hits
        UNION ALL
        SELECT se_id, section_id, cosine, dist FROM ki_se_fallback_hits
      ),
      vec_hits AS (
        SELECT
          se_id, section_id, cosine,
          ROW_NUMBER() OVER (ORDER BY dist ASC, se_id ASC, COALESCE(section_id, '') ASC) AS rank
        FROM vec_combined
      ),
      bm25_hits AS (
        SELECT
          se.id AS se_id,
          ts_rank_cd(se."searchVector", q.query) AS bm25,
          ROW_NUMBER() OVER (ORDER BY ts_rank_cd(se."searchVector", q.query) DESC, se.id ASC) AS rank
        FROM "searchable_entities" se,
             plainto_tsquery('english', $2) AS q(query)
        WHERE se."searchVector" @@ q.query
          AND se."organizationId" = $3
          ${whereExtra}
        ORDER BY ts_rank_cd(se."searchVector", q.query) DESC, se.id ASC
        LIMIT ${CANDIDATE_POOL}
      ),
      bm25_resolved AS (
        -- Resolve each BM25 hit to a concrete section so the model gets a
        -- focused passage, not the whole ki.content. Two-tier cascade:
        --   1. Prefer the best section already in vec_hits for this se_id —
        --      cheapest and keeps vec/BM25 attributing to the same passage.
        --   2. When no vec section exists for the KI (BM25 matched but the
        --      doc fell outside the global top-CHUNK_VEC_POOL), run a tiny
        --      per-KI chunk vector search to pick THAT doc's best section.
        --      The chunk-cosine HNSW index is present but Postgres may opt
        --      for a nested-loop on the sectionId FK once the per-KI filter
        --      is applied (selective enough to prefer index-scan). Both
        --      paths are sub-millisecond at typical doc sizes; profile
        --      with EXPLAIN if a tenant grows past ~50k chunks per KI.
        --   3. If neither resolves (pre-backfill KI, no chunks at all),
        --      section_id stays NULL and the coercion layer falls back to
        --      ki.content as before.
        --
        -- Tenant boundary (defense-in-depth): the outer b.se_id is
        -- org-scoped via bm25_hits' organizationId filter, and se.id =
        -- b.se_id is a PK lookup so the inner SE row is locked to the
        -- same org. The explicit organizationId check below locks the
        -- invariant against future refactors that relax the PK match
        -- (e.g. switching to entityId).
        SELECT
          b.se_id,
          COALESCE(
            (SELECT v.section_id FROM vec_hits v
               WHERE v.se_id = b.se_id ORDER BY v.rank ASC LIMIT 1),
            (SELECT s.id
               FROM "searchable_entities" se
               JOIN "knowledge_sections" s ON s."knowledgeItemId" = se."entityId"
               JOIN "knowledge_chunks" c ON c."sectionId" = s.id
              WHERE se.id = b.se_id
                AND se."organizationId" = $3
                AND se."entityType" = 'knowledge_item'
                AND c.embedding IS NOT NULL
              ORDER BY c.embedding <=> $1::vector ASC
              LIMIT 1)
          ) AS section_id,
          b.bm25,
          b.rank
        FROM bm25_hits b
      ),
      fused AS (
        SELECT
          COALESCE(v.se_id, b.se_id)            AS se_id,
          COALESCE(v.section_id, b.section_id)  AS section_id,
          v.cosine                              AS cosine,
          b.bm25                                AS bm25,
          v.rank                                AS vec_rank,
          b.rank                                AS bm25_rank,
          (CASE WHEN v.rank IS NOT NULL THEN 1.0 / (${RRF_K} + v.rank) ELSE 0 END) +
          (CASE WHEN b.rank IS NOT NULL THEN 1.0 / (${RRF_K} + b.rank) ELSE 0 END) AS rrf_score
        FROM vec_hits v
        FULL OUTER JOIN bm25_resolved b
          ON v.se_id = b.se_id
         AND v.section_id IS NOT DISTINCT FROM b.section_id
      )
      SELECT
        se.id            AS "id",
        se."entityType"  AS "entityType",
        se."entityId"    AS "entityId",
        se."subKey"      AS "subKey",
        se."embeddingText" AS "embeddingText",
        se.title         AS "title",
        se.summary       AS "summary",
        se.tags          AS "tags",
        se.kind          AS "kind",
        se.metadata      AS "metadata",
        ki.content       AS "kiContent",
        ki."aiSummary"   AS "kiAiSummary",
        sec.id           AS "sectionId",
        sec.title        AS "sectionTitle",
        sec.content      AS "sectionContent",
        sec."tokenCount" AS "sectionTokenCount",
        sec.truncated    AS "sectionTruncated",
        f.cosine         AS "cosine",
        f.bm25           AS "bm25",
        f.vec_rank       AS "vec_rank",
        f.bm25_rank      AS "bm25_rank",
        f.rrf_score      AS "rrf_score"
      FROM fused f
      JOIN "searchable_entities" se ON se.id = f.se_id
      LEFT JOIN "knowledge_items" ki
        ON se."entityType" = 'knowledge_item' AND se."entityId" = ki.id
      LEFT JOIN "knowledge_sections" sec ON sec.id = f.section_id
      ORDER BY f.rrf_score DESC, se.id ASC, sec.id ASC NULLS LAST
      LIMIT ${limitParam}
    `

    // Plan 01-02 audit-S3 — measure SQL-and-coerce window for ops latency obs.
    const sqlT0 = Date.now()
    const rows = await prisma.$queryRawUnsafe<FusedRow[]>(sql, ...params)

    let sectionExpandedHits = 0
    let kiContentFallbackHits = 0
    let droppedNullContent = 0

    const coerced: RetrievalHit[] = []
    for (const r of rows) {
      const cosine = r.cosine !== null ? Number(r.cosine) : 0
      const matchedBy: ('vector' | 'lexical')[] = []
      if (r.vec_rank !== null) matchedBy.push('vector')
      if (r.bm25_rank !== null) matchedBy.push('lexical')

      // Plan 01-02 — content cascade: section.content → ki.content → summary → embeddingText.
      // Pre-backfill KIs (no sections) fall through to ki.content (AC-5).
      const content = r.sectionContent ?? r.kiContent ?? r.summary ?? r.embeddingText

      // Plan 01-02 audit-M4 / AC-10 — drop knowledge_item rows where every
      // fallback resolves to null/'' (deletion-race or data-integrity edge).
      if (
        r.entityType === 'knowledge_item' &&
        (content === null || content === undefined || content === '')
      ) {
        droppedNullContent++
        this.logger.warn(
          JSON.stringify({
            event: 'retrieval.row_dropped_null_content',
            entityId: r.entityId,
            reason: 'all-content-fallbacks-null',
          }),
        )
        continue
      }

      const baseMetadata = (r.metadata ?? {}) as Record<string, unknown>
      let metadata: Record<string, unknown> = baseMetadata
      if (r.sectionId) {
        sectionExpandedHits++
        // Defensive merge — existing metadata keys win on conflict.
        metadata = {
          sectionId: r.sectionId,
          sectionTitle: r.sectionTitle,
          sectionTokenCount: r.sectionTokenCount,
          sectionTruncated: r.sectionTruncated,
          ...baseMetadata,
        }
      } else if (r.entityType === 'knowledge_item') {
        kiContentFallbackHits++
      }

      coerced.push({
        id: r.id,
        entityType: r.entityType as EntityType,
        entityId: r.entityId,
        subKey: r.subKey,
        content,
        title: r.title,
        summary: r.summary,
        tags: r.tags,
        kind: r.kind,
        metadata,
        aiSummary: r.kiAiSummary,
        similarity: cosine,
        score: Number(r.rrf_score),
        matchedBy,
      })
    }

    const sectionExpansionLatencyMs = Date.now() - sqlT0
    this.logger.log(
      JSON.stringify({
        event: 'retrieval.section_expanded',
        totalHits: coerced.length,
        sectionExpandedHits,
        kiContentFallbackHits,
        droppedNullContent,
        sectionExpansionLatencyMs,
      }),
    )

    return coerced.filter((r) => r.matchedBy.includes('lexical') || r.similarity >= minSim)
  }

  private async applyRerank(query: string, hits: RetrievalHit[]): Promise<RetrievalHit[]> {
    try {
      // Feed rerank-2 the actual section content with a single title prefix
      // when present, rather than mashing title+summary+content together and
      // truncating to 4000 chars. The reranker is much better at picking the
      // right hit when given clean, fuller passages. Per-doc 8000-char cap
      // keeps the request well under Voyage's per-doc and total token ceilings
      // even with a 10-doc candidate set.
      const PER_DOC_CHAR_CAP = 8000
      const docs = hits.map((h) => {
        const titleLine = h.title?.trim() ? `${h.title.trim()}\n` : ''
        const body =
          h.content.length > PER_DOC_CHAR_CAP
            ? `${h.content.slice(0, PER_DOC_CHAR_CAP)}…`
            : h.content
        return `${titleLine}${body}`
      })
      const ranked = await this.embeddings.rerank(query, docs)
      if (ranked.length === 0) return hits
      const ordered: RetrievalHit[] = []
      for (const r of ranked) {
        const original = hits[r.index]
        if (!original) continue
        ordered.push({ ...original, relevanceScore: r.relevanceScore })
      }
      return ordered
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'retrieval.rerank_failed',
          message: (err as Error).message,
        }),
      )
      return hits
    }
  }

  private async reformulate(query: string): Promise<string[]> {
    // HyDE (Hypothetical Document Embeddings) — instead of generating
    // alternate phrasings of the user's question, generate one or two
    // short hypothetical-answer paragraphs and let runHybrid embed THOSE
    // as the search vectors. The answer's vocabulary typically matches
    // a doc's content vocabulary more closely than the question's does
    // (e.g. "where do kegs go?" → "Empty kegs are returned to the
    // outside cellar on collection days. Place them on the rear pad
    // grouped by supplier..." — that wording matches the SOP's text).
    // Source: https://arxiv.org/abs/2212.10496 (Gao et al., "Precise Zero-Shot
    // Dense Retrieval without Relevance Labels") · verified 2026-05-13
    //
    // Same Haiku call shape and trigger as before (only fires on weak
    // initial hits per find()'s gate). Time-bounded; soft-fails to empty
    // so a Claude outage never blocks retrieval.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REFORMULATION_TIMEOUT_MS)
    try {
      const response = await this.anthropic.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: `Write ${REFORMULATION_MAX_VARIANTS} short hypothetical answer paragraphs to this hospitality-operations question — as if you were a senior bar/pub/venue manager writing in an SOP. Each paragraph should be 2-4 sentences, contain domain-specific terminology (equipment names, procedure terms, role titles), and read like prose from a real procedure document. Do not hedge ("may", "might"); state it directly as if it were the canonical answer. The paragraphs will be embedded for retrieval — vocabulary realism beats accuracy.

Return STRICT JSON: {"variants": ["paragraph 1...", "paragraph 2..."]}. No commentary. Your first character must be {. Escape every inner double-quote as \\" so the JSON parses.

Query: ${query}`,
            },
          ],
        },
        { signal: controller.signal },
      )
      const raw = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('')
      const stripped = raw
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim()
      const parsed = JSON.parse(stripped) as { variants?: unknown }
      const variants = Array.isArray(parsed.variants) ? parsed.variants : []
      return variants
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .slice(0, REFORMULATION_MAX_VARIANTS)
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'retrieval.reformulate_failed',
          message: (err as Error).message,
        }),
      )
      return []
    } finally {
      clearTimeout(timer)
    }
  }

  private logCall(
    query: string,
    orgId: string,
    outcome: 'hit' | 'no-data' | 'error',
    count: number,
    topSimilarity: number | null,
    extra: Record<string, unknown> = {},
  ): void {
    const queryHash = createHash('sha256').update(query).digest('hex').slice(0, 8)
    const orgIdHash = createHash('sha256').update(orgId).digest('hex').slice(0, 16)
    this.logger.log(
      JSON.stringify({
        event: 'retrieval.call',
        queryLength: query.length,
        queryHash,
        orgIdHash,
        outcome,
        count,
        topSimilarity,
        ...extra,
      }),
    )
  }
}
