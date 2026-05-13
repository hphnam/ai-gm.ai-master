'use client'

import { useChat } from '@ai-sdk/react'
import { type QueryClient as RqClient, useQueryClient } from '@tanstack/react-query'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Check, Link2, Loader2, Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChatComposer } from '@/components/chat/chat-composer'
import { ChatThread } from '@/components/chat/chat-thread'
import { SuggestionsSurface } from '@/components/chat/suggestions-surface'
import { VenueStrip } from '@/components/chat/venue-strip'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import type { ConversationResponseDto as ConversationResponse } from '@/generated/api'
import { API_URL } from '@/lib/api-client'
import type { ChatMessageDto } from '@/lib/api-types'
import { useSession } from '@/lib/auth-client'
import { useConversation } from '@/lib/hooks/use-conversation'
import { type ConvListItem, useConversationsList } from '@/lib/hooks/use-conversations-list'
import { useOnOpenSuggestions, useOnTurnSuggestions } from '@/lib/hooks/use-suggestions'
import { useUpdateConversationVisibility } from '@/lib/hooks/use-update-conversation-visibility'
import { useVenues } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'
import { isMinted, markMinted } from '@/lib/minted-conv-ids'
import { cn } from '@/lib/utils'

type GmUIMessage = UIMessage

type LegacyToolCallEntry = {
  round?: number
  toolUseId?: string
  tool?: string
  input?: unknown
  result?: unknown
}

// Legacy assistant rows (pre-agentic path) stored text-only `content` with a
// flat `toolCallLog` JSON array. No `parts` snapshot, no reasoning. Synthesise
// tool-call UI parts from the log so old turns still render tool chips on
// replay — otherwise the thread loses all visible tool history.
function legacyPartsFromDto(m: ChatMessageDto): GmUIMessage['parts'] {
  const parts: GmUIMessage['parts'] = []
  const log = (m as unknown as { toolCallLog?: LegacyToolCallEntry[] }).toolCallLog
  if (Array.isArray(log)) {
    for (const entry of log) {
      if (!entry?.tool || !entry?.toolUseId) continue
      parts.push({
        type: `tool-${entry.tool}`,
        toolCallId: entry.toolUseId,
        state: 'output-available',
        input: entry.input,
        output: entry.result,
      } as unknown as GmUIMessage['parts'][number])
    }
  }
  parts.push({ type: 'text', text: m.content })
  return parts
}

function dbToUIMessage(m: ChatMessageDto): GmUIMessage {
  // Prefer the persisted `parts` snapshot if the server stored it (assistant
  // turns from the agentic path carry reasoning + tool-call chips).
  if (m.role === 'assistant' && m.parts) {
    const parts = m.parts as GmUIMessage['parts']
    if (Array.isArray(parts) && parts.length > 0) {
      return { id: m.id, role: m.role, parts }
    }
  }
  // Assistant fall-through: legacy row with no parts JSON — rebuild from
  // toolCallLog + content so tool chips still appear.
  if (m.role === 'assistant') {
    return { id: m.id, role: m.role, parts: legacyPartsFromDto(m) }
  }
  return {
    id: m.id,
    role: m.role,
    parts: [{ type: 'text', text: m.content }],
  }
}

function uiMessageToText(m: GmUIMessage): string {
  return m.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('')
    .trim()
}

function ChatSkeleton() {
  return (
    <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  )
}

function prependOptimisticThread(qc: RqClient, entry: ConvListItem) {
  qc.setQueryData<ConvListItem[]>(['chat-conversations', '__all__'], (prev) => {
    const base = prev ?? []
    if (base.some((c) => c.id === entry.id)) return base
    return [entry, ...base]
  })
}

function bumpOptimisticThread(qc: RqClient, conversationId: string, preview: string) {
  qc.setQueryData<ConvListItem[]>(['chat-conversations', '__all__'], (prev) => {
    if (!prev) return prev
    return prev.map((c) =>
      c.id === conversationId ? { ...c, preview, lastMessageAt: new Date().toISOString() } : c,
    )
  })
}

