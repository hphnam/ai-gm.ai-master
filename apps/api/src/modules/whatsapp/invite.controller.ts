// Phase 03-01 — Manager-facing WhatsApp invite controller.
// POST /whatsapp/invites           — create (one-time code display)
// GET  /whatsapp/invites           — list pending + recently-transitioned (24h)
// DELETE /whatsapp/invites/:id     — revoke pending invite
//
// All routes require an authenticated session + manager OR owner role.
// Responses follow the existing project pattern: ApiErrorResponse with closed
// API_ERROR_CODES on failures; 404-not-403 for cross-tenant attempts.

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { zodPipe } from '../../common/zod-pipe'
import { prisma } from '../../database/prisma'
import {
  type CreateInviteInput,
  CreateInviteInputSchema,
  type CreateInviteResponse,
  type ListInvitesResponse,
} from '../../types'
import { assertAuthEnv } from '../auth/assert-auth-env'
import { CurrentOrg, CurrentUser, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { InviteService } from './invite.service'
import { checkRedeemRateLimit } from './invite-redeem-rate-limit'
import { verifyInviteToken } from './invite-token'

@ApiTags('whatsapp-invites')
@ApiBearerAuth()
@Controller('whatsapp/invites')
@UseGuards(AuthGuard, RoleGuard)
export class InviteController {
  constructor(private readonly invites: InviteService) {}

  @Post()
  @RequireRole('owner', 'manager')
  async create(
    @Body(zodPipe(CreateInviteInputSchema)) input: CreateInviteInput,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Query('force') forceRaw?: string,
  ): Promise<CreateInviteResponse> {
    const force = forceRaw === 'true'
    const { invite, code } = await this.invites.create(org.id, user.id, input, { force })
    return {
      invite: { ...invite, code },
      oneTimeDisplay: true,
    }
  }

  @Get()
  @RequireRole('owner', 'manager')
  async list(@CurrentOrg() org: { id: string }): Promise<ListInvitesResponse> {
    const invites = await this.invites.listForOrg(org.id)
    return { invites }
  }

  @Delete(':id')
  @RequireRole('owner', 'manager')
  @HttpCode(204)
  async revoke(
    @Param('id') id: string,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await this.invites.revoke(org.id, id, user.id)
  }
}

// 03-06 — public preview + redeem endpoints for the signed-link onboarding flow.
// Unauthenticated (the token IS the auth). Mounted on a separate controller so
// the AuthGuard above doesn't gate it.
//
// Security posture:
//   - Per-IP + per-inviteId throttle (invite-redeem-rate-limit). 429 on exceed.
//   - Single opaque public error code `invite-invalid`. Granular reasons stay
//     in logs only — differentiated public errors would act as an existence
//     oracle against guessed inviteIds.
//   - Token verification uses BETTER_AUTH_SECRET via assertAuthEnv (not raw
//     process.env) so any future env validation drift surfaces at boot.
@ApiTags('whatsapp-invites')
@Controller('whatsapp/invites/redeem')
export class InviteRedeemController {
  private readonly logger = new Logger(InviteRedeemController.name)

  constructor(private readonly invites: InviteService) {}

  private throttleOrThrow(req: Request, inviteIdOrNull: string | null): void {
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown'
    const gate = checkRedeemRateLimit(ip, inviteIdOrNull)
    if (!gate.allowed) {
      this.logger.warn('whatsapp_invite.redeem_rate_limited', {
        reason: gate.reason,
        inviteIdPresent: !!inviteIdOrNull,
      })
      throw new HttpException({ error: 'too-many-requests' }, HttpStatus.TOO_MANY_REQUESTS)
    }
  }

  private opaqueInvalid(reason: string, inviteId?: string): never {
    // Log the granular reason; public response stays opaque.
    this.logger.warn('whatsapp_invite.redeem_rejected', { reason, inviteId })
    throw new BadRequestException({ error: 'invite-invalid' })
  }

  @Get('preview')
  async preview(
    @Req() req: Request,
    @Query('t') token?: string,
  ): Promise<{ inviteId: string; orgName: string; role: string }> {
    this.throttleOrThrow(req, null)
    if (!token) this.opaqueInvalid('missing-token')

    const secret = assertAuthSecret()
    const verified = verifyInviteToken(token!, secret)
    if (!verified.ok) this.opaqueInvalid(`token-${verified.reason}`)

    // Second throttle pass keyed by inviteId — protects a known invite from
    // concentrated retries even when IPs rotate.
    this.throttleOrThrow(req, verified.inviteId)

    const invite = await prisma.whatsappInvite.findUnique({
      where: { id: verified.inviteId },
      select: {
        id: true,
        status: true,
        role: true,
        organization: { select: { name: true } },
      },
    })
    if (!invite || invite.status !== 'pending') {
      this.opaqueInvalid('not-active', verified.inviteId)
    }
    return { inviteId: invite!.id, orgName: invite!.organization.name, role: invite!.role }
  }

  @Post('complete')
  @HttpCode(200)
  async complete(
    @Req() req: Request,
    @Body() body: { token?: string; name?: string },
  ): Promise<{ ok: true; organizationId: string }> {
    this.throttleOrThrow(req, null)
    if (!body.token || !body.name) this.opaqueInvalid('missing-fields')

    const secret = assertAuthSecret()
    const verified = verifyInviteToken(body.token!, secret)
    if (!verified.ok) this.opaqueInvalid(`token-${verified.reason}`)

    this.throttleOrThrow(req, verified.inviteId)

    const result = await this.invites.redeemByToken(verified.inviteId, body.name!)
    if (!result.ok) this.opaqueInvalid(`redeem-${result.reason}`, verified.inviteId)
    return { ok: true, organizationId: result.organizationId }
  }
}

// 03-06 fix 8: route BETTER_AUTH_SECRET through assertAuthEnv() rather than
// reading process.env directly. Lazy-call assertAuthEnv() per request because
// the validator runs at boot anyway — this is just to keep the access path
// consistent with the rest of the codebase.
function assertAuthSecret(): string {
  return assertAuthEnv().secret
}
