import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
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
import { zodPipe } from '../../common/zod-pipe'
import { translateChatServiceError } from '../../common/translate-chat-error'
import { ChatService } from './chat.service'

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @HttpCode(200)
  async sendMessage(
    @Body(zodPipe(SendChatMessageRequestSchema)) body: SendChatMessageRequest,
  ): Promise<SendChatMessageResponse> {
    try {
      return await this.chatService.sendMessage(body)
    } catch (err) {
      const translated = translateChatServiceError(err as Error)
      if (translated) throw translated
      throw err
    }
  }

  @Get('conversations/:id')
  async getConversation(
    @Param(zodPipe(ConversationIdParamSchema)) params: { id: string },
    @Query(zodPipe(GetConversationQuerySchema)) query: { venueId: string },
  ): Promise<ConversationResponse> {
    const conv = await prisma.chatConversation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        venueId: true,
        channel: true,
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
    if (!conv || conv.venueId !== query.venueId) {
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
