import { z } from 'zod'
import type { IntegrationToolDefinition } from '../integrations/integration-provider'

/// The six agent functions exposed by the Proactive Brain. Same shape as
/// SQUARE_TOOL_DEFINITIONS so they feed straight into buildAiSdkTools via the
/// IntegrationRegistry — no edits to chat-tools.ts or ai-sdk-tools.ts.
///
/// Tenant isolation: orgId comes from DispatchContext, never the model. The
/// `venue` slug is a model-supplied parameter (which venue to forecast),
/// mirroring how the Square tools accept venueId from <current_context>.

export const BRAIN_FORECAST_SALES = 'brain_forecast_sales'
export const BRAIN_CHECK_DEVIATION = 'brain_check_deviation'
export const BRAIN_FIND_SOP_GAPS = 'brain_find_sop_gaps'
export const BRAIN_CHECK_CHECKLIST = 'brain_check_checklist'
export const BRAIN_CHECK_STOCK_COVER = 'brain_check_stock_cover'
export const BRAIN_CHECK_CHANGE_POINT = 'brain_check_change_point'

/// Canonical brain venue slugs (Track A `config.VENUE_MAP`). A full wiring maps
/// these to the org's Venue rows; until then the agent names the venue directly.
export const BRAIN_VENUES = ['beer_hall', 'two_river_taps', 'ellel'] as const
const VenueSlug = z.enum(BRAIN_VENUES)
const Layer = z.enum(['L1', 'L2', 'L3'])
const Level = z.union([z.literal(0.8), z.literal(0.9)])
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

export const BRAIN_TOOL_SCHEMAS = {
  [BRAIN_FORECAST_SALES]: z
    .object({
      venue: VenueSlug,
      layer: Layer.optional(),
      key: z.string().min(1).max(120).optional(),
      level: Level.optional(),
      date_from: IsoDate.optional(),
      date_to: IsoDate.optional(),
    })
    // L2 (category) / L3 (item) forecasts need a key; fail fast rather than
    // letting an unkeyed L2/L3 query hit the brain and return mixed series.
    .refine((v) => v.layer === undefined || v.layer === 'L1' || !!v.key, {
      message: 'key (category for L2 / item for L3) is required when layer is L2 or L3',
      path: ['key'],
    }),
  [BRAIN_CHECK_DEVIATION]: z
    .object({
      venue: VenueSlug,
      layer: Layer.optional(),
      as_of: IsoDate.optional(),
    })
    .strict(),
  [BRAIN_FIND_SOP_GAPS]: z.object({}).strict(),
  [BRAIN_CHECK_STOCK_COVER]: z.object({ venue: VenueSlug }).strict(),
  [BRAIN_CHECK_CHANGE_POINT]: z.object({ venue: VenueSlug, layer: Layer.optional() }).strict(),
  [BRAIN_CHECK_CHECKLIST]: z.object({
    checklist: z.enum(['opening', 'closing']),
    completed: z.array(z.number().int().min(1).max(40)).max(40),
    dow: z.number().int().min(0).max(6),
    completion_minutes: z.number().int().min(0).max(1440).optional(),
  }),
} satisfies Record<string, z.ZodTypeAny>

