import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'

export type ConversationMode = 'default' | 'incident' | 'handover'

export const VALID_MODES: ConversationMode[] = ['default', 'incident', 'handover']
const CALL_TIMEOUT_MS = 3500

@Injectable()
export class ConversationModeService implements OnModuleInit {
  private readonly logger = new Logger(ConversationModeService.name)
  private client!: Anthropic

  onModuleInit(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    this.client = new Anthropic({ apiKey })
  }

  /// Classify the user's first message into a conversation mode via Haiku.
  /// Soft-fails to 'default' on any error or timeout.
  async classify(firstMessage: string): Promise<ConversationMode> {
    const text = firstMessage.trim()
    if (text.length === 0) return 'default'

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)
    try {
      const response = await this.client.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 32,
          messages: [
            {
              role: 'user',
              content: `Classify this hospitality-staff chat message into ONE mode. Reply with ONLY the mode name (no quotes, no commentary):

  - default     (normal Q&A, ordering, troubleshooting, lookups)
  - incident    (injury, fire, gas leak, theft, fraud, safety emergency in progress or just happened)
  - handover    (end-of-shift summary for the next manager)

Message: ${text}`,
            },
          ],
        },
        { signal: controller.signal },
      )
      const raw = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('')
        .trim()
        .toLowerCase()
      const cleaned = raw.replace(/[^a-z]/g, '')
      const matched = VALID_MODES.find((m) => cleaned.startsWith(m))
      const mode = matched ?? 'default'
      this.logger.log(
        JSON.stringify({
          event: 'conversation_mode.classified',
          mode,
          via: 'haiku',
        }),
      )
      return mode
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'conversation_mode.classify_failed',
          message: (err as Error).message,
        }),
      )
      return 'default'
    } finally {
      clearTimeout(timer)
    }
  }
}
