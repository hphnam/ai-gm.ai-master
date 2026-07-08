'use client'

import { useChat } from '@ai-sdk/react'
import { type QueryClient as RqClient, useQueryClient } from '@tanstack/react-query'
import { DefaultChatTransport } from 'ai'
import {
  ArrowRight,
  BookOpen,
  Check,
  Link2,
  ListTodo,
  Loader2,
  Lock,
  type LucideIcon,
  MessageCircle,
  Package,
  Plus,
  ShieldCheck,
  Store,
  TrendingUp,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChatComposer } from '@/components/chat/chat-composer'
import { ChatThread } from '@/components/chat/chat-thread'
import { SuggestionsSurface } from '@/components/chat/suggestions-surface'
import { VenueChip } from '@/components/chat/venue-chip'
import { SetPageHeader } from '@/components/shell/page-header-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  ConversationResponseDto as ConversationResponse,
  VenueListItemDto as VenueListItem,
} from '@/generated/api'
import { API_URL } from '@/lib/api-client'
import { useSession } from '@/lib/auth-client'
import { type StarterQuestion, useChatStarters } from '@/lib/hooks/use-chat-starters'
import { useConversation } from '@/lib/hooks/use-conversation'
import { useCurrentMember } from '@/lib/hooks/use-current-member'
import { useOnOpenSuggestions, useOnTurnSuggestions } from '@/lib/hooks/use-suggestions'
import { useVenues } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'
import { isMinted, markMinted } from '@/lib/minted-conv-ids'
import { cn } from '@/lib/utils'
import { dbToUIMessage, type GmUIMessage, uiMessageToText } from './message-mapping'
import { useChatSubmit } from './use-chat-submit'
import { useConversationDerivedState } from './use-conversation-derived-state'
import { useOptimisticThreads } from './use-optimistic-threads'
import { useShareConversation } from './use-share-conversation'

function ThreadSkeleton() {
  return (
    <div
      aria-hidden
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6"
    >
      <div className="flex justify-end">
        <Skeleton className="h-10 w-3/5 max-w-sm rounded-3xl rounded-br-lg" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-2/5 max-w-xs rounded-3xl rounded-br-lg" />
      </div>
    </div>
  )
}

function ChatSkeleton() {
  return (
    <div className="flex h-dvh flex-col">
      <span className="sr-only" aria-live="polite">
        Loading chat
      </span>
      <ThreadSkeleton />
    </div>
  )
}

