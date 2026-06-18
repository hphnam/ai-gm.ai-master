import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import type { ModelMessage } from 'ai'
import { prisma } from '../../database/prisma'
import {
  buildGmAgent,
  type VenueContactSummary,
  type VenueProfileContext,
  type VenueSnapshot,
} from '../chat/gm-agent'
import { ToolDispatcher } from '../chat/tool-dispatcher'
import { IntegrationRegistry } from '../integrations/integration-registry'
import {
  buildReportUserMessage,
  inspectReportToolResult,
  sanitiseForSystemPrompt,
} from './report-generator-helpers'

const GENERATE_TIMEOUT_MS = 90_000

export type GenerateInput = {
  scheduleId: string
  orgId: string
  userId: string
  venueId: string | null
  title: string
  summary: string | null
  prompt: string | null
}

export type GenerateResult = {
  reportId: string | null
  /// Machine-readable failure code when reportId is null:
  ///   - 'no-venue'        : org has no venues at all
  ///   - 'venue-missing'   : schedule's venueId no longer points to a row in the org
  ///   - 'multi-venue'     : org-wide schedule but >1 venue — agent would silently pick one
  ///   - 'no-membership'   : creator is no longer a member of the org
  ///   - 'no-tool-call'    : agent finished without calling generate_report
  ///   - 'tool-failed'     : agent called generate_report but the dispatcher returned ok=false
  ///   - 'timeout'         : 90s wallclock exceeded (agent aborted)
  ///   - 'agent-error'     : agent.generate threw
  failure: string | null
}

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name)

  constructor(
    @Inject(forwardRef(() => ToolDispatcher))
    private readonly dispatcher: ToolDispatcher,
    private readonly integrations: IntegrationRegistry,
  ) {}

  /// Headless agent invocation for a scheduled fire. Builds the same agent the
  /// chat path uses but skips streaming, conversation persistence, and
  /// post-answer follow-up. The agent's `generate_report` tool creates the
  /// Report row inside its dispatch — we capture the id via onStepFinish so
  /// the caller doesn't have to walk message history.
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const venueResolution = await this.resolveVenue(input.orgId, input.venueId)
    if (venueResolution.failure) {
      this.logger.warn(
        JSON.stringify({
          event: 'report-generator.venue-failure',
          scheduleId: input.scheduleId,
          orgId: input.orgId,
          failure: venueResolution.failure,
        }),
      )
      return { reportId: null, failure: venueResolution.failure }
    }
    const venue = venueResolution.venue

    // Membership check: a creator removed from the org since the schedule was
    // created should NOT run as 'manager' (silent escalation surface for any
    // future role-gated tool). Skip the fire — the schedule survives, but
    // this slot is a no-op.
    const userRole = await this.loadUserRole(input.userId, input.orgId)
    if (userRole === null) {
      this.logger.warn(
        JSON.stringify({
          event: 'report-generator.no-membership',
          scheduleId: input.scheduleId,
          orgId: input.orgId,
          userId: input.userId,
        }),
      )
      return { reportId: null, failure: 'no-membership' }
    }

    const [contacts, snapshot, userIdentity] = await Promise.all([
      this.loadVenueContacts(venue.id),
      this.loadVenueSnapshot(input.orgId, venue.id),
      this.loadUserIdentity(input.userId),
    ])

    let capturedReportId: string | null = null
    let toolFailureSeen: string | null = null

    // AbortController plumbed into agent.generate so the timeout actually
    // cancels the Anthropic call + any in-flight tool work. Without this,
    // Promise.race only abandons the winning branch — the model keeps
    // billing and onStepFinish keeps firing past the timeout.
    const controller = new AbortController()

    const agent = buildGmAgent({
      dispatcher: this.dispatcher,
      integrations: this.integrations,
      ctx: {
        orgId: input.orgId,
        userId: input.userId,
        userRole,
        source: 'chat',
      },
      venueContext: {
        id: venue.id,
        // Sanitise names that flow into the system prompt's <current_context>.
        // Today the only writer for venue.name is the org's own managers, so
        // this is mostly belt-and-braces — but if a tool ever grows side
        // effects on free-text args, embedded \n / <tag> in a name should
        // not be able to forge new prompt structure.
        name: sanitiseForSystemPrompt(venue.name),
        timezone: venue.timezone,
        address: venue.address,
        type: venue.type,
        profile: venue.profile,
        contacts,
      },
      userContext: {
        name: userIdentity.name ? sanitiseForSystemPrompt(userIdentity.name) : null,
        email: userIdentity.email,
      },
      mode: 'default',
      venueSnapshot: snapshot,
      onStepFinish: (step) => {
        if (capturedReportId) return
        for (const tr of step.toolResults ?? []) {
          const verdict = inspectReportToolResult(tr.toolName, tr.output)
          if (verdict.kind === 'success') {
            capturedReportId = verdict.reportId
            // Best-effort abort — the agent's stopWhen also catches this
            // step, but signalling here cuts any post-step network churn.
            controller.abort()
            return
          }
          if (verdict.kind === 'failed') {
            toolFailureSeen = verdict.message ?? 'tool-failed'
          }
        }
      },
    })

    const userMessage = buildReportUserMessage({
      title: input.title,
      summary: input.summary,
      prompt: input.prompt,
      venueName: venue.name,
      hasVenueScope: input.venueId !== null,
    })
    const messages: ModelMessage[] = [{ role: 'user', content: userMessage }]

    let timeoutTimer: ReturnType<typeof setTimeout> | null = null
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        controller.abort()
        reject(new Error('report-generator-timeout'))
      }, GENERATE_TIMEOUT_MS)
    })

    try {
      const result = (await Promise.race([
        agent.generate({ messages, abortSignal: controller.signal }),
        timeoutPromise,
      ])) as Awaited<ReturnType<typeof agent.generate>>

      // Cost telemetry — same shape ChatService logs from chat.cache_observed.
      const usage = result.usage as
        | {
            inputTokens?: number
            outputTokens?: number
            inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number }
          }
        | undefined
      this.logger.log(
        JSON.stringify({
          event: 'report-generator.finished',
          scheduleId: input.scheduleId,
          reportId: capturedReportId,
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          cacheReadTokens: usage?.inputTokenDetails?.cacheReadTokens ?? 0,
        }),
      )

      if (capturedReportId) {
        return { reportId: capturedReportId, failure: null }
      }
      if (toolFailureSeen) {
        this.logger.warn(
          JSON.stringify({
            event: 'report-generator.tool-failed',
            scheduleId: input.scheduleId,
            message: toolFailureSeen,
          }),
        )
        return { reportId: null, failure: 'tool-failed' }
      }
      return { reportId: null, failure: 'no-tool-call' }
    } catch (err) {
      // Aborts are the expected signal from our own controller — translate
      // to a clean 'timeout'/'agent-error' code rather than surfacing the
      // raw AbortError.
      const message = (err as Error).message ?? 'unknown'
      let failure: string
      if (message === 'report-generator-timeout' || (err as Error).name === 'AbortError') {
        failure = 'timeout'
      } else {
        failure = 'agent-error'
      }
      this.logger.warn(
        JSON.stringify({
          event: 'report-generator.failed',
          scheduleId: input.scheduleId,
          failure,
          message,
        }),
      )
      return { reportId: capturedReportId, failure }
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer)
      // Defensive: ensure no orphan handle keeps the event loop alive
      // even if generate() returned synchronously.
      if (!controller.signal.aborted) controller.abort()
    }
  }

  /// Resolves the venue context for the run. A venue-scoped schedule must
  /// point to a still-existing venue in the org; an org-wide schedule auto-
  /// uses the org's only venue. Multi-venue org-wide schedules fail loud
  /// rather than silently pick "whichever venue prisma returned first" —
  /// because every venue-scoped tool (pos_*, log_incident, …) would then
  /// produce numbers for that arbitrary venue with no indication.
  private async resolveVenue(
    orgId: string,
    venueId: string | null,
  ): Promise<
    | {
        venue: ResolvedVenue
        failure: null
      }
    | { venue: null; failure: 'venue-missing' | 'no-venue' | 'multi-venue' }
  > {
    if (venueId) {
      const venue = await prisma.venue.findFirst({
        where: { id: venueId, organizationId: orgId },
        select: VENUE_SELECT,
      })
      if (!venue) return { venue: null, failure: 'venue-missing' }
      return { venue: toResolvedVenue(venue), failure: null }
    }
    const venues = await prisma.venue.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
      select: VENUE_SELECT,
      take: 2,
    })
    if (venues.length === 0) return { venue: null, failure: 'no-venue' }
    if (venues.length > 1) return { venue: null, failure: 'multi-venue' }
    return { venue: toResolvedVenue(venues[0]), failure: null }
  }

  private async loadVenueContacts(venueId: string): Promise<VenueContactSummary[]> {
    return prisma.venueContact.findMany({
      where: { venueId },
      select: { name: true, role: true, phone: true, email: true, isEmergencyContact: true },
      orderBy: [{ isEmergencyContact: 'desc' }, { role: 'asc' }, { name: 'asc' }],
      take: 12,
    })
  }

  /// Mirrors ChatService.buildVenueSnapshot in shape. Duplicated rather than
  /// shared because a shared loader module would force a circular import
  /// between chat and scheduled-reports — and the logic is small + stable.
  private async loadVenueSnapshot(orgId: string, venueId: string): Promise<VenueSnapshot> {
    try {
      const rows = await prisma.knowledgeItem.findMany({
        where: {
          organizationId: orgId,
          OR: [{ venueId }, { venueId: null }],
          answerStatus: 'answered',
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 48,
        select: { id: true, content: true, aiSummary: true, metadata: true },
      })

      const topKnowledge: VenueSnapshot['topKnowledge'] = []
      const recentlyAnswered: VenueSnapshot['recentlyAnswered'] = []
      const tabularDocs: VenueSnapshot['tabularDocs'] = []
      let orgChartDoc: VenueSnapshot['orgChartDoc']

      for (const r of rows) {
        const meta = (r.metadata ?? {}) as Record<string, unknown>
        const docType = typeof meta.docType === 'string' ? meta.docType : null
        const docPurpose = typeof meta.docPurpose === 'string' ? meta.docPurpose : null
        const title =
          typeof meta.title === 'string' && meta.title.trim().length > 0
            ? meta.title.trim()
            : r.content.replace(/\s+/g, ' ').trim().slice(0, 80)
        const summary = (r.aiSummary ?? r.content).replace(/\s+/g, ' ').trim().slice(0, 240)

        if (docPurpose === 'org_chart' && !orgChartDoc) {
          const stripped = r.content.replace(/^Context from uploader: [\s\S]*?\n\n---\n\n/, '')
          const content = stripped.trim().slice(0, 2000)
          orgChartDoc = { id: r.id, title, content }
          continue
        }
        if (docType === 'tabular') {
          if (tabularDocs.length < 16) tabularDocs.push({ id: r.id, title })
          continue
        }
        if (meta.isGap === true) {
          const tentative = typeof meta.tentativeAnswer === 'string' ? meta.tentativeAnswer : null
          const answer = r.aiSummary && r.aiSummary.trim().length > 0 ? r.aiSummary : tentative
          if (answer && recentlyAnswered.length < 10) {
            recentlyAnswered.push({
              question: r.content.replace(/\s+/g, ' ').trim().slice(0, 200),
              answer: answer.replace(/\s+/g, ' ').trim().slice(0, 320),
            })
          }
          continue
        }
        if (topKnowledge.length < 20) {
          topKnowledge.push({ id: r.id, title, summary })
        }
      }
      return { topKnowledge, recentlyAnswered, tabularDocs, orgChartDoc }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'report-generator.snapshot-failed',
          message: (err as Error).message,
        }),
      )
      return {}
    }
  }

  /// Returns the user's role in the org, or null if the membership row is
  /// missing. Caller MUST treat null as "skip this fire" — never default to
  /// a role string. Defaulting to 'manager' (or even 'staff') would let a
  /// stale schedule run after the creator was removed, with role-gated
  /// tools (save_knowledge_doc, add_supplier_note, …) becoming reachable
  /// against an org the user no longer belongs to.
  private async loadUserRole(userId: string, orgId: string): Promise<string | null> {
    const member = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      select: { role: true },
    })
    return member?.role ?? null
  }

  private async loadUserIdentity(userId: string): Promise<{ name: string | null; email: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })
    return { name: user?.name ?? null, email: user?.email ?? '' }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const VENUE_SELECT = {
  id: true,
  name: true,
  timezone: true,
  address: true,
  type: true,
  profile: true,
} as const

