// Plan 06-04 Task 3 — chat-core ConversationService.
//
// Lifted from chat-v1's chat.service.ts: listRecent / getById / softDelete.
// Cross-tenant via `prisma.chatConversation.findFirst({ where: { id, venue:
// { organizationId, ...(venueId ? { id: venueId } : {}) } } })` mirroring the
// 06-01 pattern. listRecent honours `WHERE deletedAt IS NULL`.

import { Injectable } from '@nestjs/common'
import { prisma } from '../../database/prisma'

export type ConversationSummary = {
  id: string
  venueId: string
  venueName: string
  lastMessageAt: string
  preview: string | null
}

export type ConversationMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  retrievedItemIds: string[]
  followUps?: string[]
  reasoning: string | null
  parts?: unknown
  toolCallLog?: unknown[]
  feedbackKind: string | null
  /// Wave-C auto-verify state — see ChatMessageSchema for value semantics.
  verifyStatus: 'pending' | 'clean' | 'issues' | 'skipped' | 'error' | null
  verifyIssueCount: number | null
}

export type ConversationDetail = {
  id: string
  venueId: string
  userId: string | null
  channel: string
  visibility: 'private' | 'org'
  messages: ConversationMessage[]
}

const PREVIEW_MAX = 80

// Boundary check on the verifyStatus column. The only writer today is the
// typed `persistVerifyStatus` helper, but a future migration backfill or
// stray code path could leave junk in the column — and the client zod schema
// rejects unexpected enum values, which would break the whole conversation
// load. Drop unknown values to null so the badge just hides instead.
const KNOWN_VERIFY_STATUSES: ReadonlySet<NonNullable<ConversationMessage['verifyStatus']>> =
  new Set(['pending', 'clean', 'issues', 'skipped', 'error'])
function normaliseVerifyStatus(raw: string | null): ConversationMessage['verifyStatus'] {
  if (raw === null) return null
  return KNOWN_VERIFY_STATUSES.has(raw as NonNullable<ConversationMessage['verifyStatus']>)
    ? (raw as NonNullable<ConversationMessage['verifyStatus']>)
    : null
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1))}…`
}

@Injectable()
export class ConversationService {
  async listRecent(
    orgId: string,
    userId: string,
    venueId: string | undefined,
    limit = 40,
  ): Promise<ConversationSummary[]> {
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
      preview: r.messages[0]?.content ? truncate(r.messages[0].content, PREVIEW_MAX) : null,
    }))
  }

  // Cross-tenant 404-not-403: return null when foreign tenant or soft-deleted;
  // controller maps null → 404 NotFoundException. Owner gating: when
  // visibility='private' the requester must be the original creator (or the
  // row must be a legacy WhatsApp thread with userId=null). When
  // visibility='org' any caller in the same org can read — that's the share
  // link case. The cross-org check above is unchanged.
  async getById(
    conversationId: string,
    orgId: string,
    userId: string,
    venueId: string,
  ): Promise<ConversationDetail | null> {
    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        venueId: true,
        userId: true,
        channel: true,
        visibility: true,
        deletedAt: true,
        venue: { select: { organizationId: true } },
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
            retrievedItemIds: true,
            followUps: true,
            reasoning: true,
            parts: true,
            toolCallLog: true,
            verifyStatus: true,
            verifyIssueCount: true,
            feedback: { select: { kind: true } },
          },
        },
      },
    })
    if (
      !conv ||
      conv.deletedAt !== null ||
      conv.venueId !== venueId ||
      conv.venue.organizationId !== orgId
    ) {
      return null
    }
    // Private rows: only the creator can read. Legacy WhatsApp threads have
    // userId=null and stay readable by any org member (no human owner to gate
    // on). 'org' rows are open to anyone passing the cross-org check above.
    const ownerOrLegacy = conv.userId === null || conv.userId === userId
    if (conv.visibility !== 'org' && !ownerOrLegacy) {
      return null
    }
    const visibility = conv.visibility === 'org' ? 'org' : 'private'
    return {
      id: conv.id,
      venueId: conv.venueId,
      userId: conv.userId,
      channel: conv.channel,
      visibility,
      messages: conv.messages.map((m) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        retrievedItemIds: m.retrievedItemIds,
        followUps: m.followUps,
        reasoning: m.reasoning,
        parts: m.parts ?? undefined,
        toolCallLog: Array.isArray(m.toolCallLog) ? (m.toolCallLog as unknown[]) : undefined,
        feedbackKind: (m.feedback?.kind ?? null) as string | null,
        verifyStatus: normaliseVerifyStatus(m.verifyStatus),
        verifyIssueCount: m.verifyIssueCount,
      })),
    }
  }

  // Idempotent — already-deleted rows still throw "not found" so the controller
  // returns 404 (matches chat-v1 behaviour and the cross-tenant 404 contract).
  async softDelete(
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
}