function ChatInner() {
  const params = useSearchParams()
  const queryClient = useQueryClient()
  const router = useRouter()

  const venueId = params.get('venue')
  const conversationId = params.get('conv')
  const conversationsList = useConversationsList(null)

  // Landing on /chat (no conv):
  //   • no venue in the URL → drop into the most recent thread (handy for a
  //     fresh tab — same as hitting the top chat in the sidebar).
  //   • venue pinned in the URL → mint a fresh chat for that venue. Do NOT
  //     surface an old thread behind the user's back; resuming is a sidebar
  //     action, not a side-effect of visiting a venue URL.
  useEffect(() => {
    if (conversationId) return
    if (!conversationsList.data) return
    if (venueId) {
      const freshId = crypto.randomUUID()
      markMinted(freshId)
      router.replace(`/chat?venue=${venueId}&conv=${freshId}`)
      return
    }
    const latest = conversationsList.data[0]
    if (latest) {
      router.replace(`/chat?venue=${latest.venueId}&conv=${latest.id}`)
    }
  }, [venueId, conversationId, conversationsList.data, router])

  return (
    <AppShell>
      <ChatSession
        key={conversationId ?? 'landing'}
        venueId={venueId}
        conversationId={conversationId}
        queryClient={queryClient}
      />
    </AppShell>
  )
}

function ChatSession({
  venueId,
  conversationId,
  queryClient,
}: {
  venueId: string | null
  conversationId: string | null
  queryClient: RqClient
}) {
  // If conversationId is set and venue missing, we still query (the endpoint
  // requires venueId). If the ID was minted client-side this session
  // (auto-resume fall-through, sidebar "New chat"), skip the GET entirely —
  // the server hasn't seen it yet and the hook would just 404 into an empty
  // shell, flashing "Loading conversation…" on the way.
  const skipFetch = isMinted(conversationId)
  const conversation = useConversation(conversationId, venueId ?? '', {
    enabled: !skipFetch,
  })
  const openSuggestions = useOnOpenSuggestions(venueId)
  const turnSuggestions = useOnTurnSuggestions()

  const historyMessages = conversation.data?.messages
  const initialMessages = useMemo<GmUIMessage[]>(
    () => (historyMessages ? historyMessages.map(dbToUIMessage) : []),
    [historyMessages],
  )

  // Wait for the server fetch to settle before mounting the chat, so we don't
  // flash an empty state for an existing thread. Locally-minted IDs don't
  // fetch — settle immediately.
  const fetchSettled =
    !conversationId || skipFetch || conversation.isSuccess || conversation.isError
  if (conversationId && !fetchSettled) {
    return (
      <>
        <PageHeader title="Chat" />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading conversation…
        </div>
      </>
    )
  }

  return (
    <ChatCore
      venueId={venueId}
      conversationId={conversationId}
      initialMessages={initialMessages}
      historyMessages={historyMessages}
      ownerUserId={conversation.data?.userId ?? null}
      visibility={conversation.data?.visibility ?? null}
      queryClient={queryClient}
      openSuggestions={openSuggestions.data}
      turnSuggestions={turnSuggestions}
    />
  )
}

