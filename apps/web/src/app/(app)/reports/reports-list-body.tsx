'use client'

import { CalendarClock, FileBarChart, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { PageHeader } from '@/components/shell/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api-client'
import { useReports } from '@/lib/hooks/use-reports'

export function ReportsListBody() {
  const list = useReports()
  // Flatten paginated pages into one ordered list for rendering. Memoised
  // so the row map doesn't recompute on every render of the pager state.
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.reports) ?? [], [list.data?.pages])
  const total = list.data?.pages[0]?.total ?? rows.length

  return (
    <>
      <PageHeader
        title="Reports"
        description="Saved reports the chat agent has generated for your org."
        actions={
          <Button asChild size="sm" variant="outline" className="cursor-pointer gap-1.5">
            <Link href="/reports/schedules">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Scheduled reports
            </Link>
          </Button>
        }
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          {list.isLoading ? (
            <ReportsLoading />
          ) : list.isError ? (
            <ErrorState err={list.error} />
          ) : !rows.length ? (
            <ReportsEmpty />
          ) : (
            <>
              <ul className="space-y-2.5">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/reports/${r.id}`}
                      className="group block rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-foreground/25"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                          aria-hidden
                        >
                          <FileBarChart className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-display text-base leading-tight text-foreground">
                            {r.title}
                          </h3>
                          {r.summary ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {r.summary}
                            </p>
                          ) : null}
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {new Date(r.createdAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <PagerFooter
                shown={rows.length}
                total={total}
                hasNext={list.hasNextPage}
                isFetchingNext={list.isFetchingNextPage}
                onLoadMore={() => list.fetchNextPage()}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}

function PagerFooter({
  shown,
  total,
  hasNext,
  isFetchingNext,
  onLoadMore,
}: {
  shown: number
  total: number
  hasNext: boolean | undefined
  isFetchingNext: boolean
  onLoadMore: () => void
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <p className="text-[11px] text-muted-foreground tabular-nums">
        Showing {shown} of {total}
      </p>
      {hasNext ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNext}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFetchingNext ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
          {isFetchingNext ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}

function ReportsEmpty() {
  return (
    <EmptyState
      icon={FileBarChart}
      title="No reports yet"
      description="Ask the chat for a weekly recap, monthly P&L, or any breakdown — it'll save here with a permalink."
      action={
        <>
          <Button asChild size="sm" className="cursor-pointer">
            <Link href="/chat">Open chat</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="cursor-pointer gap-1.5">
            <Link href="/reports/schedules">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Or schedule one automatically
            </Link>
          </Button>
        </>
      }
    />
  )
}

const REPORTS_SKELETON_KEYS = ['a', 'b', 'c', 'd']

function ReportsLoading() {
  return (
    <ul className="space-y-2.5">
      {REPORTS_SKELETON_KEYS.map((k) => (
        <li key={k} className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ErrorState({ err }: { err: unknown }) {
  const msg =
    err instanceof ApiError && err.status === 401
      ? 'You need to sign in to see reports.'
      : "Couldn't load reports."
  return <Alert variant="destructive">{msg}</Alert>
}
