import { Injectable } from '@nestjs/common'
import { prisma } from '@gm-ai/database'
import type {
  CreateDocRequest,
  CreateDocResponse,
  DocDetail,
  DocListItem,
} from '@gm-ai/types'
import { IngestService } from '../ingest/ingest.service'

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

@Injectable()
export class DocsService {
  constructor(private readonly ingestService: IngestService) {}

  async list(orgId: string): Promise<DocListItem[]> {
    // Two clean clauses OR'd together. Global docs (venueId null) are shared
    // across all orgs until per-org ownership lands in a later phase.
    const rows = await prisma.knowledgeItem.findMany({
      where: {
        OR: [
          { venueId: null },
          { venueId: { not: null }, venue: { is: { organizationId: orgId } } },
        ],
      },
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
      return {
        id: r.id,
        title,
        contentPreview: contentPreview(r.content ?? ''),
        venueId: r.venueId,
        venueName: r.venue?.name ?? null,
        summary: r.aiSummary,
        tags,
        docType,
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
        venueId: true,
        content: true,
        metadata: true,
        aiSummary: true,
        createdAt: true,
        updatedAt: true,
        venue: { select: { id: true, name: true, organizationId: true } },
      },
    })
    if (!row) return null
    // Access check: global doc (venueId null) OR venue belongs to this org.
    const allowed = row.venueId === null || row.venue?.organizationId === orgId
    if (!allowed) return null
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
      metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async create(input: CreateDocRequest, orgId: string): Promise<CreateDocResponse> {
    // If a venueId was supplied, it MUST belong to the user's active org.
    if (input.venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: input.venueId, organizationId: orgId },
        select: { id: true },
      })
      if (!venue) throw new DocNotFoundOrCrossOrgError()
    }

    const result = await this.ingestService.ingest({
      title: input.title,
      content: input.content,
      venueId: input.venueId,
    })

    const tags = Array.isArray(result.metadata.tags)
      ? result.metadata.tags.filter((t): t is string => typeof t === 'string')
      : []
    const docType =
      typeof result.metadata.docType === 'string' ? result.metadata.docType : null

    return {
      id: result.id,
      summary: result.aiSummary,
      tags,
      docType,
      failSoft: tags.length === 0 && result.aiSummary === null,
    }
  }
}
