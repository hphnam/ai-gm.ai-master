import { Controller, Get, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import type { ApiErrorResponse } from '../../types'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { DebugService } from './debug.service'
import {
  DebugConversationResponseDto,
  DebugIdParamDto,
  DebugMessageResponseDto,
  DebugQueryDto,
  DebugRetagQueueQueryDto,
  DebugRetagQueueResponseDto,
} from './dto/debug.dto'

type RequestWithId = Request & { requestId?: string }

@ApiTags('debug')
@ApiBearerAuth()
@Controller('debug')
@UseGuards(AuthGuard, RoleGuard)
@RequireRole('owner', 'manager')
export class DebugController {
  constructor(private readonly service: DebugService) {}

  @Get('conversations/:id')
  @ApiResponse({ status: 200, type: DebugConversationResponseDto })
  async getConversation(
    @Param(new ZodValidationPipe(DebugIdParamDto)) params: DebugIdParamDto,
    @Query(new ZodValidationPipe(DebugQueryDto)) q: DebugQueryDto,
    @CurrentOrg() org: { id: string },
    @Req() req: RequestWithId,
  ): Promise<DebugConversationResponseDto> {
    const result = await this.service.getConversation(params.id, q.venueId, org.id, req.requestId)
    if (!result) {
      throw new NotFoundException({ error: 'conversation-not-found' } satisfies ApiErrorResponse)
    }
    return result as DebugConversationResponseDto
  }

  @Get('messages/:id')
  @ApiResponse({ status: 200, type: DebugMessageResponseDto })
  async getMessage(
    @Param(new ZodValidationPipe(DebugIdParamDto)) params: DebugIdParamDto,
    @Query(new ZodValidationPipe(DebugQueryDto)) q: DebugQueryDto,
    @CurrentOrg() org: { id: string },
    @Req() req: RequestWithId,
  ): Promise<DebugMessageResponseDto> {
    const result = await this.service.getMessage(params.id, q.venueId, org.id, req.requestId)
    if (!result) {
      throw new NotFoundException({ error: 'message-not-found' } satisfies ApiErrorResponse)
    }
    return result as DebugMessageResponseDto
  }

  @Get('retag-queue')
  @ApiResponse({ status: 200, type: DebugRetagQueueResponseDto })
  async getRetagQueue(
    @Query(new ZodValidationPipe(DebugRetagQueueQueryDto)) q: DebugRetagQueueQueryDto,
    @CurrentOrg() org: { id: string },
    @Req() req: RequestWithId,
  ): Promise<DebugRetagQueueResponseDto> {
    return (await this.service.getRetagQueue(
      q.venueId,
      q.limit ?? 50,
      org.id,
      req.requestId,
    )) as DebugRetagQueueResponseDto
  }
}
