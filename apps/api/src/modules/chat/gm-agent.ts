import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Logger } from '@nestjs/common'
import {
  generateObject,
  hasToolCall,
  jsonSchema,
  NoSuchToolError,
  type OnFinishEvent,
  type SystemModelMessage,
  stepCountIs,
  ToolLoopAgent,
  type ToolSet,
} from 'ai'
import {
  currencyCodeFor,
  currencySymbolFor,
  emergencyNumberFor,
  type OrganizationProfile,
} from '../../types'
import { IntegrationRegistry } from '../integrations/integration-registry'
import type { MemoryAction } from '../organization/agent-memory'
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

/// Defence-in-depth for free-text that flows into a system-prompt block. Strips
/// angle brackets (so a value can't forge a closing </block> or a fake <tag>)
/// and collapses newlines/tabs to spaces (so it can't open new prompt lines).
/// Profile authors are trusted org admins, but the data still shouldn't be able
/// to restructure the prompt.
function sanitizeForBlock(value: string): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
}

export type AgentMode = 'default' | 'incident' | 'handover'

const logger = new Logger('GmAgent')

const MODEL_ID = 'claude-sonnet-5'

// Loop budget. 8 keeps the agent decisive — a real employee answers in
// 1-4 tool calls; 8 is generous headroom. After step 5, prepareStep below
// injects a finalise instruction; stepCountIs(MAX_STEPS) is the hard stop.
const MAX_STEPS = 8
const FORCE_FINALISE_AFTER_STEP = 5

// Injected as an extra system message once the step budget is spent. We do NOT
// use toolChoice:'none' here: the Anthropic provider implements 'none' by
// removing the tools array entirely, and Anthropic 400s any request whose
// history contains tool_use/tool_result blocks without a tools param — which
// is guaranteed by this point in the loop.
const FORCE_FINALISE_INSTRUCTION =
  'You have used your tool budget for this turn. Do not call any more tools — compose your final answer now from the results you already have. If something could not be confirmed, say so plainly instead of guessing.'

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

/// Human-readable summary of one connected integration, for the <integrations>
/// prompt block. Built by IntegrationRegistry.describeActiveIntegrations.
export type ActiveIntegrationSummary = {
  provider: string
  label: string
  domain: string
  lastSyncedAt: Date | null
}

