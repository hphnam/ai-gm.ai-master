import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common'
import {
  SuggestionsOnOpenRequestSchema,
  SuggestionsOnTurnRequestSchema,
  type ProactiveSuggestion,
  type SuggestionsOnOpenRequest,
  type SuggestionsOnTurnRequest,
} from '@gm-ai/types'
import { zodPipe } from '../../common/zod-pipe'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { SuggestionsService } from './suggestions.service'

@Controller('suggestions')
@UseGuards(AuthGuard, RoleGuard)
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post('on-open')
  @HttpCode(200)
  onOpen(
    @Body(zodPipe(SuggestionsOnOpenRequestSchema)) body: SuggestionsOnOpenRequest,
    @CurrentOrg() org: { id: string },
  ): Promise<ProactiveSuggestion[]> {
    return this.suggestionsService.onConversationOpen(body.venueId, org.id)
  }

  @Post('on-turn')
  @HttpCode(200)
  onTurn(
    @Body(zodPipe(SuggestionsOnTurnRequestSchema)) body: SuggestionsOnTurnRequest,
    @CurrentOrg() org: { id: string },
  ): Promise<ProactiveSuggestion[]> {
    return this.suggestionsService.onTurn(
      body.venueId,
      body.userMessage,
      org.id,
      body.conversationId,
    )
  }
}
