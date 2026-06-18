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
import { IncidentsService } from '../incidents/incidents.service'
import { IntegrationRegistry } from '../integrations/integration-registry'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import type { CompactableMessage } from './conversation-compactor.service'
import { ConversationCompactorService } from './conversation-compactor.service'
import { ConversationModeService, VALID_MODES } from './conversation-mode.service'
import { deriveEscalation } from './escalation'
import {
  type AgentMode,
  buildGmAgent,
  synthesizeTerminalToolReply,
  type VenueContactSummary,
  type VenueProfileContext,
  type VenueSnapshot,
} from './gm-agent'
import { QuoteVerifierService } from './quote-verifier.service'
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

// Deterministic intent classifier — zero LLM calls, zero added latency.
// Detects list/count/aggregate intent that should route directly to
// query_document_table rather than burning a find_knowledge round-trip
// on text retrieval. Returns null when no tabular intent detected OR
// when the venue has no tabular docs to query against.
// Tightened to high-signal tabular verbs only. Dropped `across|every|each|report`
// (high-frequency English words that false-positive in conversational text) and
// `show me|show all` (too strict for natural phrasings like "show stock levels").
// A false positive here costs one wasted query_document_table call before the
// agent falls back to find_knowledge — small but contradicts the punchy-latency
// goal, so keep precision high.
const TABULAR_VERB_RE =
  /\b(list|count|how many|how much|total|sum|average|avg|breakdown|tally|enumerate)\b/i
const TABULAR_DOMAIN_RE =
  /\b(items?|products?|stock|inventory|orders?|sales|suppliers?|deliveries|staff|shifts|prices?|rota|menu)\b/i
// Pattern set for "factual specifics" the auto-verifier cares about.
// Conservative on purpose — we only want to spend a Haiku call when the
// assistant text contains something a hallucination would distort:
//   • phone-like number sequences (7+ digits, optional + / spaces / -)
//   • email addresses
//   • hyphen/underscore-separated alphanumeric codes (e.g. ABC-123, F23-A,
//     E12-AB). Separator is mandatory so we don't false-fire on common
//     English compounds like iso8601, covid19, 5G, B2B. Unseparated short
//     codes (F07) are missed but those typically co-occur with other
//     specifics in the same draft and get caught by the other branches.
//   • currency (£99, $1.20)
//   • quantity + unit (3kg, 5°C, 2 bar, 200ml, 45 minutes, etc.)
// Pure regex; no LLM. Returns true → auto-verify worth firing.
const FACTUAL_SPECIFIC_RE = new RegExp(
  [
    String.raw`\+?\d[\d\s().-]{7,}`,
    String.raw`[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`,
    String.raw`\b(?=[A-Za-z0-9-]*[A-Za-z])(?=[A-Za-z0-9-]*\d)[A-Za-z0-9]{2,}[-_][A-Za-z0-9]+\b`,
    String.raw`[£$€]\d+(?:\.\d{1,2})?`,
    String.raw`\b\d+(?:\.\d+)?\s?(?:kg|kilo|g|cl|ml|l|°c|°f|bar|psi|min|minute|hour|day|week|second|sec)s?\b`,
  ].join('|'),
  'i',
)

