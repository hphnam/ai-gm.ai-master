import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { RealtimeModule } from '../realtime/realtime.module'
import { ConversationsController } from './conversations.controller'
import { ConversationsService } from './conversations.service'
import { NoteDigestProcessor } from './digest.processor'
import { NOTE_DIGEST_QUEUE_NAME } from './digest.queue'
import { NoteDigestService } from './digest.service'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [RealtimeModule, BullModule.registerQueue({ name: NOTE_DIGEST_QUEUE_NAME })],
  controllers: [NotificationsController, ConversationsController],
  providers: [NotificationsService, ConversationsService, NoteDigestService, NoteDigestProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
