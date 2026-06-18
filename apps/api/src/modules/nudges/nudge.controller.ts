import { Controller, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import type { ApiErrorResponse } from '../../types'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { NudgeVenueIdParamDto, RunNudgeResponseDto } from './dto/nudge.dto'
import { NudgeService } from './nudge.service'

@ApiTags('nudges')
@ApiBearerAuth()
@Controller('nudges')
@UseGuards(AuthGuard, RoleGuard)
export class NudgeController {
  constructor(private readonly nudgeService: NudgeService) {}

  /// Manual trigger — useful for the GM dashboard ("send me a nudge now")
  /// and for testing without waiting for the cron tick.
  @Post(':venueId/run')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: RunNudgeResponseDto })
  async runNudge(
    @Param(new ZodValidationPipe(NudgeVenueIdParamDto)) params: NudgeVenueIdParamDto,
    @CurrentOrg() org: { id: string },
  ): Promise<RunNudgeResponseDto> {
    const result = await this.nudgeService.run(params.venueId, org.id)
    if (result.sent) {
      return { sent: true, preview: result.preview }
    }
    if (result.reason === 'venue not found') {
      throw new NotFoundException({ error: 'venue-not-found' } satisfies ApiErrorResponse)
    }
    return { sent: false, reason: result.reason }
  }
}
