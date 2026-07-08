'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useInbox } from '@/components/shell/inbox-provider'
import { apiFetch } from '@/lib/api-client'

interface NoteResponse {
  notification: {
    id: string
    category: string
    author: { id: string } | null
  }
}

export function NoteRedirectBody({ id }: { id: string }) {
  const router = useRouter()
  const { openInbox } = useInbox()
  const startedRef = useRef(false)

  useEffect(() => {
    // Strict-mode double-invoke guard — the resolve + open + replace chain
    // must run exactly once. No cancellation on cleanup: the inbox provider
    // and router both outlive this page (they live in the app shell), so
    // completing after unmount is correct, and a cancel flag would eat the
    // strict-mode first run entirely.
    if (startedRef.current) return
    startedRef.current = true
    apiFetch<NoteResponse>(`/notifications/${encodeURIComponent(id)}`)
      .then(({ notification }) => {
        // Chat notes live in the conversation thread with their author;
        // everything else is a row on the Alerts tab.
        if (notification.category === 'chat' && notification.author) {
          openInbox({ kind: 'thread', otherUserId: notification.author.id })
        } else {
          openInbox({ kind: 'alert', id: notification.id })
        }
      })
      .catch(() => {
        toast.error('That note is no longer available')
      })
      .finally(() => {
        router.replace('/chat')
      })
  }, [id, openInbox, router])

  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Opening note" />
    </div>
  )
}
