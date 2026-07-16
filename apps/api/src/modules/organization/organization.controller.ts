import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Logger,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { createRedisRateLimiter } from '../integrations/rate-limit'
import {
  GeneratedDescriptionResponseDto,
  OrganizationProfileResponseDto,
  UpdateOrganizationProfileDto,
} from './dto/organization.dto'
import { OrganizationService } from './organization.service'

// Redis-backed: guards the model call (billing) across nodes.
const DESCRIBE_LIMITER = createRedisRateLimiter(60_000, 10, 'org-describe')

@ApiTags('organization')
@ApiBearerAuth()
@Controller('org')
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name)

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

  @Post('profile/describe')
  @HttpCode(200)
  @UseGuards(AuthGuard, RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: GeneratedDescriptionResponseDto })
  async describe(@CurrentOrg() org: { id: string }): Promise<GeneratedDescriptionResponseDto> {
    if (!(await DESCRIBE_LIMITER.allow(org.id))) {
      throw new HttpException({ error: 'rate-limited' }, 429)
    }
    try {
      const description = await this.service.generateDescription(org.id)
      return { description }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'org.describe_failed',
          orgId: org.id,
          message: (err as Error).message,
        }),
      )
      throw new HttpException({ error: 'generate-failed' }, 503)
    }
  }
}
