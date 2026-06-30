import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger, type OnApplicationBootstrap } from '@nestjs/common'
import type { Job, Queue } from 'bullmq'
import { prisma } from '../../database/prisma'
import { readMemoryMap } from './agent-memory'
import {
  MEMORY_RECONCILE_FANOUT_INTERVAL_MS,
  MEMORY_RECONCILE_JOB_FANOUT,
  MEMORY_RECONCILE_JOB_PER_ORG,
  MEMORY_RECONCILE_QUEUE_NAME,
  type MemoryReconcileFanoutJobData,
  type MemoryReconcileOrgJobData,
} from './memory-reconcile.queue'
import { MemoryReconcileService } from './memory-reconcile.service'

/// Nightly fanout enumerates orgs with non-empty agent memory and enqueues a
/// per-org reconcile; per-org jobs are also enqueued ad-hoc (debounced) when an
/// org's KB changes. `concurrency: 3` keeps the Haiku budget bounded.
@Processor(MEMORY_RECONCILE_QUEUE_NAME, { concurrency: 3 })
export class MemoryReconcileProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(MemoryReconcileProcessor.name)

  constructor(
    private readonly service: MemoryReconcileService,
    @InjectQueue(MEMORY_RECONCILE_QUEUE_NAME) private readonly queue: Queue,
  ) {
    super()
  }

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.MEMORY_RECONCILE_CRON_DISABLED === '1') {
      this.logger.log('memory reconcile cron disabled via MEMORY_RECONCILE_CRON_DISABLED')
      return
    }
    await this.queue.add(
      MEMORY_RECONCILE_JOB_FANOUT,
      { triggeredAt: new Date().toISOString() } satisfies MemoryReconcileFanoutJobData,
      {
        repeat: { every: MEMORY_RECONCILE_FANOUT_INTERVAL_MS },
        jobId: 'memory-reconcile.fanout.repeatable',
        removeOnComplete: { age: 7 * 86_400, count: 50 },
        removeOnFail: { age: 30 * 86_400, count: 100 },
      },
    )
    this.logger.log(
      `memory reconcile fanout scheduled every ${MEMORY_RECONCILE_FANOUT_INTERVAL_MS / 1000}s`,
    )
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === MEMORY_RECONCILE_JOB_FANOUT) return this.handleFanout()
    if (job.name === MEMORY_RECONCILE_JOB_PER_ORG)
      return this.service.reconcileOrg((job.data as MemoryReconcileOrgJobData).orgId)
    this.logger.warn(`unknown memory reconcile job kind: ${job.name}`)
    return null
  }

  private async handleFanout(): Promise<{ enqueued: number }> {
    // Org count is small; fetch metadata and filter for non-empty memory in JS
    // rather than wrangling a JSON-path query.
    const orgs = await prisma.organization.findMany({ select: { id: true, metadata: true } })
    let enqueued = 0
    for (const org of orgs) {
      if (Object.keys(readMemoryMap(org.metadata)).length === 0) continue
      await this.queue.add(
        MEMORY_RECONCILE_JOB_PER_ORG,
        { orgId: org.id } satisfies MemoryReconcileOrgJobData,
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: { age: 7 * 86_400, count: 200 },
          removeOnFail: { age: 30 * 86_400, count: 500 },
        },
      )
      enqueued++
    }
    this.logger.log(JSON.stringify({ event: 'memory_reconcile.fanout', enqueued }))
    return { enqueued }
  }
}
