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

export type NotificationCategory = 'chat' | 'report' | 'compliance' | 'task' | 'system'

export type NotificationParty = { id: string; name: string | null; email: string }

/// Open enum — the alerts renderer only special-cases known kinds (task,
/// report) but stores whatever upstream services set, so adding a new
/// reference type doesn't need a migration.
export type NotificationReferenceKind = 'task' | 'report' | 'compliance' | string

export type NotificationReference = {
  kind: NotificationReferenceKind
  id: string
} | null

export type NotificationRow = {
  id: string
  body: string
  source: 'chat' | 'whatsapp' | 'manual'
  category: NotificationCategory
  automated: boolean
  reference: NotificationReference
  status: 'unread' | 'read'
  createdAt: string
  readAt: string | null
  author: NotificationParty | null
  recipient: NotificationParty
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
const KNOWN_CATEGORIES = new Set<NotificationCategory>([
  'chat',
  'report',
  'compliance',
  'task',
  'system',
])

// Opaque cursor: `base64url(createdAtIso|id)`. The pipe is forbidden in ISO 8601
// timestamps, so splitting on the last occurrence is unambiguous. Assumes
// millisecond precision on `createdAt`; if the column ever moves to
// timestamp(6), cursors at microsecond boundaries can skip rows.
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64url')
}

class InvalidCursorError extends Error {
  constructor() {
    super('invalid-cursor')
    this.name = 'InvalidCursorError'
  }
}

// Throws on malformed input rather than silently restarting from the top.
// Silent restart causes UI duplicates (the client thinks it advanced; the
// server returns page 1 again) and surfaces no signal that the cursor is
// stale across a deploy. Controller catches and returns 400 invalid-cursor;
// the client can react by clearing its infinite-query cache.
function decodeCursor(raw: string | undefined): { createdAt: Date; id: string } | null {
  if (!raw) return null
  let decoded: string
  try {
    decoded = Buffer.from(raw, 'base64url').toString('utf8')
  } catch {
    throw new InvalidCursorError()
  }
  const sep = decoded.lastIndexOf('|')
  if (sep <= 0 || sep === decoded.length - 1) throw new InvalidCursorError()
  const iso = decoded.slice(0, sep)
  const id = decoded.slice(sep + 1)
  if (id.length === 0 || id.length > 64) throw new InvalidCursorError()
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) throw new InvalidCursorError()
  return { createdAt: date, id }
}

