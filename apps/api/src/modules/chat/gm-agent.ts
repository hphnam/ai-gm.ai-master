import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import {
  hasToolCall,
  type OnFinishEvent,
  type SystemModelMessage,
  stepCountIs,
  ToolLoopAgent,
  type ToolSet,
} from 'ai'
import { IntegrationRegistry } from '../integrations/integration-registry'
import { buildAiSdkTools } from './ai-sdk-tools'
import { CHAT_SYSTEM_PROMPT, CONVERSATION_MODE_OVERLAYS } from './system-prompt'
import type { DispatchContext } from './tool-dispatcher'
import { ToolDispatcher } from './tool-dispatcher'

// Plan 01-03 — Anthropic prompt-cache wiring via AI SDK 6.x ToolLoopAgent.
// Source: https://platform.claude.com/docs/en/build-with-claude/prompt-caching · verified 2026-04-28
// Source: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic · verified 2026-04-28
//
// Anthropic semantic: cache_control on a block caches `tools + system + messages`
// (in that order) UP TO AND INCLUDING that block. So marker on the FIRST stable
// system message caches `[tools + stable_system]` as one prefix; subsequent
// dynamic system content + user messages stay outside the cache. Stable comes
// FIRST (so the cached prefix is byte-stable across turns); dynamic comes
// AFTER unmarked (so per-turn variation never breaks the cached prefix).
const SYSTEM_CACHE_CONTROL = { type: 'ephemeral' as const }

export type AgentMode = 'default' | 'incident' | 'handover'

const MODEL_ID = 'claude-sonnet-4-6'

// Loop budget. 8 keeps the agent decisive — a real employee answers in
// 1-4 tool calls; 8 is generous headroom. After step 5, prepareStep below
// switches toolChoice to 'none' so the model MUST finalise.
const MAX_STEPS = 8
const FORCE_FINALISE_AFTER_STEP = 5

// Tools whose call ends the agent loop immediately (see stopWhen below). Each
// renders its own tool card in the UI, so the agent doesn't (and can't) emit a
// closing text turn — synthesizeTerminalToolReply provides the brief
// confirmation that becomes the persisted assistant message body.
export const TERMINAL_STOP_TOOLS = ['save_knowledge_doc', 'generate_report'] as const
type TerminalStopTool = (typeof TERMINAL_STOP_TOOLS)[number]

function isTerminalStopTool(name: string): name is TerminalStopTool {
  return (TERMINAL_STOP_TOOLS as readonly string[]).includes(name)
}

type TerminalToolLogEntry = {
  tool: string
  result: unknown
}

/**
 * Maps a completed terminal-stop tool call to a brief assistant confirmation.
 *
 * Why this exists: `stopWhen: hasToolCall(t)` halts the loop the instant the
 * tool resolves — there's no follow-up text turn, so `event.text` is empty.
 * Without this, the persisted assistant row falls through to the generic
 * "couldn't produce an answer" error fallback even though the report/save
 * actually succeeded and rendered its own tool card above.
 *
 * Returns null when the last call wasn't a terminal-stop tool (e.g. the loop
 * exited via MAX_STEPS), letting the caller fall through to its error path.
 */
export function synthesizeTerminalToolReply(
  toolCallLog: ReadonlyArray<TerminalToolLogEntry>,
): string | null {
  const last = toolCallLog[toolCallLog.length - 1]
  if (!last || !isTerminalStopTool(last.tool)) return null
  // Relies on the dispatcher's ToolResult<T> envelope (apps/api/src/types/tool-result.ts):
  // `{ ok: true, data }` on success, `{ ok: false, reason, detail? }` on failure.
  // A missing / malformed envelope is treated as failure — never as success.
  const result = last.result as { ok?: boolean } | null
  const succeeded = result?.ok === true
  switch (last.tool) {
    case 'generate_report':
      return succeeded
        ? "Report's ready — opened it above."
        : "I couldn't build that report — details are in the card above."
    case 'save_knowledge_doc':
      return succeeded
        ? 'Saved that to your knowledge base.'
        : "I couldn't save that — details are in the card above."
    default: {
      // Exhaustiveness guard: adding a new entry to TERMINAL_STOP_TOOLS without
      // a matching case here becomes a compile-time error rather than a silent
      // `undefined` return at runtime.
      const _exhaustive: never = last.tool
      return _exhaustive
    }
  }
}

