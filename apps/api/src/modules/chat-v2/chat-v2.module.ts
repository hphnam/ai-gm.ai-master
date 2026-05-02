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
import { ChatV2Service } from './chat-v2.service'
import { ConversationService } from './conversation.service'
import { CriticService } from './critic.service'
import { FastLookupService } from './fast-lookup.service'
import { DocsResearcher } from './researchers/docs.researcher'
import { OpsResearcher } from './researchers/ops.researcher'
import { PeopleResearcher } from './researchers/people.researcher'
import { TabularResearcher } from './researchers/tabular.researcher'
import { VenueResearcher } from './researchers/venue.researcher'
import { TriageService } from './triage.service'
import { WriterService } from './writer.service'

@Module({
  imports: [RetrievalModule, IngestModule, MockOpsModule, TabularModule],
  // Plan 06-04 hot-fix 2026-05-02 — ChatV2Controller's @Controller decorator
  // is left in the file but the controller is no longer registered. /chat/*
  // routes live on chat-v1's ChatController again; chat-v2 is now invoked
  // only via the `deep_research` tool from ChatService.
  controllers: [],
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
    ConversationService,
    FastLookupService,
  ],
  exports: [ChatV2Service, ConversationService],
})
export class ChatV2Module {}
