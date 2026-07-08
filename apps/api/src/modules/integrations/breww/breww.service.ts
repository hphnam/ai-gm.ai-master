import { Injectable, Logger } from '@nestjs/common'
import { fail, type ToolResult } from '../../../types'
import { IntegrationsService } from '../integrations.service'

export const BREWW_PROVIDER_ID = 'breww'

/// Breww public API (v0.1 beta): DRF-style REST at breww.com/api/, bearer
/// auth with `BRW.`-prefixed keys, page/page_size pagination returning
/// { count, next, previous, results }. Money fields are plain numbers in the
/// brewery's base currency. Read-only usage here — we only ever GET.
const BASE_URL = 'https://breww.com/api'

const REQUEST_TIMEOUT_MS = 15_000

const NOT_CONNECTED = fail(
  'not-supported',
  'No brewery-management integration is connected for this organisation. Ask an owner or manager to connect Breww in Settings → Integrations.',
)

const BATCH_STATUS_CODES = { planned: 1, 'in-progress': 2, complete: 3 } as const
const BATCH_STATUS_NAMES: Record<number, string> = {
  1: 'planned',
  2: 'in-progress',
  3: 'complete',
}
const PO_STATUS_NAMES: Record<number, string> = {
  1: 'draft',
  2: 'finalised',
  3: 'awaiting-approval',
}
const PRODUCT_TYPE_NAMES: Record<number, string> = {
  1: 'stock-item',
  2: 'cask',
  3: 'keg',
  4: 'smallpack',
  5: 'multi-pack',
  6: 'mixed-pack',
  8: 'service',
}

class BrewwApiError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(detail)
  }
}

type Raw = Record<string, unknown>
type PageResult = { results: Raw[]; count: number; truncated: boolean }

export type BrewwBatchRow = {
  id: number
  batchCode: string
  batchRef: string | null
  beer: string | null
  status: string
  abv: number | null
  startedAt: string | null
  completedAt: string | null
  totalVolume: string | null
  vessels: string | null
}

export type BrewwProductRow = {
  id: number
  name: string
  code: string | null
  type: string | null
  price: number | null
  packagedQuantity: number | null
  obsolete: boolean
}

export type BrewwPurchaseOrderRow = {
  id: number
  number: number | null
  supplierRef: string | null
  status: string
  createdAt: string | null
  deliveryDate: string | null
  currency: string | null
  totalItemsValue: number | null
  landedCostTotal: number | null
}

export type BrewwMarginRow = {
  saleId: number
  productName: string | null
  productCode: string | null
  quantity: number | null
  saleValue: number | null
  productionCost: number | null
  packagingCost: number | null
  dutyCost: number | null
  marginValue: number | null
  marginPercentage: number | null
}

@Injectable()
export class BrewwService {
  private readonly logger = new Logger(BrewwService.name)

  constructor(private readonly integrations: IntegrationsService) {}

  /// Connect-time PAT check: /business-details/ is the cheapest authenticated
  /// read and returns the account id + name for "Connected as <X>" in the UI.
  async validatePat(accessToken: string): Promise<{ externalAccountId: string | null }> {
    const resp = await fetch(`${BASE_URL}/business-details/`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!resp.ok) {
      throw new Error(`Breww validation failed with status ${resp.status}`)
    }
    // Documented as a paginated list, but tolerate a singleton object too —
    // unverified against a live account until the first real connect.
    const body = (await resp.json()) as { results?: Array<{ id?: number }>; id?: number }
    const first = body.results?.[0] ?? body
    return { externalAccountId: first?.id != null ? String(first.id) : null }
  }

