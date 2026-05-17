import { Module } from '@nestjs/common'
import { OnboardingMetricsController } from './onboarding-metrics.controller'
import { OnboardingMetricsService } from './onboarding-metrics.service'

/// Spec metric I — time-to-competency. Nested under modules/metrics/ so
/// sibling metric modules (B / G / J) can land in modules/metrics/ without
/// fighting over the same module file.
@Module({
  controllers: [OnboardingMetricsController],
  providers: [OnboardingMetricsService],
  exports: [OnboardingMetricsService],
})
export class OnboardingMetricsModule {}
