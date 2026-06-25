'use client'

import { ArrowUp, FileText, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// An animated recreation of the in-app chat surface, used as the hero artifact.
// It is not the live app — it's a faithful mock that plays one real exchange on
// a loop: the operator's question types into the composer, sends, the assistant
// "thinks", then streams back the grounded answer with its stat block and
// citation. Mirrors the warm card so the landing page shows the product shape,
// not a generic illustration.
const QUESTION = 'What was my GP last night, and what should I price up?'

// Reveal timeline. Each stage unlocks the next block of the answer; the gaps
// between them are what make it read as a live, streaming reply rather than a
// static screenshot. Stage 7 is the hold before the loop restarts.
const STAGE = {
  reset: 0,
  sent: 1,
  thinking: 2,
  para1: 3,
  tiles: 4,
  para2: 5,
  citation: 6,
} as const

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

function Reveal({
  show,
  delay = 0,
  className,
  children,
}: {
  show: boolean
  delay?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{ transitionDelay: show ? `${delay}ms` : '0ms' }}
      className={cn(
        'transition-all duration-500 ease-out',
        show ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-1.5 opacity-0 blur-[2px]',
        className,
      )}
    >
      {children}
    </div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-muted-foreground/70"
          style={{ animationDelay: `${i * 180}ms`, animationDuration: '900ms' }}
        />
      ))}
    </span>
  )
}

function StatTile({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tracking-tight tabular-nums">{value}</span>
        {delta ? (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--chart-1)]">
            <TrendingUp className="size-3" />
            {delta}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function ChatPreview({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion()
  const [stage, setStage] = useState<number>(STAGE.citation)
  const [typed, setTyped] = useState(0)

  useEffect(() => {
    // Reduced motion (or SSR fallback): show the finished conversation, no loop.
    if (reduced) {
      setStage(STAGE.citation)
      setTyped(QUESTION.length)
      return
    }

    let cancelled = false
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          timers.delete(t)
          resolve()
        }, ms)
        timers.add(t)
      })

    async function play() {
      // The SSR/first paint already shows the finished answer, so hold on it
      // once before restarting — otherwise it blanks and retypes on hydration.
      let first = true
      while (!cancelled) {
        if (first) {
          first = false
          await wait(4600)
        }
        setStage(STAGE.reset)
        setTyped(0)
        await wait(700)

        // Type the question into the composer, character by character.
        for (let i = 1; i <= QUESTION.length; i++) {
          if (cancelled) return
          setTyped(i)
          await wait(26)
        }
        await wait(380)

        if (cancelled) return
        setStage(STAGE.sent)
        await wait(520)
        setStage(STAGE.thinking)
        await wait(1150)
        setStage(STAGE.para1)
        await wait(720)
        setStage(STAGE.tiles)
        await wait(760)
        setStage(STAGE.para2)
        await wait(720)
        setStage(STAGE.citation)
        await wait(4600)
      }
    }

    play()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [reduced])

  const composing = stage === STAGE.reset

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-foreground/[0.06]',
        className,
      )}
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground">
            G
          </span>
          <span className="text-sm font-medium">Beer Hall · today</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
          <span className="size-1.5 rounded-full bg-[var(--chart-1)]" aria-hidden />
          Square connected
        </span>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {/* User question */}
        <Reveal show={stage >= STAGE.sent} className="flex justify-end">
          <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
            {QUESTION}
          </p>
        </Reveal>

        {/* Assistant reply */}
        <Reveal show={stage >= STAGE.thinking} className="flex gap-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[12px] font-bold text-primary-foreground">
            G
          </span>
          <div className="relative min-w-0 flex-1 space-y-3">
            {/* Thinking indicator sits over the first line, so revealing the
                answer doesn't shift the card height. */}
            <Reveal show={stage === STAGE.thinking} className="absolute left-0 top-0.5">
              <TypingDots />
            </Reveal>

            <Reveal show={stage >= STAGE.para1}>
              <p className="text-sm leading-relaxed text-foreground">
                Last night you did <strong className="font-semibold">£3,612</strong> in wet sales at
                a <strong className="font-semibold">74% gross margin</strong>, two points above your
                70% target.
              </p>
            </Reveal>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sales', value: '£3,612' },
                { label: 'GP', value: '74%', delta: '+2pt' },
                { label: 'Labour', value: '22%' },
              ].map((tile, i) => (
                <Reveal key={tile.label} show={stage >= STAGE.tiles} delay={i * 90}>
                  <StatTile {...tile} />
                </Reveal>
              ))}
            </div>

            <Reveal show={stage >= STAGE.para2}>
              <p className="text-sm leading-relaxed text-foreground">
                The <strong className="font-semibold">Lune Pale (pint)</strong> is selling 18% under
                the local market rate. A 30p rise still keeps you competitive and adds ~£40/night at
                current volume.
              </p>
            </Reveal>

            <Reveal show={stage >= STAGE.citation}>
              <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
                <FileText className="size-3.5" />
                Cited from{' '}
                <span className="font-medium text-foreground">Pricing ladder · wet sales</span>
              </div>
            </Reveal>
          </div>
        </Reveal>
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <span className="flex-1 truncate text-sm">
            {composing && typed > 0 ? (
              <span className="text-foreground">
                {QUESTION.slice(0, typed)}
                <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground/70 align-middle" />
              </span>
            ) : (
              <span className="text-muted-foreground">Ask about tonight’s shift…</span>
            )}
          </span>
          <span
            className={cn(
              'flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-300',
              stage === STAGE.sent && 'scale-90',
            )}
          >
            <ArrowUp className="size-4" />
          </span>
        </div>
      </div>
    </div>
  )
}
