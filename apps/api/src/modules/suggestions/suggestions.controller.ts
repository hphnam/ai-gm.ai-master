import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import {
  SuggestionsOnOpenRequestSchema,
  SuggestionsOnTurnRequestSchema,
  type ProactiveSuggestion,
  type SuggestionsOnOpenRequest,
  type SuggestionsOnTurnRequest,
} from '@gm-ai/types'
import { zodPipe } from '../../common/zod-pipe'
import { SuggestionsService } from './suggestions.service'

@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post('on-open')
  @HttpCode(200)
  onOpen(
    @Body(zodPipe(SuggestionsOnOpenRequestSchema)) body: SuggestionsOnOpenRequest,
  ): Promise<ProactiveSuggestion[]> {
    return this.suggestionsService.onConversationOpen(body.venueId)
  }

  @Post('on-turn')
  @HttpCode(200)
  onTurn(
    @Body(zodPipe(SuggestionsOnTurnRequestSchema)) body: SuggestionsOnTurnRequest,
  ): Promise<ProactiveSuggestion[]> {
    return this.suggestionsService.onTurn(body.venueId, body.userMessage, body.conversationId)
  }
}
