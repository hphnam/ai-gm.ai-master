import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { AnalyticsService } from './analytics.service'
import {
  ActiveStaffQueryDto,
  ActiveStaffResponseDto,
  AnalyticsRangeQueryDto,
  CostsResponseDto,
  EscalationsResponseDto,
  MetricsFeedbackResponseDto,
  NoDataQueriesResponseDto,
  NoDataQueryQueryDto,
  OnboardingCohortResponseDto,
  PricingFunnelQueryDto,
  PricingFunnelResponseDto,
  RecentEscalationsQueryDto,
  RecentEscalationsResponseDto,
  SearchOutcomesResponseDto,
  TopQuestionsQueryDto,
  TopQuestionsResponseDto,
} from './dto/analytics.dto'
import { HoursRecoveredQueryDto, HoursRecoveredResponseDto } from './dto/hours-recovered.dto'
import { WauQueryDto, WauResponseDto } from './dto/metrics.dto'
import { HoursRecoveredService } from './hours-recovered.service'
import { WauService } from './wau.service'

@ApiTags('metrics')
@ApiBearerAuth()
@Controller('metrics')
@UseGuards(AuthGuard)
export class MetricsController {
  constructor(
    private readonly wau: WauService,
    private readonly hoursRecovered: HoursRecoveredService,
    private readonly analytics: AnalyticsService,
  ) {}

