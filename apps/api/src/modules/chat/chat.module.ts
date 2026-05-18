import { forwardRef, Module } from '@nestjs/common'
import { AdaptationModule } from '../adaptation/adaptation.module'
import { ChatCoreModule } from '../chat-core/chat-core.module'
import { IncidentsModule } from '../incidents/incidents.module'
import { IngestModule } from '../ingest/ingest.module'
// IntegrationsModule is @Global — no import needed for the registry, but we
// keep one here for explicitness around the chat → integrations dependency.
import { IntegrationsModule } from '../integrations/integrations.module'
import { PricingRecommendationsModule } from '../pricing-recommendations/pricing-recommendations.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { ReportsModule } from '../reports/reports.module'
import { RetrievalModule } from '../retrieval/retrieval.module'
import { ScheduledReportsModule } from '../scheduled-reports/scheduled-reports.module'
import { TabularModule } from '../tabular/tabular.module'
import { TasksModule } from '../tasks/tasks.module'

// ScheduledReportsModule's ReportGeneratorService injects ToolDispatcher (this
// module). ToolDispatcher injects ScheduledReportsService (the other module).
// Bidirectional cycle → forwardRef on both sides.
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ConversationCompactorService } from './conversation-compactor.service'
import { ConversationModeService } from './conversation-mode.service'
import { QuoteVerifierService } from './quote-verifier.service'
import { ToolDispatcher } from './tool-dispatcher'
import { UserProfileService } from './user-profile.service'

@Module({
  imports: [
    RetrievalModule,
    AdaptationModule,
    IngestModule,
    TabularModule,
    ChatCoreModule,
    RealtimeModule,
    TasksModule,
    IncidentsModule,
    ReportsModule,
    forwardRef(() => ScheduledReportsModule),
    IntegrationsModule,
    PricingRecommendationsModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ToolDispatcher,
    QuoteVerifierService,
    ConversationModeService,
    UserProfileService,
    ConversationCompactorService,
  ],
  exports: [ChatService, ToolDispatcher],
})
export class ChatModule {}
