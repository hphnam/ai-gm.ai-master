// Plan 06-01 Task 3 — Writer service.
// Plan 06-02 — extended for 3 modes (lookup unchanged; reasoning + incident new).
//
// AC-7 hard architectural rule: the Writer is structurally tool-less. Its only
// inputs are the WriterInput shape; its only output is text. A regression would
// require adding a tool-set parameter to an AI SDK call below, which the AC-7
// verification grep catches (zero matches expected in this file).
//
// audit-M3 — wraps generateText in AbortController + setTimeout per
// WRITER_TIMEOUT_MS. On timeout: throw RoleTimeoutError.
// audit-M2 — input.safetySignal threaded; Writer-incident bakes 999 directive.
// audit-S4 — input.citationCount (number) only; raw citation IDs/content NOT
// passed to Writer (prevents leaking IDs in prose as meta-narration).

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Injectable } from '@nestjs/common'
import { generateText, streamText } from 'ai'
import {
  type AnthropicUsage,
  RoleTimeoutError,
  WRITER_TIMEOUT_MS,
  type WriterInput,
} from '../../types'
import { WRITER_INCIDENT_PROMPT } from './prompts/writer-incident.prompt'
import { WRITER_LOOKUP_PROMPT } from './prompts/writer-lookup.prompt'
import { WRITER_REASONING_PROMPT } from './prompts/writer-reasoning.prompt'

const SONNET_MODEL = 'claude-sonnet-4-6'
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

export type WriterResult = {
  text: string
  usage: AnthropicUsage
}

// Plan 06-04 Task 2 — streaming Writer result. Matches AI SDK 6.x streamText
// return shape with usage as a Promise. Voice/prompt/AC-7 contract preserved
// (same prompts, same buildUserContent, same model, same cache control).
export type WriterStreamResult = ReturnType<typeof streamText>

const PROMPT_BY_MODE: Record<WriterInput['mode'], string> = {
  lookup: WRITER_LOOKUP_PROMPT,
  reasoning: WRITER_REASONING_PROMPT,
  incident: WRITER_INCIDENT_PROMPT,
}

