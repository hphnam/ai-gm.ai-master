import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, CurrentUser } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import {
  ComposeNotificationBodyDto,
  ComposeReplyBodyDto,
  ListNotificationRepliesResponseDto,
  ListNotificationsQueryDto,
  ListNotificationsResponseDto,
  ListRecipientsResponseDto,
  MarkAllReadResponseDto,
  NotificationIdParamDto,
  SimpleNotificationResponseDto,
  SingleReplyResponseDto,
  UnreadCountResponseDto,
} from './dto/notifications.dto'
import { InvalidCursorError, NotificationsService } from './notifications.service'

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiResponse({ status: 200, type: ListNotificationsResponseDto })
  async list(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(ListNotificationsQueryDto)) query: ListNotificationsQueryDto,
  ): Promise<ListNotificationsResponseDto> {
    try {
      return await this.service.list(org.id, user.id, {
        status: query.status ?? 'all',
        direction: query.direction ?? 'inbox',
        limit: query.limit ?? 30,
        cursor: query.cursor,
        q: query.q,
        category: query.category,
      })
    } catch (err) {
      if (err instanceof InvalidCursorError) {
        throw new BadRequestException({ error: 'invalid-cursor' })
      }
      throw err
    }
  }

  @Get('unread-count')
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async unreadCount(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<UnreadCountResponseDto> {
    const count = await this.service.unreadCount(org.id, user.id)
    return { count }
  }

  @Get('recipients')
  @ApiResponse({ status: 200, type: ListRecipientsResponseDto })
  async recipients(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<ListRecipientsResponseDto> {
    const members = await this.service.listOrgMembers(org.id, user.id)
    return { members }
  }

  @Patch(':id/read')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: SimpleNotificationResponseDto })
  async markRead(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(NotificationIdParamDto)) params: NotificationIdParamDto,
  ): Promise<SimpleNotificationResponseDto> {
    const notification = await this.service.markRead(org.id, user.id, params.id)
    return { notification }
  }

  @Patch('read-all')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: MarkAllReadResponseDto })
  async markAllRead(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
  ): Promise<MarkAllReadResponseDto> {
    const updated = await this.service.markAllRead(org.id, user.id)
    return { updated }
  }

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, type: SimpleNotificationResponseDto })
  async compose(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(ComposeNotificationBodyDto)) body: ComposeNotificationBodyDto,
  ): Promise<SimpleNotificationResponseDto> {
    const notification = await this.service.compose(
      org.id,
      user.id,
      body.recipientUserId,
      body.body,
    )
    return { notification }
  }

  @Get(':id/replies')
  @ApiResponse({ status: 200, type: ListNotificationRepliesResponseDto })
  async listReplies(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(NotificationIdParamDto)) params: NotificationIdParamDto,
  ): Promise<ListNotificationRepliesResponseDto> {
    const replies = await this.service.listReplies(org.id, user.id, params.id)
    return { replies }
  }

  @Post(':id/replies')
  @HttpCode(201)
  @ApiResponse({ status: 201, type: SingleReplyResponseDto })
  async composeReply(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(NotificationIdParamDto)) params: NotificationIdParamDto,
    @Body(new ZodValidationPipe(ComposeReplyBodyDto)) body: ComposeReplyBodyDto,
  ): Promise<SingleReplyResponseDto> {
    const { reply } = await this.service.composeReply(org.id, user.id, params.id, body.body)
    return { reply }
  }
}
