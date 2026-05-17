import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { IncidentLog as PrismaIncidentLog } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { NotificationsService } from '../notifications/notifications.service'
import type { IncidentCommentKind, IncidentSeverity, IncidentStatus } from './dto/incidents.dto'

export type IncidentParty = {
  userId: string
  name: string | null
  email: string | null
}

export type IncidentRow = {
  id: string
  organizationId: string
  venueId: string
  venueName: string
  severity: IncidentSeverity
  status: IncidentStatus
  summary: string
  loggedBy: IncidentParty | null
  sourceMessageId: string | null
  sourceConversationId: string | null
  details: Record<string, unknown>
  /// Total comments + status_change entries on the thread. Surfaced on the
  /// list view so the triage UI can show "3 comments" without N×fetch.
  commentCount: number
  createdAt: string
  updatedAt: string
}

type IncidentWithRelations = PrismaIncidentLog & {
  venue: { id: string; name: string }
  loggedBy: { id: string; name: string | null; email: string | null } | null
  sourceMessage: { id: string; conversationId: string } | null
  commentCount: number
}

export type IncidentCommentRow = {
  id: string
  incidentId: string
  kind: IncidentCommentKind
  body: string
  meta: Record<string, unknown>
  author: IncidentParty | null
  createdAt: string
}

