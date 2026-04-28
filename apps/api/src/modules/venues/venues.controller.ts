import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { z } from 'zod'
import {
  CreateVenueBodySchema,
  UpdateVenueProfileSchema,
  UUID_RE,
  type CreateVenueBody,
  type UpdateVenueProfile,
  type VenueDetail,
  type VenueListItem,
} from '@gm-ai/types'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { zodPipe } from '../../common/zod-pipe'
import { VenuesService } from './venues.service'

const VenueIdParamSchema = z.object({
  id: z.string().regex(UUID_RE, 'invalid uuid'),
})

@Controller('venues')
@UseGuards(AuthGuard, RoleGuard)
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  list(@CurrentOrg() org: { id: string }): Promise<VenueListItem[]> {
    return this.venuesService.listByOrg(org.id)
  }

  @Get(':id')
  async get(
    @Param(zodPipe(VenueIdParamSchema)) params: { id: string },
    @CurrentOrg() org: { id: string },
  ): Promise<VenueDetail> {
    const venue = await this.venuesService.getById(params.id, org.id)
    if (!venue) throw new NotFoundException({ error: 'venue-not-found' })
    return venue
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

  @Patch(':id/profile')
  @HttpCode(HttpStatus.OK)
  @RequireRole('owner', 'manager')
  updateProfile(
    @Param(zodPipe(VenueIdParamSchema)) params: { id: string },
    @Body(zodPipe(UpdateVenueProfileSchema)) body: UpdateVenueProfile,
    @CurrentOrg() org: { id: string },
  ): Promise<VenueDetail> {
    return this.venuesService.updateProfile(params.id, org.id, body)
  }
}
