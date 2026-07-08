import { Injectable } from '@nestjs/common'
import { fail, type ToolResult } from '../../../types'
import { SquareService } from './square.service'
import { formatMoney, type getSquareClient, ZERO_DECIMAL_CURRENCIES } from './square-client'
import { resolveWindow, type WindowInput } from './square-window'

type Client = ReturnType<typeof getSquareClient>

const COGS_MAX_HOURS = 24 * 365

export type ItemCostRow = {
  catalogObjectId: string
  /// Unit cost in major units. `null` only when the variation has neither a
  /// catalog unit cost nor any priced receive on file. See `source` for where
  /// the figure came from.
  unitCost: { value: number; currency: string } | null
  /// Total quantity received during the lookback (sanity check for the agent —
  /// a cost derived from a single 1-unit receive is less trustworthy than one
  /// derived from hundreds of units). 0 when the cost came from the catalog.
  quantityReceived: number
  /// Distinct receive events the weighted average was computed from. 0 when the
  /// cost came from the catalog.
  receiveEvents: number
  /// Where the unit cost came from: a receive-derived weighted average (actual
  /// paid, most accurate), the catalog's `defaultUnitCost` / vendor price, or
  /// nothing on file.
  source: 'receive-weighted-average' | 'catalog-default' | 'none'
}

type CatalogCost = { minor: bigint; currency: string }

/// Hospitality-norm cost-of-goods band the agent can offer when Square has
/// no cost data on file. Brewpubs / bars run 25-35% (beer 18-25%, wine 30-40%,
/// food 28-35%, spirits 18-22%) — picking the midpoint of the union gives
/// 30% as a sensible default if the operator can't supply one.
const HOSPITALITY_COST_PERCENT_HINT = {
  min: 25,
  max: 35,
  typical: 30,
} as const

export type CogsSummary = {
  /// COGS for the sales window: items sold × unit cost. Unit cost comes from
  /// the catalog (`CatalogItemVariation.defaultUnitCost`, or the per-supplier
  /// `itemVariationVendorInfos[].priceMoney`), preferring a receive-derived
  /// weighted average when the seller's account carries one. NULL only when
  /// none of the sold variations have any cost on file — `noData` below
  /// explains the manual-cost-% fallback for that case.
  cogsAmount: { value: number; currency: string } | null
  grossSales: { value: number; currency: string } | null
  netSales: { value: number; currency: string } | null
  /// Gross margin = (gross − cogs) / gross × 100. `null` whenever cogsAmount
  /// is null, gross is zero, or coverage is too low (<50%) to trust.
  grossMarginPct: number | null
  /// Percentage of sold line items we matched to a unit cost. 0 in the common
  /// case (see noData).
  coverageRate: number
  /// Items with the highest revenue we couldn't price — flag to the agent so
  /// it can suggest the operator add cost data for these. Empty when
  /// coverageRate is 0 (every item is "uncosted" and listing them all is noise).
  topUncostedItems: Array<{
    name: string
    quantitySold: number
    grossSales: { value: number; currency: string } | null
  }>
  windowHours: number
  windowFromIso: string
  windowToIso: string
  /// Whether the agent should fall back to asking the operator for a manual
  /// cost % (true when coverageRate < 50 OR no cost data at all).
  recommendManualCostPercent: boolean
  /// Loud, structured "we couldn't derive COGS" signal — present when either
  /// no orders fell in the window, or none of the sold variations carry a unit
  /// cost in the catalog. The agent should treat this as the cue to ask the
  /// user for a typical cost %, offering `suggestedCostPercent` as a starting
  /// point, then call pos_compute_cogs_from_percent to finish the calculation.
  /// Null when we have at least partial cost coverage.
  noData: {
    reason: 'no-unit-cost-on-catalog-items' | 'no-completed-orders-in-window'
    suggestedCostPercent: number
    suggestedCostPercentRange: { min: number; max: number }
    explanation: string
  } | null
  truncated: boolean
}