function ChatCore({
  venueId,
  conversationId,
  initialMessages,
  historyMessages,
  ownerUserId,
  visibility,
  queryClient,
  openSuggestions,
  turnSuggestions,
}: {
  venueId: string | null
  conversationId: string | null
  initialMessages: GmUIMessage[]
  historyMessages: ConversationResponse['messages'] | undefined
  /// null when the conversation row hasn't been created yet (locally-minted
  /// UUID before first send) OR when it's a legacy WhatsApp thread with no
  /// human owner. Both cases hide the Share button.
  ownerUserId: string | null
  /// null until the row exists. After that: 'private' (default) or 'org'.
  visibility: 'private' | 'org' | null
  queryClient: RqClient
  openSuggestions: ReturnType<typeof useOnOpenSuggestions>['data']
  turnSuggestions: ReturnType<typeof useOnTurnSuggestions>
}) {
  const router = useRouter()
  const { data: venues } = useVenues()
  const _conversationsList = useConversationsList(null)
  const { data: session } = useSession()
  const sessionUserId = session?.user?.id ?? null

  // Owner test: a fresh chat with no row yet (ownerUserId === null AND
  // visibility === null) is implicitly owned by the current user — they're
  // about to create it. Once the row exists, ownership is the userId on the
  // row. Legacy WhatsApp threads (ownerUserId === null but visibility set)
  // have no human owner and stay read-only on web.
  const conversationExists = visibility !== null
  const isOwner = !conversationExists ? true : ownerUserId !== null && ownerUserId === sessionUserId
  const updateVisibility = useUpdateConversationVisibility()

  // The transport closure captures these via refs — useChat freezes the
  // transport at construction.
  const convIdRef = useRef<string | null>(conversationId)
  useEffect(() => {
    convIdRef.current = conversationId
  }, [conversationId])

  const venueIdRef = useRef<string | null>(venueId)
  useEffect(() => {
    venueIdRef.current = venueId
  }, [venueId])

  // Local optimistic user messages — render the moment the user hits enter,
  // regardless of useChat's internal timing.
  const [pendingUserTexts, setPendingUserTexts] = useState<string[]>([])

  const transport = useMemo(
    () =>
      new DefaultChatTransport<GmUIMessage>({
        api: `${API_URL}/chat/stream`,
        credentials: 'include',
        prepareSendMessagesRequest: ({ messages }) => {
          const last = messages[messages.length - 1]
          const userMessage =
            last?.parts
              .map((p) => (p.type === 'text' ? p.text : ''))
              .join('')
              .trim() ?? ''
          return {
            body: {
              venueId: venueIdRef.current,
              userMessage,
              conversationId: convIdRef.current ?? undefined,
            },
          }
        },
      }),
    [],
  )

  const { messages, sendMessage, status, error, regenerate } = useChat<GmUIMessage>({
    id: conversationId ?? undefined,
    messages: initialMessages,
    transport,
    onFinish: ({ messages: allMessages }) => {
      const cid = convIdRef.current
      const venue = venueIdRef.current
      if (cid && venue) {
        const seeded: ConversationResponse = {
          id: cid,
          venueId: venue,
          userId: sessionUserId,
          channel: 'web',
          visibility: 'private',
          messages: allMessages.map((m) => ({
            id: m.id,
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: uiMessageToText(m),
            createdAt: new Date().toISOString(),
            retrievedItemIds: [],
            followUps: [],
          })),
        }
        queryClient.setQueryData(['conversation', cid, venue], seeded)
        // Refetch the conversation so server-generated followUps (produced
        // post-stream by Haiku) replace the empty seed and the pills appear.
        queryClient.invalidateQueries({ queryKey: ['conversation', cid, venue] })
      }
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
    },
    onError: (err) => {
      toast.error(mapApiError(err))
    },
  })

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

      // 2. Sidebar: first message → prepend a new row at the conv UUID (server
      //    will upsert with the same id). Subsequent messages → bump + preview.
      const list = queryClient.getQueryData<ConvListItem[]>(['chat-conversations', '__all__'])
      const existsInSidebar = list?.some((c) => c.id === conv)
      const preview = text.length > 80 ? `${text.slice(0, 79)}…` : text
      if (!existsInSidebar) {
        const venueName = venues?.find((v) => v.id === venue)?.name ?? '—'
        prependOptimisticThread(queryClient, {
          id: conv,
          venueId: venue,
          venueName,
          lastMessageAt: new Date().toISOString(),
          preview,
        })
      } else {
        bumpOptimisticThread(queryClient, conv, preview)
      }

      // 3. Fire proactive suggestions in parallel with the send.
      turnSuggestions
        .mutateAsync({
          venueId: venue,
          userMessage: text,
          conversationId: conv,
        })
        .catch(() => undefined)

      // 4. Stream.
      await sendMessage({ text })
    },
    [sendMessage, turnSuggestions, queryClient, venues],
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

      const list = queryClient.getQueryData<ConvListItem[]>(['chat-conversations', '__all__'])
      const existsInSidebar = list?.some((c) => c.id === conv)
      const preview = previewText.length > 80 ? `${previewText.slice(0, 79)}…` : previewText
      if (!existsInSidebar) {
        const venueName = venues?.find((v) => v.id === venue)?.name ?? '—'
        prependOptimisticThread(queryClient, {
          id: conv,
          venueId: venue,
          venueName,
          lastMessageAt: new Date().toISOString(),
          preview,
        })
      } else {
        bumpOptimisticThread(queryClient, conv, preview)
      }

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
    [queryClient, venues],
  )

  const lastAssistantFollowUps = useMemo<string[]>(() => {
    if (!historyMessages) return []
    if (status !== 'ready') return []
    for (let i = historyMessages.length - 1; i >= 0; i--) {
      const m = historyMessages[i]
      if (m.role === 'assistant') return m.followUps ?? []
    }
    return []
  }, [historyMessages, status])

  // Persisted feedback indexed by assistant messageId — seeds the thumbs
  // buttons so a thumbs-up survives a refresh.
  const feedbackByMessageId = useMemo<Record<string, 'up' | 'down' | 'regenerate'>>(() => {
    if (!historyMessages) return {}
    const map: Record<string, 'up' | 'down' | 'regenerate'> = {}
    for (const m of historyMessages) {
      if (m.role === 'assistant' && m.feedbackKind) {
        map[m.id] = m.feedbackKind
      }
    }
    return map
  }, [historyMessages])

  // Merge pending-user with useChat messages, deduping by text.
  const displayMessages = useMemo<GmUIMessage[]>(() => {
    if (pendingUserTexts.length === 0) return messages
    const seen = new Set(
      messages
        .filter((m) => m.role === 'user')
        .map((m) =>
          m.parts
            .map((p) => (p.type === 'text' ? p.text : ''))
            .join('')
            .trim(),
        ),
    )
    const pending = pendingUserTexts.filter((t) => !seen.has(t.trim()))
    if (pending.length === 0) return messages
    return [
      ...messages,
      ...pending.map<GmUIMessage>((t, i) => ({
        id: `pending-${i}-${t.slice(0, 16)}`,
        role: 'user',
        parts: [{ type: 'text', text: t }],
      })),
    ]
  }, [messages, pendingUserTexts])

  useEffect(() => {
    if (pendingUserTexts.length === 0) return
    const userTexts = new Set(
      messages
        .filter((m) => m.role === 'user')
        .map((m) =>
          m.parts
            .map((p) => (p.type === 'text' ? p.text : ''))
            .join('')
            .trim(),
        ),
    )
    setPendingUserTexts((prev) => prev.filter((t) => !userTexts.has(t.trim())))
  }, [messages, pendingUserTexts.length])

  const activeSuggestions = turnSuggestions.data ?? openSuggestions ?? undefined
  const isPending = status === 'submitted' || status === 'streaming' || pendingUserTexts.length > 0
  const isEmpty = displayMessages.length === 0

  const onPickVenue = (id: string) => {
    // Venue picker changes the context of the current chat; it does NOT resume
    // an unrelated old thread. To jump into an existing thread, use the
    // sidebar.
    //   • Current conv is a still-blank client mint → rebind its venue.
    //   • Otherwise → start a fresh chat for this venue.
    const current = convIdRef.current
    const currentIsBlankMint =
      current &&
      isMinted(current) &&
      (historyMessages?.length ?? 0) === 0 &&
      pendingUserTexts.length === 0
    if (currentIsBlankMint) {
      router.replace(`/chat?venue=${id}&conv=${current}`)
      return
    }
    const freshId = crypto.randomUUID()
    markMinted(freshId)
    router.replace(`/chat?venue=${id}&conv=${freshId}`)
  }

  // Show the share button only when the row exists, the current user owns
  // it, and a venue is selected (the PATCH endpoint requires venueId). For
  // fresh client-minted threads (no row yet) the button stays hidden — there
  // is nothing to share until the first send creates the row.
  const showShareButton = isOwner && conversationExists && Boolean(venueId)
  const isShared = visibility === 'org'
  const shareActions =
    showShareButton && conversationId && venueId ? (
      <ShareButton
        conversationId={conversationId}
        venueId={venueId}
        isShared={isShared}
        isPending={updateVisibility.isPending}
        onToggle={async (next) => {
          try {
            await updateVisibility.mutateAsync({
              conversationId,
              venueId,
              visibility: next,
            })
            if (next === 'org' && typeof window !== 'undefined') {
              const url = `${window.location.origin}/chat?venue=${venueId}&conv=${conversationId}`
              try {
                await navigator.clipboard.writeText(url)
                toast.success('Share link copied — anyone in your org can view')
              } catch {
                toast.success('Sharing on — copy the URL from your address bar')
              }
            } else {
              toast.success('Sharing off — only you can view this chat')
            }
          } catch (err) {
            toast.error(mapApiError(err))
          }
        }}
      />
    ) : null

  return (
    <>
      <PageHeader title={titleFor(displayMessages) ?? 'Chat'} actions={shareActions} />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
            {!isOwner ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                <span>Read-only — this chat was shared with you.</span>
              </div>
            ) : null}

            {activeSuggestions && activeSuggestions.length > 0 ? (
              <SuggestionsSurface suggestions={activeSuggestions} isLoading={false} />
            ) : null}

            {error ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
                <span>Something went wrong.</span>
                <button
                  type="button"
                  className="text-xs font-medium underline underline-offset-4"
                  onClick={() => regenerate()}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {isEmpty && !isPending ? (
              <EmptyState needsVenue={!venueId} onPick={submit} />
            ) : (
              <ChatThread
                messages={displayMessages}
                status={status}
                onFollowUpSelect={isOwner ? submit : undefined}
                latestFollowUps={isOwner ? lastAssistantFollowUps : []}
                onRegenerate={isOwner ? () => regenerate() : undefined}
                feedbackByMessageId={feedbackByMessageId}
              />
            )}
          </div>
        </div>

        <div className="border-t border-border bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5">
            {isOwner ? <VenueStrip venueId={venueId} onChange={onPickVenue} /> : null}
            <ChatComposer
              onSubmit={submit}
              onSubmitWithImage={submitWithImage}
              isPending={isPending}
              disabled={!isOwner || !venueId || !conversationId}
              disabledReason={
                !isOwner
                  ? 'Read-only — shared by another user'
                  : !venueId
                    ? 'Pick a venue to start'
                    : !conversationId
                      ? 'Start a new chat'
                      : undefined
              }
            />
          </div>
        </div>
      </div>
    </>
  )
}

