'use client'

import { MessageCircle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { INVITE_STATUS } from '@/components/invitations/invite-status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import {
  type ListWhatsappInvitesResponse,
  useRevokeWhatsappInvite,
  type WhatsappInvitePublic,
} from '@/lib/hooks/use-whatsapp-invites'

function formatRelative(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = then - now
  const abs = Math.abs(diffMs)
  const day = 86400000
  const hr = 3600000
  const min = 60000
  if (abs > day)
    return `${diffMs >= 0 ? 'in ' : ''}${Math.round(abs / day)}d${diffMs < 0 ? ' ago' : ''}`
  if (abs > hr)
    return `${diffMs >= 0 ? 'in ' : ''}${Math.round(abs / hr)}h${diffMs < 0 ? ' ago' : ''}`
  return `${diffMs >= 0 ? 'in ' : ''}${Math.max(1, Math.round(abs / min))}m${diffMs < 0 ? ' ago' : ''}`
}

function StatusBadge({ status }: { status: WhatsappInvitePublic['status'] }) {
  const { label, variant } = INVITE_STATUS[status]
  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  )
}

export function WhatsappInviteList({ data }: { data: ListWhatsappInvitesResponse | undefined }) {
  const [confirmRevoke, setConfirmRevoke] = useState<WhatsappInvitePublic | null>(null)
  const revokeMutation = useRevokeWhatsappInvite()

  if (!data || data.invites.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        size="compact"
        title="No SMS invites yet"
        description="Invite someone by phone above to send an SMS join link."
      />
    )
  }

  const pending = data.invites.filter((i) => i.status === 'pending')
  const recent = data.invites.filter((i) => i.status !== 'pending')

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Active SMS invites
      </h2>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending invites.</p>
      ) : (
        <ul className="divide-y">
          {pending.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{inv.phoneNumberMasked}</p>
                <p className="text-xs text-muted-foreground">
                  {inv.role} · expires {formatRelative(inv.expiresAt)}
                  {inv.note ? ` · ${inv.note}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={inv.status} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setConfirmRevoke(inv)}
                  aria-label={`Revoke SMS invite for ${inv.phoneNumberMasked}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                  <span className="sr-only sm:not-sr-only sm:ml-1">Revoke</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 && (
        <details className="border-t pt-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Recently transitioned ({recent.length})
          </summary>
          <ul className="mt-3 divide-y">
            {recent.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{inv.phoneNumberMasked}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.role} · {formatRelative(inv.createdAt)}
                  </p>
                </div>
                <StatusBadge status={inv.status} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <Dialog open={!!confirmRevoke} onOpenChange={(v) => !v && setConfirmRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke SMS invite?</DialogTitle>
            <DialogDescription>
              {confirmRevoke
                ? `This cancels the invite for ${confirmRevoke.phoneNumberMasked}. The SMS link will no longer work.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={revokeMutation.isPending}
              onClick={async () => {
                if (!confirmRevoke) return
                await revokeMutation.mutateAsync(confirmRevoke.id).catch(() => undefined)
                setConfirmRevoke(null)
              }}
            >
              {revokeMutation.isPending ? 'Revoking…' : 'Revoke'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
