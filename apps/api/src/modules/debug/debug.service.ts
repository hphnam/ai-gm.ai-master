import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import {
  type DebugConversationResponse,
  type DebugMessage,
  type DebugMessageResponse,
  type DebugRetagQueueItem,
  type DebugRetagQueueResponse,
  RETENTION_90D_MS,
} from '../../types'
import { mapStatusCount, truncateAtWord, truncateToolCallLog } from './truncate'

type AccessLogContext = {
  requestId?: string
  resource: 'conversation' | 'message' | 'retag-queue'
  venueId: string
  outcome: '200' | '404'
  latencyMs: number
}

@Injectable()
export class DebugService {
  private readonly logger = new Logger(DebugService.name)

  private logAccess(ctx: AccessLogContext): void {
    this.logger.log({ event: 'debug.access', ...ctx })
  }

  private retentionCutoff(): Date {
    return new Date(Date.now() - RETENTION_90D_MS)
  }

  async getConversation(
    id: string,
    venueId: string,
    orgId: string,
    requestId?: string,
  ): Promise<DebugConversationResponse | null> {
    const started = Date.now()
    const conv = await prisma.chatConversation.findFirst({
      where: {
        id,
        venueId,
        venue: { organizationId: orgId },
        createdAt: { gte: this.retentionCutoff() },
      },
      include: {
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: { feedback: true },
        },
      },
    })
    if (!conv) {
      this.logAccess({
        requestId,
        resource: 'conversation',
        venueId,
        outcome: '404',
        latencyMs: Date.now() - started,
      })
      return null
    }

    const messages: DebugMessage[] = conv.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      retrievedItemIds: m.retrievedItemIds,
      toolCallLog: truncateToolCallLog(m.toolCallLog),
      feedback: m.feedback
        ? {
            kind: m.feedback.kind,
            userFeedback: m.feedback.userFeedback,
            createdAt: m.feedback.createdAt.toISOString(),
          }
        : null,
    }))

    this.logAccess({
      requestId,
      resource: 'conversation',
      venueId,
      outcome: '200',
      latencyMs: Date.now() - started,
    })

    return {
      conversation: {
        id: conv.id,
        venueId: conv.venueId,
        channel: conv.channel,
        createdAt: conv.createdAt.toISOString(),
      },
      messages,
    }
  }

  async getMessage(
    id: string,
    venueId: string,
    orgId: string,
    requestId?: string,
  ): Promise<DebugMessageResponse | null> {
    const started = Date.now()
    const msg = await prisma.chatMessage.findFirst({
      where: {
        id,
        createdAt: { gte: this.retentionCutoff() },
        conversation: { venueId, venue: { organizationId: orgId } },
      },
      include: {
        feedback: true,
        conversation: true,
      },
    })
    if (!msg) {
      this.logAccess({
        requestId,
        resource: 'message',
        venueId,
        outcome: '404',
        latencyMs: Date.now() - started,
      })
      return null
    }

    const retagRows = await prisma.reTagQueueItem.findMany({
      where: { sourceMessageId: id },
      include: {
        knowledgeItem: { select: { id: true, content: true, venueId: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    })

    const retagQueueItems: DebugRetagQueueItem[] = retagRows.map((r) => ({
      id: r.id,
      knowledgeItemId: r.knowledgeItemId,
      reason: r.reason,
      status: r.status,
      attempts: r.attempts,
      lastError: r.lastError,
      sourceMessageId: r.sourceMessageId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      knowledgeItem: {
        id: r.knowledgeItem.id,
        contentPreview: truncateAtWord(r.knowledgeItem.content ?? '', 160),
        venueId: r.knowledgeItem.venueId,
      },
    }))

    this.logAccess({
      requestId,
      resource: 'message',
      venueId,
      outcome: '200',
      latencyMs: Date.now() - started,
    })

    return {
      message: {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        retrievedItemIds: msg.retrievedItemIds,
        toolCallLog: truncateToolCallLog(msg.toolCallLog),
        feedback: msg.feedback
          ? {
              kind: msg.feedback.kind,
              userFeedback: msg.feedback.userFeedback,
              createdAt: msg.feedback.createdAt.toISOString(),
            }
          : null,
      },
      retagQueueItems,
      conversation: {
        id: msg.conversation.id,
        venueId: msg.conversation.venueId,
        channel: msg.conversation.channel,
      },
    }
  }

  async getRetagQueue(
    venueId: string,
    limit: number,
    orgId: string,
    requestId?: string,
  ): Promise<DebugRetagQueueResponse> {
    const started = Date.now()
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)))

    // audit-added M6: org + venue scoping. Cross-org leak on shared globals
    // is closed by the `knowledgeItem.venue.organizationId` clause even when
    // KnowledgeItem.venueId is NULL (global doc); that clause fails because
    // the relation resolves null → doesn't match.
    const where = {
      createdAt: { gte: this.retentionCutoff() },
      OR: [
        {
          sourceMessage: {
            conversation: { venueId, venue: { organizationId: orgId } },
          },
        },
        {
          sourceMessageId: null,
          knowledgeItem: { venueId, venue: { organizationId: orgId } },
        },
      ],
    }

    const rows = await prisma.reTagQueueItem.findMany({
      where,
      include: {
        knowledgeItem: { select: { id: true, content: true, venueId: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: safeLimit,
    })

    const groupRows = await prisma.reTagQueueItem.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    })

    const counts = mapStatusCount(
      groupRows.map((g) => ({ status: g.status, _count: { status: g._count.status } })),
      (evt, payload) => this.logger.warn({ event: evt, ...payload }),
    )

    const items: DebugRetagQueueItem[] = rows.map((r) => ({
      id: r.id,
      knowledgeItemId: r.knowledgeItemId,
      reason: r.reason,
      status: r.status,
      attempts: r.attempts,
      lastError: r.lastError,
      sourceMessageId: r.sourceMessageId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      knowledgeItem: {
        id: r.knowledgeItem.id,
        contentPreview: truncateAtWord(r.knowledgeItem.content ?? '', 160),
        venueId: r.knowledgeItem.venueId,
      },
    }))

    this.logAccess({
      requestId,
      resource: 'retag-queue',
      venueId,
      outcome: '200',
      latencyMs: Date.now() - started,
    })

    return { items, counts }
  }
}
