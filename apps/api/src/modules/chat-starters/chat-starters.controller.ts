import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, CurrentRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { audienceForRole } from './chat-starters.queue'
import { ChatStartersService } from './chat-starters.service'
import { ChatStartersPayloadDto, ChatStartersQueryDto } from './dto/chat-starters.dto'

@ApiTags('chat-starters')
@ApiBearerAuth()
@Controller('chat-starters')
@UseGuards(AuthGuard)
export class ChatStartersController {
  constructor(private readonly service: ChatStartersService) {}

  /// GET /chat-starters?venueId=<uuid>
  /// Always returns a payload tailored to the caller's role (staff vs manager)
  /// — falls back to a generic set for that role when Redis is empty /
  /// unreachable / the venueId doesn't belong to the caller's org.
  @Get()
  @ApiResponse({ status: 200, type: ChatStartersPayloadDto })
  async get(
    @CurrentOrg() org: { id: string },
    @CurrentRole() role: string | undefined,
    @Query(new ZodValidationPipe(ChatStartersQueryDto)) query: ChatStartersQueryDto,
  ): Promise<ChatStartersPayloadDto> {
    return this.service.getForVenue(org.id, query.venueId, audienceForRole(role))
  }
}
