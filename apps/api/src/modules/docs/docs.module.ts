import { Module } from '@nestjs/common'
import { IngestModule } from '../ingest/ingest.module'
import { DocsController } from './docs.controller'
import { DocsService } from './docs.service'

@Module({
  imports: [IngestModule],
  controllers: [DocsController],
  providers: [DocsService],
})
export class DocsModule {}
