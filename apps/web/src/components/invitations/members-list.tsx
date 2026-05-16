'use client'

import { Users } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api-client'
import { type OrgMember, useOrgMembers } from '@/lib/hooks/use-org-members'
import { cn } from '@/lib/utils'

function initials(member: OrgMember): string {
  const source = member.name?.trim() || member.email
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

  if (query.isLoading) {
    return (
      <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-3">
          {MEMBERS_SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-12 w-full" />
          ))}
        </div>
      </section>
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
  if (members.length === 0) {
    return (
      <section className="rounded-lg border border-dashed bg-card p-6 text-center shadow-sm">
        <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">No members yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Invite teammates below and they&apos;ll appear here once they accept.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border bg-card shadow-sm" aria-labelledby="members-heading">
      <header className="flex items-baseline justify-between border-b px-5 py-3">
        <h3
          id="members-heading"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Team
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {members.length} {members.length === 1 ? 'person' : 'people'}
        </span>
      </header>
      <ul className="divide-y">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center gap-3 px-5 py-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                'border border-border bg-background text-[11px] font-semibold tracking-[-0.02em] text-foreground/75',
              )}
              aria-hidden
            >
              {initials(m)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {m.name?.trim() || m.email}
                </span>
                {m.isSelf ? (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-foreground/60">
                    You
                  </span>
                ) : null}
              </p>
              {m.name ? <p className="truncate text-xs text-muted-foreground">{m.email}</p> : null}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {ROLE_LABEL[m.role] ?? m.role}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
