'use client'

import { ApiError } from '@/lib/api-client'
import { useWhatsappInvites } from '@/lib/hooks/use-whatsapp-invites'
import { mapApiError } from '@/lib/map-api-error'
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
        <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
          Only owners and managers can manage WhatsApp invites.
        </div>
      )
    }
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive shadow-sm">
        {mapApiError(err)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Invite via WhatsApp
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate a one-time code that the staff member sends to GM AI on WhatsApp to verify
            their phone and start chatting.
          </p>
        </div>
        <InviteWhatsappDialog />
      </section>

      {query.isLoading ? (
        <div className="space-y-3">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      ) : (
        <WhatsappInviteList data={query.data} />
      )}
    </div>
  )
}
