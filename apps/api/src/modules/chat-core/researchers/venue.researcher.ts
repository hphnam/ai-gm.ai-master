// Plan 06-03 Task 2 — Venue researcher.
//
// Always-on for reasoning + incident (CONTEXT.md D-06-B). Provides shift
// context: profile, contacts, recent incidents (last 24h), upcoming cutoffs
// (next 4h). The structural source of "proactive" reasoning.

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Injectable } from '@nestjs/common'
import { generateText, stepCountIs, type ToolSet, tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../../../database/prisma'
import { type AnthropicUsage, RESEARCHER_TIMEOUT_MS, RoleTimeoutError } from '../../../types'
import { MockOpsService } from '../../mock-ops/mock-ops.service'
import { chatCoreLogger, hashId } from '../log-helpers'
import { VENUE_RESEARCHER_PROMPT } from '../prompts/venue-researcher.prompt'
import type { ResearcherResult } from '../researcher.interface'
import { Researcher } from '../researcher.interface'
import { sanitizeForResearcher } from '../researcher-sanitizer'
import { getVenueBriefing } from '../tools/get-venue-briefing.tool'
import type { ResearchContext } from './docs.researcher'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

@Injectable()
export class VenueResearcher implements Researcher {
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
      get_venue_briefing: tool({
        description:
          'Fetch venue profile + contacts + recent incidents (24h) + upcoming cutoffs (4h).',
        inputSchema: z.object({}),
        execute: async () => {
          if (!ctx.venueId) {
            return { ok: false, reason: 'invalid-input' as const, detail: 'venueId required' }
          }
          const r = await getVenueBriefing(ctx.orgId, ctx.venueId, prisma, this.mockOps)
          if (r.ok) {
            evidenceSummary = `briefing: ${r.data.contacts.length} contacts, ${r.data.recentIncidents.length} incidents (24h), ${r.data.upcomingCutoffs.length} cutoffs (4h)`
          }
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
            content: VENUE_RESEARCHER_PROMPT,
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
        evidenceSummary ||
        result.text.slice(0, 200) ||
        'venue clean — no active incidents, no imminent cutoffs.'

      chatCoreLogger.info('chat_core.researcher_complete', {
        orgId: hashId(ctx.orgId),
        researcher: 'venue',
        citationCount: 0,
        voyageCalls: 0,
        latencyMs: Date.now() - t0,
      })
      chatCoreLogger.info('chat_core.researcher_cost_observed', {
        researcher: 'venue',
        anthropicUsd: 0,
        voyageUsd: 0,
        totalUsd: 0,
      })

      return {
        finding: { researcher: 'venue', summary, citations: [] },
        usage,
        voyageCalls: 0,
      }
    } catch (err) {
      const aborted = controller.signal.aborted
      chatCoreLogger.warn('chat_core.researcher_failed', {
        orgId: hashId(ctx.orgId),
        researcher: 'venue',
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
  const forceThrow = process.env.PROBE_CHAT_CORE_FORCE_RESEARCHER_THROW
  if (forceThrow === 'venue' || forceThrow === 'all') {
    chatCoreLogger.warn('chat_core.researcher_failed', {
      orgId: hashId(ctx.orgId),
      researcher: 'venue',
      error: 'researcher synthetic failure (probe injection)',
      latencyMs: Date.now() - t0,
    })
    throw new Error('venue researcher synthetic failure (probe injection)')
  }

  // Venue runs always-on for reasoning + incident — its stub is brief-agnostic
  // (returns the same shift-context shape regardless of brief substring).
  // Brief is referenced for parity with production path.
  void brief

  const summary =
    'Shift state: venue open, last 24h clean (no incidents), Bibendum cutoff 16:00. Sarah Cleary on duty (07700 900 200).'

  chatCoreLogger.info('chat_core.researcher_complete', {
    orgId: hashId(ctx.orgId),
    researcher: 'venue',
    citationCount: 0,
    voyageCalls: 0,
    latencyMs: Date.now() - t0,
  })
  chatCoreLogger.info('chat_core.researcher_cost_observed', {
    researcher: 'venue',
    anthropicUsd: 0,
    voyageUsd: 0,
    totalUsd: 0,
  })

  return {
    finding: { researcher: 'venue', summary, citations: [] },
    usage: { inputTokens: 140, outputTokens: 64, cacheReadTokens: 0, cacheWriteTokens: 0 },
    voyageCalls: 0,
  }
}
