import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
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
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { DebugService } from './debug.service'

type RequestWithId = Request & { requestId?: string }

@Controller('debug')
@UseGuards(AuthGuard, RoleGuard)
@RequireRole('owner', 'manager')
export class DebugController {
  constructor(private readonly service: DebugService) {}

  @Get('conversations/:id')
  async getConversation(
    @Param(zodPipe(DebugIdParamSchema)) params: { id: string },
    @Query(zodPipe(DebugQuerySchema)) q: { venueId: string },
    @CurrentOrg() org: { id: string },
    @Req() req: RequestWithId,
  ): Promise<DebugConversationResponse> {
    const result = await this.service.getConversation(
      params.id,
      q.venueId,
      org.id,
      req.requestId,
    )
    if (!result) {
      throw new NotFoundException({ error: 'conversation-not-found' } satisfies ApiErrorResponse)
    }
    return result
  }

  @Get('messages/:id')
  async getMessage(
    @Param(zodPipe(DebugIdParamSchema)) params: { id: string },
    @Query(zodPipe(DebugQuerySchema)) q: { venueId: string },
    @CurrentOrg() org: { id: string },
    @Req() req: RequestWithId,
  ): Promise<DebugMessageResponse> {
    const result = await this.service.getMessage(
      params.id,
      q.venueId,
      org.id,
      req.requestId,
    )
    if (!result) {
      throw new NotFoundException({ error: 'message-not-found' } satisfies ApiErrorResponse)
    }
    return result
  }

  @Get('retag-queue')
  async getRetagQueue(
    @Query(zodPipe(DebugRetagQueueQuerySchema)) q: { venueId: string; limit?: number },
    @CurrentOrg() org: { id: string },
    @Req() req: RequestWithId,
  ): Promise<DebugRetagQueueResponse> {
    return this.service.getRetagQueue(q.venueId, q.limit ?? 50, org.id, req.requestId)
  }
}
