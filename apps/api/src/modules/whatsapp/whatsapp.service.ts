import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import {
  CHAT_TIMEOUT_MS,
  PROACTIVE_SESSION_WINDOW_MS,
  type ProactiveSuggestion,
  VERIFIED_SENDER_LIMIT_PER_HOUR,
  type WhatsappInboundResult,
} from '../../types'
import { ChatCoreService } from '../chat-core/chat-core.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { SuggestionsService } from '../suggestions/suggestions.service'
import { markAndCheckSid } from './seen-message-sids'
import { clearTypingRefire, startTypingRefire } from './typing-indicator-timers'
import { recordAndCheckOnboardingReply } from './unknown-number-rate-limit'
import { recordAndCheckVerifiedSender } from './verified-sender-rate-limit'
import { WhatsAppAdapter } from './whatsapp.adapter'
import { downloadWhatsappMedia } from './whatsapp-media-download'
import { WhatsappOnboardingService } from './whatsapp-onboarding.service'

const WA_CONVERSATION_IDLE_MS = 2 * 60 * 60 * 1000
const WA_CHANNEL = 'whatsapp'

function sha256Prefix(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16)
}

// Provider-agnostic media classifier. Both Infobip + Twilio inbound paths
// normalize into WhatsappInboundResult whose message.type enum drives this.
function classifyInboundMedia(result: WhatsappInboundResult): 'none' | 'image' | 'audio' | 'other' {
  const t = result.message.type
  if (t === 'TEXT') return 'none'
  if (t === 'IMAGE') return 'image'
  if (t === 'AUDIO') return 'audio'
  return 'other'
}

