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
  Patch,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { FileInterceptor } from '@nestjs/platform-express'
import { UploadPayloadTooLargeFilter } from './multer-exception.filter'
import {
  ClassifyDocRequestSchema,
  type ApiErrorResponse,
  type ClassifyDocRequest,
} from '../../types'
import { zodPipe } from '../../common/zod-pipe'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, CurrentUser, RequireRole } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import {
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_BYTES_BY_MIME,
  UPLOAD_MIME_ALLOWLIST,
  normalizeDelimiter,
  normalizeTextBufferEncoding,
  sanitizeUploadTitle,
} from './doc-extract'
import { extractImage, isDocsImageMime } from './extractors/image-extractor'
import { ReductoError, ReductoService } from '../reducto/reducto.service'
import {
  CategorySuggestionUnavailableError,
  DocNotFoundOrCrossOrgError,
  DocsService,
  TypeNameConflictError,
  TypeProposalMissingError,
} from './docs.service'
import {
  AcceptTypeRequestDto,
  AnswerGapRequestDto,
  CategorySuggestionDto,
  CreateDocRequestDto,
  CreateDocResponseDto,
  DocDetailDto,
  DocIdParamDto,
  DocListItemDto,
  DocumentTypeDto,
  GapKbMatchDto,
  KbGapDto,
  NoDataQueryDto,
  UpdateDocRequestDto,
} from './dto/docs.dto'

@ApiTags('docs')
@ApiBearerAuth()
@Controller('docs')
@UseGuards(AuthGuard, RoleGuard)
export class DocsController {
  private readonly logger = new Logger(DocsController.name)

