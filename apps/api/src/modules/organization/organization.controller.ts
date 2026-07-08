import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import {
  OrganizationProfileResponseDto,
  UpdateOrganizationProfileDto,
} from './dto/organization.dto'
import { OrganizationService } from './organization.service'

@ApiTags('organization')
@ApiBearerAuth()
@Controller('org')
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Get('profile')
  @UseGuards(AuthGuard, RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: OrganizationProfileResponseDto })
  async getProfile(@CurrentOrg() org: { id: string }): Promise<OrganizationProfileResponseDto> {
    const profile = await this.service.getProfile(org.id)
    return { profile } as OrganizationProfileResponseDto
  }

  @Put('profile')
  @UseGuards(AuthGuard, RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: OrganizationProfileResponseDto })
  async updateProfile(
    // Explicit pipe: there is no global ZodValidationPipe, so the DTO type
    // alone does NOT validate the body. This enforces the .strict() schema +
    // length caps server-side instead of relying on read-time discard.
    @Body(new ZodValidationPipe(UpdateOrganizationProfileDto)) body: UpdateOrganizationProfileDto,
    @CurrentOrg() org: { id: string },
  ): Promise<OrganizationProfileResponseDto> {
    const profile = await this.service.updateProfile(org.id, body)
    return { profile } as OrganizationProfileResponseDto
  }
}
