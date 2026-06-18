import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, CurrentRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { ComplianceService } from './compliance.service'
import {
  CreateExpiryRecordBodyDto,
  ExpiryRecordIdParamDto,
  ListExpiryRecordsQueryDto,
  ListExpiryRecordsResponseDto,
  SingleExpiryRecordResponseDto,
  UpdateExpiryRecordBodyDto,
} from './dto/compliance.dto'

@ApiTags('compliance')
@ApiBearerAuth()
@Controller('compliance/expiry-records')
@UseGuards(AuthGuard)
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Get()
  @ApiResponse({ status: 200, type: ListExpiryRecordsResponseDto })
  async list(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(ListExpiryRecordsQueryDto))
    query: ListExpiryRecordsQueryDto,
  ): Promise<ListExpiryRecordsResponseDto> {
    return this.service.list(org.id, {
      status: query.status,
      venueId: query.venueId,
      category: query.category,
      withinDays: query.withinDays,
      limit: query.limit,
    })
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: SingleExpiryRecordResponseDto })
  async get(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(ExpiryRecordIdParamDto)) params: ExpiryRecordIdParamDto,
  ): Promise<SingleExpiryRecordResponseDto> {
    const record = await this.service.getById(org.id, params.id)
    return { record }
  }

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, type: SingleExpiryRecordResponseDto })
  async create(
    @CurrentOrg() org: { id: string },
    @CurrentRole() role: string | undefined,
    @Body(new ZodValidationPipe(CreateExpiryRecordBodyDto)) body: CreateExpiryRecordBodyDto,
  ): Promise<SingleExpiryRecordResponseDto> {
    const record = await this.service.create(org.id, role ?? '', {
      title: body.title,
      category: body.category,
      expiresAt: body.expiresAt,
      venueId: body.venueId ?? null,
      personUserId: body.personUserId ?? null,
      personName: body.personName ?? null,
      assetName: body.assetName ?? null,
      renewalCostGbp: body.renewalCostGbp ?? null,
      notes: body.notes ?? null,
    })
    return { record }
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: SingleExpiryRecordResponseDto })
  async update(
    @CurrentOrg() org: { id: string },
    @CurrentRole() role: string | undefined,
    @Param(new ZodValidationPipe(ExpiryRecordIdParamDto)) params: ExpiryRecordIdParamDto,
    @Body(new ZodValidationPipe(UpdateExpiryRecordBodyDto)) body: UpdateExpiryRecordBodyDto,
  ): Promise<SingleExpiryRecordResponseDto> {
    const record = await this.service.update(org.id, role ?? '', params.id, body)
    return { record }
  }
}
