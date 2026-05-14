import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger, type OnApplicationBootstrap } from '@nestjs/common'
import type { Job, Queue } from 'bullmq'
import {
  EXPIRY_SCHEDULER_JOB_TICK,
  EXPIRY_SCHEDULER_QUEUE_NAME,
  EXPIRY_SCHEDULER_TICK_INTERVAL_MS,
  type ExpirySchedulerTickJobData,
} from './expiry-scheduler.queue'
import { ExpirySchedulerService } from './expiry-scheduler.service'

@Processor(EXPIRY_SCHEDULER_QUEUE_NAME)
export class ExpirySchedulerProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExpirySchedulerProcessor.name)

  constructor(
    private readonly scheduler: ExpirySchedulerService,
    @InjectQueue(EXPIRY_SCHEDULER_QUEUE_NAME) private readonly queue: Queue,
  ) {
    super()
  }

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.EXPIRY_SCHEDULER_DISABLED === '1') {
      this.logger.log('expiry scheduler disabled via EXPIRY_SCHEDULER_DISABLED')
      return
    }
    await this.queue.add(
      EXPIRY_SCHEDULER_JOB_TICK,
      {
        triggeredAt: new Date().toISOString(),
        reason: 'cron',
      } satisfies ExpirySchedulerTickJobData,
      {
        repeat: { every: EXPIRY_SCHEDULER_TICK_INTERVAL_MS },
        jobId: 'expiry-scheduler.tick.repeatable',
        removeOnComplete: { age: 86_400, count: 100 },
        removeOnFail: { age: 7 * 86_400, count: 200 },
      },
    )
    this.logger.log(
      `expiry scheduler tick scheduled every ${EXPIRY_SCHEDULER_TICK_INTERVAL_MS / 1000}s`,
    )
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === EXPIRY_SCHEDULER_JOB_TICK) {
      return this.scheduler.runOnce()
    }
    this.logger.warn(`unknown expiry scheduler job kind: ${job.name}`)
    return null
  }
}