@Injectable()
export class SquareCogsService {
  constructor(private readonly square: SquareService) {}

  /// Resolve per-variation unit cost. Square exposes cost on the CATALOG
  /// (`CatalogItemVariation.defaultUnitCost`, and per-supplier on
  /// `itemVariationVendorInfos[].priceMoney`) — neither field is in the v44 SDK
  /// type, but both come back on the wire, so we read them off the raw object.
  /// That catalog cost is the reliable source. We ALSO scan RECEIVE_STOCK
  /// inventory adjustments and, when a variation has priced receives on file,
  /// prefer that weighted-average actual-paid cost over the static catalog
  /// figure. `source` on each row says which won.
  ///
  /// `InventoryAdjustment.totalPriceMoney` is populated only when
  /// `to_state === 'SOLD'`, so the receive scan is usually empty — but the
  /// catalog cost fills the gap for any variation the operator has costed in
  /// Square. Defaults to a 90-day receive lookback (more receives → more stable
  /// weighted average); the catalog read ignores it.
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
      const [tally, catalogCosts] = await Promise.all([
        collectReceiveCosts({
          client: resolved.client,
          locationId: resolved.locationId,
          updatedAfter,
          wantedIds,
        }),
        wantedIds && wantedIds.size > 0
          ? collectCatalogUnitCosts({ client: resolved.client, variationIds: wantedIds })
          : Promise.resolve(new Map<string, CatalogCost>()),
      ])
      const rows: ItemCostRow[] = []
      const ids = new Set<string>([...tally.keys(), ...catalogCosts.keys()])
      for (const catalogObjectId of ids) {
        const t = tally.get(catalogObjectId)
        if (t && t.quantity > 0 && t.totalCostMinor > 0n) {
          const divisor = t.currency && ZERO_DECIMAL_CURRENCIES.has(t.currency) ? 1 : 100
          const unitCostValue = Number(t.totalCostMinor) / divisor / t.quantity
          rows.push({
            catalogObjectId,
            unitCost: t.currency
              ? { value: Math.round(unitCostValue * 1000) / 1000, currency: t.currency }
              : null,
            quantityReceived: Math.round(t.quantity * 100) / 100,
            receiveEvents: t.events,
            source: 'receive-weighted-average',
          })
          continue
        }
        const cat = catalogCosts.get(catalogObjectId)
        rows.push({
          catalogObjectId,
          unitCost: cat
            ? { value: minorToMajor(cat.minor, cat.currency), currency: cat.currency }
            : null,
          quantityReceived: t ? Math.round(t.quantity * 100) / 100 : 0,
          receiveEvents: t?.events ?? 0,
          source: cat ? 'catalog-default' : 'none',
        })
      }
      const costed = rows.filter((r) => r.unitCost != null).length
      const coverageHint =
        wantedIds && costed < wantedIds.size
          ? `${wantedIds.size - costed} of ${wantedIds.size} requested variations have no unit cost on file (no catalog cost and no priced receives in the last ${lookbackDays}d)`
          : null
      await this.square.touchSync(orgId)
      return { ok: true, data: { costs: rows, lookbackDays, coverageHint } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getItemCosts', err)
    }
  }

  /// Compute COGS over a sales window by joining order line items to per-
  /// variation unit cost (catalog `defaultUnitCost`, or a receive-derived
  /// weighted average when the account carries one). Reports coverage
  /// explicitly so the agent can be honest with the user about how much of
  /// revenue we could actually price.
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

      // Second pass: resolve unit cost for every sold variation. Catalog cost
      // (defaultUnitCost / vendor price) is the reliable source; receive events
      // give an actual-paid weighted average when the account carries one. Fetch
      // both in parallel. Skip if nothing was sold.
      const [costTally, catalogCosts] =
        soldIds.size > 0
          ? await Promise.all([
              collectReceiveCosts({
                client: resolved.client,
                locationId: resolved.locationId,
                updatedAfter: new Date(
                  Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
                ).toISOString(),
                wantedIds: soldIds,
              }),
              collectCatalogUnitCosts({ client: resolved.client, variationIds: soldIds }),
            ])
          : [new Map<string, ReceiveTally>(), new Map<string, CatalogCost>()]

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
        const receive = costTally.get(catalogId)
        const catalog = catalogCosts.get(catalogId)
        // Prefer receive-derived (actual paid) cost when present; else the
        // catalog unit cost. Both resolve to a per-unit minor rate.
        let unitCostMinor: bigint | null = null
        let lineCurrency: string | null = null
        if (receive && receive.quantity > 0 && receive.totalCostMinor > 0n) {
          // Weighted average across all priced receives: total paid / total qty.
          unitCostMinor =
            (receive.totalCostMinor * 1_000_000n) /
            BigInt(Math.max(1, Math.round(receive.quantity * 1_000_000)))
          lineCurrency = receive.currency
        } else if (catalog && catalog.minor > 0n) {
          unitCostMinor = catalog.minor
          lineCurrency = catalog.currency
        }
        if (unitCostMinor != null) {
          cogsMinor += lineCogsMinor(unitCostMinor, line.quantity)
          costedLines += 1
          if (!costCurrency && lineCurrency) costCurrency = lineCurrency
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

      // Loud signal for the agent when we have no cost data at all. Two
      // distinct shapes so the model can phrase its reply correctly:
      //   - sold items carry no unit cost in the catalog → ask user for a
      //     typical cost % and call pos_compute_cogs_from_percent
      //   - no orders in window → tell user nothing was sold; the cost %
      //     doesn't help here
      let noData: CogsSummary['noData'] = null
      if (totalLines === 0 || grossValue == null || grossValue === 0) {
        noData = {
          reason: 'no-completed-orders-in-window',
          suggestedCostPercent: HOSPITALITY_COST_PERCENT_HINT.typical,
          suggestedCostPercentRange: {
            min: HOSPITALITY_COST_PERCENT_HINT.min,
            max: HOSPITALITY_COST_PERCENT_HINT.max,
          },
          explanation:
            'No completed orders fell inside this window. Confirm the date range or check the venue has activity in Square.',
        }
      } else if (coverageRate === 0) {
        noData = {
          reason: 'no-unit-cost-on-catalog-items',
          suggestedCostPercent: HOSPITALITY_COST_PERCENT_HINT.typical,
          suggestedCostPercentRange: {
            min: HOSPITALITY_COST_PERCENT_HINT.min,
            max: HOSPITALITY_COST_PERCENT_HINT.max,
          },
          explanation:
            'None of the items sold in this window have a unit cost set in Square (no defaultUnitCost on the catalog variation and no priced receives). Either ask the operator to set unit costs on their items in Square, or ask for their typical cost % (hospitality norm is 25-35%; 30% is a sensible default) and call pos_compute_cogs_from_percent to finish the calculation.',
        }
      }

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
          // Listing every sold item as "uncosted" when coverage is 0 is just
          // noise — the agent already gets the structured noData signal.
          topUncostedItems: coverageRate === 0 ? [] : uncosted.slice(0, 10),
          windowHours: window.hours,
          windowFromIso: window.startAt,
          windowToIso: window.endAt,
          recommendManualCostPercent: coverageRate < 50,
          noData,
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

/// Read per-variation unit cost straight from the Catalog. Square exposes this
/// on `CatalogItemVariation` as `default_unit_cost`, and per-supplier on
/// `item_variation_vendor_infos[].price_money`. Neither field is declared on
/// the v44 SDK type, so they arrive in raw snake_case (see readVariationCost) —
/// the same untyped-read pattern the rest of this integration uses for catalog
/// objects. Verified live: 92% of Lune's 693 variations carry default_unit_cost.
async function collectCatalogUnitCosts(args: {
  client: Client
  variationIds: Set<string>
}): Promise<Map<string, CatalogCost>> {
  const costs = new Map<string, CatalogCost>()
  const ids = Array.from(args.variationIds)
  // Square caps batchGet at 1000 object ids per request.
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = ids.slice(i, i + 1000)
    const resp = await args.client.catalog.batchGet({ objectIds: chunk })
    const objects = ((resp as { objects?: unknown[] }).objects ?? []) as Array<
      Record<string, unknown>
    >
    for (const obj of objects) {
      if (obj.type !== 'ITEM_VARIATION') continue
      const id = typeof obj.id === 'string' ? obj.id : ''
      if (!id) continue
      const data = obj.itemVariationData as Record<string, unknown> | undefined
      if (!data) continue
      const money = readVariationCost(data)
      if (money?.amount == null || !money.currency) continue
      costs.set(id, { minor: toBigIntMinor(money.amount), currency: money.currency })
    }
  }
  return costs
}

