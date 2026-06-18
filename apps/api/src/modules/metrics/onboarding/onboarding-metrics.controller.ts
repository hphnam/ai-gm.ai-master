import { Controller, Get, Logger, NotFoundException, Param, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { prisma } from '../../../database/prisma'
import { CurrentOrg, CurrentUser, RequireRole } from '../../auth/auth.decorators'
import { AuthGuard } from '../../auth/auth.guard'
import { RoleGuard } from '../../auth/role.guard'
import { OnboardingMetricsService } from './onboarding-metrics.service'

type CompetencyResponse = {
  startedAt: string | null
  daysSinceStart: number
  windowDays: number
  totalQueries: number
  repeatQueries: number
  repeatRate: number
  firstIndependentAt: string | null
}

@ApiTags('metrics')
@ApiBearerAuth()
@Controller('metrics/onboarding')
@UseGuards(AuthGuard, RoleGuard)
export class OnboardingMetricsController {
  private readonly logger = new Logger(OnboardingMetricsController.name)

  constructor(private readonly service: OnboardingMetricsService) {}

  /// Self-service. Any authenticated org member can read their own
  /// competency snapshot. Order matters: this route MUST be declared before
  /// `:userId` so the literal "me" doesn't collide with the param route.
  @Get('me')
  @ApiResponse({ status: 200 })
  async getMine(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<CompetencyResponse> {
    const result = await this.service.getCompetency(org.id, user.id)
    return serialize(result)
  }

  /// Manager + owner only — read any org member's snapshot. The 404 on
  /// non-member targets prevents the endpoint from being used as an
  /// existence-oracle for users outside the org.
  @Get(':userId')
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200 })
  async getByUserId(
    @CurrentOrg() org: { id: string },
    @CurrentUser() requester: { id: string },
    @Param('userId') userId: string,
  ): Promise<CompetencyResponse> {
    const member = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: org.id } },
      select: { userId: true },
    })
    if (!member) {
      throw new NotFoundException({ error: 'member-not-found' })
    }
    const result = await this.service.getCompetency(org.id, userId)
    // Audit-log manager reads of staff metrics for SOC-2 trace reconstruction.
    this.logger.log(
      JSON.stringify({
        event: 'metrics.onboarding.read',
        orgId: org.id,
        requesterUserId: requester.id,
        targetUserId: userId,
      }),
    )
    return serialize(result)
  }
}

function serialize(
  r: Awaited<ReturnType<OnboardingMetricsService['getCompetency']>>,
): CompetencyResponse {
  return {
    startedAt: r.startedAt ? r.startedAt.toISOString() : null,
    daysSinceStart: r.daysSinceStart,
    windowDays: r.windowDays,
    totalQueries: r.totalQueries,
    repeatQueries: r.repeatQueries,
    repeatRate: r.repeatRate,
    firstIndependentAt: r.firstIndependentAt ? r.firstIndependentAt.toISOString() : null,
  }
}
