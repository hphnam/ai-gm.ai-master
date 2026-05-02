import { tool, type ToolSet } from 'ai'
import { fail, TOOL_DEFINITIONS, TOOL_INPUT_SCHEMAS } from '../../types'
import type { ToolDispatcher, DispatchContext } from './tool-dispatcher'

// Builds AI SDK tool objects that route through our existing ToolDispatcher.
// Built per-request so each tool closes over {orgId, userId, userRole} without
// needing to plumb context through AI SDK's execute signature. The dispatcher
// still owns input validation + cross-tenant enforcement + audit logging.
export function buildAiSdkTools(
  dispatcher: ToolDispatcher,
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

  const entries = TOOL_DEFINITIONS.map((def) => {
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
          const result = await dispatcher.dispatch(def.name, input, ctx)
          if (def.name === 'find_knowledge') {
            findKnowledgeCallCount++
          }
          return result
        },
      }),
    ] as const
  })
  return Object.fromEntries(entries) as ToolSet
}
