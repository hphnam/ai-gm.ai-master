// Plan 06-03 Task 2 — Tabular researcher.
//
// Two-tool flow: search_docs (filtered by docType: 'tabular') discovers a
// docId, then query_document_table runs the aggregate. Stub-mode produces
// canned aggregate summaries keyed on brief substrings.

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Injectable } from '@nestjs/common'
import { generateText, stepCountIs, type ToolSet, tool } from 'ai'
import { z } from 'zod'
import { type AnthropicUsage, RESEARCHER_TIMEOUT_MS, RoleTimeoutError } from '../../../types'
import { RetrievalService } from '../../retrieval/retrieval.service'
import { TabularQueryService } from '../../tabular/tabular.service'
import { chatCoreLogger, hashId } from '../log-helpers'
import { TABULAR_RESEARCHER_PROMPT } from '../prompts/tabular-researcher.prompt'
import type { ResearcherResult } from '../researcher.interface'
import { Researcher } from '../researcher.interface'
import { sanitizeForResearcher } from '../researcher-sanitizer'
import { searchDocs } from '../tools/search-docs.tool'
import type { ResearchContext } from './docs.researcher'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

@Injectable()
export class TabularResearcher implements Researcher {
  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly tabularQuery: TabularQueryService,
  ) {}

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
    let voyageCalls = 0
    let evidenceSummary = ''
    const citations: { knowledgeItemId: string; sectionId?: string }[] = []

    const tools: ToolSet = {
      search_docs: tool({
        description:
          'Discover the docId of a tabular document matching the brief. Always pass docType="tabular".',
        inputSchema: z.object({
          query: z.string().min(1),
          docType: z.string().optional(),
        }),
        execute: async ({ query, docType }) => {
          voyageCalls += 1
          const r = await searchDocs(
            query,
            { docType: docType ?? 'tabular', venueId: ctx.venueId ?? undefined },
            ctx.orgId,
            this.retrievalService,
          )
          if (r.ok) {
            for (const h of r.data.hits) {
              citations.push({ knowledgeItemId: h.knowledgeItemId })
            }
          }
          return r
        },
      }),
      query_document_table: tool({
        description: 'Run a structured aggregate / filter / groupBy query against a tabular doc.',
        inputSchema: z.object({
          docId: z.string().uuid(),
          filters: z
            .array(
              z.object({
                column: z.string(),
                op: z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'contains']),
                value: z.union([z.string(), z.number()]),
              }),
            )
            .optional(),
          groupBy: z.string().optional(),
          aggregate: z
            .object({
              fn: z.enum(['count', 'sum', 'avg', 'min', 'max']),
              column: z.string().optional(),
            })
            .optional(),
          sort: z
            .object({
              column: z.string(),
              direction: z.enum(['asc', 'desc']).optional(),
            })
            .optional(),
          limit: z.number().min(1).max(100).optional(),
        }),
        execute: async (input) => {
          const r = await this.tabularQuery.query(ctx.orgId, input)
          if (r.ok) {
            evidenceSummary = `query returned ${r.data.rowCount} rows`
            citations.push({ knowledgeItemId: input.docId })
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
            content: TABULAR_RESEARCHER_PROMPT,
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
        evidenceSummary || result.text.slice(0, 200) || 'no tabular data needed for this turn.'

      chatCoreLogger.info('chat_core.researcher_complete', {
        orgId: hashId(ctx.orgId),
        researcher: 'tabular',
        citationCount: citations.length,
        voyageCalls,
        latencyMs: Date.now() - t0,
      })
      chatCoreLogger.info('chat_core.researcher_cost_observed', {
        researcher: 'tabular',
        anthropicUsd: 0,
        voyageUsd: 0,
        totalUsd: 0,
      })

      return {
        finding: { researcher: 'tabular', summary, citations },
        usage,
        voyageCalls,
      }
    } catch (err) {
      const aborted = controller.signal.aborted
      chatCoreLogger.warn('chat_core.researcher_failed', {
        orgId: hashId(ctx.orgId),
        researcher: 'tabular',
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
  if (forceThrow === 'tabular' || forceThrow === 'all') {
    chatCoreLogger.warn('chat_core.researcher_failed', {
      orgId: hashId(ctx.orgId),
      researcher: 'tabular',
      error: 'researcher synthetic failure (probe injection)',
      latencyMs: Date.now() - t0,
    })
    throw new Error('tabular researcher synthetic failure (probe injection)')
  }

  const lower = brief.toLowerCase()
  let summary = 'no tabular data needed for this turn.'

  // V82.tabular_no_doc — explicit no-match path. Stub returns "no tabular doc
  // matched" without failing. AC-18 contract.
  if (lower.includes('no tabular') || lower.includes('no-tabular')) {
    summary = 'no tabular doc matched the query'
  } else if (lower.includes('top selling') || lower.includes('top 3 selling')) {
    summary = 'Top 3 selling lines last 7d: Sauv Blanc 142, Pinot Noir 98, Cab 76.'
  } else if (lower.includes('highest priced') || lower.includes('most expensive')) {
    summary = 'Highest priced wine on list: Chateau Margaux 2010, £680.'
  } else if (lower.includes('total revenue') || lower.includes('revenue')) {
    summary = 'Total revenue last 7d: £18,432.40 across 612 transactions.'
  } else if (lower.includes('heineken') || lower.includes('sales')) {
    summary = 'Heineken sales last 7d: 142 pints (-8% WoW).'
  }

  chatCoreLogger.info('chat_core.researcher_complete', {
    orgId: hashId(ctx.orgId),
    researcher: 'tabular',
    citationCount: 0,
    voyageCalls: 0,
    latencyMs: Date.now() - t0,
  })
  chatCoreLogger.info('chat_core.researcher_cost_observed', {
    researcher: 'tabular',
    anthropicUsd: 0,
    voyageUsd: 0,
    totalUsd: 0,
  })

  return {
    finding: { researcher: 'tabular', summary, citations: [] },
    usage: { inputTokens: 130, outputTokens: 60, cacheReadTokens: 0, cacheWriteTokens: 0 },
    voyageCalls: 0,
  }
}
