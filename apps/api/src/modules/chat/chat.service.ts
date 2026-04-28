import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@gm-ai/database'
import {
  type ImagePart,
  type ModelMessage,
  type StreamTextResult,
  type TextPart,
  type ToolSet,
} from 'ai'
import { VenueProfileSchema } from '@gm-ai/types'
import { AdaptationService } from '../adaptation/adaptation.service'
import { ToolDispatcher, type DispatchContext } from './tool-dispatcher'
import {
  buildGmAgent,
  type AgentMode,
  type VenueContactSummary,
  type VenueProfileContext,
} from './gm-agent'
import {
  ConversationCompactorService,
  type CompactableMessage,
} from './conversation-compactor.service'
import { ConversationModeService } from './conversation-mode.service'
import { detectEmergency } from './emergency-detector'
import { pickTier } from './tier-router'
import { UserProfileService } from './user-profile.service'

const MAX_USER_MESSAGE_CHARS = 8000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SendMessageInputSchema = z.object({
  conversationId: z.string().regex(UUID_RE, 'invalid uuid').optional(),
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
  userMessage: z.string().min(1).max(MAX_USER_MESSAGE_CHARS),
  // 03-03 Task 3: optional image attachment for multimodal inbound (WhatsApp).
  attachment: z
    .object({
      mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
      base64: z.string().min(1),
      // audit S2: channel-specific source reference (e.g. Infobip inbound messageId) for forensics.
      sourceRef: z.string().min(1).max(64).optional(),
    })
    .optional(),
})

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>

export type ToolCallLogEntry = {
  round: number
  toolUseId: string
  tool: string
  input: unknown
  result: unknown
}

