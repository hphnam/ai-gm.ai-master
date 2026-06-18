import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { type ApiErrorResponse, InvitationIdParamSchema } from '../../types'
import { assertAuthEnv } from '../auth/assert-auth-env'
import { CurrentOrg, CurrentUser, RequireRole } from '../auth/auth.decorators'
import { type AuthedRequest, AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import {
  AcceptInvitationResponseDto,
  CreateInvitationResponseDto,
  InvitationPreviewDto,
  InviteBodyDto,
  ListInvitationsQueryDto,
  ListInvitationsResponseDto,
  RevokeInvitationResponseDto,
} from './dto/invitations.dto'
import { InvitationError, InvitationsService } from './invitations.service'
import { MailService } from './mail.service'

// 01-02 audit-added S2: in-memory per-IP throttler for unauth preview endpoint.
// Single-node POC; swap for Redis at multi-instance scale (D-01-02-G).
const PREVIEW_LIMIT_PER_MIN = 60
const previewBuckets = new Map<string, { count: number; windowStart: number }>()

function previewThrottleOk(ip: string): boolean {
  const now = Date.now()
  const WINDOW_MS = 60_000
  const b = previewBuckets.get(ip)
  if (!b || now - b.windowStart > WINDOW_MS) {
    previewBuckets.set(ip, { count: 1, windowStart: now })
    return true
  }
  b.count += 1
  return b.count <= PREVIEW_LIMIT_PER_MIN
}

function mapInvitationError(code: InvitationError['code'], details?: unknown): HttpException {
  const body: ApiErrorResponse = { error: code, details }
  switch (code) {
    case 'invitation-not-found':
      return new NotFoundException(body)
    case 'invitation-expired':
      return new HttpException(body, HttpStatus.GONE)
    case 'invitation-already-accepted':
      return new ConflictException(body)
    case 'invitation-email-mismatch':
      return new ForbiddenException(body)
    case 'invalid-invitation-role':
      return new BadRequestException(body)
    case 'invitation-limit-reached':
      return new HttpException(body, HttpStatus.TOO_MANY_REQUESTS)
    case 'already-a-member':
      return new ConflictException(body)
    case 'email-not-verified':
      return new ForbiddenException(body)
    default: {
      const _exhaustive: never = code
      void _exhaustive
      return new HttpException({ error: 'not-found' } as ApiErrorResponse, HttpStatus.NOT_FOUND)
    }
  }
}

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('org/invitations')
export class InvitationsController {
  private readonly webOrigin: string

  constructor(
    private readonly service: InvitationsService,
    private readonly mail: MailService,
  ) {
    this.webOrigin = assertAuthEnv().webOrigins[0] ?? 'http://localhost:3000'
  }

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 201, type: CreateInvitationResponseDto })
  async create(
    @Body() body: InviteBodyDto,
    @CurrentUser() user: { id: string; name: string | null },
    @CurrentOrg() org: { id: string; name: string; slug: string },
  ): Promise<CreateInvitationResponseDto> {
    try {
      const { row, reissued } = await this.service.createInvitation({
        organizationId: org.id,
        email: body.email,
        role: body.role,
        inviterId: user.id,
      })
      const inviteUrl = `${this.webOrigin}/auth/accept-invitation/${row.id}`
      const mail = await this.mail.sendInvitationEmail({
        to: row.email,
        inviteUrl,
        organizationName: org.name,
        inviterName: user.name,
        expiresAt: new Date(row.expiresAt),
      })
      return {
        invitation: row,
        inviteUrl,
        warning: mail.ok ? undefined : 'mail-send-failed',
        reissued: reissued || undefined,
      } as CreateInvitationResponseDto
    } catch (err) {
      if (err instanceof InvitationError) throw mapInvitationError(err.code, err.details)
      throw err
    }
  }

  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: ListInvitationsResponseDto })
  async list(
    @Query(new ZodValidationPipe(ListInvitationsQueryDto)) query: ListInvitationsQueryDto,
    @CurrentOrg() org: { id: string },
  ): Promise<ListInvitationsResponseDto> {
    return (await this.service.listInvitations({
      organizationId: org.id,
      limit: query.limit,
      offset: query.offset,
    })) as ListInvitationsResponseDto
  }

  @Get(':id/preview')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: InvitationPreviewDto })
  async preview(
    @Param() params: { id: string },
    @Req() req: Request,
  ): Promise<InvitationPreviewDto> {
    // Unauth endpoint; throttle by IP to blunt a crawl/scrape.
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown'
    if (!previewThrottleOk(ip)) {
      const body: ApiErrorResponse = { error: 'payload-too-large' } // closest closed-set code; proper 429 via throw below
      throw new HttpException(body, HttpStatus.TOO_MANY_REQUESTS)
    }
    const parsed = InvitationIdParamSchema.safeParse(params)
    if (!parsed.success) {
      const body: ApiErrorResponse = { error: 'invitation-not-found' }
      throw new NotFoundException(body)
    }
    try {
      return (await this.service.getInvitationPreview(parsed.data.id)) as InvitationPreviewDto
    } catch (err) {
      if (err instanceof InvitationError) throw mapInvitationError(err.code)
      throw err
    }
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: AcceptInvitationResponseDto })
  async accept(
    @Param() params: { id: string },
    @Req() req: AuthedRequest,
  ): Promise<AcceptInvitationResponseDto> {
    const parsed = InvitationIdParamSchema.safeParse(params)
    if (!parsed.success) {
      const body: ApiErrorResponse = { error: 'invitation-not-found' }
      throw new NotFoundException(body)
    }
    const currentUserId = req.user?.id
    const sessionId = req.session?.id
    if (!currentUserId || !sessionId) {
      const body: ApiErrorResponse = { error: 'unauthorized' }
      throw new HttpException(body, HttpStatus.UNAUTHORIZED)
    }
    const fresh = await this.service.getAcceptorUser(currentUserId)
    if (!fresh) {
      const body: ApiErrorResponse = { error: 'unauthorized' }
      throw new HttpException(body, HttpStatus.UNAUTHORIZED)
    }
    try {
      return (await this.service.acceptInvitation({
        id: parsed.data.id,
        currentUser: fresh,
        sessionId,
      })) as AcceptInvitationResponseDto
    } catch (err) {
      if (err instanceof InvitationError) throw mapInvitationError(err.code)
      throw err
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: RevokeInvitationResponseDto })
  async revoke(
    @Param() params: { id: string },
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<RevokeInvitationResponseDto> {
    const parsed = InvitationIdParamSchema.safeParse(params)
    if (!parsed.success) {
      const body: ApiErrorResponse = { error: 'invitation-not-found' }
      throw new NotFoundException(body)
    }
    try {
      await this.service.revokeInvitation({
        id: parsed.data.id,
        organizationId: org.id,
        revokerUserId: user.id,
      })
      return { ok: true } as RevokeInvitationResponseDto
    } catch (err) {
      if (err instanceof InvitationError) throw mapInvitationError(err.code)
      throw err
    }
  }
}
