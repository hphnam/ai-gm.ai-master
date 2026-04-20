import { createHash } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '@gm-ai/database'
import {
  CHAT_TIMEOUT_MS,
  PROACTIVE_SESSION_WINDOW_MS,
  VERIFIED_SENDER_LIMIT_PER_HOUR,
  type ProactiveSuggestion,
  type TwilioWebhookPayload,
} from '@gm-ai/types'
import { ChatService } from '../chat/chat.service'
import { SuggestionsService } from '../suggestions/suggestions.service'
import { WhatsAppAdapter } from './whatsapp.adapter'
import { recordAndCheckOnboardingReply } from './unknown-number-rate-limit'
import { recordAndCheckVerifiedSender } from './verified-sender-rate-limit'
import { markAndCheckSid } from './seen-message-sids'
import { clearTypingRefire, startTypingRefire } from './typing-indicator-timers'
import { downloadTwilioMedia } from './twilio-media-download'

const WA_CONVERSATION_IDLE_MS = 2 * 60 * 60 * 1000
const WA_CHANNEL = 'whatsapp'
const MEDIA_DOWNLOAD_RETRY = 0 // no retry — fail-soft only

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

// 03-03 Task 2 / AC-17 / audit S1: sanitize KnowledgeItem-derived text before
// composing into WhatsApp body. Strips control chars (except \n), normalizes NFC,
// strips WhatsApp formatting injection chars, caps each line at 200 chars.
function sanitizeOpenerLine(raw: string): string {
  let out = raw.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '')
  out = out.normalize('NFC')
  out = out.replace(/[*_~`]/g, '')
  if (out.length > 200) out = out.slice(0, 199) + '\u2026'
  return out
}

function composeOpenerText(suggestions: ProactiveSuggestion[]): string {
  const intro = 'Hey — quick heads-up before you jump in:'
  const lines: string[] = [intro]
  for (const s of suggestions.slice(0, 3)) {
    const clean = sanitizeOpenerLine(s.text)
    const prefix = s.severity === 'warn' ? '\u26A0\uFE0F ' : ''
    lines.push(prefix + clean)
  }
  let body = lines.join('\n')
  if (body.length > 400) body = body.slice(0, 399) + '\u2026'
  return body
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name)

  constructor(
    private readonly adapter: WhatsAppAdapter,
    private readonly chatService: ChatService,
    private readonly suggestions: SuggestionsService,
  ) {}

  async handleInbound(payload: TwilioWebhookPayload): Promise<void> {
    // 03-03 Task 1: typing indicator fires IMMEDIATELY (before any DB / sender resolution).
    // Fire-and-forget; errors swallowed. Then start the 20s refire ticker.
    this.adapter
      .sendTypingIndicator(payload.MessageSid)
      .then((r) => {
        if (r.ok) {
          this.logger.log('whatsapp.typing_indicator_sent', {
            from: sha256Prefix(payload.From),
            messageSid: payload.MessageSid,
            mode: r.mode,
          })
        }
      })
      .catch(() => {})
    startTypingRefire(payload.MessageSid, this.adapter, this.logger)

    try {
      // 03-01 M3: MessageSid idempotency — dedupe Twilio retries + replay attacks.
      const dedupe = markAndCheckSid(payload.MessageSid)
      if (dedupe.seen) {
        this.logger.log('whatsapp.replay_dedupe', {
          messageSid: payload.MessageSid,
          from: sha256Prefix(payload.From),
        })
        return
      }

      // 03-03 Task 3: audio/video still reject. Image now flows through (after
      // sender resolution) via the dedicated image handler below.
      const mediaKind = classifyMedia(payload)
      if (mediaKind === 'audio' || mediaKind === 'other') {
        await this.handleUnsupportedMedia(payload, mediaKind)
        return
      }
      // mediaKind === 'none' or 'image' — continue to sender resolution.

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

      // 03-01 M4: verified-sender per-hour cost ceiling.
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

        // 03-01 S8: multi-org routing transparency.
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

        // 03-03 Task 2: proactive opener on new 24h channel='whatsapp' session.
        // Runs BEFORE ChatConversation resolve+create so the conversation created
        // this turn becomes the one that starts the session.
        const sessionWindowStart = new Date(Date.now() - PROACTIVE_SESSION_WINDOW_MS)
        const priorSession = await prisma.chatConversation.findFirst({
          where: {
            venueId: venue.id,
            userId: user.id,
            channel: WA_CHANNEL,
            updatedAt: { gte: sessionWindowStart },
            // audit M5 / AC-16: cross-tenant defense-in-depth.
            venue: { organizationId: member.organizationId },
          },
          select: { id: true },
        })
        const isNewSession = !priorSession

        if (isNewSession) {
          try {
            const suggestions = await this.suggestions.onConversationOpen(
              venue.id,
              member.organizationId,
            )
            if (suggestions.length > 0) {
              const openerText = composeOpenerText(suggestions)
              await this.adapter.sendText(payload.From, openerText)
              this.logger.log('whatsapp.proactive_opener_sent', {
                venueId: venue.id,
                suggestionCount: suggestions.length,
                hasSuggestions: true,
              })
            } else {
              this.logger.log('whatsapp.proactive_opener_skipped', {
                reason: 'no-suggestions',
              })
            }
          } catch (err) {
            this.logger.warn('whatsapp.proactive_opener_error', {
              errorKind: (err as Error)?.constructor?.name ?? 'unknown',
            })
          }
        } else {
          this.logger.log('whatsapp.proactive_opener_skipped', {
            reason: 'within-session',
          })
        }

        // ChatConversation — channel-scoped reuse within 2h idle window.
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

        // 03-03 Task 3 / audit S6: cross-tenant conversation preflight.
        const convCheck = await prisma.chatConversation.findFirst({
          where: {
            id: conversation.id,
            venueId: venue.id,
            venue: { organizationId: member.organizationId },
          },
          select: { id: true },
        })
        if (!convCheck) {
          this.logger.warn('whatsapp.cross_tenant_conv_mismatch', {
            messageSid: payload.MessageSid,
            userId: user.id,
          })
          await this.adapter.sendText(
            payload.From,
            "Couldn't load your conversation — please try again.",
          )
          return
        }

        // 03-03 Task 3: image inbound — download + attach OR fallback to friendly reject.
        let attachment:
          | { mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; base64: string; sourceRef: string }
          | undefined = undefined
        if (mediaKind === 'image') {
          if (!payload.MediaUrl0) {
            await this.adapter.sendText(
              payload.From,
              "I couldn't load that image — try re-sending or describe what's in it.",
            )
            this.logger.warn('whatsapp.image_download_failed', {
              status: 0,
              errorKind: 'no-media-url',
            })
            return
          }
          const accountSid = process.env.TWILIO_ACCOUNT_SID
          const authToken = process.env.TWILIO_AUTH_TOKEN
          if (!accountSid || !authToken) {
            await this.adapter.sendText(
              payload.From,
              "Image support isn't configured — send text instead.",
            )
            this.logger.warn('whatsapp.image_download_failed', {
              status: 0,
              errorKind: 'no-twilio-creds',
            })
            return
          }
          const dl = await downloadTwilioMedia(payload.MediaUrl0, accountSid, authToken)
          if (!dl.ok) {
            const friendly =
              dl.reason === 'unsupported-mime'
                ? 'I can only process JPEG, PNG, WebP, or GIF images.'
                : "I couldn't load that image — try re-sending or describe what's in it."
            await this.adapter.sendText(payload.From, friendly)
            // audit S5: hash the host when surfacing SSRF-reject so raw host stays out of logs.
            let hostHash: string | undefined
            if (dl.reason === 'ssrf-rejected') {
              try {
                hostHash = sha256Prefix(new URL(payload.MediaUrl0).host)
              } catch {
                hostHash = 'invalid-url'
              }
            }
            this.logger.warn('whatsapp.image_download_failed', {
              status: dl.status,
              errorKind: dl.reason,
              mediaType: dl.mediaType,
              hostHash,
            })
            return
          }
          attachment = {
            mediaType: dl.mediaType,
            base64: dl.base64,
            sourceRef: payload.MessageSid,
          }
          this.logger.log('whatsapp.image_ingested', {
            from: fromHash,
            mediaType: dl.mediaType,
            byteSize: dl.byteSize,
            messageSid: payload.MessageSid,
          })
        }

        this.logger.log('whatsapp.inbound', {
          from: fromHash,
          messageSid: payload.MessageSid,
          waIdHash,
          bodyLength: payload.Body.length,
          hasImage: !!attachment,
        })

        // 03-01 M3/AC-10: hard 12s timeout on ChatService call.
        const startedAt = Date.now()
        const userMessage =
          payload.Body && payload.Body.length > 0
            ? payload.Body
            : attachment
              ? 'User sent an image.'
              : payload.Body
        const result = await Promise.race([
          this.chatService.sendMessage(
            {
              venueId: venue.id,
              userMessage,
              conversationId: conversation.id,
              attachment,
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
        this.logger.error('whatsapp.handler_error', {
          from: fromHash,
          errorKind: (err as Error)?.constructor?.name ?? 'unknown',
        })
        await this.adapter.sendText(
          payload.From,
          'Sorry — something went wrong on my end. Try again in a moment.',
        )
      }
    } finally {
      // 03-03 Task 1: ALWAYS clear the typing refire timer on any return path.
      const cleared = clearTypingRefire(payload.MessageSid)
      this.logger.log('whatsapp.typing_indicator_cleared', {
        messageSid: payload.MessageSid,
        refireCount: cleared?.refireCount ?? 0,
      })
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
