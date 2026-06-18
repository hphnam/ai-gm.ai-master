'use client'

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  Loader2,
  MessageSquare,
  MoreVertical,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '@/components/shell/app-shell'
import { apiErrorLabel, formatRelative } from '@/components/shell/notifications-shared'
import { PageHeader } from '@/components/shell/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { type TabItem, Tabs } from '@/components/ui/tabs'
import { useSession } from '@/lib/auth-client'
import {
  type Incident,
  type IncidentComment,
  type IncidentSeverity,
  type IncidentStatus,
  useAddIncidentComment,
  useDeleteIncident,
  useDeleteIncidentComment,
  useIncidentComments,
  useIncidents,
  useUpdateIncidentStatus,
} from '@/lib/hooks/use-incidents'
import { cn } from '@/lib/utils'

type StatusFilter = 'open' | 'acknowledged' | 'closed' | 'all'

const FILTERS: TabItem<StatusFilter>[] = [
  { id: 'open', label: 'Open' },
  { id: 'acknowledged', label: 'Acknowledged' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
]

// Canonical button styles, aligned with alerts / notification-replies. Kept
// inline so the incidents page stays visually consistent without dragging
// in a new shared component.
const CHIP_CLASS =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-medium text-xs text-foreground/80 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
const CHIP_DANGER_CLASS =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 font-medium text-xs text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50'
const CHIP_PRIMARY_CLASS =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 font-medium text-xs text-background transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'

export function IncidentsBody() {
  const [filter, setFilter] = useState<StatusFilter>('open')
  const status: IncidentStatus | undefined = filter === 'all' ? undefined : filter
  const { data, isLoading, error } = useIncidents({ status })
  const isForbidden = isAuthError(error)

  return (
    <AppShell>
      <PageHeader
        title="Incidents"
        description="Triage incidents the AI has logged from chat — acknowledge, comment, close."
      />

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          {isForbidden ? (
            <EmptyState
              icon={ShieldCheck}
              title="Incident triage is restricted"
              description="Only owners and managers can review incidents. Ask your owner for a role upgrade if you need access."
            />
          ) : (
            <>
              <Tabs
                items={FILTERS}
                value={filter}
                onValueChange={setFilter}
                ariaLabel="Filter incidents"
                trailing={
                  data ? (
                    <span className="text-foreground/55 text-xs tabular-nums">
                      {data.openCount} open
                    </span>
                  ) : null
                }
              />
              <div className="mt-5">
                {isLoading ? (
                  <ListSkeleton />
                ) : error ? (
                  <EmptyState
                    icon={AlertTriangle}
                    title="Couldn't load incidents"
                    description={errorDetail(error)}
                  />
                ) : !data || data.incidents.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="Nothing to triage"
                    description={
                      filter === 'open'
                        ? "No open incidents. You'll see them here as the AI logs them from chat."
                        : 'No incidents match this filter.'
                    }
                  />
                ) : (
                  <ul className="space-y-5">
                    {data.incidents.map((incident) => (
                      <IncidentCard key={incident.id} incident={incident} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

// ──────────────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────────────

function IncidentCard({ incident }: { incident: Incident }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const del = useDeleteIncident()

  const handleDelete = async () => {
    try {
      await del.mutateAsync(incident.id)
      toast.success('Incident deleted')
    } catch (err) {
      toast.error(`Couldn't delete: ${apiErrorLabel(err)}`)
      throw err
    }
  }

  return (
    <li>
      <Card className="group/card overflow-hidden">
        <CardContent className="p-0">
          {/* ── Header ─────────────────────────────────────── */}
          <div className="space-y-3 px-6 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
                <span className="text-foreground/55 text-xs">{incident.venueName}</span>
                <span className="text-foreground/35 text-xs" aria-hidden>
                  ·
                </span>
                <time
                  dateTime={incident.createdAt}
                  className="text-foreground/55 text-xs tabular-nums"
                  title={new Date(incident.createdAt).toLocaleString()}
                >
                  {formatRelative(incident.createdAt)}
                </time>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {incident.sourceConversationId ? (
                  <Link
                    href={`/chat?venue=${incident.venueId}&conv=${incident.sourceConversationId}`}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md text-foreground/55 text-xs transition-colors hover:text-foreground"
                    aria-label="View source conversation"
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                    Source
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </Link>
                ) : null}

                {/* Card actions menu — hover-revealed on pointer devices, */}
                {/* always visible on focus / touch. Mirrors the pattern in */}
                {/* conversations-view.tsx for delete-affordance. */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Incident actions"
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 group-hover/card:opacity-100 data-[state=open]:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[180px]">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setConfirmOpen(true)
                      }}
                      className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/30"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden />
                      Delete incident
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <p className="text-[15px] text-foreground leading-relaxed">{incident.summary}</p>
            <p className="text-foreground/50 text-xs">
              Logged by{' '}
              <span className="text-foreground/75">
                {incident.loggedBy?.name ?? incident.loggedBy?.email ?? 'unknown user'}
              </span>
            </p>
          </div>

          <div className="px-6 pt-5">
            <div className="h-px bg-border/60" aria-hidden />
          </div>

          {/* ── Activity + composer ───────────────────────── */}
          <Activity incident={incident} />
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this incident?"
        description={
          <span>
            This permanently removes the incident, its full audit trail, and all comments. The
            action can't be undone.
          </span>
        }
        confirmLabel="Delete incident"
        isPending={del.isPending}
        onConfirm={handleDelete}
      />
    </li>
  )
}

// ──────────────────────────────────────────────────────────────────
// Activity feed + composer
// ──────────────────────────────────────────────────────────────────

function Activity({ incident }: { incident: Incident }) {
  const { data, isLoading, error } = useIncidentComments(incident.id, true)
  const add = useAddIncidentComment(incident.id)
  const update = useUpdateIncidentStatus()
  const [body, setBody] = useState('')

  const rows = data?.comments ?? []
  const isClosed = incident.status === 'closed'
  const isOpen = incident.status === 'open'
  const trimmed = body.trim()
  const hasBody = trimmed.length > 0
  const anyPending = add.isPending || update.isPending

  const postComment = async () => {
    if (!hasBody || anyPending) return
    try {
      await add.mutateAsync(trimmed)
      setBody('')
    } catch (err) {
      toast.error(`Couldn't post comment: ${apiErrorLabel(err)}`)
    }
  }

  const commentAndClose = async () => {
    if (!hasBody || anyPending) return
    try {
      await update.mutateAsync({ id: incident.id, status: 'closed', resolution: trimmed })
      setBody('')
    } catch (err) {
      toast.error(`Couldn't close incident: ${apiErrorLabel(err)}`)
    }
  }

  const acknowledge = () => {
    if (anyPending) return
    update.mutate(
      { id: incident.id, status: 'acknowledged' },
      { onError: (err) => toast.error(`Couldn't acknowledge: ${apiErrorLabel(err)}`) },
    )
  }

  const reopen = () => {
    update.mutate(
      { id: incident.id, status: 'open' },
      { onError: (err) => toast.error(`Couldn't reopen: ${apiErrorLabel(err)}`) },
    )
  }

  const hasFeed = isLoading || Boolean(error) || rows.length > 0

  return (
    <>
      {/* Activity feed — only renders when something exists. Keeps the */}
      {/* empty state quiet rather than showing "No comments yet" filler. */}
      {hasFeed ? (
        <div className="space-y-4 px-6 py-5">
          {isLoading && rows.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error ? (
            <p className="text-destructive text-xs">Couldn't load activity. Try refreshing.</p>
          ) : (
            // Shopify-admin-style timeline. Single column, thin left rail,
            // dot-on-rail per entry. No bubbles, no avatars, no left/right
            // split — typography hierarchy carries the difference between
            // a system event and a comment.
            <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border/60">
              {rows.map((c) =>
                c.kind === 'status_change' ? (
                  <StatusEvent key={c.id} comment={c} />
                ) : (
                  <CommentRow key={c.id} comment={c} incidentId={incident.id} />
                ),
              )}
            </ol>
          )}
        </div>
      ) : null}

      {/* Composer */}
      <div
        className={cn(
          'bg-muted/15 px-6 py-5',
          hasFeed ? 'border-border/60 border-t' : 'border-border/60 border-t',
        )}
      >
        {isClosed ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-foreground/55 text-xs">
              This incident is closed. Reopen to add new comments.
            </p>
            <button
              type="button"
              onClick={reopen}
              disabled={update.isPending}
              className={CHIP_CLASS}
            >
              {update.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
              Reopen
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              postComment()
            }}
            className="space-y-3"
          >
            <textarea
              id={`composer-${incident.id}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment for the team…"
              rows={2}
              maxLength={2000}
              disabled={anyPending}
              aria-label="New comment"
              className="max-h-48 min-h-[3rem] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm leading-relaxed placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand/20"
            />

            {/* Action row. Left: status-only actions (no body required). */}
            {/* Right: send actions, both require body. Counter sits between. */}
            <div className="flex flex-wrap items-center gap-2">
              {isOpen ? (
                <button
                  type="button"
                  onClick={acknowledge}
                  disabled={anyPending}
                  className={CHIP_CLASS}
                  title="Mark this as acknowledged (no comment required)"
                >
                  {update.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Acknowledge
                </button>
              ) : null}

              <span className="ml-auto inline-flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-foreground/40 tabular-nums">
                  {body.length}/2000
                </span>
                <button
                  type="button"
                  onClick={commentAndClose}
                  disabled={!hasBody || anyPending}
                  className={CHIP_DANGER_CLASS}
                  title={
                    hasBody
                      ? 'Post your comment as the resolution and close this incident'
                      : 'Write a resolution to close this incident'
                  }
                >
                  {update.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Comment &amp; close
                </button>
                <button
                  type="submit"
                  disabled={!hasBody || anyPending}
                  className={CHIP_PRIMARY_CLASS}
                >
                  {add.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : null}
                  Comment
                </button>
              </span>
            </div>
          </form>
        )}
      </div>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────
// Timeline entries
// ──────────────────────────────────────────────────────────────────

// Marker dot that sits on the timeline rail. `bg-background` + a thick
// border masks the rail line where it passes through, so the rail visually
// "ducks under" each event — same trick Shopify uses on its order timeline.
function RailDot({ tone = 'muted' }: { tone?: 'muted' | 'solid' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 bg-background',
        tone === 'solid' ? 'border-foreground/70' : 'border-foreground/35',
      )}
    />
  )
}

function StatusEvent({ comment }: { comment: IncidentComment }) {
  const meta = comment.meta as { from?: string; to?: string }
  const author = comment.author?.name ?? comment.author?.email ?? 'Someone'
  const verb = describeTransition(meta.from, meta.to)
  return (
    <li className="flex gap-4 pl-1">
      <RailDot tone="muted" />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <p className="min-w-0 flex-1 text-sm text-foreground/70">
          <span className="font-medium text-foreground/90">{author}</span> {verb}
        </p>
        <time
          dateTime={comment.createdAt}
          className="shrink-0 text-foreground/45 text-xs tabular-nums"
          title={new Date(comment.createdAt).toLocaleString()}
        >
          {formatRelative(comment.createdAt)}
        </time>
      </div>
    </li>
  )
}

/// Human-readable summary of a status transition. We resolve the common
/// open→ack / ack→closed paths to single verbs ("acknowledged", "closed")
/// so the timeline reads like prose rather than "moved from X to Y" every
/// row. Falls back to the generic phrasing for unusual transitions
/// (e.g. owner reopening a closed incident).
function describeTransition(from: string | undefined, to: string | undefined): string {
  if (to === 'acknowledged') return 'acknowledged this incident'
  if (to === 'closed') return 'closed this incident'
  if (to === 'open' && from === 'closed') return 'reopened this incident'
  if (to && from) return `moved this from ${from} to ${to}`
  return 'updated this incident'
}

function CommentRow({ comment, incidentId }: { comment: IncidentComment; incidentId: string }) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? null
  const fromMe = currentUserId !== null && comment.author?.userId === currentUserId

  const del = useDeleteIncidentComment(incidentId)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const author = comment.author?.name ?? comment.author?.email ?? 'Unknown'

  return (
    <li className="group/comment flex gap-4 pl-1">
      <RailDot tone="solid" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium text-foreground text-sm">{author}</span>
          <time
            dateTime={comment.createdAt}
            className="shrink-0 text-foreground/50 text-xs tabular-nums"
            title={new Date(comment.createdAt).toLocaleString()}
          >
            {formatRelative(comment.createdAt)}
          </time>
          {fromMe ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              aria-label="Delete comment"
              className="ml-auto inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground/35 opacity-0 transition-opacity hover:bg-muted hover:text-destructive focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 group-hover/comment:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        <p className="whitespace-pre-wrap break-words text-[14px] text-foreground/90 leading-relaxed">
          {comment.body}
        </p>
      </div>

      {fromMe ? (
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete this comment?"
          description="This permanently removes your comment from the audit trail."
          confirmLabel="Delete comment"
          isPending={del.isPending}
          onConfirm={async () => {
            try {
              await del.mutateAsync(comment.id)
              toast.success('Comment deleted')
            } catch (err) {
              toast.error(`Couldn't delete: ${apiErrorLabel(err)}`)
              throw err
            }
          }}
        />
      ) : null}
    </li>
  )
}

// ──────────────────────────────────────────────────────────────────
// Badges, skeletons, utils
// ──────────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <ul className="space-y-5">
      {['a', 'b', 'c'].map((k) => (
        <li key={k}>
          <Skeleton className="h-64 w-full rounded-lg" />
        </li>
      ))}
    </ul>
  )
}

function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const meta =
    severity === 'critical'
      ? { label: 'Critical', className: 'bg-chart-3/15 text-chart-3 border-chart-3/30' }
      : severity === 'major'
        ? { label: 'Major', className: 'bg-chart-2/15 text-chart-2 border-chart-2/30' }
        : { label: 'Minor', className: 'bg-muted text-muted-foreground border-border' }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider',
        meta.className,
      )}
    >
      <AlertTriangle className="h-3 w-3" aria-hidden />
      {meta.label}
    </span>
  )
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const meta =
    status === 'open'
      ? { label: 'Open', className: 'bg-chart-3/10 text-chart-3' }
      : status === 'acknowledged'
        ? { label: 'Acknowledged', className: 'bg-chart-2/15 text-chart-2' }
        : { label: 'Closed', className: 'bg-chart-1/15 text-chart-1' }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}

function isAuthError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const status = (e as { status?: number }).status
  return status === 401 || status === 403
}

function errorDetail(e: unknown): string {
  if (!e || typeof e !== 'object') return 'Try refreshing the page.'
  const status = (e as { status?: number }).status
  if (status === 404) {
    return 'The incidents endpoint is not available — the API server may need restarting after this update.'
  }
  if (status && status >= 500) {
    return `The incidents API returned ${status}. Check the API logs.`
  }
  return 'The incidents API request failed. Try refreshing; if it persists, check the API logs.'
}
