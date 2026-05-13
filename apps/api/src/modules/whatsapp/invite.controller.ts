// Phase 03-01 — Manager-facing WhatsApp invite controller.
// POST /whatsapp/invites           — create (one-time code display)
// GET  /whatsapp/invites           — list pending + recently-transitioned (24h)
// DELETE /whatsapp/invites/:id     — revoke pending invite
//
// All routes require an authenticated session + manager OR owner role.
// Responses follow the existing project pattern: ApiErrorResponse with closed
// API_ERROR_CODES on failures; 404-not-403 for cross-tenant attempts.

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { zodPipe } from '../../common/zod-pipe'
import {
  type CreateInviteInput,
  CreateInviteInputSchema,
  type CreateInviteResponse,
  type ListInvitesResponse,
} from '../../types'
import { CurrentOrg, CurrentUser, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { InviteService } from './invite.service'

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
