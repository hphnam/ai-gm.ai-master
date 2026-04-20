import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { prisma } from '@gm-ai/database'
import { fail, ok, type ToolResult } from '@gm-ai/types'
import { EmbeddingsService } from '../embeddings/embeddings.service'

export type RetrievalHit = {
  id: string
  content: string
  metadata: Record<string, unknown>
  aiSummary: string | null
  similarity: number
}

export type RetrievalOpts = {
  orgId: string
  venueId?: string
  limit?: number
  minSimilarity?: number
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const QUERY_MAX = 2048

type RawRow = {
  id: string
  content: string
  metadata: unknown
  aiSummary: string | null
  similarity: number | string
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name)

  constructor(private readonly embeddings: EmbeddingsService) {}

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

    let vec: number[]
    try {
      vec = await this.embeddings.embedText(capped)
    } catch (err) {
      const detail = `embedding service unavailable: ${(err as Error).message}`
      this.logCall(capped, opts.orgId, 'error', 0, null)
      return fail('error', detail)
    }

    const vectorLiteral = `[${vec.join(',')}]`
    const rows: RawRow[] = opts.venueId
      ? await prisma.$queryRawUnsafe<RawRow[]>(
          `SELECT id, content, metadata, "aiSummary", 1 - (embedding <=> $1::vector) AS similarity
           FROM "knowledge_items"
           WHERE embedding IS NOT NULL
             AND "organizationId" = $2
             AND ("venueId" = $3 OR "venueId" IS NULL)
           ORDER BY embedding <=> $1::vector ASC, id ASC
           LIMIT $4`,
          vectorLiteral,
          opts.orgId,
          opts.venueId,
          limit,
        )
      : await prisma.$queryRawUnsafe<RawRow[]>(
          `SELECT id, content, metadata, "aiSummary", 1 - (embedding <=> $1::vector) AS similarity
           FROM "knowledge_items"
           WHERE embedding IS NOT NULL
             AND "organizationId" = $2
           ORDER BY embedding <=> $1::vector ASC, id ASC
           LIMIT $3`,
          vectorLiteral,
          opts.orgId,
          limit,
        )

    const coerced: RetrievalHit[] = rows.map((r) => ({
      id: r.id,
      content: r.content,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
      aiSummary: r.aiSummary,
      similarity: Number(r.similarity),
    }))

    const hits = coerced.filter((r) => r.similarity >= minSim)

    if (hits.length === 0) {
      if (coerced.length === 0) {
        this.logCall(capped, opts.orgId, 'no-data', 0, null)
        return fail('no-data', 'no embedded knowledge_items found')
      }
      const topSim = coerced[0].similarity
      this.logCall(capped, opts.orgId, 'no-data', 0, topSim)
      return fail(
        'no-data',
        `max similarity ${topSim.toFixed(3)} below threshold ${minSim.toFixed(2)}`,
      )
    }

    this.logCall(capped, opts.orgId, 'hit', hits.length, hits[0].similarity)
    return ok(hits)
  }

  private logCall(
    query: string,
    orgId: string,
    outcome: 'hit' | 'no-data' | 'error',
    count: number,
    topSimilarity: number | null,
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
      }),
    )
  }
}
