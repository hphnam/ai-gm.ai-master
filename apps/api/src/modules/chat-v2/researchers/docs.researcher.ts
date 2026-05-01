// Plan 06-01 Task 3 — Docs researcher.
//
// In production: AI SDK ToolLoopAgent (Haiku) with two shaped tools wrapping
// pure functions. Bounded steps (3 max — researcher should be quick).
// In stub mode (PROBE_CHAT_V2_STUB=1): canned ResearcherFinding keyed by brief
// substring. No network, no tool calls, voyageCalls = 0.
//
// audit-M3 — wraps the AI SDK call in AbortController + setTimeout per
// RESEARCHER_TIMEOUT_MS. On timeout: throw RoleTimeoutError.

import { Injectable } from '@nestjs/common'
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { generateText, stepCountIs, tool, type ToolSet } from 'ai'
import { z } from 'zod'
import { prisma } from '../../../database/prisma'
import {
  type AnthropicUsage,
  RESEARCHER_TIMEOUT_MS,
  type ResearcherFinding,
  RoleTimeoutError,
} from '../../../types'
import { RetrievalService } from '../../retrieval/retrieval.service'
import { getChecklist } from '../tools/get-checklist.tool'
import { searchDocs } from '../tools/search-docs.tool'
import { DOCS_RESEARCHER_PROMPT } from '../prompts/docs-researcher.prompt'
import { chatV2Logger, hashId } from '../log-helpers'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

export type ResearchContext = {
  orgId: string
  venueId: string | null
  conversationId: string
}

export type DocsResearcherResult = {
  finding: ResearcherFinding
  usage: AnthropicUsage
  voyageCalls: number
}

@Injectable()
export class DocsResearcher {
  constructor(private readonly retrievalService: RetrievalService) {}

  async research(brief: string, ctx: ResearchContext): Promise<DocsResearcherResult> {
    if (process.env.PROBE_CHAT_V2_STUB === '1') {
      return stubResearch(brief, ctx)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), RESEARCHER_TIMEOUT_MS)

    let voyageCalls = 0
    const citations: { knowledgeItemId: string; sectionId?: string }[] = []
    let evidenceSummary = ''

    const tools: ToolSet = {
      get_checklist: tool({
        description: 'Fetch full ordered checklist for procedural intent (opening/closing/etc.)',
        inputSchema: z.object({ intent: z.string().min(1) }),
        execute: async ({ intent }) => {
          const result = await getChecklist(intent, ctx.orgId, ctx.venueId, prisma)
          if (result.ok) {
            citations.push({ knowledgeItemId: result.data.knowledgeItemId })
            evidenceSummary = `${result.data.title} (${result.data.steps.length} steps)`
          }
          return result
        },
      }),
      search_docs: tool({
        description: 'Search documents for facts, policies, supplier info — anything not procedural.',
        inputSchema: z.object({
          query: z.string().min(1),
          docType: z.string().optional(),
        }),
        execute: async ({ query, docType }) => {
          voyageCalls += 1
          const result = await searchDocs(
            query,
            { docType, venueId: ctx.venueId ?? undefined },
            ctx.orgId,
            this.retrievalService,
          )
          if (result.ok) {
            for (const h of result.data.hits) {
              citations.push({
                knowledgeItemId: h.knowledgeItemId,
                sectionId: h.sectionId ?? undefined,
              })
            }
            const top = result.data.hits[0]
            if (top) evidenceSummary = `${top.sectionTitle ?? 'doc hit'} (+${result.data.hits.length - 1} more)`
          }
          return result
        },
      }),
    }

    try {
      const result = await generateText({
        model: anthropicProvider(HAIKU_MODEL),
        messages: [
          {
            role: 'system',
            content: DOCS_RESEARCHER_PROMPT,
            providerOptions: { anthropic: { cacheControl: SYSTEM_CACHE_CONTROL } },
          },
          { role: 'user', content: brief },
        ],
        tools,
        toolChoice: 'auto',
        stopWhen: [stepCountIs(3)],
        abortSignal: controller.signal,
      })

      const usage = extractUsage(result.usage)
      const summary = evidenceSummary || result.text.slice(0, 200) || 'No procedure on file.'

      chatV2Logger.info('chat_v2.researcher_complete', {
        orgId: hashId(ctx.orgId),
        researcher: 'docs',
        citationCount: citations.length,
        voyageCalls,
      })

      return {
        finding: {
          researcher: 'docs',
          summary,
          citations,
        },
        usage,
        voyageCalls,
      }
    } catch (err) {
      if (controller.signal.aborted) {
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

function stubResearch(brief: string, ctx: ResearchContext): DocsResearcherResult {
  // Probe-injected failure mode (audit-M2 V14): force the researcher to throw
  // mid-flight after Triage has succeeded. Used to assert turn-failed cost row.
  if (process.env.PROBE_CHAT_V2_FORCE_RESEARCHER_THROW === '1') {
    throw new Error('researcher synthetic failure (probe injection)')
  }

  const lower = brief.toLowerCase()
  let summary = 'No procedure on file.'
  const citations: { knowledgeItemId: string; sectionId?: string }[] = []

  if (lower.includes('opening') || lower.includes('open')) {
    summary = 'Beer Hall Opening Checklist (7 steps): unlock + alarm off, fridges + lines on, glass-wash cycle, float count, board pricing, doors at 11:45, music up.'
    citations.push({ knowledgeItemId: '00000000-0000-4000-8000-000000000001' })
  } else if (lower.includes('below par') || lower.includes('stock')) {
    summary = 'Stock report: 4 SKUs at or below par — Heineken 8/12, Guinness 5/10, Estrella 3/8, Aperol 1/4. Bibendum cutoff 16:00.'
    citations.push({ knowledgeItemId: '00000000-0000-4000-8000-000000000002' })
  } else if (lower.includes('ice machine')) {
    summary = 'Ice machine engineer: Hoshizaki — Dave Mahon 07700 900 134. Manitowoc unit on back bar.'
    citations.push({ knowledgeItemId: '00000000-0000-4000-8000-000000000003' })
  } else if (lower.includes('bibendum') || lower.includes('cutoff')) {
    summary = 'Bibendum cutoff: 16:00 weekdays, 14:00 Saturdays.'
    citations.push({ knowledgeItemId: '00000000-0000-4000-8000-000000000004' })
  } else if (lower.includes('heineken')) {
    summary = 'Heineken sales last 7d: 142 pints (-8% WoW). Friday dip: 18 pints vs ~30 typical.'
    citations.push({ knowledgeItemId: '00000000-0000-4000-8000-000000000005' })
  }

  // ctx is referenced for parity with the production path; stub does not log.
  void ctx

  return {
    finding: { researcher: 'docs', summary, citations },
    usage: { inputTokens: 120, outputTokens: 64, cacheReadTokens: 0, cacheWriteTokens: 0 },
    voyageCalls: 0,
  }
}
