import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { EmbeddingsModule } from './modules/embeddings/embeddings.module'
import { IngestModule } from './modules/ingest/ingest.module'
import { MockOpsModule } from './modules/mock-ops/mock-ops.module'
import { RetrievalModule } from './modules/retrieval/retrieval.module'

@Module({
  imports: [
    EmbeddingsModule,
    IngestModule,
    MockOpsModule,
    RetrievalModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
