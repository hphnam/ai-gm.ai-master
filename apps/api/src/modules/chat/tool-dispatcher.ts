import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '@gm-ai/database'
import { TOOL_INPUT_SCHEMAS, type ToolName, fail, type ToolResult } from '@gm-ai/types'
import { IngestService } from '../ingest/ingest.service'
import { RetrievalService } from '../retrieval/retrieval.service'
import { MockOpsService } from '../mock-ops/mock-ops.service'

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
          const i = parsed.data as {
            query: string
            venueId?: string
            limit?: number
            minSimilarity?: number
          }
          return await this.retrieval.find(i.query, {
            venueId: i.venueId,
            limit: i.limit,
            minSimilarity: i.minSimilarity,
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
