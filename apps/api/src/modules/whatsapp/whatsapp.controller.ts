import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  BATCH_DEADLINE_MS,
  InfobipInboundWebhookSchema,
} from '@gm-ai/types'
import { WhatsappService } from './whatsapp.service'
import { WhatsappSignatureGuard } from './whatsapp-signature.guard'

// 03-04 Infobip WhatsApp webhook controller.
// Signature guard runs first (consumes req.rawBody); on pass, parse JSON and iterate
// results[]. Each result is handled in its own try/catch so one malformed entry doesn't
// starve the others. Batch-deadline (audit S4/AC-13) bounds total wall-clock against
// Infobip's retry window.
@Controller('webhooks/infobip')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name)

  constructor(private readonly service: WhatsappService) {}

  @Post('whatsapp')
  @UseGuards(WhatsappSignatureGuard)
  @HttpCode(200)
  async handleInbound(@Body() raw: unknown): Promise<void> {
    const parsed = InfobipInboundWebhookSchema.safeParse(raw)
    if (!parsed.success) {
      // 03-04 audit-added S2 (G9): signatureValidated=true — the guard ran BEFORE this,
      // so any payload reaching here was signed by someone with the secret. Compliance
      // audit-trail distinguishes "signed but malformed" from "unsigned garbage".
      this.logger.warn('whatsapp.payload_invalid', {
        issue: parsed.error.issues[0]?.code ?? 'unknown',
        signatureValidated: true,
      })
      return
    }

    const batchStart = Date.now()
    let processed = 0
    let skipped = 0
    for (const result of parsed.data.results) {
      if (Date.now() - batchStart > BATCH_DEADLINE_MS) {
        this.logger.debug('whatsapp.batch_result_skipped', { messageId: result.messageId })
        skipped++
        continue
      }
      try {
        await this.service.handleInbound(result)
        processed++
      } catch (err) {
        this.logger.error('whatsapp.handler_unhandled', {
          messageId: result.messageId,
          errorKind: (err as Error)?.constructor?.name ?? 'unknown',
        })
      }
    }
    if (skipped > 0) {
      this.logger.warn('whatsapp.batch_deadline_reached', {
        processedCount: processed,
        skippedCount: skipped,
        elapsedMs: Date.now() - batchStart,
      })
    }
  }
}
