import { Module } from '@nestjs/common'
import { ComplianceModule } from '../compliance/compliance.module'
import { EmbeddingsModule } from '../embeddings/embeddings.module'
import { IndexerModule } from '../indexer/indexer.module'
import { IngestService } from './ingest.service'
import { SectionDetector } from './section-detector'

@Module({
  imports: [EmbeddingsModule, IndexerModule, ComplianceModule],
  providers: [IngestService, SectionDetector],
  exports: [IngestService, SectionDetector],
})
export class IngestModule {}
