'use client'

import { Check, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type TraceStep = {
  id: string
  label: string
  status: 'active' | 'done' | 'error'
}

export function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

function PulsingDot() {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      <span className="absolute inset-0 rounded-full bg-foreground/30" />
      <span className="relative inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
    </span>
  )
}

function StepGlyph({ status }: { status: TraceStep['status'] }) {
  return (
    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden>
      {status === 'active' ? (
        <PulsingDot />
      ) : status === 'error' ? (
        <X className="h-3 w-3 text-muted-foreground/60" />
      ) : (
        <Check className="h-3 w-3 text-muted-foreground/60" />
      )}
    </span>
  )
}

function ActiveStepLabel({ label }: { label: string }) {
  const startedAtRef = useRef<number>(Date.now())
  const [tick, setTick] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true

  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => setTick((t) => (t + 1) % 4), 400)
    return () => clearInterval(id)
  }, [reduceMotion])

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const dotCount = reduceMotion ? 3 : Math.max(1, tick)

  return (
    <span className="italic">
      {label}
      <span className="ml-0.5 font-mono tabular-nums" aria-hidden>
        {'.'.repeat(dotCount)}
      </span>
      {elapsedSec >= 2 ? (
        <span className="ml-2 font-mono text-muted-foreground/55 tabular-nums" aria-hidden>
          {formatElapsed(elapsedSec)}
        </span>
      ) : null}
    </span>
  )
}

export function AgentTraceLive({ steps }: { steps: TraceStep[] }) {
  if (steps.length === 0) return null
  return (
    <ol
      role="status"
      aria-label="Agent activity"
      className="flex flex-col gap-1.5 py-1 text-xs text-muted-foreground"
    >
      {steps.map((s) => (
        <li key={s.id} className="flex items-center gap-2.5">
          <StepGlyph status={s.status} />
          {s.status === 'active' ? <ActiveStepLabel label={s.label} /> : <span>{s.label}</span>}
        </li>
      ))}
    </ol>
  )
}

export function AgentTraceDisclosure({
  steps,
  elapsedSec,
}: {
  steps: TraceStep[]
  elapsedSec: number | null
}) {
  const [open, setOpen] = useState(false)
  if (steps.length === 0) return null

  const summary = `Ran ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}${
    elapsedSec != null && elapsedSec > 0 ? ` · ${formatElapsed(elapsedSec)}` : ''
  }`

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="-my-3.5 flex w-fit cursor-pointer items-center gap-1 py-3.5 text-xs text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 transition-transform duration-200 motion-reduce:transition-none',
            open && 'rotate-90',
          )}
          aria-hidden
        />
        <span>{summary}</span>
      </button>
      {open ? (
        <ol
          aria-label="Steps the agent ran"
          className="mt-2.5 flex flex-col gap-1.5 border-l border-border pl-3 text-xs text-muted-foreground duration-200 animate-in fade-in motion-reduce:animate-none"
        >
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <StepGlyph status={s.status} />
              <span>{s.label}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
