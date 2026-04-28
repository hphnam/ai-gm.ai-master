import { Module } from '@nestjs/common'
import { AdaptationModule } from '../adaptation/adaptation.module'
import { IngestModule } from '../ingest/ingest.module'
import { RetrievalModule } from '../retrieval/retrieval.module'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ConversationCompactorService } from './conversation-compactor.service'
import { ConversationModeService } from './conversation-mode.service'
import { QuoteVerifierService } from './quote-verifier.service'
import { ToolDispatcher } from './tool-dispatcher'
import { UserProfileService } from './user-profile.service'

@Module({
  imports: [RetrievalModule, AdaptationModule, IngestModule],
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
