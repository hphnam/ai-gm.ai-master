import { Module } from '@nestjs/common'
import { EmbeddingsModule } from '../embeddings/embeddings.module'
import { SeedCommand } from './seed.command'
import { EnrichmentService } from './enrichment.service'

@Module({
  imports: [EmbeddingsModule],
  providers: [SeedCommand, EnrichmentService],
})
export class SeedModule {}
