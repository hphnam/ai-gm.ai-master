import { Module } from '@nestjs/common'
import { IngestModule } from '../ingest/ingest.module'
import { ClassifierService } from './classifier.service'
import { DocsController } from './docs.controller'
import { DocsService } from './docs.service'

@Module({
  imports: [IngestModule],
  controllers: [DocsController],
  providers: [DocsService, ClassifierService],
  // Plan 04-02 Task 2 — export ClassifierService so future 04-03/04-04 consumers
  // can compose it via DI without re-instantiating the Anthropic client.
  exports: [ClassifierService],
})
export class DocsModule {}