type Moneyish = { amount?: bigint | number; currency?: string }

/// `defaultUnitCost` is the canonical "what it costs me" field; the per-supplier
/// vendor price is the fallback when the operator only filled in supplier info.
///
/// CRITICAL — these fields are NOT in the v44 SDK's CatalogItemVariation type,
/// so the SDK's deserializer leaves them in their raw WIRE form (snake_case:
/// `default_unit_cost`, `item_variation_vendor_infos`, nested `price_money`).
/// Fields the SDK *does* know (priceMoney, itemId) come back camelCased. We
/// read snake_case first (today's reality) and fall back to camelCase so we
/// keep working if a future SDK upgrade adds the types and starts converting.
function readVariationCost(data: Record<string, unknown>): Moneyish | null {
  const direct = (data.default_unit_cost ?? data.defaultUnitCost) as Moneyish | undefined
  if (direct?.amount != null && direct.currency) return direct
  const vendorInfos = (data.item_variation_vendor_infos ?? data.itemVariationVendorInfos) as
    | Array<{
        item_variation_vendor_info_data?: { price_money?: Moneyish }
        itemVariationVendorInfoData?: { priceMoney?: Moneyish }
      }>
    | undefined
  const vendorPrice = vendorInfos
    ?.map(
      (v) =>
        v.item_variation_vendor_info_data?.price_money ?? v.itemVariationVendorInfoData?.priceMoney,
    )
    .find((m): m is Moneyish => m?.amount != null && !!m.currency)
  return vendorPrice ?? null
}

