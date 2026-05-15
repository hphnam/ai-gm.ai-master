import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { NotificationsService } from './notifications.service'

// Per-sender per-recipient sliding-window throttle. Mirrors the reply rate
// limit in notifications.service (8/min). Cap is in-memory — single Nest
// process is OK; swap to a Redis token bucket when scaling horizontally.
// Stops a bored / malicious org member from spamming another teammate's
// inbox + bell badge + realtime stream at request rate.
const SEND_WINDOW_MS = 60_000
const SEND_LIMIT_PER_WINDOW = 12
const sendRateLimit = (() => {
  const buckets = new Map<string, number[]>()
  return {
    allow(fromUserId: string, toUserId: string): boolean {
      const key = `${fromUserId}:${toUserId}`
      const now = Date.now()
      const cutoff = now - SEND_WINDOW_MS
      const recent = (buckets.get(key) ?? []).filter((t) => t > cutoff)
      if (recent.length >= SEND_LIMIT_PER_WINDOW) {
        buckets.set(key, recent)
        return false
      }
      recent.push(now)
      buckets.set(key, recent)
      return true
    },
  }
})()

export type ConversationSummary = {
  otherParty: { id: string; name: string | null; email: string }
  latestPreview: string
  latestAt: string
  latestFromMe: boolean
  latestViaAi: boolean
  unreadCount: number
}

export type ConversationMessage = {
  id: string
  kind: 'note' | 'reply'
  body: string
  sentAt: string
  fromMe: boolean
  author: { id: string; name: string | null; email: string } | null
  viaAi: boolean
  status: 'unread' | 'read'
  // Whether the requesting user can still hard-delete this message for
  // everyone. True iff fromMe AND sentAt is within DELETE_FOR_ALL_WINDOW_MS.
  canDeleteForAll: boolean
}

// "Delete for everyone" window. Matches WhatsApp's "delete for everyone"
// affordance — short enough that recipients usually haven't seen the
// message yet, long enough that the user has time to realise they made
// a mistake. 5 minutes is the common pattern.
export const DELETE_FOR_ALL_WINDOW_MS = 5 * 60 * 1000

export type DeleteMessageScope = 'self' | 'all'
export type DeleteMessageKind = 'note' | 'reply'

class InvalidConversationCursorError extends Error {
  constructor() {
    super('invalid-cursor')
    this.name = 'InvalidConversationCursorError'
  }
}

export { InvalidConversationCursorError }

// Cursor used for message-history pagination. Same base64url(createdAtIso|id)
// shape as the inbox list endpoint — see notifications.service for rationale.
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64url')
}

