'use client'

import { MapPin, SlidersHorizontal, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog, DeleteButton } from '@/components/ui/confirm-delete-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SettingCard } from '@/components/ui/setting-card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api-client'
import { type OrgMember, useOrgMembers, useRemoveOrgMember } from '@/lib/hooks/use-org-members'
import { cn } from '@/lib/utils'
import { MemberAccessDialog } from './member-access-dialog'
import { useShouldShowVenueAccess } from './venue-access-picker'

// Actor is always owner or manager here (server-gated read). Mirror the server
// rule so we only show Remove where the action would succeed: owner removes
// managers + staff; manager removes staff only; never yourself or an owner.
function canRemove(member: OrgMember, actorRole: string | undefined): boolean {
  if (member.isSelf || member.role === 'owner') return false
  return actorRole === 'owner' || member.role === 'staff'
}

// Same permission matrix as removeMember — owners are never venue-scoped, and
// only owner/staff-of-manager combos are editable (see updateMemberVenues).
function canEditAccess(member: OrgMember, actorRole: string | undefined): boolean {
  if (member.isSelf || member.role === 'owner') return false
  return actorRole === 'owner' || member.role === 'staff'
}

function venueScopeLabel(member: OrgMember): string {
  if (member.role === 'owner' || member.venueIds.length === 0) return 'All venues'
  return `${member.venueIds.length} ${member.venueIds.length === 1 ? 'venue' : 'venues'}`
}

function memberLabel(member: OrgMember): string {
  return member.name?.trim() || member.phoneNumber || member.email || 'this member'
}

function initials(member: OrgMember): string {
  const source = member.name?.trim() || member.email || member.phoneNumber || '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
}

const MEMBERS_SKELETON_KEYS = ['a', 'b', 'c']

export function MembersList() {
  const query = useOrgMembers()
  const removeMember = useRemoveOrgMember()
  const showVenueAccess = useShouldShowVenueAccess()
  const [pendingRemove, setPendingRemove] = useState<OrgMember | null>(null)
  const [pendingAccess, setPendingAccess] = useState<OrgMember | null>(null)

  if (query.isLoading) {
    return (
      <SettingCard title="Team">
        <div className="space-y-3">
          {MEMBERS_SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-12 w-full" />
          ))}
        </div>
      </SettingCard>
    )
  }

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.code === 'forbidden') {
      // Match the existing forbidden treatment for invitations. Read by
      // anyone who hits this page despite role gating server-side.
      return null
    }
    return <Alert variant="destructive">Couldn&apos;t load team members.</Alert>
  }

  const members = query.data?.members ?? []
  const actorRole = members.find((m) => m.isSelf)?.role
  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        size="compact"
        title="No members yet"
        description="Invite teammates below and they'll appear here once they accept."
      />
    )
  }

  return (
    <SettingCard
      title="Team"
      action={
        <span className="text-xs text-muted-foreground tabular-nums">
          {members.length} {members.length === 1 ? 'person' : 'people'}
        </span>
      }
      bodyClassName="p-0"
    >
      <ul className="divide-y">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center gap-3 px-5 py-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                'border border-border bg-background text-xs font-semibold tracking-tight text-foreground/75',
              )}
              aria-hidden
            >
              {initials(m)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {m.name?.trim() || m.phoneNumber || m.email || 'Unknown'}
                </span>
                {m.isSelf ? (
                  <Badge variant="neutral" size="sm" className="shrink-0">
                    You
                  </Badge>
                ) : null}
              </p>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                {m.name && (m.phoneNumber || m.email) ? (
                  <span className="truncate">{m.phoneNumber ?? m.email}</span>
                ) : null}
                {showVenueAccess ? (
                  <>
                    {m.name && (m.phoneNumber || m.email) ? <span aria-hidden>·</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {venueScopeLabel(m)}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {ROLE_LABEL[m.role] ?? m.role}
            </span>
            {showVenueAccess && canEditAccess(m, actorRole) ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit venue access for ${memberLabel(m)}`}
                onClick={() => setPendingAccess(m)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            ) : null}
            {canRemove(m, actorRole) ? (
              <DeleteButton
                size="icon"
                label={`Remove ${memberLabel(m)}`}
                onClick={() => setPendingRemove(m)}
              />
            ) : null}
          </li>
        ))}
      </ul>
      <MemberAccessDialog
        member={pendingAccess}
        onOpenChange={(open) => {
          if (!open) setPendingAccess(null)
        }}
      />
      <ConfirmDeleteDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
        title="Remove team member"
        description={
          pendingRemove ? (
            <>
              Remove <span className="font-medium">{memberLabel(pendingRemove)}</span> from your
              team and sign them out immediately? If this is their only team, their account is
              deleted and they'd need a fresh invite to return.
            </>
          ) : null
        }
        confirmLabel="Remove"
        isPending={removeMember.isPending}
        onConfirm={async () => {
          if (!pendingRemove) return
          const label = memberLabel(pendingRemove)
          try {
            const { deletedUser } = await removeMember.mutateAsync(pendingRemove.userId)
            toast.success(deletedUser ? `Deleted ${label}.` : `Removed ${label} from your team.`)
          } catch {
            toast.error(`Couldn't remove ${label}. Please try again.`)
            throw new Error('remove-failed')
          }
        }}
      />
    </SettingCard>
  )
}