function classifyTabularIntent(userMessage: string, tabularDocCount: number): string | null {
  if (tabularDocCount === 0) return null
  const msg = userMessage.trim()
  if (msg.length < 4 || msg.length > 280) return null
  if (!TABULAR_VERB_RE.test(msg) || !TABULAR_DOMAIN_RE.test(msg)) return null
  return 'This message looks like a list/count/aggregate query. Call query_document_table FIRST (skip find_knowledge unless the tabular tool returns no rows). Tabular docs available are listed in <venue_snapshot>.tabular_docs.'
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
    private readonly verifier: QuoteVerifierService,
    private readonly realtime: RealtimeGateway,
    private readonly integrations: IntegrationRegistry,
    private readonly incidents: IncidentsService,
  ) {}

  onModuleInit(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    this.anthropic = new Anthropic({ apiKey })
  }

  /// Post-response auto-verify. Fires the QuoteVerifier in the background
  /// against retrieved knowledge_item sources WHEN the assistant text
  /// contains factual specifics (numbers, codes, contacts, money, quantity
  /// + unit). Latency-safe — runs after persistence as a floating promise,
  /// so the user has already seen the answer. Wave C: persists final state
  /// onto the assistant ChatMessage row (verifyStatus + verifyIssueCount)
  /// so the web UI can render a small "couldn't verify N specifics" badge
  /// without polling a separate endpoint.
  private triggerAutoVerify(params: {
    draft: string
    retrievedItemIds: string[]
    orgId: string
    assistantMessageId: string
  }): void {
    // Skip path stays as NULL in the DB — VerifyBadge already treats null
    // and 'skipped' identically (no badge). Persisting 'skipped' would only
    // burn an extra Prisma update per turn with no observable effect.
    if (params.retrievedItemIds.length === 0) return
    if (!FACTUAL_SPECIFIC_RE.test(params.draft)) return
    // No 'pending' pre-write: the UI suppresses pending and writing it
    // un-awaited from the same call site as the terminal status races with
    // it on Prisma's connection pool. If the terminal write arrives first,
    // the row would be pinned to 'pending' forever. Final-status writes are
    // single, ordered, awaited inside the .then chain.
    void this.verifier
      .verify(params.draft, params.retrievedItemIds, params.orgId)
      .then(async (result) => {
        if (result.ok) {
          this.logger.log(
            JSON.stringify({
              event: 'chat.auto_verify.clean',
              assistantMessageId: params.assistantMessageId,
              orgId: params.orgId,
              checked: result.checked,
            }),
          )
          await this.persistVerifyStatus(params.assistantMessageId, 'clean', 0)
          return
        }
        // PII-clean: log issue COUNT only, never claim/expected content.
        this.logger.warn(
          JSON.stringify({
            event: 'chat.auto_verify.issues',
            assistantMessageId: params.assistantMessageId,
            orgId: params.orgId,
            checked: result.checked,
            issueCount: result.issues.length,
          }),
        )
        await this.persistVerifyStatus(params.assistantMessageId, 'issues', result.issues.length)
      })
      .catch(async (err: unknown) => {
        // Don't log raw error message — Anthropic SDK and Prisma errors can
        // echo the request body (which contains the draft assistant text) on
        // certain failures. Project security.md forbids logging PII.
        const name = err instanceof Error ? err.name : 'UnknownError'
        this.logger.warn(
          JSON.stringify({
            event: 'chat.auto_verify.error',
            assistantMessageId: params.assistantMessageId,
            orgId: params.orgId,
            errorName: name,
          }),
        )
        await this.persistVerifyStatus(params.assistantMessageId, 'error', null)
      })
  }

  private async persistVerifyStatus(
    messageId: string,
    status: 'pending' | 'clean' | 'issues' | 'skipped' | 'error',
    issueCount: number | null,
  ): Promise<void> {
    try {
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { verifyStatus: status, verifyIssueCount: issueCount },
      })
    } catch (err) {
      // Best-effort. A persistence miss only loses the badge for this turn —
      // the user already has the answer.
      const name = err instanceof Error ? err.name : 'UnknownError'
      this.logger.warn(
        JSON.stringify({
          event: 'chat.auto_verify.persist_failed',
          assistantMessageId: messageId,
          errorName: name,
        }),
      )
    }
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
    // Coerce stored mode against the live allowlist — legacy rows (e.g. an
    // old 'training' mode after that overlay was removed) fall back to default.
    const storedRaw = existing?.mode
    const stored: AgentMode | null =
      storedRaw && (VALID_MODES as readonly string[]).includes(storedRaw)
        ? (storedRaw as AgentMode)
        : null
    if (stored && stored !== 'default') {
      return stored
    }
    if (!firstUserMessage) return stored ?? 'default'

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
        take: 48,
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
      let orgChartDoc: VenueSnapshot['orgChartDoc']

      for (const r of rows) {
        const meta = (r.metadata ?? {}) as Record<string, unknown>
        const docType = typeof meta.docType === 'string' ? meta.docType : null
        const docPurpose = typeof meta.docPurpose === 'string' ? meta.docPurpose : null
        const title =
          typeof meta.title === 'string' && meta.title.trim().length > 0
            ? meta.title.trim()
            : r.content.replace(/\s+/g, ' ').trim().slice(0, 80)
        const summary = (r.aiSummary ?? r.content).replace(/\s+/g, ' ').trim().slice(0, 240)

        // Org chart: inline the content (capped) so the agent doesn't need a
        // separate retrieval round-trip. PREFIX_RE strips the uploader brief.
        // Cap is chars not tokens — 2000 chars ≈ 500 tokens, fine for a typical
        // chart of 5-20 people. Longer charts get truncated; agent falls back to
        // find_knowledge by title. Skip topKnowledge for this row — surfacing it
        // twice would dilute the "authoritative source" instruction.
        if (docPurpose === 'org_chart' && !orgChartDoc) {
          const stripped = r.content.replace(/^Context from uploader: [\s\S]*?\n\n---\n\n/, '')
          const content = stripped.trim().slice(0, 2000)
          orgChartDoc = { id: r.id, title, content }
          continue
        }

        if (docType === 'tabular') {
          if (tabularDocs.length < 16) tabularDocs.push({ id: r.id, title })
          continue
        }

        if (meta.isGap === true) {
          const tentative = typeof meta.tentativeAnswer === 'string' ? meta.tentativeAnswer : null
          const answer = r.aiSummary && r.aiSummary.trim().length > 0 ? r.aiSummary : tentative
          if (answer && recentlyAnswered.length < 10) {
            recentlyAnswered.push({
              question: r.content.replace(/\s+/g, ' ').trim().slice(0, 200),
              answer: answer.replace(/\s+/g, ' ').trim().slice(0, 320),
            })
          }
          continue
        }

        if (topKnowledge.length < 20) {
          topKnowledge.push({ id: r.id, title, summary })
        }
      }

      return { topKnowledge, recentlyAnswered, tabularDocs, orgChartDoc }
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

    let conversationId = input.conversationId
    if (!conversationId) {
      const created = await prisma.chatConversation.create({
        data: { venueId: input.venueId, channel: 'web', userId },
        select: { id: true },
      })
      conversationId = created.id
      this.realtime.emitChatConversationUpserted(userId, {
        id: created.id,
        venueId: input.venueId,
        channel: 'web',
      })
    }

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

    const routingHint = classifyTabularIntent(
      input.userMessage,
      venueSnapshot.tabularDocs?.length ?? 0,
    )

    const agent = buildGmAgent({
      dispatcher: this.dispatcher,
      integrations: this.integrations,
      ctx: { orgId, userId, userRole },
      venueContext,
      mode: agentMode,
      priorSummary: compaction.summary,
      venueSnapshot,
      routingHint,
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
      // Trim before the !finalText check below — a whitespace-only response
      // should fall through to the terminal-tool reply / generic fallback, not
      // be persisted as a blank-looking assistant message.
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
        const terminalReply = synthesizeTerminalToolReply(toolCallLog)
        this.logger.log(
          JSON.stringify({
            event: 'chat.empty_assistant_text',
            conversationId,
            finishReason: result.finishReason,
            terminalToolStop: terminalReply !== null,
          }),
        )
        finalText = terminalReply ?? "I couldn't produce an answer — please retry or rephrase."
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

    const escalation = deriveEscalation(toolCallLog, userId)

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
        escalatedAt: escalation?.escalatedAt ?? null,
        escalatedToUserId: escalation?.escalatedToUserId ?? null,
        escalationKind: escalation?.escalationKind ?? null,
      },
      select: { id: true, content: true, followUps: true },
    })

    await this.adaptation.captureRetrievalOutcome({
      assistantMessageId: assistantMessage.id,
      toolCallLog,
      retrievedItemIds: Array.from(retrievedItemIds),
    })

    // Back-fill IncidentLog.sourceMessageId for any incidents created during
    // this turn — the dispatcher couldn't write it at create time because
    // the assistant message didn't exist yet. Fire-and-forget so a slow
    // update can't stall the response; an error here only means the
    // /incidents card loses its "Source" link for those rows, not a
    // correctness issue.
    void this.incidents
      .backfillSourceMessageIds({ orgId, messageId: assistantMessage.id, toolCallLog })
      .catch((err: unknown) => {
        this.logger.error(
          JSON.stringify({
            event: 'chat.incident_backfill.failed',
            messageId: assistantMessage.id,
            orgId,
            error: err instanceof Error ? err.message : String(err),
          }),
        )
      })

    // Auto-verify floats after persistence — user has the answer already.
    this.triggerAutoVerify({
      draft: finalText,
      retrievedItemIds: Array.from(retrievedItemIds),
      orgId,
      assistantMessageId: assistantMessage.id,
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

  async listPage(
    orgId: string,
    userId: string,
    opts: {
      venueId?: string
      cursor?: string
      limit?: number
      q?: string
    } = {},
  ): Promise<{
    items: Array<{
      id: string
      venueId: string
      venueName: string
      lastMessageAt: string
      preview: string | null
    }>
    nextCursor: string | null
  }> {
    const safeLimit = Math.max(1, Math.min(100, opts.limit ?? 30))
    const cur = decodeConversationCursor(opts.cursor)
    const q = opts.q?.trim()

    // Keyset pagination on (updatedAt desc, id desc). The compound OR is the
    // standard "strictly less than the cursor tuple" predicate — equal
    // updatedAt timestamps are tie-broken by id so the page boundary stays
    // stable when multiple threads share a timestamp.
    const cursorWhere = cur
      ? {
          OR: [
            { updatedAt: { lt: cur.updatedAt } },
            { AND: [{ updatedAt: cur.updatedAt }, { id: { lt: cur.id } }] },
          ],
        }
      : {}

    // Search filter: venue name OR first user-message content. We rely on
    // Prisma's `contains` + `mode: 'insensitive'` which compiles to ILIKE.
    // Prisma escapes the parameter so this is safe with user-supplied `q`.
    const searchWhere = q
      ? {
          OR: [
            { venue: { name: { contains: q, mode: 'insensitive' as const } } },
            {
              messages: {
                some: {
                  role: 'user',
                  content: { contains: q, mode: 'insensitive' as const },
                },
              },
            },
          ],
        }
      : {}

    const rows = await prisma.chatConversation.findMany({
      where: {
        userId,
        deletedAt: null,
        venue: { organizationId: orgId },
        ...(opts.venueId ? { venueId: opts.venueId } : {}),
        ...cursorWhere,
        ...searchWhere,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      // Fetch limit+1 so we know if another page exists without a second
      // count query.
      take: safeLimit + 1,
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

    const hasNext = rows.length > safeLimit
    const page = hasNext ? rows.slice(0, safeLimit) : rows
    const last = page[page.length - 1]
    const nextCursor = hasNext && last ? encodeConversationCursor(last.updatedAt, last.id) : null

    return {
      items: page.map((r) => ({
        id: r.id,
        venueId: r.venueId,
        venueName: r.venue.name,
        lastMessageAt: r.updatedAt.toISOString(),
        preview: r.messages[0]?.content ? truncate(r.messages[0].content, 80) : null,
      })),
      nextCursor,
    }
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
      this.realtime.emitChatConversationUpserted(params.userId, {
        id: conversationId,
        venueId: venue.id,
        channel: 'web',
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

    const routingHint = classifyTabularIntent(
      params.userText,
      venueSnapshot.tabularDocs?.length ?? 0,
    )

    const agent = buildGmAgent({
      dispatcher: this.dispatcher,
      integrations: this.integrations,
      ctx,
      venueContext,
      mode: agentMode,
      priorSummary: streamCompaction.summary,
      venueSnapshot,
      routingHint,
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
        // history on the next turn. Prefer a brief terminal-tool confirmation
        // when the loop ended on generate_report / save_knowledge_doc; fall
        // back to the generic error string otherwise.
        const trimmed = text.trim()
        let storedContent: string
        if (trimmed) {
          storedContent = trimmed
        } else {
          const terminalReply = synthesizeTerminalToolReply(toolCallLog)
          this.logger.log(
            JSON.stringify({
              event: 'chat.empty_assistant_text',
              conversationId,
              finishReason: event.finishReason,
              terminalToolStop: terminalReply !== null,
            }),
          )
          storedContent =
            terminalReply ?? "I couldn't produce an answer — please retry or rephrase."
        }

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

        const escalation = deriveEscalation(toolCallLog, params.userId)

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
            escalatedAt: escalation?.escalatedAt ?? null,
            escalatedToUserId: escalation?.escalatedToUserId ?? null,
            escalationKind: escalation?.escalationKind ?? null,
          },
          select: { id: true },
        })

        await this.adaptation.captureRetrievalOutcome({
          assistantMessageId: assistantMessage.id,
          toolCallLog,
          retrievedItemIds: Array.from(retrievedItemIds),
        })

        // Back-fill IncidentLog.sourceMessageId for incidents created during
        // this streamed turn. Same shape as the non-streaming path above.
        void this.incidents
          .backfillSourceMessageIds({
            orgId: params.orgId,
            messageId: assistantMessage.id,
            toolCallLog,
          })
          .catch((err: unknown) => {
            this.logger.error(
              JSON.stringify({
                event: 'chat.incident_backfill.failed',
                messageId: assistantMessage.id,
                orgId: params.orgId,
                error: err instanceof Error ? err.message : String(err),
              }),
            )
          })

        // Auto-verify after stream completes — user has the answer already.
        this.triggerAutoVerify({
          draft: storedContent,
          retrievedItemIds: Array.from(retrievedItemIds),
          orgId: params.orgId,
          assistantMessageId: assistantMessage.id,
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

/// Keyset cursor for the conversations list. Encodes the last row's
/// (updatedAt, id) as a base64url-encoded `${iso}|${uuid}` blob. Opaque to
/// clients — the encoding is internal and may change without a contract bump.
function encodeConversationCursor(updatedAt: Date, id: string): string {
  return Buffer.from(`${updatedAt.toISOString()}|${id}`, 'utf8').toString('base64url')
}

function decodeConversationCursor(
  cursor: string | undefined,
): { updatedAt: Date; id: string } | null {
  if (!cursor) return null
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const pipe = raw.indexOf('|')
    if (pipe < 0) return null
    const iso = raw.slice(0, pipe)
    const id = raw.slice(pipe + 1)
    const updatedAt = new Date(iso)
    if (Number.isNaN(updatedAt.getTime()) || !id) return null
    return { updatedAt, id }
  } catch {
    return null
  }
}
