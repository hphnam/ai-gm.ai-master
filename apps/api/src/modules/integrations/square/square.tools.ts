import { z } from 'zod'
import type { IntegrationToolDefinition } from '../integration-provider'
import {
  applyScheduleWindowRefinements,
  applyWindowRefinements,
  ScheduleWindowInputShape,
  scheduleWindowJsonSchemaProps,
  WindowInputShape,
  windowJsonSchemaProps,
} from './square-window'

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
export const POS_LIST_SCHEDULED_SHIFTS = 'pos_list_scheduled_shifts'
export const POS_GET_SCHEDULED_LABOR_SUMMARY = 'pos_get_scheduled_labor_summary'
export const POS_COMPARE_PERIODS = 'pos_compare_periods'
export const POS_GET_TOP_ITEMS = 'pos_get_top_items'
export const POS_GET_PAYMENT_BREAKDOWN = 'pos_get_payment_breakdown'
export const POS_LIST_REFUNDS = 'pos_list_refunds'
export const POS_GET_REFUND_SUMMARY = 'pos_get_refund_summary'
export const POS_GET_HOURLY_BREAKDOWN = 'pos_get_hourly_breakdown'
export const POS_LIST_TEAM_MEMBERS = 'pos_list_team_members'

// COGS + cost-coverage tools (Phase: full Square sweep)
export const POS_GET_ITEM_COSTS = 'pos_get_item_costs'
export const POS_GET_COGS_SUMMARY = 'pos_get_cogs_summary'
export const POS_COMPUTE_COGS_FROM_PERCENT = 'pos_compute_cogs_from_percent'

// Commerce / risk
export const POS_LIST_DISPUTES = 'pos_list_disputes'
export const POS_GET_DISPUTE_SUMMARY = 'pos_get_dispute_summary'
export const POS_GET_CASH_DRAWER_SUMMARY = 'pos_get_cash_drawer_summary'
export const POS_LIST_GIFT_CARDS = 'pos_list_gift_cards'
export const POS_GET_GIFT_CARD_LIABILITY = 'pos_get_gift_card_liability'
export const POS_LIST_INVOICES = 'pos_list_invoices'
export const POS_GET_INVOICE_SUMMARY = 'pos_get_invoice_summary'
export const POS_LIST_PAYOUTS = 'pos_list_payouts'

// Catalog organisation
export const POS_LIST_VENDORS = 'pos_list_vendors'
export const POS_GET_CATEGORY_SALES = 'pos_get_category_sales'
export const POS_GET_MODIFIER_POPULARITY = 'pos_get_modifier_popularity'
export const POS_GET_DISCOUNT_USAGE = 'pos_get_discount_usage'