export { InvalidCursorError }

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private readonly realtime: RealtimeGateway) {}

  async list(
    orgId: string,
    userId: string,
    opts: {
      status: 'unread' | 'read' | 'all'
      direction: 'inbox' | 'sent'
      limit: number
      cursor?: string
      q?: string
      category?: NotificationCategory[]
    },
  ): Promise<{
    notifications: NotificationRow[]
    unreadCount: number
    nextCursor: string | null
    hasMore: boolean
  }> {
    const cursor = decodeCursor(opts.cursor)
    // Keystone tuple: (createdAt DESC, id DESC). The (createdAt < cursor) OR
    // (createdAt = cursor AND id < cursorId) clause guarantees a strict
    // monotonic walk even when two notifications share createdAt to the
    // millisecond (common in batch jobs that fire reminders in a tight loop).
    const cursorClause = cursor
      ? {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }
      : {}
    const searchClause = opts.q ? { body: { contains: opts.q, mode: 'insensitive' as const } } : {}
    const categoryClause = opts.category?.length ? { category: { in: opts.category } } : {}
    // Direction picks which FK to scope on. `sent` deliberately excludes
    // system-authored rows because their authorUserId is null — the user
    // didn't send them, and surfacing them here would conflate "things I
    // sent" with "things the system sent on behalf of nobody".
    const directionClause =
      opts.direction === 'sent' ? { authorUserId: userId } : { recipientUserId: userId }
    // Status filter only makes sense on the inbox — `unread`/`read` is the
    // *recipient's* state. In Sent view the sender hasn't got an unread/read
    // state on their own outgoing messages, so we ignore it.
    const statusClause =
      opts.direction === 'inbox' && opts.status !== 'all' ? { status: opts.status } : {}
    const where = {
      organizationId: orgId,
      ...directionClause,
      ...statusClause,
      ...cursorClause,
      ...searchClause,
      ...categoryClause,
    }
    const take = opts.limit + 1 // fetch one extra row to determine hasMore without a count()
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        select: {
          id: true,
          body: true,
          source: true,
          category: true,
          automated: true,
          referenceKind: true,
          referenceId: true,
          status: true,
          createdAt: true,
          readAt: true,
          author: { select: { id: true, name: true, email: true } },
          recipient: { select: { id: true, name: true, email: true } },
        },
      }),
      // The unread count is always the inbox unread count, regardless of
      // which view is open — the bell badge should reflect a global "you have
      // unread mail" signal, not "you have unread items in the Sent view"
      // (which doesn't exist).
      prisma.notification.count({
        where: { organizationId: orgId, recipientUserId: userId, status: 'unread' },
      }),
    ])
    const hasMore = rows.length > opts.limit
    const page = hasMore ? rows.slice(0, opts.limit) : rows
    const last = page[page.length - 1]
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null
    return {
      notifications: page.map((r) => this.toRow(r)),
      unreadCount,
      nextCursor,
      hasMore,
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
        category: true,
        automated: true,
        referenceKind: true,
        referenceId: true,
        status: true,
        createdAt: true,
        readAt: true,
        author: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
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
    opts?: {
      category?: NotificationCategory
      automated?: boolean
      reference?: { kind: string; id: string } | null
    },
  ): Promise<NotificationRow> {
    const category: NotificationCategory =
      opts?.category && KNOWN_CATEGORIES.has(opts.category) ? opts.category : 'chat'
    const automated = opts?.automated === true
    const referenceKind = opts?.reference?.kind ?? null
    const referenceId = opts?.reference?.id ?? null
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
        category,
        automated,
        referenceKind,
        referenceId,
        body,
      },
      select: {
        id: true,
        body: true,
        source: true,
        category: true,
        automated: true,
        referenceKind: true,
        referenceId: true,
        status: true,
        createdAt: true,
        readAt: true,
        author: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
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
        automated,
        referenceKind,
      }),
    )
    // Two-room fan-out: the recipient gets `received` (toasts in their UI, bell
    // badge increments); the author gets `sent-confirmation` so their own
    // Sent view in another tab/device updates without polling. The author's
    // current tab also runs the mutation onSuccess invalidation; the socket
    // event is only load-bearing for cross-tab / cross-device.
    const basePayload = {
      id: row.id,
      body: row.body,
      source: row.source,
      category: row.category,
      automated: row.automated,
      reference: row.reference,
      createdAt: row.createdAt,
      author: row.author,
      recipient: row.recipient,
    }
    this.realtime.emitNotificationCreated(recipientUserId, {
      ...basePayload,
      kind: 'received',
    })
    this.realtime.emitNotificationCreated(authorUserId, {
      ...basePayload,
      kind: 'sent-confirmation',
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
    opts?: {
      category?: NotificationCategory
      reference?: { kind: string; id: string } | null
    },
  ): Promise<NotificationRow> {
    const category: NotificationCategory =
      opts?.category && KNOWN_CATEGORIES.has(opts.category) ? opts.category : 'system'
    const referenceKind = opts?.reference?.kind ?? null
    const referenceId = opts?.reference?.id ?? null
    const created = await prisma.notification.create({
      data: {
        organizationId: orgId,
        recipientUserId,
        authorUserId: null,
        source: 'chat',
        category,
        // System-composed by definition; no human author, no chat-tool route.
        automated: true,
        referenceKind,
        referenceId,
        body,
      },
      select: {
        id: true,
        body: true,
        source: true,
        category: true,
        automated: true,
        referenceKind: true,
        referenceId: true,
        status: true,
        createdAt: true,
        readAt: true,
        author: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
      },
    })
    const row = this.toRow(created)
    // System-authored: no author to notify, only the recipient sees this.
    this.realtime.emitNotificationCreated(recipientUserId, {
      kind: 'received',
      id: row.id,
      body: row.body,
      source: row.source,
      category: row.category,
      automated: row.automated,
      reference: row.reference,
      createdAt: row.createdAt,
      author: row.author,
      recipient: row.recipient,
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

    const participantIds = [parent.recipientUserId, parent.authorUserId].filter(
      (x): x is string => !!x,
    )
    // Build per-user payloads so each side's chat client can pinpoint the
    // conversation cache to bust. The other user is whichever participant
    // isn't the current target.
    const participantsForEvent = participantIds.map((uid) => ({
      userId: uid,
      otherUserId: participantIds.find((other) => other !== uid) ?? null,
    }))
    this.realtime.emitNotificationReplyCreated(participantsForEvent, {
      notificationId,
      reply: {
        id: reply.id,
        body: reply.body,
        createdAt: reply.createdAt,
        author: reply.author,
      },
    })
    return { reply, participants: participantIds }
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
    category: string
    automated: boolean
    referenceKind: string | null
    referenceId: string | null
    status: string
    createdAt: Date
    readAt: Date | null
    author: NotificationParty | null
    recipient: NotificationParty
  }): NotificationRow {
    // Defensive narrowing — DB columns are TEXT and could be widened by future
    // migrations or direct SQL inserts. Clamp to known values so the API
    // contract stays tight and the web's zod parser doesn't fail an entire
    // page load on an unexpected string.
    const source = KNOWN_SOURCES.has(r.source) ? (r.source as NotificationRow['source']) : 'chat'
    const status = KNOWN_STATUSES.has(r.status) ? (r.status as NotificationRow['status']) : 'unread'
    const category = KNOWN_CATEGORIES.has(r.category as NotificationCategory)
      ? (r.category as NotificationCategory)
      : 'chat'
    const reference: NotificationReference =
      r.referenceKind && r.referenceId ? { kind: r.referenceKind, id: r.referenceId } : null
    return {
      id: r.id,
      body: r.body,
      source,
      category,
      automated: r.automated === true,
      reference,
      status,
      createdAt: r.createdAt.toISOString(),
      readAt: r.readAt?.toISOString() ?? null,
      author: r.author ? { id: r.author.id, name: r.author.name, email: r.author.email } : null,
      recipient: {
        id: r.recipient.id,
        name: r.recipient.name,
        email: r.recipient.email,
      },
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
