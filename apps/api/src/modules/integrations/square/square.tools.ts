import { z } from 'zod'
import type { IntegrationToolDefinition } from '../integration-provider'
import { applyWindowRefinements, WindowInputShape, windowJsonSchemaProps } from './square-window'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

/// Square catalog object IDs are 30-char base32 (e.g. "ZJX24Z..."). We accept
/// anything alphanumeric so the agent isn't blocked on a Square format
/// change, but bound the length to keep the body small.
const SQUARE_ID = z.string().min(8).max(64)

// Per-tool window caps. Sales tools were 30d; bumped to 365d so the agent can
// answer "April vs March" or "Q1 vs Q4 last year". Labor stays at 90d (Square
// Labor API has slower endpoints + heavier shift volume; 90d is plenty for
// most ops questions).
const SALES_MAX_HOURS = 24 * 365
const LABOR_MAX_HOURS = 24 * 90
const SALES_DEFAULT_HOURS = 24
const LABOR_DEFAULT_HOURS = 168

export const POS_SEARCH_ITEMS = 'pos_search_items'
export const POS_GET_ITEM_INVENTORY = 'pos_get_item_inventory'
export const POS_LIST_RECENT_ORDERS = 'pos_list_recent_orders'
export const POS_GET_SALES_SUMMARY = 'pos_get_sales_summary'
export const POS_LIST_LOCATIONS = 'pos_list_locations'
export const POS_LIST_RECENT_SHIFTS = 'pos_list_recent_shifts'
export const POS_GET_ACTIVE_SHIFTS = 'pos_get_active_shifts'
export const POS_GET_LABOR_SUMMARY = 'pos_get_labor_summary'
export const POS_COMPARE_PERIODS = 'pos_compare_periods'
export const POS_GET_TOP_ITEMS = 'pos_get_top_items'
export const POS_GET_PAYMENT_BREAKDOWN = 'pos_get_payment_breakdown'
export const POS_LIST_REFUNDS = 'pos_list_refunds'
export const POS_GET_REFUND_SUMMARY = 'pos_get_refund_summary'
export const POS_GET_HOURLY_BREAKDOWN = 'pos_get_hourly_breakdown'
export const POS_LIST_TEAM_MEMBERS = 'pos_list_team_members'

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
  [POS_LIST_RECENT_ORDERS]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      limit: z.number().int().min(1).max(100).optional(),
      ...WindowInputShape,
    }),
  ),
  [POS_GET_SALES_SUMMARY]: applyWindowRefinements(z.object({ venueId: UUID, ...WindowInputShape })),
  [POS_LIST_LOCATIONS]: z.object({}).strict(),
  [POS_LIST_RECENT_SHIFTS]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      limit: z.number().int().min(1).max(200).optional(),
      /// Optional team-member filter. When supplied, only shifts for that
      /// teamMemberId surface — supports "Sarah's shifts last week".
      teamMemberId: SQUARE_ID.optional(),
      ...WindowInputShape,
    }),
  ),
  [POS_GET_ACTIVE_SHIFTS]: z.object({
    venueId: UUID,
  }),
  [POS_GET_LABOR_SUMMARY]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      teamMemberId: SQUARE_ID.optional(),
      ...WindowInputShape,
    }),
  ),
  [POS_COMPARE_PERIODS]: z.object({
    venueId: UUID,
    /// 'sales' compares orderCount + gross + net; 'labor' compares shiftCount
    /// + totalHours + estimatedCost.
    metric: z.enum(['sales', 'labor']),
    /// Period A — usually "current" / "this period". Closed window required:
    /// agent must pass fromIso (and optionally toIso, defaults to now). The
    /// "this month vs last month" UX requires fixed ranges so the comparison
    /// is meaningful.
    periodA: z
      .object({
        fromIso: z.string().datetime(),
        toIso: z.string().datetime().optional(),
        label: z.string().min(1).max(60).optional(),
      })
      .refine((p) => !p.toIso || Date.parse(p.toIso) > Date.parse(p.fromIso), {
        message: 'periodA.toIso must be after periodA.fromIso',
      }),
    periodB: z
      .object({
        fromIso: z.string().datetime(),
        toIso: z.string().datetime().optional(),
        label: z.string().min(1).max(60).optional(),
      })
      .refine((p) => !p.toIso || Date.parse(p.toIso) > Date.parse(p.fromIso), {
        message: 'periodB.toIso must be after periodB.fromIso',
      }),
  }),
  [POS_GET_TOP_ITEMS]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      limit: z.number().int().min(1).max(50).optional(),
      /// 'revenue' ranks by gross sold; 'quantity' ranks by units sold. Default
      /// 'revenue' — operators care about money first.
      sortBy: z.enum(['revenue', 'quantity']).optional(),
      ...WindowInputShape,
    }),
  ),
  [POS_GET_PAYMENT_BREAKDOWN]: applyWindowRefinements(
    z.object({ venueId: UUID, ...WindowInputShape }),
  ),
  [POS_LIST_REFUNDS]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      limit: z.number().int().min(1).max(100).optional(),
      ...WindowInputShape,
    }),
  ),
  [POS_GET_REFUND_SUMMARY]: applyWindowRefinements(
    z.object({ venueId: UUID, ...WindowInputShape }),
  ),
  [POS_GET_HOURLY_BREAKDOWN]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      /// 'venue' (default) groups by venue's local timezone. 'utc' uses UTC.
      timezone: z.enum(['venue', 'utc']).optional(),
      ...WindowInputShape,
    }),
  ),
  [POS_LIST_TEAM_MEMBERS]: z.object({
    /// Optional filter — defaults to ACTIVE only.
    status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).optional(),
    venueId: UUID.optional(),
    limit: z.number().int().min(1).max(200).optional(),
  }),
} as const

