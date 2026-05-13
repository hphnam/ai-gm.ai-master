import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { RealtimeGateway } from '../realtime/realtime.gateway'

export type NotificationRow = {
  id: string
  body: string
  source: 'chat' | 'whatsapp' | 'manual'
  status: 'unread' | 'read'
  createdAt: string
  readAt: string | null
  author: { id: string; name: string | null; email: string } | null
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
}