  constructor(
    private readonly docsService: DocsService,
    private readonly reducto: ReductoService,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: [DocListItemDto] })
  list(@CurrentOrg() org: { id: string }): Promise<DocListItemDto[]> {
    return this.docsService.list(org.id) as Promise<DocListItemDto[]>
  }

  // Lists confirmed DocumentTypes for the org — used by the classify-manually
  // UI to offer "pick an existing category" before creating a new one.
  @Get('types')
  @ApiResponse({ status: 200, type: [DocumentTypeDto] })
  listTypes(@CurrentOrg() org: { id: string }): Promise<DocumentTypeDto[]> {
    return this.docsService.listTypes(org.id) as Promise<DocumentTypeDto[]>
  }

  // Phase C — pending knowledge gaps surfaced for GM authoritative answer.
  @Get('gaps')
  @ApiResponse({ status: 200, type: [KbGapDto] })
  listGaps(@CurrentOrg() org: { id: string }): Promise<KbGapDto[]> {
    return this.docsService.listGaps(org.id) as Promise<KbGapDto[]>
  }

  // Phase H — top no-data queries (what staff have been asking the KB but
  // can't be answered). Surfaces gaps the agent didn't proactively capture.
  @Get('analytics/no-data-queries')
  @ApiResponse({ status: 200, type: [NoDataQueryDto] })
  listNoDataQueries(
    @CurrentOrg() org: { id: string },
  ): Promise<NoDataQueryDto[]> {
    return this.docsService.listNoDataQueries(org.id) as Promise<NoDataQueryDto[]>
  }

  @Post('gaps/:id/answer')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: CreateDocResponseDto })
  async answerGap(
    @Param(new ZodValidationPipe(DocIdParamDto)) params: DocIdParamDto,
    @Body() body: AnswerGapRequestDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string } | null,
  ): Promise<CreateDocResponseDto> {
    try {
      return (await this.docsService.answerGap(
        params.id,
        org.id,
        body.answer,
        user?.id ?? null,
      )) as CreateDocResponseDto
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }
  }

  // "Search KB" button on gap cards — returns top-3 KB hits for the gap's
  // question so the GM can confirm the answer already exists and delete the gap.
  @Get('gaps/:id/kb-matches')
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: [GapKbMatchDto] })
  async gapKbMatches(
    @Param(new ZodValidationPipe(DocIdParamDto)) params: DocIdParamDto,
    @CurrentOrg() org: { id: string },
  ): Promise<GapKbMatchDto[]> {
    try {
      return (await this.docsService.findKbMatchesForGap(
        params.id,
        org.id,
      )) as GapKbMatchDto[]
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }
  }

  // Declared BEFORE the generic @Delete(':id') so the specific path matches
  // first. Service-side guard rejects rows whose answerStatus !== 'pending'.
  @Delete('gaps/:id')
  @HttpCode(204)
  @RequireRole('owner', 'manager')
  async removeGap(
    @Param(new ZodValidationPipe(DocIdParamDto)) params: DocIdParamDto,
    @CurrentOrg() org: { id: string },
  ): Promise<void> {
    try {
      await this.docsService.removeGap(params.id, org.id)
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: DocDetailDto })
  async get(
    @Param(new ZodValidationPipe(DocIdParamDto)) params: DocIdParamDto,
    @CurrentOrg() org: { id: string },
  ): Promise<DocDetailDto> {
    const doc = await this.docsService.getById(params.id, org.id)
    if (!doc) {
      throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
    }
    return doc as DocDetailDto
  }

  @Post()
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: CreateDocResponseDto })
  async create(
    @Body() body: CreateDocRequestDto,
    @CurrentOrg() org: { id: string },
    // Plan 04-03 audit-M8 — actingUserId threaded for extractor audit log.
    @CurrentUser() user: { id: string } | null,
  ): Promise<CreateDocResponseDto> {
    try {
      const { description, ...rest } = body
      const enrichInput = {
        ...rest,
        content: composeContent(description, rest.content),
      }
      const stub = await this.docsService.createStub(enrichInput, org.id)
      // Fire-and-forget enrichment. setImmediate lets us flush the response
      // before the classifier + Claude calls run.
      setImmediate(() => {
        void this.docsService.enrichInBackground(
          stub.id,
          enrichInput,
          org.id,
          user?.id ?? null,
        )
      })
      return stub as CreateDocResponseDto
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        venueId: { type: 'string' },
        description: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, type: CreateDocResponseDto })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { venueId?: string; description?: string; title?: string },
    @CurrentOrg() org: { id: string },
    // Plan 04-03 audit-M8 — actingUserId threaded for extractor audit log.
    @CurrentUser() user: { id: string } | null,
  ): Promise<CreateDocResponseDto> {
    if (!file) {
      throw new BadRequestException({ error: 'invalid-input' } satisfies ApiErrorResponse)
    }
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
    if (file.size > UPLOAD_MAX_BYTES) {
      throw new PayloadTooLargeException({
        error: 'file-too-large',
      } satisfies ApiErrorResponse)
    }

    const extractStart = Date.now()
    let content = ''
    let sourceImageBytes: Buffer | null = null
    let sourceImageMime: string | null = null
    let reductoFileId: string | null = null
    try {
      if (isDocsImageMime(file.mimetype)) {
        const result = await extractImage(file.buffer, file.mimetype, this.logger)
        content = result.text
        sourceImageBytes = result.sourceBytes
        sourceImageMime = file.mimetype
        this.logger.log(
          JSON.stringify({
            level: 'log',
            event: 'docs.image_extract_cost',
            ...result.cost,
          }),
        )
      } else {
        const decoded = normalizeTextBufferEncoding(
          file.buffer,
          file.mimetype,
          file.originalname,
        )
        const buffer = normalizeDelimiter(decoded, file.mimetype, file.originalname)
        reductoFileId = await this.reducto.upload(buffer, file.originalname, file.mimetype)
      }
    } catch (err) {
      if (err instanceof ReductoError) {
        throw new HttpException(
          {
            error: 'extraction-failed',
            details: { reason: 'corrupt-bytes' },
          } satisfies ApiErrorResponse,
          422,
        )
      }
      throw err
    }
    const extractionMs = Date.now() - extractStart

    const rawOverride = typeof body?.title === 'string' ? body.title.trim() : ''
    const title =
      rawOverride.length > 0
        ? rawOverride.slice(0, 200)
        : sanitizeUploadTitle(file.originalname)
    const venueId =
      typeof body?.venueId === 'string' && body.venueId.trim().length > 0
        ? body.venueId
        : null
    const description =
      typeof body?.description === 'string' && body.description.trim().length > 0
        ? body.description.trim().slice(0, 1_000)
        : undefined

    let result: CreateDocResponseDto
    try {
      const enrichInput = {
        title,
        content: composeContent(description, content),
        venueId,
        sourceImageBytes,
        sourceImageMime,
        reductoFileId,
        description,
        mimeType: file.mimetype,
      }
      result = (await this.docsService.createStub(enrichInput, org.id)) as CreateDocResponseDto
      setImmediate(() => {
        void this.docsService.enrichInBackground(
          result.id,
          enrichInput,
          org.id,
          user?.id ?? null,
        )
      })
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
    @Param(new ZodValidationPipe(DocIdParamDto)) params: DocIdParamDto,
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

  // Edit a doc (title, venue, description) and re-ingest. The user-confirmed
  // DocumentType is preserved across re-ingest — see DocsService.updateDoc.
  @Patch(':id')
  @HttpCode(204)
  @RequireRole('owner', 'manager')
  async update(
    @Param(new ZodValidationPipe(DocIdParamDto)) params: DocIdParamDto,
    @Body() body: UpdateDocRequestDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string } | null,
  ): Promise<void> {
    try {
      await this.docsService.updateDoc(params.id, org.id, user?.id ?? null, body)
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }
  }

  // Suggest button in the classify modal's "Create new" tab — re-runs the
  // classifier and returns a name + kind for the user to accept or edit.
  @Get(':id/category-suggestion')
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: CategorySuggestionDto })
  async suggestCategory(
    @Param(new ZodValidationPipe(DocIdParamDto)) params: DocIdParamDto,
    @CurrentOrg() org: { id: string },
  ): Promise<CategorySuggestionDto> {
    try {
      return (await this.docsService.suggestCategory(
        params.id,
        org.id,
      )) as CategorySuggestionDto
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      if (err instanceof CategorySuggestionUnavailableError) {
        throw new HttpException(
          { error: 'category-suggestion-unavailable' } satisfies ApiErrorResponse,
          422,
        )
      }
      throw err
    }
  }

  @Post(':id/accept-type')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: DocumentTypeDto })
  async acceptType(
    @Param(new ZodValidationPipe(DocIdParamDto)) params: DocIdParamDto,
    @Body() body: AcceptTypeRequestDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string } | null,
  ): Promise<DocumentTypeDto> {
    try {
      return (await this.docsService.acceptProposedType(
        params.id,
        org.id,
        user?.id ?? null,
        body.kind,
        body.name,
      )) as DocumentTypeDto
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      if (err instanceof TypeProposalMissingError) {
        throw new HttpException(
          { error: 'type-proposal-missing' } satisfies ApiErrorResponse,
          422,
        )
      }
      if (err instanceof TypeNameConflictError) {
        throw new HttpException(
          { error: 'type-name-conflict' } satisfies ApiErrorResponse,
          422,
        )
      }
      throw err
    }
  }

  @Post(':id/classify')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: DocumentTypeDto })
  async classifyManually(
    @Param(new ZodValidationPipe(DocIdParamDto)) params: DocIdParamDto,
    // ClassifyDocRequestSchema is a z.union — kept on zodPipe since createZodDto
    // can't extend unions. Swagger loses the discriminated body schema for this
    // one endpoint; the union still reaches the orval consumer through the
    // ClassifyDocRequest type re-export.
    @Body(zodPipe(ClassifyDocRequestSchema)) body: ClassifyDocRequest,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string } | null,
  ): Promise<DocumentTypeDto> {
    try {
      return (await this.docsService.classifyManually(
        params.id,
        org.id,
        user?.id ?? null,
        body,
      )) as DocumentTypeDto
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }
  }

  @Post(':id/reject-type')
  @HttpCode(204)
  @RequireRole('owner', 'manager')
  async rejectType(
    @Param(new ZodValidationPipe(DocIdParamDto)) params: DocIdParamDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string } | null,
  ): Promise<void> {
    try {
      await this.docsService.rejectProposedType(params.id, org.id, user?.id ?? null)
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      if (err instanceof TypeProposalMissingError) {
        throw new HttpException(
          { error: 'type-proposal-missing' } satisfies ApiErrorResponse,
          422,
        )
      }
      throw err
    }
  }
}

// Prepends the uploader's free-text brief to the doc content so the classifier,
// embedder, and chat retrieval all receive it as part of the document's signal.
function composeContent(description: string | undefined, content: string): string {
  const trimmed = (description ?? '').trim()
  if (trimmed.length === 0) return content
  return `Context from uploader: ${trimmed}\n\n---\n\n${content}`
}
