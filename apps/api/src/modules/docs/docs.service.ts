import { randomUUID } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { Prisma, prisma } from '../../database/prisma'
import {
  type Audience,
  AudienceSchema,
  type CategorySuggestionResponse,
  ChecklistDto,
  type ChecklistStep,
  ChecklistStepSchema,
  type CreateDocRequest,
  type CreateDocResponse,
  type DocDetail,
  type DocListItem,
  DocPurposeSchema,
  DocumentTypeDto,
  type DocumentTypeKind,
  DocumentTypeKindSchema,
  type ProcessingStatus,
  type ProposedDocType,
  ProposedDocTypeSchema,
  type Schedule,
  ScheduleSchema,
  type UpdateDocRequest,
} from '../../types'
import { IngestService } from '../ingest/ingest.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import type { ParsedDocument } from '../reducto/reducto.service'
import { ReductoService } from '../reducto/reducto.service'
import { RetrievalService } from '../retrieval/retrieval.service'
import { ChecklistExtractorService } from './checklist-extractor.service'
import { ClassifierService, VENUE_AUTO_ASSIGN_CONFIDENCE } from './classifier.service'

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
  return `${cleaned.slice(0, boundary).trimEnd()}…`
}

function titleFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  if (typeof m.title === 'string' && m.title.trim()) return m.title.trim()
  if (typeof m.docType === 'string' && m.docType.trim()) return m.docType.trim()
  return null
}

// Library-list helpers. Cursor is base64(JSON({v, id})). `v` is whatever the
// sort orders by (updatedAt iso for 'recent', createdAt iso for 'oldest',
// title for 'name'). Decode-then-validate so a tampered cursor is treated as
// the start of the page, not a 500.
type Cursor = { v: string; id: string }

function clampLimit(raw: number | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 20
  if (raw < 1) return 1
  if (raw > 50) return 50
  return Math.floor(raw)
}

function decodeCursor(raw: string | null): Cursor | null {
  if (!raw) return null
  try {
    const json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (
      json &&
      typeof json === 'object' &&
      typeof json.v === 'string' &&
      typeof json.id === 'string'
    ) {
      return { v: json.v, id: json.id }
    }
    return null
  } catch {
    return null
  }
}

function encodeCursor(
  row: { id: string; updatedAt: Date; createdAt: Date; metadata: unknown },
  sort: 'recent' | 'oldest' | 'name',
): string {
  let v: string
  if (sort === 'oldest') v = row.createdAt.toISOString()
  else if (sort === 'name') {
    const t = titleFromMetadata(row.metadata)
    v = (t ?? '').trim() || 'zzzz'
  } else v = row.updatedAt.toISOString()
  return Buffer.from(JSON.stringify({ v, id: row.id }), 'utf8').toString('base64url')
}

function buildFiltersSql(args: {
  q: string | null
  category: string | null
  venue: string | null
  status: 'ready' | 'processing' | 'attention' | 'all'
}) {
  const parts: Prisma.Sql[] = [Prisma.sql`TRUE`]
  if (args.q) {
    const like = `%${args.q}%`
    parts.push(Prisma.sql`(
      ki.metadata->>'title' ILIKE ${like}
      OR ki."aiSummary" ILIKE ${like}
      OR ki.content ILIKE ${like}
      OR v.name ILIKE ${like}
      OR dt.name ILIKE ${like}
    )`)
  }
  if (args.category) {
    if (args.category === 'unclassified') {
      parts.push(Prisma.sql`ki."documentTypeId" IS NULL`)
    } else {
      // Prisma maps String columns to TEXT (not UUID) — no cast needed.
      parts.push(Prisma.sql`ki."documentTypeId" = ${args.category}`)
    }
  }
  if (args.venue) {
    if (args.venue === 'global') {
      parts.push(Prisma.sql`ki."venueId" IS NULL`)
    } else {
      parts.push(Prisma.sql`ki."venueId" = ${args.venue}`)
    }
  }
  // pendingTypeProposal is JSONB and can hold either SQL NULL (no proposal)
  // or the literal JSON `null` (proposal explicitly cleared via Prisma.JsonNull
  // — see acceptProposedType / rejectProposedType / classifyManually). Plain
  // `IS NOT NULL` returns true for the JSON-null case, which would falsely
  // mark cleared rows as "has a proposal". jsonb_typeof discriminates.
  const hasProposal = Prisma.sql`(ki."pendingTypeProposal" IS NOT NULL AND jsonb_typeof(ki."pendingTypeProposal") <> 'null')`
  const noProposal = Prisma.sql`(ki."pendingTypeProposal" IS NULL OR jsonb_typeof(ki."pendingTypeProposal") = 'null')`
  if (args.status === 'ready') {
    parts.push(
      Prisma.sql`ki."processingStatus" = 'ready' AND ki."documentTypeId" IS NOT NULL AND ${noProposal}`,
    )
  } else if (args.status === 'processing') {
    parts.push(Prisma.sql`ki."processingStatus" = 'processing'`)
  } else if (args.status === 'attention') {
    parts.push(
      Prisma.sql`(ki."processingStatus" = 'failed' OR (ki."processingStatus" = 'ready' AND (ki."documentTypeId" IS NULL OR ${hasProposal})))`,
    )
  }
  return Prisma.join(parts, ' AND ')
}

