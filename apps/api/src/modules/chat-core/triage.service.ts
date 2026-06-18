// Plan 06-01 Task 2 — Triage agent. Calls Haiku 4.5 via @ai-sdk/anthropic
// generateObject with the strict Zod schema, returns parsed output + usage so
// the orchestrator (chat-core.service) can accumulate cost across the turn.
//
// Hard wall-clock timeout (audit-M3): TRIAGE_TIMEOUT_MS via AbortController.
// Stub mode (PROBE_CHAT_CORE_STUB=1): returns deterministic canned output keyed
// by userMessage substring. No network call.

import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Injectable } from '@nestjs/common'
import { generateObject, type SystemModelMessage } from 'ai'
import {
  type AnthropicUsage,
  MAX_RESEARCHERS_PER_TURN,
  type ResearcherName,
  RoleTimeoutError,
  TRIAGE_TIMEOUT_MS,
  TriageClassificationError,
  type TriageOutput,
  TriageOutputSchema,
} from '../../types'
import { chatCoreLogger } from './log-helpers'
import { TRIAGE_PROMPT } from './prompts/triage.prompt'
import { quickClassify } from './triage-quick-classify'

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
    if (process.env.PROBE_CHAT_CORE_STUB === '1') {
      return stubClassify(userMessage)
    }

    // Plan 06-04 hot-fix 2026-05-02 — fast-path for high-confidence regex
    // patterns. Real-Anthropic generateObject on Haiku takes 5-15s on cold
    // start; for "what's below par?" / "Bibendum cutoff?" / "cellar's
    // flooding" that's wrong. quickClassify returns a synthesized output for
    // known patterns in <1ms. Genuinely ambiguous queries fall through to
    // generateObject below.
    const quick = quickClassify(userMessage)
    if (quick) {
      chatCoreLogger.info('chat_core.triage_fast_path', {
        mode: quick.mode,
        dispatched: quick.researchersToDispatch,
        safetySignal: quick.safetySignal,
      })
      return {
        output: quick,
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      }
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
        messages: [...systemMessages, { role: 'user', content: userMessage }],
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
      throw new TriageClassificationError((err as Error)?.message ?? 'triage classification failed')
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

// Stub mode for probe-chat-core.ts. Plan 06-02 audit-S7 — explicit priority
// ordering: SAFETY patterns (incident) check FIRST, THEN reasoning patterns,
// THEN lookup patterns. Without this priority, generic 'flat pint' regex would
// catch "pint tasted off and they feel sick" before the safety-signal pattern
// fires (regression).
//
// Plan 06-03 Task 3 — extended for per-mode researcher subset dispatch.
// Venue always-on for reasoning + incident (CONTEXT.md D-06-B). Lookup picks
// exactly ONE specialist whose domain matches. audit-S2 — defense-in-depth
// .slice(0, MAX_RESEARCHERS_PER_TURN) at the makeStubResult boundary.
//
// audit-S6 — orchestrator persists triage_dispatch entry on chat_messages.
// toolCallLog with hash of each brief (first 12 chars sha256). Stub continues
// to populate briefByResearcher for every dispatched researcher; orchestrator
// hashes at persist time.

const VENUE_BRIEF =
  'Briefing for current shift context: profile, layout, active incidents in last 24h, upcoming cutoffs in next 4h.'

// V80.cap synthetic dispatch — when env var is set, force-emit 5 researchers
// to exercise orchestrator truncation + dispatch_capped warn.
const FORCE_FIVE_DISPATCH = '__FORCE_FIVE__'

function stubClassify(userMessage: string): TriageResult {
  _probeLastSanitizedInput = userMessage

  // V15 audit-M3 — synthetic per-role timeout. Throw RoleTimeoutError to
  // exercise the orchestrator's catch-block + turn-failed cost persistence.
  if (process.env.PROBE_CHAT_CORE_FORCE_TRIAGE_TIMEOUT === '1') {
    throw new RoleTimeoutError('triage', TRIAGE_TIMEOUT_MS)
  }

  // V80.cap — force-five-researcher dispatch for orchestrator cap test.
  if (
    process.env.PROBE_CHAT_CORE_FORCE_FIVE_DISPATCH === '1' ||
    userMessage.includes(FORCE_FIVE_DISPATCH)
  ) {
    return makeStubResult(
      'reasoning',
      ['venue', 'docs', 'ops', 'people', 'tabular'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch any relevant procedure.',
        ops: 'Fetch stock state.',
        people: 'Fetch contacts on duty.',
        tabular: 'Fetch sales aggregates.',
      },
      false,
      // Skip the cap defense-in-depth so orchestrator sees all 5.
      true,
    )
  }

  const lower = userMessage.toLowerCase()

  // ── Priority 1: SAFETY / INCIDENT patterns (audit-S7) ────────────────────
  // Allergen+illness escalation (boundary case from CONTEXT.md D-06-B).
  if (
    /pint.*sick|sick.*pint|tasted off.*sick|sick.*tasted off|allergen|allergy|allergic reaction/i.test(
      userMessage,
    )
  ) {
    return makeStubResult(
      'incident',
      ['venue', 'docs', 'people'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch allergen handling procedure + incident logging requirements.',
        people: 'Fetch duty manager + GP/A&E emergency contacts.',
      },
      true,
    )
  }
  // Cellar / flooding emergencies.
  if (/cellar.*flood|flooding|burst pipe/i.test(userMessage)) {
    return makeStubResult(
      'incident',
      ['venue', 'docs', 'people'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch cellar emergency procedure + power-isolation steps.',
        people: 'Fetch maintenance + duty manager contacts.',
      },
      true,
    )
  }
  // Fire alarm / fire.
  if (/\b(fire|fire alarm|alarm went off)\b/i.test(userMessage)) {
    return makeStubResult(
      'incident',
      ['venue', 'docs', 'people'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch fire evacuation procedure + muster point + 999 protocol.',
        people: 'Fetch duty manager + fire warden contacts.',
      },
      true,
    )
  }
  // Drunk customer / personal safety / injury.
  if (
    /\b(drunk customer|drunk patron|unconscious|bleeding|injury|fainting|choking)\b/i.test(
      userMessage,
    )
  ) {
    return makeStubResult(
      'incident',
      ['venue', 'docs', 'people'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch refusal-of-service / injury / safety procedure.',
        people: 'Fetch duty manager + first-aider contacts.',
      },
      true,
    )
  }

  // ── Priority 2: REASONING patterns ────────────────────────────────────
  if (/flat pint|complaint about/i.test(userMessage)) {
    return makeStubResult(
      'reasoning',
      ['venue', 'docs', 'ops'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch keg/line troubleshooting steps that inform a multi-path diagnosis.',
        ops: 'Fetch keg + line state + supplier cutoffs that may bear on the diagnosis.',
      },
      false,
    )
  }
  if (/short[- ]staffed|short staff/i.test(userMessage)) {
    return makeStubResult(
      'reasoning',
      ['venue', 'ops', 'people'],
      {
        venue: VENUE_BRIEF,
        ops: 'Fetch operational priorities and stock state for understaffed shifts.',
        people: 'Fetch duty manager + on-call staff contacts.',
      },
      false,
    )
  }
  if (/group booking|should i take|should i accept/i.test(userMessage)) {
    return makeStubResult(
      'reasoning',
      ['venue', 'ops'],
      {
        venue: VENUE_BRIEF,
        ops: 'Fetch capacity + staffing + stock state that affect the booking decision.',
      },
      false,
    )
  }
  if (/glass.*residue|residue|washer/i.test(userMessage)) {
    return makeStubResult(
      'reasoning',
      ['venue', 'docs', 'ops'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch glass-wash troubleshooting + descaler procedure + EHO flags.',
        ops: 'Fetch detergent stock + last-clean state.',
      },
      false,
    )
  }

  // ── Priority 3: LOOKUP patterns — pick ONE specialist by domain ─────────
  if (lower.includes('below par')) {
    return makeStubResult(
      'lookup',
      ['ops'],
      { ops: 'Find current stock levels and which items are at or below par.' },
      false,
    )
  }
  if (lower.includes('open up') || lower.includes('opening') || lower.includes('checklist')) {
    return makeStubResult(
      'lookup',
      ['docs'],
      { docs: 'Fetch the relevant venue checklist and surface its full ordered steps.' },
      false,
    )
  }
  if (lower.includes('bibendum') || lower.includes('cutoff') || lower.includes('supplier')) {
    return makeStubResult(
      'lookup',
      ['ops'],
      { ops: 'Find the supplier cutoff time / supplier details.' },
      false,
    )
  }
  if (
    lower.includes('top 3') ||
    lower.includes('top selling') ||
    lower.includes('total revenue') ||
    lower.includes('sales last') ||
    lower.includes('heineken')
  ) {
    return makeStubResult(
      'lookup',
      ['tabular'],
      { tabular: 'Run an aggregate query over the relevant tabular doc.' },
      false,
    )
  }
  if (
    lower.includes('ice machine') ||
    lower.includes('engineer') ||
    lower.includes('who do i call')
  ) {
    return makeStubResult(
      'lookup',
      ['people'],
      { people: 'Look up the engineer / contact details.' },
      false,
    )
  }

  // Default fallback: docs.
  return makeStubResult(
    'lookup',
    ['docs'],
    { docs: 'Look up the relevant procedure or fact in the venue knowledge base.' },
    false,
  )
}

function makeStubResult(
  mode: 'lookup' | 'reasoning' | 'incident',
  dispatch: ResearcherName[],
  briefs: Partial<Record<ResearcherName, string>>,
  safetySignal: boolean,
  skipCap = false,
): TriageResult {
  // audit-S2 defense-in-depth: stub respects MAX_RESEARCHERS_PER_TURN; the
  // V80.cap synthetic test path passes skipCap=true so the orchestrator gets
  // a 5-researcher dispatch to truncate.
  const cappedDispatch = skipCap ? dispatch : dispatch.slice(0, MAX_RESEARCHERS_PER_TURN)
  // briefByResearcher is keyed off cappedDispatch only.
  const briefsOut: Partial<Record<ResearcherName, string>> = {}
  for (const r of cappedDispatch) {
    if (briefs[r]) briefsOut[r] = briefs[r]
  }
  return {
    output: {
      mode,
      researchersToDispatch: cappedDispatch,
      briefByResearcher: briefsOut,
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
