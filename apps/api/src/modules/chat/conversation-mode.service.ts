import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'

export type ConversationMode = 'default' | 'incident' | 'handover' | 'training'

const VALID_MODES: ConversationMode[] = ['default', 'incident', 'handover', 'training']
const CALL_TIMEOUT_MS = 3500

// Cheap regex pre-check covers the obvious cases without burning a Haiku call.
const INCIDENT_PATTERNS = [
  /\b(injur(?:y|ed|ies)|bleed|bleeding|wound|burn(?:ed)?|electr(?:ic|ocut))\b/i,
  /\b(fire|smoke|gas leak|alarm)\b/i,
  /\b(unconscious|collapsed|fainted|seizure)\b/i,
  /\b(theft|stolen|fraud|robber)\b/i,
  /\b(emergency|999|ambulance|police)\b/i,
]

const HANDOVER_PATTERNS = [
  /\b(end of (shift|night|day)|closing summary|handover|hand over)\b/i,
  /\b(summari[sz]e (tonight|today|the shift|the night))\b/i,
  /\b(brief the morning|brief the next)\b/i,
]

const TRAINING_PATTERNS = [
  /\b(quiz me|train me|test me|teach me)\b/i,
  /\b(walk me through|practice|practise)\b.*\b(procedure|sop|checklist|steps)\b/i,
  /\b(can you train|training mode)\b/i,
]

function preCheckMode(text: string): ConversationMode | null {
  if (INCIDENT_PATTERNS.some((re) => re.test(text))) return 'incident'
  if (HANDOVER_PATTERNS.some((re) => re.test(text))) return 'handover'
  if (TRAINING_PATTERNS.some((re) => re.test(text))) return 'training'
  return null
}

@Injectable()
export class ConversationModeService implements OnModuleInit {
  private readonly logger = new Logger(ConversationModeService.name)
  private client!: Anthropic

  onModuleInit(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    this.client = new Anthropic({ apiKey })
  }

  /// Synchronous regex-only fast path — used in the chat hot path so we never
  /// block a user-perceived turn on a Haiku call. Returns null if the message
  /// doesn't unambiguously match a non-default mode.
  classifySync(message: string): ConversationMode | null {
    const text = message.trim()
    if (text.length === 0) return 'default'
    return preCheckMode(text)
  }

  /// Phase E — classify the user's first message into a conversation mode.
  /// Regex pre-check first (zero cost); fall back to Haiku for ambiguous cases.
  /// Soft-fails to 'default' on any error.
  async classify(firstMessage: string): Promise<ConversationMode> {
    const text = firstMessage.trim()
    if (text.length === 0) return 'default'

    const preMatch = preCheckMode(text)
    if (preMatch) {
      this.logger.log(
        JSON.stringify({
          event: 'conversation_mode.classified',
          mode: preMatch,
          via: 'regex',
        }),
      )
      return preMatch
    }

    // Short messages without trigger phrases are almost always default. Skip Haiku.
    if (text.length < 30) return 'default'

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
  - training    (user wants to be quizzed / trained on a procedure)

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
