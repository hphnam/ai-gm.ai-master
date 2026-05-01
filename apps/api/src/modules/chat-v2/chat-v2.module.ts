// Plan 06-01 Task 2 — chat-v2 NestJS module skeleton.
//
// Imports RetrievalModule + IngestModule because Task 3 will wire the Docs
// researcher + tools that depend on those services. Declaring them here at the
// boundary keeps Task 3 a pure providers/exports change with no module re-wire.

import { Module } from '@nestjs/common'
import { IngestModule } from '../ingest/ingest.module'
import { RetrievalModule } from '../retrieval/retrieval.module'
import { ChatV2Service } from './chat-v2.service'
import { DocsResearcher } from './researchers/docs.researcher'
import { TriageService } from './triage.service'
import { WriterService } from './writer.service'

@Module({
  imports: [RetrievalModule, IngestModule],
  providers: [ChatV2Service, TriageService, DocsResearcher, WriterService],
  exports: [ChatV2Service],
})
export class ChatV2Module {}
