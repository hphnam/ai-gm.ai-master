import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../../database/prisma'
import { fail, type ToolResult } from '../../../types'
import { IntegrationsService } from '../integrations.service'
import { formatMoney, getSquareClient, ZERO_DECIMAL_CURRENCIES } from './square-client'
import { resolveWindow, type ScheduleWindowInput, type WindowInput } from './square-window'

// Per-tool window caps duplicated here in case a service caller bypasses the
// schema layer (e.g. internal compose tools). Keep in sync with square.tools.ts.
const SALES_MAX_HOURS = 24 * 365
const LABOR_MAX_HOURS = 24 * 90

export const SQUARE_PROVIDER_ID = 'square'

/// "Not connected" error template. The chat agent surfaces this to the user
/// verbatim, so it must be self-explanatory and route them to the right CTA.
const NOT_CONNECTED = fail(
  'not-supported',
  'No POS integration is connected for this organisation. Ask an owner or manager to connect Square in Settings → Integrations.',
)

/// Same shape, but for the second failure mode: integration exists but no
/// Square location is mapped to this venue. We tell the agent precisely so it
/// can tell the user.
function noLocationMappedFail(venueName: string | null): ToolResult<never> {
  const v = venueName ? `"${venueName}"` : 'this venue'
  return fail(
    'invalid-input',
    `Square is connected but ${v} has no Square location mapped. Ask a manager to assign one in Settings → Integrations → Square.`,
  )
}

export type SquareCatalogItem = {
  id: string
  name: string
  description: string | null
  variations: Array<{
    id: string
    name: string | null
    sku: string | null
    price: { value: number; currency: string } | null
  }>
}

export type SquareInventoryRow = {
  catalogObjectId: string
  locationId: string
  quantity: number
  state: string | null
  calculatedAt: string | null
}

export type SquareOrderRow = {
  id: string
  state: string | null
  total: { value: number; currency: string } | null
  netAmounts: { value: number; currency: string } | null
  createdAt: string | null
  closedAt: string | null
  source: string | null
  itemCount: number
}

export type SquareLocation = {
  id: string
  name: string | null
  status: string | null
  type: string | null
  currency: string | null
  timezone: string | null
  address: string | null
}

export type SquareTopItemRow = {
  name: string
  variation: string | null
  quantitySold: number
  grossSales: { value: number; currency: string } | null
  orderCount: number
}

export type SquareRefundRow = {
  id: string
  status: string | null
  amount: { value: number; currency: string } | null
  reason: string | null
  createdAt: string | null
  paymentId: string | null
}

export type SquareTeamMemberRow = {
  id: string
  givenName: string | null
  familyName: string | null
  status: string | null
  email: string | null
  phone: string | null
  isOwner: boolean
  assignedLocationIds: string[]
}

export type PeriodSnapshot = {
  label: string | null
  fromIso: string
  toIso: string
  windowHours: number
  // Sales metric fields
  orderCount?: number
  gross?: { value: number; currency: string } | null
  net?: { value: number; currency: string } | null
  // Labor metric fields
  shiftCount?: number
  totalHours?: number
  estimatedCost?: { value: number; currency: string } | null
}

export type PeriodDelta = {
  /// Each delta entry: A − B in absolute terms + percentage change relative
  /// to B. percent is null when B is zero (avoids divide-by-zero noise).
  [field: string]: { absolute: number; percent: number | null } | undefined
}

export type SquareShiftRow = {
  id: string
  teamMemberId: string | null
  teamMemberName: string | null
  /// 'OPEN' (clocked in, no endAt), 'CLOSED' (clocked out), or vendor-set
  /// states like 'PAID'. We surface the raw string so the agent can describe
  /// it accurately ("on shift" vs "finished").
  status: string | null
  startAt: string | null
  endAt: string | null
  /// Worked hours so far. For OPEN shifts: now - startAt. For CLOSED: endAt - startAt.
  /// Excludes breaks — Square's Break records aren't bundled in via the search.
  hours: number
  hourlyRate: { value: number; currency: string } | null
  estimatedCost: { value: number; currency: string } | null
  jobTitle: string | null
}

/// Row shape for forward-looking rota items. Differs from SquareShiftRow:
/// (a) covers both DRAFT and PUBLISHED variants — staff only see published;
/// (b) wage is not on the shift, so hourlyRate/estimatedCost are joined from
/// teamMemberWages keyed by (teamMemberId, jobId);
/// (c) hours is the planned shift length (endAt − startAt), never "so far".
export type SquareScheduledShiftRow = {
  id: string
  teamMemberId: string | null
  teamMemberName: string | null
  /// 'PUBLISHED' when published_shift_details is populated, otherwise 'DRAFT'.
  /// PUBLISHED = staff can see this in the Square Team app; DRAFT = manager
  /// has staged it but not pressed publish.
  status: 'DRAFT' | 'PUBLISHED'
  startAt: string | null
  endAt: string | null
  /// Planned hours (endAt − startAt). Zero when either bound is missing.
  hours: number
  /// Matched against teamMemberWages by (teamMemberId, jobId). Null when the
  /// team member has no wage configured for that job in Square — e.g. salaried
  /// staff or a manager who's never had an hourly rate set.
  hourlyRate: { value: number; currency: string } | null
  estimatedCost: { value: number; currency: string } | null
  jobTitle: string | null
  notes: string | null
}

@Injectable()
export class SquareService {
  private readonly logger = new Logger(SquareService.name)

  constructor(private readonly integrations: IntegrationsService) {}

  /// Delegate so sibling services can bump the last-synced timestamp via
  /// SquareService without taking a direct IntegrationsService dependency.
  async touchSync(orgId: string): Promise<void> {
    await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
  }

  /// Returns the active Square client + the venue's locationId for a tool
  /// call, OR a ToolResult fail() the caller can return verbatim. Centralised
  /// so every tool gets identical not-connected / not-mapped UX.
  ///
  /// Public so sibling services in this module (square-cogs / square-commerce /
  /// square-catalog-extras / square-crm) can reuse the credential + venue
  /// plumbing without duplicating it.
  async resolveForVenue(
    orgId: string,
    venueId: string,
  ): Promise<
    | {
        ok: true
        client: ReturnType<typeof getSquareClient>
        locationId: string
        venueName: string
      }
    | ToolResult<never>
  > {
    const [creds, venue] = await Promise.all([
      this.integrations.getActiveCredentials(orgId, SQUARE_PROVIDER_ID),
      prisma.venue.findFirst({
        where: { id: venueId, organizationId: orgId },
        select: { id: true, name: true, squareLocationId: true },
      }),
    ])
    if (!creds) return NOT_CONNECTED
    if (!venue) return fail('not-found', 'venue not found in your organisation')
    if (!venue.squareLocationId) return noLocationMappedFail(venue.name)
    const client = getSquareClient({
      orgId,
      accessToken: creds.accessToken,
      environment: creds.environment,
    })
    return { ok: true, client, locationId: venue.squareLocationId, venueName: venue.name }
  }

  /// Validate a freshly-supplied PAT by calling Square's merchants endpoint.
  /// Returns the merchant id (Square's account identifier for the seller)
  /// so the controller can persist it on the Integration row. Throws when
  /// the SDK rejects the call — the controller maps that to a clean 400.
  async validatePat(
    accessToken: string,
    environment: 'production' | 'sandbox',
  ): Promise<{ externalAccountId: string | null; scopes?: string[] }> {
    const client = getSquareClient({
      // No real org yet — we're validating before persisting. Use a stable
      // pseudo-orgId so the cache doesn't get polluted with validation-only
      // clients (the token hash still keeps it isolated per token).
      orgId: '__validate__',
      accessToken,
      environment,
    })
    const page = await client.merchants.list()
    // Page<Merchant, …> exposes `.data` as the typed item array.
    const merchants = (page as { data?: Array<{ id?: string }> }).data ?? []
    const first = merchants[0]
    return { externalAccountId: typeof first?.id === 'string' ? first.id : null }
  }

  /// Helper for tools that don't need a venue (listLocations) — just need an
  /// authenticated client. Public for sibling-service reuse.
  async resolveClient(
    orgId: string,
  ): Promise<{ ok: true; client: ReturnType<typeof getSquareClient> } | ToolResult<never>> {
    const creds = await this.integrations.getActiveCredentials(orgId, SQUARE_PROVIDER_ID)
    if (!creds) return NOT_CONNECTED
    const client = getSquareClient({
      orgId,
      accessToken: creds.accessToken,
      environment: creds.environment,
    })
    return { ok: true, client }
  }