// Per-author per-incident throttle on comment writes. Mirrors the
// notification reply limiter — single-process token bucket, fine for the
// current Nest server. Spam vector here is a participant flooding an
// incident thread; 12/min is well above any human pace.
const COMMENT_WINDOW_MS = 60_000
const COMMENT_LIMIT_PER_WINDOW = 12
const commentRateLimit = (() => {
  const buckets = new Map<string, number[]>()
  return {
    allow(authorUserId: string, incidentId: string): boolean {
      const key = `${authorUserId}:${incidentId}`
      const now = Date.now()
      const cutoff = now - COMMENT_WINDOW_MS
      const recent = (buckets.get(key) ?? []).filter((t) => t > cutoff)
      if (recent.length >= COMMENT_LIMIT_PER_WINDOW) {
        buckets.set(key, recent)
        return false
      }
      recent.push(now)
      buckets.set(key, recent)
      // Probabilistic sweep — every ~100th call, drop buckets whose newest
      // entry is already past the window so the Map doesn't grow without
      // bound across a long-lived process. (author × incident) pairs touched
      // once and never again would otherwise live forever.
      if (Math.random() < 0.01) {
        for (const [k, ts] of buckets) {
          if (ts.length === 0 || ts[ts.length - 1]! <= cutoff) buckets.delete(k)
        }
      }
      return true
    },
  }
})()

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name)

  constructor(private readonly notifications: NotificationsService) {}

  /// Lists incidents for an org. Filterable by status, severity, venue.
  /// Always returns the open-count alongside so the UI can render a badge
  /// independently of the filter the caller applied.
  async list(
    orgId: string,
    opts: {
      status?: IncidentStatus
      severity?: IncidentSeverity
      venueId?: string
      limit: number
    },
  ): Promise<{ incidents: IncidentRow[]; openCount: number; criticalOpenCount: number }> {
    const [rows, openCount, criticalOpenCount] = await Promise.all([
      prisma.incidentLog.findMany({
        where: {
          organizationId: orgId,
          ...(opts.status ? { status: opts.status } : {}),
          ...(opts.severity ? { severity: opts.severity } : {}),
          ...(opts.venueId ? { venueId: opts.venueId } : {}),
        },
        // Newest-first. We deliberately do NOT order by status — lexical
        // status ordering ('acknowledged' < 'closed' < 'open') pushes the
        // urgent rows to the bottom on the "All" filter. The dedicated
        // status-filter tabs cover the "I only want open" workflow; on the
        // unified view, recency is the natural reading order.
        orderBy: { createdAt: 'desc' },
        take: opts.limit,
        include: {
          venue: { select: { id: true, name: true } },
          // _count rolls up the comment thread length so the list pane can
          // render "N comments" without firing N follow-up queries.
          _count: { select: { comments: true } },
          // Manual join — IncidentLog.loggedByUserId is nullable and has no
          // FK relation, so we use a raw lookup. Same pattern is used by the
          // notes/tasks paths.
        },
      }),
      prisma.incidentLog.count({
        where: { organizationId: orgId, status: 'open' },
      }),
      // Urgent signal for the sidebar badge — any critical open incident lights
      // the amber dot. Cheaper than overfetching the list to inspect severity.
      prisma.incidentLog.count({
        where: { organizationId: orgId, status: 'open', severity: 'critical' },
      }),
    ])

    const userIds = Array.from(
      new Set(rows.map((r) => r.loggedByUserId).filter((x): x is string => Boolean(x))),
    )
    const messageIds = Array.from(
      new Set(rows.map((r) => r.sourceMessageId).filter((x): x is string => Boolean(x))),
    )
    const [users, sourceMessages] = await Promise.all([
      userIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([] as Array<{ id: string; name: string | null; email: string }>),
      messageIds.length > 0
        ? prisma.chatMessage.findMany({
            where: { id: { in: messageIds } },
            select: { id: true, conversationId: true },
          })
        : Promise.resolve([] as Array<{ id: string; conversationId: string }>),
    ])
    const userById = new Map(users.map((u) => [u.id, u]))
    const messageById = new Map(sourceMessages.map((m) => [m.id, m]))

    return {
      incidents: rows.map((r) =>
        toRow({
          ...r,
          venue: r.venue,
          loggedBy: r.loggedByUserId ? (userById.get(r.loggedByUserId) ?? null) : null,
          sourceMessage: r.sourceMessageId ? (messageById.get(r.sourceMessageId) ?? null) : null,
          commentCount: r._count.comments,
        } as IncidentWithRelations),
      ),
      openCount,
      criticalOpenCount,
    }
  }

  /// Single-incident fetch. Returns 404 when the incident is not in the
  /// caller's org — uniform with the not-found case so the endpoint can't
  /// double as a cross-tenant existence oracle.
  async getOne(orgId: string, id: string): Promise<IncidentRow> {
    const row = await prisma.incidentLog.findFirst({
      where: { id, organizationId: orgId },
      include: {
        venue: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    })
    if (!row) throw new NotFoundException({ error: 'incident-not-found' })
    const [loggedBy, sourceMessage] = await Promise.all([
      row.loggedByUserId
        ? prisma.user.findUnique({
            where: { id: row.loggedByUserId },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve(null),
      row.sourceMessageId
        ? prisma.chatMessage.findUnique({
            where: { id: row.sourceMessageId },
            select: { id: true, conversationId: true },
          })
        : Promise.resolve(null),
    ])
    return toRow({
      ...row,
      venue: row.venue,
      loggedBy,
      sourceMessage,
      commentCount: row._count.comments,
    } as IncidentWithRelations)
  }

  /// Status transition. The state machine is one-way (open → acknowledged →
  /// closed) only at the UX layer; the API accepts any → any transition so
  /// an owner can reopen if needed. Audit-logged for SOC-2 traceability and
  /// also writes a `status_change` entry to the incident thread so the
  /// timeline view stays the single source of truth — no need to cross-ref
  /// app logs to see who closed what. Closing requires a non-empty
  /// resolution; the resolution lands as a regular `comment` row so the
  /// thread reads naturally.
  async updateStatus(
    orgId: string,
    id: string,
    newStatus: IncidentStatus,
    actorUserId: string,
    resolution?: string,
  ): Promise<IncidentRow> {
    const trimmedResolution = resolution?.trim() ?? ''
    const existing = await prisma.incidentLog.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, status: true },
    })
    if (!existing) throw new NotFoundException({ error: 'incident-not-found' })
    // Resolution gate runs only on an *actual* transition into `closed`. A
    // no-op PATCH (already-closed → closed) is idempotent: returns the
    // current row without writing anything or demanding a body.
    if (existing.status !== newStatus && newStatus === 'closed' && trimmedResolution.length === 0) {
      throw new BadRequestException({ error: 'resolution-required-to-close' })
    }
    if (existing.status !== newStatus) {
      await prisma.$transaction([
        prisma.incidentLog.update({
          where: { id },
          data: { status: newStatus },
        }),
        prisma.incidentComment.create({
          data: {
            incidentId: id,
            authorUserId: actorUserId,
            kind: 'status_change',
            body: `Status changed from ${existing.status} to ${newStatus}.`,
            meta: { from: existing.status, to: newStatus },
          },
        }),
        ...(newStatus === 'closed' && trimmedResolution.length > 0
          ? [
              prisma.incidentComment.create({
                data: {
                  incidentId: id,
                  authorUserId: actorUserId,
                  kind: 'comment',
                  body: trimmedResolution,
                  meta: { closingResolution: true },
                },
              }),
            ]
          : []),
      ])
      this.logger.log(
        JSON.stringify({
          event: 'incident.status_changed',
          incidentId: id,
          orgId,
          actorUserId,
          from: existing.status,
          to: newStatus,
          resolutionLength: newStatus === 'closed' ? trimmedResolution.length : undefined,
        }),
      )
    }
    return this.getOne(orgId, id)
  }

  /// Thread reader. Oldest-first matches how every other thread in the app
  /// renders (notes replies, chat). Scoped to the caller's org via the
  /// parent incident — same 404-on-cross-tenant treatment as getOne.
  async listComments(orgId: string, incidentId: string): Promise<IncidentCommentRow[]> {
    const parent = await prisma.incidentLog.findFirst({
      where: { id: incidentId, organizationId: orgId },
      select: { id: true },
    })
    if (!parent) throw new NotFoundException({ error: 'incident-not-found' })
    const rows = await prisma.incidentComment.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        incidentId: true,
        kind: true,
        body: true,
        meta: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true } },
      },
    })
    return rows.map(toCommentRow)
  }

  /// GM-authored comment on an incident. Manager+owner gate is enforced at
  /// the controller; this method also enforces that closed incidents are
  /// frozen (reopen first if you want to add new context) so the audit trail
  /// reflects what was true at the moment of closure — and so the UI's
  /// "composer hidden when closed" gate isn't trivially bypassable via raw
  /// API calls.
  async addComment(
    orgId: string,
    incidentId: string,
    authorUserId: string,
    body: string,
  ): Promise<IncidentCommentRow> {
    const parent = await prisma.incidentLog.findFirst({
      where: { id: incidentId, organizationId: orgId },
      select: { id: true, status: true },
    })
    if (!parent) throw new NotFoundException({ error: 'incident-not-found' })
    if (parent.status === 'closed') {
      throw new BadRequestException({ error: 'incident-closed' })
    }
    if (!commentRateLimit.allow(authorUserId, incidentId)) {
      throw new HttpException({ error: 'comment-rate-limit' }, HttpStatus.TOO_MANY_REQUESTS)
    }
    let created: {
      id: string
      incidentId: string
      kind: string
      body: string
      meta: unknown
      createdAt: Date
      author: { id: string; name: string | null; email: string } | null
    }
    try {
      created = await prisma.incidentComment.create({
        data: { incidentId, authorUserId, kind: 'comment', body },
        select: {
          id: true,
          incidentId: true,
          kind: true,
          body: true,
          meta: true,
          createdAt: true,
          author: { select: { id: true, name: true, email: true } },
        },
      })
    } catch (err: unknown) {
      // The parent existence check above has a TOCTOU window — if the
      // incident is deleted between findFirst and create, the FK violation
      // would surface as a generic 500. Re-shape to the 404 the caller
      // would have seen if they were a tick later.
      if (err && typeof err === 'object' && (err as { code?: unknown }).code === 'P2003') {
        throw new NotFoundException({ error: 'incident-not-found' })
      }
      throw err
    }
    this.logger.log(
      JSON.stringify({
        event: 'incident.comment.created',
        orgId,
        incidentId,
        commentId: created.id,
        authorUserId,
        bodyLength: body.length,
      }),
    )
    return toCommentRow(created)
  }

  /// Permanent removal of an incident. Cascades to `incident_comments`
  /// (Prisma FK) so the audit thread goes with it. Manager+owner gated at
  /// the controller; this method only verifies org scope. Idempotent: a
  /// missing row throws 404, never silently succeeds, so the client doesn't
  /// race-delete and assume the row was theirs.
  async deleteOne(orgId: string, id: string, actorUserId: string): Promise<void> {
    const existing = await prisma.incidentLog.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, status: true, severity: true },
    })
    if (!existing) throw new NotFoundException({ error: 'incident-not-found' })
    await prisma.incidentLog.delete({ where: { id } })
    this.logger.log(
      JSON.stringify({
        event: 'incident.deleted',
        incidentId: id,
        orgId,
        actorUserId,
        priorStatus: existing.status,
        priorSeverity: existing.severity,
      }),
    )
  }

  /// Delete one comment off the thread. Author-only: the actor must be the
  /// row's author and the row must be a regular `comment` (status_change
  /// entries are system-attributed and immutable — they're the audit trail).
  /// Returns 404 on cross-tenant or wrong author so we don't leak existence.
  async deleteComment(input: {
    orgId: string
    incidentId: string
    commentId: string
    actorUserId: string
  }): Promise<void> {
    const parent = await prisma.incidentLog.findFirst({
      where: { id: input.incidentId, organizationId: input.orgId },
      select: { id: true },
    })
    if (!parent) throw new NotFoundException({ error: 'incident-not-found' })
    const row = await prisma.incidentComment.findFirst({
      where: { id: input.commentId, incidentId: input.incidentId },
      select: { id: true, authorUserId: true, kind: true },
    })
    // Collapse "wrong author" and "wrong kind" into 404 — keeps the existence
    // oracle closed (same treatment as cross-tenant access).
    if (!row || row.authorUserId !== input.actorUserId || row.kind !== 'comment') {
      throw new NotFoundException({ error: 'incident-comment-not-found' })
    }
    await prisma.incidentComment.delete({ where: { id: row.id } })
    this.logger.log(
      JSON.stringify({
        event: 'incident.comment.deleted',
        orgId: input.orgId,
        incidentId: input.incidentId,
        commentId: row.id,
        actorUserId: input.actorUserId,
      }),
    )
  }

  /// Back-fill IncidentLog.sourceMessageId for incidents created during a
  /// chat turn. The dispatcher runs BEFORE the assistant ChatMessage is
  /// persisted, so it can't write the messageId at create time — we do it
  /// here after chat.service.ts has the persisted id. Scoped to the org so a
  /// stray or crafted incidentId from the tool log can't update someone
  /// else's row. Silent no-op if there are no log_incident entries.
  async backfillSourceMessageIds(input: {
    orgId: string
    messageId: string
    toolCallLog: ReadonlyArray<unknown>
  }): Promise<void> {
    const incidentIds: string[] = []
    for (const entry of input.toolCallLog) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as { tool?: unknown; result?: unknown }
      if (e.tool !== 'log_incident') continue
      const r = e.result as { ok?: unknown; data?: unknown } | undefined
      if (!r || r.ok !== true) continue
      const id = (r.data as { id?: unknown } | undefined)?.id
      if (typeof id === 'string') incidentIds.push(id)
    }
    if (incidentIds.length === 0) return
    await prisma.incidentLog.updateMany({
      where: { id: { in: incidentIds }, organizationId: input.orgId },
      data: { sourceMessageId: input.messageId },
    })
  }

  /// Fan-out notification to every owner+manager in the org (excluding the
  /// logger themselves), driven by `log_incident` after the row is persisted.
  /// Called from the chat tool dispatcher — kept here so the dispatcher
  /// doesn't have to know about the notifications service or duplicate the
  /// owner+manager lookup. Critical-severity incidents include the severity
  /// in the body copy so the bell badge stands out.
  async notifyEscalation(input: {
    incidentId: string
    organizationId: string
    venueId: string
    venueName: string
    severity: IncidentSeverity
    summary: string
    loggedByUserId: string | null
    loggedByName: string | null
  }): Promise<void> {
    const recipients = await prisma.organizationMember.findMany({
      where: {
        organizationId: input.organizationId,
        role: { in: ['owner', 'manager'] },
        ...(input.loggedByUserId ? { userId: { not: input.loggedByUserId } } : {}),
      },
      select: { userId: true },
    })
    if (recipients.length === 0) return
    const severityTag = input.severity === 'critical' ? 'CRITICAL' : input.severity.toUpperCase()
    const author = input.loggedByName ?? 'a staff member'
    const safeSummary = sanitizeUntrustedText(input.summary)
    // The summary is staff/LLM-controlled text (the agent re-renders the
    // user's description into log_incident.summary). We quote it inside the
    // bell body with explicit delimiters so a recipient cannot mistake the
    // staff-supplied prose for a system instruction — and so embedded URLs
    // / control chars / newlines from a prompt-injection attempt can't
    // forge the surrounding "logged at … by …" frame. Renderer is already
    // plain-text (no markdown, no autolink), so this is defence in depth.
    const body = `${severityTag} incident logged at ${input.venueName} by ${author}: "${safeSummary}"`
    await Promise.all(
      recipients.map((r) =>
        this.notifications
          .composeSystem(input.organizationId, r.userId, body, {
            category: 'compliance',
            reference: { kind: 'incident', id: input.incidentId },
          })
          .catch((err: unknown) => {
            // A single recipient failing must not break the rest of the fan-out
            // or the parent tool call — we log and continue.
            this.logger.error(
              JSON.stringify({
                event: 'incident.notify.failed',
                incidentId: input.incidentId,
                recipientUserId: r.userId,
                error: err instanceof Error ? err.message : String(err),
              }),
            )
          }),
      ),
    )
  }
}