  /// Weekly Active Staff per venue. Org membership is enforced by AuthGuard +
  /// the venue-org check in the service. Staff CAN read their own venue —
  /// venue scoping is the access boundary here, not the role, mirroring the
  /// notifications/tasks pattern where any active org member can read
  /// venue-scoped data they are entitled to see.
  @Get('wau')
  @ApiResponse({ status: 200, type: WauResponseDto })
  async getWau(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(WauQueryDto)) query: WauQueryDto,
  ): Promise<WauResponseDto> {
    const weeks = await this.wau.getVenueWau(org.id, query.venueId, { weeks: query.weeks })
    return { venueId: query.venueId, weeks }
  }

  /// Hours-recovered headline (spec metric B). Open to staff + manager + owner
  /// for their own org — CurrentOrg is scoped to the active session, so org
  /// boundary is enforced by middleware. venueId optional (omit = whole-org
  /// rollup); from/to default to the last 7 days.
  @Get('hours-recovered')
  @ApiResponse({ status: 200, type: HoursRecoveredResponseDto })
  async getHoursRecovered(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(HoursRecoveredQueryDto)) query: HoursRecoveredQueryDto,
  ): Promise<HoursRecoveredResponseDto> {
    const defaults = HoursRecoveredService.defaultRange()
    const result = await this.hoursRecovered.compute(org.id, {
      venueId: query.venueId,
      from: query.from ?? defaults.from,
      to: query.to ?? defaults.to,
    })
    return {
      queriesCount: result.queriesCount,
      minutesSaved: result.minutesSaved,
      hoursSaved: result.hoursSaved,
      valueGbpCents: result.valueGbpCents,
      range: { from: result.range.from.toISOString(), to: result.range.to.toISOString() },
      scope: result.scope,
      baseline: result.baseline,
    }
  }

  /// The remaining endpoints power the operator dashboard. They are
  /// owner+manager only — search queries, escalation patterns and AI cost
  /// roll up across the whole org, so staff aren't entitled to read them.
  /// RoleGuard composes with AuthGuard at the controller level.
  @Get('search-outcomes')
  @UseGuards(RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: SearchOutcomesResponseDto })
  async getSearchOutcomes(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(AnalyticsRangeQueryDto)) query: AnalyticsRangeQueryDto,
  ): Promise<SearchOutcomesResponseDto> {
    const defaults = AnalyticsService.defaultRange()
    return this.analytics.searchOutcomes(org.id, {
      venueId: query.venueId,
      from: query.from ?? defaults.from,
      to: query.to ?? defaults.to,
    })
  }

  @Get('no-data-queries')
  @UseGuards(RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: NoDataQueriesResponseDto })
  async getNoDataQueries(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(NoDataQueryQueryDto)) query: NoDataQueryQueryDto,
  ): Promise<NoDataQueriesResponseDto> {
    const defaults = AnalyticsService.defaultRange()
    return this.analytics.noDataQueries(org.id, {
      venueId: query.venueId,
      from: query.from ?? defaults.from,
      to: query.to ?? defaults.to,
      limit: query.limit,
    })
  }

  @Get('escalations')
  @UseGuards(RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: EscalationsResponseDto })
  async getEscalations(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(AnalyticsRangeQueryDto)) query: AnalyticsRangeQueryDto,
  ): Promise<EscalationsResponseDto> {
    const defaults = AnalyticsService.defaultRange()
    return this.analytics.escalations(org.id, {
      venueId: query.venueId,
      from: query.from ?? defaults.from,
      to: query.to ?? defaults.to,
    })
  }

  @Get('costs')
  @UseGuards(RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: CostsResponseDto })
  async getCosts(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(AnalyticsRangeQueryDto)) query: AnalyticsRangeQueryDto,
  ): Promise<CostsResponseDto> {
    const defaults = AnalyticsService.defaultRange()
    return this.analytics.costs(org.id, {
      venueId: query.venueId,
      from: query.from ?? defaults.from,
      to: query.to ?? defaults.to,
    })
  }

  @Get('feedback')
  @UseGuards(RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: MetricsFeedbackResponseDto })
  async getFeedback(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(AnalyticsRangeQueryDto)) query: AnalyticsRangeQueryDto,
  ): Promise<MetricsFeedbackResponseDto> {
    const defaults = AnalyticsService.defaultRange()
    return this.analytics.feedback(org.id, {
      venueId: query.venueId,
      from: query.from ?? defaults.from,
      to: query.to ?? defaults.to,
    })
  }

  @Get('pricing-funnel')
  @UseGuards(RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: PricingFunnelResponseDto })
  async getPricingFunnel(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(PricingFunnelQueryDto)) query: PricingFunnelQueryDto,
  ): Promise<PricingFunnelResponseDto> {
    return this.analytics.pricingFunnel(org.id, { venueId: query.venueId })
  }

  @Get('onboarding-cohort')
  @UseGuards(RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: OnboardingCohortResponseDto })
  async getOnboardingCohort(
    @CurrentOrg() org: { id: string },
  ): Promise<OnboardingCohortResponseDto> {
    return this.analytics.onboardingCohort(org.id)
  }

  @Get('top-questions')
  @UseGuards(RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: TopQuestionsResponseDto })
  async getTopQuestions(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(TopQuestionsQueryDto)) query: TopQuestionsQueryDto,
  ): Promise<TopQuestionsResponseDto> {
    const defaults = AnalyticsService.defaultRange()
    return this.analytics.topQuestions(org.id, {
      venueId: query.venueId,
      from: query.from ?? defaults.from,
      to: query.to ?? defaults.to,
      limit: query.limit,
    })
  }

  @Get('recent-escalations')
  @UseGuards(RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: RecentEscalationsResponseDto })
  async getRecentEscalations(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(RecentEscalationsQueryDto)) query: RecentEscalationsQueryDto,
  ): Promise<RecentEscalationsResponseDto> {
    const defaults = AnalyticsService.defaultRange()
    return this.analytics.recentEscalations(org.id, {
      venueId: query.venueId,
      from: query.from ?? defaults.from,
      to: query.to ?? defaults.to,
      limit: query.limit,
    })
  }

  @Get('active-staff')
  @UseGuards(RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: ActiveStaffResponseDto })
  async getActiveStaff(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(ActiveStaffQueryDto)) query: ActiveStaffQueryDto,
  ): Promise<ActiveStaffResponseDto> {
    const defaults = AnalyticsService.defaultRange()
    return this.analytics.activeStaff(org.id, {
      venueId: query.venueId,
      from: query.from ?? defaults.from,
      to: query.to ?? defaults.to,
      limit: query.limit,
    })
  }
}
