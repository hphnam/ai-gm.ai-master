import { Module } from '@nestjs/common'
import { EmbeddingsModule } from '../embeddings/embeddings.module'
import { IndexerService } from './indexer.service'

@Module({
  imports: [EmbeddingsModule],
  providers: [IndexerService],
  exports: [IndexerService],
})
export class IndexerModule {}
