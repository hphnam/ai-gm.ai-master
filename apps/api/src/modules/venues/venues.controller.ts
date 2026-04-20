import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { CreateVenueBodySchema, type CreateVenueBody, type VenueListItem } from '@gm-ai/types'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { zodPipe } from '../../common/zod-pipe'
import { VenuesService } from './venues.service'

@Controller('venues')
@UseGuards(AuthGuard, RoleGuard)
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  list(@CurrentOrg() org: { id: string }): Promise<VenueListItem[]> {
    return this.venuesService.listByOrg(org.id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRole('owner', 'manager')
  create(
    @CurrentOrg() org: { id: string },
    @Body(zodPipe(CreateVenueBodySchema)) body: CreateVenueBody,
  ): Promise<VenueListItem> {
    return this.venuesService.create(org.id, body)
  }
}
