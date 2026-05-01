// Plan 06-01 Task 2 — chat-v2 NestJS module skeleton.
//
// Imports RetrievalModule + IngestModule because Task 3 will wire the Docs
// researcher + tools that depend on those services. Declaring them here at the
// boundary keeps Task 3 a pure providers/exports change with no module re-wire.

import { Module } from '@nestjs/common'
import { IngestModule } from '../ingest/ingest.module'
import { MockOpsModule } from '../mock-ops/mock-ops.module'
import { RetrievalModule } from '../retrieval/retrieval.module'
import { TabularModule } from '../tabular/tabular.module'
import { AnalyserService } from './analyser.service'
import { ChatV2Controller } from './chat-v2.controller'
import { ChatV2Service } from './chat-v2.service'
import { CriticService } from './critic.service'
import { DocsResearcher } from './researchers/docs.researcher'
import { OpsResearcher } from './researchers/ops.researcher'
import { PeopleResearcher } from './researchers/people.researcher'
import { TabularResearcher } from './researchers/tabular.researcher'
import { VenueResearcher } from './researchers/venue.researcher'
import { TriageService } from './triage.service'
import { WriterService } from './writer.service'

@Module({
  imports: [RetrievalModule, IngestModule, MockOpsModule, TabularModule],
  controllers: [ChatV2Controller],
  providers: [
    ChatV2Service,
    TriageService,
    DocsResearcher,
    OpsResearcher,
    PeopleResearcher,
    TabularResearcher,
    VenueResearcher,
    WriterService,
    AnalyserService,
    CriticService,
  ],
  exports: [ChatV2Service],
})
export class ChatV2Module {}
