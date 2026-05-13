import { createHash } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import type {
  ImagePart,
  ModelMessage,
  StreamTextResult,
  TextPart,
  ToolCallPart,
  ToolResultPart,
  ToolSet,
} from 'ai'
import { prisma } from '../../database/prisma'
import { VenueProfileSchema } from '../../types'
// Plan 06-04 Task 1 — types relocated to apps/api/src/types/chat-message.ts.
// Re-export shim during transition; deleted with chat-v1 in Task 7.
import {
  type SendMessageInput,
  SendMessageInputSchema,
  type SendMessageResult,
  type ToolCallLogEntry,
} from '../../types/chat-message'

export type {
  SendMessageInput,
  SendMessageResult,
  ToolCallLogEntry,
} from '../../types/chat-message'

import { AdaptationService } from '../adaptation/adaptation.service'
import type { CompactableMessage } from './conversation-compactor.service'
import { ConversationCompactorService } from './conversation-compactor.service'
import { ConversationModeService } from './conversation-mode.service'
import {
  type AgentMode,
  buildGmAgent,
  type VenueContactSummary,
  type VenueProfileContext,
  type VenueSnapshot,
} from './gm-agent'
import type { DispatchContext } from './tool-dispatcher'
import { ToolDispatcher } from './tool-dispatcher'
import { UserProfileService } from './user-profile.service'

type PersistedToolCall = {
  round?: number
  toolUseId?: string
  tool?: string
  input?: unknown
  result?: unknown
}

// Reconstruct AI SDK ModelMessage[] for the recent (un-compacted) window.
// Prior implementation flattened every assistant turn to plain text, which
// hid which doc / row a previous turn already resolved — the model would
// then refuse follow-up questions about that doc ("I don't have access to
// sales data") because nothing in its context indicated a tool had been
// called. We now replay each completed tool round as
// [assistant: tool-call parts, tool: tool-result parts, assistant: final text]
// so the model sees the docId / output it produced earlier and can reuse it.
//
// Replay is all-or-nothing per assistant turn: if any persisted tool call has
// a null result (incomplete dispatch), we fall back to plain text for that
// turn — Anthropic rejects a tool_use without its matching tool_result.
function expandRecentToModelMessages(
  recent: CompactableMessage[],
  toolCallsByMessageId: Map<string, PersistedToolCall[]>,
): ModelMessage[] {
  const out: ModelMessage[] = []
  for (const m of recent) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content })
      continue
    }
    const log = toolCallsByMessageId.get(m.id) ?? []
    const allComplete =
      log.length > 0 &&
      log.every(
        (e) =>
          typeof e.toolUseId === 'string' &&
          e.toolUseId.length > 0 &&
          typeof e.tool === 'string' &&
          e.tool.length > 0 &&
          e.result !== null &&
          e.result !== undefined,
      )
    if (allComplete) {
      const toolCallParts: ToolCallPart[] = log.map((e) => ({
        type: 'tool-call',
        toolCallId: e.toolUseId as string,
        toolName: e.tool as string,
        input: e.input ?? {},
      }))
      const toolResultParts: ToolResultPart[] = log.map((e) => ({
        type: 'tool-result',
        toolCallId: e.toolUseId as string,
        toolName: e.tool as string,
        // 'json' output type — provider serialises and the model reads it as
        // structured JSON, so docIds and metadata fields stay intact.
        output: { type: 'json', value: (e.result ?? null) as never },
      }))
      out.push({ role: 'assistant', content: toolCallParts })
      out.push({ role: 'tool', content: toolResultParts })
      out.push({ role: 'assistant', content: m.content })
    } else {
      out.push({ role: 'assistant', content: m.content })
    }
  }
  return out
}

