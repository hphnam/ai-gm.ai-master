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
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_BYTES_BY_MIME,
  UPLOAD_MIME_ALLOWLIST,
  sanitizeUploadTitle,
} from './doc-extract'
import { extractImage, isDocsImageMime } from './extractors/image-extractor'
import { ReductoError, ReductoService } from '../reducto/reducto.service'
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

  constructor(
    private readonly docsService: DocsService,
    private readonly reducto: ReductoService,
  ) {}

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

  // Declared BEFORE the generic @Delete(':id') so the specific path matches
  // first. Service-side guard rejects rows whose answerStatus !== 'pending'.
  @Delete('gaps/:id')
  @HttpCode(204)
  @RequireRole('owner', 'manager')
  async removeGap(
    @Param(zodPipe(DocIdParamSchema)) params: { id: string },
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
    // Phase 6 — Reducto extraction. Image path stays separate (Claude vision
    // is for photo Q&A, not structured-document parsing). All other MIMEs
    // upload to Reducto here, then enrichInBackground calls parse() against
    // the returned file_id.
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
        // Reducto upload is fast (single multipart round-trip). Parse runs
        // in enrichInBackground so the controller returns a stub immediately.
        // Buffer is consumed here; multer's request-lifecycle buffer is fine.
        reductoFileId = await this.reducto.upload(file.buffer, file.originalname, file.mimetype)
      }
    } catch (err) {
      if (err instanceof ReductoError) {
        // Surface a uniform extraction-failed response so the existing UI
        // mapApiError 'corrupt-bytes' path keeps working. Reducto-specific
        // failures map to the same user-facing string the local extractor
        // used: "the file appears corrupted or the extension does not match".
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

    let result: CreateDocResponse
    try {
      const enrichInput = {
        title,
        // For images: content already populated. For Reducto-backed paths: the
        // user description is all we have at stub time; enrichInBackground
        // replaces this with composeContent(description, parsed.text) once
        // parse() returns.
        content: composeContent(description, content),
        venueId,
        sourceImageBytes,
        sourceImageMime,
        // Phase 6 — file_id from Reducto upload; consumed by enrichInBackground.
        // Null for image uploads (no Reducto involvement).
        reductoFileId,
        // Description survives the parse round-trip so background enrichment
        // can compose final content with it.
        description,
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