  async searchItems(
    orgId: string,
    args: { query: string; venueId?: string; limit?: number },
  ): Promise<ToolResult<{ items: SquareCatalogItem[]; scopedToLocationId: string | null }>> {
    // Optional venue scoping — when the caller passes venueId we limit the
    // search to that venue's POS location so multi-venue orgs don't surface
    // items from sister venues (and so a follow-up pos_get_item_inventory
    // call against the mapped location actually returns counts).
    let locationId: string | null = null
    if (args.venueId) {
      const resolved = await this.resolveForVenue(orgId, args.venueId)
      if (!('client' in resolved)) return resolved
      locationId = resolved.locationId
    } else {
      const resolved = await this.resolveClient(orgId)
      if (!('client' in resolved)) return resolved
    }
    // Re-resolve the client (cheap — cached). Single source of truth for
    // creds avoids two callsites repeating the env/credential plumbing.
    const creds = await this.integrations.getActiveCredentials(orgId, SQUARE_PROVIDER_ID)
    if (!creds) return NOT_CONNECTED
    const client = getSquareClient({
      orgId,
      accessToken: creds.accessToken,
      environment: creds.environment,
    })
    try {
      const resp = await client.catalog.searchItems({
        textFilter: args.query,
        limit: args.limit ?? 20,
        ...(locationId ? { enabledLocationIds: [locationId] } : {}),
      })
      const items = (resp as { items?: unknown[] }).items ?? []
      const mapped: SquareCatalogItem[] = items
        .map((raw) => this.toCatalogItem(raw as Record<string, unknown>))
        .filter((x): x is SquareCatalogItem => x !== null)
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return { ok: true, data: { items: mapped, scopedToLocationId: locationId } }
    } catch (err) {
      return await this.handleApiError(orgId, 'searchItems', err)
    }
  }

  async getItemInventory(
    orgId: string,
    args: { venueId: string; catalogObjectIds: string[] },
  ): Promise<ToolResult<{ counts: SquareInventoryRow[] }>> {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    try {
      const page = await resolved.client.inventory.batchGetCounts({
        catalogObjectIds: args.catalogObjectIds,
        locationIds: [resolved.locationId],
      })
      // batchGetCounts returns a Page<InventoryCount, …>. The Page is async
      // iterable; we drain a single page so the chat surface stays bounded.
      // Square defaults page size to 100 — fine for the tool's input cap.
      const counts = (page as { data?: unknown[] }).data ?? []
      const mapped: SquareInventoryRow[] = counts.map((raw) =>
        this.toInventoryRow(raw as Record<string, unknown>),
      )
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return { ok: true, data: { counts: mapped } }
    } catch (err) {
      return await this.handleApiError(orgId, 'getItemInventory', err)
    }
  }