function buildToolCallMap(
  rows: Array<{ id: string; role: string; toolCallLog: unknown }>,
): Map<string, PersistedToolCall[]> {
  const map = new Map<string, PersistedToolCall[]>()
  for (const r of rows) {
    if (r.role !== 'assistant') continue
    if (!Array.isArray(r.toolCallLog)) continue
    map.set(r.id, r.toolCallLog as PersistedToolCall[])
  }
  return map
}

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name)

  private anthropic!: Anthropic

  constructor(
    private readonly dispatcher: ToolDispatcher,
    private readonly adaptation: AdaptationService,
    private readonly modeClassifier: ConversationModeService,
    private readonly userProfile: UserProfileService,
    private readonly compactor: ConversationCompactorService,
  ) {}

  onModuleInit(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    this.anthropic = new Anthropic({ apiKey })
  }

  /// Phase F — fetch (and lazily refresh) the user's GM profile summary for
  /// injection into prompt context. Soft-fails to null so chat never blocks.
  private async getUserProfileSummary(userId: string, orgId: string): Promise<string | null> {
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

  /// Resolve the conversation mode for THIS turn. If the conversation already
  /// has a non-default mode stored, reuse it. Otherwise return 'default' for
  /// this turn and fire the Haiku classifier in the background — the result
  /// persists on the conversation row, so subsequent turns see the right mode.
  /// We never block the user-perceived turn on a Haiku call.
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

  /// Build the venue snapshot — top knowledge items + recently-answered KB
  /// gaps + tabular doc inventory. Injected into the system prompt so the
  /// agent can answer most lookups directly without a find_knowledge round-trip.
  ///
  /// Notes:
  ///  - KnowledgeItems with metadata.isGap=true AND answerStatus='answered' are
  ///    surfaced as recentlyAnswered. Pending gaps (no answer yet) are filtered.
  ///  - Tabular docs are detected via metadata.docType='tabular' (the same flag
  ///    the dispatcher uses for query_document_table routing).
  ///  - Soft-fails to an empty snapshot — the agent falls back to find_knowledge.
  private async buildVenueSnapshot(orgId: string, venueId: string): Promise<VenueSnapshot> {
    try {
      const rows = await prisma.knowledgeItem.findMany({
        where: {
          organizationId: orgId,
          OR: [{ venueId }, { venueId: null }],
          answerStatus: 'answered',
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 24,
        select: {
          id: true,
          content: true,
          aiSummary: true,
          metadata: true,
        },
      })

      const topKnowledge: VenueSnapshot['topKnowledge'] = []
      const recentlyAnswered: VenueSnapshot['recentlyAnswered'] = []
      const tabularDocs: VenueSnapshot['tabularDocs'] = []

      for (const r of rows) {
        const meta = (r.metadata ?? {}) as Record<string, unknown>
        const docType = typeof meta.docType === 'string' ? meta.docType : null
        const title =
          typeof meta.title === 'string' && meta.title.trim().length > 0
            ? meta.title.trim()
            : r.content.replace(/\s+/g, ' ').trim().slice(0, 60)
        const summary = (r.aiSummary ?? r.content).replace(/\s+/g, ' ').trim().slice(0, 140)

        if (docType === 'tabular') {
          if (tabularDocs.length < 8) tabularDocs.push({ id: r.id, title })
          continue
        }

        if (meta.isGap === true) {
          const tentative = typeof meta.tentativeAnswer === 'string' ? meta.tentativeAnswer : null
          const answer = r.aiSummary && r.aiSummary.trim().length > 0 ? r.aiSummary : tentative
          if (answer && recentlyAnswered.length < 6) {
            recentlyAnswered.push({
              question: r.content.replace(/\s+/g, ' ').trim().slice(0, 160),
              answer: answer.replace(/\s+/g, ' ').trim().slice(0, 200),
            })
          }
          continue
        }

        if (topKnowledge.length < 10) {
          topKnowledge.push({ id: r.id, title, summary })
        }
      }

      return { topKnowledge, recentlyAnswered, tabularDocs }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'chat.snapshot_build_failed',
          message: (err as Error).message,
        }),
      )
      return {}
    }
  }

  /// Generate 0-3 follow-up suggestions via Haiku from the user message + final
  /// assistant text. Decoupled from the main agent loop — fires after the
  /// answer is ready, so it adds latency only to the post-answer pills, not
  /// to TTFB. Soft-fails to []. Hard cap on time so a slow Haiku call never
  /// holds up persistence.
  private async generateFollowUps(userMessage: string, assistantText: string): Promise<string[]> {
    if (!assistantText.trim()) return []
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    try {
      const response = await this.anthropic.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: `You are generating 0-3 follow-up question pills for a hospitality-staff chat. Given the user's question and the assistant's answer, suggest the most likely next questions the user would tap.

Rules:
- 0 to 3 entries.
- Each ≤120 chars, first-person natural voice ("How do I…", "Who do I call for…", "What's the…").
- Prefer follow-ups that reference artifacts named in the answer (procedures, SOPs, suppliers, contacts).
- Skip if nothing sensible — return [].
- Return ONLY a JSON array of strings, no commentary, no code fences.

User: ${userMessage}

Assistant answer: ${assistantText}`,
            },
          ],
        },
        { signal: controller.signal },
      )
      const raw = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('')
        .trim()
      // Strip code fences if Haiku ignored the no-fences rule.
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()
      const parsedJson: unknown = JSON.parse(cleaned)
      if (!Array.isArray(parsedJson)) return []
      return parsedJson
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 120)
        .slice(0, 3)
    } catch {
      return []
    } finally {
      clearTimeout(timer)
    }
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
        select: { id: true, venueId: true, userId: true, deletedAt: true },
      })
      if (!existing || existing.deletedAt !== null)
        throw new Error(`conversation ${input.conversationId} not found`)
      if (existing.venueId !== venue.id) {
        throw new Error(`conversation ${input.conversationId} does not belong to venue ${venue.id}`)
      }
      // Share-chat: only the original creator can post into a thread. Legacy
      // WhatsApp threads (userId=null) skip this gate — they predate user
      // binding. Visibility doesn't matter here: 'org' opens reads, never writes.
      if (existing.userId !== null && existing.userId !== userId) {
        throw new Error(`conversation ${input.conversationId} not found`)
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
          const sidSuffix = input.attachment.sourceRef ? `, sid:${input.attachment.sourceRef}` : ''
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
      select: { id: true, role: true, content: true, toolCallLog: true },
    })
    // Anthropic rejects empty text blocks with 400. Aborted or failed prior
    // turns can leave assistant rows with empty content — filter them out.
    const filteredRaw = historyRaw.filter((m) => m.content && m.content.trim().length > 0)
    const history: CompactableMessage[] = filteredRaw.map((m) => ({
      id: m.id,
      role: m.role === 'assistant' ? 'assistant' : ('user' as const),
      content: m.content,
    }))
    const toolCallsByMessageId = buildToolCallMap(filteredRaw)

    // Pre-amble — fan out everything the agent needs into one Promise.all so
    // TTFB isn't paying for sequential awaits. Mode resolution stays in here
    // (it's quick — just a DB read; the Haiku classifier fires in the background).
    const [compaction, agentMode, venueContext, profileSummary, venueSnapshot] = await Promise.all([
      this.compactor.compactIfNeeded(conversationId, history),
      this.resolveConversationMode(conversationId, input.userMessage),
      this.buildVenueContext(venue),
      this.getUserProfileSummary(userId, orgId),
      this.buildVenueSnapshot(orgId, venue.id),
    ])
    const messages: ModelMessage[] = expandRecentToModelMessages(
      compaction.recent,
      toolCallsByMessageId,
    )

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
    let round = 0
    const startedAt = Date.now()

    const agent = buildGmAgent({
      dispatcher: this.dispatcher,
      ctx: { orgId, userId, userRole },
      venueContext,
      mode: agentMode,
      priorSummary: compaction.summary,
      venueSnapshot,
      userContext: {
        name: userIdentity.name,
        email: userIdentity.email,
        profileSummary,
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
          const entry = toolCallLog.find((l) => l.toolUseId === tr.toolCallId && l.result === null)
          if (entry) entry.result = tr.output

          if (tr.toolName === 'find_knowledge') {
            const output = tr.output as { ok?: boolean; data?: unknown } | null
            if (output?.ok && Array.isArray(output.data)) {
              for (const hit of output.data as Array<{ id?: string }>) {
                if (hit?.id) retrievedItemIds.add(hit.id)
              }
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
      // PII boundary: counts + conversationIdHash only — no message body, no
      // retrieved content.
      try {
        const usage = result.usage as
          | {
              inputTokens?: number
              outputTokens?: number
              inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number }
            }
          | undefined
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

    // Generate follow-up pills via Haiku from (user msg, final answer). Decoupled
    // from the agent loop so it doesn't add to the agent's perceived latency in
    // the streaming path; here in the non-streaming path we await it because
    // the response shape requires followUps on the persisted row. Soft-fails to [].
    const followUps = await this.generateFollowUps(input.userMessage, finalText)

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
        deletedAt: true,
        venue: { select: { organizationId: true } },
      },
    })
    if (
      !conv ||
      conv.deletedAt !== null ||
      conv.venueId !== venueId ||
      conv.venue.organizationId !== orgId ||
      (conv.userId !== null && conv.userId !== userId)
    ) {
      throw new Error(`conversation ${conversationId} not found`)
    }
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { deletedAt: new Date() },
    })
  }

  // Owner-only visibility flip. Mirrors the cross-tenant 404-not-403 contract:
  // if anything is off (foreign org, foreign venue, soft-deleted, not the
  // creator) we throw a not-found-shaped error and the controller maps to 404.
  // Legacy WhatsApp threads (userId=null) currently can't be shared from the
  // web — they have no human owner to authorise the flip.
  async setVisibility(
    conversationId: string,
    orgId: string,
    userId: string,
    venueId: string,
    visibility: 'private' | 'org',
  ): Promise<{ id: string; visibility: 'private' | 'org' }> {
    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        venueId: true,
        userId: true,
        deletedAt: true,
        venue: { select: { organizationId: true } },
      },
    })
    if (
      !conv ||
      conv.deletedAt !== null ||
      conv.venueId !== venueId ||
      conv.venue.organizationId !== orgId ||
      conv.userId !== userId
    ) {
      throw new Error(`conversation ${conversationId} not found`)
    }
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { visibility },
    })
    return { id: conversationId, visibility }
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
        deletedAt: null,
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
    // biome-ignore lint/suspicious/noExplicitAny: AI SDK ToolSet generic accepts any output schema
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
      select: { id: true, venueId: true, userId: true, deletedAt: true },
    })
    if (existingConv && existingConv.deletedAt !== null) {
      throw new Error(`conversation ${conversationId} not found`)
    }
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
        throw new Error(`conversation ${conversationId} does not belong to venue ${venue.id}`)
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
    // to AI SDK ModelMessage[]. Tool-call replay (mirrors the non-streaming
    // path) — without it the model loses sight of prior turns' docIds and
    // re-asks find_knowledge for follow-ups about the same doc, often
    // bailing with "I don't have access to sales data".
    const streamHistoryRaw = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, role: true, content: true, toolCallLog: true },
    })
    // Anthropic rejects empty text blocks with 400 ("text content blocks must
    // be non-empty"). Aborted or failed prior turns can leave assistant rows
    // with empty content — filter them out before sending to the model.
    const filteredStreamRaw = streamHistoryRaw.filter(
      (m) => m.content && m.content.trim().length > 0,
    )
    const streamHistory: CompactableMessage[] = filteredStreamRaw.map((m) => ({
      id: m.id,
      role: m.role === 'assistant' ? 'assistant' : ('user' as const),
      content: m.content,
    }))
    const streamToolCallsByMessageId = buildToolCallMap(filteredStreamRaw)

    const ctx: DispatchContext = {
      orgId: params.orgId,
      userId: params.userId,
      userRole: params.userRole,
    }

    // First user message in this thread for mode classification (if not already set).
    const firstUserMessage =
      streamHistory.find((m) => m.role === 'user')?.content ?? params.userText

    // Pre-amble — fan out everything in parallel to minimise TTFB.
    const [streamCompaction, agentMode, venueContext, profileSummary, venueSnapshot] =
      await Promise.all([
        this.compactor.compactIfNeeded(conversationId, streamHistory),
        this.resolveConversationMode(conversationId, firstUserMessage),
        this.buildVenueContext(venue),
        this.getUserProfileSummary(params.userId, params.orgId),
        this.buildVenueSnapshot(params.orgId, venue.id),
      ])
    const modelMessages: ModelMessage[] = expandRecentToModelMessages(
      streamCompaction.recent,
      streamToolCallsByMessageId,
    )

    const retrievedItemIds = new Set<string>()
    // Full tool call log for persistence + adaptation loop.
    const toolCallLog: ToolCallLogEntry[] = []
    let round = 0
    const startedAt = Date.now()

    const agent = buildGmAgent({
      dispatcher: this.dispatcher,
      ctx,
      venueContext,
      mode: agentMode,
      priorSummary: streamCompaction.summary,
      venueSnapshot,
      userContext: {
        ...(params.userIdentity ?? { name: null, email: '' }),
        profileSummary,
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
          const entry = toolCallLog.find((l) => l.toolUseId === tr.toolCallId && l.result === null)
          if (entry) entry.result = tr.output

          if (tr.toolName === 'find_knowledge') {
            const output = tr.output as { ok?: boolean; data?: unknown } | null
            if (output?.ok && Array.isArray(output.data)) {
              for (const hit of output.data as Array<{ id?: string }>) {
                if (hit?.id) retrievedItemIds.add(hit.id)
              }
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
        const partsJson = lastAssistant ? (lastAssistant.content as unknown as object) : null

        // Generate follow-up pills via Haiku from (user msg, final answer).
        // The user has already seen the answer streamed, so this latency only
        // delays when the pills appear — not when the message arrives.
        const followUps = await this.generateFollowUps(params.userText, storedContent)

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

        // Push followUps onto the stream as a separate persistent UIMessage
        // metadata event so the client renders the pills after the text settles.
        // (Stream-side: handled via assistantMessage.followUps in the DB read
        //  on the next /messages fetch. The web UI already binds to that field.)
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
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}
