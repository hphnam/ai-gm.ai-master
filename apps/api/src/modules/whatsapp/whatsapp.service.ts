import { createHash } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '@gm-ai/database'
import {
  CHAT_TIMEOUT_MS,
  VERIFIED_SENDER_LIMIT_PER_HOUR,
  type TwilioWebhookPayload,
} from '@gm-ai/types'
import { ChatService } from '../chat/chat.service'
import { WhatsAppAdapter } from './whatsapp.adapter'
import { recordAndCheckOnboardingReply } from './unknown-number-rate-limit'
import { recordAndCheckVerifiedSender } from './verified-sender-rate-limit'
import { markAndCheckSid } from './seen-message-sids'

const WA_CONVERSATION_IDLE_MS = 2 * 60 * 60 * 1000
const WA_CHANNEL = 'whatsapp'

function sha256Prefix(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16)
}

function stripWhatsappPrefix(from: string): string {
  return from.startsWith('whatsapp:') ? from.slice('whatsapp:'.length) : from
}

function classifyMedia(
  payload: TwilioWebhookPayload,
): 'none' | 'image' | 'audio' | 'other' {
  const numMedia = parseInt(payload.NumMedia ?? '0', 10)
  const ct = payload.MediaContentType0 ?? ''
  if (numMedia === 0 && !ct) return 'none'
  if (ct.startsWith('image/')) return 'image'
  if (ct.startsWith('audio/')) return 'audio'
  if (ct.startsWith('video/')) return 'other'
  return numMedia >= 1 ? 'other' : 'none'
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name)

  constructor(
    private readonly adapter: WhatsAppAdapter,
    private readonly chatService: ChatService,
  ) {}

  async handleInbound(payload: TwilioWebhookPayload): Promise<void> {
    // audit-added M3: MessageSid idempotency — dedupe Twilio retries + replay attacks.
    const dedupe = markAndCheckSid(payload.MessageSid)
    if (dedupe.seen) {
      this.logger.log('whatsapp.replay_dedupe', {
        messageSid: payload.MessageSid,
        from: sha256Prefix(payload.From),
      })
      return
    }

    // Media classification first — before any DB / ChatService work.
    const mediaKind = classifyMedia(payload)
    if (mediaKind !== 'none') {
      await this.handleUnsupportedMedia(payload, mediaKind)
      return
    }

    const fromHash = sha256Prefix(payload.From)
    const waIdHash = payload.WaId ? sha256Prefix(payload.WaId) : undefined
    const phoneNumber = stripWhatsappPrefix(payload.From)

    // Sender resolution — verified users only pass.
    const user = await prisma.user.findFirst({
      where: { phoneNumber, phoneVerifiedAt: { not: null } },
    })
    if (!user) {
      await this.handleUnknownNumber(payload, fromHash)
      return
    }

    // audit-added M4: verified-sender per-hour cost ceiling.
    const rate = recordAndCheckVerifiedSender(fromHash)
    if (!rate.allowed) {
      this.logger.warn('whatsapp.verified_sender_throttled', {
        from: fromHash,
        countInWindow: rate.countInWindow,
        limit: VERIFIED_SENDER_LIMIT_PER_HOUR,
      })
      if (rate.shouldSendThrottleReply) {
        await this.adapter.sendText(
          payload.From,
          "You've hit the message limit for the hour — try again later.",
        )
      }
      return
    }

    try {
      // Org resolution.
      const member = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      })
      if (!member) {
        this.logger.warn('whatsapp.orphan_user', { userId: user.id })
        await this.handleUnknownNumber(payload, fromHash)
        return
      }

      // audit-added S8: multi-org routing transparency.
      const orgCount = await prisma.organizationMember.count({
        where: { userId: user.id },
      })
      if (orgCount > 1) {
        this.logger.warn('whatsapp.multi_org_user', {
          userId: user.id,
          chosenOrgId: member.organizationId,
          totalOrgs: orgCount,
        })
      }

      // Venue resolution — default to oldest venue in org.
      const venue = await prisma.venue.findFirst({
        where: { organizationId: member.organizationId },
        orderBy: { createdAt: 'asc' },
      })
      if (!venue) {
        this.logger.warn('whatsapp.no_venue', { orgId: member.organizationId })
        await this.adapter.sendText(
          payload.From,
          'Your organization has no venue configured yet — contact your admin.',
        )
        return
      }

      // ChatConversation — channel-scoped reuse within 2h idle window.
      // Deviation from audit M5: schema DOES include a `channel` column
      // (default "web"); using `channel=whatsapp` filter cleanly separates
      // web and WhatsApp threads. Closes D-03-01-G.
      const cutoff = new Date(Date.now() - WA_CONVERSATION_IDLE_MS)
      let conversation = await prisma.chatConversation.findFirst({
        where: {
          venueId: venue.id,
          channel: WA_CHANNEL,
          userId: user.id,
          updatedAt: { gte: cutoff },
        },
        orderBy: { updatedAt: 'desc' },
      })
      if (!conversation) {
        conversation = await prisma.chatConversation.create({
          data: {
            venueId: venue.id,
            userId: user.id,
            channel: WA_CHANNEL,
          },
        })
      }

      this.logger.log('whatsapp.inbound', {
        from: fromHash,
        messageSid: payload.MessageSid,
        waIdHash,
        bodyLength: payload.Body.length,
      })

      // audit-added M3/AC-10: hard 12s timeout on ChatService call.
      const startedAt = Date.now()
      const result = await Promise.race([
        this.chatService.sendMessage(
          {
            venueId: venue.id,
            userMessage: payload.Body,
            conversationId: conversation.id,
          },
          member.organizationId,
          user.id,
          member.role,
        ),
        new Promise<'__timeout'>((resolve) =>
          setTimeout(() => resolve('__timeout'), CHAT_TIMEOUT_MS),
        ),
      ])

      if (result === '__timeout') {
        // whatsapp.chat_timeout_orphan_completion_expected — the ChatService
        // promise continues in the background and persists its assistant message
        // to DB; the user just doesn't get this reply. D-03-01-I tracks
        // AbortController threading through Claude SDK.
        this.logger.warn('whatsapp.chat_timeout', {
          userId: user.id,
          conversationId: conversation.id,
          elapsedMs: Date.now() - startedAt,
        })
        await this.adapter.sendText(
          payload.From,
          "I'm still thinking — I'll follow up shortly.",
        )
        return
      }

      const out = await this.adapter.sendText(payload.From, result.assistantMessage.content)
      if (out.ok) {
        this.logger.log('whatsapp.outbound', {
          to: fromHash,
          mode: out.mode,
          latencyMs: Date.now() - startedAt,
        })
      }
    } catch (err) {
      // audit-added S6: err.message banned — constructor name only.
      this.logger.error('whatsapp.handler_error', {
        from: fromHash,
        errorKind: (err as Error)?.constructor?.name ?? 'unknown',
      })
      await this.adapter.sendText(
        payload.From,
        'Sorry — something went wrong on my end. Try again in a moment.',
      )
    }
  }

  private async handleUnknownNumber(
    payload: TwilioWebhookPayload,
    fromHash: string,
  ): Promise<void> {
    const { shouldReply } = recordAndCheckOnboardingReply(fromHash)
    if (shouldReply) {
      await this.adapter.sendText(
        payload.From,
        "Welcome to GM AI. Your number isn't linked yet — an account owner needs to invite you, then you can verify this phone at /settings/phone.",
      )
      this.logger.log('whatsapp.unknown_number', { from: fromHash, replied: true })
    } else {
      this.logger.log('whatsapp.unknown_number', {
        from: fromHash,
        replied: false,
        reason: 'rate-limited',
      })
    }
  }

  private async handleUnsupportedMedia(
    payload: TwilioWebhookPayload,
    mediaKind: 'image' | 'audio' | 'other',
  ): Promise<void> {
    await this.adapter.sendText(
      payload.From,
      "Photos and voice notes aren't supported yet — send me a text message and I'll help.",
    )
    this.logger.log('whatsapp.unsupported_media', {
      from: sha256Prefix(payload.From),
      mediaKind,
      numMedia: Number(payload.NumMedia ?? 0),
    })
  }
}
