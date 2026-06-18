import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentOrg, RequireRole } from '../../auth/auth.decorators'
import { AuthGuard } from '../../auth/auth.guard'
import { RoleGuard } from '../../auth/role.guard'
import { ListSquareLocationsResponseDto } from './square.dto'
import { SquareService } from './square.service'

/// Square-specific HTTP surface (separate from the generic /integrations
/// endpoints in IntegrationsController). Currently the only route is
/// listLocations — managers need it to pick which Square location each
/// venue maps to during setup. Provider-specific endpoints land in the
/// provider's own module so the core integrations module stays generic.
@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations/square')
@UseGuards(AuthGuard, RoleGuard)
export class SquareController {
  constructor(private readonly square: SquareService) {}

  /// List Square locations the connected merchant can see. Manager-only —
  /// staff don't need this. Returns the same shape the chat agent gets from
  /// `pos_list_locations`, minus the ToolResult wrapper.
  @Get('locations')
  @RequireRole('owner', 'manager')
  @ApiResponse({ status: 200, type: ListSquareLocationsResponseDto })
  async listLocations(@CurrentOrg() org: { id: string }): Promise<ListSquareLocationsResponseDto> {
    const result = await this.square.listLocations(org.id)
    if (!result.ok) {
      return { locations: [], error: result.detail ?? result.reason }
    }
    return { locations: result.data.locations, error: null }
  }
}
