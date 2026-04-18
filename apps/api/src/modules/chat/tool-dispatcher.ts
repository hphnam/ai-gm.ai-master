import { Injectable, Logger } from '@nestjs/common'
import { TOOL_INPUT_SCHEMAS, type ToolName, fail, type ToolResult } from '@gm-ai/types'
import { RetrievalService } from '../retrieval/retrieval.service'
import { MockOpsService } from '../mock-ops/mock-ops.service'

@Injectable()
export class ToolDispatcher {
  private readonly logger = new Logger(ToolDispatcher.name)

  constructor(
    private readonly retrieval: RetrievalService,
    private readonly mockOps: MockOpsService,
  ) {}

  async dispatch(toolName: string, input: unknown): Promise<ToolResult<unknown>> {
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
