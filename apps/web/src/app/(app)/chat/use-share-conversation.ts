'use client'

import { toast } from 'sonner'
import { useUpdateConversationVisibility } from '@/lib/hooks/use-update-conversation-visibility'
import { mapApiError } from '@/lib/map-api-error'

/// Owns the share-toggle side effects (visibility mutation + clipboard + toast)
/// so ChatCore's header JSX stays declarative. Returns the pending flag for the
/// button spinner and a `toggle` that flips visibility and, when turning
/// sharing on, copies the org-viewable link to the clipboard.
export function useShareConversation() {
  const updateVisibility = useUpdateConversationVisibility()

  const toggle = async (args: {
    conversationId: string
    venueId: string
    next: 'private' | 'org'
  }) => {
    try {
      await updateVisibility.mutateAsync({
        conversationId: args.conversationId,
        venueId: args.venueId,
        visibility: args.next,
      })
      if (args.next === 'org' && typeof window !== 'undefined') {
        const url = `${window.location.origin}/chat?venue=${args.venueId}&conv=${args.conversationId}`
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
  }

  return { isPending: updateVisibility.isPending, toggle }
}
