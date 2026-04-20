import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common'
import { TwilioWebhookPayloadSchema } from '@gm-ai/types'
import { WhatsappService } from './whatsapp.service'
import { WhatsappSignatureGuard } from './whatsapp-signature.guard'

@Controller('webhooks/twilio')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name)

  constructor(private readonly service: WhatsappService) {}

  @Post('whatsapp')
  @UseGuards(WhatsappSignatureGuard)
  @HttpCode(200)
  async handleInbound(@Body() raw: unknown): Promise<void> {
    const parsed = TwilioWebhookPayloadSchema.safeParse(raw)
    if (!parsed.success) {
      this.logger.warn('whatsapp.payload_invalid', {
        issue: parsed.error.issues[0]?.code ?? 'unknown',
      })
      // Still 200 — Twilio must not retry an unrecoverable payload.
      return
    }
    await this.service.handleInbound(parsed.data)
  }
}