const salesWindowProps = windowJsonSchemaProps({
  defaultHours: SALES_DEFAULT_HOURS,
  maxHours: SALES_MAX_HOURS,
})
const laborWindowProps = windowJsonSchemaProps({
  defaultHours: LABOR_DEFAULT_HOURS,
  maxHours: LABOR_MAX_HOURS,
})

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
      'List POS orders/tickets at a venue inside a time window. FIRES on "what have we sold today", "show me recent tickets", "what came through in the last hour". Returns up to 100 orders newest-first with total, state, source, and item count. Window: pass `sinceHours` for rolling lookback OR `fromIso`/`toIso` for a fixed range (e.g. yesterday\'s service). For aggregate "how did we do today" use pos_get_sales_summary instead.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
        limit: { type: 'integer', description: 'Max orders (1-100, default 25)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_SALES_SUMMARY,
    description:
      'Aggregate POS sales over a time window. FIRES on "how did we do today", "what\'s the takings this week", "what\'s revenue this hour", "what did we make in April". Returns orderCount, gross revenue, and net revenue (after tax/discounts/refunds) summed across all COMPLETED orders at the venue\'s mapped POS location. Window can be rolling (`sinceHours`) OR fixed (`fromIso`/`toIso`) up to 365 days. For multi-period comparison use pos_compare_periods.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
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
      'List staff shifts at a venue inside a time window, sorted newest-first. FIRES on "who worked yesterday", "show me last week\'s shifts", "what shifts has Sarah done". Returns per-shift teamMemberName, status (OPEN/CLOSED), startAt, endAt, hours worked, hourly rate, estimated cost, and job title. Window: rolling `sinceHours` OR fixed `fromIso`/`toIso` (up to 90 days). Pass `teamMemberId` to filter to one staff member. For aggregate "how much did we spend on staff" use pos_get_labor_summary; for "who\'s on right now" use pos_get_active_shifts.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...laborWindowProps,
        teamMemberId: {
          type: 'string',
          description:
            "Optional Square team member id (e.g. from a prior pos_list_team_members hit). When set, only that member's shifts surface.",
        },
        limit: { type: 'integer', description: 'Max shifts (1-200, default 50)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_ACTIVE_SHIFTS,
    description:
      'List staff currently clocked in (shift status = OPEN) at a venue. FIRES on "who\'s on shift right now", "who\'s working", "anyone clocked in". Returns the same shift shape as pos_list_recent_shifts but filtered to OPEN status only. `hours` reflects time since clock-in. Use this for live floor visibility; use pos_list_recent_shifts for historical detail.',
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
      'Aggregate labor cost over a time window at a venue. FIRES on "how much did we spend on staff this week", "what\'s our labor cost today", "total wages this month", "how much did we pay Sarah last month". Returns shiftCount, activeCount, totalHours, estimatedCost (hourly_rate × hours), and a `truncated` flag if >1000 shifts in window. Window can be rolling (`sinceHours`) OR fixed (`fromIso`/`toIso`) up to 90 days. Pass `teamMemberId` to scope to one staff member. Does NOT include tips, salaried staff without hourly_rate, or overtime premium.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...laborWindowProps,
        teamMemberId: {
          type: 'string',
          description:
            'Optional Square team member id — when set, the totals reflect only that member.',
        },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_COMPARE_PERIODS,
    description:
      'Compare two fixed time periods side-by-side. FIRES on "this month vs last month", "compare yesterday to today", "Saturday compared to last Saturday", "Q1 vs Q4 last year". Pass `metric: "sales"` (orderCount + gross + net) or `metric: "labor"` (shiftCount + hours + cost). Each period takes `fromIso` (required) and `toIso` (optional, defaults to now). Returns both periods\' totals plus deltas (absolute + percent) so the agent can describe trend. Use this INSTEAD of two manual pos_get_*_summary calls — it ensures both periods are computed identically and packages the delta in one round trip. Pass optional `label` strings ("April", "March") to make the response self-describing.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        metric: { type: 'string', enum: ['sales', 'labor'] },
        periodA: {
          type: 'object',
          description: 'Usually "current". Required: fromIso. Optional: toIso, label.',
          properties: {
            fromIso: { type: 'string' },
            toIso: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['fromIso'],
        },
        periodB: {
          type: 'object',
          description: 'Usually "previous" / comparison baseline. Same shape as periodA.',
          properties: {
            fromIso: { type: 'string' },
            toIso: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['fromIso'],
        },
      },
      required: ['venueId', 'metric', 'periodA', 'periodB'],
    },
  },
  {
    name: POS_GET_TOP_ITEMS,
    description:
      'Top-selling items at a venue in a time window, ranked by revenue or quantity. FIRES on "what\'s our best seller this week", "top 10 wines this month", "which items are moving". Aggregates COMPLETED order line items, sums quantity + grossSales per catalog item. Returns name, variation, quantitySold, grossSales (in major units), and orderCount. Default sort is "revenue" — change to "quantity" for unit-volume questions. Truncates to top 50.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
        sortBy: {
          type: 'string',
          enum: ['revenue', 'quantity'],
          description: 'Default revenue. Use quantity for "what moved most units".',
        },
        limit: { type: 'integer', description: 'Top N (1-50, default 10)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_PAYMENT_BREAKDOWN,
    description:
      'Tender mix + tips + average ticket from completed Square Payments at a venue. FIRES on "cash vs card today", "what % was card", "tips this week", "average ticket size", "how much did we take in cash". Returns paymentCount, totalCollected, by-tender breakdown (CARD / CASH / OTHER) with amount and count, total tips, and averageTicket. Computed from Payment objects (not Order totals) so tender split is accurate even when one ticket is split-paid. Window can be rolling or fixed.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_LIST_REFUNDS,
    description:
      'List refunds issued at a venue inside a time window, newest-first. FIRES on "show me recent refunds", "what was refunded yesterday", "any refunds this week". Returns id, status (PENDING/COMPLETED/REJECTED/FAILED), amount, reason, and createdAt. For aggregate "what % of sales got refunded" use pos_get_refund_summary.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
        limit: { type: 'integer', description: 'Max refunds (1-100, default 25)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_REFUND_SUMMARY,
    description:
      'Aggregate refunds over a time window at a venue. FIRES on "what\'s our refund rate", "how much did we refund this week", "refund total this month". Returns refundCount, totalRefunded, and refundRatePct (computed against grossSales over the same window — null when no completed orders exist). Use to flag refund spikes; use pos_list_refunds for per-row drill-down.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_HOURLY_BREAKDOWN,
    description:
      'Bucket sales into 24 hour-of-day slots across a time window. FIRES on "what\'s our busiest hour", "when do we peak", "compare lunch to dinner takings", "how does staffing match revenue". Returns 24 buckets [{hour 0-23, orderCount, grossSales}] aggregated across the entire window (so a 7-day window shows averages-shaped weekday vs weekend smoothing — caller should narrow window for day-specific patterns). Useful paired with pos_get_labor_summary for cost-per-hour analysis.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
        timezone: {
          type: 'string',
          enum: ['venue', 'utc'],
          description:
            "Hour-of-day basis. Default 'venue' uses the mapped Square location's timezone — recommended so 'lunchtime' actually maps to 12-2pm local.",
        },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_LIST_TEAM_MEMBERS,
    description:
      'Roster of staff in the connected POS. FIRES on "who\'s on the team", "list all staff", "who works here". Returns id, givenName, familyName, status (ACTIVE/INACTIVE), email, phone, isOwner, and assignedLocationIds. Pass `venueId` to filter to staff assigned to that venue\'s mapped Square location. Default status filter is ACTIVE — pass \'ALL\' to include former staff. Useful BEFORE pos_list_recent_shifts(teamMemberId=…) so the agent has a Square id to filter by.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE', 'ALL'],
          description: 'Default ACTIVE. Use ALL for full roster including leavers.',
        },
        venueId: {
          type: 'string',
          description:
            "Optional venue UUID. When set, only team members assigned to the venue's mapped Square location surface.",
        },
        limit: { type: 'integer', description: 'Max members (1-200, default 100)' },
      },
      required: [],
    },
  },
]
