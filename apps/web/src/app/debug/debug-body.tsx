'use client'

import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { UserMenu } from '@/components/auth/user-menu'
import { VenueSelector } from '@/components/chat/venue-selector'
import { DebugConversationInspector } from '@/components/debug/debug-conversation-inspector'
import { DebugRequestIdBadge } from '@/components/debug/debug-request-id-badge'
import { DebugRetagQueue } from '@/components/debug/debug-retag-queue'
import { Button } from '@/components/ui/button'
import { useDebugConversation } from '@/lib/hooks/use-debug-conversation'
import { useDebugRetagQueue } from '@/lib/hooks/use-debug-retag-queue'
import { useVenues } from '@/lib/hooks/use-venues'

function DebugSkeleton() {
  return <div className="max-w-6xl mx-auto p-6 text-sm text-muted-foreground">Loading…</div>
}

function NoVenue() {
  return (
    <div className="max-w-xl mx-auto p-6 space-y-4 text-center">
      <h1 className="text-xl font-semibold">Debug</h1>
      <p className="text-sm text-muted-foreground">
        Select a venue to inspect recent debug activity.
      </p>
      <div className="flex justify-center">
        <VenueSelector targetRoute="/debug" />
      </div>
    </div>
  )
}

function DebugInner() {
  const params = useSearchParams()
  const venueId = params.get('venue')
  const conversationId = params.get('conv')
  const queryClient = useQueryClient()

  const { data: venues } = useVenues()
  const venue = useMemo(() => venues?.find((v) => v.id === venueId), [venues, venueId])

  const convQuery = useDebugConversation(conversationId, venueId)
  const retagQuery = useDebugRetagQueue(venueId)

  useEffect(() => {
    if (!venueId) return
    return () => {
      queryClient.cancelQueries({ queryKey: ['debug'] })
    }
  }, [venueId, queryClient])

  if (!venueId) {
    return <NoVenue />
  }

  const requestId = convQuery.data?.requestId ?? retagQuery.data?.requestId ?? undefined

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['debug'] })
    toast.info('Refreshed')
  }

  function handleItemClick(sourceMessageId: string) {
    const el = document.getElementById(`msg-${sourceMessageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <header className="flex flex-wrap items-center gap-3 pb-3 border-b">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Debug</h1>
          <span className="px-2 py-0.5 text-[10px] rounded bg-amber-500/20 text-amber-900 border border-amber-500/40 uppercase font-mono">
            Mode
          </span>
        </div>
        {venue ? <span className="text-sm text-muted-foreground">· {venue.name}</span> : null}
        <div className="ml-auto flex items-center gap-2">
          <DebugRequestIdBadge requestId={requestId} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            aria-label="Refresh debug data"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Refresh
          </Button>
          <VenueSelector targetRoute="/debug" />
          <UserMenu />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="min-w-0">
          {conversationId ? (
            <DebugConversationInspector
              data={convQuery.data?.data}
              isLoading={convQuery.isLoading}
              error={convQuery.error}
            />
          ) : (
            <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-6 text-center">
              Paste a conversation ID in the URL (<code>?conv=&lt;uuid&gt;</code>), or open a
              conversation from the chat page first.
            </div>
          )}
        </div>

        <aside className="min-w-0">
          <h2 className="text-sm font-semibold mb-3">Re-tag Queue</h2>
          <DebugRetagQueue
            data={retagQuery.data?.data}
            isLoading={retagQuery.isLoading}
            error={retagQuery.error}
            onItemClick={handleItemClick}
          />
        </aside>
      </div>
    </div>
  )
}

export function DebugBody() {
  return (
    <Suspense fallback={<DebugSkeleton />}>
      <DebugInner />
    </Suspense>
  )
}
