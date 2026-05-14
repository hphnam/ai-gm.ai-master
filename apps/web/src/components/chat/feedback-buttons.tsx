'use client'

import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CaptureFeedbackInputDtoKind as FeedbackKind } from '@/generated/api'
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
          selected === 'up' ? 'bg-foreground/10 text-foreground hover:bg-foreground/10' : ''
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
          selected === 'down' ? 'bg-foreground/10 text-foreground hover:bg-foreground/10' : ''
        }
      >
        <ThumbsDown />
      </Button>
    </div>
  )
}
