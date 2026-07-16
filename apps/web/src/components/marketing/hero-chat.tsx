'use client'

import { useEffect, useRef, useState } from 'react'
import { CitationChip } from './primitives'

type Phase = 'typing' | 'thinking' | 'answer'

const QUESTIONS = [
  'What did I spend on staff last night?',
  'Which beer could I put the price up on?',
  'How do I clean a beer line?',
]

// The hero centrepiece: a looping ask → think → cited-answer sequence driven by
// a small state machine. Timers are cleared on unmount; prefers-reduced-motion
// skips straight to the first answer and never animates.
export function HeroChat({
  autoplay = true,
  currency = '£',
}: {
  autoplay?: boolean
  currency?: string
}) {
  const [qi, setQi] = useState(0)
  const [typed, setTyped] = useState('')
  const [phase, setPhase] = useState<Phase>('typing')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!autoplay || reduced) {
      setQi(0)
      setTyped(QUESTIONS[0])
      setPhase('answer')
      return
    }

    let alive = true
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timer.current = setTimeout(resolve, ms)
      })

    const run = async () => {
      await sleep(700)
      while (alive) {
        for (let i = 0; i < QUESTIONS.length && alive; i++) {
          setQi(i)
          setTyped('')
          setPhase('typing')
          const q = QUESTIONS[i]
          for (let n = 1; n <= q.length && alive; n++) {
            setTyped(q.slice(0, n))
            await sleep(32)
          }
          await sleep(450)
          if (!alive) return
          setPhase('thinking')
          await sleep(1150)
          if (!alive) return
          setPhase('answer')
          await sleep(5600)
        }
      }
    }
    run()

    return () => {
      alive = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [autoplay])

  const c = currency

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--ledger-card)] shadow-[0_24px_60px_-24px_rgba(32,26,18,0.35),0_2px_6px_rgba(32,26,18,0.08)]">
      {/* Dark venue header */}
      <div className="flex items-center justify-between border-b border-[var(--hairline-soft)] bg-[var(--ink-text)] px-[18px] py-[13px]">
        <div className="flex items-center gap-2.5">
          <span
            className="size-2 rounded-full bg-[#4E8C5F] shadow-[0_0_0_3px_rgba(78,140,95,0.25)]"
            aria-hidden
          />
          <span className="text-[13px] font-semibold text-[var(--cream)]">
            The Crown &amp; Anchor
          </span>
        </div>
        <span className="font-mono-ledger text-[11px] font-medium text-[var(--cream-muted)]">
          AI-GM · live on Square
        </span>
      </div>

      {/* Conversation */}
      <div className="flex min-h-[356px] flex-col gap-3.5 px-5 pb-5 pt-[22px]">
        {typed.length > 0 ? (
          <div className="max-w-[82%] self-end rounded-[12px_12px_3px_12px] bg-[var(--ink-text)] px-[15px] py-[11px] text-[14.5px] leading-[1.5] text-[#F1E9D8]">
            {typed}
            {phase === 'typing' ? (
              <span
                className="ml-0.5 inline-block h-[15px] w-2 -translate-y-px bg-[var(--brass-dark)] align-[-2px] [animation:gmCaret_0.8s_steps(1)_infinite]"
                aria-hidden
              />
            ) : null}
          </div>
        ) : null}

        {phase === 'thinking' ? (
          <div className="flex gap-1.5 px-1 pt-3">
            <span className="size-1.5 rounded-full bg-[var(--brass)] [animation:gmDot_1s_ease_infinite]" />
            <span className="size-1.5 rounded-full bg-[var(--brass)] [animation:gmDot_1s_ease_0.15s_infinite]" />
            <span className="size-1.5 rounded-full bg-[var(--brass)] [animation:gmDot_1s_ease_0.3s_infinite]" />
          </div>
        ) : null}

        {phase === 'answer' && qi === 0 ? <AnswerLabour c={c} /> : null}
        {phase === 'answer' && qi === 1 ? <AnswerPricing c={c} /> : null}
        {phase === 'answer' && qi === 2 ? <AnswerSop /> : null}
      </div>

      {/* Faux input bar */}
      <div className="mx-5 mb-[18px] flex items-center justify-between rounded-lg border border-[rgba(32,26,18,0.16)] bg-[var(--paper)] px-4 py-3">
        <span className="text-[13.5px] text-[var(--mono-muted)]">
          Ask anything about the venue…
        </span>
        <span className="grid size-[26px] place-items-center rounded-md bg-[var(--brass)] text-[13px] font-bold text-[var(--cream-hi)]">
          ↑
        </span>
      </div>
    </div>
  )
}