  async listBatches(
    orgId: string,
    args: { status?: 'planned' | 'in-progress' | 'complete'; limit?: number },
  ): Promise<ToolResult<{ batches: BrewwBatchRow[]; totalCount: number; truncated: boolean }>> {
    try {
      const page = await this.getPage(orgId, '/drink-batches/', {
        status: BATCH_STATUS_CODES[args.status ?? 'in-progress'],
        ordering: '-created_on',
        page_size: Math.min(args.limit ?? 25, 100),
      })
      if (!('results' in page)) return page
      await this.integrations.touchLastSynced(orgId, BREWW_PROVIDER_ID)
      return {
        ok: true,
        data: {
          batches: page.results.map(toBatchRow),
          totalCount: page.count,
          truncated: page.truncated,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'listBatches', err)
    }
  }

  async listProducts(
    orgId: string,
    args: { query?: string; limit?: number },
  ): Promise<ToolResult<{ products: BrewwProductRow[]; totalCount: number; truncated: boolean }>> {
    const limit = Math.min(args.limit ?? 50, 100)
    try {
      // Breww only offers case-sensitive name__contains, so fetch a full
      // name-ordered page and match case-insensitively here — brewery
      // catalogs are small enough that one 100-row page covers them.
      const page = await this.getPage(orgId, '/products/', {
        obsolete: 'false',
        ordering: 'name',
        page_size: args.query ? 100 : limit,
      })
      if (!('results' in page)) return page
      const rows = page.results.map(toProductRow)
      const filtered = args.query ? filterByName(rows, args.query) : rows
      await this.integrations.touchLastSynced(orgId, BREWW_PROVIDER_ID)
      return {
        ok: true,
        data: {
          products: filtered.slice(0, limit),
          totalCount: args.query ? filtered.length : page.count,
          truncated: page.truncated,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'listProducts', err)
    }
  }

  async listPurchaseOrders(
    orgId: string,
    args: { sinceDays?: number; limit?: number },
  ): Promise<
    ToolResult<{
      purchaseOrders: BrewwPurchaseOrderRow[]
      totalCount: number
      truncated: boolean
      sinceDays: number
    }>
  > {
    const sinceDays = Math.min(Math.max(args.sinceDays ?? 90, 1), 365)
    try {
      const page = await this.getPage(orgId, '/purchase-orders/', {
        created_at__gte: new Date(Date.now() - sinceDays * 24 * 3600 * 1000).toISOString(),
        ordering: '-created_at',
        page_size: Math.min(args.limit ?? 25, 100),
      })
      if (!('results' in page)) return page
      await this.integrations.touchLastSynced(orgId, BREWW_PROVIDER_ID)
      return {
        ok: true,
        data: {
          purchaseOrders: page.results.map(toPurchaseOrderRow),
          totalCount: page.count,
          truncated: page.truncated,
          sinceDays,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'listPurchaseOrders', err)
    }
  }

  async getProductMargins(
    orgId: string,
    args: { productQuery?: string; limit?: number },
  ): Promise<
    ToolResult<{
      lines: BrewwMarginRow[]
      totalCount: number
      truncated: boolean
      scopedToProduct: string | null
    }>
  > {
    try {
      let productId: number | undefined
      let scopedToProduct: string | null = null
      if (args.productQuery) {
        const match = await this.getPage(orgId, '/products/', {
          obsolete: 'false',
          ordering: 'name',
          page_size: 100,
        })
        if (!('results' in match)) return match
        const product = filterByName(match.results.map(toProductRow), args.productQuery)[0]
        if (!product || product.id === 0) {
          return fail('not-found', `No Breww product matches "${args.productQuery}".`)
        }
        productId = product.id
        scopedToProduct = product.name
      }
      const page = await this.getPage(orgId, '/order-lines/', {
        ...(productId != null ? { product: productId } : {}),
        ordering: '-id',
        page_size: Math.min(args.limit ?? 25, 100),
      })
      if (!('results' in page)) return page
      await this.integrations.touchLastSynced(orgId, BREWW_PROVIDER_ID)
      return {
        ok: true,
        data: {
          lines: page.results.map(toMarginRow),
          totalCount: page.count,
          truncated: page.truncated,
          scopedToProduct,
        },
      }
    } catch (err) {
      return await this.handleApiError(orgId, 'getProductMargins', err)
    }
  }

  /// One authenticated GET of a DRF list page. Returns NOT_CONNECTED when the
  /// org has no active Breww integration; throws BrewwApiError on non-2xx.
  private async getPage(
    orgId: string,
    path: string,
    params: Record<string, string | number>,
  ): Promise<PageResult | ToolResult<never>> {
    const creds = await this.integrations.getActiveCredentials(orgId, BREWW_PROVIDER_ID)
    if (!creds) return NOT_CONNECTED
    const url = new URL(`${BASE_URL}${path}`)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value))
    }
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!resp.ok) {
      const bodyText = await resp.text().catch(() => '')
      throw new BrewwApiError(resp.status, bodyText.slice(0, 300))
    }
    const body = (await resp.json()) as { count?: number; next?: string | null; results?: Raw[] }
    const results = Array.isArray(body.results) ? body.results : []
    return { results, count: body.count ?? results.length, truncated: body.next != null }
  }

  /// Same UX contract as SquareService.handleApiError: fixed message per
  /// status class, raw detail only in server logs, 401/403 flags the row so
  /// the UI shows a reconnect CTA. Breww has no product-gated endpoints in
  /// the surface we call, so every auth failure is a genuine key problem.
  private async handleApiError(
    orgId: string,
    op: string,
    err: unknown,
  ): Promise<ToolResult<never>> {
    const status = err instanceof BrewwApiError ? err.status : undefined
    const detail = err instanceof Error ? err.message : 'unknown'
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      this.logger.warn(JSON.stringify({ event: 'breww.timeout', orgId, op }))
      return fail('error', "Breww didn't respond in time. Try again in a minute.")
    }
    if (status === 401 || status === 403) {
      await this.integrations.markError(
        orgId,
        BREWW_PROVIDER_ID,
        `auth: Breww returned ${status} — key may be revoked`,
      )
      this.logger.warn(
        JSON.stringify({
          event: 'breww.auth_failure',
          orgId,
          op,
          status,
          detail: detail.slice(0, 200),
        }),
      )
      return fail(
        'error',
        'Breww rejected our API key. Ask an owner or manager to reconnect Breww in Settings → Integrations.',
      )
    }
    this.logger.warn(
      JSON.stringify({ event: 'breww.api_error', orgId, op, status, detail: detail.slice(0, 200) }),
    )
    if (status === 404) return fail('not-found', `Breww couldn't find that resource (${op}).`)
    if (status === 429) {
      return fail('error', 'Breww is rate-limiting us right now. Try again in a minute.')
    }
    if (typeof status === 'number' && status >= 500) {
      return fail('error', 'Breww is having an outage right now. Try again in a minute.')
    }
    return fail('error', `Breww call ${op} failed (status ${status ?? 'unknown'}).`)
  }
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/// The wire shape of Breww's volume/vessel structures isn't pinned by their
/// schema — flatten to a bounded string so oversized or adversarial nested
/// content can't reach the model.
function boundedJson(value: unknown): string | null {
  if (value == null) return null
  try {
    return JSON.stringify(value).slice(0, 300)
  } catch {
    return null
  }
}

