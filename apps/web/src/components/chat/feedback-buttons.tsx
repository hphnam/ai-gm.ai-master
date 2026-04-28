'use client'

import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { CaptureFeedbackInputDtoKind as FeedbackKind } from '@/generated/api'
import { Button } from '@/components/ui/button'
import { useFeedback } from '@/lib/hooks/use-feedback'

export function FeedbackButtons({
  messageId,
  initial = null,
}: {
  messageId: string
  initial?: FeedbackKind | null
}) {
  const [selected, setSelected] = useState<FeedbackKind | null>(initial)
  const feedback = useFeedback()

  const onClick = (kind: FeedbackKind) => {
    const previous = selected
    setSelected(kind)
    feedback.mutate(
      { messageId, kind },
      {
        onError: () => setSelected(previous),
      },
    )
  }

  const isPending = feedback.isPending

  return (
    <div className="mt-1 flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Mark response as helpful"
        aria-pressed={selected === 'up'}
        disabled={isPending}
        onClick={() => onClick('up')}
        className={
          selected === 'up'
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700'
            : ''
        }
      >
        <ThumbsUp />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Mark response as unhelpful"
        aria-pressed={selected === 'down'}
        disabled={isPending}
        onClick={() => onClick('down')}
        className={
          selected === 'down'
            ? 'bg-rose-100 text-rose-700 hover:bg-rose-100 hover:text-rose-700'
            : ''
        }
      >
        <ThumbsDown />
      </Button>
    </div>
  )
}
