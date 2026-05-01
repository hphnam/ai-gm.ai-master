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

// Probe-only state captures (audit-M4 V16). Production code path is
// unaffected — these are touched only inside stubClassify().
let _probeLastSanitizedInput: string | null = null
export function _probeGetLastSanitizedInput(): string | null {
  return _probeLastSanitizedInput
}
export function _probeResetLastSanitizedInput(): void {
  _probeLastSanitizedInput = null
}

// Stub mode for probe-chat-v2.ts. Plan 06-02 audit-S7 — explicit priority
// ordering: SAFETY patterns (incident) check FIRST, THEN reasoning patterns,
// THEN lookup patterns. Without this priority, generic 'flat pint' regex would
// catch "pint tasted off and they feel sick" before the safety-signal pattern
// fires (regression).
function stubClassify(userMessage: string): TriageResult {
  _probeLastSanitizedInput = userMessage

  // V15 audit-M3 — synthetic per-role timeout. Throw RoleTimeoutError to
  // exercise the orchestrator's catch-block + turn-failed cost persistence.
  if (process.env.PROBE_CHAT_V2_FORCE_TRIAGE_TIMEOUT === '1') {
    throw new RoleTimeoutError('triage', TRIAGE_TIMEOUT_MS)
  }

  const lower = userMessage.toLowerCase()
  const dispatchDocs: ResearcherName[] = ['docs']

  // ── Priority 1: SAFETY / INCIDENT patterns (audit-S7) ────────────────────
  // Allergen+illness escalation (boundary case from CONTEXT.md D-06-B).
  if (
    /pint.*sick|sick.*pint|tasted off.*sick|sick.*tasted off|allergen|allergy|allergic reaction/i.test(
      userMessage,
    )
  ) {
    return makeStubResult(
      'incident',
      dispatchDocs,
      'Fetch allergen handling procedure + emergency contacts + incident logging requirements.',
      true,
    )
  }
  // Cellar / flooding emergencies.
  if (/cellar.*flood|flooding|burst pipe/i.test(userMessage)) {
    return makeStubResult(
      'incident',
      dispatchDocs,
      'Fetch cellar emergency procedure + power-isolation steps + emergency contacts.',
      true,
    )
  }
  // Fire alarm / fire.
  if (/\b(fire|fire alarm|alarm went off)\b/i.test(userMessage)) {
    return makeStubResult(
      'incident',
      dispatchDocs,
      'Fetch fire evacuation procedure + muster point + 999 protocol.',
      true,
    )
  }
  // Drunk customer / personal safety / injury.
  if (/\b(drunk customer|drunk patron|unconscious|bleeding|injury|fainting|choking)\b/i.test(userMessage)) {
    return makeStubResult(
      'incident',
      dispatchDocs,
      'Fetch refusal-of-service / injury / safety procedure + escalation contacts.',
      true,
    )
  }

  // ── Priority 2: REASONING patterns ────────────────────────────────────
  if (/flat pint|complaint about/i.test(userMessage)) {
    return makeStubResult(
      'reasoning',
      dispatchDocs,
      'Fetch keg/line troubleshooting steps + supplier contacts that inform a multi-path diagnosis.',
      false,
    )
  }
  if (/short[- ]staffed|short staff/i.test(userMessage)) {
    return makeStubResult(
      'reasoning',
      dispatchDocs,
      'Fetch operational priority guidance for understaffed shifts + service-level fallbacks.',
      false,
    )
  }
  if (/group booking|should i take|should i accept/i.test(userMessage)) {
    return makeStubResult(
      'reasoning',
      dispatchDocs,
      'Fetch capacity guidance + staffing requirements + branching criteria for the booking decision.',
      false,
    )
  }
  if (/glass.*residue|residue|washer/i.test(userMessage)) {
    return makeStubResult(
      'reasoning',
      dispatchDocs,
      'Fetch glass-wash troubleshooting steps + descaler procedure + EHO compliance flags.',
      false,
    )
  }

  // ── Priority 3: LOOKUP patterns (existing 06-01 stubs) ────────────────
  let brief = 'Look up the relevant procedure or fact in the venue knowledge base.'
  if (lower.includes('below par')) {
    brief = 'Find current stock levels and which items are at or below par.'
  } else if (lower.includes('open up') || lower.includes('opening')) {
    brief = 'Fetch the venue opening checklist and surface its full ordered steps.'
  } else if (lower.includes('bibendum') || lower.includes('cutoff')) {
    brief = 'Find the supplier cutoff time for Bibendum.'
  } else if (lower.includes('heineken')) {
    brief = 'Look up Heineken sales data over the requested window.'
  } else if (lower.includes('ice machine')) {
    brief = 'Look up the ice-machine engineer contact and unit details.'
  }

  return makeStubResult('lookup', dispatchDocs, brief, false)
}

function makeStubResult(
  mode: 'lookup' | 'reasoning' | 'incident',
  dispatch: ResearcherName[],
  brief: string,
  safetySignal: boolean,
): TriageResult {
  return {
    output: {
      mode,
      researchersToDispatch: dispatch,
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
