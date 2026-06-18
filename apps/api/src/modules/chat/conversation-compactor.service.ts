import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { prisma } from '../../database/prisma'

export type CompactableMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type CompactionResult = {
  summary: string | null
  recent: CompactableMessage[]
}

// Compaction is lossy by design — Haiku summarises older turns into a synopsis,
// which means specific doc ids, supplier names, error codes referenced earlier
// can blur. We compact later (40 turns vs 20) and keep more recent turns
// verbatim (20 vs 10) so the agent retains real continuity across long shifts.
const COMPACT_THRESHOLD = 40
const KEEP_RECENT = 20
const REGEN_AFTER_NEW_MESSAGES = 15
const CALL_TIMEOUT_MS = 8000
const MAX_MESSAGE_CHARS_IN_SUMMARY = 2400

/// Phase F (Task #15) — long-thread summariser. When a conversation exceeds
/// COMPACT_THRESHOLD turns, the older portion gets compressed into a Haiku-
/// generated synopsis and replaced in the model context. The synopsis is
/// cached on ChatConversation; only regenerated when enough new turns have
/// accumulated past the previously-summarised point.
@Injectable()
export class ConversationCompactorService implements OnModuleInit {
  private readonly logger = new Logger(ConversationCompactorService.name)
  private client!: Anthropic

  onModuleInit(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    this.client = new Anthropic({ apiKey })
  }

  async compactIfNeeded(
    conversationId: string,
    fullHistory: CompactableMessage[],
  ): Promise<CompactionResult> {
    if (fullHistory.length <= COMPACT_THRESHOLD) {
      return { summary: null, recent: fullHistory }
    }

    const cutIndex = fullHistory.length - KEEP_RECENT
    const older = fullHistory.slice(0, cutIndex)
    const recent = fullHistory.slice(cutIndex)
    if (older.length === 0) return { summary: null, recent: fullHistory }

    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { compactionSummary: true, compactionUpToMessageId: true },
    })

    let summary = conv?.compactionSummary ?? null
    const lastId = conv?.compactionUpToMessageId ?? null

    let needsRegen = false
    if (!summary) {
      needsRegen = true
    } else if (lastId) {
      // Count how many of the "older" messages were not yet covered by the
      // existing summary — once that exceeds REGEN_AFTER_NEW_MESSAGES, refresh.
      const lastIdx = older.findIndex((m) => m.id === lastId)
      const uncovered = lastIdx === -1 ? older.length : older.length - 1 - lastIdx
      if (uncovered >= REGEN_AFTER_NEW_MESSAGES) needsRegen = true
    } else {
      needsRegen = true
    }

    if (needsRegen) {
      const fresh = await this.summarise(older, summary)
      if (fresh) {
        summary = fresh
        await prisma.chatConversation
          .update({
            where: { id: conversationId },
            data: {
              compactionSummary: fresh,
              compactionUpToMessageId: older[older.length - 1].id,
            },
          })
          .catch(() => {
            // Cache write best-effort.
          })
      }
    }

    if (!summary) return { summary: null, recent: fullHistory }
    return { summary, recent }
  }

  private async summarise(
    older: CompactableMessage[],
    priorSummary: string | null,
  ): Promise<string | null> {
    const transcript = older
      .map(
        (m) =>
          `${m.role === 'user' ? 'USER' : 'GM'}: ${m.content.slice(0, MAX_MESSAGE_CHARS_IN_SUMMARY)}`,
      )
      .join('\n\n')

    const priorBlock = priorSummary
      ? `\n\nPRIOR SUMMARY (for continuity — extend, don't repeat):\n${priorSummary}`
      : ''

    const prompt = `Summarise this hospitality-chat exchange so the assistant can continue without losing context. Extract:
  • What the user asked / wanted (their goals).
  • Key facts established (named procedures, suppliers, parts, error codes).
  • Decisions or commitments made by either side.
  • Any unresolved threads (capture-mode in progress, pending follow-up).
Keep under 250 words. Use bullets. No preamble.${priorBlock}

TRANSCRIPT:
${transcript}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)
    try {
      const response = await this.client.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal: controller.signal },
      )
      const raw = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('')
        .trim()
      if (raw.length === 0) return null
      this.logger.log(
        JSON.stringify({
          event: 'conversation_compactor.summarised',
          olderMessages: older.length,
          summaryLength: raw.length,
        }),
      )
      return raw.slice(0, 2000)
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'conversation_compactor.failed',
          message: (err as Error).message,
        }),
      )
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}
