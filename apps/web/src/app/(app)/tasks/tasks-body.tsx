'use client'

import { Check, CircleAlert, Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { ConfirmDeleteDialog, DeleteButton } from '@/components/ui/confirm-delete-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { type TabItem, Tabs } from '@/components/ui/tabs'
import { type Task, useDeleteTask, useTasks, useUpdateTask } from '@/lib/hooks/use-tasks'
import { useTasksSocket } from '@/lib/hooks/use-tasks-socket'
import { cn } from '@/lib/utils'

type Filter = 'open' | 'done' | 'all'

const FILTERS: TabItem<Filter>[] = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' },
]

export function TasksBody() {
  const [filter, setFilter] = useState<Filter>('open')
  // Realtime invalidation — agent/scheduler updates push through here and
  // refresh both the list and the sidebar badge without a page reload.
  useTasksSocket()
  const tasks = useTasks({ status: filter === 'all' ? 'all' : filter, scope: 'mine' })

  const grouped = useMemo(() => groupByDue(tasks.data?.tasks ?? []), [tasks.data?.tasks])

  return (
    <AppShell>
      <PageHeader
        title="My tasks"
        description="Reminders and follow-ups the agent has captured for you."
      />

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <Tabs
            items={FILTERS}
            value={filter}
            onValueChange={setFilter}
            ariaLabel="Filter tasks"
            trailing={
              tasks.data ? (
                <span className="text-xs text-muted-foreground">
                  {tasks.data.openCount} open
                  {tasks.data.overdueCount > 0 ? ` · ${tasks.data.overdueCount} overdue` : ''}
                </span>
              ) : null
            }
          />

          {tasks.isLoading ? (
            <TasksLoading />
          ) : tasks.data && tasks.data.tasks.length === 0 ? (
            <TasksEmpty filter={filter} />
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.overdue.length > 0 ? (
                <TaskGroup label="Overdue" tone="warn" tasks={grouped.overdue} />
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
        </div>
      </div>
    </AppShell>
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
  return <EmptyState icon={Inbox} title={title} description={description} />
}

const TASK_SKELETON_KEYS = ['a', 'b', 'c', 'd']

function TasksLoading() {
  return (
    <div className="flex flex-col gap-3">
      {TASK_SKELETON_KEYS.map((k) => (
        <div
          key={k}
          className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 shadow-sm"
        >
          <Skeleton className="mt-0.5 h-5 w-5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
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
  tone?: 'warn'
  muted?: boolean
}) {
  return (
    <section aria-label={label}>
      <h2
        className={cn(
          'mb-2 text-[11px] font-semibold uppercase tracking-wider',
          tone === 'warn' ? 'text-amber-700' : 'text-muted-foreground',
        )}
      >
        {label}
      </h2>
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} muted={muted} tone={tone} />
        ))}
      </ul>
    </section>
  )
}

function TaskRow({ task, muted, tone }: { task: Task; muted?: boolean; tone?: 'warn' }) {
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
    <li
      className={cn(
        'flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 shadow-sm',
        tone === 'warn' && 'border-amber-300/60 bg-amber-50/40',
        muted && 'opacity-70',
      )}
    >
      <button
        type="button"
        aria-label={isDone ? 'Reopen task' : 'Mark task done'}
        onClick={isDone ? onReopen : onComplete}
        disabled={update.isPending}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          isDone
            ? 'border-foreground/30 bg-foreground text-background'
            : 'border-foreground/40 hover:border-foreground/80',
          update.isPending && 'opacity-50',
        )}
      >
        {isDone ? <Check className="h-3 w-3" aria-hidden /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn('text-sm', (isDone || isCancelled) && 'text-muted-foreground line-through')}
        >
          {task.body}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {task.dueAt ? <DueLabel dueAt={task.dueAt} done={isDone} /> : null}
          {task.category ? <span>· {task.category}</span> : null}
          {task.creator && task.creator.userId !== task.assignee.userId ? (
            <span>· from {task.creator.name ?? task.creator.email}</span>
          ) : null}
        </div>
      </div>
      <DeleteButton
        onClick={() => setConfirmOpen(true)}
        disabled={del.isPending}
        aria-label={`Delete task: ${task.body}`}
      />
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this task?"
        description="The task will be permanently removed. This can't be undone."
        onConfirm={() => del.mutateAsync(task.id)}
        isPending={del.isPending}
      />
    </li>
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
  return (
    <span className={cn('inline-flex items-center gap-1', overdue && 'text-amber-700')}>
      {overdue ? <CircleAlert className="h-3 w-3" aria-hidden /> : null}
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
