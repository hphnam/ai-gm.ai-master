import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import {
  AdoptPricingRecommendationBodyDto,
  CreatePricingRecommendationBodyDto,
  DismissPricingRecommendationBodyDto,
  ListPricingRecommendationsQueryDto,
  ListPricingRecommendationsResponseDto,
  PricingRecommendationIdParamDto,
  SinglePricingRecommendationResponseDto,
} from './dto/pricing-recommendations.dto'
import { PricingRecommendationsService } from './pricing-recommendations.service'

@ApiTags('pricing-recommendations')
@ApiBearerAuth()
@Controller('pricing-recommendations')
@UseGuards(AuthGuard, RoleGuard)
export class PricingRecommendationsController {
  constructor(private readonly service: PricingRecommendationsService) {}

  @Get()
  @ApiResponse({ status: 200, type: ListPricingRecommendationsResponseDto })
  async list(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(ListPricingRecommendationsQueryDto))
    query: ListPricingRecommendationsQueryDto,
  ): Promise<ListPricingRecommendationsResponseDto> {
    const recommendations = await this.service.listForVenue(
      org.id,
      query.venueId,
      query.status,
      query.limit,
    )
    return { recommendations }
  }

  @Post()
  @HttpCode(201)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 201, type: SinglePricingRecommendationResponseDto })
  async create(
    @CurrentOrg() org: { id: string },
    @Body(new ZodValidationPipe(CreatePricingRecommendationBodyDto))
    body: CreatePricingRecommendationBodyDto,
  ): Promise<SinglePricingRecommendationResponseDto> {
    const recommendation = await this.service.create(org.id, {
      venueId: body.venueId,
      sourceItemRef: body.sourceItemRef,
      sourceItemLabel: body.sourceItemLabel,
      currentPriceCents: body.currentPriceCents,
      recommendedPriceCents: body.recommendedPriceCents,
      rationale: body.rationale,
      upliftWindowDays: body.upliftWindowDays,
    })
    return { recommendation }
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: SinglePricingRecommendationResponseDto })
  async getOne(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(PricingRecommendationIdParamDto))
    params: PricingRecommendationIdParamDto,
  ): Promise<SinglePricingRecommendationResponseDto> {
    const recommendation = await this.service.getById(org.id, params.id)
    if (!recommendation) {
      throw new NotFoundException({ error: 'not-found' })
    }
    return { recommendation }
  }

  @Post(':id/adopt')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: SinglePricingRecommendationResponseDto })
  async adopt(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(PricingRecommendationIdParamDto))
    params: PricingRecommendationIdParamDto,
    @Body(new ZodValidationPipe(AdoptPricingRecommendationBodyDto))
    body: AdoptPricingRecommendationBodyDto,
  ): Promise<SinglePricingRecommendationResponseDto> {
    const recommendation = await this.service.markAdopted(org.id, params.id, body.adoptedPriceCents)
    return { recommendation }
  }

  @Post(':id/dismiss')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: SinglePricingRecommendationResponseDto })
  async dismiss(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(PricingRecommendationIdParamDto))
    params: PricingRecommendationIdParamDto,
    @Body(new ZodValidationPipe(DismissPricingRecommendationBodyDto))
    body: DismissPricingRecommendationBodyDto,
  ): Promise<SinglePricingRecommendationResponseDto> {
    const recommendation = await this.service.markDismissed(org.id, params.id, body.reason)
    return { recommendation }
  }
}
