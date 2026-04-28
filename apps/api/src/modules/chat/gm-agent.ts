import {
  ToolLoopAgent,
  stepCountIs,
  hasToolCall,
  tool,
  type ToolSet,
  type OnFinishEvent,
} from 'ai'
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { ToolDispatcher, type DispatchContext } from './tool-dispatcher'
import { buildAiSdkTools } from './ai-sdk-tools'
import { CHAT_SYSTEM_PROMPT, CONVERSATION_MODE_OVERLAYS } from './system-prompt'

export type AgentMode = 'default' | 'incident' | 'handover' | 'training'
export type AgentTier = 'haiku' | 'sonnet'

const MODEL_BY_TIER: Record<AgentTier, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
}

// Default tier when caller doesn't specify; Sonnet covers anything non-trivial.
const DEFAULT_TIER: AgentTier = 'sonnet'

// Upper loop budget. 20 is the AI SDK default and gives ample room for
// retrieve → cross-check → draft → save sequences without runaway risk.
const MAX_STEPS = 20

// Returned by the terminal `suggest_followups` tool. Parsed + persisted on
// onFinish.
export type SuggestFollowUpsOutput = { followUps: string[] }

const SuggestFollowUpsInputSchema = z.object({
  followUps: z
    .array(z.string().min(1).max(120))
    .max(3)
    .describe(
      'Between 0 and 3 natural-voice follow-up questions the user might want to tap next. First person, ≤120 chars.',
    ),
})

/**
 * Builds the per-request GM agent. Tools are per-request because the dispatcher
 * closes over {orgId, userId, userRole} for tenant isolation, and we prefer
 * closure-based context over threading `experimental_context` through callers.
 *
 * Agentic surface:
 *  - adaptive thinking (reasoning parts streamed to the UI)
 *  - sequential tool use (retrieval-then-grounding is deterministic)
 *  - stopWhen: 20 steps OR `save_knowledge_doc` fired (destructive writes are
 *    terminal — no more tool calls after a successful write)
 *  - terminal `suggest_followups` tool replaces the `---FOLLOWUPS---` delimiter
 */
export type VenueProfileContext = {
  layoutNotes?: string | null
  fireEscapes?: string[] | null
  firstAidPoints?: string[] | null
  keySafePolicy?: string | null
  alarmPolicy?: string | null
  openingHours?: string | null
  what3words?: string | null
  accessibilityNotes?: string | null
  deliveryNotes?: string | null
}

export type VenueContactSummary = {
  name: string
  role: string
  phone: string | null
  email: string | null
  isEmergencyContact: boolean
}

