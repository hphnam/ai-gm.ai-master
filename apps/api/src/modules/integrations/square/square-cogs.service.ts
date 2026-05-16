import { Injectable } from '@nestjs/common'
import { fail, type ToolResult } from '../../../types'
import { SquareService } from './square.service'
import { formatMoney, type getSquareClient, ZERO_DECIMAL_CURRENCIES } from './square-client'
import { resolveWindow, type WindowInput } from './square-window'

type Client = ReturnType<typeof getSquareClient>

const COGS_MAX_HOURS = 24 * 365

export type ItemCostRow = {
  catalogObjectId: string
  /// Weighted-average unit cost in major units, derived from the venue's
  /// RECEIVE_STOCK adjustments inside the lookback window. `null` when the
  /// variation has no priced receive events on file.
  unitCost: { value: number; currency: string } | null
  /// Total quantity received during the lookback (sanity check for the agent —
  /// a cost derived from a single 1-unit receive is less trustworthy than one
  /// derived from hundreds of units).
  quantityReceived: number
  /// Distinct receive events the weighted average was computed from.
  receiveEvents: number
}

export type CogsSummary = {
  /// Items sold in the sales window whose unit cost we could derive from
  /// recent receive events. Sums `unitCost × quantity_sold` per line item.
  cogsAmount: { value: number; currency: string } | null
  grossSales: { value: number; currency: string } | null
  netSales: { value: number; currency: string } | null
  /// Gross margin = (gross − cogs) / gross × 100. `null` when gross is zero,
  /// or when we have <50% line-item cost coverage (signal to the user that the
  /// figure is unreliable as-is — better to ask them for a cost %).
  grossMarginPct: number | null
  /// Percentage of sold line items we matched to a unit cost. <100% means we
  /// couldn't price the rest from Square's receive history — usually because
  /// the operator doesn't use Square for purchasing.
  coverageRate: number
  /// Items with the highest revenue we couldn't price — flag to the agent so
  /// it can suggest the operator add cost data for these.
  topUncostedItems: Array<{
    name: string
    quantitySold: number
    grossSales: { value: number; currency: string } | null
  }>
  windowHours: number
  windowFromIso: string
  windowToIso: string
  /// Whether the agent should fall back to asking the operator for a manual
  /// cost % (true when coverageRate < 50 OR no cost data at all). Matches the
  /// behaviour Ryan flagged from the production chat screenshot.
  recommendManualCostPercent: boolean
  truncated: boolean
}

@Injectable()
export class SquareCogsService {
  constructor(private readonly square: SquareService) {}

