import { Module } from '@nestjs/common'
import { SquareModule } from '../integrations/square/square.module'
import { DailySummaryController } from './daily-summary.controller'
import { DailySummaryService } from './daily-summary.service'

/// Per-venue daily financial summary (mobile "Today"). Composes the existing
/// Square COGS/labour/payment services — SquareModule must export both
/// SquareService and SquareCogsService.
@Module({
  imports: [SquareModule],
  controllers: [DailySummaryController],
  providers: [DailySummaryService],
})
export class DailySummaryModule {}
