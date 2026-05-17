import { Module } from '@nestjs/common'
import { HoursRecoveredService } from './hours-recovered.service'
import { MetricsController } from './metrics.controller'
import { WauService } from './wau.service'

/// Operator metrics — read-only aggregations for the dashboard. Each metric
/// has its own service so they can be evolved independently and tested in
/// isolation.
@Module({
  controllers: [MetricsController],
  providers: [WauService, HoursRecoveredService],
  exports: [WauService, HoursRecoveredService],
})
export class MetricsModule {}
