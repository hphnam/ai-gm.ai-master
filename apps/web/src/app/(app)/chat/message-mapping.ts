import type { UIMessage } from 'ai'
import { KB_TOOL_NAMES } from '@/components/chat/citations'
import { hasToolCard } from '@/components/chat/tool-cards/tool-card-router'
import type { ChatMessageDto } from '@/lib/api-types'

export type GmUIMessage = UIMessage

type LegacyToolCallEntry = {
  round?: number
  toolUseId?: string
  tool?: string
  input?: unknown
  result?: unknown
}

// Rebuild an assistant turn's UI parts from the DB row. Saved history shows the
// clean answer plus any deliverable cards — never the working-status chrome. So
// we drop reasoning entirely and rehydrate tool parts only for tools we still
// need on reload: deliverable tools (those with a rich card) render their card,
// and KB tools (find_knowledge, query_document_table) are kept as invisible
// data carriers — they have no card and no chip, but their parts still feed the
// "No sources cited" trust warning and the citation "sections read" tooltip.
// All other tool steps are dropped. The full `toolCallLog` still persists
// server-side for the model's follow-up coherence.
function assistantPartsFromDto(m: ChatMessageDto): GmUIMessage['parts'] {
  const parts: GmUIMessage['parts'] = []
  const log = (m as unknown as { toolCallLog?: LegacyToolCallEntry[] }).toolCallLog
  if (Array.isArray(log)) {
    for (const entry of log) {
      if (!entry?.tool || !entry?.toolUseId) continue
      if (!hasToolCard(entry.tool) && !KB_TOOL_NAMES.has(entry.tool)) continue
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
