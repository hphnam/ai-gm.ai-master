'use client'

import { CheckCircle2, ClipboardCheck, RotateCcw, Square, SquareCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSession } from '@/lib/auth-client'
import { CardEmpty, CardShell } from './card-shell'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

type ChecklistStep = { index: number; content: string }

type Data = {
  checklistId: string
  knowledgeItemId?: string
  title: string
  steps: ChecklistStep[]
  stepCount?: number
}

// Persist tick state per user+checklist+day in localStorage. Lightweight v1 —
// the server has ChecklistInstance + ChecklistStepCompletion models for proper
// scheduled walkthroughs (the daily/weekly opening cards); the chat surface
// is an ad-hoc rehearsal, so per-day local state is the right scope here.
// User-scope is required because back-of-house terminals are shared between
// shift workers — otherwise a previous user's ticks would leak into the next
// user's session.
function storageKey(userId: string, checklistId: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `gm:checklist:${userId}:${checklistId}:${today}`
}

function loadTicked(userId: string, checklistId: string): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(storageKey(userId, checklistId))
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((n): n is number => typeof n === 'number'))
  } catch {
    return new Set()
  }
}

function saveTicked(userId: string, checklistId: string, ticked: Set<number>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(userId, checklistId), JSON.stringify([...ticked]))
  } catch {
    // localStorage quota or privacy mode — silently no-op; the user can
    // still tick boxes for the session, they just don't survive reload.
  }
}

export function ChecklistCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={ClipboardCheck} title="Checklist">
        <CardEmpty
          message={
            output.reason === 'no-data'
              ? "I couldn't find that checklist in the knowledge base yet."
              : (output.detail ?? "Couldn't load that checklist.")
          }
        />
      </CardShell>
    )
  }
  if (!isToolOk<Data>(output)) return null
  const { checklistId, title, steps, knowledgeItemId } = output.data
  if (steps.length === 0) {
    return (
      <CardShell icon={ClipboardCheck} title={title || 'Checklist'}>
        <CardEmpty message="No steps recorded for this checklist yet." />
      </CardShell>
    )
  }
  return (
    <InteractiveChecklist
      checklistId={checklistId}
      title={title || 'Checklist'}
      steps={steps}
      sourceHref={knowledgeItemId ? `/docs/${knowledgeItemId}` : null}
    />
  )
}

function InteractiveChecklist({
  checklistId,
  title,
  steps,
  sourceHref,
}: {
  checklistId: string
  title: string
  steps: ChecklistStep[]
  sourceHref: string | null
}) {
  const { data: session } = useSession()
  // Back-of-house terminals are shared between shift workers; key the local
  // tick state by the logged-in user too so the next shift starts fresh.
  // 'anon' fallback covers the brief render before session resolves — refreshes
  // pick up the proper key once auth lands.
  const userId = session?.user?.id ?? 'anon'
  const [ticked, setTicked] = useState<Set<number>>(() => loadTicked(userId, checklistId))

  // Re-hydrate when either the checklist id or the user flips (logout/login,
  // a new procedure surfaced in the same thread).
  useEffect(() => {
    setTicked(loadTicked(userId, checklistId))
  }, [userId, checklistId])

  const toggle = (idx: number) => {
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      saveTicked(userId, checklistId, next)
      return next
    })
  }

  const reset = () => {
    setTicked(new Set())
    saveTicked(userId, checklistId, new Set())
  }

  const completedCount = steps.filter((s) => ticked.has(s.index)).length
  const allDone = completedCount === steps.length
  const progressPct = Math.round((completedCount / steps.length) * 100)

  return (
    <CardShell
      icon={ClipboardCheck}
      title={title}
      subtitle={`${completedCount} of ${steps.length} done`}
      tone={allDone ? 'success' : 'default'}
      trailing={
        completedCount > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Reset checklist"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Reset
          </button>
        ) : undefined
      }
    >
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground transition-all duration-300"
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>
      <ol className="-mx-1 flex flex-col">
        {steps.map((step) => {
          const isTicked = ticked.has(step.index)
          return (
            <li key={step.index}>
              <button
                type="button"
                onClick={() => toggle(step.index)}
                className="group flex w-full items-start gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-accent/50"
                aria-pressed={isTicked}
              >
                <span
                  className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center transition-colors ${
                    isTicked
                      ? 'text-emerald-600 dark:text-emerald-500'
                      : 'text-muted-foreground/70 group-hover:text-foreground'
                  }`}
                  aria-hidden
                >
                  {isTicked ? <SquareCheck className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </span>
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {step.index + 1}.
                  </span>
                  <span
                    className={`text-[13.5px] leading-snug ${
                      isTicked ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {step.content}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      {allDone ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          All steps done — nice work.
        </div>
      ) : null}
      {sourceHref ? (
        <a
          href={sourceHref}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-block text-[11px] text-muted-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
        >
          Open source document →
        </a>
      ) : null}
    </CardShell>
  )
}