  async listRecentOrders(
    orgId: string,
    args: { venueId: string; limit?: number } & WindowInput,
  ): Promise<ToolResult<{ orders: SquareOrderRow[]; windowHours: number }>> {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 24, maxHours: SALES_MAX_HOURS })
    try {
      const resp = await resolved.client.orders.search({
        locationIds: [resolved.locationId],
        limit: Math.min(args.limit ?? 25, 100),
        query: {
          filter: {
            dateTimeFilter: { createdAt: { startAt: window.startAt, endAt: window.endAt } },
            stateFilter: { states: ['COMPLETED', 'OPEN'] },
          },
          sort: { sortField: 'CREATED_AT', sortOrder: 'DESC' },
        },
      })
      const orders = (resp as { orders?: unknown[] }).orders ?? []
      const mapped: SquareOrderRow[] = orders.map((raw) =>
        this.toOrderRow(raw as Record<string, unknown>),
      )
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return { ok: true, data: { orders: mapped, windowHours: window.hours } }
    } catch (err) {
      return await this.handleApiError(orgId, 'listRecentOrders', err)
    }
  }

  async listLocations(orgId: string): Promise<ToolResult<{ locations: SquareLocation[] }>> {
    const resolved = await this.resolveClient(orgId)
    if (!('client' in resolved)) return resolved
    try {
      const resp = await resolved.client.locations.list()
      const locations = (resp as { locations?: unknown[] }).locations ?? []
      const mapped = locations.map((raw) => this.toLocation(raw as Record<string, unknown>))
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return { ok: true, data: { locations: mapped } }
    } catch (err) {
      return await this.handleApiError(orgId, 'listLocations', err)
    }
  }

  async getSalesSummary(
    orgId: string,
    args: { venueId: string } & WindowInput,
  ): Promise<
    ToolResult<{
      orderCount: number
      gross: { value: number; currency: string } | null
      net: { value: number; currency: string } | null
      windowHours: number
      windowFromIso: string
      windowToIso: string
      truncated: boolean
    }>
  > {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 24, maxHours: SALES_MAX_HOURS })
    const startAt = window.startAt
    const endAt = window.endAt
    // Page through Square's 500-per-page cap up to MAX_PAGES so a busy
    // Saturday doesn't silently truncate. If we hit the page cap we set
    // truncated:true so the agent discloses an understated total to the
    // user instead of presenting it as authoritative.
    const PAGE_LIMIT = 500
    const MAX_PAGES = 5
    try {
      let cursor: string | undefined
      let pages = 0
      let orderCount = 0
      // Accumulate in minor units (bigint pence/cents) so we don't accrue
      // float drift across hundreds of orders. Divide once at the end.
      let grossMinor = 0n
      let netMinor = 0n
      let currency: string | null = null
      let zeroDecimal = false
      while (pages < MAX_PAGES) {
        const resp = await resolved.client.orders.search({
          locationIds: [resolved.locationId],
          limit: PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
          query: {
            filter: {
              dateTimeFilter: { createdAt: { startAt, endAt } },
              stateFilter: { states: ['COMPLETED'] },
            },
          },
        })
        const orders = ((resp as { orders?: unknown[] }).orders ?? []) as Array<
          Record<string, unknown>
        >
        for (const o of orders) {
          const total = o.totalMoney as { amount?: bigint | number; currency?: string } | undefined
          if (total?.amount != null) {
            grossMinor +=
              typeof total.amount === 'bigint' ? total.amount : BigInt(Math.round(total.amount))
            if (!currency && total.currency) currency = total.currency
          }
          const net = (o.netAmounts as { totalMoney?: { amount?: bigint | number } } | undefined)
            ?.totalMoney
          if (net?.amount != null) {
            netMinor += typeof net.amount === 'bigint' ? net.amount : BigInt(Math.round(net.amount))
          }
        }
        orderCount += orders.length
        pages += 1
        const next = (resp as { cursor?: string }).cursor
        if (!next || orders.length === 0) {
          cursor = undefined
          break
        }
        cursor = next
      }
      const truncated = pages >= MAX_PAGES && cursor !== undefined
      if (currency) {
        zeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency)
      }
      const divisor = zeroDecimal ? 1 : 100
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return {
        ok: true,
        data: {
          orderCount,
          gross: currency
            ? {
                value: Math.round((Number(grossMinor) / divisor) * 100) / 100,
                currency,
              }
            : null,
          net: currency
            ? {
                value: Math.round((Number(netMinor) / divisor) * 100) / 100,
                currency,
              }
            : null,
          windowHours: window.hours,
          windowFromIso: startAt,
          windowToIso: endAt,
          truncated,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'getSalesSummary', err)
    }
  }

  // ─── Labor tools ────────────────────────────────────────────────────────

  async listRecentShifts(
    orgId: string,
    args: { venueId: string; limit?: number; teamMemberId?: string } & WindowInput,
  ): Promise<ToolResult<{ shifts: SquareShiftRow[]; windowHours: number }>> {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 168, maxHours: LABOR_MAX_HOURS })
    try {
      const resp = await resolved.client.labor.shifts.search({
        limit: Math.min(args.limit ?? 50, 200),
        query: {
          filter: {
            locationIds: [resolved.locationId],
            start: { startAt: window.startAt, endAt: window.endAt },
            ...(args.teamMemberId ? { teamMemberIds: [args.teamMemberId] } : {}),
          },
          sort: { field: 'START_AT', order: 'DESC' },
        },
      })
      const rawShifts = ((resp as { shifts?: unknown[] }).shifts ?? []) as Array<
        Record<string, unknown>
      >
      const shifts = await this.enrichShiftsWithNames(resolved.client, rawShifts)
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return { ok: true, data: { shifts, windowHours: window.hours } }
    } catch (err) {
      return await this.handleApiError(orgId, 'listRecentShifts', err)
    }
  }

  async getActiveShifts(
    orgId: string,
    args: { venueId: string },
  ): Promise<ToolResult<{ shifts: SquareShiftRow[] }>> {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    try {
      // 'OPEN' = clocked in, not yet clocked out. Cap to a reasonable window
      // (24h back) so a forgotten unclosed shift from last week doesn't
      // dominate the result.
      const startAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const resp = await resolved.client.labor.shifts.search({
        limit: 50,
        query: {
          filter: {
            locationIds: [resolved.locationId],
            status: 'OPEN',
            start: { startAt },
          },
          sort: { field: 'START_AT', order: 'DESC' },
        },
      })
      const rawShifts = ((resp as { shifts?: unknown[] }).shifts ?? []) as Array<
        Record<string, unknown>
      >
      const shifts = await this.enrichShiftsWithNames(resolved.client, rawShifts)
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return { ok: true, data: { shifts } }
    } catch (err) {
      return await this.handleApiError(orgId, 'getActiveShifts', err)
    }
  }

  async getLaborSummary(
    orgId: string,
    args: { venueId: string; teamMemberId?: string } & WindowInput,
  ): Promise<
    ToolResult<{
      shiftCount: number
      activeCount: number
      totalHours: number
      estimatedCost: { value: number; currency: string } | null
      windowHours: number
      windowFromIso: string
      windowToIso: string
      truncated: boolean
    }>
  > {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 168, maxHours: LABOR_MAX_HOURS })
    const PAGE_LIMIT = 200
    const MAX_PAGES = 5
    try {
      let cursor: string | undefined
      let pages = 0
      let shiftCount = 0
      let activeCount = 0
      let totalHours = 0
      let costMinor = 0n
      let currency: string | null = null
      const now = Date.now()
      while (pages < MAX_PAGES) {
        const resp = await resolved.client.labor.shifts.search({
          limit: PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
          query: {
            filter: {
              locationIds: [resolved.locationId],
              start: { startAt: window.startAt, endAt: window.endAt },
              ...(args.teamMemberId ? { teamMemberIds: [args.teamMemberId] } : {}),
            },
            sort: { field: 'START_AT', order: 'DESC' },
          },
        })
        const rawShifts = ((resp as { shifts?: unknown[] }).shifts ?? []) as Array<
          Record<string, unknown>
        >
        for (const s of rawShifts) {
          shiftCount += 1
          const status = typeof s.status === 'string' ? s.status : null
          if (status === 'OPEN') activeCount += 1
          const start = typeof s.startAt === 'string' ? Date.parse(s.startAt) : NaN
          const endRaw = typeof s.endAt === 'string' ? Date.parse(s.endAt) : NaN
          const end = Number.isFinite(endRaw) ? endRaw : now
          if (Number.isFinite(start) && end > start) {
            const h = (end - start) / (60 * 60 * 1000)
            totalHours += h
            const wage = (
              s.wage as { hourlyRate?: { amount?: bigint | number; currency?: string } } | undefined
            )?.hourlyRate
            if (wage?.amount != null) {
              const rateMinor =
                typeof wage.amount === 'bigint' ? wage.amount : BigInt(Math.round(wage.amount))
              // cost (minor units) = hourlyRate (minor units) × hours
              // Multiply by hours scaled to integer to keep bigint math exact
              // — round to the nearest minor unit at the end.
              const scaled = BigInt(Math.round(h * 1_000_000))
              costMinor += (rateMinor * scaled) / 1_000_000n
              if (!currency && wage.currency) currency = wage.currency
            }
          }
        }
        pages += 1
        const next = (resp as { cursor?: string }).cursor
        if (!next || rawShifts.length === 0) {
          cursor = undefined
          break
        }
        cursor = next
      }
      const truncated = pages >= MAX_PAGES && cursor !== undefined
      const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return {
        ok: true,
        data: {
          shiftCount,
          activeCount,
          totalHours: Math.round(totalHours * 100) / 100,
          estimatedCost: currency
            ? { value: Math.round((Number(costMinor) / divisor) * 100) / 100, currency }
            : null,
          windowHours: window.hours,
          windowFromIso: window.startAt,
          windowToIso: window.endAt,
          truncated,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'getLaborSummary', err)
    }
  }

  // ─── Scheduled shifts (forward-looking rota) ────────────────────────────

  /// List scheduled (rota) shifts at a venue inside a forward-looking window.
  /// Reads Square's `labor.searchScheduledShifts` — separate from the
  /// timeclock `labor.shifts.search` used by listRecentShifts. Returns the
  /// PUBLISHED variant when present (what staff see in the Team app), falling
  /// back to DRAFT (manager-staged but not yet published).
  async listScheduledShifts(
    orgId: string,
    args: {
      venueId: string
      limit?: number
      teamMemberId?: string
      includeDrafts?: boolean
    } & ScheduleWindowInput,
  ): Promise<
    ToolResult<{
      shifts: SquareScheduledShiftRow[]
      windowFromIso: string
      windowToIso: string
    }>
  > {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveScheduleWindow(args)
    try {
      const resp = await resolved.client.labor.searchScheduledShifts({
        limit: Math.min(args.limit ?? 50, 200),
        query: {
          filter: {
            locationIds: [resolved.locationId],
            start: { startAt: window.startAt, endAt: window.endAt },
            scheduledShiftStatuses: args.includeDrafts ? ['PUBLISHED', 'DRAFT'] : ['PUBLISHED'],
            ...(args.teamMemberId ? { teamMemberIds: [args.teamMemberId] } : {}),
          },
          sort: { field: 'START_AT', order: 'ASC' },
        },
      })
      const rawShifts = ((resp as { scheduledShifts?: unknown[] }).scheduledShifts ?? []) as Array<
        Record<string, unknown>
      >
      const shifts = await this.enrichScheduledShifts(resolved.client, rawShifts)
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return {
        ok: true,
        data: {
          shifts,
          windowFromIso: window.startAt,
          windowToIso: window.endAt,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'listScheduledShifts', err)
    }
  }

  /// Aggregate the rota over a forward-looking window: total planned hours
  /// and estimated labour cost (sum of wage × hours per shift). Mirrors
  /// getLaborSummary but for scheduled shifts so the agent can answer "how
  /// much will we spend on staff this coming week".
  async getScheduledLaborSummary(
    orgId: string,
    args: {
      venueId: string
      teamMemberId?: string
      includeDrafts?: boolean
    } & ScheduleWindowInput,
  ): Promise<
    ToolResult<{
      shiftCount: number
      totalHours: number
      estimatedCost: { value: number; currency: string } | null
      coverageRate: number
      uncostedShiftCount: number
      windowFromIso: string
      windowToIso: string
      truncated: boolean
    }>
  > {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveScheduleWindow(args)
    const PAGE_LIMIT = 200
    const MAX_PAGES = 5
    try {
      let cursor: string | undefined
      let pages = 0
      const rawCollected: Array<Record<string, unknown>> = []
      while (pages < MAX_PAGES) {
        const resp = await resolved.client.labor.searchScheduledShifts({
          limit: PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
          query: {
            filter: {
              locationIds: [resolved.locationId],
              start: { startAt: window.startAt, endAt: window.endAt },
              scheduledShiftStatuses: args.includeDrafts ? ['PUBLISHED', 'DRAFT'] : ['PUBLISHED'],
              ...(args.teamMemberId ? { teamMemberIds: [args.teamMemberId] } : {}),
            },
            sort: { field: 'START_AT', order: 'ASC' },
          },
        })
        const page = ((resp as { scheduledShifts?: unknown[] }).scheduledShifts ?? []) as Array<
          Record<string, unknown>
        >
        for (const s of page) rawCollected.push(s)
        pages += 1
        const next = (resp as { cursor?: string }).cursor
        if (!next || page.length === 0) {
          cursor = undefined
          break
        }
        cursor = next
      }
      const truncated = pages >= MAX_PAGES && cursor !== undefined

      const wageMap = await this.loadWageMap(resolved.client, rawCollected)
      let shiftCount = 0
      let totalHours = 0
      let costMinor = 0n
      let currency: string | null = null
      let uncostedShiftCount = 0
      for (const raw of rawCollected) {
        const details = pickShiftDetails(raw)
        if (!details) continue
        const startMs = typeof details.startAt === 'string' ? Date.parse(details.startAt) : NaN
        const endMs = typeof details.endAt === 'string' ? Date.parse(details.endAt) : NaN
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue
        shiftCount += 1
        const hours = (endMs - startMs) / (60 * 60 * 1000)
        totalHours += hours
        const wage = lookupWage(wageMap, details.teamMemberId, details.jobId)
        if (wage?.amount != null) {
          const rateMinor =
            typeof wage.amount === 'bigint' ? wage.amount : BigInt(Math.round(wage.amount))
          const scaled = BigInt(Math.round(hours * 1_000_000))
          costMinor += (rateMinor * scaled) / 1_000_000n
          if (!currency && wage.currency) currency = wage.currency
        } else {
          uncostedShiftCount += 1
        }
      }
      const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      const coverageRate =
        shiftCount > 0
          ? Math.round(((shiftCount - uncostedShiftCount) / shiftCount) * 10000) / 100
          : 0
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return {
        ok: true,
        data: {
          shiftCount,
          totalHours: Math.round(totalHours * 100) / 100,
          estimatedCost: currency
            ? { value: Math.round((Number(costMinor) / divisor) * 100) / 100, currency }
            : null,
          coverageRate,
          uncostedShiftCount,
          windowFromIso: window.startAt,
          windowToIso: window.endAt,
          truncated,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'getScheduledLaborSummary', err)
    }
  }

  /// Page through teamMemberWages for every team member that appears on the
  /// supplied scheduled shifts and build a (teamMemberId|jobId) → hourlyRate
  /// lookup. Wage rows without a jobId match any shift for that team member
  /// (stored under the empty-jobId key).
  ///
  /// Bounded: at most MAX_PAGES of 200 rows so a huge wage catalogue can't
  /// stall a chat turn. Best-effort — failures (missing scope, etc.) result
  /// in an empty map and the caller surfaces uncovered shifts.
  private async loadWageMap(
    client: ReturnType<typeof getSquareClient>,
    rawShifts: Array<Record<string, unknown>>,
  ): Promise<Map<string, { amount: bigint | number; currency?: string }>> {
    const map = new Map<string, { amount: bigint | number; currency?: string }>()
    const ids = new Set<string>()
    for (const s of rawShifts) {
      const d = pickShiftDetails(s)
      if (d?.teamMemberId) ids.add(d.teamMemberId)
    }
    if (ids.size === 0) return map
    try {
      const MAX_PAGES = 5
      const PAGE_LIMIT = 200
      let cursor: string | undefined
      let pages = 0
      const seenMembers = new Set<string>()
      while (pages < MAX_PAGES) {
        const resp = await client.labor.teamMemberWages.list({
          limit: PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
        })
        const data = ((resp as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>
        for (const w of data) {
          const memberId = typeof w.teamMemberId === 'string' ? w.teamMemberId : null
          if (!memberId || !ids.has(memberId)) continue
          seenMembers.add(memberId)
          const jobId = typeof w.jobId === 'string' ? w.jobId : ''
          const rate = w.hourlyRate as { amount?: bigint | number; currency?: string } | undefined
          if (rate?.amount == null) continue
          const key = `${memberId}|${jobId}`
          // Square's labor.teamMemberWages.list returns the CURRENT rate per
          // (team_member, job) pair — historical/inactive rates live on the
          // deprecated employeeWages endpoint. So one row per key is the
          // expected shape; first-write-wins is safe. If Square ever changes
          // this and starts returning multiple, we'd need an "active" filter
          // (no such field exists on TeamMemberWage today).
          if (!map.has(key)) map.set(key, { amount: rate.amount, currency: rate.currency })
        }
        pages += 1
        const next = (resp as { cursor?: string }).cursor
        if (!next || data.length === 0) break
        if (seenMembers.size >= ids.size) break
        cursor = next
      }
    } catch (err) {
      // Best-effort. Missing EMPLOYEES_READ scope or 403s degrade gracefully —
      // the summary still returns hours, with uncostedShiftCount reflecting
      // the gap. Log so a tenant who revokes scope shows up in ops signals
      // instead of silently reporting 100% uncovered shifts forever.
      this.logger.warn(
        JSON.stringify({
          event: 'square.load_wage_map_failed',
          message: err instanceof Error ? err.message : String(err),
        }),
      )
    }
    return map
  }

  /// Resolve team-member names + wages onto raw ScheduledShift records.
  private async enrichScheduledShifts(
    client: ReturnType<typeof getSquareClient>,
    rawShifts: Array<Record<string, unknown>>,
  ): Promise<SquareScheduledShiftRow[]> {
    const ids = new Set<string>()
    for (const s of rawShifts) {
      const d = pickShiftDetails(s)
      if (d?.teamMemberId) ids.add(d.teamMemberId)
    }
    const [idToName, wageMap] = await Promise.all([
      this.loadTeamMemberNames(client, ids),
      this.loadWageMap(client, rawShifts),
    ])
    return rawShifts.map((s) => toScheduledShiftRow(s, idToName, wageMap))
  }

  /// Page through teamMembers.search to resolve a set of team member ids to
  /// "Given Family" display names. Shared by historical-shift and scheduled-
  /// shift enrichment so neither needs to repeat the pagination + cap logic.
  /// Best-effort — missing EMPLOYEES_READ scope returns an empty map and the
  /// caller surfaces opaque ids rather than failing the whole tool call.
  private async loadTeamMemberNames(
    client: ReturnType<typeof getSquareClient>,
    ids: Set<string>,
  ): Promise<Map<string, string>> {
    const idToName = new Map<string, string>()
    if (ids.size === 0) return idToName
    try {
      const PAGE_LIMIT = 200
      const MAX_PAGES = 10
      let cursor: string | undefined
      let pages = 0
      while (pages < MAX_PAGES) {
        const resp = await client.teamMembers.search({
          query: {},
          limit: PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
        })
        const members = ((resp as { teamMembers?: unknown[] }).teamMembers ?? []) as Array<
          Record<string, unknown>
        >
        for (const m of members) {
          const id = typeof m.id === 'string' ? m.id : null
          if (!id || !ids.has(id)) continue
          const given = typeof m.givenName === 'string' ? m.givenName : ''
          const family = typeof m.familyName === 'string' ? m.familyName : ''
          const full = `${given} ${family}`.trim()
          if (full) idToName.set(id, full)
        }
        if (idToName.size >= ids.size) break
        const next = (resp as { cursor?: string }).cursor
        if (!next || members.length === 0) break
        cursor = next
        pages += 1
      }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'square.load_team_member_names_failed',
          message: err instanceof Error ? err.message : String(err),
        }),
      )
    }
    return idToName
  }

  // ─── Period comparison ──────────────────────────────────────────────────

  /// Run two period summaries side-by-side and return both totals + deltas.
  /// Both periods MUST be closed (fromIso required) — comparing two rolling
  /// windows is meaningless ("last 7 days vs last 7 days" is the same window).
  async comparePeriods(
    orgId: string,
    args: {
      venueId: string
      metric: 'sales' | 'labor'
      periodA: { fromIso: string; toIso?: string; label?: string }
      periodB: { fromIso: string; toIso?: string; label?: string }
    },
  ): Promise<
    ToolResult<{
      metric: 'sales' | 'labor'
      periodA: PeriodSnapshot
      periodB: PeriodSnapshot
      delta: PeriodDelta
    }>
  > {
    const fetcher =
      args.metric === 'sales'
        ? (window: { fromIso: string; toIso?: string }) =>
            this.getSalesSummary(orgId, { venueId: args.venueId, ...window })
        : (window: { fromIso: string; toIso?: string }) =>
            this.getLaborSummary(orgId, { venueId: args.venueId, ...window })

    const [a, b] = await Promise.all([
      fetcher({ fromIso: args.periodA.fromIso, toIso: args.periodA.toIso }),
      fetcher({ fromIso: args.periodB.fromIso, toIso: args.periodB.toIso }),
    ])
    // Wrap downstream failures with period context so the agent can describe
    // which side broke ("April lookup failed") instead of a generic
    // "sales summary failed".
    if (!a.ok) {
      return fail(a.reason, `comparePeriods periodA: ${a.detail ?? a.reason}`)
    }
    if (!b.ok) {
      return fail(b.reason, `comparePeriods periodB: ${b.detail ?? b.reason}`)
    }

    const snapshotA = toPeriodSnapshot(args.metric, a.data, args.periodA.label ?? null)
    const snapshotB = toPeriodSnapshot(args.metric, b.data, args.periodB.label ?? null)
    const delta = computePeriodDelta(snapshotA, snapshotB)
    return {
      ok: true,
      data: { metric: args.metric, periodA: snapshotA, periodB: snapshotB, delta },
    }
  }

  // ─── Top items ──────────────────────────────────────────────────────────

  async getTopItems(
    orgId: string,
    args: { venueId: string; sortBy?: 'revenue' | 'quantity'; limit?: number } & WindowInput,
  ): Promise<
    ToolResult<{
      items: SquareTopItemRow[]
      windowHours: number
      truncated: boolean
    }>
  > {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 168, maxHours: SALES_MAX_HOURS })
    const PAGE_LIMIT = 500
    const MAX_PAGES = 5
    const sortBy = args.sortBy ?? 'revenue'
    const limit = Math.min(args.limit ?? 10, 50)
    try {
      const tally = new Map<
        string,
        {
          name: string
          variation: string | null
          quantity: number
          grossMinor: bigint
          orderIds: Set<string>
          currency: string | null
        }
      >()
      let cursor: string | undefined
      let pages = 0
      while (pages < MAX_PAGES) {
        const resp = await resolved.client.orders.search({
          locationIds: [resolved.locationId],
          limit: PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
          query: {
            filter: {
              dateTimeFilter: { createdAt: { startAt: window.startAt, endAt: window.endAt } },
              stateFilter: { states: ['COMPLETED'] },
            },
          },
        })
        const orders = ((resp as { orders?: unknown[] }).orders ?? []) as Array<
          Record<string, unknown>
        >
        for (const o of orders) {
          const orderId = typeof o.id === 'string' ? o.id : ''
          const lineItems = (o.lineItems ?? []) as Array<Record<string, unknown>>
          for (const li of lineItems) {
            // Group by catalogObjectId — falls back to name when the line item
            // is ad-hoc (no catalog link) so misc / custom items still rank.
            const catalogId = typeof li.catalogObjectId === 'string' ? li.catalogObjectId : ''
            const name = typeof li.name === 'string' ? li.name : 'Unknown'
            const variation =
              typeof li.variationName === 'string' && li.variationName.length > 0
                ? li.variationName
                : null
            const key = catalogId || `name:${name}|var:${variation ?? ''}`
            // Square encodes quantity as a high-precision decimal string —
            // "1.5" for 1.5kg of meat, "12" for 12 pints. Parse defensively
            // and skip rows that aren't a finite number; 0-qty rows are
            // legitimate (refunded line) so don't truthiness-collapse them.
            const qty = Number(li.quantity ?? 0)
            if (!Number.isFinite(qty)) continue
            const totalMoney = li.totalMoney as
              | { amount?: bigint | number; currency?: string }
              | undefined
            const grossMinor =
              totalMoney?.amount != null
                ? typeof totalMoney.amount === 'bigint'
                  ? totalMoney.amount
                  : BigInt(Math.round(totalMoney.amount))
                : 0n
            const existing = tally.get(key)
            if (existing) {
              existing.quantity += qty
              existing.grossMinor += grossMinor
              if (orderId) existing.orderIds.add(orderId)
              if (!existing.currency && totalMoney?.currency)
                existing.currency = totalMoney.currency
            } else {
              tally.set(key, {
                name,
                variation,
                quantity: qty,
                grossMinor,
                orderIds: orderId ? new Set([orderId]) : new Set(),
                currency: totalMoney?.currency ?? null,
              })
            }
          }
        }
        pages += 1
        const next = (resp as { cursor?: string }).cursor
        if (!next || orders.length === 0) {
          cursor = undefined
          break
        }
        cursor = next
      }
      const truncated = pages >= MAX_PAGES && cursor !== undefined
      const rows = Array.from(tally.values()).map((r) => {
        const divisor = r.currency && ZERO_DECIMAL_CURRENCIES.has(r.currency) ? 1 : 100
        return {
          name: r.name,
          variation: r.variation,
          quantitySold: Math.round(r.quantity * 100) / 100,
          grossSales: r.currency
            ? {
                value: Math.round((Number(r.grossMinor) / divisor) * 100) / 100,
                currency: r.currency,
              }
            : null,
          orderCount: r.orderIds.size,
        }
      })
      rows.sort((a, b) => {
        if (sortBy === 'quantity') return b.quantitySold - a.quantitySold
        const aRev = a.grossSales?.value ?? 0
        const bRev = b.grossSales?.value ?? 0
        return bRev - aRev
      })
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return {
        ok: true,
        data: { items: rows.slice(0, limit), windowHours: window.hours, truncated },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'getTopItems', err)
    }
  }

  // ─── Payment breakdown ──────────────────────────────────────────────────

  async getPaymentBreakdown(
    orgId: string,
    args: { venueId: string } & WindowInput,
  ): Promise<
    ToolResult<{
      paymentCount: number
      totalCollected: { value: number; currency: string } | null
      tips: { value: number; currency: string } | null
      averageTicket: { value: number; currency: string } | null
      byTender: Array<{
        tender: string
        count: number
        amount: { value: number; currency: string } | null
      }>
      windowHours: number
      truncated: boolean
    }>
  > {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 24, maxHours: SALES_MAX_HOURS })
    const PAGE_LIMIT = 100
    const MAX_PAGES = 10
    try {
      let cursor: string | undefined
      let pages = 0
      let paymentCount = 0
      let totalMinor = 0n
      let tipMinor = 0n
      let currency: string | null = null
      const tenderTally = new Map<string, { count: number; amountMinor: bigint }>()
      while (pages < MAX_PAGES) {
        const resp = await resolved.client.payments.list({
          locationId: resolved.locationId,
          beginTime: window.startAt,
          endTime: window.endAt,
          limit: PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
        })
        // Square returns a Page<Payment, …> — drain its current data slice.
        const payments = ((resp as { data?: unknown[] }).data ?? []) as Array<
          Record<string, unknown>
        >
        for (const p of payments) {
          if (p.status !== 'COMPLETED' && p.status !== 'APPROVED') continue
          paymentCount += 1
          const amt = p.amountMoney as { amount?: bigint | number; currency?: string } | undefined
          if (amt?.amount != null) {
            const v = typeof amt.amount === 'bigint' ? amt.amount : BigInt(Math.round(amt.amount))
            totalMinor += v
            if (!currency && amt.currency) currency = amt.currency
          }
          const tip = p.tipMoney as { amount?: bigint | number } | undefined
          if (tip?.amount != null) {
            tipMinor += typeof tip.amount === 'bigint' ? tip.amount : BigInt(Math.round(tip.amount))
          }
          // Collapse Square's tender taxonomy (CARD, CASH, EXTERNAL, WALLET,
          // BUY_NOW_PAY_LATER, BANK_ACCOUNT, GIFT_CARD, …) into the three
          // buckets the tool description promises: CARD, CASH, OTHER. The
          // long tail goes into OTHER so the agent doesn't need to know
          // every Square source-type.
          const sourceType = typeof p.sourceType === 'string' ? p.sourceType.toUpperCase() : 'OTHER'
          const tender = sourceType === 'CARD' ? 'CARD' : sourceType === 'CASH' ? 'CASH' : 'OTHER'
          const existing = tenderTally.get(tender) ?? { count: 0, amountMinor: 0n }
          existing.count += 1
          if (amt?.amount != null) {
            existing.amountMinor +=
              typeof amt.amount === 'bigint' ? amt.amount : BigInt(Math.round(amt.amount))
          }
          tenderTally.set(tender, existing)
        }
        pages += 1
        const next = (resp as { cursor?: string }).cursor
        if (!next || payments.length === 0) {
          cursor = undefined
          break
        }
        cursor = next
      }
      const truncated = pages >= MAX_PAGES && cursor !== undefined
      const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      const avgMinor = paymentCount > 0 ? Number(totalMinor) / paymentCount : 0
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return {
        ok: true,
        data: {
          paymentCount,
          totalCollected: currency
            ? { value: Math.round((Number(totalMinor) / divisor) * 100) / 100, currency }
            : null,
          tips: currency
            ? { value: Math.round((Number(tipMinor) / divisor) * 100) / 100, currency }
            : null,
          averageTicket: currency
            ? { value: Math.round((avgMinor / divisor) * 100) / 100, currency }
            : null,
          byTender: Array.from(tenderTally.entries()).map(([tender, t]) => ({
            tender,
            count: t.count,
            amount: currency
              ? { value: Math.round((Number(t.amountMinor) / divisor) * 100) / 100, currency }
              : null,
          })),
          windowHours: window.hours,
          truncated,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'getPaymentBreakdown', err)
    }
  }

  // ─── Refunds ────────────────────────────────────────────────────────────

  async listRefunds(
    orgId: string,
    args: { venueId: string; limit?: number } & WindowInput,
  ): Promise<ToolResult<{ refunds: SquareRefundRow[]; windowHours: number }>> {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 168, maxHours: SALES_MAX_HOURS })
    try {
      const resp = await resolved.client.refunds.list({
        locationId: resolved.locationId,
        beginTime: window.startAt,
        endTime: window.endAt,
        limit: Math.min(args.limit ?? 25, 100),
        sortOrder: 'DESC',
      })
      const refunds = ((resp as { data?: unknown[] }).data ?? []) as Array<Record<string, unknown>>
      const mapped = refunds.map((r) => this.toRefundRow(r))
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return { ok: true, data: { refunds: mapped, windowHours: window.hours } }
    } catch (err) {
      return await this.handleApiError(orgId, 'listRefunds', err)
    }
  }

  async getRefundSummary(
    orgId: string,
    args: { venueId: string } & WindowInput,
  ): Promise<
    ToolResult<{
      refundCount: number
      totalRefunded: { value: number; currency: string } | null
      grossSales: { value: number; currency: string } | null
      refundRatePct: number | null
      windowHours: number
      truncated: boolean
    }>
  > {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 168, maxHours: SALES_MAX_HOURS })
    const PAGE_LIMIT = 100
    const MAX_PAGES = 10
    try {
      let cursor: string | undefined
      let pages = 0
      let refundCount = 0
      let refundedMinor = 0n
      let currency: string | null = null
      while (pages < MAX_PAGES) {
        const resp = await resolved.client.refunds.list({
          locationId: resolved.locationId,
          beginTime: window.startAt,
          endTime: window.endAt,
          limit: PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
          sortOrder: 'DESC',
        })
        const refunds = ((resp as { data?: unknown[] }).data ?? []) as Array<
          Record<string, unknown>
        >
        for (const r of refunds) {
          if (r.status !== 'COMPLETED') continue
          refundCount += 1
          const amt = r.amountMoney as { amount?: bigint | number; currency?: string } | undefined
          if (amt?.amount != null) {
            refundedMinor +=
              typeof amt.amount === 'bigint' ? amt.amount : BigInt(Math.round(amt.amount))
            if (!currency && amt.currency) currency = amt.currency
          }
        }
        pages += 1
        const next = (resp as { cursor?: string }).cursor
        if (!next || refunds.length === 0) {
          cursor = undefined
          break
        }
        cursor = next
      }
      const truncated = pages >= MAX_PAGES && cursor !== undefined
      // Gross sales over the same window for the refund-rate denominator.
      // We piggyback on getSalesSummary so currency / division logic stays
      // in one place — sales call is cheap and cached at the Square SDK
      // level for the location/window combo.
      const sales = await this.getSalesSummary(orgId, {
        venueId: args.venueId,
        fromIso: window.startAt,
        toIso: window.endAt,
      })
      const grossSales = sales.ok ? sales.data.gross : null
      const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      // Convert refunded total to major units (£/€/$) before dividing by
      // grossSales.value (already in major units). Result × 100 = percent.
      // Rounded to 2dp.
      const refundedMajor = Number(refundedMinor) / divisor
      const refundRatePct =
        grossSales && grossSales.value > 0
          ? Math.round((refundedMajor / grossSales.value) * 10000) / 100
          : null
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return {
        ok: true,
        data: {
          refundCount,
          totalRefunded: currency
            ? { value: Math.round((Number(refundedMinor) / divisor) * 100) / 100, currency }
            : null,
          grossSales,
          refundRatePct,
          windowHours: window.hours,
          truncated,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'getRefundSummary', err)
    }
  }

  // ─── Hourly breakdown ───────────────────────────────────────────────────

  async getHourlyBreakdown(
    orgId: string,
    args: { venueId: string; timezone?: 'venue' | 'utc' } & WindowInput,
  ): Promise<
    ToolResult<{
      buckets: Array<{
        hour: number
        orderCount: number
        grossSales: { value: number; currency: string } | null
      }>
      timezone: string
      windowHours: number
      truncated: boolean
    }>
  > {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 168, maxHours: SALES_MAX_HOURS })
    const useVenueTz = args.timezone !== 'utc'
    // Look up the location's timezone once. Falls back to UTC silently if
    // Square's locations.get omits it (very rare).
    let zone = 'UTC'
    if (useVenueTz) {
      try {
        const locResp = await resolved.client.locations.get({ locationId: resolved.locationId })
        const tz = (locResp as { location?: { timezone?: string } }).location?.timezone
        if (typeof tz === 'string' && tz.length > 0) zone = tz
      } catch {
        // Best-effort; UTC fallback is safe.
      }
    }
    const PAGE_LIMIT = 500
    const MAX_PAGES = 5
    try {
      const buckets: Array<{ orderCount: number; grossMinor: bigint }> = Array.from(
        { length: 24 },
        () => ({ orderCount: 0, grossMinor: 0n }),
      )
      let cursor: string | undefined
      let pages = 0
      let currency: string | null = null
      while (pages < MAX_PAGES) {
        const resp = await resolved.client.orders.search({
          locationIds: [resolved.locationId],
          limit: PAGE_LIMIT,
          ...(cursor ? { cursor } : {}),
          query: {
            filter: {
              dateTimeFilter: { createdAt: { startAt: window.startAt, endAt: window.endAt } },
              stateFilter: { states: ['COMPLETED'] },
            },
          },
        })
        const orders = ((resp as { orders?: unknown[] }).orders ?? []) as Array<
          Record<string, unknown>
        >
        for (const o of orders) {
          const createdAt = typeof o.createdAt === 'string' ? o.createdAt : null
          if (!createdAt) continue
          const hour = hourInZone(createdAt, zone)
          if (hour < 0 || hour > 23) continue
          buckets[hour].orderCount += 1
          const total = o.totalMoney as { amount?: bigint | number; currency?: string } | undefined
          if (total?.amount != null) {
            buckets[hour].grossMinor +=
              typeof total.amount === 'bigint' ? total.amount : BigInt(Math.round(total.amount))
            if (!currency && total.currency) currency = total.currency
          }
        }
        pages += 1
        const next = (resp as { cursor?: string }).cursor
        if (!next || orders.length === 0) {
          cursor = undefined
          break
        }
        cursor = next
      }
      const truncated = pages >= MAX_PAGES && cursor !== undefined
      const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return {
        ok: true,
        data: {
          buckets: buckets.map((b, h) => ({
            hour: h,
            orderCount: b.orderCount,
            grossSales: currency
              ? { value: Math.round((Number(b.grossMinor) / divisor) * 100) / 100, currency }
              : null,
          })),
          timezone: zone,
          windowHours: window.hours,
          truncated,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'getHourlyBreakdown', err)
    }
  }

  // ─── Team members ───────────────────────────────────────────────────────

  async listTeamMembers(
    orgId: string,
    args: { status?: 'ACTIVE' | 'INACTIVE' | 'ALL'; venueId?: string; limit?: number },
  ): Promise<ToolResult<{ members: SquareTeamMemberRow[] }>> {
    // Optional venue scoping — when venueId set, resolveForVenue gives us
    // both the client and the locationId; otherwise just the unscoped client.
    // Single resolve either way (the previous version called both).
    let scopedLocationId: string | null = null
    let client: ReturnType<typeof getSquareClient>
    if (args.venueId) {
      const resolved = await this.resolveForVenue(orgId, args.venueId)
      if (!('client' in resolved)) return resolved
      client = resolved.client
      scopedLocationId = resolved.locationId
    } else {
      const resolved = await this.resolveClient(orgId)
      if (!('client' in resolved)) return resolved
      client = resolved.client
    }
    const status = args.status ?? 'ACTIVE'
    try {
      const filter: Record<string, unknown> = {}
      if (status !== 'ALL') filter.status = status
      if (scopedLocationId) filter.locationIds = [scopedLocationId]
      const resp = await client.teamMembers.search({
        query: { filter },
        limit: Math.min(args.limit ?? 100, 200),
      })
      const members = ((resp as { teamMembers?: unknown[] }).teamMembers ?? []) as Array<
        Record<string, unknown>
      >
      const rows = members.map((m) => this.toTeamMemberRow(m))
      await this.integrations.touchLastSynced(orgId, SQUARE_PROVIDER_ID)
      return { ok: true, data: { members: rows } }
    } catch (err) {
      return await this.handleApiError(orgId, 'listTeamMembers', err)
    }
  }

  /// Resolve team-member ids on the given timeclock shifts to display names
  /// via the shared `loadTeamMemberNames` helper. Square's shifts payload
  /// only carries teamMemberId; without this hop the agent surfaces opaque
  /// UUIDs.
  private async enrichShiftsWithNames(
    client: ReturnType<typeof getSquareClient>,
    rawShifts: Array<Record<string, unknown>>,
  ): Promise<SquareShiftRow[]> {
    const ids = new Set<string>()
    for (const s of rawShifts) {
      const id = (s.teamMemberId ?? s.employeeId) as string | undefined
      if (typeof id === 'string' && id.length > 0) ids.add(id)
    }
    const idToName = await this.loadTeamMemberNames(client, ids)
    const now = Date.now()
    return rawShifts.map((s) => this.toShiftRow(s, idToName, now))
  }

  // ─── Mappers — Square's response shapes are deep and noisy; we project a
  // tight, agent-friendly subset for each tool. Anything the agent would
  // need to drill into stays available via the next tool call.

  // The Square v44 SDK serialises every field to camelCase — we don't need
  // snake_case fallbacks. Keep mappers tight so a future maintainer doesn't
  // see two branches and "fix" one.

  private toCatalogItem(raw: Record<string, unknown>): SquareCatalogItem | null {
    const id = raw.id as string | undefined
    if (!id) return null
    const itemData = raw.itemData as Record<string, unknown> | undefined
    if (!itemData) return null
    const variations = (itemData.variations ?? []) as Array<Record<string, unknown>>
    return {
      id,
      name: typeof itemData.name === 'string' ? itemData.name : '',
      description: typeof itemData.description === 'string' ? itemData.description : null,
      variations: variations
        .map((v): SquareCatalogItem['variations'][number] | null => {
          const vid = v.id as string | undefined
          if (!vid) return null
          const vd = v.itemVariationData as Record<string, unknown> | undefined
          const priceMoney = vd?.priceMoney
          const name = typeof vd?.name === 'string' ? vd.name : null
          const sku = typeof vd?.sku === 'string' ? vd.sku : null
          return {
            id: vid,
            name,
            sku,
            price: formatMoney(priceMoney as { amount?: bigint; currency?: string } | undefined),
          }
        })
        .filter((v): v is SquareCatalogItem['variations'][number] => v !== null),
    }
  }

  private toInventoryRow(raw: Record<string, unknown>): SquareInventoryRow {
    // Square serialises quantity as a string (it's a high-precision decimal).
    const qty = Number(raw.quantity ?? '0')
    return {
      catalogObjectId: typeof raw.catalogObjectId === 'string' ? raw.catalogObjectId : '',
      locationId: typeof raw.locationId === 'string' ? raw.locationId : '',
      quantity: Number.isFinite(qty) ? qty : 0,
      state: typeof raw.state === 'string' ? raw.state : null,
      calculatedAt: typeof raw.calculatedAt === 'string' ? raw.calculatedAt : null,
    }
  }

  private toOrderRow(raw: Record<string, unknown>): SquareOrderRow {
    const total = formatMoney(raw.totalMoney as { amount?: bigint; currency?: string } | undefined)
    const net = formatMoney(
      (raw.netAmounts as { totalMoney?: { amount?: bigint; currency?: string } } | undefined)
        ?.totalMoney,
    )
    const lineItems = (raw.lineItems ?? []) as Array<unknown>
    return {
      id: typeof raw.id === 'string' ? raw.id : '',
      state: typeof raw.state === 'string' ? raw.state : null,
      total,
      netAmounts: net,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
      closedAt: typeof raw.closedAt === 'string' ? raw.closedAt : null,
      source: ((raw.source as { name?: string } | undefined)?.name as string | undefined) ?? null,
      itemCount: lineItems.length,
    }
  }

  private toShiftRow(
    raw: Record<string, unknown>,
    idToName: Map<string, string>,
    now: number,
  ): SquareShiftRow {
    const teamMemberId =
      (typeof raw.teamMemberId === 'string' && raw.teamMemberId) ||
      (typeof raw.employeeId === 'string' && raw.employeeId) ||
      null
    const startStr = typeof raw.startAt === 'string' ? raw.startAt : null
    const endStr = typeof raw.endAt === 'string' ? raw.endAt : null
    const startMs = startStr ? Date.parse(startStr) : NaN
    const endMs = endStr ? Date.parse(endStr) : NaN
    const effectiveEnd = Number.isFinite(endMs) ? endMs : now
    const hours =
      Number.isFinite(startMs) && effectiveEnd > startMs
        ? Math.round(((effectiveEnd - startMs) / (60 * 60 * 1000)) * 100) / 100
        : 0

    const wage = raw.wage as
      | { title?: string; hourlyRate?: { amount?: bigint | number; currency?: string } }
      | undefined
    const hourlyRate = formatMoney(wage?.hourlyRate)
    const estimatedCost =
      hourlyRate && hours > 0
        ? {
            value: Math.round(hourlyRate.value * hours * 100) / 100,
            currency: hourlyRate.currency,
          }
        : null

    return {
      id: typeof raw.id === 'string' ? raw.id : '',
      teamMemberId,
      teamMemberName: teamMemberId ? (idToName.get(teamMemberId) ?? null) : null,
      status: typeof raw.status === 'string' ? raw.status : null,
      startAt: startStr,
      endAt: endStr,
      hours,
      hourlyRate,
      estimatedCost,
      jobTitle: typeof wage?.title === 'string' ? wage.title : null,
    }
  }

  private toLocation(raw: Record<string, unknown>): SquareLocation {
    const addr = raw.address as Record<string, unknown> | undefined
    const addrParts = addr
      ? [addr.addressLine1, addr.addressLine2, addr.locality, addr.postalCode]
          .filter((s): s is string => typeof s === 'string' && s.length > 0)
          .join(', ')
      : null
    return {
      id: typeof raw.id === 'string' ? raw.id : '',
      name: typeof raw.name === 'string' ? raw.name : null,
      status: typeof raw.status === 'string' ? raw.status : null,
      type: typeof raw.type === 'string' ? raw.type : null,
      currency: typeof raw.currency === 'string' ? raw.currency : null,
      timezone: typeof raw.timezone === 'string' ? raw.timezone : null,
      address: addrParts && addrParts.length > 0 ? addrParts : null,
    }
  }

  /// Public so sibling services route their SDK errors through the same
  /// auth-failure / 404 / 429 / 5xx UX without copy-pasting the mapping.
  async handleApiError(orgId: string, op: string, err: unknown): Promise<ToolResult<never>> {
    const e = err as {
      statusCode?: number
      message?: string
      body?: { errors?: Array<{ detail?: string; category?: string; code?: string }> }
    }
    const status = e?.statusCode
    // Log the full detail to our server logs (which never reach the model
    // / user). The user-facing reply uses a fixed message per status class
    // — we don't echo arbitrary Square strings back through the agent
    // because a prompt-injected query that triggers an error could surface
    // attacker-controlled text in the assistant's reply.
    const rawDetail = e?.message ?? e?.body?.errors?.[0]?.detail ?? 'unknown'

    if (status === 401 || status === 403) {
      await this.integrations.markError(
        orgId,
        SQUARE_PROVIDER_ID,
        `auth: Square returned ${status} — token may be revoked`,
      )
      this.logger.warn(
        JSON.stringify({
          event: 'square.auth_failure',
          orgId,
          op,
          status,
          detail: String(rawDetail).slice(0, 200),
        }),
      )
      return fail(
        'error',
        'Square rejected our credentials. Ask an owner or manager to reconnect Square in Settings → Integrations.',
      )
    }
    this.logger.warn(
      JSON.stringify({
        event: 'square.api_error',
        orgId,
        op,
        status,
        detail: String(rawDetail).slice(0, 200),
      }),
    )
    // Fixed user-facing message per status class — never echo Square's raw
    // detail string back through the agent (avoids surfacing attacker-
    // controlled content via prompt-injected queries, and avoids leaking
    // internal merchant ids / device codes / etc. from error bodies).
    if (status === 404) return fail('not-found', `Square couldn't find that resource (${op}).`)
    if (status === 429) {
      return fail('error', 'Square is rate-limiting us right now. Try again in a minute.')
    }
    if (typeof status === 'number' && status >= 500) {
      return fail('error', 'Square is having an outage right now. Try again in a minute.')
    }
    return fail('error', `Square call ${op} failed (status ${status ?? 'unknown'}).`)
  }

  // Mappers for the new tools — kept methods so they can read class state
  // later (none today; consistency with toOrderRow / toShiftRow).
  private toRefundRow(raw: Record<string, unknown>): SquareRefundRow {
    return {
      id: typeof raw.id === 'string' ? raw.id : '',
      status: typeof raw.status === 'string' ? raw.status : null,
      amount: formatMoney(raw.amountMoney as { amount?: bigint; currency?: string } | undefined),
      reason: typeof raw.reason === 'string' ? raw.reason : null,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
      paymentId: typeof raw.paymentId === 'string' ? raw.paymentId : null,
    }
  }

  private toTeamMemberRow(raw: Record<string, unknown>): SquareTeamMemberRow {
    const assignedRaw = raw.assignedLocations as { locationIds?: unknown[] } | undefined
    const ids = Array.isArray(assignedRaw?.locationIds)
      ? assignedRaw.locationIds.filter((x): x is string => typeof x === 'string')
      : []
    return {
      id: typeof raw.id === 'string' ? raw.id : '',
      givenName: typeof raw.givenName === 'string' ? raw.givenName : null,
      familyName: typeof raw.familyName === 'string' ? raw.familyName : null,
      status: typeof raw.status === 'string' ? raw.status : null,
      email: typeof raw.emailAddress === 'string' ? raw.emailAddress : null,
      phone: typeof raw.phoneNumber === 'string' ? raw.phoneNumber : null,
      isOwner: raw.isOwner === true,
      assignedLocationIds: ids,
    }
  }
}

