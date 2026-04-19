import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import {
  DebugIdParamSchema,
  DebugQuerySchema,
  DebugRetagQueueQuerySchema,
  type ApiErrorResponse,
  type DebugConversationResponse,
  type DebugMessageResponse,
  type DebugRetagQueueResponse,
} from '@gm-ai/types'
import { zodPipe } from '../../common/zod-pipe'
import { DebugService } from './debug.service'

type RequestWithId = Request & { requestId?: string }

@Controller('debug')
export class DebugController {
  constructor(private readonly service: DebugService) {}

  @Get('conversations/:id')
  async getConversation(
    @Param(zodPipe(DebugIdParamSchema)) params: { id: string },
    @Query(zodPipe(DebugQuerySchema)) q: { venueId: string },
    @Req() req: RequestWithId,
  ): Promise<DebugConversationResponse> {
    const result = await this.service.getConversation(params.id, q.venueId, req.requestId)
    if (!result) {
      throw new NotFoundException({ error: 'conversation-not-found' } satisfies ApiErrorResponse)
    }
    return result
  }

  @Get('messages/:id')
  async getMessage(
    @Param(zodPipe(DebugIdParamSchema)) params: { id: string },
    @Query(zodPipe(DebugQuerySchema)) q: { venueId: string },
    @Req() req: RequestWithId,
  ): Promise<DebugMessageResponse> {
    const result = await this.service.getMessage(params.id, q.venueId, req.requestId)
    if (!result) {
      throw new NotFoundException({ error: 'message-not-found' } satisfies ApiErrorResponse)
    }
    return result
  }

  @Get('retag-queue')
  async getRetagQueue(
    @Query(zodPipe(DebugRetagQueueQuerySchema)) q: { venueId: string; limit?: number },
    @Req() req: RequestWithId,
  ): Promise<DebugRetagQueueResponse> {
    return this.service.getRetagQueue(q.venueId, q.limit ?? 50, req.requestId)
  }
}
