import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, CurrentUser } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import {
  CreateReportBodyDto,
  ListReportsQueryDto,
  ReportDto,
  ReportIdParamDto,
  ReportListResponseDto,
} from './dto/reports.dto'
import { ReportsService } from './reports.service'

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get()
  @ApiResponse({ status: 200, type: ReportListResponseDto })
  async list(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(ListReportsQueryDto)) query: ListReportsQueryDto,
  ): Promise<ReportListResponseDto> {
    const limit = query.limit ?? 20
    const offset = query.offset ?? 0
    const { items, total } = await this.service.list(org.id, {
      venueId: query.venueId,
      limit,
      offset,
    })
    const nextOffset = offset + items.length
    const hasMore = nextOffset < total
    return {
      reports: items,
      total,
      hasMore,
      nextOffset: hasMore ? nextOffset : null,
    }
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: ReportDto })
  async getOne(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(ReportIdParamDto)) params: ReportIdParamDto,
  ): Promise<ReportDto> {
    const row = await this.service.get(org.id, params.id)
    if (!row) {
      throw new HttpException(
        { error: { code: 'not-found', message: 'Report not found.' } },
        HttpStatus.NOT_FOUND,
      )
    }
    return row
  }

  @Post()
  @ApiResponse({ status: 201, type: ReportDto })
  async create(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateReportBodyDto)) body: CreateReportBodyDto,
  ): Promise<ReportDto> {
    try {
      return await this.service.create({
        orgId: org.id,
        userId: user.id,
        venueId: body.venueId ?? null,
        title: body.title,
        summary: body.summary ?? null,
        spec: body.spec,
      })
    } catch (err) {
      if ((err as Error).message === 'venue-not-in-org') {
        throw new HttpException(
          { error: { code: 'invalid-input', message: 'Venue not found in your organisation.' } },
          HttpStatus.BAD_REQUEST,
        )
      }
      throw err
    }
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(ReportIdParamDto)) params: ReportIdParamDto,
  ): Promise<void> {
    const count = await this.service.delete(org.id, params.id)
    if (count === 0) {
      throw new HttpException(
        { error: { code: 'not-found', message: 'Report not found.' } },
        HttpStatus.NOT_FOUND,
      )
    }
  }
}