// 03-03 Task 2 / AC-17 / audit S1: sanitize KnowledgeItem-derived text before
// composing into WhatsApp body. Strips control chars (except \n), normalizes NFC,
// strips WhatsApp formatting injection chars, caps each line at 200 chars.
function sanitizeOpenerLine(raw: string): string {
  let out = raw.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '')
  out = out.normalize('NFC')
  out = out.replace(/[*_~`]/g, '')
  if (out.length > 200) out = `${out.slice(0, 199)}\u2026`
  return out
}

// Appends follow-up pills to the WhatsApp outbound body as a sanitised bullet
// list. WhatsApp has no interactive pills in our current Infobip tier, so
// inline text is the UX bridge — user can copy/type the suggestion back.
// Later this can upgrade to Infobip interactive reply buttons (max 3).
function composeOutboundBody(reply: string, followUps: string[]): string {
  const trimmed = reply.trim()
  if (!followUps || followUps.length === 0) return trimmed
  const lines: string[] = [trimmed, '', 'Quick follow-ups:']
  for (const q of followUps.slice(0, 3)) {
    lines.push(`• ${sanitizeOpenerLine(q)}`)
  }
  return lines.join('\n')
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
  if (body.length > 400) body = `${body.slice(0, 399)}\u2026`
  return body
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name)

  constructor(
    private readonly adapter: WhatsAppAdapter,
    private readonly chatCoreService: ChatCoreService,
    private readonly suggestions: SuggestionsService,
    private readonly onboarding: WhatsappOnboardingService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async handleInbound(result: WhatsappInboundResult): Promise<void> {
    // 03-03 Task 1: typing indicator fires IMMEDIATELY (before any DB / sender resolution).
    // 03-06 fix: pass conversationSid (Twilio Typing endpoint is per-Conversation),
    // not messageId — earlier code passed MessageSid which gated to console-mode.
    this.adapter
      .sendTypingIndicator(result.conversationSid)
      .then((r) => {
        if (r.ok) {
          this.logger.log('whatsapp.typing_indicator_sent', {
            from: sha256Prefix(result.from),
            messageId: result.messageId,
            conversationSid: result.conversationSid,
            mode: r.mode,
          })
        }
      })
      .catch(() => {})
    startTypingRefire(result.messageId, result.conversationSid, this.adapter, this.logger)

    try {
      // 03-01 M3: messageId idempotency — dedupe Infobip retries + replay attacks.
      const dedupe = markAndCheckSid(result.messageId)
      if (dedupe.seen) {
        this.logger.log('whatsapp.replay_dedupe', {
          messageId: result.messageId,
          from: sha256Prefix(result.from),
        })
        return
      }

      // 03-03 Task 3: audio/video still reject. Image now flows through (after
      // sender resolution) via the dedicated image handler below.
      const mediaKind = classifyInboundMedia(result)
      if (mediaKind === 'audio' || mediaKind === 'other') {
        await this.handleUnsupportedMedia(result, mediaKind)
        return
      }
      // mediaKind === 'none' or 'image' — continue to sender resolution.

      const fromHash = sha256Prefix(result.from)
      // 03-06: both controllers normalize `from` to E.164 WITH leading `+` so
      // the User.phoneNumber lookup matches directly. Twilio's Author was
      // "whatsapp:+E164"; Infobip's was bare digits — normalization is handled
      // at the controller boundary.
      const phoneNumber = result.from

      // Plan 03-01 — onboarding state machine. Before chat dispatch, resolve
      // the phone's onboarding state. Unknown / otp_pending / linked_no_venue
      // are handled inline by the state machine; only fully-linked phones fall
      // through to chat. Plan 03-02 will close D-06-04-A by routing the linked
      // path through chat-v1 ChatService instead of ChatCoreService.
      const onboardingState = await this.onboarding.loadState(phoneNumber)

      if (onboardingState.kind !== 'linked') {
        // Apply unknown-number reply rate-limit only when the phone is still
        // in `unknown` — mid-flow states (otp_pending, linked_no_venue) are
        // intentionally responsive so users aren't stuck after a typo.
        if (onboardingState.kind === 'unknown') {
          const { shouldReply } = recordAndCheckOnboardingReply(fromHash)
          if (!shouldReply) {
            this.logger.log('whatsapp.unknown_number', {
              from: fromHash,
              replied: false,
              reason: 'rate-limited',
            })
            return
          }
        }

        const raw = result.message.text ?? ''
        const out = await this.onboarding.runTransition(onboardingState, raw)
        this.logger.log('whatsapp.onboarding_handled', {
          from: fromHash,
          fromStateKind: onboardingState.kind,
          toStateKind: out.nextStateKind,
          replied: out.outboundText !== null,
        })
        return
      }

      // Linked path — resolve User by phone (session has userId, but downstream
      // code uses the User object). Verified phone is implied by linked state.
      const user = await prisma.user.findFirst({
        where: { id: onboardingState.userId },
      })
      if (!user) {
        // Session row references a user that has since been deleted. Treat as
        // unknown and prompt — onboarding will re-create on next valid invite.
        this.logger.warn('whatsapp.session_user_missing', {
          userId: onboardingState.userId,
          from: fromHash,
        })
        await this.handleUnknownNumber(result, fromHash)
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
            result.from,
            "You've hit the message limit for the hour — try again later.",
          )
        }
        return
      }

      try {
        // Org resolution — Plan 03-01 binds via WhatsappSession.currentOrganizationId
        // (sticky venue from onboarding). Multi-org users picked their org during
        // onboarding; subsequent venue switching is Plan 03-02's job.
        const member = await prisma.organizationMember.findFirst({
          where: { userId: user.id, organizationId: onboardingState.organizationId },
        })
        if (!member) {
          this.logger.warn('whatsapp.session_membership_revoked', {
            userId: user.id,
            organizationId: onboardingState.organizationId,
          })
          await this.adapter.sendText(
            result.from,
            'Your access to that venue was changed. Ask your manager to re-invite.',
          )
          return
        }

        // Venue resolution — default to oldest venue in org.
        const venue = await prisma.venue.findFirst({
          where: { organizationId: member.organizationId },
          orderBy: { createdAt: 'asc' },
        })
        if (!venue) {
          this.logger.warn('whatsapp.no_venue', { orgId: member.organizationId })
          await this.adapter.sendText(
            result.from,
            'Your organization has no venue configured yet — contact your admin.',
          )
          return
        }

        // 03-03 Task 2: proactive opener on new 24h channel='whatsapp' session.
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
              await this.adapter.sendText(result.from, openerText)
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
          this.realtime.emitChatConversationUpserted(user.id, {
            id: conversation.id,
            venueId: venue.id,
            channel: WA_CHANNEL,
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
            messageId: result.messageId,
            userId: user.id,
          })
          await this.adapter.sendText(
            result.from,
            "Couldn't load your conversation — please try again.",
          )
          return
        }

        // 03-03 Task 3: image inbound — download + attach OR fallback to friendly reject.
        let attachment:
          | {
              mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
              base64: string
              sourceRef: string
            }
          | undefined
        if (mediaKind === 'image') {
          if (!result.message.url) {
            await this.adapter.sendText(
              result.from,
              "I couldn't load that image — try re-sending or describe what's in it.",
            )
            this.logger.warn('whatsapp.image_download_failed', {
              status: 0,
              errorKind: 'no-media-url',
            })
            return
          }
          // 03-06: Twilio media is Basic-auth protected with account-SID:auth-token.
          // The downloader accepts the precomputed base64-encoded credential.
          const acct = process.env.TWILIO_ACCOUNT_SID
          const tok = process.env.TWILIO_AUTH_TOKEN
          if (!acct || !tok) {
            await this.adapter.sendText(
              result.from,
              "Image support isn't configured — send text instead.",
            )
            this.logger.warn('whatsapp.image_download_failed', {
              status: 0,
              errorKind: 'no-twilio-credentials',
            })
            return
          }
          const basicAuth = Buffer.from(`${acct}:${tok}`).toString('base64')
          const dl = await downloadWhatsappMedia(result.message.url, basicAuth)
          if (!dl.ok) {
            const friendly =
              dl.reason === 'unsupported-mime'
                ? 'I can only process JPEG, PNG, WebP, or GIF images.'
                : "I couldn't load that image — try re-sending or describe what's in it."
            await this.adapter.sendText(result.from, friendly)
            // audit S5: hash the host when surfacing SSRF-reject so raw host stays out of logs.
            let hostHash: string | undefined
            if (dl.reason === 'ssrf-rejected') {
              try {
                hostHash = sha256Prefix(new URL(result.message.url).host)
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
            sourceRef: result.messageId,
          }
          this.logger.log('whatsapp.image_ingested', {
            from: fromHash,
            mediaType: dl.mediaType,
            byteSize: dl.byteSize,
            messageId: result.messageId,
          })
        }

        const bodyText = result.message.text ?? ''
        this.logger.log('whatsapp.inbound', {
          from: fromHash,
          messageId: result.messageId,
          bodyLength: bodyText.length,
          hasImage: !!attachment,
          // 03-04 audit-added M5 (G5): contact name NEVER logged (raw OR hashed).
          // Previously this slot carried waIdHash (Twilio WaId). Dropped entirely.
        })

        // 03-01 M3/AC-10: hard 12s timeout on ChatService call.
        const startedAt = Date.now()
        const userMessage =
          bodyText.length > 0 ? bodyText : attachment ? 'User sent an image.' : bodyText
        // Plan 06-04 Task 4 — WhatsApp consumer migrated from chat-v1 to chat-core.
        // Same SendMessageInput shape; chat-core uses a single ctx-object instead
        // of positional args. WhatsApp inbound now flows through Triage →
        // Researchers (with Venue always-on for reasoning + incident) → Writer.
        const chatResult = await Promise.race([
          this.chatCoreService.sendMessage(
            {
              venueId: venue.id,
              userMessage,
              conversationId: conversation.id,
              attachment,
            },
            {
              orgId: member.organizationId,
              userId: user.id,
              userRole: member.role,
              userIdentity: { name: user.name, email: user.email },
            },
          ),
          new Promise<'__timeout'>((resolve) =>
            setTimeout(() => resolve('__timeout'), CHAT_TIMEOUT_MS),
          ),
        ])

        if (chatResult === '__timeout') {
          this.logger.warn('whatsapp.chat_timeout', {
            userId: user.id,
            conversationId: conversation.id,
            elapsedMs: Date.now() - startedAt,
          })
          await this.adapter.sendText(result.from, "I'm still thinking — I'll follow up shortly.")
          return
        }

        const out = await this.adapter.sendText(
          result.from,
          composeOutboundBody(
            chatResult.assistantMessage.content,
            chatResult.assistantMessage.followUps,
          ),
        )
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
          result.from,
          'Sorry — something went wrong on my end. Try again in a moment.',
        )
      }
    } finally {
      // 03-03 Task 1: ALWAYS clear the typing refire timer on any return path.
      const cleared = clearTypingRefire(result.messageId)
      this.logger.log('whatsapp.typing_indicator_cleared', {
        messageId: result.messageId,
        refireCount: cleared?.refireCount ?? 0,
      })
    }
  }

  private async handleUnknownNumber(
    result: WhatsappInboundResult,
    fromHash: string,
  ): Promise<void> {
    const { shouldReply } = recordAndCheckOnboardingReply(fromHash)
    if (shouldReply) {
      await this.adapter.sendText(
        result.from,
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
    result: WhatsappInboundResult,
    mediaKind: 'image' | 'audio' | 'other',
  ): Promise<void> {
    await this.adapter.sendText(
      result.from,
      "Photos and voice notes aren't supported yet — send me a text message and I'll help.",
    )
    this.logger.log('whatsapp.unsupported_media', {
      from: sha256Prefix(result.from),
      mediaKind,
      messageType: result.message.type,
    })
  }
}