/**
 * Builds the per-request GM agent. Tools are per-request because the dispatcher
 * closes over {orgId, userId, userRole} for tenant isolation, and we prefer
 * closure-based context over threading `experimental_context` through callers.
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

/// Working-memory snapshot of frequently-asked-about items, injected into the
/// stable system prompt so the agent answers most lookups without spending a
/// find_knowledge round-trip.
export type VenueSnapshot = {
  /// Top knowledge items (SOPs / Q&As) the model should know off the top of
  /// its head — title + 1-line summary + entityId for citation.
  topKnowledge?: Array<{ id: string; title: string; summary: string }>
  /// Recently-answered KB gaps (manager has confirmed answers to questions
  /// staff have asked). Surface as authoritative.
  recentlyAnswered?: Array<{ question: string; answer: string }>
  /// Tabular doc names the model should know exist (so it knows what
  /// query_document_table can search across).
  tabularDocs?: Array<{ id: string; title: string }>
  /// The doc tagged as the venue's org chart (docPurpose='org_chart'). Content
  /// is inlined (capped) so the agent can answer reporting/escalation questions
  /// without a separate retrieval round-trip.
  orgChartDoc?: { id: string; title: string; content: string }
}

export function buildGmAgent(params: {
  dispatcher: ToolDispatcher
  integrations: IntegrationRegistry
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
  /// Phase F — compact summary of older turns when the conversation has been
  /// truncated. Injected into prompt context so the agent retains continuity.
  priorSummary?: string | null
  /// Working-memory snapshot — top KB items + recently-answered gaps + tabular
  /// docs. Lets the agent answer lookups directly without a find_knowledge call.
  venueSnapshot?: VenueSnapshot | null
  /// Optional one-shot routing hint injected as a system block for THIS turn
  /// only — e.g. "this looks like a tabular query, call query_document_table
  /// first". Computed deterministically by chat.service.ts via cheap regex
  /// heuristics, so no extra LLM latency is paid to set it.
  routingHint?: string | null
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
  const tools: ToolSet = buildAiSdkTools(params.dispatcher, params.integrations, params.ctx)

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
    profileLines.length > 0 ? `\n<venue_profile>\n${profileLines.join('\n')}\n</venue_profile>` : ''

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

  const mode = params.mode ?? 'default'
  const modeOverlay = CONVERSATION_MODE_OVERLAYS[mode]
  const userProfileBlock =
    params.userContext.profileSummary && params.userContext.profileSummary.trim().length > 0
      ? `\n<user_profile>\n${params.userContext.profileSummary.trim()}\n</user_profile>`
      : ''
  const priorSummaryBlock =
    params.priorSummary && params.priorSummary.trim().length > 0
      ? `\n<prior_conversation_summary>\n${params.priorSummary.trim()}\n</prior_conversation_summary>`
      : ''

  const snapshot = params.venueSnapshot
  const snapshotLines: string[] = []
  if (snapshot?.topKnowledge && snapshot.topKnowledge.length > 0) {
    snapshotLines.push('top_knowledge:')
    for (const k of snapshot.topKnowledge) {
      snapshotLines.push(`  • ${k.title} — ${k.summary} [doc:${k.id}]`)
    }
  }
  if (snapshot?.recentlyAnswered && snapshot.recentlyAnswered.length > 0) {
    snapshotLines.push('recently_answered (manager-confirmed):')
    for (const a of snapshot.recentlyAnswered) {
      snapshotLines.push(`  Q: ${a.question}`)
      snapshotLines.push(`  A: ${a.answer}`)
    }
  }
  if (snapshot?.tabularDocs && snapshot.tabularDocs.length > 0) {
    snapshotLines.push('tabular_docs (queryable via query_document_table):')
    for (const d of snapshot.tabularDocs) {
      snapshotLines.push(`  • ${d.title} [doc:${d.id}]`)
    }
  }
  if (snapshot?.orgChartDoc) {
    snapshotLines.push(
      `org_chart [doc:${snapshot.orgChartDoc.id}] — ${snapshot.orgChartDoc.title}:`,
    )
    snapshotLines.push(snapshot.orgChartDoc.content)
  }
  const snapshotBlock =
    snapshotLines.length > 0
      ? `\n<venue_snapshot>\n${snapshotLines.join('\n')}\n</venue_snapshot>`
      : ''

  // Plan 01-03 — split system message into stable (cache-marked) + dynamic (no marker).
  // Stable goes FIRST so the cached prefix `[tools + stable_system]` is byte-stable
  // across turns. Per-turn dynamic context comes AFTER, unmarked, so it never breaks
  // the cache. See SYSTEM_CACHE_CONTROL comment for Anthropic semantic citation.
  const stableSystemBody = `${CHAT_SYSTEM_PROMPT}${modeOverlay}`
  const routingHintBlock =
    params.routingHint && params.routingHint.trim().length > 0
      ? `\n<routing_hint>\n${params.routingHint.trim()}\n</routing_hint>`
      : ''
  const dynamicSystemBody = [
    `\n\n<current_context>\nvenueId: ${params.venueContext.id}\nvenueName: ${params.venueContext.name}\nvenueTimezone: ${tz}\nuserName: ${userLabel}\nuserRole: ${params.ctx.userRole}\nconversationMode: ${mode}\nnow: ${localIso} (${dayOfWeek}, local time)\n</current_context>`,
    routingHintBlock,
    snapshotBlock,
    profileBlock,
    contactBlock,
    userProfileBlock,
    priorSummaryBlock,
  ]
    .filter((s) => s && s.length > 0)
    .join('')

  const systemMessages: SystemModelMessage[] = [
    {
      role: 'system',
      content: stableSystemBody,
      providerOptions: {
        anthropic: { cacheControl: SYSTEM_CACHE_CONTROL },
      },
    },
    ...(dynamicSystemBody.length > 0
      ? [{ role: 'system' as const, content: dynamicSystemBody }]
      : []),
  ]

  // Adaptive thinking only when it earns its latency: incident mode (model has
  // to plan a careful protocol). Default + handover are fast snap-answer paths.
  const wantsThinking = mode === 'incident'

  return new ToolLoopAgent({
    id: 'gm-chat-agent',
    model: anthropicProvider(MODEL_ID),
    instructions: systemMessages,
    tools,
    toolChoice: 'auto',
    providerOptions: {
      anthropic: {
        ...(wantsThinking ? { thinking: { type: 'adaptive' as const } } : {}),
      },
    },
    // After FORCE_FINALISE_AFTER_STEP tool steps, force the model to answer
    // with what it has — no more tool calls. This is the "don't stand there
    // for 20 seconds" guard: a real employee doesn't keep searching forever.
    prepareStep: async ({ stepNumber }) => {
      if (stepNumber >= FORCE_FINALISE_AFTER_STEP) {
        return { toolChoice: 'none' as const }
      }
      return {}
    },
    // Stop after MAX_STEPS, on a successful destructive save, or once a
    // report has been written. generate_report is a single-shot create — a
    // second call would orphan the first row, and the headless scheduled-
    // report path relies on first-wins capture in onStepFinish.
    stopWhen: [stepCountIs(MAX_STEPS), ...TERMINAL_STOP_TOOLS.map((t) => hasToolCall(t))],
    onFinish: params.onFinish,
    onStepFinish: params.onStepFinish,
  })
}

export type GmAgent = ReturnType<typeof buildGmAgent>

/**
 * Plan 01-03 audit-S1 — wire-level inspector for cache_control marker placement.
 *
 * Distinguishes "cache_control not wired" from "cache_control wired but TTL expired"
 * for ops debugging. Without this helper, both states surface as
 * `cache_read_input_tokens === 0` from the response — indistinguishable.
 *
 * Per Anthropic prompt-cache semantics, marking cache_control on the FIRST stable
 * system message caches the cumulative prefix `tools + stable_system` as one unit;
 * so toolsCacheControl is implied by systemCacheControl (single marker covers both).
 */
