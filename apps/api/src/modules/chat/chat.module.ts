import { Module } from '@nestjs/common'
import { AdaptationModule } from '../adaptation/adaptation.module'
import { IngestModule } from '../ingest/ingest.module'
import { RetrievalModule } from '../retrieval/retrieval.module'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ToolDispatcher } from './tool-dispatcher'

@Module({
  imports: [RetrievalModule, AdaptationModule, IngestModule],
  controllers: [ChatController],
  providers: [ChatService, ToolDispatcher],
  exports: [ChatService, ToolDispatcher],
})
export class ChatModule {}
