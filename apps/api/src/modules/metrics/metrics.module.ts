import { Module } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import { HoursRecoveredService } from './hours-recovered.service'
import { MetricsController } from './metrics.controller'
import { OnboardingMetricsModule } from './onboarding/onboarding-metrics.module'
import { WauService } from './wau.service'

/// Operator metrics — read-only aggregations for the dashboard. Each metric
/// has its own service so they can be evolved independently and tested in
/// isolation. AnalyticsService consumes OnboardingMetricsService for the
/// cohort view; we import the submodule to get a single shared instance.
@Module({
  imports: [OnboardingMetricsModule],
  controllers: [MetricsController],
  providers: [WauService, HoursRecoveredService, AnalyticsService],
  exports: [WauService, HoursRecoveredService, AnalyticsService],
})
export class MetricsModule {}
