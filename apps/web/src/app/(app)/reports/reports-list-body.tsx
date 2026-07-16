'use client'

import { useQueryClient } from '@tanstack/react-query'
import { BarChart3, CalendarClock, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageContainer } from '@/components/ui/page-container'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api-client'
import { useReports } from '@/lib/hooks/use-reports'
import { prefetchReport } from '@/lib/prefetch'
import { cn } from '@/lib/utils'

export function ReportsListBody() {
  const list = useReports()
  const queryClient = useQueryClient()
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.reports) ?? [], [list.data?.pages])
  const total = list.data?.pages[0]?.total ?? rows.length

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <PageContainer width="prose">
        <ReportsViewSwitch active="library" />
        {list.isLoading ? (
          <ReportsLoading />
        ) : list.isError ? (
          <ErrorState err={list.error} />
        ) : !rows.length ? (
          <ReportsEmpty />
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/reports/${r.id}`}
                    onMouseEnter={() => prefetchReport(queryClient, r.id)}
                    onFocus={() => prefetchReport(queryClient, r.id)}
                    className="group flex items-start gap-3.5 rounded-xl border border-[var(--hairline)] bg-card p-[15px] transition-[box-shadow,border-color] hover:border-[var(--hairline-strong)] hover:shadow-[0_4px_14px_-7px_rgba(32,26,18,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-muted text-brand">
                      <BarChart3 className="h-[17px] w-[17px]" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-semibold leading-[1.35] text-foreground">
                        {r.title}
                      </h3>
                      {r.summary ? (
                        <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.5] text-[var(--ink-muted)]">
                          {r.summary}
                        </p>
                      ) : null}
                      <p className="mt-2 font-mono-ledger text-[10.5px] text-[var(--ink-faint)]">
                        {new Date(r.createdAt).toLocaleDateString(undefined, {
                          dateStyle: 'medium',
                        })}
                      </p>
                    </div>
                    <ChevronRight
                      className="mt-1.5 h-[15px] w-[15px] shrink-0 text-[var(--ink-faint)]"
                      aria-hidden
                    />
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
      </PageContainer>
    </div>
  )
}

// Library / Schedules segmented switch — Link tabs so each view keeps its own
// route. Mirrored on the schedules page.
export function ReportsViewSwitch({ active }: { active: 'library' | 'schedules' }) {
  const tab = 'rounded-[7px] px-3.5 py-2 text-[13px] transition-colors'
  const on = 'bg-[#fcfaf3] font-semibold text-foreground shadow-[0_1px_2px_rgba(32,26,18,0.06)]'
  const off = 'font-medium text-[var(--ink-muted)] hover:text-foreground'
  return (
    <div className="mb-[22px] inline-flex gap-[3px] rounded-[10px] bg-muted p-[3px]">
      <Link href="/reports" className={cn(tab, active === 'library' ? on : off)}>
        Library
      </Link>
      <Link href="/reports/schedules" className={cn(tab, active === 'schedules' ? on : off)}>
        Schedules
      </Link>
    </div>
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
      <p className="font-mono-ledger text-[11px] tabular-nums text-[var(--mono-muted)]">
        Showing {shown} of {total}
      </p>
      {hasNext ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLoadMore}
          disabled={isFetchingNext}
          className="cursor-pointer gap-1.5"
        >
          {isFetchingNext ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
          {isFetchingNext ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  )
}

function ReportsEmpty() {
  return (
    <EmptyState
      icon={BarChart3}
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
    <ul className="flex flex-col gap-2">
      {REPORTS_SKELETON_KEYS.map((k) => (
        <li
          key={k}
          className="flex items-start gap-3.5 rounded-xl border border-[var(--hairline)] bg-card p-[15px]"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-[9px]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-24" />
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
