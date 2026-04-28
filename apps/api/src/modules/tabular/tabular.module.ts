// Plan 05-01 Task 3 — NestJS module exposing the structured-data query DSL.
// Stays separate from IngestModule so chat / tool-dispatcher can depend on it
// without dragging in the embed pipeline.

import { Module } from '@nestjs/common'
import { TabularQueryService } from './tabular.service'

@Module({
  providers: [TabularQueryService],
  exports: [TabularQueryService],
})
export class TabularModule {}