function ChatInner() {
  const params = useSearchParams()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: venues } = useVenues()

  const venueId = params.get('venue')
  const conversationId = params.get('conv')

  // Landing on /chat (no conv):
  //   • no venue → stay on the venue-picker surface, UNLESS the user only has
  //     one venue, in which case auto-select it and skip venue selection.
  //   • venue pinned → mint a fresh chat for it. Do NOT surface an old thread
  //     behind the user's back; resuming is a deliberate sidebar action.
  useEffect(() => {
    if (conversationId) return
    const soleVenue = venues?.length === 1 ? venues[0].id : null
    const effectiveVenue = venueId ?? soleVenue
    if (!effectiveVenue) return
    const freshId = crypto.randomUUID()
    markMinted(freshId)
    router.replace(`/chat?venue=${effectiveVenue}&conv=${freshId}`)
  }, [venueId, conversationId, venues, router])

  return (
    <ChatSession
      key={conversationId ?? 'landing'}
      venueId={venueId}
      conversationId={conversationId}
      queryClient={queryClient}
    />
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
        <SetPageHeader title="Chat" />
        <span className="sr-only" aria-live="polite">
          Loading conversation
        </span>
        <ThreadSkeleton />
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
  const { data: session } = useSession()
  const sessionUserId = session?.user?.id ?? null
  const scrollRef = useRef<HTMLDivElement>(null)

  // Owner test: a fresh chat with no row yet (ownerUserId === null AND
  // visibility === null) is implicitly owned by the current user — they're
  // about to create it. Once the row exists, ownership is the userId on the
  // row. Legacy WhatsApp threads (ownerUserId === null but visibility set)
  // have no human owner and stay read-only on web.
  const conversationExists = visibility !== null
  const isOwner = !conversationExists ? true : ownerUserId !== null && ownerUserId === sessionUserId
  const share = useShareConversation()

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

  // One-shot prefill from sessionStorage. Used by entry points like the
  // report detail page's "Re-run with AI" button — they stash the message
  // there and navigate to /chat. We read once on mount, hand it to the
  // composer as initialValue, and clear so a refresh doesn't replay it.
  const [composerPrefill, setComposerPrefill] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stash = window.sessionStorage.getItem('chat:prefill')
      if (stash) {
        setComposerPrefill(stash)
        window.sessionStorage.removeItem('chat:prefill')
      }
    } catch {
      // sessionStorage blocked — skip; the button just loses prefill silently.
    }
  }, [])

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

  const { messages, sendMessage, status, error, regenerate, stop } = useChat<GmUIMessage>({
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

  const recordOptimisticThread = useOptimisticThreads(queryClient, venues)
  const { submit, submitWithImage } = useChatSubmit({
    venueIdRef,
    convIdRef,
    setPendingUserTexts,
    recordOptimisticThread,
    turnSuggestions,
    sendMessage,
    queryClient,
  })

  const { lastAssistantFollowUps, feedbackByMessageId, verifyByMessageId } =
    useConversationDerivedState(historyMessages, status)

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
  // Venue chip only makes sense when there's a choice to make: hide it with no
  // venue yet (the empty state shows the big picker) AND when the user has just
  // one venue (nothing to switch to). Share needs a venue + existing row.
  const showVenueChip = Boolean(venueId) && (venues?.length ?? 0) > 1
  const showShare = showShareButton && Boolean(conversationId)
  const headerActions =
    showVenueChip || showShare ? (
      <>
        {showVenueChip && venueId ? (
          <VenueChip venueId={venueId} onChange={isOwner ? onPickVenue : undefined} />
        ) : null}
        {showShare && conversationId && venueId ? (
          <ShareButton
            isShared={isShared}
            isPending={share.isPending}
            onToggle={(next) => share.toggle({ conversationId, venueId, next })}
          />
        ) : null}
      </>
    ) : undefined

  return (
    <>
      <SetPageHeader title={titleFor(displayMessages) ?? 'Chat'} actions={headerActions} />

      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
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
              <EmptyState
                needsVenue={!venueId}
                venueId={venueId}
                onPick={submit}
                venues={venues}
                onPickVenue={isOwner ? onPickVenue : undefined}
              />
            ) : (
              <ChatThread
                messages={displayMessages}
                status={status}
                onFollowUpSelect={isOwner ? submit : undefined}
                latestFollowUps={isOwner ? lastAssistantFollowUps : []}
                onRegenerate={isOwner ? () => regenerate() : undefined}
                feedbackByMessageId={feedbackByMessageId}
                verifyByMessageId={verifyByMessageId}
                onPrompt={isOwner ? submit : undefined}
                venueId={venueId}
                scrollContainerRef={scrollRef}
              />
            )}
          </div>
        </div>

        {venueId ? (
          <div className="border-t border-border bg-background px-4 pt-3 pb-3 sm:px-6">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5">
              <ChatComposer
                onSubmit={submit}
                onSubmitWithImage={submitWithImage}
                isPending={isPending}
                onStop={status === 'streaming' || status === 'submitted' ? stop : undefined}
                initialValue={composerPrefill}
                disabled={!isOwner || !conversationId}
                disabledReason={
                  !isOwner
                    ? 'Read-only — shared by another user'
                    : !conversationId
                      ? 'Start a new chat'
                      : undefined
                }
              />
            </div>
          </div>
        ) : null}
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

// Fallback prompts shown while the AI-rotated starters haven't loaded yet OR
// when the API call fails. Split by role so staff aren't nudged toward
// commercial questions they're scoped out of, and managers get the
// commercial + compliance angles. The server payload overrides these when
// present.
const STAFF_FALLBACK_PROMPTS: ReadonlyArray<StarterQuestion> = [
  { text: "Walk me through tonight's opening checklist.", category: 'sop' },
  { text: 'Which stock items are below par today?', category: 'stock' },
  { text: "What's on my list this week?", category: 'tasks' },
  { text: 'How do I log a cellar temperature check?', category: 'sop' },
]

const MANAGER_FALLBACK_PROMPTS: ReadonlyArray<StarterQuestion> = [
  { text: 'How did sales go last week?', category: 'sales' },
  { text: 'Any certificates expiring in the next 30 days?', category: 'compliance' },
  { text: "What's overdue across the team right now?", category: 'tasks' },
  { text: 'Which stock items are below par today?', category: 'stock' },
]

const STARTER_CATEGORY_ICONS: Record<string, LucideIcon> = {
  stock: Package,
  tasks: ListTodo,
  compliance: ShieldCheck,
  sop: BookOpen,
  supplier: Truck,
  sales: TrendingUp,
}

function starterIcon(category?: string): LucideIcon {
  if (!category) return MessageCircle
  const key = category.trim().toLowerCase()
  return (
    STARTER_CATEGORY_ICONS[key] ?? STARTER_CATEGORY_ICONS[key.replace(/s$/, '')] ?? MessageCircle
  )
}

function EmptyState({
  needsVenue,
  venueId,
  onPick,
  venues,
  onPickVenue,
}: {
  needsVenue: boolean
  venueId: string | null
  onPick?: (text: string) => void | Promise<void>
  venues: VenueListItem[] | undefined
  onPickVenue?: (id: string) => void
}) {
  const starters = useChatStarters(venueId)
  const { isManager } = useCurrentMember()
  // Prefer the server's payload (generated or its own fallback) when we have
  // one. Only fall back to the static client list while the request is in
  // flight, OR if the request errored — keeps the surface populated even when
  // /chat-starters returns 500. The fallback is role-aware.
  const prompts =
    starters.data?.questions ?? (isManager ? MANAGER_FALLBACK_PROMPTS : STAFF_FALLBACK_PROMPTS)

  if (needsVenue) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-16">
        <header className="space-y-3">
          <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-5xl">
            Start a chat
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Pick a venue to ground this conversation in its docs, stock, and SOPs.
          </p>
        </header>
        <VenuePickerList venues={venues} onPickVenue={onPickVenue} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 py-16">
      <header className="space-y-3">
        <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-5xl">
          How would you like
          <br />
          <span className="text-foreground/50">to start?</span>
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Ask about stock, ordering, SOPs, or suppliers. I&apos;ll pull from your knowledge base and
          venue data.
        </p>
      </header>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {prompts.map((p) => {
          const Icon = starterIcon(p.category)
          return (
            <li key={p.text}>
              <button
                type="button"
                onClick={() => onPick?.(p.text)}
                disabled={!onPick}
                className="group flex min-h-11 w-full cursor-pointer items-center gap-3 py-3 text-left text-sm text-foreground/80 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-primary"
                  aria-hidden
                />
                <span className="flex-1">{p.text}</span>
                <span
                  aria-hidden
                  className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
                >
                  →
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function VenuePickerList({
  venues,
  onPickVenue,
}: {
  venues: VenueListItem[] | undefined
  onPickVenue?: (id: string) => void
}) {
  const { isManager } = useCurrentMember()

  // A shared chat viewer should never see the no-venue empty state, but if a
  // malformed URL drops them here without ownership, hide the picker entirely
  // rather than render a confusing disabled list.
  if (!onPickVenue) return null

  if (!venues) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        Loading venues…
      </div>
    )
  }

  if (venues.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card/50 px-4 py-6 text-sm">
        <p className="text-muted-foreground">
          You don&apos;t have any venues yet.
          {isManager ? ' Create one to start chatting.' : ' Ask a manager to add one.'}
        </p>
        {isManager ? (
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href="/venues/new">
              <Plus aria-hidden />
              New venue
            </Link>
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Pick a venue for this chat" className="flex flex-col gap-2">
        {venues.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onPickVenue(v.id)}
              className={cn(
                'group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors',
                'hover:border-foreground/20 hover:bg-accent',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
              )}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground"
                aria-hidden
              >
                <Store className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{v.name}</span>
                {v.address ? (
                  <span className="truncate text-xs text-muted-foreground">{v.address}</span>
                ) : null}
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
      {isManager ? (
        <Button
          asChild
          variant="outline"
          className="group h-auto justify-start gap-2 rounded-xl border-dashed px-4 py-3 font-medium text-muted-foreground shadow-none hover:border-foreground/20 hover:text-foreground"
        >
          <Link href="/venues/new">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground"
              aria-hidden
            >
              <Plus className="h-4 w-4" />
            </span>
            New venue
          </Link>
        </Button>
      ) : null}
    </div>
  )
}

function ShareButton({
  isShared,
  isPending,
  onToggle,
}: {
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
          ? 'border-foreground/20 bg-foreground/[0.06] text-foreground hover:bg-foreground/10'
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
