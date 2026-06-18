import { Module } from '@nestjs/common'
import { RealtimeModule } from '../realtime/realtime.module'
import { ConversationsController } from './conversations.controller'
import { ConversationsService } from './conversations.service'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [RealtimeModule],
  controllers: [NotificationsController, ConversationsController],
  providers: [NotificationsService, ConversationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
