/**
 * probe:chat — end-to-end behaviour harness for the GM chat agent.
 *
 * Complements probe:eval / probe:section (retrieval-only) by asserting the
 * agent's ACTUAL answers. Drives the REAL buildGmAgent + a real Anthropic model
 * call, but with STUBBED tool results and a fixed in-memory context — NO DB, NO
 * Prisma, NO Voyage, NO network except the model call. The dispatcher is faked so
 * every tool resolves from per-case fixtures; the IntegrationRegistry is real (so
 * role-scoped tool-surface filtering is exercised for real) over a fake POS
 * provider.
 *
 * Assertions are contains/regex buckets — tolerant of wording. Where a bucket is
 * fuzzy the deterministic TOOL-CALL LOG carries the assertion and text is a loose
 * regex.
 *
 * Key-gated: no ANTHROPIC_API_KEY → construct the agent (prove wiring) then skip,
 * exit 0. With a key → run all cases, exit non-zero on any bucket failure.
 *
 *   npm run probe:chat --workspace=api
 */

import '../src/load-env'
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { AgentMode } from '../src/modules/chat/gm-agent'
import { buildGmAgent } from '../src/modules/chat/gm-agent'
import type { DispatchContext, ToolDispatcher } from '../src/modules/chat/tool-dispatcher'
import type { IntegrationProvider } from '../src/modules/integrations/integration-provider'
import { IntegrationRegistry } from '../src/modules/integrations/integration-registry'
import { fail, ok, type ToolResult } from '../src/types'

// ──────────────────────────────────────────────────────────────────
// Assertion plumbing (mirrors probe-chat-core's std-out + counts + exit).
// ──────────────────────────────────────────────────────────────────
type AssertResult = { name: string; pass: boolean; detail?: string }
const results: AssertResult[] = []

function assert(name: string, ok: boolean, detail?: string) {
  results.push({ name, pass: ok, detail })
  console.log(JSON.stringify({ event: `probe.assert.${name}.${ok ? 'pass' : 'fail'}`, detail }))
}
function assertRegex(name: string, hay: string, re: RegExp) {
  assert(name, re.test(hay), re.test(hay) ? undefined : `"${hay.slice(0, 160)}" !~ ${re}`)
}

// ──────────────────────────────────────────────────────────────────
// Fake dispatcher — every tool result comes from a per-case stub table. This is
// the whole point of the harness: the model runs for real, the data is fixed.
// Shape it must satisfy is ToolDispatcher.dispatch(name, input, ctx).
// ──────────────────────────────────────────────────────────────────
type StubValue = ToolResult<unknown> | ((input: unknown) => ToolResult<unknown>)
type StubTable = Record<string, StubValue>

function makeDispatcher(stubs: StubTable): ToolDispatcher {
  return {
    dispatch: async (name: string, input: unknown): Promise<ToolResult<unknown>> => {
      const s = stubs[name]
      if (typeof s === 'function') return s(input)
      if (s !== undefined) return s
      // Sensible defaults for tools the model may reach for opportunistically.
      if (name === 'find_knowledge') return ok([])
      if (name === 'verify_quote') return ok({ verdict: 'ok', issues: [] })
      return ok({ stubbed: true })
    },
  } as unknown as ToolDispatcher
}

// ──────────────────────────────────────────────────────────────────
// Real IntegrationRegistry over a fake POS provider. getToolSurfaceForProviders
// is pure (no DB/Redis), so the staff-vs-manager surface filter runs for real —
// pos_get_* are manager-only, pos_search_items is staff-visible. Provider.dispatch
// is never called (buildAiSdkTools routes integration tools through the faked
// ToolDispatcher, not the registry).
// ──────────────────────────────────────────────────────────────────
const posProvider: IntegrationProvider = {
  id: 'square',
  label: 'Square',
  domain: 'pos',
  toolDefinitions: [
    {
      name: 'pos_get_sales_summary',
      description:
        'Live sales totals for a time window — gross/net takings + order count. Fires on: takings, revenue, sales total, "how much did we take".',
      input_schema: { type: 'object' },
      minRole: 'manager',
    },
    {
      name: 'pos_get_cogs_summary',
      description:
        'Live cost-of-sales / gross margin for a window (reads unit cost from the catalog). Fires on: COGS, cost of goods, GP, margin, P&L.',
      input_schema: { type: 'object' },
      minRole: 'manager',
    },
    {
      name: 'pos_search_items',
      description:
        'Search the POS catalog by name — returns items + sell prices. Menu/price lookups.',
      input_schema: { type: 'object' },
      minRole: 'staff',
    },
  ],
  toolSchemas: {
    pos_get_sales_summary: z.object({
      venueId: z.string(),
      sinceHours: z.number().optional(),
      fromIso: z.string().optional(),
      toIso: z.string().optional(),
    }),
    pos_get_cogs_summary: z.object({
      venueId: z.string(),
      sinceHours: z.number().optional(),
      fromIso: z.string().optional(),
      toIso: z.string().optional(),
    }),
    pos_search_items: z.object({ venueId: z.string(), query: z.string() }),
  },
  dispatch: async () => ok({}),
}

