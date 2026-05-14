import { z } from 'zod'
import type { IntegrationToolDefinition } from '../integration-provider'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

/// Square catalog object IDs are 30-char base32 (e.g. "ZJX24Z..."). We accept
/// anything alphanumeric so the agent isn't blocked on a Square format
/// change, but bound the length to keep the body small.
const SQUARE_ID = z.string().min(8).max(64)

export const POS_SEARCH_ITEMS = 'pos_search_items'
export const POS_GET_ITEM_INVENTORY = 'pos_get_item_inventory'
export const POS_LIST_RECENT_ORDERS = 'pos_list_recent_orders'
export const POS_GET_SALES_SUMMARY = 'pos_get_sales_summary'
export const POS_LIST_LOCATIONS = 'pos_list_locations'
export const POS_LIST_RECENT_SHIFTS = 'pos_list_recent_shifts'
export const POS_GET_ACTIVE_SHIFTS = 'pos_get_active_shifts'
export const POS_GET_LABOR_SUMMARY = 'pos_get_labor_summary'

export const SQUARE_TOOL_SCHEMAS = {
  [POS_SEARCH_ITEMS]: z.object({
    query: z.string().trim().min(1).max(200),
    /// Optional venueId. When supplied, the search is scoped to the venue's
    /// mapped POS location so multi-location orgs don't surface items from
    /// other venues. When omitted, the search runs org-wide.
    venueId: UUID.optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  [POS_GET_ITEM_INVENTORY]: z.object({
    venueId: UUID,
    catalogObjectIds: z.array(SQUARE_ID).min(1).max(50),
  }),
  [POS_LIST_RECENT_ORDERS]: z.object({
    venueId: UUID,
    sinceHours: z.number().int().min(1).max(720).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  [POS_GET_SALES_SUMMARY]: z.object({
    venueId: UUID,
    sinceHours: z.number().int().min(1).max(720).optional(),
  }),
  [POS_LIST_LOCATIONS]: z.object({}).strict(),
  [POS_LIST_RECENT_SHIFTS]: z.object({
    venueId: UUID,
    sinceHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 90)
      .optional(),
    limit: z.number().int().min(1).max(200).optional(),
  }),
  [POS_GET_ACTIVE_SHIFTS]: z.object({
    venueId: UUID,
  }),
  [POS_GET_LABOR_SUMMARY]: z.object({
    venueId: UUID,
    sinceHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 90)
      .optional(),
  }),
} as const

export const SQUARE_TOOL_DEFINITIONS: ReadonlyArray<IntegrationToolDefinition> = [
  {
    name: POS_SEARCH_ITEMS,
    description:
      'Search the connected POS catalog for items by name. FIRES on "what\'s the price of X", "how much do we charge for Y", "do we sell Z". Pass venueId from <current_context> to scope to a single venue\'s POS location (recommended for multi-venue orgs — otherwise items from sister venues mix in and a follow-up pos_get_item_inventory may then return zero). Returns items with all variations (size / option) and their prices, plus SKU and description. Use this BEFORE pos_get_item_inventory — you need the catalogObjectId of a variation to look up stock counts. Returns ok:false reason:\'not-supported\' when no POS integration is connected (route the user to Settings → Integrations).',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Partial item name (e.g. "lager", "Carlsberg", "house red")',
        },
        venueId: {
          type: 'string',
          description:
            "Optional venue UUID (from <current_context>). Scopes results to that venue's POS location — pass it whenever the user's question is venue-specific.",
        },
        limit: { type: 'integer', description: 'Max items to return (1-50, default 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: POS_GET_ITEM_INVENTORY,
    description:
      'Get current POS inventory counts for one or more catalog variations at a venue. FIRES on "how much X do we have", "do we have any Y left", "what\'s the stock of Z". Pass the venueId (from <current_context>) and the catalogObjectIds from a prior pos_search_items call. Returns per-variation counts at the venue\'s mapped POS location. Returns ok:false reason:\'invalid-input\' if the venue has no POS location mapped (manager needs to map it).',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        catalogObjectIds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Catalog VARIATION ids from a prior pos_search_items hit (item.variations[].id). Up to 50.',
        },
      },
      required: ['venueId', 'catalogObjectIds'],
    },
  },
  {
    name: POS_LIST_RECENT_ORDERS,
    description:
      'List recent POS orders/tickets at a venue. FIRES on "what have we sold today", "show me recent tickets", "what came through in the last hour". Returns up to 100 orders sorted newest-first, with total, state, source (e.g. "Square Point of Sale", "Online"), and item count. For aggregate "how did we do today" use pos_get_sales_summary instead — it sums net+gross over the window.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        sinceHours: {
          type: 'integer',
          description:
            'Time window in hours (1-720, default 24). "this morning" → 12, "today" → 24, "this week" → 168.',
        },
        limit: { type: 'integer', description: 'Max orders (1-100, default 25)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_SALES_SUMMARY,
    description:
      'Aggregate POS sales over a time window. FIRES on "how did we do today", "what\'s the takings this week", "what\'s revenue this hour". Returns orderCount, gross revenue, and net revenue (after tax/discounts/refunds) summed across all COMPLETED orders at the venue\'s mapped POS location. Use for top-line numbers; use pos_list_recent_orders for per-ticket detail.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        sinceHours: {
          type: 'integer',
          description: 'Time window in hours (1-720, default 24).',
        },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_LIST_LOCATIONS,
    description:
      "List all POS locations the connected integration can see. PRIMARILY a setup tool — managers call this to see what location IDs exist so they can map a venue to one. Don't call this for normal lookups; use pos_search_items / pos_list_recent_orders. Returns name, id, status, currency, timezone, and a short address line.",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: POS_LIST_RECENT_SHIFTS,
    description:
      'List recent staff shifts (clock-in / clock-out records) at a venue, sorted newest-first. FIRES on "who worked yesterday", "show me last week\'s shifts", "what shifts has Sarah done". Returns per-shift teamMemberName, status (OPEN = clocked in / CLOSED = done), startAt, endAt, hours worked, hourly rate, estimated cost, and job title. For aggregate "how much did we spend on staff" use pos_get_labor_summary instead. For "who\'s on right now" use pos_get_active_shifts.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        sinceHours: {
          type: 'integer',
          description:
            'Time window in hours (1-2160, default 168 = 7 days). "today" → 24, "this week" → 168, "this month" → 720.',
        },
        limit: { type: 'integer', description: 'Max shifts (1-200, default 50)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_ACTIVE_SHIFTS,
    description:
      'List staff currently clocked in (shift status = OPEN) at a venue. FIRES on "who\'s on shift right now", "who\'s working", "anyone clocked in". Returns the same shift shape as pos_list_recent_shifts but filtered to OPEN status only. `hours` reflects the time since clock-in (no endAt yet). Use this for live floor visibility; use pos_list_recent_shifts for historical detail.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_LABOR_SUMMARY,
    description:
      'Aggregate labor cost over a time window at a venue. FIRES on "how much did we spend on staff this week", "what\'s our labor cost today", "total wages this month". Returns shiftCount, activeCount (still clocked in), totalHours worked, estimatedCost (hourly_rate × hours, summed across all shifts in window — does NOT include tips, salaried staff without hourly_rate, or overtime premium), and a `truncated` flag if the window held more than 1000 shifts. Use this for the headline number; use pos_list_recent_shifts for per-shift detail.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        sinceHours: {
          type: 'integer',
          description:
            'Time window in hours (1-2160, default 168 = 7 days). "today" → 24, "this week" → 168, "this month" → 720.',
        },
      },
      required: ['venueId'],
    },
  },
]