function AnswerShell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[94%] [animation:gmRise_0.45s_ease_both]">{children}</div>
}

function LedgerRow({
  label,
  value,
  labelColor,
  positive,
  last,
}: {
  label: string
  value: string
  labelColor?: string
  positive?: boolean
  last?: boolean
}) {
  return (
    <div
      className={`flex justify-between px-3.5 py-2.5 ${last ? '' : 'border-b border-[var(--hairline-soft)]'} ${positive ? 'bg-[rgba(47,93,61,0.08)]' : ''}`}
    >
      <span
        style={labelColor ? { color: labelColor } : undefined}
        className={labelColor ? '' : 'text-[var(--ink-muted)]'}
      >
        {label}
      </span>
      <span className={positive ? 'font-bold text-[var(--ledger-green)]' : ''}>{value}</span>
    </div>
  )
}

function AnswerLabour({ c }: { c: string }) {
  return (
    <AnswerShell>
      <p className="mb-3 text-[14.5px] leading-[1.55] text-[var(--ink-text)]">
        Staff cost last night was <strong className="font-mono-ledger font-bold">{c}684</strong> —
        26.8% of {c}2,551 net sales. That&apos;s 1.9&nbsp;pts under your Tuesday average.
      </p>
      <div className="font-mono-ledger overflow-hidden rounded-lg border border-[var(--hairline)] text-[13px] font-medium">
        <LedgerRow label="FOH · 4 on shift" value={`${c}392`} />
        <LedgerRow label="Kitchen · 2 on shift" value={`${c}292`} />
        <LedgerRow
          label="Labour : sales"
          value="26.8%"
          labelColor="var(--ledger-green)"
          positive
          last
        />
      </div>
      <CitationChip className="mt-2.5">Square POS · shifts &amp; sales, Tue 8 Jul</CitationChip>
    </AnswerShell>
  )
}

function AnswerPricing({ c }: { c: string }) {
  return (
    <AnswerShell>
      <p className="mb-3 text-[14.5px] leading-[1.55] text-[var(--ink-text)]">
        Best candidate: <strong>Anchor Pale on keg</strong>. GP is 61% against a 68% line average,
        and local market rate runs {c}6.20–6.50 versus your {c}5.80.
      </p>
      <div className="font-mono-ledger overflow-hidden rounded-lg border border-[var(--hairline)] text-[13px] font-medium">
        <LedgerRow label="Anchor Pale · pint" value={`${c}5.80 → ${c}6.10`} />
        <LedgerRow
          label="Lands at current volume"
          value={`+${c}210/mo`}
          labelColor="var(--ledger-green)"
          positive
          last
        />
      </div>
      <CitationChip className="mt-2.5">
        Square · 30-day product mix + Pricing history.xlsx
      </CitationChip>
    </AnswerShell>
  )
}

function AnswerSop() {
  return (
    <AnswerShell>
      <p className="mb-3 text-[14.5px] leading-[1.55] text-[var(--ink-text)]">
        From your cellar SOP — full clean, every 7 days:
      </p>
      <div className="overflow-hidden rounded-lg border border-[var(--hairline)] text-[13.5px] leading-[1.45]">
        {[
          'Turn off the gas, disconnect the keg coupler',
          'Flush the line with cold water until it runs clear',
        ].map((step, i) => (
          <div
            key={step}
            className="flex gap-2.5 border-b border-[var(--hairline-soft)] px-3.5 py-2.5"
          >
            <span className="font-mono-ledger font-bold text-[var(--brass)]">0{i + 1}</span>
            <span>{step}</span>
          </div>
        ))}
        <div className="flex gap-2.5 px-3.5 py-2.5">
          <span className="font-mono-ledger font-bold text-[var(--brass)]">03</span>
          <span>
            Draw cleaning solution through; stand 10 min — <em>manager sign-off required</em>
          </span>
        </div>
      </div>
      <CitationChip className="mt-2.5">Cellar SOP — line cleaning.pdf · p.2</CitationChip>
    </AnswerShell>
  )
}
