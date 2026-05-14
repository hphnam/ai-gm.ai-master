import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentOrg, CurrentUser, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { ListOrgMembersResponseDto } from './dto/invitations.dto'
import { InvitationsService } from './invitations.service'

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
}
