'use client'

import { ApiError } from '@/lib/api-client'
import { mapApiError } from '@/lib/map-api-error'
import { useWhatsappInvites } from '@/lib/hooks/use-whatsapp-invites'
import { InviteWhatsappDialog } from './invite-whatsapp-dialog'
import { WhatsappInviteList } from './whatsapp-invite-list'

export function WhatsappInvitationsBody() {
  const query = useWhatsappInvites()

  // Server-side role gating is the load-bearing check (RoleGuard +
  // @RequireRole('owner', 'manager') on InviteController). The 403 path renders
  // a friendly notice — same pattern as the email-invite body.
  if (query.isError) {
    const err = query.error
    if (err instanceof ApiError && err.code === 'forbidden') {
      return (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Only owners and managers can manage WhatsApp invites.
        </div>
      )
    }
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {mapApiError(err)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Invite a teammate via WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Generate a one-time code that the staff member sends to GM AI on WhatsApp to
            verify their phone and start chatting.
          </p>
        </div>
        <InviteWhatsappDialog />
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
        </div>
      ) : (
        <WhatsappInviteList data={query.data} />
      )}
    </div>
  )
}
