import type { ToolName } from './chat-tools'

export type SuggestionKind = 'below-par' | 'cutoff'
export type SuggestionSeverity = 'info' | 'warn'

export type ProactiveSuggestion = {
  kind: SuggestionKind
  severity: SuggestionSeverity
  text: string
  itemIds: string[]
  sourceToolCall: { tool: ToolName; input: Record<string, unknown> }
  generatedAt: string
}
