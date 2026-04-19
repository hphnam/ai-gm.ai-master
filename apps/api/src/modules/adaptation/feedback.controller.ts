import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  CaptureFeedbackInputSchema,
  type ApiErrorResponse,
  type CaptureFeedbackInput,
  type FeedbackResponse,
} from '@gm-ai/types'
import { zodPipe } from '../../common/zod-pipe'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { AdaptationService } from './adaptation.service'

@Controller('feedback')
@UseGuards(AuthGuard, RoleGuard)
export class FeedbackController {
  constructor(private readonly adaptationService: AdaptationService) {}

  @Post()
  @HttpCode(200)
  async captureFeedback(
    @Body(zodPipe(CaptureFeedbackInputSchema)) body: CaptureFeedbackInput,
    @CurrentOrg() org: { id: string },
  ): Promise<FeedbackResponse> {
    const result = await this.adaptationService.captureFeedback(body, org.id)

    if (result.ok === false) {
      if (result.reason === 'message-not-found') {
        const err: ApiErrorResponse = { error: 'message-not-found' }
        throw new NotFoundException(err)
      }
      if (result.reason === 'not-assistant-message') {
        const err: ApiErrorResponse = { error: 'not-assistant-message' }
        throw new BadRequestException(err)
      }
      const err: ApiErrorResponse = { error: 'invalid-input' }
      throw new BadRequestException(err)
    }

    return {
      ok: true,
      feedbackId: result.feedbackId,
      enqueuedCount: result.enqueuedCount,
      dedupedCount: result.dedupedCount,
      exhaustedCount: result.exhaustedCount,
    }
  }
}
