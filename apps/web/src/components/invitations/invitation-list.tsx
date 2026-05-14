'use client'

import { CheckCircle2, Clock, Copy, Trash2, UserPlus, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
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
import type { ListInvitationsResponseDto as ListInvitationsResponse } from '@/generated/api'
import type { InvitationDto as InvitationDTO } from '@/lib/api-types'
import { useRevokeInvitation } from '@/lib/hooks/use-invitations'

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

function inviteUrl(id: string): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_WEB_ORIGIN ?? 'http://localhost:3000')
  return `${origin}/auth/accept-invitation/${id}`
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to legacy */
  }
  if (typeof document === 'undefined') return false
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(ta)
  return ok
}

function StatusBadge({ status }: { status: InvitationDTO['status'] }) {
  // Quiet status pill. Pending earns an amber dot (operator scan signal);
  // accepted is muted because it's a settled state; revoked/expired are
  // muted past-tense.
  const map: Record<
    InvitationDTO['status'],
    { label: string; dot: string; text: string; Icon: typeof Clock }
  > = {
    pending: { label: 'Pending', dot: 'bg-amber-500', text: 'text-foreground/80', Icon: Clock },
    accepted: {
      label: 'Accepted',
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
    expired: {
      label: 'Expired',
      dot: 'bg-muted-foreground/50',
      text: 'text-muted-foreground',
      Icon: XCircle,
    },
  }
  const { label, dot, text, Icon } = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  )
}

export function InvitationList({ data }: { data: ListInvitationsResponse | undefined }) {
  const [confirmRevoke, setConfirmRevoke] = useState<InvitationDTO | null>(null)
  const revokeMutation = useRevokeInvitation()

  if (!data || data.invitations.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-6 text-center shadow-sm">
        <UserPlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          No invitations yet. Use the form above to invite a teammate.
        </p>
      </section>
    )
  }

  const pending = data.invitations.filter((i) => i.status === 'pending')
  const accepted = data.invitations.filter((i) => i.status === 'accepted')
  const dead = data.invitations.filter((i) => i.status === 'revoked' || i.status === 'expired')

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Invitations
      </h2>

      <Group title="Pending" items={pending}>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <ul className="divide-y">
            {pending.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.role} · {inv.inviterName ? `by ${inv.inviterName} · ` : ''}
                    expires {formatRelative(inv.expiresAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={inv.status} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const ok = await copyToClipboard(inviteUrl(inv.id))
                      toast[ok ? 'success' : 'error'](
                        ok ? 'Link copied' : 'Copy failed — select and copy manually',
                      )
                    }}
                    aria-label="Copy invitation link"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Copy</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRevoke(inv)}
                    aria-label="Revoke invitation"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Revoke</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Group>

      {accepted.length > 0 && (
        <Group title="Accepted" items={accepted} collapsed>
          <ul className="divide-y">
            {accepted.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">{inv.role}</p>
                </div>
                <StatusBadge status={inv.status} />
              </li>
            ))}
          </ul>
        </Group>
      )}

      {dead.length > 0 && (
        <Group title="Expired or revoked" items={dead} collapsed>
          <ul className="divide-y">
            {dead.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">{inv.role}</p>
                </div>
                <StatusBadge status={inv.status} />
              </li>
            ))}
          </ul>
        </Group>
      )}

      <Dialog open={!!confirmRevoke} onOpenChange={(v) => !v && setConfirmRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke invitation?</DialogTitle>
            <DialogDescription>
              {confirmRevoke
                ? `This cancels the invitation for ${confirmRevoke.email}. They won't be able to accept it anymore.`
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

function Group({
  title,
  items,
  collapsed = false,
  children,
}: {
  title: string
  items: InvitationDTO[]
  collapsed?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!collapsed)
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="border-t pt-3 first:border-t-0 first:pt-0"
    >
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
        {title} ({items.length})
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}