function toListItem(r: {
  id: string
  venueId: string | null
  content: string
  metadata: unknown
  aiSummary: string | null
  processingStatus: string
  processingError: string | null
  createdAt: Date
  updatedAt: Date
  pendingTypeProposal: unknown
  venue_id: string | null
  venue_name: string | null
  dt_id: string | null
  dt_name: string | null
  dt_description: string | null
  dt_schema: unknown
  dt_kind: string | null
}): DocListItem {
  const metadata = (r.metadata ?? {}) as Record<string, unknown>
  const tags = Array.isArray(metadata.tags)
    ? (metadata.tags as unknown[]).filter((t): t is string => typeof t === 'string')
    : []
  const docType = typeof metadata.docType === 'string' ? metadata.docType : null
  const title = titleFromMetadata(metadata)
  const documentType = toDocumentTypeDto(
    r.dt_id
      ? {
          id: r.dt_id,
          name: r.dt_name ?? '',
          description: r.dt_description,
          schema: r.dt_schema,
          kind: r.dt_kind ?? 'reference',
        }
      : null,
  )
  return {
    id: r.id,
    title,
    contentPreview: contentPreview(r.content ?? ''),
    venueId: r.venueId,
    venueName: r.venue_name,
    summary: r.aiSummary,
    tags,
    docType,
    documentType,
    pendingTypeProposal: toPendingProposal(r.pendingTypeProposal),
    isProcedural: documentType?.kind === 'procedural',
    processingStatus: coerceProcessingStatus(r.processingStatus),
    processingError: r.processingError,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
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
export class CategorySuggestionUnavailableError extends Error {
  constructor() {
    super('category-suggestion-unavailable')
    this.name = 'CategorySuggestionUnavailableError'
  }
}

export class PromoteNoDataQueryInvalidError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PromoteNoDataQueryInvalidError'
  }
}

