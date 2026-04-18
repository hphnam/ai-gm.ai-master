import { Module } from '@nestjs/common'
import { IngestModule } from '../ingest/ingest.module'
import { AdaptationService } from './adaptation.service'

@Module({
  imports: [IngestModule],
  providers: [AdaptationService],
  exports: [AdaptationService],
})
export class AdaptationModule {}
