// Plan 06-03 Task 2 — Ops researcher.
//
// Mirrors DocsResearcher: @Injectable, AbortController + RoleTimeoutError,
// stub-mode env guard, chatCoreLogger, stepCountIs(3), ephemeral cacheControl
// on system prompt. Tools wrap MockOpsService (DI'd via constructor).
//
// audit-M2: implements Researcher (uniform return shape).
// audit-M4: brief sanitized via sanitizeForResearcher before generateText.
// audit-S1: latencyMs in success + failure logs.
// audit-S3: single PROBE_CHAT_CORE_FORCE_RESEARCHER_THROW env contract.
// audit-S8: per-researcher cost log.

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Injectable } from '@nestjs/common'
import { generateText, stepCountIs, type ToolSet, tool } from 'ai'
import { z } from 'zod'
import { type AnthropicUsage, RESEARCHER_TIMEOUT_MS, RoleTimeoutError } from '../../../types'
import { MockOpsService } from '../../mock-ops/mock-ops.service'
import { chatCoreLogger, hashId } from '../log-helpers'
import { OPS_RESEARCHER_PROMPT } from '../prompts/ops-researcher.prompt'
import type { ResearcherResult } from '../researcher.interface'
import { Researcher } from '../researcher.interface'
import { sanitizeForResearcher } from '../researcher-sanitizer'
import type { ResearchContext } from './docs.researcher'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

@Injectable()
export class OpsResearcher implements Researcher {
  constructor(private readonly mockOps: MockOpsService) {}

  async research(brief: string, ctx: ResearchContext): Promise<ResearcherResult> {
    const t0 = Date.now()
    if (process.env.PROBE_CHAT_CORE_STUB === '1') {
      return stubResearch(brief, ctx, t0)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), RESEARCHER_TIMEOUT_MS)

    const sanitizedBrief = sanitizeForResearcher(brief)
    const sanitizedUserMessage = sanitizeForResearcher(ctx.userMessage)
    const userContent = `User question: "${sanitizedUserMessage}"\n\nResearch focus: ${sanitizedBrief}`
    let evidenceSummary = ''

    const tools: ToolSet = {
      get_stock_below_par: tool({
        description: 'Stock items at or below par for the venue.',
        inputSchema: z.object({}),
        execute: async () => {
          if (!ctx.venueId)
            return { ok: false, reason: 'invalid-input' as const, detail: 'venueId required' }
          const r = await this.mockOps.getStockBelowPar(ctx.venueId)
          if (r.ok) evidenceSummary = `${r.data.length} SKUs below par`
          return r
        },
      }),
      get_stock_by_name: tool({
        description: 'Match a stock item by name (case-insensitive contains).',
        inputSchema: z.object({ name: z.string().min(1) }),
        execute: async ({ name }) => {
          if (!ctx.venueId)
            return { ok: false, reason: 'invalid-input' as const, detail: 'venueId required' }
          const r = await this.mockOps.getStockByName(ctx.venueId, name)
          if (r.ok) evidenceSummary = `${r.data.length} matches for "${name}"`
          return r
        },
      }),
      get_supplier_by_name: tool({
        description: 'Supplier contact by name.',
        inputSchema: z.object({ name: z.string().min(1) }),
        execute: async ({ name }) => {
          const r = await this.mockOps.getSupplierByName(name)
          if (r.ok) evidenceSummary = `supplier ${name} found`
          return r
        },
      }),
      get_upcoming_cutoffs: tool({
        description: 'Suppliers whose order cutoff lands within hoursAhead.',
        inputSchema: z.object({ hoursAhead: z.number().min(1).max(48).optional() }),
        execute: async ({ hoursAhead }) => {
          if (!ctx.venueId)
            return { ok: false, reason: 'invalid-input' as const, detail: 'venueId required' }
          const r = await this.mockOps.getUpcomingCutoffs(ctx.venueId, hoursAhead ?? 4)
          if (r.ok) evidenceSummary = `${r.data.length} upcoming cutoffs`
          return r
        },
      }),
    }

