import { Module } from '@nestjs/common'
import { EmbeddingsModule } from '../embeddings/embeddings.module'
import { IngestModule } from '../ingest/ingest.module'
import { SeedCommand } from './seed.command'

@Module({
  imports: [EmbeddingsModule, IngestModule],
  providers: [SeedCommand],
})
export class SeedModule {}
