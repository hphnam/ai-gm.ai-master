import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { MockOpsModule } from '../mock-ops/mock-ops.module'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { NudgeController } from './nudge.controller'
import { NudgeProcessor } from './nudge.processor'
import { NUDGE_QUEUE_NAME } from './nudge.queue'
import { NudgeService } from './nudge.service'

/// Phase G4 — proactive nudges. Sibling to ChatModule; depends on
/// MockOpsModule (stock + cutoffs) + WhatsappModule (sendText). Owns its own
/// BullMQ queue (REDIS_URL must be configured in .env).
@Module({
  imports: [BullModule.registerQueue({ name: NUDGE_QUEUE_NAME }), MockOpsModule, WhatsappModule],
  controllers: [NudgeController],
  providers: [NudgeService, NudgeProcessor],
  exports: [NudgeService],
})
export class NudgeModule {}
