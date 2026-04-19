import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { prisma } from '@gm-ai/database'
import {
  ConversationIdParamSchema,
  GetConversationQuerySchema,
  SendChatMessageRequestSchema,
  type ApiErrorResponse,
  type ChatMessageDto,
  type ConversationResponse,
  type SendChatMessageRequest,
  type SendChatMessageResponse,
} from '@gm-ai/types'
import { z } from 'zod'
import { zodPipe } from '../../common/zod-pipe'
import { translateChatServiceError } from '../../common/translate-chat-error'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, CurrentRole, CurrentUser } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { ChatService } from './chat.service'

const ListConversationsQuerySchema = z.object({
  venueId: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'invalid uuid',
  ),
})

@Controller('chat')
@UseGuards(AuthGuard, RoleGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @HttpCode(200)
  async sendMessage(
    @Body(zodPipe(SendChatMessageRequestSchema)) body: SendChatMessageRequest,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @CurrentRole() role: string | undefined,
  ): Promise<SendChatMessageResponse> {
    try {
      return await this.chatService.sendMessage(body, org.id, user.id, role ?? 'staff')
    } catch (err) {
      const translated = translateChatServiceError(err as Error)
      if (translated) throw translated
      throw err
    }
  }

  @Get('conversations')
  async listConversations(
    @Query(zodPipe(ListConversationsQuerySchema)) q: { venueId: string },
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.chatService.listRecent(org.id, user.id, q.venueId)
  }

  @Get('conversations/:id')
  async getConversation(
    @Param(zodPipe(ConversationIdParamSchema)) params: { id: string },
    @Query(zodPipe(GetConversationQuerySchema)) query: { venueId: string },
    @CurrentOrg() org: { id: string },
  ): Promise<ConversationResponse> {
    const conv = await prisma.chatConversation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        venueId: true,
        channel: true,
        venue: { select: { organizationId: true } },
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
            retrievedItemIds: true,
          },
        },
      },
    })

    const notFound: ApiErrorResponse = { error: 'not-found' }
    if (
      !conv ||
      conv.venueId !== query.venueId ||
      conv.venue.organizationId !== org.id
    ) {
      throw new NotFoundException(notFound)
    }

    const messages: ChatMessageDto[] = conv.messages.map((m) => ({
      id: m.id,
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      retrievedItemIds: m.retrievedItemIds,
    }))

    return {
      id: conv.id,
      venueId: conv.venueId,
      channel: conv.channel,
      messages,
    }
  }
}
