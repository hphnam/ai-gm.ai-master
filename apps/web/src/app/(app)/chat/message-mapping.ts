import type { UIMessage } from 'ai'
import type { ChatMessageDto } from '@/lib/api-types'

export type GmUIMessage = UIMessage

type LegacyToolCallEntry = {
  round?: number
  toolUseId?: string
  tool?: string
  input?: unknown
  result?: unknown
}

// Rebuild an assistant turn's UI parts from the DB row. Every persisted tool
// call becomes a settled tool part: deliverable tools render their card, KB
// tools feed the "No sources cited" warning + citation tooltips, and the rest
// feed the "Ran N steps" trace disclosure. Reasoning is dropped.
function assistantPartsFromDto(m: ChatMessageDto): GmUIMessage['parts'] {
  const parts: GmUIMessage['parts'] = []
  const log = (m as unknown as { toolCallLog?: LegacyToolCallEntry[] }).toolCallLog
  if (Array.isArray(log)) {
    for (const entry of log) {
      if (!entry?.tool || !entry?.toolUseId) continue
      parts.push({
        type: `tool-${entry.tool}`,
        toolCallId: entry.toolUseId,
        state: 'output-available',
        input: entry.input,
        output: entry.result,
      } as unknown as GmUIMessage['parts'][number])
    }
  }
  parts.push({ type: 'text', text: m.content })
  return parts
}

export function dbToUIMessage(m: ChatMessageDto): GmUIMessage {
  if (m.role === 'assistant') {
    return { id: m.id, role: m.role, parts: assistantPartsFromDto(m) }
  }
  return {
    id: m.id,
    role: m.role,
    parts: [{ type: 'text', text: m.content }],
  }
}

export function uiMessageToText(m: GmUIMessage): string {
  return m.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('')
    .trim()
}
