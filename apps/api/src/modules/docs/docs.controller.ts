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
  AcceptTypeRequestSchema,
  AnswerGapRequestSchema,
  ClassifyDocRequestSchema,
  CreateDocRequestSchema,
  UUID_RE,
  type AcceptTypeRequest,
  type AcceptTypeResponse,
  type AnswerGapRequest,
  type ApiErrorResponse,
  type ClassifyDocRequest,
  type ClassifyDocResponse,
  type CreateDocRequest,
  type CreateDocResponse,
  type DocDetail,
  type DocListItem,
  type DocumentTypeDto,
  type KbGapDto,
} from '@gm-ai/types'
import { zodPipe } from '../../common/zod-pipe'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, CurrentUser, RequireRole } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import {
  ExtractError,
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_BYTES_BY_MIME,
  UPLOAD_MIME_ALLOWLIST,
  extractText,
  sanitizeUploadTitle,
} from './doc-extract'
import { extractImage, isDocsImageMime } from './extractors/image-extractor'
import {
  DocNotFoundOrCrossOrgError,
  DocsService,
  TypeNameConflictError,
  TypeProposalMissingError,
} from './docs.service'

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

  // Lists confirmed DocumentTypes for the org — used by the classify-manually
  // UI to offer "pick an existing category" before creating a new one.
  @Get('types')
  listTypes(@CurrentOrg() org: { id: string }): Promise<DocumentTypeDto[]> {
    return this.docsService.listTypes(org.id)
  }

  // Phase C — pending knowledge gaps surfaced for GM authoritative answer.
  @Get('gaps')
  listGaps(@CurrentOrg() org: { id: string }): Promise<KbGapDto[]> {
    return this.docsService.listGaps(org.id)
  }

  // Phase H — top no-data queries (what staff have been asking the KB but
  // can't be answered). Surfaces gaps the agent didn't proactively capture.
  @Get('analytics/no-data-queries')
  listNoDataQueries(
    @CurrentOrg() org: { id: string },
  ): Promise<Array<{ query: string; askCount: number; lastAskedAt: string }>> {
    return this.docsService.listNoDataQueries(org.id)
  }

  @Post('gaps/:id/answer')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  async answerGap(
    @Param(zodPipe(DocIdParamSchema)) params: { id: string },
    @Body(zodPipe(AnswerGapRequestSchema)) body: AnswerGapRequest,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string } | null,
  ): Promise<CreateDocResponse> {
    try {
      return await this.docsService.answerGap(params.id, org.id, body.answer, user?.id ?? null)
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }
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
    // Plan 04-03 audit-M8 — actingUserId threaded for extractor audit log.
    @CurrentUser() user: { id: string } | null,
  ): Promise<CreateDocResponse> {
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
      return stub
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
    @Body() body: { venueId?: string; description?: string; title?: string },
    @CurrentOrg() org: { id: string },
    // Plan 04-03 audit-M8 — actingUserId threaded for extractor audit log.
    @CurrentUser() user: { id: string } | null,
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
    // Plan 04-01 Task 3 — image path owns its own persistence pipeline because it also writes
    // the raw bytes to KnowledgeItem.sourceImageBytes for future Plan 04-02 re-classification.
    // Text-only formats stay on the existing extractText path.
    let sourceImageBytes: Buffer | null = null
    let sourceImageMime: string | null = null
    // Plan 05-01 Task 2 — preserve the original CSV/XLSX buffer for the structured-data
    // tee in IngestService. Other mimes leave this null and skip the tee entirely.
    let tabularSourceBytes: Buffer | null = null
    try {
      if (isDocsImageMime(file.mimetype)) {
        const result = await extractImage(file.buffer, file.mimetype, this.logger)
        content = result.text
        sourceImageBytes = result.sourceBytes
        sourceImageMime = file.mimetype
        // audit-M1: cost log carries tokens/bytes/mime/USD only — never the extracted text,
        // never the base64 payload, never the Anthropic API key.
        this.logger.log(
          JSON.stringify({
            level: 'log',
            event: 'docs.image_extract_cost',
            ...result.cost,
          }),
        )
      } else {
        content = await extractText(file.buffer, file.mimetype)
        if (
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ) {
          // Plan 05-01 Task 2 — keep the original buffer for the structured-data tee.
          // Buffer.from(file.buffer) clones so multer's underlying memory is detached
          // before the controller frees the request lifecycle.
          tabularSourceBytes = Buffer.from(file.buffer)
        }
      }
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

    let result: CreateDocResponse
    try {
      const enrichInput = {
        title,
        content: composeContent(description, content),
        venueId,
        sourceImageBytes,
        sourceImageMime,
        // Plan 05-01 Task 2 — threaded to IngestService.persistTabular via enrichInBackground.
        tabularSourceBytes,
        mimeType: file.mimetype,
      }
      result = await this.docsService.createStub(enrichInput, org.id)
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

  // Plan 04-02 Task 3 — owner accepts a pending DocumentType proposal.
  // Plan 04-03 Task 3 — optional body.kind overrides classifier's proposed kind.
  @Post(':id/accept-type')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  async acceptType(
    @Param(zodPipe(DocIdParamSchema)) params: { id: string },
    @Body(zodPipe(AcceptTypeRequestSchema)) body: AcceptTypeRequest,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string } | null,
  ): Promise<AcceptTypeResponse> {
    try {
      return await this.docsService.acceptProposedType(
        params.id,
        org.id,
        user?.id ?? null,
        body.kind,
        body.name,
      )
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

  // Manual classification for an Unclassified row. Body is either
  // `{ typeId }` (pick existing) or `{ name, kind }` (create new).
  @Post(':id/classify')
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  async classifyManually(
    @Param(zodPipe(DocIdParamSchema)) params: { id: string },
    @Body(zodPipe(ClassifyDocRequestSchema)) body: ClassifyDocRequest,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string } | null,
  ): Promise<ClassifyDocResponse> {
    try {
      return await this.docsService.classifyManually(
        params.id,
        org.id,
        user?.id ?? null,
        body,
      )
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }
  }

  // Plan 04-02 Task 3 — owner rejects a pending proposal (KnowledgeItem stays unclassified).
  @Post(':id/reject-type')
  @HttpCode(204)
  @RequireRole('owner', 'manager')
  async rejectType(
    @Param(zodPipe(DocIdParamSchema)) params: { id: string },
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
// Labelled inline so a human inspecting the stored KnowledgeItem can see it
// came from the uploader rather than the source file.
function composeContent(description: string | undefined, content: string): string {
  const trimmed = (description ?? '').trim()
  if (trimmed.length === 0) return content
  return `Context from uploader: ${trimmed}\n\n---\n\n${content}`
}
