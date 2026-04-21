import { Module } from '@nestjs/common'
import { IngestModule } from '../ingest/ingest.module'
import { ChecklistExtractorService } from './checklist-extractor.service'
import { ClassifierService } from './classifier.service'
import { DocsController } from './docs.controller'
import { DocsService } from './docs.service'

@Module({
  imports: [IngestModule],
  controllers: [DocsController],
  providers: [DocsService, ClassifierService, ChecklistExtractorService],
  // Plan 04-02 Task 2 — export ClassifierService for 04-03/04-04 reuse.
  // Plan 04-03 Task 2 — export ChecklistExtractorService for 04-04 scheduler DI reuse.
  exports: [ClassifierService, ChecklistExtractorService],
})
export class DocsModule {}