export function inspectAgentProviderOptions(messages: SystemModelMessage[]): {
  systemCacheControl: 'ephemeral' | null
  toolsCacheControl: 'ephemeral' | null
} {
  const stable = messages[0]
  const cc = (
    stable?.providerOptions?.anthropic as { cacheControl?: { type?: string } } | undefined
  )?.cacheControl
  const isEphemeral: 'ephemeral' | null = cc?.type === 'ephemeral' ? 'ephemeral' : null
  return { systemCacheControl: isEphemeral, toolsCacheControl: isEphemeral }
}

/**
 * Plan 01-03 — pure helper exposing the system-messages array buildGmAgent
 * constructs. Probes use this directly to assert cache_control marker placement
 * without instantiating the full agent (no Anthropic API key required, no model
 * dependency).
 *
 * Implementation note: this function intentionally duplicates the inline
 * `systemMessages` construction in buildGmAgent rather than factoring buildGmAgent
 * to use this helper internally. The duplication is intentional — buildGmAgent's
 * call site needs access to `params` for the dynamic context (timestamps, contacts);
 * factoring the helper to take all those would burden the helper's signature for
 * marginal DRY gain. APPLY-time decision: keep the small duplication for clarity.
 */
export function buildSystemMessagesForInspection(
  mode: AgentMode = 'default',
): SystemModelMessage[] {
  const stableSystemBody = `${CHAT_SYSTEM_PROMPT}${CONVERSATION_MODE_OVERLAYS[mode]}`
  return [
    {
      role: 'system',
      content: stableSystemBody,
      providerOptions: {
        anthropic: { cacheControl: SYSTEM_CACHE_CONTROL },
      },
    },
  ]
}
