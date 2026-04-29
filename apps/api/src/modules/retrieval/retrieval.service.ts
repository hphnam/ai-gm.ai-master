import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { createHash } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
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
  /// Voyage rerank-lite-1 relevance score, when rerank=true. 0–1ish.
  relevanceScore?: number
  /// Match channels that produced this hit. For UI / debugging.
  matchedBy: ('vector' | 'lexical')[]
  /// If this hit came from a reformulated query, the variant that surfaced it.
  matchedQuery?: string
}

export type RetrievalOpts = {
  orgId: string
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
  /// Default: true. Set false to skip Voyage rerank-lite-1 pass on the candidate set.
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

    if (hits.length === 0 && reformulate) {
      const variants = await this.reformulate(capped)
      for (const variant of variants) {
        const altHits = await this.runHybrid(variant, opts, limit * 2, minSim)
        if (altHits.length > 0) {
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

    if (rerank && hits.length > 1) {
      hits = await this.applyRerank(usedQuery, hits)
    }

    const final = hits.slice(0, limit)
    this.logCall(usedQuery, opts.orgId, 'hit', final.length, final[0].similarity, {
      reformulated,
      reranked: rerank && hits.length > 1,
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
  ): Promise<RetrievalHit[]> {
    const entityTypes =
      opts.entityTypes && opts.entityTypes.length > 0 ? opts.entityTypes : null
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

    const params: unknown[] = [vectorLiteral, query, opts.orgId]
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

    const sql = `
      WITH vec_hits AS (
        SELECT
          se.id AS id,
          1 - (se.embedding <=> $1::vector) AS cosine,
          ROW_NUMBER() OVER (ORDER BY se.embedding <=> $1::vector ASC, se.id ASC) AS rank
        FROM "searchable_entities" se
        WHERE se.embedding IS NOT NULL
          AND se."organizationId" = $3
          ${whereExtra}
        ORDER BY se.embedding <=> $1::vector ASC, se.id ASC
        LIMIT ${CANDIDATE_POOL}
      ),
      bm25_hits AS (
        SELECT
          se.id AS id,
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
      fused AS (
        SELECT
          COALESCE(v.id, b.id)                          AS id,
          v.cosine                                      AS cosine,
          b.bm25                                        AS bm25,
          v.rank                                        AS vec_rank,
          b.rank                                        AS bm25_rank,
          (CASE WHEN v.rank IS NOT NULL THEN 1.0 / (${RRF_K} + v.rank) ELSE 0 END) +
          (CASE WHEN b.rank IS NOT NULL THEN 1.0 / (${RRF_K} + b.rank) ELSE 0 END) AS rrf_score
        FROM vec_hits v
        FULL OUTER JOIN bm25_hits b ON v.id = b.id
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
        sec.section_id        AS "sectionId",
        sec.section_title     AS "sectionTitle",
        sec.section_content   AS "sectionContent",
        sec.section_token_count AS "sectionTokenCount",
        sec.section_truncated AS "sectionTruncated",
        f.cosine         AS "cosine",
        f.bm25           AS "bm25",
        f.vec_rank       AS "vec_rank",
        f.bm25_rank      AS "bm25_rank",
        f.rrf_score      AS "rrf_score"
      FROM fused f
      JOIN "searchable_entities" se ON se.id = f.id
      LEFT JOIN "knowledge_items" ki
        ON se."entityType" = 'knowledge_item' AND se."entityId" = ki.id
      -- Plan 01-02 — section-expansion LATERAL JOIN. For each knowledge_item
      -- hit, pick the section whose chunks rank highest by cosine similarity
      -- to the query vector. Single round-trip — no N+1.
      LEFT JOIN LATERAL (
        SELECT s.id AS section_id, s.title AS section_title, s.content AS section_content,
               s."tokenCount" AS section_token_count, s.truncated AS section_truncated
        FROM "knowledge_sections" s
        JOIN "knowledge_chunks" c ON c."sectionId" = s.id
        WHERE s."knowledgeItemId" = ki.id AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> $1::vector ASC
        LIMIT 1
      ) sec ON se."entityType" = 'knowledge_item'
      ORDER BY f.rrf_score DESC, se.id ASC
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
      const docs = hits.map((h) =>
        [h.title, h.summary, h.content].filter(Boolean).join('\n').slice(0, 4000),
      )
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
    // One Haiku call → up to 2 alternative phrasings. Time-bounded; soft-fails
    // to empty so a Claude outage never blocks retrieval.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REFORMULATION_TIMEOUT_MS)
    try {
      const response = await this.anthropic.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          messages: [
            {
              role: 'user',
              content: `Rephrase this hospitality-operations search query in ${REFORMULATION_MAX_VARIANTS} alternative ways. Each rephrase should broaden synonyms or extract the underlying intent (e.g. "where do empty kegs go" → "empty cask storage location" / "returning kegs procedure"). Return STRICT JSON: {"variants": ["...", "..."]}. No commentary.

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
