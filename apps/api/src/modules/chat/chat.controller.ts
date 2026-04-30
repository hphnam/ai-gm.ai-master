import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { prisma } from '../../database/prisma'
import { type ApiErrorResponse } from '../../types'
import { translateChatServiceError } from '../../common/translate-chat-error'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, CurrentRole, CurrentUser } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
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

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(AuthGuard, RoleGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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

  // Phase G1 — multipart endpoint for staff to attach an image (photo of
  // an error code, blown keg, mystery part) alongside their question. Routes
  // through the existing non-streaming sendMessage path which already handles
  // attachments. Web client falls back to this endpoint when the composer has
  // an image; pure-text messages stay on the streaming endpoint.
  @Post('messages/with-image')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
        venueId: { type: 'string' },
        userMessage: { type: 'string' },
        conversationId: { type: 'string' },
      },
      required: ['image', 'venueId'],
    },
  })
  @ApiResponse({ status: 200, type: SendChatMessageResponseDto })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async sendMessageWithImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body()
    body: {
      venueId?: string
      userMessage?: string
      conversationId?: string
    },
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string; email: string; name: string | null },
    @CurrentRole() role: string | undefined,
  ): Promise<SendChatMessageResponseDto> {
    if (!file) {
      throw new BadRequestException({
        error: 'invalid-input',
      } satisfies ApiErrorResponse)
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.mimetype)) {
      throw new HttpException(
        { error: 'unsupported-file-type' } satisfies ApiErrorResponse,
        415,
      )
    }
    const venueId =
      typeof body.venueId === 'string' && body.venueId.trim().length > 0
        ? body.venueId
        : undefined
    if (!venueId) {
      throw new BadRequestException({
        error: 'invalid-input',
      } satisfies ApiErrorResponse)
    }
    const userMessage =
      typeof body.userMessage === 'string' && body.userMessage.trim().length > 0
        ? body.userMessage.trim().slice(0, 8000)
        : 'What do you make of this?'
    const conversationId =
      typeof body.conversationId === 'string' && body.conversationId.trim().length > 0
        ? body.conversationId
        : undefined

    try {
      return (await this.chatService.sendMessage(
        {
          venueId,
          userMessage,
          conversationId,
          attachment: {
            mediaType: file.mimetype as
              | 'image/jpeg'
              | 'image/png'
              | 'image/webp'
              | 'image/gif',
            base64: file.buffer.toString('base64'),
          },
        },
        org.id,
        user.id,
        role ?? 'staff',
        { name: user.name, email: user.email },
      )) as SendChatMessageResponseDto
    } catch (err) {
      const translated = translateChatServiceError(err as Error)
      if (translated) throw translated
      throw err
    }
  }

  // Streaming endpoint for the web /chat UI. Uses Vercel AI SDK's UI message
  // stream protocol via pipeUIMessageStreamToResponse. The fresh conversation
  // ID is returned in the `x-conversation-id` response header so the client
  // can update its URL when starting a brand-new thread.
  @Post('stream')
  @HttpCode(200)
  async streamMessage(
    @Body() body: StreamChatMessageRequestDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string; email: string; name: string | null },
    @CurrentRole() role: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const abortController = new AbortController()
    res.on('close', () => {
      if (!abortController.signal.aborted) abortController.abort()
    })

    try {
      const { conversationId, assistantMessageId, result } = await this.chatService.prepareStream({
        venueId: body.venueId,
        conversationId: body.conversationId,
        userText: body.userMessage,
        orgId: org.id,
        userId: user.id,
        userRole: role ?? 'staff',
        userIdentity: { name: user.name, email: user.email },
        abortSignal: abortController.signal,
      })
      result.pipeUIMessageStreamToResponse(res, {
        generateMessageId: () => assistantMessageId,
        messageMetadata: ({ part }) => {
          if (part.type === 'start') {
            return { conversationId }
          }
          return undefined
        },
        onError: (err) => (err as Error)?.message ?? 'stream error',
      })
    } catch (err) {
      const translated = translateChatServiceError(err as Error)
      if (translated) throw translated
      throw err
    }
  }

  @Get('conversations')
  @ApiResponse({ status: 200, type: [ListConversationItemDto] })
  async listConversations(
    @Query(new ZodValidationPipe(ListConversationsQueryDto)) q: ListConversationsQueryDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<ListConversationItemDto[]> {
    return (await this.chatService.listRecent(
      org.id,
      user.id,
      q.venueId,
    )) as ListConversationItemDto[]
  }

  @Get('conversations/:id')
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  async getConversation(
    @Param(new ZodValidationPipe(ConversationIdParamDto)) params: ConversationIdParamDto,
    @Query(new ZodValidationPipe(GetConversationQueryDto)) query: GetConversationQueryDto,
    @CurrentOrg() org: { id: string },
  ): Promise<ConversationResponseDto> {
    const conv = await prisma.chatConversation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        venueId: true,
        channel: true,
        deletedAt: true,
        venue: { select: { organizationId: true } },
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
            retrievedItemIds: true,
            followUps: true,
            reasoning: true,
            parts: true,
            toolCallLog: true,
            feedback: { select: { kind: true } },
          },
        },
      },
    })

    const notFound: ApiErrorResponse = { error: 'not-found' }
    if (
      !conv ||
      conv.deletedAt !== null ||
      conv.venueId !== query.venueId ||
      conv.venue.organizationId !== org.id
    ) {
      throw new NotFoundException(notFound)
    }

    const messages: ChatMessageDto[] = conv.messages.map(
      (m) =>
        ({
          id: m.id,
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
          createdAt: m.createdAt.toISOString(),
          retrievedItemIds: m.retrievedItemIds,
          followUps: m.followUps,
          reasoning: m.reasoning,
          parts: m.parts ?? undefined,
          toolCallLog: Array.isArray(m.toolCallLog)
            ? (m.toolCallLog as unknown[])
            : undefined,
          feedbackKind: (m.feedback?.kind ?? null) as ChatMessageDto['feedbackKind'],
        }) as ChatMessageDto,
    )

    return {
      id: conv.id,
      venueId: conv.venueId,
      channel: conv.channel,
      messages,
    } as ConversationResponseDto
  }

  @Delete('conversations/:id')
  @HttpCode(204)
  async deleteConversation(
    @Param(new ZodValidationPipe(ConversationIdParamDto)) params: ConversationIdParamDto,
    @Query(new ZodValidationPipe(GetConversationQueryDto)) query: GetConversationQueryDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    try {
      await this.chatService.deleteConversation(
        params.id,
        org.id,
        user.id,
        query.venueId,
      )
    } catch (err) {
      const notFound: ApiErrorResponse = { error: 'not-found' }
      const message = (err as Error).message ?? ''
      if (message.includes('not found')) {
        throw new NotFoundException(notFound)
      }
      throw err
    }
  }
}
