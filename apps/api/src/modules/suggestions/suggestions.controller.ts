import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentOrg, CurrentRole, CurrentUser } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import {
  ProactiveSuggestionDto,
  SuggestionsOnOpenRequestDto,
  SuggestionsOnTurnRequestDto,
} from './dto/suggestions.dto'
import { SuggestionsService } from './suggestions.service'

@ApiTags('suggestions')
@ApiBearerAuth()
@Controller('suggestions')
@UseGuards(AuthGuard, RoleGuard)
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post('on-open')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: [ProactiveSuggestionDto] })
  onOpen(
    @Body() body: SuggestionsOnOpenRequestDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @CurrentRole() role: string | undefined,
  ): Promise<ProactiveSuggestionDto[]> {
    return this.suggestionsService.onConversationOpen(body.venueId, {
      orgId: org.id,
      userId: user.id,
      userRole: role ?? 'staff',
    }) as Promise<ProactiveSuggestionDto[]>
  }

  @Post('on-turn')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: [ProactiveSuggestionDto] })
  onTurn(
    @Body() body: SuggestionsOnTurnRequestDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @CurrentRole() role: string | undefined,
  ): Promise<ProactiveSuggestionDto[]> {
    return this.suggestionsService.onTurn(
      body.venueId,
      body.userMessage,
      { orgId: org.id, userId: user.id, userRole: role ?? 'staff' },
      body.conversationId,
    ) as Promise<ProactiveSuggestionDto[]>
  }
}
