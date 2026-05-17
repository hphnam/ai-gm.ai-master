import { Module } from '@nestjs/common'
import { PricingRecommendationsController } from './pricing-recommendations.controller'
import { PricingRecommendationsService } from './pricing-recommendations.service'

/// Spec metric G — audit trail of AI-surfaced pricing recommendations and
/// their adoption outcome. Surfaces "AI GM pricing recommendations increased
/// venue revenue by £X this quarter" on the dashboard once a downstream
/// measurement loop populates the uplift values.
@Module({
  controllers: [PricingRecommendationsController],
  providers: [PricingRecommendationsService],
  exports: [PricingRecommendationsService],
})
export class PricingRecommendationsModule {}