// ─── Module-level helpers (no class state needed) ─────────────────────────

/// Project a sales/labor summary into the unified PeriodSnapshot shape so
/// pos_compare_periods can package both metrics through the same delta path.
function toPeriodSnapshot(
  metric: 'sales' | 'labor',
  data: Record<string, unknown>,
  label: string | null,
): PeriodSnapshot {
  const base: PeriodSnapshot = {
    label,
    fromIso: typeof data.windowFromIso === 'string' ? data.windowFromIso : '',
    toIso: typeof data.windowToIso === 'string' ? data.windowToIso : '',
    windowHours: typeof data.windowHours === 'number' ? data.windowHours : 0,
  }
  if (metric === 'sales') {
    base.orderCount = typeof data.orderCount === 'number' ? data.orderCount : 0
    base.gross = (data.gross as { value: number; currency: string } | null) ?? null
    base.net = (data.net as { value: number; currency: string } | null) ?? null
  } else {
    base.shiftCount = typeof data.shiftCount === 'number' ? data.shiftCount : 0
    base.totalHours = typeof data.totalHours === 'number' ? data.totalHours : 0
    base.estimatedCost = (data.estimatedCost as { value: number; currency: string } | null) ?? null
  }
  return base
}

function computePeriodDelta(a: PeriodSnapshot, b: PeriodSnapshot): PeriodDelta {
  const delta: PeriodDelta = {}
  const fields: Array<{ key: string; aVal: number | null; bVal: number | null }> = [
    { key: 'orderCount', aVal: a.orderCount ?? null, bVal: b.orderCount ?? null },
    { key: 'grossValue', aVal: a.gross?.value ?? null, bVal: b.gross?.value ?? null },
    { key: 'netValue', aVal: a.net?.value ?? null, bVal: b.net?.value ?? null },
    { key: 'shiftCount', aVal: a.shiftCount ?? null, bVal: b.shiftCount ?? null },
    { key: 'totalHours', aVal: a.totalHours ?? null, bVal: b.totalHours ?? null },
    {
      key: 'estimatedCostValue',
      aVal: a.estimatedCost?.value ?? null,
      bVal: b.estimatedCost?.value ?? null,
    },
  ]
  for (const f of fields) {
    if (f.aVal === null || f.bVal === null) continue
    const absolute = Math.round((f.aVal - f.bVal) * 100) / 100
    const percent = f.bVal === 0 ? null : Math.round(((f.aVal - f.bVal) / f.bVal) * 10000) / 100
    delta[f.key] = { absolute, percent }
  }
  return delta
}