export function buildGmAgent(params: {
  dispatcher: ToolDispatcher
  ctx: DispatchContext
  venueContext: {
    id: string
    name: string
    timezone: string
    address?: string | null
    type?: string | null
    profile?: VenueProfileContext | null
    contacts?: VenueContactSummary[] | null
  }
  userContext: {
    name: string | null
    email: string
    /// Phase F — short freeform profile summary derived from the user's chat
    /// history (likely role, common topics, style hints). Injected into prompt
    /// context so the agent tailors detail level / tone.
    profileSummary?: string | null
  }
  /// Conversation mode classified per-conversation. Default falls through to the base prompt.
  mode?: AgentMode
  /// Reasoning-effort tier. Heuristic router picks Haiku for short factual
  /// lookups, Sonnet for capture / incident / handover / multi-step.
  tier?: AgentTier
  /// Phase F — compact summary of older turns when the conversation has been
  /// truncated. Injected into prompt context so the agent retains continuity.
  priorSummary?: string | null
  /// Phase G3 — when set, a critical emergency phrase was detected pre-agent.
  /// An advisory block is prepended to instructions forcing 999 / emergency
  /// contact behaviour ahead of any other rules.
  emergencyAdvisory?: { matched: string } | null
  onFinish?: (event: OnFinishEvent<ToolSet>) => void | Promise<void>
  onStepFinish?: (step: {
    toolCalls?: ReadonlyArray<{
      toolCallId: string
      toolName: string
      input: unknown
    }>
    toolResults?: ReadonlyArray<{
      toolCallId: string
      toolName: string
      output: unknown
    }>
  }) => void
}) {
  const baseTools = buildAiSdkTools(params.dispatcher, params.ctx)

  // Terminal tool: model calls this as its final step to register follow-up
  // suggestions. Input is validated + typed; the output is trivially the
  // same array so onStepFinish can pluck it out.
  const suggest_followups = tool({
    description:
      'Emit between 0 and 3 follow-up questions for the user to tap next. Call this as your final tool call in every turn, AFTER you have written your reply. Follow-ups should name concrete artifacts (procedures, SOPs, suppliers) you referenced, or the obvious next operational action.',
    inputSchema: SuggestFollowUpsInputSchema,
    execute: async (input: SuggestFollowUpsOutput) => ({
      ok: true as const,
      data: input,
    }),
  })

  const tools: ToolSet = {
    ...baseTools,
    suggest_followups,
  }

  const now = new Date()
  const tz = params.venueContext.timezone
  const localIso = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
  const dayOfWeek = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'long',
  }).format(now)
  const userLabel = params.userContext.name?.trim() || params.userContext.email

  const profileLines: string[] = []
  const p = params.venueContext.profile
  if (params.venueContext.address) profileLines.push(`address: ${params.venueContext.address}`)
  if (params.venueContext.type) profileLines.push(`venueType: ${params.venueContext.type}`)
  if (p?.openingHours) profileLines.push(`openingHours: ${p.openingHours}`)
  if (p?.layoutNotes) profileLines.push(`layout: ${p.layoutNotes}`)
  if (p?.fireEscapes && p.fireEscapes.length > 0)
    profileLines.push(`fireEscapes: ${p.fireEscapes.join('; ')}`)
  if (p?.firstAidPoints && p.firstAidPoints.length > 0)
    profileLines.push(`firstAid: ${p.firstAidPoints.join('; ')}`)
  if (p?.alarmPolicy) profileLines.push(`alarmPolicy: ${p.alarmPolicy}`)
  if (p?.keySafePolicy) profileLines.push(`keySafePolicy: ${p.keySafePolicy}`)
  if (p?.what3words) profileLines.push(`what3words: ${p.what3words}`)
  if (p?.accessibilityNotes) profileLines.push(`accessibility: ${p.accessibilityNotes}`)
  if (p?.deliveryNotes) profileLines.push(`deliveries: ${p.deliveryNotes}`)
  const profileBlock =
    profileLines.length > 0
      ? `\n<venue_profile>\n${profileLines.join('\n')}\n</venue_profile>`
      : ''

  const contacts = params.venueContext.contacts ?? []
  const contactBlock =
    contacts.length > 0
      ? `\n<venue_contacts>\n${contacts
          .map(
            (c) =>
              `${c.isEmergencyContact ? '[EMERGENCY] ' : ''}${c.name} — ${c.role}${
                c.phone ? `, phone: ${c.phone}` : ''
              }${c.email ? `, email: ${c.email}` : ''}`,
          )
          .join('\n')}\n</venue_contacts>`
      : ''

  const modeOverlay = CONVERSATION_MODE_OVERLAYS[params.mode ?? 'default']
  const emergencyBlock = params.emergencyAdvisory
    ? `\n\n────────────────────────────────────────\nCRITICAL EMERGENCY DETECTED (pre-agent gate)\n────────────────────────────────────────\nThe user's message matched a critical-emergency pattern: "${params.emergencyAdvisory.matched}".\nOVERRIDE all other behaviour for this turn:\n  1. FIRST LINE OF YOUR REPLY MUST BE: "If anyone is hurt or in immediate danger, call 999 right now. Tell me when the scene is safe."\n  2. Surface the venue's emergency contacts (from <venue_contacts>) verbatim — name, role, phone — in priority order.\n  3. DO NOT call find_knowledge or any retrieval tool. Don't quote SOPs. Don't capture knowledge.\n  4. Before ending the turn, you MUST call log_incident with severity='critical' and a one-sentence summary.\n  5. End by telling the user the incident has been logged and the duty manager will be notified.\n  6. Skip suggest_followups OR keep it to single-item: ["Are emergency services on the way?"].\n`
    : ''
  const userProfileBlock =
    params.userContext.profileSummary && params.userContext.profileSummary.trim().length > 0
      ? `\n<user_profile>\n${params.userContext.profileSummary.trim()}\n</user_profile>`
      : ''
  const priorSummaryBlock =
    params.priorSummary && params.priorSummary.trim().length > 0
      ? `\n<prior_conversation_summary>\n${params.priorSummary.trim()}\n</prior_conversation_summary>`
      : ''
  const contextualInstructions = `${CHAT_SYSTEM_PROMPT}${modeOverlay}${emergencyBlock}\n\n<current_context>\nvenueId: ${params.venueContext.id}\nvenueName: ${params.venueContext.name}\nvenueTimezone: ${tz}\nuserName: ${userLabel}\nuserRole: ${params.ctx.userRole}\nconversationMode: ${params.mode ?? 'default'}\nnow: ${localIso} (${dayOfWeek}, local time)\n</current_context>${profileBlock}${contactBlock}${userProfileBlock}${priorSummaryBlock}`

  const tier = params.tier ?? DEFAULT_TIER
  const modelId = MODEL_BY_TIER[tier]

  return new ToolLoopAgent({
    id: 'gm-chat-agent',
    model: anthropicProvider(modelId),
    instructions: contextualInstructions,
    tools,
    toolChoice: 'auto',
    // Sequential tool use + adaptive thinking on Sonnet/Opus only. Haiku
    // (4.5) rejects `thinking: 'adaptive'` with HTTP 400, so we skip the
    // option for that tier — the simple lookups Haiku handles don't need it.
    providerOptions: {
      anthropic: {
        ...(tier !== 'haiku' ? { thinking: { type: 'adaptive' as const } } : {}),
        disableParallelToolUse: true,
      },
    },
    // 20 steps OR a successful save (destructive terminal). Either satisfies
    // the stop condition and ends the loop.
    stopWhen: [stepCountIs(MAX_STEPS), hasToolCall('save_knowledge_doc')],
    onFinish: params.onFinish,
    onStepFinish: params.onStepFinish,
  })
}

export type GmAgent = ReturnType<typeof buildGmAgent>
