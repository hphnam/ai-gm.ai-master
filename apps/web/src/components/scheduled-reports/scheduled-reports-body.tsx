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
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ApiError } from '@/lib/api-client'
import {
  type ScheduledReport,
  type ScheduleFrequency,
  type ScheduleStatus,
  useCancelScheduledReport,
  usePauseScheduledReport,
  useResumeScheduledReport,
  useScheduledReports,
} from '@/lib/hooks/use-scheduled-reports'
import { cn } from '@/lib/utils'
import { ScheduleCreateDialog } from './schedule-create-dialog'

type Filter = 'active' | 'paused' | 'cancelled' | 'all'

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
]

export function ScheduledReportsBody() {
  const [filter, setFilter] = useState<Filter>('active')
  const [createOpen, setCreateOpen] = useState(false)
  const list = useScheduledReports({ status: filter })
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.schedules) ?? [], [list.data?.pages])
  const total = list.data?.pages[0]?.total ?? rows.length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Filter schedules by status"
          className="inline-flex items-center gap-1 rounded-md border bg-card p-0.5"
        >
          {FILTERS.map((f) => {
            const selected = f.key === filter
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={selected}
                className={cn(
                  'cursor-pointer rounded-[5px] px-2.5 py-1 text-xs transition-colors',
                  selected
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground transition-[filter] hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New schedule
        </button>
      </div>

      {list.isLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          Pulling your schedules…
        </div>
      ) : list.isError ? (
        <ErrorState err={list.error} />
      ) : !rows.length ? (
        <EmptyState filter={filter} onCreate={() => setCreateOpen(true)} />
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
  const cancel = useCancelScheduledReport()
  const busy = pause.isPending || resume.isPending || cancel.isPending

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
            {schedule.status !== 'cancelled' ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => cancel.mutate(schedule.id)}
                  className="text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <X className="mr-2 h-3.5 w-3.5" aria-hidden />
                  Cancel schedule
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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

function EmptyState({ filter, onCreate }: { filter: Filter; onCreate: () => void }) {
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
    <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
      <CalendarClock className="mx-auto mb-3 h-5 w-5 text-muted-foreground" aria-hidden />
      <p className="font-display text-base text-foreground">{copy.title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">{copy.body}</p>
      {copy.showCta ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground transition-[filter] hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New schedule
        </button>
      ) : null}
    </div>
  )
}

function ErrorState({ err }: { err: unknown }) {
  const msg =
    err instanceof ApiError && err.status === 401
      ? 'You need to sign in to see schedules.'
      : "Couldn't load schedules."
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {msg}
    </div>
  )
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