export function buildGmAgent(params: {
  dispatcher: ToolDispatcher
  integrations: IntegrationRegistry
  ctx: DispatchContext
  /// Conversation this turn belongs to — logged with per-turn token telemetry.
  conversationId?: string
  /// Turn abort signal — also cancels a repair re-ask if the client disconnects.
  abortSignal?: AbortSignal
  /// Provider ids the org has connected as active — scopes the integration
  /// tool surface so the model only sees tools for this org's integrations.
  activeProviderIds: ReadonlySet<string>
  /// Per-org business profile (type, description, goals, constraints, region).
  /// Drives the persona, currency, and emergency number so the agent adapts
  /// per-business instead of assuming UK hospitality. Empty profile is fine —
  /// the prompt falls back to hospitality + GB defaults.
  businessProfile?: OrganizationProfile | null
  /// Active integrations described by vendor + domain + freshness, for the
  /// <integrations> block. Empty array → the agent is told nothing is
  /// connected and to route to the knowledge base for live-data questions.
  integrationsSummary?: ActiveIntegrationSummary[] | null
  /// When provided, the org-scoped Anthropic memory tool is enabled. The
  /// closure persists the model's memory commands to this org's store. Omit
  /// (headless report generation) to run without memory.
  memoryExecute?: ((action: MemoryAction) => Promise<string>) | null
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
  const baseTools = buildAiSdkTools(
    params.dispatcher,
    params.integrations,
    params.ctx,
    params.activeProviderIds,
  )
  // Org-scoped persistent memory (Anthropic provider-defined tool). Enabled only
  // when an execute closure is passed (interactive chat) — the closure routes
  // every command through this org's store. Headless report generation omits it.
  const memoryExecute = params.memoryExecute
  const tools: ToolSet = memoryExecute
    ? {
        ...baseTools,
        memory: anthropicProvider.tools.memory_20250818({
          execute: async (action) => memoryExecute(action as MemoryAction),
        }),
      }
    : baseTools

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

  // Per-business operating context — currency + local emergency number, derived
  // from the org profile (defaults: GB / £ / 999, so an org with no profile set
  // behaves exactly as before). Always emitted: the prompt references it for
  // money formatting and incident mode.
  const profile = params.businessProfile ?? null
  const currencyCode = currencyCodeFor(profile)
  const currencySymbol = currencySymbolFor(currencyCode)
  const emergencyNumber = emergencyNumberFor(profile?.country)
  const operatingContextBlock = `\n<operating_context>\ncurrency: ${currencyCode} (${currencySymbol})\nemergencyNumber: ${emergencyNumber}\n</operating_context>`

  // Business profile — who this org is, in their own words. Drives persona and
  // domain assumptions. Omitted entirely when the org hasn't filled anything,
  // so the base prompt's hospitality fallback applies.
  const profileBusinessLines: string[] = []
  if (profile?.businessType)
    profileBusinessLines.push(`type: ${sanitizeForBlock(profile.businessType)}`)
  if (profile?.description)
    profileBusinessLines.push(`about: ${sanitizeForBlock(profile.description)}`)
  if (profile?.goals && profile.goals.length > 0)
    profileBusinessLines.push(`goals: ${profile.goals.map(sanitizeForBlock).join('; ')}`)
  if (profile?.constraints)
    profileBusinessLines.push(`constraints: ${sanitizeForBlock(profile.constraints)}`)
  const businessProfileBlock =
    profileBusinessLines.length > 0
      ? `\n<business_profile>\n${profileBusinessLines.join('\n')}\n</business_profile>`
      : ''

  // Integrations — what live-data sources are connected, by name + domain +
  // freshness. When empty, tell the agent explicitly so it routes live-data
  // questions to the KB instead of implying a POS exists.
  const integrationsList = params.integrationsSummary ?? []
  const integrationsBlock =
    integrationsList.length > 0
      ? `\n<integrations>\nConnected live-data sources (your ${integrationsList
          .map((i) => i.domain)
          .join('/')} tools read from these):\n${integrationsList
          .map(
            (i) =>
              `  • ${i.label} (${i.domain})${
                i.lastSyncedAt ? ` — last used ${i.lastSyncedAt.toISOString()}` : ''
              }`,
          )
          .join('\n')}\n</integrations>`
      : `\n<integrations>\nNo external integrations are connected. You have no live POS/accounting/CRM tools this org — for any live-numbers question (sales, COGS, stock, labour) say plainly that nothing is connected and point the user to Settings → Integrations, then offer the knowledge-base / manual route.\n</integrations>`

  // Memory guidance — only when the memory tool is wired (interactive chat).
  // Kept in the dynamic block so headless paths (no memory tool) never reference
  // a tool that isn't in their set, and so the cached prefix stays unchanged.
  const memoryBlock = memoryExecute
    ? `\n<memory>\nYou have a private, persistent memory for THIS business via the memory tool (a /memories file directory that survives across conversations). It is YOUR working scratchpad — a SEPARATE, lower-authority layer from gm-ai's own stores. Keep them from clashing:
  • PRECEDENCE (never let memory override the real sources): the knowledge base (SOPs/docs/Q&As), live integration tools, <venue_snapshot>/<venue_contacts>/<venue_profile>, and an owner's explicit instruction ALWAYS win over memory. If a memory contradicts any of them, trust the source and fix the stale memory (str_replace/delete). Memory NEVER decides whether you can do something and never substitutes for a find_knowledge or tool call.
  • WHAT BELONGS WHERE — do not duplicate across stores:
      – /memories → durable, business-level operating preferences + small learned facts NOT worth a formal SOP ("owner prefers terse replies", "we price beer to ~68% GP", "Friday is always short-staffed").
      – save_knowledge_doc → shareable SOPs / policies / Q&As other staff rely on. If a fact is important or shareable enough to cite, it belongs in the KB, NOT memory.
      – create_task → future actions. leave_note_for_user → messages to a person.
  • Memory is NOT a citation source — never emit [doc:…] for it; only KB docs get cited.
  • Check /memories when a question may lean on remembered preferences; save only when the user states a lasting preference/fact not already captured elsewhere. Keep entries short; prune outdated ones. NEVER store secrets, card/bank numbers, passwords, or personal data.\n</memory>`
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
    businessProfileBlock,
    operatingContextBlock,
    integrationsBlock,
    memoryBlock,
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

  // Adaptive thinking on every turn. On Sonnet 5 this is effectively
  // unavoidable — the @ai-sdk/anthropic provider maps thinking:{type:'disabled'}
  // to OMITTING the param, and an omitted thinking param on Sonnet 5 runs
  // adaptive by default — so a 'disabled' branch would be a misleading no-op.
  // We embrace it: the product bar is accuracy over latency, and adaptive
  // self-moderates (trivial lookups think little), so snap answers stay fast
  // while incident/reasoning turns get the depth they need. `display` stays at
  // the provider default ('omitted') — we don't surface reasoning to the user.
  return new ToolLoopAgent({
    id: 'gm-chat-agent',
    model: anthropicProvider(MODEL_ID),
    instructions: systemMessages,
    tools,
    toolChoice: 'auto',
    providerOptions: {
      anthropic: {
        thinking: { type: 'adaptive' as const },
      },
    },
    // After FORCE_FINALISE_AFTER_STEP tool steps, tell the model to answer
    // with what it has. This is the "don't stand there for 20 seconds" guard:
    // a real employee doesn't keep searching forever. The nudge is appended
    // AFTER the dynamic system message so the cached stable prefix is intact.
    prepareStep: async ({ stepNumber }) => {
      if (stepNumber >= FORCE_FINALISE_AFTER_STEP) {
        return {
          instructions: [
            ...systemMessages,
            { role: 'system' as const, content: FORCE_FINALISE_INSTRUCTION },
          ],
        }
      }
      return {}
    },
    // Stop after MAX_STEPS, on a successful destructive save, or once a
    // report has been written. generate_report is a single-shot create — a
    // second call would orphan the first row, and the headless scheduled-
    // report path relies on first-wins capture in onStepFinish.
    stopWhen: [stepCountIs(MAX_STEPS), ...TERMINAL_STOP_TOOLS.map((t) => hasToolCall(t))],
    // Recover a malformed tool call instead of failing the whole turn: re-ask
    // the model for arguments that satisfy the tool's own JSON schema. Only
    // fires on a parse/validation failure (rare); an unknown-tool call can't be
    // repaired, so bail and let the loop surface it.
    experimental_repairToolCall: async ({ toolCall, inputSchema, error }) => {
      if (NoSuchToolError.isInstance(error)) return null
      const schema = await inputSchema({ toolName: toolCall.toolName })
      const { object } = await generateObject({
        model: anthropicProvider(MODEL_ID),
        schema: jsonSchema(schema),
        abortSignal: params.abortSignal,
        prompt: [
          `The tool "${toolCall.toolName}" was called with arguments that failed its schema.`,
          `Invalid arguments: ${toolCall.input}`,
          `Error: ${error.message}`,
          'Return corrected arguments that satisfy the schema.',
        ].join('\n'),
      })
      return { ...toolCall, input: JSON.stringify(object) }
    },
    onFinish: async (event) => {
      const usage = event.usage
      logger.log(
        JSON.stringify({
          event: 'chat.turn_usage',
          conversationId: params.conversationId,
          orgId: params.ctx.orgId,
          userRole: params.ctx.userRole,
          model: MODEL_ID,
          steps: event.steps.length,
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
          reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? 0,
          cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
          cacheWriteTokens: usage.inputTokenDetails?.cacheWriteTokens ?? 0,
        }),
      )
      await params.onFinish?.(event)
    },
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
