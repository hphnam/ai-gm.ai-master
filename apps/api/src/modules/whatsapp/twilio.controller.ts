import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { prisma } from '../../database/prisma'
import { TwilioConversationsEventSchema, type WhatsappInboundResult } from '../../types'
import { TwilioSignatureGuard } from './twilio-signature.guard'
import { WhatsappService } from './whatsapp.service'

// 03-06 Twilio Conversations webhook controller.
// Signature guard runs first (reads parsed body; Twilio's algorithm signs the
// sorted form params, not the raw body). EventType=='onMessageAdded' is the
// only event we act on; everything else (onConversationAdded, deliveryReceipts,
// onParticipantAdded …) 200-acks and drops.
//
// Twilio fires one event per webhook request (no batching). Idempotency by
// MessageSid is enforced downstream in handleInbound's markAndCheckSid call.
@ApiExcludeController()
@Controller('webhooks/twilio')
export class TwilioController {
  private readonly logger = new Logger(TwilioController.name)

  constructor(private readonly service: WhatsappService) {}

  @Post('conversations')
  @UseGuards(TwilioSignatureGuard)
  @HttpCode(200)
  async handleEvent(@Body() raw: unknown): Promise<void> {
    const parsed = TwilioConversationsEventSchema.safeParse(raw)
    if (!parsed.success) {
      this.logger.warn('whatsapp.payload_invalid', {
        issue: parsed.error.issues[0]?.code ?? 'unknown',
        signatureValidated: true,
      })
      return
    }

    const event = parsed.data
    if (event.EventType !== 'onMessageAdded') {
      this.logger.debug('whatsapp.event_skipped', {
        eventType: event.EventType,
        conversationSid: event.ConversationSid,
      })
      return
    }

    // Inbound from a real WhatsApp participant only. Twilio fires onMessageAdded
    // for our own outbound writes (Source='SDK') and for chat-channel SDK clients
    // added to the same Conversation. Require BOTH Source='WHATSAPP' AND a
    // phone-bound Author — explicit allowlist beats implicit double-negative.
    if (event.Source !== 'WHATSAPP' || !event.Author?.startsWith('whatsapp:+')) {
      this.logger.debug('whatsapp.event_skipped_non_inbound', {
        author: event.Author,
        source: event.Source,
      })
      return
    }

    const messageId = event.MessageSid
    if (!messageId) {
      this.logger.warn('whatsapp.event_missing_message_sid', {
        conversationSid: event.ConversationSid,
      })
      return
    }

    const fromE164 = event.Author.slice('whatsapp:'.length) // "+E164"

    // Upsert the conversation mapping eagerly — the participant exists on
    // Twilio's side, we just want a local record so outbound resolveConversationForPhone
    // is a single DB read with no Twilio API roundtrip.
    try {
      await prisma.whatsappConversation.upsert({
        where: { phoneNumber: fromE164 },
        create: { phoneNumber: fromE164, conversationSid: event.ConversationSid },
        update: { lastEventAt: new Date() },
      })
    } catch (err) {
      // Non-fatal — the adapter's resolveConversationForPhone will fall back to
      // a Twilio create-or-fetch via UniqueName.
      this.logger.warn('whatsapp.conversation_upsert_failed', {
        errorKind: (err as Error)?.constructor?.name ?? 'unknown',
        conversationSid: event.ConversationSid,
      })
    }

    const result = normalizeTwilioEvent(event, fromE164, messageId)

    if ((event.NumMedia ?? 0) > 1) {
      this.logger.debug('whatsapp.multi_media_truncated', {
        messageId,
        numMedia: event.NumMedia,
      })
    }

    try {
      await this.service.handleInbound(result)
    } catch (err) {
      this.logger.error('whatsapp.handler_unhandled', {
        messageId,
        errorKind: (err as Error)?.constructor?.name ?? 'unknown',
      })
    }
  }
}

function normalizeTwilioEvent(
  event: { Body?: string; NumMedia?: number },
  fromE164: string,
  messageId: string,
): WhatsappInboundResult {
  const numMedia = event.NumMedia ?? 0
  // 03-06 fix 12: Twilio surfaces media at MediaUrl{N}/MediaContentType{N} for
  // N in [0, NumMedia). The downstream chat pipeline handles a single
  // attachment per message; multi-media inbound is truncated to MediaUrl0 and
  // a debug log is emitted so we have telemetry if users hit this in practice.
  // Upgrading to multi-attachment requires extending WhatsappInboundResult +
  // the chat-core sendMessage signature, both of which are bigger lifts.
  const e = event as unknown as Record<string, string | undefined>
  const mediaUrl = numMedia > 0 ? e.MediaUrl0 : undefined
  const mediaType = numMedia > 0 ? e.MediaContentType0 : undefined

  let type: WhatsappInboundResult['message']['type'] = 'TEXT'
  if (mediaUrl && mediaType?.startsWith('image/')) type = 'IMAGE'
  else if (mediaUrl && mediaType?.startsWith('audio/')) type = 'AUDIO'
  else if (mediaUrl && mediaType?.startsWith('video/')) type = 'VIDEO'
  else if (mediaUrl) type = 'DOCUMENT'

  return {
    messageId,
    conversationSid: (event as unknown as { ConversationSid: string }).ConversationSid,
    from: fromE164,
    message: {
      type,
      text: event.Body && event.Body.length > 0 ? event.Body : undefined,
      url: mediaUrl,
      mediaContentType: mediaType,
    },
  }
}
