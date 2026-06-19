import { z } from 'zod'
import type { IntegrationToolDefinition } from '../integrations/integration-provider'

/// The four new agent functions exposed by the Proactive Brain. Same shape as
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
  [BRAIN_CHECK_DEVIATION]: z.object({
    venue: VenueSlug,
    layer: Layer.optional(),
    level: Level.optional(),
    observations: z
      .array(z.object({ date: IsoDate, value: z.number().finite() }))
      .max(120)
      .optional(),
  }),
  [BRAIN_FIND_SOP_GAPS]: z.object({}).strict(),
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
      'Check whether recent trading is OUTSIDE its calibrated band, and how severe. FIRES on "are we trading normally", "is tonight unusual", "did anything spike/drop". A deviation is an observation outside the band (the breach rule). Pass `observations` (date+value) to check specific days, or omit them to check the most recent stored actuals. Returns each breach with direction (above/below), an exceedance ratio, and severity (low/medium/high). This is the input to a proactive nudge.',
    input_schema: {
      type: 'object',
      properties: {
        venue: { type: 'string', enum: [...BRAIN_VENUES], description: 'Venue slug to check' },
        layer: { type: 'string', enum: ['L1', 'L2', 'L3'], description: 'Layer (default L1)' },
        level: { type: 'number', enum: [0.8, 0.9], description: 'Band confidence (default 0.9)' },
        observations: {
          type: 'array',
          description: 'Optional days to check; omit to use recent stored actuals',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'YYYY-MM-DD' },
              value: { type: 'number', description: 'Observed value (e.g. net revenue)' },
            },
            required: ['date', 'value'],
          },
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
