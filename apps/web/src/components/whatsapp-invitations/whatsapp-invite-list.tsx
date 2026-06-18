'use client'

import { CheckCircle2, Clock, MessageCircle, Trash2, XCircle } from 'lucide-react'
import { useState } from 'react'
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

const STATUS_STYLES: Record<
  WhatsappInvitePublic['status'],
  { label: string; dot: string; text: string; Icon: typeof Clock }
> = {
  pending: { label: 'Pending', dot: 'bg-amber-500', text: 'text-foreground/80', Icon: Clock },
  redeemed: {
    label: 'Redeemed',
    dot: 'bg-emerald-600',
    text: 'text-muted-foreground',
    Icon: CheckCircle2,
  },
  revoked: {
    label: 'Revoked',
    dot: 'bg-muted-foreground/50',
    text: 'text-muted-foreground',
    Icon: XCircle,
  },
  exhausted: {
    label: 'Code exhausted',
    dot: 'bg-destructive',
    text: 'text-destructive',
    Icon: XCircle,
  },
  expired: {
    label: 'Expired',
    dot: 'bg-muted-foreground/50',
    text: 'text-muted-foreground',
    Icon: XCircle,
  },
}

function StatusBadge({ status }: { status: WhatsappInvitePublic['status'] }) {
  const { label, dot, text, Icon } = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
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
        title="No WhatsApp invites yet"
        description={'Click "Invite via WhatsApp" to send your first one.'}
      />
    )
  }

  const pending = data.invites.filter((i) => i.status === 'pending')
  const recent = data.invites.filter((i) => i.status !== 'pending')

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Active WhatsApp invites
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
                  onClick={() => setConfirmRevoke(inv)}
                  aria-label={`Revoke WhatsApp invite for ${inv.phoneNumberMasked}`}
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
            <DialogTitle>Revoke WhatsApp invite?</DialogTitle>
            <DialogDescription>
              {confirmRevoke
                ? `This cancels the code for ${confirmRevoke.phoneNumberMasked}. They won't be able to verify with this code anymore.`
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
