'use client'

import { useEffect, useState } from 'react'
import type { Recipient } from '@/lib/hooks/use-notifications'
import { ConversationThread } from './conversation-thread'
import { ConversationsList } from './conversations-list'
import { NewConversationPicker } from './new-conversation-picker'

type ConversationsMode =
  | { kind: 'list' }
  | { kind: 'thread'; otherUserId: string; otherParty: { name: string | null; email: string } }
  | { kind: 'new' }

export function ConversationsView({ initialOtherUserId }: { initialOtherUserId?: string | null }) {
  const [mode, setMode] = useState<ConversationsMode>(
    initialOtherUserId
      ? // The deep-link payload doesn't carry name/email — render with "Loading…"
        // until the messages endpoint returns otherParty. The header still shows
        // a recognisable structure so the open isn't jarring.
        { kind: 'thread', otherUserId: initialOtherUserId, otherParty: { name: null, email: '' } }
      : { kind: 'list' },
  )

  // A deep link can land while the view is already mounted (sheet sitting
  // open on the list) — the initializer above only covers fresh mounts.
  useEffect(() => {
    if (initialOtherUserId) {
      setMode({
        kind: 'thread',
        otherUserId: initialOtherUserId,
        otherParty: { name: null, email: '' },
      })
    }
  }, [initialOtherUserId])

  if (mode.kind === 'list') {
    return (
      <ConversationsList
        onOpenThread={(c) =>
          setMode({
            kind: 'thread',
            otherUserId: c.otherParty.id,
            otherParty: { name: c.otherParty.name, email: c.otherParty.email },
          })
        }
        onNewConversation={() => setMode({ kind: 'new' })}
      />
    )
  }
  if (mode.kind === 'new') {
    return (
      <NewConversationPicker
        onBack={() => setMode({ kind: 'list' })}
        onPick={(r: Recipient) =>
          setMode({
            kind: 'thread',
            otherUserId: r.userId,
            otherParty: { name: r.name, email: r.email },
          })
        }
      />
    )
  }
  return (
    <ConversationThread
      otherUserId={mode.otherUserId}
      seedParty={mode.otherParty}
      onBack={() => setMode({ kind: 'list' })}
    />
  )
}