/// Untrusted-text scrubber for notification bodies. Strips:
///   - URL-shaped tokens (http://, https://, www., bare domain.tld/path) so an
///     attacker can't paste a phishing link into a staff-supplied incident
///     summary and have it broadcast verbatim to every owner/manager.
///   - Quote characters so the staff string can't escape the surrounding
///     "…" delimiters in the bell body.
///   - Control characters and newlines so the body stays single-line and
///     can't smuggle ANSI escapes into operator terminals or logs.
///   - Length cap (180 chars) keeps long pastes from dominating the bell
///     row; the full text remains available on /incidents/<id>.
// Strip ASCII control characters from staff-supplied text — collapsing
// newlines, tabs, and DEL into a single space so the bell body stays a
// single line and can't smuggle ANSI escapes into operator terminals.
const CONTROL_CHARS = /[\x00-\x1f\x7f]+/g

function sanitizeUntrustedText(s: string): string {
  const stripped = s
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link removed]')
    .replace(/\b[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?/gi, '[link removed]')
    .replace(/["“”]/g, "'")
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return stripped.length > 180 ? `${stripped.slice(0, 177)}…` : stripped
}

function toCommentRow(r: {
  id: string
  incidentId: string
  kind: string
  body: string
  meta: unknown
  createdAt: Date
  author: { id: string; name: string | null; email: string } | null
}): IncidentCommentRow {
  return {
    id: r.id,
    incidentId: r.incidentId,
    kind: r.kind as IncidentCommentKind,
    body: r.body,
    meta: (r.meta && typeof r.meta === 'object' ? r.meta : {}) as Record<string, unknown>,
    author: r.author ? { userId: r.author.id, name: r.author.name, email: r.author.email } : null,
    createdAt: r.createdAt.toISOString(),
  }
}

function toRow(r: IncidentWithRelations): IncidentRow {
  return {
    id: r.id,
    organizationId: r.organizationId,
    venueId: r.venueId,
    venueName: r.venue.name,
    severity: r.severity as IncidentSeverity,
    status: r.status as IncidentStatus,
    summary: r.summary,
    loggedBy: r.loggedBy
      ? {
          userId: r.loggedBy.id,
          name: r.loggedBy.name,
          email: r.loggedBy.email,
        }
      : null,
    sourceMessageId: r.sourceMessageId,
    sourceConversationId: r.sourceMessage?.conversationId ?? null,
    details: (r.details ?? {}) as Record<string, unknown>,
    commentCount: r.commentCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}
