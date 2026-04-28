import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { Prisma, prisma } from '@gm-ai/database'
import { KnowledgeMetadataSchema, UUID_RE, type KnowledgeMetadata } from '@gm-ai/types'
import { EmbeddingsService } from '../embeddings/embeddings.service'
import { IndexerService } from '../indexer/indexer.service'

// Plan 04-02 Task 2 — Prisma 7 Json columns reject raw `null`; must use Prisma.JsonNull
// sentinel for explicit-null writes. Helper keeps upsert sites readable.
function proposalToJsonInput(p: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return p ? (p as Prisma.InputJsonValue) : Prisma.JsonNull
}

export type IngestInput = {
  id?: string
  title?: string
  content: string
  category?: string
  organizationId: string
  venueId?: string | null
  // Plan 04-01 Task 3 — image-via-Claude-vision source persistence (audit-S3 Option A).
  sourceImageBytes?: Buffer | null
  sourceImageMime?: string | null
  // Plan 04-02 Task 2 — per-tenant classifier output persistence.
  // documentTypeId non-null → matched an existing confirmed type (auto-classified).
  // pendingTypeProposal non-null → classifier proposed a new type; owner confirms in UI.
  documentTypeId?: string | null
  pendingTypeProposal?: Record<string, unknown> | null
}

export type IngestResult = {
  id: string
  metadata: KnowledgeMetadata
  aiSummary: string | null
}

