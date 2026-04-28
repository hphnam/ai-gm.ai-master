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
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { prisma } from '@gm-ai/database'
import {
  ConversationIdParamSchema,
  GetConversationQuerySchema,
  SendChatMessageRequestSchema,
  StreamChatMessageRequestSchema,
  type ApiErrorResponse,
  type ChatMessageDto,
  type ConversationResponse,
  type SendChatMessageRequest,
  type SendChatMessageResponse,
  type StreamChatMessageRequest,
} from '@gm-ai/types'
import { z } from 'zod'
import { zodPipe } from '../../common/zod-pipe'
import { translateChatServiceError } from '../../common/translate-chat-error'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, CurrentRole, CurrentUser } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { ChatService } from './chat.service'

const ListConversationsQuerySchema = z.object({
  venueId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'invalid uuid',
    )
    .optional(),
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
    @CurrentUser() user: { id: string; email: string; name: string | null },
    @CurrentRole() role: string | undefined,
  ): Promise<SendChatMessageResponse> {
    try {
      return await this.chatService.sendMessage(body, org.id, user.id, role ?? 'staff', {
        name: user.name,
        email: user.email,
      })
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
  ): Promise<SendChatMessageResponse> {
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
      return await this.chatService.sendMessage(
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
      )
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
    @Body(zodPipe(StreamChatMessageRequestSchema)) body: StreamChatMessageRequest,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string; email: string; name: string | null },
    @CurrentRole() role: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    // Bind the agent loop to the client socket: if the user closes the tab
    // mid-stream, cancel the in-flight tool chain instead of letting it run
    // to completion (wasted tokens + stale writes).
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
        // Pin the streamed UIMessage.id to the persisted DB UUID so the client
        // can pass it straight to /feedback (which requires a UUID).
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
  async listConversations(
    @Query(zodPipe(ListConversationsQuerySchema)) q: { venueId?: string },
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
      followUps: m.followUps,
      reasoning: m.reasoning,
      parts: m.parts ?? undefined,
      toolCallLog: Array.isArray(m.toolCallLog)
        ? (m.toolCallLog as unknown[])
        : undefined,
      feedbackKind: (m.feedback?.kind ?? null) as ChatMessageDto['feedbackKind'],
    }))

    return {
      id: conv.id,
      venueId: conv.venueId,
      channel: conv.channel,
      messages,
    }
  }

  @Delete('conversations/:id')
  @HttpCode(204)
  async deleteConversation(
    @Param(zodPipe(ConversationIdParamSchema)) params: { id: string },
    @Query(zodPipe(GetConversationQuerySchema)) query: { venueId: string },
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
