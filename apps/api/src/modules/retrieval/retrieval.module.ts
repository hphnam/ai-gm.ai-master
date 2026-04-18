import { Module } from '@nestjs/common'
import { EmbeddingsModule } from '../embeddings/embeddings.module'
import { MockOpsModule } from '../mock-ops/mock-ops.module'
import { RetrievalService } from './retrieval.service'

@Module({
  imports: [EmbeddingsModule, MockOpsModule],
  providers: [RetrievalService],
  exports: [RetrievalService, MockOpsModule],
})
export class RetrievalModule {}