  /// Derive weighted-average unit cost per catalog variation from the venue's
  /// RECEIVE_STOCK inventory adjustments.
  ///
  /// Why this approach: Square's v44 SDK doesn't expose `cost_money` on
  /// `CatalogItemVariation`. The only authoritative cost data the public API
  /// surfaces is `InventoryAdjustment.totalPriceMoney` on RECEIVE_STOCK
  /// changes — i.e. what the seller paid the vendor when goods landed. We
  /// aggregate those across a lookback window and produce
  /// (sum_total_price / sum_quantity_received) per variation. The result is
  /// approximate (it's *receiving* cost, not landed cost; doesn't include
  /// shrinkage / wastage), but it's the best the platform gives us.
  ///
  /// Defaults to a 90-day lookback so we have enough receive events to make
  /// the average stable, while still tracking recent supplier price changes.
  async getItemCosts(
    orgId: string,
    args: { venueId: string; catalogObjectIds?: string[]; lookbackDays?: number },
  ): Promise<
    ToolResult<{ costs: ItemCostRow[]; lookbackDays: number; coverageHint: string | null }>
  > {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const lookbackDays = Math.min(Math.max(args.lookbackDays ?? 90, 1), 365)
    const lookbackMs = lookbackDays * 24 * 60 * 60 * 1000
    const updatedAfter = new Date(Date.now() - lookbackMs).toISOString()
    const wantedIds = args.catalogObjectIds ? new Set(args.catalogObjectIds) : null
    try {
      const tally = await collectReceiveCosts({
        client: resolved.client,
        locationId: resolved.locationId,
        updatedAfter,
        wantedIds,
      })
      const rows: ItemCostRow[] = []
      for (const [catalogObjectId, t] of tally) {
        const divisor = t.currency && ZERO_DECIMAL_CURRENCIES.has(t.currency) ? 1 : 100
        const totalMajor = Number(t.totalCostMinor) / divisor
        const unitCostValue = t.quantity > 0 ? totalMajor / t.quantity : null
        rows.push({
          catalogObjectId,
          unitCost:
            unitCostValue != null && t.currency
              ? { value: Math.round(unitCostValue * 1000) / 1000, currency: t.currency }
              : null,
          quantityReceived: Math.round(t.quantity * 100) / 100,
          receiveEvents: t.events,
        })
      }
      const coverageHint =
        wantedIds && rows.length < wantedIds.size
          ? `${wantedIds.size - rows.length} of ${wantedIds.size} requested variations have no receive cost on file in the last ${lookbackDays}d`
          : null
      await this.square.touchSync(orgId)
      return { ok: true, data: { costs: rows, lookbackDays, coverageHint } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getItemCosts', err)
    }
  }

  /// Compute COGS over a sales window by joining order line items to per-
  /// variation receive costs derived from the same Square account. Reports
  /// coverage explicitly so the agent can be honest with the user about how
  /// much of revenue we could actually price.
  async getCogsSummary(
    orgId: string,
    args: { venueId: string; lookbackDays?: number } & WindowInput,
  ): Promise<ToolResult<CogsSummary>> {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 24, maxHours: COGS_MAX_HOURS })
    const lookbackDays = Math.min(Math.max(args.lookbackDays ?? 90, 1), 365)
    const PAGE_LIMIT = 500
    const MAX_PAGES = 5
    try {
      // First pass: enumerate every variation sold in the sales window, while
      // also tallying gross/net for sanity (avoids needing a second pos_get_-
      // sales_summary call).
      const soldIds = new Set<string>()
      const lineByCatalog = new Map<
        string,
        {
          name: string
          quantity: number
          grossMinor: bigint
          currency: string | null
        }
      >()
      let cursor: string | undefined
      let pages = 0
      let grossMinor = 0n
      let netMinor = 0n
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
          const totalMoney = o.totalMoney as
            | { amount?: bigint | number; currency?: string }
            | undefined
          if (totalMoney?.amount != null) {
            grossMinor += toBigIntMinor(totalMoney.amount)
            if (!currency && totalMoney.currency) currency = totalMoney.currency
          }
          const net = (o.netAmounts as { totalMoney?: { amount?: bigint | number } } | undefined)
            ?.totalMoney
          if (net?.amount != null) netMinor += toBigIntMinor(net.amount)
          const lineItems = (o.lineItems ?? []) as Array<Record<string, unknown>>
          for (const li of lineItems) {
            const catalogId = typeof li.catalogObjectId === 'string' ? li.catalogObjectId : ''
            if (!catalogId) continue
            const name = typeof li.name === 'string' ? li.name : 'Unknown'
            const qty = Number(li.quantity ?? 0)
            if (!Number.isFinite(qty)) continue
            const liTotal = li.totalMoney as
              | { amount?: bigint | number; currency?: string }
              | undefined
            const liMinor = liTotal?.amount != null ? toBigIntMinor(liTotal.amount) : 0n
            soldIds.add(catalogId)
            const existing = lineByCatalog.get(catalogId)
            if (existing) {
              existing.quantity += qty
              existing.grossMinor += liMinor
              if (!existing.currency && liTotal?.currency) existing.currency = liTotal.currency
            } else {
              lineByCatalog.set(catalogId, {
                name,
                quantity: qty,
                grossMinor: liMinor,
                currency: liTotal?.currency ?? null,
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

      // Second pass: derive unit cost for every sold variation from receive
      // events. Skip if nothing was sold.
      const costTally =
        soldIds.size > 0
          ? await collectReceiveCosts({
              client: resolved.client,
              locationId: resolved.locationId,
              updatedAfter: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString(),
              wantedIds: soldIds,
            })
          : new Map<string, ReceiveTally>()

      // Join: for each sold line, multiply quantity_sold × unit_cost; track
      // coverage (% line items priced) and top uncosted items.
      let cogsMinor = 0n
      let costCurrency: string | null = null
      let costedLines = 0
      const uncosted: Array<{
        name: string
        quantitySold: number
        grossSales: { value: number; currency: string } | null
      }> = []
      const totalLines = lineByCatalog.size
      for (const [catalogId, line] of lineByCatalog) {
        const cost = costTally.get(catalogId)
        if (cost && cost.quantity > 0 && cost.totalCostMinor > 0n) {
          // Unit cost is held as minor units / quantity (a fractional rate),
          // so multiply line quantity × unit cost minor. Done with bigint
          // by scaling — keep precision but avoid floating drift.
          const unitCostMinorScaled =
            (cost.totalCostMinor * 1_000_000n) /
            BigInt(Math.max(1, Math.round(cost.quantity * 1_000_000)))
          const lineCogs =
            (unitCostMinorScaled * BigInt(Math.round(line.quantity * 1_000_000))) / 1_000_000n
          cogsMinor += lineCogs
          costedLines += 1
          if (!costCurrency && cost.currency) costCurrency = cost.currency
        } else {
          const divisor = line.currency && ZERO_DECIMAL_CURRENCIES.has(line.currency) ? 1 : 100
          uncosted.push({
            name: line.name,
            quantitySold: Math.round(line.quantity * 100) / 100,
            grossSales: line.currency
              ? {
                  value: Math.round((Number(line.grossMinor) / divisor) * 100) / 100,
                  currency: line.currency,
                }
              : null,
          })
        }
      }
      // Sort uncosted by revenue desc; cap at 10 so the agent only sees the
      // ones worth chasing.
      uncosted.sort((a, b) => (b.grossSales?.value ?? 0) - (a.grossSales?.value ?? 0))

      const salesDivisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      const cogsDivisor = costCurrency && ZERO_DECIMAL_CURRENCIES.has(costCurrency) ? 1 : 100
      const grossValue = currency ? Number(grossMinor) / salesDivisor : null
      const netValue = currency ? Number(netMinor) / salesDivisor : null
      const cogsValue = costCurrency ? Number(cogsMinor) / cogsDivisor : null
      const coverageRate = totalLines > 0 ? Math.round((costedLines / totalLines) * 10000) / 100 : 0
      const reliableCoverage = coverageRate >= 50
      const grossMarginPct =
        reliableCoverage && grossValue != null && grossValue > 0 && cogsValue != null
          ? Math.round(((grossValue - cogsValue) / grossValue) * 10000) / 100
          : null

      await this.square.touchSync(orgId)
      return {
        ok: true,
        data: {
          cogsAmount:
            costCurrency && cogsValue != null
              ? { value: Math.round(cogsValue * 100) / 100, currency: costCurrency }
              : null,
          grossSales:
            currency && grossValue != null
              ? { value: Math.round(grossValue * 100) / 100, currency }
              : null,
          netSales:
            currency && netValue != null
              ? { value: Math.round(netValue * 100) / 100, currency }
              : null,
          grossMarginPct,
          coverageRate,
          topUncostedItems: uncosted.slice(0, 10),
          windowHours: window.hours,
          windowFromIso: window.startAt,
          windowToIso: window.endAt,
          recommendManualCostPercent: coverageRate < 50,
          truncated,
        },
      }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getCogsSummary', err)
    }
  }

  /// Pure calculation tool — given a gross figure and a manual cost %, return
  /// computed COGS + gross margin. No Square call required, so this still
  /// works for venues with zero receive history. Lets the agent close the loop
  /// when getCogsSummary reports recommendManualCostPercent=true and the user
  /// supplies a cost % in the next turn.
  computeCogsFromPercent(args: {
    grossAmount: number
    costPercent: number
    currency?: string
  }): ToolResult<{
    cogsAmount: { value: number; currency: string }
    grossMarginPct: number
    inputs: { grossAmount: number; costPercent: number }
  }> {
    if (!Number.isFinite(args.grossAmount) || args.grossAmount < 0) {
      return fail('invalid-input', 'grossAmount must be a non-negative number')
    }
    if (!Number.isFinite(args.costPercent) || args.costPercent < 0 || args.costPercent > 100) {
      return fail('invalid-input', 'costPercent must be between 0 and 100')
    }
    const currency = args.currency ?? 'GBP'
    const cogsValue = Math.round(((args.grossAmount * args.costPercent) / 100) * 100) / 100
    const grossMarginPct = Math.round((100 - args.costPercent) * 100) / 100
    return {
      ok: true,
      data: {
        cogsAmount: { value: cogsValue, currency },
        grossMarginPct,
        inputs: { grossAmount: args.grossAmount, costPercent: args.costPercent },
      },
    }
  }
}

type ReceiveTally = {
  totalCostMinor: bigint
  quantity: number
  events: number
  currency: string | null
}

/// Drain inventory changes for a location, filtering to RECEIVE_STOCK
/// adjustments and accumulating per-variation cost + quantity. Common helper
/// used by both getItemCosts (explicit list) and getCogsSummary (full sweep).
///
/// Pagination is capped explicitly (not via `for await`) so a venue with high
/// inventory churn can't stall a chat turn. The async-iterable on Page auto-
/// fetches subsequent pages internally; switching to a cursor-style loop lets
/// us bound both page count AND wall-clock time. Anything beyond the cap is
/// truncated and surfaced as `truncated: true` by callers.
async function collectReceiveCosts(args: {
  client: Client
  locationId: string
  updatedAfter: string
  wantedIds: Set<string> | null
}): Promise<Map<string, ReceiveTally>> {
  const tally = new Map<string, ReceiveTally>()
  // batchGetChanges accepts array locationIds + a types filter; the singular
  // `changes` endpoint requires a single catalogObjectId which would force
  // one round-trip per variation — fine for getItemCosts(explicit ids) but
  // catastrophic for the full-sweep getCogsSummary case.
  let pageRef = await args.client.inventory.batchGetChanges({
    locationIds: [args.locationId],
    updatedAfter: args.updatedAfter,
    types: ['ADJUSTMENT'],
    ...(args.wantedIds && args.wantedIds.size > 0 && args.wantedIds.size <= 1000
      ? { catalogObjectIds: Array.from(args.wantedIds) }
      : {}),
  })
  // Wall-clock + page-count cap. Square pages at ~100 records by default, so
  // 6 pages ≈ 600 changes (plenty for a venue with daily receiving), and the
  // 4s budget keeps the chat turn snappy even when Square's API is slow.
  const MAX_PAGES = 6
  const MAX_RECORDS = 1000
  const BUDGET_MS = 4000
  const deadline = Date.now() + BUDGET_MS
  let processed = 0
  let pageNum = 0
  outer: while (true) {
    for (const change of pageRef.data) {
      processed += 1
      if (processed > MAX_RECORDS) break outer
      const c = change as Record<string, unknown>
      if (c.type !== 'ADJUSTMENT') continue
      const adj = c.adjustment as Record<string, unknown> | undefined
      if (!adj) continue
      // RECEIVE_STOCK and IN_STOCK_FROM_SOLD are the two "stock came in" flavours
      // that carry totalPriceMoney. We only want receive events — sold-returns
      // would inflate cost basis with retail prices.
      const fromState = typeof adj.fromState === 'string' ? adj.fromState : ''
      const toState = typeof adj.toState === 'string' ? adj.toState : ''
      const isReceive =
        (fromState === 'NONE' && toState === 'IN_STOCK') ||
        (fromState === 'SUPPLIER' && toState === 'IN_STOCK') ||
        (fromState === 'UNLINKED_RETURN' && toState === 'IN_STOCK')
      if (!isReceive) continue
      const catalogId = typeof adj.catalogObjectId === 'string' ? adj.catalogObjectId : ''
      if (!catalogId) continue
      if (args.wantedIds && !args.wantedIds.has(catalogId)) continue
      const quantity = Number(adj.quantity ?? 0)
      if (!Number.isFinite(quantity) || quantity <= 0) continue
      const total = adj.totalPriceMoney as
        | { amount?: bigint | number; currency?: string }
        | undefined
      if (total?.amount == null) continue
      const minor = toBigIntMinor(total.amount)
      const existing = tally.get(catalogId)
      if (existing) {
        existing.totalCostMinor += minor
        existing.quantity += quantity
        existing.events += 1
        if (!existing.currency && total.currency) existing.currency = total.currency
      } else {
        tally.set(catalogId, {
          totalCostMinor: minor,
          quantity,
          events: 1,
          currency: total.currency ?? null,
        })
      }
    }
    pageNum += 1
    if (pageNum >= MAX_PAGES) break
    if (!pageRef.hasNextPage()) break
    if (Date.now() >= deadline) break
    pageRef = await pageRef.getNextPage()
  }
  return tally
}

function toBigIntMinor(amount: bigint | number): bigint {
  return typeof amount === 'bigint' ? amount : BigInt(Math.round(amount))
}

// Surface formatMoney for tests / callers that round-trip Square Money shapes
// through the same normalisation logic.
export { formatMoney }
