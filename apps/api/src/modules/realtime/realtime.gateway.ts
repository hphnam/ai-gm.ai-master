import { Logger } from '@nestjs/common'
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { fromNodeHeaders } from 'better-auth/node'
import type { Server, Socket } from 'socket.io'
import { prisma } from '../../database/prisma'
import { auth } from '../auth/auth.config'

// Per-organisation pub/sub. Frontend connects with credentials; on handshake
// we pull better-auth session out of the cookie, look up the user's active
// org, and join that org's room. From then on the only outbound traffic is
// `doc.updated` events emitted by services.
//
// CORS mirrors the express config: allowlist + credentials. The handshake is
// HTTP so the existing cookie-based auth Just Works™ — no token negotiation.
@WebSocketGateway({
  cors: {
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
  },
  // Default namespace ("/"). Path can stay default ("/socket.io") so the
  // client doesn't need to override it.
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name)

  @WebSocketServer()
  server!: Server

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const headers = fromNodeHeaders(socket.handshake.headers)
      const session = await auth.api.getSession({ headers }).catch(() => null)
      if (!session?.user) {
        socket.emit('unauthorized')
        socket.disconnect(true)
        return
      }

      const sessionRow = session.session as {
        activeOrganizationId?: string | null
      }
      const preferredOrgId = sessionRow.activeOrganizationId ?? null

      const membership = preferredOrgId
        ? await prisma.organizationMember.findFirst({
            where: { userId: session.user.id, organizationId: preferredOrgId },
            select: { organizationId: true },
          })
        : await prisma.organizationMember.findFirst({
            where: { userId: session.user.id },
            select: { organizationId: true },
          })

      if (!membership) {
        socket.emit('unauthorized')
        socket.disconnect(true)
        return
      }

      const orgRoom = roomFor(membership.organizationId)
      const userRoom = userRoomFor(session.user.id)
      await socket.join([orgRoom, userRoom])
      socket.data.orgId = membership.organizationId
      socket.data.userId = session.user.id

      this.logger.log(
        JSON.stringify({
          level: 'log',
          event: 'realtime.connected',
          socketId: socket.id,
          orgId: membership.organizationId,
          userId: session.user.id,
        }),
      )
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'realtime.connect_failed',
          message: (err as Error)?.message ?? 'unknown',
        }),
      )
      socket.disconnect(true)
    }
  }

  handleDisconnect(socket: Socket): void {
    const orgId = (socket.data?.orgId as string | undefined) ?? null
    if (orgId) {
      this.logger.log(
        JSON.stringify({
          level: 'log',
          event: 'realtime.disconnected',
          socketId: socket.id,
          orgId,
        }),
      )
    }
  }

  // Called by services after any KnowledgeItem state change. Frontend listens
  // and invalidates React Query caches. Payload is intentionally tiny — the
  // client refetches the row to get the canonical data.
  emitDocUpdated(orgId: string, payload: { id: string; status: string }): void {
    this.server?.to(roomFor(orgId)).emit('doc.updated', payload)
  }

  // Hook for future events (gaps, chat, nudges) — same room semantics.
  emitGapUpdated(
    orgId: string,
    payload: { id: string; status: 'created' | 'answered' | 'deleted' },
  ): void {
    this.server?.to(roomFor(orgId)).emit('gap.updated', payload)
  }

  // Per-recipient notifications. Targeted to the user's private room so other
  // org members never see another user's inbox events. Payload mirrors the
  // NotificationRow shape from notifications.service so the client can render
  // optimistically without an extra fetch.
  emitNotificationCreated(
    recipientUserId: string,
    payload: {
      id: string
      body: string
      source: 'chat' | 'whatsapp' | 'manual'
      createdAt: string
      author: { id: string; name: string | null; email: string } | null
    },
  ): void {
    this.server?.to(userRoomFor(recipientUserId)).emit('notification.created', payload)
  }

  // Fires on mark-read / mark-all-read so other tabs of the same user sync.
  emitNotificationUpdated(
    recipientUserId: string,
    payload: { kind: 'read'; id: string; readAt: string } | { kind: 'all-read'; readAt: string },
  ): void {
    this.server?.to(userRoomFor(recipientUserId)).emit('notification.updated', payload)
  }

  // A new chat conversation row was created (or first-message-on-existing).
  // User-scoped because the conversations sidebar is per-user; WhatsApp inbound
  // creates a conversation for the matched user, and this event lets their
  // open web tab populate the sidebar in real time without polling.
  emitChatConversationUpserted(
    userId: string,
    payload: { id: string; venueId: string; channel: string },
  ): void {
    this.server?.to(userRoomFor(userId)).emit('chat.conversation.upserted', payload)
  }

  // WhatsApp invite status changed (pending → redeemed | revoked | exhausted | expired).
  // Org-scoped — any manager/owner watching the invites list should see it.
  emitWhatsappInviteUpdated(
    orgId: string,
    payload: { id: string; status: 'redeemed' | 'revoked' | 'exhausted' | 'expired' },
  ): void {
    this.server?.to(roomFor(orgId)).emit('whatsapp.invite.updated', payload)
  }

  // Phone verification status flipped for the given user. User-scoped so
  // other tabs of the same user (e.g. settings open) update without a refresh.
  emitPhoneStatusChanged(
    userId: string,
    payload: { phoneNumber: string; phoneVerifiedAt: string },
  ): void {
    this.server?.to(userRoomFor(userId)).emit('phone.status.changed', payload)
  }
}

function roomFor(orgId: string): string {
  return `org:${orgId}`
}

function userRoomFor(userId: string): string {
  return `user:${userId}`
}