// ─── Scheduled-shift helpers ─────────────────────────────────────────────

const SCHEDULE_WINDOW_MAX_HOURS = 24 * 90

function resolveScheduleWindow(input: ScheduleWindowInput | undefined): {
  startAt: string
  endAt: string
} {
  const now = Date.now()
  const HOUR = 60 * 60 * 1000
  if (input?.fromIso) {
    const startMs = Date.parse(input.fromIso)
    const endMs = input.toIso ? Date.parse(input.toIso) : now + 7 * 24 * HOUR
    const safeStart = Number.isFinite(startMs) ? startMs : now
    const safeEnd = Number.isFinite(endMs) ? endMs : now + 7 * 24 * HOUR
    if (safeEnd <= safeStart) {
      throw new RangeError(
        `invalid window: toIso (${input.toIso ?? new Date(safeEnd).toISOString()}) must be after fromIso (${input.fromIso})`,
      )
    }
    // Cap forward-looking windows by trimming the FAR end, not the near end.
    // A user asking "rota now → 100 days out" expects the next few days back,
    // not the back-half of the requested window with today missing.
    const span = safeEnd - safeStart
    const capped = Math.min(span, SCHEDULE_WINDOW_MAX_HOURS * HOUR)
    return {
      startAt: new Date(safeStart).toISOString(),
      endAt: new Date(safeStart + capped).toISOString(),
    }
  }
  const sinceHours = Math.min(Math.max(input?.sinceHours ?? 0, 0), SCHEDULE_WINDOW_MAX_HOURS)
  const aheadHours = Math.min(Math.max(input?.aheadHours ?? 168, 1), SCHEDULE_WINDOW_MAX_HOURS)
  return {
    startAt: new Date(now - sinceHours * HOUR).toISOString(),
    endAt: new Date(now + aheadHours * HOUR).toISOString(),
  }
}

