import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma, prisma } from '../../database/prisma'
import {
  AudienceSchema,
  ChecklistStepSchema,
  DocumentTypeKindSchema,
  ProposedDocTypeSchema,
  ScheduleSchema,
  type Audience,
  type ChecklistDto,
  type ChecklistStep,
  type CreateDocRequest,
  type CreateDocResponse,
  type DocDetail,
  type DocListItem,
  type DocumentTypeDto,
  type DocumentTypeKind,
  type ProcessingStatus,
  type ProposedDocType,
  type Schedule,
} from '@gm-ai/types'
import { IngestService } from '../ingest/ingest.service'
import { ReductoService, type ParsedDocument } from '../reducto/reducto.service'
import { ChecklistExtractorService } from './checklist-extractor.service'
import { ClassifierService } from './classifier.service'

function composeContent(description: string | undefined, body: string): string {
  const desc = description?.trim()
  if (desc && desc.length > 0 && body.length > 0) return `${desc}\n\n${body}`
  return desc ?? body
}

function coerceProcessingStatus(raw: string): ProcessingStatus {
  if (raw === 'processing' || raw === 'ready' || raw === 'failed') return raw
  return 'ready'
}

function contentPreview(raw: string, len = 160): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= len) return cleaned
  const cut = cleaned.lastIndexOf(' ', len - 1)
  const boundary = cut > 0 ? cut : len - 1
  return cleaned.slice(0, boundary).trimEnd() + '…'
}

function titleFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  if (typeof m.title === 'string' && m.title.trim()) return m.title.trim()
  if (typeof m.docType === 'string' && m.docType.trim()) return m.docType.trim()
  return null
}

export class DocNotFoundOrCrossOrgError extends Error {
  constructor() {
    super('venue-not-found')
    this.name = 'DocNotFoundOrCrossOrgError'
  }
}

// Plan 04-02 Task 3 — accept/reject endpoint error classes.
export class TypeProposalMissingError extends Error {
  constructor() {
    super('type-proposal-missing')
    this.name = 'TypeProposalMissingError'
  }
}
export class TypeNameConflictError extends Error {
  constructor() {
    super('type-name-conflict')
    this.name = 'TypeNameConflictError'
  }
}

// Plan 04-02 Task 2 — helper: hydrate DocumentType + pendingTypeProposal onto API responses.
// Plan 04-03 Task 1 — `kind` threaded through. DocumentTypeKindSchema.safeParse on read guards
// against stored bad values (shouldn't happen — DB column is TEXT NOT NULL DEFAULT 'reference').
function toDocumentTypeDto(
  dt: { id: string; name: string; description: string | null; schema: unknown; kind: string } | null,
): DocumentTypeDto | null {
  if (!dt) return null
  const parsedKind = DocumentTypeKindSchema.safeParse(dt.kind)
  return {
    id: dt.id,
    name: dt.name,
    description: dt.description,
    schema: (dt.schema ?? {}) as Record<string, unknown>,
    kind: parsedKind.success ? parsedKind.data : 'reference',
  }
}

