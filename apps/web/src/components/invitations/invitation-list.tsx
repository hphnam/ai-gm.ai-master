'use client'

import { useState } from 'react'
import { Clock, Copy, Trash2, UserPlus, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { ListInvitationsResponseDto as ListInvitationsResponse } from '@/generated/api'
import type { InvitationDto as InvitationDTO } from '@/lib/api-types'
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
import { useRevokeInvitation } from '@/lib/hooks/use-invitations'

function formatRelative(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = then - now
  const abs = Math.abs(diffMs)
  const day = 86400000
  const hr = 3600000
  const min = 60000
  if (abs > day) return `${diffMs >= 0 ? 'in ' : ''}${Math.round(abs / day)}d${diffMs < 0 ? ' ago' : ''}`
  if (abs > hr) return `${diffMs >= 0 ? 'in ' : ''}${Math.round(abs / hr)}h${diffMs < 0 ? ' ago' : ''}`
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
  const map: Record<InvitationDTO['status'], { label: string; cls: string; Icon: typeof Clock }> = {
    pending: {
      label: 'Pending',
      cls: 'border-amber-200 bg-amber-50 text-amber-900',
      Icon: Clock,
    },
    accepted: {
      label: 'Accepted',
      cls: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      Icon: CheckCircle2,
    },
    revoked: {
      label: 'Revoked',
      cls: 'border-slate-200 bg-slate-50 text-slate-900',
      Icon: XCircle,
    },
    expired: {
      label: 'Expired',
      cls: 'border-slate-200 bg-slate-50 text-slate-900',
      Icon: XCircle,
    },
  }
  const { label, cls, Icon } = map[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
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
      <section className="rounded-md border p-6 text-center">
        <UserPlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          No invitations yet. Use the form above to invite a teammate.
        </p>
      </section>
    )
  }

  const pending = data.invitations.filter((i) => i.status === 'pending')
  const accepted = data.invitations.filter((i) => i.status === 'accepted')
  const dead = data.invitations.filter(
    (i) => i.status === 'revoked' || i.status === 'expired',
  )

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Invitations</h2>

      <Group title="Pending" items={pending}>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <ul className="divide-y rounded-md border" role="list">
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
          <ul className="divide-y rounded-md border" role="list">
            {accepted.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
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
          <ul className="divide-y rounded-md border" role="list">
            {dead.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
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

      <Dialog
        open={!!confirmRevoke}
        onOpenChange={(v) => !v && setConfirmRevoke(null)}
      >
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
      className="rounded-md border p-3"
    >
      <summary className="cursor-pointer text-sm font-medium">
        {title} ({items.length})
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}
