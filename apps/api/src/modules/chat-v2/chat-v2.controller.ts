// Plan 06-04 — chat-v2 controller. Owns ALL `/chat/*` HTTP routes after Task 4.
//
// Task 1 (this commit): @Post('messages/with-image') — multimodal entry that
// rides the same Triage → Researchers → Analyser → Writer → Critic pipeline as
// text turns. Magic-byte hardening via apps/api/src/common/image-magic-bytes.ts
// (re-used, NOT forked) per Phase 4 04-01 four-layer contract.
//
// Tasks 2-4 (subsequent commits): @Post('messages'), @Post('stream'),
// @Get/Delete('conversations/:id'), @Get('conversations'). chat-v1 controller's
// matching routes are removed in lockstep so NestJS sees no double-mounted
// routes (start-up validation would error).

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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { translateChatServiceError } from '../../common/translate-chat-error'
import type { ApiErrorResponse } from '../../types'
import { CurrentOrg, CurrentRole, CurrentUser } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import {
  ConversationIdParamDto,
  ConversationResponseDto,
  GetConversationQueryDto,
  ListConversationItemDto,
  ListConversationsQueryDto,
  SendChatMessageRequestDto,
  SendChatMessageResponseDto,
  StreamChatMessageRequestDto,
} from '../chat/dto/chat.dto'
import { ChatV2Service } from './chat-v2.service'
import { ConversationService } from './conversation.service'
import { validateMultimodalAttachment } from './multimodal-validator'

const MULTER_OUTER_CAP_BYTES = 15 * 1024 * 1024 // 15MB outer multer cap

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(AuthGuard, RoleGuard)
export class ChatV2Controller {
  constructor(
    private readonly chatV2Service: ChatV2Service,
    private readonly conversationService: ConversationService,
  ) {}

  // Plan 06-04 Task 4 — text-message endpoint on chat-v2. Replaces chat-v1's
  // POST /chat/messages (which has been removed from chat-v1's controller in
  // the same commit). Pre-06-04: chat-v1's controller dispatched on the
  // Organization.chatV2Enabled flag; post-cutover the flag check disappears
  // entirely (Task 5 drops the column). Every text turn flows through chat-v2.
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
      return (await this.chatV2Service.sendMessage(body, {
        orgId: org.id,
        userId: user.id,
        userRole: role ?? 'staff',
        userIdentity: { name: user.name, email: user.email },
      })) as unknown as SendChatMessageResponseDto
    } catch (err) {
      const translated = translateChatServiceError(err as Error)
      if (translated) throw translated
      throw err
    }
  }

  // Plan 06-04 Task 1 — multimodal endpoint on chat-v2. Replaces chat-v1's
  // POST /chat/messages/with-image (which has been removed from chat-v1's
  // controller in the same commit). Pipeline is identical to text turns:
  // Triage → Researchers → Analyser → Writer → Critic; the attachment metadata
  // ({mediaType, byteLength}) is persisted to chat_messages.toolCallLog as an
  // `attachment_received` sentinel for SOC-2 audit reconstruction.
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
      return (await this.chatV2Service.sendMessage(
        {
          venueId,
          userMessage,
          conversationId,
          attachment: {
            mediaType: validation.attachment.mediaType,
            base64: validation.attachment.base64,
          },
        },
        {
          orgId: org.id,
          userId: user.id,
          userRole: role ?? 'staff',
          userIdentity: { name: user.name, email: user.email },
        },
      )) as unknown as SendChatMessageResponseDto
    } catch (err) {
      const translated = translateChatServiceError(err as Error)
      if (translated) throw translated
      throw err
    }
  }

  // Plan 06-04 Task 2 — streaming endpoint on chat-v2. Mirrors chat-v1's
  // POST /chat/stream contract: returns SSE-style UI message stream via AI SDK
  // 6.x pipeUIMessageStreamToResponse. The chat-v1 route is removed in the
  // same commit so NestJS sees no double-mounted /chat/stream.
  //
  // D-06-04-A — incident streaming SKIPS Critic (logged inside ChatV2Service);
  // streaming + Critic-correction rewrite reconciles in v0.4.
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
      const { conversationId, assistantMessageId, result } = await this.chatV2Service.streamMessage(
        {
          venueId: body.venueId,
          userMessage: body.userMessage,
          conversationId: body.conversationId,
        },
        {
          orgId: org.id,
          userId: user.id,
          userRole: role ?? 'staff',
          userIdentity: { name: user.name, email: user.email },
        },
        abortController.signal,
      )
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

  // Plan 06-04 Task 3 — conversations list/get/delete on chat-v2.
  // chat-v1 controller's matching routes are removed in the same commit.

  @Get('conversations')
  @ApiResponse({ status: 200, type: [ListConversationItemDto] })
  async listConversations(
    @Query(new ZodValidationPipe(ListConversationsQueryDto))
    q: ListConversationsQueryDto,
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<ListConversationItemDto[]> {
    return (await this.conversationService.listRecent(
      org.id,
      user.id,
      q.venueId,
    )) as unknown as ListConversationItemDto[]
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
    try {
      await this.conversationService.softDelete(params.id, org.id, user.id, query.venueId)
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
