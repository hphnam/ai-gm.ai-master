import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { TaskReminderProcessor } from './task-reminder.processor'
import { TASK_REMINDER_QUEUE_NAME } from './task-reminder.queue'
import { TaskReminderService } from './task-reminder.service'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'

/// Wave 1 — Tasks & Reminders. Sibling to ChatModule / NotificationsModule.
/// Owns a BullMQ queue that scans open tasks within the reminder window and
/// emits a Notification to the assignee.
@Module({
  imports: [
    RealtimeModule,
    NotificationsModule,
    BullModule.registerQueue({ name: TASK_REMINDER_QUEUE_NAME }),
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskReminderService, TaskReminderProcessor],
  exports: [TasksService, TaskReminderService],
})
export class TasksModule {}