function titleFor(messages: GmUIMessage[]): string | undefined {
  if (messages.length === 0) return undefined
  const first = messages.find((m) => m.role === 'user')
  if (!first) return undefined
  const text = first.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('')
    .trim()
  if (!text) return undefined
  return text.length > 80 ? `${text.slice(0, 79)}…` : text
}

function EmptyState({
  needsVenue,
  onPick,
}: {
  needsVenue: boolean
  onPick?: (text: string) => void | Promise<void>
}) {
  const prompts = [
    'Which stock items are below par today?',
    'Who supplies our house red wine?',
    'What are the upcoming order cut-offs?',
    "Walk me through tonight's opening checklist.",
  ]
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Sparkles className="h-6 w-6" aria-hidden />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">How can I help?</h2>
        <p className="text-sm text-muted-foreground">
          {needsVenue ? (
            <>
              Start by picking a venue below. No venues yet?{' '}
              <Link
                href="/venues/new"
                className="font-medium text-brand underline-offset-4 hover:underline"
              >
                Create one
              </Link>
              .
            </>
          ) : (
            <>
              Ask about stock, ordering, SOPs, or suppliers — I&apos;ll pull from your knowledge
              base and venue data.
            </>
          )}
        </p>
      </div>
      {!needsVenue ? (
        <ul className="grid w-full gap-2 sm:grid-cols-2">
          {prompts.map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPick?.(p)}
                disabled={!onPick}
                className="block w-full rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground/90 transition-colors hover:border-brand/40 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
              >
                {p}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function ShareButton({
  isShared,
  isPending,
  onToggle,
}: {
  conversationId: string
  venueId: string
  isShared: boolean
  isPending: boolean
  onToggle: (next: 'private' | 'org') => Promise<void>
}) {
  const [justCopied, setJustCopied] = useState(false)
  const next = isShared ? 'private' : 'org'
  const Icon = isPending ? Loader2 : isShared ? Check : Link2
  const label = isPending ? (isShared ? 'Unsharing…' : 'Sharing…') : isShared ? 'Shared' : 'Share'
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={async () => {
        await onToggle(next)
        if (next === 'org') {
          setJustCopied(true)
          setTimeout(() => setJustCopied(false), 1500)
        }
      }}
      title={
        isShared
          ? 'Sharing is on — anyone in your org with the link can view. Click to make private.'
          : 'Make this chat viewable by anyone in your org with the link.'
      }
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
        isShared
          ? 'border-brand/30 bg-brand/10 text-brand hover:bg-brand/15'
          : 'border-border bg-card text-foreground/80 hover:bg-accent',
        isPending && 'opacity-70',
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} aria-hidden />
      <span>{justCopied ? 'Link copied' : label}</span>
    </button>
  )
}

export function ChatBody() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatInner />
    </Suspense>
  )
}
