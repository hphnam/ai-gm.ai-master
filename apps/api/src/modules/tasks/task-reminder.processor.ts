import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger, type OnApplicationBootstrap } from '@nestjs/common'
import type { Job, Queue } from 'bullmq'
import {
  TASK_REMINDER_JOB_TICK,
  TASK_REMINDER_QUEUE_NAME,
  TASK_REMINDER_TICK_INTERVAL_MS,
  type TaskReminderTickJobData,
} from './task-reminder.queue'
import { TaskReminderService } from './task-reminder.service'

/// Worker for the task-reminders queue. One job kind — `task-reminder.tick` —
/// fires on a repeatable schedule and delegates the actual scan + delivery to
/// TaskReminderService.runOnce(). Idempotent: the service uses a CAS update on
/// `remindedAt` to claim each row, so a duplicate tick can't double-notify.
@Processor(TASK_REMINDER_QUEUE_NAME)
export class TaskReminderProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(TaskReminderProcessor.name)

  constructor(
    private readonly reminderService: TaskReminderService,
    @InjectQueue(TASK_REMINDER_QUEUE_NAME) private readonly queue: Queue,
  ) {
    super()
  }

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.TASK_REMINDER_CRON_DISABLED === '1') {
      this.logger.log('task reminder cron disabled via TASK_REMINDER_CRON_DISABLED')
      return
    }
    await this.queue.add(
      TASK_REMINDER_JOB_TICK,
      { triggeredAt: new Date().toISOString(), reason: 'cron' } satisfies TaskReminderTickJobData,
      {
        repeat: { every: TASK_REMINDER_TICK_INTERVAL_MS },
        jobId: 'task-reminder.tick.repeatable',
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400, count: 200 },
      },
    )
    this.logger.log(`task reminder tick scheduled every ${TASK_REMINDER_TICK_INTERVAL_MS / 1000}s`)
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === TASK_REMINDER_JOB_TICK) {
      return this.reminderService.runOnce()
    }
    this.logger.warn(`unknown task reminder job kind: ${job.name}`)
    return null
  }
}
