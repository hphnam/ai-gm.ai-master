import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AdaptationModule } from './modules/adaptation/adaptation.module'
import { ChatModule } from './modules/chat/chat.module'
import { EmbeddingsModule } from './modules/embeddings/embeddings.module'
import { IngestModule } from './modules/ingest/ingest.module'
import { MockOpsModule } from './modules/mock-ops/mock-ops.module'
import { RetrievalModule } from './modules/retrieval/retrieval.module'
import { SuggestionsModule } from './modules/suggestions/suggestions.module'

@Module({
  imports: [
    EmbeddingsModule,
    IngestModule,
    MockOpsModule,
    RetrievalModule,
    AdaptationModule,
    ChatModule,
    SuggestionsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
