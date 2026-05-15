'use client'

import { CalendarClock, FileBarChart, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { PageHeader } from '@/components/shell/page-header'
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
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <div className="mb-4 flex items-center justify-end">
            <Link
              href="/reports/schedules"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent"
            >
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Scheduled reports
            </Link>
          </div>

          {list.isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Pulling your reports…
            </div>
          ) : list.isError ? (
            <ErrorState err={list.error} />
          ) : !rows.length ? (
            <EmptyState />
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

function EmptyState() {
  return (
    <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
      <FileBarChart className="mx-auto mb-3 h-5 w-5 text-muted-foreground" aria-hidden />
      <p className="font-display text-base text-foreground">No reports yet</p>
      <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
        Ask the chat for a weekly recap, monthly P&amp;L, or any breakdown — it'll save here with a
        permalink.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/chat"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground transition-[filter] hover:brightness-110"
        >
          Open chat
        </Link>
        <Link
          href="/reports/schedules"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent"
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Or schedule one automatically
        </Link>
      </div>
    </div>
  )
}

function ErrorState({ err }: { err: unknown }) {
  const msg =
    err instanceof ApiError && err.status === 401
      ? 'You need to sign in to see reports.'
      : "Couldn't load reports."
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {msg}
    </div>
  )
}
