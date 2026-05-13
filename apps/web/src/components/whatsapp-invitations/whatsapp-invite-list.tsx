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
  { label: string; cls: string; Icon: typeof Clock }
> = {
  pending: {
    label: 'Pending',
    cls: 'border-amber-200 bg-amber-50 text-amber-900',
    Icon: Clock,
  },
  redeemed: {
    label: 'Redeemed',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    Icon: CheckCircle2,
  },
  revoked: {
    label: 'Revoked',
    cls: 'border-slate-200 bg-slate-50 text-slate-900',
    Icon: XCircle,
  },
  exhausted: {
    label: 'Code exhausted',
    cls: 'border-rose-200 bg-rose-50 text-rose-900',
    Icon: XCircle,
  },
  expired: {
    label: 'Expired',
    cls: 'border-slate-200 bg-slate-50 text-slate-900',
    Icon: XCircle,
  },
}

function StatusBadge({ status }: { status: WhatsappInvitePublic['status'] }) {
  const { label, cls, Icon } = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
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
      <section className="rounded-md border p-6 text-center">
        <MessageCircle className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          No WhatsApp invites yet. Click &ldquo;Invite via WhatsApp&rdquo; to send your first one.
        </p>
      </section>
    )
  }

  const pending = data.invites.filter((i) => i.status === 'pending')
  const recent = data.invites.filter((i) => i.status !== 'pending')

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Active WhatsApp invites</h2>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending invites.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {pending.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
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
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Recently transitioned ({recent.length})
          </summary>
          <ul className="mt-3 divide-y rounded-md border">
            {recent.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between px-3 py-2 text-sm">
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
