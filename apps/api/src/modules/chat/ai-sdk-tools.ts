import { tool, type ToolSet } from 'ai'
import { TOOL_DEFINITIONS, TOOL_INPUT_SCHEMAS } from '@gm-ai/types'
import type { ToolDispatcher, DispatchContext } from './tool-dispatcher'

// Builds AI SDK tool objects that route through our existing ToolDispatcher.
// Built per-request so each tool closes over {orgId, userId, userRole} without
// needing to plumb context through AI SDK's execute signature. The dispatcher
// still owns input validation + cross-tenant enforcement + audit logging.
export function buildAiSdkTools(
  dispatcher: ToolDispatcher,
  ctx: DispatchContext,
): ToolSet {
  const entries = TOOL_DEFINITIONS.map((def) => {
    const schema = TOOL_INPUT_SCHEMAS[def.name]
    return [
      def.name,
      tool({
        description: def.description,
        inputSchema: schema,
        execute: async (input: unknown) => dispatcher.dispatch(def.name, input, ctx),
      }),
    ] as const
  })
  return Object.fromEntries(entries) as ToolSet
}
