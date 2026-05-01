// Plan 06-01 Task 3 — Writer service. Lookup mode only in 06-01.
//
// AC-7 hard architectural rule: the Writer is structurally tool-less. Its only
// inputs are the WriterInput shape; its only output is text. A regression would
// require adding a tool-set parameter to an AI SDK call below, which the AC-7
// verification grep catches (zero matches expected in this file).
//
// audit-M3 — wraps generateText in AbortController + setTimeout per
// WRITER_TIMEOUT_MS. On timeout: throw RoleTimeoutError.

import { Injectable } from '@nestjs/common'
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import {
  type AnthropicUsage,
  RoleTimeoutError,
  type WriterInput,
  WRITER_TIMEOUT_MS,
} from '../../types'
import { WRITER_LOOKUP_PROMPT } from './prompts/writer-lookup.prompt'

const SONNET_MODEL = 'claude-sonnet-4-6'
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

export type WriterResult = {
  text: string
  usage: AnthropicUsage
}

@Injectable()
export class WriterService {
  async compose(input: WriterInput): Promise<WriterResult> {
    if (input.mode !== 'lookup') {
      throw new Error(`writer mode '${input.mode}' not implemented in 06-01 (06-02 scope)`)
    }

    if (process.env.PROBE_CHAT_V2_STUB === '1') {
      return stubCompose(input)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), WRITER_TIMEOUT_MS)

    const findingsBlock = input.findings
      .map(
        (f) =>
          `From ${f.researcher} researcher: ${f.summary}\nCitations: ${f.citations
            .map((c) => c.knowledgeItemId)
            .join(', ') || 'none'}`,
      )
      .join('\n\n')

    try {
      const result = await generateText({
        model: anthropicProvider(SONNET_MODEL),
        messages: [
          {
            role: 'system',
            content: WRITER_LOOKUP_PROMPT,
            providerOptions: { anthropic: { cacheControl: SYSTEM_CACHE_CONTROL } },
          },
          {
            role: 'user',
            content: `User asked: ${input.userMessage}\n\n${findingsBlock}\n\nWrite the answer in lookup voice. Lead with the fact, ≤3 short lines, no preamble.`,
          },
        ],
        abortSignal: controller.signal,
      })
      const usage = extractUsage(result.usage)
      return { text: result.text.trim(), usage }
    } catch (err) {
      if (controller.signal.aborted) {
        throw new RoleTimeoutError('writer', WRITER_TIMEOUT_MS)
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

function stubCompose(input: WriterInput): WriterResult {
  // Stub Writer output: deterministic, AC-3-compliant, keyed by first finding's
  // summary. Designed to pass the no-preamble + no-meta + no-headings regex.
  const top = input.findings[0]
  const text = top
    ? `${top.summary}\nCheck the cutoff if you're ordering today.`
    : 'No procedure on file for that.'
  return {
    text,
    usage: { inputTokens: 220, outputTokens: 48, cacheReadTokens: 0, cacheWriteTokens: 0 },
  }
}
