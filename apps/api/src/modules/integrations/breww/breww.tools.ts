import { z } from 'zod'
import type { IntegrationToolDefinition } from '../integration-provider'

export const BREWERY_LIST_BATCHES = 'brewery_list_batches'
export const BREWERY_LIST_PRODUCTS = 'brewery_list_products'
export const BREWERY_LIST_PURCHASE_ORDERS = 'brewery_list_purchase_orders'
export const BREWERY_GET_PRODUCT_MARGINS = 'brewery_get_product_margins'

const LIMIT = z.number().int().min(1).max(100).optional()

export const BREWW_TOOL_SCHEMAS: Readonly<Record<string, z.ZodTypeAny>> = {
  [BREWERY_LIST_BATCHES]: z.object({
    status: z.enum(['planned', 'in-progress', 'complete']).optional(),
    limit: LIMIT,
  }),
  [BREWERY_LIST_PRODUCTS]: z.object({
    query: z.string().min(1).max(120).optional(),
    limit: LIMIT,
  }),
  [BREWERY_LIST_PURCHASE_ORDERS]: z.object({
    sinceDays: z.number().int().min(1).max(365).optional(),
    limit: LIMIT,
  }),
  [BREWERY_GET_PRODUCT_MARGINS]: z.object({
    productQuery: z.string().min(1).max(120).optional(),
    limit: LIMIT,
  }),
}

const BASE_BREWW_TOOL_DEFINITIONS: ReadonlyArray<IntegrationToolDefinition> = [
  {
    name: BREWERY_LIST_BATCHES,
    description:
      'List production batches from the brewery management system. FIRES on "what\'s fermenting", "what batches are in progress", "when did we brew X", "what\'s in the tanks", "upcoming brews". Returns batch code, beer name, status (planned / in-progress / complete), ABV, volumes, start/completion dates, and current vessel(s). Defaults to in-progress batches, newest first — pass `status` to see planned or completed ones.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['planned', 'in-progress', 'complete'],
          description: 'Batch status filter (default in-progress)',
        },
        limit: { type: 'integer', description: 'Max batches (1-100, default 25)' },
      },
      required: [],
    },
  },
  {
    name: BREWERY_LIST_PRODUCTS,
    description:
      'List sellable packaged products (kegs, casks, cans, …) from the brewery management system. FIRES on "what packaged stock do we have", "how many kegs of X are left", "list our beers/products", "what can we sell". Returns name, product code, list price, packaged quantity on hand, and type. Pass `query` to filter by name. Values are in the brewery\'s base currency.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Filter products by name or code (case-insensitive contains match)',
        },
        limit: { type: 'integer', description: 'Max products (1-100, default 50)' },
      },
      required: [],
    },
  },
  {
    name: BREWERY_LIST_PURCHASE_ORDERS,
    description:
      'List supplier purchase orders from the brewery management system. FIRES on "what have we ordered from suppliers", "outstanding purchase orders", "what did that malt order cost", "landed cost of recent orders". Returns PO number, supplier reference, status, delivery date, items value, and landed cost total (items + shipping/duty/other costs). Window via `sinceDays` (default 90). Newest first.',
    input_schema: {
      type: 'object',
      properties: {
        sinceDays: { type: 'integer', description: 'Look-back window in days (1-365, default 90)' },
        limit: { type: 'integer', description: 'Max purchase orders (1-100, default 25)' },
      },
      required: [],
    },
  },
  {
    name: BREWERY_GET_PRODUCT_MARGINS,
    description:
      'Per-line production cost + margin from recent brewery (trade/wholesale) sales. FIRES on "what does it cost us to make X", "margin on our kegs", "production cost per cask", "COGS from the brewery side", "are we making money on Y". Returns the most recent sale lines with product name, quantity, sale value, production cost, packaging cost, duty, margin value, and margin %. Pass `productQuery` to scope to one product. These are Breww-computed brewery costs — the authoritative COGS source when the POS catalog has no unit costs. Values are in the brewery\'s base currency.',
    input_schema: {
      type: 'object',
      properties: {
        productQuery: {
          type: 'string',
          description: 'Scope to products whose name contains this (first match wins)',
        },
        limit: { type: 'integer', description: 'Max sale lines (1-100, default 25)' },
      },
      required: [],
    },
  },
]

/// Batches + packaged products are operational (staff ask "what's fermenting"
/// / "how many kegs left"); supplier costs and margins are financial and stay
/// on the fail-closed manager default.
const STAFF_VISIBLE_BREWERY_TOOLS = new Set<string>([BREWERY_LIST_BATCHES, BREWERY_LIST_PRODUCTS])

export const BREWW_TOOL_DEFINITIONS: ReadonlyArray<IntegrationToolDefinition> =
  BASE_BREWW_TOOL_DEFINITIONS.map((def) =>
    STAFF_VISIBLE_BREWERY_TOOLS.has(def.name) ? { ...def, minRole: 'staff' as const } : def,
  )