function toPendingProposal(raw: unknown): ProposedDocType | null {
  if (!raw || typeof raw !== 'object') return null
  const parsed = ProposedDocTypeSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

// Plan 04-03 Task 1 — defence-in-depth hydration of the persisted Checklist JSON columns.
// Pattern mirrors toPendingProposal: safeParse; malformed rows degrade to null rather than
// surfacing as 500s. `steps` is extracted to ChecklistStep[] array (default [] on drift).
function toChecklistDto(
  raw: {
    id: string
    knowledgeItemId: string
    title: string
    steps: unknown
    schedule: unknown
    audience: unknown
    extractedAt: Date
  } | null,
): ChecklistDto | null {
  if (!raw) return null
  const stepsArr = Array.isArray(raw.steps) ? raw.steps : []
  const steps: ChecklistStep[] = stepsArr
    .map((s) => ChecklistStepSchema.safeParse(s))
    .filter((r): r is { success: true; data: ChecklistStep } => r.success)
    .map((r) => r.data)
  const schedule: Schedule = (() => {
    const parsed = ScheduleSchema.safeParse(raw.schedule ?? {})
    return parsed.success ? parsed.data : ScheduleSchema.parse({})
  })()
  const audience: Audience = (() => {
    const parsed = AudienceSchema.safeParse(raw.audience ?? {})
    return parsed.success ? parsed.data : AudienceSchema.parse({})
  })()
  return {
    id: raw.id,
    knowledgeItemId: raw.knowledgeItemId,
    title: raw.title,
    steps,
    schedule,
    audience,
    extractedAt: raw.extractedAt.toISOString(),
  }
}

@Injectable()
export class DocsService {
  private readonly logger = new Logger(DocsService.name)

  constructor(
    private readonly ingestService: IngestService,
    private readonly classifier: ClassifierService,
    private readonly checklistExtractor: ChecklistExtractorService,
    private readonly reducto: ReductoService,
  ) {}

  async list(orgId: string): Promise<DocListItem[]> {
    // Plan 02-01: direct organizationId scope. KnowledgeItem.organizationId
    // is NOT NULL; global docs (venueId null) still live inside exactly one
    // org. The former OR-with-null-venue clause leaked cross-org — removed.
    // Phase C: pending knowledge gaps live in their own /docs/gaps surface;
    // they're hidden from the main list so the GM doesn't see questions
    // mixed with answered docs.
    const rows = await prisma.knowledgeItem.findMany({
      where: { organizationId: orgId, answerStatus: 'answered' },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        venueId: true,
        content: true,
        metadata: true,
        aiSummary: true,
        processingStatus: true,
        processingError: true,
        createdAt: true,
        updatedAt: true,
        venue: { select: { id: true, name: true } },
        // Plan 04-02 Task 2 — include confirmed DocumentType + pending proposal.
        // Plan 04-03 Task 1 — + kind for procedural-badge rendering.
        documentType: {
          select: { id: true, name: true, description: true, schema: true, kind: true },
        },
        pendingTypeProposal: true,
      },
      take: 200,
    })

    return rows.map((r) => {
      const metadata = (r.metadata ?? {}) as Record<string, unknown>
      const tags = Array.isArray(metadata.tags)
        ? (metadata.tags as unknown[]).filter((t): t is string => typeof t === 'string')
        : []
      const docType = typeof metadata.docType === 'string' ? metadata.docType : null
      const title = titleFromMetadata(metadata)
      const documentType = toDocumentTypeDto(r.documentType)
      return {
        id: r.id,
        title,
        contentPreview: contentPreview(r.content ?? ''),
        venueId: r.venueId,
        venueName: r.venue?.name ?? null,
        summary: r.aiSummary,
        tags,
        docType,
        documentType,
        pendingTypeProposal: toPendingProposal(r.pendingTypeProposal),
        // Plan 04-03 Task 1 — explicit convenience flag for UI procedural-badge rendering.
        isProcedural: documentType?.kind === 'procedural',
        processingStatus: coerceProcessingStatus(r.processingStatus),
        processingError: r.processingError,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }
    })
  }

  /// Phase C — list pending knowledge gaps (questions captured by record_kb_gap
  /// awaiting GM authoritative answers).
  async listGaps(orgId: string): Promise<
    Array<{
      id: string
      question: string
      tentativeAnswer: string | null
      askCount: number
      askedByUserIds: string[]
      askedBy: Array<{ id: string; name: string | null; email: string | null }>
      venueId: string | null
      venueName: string | null
      createdAt: string
      updatedAt: string
      lastAskedAt: string | null
    }>
  > {
    const rows = await prisma.knowledgeItem.findMany({
      where: { organizationId: orgId, answerStatus: 'pending' },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        venueId: true,
        content: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        venue: { select: { id: true, name: true } },
      },
      take: 200,
    })

    const allAskerIds = new Set<string>()
    const perRowAskerIds: string[][] = rows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>
      const ids = Array.isArray(meta.askedByUserIds)
        ? (meta.askedByUserIds as unknown[]).filter(
            (v): v is string => typeof v === 'string',
          )
        : []
      ids.forEach((id) => allAskerIds.add(id))
      return ids
    })

    const askers = allAskerIds.size
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(allAskerIds) } },
          select: { id: true, name: true, email: true },
        })
      : []
    const askerById = new Map(askers.map((u) => [u.id, u]))

    return rows.map((r, i) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>
      const askCount = typeof meta.askCount === 'number' ? meta.askCount : 1
      const askedByUserIds = perRowAskerIds[i] ?? []
      const askedBy = askedByUserIds.map((id) => {
        const u = askerById.get(id)
        return {
          id,
          name: u?.name ?? null,
          email: u?.email ?? null,
        }
      })
      const tentativeAnswer =
        typeof meta.tentativeAnswer === 'string' && meta.tentativeAnswer.length > 0
          ? meta.tentativeAnswer
          : null
      const lastAskedAt =
        typeof meta.lastAskedAt === 'string' ? meta.lastAskedAt : null
      return {
        id: r.id,
        question: r.content,
        tentativeAnswer,
        askCount,
        askedByUserIds,
        askedBy,
        venueId: r.venueId,
        venueName: r.venue?.name ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        lastAskedAt,
      }
    })
  }

  /// Phase C — GM answers a pending gap. Composes Q+A content, flips status
  /// to 'answered', kicks off enrichment so the row gets re-classified into
  /// a proper DocumentType + re-embedded + retrieval-eligible.
  async answerGap(
    id: string,
    orgId: string,
    answer: string,
    userId: string | null,
  ): Promise<CreateDocResponse> {
    const gap = await prisma.knowledgeItem.findFirst({
      where: { id, organizationId: orgId, answerStatus: 'pending' },
      select: { id: true, content: true, venueId: true, metadata: true },
    })
    if (!gap) throw new DocNotFoundOrCrossOrgError()

    const question = gap.content
    const composedContent = `Q: ${question}\n\nA: ${answer.trim()}`
    const composedTitle = question.slice(0, 200)
    const existingMeta = (gap.metadata ?? {}) as Record<string, unknown>
    const newMeta = {
      ...existingMeta,
      gapAnsweredByUserId: userId,
      gapAnsweredAt: new Date().toISOString(),
      // Keep the agent's tentativeAnswer for audit even after the GM's
      // authoritative answer lands.
      gapOriginalQuestion: question,
    }

    await prisma.knowledgeItem.update({
      where: { id },
      data: {
        content: composedContent,
        answerStatus: 'answered',
        processingStatus: 'processing',
        metadata: newMeta as object,
      },
    })

    const enrichInput = {
      id,
      title: composedTitle,
      content: composedContent,
      venueId: gap.venueId,
    }
    setImmediate(() => {
      void this.enrichInBackground(id, enrichInput, orgId, userId)
    })

    this.logger.log(
      JSON.stringify({
        event: 'kb_gap.answered',
        gapId: id,
        orgId,
        venueId: gap.venueId,
        answeredByUserId: userId,
        answerLength: answer.length,
      }),
    )

    // Mirror createStub's response so the UI can react immediately.
    return {
      id,
      summary: null,
      tags: [],
      docType: null,
      failSoft: false,
      documentType: null,
      pendingTypeProposal: null,
      checklist: null,
      processingStatus: 'processing',
    }
  }

  /// Phase H (Task #22) — top no-data queries from the last N days. Groups
  /// by lower-cased query so "where do empty kegs go" + "Where do empty kegs go"
  /// dedupe; returns count desc, then most-recent-first.
  async listNoDataQueries(
    orgId: string,
    days = 30,
    limit = 20,
  ): Promise<
    Array<{
      query: string
      askCount: number
      lastAskedAt: string
    }>
  > {
    type Row = { query: string; ask_count: bigint; last_asked: Date }
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        LOWER(query) AS query,
        COUNT(*) AS ask_count,
        MAX("createdAt") AS last_asked
      FROM "search_analytics"
      WHERE "organizationId" = ${orgId}
        AND outcome = 'no-data'
        AND "createdAt" > NOW() - (${days} || ' days')::interval
      GROUP BY LOWER(query)
      ORDER BY ask_count DESC, last_asked DESC
      LIMIT ${limit}
    `
    return rows.map((r) => ({
      query: r.query,
      askCount: Number(r.ask_count),
      lastAskedAt: r.last_asked.toISOString(),
    }))
  }

  async getById(id: string, orgId: string): Promise<DocDetail | null> {
    const row = await prisma.knowledgeItem.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        venueId: true,
        content: true,
        metadata: true,
        aiSummary: true,
        processingStatus: true,
        processingError: true,
        createdAt: true,
        updatedAt: true,
        venue: { select: { id: true, name: true } },
        documentType: {
          select: { id: true, name: true, description: true, schema: true, kind: true },
        },
        pendingTypeProposal: true,
        // Plan 04-03 Task 1 — include 1-1 Checklist for procedural docs.
        checklist: {
          select: {
            id: true,
            knowledgeItemId: true,
            title: true,
            steps: true,
            schedule: true,
            audience: true,
            extractedAt: true,
          },
        },
      },
    })
    if (!row) return null
    // Cross-org access: row exists but belongs to a different org.
    // SOC-2 CC6.6: emit audit-defensible access-denied event. Response
    // body stays 404 (enumeration-safe) — the log is the audit surface.
    if (row.organizationId !== orgId) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'docs.cross_org_denied',
          targetRowId: id,
          actingOrgId: orgId,
        }),
      )
      return null
    }
    const metadata = (row.metadata ?? {}) as Record<string, unknown>
    const tags = Array.isArray(metadata.tags)
      ? (metadata.tags as unknown[]).filter((t): t is string => typeof t === 'string')
      : []
    const docType = typeof metadata.docType === 'string' ? metadata.docType : null
    return {
      id: row.id,
      title: titleFromMetadata(metadata),
      content: row.content ?? '',
      venueId: row.venueId,
      venueName: row.venue?.name ?? null,
      summary: row.aiSummary,
      tags,
      docType,
      documentType: toDocumentTypeDto(row.documentType),
      pendingTypeProposal: toPendingProposal(row.pendingTypeProposal),
      checklist: toChecklistDto(row.checklist),
      metadata,
      processingStatus: coerceProcessingStatus(row.processingStatus),
      processingError: row.processingError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  // Sync phase — inserts a minimal KnowledgeItem with status 'processing' so the
  // upload modal can close immediately and the doc shows up in the list. The
  // caller is responsible for kicking off enrichInBackground() right after.
  async createStub(
    input: CreateDocRequest & {
      sourceImageBytes?: Buffer | null
      sourceImageMime?: string | null
    },
    orgId: string,
  ): Promise<CreateDocResponse> {
    if (input.venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: input.venueId, organizationId: orgId },
        select: { id: true },
      })
      if (!venue) throw new DocNotFoundOrCrossOrgError()
    }

    const id = randomUUID()
    await prisma.knowledgeItem.create({
      data: {
        id,
        organizationId: orgId,
        venueId: input.venueId ?? null,
        content: input.content,
        metadata: { title: input.title ?? null, tags: [] } as object,
        aiSummary: null,
        // Bytes handled by IngestService on enrichment. For images we stash the
        // source on the stub so enrichment doesn't need the buffer re-passed.
        sourceImageBytes: input.sourceImageBytes
          ? new Uint8Array(input.sourceImageBytes)
          : null,
        sourceImageMime: input.sourceImageMime ?? null,
        processingStatus: 'processing',
      },
    })
    return {
      id,
      summary: null,
      tags: [],
      docType: null,
      failSoft: false,
      documentType: null,
      pendingTypeProposal: null,
      checklist: null,
      processingStatus: 'processing',
    }
  }

  // Async phase — classifier + ingest (embeddings, AI summary, tags) + checklist
  // extraction for procedural-matched types. Updates the stub row in place.
  // Called fire-and-forget from the controller; failures flip status to 'failed'
  // with the error string so the UI can surface + offer a retry path later.
  async enrichInBackground(
    id: string,
    input: CreateDocRequest & {
      sourceImageBytes?: Buffer | null
      sourceImageMime?: string | null
      // Phase 6 — file_id from controller-side Reducto upload. enrichInBackground
      // calls parse() against this id to get text + structured tables. Null for
      // image uploads (Claude vision path) and text-only /docs creates.
      reductoFileId?: string | null
      description?: string
      mimeType?: string | null
    },
    orgId: string,
    userId: string | null = null,
  ): Promise<void> {
    const startedAt = Date.now()
    this.logger.log(
      JSON.stringify({
        level: 'log',
        event: 'docs.enrich_started',
        knowledgeItemId: id,
        orgId,
        titleLen: (input.title ?? '').length,
        contentLen: input.content.length,
      }),
    )
    try {
      // Phase 6 — Reducto parse runs in background. Replaces input.content
      // (which at this point is just the user description) with composed
      // description + parsed body text. Tables are passed straight through to
      // IngestService for structured-row persistence.
      let parsed: ParsedDocument | null = null
      let composedContent = input.content
      if (input.reductoFileId) {
        try {
          parsed = await this.reducto.parse(input.reductoFileId)
          composedContent = composeContent(input.description, parsed.text)
        } catch (err) {
          // Reducto parse failures are surfaced as enrichment failures — same
          // posture as classifier/ingest failures below: row stays in DB with
          // status='failed', error string visible in the UI for retry.
          throw err
        }
      }

      const classified = await this.classifier.classify({
        content: composedContent,
        title: input.title,
        orgId,
      })
      this.logger.log(
        JSON.stringify({
          level: 'log',
          event: 'docs.enrich_classified',
          knowledgeItemId: id,
          orgId,
          kind: classified.kind,
        }),
      )
      const documentTypeId = classified.kind === 'matched' ? classified.typeId : null
      const pendingTypeProposal =
        classified.kind === 'proposal'
          ? (classified.proposal as unknown as Record<string, unknown>)
          : null

      await this.ingestService.ingest({
        id,
        title: input.title,
        content: composedContent,
        organizationId: orgId,
        venueId: input.venueId,
        sourceImageBytes: input.sourceImageBytes ?? null,
        sourceImageMime: input.sourceImageMime ?? null,
        documentTypeId,
        pendingTypeProposal,
        mimeType: input.mimeType ?? null,
        // Phase 6 — pre-extracted tables straight from Reducto, no buffer
        // re-parse in IngestService. First table only (multi-table-per-doc
        // deferred — same posture as XLSX sheet 1 only, D-05-01-A).
        parsedTables: parsed?.tables ?? null,
      })

      if (classified.kind === 'matched') {
        const type = await prisma.documentType.findUnique({
          where: { id: classified.typeId },
          select: { kind: true },
        })
        if (type?.kind === 'procedural') {
          await this.checklistExtractor.extract({
            knowledgeItemId: id,
            orgId,
            title: input.title ?? '(untitled)',
            content: composedContent,
            userId,
            kindSource: 'matched',
          })
        }
      }

      await prisma.knowledgeItem.update({
        where: { id },
        data: { processingStatus: 'ready', processingError: null },
      })
      this.logger.log(
        JSON.stringify({
          level: 'log',
          event: 'docs.enrich_complete',
          knowledgeItemId: id,
          orgId,
          latencyMs: Date.now() - startedAt,
        }),
      )
    } catch (err) {
      const message = (err as Error)?.message ?? 'unknown enrichment error'
      this.logger.error(
        JSON.stringify({
          level: 'error',
          event: 'docs.enrich_failed',
          knowledgeItemId: id,
          orgId,
          latencyMs: Date.now() - startedAt,
          message,
        }),
      )
      await prisma.knowledgeItem
        .update({
          where: { id },
          data: { processingStatus: 'failed', processingError: message.slice(0, 500) },
        })
        .catch(() => undefined)
    }
  }

  // Plan 04-02 Task 3 — owner accepts a pending proposal → promote to DocumentType + link.
  // Plan 04-03 Task 3 — accepts optional kindOverride. Owner can flip classifier's proposed
  // kind ('procedural' ↔ 'reference') at acceptance time. Post-promotion: if resolved kind is
  // procedural, fire the ChecklistExtractorService against the just-promoted KI.
  async acceptProposedType(
    knowledgeItemId: string,
    orgId: string,
    userId: string | null,
    kindOverride?: DocumentTypeKind,
    nameOverride?: string,
  ): Promise<DocumentTypeDto> {
    const row = await prisma.knowledgeItem.findUnique({
      where: { id: knowledgeItemId },
      select: { id: true, organizationId: true, pendingTypeProposal: true },
    })
    if (!row || row.organizationId !== orgId) {
      if (row && row.organizationId !== orgId) {
        this.logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'docs.cross_org_denied',
            op: 'accept-type',
            targetRowId: knowledgeItemId,
            actingOrgId: orgId,
          }),
        )
      }
      throw new DocNotFoundOrCrossOrgError()
    }

    const proposal = toPendingProposal(row.pendingTypeProposal)
    if (!proposal) throw new TypeProposalMissingError()

    // Plan 04-03 audit-S5 — track kind resolution for the accountability log.
    const proposalKind: DocumentTypeKind = proposal.kind ?? 'reference'
    const resolvedKind: DocumentTypeKind = kindOverride ?? proposalKind
    const kindOverridden = kindOverride !== undefined && kindOverride !== proposalKind

    const resolvedName =
      nameOverride && nameOverride.trim().length > 0
        ? nameOverride.trim().slice(0, 80)
        : proposal.name
    const nameOverridden = resolvedName !== proposal.name

    try {
      const created = await prisma.$transaction(async (tx) => {
        const newType = await tx.documentType.create({
          data: {
            organizationId: orgId,
            name: resolvedName,
            description: proposal.description,
            schema: (proposal.schema ?? {}) as object,
            kind: resolvedKind,
            confirmedByUserId: userId,
          },
          select: { id: true, name: true, description: true, schema: true, kind: true },
        })
        await tx.knowledgeItem.update({
          where: { id: knowledgeItemId },
          data: { documentTypeId: newType.id, pendingTypeProposal: Prisma.JsonNull },
        })
        return newType
      })

      // Log name + kind metadata (audit-S5). Never the schema body — may carry content-derived keys.
      this.logger.log(
        JSON.stringify({
          level: 'log',
          event: 'docs.type_accepted',
          orgId,
          actingUserId: userId,
          knowledgeItemId,
          documentTypeId: created.id,
          name: created.name,
          kind: resolvedKind,
          kindOverridden,
          nameOverridden,
        }),
      )

      // Plan 04-03 Task 3 — post-accept extraction fires fire-and-forget for procedural types.
      // Extractor is fail-soft (any failure returns null + operator log); no extra try/catch.
      if (resolvedKind === 'procedural') {
        const ki = await prisma.knowledgeItem.findUnique({
          where: { id: knowledgeItemId },
          select: { content: true, metadata: true },
        })
        if (ki) {
          const metadata = (ki.metadata ?? {}) as Record<string, unknown>
          const title =
            typeof metadata.title === 'string' && metadata.title.trim()
              ? metadata.title.trim()
              : '(untitled)'
          await this.checklistExtractor.extract({
            knowledgeItemId,
            orgId,
            title,
            content: ki.content,
            userId,
            kindSource: 'accept-type',
          })
        }
      }

      return toDocumentTypeDto(created) as DocumentTypeDto
    } catch (err) {
      // Prisma P2002 on @@unique([organizationId, name]).
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new TypeNameConflictError()
      }
      throw err
    }
  }

  // Manual classification for rows the classifier returned 'none' on. Two branches:
  //   - typeId: link to an existing DocumentType (org-scoped).
  //   - name + kind: create a new DocumentType and link. Falls back to reuse if a
  //     type with that exact name already exists (keeps the user from creating
  //     duplicates by typo).
  async classifyManually(
    knowledgeItemId: string,
    orgId: string,
    userId: string | null,
    input: { typeId: string } | { name: string; kind: DocumentTypeKind },
  ): Promise<DocumentTypeDto> {
    const row = await prisma.knowledgeItem.findUnique({
      where: { id: knowledgeItemId },
      select: { id: true, organizationId: true, documentTypeId: true, content: true, metadata: true },
    })
    if (!row || row.organizationId !== orgId) {
      if (row && row.organizationId !== orgId) {
        this.logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'docs.cross_org_denied',
            op: 'classify-manual',
            targetRowId: knowledgeItemId,
            actingOrgId: orgId,
          }),
        )
      }
      throw new DocNotFoundOrCrossOrgError()
    }

    let typeRow: {
      id: string
      name: string
      description: string | null
      schema: unknown
      kind: string
    } | null = null

    if ('typeId' in input) {
      typeRow = await prisma.documentType.findFirst({
        where: { id: input.typeId, organizationId: orgId },
        select: { id: true, name: true, description: true, schema: true, kind: true },
      })
      if (!typeRow) throw new DocNotFoundOrCrossOrgError()
    } else {
      // Reuse-on-conflict so repeated manual classifies don't generate duplicate
      // types when a user re-enters the same name.
      const existing = await prisma.documentType.findFirst({
        where: { organizationId: orgId, name: input.name },
        select: { id: true, name: true, description: true, schema: true, kind: true },
      })
      if (existing) {
        typeRow = existing
      } else {
        typeRow = await prisma.documentType.create({
          data: {
            organizationId: orgId,
            name: input.name,
            description: null,
            schema: {} as object,
            kind: input.kind,
            confirmedByUserId: userId,
          },
          select: { id: true, name: true, description: true, schema: true, kind: true },
        })
      }
    }

    await prisma.knowledgeItem.update({
      where: { id: knowledgeItemId },
      data: { documentTypeId: typeRow.id, pendingTypeProposal: Prisma.JsonNull },
    })

    this.logger.log(
      JSON.stringify({
        level: 'log',
        event: 'docs.classified_manually',
        orgId,
        actingUserId: userId,
        knowledgeItemId,
        documentTypeId: typeRow.id,
        name: typeRow.name,
        created: !('typeId' in input),
      }),
    )

    // Fire checklist extractor if the resolved type is procedural. Fail-soft.
    if (typeRow.kind === 'procedural') {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>
      const title =
        typeof metadata.title === 'string' && metadata.title.trim()
          ? metadata.title.trim()
          : '(untitled)'
      await this.checklistExtractor.extract({
        knowledgeItemId,
        orgId,
        title,
        content: row.content,
        userId,
        kindSource: 'accept-type',
      })
    }

    return toDocumentTypeDto(typeRow) as DocumentTypeDto
  }

  // Lists the org's confirmed DocumentTypes so the classify-manually UI can offer
  // "use an existing type" instead of forcing a new-name-every-time flow.
  async listTypes(orgId: string): Promise<DocumentTypeDto[]> {
    const rows = await prisma.documentType.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, description: true, schema: true, kind: true },
      orderBy: { name: 'asc' },
    })
    return rows
      .map((r) => toDocumentTypeDto(r))
      .filter((d): d is DocumentTypeDto => d !== null)
  }

  // Plan 04-02 Task 3 — owner rejects a pending proposal → clear proposal, leave unclassified.
  async rejectProposedType(
    knowledgeItemId: string,
    orgId: string,
    userId: string | null,
  ): Promise<void> {
    const row = await prisma.knowledgeItem.findUnique({
      where: { id: knowledgeItemId },
      select: { id: true, organizationId: true, pendingTypeProposal: true },
    })
    if (!row || row.organizationId !== orgId) {
      if (row && row.organizationId !== orgId) {
        this.logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'docs.cross_org_denied',
            op: 'reject-type',
            targetRowId: knowledgeItemId,
            actingOrgId: orgId,
          }),
        )
      }
      throw new DocNotFoundOrCrossOrgError()
    }
    if (!row.pendingTypeProposal) throw new TypeProposalMissingError()

    await prisma.knowledgeItem.update({
      where: { id: knowledgeItemId },
      data: { pendingTypeProposal: Prisma.JsonNull },
    })
    this.logger.log(
      JSON.stringify({
        level: 'log',
        event: 'docs.type_rejected',
        orgId,
        actingUserId: userId,
        knowledgeItemId,
      }),
    )
  }

  async remove(id: string, orgId: string): Promise<void> {
    const row = await prisma.knowledgeItem.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    })
    if (!row) {
      throw new DocNotFoundOrCrossOrgError()
    }
    if (row.organizationId !== orgId) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'docs.cross_org_denied',
          op: 'delete',
          targetRowId: id,
          actingOrgId: orgId,
        }),
      )
      throw new DocNotFoundOrCrossOrgError()
    }
    await prisma.$transaction([
      prisma.searchableEntity.deleteMany({
        where: { entityType: 'knowledge_item', entityId: id },
      }),
      prisma.knowledgeItem.delete({ where: { id } }),
    ])
  }

  // Delete a pending knowledge gap. Hardened: only removes rows where
  // answerStatus='pending' so this endpoint can never nuke an answered KB doc
  // even if a stale id is replayed from the gaps UI after another manager
  // promoted it.
  async removeGap(id: string, orgId: string): Promise<void> {
    const row = await prisma.knowledgeItem.findUnique({
      where: { id },
      select: { id: true, organizationId: true, answerStatus: true },
    })
    if (!row || row.answerStatus !== 'pending') {
      throw new DocNotFoundOrCrossOrgError()
    }
    if (row.organizationId !== orgId) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'docs.cross_org_denied',
          op: 'delete_gap',
          targetRowId: id,
          actingOrgId: orgId,
        }),
      )
      throw new DocNotFoundOrCrossOrgError()
    }
    await prisma.$transaction([
      prisma.searchableEntity.deleteMany({
        where: { entityType: 'knowledge_item', entityId: id },
      }),
      prisma.knowledgeItem.delete({ where: { id } }),
    ])
    this.logger.log(
      JSON.stringify({
        level: 'log',
        event: 'docs.gap_deleted',
        orgId,
        knowledgeItemId: id,
      }),
    )
  }
}
