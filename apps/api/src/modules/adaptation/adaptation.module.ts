import { Module } from '@nestjs/common'
import { IngestModule } from '../ingest/ingest.module'
import { AdaptationService } from './adaptation.service'
import { FeedbackController } from './feedback.controller'

@Module({
  imports: [IngestModule],
  controllers: [FeedbackController],
  providers: [AdaptationService],
  exports: [AdaptationService],
})
export class AdaptationModule {}