export const BRAIN_TOOL_DEFINITIONS: ReadonlyArray<IntegrationToolDefinition> = [
  {
    name: BRAIN_FORECAST_SALES,
    description:
      'Expected sales as a CALIBRATED BAND (not a single number) for a venue over a date range. FIRES on "what should Friday look like", "what\'s the forecast for next week", "expected covers/revenue". Returns per-date point forecast plus a low/high band at the requested confidence (80% or 90%). layer L1 = venue daily revenue (default); L2 = a category\'s units (pass key, e.g. "Beer"); L3 = a single item\'s units (pass key, e.g. "Lager - BH"). Use L3 for ordering questions ("how many kegs of X"). Returns ok:false reason:\'no-data\' when the brain has no band for that venue/range yet.',
    input_schema: {
      type: 'object',
      properties: {
        venue: { type: 'string', enum: [...BRAIN_VENUES], description: 'Venue slug to forecast' },
        layer: {
          type: 'string',
          enum: ['L1', 'L2', 'L3'],
          description: 'L1 venue revenue (default), L2 category units, L3 item units',
        },
        key: {
          type: 'string',
          description: 'Category (L2) or item (L3) name — required for L2/L3',
        },
        level: { type: 'number', enum: [0.8, 0.9], description: 'Band confidence (default 0.9)' },
        date_from: { type: 'string', description: 'Start date YYYY-MM-DD (optional)' },
        date_to: { type: 'string', description: 'End date YYYY-MM-DD (optional)' },
      },
      required: ['venue'],
    },
  },
  {
    name: BRAIN_CHECK_DEVIATION,
    description:
      'Check whether ONE trading day is OUTSIDE its 90% calibrated band, and how severe — the per-day primitive (a single odd day, not a sustained shift; for "has normal changed" use brain_check_change_point). FIRES on "are we trading normally", "is tonight unusual", "did today spike/drop". Pass `as_of` (YYYY-MM-DD) to check a specific trading day, or omit it for the latest stored day. Returns status (normal/deviation), direction (up/down), severity (medium/high), the actual vs expected, the band (low/high), z (band-multiples), and a CORRELATIONAL reason ("coincides with …") when it deviates. A normal day is reported as within range. This is the input to a proactive nudge.',
    input_schema: {
      type: 'object',
      properties: {
        venue: { type: 'string', enum: [...BRAIN_VENUES], description: 'Venue slug to check' },
        layer: { type: 'string', enum: ['L1', 'L2', 'L3'], description: 'Layer (default L1)' },
        as_of: {
          type: 'string',
          description: 'Trading day to check (YYYY-MM-DD); omit for the latest stored day',
        },
      },
      required: ['venue'],
    },
  },
  {
    name: BRAIN_FIND_SOP_GAPS,
    description:
      'Surface the knowledge-base gaps the chat history reveals: topics where the assistant repeatedly could not answer. FIRES on "what are we missing", "what SOPs should we write", "where is the knowledge base weak". Returns the current failure rate plus ranked clusters (size, failure density, example questions) that fail ABOVE the baseline — each is a missing SOP to write. Estate-wide / owner-level signal; no parameters.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: BRAIN_CHECK_STOCK_COVER,
    description:
      'Inventory-aware REORDER signal: how many days of cover each keg/cask line has, given physical on-hand stock and forecast demand. FIRES on "what do we need to order", "which kegs are running low", "are we about to run out of X", "stock cover". Returns per-line days_of_cover = on-hand pints ÷ forecast pints/day, a reorder flag where cover is below lead+safety time, and a suggested order in kegs. Lines whose demand the brain cannot forecast are returned on-hand-only (days_of_cover null) rather than guessed. Beer Hall only — other venues have no stock sheets and return an empty list.',
    input_schema: {
      type: 'object',
      properties: {
        venue: {
          type: 'string',
          enum: [...BRAIN_VENUES],
          description: 'Venue slug (stock data is Beer Hall only)',
        },
      },
      required: ['venue'],
    },
  },
  {
    name: BRAIN_CHECK_CHANGE_POINT,
    description:
      'Detect SUSTAINED regime shifts in a venue\'s trading rhythm (not a single odd day — that\'s brain_check_deviation). FIRES on "has normal changed", "is trade persistently up/down", "did something shift and since when", "is the forecast stale". Returns dated change points: onset, direction, magnitude (band units + %), which detector fired (CUSUM drift / k-of-n persistence), severity, a recalibration-needed flag, and a ranked, CORRELATIONAL attribution ("coincides with a cold snap / term transition / closure", never "caused by"). Beer Hall + Two River Taps in scope; other venues return an empty, stable envelope.',
    input_schema: {
      type: 'object',
      properties: {
        venue: { type: 'string', enum: [...BRAIN_VENUES], description: 'Venue slug to check' },
        layer: { type: 'string', enum: ['L1', 'L2', 'L3'], description: 'Layer (default L1)' },
      },
      required: ['venue'],
    },
  },
  {
    name: BRAIN_CHECK_CHECKLIST,
    description:
      'Score a completed opening/closing checklist for discipline: missed MANDATORY steps (weighted by consequence — cash-up, gas-off, lock-up count far more than "refill straws"), skipped/unsigned checklist, or abnormally late completion. FIRES on "did they close properly", "was anything missed last night". Conditional steps ("if needed") never count as a miss; the Sunday-only chairs-up step is expected only on Sundays. Pass the completed step numbers, the checklist, and the day-of-week (Mon=0 … Sun=6).',
    input_schema: {
      type: 'object',
      properties: {
        checklist: { type: 'string', enum: ['opening', 'closing'], description: 'Which checklist' },
        completed: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Step numbers that were completed/ticked',
        },
        dow: { type: 'integer', description: 'Day of week, Mon=0 … Sun=6' },
        completion_minutes: {
          type: 'integer',
          description: 'Optional minutes taken to complete (flags late completion)',
        },
      },
      required: ['checklist', 'completed', 'dow'],
    },
  },
]
