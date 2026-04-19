'use client'

import { cn } from '@/lib/utils'
import type { ChatMessageDto } from '@gm-ai/types'
import { FeedbackButtons } from './feedback-buttons'

type Props = {
  message: ChatMessageDto
  pending?: boolean
}

export function ChatMessage({ message, pending }: Props) {
  const isUser = message.role === 'user'

  return (
    <article
      aria-label={isUser ? 'Your message' : 'Assistant message'}
      aria-busy={pending ? 'true' : undefined}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('flex max-w-[85%] flex-col gap-1')}>
        <div
          className={cn(
            'rounded-lg px-4 py-2.5 text-sm',
            isUser
              ? 'bg-secondary text-secondary-foreground'
              : 'bg-muted text-foreground',
          )}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          {pending ? (
            <div className="mt-1 text-xs text-muted-foreground">sending…</div>
          ) : null}
        </div>
        {!isUser && !pending ? <FeedbackButtons messageId={message.id} /> : null}
      </div>
    </article>
  )
}
