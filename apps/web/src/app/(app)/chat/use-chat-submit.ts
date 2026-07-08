'use client'

import type { UseChatHelpers } from '@ai-sdk/react'
import type { QueryClient as RqClient } from '@tanstack/react-query'
import type { UIMessage } from 'ai'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { API_URL } from '@/lib/api-client'
import type { useOnTurnSuggestions } from '@/lib/hooks/use-suggestions'
import { mapApiError } from '@/lib/map-api-error'
import type { RecordOptimisticThread } from './use-optimistic-threads'

export function useChatSubmit({
  venueIdRef,
  convIdRef,
  setPendingUserTexts,
  recordOptimisticThread,
  turnSuggestions,
  sendMessage,
  queryClient,
}: {
  venueIdRef: React.RefObject<string | null>
  convIdRef: React.RefObject<string | null>
  setPendingUserTexts: React.Dispatch<React.SetStateAction<string[]>>
  recordOptimisticThread: RecordOptimisticThread
  turnSuggestions: ReturnType<typeof useOnTurnSuggestions>
  sendMessage: UseChatHelpers<UIMessage>['sendMessage']
  queryClient: RqClient
}) {
  // Depend on the stable mutateAsync, not the mutation object: React Query
  // returns a fresh result object every render, and ChatCore re-renders on
  // every streaming token — depending on the object would make `submit`
  // unstable per token and defeat the memo on settled chat messages.
  const { mutateAsync: runTurnSuggestions } = turnSuggestions

  const submit = useCallback(
    async (text: string) => {
      const venue = venueIdRef.current
      const conv = convIdRef.current
      if (!venue) {
        toast.error('Pick a venue for this chat first.')
        return
      }
      if (!conv) {
        toast.error('No conversation is open — try again.')
        return
      }

      // 1. Show the user's message on the very next paint.
      setPendingUserTexts((prev) => [...prev, text])

      // 2. Sidebar: prepend a fresh row or bump an existing one.
      recordOptimisticThread(conv, venue, text)

      // 3. Fire proactive suggestions in parallel with the send.
      runTurnSuggestions({
        venueId: venue,
        userMessage: text,
        conversationId: conv,
      }).catch(() => undefined)

      // 4. Stream.
      await sendMessage({ text })
    },
    [
      recordOptimisticThread,
      sendMessage,
      runTurnSuggestions,
      setPendingUserTexts,
      venueIdRef,
      convIdRef,
    ],
  )

  // Phase G1 — image-attached send. Bypasses useChat (which doesn't support
  // multipart) and POSTs to /chat/messages/with-image, then invalidates the
  // conversation query so the new turn appears.
  const submitWithImage = useCallback(
    async (text: string, file: File) => {
      const venue = venueIdRef.current
      const conv = convIdRef.current
      if (!venue) {
        toast.error('Pick a venue for this chat first.')
        return
      }
      if (!conv) {
        toast.error('No conversation is open — try again.')
        return
      }
      const previewText = text.trim().length > 0 ? text : '[image attached]'
      setPendingUserTexts((prev) => [...prev, previewText])

      recordOptimisticThread(conv, venue, previewText)

      try {
        const form = new FormData()
        form.append('image', file)
        form.append('venueId', venue)
        form.append('userMessage', text)
        form.append('conversationId', conv)
        const res = await fetch(`${API_URL}/chat/messages/with-image`, {
          method: 'POST',
          credentials: 'include',
          body: form,
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `HTTP ${res.status}`)
        }
        await queryClient.invalidateQueries({
          queryKey: ['conversation', conv, venue],
        })
        await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
      } catch (err) {
        toast.error(mapApiError(err))
        setPendingUserTexts((prev) => prev.filter((t) => t !== previewText))
      }
    },
    [recordOptimisticThread, queryClient, setPendingUserTexts, venueIdRef, convIdRef],
  )

  return { submit, submitWithImage }
}
