'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { VenueSelector } from '@/components/chat/venue-selector'
import { ChatThread } from '@/components/chat/chat-thread'
import { ChatComposer } from '@/components/chat/chat-composer'
import { SuggestionsSurface } from '@/components/chat/suggestions-surface'
import { useConversation } from '@/lib/hooks/use-conversation'
import { useSendMessage } from '@/lib/hooks/use-send-message'
import {
  useOnOpenSuggestions,
  useOnTurnSuggestions,
} from '@/lib/hooks/use-suggestions'
import { mapApiError } from '@/lib/map-api-error'

function ChatSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-sm text-muted-foreground">Loading…</div>
    </main>
  )
}

function ChatBody() {
  const router = useRouter()
  const params = useSearchParams()
  const queryClient = useQueryClient()

  const venueId = params.get('venue')
  const conversationId = params.get('conv')

  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null)
  const [failedText, setFailedText] = useState<string>('')
  const prevVenueIdRef = useRef<string | null>(null)

  useEffect(() => {
    const previous = prevVenueIdRef.current
    if (previous !== null && previous !== venueId) {
      queryClient.cancelQueries({ queryKey: ['conversation'] })
      queryClient.cancelQueries({ queryKey: ['suggestions'] })
      setOptimisticMessage(null)
      setFailedText('')
    }
    prevVenueIdRef.current = venueId
  }, [venueId, queryClient])

  const conversation = useConversation(conversationId, venueId)
  const openSuggestions = useOnOpenSuggestions(venueId)
  const turnSuggestions = useOnTurnSuggestions()
  const sendMessage = useSendMessage()

  if (!venueId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-2xl font-semibold">GM AI</h1>
        <p className="text-sm text-muted-foreground">
          Pick a venue to start a conversation.
        </p>
        <VenueSelector />
      </main>
    )
  }

  const messages = conversation.data?.messages ?? []
  const activeSuggestions =
    turnSuggestions.data ?? openSuggestions.data ?? undefined

  const onSubmit = async (userMessage: string) => {
    setOptimisticMessage(userMessage)
    setFailedText('')
    try {
      const [sendResult] = await Promise.all([
        sendMessage.mutateAsync({
          venueId,
          userMessage,
          conversationId: conversationId ?? undefined,
        }),
        turnSuggestions.mutateAsync({
          venueId,
          userMessage,
          conversationId: conversationId ?? undefined,
        }).catch(() => undefined),
      ])

      if (!conversationId) {
        router.replace(
          `/chat?venue=${venueId}&conv=${sendResult.conversationId}`,
        )
      }
      setOptimisticMessage(null)
    } catch (err) {
      setOptimisticMessage(null)
      setFailedText(userMessage)
      toast.error(mapApiError(err))
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between border-b pb-3">
        <h1 className="text-lg font-semibold">GM AI</h1>
        <VenueSelector />
      </header>

      <SuggestionsSurface
        suggestions={activeSuggestions}
        isLoading={openSuggestions.isLoading || turnSuggestions.isPending}
      />

      <div className="flex flex-1 flex-col overflow-y-auto rounded-md border p-4">
        <ChatThread
          messages={messages}
          optimisticUserMessage={optimisticMessage}
          pendingAssistant={sendMessage.isPending}
          isLoadingHistory={conversation.isLoading && Boolean(conversationId)}
        />
      </div>

      <ChatComposer
        onSubmit={onSubmit}
        isPending={sendMessage.isPending}
        initialValue={failedText}
      />
    </main>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatBody />
    </Suspense>
  )
}
