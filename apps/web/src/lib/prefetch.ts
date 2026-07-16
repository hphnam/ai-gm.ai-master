import type { QueryClient } from '@tanstack/react-query'
import { expiryRecordsOptions } from '@/lib/hooks/use-compliance'
import { conversationOptions } from '@/lib/hooks/use-conversation'
import { docDetailOptions, docsListOptions } from '@/lib/hooks/use-docs'
import { incidentsListOptions } from '@/lib/hooks/use-incidents'
import { reportDetailOptions, reportsListOptions } from '@/lib/hooks/use-reports'
import { tasksListOptions } from '@/lib/hooks/use-tasks'
import { venuesOptions } from '@/lib/hooks/use-venues'

// Warm a destination's primary query the moment the user signals intent
// (hover / focus a nav link) so the page lands on data instead of a skeleton.
// Each entry mirrors the query the target page fires FIRST with its default
// filter — a drift just means the prefetch misses and the page fetches as
// before, never a wrong result. Prefetch is fire-and-forget and deduped by
// React Query, so repeated hovers cost nothing.
const PREFETCHERS: Record<string, (qc: QueryClient) => void> = {
  '/tasks': (qc) => {
    qc.prefetchQuery(tasksListOptions())
  },
  '/compliance': (qc) => {
    qc.prefetchQuery(expiryRecordsOptions())
  },
  '/incidents': (qc) => {
    qc.prefetchQuery(incidentsListOptions({ status: 'open' }))
  },
  '/docs': (qc) => {
    qc.prefetchInfiniteQuery(docsListOptions())
  },
  '/reports': (qc) => {
    qc.prefetchInfiniteQuery(reportsListOptions())
  },
  '/dashboard': (qc) => {
    // Every dashboard metric is venue-scoped, so the venue list is the first
    // thing it needs — warm that and the metrics fire the instant it lands.
    qc.prefetchQuery(venuesOptions())
  },
}

export function prefetchRoute(qc: QueryClient, href: string): void {
  const path = href.split('?')[0]
  PREFETCHERS[path]?.(qc)
}

// List → detail warmers: wired to row hover/focus so opening an item lands on
// its detail instantly instead of cold-fetching after the click.
export function prefetchDoc(qc: QueryClient, id: string): void {
  qc.prefetchQuery(docDetailOptions(id))
}

export function prefetchReport(qc: QueryClient, id: string): void {
  qc.prefetchQuery(reportDetailOptions(id))
}

export function prefetchConversation(
  qc: QueryClient,
  conversationId: string,
  venueId: string,
): void {
  qc.prefetchQuery(conversationOptions(conversationId, venueId))
}