/// Prefer published_shift_details (what staff see). Fall back to
/// draft_shift_details when unpublished. Returns null when neither is usable.
function pickShiftDetails(raw: Record<string, unknown>): {
  teamMemberId: string | null
  jobId: string | null
  startAt: string | null
  endAt: string | null
  notes: string | null
  published: boolean
} | null {
  const published = raw.publishedShiftDetails as Record<string, unknown> | undefined
  const draft = raw.draftShiftDetails as Record<string, unknown> | undefined
  const source = published ?? draft
  if (!source) return null
  // Exclude tombstoned variants. Square's docs are clearest on draft.isDeleted
  // (a manager removed it before publish), but defensively guard the published
  // path too — if published.isDeleted ever becomes a thing, we'd otherwise
  // surface deleted shifts on the rota.
  if (source.isDeleted === true) return null
  return {
    teamMemberId: typeof source.teamMemberId === 'string' ? source.teamMemberId : null,
    jobId: typeof source.jobId === 'string' ? source.jobId : null,
    startAt: typeof source.startAt === 'string' ? source.startAt : null,
    endAt: typeof source.endAt === 'string' ? source.endAt : null,
    notes: typeof source.notes === 'string' ? source.notes : null,
    published: Boolean(published),
  }
}

function lookupWage(
  wageMap: Map<string, { amount: bigint | number; currency?: string }>,
  teamMemberId: string | null,
  jobId: string | null,
): { amount: bigint | number; currency?: string } | null {
  if (!teamMemberId) return null
  if (jobId) {
    const exact = wageMap.get(`${teamMemberId}|${jobId}`)
    if (exact) return exact
  }
  // Fall back to a job-less wage row for that member (covers staff with a
  // single hourly rate and no per-job split).
  return wageMap.get(`${teamMemberId}|`) ?? null
}

