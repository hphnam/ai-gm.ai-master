import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '@gm-ai/database'
import { TOOL_INPUT_SCHEMAS, type ToolName, fail, type ToolResult } from '@gm-ai/types'
import { IngestService } from '../ingest/ingest.service'
import { RetrievalService } from '../retrieval/retrieval.service'
import { MockOpsService } from '../mock-ops/mock-ops.service'
import { QuoteVerifierService } from './quote-verifier.service'

export type DispatchContext = {
  orgId: string
  userId: string
  userRole: string
}

@Injectable()
export class ToolDispatcher {
  private readonly logger = new Logger(ToolDispatcher.name)

  constructor(
    private readonly retrieval: RetrievalService,
    private readonly mockOps: MockOpsService,
    private readonly ingest: IngestService,
    private readonly verifier: QuoteVerifierService,
  ) {}

  async dispatch(
    toolName: string,
    input: unknown,
    ctx?: DispatchContext,
  ): Promise<ToolResult<unknown>> {
    if (!(toolName in TOOL_INPUT_SCHEMAS)) {
      return fail('not-supported', `tool: ${toolName}`)
    }
    const schema = TOOL_INPUT_SCHEMAS[toolName as ToolName]
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return fail(
        'error',
        `invalid input for ${toolName}: ${parsed.error.issues[0]?.message ?? 'zod error'}`,
      )
    }
    try {
      switch (toolName as ToolName) {
        case 'find_knowledge': {
          if (!ctx) {
            return fail('error', 'find_knowledge requires an authenticated context')
          }
          const i = parsed.data as {
            query: string
            venueId?: string
            limit?: number
            minSimilarity?: number
            entityTypes?: Array<
              | 'knowledge_item'
              | 'checklist_step'
              | 'venue_contact'
              | 'mock_supplier'
              | 'venue_profile'
              | 'chat_message'
            >
            tags?: string[]
            recencyDays?: number
            kinds?: string[]
            includePending?: boolean
            crossVenue?: boolean
          }
          return await this.retrieval.find(i.query, {
            orgId: ctx.orgId,
            venueId: i.venueId,
            limit: i.limit,
            minSimilarity: i.minSimilarity,
            entityTypes: i.entityTypes,
            tags: i.tags,
            recencyDays: i.recencyDays,
            kinds: i.kinds,
            includePending: i.includePending,
            crossVenue: i.crossVenue,
          })
        }
        case 'get_stock_below_par':
          return await this.mockOps.getStockBelowPar(
            (parsed.data as { venueId: string }).venueId,
          )
        case 'get_stock_by_name': {
          const i = parsed.data as { venueId: string; name: string }
          return await this.mockOps.getStockByName(i.venueId, i.name)
        }
        case 'get_supplier_by_name':
          return await this.mockOps.getSupplierByName(
            (parsed.data as { name: string }).name,
          )
        case 'get_upcoming_cutoffs': {
          const i = parsed.data as { venueId: string; withinHours?: number }
          return await this.mockOps.getUpcomingCutoffs(i.venueId, i.withinHours)
        }
        case 'log_incident': {
          if (!ctx) {
            return fail('error', 'log_incident requires an authenticated context')
          }
          const i = parsed.data as {
            venueId: string
            summary: string
            severity: 'minor' | 'major' | 'critical'
            details?: Record<string, unknown>
          }
          const venue = await prisma.venue.findFirst({
            where: { id: i.venueId, organizationId: ctx.orgId },
            select: { id: true },
          })
          if (!venue) return fail('error', 'venue not found in your organisation')
          const incident = await prisma.incidentLog.create({
            data: {
              organizationId: ctx.orgId,
              venueId: i.venueId,
              loggedByUserId: ctx.userId,
              severity: i.severity,
              summary: i.summary,
              details: (i.details ?? {}) as object,
              status: 'open',
            },
            select: { id: true, severity: true, createdAt: true },
          })
          this.logger.warn(
            JSON.stringify({
              event: 'chat.log_incident',
              incidentId: incident.id,
              orgId: ctx.orgId,
              venueId: i.venueId,
              userId: ctx.userId,
              severity: incident.severity,
              summaryLength: i.summary.length,
            }),
          )
          return {
            ok: true,
            data: {
              id: incident.id,
              severity: incident.severity,
              createdAt: incident.createdAt.toISOString(),
            },
          }
        }
        case 'update_stock': {
          if (!ctx) {
            return fail('error', 'update_stock requires an authenticated context')
          }
          const i = parsed.data as {
            venueId: string
            name: string
            setQty?: number
            deltaQty?: number
            note?: string
          }
          if (i.setQty === undefined && i.deltaQty === undefined) {
            return fail('error', 'either setQty or deltaQty is required')
          }
          const venue = await prisma.venue.findFirst({
            where: { id: i.venueId, organizationId: ctx.orgId },
            select: { id: true },
          })
          if (!venue) return fail('error', 'venue not found in your organisation')
          const matches = await prisma.mockStock.findMany({
            where: {
              venueId: i.venueId,
              name: { contains: i.name, mode: 'insensitive' },
            },
            select: { id: true, name: true, currentQty: true, parLevel: true, unit: true },
            take: 2,
          })
          if (matches.length === 0) {
            return fail('no-data', `no stock item at this venue matching "${i.name}"`)
          }
          if (matches.length > 1) {
            return fail(
              'no-data',
              `ambiguous match for "${i.name}" — be more specific (e.g. add brand)`,
            )
          }
          const target = matches[0]
          const current = Number(target.currentQty)
          const par = Number(target.parLevel)
          const newQty =
            i.setQty !== undefined ? i.setQty : Math.max(0, current + (i.deltaQty ?? 0))
          await prisma.mockStock.update({
            where: { id: target.id },
            data: { currentQty: newQty },
          })
          this.logger.log(
            JSON.stringify({
              event: 'chat.update_stock',
              orgId: ctx.orgId,
              venueId: i.venueId,
              userId: ctx.userId,
              stockId: target.id,
              previous: current,
              next: newQty,
              delta: newQty - current,
              note: i.note ?? null,
            }),
          )
          return {
            ok: true,
            data: {
              id: target.id,
              name: target.name,
              previousQty: current,
              newQty,
              parLevel: par,
              unit: target.unit,
              belowPar: newQty < par,
            },
          }
        }
        case 'add_supplier_note': {
          if (!ctx) {
            return fail('error', 'add_supplier_note requires an authenticated context')
          }
          if (ctx.userRole !== 'owner' && ctx.userRole !== 'manager') {
            return fail('error', 'only managers or owners can add supplier notes')
          }
          const i = parsed.data as { supplierName: string; note: string }
          const matches = await prisma.mockSupplier.findMany({
            where: { name: { contains: i.supplierName, mode: 'insensitive' } },
            select: { id: true, name: true, notes: true },
            take: 2,
          })
          if (matches.length === 0) return fail('no-data', `no supplier matching "${i.supplierName}"`)
          if (matches.length > 1) {
            return fail(
              'no-data',
              `ambiguous match for "${i.supplierName}" — be more specific`,
            )
          }
          const target = matches[0]
          const stamp = new Date().toISOString().slice(0, 10)
          const appended = `[${stamp}] ${i.note.trim()}`
          const newNotes = target.notes
            ? `${target.notes}\n${appended}`
            : appended
          await prisma.mockSupplier.update({
            where: { id: target.id },
            data: { notes: newNotes },
          })
          this.logger.log(
            JSON.stringify({
              event: 'chat.add_supplier_note',
              orgId: ctx.orgId,
              userId: ctx.userId,
              supplierId: target.id,
              noteLength: i.note.length,
            }),
          )
          return {
            ok: true,
            data: { id: target.id, name: target.name, notes: newNotes },
          }
        }
        case 'verify_quote': {
          if (!ctx) {
            return fail('error', 'verify_quote requires an authenticated context')
          }
          const i = parsed.data as { draft: string; sourceIds: string[] }
          const result = await this.verifier.verify(i.draft, i.sourceIds, ctx.orgId)
          return { ok: true, data: result }
        }
        case 'record_kb_gap': {
          if (!ctx) {
            return fail('error', 'record_kb_gap requires an authenticated context')
          }
          const i = parsed.data as {
            question: string
            tentativeAnswer?: string
            venueId: string | null
          }
          if (i.venueId) {
            const venue = await prisma.venue.findFirst({
              where: { id: i.venueId, organizationId: ctx.orgId },
              select: { id: true },
            })
            if (!venue) {
              return fail('error', 'venue not found in your organisation')
            }
          }
          const result = await this.ingest.recordGap({
            question: i.question,
            tentativeAnswer: i.tentativeAnswer ?? null,
            organizationId: ctx.orgId,
            venueId: i.venueId,
            askedByUserId: ctx.userId,
            sourceMessageId: null,
          })
          this.logger.log(
            JSON.stringify({
              event: 'chat.record_kb_gap',
              gapId: result.id,
              orgId: ctx.orgId,
              venueId: i.venueId,
              userId: ctx.userId,
              askCount: result.askCount,
              dedupedFromExisting: result.dedupedFromExisting,
            }),
          )
          return { ok: true, data: result }
        }
        case 'save_knowledge_doc': {
          if (!ctx) {
            return fail('error', 'save_knowledge_doc requires an authenticated context')
          }
          if (ctx.userRole !== 'owner' && ctx.userRole !== 'manager') {
            return fail('error', 'only managers or owners can save knowledge docs')
          }
          const i = parsed.data as {
            title: string
            content: string
            venueId: string | null
          }
          if (i.venueId) {
            const venue = await prisma.venue.findFirst({
              where: { id: i.venueId, organizationId: ctx.orgId },
              select: { id: true },
            })
            if (!venue) {
              return fail('error', 'venue not found in your organisation')
            }
          }
          const result = await this.ingest.ingest({
            title: i.title,
            content: i.content,
            organizationId: ctx.orgId,
            venueId: i.venueId,
          })
          const tags = Array.isArray(result.metadata.tags)
            ? (result.metadata.tags as unknown[]).filter(
                (t): t is string => typeof t === 'string',
              )
            : []
          const docType =
            typeof result.metadata.docType === 'string' ? result.metadata.docType : null
          this.logger.log(
            JSON.stringify({
              event: 'chat.save_knowledge_doc',
              docId: result.id,
              venueId: i.venueId,
              userId: ctx.userId,
              orgId: ctx.orgId,
              titleLen: i.title.length,
              contentLen: i.content.length,
            }),
          )
          return {
            ok: true,
            data: {
              id: result.id,
              summary: result.aiSummary,
              tags,
              docType,
            },
          }
        }
      }
    } catch (err) {
      const message = (err as Error).message ?? 'unknown dispatcher error'
      this.logger.error(
        JSON.stringify({ event: 'tool_dispatch.error', tool: toolName, message }),
      )
      return fail('error', message)
    }
  }
}
