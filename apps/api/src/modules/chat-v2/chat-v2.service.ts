// Plan 06-01 Task 3 — chat-v2 orchestrator (replaces Task 2 stub).
//
// Flow per turn:
//   1. Persist user ChatMessage row (raw content for audit trail; sanitized
//      copy is what reaches Triage — audit-M4).
//   2. Triage classifies → CostTracker.recordTriage.
//   3. Docs researcher runs with brief → CostTracker.recordResearcher.
//   4. Writer composes (lookup mode) → CostTracker.recordWriter.
//   5. Persist assistant ChatMessage with costUsd in single insert.
//   6. Return SendMessageResult (chat-v1 contract — type-compatible).
//
// audit-M2 — try/catch wraps roles. On any throw, persist a turn-failed
// ChatMessage row with role='turn-failed', sanitized content, and partial
// cost from CostTracker.total(). Re-throw so controller returns 5xx.

import { Injectable } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import type {
  ResearcherFinding,
  TriageOutput,
} from '../../types'
import type { SendMessageInput, SendMessageResult } from '../chat/chat.service'
import { CostTracker } from './cost-tracker.service'
import { sanitizeForTriage } from './input-sanitizer'
import { chatV2Logger, hashId, sanitizeError } from './log-helpers'
import { DocsResearcher } from './researchers/docs.researcher'
import { TriageService } from './triage.service'
import { WriterService } from './writer.service'

export type ChatV2DispatchContext = {
  orgId: string
  userId: string
  userRole: string
  userIdentity: { name: string | null; email: string }
}

@Injectable()
export class ChatV2Service {
  constructor(
    private readonly triage: TriageService,
    private readonly docs: DocsResearcher,
    private readonly writer: WriterService,
  ) {}

  async sendMessage(
    input: SendMessageInput,
    ctx: ChatV2DispatchContext,
  ): Promise<SendMessageResult> {
    const t0 = Date.now()

    // Resolve / create conversation up-front so failure paths can persist a
    // turn-failed row attached to a real conversation. Cross-tenant guard:
    // the venue must belong to ctx.orgId — this matches chat-v1 discipline
    // (Plan 04-18 404-not-403 pattern, audit-M1).
    const venue = await prisma.venue.findFirst({
      where: { id: input.venueId, organizationId: ctx.orgId },
      select: { id: true },
    })
    if (!venue) throw new Error(`venue ${input.venueId} not found in org ${ctx.orgId}`)

    const conversationId =
      input.conversationId ??
      (
        await prisma.chatConversation.create({
          data: { venueId: venue.id, userId: ctx.userId, channel: 'web' },
          select: { id: true },
        })
      ).id

    // Persist raw user message (audit trail for audit-M4 — sanitized copy is
    // what reaches Triage; raw stays in chat_messages.content).
    await prisma.chatMessage.create({
      data: { conversationId, role: 'user', content: input.userMessage },
    })

    const sanitized = sanitizeForTriage(input.userMessage)
    const tracker = new CostTracker()
    let triageOutput: TriageOutput | null = null
    let docsFinding: ResearcherFinding | null = null

    try {
      const triageResult = await this.triage.classify(sanitized)
      tracker.recordTriage(triageResult.usage)
      triageOutput = triageResult.output

      // 06-01 fall-through: any non-lookup mode collapses to lookup behavior
      // (Analyser/Critic + reasoning/incident prompts ship in 06-02). We still
      // dispatch docs because researchersToDispatch always includes 'docs' in
      // 06-01 — incident with empty list also falls through.
      const brief =
        triageOutput.briefByResearcher.docs ?? sanitized.slice(0, 200)

      const docsResult = await this.docs.research(brief, {
        orgId: ctx.orgId,
        venueId: venue.id,
        conversationId,
      })
      tracker.recordResearcher(docsResult.usage, docsResult.voyageCalls)
      docsFinding = docsResult.finding

      const writerResult = await this.writer.compose({
        mode: 'lookup',
        userMessage: input.userMessage,
        findings: [docsFinding],
      })
      tracker.recordWriter(writerResult.usage)

      const cost = tracker.total()
      const retrievedItemIds = docsFinding.citations.map((c) => c.knowledgeItemId)

      const assistant = await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: writerResult.text,
          retrievedItemIds,
          costUsd: cost.totalUsd,
        },
        select: { id: true, content: true, followUps: true },
      })

      chatV2Logger.info('chat_v2.turn_complete', {
        orgId: hashId(ctx.orgId),
        conversationIdHash: hashId(conversationId),
        mode: triageOutput.mode,
        totalUsd: cost.totalUsd,
        breakdown: cost.breakdown,
        latencyMs: Date.now() - t0,
      })

      return {
        conversationId,
        assistantMessage: {
          id: assistant.id,
          content: assistant.content,
          followUps: assistant.followUps,
        },
        toolCallLog: [],
        retrievedItemIds,
      }
    } catch (err) {
      // audit-M2 — partial-failure cost persistence. Cost row is mandatory;
      // user-facing 5xx is generic. Re-throw after persisting.
      const cost = tracker.total()
      const failureContent = sanitizeError(err)
      try {
        await prisma.chatMessage.create({
          data: {
            conversationId,
            role: 'turn-failed',
            content: failureContent,
            costUsd: cost.totalUsd,
          },
        })
      } catch (persistErr) {
        chatV2Logger.error('chat_v2.turn_failed_persist_error', {
          orgId: hashId(ctx.orgId),
          conversationIdHash: hashId(conversationId),
          persistError: sanitizeError(persistErr),
        })
      }
      chatV2Logger.error('chat_v2.turn_failed', {
        orgId: hashId(ctx.orgId),
        conversationIdHash: hashId(conversationId),
        mode: triageOutput?.mode ?? null,
        totalUsd: cost.totalUsd,
        breakdown: cost.breakdown,
        failureContent,
        latencyMs: Date.now() - t0,
      })
      throw err
    }
  }
}
