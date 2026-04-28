import { Controller, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common'
import { z } from 'zod'
import { UUID_RE, type ApiErrorResponse } from '@gm-ai/types'
import { zodPipe } from '../../common/zod-pipe'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { NudgeService } from './nudge.service'

const VenueIdParamSchema = z.object({
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
})

@Controller('nudges')
@UseGuards(AuthGuard, RoleGuard)
export class NudgeController {
  constructor(private readonly nudgeService: NudgeService) {}

  /// Manual trigger — useful for the GM dashboard ("send me a nudge now")
  /// and for testing without waiting for the cron tick.
  @Post(':venueId/run')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  async runNudge(
    @Param(zodPipe(VenueIdParamSchema)) params: { venueId: string },
    @CurrentOrg() org: { id: string },
  ): Promise<{ sent: boolean; reason?: string; preview?: string }> {
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
