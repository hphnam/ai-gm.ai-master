import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Logger,
  NotFoundException,
  Param,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { UploadPayloadTooLargeFilter } from './multer-exception.filter'
import { z } from 'zod'
import {
  CreateDocRequestSchema,
  UUID_RE,
  type ApiErrorResponse,
  type CreateDocRequest,
  type CreateDocResponse,
  type DocDetail,
  type DocListItem,
} from '@gm-ai/types'
import { zodPipe } from '../../common/zod-pipe'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import {
  ExtractError,
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_BYTES_BY_MIME,
  UPLOAD_MIME_ALLOWLIST,
  extractText,
  sanitizeUploadTitle,
} from './doc-extract'
import { DocNotFoundOrCrossOrgError, DocsService } from './docs.service'

const DocIdParamSchema = z.object({
  id: z.string().regex(UUID_RE, 'invalid uuid'),
})

@Controller('docs')
@UseGuards(AuthGuard, RoleGuard)
export class DocsController {
  private readonly logger = new Logger(DocsController.name)

  constructor(private readonly docsService: DocsService) {}

  @Get()
  list(@CurrentOrg() org: { id: string }): Promise<DocListItem[]> {
    return this.docsService.list(org.id)
  }

  @Get(':id')
  async get(
    @Param(zodPipe(DocIdParamSchema)) params: { id: string },
    @CurrentOrg() org: { id: string },
  ): Promise<DocDetail> {
    const doc = await this.docsService.getById(params.id, org.id)
    if (!doc) {
      throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
    }
    return doc
  }

  @Post()
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  async create(
    @Body(zodPipe(CreateDocRequestSchema)) body: CreateDocRequest,
    @CurrentOrg() org: { id: string },
  ): Promise<CreateDocResponse> {
    try {
      return await this.docsService.create(body, org.id)
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'venue-not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }
  }

  @Post('upload')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  @UseFilters(UploadPayloadTooLargeFilter)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_MAX_BYTES } }))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { venueId?: string },
    @CurrentOrg() org: { id: string },
  ): Promise<CreateDocResponse> {
    if (!file) {
      throw new BadRequestException({ error: 'invalid-input' } satisfies ApiErrorResponse)
    }
    // Plan 04-01: MIME check runs BEFORE size check so unknown types reject with 415 (clearer
    // signal) rather than a 413 that looks like a quota issue. Per-MIME cap then refines the
    // single UPLOAD_MAX_BYTES ceiling.
    if (!UPLOAD_MIME_ALLOWLIST.includes(file.mimetype as (typeof UPLOAD_MIME_ALLOWLIST)[number])) {
      throw new HttpException(
        { error: 'unsupported-file-type' } satisfies ApiErrorResponse,
        415,
      )
    }
    const perMimeCap = UPLOAD_MAX_BYTES_BY_MIME[file.mimetype]
    if (perMimeCap !== undefined && file.size > perMimeCap) {
      throw new PayloadTooLargeException({
        error: 'file-too-large',
      } satisfies ApiErrorResponse)
    }
    // Defense-in-depth: global ceiling (also multer's limits.fileSize).
    if (file.size > UPLOAD_MAX_BYTES) {
      throw new PayloadTooLargeException({
        error: 'file-too-large',
      } satisfies ApiErrorResponse)
    }

    const extractStart = Date.now()
    let content: string
    try {
      content = await extractText(file.buffer, file.mimetype)
    } catch (err) {
      if (err instanceof ExtractError) {
        // Plan 04-01 audit-S6: plumb ExtractError.reason through the response so the UI can
        // render specific user-friendly strings instead of a generic fall-through. Consumed by
        // apps/web/src/lib/map-api-error.ts which branches on details.reason.
        throw new HttpException(
          {
            error: 'extraction-failed',
            details: { reason: err.reason },
          } satisfies ApiErrorResponse,
          422,
        )
      }
      throw err
    }
    const extractionMs = Date.now() - extractStart

    const title = sanitizeUploadTitle(file.originalname)
    const venueId =
      typeof body?.venueId === 'string' && body.venueId.trim().length > 0
        ? body.venueId
        : null

    let result: CreateDocResponse
    try {
      result = await this.docsService.create({ title, content, venueId }, org.id)
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'venue-not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }

    this.logger.warn(
      JSON.stringify({
        level: 'warn',
        event: 'docs.uploaded',
        actingOrgId: org.id,
        originalFilename: title,
        mimeType: file.mimetype,
        byteSize: file.size,
        knowledgeItemId: result.id,
        extractionMs,
      }),
    )

    return result
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireRole('owner', 'manager')
  async remove(
    @Param(zodPipe(DocIdParamSchema)) params: { id: string },
    @CurrentOrg() org: { id: string },
  ): Promise<void> {
    try {
      await this.docsService.remove(params.id, org.id)
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }
  }
}
