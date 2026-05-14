import { createHash, randomUUID } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { Prisma, prisma } from '../../database/prisma'
import {
  CURRENT_SECTION_VERSION,
  EMBED_QUALITY_DEGRADED_THRESHOLD,
  EMBED_QUEUE_TIMEOUT_MS,
  INGEST_EMBED_PHASE_TIMEOUT_MS,
  type KnowledgeMetadata,
  KnowledgeMetadataSchema,
  MAX_CONCURRENT_CHUNK_EMBEDS,
  MAX_EMBEDS_PER_DOCUMENT,
  MAX_TABULAR_ROWS_PER_DOC,
  type SectionDetectionResult,
  type TabularExtractionResult,
  UUID_RE,
} from '../../types'
import { ExpiryExtractorService } from '../compliance/expiry-extractor.service'
import { EmbeddingsService } from '../embeddings/embeddings.service'
import { IndexerService } from '../indexer/indexer.service'
import { inferColumnTypes } from '../tabular/infer-column-types'
import { SectionDetector } from './section-detector'

function hashOrgId(orgId: string): string {
  // PII-safe correlation id for log search; sha-256 truncated to 12 hex chars.
  return createHash('sha256').update(orgId).digest('hex').slice(0, 12)
}

// Plan 04-02 Task 2 — Prisma 7 Json columns reject raw `null`; must use Prisma.JsonNull
// sentinel for explicit-null writes. Helper keeps upsert sites readable.
function proposalToJsonInput(
  p: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
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
  // Plan 01-01 — extractor mime hint for SectionDetector dispatch (CSV row-batch,
  // PPTX slide-marker split, sheet-marker split). Optional; absent → heading regex fallback.
  mimeType?: string | null
  // Phase 6 — tables already extracted upstream by Reducto. Replaces the
  // previous tabularSourceBytes flow. First table gets persisted to
  // tabular_rows + tabular_columns; rest are dropped (multi-table per doc
  // deferred D-05-01-A). Null → tabular tee is skipped.
  parsedTables?: TabularExtractionResult[] | null
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
    private readonly sectionDetector: SectionDetector,
    private readonly expiryExtractor: ExpiryExtractorService,
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
      (parsed.crossRefs ?? [])
        .map((r) => r.ref)
        .filter((r): r is string => !!r)
        .join(', '),
      input.content,
    ]
      .filter((s) => s.length > 0)
      .join('. ')

    const [vec] = await this.embeddings.embedDocuments([embeddingText])

    // Preserve user-supplied title/category — the LLM doesn't echo them back, so a
    // raw `parsed` overwrite would wipe the title and the list-view falls back to
    // `docType`, making the doc appear renamed (e.g. "Opening Checklist" → "checklist").
    const mergedMetadata = {
      ...parsed,
      title: input.title ?? parsed.title ?? null,
      category: input.category ?? parsed.category,
    }

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeItem.upsert({
        where: { id },
        create: {
          id,
          organizationId: input.organizationId,
          venueId: input.venueId ?? null,
          content: input.content,
          metadata: mergedMetadata as object,
          aiSummary: parsed.summary ?? null,
          embeddingText,
          // Prisma 7 Bytes column expects Uint8Array<ArrayBuffer>; Node's Buffer is
          // Uint8Array<ArrayBufferLike>. new Uint8Array(buf) normalizes at the boundary.
          sourceImageBytes: input.sourceImageBytes ? new Uint8Array(input.sourceImageBytes) : null,
          sourceImageMime: input.sourceImageMime ?? null,
          documentTypeId: input.documentTypeId ?? null,
          pendingTypeProposal: proposalToJsonInput(input.pendingTypeProposal),
        },
        update: {
          organizationId: input.organizationId,
          venueId: input.venueId ?? null,
          content: input.content,
          metadata: mergedMetadata as object,
          aiSummary: parsed.summary ?? null,
          embeddingText,
          // Prisma 7 Bytes column expects Uint8Array<ArrayBuffer>; Node's Buffer is
          // Uint8Array<ArrayBufferLike>. new Uint8Array(buf) normalizes at the boundary.
          sourceImageBytes: input.sourceImageBytes ? new Uint8Array(input.sourceImageBytes) : null,
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

    // Plan 01-01 — hierarchical persistence (audit-M1 two-phase: section rows
    // commit BEFORE Voyage chunk-embed calls, then bounded-concurrency embed worker).
    await this.persistSectionsAndEmbed(
      id,
      input.content,
      input.mimeType ?? null,
      input.organizationId,
    )

    // Plan 05-01 Task 2 — structured-data tee. Runs AFTER section/chunk persistence
    // in a try/catch so a CSV/XLSX parse failure cannot poison Phase 1 retrieval.
    // Only fires when both mimeType and tabularSourceBytes are present.
    await this.persistTabular(id, input)

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

    // Wave 2 — compliance / expiry extractor runs once per new doc. Soft-fails
    // (try/catch + the service's own internal error handling): the doc still
    // indexes even if the Haiku classifier hiccups, and a non-compliance doc
    // returns null silently.
    try {
      await this.expiryExtractor.extractAndStore(id, input.organizationId)
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'ingest.expiry_extractor_failed',
          knowledgeItemId: id,
          orgId: hashOrgId(input.organizationId),
          message: (err as Error)?.message ?? 'unknown',
        }),
      )
    }

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
      // Preserve user-supplied title — without it, the list view falls back to
      // `docType` (which is empty here), and the doc renders as 'Untitled'.
      title: input.title ?? null,
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
          sourceImageBytes: input.sourceImageBytes ? new Uint8Array(input.sourceImageBytes) : null,
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
          sourceImageBytes: input.sourceImageBytes ? new Uint8Array(input.sourceImageBytes) : null,
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

    // Plan 01-01 — hierarchical persistence runs even on enrichment fail-soft so
    // chunk-level retrieval (01-02) still has structure to draw on.
    await this.persistSectionsAndEmbed(
      id,
      input.content,
      input.mimeType ?? null,
      input.organizationId,
    )

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
      const askCount = (typeof existingMeta.askCount === 'number' ? existingMeta.askCount : 1) + 1
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

  // ──────────────────────────────────────────────────────────────────
  // Plan 01-01 — hierarchical section/chunk persistence (audit-M1 two-phase).
  //
  // Phase 1 (in-tx): replace sections (cascade chunks) → create section + chunk
  //                  rows with embedding=null. No Voyage HTTP inside the tx.
  // Phase 2 (post-commit): bounded-concurrency embed worker writes
  //                        knowledge_chunks.embedding via $executeRaw, with
  //                        retry (M3), per-doc cap (M3), per-phase timeout (M2),
  //                        per-chunk queue timeout (M2), aggregate telemetry (M7).
  // ──────────────────────────────────────────────────────────────────

  /**
   * Plan 01-02 — public surface so backfill-knowledge-sections.ts can replay
   * the persistence pipeline against existing KnowledgeItem rows. Return shape
   * extended (audit-M5) with quality fields so backfill can aggregate signals
   * across the run.
   */
  async persistSectionsAndEmbed(
    knowledgeItemId: string,
    content: string,
    mimeType: string | null,
    organizationId: string,
  ): Promise<{
    sectionCount: number
    chunkCount: number
    embeddedCount: number
    embedFailedCount: number
    embedQualityDegraded: boolean
  }> {
    const detection: SectionDetectionResult = this.sectionDetector.detect(content, mimeType)

    // Phase 1 — in-tx row creation (no Voyage calls). Pre-generated UUIDs let
    // us createMany sections+chunks in two bulk inserts (avoids interactive-tx
    // timeout on 200+ chunk fixtures). Tx timeout extended to 30s for headroom.
    const sectionRows = detection.sections.map((s, sIdx) => ({
      id: randomUUID(),
      knowledgeItemId,
      organizationId,
      sectionIndex: sIdx,
      title: s.title ?? `Section ${sIdx + 1}`, // audit-S2 fallback at write time.
      content: s.content,
      tokenCount: s.tokenCount,
      sectionVersion: CURRENT_SECTION_VERSION,
      truncated: s.truncated,
    }))
    const chunkRows: {
      id: string
      sectionId: string
      organizationId: string
      chunkIndex: number
      content: string
      embeddingText: string
      tokenCount: number
    }[] = []
    const persistedChunkIds: {
      id: string
      sectionIndex: number
      chunkIndex: number
      text: string
    }[] = []
    for (let sIdx = 0; sIdx < detection.sections.length; sIdx++) {
      const section = detection.sections[sIdx]
      const sectionId = sectionRows[sIdx].id
      for (let cIdx = 0; cIdx < section.chunks.length; cIdx++) {
        const chunk = section.chunks[cIdx]
        const chunkId = randomUUID()
        chunkRows.push({
          id: chunkId,
          sectionId,
          organizationId,
          chunkIndex: cIdx,
          content: chunk.content,
          embeddingText: chunk.content,
          tokenCount: chunk.tokenCount,
        })
        persistedChunkIds.push({
          id: chunkId,
          sectionIndex: sIdx,
          chunkIndex: cIdx,
          text: chunk.content,
        })
      }
    }
    await prisma.$transaction(
      async (tx) => {
        await tx.knowledgeSection.deleteMany({ where: { knowledgeItemId } })
        if (sectionRows.length > 0) await tx.knowledgeSection.createMany({ data: sectionRows })
        if (chunkRows.length > 0) await tx.knowledgeChunk.createMany({ data: chunkRows })
      },
      { timeout: 30_000 },
    )

    // Phase 2 — post-commit chunk embedding with bounded concurrency.
    const telemetry = await this.embedChunks(persistedChunkIds, knowledgeItemId, organizationId)

    const sectionCount = detection.sections.length
    const truncatedCount = detection.sections.filter((s) => s.truncated).length
    const totalChunkCount = persistedChunkIds.length
    const eligible = telemetry.eligibleChunkCount
    const embedFailedRatio = eligible > 0 ? 1 - telemetry.embeddedCount / eligible : 0
    const embedQualityDegraded = eligible > 0 && embedFailedRatio > EMBED_QUALITY_DEGRADED_THRESHOLD

    this.logger.log(
      JSON.stringify({
        level: 'info',
        event: 'ingest.sections_persisted',
        sectionCount,
        chunkCount: totalChunkCount,
        truncatedCount,
        embeddedCount: telemetry.embeddedCount,
        embedFailedCount: telemetry.embedFailedCount,
        embedCapExceededCount: telemetry.embedCapExceededCount,
        embedQueueTimeoutCount: telemetry.embedQueueTimeoutCount,
        embedPhaseTimeoutCount: telemetry.embedPhaseTimeoutCount,
        embedFailedRatio,
        voyageCallCount: telemetry.voyageCallCount,
        knowledgeItemId,
        organizationId,
      }),
    )

    // audit-M7: quality-degraded WARN signal for operator dashboards.
    if (embedQualityDegraded) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'ingest.embed_quality_degraded',
          embedFailedRatio,
          eligibleChunkCount: eligible,
          embeddedCount: telemetry.embeddedCount,
          knowledgeItemId,
          organizationId,
        }),
      )
    }

    return {
      sectionCount,
      chunkCount: totalChunkCount,
      embeddedCount: telemetry.embeddedCount,
      embedFailedCount: telemetry.embedFailedCount,
      embedQualityDegraded,
    }
  }

  private async embedChunks(
    persistedChunks: { id: string; sectionIndex: number; chunkIndex: number; text: string }[],
    knowledgeItemId: string,
    organizationId: string,
  ): Promise<{
    eligibleChunkCount: number
    embeddedCount: number
    embedFailedCount: number
    embedCapExceededCount: number
    embedQueueTimeoutCount: number
    embedPhaseTimeoutCount: number
    voyageCallCount: number
  }> {
    // Sort by (sectionIndex, chunkIndex) so cap selection is deterministic.
    const sorted = [...persistedChunks].sort((a, b) =>
      a.sectionIndex !== b.sectionIndex
        ? a.sectionIndex - b.sectionIndex
        : a.chunkIndex - b.chunkIndex,
    )

    // audit-M3: per-doc embed budget cap.
    const eligible = sorted.slice(0, MAX_EMBEDS_PER_DOCUMENT)
    const overflow = sorted.length - eligible.length
    if (overflow > 0) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'ingest.embed_cap_exceeded',
          chunkCount: sorted.length,
          cap: MAX_EMBEDS_PER_DOCUMENT,
          knowledgeItemId,
          organizationId,
        }),
      )
    }

    // audit-M2: AbortController for the entire phase-2 worker.
    const controller = new AbortController()
    const phaseTimer = setTimeout(() => controller.abort(), INGEST_EMBED_PHASE_TIMEOUT_MS)

    let embeddedCount = 0
    let embedFailedCount = 0
    let embedQueueTimeoutCount = 0
    let voyageCallCount = 0

    // audit-M2: bounded concurrency semaphore.
    let inFlight = 0
    const queue: (() => void)[] = []
    const acquire = (): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        const tryAcquire = () => {
          if (controller.signal.aborted) {
            reject(new Error('embed_phase_timeout'))
            return
          }
          if (inFlight < MAX_CONCURRENT_CHUNK_EMBEDS) {
            inFlight++
            resolve()
            return
          }
          const queueTimer = setTimeout(() => {
            const idx = queue.indexOf(slot)
            if (idx >= 0) queue.splice(idx, 1)
            reject(new Error('embed_queue_timeout'))
          }, EMBED_QUEUE_TIMEOUT_MS)
          const slot = () => {
            clearTimeout(queueTimer)
            tryAcquire()
          }
          queue.push(slot)
        }
        tryAcquire()
      })
    const release = () => {
      inFlight--
      const next = queue.shift()
      if (next) next()
    }

    const tasks = eligible.map(async (chunk) => {
      try {
        await acquire()
      } catch (err) {
        const reason = (err as Error).message
        if (reason === 'embed_queue_timeout') {
          embedQueueTimeoutCount++
          this.logger.warn(
            JSON.stringify({
              level: 'warn',
              event: 'ingest.embed_queue_timeout',
              sectionIndex: chunk.sectionIndex,
              chunkIndex: chunk.chunkIndex,
              knowledgeItemId,
              organizationId,
            }),
          )
        }
        return
      }
      try {
        if (controller.signal.aborted) return
        voyageCallCount++
        const vec = await this.embedWithRetry(chunk.text, controller.signal)
        if (controller.signal.aborted) return
        if (!vec) {
          embedFailedCount++
          return
        }
        await prisma.$executeRawUnsafe(
          `UPDATE "knowledge_chunks" SET embedding = $1::vector WHERE id = $2`,
          `[${vec.join(',')}]`,
          chunk.id,
        )
        embeddedCount++
      } catch (err) {
        embedFailedCount++
        this.logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'ingest.embed_failed',
            sectionIndex: chunk.sectionIndex,
            chunkIndex: chunk.chunkIndex,
            sanitisedError: sanitiseEmbedError((err as Error).message),
            knowledgeItemId,
            organizationId,
          }),
        )
      } finally {
        release()
      }
    })

    await Promise.all(tasks)
    clearTimeout(phaseTimer)

    let embedPhaseTimeoutCount = 0
    if (controller.signal.aborted) {
      embedPhaseTimeoutCount =
        eligible.length - embeddedCount - embedFailedCount - embedQueueTimeoutCount
      if (embedPhaseTimeoutCount < 0) embedPhaseTimeoutCount = 0
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'ingest.embed_phase_timeout',
          embedPhaseTimeoutCount,
          embeddedCount,
          eligibleChunkCount: eligible.length,
          knowledgeItemId,
          organizationId,
        }),
      )
    }

    return {
      eligibleChunkCount: eligible.length,
      embeddedCount,
      embedFailedCount,
      embedCapExceededCount: overflow,
      embedQueueTimeoutCount,
      embedPhaseTimeoutCount,
      voyageCallCount,
    }
  }

  /**
   * audit-M3: Voyage embed with one retry on 5xx/429. Synthetic-fail hook
   * lives in EmbeddingsService.embedDocument (audit-M7) so all single-doc
   * Voyage calls share the same probe affordance.
   * Returns null on terminal failure (caller logs).
   */
  private async embedWithRetry(text: string, signal: AbortSignal): Promise<number[] | null> {
    let lastErr: unknown = null
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (signal.aborted) return null
      try {
        return await this.embeddings.embedDocument(text)
      } catch (err) {
        lastErr = err
        const code = extractStatusCode(err)
        const transient = code === 429 || (code !== null && code >= 500 && code < 600)
        if (attempt === 1 && transient) {
          await new Promise((r) => setTimeout(r, 1000))
          continue
        }
        throw err
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('embed_failed')
  }

  /**
   * Plan 05-01 Task 2 + Phase 6 — structured-data tee. Tables are extracted
   * upstream by Reducto (controller-side upload + docs.service.parse); this
   * method receives the already-parsed { columns, rows } and persists them
   * to tabular_rows + tabular_columns. Runs in a try/catch — failure logs
   * and returns; section/chunk data is unaffected (Phase 1 retrieval keeps
   * working). Hard cap at MAX_TABULAR_ROWS_PER_DOC: rows beyond the cap are
   * dropped, the warn log `tabular.row_cap_exceeded` is emitted, and
   * KnowledgeItem.metadata gains tabularRowCapExceeded:true.
   *
   * Multi-table-per-doc deferred — Reducto can return multiple Table blocks
   * (e.g. an XLSX with 3 sheets), but we currently persist only the first.
   * Trigger to revisit: D-05-01-A (first customer with multi-sheet upload).
   *
   * audit-M1 boundary: payloads carry counts + capExceeded flag only — never
   * row content, never column names.
   */
  private async persistTabular(knowledgeItemId: string, input: IngestInput): Promise<void> {
    const tables = input.parsedTables ?? null
    if (!tables || tables.length === 0) return
    const result = tables[0]
    if (result.columns.length === 0) return

    const startedAt = Date.now()
    const orgIdHash = hashOrgId(input.organizationId)
    try {
      const totalRows = result.rows.length
      const capExceeded = totalRows > MAX_TABULAR_ROWS_PER_DOC
      const persistedRows = capExceeded
        ? result.rows.slice(0, MAX_TABULAR_ROWS_PER_DOC)
        : result.rows

      const inferred = inferColumnTypes(persistedRows, result.columns)

      await prisma.$transaction(
        async (tx) => {
          // Idempotent re-ingest: drop prior rows + columns first.
          await tx.tabularRow.deleteMany({ where: { docId: knowledgeItemId } })
          await tx.tabularColumn.deleteMany({ where: { docId: knowledgeItemId } })

          if (inferred.length > 0) {
            await tx.tabularColumn.createMany({
              data: inferred.map((c) => ({
                id: randomUUID(),
                docId: knowledgeItemId,
                name: c.name,
                ordinal: c.ordinal,
                inferredType: c.inferredType,
              })),
            })
          }

          if (persistedRows.length > 0) {
            await tx.tabularRow.createMany({
              data: persistedRows.map((row, idx) => ({
                id: randomUUID(),
                docId: knowledgeItemId,
                rowIndex: idx,
                data: row as Prisma.InputJsonValue,
              })),
            })
          }
        },
        { timeout: 30_000 },
      )

      if (capExceeded) {
        // Surface the truncation so the agent can communicate it on aggregate
        // queries. We read-modify-write the metadata column to preserve any
        // pre-existing keys (Phase 4 classifier output, Plan 04-01 image flags).
        const ki = await prisma.knowledgeItem.findUnique({
          where: { id: knowledgeItemId },
          select: { metadata: true },
        })
        const existing = (ki?.metadata as Record<string, unknown> | null) ?? {}
        await prisma.knowledgeItem.update({
          where: { id: knowledgeItemId },
          data: {
            metadata: { ...existing, tabularRowCapExceeded: true } as Prisma.InputJsonValue,
          },
        })
        this.logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'tabular.row_cap_exceeded',
            knowledgeItemId,
            orgIdHash,
            totalRows,
            persistedRows: persistedRows.length,
            cap: MAX_TABULAR_ROWS_PER_DOC,
          }),
        )
      }

      this.logger.log(
        JSON.stringify({
          level: 'info',
          event: 'tabular.ingested',
          knowledgeItemId,
          orgIdHash,
          rowCount: persistedRows.length,
          columnCount: inferred.length,
          capExceeded,
          mime: input.mimeType ?? null,
          latencyMs: Date.now() - startedAt,
        }),
      )
    } catch (err) {
      // Fail-soft. Section/chunk path already committed; retrieval still works.
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'tabular.tee_failed',
          knowledgeItemId,
          orgIdHash,
          mime: input.mimeType ?? null,
          sanitisedError: sanitiseEmbedError((err as Error).message),
          latencyMs: Date.now() - startedAt,
        }),
      )
    }
  }
}

function extractStatusCode(err: unknown): number | null {
  if (typeof err !== 'object' || err === null) return null
  const e = err as Record<string, unknown>
  if (typeof e.status === 'number') return e.status
  if (typeof e.statusCode === 'number') return e.statusCode
  return null
}

function sanitiseEmbedError(msg: string): string {
  // Strip URLs / keys / long token-like strings; keep first 120 chars.
  return msg
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/[A-Za-z0-9_-]{32,}/g, '<token>')
    .slice(0, 120)
}