@Injectable()
export class IngestService implements OnModuleInit {
  private readonly logger = new Logger(IngestService.name)
  private client!: Anthropic

  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly indexer: IndexerService,
  ) {}

  onModuleInit() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it to .env at repo root')
    this.client = new Anthropic({ apiKey })
  }

  async ingest(input: IngestInput): Promise<IngestResult> {
    if (!input.organizationId || !UUID_RE.test(input.organizationId)) {
      throw new Error('ingest: organizationId required and must be a valid UUID')
    }
    const id = input.id ?? randomUUID()
    const parsed = await this.enrich(input)

    if (!parsed) {
      return this.persistFailSoft(id, input)
    }

    await this.resolveCrossRefs(parsed)

    const embeddingText = [
      input.title ?? '',
      parsed.summary ?? '',
      (parsed.tags ?? []).join(', '),
      (parsed.crossRefs ?? []).map((r) => r.ref).filter((r): r is string => !!r).join(', '),
      input.content,
    ]
      .filter((s) => s.length > 0)
      .join('. ')

    const [vec] = await this.embeddings.embedDocuments([embeddingText])

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeItem.upsert({
        where: { id },
        create: {
          id,
          organizationId: input.organizationId,
          venueId: input.venueId ?? null,
          content: input.content,
          metadata: parsed as object,
          aiSummary: parsed.summary ?? null,
          embeddingText,
          // Prisma 7 Bytes column expects Uint8Array<ArrayBuffer>; Node's Buffer is
          // Uint8Array<ArrayBufferLike>. new Uint8Array(buf) normalizes at the boundary.
          sourceImageBytes: input.sourceImageBytes
            ? new Uint8Array(input.sourceImageBytes)
            : null,
          sourceImageMime: input.sourceImageMime ?? null,
          documentTypeId: input.documentTypeId ?? null,
          pendingTypeProposal: proposalToJsonInput(input.pendingTypeProposal),
        },
        update: {
          organizationId: input.organizationId,
          venueId: input.venueId ?? null,
          content: input.content,
          metadata: parsed as object,
          aiSummary: parsed.summary ?? null,
          embeddingText,
          // Prisma 7 Bytes column expects Uint8Array<ArrayBuffer>; Node's Buffer is
          // Uint8Array<ArrayBufferLike>. new Uint8Array(buf) normalizes at the boundary.
          sourceImageBytes: input.sourceImageBytes
            ? new Uint8Array(input.sourceImageBytes)
            : null,
          sourceImageMime: input.sourceImageMime ?? null,
          documentTypeId: input.documentTypeId ?? null,
          pendingTypeProposal: proposalToJsonInput(input.pendingTypeProposal),
        },
      })
      await tx.$executeRawUnsafe(
        `UPDATE "knowledge_items" SET embedding = $1::vector WHERE id = $2`,
        `[${vec.join(',')}]`,
        id,
      )
    })

    await this.indexer.upsert({
      organizationId: input.organizationId,
      venueId: input.venueId ?? null,
      entityType: 'knowledge_item',
      entityId: id,
      embeddingText,
      precomputedEmbedding: vec,
      tags: parsed.tags ?? [],
      kind: typeof parsed.docType === 'string' ? parsed.docType : null,
      title: input.title ?? null,
      summary: parsed.summary ?? null,
      metadata: {
        documentTypeId: input.documentTypeId ?? null,
        contentLength: input.content.length,
      },
    })

    return { id, metadata: parsed, aiSummary: parsed.summary ?? null }
  }

  private async enrich(input: IngestInput): Promise<KnowledgeMetadata | null> {
    const prompt = `You are a hospitality knowledge-base assistant. Read the document below and return a single JSON object describing it. Keys you SHOULD fill:
  summary:   1-2 sentence string
  tags:      array of 3-8 short strings
  docType:   1-2 word freeform string (e.g. procedure, troubleshooting, policy, checklist, menu-pairing, event-plan — anything fitting)
  crossRefs: array of objects of shape { "ref": "<natural-language reference to another doc, e.g. a title, a procedure name>" } — empty array if none

You MAY ALSO add any other top-level keys that you think are useful for later retrieval (for example: contactNames, errorCodes, timeOfDay, roomsAffected, suppliers, tools). Use whatever names feel natural. Short strings or string arrays only — no nested objects beyond crossRefs.

Return strict JSON. No markdown fences. No commentary.

Title (if any): ${input.title ?? ''}
User-provided category (if any): ${input.category ?? ''}
Content:
${input.content}`

    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('')

      const stripped = raw
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim()

      try {
        const json = JSON.parse(stripped)
        const parsed = KnowledgeMetadataSchema.parse(json)
        return parsed
      } catch (err) {
        this.logger.warn(
          `Ingest enrich for "${input.title ?? '(untitled)'}" failed parse/validate on attempt ${attempt}: ${(err as Error).message}`,
        )
      }
    }
    return null
  }

  private async resolveCrossRefs(parsed: KnowledgeMetadata): Promise<void> {
    const xrefs = parsed.crossRefs ?? []
    for (const xref of xrefs) {
      if (xref.id || !xref.ref) continue
      const hit = await prisma.knowledgeItem.findFirst({
        where: { content: { contains: xref.ref, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      if (hit) xref.id = hit.id
    }
  }

  private async persistFailSoft(id: string, input: IngestInput): Promise<IngestResult> {
    const metadata: KnowledgeMetadata = {
      tags: [],
      category: input.category ?? undefined,
    }
    this.logger.warn(
      JSON.stringify({
        level: 'warn',
        event: 'ingest.failsafe',
        title: input.title ?? null,
        reason: 'claude-enrichment-failed-after-retries',
      }),
    )

    const embeddingText = input.content
    const [vec] = await this.embeddings.embedDocuments([embeddingText])

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeItem.upsert({
        where: { id },
        create: {
          id,
          organizationId: input.organizationId,
          venueId: input.venueId ?? null,
          content: input.content,
          metadata: metadata as object,
          aiSummary: null,
          embeddingText,
          // Prisma 7 Bytes column expects Uint8Array<ArrayBuffer>; Node's Buffer is
          // Uint8Array<ArrayBufferLike>. new Uint8Array(buf) normalizes at the boundary.
          sourceImageBytes: input.sourceImageBytes
            ? new Uint8Array(input.sourceImageBytes)
            : null,
          sourceImageMime: input.sourceImageMime ?? null,
          documentTypeId: input.documentTypeId ?? null,
          pendingTypeProposal: proposalToJsonInput(input.pendingTypeProposal),
        },
        update: {
          organizationId: input.organizationId,
          venueId: input.venueId ?? null,
          content: input.content,
          metadata: metadata as object,
          aiSummary: null,
          embeddingText,
          // Prisma 7 Bytes column expects Uint8Array<ArrayBuffer>; Node's Buffer is
          // Uint8Array<ArrayBufferLike>. new Uint8Array(buf) normalizes at the boundary.
          sourceImageBytes: input.sourceImageBytes
            ? new Uint8Array(input.sourceImageBytes)
            : null,
          sourceImageMime: input.sourceImageMime ?? null,
          documentTypeId: input.documentTypeId ?? null,
          pendingTypeProposal: proposalToJsonInput(input.pendingTypeProposal),
        },
      })
      await tx.$executeRawUnsafe(
        `UPDATE "knowledge_items" SET embedding = $1::vector WHERE id = $2`,
        `[${vec.join(',')}]`,
        id,
      )
    })

    await this.indexer.upsert({
      organizationId: input.organizationId,
      venueId: input.venueId ?? null,
      entityType: 'knowledge_item',
      entityId: id,
      embeddingText,
      precomputedEmbedding: vec,
      tags: [],
      kind: null,
      title: input.title ?? null,
      summary: null,
      metadata: {
        documentTypeId: input.documentTypeId ?? null,
        contentLength: input.content.length,
        failsafe: true,
      },
    })

    return { id, metadata, aiSummary: null }
  }

  /// Phase C — capture an unanswered question as a pending KnowledgeItem.
  /// Dedupes by cosine similarity (≥ 0.85) against existing pending gaps in
  /// the same org+venue scope; on dedup, bumps askCount + appends provenance.
  async recordGap(input: {
    question: string
    tentativeAnswer?: string | null
    organizationId: string
    venueId: string | null
    askedByUserId: string
    sourceMessageId?: string | null
  }): Promise<{ id: string; askCount: number; dedupedFromExisting: boolean }> {
    if (!UUID_RE.test(input.organizationId)) {
      throw new Error('recordGap: organizationId required and must be a valid UUID')
    }
    const question = input.question.trim()
    if (question.length < 5) throw new Error('recordGap: question too short')

    const [vec] = await this.embeddings.embedDocuments([question])
    const vectorLiteral = `[${vec.join(',')}]`

    // Look for an existing pending gap in scope. Same-venue OR global (null);
    // keep the highest-similarity hit if it crosses the dedup threshold.
    const candidates = await prisma.$queryRawUnsafe<
      { id: string; metadata: unknown; similarity: number | string }[]
    >(
      `
      SELECT ki.id, ki.metadata, 1 - (ki.embedding <=> $1::vector) AS similarity
      FROM "knowledge_items" ki
      WHERE ki.embedding IS NOT NULL
        AND ki."organizationId" = $2
        AND ki."answerStatus" = 'pending'
        AND ($3::text IS NULL OR ki."venueId" IS NULL OR ki."venueId" = $3)
      ORDER BY ki.embedding <=> $1::vector ASC
      LIMIT 1
      `,
      vectorLiteral,
      input.organizationId,
      input.venueId,
    )

    const top = candidates[0]
    if (top && Number(top.similarity) >= 0.85) {
      // Bump existing pending gap.
      const existingMeta = (top.metadata ?? {}) as Record<string, unknown>
      const askCount =
        (typeof existingMeta.askCount === 'number' ? existingMeta.askCount : 1) + 1
      const askedByList = Array.isArray(existingMeta.askedByUserIds)
        ? (existingMeta.askedByUserIds as unknown[]).filter(
            (v): v is string => typeof v === 'string',
          )
        : []
      if (!askedByList.includes(input.askedByUserId)) {
        askedByList.push(input.askedByUserId)
      }
      const sourceList = Array.isArray(existingMeta.sourceMessageIds)
        ? (existingMeta.sourceMessageIds as unknown[]).filter(
            (v): v is string => typeof v === 'string',
          )
        : []
      if (input.sourceMessageId && !sourceList.includes(input.sourceMessageId)) {
        sourceList.push(input.sourceMessageId)
      }
      const newMeta = {
        ...existingMeta,
        askCount,
        askedByUserIds: askedByList,
        sourceMessageIds: sourceList,
        isGap: true,
        lastAskedAt: new Date().toISOString(),
      }
      await prisma.knowledgeItem.update({
        where: { id: top.id },
        data: { metadata: newMeta as object },
      })
      this.logger.log(
        JSON.stringify({
          event: 'kb_gap.deduped',
          gapId: top.id,
          orgId: input.organizationId,
          askCount,
          similarity: Number(top.similarity),
        }),
      )
      return { id: top.id, askCount, dedupedFromExisting: true }
    }

    // Net-new gap.
    const id = randomUUID()
    const metadata = {
      isGap: true,
      tentativeAnswer: input.tentativeAnswer ?? null,
      askCount: 1,
      askedByUserIds: [input.askedByUserId],
      sourceMessageIds: input.sourceMessageId ? [input.sourceMessageId] : [],
      firstAskedAt: new Date().toISOString(),
    }

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeItem.create({
        data: {
          id,
          organizationId: input.organizationId,
          venueId: input.venueId,
          content: question,
          metadata,
          aiSummary: null,
          embeddingText: question,
          answerStatus: 'pending',
          // No documentTypeId yet — classifier runs once GM answers.
        },
      })
      await tx.$executeRawUnsafe(
        `UPDATE "knowledge_items" SET embedding = $1::vector WHERE id = $2`,
        vectorLiteral,
        id,
      )
    })

    await this.indexer.upsert({
      organizationId: input.organizationId,
      venueId: input.venueId,
      entityType: 'knowledge_item',
      entityId: id,
      embeddingText: question,
      precomputedEmbedding: vec,
      tags: ['gap', 'pending-answer'],
      kind: 'gap',
      title: question.slice(0, 120),
      summary: input.tentativeAnswer ?? null,
      metadata: {
        answerStatus: 'pending',
        askCount: 1,
        isGap: true,
      },
    })

    this.logger.log(
      JSON.stringify({
        event: 'kb_gap.recorded',
        gapId: id,
        orgId: input.organizationId,
        venueId: input.venueId,
        askedByUserId: input.askedByUserId,
        questionLength: question.length,
        hasTentativeAnswer: !!input.tentativeAnswer,
      }),
    )

    return { id, askCount: 1, dedupedFromExisting: false }
  }
}
