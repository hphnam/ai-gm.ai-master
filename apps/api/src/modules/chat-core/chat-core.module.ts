// Plan 06-01 Task 2 — chat-core NestJS module skeleton.
//
// Imports RetrievalModule + IngestModule because Task 3 will wire the Docs
// researcher + tools that depend on those services. Declaring them here at the
// boundary keeps Task 3 a pure providers/exports change with no module re-wire.

import { Module } from '@nestjs/common'
import { IngestModule } from '../ingest/ingest.module'
import { MockOpsModule } from '../mock-ops/mock-ops.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { RetrievalModule } from '../retrieval/retrieval.module'
import { TabularModule } from '../tabular/tabular.module'
import { AnalyserService } from './analyser.service'
import { ChatCoreService } from './chat-core.service'
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

// Library module. No HTTP routes — chat-core's services are consumed by
// chat (HTTP layer at /chat/*) and whatsapp. Invoked from ChatService via the
// `deep_research` escalation tool.
@Module({
  imports: [RetrievalModule, IngestModule, MockOpsModule, TabularModule, RealtimeModule],
  controllers: [],
  providers: [
    ChatCoreService,
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
  exports: [ChatCoreService, ConversationService],
})
export class ChatCoreModule {}
