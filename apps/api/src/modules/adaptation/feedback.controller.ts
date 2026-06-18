import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { ApiErrorResponse } from '../../types'
import { CurrentOrg } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { AdaptationService } from './adaptation.service'
import { CaptureFeedbackInputDto, FeedbackResponseDto } from './dto/feedback.dto'

@ApiTags('feedback')
@ApiBearerAuth()
@Controller('feedback')
@UseGuards(AuthGuard, RoleGuard)
export class FeedbackController {
  constructor(private readonly adaptationService: AdaptationService) {}

  @Post()
  @HttpCode(200)
  @ApiResponse({ status: 200, type: FeedbackResponseDto })
  async captureFeedback(
    @Body() body: CaptureFeedbackInputDto,
    @CurrentOrg() org: { id: string },
  ): Promise<FeedbackResponseDto> {
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
