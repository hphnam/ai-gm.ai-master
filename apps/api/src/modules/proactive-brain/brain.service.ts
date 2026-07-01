import { Injectable, Logger } from '@nestjs/common'
import { fail, ok, type ToolResult } from '../../types'
import type { DispatchContext } from '../chat/tool-dispatcher'
import { BrainClient, BrainUnavailableError } from './brain.client'
import {
  BRAIN_CHECK_CHANGE_POINT,
  BRAIN_CHECK_CHECKLIST,
  BRAIN_CHECK_DEVIATION,
  BRAIN_CHECK_STOCK_COVER,
  BRAIN_DAILY_BRIEFING,
  BRAIN_FIND_SOP_GAPS,
  BRAIN_FORECAST_SALES,
  BRAIN_TOOL_SCHEMAS,
} from './brain.tools'

/// Orchestrates the seven brain tools: validate input, call the FastAPI client,
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
        case BRAIN_CHECK_CHANGE_POINT:
          return await this.checkChangePoint(parsed.data as ChangePointInput)
        case BRAIN_DAILY_BRIEFING:
          return await this.dailyBriefing(parsed.data as BriefingInput)
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
    if (!res.found) {
      return fail('no-data', res.note ?? `No trading-day band to check for ${i.venue}`)
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

  private async checkChangePoint(i: ChangePointInput): Promise<ToolResult<unknown>> {
    const res = await this.client.changePoint(i)
    if (res.note && res.n_change_points === 0) {
      return fail('not-supported', res.note)
    }
    return ok({
      venue: res.venue,
      layer: res.layer,
      stable: res.stable,
      n_change_points: res.n_change_points,
      change_points: res.change_points,
    })
  }

  private async dailyBriefing(i: BriefingInput): Promise<ToolResult<unknown>> {
    // A quiet day (items: []) is a valid, informative answer, so this is always
    // ok — the card renders the "nothing to flag" state.
    const res = await this.client.briefing(i)
    return ok(res)
  }
}

type ForecastInput = (typeof BRAIN_TOOL_SCHEMAS)[typeof BRAIN_FORECAST_SALES]['_output']
type DeviationInput = (typeof BRAIN_TOOL_SCHEMAS)[typeof BRAIN_CHECK_DEVIATION]['_output']
type ChecklistInput = (typeof BRAIN_TOOL_SCHEMAS)[typeof BRAIN_CHECK_CHECKLIST]['_output']
type StockCoverInput = (typeof BRAIN_TOOL_SCHEMAS)[typeof BRAIN_CHECK_STOCK_COVER]['_output']
type ChangePointInput = (typeof BRAIN_TOOL_SCHEMAS)[typeof BRAIN_CHECK_CHANGE_POINT]['_output']
type BriefingInput = (typeof BRAIN_TOOL_SCHEMAS)[typeof BRAIN_DAILY_BRIEFING]['_output']