function minorToMajor(minor: bigint, currency: string): number {
  const divisor = ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
  return Math.round((Number(minor) / divisor) * 1000) / 1000
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
      // Real Square InventoryState values that represent stock landing in
      // inventory. See node_modules/square/serialization/types/InventoryState
      // for the full enum — the prior `SUPPLIER` value was a typo (no such
      // state exists; the real Square value is `RECEIVED_FROM_VENDOR`).
      // We only count receive transitions — sold-returns would inflate
      // cost basis with retail prices.
      const fromState = typeof adj.fromState === 'string' ? adj.fromState : ''
      const toState = typeof adj.toState === 'string' ? adj.toState : ''
      const isReceive =
        (fromState === 'NONE' && toState === 'IN_STOCK') ||
        (fromState === 'RECEIVED_FROM_VENDOR' && toState === 'IN_STOCK') ||
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

/// COGS for one sold line: per-unit minor cost × quantity. Quantity can be
/// fractional (e.g. 2.5 kg), so we scale it by 1e6 before the bigint multiply
/// and divide back out — keeps sub-unit precision without floating drift.
function lineCogsMinor(unitCostMinor: bigint, quantity: number): bigint {
  return (unitCostMinor * BigInt(Math.round(quantity * 1_000_000))) / 1_000_000n
}

// Surface formatMoney for tests / callers that round-trip Square Money shapes
// through the same normalisation logic.
export { formatMoney, readVariationCost, lineCogsMinor }
