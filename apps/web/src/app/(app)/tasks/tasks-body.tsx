'use client'

import { Check, CircleAlert, ClipboardCheck, Clock, X } from 'lucide-react'
import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { useMemo, useState } from 'react'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { ListRow } from '@/components/ui/list-row'
import { PageContainer } from '@/components/ui/page-container'
import { Skeleton } from '@/components/ui/skeleton'
import { type Task, useDeleteTask, useTasks, useUpdateTask } from '@/lib/hooks/use-tasks'
import { useTasksSocket } from '@/lib/hooks/use-tasks-socket'
import { cn } from '@/lib/utils'

type Filter = 'open' | 'done' | 'all'

const FILTER_VALUES = ['open', 'done', 'all'] as const

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' },
]

export function TasksBody() {
  const [filter, setFilter] = useQueryState(
    'status',
    parseAsStringLiteral(FILTER_VALUES).withDefault('open').withOptions({ clearOnDefault: true }),
  )
  useTasksSocket()
  const tasks = useTasks({ status: filter === 'all' ? 'all' : filter, scope: 'mine' })

  const grouped = useMemo(() => groupByDue(tasks.data?.tasks ?? []), [tasks.data?.tasks])

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <PageContainer width="prose">
        {/* Mobile hero title — the page header (which carries it on desktop) is
            hidden on this route on mobile. */}
        <h1 className="mb-4 font-news text-[28px] font-normal leading-[1.15] tracking-[-0.01em] text-[var(--ink-text)] md:hidden">
          Tasks
        </h1>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Filter tasks"
            className="inline-flex gap-[3px] rounded-[10px] bg-[var(--paper-2)] p-[3px]"
          >
            {FILTERS.map(({ id, label }) => {
              const selected = filter === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(id)}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-[7px] rounded-[7px] px-3.5 py-[7px] text-[13px] transition-colors',
                    selected
                      ? 'bg-[#fcfaf3] font-semibold text-[var(--ink-text)] shadow-[0_1px_2px_rgba(32,26,18,0.06)]'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-text)]',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {tasks.data ? (
            <span className="font-mono-ledger text-xs text-[var(--mono-muted)]">
              {tasks.data.openCount} open
              {tasks.data.overdueCount > 0 ? ` · ${tasks.data.overdueCount} overdue` : ''}
            </span>
          ) : null}
        </div>

        {tasks.isLoading ? (
          <TasksLoading />
        ) : tasks.data && tasks.data.tasks.length === 0 ? (
          <TasksEmpty filter={filter} />
        ) : (
          <div className="flex flex-col gap-[26px]">
            {grouped.overdue.length > 0 ? (
              <TaskGroup label="Overdue" tone="urgent" tasks={grouped.overdue} />
            ) : null}
            {grouped.dueSoon.length > 0 ? (
              <TaskGroup label="Due soon" tasks={grouped.dueSoon} />
            ) : null}
            {grouped.later.length > 0 ? <TaskGroup label="Later" tasks={grouped.later} /> : null}
            {grouped.noDate.length > 0 ? (
              <TaskGroup label="No due date" tasks={grouped.noDate} />
            ) : null}
            {grouped.completed.length > 0 ? (
              <TaskGroup label="Completed" tasks={grouped.completed} muted />
            ) : null}
          </div>
        )}
      </PageContainer>
    </div>
  )
}

function TasksEmpty({ filter }: { filter: Filter }) {
  const title =
    filter === 'open'
      ? 'Nothing on your list'
      : filter === 'done'
        ? 'Nothing completed yet'
        : 'No tasks yet'
  const description =
    filter === 'open'
      ? 'Ask the agent to "remind me to…" and tasks land here.'
      : filter === 'done'
        ? 'Tasks you finish will appear here.'
        : 'Your tasks will show up here once the agent captures them.'
  return (
    <div className="flex flex-col items-center gap-3.5 px-5 py-[74px] text-center">
      <span className="grid size-[52px] place-items-center rounded-[13px] bg-[var(--paper-2)] text-[var(--ink-faint)]">
        <ClipboardCheck className="h-6 w-6" aria-hidden />
      </span>
      <div className="text-[17px] font-semibold leading-tight text-foreground">{title}</div>
      <p className="max-w-[340px] text-[13px] leading-relaxed text-[var(--ink-muted)]">
        {description}
      </p>
    </div>
  )
}

const TASK_SKELETON_KEYS = ['a', 'b', 'c', 'd']

function TasksLoading() {
  return (
    <div className="flex flex-col gap-2">
      {TASK_SKELETON_KEYS.map((k) => (
        <ListRow
          key={k}
          className="flex items-start gap-[13px] rounded-[11px] border-[var(--hairline)] bg-[#fdfbf5] px-[15px] py-[13px] shadow-none"
        >
          <Skeleton className="mt-0.5 h-5 w-5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </ListRow>
      ))}
    </div>
  )
}