// Plan 04-02 Task 2 — helper: hydrate DocumentType + pendingTypeProposal onto API responses.
// Plan 04-03 Task 1 — `kind` threaded through. DocumentTypeKindSchema.safeParse on read guards
// against stored bad values (shouldn't happen — DB column is TEXT NOT NULL DEFAULT 'reference').
function toDocumentTypeDto(
  dt: {
    id: string
    name: string
    description: string | null
    schema: unknown
    kind: string
  } | null,
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
    private readonly retrieval: RetrievalService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // Wraps a status update so callers don't have to remember to also push the
  // realtime event. Returns the row id so callers can chain. Errors on the
  // emit side are swallowed — realtime is best-effort.
  private async setProcessingStatus(
    knowledgeItemId: string,
    orgId: string,
    data: { processingStatus: 'processing' | 'ready' | 'failed'; processingError?: string | null },
  ): Promise<void> {
    await prisma.knowledgeItem
      .update({
        where: { id: knowledgeItemId },
        data: {
          processingStatus: data.processingStatus,
          processingError: data.processingError ?? null,
        },
      })
      .catch(() => undefined)
    try {
      this.realtime.emitDocUpdated(orgId, {
        id: knowledgeItemId,
        status: data.processingStatus,
      })
    } catch {
      // realtime is best-effort
    }
  }

  // Paginated library listing. Server-side filters + ILIKE search across
  // title (metadata->>'title'), summary, content preview, venue name, and
  // confirmed type name. Cursor pagination keeps shallow scrolls cheap.
  // Status partition matches the inbox-vs-library mental model:
  //   'ready'      → indexable, has a confirmed type, no pending proposal
  //   'processing' → enrichment in flight
  //   'attention'  → failed, unclassified, or pending proposal review
  async list(
    orgId: string,
    params: {
      q?: string
      category?: string
      venue?: string
      status?: 'ready' | 'processing' | 'attention' | 'all'
      sort?: 'recent' | 'oldest' | 'name'
      cursor?: string | null
      limit?: number
    } = {},
  ): Promise<{ items: DocListItem[]; nextCursor: string | null; total: number }> {
    const limit = clampLimit(params.limit)
    const sort = params.sort ?? 'recent'
    const status = params.status ?? 'all'
    const q = params.q?.trim() ? params.q.trim() : null
    const category = params.category && params.category !== 'all' ? params.category : null
    const venue = params.venue && params.venue !== 'all' ? params.venue : null
    const cursor = decodeCursor(params.cursor ?? null)

    type Row = {
      id: string
      venueId: string | null
      content: string
      metadata: unknown
      aiSummary: string | null
      processingStatus: string
      processingError: string | null
      createdAt: Date
      updatedAt: Date
      pendingTypeProposal: unknown
      venue_id: string | null
      venue_name: string | null
      dt_id: string | null
      dt_name: string | null
      dt_description: string | null
      dt_schema: unknown
      dt_kind: string | null
    }
    type CountRow = { total: bigint }

    const orderBySql = (() => {
      if (sort === 'oldest') return Prisma.sql`ki."createdAt" ASC, ki.id ASC`
      if (sort === 'name')
        return Prisma.sql`COALESCE(NULLIF(TRIM(ki.metadata->>'title'), ''), 'zzzz') ASC, ki.id ASC`
      return Prisma.sql`ki."updatedAt" DESC, ki.id DESC`
    })()

    // Cursor predicate. Each sort emits a `(sortKey, id)` tuple cursor; the
    // predicate uses a row-comparison so it sorts identically to ORDER BY.
    const cursorSql = (() => {
      if (!cursor) return Prisma.sql`TRUE`
      if (sort === 'oldest') {
        const ts = new Date(cursor.v)
        return Prisma.sql`(ki."createdAt", ki.id) > (${ts}, ${cursor.id})`
      }
      if (sort === 'name') {
        return Prisma.sql`(COALESCE(NULLIF(TRIM(ki.metadata->>'title'), ''), 'zzzz'), ki.id) > (${cursor.v}, ${cursor.id})`
      }
      const ts = new Date(cursor.v)
      return Prisma.sql`(ki."updatedAt", ki.id) < (${ts}, ${cursor.id})`
    })()

    const filtersSql = buildFiltersSql({ q, category, venue, status })

    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        ki.id, ki."venueId", ki.content, ki.metadata, ki."aiSummary",
        ki."processingStatus", ki."processingError", ki."createdAt", ki."updatedAt",
        ki."pendingTypeProposal",
        v.id AS venue_id, v.name AS venue_name,
        dt.id AS dt_id, dt.name AS dt_name, dt.description AS dt_description,
        dt.schema AS dt_schema, dt.kind AS dt_kind
      FROM "knowledge_items" ki
      LEFT JOIN "Venue" v ON v.id = ki."venueId"
      LEFT JOIN "document_types" dt ON dt.id = ki."documentTypeId"
      WHERE ki."organizationId" = ${orgId}
        AND ki."answerStatus" = 'answered'
        AND ${filtersSql}
        AND ${cursorSql}
      ORDER BY ${orderBySql}
      LIMIT ${limit + 1}
    `)

    // Total is computed without the cursor — gives the user the unscoped
    // result-set size for "n of N shown" UI. Capped result set means this
    // is cheap; if it gets expensive later we can swap to an estimate.
    const totalRow = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM "knowledge_items" ki
      LEFT JOIN "Venue" v ON v.id = ki."venueId"
      LEFT JOIN "document_types" dt ON dt.id = ki."documentTypeId"
      WHERE ki."organizationId" = ${orgId}
        AND ki."answerStatus" = 'answered'
        AND ${filtersSql}
    `)
    const total = Number(totalRow[0]?.total ?? 0)

    const hasMore = rows.length > limit
    const sliced = hasMore ? rows.slice(0, limit) : rows
    const items = sliced.map((r) => toListItem(r))
    const last = sliced[sliced.length - 1]
    const nextCursor = hasMore && last ? encodeCursor(last, sort) : null

    return { items, nextCursor, total }
  }

  // Inbox surface. Returns failed + pending-proposal + unclassified rows in
  // one shot — these need an action from the GM, so the list is small by
  // design. Capped at 200 to bound cost; if a real org hits that, the inbox
  // is in an emergency state and a count-only headline is more useful anyway.
  async inbox(orgId: string): Promise<DocListItem[]> {
    // Raw SQL because Prisma's { not: Prisma.JsonNull } is satisfied by both
    // SQL NULL and a real JSON value — it can't express "is a real JSON
    // object, not the JSON-null literal, not SQL NULL". jsonb_typeof <> 'null'
    // expresses that exactly.
    const rows = await prisma.$queryRaw<
      Array<{
        id: string
        venueId: string | null
        content: string
        metadata: unknown
        aiSummary: string | null
        processingStatus: string
        processingError: string | null
        createdAt: Date
        updatedAt: Date
        pendingTypeProposal: unknown
        venue_id: string | null
        venue_name: string | null
        dt_id: string | null
        dt_name: string | null
        dt_description: string | null
        dt_schema: unknown
        dt_kind: string | null
      }>
    >(Prisma.sql`
      SELECT
        ki.id, ki."venueId", ki.content, ki.metadata, ki."aiSummary",
        ki."processingStatus", ki."processingError", ki."createdAt", ki."updatedAt",
        ki."pendingTypeProposal",
        v.id AS venue_id, v.name AS venue_name,
        dt.id AS dt_id, dt.name AS dt_name, dt.description AS dt_description,
        dt.schema AS dt_schema, dt.kind AS dt_kind
      FROM "knowledge_items" ki
      LEFT JOIN "Venue" v ON v.id = ki."venueId"
      LEFT JOIN "document_types" dt ON dt.id = ki."documentTypeId"
      WHERE ki."organizationId" = ${orgId}
        AND ki."answerStatus" = 'answered'
        AND (
          ki."processingStatus" = 'failed'
          OR (
            ki."processingStatus" = 'ready'
            AND (
              ki."documentTypeId" IS NULL
              OR (
                ki."pendingTypeProposal" IS NOT NULL
                AND jsonb_typeof(ki."pendingTypeProposal") <> 'null'
              )
            )
          )
        )
      ORDER BY ki."updatedAt" DESC, ki.id DESC
      LIMIT 200
    `)

    return rows.map((r) => toListItem(r))
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
        ? (meta.askedByUserIds as unknown[]).filter((v): v is string => typeof v === 'string')
        : []
      for (const id of ids) allAskerIds.add(id)
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
      const lastAskedAt = typeof meta.lastAskedAt === 'string' ? meta.lastAskedAt : null
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
  /// dedupe; returns count desc, then most-recent-first. Anything in
  /// dismissed_no_data_queries for the org is filtered out (the owner either
  /// promoted it to a gap or marked it noise).
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
        LOWER(sa.query) AS query,
        COUNT(*) AS ask_count,
        MAX(sa."createdAt") AS last_asked
      FROM "search_analytics" sa
      LEFT JOIN "dismissed_no_data_queries" d
        ON d."organizationId" = sa."organizationId"
        AND d."queryLower" = LOWER(sa.query)
      WHERE sa."organizationId" = ${orgId}
        AND sa.outcome = 'no-data'
        AND sa."createdAt" > NOW() - (${days} || ' days')::interval
        AND d.id IS NULL
      GROUP BY LOWER(sa.query)
      ORDER BY ask_count DESC, last_asked DESC
      LIMIT ${limit}
    `
    return rows.map((r) => ({
      query: r.query,
      askCount: Number(r.ask_count),
      lastAskedAt: r.last_asked.toISOString(),
    }))
  }

  /// Promote a no-data analytics query into a pending KB gap so it joins the
  /// formal "questions waiting on you" queue. Also dismisses the query so it
  /// drops out of the no-data panel on next refetch.
  ///
  /// Not wrapped in a $transaction by design: recordGap uses its own raw-SQL
  /// path and embedding writes that don't participate in an interactive tx.
  /// Both writes are idempotent — recordGap dedupes by embedding similarity
  /// (≥0.85) and dismissed_no_data_queries upserts by (orgId, queryLower) —
  /// so a partial failure followed by retry converges to the correct state.
  async promoteNoDataQuery(
    orgId: string,
    rawQuery: string,
    userId: string,
  ): Promise<{ gapId: string; askCount: number; dedupedFromExisting: boolean }> {
    const queryLower = rawQuery.trim().toLowerCase()
    if (queryLower.length < 5) {
      throw new PromoteNoDataQueryInvalidError('query too short')
    }
    const gap = await this.ingestService.recordGap({
      question: rawQuery.trim(),
      tentativeAnswer: null,
      organizationId: orgId,
      venueId: null,
      askedByUserId: userId,
      sourceMessageId: null,
    })
    await prisma.dismissedNoDataQuery.upsert({
      where: {
        organizationId_queryLower: { organizationId: orgId, queryLower },
      },
      update: {
        promotedGapId: gap.id,
        dismissedByUserId: userId,
      },
      create: {
        organizationId: orgId,
        queryLower,
        dismissedByUserId: userId,
        promotedGapId: gap.id,
      },
    })
    this.realtime.emitGapUpdated(orgId, { id: gap.id, status: 'created' })
    this.logger.log(
      JSON.stringify({
        event: 'docs.no_data_query.promoted',
        orgId,
        userId,
        gapId: gap.id,
        dedupedFromExisting: gap.dedupedFromExisting,
      }),
    )
    return {
      gapId: gap.id,
      askCount: gap.askCount,
      dedupedFromExisting: gap.dedupedFromExisting,
    }
  }

  /// Dismiss a no-data analytics query as noise — hides it from the panel
  /// without creating a gap. Upsert keeps the call idempotent.
  async dismissNoDataQuery(orgId: string, rawQuery: string, userId: string): Promise<void> {
    const queryLower = rawQuery.trim().toLowerCase()
    if (queryLower.length === 0) {
      throw new Error('dismissNoDataQuery: query required')
    }
    await prisma.dismissedNoDataQuery.upsert({
      where: {
        organizationId_queryLower: { organizationId: orgId, queryLower },
      },
      update: { dismissedByUserId: userId },
      create: {
        organizationId: orgId,
        queryLower,
        dismissedByUserId: userId,
      },
    })
    this.logger.log(
      JSON.stringify({
        event: 'docs.no_data_query.dismissed',
        orgId,
        userId,
      }),
    )
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
    const docPurpose = DocPurposeSchema.safeParse(metadata.docPurpose)
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
      docPurpose: docPurpose.success ? docPurpose.data : null,
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
        sourceImageBytes: input.sourceImageBytes ? new Uint8Array(input.sourceImageBytes) : null,
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
      // Re-ingest path. When set, the classifier is bypassed and the existing
      // (user-confirmed) DocumentType is preserved on the row. The user picked
      // this category — re-classifying would clobber their decision.
      preserveDocumentTypeId?: string | null
      preservePendingTypeProposal?: Record<string, unknown> | null
      // When true AND no venueId is set, the classifier is asked to propose a
      // venue from the org's list. High-confidence proposals are auto-applied.
      autoDetectVenue?: boolean
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
        parsed = await this.reducto.parse(input.reductoFileId)
        composedContent = composeContent(input.description, parsed.text)
      }

      // Re-ingest path: caller passed the existing user-confirmed type. Skip the
      // classifier entirely so we don't overwrite the user's decision.
      let documentTypeId: string | null
      let pendingTypeProposal: Record<string, unknown> | null
      let matchedTypeKind: 'reference' | 'procedural' | null = null
      if (input.preserveDocumentTypeId) {
        documentTypeId = input.preserveDocumentTypeId
        pendingTypeProposal = null
        const t = await prisma.documentType.findUnique({
          where: { id: input.preserveDocumentTypeId },
          select: { kind: true },
        })
        matchedTypeKind = (t?.kind as 'reference' | 'procedural' | undefined) ?? null
        this.logger.log(
          JSON.stringify({
            level: 'log',
            event: 'docs.enrich_skipped_classifier',
            knowledgeItemId: id,
            orgId,
            preservedDocumentTypeId: input.preserveDocumentTypeId,
          }),
        )
      } else {
        // Venue auto-detect: only ask the classifier when the uploader opted
        // in (autoDetectVenue=true) AND didn't pre-pick a venue. The flag lets
        // a user explicitly choose "Global" without the AI second-guessing.
        const askVenue = !!input.autoDetectVenue && !input.venueId
        const venues = askVenue
          ? await prisma.venue.findMany({
              where: { organizationId: orgId },
              select: { id: true, name: true },
              take: 50,
            })
          : null

        const tableHeaders = (parsed?.tables ?? []).slice(0, 3).map((t) => t.columns)
        const classified = await this.classifier.classify({
          content: composedContent,
          title: input.title,
          orgId,
          venues,
          structuralHints: parsed
            ? {
                pageCount: parsed.pageCount,
                tableCount: parsed.tables.length,
                tableHeaders,
              }
            : null,
        })
        this.logger.log(
          JSON.stringify({
            level: 'log',
            event: 'docs.enrich_classified',
            knowledgeItemId: id,
            orgId,
            kind: classified.kind,
            venueGuessConfidence: classified.venueGuess?.confidence ?? null,
            venueGuessApplied:
              !!classified.venueGuess &&
              classified.venueGuess.confidence >= VENUE_AUTO_ASSIGN_CONFIDENCE,
          }),
        )

        // Apply the venue guess only if the uploader didn't pre-pick one and
        // the confidence clears the auto-assign bar. Persist on the row so
        // ingest below + retrieval scoping pick it up via input.venueId.
        if (
          askVenue &&
          classified.venueGuess &&
          classified.venueGuess.confidence >= VENUE_AUTO_ASSIGN_CONFIDENCE
        ) {
          input.venueId = classified.venueGuess.venueId
        }

        documentTypeId = classified.kind === 'matched' ? classified.typeId : null
        pendingTypeProposal =
          classified.kind === 'proposal'
            ? (classified.proposal as unknown as Record<string, unknown>)
            : (input.preservePendingTypeProposal ?? null)
        if (classified.kind === 'matched') {
          const t = await prisma.documentType.findUnique({
            where: { id: classified.typeId },
            select: { kind: true },
          })
          matchedTypeKind = (t?.kind as 'reference' | 'procedural' | undefined) ?? null
        }
      }

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

      if (matchedTypeKind === 'procedural' && documentTypeId) {
        await this.checklistExtractor.extract({
          knowledgeItemId: id,
          orgId,
          title: input.title ?? '(untitled)',
          content: composedContent,
          userId,
          kindSource: input.preserveDocumentTypeId ? 'accept-type' : 'matched',
        })
      }

      await this.setProcessingStatus(id, orgId, {
        processingStatus: 'ready',
        processingError: null,
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
      await this.setProcessingStatus(id, orgId, {
        processingStatus: 'failed',
        processingError: message.slice(0, 500),
      })
    }
  }

  // Fire-and-forget checklist extraction. Called whenever a doc gets resolved
  // to a procedural type (accept-type or classify). Flips processingStatus to
  // 'processing' synchronously so the frontend's existing 3s poll picks it up
  // and shows the row as in-flight, runs the AI extraction in the background,
  // then flips status back to 'ready' (or 'failed' on error). Caller does not
  // await — keeps the HTTP response sub-second.
  private kickChecklistExtractionInBackground(args: {
    knowledgeItemId: string
    orgId: string
    userId: string | null
    title: string
    content: string
  }): void {
    const { knowledgeItemId, orgId, userId, title, content } = args

    void this.setProcessingStatus(knowledgeItemId, orgId, {
      processingStatus: 'processing',
      processingError: null,
    })

    setImmediate(async () => {
      try {
        await this.checklistExtractor.extract({
          knowledgeItemId,
          orgId,
          title,
          content,
          userId,
          kindSource: 'accept-type',
        })
        await this.setProcessingStatus(knowledgeItemId, orgId, {
          processingStatus: 'ready',
          processingError: null,
        })
      } catch (err) {
        const message = (err as Error)?.message ?? 'checklist-extract-failed'
        this.logger.error(
          JSON.stringify({
            level: 'error',
            event: 'docs.checklist_extract_background_failed',
            knowledgeItemId,
            orgId,
            message,
          }),
        )
        await this.setProcessingStatus(knowledgeItemId, orgId, {
          processingStatus: 'failed',
          processingError: message.slice(0, 500),
        })
      }
    })
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

      // Post-accept extraction runs in the background for procedural types so
      // the modal can close immediately. The frontend polls while the row sits
      // in 'processing' and refreshes when it flips back to 'ready'.
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
          this.kickChecklistExtractionInBackground({
            knowledgeItemId,
            orgId,
            userId,
            title,
            content: ki.content,
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
      select: {
        id: true,
        organizationId: true,
        documentTypeId: true,
        content: true,
        metadata: true,
      },
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
      // types when a user re-enters the same name. Case-insensitive so
      // "staff note" routes to existing "Staff Note".
      const existing = await prisma.documentType.findFirst({
        where: {
          organizationId: orgId,
          name: { equals: input.name, mode: 'insensitive' },
        },
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

    // Background checklist extraction for procedural types — modal closes
    // immediately, row sits in 'processing' until the AI work completes.
    if (typeRow.kind === 'procedural') {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>
      const title =
        typeof metadata.title === 'string' && metadata.title.trim()
          ? metadata.title.trim()
          : '(untitled)'
      this.kickChecklistExtractionInBackground({
        knowledgeItemId,
        orgId,
        userId,
        title,
        content: row.content,
      })
    }

    return toDocumentTypeDto(typeRow) as DocumentTypeDto
  }

  // Edit-and-re-ingest. Persists title/venue/description changes synchronously,
  // flips status to 'processing', then fires enrichInBackground. The user's
  // confirmed DocumentType (if any) is preserved across re-ingest — re-classifying
  // would clobber a decision they explicitly made.
  async updateDoc(
    id: string,
    orgId: string,
    userId: string | null,
    input: UpdateDocRequest,
  ): Promise<void> {
    const row = await prisma.knowledgeItem.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        content: true,
        metadata: true,
        venueId: true,
        documentTypeId: true,
        pendingTypeProposal: true,
      },
    })
    if (!row || row.organizationId !== orgId) {
      if (row && row.organizationId !== orgId) {
        this.logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'docs.cross_org_denied',
            op: 'update',
            targetRowId: id,
            actingOrgId: orgId,
          }),
        )
      }
      throw new DocNotFoundOrCrossOrgError()
    }

    if (input.venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: input.venueId, organizationId: orgId },
        select: { id: true },
      })
      if (!venue) throw new DocNotFoundOrCrossOrgError()
    }

    // Description is stored prepended to content (`Context from uploader: …\n\n---\n\n<body>`).
    // To re-ingest with a new description we strip any existing prefix from the
    // body and re-compose. If the user didn't touch description, content is
    // left as-is.
    const PREFIX_RE = /^Context from uploader: [\s\S]*?\n\n---\n\n/
    const bodyContent = row.content.replace(PREFIX_RE, '')
    let nextContent = row.content
    if (input.description !== undefined) {
      const trimmed = input.description.trim()
      nextContent =
        trimmed.length > 0
          ? `Context from uploader: ${trimmed}\n\n---\n\n${bodyContent}`
          : bodyContent
    }

    const existingMeta = (row.metadata ?? {}) as Record<string, unknown>
    const existingTitle = typeof existingMeta.title === 'string' ? existingMeta.title : null
    const nextTitle = input.title ?? existingTitle
    const nextVenueId = input.venueId !== undefined ? input.venueId : row.venueId

    // docPurpose: undefined → leave existing untouched; null → clear; value → set
    // (and clear any other doc holding the same purpose in the same scope so the
    // "one org-chart per venue" invariant holds without a DB constraint).
    const nextMeta: Record<string, unknown> = { ...existingMeta, title: nextTitle }
    if (input.docPurpose === null) {
      delete nextMeta.docPurpose
    } else if (input.docPurpose !== undefined) {
      nextMeta.docPurpose = input.docPurpose
    }

    await prisma.$transaction(async (tx) => {
      if (input.docPurpose !== undefined && input.docPurpose !== null) {
        // Enforce "one doc per purpose per (orgId, venueId) scope" by stripping the
        // key from any other doc currently holding it. Raw SQL because Prisma JSON
        // mutation lacks a portable "delete key" op; `jsonb - 'key'` is Postgres-native.
        // Treat null and non-null venueId symmetrically (IS NOT DISTINCT FROM).
        await tx.$executeRaw`
          UPDATE knowledge_items
          SET metadata = metadata - 'docPurpose'
          WHERE organization_id = ${orgId}
            AND (venue_id IS NOT DISTINCT FROM ${nextVenueId})
            AND id <> ${id}::uuid
            AND metadata->>'docPurpose' = ${input.docPurpose}
        `
      }
      await tx.knowledgeItem.update({
        where: { id },
        data: {
          venueId: nextVenueId,
          content: nextContent,
          metadata: nextMeta as object,
          processingStatus: 'processing',
          processingError: null,
        },
      })
    })

    this.logger.log(
      JSON.stringify({
        level: 'log',
        event: 'docs.updated',
        orgId,
        actingUserId: userId,
        knowledgeItemId: id,
        titleChanged: input.title !== undefined,
        venueChanged: input.venueId !== undefined,
        descriptionChanged: input.description !== undefined,
        docPurposeChanged: input.docPurpose !== undefined,
        preservedDocumentTypeId: row.documentTypeId,
      }),
    )

    const enrichInput = {
      title: nextTitle ?? '',
      content: nextContent,
      venueId: nextVenueId ?? null,
      description:
        input.description !== undefined && input.description.trim().length > 0
          ? input.description.trim()
          : undefined,
      preserveDocumentTypeId: row.documentTypeId,
      preservePendingTypeProposal: (row.pendingTypeProposal ?? null) as Record<
        string,
        unknown
      > | null,
    }

    setImmediate(() => {
      void this.enrichInBackground(id, enrichInput, orgId, userId)
    })
  }

  // Powers the "suggest a name" button in the classify modal's Create-new tab.
  // Re-runs the classifier against the doc's content + the org's existing types.
  // - matched   → returns the matched type's name/kind/desc with existing:true so the
  //               UI can hint "you already have this"; reuse-on-conflict in
  //               classifyManually still dedupes if the user proceeds anyway.
  // - proposal  → returns the proposal's name/kind/desc with existing:false.
  // - none      → throws CategorySuggestionUnavailableError (422 to the caller).
  async suggestCategory(
    knowledgeItemId: string,
    orgId: string,
  ): Promise<CategorySuggestionResponse> {
    const row = await prisma.knowledgeItem.findUnique({
      where: { id: knowledgeItemId },
      select: {
        id: true,
        organizationId: true,
        content: true,
        metadata: true,
      },
    })
    if (!row || row.organizationId !== orgId) {
      if (row && row.organizationId !== orgId) {
        this.logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'docs.cross_org_denied',
            op: 'suggest-category',
            targetRowId: knowledgeItemId,
            actingOrgId: orgId,
          }),
        )
      }
      throw new DocNotFoundOrCrossOrgError()
    }

    const metadata = (row.metadata ?? {}) as Record<string, unknown>
    const title =
      typeof metadata.title === 'string' && metadata.title.trim() ? metadata.title.trim() : null

    const result = await this.classifier.classify({
      content: row.content,
      title,
      orgId,
    })

    if (result.kind === 'matched') {
      const existing = await prisma.documentType.findUnique({
        where: { id: result.typeId },
        select: { name: true, description: true, kind: true },
      })
      if (!existing) throw new CategorySuggestionUnavailableError()
      const parsedKind = DocumentTypeKindSchema.safeParse(existing.kind)
      return {
        name: existing.name,
        kind: parsedKind.success ? parsedKind.data : 'reference',
        description: existing.description,
        existing: true,
      }
    }
    if (result.kind === 'proposal') {
      // The classifier didn't link to an existing type, but the proposed name
      // might collide (case-insensitively) with one the org already has. Surface
      // that so the UI can show "you already have a category called X" — and
      // align the returned name's casing with what's stored in DB.
      const collision = await prisma.documentType.findFirst({
        where: {
          organizationId: orgId,
          name: { equals: result.proposal.name, mode: 'insensitive' },
        },
        select: { name: true, description: true, kind: true },
      })
      if (collision) {
        const parsedKind = DocumentTypeKindSchema.safeParse(collision.kind)
        return {
          name: collision.name,
          kind: parsedKind.success ? parsedKind.data : 'reference',
          description: collision.description,
          existing: true,
        }
      }
      return {
        name: result.proposal.name,
        kind: result.proposal.kind ?? 'reference',
        description: result.proposal.description,
        existing: false,
      }
    }
    throw new CategorySuggestionUnavailableError()
  }

  // Lists the org's confirmed DocumentTypes so the classify-manually UI can offer
  // "use an existing type" instead of forcing a new-name-every-time flow.
  async listTypes(orgId: string): Promise<DocumentTypeDto[]> {
    const rows = await prisma.documentType.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, description: true, schema: true, kind: true },
      orderBy: { name: 'asc' },
    })
    return rows.map((r) => toDocumentTypeDto(r)).filter((d): d is DocumentTypeDto => d !== null)
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

  // KB-match search for the gap card "Search KB" button. Runs the gap's
  // question through hybrid retrieval, scoped to the gap's venue. Returns the
  // top hits with snippets so the GM can decide if the answer already exists
  // in the KB (in which case they'd just delete the gap).
  async findKbMatchesForGap(
    gapId: string,
    orgId: string,
  ): Promise<
    Array<{
      docId: string
      title: string | null
      snippet: string
      similarity: number
    }>
  > {
    const gap = await prisma.knowledgeItem.findUnique({
      where: { id: gapId },
      select: {
        id: true,
        organizationId: true,
        answerStatus: true,
        content: true,
        venueId: true,
      },
    })
    if (!gap || gap.organizationId !== orgId || gap.answerStatus !== 'pending') {
      throw new DocNotFoundOrCrossOrgError()
    }
    const result = await this.retrieval.find(gap.content, {
      orgId,
      venueId: gap.venueId ?? undefined,
      // Over-fetch so multi-section hits for the same doc don't collapse the
      // final list under 3 entries after entityId dedup.
      limit: 6,
      minSimilarity: 0.6,
      entityTypes: ['knowledge_item'],
      // Multi-venue groups often share answers (e.g. "where do we keep X?");
      // a thin venue still benefits from a sibling venue's docs.
      crossVenue: true,
    })
    if (!result.ok) return []
    const seen = new Set<string>()
    const deduped: Array<{
      docId: string
      title: string | null
      snippet: string
      similarity: number
    }> = []
    for (const hit of result.data) {
      if (seen.has(hit.entityId)) continue
      seen.add(hit.entityId)
      deduped.push({
        docId: hit.entityId,
        title: hit.title,
        snippet: contentPreview(hit.content ?? '', 240),
        similarity: hit.similarity,
      })
      if (deduped.length >= 3) break
    }
    return deduped
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
