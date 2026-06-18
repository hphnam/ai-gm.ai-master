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

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Injectable } from '@nestjs/common'
import { generateText } from 'ai'
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

// Plan 06-04 hot-fix 2026-05-02 — switched generateObject → generateText
// with manual JSON parse. Real-Anthropic generateObject on Sonnet was
// timing out at 15s repeatedly during user UAT. generateText with a
// "respond with JSON only" instruction is materially faster (no schema
// enforcement at the API layer). We still validate via AnalyserOutputSchema
// after parsing the text response, so the type contract is preserved.

@Injectable()
export class AnalyserService {
  async analyse(input: AnalyserInput): Promise<AnalyserResult> {
    if (process.env.PROBE_CHAT_CORE_STUB === '1') {
      return stubAnalyse(input)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ANALYSER_TIMEOUT_MS)

    try {
      const result = await generateText({
        model: anthropicProvider(SONNET_MODEL),
        messages: [
          {
            role: 'system',
            content: `${ANALYSER_PROMPT}\n\nRespond with JSON ONLY, matching this shape:\n{"synthesis": string, "citations": Array<{knowledgeItemId: string, sectionId?: string}>, "openQuestions": string[], "suggestedShape": "recommendation"|"diagnosis"|"sequence"|"branching", "evidenceSufficiency": number}\nNo prose. No code fences. No commentary. Pure JSON.`,
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

      const parsed = parseAnalyserJson(result.text)
      const output = AnalyserOutputSchema.parse(parsed)
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

// Best-effort JSON extractor: strips optional code fences, trims whitespace,
// then JSON.parse. Throws on unparseable output (caller catches and logs).
function parseAnalyserJson(text: string): unknown {
  let body = text.trim()
  // Strip ```json ... ``` or ``` ... ``` fences if present.
  const fenceMatch = body.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i)
  if (fenceMatch) body = fenceMatch[1].trim()
  // Find the first { and last } to bound the JSON in case the model adds prose.
  const firstBrace = body.indexOf('{')
  const lastBrace = body.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    body = body.slice(firstBrace, lastBrace + 1)
  }
  return JSON.parse(body)
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
  if (process.env.PROBE_CHAT_CORE_FORCE_LOW_CONFIDENCE === '1') {
    evidenceSufficiency = 0.4
  }

  // Pass through citations from findings — never fabricate, never drop.
  const citations = input.findings.flatMap((f) =>
    f.citations.map((c) => ({
      knowledgeItemId: c.knowledgeItemId,
      ...(c.sectionId ? { sectionId: c.sectionId } : {}),
    })),
  )

  const synthesis =
    input.findings.length > 0
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
