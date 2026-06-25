import { Injectable, Logger } from '@nestjs/common'
import { fail, ok, type ToolResult } from '../../types'
import type { DispatchContext } from '../chat/tool-dispatcher'
import { BrainClient, BrainUnavailableError } from './brain.client'
import {
  BRAIN_CHECK_CHECKLIST,
  BRAIN_CHECK_DEVIATION,
  BRAIN_CHECK_STOCK_COVER,
  BRAIN_FIND_SOP_GAPS,
  BRAIN_FORECAST_SALES,
  BRAIN_TOOL_SCHEMAS,
} from './brain.tools'

/// Orchestrates the four brain tools: validate input, call the FastAPI client,
/// and shape the result into the codebase's ToolResult<T> envelope. orgId is
/// taken from ctx (never the model); the brain is gated by BRAIN_ENABLED so the
/// module is inert when the brain is down.
@Injectable()
export class BrainService {
  private readonly logger = new Logger(BrainService.name)

  constructor(private readonly client: BrainClient) {}

  async dispatch(
    toolName: string,
    input: unknown,
    ctx: DispatchContext,
  ): Promise<ToolResult<unknown>> {
    if (!this.client.enabled) {
      return fail('not-supported', 'Proactive Brain is disabled (BRAIN_ENABLED=0)')
    }
    const schema = BRAIN_TOOL_SCHEMAS[toolName as keyof typeof BRAIN_TOOL_SCHEMAS]
    if (!schema) {
      return fail('not-supported', `Proactive Brain has no tool "${toolName}"`)
    }
    // NOTE: the IntegrationRegistry validates against this same schema before
    // calling the provider on the live path; we re-validate here so the service
    // is correct when called directly (the unit tests do exactly that).
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return fail('invalid-input', parsed.error.issues.map((i) => i.message).join('; '))
    }

    try {
      switch (toolName) {
        case BRAIN_FORECAST_SALES:
          return await this.forecast(parsed.data as ForecastInput)
        case BRAIN_CHECK_DEVIATION:
          return await this.checkDeviation(parsed.data as DeviationInput)
        case BRAIN_FIND_SOP_GAPS:
          return await this.findSopGaps()
        case BRAIN_CHECK_STOCK_COVER:
          return await this.checkStockCover(parsed.data as StockCoverInput)
        case BRAIN_CHECK_CHECKLIST:
          return await this.checkChecklist(parsed.data as ChecklistInput)
        default:
          return fail('not-supported', `Proactive Brain has no tool "${toolName}"`)
      }
    } catch (err) {
      if (err instanceof BrainUnavailableError) {
        this.logger.warn(JSON.stringify({ event: 'brain.unavailable', toolName, orgId: ctx.orgId }))
        return fail('error', 'Proactive Brain is unreachable — try again shortly')
      }
      this.logger.error(
        JSON.stringify({
          event: 'brain.dispatch_error',
          toolName,
          orgId: ctx.orgId,
          error: err instanceof Error ? err.message : String(err),
        }),
      )
      return fail('error', 'Proactive Brain failed to produce a result')
    }
  }

  private async forecast(i: ForecastInput): Promise<ToolResult<unknown>> {
    const res = await this.client.forecast(i)
    if (res.n === 0) {
      return fail('no-data', `No band for ${i.venue}/${i.layer ?? 'L1'} in that range yet`)
    }
    return ok({
      venue: res.venue,
      layer: res.layer,
      level: res.level,
      key: res.key,
      forecast: res.forecast,
    })
  }

  private async checkDeviation(i: DeviationInput): Promise<ToolResult<unknown>> {
    const res = await this.client.checkDeviation(i)
    if (res.n_checked === 0) {
      return fail('no-data', `No stored band to compare against for ${i.venue}`)
    }
    return ok(res)
  }

  private async findSopGaps(): Promise<ToolResult<unknown>> {
    const res = await this.client.sopGaps()
    return ok({
      failure_rate: res.failure_rate,
      rolling7_max: res.rolling7_max,
      embedding_backend: res.embedding_backend,
      gaps: res.gaps,
    })
  }

  private async checkChecklist(i: ChecklistInput): Promise<ToolResult<unknown>> {
    const res = await this.client.checkChecklist(i)
    return ok(res)
  }

  private async checkStockCover(i: StockCoverInput): Promise<ToolResult<unknown>> {
    const res = await this.client.stockCover(i.venue)
    if (res.n === 0) {
      return fail('no-data', res.note ?? `No stock data for ${i.venue}`)
    }
    return ok({
      venue: res.venue,
      as_of: res.as_of,
      n_reorder: res.n_reorder,
      lines: res.lines,
    })
  }
}

type ForecastInput = (typeof BRAIN_TOOL_SCHEMAS)[typeof BRAIN_FORECAST_SALES]['_output']
type DeviationInput = (typeof BRAIN_TOOL_SCHEMAS)[typeof BRAIN_CHECK_DEVIATION]['_output']
type ChecklistInput = (typeof BRAIN_TOOL_SCHEMAS)[typeof BRAIN_CHECK_CHECKLIST]['_output']
type StockCoverInput = (typeof BRAIN_TOOL_SCHEMAS)[typeof BRAIN_CHECK_STOCK_COVER]['_output']
