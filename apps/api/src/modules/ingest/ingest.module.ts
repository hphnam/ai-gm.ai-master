import { Module } from '@nestjs/common'
import { EmbeddingsModule } from '../embeddings/embeddings.module'
import { IngestService } from './ingest.service'

@Module({
  imports: [EmbeddingsModule],
  providers: [IngestService],
  exports: [IngestService],
})
export class IngestModule {}
