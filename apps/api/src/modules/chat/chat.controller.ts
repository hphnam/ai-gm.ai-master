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
  // chat-v1's prepareStream stays callable until Task 7 module deletion.

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
