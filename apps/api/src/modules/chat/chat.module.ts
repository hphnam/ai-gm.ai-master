import { Module } from '@nestjs/common'
import { AdaptationModule } from '../adaptation/adaptation.module'
import { ChatV2Module } from '../chat-v2/chat-v2.module'
import { IngestModule } from '../ingest/ingest.module'
import { RetrievalModule } from '../retrieval/retrieval.module'
import { TabularModule } from '../tabular/tabular.module'
import { ChatService } from './chat.service'
import { ConversationCompactorService } from './conversation-compactor.service'
import { ConversationModeService } from './conversation-mode.service'
import { QuoteVerifierService } from './quote-verifier.service'
import { ToolDispatcher } from './tool-dispatcher'
import { UserProfileService } from './user-profile.service'

// Plan 06-04 Task 4 — chat-v1 module no longer registers a controller. All
// /chat/* HTTP routes live on chat-v2's controller after the cutover. ChatService
// stays exported for whatsapp.service consumption until Task 4's WhatsApp
// migration (this commit) and Task 7 module deletion.
@Module({
  imports: [RetrievalModule, AdaptationModule, IngestModule, TabularModule, ChatV2Module],
  controllers: [],
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
