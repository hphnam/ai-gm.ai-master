// Phase 6 — Reducto extraction module. Stays separate from DocsModule so the
// service can be DI'd into both DocsService (controller-side upload) and
// IngestService (background parse).

import { Module } from '@nestjs/common'
import { ReductoService } from './reducto.service'

@Module({
  providers: [ReductoService],
  exports: [ReductoService],
})
export class ReductoModule {}
