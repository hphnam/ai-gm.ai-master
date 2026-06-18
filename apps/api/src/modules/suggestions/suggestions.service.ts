import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import {
  fail,
  type ProactiveSuggestion,
  type SuggestionSeverity,
  type ToolName,
  type ToolResult,
} from '../../types'
import { ToolDispatcher } from '../chat/tool-dispatcher'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DISPATCH_TIMEOUT_MS = 3000
const MAX_TEXT_LEN = 160
const TOP_BELOW_PAR = 3
const TOP_CUTOFFS = 2
const CUTOFF_WITHIN_HOURS = 48

const STOCK_GATE = /\b(stock|order|supplier|par|running low|out of)\b/i
const CUTOFF_GATE = /\b(order|cutoff|deliver|supplier)\b/i

type BelowParItem = {
  id: string
  name: string
  unit: string
  currentQty: number
  parLevel: number
  supplierName: string | null
}

type CutoffItem = {
  supplierId: string
  supplierName: string
  estimatedDeliveryHours: number
  stockCount: number
  supplierNotes: string | null
}

@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name)

  constructor(private readonly toolDispatcher: ToolDispatcher) {}

  async onConversationOpen(venueId: string, orgId: string): Promise<ProactiveSuggestion[]> {
    const startedAt = Date.now()
    if (!UUID_RE.test(venueId)) {
      this.logger.warn(
        JSON.stringify({
          event: 'suggestions.generate',
          venueId,
          trigger: 'conversation_open',
          reason: 'invalid_venueId',
          suggestionCount: 0,
        }),
      )
      return []
    }

    if (!(await this.venueBelongsToOrg(venueId, orgId))) {
      this.logger.warn(
        JSON.stringify({
          event: 'suggestions.org_mismatch',
          trigger: 'conversation_open',
          targetVenueId: venueId,
          actingOrgId: orgId,
        }),
      )
      return []
    }

    const generatedAt = new Date().toISOString()
    const belowParInput = { venueId }
    const cutoffInput = { venueId, withinHours: CUTOFF_WITHIN_HOURS }

    const [belowPar, cutoff] = await Promise.all([
      this.runDispatchWithTimeout('get_stock_below_par', belowParInput, venueId),
      this.runDispatchWithTimeout('get_upcoming_cutoffs', cutoffInput, venueId),
    ])

    const suggestions = this.composeSuggestions(
      { tool: 'get_stock_below_par', input: belowParInput, result: belowPar },
      { tool: 'get_upcoming_cutoffs', input: cutoffInput, result: cutoff },
      generatedAt,
    )

    this.emitLogs({
      venueId,
      trigger: 'conversation_open',
      branches: [
        { tool: 'get_stock_below_par', result: belowPar },
        { tool: 'get_upcoming_cutoffs', result: cutoff },
      ],
      suggestionCount: suggestions.length,
      startedAt,
    })

    return suggestions
  }

  async onTurn(
    venueId: string,
    userMessage: string,
    orgId: string,
    conversationId?: string,
  ): Promise<ProactiveSuggestion[]> {
    const startedAt = Date.now()
    if (!userMessage || userMessage.trim().length === 0) return []
    if (!UUID_RE.test(venueId)) return []

    if (!(await this.venueBelongsToOrg(venueId, orgId))) {
      this.logger.warn(
        JSON.stringify({
          event: 'suggestions.org_mismatch',
          trigger: 'turn',
          targetVenueId: venueId,
          actingOrgId: orgId,
        }),
      )
      return []
    }

    if (conversationId !== undefined) {
      const conv = await prisma.chatConversation
        .findUnique({ where: { id: conversationId }, select: { venueId: true } })
        .catch(() => null)
      if (!conv || conv.venueId !== venueId) {
        this.logger.warn(
          JSON.stringify({
            event: 'suggestions.conversation_mismatch',
            venueId,
            conversationId,
          }),
        )
        return []
      }
    }

    const stockMatched = STOCK_GATE.test(userMessage)
    const cutoffMatched = CUTOFF_GATE.test(userMessage)
    const generatedAt = new Date().toISOString()
    const belowParInput = { venueId }
    const cutoffInput = { venueId, withinHours: CUTOFF_WITHIN_HOURS }

    const invoked: Array<Promise<ToolResult<unknown>>> = []
    let belowParResult: ToolResult<unknown> = fail('no-data', 'gate_not_matched')
    let cutoffResult: ToolResult<unknown> = fail('no-data', 'gate_not_matched')

    if (stockMatched) {
      invoked.push(
        this.runDispatchWithTimeout('get_stock_below_par', belowParInput, venueId).then((r) => {
          belowParResult = r
          return r
        }),
      )
    }
    if (cutoffMatched) {
      invoked.push(
        this.runDispatchWithTimeout('get_upcoming_cutoffs', cutoffInput, venueId).then((r) => {
          cutoffResult = r
          return r
        }),
      )
    }
    await Promise.all(invoked)

    const composed = this.composeSuggestions(
      { tool: 'get_stock_below_par', input: belowParInput, result: belowParResult },
      { tool: 'get_upcoming_cutoffs', input: cutoffInput, result: cutoffResult },
      generatedAt,
    )

    const seen = new Set<string>()
    const deduped: ProactiveSuggestion[] = []
    for (const s of composed) {
      const key = `${s.kind}|${s.itemIds[0] ?? s.sourceToolCall.tool}`
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(s)
    }

    const branches: Array<{ tool: ToolName; result: ToolResult<unknown> }> = []
    if (stockMatched) branches.push({ tool: 'get_stock_below_par', result: belowParResult })
    if (cutoffMatched) branches.push({ tool: 'get_upcoming_cutoffs', result: cutoffResult })

    this.emitLogs({
      venueId,
      trigger: 'turn',
      conversationId: conversationId ?? null,
      messageLength: userMessage.length,
      stockMatched,
      cutoffMatched,
      branches,
      suggestionCount: deduped.length,
      startedAt,
    })

    return deduped
  }

  private async venueBelongsToOrg(venueId: string, orgId: string): Promise<boolean> {
    const hit = await prisma.venue
      .findFirst({
        where: { id: venueId, organizationId: orgId },
        select: { id: true },
      })
      .catch(() => null)
    return Boolean(hit)
  }

  private async runDispatchWithTimeout(
    tool: ToolName,
    input: Record<string, unknown>,
    venueId: string,
  ): Promise<ToolResult<unknown>> {
    let timer: NodeJS.Timeout | undefined
    const timeoutPromise = new Promise<ToolResult<unknown>>((resolve) => {
      timer = setTimeout(() => {
        this.logger.error(
          JSON.stringify({
            event: 'suggestions.tool_timeout',
            venueId,
            tool,
            timeoutMs: DISPATCH_TIMEOUT_MS,
          }),
        )
        resolve(fail('error', 'timeout'))
      }, DISPATCH_TIMEOUT_MS)
    })
    try {
      return await Promise.race([this.toolDispatcher.dispatch(tool, input), timeoutPromise])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  private composeSuggestions(
    belowPar: { tool: ToolName; input: Record<string, unknown>; result: ToolResult<unknown> },
    cutoff: { tool: ToolName; input: Record<string, unknown>; result: ToolResult<unknown> },
    generatedAt: string,
  ): ProactiveSuggestion[] {
    const out: ProactiveSuggestion[] = []

    if (belowPar.result.ok) {
      const items = (belowPar.result.data as BelowParItem[]).slice(0, TOP_BELOW_PAR)
      for (const it of items) {
        const severity: SuggestionSeverity = it.currentQty === 0 ? 'warn' : 'info'
        const raw = `${it.name} is at ${it.currentQty}${it.unit} (par ${it.parLevel}${it.unit})${it.supplierName ? ` — order from ${it.supplierName}` : ''}`
        out.push({
          kind: 'below-par',
          severity,
          text: this.sanitizeText(raw),
          itemIds: [it.id],
          sourceToolCall: { tool: belowPar.tool, input: belowPar.input },
          generatedAt,
        })
      }
    }

    if (cutoff.result.ok) {
      const items = (cutoff.result.data as CutoffItem[]).slice(0, TOP_CUTOFFS)
      for (const it of items) {
        const severity: SuggestionSeverity = it.estimatedDeliveryHours < 6 ? 'warn' : 'info'
        const raw = `${it.supplierName} order cutoff in ~${it.estimatedDeliveryHours}h (${it.stockCount} items)${it.supplierNotes ? ` — ${it.supplierNotes}` : ''}`
        out.push({
          kind: 'cutoff',
          severity,
          text: this.sanitizeText(raw),
          itemIds: [it.supplierId],
          sourceToolCall: { tool: cutoff.tool, input: cutoff.input },
          generatedAt,
        })
      }
    }

    return out
  }

  private sanitizeText(raw: string): string {
    const cleaned = raw.replace(/[\r\n\t]+/g, ' ').trim()
    if (cleaned.length <= MAX_TEXT_LEN) return cleaned
    const cut = cleaned.lastIndexOf(' ', MAX_TEXT_LEN - 1)
    const boundary = cut > 0 ? cut : MAX_TEXT_LEN - 1
    return `${cleaned.slice(0, boundary).trimEnd()}…`
  }

  private emitLogs(args: {
    venueId: string
    trigger: 'conversation_open' | 'turn'
    conversationId?: string | null
    messageLength?: number
    stockMatched?: boolean
    cutoffMatched?: boolean
    branches: Array<{ tool: ToolName; result: ToolResult<unknown> }>
    suggestionCount: number
    startedAt: number
  }) {
    const toolsInvoked = args.branches.map((b) => b.tool)
    const toolsFailed = args.branches
      .filter((b) => !b.result.ok && b.result.reason === 'error')
      .map((b) => ({
        tool: b.tool,
        reason: 'error',
        detail: (b.result as { detail?: string }).detail ?? null,
      }))

    const erroredCount = toolsFailed.length
    if (toolsInvoked.length > 0 && erroredCount === toolsInvoked.length) {
      this.logger.error(
        JSON.stringify({
          event: 'suggestions.both_tools_errored',
          venueId: args.venueId,
          trigger: args.trigger,
          details: toolsFailed,
        }),
      )
    }

    const payload: Record<string, unknown> = {
      event: 'suggestions.generate',
      venueId: args.venueId,
      trigger: args.trigger,
      suggestionCount: args.suggestionCount,
      toolsInvoked,
      toolsFailed,
      latency_ms: Date.now() - args.startedAt,
    }
    if (args.trigger === 'turn') {
      payload.conversationId = args.conversationId ?? null
      payload.messageLength = args.messageLength
      payload.stock_matched = args.stockMatched
      payload.cutoff_matched = args.cutoffMatched
    }
    this.logger.log(JSON.stringify(payload))
  }
}
