'use client'

import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { FeedbackKind } from '@gm-ai/types'
import { Button } from '@/components/ui/button'
import { useFeedback } from '@/lib/hooks/use-feedback'

export function FeedbackButtons({ messageId }: { messageId: string }) {
  const [selected, setSelected] = useState<FeedbackKind | null>(null)
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
        className={selected === 'up' ? 'bg-accent text-accent-foreground' : ''}
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
        className={selected === 'down' ? 'bg-accent text-accent-foreground' : ''}
      >
        <ThumbsDown />
      </Button>
    </div>
  )
}