// CRM / loyalty / bookings / devices
export const POS_SEARCH_CUSTOMERS = 'pos_search_customers'
export const POS_GET_CUSTOMER_SUMMARY = 'pos_get_customer_summary'
export const POS_GET_LOYALTY_SUMMARY = 'pos_get_loyalty_summary'
export const POS_LIST_BOOKINGS = 'pos_list_bookings'
export const POS_GET_BOOKING_SUMMARY = 'pos_get_booking_summary'
export const POS_LIST_DEVICES = 'pos_list_devices'

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
  [POS_LIST_SCHEDULED_SHIFTS]: applyScheduleWindowRefinements(
    z.object({
      venueId: UUID,
      limit: z.number().int().min(1).max(200).optional(),
      teamMemberId: SQUARE_ID.optional(),
      includeDrafts: z.boolean().optional(),
      ...ScheduleWindowInputShape,
    }),
  ),
  [POS_GET_SCHEDULED_LABOR_SUMMARY]: applyScheduleWindowRefinements(
    z.object({
      venueId: UUID,
      teamMemberId: SQUARE_ID.optional(),
      includeDrafts: z.boolean().optional(),
      ...ScheduleWindowInputShape,
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

  // ─── COGS ────────────────────────────────────────────────────────────────
  [POS_GET_ITEM_COSTS]: z.object({
    venueId: UUID,
    catalogObjectIds: z.array(SQUARE_ID).max(200).optional(),
    lookbackDays: z.number().int().min(1).max(365).optional(),
  }),
  [POS_GET_COGS_SUMMARY]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      lookbackDays: z.number().int().min(1).max(365).optional(),
      ...WindowInputShape,
    }),
  ),
  [POS_COMPUTE_COGS_FROM_PERCENT]: z.object({
    grossAmount: z.number().min(0),
    costPercent: z.number().min(0).max(100),
    currency: z.string().min(3).max(8).optional(),
  }),

  // ─── Commerce / risk ─────────────────────────────────────────────────────
  [POS_LIST_DISPUTES]: z.object({
    venueId: UUID,
    limit: z.number().int().min(1).max(200).optional(),
    states: z.array(z.string().min(2).max(40)).max(10).optional(),
  }),
  [POS_GET_DISPUTE_SUMMARY]: z.object({ venueId: UUID }),
  [POS_GET_CASH_DRAWER_SUMMARY]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      limit: z.number().int().min(1).max(200).optional(),
      ...WindowInputShape,
    }),
  ),
  [POS_LIST_GIFT_CARDS]: z.object({
    limit: z.number().int().min(1).max(200).optional(),
    state: z.string().min(2).max(40).optional(),
  }),
  [POS_GET_GIFT_CARD_LIABILITY]: z.object({}).strict(),
  [POS_LIST_INVOICES]: z.object({
    venueId: UUID,
    limit: z.number().int().min(1).max(200).optional(),
    status: z.array(z.string().min(2).max(40)).max(10).optional(),
  }),
  [POS_GET_INVOICE_SUMMARY]: z.object({ venueId: UUID }),
  [POS_LIST_PAYOUTS]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      limit: z.number().int().min(1).max(100).optional(),
      status: z.enum(['SENT', 'PAID', 'FAILED']).optional(),
      ...WindowInputShape,
    }),
  ),

  // ─── Catalog organisation ────────────────────────────────────────────────
  [POS_LIST_VENDORS]: z.object({
    limit: z.number().int().min(1).max(200).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
  [POS_GET_CATEGORY_SALES]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      limit: z.number().int().min(1).max(50).optional(),
      ...WindowInputShape,
    }),
  ),
  [POS_GET_MODIFIER_POPULARITY]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      limit: z.number().int().min(1).max(50).optional(),
      ...WindowInputShape,
    }),
  ),
  [POS_GET_DISCOUNT_USAGE]: applyWindowRefinements(
    z.object({
      venueId: UUID,
      limit: z.number().int().min(1).max(50).optional(),
      ...WindowInputShape,
    }),
  ),

  // ─── CRM / loyalty / bookings / devices ──────────────────────────────────
  [POS_SEARCH_CUSTOMERS]: z
    .object({
      query: z.string().trim().min(1).max(120).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(4).max(40).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    })
    .refine((v) => v.query || v.email || v.phone, {
      message: 'pass at least one of query, email, or phone',
    }),
  [POS_GET_CUSTOMER_SUMMARY]: z.object({}).strict(),
  [POS_GET_LOYALTY_SUMMARY]: z.object({}).strict(),
  [POS_LIST_BOOKINGS]: z.object({
    venueId: UUID,
    limit: z.number().int().min(1).max(200).optional(),
    /// Hours back from now (default 0 = future-only). Cap 90 days.
    sinceHours: z
      .number()
      .int()
      .min(0)
      .max(24 * 90)
      .optional(),
    /// Hours forward from now (default 168 = next 7 days). Cap 90 days.
    aheadHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 90)
      .optional(),
  }),
  [POS_GET_BOOKING_SUMMARY]: z.object({
    venueId: UUID,
    aheadHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 90)
      .optional(),
  }),
  [POS_LIST_DEVICES]: z.object({
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
    name: POS_LIST_SCHEDULED_SHIFTS,
    description:
      'List FUTURE / SCHEDULED rota shifts at a venue (the rota staff see in Square Team) inside a forward-looking window. FIRES on "what\'s my rota for this week", "who\'s scheduled tomorrow", "rota for next week", "what shifts are on the rota for Saturday", "who\'s supposed to be in on Friday". DISTINCT from pos_list_recent_shifts — that one returns CLOCKED (timeclock) shifts only and CANNOT see future scheduled work. Returns per-shift teamMemberName, status (PUBLISHED/DRAFT), startAt, endAt, planned hours, hourlyRate (joined from teamMemberWages), estimatedCost, and notes. PUBLISHED = staff can see it in the Team app; DRAFT = manager has staged but not pressed publish (omitted by default — pass includeDrafts:true to see them). Window: rolling `aheadHours` (default 168 = next 7 days) plus optional `sinceHours` back, OR fixed `fromIso`/`toIso`. Pass `teamMemberId` to filter to one staff member. For aggregate "how much will the rota cost" use pos_get_scheduled_labor_summary; for clocked / historical shifts use pos_list_recent_shifts.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...scheduleWindowJsonSchemaProps({ defaultAheadHours: 168, maxHours: 24 * 90 }),
        teamMemberId: {
          type: 'string',
          description:
            "Optional Square team member id (e.g. from a prior pos_list_team_members hit). When set, only that member's scheduled shifts surface.",
        },
        includeDrafts: {
          type: 'boolean',
          description:
            "Default false — only PUBLISHED (staff-visible) shifts. Pass true to also see DRAFT shifts the manager hasn't published yet.",
        },
        limit: { type: 'integer', description: 'Max shifts (1-200, default 50)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_SCHEDULED_LABOR_SUMMARY,
    description:
      'Aggregate planned labour cost over a FUTURE / SCHEDULED rota window. FIRES on "how much will the rota cost this week", "planned labour for next week", "what\'s the cost of next week\'s schedule", "labour budget for Friday-Sunday". DISTINCT from pos_get_labor_summary — that one only sees clocked timeclock shifts. Returns shiftCount, totalHours (planned), estimatedCost (wage × hours summed across all scheduled shifts), coverageRate (% of shifts we could price via teamMemberWages), uncostedShiftCount (shifts whose assigned team member has no wage in Square — usually salaried staff), and `truncated:true` when the rota for the window exceeds ~1000 shifts (rare — flag it to the user and suggest narrowing the window). Window matches pos_list_scheduled_shifts. By default only PUBLISHED shifts count; pass `includeDrafts: true` to include the draft plan as well. Pair with pos_get_sales_summary for cost-vs-revenue planning.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...scheduleWindowJsonSchemaProps({ defaultAheadHours: 168, maxHours: 24 * 90 }),
        teamMemberId: {
          type: 'string',
          description:
            "Optional Square team member id — when set, the totals reflect only that member's scheduled shifts.",
        },
        includeDrafts: {
          type: 'boolean',
          description:
            "Default false. Pass true to include DRAFT shifts the manager hasn't published yet.",
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

  // ─── COGS ───────────────────────────────────────────────────────────────
  {
    name: POS_GET_ITEM_COSTS,
    description:
      'Weighted-average unit cost per catalog variation, derived from Square inventory RECEIVE adjustments at the venue. FIRES when the agent needs per-item COGS inputs — typically called by pos_get_cogs_summary internally, but exposed directly so the agent can answer "what does X cost us" / "what\'s our cost on the house red". Pass an optional `catalogObjectIds` list to scope; otherwise returns all variations with any receive history. lookbackDays defaults to 90 (more receives → more stable weighted average). Returns unitCost, quantityReceived, receiveEvents per variation. unitCost is null when the variation has no priced receive on file (operator likely doesn\'t use Square for purchasing).',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        catalogObjectIds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional list of catalog variation ids to scope to (up to 200). Omit to fetch every variation with receive history.',
        },
        lookbackDays: {
          type: 'integer',
          description: 'Days of receive history to weight the average over (1-365, default 90).',
        },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_COGS_SUMMARY,
    description:
      'Compute COGS + gross margin for a sales window. FIRES on "what\'s our COGS today", "calculate GP", "what\'s the gross margin this week", "cost of sales report", "how much did we spend on stock", "P&L numbers". Returns cogsAmount, grossSales, netSales, grossMarginPct, coverageRate, topUncostedItems, recommendManualCostPercent, and a structured `noData` object when Square couldn\'t supply cost data. IMPORTANT — Square\'s public API does NOT expose vendor cost for the typical seller; in production this tool will usually return cogsAmount:null, coverageRate:0, recommendManualCostPercent:true, and noData:{reason:"square-api-does-not-expose-vendor-cost", suggestedCostPercent:30, suggestedCostPercentRange:{min:25,max:35}, ...}. THIS IS THE EXPECTED FLOW — DO NOT TELL THE USER "no data". Instead: state the gross sales figure, say you can\'t pull vendor cost from Square automatically, offer the suggestedCostPercent (or ask the user for their own) and call pos_compute_cogs_from_percent on the next turn. The other noData reason "no-completed-orders-in-window" means the date range was empty — confirm the window with the user instead of asking for a cost %. Window: rolling sinceHours OR fixed fromIso/toIso (default 24h).',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
        lookbackDays: {
          type: 'integer',
          description:
            'Days of receive history to derive unit costs from (1-365, default 90). Longer = more coverage but stale prices; shorter = recent prices but thinner coverage.',
        },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_COMPUTE_COGS_FROM_PERCENT,
    description:
      'Pure calculator — given a gross revenue figure and an operator-supplied cost %, return computed COGS + grossMarginPct. NO Square call. FIRES after pos_get_cogs_summary returns recommendManualCostPercent=true AND the user has supplied a typical cost % in the next turn (e.g. "use 32%"). Lets the agent close the loop on GP for venues that don\'t use Square for purchasing. Skip when you already have a reliable COGS from pos_get_cogs_summary.',
    input_schema: {
      type: 'object',
      properties: {
        grossAmount: {
          type: 'number',
          description: 'Gross revenue in major units (e.g. 2714.53 for £2,714.53).',
        },
        costPercent: {
          type: 'number',
          description: 'Cost as percent of revenue (0-100, e.g. 32 for "products cost ~32%").',
        },
        currency: {
          type: 'string',
          description: 'ISO 4217 code (e.g. GBP, USD). Defaults to GBP if omitted.',
        },
      },
      required: ['grossAmount', 'costPercent'],
    },
  },

  // ─── Commerce / risk ────────────────────────────────────────────────────
  {
    name: POS_LIST_DISPUTES,
    description:
      'List card disputes / chargebacks at a venue. FIRES on "any chargebacks", "show me disputes", "what\'s being contested", "outstanding disputes". Returns id, state (e.g. INQUIRY_EVIDENCE_REQUIRED, CHARGEBACK_EVIDENCE_REQUIRED, WON, LOST), reason, amount, cardBrand, reportedAt, dueAt. Pass `states` to filter (e.g. only currently-actionable). For totals + counts use pos_get_dispute_summary.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        limit: { type: 'integer', description: 'Max disputes (1-200, default 50)' },
        states: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional list of Square DisputeState filters (e.g. ["INQUIRY_EVIDENCE_REQUIRED","CHARGEBACK_EVIDENCE_REQUIRED"]). Case-insensitive.',
        },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_DISPUTE_SUMMARY,
    description:
      'Aggregate dispute counts + outstanding amount + earliest evidence deadline at a venue. FIRES on "how many disputes do we have", "what\'s exposed to chargebacks", "anything urgent on disputes". Returns openCount, totalCount, openAmount, byState breakdown, nextDueAt (earliest deadline across open disputes — agent should flag if soon). Use to prioritise; use pos_list_disputes for per-row drill-down.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_CASH_DRAWER_SUMMARY,
    description:
      'Cash-drawer shift summary + cashier discrepancies at a venue. FIRES on "any cash discrepancies", "what was the drawer short this week", "cash drawer report", "till differences". Returns shifts[] (openedAt/closedAt/openingCash/expectedCash/closingCash/discrepancy/description) plus shiftCount and totalDiscrepancy across the window. Negative discrepancy = drawer short (cash missing); positive = drawer over. Window: rolling sinceHours OR fixed fromIso/toIso (cap 365 days).',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
        limit: { type: 'integer', description: 'Max shifts to return (1-200, default 50)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_LIST_GIFT_CARDS,
    description:
      'List gift cards on the seller account. FIRES on "what gift cards do we have", "show me active gift cards", "list gift cards". GANs (gift account numbers) are returned masked (last 4 only) — full numbers are never echoed into the agent context. For total outstanding balance use pos_get_gift_card_liability.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Max cards (1-200, default 50)' },
        state: {
          type: 'string',
          description: 'Optional state filter (ACTIVE, BLOCKED, DEACTIVATED, PENDING).',
        },
      },
      required: [],
    },
  },
  {
    name: POS_GET_GIFT_CARD_LIABILITY,
    description:
      'Total outstanding gift-card liability — sum of balances across all ACTIVE gift cards on the account. FIRES on "what\'s our gift card liability", "how much do we owe in gift cards", "gift card balance total". Returns activeCount + totalLiability. Useful for monthly accruals or knowing the cash exposure if every cardholder redeemed tomorrow.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: POS_LIST_INVOICES,
    description:
      'List invoices at a venue. FIRES on "what invoices are open", "show overdue invoices", "list recent invoices". Returns id, invoiceNumber, title, status (DRAFT/UNPAID/SCHEDULED/PARTIALLY_PAID/PAID/CANCELED/FAILED), amount, dueAt, recipientName. Pass `status` array to filter (e.g. ["UNPAID","PARTIALLY_PAID"]). For aggregate "what\'s outstanding" use pos_get_invoice_summary.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        limit: { type: 'integer', description: 'Max invoices (1-200, default 50)' },
        status: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional Square InvoiceStatus filters (e.g. ["UNPAID","PARTIALLY_PAID"]). Case-insensitive.',
        },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_INVOICE_SUMMARY,
    description:
      'Aggregate invoice exposure at a venue. FIRES on "what\'s outstanding on invoices", "how much money is in invoices", "any overdue invoices", "AR balance". Returns totalCount, openCount, overdueCount, outstandingAmount (sum of next-payment amounts across open invoices), nextDueAt (earliest dueDate among open). Use to flag cashflow risk; use pos_list_invoices for per-row drill-down.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_LIST_PAYOUTS,
    description:
      'List Square bank-account payouts at a venue. FIRES on "when did we last get paid out", "show recent payouts", "what\'s pending settlement", "Square deposit history". Returns id, status (SENT/PAID/FAILED), amount, arrivalDate, destinationType (BANK_ACCOUNT / CARD), createdAt. Window default 30 days. Pass `status: "FAILED"` to surface only problem payouts. NEVER returns bank account numbers.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
        status: { type: 'string', enum: ['SENT', 'PAID', 'FAILED'] },
        limit: { type: 'integer', description: 'Max payouts (1-100, default 25)' },
      },
      required: ['venueId'],
    },
  },

  // ─── Catalog organisation ───────────────────────────────────────────────
  {
    name: POS_LIST_VENDORS,
    description:
      'Supplier roster from Square Vendors. FIRES on "who are our suppliers", "list vendors", "supplier contact for X", "what suppliers are on Square". Returns id, name, status, primary contact (name/email/phone), accountNumber, note. Default status ACTIVE — pass status=INACTIVE to see archived suppliers. Useful before pos_get_item_costs (vendors set up = receive events recorded = COGS coverage).',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: 'Max vendors (1-200, default 100)' },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
      },
      required: [],
    },
  },
  {
    name: POS_GET_CATEGORY_SALES,
    description:
      'Sales bucketed by catalog category at a venue. FIRES on "sales by category", "how much did wine make this week", "category breakdown", "what % of sales are food vs drink". Returns top categories ranked by gross revenue with quantitySold, grossSales, orderCount. Items without a category roll into "Uncategorised". Window: rolling or fixed (cap 365 days). For per-item drill-down use pos_get_top_items.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
        limit: { type: 'integer', description: 'Top N (1-50, default 25)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_MODIFIER_POPULARITY,
    description:
      'Most-selected modifiers / add-ons at a venue inside a window. FIRES on "what modifiers sell", "top add-ons", "most popular extras", "do customers actually order the extra shot". Returns modifiers ranked by selection count with name, selections (qty), addedRevenue (sum of priceMoney). Window: rolling or fixed. Useful for menu engineering — surface low-value modifiers eating prep time.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
        limit: { type: 'integer', description: 'Top N (1-50, default 20)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_DISCOUNT_USAGE,
    description:
      'Most-applied discounts at a venue with revenue impact. FIRES on "what discounts are we giving", "comp report", "how much did we discount this week", "is staff using the friends-and-family discount too much". Returns discounts ranked by amountDiscounted (money given away) with applications count. Use to flag discount leakage; cross-reference with pos_list_team_members + shifts when investigating staff abuse.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        ...salesWindowProps,
        limit: { type: 'integer', description: 'Top N (1-50, default 20)' },
      },
      required: ['venueId'],
    },
  },

  // ─── CRM / loyalty / bookings / devices ─────────────────────────────────
  {
    name: POS_SEARCH_CUSTOMERS,
    description:
      'Search Square Customers by name (fuzzy), exact email, or exact phone. FIRES on "find customer X", "is John Smith in the system", "customer with email Y". Returns id, givenName, familyName, companyName, email, phone, createdAt. Pass ANY of query / email / phone (at least one is required). For aggregate stats use pos_get_customer_summary.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Fuzzy name search (matches given OR family name).',
        },
        email: { type: 'string', description: 'Exact email match.' },
        phone: { type: 'string', description: 'Exact phone match (E.164 format works best).' },
        limit: { type: 'integer', description: 'Max results (1-100, default 25)' },
      },
      required: [],
    },
  },
  {
    name: POS_GET_CUSTOMER_SUMMARY,
    description:
      'Aggregate CRM stats across all Square customers on the seller account. FIRES on "how big is our customer list", "how many customers do we have", "how many new customers this month". Returns totalCount, withEmail (marketable), withPhone (textable), createdLast30Days. Use to size the audience before suggesting a campaign.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: POS_GET_LOYALTY_SUMMARY,
    description:
      'Loyalty program status + enrolment + outstanding points liability. FIRES on "is loyalty turned on", "how many loyalty members", "what\'s our points liability", "loyalty stats". Returns programId, status (ACTIVE/INACTIVE/NO_PROGRAM), pointsName (program-defined), enrolledAccounts, totalPointsOutstanding. status: "NO_PROGRAM" when the seller has no loyalty configured.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: POS_LIST_BOOKINGS,
    description:
      'List Appointments / Bookings at a venue inside a window. FIRES on "what bookings do we have", "show today\'s appointments", "next week\'s diary". Returns id, status (PENDING/ACCEPTED/DECLINED/CANCELLED_*), startAt, durationMinutes, customerId. Default window: now → +7d. Pass sinceHours for retrospective ("yesterday\'s no-shows") and aheadHours to extend forward.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        sinceHours: {
          type: 'integer',
          description: 'Hours back from now to include past bookings (0-2160, default 0).',
        },
        aheadHours: {
          type: 'integer',
          description: 'Hours forward from now (1-2160, default 168 = 7 days).',
        },
        limit: { type: 'integer', description: 'Max bookings (1-200, default 50)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_GET_BOOKING_SUMMARY,
    description:
      'Aggregate upcoming bookings at a venue. FIRES on "how many bookings ahead", "what\'s the diary looking like", "any pending bookings". Returns upcomingCount, acceptedCount, pendingCount, cancelledCount, nextStartAt. Use for diary health check; use pos_list_bookings for per-row drill-down.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        aheadHours: {
          type: 'integer',
          description: 'Hours forward from now to summarise (1-2160, default 168 = 7 days).',
        },
      },
      required: ['venueId'],
    },
  },
  {
    name: POS_LIST_DEVICES,
    description:
      'List Square terminals / devices, optionally scoped to a venue. FIRES on "are all terminals online", "what devices are paired", "show me the tills", "any device offline". Returns id, name, status (the SDK\'s status enum), productType, deviceCode. Pass venueId to scope to that venue\'s mapped location; omit for the whole account.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: {
          type: 'string',
          description:
            "Optional venue UUID — scopes to that venue's mapped Square location. Omit for account-wide.",
        },
        limit: { type: 'integer', description: 'Max devices (1-200, default 50)' },
      },
      required: [],
    },
  },
]
