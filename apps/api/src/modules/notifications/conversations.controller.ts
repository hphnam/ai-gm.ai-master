import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, CurrentUser } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { ConversationsService, InvalidConversationCursorError } from './conversations.service'
import {
  ConversationParamDto,
  DeleteMessageParamDto,
  DeleteMessageQueryDto,
  ListConversationMessagesQueryDto,
  ListConversationMessagesResponseDto,
  ListConversationsResponseDto,
  MarkConversationReadResponseDto,
  SendMessageBodyDto,
  SendMessageResponseDto,
} from './dto/conversations.dto'

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('notifications/conversations')
@UseGuards(AuthGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  @ApiResponse({ status: 200, type: ListConversationsResponseDto })
  async list(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<ListConversationsResponseDto> {
    const conversations = await this.service.list(org.id, user.id)
    return { conversations }
  }

  @Get(':otherUserId/messages')
  @ApiResponse({ status: 200, type: ListConversationMessagesResponseDto })
  async messages(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(ConversationParamDto)) params: ConversationParamDto,
    @Query(new ZodValidationPipe(ListConversationMessagesQueryDto))
    query: ListConversationMessagesQueryDto,
  ): Promise<ListConversationMessagesResponseDto> {
    try {
      return await this.service.listMessages(org.id, user.id, params.otherUserId, {
        limit: query.limit ?? 50,
        cursor: query.cursor,
      })
    } catch (err) {
      if (err instanceof InvalidConversationCursorError) {
        throw new BadRequestException({ error: 'invalid-cursor' })
      }
      throw err
    }
  }

  @Post(':otherUserId/messages')
  @HttpCode(201)
  @ApiResponse({ status: 201, type: SendMessageResponseDto })
  async send(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(ConversationParamDto)) params: ConversationParamDto,
    @Body(new ZodValidationPipe(SendMessageBodyDto)) body: SendMessageBodyDto,
  ): Promise<SendMessageResponseDto> {
    const message = await this.service.sendMessage(org.id, user.id, params.otherUserId, body.body)
    return { message }
  }

  @Post(':otherUserId/read')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: MarkConversationReadResponseDto })
  async markRead(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(ConversationParamDto)) params: ConversationParamDto,
  ): Promise<MarkConversationReadResponseDto> {
    const updated = await this.service.markRead(org.id, user.id, params.otherUserId)
    return { updated }
  }

  @Delete(':otherUserId')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async hideConversation(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(ConversationParamDto)) params: ConversationParamDto,
  ): Promise<void> {
    await this.service.hideConversation(org.id, user.id, params.otherUserId)
  }

  @Delete(':otherUserId/messages/:kind/:messageId')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async deleteMessage(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(DeleteMessageParamDto)) params: DeleteMessageParamDto,
    @Query(new ZodValidationPipe(DeleteMessageQueryDto)) query: DeleteMessageQueryDto,
  ): Promise<void> {
    await this.service.deleteMessage(
      org.id,
      user.id,
      params.otherUserId,
      params.kind,
      params.messageId,
      query.scope ?? 'self',
    )
  }
}
