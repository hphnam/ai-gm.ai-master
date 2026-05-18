// Plan 06-03 Task 1 — get_venue_briefing shaped tool.
//
// Pure function. Returns the structural source of "proactive" reasoning
// (CONTEXT.md D-06-A) — venue profile + contacts + recent incidents (last 24h)
// + upcoming supplier cutoffs (next 4h).
//
// audit-M1 — orgId positional, source of truth from session/auth ctx.
// Cross-tenant guard: venue.organizationId === orgId before any data fetch.
// audit-S4 — 4 internal Prisma queries fire via Promise.all (1×RTT vs 4×RTT).
// audit-S5 — mockOps.getUpcomingCutoffs no-data flattens to []; any other
// failure reason emits chat_core.tool.get_venue_briefing.cutoffs_failed warn.
// audit-M5 — uses stubClock() for "last 24h" / "next 4h" boundaries.

import type { PrismaClient } from '@prisma/client'
import {
  fail,
  type IncidentSummary,
  ok,
  type ToolResult,
  type VenueContactSummary,
  type VenueProfile,
} from '../../../types'
import { VenueProfileSchema } from '../../../types/api'
import type { MockUpcomingCutoff } from '../../mock-ops/mock-ops.service'
import { MockOpsService } from '../../mock-ops/mock-ops.service'
import { chatCoreLogger, hashId } from '../log-helpers'
import { stubClock } from '../stub-clock'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const FOUR_HOURS_HRS = 4
const MAX_CONTACTS = 8
const MAX_INCIDENTS = 5

export type CutoffSummary = MockUpcomingCutoff

export type VenueBriefing = {
  profile: VenueProfile
  contacts: VenueContactSummary[]
  recentIncidents: IncidentSummary[]
  upcomingCutoffs: CutoffSummary[]
}

export async function getVenueBriefing(
  orgId: string,
  venueId: string,
  prisma: PrismaClient,
  mockOps: MockOpsService,
): Promise<ToolResult<VenueBriefing>> {
  const t0 = Date.now()
  if (!UUID_RE.test(venueId)) {
    return fail('invalid-input', 'invalid venueId')
  }

  const now = stubClock()
  const incidentsSince = new Date(now - ONE_DAY_MS)

  // audit-S4 — 4 queries in parallel. The venue tenancy check is encoded into
  // the first query; downstream queries have their own org/venue scoping in
  // place independently, so the parallel fan-out is safe.
  const [venue, contacts, incidents, cutoffsResult] = await Promise.all([
    prisma.venue.findFirst({
      where: { id: venueId, organizationId: orgId },
      select: { id: true, profile: true },
    }),
    prisma.venueContact.findMany({
      where: { venue: { id: venueId, organizationId: orgId } },
      select: {
        name: true,
        role: true,
        phone: true,
        email: true,
        isEmergencyContact: true,
      },
      orderBy: [{ isEmergencyContact: 'desc' }, { name: 'asc' }],
      take: MAX_CONTACTS,
    }),
    prisma.incidentLog.findMany({
      where: {
        venueId,
        organizationId: orgId,
        createdAt: { gte: incidentsSince },
      },
      select: { id: true, severity: true, summary: true, createdAt: true },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: MAX_INCIDENTS,
    }),
    mockOps.getUpcomingCutoffs(venueId, FOUR_HOURS_HRS),
  ])

  // 404-not-403 — venue must exist AND belong to org. Anything else → no-data.
  if (!venue) {
    chatCoreLogger.info('tool.get_venue_briefing', {
      orgId: hashId(orgId),
      venueIdHash: hashId(venueId),
      hitCount: 0,
      latencyMs: Date.now() - t0,
    })
    return fail('no-data', 'venue not in organization')
  }

  // Parse profile via VenueProfileSchema; if shape is bad, treat as empty
  // profile rather than failing the whole briefing (best-effort proactive).
  const profileParse = VenueProfileSchema.safeParse(venue.profile ?? {})
  const profile: VenueProfile = profileParse.success ? profileParse.data : {}

  // audit-S5 — only no-data flattens to empty; other failures surface in logs.
  let upcomingCutoffs: CutoffSummary[] = []
  if (cutoffsResult.ok) {
    upcomingCutoffs = cutoffsResult.data
  } else if (cutoffsResult.reason !== 'no-data') {
    chatCoreLogger.warn('chat_core.tool.get_venue_briefing.cutoffs_failed', {
      orgId: hashId(orgId),
      venueIdHash: hashId(venueId),
      reason: cutoffsResult.reason,
      detail: cutoffsResult.detail,
    })
  }

  const contactSummaries: VenueContactSummary[] = contacts.map((c) => ({
    name: c.name,
    role: c.role,
    phone: c.phone,
    email: c.email,
    isEmergencyContact: c.isEmergencyContact,
  }))
  const incidentSummaries: IncidentSummary[] = incidents.map((i) => ({
    id: i.id,
    severity: i.severity,
    summary: i.summary,
    createdAt: i.createdAt,
  }))

  chatCoreLogger.info('tool.get_venue_briefing', {
    orgId: hashId(orgId),
    venueIdHash: hashId(venueId),
    contactCount: contactSummaries.length,
    incidentCount: incidentSummaries.length,
    cutoffCount: upcomingCutoffs.length,
    latencyMs: Date.now() - t0,
  })

  return ok({
    profile,
    contacts: contactSummaries,
    recentIncidents: incidentSummaries,
    upcomingCutoffs,
  })
}