const registry = new IntegrationRegistry({} as never)
registry.register(posProvider)

const VENUE = {
  id: randomUUID(),
  name: 'The Test Tap',
  timezone: 'Europe/London',
  type: 'pub',
}

const SQUARE_SUMMARY = [
  { provider: 'square', label: 'Square', domain: 'pos', lastSyncedAt: null as Date | null },
]

// ──────────────────────────────────────────────────────────────────
// Per-case runner: build the real agent with fixed context + faked tools, run
// one user turn, return final text + the tool-call log (assembled exactly like
// chat.service via onStepFinish).
// ──────────────────────────────────────────────────────────────────
type LoggedCall = { tool: string; input: unknown; result: unknown }

async function runCase(opts: {
  userMessage: string
  role: 'staff' | 'manager' | 'owner'
  mode?: AgentMode
  connected?: boolean
  stubs?: StubTable
}): Promise<{ text: string; log: LoggedCall[] }> {
  const ctx: DispatchContext = { orgId: randomUUID(), userId: randomUUID(), userRole: opts.role }
  const log: LoggedCall[] = []
  const agent = buildGmAgent({
    dispatcher: makeDispatcher(opts.stubs ?? {}),
    integrations: registry,
    ctx,
    activeProviderIds: new Set(opts.connected ? ['square'] : []),
    integrationsSummary: opts.connected ? SQUARE_SUMMARY : [],
    businessProfile: null,
    memoryExecute: null,
    venueContext: VENUE,
    mode: opts.mode ?? 'default',
    userContext: {
      name: opts.role === 'staff' ? 'Sam Staff' : 'Olivia Owner',
      email: 'u@test.local',
    },
    onStepFinish: (step) => {
      for (const call of step.toolCalls ?? []) {
        log.push({ tool: call.toolName, input: call.input ?? null, result: null })
      }
      for (const tr of step.toolResults ?? []) {
        const entry = log.find((l) => l.tool === tr.toolName && l.result === null)
        if (entry) entry.result = tr.output
      }
    },
  })
  const result = await agent.generate({ messages: [{ role: 'user', content: opts.userMessage }] })
  const text = (result.text ?? '').trim()
  console.log(
    JSON.stringify({
      event: 'probe.case.ran',
      role: opts.role,
      mode: opts.mode ?? 'default',
      tools: log.map((l) => l.tool),
      text: text.slice(0, 220),
    }),
  )
  return { text, log }
}

const hasTool = (log: LoggedCall[], tool: string) => log.some((l) => l.tool === tool)
const KB_UUID = '11111111-1111-4111-8111-111111111111'

