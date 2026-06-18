// Plan 06-03 Task 2 — People researcher.

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Injectable } from '@nestjs/common'
import { generateText, stepCountIs, type ToolSet, tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../../../database/prisma'
import { type AnthropicUsage, RESEARCHER_TIMEOUT_MS, RoleTimeoutError } from '../../../types'
import { chatCoreLogger, hashId } from '../log-helpers'
import { PEOPLE_RESEARCHER_PROMPT } from '../prompts/people-researcher.prompt'
import type { ResearcherResult } from '../researcher.interface'
import { Researcher } from '../researcher.interface'
import { sanitizeForResearcher } from '../researcher-sanitizer'
import { getPerson } from '../tools/get-person.tool'
import type { ResearchContext } from './docs.researcher'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

@Injectable()
export class PeopleResearcher implements Researcher {
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
    const citations: { knowledgeItemId: string; sectionId?: string }[] = []

    const tools: ToolSet = {
      get_person: tool({
        description:
          'Match a venue contact by name or role; returns role, contact details, and document mentions.',
        inputSchema: z.object({
          name: z.string().min(1).optional(),
          role: z.string().min(1).optional(),
        }),
        execute: async ({ name, role }) => {
          const r = await getPerson({ name, role }, ctx.orgId, ctx.venueId, prisma)
          if (r.ok && r.data.length > 0) {
            for (const m of r.data) {
              for (const mention of m.mentions) {
                citations.push({ knowledgeItemId: mention.knowledgeItemId })
              }
            }
            evidenceSummary = `${r.data.length} contact(s) matched`
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
            content: PEOPLE_RESEARCHER_PROMPT,
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
        evidenceSummary || result.text.slice(0, 200) || 'no people data needed for this turn.'

      chatCoreLogger.info('chat_core.researcher_complete', {
        orgId: hashId(ctx.orgId),
        researcher: 'people',
        citationCount: citations.length,
        voyageCalls: 0,
        latencyMs: Date.now() - t0,
      })
      chatCoreLogger.info('chat_core.researcher_cost_observed', {
        researcher: 'people',
        anthropicUsd: 0,
        voyageUsd: 0,
        totalUsd: 0,
      })

      return {
        finding: { researcher: 'people', summary, citations },
        usage,
        voyageCalls: 0,
      }
    } catch (err) {
      const aborted = controller.signal.aborted
      chatCoreLogger.warn('chat_core.researcher_failed', {
        orgId: hashId(ctx.orgId),
        researcher: 'people',
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
  if (forceThrow === 'people' || forceThrow === 'all') {
    chatCoreLogger.warn('chat_core.researcher_failed', {
      orgId: hashId(ctx.orgId),
      researcher: 'people',
      error: 'researcher synthetic failure (probe injection)',
      latencyMs: Date.now() - t0,
    })
    throw new Error('people researcher synthetic failure (probe injection)')
  }

  const lower = brief.toLowerCase()
  let summary = 'no people data needed for this turn.'

  if (lower.includes('engineer') || lower.includes('ice machine')) {
    summary = 'Ice machine engineer: Hoshizaki — Dave Mahon 07700 900 134.'
  } else if (lower.includes('manager')) {
    summary = 'Duty manager on file: Sarah Cleary 07700 900 200; Emma Walsh deputy.'
  } else if (lower.includes('cleaner')) {
    summary = 'Cleaning team lead: Joao Silva 07700 900 412.'
  } else if (lower.includes('gas safe') || lower.includes('gas')) {
    summary = 'Gas Safe engineer: Tom Reilly 07700 900 077, Gas Safe ID 654321.'
  } else if (lower.includes('contact') || lower.includes('emergency')) {
    summary =
      'Emergency contacts: GM Sarah Cleary 07700 900 200; Maintenance Tom Reilly 07700 900 077.'
  }

  chatCoreLogger.info('chat_core.researcher_complete', {
    orgId: hashId(ctx.orgId),
    researcher: 'people',
    citationCount: 0,
    voyageCalls: 0,
    latencyMs: Date.now() - t0,
  })
  chatCoreLogger.info('chat_core.researcher_cost_observed', {
    researcher: 'people',
    anthropicUsd: 0,
    voyageUsd: 0,
    totalUsd: 0,
  })

  return {
    finding: { researcher: 'people', summary, citations: [] },
    usage: { inputTokens: 100, outputTokens: 48, cacheReadTokens: 0, cacheWriteTokens: 0 },
    voyageCalls: 0,
  }
}
