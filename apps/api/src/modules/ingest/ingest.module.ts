import { Module } from '@nestjs/common'
import { EmbeddingsModule } from '../embeddings/embeddings.module'
import { IndexerModule } from '../indexer/indexer.module'
import { IngestService } from './ingest.service'

@Module({
  imports: [EmbeddingsModule, IndexerModule],
  providers: [IngestService],
  exports: [IngestService],
})
export class IngestModule {}
