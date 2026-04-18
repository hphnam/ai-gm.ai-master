import { Module } from '@nestjs/common'
import { AdaptationModule } from '../adaptation/adaptation.module'
import { RetrievalModule } from '../retrieval/retrieval.module'
import { ChatService } from './chat.service'
import { ToolDispatcher } from './tool-dispatcher'

@Module({
  imports: [RetrievalModule, AdaptationModule],
  providers: [ChatService, ToolDispatcher],
  exports: [ChatService, ToolDispatcher],
})
export class ChatModule {}
