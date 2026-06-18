import { Logger } from '@nestjs/common'
import { type ToolSet, tool } from 'ai'
import { fail, TOOL_DEFINITIONS, TOOL_INPUT_SCHEMAS } from '../../types'
import { IntegrationRegistry } from '../integrations/integration-registry'
import type { DispatchContext } from './tool-dispatcher'
import { ToolDispatcher } from './tool-dispatcher'

const toolLogger = new Logger('ChatToolDispatch')

/// Wraps a tool execute in start/end logging with latency + ok/fail status.
/// Built-in and integration tools both flow through this, so a single log
/// stream covers every dispatch. Kept here (rather than inside the registry
/// or built-in dispatcher) so per-turn correlation by orgId is consistent.
async function withDispatchLogging<T>(
  toolName: string,
  ctx: DispatchContext,
  exec: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  toolLogger.log(
    JSON.stringify({
      event: 'tool.dispatch.start',
      tool: toolName,
      orgId: ctx.orgId,
      userId: ctx.userId,
    }),
  )
  try {
    const result = await exec()
    const ok = (result as { ok?: boolean } | null)?.ok === true
    toolLogger.log(
      JSON.stringify({
        event: 'tool.dispatch.end',
        tool: toolName,
        orgId: ctx.orgId,
        ok,
        latency_ms: Date.now() - startedAt,
      }),
    )
    return result
  } catch (err) {
    toolLogger.error(
      JSON.stringify({
        event: 'tool.dispatch.threw',
        tool: toolName,
        orgId: ctx.orgId,
        latency_ms: Date.now() - startedAt,
        message: (err as Error).message,
      }),
    )
    throw err
  }
}

// Builds AI SDK tool objects that route through our existing ToolDispatcher.
// Built per-request so each tool closes over {orgId, userId, userRole} without
// needing to plumb context through AI SDK's execute signature. The dispatcher
// still owns input validation + cross-tenant enforcement + audit logging.
//
// Integration provider tools (Square + future) are concatenated onto the
// built-in TOOL_DEFINITIONS list at build time. New providers self-register
// on module init, so the model's tool surface grows automatically without
// edits to chat-tools.ts.
export function buildAiSdkTools(
  dispatcher: ToolDispatcher,
  integrations: IntegrationRegistry,
  ctx: DispatchContext,
): ToolSet {
  // record_kb_gap precondition gate. The system prompt mandates that the model
  // call find_knowledge before recording a gap; this enforces it at runtime so
  // a regressed prompt or pattern-matched few-shot can't silently skip search.
  //
  // Plan 06-04 hot-fix 2026-05-02 — the second gate (rejecting record_kb_gap
  // when the most recent find_knowledge returned ANY hits) was too strict.
  // BM25 surfaces hits for almost any query; many were entirely irrelevant
  // (asking "how do I handle a flat pint" surfaced the opening checklist).
  // Blocking record_kb_gap on those false-positive hits trapped the model
  // with no path to the lenient no-data flow → it produced wishy-washy meta
  // answers. We now only require that find_knowledge has been called at
  // least once this turn; the model uses its own judgement on relevance.
  let findKnowledgeCallCount = 0

  const builtinEntries = TOOL_DEFINITIONS.map((def) => {
    const schema = TOOL_INPUT_SCHEMAS[def.name]
    return [
      def.name,
      tool({
        description: def.description,
        inputSchema: schema,
        execute: async (input: unknown) => {
          if (def.name === 'record_kb_gap') {
            if (findKnowledgeCallCount === 0) {
              return fail(
                'error',
                'record_kb_gap rejected: find_knowledge has not been called this turn. Call find_knowledge first; only record a gap if no relevant results came back.',
              )
            }
          }
          const result = await withDispatchLogging(def.name, ctx, () =>
            dispatcher.dispatch(def.name, input, ctx),
          )
          if (def.name === 'find_knowledge') {
            findKnowledgeCallCount++
          }
          return result
        },
        // deep_research wraps the chat-core multi-agent pipeline. Its dispatcher
        // result is { ok, data: { synthesis, retrievedItemIds } }. The
        // `synthesis` is already the final answer text — pass that to the
        // parent model verbatim so it composes its reply from a clean string
        // instead of re-parsing the wrapper. Keeps the parent's context tight.
        ...(def.name === 'deep_research'
          ? {
              toModelOutput: ({ output }: { output: unknown }) => {
                const o = output as {
                  ok?: boolean
                  data?: { synthesis?: string }
                  detail?: string
                } | null
                if (o?.ok && typeof o.data?.synthesis === 'string') {
                  return { type: 'text' as const, value: o.data.synthesis }
                }
                return {
                  type: 'text' as const,
                  value: `deep_research returned no usable synthesis (${o?.detail ?? 'unknown'}).`,
                }
              },
            }
          : {}),
      }),
    ] as const
  })

  const integrationSchemas = integrations.getAllToolSchemas()
  const integrationEntries = integrations.getAllToolDefinitions().map((def) => {
    const schema = integrationSchemas[def.name]
    return [
      def.name,
      tool({
        description: def.description,
        inputSchema: schema,
        execute: async (input: unknown) =>
          withDispatchLogging(def.name, ctx, () => dispatcher.dispatch(def.name, input, ctx)),
      }),
    ] as const
  })

  return Object.fromEntries([...builtinEntries, ...integrationEntries]) as ToolSet
}