type ResolvedVenue = {
  id: string
  name: string
  timezone: string
  address: string | null
  type: string | null
  profile: VenueProfileContext | null
}

function toResolvedVenue(row: {
  id: string
  name: string
  timezone: string
  address: string | null
  type: string | null
  profile: unknown
}): ResolvedVenue {
  const p = (row.profile ?? null) as Record<string, unknown> | null
  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    address: row.address,
    type: row.type,
    profile: p
      ? {
          layoutNotes: typeof p.layoutNotes === 'string' ? p.layoutNotes : null,
          fireEscapes: Array.isArray(p.fireEscapes) ? (p.fireEscapes as string[]) : null,
          firstAidPoints: Array.isArray(p.firstAidPoints) ? (p.firstAidPoints as string[]) : null,
          keySafePolicy: typeof p.keySafePolicy === 'string' ? p.keySafePolicy : null,
          alarmPolicy: typeof p.alarmPolicy === 'string' ? p.alarmPolicy : null,
          openingHours: typeof p.openingHours === 'string' ? p.openingHours : null,
          what3words: typeof p.what3words === 'string' ? p.what3words : null,
          accessibilityNotes:
            typeof p.accessibilityNotes === 'string' ? p.accessibilityNotes : null,
          deliveryNotes: typeof p.deliveryNotes === 'string' ? p.deliveryNotes : null,
        }
      : null,
  }
}
