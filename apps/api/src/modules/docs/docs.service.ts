import { Injectable, Logger } from '@nestjs/common'
import { Prisma, prisma } from '@gm-ai/database'
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
  type ProposedDocType,
  type Schedule,
} from '@gm-ai/types'
import { IngestService } from '../ingest/ingest.service'
import { ClassifierService } from './classifier.service'

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
  ) {}

  async list(orgId: string): Promise<DocListItem[]> {
    // Plan 02-01: direct organizationId scope. KnowledgeItem.organizationId
    // is NOT NULL; global docs (venueId null) still live inside exactly one
    // org. The former OR-with-null-venue clause leaked cross-org — removed.
    const rows = await prisma.knowledgeItem.findMany({
      where: { organizationId: orgId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        venueId: true,
        content: true,
        metadata: true,
        aiSummary: true,
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
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }
    })
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
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async create(
    input: CreateDocRequest & { sourceImageBytes?: Buffer | null; sourceImageMime?: string | null },
    orgId: string,
  ): Promise<CreateDocResponse> {
    // If a venueId was supplied, it MUST belong to the user's active org. Run BEFORE
    // the classifier call so a bogus venueId doesn't burn Claude cost.
    if (input.venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: input.venueId, organizationId: orgId },
        select: { id: true },
      })
      if (!venue) throw new DocNotFoundOrCrossOrgError()
    }

    // Plan 04-02 Task 2 — per-tenant classifier pass. Fail-soft to { kind: 'none' } on any
    // error (logged internally); upload still succeeds with the row landing unclassified.
    const classified = await this.classifier.classify({
      content: input.content,
      title: input.title,
      orgId,
    })
    const documentTypeId = classified.kind === 'matched' ? classified.typeId : null
    const pendingTypeProposal =
      classified.kind === 'proposal'
        ? (classified.proposal as unknown as Record<string, unknown>)
        : null

    const result = await this.ingestService.ingest({
      title: input.title,
      content: input.content,
      organizationId: orgId,
      venueId: input.venueId,
      sourceImageBytes: input.sourceImageBytes ?? null,
      sourceImageMime: input.sourceImageMime ?? null,
      documentTypeId,
      pendingTypeProposal,
    })

    const tags = Array.isArray(result.metadata.tags)
      ? result.metadata.tags.filter((t): t is string => typeof t === 'string')
      : []
    const docType =
      typeof result.metadata.docType === 'string' ? result.metadata.docType : null

    // Hydrate DocumentType row for the response (matched path only — proposal path
    // returns the proposal itself, not a confirmed DocumentType).
    let matchedType: DocumentTypeDto | null = null
    if (classified.kind === 'matched') {
      const row = await prisma.documentType.findUnique({
        where: { id: classified.typeId },
        select: { id: true, name: true, description: true, schema: true, kind: true },
      })
      matchedType = toDocumentTypeDto(row)
    }

    return {
      id: result.id,
      summary: result.aiSummary,
      tags,
      docType,
      failSoft: tags.length === 0 && result.aiSummary === null,
      documentType: matchedType,
      pendingTypeProposal: classified.kind === 'proposal' ? classified.proposal : null,
      // Plan 04-03 Task 1 — placeholder null; Task 2 populates via ChecklistExtractorService.
      checklist: null,
    }
  }

  // Plan 04-02 Task 3 — owner accepts a pending proposal → promote to DocumentType + link.
  async acceptProposedType(
    knowledgeItemId: string,
    orgId: string,
    userId: string | null,
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

    try {
      const created = await prisma.$transaction(async (tx) => {
        const newType = await tx.documentType.create({
          data: {
            organizationId: orgId,
            name: proposal.name,
            description: proposal.description,
            schema: (proposal.schema ?? {}) as object,
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

      // Log name only (not schema body — may carry content-derived field names).
      this.logger.log(
        JSON.stringify({
          level: 'log',
          event: 'docs.type_accepted',
          orgId,
          actingUserId: userId,
          knowledgeItemId,
          documentTypeId: created.id,
          name: created.name,
        }),
      )
      return toDocumentTypeDto(created) as DocumentTypeDto
    } catch (err) {
      // Prisma P2002 on @@unique([organizationId, name]).
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new TypeNameConflictError()
      }
      throw err
    }
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
    await prisma.knowledgeItem.delete({ where: { id } })
  }
}
