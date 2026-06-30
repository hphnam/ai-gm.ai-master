/// BullMQ plumbing for keeping per-org agent memory consistent with the
/// knowledge base. Two triggers:
///   - a nightly fanout that re-checks every org with non-empty memory, and
///   - a debounced per-org job fired when that org's KB changes (doc ready /
///     superseded), so a KB edit prunes contradicted memory within minutes
///     instead of waiting for the nightly pass.
/// Read-time precedence (KB always overrides memory) already prevents stale
/// ANSWERS — this job is hygiene that purges lingering stale NOTES.

export const MEMORY_RECONCILE_QUEUE_NAME = 'memory-reconcile'

export const MEMORY_RECONCILE_JOB_FANOUT = 'memory-reconcile.fanout' as const
export const MEMORY_RECONCILE_JOB_PER_ORG = 'memory-reconcile.org' as const

export type MemoryReconcileFanoutJobData = { triggeredAt: string }
export type MemoryReconcileOrgJobData = { orgId: string }

/// Nightly fanout. Phase floats with the last process restart, which is fine.
export const MEMORY_RECONCILE_FANOUT_INTERVAL_MS = 24 * 60 * 60 * 1000

/// Debounce window for the KB-change trigger. A burst of uploads/edits for one
/// org coalesces into a single reconcile (same jobId while the delayed job is
/// pending).
export const MEMORY_RECONCILE_DEBOUNCE_MS = 5 * 60 * 1000

/// Stable per-org jobId for the debounced trigger — adding while one is pending
/// is a no-op, which is exactly the debounce we want.
export function reconcileJobIdForOrg(orgId: string): string {
  return `memory-reconcile:${orgId}`
}
