import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
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
}
