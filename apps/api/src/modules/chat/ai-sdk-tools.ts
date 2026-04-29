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
  // Mirrors the contract documented in record_kb_gap's tool description.
  let findKnowledgeCallCount = 0
  let lastFindKnowledgeWasNoData = false

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
                'record_kb_gap rejected: find_knowledge has not been called this turn. Call find_knowledge first; only record a gap if it returns ok:false reason:no-data.',
              )
            }
            if (!lastFindKnowledgeWasNoData) {
              return fail(
                'error',
                'record_kb_gap rejected: the most recent find_knowledge call returned hits. Answer from those hits instead of recording a gap.',
              )
            }
          }
          const result = await dispatcher.dispatch(def.name, input, ctx)
          if (def.name === 'find_knowledge') {
            findKnowledgeCallCount++
            lastFindKnowledgeWasNoData =
              !result.ok && result.reason === 'no-data'
          }
          return result
        },
      }),
    ] as const
  })
  return Object.fromEntries(entries) as ToolSet
}
