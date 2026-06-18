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
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import {
  CreateVenueBodyDto,
  UpdateVenueProfileDto,
  UpdateVenueSquareLocationBodyDto,
  VenueDetailDto,
  VenueIdParamDto,
  VenueListItemDto,
} from './dto/venues.dto'
import { VenuesService } from './venues.service'

@ApiTags('venues')
@ApiBearerAuth()
@Controller('venues')
@UseGuards(AuthGuard, RoleGuard)
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @ApiResponse({ status: 200, type: [VenueListItemDto] })
  list(@CurrentOrg() org: { id: string }): Promise<VenueListItemDto[]> {
    return this.venuesService.listByOrg(org.id) as Promise<VenueListItemDto[]>
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: VenueDetailDto })
  async get(
    @Param(new ZodValidationPipe(VenueIdParamDto)) params: VenueIdParamDto,
    @CurrentOrg() org: { id: string },
  ): Promise<VenueDetailDto> {
    const venue = await this.venuesService.getById(params.id, org.id)
    if (!venue) throw new NotFoundException({ error: 'venue-not-found' })
    return venue as VenueDetailDto
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 201, type: VenueListItemDto })
  create(
    @CurrentOrg() org: { id: string },
    @Body() body: CreateVenueBodyDto,
  ): Promise<VenueListItemDto> {
    return this.venuesService.create(org.id, body) as Promise<VenueListItemDto>
  }

  @Patch(':id/profile')
  @HttpCode(HttpStatus.OK)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: VenueDetailDto })
  updateProfile(
    @Param(new ZodValidationPipe(VenueIdParamDto)) params: VenueIdParamDto,
    @Body() body: UpdateVenueProfileDto,
    @CurrentOrg() org: { id: string },
  ): Promise<VenueDetailDto> {
    return this.venuesService.updateProfile(params.id, org.id, body) as Promise<VenueDetailDto>
  }

  /// Map (or unmap) a venue to a Square location id. Manager-only.
  /// Body: { squareLocationId: string | null }.
  @Patch(':id/square-location')
  @HttpCode(HttpStatus.OK)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: VenueDetailDto })
  updateSquareLocation(
    @Param(new ZodValidationPipe(VenueIdParamDto)) params: VenueIdParamDto,
    @Body(new ZodValidationPipe(UpdateVenueSquareLocationBodyDto))
    body: UpdateVenueSquareLocationBodyDto,
    @CurrentOrg() org: { id: string },
  ): Promise<VenueDetailDto> {
    return this.venuesService.updateSquareLocation(
      params.id,
      org.id,
      body.squareLocationId,
    ) as Promise<VenueDetailDto>
  }
}
