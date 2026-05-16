'use client'

import {
  CalendarClock,
  CalendarRange,
  Clock,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Sparkles,
  Sun,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog, DeleteButton } from '@/components/ui/confirm-delete-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { type TabItem, Tabs } from '@/components/ui/tabs'
import { ApiError } from '@/lib/api-client'
import {
  type ScheduledReport,
  type ScheduleFrequency,
  type ScheduleStatus,
  useDeleteScheduledReport,
  usePauseScheduledReport,
  useResumeScheduledReport,
  useScheduledReports,
} from '@/lib/hooks/use-scheduled-reports'
import { cn } from '@/lib/utils'
import { ScheduleCreateDialog } from './schedule-create-dialog'

type Filter = 'active' | 'paused' | 'cancelled' | 'all'

const FILTERS: TabItem<Filter>[] = [
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
]

export function ScheduledReportsBody() {
  const [filter, setFilter] = useState<Filter>('active')
  const [createOpen, setCreateOpen] = useState(false)
  const list = useScheduledReports({ status: filter })
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.schedules) ?? [], [list.data?.pages])
  const total = list.data?.pages[0]?.total ?? rows.length

  return (
    <div>
      <Tabs
        items={FILTERS}
        value={filter}
        onValueChange={setFilter}
        ariaLabel="Filter schedules by status"
        trailing={
          <Button size="sm" onClick={() => setCreateOpen(true)} className="cursor-pointer gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New schedule
          </Button>
        }
      />

      {list.isLoading ? (
        <SchedulesLoading />
      ) : list.isError ? (
        <ErrorState err={list.error} />
      ) : !rows.length ? (
        <SchedulesEmpty filter={filter} onCreate={() => setCreateOpen(true)} />
      ) : (
        <>
          <ul className="space-y-2.5">
            {rows.map((s) => (
              <li key={s.id}>
                <ScheduleRow schedule={s} />
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Showing {rows.length} of {total}
            </p>
            {list.hasNextPage ? (
              <button
                type="button"
                onClick={() => list.fetchNextPage()}
                disabled={list.isFetchingNextPage}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {list.isFetchingNextPage ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : null}
                {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            ) : null}
          </div>
        </>
      )}

      <ScheduleCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function ScheduleRow({ schedule }: { schedule: ScheduledReport }) {
  const pause = usePauseScheduledReport()
  const resume = useResumeScheduledReport()
  const del = useDeleteScheduledReport()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const busy = pause.isPending || resume.isPending || del.isPending

  return (
    <article
      className={cn(
        'group flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors',
        'hover:border-foreground/25',
        schedule.status === 'cancelled' && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden
        >
          <CalendarClock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-base leading-tight text-foreground">
              {schedule.title}
            </h3>
            <StatusPill status={schedule.status} />
          </div>
          {schedule.summary ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{schedule.summary}</p>
          ) : null}
          <dl className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <Meta icon={<CalendarRange className="h-3 w-3" aria-hidden />}>
              {formatCadence(schedule)}
            </Meta>
            <Meta icon={<Clock className="h-3 w-3" aria-hidden />}>
              {schedule.status === 'cancelled'
                ? 'Stopped'
                : `Next: ${formatNextRun(schedule.nextRunAt, schedule.timezone)}`}
            </Meta>
            {schedule.runCount > 0 ? (
              <Meta icon={<Sun className="h-3 w-3" aria-hidden />}>
                {schedule.runCount} {schedule.runCount === 1 ? 'run' : 'runs'}
              </Meta>
            ) : null}
            {schedule.prompt ? (
              <Meta icon={<Sparkles className="h-3 w-3" aria-hidden />}>
                <span className="truncate">{schedule.prompt}</span>
              </Meta>
            ) : null}
          </dl>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {schedule.status === 'active' || schedule.status === 'paused' || schedule.lastReportId ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Schedule actions"
                  disabled={busy}
                  className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {schedule.status === 'active' ? (
                  <DropdownMenuItem onClick={() => pause.mutate(schedule.id)} className="text-xs">
                    <Pause className="mr-2 h-3.5 w-3.5" aria-hidden />
                    Pause
                  </DropdownMenuItem>
                ) : null}
                {schedule.status === 'paused' ? (
                  <DropdownMenuItem onClick={() => resume.mutate(schedule.id)} className="text-xs">
                    <Play className="mr-2 h-3.5 w-3.5" aria-hidden />
                    Resume
                  </DropdownMenuItem>
                ) : null}
                {schedule.lastReportId ? (
                  <DropdownMenuItem asChild className="text-xs">
                    <Link href={`/reports/${schedule.lastReportId}`}>View last run</Link>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <DeleteButton
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            aria-label={`Delete schedule: ${schedule.title}`}
          />
        </div>
      </div>
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this schedule?"
        description={
          <>
            &ldquo;{schedule.title}&rdquo; will stop running and be permanently removed. Past report
            runs it generated stay in your library.
          </>
        }
        onConfirm={() => del.mutateAsync(schedule.id)}
        isPending={del.isPending}
      />
    </article>
  )
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-[24ch] items-center gap-1.5">
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}

function StatusPill({ status }: { status: ScheduleStatus }) {
  const styles =
    status === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
      : status === 'paused'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300'
        : 'border-border bg-muted text-muted-foreground'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        styles,
      )}
    >
      {status}
    </span>
  )
}

function SchedulesEmpty({ filter, onCreate }: { filter: Filter; onCreate: () => void }) {
  const copy = useMemo(() => {
    if (filter === 'active') {
      return {
        title: 'No active schedules',
        body: 'Set one up and the report lands as a bell notification on cadence — daily, weekly, or monthly.',
        showCta: true,
      }
    }
    if (filter === 'paused') {
      return {
        title: 'Nothing paused',
        body: 'Paused schedules will show up here.',
        showCta: false,
      }
    }
    if (filter === 'cancelled') {
      return {
        title: 'No cancelled schedules',
        body: 'History of stopped schedules will appear here.',
        showCta: false,
      }
    }
    return {
      title: 'No schedules yet',
      body: 'Set one up and the report lands as a bell notification on cadence.',
      showCta: true,
    }
  }, [filter])

  return (
    <EmptyState
      icon={CalendarClock}
      title={copy.title}
      description={copy.body}
      action={
        copy.showCta ? (
          <Button size="sm" onClick={onCreate} className="cursor-pointer gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New schedule
          </Button>
        ) : undefined
      }
    />
  )
}

const SCHEDULES_SKELETON_KEYS = ['a', 'b', 'c']

function SchedulesLoading() {
  return (
    <ul className="space-y-2.5">
      {SCHEDULES_SKELETON_KEYS.map((k) => (
        <li key={k} className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ErrorState({ err }: { err: unknown }) {
  const msg =
    err instanceof ApiError && err.status === 401
      ? 'You need to sign in to see schedules.'
      : "Couldn't load schedules."
  return <Alert variant="destructive">{msg}</Alert>
}

const WEEKDAY_LABELS = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function formatCadence(s: {
  frequency: ScheduleFrequency
  hourOfDay: number
  dayOfWeek: number | null
  dayOfMonth: number | null
  timezone: string
}): string {
  const time = `${String(s.hourOfDay).padStart(2, '0')}:00`
  if (s.frequency === 'daily') return `Daily at ${time} ${s.timezone}`
  if (s.frequency === 'weekly' && s.dayOfWeek)
    return `Weekly · ${WEEKDAY_LABELS[s.dayOfWeek]} ${time} ${s.timezone}`
  if (s.frequency === 'monthly' && s.dayOfMonth)
    return `Monthly · day ${s.dayOfMonth} ${time} ${s.timezone}`
  return `${s.frequency} ${time} ${s.timezone}`
}

function formatNextRun(iso: string, _timezone: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  if (diffMs < 0) return 'pending'
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 60) return `in ${diffMin}m`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `in ${diffH}h`
  const diffD = Math.round(diffH / 24)
  if (diffD < 7) return `in ${diffD}d`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' })
}
