import { z } from 'zod'

export const TOOL_NAMES = [
  'find_knowledge',
  'get_stock_below_par',
  'get_stock_by_name',
  'get_supplier_by_name',
  'get_upcoming_cutoffs',
  'save_knowledge_doc',
  'record_kb_gap',
  'verify_quote',
  'log_incident',
  'update_stock',
  'add_supplier_note',
] as const
export type ToolName = (typeof TOOL_NAMES)[number]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

export const TOOL_INPUT_SCHEMAS = {
  // find_knowledge: orgId is NEVER in this schema — it is injected by
  // ToolDispatcher from authenticated DispatchContext. Adding it here
  // would expose a cross-org scoping bypass (Claude could emit another
  // tenant's UUID). See Plan 02-01 audit M3.
  find_knowledge: z.object({
    query: z.string().min(1),
    venueId: UUID.optional(),
    limit: z.number().int().min(1).max(20).optional(),
    minSimilarity: z.number().min(0).max(1).optional(),
    /// Restrict to entity kinds. e.g. ['knowledge_item','checklist_step'] for
    /// procedural-only retrieval, ['venue_contact'] for "who do I call".
    entityTypes: z
      .array(
        z.enum([
          'knowledge_item',
          'checklist_step',
          'venue_contact',
          'mock_supplier',
          'venue_profile',
          'chat_message',
        ]),
      )
      .optional(),
    /// Tag overlap filter. Hits must share ≥1 tag with this list.
    tags: z.array(z.string().min(1).max(64)).max(10).optional(),
    /// Restrict to entities updated within last N days.
    recencyDays: z.number().int().min(1).max(3650).optional(),
    /// Restrict to entity-specific kinds (docType slug, contact role, etc.).
    kinds: z.array(z.string().min(1).max(64)).max(10).optional(),
    /// Surface pending knowledge gaps in results. Default false.
    includePending: z.boolean().optional(),
    /// Drop the venue filter; search the entire org. Default false. Useful for
    /// multi-venue groups when the home venue's KB is thin.
    crossVenue: z.boolean().optional(),
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
  record_kb_gap: z.object({
    /// The user's question, phrased the way staff would actually ask it.
    question: z.string().trim().min(5).max(500),
    /// A general/common-sense best-effort answer to give the user now while
    /// the GM hasn't authoritatively answered. Optional — empty when there
    /// genuinely isn't one (e.g. policy decisions only the GM can make).
    tentativeAnswer: z.string().trim().max(2000).optional(),
    /// venueId for venue-specific gaps; null = global question.
    venueId: UUID.nullable(),
  }),
  verify_quote: z.object({
    /// The draft reply you're about to send. Will be checked against sourceIds
    /// for fidelity (brand names, quantities, error codes, phone numbers).
    draft: z.string().trim().min(1).max(8000),
    /// IDs of knowledge_item hits you used. Pulled from find_knowledge
    /// hit.entityId where hit.entityType === 'knowledge_item'.
    sourceIds: z.array(UUID).min(1).max(10),
  }),
  log_incident: z.object({
    venueId: UUID,
    summary: z.string().trim().min(5).max(500),
    severity: z.enum(['minor', 'major', 'critical']).default('minor'),
    /// Optional structured details — peopleInvolved, time, location, escalatedTo, etc.
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  update_stock: z.object({
    venueId: UUID,
    /// Substring (case-insensitive) match against MockStock.name. The dispatcher
    /// will fail with reason 'no-data' if zero or multiple stock items match.
    name: z.string().trim().min(1).max(120),
    /// Either set to an exact value, OR pass delta to add/subtract.
    setQty: z.number().min(0).optional(),
    deltaQty: z.number().optional(),
    note: z.string().trim().max(280).optional(),
  }),
  add_supplier_note: z.object({
    /// Exact-or-substring match against MockSupplier.name; ambiguity returns no-data.
    supplierName: z.string().trim().min(1).max(120),
    /// Append to the existing supplier notes (don't replace).
    note: z.string().trim().min(3).max(500),
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
      'Hybrid retrieval (vector + BM25 lexical, fused via reciprocal-rank fusion) across knowledge items (SOPs, troubleshooting, Q&As), individual checklist steps, venue contacts, suppliers, and venue profiles. Use for any question whose answer lives in operational knowledge — procedures, troubleshooting, "who do I call", "what\'s step 3 of...", "where\'s the fire escape", etc. Hits include `entityType` so you know whether you got a doc, a checklist step, a contact, etc. Returns ok:false reason:no-data if nothing matches semantically OR lexically.',
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
          description:
            'Cosine floor (0-1, default 0.3). Hits below this are dropped UNLESS they matched lexically (BM25) — keyword matches always count.',
        },
        entityTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'knowledge_item',
              'checklist_step',
              'venue_contact',
              'mock_supplier',
              'venue_profile',
              'chat_message',
            ],
          },
          description:
            "Narrow the hunt. e.g. ['venue_contact'] for \"who do I call\", ['checklist_step'] for \"what's step 3 of closing\", ['knowledge_item'] for SOPs/Q&As only.",
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Tag overlap filter — hits must share ≥1 tag. e.g. ["closing"] or ["fire-safety"].',
        },
        recencyDays: {
          type: 'integer',
          description: 'Restrict to entities updated in last N days (e.g. 30 for "recent docs").',
        },
        kinds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Filter by entity-specific kind: docType for knowledge_item, role for venue_contact, etc.',
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
    name: 'record_kb_gap',
    description:
      "Capture a question that the knowledge base couldn't answer so the GM can authoritatively answer it later from their dashboard. Call this whenever find_knowledge returns no-data on an OPERATIONAL question (where things go, how routine tasks work, who handles X) — NOT for policy/safety/numerical questions where guessing is dangerous. The captured row appears in the GM's pending-answers queue. Dedupes against prior gaps via semantic similarity — if a near-identical question is already pending, this just bumps its ask-count. Returns { id, askCount, dedupedFromExisting }. Pair this with a lenient unverified answer to the user (your tentativeAnswer) plus a note that you've flagged it for the GM.",
    input_schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The user question, phrased as a staff member would actually ask',
        },
        tentativeAnswer: {
          type: 'string',
          description:
            'Your best-effort general/industry answer for the user now (will be shown to the GM as context); empty string if you have nothing reasonable to say',
        },
        venueId: {
          type: ['string', 'null'],
          description: 'Venue UUID if venue-specific, or null for global',
        },
      },
      required: ['question', 'venueId'],
    },
  },
  {
    name: 'log_incident',
    description:
      "Capture an incident (injury, fire, safety, theft, suspected fraud) into the venue's incident log. Use this in incident-mode conversations after gathering the basic facts. Pass severity ('minor', 'major', 'critical') based on the user's description — bias toward higher severity if anyone was hurt or property was damaged. Returns the incident id; the GM dashboard surfaces open incidents for triage. After logging, tell the user the incident has been recorded and remind them to file the formal report with their duty manager.",
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID' },
        summary: { type: 'string', description: 'One-sentence summary of what happened' },
        severity: { type: 'string', enum: ['minor', 'major', 'critical'] },
        details: {
          type: 'object',
          description:
            "Optional structured fields: peopleInvolved, time, location, escalatedTo, etc.",
        },
      },
      required: ['venueId', 'summary'],
    },
  },
  {
    name: 'update_stock',
    description:
      "Adjust a stock item's current quantity at a venue. Use when staff says 'we just ran out of X' or 'we used 3 of those'. Provide either setQty (exact new value) OR deltaQty (positive = added, negative = consumed). Returns the updated row. Returns no-data if the name match is zero or ambiguous. Permissioned to all roles (staff can report on-shift consumption).",
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID' },
        name: { type: 'string', description: 'Substring match against MockStock.name' },
        setQty: { type: 'number', description: 'Exact new currentQty (>= 0)' },
        deltaQty: {
          type: 'number',
          description: 'Add this much to currentQty; negative consumes',
        },
        note: { type: 'string', description: 'Optional note (audit log)' },
      },
      required: ['venueId', 'name'],
    },
  },
  {
    name: 'add_supplier_note',
    description:
      "Append a note to a supplier's notes field. Use when a manager says 'log this for next time' about a supplier (e.g. 'Coolsure said no Tuesdays', 'Matthew Clark are now charging delivery on under-£200 orders'). Manager/owner only. Returns the updated supplier.",
    input_schema: {
      type: 'object',
      properties: {
        supplierName: { type: 'string', description: 'Substring match against MockSupplier.name' },
        note: { type: 'string', description: 'Note to append' },
      },
      required: ['supplierName', 'note'],
    },
  },
  {
    name: 'verify_quote',
    description:
      "Self-critique pass — call AFTER you've drafted your reply but BEFORE sending it, when your reply quotes specifics from a knowledge_item (brand names, quantities, error codes, phone numbers, supplier names, step counts). Pass your draft text + the entityIds of the knowledge_item hits you cited. The server runs a fidelity check via Claude Haiku and returns { ok: true } if the draft is faithful, or { ok: false, issues: [{ claim, problem, expected }] } if you've drifted from the source. On issues, REVISE your draft (correct the specific claims) and emit the corrected reply. Skip for: ops-tool answers (stock/supplier/cutoff), tentative answers from record_kb_gap, vague-and-general replies. Use for: anything where getting a specific value wrong would be embarrassing or dangerous.",
    input_schema: {
      type: 'object',
      properties: {
        draft: { type: 'string', description: 'Your draft reply text in full' },
        sourceIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'entityIds from find_knowledge knowledge_item hits used in the draft',
        },
      },
      required: ['draft', 'sourceIds'],
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
