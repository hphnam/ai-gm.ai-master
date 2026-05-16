import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, CurrentUser } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import {
  CreateScheduledReportBodyDto,
  ListScheduledReportsQueryDto,
  ScheduledReportDto,
  ScheduledReportIdParamDto,
  ScheduledReportListResponseDto,
} from './dto/scheduled-reports.dto'
import { ScheduledReportsService } from './scheduled-reports.service'

/// Per-user sliding-window throttle for schedule creation. Matches the
/// leave_note_for_user limit shape — single-process state, sufficient for
/// the current single-node Nest server. Compose with the per-org cap in the
/// service for layered defence.
const CREATE_WINDOW_MS = 60_000
const CREATE_LIMIT_PER_WINDOW = 5
const createRateLimit = (() => {
  const buckets = new Map<string, number[]>()
  return {
    allow(userId: string): boolean {
      const now = Date.now()
      const cutoff = now - CREATE_WINDOW_MS
      const recent = (buckets.get(userId) ?? []).filter((t) => t > cutoff)
      if (recent.length >= CREATE_LIMIT_PER_WINDOW) {
        buckets.set(userId, recent)
        return false
      }
      recent.push(now)
      buckets.set(userId, recent)
      return true
    },
  }
})()

@ApiTags('scheduled-reports')
@ApiBearerAuth()
@Controller('scheduled-reports')
@UseGuards(AuthGuard)
export class ScheduledReportsController {
  constructor(private readonly service: ScheduledReportsService) {}

  @Get()
  @ApiResponse({ status: 200, type: ScheduledReportListResponseDto })
  async list(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(ListScheduledReportsQueryDto))
    query: ListScheduledReportsQueryDto,
  ): Promise<ScheduledReportListResponseDto> {
    const limit = query.limit ?? 20
    const offset = query.offset ?? 0
    const { items, total } = await this.service.list(org.id, {
      status: query.status,
      limit,
      offset,
    })
    const nextOffset = offset + items.length
    const hasMore = nextOffset < total
    return {
      schedules: items,
      total,
      hasMore,
      nextOffset: hasMore ? nextOffset : null,
    }
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: ScheduledReportDto })
  async getOne(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(ScheduledReportIdParamDto))
    params: ScheduledReportIdParamDto,
  ): Promise<ScheduledReportDto> {
    const row = await this.service.get(org.id, params.id)
    if (!row) {
      throw new HttpException(
        { error: { code: 'not-found', message: 'Scheduled report not found.' } },
        HttpStatus.NOT_FOUND,
      )
    }
    return row
  }

  @Post()
  @ApiResponse({ status: 201, type: ScheduledReportDto })
  async create(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateScheduledReportBodyDto))
    body: CreateScheduledReportBodyDto,
  ): Promise<ScheduledReportDto> {
    if (!createRateLimit.allow(user.id)) {
      throw new HttpException(
        {
          error: {
            code: 'rate-limited',
            message: 'Too many schedule creations — try again shortly.',
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    try {
      return await this.service.create({
        orgId: org.id,
        userId: user.id,
        venueId: body.venueId ?? null,
        title: body.title,
        summary: body.summary ?? null,
        frequency: body.frequency,
        hourOfDay: body.hourOfDay,
        dayOfWeek: body.dayOfWeek ?? null,
        dayOfMonth: body.dayOfMonth ?? null,
        timezone: body.timezone,
        prompt: body.prompt ?? null,
      })
    } catch (err) {
      throw this.toHttp(err)
    }
  }

  @Patch(':id/pause')
  @ApiResponse({ status: 200, type: ScheduledReportDto })
  async pause(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(ScheduledReportIdParamDto))
    params: ScheduledReportIdParamDto,
  ): Promise<ScheduledReportDto> {
    try {
      return await this.service.pause(org.id, params.id)
    } catch (err) {
      throw this.toHttp(err)
    }
  }

  @Patch(':id/resume')
  @ApiResponse({ status: 200, type: ScheduledReportDto })
  async resume(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(ScheduledReportIdParamDto))
    params: ScheduledReportIdParamDto,
  ): Promise<ScheduledReportDto> {
    try {
      return await this.service.resume(org.id, params.id)
    } catch (err) {
      throw this.toHttp(err)
    }
  }

  @Patch(':id/cancel')
  @ApiResponse({ status: 200, type: ScheduledReportDto })
  async cancel(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(ScheduledReportIdParamDto))
    params: ScheduledReportIdParamDto,
  ): Promise<ScheduledReportDto> {
    try {
      return await this.service.cancel(org.id, params.id)
    } catch (err) {
      throw this.toHttp(err)
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async remove(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(ScheduledReportIdParamDto))
    params: ScheduledReportIdParamDto,
  ): Promise<void> {
    try {
      await this.service.remove(org.id, params.id)
    } catch (err) {
      throw this.toHttp(err)
    }
  }

  private toHttp(err: unknown): HttpException {
    const message = err instanceof Error ? err.message : 'unknown'
    if (message === 'venue-not-in-org') {
      return new HttpException(
        { error: { code: 'invalid-input', message: 'Venue not found in your organisation.' } },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (message === 'invalid-timezone') {
      return new HttpException(
        { error: { code: 'invalid-input', message: 'Unknown IANA timezone.' } },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (message === 'schedule-cap-reached') {
      return new HttpException(
        {
          error: {
            code: 'schedule-cap-reached',
            message:
              'Your organisation has hit the limit of 50 live scheduled reports. Cancel one before adding another.',
          },
        },
        HttpStatus.CONFLICT,
      )
    }
    if (message === 'not-found') {
      return new HttpException(
        { error: { code: 'not-found', message: 'Scheduled report not found.' } },
        HttpStatus.NOT_FOUND,
      )
    }
    if (err instanceof HttpException) return err
    return new HttpException(
      { error: { code: 'server-error', message: 'Unexpected error.' } },
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
  }
}