    try {
      const result = await generateText({
        model: anthropicProvider(HAIKU_MODEL),
        messages: [
          {
            role: 'system',
            content: OPS_RESEARCHER_PROMPT,
            providerOptions: { anthropic: { cacheControl: SYSTEM_CACHE_CONTROL } },
          },
          { role: 'user', content: userContent },
        ],
        tools,
        toolChoice: 'auto',
        stopWhen: [stepCountIs(3)],
        abortSignal: controller.signal,
      })

      const usage = extractUsage(result.usage)
      const summary =
        evidenceSummary || result.text.slice(0, 200) || 'no ops data needed for this turn.'

      chatCoreLogger.info('chat_core.researcher_complete', {
        orgId: hashId(ctx.orgId),
        researcher: 'ops',
        citationCount: 0,
        voyageCalls: 0,
        latencyMs: Date.now() - t0,
      })
      chatCoreLogger.info('chat_core.researcher_cost_observed', {
        researcher: 'ops',
        anthropicUsd: 0,
        voyageUsd: 0,
        totalUsd: 0,
      })

      return {
        finding: { researcher: 'ops', summary, citations: [] },
        usage,
        voyageCalls: 0,
      }
    } catch (err) {
      const aborted = controller.signal.aborted
      chatCoreLogger.warn('chat_core.researcher_failed', {
        orgId: hashId(ctx.orgId),
        researcher: 'ops',
        error: (err as Error)?.message ?? 'unknown',
        latencyMs: Date.now() - t0,
      })
      if (aborted) {
        throw new RoleTimeoutError('researcher', RESEARCHER_TIMEOUT_MS)
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
}

function extractUsage(usage: unknown): AnthropicUsage {
  const u = (usage ?? {}) as Record<string, unknown>
  return {
    inputTokens: numberOr0(u.inputTokens),
    outputTokens: numberOr0(u.outputTokens),
    cacheReadTokens: numberOr0(u.cacheReadInputTokens ?? u.cacheReadTokens),
    cacheWriteTokens: numberOr0(u.cacheCreationInputTokens ?? u.cacheWriteTokens),
  }
}

function numberOr0(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function stubResearch(brief: string, ctx: ResearchContext, t0: number): ResearcherResult {
  // audit-S3: single env-var contract.
  const forceThrow = process.env.PROBE_CHAT_CORE_FORCE_RESEARCHER_THROW
  if (forceThrow === 'ops' || forceThrow === 'all') {
    chatCoreLogger.warn('chat_core.researcher_failed', {
      orgId: hashId(ctx.orgId),
      researcher: 'ops',
      error: 'researcher synthetic failure (probe injection)',
      latencyMs: Date.now() - t0,
    })
    throw new Error('ops researcher synthetic failure (probe injection)')
  }

  const lower = brief.toLowerCase()
  let summary = 'no ops data needed for this turn.'

  if (lower.includes('below par')) {
    summary =
      'Stock report: 4 SKUs at or below par — Heineken 8/12, Guinness 5/10, Estrella 3/8, Aperol 1/4.'
  } else if (lower.includes('cutoff') || lower.includes('bibendum')) {
    summary = 'Bibendum cutoff: 16:00 weekdays. Matthew Clark 14:00.'
  } else if (lower.includes('supplier')) {
    summary =
      'Supplier: Bibendum 020 7434 1100, lead 1 day. Matthew Clark 0117 922 6500, lead 2 days.'
  } else if (lower.includes('stock') || lower.includes('keg') || lower.includes('line')) {
    summary = 'Stock state: kegs Heineken 8, Guinness 5; lines clean last 18h.'
  }

  chatCoreLogger.info('chat_core.researcher_complete', {
    orgId: hashId(ctx.orgId),
    researcher: 'ops',
    citationCount: 0,
    voyageCalls: 0,
    latencyMs: Date.now() - t0,
  })
  chatCoreLogger.info('chat_core.researcher_cost_observed', {
    researcher: 'ops',
    anthropicUsd: 0,
    voyageUsd: 0,
    totalUsd: 0,
  })

  return {
    finding: { researcher: 'ops', summary, citations: [] },
    usage: { inputTokens: 110, outputTokens: 56, cacheReadTokens: 0, cacheWriteTokens: 0 },
    voyageCalls: 0,
  }
}