function decodeCursor(raw: string | undefined): { createdAt: Date; id: string } | null {
  if (!raw) return null
  let decoded: string
  try {
    decoded = Buffer.from(raw, 'base64url').toString('utf8')
  } catch {
    throw new InvalidConversationCursorError()
  }
  const sep = decoded.lastIndexOf('|')
  if (sep <= 0 || sep === decoded.length - 1) throw new InvalidConversationCursorError()
  const iso = decoded.slice(0, sep)
  const id = decoded.slice(sep + 1)
  if (id.length === 0 || id.length > 64) throw new InvalidConversationCursorError()
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) throw new InvalidConversationCursorError()
  return { createdAt: date, id }
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /// Conversation list = distinct other-party for chat-category Notifications
  /// where the requesting user is on either side. Aggregates latest message
  /// metadata + unread count per row. System-authored (null author) rows are
  /// excluded — those belong in Alerts, not Conversations.
  async list(orgId: string, userId: string): Promise<ConversationSummary[]> {
    // Raw SQL via Prisma because Prisma's relational API can't express the
    // "ROW_NUMBER() OVER (PARTITION BY other) WHERE rn=1" pattern cleanly.
    // We also need an aggregate (unread count) per group in the same pass.
    // Parameters are bound positionally — no string interpolation.
    type Row = {
      other_user_id: string
      latest_body: string
      latest_at: Date
      latest_from_me: boolean
      latest_source: string
      unread_count: bigint
      other_id: string
      other_name: string | null
      other_email: string
    }
    const rows = await prisma.$queryRaw<Row[]>`
      WITH msgs AS (
        SELECT
          n."id",
          n."createdAt",
          n."body",
          n."source",
          n."status",
          n."authorUserId",
          n."recipientUserId",
          CASE
            WHEN n."authorUserId" = ${userId} THEN n."recipientUserId"
            ELSE n."authorUserId"
          END AS other_user_id
        FROM "notifications" n
        WHERE n."organizationId" = ${orgId}
          AND n."category" = 'chat'
          AND n."authorUserId" IS NOT NULL
          AND (n."authorUserId" = ${userId} OR n."recipientUserId" = ${userId})
          -- Exclude self-authored, self-recipient rows. compose() blocks these
          -- now, but stale rows from before the guard (or future paths) would
          -- surface as a confusing "conversation to self" the user can't
          -- delete (hideConversation refuses self-id).
          AND NOT (n."authorUserId" = ${userId} AND n."recipientUserId" = ${userId})
          -- Skip notifications the requesting user has hidden for themselves.
          AND NOT EXISTS (
            SELECT 1 FROM "hidden_messages" hm
            WHERE hm."notificationId" = n."id" AND hm."userId" = ${userId}
          )
      ),
      latest AS (
        SELECT DISTINCT ON (other_user_id)
          other_user_id,
          "id" AS latest_id,
          "body" AS latest_body,
          "createdAt" AS latest_at,
          "source" AS latest_source,
          ("authorUserId" = ${userId}) AS latest_from_me
        FROM msgs
        ORDER BY other_user_id, "createdAt" DESC, "id" DESC
      ),
      unread AS (
        SELECT other_user_id, COUNT(*)::bigint AS unread_count
        FROM msgs
        WHERE "recipientUserId" = ${userId} AND "status" = 'unread'
        GROUP BY other_user_id
      )
      SELECT
        l.other_user_id,
        l.latest_body,
        l.latest_at,
        l.latest_from_me,
        l.latest_source,
        COALESCE(u.unread_count, 0) AS unread_count,
        usr."id" AS other_id,
        usr."name" AS other_name,
        usr."email" AS other_email
      FROM latest l
      LEFT JOIN unread u ON u.other_user_id = l.other_user_id
      INNER JOIN "users" usr ON usr."id" = l.other_user_id
      -- "Delete chat" hides the row entirely for the requesting user, until
      -- the other party sends a new message (which deletes the hidden row
      -- in the compose path and the conversation resurfaces).
      WHERE NOT EXISTS (
        SELECT 1 FROM "conversation_hidden" ch
        WHERE ch."userId" = ${userId}
          AND ch."otherUserId" = l.other_user_id
          AND ch."organizationId" = ${orgId}
      )
      ORDER BY l.latest_at DESC
      LIMIT 100
    `
    return rows.map((r) => ({
      otherParty: {
        id: r.other_id,
        name: r.other_name,
        email: r.other_email,
      },
      latestPreview: r.latest_body,
      latestAt: r.latest_at.toISOString(),
      latestFromMe: r.latest_from_me,
      // chat-tool source signals AI-composed; manual is human-typed.
      latestViaAi: r.latest_from_me && r.latest_source === 'chat',
      unreadCount: Number(r.unread_count),
    }))
  }

  /// Message history between the requesting user and `otherUserId`. Merges
  /// (a) Notifications between the two, and (b) NotificationReplies on those
  /// notifications, into a single chronological stream. Older-first within
  /// the response (so the client can scroll-to-bottom render); the next
  /// cursor points at older messages (scroll-up loads).
  async listMessages(
    orgId: string,
    userId: string,
    otherUserId: string,
    opts: { limit: number; cursor?: string },
  ): Promise<{
    messages: ConversationMessage[]
    otherParty: { id: string; name: string | null; email: string }
    nextCursor: string | null
    hasMore: boolean
  }> {
    if (otherUserId === userId) {
      throw new BadRequestException({ error: 'invalid-conversation' })
    }
    // Resolve the other party + confirm they share the org with the
    // requesting user. If not, treat as not-found (single 404 collapses the
    // org-membership and not-a-user oracles).
    const [me, them] = await Promise.all([
      prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        select: { userId: true },
      }),
      prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true, name: true, email: true },
      }),
    ])
    if (!me) throw new NotFoundException({ error: 'conversation-not-found' })
    if (!them) throw new NotFoundException({ error: 'conversation-not-found' })
    const themMember = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: otherUserId, organizationId: orgId } },
      select: { userId: true },
    })
    if (!themMember) throw new NotFoundException({ error: 'conversation-not-found' })

    const cursor = decodeCursor(opts.cursor)
    const cursorPredicate = cursor
      ? {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }
      : {}

    // Conversation-scoped participants predicate, reused by BOTH the notes
    // query AND the replies query (the reply's parent must be in the same
    // conversation). authorUserId not-null filter excludes system-authored
    // rows (those belong in Alerts).
    const participantsPredicate = {
      organizationId: orgId,
      category: 'chat',
      authorUserId: { not: null, in: [userId, otherUserId] },
      OR: [
        { authorUserId: userId, recipientUserId: otherUserId },
        { authorUserId: otherUserId, recipientUserId: userId },
      ],
    }

    // Pull notes between the two participants, time-filtered by cursor.
    // The `hiddenBy: { none: { userId } }` predicate skips notes the
    // requesting user has soft-deleted for themselves.
    const notes = await prisma.notification.findMany({
      where: {
        ...participantsPredicate,
        ...cursorPredicate,
        hiddenBy: { none: { userId } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: opts.limit + 1,
      select: {
        id: true,
        body: true,
        source: true,
        status: true,
        createdAt: true,
        authorUserId: true,
        author: { select: { id: true, name: true, email: true } },
      },
    })
    // Replies on ANY notification in this conversation, time-filtered by the
    // cursor on the REPLY's own createdAt. We deliberately don't filter by
    // current-page parent IDs — a reply on an in-window parent can have its
    // own older createdAt that crosses page boundaries, and scoping to the
    // page's parent IDs would silently drop those replies across pagination.
    const replies = await prisma.notificationReply.findMany({
      where: {
        // Replies must (a) be in the conversation AND (b) have a parent
        // that the user hasn't soft-deleted ("Delete for me" on a parent
        // hides its whole thread — matches WhatsApp's semantics where
        // tapping delete on a message hides any subsequent context).
        notification: {
          ...participantsPredicate,
          hiddenBy: { none: { userId } },
        },
        ...cursorPredicate,
        hiddenBy: { none: { userId } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: opts.limit + 1,
      select: {
        id: true,
        body: true,
        createdAt: true,
        authorUserId: true,
        author: { select: { id: true, name: true, email: true } },
      },
    })

    // Merge into a unified stream, newest-first.
    type Merged = {
      id: string
      kind: 'note' | 'reply'
      body: string
      sentAt: Date
      authorUserId: string | null
      author: { id: string; name: string | null; email: string } | null
      source: string | null
      status: 'unread' | 'read'
    }
    const merged: Merged[] = [
      ...notes.map<Merged>((n) => ({
        id: n.id,
        kind: 'note',
        body: n.body,
        sentAt: n.createdAt,
        authorUserId: n.authorUserId,
        author: n.author,
        source: n.source,
        status: n.status === 'unread' ? 'unread' : 'read',
      })),
      ...replies.map<Merged>((r) => ({
        id: r.id,
        kind: 'reply',
        body: r.body,
        sentAt: r.createdAt,
        authorUserId: r.authorUserId,
        author: r.author,
        source: null,
        status: 'read',
      })),
    ].sort((a, b) => {
      const t = b.sentAt.getTime() - a.sentAt.getTime()
      if (t !== 0) return t
      return b.id.localeCompare(a.id)
    })

    const hasMore = merged.length > opts.limit
    const pageNewestFirst = hasMore ? merged.slice(0, opts.limit) : merged
    const oldest = pageNewestFirst[pageNewestFirst.length - 1]
    const nextCursor = hasMore && oldest ? encodeCursor(oldest.sentAt, oldest.id) : null

    // Return oldest-first so the chat view can render bottom-anchored. The
    // cursor still points at the OLDEST item in this page so "load older"
    // appends to the top.
    const now = Date.now()
    const messages: ConversationMessage[] = pageNewestFirst
      .slice()
      .reverse()
      .map((m) => {
        const fromMe = m.authorUserId === userId
        const ageMs = now - m.sentAt.getTime()
        return {
          id: m.id,
          kind: m.kind,
          body: m.body,
          sentAt: m.sentAt.toISOString(),
          fromMe,
          author: m.author,
          viaAi: fromMe && m.source === 'chat',
          status: m.status,
          // "Delete for everyone" is author-only and time-bounded. Surface
          // the eligibility to the client so the menu doesn't show the
          // option when it would 400.
          canDeleteForAll: fromMe && ageMs <= DELETE_FOR_ALL_WINDOW_MS,
        }
      })

    return {
      messages,
      otherParty: { id: them.id, name: them.name, email: them.email },
      nextCursor,
      hasMore,
    }
  }

  /// Send a chat message — thin wrapper over notifications.compose with
  /// category='chat'. The recipient must be a current org member; the
  /// existing self-recipient + org-membership guards apply.
  async sendMessage(
    orgId: string,
    fromUserId: string,
    toUserId: string,
    body: string,
  ): Promise<ConversationMessage> {
    if (fromUserId === toUserId) {
      throw new BadRequestException({ error: 'invalid-recipient' })
    }
    if (!sendRateLimit.allow(fromUserId, toUserId)) {
      throw new HttpException({ error: 'send-rate-limit' }, HttpStatus.TOO_MANY_REQUESTS)
    }
    // Auto-unhide BEFORE compose — compose emits the realtime
    // notification.created event to the recipient, and the recipient's
    // socket handler refetches their conversation list. If the unhide ran
    // after, the refetch would still see the conversation_hidden row and
    // the new message wouldn't surface until the next event/refresh.
    await prisma.conversationHidden.deleteMany({
      where: {
        organizationId: orgId,
        OR: [
          { userId: fromUserId, otherUserId: toUserId },
          { userId: toUserId, otherUserId: fromUserId },
        ],
      },
    })
    const note = await this.notifications.compose(orgId, fromUserId, toUserId, body, {
      category: 'chat',
    })
    return {
      id: note.id,
      kind: 'note',
      body: note.body,
      sentAt: note.createdAt,
      fromMe: true,
      author: note.author,
      // A message sent through the human chat surface is `source: 'manual'`,
      // not 'chat' (which is reserved for AI-composed via the chat tool).
      viaAi: false,
      status: note.status,
      canDeleteForAll: true,
    }
  }

  /// "Delete chat" — hide the conversation from the requesting user's list.
  /// Idempotent. Other party retains their copy. A new chat message between
  /// the same pair (in either direction) auto-undoes this hide.
  async hideConversation(orgId: string, userId: string, otherUserId: string): Promise<void> {
    if (userId === otherUserId) {
      throw new BadRequestException({ error: 'invalid-conversation' })
    }
    // Match the listMessages 404 oracle: collapse "user not in org" and
    // "user doesn't exist" into a single conversation-not-found. Without
    // this gate, an authenticated org member could probe global user-id
    // existence by watching FK-success vs. FK-violation responses.
    const themMember = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: otherUserId, organizationId: orgId } },
      select: { userId: true },
    })
    if (!themMember) {
      throw new NotFoundException({ error: 'conversation-not-found' })
    }
    await prisma.conversationHidden.upsert({
      where: {
        userId_otherUserId_organizationId: {
          userId,
          otherUserId,
          organizationId: orgId,
        },
      },
      create: { userId, otherUserId, organizationId: orgId },
      update: {},
    })
  }

  /// Delete a single message.
  ///
  /// scope = 'self' — adds a hidden_messages row for the user. Idempotent.
  /// scope = 'all'  — hard-deletes the underlying notification or reply.
  ///   Requires the user to be the author AND the message to be within
  ///   DELETE_FOR_ALL_WINDOW_MS. Cascade deletes any replies + hidden_messages.
  ///   Fires a realtime event to both participants so their open thread
  ///   view drops the bubble in real time.
  async deleteMessage(
    orgId: string,
    userId: string,
    otherUserId: string,
    kind: DeleteMessageKind,
    messageId: string,
    scope: DeleteMessageScope,
  ): Promise<void> {
    // Resolve the message + verify the requesting user participates in the
    // conversation (we don't trust the otherUserId path param alone — a
    // crafted request could pair `messageId` with the wrong otherUserId).
    if (kind === 'note') {
      const note = await prisma.notification.findFirst({
        where: {
          id: messageId,
          organizationId: orgId,
          category: 'chat',
          authorUserId: { not: null },
          OR: [
            { authorUserId: userId, recipientUserId: otherUserId },
            { authorUserId: otherUserId, recipientUserId: userId },
          ],
        },
        select: {
          id: true,
          authorUserId: true,
          recipientUserId: true,
          createdAt: true,
        },
      })
      if (!note) throw new NotFoundException({ error: 'message-not-found' })

      if (scope === 'self') {
        await prisma.hiddenMessage.upsert({
          where: { userId_notificationId: { userId, notificationId: messageId } },
          create: { userId, notificationId: messageId },
          update: {},
        })
        return
      }

      // scope = 'all'
      if (note.authorUserId !== userId) {
        throw new ForbiddenException({ error: 'not-author' })
      }
      const ageMs = Date.now() - note.createdAt.getTime()
      if (ageMs > DELETE_FOR_ALL_WINDOW_MS) {
        throw new BadRequestException({ error: 'delete-window-expired' })
      }
      await prisma.notification.delete({ where: { id: messageId } })
      // Emit to both participants so their open chat views drop the bubble.
      const participants = [note.authorUserId, note.recipientUserId].filter((x): x is string => !!x)
      for (const uid of new Set(participants)) {
        this.realtime.emitNotificationDeleted(uid, {
          kind: 'note',
          messageId: note.id,
          otherUserId: uid === note.authorUserId ? note.recipientUserId : note.authorUserId,
        })
      }
      return
    }

    // kind === 'reply'
    const reply = await prisma.notificationReply.findFirst({
      where: {
        id: messageId,
        notification: {
          organizationId: orgId,
          category: 'chat',
          authorUserId: { not: null },
          OR: [
            { authorUserId: userId, recipientUserId: otherUserId },
            { authorUserId: otherUserId, recipientUserId: userId },
          ],
        },
      },
      select: {
        id: true,
        authorUserId: true,
        createdAt: true,
        notification: {
          select: { authorUserId: true, recipientUserId: true },
        },
      },
    })
    if (!reply) throw new NotFoundException({ error: 'message-not-found' })

    if (scope === 'self') {
      await prisma.hiddenMessage.upsert({
        where: { userId_replyId: { userId, replyId: messageId } },
        create: { userId, replyId: messageId },
        update: {},
      })
      return
    }

    if (reply.authorUserId !== userId) {
      throw new ForbiddenException({ error: 'not-author' })
    }
    const ageMs = Date.now() - reply.createdAt.getTime()
    if (ageMs > DELETE_FOR_ALL_WINDOW_MS) {
      throw new BadRequestException({ error: 'delete-window-expired' })
    }
    await prisma.notificationReply.delete({ where: { id: messageId } })
    const participants = [
      reply.notification.authorUserId,
      reply.notification.recipientUserId,
    ].filter((x): x is string => !!x)
    for (const uid of new Set(participants)) {
      this.realtime.emitNotificationDeleted(uid, {
        kind: 'reply',
        messageId: reply.id,
        otherUserId:
          uid === reply.notification.authorUserId
            ? reply.notification.recipientUserId
            : reply.notification.authorUserId,
      })
    }
  }

  /// Mark every unread chat notification FROM otherUserId TO me as read in
  /// a single UPDATE. Idempotent — returns the number of rows touched.
  /// Realtime: re-uses the existing notification.updated 'all-read' event so
  /// the user's other tabs sync without polling.
  async markRead(orgId: string, userId: string, otherUserId: string): Promise<number> {
    if (otherUserId === userId) return 0
    const now = new Date()
    const result = await prisma.notification.updateMany({
      where: {
        organizationId: orgId,
        recipientUserId: userId,
        authorUserId: otherUserId,
        category: 'chat',
        status: 'unread',
      },
      data: { status: 'read', readAt: now },
    })
    if (result.count > 0) {
      // We piggy-back on the existing 'all-read' kind because the per-id
      // event would require N emits. The client treats any 'all-read' event
      // as "re-fetch your unread state and your conversation badges" which
      // is correct.
      this.realtime.emitNotificationUpdated(userId, {
        kind: 'all-read',
        readAt: now.toISOString(),
      })
    }
    return result.count
  }
}
