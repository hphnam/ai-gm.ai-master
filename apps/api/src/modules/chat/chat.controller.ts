// Public /chat/* surface. Backed by ChatService (single-Sonnet ToolLoopAgent
// with 13 direct tools + `deep_research` escalation that wraps the chat-core
// multi-agent pipeline).

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
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { translateChatServiceError } from '../../common/translate-chat-error'
import type { ApiErrorResponse } from '../../types'
import { CurrentOrg, CurrentRole, CurrentUser } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import { ConversationService } from '../chat-core/conversation.service'
import { validateMultimodalAttachment } from '../chat-core/multimodal-validator'
import { ChatService } from './chat.service'
import {
  ConversationIdParamDto,
  ConversationResponseDto,
  GetConversationQueryDto,
  ListConversationsPageDto,
  ListConversationsQueryDto,
  SendChatMessageRequestDto,
  SendChatMessageResponseDto,
  StreamChatMessageRequestDto,
  UpdateConversationVisibilityDto,
  UpdateConversationVisibilityResponseDto,
} from './dto/chat.dto'

const MULTER_OUTER_CAP_BYTES = 15 * 1024 * 1024

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(AuthGuard, RoleGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
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
      const result = await this.chatService.sendMessage(body, org.id, user.id, role ?? 'staff', {
        name: user.name,
        email: user.email,
      })
      return result as unknown as SendChatMessageResponseDto
    } catch (err) {
      const translated = translateChatServiceError(err as Error)
      if (translated) throw translated
      throw err
    }
  }

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
      limits: { fileSize: MULTER_OUTER_CAP_BYTES },
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
    const validation = validateMultimodalAttachment(file)
    if (!validation.ok) {
      const errorPayload: ApiErrorResponse = { error: 'invalid-input' }
      switch (validation.reason) {
        case 'unsupported-mime':
          throw new HttpException(
            { error: 'unsupported-file-type' } satisfies ApiErrorResponse,
            415,
          )
        case 'payload-too-large':
          throw new HttpException({ error: 'payload-too-large' } satisfies ApiErrorResponse, 413)
        case 'corrupt-bytes':
          throw new BadRequestException({
            error: 'invalid-input',
            details: 'corrupt-bytes',
          } satisfies ApiErrorResponse)
        default:
          throw new BadRequestException(errorPayload)
      }
    }

    const venueId =
      typeof body.venueId === 'string' && body.venueId.trim().length > 0 ? body.venueId : undefined
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
      const result = await this.chatService.sendMessage(
        {
          venueId,
          userMessage,
          conversationId,
          attachment: {
            mediaType: validation.attachment.mediaType,
            base64: validation.attachment.base64,
          },
        },
        org.id,
        user.id,
        role ?? 'staff',
        { name: user.name, email: user.email },
      )
      return result as unknown as SendChatMessageResponseDto
    } catch (err) {
      const translated = translateChatServiceError(err as Error)
      if (translated) throw translated
      throw err
    }
  }

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
  @ApiResponse({ status: 200, type: ListConversationsPageDto })
  async listConversations(
    @Query(new ZodValidationPipe(ListConversationsQueryDto))
    query: ListConversationsQueryDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<ListConversationsPageDto> {
    return (await this.chatService.listPage(org.id, user.id, {
      venueId: query.venueId,
      cursor: query.cursor,
      limit: query.limit,
      q: query.q,
    })) as unknown as ListConversationsPageDto
  }

  @Get('conversations/:id')
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  async getConversation(
    @Param(new ZodValidationPipe(ConversationIdParamDto))
    params: ConversationIdParamDto,
    @Query(new ZodValidationPipe(GetConversationQueryDto))
    query: GetConversationQueryDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<ConversationResponseDto> {
    const conv = await this.conversationService.getById(params.id, org.id, user.id, query.venueId)
    if (!conv) {
      const notFound: ApiErrorResponse = { error: 'not-found' }
      throw new NotFoundException(notFound)
    }
    return conv as unknown as ConversationResponseDto
  }

  @Patch('conversations/:id/visibility')
  @ApiResponse({ status: 200, type: UpdateConversationVisibilityResponseDto })
  async updateVisibility(
    @Param(new ZodValidationPipe(ConversationIdParamDto))
    params: ConversationIdParamDto,
    @Query(new ZodValidationPipe(GetConversationQueryDto))
    query: GetConversationQueryDto,
    @Body(new ZodValidationPipe(UpdateConversationVisibilityDto))
    body: UpdateConversationVisibilityDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<UpdateConversationVisibilityResponseDto> {
    if (!query.venueId) {
      throw new BadRequestException({
        error: 'invalid-input',
        details: 'venueId required',
      } satisfies ApiErrorResponse)
    }
    try {
      const result = await this.chatService.setVisibility(
        params.id,
        org.id,
        user.id,
        query.venueId,
        body.visibility,
      )
      return result as unknown as UpdateConversationVisibilityResponseDto
    } catch (err) {
      const message = (err as Error).message ?? ''
      if (message.includes('not found')) {
        throw new NotFoundException({
          error: 'not-found',
        } satisfies ApiErrorResponse)
      }
      throw err
    }
  }

  @Delete('conversations/:id')
  @HttpCode(204)
  async deleteConversation(
    @Param(new ZodValidationPipe(ConversationIdParamDto))
    params: ConversationIdParamDto,
    @Query(new ZodValidationPipe(GetConversationQueryDto))
    query: GetConversationQueryDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    if (!query.venueId) {
      throw new BadRequestException({
        error: 'invalid-input',
        details: 'venueId required',
      } satisfies ApiErrorResponse)
    }
    try {
      await this.chatService.deleteConversation(params.id, org.id, user.id, query.venueId)
    } catch (err) {
      const message = (err as Error).message ?? ''
      if (message.includes('not found')) {
        throw new NotFoundException({
          error: 'not-found',
        } satisfies ApiErrorResponse)
      }
      throw err
    }
  }
}
