import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger, type OnApplicationBootstrap } from '@nestjs/common'
import type { Job, Queue } from 'bullmq'
import {
  NOTE_DIGEST_CRON,
  NOTE_DIGEST_JOB_TICK,
  NOTE_DIGEST_QUEUE_NAME,
  type NoteDigestTickJobData,
} from './digest.queue'
import { NoteDigestService } from './digest.service'

@Processor(NOTE_DIGEST_QUEUE_NAME)
export class NoteDigestProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(NoteDigestProcessor.name)

  constructor(
    private readonly digestService: NoteDigestService,
    @InjectQueue(NOTE_DIGEST_QUEUE_NAME) private readonly queue: Queue,
  ) {
    super()
  }

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NOTE_DIGEST_CRON_DISABLED === '1') {
      this.logger.log('note digest cron disabled via NOTE_DIGEST_CRON_DISABLED')
      return
    }
    // upsertJobScheduler (not queue.add + repeat): the repeat key embeds the
    // cron pattern, so a plain add would leave the OLD schedule running after
    // any future change to NOTE_DIGEST_CRON — double digests. Upsert replaces
    // by scheduler id regardless of pattern.
    await this.queue.upsertJobScheduler(
      'note-digest.tick.repeatable',
      { pattern: NOTE_DIGEST_CRON, tz: 'UTC' },
      {
        name: NOTE_DIGEST_JOB_TICK,
        data: {
          triggeredAt: new Date().toISOString(),
          reason: 'cron',
        } satisfies NoteDigestTickJobData,
        opts: {
          removeOnComplete: { age: 3600, count: 100 },
          removeOnFail: { age: 86400, count: 200 },
        },
      },
    )
    this.logger.log(`note digest scheduled (${NOTE_DIGEST_CRON})`)
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === NOTE_DIGEST_JOB_TICK) {
      return this.digestService.runOnce()
    }
    this.logger.warn(`unknown note digest job kind: ${job.name}`)
    return null
  }
}
