'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

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
    <section aria-label="Suggested follow-ups" className="mt-2 flex flex-wrap gap-2">
      {followUps.map((q) => (
        <Button
          key={q}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || Boolean(picked)}
          onClick={() => handle(q)}
          className="h-auto whitespace-normal rounded-full px-3 py-1.5 text-left text-xs font-normal"
        >
          {q}
        </Button>
      ))}
    </section>
  )
}
