import { Injectable } from '@nestjs/common'
import type { ToolResult } from '../../../types'
import { SquareService } from './square.service'
import { formatMoney, ZERO_DECIMAL_CURRENCIES } from './square-client'
import { resolveWindow, type WindowInput } from './square-window'

const CAT_MAX_HOURS = 24 * 365

// ─── Row types ──────────────────────────────────────────────────────────────

export type VendorRow = {
  id: string
  name: string | null
  status: string | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  primaryContactPhone: string | null
  accountNumber: string | null
  note: string | null
}

export type CategorySalesRow = {
  categoryId: string | null
  name: string
  quantitySold: number
  grossSales: { value: number; currency: string } | null
  orderCount: number
}

export type ModifierPopularityRow = {
  modifierId: string | null
  name: string
  parentModifierListName: string | null
  /// How many times this modifier was selected on a line item in window.
  selections: number
  /// Sum of the modifier's priceMoney across all selections (in major units).
  /// Null when modifier has no upcharge.
  addedRevenue: { value: number; currency: string } | null
}

export type DiscountUsageRow = {
  discountId: string | null
  name: string
  applications: number
  /// Total amount the discount removed from order subtotals (positive
  /// number representing money given away).
  amountDiscounted: { value: number; currency: string } | null
}

@Injectable()
export class SquareCatalogExtrasService {
  constructor(private readonly square: SquareService) {}

  // ─── Vendors ──────────────────────────────────────────────────────────────

  async listVendors(
    orgId: string,
    args: { limit?: number; status?: string },
  ): Promise<ToolResult<{ vendors: VendorRow[]; truncated: boolean }>> {
    const resolved = await this.square.resolveClient(orgId)
    if (!('client' in resolved)) return resolved
    const cap = Math.min(args.limit ?? 100, 200)
    const wantedStatus = args.status?.toUpperCase()
    try {
      const rows: VendorRow[] = []
      let cursor: string | undefined
      let pages = 0
      const MAX_PAGES = 10
      while (pages < MAX_PAGES && rows.length < cap) {
        const resp = await resolved.client.vendors.search({
          ...(cursor ? { cursor } : {}),
          filter:
            wantedStatus === 'ACTIVE' || wantedStatus === 'INACTIVE'
              ? { status: [wantedStatus] }
              : undefined,
        })
        const vendors = ((resp as { vendors?: unknown[] }).vendors ?? []) as Array<
          Record<string, unknown>
        >
        for (const raw of vendors) {
          rows.push(toVendorRow(raw))
          if (rows.length >= cap) break
        }
        pages += 1
        const next = (resp as { cursor?: string }).cursor
        if (!next || vendors.length === 0) {
          cursor = undefined
          break
        }
        cursor = next
      }
      await this.square.touchSync(orgId)
      return { ok: true, data: { vendors: rows, truncated: pages >= MAX_PAGES } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'listVendors', err)
    }
  }

  // ─── Category sales ───────────────────────────────────────────────────────

