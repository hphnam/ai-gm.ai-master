import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, CurrentVenueScope, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { canAccessVenue, type VenueScope } from '../auth/venue-scope'
import {
  DailySummaryQueryDto,
  type GroupDailySummaryResponseDto,
  type VenueDailySummaryResponseDto,
} from './daily-summary.dto'
import { DailySummaryService } from './daily-summary.service'

/// Financials — manager/owner only, venue-scoped. Powers the mobile "Today"
/// home. Never reachable by staff (RoleGuard) and never leaks a venue outside
/// the caller's scope (canAccessVenue + the global VenueScopeGuard).
@ApiTags('daily-summary')
@ApiBearerAuth()
@Controller('daily-summary')
@UseGuards(AuthGuard, RoleGuard)
@RequireRole('owner', 'manager')
export class DailySummaryController {
  constructor(private readonly summary: DailySummaryService) {}

  @Get()
  @ApiResponse({ status: 200 })
  async getForVenue(
    @CurrentOrg() org: { id: string },
    @CurrentVenueScope() scope: VenueScope,
    @Query(new ZodValidationPipe(DailySummaryQueryDto)) query: DailySummaryQueryDto,
  ): Promise<VenueDailySummaryResponseDto> {
    if (!canAccessVenue(scope, query.venueId)) {
      throw new ForbiddenException('venue-out-of-scope')
    }
    const data = await this.summary.getForVenue(org.id, query.venueId)
    return { data, error: null }
  }

  @Get('group')
  @ApiResponse({ status: 200 })
  async getGroup(
    @CurrentOrg() org: { id: string },
    @CurrentVenueScope() scope: VenueScope,
  ): Promise<GroupDailySummaryResponseDto> {
    const data = await this.summary.getGroup(org.id, scope)
    return { data, error: null }
  }
}