export function toBatchRow(raw: Raw): BrewwBatchRow {
  const drink = raw.drink as { name?: string } | null | undefined
  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    batchCode: str(raw.batch_code) ?? '',
    batchRef: str(raw.batch_ref),
    beer: str(drink?.name),
    status: BATCH_STATUS_NAMES[raw.status as number] ?? String(raw.status ?? 'unknown'),
    abv: num(raw.abv),
    startedAt: str(raw.datetime_started),
    completedAt: str(raw.datetime_completed),
    totalVolume: boundedJson(raw.total_volume),
    vessels: boundedJson(raw.current_vessel_info),
  }
}

export function toProductRow(raw: Raw): BrewwProductRow {
  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    name: str(raw.name) ?? '',
    code: str(raw.code),
    type: typeof raw.type === 'number' ? (PRODUCT_TYPE_NAMES[raw.type] ?? String(raw.type)) : null,
    price: num(raw.price),
    packagedQuantity: num(raw.total_packaged_beer_quantity),
    obsolete: raw.obsolete === true,
  }
}

export function filterByName<T extends { name: string; code: string | null }>(
  rows: T[],
  query: string,
): T[] {
  const q = query.toLowerCase()
  return rows.filter(
    (r) => r.name.toLowerCase().includes(q) || (r.code?.toLowerCase().includes(q) ?? false),
  )
}

export function toPurchaseOrderRow(raw: Raw): BrewwPurchaseOrderRow {
  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    number: num(raw.number),
    supplierRef: str(raw.supplier_ref),
    status: PO_STATUS_NAMES[raw.status as number] ?? String(raw.status ?? 'unknown'),
    createdAt: str(raw.created_at),
    deliveryDate: str(raw.delivery_date),
    currency: str(raw.currency),
    totalItemsValue: num(raw.total_items_value),
    landedCostTotal: num(raw.landed_cost_total),
  }
}

export function toMarginRow(raw: Raw): BrewwMarginRow {
  return {
    saleId: typeof raw.id === 'number' ? raw.id : 0,
    productName: str(raw.product_name),
    productCode: str(raw.product_code),
    quantity: num(raw.quantity),
    saleValue: num(raw.value),
    productionCost: num(raw.product_production_cost),
    packagingCost: num(raw.product_packaging_cost),
    dutyCost: num(raw.duty_cost),
    marginValue: num(raw.margin_value),
    marginPercentage: num(raw.margin_percentage),
  }
}