  async getCategorySales(
    orgId: string,
    args: { venueId: string; limit?: number } & WindowInput,
  ): Promise<
    ToolResult<{
      categories: CategorySalesRow[]
      windowHours: number
      truncated: boolean
    }>
  > {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 168, maxHours: CAT_MAX_HOURS })
    const cap = Math.min(args.limit ?? 25, 50)
    const PAGE_LIMIT = 500
    const MAX_PAGES = 5
    try {
      const tally = new Map<
        string,
        {
          categoryId: string | null
          name: string
          quantity: number
          grossMinor: bigint
          orderIds: Set<string>
          currency: string | null
        }
      >()
      let cursor: string | undefined
      let pages = 0
      // Collect distinct item ids from orders so we can batch a single catalog
      // lookup at the end to resolve category ids. Avoids per-line catalog
      // round-trips inside the order paging loop.
      const itemsSeen = new Set<string>()
      const lineRows: Array<{
        orderId: string
        catalogObjectId: string
        name: string
        quantity: number
        grossMinor: bigint
        currency: string | null
      }> = []
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
            const catalogObjectId = typeof li.catalogObjectId === 'string' ? li.catalogObjectId : ''
            const name = typeof li.name === 'string' ? li.name : 'Unknown'
            const qty = Number(li.quantity ?? 0)
            if (!Number.isFinite(qty)) continue
            const total = li.totalMoney as
              | { amount?: bigint | number; currency?: string }
              | undefined
            const minor =
              total?.amount != null
                ? typeof total.amount === 'bigint'
                  ? total.amount
                  : BigInt(Math.round(total.amount))
                : 0n
            if (catalogObjectId) itemsSeen.add(catalogObjectId)
            lineRows.push({
              orderId,
              catalogObjectId,
              name,
              quantity: qty,
              grossMinor: minor,
              currency: total?.currency ?? null,
            })
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

      // Resolve catalog → category id and category id → name via two batched
      // calls. Square caps batchGet at 1000 ids per request — chunk to be safe.
      const variationToItem = new Map<string, string>()
      const itemToCategory = new Map<string, string | null>()
      const categoryIdToName = new Map<string, string>()
      if (itemsSeen.size > 0) {
        const idList = Array.from(itemsSeen)
        for (let i = 0; i < idList.length; i += 1000) {
          const chunk = idList.slice(i, i + 1000)
          const variationResp = await resolved.client.catalog.batchGet({ objectIds: chunk })
          const objects = ((variationResp as { objects?: unknown[] }).objects ?? []) as Array<
            Record<string, unknown>
          >
          for (const obj of objects) {
            const id = typeof obj.id === 'string' ? obj.id : ''
            if (!id) continue
            if (obj.type === 'ITEM_VARIATION') {
              const data = obj.itemVariationData as { itemId?: string } | undefined
              if (typeof data?.itemId === 'string') variationToItem.set(id, data.itemId)
            } else if (obj.type === 'ITEM') {
              // Sometimes orders reference the parent item directly.
              variationToItem.set(id, id)
            }
          }
        }
        // Now fetch each ITEM to read its category id.
        const itemIds = Array.from(new Set(variationToItem.values()))
        for (let i = 0; i < itemIds.length; i += 1000) {
          const chunk = itemIds.slice(i, i + 1000)
          const itemResp = await resolved.client.catalog.batchGet({ objectIds: chunk })
          const objects = ((itemResp as { objects?: unknown[] }).objects ?? []) as Array<
            Record<string, unknown>
          >
          for (const obj of objects) {
            if (obj.type !== 'ITEM') continue
            const id = typeof obj.id === 'string' ? obj.id : ''
            const data = obj.itemData as
              | { categoryId?: string; categories?: Array<{ id?: string }> }
              | undefined
            const catId =
              (typeof data?.categoryId === 'string' && data.categoryId) ||
              (typeof data?.categories?.[0]?.id === 'string' && data.categories[0].id) ||
              null
            itemToCategory.set(id, catId)
          }
        }
        // Resolve category names in one more batch.
        const categoryIds = Array.from(
          new Set(Array.from(itemToCategory.values()).filter((x): x is string => !!x)),
        )
        for (let i = 0; i < categoryIds.length; i += 1000) {
          const chunk = categoryIds.slice(i, i + 1000)
          const catResp = await resolved.client.catalog.batchGet({ objectIds: chunk })
          const objects = ((catResp as { objects?: unknown[] }).objects ?? []) as Array<
            Record<string, unknown>
          >
          for (const obj of objects) {
            if (obj.type !== 'CATEGORY') continue
            const id = typeof obj.id === 'string' ? obj.id : ''
            const data = obj.categoryData as { name?: string } | undefined
            if (id && typeof data?.name === 'string') categoryIdToName.set(id, data.name)
          }
        }
      }

      for (const line of lineRows) {
        const itemId = variationToItem.get(line.catalogObjectId)
        const categoryId = itemId ? (itemToCategory.get(itemId) ?? null) : null
        const categoryName = categoryId
          ? (categoryIdToName.get(categoryId) ?? 'Uncategorised')
          : 'Uncategorised'
        const key = categoryId ?? `__none__`
        const existing = tally.get(key)
        if (existing) {
          existing.quantity += line.quantity
          existing.grossMinor += line.grossMinor
          if (line.orderId) existing.orderIds.add(line.orderId)
          if (!existing.currency && line.currency) existing.currency = line.currency
        } else {
          tally.set(key, {
            categoryId,
            name: categoryName,
            quantity: line.quantity,
            grossMinor: line.grossMinor,
            orderIds: line.orderId ? new Set([line.orderId]) : new Set(),
            currency: line.currency,
          })
        }
      }
      const rows = Array.from(tally.values())
        .map((r) => {
          const divisor = r.currency && ZERO_DECIMAL_CURRENCIES.has(r.currency) ? 1 : 100
          return {
            categoryId: r.categoryId,
            name: r.name,
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
        .sort((a, b) => (b.grossSales?.value ?? 0) - (a.grossSales?.value ?? 0))
        .slice(0, cap)
      await this.square.touchSync(orgId)
      return { ok: true, data: { categories: rows, windowHours: window.hours, truncated } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getCategorySales', err)
    }
  }

  // ─── Modifier popularity ──────────────────────────────────────────────────

  async getModifierPopularity(
    orgId: string,
    args: { venueId: string; limit?: number } & WindowInput,
  ): Promise<
    ToolResult<{
      modifiers: ModifierPopularityRow[]
      windowHours: number
      truncated: boolean
    }>
  > {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 168, maxHours: CAT_MAX_HOURS })
    const cap = Math.min(args.limit ?? 20, 50)
    const PAGE_LIMIT = 500
    const MAX_PAGES = 5
    try {
      const tally = new Map<
        string,
        {
          modifierId: string | null
          name: string
          selections: number
          revenueMinor: bigint
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
          const lineItems = (o.lineItems ?? []) as Array<Record<string, unknown>>
          for (const li of lineItems) {
            const modifiers = (li.modifiers ?? []) as Array<Record<string, unknown>>
            const qty = Number(li.quantity ?? 0)
            if (!Number.isFinite(qty) || qty <= 0) continue
            for (const m of modifiers) {
              const modifierId = typeof m.catalogObjectId === 'string' ? m.catalogObjectId : null
              const name = typeof m.name === 'string' ? m.name : 'Unknown'
              const key = modifierId ?? `name:${name}`
              const price = m.basePriceMoney as
                | { amount?: bigint | number; currency?: string }
                | undefined
              const priceMinor =
                price?.amount != null
                  ? typeof price.amount === 'bigint'
                    ? price.amount
                    : BigInt(Math.round(price.amount))
                  : 0n
              const lineRevenue = priceMinor * BigInt(Math.round(qty))
              const existing = tally.get(key)
              if (existing) {
                existing.selections += qty
                existing.revenueMinor += lineRevenue
                if (!existing.currency && price?.currency) existing.currency = price.currency
              } else {
                tally.set(key, {
                  modifierId,
                  name,
                  selections: qty,
                  revenueMinor: lineRevenue,
                  currency: price?.currency ?? null,
                })
              }
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
      const rows = Array.from(tally.values())
        .map((r) => {
          const divisor = r.currency && ZERO_DECIMAL_CURRENCIES.has(r.currency) ? 1 : 100
          return {
            modifierId: r.modifierId,
            name: r.name,
            parentModifierListName: null,
            selections: Math.round(r.selections * 100) / 100,
            addedRevenue:
              r.currency && r.revenueMinor > 0n
                ? {
                    value: Math.round((Number(r.revenueMinor) / divisor) * 100) / 100,
                    currency: r.currency,
                  }
                : null,
          }
        })
        .sort((a, b) => b.selections - a.selections)
        .slice(0, cap)
      await this.square.touchSync(orgId)
      return { ok: true, data: { modifiers: rows, windowHours: window.hours, truncated } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getModifierPopularity', err)
    }
  }

  // ─── Discount usage ───────────────────────────────────────────────────────

  async getDiscountUsage(
    orgId: string,
    args: { venueId: string; limit?: number } & WindowInput,
  ): Promise<
    ToolResult<{
      discounts: DiscountUsageRow[]
      windowHours: number
      truncated: boolean
    }>
  > {
    const resolved = await this.square.resolveForVenue(orgId, args.venueId)
    if (!('client' in resolved)) return resolved
    const window = resolveWindow(args, { defaultHours: 168, maxHours: CAT_MAX_HOURS })
    const cap = Math.min(args.limit ?? 20, 50)
    const PAGE_LIMIT = 500
    const MAX_PAGES = 5
    try {
      const tally = new Map<
        string,
        {
          discountId: string | null
          name: string
          applications: number
          amountMinor: bigint
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
          const discounts = (o.discounts ?? []) as Array<Record<string, unknown>>
          for (const d of discounts) {
            const id = typeof d.catalogObjectId === 'string' ? d.catalogObjectId : null
            const name = typeof d.name === 'string' ? d.name : 'Unknown'
            const key = id ?? `name:${name}`
            const applied = d.appliedMoney as
              | { amount?: bigint | number; currency?: string }
              | undefined
            const minor =
              applied?.amount != null
                ? typeof applied.amount === 'bigint'
                  ? applied.amount
                  : BigInt(Math.round(applied.amount))
                : 0n
            const existing = tally.get(key)
            if (existing) {
              existing.applications += 1
              existing.amountMinor += minor
              if (!existing.currency && applied?.currency) existing.currency = applied.currency
            } else {
              tally.set(key, {
                discountId: id,
                name,
                applications: 1,
                amountMinor: minor,
                currency: applied?.currency ?? null,
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
      const rows = Array.from(tally.values())
        .map((r) => {
          const divisor = r.currency && ZERO_DECIMAL_CURRENCIES.has(r.currency) ? 1 : 100
          return {
            discountId: r.discountId,
            name: r.name,
            applications: r.applications,
            amountDiscounted: r.currency
              ? {
                  value: Math.round((Number(r.amountMinor) / divisor) * 100) / 100,
                  currency: r.currency,
                }
              : null,
          }
        })
        .sort(
          (a, b) =>
            (b.amountDiscounted?.value ?? 0) - (a.amountDiscounted?.value ?? 0) ||
            b.applications - a.applications,
        )
        .slice(0, cap)
      await this.square.touchSync(orgId)
      return { ok: true, data: { discounts: rows, windowHours: window.hours, truncated } }
    } catch (err) {
      return await this.square.handleApiError(orgId, 'getDiscountUsage', err)
    }
  }
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function toVendorRow(raw: Record<string, unknown>): VendorRow {
  const contacts = (raw.contacts ?? []) as Array<Record<string, unknown>>
  const primary = contacts.find((c) => c.ordinal === 0 || contacts.length === 1) ?? contacts[0]
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    name: typeof raw.name === 'string' ? raw.name : null,
    status: typeof raw.status === 'string' ? raw.status : null,
    primaryContactName: typeof primary?.name === 'string' ? primary.name : null,
    primaryContactEmail:
      typeof primary?.emailAddress === 'string' ? (primary.emailAddress as string) : null,
    primaryContactPhone:
      typeof primary?.phoneNumber === 'string' ? (primary.phoneNumber as string) : null,
    accountNumber: typeof raw.accountNumber === 'string' ? raw.accountNumber : null,
    note: typeof raw.note === 'string' ? raw.note : null,
  }
}

// Re-export so tests can normalise Money the same way as the service.
export { formatMoney }
