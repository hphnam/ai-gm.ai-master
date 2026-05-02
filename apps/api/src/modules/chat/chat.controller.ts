import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import type { Response } from 'express'
import { prisma } from '../../database/prisma'
import { type ApiErrorResponse } from '../../types'
import { translateChatServiceError } from '../../common/translate-chat-error'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, CurrentRole, CurrentUser } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { createHash } from 'node:crypto'
import { ChatV2Service } from '../chat-v2/chat-v2.service'
import { ChatService } from './chat.service'
import {
  ChatMessageDto,
  ConversationIdParamDto,
  ConversationResponseDto,
  GetConversationQueryDto,
  ListConversationItemDto,
  ListConversationsQueryDto,
  SendChatMessageRequestDto,
  SendChatMessageResponseDto,
  StreamChatMessageRequestDto,
} from './dto/chat.dto'

const hashId = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 12)

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(AuthGuard, RoleGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name)

  constructor(
    private readonly chatService: ChatService,
    private readonly chatV2Service: ChatV2Service,
  ) {}

  @Post('messages')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: SendChatMessageResponseDto })
  async sendMessage(
    @Body() body: SendChatMessageRequestDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string; email: string; name: string | null },
    @CurrentRole() role: string | undefined,
  ): Promise<SendChatMessageResponseDto> {
    try {
      // Plan 06-01 Task 2 — per-org feature flag dispatch. Default false (chat-v1
      // remains byte-identical for all existing orgs). Flipped via direct SQL
      // until 06-03 ships an admin endpoint (D-06-01-B).
      const orgRow = await prisma.organization.findUnique({
        where: { id: org.id },
        select: { chatV2Enabled: true },
      })
      const useV2 = orgRow?.chatV2Enabled === true
      this.logger.log(
        `chat.dispatch orgId=${hashId(org.id)} version=${useV2 ? 'v2' : 'v1'}`,
      )
      if (useV2) {
        return (await this.chatV2Service.sendMessage(body, {
          orgId: org.id,
          userId: user.id,
          userRole: role ?? 'staff',
          userIdentity: { name: user.name, email: user.email },
        })) as unknown as SendChatMessageResponseDto
      }
      return (await this.chatService.sendMessage(body, org.id, user.id, role ?? 'staff', {
        name: user.name,
        email: user.email,
      })) as SendChatMessageResponseDto
    } catch (err) {
      const translated = translateChatServiceError(err as Error)
      if (translated) throw translated
      throw err
    }
  }

  // Plan 06-04 Task 1 — POST /chat/messages/with-image moved to chat-v2.controller.ts.
  // chat-v1 no longer hosts the multimodal route.

  // Plan 06-04 Task 2 — streaming endpoint moved to chat-v2.controller.ts.
  // Plan 06-04 Task 3 — conversation routes moved to chat-v2.controller.ts.
  // chat-v1's listRecent / deleteConversation stay callable until Task 7
  // module deletion.
}