export type SendMessageResult = {
  conversationId: string
  assistantMessage: { id: string; content: string; followUps: string[] }
  toolCallLog: ToolCallLogEntry[]
  retrievedItemIds: string[]
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(
    private readonly dispatcher: ToolDispatcher,
    private readonly adaptation: AdaptationService,
    private readonly modeClassifier: ConversationModeService,
    private readonly userProfile: UserProfileService,
    private readonly compactor: ConversationCompactorService,
  ) {}

  /// Phase F — fetch (and lazily refresh) the user's GM profile summary for
  /// injection into prompt context. Soft-fails to null so chat never blocks.
  private async getUserProfileSummary(
    userId: string,
    orgId: string,
  ): Promise<string | null> {
    try {
      const profile = await this.userProfile.getOrRefresh(userId, orgId)
      if (!profile) return null
      const parts: string[] = []
      if (profile.summary) parts.push(profile.summary)
      if (profile.likelyShiftRole && profile.likelyShiftRole !== 'unknown') {
        parts.push(`likely role: ${profile.likelyShiftRole}`)
      }
      if (profile.commonTopics.length > 0) {
        parts.push(`common topics: ${profile.commonTopics.join(', ')}`)
      }
      if (profile.languageHints) parts.push(`style: ${profile.languageHints}`)
      return parts.length > 0 ? parts.join(' · ') : null
    } catch {
      return null
    }
  }

  /// Phase E — resolve the conversation mode. Persisted on ChatConversation.
  /// Hot path: stored mode if non-default, else regex-only sync classifier.
  /// Haiku fallback runs in the background (fire-and-forget) — its result
  /// persists for the NEXT turn so we never block a user-perceived send.
  private async resolveConversationMode(
    conversationId: string,
    firstUserMessage: string | null,
  ): Promise<AgentMode> {
    const existing = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { mode: true },
    })
    const stored = existing?.mode
    if (stored && stored !== 'default') {
      return stored as AgentMode
    }
    if (!firstUserMessage) return (stored as AgentMode) ?? 'default'

    // Fast path: regex-only.
    const syncMatch = this.modeClassifier.classifySync(firstUserMessage)
    if (syncMatch && syncMatch !== 'default') {
      await prisma.chatConversation
        .update({ where: { id: conversationId }, data: { mode: syncMatch } })
        .catch(() => undefined)
      return syncMatch
    }

    // No sync match → default for this turn, but fire Haiku classification in
    // the background so the persisted mode is correct on subsequent turns.
    void this.modeClassifier
      .classify(firstUserMessage)
      .then((classified) => {
        if (classified === 'default') return
        return prisma.chatConversation
          .update({ where: { id: conversationId }, data: { mode: classified } })
          .catch(() => undefined)
      })
      .catch(() => undefined)
    return 'default'
  }

  /// Phase D — hydrate venue profile + emergency-flagged contacts so the
  /// agent has spatial / safety context on every turn without spending a
  /// tool call. Cheap (one Postgres roundtrip per send).
  private async buildVenueContext(venue: {
    id: string
    name: string
    timezone: string
    address: string | null
    type: string
    profile: unknown
  }): Promise<{
    id: string
    name: string
    timezone: string
    address: string | null
    type: string
    profile: VenueProfileContext | null
    contacts: VenueContactSummary[]
  }> {
    const parsed = VenueProfileSchema.safeParse(venue.profile ?? {})
    const profile: VenueProfileContext | null = parsed.success
      ? {
          layoutNotes: parsed.data.layoutNotes ?? null,
          fireEscapes: parsed.data.fireEscapes ?? null,
          firstAidPoints: parsed.data.firstAidPoints ?? null,
          keySafePolicy: parsed.data.keySafePolicy ?? null,
          alarmPolicy: parsed.data.alarmPolicy ?? null,
          openingHours: parsed.data.openingHours ?? null,
          what3words: parsed.data.what3words ?? null,
          accessibilityNotes: parsed.data.accessibilityNotes ?? null,
          deliveryNotes: parsed.data.deliveryNotes ?? null,
        }
      : null

    const contactRows = await prisma.venueContact.findMany({
      where: { venueId: venue.id },
      select: {
        name: true,
        role: true,
        phone: true,
        email: true,
        isEmergencyContact: true,
      },
      // Cap at 12 — emergency contacts first, then the rest by role.
      orderBy: [{ isEmergencyContact: 'desc' }, { role: 'asc' }, { name: 'asc' }],
      take: 12,
    })

    return {
      id: venue.id,
      name: venue.name,
      timezone: venue.timezone,
      address: venue.address,
      type: venue.type,
      profile,
      contacts: contactRows,
    }
  }

  async sendMessage(
    rawInput: SendMessageInput,
    orgId: string,
    userId: string,
    userRole: string = 'staff',
    userIdentity: { name: string | null; email: string } = { name: null, email: '' },
  ): Promise<SendMessageResult> {
    const parsed = SendMessageInputSchema.safeParse(rawInput)
    if (!parsed.success) {
      throw new Error(
        `invalid sendMessage input: ${parsed.error.issues[0]?.message ?? 'zod error'}`,
      )
    }
    const input = parsed.data

    // 03-02: test-mode latency injection — opt-in, production-forbidden by assertAuthEnv.
    const probeDelayMs = Number(process.env.PROBE_CHAT_SERVICE_DELAY_MS ?? '0')
    if (probeDelayMs > 0) {
      await new Promise<void>((r) => setTimeout(r, probeDelayMs))
    }

    // 03-02 audit-added S1: test-mode stub — skip Claude entirely, return deterministic
    // assistant message. Production-forbidden via assertAuthEnv.
    if (process.env.PROBE_CHAT_SERVICE_STUB === 'true') {
      const stubVenue = await prisma.venue.findFirst({
        where: { id: input.venueId, organizationId: orgId },
        select: { id: true },
      })
      if (!stubVenue) throw new Error(`venue ${input.venueId} not found in org ${orgId}`)
      const stubConversationId =
        input.conversationId ??
        (
          await prisma.chatConversation.create({
            data: { venueId: stubVenue.id, userId, channel: 'whatsapp' },
            select: { id: true },
          })
        ).id
      // 03-03 Task 3: stub branch persists the SAME placeholder shape as the real
      // branch when an attachment is present, so probe assertions can verify
      // the persistence contract without a Claude call.
      const stubUserContent = input.attachment
        ? (() => {
            const byteSize = Buffer.from(input.attachment!.base64, 'base64').length
            const sidSuffix = input.attachment!.sourceRef
              ? `, sid:${input.attachment!.sourceRef}`
              : ''
            return `${input.userMessage}\n[image: ${input.attachment!.mediaType}, ${byteSize}B${sidSuffix}]`
          })()
        : input.userMessage
      await prisma.chatMessage.create({
        data: { conversationId: stubConversationId, role: 'user', content: stubUserContent },
      })
      const stubAssistant = await prisma.chatMessage.create({
        data: {
          conversationId: stubConversationId,
          role: 'assistant',
          content: '[PROBE_STUB_REPLY] Stubbed assistant response for probe testing.',
          followUps: [],
        },
        select: { id: true, content: true, followUps: true },
      })
      return {
        conversationId: stubConversationId,
        assistantMessage: stubAssistant,
        toolCallLog: [],
        retrievedItemIds: [],
      }
    }

    const venue = await prisma.venue.findFirst({
      where: { id: input.venueId, organizationId: orgId },
      select: {
        id: true,
        name: true,
        timezone: true,
        address: true,
        type: true,
        profile: true,
      },
    })
    if (!venue) throw new Error(`venue ${input.venueId} not found`)

    if (input.conversationId) {
      const existing = await prisma.chatConversation.findUnique({
        where: { id: input.conversationId },
        select: { id: true, venueId: true },
      })
      if (!existing) throw new Error(`conversation ${input.conversationId} not found`)
      if (existing.venueId !== venue.id) {
        throw new Error(
          `conversation ${input.conversationId} does not belong to venue ${venue.id}`,
        )
      }
    }

    const conversationId =
      input.conversationId ??
      (
        await prisma.chatConversation.create({
          data: { venueId: input.venueId, channel: 'web', userId },
          select: { id: true },
        })
      ).id

    // 03-03 Task 3: when an image attachment is present, persist a placeholder into
    // ChatMessage.content (schema has no image column) so conversation history shows
    // "user sent image" without storing base64. Placeholder includes sourceRef
    // (Infobip inbound messageId in the WhatsApp flow — previously Twilio MessageSid) for forensic correlation (audit S2).
    const userContent = input.attachment
      ? (() => {
          const byteSize = Buffer.from(input.attachment.base64, 'base64').length
          const sidSuffix = input.attachment.sourceRef
            ? `, sid:${input.attachment.sourceRef}`
            : ''
          return `${input.userMessage}\n[image: ${input.attachment.mediaType}, ${byteSize}B${sidSuffix}]`
        })()
      : input.userMessage

    await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: userContent,
        retrievedItemIds: [],
        toolCallLog: [],
      },
    })

    const historyRaw = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, role: true, content: true },
    })
    // Anthropic rejects empty text blocks with 400. Aborted or failed prior
    // turns can leave assistant rows with empty content — filter them out.
    const history: CompactableMessage[] = historyRaw
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'assistant' : ('user' as const),
        content: m.content,
      }))

    const compaction = await this.compactor.compactIfNeeded(conversationId, history)
    const messages: ModelMessage[] = compaction.recent.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // When an image attachment is present, replace the last user message with
    // a multi-part array (text + AI SDK ImagePart) so the model sees the image
    // rather than the DB placeholder.
    if (input.attachment && messages.length > 0) {
      const last = messages[messages.length - 1]
      if (last.role === 'user') {
        const parts: Array<TextPart | ImagePart> = [
          { type: 'text', text: input.userMessage || 'User sent an image.' },
          {
            type: 'image',
            image: input.attachment.base64,
            mediaType: input.attachment.mediaType,
          },
        ]
        last.content = parts
      }
    }

    const toolCallLog: ToolCallLogEntry[] = []
    const retrievedItemIds = new Set<string>()
    let followUps: string[] = []
    let round = 0
    const startedAt = Date.now()

    const agentMode = await this.resolveConversationMode(conversationId, input.userMessage)
    const tierForLog = pickTier(input.userMessage, agentMode)

    const agent = buildGmAgent({
      dispatcher: this.dispatcher,
      ctx: { orgId, userId, userRole },
      venueContext: await this.buildVenueContext(venue),
      mode: agentMode,
      tier: tierForLog,
      priorSummary: compaction.summary,
      emergencyAdvisory: (() => {
        const e = detectEmergency(input.userMessage)
        return e.triggered ? { matched: e.matched ?? '' } : null
      })(),
      userContext: {
        name: userIdentity.name,
        email: userIdentity.email,
        profileSummary: await this.getUserProfileSummary(userId, orgId),
      },
      onStepFinish: (step) => {
        round++
        for (const call of step.toolCalls ?? []) {
          toolCallLog.push({
            round,
            toolUseId: call.toolCallId,
            tool: call.toolName,
            input: call.input ?? null,
            result: null,
          })
        }
        for (const tr of step.toolResults ?? []) {
          const entry = toolCallLog.find(
            (l) => l.toolUseId === tr.toolCallId && l.result === null,
          )
          if (entry) entry.result = tr.output

          if (tr.toolName === 'find_knowledge') {
            const output = tr.output as { ok?: boolean; data?: unknown } | null
            if (output?.ok && Array.isArray(output.data)) {
              for (const hit of output.data as Array<{ id?: string }>) {
                if (hit?.id) retrievedItemIds.add(hit.id)
              }
            }
          }

          if (tr.toolName === 'suggest_followups') {
            const output = tr.output as {
              ok?: boolean
              data?: { followUps?: string[] }
            } | null
            if (output?.ok && Array.isArray(output.data?.followUps)) {
              followUps = output.data!.followUps!.slice(0, 3)
            }
          }
        }
      },
    })

    let finalText = ''
    let partsJson: object | null = null
    let reasoningText: string | undefined

    try {
      const result = await agent.generate({ messages })
      finalText = (result.text ?? '').trim()
      reasoningText = result.reasoningText ?? undefined
      const lastAssistant = [...result.response.messages]
        .reverse()
        .find((m) => m.role === 'assistant')
      if (lastAssistant) partsJson = lastAssistant.content as unknown as object

      // Plan 01-03 audit-AC4 — observe Anthropic prompt-cache hit on the
      // turn's response.usage. AI SDK 6.x unified usage shape:
      // result.usage.inputTokenDetails.{cacheReadTokens,cacheWriteTokens}.
      // PII boundary: counts + tier + conversationIdHash only — no message
      // body, no retrieved content. `tier` is operator-only observability.
      try {
        const usage = result.usage as {
          inputTokens?: number
          outputTokens?: number
          inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number }
        } | undefined
        const cacheRead = usage?.inputTokenDetails?.cacheReadTokens
        const cacheWrite = usage?.inputTokenDetails?.cacheWriteTokens
        if (cacheRead !== undefined || cacheWrite !== undefined) {
          const conversationIdHash = createHash('sha256')
            .update(conversationId)
            .digest('hex')
            .slice(0, 8)
          this.logger.log(
            JSON.stringify({
              event: 'chat.cache_observed',
              cache_read_input_tokens: cacheRead ?? 0,
              cache_creation_input_tokens: cacheWrite ?? 0,
              input_tokens: usage?.inputTokens ?? 0,
              output_tokens: usage?.outputTokens ?? 0,
              tier: tierForLog,
              conversationIdHash,
            }),
          )
        }
      } catch {
        // Defensive: usage shape variance (e.g. PROBE_CHAT_SERVICE_STUB) — skip silently.
      }

      if (!finalText) {
        this.logger.warn(
          JSON.stringify({
            event: 'chat.empty_assistant_text',
            conversationId,
            finishReason: result.finishReason,
          }),
        )
        finalText = "I couldn't produce an answer — please retry or rephrase."
      }
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          event: 'chat.agent_error',
          conversationId,
          rounds_completed: round,
          message: (err as Error).message ?? 'unknown agent error',
        }),
      )
      finalText = 'I hit an error calling the model — please retry.'
    }

    this.logger.log(
      JSON.stringify({
        event: 'chat.sendmessage_finished',
        conversationId,
        rounds: round,
        latency_ms: Date.now() - startedAt,
        followUpCount: followUps.length,
        hasReasoning: Boolean(reasoningText),
      }),
    )

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: finalText,
        retrievedItemIds: Array.from(retrievedItemIds),
        toolCallLog: toolCallLog as unknown as object,
        followUps,
        reasoning: reasoningText ?? null,
        parts: (partsJson ?? undefined) as object | undefined,
      },
      select: { id: true, content: true, followUps: true },
    })

    await this.adaptation.captureRetrievalOutcome({
      assistantMessageId: assistantMessage.id,
      toolCallLog,
      retrievedItemIds: Array.from(retrievedItemIds),
    })

    return {
      conversationId,
      assistantMessage,
      toolCallLog,
      retrievedItemIds: Array.from(retrievedItemIds),
    }
  }

  async deleteConversation(
    conversationId: string,
    orgId: string,
    userId: string,
    venueId: string,
  ): Promise<void> {
    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        venueId: true,
        userId: true,
        venue: { select: { organizationId: true } },
      },
    })
    if (
      !conv ||
      conv.venueId !== venueId ||
      conv.venue.organizationId !== orgId ||
      (conv.userId !== null && conv.userId !== userId)
    ) {
      throw new Error(`conversation ${conversationId} not found`)
    }
    await prisma.chatConversation.delete({ where: { id: conversationId } })
  }

  async listRecent(
    orgId: string,
    userId: string,
    venueId: string | undefined,
    limit = 40,
  ): Promise<
    Array<{
      id: string
      venueId: string
      venueName: string
      lastMessageAt: string
      preview: string | null
    }>
  > {
    const safeLimit = Math.max(1, Math.min(100, limit))
    const rows = await prisma.chatConversation.findMany({
      where: {
        userId,
        venue: { organizationId: orgId },
        ...(venueId ? { venueId } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: safeLimit,
      select: {
        id: true,
        venueId: true,
        updatedAt: true,
        venue: { select: { name: true } },
        messages: {
          where: { role: 'user' },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: 1,
          select: { content: true },
        },
      },
    })
    return rows.map((r) => ({
      id: r.id,
      venueId: r.venueId,
      venueName: r.venue.name,
      lastMessageAt: r.updatedAt.toISOString(),
      preview: r.messages[0]?.content ? truncate(r.messages[0].content, 80) : null,
    }))
  }

  // ─────────────────────────────────────────────────────────────────
  // Streaming path — Vercel AI SDK streamText + tool loop.
  // Used by the web /chat UI; WhatsApp stays on sendMessage() above.
  // ─────────────────────────────────────────────────────────────────
  async prepareStream(params: {
    venueId: string
    conversationId: string | undefined
    userText: string
    orgId: string
    userId: string
    userRole: string
    userIdentity?: { name: string | null; email: string }
    abortSignal?: AbortSignal
  }): Promise<{
    conversationId: string
    assistantMessageId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: StreamTextResult<ToolSet, any>
  }> {
    const venue = await prisma.venue.findFirst({
      where: { id: params.venueId, organizationId: params.orgId },
      select: {
        id: true,
        name: true,
        timezone: true,
        address: true,
        type: true,
        profile: true,
      },
    })
    if (!venue) throw new Error(`venue ${params.venueId} not found`)

    // Client-first conversation ids: the web UI generates the UUID the instant
    // the user clicks "New chat" so the URL and state are stable from frame 0.
    // If the id exists, we validate ownership; if not, we create with that id
    // (idempotent upsert keyed on the UUID).
    const conversationId = params.conversationId ?? crypto.randomUUID()
    const existingConv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, venueId: true, userId: true },
    })
    this.logger.log(
      JSON.stringify({
        event: 'chat.prepare_stream.upsert',
        conversationId,
        providedByClient: params.conversationId != null,
        existed: existingConv != null,
      }),
    )
    if (existingConv) {
      if (existingConv.venueId !== venue.id) {
        throw new Error(
          `conversation ${conversationId} does not belong to venue ${venue.id}`,
        )
      }
      if (existingConv.userId && existingConv.userId !== params.userId) {
        throw new Error(`conversation ${conversationId} belongs to another user`)
      }
    } else {
      await prisma.chatConversation.create({
        data: {
          id: conversationId,
          venueId: venue.id,
          channel: 'web',
          userId: params.userId,
        },
      })
    }

    // Persist user message BEFORE streaming starts so it survives disconnects.
    await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: params.userText,
        retrievedItemIds: [],
        toolCallLog: [],
      },
    })

    // Pre-allocate the assistant message UUID so the streamed UIMessage.id on
    // the client matches the persisted DB row. Without this the AI SDK assigns
    // its own nanoid, which then fails UUID validation on /feedback.
    const assistantMessageId = crypto.randomUUID()

    // Load full history (includes the just-persisted user message) and convert
    // to AI SDK ModelMessage[]. We drop tool-call reconstruction — prior turns
    // are shown to the model as plain text (same as the non-streaming path).
    const streamHistoryRaw = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, role: true, content: true },
    })
    // Anthropic rejects empty text blocks with 400 ("text content blocks must
    // be non-empty"). Aborted or failed prior turns can leave assistant rows
    // with empty content — filter them out before sending to the model.
    const streamHistory: CompactableMessage[] = streamHistoryRaw
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'assistant' : ('user' as const),
        content: m.content,
      }))
    const streamCompaction = await this.compactor.compactIfNeeded(
      conversationId,
      streamHistory,
    )
    const modelMessages: ModelMessage[] = streamCompaction.recent.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const ctx: DispatchContext = {
      orgId: params.orgId,
      userId: params.userId,
      userRole: params.userRole,
    }

    // First user message in this thread for mode classification (if not already set).
    const firstUserMessage =
      modelMessages.find((m) => m.role === 'user' && typeof m.content === 'string')?.content ??
      null
    const agentMode = await this.resolveConversationMode(
      conversationId,
      typeof firstUserMessage === 'string' ? firstUserMessage : null,
    )

    const retrievedItemIds = new Set<string>()
    // Captured follow-ups from the terminal `suggest_followups` tool. The
    // tool's execute() returns the input so we can observe it here.
    let followUps: string[] = []
    // Full tool call log for persistence + adaptation loop.
    const toolCallLog: ToolCallLogEntry[] = []
    let round = 0
    const startedAt = Date.now()

    // Agentic primary: ToolLoopAgent with adaptive reasoning + sequential
    // tool use + terminal suggest_followups tool. Stop conditions: 20 steps or
    // a successful save_knowledge_doc (destructive terminal).
    const agent = buildGmAgent({
      dispatcher: this.dispatcher,
      ctx,
      venueContext: await this.buildVenueContext(venue),
      mode: agentMode,
      tier: pickTier(params.userText, agentMode),
      priorSummary: streamCompaction.summary,
      emergencyAdvisory: (() => {
        const e = detectEmergency(params.userText)
        return e.triggered ? { matched: e.matched ?? '' } : null
      })(),
      userContext: {
        ...(params.userIdentity ?? { name: null, email: '' }),
        profileSummary: await this.getUserProfileSummary(params.userId, params.orgId),
      },
      onStepFinish: (step) => {
        round++
        for (const call of step.toolCalls ?? []) {
          toolCallLog.push({
            round,
            toolUseId: call.toolCallId,
            tool: call.toolName,
            input: call.input ?? null,
            result: null,
          })
        }
        for (const tr of step.toolResults ?? []) {
          // Backfill the matching log entry with the tool result so
          // persistence carries input + output together.
          const entry = toolCallLog.find(
            (l) => l.toolUseId === tr.toolCallId && l.result === null,
          )
          if (entry) entry.result = tr.output

          if (tr.toolName === 'find_knowledge') {
            const output = tr.output as { ok?: boolean; data?: unknown } | null
            if (output?.ok && Array.isArray(output.data)) {
              for (const hit of output.data as Array<{ id?: string }>) {
                if (hit?.id) retrievedItemIds.add(hit.id)
              }
            }
          }

          if (tr.toolName === 'suggest_followups') {
            const output = tr.output as {
              ok?: boolean
              data?: { followUps?: string[] }
            } | null
            if (output?.ok && Array.isArray(output.data?.followUps)) {
              followUps = output.data!.followUps!.slice(0, 3)
            }
          }
        }
      },
      onFinish: async (event) => {
        // Client closed the tab mid-stream: skip persistence so a half-written
        // assistant turn doesn't land as a committed-looking row in history.
        if (params.abortSignal?.aborted) {
          this.logger.log(
            JSON.stringify({
              event: 'chat.stream_aborted',
              conversationId,
              rounds: round,
              latency_ms: Date.now() - startedAt,
              finishReason: event.finishReason,
            }),
          )
          return
        }

        const text = event.text ?? ''
        const reasoningText = (event as { reasoningText?: string }).reasoningText
        // Never persist an empty assistant row — Anthropic rejects those as
        // history on the next turn. Fall back to a visible placeholder.
        const storedContent =
          text.trim() || "I couldn't produce an answer — please retry or rephrase."

        // Persist the full UIMessage-shaped parts snapshot for faithful replay
        // (reasoning blocks, tool chips, streaming caret, etc).
        const lastAssistant = [...event.response.messages]
          .reverse()
          .find((m) => m.role === 'assistant')
        const partsJson = lastAssistant
          ? (lastAssistant.content as unknown as object)
          : null

        const assistantMessage = await prisma.chatMessage.create({
          data: {
            id: assistantMessageId,
            conversationId,
            role: 'assistant',
            content: storedContent,
            retrievedItemIds: Array.from(retrievedItemIds),
            toolCallLog: toolCallLog as unknown as object,
            followUps,
            reasoning: reasoningText ?? null,
            parts: (partsJson ?? undefined) as object | undefined,
          },
          select: { id: true },
        })

        await this.adaptation.captureRetrievalOutcome({
          assistantMessageId: assistantMessage.id,
          toolCallLog,
          retrievedItemIds: Array.from(retrievedItemIds),
        })

        this.logger.log(
          JSON.stringify({
            event: 'chat.stream_finished',
            conversationId,
            assistantMessageId: assistantMessage.id,
            rounds: round,
            latency_ms: Date.now() - startedAt,
            followUpCount: followUps.length,
            hasReasoning: Boolean(reasoningText),
          }),
        )
      },
    })

    const result = await agent.stream({
      messages: modelMessages,
      abortSignal: params.abortSignal,
    })

    return { conversationId, assistantMessageId, result }
  }
}

function truncate(s: string, max: number): string {
  const trimmed = s.trim().replace(/\s+/g, ' ')
  return trimmed.length > max ? trimmed.slice(0, max - 1) + '…' : trimmed
}
