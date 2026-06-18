import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger, type OnApplicationBootstrap } from '@nestjs/common'
import type { Job, Queue } from 'bullmq'
import { prisma } from '../../database/prisma'
import { ChatStartersGenerator } from './chat-starters.generator'
import {
  CHAT_STARTERS_FANOUT_INTERVAL_MS,
  CHAT_STARTERS_JOB_FANOUT,
  CHAT_STARTERS_JOB_PER_VENUE,
  CHAT_STARTERS_QUEUE_NAME,
  type ChatStartersFanoutJobData,
  type ChatStartersPerVenueJobData,
} from './chat-starters.queue'

const FANOUT_ACTIVITY_WINDOW_DAYS = 30

/// Two job kinds:
///   - chat-starters.fanout — repeatable, weekly. Enumerates venues with
///     ANY chat activity OR ANY KnowledgeItem in the last 30 days. Inactive
///     venues are skipped to keep the Haiku budget tight and the Redis cache
///     from filling with stale generated payloads.
///   - chat-starters.generate — per-venue Haiku call + Redis write.
///
/// `concurrency: 3` caps the worker so a weekly fanout across many venues
/// doesn't hammer the Anthropic API rate limit in parallel. Tune up only if
/// the org count grows past a few hundred — at that point a token-bucket on
/// the Anthropic key is the right next move.
@Processor(CHAT_STARTERS_QUEUE_NAME, { concurrency: 3 })
export class ChatStartersProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(ChatStartersProcessor.name)

  constructor(
    private readonly generator: ChatStartersGenerator,
    @InjectQueue(CHAT_STARTERS_QUEUE_NAME) private readonly queue: Queue,
  ) {
    super()
  }

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.CHAT_STARTERS_CRON_DISABLED === '1') {
      this.logger.log('chat starters cron disabled via CHAT_STARTERS_CRON_DISABLED')
      return
    }
    await this.queue.add(
      CHAT_STARTERS_JOB_FANOUT,
      {
        triggeredAt: new Date().toISOString(),
        reason: 'cron',
      } satisfies ChatStartersFanoutJobData,
      {
        repeat: { every: CHAT_STARTERS_FANOUT_INTERVAL_MS },
        jobId: 'chat-starters.fanout.repeatable',
        removeOnComplete: { age: 7 * 86_400, count: 50 },
        removeOnFail: { age: 30 * 86_400, count: 100 },
      },
    )
    this.logger.log(
      `chat starters fanout scheduled every ${CHAT_STARTERS_FANOUT_INTERVAL_MS / 1000}s`,
    )
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === CHAT_STARTERS_JOB_FANOUT) return this.handleFanout(job)
    if (job.name === CHAT_STARTERS_JOB_PER_VENUE) return this.handlePerVenue(job)
    this.logger.warn(`unknown chat starters job kind: ${job.name}`)
    return null
  }

  private async handleFanout(
    _job: Job<ChatStartersFanoutJobData>,
  ): Promise<{ enqueued: number; venuesScanned: number }> {
    const since = new Date(Date.now() - FANOUT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const venues = await prisma.venue.findMany({
      where: {
        OR: [
          {
            chatConversations: {
              // Exclude soft-deleted conversations so a venue whose threads
              // were all trashed doesn't keep burning Haiku calls. Matches
              // the same `deletedAt: null` filter the generator uses when
              // it collects chat history samples downstream.
              some: {
                deletedAt: null,
                messages: { some: { createdAt: { gte: since } } },
              },
            },
          },
          { knowledgeItems: { some: { createdAt: { gte: since } } } },
        ],
      },
      select: { id: true, organizationId: true },
    })

    for (const v of venues) {
      await this.queue.add(
        CHAT_STARTERS_JOB_PER_VENUE,
        { orgId: v.organizationId, venueId: v.id } satisfies ChatStartersPerVenueJobData,
        {
          // Two retries: a transient Haiku timeout shouldn't fail the run,
          // but we don't want to hammer the API either. Backoff is generous.
          attempts: 2,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: { age: 7 * 86_400, count: 200 },
          removeOnFail: { age: 30 * 86_400, count: 500 },
        },
      )
    }

    this.logger.log(
      JSON.stringify({
        event: 'chat_starters.fanout',
        enqueued: venues.length,
        venuesScanned: venues.length,
      }),
    )
    return { enqueued: venues.length, venuesScanned: venues.length }
  }

  private async handlePerVenue(
    job: Job<ChatStartersPerVenueJobData>,
  ): Promise<{ generated: boolean }> {
    const { orgId, venueId } = job.data
    const ok = await this.generator.generateAndStore(orgId, venueId)
    return { generated: ok }
  }
}
