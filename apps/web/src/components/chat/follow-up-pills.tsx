'use client'

import { useState } from 'react'

type Props = {
  followUps: string[] | undefined
  onSelect: (question: string) => void | Promise<void>
  disabled?: boolean
}

export function FollowUpPills({ followUps, onSelect, disabled }: Props) {
  const [picked, setPicked] = useState<string | null>(null)

  if (!followUps || followUps.length === 0) return null

  const handle = async (q: string) => {
    if (picked || disabled) return
    setPicked(q)
    try {
      await onSelect(q)
    } finally {
      setPicked(null)
    }
  }

  return (
    <section
      aria-label="Suggested follow-ups"
      className="mt-2 flex flex-col border-t border-[var(--hairline-soft)] pt-1 duration-300 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
    >
      {followUps.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled || Boolean(picked)}
          onClick={() => handle(q)}
          className="group flex min-h-11 w-full cursor-pointer items-center gap-[11px] py-[11px] text-left text-[14px] leading-[1.3] text-[var(--ink-muted)] transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden className="size-1 shrink-0 rotate-45 bg-[var(--brass)]" />
          <span className="flex-1">{q}</span>
        </button>
      ))}
    </section>
  )
}