@Injectable()
export class WriterService {
  async compose(input: WriterInput): Promise<WriterResult> {
    if (process.env.PROBE_CHAT_CORE_STUB === '1') {
      return stubCompose(input)
    }

    const systemPrompt = PROMPT_BY_MODE[input.mode]
    const userContent = buildUserContent(input)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), WRITER_TIMEOUT_MS)

    try {
      const result = await generateText({
        model: anthropicProvider(SONNET_MODEL),
        messages: [
          {
            role: 'system',
            content: systemPrompt,
            providerOptions: { anthropic: { cacheControl: SYSTEM_CACHE_CONTROL } },
          },
          { role: 'user', content: userContent },
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

  // Plan 06-04 Task 2 — streaming variant. Same prompt/model/cache-control as
  // compose(); returns the AI SDK streamText result so the caller can pipe to
  // a UI message stream. AC-7 carry-forward — Writer is still tool-less (no
  // `tools` parameter passed to streamText). Stub mode falls back to compose
  // for deterministic probe assertions.
  streamCompose(input: WriterInput, abortSignal?: AbortSignal): WriterStreamResult {
    const systemPrompt = PROMPT_BY_MODE[input.mode]
    const userContent = buildUserContent(input)
    return streamText({
      model: anthropicProvider(SONNET_MODEL),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
          providerOptions: { anthropic: { cacheControl: SYSTEM_CACHE_CONTROL } },
        },
        { role: 'user', content: userContent },
      ],
      abortSignal,
    })
  }
}

// Build user content for the Writer. Note we deliberately do NOT pass raw
// citation arrays — only the count, per audit-S4. Writer should never see
// citation IDs (would invite meta-narration leak) or raw citation content
// (would bypass Analyser's reconciliation work).
function buildUserContent(input: WriterInput): string {
  const sections: string[] = []
  sections.push(`User asked: ${input.userMessage}`)

  if (input.analyserSynthesis) {
    sections.push(`Analyser synthesis (use this directly):\n${input.analyserSynthesis}`)
  }

  // Findings summaries only — never raw citation content. Researcher.summary
  // is already a synthesized sentence safe for Writer to use.
  if (input.findings.length > 0) {
    const summaries = input.findings.map((f) => `- ${f.summary}`).join('\n')
    sections.push(`Researcher findings:\n${summaries}`)
  }

  if (typeof input.citationCount === 'number') {
    sections.push(
      `Citations available: ${input.citationCount} (count only — used by 06-04 for general-advice badge logic)`,
    )
  }

  if (input.mode === 'incident' && input.safetySignal === true) {
    sections.push(
      `SAFETY SIGNAL: true. Bake an explicit 999 directive into the FIRST HALF of your response per the system-prompt safety rules.`,
    )
  }

  if (input.corrections && input.corrections.length > 0) {
    sections.push(
      `Critic flagged these specifics to fix: ${input.corrections.join('; ')}\nRewrite the answer with these corrections applied. Voice unchanged.`,
    )
  }

  const closingDirective: Record<WriterInput['mode'], string> = {
    lookup: 'Write the answer in lookup voice. Lead with the fact, ≤3 short lines, no preamble.',
    reasoning:
      'Write the answer in reasoning voice. Branch when paths exist, opinionated, 4-12 short lines, no preamble.',
    incident:
      "Write the answer in incident voice. Urgency-first, Now/Then/Don't structure where it fits, empathy at end only.",
  }
  sections.push(closingDirective[input.mode])

  return sections.join('\n\n')
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
  // Stub Writer outputs deterministic, mode-shaped text designed to pass the
  // probe AC-3 / V21 / V25 regex assertions without making real Anthropic calls.
  // For Critic-corrections retries (input.corrections non-empty), embeds a
  // [RETRY] sentinel so probe V36 can verify retry-path execution.

  const retrySentinel = input.corrections && input.corrections.length > 0 ? '[RETRY] ' : ''

  if (input.mode === 'lookup') {
    const top = input.findings[0]
    const text = top
      ? `${retrySentinel}${top.summary}\nCheck the cutoff if you're ordering today.`
      : `${retrySentinel}No procedure on file for that.`
    return {
      text,
      usage: { inputTokens: 220, outputTokens: 48, cacheReadTokens: 0, cacheWriteTokens: 0 },
    }
  }

  if (input.mode === 'reasoning') {
    // Shape designed to satisfy V21 POSITIVE_REASONING_RE: matches "First thing —"
    // and "Two paths:" and "if X.*if not". Lines: 5 (within 4-12 bound).
    const synthesisLine = input.analyserSynthesis ?? input.findings[0]?.summary ?? 'standard play.'
    const text =
      `${retrySentinel}First thing — check the gas, that's 80% of it.\n` +
      `Two paths:\n` +
      `If it's the keg or line, change the keg, run a clean if it's still off.\n` +
      `If it's just one pint, the punter's pint sat too long. Pour a fresh, move on.\n` +
      `Synthesis: ${synthesisLine}`
    return {
      text,
      usage: { inputTokens: 240, outputTokens: 80, cacheReadTokens: 0, cacheWriteTokens: 0 },
    }
  }

  // incident
  const safety = input.safetySignal === true
  const lines: string[] = []
  lines.push(`${retrySentinel}Right — cut the power at the consumer unit, NOT in the cellar.`)
  if (safety) {
    // V48a: 999 directive within first 3 lines (audit-M2 spec — first half OR
    // first 3 lines). Position by line, not character — incident responses
    // include verbose late-stage content (don't/empathy lines) that pushes
    // mid-text past the character midpoint without affecting urgency-first.
    lines.push(`If anyone's hurt or you smell gas, ring 999 NOW.`)
  }
  lines.push(`Now: get everyone out and shut the trap door.`)
  lines.push(`Then: ring the cellar emergency number on file.`)
  lines.push(`Don't go back in until power's confirmed off.`)
  lines.push(`Confirm with the duty manager before re-entry.`)
  lines.push(`You've done the right call moving fast.`)
  return {
    text: lines.join('\n'),
    usage: { inputTokens: 260, outputTokens: 96, cacheReadTokens: 0, cacheWriteTokens: 0 },
  }
}