// Accumulate every case's log for the cross-case record_kb_gap invariant.
const allLogs: Array<{ name: string; log: LoggedCall[] }> = []

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Prove the wiring constructs without a live key, then skip cleanly.
    buildGmAgent({
      dispatcher: makeDispatcher({}),
      integrations: registry,
      ctx: { orgId: 'o', userId: 'u', userRole: 'owner' },
      activeProviderIds: new Set(),
      venueContext: VENUE,
      userContext: { name: 'Test', email: 'u@test.local' },
    })
    console.log(
      '\n[probe:chat] SKIP — ANTHROPIC_API_KEY not set. Agent constructed OK; model call not attempted. Exiting 0.',
    )
    process.exit(0)
  }

  // ── Case 1 — Citation compliance: KB hit → answer ends with [doc:<id>]. ──
  {
    const { text, log } = await runCase({
      role: 'owner',
      userMessage: 'What temperature should we keep the cellar at?',
      stubs: {
        find_knowledge: ok([
          {
            id: 'se-1',
            entityType: 'knowledge_item',
            entityId: KB_UUID,
            subKey: '',
            content:
              'Cellar temperature must be held between 11 and 13°C. Check the gauge at open and at close.',
            title: 'Cellar Temperature SOP',
            summary: null,
            tags: ['cellar'],
            kind: 'sop',
            metadata: { knowledgeItemId: KB_UUID },
            aiSummary: null,
            similarity: 0.84,
            score: 0.84,
            matchedBy: ['vector'],
          },
        ]),
      },
    })
    allLogs.push({ name: 'citation', log })
    assert('C1.citation_find_knowledge_called', hasTool(log, 'find_knowledge')) // tool-log
    assertRegex('C1.citation_marker_present', text, new RegExp(`\\[doc:${KB_UUID}\\]`)) // regex
  }

  // ── Case 2 — No-data STRICT (staff): safety q, KB empty → "duty manager" + gap ──
  {
    const { text, log } = await runCase({
      role: 'staff',
      userMessage: 'What is the exact gas pressure setting for the cellar cooling unit?',
      stubs: { find_knowledge: ok([]), record_kb_gap: ok({ id: 'g1', askCount: 1 }) },
    })
    allLogs.push({ name: 'nodata_strict_staff', log })
    assert('C2.staff_find_knowledge_called', hasTool(log, 'find_knowledge')) // tool-log
    assert('C2.staff_gap_recorded', hasTool(log, 'record_kb_gap')) // tool-log
    assertRegex('C2.staff_defers_to_a_manager', text, /manager/i) // regex
  }

  // ── Case 3 — No-data STRICT (owner): same q → "verified source", no "ask manager" ──
  {
    const { text, log } = await runCase({
      role: 'owner',
      userMessage: 'What is the exact gas pressure setting for the cellar cooling unit?',
      stubs: { find_knowledge: ok([]), record_kb_gap: ok({ id: 'g2', askCount: 1 }) },
    })
    allLogs.push({ name: 'nodata_strict_owner', log })
    assert('C3.owner_find_knowledge_called', hasTool(log, 'find_knowledge')) // tool-log
    assert('C3.owner_gap_recorded', hasTool(log, 'record_kb_gap')) // tool-log
    // Owner STRICT: not deferred to a manager (asserted below), told not to
    // guess / to get it from an authoritative source. Wording varies — the
    // robust signal is a don't-guess / verified-source stance.
    assertRegex(
      'C3.owner_do_not_guess_get_source',
      text,
      /guess|verified|authoritative|data plate|engineer/i,
    ) // regex
    assert(
      'C3.owner_not_told_to_ask_manager',
      !/ask your (duty )?manager/i.test(text),
      text.slice(0, 160),
    ) // tool-log-adjacent negative regex
  }

  // ── Case 4 — Role scoping: staff asks revenue → declined, no manager tool ──
  {
    // Deterministic (no model): staff surface must exclude the manager POS tool.
    const staffSurface = registry.getToolSurfaceForProviders(new Set(['square']), 'staff')
    const staffToolNames = staffSurface.definitions.map((d) => d.name)
    assert(
      'C4.staff_surface_excludes_manager_pos_tool',
      !staffToolNames.includes('pos_get_sales_summary') &&
        staffToolNames.includes('pos_search_items'),
      JSON.stringify(staffToolNames),
    ) // tool-surface (deterministic)

    const { text, log } = await runCase({
      role: 'staff',
      connected: true,
      userMessage: 'What was our total revenue last week?',
    })
    allLogs.push({ name: 'role_scope_staff', log })
    assert(
      'C4.staff_no_manager_tool_invoked',
      !hasTool(log, 'pos_get_sales_summary') && !hasTool(log, 'pos_get_cogs_summary'),
      JSON.stringify(log.map((l) => l.tool)),
    ) // tool-log
    assertRegex('C4.staff_hands_off_to_manager', text, /manager|owner/i) // regex
  }

  // ── Case 5 — Role scoping (owner): revenue answered via POS tool ──
  {
    const { text, log } = await runCase({
      role: 'owner',
      connected: true,
      userMessage: 'What was our total revenue last week?',
      stubs: {
        pos_get_sales_summary: ok({
          grossSalesCents: 1245000,
          netSalesCents: 1180000,
          orderCount: 214,
          currency: 'GBP',
          windowFromIso: '2026-06-30T00:00:00Z',
          windowToIso: '2026-07-07T00:00:00Z',
        }),
      },
    })
    allLogs.push({ name: 'role_scope_owner', log })
    assert('C5.owner_pos_tool_invoked', hasTool(log, 'pos_get_sales_summary')) // tool-log
    assertRegex('C5.owner_revenue_number_in_text', text, /12[,.]?450/) // regex
  }

  // ── Case 6 — Tools-first for live numbers: POS wins over a stale KB doc ──
  {
    const { text, log } = await runCase({
      role: 'manager',
      connected: true,
      userMessage: "What's our COGS today?",
      stubs: {
        // A stale uploaded doc that mentions a DIFFERENT cost figure — must NOT
        // be the source the agent answers from while the tool can answer.
        find_knowledge: ok([
          {
            id: 'se-2',
            entityType: 'knowledge_item',
            entityId: '22222222-2222-4222-8222-222222222222',
            subKey: '',
            content: 'COGS report.xlsx (uploaded): cost of goods last month was 9,000.',
            title: 'COGS report.xlsx',
            summary: null,
            tags: ['cogs'],
            kind: 'tabular',
            metadata: {},
            aiSummary: null,
            similarity: 0.7,
            score: 0.7,
            matchedBy: ['vector'],
          },
        ]),
        pos_get_cogs_summary: ok({
          grossSalesCents: 1245000,
          cogsAmountCents: 430000,
          grossMarginPct: 65.5,
          coverageRate: 90,
          currency: 'GBP',
        }),
      },
    })
    allLogs.push({ name: 'tools_first', log })
    assert('C6.cogs_tool_invoked', hasTool(log, 'pos_get_cogs_summary')) // tool-log
    // Live figure surfaced (4,300 cogs or 65% margin) rather than the stale 9,000.
    assertRegex('C6.live_cogs_figure_in_text', text, /4[,.]?300|65(\.5)?\s*%/) // regex
  }

  // ── Case 7 — No hallucination / plainly unavailable: live q, nothing connected ──
  {
    const { text, log } = await runCase({
      role: 'owner',
      connected: false,
      userMessage: 'What were our card payments today?',
    })
    allLogs.push({ name: 'no_integration_plain', log })
    assert(
      'C7.no_pos_tool_available_or_called',
      !hasTool(log, 'pos_get_sales_summary') && !hasTool(log, 'pos_get_cogs_summary'),
      JSON.stringify(log.map((l) => l.tool)),
    ) // tool-log
    assertRegex(
      'C7.plainly_says_not_connected',
      text,
      /not connected|no.*integration|isn'?t connected|settings/i,
    ) // regex
  }

  // ── Case 8 — Incident protocol: emergency number first + log_incident ──
  {
    const { text, log } = await runCase({
      role: 'owner',
      mode: 'incident',
      // Immediate danger (drives the emergency-number directive) + complete
      // facts + explicit "log" (so the agent files rather than only gathering).
      userMessage:
        "There's a grease fire in the kitchen right now and Sam has burned his arm — flames still up, two staff on, I've hit the alarm. Log this as critical.",
      stubs: {
        log_incident: ok({ id: 'inc1', severity: 'critical', createdAt: '2026-07-08T00:00:00Z' }),
      },
    })
    allLogs.push({ name: 'incident', log })
    assert('C8.incident_logged', hasTool(log, 'log_incident')) // tool-log
    assertRegex('C8.surfaces_emergency_number_early', text.slice(0, 300), /\b999\b/) // regex (early text)
  }

  // ── Cross-case invariant — record_kb_gap never precedes find_knowledge ──
  {
    let violated: string | null = null
    for (const { name, log } of allLogs) {
      const fkIdx = log.findIndex((l) => l.tool === 'find_knowledge')
      const gapIdx = log.findIndex((l) => l.tool === 'record_kb_gap')
      if (gapIdx !== -1 && (fkIdx === -1 || fkIdx > gapIdx)) violated = name
    }
    assert('INV.gap_only_after_find_knowledge', violated === null, violated ?? undefined) // tool-log
  }

  // ── Summary ──
  const passes = results.filter((r) => r.pass).length
  console.log('\n────────── probe:chat summary ──────────')
  console.log(`pass: ${passes} / ${results.length}`)
  if (passes < results.length) {
    console.log('FAIL:')
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  ${r.name}: ${r.detail ?? '(no detail)'}`)
    }
  }
  process.exit(passes === results.length ? 0 : 1)
}

main().catch((err) => {
  console.error('probe:chat crashed:', err)
  process.exit(1)
})
