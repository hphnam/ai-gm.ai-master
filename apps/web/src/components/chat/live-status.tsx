'use client'

import { useEffect, useRef, useState } from 'react'

function BrandDot() {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      <span className="absolute inset-0 rounded-full bg-foreground/30" />
      <span className="relative inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
    </span>
  )
}

/// Ephemeral status line shown WHILE the agent works. One borderless row under
/// the gm avatar with a pulsing dot, the human-readable active label, a typing
/// ellipsis, and an elapsed counter once we're past two seconds. The whole line
/// unmounts the moment the answer starts streaming, so it reads as "happening
/// now" rather than "happened" — it never persists into saved history. Respects
/// prefers-reduced-motion: the ellipsis freezes to a static three-dot and the
/// dot pulse falls back to its non-animated rest state (BrandDot uses Tailwind's
/// animate-pulse, which the reduced-motion media query disables at the OS level).
///
/// Implementation note: the elapsed timer starts on mount and the ellipsis
/// cycles on a 400ms JS interval, but we use `useRef` for the start time so
/// React state churn doesn't reset it when the parent re-renders for unrelated
/// streaming deltas. The label prop changes as the agent moves between tools
/// mid-chain — that's a content swap on the same line, not a remount, so the
/// timer keeps running across the whole chain rather than resetting per tool.
export function LiveStatusLine({ label }: { label: string }) {
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

  // Fixed-width three-character slot so the label text doesn't shift left/right
  // as the dot count changes. We use regular spaces here; the consumer renders
  // them inside `font-mono tabular-nums` so width stays predictable enough at
  // 13px display sizes, but accept that HTML collapses runs of spaces so the
  // visual is "label . / .. / ..." not three padded widths. Acceptable since
  // the trailing right-aligned elapsed counter has its own ml-auto anchor.
  const dotCount = reduceMotion ? 3 : Math.max(1, tick)
  const dotsText = '.'.repeat(dotCount) + ' '.repeat(3 - dotCount)
  const showElapsed = elapsedSec >= 2
  const elapsedText =
    elapsedSec < 60 ? `${elapsedSec}s` : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`

  // role="status" rather than aria-live: the parent <ol role="log"> in
  // chat-thread already declares a polite live region for the whole assistant
  // stream, so nesting another one risks double-announcement on some screen
  // readers. role="status" still surfaces this as a status node. The elapsed
  // timer span is aria-hidden so its per-second tick doesn't re-announce the
  // full row each second — the label is the only thing worth announcing.
  return (
    <div className="flex items-center gap-2.5 py-1 text-[13px] text-muted-foreground" role="status">
      <BrandDot />
      <span className="italic">
        {label}
        <span className="ml-0.5 font-mono tabular-nums" aria-hidden>
          {dotsText}
        </span>
      </span>
      {showElapsed ? (
        <span
          className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground/55"
          aria-hidden
        >
          {elapsedText}
        </span>
      ) : null}
    </div>
  )
}
