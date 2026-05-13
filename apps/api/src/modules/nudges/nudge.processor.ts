import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger, type OnApplicationBootstrap } from '@nestjs/common'
import type { Job, Queue } from 'bullmq'
import { prisma } from '../../database/prisma'
import {
  NUDGE_JOB_FANOUT,
  NUDGE_JOB_PER_VENUE,
  NUDGE_QUEUE_NAME,
  NUDGE_REPEAT_EVERY_MS,
  type NudgeFanoutJobData,
  type NudgePerVenueJobData,
} from './nudge.queue'
import { NudgeService } from './nudge.service'

/// Worker for the nudges queue. Two job kinds:
///
///   - nudge.fanout: enumerates all venues with a phone-bearing contact and
///     enqueues one nudge.run job per venue. Scheduled every 30 minutes via
///     a repeatable job registered on bootstrap.
///   - nudge.run: invokes NudgeService.run for one venue. Idempotent; the
///     service no-ops when nothing's below par or no cutoff is imminent.
@Processor(NUDGE_QUEUE_NAME)
export class NudgeProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(NudgeProcessor.name)

  constructor(
    private readonly nudgeService: NudgeService,
    @InjectQueue(NUDGE_QUEUE_NAME) private readonly queue: Queue,
  ) {
    super()
  }

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NUDGE_CRON_DISABLED === '1') {
      this.logger.log('nudge cron disabled via NUDGE_CRON_DISABLED')
      return
    }
    await this.queue.add(
      NUDGE_JOB_FANOUT,
      { triggeredAt: new Date().toISOString(), reason: 'cron' } satisfies NudgeFanoutJobData,
      {
        repeat: { every: NUDGE_REPEAT_EVERY_MS },
        jobId: 'nudge.fanout.repeatable',
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400, count: 200 },
      },
    )
    this.logger.log(`nudge fanout scheduled every ${NUDGE_REPEAT_EVERY_MS / 1000}s`)
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === NUDGE_JOB_FANOUT) return this.handleFanout(job)
    if (job.name === NUDGE_JOB_PER_VENUE) return this.handlePerVenue(job)
    this.logger.warn(`unknown nudge job kind: ${job.name}`)
    return null
  }

  private async handleFanout(_job: Job<NudgeFanoutJobData>): Promise<{ enqueued: number }> {
    // One row per venue with at least one phone-bearing contact. Cheap query.
    const venues = await prisma.venue.findMany({
      where: { contacts: { some: { phone: { not: null } } } },
      select: { id: true, organizationId: true, timezone: true },
    })
    let enqueued = 0
    for (const v of venues) {
      if (!isWithinShoppingWindow(v.timezone)) continue
      await this.queue.add(
        NUDGE_JOB_PER_VENUE,
        {
          orgId: v.organizationId,
          venueId: v.id,
        } satisfies NudgePerVenueJobData,
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: { age: 3600, count: 200 },
          removeOnFail: { age: 86400, count: 500 },
        },
      )
      enqueued++
    }
    this.logger.log(
      JSON.stringify({ event: 'nudge.fanout', enqueued, venuesScanned: venues.length }),
    )
    return { enqueued }
  }

  private async handlePerVenue(
    job: Job<NudgePerVenueJobData>,
  ): Promise<{ sent: boolean; reason?: string }> {
    const { orgId, venueId } = job.data
    const result = await this.nudgeService.run(venueId, orgId)
    if (result.sent) return { sent: true }
    return { sent: false, reason: result.reason }
  }
}

/// Naive shopping-window guard: 08:00–17:30 local time in the venue's tz.
/// Stops 3am pings to a duty manager. Refine to per-venue trading hours later.
function isWithinShoppingWindow(timezone: string): boolean {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = fmt.formatToParts(new Date())
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
    const minutes = hour * 60 + minute
    return minutes >= 8 * 60 && minutes <= 17 * 60 + 30
  } catch {
    // Bad tz string → fall back to UTC business hours.
    return true
  }
}
