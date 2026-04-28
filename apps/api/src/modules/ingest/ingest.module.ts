import { Module } from '@nestjs/common'
import { EmbeddingsModule } from '../embeddings/embeddings.module'
import { IndexerModule } from '../indexer/indexer.module'
import { IngestService } from './ingest.service'
import { SectionDetector } from './section-detector'

@Module({
  imports: [EmbeddingsModule, IndexerModule],
  providers: [IngestService, SectionDetector],
  exports: [IngestService, SectionDetector],
})
export class IngestModule {}
