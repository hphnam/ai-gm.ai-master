import { Body, Controller, HttpCode, HttpException, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { createRedisRateLimiter } from '../integrations/rate-limit'
import { PlacesSearchDto, PlacesSearchResponseDto } from './dto/places.dto'
import { PlacesService } from './places.service'

// Redis-backed: guards Google Places billing, so the cap must hold across
// nodes and survive restarts.
const SEARCH_LIMITER = createRedisRateLimiter(60_000, 30, 'places-search')

@ApiTags('places')
@ApiBearerAuth()
@Controller('places')
export class PlacesController {
  constructor(private readonly service: PlacesService) {}

  @Post('search')
  @HttpCode(200)
  @UseGuards(AuthGuard, RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: PlacesSearchResponseDto })
  async search(
    @Body(new ZodValidationPipe(PlacesSearchDto)) body: PlacesSearchDto,
    @CurrentOrg() org: { id: string },
  ): Promise<PlacesSearchResponseDto> {
    if (!(await SEARCH_LIMITER.allow(org.id))) {
      throw new HttpException({ error: 'rate-limited' }, 429)
    }
    return (await this.service.search(body.query)) as PlacesSearchResponseDto
  }
}
