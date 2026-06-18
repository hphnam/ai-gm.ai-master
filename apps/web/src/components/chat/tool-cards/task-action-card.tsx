'use client'

import { CheckCircle2, Users } from 'lucide-react'
import { CardEmpty, CardShell } from './card-shell'
import { isToolFail, isToolOk, sanitizeMentionName, type ToolCardRendererProps } from './types'

type CreateData =
  | {
      status: 'created'
      id: string
      body: string
      dueAt: string | null
      assigneeName: string | null
    }
  | {
      status: 'needs-disambiguation'
      candidates: Array<{ userId: string; name: string; role?: string }>
      body: string
      dueAt?: string | null
    }
  | { status: 'no-match'; body: string }

type CompleteData = {
  id: string
  status: 'done'
  completedAt: string
  body?: string
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const today = new Date()
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `Today, ${time}`
  const datePart = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return `${datePart}, ${time}`
}

export function TaskCreatedCard({ part, ctx }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={CheckCircle2} title="Task">
        <CardEmpty message={output.detail ?? "Couldn't save that task."} />
      </CardShell>
    )
  }
  if (!isToolOk<CreateData>(output)) return null
  const data = output.data

  if (data.status === 'no-match') {
    return (
      <CardShell icon={Users} title="No match" tone="warning">
        <p className="text-[13px] leading-snug text-foreground">
          Couldn&apos;t find that person. Try a different name or email fragment.
        </p>
      </CardShell>
    )
  }

  if (data.status === 'needs-disambiguation') {
    return (
      <CardShell
        icon={Users}
        title="Which one?"
        subtitle={`${data.candidates.length} matches for assignee`}
      >
        <p className="mb-2 text-[12.5px] leading-snug text-muted-foreground">
          Tap who you meant — I&apos;ll save the task for them.
        </p>
        <div className="flex flex-col gap-1">
          {data.candidates.map((c) => (
            <button
              key={c.userId}
              type="button"
              onClick={() =>
                ctx.onPrompt?.(`Assign that task to @[${sanitizeMentionName(c.name)}](${c.userId})`)
              }
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent"
            >
              <span className="font-medium">{c.name}</span>
              {c.role ? (
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {c.role}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </CardShell>
    )
  }

  const due = formatDate(data.dueAt)
  return (
    <CardShell
      icon={CheckCircle2}
      title="Task saved"
      subtitle={data.assigneeName ? `For ${data.assigneeName}` : 'For you'}
      tone="success"
    >
      <p className="text-[13.5px] leading-snug text-foreground">{data.body}</p>
      {due ? <p className="mt-1.5 text-[12px] text-muted-foreground">Due {due}</p> : null}
    </CardShell>
  )
}

export function TaskCompletedCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={CheckCircle2} title="Task">
        <CardEmpty message={output.detail ?? "Couldn't complete that task."} />
      </CardShell>
    )
  }
  if (!isToolOk<CompleteData>(output)) return null
  const data = output.data
  return (
    <CardShell icon={CheckCircle2} title="Task done" tone="success">
      <p className="text-[13.5px] leading-snug text-foreground">
        {data.body ?? 'Task marked complete.'}
      </p>
    </CardShell>
  )
}
