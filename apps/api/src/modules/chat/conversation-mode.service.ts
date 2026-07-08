import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'

export type ConversationMode = 'default' | 'incident' | 'handover'

export const VALID_MODES: ConversationMode[] = ['default', 'incident', 'handover']

export type ConversationTriage = { mode: ConversationMode; onTopic: boolean }

const CALL_TIMEOUT_MS = 3500

// Cheap synchronous safety net — matches emergency/first-aid language so a
// mid-thread crisis enters incident mode this turn even if Haiku is slow or
// wrong, AND is never short-circuited as "off-topic". Kept broad but anchored
// on word boundaries; a false positive only forces incident overlay (safe).
// Deliberately English-only: this is the deterministic fast-path for the
// dominant language. Non-English emergencies are Haiku's job (it's multilingual)
// and, if Haiku fails, the turn still reaches Sonnet's safety-first prompt — so
// don't balloon this into per-language keyword sets (maintenance + false-positive trap).
const INCIDENT_KEYWORDS_RE =
  /\b(burn(?:ed|t|ing|s)?|scald(?:ed|ing)?|injur(?:y|ed|ies)|hurt|accident|bleed(?:ing)?|blood|unconscious|passed out|faint(?:ed|ing)?|collaps(?:e|ed|ing)|fell|fall(?:en)?|fractur(?:e|ed)|broken (?:arm|leg|bone|wrist|ankle)|chok(?:e|ed|ing)|seizure|convuls|not breathing|can'?t breathe|chest pain|cpr|defibrillat|\baed\b|fire|gas leak|ambulance|overdose|anaphyla|allergic reaction|heart attack|stroke|electrocut|assault(?:ed)?)\b/i
// Explicit "call emergency services" phrasings — the numbers alone are too
// noisy (999 could be a price), so require the call/dial verb around them.
const CALL_EMERGENCY_RE =
  /\b(call|dial|ring|phone)(?:ing|ed)?\s+(?:an?\s+)?(?:ambulance|999|112|911|emergency services|paramedics)\b/i

@Injectable()
export class ConversationModeService implements OnModuleInit {
  private readonly logger = new Logger(ConversationModeService.name)
  private client!: Anthropic

  onModuleInit(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    this.client = new Anthropic({ apiKey })
  }

  hasIncidentKeywords(message: string): boolean {
    return INCIDENT_KEYWORDS_RE.test(message) || CALL_EMERGENCY_RE.test(message)
  }

  /// Per-turn blocking triage. Returns BOTH the conversation mode AND whether
  /// the message is on-topic (about running the business) in ONE Haiku call.
  /// The synchronous incident pre-filter runs first and short-circuits Haiku —
  /// emergencies are always incident + on-topic. Soft-fails to
  /// { mode: 'default', onTopic: true } on any error/timeout so a classifier
  /// failure never blocks a legitimate turn.
  async triage(message: string): Promise<ConversationTriage> {
    const text = message.trim()
    if (text.length === 0) return { mode: 'default', onTopic: true }
    if (this.hasIncidentKeywords(text)) {
      this.logger.log(
        JSON.stringify({ event: 'conversation_mode.triaged', mode: 'incident', via: 'prefilter' }),
      )
      return { mode: 'incident', onTopic: true }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)
    try {
      const response = await this.client.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 40,
          messages: [
            {
              role: 'user',
              content: `Classify this hospitality-staff chat message. Reply with ONLY compact JSON, no commentary, no code fences:
{"mode":"default|incident|handover","onTopic":true|false}

mode:
  - default   normal Q&A, ordering, troubleshooting, lookups, anything about running the business
  - incident  injury, fire, gas leak, theft, fraud, safety emergency in progress or just happened
  - handover  end-of-shift summary for the next manager

onTopic — is this about running the business (a hospitality / service venue)?
  - true for ANYTHING about operations, stock, staff, suppliers, menu/service, bookings, compliance, a rude customer, specials ideas, rota or staffing policy, "how do other venues do X", using this app, AND anything about safety, first aid, injury or an emergency.
  - false ONLY when clearly unrelated: writing or debugging code, general trivia / world facts, homework or maths puzzles, personal-life advice, unrelated content, or acting as a general-purpose chatbot.
  - When unsure, choose true. Never mark a real work question off-topic.

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
      const triage = parseTriage(raw)
      this.logger.log(
        JSON.stringify({
          event: 'conversation_mode.triaged',
          mode: triage.mode,
          onTopic: triage.onTopic,
          via: 'haiku',
        }),
      )
      return triage
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'conversation_mode.triage_failed',
          message: (err as Error).message,
        }),
      )
      return { mode: 'default', onTopic: true }
    } finally {
      clearTimeout(timer)
    }
  }
}

function parseTriage(raw: string): ConversationTriage {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as { mode?: unknown; onTopic?: unknown }
    const modeRaw = typeof parsed.mode === 'string' ? parsed.mode.toLowerCase().trim() : 'default'
    const mode = VALID_MODES.find((m) => m === modeRaw) ?? 'default'
    // Off-topic only when the model is explicitly false — any ambiguity is on-topic.
    const onTopic = parsed.onTopic !== false
    return { mode, onTopic }
  } catch {
    return { mode: 'default', onTopic: true }
  }
}
