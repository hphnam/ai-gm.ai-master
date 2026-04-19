import { Controller, Get, UseGuards } from '@nestjs/common'
import type { VenueListItem } from '@gm-ai/types'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { VenuesService } from './venues.service'

@Controller('venues')
@UseGuards(AuthGuard, RoleGuard)
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  list(@CurrentOrg() org: { id: string }): Promise<VenueListItem[]> {
    return this.venuesService.listByOrg(org.id)
  }
}
