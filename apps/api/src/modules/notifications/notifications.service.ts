import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { RealtimeGateway } from '../realtime/realtime.gateway'

// Per-author per-thread sliding-window throttle for reply writes. Single
// process — sufficient for the current Nest server; swap for a Redis token
// bucket when we scale horizontally. Reply spam is the obvious DoS vector
// here (a participant could otherwise flood another participant's bell), so
// we cap at 8 replies/minute per (author, thread) pair.
const REPLY_WINDOW_MS = 60_000
const REPLY_LIMIT_PER_WINDOW = 8
const replyRateLimit = (() => {
  const buckets = new Map<string, number[]>()
  return {
    allow(authorUserId: string, notificationId: string): boolean {
      const key = `${authorUserId}:${notificationId}`
      const now = Date.now()
      const cutoff = now - REPLY_WINDOW_MS
      const recent = (buckets.get(key) ?? []).filter((t) => t > cutoff)
      if (recent.length >= REPLY_LIMIT_PER_WINDOW) {
        buckets.set(key, recent)
        return false
      }
      recent.push(now)
      buckets.set(key, recent)
      return true
    },
  }
})()

export type NotificationRow = {
  id: string
  body: string
  source: 'chat' | 'whatsapp' | 'manual'
  status: 'unread' | 'read'
  createdAt: string
  readAt: string | null
  author: { id: string; name: string | null; email: string } | null
}

export type NotificationReplyRow = {
  id: string
  notificationId: string
  body: string
  createdAt: string
  author: { id: string; name: string | null; email: string }
}

