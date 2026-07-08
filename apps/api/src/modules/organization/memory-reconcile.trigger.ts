import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import type { Queue } from 'bullmq'
import {
  MEMORY_RECONCILE_DEBOUNCE_MS,
  MEMORY_RECONCILE_JOB_PER_ORG,
  MEMORY_RECONCILE_QUEUE_NAME,
  type MemoryReconcileOrgJobData,
  reconcileJobIdForOrg,
} from './memory-reconcile.queue'

/// Fire-and-forget hook the docs layer calls when an org's KB changes (doc
/// ready / superseded). Enqueues a DEBOUNCED per-org reconcile: a stable jobId
/// + delay means a burst of KB edits coalesces into one run. Best-effort — a
/// failed enqueue must never break the upload/supersede path.
@Injectable()
export class MemoryReconcileTrigger {
  private readonly logger = new Logger(MemoryReconcileTrigger.name)

  constructor(@InjectQueue(MEMORY_RECONCILE_QUEUE_NAME) private readonly queue: Queue) {}

  onKbChanged(orgId: string): void {
    if (process.env.MEMORY_RECONCILE_CRON_DISABLED === '1') return
    void this.queue
      .add(MEMORY_RECONCILE_JOB_PER_ORG, { orgId } satisfies MemoryReconcileOrgJobData, {
        jobId: reconcileJobIdForOrg(orgId),
        delay: MEMORY_RECONCILE_DEBOUNCE_MS,
        attempts: 2,
        backoff: { type: 'exponential', delay: 30_000 },
        // Free the stable jobId on BOTH terminal outcomes. If we retained a
        // failed job (e.g. removeOnFail: {age}), its jobId would block every
        // later onKbChanged for this org until it aged out — the fast-path
        // would silently die. removeOnFail:true lets the next KB change
        // re-enqueue immediately (the nightly fanout is the backstop anyway).
        removeOnComplete: true,
        removeOnFail: true,
      })
      .catch((err) => {
        this.logger.warn(
          JSON.stringify({
            event: 'memory_reconcile.enqueue_failed',
            orgId,
            message: (err as Error).message,
          }),
        )
      })
  }
}