function toScheduledShiftRow(
  raw: Record<string, unknown>,
  idToName: Map<string, string>,
  wageMap: Map<string, { amount: bigint | number; currency?: string }>,
): SquareScheduledShiftRow {
  const id = typeof raw.id === 'string' ? raw.id : ''
  const details = pickShiftDetails(raw)
  const teamMemberId = details?.teamMemberId ?? null
  const startAt = details?.startAt ?? null
  const endAt = details?.endAt ?? null
  const startMs = startAt ? Date.parse(startAt) : NaN
  const endMs = endAt ? Date.parse(endAt) : NaN
  const hours =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
      ? Math.round(((endMs - startMs) / (60 * 60 * 1000)) * 100) / 100
      : 0
  const wage = lookupWage(wageMap, teamMemberId, details?.jobId ?? null)
  const hourlyRate = wage ? formatMoney(wage) : null
  const estimatedCost =
    hourlyRate && hours > 0
      ? {
          value: Math.round(hourlyRate.value * hours * 100) / 100,
          currency: hourlyRate.currency,
        }
      : null
  return {
    id,
    teamMemberId,
    teamMemberName: teamMemberId ? (idToName.get(teamMemberId) ?? null) : null,
    status: details?.published ? 'PUBLISHED' : 'DRAFT',
    startAt,
    endAt,
    hours,
    hourlyRate,
    estimatedCost,
    // Square's ScheduledShiftDetails doesn't carry job title — only jobId. The
    // agent can call pos_list_team_members or a future job-list tool if it
    // really needs the title, but it's almost never asked for on a rota
    // question, so we leave it null rather than block on an extra round trip.
    jobTitle: null,
    notes: details?.notes ?? null,
  }
}

/// Hour-of-day (0-23) for an ISO timestamp in the given IANA zone. Falls back
/// to UTC if Intl rejects the zone (e.g. a malformed Square timezone string).
function hourInZone(iso: string, zone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: zone,
    })
    const parts = fmt.formatToParts(new Date(iso))
    const hourPart = parts.find((p) => p.type === 'hour')
    const n = hourPart ? Number.parseInt(hourPart.value, 10) : NaN
    return Number.isFinite(n) ? n % 24 : new Date(iso).getUTCHours()
  } catch {
    return new Date(iso).getUTCHours()
  }
}
