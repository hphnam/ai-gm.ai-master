import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../../database/prisma'
import { fail, type ToolResult } from '../../../types'
import { IntegrationsService } from '../integrations.service'
import { formatMoney, getSquareClient, ZERO_DECIMAL_CURRENCIES } from './square-client'

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

@Injectable()
export class SquareService {
  private readonly logger = new Logger(SquareService.name)

  constructor(private readonly integrations: IntegrationsService) {}

  /// Returns the active Square client + the venue's locationId for a tool
  /// call, OR a ToolResult fail() the caller can return verbatim. Centralised
  /// so every tool gets identical not-connected / not-mapped UX.
  private async resolveForVenue(
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
  /// authenticated client.
  private async resolveClient(
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
    args: { venueId: string; sinceHours?: number; limit?: number },
  ): Promise<ToolResult<{ orders: SquareOrderRow[] }>> {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const hours = Math.min(Math.max(args.sinceHours ?? 24, 1), 720)
    const startAt = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    try {
      const resp = await resolved.client.orders.search({
        locationIds: [resolved.locationId],
        limit: Math.min(args.limit ?? 25, 100),
        query: {
          filter: {
            dateTimeFilter: { createdAt: { startAt } },
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
      return { ok: true, data: { orders: mapped } }
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
    args: { venueId: string; sinceHours?: number },
  ): Promise<
    ToolResult<{
      orderCount: number
      gross: { value: number; currency: string } | null
      net: { value: number; currency: string } | null
      windowHours: number
      truncated: boolean
    }>
  > {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const hours = Math.min(Math.max(args.sinceHours ?? 24, 1), 720)
    const startAt = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
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
              dateTimeFilter: { createdAt: { startAt } },
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
          windowHours: hours,
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
    args: { venueId: string; sinceHours?: number; limit?: number },
  ): Promise<ToolResult<{ shifts: SquareShiftRow[] }>> {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const hours = Math.min(Math.max(args.sinceHours ?? 168, 1), 24 * 90)
    const startAt = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    try {
      const resp = await resolved.client.labor.shifts.search({
        limit: Math.min(args.limit ?? 50, 200),
        query: {
          filter: {
            locationIds: [resolved.locationId],
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
    args: { venueId: string; sinceHours?: number },
  ): Promise<
    ToolResult<{
      shiftCount: number
      activeCount: number
      totalHours: number
      estimatedCost: { value: number; currency: string } | null
      windowHours: number
      truncated: boolean
    }>
  > {
    const resolved = await this.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const hours = Math.min(Math.max(args.sinceHours ?? 168, 1), 24 * 90)
    const startAt = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
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
              start: { startAt },
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
          windowHours: hours,
          truncated,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'getLaborSummary', err)
    }
  }

  /// Resolve team-member ids on the given shifts to human-readable names via
  /// a single bulk `team.searchTeamMembers` call. Square's shifts payload
  /// only carries teamMemberId — without this hop the agent surfaces opaque
  /// UUIDs to the user.
  private async enrichShiftsWithNames(
    client: ReturnType<typeof getSquareClient>,
    rawShifts: Array<Record<string, unknown>>,
  ): Promise<SquareShiftRow[]> {
    const ids = new Set<string>()
    for (const s of rawShifts) {
      const id = (s.teamMemberId ?? s.employeeId) as string | undefined
      if (typeof id === 'string' && id.length > 0) ids.add(id)
    }
    const idToName = new Map<string, string>()
    if (ids.size > 0) {
      try {
        const resp = await client.teamMembers.search({
          query: { filter: { status: 'ACTIVE' } },
          limit: 200,
        })
        const members = ((resp as { teamMembers?: unknown[] }).teamMembers ?? []) as Array<
          Record<string, unknown>
        >
        for (const m of members) {
          const id = typeof m.id === 'string' ? m.id : null
          if (!id) continue
          const given = typeof m.givenName === 'string' ? m.givenName : ''
          const family = typeof m.familyName === 'string' ? m.familyName : ''
          const full = `${given} ${family}`.trim()
          if (full) idToName.set(id, full)
        }
      } catch {
        // Best-effort. If team members lookup fails (e.g. token lacks
        // EMPLOYEES_READ scope), we just surface ids. Logged at the caller.
      }
    }
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

  private async handleApiError(
    orgId: string,
    op: string,
    err: unknown,
  ): Promise<ToolResult<never>> {
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
}
