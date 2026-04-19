import { z } from 'zod'

export const TOOL_NAMES = [
  'find_knowledge',
  'get_stock_below_par',
  'get_stock_by_name',
  'get_supplier_by_name',
  'get_upcoming_cutoffs',
  'save_knowledge_doc',
] as const
export type ToolName = (typeof TOOL_NAMES)[number]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

export const TOOL_INPUT_SCHEMAS = {
  find_knowledge: z.object({
    query: z.string().min(1),
    venueId: UUID.optional(),
    limit: z.number().int().min(1).max(20).optional(),
    minSimilarity: z.number().min(0).max(1).optional(),
  }),
  get_stock_below_par: z.object({ venueId: UUID }),
  get_stock_by_name: z.object({ venueId: UUID, name: z.string().min(1) }),
  get_supplier_by_name: z.object({ name: z.string().min(1) }),
  get_upcoming_cutoffs: z.object({
    venueId: UUID,
    withinHours: z.number().int().min(1).max(720).optional(),
  }),
  save_knowledge_doc: z.object({
    title: z.string().trim().min(3).max(200),
    content: z.string().trim().min(20).max(50_000),
    venueId: UUID.nullable(),
  }),
} as const satisfies Record<ToolName, z.ZodTypeAny>

export type ToolInput<T extends ToolName> = z.infer<(typeof TOOL_INPUT_SCHEMAS)[T]>

export const TOOL_DEFINITIONS: ReadonlyArray<{
  name: ToolName
  description: string
  input_schema: Record<string, unknown>
}> = [
  {
    name: 'find_knowledge',
    description:
      'Semantic search over ingested knowledge items (SOPs, procedures, troubleshooting guides, menu notes, best-practice docs). Use for any question whose answer lives in a document — equipment troubleshooting, operational procedures, menu pairings, policies. Returns hits ranked by cosine similarity with content and metadata. Returns ok:false reason:no-data if no document crosses the relevance threshold — DO NOT invent an answer in that case, tell the user.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language query — user intent, not keywords' },
        venueId: {
          type: 'string',
          description: 'Optional venue UUID to scope results; omit for cross-venue (shared SOPs)',
        },
        limit: { type: 'integer', description: 'Max hits to return (1-20, default 5)' },
        minSimilarity: {
          type: 'number',
          description: 'Similarity floor (0-1, default 0.3). Below this returns no-data.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_stock_below_par',
    description:
      'List all stock items at a venue whose currentQty is below their parLevel, sorted by most-depleted first. Returns product name, current/par levels, reorder qty, supplier, category. Returns ok:false reason:no-data if everything is above par.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID' },
      },
      required: ['venueId'],
    },
  },
  {
    name: 'get_stock_by_name',
    description:
      'Find stock items at a venue whose name matches (ILIKE contains) the search term. Returns up to 5 rows. Returns ok:false reason:no-data if no match. Use when the user asks about a specific product.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID' },
        name: {
          type: 'string',
          description: 'Partial or full product name (e.g. "lager", "Carlsberg", "gin")',
        },
      },
      required: ['venueId', 'name'],
    },
  },
  {
    name: 'get_supplier_by_name',
    description:
      "Find suppliers by name (ILIKE contains), across all venues (suppliers are shared). Returns contact details + lead time. Use when the user asks \"who supplies X\" or \"what's Matthew Clark's number\".",
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Partial or full supplier name (e.g. "Matthew", "Carlsberg", "Brakes")',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_upcoming_cutoffs',
    description:
      'List suppliers serving a venue whose estimated delivery window (leadTimeDays * 24h) falls within a given hour threshold. Returns supplierNotes (the real ordering-cutoff text like "Order by 5pm for next-day delivery"). Use when the user asks about ordering deadlines or time-critical orders.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID' },
        withinHours: { type: 'integer', description: 'Hour threshold (default 48)' },
      },
      required: ['venueId'],
    },
  },
  {
    name: 'save_knowledge_doc',
    description:
      "Save a new SOP / procedure / Q&A / troubleshooting note to the organisation's knowledge base so the chat can retrieve it later. CAPTURE FLOW: when the user wants to add knowledge (SOP, procedure, Q&A, note), DO NOT call this tool immediately. First ask follow-up questions across multiple turns until you have: (1) a concise TITLE (<200 chars, descriptive); (2) the CONTENT — full procedure, answer, or instructions (at least 20 chars, rewrite into a clear authoritative paragraph or numbered steps before saving); (3) whether it's VENUE-SPECIFIC (pass that venueId) or GLOBAL (pass venueId: null). Only call save_knowledge_doc once all three are clear. On success the server returns { id, summary, tags }; confirm to the user with the summary. On { ok: false, reason: 'forbidden' } tell the user only managers/owners can save docs. On { ok: false, reason: 'error' } describe the failure verbatim.",
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Concise title (3-200 chars), descriptive of the doc',
        },
        content: {
          type: 'string',
          description:
            'Full content (20-50000 chars). For Q&A format as "Q: ...\\nA: ...". For SOPs use numbered steps. For troubleshooting use "Problem / Cause / Fix".',
        },
        venueId: {
          type: ['string', 'null'],
          description: 'Venue UUID if venue-specific, or null for global (all venues)',
        },
      },
      required: ['title', 'content', 'venueId'],
    },
  },
]
