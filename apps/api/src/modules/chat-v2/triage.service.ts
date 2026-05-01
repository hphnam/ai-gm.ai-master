// Plan 06-01 Task 2 — Triage agent. Calls Haiku 4.5 via @ai-sdk/anthropic
// generateObject with the strict Zod schema, returns parsed output + usage so
// the orchestrator (chat-v2.service) can accumulate cost across the turn.
//
// Hard wall-clock timeout (audit-M3): TRIAGE_TIMEOUT_MS via AbortController.
// Stub mode (PROBE_CHAT_V2_STUB=1): returns deterministic canned output keyed
// by userMessage substring. No network call.

import { Injectable } from '@nestjs/common'
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { generateObject, type SystemModelMessage } from 'ai'
import {
  type AnthropicUsage,
  type ResearcherName,
  TRIAGE_TIMEOUT_MS,
  TriageClassificationError,
  type TriageOutput,
  TriageOutputSchema,
  RoleTimeoutError,
} from '../../types'
import { TRIAGE_PROMPT } from './prompts/triage.prompt'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

export type TriageResult = {
  output: TriageOutput
  usage: AnthropicUsage
}

@Injectable()
export class TriageService {
  async classify(
    userMessage: string,
    _ctx: { conversationHistory?: { role: string; content: string }[] } = {},
  ): Promise<TriageResult> {
    if (process.env.PROBE_CHAT_V2_STUB === '1') {
      return stubClassify(userMessage)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TRIAGE_TIMEOUT_MS)

    const systemMessages: SystemModelMessage[] = [
      {
        role: 'system',
        content: TRIAGE_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: SYSTEM_CACHE_CONTROL },
        },
      },
    ]

    try {
      const result = await generateObject({
        model: anthropicProvider(HAIKU_MODEL),
        schema: TriageOutputSchema,
        messages: [
          ...systemMessages,
          { role: 'user', content: userMessage },
        ],
        abortSignal: controller.signal,
        maxRetries: 2,
      })

      const output = TriageOutputSchema.parse(result.object)
      const usage = extractUsage(result.usage)
      return { output, usage }
    } catch (err) {
      if (controller.signal.aborted) {
        throw new RoleTimeoutError('triage', TRIAGE_TIMEOUT_MS)
      }
      throw new TriageClassificationError(
        (err as Error)?.message ?? 'triage classification failed',
      )
    } finally {
      clearTimeout(timer)
    }
  }
}

// AI SDK 6.x exposes usage with optional cache token channels. Normalize to the
// AnthropicUsage shape (all four channels present, defaulted to 0) so cost math
// in CostTracker (Task 3) doesn't have to handle undefined.
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

// Stub mode for probe-chat-v2.ts. Substring match → canned TriageOutput.
// Production code path is unaffected — env check at top of classify().
function stubClassify(userMessage: string): TriageResult {
  const lower = userMessage.toLowerCase()
  const dispatchDocs: ResearcherName[] = ['docs']
  let brief = 'Look up the relevant procedure or fact in the venue knowledge base.'
  if (lower.includes('below par')) {
    brief = 'Find current stock levels and which items are at or below par.'
  } else if (lower.includes('open up') || lower.includes('opening')) {
    brief = 'Fetch the venue opening checklist and surface its full ordered steps.'
  } else if (lower.includes('flat pint')) {
    brief = 'Look up keg/line troubleshooting steps for a flat pint.'
  } else if (lower.includes('bibendum') || lower.includes('cutoff')) {
    brief = 'Find the supplier cutoff time for Bibendum.'
  } else if (lower.includes('heineken')) {
    brief = 'Look up Heineken sales data over the requested window.'
  }

  const safetySignal = /\b(fire|flood|injury|unconscious|police|bleeding|allergen)\b/i.test(
    userMessage,
  )

  return {
    output: {
      mode: 'lookup',
      researchersToDispatch: dispatchDocs,
      briefByResearcher: { docs: brief },
      safetySignal,
    },
    usage: {
      inputTokens: 80,
      outputTokens: 32,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
  }
}
