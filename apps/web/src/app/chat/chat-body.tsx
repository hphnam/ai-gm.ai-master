'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { VenueSelector } from '@/components/chat/venue-selector'
import { ChatThread } from '@/components/chat/chat-thread'
import { ChatComposer } from '@/components/chat/chat-composer'
import { SuggestionsSurface } from '@/components/chat/suggestions-surface'
import { UserMenu } from '@/components/auth/user-menu'
import { useConversation } from '@/lib/hooks/use-conversation'
import { useConversationsList } from '@/lib/hooks/use-conversations-list'
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

function ChatInner() {
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
  const conversationsList = useConversationsList(venueId)
  const openSuggestions = useOnOpenSuggestions(venueId)
  const turnSuggestions = useOnTurnSuggestions()
  const sendMessage = useSendMessage()

  // On mount with a venue but no explicit conv, resume the latest conversation
  // for this user+venue. URL is source of truth — we just rewrite it.
  useEffect(() => {
    if (!venueId || conversationId) return
    const latest = conversationsList.data?.[0]
    if (latest) {
      router.replace(`/chat?venue=${venueId}&conv=${latest.id}`)
    }
  }, [venueId, conversationId, conversationsList.data, router])

  if (!venueId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-4">
        <header className="flex items-center justify-between border-b pb-3">
          <h1 className="text-lg font-semibold">GM AI</h1>
          <div className="flex items-center gap-3">
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
              Docs
            </Link>
            <UserMenu />
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Pick a venue to start a conversation.
          </p>
          <VenueSelector />
          <p className="text-xs text-muted-foreground max-w-sm">
            No venues listed? Ask your manager to add you to one of their venues.
          </p>
        </div>
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
        <div className="flex items-center gap-3">
          <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
            Docs
          </Link>
          <VenueSelector />
          <UserMenu />
        </div>
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

export function ChatBody() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatInner />
    </Suspense>
  )
}
