import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { Prisma, prisma } from '@gm-ai/database'
import { KnowledgeMetadataSchema, UUID_RE, type KnowledgeMetadata } from '@gm-ai/types'
import { EmbeddingsService } from '../embeddings/embeddings.service'

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

  constructor(private readonly embeddings: EmbeddingsService) {}

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

    return { id, metadata, aiSummary: null }
  }
}
