import { ForbiddenException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { OnboardingMetricsService } from './onboarding/onboarding-metrics.service'

/// Operator-dashboard aggregations. Day buckets are UTC date_trunc — the
/// operator dashboard is "the last N days" not a calendar report, so the
/// extra cost of timezone-aware bucketing isn't worth the SQL complexity. The
/// timezone-correct WAU view is provided by WauService separately.
///
/// All queries are org-scoped at the join. Venue scoping is optional via the
/// caller-supplied `venueId`. Range defaults to last 30 days when from/to are
/// omitted; this matches what the dashboard requests in practice.

const DEFAULT_WINDOW_DAYS = 30
const NO_DATA_QUERY_PREVIEW_LEN = 160

@Injectable()
export class AnalyticsService {
  constructor(private readonly onboarding: OnboardingMetricsService) {}

  static defaultRange(now: Date = new Date()): { from: Date; to: Date } {
    const to = now
    const from = new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    return { from, to }
  }

  /// Search outcomes per day from SearchAnalytics. Rejects venueId from a
  /// different org with a hard 403 to avoid cross-tenant probing.
  async searchOutcomes(
    orgId: string,
    opts: { venueId?: string; from: Date; to: Date },
  ): Promise<{
    buckets: Array<{ date: string; hit: number; noData: number; error: number }>
    totals: { hit: number; noData: number; error: number }
  }> {
    await assertVenueInOrg(orgId, opts.venueId)
    const rows = await prisma.$queryRaw<
      Array<{ date: Date; outcome: string; n: bigint }>
    >(Prisma.sql`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS date, outcome, COUNT(*)::bigint AS n
      FROM "search_analytics"
      WHERE "organizationId" = ${orgId}
        AND "createdAt" >= ${opts.from}
        AND "createdAt" <= ${opts.to}
        ${opts.venueId ? Prisma.sql`AND "venueId" = ${opts.venueId}` : Prisma.empty}
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `)

    const byDate = new Map<string, { hit: number; noData: number; error: number }>()
    for (const r of rows) {
      const key = ymd(r.date)
      const entry = byDate.get(key) ?? { hit: 0, noData: 0, error: 0 }
      const n = Number(r.n)
      if (r.outcome === 'hit') entry.hit += n
      else if (r.outcome === 'no-data') entry.noData += n
      else entry.error += n
      byDate.set(key, entry)
    }
    const buckets = fillDailyBuckets(opts.from, opts.to, (date) => ({
      date,
      hit: byDate.get(date)?.hit ?? 0,
      noData: byDate.get(date)?.noData ?? 0,
      error: byDate.get(date)?.error ?? 0,
    }))
    const totals = buckets.reduce(
      (acc, b) => ({
        hit: acc.hit + b.hit,
        noData: acc.noData + b.noData,
        error: acc.error + b.error,
      }),
      { hit: 0, noData: 0, error: 0 },
    )
    return { buckets, totals }
  }

  /// Top "no-data" queries in the window — what staff asked for that the KB
  /// didn't have. Aggregated by LOWER(TRIM(query)) so trivial variants merge.
  /// Excludes already-dismissed queries (the owner has triaged them out).
  async noDataQueries(
    orgId: string,
    opts: { venueId?: string; from: Date; to: Date; limit: number },
  ): Promise<{ items: Array<{ query: string; count: number; lastSeen: string }> }> {
    await assertVenueInOrg(orgId, opts.venueId)
    const rows = await prisma.$queryRaw<
      Array<{ query: string; n: bigint; last_seen: Date }>
    >(Prisma.sql`
      SELECT
        LOWER(TRIM(sa.query)) AS query,
        COUNT(*)::bigint AS n,
        MAX(sa."createdAt") AS last_seen
      FROM "search_analytics" sa
      LEFT JOIN "dismissed_no_data_queries" d
        ON d."organizationId" = sa."organizationId"
        AND d."queryLower" = LOWER(TRIM(sa.query))
      WHERE sa."organizationId" = ${orgId}
        AND sa.outcome = 'no-data'
        AND sa."createdAt" >= ${opts.from}
        AND sa."createdAt" <= ${opts.to}
        AND d.id IS NULL
        ${opts.venueId ? Prisma.sql`AND sa."venueId" = ${opts.venueId}` : Prisma.empty}
      GROUP BY 1
      ORDER BY n DESC
      LIMIT ${opts.limit}
    `)
    return {
      items: rows.map((r) => ({
        query: r.query.slice(0, NO_DATA_QUERY_PREVIEW_LEN),
        count: Number(r.n),
        lastSeen: r.last_seen.toISOString(),
      })),
    }
  }

  /// Daily counts of assistant turns split by whether they escalated. The
  /// resolution rate is the share of assistant turns that the AI handled
  /// without invoking an escalation tool. WhatsApp-channel conversations are
  /// included; their messages still write to ChatMessage.
  async escalations(
    orgId: string,
    opts: { venueId?: string; from: Date; to: Date },
  ): Promise<{
    buckets: Array<{ date: string; resolved: number; escalated: number }>
    totals: { resolved: number; escalated: number; resolutionRate: number }
  }> {
    await assertVenueInOrg(orgId, opts.venueId)
    const rows = await prisma.$queryRaw<
      Array<{ date: Date; resolved: bigint; escalated: bigint }>
    >(Prisma.sql`
      SELECT
        date_trunc('day', m."createdAt" AT TIME ZONE 'UTC') AS date,
        COUNT(*) FILTER (WHERE m."escalatedAt" IS NULL)::bigint AS resolved,
        COUNT(*) FILTER (WHERE m."escalatedAt" IS NOT NULL)::bigint AS escalated
      FROM "ChatMessage" m
      JOIN "ChatConversation" c ON c.id = m."conversationId"
      JOIN "Venue" v ON v.id = c."venueId"
      WHERE v."organizationId" = ${orgId}
        AND c."deletedAt" IS NULL
        AND m.role = 'assistant'
        AND m."createdAt" >= ${opts.from}
        AND m."createdAt" <= ${opts.to}
        ${opts.venueId ? Prisma.sql`AND c."venueId" = ${opts.venueId}` : Prisma.empty}
      GROUP BY 1
      ORDER BY 1 ASC
    `)
    const byDate = new Map(rows.map((r) => [ymd(r.date), r]))
    const buckets = fillDailyBuckets(opts.from, opts.to, (date) => {
      const r = byDate.get(date)
      return {
        date,
        resolved: r ? Number(r.resolved) : 0,
        escalated: r ? Number(r.escalated) : 0,
      }
    })
    const totals = buckets.reduce(
      (acc, b) => ({
        resolved: acc.resolved + b.resolved,
        escalated: acc.escalated + b.escalated,
      }),
      { resolved: 0, escalated: 0 },
    )
    const denom = totals.resolved + totals.escalated
    return {
      buckets,
      totals: {
        ...totals,
        resolutionRate: denom > 0 ? totals.resolved / denom : 0,
      },
    }
  }

  /// Daily AI cost in USD cents + assistant-turn count. costUsd is a Decimal
  /// in dollars; SUM x 100 gives cents. SQL rounding keeps the response a
  /// plain integer for the UI.
  async costs(
    orgId: string,
    opts: { venueId?: string; from: Date; to: Date },
  ): Promise<{
    buckets: Array<{ date: string; usdCents: number; messages: number }>
    totals: { usdCents: number; messages: number; costPerMessageCents: number }
  }> {
    await assertVenueInOrg(orgId, opts.venueId)
    const rows = await prisma.$queryRaw<Array<{ date: Date; cents: bigint; n: bigint }>>(Prisma.sql`
      SELECT
        date_trunc('day', m."createdAt" AT TIME ZONE 'UTC') AS date,
        COALESCE(SUM(ROUND(m."costUsd" * 100)), 0)::bigint AS cents,
        COUNT(*) FILTER (WHERE m."costUsd" IS NOT NULL)::bigint AS n
      FROM "ChatMessage" m
      JOIN "ChatConversation" c ON c.id = m."conversationId"
      JOIN "Venue" v ON v.id = c."venueId"
      WHERE v."organizationId" = ${orgId}
        AND c."deletedAt" IS NULL
        AND m.role IN ('assistant', 'turn-failed')
        AND m."createdAt" >= ${opts.from}
        AND m."createdAt" <= ${opts.to}
        ${opts.venueId ? Prisma.sql`AND c."venueId" = ${opts.venueId}` : Prisma.empty}
      GROUP BY 1
      ORDER BY 1 ASC
    `)
    const byDate = new Map(rows.map((r) => [ymd(r.date), r]))
    const buckets = fillDailyBuckets(opts.from, opts.to, (date) => {
      const r = byDate.get(date)
      return {
        date,
        usdCents: r ? Number(r.cents) : 0,
        messages: r ? Number(r.n) : 0,
      }
    })
    const totals = buckets.reduce(
      (acc, b) => ({
        usdCents: acc.usdCents + b.usdCents,
        messages: acc.messages + b.messages,
      }),
      { usdCents: 0, messages: 0 },
    )
    return {
      buckets,
      totals: {
        ...totals,
        costPerMessageCents: totals.messages > 0 ? totals.usdCents / totals.messages : 0,
      },
    }
  }

  /// Daily 👍/👎/regenerate counts. positiveRate = up / (up + down) so
  /// regenerate doesn't drag the headline down — a regenerate is a soft
  /// signal, not a vote.
  async feedback(
    orgId: string,
    opts: { venueId?: string; from: Date; to: Date },
  ): Promise<{
    buckets: Array<{ date: string; up: number; down: number; regenerate: number }>
    totals: { up: number; down: number; regenerate: number; positiveRate: number }
  }> {
    await assertVenueInOrg(orgId, opts.venueId)
    const rows = await prisma.$queryRaw<Array<{ date: Date; kind: string; n: bigint }>>(Prisma.sql`
      SELECT date_trunc('day', f."createdAt" AT TIME ZONE 'UTC') AS date, f.kind, COUNT(*)::bigint AS n
      FROM "message_feedback" f
      JOIN "ChatMessage" m ON m.id = f."messageId"
      JOIN "ChatConversation" c ON c.id = m."conversationId"
      JOIN "Venue" v ON v.id = c."venueId"
      WHERE v."organizationId" = ${orgId}
        AND f."createdAt" >= ${opts.from}
        AND f."createdAt" <= ${opts.to}
        ${opts.venueId ? Prisma.sql`AND c."venueId" = ${opts.venueId}` : Prisma.empty}
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `)
    const byDate = new Map<string, { up: number; down: number; regenerate: number }>()
    for (const r of rows) {
      const key = ymd(r.date)
      const entry = byDate.get(key) ?? { up: 0, down: 0, regenerate: 0 }
      const n = Number(r.n)
      if (r.kind === 'up') entry.up += n
      else if (r.kind === 'down') entry.down += n
      else if (r.kind === 'regenerate') entry.regenerate += n
      byDate.set(key, entry)
    }
    const buckets = fillDailyBuckets(opts.from, opts.to, (date) => ({
      date,
      up: byDate.get(date)?.up ?? 0,
      down: byDate.get(date)?.down ?? 0,
      regenerate: byDate.get(date)?.regenerate ?? 0,
    }))
    const totals = buckets.reduce(
      (acc, b) => ({
        up: acc.up + b.up,
        down: acc.down + b.down,
        regenerate: acc.regenerate + b.regenerate,
      }),
      { up: 0, down: 0, regenerate: 0 },
    )
    const denom = totals.up + totals.down
    return {
      buckets,
      totals: {
        ...totals,
        positiveRate: denom > 0 ? totals.up / denom : 0,
      },
    }
  }

  /// Pricing recommendations funnel — all-time counts per status, since
  /// records are long-lived and the funnel is a state machine. Adoption rate
  /// uses (adopted + dismissed) as the denominator so still-pending recs
  /// don't deflate it before the owner has triaged them.
  async pricingFunnel(
    orgId: string,
    opts: { venueId?: string },
  ): Promise<{
    pending: number
    adopted: number
    dismissed: number
    adoptionRate: number
    measuredUpliftGbpCents: number
  }> {
    await assertVenueInOrg(orgId, opts.venueId)
    const grouped = await prisma.pricingRecommendation.groupBy({
      by: ['status'],
      where: {
        organizationId: orgId,
        ...(opts.venueId ? { venueId: opts.venueId } : {}),
      },
      _count: { _all: true },
    })
    const counts = { pending: 0, adopted: 0, dismissed: 0 }
    for (const g of grouped) {
      if (g.status === 'pending') counts.pending = g._count._all
      else if (g.status === 'adopted') counts.adopted = g._count._all
      else if (g.status === 'dismissed') counts.dismissed = g._count._all
    }
    const uplift = await prisma.pricingRecommendation.aggregate({
      where: {
        organizationId: orgId,
        status: 'adopted',
        measuredUpliftCents: { not: null },
        ...(opts.venueId ? { venueId: opts.venueId } : {}),
      },
      _sum: { measuredUpliftCents: true },
    })
    const triaged = counts.adopted + counts.dismissed
    return {
      ...counts,
      adoptionRate: triaged > 0 ? counts.adopted / triaged : 0,
      measuredUpliftGbpCents: uplift._sum.measuredUpliftCents ?? 0,
    }
  }

  /// Cohort view of every org member's onboarding competency snapshot. Members
  /// who haven't started onboarding (no anchor) are still returned with zero
  /// counts so the manager can see at-a-glance who is missing baseline data.
  async onboardingCohort(orgId: string): Promise<{
    members: Array<{
      userId: string
      name: string | null
      email: string | null
      role: string
      startedAt: string | null
      daysSinceStart: number
      totalQueries: number
      repeatQueries: number
      repeatRate: number
      firstIndependentAt: string | null
    }>
  }> {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      select: {
        userId: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    // Computing each snapshot is one SearchAnalytics scan per user. For
    // typical orgs (<30 members) this is fine; if a member explosion becomes
    // a problem we'll batch the SQL but the per-user math stays in
    // OnboardingMetricsService.
    const snapshots = await Promise.all(
      members.map(async (m) => {
        const r = await this.onboarding.getCompetency(orgId, m.userId)
        return {
          userId: m.userId,
          name: m.user.name ?? null,
          email: m.user.email ?? null,
          role: m.role,
          startedAt: r.startedAt?.toISOString() ?? null,
          daysSinceStart: r.daysSinceStart,
          totalQueries: r.totalQueries,
          repeatQueries: r.repeatQueries,
          repeatRate: r.repeatRate,
          firstIndependentAt: r.firstIndependentAt?.toISOString() ?? null,
        }
      }),
    )
    return { members: snapshots }
  }

  /// Top successful queries in the window — what the AI is actually being
  /// asked, ranked. Same shape as noDataQueries but filters to outcome='hit'
  /// so the manager sees the workload the AI is handling well (and where to
  /// invest more knowledge).
  async topQuestions(
    orgId: string,
    opts: { venueId?: string; from: Date; to: Date; limit: number },
  ): Promise<{ items: Array<{ query: string; count: number; lastSeen: string }> }> {
    await assertVenueInOrg(orgId, opts.venueId)
    const rows = await prisma.$queryRaw<
      Array<{ query: string; n: bigint; last_seen: Date }>
    >(Prisma.sql`
      SELECT
        LOWER(TRIM(sa.query)) AS query,
        COUNT(*)::bigint AS n,
        MAX(sa."createdAt") AS last_seen
      FROM "search_analytics" sa
      WHERE sa."organizationId" = ${orgId}
        AND sa.outcome = 'hit'
        AND sa."createdAt" >= ${opts.from}
        AND sa."createdAt" <= ${opts.to}
        ${opts.venueId ? Prisma.sql`AND sa."venueId" = ${opts.venueId}` : Prisma.empty}
      GROUP BY 1
      ORDER BY n DESC
      LIMIT ${opts.limit}
    `)
    return {
      items: rows.map((r) => ({
        query: r.query.slice(0, NO_DATA_QUERY_PREVIEW_LEN),
        count: Number(r.n),
        lastSeen: r.last_seen.toISOString(),
      })),
    }
  }

  /// Recent assistant turns that escalated to a human, newest first. Returns
  /// the staff member who triggered the conversation + the escalation kind
  /// (incident / task / note) + the venue. Useful as a "what is the AI
  /// punting on" feed — each row is a real conversation the manager can drill
  /// into. We don't ship message content here (potential PII / long); the
  /// caller can pull the conversation via the existing chat surface.
  async recentEscalations(
    orgId: string,
    opts: { venueId?: string; from: Date; to: Date; limit: number },
  ): Promise<{
    items: Array<{
      messageId: string
      conversationId: string
      escalatedAt: string
      escalationKind: string | null
      venueId: string
      venueName: string
      staffUserId: string | null
      staffName: string | null
      escalatedToUserId: string | null
      escalatedToName: string | null
    }>
  }> {
    await assertVenueInOrg(orgId, opts.venueId)
    const rows = await prisma.$queryRaw<
      Array<{
        message_id: string
        conversation_id: string
        escalated_at: Date
        escalation_kind: string | null
        venue_id: string
        venue_name: string
        staff_user_id: string | null
        staff_name: string | null
        escalated_to_user_id: string | null
        escalated_to_name: string | null
      }>
    >(Prisma.sql`
      SELECT
        m.id AS message_id,
        c.id AS conversation_id,
        m."escalatedAt" AS escalated_at,
        m."escalationKind" AS escalation_kind,
        v.id AS venue_id,
        v.name AS venue_name,
        c."userId" AS staff_user_id,
        staff.name AS staff_name,
        m."escalatedToUserId" AS escalated_to_user_id,
        target.name AS escalated_to_name
      FROM "ChatMessage" m
      JOIN "ChatConversation" c ON c.id = m."conversationId"
      JOIN "Venue" v ON v.id = c."venueId"
      LEFT JOIN "users" staff ON staff.id = c."userId"
      -- Escalation target is resolved through current org membership: if the
      -- target user has since been removed from the org (or somehow points
      -- to a foreign user — write paths org-scope the lookup, but defence in
      -- depth) the JOIN returns NULL for the name. We keep the row visible
      -- with NULL name so the manager still sees the escalation existed.
      LEFT JOIN "organization_members" target_member
        ON target_member."userId" = m."escalatedToUserId"
        AND target_member."organizationId" = ${orgId}
      LEFT JOIN "users" target
        ON target.id = target_member."userId"
      WHERE v."organizationId" = ${orgId}
        AND c."deletedAt" IS NULL
        AND m."escalatedAt" IS NOT NULL
        AND m."escalatedAt" >= ${opts.from}
        AND m."escalatedAt" <= ${opts.to}
        ${opts.venueId ? Prisma.sql`AND c."venueId" = ${opts.venueId}` : Prisma.empty}
      ORDER BY m."escalatedAt" DESC
      LIMIT ${opts.limit}
    `)
    return {
      items: rows.map((r) => ({
        messageId: r.message_id,
        conversationId: r.conversation_id,
        escalatedAt: r.escalated_at.toISOString(),
        escalationKind: r.escalation_kind,
        venueId: r.venue_id,
        venueName: r.venue_name,
        staffUserId: r.staff_user_id,
        staffName: r.staff_name,
        escalatedToUserId: r.escalated_to_user_id,
        escalatedToName: r.escalated_to_name,
      })),
    }
  }

  /// Most active staff in the window — top users by SearchAnalytics row count
  /// (i.e. queries they ran), ordered desc. `lastSeen` is the most recent
  /// query timestamp. Used by the dashboard as a "who is leaning on the AI"
  /// ranking. Org-scoped; venueId optional. Excludes rows with NULL userId
  /// (legacy WhatsApp pre-link).
  async activeStaff(
    orgId: string,
    opts: { venueId?: string; from: Date; to: Date; limit: number },
  ): Promise<{
    items: Array<{
      userId: string
      name: string | null
      email: string | null
      role: string | null
      count: number
      lastSeen: string
    }>
  }> {
    await assertVenueInOrg(orgId, opts.venueId)
    const rows = await prisma.$queryRaw<
      Array<{
        user_id: string
        name: string | null
        email: string | null
        role: string | null
        n: bigint
        last_seen: Date
      }>
    >(Prisma.sql`
      SELECT
        sa."userId" AS user_id,
        u.name AS name,
        u.email AS email,
        om.role AS role,
        COUNT(*)::bigint AS n,
        MAX(sa."createdAt") AS last_seen
      FROM "search_analytics" sa
      JOIN "users" u ON u.id = sa."userId"
      LEFT JOIN "organization_members" om
        ON om."userId" = sa."userId"
        AND om."organizationId" = sa."organizationId"
      WHERE sa."organizationId" = ${orgId}
        AND sa."userId" IS NOT NULL
        AND sa."createdAt" >= ${opts.from}
        AND sa."createdAt" <= ${opts.to}
        ${opts.venueId ? Prisma.sql`AND sa."venueId" = ${opts.venueId}` : Prisma.empty}
      GROUP BY sa."userId", u.name, u.email, om.role
      ORDER BY n DESC
      LIMIT ${opts.limit}
    `)
    return {
      items: rows.map((r) => ({
        userId: r.user_id,
        name: r.name,
        email: r.email,
        role: r.role,
        count: Number(r.n),
        lastSeen: r.last_seen.toISOString(),
      })),
    }
  }
}

/// Cross-org probe guard — caller may pass a venueId that doesn't belong to
/// their org. Throwing 403 here matches WauService.getVenueWau's contract.
async function assertVenueInOrg(orgId: string, venueId: string | undefined): Promise<void> {
  if (!venueId) return
  const v = await prisma.venue.findFirst({
    where: { id: venueId, organizationId: orgId },
    select: { id: true },
  })
  if (!v) throw new ForbiddenException('venue-not-in-org')
}

/// Forward-fill day buckets in ISO YYYY-MM-DD between from and to inclusive
/// so the front-end chart never has gaps to special-case.
function fillDailyBuckets<T extends { date: string }>(
  from: Date,
  to: Date,
  build: (date: string) => T,
): T[] {
  const out: T[] = []
  const start = startOfUtcDay(from)
  const end = startOfUtcDay(to)
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
    out.push(build(ymd(new Date(t))))
  }
  return out
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}
