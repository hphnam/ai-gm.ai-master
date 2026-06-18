// Plan 06-02 Task 2 — Critic service.
//
// Critic verifies that Writer's draft renders SPECIFICS faithfully against the
// researcher findings. audit-M1 (release-blocker): operates on
// ResearcherFinding[] with `.summary` access — NOT on bare citation IDs. Without
// summary access, verification is vacuous (every input trivially passes
// "approved"). The orchestrator passes the same findings array Analyser saw.
//
// Voice/shape concerns are NOT Critic's job — Writer owns voice. Critic checks
// fact-correctness only.
//
// Haiku 4.5 via generateObject with CriticOutputSchema. AbortController +
// setTimeout per CRITIC_TIMEOUT_MS (4s — audit-S3 tightened from 8s).

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Injectable } from '@nestjs/common'
import { generateText } from 'ai'
import {
  type AnthropicUsage,
  CRITIC_TIMEOUT_MS,
  type CriticOutput,
  CriticOutputSchema,
  type ResearcherFinding,
  RoleTimeoutError,
} from '../../types'
import { CRITIC_PROMPT } from './prompts/critic.prompt'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

export type CriticInput = {
  writerDraft: string
  // audit-M1 — Critic operates on findings (with .summary), NOT bare citation IDs
  findings: ResearcherFinding[]
}

export type CriticResult = {
  output: CriticOutput
  usage: AnthropicUsage
}

// Plan 06-04 hot-fix 2026-05-02 — switched generateObject → generateText
// with manual JSON parse (same family of fix as Analyser). Anthropic's
// structured-output mode + strict schemas was adding 3-8s of latency on
// every Critic call. generateText with a "respond with JSON only"
// directive is faster and the runtime contract is preserved via
// CriticOutputSchema.parse() after extraction.

@Injectable()
export class CriticService {
  async verify(input: CriticInput): Promise<CriticResult> {
    if (process.env.PROBE_CHAT_CORE_STUB === '1') {
      return stubVerify(input)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CRITIC_TIMEOUT_MS)

    try {
      const result = await generateText({
        model: anthropicProvider(HAIKU_MODEL),
        messages: [
          {
            role: 'system',
            content: `${CRITIC_PROMPT}\n\nRespond with JSON ONLY, matching this shape:\n{"verdict": "approved" | "corrections-needed", "corrections"?: string[]}\nNo prose. No code fences. No commentary. Pure JSON.`,
            providerOptions: { anthropic: { cacheControl: SYSTEM_CACHE_CONTROL } },
          },
          {
            role: 'user',
            content: JSON.stringify({
              writerDraft: input.writerDraft,
              findings: input.findings,
            }),
          },
        ],
        abortSignal: controller.signal,
        maxRetries: 2,
      })

      const parsed = parseCriticJson(result.text)
      const output = CriticOutputSchema.parse(parsed)
      const usage = extractUsage(result.usage)
      return { output, usage }
    } catch (err) {
      if (controller.signal.aborted) {
        throw new RoleTimeoutError('critic', CRITIC_TIMEOUT_MS)
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
}

function parseCriticJson(text: string): unknown {
  let body = text.trim()
  const fenceMatch = body.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i)
  if (fenceMatch) body = fenceMatch[1].trim()
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

function stubVerify(input: CriticInput): CriticResult {
  // Probe-injected reject for V35-V37 (Critic correction loop assertions).
  if (process.env.PROBE_CHAT_CORE_FORCE_CRITIC_REJECT === '1') {
    return {
      output: {
        verdict: 'corrections-needed',
        corrections: ['probe-injected synthetic correction: phone number drift'],
      },
      usage: { inputTokens: 180, outputTokens: 32, cacheReadTokens: 0, cacheWriteTokens: 0 },
    }
  }

  // Default stub: approved. Reference findings count for parity with production
  // shape (Critic would inspect findings.summary in real mode).
  void input.findings.length

  return {
    output: { verdict: 'approved' },
    usage: { inputTokens: 180, outputTokens: 16, cacheReadTokens: 0, cacheWriteTokens: 0 },
  }
}
