import { z } from 'zod'
import { ReportSpecSchema } from './reports'

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
  // Plan 05-01 — structured-data path over CSV/XLSX docs (aggregate / enumeration).
  'query_document_table',
  // Plan 06-04 hot-fix 2026-05-02 — fallback escalation tool. Wraps the chat-core
  // multi-agent pipeline (Triage → Researchers → Analyser → Writer → Critic)
  // for genuinely-deep multi-source synthesis. Should fire RARELY — only when
  // find_knowledge + direct entity tools have all returned thin / no-data and
  // the question genuinely needs cross-source reasoning.
  'deep_research',
  // "Note for <person>" — creates an in-app notification for an org member.
  // Resolve by name fragment OR explicit recipientUserId (after disambiguation).
  'leave_note_for_user',
  // Wave 1 — Tasks & Reminders. Durable action items with optional due date.
  // create_task creates one (default assignee = author); complete_task marks
  // an existing task done; list_my_tasks summarises the user's open inbox.
  'create_task',
  'complete_task',
  'list_my_tasks',
  // Generative-UI surface — renders the matched checklist as an interactive
  // tickable walkthrough on the client. Use AFTER the user asks for a procedure
  // ("what's the opening checklist", "walk me through closing") instead of
  // pasting the steps into the reply as markdown.
  'present_checklist',
  // Phase B reports — packages a multi-tool answer into a persisted, sharable
  // report (KPI cards, bar charts, tables, text). The frontend renders the
  // report inline in the chat AND exposes /reports/:id for permalink access.
  'generate_report',
  // Phase C scheduled reports — recurring report definitions. A BullMQ tick
  // fires each row at its local-time slot and writes a Report + Notification.
  'schedule_report',
  'list_scheduled_reports',
  'pause_scheduled_report',
  'resume_scheduled_report',
  'cancel_scheduled_report',
  // Spec metric G — audit trail of AI-surfaced pricing recommendations. The
  // agent captures a recommendation when it spots a pricing opportunity in
  // chat (e.g. after pos_get_cogs_summary surfaces a thin-margin item). The
  // owner adopts/dismisses from the dashboard; a downstream loop measures uplift.
  'record_pricing_recommendation',
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
  // Plan 05-01 — structured-data DSL over a single CSV/XLSX doc. Mirror of
  // TabularQueryInputSchema (kept inline to avoid coupling chat-tools.ts to
  // tabular.ts; both must stay in sync — the dispatcher re-validates against
  // TabularQueryInputSchema before executing).
  query_document_table: z.object({
    docId: UUID.optional(),
    filters: z
      .array(
        z.object({
          column: z.string().min(1),
          op: z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'contains']),
          value: z.union([z.string(), z.number()]),
        }),
      )
      .optional(),
    groupBy: z.string().min(1).optional(),
    aggregate: z
      .object({
        column: z.string().min(1).optional(),
        fn: z.enum(['count', 'sum', 'avg', 'min', 'max']),
      })
      .optional(),
    sort: z
      .object({
        column: z.string().min(1),
        direction: z.enum(['asc', 'desc']),
      })
      .optional(),
    limit: z.number().int().min(1).max(1000).optional(),
  }),
  // Plan 06-04 hot-fix 2026-05-02 — deep_research escalation. Required:
  // venueId so the chat-core pipeline can scope its researchers; question carries
  // the full context the agent wants synthesised.
  deep_research: z.object({
    venueId: UUID,
    question: z.string().min(8).max(2000),
  }),
  leave_note_for_user: z
    .object({
      /// Name fragment ("Ryan") or email substring to look up an org member.
      /// Matched ILIKE against User.name AND User.email. Mutually exclusive
      /// with recipientUserId. Min 2 chars to avoid surfacing every member.
      recipientNameQuery: z.string().trim().min(2).max(120).optional(),
      /// Exact recipient User.id — pass this on the SECOND call after the user
      /// disambiguates a multi-match result. Mutually exclusive with name query.
      /// Length-bounded only: better-auth User.ids are not strict UUIDs.
      recipientUserId: z.string().min(1).max(64).optional(),
      /// The note body, captured verbatim from the user's request. Will be the
      /// text the recipient sees in their inbox. 3-2000 chars.
      body: z.string().trim().min(3).max(2000),
    })
    .refine(
      (v) =>
        (v.recipientNameQuery && !v.recipientUserId) ||
        (!v.recipientNameQuery && v.recipientUserId),
      {
        message: 'exactly one of recipientNameQuery or recipientUserId must be provided',
      },
    ),
  create_task: z
    .object({
      /// The task body — what needs to be done. Captured verbatim from the
      /// user's request after stripping the "remind me to / follow up on /
      /// before Friday" preamble. 3-2000 chars.
      body: z.string().trim().min(3).max(2000),
      /// ISO 8601 datetime in UTC. Compute from the user's phrasing using
      /// <current_context>.now — e.g. "before Friday" with a Tuesday context →
      /// Friday 17:00 in the venue's timezone, expressed as UTC. Omit if the
      /// user gave no deadline ("follow up with the brewery" with no date).
      dueAt: z.string().datetime().optional(),
      /// Defaults to the current user. Pass either assigneeNameQuery (name or
      /// email fragment ≥2 chars) OR assigneeUserId (the canonical id after
      /// a needs-disambiguation result). Omit BOTH for a self-task.
      assigneeNameQuery: z.string().trim().min(2).max(120).optional(),
      assigneeUserId: z.string().min(1).max(64).optional(),
      /// Free-form tag — `follow_up`, `compliance`, `briefing`, `ops`, etc.
      /// Optional; defaults to null.
      category: z.string().trim().min(1).max(64).optional(),
    })
    .refine((v) => !(v.assigneeNameQuery && v.assigneeUserId), {
      message: 'pass at most one of assigneeNameQuery or assigneeUserId',
    }),
  complete_task: z.object({
    taskId: UUID,
  }),
  list_my_tasks: z.object({
    /// Default 'open' for the inbox surface; 'overdue' filters to tasks past
    /// dueAt; 'this_week' returns open tasks due in the next 7 days
    /// (including overdue); 'all' includes done + cancelled.
    scope: z.enum(['open', 'overdue', 'this_week', 'all']).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  present_checklist: z
    .object({
      /// Direct id (preferred when you already have it from a find_knowledge
      /// hit's metadata.checklistId).
      checklistId: UUID.optional(),
      /// Free-text intent — the dispatcher matches it against checklist titles
      /// in the org. Use when you don't have the id yet ("opening checklist",
      /// "closing procedure", "cellar checks").
      intent: z.string().trim().min(2).max(120).optional(),
    })
    .refine((v) => Boolean(v.checklistId) || Boolean(v.intent), {
      message: 'pass one of checklistId or intent',
    }),
  generate_report: z.object({
    /// Optional venue scope. Pass when the report is venue-specific (most
    /// will be). Omit for org-wide / multi-venue roll-ups.
    venueId: UUID.nullable().optional(),
    title: z.string().trim().min(3).max(200),
    /// One-line summary surfaced under the title. Optional but recommended —
    /// makes /reports list scannable.
    summary: z.string().trim().max(500).optional(),
    /// The full ReportSpec. Build it from the data you've already fetched
    /// via prior tool calls (pos_get_sales_summary, pos_get_top_items, etc.)
    /// — never make up numbers. See the spec schema for the section types.
    spec: ReportSpecSchema,
  }),
  schedule_report: z
    .object({
      /// Optional venue scope. Same semantics as generate_report.venueId.
      venueId: UUID.nullable().optional(),
      /// Human-readable name shown in the manage UI + the produced report title.
      title: z.string().trim().min(3).max(200),
      /// One-liner shown under the title.
      summary: z.string().trim().max(500).optional(),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      /// Hour of day in `timezone`, 0-23. Defaults to 9.
      hourOfDay: z.number().int().min(0).max(23).optional(),
      /// Required for weekly. 1=Mon..7=Sun.
      dayOfWeek: z.number().int().min(1).max(7).nullable().optional(),
      /// Required for monthly. 1-28 (capped so February is always safe).
      dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
      /// IANA timezone, e.g. "Europe/London". Defaults to UTC.
      timezone: z.string().trim().min(1).max(64).optional(),
      /// Natural-language hint describing what the recurring report should
      /// cover — e.g. "weekly sales recap with top items and labour".
      prompt: z.string().trim().max(1000).optional(),
    })
    .refine((v) => v.frequency !== 'weekly' || typeof v.dayOfWeek === 'number', {
      message: 'weekly schedule requires dayOfWeek (1=Mon..7=Sun)',
      path: ['dayOfWeek'],
    })
    .refine((v) => v.frequency !== 'monthly' || typeof v.dayOfMonth === 'number', {
      message: 'monthly schedule requires dayOfMonth (1-28)',
      path: ['dayOfMonth'],
    }),
  list_scheduled_reports: z.object({
    /// 'active' (default), 'paused', 'cancelled', or 'all'.
    status: z.enum(['active', 'paused', 'cancelled', 'all']).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  pause_scheduled_report: z.object({ scheduleId: UUID }),
  resume_scheduled_report: z.object({ scheduleId: UUID }),
  cancel_scheduled_report: z.object({ scheduleId: UUID }),
  record_pricing_recommendation: z.object({
    venueId: UUID,
    /// Free-form ref to the priced thing — Square catalog variation id, MockStock id,
    /// or a SKU string. 1-200 chars.
    sourceItemRef: z.string().trim().min(1).max(200),
    /// Human-readable label for the priced item ("Camden Hells pint",
    /// "House red 175ml"). Surfaced verbatim in the owner's review queue.
    sourceItemLabel: z.string().trim().min(1).max(200),
    /// Today's price in pennies (e.g. 575 = £5.75). Non-negative.
    currentPriceCents: z.number().int().min(0).max(10_000_000),
    /// Proposed new price in pennies. May be higher OR lower than current —
    /// recommendation = both upward repricing and discount-rollback suggestions.
    recommendedPriceCents: z.number().int().min(0).max(10_000_000),
    /// Why you're suggesting this — anchor in numbers ("Margin only 18%
    /// vs 65% target"). 3-2000 chars.
    rationale: z.string().trim().min(3).max(2000),
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
      'Hybrid retrieval (vector + BM25 lexical, fused via reciprocal-rank fusion) across knowledge items (SOPs, troubleshooting, Q&As), individual checklist steps, venue contacts, suppliers, and venue profiles. Use for any question whose answer lives in operational knowledge — procedures, troubleshooting, "who do I call", "what\'s step 3 of...", "where\'s the fire escape", etc. Hits include `entityType` so you know whether you got a doc, a checklist step, a contact, etc. Returns ok:false reason:no-data if nothing matches semantically OR lexically. SOURCE PRIORITY: do NOT use this for LIVE NUMBERS or live state — sales totals, current stock counts, recent orders, payment / tender mix, refund rate, labor cost, who\'s on shift, today\'s takings, best-sellers. Those have dedicated pos_* tools (Square today, more integrations later) and are AUTHORITATIVE — the integration returns live values; the KB at best has an uploaded snapshot. Even if the user has uploaded a sheet covering those numbers, prefer the pos_* tool unless the CURRENT user message explicitly names the uploaded file. DO still use find_knowledge for POLICY / PROCEDURE questions whose topic overlaps a pos_* domain ("what\'s our refund POLICY", "tip-out RULES", "how do we HANDLE a declined card") — those live in the KB, not in Square.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural-language query — user intent, not keywords',
        },
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
      'Find suppliers by name (ILIKE contains), across all venues (suppliers are shared). Returns contact details + lead time. Use when the user asks "who supplies X" or "what\'s Matthew Clark\'s number".',
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
      "Capture a question that the knowledge base couldn't answer so the GM can authoritatively answer it later from their dashboard. PRECONDITION (enforced by the dispatcher — calls without it are REJECTED): you MUST have called find_knowledge in the current turn AND the most recent find_knowledge call must have returned { ok: false, reason: 'no-data' }. Never speculate a gap; never call this in place of search. If find_knowledge returned hits, answer from those instead — the KB has the answer. After a confirmed no-data, only use this for OPERATIONAL or POLICY questions (where things go, how routine tasks work, what's our policy on X) — pair with a lenient unverified answer for operational questions, an empty tentativeAnswer for strict/policy questions. The captured row appears in the GM's pending-answers queue. Dedupes against prior gaps via semantic similarity — if a near-identical question is already pending, this bumps its ask-count. Returns { id, askCount, dedupedFromExisting }.",
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
            'Optional structured fields: peopleInvolved, time, location, escalatedTo, etc.',
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
  {
    name: 'query_document_table',
    description:
      "Run a deterministic computation over a tabular knowledge document (CSV / XLSX). Use ONLY for whole-table question shapes: (1) AGGREGATE / RANKING — totals, top-N, counts, averages, min/max ('top 3 selling wines', 'total revenue this month', 'highest priced item'); pass the appropriate `aggregate` / `groupBy` / `filters` / `sort`. (2) ENUMERATION — listing or walking through all rows ('list all opening steps', 'what do we need to follow to open?', 'walk me through the closing checklist'); pass NO aggregate, NO groupBy, with `sort: { column: '_row_index', direction: 'asc' }` to get rows back in source order. PREFER passing `docId` from a find_knowledge hit or prior tool call. If you don't know which doc holds the data, OMIT `docId` — the dispatcher will search every tabular doc in the org and return the first one that produces matches. Magic sort columns: `_aggregate` (sort by aggregate result — only valid when an aggregate is present) and `_row_index` (sort by source-row position). Returns { rows, rowCount, truncated } where truncated:true means the result hit the LIMIT (default 100, max 1000) — communicate that to the user. For LOOKUP-shaped questions targeting a single fact ('when do we open the cask vents?'), use find_knowledge instead, not this tool. Aggregate fns sum/avg/min/max require a numeric column; otherwise the tool returns ok:false reason='invalid-input'. Cross-org doc id returns ok:false reason='not-found'.",
    input_schema: {
      type: 'object',
      properties: {
        docId: {
          type: 'string',
          description:
            'UUID of the tabular knowledge_item to query. Omit when you do not know which doc holds the data — the dispatcher will iterate every tabular doc in the org and return the first match.',
        },
        filters: {
          type: 'array',
          description: 'AND-chained filters; each { column, op, value }',
          items: {
            type: 'object',
            properties: {
              column: { type: 'string' },
              op: { type: 'string', enum: ['eq', 'gt', 'lt', 'gte', 'lte', 'contains'] },
              value: { type: ['string', 'number'] },
            },
            required: ['column', 'op', 'value'],
          },
        },
        groupBy: { type: 'string', description: 'Column to GROUP BY (with aggregate)' },
        aggregate: {
          type: 'object',
          description: 'Aggregate fn over a column (column omitted when fn=count)',
          properties: {
            column: { type: 'string' },
            fn: { type: 'string', enum: ['count', 'sum', 'avg', 'min', 'max'] },
          },
          required: ['fn'],
        },
        sort: {
          type: 'object',
          description: 'Result ordering. column may be a real column, _aggregate, or _row_index',
          properties: {
            column: { type: 'string' },
            direction: { type: 'string', enum: ['asc', 'desc'] },
          },
          required: ['column', 'direction'],
        },
        limit: {
          type: 'integer',
          description: 'Max rows to return (default 100, max 1000)',
        },
      },
      required: [],
    },
  },
  {
    name: 'deep_research',
    description:
      'Escalate to the multi-agent research pipeline (slow — 15-30s — use sparingly). Triages the question, dispatches up to 3 specialist researchers in parallel, runs an analyser pass to reconcile findings, and returns a fully synthesised answer. Use ONLY when (a) `find_knowledge` and the direct entity tools have all returned no useful data, AND (b) the question genuinely needs cross-source synthesis (multi-doc reasoning, incident triage with multiple data feeds, "compare X across Y"). Returns the synthesised answer as a string — quote it back to the user verbatim or summarise. Do NOT use for plain lookups.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID to scope the research' },
        question: {
          type: 'string',
          description:
            'The full question to research, ideally restated in your own words with any disambiguating context the user provided. 8-2000 chars.',
        },
      },
      required: ['venueId', 'question'],
    },
  },
  {
    name: 'create_task',
    description:
      'Create a durable task / reminder for an org member. FIRES on "remind me to…", "remind <name> to…", "follow up with…", "before Friday…", "next week…", "by the end of the day…", "make sure to…" — anything that captures a future action with or without a deadline. Defaults assignee to the CURRENT USER when the phrasing is reflexive ("remind me", "I need to") or omits a recipient. For a NAMED recipient, pass `assigneeNameQuery` with the name or email fragment OR `assigneeUserId` directly when the user\'s message contains an @[Name](userId) mention chip — use the userId verbatim and skip the name lookup entirely. ROLE GATE: only managers and owners can assign tasks to OTHER users. If <current_context>.userRole is "staff" and the user asks to assign someone else, DON\'T call the tool — refuse politely with "Only managers and owners can set tasks for other people — I can add this to your own list instead, or you can ask your manager to assign it." Self-tasks for staff are fine. ALWAYS returns ok:true with `data.status`: (a) `status:"created"` with `{ id, body, dueAt, assigneeName }` — saved, confirm in one line with the assignee name + a short echo + the parsed due date; (b) `status:"needs-disambiguation"` with `candidates: [{userId,name,role}]` — multiple matches on assigneeNameQuery, ASK the user which one (numbered by name + role), then re-call with `assigneeUserId` + the same body/dueAt; (c) `status:"no-match"` — apologise and ask the user to clarify. ok:false with reason:"invalid-input" and message "staff can only set tasks for themselves…" means the server enforced the role gate — relay the error to the user. dueAt MUST be ISO 8601 in UTC; compute it from <current_context>.now (the user\'s today + their timezone) — e.g. on a Tuesday at 14:00 GMT, "before Friday" → Friday 17:00 local = the UTC equivalent. Skip dueAt for open-ended tasks ("follow up with the brewery"). Do NOT call leave_note_for_user for tasks — tasks have a status and due date; notes do not. Do NOT call record_kb_gap for tasks. After a successful save, confirm with one line: e.g. "Got it — I\'ll remind you Thursday evening to call the brewery."',
    input_schema: {
      type: 'object',
      properties: {
        body: {
          type: 'string',
          description:
            'The task content (3-2000 chars). Strip the routing preamble ("remind me to", "follow up on"). Keep specifics: who, what, why.',
        },
        dueAt: {
          type: 'string',
          description:
            'ISO 8601 UTC datetime. Compute from <current_context>.now + timezone. Omit if no deadline was given.',
        },
        assigneeNameQuery: {
          type: 'string',
          description:
            'Name or email fragment of an org member (≥2 chars). Omit for a SELF task ("remind me to…"). Use this for "remind <name> to…".',
        },
        assigneeUserId: {
          type: 'string',
          description: 'Canonical org member id — pass on the disambiguation follow-up call.',
        },
        category: {
          type: 'string',
          description: 'Free-form tag: follow_up, compliance, briefing, ops, etc. Optional.',
        },
      },
      required: ['body'],
    },
  },
  {
    name: 'complete_task',
    description:
      'Mark a task done. FIRES when the user says "done with…", "finished the…", "ticked off the brewery", "task <id> is complete", or otherwise references a specific task they want to close. Requires the task UUID — get it from list_my_tasks (or the surfaced id in your own prior turn). Returns { ok: true, data: { id, status: \'done\', completedAt } } on success, ok:false reason:\'not-found\' if the id doesn\'t exist in this org, ok:false reason:\'invalid-input\' if the caller isn\'t the assignee or creator. NEVER guess a taskId — list first.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'UUID of the task to mark done.' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'list_my_tasks',
    description:
      'List the current user\'s tasks. FIRES on "what\'s on my list?", "what tasks do I have?", "what\'s due this week?", "anything overdue?". `scope` defaults to "open" (everything not done/cancelled); use "overdue" for past-due-only; "this_week" for the next 7 days INCLUDING overdue; "all" for the full history including done + cancelled. Returns { ok: true, data: { tasks: [{ id, body, dueAt, status, category, assigneeName, creatorName, createdAt }], openCount, overdueCount, scope } }. Each task carries `assigneeName` and `creatorName` — when `creatorName` is non-null and the user appears as the creator of a task whose `assigneeName` is someone else, group those separately as "tasks you set for X". Otherwise summarise tightly by due window (overdue / due-soon / no-date). Include each task\'s id parenthetically only if the user is likely to act on it next ("the brewery call (task xyz…) is overdue") — otherwise omit ids to keep the reply tight.',
    input_schema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['open', 'overdue', 'this_week', 'all'],
          description: 'Filter window. Defaults to "open".',
        },
        limit: { type: 'integer', description: 'Max rows (1-50, default 25).' },
      },
      required: [],
    },
  },
  {
    name: 'present_checklist',
    description:
      'Surface an INTERACTIVE checklist UI on the user\'s screen — the steps render as a tickable walkthrough they can complete one by one, not a wall of markdown. FIRES when the user wants a procedure walked through: "what\'s the opening checklist", "walk me through closing", "the cellar checks", "how do I open up", "what do I need to do at the end of the night". Call AFTER (or in parallel with) find_knowledge so the user gets both the citation and the live tickable list. If you already have a checklistId from a find_knowledge hit\'s metadata.checklistId, pass it directly. Otherwise pass a short `intent` string (the user\'s phrasing minus the question words — "opening", "closing procedure", "cellar prep") and the dispatcher resolves it. Returns { ok: true, data: { checklistId, title, steps: [{ index, content }], stepCount } } on success — the frontend renders the live walkthrough. On ok:false reason:"no-data" tell the user that procedure isn\'t recorded yet and offer to capture it (save_knowledge_doc flow). DO NOT call this tool for ad-hoc lists ("things I need to do today" — that\'s list_my_tasks). DO NOT also paste the steps in your reply — once the card renders, your reply should be a brief one-liner like "Here\'s the opening run — tick each step as you go."',
    input_schema: {
      type: 'object',
      properties: {
        checklistId: {
          type: 'string',
          description:
            "UUID of the Checklist row. Pull from a find_knowledge hit's metadata.checklistId when available.",
        },
        intent: {
          type: 'string',
          description:
            'Short phrase describing what kind of checklist the user wants ("opening", "closing", "cellar prep"). The dispatcher matches it against checklist titles.',
        },
      },
      required: [],
    },
  },
  {
    name: 'generate_report',
    description:
      'Package the answer to a multi-part question into a sharable, persisted REPORT — KPI cards, bar charts, tables, and short text — instead of (just) writing it out as prose. FIRES when the user asks for a "report", "summary", "breakdown", "weekly numbers", "monthly recap", "show me X with charts", or anything where the natural reply has 3+ data points the user will want to keep / share. Build the spec from numbers you have ALREADY fetched via prior tool calls (pos_get_sales_summary, pos_get_top_items, pos_get_payment_breakdown, pos_compare_periods, pos_get_labor_summary, etc.) — never invent values. Section kinds: `text` (markdown body), `kpi` (single big number with optional trend), `kpiGroup` (row of up to 6 kpis), `bar` (horizontal bar chart up to 50 rows, with neutral/positive/warning/negative tones), `table` (up to 8 columns × 100 rows), `divider`. After the tool succeeds the chat surfaces the report inline as a card AND a /reports/<id> permalink — your reply should be a single sentence (e.g. "Here\'s the weekly recap — full breakdown above."). DO NOT also paste the numbers in your reply. ok:false reason:"invalid-input" with detail "venue-not-in-org" means a wrong venueId — strip and retry without venueId.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: {
          type: ['string', 'null'],
          description: 'Venue UUID for venue-scoped reports; null for org-wide.',
        },
        title: { type: 'string', description: '3-200 chars. e.g. "Weekly numbers — w/c 12 May".' },
        summary: {
          type: 'string',
          description: 'Optional ≤500-char one-liner shown under the title.',
        },
        spec: {
          type: 'object',
          description:
            'ReportSpec. Required: { sections: Section[] }. Section kinds: text { body }, kpi { kpi }, kpiGroup { kpis[] }, bar { rows[] }, table { columns[], rows[] }, divider. See the Zod schema for full shapes.',
        },
      },
      required: ['title', 'spec'],
    },
  },
  {
    name: 'schedule_report',
    description:
      'Set up a RECURRING report that fires on a schedule — daily, weekly, or monthly. FIRES when the user says "send me a weekly report", "every Monday morning give me", "set up a daily sales summary", "schedule a monthly recap", or any phrasing that pairs report intent with cadence. Each fire writes a Report row (currently a placeholder; content generation lands in a follow-up phase) and an in-app notification to the creator. Pass: frequency ("daily"|"weekly"|"monthly"); hourOfDay (0-23, defaults 9); for weekly also dayOfWeek (1=Mon..7=Sun); for monthly also dayOfMonth (1-28); timezone (IANA, e.g. "Europe/London", defaults UTC); a short prompt describing what the report should focus on ("weekly sales recap with top items and labour"). Title is required; summary recommended. On ok:false reason:"invalid-input" with detail "venue-not-in-org" strip venueId and retry. After success your reply should confirm the next fire time in plain language (e.g. "Locked in — your weekly recap will land Monday at 09:00 London time.").',
    input_schema: {
      type: 'object',
      properties: {
        venueId: {
          type: ['string', 'null'],
          description: 'Venue UUID for venue-scoped recurring reports; null for org-wide.',
        },
        title: { type: 'string', description: '3-200 chars. e.g. "Weekly sales recap".' },
        summary: { type: 'string', description: 'Optional ≤500-char one-liner.' },
        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
        hourOfDay: { type: 'integer', description: '0-23, defaults to 9.' },
        dayOfWeek: {
          type: ['integer', 'null'],
          description: 'Required when frequency=weekly. 1=Mon..7=Sun.',
        },
        dayOfMonth: {
          type: ['integer', 'null'],
          description: 'Required when frequency=monthly. 1-28.',
        },
        timezone: {
          type: 'string',
          description: 'IANA timezone, e.g. "Europe/London". Defaults to UTC.',
        },
        prompt: {
          type: 'string',
          description: 'Natural-language hint of what to include in each run.',
        },
      },
      required: ['title', 'frequency'],
    },
  },
  {
    name: 'list_scheduled_reports',
    description:
      'List the org\'s recurring report schedules — fires when the user asks "what reports are scheduled", "show my recurring reports", "what\'s coming up", etc. Default status filter is "active". Each row carries `id`, `title`, `frequency`, `nextRunAt` (ISO UTC), `status`, plus timing fields (hourOfDay, dayOfWeek, dayOfMonth, timezone). When the user wants to modify a schedule, list first to grab the `id` then call pause/resume/cancel_scheduled_report.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'paused', 'cancelled', 'all'],
          description: 'Defaults to "active".',
        },
        limit: { type: 'integer', description: '1-50, defaults to 25.' },
      },
      required: [],
    },
  },
  {
    name: 'pause_scheduled_report',
    description:
      'Pause an active recurring report — the row stays in the DB but the cron skips it until resumed. Fires on "pause my weekly recap", "stop sending the daily summary for now", "hold the monthly report". Pass the `scheduleId` from list_scheduled_reports. After success confirm to the user.',
    input_schema: {
      type: 'object',
      properties: {
        scheduleId: { type: 'string', description: 'Schedule UUID from list_scheduled_reports.' },
      },
      required: ['scheduleId'],
    },
  },
  {
    name: 'resume_scheduled_report',
    description:
      'Resume a paused recurring report. Recomputes nextRunAt so it doesn\'t fire immediately with a stale timestamp. Fires on "resume the weekly report", "turn the daily summary back on". Pass the `scheduleId` from list_scheduled_reports.',
    input_schema: {
      type: 'object',
      properties: {
        scheduleId: { type: 'string', description: 'Schedule UUID from list_scheduled_reports.' },
      },
      required: ['scheduleId'],
    },
  },
  {
    name: 'cancel_scheduled_report',
    description:
      'Permanently cancel a recurring report (soft-cancel — the row stays for history but status flips to "cancelled" and the cron never picks it up again). Fires on "cancel the weekly report", "stop the daily summary for good", "remove that schedule". Pass the `scheduleId` from list_scheduled_reports.',
    input_schema: {
      type: 'object',
      properties: {
        scheduleId: { type: 'string', description: 'Schedule UUID from list_scheduled_reports.' },
      },
      required: ['scheduleId'],
    },
  },
  {
    name: 'leave_note_for_user',
    description:
      'Leave an in-app note (passive message, no due date) for another member of the org — fires when the user says "note for <name>", "tell <name>", "leave a note for <name>", "let <name> know", "ping <name>", etc. Do NOT use for tasks / reminders / future actions with a deadline — those route to create_task. Recipient resolution: if the user\'s message contains an `@[Name](userId)` mention chip, pass `recipientUserId` from the parens verbatim and OMIT `recipientNameQuery` — chips are unambiguous, no lookup needed. Otherwise pass `recipientNameQuery` with the name OR email fragment (>=2 chars). Always pass `body` with the note text (verbatim, cleaned of the routing preamble). The dispatcher resolves the query ILIKE against User.name AND User.email across org members. ALWAYS returns ok:true with a tagged `data.status`: (a) `status:"created"` with `{ id, recipientName }` — exactly one match, note saved, confirm to the user; (b) `status:"needs-disambiguation"` with `candidates: [{userId,name,role}]` — multiple matches, ASK the user which one (number them in your reply by name + role), then re-call this tool with `recipientUserId` (omit recipientNameQuery) + the same body; (c) `status:"no-match"` with empty candidates — apologise and ask the user to clarify. ok:false with reason:"error" or "invalid-input" indicates a tool failure — surface the detail to the user. Do NOT save the note as a knowledge doc. Do NOT call record_kb_gap for it. After a successful save, confirm to the user with the recipient name and a short echo of the body.',
    input_schema: {
      type: 'object',
      properties: {
        recipientNameQuery: {
          type: 'string',
          description: 'Name fragment to match against org members (e.g. "Ryan"). 1-120 chars.',
        },
        recipientUserId: {
          type: 'string',
          description: 'Exact recipient User.id — pass this on the disambiguation follow-up call.',
        },
        body: {
          type: 'string',
          description:
            'The note content the recipient will see. Strip the routing preamble ("note for Ryan, ") and keep only the actual content. 3-2000 chars.',
        },
      },
      required: ['body'],
    },
  },
  {
    name: 'record_pricing_recommendation',
    description:
      'Capture an AI-surfaced pricing recommendation into the owner\'s review queue. FIRES any time your reply states a specific target price (or directional change with a number) for a NAMED item — "bump BH Lager from £5.00 to £5.20", "sell the new cider at £5.00 for ~70% GP", "Delirium Red at £9.00 is below your 70% target, try £9.57", "drop the Paulaner discount, it\'s eating £40/week". Does NOT fire on vague statements ("you should raise prices on something", "your margins are tight") or on your own questions ("what\'s your target GP?"). The trigger is YOUR OWN concrete recommendation in prose, not which tool you used to get there — fire it whether the numbers came from pos_search_items, pos_get_cogs_summary, an invoice the user pasted, or a cost the user typed in chat. REQUIRED grounding — every fire MUST have a "from" (current sell price OR cost-per-unit you computed this turn) AND a "to" (recommendedPriceCents, a specific number not a range). Optional supporting anchors: target GP / margin (user-stated or venue default), comparator from POS data or the user\'s message. Do NOT use your own earlier recommendation in this conversation as a comparator — that creates a feedback loop. Never invent prices, margins, or costs. If you made the numbers up, do not fire the tool — answer in prose and ask for the missing figure. If generate_report is also firing this turn and the report implies a pricing change, call record_pricing_recommendation in the SAME STEP so both run before the loop stops. Pass venueId from <current_context>; sourceItemRef = Square variation id / MockStock id / SKU (use the user\'s wording as the ref if no canonical id is available); sourceItemLabel = human name ("Camden Hells pint", "Damn Lemon keg pint"); currentPriceCents and recommendedPriceCents in pennies (575 = £5.75); rationale = one or two sentences citing the numbers you used. Lands as \'pending\' in the dashboard — owner adopts or dismisses. Returns { id, status, currentPriceCents, recommendedPriceCents }. ok:false reason:\'invalid-input\' with detail \'venue-not-in-org\' → wrong venueId, retry with <current_context>\'s. After success, mention to the user in ONE line that you\'ve logged the suggestion for review — don\'t paste the full rationale.',
    input_schema: {
      type: 'object',
      properties: {
        venueId: { type: 'string', description: 'Venue UUID (from <current_context>)' },
        sourceItemRef: {
          type: 'string',
          description:
            'Identifier for the priced thing — Square catalog variation id, MockStock id, or SKU string.',
        },
        sourceItemLabel: {
          type: 'string',
          description: 'Human-readable item name shown in the review queue.',
        },
        currentPriceCents: {
          type: 'integer',
          description: 'Current price in pennies (e.g. 575 for £5.75). Non-negative.',
        },
        recommendedPriceCents: {
          type: 'integer',
          description: 'Proposed new price in pennies. May be higher or lower than current.',
        },
        rationale: {
          type: 'string',
          description:
            'Why you are suggesting this — anchor in numbers from prior tool calls this turn.',
        },
      },
      required: [
        'venueId',
        'sourceItemRef',
        'sourceItemLabel',
        'currentPriceCents',
        'recommendedPriceCents',
        'rationale',
      ],
    },
  },
]