const KNOWN_SOURCES = new Set(['chat', 'whatsapp', 'manual'])
const KNOWN_STATUSES = new Set(['unread', 'read'])

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private readonly realtime: RealtimeGateway) {}

  async list(
    orgId: string,
    userId: string,
    opts: { status: 'unread' | 'read' | 'all'; limit: number },
  ): Promise<{ notifications: NotificationRow[]; unreadCount: number }> {
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          organizationId: orgId,
          recipientUserId: userId,
          ...(opts.status === 'all' ? {} : { status: opts.status }),
        },
        orderBy: { createdAt: 'desc' },
        take: opts.limit,
        select: {
          id: true,
          body: true,
          source: true,
          status: true,
          createdAt: true,
          readAt: true,
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.notification.count({
        where: { organizationId: orgId, recipientUserId: userId, status: 'unread' },
      }),
    ])
    return {
      notifications: rows.map((r) => this.toRow(r)),
      unreadCount,
    }
  }

  async unreadCount(orgId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: { organizationId: orgId, recipientUserId: userId, status: 'unread' },
    })
  }

  async markRead(orgId: string, userId: string, notificationId: string): Promise<NotificationRow> {
    const updated = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        organizationId: orgId,
        recipientUserId: userId,
        status: 'unread',
      },
      data: { status: 'read', readAt: new Date() },
    })
    if (updated.count === 0) {
      const exists = await prisma.notification.findFirst({
        where: { id: notificationId, organizationId: orgId, recipientUserId: userId },
        select: { id: true },
      })
      if (!exists) {
        throw new NotFoundException({ error: 'notification-not-found' })
      }
    }
    const row = await prisma.notification.findFirstOrThrow({
      where: { id: notificationId, organizationId: orgId, recipientUserId: userId },
      select: {
        id: true,
        body: true,
        source: true,
        status: true,
        createdAt: true,
        readAt: true,
        author: { select: { id: true, name: true, email: true } },
      },
    })
    const mapped = this.toRow(row)
    if (mapped.readAt) {
      this.realtime.emitNotificationUpdated(userId, {
        kind: 'read',
        id: mapped.id,
        readAt: mapped.readAt,
      })
    }
    return mapped
  }

  async markAllRead(orgId: string, userId: string): Promise<number> {
    const now = new Date()
    const result = await prisma.notification.updateMany({
      where: { organizationId: orgId, recipientUserId: userId, status: 'unread' },
      data: { status: 'read', readAt: now },
    })
    if (result.count > 0) {
      this.realtime.emitNotificationUpdated(userId, {
        kind: 'all-read',
        readAt: now.toISOString(),
      })
    }
    return result.count
  }

  async compose(
    orgId: string,
    authorUserId: string,
    recipientUserId: string,
    body: string,
  ): Promise<NotificationRow> {
    // Recipient must be a member of the same org. Reject self-notes — almost
    // always an unintended action from the UI.
    if (recipientUserId === authorUserId) {
      throw new BadRequestException({ error: 'invalid-recipient' })
    }
    const member = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: recipientUserId, organizationId: orgId } },
      select: { userId: true },
    })
    if (!member) {
      throw new NotFoundException({ error: 'recipient-not-found' })
    }
    const created = await prisma.notification.create({
      data: {
        organizationId: orgId,
        recipientUserId,
        authorUserId,
        source: 'manual',
        body,
      },
      select: {
        id: true,
        body: true,
        source: true,
        status: true,
        createdAt: true,
        readAt: true,
        author: { select: { id: true, name: true, email: true } },
      },
    })
    const row = this.toRow(created)
    this.logger.log(
      JSON.stringify({
        event: 'notifications.compose',
        orgId,
        authorUserId,
        recipientUserId,
        notificationId: created.id,
        bodyLength: body.length,
      }),
    )
    this.realtime.emitNotificationCreated(recipientUserId, {
      id: row.id,
      body: row.body,
      source: row.source,
      createdAt: row.createdAt,
      author: row.author,
    })
    return row
  }

  /// System-authored notification — no human author, no self-recipient guard,
  /// no org-member resolution. Used by background jobs (task reminders, expiry
  /// scheduler, briefings) that need to put a row in someone's inbox without
  /// pretending to be another user. Caller is responsible for scoping orgId
  /// and recipientUserId; we still emit the realtime event so the bell badge
  /// updates without a refresh.
  async composeSystem(
    orgId: string,
    recipientUserId: string,
    body: string,
  ): Promise<NotificationRow> {
    const created = await prisma.notification.create({
      data: {
        organizationId: orgId,
        recipientUserId,
        authorUserId: null,
        source: 'chat',
        body,
      },
      select: {
        id: true,
        body: true,
        source: true,
        status: true,
        createdAt: true,
        readAt: true,
        author: { select: { id: true, name: true, email: true } },
      },
    })
    const row = this.toRow(created)
    this.realtime.emitNotificationCreated(recipientUserId, {
      id: row.id,
      body: row.body,
      source: row.source,
      createdAt: row.createdAt,
      author: row.author,
    })
    return row
  }

  /// Wave 4 — reply thread on a Notification. Only participants (recipient
  /// or author of the parent note) may read or write replies. System notes
  /// (authorUserId: null) have no reply path — return early so an attacker
  /// can't keep a thread "open" by replying to compliance reminders.
  async listReplies(
    orgId: string,
    userId: string,
    notificationId: string,
  ): Promise<NotificationReplyRow[]> {
    const parent = await prisma.notification.findFirst({
      where: { id: notificationId, organizationId: orgId },
      select: { recipientUserId: true, authorUserId: true },
    })
    // Collapse "not found" and "not a participant" into a single 404 — surfacing
    // a 403 for the latter would let an attacker enumerate notification ids by
    // comparing status codes. Notification UUIDs are v4 (high entropy) but the
    // oracle is trivial to remove and there's no legitimate reason to
    // distinguish here.
    if (!parent) throw new NotFoundException({ error: 'notification-not-found' })
    if (parent.recipientUserId !== userId && parent.authorUserId !== userId) {
      throw new NotFoundException({ error: 'notification-not-found' })
    }
    const replies = await prisma.notificationReply.findMany({
      where: { notificationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        notificationId: true,
        body: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true } },
      },
    })
    return replies.map((r) => this.toReplyRow(r))
  }

  async composeReply(
    orgId: string,
    authorUserId: string,
    notificationId: string,
    body: string,
  ): Promise<{ reply: NotificationReplyRow; participants: string[] }> {
    const parent = await prisma.notification.findFirst({
      where: { id: notificationId, organizationId: orgId },
      select: { id: true, recipientUserId: true, authorUserId: true },
    })
    if (!parent) throw new NotFoundException({ error: 'notification-not-found' })
    // System notes (authorUserId null) cannot be replied to — the system has
    // no inbox to receive the reply, and a one-sided thread is a footgun
    // ("why didn't anyone respond?"). Match the UI which hides the composer
    // entirely on system notes.
    if (parent.authorUserId === null) {
      throw new BadRequestException({ error: 'notification-not-repliable' })
    }
    // Participation gate — only the recipient or the original author can post
    // a reply. Collapse the 403 into 404 to avoid the same id-existence oracle
    // the read path already closes.
    const isParticipant =
      parent.recipientUserId === authorUserId || parent.authorUserId === authorUserId
    if (!isParticipant) {
      throw new NotFoundException({ error: 'notification-not-found' })
    }
    // Throttle reply writes per (author, thread). Caps spam at 8/min — well
    // above any human pace but tight enough that a scripted client can't
    // saturate another participant's realtime channel.
    if (!replyRateLimit.allow(authorUserId, notificationId)) {
      throw new HttpException({ error: 'reply-rate-limit' }, HttpStatus.TOO_MANY_REQUESTS)
    }

    const created = await prisma.notificationReply.create({
      data: { notificationId, authorUserId, body },
      select: {
        id: true,
        notificationId: true,
        body: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true } },
      },
    })
    const reply = this.toReplyRow(created)

    this.logger.log(
      JSON.stringify({
        event: 'notifications.reply',
        orgId,
        notificationId,
        replyId: reply.id,
        authorUserId,
        bodyLength: body.length,
      }),
    )

    const participants = [parent.recipientUserId, parent.authorUserId].filter(
      (x): x is string => !!x,
    )
    this.realtime.emitNotificationReplyCreated(participants, {
      notificationId,
      reply: {
        id: reply.id,
        body: reply.body,
        createdAt: reply.createdAt,
        author: reply.author,
      },
    })
    return { reply, participants }
  }

  async listOrgMembers(
    orgId: string,
    excludeUserId: string,
  ): Promise<Array<{ userId: string; name: string | null; email: string; role: string }>> {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId, NOT: { userId: excludeUserId } },
      select: {
        userId: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ user: { name: 'asc' } }, { user: { email: 'asc' } }],
      take: 200,
    })
    return members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }))
  }

  private toRow(r: {
    id: string
    body: string
    source: string
    status: string
    createdAt: Date
    readAt: Date | null
    author: { id: string; name: string | null; email: string } | null
  }): NotificationRow {
    // Defensive narrowing — DB columns are TEXT and could be widened by future
    // migrations or direct SQL inserts. Clamp to known values so the API
    // contract stays tight and the web's zod parser doesn't fail an entire
    // page load on an unexpected string.
    const source = KNOWN_SOURCES.has(r.source) ? (r.source as NotificationRow['source']) : 'chat'
    const status = KNOWN_STATUSES.has(r.status) ? (r.status as NotificationRow['status']) : 'unread'
    return {
      id: r.id,
      body: r.body,
      source,
      status,
      createdAt: r.createdAt.toISOString(),
      readAt: r.readAt?.toISOString() ?? null,
      author: r.author ? { id: r.author.id, name: r.author.name, email: r.author.email } : null,
    }
  }

  private toReplyRow(r: {
    id: string
    notificationId: string
    body: string
    createdAt: Date
    author: { id: string; name: string | null; email: string }
  }): NotificationReplyRow {
    return {
      id: r.id,
      notificationId: r.notificationId,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      author: { id: r.author.id, name: r.author.name, email: r.author.email },
    }
  }
}
