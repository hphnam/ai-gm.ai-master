import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpException,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { ApiErrorResponse } from '../../types'
import {
  CurrentOrg,
  CurrentRole,
  CurrentUser,
  CurrentVenueScope,
  RequireRole,
} from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import type { VenueScope } from '../auth/venue-scope'
import {
  ListOrgMembersResponseDto,
  RemoveMemberParamSchema,
  RemoveMemberResponseDto,
  UpdateMemberVenuesBodyDto,
  UpdateMemberVenuesResponseDto,
} from './dto/invitations.dto'
import { InvitationError, InvitationsService, MemberActionError } from './invitations.service'

function mapMemberError(code: MemberActionError['code']): HttpException {
  switch (code) {
    case 'member-not-found':
      return new NotFoundException({ error: 'member-not-found' } as ApiErrorResponse)
    case 'cannot-remove-self':
    case 'cannot-remove-owner':
    case 'insufficient-role-for-target':
      // Collapse to 403 with a reason detail so a client CAN distinguish them.
      return new ForbiddenException({
        error: 'forbidden',
        details: { reason: code },
      } as ApiErrorResponse)
    default: {
      const _exhaustive: never = code
      void _exhaustive
      return new ForbiddenException({ error: 'forbidden' } as ApiErrorResponse)
    }
  }
}

// Members directory — surfaces every accepted org member so managers can see
// who's actually on the team. Read-only; same role gate as invitations.
@ApiTags('org-members')
@ApiBearerAuth()
@Controller('org/members')
export class OrgMembersController {
  constructor(private readonly service: InvitationsService) {}

  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: ListOrgMembersResponseDto })
  async list(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<ListOrgMembersResponseDto> {
    return (await this.service.listMembers({
      organizationId: org.id,
      currentUserId: user.id,
    })) as ListOrgMembersResponseDto
  }

  @Delete(':userId')
  @UseGuards(AuthGuard, RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiResponse({ status: 200, type: RemoveMemberResponseDto })
  async remove(
    @Param() params: { userId: string },
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @CurrentRole() role: string | undefined,
  ): Promise<RemoveMemberResponseDto> {
    const parsed = RemoveMemberParamSchema.safeParse(params)
    if (!parsed.success) {
      throw new NotFoundException({ error: 'member-not-found' } as ApiErrorResponse)
    }
    try {
      const result = await this.service.removeMember({
        organizationId: org.id,
        actorUserId: user.id,
        actorRole: role ?? 'staff',
        targetUserId: parsed.data.userId,
      })
      return { ok: true, deletedUser: result.deletedUser } as RemoveMemberResponseDto
    } catch (err) {
      if (err instanceof MemberActionError) throw mapMemberError(err.code)
      throw err
    }
  }

  @Patch(':userId/venues')
  @UseGuards(AuthGuard, RoleGuard)
  @RequireRole('owner', 'manager')
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiResponse({ status: 200, type: UpdateMemberVenuesResponseDto })
  async updateVenues(
    @Param() params: { userId: string },
    @Body() body: UpdateMemberVenuesBodyDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @CurrentRole() role: string | undefined,
    @CurrentVenueScope() scope: VenueScope,
  ): Promise<UpdateMemberVenuesResponseDto> {
    const parsed = RemoveMemberParamSchema.safeParse(params)
    if (!parsed.success) {
      throw new NotFoundException({ error: 'member-not-found' } as ApiErrorResponse)
    }
    try {
      const result = await this.service.updateMemberVenues({
        organizationId: org.id,
        actorUserId: user.id,
        actorRole: role ?? 'staff',
        actorScope: scope,
        targetUserId: parsed.data.userId,
        venueIds: body.venueIds ?? [],
      })
      return { ok: true, venueIds: result.venueIds } as UpdateMemberVenuesResponseDto
    } catch (err) {
      if (err instanceof MemberActionError) throw mapMemberError(err.code)
      if (err instanceof InvitationError && err.code === 'invalid-venue-scope') {
        throw new BadRequestException({ error: 'invalid-venue-scope' } as ApiErrorResponse)
      }
      throw err
    }
  }
}