function TaskGroup({
  label,
  tasks,
  tone,
  muted,
}: {
  label: string
  tasks: Task[]
  tone?: 'urgent'
  muted?: boolean
}) {
  return (
    <section aria-label={label}>
      <div className="mb-[11px] flex items-center gap-2">
        <h2
          className={cn(
            'font-mono-ledger text-[10px] font-bold uppercase tracking-[0.14em]',
            tone === 'urgent' ? 'text-[var(--clay)]' : 'text-[var(--mono-muted)]',
          )}
        >
          {label}
        </h2>
        <span className="font-mono-ledger rounded-full bg-[rgba(32,26,18,0.06)] px-[7px] py-[3px] text-[10px] font-semibold text-[var(--ink-faint)]">
          {tasks.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} muted={muted} tone={tone} />
        ))}
      </ul>
    </section>
  )
}

function TaskRow({ task, muted, tone }: { task: Task; muted?: boolean; tone?: 'urgent' }) {
  const update = useUpdateTask()
  const del = useDeleteTask()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isDone = task.status === 'done'
  const isCancelled = task.status === 'cancelled'

  const onComplete = () => {
    update.mutate({ id: task.id, status: 'done' })
  }
  const onReopen = () => {
    update.mutate({ id: task.id, status: 'open' })
  }

  return (
    <ListRow
      asChild
      className={cn(
        'flex items-start gap-[13px] rounded-[11px] border-[var(--hairline)] bg-[#fdfbf5] p-[13px_15px] shadow-none transition-shadow hover:shadow-[0_3px_10px_-5px_rgba(32,26,18,0.22)]',
        tone === 'urgent' && 'border-[rgba(154,75,44,0.25)] bg-[rgba(154,75,44,0.05)]',
        muted && 'opacity-70',
      )}
    >
      <li>
        <button
          type="button"
          aria-label={isDone ? 'Reopen task' : 'Mark task done'}
          onClick={isDone ? onReopen : onComplete}
          disabled={update.isPending}
          className={cn(
            "relative mt-px flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors before:absolute before:-inset-3 before:content-['']",
            isDone
              ? 'border-[var(--ledger-green)] bg-[var(--ledger-green)] text-[var(--cream-hi)]'
              : 'border-[var(--hairline-strong)] hover:border-[var(--ink-text)]',
            update.isPending && 'opacity-50',
          )}
        >
          {isDone ? <Check className="h-3 w-3" aria-hidden /> : null}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-[14.5px] leading-[1.45] text-foreground',
              (isDone || isCancelled) && 'text-muted-foreground line-through',
            )}
          >
            {task.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-[9px] gap-y-1">
            {task.dueAt ? <DueLabel dueAt={task.dueAt} done={isDone} /> : null}
            {task.category ? (
              <span className="font-mono-ledger rounded-full bg-[rgba(143,107,31,0.1)] px-[9px] py-1 text-[10.5px] text-[var(--brass)]">
                {task.category}
              </span>
            ) : null}
            {task.creator && task.creator.userId !== task.assignee.userId ? (
              <span className="text-[11px] text-[var(--ink-faint)]">
                from {task.creator.name ?? task.creator.email}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={del.isPending}
          aria-label={`Delete task: ${task.body}`}
          className="grid size-[26px] shrink-0 cursor-pointer place-items-center rounded-md text-[var(--ink-faint)] transition-colors hover:bg-[rgba(154,75,44,0.1)] hover:text-[var(--clay)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete this task?"
          description="The task will be permanently removed. This can't be undone."
          onConfirm={() => del.mutateAsync(task.id)}
          isPending={del.isPending}
        />
      </li>
    </ListRow>
  )
}

function DueLabel({ dueAt, done }: { dueAt: string; done: boolean }) {
  const due = new Date(dueAt)
  const now = Date.now()
  const diffMs = due.getTime() - now
  const overdue = !done && diffMs < 0
  const absHours = Math.round(Math.abs(diffMs) / (60 * 60 * 1000))
  const label =
    absHours < 1
      ? overdue
        ? 'overdue (now)'
        : 'due now'
      : absHours < 24
        ? overdue
          ? `overdue ${absHours}h`
          : `due in ${absHours}h`
        : (() => {
            const days = Math.round(absHours / 24)
            return overdue ? `overdue ${days}d` : `due in ${days}d`
          })()
  if (overdue) {
    return (
      <span className="font-mono-ledger inline-flex items-center gap-1.5 rounded-full bg-[rgba(154,75,44,0.12)] px-[9px] py-1 text-[10.5px] font-semibold text-[var(--clay)]">
        <CircleAlert className="h-3 w-3" aria-hidden />
        {label}
      </span>
    )
  }
  return (
    <span className="font-mono-ledger inline-flex items-center gap-1.5 text-[11px] text-[var(--mono-muted)]">
      <Clock className="h-3 w-3" aria-hidden />
      {label}
    </span>
  )
}

function groupByDue(tasks: Task[]) {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const overdue: Task[] = []
  const dueSoon: Task[] = []
  const later: Task[] = []
  const noDate: Task[] = []
  const completed: Task[] = []
  for (const t of tasks) {
    if (t.status === 'done' || t.status === 'cancelled') {
      completed.push(t)
      continue
    }
    if (!t.dueAt) {
      noDate.push(t)
      continue
    }
    const diff = new Date(t.dueAt).getTime() - now
    if (diff < 0) overdue.push(t)
    else if (diff < 3 * day) dueSoon.push(t)
    else later.push(t)
  }
  return { overdue, dueSoon, later, noDate, completed }
}
