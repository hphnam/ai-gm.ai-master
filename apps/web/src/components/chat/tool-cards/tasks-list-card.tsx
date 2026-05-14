'use client'

import { CheckCircle2, Circle, Clock, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useUpdateTask } from '@/lib/hooks/use-tasks'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'
import { CardEmpty, CardShell } from './card-shell'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

type ListTask = {
  id: string
  body: string
  dueAt: string | null
  status: 'open' | 'done' | 'cancelled'
  category: string | null
  assigneeName: string | null
  creatorName: string | null
  createdAt: string
}

type ListData = {
  tasks: ListTask[]
  openCount: number
  overdueCount: number
  scope?: string
}

function formatDue(iso: string | null): { label: string; overdue: boolean } | null {
  if (!iso) return null
  const due = new Date(iso)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const overdue = diffMs < 0
  const absH = Math.abs(diffMs) / (1000 * 60 * 60)
  if (absH < 24) {
    return {
      label: overdue ? `${Math.round(absH)}h overdue` : `due in ${Math.max(1, Math.round(absH))}h`,
      overdue,
    }
  }
  const absD = Math.round(absH / 24)
  return {
    label: overdue ? `${absD}d overdue` : `due in ${absD}d`,
    overdue,
  }
}

function scopeLabel(scope: string | undefined): string {
  switch (scope) {
    case 'overdue':
      return 'Overdue tasks'
    case 'this_week':
      return 'Tasks this week'
    case 'all':
      return 'All tasks'
    default:
      return 'Your open tasks'
  }
}

export function TasksListCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={ListChecks} title="Tasks">
        <CardEmpty message={output.detail ?? 'No matching tasks.'} />
      </CardShell>
    )
  }
  if (!isToolOk<ListData>(output)) return null
  const { tasks, openCount, overdueCount, scope } = output.data
  const subtitle = `${openCount} open${overdueCount ? ` · ${overdueCount} overdue` : ''}`

  if (tasks.length === 0) {
    return (
      <CardShell icon={ListChecks} title={scopeLabel(scope)} subtitle={subtitle}>
        <CardEmpty message="Nothing on your list. Enjoy the calm." />
      </CardShell>
    )
  }

  return (
    <CardShell icon={ListChecks} title={scopeLabel(scope)} subtitle={subtitle}>
      <ul className="-mx-1 -my-1 divide-y divide-border/60">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </ul>
    </CardShell>
  )
}

function TaskRow({ task }: { task: ListTask }) {
  const update = useUpdateTask()
  const [localDone, setLocalDone] = useState(task.status === 'done')
  const due = formatDue(task.dueAt)
  const isPending = update.isPending

  const toggle = async () => {
    if (localDone || isPending) return
    setLocalDone(true)
    try {
      await update.mutateAsync({ id: task.id, status: 'done' })
      toast.success('Task marked done')
    } catch (err) {
      setLocalDone(false)
      toast.error(mapApiError(err))
    }
  }

  return (
    <li className="group flex items-start gap-2.5 px-1 py-2">
      <button
        type="button"
        onClick={toggle}
        disabled={localDone || isPending}
        className={cn(
          'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors',
          localDone
            ? 'text-emerald-600 dark:text-emerald-500'
            : 'text-muted-foreground hover:text-foreground',
          isPending && 'animate-pulse',
        )}
        aria-label={localDone ? 'Marked done' : 'Mark task done'}
      >
        {localDone ? (
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        ) : (
          <Circle className="h-5 w-5" aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[13.5px] leading-snug text-foreground',
            localDone && 'text-muted-foreground line-through',
          )}
        >
          {task.body}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {due ? (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                due.overdue && !localDone && 'text-destructive',
              )}
            >
              <Clock className="h-3 w-3" aria-hidden />
              {due.label}
            </span>
          ) : null}
          {task.category ? <span>#{task.category}</span> : null}
          {task.assigneeName ? <span>· {task.assigneeName}</span> : null}
        </div>
      </div>
    </li>
  )
}
