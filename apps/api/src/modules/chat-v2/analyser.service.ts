// Plan 06-02 Task 2 — Analyser service.
//
// Analyser is the soul of the system per CONTEXT.md D-06-A. Reconciles
// researcher findings, decides answer shape, self-rates evidence sufficiency
// (drives re-research circuit-breaker via ANALYSER_RERESEARCH_CONFIDENCE_THRESHOLD).
//
// Sonnet 4.6 via @ai-sdk/anthropic generateObject with AnalyserOutputSchema.
// Structured output, retry on schema-parse failure (max 2 retries via AI SDK
// maxRetries). cacheControl ephemeral on system prompt block.
//
// audit-M3 — wraps generateObject in AbortController + setTimeout per
// ANALYSER_TIMEOUT_MS. On timeout: throw RoleTimeoutError('analyser', ...).

import { Injectable } from '@nestjs/common'
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import {
  ANALYSER_TIMEOUT_MS,
  type AnalyserOutput,
  AnalyserOutputSchema,
  type AnthropicUsage,
  type ChatMode,
  type ResearcherFinding,
  RoleTimeoutError,
} from '../../types'
import { ANALYSER_PROMPT } from './prompts/analyser.prompt'

const SONNET_MODEL = 'claude-sonnet-4-6'
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

export type AnalyserInput = {
  mode: ChatMode
  userMessage: string
  findings: ResearcherFinding[]
}

export type AnalyserResult = {
  output: AnalyserOutput
  usage: AnthropicUsage
}

@Injectable()
export class AnalyserService {
  async analyse(input: AnalyserInput): Promise<AnalyserResult> {
    if (process.env.PROBE_CHAT_V2_STUB === '1') {
      return stubAnalyse(input)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ANALYSER_TIMEOUT_MS)

    try {
      const result = await generateObject({
        model: anthropicProvider(SONNET_MODEL),
        schema: AnalyserOutputSchema,
        messages: [
          {
            role: 'system',
            content: ANALYSER_PROMPT,
            providerOptions: { anthropic: { cacheControl: SYSTEM_CACHE_CONTROL } },
          },
          {
            role: 'user',
            content: JSON.stringify({
              userMessage: input.userMessage,
              mode: input.mode,
              findings: input.findings,
            }),
          },
        ],
        abortSignal: controller.signal,
        maxRetries: 2,
      })

      const output = AnalyserOutputSchema.parse(result.object)
      const usage = extractUsage(result.usage)
      return { output, usage }
    } catch (err) {
      if (controller.signal.aborted) {
        throw new RoleTimeoutError('analyser', ANALYSER_TIMEOUT_MS)
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

function stubAnalyse(input: AnalyserInput): AnalyserResult {
  // Stub Analyser. Confidence keyed by mode + probe-injected env flag for
  // re-research circuit-breaker assertions (V29-V31).
  const lower = input.userMessage.toLowerCase()

  let evidenceSufficiency = 0.7
  let suggestedShape: AnalyserOutput['suggestedShape'] = 'recommendation'

  if (input.mode === 'incident') {
    evidenceSufficiency = 0.85
    suggestedShape = 'sequence'
  } else if (input.mode === 'reasoning') {
    if (lower.includes('flat pint') || lower.includes('residue')) {
      evidenceSufficiency = 0.75
      suggestedShape = 'diagnosis'
    } else if (lower.includes('short staffed') || lower.includes('group booking')) {
      evidenceSufficiency = 0.75
      suggestedShape = 'branching'
    }
  }

  // Probe-injected low-confidence override for re-research circuit-breaker tests.
  if (process.env.PROBE_CHAT_V2_FORCE_LOW_CONFIDENCE === '1') {
    evidenceSufficiency = 0.4
  }

  // Pass through citations from findings — never fabricate, never drop.
  const citations = input.findings.flatMap((f) =>
    f.citations.map((c) => ({
      knowledgeItemId: c.knowledgeItemId,
      ...(c.sectionId ? { sectionId: c.sectionId } : {}),
    })),
  )

  const synthesis = input.findings.length > 0
    ? input.findings.map((f) => f.summary).join(' ')
    : 'No researcher findings; unable to synthesize.'

  return {
    output: {
      synthesis,
      citations,
      openQuestions: evidenceSufficiency < 0.6 ? ['probe-stub-open-question'] : [],
      suggestedShape,
      evidenceSufficiency,
    },
    usage: { inputTokens: 320, outputTokens: 96, cacheReadTokens: 0, cacheWriteTokens: 0 },
  }
}
